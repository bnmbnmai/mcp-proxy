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
 * GET /swisspar — Swissmedic first-authorisation SwissPAR evaluation text ($0.05)
 * GET /swisspar/manifest.json — free count + name/date/MA/sourceUrl (no evaluation text)
 * GET /pcac — FDA PCAC 503A briefing-memo evaluation text ($0.05)
 * GET /pcac/manifest.json — free count + substance/date/meeting/mediaId/sourceUrl (no evaluation text)
 * GET /ftc-wl — FTC BCP warning-letter PDF text ($0.05)
 * GET /ftc-wl/manifest.json — free count + firm/date/subject/sourceUrl (no letter body)
 * GET /cfpb-orders — CFPB consent-order / administrative-order PDF text ($0.05)
 * GET /cfpb-orders/manifest.json — free count + firm/date/title/fileNo/sourceUrl (no order body)
 * GET /occ-cd — OCC institution C&D / consent-order PDF text ($0.05)
 * GET /occ-cd/manifest.json — free count + bank/docket/date/sourceUrl (no order body)
 * GET /fdic-orders — FDIC institution consent-order / C&D PDF text ($0.05)
 * GET /fdic-orders/manifest.json — free count + bank/docket/date/sourceUrl (no order body)
 * GET /frb-orders — FRB institution C&D / written-agreement / PCA PDF text ($0.05)
 * GET /frb-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /ncua-orders — NCUA institution consent C&D HTML text ($0.05)
 * GET /ncua-orders/manifest.json — free count + credit union/docket/date/sourceUrl (no order body)
 * GET /fincen-orders — FinCEN institution consent-order PDF text ($0.05)
 * GET /fincen-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /ferc-orders — FERC institution stipulation-and-consent / show-cause / civil-penalty PDF text ($0.05)
 * GET /ferc-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /ofac-orders — OFAC institution/company enforcement-release PDF text ($0.05)
 * GET /ofac-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /bis-orders — BIS institution charging-letter / order / settlement PDF text ($0.05)
 * GET /bis-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /cftc-orders — CFTC institution enforcement-order / settlement PDF text ($0.05)
 * GET /cftc-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /fifra-orders — EPA FIFRA institution order / consent PDF text ($0.05)
 * GET /fifra-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /denovo-orders — FDA De Novo classification-order PDF text ($0.05)
 * GET /denovo-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /ttb-oic — TTB institution Offer in Compromise PDF text ($0.05)
 * GET /ttb-oic/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /air-letters — USDA APHIS AIR confirmation-letter PDF text ($0.05)
 * GET /air-letters/manifest.json — free count + institution/docket/date/sourceUrl (no letter body)
 * GET /superfund-rods — EPA Superfund Record of Decision PDF text ($0.05)
 * GET /superfund-rods/manifest.json — free count + institution/docket/date/sourceUrl (no ROD body)
 * GET /ico-mpn — ICO Monetary Penalty Notice PDF text ($0.05)
 * GET /ico-mpn/manifest.json — free count + institution/docket/date/sourceUrl (no MPN body)
 * GET /phmsa-cop — PHMSA OPS consent / final / CAO / safety-order PDF text ($0.05) (prep; unlisted until /ico-mpn is live)
 * GET /phmsa-cop/manifest.json — free count + operator/CPF/date/sourceUrl (no order body)
 * GET /acm-besluiten — ACM boetebesluit / besluit PDF text ($0.05) (prep; unlisted)
 * GET /acm-besluiten/manifest.json — free count + institution/zaak/date/sourceUrl (no besluit body)
 * GET /ccpc-mergers — CCPC section 21 determination PDF text ($0.05) (prep; unlisted)
 * GET /ccpc-mergers/manifest.json — free count + institution/M-number/date/sourceUrl (no determination body)
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
  SWISSPAR_AMOUNT_ATOMIC,
  SWISSPAR_MANIFEST_PATH,
  SWISSPAR_PATH,
  loadSwisspar,
  loadSwissparManifest,
} from "./swisspar.js";
import {
  PCAC_AMOUNT_ATOMIC,
  PCAC_MANIFEST_PATH,
  PCAC_PATH,
  loadPcac,
  loadPcacManifest,
} from "./pcac.js";
import {
  FTC_WL_AMOUNT_ATOMIC,
  FTC_WL_MANIFEST_PATH,
  FTC_WL_PATH,
  loadFtcWl,
  loadFtcWlManifest,
} from "./ftc-wl.js";
import {
  CFPB_ORDERS_AMOUNT_ATOMIC,
  CFPB_ORDERS_MANIFEST_PATH,
  CFPB_ORDERS_PATH,
  loadCfpbOrders,
  loadCfpbOrdersManifest,
} from "./cfpb-orders.js";
import {
  OCC_CD_AMOUNT_ATOMIC,
  OCC_CD_MANIFEST_PATH,
  OCC_CD_PATH,
  loadOccCd,
  loadOccCdManifest,
} from "./occ-cd.js";
import {
  FDIC_ORDERS_AMOUNT_ATOMIC,
  FDIC_ORDERS_MANIFEST_PATH,
  FDIC_ORDERS_PATH,
  loadFdicOrders,
  loadFdicOrdersManifest,
} from "./fdic-orders.js";
import {
  FRB_ORDERS_AMOUNT_ATOMIC,
  FRB_ORDERS_MANIFEST_PATH,
  FRB_ORDERS_PATH,
  loadFrbOrders,
  loadFrbOrdersManifest,
} from "./frb-orders.js";
import {
  NCUA_ORDERS_AMOUNT_ATOMIC,
  NCUA_ORDERS_MANIFEST_PATH,
  NCUA_ORDERS_PATH,
  loadNcuaOrders,
  loadNcuaOrdersManifest,
} from "./ncua-orders.js";
import {
  FINCEN_ORDERS_AMOUNT_ATOMIC,
  FINCEN_ORDERS_MANIFEST_PATH,
  FINCEN_ORDERS_PATH,
  loadFincenOrders,
  loadFincenOrdersManifest,
} from "./fincen-orders.js";
import {
  FERC_ORDERS_AMOUNT_ATOMIC,
  FERC_ORDERS_MANIFEST_PATH,
  FERC_ORDERS_PATH,
  loadFercOrders,
  loadFercOrdersManifest,
} from "./ferc-orders.js";
import {
  OFAC_ORDERS_AMOUNT_ATOMIC,
  OFAC_ORDERS_MANIFEST_PATH,
  OFAC_ORDERS_PATH,
  loadOfacOrders,
  loadOfacOrdersManifest,
} from "./ofac-orders.js";
import {
  BIS_ORDERS_AMOUNT_ATOMIC,
  BIS_ORDERS_MANIFEST_PATH,
  BIS_ORDERS_PATH,
  loadBisOrders,
  loadBisOrdersManifest,
} from "./bis-orders.js";
import {
  CFTC_ORDERS_AMOUNT_ATOMIC,
  CFTC_ORDERS_MANIFEST_PATH,
  CFTC_ORDERS_PATH,
  loadCftcOrders,
  loadCftcOrdersManifest,
} from "./cftc-orders.js";
import {
  FIFRA_ORDERS_AMOUNT_ATOMIC,
  FIFRA_ORDERS_MANIFEST_PATH,
  FIFRA_ORDERS_PATH,
  loadFifraOrders,
  loadFifraOrdersManifest,
} from "./fifra-orders.js";
import {
  DENOVO_ORDERS_AMOUNT_ATOMIC,
  DENOVO_ORDERS_MANIFEST_PATH,
  DENOVO_ORDERS_PATH,
  loadDenovoOrders,
  loadDenovoOrdersManifest,
} from "./denovo-orders.js";
import {
  TTB_OIC_AMOUNT_ATOMIC,
  TTB_OIC_MANIFEST_PATH,
  TTB_OIC_PATH,
  loadTtbOic,
  loadTtbOicManifest,
} from "./ttb-oic.js";
import {
  AIR_LETTERS_AMOUNT_ATOMIC,
  AIR_LETTERS_MANIFEST_PATH,
  AIR_LETTERS_PATH,
  loadAirLetters,
  loadAirLettersManifest,
} from "./air-letters.js";
import {
  SUPERFUND_RODS_AMOUNT_ATOMIC,
  SUPERFUND_RODS_MANIFEST_PATH,
  SUPERFUND_RODS_PATH,
  loadSuperfundRods,
  loadSuperfundRodsManifest,
} from "./superfund-rods.js";
import {
  ICO_MPN_AMOUNT_ATOMIC,
  ICO_MPN_MANIFEST_PATH,
  ICO_MPN_PATH,
  loadIcoMpn,
  loadIcoMpnManifest,
} from "./ico-mpn.js";
import {
  PHMSA_COP_AMOUNT_ATOMIC,
  PHMSA_COP_MANIFEST_PATH,
  PHMSA_COP_PATH,
  loadPhmsaCop,
  loadPhmsaCopManifest,
} from "./phmsa-cop.js";
import {
  ACM_BESLUITEN_AMOUNT_ATOMIC,
  ACM_BESLUITEN_MANIFEST_PATH,
  ACM_BESLUITEN_PATH,
  loadAcmBesluiten,
  loadAcmBesluitenManifest,
} from "./acm-besluiten.js";
import {
  CCPC_MERGERS_AMOUNT_ATOMIC,
  CCPC_MERGERS_MANIFEST_PATH,
  CCPC_MERGERS_PATH,
  loadCcpcMergers,
  loadCcpcMergersManifest,
} from "./ccpc-mergers.js";
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
/** x402scan origin page for the live paid doors. /ico-mpn is a live public SKU. */
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

export type DoorSku = "ticks" | "import-alerts" | "mariners" | "mariners-d11" | "mariners-d7" | "mariners-d8" | "warning-letters" | "untitled-letters" | "awa" | "swisspar" | "pcac" | "ftc-wl" | "cfpb-orders" | "occ-cd" | "fdic-orders" | "frb-orders" | "ncua-orders" | "fincen-orders" | "ferc-orders" | "ofac-orders" | "bis-orders" | "cftc-orders" | "fifra-orders" | "denovo-orders" | "ttb-oic" | "air-letters" | "superfund-rods" | "ico-mpn" | "phmsa-cop" | "acm-besluiten" | "ccpc-mergers" | "form-483" | "gmp" | "gmp-md";
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
  "swisspar",
  "pcac",
  "ftc-wl",
  "cfpb-orders",
  "occ-cd",
  "fdic-orders",
  "frb-orders",
  "ncua-orders",
  "fincen-orders",
  "ferc-orders",
  "ofac-orders",
  "bis-orders",
  "cftc-orders",
  "fifra-orders",
  "denovo-orders",
  "ttb-oic",
  "air-letters",
  "superfund-rods",
  "ico-mpn",
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

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "twenty-one", "twenty-two", "twenty-three", "twenty-four", "twenty-five", "twenty-six", "twenty-seven", "twenty-eight", "twenty-nine", "thirty", "thirty-one"] as const;
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
  "fourteenth",
  "fifteenth",
  "sixteenth",
  "seventeenth",
  "eighteenth",
  "nineteenth",
  "twentieth",
  "twenty-first",
  "twenty-second",
  "twenty-third",
  "twenty-fourth",
  "twenty-fifth",
  "twenty-sixth",
  "twenty-seventh",
  "twenty-eighth",
  "twenty-ninth",
  "thirtieth",
  "thirty-first",
  "thirty-second",
] as const;

function paidCountWord(): string {
  const n = publicBazaarSkus().length;
  return COUNT_WORDS[n] ?? String(n);
}

function noNextSkuWord(): string {
  const n = publicBazaarSkus().length;
  const next = NEXT_SKU_WORDS[n] ?? `${n + 1}th`;
  return `/ico-mpn is a live public SKU on purpose. No ${next} public SKU.`;
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
  if (sku === "swisspar") {
    const raw = env("SWISSPAR_USDC_ATOMIC");
    return raw.length > 0 ? raw : SWISSPAR_AMOUNT_ATOMIC;
  }
  if (sku === "pcac") {
    const raw = env("PCAC_USDC_ATOMIC");
    return raw.length > 0 ? raw : PCAC_AMOUNT_ATOMIC;
  }
  if (sku === "ftc-wl") {
    const raw = env("FTC_WL_USDC_ATOMIC");
    return raw.length > 0 ? raw : FTC_WL_AMOUNT_ATOMIC;
  }
  if (sku === "cfpb-orders") {
    const raw = env("CFPB_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : CFPB_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "occ-cd") {
    const raw = env("OCC_CD_USDC_ATOMIC");
    return raw.length > 0 ? raw : OCC_CD_AMOUNT_ATOMIC;
  }
  if (sku === "fdic-orders") {
    const raw = env("FDIC_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : FDIC_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "frb-orders") {
    const raw = env("FRB_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : FRB_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "ncua-orders") {
    const raw = env("NCUA_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : NCUA_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "fincen-orders") {
    const raw = env("FINCEN_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : FINCEN_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "ferc-orders") {
    const raw = env("FERC_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : FERC_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "ofac-orders") {
    const raw = env("OFAC_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : OFAC_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "bis-orders") {
    const raw = env("BIS_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : BIS_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "cftc-orders") {
    const raw = env("CFTC_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : CFTC_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "fifra-orders") {
    const raw = env("FIFRA_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : FIFRA_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "denovo-orders") {
    const raw = env("DENOVO_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : DENOVO_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "ttb-oic") {
    const raw = env("TTB_OIC_USDC_ATOMIC");
    return raw.length > 0 ? raw : TTB_OIC_AMOUNT_ATOMIC;
  }
  if (sku === "air-letters") {
    const raw = env("AIR_LETTERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : AIR_LETTERS_AMOUNT_ATOMIC;
  }
  if (sku === "superfund-rods") {
    const raw = env("SUPERFUND_RODS_USDC_ATOMIC");
    return raw.length > 0 ? raw : SUPERFUND_RODS_AMOUNT_ATOMIC;
  }
  if (sku === "ico-mpn") {
    const raw = env("ICO_MPN_USDC_ATOMIC");
    return raw.length > 0 ? raw : ICO_MPN_AMOUNT_ATOMIC;
  }
  if (sku === "phmsa-cop") {
    const raw = env("PHMSA_COP_USDC_ATOMIC");
    return raw.length > 0 ? raw : PHMSA_COP_AMOUNT_ATOMIC;
  }
  if (sku === "acm-besluiten") {
    const raw = env("ACM_BESLUITEN_USDC_ATOMIC");
    return raw.length > 0 ? raw : ACM_BESLUITEN_AMOUNT_ATOMIC;
  }
  if (sku === "ccpc-mergers") {
    const raw = env("CCPC_MERGERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : CCPC_MERGERS_AMOUNT_ATOMIC;
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
  swisspar: {
    description:
      "Call GET /swisspar when you need official Swissmedic first-authorisation SwissPAR evaluation text extracted from per-product PDFs. Not the A–Z HTML index. Not EMA EPARs/referrals. Not FDA CDER reviews. Not the HCP/FI appendix.",
    resourcePath: SWISSPAR_PATH,
  },
  pcac: {
    description:
      "Call GET /pcac when you need official FDA-authored PCAC 503A briefing-memo evaluation text extracted from per-substance PDFs. Not the FR notice or docket 0001. Not CDER multidisciplinary reviews. Not combined sponsor/AdComm packs.",
    resourcePath: PCAC_PATH,
  },
  "ftc-wl": {
    description:
      "Call GET /ftc-wl when you need official FTC Bureau of Consumer Protection warning-letter text extracted from per-letter PDFs on ftc.gov. Not the legal-library index. Not the Drupal node. Not FDA /warning-letters. Not official templates.",
    resourcePath: FTC_WL_PATH,
  },
  "cfpb-orders": {
    description:
      "Call GET /cfpb-orders when you need official CFPB-authored consent-order / administrative-order text extracted from per-order PDFs on files.consumerfinance.gov. Not the enforcement index. Not the action-page teaser. Not the Consumer Complaint Database. Not FTC /ftc-wl.",
    resourcePath: CFPB_ORDERS_PATH,
  },
  "occ-cd": {
    description:
      "Call GET /occ-cd when you need official OCC institution Cease-and-Desist / Consent Order text extracted from per-order PDFs on occ.gov/static/enforcement-actions. Not EASearch ExportToJSON metadata. Not IAP / people / prohibition / CMP-against-person. Not CFPB /cfpb-orders. Not FTC /ftc-wl. Not SEC EDGAR complete-submission .txt.",
    resourcePath: OCC_CD_PATH,
  },
  "fdic-orders": {
    description:
      "Call GET /fdic-orders when you need official FDIC institution consent-order / Cease-and-Desist text extracted from per-order PDFs on orders.fdic.gov. Not the EDOS Salesforce index. Not BankFind. Not monthly NR counts. Not IAP / 1829 / Section 19 people files. Not EDGAR 8-K. Not Federal Register raw_text. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl.",
    resourcePath: FDIC_ORDERS_PATH,
  },
  "frb-orders": {
    description:
      "Call GET /frb-orders when you need official FRB institution Cease-and-Desist / written-agreement / PCA text extracted from per-order PDFs on federalreserve.gov. Not the official enforcement CSV. Not ea-old.json / ea-cms-recent.json / ne-press.json teasers. Not BankFind. Not IAP / prohibition-of-employee people files. Not EDGAR 8-K. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl.",
    resourcePath: FRB_ORDERS_PATH,
  },
  "ncua-orders": {
    description:
      "Call GET /ncua-orders when you need official NCUA institution consent Cease-and-Desist text extracted from per-order HTML on ncua.gov. Not the official CSV. Not Drupal ?_format=json. Not 2026 people/IAP. Not late-filer CMP. Not LUAs. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl.",
    resourcePath: NCUA_ORDERS_PATH,
  },
  "fincen-orders": {
    description:
      "Call GET /fincen-orders when you need official FinCEN institution consent-order text extracted from per-order PDFs on fincen.gov. Not the enforcement-actions index teaser. Not people-only CMP. Not a news-release wrap. Not Federal Register raw_text. Not NCUA /ncua-orders. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl.",
    resourcePath: FINCEN_ORDERS_PATH,
  },
  "ferc-orders": {
    description:
      "Call GET /ferc-orders when you need official FERC institution stipulation-and-consent / show-cause / civil-penalty text extracted from per-order PDFs on cms.ferc.gov. Not the civil-penalty index teaser. Not eLibrary metadata. Not Federal Register raw_text. Not people files. Not FinCEN /fincen-orders. Not NCUA /ncua-orders. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl.",
    resourcePath: FERC_ORDERS_PATH,
  },
  "ofac-orders": {
    description:
      "Call GET /ofac-orders when you need official OFAC institution/company enforcement-release text extracted from per-release PDFs on ofac.treasury.gov. Not the civil-penalties chart/teaser/RSS. Not people. Not Federal Register raw_text. Not FinCEN /fincen-orders. Not FERC /ferc-orders. Not NCUA /ncua-orders. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl. Not BIS /bis-orders.",
    resourcePath: OFAC_ORDERS_PATH,
  },
  "bis-orders": {
    description:
      "Call GET /bis-orders when you need official BIS institution/company charging-letter / order / settlement text extracted from per-order PDFs on bis.gov. Not the press/teaser. Not people. Not Federal Register raw_text. Not OFAC /ofac-orders. Not FERC /ferc-orders. Not FinCEN /fincen-orders. Not NCUA /ncua-orders. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl. Not CFTC /cftc-orders. Not FIFRA /fifra-orders.",
    resourcePath: BIS_ORDERS_PATH,
  },
  "cftc-orders": {
    description:
      "Call GET /cftc-orders when you need official CFTC institution/company enforcement-order / settlement text extracted from per-order PDFs on cftc.gov. Not the press/teaser. Not people. Not Federal Register raw_text. Not BIS /bis-orders. Not OFAC /ofac-orders. Not FERC /ferc-orders. Not FinCEN /fincen-orders. Not NCUA /ncua-orders. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl. Not FIFRA /fifra-orders.",
    resourcePath: CFTC_ORDERS_PATH,
  },
  "fifra-orders": {
    description:
      "Call GET /fifra-orders when you need official EPA FIFRA institution/company order / consent text extracted from per-order PDFs on yosemite.epa.gov. Not the press/teaser. Not people. Not Federal Register raw_text. Not CFTC /cftc-orders. Not BIS /bis-orders. Not OFAC /ofac-orders. Not FERC /ferc-orders. Not FinCEN /fincen-orders. Not NCUA /ncua-orders. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl. Not De Novo /denovo-orders.",
    resourcePath: FIFRA_ORDERS_PATH,
  },
  "denovo-orders": {
    description:
      "Call GET /denovo-orders when you need official FDA De Novo institution/company classification-order text extracted from per-order PDFs on accessdata.fda.gov. Not the press/teaser. Not people. Not Federal Register raw_text. Not FIFRA /fifra-orders. Not CFTC /cftc-orders. Not BIS /bis-orders. Not OFAC /ofac-orders. Not FERC /ferc-orders. Not FinCEN /fincen-orders. Not NCUA /ncua-orders. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl. Not TTB /ttb-oic.",
    resourcePath: DENOVO_ORDERS_PATH,
  },
  "ttb-oic": {
    description:
      "Call GET /ttb-oic when you need official TTB institution/company Offer in Compromise text extracted from Abstract and Statement PDFs on ttb.gov. Not the press/teaser. Not people. Not Federal Register raw_text. Not De Novo /denovo-orders. Not FIFRA /fifra-orders. Not CFTC /cftc-orders. Not BIS /bis-orders. Not OFAC /ofac-orders. Not FERC /ferc-orders. Not FinCEN /fincen-orders. Not NCUA /ncua-orders. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl. Not AIR /air-letters. Not ICO /ico-mpn.",
    resourcePath: TTB_OIC_PATH,
  },
  "air-letters": {
    description:
      "Call GET /air-letters when you need official USDA APHIS institution/company Am I Regulated (AIR) confirmation-letter text extracted from per-letter PDFs on direct.aphis.usda.gov. Not the press/teaser. Not people. Not Federal Register raw_text. Not TTB /ttb-oic. Not De Novo /denovo-orders. Not FIFRA /fifra-orders. Not CFTC /cftc-orders. Not BIS /bis-orders. Not OFAC /ofac-orders. Not FERC /ferc-orders. Not FinCEN /fincen-orders. Not NCUA /ncua-orders. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl. Not Superfund /superfund-rods. Not ICO /ico-mpn.",
    resourcePath: AIR_LETTERS_PATH,
  },
  "superfund-rods": {
    description:
      "Call GET /superfund-rods when you need official EPA Superfund institution/site Record of Decision text extracted from SEMS PDFs on semspub.epa.gov. Not a Proposed Plan or fact sheet. Not people. Not Federal Register raw_text. Not AIR /air-letters. Not TTB /ttb-oic. Not De Novo /denovo-orders. Not FIFRA /fifra-orders. Not CFTC /cftc-orders. Not BIS /bis-orders. Not ICO /ico-mpn.",
    resourcePath: SUPERFUND_RODS_PATH,
  },
  "ico-mpn": {
    description:
      "Call GET /ico-mpn when you need official UK ICO institution/company Monetary Penalty Notice text extracted from per-notice PDFs on ico.org.uk. Not the press/teaser. Not people. Not Federal Register raw_text. Not Superfund /superfund-rods. Not AIR /air-letters. Not TTB /ttb-oic. Not De Novo /denovo-orders. Not FIFRA /fifra-orders. Not CFTC /cftc-orders.",
    resourcePath: ICO_MPN_PATH,
  },
  "phmsa-cop": {
    description:
      "Call GET /phmsa-cop when you need official PHMSA Office of Pipeline Safety institution/company Consent Order / Consent Agreement / Final Order / Corrective Action Order / Safety Order text extracted from primis.phmsa.dot.gov/enforcement-documents/ PDFs. Not people. Not the case-card teaser. Not PHMSA 27nc-rsge incident NARRATIVE. Not Raw Data.txt / page-data.json. Not ICO /ico-mpn. 17 U.S.C. § 105. Prep only — do not list until /ico-mpn is live.",
    resourcePath: PHMSA_COP_PATH,
  },
  "acm-besluiten": {
    description:
      "Call GET /acm-besluiten when you need official Netherlands ACM institution/company boetebesluit / besluit TEXT extracted with pdftotext from acm.nl/system/files/documents/ PDFs. Not people. Not the publication-page press teaser. Not jsonapi. Not data.overheid.nl. Not ICO /ico-mpn. Not PHMSA /phmsa-cop. Dutch government publication. Prep only — do not list.",
    resourcePath: ACM_BESLUITEN_PATH,
  },
  "ccpc-mergers": {
    description:
      "Call GET /ccpc-mergers when you need official Ireland CCPC institution/company section 21 determination TEXT extracted with pdftotext from assets.ccpc.ie/data/docs/default-source/merger-attachments/ PDFs. Not people. Not the case-card grid. Not merger-announcement PDFs. Not withdrawn-no-determination. Not Sitefinity OData. Not Cludo. Not data.gov.ie. Not ICO /ico-mpn. Not PHMSA /phmsa-cop. Not ACM /acm-besluiten. CC-BY 4.0. Prep only — do not list.",
    resourcePath: CCPC_MERGERS_PATH,
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
  swisspar: {
    ok: true,
    product: "swisspar-first-auth",
    status: "ok",
    cards: [
      {
        name: "Rhapsido",
        inn: "remibrutinib",
        ma: "70227",
        date: "2026-08-18",
        sourceUrl:
          "https://www.swissmedic.ch/dam/swissmedic/en/dokumente/zulassung/swisspar/70227-rhapsido-01-swisspar-20280818.pdf.download.pdf/SwissPAR_inkl.%20FI_Rhapsido.pdf",
        body: "Swiss Public Assessment Report\nRhapsido\nInternational non-proprietary name: remibrutinib\nMarketing authorisation no.: 70227",
      },
    ],
  },
  pcac: {
    ok: true,
    product: "fda-pcac-503a-memos",
    status: "ok",
    cards: [
      {
        substance: "Emideltide",
        date: "2026-05-11",
        meeting: "July 23-24, 2026",
        mediaId: "193344",
        sourceUrl: "https://www.fda.gov/media/193344/download",
        body: "FDA Briefing Document\nPharmacy Compounding Advisory Committee (PCAC) Meeting\nJuly 23 -24, 2026\nFDA Evaluation of Emideltide-Related Bulk Drug Substances",
      },
    ],
  },
  "ftc-wl": {
    ok: true,
    product: "ftc-bcp-warning-letter-bodies",
    status: "ok",
    cards: [
      {
        id: "vtron-inc-dba-vtron-lasers",
        firm: "Vtron Inc. d/b/a Vtron Lasers",
        date: "2026-07-06",
        subject: "Warning Letter Regarding “Made in the USA” Representations",
        sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
        body: "Bureau of Consumer Protection\nJuly 6, 2026\nVtron Inc. d/b/a Vtron Lasers\nRe: Warning Letter Regarding “Made in the USA” Representations",
      },
    ],
  },
  "cfpb-orders": {
    ok: true,
    product: "cfpb-consent-order-bodies",
    status: "ok",
    cards: [
      {
        id: "american-honda-finance-corporation-2025",
        firm: "American Honda Finance Corporation",
        date: "2025-01-17",
        fileNo: "2025-CFPB-0003",
        sourceUrl:
          "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
        body: "UNITED STATES OF AMERICA\nCONSUMER FINANCIAL PROTECTION BUREAU\nADMINISTRATIVE PROCEEDING File No. 2025-CFPB-0003\nCONSENT ORDER\nAmerican Honda Finance Corp.",
      },
    ],
  },
  "occ-cd": {
    ok: true,
    product: "occ-institution-cd-bodies",
    status: "ok",
    cards: [
      {
        id: "AA-ENF-2026-29",
        bank: "United Texas Bank, National Association",
        docket: "AA-ENF-2026-29",
        date: "2026-06-16",
        sourceUrl: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
        body: "UNITED STATES OF AMERICA\nDEPARTMENT OF THE TREASURY\nOFFICE OF THE COMPTROLLER OF THE CURRENCY\nAA-ENF-2026-29\nCONSENT ORDER\nUnited Texas Bank, N.A.\nDallas, Texas",
      },
    ],
  },
  "fdic-orders": {
    ok: true,
    product: "fdic-institution-order-bodies",
    status: "ok",
    cards: [
      {
        id: "FDIC-26-0001b",
        bank: "MutualOne Bank",
        docket: "FDIC-26-0001b",
        date: "2026-01-13",
        sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
        body: "FEDERAL DEPOSIT INSURANCE CORPORATION\nWASHINGTON, D.C.\nCONSENT ORDER FDIC-26-0001b\nMUTUALONE BANK\nFramingham, Massachusetts",
      },
    ],
  },
  "frb-orders": {
    ok: true,
    product: "frb-institution-order-bodies",
    status: "ok",
    cards: [
      {
        id: "26-019-B-HC",
        institution: "Community Bankshares, Inc.",
        docket: "26-019-B-HC",
        date: "2026-04-14",
        sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf",
        body: "BOARD OF GOVERNORS OF THE FEDERAL RESERVE SYSTEM\nDocket No. 26-019-B-HC\nCOMMUNITY BANKSHARES, INC.\nOrder to Cease and Desist",
      },
    ],
  },
  "ncua-orders": {
    ok: true,
    product: "ncua-institution-order-bodies",
    status: "ok",
    cards: [
      {
        id: "21-0105-ER",
        creditUnion: "Live Life Federal Credit Union",
        docket: "21-0105-ER",
        date: "2021-02-22",
        sourceUrl:
          "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
        body: "NATIONAL CREDIT UNION ADMINISTRATION\nDocket No. 21-0105-ER\nLIVE LIFE FEDERAL CREDIT UNION\nStipulation and Consent to Cease and Desist Order",
      },
    ],
  },
  "fincen-orders": {
    ok: true,
    product: "fincen-institution-order-bodies",
    status: "ok",
    cards: [
      {
        id: "2026-02",
        institution: "UBS Financial Services Inc.",
        docket: "2026-02",
        date: "2026-08-03",
        sourceUrl: "https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf",
        body: "UNITED STATES OF AMERICA\nFINANCIAL CRIMES ENFORCEMENT NETWORK\nIN THE MATTER OF:\nUBS Financial Services Inc.\nNumber 2026-02\nCONSENT ORDER",
      },
    ],
  },
  "ferc-orders": {
    ok: true,
    product: "ferc-institution-order-bodies",
    status: "ok",
    cards: [
      {
        id: "IN25-6-000",
        institution: "Interstate Power and Light Company",
        docket: "IN25-6-000",
        date: "2026-04-17",
        sourceUrl:
          "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
        body: "UNITED STATES OF AMERICA\nFEDERAL ENERGY REGULATORY COMMISSION\nInterstate Power and Light Company\nDocket No. IN25-6-000\nORDER APPROVING STIPULATION AND CONSENT AGREEMENT",
      },
    ],
  },
  "ofac-orders": {
    ok: true,
    product: "ofac-institution-order-bodies",
    status: "ok",
    cards: [
      {
        id: "936706",
        institution: "Rice Lake Weighing Systems, Inc.",
        docket: "936706",
        date: "2026-08-12",
        sourceUrl: "https://ofac.treasury.gov/media/936706/download",
        body: "DEPARTMENT OF THE TREASURY\nOFFICE OF FOREIGN ASSETS CONTROL\nEnforcement Release: August 12, 2026\nRice Lake Weighing Systems Settles with OFAC",
      },
    ],
  },
  "bis-orders": {
    ok: true,
    product: "bis-institution-order-bodies",
    status: "ok",
    cards: [
      {
        id: "E3050",
        institution: "Coastal PVA Technology, Inc.",
        docket: "E3050",
        date: "2026-04-13",
        sourceUrl: "https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
        body: "UNITED STATES DEPARTMENT OF COMMERCE\nBureau of Industry and Security\nPROPOSED CHARGING LETTER\nCoastal PVA Technology, Inc.",
      },
    ],
  },
  "cftc-orders": {
    ok: true,
    product: "cftc-institution-order-bodies",
    status: "ok",
    cards: [
      {
        id: "26-04",
        institution: "UBS Financial Services Inc.",
        docket: "26-04",
        date: "2026-07-31",
        sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
        body: "UNITED STATES OF AMERICA\nBefore the\nCOMMODITY FUTURES TRADING COMMISSION\nUBS Financial Services Inc.\nCFTC Docket No. 26-04\nORDER INSTITUTING PROCEEDINGS",
      },
    ],
  },
  "fifra-orders": {
    ok: true,
    product: "fifra-institution-order-bodies",
    status: "ok",
    cards: [
      {
        id: "FIFRA-05-2026-0015",
        institution: "Travel Caddy, Inc. dba Travelon",
        docket: "FIFRA-05-2026-0015",
        date: "2026-07-29",
        sourceUrl: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/FIFRA-05-2026-0015_CAFO_TravelCaddyIncdbaTravelon_FranklinParkIllinois_14PGS.pdf",
        body: "UNITED STATES ENVIRONMENTAL PROTECTION AGENCY\nConsent Agreement and Final Order\nTravel Caddy, Inc. dba Travelon\nFIFRA-05-2026-0015",
      },
    ],
  },
  "denovo-orders": {
    ok: true,
    product: "fda-denovo-classification-order-bodies",
    status: "ok",
    cards: [
      {
        id: "DEN250042",
        institution: "Caristo Diagnostics Ltd.",
        docket: "DEN250042",
        date: "2026-07-28",
        sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf",
        body: "Food and Drug Administration\nCenter for Devices and Radiological Health\nRe: DEN250042\nTrade/Device Name: CaRi-Heart\nThis order, therefore, classifies the CaRi-Heart",
      },
    ],
  },
  "ttb-oic": {
    ok: true,
    product: "ttb-institution-oic-bodies",
    status: "ok",
    cards: [
      {
        id: "21st-amendment",
        institution: "The 21st Amendment Brewery Cafe, LLC",
        docket: "21st-amendment",
        date: "2026-06-30",
        sourceUrl: "https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
        body: "DEPARTMENT OF THE TREASURY\nALCOHOL AND TOBACCO TAX AND TRADE BUREAU\nABSTRACT AND STATEMENT\nThe 21st Amendment Brewery Cafe, LLC\nOffer-in-Compromise",
      },
    ],
  },
  "air-letters": {
    ok: true,
    product: "aphis-air-confirmation-letter-bodies",
    status: "ok",
    cards: [
      {
        id: "26-173-01air",
        institution: "KAGOME Co., LTD.",
        docket: "26-173-01air",
        date: "2026-06-22",
        sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf",
        body: "United States Department of Agriculture\nAnimal and Plant Health Inspection Service\nBiotechnology Regulatory Services\nRe: Confirmation of the regulatory status\n26-173-01air\n7 CFR part 340",
      },
    ],
  },
  "superfund-rods": {
    ok: true,
    product: "epa-superfund-rod-bodies",
    status: "ok",
    cards: [
      {
        id: "05-711427",
        institution: "Federated Metals Corp. Whiting Superfund Site",
        docket: "05-711427",
        date: "2026-08-05",
        sourceUrl: "https://semspub.epa.gov/work/05/711427.pdf",
        body: "United States Environmental Protection Agency\nINTERIM RECORD OF DECISION\nFederated Metals Corp. Whiting Superfund Site\nOperable Unit 1\nDECLARATION\nCERCLA",
      },
    ],
  },
  "ico-mpn": {
    ok: true,
    product: "ico-institution-mpn-bodies",
    status: "ok",
    cards: [
      {
        id: "reddit-mpn-20260223",
        institution: "Reddit, Inc.",
        docket: "reddit-mpn-20260223",
        date: "2026-02-23",
        sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
        body: "PENALTY NOTICE\nREDDIT, INC.\nDATA PROTECTION ACT 2018 (PART 6, SECTION 155)\nENFORCEMENT POWERS OF THE INFORMATION COMMISSIONER",
      },
    ],
  },
  "phmsa-cop": {
    ok: true,
    product: "phmsa-ops-consent-order-bodies",
    status: "ok",
    cards: [
      {
        id: "eqt-1-2025-033-nopv",
        institution: "EQT Production Company",
        docket: "eqt-1-2025-033-nopv",
        date: "2026-04-21",
        sourceUrl:
          "https://primis.phmsa.dot.gov/enforcement-documents/12025033NOPV/12025033NOPV_Consent%20Agreement%20and%20Order_04212026_(22-259271).pdf",
        body: "Pipeline and Hazardous Materials Safety Administration\nCONSENT ORDER\nEQT Production Company\nCPF 1-2025-033-NOPV",
      },
    ],
  },
  "acm-besluiten": {
    ok: true,
    product: "acm-institution-besluit-bodies",
    status: "ok",
    cards: [
      {
        id: "house-of-tickets-201019",
        institution: "House of Tickets B.V. / Ticketveiling B.V.",
        zaak: "ACM/26/201019",
        date: "2026-05-22",
        sourceUrl: "https://www.acm.nl/system/files/documents/boetebesluit-house-of-tickets.pdf",
        body: "Autoriteit Consument en Markt\nBesluit\nHouse of Tickets B.V.\nZaaknummer ACM/26/201019",
      },
    ],
  },
  "ccpc-mergers": {
    ok: true,
    product: "ccpc-institution-merger-determination-bodies",
    status: "ok",
    cards: [
      {
        id: "united-hardware-m26006",
        institution: "United Hardware DAC / Ardentia / Kehoe’s Homevalue t/a Dermot Kehoe Supply & DIY",
        mNumber: "M/26/006",
        date: "2026-03-06",
        sourceUrl:
          "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/united-hardware-dermot-kehoe-supply---diy/m-26-006-determination.pdf",
        body: "Competition and Consumer Protection Commission\nDETERMINATION OF MERGER NOTIFICATION M/26/006\nSection 21 of the Competition Act 2002",
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
    "- GET /swisspar — $0.05 — Swissmedic first-authorisation SwissPAR evaluation text (official per-product PDFs)",
    "- GET /pcac — $0.05 — FDA PCAC 503A briefing-memo evaluation text (official per-substance PDFs)",
    "- GET /ftc-wl — $0.05 — FTC BCP warning-letter text (official per-letter PDFs)",
    "- GET /cfpb-orders — $0.05 — CFPB consent-order / administrative-order text (official per-order PDFs)",
    "- GET /occ-cd — $0.05 — OCC institution C&D / consent-order text (official per-order PDFs)",
    "- GET /fdic-orders — $0.05 — FDIC institution consent-order / C&D text (official per-order PDFs)",
    "- GET /frb-orders — $0.05 — FRB institution C&D / written-agreement / PCA text (official per-order PDFs)",
    "- GET /ncua-orders — $0.05 — NCUA institution consent C&D text (official per-order HTML)",
    "- GET /fincen-orders — $0.05 — FinCEN institution consent-order text (official per-order PDFs)",
    "- GET /ferc-orders — $0.05 — FERC institution stipulation-and-consent text (official cms.ferc.gov PDFs)",
    "- GET /ofac-orders — $0.05 — OFAC institution enforcement-release text (official ofac.treasury.gov PDFs)",
    "- GET /bis-orders — $0.05 — BIS institution charging-letter / order text (official bis.gov PDFs)",
    "- GET /cftc-orders — $0.05 — CFTC institution enforcement-order / settlement text (official cftc.gov PDFs)",
    "- GET /fifra-orders — $0.05 — EPA FIFRA institution order / consent text (official yosemite.epa.gov PDFs)",
    "- GET /denovo-orders — $0.05 — FDA De Novo classification-order text (official accessdata.fda.gov PDFs)",
    "- GET /ttb-oic — $0.05 — TTB Offer in Compromise text (official ttb.gov PDFs)",
    "- GET /air-letters — $0.05 — USDA APHIS AIR confirmation-letter text (official direct.aphis.usda.gov PDFs)",
    "- GET /superfund-rods — $0.05 — EPA Superfund Record of Decision text (official semspub.epa.gov PDFs)",
    "- GET /ico-mpn — $0.05 — ICO Monetary Penalty Notice text (official ico.org.uk PDFs)",
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
    "- GET /swisspar/manifest.json — SwissPAR count + name/date/MA/sourceUrl (not the evaluation text)",
    "- GET /pcac/manifest.json — FDA PCAC count + substance/date/meeting/mediaId/sourceUrl (not the evaluation text)",
    "- GET /ftc-wl/manifest.json — FTC BCP count + firm/date/subject/sourceUrl (not the letter body)",
    "- GET /cfpb-orders/manifest.json — CFPB order count + firm/date/title/fileNo/sourceUrl (not the order body)",
    "- GET /occ-cd/manifest.json — OCC C&D count + bank/docket/date/sourceUrl (not the order body)",
    "- GET /fdic-orders/manifest.json — FDIC order count + bank/docket/date/sourceUrl (not the order body)",
    "- GET /frb-orders/manifest.json — FRB order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /ncua-orders/manifest.json — NCUA order count + credit union/docket/date/sourceUrl (not the order body)",
    "- GET /fincen-orders/manifest.json — FinCEN order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /ferc-orders/manifest.json — FERC order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /ofac-orders/manifest.json — OFAC order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /bis-orders/manifest.json — BIS order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /cftc-orders/manifest.json — CFTC order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /fifra-orders/manifest.json — EPA FIFRA order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /denovo-orders/manifest.json — FDA De Novo order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /ttb-oic/manifest.json — TTB OIC count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /air-letters/manifest.json — APHIS AIR letter count + institution/docket/date/sourceUrl (not the letter body)",
    "- GET /superfund-rods/manifest.json — EPA Superfund ROD count + institution/docket/date/sourceUrl (not the ROD body)",
    "- GET /ico-mpn/manifest.json — ICO MPN count + institution/docket/date/sourceUrl (not the MPN body)",
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
  const paths = [TICKS_PATH, IMPORT_ALERTS_PATH, MARINERS_PATH, MARINERS_D11_PATH, MARINERS_D7_PATH, MARINERS_D8_PATH, WARNING_LETTERS_PATH, UNTITLED_LETTERS_PATH, AWA_PATH, SWISSPAR_PATH, PCAC_PATH, FTC_WL_PATH, CFPB_ORDERS_PATH, OCC_CD_PATH, FDIC_ORDERS_PATH, FRB_ORDERS_PATH, NCUA_ORDERS_PATH, FINCEN_ORDERS_PATH, FERC_ORDERS_PATH, OFAC_ORDERS_PATH, BIS_ORDERS_PATH, CFTC_ORDERS_PATH, FIFRA_ORDERS_PATH, DENOVO_ORDERS_PATH, TTB_OIC_PATH, AIR_LETTERS_PATH, SUPERFUND_RODS_PATH, ICO_MPN_PATH];
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
  const swissparAtomic = amountAtomicFor("swisspar");
  const pcacAtomic = amountAtomicFor("pcac");
  const ftcWlAtomic = amountAtomicFor("ftc-wl");
  const cfpbOrdersAtomic = amountAtomicFor("cfpb-orders");
  const occCdAtomic = amountAtomicFor("occ-cd");
  const fdicOrdersAtomic = amountAtomicFor("fdic-orders");
  const frbOrdersAtomic = amountAtomicFor("frb-orders");
  const ncuaOrdersAtomic = amountAtomicFor("ncua-orders");
  const fincenOrdersAtomic = amountAtomicFor("fincen-orders");
  const fercOrdersAtomic = amountAtomicFor("ferc-orders");
  const ofacOrdersAtomic = amountAtomicFor("ofac-orders");
  const bisOrdersAtomic = amountAtomicFor("bis-orders");
  const cftcOrdersAtomic = amountAtomicFor("cftc-orders");
  const fifraOrdersAtomic = amountAtomicFor("fifra-orders");
  const denovoOrdersAtomic = amountAtomicFor("denovo-orders");
  const ttbOicAtomic = amountAtomicFor("ttb-oic");
  const airLettersAtomic = amountAtomicFor("air-letters");
  const superfundRodsAtomic = amountAtomicFor("superfund-rods");
  const icoMpnAtomic = amountAtomicFor("ico-mpn");
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
  const swissparPrice = (Number(swissparAtomic) / 1e6).toFixed(2);
  const pcacPrice = (Number(pcacAtomic) / 1e6).toFixed(2);
  const ftcWlPrice = (Number(ftcWlAtomic) / 1e6).toFixed(2);
  const cfpbOrdersPrice = (Number(cfpbOrdersAtomic) / 1e6).toFixed(2);
  const occCdPrice = (Number(occCdAtomic) / 1e6).toFixed(2);
  const fdicOrdersPrice = (Number(fdicOrdersAtomic) / 1e6).toFixed(2);
  const frbOrdersPrice = (Number(frbOrdersAtomic) / 1e6).toFixed(2);
  const ncuaOrdersPrice = (Number(ncuaOrdersAtomic) / 1e6).toFixed(2);
  const fincenOrdersPrice = (Number(fincenOrdersAtomic) / 1e6).toFixed(2);
  const fercOrdersPrice = (Number(fercOrdersAtomic) / 1e6).toFixed(2);
  const ofacOrdersPrice = (Number(ofacOrdersAtomic) / 1e6).toFixed(2);
  const bisOrdersPrice = (Number(bisOrdersAtomic) / 1e6).toFixed(2);
  const cftcOrdersPrice = (Number(cftcOrdersAtomic) / 1e6).toFixed(2);
  const fifraOrdersPrice = (Number(fifraOrdersAtomic) / 1e6).toFixed(2);
  const denovoOrdersPrice = (Number(denovoOrdersAtomic) / 1e6).toFixed(2);
  const ttbOicPrice = (Number(ttbOicAtomic) / 1e6).toFixed(2);
  const airLettersPrice = (Number(airLettersAtomic) / 1e6).toFixed(2);
  const superfundRodsPrice = (Number(superfundRodsAtomic) / 1e6).toFixed(2);
  const icoMpnPrice = (Number(icoMpnAtomic) / 1e6).toFixed(2);
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
    "/swisspar ($0.05)",
    "/pcac ($0.05)",
    "/ftc-wl ($0.05)",
    "/cfpb-orders ($0.05)",
    "/occ-cd ($0.05)",
    "/fdic-orders ($0.05)",
    "/frb-orders ($0.05)",
    "/ncua-orders ($0.05)",
    "/fincen-orders ($0.05)",
    "/ferc-orders ($0.05)",
    "/ofac-orders ($0.05)",
    "/bis-orders ($0.05)",
    "/cftc-orders ($0.05)",
    "/fifra-orders ($0.05)",
    "/denovo-orders ($0.05)",
    "/ttb-oic ($0.05)",
    "/air-letters ($0.05)",
    "/superfund-rods ($0.05)",
    "/ico-mpn ($0.05)",
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
      [SWISSPAR_PATH]: {
        get: paidOpenApiOp({
          operationId: "getSwisspar",
          summary: "Swissmedic first-authorisation SwissPAR evaluation text",
          description: SKU_COPY.swisspar.description,
          priceUsdc: swissparPrice,
          amountAtomic: swissparAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE.swisspar,
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
      [PCAC_PATH]: {
        get: paidOpenApiOp({
          operationId: "getPcac",
          summary: "FDA PCAC 503A briefing-memo evaluation text",
          description: SKU_COPY.pcac.description,
          priceUsdc: pcacPrice,
          amountAtomic: pcacAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE.pcac,
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
      [FTC_WL_PATH]: {
        get: paidOpenApiOp({
          operationId: "getFtcWl",
          summary: "FTC BCP warning-letter text",
          description: SKU_COPY["ftc-wl"].description,
          priceUsdc: ftcWlPrice,
          amountAtomic: ftcWlAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ftc-wl"],
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
      [CFPB_ORDERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getCfpbOrders",
          summary: "CFPB consent-order / administrative-order text",
          description: SKU_COPY["cfpb-orders"].description,
          priceUsdc: cfpbOrdersPrice,
          amountAtomic: cfpbOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["cfpb-orders"],
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
      [OCC_CD_PATH]: {
        get: paidOpenApiOp({
          operationId: "getOccCd",
          summary: "OCC institution C&D / consent-order text",
          description: SKU_COPY["occ-cd"].description,
          priceUsdc: occCdPrice,
          amountAtomic: occCdAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["occ-cd"],
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
      [FDIC_ORDERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getFdicOrders",
          summary: "FDIC institution consent-order / C&D text",
          description: SKU_COPY["fdic-orders"].description,
          priceUsdc: fdicOrdersPrice,
          amountAtomic: fdicOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["fdic-orders"],
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
      [FRB_ORDERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getFrbOrders",
          summary: "FRB institution C&D / written-agreement / PCA text",
          description: SKU_COPY["frb-orders"].description,
          priceUsdc: frbOrdersPrice,
          amountAtomic: frbOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["frb-orders"],
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
      [NCUA_ORDERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getNcuaOrders",
          summary: "NCUA institution consent C&D text",
          description: SKU_COPY["ncua-orders"].description,
          priceUsdc: ncuaOrdersPrice,
          amountAtomic: ncuaOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ncua-orders"],
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
      [FINCEN_ORDERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getFincenOrders",
          summary: "FinCEN institution consent-order text",
          description: SKU_COPY["fincen-orders"].description,
          priceUsdc: fincenOrdersPrice,
          amountAtomic: fincenOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["fincen-orders"],
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
      [FERC_ORDERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getFercOrders",
          summary: "FERC institution stipulation-and-consent text",
          description: SKU_COPY["ferc-orders"].description,
          priceUsdc: fercOrdersPrice,
          amountAtomic: fercOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ferc-orders"],
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
      [OFAC_ORDERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getOfacOrders",
          summary: "OFAC institution enforcement-release text",
          description: SKU_COPY["ofac-orders"].description,
          priceUsdc: ofacOrdersPrice,
          amountAtomic: ofacOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ofac-orders"],
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
      [BIS_ORDERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getBisOrders",
          summary: "BIS institution charging-letter / order text",
          description: SKU_COPY["bis-orders"].description,
          priceUsdc: bisOrdersPrice,
          amountAtomic: bisOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["bis-orders"],
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
      [CFTC_ORDERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getCftcOrders",
          summary: "CFTC institution enforcement-order / settlement text",
          description: SKU_COPY["cftc-orders"].description,
          priceUsdc: cftcOrdersPrice,
          amountAtomic: cftcOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["cftc-orders"],
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
      [FIFRA_ORDERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getFifraOrders",
          summary: "EPA FIFRA institution order / consent text",
          description: SKU_COPY["fifra-orders"].description,
          priceUsdc: fifraOrdersPrice,
          amountAtomic: fifraOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["fifra-orders"],
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
      [DENOVO_ORDERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getDenovoOrders",
          summary: "FDA De Novo classification-order text",
          description: SKU_COPY["denovo-orders"].description,
          priceUsdc: denovoOrdersPrice,
          amountAtomic: denovoOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["denovo-orders"],
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
      [TTB_OIC_PATH]: {
        get: paidOpenApiOp({
          operationId: "getTtbOic",
          summary: "TTB institution Offer in Compromise text",
          description: SKU_COPY["ttb-oic"].description,
          priceUsdc: ttbOicPrice,
          amountAtomic: ttbOicAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ttb-oic"],
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
      [AIR_LETTERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getAirLetters",
          summary: "USDA APHIS AIR confirmation-letter text",
          description: SKU_COPY["air-letters"].description,
          priceUsdc: airLettersPrice,
          amountAtomic: airLettersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["air-letters"],
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
      [SUPERFUND_RODS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getSuperfundRods",
          summary: "EPA Superfund Record of Decision text",
          description: SKU_COPY["superfund-rods"].description,
          priceUsdc: superfundRodsPrice,
          amountAtomic: superfundRodsAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["superfund-rods"],
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
      [ICO_MPN_PATH]: {
        get: paidOpenApiOp({
          operationId: "getIcoMpn",
          summary: "ICO Monetary Penalty Notice text",
          description: SKU_COPY["ico-mpn"].description,
          priceUsdc: icoMpnPrice,
          amountAtomic: icoMpnAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ico-mpn"],
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
      [SWISSPAR_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "SwissPAR free manifest",
          "Count, name, date, MA, and official source URL. Not the evaluation text.",
        ),
      },
      [PCAC_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA PCAC free manifest",
          "Count, substance, date, meeting, mediaId, and official source URL. Not the evaluation text.",
        ),
      },
      [FTC_WL_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FTC BCP warning-letters free manifest",
          "Count, firm, date, subject, and official PDF URL. Not the letter body.",
        ),
      },
      [CFPB_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "CFPB consent-orders free manifest",
          "Count, firm, date, title, fileNo, and official PDF URL. Not the order body.",
        ),
      },
      [OCC_CD_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "OCC institution C&D free manifest",
          "Count, bank, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [FDIC_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDIC institution orders free manifest",
          "Count, bank, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [FRB_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FRB institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [NCUA_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "NCUA institution orders free manifest",
          "Count, credit union, docket, date, and official HTML URL. Not the order body.",
        ),
      },
      [FINCEN_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FinCEN institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [FERC_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FERC institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [OFAC_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "OFAC institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [BIS_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "BIS institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [CFTC_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "CFTC institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [FIFRA_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "EPA FIFRA institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [DENOVO_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA De Novo classification orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [TTB_OIC_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "TTB Offer in Compromise free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [AIR_LETTERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "APHIS AIR confirmation letters free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the letter body.",
        ),
      },
      [SUPERFUND_RODS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "EPA Superfund Records of Decision free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the ROD body.",
        ),
      },
      [ICO_MPN_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "ICO Monetary Penalty Notices free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the MPN body.",
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
        {
          path: SWISSPAR_PATH,
          product: "swisspar-first-auth",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("swisspar"),
          manifest: SWISSPAR_MANIFEST_PATH,
        },
        {
          path: PCAC_PATH,
          product: "fda-pcac-503a-memos",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("pcac"),
          manifest: PCAC_MANIFEST_PATH,
        },
        {
          path: FTC_WL_PATH,
          product: "ftc-bcp-warning-letter-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ftc-wl"),
          manifest: FTC_WL_MANIFEST_PATH,
        },
        {
          path: CFPB_ORDERS_PATH,
          product: "cfpb-consent-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("cfpb-orders"),
          manifest: CFPB_ORDERS_MANIFEST_PATH,
        },
        {
          path: OCC_CD_PATH,
          product: "occ-institution-cd-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("occ-cd"),
          manifest: OCC_CD_MANIFEST_PATH,
        },
        {
          path: FDIC_ORDERS_PATH,
          product: "fdic-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("fdic-orders"),
          manifest: FDIC_ORDERS_MANIFEST_PATH,
        },
        {
          path: FRB_ORDERS_PATH,
          product: "frb-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("frb-orders"),
          manifest: FRB_ORDERS_MANIFEST_PATH,
        },
        {
          path: NCUA_ORDERS_PATH,
          product: "ncua-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ncua-orders"),
          manifest: NCUA_ORDERS_MANIFEST_PATH,
        },
        {
          path: FINCEN_ORDERS_PATH,
          product: "fincen-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("fincen-orders"),
          manifest: FINCEN_ORDERS_MANIFEST_PATH,
        },
        {
          path: FERC_ORDERS_PATH,
          product: "ferc-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ferc-orders"),
          manifest: FERC_ORDERS_MANIFEST_PATH,
        },
        {
          path: OFAC_ORDERS_PATH,
          product: "ofac-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ofac-orders"),
          manifest: OFAC_ORDERS_MANIFEST_PATH,
        },
        {
          path: BIS_ORDERS_PATH,
          product: "bis-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("bis-orders"),
          manifest: BIS_ORDERS_MANIFEST_PATH,
        },
        {
          path: CFTC_ORDERS_PATH,
          product: "cftc-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("cftc-orders"),
          manifest: CFTC_ORDERS_MANIFEST_PATH,
        },
        {
          path: FIFRA_ORDERS_PATH,
          product: "fifra-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("fifra-orders"),
          manifest: FIFRA_ORDERS_MANIFEST_PATH,
        },
        {
          path: DENOVO_ORDERS_PATH,
          product: "fda-denovo-classification-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("denovo-orders"),
          manifest: DENOVO_ORDERS_MANIFEST_PATH,
        },
        {
          path: TTB_OIC_PATH,
          product: "ttb-institution-oic-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ttb-oic"),
          manifest: TTB_OIC_MANIFEST_PATH,
        },
        {
          path: AIR_LETTERS_PATH,
          product: "aphis-air-confirmation-letter-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("air-letters"),
          manifest: AIR_LETTERS_MANIFEST_PATH,
        },
        {
          path: SUPERFUND_RODS_PATH,
          product: "epa-superfund-rod-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("superfund-rods"),
          manifest: SUPERFUND_RODS_MANIFEST_PATH,
        },
        {
          path: ICO_MPN_PATH,
          product: "ico-institution-mpn-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ico-mpn"),
          manifest: ICO_MPN_MANIFEST_PATH,
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

  if (path === SWISSPAR_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadSwissparManifest(), req, port));
    return;
  }

  if (path === SWISSPAR_PATH) {
    await servePaid(req, res, port, "swisspar", () => loadSwisspar());
    return;
  }

  if (path === PCAC_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadPcacManifest(), req, port));
    return;
  }

  if (path === PCAC_PATH) {
    await servePaid(req, res, port, "pcac", () => loadPcac());
    return;
  }

  if (path === FTC_WL_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadFtcWlManifest(), req, port));
    return;
  }

  if (path === FTC_WL_PATH) {
    await servePaid(req, res, port, "ftc-wl", () => loadFtcWl());
    return;
  }

  if (path === CFPB_ORDERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadCfpbOrdersManifest(), req, port));
    return;
  }

  if (path === CFPB_ORDERS_PATH) {
    await servePaid(req, res, port, "cfpb-orders", () => loadCfpbOrders());
    return;
  }

  if (path === OCC_CD_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadOccCdManifest(), req, port));
    return;
  }

  if (path === OCC_CD_PATH) {
    await servePaid(req, res, port, "occ-cd", () => loadOccCd());
    return;
  }

  if (path === FDIC_ORDERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadFdicOrdersManifest(), req, port));
    return;
  }

  if (path === FDIC_ORDERS_PATH) {
    await servePaid(req, res, port, "fdic-orders", () => loadFdicOrders());
    return;
  }

  if (path === FRB_ORDERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadFrbOrdersManifest(), req, port));
    return;
  }

  if (path === FRB_ORDERS_PATH) {
    await servePaid(req, res, port, "frb-orders", () => loadFrbOrders());
    return;
  }

  if (path === NCUA_ORDERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadNcuaOrdersManifest(), req, port));
    return;
  }

  if (path === NCUA_ORDERS_PATH) {
    await servePaid(req, res, port, "ncua-orders", () => loadNcuaOrders());
    return;
  }

  if (path === FINCEN_ORDERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadFincenOrdersManifest(), req, port));
    return;
  }

  if (path === FINCEN_ORDERS_PATH) {
    await servePaid(req, res, port, "fincen-orders", () => loadFincenOrders());
    return;
  }

  if (path === FERC_ORDERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadFercOrdersManifest(), req, port));
    return;
  }

  if (path === FERC_ORDERS_PATH) {
    await servePaid(req, res, port, "ferc-orders", () => loadFercOrders());
    return;
  }

  if (path === OFAC_ORDERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadOfacOrdersManifest(), req, port));
    return;
  }

  if (path === OFAC_ORDERS_PATH) {
    await servePaid(req, res, port, "ofac-orders", () => loadOfacOrders());
    return;
  }

  if (path === BIS_ORDERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadBisOrdersManifest(), req, port));
    return;
  }

  if (path === BIS_ORDERS_PATH) {
    await servePaid(req, res, port, "bis-orders", () => loadBisOrders());
    return;
  }

  if (path === CFTC_ORDERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadCftcOrdersManifest(), req, port));
    return;
  }

  if (path === CFTC_ORDERS_PATH) {
    await servePaid(req, res, port, "cftc-orders", () => loadCftcOrders());
    return;
  }

  if (path === FIFRA_ORDERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadFifraOrdersManifest(), req, port));
    return;
  }

  if (path === FIFRA_ORDERS_PATH) {
    await servePaid(req, res, port, "fifra-orders", () => loadFifraOrders());
    return;
  }

  if (path === DENOVO_ORDERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadDenovoOrdersManifest(), req, port));
    return;
  }

  if (path === DENOVO_ORDERS_PATH) {
    await servePaid(req, res, port, "denovo-orders", () => loadDenovoOrders());
    return;
  }

  if (path === TTB_OIC_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadTtbOicManifest(), req, port));
    return;
  }

  if (path === TTB_OIC_PATH) {
    await servePaid(req, res, port, "ttb-oic", () => loadTtbOic());
    return;
  }

  if (path === AIR_LETTERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadAirLettersManifest(), req, port));
    return;
  }

  if (path === AIR_LETTERS_PATH) {
    await servePaid(req, res, port, "air-letters", () => loadAirLetters());
    return;
  }

  if (path === SUPERFUND_RODS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadSuperfundRodsManifest(), req, port));
    return;
  }

  if (path === SUPERFUND_RODS_PATH) {
    await servePaid(req, res, port, "superfund-rods", () => loadSuperfundRods());
    return;
  }

  if (path === ICO_MPN_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadIcoMpnManifest(), req, port));
    return;
  }

  if (path === ICO_MPN_PATH) {
    await servePaid(req, res, port, "ico-mpn", () => loadIcoMpn());
    return;
  }

  if (path === PHMSA_COP_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadPhmsaCopManifest(), req, port));
    return;
  }

  if (path === PHMSA_COP_PATH) {
    await servePaid(req, res, port, "phmsa-cop", () => loadPhmsaCop());
    return;
  }

  if (path === ACM_BESLUITEN_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadAcmBesluitenManifest(), req, port));
    return;
  }

  if (path === ACM_BESLUITEN_PATH) {
    await servePaid(req, res, port, "acm-besluiten", () => loadAcmBesluiten());
    return;
  }

  if (path === CCPC_MERGERS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadCcpcMergersManifest(), req, port));
    return;
  }

  if (path === CCPC_MERGERS_PATH) {
    await servePaid(req, res, port, "ccpc-mergers", () => loadCcpcMergers());
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

  sendJson(res, 404, { error: "not_found", paths: [TICKS_PATH, MANIFEST_PATH, CATALOG_PATH, IMPORT_ALERTS_PATH, IMPORT_ALERTS_MANIFEST_PATH, MARINERS_PATH, MARINERS_MANIFEST_PATH, MARINERS_D11_PATH, MARINERS_D11_MANIFEST_PATH, MARINERS_D7_PATH, MARINERS_D7_MANIFEST_PATH, MARINERS_D8_PATH, MARINERS_D8_MANIFEST_PATH, WARNING_LETTERS_PATH, WARNING_LETTERS_MANIFEST_PATH, UNTITLED_LETTERS_PATH, UNTITLED_LETTERS_MANIFEST_PATH, AWA_PATH, AWA_MANIFEST_PATH, SWISSPAR_PATH, SWISSPAR_MANIFEST_PATH, PCAC_PATH, PCAC_MANIFEST_PATH, FTC_WL_PATH, FTC_WL_MANIFEST_PATH, CFPB_ORDERS_PATH, CFPB_ORDERS_MANIFEST_PATH, OCC_CD_PATH, OCC_CD_MANIFEST_PATH, FDIC_ORDERS_PATH, FDIC_ORDERS_MANIFEST_PATH, FRB_ORDERS_PATH, FRB_ORDERS_MANIFEST_PATH, NCUA_ORDERS_PATH, NCUA_ORDERS_MANIFEST_PATH, FINCEN_ORDERS_PATH, FINCEN_ORDERS_MANIFEST_PATH, FERC_ORDERS_PATH, FERC_ORDERS_MANIFEST_PATH, OFAC_ORDERS_PATH, OFAC_ORDERS_MANIFEST_PATH, BIS_ORDERS_PATH, BIS_ORDERS_MANIFEST_PATH, CFTC_ORDERS_PATH, CFTC_ORDERS_MANIFEST_PATH, FIFRA_ORDERS_PATH, FIFRA_ORDERS_MANIFEST_PATH, DENOVO_ORDERS_PATH, DENOVO_ORDERS_MANIFEST_PATH, TTB_OIC_PATH, TTB_OIC_MANIFEST_PATH, AIR_LETTERS_PATH, AIR_LETTERS_MANIFEST_PATH, SUPERFUND_RODS_PATH, SUPERFUND_RODS_MANIFEST_PATH, ICO_MPN_PATH, ICO_MPN_MANIFEST_PATH, PHMSA_COP_PATH, PHMSA_COP_MANIFEST_PATH, ACM_BESLUITEN_PATH, ACM_BESLUITEN_MANIFEST_PATH, CCPC_MERGERS_PATH, CCPC_MERGERS_MANIFEST_PATH, FORM_483_PATH, FORM_483_MANIFEST_PATH, GMP_PATH, GMP_MANIFEST_PATH, GMP_MD_PATH, GMP_MD_MANIFEST_PATH, WELL_KNOWN_PATH, OPENAPI_PATH, LLMS_PATH] });
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
    console.error(`${SWISSPAR_PATH} $${Number(amountAtomicFor("swisspar")) / 1e6} USDC`);
    console.error(`${PCAC_PATH} $${Number(amountAtomicFor("pcac")) / 1e6} USDC`);
    console.error(`${FTC_WL_PATH} $${Number(amountAtomicFor("ftc-wl")) / 1e6} USDC`);
    console.error(`${CFPB_ORDERS_PATH} $${Number(amountAtomicFor("cfpb-orders")) / 1e6} USDC`);
    console.error(`${OCC_CD_PATH} $${Number(amountAtomicFor("occ-cd")) / 1e6} USDC`);
    console.error(`${FDIC_ORDERS_PATH} $${Number(amountAtomicFor("fdic-orders")) / 1e6} USDC`);
    console.error(`${FRB_ORDERS_PATH} $${Number(amountAtomicFor("frb-orders")) / 1e6} USDC`);
    console.error(`${NCUA_ORDERS_PATH} $${Number(amountAtomicFor("ncua-orders")) / 1e6} USDC`);
    console.error(`${FINCEN_ORDERS_PATH} $${Number(amountAtomicFor("fincen-orders")) / 1e6} USDC`);
    console.error(`${FERC_ORDERS_PATH} $${Number(amountAtomicFor("ferc-orders")) / 1e6} USDC`);
    console.error(`${OFAC_ORDERS_PATH} $${Number(amountAtomicFor("ofac-orders")) / 1e6} USDC`);
    console.error(`${BIS_ORDERS_PATH} $${Number(amountAtomicFor("bis-orders")) / 1e6} USDC`);
    console.error(`${CFTC_ORDERS_PATH} $${Number(amountAtomicFor("cftc-orders")) / 1e6} USDC`);
    console.error(`${FIFRA_ORDERS_PATH} $${Number(amountAtomicFor("fifra-orders")) / 1e6} USDC`);
    console.error(`${DENOVO_ORDERS_PATH} $${Number(amountAtomicFor("denovo-orders")) / 1e6} USDC`);
    console.error(`${TTB_OIC_PATH} $${Number(amountAtomicFor("ttb-oic")) / 1e6} USDC`);
    console.error(`${AIR_LETTERS_PATH} $${Number(amountAtomicFor("air-letters")) / 1e6} USDC`);
    console.error(`${SUPERFUND_RODS_PATH} $${Number(amountAtomicFor("superfund-rods")) / 1e6} USDC`);
    console.error(`${ICO_MPN_PATH} $${Number(amountAtomicFor("ico-mpn")) / 1e6} USDC`);
    console.error(`${PHMSA_COP_PATH} $${Number(amountAtomicFor("phmsa-cop")) / 1e6} USDC (unlisted until /ico-mpn is live)`);
    console.error(`${ACM_BESLUITEN_PATH} $${Number(amountAtomicFor("acm-besluiten")) / 1e6} USDC (unlisted)`);
    console.error(`${CCPC_MERGERS_PATH} $${Number(amountAtomicFor("ccpc-mergers")) / 1e6} USDC (unlisted)`);
    console.error(`${FORM_483_PATH} $${Number(amountAtomicFor("form-483")) / 1e6} USDC${form483IsPublic() ? "" : " (unlisted until a real 483 body is cached)"}`);
    console.error(`${GMP_PATH} $${Number(amountAtomicFor("gmp")) / 1e6} USDC${gmpIsPublic() ? "" : " (unlisted until a real GMP observation body is cached)"}`);
    console.error(`${GMP_MD_PATH} $${Number(amountAtomicFor("gmp-md")) / 1e6} USDC${gmpMdIsPublic() ? "" : " (unlisted until a real MD observation body is cached)"}`);
    console.error(`payTo ${PAY_TO} USDC ${USDC_BASE} on Base`);
    console.error(`ticksDir ${ticksDir() || "(unset)"}`);
    console.error(`board ${board && existsSync(board) ? board : "missing — paid /ticks body will be empty/stale"}`);
  });
}
