#!/usr/bin/env node
/**
 * Copyright Claims Board Final Determination TEXT door.
 * Index: https://dockets.ccb.gov/search/documents?docTypeGroup=type:19
 * PDF:   https://dockets.ccb.gov/document/download/{id} (raw %PDF)
 * Docket form: YY-CCB-NNNN. 17 U.S.C. § 105.
 * Same extracted-body pipe as /ibla-decisions, /ttab-decisions, /oalj-decisions.
 * Harvest Final Determination PDFs only (type:19 and close variants).
 * eCCB Login HTML/API 404s, FR wraps, and CourtListener are not this SKU.
 * Not /ttab-decisions. Not /ibla-decisions. Not /oalj-decisions. Not /cbca-decisions.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const CCB_DETERMINATIONS_PATH = "/ccb-determinations";
export const CCB_DETERMINATIONS_MANIFEST_PATH = "/ccb-determinations/manifest.json";
export const CCB_DETERMINATIONS_AMOUNT_ATOMIC = "50000";
export const CCB_DETERMINATIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "ccb-determination-bodies";
export const PRODUCT_NAME = "Copyright Claims Board Final Determination text";

export const LISTING_URL =
  "https://dockets.ccb.gov/search/documents?docTypeGroup=type%3A19&columns=docket&columns=id&columns=documentTitle&columns=documentType&columns=parties&columns=submittedDate&sort=submittedDate&order=desc&max=50";
export const PDF_HOST = "https://dockets.ccb.gov/document/download/";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "United States Copyright Office, Copyright Claims Board. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const DOCKET_RE = /\b(\d{2}-CCB-\d{4})\b/i;
export const DOWNLOAD_RE = /^\/document\/download\/(\d+)$/i;
export const FINAL_TYPE_RE = /^Final Determination(?:\s*-\s*(?:Dismissal|Settlement)| by Register of Copyright)?$/i;

export const LAU_ID = "24-ccb-0180";
export const BELL_ID = "23-ccb-0332";
export const BOEKER_ID = "24-ccb-0405";
export const JOHNSON_ID = "25-ccb-0121";

export const LAU_DOC = "21779";
export const BELL_DOC = "21743";
export const BOEKER_DOC = "21582";
export const JOHNSON_DOC = "21036";

export const LAU_URL = `https://dockets.ccb.gov/document/download/${LAU_DOC}`;
export const BELL_URL = `https://dockets.ccb.gov/document/download/${BELL_DOC}`;
export const BOEKER_URL = `https://dockets.ccb.gov/document/download/${BOEKER_DOC}`;
export const JOHNSON_URL = `https://dockets.ccb.gov/document/download/${JOHNSON_DOC}`;

export const BODY_NEEDLE_LAU = "Ping Lau";
/** Opinion needle absent from free index parties/caption. */
export const BODY_NEEDLE_LAU_OPINION = "dismisses the Claim without prejudice";
export const BODY_NEEDLE_BELL = "$750 in statutory damages";
export const BODY_NEEDLE_BOEKER = "$3,000 in statutory damages";
export const BODY_NEEDLE_JOHNSON = "Julie M. Johnson";

export const CARD_FIELDS = [
  "id",
  "docket",
  "documentId",
  "parties",
  "caption",
  "kind",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type CcbKind =
  | "Final Determination"
  | "Final Determination - Dismissal"
  | "Final Determination - Settlement"
  | "Final Determination by Register of Copyright";

export type CcbListing = {
  id: string;
  docket: string;
  documentId: string;
  parties: string;
  caption: string;
  kind: CcbKind;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
};

export type CcbCard = CcbListing & { body: string };

export type CcbSnapshot = {
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
  cards: CcbCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (CCB Final Determinations; +https://dockets.ccb.gov/search/documents)";

const MANIFEST_FIELDS = [
  "id",
  "docket",
  "documentId",
  "parties",
  "caption",
  "kind",
  "institution",
  "date",
  "title",
] as const;

function seed(
  id: string,
  docket: string,
  documentId: string,
  parties: string,
  caption: string,
  date: string,
  sourceUrl: string,
  kind: CcbKind = "Final Determination",
): CcbListing {
  return {
    id,
    docket,
    documentId,
    parties,
    caption,
    kind,
    institution: parties,
    date,
    title: `${docket} Final Determination`,
    sourceUrl,
  };
}

export const SEED_LISTINGS: CcbListing[] = [
  seed(
    LAU_ID,
    "24-CCB-0180",
    LAU_DOC,
    "Ping Lau; Roselinde Skievaski",
    "Lau v. Skievaski",
    "2026-09-22",
    LAU_URL,
  ),
  seed(
    BELL_ID,
    "23-CCB-0332",
    BELL_DOC,
    "Keith F. Bell; American Ranch Horse Association, Inc.",
    "Bell v. American Ranch Horse Association",
    "2026-09-22",
    BELL_URL,
  ),
  seed(
    BOEKER_ID,
    "24-CCB-0405",
    BOEKER_DOC,
    "Karen Boeker, Karen Holmes, and Rebecca Estenssoro; Maryann Nunes and Robert Nunes",
    "Holmes, et al v. Nunes, et al",
    "2026-09-14",
    BOEKER_URL,
  ),
  seed(
    JOHNSON_ID,
    "25-CCB-0121",
    JOHNSON_DOC,
    "Julie M. Johnson; Sambo Sampson",
    "Johnson v. Sampson",
    "2026-08-18",
    JOHNSON_URL,
  ),
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ccbDeterminationsDir(): string {
  if (env("CCB_DETERMINATIONS_DIR")) return resolve(env("CCB_DETERMINATIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ccb-determinations"));
}

export function snapshotPath(): string {
  return join(ccbDeterminationsDir(), "snapshot.json");
}

export function flattenText(raw: string): string {
  return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function stripTags(raw: string): string {
  return flattenText(decodeEntities(raw.replace(/<[^>]+>/g, " ")));
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const named = raw.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/i,
  );
  if (!named) return null;
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

export function normalizeDocket(raw: string | null | undefined): string {
  const hit = String(raw ?? "").match(DOCKET_RE);
  return hit ? hit[1].toUpperCase() : "";
}

export function determinationId(docket: string): string {
  return docket.toLowerCase();
}

export function officialCcbPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = decodeEntities(urlOrPath).trim();
  try {
    const parsed = new URL(trimmed, "https://dockets.ccb.gov/");
    if (parsed.hostname.toLowerCase() !== "dockets.ccb.gov") return null;
    const hit = parsed.pathname.match(DOWNLOAD_RE);
    if (!hit) return null;
    return `https://dockets.ccb.gov/document/download/${hit[1]}`;
  } catch {
    return null;
  }
}

export function documentIdFromUrl(url: string | null | undefined): string {
  const official = officialCcbPdfUrl(url);
  if (!official) return "";
  return official.split("/").pop() || "";
}

export function normalizePdfText(raw: string): string {
  let text = raw.replace(/\u0000/g, "").replace(/\f/g, "\n").replace(/\u00a0/g, " ");
  text = text.replace(/([A-Za-z])-\n([a-z])/g, "$1$2");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export function isRawPdf(text: string): boolean {
  return text.trimStart().startsWith("%PDF-");
}

export function isLoginOrApiShell(text: string): boolean {
  const head = text.slice(0, 2000);
  if (/<html[\s>]/i.test(head) && /login\/public|Welcome - eCCB/i.test(head)) return true;
  if (/^\s*\{/.test(text) && /"status"\s*:\s*404/i.test(text.slice(0, 400))) return true;
  return false;
}

export function isFinalDeterminationType(raw: string | null | undefined): raw is CcbKind {
  const t = flattenText(raw ?? "");
  if (!FINAL_TYPE_RE.test(t)) return false;
  if (/Request for Certified Copy/i.test(t)) return false;
  return true;
}

export function isRealCcbDeterminationBody(text: string): boolean {
  if (!text || isRawPdf(text) || isLoginOrApiShell(text)) return false;
  const flat = flattenText(text);
  if (flat.length < 500) return false;
  if (!/FINAL DETERMINATION/i.test(flat)) return false;
  if (!/Copyright Claims Board/i.test(flat)) return false;
  if (!DOCKET_RE.test(flat)) return false;
  return true;
}

function sortKey(row: { date: string | null; docket: string; id: string }): string {
  return `${row.date ?? "0000-00-00"}-${row.docket}-${row.id}`;
}

export function keepListing(row: Pick<CcbListing, "id" | "docket" | "kind" | "sourceUrl" | "documentId">): boolean {
  if (!isFinalDeterminationType(row.kind)) return false;
  if (!officialCcbPdfUrl(row.sourceUrl)) return false;
  if (!normalizeDocket(row.docket)) return false;
  if (!/^\d{2}-ccb-\d{4}$/.test(row.id)) return false;
  if (!/^\d+$/.test(row.documentId)) return false;
  return true;
}

export function parseCcbDocumentsHtml(raw: string): CcbListing[] {
  const out: CcbListing[] = [];
  const seen = new Set<string>();
  for (const row of raw.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const html = row[1] ?? "";
    if (/<th\b/i.test(html)) continue;
    const href = [...html.matchAll(/href="([^"]+)"/gi)]
      .map((m) => m[1] ?? "")
      .find((link) => officialCcbPdfUrl(link));
    const sourceUrl = officialCcbPdfUrl(href);
    if (!sourceUrl) continue;
    const docket =
      normalizeDocket([...html.matchAll(/\/case\/detail\/(\d{2}-CCB-\d{4})/gi)].map((m) => m[1])[0]) ||
      normalizeDocket(stripTags(html));
    if (!docket) continue;
    const typeCell =
      stripTags(html.match(/data-cell-heading="Document type"\s*>([\s\S]*?)<\/td>/i)?.[1] ?? "") ||
      stripTags(html.match(/data-cell-heading="Document type"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "");
    const kindRaw =
      typeCell ||
      stripTags(html.match(/>\s*(Final Determination[^<]*)/i)?.[1] ?? "") ||
      "Final Determination";
    if (!isFinalDeterminationType(kindRaw)) continue;
    const dateCell = stripTags(html.match(/data-cell-heading="Filed date"\s*>([\s\S]*?)<\/td>/i)?.[1] ?? "");
    const documentId = documentIdFromUrl(sourceUrl);
    const id = determinationId(docket);
    const listing: CcbListing = {
      id,
      docket,
      documentId,
      parties: docket,
      caption: docket,
      kind: kindRaw,
      institution: docket,
      date: isoDate(dateCell),
      title: `${docket} Final Determination`,
      sourceUrl,
    };
    if (!keepListing(listing) || seen.has(listing.id)) continue;
    seen.add(listing.id);
    out.push(listing);
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

export function parseCcbDeterminationText(
  text: string,
  meta: Partial<CcbListing> & { sourceUrl: string },
): CcbCard {
  const body = normalizePdfText(text);
  const flat = flattenText(body);
  const sourceUrl = officialCcbPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(flat) || "";
  const id = meta.id || (docket ? determinationId(docket) : "");
  const issued =
    isoDate(flat.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i)?.[0]) ||
    isoDate(meta.date);
  const parties = flattenText(meta.parties || "") || docket;
  const caption = flattenText(meta.caption || "") || docket;
  const kind: CcbKind = isFinalDeterminationType(meta.kind) ? meta.kind : "Final Determination";
  return {
    id,
    docket,
    documentId: meta.documentId || documentIdFromUrl(sourceUrl),
    parties,
    caption,
    kind,
    institution: parties,
    date: meta.date ?? issued,
    title: meta.title || `${docket} Final Determination`,
    sourceUrl,
    body,
  };
}

function emptySources(): CcbSnapshot["sources"] {
  return { listing: LISTING_URL, pdfHost: PDF_HOST };
}

export function emptyCcbSnapshot(reason: string): CcbSnapshot {
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

export function assembleCcbSnapshot(cards: CcbCard[], fetchedAt?: string): CcbSnapshot {
  const kept = cards.filter((card) => isRealCcbDeterminationBody(card.body) && keepListing(card));
  kept.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  const asOf =
    kept
      .map((card) => card.date)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: kept.length ? "ok" : "empty",
    reason: kept.length ? null : "Official CCB Final Determination PDFs had no extractable determination text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): CcbSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as CcbSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleCcbSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readCcbSnapshot(): CcbSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeCcbSnapshot(snap: CcbSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchCcbText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchCcbBytes(url: string): Promise<Uint8Array> {
  const official = officialCcbPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,application/octet-stream" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("CCB_DETERMINATIONS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw new Error(`pdftotext failed: ${result.error.message}`);
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim() || `exit ${result.status}`;
    throw new Error(`pdftotext failed: ${err}`);
  }
  return normalizePdfText(result.stdout || "");
}

function listingDir(): string {
  return env("CCB_DETERMINATIONS_HTML_DIR") || env("CCB_DETERMINATIONS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("CCB_DETERMINATIONS_LIMIT", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxFetchLimit(): number {
  const n = Number(env("CCB_DETERMINATIONS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxListingPages(): number {
  const n = Number(env("CCB_DETERMINATIONS_PAGES", "2"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 2;
}

function pageSize(): number {
  const n = Number(env("CCB_DETERMINATIONS_PAGE_SIZE", "50"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 50;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: CcbListing[]): CcbListing[] {
  const seen = new Set<string>();
  const out: CcbListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepListing(row) || !row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

function listingPageUrl(offset: number, max: number): string {
  const u = new URL(LISTING_URL);
  u.searchParams.set("offset", String(offset));
  u.searchParams.set("max", String(max));
  return u.toString();
}

export async function walkOfficialCcb(): Promise<{ listed: CcbListing[]; listedCount: number }> {
  const listed: CcbListing[] = [];
  const seen = new Set<string>();
  const max = pageSize();
  const pages = maxListingPages();
  for (let page = 0; page < pages; page += 1) {
    const url = listingPageUrl(page * max, max);
    const rows = parseCcbDocumentsHtml(await fetchCcbText(url));
    if (rows.length === 0) break;
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      listed.push(row);
    }
    if (rows.length < max) break;
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: CcbListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing.html", "documents.html", "index.html"]);
    const parsed = raw ? parseCcbDocumentsHtml(raw) : [];
    const merged = mergeListings(parsed);
    return { listed: merged, listedCount: Math.max(parsed.length, merged.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialCcb();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: mergeListings([]), listedCount: SEED_LISTINGS.length };
}

/** Pull claimant/respondent caption from the public case detail page when cheap. */
export async function enrichPartiesFromCase(docket: string): Promise<{ parties: string; caption: string } | null> {
  const code = normalizeDocket(docket);
  if (!code) return null;
  try {
    const html = await fetchCcbText(`https://dockets.ccb.gov/case/detail/${code}`);
    const title = stripTags(html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "");
    const captionHit = title.match(/Case details for\s+(.+?)\s*-\s*eCCB/i);
    const caption = captionHit ? flattenText(captionHit[1]) : "";
    const partyBits = [...html.matchAll(/data-cell-heading="Party"\s*>([\s\S]*?)<\/td>/gi)]
      .map((m) => stripTags(m[1] ?? ""))
      .filter((p) => p && !/^Copyright Claims Board$/i.test(p));
    // Prefer the case-detail party filter options when present.
    const optionParties = [...html.matchAll(/<option value="\d+"\s*>([^<]+)<\/option>/gi)]
      .map((m) => stripTags(m[1] ?? ""))
      .filter(
        (p) =>
          p &&
          !/^\s*$/.test(p) &&
          !/^Copyright Claims Board$/i.test(p) &&
          !/^\d+$/.test(p) &&
          p.length > 2,
      );
    const unique = [...new Set([...optionParties, ...partyBits])].slice(0, 6);
    const parties = unique.join("; ") || caption || code;
    return { parties, caption: caption || code };
  } catch {
    return null;
  }
}

export async function collectCcbDeterminations(opts?: {
  listingDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<CcbSnapshot> {
  const dir = opts?.listingDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ccbDeterminationsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, CcbCard>();
  for (const card of readCcbSnapshot()?.cards ?? []) {
    if (isRealCcbDeterminationBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const cards: CcbCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target && !prior.has(row.id)) break;
    if (!keepListing(row)) {
      skippedNoText += 1;
      continue;
    }
    const cached = prior.get(row.id);
    if (cached) {
      cards.push({
        ...cached,
        ...row,
        parties: row.parties !== row.docket ? row.parties : cached.parties,
        caption: row.caption !== row.docket ? row.caption : cached.caption,
        institution: (row.parties !== row.docket ? row.parties : cached.parties) || cached.institution,
        body: cached.body,
      });
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (target > 0 && addedThisRun >= target) break;
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    try {
      const localText = readNamedFile(dir, [`${row.id}.txt`, `${row.documentId}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      let meta = row;
      if (!dir && (row.parties === row.docket || row.caption === row.docket)) {
        const enriched = await enrichPartiesFromCase(row.docket);
        if (enriched) {
          meta = {
            ...row,
            parties: enriched.parties,
            caption: enriched.caption,
            institution: enriched.parties,
            title: `${row.docket} ${enriched.caption}`.trim(),
          };
        }
      } else {
        const seed = SEED_LISTINGS.find((s) => s.id === row.id);
        if (seed) meta = { ...row, ...seed, sourceUrl: row.sourceUrl };
      }
      const sourceUrl = officialCcbPdfUrl(meta.sourceUrl) || meta.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchCcbBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (!isRealCcbDeterminationBody(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseCcbDeterminationText(text, { ...meta, sourceUrl });
      if (!isRealCcbDeterminationBody(parsed.body) || !keepListing(parsed)) {
        skippedNoText += 1;
        continue;
      }
      if (seen.has(parsed.id)) continue;
      cards.push(parsed);
      seen.add(parsed.id);
      addedThisRun += 1;
    } catch {
      skippedNoText += 1;
    }
  }
  for (const [id, card] of prior) {
    if (!seen.has(id)) cards.push(card);
  }
  const snap = {
    ...assembleCcbSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeCcbSnapshot(snap);
  return snap;
}

export async function loadCcbDeterminations(): Promise<CcbSnapshot> {
  const cached = readCcbSnapshot();
  if (cached && cached.cards.some((card) => isRealCcbDeterminationBody(card.body))) return cached;
  try {
    return await collectCcbDeterminations();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live CCB determination fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyCcbSnapshot(
      `CCB Final Determination PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildCcbManifest(snap: CcbSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((card) => isRealCcbDeterminationBody(card.body) && keepListing(card));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      CCB_DETERMINATIONS_PATH,
      "Count plus docket, document id, parties, caption, kind, and date. Determination text is the paid GET /ccb-determinations payload. This free manifest lists the cached Final Determinations. asOf is the newest filed date. Official PDFs are on the eCCB Document search (Final Determination). eCCB Login HTML and FR/CourtListener wraps are not this SKU. Not /ttab-decisions. Not /ibla-decisions. Not /oalj-decisions. Not /cbca-decisions.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: CCB_DETERMINATIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: CCB_DETERMINATIONS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    listedCount: snap?.listedCount ?? cards.length,
    cards: cards.map((card) => ({
      id: card.id,
      docket: card.docket,
      documentId: card.documentId,
      parties: card.parties,
      caption: card.caption,
      kind: card.kind,
      institution: card.institution,
      date: card.date,
      title: card.title,
    })),
    schema: { fields: [...MANIFEST_FIELDS] },
    sources: { listing: LISTING_URL },
  };
}

export function filterCcbManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    return JSON.stringify(raw).toLowerCase().includes(needle);
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadCcbManifest(q?: string): Promise<Record<string, unknown>> {
  return filterCcbManifest(buildCcbManifest(readCcbSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectCcbDeterminations()
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
            cards: snap.cards.map((card) => ({
              id: card.id,
              docket: card.docket,
              documentId: card.documentId,
              parties: card.parties,
              caption: card.caption,
              kind: card.kind,
              date: card.date,
              title: card.title,
              bodyChars: card.body.length,
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
