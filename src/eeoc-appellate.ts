#!/usr/bin/env node
/**
 * EEOC Office of Federal Sector appellate and reconsideration TEXT door.
 * Search: https://www.eeoc.gov/federal-sector/appellate-decisions
 * PDFs: https://www.eeoc.gov/sites/default/files/decisions/YYYY_MM_DD/*.pdf
 * and https://www.eeoc.gov/sites/default/files/YYYY-MM/*.pdf
 * 17 U.S.C. § 105. Same extracted-body pipe as /nmb-determinations, /nlrb-decisions,
 * /flra-decisions, and /ecab-decisions.
 * Harvest Appeal No. / Request No. decisions under 29 C.F.R. Part 1614.
 * Digest-only pages, EEO-1 data, private-sector charge closures, and Copyright
 * Royalty Board final rate-determination Federal Register wraps are not this SKU.
 * Not /flra-decisions. Not /nlrb-decisions. Not /nmb-determinations. Not /ecab-decisions.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const EEOC_APPELLATE_PATH = "/eeoc-appellate";
export const EEOC_APPELLATE_MANIFEST_PATH = "/eeoc-appellate/manifest.json";
export const EEOC_APPELLATE_AMOUNT_ATOMIC = "50000";
export const EEOC_APPELLATE_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "eeoc-appellate-bodies";
export const PRODUCT_NAME = "EEOC OFS appellate decision text";

export const SEARCH_URL = "https://www.eeoc.gov/federal-sector/appellate-decisions";
export const PDF_HOST = "www.eeoc.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "U.S. Equal Employment Opportunity Commission, Office of Federal Sector. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const DECISIONS_PDF_RE =
  /^\/sites\/default\/files\/decisions\/(?:19|20)\d{2}_\d{2}_\d{2}\/[^/]+\.pdf$/i;
export const MONTH_PDF_RE = /^\/sites\/default\/files\/(?:19|20)\d{2}-\d{2}\/[^/]+\.pdf$/i;
export const REJECT_PDF_RE = /digest|eeo-?1|charge-closure|copyright-royalty|\bcrb\b/i;
const NUMBER_SRC = "(?:19|20)\\d{8}";

export const REQUEST_2858_ID = "request-2026002858";
export const REQUEST_2233_ID = "request-2026002233";
export const APPEAL_3976_ID = "appeal-2025003976";
export const REQUEST_2858_URL =
  "https://www.eeoc.gov/sites/default/files/decisions/2026_09_08/2026002858.%20DEC.pdf";
export const REQUEST_2233_URL =
  "https://www.eeoc.gov/sites/default/files/decisions/2026_09_08/2026002233%3B%202026002234%20DEC.pdf";
export const APPEAL_3976_URL = "https://www.eeoc.gov/sites/default/files/2026-02/2025003976.pdf";

export const BODY_NEEDLE_2858 = "FV-0801-J General Engineer";
export const BODY_NEEDLE_2233 = "reconsideration is not a second appeal";
export const BODY_NEEDLE_3976 = "maintain single-sex bathrooms and similar intimate spaces";

export const CARD_FIELDS = [
  "id",
  "citation",
  "docket",
  "caseNo",
  "documentId",
  "kind",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type EeocKind = "Appeal" | "Request for Reconsideration";

export type EeocListing = {
  id: string;
  citation: string;
  docket: string;
  caseNo: string;
  documentId: string;
  kind: EeocKind;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
};

export type EeocCard = EeocListing & { body: string };

export type EeocSnapshot = {
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
  cards: EeocCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (EEOC OFS appellate decisions; +https://www.eeoc.gov/federal-sector/appellate-decisions)";

export const SEED_LISTINGS: EeocListing[] = [
  {
    id: REQUEST_2858_ID,
    citation: "Request No. 2026002858",
    docket: "2026002858",
    caseNo: "2025001848",
    documentId: "2026002858. DEC.pdf",
    kind: "Request for Reconsideration",
    institution: "Lenard T; Department of Transportation; Federal Aviation Administration",
    date: "2026-08-24",
    title: "Request No. 2026002858",
    sourceUrl: REQUEST_2858_URL,
  },
  {
    id: REQUEST_2233_ID,
    citation: "Request Nos. 2026002233 and 2026002234",
    docket: "2026002233; 2026002234",
    caseNo: "2023005026; 2023004980",
    documentId: "2026002233; 2026002234 DEC.pdf",
    kind: "Request for Reconsideration",
    institution: "Walton Z.; Department of State; Department of War",
    date: "2026-08-11",
    title: "Request Nos. 2026002233 and 2026002234",
    sourceUrl: REQUEST_2233_URL,
  },
  {
    id: APPEAL_3976_ID,
    citation: "Appeal No. 2025003976",
    docket: "2025003976",
    caseNo: "2025003976",
    documentId: "2025003976.pdf",
    kind: "Appeal",
    institution: "Department of the Army",
    date: "2026-02-26",
    title: "Appeal No. 2025003976",
    sourceUrl: APPEAL_3976_URL,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function eeocAppellateDir(): string {
  if (env("EEOC_APPELLATE_DIR")) return resolve(env("EEOC_APPELLATE_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/eeoc-appellate"));
}

export function snapshotPath(): string {
  return join(eeocAppellateDir(), "snapshot.json");
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " "));
}

export function flattenText(raw: string): string {
  return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const named = raw.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (!named) return null;
  const months: Record<string, string> = {
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
  const mm = months[named[1].toLowerCase().replace(/\.$/, "")];
  return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
}

export function numbersIn(raw: string): string[] {
  return [...raw.matchAll(new RegExp(NUMBER_SRC, "g"))].map((m) => m[0]);
}

export function officialEeocPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = decodeEntities(urlOrPath.trim());
  try {
    const parsed = new URL(trimmed, "https://www.eeoc.gov/");
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "eeoc.gov") return null;
    const path = decodeURIComponent(parsed.pathname);
    if (!DECISIONS_PDF_RE.test(path) && !MONTH_PDF_RE.test(path)) return null;
    if (REJECT_PDF_RE.test(path)) return null;
    const encoded = path
      .split("/")
      .map((seg, i) => (i === 0 ? "" : encodeURIComponent(seg)))
      .join("/");
    return `https://www.eeoc.gov${encoded}`;
  } catch {
    return null;
  }
}

export function documentIdFromUrl(url: string | null | undefined): string {
  const official = officialEeocPdfUrl(url);
  if (!official) return "";
  try {
    return decodeURIComponent(new URL(official).pathname.split("/").pop() || "");
  } catch {
    return "";
  }
}

function captionNumbers(flat: string, label: "Request" | "Appeal"): string[] {
  const re = new RegExp(
    `${label} Nos?\\.?\\s+((?:(?:19|20)\\d{8})(?:\\s*(?:,|and)\\s*(?:(?:19|20)\\d{8}))*)`,
    "i",
  );
  const hit = flat.match(re);
  if (!hit) return [];
  return numbersIn(hit[1] ?? "");
}

function headerNumber(flat: string): string {
  const counts = new Map<string, number>();
  for (const n of numbersIn(flat)) counts.set(n, (counts.get(n) ?? 0) + 1);
  let best = "";
  let bestN = 0;
  for (const [n, c] of counts) {
    if (c > bestN) {
      best = n;
      bestN = c;
    }
  }
  return best;
}

export function institutionFromText(flat: string): string {
  const name = flat.match(/([A-Z][a-z]+(?:\s+[A-Z]\.?)?),?\d*\s+Complainant/i)?.[1] ?? "";
  const departments = [
    ...flat.matchAll(/Department of [A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}/g),
  ].map((m) => m[0]);
  const agencies = [...flat.matchAll(/Federal [A-Z][A-Za-z]+ Administration/g)].map((m) => m[0]);
  const parts: string[] = [];
  if (name) parts.push(name.replace(/\s+/g, " ").trim());
  for (const part of [...departments, ...agencies]) {
    if (!parts.includes(part)) parts.push(part);
  }
  if (/\bthe Army\b/.test(flat) && !parts.some((p) => /Army/.test(p))) parts.push("Department of the Army");
  return parts.slice(0, 4).join("; ");
}

export function isDigestOnly(text: string): boolean {
  const head = flattenText(text).slice(0, 500);
  return /EEOC DIGEST/i.test(head) || (/brief summary only/i.test(head) && /digest/i.test(head));
}

export function isEeo1(text: string): boolean {
  const flat = flattenText(text).slice(0, 800);
  return /EEO-1 Component|Employer Information Report EEO-1|EEO-1 data/i.test(flat);
}

export function isChargeClosure(text: string): boolean {
  const flat = flattenText(text).slice(0, 1200);
  return /private-sector charge|charge was closed|no reasonable cause determination/i.test(flat);
}

export function isCrbWrap(text: string): boolean {
  const flat = flattenText(text).slice(0, 1200);
  return /Copyright Royalty Board/i.test(flat) || (/Federal Register/i.test(flat) && /rate determination/i.test(flat));
}

export function isHtmlDecision(text: string): boolean {
  return /<html[\s>]/i.test(text);
}

export function isJsonFullText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function keepListing(row: Pick<EeocListing, "id" | "sourceUrl">): boolean {
  if (!officialEeocPdfUrl(row.sourceUrl)) return false;
  return /^(?:request|appeal|ofs)-\d{10}$/.test(row.id);
}

export function isFinalId(id: string): boolean {
  return /^(?:request|appeal)-\d{10}$/.test(id);
}

export function isRealEeocAppellateBody(text: string): boolean {
  if (isDigestOnly(text) || isEeo1(text) || isChargeClosure(text) || isCrbWrap(text) || isHtmlDecision(text) || isJsonFullText(text)) {
    return false;
  }
  const flat = flattenText(text);
  if (flat.length < 600) return false;
  const commission =
    /EQUAL EMPLOYMENT OPPORTUNITY COMMISSION/i.test(flat) ||
    /E\.E\.O\.C\./i.test(flat) ||
    /EEOC(?:'s| or Commission)/i.test(flat);
  const part1614 = /29\s*C\.?\s*F\.?\s*R\.?\s*§?\s*1614/i.test(flat) || /Part 1614/i.test(flat);
  const numbered = captionNumbers(flat, "Request").length > 0 || captionNumbers(flat, "Appeal").length > 0 || Boolean(headerNumber(flat));
  const decision =
    /DECISION ON REQUEST FOR RECONSIDERATION/i.test(flat) ||
    /\bit is the decision of the Commission\b/i.test(flat) ||
    /Complainant appeals/i.test(flat) ||
    /Office of Federal Sector/i.test(flat);
  return commission && part1614 && numbered && decision;
}

function emptySources(): EeocSnapshot["sources"] {
  return { listing: SEARCH_URL, pdfHost: "https://www.eeoc.gov/sites/default/files/" };
}

export function listingFromUrl(sourceUrl: string): EeocListing | null {
  const official = officialEeocPdfUrl(sourceUrl);
  if (!official) return null;
  const documentId = documentIdFromUrl(official);
  const nums = numbersIn(decodeURIComponent(documentId));
  const primary = nums[0];
  if (!primary) return null;
  return {
    id: `ofs-${primary}`,
    citation: primary,
    docket: nums.join("; "),
    caseNo: primary,
    documentId,
    kind: "Appeal",
    institution: "",
    date: null,
    title: primary,
    sourceUrl: official,
  };
}

export function parseEeocAppellateHtml(raw: string): EeocListing[] {
  const out: EeocListing[] = [];
  const seen = new Set<string>();
  for (const match of raw.matchAll(/href="([^"]+)"/gi)) {
    const listing = listingFromUrl(match[1] ?? "");
    if (!listing || seen.has(listing.sourceUrl)) continue;
    seen.add(listing.sourceUrl);
    out.push(listing);
  }
  return out;
}

export function discoverSearchPageUrls(raw: string, baseUrl: string): string[] {
  const out: { href: string; page: number }[] = [];
  const seen = new Set<string>();
  for (const match of raw.matchAll(/href="([^"]+)"/gi)) {
    try {
      const url = new URL(decodeEntities(match[1] ?? ""), baseUrl);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (host && host !== "eeoc.gov") continue;
      if (!url.pathname.includes("/federal-sector/appellate-decisions") && !url.searchParams.has("appellate_keywords")) {
        continue;
      }
      if (!url.searchParams.has("page")) continue;
      const page = Number(url.searchParams.get("page"));
      if (!Number.isFinite(page)) continue;
      const href = `https://www.eeoc.gov/federal-sector/appellate-decisions?${url.searchParams.toString()}`;
      if (seen.has(href)) continue;
      seen.add(href);
      out.push({ href, page });
    } catch {
      /* skip */
    }
  }
  out.sort((a, b) => a.page - b.page || a.href.localeCompare(b.href));
  return out.map((row) => row.href);
}

function sortKey(row: { date: string | null; id: string }): string {
  const num = row.id.split("-").pop()?.padStart(12, "0") ?? "0000";
  return `${row.date ?? "0000-00-00"}-${num}`;
}

export function parseEeocAppellateText(text: string, meta: Partial<EeocListing> & { sourceUrl: string }): EeocCard {
  const body = text.replace(/\f/g, "\n").trim();
  const flat = flattenText(body);
  const sourceUrl = officialEeocPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const requests = captionNumbers(flat, "Request");
  const appeals = captionNumbers(flat, "Appeal");
  const header = headerNumber(flat);
  const kind: EeocKind = requests.length ? "Request for Reconsideration" : "Appeal";
  const primary = requests[0] || appeals[0] || header || numbersIn(documentIdFromUrl(sourceUrl))[0] || "";
  const id = meta.id && isFinalId(meta.id) ? meta.id : primary ? `${kind === "Appeal" ? "appeal" : "request"}-${primary}` : meta.id || "";
  const citation =
    meta.citation && /(?:Request|Appeal) No/.test(meta.citation)
      ? meta.citation
      : requests.length > 1
        ? `Request Nos. ${requests.join(" and ")}`
        : requests.length === 1
          ? `Request No. ${requests[0]}`
          : appeals.length
            ? `Appeal No. ${appeals[0]}`
            : primary
              ? `Appeal No. ${primary}`
              : id;
  const docket = requests.length ? requests.join("; ") : appeals[0] || primary;
  const caseNo = requests.length ? (appeals.length ? appeals.join("; ") : requests.join("; ")) : appeals[0] || primary;
  const dates = [...flat.matchAll(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/g)];
  const issued = isoDate(dates.at(-1)?.[0] ?? "");
  return {
    id,
    citation,
    docket: meta.docket || docket,
    caseNo: meta.caseNo || caseNo,
    documentId: meta.documentId || documentIdFromUrl(sourceUrl),
    kind: meta.kind && meta.id && isFinalId(meta.id) ? meta.kind : kind,
    institution: meta.institution || institutionFromText(flat) || citation,
    date: meta.date ?? issued,
    title: meta.title && /(?:Request|Appeal) No/.test(meta.title) ? meta.title : citation,
    sourceUrl,
    body,
  };
}

export function emptyEeocAppellateSnapshot(reason: string): EeocSnapshot {
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

export function assembleEeocAppellateSnapshot(cards: EeocCard[], fetchedAt?: string): EeocSnapshot {
  const kept = cards.filter((c) => isRealEeocAppellateBody(c.body) && isFinalId(c.id) && officialEeocPdfUrl(c.sourceUrl));
  const seen = new Set<string>();
  const unique: EeocCard[] = [];
  for (const card of kept) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    unique.push(card);
  }
  unique.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  const asOf =
    unique
      .map((c) => c.date)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: unique.length ? "ok" : "empty",
    reason: unique.length ? null : "Official EEOC appellate PDFs had no extractable OFS decision text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: unique,
  };
}

function parseSnapshotFile(raw: unknown): EeocSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as EeocSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleEeocAppellateSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readEeocAppellateSnapshot(): EeocSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeEeocAppellateSnapshot(snap: EeocSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchEeocText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchEeocBytes(url: string): Promise<Uint8Array> {
  const official = officialEeocPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,application/octet-stream,*/*" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("EEOC_APPELLATE_PDFTOTEXT") || "pdftotext";
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

function listingDir(): string {
  return env("EEOC_APPELLATE_HTML_DIR") || env("EEOC_APPELLATE_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("EEOC_APPELLATE_LIMIT", "7"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 7;
}

function maxFetchLimit(): number {
  const n = Number(env("EEOC_APPELLATE_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxListingPages(): number {
  const n = Number(env("EEOC_APPELLATE_PAGES", "2"));
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

function mergeListings(listed: EeocListing[]): EeocListing[] {
  const seen = new Set<string>();
  const out: EeocListing[] = [];
  for (const row of [...SEED_LISTINGS, ...listed]) {
    const sourceUrl = officialEeocPdfUrl(row.sourceUrl);
    if (!sourceUrl || !keepListing(row)) continue;
    if (seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);
    out.push({ ...row, sourceUrl });
  }
  return out;
}

export async function walkOfficialEeocAppellate(): Promise<{ listed: EeocListing[]; listedCount: number }> {
  const queries = (env("EEOC_APPELLATE_QUERIES") || "2026")
    .split(",")
    .map((q) => q.trim())
    .filter(Boolean);
  const cap = maxListingPages();
  const listed: EeocListing[] = [];
  for (const q of queries) {
    for (let page = 0; page < cap; page += 1) {
      const url = `${SEARCH_URL}?appellate_keywords=${encodeURIComponent(q)}&page=${page}`;
      try {
        const rows = parseEeocAppellateHtml(await fetchEeocText(url));
        if (rows.length === 0) break;
        listed.push(...rows);
      } catch {
        break;
      }
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: EeocListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["search-excerpt.html", "listing.html", "search.html"]);
    const listed = raw ? parseEeocAppellateHtml(raw) : [];
    const merged = mergeListings(listed);
    return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialEeocAppellate();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectEeocAppellate(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<EeocSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = eeocAppellateDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, EeocCard>();
  for (const card of readEeocAppellateSnapshot()?.cards ?? []) {
    if (isRealEeocAppellateBody(card.body) && isFinalId(card.id)) prior.set(card.id, card);
  }
  const cards: EeocCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    if (!keepListing(row)) {
      skippedNoText += 1;
      continue;
    }
    const cached = isFinalId(row.id) ? prior.get(row.id) : undefined;
    if (cached) {
      cards.push(cached);
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    try {
      const localNames = [`${row.id}.txt`, row.documentId.replace(/\.pdf$/i, ".txt")].filter(Boolean);
      const localText = readNamedFile(dir, localNames);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialEeocPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchEeocBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (isDigestOnly(text) || isEeo1(text) || isChargeClosure(text) || isCrbWrap(text) || isHtmlDecision(text) || isJsonFullText(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseEeocAppellateText(text, { ...row, sourceUrl });
      if (!isRealEeocAppellateBody(parsed.body) || !isFinalId(parsed.id) || !officialEeocPdfUrl(parsed.sourceUrl)) {
        skippedNoText += 1;
        continue;
      }
      if (seen.has(parsed.id)) continue;
      const cachedParsed = prior.get(parsed.id);
      if (cachedParsed) {
        cards.push(cachedParsed);
        seen.add(parsed.id);
        reused += 1;
        continue;
      }
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
    ...assembleEeocAppellateSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeEeocAppellateSnapshot(snap);
  return snap;
}

export async function loadEeocAppellate(): Promise<EeocSnapshot> {
  const cached = readEeocAppellateSnapshot();
  if (cached && cached.cards.some((c) => isRealEeocAppellateBody(c.body))) return cached;
  try {
    return await collectEeocAppellate();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live EEOC appellate fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyEeocAppellateSnapshot(
      `EEOC appellate PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildEeocAppellateManifest(snap: EeocSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealEeocAppellateBody(c.body) && isFinalId(c.id));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      EEOC_APPELLATE_PATH,
      "Count + citation + case + date + institution only. Decision body is the paid GET /eeoc-appellate payload. This free manifest lists the full catalog. Harvest EEOC Office of Federal Sector Appeal No. and Request No. decisions under 29 C.F.R. Part 1614. Digest-only pages, EEO-1 data, private-sector charge closures, and Copyright Royalty Board rate-determination wraps are not this SKU. Not /flra-decisions. Not /nlrb-decisions. Not /nmb-determinations. Not /ecab-decisions.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: EEOC_APPELLATE_AMOUNT_ATOMIC,
    oneAmountAtomic: EEOC_APPELLATE_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      citation: c.citation,
      docket: c.docket,
      caseNo: c.caseNo,
      documentId: c.documentId,
      kind: c.kind,
      date: c.date,
      title: c.title,
    })),
    schema: {
      fields: ["id", "institution", "citation", "docket", "caseNo", "documentId", "kind", "date", "title"],
    },
    sources: {
      listing: (snap?.sources ?? emptySources()).listing,
    },
  };
}

export function filterEeocAppellateManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "citation", "docket", "caseNo", "documentId", "kind", "date", "title"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadEeocAppellateManifest(q?: string): Promise<Record<string, unknown>> {
  return filterEeocAppellateManifest(buildEeocAppellateManifest(readEeocAppellateSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectEeocAppellate()
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
              citation: c.citation,
              docket: c.docket,
              documentId: c.documentId,
              kind: c.kind,
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
