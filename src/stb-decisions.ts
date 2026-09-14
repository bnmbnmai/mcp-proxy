#!/usr/bin/env node
/**
 * STB Board Decision / Order TEXT door.
 * Official DCMS PDFs listed on https://www.stb.gov/proceedings-actions/decisions/
 * (AJAX stb_hook_table_decisions → dcms-external.s3.amazonaws.com).
 * 17 U.S.C. § 105.
 * Harvest STB/DCMS PDFs only. Skip FR-mirrored Decision Nos. 21/30 class
 * (AGENCY/ACTION/SUMMARY Federal Register wrappers). Open Data / STB free
 * CSVs (STB-1145, EP 770, EP 724 metrics) are KILL. Not FR HTML.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const STB_DECISIONS_PATH = "/stb-decisions";
export const STB_DECISIONS_MANIFEST_PATH = "/stb-decisions/manifest.json";
export const STB_DECISIONS_AMOUNT_ATOMIC = "50000";
export const STB_DECISIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "stb-board-decision-bodies";
export const PRODUCT_NAME = "STB Board Decision / Order text";

export const LISTING_URL = "https://www.stb.gov/proceedings-actions/decisions/";
export const AJAX_URL = "https://www.stb.gov/wp-admin/admin-ajax.php";
export const TABLE_ACTION = "stb_hook_table_decisions";
export const NONCE_ACTION = "stb_hook_generate_nonces";
export const DCMS_HOST = "dcms-external.s3.amazonaws.com";
export const DCMS_PREFIX = `https://${DCMS_HOST}/DCMS_External_PROD/`;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Surface Transportation Board. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const DECISION_ID_RE = /\b(\d{4,6})\b/;
export const DECISION_NO_RE = /Decision\s+No\.?\s*(\d+)/i;
export const DOCKET_TOKEN_RE =
  /\b((?:AB|AM|ARB|ASC|CNO|CU|DOP|DSO|EP|EPM|FD|FSA|IS|ISM|MC|MCC|MCF|MXC|NOM|NOR|PTO|RER|RR|S5A|S5M|SAI|SDM|SO|STA|SUB|SUS|WB|WC|WCC)[_\s-]?\d{2,6}(?:[_\s-]\d+)?(?:[_\s-][A-Z]{1,3})?)\b/i;
export const DCMS_PDF_RE =
  /https:\/\/dcms-external\.s3\.amazonaws\.com\/DCMS_External_PROD\/(\d+)\/(\d+)\.pdf/i;
export const FR_MIRROR_NO_RE = /\bDecision\s+No\.?\s*(21|30)\b/i;
export const OPEN_DATA_RE = /\b(?:STB-?1145|EP\s*770|EP\s*724)\b/i;
export const KEEP_TYPE_RE = /^(Decision|Corrected Decision|Policy Statement)$/i;
export const SKIP_TYPE_RE =
  /Notice of Exemption|Environmental Review|Notice Of Court Action|^Notice$|Corrected Notice|Corrected Environmental/i;
export const BOARD_BODY_RE = /Entire Board|^Chairman$/i;

export const ROSEBLUFF_ID = "52932";
export const UPNS_ID = "52877";
export const ROSEBLUFF_URL = `${DCMS_PREFIX}1784658941212/52932.pdf`;
export const UPNS_URL = `${DCMS_PREFIX}1768598129061/52877.pdf`;

export const CARD_FIELDS = [
  "id",
  "decisionId",
  "decisionNo",
  "docket",
  "kind",
  "decisionType",
  "decidingBody",
  "institution",
  "date",
  "title",
  "summary",
  "sourceUrl",
  "body",
] as const;

export const BODY_NEEDLE_SEED = "Rosebluff Lead";
export const BODY_NEEDLE_FEE = "$9.90 per";

export type StbDecisionKind = "Board Decision" | "Board Order";

export type StbDecisionListing = {
  id: string;
  decisionId: string;
  decisionNo: string;
  docket: string;
  kind: StbDecisionKind;
  decisionType: string;
  decidingBody: string;
  institution: string;
  date: string | null;
  title: string;
  summary: string;
  sourceUrl: string;
};

export type StbDecisionCard = StbDecisionListing & { body: string };

export type StbDecisionSnapshot = {
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
  sources: { listing: string; ajax: string; pdfHost: string };
  cards: StbDecisionCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (STB Board Decisions; +https://www.stb.gov/proceedings-actions/decisions/)";

export const SEED_LISTINGS: StbDecisionListing[] = [
  {
    id: ROSEBLUFF_ID,
    decisionId: ROSEBLUFF_ID,
    decisionNo: "16",
    docket: "FD-32760-46",
    kind: "Board Decision",
    decisionType: "Decision",
    decidingBody: "Entire Board",
    institution: "BNSF Railway Company—Terminal Trackage Rights—Kansas City Southern Railway Company and Union Pacific Railroad Company",
    date: "2026-07-21",
    title: "BNSF Railway Company—Terminal Trackage Rights—Kansas City Southern Railway Company and Union Pacific Railroad Company",
    summary: "Board established compensation terms for BNSF terminal trackage rights authorized in a prior decision.",
    sourceUrl: ROSEBLUFF_URL,
  },
  {
    id: UPNS_ID,
    decisionId: UPNS_ID,
    decisionNo: "9",
    docket: "FD-36873",
    kind: "Board Decision",
    decisionType: "Decision",
    decidingBody: "Entire Board",
    institution:
      "Union Pacific Corporation and Union Pacific Railroad Company—Control—Norfolk Southern Corporation and Norfolk Southern Railway Company",
    date: "2026-01-16",
    title:
      "Union Pacific Corporation and Union Pacific Railroad Company—Control—Norfolk Southern Corporation and Norfolk Southern Railway Company",
    summary: "Rejected the application (and two related applications), without prejudice to refiling.",
    sourceUrl: UPNS_URL,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function stbDecisionsDir(): string {
  if (env("STB_DECISIONS_DIR")) return resolve(env("STB_DECISIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/stb-decisions"));
}

export function snapshotPath(): string {
  return join(stbDecisionsDir(), "snapshot.json");
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
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
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
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

export function normalizeDocket(raw: string | null | undefined): string {
  if (!raw) return "";
  const token = raw.match(DOCKET_TOKEN_RE)?.[1] ?? raw.trim();
  return token
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function officialDcmsPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim().replace(/&amp;/g, "&");
  try {
    const parsed = new URL(trimmed, `https://${DCMS_HOST}/`);
    if (parsed.hostname.toLowerCase() !== DCMS_HOST) return null;
    const hit = parsed.href.match(DCMS_PDF_RE);
    if (!hit) return null;
    return `${DCMS_PREFIX}${hit[1]}/${hit[2]}.pdf`;
  } catch {
    return null;
  }
}

export function isOpenDataKill(text: string): boolean {
  if (OPEN_DATA_RE.test(text)) return true;
  if (/^dataset,period,value/i.test(text.trim())) return true;
  if (/\.csv\b/i.test(text) && /stb\.gov\/(reports-data|open-data|data)\b/i.test(text)) return true;
  return false;
}

export function isFrMirrorBody(text: string): boolean {
  if (/federalregister\.gov|govinfo\.gov\/content\/pkg\/FR/i.test(text)) return true;
  const agency = /^\s*AGENCY:\s*Surface Transportation Board/im.test(text);
  const action = /^\s*ACTION:\s*/im.test(text);
  const summary = /^\s*SUMMARY:\s*/im.test(text);
  if (agency && action && summary) return true;
  if (/\[FR Doc\./i.test(text) && agency) return true;
  if (FR_MIRROR_NO_RE.test(text) && agency && action) return true;
  return false;
}

export function isFrMirrorClass(row: Pick<StbDecisionListing, "decisionNo" | "title" | "summary" | "decisionType">): boolean {
  const hay = `${row.decisionNo} ${row.title} ${row.summary} ${row.decisionType}`;
  if (!/\b(21|30)\b/.test(row.decisionNo) && !FR_MIRROR_NO_RE.test(hay)) return false;
  return /AGENCY:|ACTION:|SUMMARY:|Federal Register|\[FR Doc/i.test(hay) || /Notice of Acceptance/i.test(hay);
}

export function isFederalRegisterHtml(text: string): boolean {
  return /<html[\s>]/i.test(text) && /Federal Register/i.test(text) && /AGENCY:/i.test(text);
}

export function keepListing(
  row: Pick<
    StbDecisionListing,
    "decisionId" | "decisionNo" | "docket" | "decisionType" | "decidingBody" | "title" | "summary" | "sourceUrl"
  >,
): boolean {
  if (!officialDcmsPdfUrl(row.sourceUrl)) return false;
  const hay = `${row.docket} ${row.title} ${row.summary} ${row.decisionType}`;
  if (isOpenDataKill(hay)) return false;
  if (SKIP_TYPE_RE.test(row.decisionType)) return false;
  if (!KEEP_TYPE_RE.test(row.decisionType.trim())) return false;
  if (isFrMirrorClass(row)) return false;
  if (row.decidingBody && !BOARD_BODY_RE.test(row.decidingBody) && row.decisionId !== ROSEBLUFF_ID && row.decisionId !== UPNS_ID) {
    return false;
  }
  return Boolean(row.decisionId);
}

export function isRealStbDecisionBody(text: string): boolean {
  if (isFrMirrorBody(text) || isFederalRegisterHtml(text) || isOpenDataKill(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 800) return false;
  const board = /SURFACE TRANSPORTATION BOARD/i.test(text);
  const decision = /\bDECISION\b/.test(text) && /Docket No\./i.test(text);
  const slip = /Decision No\.|It is ordered:/i.test(text);
  return board && decision && slip;
}

export function catalogId(decisionId: string, docket: string, decisionNo: string): string {
  const id = (decisionId || "").trim();
  if (/^\d{4,6}$/.test(id)) return id;
  const docketPart = normalizeDocket(docket);
  if (docketPart && decisionNo) return `${docketPart}-${decisionNo}`;
  return docketPart || id || "unknown";
}

export function parseKind(raw: string): StbDecisionKind {
  if (/\bOrder\b/i.test(raw) && !/Decision/i.test(raw)) return "Board Order";
  return "Board Decision";
}

export function parseDecisionTableHtml(html: string): StbDecisionListing[] {
  const out: StbDecisionListing[] = [];
  const seen = new Set<string>();
  const rows = html.split(/<tr\b/i).slice(1);
  for (const row of rows) {
    const folder = row.match(/data-stb-id="([^"]+)"/i)?.[1] ?? "";
    const [docketToken, decisionIdFromFolder] = folder.split("|");
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]));
    if (cells.length < 6) continue;
    const date = isoDate(cells[1] || cells[0]);
    const decisionId = (decisionIdFromFolder || cells[2] || "").match(DECISION_ID_RE)?.[1] ?? "";
    const docket = normalizeDocket(docketToken || cells[3] || "");
    const title = cells[4] || "";
    const decisionType = cells[5] || "";
    const decidingBody = cells[6] || "";
    const summary = cells[7] || "";
    const pdf =
      officialDcmsPdfUrl((row.match(DCMS_PDF_RE) || [])[0]) ||
      officialDcmsPdfUrl((row.match(/href="(https:\/\/dcms-external\.s3\.amazonaws\.com[^"]+\.pdf)"/i) || [])[1]);
    if (!decisionId || !pdf) continue;
    const decisionNo =
      `${title} ${summary}`.match(DECISION_NO_RE)?.[1] ??
      "";
    const listing: StbDecisionListing = {
      id: catalogId(decisionId, docket, decisionNo),
      decisionId,
      decisionNo,
      docket,
      kind: parseKind(`${decisionType} ${title}`),
      decisionType,
      decidingBody,
      institution: title || docket,
      date,
      title,
      summary,
      sourceUrl: pdf,
    };
    if (!keepListing(listing)) continue;
    if (seen.has(listing.id) || seen.has(listing.decisionId)) continue;
    seen.add(listing.id);
    seen.add(listing.decisionId);
    out.push(listing);
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export function parseStbDecisionText(
  text: string,
  meta: Partial<StbDecisionListing> & { sourceUrl: string },
): StbDecisionCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialDcmsPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const decisionId =
    (meta.decisionId && meta.decisionId.trim()) ||
    sourceUrl.match(/\/(\d+)\.pdf$/i)?.[1] ||
    (body.match(/^(\d{4,6})\s+SERVICE DATE/i) || [])[1] ||
    "";
  const decisionNo = meta.decisionNo || body.match(DECISION_NO_RE)?.[1] || "";
  const docket =
    normalizeDocket(meta.docket) ||
    normalizeDocket(body.match(/Docket No\.\s+([A-Z]+\s+\d+(?:\s+\(Sub-No\.\s+\d+\))?)/i)?.[1] ?? "") ||
    "";
  const date = meta.date ?? isoDate(body.match(/SERVICE DATE\s*[–-]\s*([A-Z]+ \d{1,2}, \d{4})/i)?.[1] ?? body.slice(0, 400));
  const titleFromBody = body
    .match(/Docket No\.[^\n]+\n+([A-Z][A-Z0-9 ,.’'\-\n]{12,220}?)\n+\s*(?:Decision No\.|Digest:|Decided:)/i)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
  return {
    id: meta.id || catalogId(decisionId, docket, decisionNo),
    decisionId,
    decisionNo,
    docket,
    kind: meta.kind || parseKind(`${meta.decisionType ?? ""} ${body.slice(0, 800)}`),
    decisionType: meta.decisionType || "Decision",
    decidingBody: meta.decidingBody || "Entire Board",
    institution: (meta.institution && meta.institution.trim()) || titleFromBody || docket || decisionId,
    date,
    title: meta.title || titleFromBody || `STB Decision ${decisionId}`,
    summary: meta.summary || "",
    sourceUrl,
    body,
  };
}

function emptySources(): StbDecisionSnapshot["sources"] {
  return { listing: LISTING_URL, ajax: AJAX_URL, pdfHost: DCMS_PREFIX };
}

export function emptyStbDecisionsSnapshot(reason: string): StbDecisionSnapshot {
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

export function assembleStbDecisionsSnapshot(cards: StbDecisionCard[], fetchedAt?: string): StbDecisionSnapshot {
  const kept = cards.filter((c) => isRealStbDecisionBody(c.body) && keepListing(c));
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
    reason: kept.length ? null : "Official STB/DCMS Board Decision PDFs had no extractable Board text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): StbDecisionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as StbDecisionSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleStbDecisionsSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readStbDecisionsSnapshot(): StbDecisionSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeStbDecisionsSnapshot(snap: StbDecisionSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchStbText(url: string, extra?: Record<string, string>): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/json", ...extra },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchStbBytes(url: string): Promise<Uint8Array> {
  const official = officialDcmsPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("STB_DECISIONS_PDFTOTEXT") || "pdftotext";
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
  return env("STB_DECISIONS_HTML_DIR") || env("STB_DECISIONS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("STB_DECISIONS_LIMIT", "4"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 4;
}

function maxFetchLimit(): number {
  const n = Number(env("STB_DECISIONS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function viewCount(): number {
  const n = Number(env("STB_DECISIONS_VIEW_COUNT", "50"));
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

function mergeListings(listed: StbDecisionListing[]): StbDecisionListing[] {
  const seen = new Set<string>();
  const out: StbDecisionListing[] = [];
  for (const row of [...SEED_LISTINGS, ...listed]) {
    if (!keepListing(row)) continue;
    const id = row.id || catalogId(row.decisionId, row.docket, row.decisionNo);
    if (!id || seen.has(id) || seen.has(row.decisionId)) continue;
    seen.add(id);
    seen.add(row.decisionId);
    out.push({ ...row, id });
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export function encodeSearchCriteria(
  criteria: { name: string; value: string }[],
): string {
  const parts: string[] = [];
  criteria.forEach((c, i) => {
    parts.push(`search-criteria[${i}][name]=${encodeURIComponent(c.name)}`);
    parts.push(`search-criteria[${i}][value]=${encodeURIComponent(c.value)}`);
  });
  return parts.join("&");
}

export async function fetchTableNonce(): Promise<string> {
  const body = `action=${NONCE_ACTION}&nonces[]=${TABLE_ACTION}`;
  const res = await fetch(AJAX_URL, {
    method: "POST",
    headers: {
      "User-Agent": HTTP_UA,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: LISTING_URL,
    },
    body,
  });
  if (!res.ok) throw new Error(`${AJAX_URL} nonce HTTP ${res.status}`);
  const json = (await res.json()) as { success?: boolean; data?: Record<string, string> };
  const nonce = json?.data?.[TABLE_ACTION];
  if (!nonce) throw new Error("STB decisions table nonce missing");
  return nonce;
}

export async function fetchDecisionTablePage(opts?: {
  nonce?: string;
  page?: number;
  perPage?: number;
  criteria?: { name: string; value: string }[];
}): Promise<{ rows: string; total: number }> {
  const nonce = opts?.nonce ?? (await fetchTableNonce());
  const page = opts?.page ?? 1;
  const perPage = opts?.perPage ?? viewCount();
  const criteria = opts?.criteria ?? [
    { name: "decisionType", value: "Decision" },
    { name: "decidingBody", value: "Entire Board" },
  ];
  const body = [
    `action=${TABLE_ACTION}`,
    `_ajax_nonce=${encodeURIComponent(nonce)}`,
    `page=${page}`,
    `per-page=${perPage}`,
    "sort_by=sortDate",
    "sort_order=desc",
    encodeSearchCriteria(criteria),
  ].join("&");
  const res = await fetch(AJAX_URL, {
    method: "POST",
    headers: {
      "User-Agent": HTTP_UA,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: LISTING_URL,
    },
    body,
  });
  if (!res.ok) throw new Error(`${AJAX_URL} table HTTP ${res.status}`);
  const json = (await res.json()) as { success?: boolean; data?: { rows?: string; total?: number } };
  return { rows: json?.data?.rows ?? "", total: Number(json?.data?.total) || 0 };
}

export async function walkOfficialStbDecisions(opts?: {
  pages?: number;
}): Promise<{ listed: StbDecisionListing[]; listedCount: number }> {
  const nonce = await fetchTableNonce();
  const listed: StbDecisionListing[] = [];
  let listedCount = 0;
  const pages = opts?.pages ?? Number(env("STB_DECISIONS_PAGES", "2")) || 2;
  for (let page = 1; page <= pages; page += 1) {
    const { rows, total } = await fetchDecisionTablePage({ nonce, page });
    listedCount = Math.max(listedCount, total, listed.length);
    listed.push(...parseDecisionTableHtml(rows));
    if (!rows || page * viewCount() >= total) break;
  }
  return { listed: mergeListings(listed), listedCount: Math.max(listedCount, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: StbDecisionListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = html ? parseDecisionTableHtml(html) : [];
    return { listed: mergeListings(listed), listedCount: Math.max(listed.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialStbDecisions();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectStbDecisions(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<StbDecisionSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = stbDecisionsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, StbDecisionCard>();
  for (const card of readStbDecisionsSnapshot()?.cards ?? []) {
    if (isRealStbDecisionBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const cards: StbDecisionCard[] = [];
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
      const localText = readNamedFile(dir, [
        `${row.id}.txt`,
        `${row.decisionId}.txt`,
        `${row.docket}.txt`,
        row.decisionId === ROSEBLUFF_ID ? "52932.txt" : "",
        row.decisionId === UPNS_ID ? "52877.txt" : "",
      ].filter(Boolean));
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialDcmsPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.decisionId || row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchStbBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (isFrMirrorBody(text) || isOpenDataKill(text) || isFederalRegisterHtml(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseStbDecisionText(text, { ...row, sourceUrl });
      if (!isRealStbDecisionBody(parsed.body) || !keepListing(parsed)) {
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
    ...assembleStbDecisionsSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeStbDecisionsSnapshot(snap);
  return snap;
}

export async function loadStbDecisions(): Promise<StbDecisionSnapshot> {
  const cached = readStbDecisionsSnapshot();
  if (cached && cached.cards.some((c) => isRealStbDecisionBody(c.body))) return cached;
  try {
    return await collectStbDecisions();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live STB Board Decision fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyStbDecisionsSnapshot(
      `STB/DCMS Board Decision PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildStbDecisionsManifest(snap: StbDecisionSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealStbDecisionBody(c.body) && keepListing(c));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      STB_DECISIONS_PATH,
      "Count + docket + Decision ID + date + deciding body only. Board Decision/Order body is the paid GET /stb-decisions payload. This free manifest lists the full catalog. Harvest STB/DCMS PDFs only. Skip FR-mirrored Decision Nos. 21/30 class. Open Data CSVs (STB-1145, EP 770, EP 724) are not this SKU.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: STB_DECISIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: STB_DECISIONS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      decisionId: c.decisionId,
      decisionNo: c.decisionNo,
      docket: c.docket,
      kind: c.kind,
      decisionType: c.decisionType,
      decidingBody: c.decidingBody,
      date: c.date,
      title: c.title,
      summary: c.summary,
      sourceUrl: c.sourceUrl,
    })),
    schema: {
      fields: [
        "id",
        "institution",
        "decisionId",
        "decisionNo",
        "docket",
        "kind",
        "decisionType",
        "decidingBody",
        "date",
        "title",
        "summary",
        "sourceUrl",
      ],
    },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterStbDecisionsManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "decisionId", "decisionNo", "docket", "kind", "decisionType", "decidingBody", "date", "title", "summary"].some(
      (k) =>
        String(row[k] ?? "")
          .toLowerCase()
          .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadStbDecisionsManifest(q?: string): Promise<Record<string, unknown>> {
  return filterStbDecisionsManifest(buildStbDecisionsManifest(readStbDecisionsSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectStbDecisions()
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
              decisionId: c.decisionId,
              decisionNo: c.decisionNo,
              docket: c.docket,
              institution: c.institution,
              kind: c.kind,
              decisionType: c.decisionType,
              decidingBody: c.decidingBody,
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
