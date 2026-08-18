#!/usr/bin/env node
/**
 * Thin x402 pay-per-pull door for the BNM Data Shop.
 *
 * GET /ticks — Idaho hay + feeder ticks ($0.02 USDC on Base)
 * GET /import-alerts — FDA Import Alert / DWPE firm ticks ($0.05)
 * GET /import-alerts/manifest.json — free catalog + schema + sample rows
 * GET /mariners — USCG D13 / Northwest Local Notice to Mariners ($0.05)
 * GET /mariners/manifest.json — free count + official source (no notice body)
 * GET /warning-letters — unlisted FDA warning-letter bodies ($0.05). Not a public SKU.
 * GET /warning-letters/manifest.json — unlisted free count + source (no letter body)
 *
 * Unpaid paid paths → HTTP 402. Does not list on x402scan/Bazaar, does not
 * resurrect the Apollo Intelligence catalog. No keys in the repo.
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
  MARINERS_AMOUNT_ATOMIC,
  MARINERS_MANIFEST_PATH,
  MARINERS_PATH,
  loadMariners,
  loadMarinersManifest,
} from "./mariners.js";
import {
  WARNING_LETTERS_AMOUNT_ATOMIC,
  WARNING_LETTERS_MANIFEST_PATH,
  WARNING_LETTERS_PATH,
  loadWarningLetters,
  loadWarningLettersManifest,
} from "./warning-letters.js";

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

export type DoorSku = "ticks" | "import-alerts" | "mariners" | "warning-letters";

function amountAtomicFor(sku: DoorSku): string {
  if (sku === "import-alerts") {
    const raw = env("IMPORT_ALERTS_USDC_ATOMIC");
    return raw.length > 0 ? raw : IMPORT_ALERTS_AMOUNT_ATOMIC;
  }
  if (sku === "mariners") {
    const raw = env("MARINERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : MARINERS_AMOUNT_ATOMIC;
  }
  if (sku === "warning-letters") {
    const raw = env("WARNING_LETTERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : WARNING_LETTERS_AMOUNT_ATOMIC;
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
  "warning-letters": {
    description:
      "Call GET /warning-letters when you need official FDA warning-letter bodies (firm, date, subject, full letter text) parsed from fda.gov HTML. Unlisted. Not the import-alerts IA feed. Does not invent letter text.",
    resourcePath: WARNING_LETTERS_PATH,
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
  "warning-letters": {
    ok: true,
    product: "fda-warning-letter-bodies",
    status: "ok",
    unlisted: true,
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
  const fetchedAt = typeof board?.fetchedAt === "string"
    ? board.fetchedAt
    : typeof board?.cachedAt === "string"
      ? board.cachedAt
      : null;

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

  const hasTicks = rows.length + points.length > 0;
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
    ticks: rows,
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
    outputSchema: null,
    maxTimeoutSeconds: 60,
    extra: { name: "USDC", version: "2" },
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
    extra: { name: "USDC", version: "2" },
    amount,
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

function facilitatorBody(payment: string, requirements: Record<string, unknown>): Record<string, unknown> {
  const payload = paymentPayload(payment);
  return {
    x402Version: payload?.x402Version ?? 1,
    paymentPayload: payload ?? { paymentHeader: payment },
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

async function cdpAuthHeaders(method: "GET" | "POST", url: string): Promise<Record<string, string> | null> {
  if (cdpEnvStatus() !== "set") {
    console.error("CDP env not set");
    return null;
  }
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
    console.error("CDP facilitator JWT failed");
    return null;
  }
}

async function facilitatorPost(
  path: "/verify" | "/settle",
  payment: string,
  requirements: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const base = env("X402_FACILITATOR_URL");
  if (!base) return null;
  if (cdpEnvStatus() !== "set") {
    console.error("CDP env not set");
    return { error: "CDP env not set" };
  }
  const url = `${base.replace(/\/$/, "")}${path}`;
  const auth = await cdpAuthHeaders("POST", url);
  if (!auth) return { error: "CDP env not set" };
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
    if (!res.ok) {
      console.error(`facilitator ${path} HTTP ${res.status}`);
      return null;
    }
    console.error(`facilitator ${path} authenticated`);
    return body;
  } catch (err) {
    console.error(`facilitator ${path} error ${err instanceof Error ? err.name : "unknown"}`);
    return null;
  }
}

async function facilitatorVerify(payment: string, requirements: Record<string, unknown>): Promise<boolean> {
  const body = await facilitatorPost("/verify", payment, requirements);
  if (!body || body.error === "CDP env not set") return false;
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
  return [
    "# BNM Data Shop",
    "",
    "Official public data as JSON at https://ticks.bnm.farm. Three paid GETs only. USDC on Base (eip155:8453). payTo 0xf59621FC406D266e18f314Ae18eF0a33b8401004.",
    "",
    "## Paid",
    "",
    "- GET /ticks — $0.02 — Idaho + PNW market ticks (USDA AMS, Idaho grain, WD1 $/AF)",
    "- GET /import-alerts — $0.05 — FDA Import Alerts / DWPE firm-product snapshot",
    "- GET /mariners — $0.05 — USCG D13 / Northwest Local Notice to Mariners",
    "",
    "Unpaid GET returns HTTP 402 with PAYMENT-REQUIRED and extensions.bazaar. After a valid X-PAYMENT, the same URL returns JSON. No API key. No request body.",
    "",
    "## Free discovery",
    "",
    "- GET /openapi.json — OpenAPI 3.1 with x-payment-info for the three paid doors",
    "- GET /.well-known/x402 — absolute URLs of the three paid routes only",
    "- GET / — shop JSON (payTo + the three products)",
    "- GET /manifest.json — Idaho ticks count + schema",
    "- GET /import-alerts/manifest.json — FDA count + schema (not the firm dump)",
    "- GET /mariners/manifest.json — LNM count + official PDF (not the notice body)",
    "",
    "No fourth public SKU. Free manifests are not the paid body.",
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

function paidDiscoveryUrls(req: IncomingMessage, port: number): string[] {
  return [TICKS_PATH, IMPORT_ALERTS_PATH, MARINERS_PATH].map((path) => resourceUrl(req, port, path));
}

export function wellKnownX402(req: IncomingMessage, port: number): Record<string, unknown> {
  return {
    version: 1,
    resources: paidDiscoveryUrls(req, port),
    ...shopDiscoveryPointers(req, port),
    instructions:
      "GET each resource unpaid for HTTP 402 with extensions.bazaar. Pay USDC on Base. Free OpenAPI is at /openapi.json. Only these three paid routes exist.",
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
  const ticksPrice = (Number(ticksAtomic) / 1e6).toFixed(2);
  const iaPrice = (Number(iaAtomic) / 1e6).toFixed(2);
  const lnmPrice = (Number(lnmAtomic) / 1e6).toFixed(2);
  return {
    openapi: "3.1.0",
    info: {
      title: "BNM Data Shop",
      version: PRODUCT_VERSION,
      description: "Official public data as JSON. Unpaid paid routes return HTTP 402.",
      contact: { name: "BNM Data Shop", url: "https://bnm.farm/" },
      "x-guidance":
        "Three paid GETs only: /ticks ($0.02), /import-alerts ($0.05), /mariners ($0.05), USDC on Base. Start at GET /openapi.json or GET /.well-known/x402, then probe the paid URL unpaid for HTTP 402. Free manifests do not include the paid body. No request body. No fourth public SKU.",
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
      [WELL_KNOWN_PATH]: {
        get: freeOpenApiOp("x402 well-known fan-out", "Absolute URLs of the three live paid routes only."),
      },
      [OPENAPI_PATH]: {
        get: freeOpenApiOp("OpenAPI discovery document", "This document."),
      },
      [LLMS_PATH]: {
        get: freeOpenApiOp("Short agent guidance", "The three paid doors and free discovery URLs. Not a paid SKU."),
      },
      "/": {
        get: freeOpenApiOp("Shop discovery JSON", "payTo, network, and the three public products."),
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

  if (env("X402_FACILITATOR_URL") && cdpEnvStatus() !== "set") {
    console.error("CDP env not set");
    sendJson(
      res,
      402,
      { ...body402, error: "CDP env not set" },
      { "PAYMENT-REQUIRED": paymentRequiredHeader },
    );
    return;
  }

  const accept = (body402.accepts as Record<string, unknown>[])[0];
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

  if (path === IMPORT_ALERTS_PATH) {
    await servePaid(req, res, port, "import-alerts", () => loadImportAlerts());
    return;
  }

  if (path === MARINERS_PATH) {
    await servePaid(req, res, port, "mariners", () => loadMariners());
    return;
  }

  if (path === WARNING_LETTERS_MANIFEST_PATH) {
    sendJson(res, 200, await loadWarningLettersManifest());
    return;
  }

  if (path === WARNING_LETTERS_PATH) {
    await servePaid(req, res, port, "warning-letters", () => loadWarningLetters());
    return;
  }

  if (path === TICKS_PATH) {
    await servePaid(req, res, port, "ticks", () => loadTicks());
    return;
  }

  sendJson(res, 404, { error: "not_found", paths: [TICKS_PATH, MANIFEST_PATH, CATALOG_PATH, IMPORT_ALERTS_PATH, IMPORT_ALERTS_MANIFEST_PATH, MARINERS_PATH, MARINERS_MANIFEST_PATH, WELL_KNOWN_PATH, OPENAPI_PATH, LLMS_PATH] });
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
    console.error(`payTo ${PAY_TO} USDC ${USDC_BASE} on Base`);
    console.error(cdpEnvStatus() === "set" ? "CDP facilitator auth: env set" : "CDP env not set");
    console.error(`ticksDir ${ticksDir() || "(unset)"}`);
    console.error(`board ${board && existsSync(board) ? board : "missing — paid /ticks body will be empty/stale"}`);
  });
}
