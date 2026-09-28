#!/usr/bin/env node
/**
 * Manitoba Agriculture weekly Cattle/Sheep/Goat Prices PDFs for the existing
 * GET /ticks door ($0.05, entire current table). Same SKU. Do not open
 * /mb-cattle-prices.
 *
 * Body is the weekly per-mart auction tables (Ashern, Gladstone, Grunthal,
 * Killarney, Ste Rose, Virden, Winnipeg) in C$/cwt, plus the sheep/goat
 * prints in that same PDF. Current-sale averages only. "No sale" does not
 * backfill the previous sale. The provincial rollup on page 2 has no mart
 * name and is not a tick. Head counts and the Bank of Canada exchange line
 * are not prices.
 *
 * livestock-monthly-prices-historic.xlsx is aggregate Canfax/category history
 * with no auction-mart names — not this SKU. PowerBI / dashboards.js is charts.
 * If the source page grows a free JSON/CSV/XLSX of the weekly multi-mart body,
 * collect stops (kill) instead of wrapping it.
 *
 * OpenMB Information and Data Use Licence: commercial use with the attribution
 * below. No endorsement. No logos.
 *
 * Apply on the worker tip by merging the snapshot rows into /ticks. Do not
 * restart media-box from this VM.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PRODUCT_ID = "us-hay-cattle-grain-ticks";
export const TICKS_PATH = "/ticks";
export const TICKS_PRICE = "0.05";
export const SOURCE_PAGE =
  "https://www.gov.mb.ca/agriculture/markets-and-statistics/livestock-statistics/livestock-market-prices-current.html";
export const PDF_BASE =
  "https://www.gov.mb.ca/agriculture/markets-and-statistics/livestock-statistics/pubs";
export const MONTHLY_HISTORIC_XLSX = `${PDF_BASE}/livestock-monthly-prices-historic.xlsx`;
export const DASHBOARDS_JS = "https://www.gov.mb.ca/agriculture/pubs/js2/dashboards.js";
export const LICENSE_NAME = "OpenMB Information and Data Use Licence";
export const LICENSE_URL =
  "https://www.manitoba.ca/asset_library/en/legal/OpenMB-Information-Data-Use-Licence.pdf";
export const OPENMB_ATTRIBUTION =
  "Contains information from the Government of Manitoba, licensed under the OpenMB Information and Data Use License (Manitoba.ca/OpenMB)";
export const MB_SOURCE_NAME = "Manitoba Agriculture weekly Cattle, Sheep and Goat Prices";

export const MB_MARTS = ["Ashern", "Gladstone", "Grunthal", "Killarney", "Ste Rose", "Virden", "Winnipeg"] as const;
export type MbMart = (typeof MB_MARTS)[number];

export const SKIPPED_MB = [
  {
    id: "monthly-historic-xlsx",
    why: "livestock-monthly-prices-historic.xlsx is aggregate Canfax/category series with no auction-mart names — not the weekly per-mart PDF body",
  },
  {
    id: "powerbi-charts",
    why: "Cattle dashboard (dashboards.js → app.powerbi.com) is charts only. Kill only if a free JSON/CSV/XLSX of the weekly multi-mart body appears",
  },
  {
    id: "sheep-monthly-pdf",
    why: "sheep-lamb-mb-markets-prices monthly PDF is not the weekly multi-mart cattle table",
  },
  {
    id: "new-path",
    why: "No /mb-cattle-prices door. Rows stay on GET /ticks $0.05 tableWhole",
  },
  {
    id: "logos",
    why: "OpenMB: commercial use with attribution; no endorsement; no Manitoba logos",
  },
] as const;

const HTTP_UA = "bnm-data-shop/1.0 (manitoba-weekly-cattle; +https://ticks.bnm.farm)";
const MART_ALT = MB_MARTS.map((m) => m.replace(" ", "\\s+")).join("|");
const CATTLE_HEADER_RE = new RegExp(`^(${MART_ALT})\\s+Sale date:\\s*(No sale|\\d{4}-\\d{2}-\\d{2})\\b`, "i");
const SHEEP_HEADER_RE = new RegExp(`^(Winnipeg|Grunthal)\\s+Last sale date:\\s*(No sale|\\d{4}-\\d{2}-\\d{2})\\b`, "i");
const MONEY = "NA|\\d+\\.\\d{2}";
const CATTLE_ROW_RE = new RegExp(
  `^(D1, 2 Cows|D3 Cows|Bulls|\\(901 \\+ lb\\)|\\(801-900\\)|\\(701-800\\)|\\(601-700\\)|\\(501-600\\)|\\(401-500\\))\\s+(${MONEY})\\s+(${MONEY})\\s+(${MONEY})\\b`,
  "i",
);
const SHEEP_ROW_RE = new RegExp(
  `^(Sheep|100 \\+ lbs\\.?|80 - 100 lbs|60 - 80 lbs|Under 60 lbs|Billys|Nannys|Kids)\\s+(${MONEY})\\s+(${MONEY})\\s+(${MONEY})\\b`,
  "i",
);

const MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

export type MbGroup = "cattle" | "sheep" | "goats";

/** Same keys as the /ticks table row (AmsTick), unit stays C$/cwt. */
export type MbTick = {
  id: string;
  group: MbGroup;
  commodity: string;
  label: string;
  market: string;
  classGrade: string;
  unit: "C$/cwt";
  price: number;
  lo: number;
  hi: number;
  asOf: string;
  source: string;
  sourceUrl: string;
  reportDate: string;
  series: string;
};

export type MbFailed = { id: string; source: string; sourceUrl: string; reason: string };

export type MbSnapshot = {
  ok: true;
  product: typeof PRODUCT_ID;
  fetchedAt: string;
  asOf: string | null;
  tickCount: number;
  rows: MbTick[];
  failed: MbFailed[];
  sources: string[];
  attribution: typeof OPENMB_ATTRIBUTION;
  license: { name: typeof LICENSE_NAME; url: typeof LICENSE_URL };
  killed: string | null;
};

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function mbCattleDir(): string {
  if (env("TICKS_MB_CATTLE_DIR")) return resolve(env("TICKS_MB_CATTLE_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ticks-mb-cattle"));
}

export function isMbCattleTickId(id: string): boolean {
  return /^(cattle|sheep|goats)\.mb_ag\./.test(id);
}

/** Full AMS walk includes Manitoba. A slug filter collects it only when asked. */
export function shouldCollectMbCattle(): boolean {
  const leftoversOnly = /^(1|true|yes)$/i.test(env("TICKS_AMS_LEFTOVERS_ONLY"));
  const only = env("TICKS_AMS_ONLY_SLUGS")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (leftoversOnly && only.length === 0) return false;
  if (only.length === 0) return true;
  return only.some((s) => s === "mb" || s === "manitoba" || s === "mb_ag" || s === "mb-cattle");
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function canonicalMart(raw: string): MbMart | null {
  const flat = raw.replace(/\s+/g, " ").trim().toLowerCase();
  return MB_MARTS.find((m) => m.toLowerCase() === flat) ?? null;
}

function martToken(mart: MbMart): string {
  return mart.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function martMarket(mart: MbMart): string {
  return `${mart} Auction Mart`;
}

function flatLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function parseIssueDate(text: string): string | null {
  const m = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/,
  );
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (!month || day < 1 || day > 31 || year < 1990 || year > 2100) return null;
  return `${m[3]}-${month}-${String(day).padStart(2, "0")}`;
}

export function weeklyPdfUrl(isoDate: string): string {
  return `${PDF_BASE}/cattle-sheep-goat-prices-${isoDate}.pdf`;
}

function absUrl(href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("/")) return `https://www.gov.mb.ca${href}`;
  return href;
}

export function isMonthlyHistoricUrl(url: string): boolean {
  return /livestock-monthly-prices-historic\.xlsx(?:\?|$)/i.test(url);
}

/** Data links on the listing page that might be a free same-body dump. Monthly XLSX is not one. */
export function candidateDumpUrls(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const hit of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const url = absUrl(hit[1].replace(/&amp;/g, "&"));
    if (isMonthlyHistoricUrl(url)) continue;
    if (!/\.(csv|json|xlsx|xls)(?:\?|$)/i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function listWeeklyPdfs(html: string): { date: string; url: string }[] {
  const byDate = new Map<string, string>();
  for (const hit of html.matchAll(/href=["']([^"']*cattle-sheep-goat-prices-(\d{4}-\d{2}-\d{2})\.pdf)["']/gi)) {
    const date = hit[2];
    if (!byDate.has(date)) byDate.set(date, absUrl(hit[1].replace(/&amp;/g, "&")));
  }
  return [...byDate.entries()]
    .map(([date, url]) => ({ date, url }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * True when text is the weekly multi-mart auction body (several mart names
 * plus C$/cwt-style prices). A Canfax/category sheet with no mart names is false.
 * PowerBI embed HTML without those prints is false.
 */
export function textDumpsWeeklyMartBody(text: string): boolean {
  const lower = text.toLowerCase();
  const hits = MB_MARTS.filter((mart) => lower.includes(mart.toLowerCase()));
  if (hits.length < 4) return false;
  const prices = text.match(/\b\d{2,3}\.\d{2}\b/g) ?? [];
  if (prices.length < 8) return false;
  return /c\$\/cwt|average price|low price|feeder cattle|d1,\s*2 cows/i.test(text);
}

function priceTriple(loRaw: string, hiRaw: string, avgRaw: string): { lo: number; hi: number; price: number } | null {
  if (/^NA$/i.test(loRaw) || /^NA$/i.test(hiRaw) || /^NA$/i.test(avgRaw)) return null;
  const lo = Number(loRaw);
  const hi = Number(hiRaw);
  const price = Number(avgRaw);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !Number.isFinite(price)) return null;
  if (lo < 20 || hi > 1500 || price < 20 || price > 1200) return null;
  if (hi < lo) return null;
  if (price < lo - 0.05 || price > hi + 0.05) return null;
  return { lo: roundMoney(lo), hi: roundMoney(hi), price: roundMoney(price) };
}

function pushTick(
  out: MbTick[],
  opts: {
    id: string;
    group: MbGroup;
    commodity: string;
    label: string;
    market: string;
    classGrade: string;
    price: number;
    lo: number;
    hi: number;
    asOf: string;
    reportDate: string;
    sourceUrl: string;
  },
): void {
  const source = `${MB_SOURCE_NAME} (${opts.market}). ${OPENMB_ATTRIBUTION}`;
  out.push({
    id: opts.id,
    group: opts.group,
    commodity: opts.commodity,
    label: opts.label,
    market: opts.market,
    classGrade: opts.classGrade,
    unit: "C$/cwt",
    price: opts.price,
    lo: opts.lo,
    hi: opts.hi,
    asOf: opts.asOf,
    source,
    sourceUrl: opts.sourceUrl,
    reportDate: opts.reportDate,
    series: opts.id,
  });
}

function cattleClass(label: string, seenWeights: Map<string, number>): {
  kind: string;
  commodity: string;
  classGrade: string;
} | null {
  if (/^D1, 2 Cows$/i.test(label)) {
    return { kind: "slaughter.d1_2_cows", commodity: "Cows", classGrade: "Slaughter D1, D2 cows" };
  }
  if (/^D3 Cows$/i.test(label)) {
    return { kind: "slaughter.d3_cows", commodity: "Cows", classGrade: "Slaughter D3 cows" };
  }
  if (/^Bulls$/i.test(label)) {
    return { kind: "slaughter.bulls", commodity: "Bulls", classGrade: "Slaughter bulls" };
  }
  const weight = label.match(/^\((901 \+ lb|\d{3}-\d{3})\)$/i);
  if (!weight) return null;
  const n = (seenWeights.get(label) ?? 0) + 1;
  seenWeights.set(label, n);
  const sex = n === 1 ? "feeder-steer" : "feeder-heifer";
  const pretty = /901/.test(label) ? "901+ lb" : label.replace(/[()]/g, "");
  const tok = /901/.test(label) ? "901_plus" : pretty.replace("-", "_");
  const commodity = sex === "feeder-steer" ? "Steers" : "Heifers";
  const noun = sex === "feeder-steer" ? "Feeder steers" : "Feeder heifers";
  return { kind: `${sex}.${tok}`, commodity, classGrade: `${noun}, ${pretty}` };
}

function sheepClass(label: string): { group: MbGroup; kind: string; commodity: string; classGrade: string } | null {
  if (/^Sheep$/i.test(label)) {
    return { group: "sheep", kind: "sheep", commodity: "Sheep", classGrade: "Sheep" };
  }
  if (/^100 \+ lbs\.?$/i.test(label)) {
    return { group: "sheep", kind: "lambs.100_plus", commodity: "Lambs", classGrade: "Lambs, 100+ lb" };
  }
  if (/^80 - 100 lbs$/i.test(label)) {
    return { group: "sheep", kind: "lambs.80_100", commodity: "Lambs", classGrade: "Lambs, 80-100 lb" };
  }
  if (/^60 - 80 lbs$/i.test(label)) {
    return { group: "sheep", kind: "lambs.60_80", commodity: "Lambs", classGrade: "Lambs, 60-80 lb" };
  }
  if (/^Under 60 lbs$/i.test(label)) {
    return { group: "sheep", kind: "lambs.under_60", commodity: "Lambs", classGrade: "Lambs, under 60 lb" };
  }
  if (/^Billys$/i.test(label)) {
    return {
      group: "goats",
      kind: "billys",
      commodity: "Goats",
      classGrade: "Goats, billys, published C$/cwt",
    };
  }
  if (/^Nannys$/i.test(label)) {
    return {
      group: "goats",
      kind: "nannys",
      commodity: "Goats",
      classGrade: "Goats, nannys, published C$/cwt",
    };
  }
  if (/^Kids$/i.test(label)) {
    return {
      group: "goats",
      kind: "kids",
      commodity: "Goats",
      classGrade: "Goats, kids, published C$/cwt",
    };
  }
  return null;
}

function parseCattleBlock(lines: string[], mart: MbMart, saleDate: string, reportDate: string, sourceUrl: string): MbTick[] {
  const out: MbTick[] = [];
  const seenWeights = new Map<string, number>();
  const market = martMarket(mart);
  for (const line of lines) {
    if (CATTLE_HEADER_RE.test(line) || /^Sheep and Goat\b/i.test(line) || SHEEP_HEADER_RE.test(line)) break;
    const row = line.match(CATTLE_ROW_RE);
    if (!row) continue;
    const cls = cattleClass(row[1], seenWeights);
    if (!cls) continue;
    const money = priceTriple(row[2], row[3], row[4]);
    if (!money) continue;
    const id = ["cattle", "mb_ag", martToken(mart), cls.kind].join(".");
    pushTick(out, {
      id,
      group: "cattle",
      commodity: cls.commodity,
      label: `${market} ${cls.classGrade}`,
      market,
      classGrade: cls.classGrade,
      ...money,
      asOf: saleDate,
      reportDate,
      sourceUrl,
    });
  }
  return out;
}

function parseSheepBlock(lines: string[], mart: MbMart, saleDate: string, reportDate: string, sourceUrl: string): MbTick[] {
  const out: MbTick[] = [];
  const market = martMarket(mart);
  for (const line of lines) {
    if (SHEEP_HEADER_RE.test(line) && !line.toLowerCase().startsWith(mart.toLowerCase())) break;
    const row = line.match(SHEEP_ROW_RE);
    if (!row) continue;
    const money = priceTriple(row[2], row[3], row[4]);
    if (!money) continue;
    const cls = sheepClass(row[1]);
    if (!cls) continue;
    const id = [cls.group, "mb_ag", martToken(mart), cls.kind].join(".");
    pushTick(out, {
      id,
      group: cls.group,
      commodity: cls.commodity,
      label: `${market} ${cls.classGrade}`,
      market,
      classGrade: cls.classGrade,
      ...money,
      asOf: saleDate,
      reportDate,
      sourceUrl,
    });
  }
  return out;
}

function dedupe(rows: MbTick[]): MbTick[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

/** Current-week per-mart prints. Provincial averages and previous-sale columns stay off. */
export function parseMbWeeklyPrices(text: string, sourceUrl: string): MbTick[] {
  const reportDate = parseIssueDate(text);
  if (!reportDate) return [];
  const lines = flatLines(text);
  const out: MbTick[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cattle = lines[i].match(CATTLE_HEADER_RE);
    if (cattle) {
      const mart = canonicalMart(cattle[1]);
      const sale = /^no sale$/i.test(cattle[2]) ? null : cattle[2];
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !CATTLE_HEADER_RE.test(lines[i]) && !/^Sheep and Goat\b/i.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i -= 1;
      if (mart && sale) out.push(...parseCattleBlock(body, mart, sale, reportDate, sourceUrl));
      continue;
    }
    const sheep = lines[i].match(SHEEP_HEADER_RE);
    if (sheep) {
      const mart = canonicalMart(sheep[1]);
      const sale = /^no sale$/i.test(sheep[2]) ? null : sheep[2];
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !SHEEP_HEADER_RE.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i -= 1;
      if (mart && sale) out.push(...parseSheepBlock(body, mart, sale, reportDate, sourceUrl));
    }
  }
  return dedupe(out);
}

export function snapshotFromText(text: string, sourceUrl: string, fetchedAt: string): MbSnapshot {
  const rows = parseMbWeeklyPrices(text, sourceUrl);
  const asOf = rows.map((row) => row.asOf).sort().at(-1) ?? parseIssueDate(text);
  const failed: MbFailed[] = [];
  if (rows.length === 0) {
    failed.push({
      id: "mb_ag",
      source: MB_SOURCE_NAME,
      sourceUrl,
      reason: "official weekly PDF parsed 0 per-mart ticks (do not invent)",
    });
  }
  return {
    ok: true,
    product: PRODUCT_ID,
    fetchedAt,
    asOf,
    tickCount: rows.length,
    rows,
    failed,
    sources: rows.length > 0 ? [MB_SOURCE_NAME] : [],
    attribution: OPENMB_ATTRIBUTION,
    license: { name: LICENSE_NAME, url: LICENSE_URL },
    killed: null,
  };
}

export function pdftotext(bytes: Buffer): string {
  const result = spawnSync("pdftotext", ["-layout", "-", "-"], {
    input: bytes,
    encoding: "buffer",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`pdftotext failed: ${result.stderr.toString() || result.status}`);
  }
  return result.stdout.toString("utf8");
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { Accept: "text/html,application/json,text/plain,*/*", "User-Agent": HTTP_UA },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function fetchPdf(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { Accept: "application/pdf", "User-Agent": HTTP_UA },
    redirect: "follow",
  });
  const bytes = Buffer.from(await res.arrayBuffer());
  if (res.status !== 200 || bytes.subarray(0, 4).toString() !== "%PDF") {
    throw new Error(`HTTP ${res.status} ${res.headers.get("content-type") || ""}`.trim());
  }
  return bytes;
}

/** Kill reason when a free file already dumps the weekly multi-mart body. Null means PDF collect is still the body. */
export async function weeklyMartDumpReason(html: string): Promise<string | null> {
  if (textDumpsWeeklyMartBody(html)) {
    return "source page already prints the weekly multi-mart price body";
  }
  const urls = candidateDumpUrls(html);
  let dash = "";
  try {
    dash = await fetchText(DASHBOARDS_JS);
  } catch {
    dash = "";
  }
  if (dash && textDumpsWeeklyMartBody(dash)) {
    return "dashboards.js already prints the weekly multi-mart price body";
  }
  for (const hit of dash.matchAll(/https?:\/\/[^"'\\\s)]+/g)) {
    const url = hit[0];
    if (/\.(csv|json|xlsx|xls)(?:\?|$)/i.test(url) && !isMonthlyHistoricUrl(url)) urls.push(url);
  }
  for (const url of urls) {
    try {
      const body = await fetchText(url);
      if (textDumpsWeeklyMartBody(body)) return `free same-body dump at ${url}`;
    } catch {
      continue;
    }
  }
  return null;
}

function failedSnapshot(reason: string, fetchedAt: string, killed: string | null = null): MbSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    fetchedAt,
    asOf: null,
    tickCount: 0,
    rows: [],
    failed: [{ id: "mb_ag", source: MB_SOURCE_NAME, sourceUrl: SOURCE_PAGE, reason: killed ?? reason }],
    sources: [],
    attribution: OPENMB_ATTRIBUTION,
    license: { name: LICENSE_NAME, url: LICENSE_URL },
    killed,
  };
}

/** Drop Manitoba rows only when a free same-body dump killed the collect. A fetch miss keeps the previous rows. */
export function foldMbIntoRows<T extends { id: string }>(rows: T[], mb: Pick<MbSnapshot, "killed" | "rows"> | null): T[] {
  if (!mb) return rows;
  if (mb.killed) return rows.filter((row) => !isMbCattleTickId(row.id));
  if (mb.rows.length === 0) return rows;
  return [...rows.filter((row) => !isMbCattleTickId(row.id)), ...(mb.rows as unknown as T[])];
}

export async function collectMbCattle(): Promise<MbSnapshot> {
  const fetchedAt = new Date().toISOString();
  let html = "";
  try {
    html = await fetchText(SOURCE_PAGE);
  } catch (err) {
    return failedSnapshot(err instanceof Error ? err.message : "source page fetch failed", fetchedAt);
  }
  const killed = await weeklyMartDumpReason(html);
  if (killed) return failedSnapshot(killed, fetchedAt, killed);
  const pdfs = listWeeklyPdfs(html);
  const newest = pdfs[0];
  if (!newest) {
    return failedSnapshot("source page listed no cattle-sheep-goat-prices weekly PDF", fetchedAt);
  }
  try {
    const text = pdftotext(await fetchPdf(newest.url));
    return snapshotFromText(text, newest.url, fetchedAt);
  } catch (err) {
    return failedSnapshot(err instanceof Error ? err.message : "weekly PDF collect failed", fetchedAt);
  }
}

export function writeMbSnapshot(snap: MbSnapshot, dir = mbCattleDir()): string {
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, "snapshot.json");
  writeFileSync(dest, `${JSON.stringify(snap, null, 2)}\n`);
  return dest;
}

async function main(): Promise<void> {
  const snap = await collectMbCattle();
  const dest = writeMbSnapshot(snap);
  console.log(
    JSON.stringify(
      {
        dest,
        product: snap.product,
        path: TICKS_PATH,
        price: TICKS_PRICE,
        tickCount: snap.tickCount,
        asOf: snap.asOf,
        killed: snap.killed,
        failed: snap.failed.map((row) => row.reason),
        attribution: snap.attribution,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
