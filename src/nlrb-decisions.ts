#!/usr/bin/env node
/**
 * NLRB published Board Decision TEXT door.
 * Index: https://www.nlrb.gov/cases-decisions/decisions/board-decisions
 * AJAX sort: https://www.nlrb.gov/sort-case-decisions-bd/date_issued+desc/board-decisions/date-issued/-1/all/20
 * PDFs: https://apps.nlrb.gov/link/document.aspx/{id}
 * Slip opinions NNN NLRB No. N. 17 U.S.C. § 105.
 * Harvest NLRB-authored published Board Decision PDFs only.
 * CiteNet index, weekly summaries, unpublished-only, and ALJ-only
 * are not this SKU. MSPB SEARCH_MANIFEST full-text JSON is a KILL.
 * Not /flra-decisions, not /oalj-decisions, not /oshrc-orders.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const NLRB_DECISIONS_PATH = "/nlrb-decisions";
export const NLRB_DECISIONS_MANIFEST_PATH = "/nlrb-decisions/manifest.json";
export const NLRB_DECISIONS_AMOUNT_ATOMIC = "50000";
export const NLRB_DECISIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "nlrb-board-decision-bodies";
export const PRODUCT_NAME = "NLRB Board Decision text";

export const LISTING_URL = "https://www.nlrb.gov/cases-decisions/decisions/board-decisions";
export const SORT_URL =
  "https://www.nlrb.gov/sort-case-decisions-bd/date_issued+desc/board-decisions/date-issued/-1/all/20";
export const PDF_HOST = "apps.nlrb.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "National Labor Relations Board. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const CITATION_RE = /\b(\d{2,3})\s+NLRB\s+No\.\s+(\d+)\b/i;
export const CASE_NO_RE = /\b(\d{2})[-–—]([A-Z]{2})[-–—](\d+)\b/i;
export const DOC_ID_RE = /\/link\/document\.aspx\/([0-9a-f]{16})\b/i;

export const NEXSTAR_ID = "375-nlrb-no-40";
export const SNOWFLAKE_ID = "375-nlrb-no-39";
export const BOLDT_ID = "375-nlrb-no-38";
export const NEXSTAR_URL = "https://apps.nlrb.gov/link/document.aspx/09031d458436f374";
export const SNOWFLAKE_URL = "https://apps.nlrb.gov/link/document.aspx/09031d458436cb8a";
export const BOLDT_URL = "https://apps.nlrb.gov/link/document.aspx/09031d4584360fc0";

export const BODY_NEEDLE_NEXSTAR = "This is a refusal-to-bargain case in which Nexstar";
export const BODY_NEEDLE_SNOWFLAKE = "terminated Charging Party Scott Bessler";
export const BODY_NEEDLE_BOLDT = "DECISION AND ORDER QUASHING NOTICE OF";

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

export type NlrbKind = "Decision and Order" | "Decision and Order Quashing Notice of Hearing" | "Board Decision";

export type NlrbListing = {
  id: string;
  citation: string;
  caseNo: string;
  documentId: string;
  kind: NlrbKind;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
};

export type NlrbCard = NlrbListing & { body: string };

export type NlrbSnapshot = {
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
  sources: { listing: string; sort: string; pdfHost: string };
  cards: NlrbCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (NLRB Board decisions; +https://www.nlrb.gov/cases-decisions/decisions/board-decisions)";

export const SEED_LISTINGS: NlrbListing[] = [
  {
    id: NEXSTAR_ID,
    citation: "375 NLRB No. 40",
    caseNo: "05-CA-367812",
    documentId: "09031d458436f374",
    kind: "Decision and Order",
    institution: "Nexstar Media Corporation d/b/a NewsNation",
    date: "2026-09-17",
    title: "375 NLRB No. 40",
    sourceUrl: NEXSTAR_URL,
  },
  {
    id: SNOWFLAKE_ID,
    citation: "375 NLRB No. 39",
    caseNo: "20-CA-274626",
    documentId: "09031d458436cb8a",
    kind: "Decision and Order",
    institution: "Snowflake, Inc.",
    date: "2026-09-16",
    title: "375 NLRB No. 39",
    sourceUrl: SNOWFLAKE_URL,
  },
  {
    id: BOLDT_ID,
    citation: "375 NLRB No. 38",
    caseNo: "18-CD-352973",
    documentId: "09031d4584360fc0",
    kind: "Decision and Order Quashing Notice of Hearing",
    institution: "IUOE Local 139 (The Boldt Company)",
    date: "2026-09-11",
    title: "375 NLRB No. 38",
    sourceUrl: BOLDT_URL,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function nlrbDecisionsDir(): string {
  if (env("NLRB_DECISIONS_DIR")) return resolve(env("NLRB_DECISIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/nlrb-decisions"));
}

export function snapshotPath(): string {
  return join(nlrbDecisionsDir(), "snapshot.json");
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
  const hit = raw.replace(/\s+/g, " ").match(CITATION_RE);
  return hit ? `${hit[1]} NLRB No. ${hit[2]}` : "";
}

export function catalogIdFromCitation(citation: string): string {
  return citation.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function normalizeCaseNo(raw: string | null | undefined): string {
  if (!raw) return "";
  const hit = raw.toUpperCase().replace(/[–—]/g, "-").match(CASE_NO_RE);
  return hit ? `${hit[1]}-${hit[2]}-${hit[3]}` : "";
}

export function documentIdFromUrl(url: string | null | undefined): string {
  const hit = (url ?? "").match(DOC_ID_RE);
  return hit ? hit[1].toLowerCase() : "";
}

export function officialNlrbPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim().replace(/&amp;/g, "&");
  try {
    const parsed = new URL(trimmed, "https://www.nlrb.gov/");
    if (parsed.hostname.toLowerCase() !== PDF_HOST) return null;
    const id = documentIdFromUrl(parsed.pathname);
    if (!id) return null;
    return `https://${PDF_HOST}/link/document.aspx/${id}`;
  } catch {
    return null;
  }
}

export function parseKind(raw: string): NlrbKind {
  if (/QUASHING NOTICE/i.test(raw)) return "Decision and Order Quashing Notice of Hearing";
  if (/DECISION AND ORDER/i.test(raw)) return "Decision and Order";
  return "Board Decision";
}

export function isWeeklySummary(text: string): boolean {
  return /weekly summar(?:y|ies)/i.test(text);
}

export function isCiteNet(text: string): boolean {
  return /citenet\.nlrb\.gov|\bCiteNet\b/i.test(text);
}

export function isAljOnly(text: string): boolean {
  const citation = parseCitation(text);
  if (citation) return false;
  return /\bJD[-–—]?\d|DIVISION OF JUDGES|ADMINISTRATIVE LAW JUDGE DECISION/i.test(text);
}

export function isMspbLeak(text: string): boolean {
  return /DOCUMENT_CONTENT/i.test(text) && /MERIT SYSTEMS PROTECTION BOARD/i.test(text);
}

export function isFrMirrorBody(text: string): boolean {
  if (/federalregister\.gov|govinfo\.gov\/content\/pkg\/FR/i.test(text)) return true;
  const agency = /^\s*AGENCY:\s*/im.test(text);
  const action = /^\s*ACTION:\s*/im.test(text);
  const summary = /^\s*SUMMARY:\s*/im.test(text);
  return agency && action && summary;
}

export function isFederalRegisterHtml(text: string): boolean {
  return /<html[\s>]/i.test(text) && /Federal Register/i.test(text) && /AGENCY:/i.test(text);
}

export function isIndexHtmlOnly(text: string): boolean {
  return /<html[\s>]/i.test(text) && /case-decisions-table|sort-case-decisions-bd/i.test(text) && !parseCitation(stripTags(text));
}

export function keepListing(
  row: Pick<NlrbListing, "citation" | "caseNo" | "title" | "institution" | "sourceUrl" | "kind">,
): boolean {
  if (!officialNlrbPdfUrl(row.sourceUrl)) return false;
  if (!parseCitation(row.citation)) return false;
  if (!normalizeCaseNo(row.caseNo)) return false;
  const hay = `${row.citation} ${row.kind} ${row.title} ${row.institution} ${row.sourceUrl}`;
  if (isWeeklySummary(hay) || isCiteNet(hay) || isAljOnly(hay) || isMspbLeak(hay)) return false;
  if (/unpublished board decisions/i.test(hay) && !parseCitation(row.citation)) return false;
  return true;
}

export function isRealNlrbDecisionBody(text: string): boolean {
  if (
    isFrMirrorBody(text) ||
    isFederalRegisterHtml(text) ||
    isWeeklySummary(text) ||
    isCiteNet(text) ||
    isAljOnly(text) ||
    isMspbLeak(text) ||
    isIndexHtmlOnly(text)
  ) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 800) return false;
  const board = /National Labor Relations Board/i.test(text);
  const decision = /DECISION AND ORDER/i.test(text);
  const slip = Boolean(parseCitation(text));
  const caseNo = Boolean(normalizeCaseNo(text));
  return board && decision && slip && caseNo;
}

function emptySources(): NlrbSnapshot["sources"] {
  return { listing: LISTING_URL, sort: SORT_URL, pdfHost: `https://${PDF_HOST}/link/document.aspx/` };
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
      if (row.command === "insert" && typeof row.data === "string") return row.data;
    }
  } catch {
    return raw;
  }
  return raw;
}

export function parseBoardDecisionsHtml(raw: string): NlrbListing[] {
  const html = ajaxInsertHtml(raw);
  const out: NlrbListing[] = [];
  const seen = new Set<string>();
  const rows = html.split(/<tr\b/i).slice(1);
  for (const row of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1] ?? "");
    if (cells.length < 4) continue;
    const dateText = stripTags(cells[0] ?? "");
    const citation = parseCitation(stripTags(cells[1] ?? ""));
    const nameHtml = cells[2] ?? "";
    const caseHtml = cells[3] ?? "";
    const pdfHref = nameHtml.match(/href="([^"]+)"/i)?.[1] ?? "";
    const caseHref = caseHtml.match(/href="([^"]+)"/i)?.[1] ?? "";
    const institution = stripTags(nameHtml);
    const caseNo = normalizeCaseNo(stripTags(caseHtml)) || normalizeCaseNo(caseHref);
    const sourceUrl = officialNlrbPdfUrl(pdfHref);
    if (!sourceUrl || !citation || !caseNo) continue;
    const listing: NlrbListing = {
      id: catalogIdFromCitation(citation),
      citation,
      caseNo,
      documentId: documentIdFromUrl(sourceUrl),
      kind: "Board Decision",
      institution: institution || citation,
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

export function discoverSortPageUrls(raw: string, baseUrl: string): string[] {
  const html = ajaxInsertHtml(raw);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/href="([^"]+)"/gi)) {
    try {
      const url = new URL(match[1], baseUrl);
      const host = url.hostname.toLowerCase();
      if (host !== "www.nlrb.gov" && host !== "nlrb.gov") continue;
      if (!url.pathname.includes("/sort-case-decisions-bd/")) continue;
      if (!url.searchParams.has("page")) continue;
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

export function parseNlrbDecisionText(
  text: string,
  meta: Partial<NlrbListing> & { sourceUrl: string },
): NlrbCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialNlrbPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const citation = parseCitation(meta.citation) || parseCitation(body);
  const caseNo = normalizeCaseNo(meta.caseNo) || normalizeCaseNo(body);
  const kind = parseKind(`${meta.kind ?? ""} ${meta.title ?? ""} ${body.slice(0, 2500)}`);
  return {
    id: meta.id || catalogIdFromCitation(citation),
    citation,
    caseNo,
    documentId: meta.documentId || documentIdFromUrl(sourceUrl),
    kind,
    institution: (meta.institution && meta.institution.trim()) || citation,
    date: meta.date ?? isoDate(body.slice(0, 1200)),
    title: meta.title || citation || "NLRB Board Decision",
    sourceUrl,
    body,
  };
}

export function emptyNlrbDecisionsSnapshot(reason: string): NlrbSnapshot {
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

export function assembleNlrbDecisionsSnapshot(cards: NlrbCard[], fetchedAt?: string): NlrbSnapshot {
  const kept = cards.filter((c) => isRealNlrbDecisionBody(c.body) && keepListing(c));
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
    reason: kept.length ? null : "Official NLRB Board Decision PDFs had no extractable Decision text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): NlrbSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as NlrbSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleNlrbDecisionsSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readNlrbDecisionsSnapshot(): NlrbSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeNlrbDecisionsSnapshot(snap: NlrbSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchNlrbText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/json" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchNlrbBytes(url: string): Promise<Uint8Array> {
  const official = officialNlrbPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,application/octet-stream" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("NLRB_DECISIONS_PDFTOTEXT") || "pdftotext";
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
  return env("NLRB_DECISIONS_HTML_DIR") || env("NLRB_DECISIONS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("NLRB_DECISIONS_LIMIT", "4"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 4;
}

function maxFetchLimit(): number {
  const n = Number(env("NLRB_DECISIONS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxSortPages(): number {
  const n = Number(env("NLRB_DECISIONS_PAGES", "3"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: NlrbListing[]): NlrbListing[] {
  const seen = new Set<string>();
  const out: NlrbListing[] = [];
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

export async function walkOfficialNlrbDecisions(): Promise<{ listed: NlrbListing[]; listedCount: number }> {
  const queue = [SORT_URL];
  const seenPages = new Set<string>();
  const listed: NlrbListing[] = [];
  const cap = maxSortPages();
  while (queue.length && seenPages.size < cap) {
    const page = queue.shift();
    if (!page || seenPages.has(page)) continue;
    seenPages.add(page);
    try {
      const raw = await fetchNlrbText(page);
      const html = ajaxInsertHtml(raw);
      listed.push(...parseBoardDecisionsHtml(html));
      for (const next of discoverSortPageUrls(html, page)) {
        if (!seenPages.has(next) && queue.length + seenPages.size < cap) queue.push(next);
      }
    } catch {
      /* keep walking */
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: NlrbListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing-excerpt.json", "listing-excerpt.html", "listing.html"]);
    const listed = raw ? parseBoardDecisionsHtml(raw) : [];
    const merged = mergeListings(listed);
    return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialNlrbDecisions();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectNlrbDecisions(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<NlrbSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = nlrbDecisionsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, NlrbCard>();
  for (const card of readNlrbDecisionsSnapshot()?.cards ?? []) {
    if (isRealNlrbDecisionBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const cards: NlrbCard[] = [];
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
      const sourceUrl = officialNlrbPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchNlrbBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (isFrMirrorBody(text) || isWeeklySummary(text) || isAljOnly(text) || isMspbLeak(text) || isFederalRegisterHtml(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseNlrbDecisionText(text, { ...row, sourceUrl });
      if (!isRealNlrbDecisionBody(parsed.body) || !keepListing(parsed)) {
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
    ...assembleNlrbDecisionsSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeNlrbDecisionsSnapshot(snap);
  return snap;
}

export async function loadNlrbDecisions(): Promise<NlrbSnapshot> {
  const cached = readNlrbDecisionsSnapshot();
  if (cached && cached.cards.some((c) => isRealNlrbDecisionBody(c.body))) return cached;
  try {
    return await collectNlrbDecisions();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live NLRB Board Decision fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyNlrbDecisionsSnapshot(
      `NLRB Board Decision PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildNlrbDecisionsManifest(snap: NlrbSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealNlrbDecisionBody(c.body) && keepListing(c));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      NLRB_DECISIONS_PATH,
      "Count + citation + case number + date + institution only. Board Decision body is the paid GET /nlrb-decisions payload. This free manifest lists the full catalog. Harvest NLRB-authored published Board Decision PDFs only. CiteNet, weekly summaries, ALJ-only, and MSPB full-text JSON are not this SKU.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: NLRB_DECISIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: NLRB_DECISIONS_ONE_AMOUNT_ATOMIC,
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
      sort: (snap?.sources ?? emptySources()).sort,
    },
  };
}

export function filterNlrbDecisionsManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
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

export async function loadNlrbDecisionsManifest(q?: string): Promise<Record<string, unknown>> {
  return filterNlrbDecisionsManifest(buildNlrbDecisionsManifest(readNlrbDecisionsSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectNlrbDecisions()
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
