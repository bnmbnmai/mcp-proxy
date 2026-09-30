#!/usr/bin/env node
/**
 * DOI Interior Board of Land Appeals precedential decision TEXT door.
 * PDF host: https://www.oha.doi.gov/IBLA/Ibladecisions/
 * That folder is a links-only PDF store. Its directory listing returns HTTP 500,
 * so the walker reads the official chronological year indexes on doi.gov, which
 * link to those PDFs. PDFs are %PDF-1.6; pdftotext parses them and normalizePdfText
 * flattens form feeds and line-break hyphens.
 * 17 U.S.C. § 105. Same extracted-body pipe as /ttab-decisions, /eeoc-appellate,
 * and /ecab-decisions.
 * Precedential decisions only. Dispositive orders are not this SKU.
 * Not /bsee-reports, not /epa-eab, not /fmshrc-orders.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const IBLA_DECISIONS_PATH = "/ibla-decisions";
export const IBLA_DECISIONS_MANIFEST_PATH = "/ibla-decisions/manifest.json";
export const IBLA_DECISIONS_AMOUNT_ATOMIC = "50000";
export const IBLA_DECISIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "ibla-decision-bodies";
export const PRODUCT_NAME = "DOI IBLA precedential decision text";

/** Links-only PDF folder. Directory listing is HTTP 500; files themselves are the PDFs. */
export const PDF_ROOT = "https://www.oha.doi.gov/IBLA/Ibladecisions/";
export const CHRONO_HUB =
  "https://www.doi.gov/oha/organization/ibla/Finding-IBLA-Decisions/Chronological-Index-of-Decisions";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "U.S. Department of the Interior, Office of Hearings and Appeals, Interior Board of Land Appeals. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const PDF_PATH_RE = /^\/IBLA\/Ibladecisions\/\d+IBLA\/[^/]+\.pdf$/i;
export const CITATION_RE = /\b(\d{2,3})\s+IBLA\s+(\d{1,4})\b/i;
export const YEAR_INDEX_RE = /calendar-year-((?:19|20)\d{2})\/?$/i;

export const MAVERICK_ID = "201-ibla-53";
export const PREMIUM_ID = "201-ibla-18";
export const WILDEARTH_ID = "201-ibla-1";

export const MAVERICK_URL = "https://www.oha.doi.gov/IBLA/Ibladecisions/201IBLA/201ibla53.pdf";
export const PREMIUM_URL = "https://www.oha.doi.gov/IBLA/Ibladecisions/201IBLA/201ibla18.pdf";
export const WILDEARTH_URL = "https://www.oha.doi.gov/IBLA/Ibladecisions/201IBLA/201ibla1.pdf";

export const BODY_NEEDLE_MAVERICK = "Bell Kearns";
export const BODY_NEEDLE_PREMIUM = "Premium Coal";
export const BODY_NEEDLE_WILDEARTH = "Normally Pressured Lance";

export const CARD_FIELDS = [
  "id",
  "citation",
  "volume",
  "page",
  "docket",
  "parties",
  "disposition",
  "kind",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type IblaKind = "Precedential decision";

export type IblaListing = {
  id: string;
  citation: string;
  volume: number;
  page: number;
  docket: string;
  parties: string;
  disposition: string;
  kind: IblaKind;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
};

export type IblaCard = IblaListing & { body: string };

export type IblaSnapshot = {
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
  sources: { listing: string; chrono: string; pdfHost: string };
  cards: IblaCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (DOI IBLA precedential decisions; +https://www.doi.gov/oha/organization/ibla/Finding-IBLA-Decisions)";

const MANIFEST_FIELDS = [
  "id",
  "citation",
  "volume",
  "page",
  "docket",
  "parties",
  "disposition",
  "kind",
  "date",
  "title",
  "institution",
] as const;

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

function seed(
  id: string,
  volume: number,
  page: number,
  docket: string,
  parties: string,
  disposition: string,
  date: string,
  sourceUrl: string,
): IblaListing {
  const citation = `${volume} IBLA ${page}`;
  return {
    id,
    citation,
    volume,
    page,
    docket,
    parties,
    disposition,
    kind: "Precedential decision",
    institution: parties,
    date,
    title: `${citation} ${parties}`,
    sourceUrl,
  };
}

export const SEED_LISTINGS: IblaListing[] = [
  seed(
    MAVERICK_ID,
    201,
    53,
    "IBLA 2021-0216 et al.",
    "Maverick Solar, LLC et al.",
    "Set aside and remanded.",
    "2026-06-16",
    MAVERICK_URL,
  ),
  seed(
    PREMIUM_ID,
    201,
    18,
    "IBLA 2024-0010 et al.",
    "Premium Coal Co., Inc. et al.",
    "Affirmed; Motion for hearing denied.",
    "2026-02-02",
    PREMIUM_URL,
  ),
  seed(
    WILDEARTH_ID,
    201,
    1,
    "IBLA 2019-0002",
    "WildEarth Guardians",
    "Vacated.",
    "2026-01-15",
    WILDEARTH_URL,
  ),
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function iblaDecisionsDir(): string {
  if (env("IBLA_DECISIONS_DIR")) return resolve(env("IBLA_DECISIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ibla-decisions"));
}

export function snapshotPath(): string {
  return join(iblaDecisionsDir(), "snapshot.json");
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
  const mm = MONTHS[named[1].toLowerCase()];
  return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
}

export function citationParts(raw: string | null | undefined): { volume: number; page: number } | null {
  const hit = String(raw ?? "").match(CITATION_RE);
  if (!hit) return null;
  const volume = Number(hit[1]);
  const page = Number(hit[2]);
  if (!Number.isFinite(volume) || !Number.isFinite(page) || volume < 1 || page < 1) return null;
  return { volume, page };
}

export function decisionId(volume: number, page: number): string {
  return `${volume}-ibla-${page}`;
}

export function officialIblaPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = decodeEntities(urlOrPath).trim();
  try {
    const parsed = new URL(trimmed, PDF_ROOT);
    const host = parsed.hostname.toLowerCase();
    if (host !== "www.oha.doi.gov") return null;
    const path = decodeURIComponent(parsed.pathname);
    if (!PDF_PATH_RE.test(path)) return null;
    return `https://www.oha.doi.gov${path}`;
  } catch {
    return null;
  }
}

/** Filename fallback when the index cell has no "NNN IBLA N" text. 200ibia195.pdf is the official typo for 200 IBLA 195. */
export function citationFromPdfUrl(url: string | null | undefined): { volume: number; page: number } | null {
  const official = officialIblaPdfUrl(url);
  if (!official) return null;
  const name = decodeURIComponent(new URL(official).pathname.split("/").pop() || "");
  const hit = name.match(/(\d{2,3})ib[li]a0*(\d+)/i);
  if (!hit) return null;
  return { volume: Number(hit[1]), page: Number(hit[2]) };
}

export function cleanParties(raw: string | null | undefined): string {
  if (!raw) return "";
  const cut = raw.split(/\/IBLA\b/i)[0] ?? raw;
  return flattenText(cut)
    .replace(/-et-al\.?/gi, " et al.")
    .replace(/\s+Et-Al\.?/g, " et al.")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanDocket(raw: string | null | undefined): string {
  if (!raw) return "";
  const hit = raw.match(/IBLA\s+([0-9][0-9A-Za-z.-]*(?:\s+et\s+al\.?)?)/i);
  if (hit) {
    const token = hit[1].replace(/-et-al\.?/i, " et al.").replace(/_/g, " ").replace(/\s+/g, " ").trim();
    return `IBLA ${token}`;
  }
  const slash = raw.split(/\/IBLA\b/i)[1];
  if (!slash) return "";
  const token = slash.replace(/-et-al\.?/i, " et al.").replace(/[_-]+/g, (m) => (m.includes("-") && /\d/.test(m) ? "-" : " ")).replace(/\s+/g, " ").trim();
  return token ? `IBLA ${token}` : "";
}

export function yearIndexUrl(year: number): string {
  return `${CHRONO_HUB}/calendar-year-${year}`;
}

export function normalizePdfText(raw: string): string {
  let text = raw.replace(/\u0000/g, "").replace(/\f/g, "\n").replace(/\u00a0/g, " ");
  text = text.replace(/([A-Za-z])-\n([a-z])/g, "$1$2");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export function isHtmlIndex(text: string): boolean {
  return /<\s*html[\s>]/i.test(text) || (/NAME OF CASE/i.test(text) && /CITATION\/LINK/i.test(text));
}

export function isRawPdf(text: string): boolean {
  return text.trimStart().startsWith("%PDF-");
}

export function isDispositiveOrder(text: string): boolean {
  if (/OPINION BY/i.test(text)) return false;
  return /\bDISPOSITIVE ORDER\b/i.test(text);
}

export function isRealIblaDecisionBody(text: string): boolean {
  if (!text || isRawPdf(text) || isHtmlIndex(text) || isDispositiveOrder(text)) return false;
  const flat = flattenText(text);
  if (flat.length < 800) return false;
  if (!/OPINION BY/i.test(flat)) return false;
  if (!/\bDecided\b/i.test(flat)) return false;
  if (!/\bIBLA\s+\d{4}-\d+/i.test(flat)) return false;
  if (!CITATION_RE.test(flat)) return false;
  return true;
}

export function parseDisposition(text: string): string {
  const head = text.split(/APPEARANCES:|OPINION BY/i)[0] ?? "";
  const paras = head
    .split(/\n\s*\n/)
    .map((para) => flattenText(para))
    .filter(Boolean);
  const last = paras.at(-1) ?? "";
  if (!last || /^Decided\b/i.test(last) || /^(Appeals?\b|Two related appeals\b)/i.test(last)) return "";
  return last.length > 500 ? last.slice(0, 500).trim() : last;
}

export function parseDocketFromBody(text: string): string {
  const head = text.split(/APPEARANCES:|OPINION BY/i)[0] ?? text.slice(0, 800);
  const hit = head.match(/\bIBLA\s+(\d{4}-\d{3,4}(?:\s+et\s+al\.)?)/i);
  return hit ? `IBLA ${hit[1].replace(/\s+/g, " ").trim()}` : "";
}

function sortKey(row: { date: string | null; volume: number; page: number; id: string }): string {
  return `${row.date ?? "0000-00-00"}-${String(row.volume).padStart(4, "0")}-${String(row.page).padStart(5, "0")}-${row.id}`;
}

function listingFromParts(opts: {
  citationRaw: string;
  sourceUrl: string;
  partiesRaw?: string;
  docketRaw?: string;
  date?: string | null;
  disposition?: string;
}): IblaListing | null {
  const sourceUrl = officialIblaPdfUrl(opts.sourceUrl);
  if (!sourceUrl) return null;
  const parts = citationParts(opts.citationRaw) || citationFromPdfUrl(sourceUrl);
  if (!parts) return null;
  const parties = cleanParties(opts.partiesRaw) || `${parts.volume} IBLA ${parts.page}`;
  const docket = cleanDocket(opts.docketRaw) || cleanDocket(opts.partiesRaw);
  const citation = `${parts.volume} IBLA ${parts.page}`;
  return {
    id: decisionId(parts.volume, parts.page),
    citation,
    volume: parts.volume,
    page: parts.page,
    docket,
    parties,
    disposition: flattenText(opts.disposition || ""),
    kind: "Precedential decision",
    institution: parties,
    date: opts.date ?? null,
    title: `${citation} ${parties}`,
    sourceUrl,
  };
}

export function parseIblaIndexHtml(raw: string): IblaListing[] {
  const out: IblaListing[] = [];
  const seen = new Set<string>();
  const push = (row: IblaListing | null) => {
    if (!row || seen.has(row.id)) return;
    seen.add(row.id);
    out.push(row);
  };
  for (const row of raw.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const html = row[1] ?? "";
    if (/<th\b/i.test(html)) continue;
    const href = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1] ?? "").find((link) => officialIblaPdfUrl(link));
    if (!href) continue;
    const cells = [...html.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1] ?? ""));
    const citationCell = cells.find((cell) => CITATION_RE.test(cell)) || "";
    const dateCell = cells.find((cell) => /\d{1,2}\/\d{1,2}\/\d{4}/.test(cell)) || "";
    const nameCell = cells.find((cell) => cell && cell !== citationCell && cell !== dateCell) || cells[0] || "";
    push(
      listingFromParts({
        citationRaw: citationCell,
        sourceUrl: href,
        partiesRaw: nameCell,
        docketRaw: nameCell,
        date: isoDate(dateCell),
      }),
    );
  }
  if (out.length === 0) {
    for (const match of raw.matchAll(/href="([^"]+\.pdf)"/gi)) {
      push(listingFromParts({ citationRaw: "", sourceUrl: match[1] ?? "" }));
    }
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

export function discoverYearIndexUrls(raw: string): string[] {
  const years = new Set<number>();
  for (const match of raw.matchAll(/href="([^"]+)"/gi)) {
    try {
      const url = new URL(match[1], CHRONO_HUB);
      if (!url.hostname.endsWith("doi.gov")) continue;
      const hit = `${url.pathname}${url.hash ? "" : ""}`.match(YEAR_INDEX_RE);
      if (!hit) continue;
      years.add(Number(hit[1]));
    } catch {
      /* skip */
    }
  }
  return [...years].sort((a, b) => b - a).map((year) => yearIndexUrl(year));
}

export function parseIblaDecisionText(text: string, meta: Partial<IblaListing> & { sourceUrl: string }): IblaCard {
  const body = normalizePdfText(text);
  const sourceUrl = officialIblaPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const fromBody = citationParts(body) || citationFromPdfUrl(sourceUrl);
  const volume = meta.volume || fromBody?.volume || 0;
  const page = meta.page || fromBody?.page || 0;
  const citation = volume && page ? `${volume} IBLA ${page}` : meta.citation || "";
  const id = meta.id || (volume && page ? decisionId(volume, page) : "");
  const parties = cleanParties(meta.parties) || cleanParties(body.split("\n").map((line) => line.trim()).find(Boolean)) || citation;
  const decided = isoDate(body.match(/Decided\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i)?.[1] ?? "");
  const disposition = parseDisposition(body) || flattenText(meta.disposition || "");
  const docket = cleanDocket(meta.docket) || parseDocketFromBody(body);
  return {
    id,
    citation,
    volume,
    page,
    docket,
    parties,
    disposition,
    kind: "Precedential decision",
    institution: parties,
    date: meta.date ?? decided,
    title: meta.title || `${citation} ${parties}`.trim(),
    sourceUrl,
    body,
  };
}

function emptySources(): IblaSnapshot["sources"] {
  return { listing: PDF_ROOT, chrono: CHRONO_HUB, pdfHost: PDF_ROOT };
}

export function emptyIblaSnapshot(reason: string): IblaSnapshot {
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

export function assembleIblaSnapshot(cards: IblaCard[], fetchedAt?: string): IblaSnapshot {
  const kept = cards.filter((card) => isRealIblaDecisionBody(card.body) && officialIblaPdfUrl(card.sourceUrl));
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
    reason: kept.length ? null : "Official IBLA precedential PDFs had no extractable decision text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): IblaSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as IblaSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleIblaSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readIblaSnapshot(): IblaSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeIblaSnapshot(snap: IblaSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchIblaText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchIblaBytes(url: string): Promise<Uint8Array> {
  const official = officialIblaPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,application/octet-stream" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("IBLA_DECISIONS_PDFTOTEXT") || "pdftotext";
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
  return env("IBLA_DECISIONS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("IBLA_DECISIONS_LIMIT", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxFetchLimit(): number {
  const n = Number(env("IBLA_DECISIONS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxYearPages(): number {
  const n = Number(env("IBLA_DECISIONS_YEARS", "2"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 2;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: IblaListing[]): IblaListing[] {
  const seen = new Set<string>();
  const out: IblaListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!officialIblaPdfUrl(row.sourceUrl) || !row.id) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

export async function walkOfficialIbla(): Promise<{ listed: IblaListing[]; listedCount: number }> {
  const listed: IblaListing[] = [];
  const years: string[] = [];
  try {
    const hub = await fetchIblaText(CHRONO_HUB);
    years.push(...discoverYearIndexUrls(hub));
  } catch {
    /* hub optional; fall through to the newest calendar years */
  }
  if (years.length === 0) {
    const now = new Date().getUTCFullYear();
    years.push(yearIndexUrl(now), yearIndexUrl(now - 1));
  }
  const cap = maxYearPages();
  let got = 0;
  for (const page of years) {
    if (got >= cap) break;
    try {
      const rows = parseIblaIndexHtml(await fetchIblaText(page));
      if (rows.length === 0) continue;
      listed.push(...rows);
      got += 1;
    } catch {
      /* unpublished year indexes 404; keep walking newer-first */
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: IblaListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["year-2026.html", "listing.html", "index.html"]);
    const parsed = raw ? parseIblaIndexHtml(raw) : [];
    const merged = mergeListings(parsed);
    return { listed: merged, listedCount: Math.max(parsed.length, merged.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialIbla();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: mergeListings([]), listedCount: SEED_LISTINGS.length };
}

export async function collectIblaDecisions(opts?: {
  listingDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<IblaSnapshot> {
  const dir = opts?.listingDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = iblaDecisionsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, IblaCard>();
  for (const card of readIblaSnapshot()?.cards ?? []) {
    if (isRealIblaDecisionBody(card.body) && officialIblaPdfUrl(card.sourceUrl)) prior.set(card.id, card);
  }
  const cards: IblaCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target && !prior.has(row.id)) break;
    if (!officialIblaPdfUrl(row.sourceUrl)) {
      skippedNoText += 1;
      continue;
    }
    const cached = prior.get(row.id);
    if (cached) {
      cards.push({
        ...cached,
        ...row,
        disposition: row.disposition || cached.disposition,
        institution: row.parties || cached.institution,
        body: cached.body,
      });
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (target > 0 && addedThisRun >= target) break;
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    try {
      const localText = readNamedFile(dir, [`${row.id}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialIblaPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchIblaBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (!isRealIblaDecisionBody(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseIblaDecisionText(text, row);
      if (!isRealIblaDecisionBody(parsed.body) || !officialIblaPdfUrl(parsed.sourceUrl)) {
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
    ...assembleIblaSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeIblaSnapshot(snap);
  return snap;
}

export async function loadIblaDecisions(): Promise<IblaSnapshot> {
  const cached = readIblaSnapshot();
  if (cached && cached.cards.some((card) => isRealIblaDecisionBody(card.body))) return cached;
  try {
    return await collectIblaDecisions();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live IBLA decision fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyIblaSnapshot(
      `IBLA precedential PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildIblaManifest(snap: IblaSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((card) => isRealIblaDecisionBody(card.body) && officialIblaPdfUrl(card.sourceUrl));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      IBLA_DECISIONS_PATH,
      "Count plus citation, docket, parties, disposition, and date. Decision text is the paid GET /ibla-decisions payload. This free manifest lists the cached precedential decisions. asOf is the newest decision date. The oha.doi.gov/IBLA/Ibladecisions folder is the PDF store (directory listing is HTTP 500); links come from the DOI chronological year indexes. Dispositive orders are not this SKU. Not /bsee-reports. Not /epa-eab. Not /fmshrc-orders.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: IBLA_DECISIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: IBLA_DECISIONS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    listedCount: snap?.listedCount ?? cards.length,
    cards: cards.map((card) => ({
      id: card.id,
      citation: card.citation,
      volume: card.volume,
      page: card.page,
      docket: card.docket,
      parties: card.parties,
      disposition: card.disposition,
      kind: card.kind,
      date: card.date,
      title: card.title,
      institution: card.institution,
    })),
    schema: { fields: [...MANIFEST_FIELDS] },
    sources: { listing: PDF_ROOT, chrono: CHRONO_HUB },
  };
}

export function filterIblaManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    return JSON.stringify(raw).toLowerCase().includes(needle);
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadIblaManifest(q?: string): Promise<Record<string, unknown>> {
  return filterIblaManifest(buildIblaManifest(readIblaSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectIblaDecisions()
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
              citation: card.citation,
              docket: card.docket,
              parties: card.parties,
              disposition: card.disposition,
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
