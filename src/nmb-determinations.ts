#!/usr/bin/env node
/**
 * NMB Railway Labor Act §2 Ninth representation determination TEXT door.
 * Index: https://nmb.gov/NMB_Application/index.php/agency-determinations/
 * FY table: https://nmb.gov/NMB_Application/index.php/agency-determinations/fy2026-determinations/
 * PDFs: https://nmb.gov/NMB_Application/wp-content/uploads/YYYY/MM/….pdf
 * 17 U.S.C. § 105. Same extracted-body pipe as /nlrb-decisions, /flra-decisions, and /ecab-decisions.
 * Harvest representation Findings Upon Investigation, certification, and single-carrier
 * determination PDFs (plus dismissal / reconsideration / revocation rows on the same FY table).
 * The Representation Manual, PEB reports, jurisdictional opinion letters, and the comments RSS
 * are not this SKU. Not /nlrb-decisions. Not /flra-decisions.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const NMB_DETERMINATIONS_PATH = "/nmb-determinations";
export const NMB_DETERMINATIONS_MANIFEST_PATH = "/nmb-determinations/manifest.json";
export const NMB_DETERMINATIONS_AMOUNT_ATOMIC = "50000";
export const NMB_DETERMINATIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "nmb-determination-bodies";
export const PRODUCT_NAME = "NMB representation determination text";

export const HUB_URL = "https://nmb.gov/NMB_Application/index.php/agency-determinations/";
export const LISTING_URL = "https://nmb.gov/NMB_Application/index.php/agency-determinations/fy2026-determinations/";
export const PDF_HOST = "nmb.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "National Mediation Board. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** FY slip folder on the WordPress uploads tree. Manuals, PEB reports, and feeds fail the name gate. */
export const SLIP_PDF_RE =
  /^\/NMB_Application\/wp-content\/uploads\/(?:19|20)\d{2}\/\d{2}\/[^/]+\.pdf$/i;
export const REJECT_PDF_RE = /rep-manual|representation-manual|peb-\d|hearing-notice-peb/i;
export const FY_PAGE_RE = /\/agency-determinations\/(?:fy)?((?:19|20)\d{2})-determinations\/?$/i;

export const R7687_ID = "53-nmb-no-34";
export const R7688_ID = "53-nmb-no-33";
export const R7690_ID = "53-nmb-no-30";
export const R7685_ID = "53-nmb-no-29";
export const R7687_URL = "https://nmb.gov/NMB_Application/wp-content/uploads/2026/09/Certification-R-7687.pdf";
export const R7688_URL = "https://nmb.gov/NMB_Application/wp-content/uploads/2026/09/Certification-R-7688.pdf";
export const R7690_URL =
  "https://nmb.gov/NMB_Application/wp-content/uploads/2026/09/Findings-Upon-Investigation-R-7690.pdf";
export const R7685_URL =
  "https://nmb.gov/NMB_Application/wp-content/uploads/2026/07/26.07.23-R-7685-Certification.pdf";

export const BODY_NEEDLE_R7687 = "Brotherhood of Railroad Signalmen (BRS) on June 9, 2026";
export const BODY_NEEDLE_R7688 = "American Train Dispatchers Association (ATDA) on May 5, 2026";
export const BODY_NEEDLE_R7690 = "Are Republic and Mesa operating as a single transportation system?";
export const BODY_NEEDLE_R7685 = "Brotherhood of Locomotive Engineers and Trainmen (BLET) on May 8, 2026";

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

export type NmbKind =
  | "Certification"
  | "Findings Upon Investigation"
  | "Single Carrier Determination"
  | "Dismissal"
  | "Motion for Reconsideration"
  | "Revocation of Certification";

export type NmbListing = {
  id: string;
  citation: string;
  docket: string;
  caseNo: string;
  documentId: string;
  kind: NmbKind;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
};

export type NmbCard = NmbListing & { body: string };

export type NmbSnapshot = {
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
  cards: NmbCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (NMB determinations; +https://nmb.gov/NMB_Application/index.php/agency-determinations/)";
const KEPT_KINDS = new Set<NmbKind>([
  "Certification",
  "Findings Upon Investigation",
  "Single Carrier Determination",
  "Dismissal",
  "Motion for Reconsideration",
  "Revocation of Certification",
]);

export const SEED_LISTINGS: NmbListing[] = [
  {
    id: R7687_ID,
    citation: "53 NMB No. 34",
    docket: "R-7687",
    caseNo: "R-7687",
    documentId: "Certification-R-7687.pdf",
    kind: "Certification",
    institution: "California Northern Railroad Company; BRS; Signal Department Employees",
    date: "2026-09-17",
    title: "53 NMB No. 34",
    sourceUrl: R7687_URL,
  },
  {
    id: R7688_ID,
    citation: "53 NMB No. 33",
    docket: "R-7688",
    caseNo: "R-7688",
    documentId: "Certification-R-7688.pdf",
    kind: "Certification",
    institution:
      "IOWA INTERSTATE RAILROAD; American Train Dispatchers Association (ATDA); Train Dispatchers and Railroad Clerk Employees",
    date: "2026-09-16",
    title: "53 NMB No. 33",
    sourceUrl: R7688_URL,
  },
  {
    id: R7690_ID,
    citation: "53 NMB No. 30",
    docket: "R-7690",
    caseNo: "R-7690",
    documentId: "Findings-Upon-Investigation-R-7690.pdf",
    kind: "Single Carrier Determination",
    institution: "Republic Airways, Inc. / Mesa Airlines, Inc.; IBT / AFA-CWA; Flight Attendants",
    date: "2026-09-01",
    title: "53 NMB No. 30",
    sourceUrl: R7690_URL,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function nmbDeterminationsDir(): string {
  if (env("NMB_DETERMINATIONS_DIR")) return resolve(env("NMB_DETERMINATIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/nmb-determinations"));
}

export function snapshotPath(): string {
  return join(nmbDeterminationsDir(), "snapshot.json");
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
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
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

export function volumeFromHtml(raw: string): number | null {
  const hit = raw.match(/(\d{1,3})\s+NMB\s+Number/i);
  if (!hit) return null;
  const n = Number(hit[1]);
  return n >= 1 && n <= 99 ? n : null;
}

export function primaryCaseNo(raw: string | null | undefined): string {
  if (!raw) return "";
  const hit = raw.match(/\b(R|RD|CR|CJ|A)\s*-\s*(\d+)\b/i);
  if (!hit) return "";
  return `${hit[1].toUpperCase()}-${hit[2]}`;
}

export function kindFromDisposition(raw: string | null | undefined): NmbKind | null {
  const d = stripTags(raw ?? "").toLowerCase();
  if (!d) return null;
  if (/jurisdictional/.test(d)) return null;
  if (/notice of hearing|\bpeb\b|presidential emergency|representation manual/.test(d)) return null;
  if (/single carrier/.test(d)) return "Single Carrier Determination";
  if (/findings upon investigation/.test(d)) return "Findings Upon Investigation";
  if (/revocation/.test(d)) return "Revocation of Certification";
  if (/motion for reconsideration/.test(d)) return "Motion for Reconsideration";
  if (/dismissal/.test(d)) return "Dismissal";
  if (/certification/.test(d)) return "Certification";
  return null;
}

export function officialNmbPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim().replace(/&amp;/g, "&");
  try {
    const parsed = new URL(trimmed, "https://nmb.gov/");
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "nmb.gov") return null;
    const path = decodeURIComponent(parsed.pathname);
    if (!SLIP_PDF_RE.test(path)) return null;
    if (REJECT_PDF_RE.test(path)) return null;
    return `https://nmb.gov${path}`;
  } catch {
    return null;
  }
}

export function documentIdFromUrl(url: string | null | undefined): string {
  const official = officialNmbPdfUrl(url);
  if (!official) return "";
  try {
    return decodeURIComponent(new URL(official).pathname.split("/").pop() || "");
  } catch {
    return "";
  }
}

export function citationId(volume: number, nmbNo: number): string {
  return `${volume}-nmb-no-${nmbNo}`;
}

export function citationFor(volume: number, nmbNo: number): string {
  return `${volume} NMB No. ${nmbNo}`;
}

export function institutionFrom(carrier: string, union: string, craft: string): string {
  return [carrier, union, craft]
    .map((part) => stripTags(part))
    .filter((part) => part && !/^n\/a$/i.test(part))
    .join("; ");
}

function hasDeterminationMarker(head: string): boolean {
  if (/CERTIFICATION/i.test(head)) return true;
  if (/FINDINGS UPON/i.test(head) && /INVESTIGATION/i.test(head)) return true;
  if (/\bDISMISSAL\b/i.test(head)) return true;
  if (/MOTION FOR RECONSIDERATION/i.test(head)) return true;
  if (/REVOCATION OF CERTIFICATION/i.test(head)) return true;
  return false;
}

export function isRepresentationManual(text: string): boolean {
  return /REPRESENTATION MANUAL/i.test(flattenText(text).slice(0, 400));
}

export function isPebReport(text: string): boolean {
  const head = flattenText(text).slice(0, 900);
  if (hasDeterminationMarker(head) && /\d+\s+NMB\s+No\./i.test(head)) return false;
  return /EMERGENCY BOARD/i.test(head);
}

export function isJurisdictionalOpinion(text: string): boolean {
  const head = flattenText(text).slice(0, 2200);
  if (hasDeterminationMarker(head)) return false;
  return /opinion regarding whether/i.test(head);
}

export function isHtmlDetermination(text: string): boolean {
  return /<html[\s>]/i.test(text) && /National Mediation Board/i.test(text);
}

export function isIndexHtml(text: string): boolean {
  return /<table/i.test(text) && /Page Cite/i.test(text) && /NMB Number/i.test(text);
}

export function isCommentsRss(text: string): boolean {
  return /<rss[\s>]/i.test(text) || /comments\/feed/i.test(text.slice(0, 800));
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

export function keepListing(
  row: Pick<NmbListing, "id" | "caseNo" | "kind" | "sourceUrl">,
): boolean {
  if (!KEPT_KINDS.has(row.kind)) return false;
  if (!officialNmbPdfUrl(row.sourceUrl)) return false;
  if (!/^\d+-nmb-no-\d+$/.test(row.id)) return false;
  if (!row.caseNo) return false;
  return true;
}

export function isRealNmbDeterminationBody(text: string): boolean {
  if (
    isRepresentationManual(text) ||
    isPebReport(text) ||
    isJurisdictionalOpinion(text) ||
    isHtmlDetermination(text) ||
    isIndexHtml(text) ||
    isCommentsRss(text) ||
    isJsonFullText(text)
  ) {
    return false;
  }
  const flat = flattenText(text);
  if (flat.length < 600) return false;
  const head = flat.slice(0, 2200);
  const board = /NATIONAL MEDIATION BOARD/i.test(flat);
  const cite = /\d+\s+NMB\s+No\.\s+\d+/i.test(flat);
  const rla = /Railway\s+Labor\s+Act/i.test(flat) || /Section\s+2,\s*Ninth/i.test(flat);
  return board && cite && rla && hasDeterminationMarker(head);
}

function emptySources(): NmbSnapshot["sources"] {
  return { listing: HUB_URL, pdfHost: "https://nmb.gov/NMB_Application/wp-content/uploads/" };
}

export function parseNmbDeterminationsHtml(raw: string, pageUrl = ""): NmbListing[] {
  let volume = volumeFromHtml(raw);
  if (!volume) {
    const year = pageUrl.match(/(?:fy)?((?:19|20)\d{2})-determinations/i);
    if (year) {
      const fy = Number(year[1]);
      if (fy >= 1974) volume = fy - 1973;
    }
  }
  if (!volume) return [];
  const out: NmbListing[] = [];
  const seen = new Set<string>();
  for (const row of raw.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const html = row[1] ?? "";
    const href = [...html.matchAll(/href="([^"]+)"/gi)]
      .map((m) => m[1] ?? "")
      .find((link) => officialNmbPdfUrl(link));
    const sourceUrl = officialNmbPdfUrl(href);
    const cells = [...html.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1] ?? ""));
    if (!sourceUrl || cells.length < 8) continue;
    const nmbNo = Number((cells[7] ?? "").match(/\d+/)?.[0] ?? "");
    if (!Number.isFinite(nmbNo) || nmbNo < 1) continue;
    const kind = kindFromDisposition(cells[6]);
    if (!kind) continue;
    const caseNo = primaryCaseNo(cells[2]);
    if (!caseNo) continue;
    const id = citationId(volume, nmbNo);
    const citation = citationFor(volume, nmbNo);
    const listing: NmbListing = {
      id,
      citation,
      docket: caseNo,
      caseNo,
      documentId: documentIdFromUrl(sourceUrl),
      kind,
      institution: institutionFrom(cells[3] ?? "", cells[4] ?? "", cells[5] ?? "") || caseNo,
      date: isoDate(cells[1]),
      title: citation,
      sourceUrl,
    };
    if (!keepListing(listing)) continue;
    if (seen.has(listing.id)) continue;
    seen.add(listing.id);
    out.push(listing);
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

function sortKey(row: { date: string | null; id: string }): string {
  const num = row.id.split("-").pop()?.padStart(4, "0") ?? "0000";
  return `${row.date ?? "0000-00-00"}-${num}`;
}

export function discoverFyPageUrls(raw: string, baseUrl: string): string[] {
  const out: { href: string; year: number }[] = [];
  const seen = new Set<string>();
  for (const match of raw.matchAll(/href="([^"]+)"/gi)) {
    try {
      const url = new URL(match[1], baseUrl);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (host !== "nmb.gov") continue;
      const hit = url.pathname.match(FY_PAGE_RE);
      if (!hit) continue;
      const year = Number(hit[1]);
      const href = `https://nmb.gov${url.pathname.replace(/\/$/, "")}`;
      if (seen.has(href)) continue;
      seen.add(href);
      out.push({ href, year });
    } catch {
      /* skip */
    }
  }
  out.sort((a, b) => b.year - a.year || b.href.localeCompare(a.href));
  return out.map((row) => row.href);
}

export function parseNmbDeterminationText(
  text: string,
  meta: Partial<NmbListing> & { sourceUrl: string },
): NmbCard {
  const body = text.replace(/\f/g, "\n").trim();
  const flat = flattenText(body);
  const sourceUrl = officialNmbPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const cite = flat.match(/\b(\d+)\s+NMB\s+No\.\s+(\d+)\b/i);
  const volume = cite ? Number(cite[1]) : 0;
  const nmbNo = cite ? Number(cite[2]) : 0;
  const caseNo =
    primaryCaseNo(meta.caseNo) ||
    primaryCaseNo(flat.match(/CASE\s+NO\.\s*((?:R|RD|CR|CJ|A)\s*-\s*\d+)/i)?.[1]) ||
    primaryCaseNo(documentIdFromUrl(sourceUrl));
  const id = meta.id || (volume && nmbNo ? citationId(volume, nmbNo) : caseNo);
  const citation = meta.citation || (volume && nmbNo ? citationFor(volume, nmbNo) : id);
  const issued = isoDate(flat.match(/\b([A-Z][a-z]+\.?\s+\d{1,2},\s+\d{4})\b/)?.[1] ?? "");
  return {
    id,
    citation,
    docket: meta.docket || caseNo,
    caseNo,
    documentId: meta.documentId || documentIdFromUrl(sourceUrl),
    kind: meta.kind || "Certification",
    institution: meta.institution || caseNo,
    date: meta.date ?? issued,
    title: meta.title || citation || "NMB determination",
    sourceUrl,
    body,
  };
}

export function emptyNmbDeterminationsSnapshot(reason: string): NmbSnapshot {
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

export function assembleNmbDeterminationsSnapshot(cards: NmbCard[], fetchedAt?: string): NmbSnapshot {
  const kept = cards.filter((c) => isRealNmbDeterminationBody(c.body) && keepListing(c));
  kept.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  const asOf =
    kept
      .map((c) => c.date)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: kept.length ? "ok" : "empty",
    reason: kept.length ? null : "Official NMB determination PDFs had no extractable determination text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): NmbSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as NmbSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleNmbDeterminationsSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readNmbDeterminationsSnapshot(): NmbSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeNmbDeterminationsSnapshot(snap: NmbSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchNmbText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchNmbBytes(url: string): Promise<Uint8Array> {
  const official = officialNmbPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,application/octet-stream" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("NMB_DETERMINATIONS_PDFTOTEXT") || "pdftotext";
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
  return env("NMB_DETERMINATIONS_HTML_DIR") || env("NMB_DETERMINATIONS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("NMB_DETERMINATIONS_LIMIT", "7"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 7;
}

function maxFetchLimit(): number {
  const n = Number(env("NMB_DETERMINATIONS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxListingPages(): number {
  const n = Number(env("NMB_DETERMINATIONS_PAGES", "2"));
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

function mergeListings(listed: NmbListing[]): NmbListing[] {
  const seen = new Set<string>();
  const out: NmbListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepListing(row)) continue;
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

export async function walkOfficialNmbDeterminations(): Promise<{ listed: NmbListing[]; listedCount: number }> {
  const listed: NmbListing[] = [];
  let pages: string[] = [];
  try {
    const hub = await fetchNmbText(HUB_URL);
    pages = discoverFyPageUrls(hub, HUB_URL);
  } catch {
    pages = [];
  }
  if (!pages.includes(LISTING_URL.replace(/\/$/, "")) && !pages.some((p) => p.includes("fy2026-determinations"))) {
    pages.unshift(LISTING_URL.replace(/\/$/, ""));
  }
  const cap = maxListingPages();
  let got = 0;
  for (const page of pages) {
    if (got >= cap) break;
    try {
      const rows = parseNmbDeterminationsHtml(await fetchNmbText(page), page);
      if (rows.length === 0) continue;
      listed.push(...rows);
      got += 1;
    } catch {
      /* unpublished FY pages 404; keep walking newer-first */
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: NmbListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing-excerpt.html", "listing.html", "fy2026.html"]);
    const listed = raw ? parseNmbDeterminationsHtml(raw, LISTING_URL) : [];
    const merged = mergeListings(listed);
    return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialNmbDeterminations();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectNmbDeterminations(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<NmbSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = nmbDeterminationsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, NmbCard>();
  for (const card of readNmbDeterminationsSnapshot()?.cards ?? []) {
    if (isRealNmbDeterminationBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const cards: NmbCard[] = [];
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
    const cached = prior.get(row.id);
    if (cached) {
      cards.push(cached);
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    try {
      const localText = readNamedFile(
        dir,
        [`${row.id}.txt`, row.documentId.replace(/\.pdf$/i, ".txt")].filter(Boolean),
      );
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialNmbPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchNmbBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (
        isRepresentationManual(text) ||
        isPebReport(text) ||
        isJurisdictionalOpinion(text) ||
        isHtmlDetermination(text) ||
        isCommentsRss(text) ||
        isJsonFullText(text)
      ) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseNmbDeterminationText(text, { ...row, sourceUrl });
      if (!isRealNmbDeterminationBody(parsed.body) || !keepListing(parsed)) {
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
    ...assembleNmbDeterminationsSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeNmbDeterminationsSnapshot(snap);
  return snap;
}

export async function loadNmbDeterminations(): Promise<NmbSnapshot> {
  const cached = readNmbDeterminationsSnapshot();
  if (cached && cached.cards.some((c) => isRealNmbDeterminationBody(c.body))) return cached;
  try {
    return await collectNmbDeterminations();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live NMB determination fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyNmbDeterminationsSnapshot(
      `NMB determination PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildNmbDeterminationsManifest(snap: NmbSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealNmbDeterminationBody(c.body) && keepListing(c));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      NMB_DETERMINATIONS_PATH,
      "Count + citation + case + date + institution only. Determination body is the paid GET /nmb-determinations payload. This free manifest lists the full catalog. Harvest representation Findings Upon Investigation, certification, and single-carrier PDFs. The Representation Manual, PEB reports, jurisdictional opinion letters, and the comments RSS are not this SKU. Not /nlrb-decisions. Not /flra-decisions.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: NMB_DETERMINATIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: NMB_DETERMINATIONS_ONE_AMOUNT_ATOMIC,
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

export function filterNmbDeterminationsManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
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

export async function loadNmbDeterminationsManifest(q?: string): Promise<Record<string, unknown>> {
  return filterNmbDeterminationsManifest(buildNmbDeterminationsManifest(readNmbDeterminationsSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectNmbDeterminations()
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
