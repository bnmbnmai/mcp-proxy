#!/usr/bin/env node
/**
 * DOL ECAB FECA Decision and Order TEXT door.
 * Index: https://www.dol.gov/agencies/ecab/decisions
 * Month indexes use the full month name (July, not Jul).
 * PDFs: https://www.dol.gov/sites/dolgov/files/ecab/decisions/YYYY/MON/NN-NNNN.pdf
 * 17 U.S.C. § 105. Same extracted-body pipe as /nlrb-decisions and /flra-decisions.
 * Harvest ECAB-authored Decision and Order PDFs only.
 * Order slips (*_O.pdf), fee-petition orders, and the AB-1 application form are not this SKU.
 * Plain browser GET is Akamai 403. Fetch uses the same descriptive User-Agent
 * live /oalj-decisions already uses for dol.gov PDFs.
 * No-auth ?_format=json on the month route is Akamai 403. Drupal /api has no ECAB decision type.
 * Not /oalj-decisions (OALJ / BALCA / ARB, not ECAB FECA slips).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const ECAB_DECISIONS_PATH = "/ecab-decisions";
export const ECAB_DECISIONS_MANIFEST_PATH = "/ecab-decisions/manifest.json";
export const ECAB_DECISIONS_AMOUNT_ATOMIC = "50000";
export const ECAB_DECISIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "ecab-decision-bodies";
export const PRODUCT_NAME = "ECAB FECA Decision and Order text";

export const LISTING_URL = "https://www.dol.gov/agencies/ecab/decisions";
export const PDF_HOST = "www.dol.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "U.S. Department of Labor, Employees' Compensation Appeals Board. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const DOCKET_RE = /\b(\d{2}-\d{4})\b/;
/** Year/month slip folder only. *_O orders, fee petitions, and AB-1 fail this shape. */
export const SLIP_PDF_RE =
  /^\/sites\/dolgov\/files\/ecab\/decisions\/\d{4}\/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\/\d{2}-\d{4}\.pdf$/i;
/**
 * Hub month tokens. Most months are 3 letters (Aug, not August).
 * June and July are spelled out on 2024+ indexes. /2026/Jul and /2024/Jul are 404;
 * /1998/Jul still resolves. /2026/August is 404.
 */
export const MONTH_INDEX_RE =
  /^\/agencies\/ecab\/decisions\/((?:19|20)\d{2})\/(Jan|Feb|Mar|Apr|May|Jun|June|Jul|July|Aug|Sep|Oct|Nov|Dec)\/?$/i;

export const CP_ID = "26-0528";
export const SS_ID = "26-0526";
export const RW_ID = "24-0755";
export const CP_URL = "https://www.dol.gov/sites/dolgov/files/ecab/decisions/2026/AUG/26-0528.pdf";
export const SS_URL = "https://www.dol.gov/sites/dolgov/files/ecab/decisions/2026/AUG/26-0526.pdf";
export const RW_URL = "https://www.dol.gov/sites/dolgov/files/ecab/decisions/2026/AUG/24-0755.pdf";

export const BODY_NEEDLE_CP = "torn rotator cuff in her right shoulder";
export const BODY_NEEDLE_SS = "twisted his knee, and felt a pop";
export const BODY_NEEDLE_RW = "fell as he left the fast-food restaurant";

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

export type EcabKind = "Decision and Order";

export type EcabListing = {
  id: string;
  citation: string;
  docket: string;
  caseNo: string;
  documentId: string;
  kind: EcabKind;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
};

export type EcabCard = EcabListing & { body: string };

export type EcabSnapshot = {
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
  cards: EcabCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (DOL ECAB decisions; +https://www.dol.gov/agencies/ecab/decisions)";
const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** 2024+ July indexes are spelled July. The /Jul alias is 404 from 2024 forward. */
export function keepEcabMonthIndex(year: number, token: string): boolean {
  const key = token.toLowerCase();
  if (!(key in MONTH_INDEX)) return false;
  if (key === "jul" && year >= 2024) return false;
  return true;
}

export const SEED_LISTINGS: EcabListing[] = [
  {
    id: CP_ID,
    citation: "Docket No. 26-0528",
    docket: "26-0528",
    caseNo: "26-0528",
    documentId: "26-0528.pdf",
    kind: "Decision and Order",
    institution: "C.P. and U.S. POSTAL SERVICE, GERMANTOWN POST OFFICE, Philadelphia, PA",
    date: "2026-08-27",
    title: "Docket No. 26-0528",
    sourceUrl: CP_URL,
  },
  {
    id: SS_ID,
    citation: "Docket No. 26-0526",
    docket: "26-0526",
    caseNo: "26-0526",
    documentId: "26-0526.pdf",
    kind: "Decision and Order",
    institution: "S.S. and DEPARTMENT OF VETERANS AFFAIRS, TOMAH VA MEDICAL CENTER, Tomah, WI",
    date: "2026-08-26",
    title: "Docket No. 26-0526",
    sourceUrl: SS_URL,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ecabDecisionsDir(): string {
  if (env("ECAB_DECISIONS_DIR")) return resolve(env("ECAB_DECISIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ecab-decisions"));
}

export function snapshotPath(): string {
  return join(ecabDecisionsDir(), "snapshot.json");
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

export function normalizeDocket(raw: string | null | undefined): string {
  if (!raw) return "";
  const hit = raw.match(DOCKET_RE);
  return hit ? hit[1] : "";
}

export function cleanParties(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\u2026/g, "")
    .replace(/\.{2,}\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function officialEcabPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim().replace(/&amp;/g, "&");
  try {
    const parsed = new URL(trimmed, "https://www.dol.gov/");
    const host = parsed.hostname.toLowerCase();
    if (host !== "www.dol.gov" && host !== "dol.gov") return null;
    const path = decodeURIComponent(parsed.pathname);
    if (!SLIP_PDF_RE.test(path)) return null;
    return `https://www.dol.gov${path}`;
  } catch {
    return null;
  }
}

export function documentIdFromUrl(url: string | null | undefined): string {
  const official = officialEcabPdfUrl(url);
  if (!official) return "";
  try {
    const name = decodeURIComponent(new URL(official).pathname.split("/").pop() || "");
    return name.toLowerCase();
  } catch {
    return "";
  }
}

export function docketFromUrl(url: string | null | undefined): string {
  return normalizeDocket(documentIdFromUrl(url).replace(/\.pdf$/i, ""));
}

export function citationFor(docket: string): string {
  return docket ? `Docket No. ${docket}` : "";
}

export function isOrderSlip(text: string): boolean {
  if (/DECISION AND ORDER/i.test(text)) return false;
  return /\bORDER REMANDING\b|\bORDER DISMISSING\b|\bORDER DENYING\b/i.test(text);
}

export function isFeePetition(text: string): boolean {
  if (/DECISION AND ORDER/i.test(text)) return false;
  return /fee_petition_orders|\bFEE PETITION\b|\bIn the Matter of\b/i.test(text);
}

export function isAb1Form(text: string): boolean {
  return /APPLICATION FOR REVIEW\s*\(AB-1\)/i.test(text);
}

export function isHtmlDecision(text: string): boolean {
  return /<html[\s>]/i.test(text) && /Employees[’'] Compensation Appeals Board/i.test(text);
}

export function isIndexHtml(text: string): boolean {
  return /<th[^>]*>\s*Docket No\.\s*<\/th>/i.test(text) && /ecab\/decisions/i.test(text);
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
  row: Pick<EcabListing, "docket" | "citation" | "title" | "institution" | "sourceUrl" | "kind">,
): boolean {
  if (!officialEcabPdfUrl(row.sourceUrl)) return false;
  const docket = normalizeDocket(row.docket) || docketFromUrl(row.sourceUrl);
  if (!docket) return false;
  const hay = `${row.citation} ${row.kind} ${row.title} ${row.institution} ${row.sourceUrl}`;
  if (/_O\.pdf/i.test(hay)) return false;
  if (/fee_petition_orders|\/ab-1\.pdf/i.test(hay)) return false;
  if (isFeePetition(hay) || isAb1Form(hay) || isOrderSlip(hay)) return false;
  return true;
}

export function isRealEcabDecisionBody(text: string, docket?: string): boolean {
  if (isOrderSlip(text) || isFeePetition(text) || isAb1Form(text) || isHtmlDecision(text) || isIndexHtml(text) || isJsonFullText(text)) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 800) return false;
  const board = /Employees[’'] Compensation Appeals Board/i.test(text);
  const decision = /DECISION AND ORDER/i.test(text);
  const slip = Boolean(normalizeDocket(docket) || normalizeDocket(text.match(/Docket No\.\s*(\d{2}-\d{4})/i)?.[1]));
  const feca = /Federal Employees[’'] Compensation Act|\bFECA\b/i.test(text);
  return board && decision && slip && feca;
}

export function parseParties(text: string): string {
  const head = text.split(/DECISION AND ORDER/i)[0] ?? "";
  const lines: string[] = [];
  for (const raw of head.split(/\n/)) {
    const left = (raw.split(/\s{3,}/)[0] ?? "").replace(/\)/g, "").trim();
    if (!left || /^_+$/.test(left)) continue;
    lines.push(left);
  }
  const block = lines.join("\n").split(/Appearances:/i)[0] ?? "";
  const joined = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^_+$/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const hit = joined.match(/((?:[A-Z]\.){1,4}),\s*Appellant\s+and\s+(.+?),\s*Employer\b/);
  if (!hit) return "";
  return `${hit[1].trim()} and ${hit[2].trim()}`;
}

function emptySources(): EcabSnapshot["sources"] {
  return { listing: LISTING_URL, pdfHost: "https://www.dol.gov/sites/dolgov/files/ecab/decisions/" };
}

export function parseEcabDecisionsHtml(raw: string): EcabListing[] {
  const out: EcabListing[] = [];
  const seen = new Set<string>();
  for (const row of raw.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const html = row[1] ?? "";
    const href = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1] ?? "").find((link) => officialEcabPdfUrl(link));
    const sourceUrl = officialEcabPdfUrl(href);
    const cells = [...html.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1] ?? ""));
    if (!sourceUrl || cells.length < 3) continue;
    const docket = normalizeDocket(cells[0]) || docketFromUrl(sourceUrl);
    if (!docket) continue;
    const listing: EcabListing = {
      id: docket,
      citation: citationFor(docket),
      docket,
      caseNo: docket,
      documentId: documentIdFromUrl(sourceUrl),
      kind: "Decision and Order",
      institution: cleanParties(cells[2]) || docket,
      date: isoDate(cells[1]),
      title: citationFor(docket),
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

export function discoverMonthPageUrls(raw: string, baseUrl: string): string[] {
  const out: { href: string; year: number; month: number }[] = [];
  const seen = new Set<string>();
  for (const match of raw.matchAll(/href="([^"]+)"/gi)) {
    try {
      const url = new URL(match[1], baseUrl);
      const host = url.hostname.toLowerCase();
      if (host !== "www.dol.gov" && host !== "dol.gov") continue;
      const hit = url.pathname.match(MONTH_INDEX_RE);
      if (!hit) continue;
      const year = Number(hit[1]);
      const token = hit[2];
      if (!keepEcabMonthIndex(year, token)) continue;
      url.hash = "";
      url.search = "";
      const href = `https://www.dol.gov${url.pathname.replace(/\/$/, "")}`;
      if (seen.has(href)) continue;
      seen.add(href);
      out.push({
        href,
        year,
        month: MONTH_INDEX[token.toLowerCase()] ?? 0,
      });
    } catch {
      /* skip */
    }
  }
  out.sort((a, b) => b.year - a.year || b.month - a.month || b.href.localeCompare(a.href));
  return out.map((row) => row.href);
}

export function parseEcabDecisionText(
  text: string,
  meta: Partial<EcabListing> & { sourceUrl: string },
): EcabCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialEcabPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket =
    normalizeDocket(meta.docket) ||
    normalizeDocket(body.match(/Docket No\.\s*(\d{2}-\d{4})/i)?.[1]) ||
    docketFromUrl(sourceUrl);
  const parties = parseParties(body);
  const issued = isoDate(body.match(/Issued:\s*([A-Za-z]+\.?\s+\d{1,2},\s+\d{4})/)?.[1] ?? "");
  return {
    id: meta.id || docket,
    citation: citationFor(docket),
    docket,
    caseNo: docket,
    documentId: meta.documentId || documentIdFromUrl(sourceUrl),
    kind: "Decision and Order",
    institution: parties || cleanParties(meta.institution) || docket,
    date: meta.date ?? issued,
    title: meta.title || citationFor(docket) || "ECAB Decision and Order",
    sourceUrl,
    body,
  };
}

export function emptyEcabDecisionsSnapshot(reason: string): EcabSnapshot {
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

export function assembleEcabDecisionsSnapshot(cards: EcabCard[], fetchedAt?: string): EcabSnapshot {
  const kept = cards.filter((c) => isRealEcabDecisionBody(c.body, c.docket) && keepListing(c));
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
    reason: kept.length ? null : "Official ECAB Decision and Order PDFs had no extractable Decision text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): EcabSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as EcabSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleEcabDecisionsSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readEcabDecisionsSnapshot(): EcabSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeEcabDecisionsSnapshot(snap: EcabSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchEcabText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/json" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchEcabBytes(url: string): Promise<Uint8Array> {
  const official = officialEcabPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,application/octet-stream" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("ECAB_DECISIONS_PDFTOTEXT") || "pdftotext";
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
  return env("ECAB_DECISIONS_HTML_DIR") || env("ECAB_DECISIONS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("ECAB_DECISIONS_LIMIT", "7"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 7;
}

function maxFetchLimit(): number {
  const n = Number(env("ECAB_DECISIONS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxListingPages(): number {
  const n = Number(env("ECAB_DECISIONS_PAGES", "2"));
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

function mergeListings(listed: EcabListing[]): EcabListing[] {
  const seen = new Set<string>();
  const out: EcabListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepListing(row)) continue;
    const id = row.id || row.docket;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ ...row, id });
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export async function walkOfficialEcabDecisions(): Promise<{ listed: EcabListing[]; listedCount: number }> {
  const listed: EcabListing[] = [];
  let months: string[] = [];
  try {
    const hub = await fetchEcabText(LISTING_URL);
    months = discoverMonthPageUrls(hub, LISTING_URL);
  } catch {
    months = [];
  }
  const cap = maxListingPages();
  let got = 0;
  let attempts = 0;
  const attemptCap = Math.max(cap * 6, 8);
  for (const page of months) {
    if (got >= cap || attempts >= attemptCap) break;
    attempts += 1;
    try {
      const rows = parseEcabDecisionsHtml(await fetchEcabText(page));
      if (rows.length === 0) continue;
      listed.push(...rows);
      got += 1;
    } catch {
      /* unpublished month indexes 404; keep walking newer-first */
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: EcabListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing-excerpt.html", "listing.html", "listing-excerpt.json"]);
    const listed = raw ? parseEcabDecisionsHtml(raw) : [];
    const merged = mergeListings(listed);
    return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialEcabDecisions();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectEcabDecisions(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<EcabSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ecabDecisionsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, EcabCard>();
  for (const card of readEcabDecisionsSnapshot()?.cards ?? []) {
    if (isRealEcabDecisionBody(card.body, card.docket) && keepListing(card)) prior.set(card.id, card);
  }
  const cards: EcabCard[] = [];
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
      const localText = readNamedFile(dir, [`${row.id}.txt`, `${row.docket}.txt`].filter(Boolean));
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialEcabPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchEcabBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (isOrderSlip(text) || isFeePetition(text) || isAb1Form(text) || isHtmlDecision(text) || isJsonFullText(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseEcabDecisionText(text, { ...row, sourceUrl });
      if (!isRealEcabDecisionBody(parsed.body, parsed.docket) || !keepListing(parsed)) {
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
    ...assembleEcabDecisionsSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeEcabDecisionsSnapshot(snap);
  return snap;
}

export async function loadEcabDecisions(): Promise<EcabSnapshot> {
  const cached = readEcabDecisionsSnapshot();
  if (cached && cached.cards.some((c) => isRealEcabDecisionBody(c.body, c.docket))) return cached;
  try {
    return await collectEcabDecisions();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live ECAB Decision fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyEcabDecisionsSnapshot(
      `ECAB Decision and Order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildEcabDecisionsManifest(snap: EcabSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealEcabDecisionBody(c.body, c.docket) && keepListing(c));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      ECAB_DECISIONS_PATH,
      "Count + docket + date + institution only. Decision and Order body is the paid GET /ecab-decisions payload. This free manifest lists the full catalog. Harvest ECAB-authored Decision and Order PDFs only. Order slips, fee petitions, and the AB-1 form are not this SKU. Not /oalj-decisions.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: ECAB_DECISIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: ECAB_DECISIONS_ONE_AMOUNT_ATOMIC,
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

export function filterEcabDecisionsManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
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

export async function loadEcabDecisionsManifest(q?: string): Promise<Record<string, unknown>> {
  return filterEcabDecisionsManifest(buildEcabDecisionsManifest(readEcabDecisionsSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectEcabDecisions()
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
