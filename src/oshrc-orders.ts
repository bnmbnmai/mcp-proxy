#!/usr/bin/env node
/**
 * OSHRC ALJ Decision/Order + Commission Final Order TEXT door.
 * Official Decision and Order / EAJA Decision / Commission Final Order
 * PDF + HTML caches linked from the rolling decision-search board.
 * 17 U.S.C. § 105.
 * Walk https://www.oshrc.gov/decision-search/ — do not wrap a free
 * wp-json decision-narrative API. Skip protectiveness-style junk,
 * e-filing guides, settlement/default-only packs, and sibling-door wraps.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const OSHRC_ORDERS_PATH = "/oshrc-orders";
export const OSHRC_ORDERS_MANIFEST_PATH = "/oshrc-orders/manifest.json";
export const OSHRC_ORDERS_AMOUNT_ATOMIC = "50000";
export const OSHRC_ORDERS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "oshrc-order-bodies";
export const PRODUCT_NAME = "OSHRC ALJ Decision/Order + Commission Final Order text";

export const LISTING_URL = "https://www.oshrc.gov/decision-search/";
export const PDF_ORIGIN = "https://www.oshrc.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Occupational Safety and Health Review Commission. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const DOCKET_RE = /\b(\d{2}-\d{4})\b/;
export const FILE_PATH_RE = /^\/wp-content\/uploads\/[^?#]+\.(pdf|html)$/i;
export const KIND_RE =
  /Decision and Order|Commission Final Order|Commission Decision|Commission Order|EAJA/i;
export const FINLEY_URL =
  "https://www.oshrc.gov/wp-content/uploads/ALJ-Dec-Finley-Farmers-24-0889-EAJA.pdf";
export const FINLEY_HTML_URL =
  "https://www.oshrc.gov/wp-content/uploads/ALJ-Dec-Finley-Farmers-24-0889-EAJA.html";
export const STIS_URL =
  "https://www.oshrc.gov/wp-content/uploads/24-0702-STIS-Inc.-ALJ-Decision-and-Order-redacted.pdf";
export const STIS_HTML_URL =
  "https://www.oshrc.gov/wp-content/uploads/24-0702-STIS-Inc.-ALJ-Decision-and-Order-redacted.html";

export const CARD_FIELDS = [
  "id",
  "docket",
  "board",
  "kind",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "htmlUrl",
  "body",
] as const;

export const BODY_NEEDLE_SEED = "Equal Access to Justice Act (EAJA), 5 U.S.C. § 504";

export type OshrcBoard = "alj" | "commission";
export type OshrcKind =
  | "ALJ Decision and Order"
  | "EAJA Decision and Order"
  | "Commission Final Order"
  | "Commission Decision"
  | "Commission Order";

export type OshrcListing = {
  id: string;
  docket: string;
  board: OshrcBoard;
  kind: OshrcKind;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  htmlUrl: string | null;
  pdfId: string;
};

export type OshrcCard = OshrcListing & { body: string };

export type OshrcSnapshot = {
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
  cards: OshrcCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (OSHRC public decisions; +https://www.oshrc.gov/decision-search/)";
const OFFICIAL_HOSTS = new Set(["www.oshrc.gov", "oshrc.gov"]);
const JUNK_FILE_RE =
  /e-?fil(e|ing)|password|organizational-chart|how_to_change|quick-guide|definitions\.pdf|area_office_instructions/i;

export const SEED_LISTINGS: OshrcListing[] = [
  {
    id: "24-0889-eaja",
    docket: "24-0889 (EAJA)",
    board: "alj",
    kind: "EAJA Decision and Order",
    institution: "Finley Farmers Grain & Elevator",
    date: "2026-09-04",
    title: "Finley Farmers Grain & Elevator",
    sourceUrl: FINLEY_URL,
    htmlUrl: FINLEY_HTML_URL,
    pdfId: "ALJ-Dec-Finley-Farmers-24-0889-EAJA.pdf",
  },
  {
    id: "24-0702",
    docket: "24-0702",
    board: "alj",
    kind: "ALJ Decision and Order",
    institution: "STIS, Inc., dba Southeast Texas Industrial Services",
    date: "2026-07-15",
    title: "STIS, Inc., dba Southeast Texas Industrial Services",
    sourceUrl: STIS_URL,
    htmlUrl: STIS_HTML_URL,
    pdfId: "24-0702-STIS-Inc.-ALJ-Decision-and-Order-redacted.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function oshrcOrdersDir(): string {
  if (env("OSHRC_ORDERS_DIR")) return resolve(env("OSHRC_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/oshrc-orders"));
}

export function snapshotPath(): string {
  return join(oshrcOrdersDir(), "snapshot.json");
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
  return decodeEntities(raw.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "));
}

export function htmlToText(raw: string): string {
  const withoutChrome = raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  const withBreaks = withoutChrome
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr|li|td|th)>/gi, "\n");
  return decodeEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

export function catalogId(docketRaw: string | null | undefined): string | null {
  if (!docketRaw) return null;
  const docks = [...docketRaw.matchAll(/\b(\d{2}-\d{4})\b/g)].map((m) => m[1]);
  if (!docks.length) return null;
  const base = docks[0];
  if (/\bEAJA\b/i.test(docketRaw)) return `${base}-eaja`;
  if (docks.length > 1) return `${docks[0]}-${docks[1]}`;
  return base;
}

export function parseKind(raw: string, board: OshrcBoard): OshrcKind {
  if (/\bEAJA\b/i.test(raw)) return "EAJA Decision and Order";
  if (board === "commission") {
    if (/Final[- ]Order/i.test(raw)) return "Commission Final Order";
    if (/Remand/i.test(raw) || /\bORDER\b/.test(raw)) return "Commission Order";
    return "Commission Decision";
  }
  return "ALJ Decision and Order";
}

export function officialOshrcFileUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim().replace(/&amp;/g, "&"), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (!OFFICIAL_HOSTS.has(host)) return null;
    if (/\/wp-json\//i.test(parsed.pathname)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (!FILE_PATH_RE.test(path)) return null;
    if (JUNK_FILE_RE.test(path)) return null;
    return `https://www.oshrc.gov${parsed.pathname.replace(/\^/g, "%5E")}`;
  } catch {
    return null;
  }
}

export function htmlTwinUrl(pdfUrl: string | null | undefined): string | null {
  const official = officialOshrcFileUrl(pdfUrl);
  if (!official || !/\.pdf$/i.test(official)) return null;
  return official.replace(/\.pdf$/i, ".html");
}

export function pdfIdFromUrl(url: string | null | undefined): string {
  const official = officialOshrcFileUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    return decodeURIComponent(parsed.pathname.split("/").pop() || official);
  } catch {
    return official;
  }
}

export function isProtectivenessJunk(text: string): boolean {
  const compact = text.replace(/\s+/g, " ");
  return /protectiveness (determination|statement|letter)|five-year review protectiveness/i.test(
    compact,
  );
}

export function isEfilingGuide(text: string): boolean {
  return /E-Fil(e|ing).{0,40}Guide|How to Change Your Password|Organizational Chart/i.test(text);
}

export function isSettlementDefault(text: string): boolean {
  const compact = text.replace(/\s+/g, " ");
  if (
    !/SETTLEMENT AGREEMENT|DEFAULT ORDER|Joint Notification of Settlement|Notification of Settlement/i.test(
      compact,
    )
  ) {
    return false;
  }
  if (/FINDINGS OF FACT|ON BRIEFS|REMAND ORDER/i.test(compact) && compact.length >= 1500) return false;
  return compact.length < 2000;
}

export function isWpJsonNarrative(text: string): boolean {
  const compact = text.trim();
  if (!(compact.startsWith("{") || compact.startsWith("["))) return false;
  return /"content"\s*:\s*\{\s*"rendered"|\/wp-json\/wp\/v2\//i.test(compact);
}

export function isSiblingPack(text: string): boolean {
  return (
    /FEDERAL MINE SAFETY AND HEALTH REVIEW COMMISSION|BUREAU OF SAFETY AND ENVIRONMENTAL ENFORCEMENT|MSHA Open Government/i.test(
      text,
    ) && !/OCCUPATIONAL SAFETY AND HEALTH REVIEW COMMISSION/i.test(text)
  );
}

export function isRealOshrcBody(text: string): boolean {
  if (isProtectivenessJunk(text) || isEfilingGuide(text) || isSettlementDefault(text)) return false;
  if (isWpJsonNarrative(text) || isSiblingPack(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  const commissionFinal = /Commission Final Order|\bFINAL ORDER\b/i.test(text);
  const min = commissionFinal ? 500 : 1500;
  if (compact.length < min) return false;
  const oshrc = /OCCUPATIONAL SAFETY AND HEALTH REVIEW COMMISSION|\bOSHRC\b/i.test(text);
  const kind = KIND_RE.test(text) || /SECRETARY OF LABOR/i.test(text);
  const docket = DOCKET_RE.test(text);
  return oshrc && kind && docket;
}

export function parseDecisionTables(html: string): OshrcListing[] {
  const out: OshrcListing[] = [];
  const seen = new Set<string>();
  const tables: Array<{ board: OshrcBoard; chunk: string }> = [
    {
      board: "commission",
      chunk: (html.match(/<table id="decision-table-final"[\s\S]*?<\/table>/i) || [])[0] || "",
    },
    {
      board: "alj",
      chunk: (html.match(/<table id="decision-table-alj"[\s\S]*?<\/table>/i) || [])[0] || "",
    },
  ];
  for (const { board, chunk } of tables) {
    if (!chunk) continue;
    const rows = chunk.split(/<tr\b/i).slice(2);
    for (const row of rows) {
      const title = stripTags((row.match(/class="c-card__case"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) || [])[1] || "");
      const docketRaw = stripTags((row.match(/class="c-card__docket"[^>]*>([\s\S]*?)<\/td>/i) || [])[1] || "");
      const date = isoDate(stripTags((row.match(/class="c-card__date"[^>]*>([\s\S]*?)<\/td>/i) || [])[1] || ""));
      const pdfHref = officialOshrcFileUrl(
        (row.match(/<a[^>]*class="pdf_link"[^>]*href="\s*([^"]+?)\s*"/i) ||
          row.match(/<a[^>]*href="\s*([^"]+?)\s*"[^>]*class="pdf_link"/i) ||
          row.match(/class="c-card__case"[\s\S]*?href="\s*([^"]+?\.pdf[^"]*)\s*"/i) ||
          [])[1],
      );
      const htmlHref = officialOshrcFileUrl(
        (row.match(/<a[^>]*class="text_link"[^>]*href="\s*([^"]+?)\s*"/i) ||
          row.match(/<a[^>]*href="\s*([^"]+?)\s*"[^>]*class="text_link"/i) ||
          [])[1],
      );
      const sourceUrl = pdfHref || (htmlHref && htmlHref.toLowerCase().endsWith(".html") ? htmlHref : null);
      const id = catalogId(docketRaw) || catalogId(title);
      if (!title || !id || !sourceUrl) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      const kind = parseKind(`${title} ${docketRaw} ${sourceUrl}`, board);
      out.push({
        id,
        docket: docketRaw || id,
        board,
        kind,
        institution: title,
        date,
        title,
        sourceUrl,
        htmlUrl: htmlHref || htmlTwinUrl(sourceUrl),
        pdfId: pdfIdFromUrl(sourceUrl),
      });
    }
  }
  return out;
}

export function parseOshrcText(
  text: string,
  meta: Partial<OshrcListing> & { sourceUrl: string },
): OshrcCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialOshrcFileUrl(meta.sourceUrl) || meta.sourceUrl;
  const board: OshrcBoard =
    meta.board || (/commission|final-order|comm[-_]/i.test(sourceUrl) ? "commission" : "alj");
  const docket = meta.docket || catalogId(body) || meta.pdfId || "unknown";
  const title = meta.title || "OSHRC decision";
  return {
    id: meta.id || catalogId(docket) || catalogId(body) || "unknown",
    docket,
    board,
    kind: meta.kind || parseKind(`${title} ${body.slice(0, 2500)}`, board),
    institution: (meta.institution && meta.institution.trim()) || title,
    date: meta.date ?? isoDate(body.slice(0, 4000)),
    title,
    sourceUrl,
    htmlUrl: meta.htmlUrl || htmlTwinUrl(sourceUrl),
    pdfId: meta.pdfId || pdfIdFromUrl(sourceUrl),
    body,
  };
}

function emptySources(): OshrcSnapshot["sources"] {
  return { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/wp-content/uploads/` };
}

export function emptyOshrcSnapshot(reason: string): OshrcSnapshot {
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

export function assembleOshrcSnapshot(cards: OshrcCard[], fetchedAt?: string): OshrcSnapshot {
  const kept = cards.filter((c) => isRealOshrcBody(c.body));
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
    reason: kept.length ? null : "Official OSHRC Decision/Order PDFs had no extractable decision text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): OshrcSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as OshrcSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleOshrcSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readOshrcSnapshot(): OshrcSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeOshrcSnapshot(snap: OshrcSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchOshrcText(url: string): Promise<string> {
  const official = officialOshrcFileUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchOshrcBytes(url: string): Promise<Uint8Array> {
  const official = officialOshrcFileUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("OSHRC_ORDERS_PDFTOTEXT") || "pdftotext";
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
  return env("OSHRC_ORDERS_HTML_DIR") || env("OSHRC_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("OSHRC_ORDERS_LIMIT", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxFetchLimit(): number {
  const n = Number(env("OSHRC_ORDERS_MAX_FETCH", "12"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 12;
}

function pageLimit(): number {
  const n = Number(env("OSHRC_ORDERS_PAGES", "2"));
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

function mergeListings(listed: OshrcListing[]): OshrcListing[] {
  const seen = new Set<string>();
  const out: OshrcListing[] = [];
  for (const row of [...SEED_LISTINGS, ...listed]) {
    const id = row.id || catalogId(row.docket);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ ...row, id });
  }
  return out;
}

export function listingPageUrl(page: number, year?: string): string {
  const url = new URL(LISTING_URL);
  if (page > 1) url.searchParams.set("sf_paged", String(page));
  if (year) url.searchParams.append("_sfm_year[]", year);
  return url.toString();
}

export async function walkOfficialOshrc(opts?: {
  fetchText?: (url: string) => Promise<string>;
  pages?: number;
  year?: string;
}): Promise<{ listed: OshrcListing[]; listedCount: number }> {
  const fetchText = opts?.fetchText ?? fetchOshrcText;
  const pages = opts?.pages ?? pageLimit();
  const year = opts?.year ?? (env("OSHRC_ORDERS_YEAR") || undefined);
  const listed: OshrcListing[] = [];
  const seen = new Set<string>();
  let listedCount = 0;
  for (let page = 1; page <= pages; page += 1) {
    try {
      const rows = parseDecisionTables(await fetchText(listingPageUrl(page, year)));
      listedCount += rows.length;
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        listed.push(row);
      }
    } catch {
      break;
    }
  }
  return { listed: mergeListings(listed), listedCount: Math.max(listedCount, listed.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: OshrcListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html", "decision-search.html"]);
    const listed = html ? parseDecisionTables(html) : [];
    return { listed: mergeListings(listed), listedCount: listed.length };
  }
  try {
    const walked = await walkOfficialOshrc();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialBody(row: OshrcListing, cacheDir: string): Promise<string> {
  const pdfFile = join(cacheDir, `${row.id.replace(/[^\w.-]+/g, "_")}.pdf`);
  const htmlFile = join(cacheDir, `${row.id.replace(/[^\w.-]+/g, "_")}.html`);
  const htmlUrl = row.htmlUrl || htmlTwinUrl(row.sourceUrl);
  if (/\.pdf$/i.test(row.sourceUrl)) {
    try {
      if (!existsSync(pdfFile)) writeFileSync(pdfFile, await fetchOshrcBytes(row.sourceUrl));
      const fromPdf = pdfToText(pdfFile);
      if (fromPdf.trim()) return fromPdf;
    } catch {
      /* fall through to official HTML twin from the index */
    }
  }
  if (!htmlUrl) throw new Error(`no official HTML twin for ${row.id}`);
  if (!existsSync(htmlFile)) writeFileSync(htmlFile, await fetchOshrcText(htmlUrl));
  return htmlToText(readFileSync(htmlFile, "utf-8"));
}

export async function collectOshrcOrders(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<OshrcSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = oshrcOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, OshrcCard>();
  for (const card of readOshrcSnapshot()?.cards ?? []) {
    if (isRealOshrcBody(card.body)) prior.set(card.id, card);
  }
  const cards: OshrcCard[] = [];
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
      const localText = readNamedFile(dir, [
        `${row.id.toLowerCase()}.txt`,
        `${row.id}.txt`,
        `${row.pdfId.replace(/\.(pdf|html)$/i, "")}.txt`,
      ]);
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      let fetchedThis = false;
      const text =
        localText ??
        (await (async () => {
          const body = await extractOfficialBody(row, cacheDir);
          fetchedThis = true;
          return body;
        })());
      if (fetchedThis) fetchedPdfs += 1;
      const parsed = parseOshrcText(text, row);
      if (!isRealOshrcBody(parsed.body)) {
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
    ...assembleOshrcSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeOshrcSnapshot(snap);
  return snap;
}

export async function loadOshrcOrders(): Promise<OshrcSnapshot> {
  const cached = readOshrcSnapshot();
  if (cached && cached.cards.some((c) => isRealOshrcBody(c.body))) return cached;
  try {
    return await collectOshrcOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live OSHRC Decision/Order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyOshrcSnapshot(
      `OSHRC Decision/Order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildOshrcManifest(snap: OshrcSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealOshrcBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      OSHRC_ORDERS_PATH,
      "Count + operator + docket + date + official PDF/HTML URL only. Decision body is the paid GET /oshrc-orders payload. This free manifest lists the full catalog. Skip protectiveness-style junk, e-filing guides, settlement/default-only packs, and free wp-json decision-narrative wraps.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: OSHRC_ORDERS_AMOUNT_ATOMIC,
    oneAmountAtomic: OSHRC_ORDERS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      docket: c.docket,
      board: c.board,
      kind: c.kind,
      date: c.date,
      title: c.title,
      sourceUrl: c.sourceUrl,
      htmlUrl: c.htmlUrl,
    })),
    schema: { fields: ["id", "institution", "docket", "board", "kind", "date", "title", "sourceUrl", "htmlUrl"] },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterOshrcManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "docket", "board", "kind", "date", "title", "sourceUrl", "htmlUrl"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadOshrcManifest(q?: string): Promise<Record<string, unknown>> {
  return filterOshrcManifest(buildOshrcManifest(readOshrcSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectOshrcOrders()
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
              institution: c.institution,
              board: c.board,
              kind: c.kind,
              date: c.date,
              title: c.title,
              bodyChars: c.body.length,
              sourceUrl: c.sourceUrl,
              htmlUrl: c.htmlUrl,
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
