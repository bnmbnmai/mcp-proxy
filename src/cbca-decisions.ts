#!/usr/bin/env node
/**
 * Civilian Board of Contract Appeals (CBCA / GSA) decision TEXT door.
 * Indexes: https://www.cbca.gov/decisions/cda-cases.html
 *          https://www.cbca.gov/decisions/fema.html
 *          https://www.cbca.gov/decisions/relocation.html
 *          https://www.cbca.gov/decisions/travel.html
 * PDF:     https://www.cbca.gov/files/decisions/YYYY/….pdf
 * 17 U.S.C. § 105. Same extracted-body pipe as /oalj-decisions, /ecab-decisions, /fcc-eb-orders.
 * Harvest official decision, dismissal, and order PDFs only. The HTML index is not the sold body.
 * Not /oalj-decisions. Not /ecab-decisions. Not /ccb-determinations.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const CBCA_DECISIONS_PATH = "/cbca-decisions";
export const CBCA_DECISIONS_MANIFEST_PATH = "/cbca-decisions/manifest.json";
export const CBCA_DECISIONS_AMOUNT_ATOMIC = "50000";
export const CBCA_DECISIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "cbca-decision-bodies";
export const PRODUCT_NAME = "CBCA decision, dismissal, and order text";

export const CDA_LISTING_URL = "https://www.cbca.gov/decisions/cda-cases.html";
export const FEMA_LISTING_URL = "https://www.cbca.gov/decisions/fema.html";
export const RELO_LISTING_URL = "https://www.cbca.gov/decisions/relocation.html";
export const TRAVEL_LISTING_URL = "https://www.cbca.gov/decisions/travel.html";
export const PDF_HOST = "https://www.cbca.gov/files/decisions/";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Civilian Board of Contract Appeals, U.S. General Services Administration. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const SKU_KINDS = ["Decision", "Dismissal", "Order"] as const;
export type CbcaKind = (typeof SKU_KINDS)[number];
export const PROGRAMS = ["cda", "fema", "relocation", "travel"] as const;
export type CbcaProgram = (typeof PROGRAMS)[number];

export const GILCHRIST_ID = "cbca-8825-2026-09-23-decision";
export const ECG_ID = "cbca-8875-2026-09-21-dismissal";
export const CARE_ID = "cbca-8974-fema-2026-09-21-decision";
export const BAY_ID = "cbca-8350-fema-2026-08-12-order";

export const GILCHRIST_URL =
  "https://www.cbca.gov/files/decisions/2026/BEARDSLEY_09-23-26_8825__THE_GILCHRIST_LAW_FIRM_PA%20(DECISION).pdf";
export const ECG_URL =
  "https://www.cbca.gov/files/decisions/2026/KANG_09-21-26_8875__ECG_GSA_1_LLC%20(DISMISSAL).pdf";
export const CARE_URL =
  "https://www.cbca.gov/files/decisions/2026/SULLIVAN_09-21-26_8974-FEMA__CARE_PLUS_BERGEN%20(DECISION).pdf";
export const BAY_URL =
  "https://www.cbca.gov/files/decisions/2026/RUSSELL_08-12-26_8350-FEMA__BOARD_OF_TRUSTEES_OF_BAY_MEDICAL_CENTER%20(ORDER).pdf";

/** Opinion needles absent from the free index (docket / party / date / kind only). */
export const BODY_NEEDLE_GILCHRIST = "small claims procedure";
export const BODY_NEEDLE_ECG = "jointly moved to dismiss";
export const BODY_NEEDLE_CARE = "premium pay policy";
export const BODY_NEEDLE_BAY = "Christiana Cooley";

export const CARD_FIELDS = [
  "id",
  "docket",
  "caseNo",
  "program",
  "kind",
  "date",
  "judge",
  "institution",
  "title",
  "sourceUrl",
  "body",
] as const;

export type CbcaListing = {
  id: string;
  docket: string;
  caseNo: string;
  program: CbcaProgram;
  kind: CbcaKind;
  date: string | null;
  judge: string;
  title: string;
  institution: string;
  sourceUrl: string;
};

export type CbcaCard = CbcaListing & { body: string };

export type CbcaSnapshot = {
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
  sources: { cda: string; fema: string; relocation: string; travel: string; pdfHost: string };
  cards: CbcaCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (CBCA decisions; +https://www.cbca.gov/decisions/cda-cases.html)";

const MANIFEST_FIELDS = [
  "id",
  "docket",
  "caseNo",
  "program",
  "kind",
  "date",
  "judge",
  "institution",
  "title",
  "sourceUrl",
] as const;

const INDEX_BY_PROGRAM: Record<CbcaProgram, { url: string; file: string }> = {
  cda: { url: CDA_LISTING_URL, file: "cda.html" },
  fema: { url: FEMA_LISTING_URL, file: "fema.html" },
  relocation: { url: RELO_LISTING_URL, file: "relocation.html" },
  travel: { url: TRAVEL_LISTING_URL, file: "travel.html" },
};

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function cbcaDecisionsDir(): string {
  if (env("CBCA_DECISIONS_DIR")) return resolve(env("CBCA_DECISIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/cbca-decisions"));
}

export function snapshotPath(): string {
  return join(cbcaDecisionsDir(), "snapshot.json");
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
  const file = raw.match(/\b(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})\b/);
  if (file) {
    const year = file[3].length === 2 ? (Number(file[3]) >= 70 ? `19${file[3]}` : `20${file[3]}`) : file[3];
    return `${year}-${file[1].padStart(2, "0")}-${file[2].padStart(2, "0")}`;
  }
  return null;
}

export function normalizeDocket(raw: string | null | undefined): string {
  const hit = String(raw ?? "").match(/\bCBCA\s+(\d{3,5}(?:-[A-Z]+)?)\b/i);
  if (!hit) return "";
  return `CBCA ${hit[1].toUpperCase()}`;
}

export function programOf(docket: string, hint?: CbcaProgram): CbcaProgram {
  const d = docket.toUpperCase();
  if (d.includes("-FEMA")) return "fema";
  if (d.includes("-TRAV")) return "travel";
  if (d.includes("-RELO")) return "relocation";
  if (hint && PROGRAMS.includes(hint)) return hint;
  return "cda";
}

export function kindOf(typeCell: string, href: string): CbcaKind | null {
  const type = flattenText(typeCell);
  const file = decodeEntities(href);
  if (/^dismissal$/i.test(type) || /\(DISMISSAL\)/i.test(file) || /DISMISSAL\)?\.pdf/i.test(file)) return "Dismissal";
  if (/^order$/i.test(type) || /\(ORDER\)/i.test(file)) return "Order";
  if (/^decision$/i.test(type) || /\(DECISION\)/i.test(file) || /DECISION\)?\.pdf/i.test(file)) return "Decision";
  if (!type) return "Decision";
  return null;
}

export function decisionId(docket: string, date: string, kind: CbcaKind): string {
  const num = docket.replace(/^CBCA\s+/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `cbca-${num}-${date}-${kind.toLowerCase()}`;
}

function uniqueDecisionId(base: string, judge: string, seen: Set<string>): string {
  if (!seen.has(base)) return base;
  const judgeSlug = judge.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24);
  let next = judgeSlug ? `${base}-${judgeSlug}` : `${base}-2`;
  let n = 2;
  while (seen.has(next)) {
    next = `${base}-${judgeSlug || "slip"}-${n}`;
    n += 1;
  }
  return next;
}

export function officialCbcaPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = decodeEntities(urlOrPath).trim();
  if (!trimmed || /submissionguide|howto\//i.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed, "https://www.cbca.gov/decisions/cda-cases.html");
    const host = parsed.hostname.toLowerCase();
    if (host !== "www.cbca.gov" && host !== "cbca.gov") return null;
    if (!parsed.pathname.toLowerCase().includes("/files/decisions/")) return null;
    if (!parsed.pathname.toLowerCase().endsWith(".pdf")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
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

export function isRealCbcaBody(text: string): boolean {
  if (!text || isRawPdf(text)) return false;
  const flat = flattenText(text);
  if (flat.length < 400) return false;
  if (!/\bCBCA\s+\d{3,5}\b/i.test(flat) && !/CIVILIAN BOARD OF CONTRACT APPEALS/i.test(flat)) return false;
  if (!/DECISION|DISMISSAL|DISMISSED|ORDER|Board Judge/i.test(flat)) return false;
  if (/AppealsDecisions2026|SFTPRule4SubmissionGuide/i.test(flat) && !/Board Judge/i.test(flat)) return false;
  return true;
}

function sortKey(row: { date: string | null; docket: string; id: string }): string {
  return `${row.date ?? "0000-00-00"}-${row.docket}-${row.id}`;
}

export function keepListing(row: Pick<CbcaListing, "id" | "docket" | "kind" | "sourceUrl" | "program">): boolean {
  if (!SKU_KINDS.includes(row.kind)) return false;
  if (!officialCbcaPdfUrl(row.sourceUrl)) return false;
  if (!normalizeDocket(row.docket)) return false;
  if (!/^cbca-\d{3,5}/.test(row.id)) return false;
  if (!PROGRAMS.includes(row.program)) return false;
  return true;
}

function seed(
  id: string,
  docket: string,
  program: CbcaProgram,
  kind: CbcaKind,
  date: string,
  judge: string,
  institution: string,
  sourceUrl: string,
): CbcaListing {
  return {
    id,
    docket,
    caseNo: docket,
    program,
    kind,
    date,
    judge,
    institution,
    title: `${docket} ${kind}`,
    sourceUrl,
  };
}

export const SEED_LISTINGS: CbcaListing[] = [
  seed(GILCHRIST_ID, "CBCA 8825", "cda", "Decision", "2026-09-23", "Beardsley", "The Gilchrist Law Firm, P.A.", GILCHRIST_URL),
  seed(ECG_ID, "CBCA 8875", "cda", "Dismissal", "2026-09-21", "Kang", "ECG GSA 1, LLC", ECG_URL),
  seed(CARE_ID, "CBCA 8974-FEMA", "fema", "Decision", "2026-09-21", "Sullivan", "Care Plus Bergen", CARE_URL),
  seed(BAY_ID, "CBCA 8350-FEMA", "fema", "Order", "2026-08-12", "Russell", "Board of Trustees of Bay Medical Center", BAY_URL),
];

function cellsOf(rowHtml: string): string[] {
  return [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1] ?? "");
}

function listingFromRow(rowHtml: string, hint?: CbcaProgram): CbcaListing | null {
  if (/<th\b/i.test(rowHtml)) return null;
  const href = [...rowHtml.matchAll(/href="([^"]+)"/gi)]
    .map((m) => decodeEntities(m[1] ?? ""))
    .find((link) => officialCbcaPdfUrl(link));
  const sourceUrl = officialCbcaPdfUrl(href);
  if (!sourceUrl) return null;
  const cells = cellsOf(rowHtml);
  const text = stripTags(rowHtml);
  const docket = normalizeDocket(cells.map(stripTags).join(" ")) || normalizeDocket(text) || normalizeDocket(sourceUrl);
  if (!docket) return null;
  const date = isoDate(stripTags(cells[0] ?? "")) || isoDate(sourceUrl) || isoDate(text);
  if (!date) return null;
  const typeCell = cells.length >= 5 ? stripTags(cells[4] ?? "") : "";
  const kind = kindOf(typeCell, sourceUrl);
  if (!kind) return null;
  const party = flattenText(stripTags(cells[2] ?? "")) || flattenText(stripTags(rowHtml.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? ""));
  const judge = flattenText(stripTags(cells[3] ?? ""));
  const program = programOf(docket, hint);
  const id = decisionId(docket, date, kind);
  const listing: CbcaListing = {
    id,
    docket,
    caseNo: docket,
    program,
    kind,
    date,
    judge,
    institution: party || docket,
    title: `${docket} ${kind}`,
    sourceUrl,
  };
  return keepListing(listing) ? listing : null;
}

export function parseCbcaIndex(raw: string, hint?: CbcaProgram): CbcaListing[] {
  const out: CbcaListing[] = [];
  const seen = new Set<string>();
  for (const row of raw.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const listing = listingFromRow(row[1] ?? "", hint);
    if (!listing || seen.has(listing.sourceUrl)) continue;
    listing.id = uniqueDecisionId(listing.id, listing.judge, seen);
    seen.add(listing.id);
    seen.add(listing.sourceUrl);
    out.push(listing);
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

export function parseCbcaDecisionText(text: string, meta: Partial<CbcaListing> & { sourceUrl: string }): CbcaCard {
  const body = normalizePdfText(text);
  const flat = flattenText(body);
  const sourceUrl = officialCbcaPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(flat) || "";
  const date = meta.date ?? isoDate(flat);
  const kind = (meta.kind && SKU_KINDS.includes(meta.kind) ? meta.kind : null) || kindOf("", sourceUrl) || "Decision";
  const program = programOf(docket, meta.program);
  const id = meta.id || (docket && date ? decisionId(docket, date, kind) : "");
  const institution = flattenText(meta.institution || "") || docket;
  return {
    id,
    docket,
    caseNo: docket,
    program,
    kind,
    date,
    judge: flattenText(meta.judge || ""),
    institution,
    title: meta.title || (docket ? `${docket} ${kind}` : id),
    sourceUrl,
    body,
  };
}

function emptySources(): CbcaSnapshot["sources"] {
  return {
    cda: CDA_LISTING_URL,
    fema: FEMA_LISTING_URL,
    relocation: RELO_LISTING_URL,
    travel: TRAVEL_LISTING_URL,
    pdfHost: PDF_HOST,
  };
}

export function emptyCbcaSnapshot(reason: string): CbcaSnapshot {
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

export function assembleCbcaSnapshot(cards: CbcaCard[], fetchedAt?: string): CbcaSnapshot {
  const kept = cards.filter((card) => isRealCbcaBody(card.body) && keepListing(card));
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
    reason: kept.length ? null : "Official CBCA decision PDFs had no extractable decision text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): CbcaSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as CbcaSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  const assembled = assembleCbcaSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
  if (typeof snap.listedCount === "number") assembled.listedCount = snap.listedCount;
  return assembled;
}

export function readCbcaSnapshot(): CbcaSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeCbcaSnapshot(snap: CbcaSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

async function fetchOnce(url: string, accept: string): Promise<{ ok: boolean; status: number; text?: string; bytes?: Uint8Array }> {
  const res = await fetch(url, { headers: { "User-Agent": HTTP_UA, Accept: accept } });
  const bytes = new Uint8Array(await res.arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  return { ok: res.ok, status: res.status, text, bytes };
}

export async function fetchCbcaText(url: string): Promise<string> {
  const direct = await fetchOnce(url, "text/html,application/xhtml+xml");
  if (!direct.ok || !direct.text) throw new Error(`${url} HTTP ${direct.status}`);
  return direct.text;
}

export async function fetchCbcaPdf(url: string, pdfFile: string): Promise<string> {
  const official = officialCbcaPdfUrl(url) || url;
  const direct = await fetchOnce(official, "application/pdf,application/octet-stream,*/*");
  const head = new TextDecoder().decode((direct.bytes ?? new Uint8Array()).slice(0, 5));
  if (!direct.ok || head !== "%PDF-" || !direct.bytes) {
    throw new Error(`${official} HTTP ${direct.status || "not a pdf"}`);
  }
  writeFileSync(pdfFile, direct.bytes);
  return pdfToText(pdfFile);
}

export function pdfToText(pdfPath: string): string {
  const helper = env("CBCA_DECISIONS_PDFTOTEXT") || "pdftotext";
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
  return env("CBCA_DECISIONS_HTML_DIR") || env("CBCA_DECISIONS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("CBCA_DECISIONS_LIMIT", "6"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
}

function maxFetchLimit(): number {
  const n = Number(env("CBCA_DECISIONS_MAX_FETCH", "6"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
}

function enabledPrograms(): CbcaProgram[] {
  const raw = env("CBCA_DECISIONS_PROGRAMS", "cda,fema,relocation,travel");
  const wanted = raw.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
  const programs = PROGRAMS.filter((p) => wanted.includes(p));
  return programs.length ? programs : ["cda", "fema"];
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: CbcaListing[]): CbcaListing[] {
  const seen = new Set<string>();
  const out: CbcaListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepListing(row) || !row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

export async function walkOfficialCbca(): Promise<{ listed: CbcaListing[]; listedCount: number }> {
  const listed: CbcaListing[] = [];
  const seen = new Set<string>();
  for (const program of enabledPrograms()) {
    const rows = parseCbcaIndex(await fetchCbcaText(INDEX_BY_PROGRAM[program].url), program);
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      listed.push(row);
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(listed.length, merged.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: CbcaListing[]; listedCount: number }> {
  if (dir) {
    const chunks: CbcaListing[] = [];
    const combined = readNamedFile(dir, ["listing.html", "listing.txt", "index.html"]);
    if (combined) chunks.push(...parseCbcaIndex(combined));
    for (const program of enabledPrograms()) {
      const raw = readNamedFile(dir, [INDEX_BY_PROGRAM[program].file]);
      if (raw) chunks.push(...parseCbcaIndex(raw, program));
    }
    const merged = mergeListings(chunks);
    return { listed: merged, listedCount: Math.max(chunks.length, merged.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialCbca();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: mergeListings([]), listedCount: SEED_LISTINGS.length };
}

export async function collectCbcaDecisions(opts?: {
  listingDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<CbcaSnapshot> {
  const dir = opts?.listingDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = cbcaDecisionsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, CbcaCard>();
  for (const card of readCbcaSnapshot()?.cards ?? []) {
    if (isRealCbcaBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const seedIds = new Set(SEED_LISTINGS.map((row) => row.id));
  const cards: CbcaCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    const pinned = seedIds.has(row.id);
    if (target > 0 && addedThisRun >= target && !prior.has(row.id) && !pinned) continue;
    if (!keepListing(row)) {
      skippedNoText += 1;
      continue;
    }
    const cached = prior.get(row.id);
    if (cached) {
      cards.push({ ...cached, ...row, body: cached.body });
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (target > 0 && addedThisRun >= target && !pinned) continue;
    if (fetchCap > 0 && fetchedPdfs >= fetchCap && !pinned) continue;
    try {
      const localText = readNamedFile(dir, [`${row.id}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialCbcaPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (existsSync(pdfFile)) return pdfToText(pdfFile);
          fetchedPdfs += 1;
          return fetchCbcaPdf(sourceUrl, pdfFile);
        })());
      if (!isRealCbcaBody(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseCbcaDecisionText(text, { ...row, sourceUrl });
      if (!isRealCbcaBody(parsed.body) || !keepListing(parsed)) {
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
    ...assembleCbcaSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeCbcaSnapshot(snap);
  return snap;
}

export async function loadCbcaDecisions(): Promise<CbcaSnapshot> {
  const cached = readCbcaSnapshot();
  if (cached && cached.cards.some((card) => isRealCbcaBody(card.body))) return cached;
  try {
    return await collectCbcaDecisions();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live CBCA decision fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyCbcaSnapshot(
      `CBCA decision PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildCbcaManifest(snap: CbcaSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((card) => isRealCbcaBody(card.body) && keepListing(card));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      CBCA_DECISIONS_PATH,
      "Count plus docket, program, kind, date, judge, institution, and the official PDF sourceUrl. Decision text is the paid GET /cbca-decisions payload. This free manifest lists the cached decision, dismissal, and order slips. asOf is the newest decision date in the cache. The HTML indexes are not this SKU. Not /oalj-decisions. Not /ecab-decisions. Not /ccb-determinations.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: CBCA_DECISIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: CBCA_DECISIONS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    listedCount: snap?.listedCount ?? cards.length,
    cards: cards.map((card) => ({
      id: card.id,
      docket: card.docket,
      caseNo: card.caseNo,
      program: card.program,
      kind: card.kind,
      date: card.date,
      judge: card.judge,
      institution: card.institution,
      title: card.title,
      sourceUrl: card.sourceUrl,
    })),
    schema: { fields: [...MANIFEST_FIELDS] },
    sources: {
      cda: snap?.sources?.cda ?? CDA_LISTING_URL,
      fema: snap?.sources?.fema ?? FEMA_LISTING_URL,
      relocation: snap?.sources?.relocation ?? RELO_LISTING_URL,
      travel: snap?.sources?.travel ?? TRAVEL_LISTING_URL,
    },
  };
}

export function filterCbcaManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "docket", "caseNo", "program", "kind", "date", "judge", "institution", "title"].some((key) =>
      String(row[key] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadCbcaManifest(q?: string): Promise<Record<string, unknown>> {
  return filterCbcaManifest(buildCbcaManifest(readCbcaSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectCbcaDecisions()
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
              program: card.program,
              kind: card.kind,
              date: card.date,
              judge: card.judge,
              institution: card.institution,
              title: card.title,
              sourceUrl: card.sourceUrl,
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
