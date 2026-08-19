#!/usr/bin/env node
/**
 * Thin x402 pay-per-pull door for the BNM Data Shop.
 *
 * GET /ticks — Idaho hay + feeder ticks ($0.02 USDC on Base)
 * GET /import-alerts — FDA Import Alert / DWPE firm ticks ($0.05)
 * GET /import-alerts/manifest.json — free catalog + schema + sample rows
 * GET /mariners — USCG D13 / Northwest Local Notice to Mariners ($0.05)
 * GET /mariners/manifest.json — free count + official source (no notice body)
 * GET /mariners-d11 — USCG D11 / Southwest Local Notice to Mariners ($0.05)
 * GET /mariners-d11/manifest.json — free count + official source (no notice body)
 * GET /mariners-d7 — USCG D7 / Southeast Local Notice to Mariners ($0.05)
 * GET /mariners-d7/manifest.json — free count + official source (no notice body)
 * GET /mariners-d8 — USCG D8 / Gulf Local Notice to Mariners ($0.05)
 * GET /mariners-d8/manifest.json — free count + official source (no notice body)
 * GET /warning-letters — FDA warning-letter bodies ($0.05)
 * GET /warning-letters/manifest.json — free count + source (no letter body)
 * GET /untitled-letters — FDA Untitled Letter bodies, CDER OPDP + CBER promo ($0.05)
 * GET /untitled-letters/manifest.json — free count + id/firm/date/product (no letter text)
 * GET /awa — USDA APHIS AWA inspection-report observation text ($0.05)
 * GET /awa/manifest.json — free count + id/firm/date/sourceUrl (no observation text)
 * GET /form-483 — FDA Form 483 observation bodies ($0.05). Listed only when a real body is cached.
 * GET /form-483/manifest.json — free id / date / firm (no observation body)
 * GET /gmp — Health Canada Drug GMP report-card observation bodies ($0.05). Listed only when a real body is cached.
 * GET /gmp/manifest.json — free id / firm / date / rating (no observation text)
 * GET /gmp-md — Health Canada medical-device report-card observation bodies ($0.05). Listed only when a real body is cached.
 * GET /gmp-md/manifest.json — free id / firm / date / rating (no report-card body text)
 *
 * Unpaid paid paths → HTTP 402. Public doors echo extensions.bazaar +
 * paymentPayload.resource on facilitator persist. No keys in the repo.
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { generateJwt } from "@coinbase/cdp-sdk/auth";
import {
  IMPORT_ALERTS_AMOUNT_ATOMIC,
  IMPORT_ALERTS_MANIFEST_PATH,
  IMPORT_ALERTS_PATH,
  TICKS_AMOUNT_ATOMIC,
  loadImportAlerts,
  loadManifest,
} from "./import-alerts.js";
import {
  D7_SPEC,
  D8_SPEC,
  D11_SPEC,
  MARINERS_AMOUNT_ATOMIC,
  MARINERS_D7_MANIFEST_PATH,
  MARINERS_D7_PATH,
  MARINERS_D8_MANIFEST_PATH,
  MARINERS_D8_PATH,
  MARINERS_D11_MANIFEST_PATH,
  MARINERS_D11_PATH,
  MARINERS_MANIFEST_PATH,
  MARINERS_PATH,
  loadMariners,
  loadMarinersD7,
  loadMarinersD7Manifest,
  loadMarinersD8,
  loadMarinersD8Manifest,
  loadMarinersD11,
  loadMarinersD11Manifest,
  loadMarinersManifest,
} from "./mariners.js";
import {
  WARNING_LETTERS_AMOUNT_ATOMIC,
  WARNING_LETTERS_MANIFEST_PATH,
  WARNING_LETTERS_PATH,
  loadWarningLetters,
  loadWarningLettersManifest,
} from "./warning-letters.js";
import {
  UNTITLED_LETTERS_AMOUNT_ATOMIC,
  UNTITLED_LETTERS_MANIFEST_PATH,
  UNTITLED_LETTERS_PATH,
  loadUntitledLetters,
  loadUntitledLettersManifest,
} from "./untitled-letters.js";
import {
  AWA_AMOUNT_ATOMIC,
  AWA_MANIFEST_PATH,
  AWA_PATH,
  loadAwa,
  loadAwaManifest,
} from "./awa.js";
import {
  FORM_483_AMOUNT_ATOMIC,
  FORM_483_MANIFEST_PATH,
  FORM_483_PATH,
  hasCachedForm483Body,
  loadForm483,
  loadForm483Manifest,
} from "./form-483.js";
import {
  GMP_AMOUNT_ATOMIC,
  GMP_MANIFEST_PATH,
  GMP_PATH,
  hasCachedGmpBody,
  loadGmp,
  loadGmpManifest,
} from "./gmp.js";
import {
  GMP_MD_AMOUNT_ATOMIC,
  GMP_MD_MANIFEST_PATH,
  GMP_MD_PATH,
  hasCachedGmpMdBody,
  loadGmpMd,
  loadGmpMdManifest,
} from "./gmp-md.js";

export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const NETWORK_V1 = "base";
export const NETWORK_V2 = "eip155:8453";
export const TICKS_PATH = "/ticks";
export const MANIFEST_PATH = "/manifest.json";
export const CATALOG_PATH = "/catalog.json";
export const WELL_KNOWN_PATH = "/.well-known/x402";
export const OPENAPI_PATH = "/openapi.json";
export const LLMS_PATH = "/llms.txt";
/** x402scan origin page for the live paid doors. /awa is a live public SKU. */
export const X402SCAN_SERVER_URL =
  "https://www.x402scan.com/server/c6f584c5-e494-41d1-aa02-2efb07ac3546";
export const PRODUCT_ID = "idaho-hay-feeder-ticks";
export const PRODUCT_NAME = "Idaho + PNW Market Ticks";
export const PRODUCT_VERSION = "1.2.0";
const COLLECT_MEMO_RE =
  /we are not inventing|this report has no organic row|not reusing an older organic|usda printed no organic/i;

const PUBLIC_SOURCE_MARKERS = [
  "twin falls",
  "blackfoot",
  "ams_3056",
  "ams-3056",
  "ams_3059",
  "ams-3059",
  "northwest direct",
  "idaho direct hay",
  "idaho hay",
  "if_fv130",
  "if-fv130",
  "idaho falls",
  "idaho barley commission",
  "ibc.id.grain",
  "water district 1",
  "rental pool",
  "wd1.",
  "ams_3058",
  "ams-3058",
  "ams_2914",
  "ams-2914",
  "ams.2914",
  "columbia basin",
  "columbia_umatilla",
  "umatilla",
];

const PUBLIC_SERIES_PREFIXES = [
  "cattle-tf-",
  "cattle-bf-",
  "cattle-nw-",
  "hay-id-",
  "hay.ams_3058.",
  "ibc.id.grain.",
  "wd1.",
  "ams.2914.",
];

export type TickStatus = "ok" | "empty" | "stale";

export type TicksPayload = {
  ok: true;
  product: "idaho-hay-feeder-ticks";
  sources: string[];
  status: TickStatus;
  reason: string | null;
  fetchedAt: string | null;
  ticks: unknown[];
  failed: unknown[];
  history: {
    points: unknown[];
    emptyReports: unknown[];
    series: unknown[];
  };
};

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export type DoorSku = "ticks" | "import-alerts" | "mariners" | "mariners-d11" | "mariners-d7" | "mariners-d8" | "warning-letters" | "untitled-letters" | "awa" | "form-483" | "gmp" | "gmp-md";

/** Always-public SKUs. /form-483, /gmp, and /gmp-md join only when a real observation body is cached. */
export const PUBLIC_BAZAAR_SKUS: readonly DoorSku[] = [
  "ticks",
  "import-alerts",
  "mariners",
  "mariners-d11",
  "mariners-d7",
  "mariners-d8",
  "warning-letters",
  "untitled-letters",
  "awa",
];

export function form483IsPublic(): boolean {
  return hasCachedForm483Body();
}

export function gmpIsPublic(): boolean {
  return hasCachedGmpBody();
}

export function gmpMdIsPublic(): boolean {
  return hasCachedGmpMdBody();
}

export function publicBazaarSkus(): DoorSku[] {
  const skus: DoorSku[] = [...PUBLIC_BAZAAR_SKUS];
  if (form483IsPublic()) skus.push("form-483");
  if (gmpIsPublic()) skus.push("gmp");
  if (gmpMdIsPublic()) skus.push("gmp-md");
  return skus;
}

export function isPublicBazaarSku(sku: DoorSku): boolean {
  return publicBazaarSkus().includes(sku);
}

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen"] as const;
const NEXT_SKU_WORDS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
  "thirteenth",
] as const;

function paidCountWord(): string {
  const n = publicBazaarSkus().length;
  return COUNT_WORDS[n] ?? String(n);
}

function noNextSkuWord(): string {
  const n = publicBazaarSkus().length;
  const next = NEXT_SKU_WORDS[n] ?? `${n + 1}th`;
  return `/awa is a live public SKU on purpose. No ${next} public SKU.`;
}

function amountAtomicFor(sku: DoorSku): string {
  if (sku === "import-alerts") {
    const raw = env("IMPORT_ALERTS_USDC_ATOMIC");
    return raw.length > 0 ? raw : IMPORT_ALERTS_AMOUNT_ATOMIC;
  }
  if (sku === "mariners" || sku === "mariners-d11" || sku === "mariners-d7" || sku === "mariners-d8") {
    const envName = sku === "mariners-d8"
      ? "MARINERS_D8_USDC_ATOMIC"
      : sku === "mariners-d7"
        ? "MARINERS_D7_USDC_ATOMIC"
        : sku === "mariners-d11"
          ? "MARINERS_D11_USDC_ATOMIC"
          : "MARINERS_USDC_ATOMIC";
    const raw = env(envName);
    return raw.length > 0 ? raw : MARINERS_AMOUNT_ATOMIC;
  }
  if (sku === "warning-letters") {
    const raw = env("WARNING_LETTERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : WARNING_LETTERS_AMOUNT_ATOMIC;
  }
  if (sku === "untitled-letters") {
    const raw = env("UNTITLED_LETTERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : UNTITLED_LETTERS_AMOUNT_ATOMIC;
  }
  if (sku === "awa") {
    const raw = env("AWA_USDC_ATOMIC");
    return raw.length > 0 ? raw : AWA_AMOUNT_ATOMIC;
  }
  if (sku === "form-483") {
    const raw = env("FORM_483_USDC_ATOMIC");
    return raw.length > 0 ? raw : FORM_483_AMOUNT_ATOMIC;
  }
  if (sku === "gmp") {
    const raw = env("GMP_USDC_ATOMIC");
    return raw.length > 0 ? raw : GMP_AMOUNT_ATOMIC;
  }
  if (sku === "gmp-md") {
    const raw = env("GMP_MD_USDC_ATOMIC");
    return raw.length > 0 ? raw : GMP_MD_AMOUNT_ATOMIC;
  }
  const raw = env("X402_USDC_ATOMIC");
  return raw.length > 0 ? raw : TICKS_AMOUNT_ATOMIC;
}

const SKU_COPY: Record<DoorSku, { description: string; resourcePath: string }> = {
  ticks: {
    description:
      "Call GET /ticks when you need the current official Idaho + PNW market snapshot (USDA AMS hay, cattle, produce, pulses; IBC grain; WD1 $/AF). JSON ticks plus stored history points; days between reports are not filled in.",
    resourcePath: TICKS_PATH,
  },
  "import-alerts": {
    description:
      "Call GET /import-alerts when you need the current FDA Import Alert / DWPE red and green firm-product snapshot from official cms_ia HTML. First-slice alert pages only. Does not wrap openFDA.",
    resourcePath: IMPORT_ALERTS_PATH,
  },
  mariners: {
    description:
      "Call GET /mariners when you need the latest USCG District 13 / Northwest Local Notice to Mariners as structured JSON from the official weekly PDF. Returns week, section, text, and source URL. Does not invent notices.",
    resourcePath: MARINERS_PATH,
  },
  "mariners-d11": {
    description:
      "Call GET /mariners-d11 when you need the latest USCG District 11 / Southwest (northern) Local Notice to Mariners as structured JSON from the official weekly PDF. Same NavCEN walker as /mariners. Returns week, section, text, and source URL. Does not invent notices.",
    resourcePath: MARINERS_D11_PATH,
  },
  "mariners-d7": {
    description:
      "Call GET /mariners-d7 when you need the latest USCG District 7 / Southeast Local Notice to Mariners as structured JSON from the official weekly PDF. Same NavCEN walker as /mariners. Returns week, section, text, and source URL. Does not invent notices.",
    resourcePath: MARINERS_D7_PATH,
  },
  "mariners-d8": {
    description:
      "Call GET /mariners-d8 when you need the latest USCG District 8 / Gulf (New Orleans) Local Notice to Mariners as structured JSON from the official weekly PDF. Same NavCEN walker as /mariners. Returns week, section, text, and source URL. Does not invent notices.",
    resourcePath: MARINERS_D8_PATH,
  },
  "warning-letters": {
    description:
      "Call GET /warning-letters when you need official FDA warning-letter bodies (firm, date, subject, full letter text) parsed from fda.gov HTML. Not the import-alerts IA feed. Does not invent letter text.",
    resourcePath: WARNING_LETTERS_PATH,
  },
  "untitled-letters": {
    description:
      "Call GET /untitled-letters when you need official FDA Untitled Letter text (CDER OPDP + CBER APLB promo) extracted from per-letter PDFs at /media/{id}/download. Not /warning-letters HTML. Not the HTML index. Does not invent letter text.",
    resourcePath: UNTITLED_LETTERS_PATH,
  },
  awa: {
    description:
      "Call GET /awa when you need official USDA APHIS Animal Welfare Act inspection-report observation/narrative text extracted from per-report PDFs on the Public Search Tool. Not the Salesforce metadata index. Not Data Liberation. Not /form-483. Not CMS 2567. Not CQC.",
    resourcePath: AWA_PATH,
  },
  "form-483": {
    description:
      "Call GET /form-483 when you need official FDA Form 483 inspectional observation bodies parsed from posted OII FOIA Electronic Reading Room PDFs. Not warning letters. Not CMS 2567. Does not invent observation text.",
    resourcePath: FORM_483_PATH,
  },
  gmp: {
    description:
      "Call GET /gmp when you need official Health Canada Drug GMP inspection report-card observation text plus C.02 cites from fullReportCard.ashx. Not the 21k-row public search index. Does not invent observations.",
    resourcePath: GMP_PATH,
  },
  "gmp-md": {
    description:
      "Call GET /gmp-md when you need official Health Canada medical-device inspection report-card observation text plus MDR cites from md/handler/fullReportCard.ashx. Not the ratings-only search index. Not /gmp Drug GMP. Does not invent observations.",
    resourcePath: GMP_MD_PATH,
  },
};

const BAZAAR_OUTPUT_EXAMPLE: Record<DoorSku, Record<string, unknown>> = {
  ticks: {
    ok: true,
    product: "idaho-hay-feeder-ticks",
    status: "ok",
    fetchedAt: "2026-08-17T21:22:50Z",
    ticks: [
      {
        id: "cattle-tf-feeder-steer",
        group: "cattle",
        commodity: "Feeder steers",
        market: "Twin Falls Livestock Commission (Wednesday auction)",
        unit: "$/cwt",
        asOf: "2026-08-12",
        price: 400.2,
        source: "Twin Falls Livestock Commission market report",
      },
    ],
  },
  "import-alerts": {
    ok: true,
    product: "fda-import-alerts",
    status: "ok",
    fetchedAt: "2026-08-18T00:56:39.767Z",
    asOf: "2026-08-17",
    ticks: [
      {
        alertNumber: "16-81",
        type: "DWPE",
        list: "red",
        firm: "Clover Valley Meat Co.",
        country: "AUSTRALIA",
        product: "Alligator & Crocodile, Other Aquatic Species — Crocodile",
        datePublished: "06/08/2012",
        sourceUrl: "https://www.accessdata.fda.gov/cms_ia/importalert_49.html",
        asOf: "2026-08-17",
      },
    ],
  },
  mariners: {
    ok: true,
    product: "uscg-d13-lnm",
    status: "ok",
    week: "32-2026",
    asOf: "2026-08-12",
    notices: [
      {
        week: "32-2026",
        section: "Federal Discrepancies",
        waterway: "Anacortes Harbor",
        text: "Anacortes Channel Light 4 LLNR 19055 TRLB/STRUCT MISSING/STRUCT DEST FD",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
      },
    ],
  },
  "mariners-d11": {
    ok: true,
    product: "uscg-d11-lnm",
    status: "ok",
    week: "32-2026",
    asOf: "2026-08-12",
    notices: [
      {
        week: "32-2026",
        section: "Federal Discrepancies",
        waterway: "Berkeley",
        text: "Berkeley Marina Channel Light 2 LLNR 5430 LT EXT FD",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm11322026.pdf",
      },
    ],
  },
  "mariners-d7": {
    ok: true,
    product: "uscg-d7-lnm",
    status: "ok",
    week: "32-2026",
    asOf: "2026-08-12",
    notices: [
      {
        week: "32-2026",
        section: "Federal Discrepancies",
        waterway: "Altamaha Sound",
        text: "Altamaha Sound Daybeacon 197 LLNR 36887 STRUCT DEST/TRUB FD",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm07322026.pdf",
      },
    ],
  },
  "mariners-d8": {
    ok: true,
    product: "uscg-d8-lnm",
    status: "ok",
    week: "33-2026",
    asOf: "2026-08-19",
    notices: [
      {
        week: "33-2026",
        section: "Federal Discrepancies",
        waterway: "Acadiana Navigation Channel",
        text: "Acadiana Navigation Channel Light 6 LLNR 20305 STRUCT DEST/TRLB FD",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm0833g2026.pdf",
      },
    ],
  },
  "warning-letters": {
    ok: true,
    product: "fda-warning-letter-bodies",
    status: "ok",
    letters: [
      {
        firm: "Citra100mg",
        cms: "722606",
        issuedOn: "2026-03-04",
        subject: "Unapproved New Drugs/Misbranded",
        sourceUrl:
          "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/citra100mg-722606-03042026",
        body: "WARNING LETTER\nMarch 4, 2026\nRE: Notice of Unlawful Sale of Unapproved and Misbranded Drugs…",
      },
    ],
  },
  "untitled-letters": {
    ok: true,
    product: "fda-untitled-letter-bodies",
    status: "ok",
    cards: [
      {
        firm: "Bayer HealthCare Pharmaceuticals, Inc.",
        date: "2026-04-28",
        product: "NUBEQA® (darolutamide) tablets, for oral use",
        office: "OPDP",
        sourceUrl: "https://www.fda.gov/media/192241/download",
        cites: ["FD&C Act"],
        said: "FDA has determined that the video and TV ad are false or misleading.",
        body: "The Office of Prescription Drug Promotion (OPDP) of the U.S. Food and Drug Administration (FDA) has reviewed the promotional communications…",
      },
    ],
  },
  awa: {
    ok: true,
    product: "aphis-awa-inspection-observation-text",
    status: "ok",
    cards: [
      {
        firm: "Utah State University",
        date: "2026-07-07",
        certificate: "87-R-0002",
        inspectionId: "INS-0001617878",
        sourceUrl:
          "https://aphis.file.force.com/sfc/dist/version/download/?oid=00Dt0000000GyZH&ids=068SJ00001KXrsj&asPdf=false",
        body: "Inspection Report\nUtah State University\n2.31(c)(7) Critical\nInstitutional Animal Care and Use Committee (IACUC).\n82 naked mole rats were euthanized by a method not on the approved protocol.",
      },
    ],
  },
  "form-483": {
    ok: true,
    product: "fda-form-483-bodies",
    status: "ok",
    letters: [
      {
        firm: "Cascade Specialty Pharmacy LLC",
        fei: "3015133983",
        recordDate: "2026-07-17",
        sourceUrl: "https://www.fda.gov/media/193964/download",
        body: "This document lists observations made by the FDA representative(s) during the inspection of your facility.\nOBSERVATION 1\nThe responsibilities and procedures applicable to the quality control unit are not fully followed.",
      },
    ],
  },
  gmp: {
    ok: true,
    product: "hc-gmp-report-cards",
    status: "ok",
    cards: [
      {
        firm: "Apotex Inc",
        inspectionNumber: "88796",
        referenceNumber: "501259",
        inspectedOn: "2026-04-13",
        sourceUrl: "https://www.drug-inspections.canada.ca/gmp/fullReportCard-en.html?insNumber=88796&lang=en",
        body: "Summary of observations\n1. C.02.011 - Manufacturing control\nInvestigations into deviations, reports, and/or follow-up actions were inadequate.",
      },
    ],
  },
  "gmp-md": {
    ok: true,
    product: "hc-md-inspection-cards",
    status: "ok",
    cards: [
      {
        firm: "CAN-MED HEALTHCARE",
        inspectionNumber: "501",
        referenceNumber: "111868",
        inspectedOn: "2026-05-25",
        sourceUrl: "https://www.drug-inspections.canada.ca/md/fullReportCard-en.html?insNumber=501&lang=en",
        body: "Health Canada medical-device inspection report card\nSummary of observations\n1. MDR s.NN (official cite + observation narrative after payment)",
      },
    ],
  },
};

/** x402 Bazaar discovery block (v2 PAYMENT-REQUIRED extensions.bazaar). */
export function bazaarExtension(sku: DoorSku): Record<string, unknown> {
  return {
    info: {
      input: {
        type: "http",
        method: "GET",
        queryParams: {},
      },
      output: {
        type: "json",
        example: BAZAAR_OUTPUT_EXAMPLE[sku],
      },
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            type: { type: "string", const: "http" },
            method: { type: "string", enum: ["GET", "HEAD", "DELETE"] },
            queryParams: {
              type: "object",
              additionalProperties: { type: "string" },
            },
            headers: {
              type: "object",
              additionalProperties: { type: "string" },
            },
          },
          required: ["type", "method"],
          additionalProperties: false,
        },
        output: {
          type: "object",
          properties: {
            type: { type: "string" },
            example: { type: "object" },
          },
          required: ["type"],
        },
      },
      required: ["input"],
    },
  };
}

/** Media-box default: farm-plan collector writes board.json / history.json here. */
export const DEFAULT_TICKS_DIR = join(homedir(), "projects/farm-plan/data/prices");

export function ticksDir(): string {
  if (Object.prototype.hasOwnProperty.call(process.env, "TICKS_DIR")) {
    const explicit = env("TICKS_DIR");
    if (explicit) return resolve(explicit);
    if (env("FARM_DATA_DIR")) return resolve(env("FARM_DATA_DIR"), "prices");
    return "";
  }
  if (env("FARM_DATA_DIR")) return resolve(env("FARM_DATA_DIR"), "prices");
  return resolve(DEFAULT_TICKS_DIR);
}

function boardPath(): string {
  const explicit = env("TICKS_PATH");
  if (explicit) return resolve(explicit);
  const dir = ticksDir();
  return dir ? resolve(dir, "board.json") : "";
}

function historyPath(): string {
  const dir = ticksDir();
  if (dir) return resolve(dir, "history.json");
  const board = boardPath();
  return board ? resolve(board, "..", "history.json") : "";
}

export function isOrganicHay(row: Record<string, unknown>): boolean {
  const blob = [row.id, row.series, row.kind, row.commodity, row.label, row.name]
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ");
  return /\borganic\b/.test(blob);
}

function isPublicTick(row: Record<string, unknown>): boolean {
  if (isOrganicHay(row)) return false;
  const id = String(row.id ?? row.series ?? "").toLowerCase();
  if (PUBLIC_SERIES_PREFIXES.some((p) => id.startsWith(p))) return true;
  const blob = [
    row.source,
    row.market,
    row.source_url,
    row.sourceUrl,
    row.label,
    row.id,
  ]
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ");
  return PUBLIC_SOURCE_MARKERS.some((m) => blob.includes(m));
}

export function publicEmptyReport(row: Record<string, unknown>): { id: string; status: "empty" } | null {
  if (isOrganicHay(row)) return null;
  const id = String(row.id ?? row.series ?? "").trim();
  if (!id) return null;
  return { id, status: "empty" };
}

function stripCollectMemo<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  for (const key of ["reason", "note", "message"] as const) {
    const value = next[key];
    if (typeof value === "string" && COLLECT_MEMO_RE.test(value)) delete next[key];
  }
  return next;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
}

function readJsonFile(path: string): Record<string, unknown> | null {
  if (!path || !existsSync(path) || !statSync(path).isFile()) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Newest official row per series when board.json is missing or unreadable. */
export function latestTicksFromHistory(points: Record<string, unknown>[]): Record<string, unknown>[] {
  const latest = new Map<string, Record<string, unknown>>();
  for (const point of points) {
    const series = String(point.series ?? point.id ?? "").trim();
    if (!series) continue;
    if (typeof point.price !== "number" || !Number.isFinite(point.price)) continue;
    const key = `${String(point.reportDate ?? point.asOf ?? "")}\0${String(point.collectedAt ?? "")}`;
    const prev = latest.get(series);
    const prevKey = prev
      ? `${String(prev.reportDate ?? prev.asOf ?? "")}\0${String(prev.collectedAt ?? "")}`
      : "";
    if (!prev || key > prevKey) latest.set(series, point);
  }
  return [...latest.values()].map((point) => {
    const id = String(point.series ?? point.id ?? "");
    const asOf = String(point.asOf ?? point.reportDate ?? "").slice(0, 10);
    return { ...point, id, asOf: asOf || null };
  });
}

export function loadTicks(): TicksPayload {
  const boardFile = boardPath();
  const histFile = historyPath();
  const board = readJsonFile(boardFile);
  const historyFile = readJsonFile(histFile);

  const rows = asRecordArray(board?.rows).filter(isPublicTick).map(stripCollectMemo);
  const failed = asRecordArray(board?.failed).filter(isPublicTick).map(stripCollectMemo);
  const hist = (board?.history && typeof board.history === "object"
    ? (board.history as Record<string, unknown>)
    : historyFile) ?? {};
  const points = asRecordArray(hist.points).filter(isPublicTick).map(stripCollectMemo);
  const emptyReports = asRecordArray(hist.emptyReports)
    .map(publicEmptyReport)
    .filter((row): row is { id: string; status: "empty" } => row !== null);
  const series = asRecordArray(hist.series).filter(isPublicTick).map(stripCollectMemo);
  const ticks = rows.length > 0
    ? rows
    : latestTicksFromHistory(points).filter(isPublicTick).map(stripCollectMemo);
  const fetchedAt = typeof board?.fetchedAt === "string"
    ? board.fetchedAt
    : typeof board?.cachedAt === "string"
      ? board.cachedAt
      : points.reduce<string | null>((latest, point) => {
          const collected = typeof point.collectedAt === "string" ? point.collectedAt : "";
          return collected && (!latest || collected > latest) ? collected : latest;
        }, null);

  if (!board && !historyFile) {
    return {
      ok: true,
      product: "idaho-hay-feeder-ticks",
      sources: [
        "Twin Falls",
        "Blackfoot",
        "AMS_3056 hay",
        "AMS_3059 NW Direct",
        "IF_FV130 onions/potatoes",
        "IBC Idaho elevator grain",
        "WD1 rental-pool $/AF",
        "AMS_3058 Columbia Basin hay",
        "IF_FV130 WA-OR produce",
        "AMS_2914 PNW pulses",
      ],
      status: "empty",
      reason:
        `Ticks are not on this host. Default cache is ${DEFAULT_TICKS_DIR} (board.json / history.json). Set TICKS_DIR or TICKS_PATH.`,
      fetchedAt: null,
      ticks: [],
      failed: [],
      history: { points: [], emptyReports: [], series: [] },
    };
  }

  const hasTicks = ticks.length + points.length > 0;
  return {
    ok: true,
    product: "idaho-hay-feeder-ticks",
    sources: [
      "Twin Falls",
      "Blackfoot",
      "AMS_3056 hay",
      "AMS_3059 NW Direct",
      "IF_FV130 onions/potatoes",
      "IBC Idaho elevator grain",
      "WD1 rental-pool $/AF",
      "AMS_3058 Columbia Basin hay",
      "IF_FV130 WA-OR produce",
      "AMS_2914 PNW pulses",
    ],
    status: hasTicks ? "ok" : "stale",
    reason: hasTicks
      ? null
      : "Price cache is present but has no official hay / feeder / IF_FV130 / IBC / WD1 / 3058 / 2914 ticks.",
    fetchedAt,
    ticks,
    failed,
    history: { points, emptyReports, series },
  };
}

const GROUP_LABELS: { id: string; name: string }[] = [
  { id: "hay", name: "Hay" },
  { id: "cattle", name: "Cattle" },
  { id: "produce", name: "Produce" },
  { id: "grain", name: "Grain" },
  { id: "water", name: "Water" },
  { id: "pulses", name: "Pulses" },
];

const SAMPLE_SERIES_IDS = [
  "cattle-tf-feeder-steer",
  "hay.ams_3058.columbia_basin.alfalfa.premium",
  "ams.if_fv130.onion.yellow_hybrid.us1.sack50.jumbo.columbia_umatilla",
  "ibc.id.grain.idaho_falls.barley_malting",
  "ams.2914.pnw.garbanzo",
];

function originFromResource(resourceUrl: string): string {
  return resourceUrl.replace(/\/ticks\/?$/, "") || "https://ticks.bnm.farm";
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function inferCadence(source: string, market: string): string | null {
  const blob = `${source} ${market}`;
  if (/weekly/i.test(blob)) return "weekly";
  if (/wednesday/i.test(blob)) return "wednesday auction";
  if (/rental pool procedures/i.test(blob)) return "posted procedures";
  return null;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function latestDate(values: string[]): string | null {
  const dates = values.filter((v) => /^\d{4}-\d{2}-\d{2}/.test(v)).sort();
  return dates.at(-1) ?? null;
}

function sampleFromRow(row: Record<string, unknown>, seriesLabel: string): Record<string, unknown> {
  return {
    sample: true,
    id: str(row.id),
    name: seriesLabel || str(row.label) || str(row.commodity),
    group: str(row.group),
    commodity: str(row.commodity) || null,
    market: str(row.market) || null,
    unit: str(row.unit) || null,
    asOf: str(row.asOf) || null,
    price: num(row.price),
    source: str(row.source) || null,
  };
}

export function buildTicksManifest(resourceUrl = "https://ticks.bnm.farm/ticks"): Record<string, unknown> {
  const payload = loadTicks();
  const origin = originFromResource(resourceUrl);
  const ticks = payload.ticks as Record<string, unknown>[];
  const failed = payload.failed as Record<string, unknown>[];
  const series = payload.history.series as Record<string, unknown>[];
  const points = payload.history.points as Record<string, unknown>[];
  const seriesById = new Map(series.map((s) => [str(s.id), s]));

  const pointsBySeries = new Map<string, { count: number; first: string | null; last: string | null }>();
  for (const point of points) {
    const id = str(point.series || point.id);
    if (!id) continue;
    const day = str(point.reportDate || point.asOf).slice(0, 10);
    const prev = pointsBySeries.get(id) || { count: 0, first: null, last: null };
    prev.count += 1;
    if (day) {
      if (!prev.first || day < prev.first) prev.first = day;
      if (!prev.last || day > prev.last) prev.last = day;
    }
    pointsBySeries.set(id, prev);
  }

  const asOfBySource: Record<string, string> = {};
  for (const row of ticks) {
    const source = str(row.source);
    const asOf = str(row.asOf).slice(0, 10);
    if (!source || !asOf) continue;
    if (!asOfBySource[source] || asOf > asOfBySource[source]) asOfBySource[source] = asOf;
  }

  const groups = GROUP_LABELS.map((group) => {
    const rows = ticks.filter((row) => str(row.group) === group.id);
    const bySource = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
      const key = str(row.source) || "unknown";
      const list = bySource.get(key) || [];
      list.push(row);
      bySource.set(key, list);
    }
    const sources = [...bySource.entries()].map(([name, sourceRows]) => {
      const ids = sourceRows.map((row) => str(row.id));
      const hist = ids.map((id) => pointsBySeries.get(id)).filter(Boolean);
      return {
        name,
        sourceUrl: str(sourceRows[0]?.sourceUrl) || null,
        cadence: inferCadence(name, str(sourceRows[0]?.market)),
        tickCount: sourceRows.length,
        latestAsOf: latestDate(sourceRows.map((row) => str(row.asOf).slice(0, 10))),
        geography: uniqueSorted(sourceRows.map((row) => str(row.market))),
        units: uniqueSorted(sourceRows.map((row) => str(row.unit))),
        history: {
          seriesWithPoints: hist.length,
          pointCount: hist.reduce((n, h) => n + (h?.count ?? 0), 0),
        },
        series: sourceRows.map((row) => ({
          id: str(row.id),
          name: str(seriesById.get(str(row.id))?.label) || str(row.label) || str(row.commodity),
        })),
      };
    });
    return {
      id: group.id,
      name: group.name,
      tickCount: rows.length,
      units: uniqueSorted(rows.map((row) => str(row.unit))),
      geography: uniqueSorted(rows.map((row) => str(row.market))),
      latestAsOf: latestDate(rows.map((row) => str(row.asOf).slice(0, 10))),
      history: {
        available: rows.some((row) => (pointsBySeries.get(str(row.id))?.count ?? 0) > 0),
        pointCount: rows.reduce((n, row) => n + (pointsBySeries.get(str(row.id))?.count ?? 0), 0),
      },
      sources,
    };
  }).filter((group) => group.tickCount > 0 || group.sources.length > 0);

  const samples: Record<string, unknown>[] = [];
  const used = new Set<string>();
  for (const id of SAMPLE_SERIES_IDS) {
    const row = ticks.find((t) => str(t.id) === id);
    if (!row) continue;
    samples.push(sampleFromRow(row, str(seriesById.get(id)?.label)));
    used.add(id);
  }
  for (const group of GROUP_LABELS) {
    if (samples.length >= 5) break;
    const row = ticks.find((t) => str(t.group) === group.id && !used.has(str(t.id)));
    if (!row) continue;
    samples.push(sampleFromRow(row, str(seriesById.get(str(row.id))?.label)));
    used.add(str(row.id));
  }

  const empty = failed
    .map((item) => publicEmptyReport(item))
    .filter((row): row is { id: string; status: "empty" } => row !== null);

  const amount = amountAtomicFor("ticks");
  return {
    ok: true,
    product: {
      id: PRODUCT_ID,
      name: PRODUCT_NAME,
      version: PRODUCT_VERSION,
    },
    paidEndpoint: `${origin}${TICKS_PATH}`,
    discoveryUrl: `${origin}/`,
    manifestUrl: `${origin}${MANIFEST_PATH}`,
    openapi: `${origin}${OPENAPI_PATH}`,
    wellKnown: `${origin}${WELL_KNOWN_PATH}`,
    llmsTxt: `${origin}${LLMS_PATH}`,
    priceAtomic: amount,
    priceDisplay: amount === "20000" ? "$0.02" : amount ? `${amount} atomic USDC` : null,
    network: NETWORK_V2,
    networkName: "Base",
    asset: USDC_BASE,
    assetSymbol: "USDC",
    payTo: PAY_TO,
    fetchedAt: payload.fetchedAt,
    latestAsOfBySource: asOfBySource,
    tickCount: ticks.length,
    status: payload.status,
    schema: {
      tickFields: {
        id: "string — deterministic series id",
        group: "hay | cattle | produce | grain | water | pulses",
        commodity: "string",
        label: "string",
        market: "string — geography / barn / shipping point",
        classGrade: "string",
        unit: "$/ton | $/cwt | $/pair | $/50 lb | $/25 lb | $/bu | $/AF",
        price: "number | null — official print only",
        lo: "number | optional",
        hi: "number | optional",
        mid: "number | optional",
        asOf: "YYYY-MM-DD",
        source: "string",
        sourceUrl: "string — official PDF or page",
        note: "string | optional",
      },
      paidResponse: {
        ticks: "current official snapshot (all public series on this collect)",
        failed: "current failed official fetches",
        history: {
          series: "id / label / unit / group catalog",
          points: "dated official prints already stored — days between reports are not filled in",
          emptyReports: "id + status only when an official print has no row",
        },
        fetchedAt: "ISO timestamp of the last official collect",
      },
    },
    groups,
    empty,
    samples,
    sampleNote:
      "samples are marked sample:true and are a few real official rows for identification. The paid GET /ticks body has the full current snapshot. This manifest does not list every current price.",
  };
}

export function paymentRequiredBody(resourceUrl: string, sku: DoorSku = "ticks"): Record<string, unknown> {
  const amount = amountAtomicFor(sku);
  const copy = SKU_COPY[sku];
  const acceptV1: Record<string, unknown> = {
    scheme: "exact",
    network: NETWORK_V1,
    asset: USDC_BASE,
    payTo: PAY_TO,
    resource: resourceUrl,
    description: copy.description,
    mimeType: "application/json",
    maxTimeoutSeconds: 60,
    extra: { name: "USD Coin", version: "2" },
    maxAmountRequired: amount,
  };

  return {
    x402Version: 1,
    error: "X-PAYMENT header is required",
    accepts: [acceptV1],
    payTo: PAY_TO,
    network: NETWORK_V1,
    asset: USDC_BASE,
    resource: copy.resourcePath,
    // Body-only crawlers miss PAYMENT-REQUIRED; bazaar stays on the v2 header too.
    extensions: { bazaar: bazaarExtension(sku) },
  };
}

export function paymentRequiredV2(resourceUrl: string, sku: DoorSku = "ticks"): Record<string, unknown> {
  const amount = amountAtomicFor(sku);
  const copy = SKU_COPY[sku];
  const accept: Record<string, unknown> = {
    scheme: "exact",
    network: NETWORK_V2,
    asset: USDC_BASE,
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    extra: { name: "USD Coin", version: "2" },
    amount,
    description: copy.description,
  };
  return {
    x402Version: 2,
    error: "PAYMENT-SIGNATURE header is required",
    resource: {
      url: resourceUrl,
      description: copy.description,
      mimeType: "application/json",
    },
    accepts: [accept],
    extensions: {
      bazaar: bazaarExtension(sku),
    },
  };
}

function paymentHeader(req: IncomingMessage): string | null {
  const raw =
    req.headers["x-payment"] ??
    req.headers["payment-signature"] ??
    req.headers["PAYMENT-SIGNATURE"];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return null;
}

function skipSettle(): boolean {
  return env("X402_SKIP_SETTLE") === "1";
}

function decodePayment(payment: string): Record<string, unknown> | null {
  const tryParse = (raw: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };
  return tryParse(payment) ?? tryParse(Buffer.from(payment, "base64").toString("utf8"));
}

function paymentPayload(payment: string): Record<string, unknown> | null {
  const decoded = decodePayment(payment);
  if (!decoded) return null;
  if (decoded.payload && typeof decoded.payload === "object") return decoded;
  if (decoded.authorization && decoded.signature) {
    return { x402Version: 1, scheme: "exact", network: NETWORK_V1, payload: decoded };
  }
  return decoded;
}

/**
 * PaymentRequirements sent to CDP verify/settle.
 * Public doors attach extensions.bazaar so the facilitator can catalog them.
 */
export function facilitatorPaymentRequirements(
  resourceUrl: string,
  sku: DoorSku,
): Record<string, unknown> {
  const accept = {
    ...((paymentRequiredBody(resourceUrl, sku).accepts as Record<string, unknown>[])[0]),
  };
  if (isPublicBazaarSku(sku)) {
    accept.extensions = { bazaar: bazaarExtension(sku) };
  }
  return accept;
}

/**
 * Shop persist body for CDP verify/settle.
 * CDP catalogs on settle only when paymentPayload.resource is set and bazaar
 * is present (v2: payload.extensions; v1 clients do not copy it, so we echo it).
 */
export function facilitatorBody(
  payment: string,
  requirements: Record<string, unknown>,
): Record<string, unknown> {
  const raw = paymentPayload(payment);
  const resource = typeof requirements.resource === "string" ? requirements.resource : undefined;
  const reqExt = requirements.extensions;
  const payload: Record<string, unknown> = raw ? { ...raw } : { paymentHeader: payment };
  if (resource && payload.resource == null) {
    payload.resource = resource;
  }
  if (
    reqExt &&
    typeof reqExt === "object" &&
    !Array.isArray(reqExt) &&
    payload.extensions == null
  ) {
    payload.extensions = reqExt;
  }
  return {
    x402Version: payload.x402Version ?? 1,
    paymentPayload: payload,
    paymentRequirements: requirements,
    paymentHeader: payment,
  };
}

export function cdpEnvStatus(): "set" | "CDP env not set" {
  return env("CDP_API_KEY_ID") && env("CDP_API_KEY_SECRET") ? "set" : "CDP env not set";
}

function cdpApiKeySecret(): string {
  return env("CDP_API_KEY_SECRET").replace(/\\n/g, "\n");
}

async function cdpAuthHeaders(method: "GET" | "POST", url: string): Promise<Record<string, string>> {
  if (cdpEnvStatus() !== "set") return {};
  try {
    const parsed = new URL(url);
    const jwt = await generateJwt({
      apiKeyId: env("CDP_API_KEY_ID"),
      apiKeySecret: cdpApiKeySecret(),
      requestMethod: method,
      requestHost: parsed.host,
      requestPath: parsed.pathname,
    });
    return { Authorization: `Bearer ${jwt}` };
  } catch {
    return {};
  }
}

async function facilitatorPost(
  path: "/verify" | "/settle",
  payment: string,
  requirements: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const base = env("X402_FACILITATOR_URL");
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}${path}`;
  const auth = await cdpAuthHeaders("POST", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...auth,
      },
      body: JSON.stringify(facilitatorBody(payment, requirements)),
    });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
    } catch {
      body = { rawStatus: res.status };
    }
    const extHdr = res.headers.get("extension-responses") ?? res.headers.get("EXTENSION-RESPONSES");
    if (extHdr) {
      try {
        const decoded = JSON.parse(Buffer.from(extHdr, "base64").toString("utf8")) as {
          bazaar?: { status?: string };
        };
        if (decoded.bazaar?.status) {
          console.error(`facilitator ${path} bazaar ${decoded.bazaar.status}`);
        }
      } catch {
        // header is diagnostic only
      }
    }
    if (!res.ok) {
      console.error(`facilitator ${path} HTTP ${res.status}`);
      return null;
    }
    return body;
  } catch (err) {
    console.error(`facilitator ${path} error ${err instanceof Error ? err.name : "unknown"}`);
    return null;
  }
}

async function facilitatorVerify(payment: string, requirements: Record<string, unknown>): Promise<boolean> {
  const body = await facilitatorPost("/verify", payment, requirements);
  if (!body) return false;
  return body.isValid === true || body.success === true;
}

async function facilitatorSettle(payment: string, requirements: Record<string, unknown>): Promise<boolean> {
  const body = await facilitatorPost("/settle", payment, requirements);
  if (!body) return false;
  return body.success === true || body.isValid === true || typeof body.transaction === "string";
}

function localSettleKeyFile(): string {
  const explicit = env("X402_SETTLE_KEY_FILE");
  return explicit ? resolve(explicit) : "";
}

async function localEip3009Settle(payment: string, requirements: Record<string, unknown>): Promise<boolean> {
  const keyFile = localSettleKeyFile();
  if (!keyFile || !existsSync(keyFile)) return false;
  const wrapper = paymentPayload(payment);
  const inner = (wrapper?.payload && typeof wrapper.payload === "object"
    ? (wrapper.payload as Record<string, unknown>)
    : wrapper) ?? {};
  const auth = (inner.authorization && typeof inner.authorization === "object"
    ? (inner.authorization as Record<string, unknown>)
    : null);
  const signature = typeof inner.signature === "string" ? inner.signature : "";
  if (!auth || !signature) return false;
  const wantAmount = String(requirements.maxAmountRequired ?? requirements.amount ?? "");
  const to = String(auth.to ?? "").toLowerCase();
  const value = String(auth.value ?? "");
  if (to !== PAY_TO.toLowerCase()) return false;
  if (wantAmount && value !== wantAmount) return false;
  const helper = resolve(new URL("./../scripts/local-eip3009-settle.py", import.meta.url).pathname);
  if (!existsSync(helper)) return false;
  const { spawn } = await import("node:child_process");
  return await new Promise((resolveOk) => {
    const child = spawn("python3", [helper], {
      env: { ...process.env, X402_SETTLE_KEY_FILE: keyFile },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += String(chunk);
    });
    child.stderr.on("data", () => {
      /* never forward; may be noisy, must not leak key */
    });
    child.on("close", (code) => {
      if (code !== 0) {
        resolveOk(false);
        return;
      }
      try {
        const parsed = JSON.parse(out) as { ok?: boolean; tx?: string };
        if (parsed.ok && parsed.tx) console.error(`local eip3009 settle ${parsed.tx}`);
        resolveOk(parsed.ok === true);
      } catch {
        resolveOk(false);
      }
    });
    child.on("error", () => resolveOk(false));
    child.stdin.write(
      JSON.stringify({
        asset: USDC_BASE,
        authorization: auth,
        signature,
        requirements: { payTo: requirements.payTo, asset: requirements.asset },
      }),
    );
    child.stdin.end();
  });
}


function sendJson(res: ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE, PAYMENT-RESPONSE",
    ...extraHeaders,
  });
  res.end(payload);
}

function sendText(res: ServerResponse, status: number, body: string, contentType: string): void {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function shopDiscoveryPointers(req: IncomingMessage, port: number): Record<string, string> {
  const origin = discoveryOrigin(req, port);
  return {
    openapi: `${origin}${OPENAPI_PATH}`,
    wellKnown: `${origin}${WELL_KNOWN_PATH}`,
    llmsTxt: `${origin}${LLMS_PATH}`,
  };
}

function withShopDiscovery(
  body: Record<string, unknown>,
  req: IncomingMessage,
  port: number,
): Record<string, unknown> {
  return { ...body, ...shopDiscoveryPointers(req, port) };
}

export function llmsTxt(): string {
  const listed483 = form483IsPublic();
  const listedGmp = gmpIsPublic();
  const listedGmpMd = gmpMdIsPublic();
  const paid = [
    "- GET /ticks — $0.02 — Idaho + PNW market ticks (USDA AMS, Idaho grain, WD1 $/AF)",
    "- GET /import-alerts — $0.05 — FDA Import Alerts / DWPE firm-product snapshot",
    "- GET /mariners — $0.05 — USCG D13 / Northwest Local Notice to Mariners",
    "- GET /mariners-d11 — $0.05 — USCG D11 / Southwest Local Notice to Mariners",
    "- GET /mariners-d7 — $0.05 — USCG D7 / Southeast Local Notice to Mariners",
    "- GET /mariners-d8 — $0.05 — USCG D8 / Gulf Local Notice to Mariners",
    "- GET /warning-letters — $0.05 — FDA warning-letter bodies (firm, date, subject, full letter text)",
    "- GET /untitled-letters — $0.05 — FDA Untitled Letter text (CDER OPDP + CBER promo PDFs)",
    "- GET /awa — $0.05 — USDA APHIS AWA inspection-report observation text (official per-report PDFs)",
  ];
  if (listed483) {
    paid.push("- GET /form-483 — $0.05 — FDA Form 483 inspectional observation bodies (posted OII FOIA PDFs)");
  }
  if (listedGmp) {
    paid.push("- GET /gmp — $0.05 — Health Canada Drug GMP report-card observation text + C.02 cites");
  }
  if (listedGmpMd) {
    paid.push("- GET /gmp-md — $0.05 — Health Canada medical-device report-card observation text + MDR cites");
  }
  const free = [
    `- GET /openapi.json — OpenAPI 3.1 with x-payment-info for the ${paidCountWord()} paid doors`,
    `- GET /.well-known/x402 — absolute URLs of the ${paidCountWord()} paid routes only`,
    `- GET / — shop JSON (payTo + the ${paidCountWord()} products)`,
    "- GET /manifest.json — Idaho ticks count + schema",
    "- GET /import-alerts/manifest.json — FDA count + schema (not the firm dump)",
    "- GET /mariners/manifest.json — D13 LNM count + official PDF (not the notice body)",
    "- GET /mariners-d11/manifest.json — D11 LNM count + official PDF (not the notice body)",
    "- GET /mariners-d7/manifest.json — D7 LNM count + official PDF (not the notice body)",
    "- GET /mariners-d8/manifest.json — D8 LNM count + official PDF (not the notice body)",
    "- GET /warning-letters/manifest.json — FDA letter count + firm/date/subject (not the letter body)",
    "- GET /untitled-letters/manifest.json — FDA untitled count + id/firm/date/product (not the letter text)",
    "- GET /awa/manifest.json — APHIS AWA count + id/firm/date/sourceUrl (not the observation text)",
  ];
  if (listed483) {
    free.push("- GET /form-483/manifest.json — FDA 483 count + id/date/firm (not the observation body)");
  }
  if (listedGmp) {
    free.push("- GET /gmp/manifest.json — Health Canada GMP count + id/firm/date/rating (not the observation text)");
  }
  if (listedGmpMd) {
    free.push("- GET /gmp-md/manifest.json — Health Canada MD count + id/firm/date/rating (not the report-card body text)");
  }
  return [
    "# BNM Data Shop",
    "",
    `Official public data as JSON at https://ticks.bnm.farm. ${paidCountWord().replace(/^./, (c) => c.toUpperCase())} paid GETs. USDC on Base (eip155:8453). payTo 0xf59621FC406D266e18f314Ae18eF0a33b8401004.`,
    "",
    "## Paid",
    "",
    ...paid,
    "",
    "Unpaid GET returns HTTP 402 with PAYMENT-REQUIRED and extensions.bazaar. After a valid X-PAYMENT, the same URL returns JSON. No API key. No request body.",
    "",
    "## Free discovery",
    "",
    ...free,
    "",
    `${noNextSkuWord()} Free manifests are not the paid body.`,
    "",
    "## Agent catalogs",
    "",
    `- x402scan — ${X402SCAN_SERVER_URL}`,
    "- Chainlink for Agents / CDP Bazaar — not listed until a CDP facilitator settle catalogs the route. Validate already accepts the listed paid URLs.",
    "",
  ].join("\n");
}

function resourceUrl(req: IncomingMessage, resPort: number, path: string): string {
  const configured = env("X402_RESOURCE_URL");
  if (configured) return configured.replace(/\/$/, "") + path;
  const host = req.headers.host || `127.0.0.1:${resPort}`;
  return `http://${host}${path}`;
}

function discoveryOrigin(req: IncomingMessage, port: number): string {
  return resourceUrl(req, port, "").replace(/\/$/, "") || "https://ticks.bnm.farm";
}

function paidDiscoveryPaths(): string[] {
  const paths = [TICKS_PATH, IMPORT_ALERTS_PATH, MARINERS_PATH, MARINERS_D11_PATH, MARINERS_D7_PATH, MARINERS_D8_PATH, WARNING_LETTERS_PATH, UNTITLED_LETTERS_PATH, AWA_PATH];
  if (form483IsPublic()) paths.push(FORM_483_PATH);
  if (gmpIsPublic()) paths.push(GMP_PATH);
  if (gmpMdIsPublic()) paths.push(GMP_MD_PATH);
  return paths;
}

function paidDiscoveryUrls(req: IncomingMessage, port: number): string[] {
  return paidDiscoveryPaths().map((path) => resourceUrl(req, port, path));
}

export function wellKnownX402(req: IncomingMessage, port: number): Record<string, unknown> {
  return {
    version: 1,
    resources: paidDiscoveryUrls(req, port),
    ownershipProofs: [PAY_TO],
    ...shopDiscoveryPointers(req, port),
    instructions:
      `GET each resource unpaid for HTTP 402 with extensions.bazaar. Pay USDC on Base. Free OpenAPI is at /openapi.json. Only these ${paidCountWord()} paid routes exist. x402scan: ${X402SCAN_SERVER_URL}`,
  };
}

function paidOpenApiOp(opts: {
  operationId: string;
  summary: string;
  description: string;
  priceUsdc: string;
  amountAtomic: string;
  example: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    operationId: opts.operationId,
    summary: opts.summary,
    description: opts.description,
    tags: ["paid"],
    security: [{ x402: [] }],
    parameters: [],
    "x-auth": { mode: "x402" },
    "x-payment-info": {
      protocols: [
        {
          x402: {
            scheme: "exact",
            network: NETWORK_V2,
            asset: USDC_BASE,
            payTo: PAY_TO,
            amount: opts.amountAtomic,
          },
        },
      ],
      price: { mode: "fixed", currency: "USD", amount: opts.priceUsdc },
      network: NETWORK_V2,
      asset: USDC_BASE,
      payTo: PAY_TO,
    },
    responses: {
      "200": {
        description: "Paid JSON body after a valid x402 settlement",
        content: {
          "application/json": {
            schema: opts.outputSchema,
            example: opts.example,
          },
        },
      },
      "402": {
        description: "Payment Required — x402 challenge in PAYMENT-REQUIRED and JSON body",
      },
    },
  };
}

function freeOpenApiOp(summary: string, description: string): Record<string, unknown> {
  return {
    summary,
    description,
    tags: ["free"],
    security: [],
    "x-auth": { mode: "none" },
    responses: {
      "200": {
        description: "Free JSON catalog / discovery document",
        content: { "application/json": { schema: { type: "object" } } },
      },
    },
  };
}

export function buildOpenApi(req: IncomingMessage, port: number): Record<string, unknown> {
  const origin = discoveryOrigin(req, port);
  const ticksAtomic = amountAtomicFor("ticks");
  const iaAtomic = amountAtomicFor("import-alerts");
  const lnmAtomic = amountAtomicFor("mariners");
  const lnmD11Atomic = amountAtomicFor("mariners-d11");
  const lnmD7Atomic = amountAtomicFor("mariners-d7");
  const lnmD8Atomic = amountAtomicFor("mariners-d8");
  const wlAtomic = amountAtomicFor("warning-letters");
  const ulAtomic = amountAtomicFor("untitled-letters");
  const awaAtomic = amountAtomicFor("awa");
  const f483Atomic = amountAtomicFor("form-483");
  const gmpAtomic = amountAtomicFor("gmp");
  const gmpMdAtomic = amountAtomicFor("gmp-md");
  const ticksPrice = (Number(ticksAtomic) / 1e6).toFixed(2);
  const iaPrice = (Number(iaAtomic) / 1e6).toFixed(2);
  const lnmPrice = (Number(lnmAtomic) / 1e6).toFixed(2);
  const lnmD11Price = (Number(lnmD11Atomic) / 1e6).toFixed(2);
  const lnmD7Price = (Number(lnmD7Atomic) / 1e6).toFixed(2);
  const lnmD8Price = (Number(lnmD8Atomic) / 1e6).toFixed(2);
  const wlPrice = (Number(wlAtomic) / 1e6).toFixed(2);
  const ulPrice = (Number(ulAtomic) / 1e6).toFixed(2);
  const awaPrice = (Number(awaAtomic) / 1e6).toFixed(2);
  const f483Price = (Number(f483Atomic) / 1e6).toFixed(2);
  const gmpPrice = (Number(gmpAtomic) / 1e6).toFixed(2);
  const gmpMdPrice = (Number(gmpMdAtomic) / 1e6).toFixed(2);
  const listed483 = form483IsPublic();
  const listedGmp = gmpIsPublic();
  const listedGmpMd = gmpMdIsPublic();
  const paidBits = [
    "/ticks ($0.02)",
    "/import-alerts ($0.05)",
    "/mariners ($0.05)",
    "/mariners-d11 ($0.05)",
    "/mariners-d7 ($0.05)",
    "/mariners-d8 ($0.05)",
    "/warning-letters ($0.05)",
    "/untitled-letters ($0.05)",
    "/awa ($0.05)",
  ];
  if (listed483) paidBits.push("/form-483 ($0.05)");
  if (listedGmp) paidBits.push("/gmp ($0.05)");
  if (listedGmpMd) paidBits.push("/gmp-md ($0.05)");
  const paidList = paidBits.join(", ");
  return {
    openapi: "3.1.0",
    info: {
      title: "BNM Data Shop",
      version: PRODUCT_VERSION,
      description: "Official public data as JSON. Unpaid paid routes return HTTP 402.",
      contact: { name: "BNM Data Shop", url: "https://bnm.farm/" },
      "x-guidance":
        `${paidCountWord().replace(/^./, (c) => c.toUpperCase())} paid GETs: ${paidList}, USDC on Base. Start at GET /openapi.json or GET /.well-known/x402, then probe the paid URL unpaid for HTTP 402. Free manifests do not include the paid body. No request body. ${noNextSkuWord()}`,
    },
    "x-discovery": {
      ownershipProofs: [PAY_TO],
    },
    "x-agentcash-provenance": {
      ownershipProofs: [PAY_TO],
    },
    "x-agentcash-guidance": {
      llmsTxtUrl: `${origin}${LLMS_PATH}`,
    },
    servers: [{ url: origin }],
    paths: {
      [TICKS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getTicks",
          summary: "Idaho + PNW market ticks",
          description: SKU_COPY.ticks.description,
          priceUsdc: ticksPrice,
          amountAtomic: ticksAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE.ticks,
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              ticks: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [IMPORT_ALERTS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getImportAlerts",
          summary: "FDA Import Alerts / DWPE",
          description: SKU_COPY["import-alerts"].description,
          priceUsdc: iaPrice,
          amountAtomic: iaAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["import-alerts"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              ticks: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [MARINERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getMariners",
          summary: "USCG D13 / Northwest LNM",
          description: SKU_COPY.mariners.description,
          priceUsdc: lnmPrice,
          amountAtomic: lnmAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE.mariners,
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              week: { type: "string" },
              notices: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [MARINERS_D11_PATH]: {
        get: paidOpenApiOp({
          operationId: "getMarinersD11",
          summary: "USCG D11 / Southwest LNM",
          description: SKU_COPY["mariners-d11"].description,
          priceUsdc: lnmD11Price,
          amountAtomic: lnmD11Atomic,
          example: BAZAAR_OUTPUT_EXAMPLE["mariners-d11"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              week: { type: "string" },
              notices: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [MARINERS_D7_PATH]: {
        get: paidOpenApiOp({
          operationId: "getMarinersD7",
          summary: "USCG D7 / Southeast LNM",
          description: SKU_COPY["mariners-d7"].description,
          priceUsdc: lnmD7Price,
          amountAtomic: lnmD7Atomic,
          example: BAZAAR_OUTPUT_EXAMPLE["mariners-d7"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              week: { type: "string" },
              notices: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [MARINERS_D8_PATH]: {
        get: paidOpenApiOp({
          operationId: "getMarinersD8",
          summary: "USCG D8 / Gulf LNM",
          description: SKU_COPY["mariners-d8"].description,
          priceUsdc: lnmD8Price,
          amountAtomic: lnmD8Atomic,
          example: BAZAAR_OUTPUT_EXAMPLE["mariners-d8"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              week: { type: "string" },
              notices: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [WARNING_LETTERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getWarningLetters",
          summary: "FDA warning-letter bodies",
          description: SKU_COPY["warning-letters"].description,
          priceUsdc: wlPrice,
          amountAtomic: wlAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["warning-letters"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              letters: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [UNTITLED_LETTERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getUntitledLetters",
          summary: "FDA Untitled Letter bodies (CDER OPDP + CBER promo)",
          description: SKU_COPY["untitled-letters"].description,
          priceUsdc: ulPrice,
          amountAtomic: ulAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["untitled-letters"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [AWA_PATH]: {
        get: paidOpenApiOp({
          operationId: "getAwa",
          summary: "USDA APHIS AWA inspection-report observation text",
          description: SKU_COPY.awa.description,
          priceUsdc: awaPrice,
          amountAtomic: awaAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE.awa,
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      ...(listed483
        ? {
            [FORM_483_PATH]: {
              get: paidOpenApiOp({
                operationId: "getForm483",
                summary: "FDA Form 483 observation bodies",
                description: SKU_COPY["form-483"].description,
                priceUsdc: f483Price,
                amountAtomic: f483Atomic,
                example: BAZAAR_OUTPUT_EXAMPLE["form-483"],
                outputSchema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    product: { type: "string" },
                    status: { type: "string" },
                    letters: { type: "array", items: { type: "object" } },
                  },
                },
              }),
            },
          }
        : {}),
      ...(listedGmp
        ? {
            [GMP_PATH]: {
              get: paidOpenApiOp({
                operationId: "getGmp",
                summary: "Health Canada Drug GMP report-card observation bodies",
                description: SKU_COPY.gmp.description,
                priceUsdc: gmpPrice,
                amountAtomic: gmpAtomic,
                example: BAZAAR_OUTPUT_EXAMPLE.gmp,
                outputSchema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    product: { type: "string" },
                    status: { type: "string" },
                    cards: { type: "array", items: { type: "object" } },
                  },
                },
              }),
            },
          }
        : {}),
      ...(listedGmpMd
        ? {
            [GMP_MD_PATH]: {
              get: paidOpenApiOp({
                operationId: "getGmpMd",
                summary: "Health Canada medical-device report-card observation bodies",
                description: SKU_COPY["gmp-md"].description,
                priceUsdc: gmpMdPrice,
                amountAtomic: gmpMdAtomic,
                example: BAZAAR_OUTPUT_EXAMPLE["gmp-md"],
                outputSchema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    product: { type: "string" },
                    status: { type: "string" },
                    cards: { type: "array", items: { type: "object" } },
                  },
                },
              }),
            },
          }
        : {}),
      [MANIFEST_PATH]: {
        get: freeOpenApiOp("Idaho ticks free manifest", "Count, schema, and samples. Not the paid snapshot."),
      },
      [CATALOG_PATH]: {
        get: freeOpenApiOp("Idaho ticks free catalog alias", "Same JSON as /manifest.json."),
      },
      [IMPORT_ALERTS_MANIFEST_PATH]: {
        get: freeOpenApiOp("FDA import-alerts free manifest", "Count, catalog, and schema. Not the paid firm list."),
      },
      [MARINERS_MANIFEST_PATH]: {
        get: freeOpenApiOp("USCG D13 LNM free manifest", "Count, week, and official PDF URL. Not the notice body."),
      },
      [MARINERS_D11_MANIFEST_PATH]: {
        get: freeOpenApiOp("USCG D11 LNM free manifest", "Count, week, and official PDF URL. Not the notice body."),
      },
      [MARINERS_D7_MANIFEST_PATH]: {
        get: freeOpenApiOp("USCG D7 LNM free manifest", "Count, week, and official PDF URL. Not the notice body."),
      },
      [MARINERS_D8_MANIFEST_PATH]: {
        get: freeOpenApiOp("USCG D8 LNM free manifest", "Count, week, and official PDF URL. Not the notice body."),
      },
      [WARNING_LETTERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA warning-letters free manifest",
          "Count, firm, date, subject, and official source URL. Not the letter body.",
        ),
      },
      [UNTITLED_LETTERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA untitled-letters free manifest",
          "Count, id, firm, date, product, and official source URL. Not the letter text.",
        ),
      },
      [AWA_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "APHIS AWA free manifest",
          "Count, id, firm, date, and official source URL. Not the observation text.",
        ),
      },
      ...(listed483
        ? {
            [FORM_483_MANIFEST_PATH]: {
              get: freeOpenApiOp(
                "FDA Form 483 free manifest",
                "Count, id, firm, and dates. Not the observation body.",
              ),
            },
          }
        : {}),
      ...(listedGmp
        ? {
            [GMP_MANIFEST_PATH]: {
              get: freeOpenApiOp(
                "Health Canada GMP free manifest",
                "Count, id, firm, date, and rating. Not the observation text.",
              ),
            },
          }
        : {}),
      ...(listedGmpMd
        ? {
            [GMP_MD_MANIFEST_PATH]: {
              get: freeOpenApiOp(
                "Health Canada medical-device free manifest",
                "Count, id, firm, date, and rating. Not the report-card body text.",
              ),
            },
          }
        : {}),
      [WELL_KNOWN_PATH]: {
        get: freeOpenApiOp(
          "x402 well-known fan-out",
          `Absolute URLs of the ${paidCountWord()} live paid routes only.`,
        ),
      },
      [OPENAPI_PATH]: {
        get: freeOpenApiOp("OpenAPI discovery document", "This document."),
      },
      [LLMS_PATH]: {
        get: freeOpenApiOp(
          "Short agent guidance",
          `The ${paidCountWord()} paid doors and free discovery URLs. Not a paid SKU.`,
        ),
      },
      "/": {
        get: freeOpenApiOp(
          "Shop discovery JSON",
          `payTo, network, and the ${paidCountWord()} public products.`,
        ),
      },
    },
    components: {
      securitySchemes: {
        x402: {
          type: "apiKey",
          in: "header",
          name: "X-PAYMENT",
          description: "x402 payment payload. Unpaid GET returns HTTP 402 with PAYMENT-REQUIRED.",
        },
      },
    },
  };
}

async function servePaid(
  req: IncomingMessage,
  res: ServerResponse,
  port: number,
  sku: DoorSku,
  load: () => unknown | Promise<unknown>,
): Promise<void> {
  const copy = SKU_COPY[sku];
  const payment = paymentHeader(req);
  const resource = resourceUrl(req, port, copy.resourcePath);
  const body402 = paymentRequiredBody(resource, sku);
  const v2 = paymentRequiredV2(resource, sku);
  const paymentRequiredHeader = Buffer.from(JSON.stringify(v2), "utf-8").toString("base64");

  if (!payment) {
    sendJson(res, 402, body402, { "PAYMENT-REQUIRED": paymentRequiredHeader });
    return;
  }

  const serve = async () => sendJson(res, 200, await load());

  if (skipSettle()) {
    await serve();
    return;
  }

  const accept = facilitatorPaymentRequirements(resource, sku);
  const verified = await facilitatorVerify(payment, accept);
  if (verified && (await facilitatorSettle(payment, accept))) {
    await serve();
    return;
  }
  if (await localEip3009Settle(payment, accept)) {
    await serve();
    return;
  }
  sendJson(
    res,
    402,
    {
      ...body402,
      error: "Payment present but not settled. Set X402_FACILITATOR_URL or pay with a valid x402 X-PAYMENT header.",
    },
    { "PAYMENT-REQUIRED": paymentRequiredHeader },
  );
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse, port: number): Promise<void> {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "X-PAYMENT, PAYMENT-SIGNATURE, Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  if (path === "/") {
    sendJson(res, 200, {
      shop: "bnm-data-shop",
      payTo: PAY_TO,
      network: NETWORK_V1,
      asset: USDC_BASE,
      openapi: OPENAPI_PATH,
      wellKnown: WELL_KNOWN_PATH,
      llmsTxt: LLMS_PATH,
      products: [
        {
          path: TICKS_PATH,
          product: "idaho-hay-feeder-ticks",
          priceUsdc: "0.02",
          amountAtomic: amountAtomicFor("ticks"),
          manifest: MANIFEST_PATH,
        },
        {
          path: IMPORT_ALERTS_PATH,
          product: "fda-import-alerts",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("import-alerts"),
          manifest: IMPORT_ALERTS_MANIFEST_PATH,
        },
        {
          path: MARINERS_PATH,
          product: "uscg-d13-lnm",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("mariners"),
          manifest: MARINERS_MANIFEST_PATH,
        },
        {
          path: MARINERS_D11_PATH,
          product: D11_SPEC.productId,
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("mariners-d11"),
          manifest: MARINERS_D11_MANIFEST_PATH,
        },
        {
          path: MARINERS_D7_PATH,
          product: D7_SPEC.productId,
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("mariners-d7"),
          manifest: MARINERS_D7_MANIFEST_PATH,
        },
        {
          path: MARINERS_D8_PATH,
          product: D8_SPEC.productId,
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("mariners-d8"),
          manifest: MARINERS_D8_MANIFEST_PATH,
        },
        {
          path: WARNING_LETTERS_PATH,
          product: "fda-warning-letter-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("warning-letters"),
          manifest: WARNING_LETTERS_MANIFEST_PATH,
        },
        {
          path: UNTITLED_LETTERS_PATH,
          product: "fda-untitled-letter-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("untitled-letters"),
          manifest: UNTITLED_LETTERS_MANIFEST_PATH,
        },
        {
          path: AWA_PATH,
          product: "aphis-awa-inspection-observation-text",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("awa"),
          manifest: AWA_MANIFEST_PATH,
        },
        ...(form483IsPublic()
          ? [
              {
                path: FORM_483_PATH,
                product: "fda-form-483-bodies",
                priceUsdc: "0.05",
                amountAtomic: amountAtomicFor("form-483"),
                manifest: FORM_483_MANIFEST_PATH,
              },
            ]
          : []),
        ...(gmpIsPublic()
          ? [
              {
                path: GMP_PATH,
                product: "hc-gmp-report-cards",
                priceUsdc: "0.05",
                amountAtomic: amountAtomicFor("gmp"),
                manifest: GMP_MANIFEST_PATH,
              },
            ]
          : []),
        ...(gmpMdIsPublic()
          ? [
              {
                path: GMP_MD_PATH,
                product: "hc-md-inspection-cards",
                priceUsdc: "0.05",
                amountAtomic: amountAtomicFor("gmp-md"),
                manifest: GMP_MD_MANIFEST_PATH,
              },
            ]
          : []),
      ],
    });
    return;
  }

  if (path === WELL_KNOWN_PATH || path === "/.well-known/x402.json") {
    sendJson(res, 200, wellKnownX402(req, port));
    return;
  }

  if (path === OPENAPI_PATH) {
    sendJson(res, 200, buildOpenApi(req, port));
    return;
  }

  if (path === LLMS_PATH) {
    sendText(res, 200, llmsTxt(), "text/markdown; charset=utf-8");
    return;
  }

  if (path === MANIFEST_PATH || path === CATALOG_PATH) {
    sendJson(res, 200, buildTicksManifest(resourceUrl(req, port, TICKS_PATH)));
    return;
  }

  if (path === IMPORT_ALERTS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadManifest(), req, port));
    return;
  }

  if (path === MARINERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadMarinersManifest(), req, port));
    return;
  }

  if (path === MARINERS_D11_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadMarinersD11Manifest(), req, port));
    return;
  }

  if (path === MARINERS_D7_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadMarinersD7Manifest(), req, port));
    return;
  }

  if (path === MARINERS_D8_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadMarinersD8Manifest(), req, port));
    return;
  }

  if (path === IMPORT_ALERTS_PATH) {
    await servePaid(req, res, port, "import-alerts", () => loadImportAlerts());
    return;
  }

  if (path === MARINERS_PATH) {
    await servePaid(req, res, port, "mariners", () => loadMariners());
    return;
  }

  if (path === MARINERS_D11_PATH) {
    await servePaid(req, res, port, "mariners-d11", () => loadMarinersD11());
    return;
  }

  if (path === MARINERS_D7_PATH) {
    await servePaid(req, res, port, "mariners-d7", () => loadMarinersD7());
    return;
  }

  if (path === MARINERS_D8_PATH) {
    await servePaid(req, res, port, "mariners-d8", () => loadMarinersD8());
    return;
  }

  if (path === WARNING_LETTERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadWarningLettersManifest(), req, port));
    return;
  }

  if (path === WARNING_LETTERS_PATH) {
    await servePaid(req, res, port, "warning-letters", () => loadWarningLetters());
    return;
  }

  if (path === UNTITLED_LETTERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadUntitledLettersManifest(), req, port));
    return;
  }

  if (path === UNTITLED_LETTERS_PATH) {
    await servePaid(req, res, port, "untitled-letters", () => loadUntitledLetters());
    return;
  }

  if (path === AWA_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadAwaManifest(), req, port));
    return;
  }

  if (path === AWA_PATH) {
    await servePaid(req, res, port, "awa", () => loadAwa());
    return;
  }

  if (path === FORM_483_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadForm483Manifest(), req, port));
    return;
  }

  if (path === FORM_483_PATH) {
    await servePaid(req, res, port, "form-483", () => loadForm483());
    return;
  }

  if (path === GMP_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadGmpManifest(), req, port));
    return;
  }

  if (path === GMP_PATH) {
    await servePaid(req, res, port, "gmp", () => loadGmp());
    return;
  }

  if (path === GMP_MD_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadGmpMdManifest(), req, port));
    return;
  }

  if (path === GMP_MD_PATH) {
    await servePaid(req, res, port, "gmp-md", () => loadGmpMd());
    return;
  }

  if (path === TICKS_PATH) {
    await servePaid(req, res, port, "ticks", () => loadTicks());
    return;
  }

  sendJson(res, 404, { error: "not_found", paths: [TICKS_PATH, MANIFEST_PATH, CATALOG_PATH, IMPORT_ALERTS_PATH, IMPORT_ALERTS_MANIFEST_PATH, MARINERS_PATH, MARINERS_MANIFEST_PATH, MARINERS_D11_PATH, MARINERS_D11_MANIFEST_PATH, MARINERS_D7_PATH, MARINERS_D7_MANIFEST_PATH, MARINERS_D8_PATH, MARINERS_D8_MANIFEST_PATH, WARNING_LETTERS_PATH, WARNING_LETTERS_MANIFEST_PATH, UNTITLED_LETTERS_PATH, UNTITLED_LETTERS_MANIFEST_PATH, AWA_PATH, AWA_MANIFEST_PATH, FORM_483_PATH, FORM_483_MANIFEST_PATH, GMP_PATH, GMP_MANIFEST_PATH, GMP_MD_PATH, GMP_MD_MANIFEST_PATH, WELL_KNOWN_PATH, OPENAPI_PATH, LLMS_PATH] });
}

export function bindHost(): string {
  return env("BIND_HOST", "0.0.0.0");
}

export function createTicksServer(port = Number(env("PORT", "4020")) || 4020) {
  const server = createHttpServer((req, res) => {
    void handleRequest(req, res, port).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) sendJson(res, 500, { error: "server_error", message });
    });
  });
  return { server, port };
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  const { server, port } = createTicksServer();
  const host = bindHost();
  server.listen(port, host, () => {
    const board = boardPath();
    console.error(`bnm data shop x402 door on ${host}:${port}`);
    console.error(`${TICKS_PATH} $${Number(amountAtomicFor("ticks")) / 1e6} USDC`);
    console.error(`${IMPORT_ALERTS_PATH} $${Number(amountAtomicFor("import-alerts")) / 1e6} USDC`);
    console.error(`${MARINERS_PATH} $${Number(amountAtomicFor("mariners")) / 1e6} USDC`);
    console.error(`${MARINERS_D11_PATH} $${Number(amountAtomicFor("mariners-d11")) / 1e6} USDC`);
    console.error(`${MARINERS_D7_PATH} $${Number(amountAtomicFor("mariners-d7")) / 1e6} USDC`);
    console.error(`${MARINERS_D8_PATH} $${Number(amountAtomicFor("mariners-d8")) / 1e6} USDC`);
    console.error(`${WARNING_LETTERS_PATH} $${Number(amountAtomicFor("warning-letters")) / 1e6} USDC`);
    console.error(`${UNTITLED_LETTERS_PATH} $${Number(amountAtomicFor("untitled-letters")) / 1e6} USDC`);
    console.error(`${AWA_PATH} $${Number(amountAtomicFor("awa")) / 1e6} USDC`);
    console.error(`${FORM_483_PATH} $${Number(amountAtomicFor("form-483")) / 1e6} USDC${form483IsPublic() ? "" : " (unlisted until a real 483 body is cached)"}`);
    console.error(`${GMP_PATH} $${Number(amountAtomicFor("gmp")) / 1e6} USDC${gmpIsPublic() ? "" : " (unlisted until a real GMP observation body is cached)"}`);
    console.error(`${GMP_MD_PATH} $${Number(amountAtomicFor("gmp-md")) / 1e6} USDC${gmpMdIsPublic() ? "" : " (unlisted until a real MD observation body is cached)"}`);
    console.error(`payTo ${PAY_TO} USDC ${USDC_BASE} on Base`);
    console.error(`ticksDir ${ticksDir() || "(unset)"}`);
    console.error(`board ${board && existsSync(board) ? board : "missing — paid /ticks body will be empty/stale"}`);
  });
}
