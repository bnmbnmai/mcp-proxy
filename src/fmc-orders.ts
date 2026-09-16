#!/usr/bin/env node
/**
 * FMC Reading Room Initial Decision / Commission Order TEXT door.
 * Official PDFs linked from www2.fmc.gov/ReadingRoom DocumentSearch /
 * ProceedingSearch tables: /readingroom/documents/{id} 302s to
 * /readingroom/docs/{docket}/{filename}/ (trailing slash required).
 * 17 U.S.C. § 105.
 * Harvest FMC-authored Initial Decision / Order on Initial Decision /
 * Commission Order PDFs only. Skip FR HTML wraps, party exceptions,
 * scheduling orders, wordpress wp-json CMS, and PHMSA Pipeline
 * Enforcement Raw Data TSV. Not /phmsa-orders, /stb-decisions, or
 * /oalj-decisions.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const FMC_ORDERS_PATH = "/fmc-orders";
export const FMC_ORDERS_MANIFEST_PATH = "/fmc-orders/manifest.json";
export const FMC_ORDERS_AMOUNT_ATOMIC = "50000";
export const FMC_ORDERS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "fmc-order-bodies";
export const PRODUCT_NAME = "FMC Initial Decision / Commission Order text";

export const LISTING_URL = "https://www2.fmc.gov/readingroom/DocumentSearch";
export const PROCEEDING_SEARCH_URL = "https://www2.fmc.gov/readingroom/ProceedingSearch";
export const READING_ROOM_ORIGIN = "https://www2.fmc.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Federal Maritime Commission. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const DOCUMENT_ID_RE = /(?:documents|GetDocument)\/(\d+)/i;
export const DOCS_PDF_RE = /\/readingroom\/docs\/([^/]+)\/([^/?#]+\.pdf)\/?/i;
export const PROCEEDING_PATH_RE = /\/readingroom\/proceeding\/([^/?#]+)\/?/i;
export const KEEP_KIND_RE =
  /^(?:Served\s+)?(?:Initial Decision|Order on Initial Decision|Commission Order)\b/i;
export const SKIP_KIND_RE =
  /Federal Register|appeared in Federal Register|^Received\b|Exceptions to Initial Decision|Notice of Extension|Order Designating|Served Initial Order\b|Motion for Leave|Protective Order|Scheduling Order|wp-json|Pipeline Enforcement Raw Data/i;

export const MSC_ORDER_ID = "23-08-131865";
export const MSC_ID_ID = "23-08-118811";
export const ADENARIWO_ID = "2033-i-136187";
export const GIBSON_ID = "2030-i-136166";
export const BBBY_ID = "23-02-136277";

export const MSC_ORDER_URL =
  "https://www2.fmc.gov/readingroom/docs/23-08/(32)%2023-08%20Order%20on%20Initial%20Decision%20(public).pdf/";
export const MSC_ID_URL = "https://www2.fmc.gov/readingroom/docs/23-08/(23)%2023-08%20Initial%20Decision.pdf/";
export const ADENARIWO_URL =
  "https://www2.fmc.gov/readingroom/docs/2033(I)/(02)%202033(I)%20Initial%20Decision.pdf/";
export const GIBSON_URL = "https://www2.fmc.gov/readingroom/docs/2030(I)/2030(I)%20Initial%20Decision.pdf/";
export const BBBY_URL =
  "https://www2.fmc.gov/readingroom/docs/23-02/(143)%2023-02%20Initial%20Decision%20(public%20version).pdf/";

export const MSC_ORDER_DOC = "https://www2.fmc.gov/readingroom/documents/131865";
export const ADENARIWO_DOC = "https://www2.fmc.gov/readingroom/documents/136187";
export const GIBSON_DOC = "https://www2.fmc.gov/readingroom/documents/136166";
export const BBBY_DOC = "https://www2.fmc.gov/readingroom/documents/136277";

export const SEED_PROCEEDINGS = ["23-08", "2033(I)", "2030(I)", "23-02"];

export const CARD_FIELDS = [
  "id",
  "docket",
  "documentId",
  "kind",
  "board",
  "institution",
  "date",
  "title",
  "filename",
  "sourceUrl",
  "body",
] as const;

export const BODY_NEEDLE_NOR = "non-operating reefers (NORs)";
export const BODY_NEEDLE_DEPOSIT = "never loaded onto an ocean vessel after taking the deposit";
export const BODY_NEEDLE_DEPOT = "abandoned the car at an inland depot";
export const BODY_NEEDLE_EMPTY = "unused empty equipment after Bed Bath Beyond cancelled";

export type FmcBoard = "alj" | "commission";
export type FmcKind = "Initial Decision" | "Order on Initial Decision" | "Commission Order";

export type FmcListing = {
  id: string;
  docket: string;
  documentId: string;
  kind: FmcKind;
  board: FmcBoard;
  institution: string;
  date: string | null;
  title: string;
  filename: string;
  sourceUrl: string;
};

export type FmcCard = FmcListing & { body: string };

export type FmcSnapshot = {
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
  sources: { listing: string; proceedingSearch: string; pdfHost: string };
  cards: FmcCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FMC Reading Room orders; +https://www2.fmc.gov/ReadingRoom/)";
const OFFICIAL_HOSTS = new Set(["www2.fmc.gov", "fmc.gov", "www.fmc.gov"]);

export const SEED_LISTINGS: FmcListing[] = [
  {
    id: MSC_ORDER_ID,
    docket: "23-08",
    documentId: "131865",
    kind: "Order on Initial Decision",
    board: "commission",
    institution: "Mediterranean Shipping Company, S.A.",
    date: "2026-01-06",
    title: "Served Order on Initial Decision",
    filename: "(32) 23-08 Order on Initial Decision (public).pdf",
    sourceUrl: MSC_ORDER_URL,
  },
  {
    id: MSC_ID_ID,
    docket: "23-08",
    documentId: "118811",
    kind: "Initial Decision",
    board: "alj",
    institution: "Mediterranean Shipping Company, S.A.",
    date: "2025-02-25",
    title: "Served Initial Decision",
    filename: "(23) 23-08 Initial Decision.pdf",
    sourceUrl: MSC_ID_URL,
  },
  {
    id: ADENARIWO_ID,
    docket: "2033(I)",
    documentId: "136187",
    kind: "Initial Decision",
    board: "alj",
    institution: "Adebisi Adenariwo v. Throne Shipping Inc.",
    date: "2026-04-03",
    title: "Served Initial Decision",
    filename: "(02) 2033(I) Initial Decision.pdf",
    sourceUrl: ADENARIWO_URL,
  },
  {
    id: GIBSON_ID,
    docket: "2030(I)",
    documentId: "136166",
    kind: "Initial Decision",
    board: "alj",
    institution: "Brooke Gibson v. Formula Global Mobility",
    date: "2026-03-27",
    title: "Served Initial Decision",
    filename: "2030(I) Initial Decision.pdf",
    sourceUrl: GIBSON_URL,
  },
  {
    id: BBBY_ID,
    docket: "23-02",
    documentId: "136277",
    kind: "Initial Decision",
    board: "alj",
    institution:
      "20230930-DK-Butterfly-1, Inc. f/k/a Bed, Bath & Beyond Inc. v. Orient Overseas Container Line Limited and OOCL (Europe) Limited",
    date: "2026-04-24",
    title: "Served Initial Decision (public & confidential versions)",
    filename: "(143) 23-02 Initial Decision (public version).pdf",
    sourceUrl: BBBY_URL,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function fmcOrdersDir(): string {
  if (env("FMC_ORDERS_DIR")) return resolve(env("FMC_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/fmc-orders"));
}

export function snapshotPath(): string {
  return join(fmcOrdersDir(), "snapshot.json");
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
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
  return null;
}

export function normalizeDocket(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/\s+/g, "")
    .replace(/[()]/g, "")
    .replace(/([A-Za-z])$/g, "-$1")
    .replace(/--+/g, "-")
    .toLowerCase()
    .replace(/^-|-$/g, "");
}

export function catalogId(docket: string, documentId: string): string {
  const dock = normalizeDocket(docket);
  const doc = (documentId || "").replace(/\D/g, "");
  if (dock && doc) return `${dock}-${doc}`;
  return doc || dock || "unknown";
}

export function encodeDocsFilename(filename: string): string {
  return filename.replace(/ /g, "%20");
}

export function officialDocsUrl(docket: string, filename: string): string | null {
  const dock = (docket || "").trim();
  const file = (filename || "").trim().split("/").pop() || "";
  if (!dock || !/\.pdf$/i.test(file)) return null;
  return `${READING_ROOM_ORIGIN}/readingroom/docs/${dock}/${encodeDocsFilename(file)}/`;
}

export function officialDocumentUrl(documentId: string): string | null {
  const id = (documentId || "").replace(/\D/g, "");
  if (!id) return null;
  return `${READING_ROOM_ORIGIN}/readingroom/documents/${id}`;
}

export function officialFmcPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim().replace(/&amp;/g, "&");
  try {
    const parsed = new URL(trimmed, `${READING_ROOM_ORIGIN}/`);
    const host = parsed.hostname.toLowerCase();
    if (!OFFICIAL_HOSTS.has(host)) return null;
    if (/federalregister\.gov|primis\.phmsa|stb\.gov|oalj\.dol\.gov|wp-json/i.test(parsed.href)) return null;
    if (/\.(tsv|xlsx|csv)$/i.test(parsed.pathname)) return null;
    const docs = parsed.pathname.match(DOCS_PDF_RE);
    if (docs) {
      const url = officialDocsUrl(decodeURIComponent(docs[1]), decodeURIComponent(docs[2]));
      return url;
    }
    const doc = parsed.pathname.match(/\/readingroom\/documents\/(\d+)\/?$/i);
    if (doc) return officialDocumentUrl(doc[1]);
    return null;
  } catch {
    return null;
  }
}

export function parseKind(raw: string): FmcKind | null {
  if (/Order on Initial Decision/i.test(raw) && !/^Received\b/i.test(raw)) return "Order on Initial Decision";
  if (/\bCommission Order\b/i.test(raw) && !/Initial Decision/i.test(raw) && !/^Received\b/i.test(raw)) {
    return "Commission Order";
  }
  if (
    /(?:Served\s+)?Initial Decision\b/i.test(raw) &&
    !/^Received\b/i.test(raw) &&
    !/Exceptions/i.test(raw) &&
    !/due:/i.test(raw) &&
    !/Federal Register/i.test(raw)
  ) {
    return "Initial Decision";
  }
  return null;
}

export function parseBoard(kind: FmcKind): FmcBoard {
  return kind === "Initial Decision" ? "alj" : "commission";
}

export function isFrMirrorBody(text: string): boolean {
  if (/federalregister\.gov|govinfo\.gov\/content\/pkg\/FR/i.test(text)) return true;
  const agency = /^\s*AGENCY:\s*/im.test(text);
  const action = /^\s*ACTION:\s*/im.test(text);
  const summary = /^\s*SUMMARY:\s*/im.test(text);
  return agency && action && summary;
}

export function isWordpressCms(text: string): boolean {
  return /wp-json\/wp\/v2/i.test(text) || /"content"\s*:\s*\{\s*"rendered"/i.test(text);
}

export function isPhmsaTsvKill(text: string): boolean {
  if (/Pipeline Enforcement Raw Data/i.test(text)) return true;
  if (/^CPF\tOperator\t/m.test(text)) return true;
  if (/primis\.phmsa\.dot\.gov/i.test(text) && /\.tsv\b/i.test(text)) return true;
  return false;
}

export function isProceedingHtmlOnly(text: string): boolean {
  return (
    /<html[\s>]/i.test(text) &&
    /FMC Reading Room|RadGrid|DocumentSearch|ProceedingSearch/i.test(text) &&
    !/IT IS ORDERED|INITIAL DECISION/i.test(text.replace(/Served Initial Decision/gi, ""))
  );
}

export function keepListing(
  row: Pick<FmcListing, "docket" | "documentId" | "kind" | "title" | "sourceUrl" | "institution">,
): boolean {
  if (!officialFmcPdfUrl(row.sourceUrl) && !officialDocumentUrl(row.documentId)) return false;
  const hay = `${row.kind} ${row.title} ${row.institution} ${row.sourceUrl}`;
  if (SKIP_KIND_RE.test(hay) || SKIP_KIND_RE.test(row.title)) return false;
  if (!KEEP_KIND_RE.test(row.kind) && !KEEP_KIND_RE.test(row.title)) return false;
  if (/^Received\b/i.test(row.title)) return false;
  return Boolean(row.documentId || row.docket);
}

export function isRealFmcOrderBody(text: string): boolean {
  if (isFrMirrorBody(text) || isWordpressCms(text) || isPhmsaTsvKill(text) || isProceedingHtmlOnly(text)) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 800) return false;
  const fmc = /FEDERAL MARITIME COMMISSION|Federal Maritime Commission/i.test(text);
  const docket = /Docket\s+No\.?/i.test(text);
  const decision =
    /INITIAL DECISION|ORDER ON INITIAL DECISION|COMMISSION ORDER|IT IS ORDERED|SO ORDERED/i.test(text);
  return fmc && docket && decision;
}

function emptySources(): FmcSnapshot["sources"] {
  return {
    listing: LISTING_URL,
    proceedingSearch: PROCEEDING_SEARCH_URL,
    pdfHost: `${READING_ROOM_ORIGIN}/readingroom/docs/`,
  };
}

export function proceedingUrl(docket: string): string {
  return `${READING_ROOM_ORIGIN}/readingroom/proceeding/${docket}/`;
}

export function parseHeading(raw: string): { docket: string; institution: string } {
  const text = stripTags(raw).replace(/\s+/g, " ").trim();
  const hit = text.match(/^((?:\d{2}-\d{2}|\d{3,4}\(?[A-Z]?\)?))(?:\s*[-–—]\s*)(.+)$/i);
  if (hit) return { docket: hit[1].trim(), institution: hit[2].trim() };
  return { docket: "", institution: text };
}

export function parseProceedingHtml(html: string, pageDocket = ""): FmcListing[] {
  const out: FmcListing[] = [];
  const seen = new Set<string>();
  const chunks = html.split(/<(?:h[1-4])\b/i);
  for (const chunk of chunks) {
    const headingInner = chunk.match(/^[^>]*>([\s\S]*?)<\/h[1-4]>/i)?.[1] ?? "";
    const heading = headingInner ? parseHeading(headingInner) : { docket: pageDocket, institution: "" };
    const docket = heading.docket || pageDocket;
    const institution = heading.institution;
    const rows = chunk.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
    for (const row of rows) {
      const text = stripTags(row);
      const hrefs = [...row.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
      const docHref = hrefs.find((h) => DOCUMENT_ID_RE.test(h));
      const documentId =
        (docHref && docHref.match(DOCUMENT_ID_RE)?.[1]) ||
        row.match(/>(\d{5,7})</)?.[1] ||
        "";
      if (!documentId) continue;
      const hidden = [...row.matchAll(/display:\s*none[^>]*>([^<]*)</gi)].map((m) => decodeEntities(m[1]));
      const filename = hidden.find((v) => /\.pdf$/i.test(v)) || "";
      const title =
        decodeEntities(row.match(/<strong>([^<]+)<\/strong>/i)?.[1] ?? "") ||
        decodeEntities(row.match(/title="([^"]+)"/i)?.[1] ?? "") ||
        text;
      const kind = parseKind(title);
      if (!kind) continue;
      const date = isoDate(text);
      const sourceUrl =
        officialDocsUrl(docket, filename) || officialDocumentUrl(documentId) || officialFmcPdfUrl(docHref || "");
      if (!sourceUrl) continue;
      const listing: FmcListing = {
        id: catalogId(docket, documentId),
        docket: docket || filename.match(/^(\d{2}-\d{2}|\d{3,4}\(?[A-Z]?\)?)/i)?.[1] || "",
        documentId,
        kind,
        board: parseBoard(kind),
        institution: institution || title,
        date,
        title: title.replace(/\s+/g, " ").trim(),
        filename,
        sourceUrl,
      };
      if (!keepListing(listing)) continue;
      if (seen.has(listing.id) || seen.has(listing.documentId)) continue;
      seen.add(listing.id);
      seen.add(listing.documentId);
      out.push(listing);
    }
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export function discoverProceedingUrls(html: string, baseUrl = LISTING_URL): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/href="([^"]+)"/gi)) {
    try {
      const url = new URL(match[1], baseUrl);
      const path = url.pathname.match(PROCEEDING_PATH_RE);
      if (!path) continue;
      if (!OFFICIAL_HOSTS.has(url.hostname.toLowerCase()) && url.hostname) continue;
      const href = proceedingUrl(decodeURIComponent(path[1]));
      if (seen.has(href)) continue;
      seen.add(href);
      out.push(href);
    } catch {
      /* skip */
    }
  }
  return out;
}

export function parseFmcOrderText(text: string, meta: Partial<FmcListing> & { sourceUrl: string }): FmcCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFmcPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket =
    meta.docket ||
    body.match(/Docket\s+No\.?\s*([0-9]{2}-[0-9]{2}|[0-9]{3,4}\(?[A-Z]?\)?)/i)?.[1] ||
    "";
  const documentId = meta.documentId || sourceUrl.match(/documents\/(\d+)/i)?.[1] || "";
  const kind = meta.kind || parseKind(`${meta.title ?? ""} ${body.slice(0, 400)}`) || "Initial Decision";
  return {
    id: meta.id || catalogId(docket, documentId),
    docket,
    documentId,
    kind,
    board: meta.board || parseBoard(kind),
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 800)),
    title: meta.title || kind,
    filename: meta.filename || "",
    sourceUrl,
    body,
  };
}

export function emptyFmcOrdersSnapshot(reason: string): FmcSnapshot {
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

export function assembleFmcOrdersSnapshot(cards: FmcCard[], fetchedAt?: string): FmcSnapshot {
  const kept = cards.filter((c) => isRealFmcOrderBody(c.body) && keepListing(c));
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
    reason: kept.length
      ? null
      : "Official FMC Reading Room Initial Decision / Commission Order PDFs had no extractable text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): FmcSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FmcSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleFmcOrdersSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readFmcOrdersSnapshot(): FmcSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeFmcOrdersSnapshot(snap: FmcSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchFmcText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/json" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchFmcBytes(url: string): Promise<{ bytes: Uint8Array; finalUrl: string }> {
  const official = officialFmcPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error(`${official} is not an official PDF`);
  }
  return { bytes, finalUrl: res.url || official };
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FMC_ORDERS_PDFTOTEXT") || "pdftotext";
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
  return env("FMC_ORDERS_HTML_DIR") || env("FMC_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("FMC_ORDERS_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("FMC_ORDERS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxProceedingPages(): number {
  const n = Number(env("FMC_ORDERS_PROCEEDINGS", "6"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: FmcListing[]): FmcListing[] {
  const seen = new Set<string>();
  const out: FmcListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepListing(row)) continue;
    const id = row.id || catalogId(row.docket, row.documentId);
    if (!id || seen.has(id) || seen.has(row.documentId)) continue;
    seen.add(id);
    seen.add(row.documentId);
    out.push({ ...row, id });
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export async function walkOfficialFmcOrders(): Promise<{ listed: FmcListing[]; listedCount: number }> {
  const queue = SEED_PROCEEDINGS.map((d) => proceedingUrl(d));
  const seenPages = new Set<string>();
  const listed: FmcListing[] = [];
  const cap = maxProceedingPages();
  while (queue.length && seenPages.size < cap) {
    const page = queue.shift();
    if (!page || seenPages.has(page)) continue;
    seenPages.add(page);
    try {
      const html = await fetchFmcText(page);
      const docket = decodeURIComponent(page.match(PROCEEDING_PATH_RE)?.[1] ?? "");
      listed.push(...parseProceedingHtml(html, docket));
      for (const next of discoverProceedingUrls(html, page)) {
        if (!seenPages.has(next) && queue.length + seenPages.size < cap) queue.push(next);
      }
    } catch {
      /* keep walking */
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: FmcListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = html ? parseProceedingHtml(html) : [];
    const merged = mergeListings(listed);
    return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialFmcOrders();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectFmcOrders(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FmcSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = fmcOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, FmcCard>();
  for (const card of readFmcOrdersSnapshot()?.cards ?? []) {
    if (isRealFmcOrderBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const cards: FmcCard[] = [];
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
        [`${row.id}.txt`, `${row.documentId}.txt`, `${row.docket}.txt`].filter(Boolean),
      );
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialFmcPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            const got = await fetchFmcBytes(sourceUrl);
            writeFileSync(pdfFile, got.bytes);
            fetchedPdfs += 1;
          } else {
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (isFrMirrorBody(text) || isWordpressCms(text) || isPhmsaTsvKill(text) || isProceedingHtmlOnly(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseFmcOrderText(text, { ...row, sourceUrl });
      if (!isRealFmcOrderBody(parsed.body) || !keepListing(parsed)) {
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
    ...assembleFmcOrdersSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeFmcOrdersSnapshot(snap);
  return snap;
}

export async function loadFmcOrders(): Promise<FmcSnapshot> {
  const cached = readFmcOrdersSnapshot();
  if (cached && cached.cards.some((c) => isRealFmcOrderBody(c.body))) return cached;
  try {
    return await collectFmcOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live FMC Reading Room fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyFmcOrdersSnapshot(
      `FMC Reading Room Initial Decision / Commission Order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFmcOrdersManifest(snap: FmcSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFmcOrderBody(c.body) && keepListing(c));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      FMC_ORDERS_PATH,
      "Count + docket + document id + date + institution only. Initial Decision / Commission Order body is the paid GET /fmc-orders payload. This free manifest lists the full catalog. Harvest FMC-authored Reading Room Initial Decision / Order on Initial Decision / Commission Order PDFs only. FR HTML wraps, wordpress wp-json CMS, party exceptions, and PHMSA Pipeline Enforcement Raw Data TSV are not this SKU.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: FMC_ORDERS_AMOUNT_ATOMIC,
    oneAmountAtomic: FMC_ORDERS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      docket: c.docket,
      documentId: c.documentId,
      kind: c.kind,
      board: c.board,
      date: c.date,
      title: c.title,
      sourceUrl: c.sourceUrl,
    })),
    schema: {
      fields: ["id", "institution", "docket", "documentId", "kind", "board", "date", "title", "sourceUrl"],
    },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterFmcOrdersManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "docket", "documentId", "kind", "board", "date", "title"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadFmcOrdersManifest(q?: string): Promise<Record<string, unknown>> {
  return filterFmcOrdersManifest(buildFmcOrdersManifest(readFmcOrdersSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFmcOrders()
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
              docket: c.docket,
              documentId: c.documentId,
              kind: c.kind,
              board: c.board,
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
