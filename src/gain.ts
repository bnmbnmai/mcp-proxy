/**
 * USDA FAS GAIN attaché report TEXT door.
 * Official attaché PDFs via gain.fas.usda.gov/Download.aspx or the
 * no-auth DownloadReportByFileName PDF of the same report.
 * 17 U.S.C. § 105. Does not invent report text.
 * Does not wrap WASDE / PSD / ESR or FAS Open Data GATS numbers.
 * Public search HTML is the index, not the sold body.
 * newgainapi token / GetRecentReports is staff OAuth, not this SKU.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function paidBodyCatalogNote(path: string, detail: string): string {
  return `Free index for ${path}. ${detail} GET ${path}?id= is one official text ($0.02). Plain GET ${path} is the newest 10 official texts ($0.05).`;
}

export const GAIN_PATH = "/gain";
export const GAIN_MANIFEST_PATH = "/gain/manifest.json";
export const GAIN_AMOUNT_ATOMIC = "50000";
export const GAIN_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "gain-attache-report-bodies";
export const PRODUCT_NAME = "USDA FAS GAIN attaché report TEXT";

export const HUB_URL = "https://gain.fas.usda.gov/";
export const SCHEDULE_URL = "https://gain.fas.usda.gov/assets/GAIN%20Report%20Schedule.pdf";
export const DOWNLOAD_ORIGIN = "https://gain.fas.usda.gov";
export const FILENAME_ORIGIN = "https://apps.fas.usda.gov";
export const LICENSE = "17 U.S.C. § 105 (U.S. government work; public domain)";
export const ATTRIBUTION =
  "USDA Foreign Agricultural Service, Global Agricultural Information Network (GAIN). U.S. government work. 17 U.S.C. § 105.";

export const CARD_FIELDS = [
  "id",
  "reportNumber",
  "country",
  "post",
  "date",
  "category",
  "title",
  "pageUrl",
  "sourceUrl",
  "body",
] as const;

export const ATTACHE_CATEGORIES = [
  "Grain and Feed",
  "Livestock and Products",
  "Poultry and Products",
  "Oilseeds and Products",
] as const;

export type GainCategory = (typeof ATTACHE_CATEGORIES)[number];

export type GainListing = {
  id: string;
  reportNumber: string;
  country: string;
  post: string;
  date: string | null;
  category: GainCategory | string;
  title: string;
  pageUrl: string;
  sourceUrl: string;
};

export type GainCard = GainListing & { body: string };

export type GainSnapshot = {
  ok: true;
  product: typeof PRODUCT_ID;
  status: "ok" | "empty" | "stale";
  reason: string | null;
  fetchedAt: string;
  asOf: string | null;
  license: typeof LICENSE;
  attribution: typeof ATTRIBUTION;
  listedCount?: number;
  fetchedPdfs?: number;
  skippedNoText?: number;
  reused?: number;
  addedThisRun?: number;
  sources: { index: string; pdfHost: string; schedule: string };
  cards: GainCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (GAIN attaché texts; +https://gain.fas.usda.gov/)";
const MIN_BODY_CHARS = 2500;
const REPORT_NUMBER_RE = /(?:^|[^A-Za-z0-9])([A-Z]{2}\d{4}-\d{4}|[A-Z]\d{5}-\d{4})(?:[^A-Za-z0-9]|$)/;
const DOWNLOAD_HOSTS = new Set(["gain.fas.usda.gov"]);
const FILENAME_HOSTS = new Set(["apps.fas.usda.gov"]);
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KILL_HOST_PATH =
  /\/(?:opendataweb|gats|esrquery|psdonline|newgainapi\/token|report\/getrecentreports|report\/downloadpublishedreportpdf)\b/i;
const WASDE_PSD_ESR_GATS =
  /\b(WASDE|World Agricultural Supply and Demand Estimates|PSD Online|psdonline|Export Sales Report|\bESR\b|GATS|Global Agricultural Trade System)\b/i;
const HTML_TEASER =
  /\b(link to report|search reports|attach[eé] report \(gain\)|loading\.\.\.|database source)\b/i;
const NEWS_GDELT = /\b(GDELT|news wire|headline cluster|article url)\b/i;

export const SEED_LISTINGS: GainListing[] = [
  {
    id: "MX2026-0040",
    reportNumber: "MX2026-0040",
    country: "Mexico",
    post: "Mexico City",
    date: "2026-08-24",
    category: "Livestock and Products",
    title: "Livestock and Products Annual",
    pageUrl: "https://www.fas.usda.gov/data/gain/2026/08/mexico-livestock-and-products-annual",
    sourceUrl: filenamePdfUrl("Livestock and Products Annual_Mexico City_Mexico_MX2026-0040.pdf"),
  },
  {
    id: "CH2026-0087",
    reportNumber: "CH2026-0087",
    country: "China - People's Republic of",
    post: "Beijing",
    date: "2026-07-13",
    category: "Poultry and Products",
    title: "Poultry and Products Annual",
    pageUrl: "https://www.fas.usda.gov/data/gain/2026/07/china-poultry-and-products-annual",
    sourceUrl: filenamePdfUrl(
      "Poultry and Products Annual_Beijing_China - People's Republic of_CH2026-0087.pdf",
    ),
  },
  {
    id: "CA2026-0008",
    reportNumber: "CA2026-0008",
    country: "Canada",
    post: "Ottawa",
    date: "2026-04-23",
    category: "Oilseeds and Products",
    title: "Oilseeds and Products Annual",
    pageUrl: "https://www.fas.usda.gov/data/gain/2026/04/canada-oilseeds-and-products-annual",
    sourceUrl: filenamePdfUrl("Oilseeds and Products Annual_Ottawa_Canada_CA2026-0008.pdf"),
  },
  {
    id: "E42026-0034",
    reportNumber: "E42026-0034",
    country: "European Union",
    post: "Madrid",
    date: "2026-04-20",
    category: "Grain and Feed",
    title: "Grain and Feed Annual",
    pageUrl: "https://www.fas.usda.gov/data/gain/2026/04/european-union-grain-and-feed-annual",
    sourceUrl: filenamePdfUrl("Grain and Feed Annual_Madrid_European Union_E42026-0034.pdf"),
  },
  {
    id: "VM2026-0012",
    reportNumber: "VM2026-0012",
    country: "Vietnam",
    post: "Ho Chi Minh City",
    date: "2026-04-15",
    category: "Grain and Feed",
    title: "Grain and Feed Annual",
    pageUrl: "https://www.fas.usda.gov/data/gain/2026/04/vietnam-grain-and-feed-annual",
    sourceUrl: filenamePdfUrl("Grain and Feed Annual_Ho Chi Minh City_Vietnam_VM2026-0012.pdf"),
  },
  {
    id: "AR2026-0005",
    reportNumber: "AR2026-0005",
    country: "Argentina",
    post: "Buenos Aires",
    date: "2026-04-09",
    category: "Oilseeds and Products",
    title: "Oilseeds and Products Annual",
    pageUrl: "https://www.fas.usda.gov/data/gain/2026/04/argentina-oilseeds-and-products-annual",
    sourceUrl: filenamePdfUrl("Oilseeds and Products Annual_Buenos Aires_Argentina_AR2026-0005.pdf"),
  },
  {
    id: "TU2026-0013",
    reportNumber: "TU2026-0013",
    country: "Turkiye",
    post: "Ankara",
    date: "2026-04-08",
    category: "Grain and Feed",
    title: "Grain and Feed Annual",
    pageUrl: "https://www.fas.usda.gov/data/gain/2026/04/turkiye-grain-and-feed-annual",
    sourceUrl: filenamePdfUrl("Grain and Feed Annual_Ankara_Turkiye_TU2026-0013.pdf"),
  },
  {
    id: "CA2026-0006",
    reportNumber: "CA2026-0006",
    country: "Canada",
    post: "Ottawa",
    date: "2026-04-01",
    category: "Livestock and Products",
    title: "Livestock and Products Semi-Annual",
    pageUrl: "https://www.fas.usda.gov/data/gain/2026/04/canada-livestock-and-products-semi-annual",
    sourceUrl: filenamePdfUrl("Livestock and Products Semi-Annual_Ottawa_Canada_CA2026-0006.pdf"),
  },
];

export function filenamePdfUrl(fileName: string): string {
  return `${FILENAME_ORIGIN}/newgainapi/api/Report/DownloadReportByFileName?fileName=${encodeURIComponent(fileName)}`;
}

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function gainDir(): string {
  if (env("GAIN_DIR")) return resolve(env("GAIN_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/gain"));
}

export function snapshotPath(): string {
  return join(gainDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/gain/seed-snapshot.json"),
    join(here, "fixtures/gain/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function categoryFromBlob(raw: string): GainCategory | null {
  const t = String(raw || "");
  if (/\bgrain and feed\b/i.test(t)) return "Grain and Feed";
  if (/\blivestock and products\b/i.test(t)) return "Livestock and Products";
  if (/\bpoultry and products\b/i.test(t)) return "Poultry and Products";
  if (/\boilseeds and products\b/i.test(t)) return "Oilseeds and Products";
  return null;
}

export function isAttacheCategory(raw: string | null | undefined): raw is GainCategory {
  return ATTACHE_CATEGORIES.includes(String(raw || "") as GainCategory);
}

export function isKillWrapUrl(url: string | null | undefined): boolean {
  const t = String(url || "");
  if (KILL_HOST_PATH.test(t)) return true;
  if (/apps\.fas\.usda\.gov\/(?:opendataweb|gats|esrquery|psdonline)\b/i.test(t)) return true;
  if (/fas\.usda\.gov\/(?:psd|esr|wasde|opendata)\b/i.test(t)) return true;
  return false;
}

export function officialGainPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath || isKillWrapUrl(urlOrPath)) return null;
  try {
    const u = new URL(urlOrPath, DOWNLOAD_ORIGIN);
    const host = u.hostname.toLowerCase();
    if (DOWNLOAD_HOSTS.has(host) && u.pathname.toLowerCase() === "/download.aspx") {
      const p = (u.searchParams.get("p") || "").trim();
      const q = (u.searchParams.get("q") || "").trim();
      if (/^\d+$/.test(p) && GUID_RE.test(q)) {
        return `${DOWNLOAD_ORIGIN}/Download.aspx?p=${p}&q=${q.toLowerCase()}`;
      }
      return null;
    }
    if (
      FILENAME_HOSTS.has(host) &&
      u.pathname === "/newgainapi/api/Report/DownloadReportByFileName"
    ) {
      const fileName = (u.searchParams.get("fileName") || "").trim();
      if (!fileName || !/\.pdf$/i.test(fileName)) return null;
      if (!categoryFromBlob(fileName)) return null;
      if (!REPORT_NUMBER_RE.test(fileName)) return null;
      return filenamePdfUrl(fileName);
    }
    return null;
  } catch {
    return null;
  }
}

export function isOfficialGainPdf(url: string | null | undefined): boolean {
  return Boolean(officialGainPdfUrl(url));
}

export function reportNumberFromUrl(url: string | null | undefined): string | null {
  const official = officialGainPdfUrl(url) || url || "";
  try {
    const u = new URL(official);
    const fileName = u.searchParams.get("fileName") || "";
    const m = fileName.match(REPORT_NUMBER_RE) || official.match(REPORT_NUMBER_RE);
    return m ? m[1] : null;
  } catch {
    const m = String(official).match(REPORT_NUMBER_RE);
    return m ? m[1] : null;
  }
}

export function parseFileNameMeta(fileName: string): Partial<GainListing> {
  const stem = fileName.replace(/\.pdf$/i, "");
  const parts = stem.split("_");
  const reportNumber = (stem.match(REPORT_NUMBER_RE) || [])[1] || "";
  return {
    id: reportNumber || stem,
    reportNumber,
    title: parts[0] || stem,
    post: parts[1] || "",
    country: parts.slice(2, -1).join("_") || "",
    category: categoryFromBlob(stem) || "",
  };
}

function snippetAround(html: string, index: number): string {
  const start = html.lastIndexOf("<li", index);
  const end = html.indexOf("</li>", index);
  if (start >= 0 && end > start) return html.slice(start, end + 5);
  return html.slice(Math.max(0, index - 180), Math.min(html.length, index + 180));
}

function reportNumberFromBlob(raw: string): string | null {
  const m = String(raw || "").match(REPORT_NUMBER_RE);
  return m ? m[1] : null;
}

export function parseHubHtml(html: string, pageUrl = HUB_URL): GainListing[] {
  const out: GainListing[] = [];
  const seen = new Set<string>();
  const hrefRe = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html))) {
    const raw = m[1].replace(/&amp;/g, "&");
    const abs = new URL(raw, pageUrl).toString();
    if (isKillWrapUrl(abs)) continue;
    const around = snippetAround(html, m.index);
    const blob = `${decodeEntities(around.replace(/<[^>]+>/g, " "))} ${abs}`;
    const category = categoryFromBlob(blob);
    if (!category) continue;
    const official = officialGainPdfUrl(abs);
    if (!official) continue;
    const meta = parseFileNameMeta(new URL(official).searchParams.get("fileName") || "");
    const id = meta.reportNumber || reportNumberFromUrl(official) || reportNumberFromBlob(blob);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      reportNumber: meta.reportNumber || id,
      country: meta.country || "",
      post: meta.post || "",
      date: isoDate(around) ?? isoDate(blob),
      category,
      title: meta.title || category,
      pageUrl,
      sourceUrl: official,
    });
  }
  return parseListingRows(out);
}

export function parseListingRows(rows: GainListing[]): GainListing[] {
  const out: GainListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const sourceUrl = officialGainPdfUrl(row.sourceUrl);
    const id = row.id || row.reportNumber || reportNumberFromUrl(sourceUrl) || "";
    const category = isAttacheCategory(row.category) ? row.category : categoryFromBlob(`${row.title} ${row.category} ${sourceUrl}`);
    if (!sourceUrl || !id || !category || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      reportNumber: row.reportNumber || id,
      country: row.country || "",
      post: row.post || "",
      date: isoDate(row.date),
      category,
      title: row.title || category,
      pageUrl: row.pageUrl || HUB_URL,
      sourceUrl,
    });
  }
  return out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const named = String(raw).match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/i,
  );
  if (named) {
    const months: Record<string, string> = {
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
    const mm = months[named[1].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
  }
  return null;
}

export function isIndexTeaserDump(text: string): boolean {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length < MIN_BODY_CHARS && HTML_TEASER.test(t)) return true;
  if (/^GAIN\b/i.test(t) && /Loading/i.test(t) && t.length < 800) return true;
  return false;
}

export function isWasdePsdEsrGats(text: string): boolean {
  const t = String(text || "");
  if (/\bWorld Agricultural Supply and Demand Estimates\b/i.test(t)) return true;
  if (/\bPSD Online\b|\bpsdonline\/circulars\b/i.test(t) && !/\bReport Category:\s*(Grain and Feed|Livestock and Products|Poultry and Products|Oilseeds and Products)\b/i.test(t)) {
    return true;
  }
  if (/\bWeekly Export Sales\b|\bExport Sales Report\b/i.test(t) && !/\bReport Number:\b/i.test(t)) {
    return true;
  }
  if (/\bGlobal Agricultural Trade System\b|\bGATS Query\b/i.test(t)) return true;
  return WASDE_PSD_ESR_GATS.test(t) && !/\bRequired Report:\s*Required - Public Distribution\b/i.test(t);
}

export function isRealGainBody(text: string): boolean {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length < MIN_BODY_CHARS) return false;
  if (isIndexTeaserDump(t)) return false;
  if (NEWS_GDELT.test(t) && !/\bReport Number:\b/i.test(t)) return false;
  if (isWasdePsdEsrGats(t) && !/\bRequired Report:\s*Required - Public Distribution\b/i.test(t)) {
    return false;
  }
  const hasHeader = /\bRequired Report:\s*Required - Public Distribution\b/i.test(t);
  const hasNumber = /\bReport Number:\s*(?:[A-Z]{2}\d{4}-\d{4}|[A-Z]\d{5}-\d{4})\b/i.test(t);
  const hasCategory = /\bReport Category:\s*(Grain and Feed|Livestock and Products|Poultry and Products|Oilseeds and Products)\b/i.test(
    t,
  );
  const hasAuthors = /\bPrepared By:/i.test(t) && /\bApproved By:/i.test(t);
  return hasHeader && hasNumber && hasCategory && hasAuthors;
}

export function parseGainText(text: string, meta: Partial<GainListing> & { sourceUrl: string }): GainCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialGainPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const head = body.slice(0, 2500);
  const reportNumber =
    meta.reportNumber ||
    (head.match(/Report Number:\s*([A-Z0-9]{2,4}\d{4}-\d{4})/i) || [])[1] ||
    reportNumberFromUrl(sourceUrl) ||
    meta.id ||
    sourceUrl;
  const title =
    meta.title ||
    (head.match(/Report Name:\s*(.+)/i) || [])[1]?.trim().split(/\n/)[0] ||
    reportNumber;
  return {
    id: meta.id || reportNumber,
    reportNumber,
    country: meta.country || (head.match(/Country:\s*(.+)/i) || [])[1]?.trim().split(/\n/)[0] || "",
    post: meta.post || (head.match(/Post:\s*(.+)/i) || [])[1]?.trim().split(/\n/)[0] || "",
    date: isoDate(meta.date) ?? isoDate(head.match(/Date:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/)?.[1] ?? null),
    category: meta.category || categoryFromBlob(head) || "",
    title,
    pageUrl: meta.pageUrl || HUB_URL,
    sourceUrl,
    body,
  };
}

export function emptyGainSnapshot(reason: string): GainSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: HUB_URL, pdfHost: `${DOWNLOAD_ORIGIN}/Download.aspx`, schedule: SCHEDULE_URL },
    cards: [],
  };
}

export function assembleGainSnapshot(cards: GainCard[], fetchedAt = new Date().toISOString()): GainSnapshot {
  const withBody = cards
    .filter((c) => isRealGainBody(c.body) && officialGainPdfUrl(c.sourceUrl))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason:
      withBody.length > 0
        ? null
        : "Official GAIN attaché PDFs had no extractable Grain and Feed / Livestock / Poultry / Oilseeds text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: HUB_URL, pdfHost: `${DOWNLOAD_ORIGIN}/Download.aspx`, schedule: SCHEDULE_URL },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): GainSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as GainSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readGainSnapshot(): GainSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("GAIN_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeGainSnapshot(snap: GainSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchGainBytes(url: string): Promise<Uint8Array> {
  const official = officialGainPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,*/*" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error(`${official} is not an official PDF`);
  }
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("GAIN_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function listingDir(): string {
  return env("GAIN_HTML_DIR") || env("GAIN_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("GAIN_LIMIT", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxFetchLimit(): number {
  const n = Number(env("GAIN_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

async function loadOfficialListings(dir: string): Promise<{ listed: GainListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html", "hub.html"]);
    const fromHtml = html ? parseHubHtml(html, HUB_URL) : [];
    const extra = SEED_LISTINGS.filter((row) => existsSync(join(dir, `${row.id}.txt`)));
    const listed = parseListingRows([...extra, ...fromHtml]);
    return { listed, listedCount: listed.length };
  }
  return { listed: parseListingRows(SEED_LISTINGS), listedCount: SEED_LISTINGS.length };
}

export async function collectGain(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<GainSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = gainDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, GainCard>();
  for (const card of readGainSnapshot()?.cards ?? []) {
    if (isRealGainBody(card.body)) prior.set(card.id, card);
  }
  const cards: GainCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = prior.get(row.id);
    if (cached) {
      cards.push(cached);
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    try {
      const localText = readNamedFile(dir, [`${row.id}.txt`, `${row.reportNumber}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialGainPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchGainBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseGainText(text, { ...row, sourceUrl });
      if (!isRealGainBody(parsed.body)) {
        skippedNoText += 1;
        continue;
      }
      cards.push(parsed);
      seen.add(row.id);
      addedThisRun += 1;
    } catch {
      skippedNoText += 1;
    }
  }
  for (const [id, card] of prior) {
    if (!seen.has(id)) cards.push(card);
  }
  const snap = {
    ...assembleGainSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeGainSnapshot(snap);
  return snap;
}

export async function loadGain(): Promise<GainSnapshot> {
  const cached = readGainSnapshot();
  if (cached) {
    const filtered = assembleGainSnapshot(cached.cards, cached.fetchedAt);
    if (filtered.cards.length) return { ...cached, ...filtered };
  }
  try {
    return await collectGain();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealGainBody(c.body)) ? "stale" : "empty",
        reason: `Live GAIN fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyGainSnapshot(
      `GAIN attaché PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildGainManifest(snap: GainSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealGainBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      GAIN_PATH,
      "Count + report number + country + post + date + official GAIN PDF URL only. Attaché body is the paid GET /gain payload. This free manifest lists the full catalog. WASDE / PSD / ESR / GATS numbers, public search HTML, and staff newgainapi list/token routes are not sold.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: GAIN_AMOUNT_ATOMIC,
    oneAmountAtomic: GAIN_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      reportNumber: c.reportNumber,
      country: c.country,
      post: c.post,
      date: c.date,
      category: c.category,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "reportNumber", "country", "post", "date", "category", "sourceUrl"] },
    sources: snap?.sources ?? { index: HUB_URL, pdfHost: `${DOWNLOAD_ORIGIN}/Download.aspx`, schedule: SCHEDULE_URL },
  };
}

export async function loadGainManifest(): Promise<Record<string, unknown>> {
  return buildGainManifest(readGainSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectGain()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              reportNumber: c.reportNumber,
              country: c.country,
              category: c.category,
              date: c.date,
              bodyChars: c.body.length,
              sourceUrl: c.sourceUrl,
            })),
            snapshot: snapshotPath(),
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
