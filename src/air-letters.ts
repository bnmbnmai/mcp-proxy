/**
 * USDA APHIS BRS Am I Regulated (AIR) confirmation-letter TEXT door.
 * Official confirmation-letter PDFs from direct.aphis.usda.gov only.
 * Does not invent letter text. Institution/company only. Not people. Not the press teaser.
 * Not TTB /ttb-oic. Not De Novo /denovo-orders. Not FIFRA /fifra-orders. Not CFTC /cftc-orders.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const AIR_LETTERS_PATH = "/air-letters";
export const AIR_LETTERS_MANIFEST_PATH = "/air-letters/manifest.json";
export const AIR_LETTERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "aphis-air-confirmation-letter-bodies";
export const PRODUCT_NAME = "APHIS AIR confirmation-letter text";

export const LISTING_URL = "https://www.aphis.usda.gov/confirmation-letters";
/** Official AIR letters-of-inquiry table. /confirmation-letters is the 01cr teaser/CSV. */
export const INQUIRY_TABLE_URL = "https://www.aphis.usda.gov/biotechnology/regulated-article-inquiry";
export const INQUIRY_CSV_URL = "https://www.aphis.usda.gov/sites/default/files/reg-article-letters-inquiry-data-table.csv";
export const PDF_HOST = "direct.aphis.usda.gov";
export const PDF_ORIGIN = "https://direct.aphis.usda.gov";
export const DOCKET_BARE_RE = /^(\d{2}-\d{3}-01air)$/i;
/** Response PDFs only. Incoming `NN-NNN-01air.pdf` / `-cbidel.pdf` stay out. */
export const MEDIA_RE = /\/sites\/default\/files\/((\d{2}-\d{3}-01air)-response(?:-cbidel(?:-[a-z0-9]+)?)?)\.pdf/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "USDA APHIS";

export const CARD_FIELDS = [
  "id",
  "docket",
  "pdfId",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type AirLetterListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type AirLetterListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type AirLetterCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type AirLetterSnapshot = {
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
  sources: { listing: string; pdfHost: string };
  cards: AirLetterCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (APHIS public institution AIR letters; +https://www.aphis.usda.gov/biotechnology/regulated-article-inquiry)";
const OFFICIAL_HOSTS = new Set(["direct.aphis.usda.gov", "www.aphis.usda.gov", "aphis.usda.gov"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.P\.|LP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|University|Institute|College|PBC|SAS|Seeds|Science|ARS)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;

export const SEED_LISTINGS: AirLetterListing[] = [
  {
    id: "26-173-01air",
    docket: "26-173-01air",
    institution: "KAGOME Co., LTD.",
    date: "2026-06-22",
    title: "AIR confirmation letter",
    sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf",
    pdfId: "26-173-01air-response.pdf",
  },
  {
    id: "26-009-01air",
    docket: "26-009-01air",
    institution: "KAGOME Co., LTD.",
    date: "2026-01-08",
    title: "AIR confirmation letter",
    sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/26-009-01air-response.pdf",
    pdfId: "26-009-01air-response.pdf",
  },
  {
    id: "25-364-01air",
    docket: "25-364-01air",
    institution: "LaSemilla. Co. Ltd",
    date: "2026-01-05",
    title: "AIR confirmation letter",
    sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/25-364-01air-response.pdf",
    pdfId: "25-364-01air-response.pdf",
  },
  {
    id: "25-317-01air",
    docket: "25-317-01air",
    institution: "Inari Agriculture, Inc.",
    date: "2025-11-13",
    title: "AIR confirmation letter",
    sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/25-317-01air-response.pdf",
    pdfId: "25-317-01air-response.pdf",
  },
  {
    id: "25-226-01air",
    docket: "25-226-01air",
    institution: "The Traits Company",
    date: "2025-07-29",
    title: "AIR confirmation letter",
    sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/25-226-01air-response.pdf",
    pdfId: "25-226-01air-response.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function airLettersDir(): string {
  if (env("AIR_LETTERS_DIR")) return resolve(env("AIR_LETTERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/air-letters"));
}

export function snapshotPath(): string {
  return join(airLettersDir(), "snapshot.json");
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

export function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " "));
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const named = raw.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (named) {
    const months: Record<string, string> = {
      january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
      july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
    };
    const mm = months[named[1].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
  }
  return null;
}

export function officialAirLetterPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org" || host === "federalregister.gov" || host === "www.federalregister.gov") return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const media = decodeURIComponent(parsed.pathname).match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
    if (!media) return null;
    return `${PDF_ORIGIN}/sites/default/files/${media[1]}.pdf`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialAirLetterPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = parsed.pathname.match(MEDIA_RE);
    return media?.[1] ? `${media[1]}.pdf` : null;
  } catch {
    return null;
  }
}

export function slugFromUrl(url: string): string {
  const official = officialAirLetterPdfUrl(url) || url || "";
  const media = official.match(MEDIA_RE);
  return media?.[2]?.toLowerCase() || "unknown";
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (DOCKET_BARE_RE.test(trimmed) && !/\s/.test(trimmed)) return trimmed;
  return null;
}

export function isPeopleRow(row: AirLetterListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isInstitutionOrderRow(row: AirLetterListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!officialAirLetterPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`;
  if (!/AIR|confirmation|01air|7 CFR part 340/i.test(kind) && !MEDIA_RE.test(kind)) return false;
  return true;
}

export function parseListingRows(rows: AirLetterListingRow[]): AirLetterListing[] {
  const found: AirLetterListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const sourceUrl = officialAirLetterPdfUrl(row.sourceUrl ?? "");
    const pdfId = (row.pdfId ?? "").trim() || pdfIdFromUrl(sourceUrl ?? "") || "";
    const docket = normalizeDocket(row.docket) || slugFromUrl(sourceUrl ?? "");
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: normalizeDocket(row.docket) || docket,
      docket,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: "AIR confirmation letter",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): AirLetterListing[] {
  const rows: AirLetterListingRow[] = [];
  const links = [
    ...html.matchAll(
      /(?:(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})[\s\S]{0,240}?)?<a[^>]+href="([^"]+\.pdf[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];
  for (const m of links) {
    const href = m[2].startsWith("http") ? m[2] : `${PDF_ORIGIN}${m[2].startsWith("/") ? "" : "/"}${m[2]}`;
    if (!officialAirLetterPdfUrl(href)) continue;
    const title = stripTags(m[3]);
    const docket = slugFromUrl(href);
    rows.push({
      institution: title,
      date: m[1] || undefined,
      title: "AIR confirmation letter",
      sourceUrl: href,
      pdfId: pdfIdFromUrl(href) ?? "",
      docket,
    });
  }
  return parseListingRows(rows);
}

function parseCsvRecords(text: string): Record<string, string>[] {
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      if (row.some((c) => c.trim())) lines.push(row);
      row = [];
      field = "";
      continue;
    }
    field += ch;
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((c) => c.trim())) lines.push(row);
  }
  if (!lines.length) return [];
  const headers = lines[0]!.map((h) => h.trim());
  return lines.slice(1).map((cols) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = (cols[idx] ?? "").trim();
    });
    return rec;
  });
}

export function parseListingCsv(csv: string): AirLetterListing[] {
  const rows: AirLetterListingRow[] = [];
  for (const rec of parseCsvRecords(csv)) {
    const docket = (rec["AIR Number"] || rec.docket || "").trim();
    const institution = (rec.Institution || rec.institution || "").trim();
    const date = rec["Response Date"] || rec.date;
    const docs = rec.Documents || rec.documents || "";
    const response = docs.match(/href="([^"]+)"[^>]*>\s*Response/i);
    if (!response) continue;
    const href = response[1]!;
    if (!docket || !DOCKET_BARE_RE.test(docket)) continue;
    if (!href.toLowerCase().includes(docket.toLowerCase())) continue;
    const sourceUrl = href.startsWith("http") ? href : `${PDF_ORIGIN}${href.startsWith("/") ? "" : "/"}${href}`;
    if (!officialAirLetterPdfUrl(sourceUrl)) continue;
    rows.push({
      institution,
      date,
      title: "AIR confirmation letter",
      sourceUrl,
      docket,
      pdfId: pdfIdFromUrl(sourceUrl) ?? "",
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ docket \/ date \/ PDF URL/i.test(text)) return true;
  if (/FDA De Novo press teaser|EPA FIFRA press teaser/i.test(text)) return true;
  if (/INSTRUCTIONS/i.test(text) && !/Confirmation of the regulatory status/i.test(text) && !/7 CFR part 340/i.test(text)) {
    return true;
  }
  return false;
}

export function isFederalRegisterDump(text: string): boolean {
  return /"raw_text"/.test(text) || /"full_text"/.test(text) || /federalregister\.gov/i.test(text);
}

export function isPeopleDump(text: string): boolean {
  if (/people-only CFTC/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isRealAirLetterBody(text: string): boolean {
  if (isIndexTeaserDump(text) || isFederalRegisterDump(text) || isPeopleDump(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 1200) return false;
  if (/Center for Devices and Radiological Health/i.test(text) && /De Novo request/i.test(text)) return false;
  if (/ENVIRONMENTAL PROTECTION AGENCY/i.test(text) && /FIFRA-\d{2}-\d{4}-\d{4}/i.test(text)) return false;
  if (/COMMODITY FUTURES TRADING COMMISSION/i.test(text) && /CFTC Docket No/i.test(text)) return false;
  if (/Bureau of Industry and Security/i.test(text) && /PROPOSED CHARGING LETTER|ORDER RELATING TO/i.test(text)) return false;
  if (/ALCOHOL AND TOBACCO TAX AND TRADE BUREAU/i.test(text) && /ABSTRACT AND STATEMENT/i.test(text)) return false;
  if (/RECORD OF DECISION/i.test(text) && /DECLARATION/i.test(text) && /\b(CERCLA|Superfund)\b/i.test(text)) return false;
  if (/(?:MONETARY )?PENALTY NOTICE/i.test(text) && /Information Commissioner/i.test(text) && /(?:Data Protection Act 2018|section 155)/i.test(text)) return false;
  const aphis = /Animal and\s+Plant Health\s+Inspection Service|Biotechnology\s+Regulatory\s+Services/i.test(text);
  const kind = /Confirmation of the regulatory status/i.test(text) && /7 CFR part 340/i.test(text);
  const docket = /\d{2}-\d{3}-01air/i.test(text);
  return aphis && kind && docket;
}

export function parseAirLetterText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    docket?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): AirLetterCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialAirLetterPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(meta.id) || slugFromUrl(sourceUrl);
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || docket;
  return {
    id: meta.id && normalizeDocket(meta.id) ? normalizeDocket(meta.id)! : docket,
    docket,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 4000)),
    title: meta.title || "AIR confirmation letter",
    sourceUrl,
    body,
  };
}

export function emptyAirLettersSnapshot(reason: string): AirLetterSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: [],
  };
}

export function assembleAirLettersSnapshot(cards: AirLetterCard[], fetchedAt = new Date().toISOString()): AirLetterSnapshot {
  const withBody = cards.filter((c) => isRealAirLetterBody(c.body)).sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official APHIS AIR confirmation-letter PDFs had no extractable letter text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): AirLetterSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as AirLetterSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readAirLettersSnapshot(): AirLetterSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch { /* corrupt */ }
  }
  return null;
}

export function writeAirLettersSnapshot(snap: AirLetterSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchAirLetterBytes(url: string): Promise<Uint8Array> {
  const official = officialAirLetterPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export async function fetchAirLetterText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" } });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("AIR_LETTERS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function ocrPdfText(pdfPath: string): string {
  const work = join(tmpdir(), `air-letters-ocr-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  const prefix = join(work, "p");
  const ppm = spawnSync("pdftoppm", ["-png", pdfPath, prefix], { encoding: "utf8" });
  if (ppm.status !== 0) return "";
  const pages = readdirSync(work).filter((n) => n.endsWith(".png")).sort();
  const chunks: string[] = [];
  for (const page of pages) {
    const ocr = spawnSync("tesseract", ["--psm", "6", join(work, page), "stdout"], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    if (ocr.status === 0 && ocr.stdout) chunks.push(ocr.stdout);
  }
  return chunks.join("\n");
}

export function pdfToText(pdfPath: string): string {
  const digital = digitalPdfText(pdfPath);
  if (isRealAirLetterBody(digital)) return digital;
  const ocr = ocrPdfText(pdfPath);
  if (ocr.trim()) return `${ocr}\n${digital}`.trim();
  return digital;
}

function listingDir(): string {
  return env("AIR_LETTERS_JSON_DIR") || env("AIR_LETTERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("AIR_LETTERS_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("AIR_LETTERS_MAX_FETCH", "8"));
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

function mergeOfficialListings(listed: AirLetterListing[], seeds: AirLetterListing[]): AirLetterListing[] {
  const seen = new Set<string>();
  const out: AirLetterListing[] = [];
  for (const row of [...listed, ...seeds]) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

async function loadOfficialListings(dir: string): Promise<{ listed: AirLetterListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as AirLetterListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  try {
    const listed = parseListingCsv(await fetchAirLetterText(INQUIRY_CSV_URL));
    const merged = mergeOfficialListings(listed, SEED_LISTINGS);
    if (merged.length > 0) return { listed: merged, listedCount: merged.length };
  } catch {
    /* official listing missed; keep first-slice seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectAirLetters(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<AirLetterSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = airLettersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, AirLetterCard>();
  for (const card of readAirLettersSnapshot()?.cards ?? []) {
    if (isRealAirLetterBody(card.body)) prior.set(card.id, card);
  }
  const cards: AirLetterCard[] = [];
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
      const localText = readNamedFile(dir, [`${row.docket}.txt`, `${row.id}.txt`, `${row.pdfId}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, row.pdfId.endsWith(".pdf") ? row.pdfId : `${row.docket}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchAirLetterBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseAirLetterText(text, row);
      if (!isRealAirLetterBody(parsed.body)) {
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
  const snap = { ...assembleAirLettersSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeAirLettersSnapshot(snap);
  return snap;
}

export async function loadAirLetters(): Promise<AirLetterSnapshot> {
  const cached = readAirLettersSnapshot();
  if (cached && cached.cards.some((c) => isRealAirLetterBody(c.body))) return cached;
  try {
    return await collectAirLetters();
  } catch (err) {
    if (cached) {
      return { ...cached, status: "stale", reason: `Live AIR letter fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}` };
    }
    return emptyAirLettersSnapshot(`AIR letter PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function buildAirLettersManifest(snap: AirLetterSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealAirLetterBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + docket + date + official PDF URL only. Letter body is the paid GET /air-letters payload. This free manifest lists the full catalog. GET ?id= is one official text for $0.02. Default GET / page of up to 100 official texts is $0.05 (newest 100 official texts, not the entire archive). Older pages are another $0.05 on the same URL (page/before).",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: AIR_LETTERS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({ id: c.id, institution: c.institution, docket: c.docket, date: c.date, sourceUrl: c.sourceUrl })),
    schema: { fields: ["id", "institution", "docket", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
  };
}

export async function loadAirLettersManifest(): Promise<Record<string, unknown>> {
  return buildAirLettersManifest(readAirLettersSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectAirLetters()
    .then((snap) => {
      console.log(JSON.stringify({
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
          id: c.id, docket: c.docket, institution: c.institution, date: c.date, title: c.title,
          bodyChars: c.body.length, sourceUrl: c.sourceUrl,
        })),
        snapshot: snapshotPath(),
      }, null, 2));
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
