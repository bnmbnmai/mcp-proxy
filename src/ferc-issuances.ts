#!/usr/bin/env node
/**
 * FERC eLibrary issuance TEXT door.
 * Commission Orders/Opinions and ALJ Initial Decisions from the public eLibrary
 * AdvancedSearch API, with the official slip turned into text via DownloadPDF.
 * Search: POST https://elibrary.ferc.gov/eLibrarywebapi/api/Search/AdvancedSearch
 * File:   POST https://elibrary.ferc.gov/eLibrarywebapi/api/File/DownloadPDF
 *         ?accesssionNumber={accession}  (the API spells accession with three s)
 * Locator (kept on the paid body, stripped from the free manifest):
 *   https://elibrary.ferc.gov/eLibrary/docinfo?accession_number={accession}
 * 17 U.S.C. § 105. Same extracted-body pipe as /mspb-decisions and /cbca-decisions.
 * Not /ferc-orders (cms.ferc.gov civil-penalty stipulation / show-cause text).
 * Not Delegated Orders, dissents, notices, or ALJ procedural / discovery orders.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const FERC_ISSUANCES_PATH = "/ferc-issuances";
export const FERC_ISSUANCES_MANIFEST_PATH = "/ferc-issuances/manifest.json";
export const FERC_ISSUANCES_AMOUNT_ATOMIC = "50000";
export const FERC_ISSUANCES_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "ferc-issuance-bodies";
export const PRODUCT_NAME = "FERC eLibrary Commission order/opinion and ALJ initial-decision text";

export const SEARCH_URL = "https://elibrary.ferc.gov/eLibrarywebapi/api/Search/AdvancedSearch";
export const DOWNLOAD_URL = "https://elibrary.ferc.gov/eLibrarywebapi/api/File/DownloadPDF";
export const DOCINFO_URL = "https://elibrary.ferc.gov/eLibrary/docinfo";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Federal Energy Regulatory Commission. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const SKU_KINDS = ["commission", "alj"] as const;
export type FercIssuanceKind = (typeof SKU_KINDS)[number];

export const COMMISSION_CLASS = "Order/Opinion";
export const COMMISSION_TYPE = "Commission Order/Opinion";
export const ALJ_CLASS = "ALJ Issuance";
export const ALJ_TYPE = "ALJ Initial Decision";

const ACCESSION_RE = /^\d{8}-\d{3,5}$/;
const DOCKET_RE = /\b([A-Z]{1,4}\d{2}-\d{1,5}-\d{3})\b/;
const FILE_ID_RE = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;
const CITE_RE = /\b(\d{3}\s+FERC\s+¶\s*[\d,]+)/;

export const SAGUARO_ID = "ferc-commission-20260928-3137";
export const EXXON_ID = "ferc-commission-20260925-3063";
export const VIRIDON_ID = "ferc-alj-20260505-3058";
export const CPUC_ID = "ferc-alj-20251125-3026";

export const SAGUARO_ACCESSION = "20260928-3137";
export const EXXON_ACCESSION = "20260925-3063";
export const VIRIDON_ACCESSION = "20260505-3058";
export const CPUC_ACCESSION = "20251125-3026";

export const SAGUARO_URL = officialDocinfoUrl(SAGUARO_ACCESSION) || "";
export const EXXON_URL = officialDocinfoUrl(EXXON_ACCESSION) || "";
export const VIRIDON_URL = officialDocinfoUrl(VIRIDON_ACCESSION) || "";
export const CPUC_URL = officialDocinfoUrl(CPUC_ACCESSION) || "";

/** Opinion needles absent from the free index (docket / party / date / kind only). */
export const BODY_NEEDLE_SAGUARO = "Hudspeth County";
export const BODY_NEEDLE_EXXON = "Mars crude";
export const BODY_NEEDLE_VIRIDON = "Jeffrey Janicke";
export const BODY_NEEDLE_CPUC = "Melissa A. Chapaska";

export const CARD_FIELDS = [
  "id",
  "accession",
  "docket",
  "dockets",
  "caseNo",
  "kind",
  "orderKind",
  "date",
  "citation",
  "institution",
  "library",
  "title",
  "sourceUrl",
  "body",
] as const;

const CLASS_BY_KIND: Record<FercIssuanceKind, { documentClass: string; documentType: string; orderKind: string }> = {
  commission: { documentClass: COMMISSION_CLASS, documentType: COMMISSION_TYPE, orderKind: "Commission Order/Opinion" },
  alj: { documentClass: ALJ_CLASS, documentType: ALJ_TYPE, orderKind: "ALJ Initial Decision" },
};

export type FercListing = {
  id: string;
  accession: string;
  docket: string;
  dockets: string[];
  caseNo: string;
  kind: FercIssuanceKind;
  orderKind: string;
  date: string | null;
  citation: string;
  institution: string;
  library: string;
  title: string;
  fileId: string;
  fileName: string;
  fileType: string;
  sourceUrl: string;
};

export type FercCard = FercListing & { body: string };

export type FercSnapshot = {
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
  sources: { search: string; commission: string; alj: string };
  cards: FercCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FERC eLibrary issuances; +https://elibrary.ferc.gov/eLibrary/search)";

const MANIFEST_FIELDS = [
  "id",
  "accession",
  "docket",
  "dockets",
  "caseNo",
  "kind",
  "orderKind",
  "date",
  "citation",
  "institution",
  "library",
  "title",
  "sourceUrl",
] as const;

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function fercIssuancesDir(): string {
  if (env("FERC_ISSUANCES_DIR")) return resolve(env("FERC_ISSUANCES_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ferc-issuances"));
}

export function snapshotPath(): string {
  return join(fercIssuancesDir(), "snapshot.json");
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
  return null;
}

export function normalizeAccession(raw: string | null | undefined): string {
  const hit = String(raw ?? "").trim();
  return ACCESSION_RE.test(hit) ? hit : "";
}

export function normalizeDocket(raw: string | null | undefined): string {
  const hit = String(raw ?? "").toUpperCase().match(DOCKET_RE);
  return hit ? hit[1] : "";
}

export function normalizeDockets(raw: unknown): string[] {
  const parts = Array.isArray(raw) ? raw : [raw];
  const out: string[] = [];
  for (const part of parts) {
    const docket = normalizeDocket(typeof part === "string" ? part : "");
    if (docket && !out.includes(docket)) out.push(docket);
  }
  return out;
}

export function issuanceId(kind: FercIssuanceKind, accession: string): string {
  return `ferc-${kind}-${accession}`;
}

export function officialDocinfoUrl(accession: string | null | undefined): string | null {
  const id = normalizeAccession(accession);
  if (!id) return null;
  return `${DOCINFO_URL}?accession_number=${id}`;
}

/**
 * eLibrary curPage is not a normal zero-based index.
 * curPage 0 and curPage 1 both return the first page. The second page is curPage 2.
 * Pass a zero-based page index; this returns the value the API actually wants.
 */
export function elibraryCurPage(zeroBasedIndex: number): number {
  const n = Math.max(0, Math.floor(zeroBasedIndex));
  return n === 0 ? 0 : n + 1;
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

export function isRealFercBody(text: string): boolean {
  if (!text || isRawPdf(text)) return false;
  const flat = flattenText(text);
  if (flat.length < 400) return false;
  if (!/FEDERAL ENERGY REGULATORY COMMISSION/i.test(flat)) return false;
  if (!/(ORDER|INITIAL DECISION|OPINION)/i.test(flat)) return false;
  return true;
}

export function isTestIssuance(description: string, fileName: string): boolean {
  const blob = `${description} ${fileName}`.toLowerCase();
  if (/testdocumentonly|smoke test|elibrary test|delayed release/.test(blob)) return true;
  if (/\btesting file\b/.test(blob)) return true;
  return false;
}

export function citationFromBody(text: string): string {
  const hit = flattenText(text).match(CITE_RE);
  return hit ? hit[1].replace(/\s+/g, " ") : "";
}

export function institutionFromDescription(description: string, docket: string): string {
  const flat = flattenText(description);
  const hit = flat.match(/\bre\s+(.+?)(?:\s+under\b|$)/i);
  if (hit) return hit[1].trim();
  const beforeUnder = flat.match(/^(.+?)\s+under\b/i);
  if (beforeUnder) return beforeUnder[1].trim();
  return flat || docket;
}

function sortKey(row: { date: string | null; id: string }): string {
  return `${row.date ?? "0000-00-00"}-${row.id}`;
}

export function keepListing(
  row: Pick<FercListing, "id" | "accession" | "docket" | "kind" | "sourceUrl" | "fileId">,
): boolean {
  if (!SKU_KINDS.includes(row.kind)) return false;
  if (!normalizeAccession(row.accession)) return false;
  if (!normalizeDocket(row.docket)) return false;
  if (row.id !== issuanceId(row.kind, row.accession)) return false;
  if (officialDocinfoUrl(row.accession) !== row.sourceUrl) return false;
  if (!FILE_ID_RE.test(row.fileId)) return false;
  return true;
}

function titleOf(docket: string, orderKind: string, citation: string): string {
  return citation ? `${docket} ${orderKind} ${citation}` : `${docket} ${orderKind}`;
}

function seed(
  id: string,
  accession: string,
  docket: string,
  dockets: string[],
  kind: FercIssuanceKind,
  date: string,
  institution: string,
  library: string,
  fileId: string,
  fileName: string,
  fileType: string,
  citation: string,
): FercListing {
  const orderKind = CLASS_BY_KIND[kind].orderKind;
  return {
    id,
    accession,
    docket,
    dockets,
    caseNo: docket,
    kind,
    orderKind,
    date,
    citation,
    institution,
    library,
    title: titleOf(docket, orderKind, citation),
    fileId,
    fileName,
    fileType,
    sourceUrl: officialDocinfoUrl(accession) || "",
  };
}

export const SEED_LISTINGS: FercListing[] = [
  seed(
    SAGUARO_ID,
    SAGUARO_ACCESSION,
    "CP23-29-002",
    ["CP23-29-002"],
    "commission",
    "2026-09-28",
    "Saguaro Connector Pipeline, L.L.C.",
    "Gas",
    "3B64817D-4E72-CDED-9666-A0EA09600000",
    "CP23-29-002.docx",
    "DOCX",
    "196 FERC ¶ 61,241",
  ),
  seed(
    EXXON_ID,
    EXXON_ACCESSION,
    "OR26-1-000",
    ["OR26-1-000"],
    "commission",
    "2026-09-25",
    "ExxonMobil Oil Corporation v. LOCAP LLC",
    "Oil",
    "228765A0-F505-C7AC-9565-A0D9DE800000",
    "OR26-1-000.docx",
    "DOCX",
    "196 FERC ¶ 61,236",
  ),
  seed(
    VIRIDON_ID,
    VIRIDON_ACCESSION,
    "EL24-67-001",
    ["EL24-67-001"],
    "alj",
    "2026-05-05",
    "Viridon New York Inc.",
    "Electric",
    "211AA503-0E08-C93E-8BF1-9DF979300000",
    "EL24-67-001 Initial Decision PUB.pdf",
    "PDF",
    "195 FERC ¶ 63,017",
  ),
  seed(
    CPUC_ID,
    CPUC_ACCESSION,
    "EL02-60-018",
    ["EL02-60-018", "EL02-62-017"],
    "alj",
    "2025-11-25",
    "Public Utilities Commission of the State of California et al. v. Sellers of Long-Terms Contracts to the California Department of Water Resources",
    "Electric",
    "7840DAAE-2068-C017-9625-9ABB9FB00000",
    "EL02-60-018 Initial Decision.docx.pdf",
    "PDF",
    "193 FERC ¶ 63,028",
  ),
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

type PickedFile = { fileId: string; fileName: string; fileType: string };

export function pickPublicFile(transmittals: unknown): PickedFile | null {
  if (!Array.isArray(transmittals)) return null;
  const pubs: PickedFile[] = [];
  for (const raw of transmittals) {
    const row = asRecord(raw);
    if (!row) continue;
    const fileId = str(row.fileId);
    const fileName = str(row.fileName);
    const fileType = str(row.fileType).toUpperCase();
    if (!FILE_ID_RE.test(fileId)) continue;
    if (/priv/i.test(fileName)) continue;
    if (fileType !== "PDF" && fileType !== "DOCX") continue;
    pubs.push({ fileId, fileName, fileType });
  }
  return pubs.find((row) => row.fileType === "PDF") || pubs.find((row) => row.fileType === "DOCX") || null;
}

function classMatches(classTypes: unknown, kind: FercIssuanceKind): boolean {
  if (!Array.isArray(classTypes)) return false;
  const want = CLASS_BY_KIND[kind];
  return classTypes.some((raw) => {
    const row = asRecord(raw);
    if (!row) return false;
    return str(row.documentClass) === want.documentClass && str(row.documentType) === want.documentType;
  });
}

function listingFromHit(row: Record<string, unknown>, kind: FercIssuanceKind): FercListing | null {
  if (!classMatches(row.classTypes, kind)) return null;
  if (str(row.availCode).toUpperCase() !== "P") return null;
  const accession = normalizeAccession(str(row.acesssionNumber) || str(row.accessionNumber));
  if (!accession) return null;
  const description = str(row.description);
  const file = pickPublicFile(row.transmittals);
  if (!file) return null;
  if (isTestIssuance(description, file.fileName)) return null;
  const dockets = normalizeDockets(row.docketNumbers);
  const docket = dockets[0] || "";
  if (!docket) return null;
  const date = isoDate(str(row.issuedDate)) || isoDate(str(row.filedDate)) || isoDate(str(row.postedDate));
  if (!date) return null;
  const libraries = Array.isArray(row.libraries) ? row.libraries.map((item) => str(item)).filter(Boolean) : [];
  const library = libraries.join(", ");
  const orderKind = CLASS_BY_KIND[kind].orderKind;
  const institution = institutionFromDescription(description, docket);
  const sourceUrl = officialDocinfoUrl(accession) || "";
  const listing: FercListing = {
    id: issuanceId(kind, accession),
    accession,
    docket,
    dockets,
    caseNo: docket,
    kind,
    orderKind,
    date,
    citation: "",
    institution,
    library,
    title: titleOf(docket, orderKind, ""),
    fileId: file.fileId,
    fileName: file.fileName,
    fileType: file.fileType,
    sourceUrl,
  };
  return keepListing(listing) ? listing : null;
}

export function parseFercSearch(raw: string, kind: FercIssuanceKind): FercListing[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const root = asRecord(parsed);
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(root?.searchHits) ? root.searchHits : [];
  const out: FercListing[] = [];
  const seen = new Set<string>();
  for (const rawRow of rows) {
    const row = asRecord(rawRow);
    if (!row) continue;
    const listing = listingFromHit(row, kind);
    if (!listing || seen.has(listing.id)) continue;
    seen.add(listing.id);
    out.push(listing);
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

export function parseFercIssuanceText(text: string, meta: Partial<FercListing> & { sourceUrl: string }): FercCard {
  const body = normalizePdfText(text);
  const kind =
    meta.kind && SKU_KINDS.includes(meta.kind) ? meta.kind : "commission";
  const accession = normalizeAccession(meta.accession) || "";
  const sourceUrl = officialDocinfoUrl(accession) || meta.sourceUrl;
  const dockets = meta.dockets?.length ? normalizeDockets(meta.dockets) : normalizeDockets(meta.docket);
  const docket = dockets[0] || normalizeDocket(meta.docket);
  const date = meta.date ?? null;
  const orderKind = meta.orderKind || CLASS_BY_KIND[kind].orderKind;
  const citation = flattenText(meta.citation || "") || citationFromBody(body);
  const institution = flattenText(meta.institution || "") || (docket ? institutionFromDescription("", docket) : "");
  const id = meta.id || (accession ? issuanceId(kind, accession) : "");
  return {
    id,
    accession,
    docket,
    dockets,
    caseNo: docket,
    kind,
    orderKind,
    date,
    citation,
    institution,
    library: flattenText(meta.library || ""),
    title: docket ? titleOf(docket, orderKind, citation) : meta.title || id,
    fileId: meta.fileId || "",
    fileName: meta.fileName || "",
    fileType: meta.fileType || "",
    sourceUrl,
    body,
  };
}

function emptySources(): FercSnapshot["sources"] {
  return {
    search: SEARCH_URL,
    commission: `${COMMISSION_CLASS} / ${COMMISSION_TYPE}`,
    alj: `${ALJ_CLASS} / ${ALJ_TYPE}`,
  };
}

export function emptyFercSnapshot(reason: string): FercSnapshot {
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

export function assembleFercSnapshot(cards: FercCard[], fetchedAt?: string): FercSnapshot {
  const kept = cards.filter((card) => isRealFercBody(card.body) && keepListing(card));
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
    reason: kept.length ? null : "Official FERC eLibrary issuances had no extractable order text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): FercSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FercSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  const assembled = assembleFercSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
  if (typeof snap.listedCount === "number") assembled.listedCount = snap.listedCount;
  return assembled;
}

export function readFercSnapshot(): FercSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeFercSnapshot(snap: FercSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function commissionStart(): string {
  return env("FERC_ISSUANCES_COMMISSION_START", "2026-01-01") || "2026-01-01";
}

function aljStart(): string {
  return env("FERC_ISSUANCES_ALJ_START", "2018-01-01") || "2018-01-01";
}

function endDate(): string {
  return env("FERC_ISSUANCES_END", todayIso()) || todayIso();
}

function pageSize(): number {
  const n = Number(env("FERC_ISSUANCES_PAGE_SIZE", "100"));
  return Number.isFinite(n) && n > 0 ? Math.min(200, Math.floor(n)) : 100;
}

function maxPages(): number {
  const n = Number(env("FERC_ISSUANCES_MAX_PAGES", "20"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}

export function searchRequestBody(kind: FercIssuanceKind, start: string, end: string, zeroBasedPage: number, perPage: number): Record<string, unknown> {
  const cls = CLASS_BY_KIND[kind];
  return {
    searchText: "*",
    searchFullText: true,
    searchDescription: true,
    dateSearches: [{ dateType: "filed_date", startDate: start, endDate: end }],
    availability: null,
    affiliations: [],
    categories: ["Issuance"],
    libraries: [],
    accessionNumber: null,
    eFiling: false,
    opinion: null,
    fedRegisterCite: null,
    fedCourtCaseNumber: null,
    fercCite: null,
    parentAccessionNumber: null,
    docketSearches: [],
    resultsPerPage: perPage,
    curPage: elibraryCurPage(zeroBasedPage),
    classTypes: [{ documentClass: cls.documentClass, documentType: cls.documentType }],
    orderNumber: null,
    sortBy: "",
    groupBy: "NONE",
    idolResultID: "",
    allDates: false,
  };
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; text: string; bytes: Uint8Array }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": HTTP_UA,
      "Content-Type": "application/json",
      Accept: "application/json,application/pdf,*/*",
    },
    body: JSON.stringify(body),
  });
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { ok: res.ok, status: res.status, text: new TextDecoder().decode(bytes), bytes };
}

async function searchKind(kind: FercIssuanceKind): Promise<FercListing[]> {
  const start = kind === "commission" ? commissionStart() : aljStart();
  const end = endDate();
  const perPage = pageSize();
  const cap = maxPages();
  const out: FercListing[] = [];
  const seen = new Set<string>();
  let total = Number.POSITIVE_INFINITY;
  for (let page = 0; page < cap; page += 1) {
    const posted = await postJson(SEARCH_URL, searchRequestBody(kind, start, end, page, perPage));
    if (!posted.ok) throw new Error(`${SEARCH_URL} HTTP ${posted.status}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(posted.text);
    } catch {
      throw new Error(`${SEARCH_URL} returned non-JSON`);
    }
    const root = asRecord(parsed);
    if (root && root.success === false) {
      throw new Error(str(root.errorMessage) || `${SEARCH_URL} search failed`);
    }
    const hits = Array.isArray(root?.searchHits) ? root.searchHits : [];
    if (typeof root?.totalHits === "number") total = root.totalHits;
    if (!hits.length) break;
    const first = str(asRecord(hits[0])?.acesssionNumber || asRecord(hits[0])?.accessionNumber);
    if (first && seen.has(`page:${first}`)) break;
    if (first) seen.add(`page:${first}`);
    const pageRows = parseFercSearch(JSON.stringify({ searchHits: hits }), kind);
    let added = 0;
    for (const row of pageRows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
      added += 1;
    }
    if (out.length >= total) break;
    if (hits.length < perPage) break;
    if (added === 0) break;
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FERC_ISSUANCES_PDFTOTEXT") || "pdftotext";
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

export async function fetchFercPdf(accession: string, fileId: string, pdfFile: string): Promise<string> {
  const url = `${DOWNLOAD_URL}?accesssionNumber=${encodeURIComponent(accession)}`;
  const posted = await postJson(url, { FileID: fileId, Islegacy: false });
  const head = new TextDecoder().decode(posted.bytes.slice(0, 5));
  if (!posted.ok || head !== "%PDF-") {
    throw new Error(`${url} HTTP ${posted.status || "not a pdf"}`);
  }
  writeFileSync(pdfFile, posted.bytes);
  return pdfToText(pdfFile);
}

function listingDir(): string {
  return env("FERC_ISSUANCES_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("FERC_ISSUANCES_LIMIT", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxFetchLimit(): number {
  const n = Number(env("FERC_ISSUANCES_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

/** Both bags stay. A commission-only or ALJ-only env does not drop the other kind. */
export function enabledKinds(): FercIssuanceKind[] {
  return ["commission", "alj"];
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    if (!name) continue;
    const path = join(dir, name);
    if (existsSync(path) && !path.endsWith("/")) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: FercListing[]): FercListing[] {
  const seen = new Set<string>();
  const out: FercListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepListing(row) || !row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

const FILE_BY_KIND: Record<FercIssuanceKind, string> = {
  commission: "commission.json",
  alj: "alj.json",
};

export async function walkOfficialFerc(): Promise<{ listed: FercListing[]; listedCount: number }> {
  const listed: FercListing[] = [];
  const seen = new Set<string>();
  for (const kind of enabledKinds()) {
    for (const row of await searchKind(kind)) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      listed.push(row);
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: listed.length };
}

async function loadOfficialListings(dir: string): Promise<{ listed: FercListing[]; listedCount: number }> {
  if (dir) {
    const chunks: FercListing[] = [];
    for (const kind of enabledKinds()) {
      const raw = readNamedFile(dir, [FILE_BY_KIND[kind]]);
      if (raw) chunks.push(...parseFercSearch(raw, kind));
    }
    const merged = mergeListings(chunks);
    return { listed: merged, listedCount: Math.max(chunks.length, merged.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialFerc();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: mergeListings([]), listedCount: SEED_LISTINGS.length };
}

export async function collectFercIssuances(opts?: {
  listingDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FercSnapshot> {
  const dir = opts?.listingDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = fercIssuancesDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, FercCard>();
  for (const card of readFercSnapshot()?.cards ?? []) {
    if (isRealFercBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const seedIds = new Set(SEED_LISTINGS.map((row) => row.id));
  const cards: FercCard[] = [];
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
      const citation = row.citation || cached.citation;
      const title = citation && row.docket ? titleOf(row.docket, row.orderKind, citation) : row.title || cached.title;
      cards.push({ ...cached, ...row, body: cached.body, citation, title });
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
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (existsSync(pdfFile)) return pdfToText(pdfFile);
          fetchedPdfs += 1;
          return fetchFercPdf(row.accession, row.fileId, pdfFile);
        })());
      if (!isRealFercBody(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseFercIssuanceText(text, row);
      if (!isRealFercBody(parsed.body) || !keepListing(parsed)) {
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
    ...assembleFercSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeFercSnapshot(snap);
  return snap;
}

export async function loadFercIssuances(): Promise<FercSnapshot> {
  const cached = readFercSnapshot();
  if (cached && cached.cards.some((card) => isRealFercBody(card.body))) return cached;
  try {
    return await collectFercIssuances();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live FERC eLibrary fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyFercSnapshot(
      `FERC eLibrary issuances are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFercManifest(snap: FercSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((card) => isRealFercBody(card.body) && keepListing(card));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      FERC_ISSUANCES_PATH,
      "Count plus accession, docket, kind (commission or alj), order kind, date, citation, institution, and library. Order text is the paid GET /ferc-issuances payload. This free manifest lists the cached slips. asOf is the newest issuance date in the cache. Commission Orders/Opinions and ALJ Initial Decisions share this door. Not Delegated Orders, notices, or ALJ procedural orders. Not /ferc-orders (cms.ferc.gov civil-penalty stipulation and show-cause text).",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: FERC_ISSUANCES_AMOUNT_ATOMIC,
    oneAmountAtomic: FERC_ISSUANCES_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    listedCount: snap?.listedCount ?? cards.length,
    cards: cards.map((card) => ({
      id: card.id,
      accession: card.accession,
      docket: card.docket,
      dockets: card.dockets,
      caseNo: card.caseNo,
      kind: card.kind,
      orderKind: card.orderKind,
      date: card.date,
      citation: card.citation,
      institution: card.institution,
      library: card.library,
      title: card.title,
      sourceUrl: card.sourceUrl,
    })),
    schema: { fields: [...MANIFEST_FIELDS] },
    sources: {
      search: snap?.sources?.search ?? SEARCH_URL,
      commission: snap?.sources?.commission ?? `${COMMISSION_CLASS} / ${COMMISSION_TYPE}`,
      alj: snap?.sources?.alj ?? `${ALJ_CLASS} / ${ALJ_TYPE}`,
    },
  };
}

/** Exact kind filter. */
export function filterFercManifestByKind(manifest: Record<string, unknown>, kind?: string | null): Record<string, unknown> {
  const needle = (kind ?? "").trim().toLowerCase();
  if (needle !== "commission" && needle !== "alj") return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    return String((raw as Record<string, unknown>).kind ?? "").toLowerCase() === needle;
  });
  return { ...manifest, cardCount: matched.length, cards: matched, kind: needle };
}

export function filterFercManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "accession", "docket", "dockets", "caseNo", "kind", "orderKind", "date", "citation", "institution", "library", "title"].some((key) =>
      String(row[key] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadFercManifest(q?: string): Promise<Record<string, unknown>> {
  return filterFercManifest(buildFercManifest(readFercSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFercIssuances()
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
              accession: card.accession,
              docket: card.docket,
              dockets: card.dockets,
              kind: card.kind,
              orderKind: card.orderKind,
              date: card.date,
              citation: card.citation,
              institution: card.institution,
              library: card.library,
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
