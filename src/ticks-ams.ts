/**
 * Nationwide USDA AMS hay / cattle / grain report bodies for the existing GET /ticks door.
 * Official PDFs (and NAL/esmis archive copies). Same product: idaho-hay-feeder-ticks.
 * Does not open a new SKU. Does not wrap marsapi (403 without a key), LMR datamart JSON,
 * NASS Quick Stats, WASDE/PSD/ESR, the National Feeder dashboard, or SJ_LS850.txt.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const PRODUCT_ID = "idaho-hay-feeder-ticks";
export const ESMIS_HOST = "https://esmis.nal.usda.gov";
export const MNREPORTS_PDF = (slug: string) =>
  `https://www.ams.usda.gov/mnreports/AMS_${slug}.pdf`;
export const VIEW_REPORT = (slug: string) =>
  `https://mymarketnews.ams.usda.gov/viewReport/${slug}`;

const HTTP_UA = "bnm-data-shop/1.0 (USDA AMS public market-report PDFs; +https://www.ams.usda.gov/market-news/hay-reports)";

export type AmsGroup = "hay" | "cattle" | "grain";

export type AmsReport = {
  slug: string;
  group: AmsGroup;
  region: string;
  title: string;
  esmisPublication: string;
};

/** Already on /ticks: 3056 Idaho hay, 3058 Columbia Basin hay, 3059 NW cattle. Not listed again. */
export const AMS_NATIONAL_REPORTS: readonly AmsReport[] = [
  { slug: "2904", group: "hay", region: "california", title: "California Direct Hay", esmisPublication: "california-direct-hay-report" },
  { slug: "2707", group: "hay", region: "texas", title: "Texas Direct Hay", esmisPublication: "texas-direct-hay-report" },
  { slug: "2885", group: "hay", region: "kansas", title: "Kansas Direct Hay", esmisPublication: "kansas-direct-hay-report" },
  { slug: "2935", group: "hay", region: "nebraska", title: "Nebraska Direct Hay", esmisPublication: "nebraska-direct-hay-report" },
  { slug: "2710", group: "cattle", region: "texas", title: "Texas Direct Cattle", esmisPublication: "texas-direct-cattle-report" },
  { slug: "3097", group: "cattle", region: "kansas", title: "Kansas Direct Feeder Cattle", esmisPublication: "kansas-direct-cattle-report" },
  { slug: "3098", group: "cattle", region: "oklahoma", title: "Oklahoma Direct Feeder Cattle", esmisPublication: "oklahoma-direct-cattle-report" },
  { slug: "3148", group: "grain", region: "portland", title: "Portland Daily Grain Bids", esmisPublication: "portland-daily-grain-bids" },
  { slug: "3046", group: "grain", region: "minneapolis", title: "Minneapolis Daily Grain", esmisPublication: "minneapolis-daily-grain-report" },
  { slug: "3223", group: "grain", region: "kansas_city", title: "Kansas City Daily Grain Bids", esmisPublication: "kansas-city-daily-grain-bids" },
];

export const SKIPPED_SOURCES = [
  { id: "marsapi", why: "marsapi.ams.usda.gov/services/v1.1/reports/{slug} returns HTTP 403 without an API key — not a no-auth JSON body" },
  { id: "lmr-datamart", why: "mpr.datamart.ams.usda.gov already exposes LMR cattle as no-auth JSON — skip wrapping that body" },
  { id: "feeder-dashboard", why: "National Feeder & Stocker Cattle Dashboard is a web app, not an ugly PDF/HTML report body" },
  { id: "SJ_LS850", why: "https://www.ams.usda.gov/mnreports/SJ_LS850.txt already returns the official plaintext body" },
  { id: "nass-quick-stats", why: "documented no-auth JSON API — KILL" },
  { id: "wasde-psd-esr", why: "documented no-auth USDA JSON/CSV — KILL" },
  { id: "hay-auction-barns", why: "local AMS hay-auction PDFs would be 50-state doors; this pass is regional Direct reports" },
  { id: "ams_3056_3058_3059", why: "already collected on /ticks (Idaho hay, Columbia Basin hay, NW Direct cattle)" },
] as const;

export type AmsTick = {
  id: string;
  group: AmsGroup;
  commodity: string;
  label: string;
  market: string;
  classGrade: string;
  unit: string;
  price: number;
  lo?: number;
  hi?: number;
  asOf: string;
  source: string;
  sourceUrl: string;
  reportDate: string;
  series: string;
};

export type AmsFailed = {
  id: string;
  source: string;
  sourceUrl: string;
  reason: string;
};

export type AmsSnapshot = {
  ok: true;
  product: typeof PRODUCT_ID;
  fetchedAt: string;
  asOf: string | null;
  tickCount: number;
  rows: AmsTick[];
  failed: AmsFailed[];
  sources: string[];
};

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function amsNationalDir(): string {
  if (env("TICKS_AMS_DIR")) return resolve(env("TICKS_AMS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ticks-ams"));
}

export function amsSnapshotPath(dir = amsNationalDir()): string {
  return join(dir, "snapshot.json");
}

export function token(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&nbsp;/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function parseMdY(raw: string): string | null {
  const m = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!m) return null;
  const day = `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const y = Number(m[3]);
  return y >= 1990 && y <= 2100 ? day : null;
}

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

export function parseReportDate(text: string): string | null {
  const ending = text.match(/week ending\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (ending) return parseMdY(ending[1]);
  const grain = text.match(/Grain Report for\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (grain) return parseMdY(grain[1]);
  const named = text.match(
    /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),\s+(\d{4})\b/i,
  );
  if (named) {
    const mon = MONTHS[named[1].toLowerCase()];
    if (mon) return `${named[3]}-${mon}-${named[2].padStart(2, "0")}`;
  }
  return parseMdY(text);
}

export function parseMoney(raw: string): { lo: number; hi: number; mid: number } | null {
  const m = raw.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/);
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = m[2] ? Number(m[2]) : lo;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return { lo, hi, mid: (lo + hi) / 2 };
}

export function esmisPdfUrls(html: string, slug: string): string[] {
  const re = new RegExp(
    `href="(/sites/default/release-files/[^"]+/AMS_${slug}\\.PDF)"`,
    "gi",
  );
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(re)) {
    const url = match[1].startsWith("http") ? match[1] : `${ESMIS_HOST}${match[1]}`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function latestEsmisPdfUrl(html: string, slug: string): string | null {
  return esmisPdfUrls(html, slug)[0] ?? null;
}

export function esmisPublicationUrl(report: AmsReport): string {
  return `${ESMIS_HOST}/publication/${report.esmisPublication}`;
}

const PACKAGE_RE =
  /\b(Large Square(?:\s+3x4)?|Small Square(?:\s+3 Tie)?|Large Round|Standing)\b/i;

function hayRegion(line: string): string | null {
  const m = line.match(/^(.+?)\s+Hay\s*(?:\((Conventional|Organic)\))?\s*$/i);
  if (!m) return null;
  const name = m[1].replace(/^#+\s*/, "").trim();
  if (/direct hay weighted|compared to|please note|volume|tons:|bales:/i.test(name)) return null;
  if (name.length > 60) return null;
  return m[2] ? `${name} (${m[2]})` : name;
}

function hayPlaceLine(line: string): string | null {
  if (line.length < 3 || line.length > 48) return null;
  if (/\d|\$/.test(line)) return null;
  if (
    /alfalfa|bermuda|orchard|qty|price|source:|compared|direct hay|email us|usda |volume|please note|freight|crop age/i.test(
      line,
    )
  ) {
    return null;
  }
  return line;
}

function hayKindLine(line: string): string | null {
  const m = line.match(/^Hay\s*\((Conventional|Organic)\)\s*$/i);
  return m ? m[1] : null;
}

function hayClass(line: string): { commodity: string; grade: string; unit: string } | null {
  const m = line.match(
    /^([A-Za-z][A-Za-z0-9 /]+?)\s+-\s+([A-Za-z][A-Za-z/ ]+?)\s+\((?:Ask|Trade|Contract \(Trade\))\/Per\s+(Ton|Bale)\)/i,
  );
  if (!m) return null;
  return { commodity: m[1].trim(), grade: m[2].trim(), unit: m[3].toLowerCase() === "ton" ? "$/ton" : "$/bale" };
}

export function parseHayReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const source = `USDA AMS ${report.title} Report (AMS_${report.slug})`;
  const out: AmsTick[] = [];
  let region = report.region;
  let pendingPlace = "";
  let cls: { commodity: string; grade: string; unit: string } | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const nextRegion = hayRegion(line);
    if (nextRegion) {
      region = nextRegion;
      pendingPlace = "";
      cls = null;
      continue;
    }
    const kind = hayKindLine(line);
    if (kind && pendingPlace) {
      region = `${pendingPlace} (${kind})`;
      pendingPlace = "";
      cls = null;
      continue;
    }
    const place = hayPlaceLine(line);
    if (place) pendingPlace = place;
    const nextCls = hayClass(line);
    if (nextCls) {
      cls = nextCls;
      const inlinePkg = line.match(PACKAGE_RE);
      if (inlinePkg) parseHayRow(line, inlinePkg[1], cls, region, asOf, report, source, sourceUrl, out);
      continue;
    }
    if (!cls) continue;
    const pkg = line.match(PACKAGE_RE);
    if (!pkg) continue;
    parseHayRow(line, pkg[1], cls, region, asOf, report, source, sourceUrl, out);
  }
  return dedupeTicks(out);
}

function parseHayRow(
  line: string,
  pkg: string,
  cls: { commodity: string; grade: string; unit: string },
  region: string,
  asOf: string,
  report: AmsReport,
  source: string,
  sourceUrl: string,
  out: AmsTick[],
): void {
  if (/\borganic\b/i.test(`${region} ${cls.commodity} ${cls.grade} ${line}`)) return;
  const afterPkg = line.slice(line.toLowerCase().indexOf(pkg.toLowerCase()) + pkg.length);
  const nums = [...afterPkg.matchAll(/\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?/g)].map((m) => m[0]);
  const money = nums
    .map((n) => parseMoney(n))
    .filter((n): n is NonNullable<typeof n> => n !== null && n.mid >= 5 && n.mid <= 800);
  if (money.length === 0) return;
  const chosen = money.find((n) => !n.lo.toString().includes(".") && n.mid >= 20) && money.length > 1
    ? money[money.length - 1]
    : money[money.length > 1 ? money.length - 1 : 0];
  // Prefer an explicit weighted average (single value after a range) when present.
  const wtd = money.find((n, i) => i > 0 && n.lo === n.hi && money[0].lo !== money[0].hi) ?? chosen;
  const id = [
    "hay",
    `ams_${report.slug}`,
    token(report.region),
    token(region.replace(/\s*\((?:conventional|organic)\)/i, "")),
    token(cls.commodity),
    token(cls.grade),
    token(pkg),
  ].join(".");
  out.push({
    id,
    group: "hay",
    commodity: cls.commodity,
    label: `${region} ${cls.commodity} ${cls.grade} ${pkg}`,
    market: `${report.title} — ${region}`,
    classGrade: `${cls.grade}, ${pkg}`,
    unit: cls.unit,
    price: roundMoney(wtd.mid),
    lo: wtd.lo,
    hi: wtd.hi,
    asOf,
    source,
    sourceUrl,
    reportDate: asOf,
    series: id,
  });
}

export function parseCattleReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const source = `USDA AMS ${report.title} Report (AMS_${report.slug})`;
  const out: AmsTick[] = [];
  let sex = "";
  let grade = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const hdr = line.match(/^(Steers|Heifers)\s+-\s+(Medium and Large [12](?:-2)?)\s+\(Per Cwt\)/i);
    if (hdr) {
      sex = hdr[1];
      grade = hdr[2];
      continue;
    }
    if (!sex || !/^Current FOB\b/i.test(line)) continue;
    const row = line.match(
      /^Current FOB\s+(\d+)\s+(\d+)(?:\s*-\s*(\d+))?\s+(\d+)\s+(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s+(\d+(?:\.\d+)?)/i,
    );
    if (!row) continue;
    const head = Number(row[1]);
    const wt = Number(row[4]);
    const lo = Number(row[5]);
    const hi = row[6] ? Number(row[6]) : lo;
    const avg = Number(row[7]);
    if (!Number.isFinite(avg) || avg < 20 || avg > 900) continue;
    const sexTok = /heifer/i.test(sex) ? "feeder-heifer" : "feeder-steer";
    const gradeTok = /1-2/.test(grade) ? "ml12" : /large 2/i.test(grade) ? "ml2" : "ml1";
    const id = ["cattle", `ams_${report.slug}`, token(report.region), sexTok, gradeTok, `${wt}lb`].join(".");
    out.push({
      id,
      group: "cattle",
      commodity: `${sex}`,
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
  const headlines = headlineCattle(out, report, source, sourceUrl, asOf);
  return dedupeTicks([...headlines, ...out]);
}

function headlineCattle(
  rows: AmsTick[],
  report: AmsReport,
  source: string,
  sourceUrl: string,
  asOf: string,
): AmsTick[] {
  const out: AmsTick[] = [];
  for (const sexTok of ["feeder-steer", "feeder-heifer"] as const) {
    const subset = rows.filter((r) => r.id.includes(`.${sexTok}.ml1.`));
    if (subset.length === 0) continue;
    const heads = subset.map((r) => Number(r.classGrade.match(/(\d+) head/)?.[1] ?? 0));
    const total = heads.reduce((a, b) => a + b, 0) || subset.length;
    const price =
      subset.reduce((sum, r, i) => sum + r.price * (heads[i] || 1), 0) / total;
    const id = ["cattle", `ams_${report.slug}`, token(report.region), `${sexTok}s-ml1`].join(".");
    out.push({
      id,
      group: "cattle",
      commodity: sexTok.includes("heifer") ? "Feeder heifers" : "Feeder steers",
      label: `${report.title} ${sexTok.includes("heifer") ? "feeder heifers" : "feeder steers"} ML1`,
      market: report.title,
      classGrade: `USDA Medium and Large 1, ${subset.length} Current FOB prints, ${total} head`,
      unit: "$/cwt",
      price: roundMoney(price),
      asOf,
      source,
      sourceUrl,
      reportDate: asOf,
      series: id,
    });
  }
  return out;
}

export function parseGrainReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const source = `USDA AMS ${report.title} Report (AMS_${report.slug})`;
  const out: AmsTick[] = [];
  let commodity = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const hdr = line.match(/^(?:US\s+#\d+|No\.\s*\d+)\s+(.+?)(?:\s+\(Bulk\))?$/i);
    if (hdr && !/elevator|region\/location|pacific ports/i.test(line)) {
      commodity = hdr[1].replace(/\s+\(Bulk\)$/i, "").trim();
      continue;
    }
    if (!commodity || !/\bCurrent\b/.test(line) || !/Bid\b/i.test(line)) continue;
    const afterUnch = line.match(/\bUNCH\s+(\d+\.\d{2,4})(?:-(\d+\.\d{2,4}))?/);
    const afterMove = line.match(/\b(?:UP|DN)\s+\d+\.\d+\s+(\d+\.\d{2,4})(?:-(\d+\.\d{2,4}))?/);
    const picked = afterUnch ?? afterMove;
    const money = picked
      ? parseMoney(picked[2] ? `${picked[1]}-${picked[2]}` : picked[1])
      : parseMoney(line.match(/(\d+\.\d{2,4}(?:-\d+\.\d{2,4})?)/)?.[1] ?? "");
    if (!money || money.mid < 0.5 || money.mid > 30) continue;
    const protein = line.match(/\b(\d{1,2}\.\d%)\b/)?.[1] ?? line.match(/\bOrdinary\b/i)?.[0] ?? "";
    const id = ["grain", `ams_${report.slug}`, token(report.region), token(commodity), token(protein || "current")].join(".");
    out.push({
      id,
      group: "grain",
      commodity,
      label: `${report.title} ${commodity}${protein ? ` ${protein}` : ""}`,
      market: report.title,
      classGrade: protein ? `${commodity}, ${protein}, Current bid` : `${commodity}, Current bid`,
      unit: "$/bu",
      price: roundMoney(money.mid),
      lo: money.lo,
      hi: money.hi,
      asOf,
      source,
      sourceUrl,
      reportDate: asOf,
      series: id,
    });
  }
  return dedupeTicks(out);
}

export function parseAmsReportText(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  if (report.group === "hay") return parseHayReport(text, report, sourceUrl);
  if (report.group === "cattle") return parseCattleReport(text, report, sourceUrl);
  return parseGrainReport(text, report, sourceUrl);
}

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function dedupeTicks(rows: AmsTick[]): AmsTick[] {
  const seen = new Set<string>();
  const out: AmsTick[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("TICKS_AMS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw new Error(`pdftotext failed: ${result.error.message}`);
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim() || `exit ${result.status}`;
    throw new Error(`pdftotext failed: ${err}`);
  }
  return result.stdout || "";
}

function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

async function fetchBytes(url: string): Promise<{ url: string; bytes: Uint8Array; contentType: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,application/octet-stream,*/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { url: res.url || url, bytes, contentType: res.headers.get("content-type") ?? "" };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": HTTP_UA, Accept: "text/html,*/*" } });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function officialPdfCandidates(report: AmsReport): Promise<string[]> {
  const urls = [MNREPORTS_PDF(report.slug)];
  try {
    const html = await fetchText(esmisPublicationUrl(report));
    urls.unshift(...esmisPdfUrls(html, report.slug));
  } catch {
    /* mnreports still tried */
  }
  return [...new Set(urls)];
}

export async function resolveOfficialPdfUrl(report: AmsReport): Promise<string> {
  return (await officialPdfCandidates(report))[0] ?? MNREPORTS_PDF(report.slug);
}

export function readAmsSnapshot(dir = amsNationalDir()): AmsSnapshot | null {
  const path = amsSnapshotPath(dir);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const rows = Array.isArray((parsed as AmsSnapshot).rows) ? (parsed as AmsSnapshot).rows : [];
    return { ...(parsed as AmsSnapshot), rows };
  } catch {
    return null;
  }
}

export function writeAmsSnapshot(snap: AmsSnapshot, dir = amsNationalDir()): string {
  mkdirSync(dir, { recursive: true });
  const path = amsSnapshotPath(dir);
  writeFileSync(path, `${JSON.stringify(snap, null, 2)}\n`);
  return path;
}

export function mergeAmsNationalTicks<T extends {
  ticks?: unknown[];
  failed?: unknown[];
  sources?: string[];
  status?: string;
  reason?: string | null;
}>(payload: T, snap: AmsSnapshot | null = readAmsSnapshot()): T {
  if (!snap || snap.rows.length === 0) return payload;
  const ticks = Array.isArray(payload.ticks) ? [...payload.ticks] : [];
  const have = new Set(
    ticks
      .map((row) => (row && typeof row === "object" ? String((row as { id?: unknown }).id ?? "") : ""))
      .filter(Boolean),
  );
  for (const row of snap.rows) {
    if (have.has(row.id)) continue;
    ticks.push(row);
    have.add(row.id);
  }
  const failed = Array.isArray(payload.failed) ? [...payload.failed] : [];
  const failedIds = new Set(
    failed
      .map((row) => (row && typeof row === "object" ? String((row as { id?: unknown }).id ?? "") : ""))
      .filter(Boolean),
  );
  for (const row of snap.failed) {
    if (failedIds.has(row.id)) continue;
    failed.push(row);
    failedIds.add(row.id);
  }
  const sources = [...(payload.sources ?? [])];
  for (const name of snap.sources) {
    if (!sources.includes(name)) sources.push(name);
  }
  const hasTicks = ticks.length > 0;
  return {
    ...payload,
    ticks,
    failed,
    sources,
    status: hasTicks ? "ok" : payload.status,
    reason: hasTicks ? null : payload.reason,
  };
}

export async function collectAmsNational(opts?: { dir?: string; pauseMs?: number }): Promise<AmsSnapshot> {
  const dir = opts?.dir ?? amsNationalDir();
  const pauseMs = opts?.pauseMs ?? Number(env("TICKS_AMS_PAUSE_MS") || "1200");
  const rows: AmsTick[] = [];
  const failed: AmsFailed[] = [];
  const sources: string[] = [];
  mkdirSync(dir, { recursive: true });
  const tmpDir = join(dir, "tmp");
  mkdirSync(tmpDir, { recursive: true });

  for (const report of AMS_NATIONAL_REPORTS) {
    const label = `AMS_${report.slug} ${report.title}`;
    const candidates = await officialPdfCandidates(report);
    let parsed: AmsTick[] = [];
    let usedUrl = candidates[0] ?? MNREPORTS_PDF(report.slug);
    let lastErr = "";
    for (const pdfUrl of candidates) {
      try {
        const fetched = await fetchBytes(pdfUrl);
        if (!isPdf(fetched.bytes)) {
          lastErr = `official host did not return a PDF (content-type ${fetched.contentType || "unknown"})`;
          continue;
        }
        const pdfPath = join(tmpDir, `AMS_${report.slug}.pdf`);
        writeFileSync(pdfPath, fetched.bytes);
        const text = pdfToText(pdfPath);
        parsed = parseAmsReportText(text, report, pdfUrl);
        usedUrl = pdfUrl;
        if (parsed.length > 0) break;
        lastErr = "official PDF had no parseable hay/cattle/grain print";
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
      }
    }
    if (parsed.length > 0) {
      rows.push(...parsed);
      sources.push(label);
    } else {
      failed.push({
        id: `ams_${report.slug}`,
        source: label,
        sourceUrl: usedUrl,
        reason: lastErr || "no official PDF body",
      });
    }
    if (pauseMs > 0) await pause(pauseMs);
  }

  const asOf = rows.map((r) => r.asOf).sort().at(-1) ?? null;
  const snap: AmsSnapshot = {
    ok: true,
    product: PRODUCT_ID,
    fetchedAt: new Date().toISOString(),
    asOf,
    tickCount: rows.length,
    rows,
    failed,
    sources,
  };
  writeAmsSnapshot(snap, dir);
  return snap;
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectAmsNational()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            product: snap.product,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            tickCount: snap.tickCount,
            sources: snap.sources,
            failed: snap.failed,
            snapshot: amsSnapshotPath(),
            ids: snap.rows.map((r) => r.id),
          },
          null,
          2,
        ),
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

