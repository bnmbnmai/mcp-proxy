#!/usr/bin/env node
/**
 * USDA FSIS humane-handling enforcement letter TEXT door.
 * Official PDFs linked from the humane-handling enforcement index
 * (NOS, NOIE, deferral, abeyance, reinstatement). 17 U.S.C. § 105.
 * Table-scrape + wget Safari-UA PDF download. Scanned letters OCR when
 * pdftotext is empty. Does not invent letter text. Establishment only.
 * Do not sell MPI directory rows, QER table-only packs, HATS time-series,
 * or FOIA people dumps. Ugly PDF/HTML cache only.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const FSIS_HUMANE_PATH = "/fsis-humane";
export const FSIS_HUMANE_MANIFEST_PATH = "/fsis-humane/manifest.json";
export const FSIS_HUMANE_AMOUNT_ATOMIC = "50000";
export const FSIS_HUMANE_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "fsis-humane-letter-bodies";
export const PRODUCT_NAME = "USDA FSIS humane-handling enforcement letter text";

export const LISTING_URL =
  "https://www.fsis.usda.gov/inspection/regulatory-enforcement/humane-handling-enforcement";
export const PDF_HOST = "www.fsis.usda.gov";
export const PDF_ORIGIN = "https://www.fsis.usda.gov";
export const MEDIA_PATH_RE = /^\/sites\/default\/files\/media_file\/documents\/([^/?#]+\.pdf)$/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "USDA Food Safety and Inspection Service (FSIS). Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** Akamai on fsis.usda.gov 403s curl. Safari UA wget GET returns 200. */
export const WGET_SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export const LETTER_TYPES = ["NOIE", "NOS", "LOD", "NOSHA", "NOROS", "NOROSHA"] as const;
export type LetterType = (typeof LETTER_TYPES)[number];

export const TITLE_BY_TYPE: Record<LetterType, string> = {
  NOIE: "Notice of Intended Enforcement",
  NOS: "Notice of Suspension",
  LOD: "Letter of Deferral",
  NOSHA: "Notice of Suspension Held in Abeyance",
  NOROS: "Notice of Reinstatement of Suspension",
  NOROSHA: "Reinstatement of Suspension Held in Abeyance",
};

export const CARD_FIELDS = [
  "id",
  "estNumber",
  "letterType",
  "pdfId",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export const BODY_NEEDLE_SEED = "verbal notification given on April 25, 2024";
export const BODY_NEEDLE_NOIE = "Consciousness on the Rail";

export type FsisHumaneListing = {
  id: string;
  estNumber: string;
  letterType: LetterType;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type FsisHumaneCard = FsisHumaneListing & { body: string };

export type FsisHumaneSnapshot = {
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
  cards: FsisHumaneCard[];
};

const OFFICIAL_HOSTS = new Set(["www.fsis.usda.gov", "fsis.usda.gov"]);
const TYPE_TOKEN_RE = /^(NOROSHA|NOSHIA|NOSHA|NOROS|NOSA|NOIE|NOS|LOD|ROS)$/i;
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|Cooperative|Packing|Meats|Solutions|Farm|Shop|Processors?|Processing|Foods?)\b/i;
const LETTER_TITLE_RE =
  /NOTICE OF INTENDED ENFORCEMENT|NOTICE OF SUSPENSION HELD IN ABEYANCE|NOTICE OF REINSTATEMENT OF SUSPENSION|REINSTATEMENT OF SUSPENSION HELD IN ABEYANCE|NOTICE OF SUSPENSION|LETTER OF DEFERRAL|\bNOIE\b|\bNOSHA\b|\bNOROS\b|\bNOS\b|\bLOD\b/i;
const KILL_PATH_RE = /\/(qer|hats|mpi|foia|quarterly-enforcement|inspection-directory)\b/i;

export const SEED_LISTINGS: FsisHumaneListing[] = [
  {
    id: "7420mv-noros-04252024",
    estNumber: "7420MV",
    letterType: "NOROS",
    institution: "Honest Meats, LLC",
    date: "2024-04-25",
    title: TITLE_BY_TYPE.NOROS,
    sourceUrl: "https://www.fsis.usda.gov/sites/default/files/media_file/documents/7420MV-NOROS-04252024.pdf",
    pdfId: "7420MV-NOROS-04252024.pdf",
  },
  {
    id: "m47033-nosha-09012026",
    estNumber: "M47033",
    letterType: "NOSHA",
    institution: "Salsabil Meat Processing",
    date: "2026-09-01",
    title: TITLE_BY_TYPE.NOSHA,
    sourceUrl: "https://www.fsis.usda.gov/sites/default/files/media_file/documents/NOSHA-M47033-09012026.pdf",
    pdfId: "NOSHA-M47033-09012026.pdf",
  },
  {
    id: "m47033-nos-08202026",
    estNumber: "M47033",
    letterType: "NOS",
    institution: "Salsabil Meat Processing",
    date: "2026-08-20",
    title: TITLE_BY_TYPE.NOS,
    sourceUrl: "https://www.fsis.usda.gov/sites/default/files/media_file/documents/NOS-M47033-08202026.pdf",
    pdfId: "NOS-M47033-08202026.pdf",
  },
  {
    id: "m40110-noie-07302026",
    estNumber: "M40110",
    letterType: "NOIE",
    institution: "Collagen Solutions (US) LLC",
    date: "2026-07-30",
    title: TITLE_BY_TYPE.NOIE,
    sourceUrl: "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M40110-NOIE-07302026.pdf",
    pdfId: "M40110-NOIE-07302026.pdf",
  },
  {
    id: "m40110-lod-08052026",
    estNumber: "M40110",
    letterType: "LOD",
    institution: "Collagen Solutions (US) LLC",
    date: "2026-08-05",
    title: TITLE_BY_TYPE.LOD,
    sourceUrl: "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M40110-LOD-08052026.pdf",
    pdfId: "M40110-LOD-08052026.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function fsisHumaneDir(): string {
  if (env("FSIS_HUMANE_DIR")) return resolve(env("FSIS_HUMANE_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/fsis-humane"));
}

export function snapshotPath(): string {
  return join(fsisHumaneDir(), "snapshot.json");
}

export function compactForMatch(text: string): string {
  return text.replace(/-\n\s*/g, "").replace(/\s+/g, " ").trim();
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " "));
}

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

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const named = String(raw).match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (named) {
    const mm = MONTHS[named[1].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
  }
  const short = String(raw).match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (short) {
    const map: Record<string, string> = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const mm = map[short[1].slice(0, 3).toLowerCase()];
    return mm ? `${short[3]}-${mm}-${short[2].padStart(2, "0")}` : null;
  }
  return null;
}

export function dateFromFilename(mmddyyyy: string): string | null {
  const m = mmddyyyy.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return null;
  const y = Number(m[3]);
  if (y < 1990 || y > 2100) return null;
  return `${m[3]}-${m[1]}-${m[2]}`;
}

export function normalizeLetterType(raw: string | null | undefined): LetterType | null {
  if (!raw) return null;
  const t = raw.trim().toUpperCase();
  if (t === "NOSHIA" || t === "NOSA") return "NOSHA";
  if (t === "ROS") return "NOROS";
  if ((LETTER_TYPES as readonly string[]).includes(t)) return t as LetterType;
  if (/reinstatement[\s-]+of[\s-]+suspension[\s-]+held[\s-]+in[\s-]+abeyance|norosha/i.test(raw)) return "NOROSHA";
  if (/reinstatement[\s-]+of[\s-]+suspension|notice of reinstatement|\bnoros\b|\bros\b/i.test(raw)) return "NOROS";
  if (/intended enforcement|notice of intended/i.test(raw)) return "NOIE";
  if (/held in abeyance|nosha/i.test(raw)) return "NOSHA";
  if (/letter of deferral|deferral|\blod\b/i.test(raw)) return "LOD";
  if (/notice of suspension|\bsuspension\b|\bnos\b/i.test(raw)) return "NOS";
  return null;
}

export function normalizeEstNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;
  const est = text.match(/\bEst\.?\s*([A-Za-z]{0,3}\d+[A-Za-z0-9]*)\b/i);
  if (est) return est[1].toUpperCase().replace(/^M(?=\d)/, "M");
  const token = text.match(/^([A-Za-z]{0,3}\d+[A-Za-z0-9]*)$/);
  return token ? token[1] : null;
}

export type ParsedFilename = {
  pdfId: string;
  estToken: string;
  letterType: LetterType;
  mmddyyyy: string;
};

function dateToken(raw: string): string | null {
  if (/^\d{8}$/.test(raw)) return raw;
  if (/^\d{9}$/.test(raw)) return raw.slice(0, 8);
  return null;
}

export function parseOfficialFilename(urlOrName: string | null | undefined): ParsedFilename | null {
  if (!urlOrName) return null;
  const name = decodeURIComponent(urlOrName.split("/").pop() ?? "").replace(/\.pdf$/i, "");
  const parts = name.split("-").filter(Boolean);
  if (parts.length < 3) return null;
  const last = dateToken(parts[parts.length - 1] ?? "");
  if (!last) return null;
  const mid = parts.slice(0, -1);
  let letterType: LetterType | null = null;
  let typeIdx = -1;
  for (let i = 0; i < mid.length; i++) {
    if (TYPE_TOKEN_RE.test(mid[i])) {
      letterType = normalizeLetterType(mid[i]);
      typeIdx = i;
      break;
    }
  }
  if (!letterType || typeIdx < 0) return null;
  const estParts = typeIdx === 0 ? mid.slice(1) : mid.slice(0, typeIdx);
  const estToken = estParts.join("-") || mid[typeIdx === 0 ? 1 : 0] || "";
  if (!estToken) return null;
  return {
    pdfId: `${name}.pdf`,
    estToken,
    letterType,
    mmddyyyy: last,
  };
}

export function slugFromFilename(parsed: ParsedFilename): string {
  return `${parsed.estToken}-${parsed.letterType}-${parsed.mmddyyyy}`.toLowerCase();
}

export function officialFsisHumanePdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (KILL_PATH_RE.test(path)) return null;
    if (/\/inspection\/regulatory-enforcement\//i.test(path) && !MEDIA_PATH_RE.test(path)) return null;
    const media = path.match(MEDIA_PATH_RE);
    if (!media) return null;
    if (!parseOfficialFilename(media[1])) return null;
    return `${PDF_ORIGIN}/sites/default/files/media_file/documents/${media[1]}`;
  } catch {
    return null;
  }
}

export function isQerHatsDump(text: string): boolean {
  return /HATS (time|Activities)|Quarterly Enforcement Report|QER table-only|Humane Handling Quarterly Reports/i.test(
    text,
  );
}

export function isMpiDirectoryDump(text: string): boolean {
  return /Meat, Poultry and Egg Product Inspection Directory|MPI directory row/i.test(text);
}

export function isFoiaPeopleDump(text: string): boolean {
  return /FOIA people dump|named-individual SKU|date of birth|home address/i.test(text);
}

export function isIndexTeaserDump(text: string): boolean {
  return /Index only — establishment \/ letter type \/ date \/ official PDF URL/i.test(text);
}

export function isIndexHtmlChrome(text: string): boolean {
  return /<!DOCTYPE html|<html[\s>]|<table\b/i.test(text) && /Date Posted|Enforcement Actions/i.test(text);
}

export function isOshaDolJsonDump(text: string): boolean {
  return /"osha"|dol\.gov\/api|InjuryTrackingApplication/i.test(text) && /^\s*[\[{]/.test(text.trim());
}

export function isRealFsisHumaneBody(text: string): boolean {
  if (isIndexTeaserDump(text) || isQerHatsDump(text) || isMpiDirectoryDump(text) || isFoiaPeopleDump(text)) {
    return false;
  }
  if (isOshaDolJsonDump(text)) return false;
  if (isIndexHtmlChrome(text)) return false;
  const compact = compactForMatch(text);
  if (compact.length < 600) return false;
  const usda = /U\.?S\.?\s+DEPARTMENT OF AGRICULTURE|Food Safety and Inspection Service|\bFSIS\b/i.test(compact);
  const hmsa =
    /Humane Methods of Slaughter|\bHMSA\b|9 CFR Part 313|9 CFR 313|9 CFR 500|Rules of Practice|Federal Meat Inspection Act|\bFMIA\b/i.test(
      compact,
    );
  const letter = LETTER_TITLE_RE.test(compact);
  const company = ENTITY_RE.test(compact);
  return usda && hmsa && letter && company;
}

export function parseListingHtml(html: string): FsisHumaneListing[] {
  const found: FsisHumaneListing[] = [];
  const seen = new Set<string>();
  let institution = "";
  let estNumber = "";
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const header = stripTags(row).match(/Est\.?\s*([A-Za-z]{0,3}[\d][A-Za-z0-9+\/-]*)\s*,\s*(.+)$/i);
    if (header && !row.includes(".pdf")) {
      estNumber = header[1].replace(/\+.*$/, "").replace(/\/.*$/, "");
      institution = header[2].replace(/\s+$/, "").trim();
      continue;
    }
    const link = row.match(/<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const href = link[1].startsWith("http") ? link[1] : `${PDF_ORIGIN}${link[1].startsWith("/") ? "" : "/"}${link[1]}`;
    const sourceUrl = officialFsisHumanePdfUrl(href);
    const parsed = parseOfficialFilename(sourceUrl ?? href);
    if (!sourceUrl || !parsed) continue;
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]));
    const letterType = normalizeLetterType(stripTags(link[2])) || parsed.letterType;
    const date = isoDate(cells[1] ?? "") || dateFromFilename(parsed.mmddyyyy);
    const id = slugFromFilename(parsed);
    if (seen.has(id)) continue;
    seen.add(id);
    found.push({
      id,
      estNumber: normalizeEstNumber(estNumber) || parsed.estToken,
      letterType,
      institution: institution || parsed.estToken,
      date,
      title: TITLE_BY_TYPE[letterType] || letterType,
      sourceUrl,
      pdfId: parsed.pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return found;
}

export function parseFsisHumaneText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    estNumber?: string | null;
    letterType?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): FsisHumaneCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFsisHumanePdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const parsed = parseOfficialFilename(sourceUrl);
  const letterType = normalizeLetterType(meta.letterType) || parsed?.letterType || "NOS";
  const id = meta.id?.trim() || (parsed ? slugFromFilename(parsed) : "unknown");
  return {
    id,
    estNumber: normalizeEstNumber(meta.estNumber) || parsed?.estToken || "",
    letterType,
    pdfId: meta.pdfId || parsed?.pdfId || `${id}.pdf`,
    institution: (meta.institution && meta.institution.trim()) || id,
    date: meta.date ?? (parsed ? dateFromFilename(parsed.mmddyyyy) : null) ?? isoDate(body.slice(0, 800)),
    title: TITLE_BY_TYPE[letterType] || meta.title || letterType,
    sourceUrl,
    body,
  };
}

function emptySources(): FsisHumaneSnapshot["sources"] {
  return { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/media_file/documents/` };
}

export function emptyFsisHumaneSnapshot(reason: string): FsisHumaneSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: [],
  };
}

export function assembleFsisHumaneSnapshot(cards: FsisHumaneCard[], fetchedAt?: string): FsisHumaneSnapshot {
  const kept = cards.filter((c) => isRealFsisHumaneBody(c.body));
  kept.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return {
    ok: true,
    product: PRODUCT_ID,
    status: kept.length ? "ok" : "empty",
    reason: kept.length ? null : "No official FSIS humane-handling letter bodies cached.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf: kept[0]?.date ?? null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): FsisHumaneSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FsisHumaneSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleFsisHumaneSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readFsisHumaneSnapshot(): FsisHumaneSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeFsisHumaneSnapshot(snap: FsisHumaneSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function wgetOfficial(url: string, dest: string): void {
  const ua = env("FSIS_HUMANE_WGET_UA") || WGET_SAFARI_UA;
  const helper = env("FSIS_HUMANE_WGET") || "wget";
  const result = spawnSync(helper, ["--user-agent=" + ua, "-O", dest, "--timeout=90", url], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw new Error(`wget failed: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`wget ${url} failed: ${String(result.stderr || result.stdout || result.status).slice(0, 400)}`);
  }
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("FSIS_HUMANE_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function ocrPdfText(pdfPath: string): string {
  const work = join(tmpdir(), `fsis-humane-ocr-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  const prefix = join(work, "p");
  const ppm = spawnSync("pdftoppm", ["-png", "-r", "150", pdfPath, prefix], { encoding: "utf8" });
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
  if (isRealFsisHumaneBody(digital)) return digital;
  const ocr = ocrPdfText(pdfPath);
  if (ocr.trim()) return `${ocr}\n${digital}`.trim();
  return digital;
}

function listingDir(): string {
  return env("FSIS_HUMANE_HTML_DIR") || env("FSIS_HUMANE_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("FSIS_HUMANE_LIMIT", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxFetchLimit(): number {
  const n = Number(env("FSIS_HUMANE_MAX_FETCH", "10"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function safePdfName(pdfId: string, id: string): string {
  const name = pdfId.endsWith(".pdf") ? pdfId : `${id}.pdf`;
  return name.replace(/[^\w.\-]+/g, "_");
}

function mergeListings(fromIndex: FsisHumaneListing[]): FsisHumaneListing[] {
  const seen = new Set(fromIndex.map((r) => r.id));
  const extra = SEED_LISTINGS.filter((r) => !seen.has(r.id));
  return [...fromIndex, ...extra].sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
}

export function fetchListingHtmlLive(): string {
  const dest = join(tmpdir(), `fsis-humane-index-${Date.now()}.html`);
  try {
    wgetOfficial(LISTING_URL, dest);
    return readFileSync(dest, "utf-8");
  } finally {
    try {
      if (existsSync(dest)) unlinkSync(dest);
    } catch {
      /* ignore */
    }
  }
}

async function loadOfficialListings(dir: string): Promise<{ listed: FsisHumaneListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = html ? parseListingHtml(html) : [];
    return { listed: mergeListings(listed), listedCount: listed.length };
  }
  const html = fetchListingHtmlLive();
  const listed = parseListingHtml(html);
  return { listed: mergeListings(listed), listedCount: listed.length };
}

async function extractOfficialText(row: FsisHumaneListing, cacheDir: string, fetched: { n: number }): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.id));
  if (!existsSync(pdfFile)) {
    const dest = pdfFile;
    wgetOfficial(row.sourceUrl, dest);
    const bytes = readFileSync(dest);
    if (bytes.subarray(0, 5).toString("utf8") !== "%PDF-") throw new Error(`${row.sourceUrl} is not an official PDF`);
    fetched.n += 1;
  }
  return pdfToText(pdfFile);
}

export async function collectFsisHumane(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FsisHumaneSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: listedRaw, listedCount } = await loadOfficialListings(dir);
  const byId = new Map(listedRaw.map((r) => [r.id, r]));
  const seedFirst = SEED_LISTINGS.map((s) => byId.get(s.id)).filter((r): r is FsisHumaneListing => Boolean(r));
  const seedIds = new Set(seedFirst.map((r) => r.id));
  const allListed = [...seedFirst, ...listedRaw.filter((r) => !seedIds.has(r.id))];
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = fsisHumaneDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, FsisHumaneCard>();
  for (const card of readFsisHumaneSnapshot()?.cards ?? []) {
    if (isRealFsisHumaneBody(card.body)) prior.set(card.id, card);
  }
  const cards: FsisHumaneCard[] = [];
  const seen = new Set<string>();
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  const fetched = { n: 0 };
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = prior.get(row.id);
    if (cached) {
      cards.push(cached);
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetched.n >= fetchCap) break;
    try {
      const localText = readNamedFile(dir, [
        `${row.id}.txt`,
        `${row.pdfId}.txt`,
        row.pdfId.replace(/\.pdf$/i, ".txt"),
      ]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const text = localText ?? (await extractOfficialText(row, cacheDir, fetched));
      const parsed = parseFsisHumaneText(text, row);
      if (!isRealFsisHumaneBody(parsed.body)) {
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
    ...assembleFsisHumaneSnapshot(cards),
    listedCount,
    fetchedPdfs: fetched.n,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeFsisHumaneSnapshot(snap);
  return snap;
}

export async function loadFsisHumane(): Promise<FsisHumaneSnapshot> {
  const cached = readFsisHumaneSnapshot();
  if (cached && cached.cards.some((c) => isRealFsisHumaneBody(c.body))) return cached;
  try {
    return await collectFsisHumane();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live FSIS humane-handling letter fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyFsisHumaneSnapshot(
      `FSIS humane-handling letter PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFsisHumaneManifest(snap: FsisHumaneSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFsisHumaneBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      FSIS_HUMANE_PATH,
      "Count + establishment + letter type + date + official PDF URL only. Letter body is the paid GET /fsis-humane payload. This free manifest lists the full catalog. Index HTML is chrome. Skip MPI directory rows, QER table-only packs, HATS time-series, and FOIA people dumps.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: FSIS_HUMANE_AMOUNT_ATOMIC,
    oneAmountAtomic: FSIS_HUMANE_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      estNumber: c.estNumber,
      institution: c.institution,
      letterType: c.letterType,
      date: c.date,
      title: c.title,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "estNumber", "institution", "letterType", "date", "title", "sourceUrl"] },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterFsisHumaneManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "estNumber", "institution", "letterType", "date", "title", "sourceUrl"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadFsisHumaneManifest(q?: string): Promise<Record<string, unknown>> {
  return filterFsisHumaneManifest(buildFsisHumaneManifest(readFsisHumaneSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFsisHumane()
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
              estNumber: c.estNumber,
              letterType: c.letterType,
              institution: c.institution,
              date: c.date,
              title: c.title,
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
