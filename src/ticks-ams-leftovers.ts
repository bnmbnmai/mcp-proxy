#!/usr/bin/env node
/**
 * Leftover official USDA AMS cattle series for the existing $0.05 /ticks table.
 * Same SKU. No per-barn path. No invented prices. Do not wrap no-auth JSON bodies.
 *
 * Apply on the worker tip: add AMS_LEFTOVER_REPORTS into AMS_NATIONAL_REPORTS,
 * then AMS-only collect (`node build/ticks-ams.js`). Do not restart from this VM.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PRODUCT_ID = "us-hay-cattle-grain-ticks";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const MNREPORTS_PDF = (slug: string) => `https://www.ams.usda.gov/mnreports/ams_${slug}.pdf`;
export const MARS_REPORT = (slug: string) => `https://marsapi.ams.usda.gov/services/v1.1/reports/${slug}`;

export type LeftoverKind = "se-weekly" | "se-barn";

export type LeftoverReport = {
  slug: string;
  group: "cattle";
  region: string;
  title: string;
  kind: LeftoverKind;
};

/** Official leftover SE weeklies + SE sale barns still unpublished on /ticks. */
export const AMS_LEFTOVER_REPORTS: readonly LeftoverReport[] = [
  { slug: "2006", group: "cattle", region: "alabama_weekly", title: "Alabama Weekly Cattle Auction Summary", kind: "se-weekly" },
  { slug: "1704", group: "cattle", region: "florida_weekly", title: "Florida Weekly Livestock Auction Summary", kind: "se-weekly" },
  { slug: "1933", group: "cattle", region: "georgia_weekly", title: "Georgia Weekly Livestock Auction Summary", kind: "se-weekly" },
  { slug: "2193", group: "cattle", region: "kentucky_weekly", title: "Kentucky Weekly Livestock Auction Summary", kind: "se-weekly" },
  { slug: "2063", group: "cattle", region: "tennessee_weekly", title: "Tennessee Weekly Cattle Auction Summary", kind: "se-weekly" },
  { slug: "2187", group: "cattle", region: "virginia_weekly", title: "Virginia Weekly Cattle Auction Summary", kind: "se-weekly" },
  { slug: "2091", group: "cattle", region: "north_carolina_weekly", title: "North Carolina Weekly Livestock Auction Summary", kind: "se-weekly" },
  { slug: "2115", group: "cattle", region: "mississippi_weekly", title: "Mississippi Weekly Livestock Auction Summary", kind: "se-weekly" },
  { slug: "1963", group: "cattle", region: "south_carolina_weekly", title: "South Carolina Weekly Livestock Auction Summary", kind: "se-weekly" },
  { slug: "1988", group: "cattle", region: "letohatchee_al", title: "Mid State Stockyards Cattle Auction (Letohatchee)", kind: "se-barn" },
  { slug: "1946", group: "cattle", region: "calhoun_ga", title: "Calhoun Stockyard Cattle Auction", kind: "se-barn" },
  { slug: "1995", group: "cattle", region: "uniontown_al", title: "Alabama Livestock Auction Cattle Auction (Uniontown)", kind: "se-barn" },
  { slug: "1419", group: "cattle", region: "okeechobee_fl_tue", title: "Okeechobee Livestock Auction Cattle Auction (Tuesday)", kind: "se-barn" },
  { slug: "1997", group: "cattle", region: "florence_al", title: "Tennessee Valley Livestock Cattle Auction (Florence)", kind: "se-barn" },
];

export const SKIPPED_LEFTOVERS = [
  { id: "already-on-ticks", why: "Western/plains weeklies and Direct/POS hay-cattle-grain slugs already in AMS_NATIONAL_REPORTS / live latestAsOfBySource" },
  { id: "se-400-barns", why: "Hundreds of remaining SE/Midwest individual barns stay off this slice; five current official SE barns + nine SE weeklies are the unread official pages" },
  { id: "board-video", why: "Feeder cattle board/video/internet sales (AMS_2029, AMS_3891, AMS_2247, …) are a different family than sale-barn floor sheets" },
  { id: "seasonal-specials", why: "Replacement/stock-show specials often empty off-season; do not invent" },
  { id: "plaintext-mexico", why: "AL_LS626 / AL_LS627 / AL_LS635 already return official plaintext — do not wrap" },
  { id: "national-2874-waf", why: "AMS_2874 National Weekly Cattle Beef Summary mnreports 403 on this VM; skip rather than invent or wrap a dashboard" },
  { id: "mo-regional-weeklies", why: "Missouri NE/NC/WC/SW/SE/EC weeklies are leftover Midwest, not this SE slice" },
  { id: "il-pa-ny-weeklies", why: "Illinois / Pennsylvania / New York weeklies leftover — not SE" },
  { id: "marsapi-keyed", why: "marsapi /services/v1.1/reports/{slug} is HTTP 403 without a key — not a no-auth JSON body dump" },
  { id: "facebook-private", why: "Facebook barns and private sale-barn sites stay out" },
  { id: "new-sku", why: "No per-barn / per-state path; extra official rows stay on GET /ticks $0.05 tableWhole" },
] as const;

export type LeftoverTick = {
  id: string;
  group: "cattle";
  commodity: string;
  label: string;
  market: string;
  classGrade: string;
  unit: "$/cwt";
  price: number;
  lo?: number;
  hi?: number;
  asOf: string;
  source: string;
  sourceUrl: string;
  reportDate: string;
  series: string;
};

export type LeftoverFailed = { id: string; source: string; sourceUrl: string; reason: string };

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function leftoverDir(): string {
  if (env("TICKS_AMS_LEFTOVER_DIR")) return resolve(env("TICKS_AMS_LEFTOVER_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ticks-ams-leftovers"));
}

export function token(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function parseMdY(raw: string): string | null {
  const m = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!m) return null;
  const y = Number(m[3]);
  if (y < 1990 || y > 2100) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

export function parseReportDate(text: string): string | null {
  const livestockThru = text.match(
    /Livestock Weighted Average Report for\s+\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  if (livestockThru) return parseMdY(livestockThru[1]);
  const ending = text.match(/week ending\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (ending) return parseMdY(ending[1]);
  return parseMdY(text);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

const AUCTION_CATTLE_HDR =
  /^(STEERS|HEIFERS)\s+-\s+(Medium and Large [12](?:-[23])?|Large [123](?:-[23])?)\s+\(Per Cwt\s*\/\s*Actual Wt\)/i;
const AUCTION_CATTLE_ROW =
  /^(\d+)\s+(\d+)(?:-(\d+))?\s+(\d+)\s+(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?\s+(\d+(?:\.\d+)?)/;

export function looksLikeCattleAuction(text: string): boolean {
  return /Livestock Weighted Average Report for/i.test(text) || /\(Per Cwt\s*\/\s*Actual Wt\)/i.test(text);
}

export function parseCattleAuctionReport(text: string, report: LeftoverReport, sourceUrl: string): LeftoverTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const source = `USDA AMS ${report.title} Report (AMS_${report.slug})`;
  const out: LeftoverTick[] = [];
  let sex = "";
  let grade = "";
  let inFeeder = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (/^FEEDER CATTLE\b/i.test(line)) {
      inFeeder = true;
      sex = "";
      grade = "";
      continue;
    }
    if (/^(SLAUGHTER|REPLACEMENT|FEEDER SHEEP|SLAUGHTER SHEEP|SLAUGHTER GOAT)/i.test(line)) {
      inFeeder = false;
      sex = "";
      grade = "";
      continue;
    }
    const hdr = line.match(AUCTION_CATTLE_HDR);
    if (hdr) {
      sex = hdr[1];
      grade = hdr[2];
      inFeeder = true;
      continue;
    }
    if (/\(Per Cwt/i.test(line) && /^(DAIRY|BEEF\/DAIRY|COWS|BULLS|PAIRS|STOCK|BRED)/i.test(line)) {
      sex = "";
      continue;
    }
    if (!sex || !inFeeder) continue;
    const row = line.match(AUCTION_CATTLE_ROW);
    if (!row) continue;
    const head = Number(row[1]);
    const wt = Number(row[4]);
    const lo = Number(row[5]);
    const hi = row[6] ? Number(row[6]) : lo;
    const avg = Number(row[7]);
    if (!Number.isFinite(avg) || avg < 20 || avg > 900) continue;
    if (!Number.isFinite(wt) || wt < 250 || wt > 1050) continue;
    const sexTok = /heifer/i.test(sex) ? "feeder-heifer" : "feeder-steer";
    const gradeTok = /2-3/.test(grade)
      ? "ml23"
      : /1-2/.test(grade)
        ? "ml12"
        : /large 3/i.test(grade)
          ? "l3"
          : /large 2/i.test(grade)
            ? "ml2"
            : /medium and large 2/i.test(grade)
              ? "ml2"
              : "ml1";
    const id = ["cattle", `ams_${report.slug}`, token(report.region), sexTok, gradeTok, `${wt}lb`].join(".");
    out.push({
      id,
      group: "cattle",
      commodity: /heifer/i.test(sex) ? "Heifers" : "Steers",
      label: `${report.title} ${sex} ${grade} ${wt} lb`,
      market: report.title,
      classGrade: `USDA ${grade}, ${wt} lb, ${head} head`,
      unit: "$/cwt",
      price: roundMoney(avg),
      lo,
      hi,
      asOf,
      source,
      sourceUrl,
      reportDate: asOf,
      series: id,
    });
  }
  const seen = new Set<string>();
  return out.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export function jsonDumpsBody(raw: string): boolean {
  const text = raw.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return false;
  try {
    const parsed = JSON.parse(text) as unknown;
    const blob = JSON.stringify(parsed).toLowerCase();
    if (blob.includes("access is denied") || blob.includes("errorcode\":403")) return false;
    return /\b(price|avg_price|weighted_avg|feeder cattle|steers)\b/.test(blob) && blob.length > 400;
  } catch {
    return false;
  }
}

export async function leakTestSlug(slug: string): Promise<{ ok: boolean; reason: string }> {
  const url = MARS_REPORT(slug);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "bnm-data-shop/1.0 (ams-leftover-leak)" },
    });
    const body = await res.text();
    if (jsonDumpsBody(body)) {
      return { ok: false, reason: `marsapi ${res.status} already dumps the report body — skip wrap` };
    }
    if (res.status === 403 || res.status === 401) {
      return { ok: true, reason: `marsapi HTTP ${res.status} keyed/denied — PDF collect is not a wrap` };
    }
    return { ok: true, reason: `marsapi HTTP ${res.status} is not a price-body dump` };
  } catch (err) {
    return { ok: true, reason: `marsapi fetch failed (${err instanceof Error ? err.message : "error"}) — not a JSON dump` };
  }
}

export async function fetchOfficialPdf(slug: string): Promise<{ url: string; bytes: Buffer } | { url: string; error: string }> {
  const url = MNREPORTS_PDF(slug);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/pdf", "User-Agent": "bnm-data-shop/1.0 (ams-leftover-collect)" },
      redirect: "follow",
    });
    const bytes = Buffer.from(await res.arrayBuffer());
    if (res.status !== 200 || bytes.subarray(0, 4).toString() !== "%PDF") {
      return { url, error: `HTTP ${res.status} ${res.headers.get("content-type") || ""}`.trim() };
    }
    return { url, bytes };
  } catch (err) {
    return { url, error: err instanceof Error ? err.message : "fetch failed" };
  }
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

export async function collectLeftovers(reports: readonly LeftoverReport[] = AMS_LEFTOVER_REPORTS): Promise<{
  ok: true;
  product: typeof PRODUCT_ID;
  fetchedAt: string;
  tickCount: number;
  rows: LeftoverTick[];
  failed: LeftoverFailed[];
  sources: string[];
  leakSkipped: string[];
}> {
  const rows: LeftoverTick[] = [];
  const failed: LeftoverFailed[] = [];
  const leakSkipped: string[] = [];
  const sources: string[] = [];
  for (const report of reports) {
    const leak = await leakTestSlug(report.slug);
    if (!leak.ok) {
      leakSkipped.push(`AMS_${report.slug}: ${leak.reason}`);
      continue;
    }
    const pdf = await fetchOfficialPdf(report.slug);
    if ("error" in pdf) {
      failed.push({
        id: `AMS_${report.slug}`,
        source: report.title,
        sourceUrl: pdf.url,
        reason: pdf.error,
      });
      continue;
    }
    let text: string;
    try {
      text = pdftotext(pdf.bytes);
    } catch (err) {
      failed.push({
        id: `AMS_${report.slug}`,
        source: report.title,
        sourceUrl: pdf.url,
        reason: err instanceof Error ? err.message : "pdftotext failed",
      });
      continue;
    }
    const parsed = parseCattleAuctionReport(text, report, pdf.url);
    if (parsed.length === 0) {
      failed.push({
        id: `AMS_${report.slug}`,
        source: report.title,
        sourceUrl: pdf.url,
        reason: "official PDF parsed 0 feeder ticks (do not invent)",
      });
      continue;
    }
    rows.push(...parsed);
    sources.push(`USDA AMS ${report.title} Report (AMS_${report.slug})`);
  }
  return {
    ok: true,
    product: PRODUCT_ID,
    fetchedAt: new Date().toISOString(),
    tickCount: rows.length,
    rows,
    failed,
    sources,
    leakSkipped,
  };
}

async function main(): Promise<void> {
  const snapshot = await collectLeftovers();
  const dir = leftoverDir();
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, "snapshot.json");
  writeFileSync(dest, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        dest,
        tickCount: snapshot.tickCount,
        sources: snapshot.sources.length,
        failed: snapshot.failed.map((f) => `${f.id}: ${f.reason}`),
        leakSkipped: snapshot.leakSkipped,
        payTo: PAY_TO,
        sku: "/ticks $0.05 tableWhole",
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
