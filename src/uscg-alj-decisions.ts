#!/usr/bin/env node
/**
 * USCG ALJ Suspension & Revocation Decisions and Orders TEXT door.
 * Index: https://www.uscg.mil/Resources/Administrative-Law-Judges/Decisions/ALJ-Decisions-2026/
 * PDF:   uscg.mil /Portals/0/Headquarters/Administrative Law Judges/Decisions and Orders/YYYY/YYYY-NNNN.pdf
 * Docket form: YYYY-NNNN. 17 U.S.C. § 105.
 * Same extracted-body pipe as /ccb-determinations, /ibla-decisions, /ttab-decisions, /oalj-decisions, /oshrc-orders.
 * Harvest dispositive Default Order / Consent Order / Decision and Order PDFs only.
 * Complaints, service packets, NTSB, and Commandant CDOA appeals are not this SKU.
 * Not /mariners. Not /oalj-decisions. Not /oshrc-orders.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const USCG_ALJ_DECISIONS_PATH = "/uscg-alj-decisions";
export const USCG_ALJ_DECISIONS_MANIFEST_PATH = "/uscg-alj-decisions/manifest.json";
export const USCG_ALJ_DECISIONS_AMOUNT_ATOMIC = "50000";
export const USCG_ALJ_DECISIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "uscg-alj-decision-bodies";
export const PRODUCT_NAME = "USCG ALJ Suspension and Revocation Decisions and Orders text";

export const LISTING_URL =
  "https://www.uscg.mil/Resources/Administrative-Law-Judges/Decisions/ALJ-Decisions-2026/";
export const PDF_HOST =
  "https://www.uscg.mil/Portals/0/Headquarters/Administrative Law Judges/Decisions and Orders/";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "United States Coast Guard, Office of the Chief Administrative Law Judge. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const DOCKET_RE = /\b(\d{4}-\d{4})\b/;
export const SKU_KINDS = ["Default Order", "Consent Order", "Decision and Order"] as const;
export type UscgKind = (typeof SKU_KINDS)[number];

export const TREVINO_ID = "2026-0155";
export const WOOTEN_ID = "2026-0152";
export const SINGLETON_ID = "2026-0157";

export const TREVINO_URL =
  "https://www.uscg.mil/Portals/0/Headquarters/Administrative%20Law%20Judges/Decisions%20and%20Orders/2026/2026-0155.pdf";
export const WOOTEN_URL =
  "https://www.uscg.mil/Portals/0/Headquarters/Administrative%20Law%20Judges/Decisions%20and%20Orders/2026/2026-0152.pdf";
export const SINGLETON_URL =
  "https://www.uscg.mil/Portals/0/Headquarters/Administrative%20Law%20Judges/Decisions%20and%20Orders/2026/2026-0157.pdf";

export const BODY_NEEDLE_TREVINO = "TAMRYN TREVINO";
/** Opinion needle absent from the free index (docket / date / disposition only). */
export const BODY_NEEDLE_TREVINO_EA = "8332918";
export const BODY_NEEDLE_WOOTEN = "ANTONIO WOOTEN";
export const BODY_NEEDLE_WOOTEN_EA = "8332444";
export const BODY_NEEDLE_SINGLETON = "XAVIER SINGLETON";
export const BODY_NEEDLE_SINGLETON_EA = "8357522";

export const CARD_FIELDS = [
  "id",
  "docket",
  "kind",
  "findings",
  "allegations",
  "date",
  "title",
  "respondent",
  "institution",
  "sourceUrl",
  "body",
] as const;

export type UscgListing = {
  id: string;
  docket: string;
  kind: UscgKind;
  findings: string;
  allegations: string;
  date: string | null;
  title: string;
  sourceUrl: string;
};

export type UscgCard = UscgListing & { respondent: string; institution: string; body: string };

export type UscgSnapshot = {
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
  cards: UscgCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (USCG ALJ Decisions and Orders; +https://www.uscg.mil/Resources/Administrative-Law-Judges/Decisions/)";
const JINA_PREFIX = "https://r.jina.ai/";

const MANIFEST_FIELDS = ["id", "docket", "kind", "findings", "allegations", "date", "title"] as const;

const ORDER_TYPE_RE = /(Decision and Order|Default Order|Consent Order|Admission Order|Withdrawal)\s*$/i;
const FINDING_RE = /(Voluntary Surrender|Revoked|Settled|Suspended|Withdrawn|Pending)\s*$/i;

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function uscgAljDecisionsDir(): string {
  if (env("USCG_ALJ_DECISIONS_DIR")) return resolve(env("USCG_ALJ_DECISIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/uscg-alj-decisions"));
}

export function snapshotPath(): string {
  return join(uscgAljDecisionsDir(), "snapshot.json");
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

export function normalizeDocket(raw: string | null | undefined): string {
  const hit = String(raw ?? "").match(DOCKET_RE);
  return hit ? hit[1] : "";
}

export function decisionId(docket: string): string {
  return docket;
}

export function skuKind(raw: string | null | undefined): UscgKind | null {
  const t = flattenText(raw ?? "");
  if (/^default order$/i.test(t)) return "Default Order";
  if (/^consent order$/i.test(t)) return "Consent Order";
  if (/^decision and order$/i.test(t)) return "Decision and Order";
  return null;
}

export function officialUscgPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = decodeEntities(urlOrPath).trim();
  try {
    const parsed = new URL(trimmed, "https://www.uscg.mil/");
    const host = parsed.hostname.toLowerCase();
    if (host !== "www.uscg.mil" && host !== "uscg.mil") return null;
    if (!/\/(\d{4}-\d{4})\.pdf$/i.test(parsed.pathname)) return null;
    if (/cdoa|commandant|ntsb|complaint|service/i.test(parsed.pathname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizePdfText(raw: string): string {
  let text = raw.replace(/\u0000/g, "").replace(/\f/g, "\n").replace(/\u00a0/g, " ");
  const md = text.split(/Markdown Content:\s*/i);
  if (md.length > 1) text = md.slice(1).join("Markdown Content:");
  text = text.replace(/^Title:[\s\S]*?URL Source:[^\n]*\n+/i, "");
  text = text.replace(/([A-Za-z])-\n([a-z])/g, "$1$2");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export function isRawPdf(text: string): boolean {
  return text.trimStart().startsWith("%PDF-");
}

export function isAccessDenied(text: string): boolean {
  const head = text.slice(0, 800);
  return /Access Denied/i.test(head) && /Akamai|don't have permission/i.test(head);
}

export function isRealUscgAljBody(text: string): boolean {
  if (!text || isRawPdf(text) || isAccessDenied(text)) return false;
  const flat = flattenText(text);
  if (flat.length < 400) return false;
  if (!/UNITED STATES COAST GUARD/i.test(flat)) return false;
  if (!DOCKET_RE.test(flat)) return false;
  if (!/DEFAULT ORDER|CONSENT ORDER|DECISION AND ORDER/i.test(flat)) return false;
  return true;
}

function sortKey(row: { date: string | null; docket: string; id: string }): string {
  return `${row.date ?? "0000-00-00"}-${row.docket}-${row.id}`;
}

export function keepListing(row: Pick<UscgListing, "id" | "docket" | "kind" | "sourceUrl">): boolean {
  if (!skuKind(row.kind)) return false;
  if (!officialUscgPdfUrl(row.sourceUrl)) return false;
  if (!normalizeDocket(row.docket)) return false;
  if (!/^\d{4}-\d{4}$/.test(row.id)) return false;
  return true;
}

function seed(
  id: string,
  date: string,
  kind: UscgKind,
  findings: string,
  allegations: string,
  sourceUrl: string,
): UscgListing {
  return {
    id,
    docket: id,
    kind,
    findings,
    allegations,
    date,
    title: `${id} ${kind}`,
    sourceUrl,
  };
}

export const SEED_LISTINGS: UscgListing[] = [
  seed(
    TREVINO_ID,
    "2026-07-09",
    "Default Order",
    "Revoked",
    "Use of, or addiction to the use of dangerous drugs",
    TREVINO_URL,
  ),
  seed(
    WOOTEN_ID,
    "2026-07-01",
    "Default Order",
    "Revoked",
    "Use of, or addiction to the use of dangerous drugs",
    WOOTEN_URL,
  ),
  seed(
    SINGLETON_ID,
    "2026-06-01",
    "Consent Order",
    "Settled",
    "Use of, or addiction to the use of dangerous drugs",
    SINGLETON_URL,
  ),
];

function listingFromParts(
  docketRaw: string,
  href: string,
  dateRaw: string | null,
  tail: string,
): UscgListing | null {
  const sourceUrl = officialUscgPdfUrl(href);
  const docket = normalizeDocket(docketRaw) || normalizeDocket(sourceUrl);
  if (!sourceUrl || !docket) return null;
  let rest = flattenText(tail);
  const typeHit = rest.match(ORDER_TYPE_RE);
  const kind = skuKind(typeHit?.[1] ?? "");
  if (!kind || !typeHit) return null;
  rest = flattenText(rest.slice(0, typeHit.index));
  const findingHit = rest.match(FINDING_RE);
  const findings = findingHit ? flattenText(findingHit[1]) : "";
  if (findingHit) rest = flattenText(rest.slice(0, findingHit.index));
  const allegations = rest;
  if (/cdoa|commandant appeal|ntsb/i.test(`${allegations} ${kind}`)) return null;
  const date = isoDate(dateRaw) || isoDate(tail);
  const listing: UscgListing = {
    id: decisionId(docket),
    docket,
    kind,
    findings,
    allegations,
    date,
    title: `${docket} ${kind}`,
    sourceUrl,
  };
  return keepListing(listing) ? listing : null;
}

export function parseUscgIndex(raw: string): UscgListing[] {
  const out: UscgListing[] = [];
  const seen = new Set<string>();
  const push = (row: UscgListing | null) => {
    if (!row || seen.has(row.id)) return;
    seen.add(row.id);
    out.push(row);
  };

  for (const line of raw.split(/\r?\n/)) {
    const md = line.match(/\[(\d{4}-\d{4})(?:\.pdf)?\]\(([^)]+)\)\s*(.*)$/i);
    if (!md) continue;
    const rest = md[3] ?? "";
    const dated = rest.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s*(.*)$/);
    push(listingFromParts(md[1], md[2], dated?.[1] ?? null, dated?.[2] ?? rest));
  }

  for (const row of raw.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const html = row[1] ?? "";
    if (/<th\b/i.test(html)) continue;
    const href = [...html.matchAll(/href="([^"]+)"/gi)]
      .map((m) => decodeEntities(m[1] ?? ""))
      .find((link) => officialUscgPdfUrl(link));
    if (!href) continue;
    const text = stripTags(html);
    const docket = normalizeDocket(text);
    const dated = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
    const tail = dated ? text.slice((dated.index ?? 0) + dated[1].length) : text;
    push(listingFromParts(docket, href, dated?.[1] ?? null, tail));
  }

  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

export function respondentFromBody(text: string): string {
  const flat = flattenText(text);
  const vs = flat.match(/\bv(?:s)?\.?\s+([A-Z][A-Za-z .'-]{2,80}?)\s*,?\s*>?\s*Respondent\b/);
  if (vs) return flattenText(vs[1]).replace(/\s+,/g, "");
  return "";
}

export function parseUscgOrderText(text: string, meta: Partial<UscgListing> & { sourceUrl: string }): UscgCard {
  const body = normalizePdfText(text);
  const flat = flattenText(body);
  const sourceUrl = officialUscgPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(flat) || "";
  const id = meta.id || (docket ? decisionId(docket) : "");
  const issued =
    isoDate(
      flat.match(
        /\b(?:Issued:\s*)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i,
      )?.[0],
    ) || isoDate(meta.date);
  const kind = skuKind(meta.kind) || ( /DEFAULT ORDER/i.test(flat) ? "Default Order" : /CONSENT ORDER/i.test(flat) ? "Consent Order" : "Decision and Order");
  const respondent = respondentFromBody(body);
  return {
    id,
    docket,
    kind,
    findings: flattenText(meta.findings || ""),
    allegations: flattenText(meta.allegations || ""),
    date: meta.date ?? issued,
    title: meta.title || `${docket} ${kind}`,
    sourceUrl,
    respondent,
    institution: respondent || docket,
    body,
  };
}

function emptySources(): UscgSnapshot["sources"] {
  return { listing: LISTING_URL, pdfHost: PDF_HOST };
}

export function emptyUscgSnapshot(reason: string): UscgSnapshot {
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

export function assembleUscgSnapshot(cards: UscgCard[], fetchedAt?: string): UscgSnapshot {
  const kept = cards.filter((card) => isRealUscgAljBody(card.body) && keepListing(card));
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
    reason: kept.length ? null : "Official USCG ALJ Decision and Order PDFs had no extractable order text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): UscgSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as UscgSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  const assembled = assembleUscgSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
  if (typeof snap.listedCount === "number") assembled.listedCount = snap.listedCount;
  return assembled;
}

export function readUscgSnapshot(): UscgSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeUscgSnapshot(snap: UscgSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function fetchOnce(url: string, accept: string): Promise<{ ok: boolean; status: number; text?: string; bytes?: Uint8Array }> {
  const res = await fetch(url, { headers: { "User-Agent": HTTP_UA, Accept: accept } });
  const bytes = new Uint8Array(await res.arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  return { ok: res.ok, status: res.status, text, bytes };
}

export async function fetchUscgText(url: string): Promise<string> {
  try {
    const direct = await fetchOnce(url, "text/html,application/xhtml+xml");
    if (direct.ok && direct.text && !isAccessDenied(direct.text) && !/AkamaiGHost/i.test(direct.text.slice(0, 400))) {
      return direct.text;
    }
  } catch {
    /* Akamai or network; reader fallback below */
  }
  const via = await fetchOnce(`${JINA_PREFIX}${url}`, "text/plain");
  if (!via.ok || !via.text) throw new Error(`${url} HTTP ${via.status}`);
  return via.text;
}

export async function fetchUscgOrderText(url: string, pdfFile: string): Promise<string> {
  const official = officialUscgPdfUrl(url) || url;
  try {
    const direct = await fetchOnce(official, "application/pdf,application/octet-stream,*/*");
    const head = new TextDecoder().decode((direct.bytes ?? new Uint8Array()).slice(0, 5));
    if (direct.ok && head === "%PDF-" && direct.bytes) {
      writeFileSync(pdfFile, direct.bytes);
      return pdfToText(pdfFile);
    }
  } catch {
    /* fall through to extracted-text reader */
  }
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const via = await fetchOnce(`${JINA_PREFIX}${official}`, "text/plain");
    lastStatus = via.status;
    if (via.status === 429) {
      await sleep(4000);
      continue;
    }
    if (!via.ok || !via.text) break;
    return normalizePdfText(via.text);
  }
  throw new Error(`${official} HTTP ${lastStatus || "fetch failed"}`);
}

export function pdfToText(pdfPath: string): string {
  const helper = env("USCG_ALJ_DECISIONS_PDFTOTEXT") || "pdftotext";
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
  return env("USCG_ALJ_DECISIONS_HTML_DIR") || env("USCG_ALJ_DECISIONS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("USCG_ALJ_DECISIONS_LIMIT", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxFetchLimit(): number {
  const n = Number(env("USCG_ALJ_DECISIONS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: UscgListing[]): UscgListing[] {
  const seen = new Set<string>();
  const out: UscgListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepListing(row) || !row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

function yearIndexUrls(): string[] {
  const raw = env("USCG_ALJ_YEARS", "2026");
  const years = raw.split(",").map((y) => y.trim()).filter((y) => /^\d{4}$/.test(y));
  const urls = years.map((year) => {
    if (year === "2026") return LISTING_URL;
    return `https://www.uscg.mil/Resources/Administrative-Law-Judges/Decisions/ALJ-Decisions-${year}/`;
  });
  return urls.length ? urls : [LISTING_URL];
}

export async function walkOfficialUscg(): Promise<{ listed: UscgListing[]; listedCount: number }> {
  const listed: UscgListing[] = [];
  const seen = new Set<string>();
  for (const url of yearIndexUrls()) {
    const rows = parseUscgIndex(await fetchUscgText(url));
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      listed.push(row);
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(listed.length, merged.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: UscgListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing.txt", "listing.html", "index.html"]);
    const parsed = raw ? parseUscgIndex(raw) : [];
    const merged = mergeListings(parsed);
    return { listed: merged, listedCount: Math.max(parsed.length, merged.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialUscg();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: mergeListings([]), listedCount: SEED_LISTINGS.length };
}

export async function collectUscgAljDecisions(opts?: {
  listingDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<UscgSnapshot> {
  const dir = opts?.listingDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = uscgAljDecisionsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, UscgCard>();
  for (const card of readUscgSnapshot()?.cards ?? []) {
    if (isRealUscgAljBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const seedIds = new Set(SEED_LISTINGS.map((row) => row.id));
  const cards: UscgCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    const pinned = seedIds.has(row.id);
    if (target > 0 && addedThisRun >= target && !prior.has(row.id) && !pinned) break;
    if (!keepListing(row)) {
      skippedNoText += 1;
      continue;
    }
    const cached = prior.get(row.id);
    if (cached) {
      cards.push({ ...cached, ...row, body: cached.body, respondent: cached.respondent, institution: cached.institution });
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (target > 0 && addedThisRun >= target && !pinned) break;
    if (fetchCap > 0 && fetchedPdfs >= fetchCap && !pinned) break;
    try {
      const localText = readNamedFile(dir, [`${row.id}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialUscgPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (existsSync(pdfFile)) return pdfToText(pdfFile);
          fetchedPdfs += 1;
          return fetchUscgOrderText(sourceUrl, pdfFile);
        })());
      if (!isRealUscgAljBody(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseUscgOrderText(text, { ...row, sourceUrl });
      if (!isRealUscgAljBody(parsed.body) || !keepListing(parsed)) {
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
    ...assembleUscgSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeUscgSnapshot(snap);
  return snap;
}

export async function loadUscgAljDecisions(): Promise<UscgSnapshot> {
  const cached = readUscgSnapshot();
  if (cached && cached.cards.some((card) => isRealUscgAljBody(card.body))) return cached;
  try {
    return await collectUscgAljDecisions();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live USCG ALJ fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyUscgSnapshot(
      `USCG ALJ Decision and Order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildUscgManifest(snap: UscgSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((card) => isRealUscgAljBody(card.body) && keepListing(card));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      USCG_ALJ_DECISIONS_PATH,
      "Count plus docket, date, and disposition label. Order text is the paid GET /uscg-alj-decisions payload. This free manifest lists the cached Default Orders, Consent Orders, and Decisions and Orders. asOf is the newest order date in the cache. Official PDFs are on the USCG ALJ year index. Complaints, service packets, NTSB, and Commandant CDOA appeals are not this SKU. Not /mariners. Not /oalj-decisions. Not /oshrc-orders.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: USCG_ALJ_DECISIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: USCG_ALJ_DECISIONS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    listedCount: snap?.listedCount ?? cards.length,
    cards: cards.map((card) => ({
      id: card.id,
      docket: card.docket,
      kind: card.kind,
      findings: card.findings,
      allegations: card.allegations,
      date: card.date,
      title: card.title,
    })),
    schema: { fields: [...MANIFEST_FIELDS] },
    sources: { listing: LISTING_URL },
  };
}

export function filterUscgManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    return JSON.stringify(raw).toLowerCase().includes(needle);
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadUscgManifest(q?: string): Promise<Record<string, unknown>> {
  return filterUscgManifest(buildUscgManifest(readUscgSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectUscgAljDecisions()
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
              kind: card.kind,
              findings: card.findings,
              date: card.date,
              title: card.title,
              respondent: card.respondent,
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
