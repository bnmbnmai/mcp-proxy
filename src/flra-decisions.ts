#!/usr/bin/env node
/**
 * FLRA Authority Decision TEXT door.
 * Index: https://www.flra.gov/decisions/authority-decisions
 * PDFs: https://www.flra.gov/system/files/decisions/{file}.pdf
 * Slip opinions "NN FLRA NNN". 17 U.S.C. § 105.
 * Harvest FLRA-authored Authority Decision PDFs only.
 * Case digests, ALJ decisions, FSIP decisions, and the HTML slip
 * (full text, but not JSON) are not this SKU.
 * No-auth ?_format=json on the decision route is HTTP 406.
 * Not /nlrb-decisions.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const FLRA_DECISIONS_PATH = "/flra-decisions";
export const FLRA_DECISIONS_MANIFEST_PATH = "/flra-decisions/manifest.json";
export const FLRA_DECISIONS_AMOUNT_ATOMIC = "50000";
export const FLRA_DECISIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "flra-authority-decision-bodies";
export const PRODUCT_NAME = "FLRA Authority Decision text";

export const LISTING_URL = "https://www.flra.gov/decisions/authority-decisions";
export const PDF_HOST = "www.flra.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Federal Labor Relations Authority. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** Listing citation is volume + first page: "74 FLRA 541". Not "74 FLRA No. 80". */
export const CITATION_RE = /\b(\d{1,3})\s+FLRA\s+(\d{2,4})\b/i;
export const SLIP_NO_RE = /\b(\d{1,3})\s+FLRA\s+No\.\s+(\d+)\b/i;
export const CASE_NO_RE = /\b((?:[A-Z0-9]{1,6}-){2,4}[A-Z0-9]{1,6})\b/;

export const USMC_ID = "74-flra-541";
export const BEP_ID = "74-flra-530";
export const NATCA_ID = "74-flra-524";
export const ERS_ID = "74-flra-508";
export const USMC_URL = "https://www.flra.gov/system/files/decisions/v74_80.pdf";
export const BEP_URL = "https://www.flra.gov/system/files/decisions/v74_79.pdf";
export const NATCA_URL = "https://www.flra.gov/system/files/decisions/v74_78.pdf";
export const ERS_URL = "https://www.flra.gov/system/files/decisions/v74_77_0.pdf";

export const BODY_NEEDLE_USMC = "jurisdiction due to Executive Order 12171";
export const BODY_NEEDLE_BEP = "return to pre-pandemic work";
export const BODY_NEEDLE_NATCA = "two CBAs, which as relevant";
export const BODY_NEEDLE_ERS = "Section 7115 of the Statute concerns";

export const CARD_FIELDS = [
  "id",
  "citation",
  "caseNo",
  "documentId",
  "kind",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type FlraKind = "Order Dismissing Exceptions" | "Decision and Order" | "Decision" | "Authority Decision";

export type FlraListing = {
  id: string;
  citation: string;
  caseNo: string;
  documentId: string;
  kind: FlraKind;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
};

export type FlraCard = FlraListing & { body: string };

export type FlraSnapshot = {
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
  cards: FlraCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (FLRA Authority decisions; +https://www.flra.gov/decisions/authority-decisions)";

export const SEED_LISTINGS: FlraListing[] = [
  {
    id: USMC_ID,
    citation: "74 FLRA 541",
    caseNo: "0-AR-5810",
    documentId: "v74_80.pdf",
    kind: "Order Dismissing Exceptions",
    institution:
      "United States Marine Corps, Marine Air Ground Task Force Training Command, Marine Corps Air Ground Combat Center, Twentynine Palms, California (Agency) and American Federation of Government Employees, Local 2018 (Union)",
    date: "2026-09-22",
    title: "74 FLRA 541",
    sourceUrl: USMC_URL,
  },
  {
    id: BEP_ID,
    citation: "74 FLRA 530",
    caseNo: "0-AR-6030",
    documentId: "v74_79.pdf",
    kind: "Authority Decision",
    institution:
      "United States Department of the Treasury, Bureau of Engraving and Printing (Agency) and National Treasury Employees Union (Union)",
    date: "2026-09-15",
    title: "74 FLRA 530",
    sourceUrl: BEP_URL,
  },
  {
    id: NATCA_ID,
    citation: "74 FLRA 524",
    caseNo: "0-AR-5877",
    documentId: "v74_78.pdf",
    kind: "Authority Decision",
    institution:
      "National Air Traffic Controllers Association (Union) and United States Department of Transportation, Federal Aviation Administration (Agency)",
    date: "2026-09-14",
    title: "74 FLRA 524",
    sourceUrl: NATCA_URL,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function flraDecisionsDir(): string {
  if (env("FLRA_DECISIONS_DIR")) return resolve(env("FLRA_DECISIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/flra-decisions"));
}

export function snapshotPath(): string {
  return join(flraDecisionsDir(), "snapshot.json");
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
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
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

export function parseCitation(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = raw.replace(/\s+/g, " ");
  const withoutSlipNo = cleaned.replace(SLIP_NO_RE, " ");
  const hit = withoutSlipNo.match(CITATION_RE);
  return hit ? `${hit[1]} FLRA ${hit[2]}` : "";
}

export function parseSlipNo(raw: string | null | undefined): string {
  if (!raw) return "";
  const hit = raw.replace(/\s+/g, " ").match(SLIP_NO_RE);
  return hit ? `${hit[1]} FLRA No. ${hit[2]}` : "";
}

export function catalogIdFromCitation(citation: string): string {
  return citation.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function normalizeCaseNo(raw: string | null | undefined): string {
  if (!raw) return "";
  const hit = raw.toUpperCase().replace(/[–—]/g, "-").match(CASE_NO_RE);
  return hit ? hit[1] : "";
}

export function officialFlraPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim().replace(/&amp;/g, "&");
  try {
    const parsed = new URL(trimmed, "https://www.flra.gov/");
    const host = parsed.hostname.toLowerCase();
    if (host !== "www.flra.gov" && host !== "flra.gov") return null;
    const path = decodeURIComponent(parsed.pathname);
    const lower = path.toLowerCase();
    if (!lower.startsWith("/system/files/decisions/")) return null;
    if (lower.includes("/digest/")) return null;
    if (!lower.endsWith(".pdf")) return null;
    const encoded = path
      .split("/")
      .map((part, index) => (index === 0 ? "" : encodeURIComponent(part)))
      .join("/");
    return `https://www.flra.gov${encoded}`;
  } catch {
    return null;
  }
}

export function documentIdFromUrl(url: string | null | undefined): string {
  const official = officialFlraPdfUrl(url);
  if (!official) return "";
  try {
    const name = decodeURIComponent(new URL(official).pathname.split("/").pop() || "");
    return name.toLowerCase();
  } catch {
    return "";
  }
}

export function parseKind(raw: string): FlraKind {
  if (/ORDER DISMISSING EXCEPTIONS/i.test(raw)) return "Order Dismissing Exceptions";
  if (/DECISION AND ORDER/i.test(raw)) return "Decision and Order";
  if (/\bDECISION\b/i.test(raw)) return "Decision";
  return "Authority Decision";
}

export function isCaseDigest(text: string): boolean {
  const head = text.replace(/\s+/g, " ").slice(0, 600);
  return /\bCASE DIGEST\b/i.test(head);
}

export function isHtmlDecision(text: string): boolean {
  return /<html[\s>]/i.test(text) && /flra\.gov|FEDERAL LABOR RELATIONS AUTHORITY/i.test(text);
}

export function isIndexHtml(text: string): boolean {
  return /search-table__authority-decision|search_block_authority_decisions/i.test(text);
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

export function isAljOnly(text: string): boolean {
  if (/Before the Authority/i.test(text)) return false;
  return /OFFICE OF ADMINISTRATIVE LAW JUDGES|ADMINISTRATIVE LAW JUDGE DECISION/i.test(text);
}

export function isFsipOnly(text: string): boolean {
  if (/Before the Authority/i.test(text)) return false;
  return /FEDERAL SERVICE IMPASSES PANEL/i.test(text);
}

export function keepListing(
  row: Pick<FlraListing, "citation" | "caseNo" | "title" | "institution" | "sourceUrl" | "kind">,
): boolean {
  if (!officialFlraPdfUrl(row.sourceUrl)) return false;
  if (!parseCitation(row.citation)) return false;
  if (!normalizeCaseNo(row.caseNo)) return false;
  const hay = `${row.citation} ${row.kind} ${row.title} ${row.institution} ${row.sourceUrl}`;
  if (/\/system\/files\/digest\//i.test(hay)) return false;
  if (/\/decisions\/alj-decisions|\/decisions\/fsip-decisions/i.test(hay)) return false;
  if (isCaseDigest(hay) || isAljOnly(hay) || isFsipOnly(hay)) return false;
  return true;
}

export function isRealFlraDecisionBody(text: string, citation?: string): boolean {
  if (
    isCaseDigest(text) ||
    isHtmlDecision(text) ||
    isIndexHtml(text) ||
    isJsonFullText(text) ||
    isAljOnly(text) ||
    isFsipOnly(text)
  ) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 800) return false;
  const authority = /Federal Labor Relations Authority/i.test(text);
  const before = /Before the Authority/i.test(text);
  const slip = Boolean(parseCitation(citation) || parseCitation(text) || parseSlipNo(text));
  const caseNo = Boolean(normalizeCaseNo(text) || normalizeCaseNo(citation));
  return authority && before && slip && caseNo;
}

function emptySources(): FlraSnapshot["sources"] {
  return { listing: LISTING_URL, pdfHost: "https://www.flra.gov/system/files/decisions/" };
}

export function ajaxInsertHtml(raw: string): string {
  let payload = raw.trim();
  const textarea = payload.match(/^<textarea>([\s\S]*)<\/textarea>\s*$/i);
  if (textarea) payload = textarea[1].trim();
  if (!payload.startsWith("[") && !payload.startsWith("{")) return raw;
  try {
    const data = JSON.parse(payload) as unknown;
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const row = item as { command?: unknown; data?: unknown };
      if (row.command === "insert" && typeof row.data === "string" && row.data.includes("<")) return row.data;
    }
  } catch {
    return raw;
  }
  return raw;
}

export function parseAuthorityDecisionsHtml(raw: string): FlraListing[] {
  const html = ajaxInsertHtml(raw);
  const out: FlraListing[] = [];
  const seen = new Set<string>();
  const pairs = html.matchAll(
    /<tr class="(group-\S+) first">([\s\S]*?)<\/tr>\s*<tr class="\1 last">([\s\S]*?)<\/tr>/gi,
  );
  for (const pair of pairs) {
    const headCells = [...(pair[2] ?? "").matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1] ?? "");
    const tail = pair[3] ?? "";
    if (headCells.length < 4) continue;
    const citation = parseCitation(stripTags(headCells[0] ?? ""));
    const dateText = stripTags(headCells[2] ?? "");
    const caseNo = normalizeCaseNo(stripTags(headCells[3] ?? ""));
    const pdfHref =
      [...tail.matchAll(/href="([^"]+)"/gi)].map((m) => m[1] ?? "").find((href) => officialFlraPdfUrl(href)) ?? "";
    const sourceUrl = officialFlraPdfUrl(pdfHref);
    const tailCells = [...tail.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1] ?? "");
    const institution = stripTags(tailCells.at(-1) ?? "") || citation;
    if (!sourceUrl || !citation || !caseNo) continue;
    const listing: FlraListing = {
      id: catalogIdFromCitation(citation),
      citation,
      caseNo,
      documentId: documentIdFromUrl(sourceUrl),
      kind: "Authority Decision",
      institution,
      date: isoDate(dateText),
      title: citation,
      sourceUrl,
    };
    if (!keepListing(listing)) continue;
    if (seen.has(listing.id)) continue;
    seen.add(listing.id);
    out.push(listing);
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export function discoverListingPageUrls(raw: string, baseUrl: string): string[] {
  const html = ajaxInsertHtml(raw);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/href="([^"]+)"/gi)) {
    try {
      const url = new URL(match[1], baseUrl);
      const host = url.hostname.toLowerCase();
      if (host !== "www.flra.gov" && host !== "flra.gov") continue;
      if (!url.pathname.includes("/decisions/authority-decisions")) continue;
      if (!url.searchParams.has("page")) continue;
      url.hash = "";
      const href = url.href;
      if (seen.has(href)) continue;
      seen.add(href);
      out.push(href);
    } catch {
      /* skip */
    }
  }
  return out;
}

export function parseFlraDecisionText(
  text: string,
  meta: Partial<FlraListing> & { sourceUrl: string },
): FlraCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFlraPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const citation = parseCitation(meta.citation) || parseCitation(body);
  const caseNo = normalizeCaseNo(meta.caseNo) || normalizeCaseNo(body);
  const kind = parseKind(`${meta.kind ?? ""} ${meta.title ?? ""} ${body.slice(0, 4000)}`);
  return {
    id: meta.id || catalogIdFromCitation(citation),
    citation,
    caseNo,
    documentId: meta.documentId || documentIdFromUrl(sourceUrl),
    kind,
    institution: (meta.institution && meta.institution.trim()) || citation,
    date: meta.date ?? isoDate(body.slice(0, 1600)),
    title: meta.title || citation || "FLRA Authority Decision",
    sourceUrl,
    body,
  };
}

export function emptyFlraDecisionsSnapshot(reason: string): FlraSnapshot {
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

export function assembleFlraDecisionsSnapshot(cards: FlraCard[], fetchedAt?: string): FlraSnapshot {
  const kept = cards.filter((c) => isRealFlraDecisionBody(c.body, c.citation) && keepListing(c));
  kept.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
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
    reason: kept.length ? null : "Official FLRA Authority Decision PDFs had no extractable Decision text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): FlraSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FlraSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleFlraDecisionsSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readFlraDecisionsSnapshot(): FlraSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeFlraDecisionsSnapshot(snap: FlraSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchFlraText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/json" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchFlraBytes(url: string): Promise<Uint8Array> {
  const official = officialFlraPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,application/octet-stream" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FLRA_DECISIONS_PDFTOTEXT") || "pdftotext";
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
  return env("FLRA_DECISIONS_HTML_DIR") || env("FLRA_DECISIONS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("FLRA_DECISIONS_LIMIT", "7"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 7;
}

function maxFetchLimit(): number {
  const n = Number(env("FLRA_DECISIONS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxListingPages(): number {
  const n = Number(env("FLRA_DECISIONS_PAGES", "1"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: FlraListing[]): FlraListing[] {
  const seen = new Set<string>();
  const out: FlraListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepListing(row)) continue;
    const id = row.id || catalogIdFromCitation(row.citation);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ ...row, id });
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export async function walkOfficialFlraDecisions(): Promise<{ listed: FlraListing[]; listedCount: number }> {
  const queue = [LISTING_URL];
  const seenPages = new Set<string>();
  const listed: FlraListing[] = [];
  const cap = maxListingPages();
  while (queue.length && seenPages.size < cap) {
    const page = queue.shift();
    if (!page || seenPages.has(page)) continue;
    seenPages.add(page);
    try {
      const raw = await fetchFlraText(page);
      const html = ajaxInsertHtml(raw);
      listed.push(...parseAuthorityDecisionsHtml(html));
      for (const next of discoverListingPageUrls(html, page)) {
        if (!seenPages.has(next) && queue.length + seenPages.size < cap) queue.push(next);
      }
    } catch {
      /* keep walking */
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: FlraListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing-excerpt.html", "listing.html", "listing-excerpt.json"]);
    const listed = raw ? parseAuthorityDecisionsHtml(raw) : [];
    const merged = mergeListings(listed);
    return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialFlraDecisions();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectFlraDecisions(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FlraSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = flraDecisionsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, FlraCard>();
  for (const card of readFlraDecisionsSnapshot()?.cards ?? []) {
    if (isRealFlraDecisionBody(card.body, card.citation) && keepListing(card)) prior.set(card.id, card);
  }
  const cards: FlraCard[] = [];
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
      const localText = readNamedFile(dir, [`${row.id}.txt`, `${row.citation}.txt`].filter(Boolean));
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialFlraPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchFlraBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (isCaseDigest(text) || isAljOnly(text) || isFsipOnly(text) || isHtmlDecision(text) || isJsonFullText(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseFlraDecisionText(text, { ...row, sourceUrl });
      if (!isRealFlraDecisionBody(parsed.body, parsed.citation) || !keepListing(parsed)) {
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
    ...assembleFlraDecisionsSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeFlraDecisionsSnapshot(snap);
  return snap;
}

export async function loadFlraDecisions(): Promise<FlraSnapshot> {
  const cached = readFlraDecisionsSnapshot();
  if (cached && cached.cards.some((c) => isRealFlraDecisionBody(c.body, c.citation))) return cached;
  try {
    return await collectFlraDecisions();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live FLRA Authority Decision fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyFlraDecisionsSnapshot(
      `FLRA Authority Decision PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFlraDecisionsManifest(snap: FlraSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFlraDecisionBody(c.body, c.citation) && keepListing(c));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      FLRA_DECISIONS_PATH,
      "Count + citation + case number + date + institution only. Authority Decision body is the paid GET /flra-decisions payload. This free manifest lists the full catalog. Harvest FLRA-authored Authority Decision PDFs only. Case digests, ALJ decisions, FSIP decisions, and the HTML slip are not this SKU.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: FLRA_DECISIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: FLRA_DECISIONS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      citation: c.citation,
      caseNo: c.caseNo,
      documentId: c.documentId,
      kind: c.kind,
      date: c.date,
      title: c.title,
    })),
    schema: {
      fields: ["id", "institution", "citation", "caseNo", "documentId", "kind", "date", "title"],
    },
    sources: {
      listing: (snap?.sources ?? emptySources()).listing,
    },
  };
}

export function filterFlraDecisionsManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "citation", "caseNo", "documentId", "kind", "date", "title"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadFlraDecisionsManifest(q?: string): Promise<Record<string, unknown>> {
  return filterFlraDecisionsManifest(buildFlraDecisionsManifest(readFlraDecisionsSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFlraDecisions()
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
              caseNo: c.caseNo,
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
