#!/usr/bin/env node
/**
 * USPTO Trademark Trial and Appeal Board reading-room decision TEXT door.
 * List: POST https://ttab-reading-room.uspto.gov/ttab-efoia-api/decision/search
 * PDF:  GET  https://ttab-reading-room.uspto.gov/cms/rest{documentId}
 * 17 U.S.C. § 105. Same extracted-body pipe as /nlrb-decisions, /flra-decisions,
 * /ecab-decisions, and /eeoc-appellate.
 * Sell reading-room decision PDFs only. TTABVUE docket events, ODP proceeding
 * XML, and PTAB Open Data Portal JSON are not this SKU.
 * Party names stay on the public case caption. This door does not build a people export.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const TTAB_DECISIONS_PATH = "/ttab-decisions";
export const TTAB_DECISIONS_MANIFEST_PATH = "/ttab-decisions/manifest.json";
export const TTAB_DECISIONS_AMOUNT_ATOMIC = "50000";
export const TTAB_DECISIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "ttab-decision-bodies";
export const PRODUCT_NAME = "USPTO TTAB reading-room decision text";

export const SEARCH_URL = "https://ttab-reading-room.uspto.gov/ttab-efoia-api/decision/search";
export const PDF_BASE = "https://ttab-reading-room.uspto.gov/cms/rest";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "United States Patent and Trademark Office, Trademark Trial and Appeal Board. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const DECISION_DOC_RE = /^\/legal-proceeding\/(\d+)\/decision\/([A-Za-z0-9][A-Za-z0-9_.-]*)\.pdf$/;

export const CAN_92081421_ID = "92081421-can-45";
export const OPP_91272167_ID = "91272167-opp-88";
export const EXA_97811850_ID = "97811850-exa-28";
export const EXA_98651023_ID = "98651023-exa-10";

export const CAN_92081421_DOC = "/legal-proceeding/92081421/decision/CAN_45.pdf";
export const OPP_91272167_DOC = "/legal-proceeding/91272167/decision/OPP_88.pdf";
export const EXA_97811850_DOC = "/legal-proceeding/97811850/decision/EXA_28.pdf";
export const EXA_98651023_DOC = "/legal-proceeding/98651023/decision/EXA_10.pdf";

export const BODY_NEEDLE_DERMALIZE = "Failure to timely argue";
export const BODY_NEEDLE_BIRTH = "law firm and its former associate";
export const BODY_NEEDLE_RIVERS = "Rivers IP Holdings";
export const BODY_NEEDLE_MAP = "MAP Elite";

export const CARD_FIELDS = [
  "id",
  "proceedingNumber",
  "proceedingType",
  "parties",
  "mark",
  "outcome",
  "precedential",
  "grounds",
  "issue",
  "kind",
  "date",
  "title",
  "documentId",
  "sourceUrl",
  "body",
] as const;

const PROCEEDING_TYPE: Record<string, string> = {
  CAN: "Cancellation",
  OPP: "Opposition",
  EXA: "Ex parte",
};

const MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

export type TtabListing = {
  id: string;
  proceedingNumber: string;
  proceedingType: string;
  proceedingTypeCode: string;
  parties: string;
  mark: string;
  applicantMark: string;
  opposerMark: string;
  outcome: string;
  precedential: boolean;
  grounds: string[];
  groundDetails: string[];
  issue: string;
  kind: string;
  panel: string;
  date: string | null;
  documentId: string;
  title: string;
  sourceUrl: string;
};

export type TtabCard = TtabListing & { institution: string; body: string };

export type TtabSnapshot = {
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
  cards: TtabCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (TTAB reading-room decisions; +https://ttab-reading-room.uspto.gov/efoia/efoia-ui/)";

const MANIFEST_FIELDS = [
  "id",
  "proceedingNumber",
  "proceedingType",
  "parties",
  "mark",
  "outcome",
  "precedential",
  "grounds",
  "issue",
  "kind",
  "date",
  "title",
  "panel",
] as const;

function seed(
  id: string,
  proceedingNumber: string,
  code: string,
  parties: string,
  applicantMark: string,
  opposerMark: string,
  outcome: string,
  precedential: boolean,
  grounds: string[],
  issue: string,
  kind: string,
  date: string,
  documentId: string,
  panel: string,
): TtabListing {
  const proceedingType = PROCEEDING_TYPE[code] || code;
  const mark = joinMarks(applicantMark, opposerMark);
  return {
    id,
    proceedingNumber,
    proceedingType,
    proceedingTypeCode: code,
    parties,
    mark,
    applicantMark,
    opposerMark,
    outcome,
    precedential,
    grounds,
    groundDetails: [],
    issue,
    kind,
    panel,
    date,
    documentId,
    title: decisionTitle(proceedingType, proceedingNumber, applicantMark || opposerMark),
    sourceUrl: officialTtabPdfUrl(documentId) || "",
  };
}

export const SEED_LISTINGS: TtabListing[] = [
  seed(
    CAN_92081421_ID,
    "92081421",
    "CAN",
    "D-Lize srl v. Genex Enterprises LLC and Saniderm Medical, LLC (joined as party defendant)",
    "DERMALIZE",
    "DERMALIZE",
    "Petition to Cancel Denied (failure to adequately plead or prove entitlement to a statutory cause of action)",
    false,
    [],
    "14(3) (abandon-ment)",
    "Final Decision",
    "2026-09-11",
    CAN_92081421_DOC,
    "THURMON; CASAGRANDE; BRADLEY",
  ),
  seed(
    EXA_97811850_ID,
    "97811850",
    "EXA",
    "Rivers IP Holdings, LLC",
    "",
    "",
    "Refusal Affirmed",
    false,
    ["Likelihood of Confusion"],
    "2(d)",
    "Final Decision",
    "2026-09-11",
    EXA_97811850_DOC,
    "",
  ),
  seed(
    EXA_98651023_ID,
    "98651023",
    "EXA",
    "MAP Elite & MAP Prospects LLC DBA Advanced Player Experience LLC",
    "",
    "",
    "Refusal Affirmed",
    false,
    ["Likelihood of Confusion"],
    "2(d)",
    "Final Decision",
    "2026-09-11",
    EXA_98651023_DOC,
    "",
  ),
  seed(
    OPP_91272167_ID,
    "91272167",
    "OPP",
    "Olsman, MacKenzie, Peacock & Wallace, P.C. v. Emily Grace Thomas",
    "BIRTH JUSTICE",
    "",
    "Opposition Sustained (based on non-ownership)",
    true,
    ["Ownership"],
    "2(d); non-ownership",
    "Final Decision",
    "2026-09-10",
    OPP_91272167_DOC,
    "ENGLISH; STANLEY; LAVACHE",
  ),
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ttabDecisionsDir(): string {
  if (env("TTAB_DECISIONS_DIR")) return resolve(env("TTAB_DECISIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ttab-decisions"));
}

export function snapshotPath(): string {
  return join(ttabDecisionsDir(), "snapshot.json");
}

export function flattenText(raw: string): string {
  return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function asStringList(raw: unknown): string[] {
  const items = Array.isArray(raw) ? raw : raw == null || raw === "" ? [] : [raw];
  const out: string[] = [];
  for (const item of items) {
    const text = flattenText(String(item ?? ""));
    if (!text || text.toLowerCase() === "none") continue;
    if (!out.includes(text)) out.push(text);
  }
  return out;
}

export function parseIssueDateStr(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const named = raw.trim().toUpperCase().match(/^(\d{1,2})-([A-Z]{3})-(\d{4})$/);
  if (!named) return null;
  const month = MONTHS[named[2]];
  if (!month) return null;
  return `${named[3]}-${month}-${named[1].padStart(2, "0")}`;
}

export function decisionIdFromDocument(documentId: string | null | undefined): string | null {
  const match = String(documentId ?? "").trim().match(DECISION_DOC_RE);
  if (!match) return null;
  const file = match[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!file) return null;
  return `${match[1]}-${file}`;
}

export function officialTtabPdfUrl(documentId: string | null | undefined): string | null {
  const id = String(documentId ?? "").trim();
  if (!DECISION_DOC_RE.test(id)) return null;
  return `${PDF_BASE}${id}`;
}

function joinMarks(applicant: string, opposer: string): string {
  return [applicant, opposer].map((part) => flattenText(part)).filter(Boolean).join(" | ");
}

function shortMark(raw: string): string {
  const line = raw
    .split("\n")
    .map((part) => part.trim())
    .find(Boolean);
  if (!line) return "";
  return flattenText(line).slice(0, 80);
}

function decisionTitle(proceedingType: string, proceedingNumber: string, markRaw: string): string {
  const mark = shortMark(markRaw);
  return [proceedingType, proceedingNumber, mark].filter(Boolean).join(" ");
}

export function isHtmlDecision(text: string): boolean {
  return /<\s*html[\s>]|<\s*\/\s*html\s*>/i.test(text);
}

export function isSearchJson(text: string): boolean {
  return /recordTotalQuantity/.test(text) && /"_class"/.test(text);
}

export function isProceedingDocket(text: string): boolean {
  return /<\?xml|<case-file\b|<proceeding-entry\b|<prosecution-history\b/i.test(text);
}

export function isRealTtabDecisionBody(text: string): boolean {
  const flat = flattenText(text);
  if (flat.length < 400) return false;
  if (isHtmlDecision(text) || isSearchJson(text) || isProceedingDocket(text)) return false;
  if (!/trademark trial and appeal board/i.test(flat)) return false;
  if (!/\bdecision\b/i.test(flat)) return false;
  return true;
}

export function keepDocument(documentId: string | null | undefined): boolean {
  return Boolean(officialTtabPdfUrl(documentId));
}

function emptySources(): TtabSnapshot["sources"] {
  return { listing: SEARCH_URL, pdfHost: PDF_BASE };
}

export function listingFromHit(raw: unknown): TtabListing | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const documentId = String(row.documentId ?? "").trim();
  const id = decisionIdFromDocument(documentId);
  const sourceUrl = officialTtabPdfUrl(documentId);
  if (!id || !sourceUrl) return null;
  const code = String(row.proceedingTypeCd ?? "").trim().toUpperCase();
  const proceedingType = PROCEEDING_TYPE[code] || (code && code !== "NONE" ? code : "Decision");
  const proceedingNumber = String(row.proceedingNumberDisplay ?? row.proceedingNumber ?? "").replace(/\D/g, "");
  if (!proceedingNumber) return null;
  const applicantMark = String(row.applicantMarkGoodService ?? "");
  const opposerMark = String(row.opposerMarkGoodService ?? "");
  const parties = flattenText(String(row.partyName ?? ""));
  const date = parseIssueDateStr(String(row.issueDateStr ?? ""));
  const grounds = asStringList(row.groundsForRefusalCategory);
  const groundDetails = asStringList(row.groundsForRefusalSubCategory);
  const outcome = flattenText(String(row.decision ?? ""));
  const issue = flattenText(String(row.issue ?? ""));
  const kind = flattenText(String(row.decisionTypeCategory ?? "")) || "Decision";
  const panel = flattenText(String(row.panelMember ?? "").replace(/;/g, "; "));
  return {
    id,
    proceedingNumber,
    proceedingType,
    proceedingTypeCode: code,
    parties,
    mark: joinMarks(applicantMark, opposerMark),
    applicantMark: flattenText(applicantMark),
    opposerMark: flattenText(opposerMark),
    outcome,
    precedential: String(row.precedentCitableIndicator ?? "").trim().toUpperCase() === "Y",
    grounds,
    groundDetails,
    issue,
    kind,
    panel,
    date,
    documentId,
    title: decisionTitle(proceedingType, proceedingNumber, applicantMark || opposerMark || parties),
    sourceUrl,
  };
}

export function parseTtabSearch(raw: string): { listed: TtabListing[]; listedCount: number } {
  const data = JSON.parse(raw) as { results?: unknown; recordTotalQuantity?: unknown };
  const results = Array.isArray(data.results) ? data.results : [];
  const listed: TtabListing[] = [];
  for (const row of results) {
    const listing = listingFromHit(row);
    if (listing) listed.push(listing);
  }
  const total = Number(data.recordTotalQuantity);
  const listedCount = Number.isFinite(total) && total > 0 ? Math.floor(total) : listed.length;
  return { listed, listedCount };
}

function sortKey(row: { date: string | null; id: string }): string {
  return `${row.date ?? "0000-00-00"}-${row.id}`;
}

export function emptyTtabSnapshot(reason: string): TtabSnapshot {
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

function toCard(listing: TtabListing, body: string): TtabCard {
  return {
    ...listing,
    institution: listing.parties || listing.title,
    sourceUrl: officialTtabPdfUrl(listing.documentId) || listing.sourceUrl,
    body: body.replace(/\f/g, "\n").trim(),
  };
}

export function assembleTtabSnapshot(cards: TtabCard[], fetchedAt?: string): TtabSnapshot {
  const kept = cards.filter(
    (card) => isRealTtabDecisionBody(card.body) && keepDocument(card.documentId) && card.id === decisionIdFromDocument(card.documentId),
  );
  const seen = new Set<string>();
  const unique: TtabCard[] = [];
  for (const card of kept) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    unique.push(card);
  }
  unique.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  const asOf =
    unique
      .map((card) => card.date)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: unique.length ? "ok" : "empty",
    reason: unique.length ? null : "Official TTAB reading-room PDFs had no extractable decision text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: unique,
  };
}

function parseSnapshotFile(raw: unknown): TtabSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as TtabSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleTtabSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readTtabSnapshot(): TtabSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeTtabSnapshot(snap: TtabSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

function searchBody(start: number, rows: number): string {
  return JSON.stringify({
    dateRangeData: {},
    facetData: {},
    parameterData: {},
    recordTotalQuantity: rows,
    searchText: "",
    sortDataBag: [{ issueDate: "desc" }],
    recordStartNumber: start,
  });
}

export async function fetchTtabSearchPage(start: number, rows: number): Promise<{ listed: TtabListing[]; listedCount: number; pageCount: number }> {
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "User-Agent": HTTP_UA,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: searchBody(start, rows),
  });
  if (!res.ok) throw new Error(`${SEARCH_URL} HTTP ${res.status}`);
  const parsed = parseTtabSearch(await res.text());
  return { ...parsed, pageCount: parsed.listed.length };
}

export async function fetchTtabBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,application/octet-stream,*/*" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${url} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("TTAB_DECISIONS_PDFTOTEXT") || "pdftotext";
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
  return env("TTAB_DECISIONS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("TTAB_DECISIONS_LIMIT", "7"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 7;
}

function maxFetchLimit(): number {
  const n = Number(env("TTAB_DECISIONS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxListingPages(): number {
  const n = Number(env("TTAB_DECISIONS_PAGES", "2"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 2;
}

function pageSize(): number {
  const n = Number(env("TTAB_DECISIONS_PAGE_SIZE", "100"));
  return Number.isFinite(n) && n > 0 ? Math.min(100, Math.floor(n)) : 100;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: TtabListing[]): TtabListing[] {
  const seen = new Set<string>();
  const out: TtabListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepDocument(row.documentId) || !row.id) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push({ ...row, sourceUrl: officialTtabPdfUrl(row.documentId) || row.sourceUrl });
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

export async function walkOfficialTtab(): Promise<{ listed: TtabListing[]; listedCount: number }> {
  const rows = pageSize();
  const cap = maxListingPages();
  const listed: TtabListing[] = [];
  let listedCount = 0;
  for (let page = 0; page < cap; page += 1) {
    const start = page * rows;
    if (listedCount && start >= listedCount) break;
    try {
      const batch = await fetchTtabSearchPage(start, rows);
      listedCount = Math.max(listedCount, batch.listedCount);
      if (batch.pageCount === 0) break;
      listed.push(...batch.listed);
    } catch {
      break;
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(listedCount, merged.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: TtabListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["search.json", "decisions.json"]);
    const parsed = raw ? parseTtabSearch(raw) : { listed: [], listedCount: 0 };
    const merged = mergeListings(parsed.listed);
    return { listed: merged, listedCount: Math.max(parsed.listedCount, merged.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialTtab();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: mergeListings([]), listedCount: SEED_LISTINGS.length };
}

export async function collectTtabDecisions(opts?: {
  listingDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<TtabSnapshot> {
  const dir = opts?.listingDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ttabDecisionsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, TtabCard>();
  for (const card of readTtabSnapshot()?.cards ?? []) {
    if (isRealTtabDecisionBody(card.body) && keepDocument(card.documentId)) prior.set(card.id, card);
  }
  const cards: TtabCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target && !prior.has(row.id)) break;
    if (!keepDocument(row.documentId)) {
      skippedNoText += 1;
      continue;
    }
    const cached = prior.get(row.id);
    if (cached) {
      cards.push({ ...cached, ...row, institution: row.parties || cached.institution, body: cached.body });
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (target > 0 && addedThisRun >= target) break;
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    try {
      const localText = readNamedFile(dir, [`${row.id}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialTtabPdfUrl(row.documentId) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchTtabBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (!isRealTtabDecisionBody(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = toCard(row, text);
      if (!isRealTtabDecisionBody(parsed.body) || !keepDocument(parsed.documentId)) {
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
    ...assembleTtabSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeTtabSnapshot(snap);
  return snap;
}

export async function loadTtabDecisions(): Promise<TtabSnapshot> {
  const cached = readTtabSnapshot();
  if (cached && cached.cards.some((card) => isRealTtabDecisionBody(card.body))) return cached;
  try {
    return await collectTtabDecisions();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live TTAB reading-room fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyTtabSnapshot(
      `TTAB reading-room PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildTtabManifest(snap: TtabSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((card) => isRealTtabDecisionBody(card.body) && keepDocument(card.documentId));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      TTAB_DECISIONS_PATH,
      "Count plus parties, mark, proceeding type, outcome, precedential flag, and grounds (likelihood of confusion, descriptiveness, and the reading-room issue codes). Decision text is the paid GET /ttab-decisions payload. This free manifest lists the cached reading-room decisions. asOf is the newest issueDateStr. TTABVUE docket events and USPTO Open Data Portal proceeding XML are not this SKU. Not /ptab. Party names are the public case caption only.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: TTAB_DECISIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: TTAB_DECISIONS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    listedCount: snap?.listedCount ?? cards.length,
    cards: cards.map((card) => ({
      id: card.id,
      proceedingNumber: card.proceedingNumber,
      proceedingType: card.proceedingType,
      parties: card.parties,
      mark: card.mark,
      outcome: card.outcome,
      precedential: card.precedential,
      grounds: card.grounds,
      issue: card.issue,
      kind: card.kind,
      date: card.date,
      title: card.title,
      panel: card.panel,
      institution: card.institution,
    })),
    schema: { fields: [...MANIFEST_FIELDS] },
    sources: { listing: SEARCH_URL },
  };
}

export function filterTtabManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    return JSON.stringify(raw).toLowerCase().includes(needle);
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadTtabManifest(q?: string): Promise<Record<string, unknown>> {
  return filterTtabManifest(buildTtabManifest(readTtabSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectTtabDecisions()
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
              proceedingNumber: card.proceedingNumber,
              proceedingType: card.proceedingType,
              parties: card.parties,
              mark: card.mark,
              outcome: card.outcome,
              precedential: card.precedential,
              grounds: card.grounds,
              date: card.date,
              title: card.title,
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
