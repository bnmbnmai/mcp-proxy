#!/usr/bin/env node
/**
 * Merit Systems Protection Board (MSPB) decision TEXT door.
 * Nonprecedential manifest:
 *   https://mspbpublic.azurewebsites.net/decisions/nonprecedential/NonPrecedentialDecisions_Manifest-updmar2025.json
 * Precedential manifest (same door, kind=precedential; not a separate SKU):
 *   https://mspbpublic.azurewebsites.net/decisions/precedential/PrecedentialDecisions_Manifest_updMar2025.json
 * PDF: https://mspbpublic.azurewebsites.net/decisions/{nonprecedential|precedential}/{FILE_NAME}
 * Official manifests leave DOCUMENT_CONTENT empty. Paid body is pdftotext of the official PDF.
 * 17 U.S.C. § 105. Same extracted-body pipe as /oalj-decisions, /cbca-decisions, /ecab-decisions.
 * Primary bag is nonprecedential. Precedential Opinion & Orders fat-cache onto this door.
 * Not a precedential-only door. Not Westlaw. Not Lexis. Not /nlrb-decisions.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const MSPB_DECISIONS_PATH = "/mspb-decisions";
export const MSPB_DECISIONS_MANIFEST_PATH = "/mspb-decisions/manifest.json";
export const MSPB_DECISIONS_AMOUNT_ATOMIC = "50000";
export const MSPB_DECISIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "mspb-decision-bodies";
export const PRODUCT_NAME = "MSPB nonprecedential and precedential decision text";

export const NONPREC_MANIFEST_URL =
  "https://mspbpublic.azurewebsites.net/decisions/nonprecedential/NonPrecedentialDecisions_Manifest-updmar2025.json";
export const PREC_MANIFEST_URL =
  "https://mspbpublic.azurewebsites.net/decisions/precedential/PrecedentialDecisions_Manifest_updMar2025.json";
export const PDF_HOST = "https://mspbpublic.azurewebsites.net/decisions/";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Merit Systems Protection Board. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const SKU_KINDS = ["nonprecedential", "precedential"] as const;
export type MspbKind = (typeof SKU_KINDS)[number];

export const ISLER_ID = "mspb-np-dc-3443-25-2251-i-1-2026-09-28";
export const WAIS_ID = "mspb-np-ph-0752-24-0241-i-1-2026-09-17";
export const PHELPS_ID = "mspb-np-ph-3443-25-1805-i-1-2026-09-17";
export const RIVERA_ID = "mspb-p-da-0752-25-0110-i-1-2026-09-01";

export const ISLER_FILE = "Isler_Tanetta_N_DC-3443-25-2251-I-1_4142556.pdf";
export const WAIS_FILE = "Wais__LuciannaPH-0752-24-0241-I-1__Final_Order.pdf";
export const PHELPS_FILE = "Phelps_Juliann_PH-3443-25-1805-I-1_Final_Order.pdf";
export const RIVERA_FILE = "Rivera_ArielleDA-0752-25-0110-I-1_Opinion_and_Order.pdf";

export const ISLER_URL = `${PDF_HOST}nonprecedential/${ISLER_FILE}`;
export const WAIS_URL = `${PDF_HOST}nonprecedential/${WAIS_FILE}`;
export const PHELPS_URL = `${PDF_HOST}nonprecedential/${PHELPS_FILE}`;
export const RIVERA_URL = `${PDF_HOST}precedential/${RIVERA_FILE}`;

/** Opinion needles absent from the free index (docket / party / agency / date / kind only). */
export const BODY_NEEDLE_ISLER = "involuntary due to coercion";
export const BODY_NEEDLE_WAIS = "involuntary resignation appeal for lack of jurisdiction";
export const BODY_NEEDLE_PHELPS = "there is no quorum to";
export const BODY_NEEDLE_RIVERA = "Government vehicle (OGV)";

export const CARD_FIELDS = [
  "id",
  "docket",
  "caseNo",
  "kind",
  "orderKind",
  "date",
  "citation",
  "institution",
  "agency",
  "title",
  "sourceUrl",
  "body",
] as const;

export type MspbListing = {
  id: string;
  docket: string;
  caseNo: string;
  kind: MspbKind;
  orderKind: string;
  date: string | null;
  citation: string;
  institution: string;
  agency: string;
  appellant: string;
  fileName: string;
  title: string;
  sourceUrl: string;
};

export type MspbCard = MspbListing & { body: string };

export type MspbSnapshot = {
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
  sources: { nonprecedential: string; precedential: string; pdfHost: string };
  cards: MspbCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (MSPB decisions; +https://mspbpublic.azurewebsites.net/decisions/nonprecedential/)";

const MANIFEST_FIELDS = [
  "id",
  "docket",
  "caseNo",
  "kind",
  "orderKind",
  "date",
  "citation",
  "institution",
  "agency",
  "title",
  "sourceUrl",
] as const;

const DOCKET_RE = /\b([A-Z]{2}-[A-Z0-9]+-\d{2}-\d{3,5}-[A-Z]-\d+)\b/;

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function mspbDecisionsDir(): string {
  if (env("MSPB_DECISIONS_DIR")) return resolve(env("MSPB_DECISIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/mspb-decisions"));
}

export function snapshotPath(): string {
  return join(mspbDecisionsDir(), "snapshot.json");
}

export function flattenText(raw: string): string {
  return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const slash = raw.match(/\b(\d{4})\/(\d{1,2})\/(\d{1,2})\b/);
  if (slash) return `${slash[1]}-${slash[2].padStart(2, "0")}-${slash[3].padStart(2, "0")}`;
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return null;
}

export function normalizeDocket(raw: string | null | undefined): string {
  const hit = String(raw ?? "").toUpperCase().match(DOCKET_RE);
  return hit ? hit[1] : "";
}

export function orderKindOf(raw: string | null | undefined, kind: MspbKind): string {
  const flat = flattenText(String(raw ?? "").replace(/_+/g, " "));
  const key = flat.toLowerCase();
  if (!key) return kind === "precedential" ? "Opinion and Order" : "Final Order";
  if (key.startsWith("opinion and order")) return "Opinion and Order";
  if (key.includes("remand")) return "Remand Order";
  if (key.startsWith("final order")) return "Final Order";
  if (key === "order") return "Order";
  return flat;
}

export function decisionId(kind: MspbKind, docket: string, date: string): string {
  const prefix = kind === "precedential" ? "mspb-p" : "mspb-np";
  const slug = docket.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${prefix}-${slug}-${date}`;
}

function uniqueDecisionId(base: string, fileName: string, seen: Set<string>): string {
  if (!seen.has(base)) return base;
  const slug = fileName
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-32);
  let next = slug ? `${base}-${slug}` : `${base}-2`;
  let n = 2;
  while (seen.has(next)) {
    next = `${base}-${slug || "slip"}-${n}`;
    n += 1;
  }
  return next;
}

export function officialMspbPdfUrl(fileName: string | null | undefined, kind: MspbKind): string | null {
  const name = String(fileName ?? "").trim();
  if (!name || /[\\/]|\.\./.test(name)) return null;
  if (!name.toLowerCase().endsWith(".pdf")) return null;
  if (!/^[A-Za-z0-9._ ()-]+\.pdf$/.test(name)) return null;
  const folder = kind === "precedential" ? "precedential" : "nonprecedential";
  return `${PDF_HOST}${folder}/${encodeURIComponent(name)}`;
}

export function kindFromPdfUrl(url: string | null | undefined): MspbKind | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== "mspbpublic.azurewebsites.net") return null;
    const path = parsed.pathname.toLowerCase();
    if (path.includes("/decisions/nonprecedential/") && path.endsWith(".pdf")) return "nonprecedential";
    if (path.includes("/decisions/precedential/") && path.endsWith(".pdf")) return "precedential";
    return null;
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

export function isRealMspbBody(text: string): boolean {
  if (!text || isRawPdf(text)) return false;
  const flat = flattenText(text);
  if (flat.length < 400) return false;
  if (/DOCUMENT_CONTENT/.test(text) && /^\s*\{/.test(text)) return false;
  if (!/MERIT SYSTEMS PROTECTION BOARD/i.test(flat)) return false;
  if (!/(FINAL ORDER|OPINION AND ORDER|NONPRECEDENTIAL|DOCKET NUMBER|Docket No\.|REMAND)/i.test(flat)) return false;
  return true;
}

function sortKey(row: { date: string | null; kind: MspbKind; docket: string; id: string }): string {
  const kindRank = row.kind === "nonprecedential" ? "1" : "0";
  return `${row.date ?? "0000-00-00"}-${kindRank}-${row.docket}-${row.id}`;
}

export function keepListing(row: Pick<MspbListing, "id" | "docket" | "kind" | "sourceUrl" | "fileName">): boolean {
  if (!SKU_KINDS.includes(row.kind)) return false;
  if (!officialMspbPdfUrl(row.fileName, row.kind)) return false;
  if (kindFromPdfUrl(row.sourceUrl) !== row.kind) return false;
  if (!normalizeDocket(row.docket)) return false;
  if (!/^mspb-(np|p)-/.test(row.id)) return false;
  return true;
}

function personName(first: string, last: string): string {
  return flattenText(`${first} ${last}`);
}

function institutionOf(appellant: string, agency: string, docket: string): string {
  if (appellant && agency) return `${appellant}, ${agency}`;
  return appellant || agency || docket;
}

function titleOf(docket: string, kind: MspbKind, orderKind: string, citation: string): string {
  const cite = citation ? ` ${citation}` : "";
  return `${docket} ${kind} ${orderKind}${cite}`;
}

function seed(
  id: string,
  docket: string,
  kind: MspbKind,
  orderKind: string,
  date: string,
  appellant: string,
  agency: string,
  fileName: string,
  citation = "",
): MspbListing {
  const sourceUrl = officialMspbPdfUrl(fileName, kind) || "";
  return {
    id,
    docket,
    caseNo: docket,
    kind,
    orderKind,
    date,
    citation,
    institution: institutionOf(appellant, agency, docket),
    agency,
    appellant,
    fileName,
    title: titleOf(docket, kind, orderKind, citation),
    sourceUrl,
  };
}

export const SEED_LISTINGS: MspbListing[] = [
  seed(
    ISLER_ID,
    "DC-3443-25-2251-I-1",
    "nonprecedential",
    "Final Order",
    "2026-09-28",
    "Tanetta N. Isler",
    "Consumer Product Safety Commission",
    ISLER_FILE,
  ),
  seed(
    WAIS_ID,
    "PH-0752-24-0241-I-1",
    "nonprecedential",
    "Final Order",
    "2026-09-17",
    "Lucianna Wais",
    "Department of the Army",
    WAIS_FILE,
  ),
  seed(
    PHELPS_ID,
    "PH-3443-25-1805-I-1",
    "nonprecedential",
    "Final Order",
    "2026-09-17",
    "Juliann Phelps",
    "General Services Administration",
    PHELPS_FILE,
  ),
  seed(
    RIVERA_ID,
    "DA-0752-25-0110-I-1",
    "precedential",
    "Opinion and Order",
    "2026-09-01",
    "Arielle Rivera",
    "Department of Justice",
    RIVERA_FILE,
    "2026 MSPB 8",
  ),
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function listingFromRow(row: Record<string, unknown>, kind: MspbKind): MspbListing | null {
  if (str(row.DOCUMENT_CONTENT)) return null;
  const fileName = str(row.FILE_NAME) || str(row.DOCNAME);
  const sourceUrl = officialMspbPdfUrl(fileName, kind);
  if (!sourceUrl) return null;
  const docket = normalizeDocket(str(row.DOCKET_NBR)) || normalizeDocket(fileName);
  if (!docket) return null;
  const date = isoDate(str(row.ISSUED_DATE));
  if (!date) return null;
  const appellant = personName(str(row.APL_FIRST_NAME), str(row.APL_LAST_NAME));
  const agency = flattenText(str(row.AGENCY));
  const orderKind = orderKindOf(str(row.DOCTITLE), kind);
  const citation = flattenText(str(row.DECISION_NUMBER) || str(row.LEGAL_CITATION));
  const id = decisionId(kind, docket, date);
  const listing: MspbListing = {
    id,
    docket,
    caseNo: docket,
    kind,
    orderKind,
    date,
    citation,
    institution: institutionOf(appellant, agency, docket),
    agency,
    appellant,
    fileName,
    title: titleOf(docket, kind, orderKind, citation),
    sourceUrl,
  };
  return keepListing(listing) ? listing : null;
}

export function parseMspbManifest(raw: string, kind: MspbKind): MspbListing[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const root = asRecord(parsed);
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(root?.data) ? root.data : [];
  const out: MspbListing[] = [];
  const seen = new Set<string>();
  for (const rawRow of rows) {
    const row = asRecord(rawRow);
    if (!row) continue;
    const listing = listingFromRow(row, kind);
    if (!listing || seen.has(listing.sourceUrl)) continue;
    listing.id = uniqueDecisionId(listing.id, listing.fileName, seen);
    seen.add(listing.id);
    seen.add(listing.sourceUrl);
    out.push(listing);
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

export function parseMspbDecisionText(text: string, meta: Partial<MspbListing> & { sourceUrl: string }): MspbCard {
  const body = normalizePdfText(text);
  const flat = flattenText(body);
  const kind = (meta.kind && SKU_KINDS.includes(meta.kind) ? meta.kind : null) || kindFromPdfUrl(meta.sourceUrl) || "nonprecedential";
  const sourceUrl = officialMspbPdfUrl(meta.fileName, kind) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(flat) || "";
  const date = meta.date ?? isoDate(flat);
  const orderKind = orderKindOf(meta.orderKind, kind);
  const id = meta.id || (docket && date ? decisionId(kind, docket, date) : "");
  const appellant = flattenText(meta.appellant || "");
  const agency = flattenText(meta.agency || "");
  const citation = flattenText(meta.citation || "");
  const fileName = meta.fileName || "";
  return {
    id,
    docket,
    caseNo: docket,
    kind,
    orderKind,
    date,
    citation,
    institution: institutionOf(appellant, agency, docket),
    agency,
    appellant,
    fileName,
    title: meta.title || (docket ? titleOf(docket, kind, orderKind, citation) : id),
    sourceUrl,
    body,
  };
}

function emptySources(): MspbSnapshot["sources"] {
  return {
    nonprecedential: NONPREC_MANIFEST_URL,
    precedential: PREC_MANIFEST_URL,
    pdfHost: PDF_HOST,
  };
}

export function emptyMspbSnapshot(reason: string): MspbSnapshot {
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

export function assembleMspbSnapshot(cards: MspbCard[], fetchedAt?: string): MspbSnapshot {
  const kept = cards.filter((card) => isRealMspbBody(card.body) && keepListing(card));
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
    reason: kept.length ? null : "Official MSPB decision PDFs had no extractable decision text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): MspbSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as MspbSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  const assembled = assembleMspbSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
  if (typeof snap.listedCount === "number") assembled.listedCount = snap.listedCount;
  return assembled;
}

export function readMspbSnapshot(): MspbSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeMspbSnapshot(snap: MspbSnapshot): void {
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

export async function fetchMspbText(url: string): Promise<string> {
  const direct = await fetchOnce(url, "application/json,text/plain,*/*");
  if (!direct.ok || !direct.text) throw new Error(`${url} HTTP ${direct.status}`);
  return direct.text;
}

export async function fetchMspbPdf(url: string, pdfFile: string): Promise<string> {
  const kind = kindFromPdfUrl(url);
  if (!kind) throw new Error(`${url} is not an official MSPB decision PDF`);
  const direct = await fetchOnce(url, "application/pdf,application/octet-stream,*/*");
  const head = new TextDecoder().decode((direct.bytes ?? new Uint8Array()).slice(0, 5));
  if (!direct.ok || head !== "%PDF-" || !direct.bytes) {
    throw new Error(`${url} HTTP ${direct.status || "not a pdf"}`);
  }
  writeFileSync(pdfFile, direct.bytes);
  return pdfToText(pdfFile);
}

export function pdfToText(pdfPath: string): string {
  const helper = env("MSPB_DECISIONS_PDFTOTEXT") || "pdftotext";
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
  return env("MSPB_DECISIONS_MANIFEST_DIR") || env("MSPB_DECISIONS_HTML_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("MSPB_DECISIONS_LIMIT", "6"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
}

function maxFetchLimit(): number {
  const n = Number(env("MSPB_DECISIONS_MAX_FETCH", "6"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
}

/** Nonprecedential is always on. A precedential-only env does not drop the primary bag. */
export function enabledKinds(): MspbKind[] {
  const raw = env("MSPB_DECISIONS_KINDS", "nonprecedential,precedential");
  const wanted = raw.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
  const kinds = SKU_KINDS.filter((k) => wanted.includes(k));
  const out: MspbKind[] = kinds.length ? [...kinds] : ["nonprecedential", "precedential"];
  if (!out.includes("nonprecedential")) out.unshift("nonprecedential");
  return out;
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

function mergeListings(listed: MspbListing[]): MspbListing[] {
  const seen = new Set<string>();
  const out: MspbListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepListing(row) || !row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  out.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return out;
}

const MANIFEST_BY_KIND: Record<MspbKind, { url: string; file: string }> = {
  nonprecedential: { url: NONPREC_MANIFEST_URL, file: "nonprecedential.json" },
  precedential: { url: PREC_MANIFEST_URL, file: "precedential.json" },
};

export async function walkOfficialMspb(): Promise<{ listed: MspbListing[]; listedCount: number }> {
  const listed: MspbListing[] = [];
  const seen = new Set<string>();
  for (const kind of enabledKinds()) {
    const rows = parseMspbManifest(await fetchMspbText(MANIFEST_BY_KIND[kind].url), kind);
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      listed.push(row);
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: listed.length };
}

async function loadOfficialListings(dir: string): Promise<{ listed: MspbListing[]; listedCount: number }> {
  if (dir) {
    const chunks: MspbListing[] = [];
    for (const kind of enabledKinds()) {
      const raw = readNamedFile(dir, [MANIFEST_BY_KIND[kind].file, kind === "nonprecedential" ? "listing.json" : ""]);
      if (raw) chunks.push(...parseMspbManifest(raw, kind));
    }
    const merged = mergeListings(chunks);
    return { listed: merged, listedCount: Math.max(chunks.length, merged.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialMspb();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: mergeListings([]), listedCount: SEED_LISTINGS.length };
}

export async function collectMspbDecisions(opts?: {
  listingDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<MspbSnapshot> {
  const dir = opts?.listingDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = mspbDecisionsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, MspbCard>();
  for (const card of readMspbSnapshot()?.cards ?? []) {
    if (isRealMspbBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const seedIds = new Set(SEED_LISTINGS.map((row) => row.id));
  const cards: MspbCard[] = [];
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
      const sourceUrl = officialMspbPdfUrl(row.fileName, row.kind) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (existsSync(pdfFile)) return pdfToText(pdfFile);
          fetchedPdfs += 1;
          return fetchMspbPdf(sourceUrl, pdfFile);
        })());
      if (!isRealMspbBody(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseMspbDecisionText(text, { ...row, sourceUrl });
      if (!isRealMspbBody(parsed.body) || !keepListing(parsed)) {
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
    ...assembleMspbSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeMspbSnapshot(snap);
  return snap;
}

export async function loadMspbDecisions(): Promise<MspbSnapshot> {
  const cached = readMspbSnapshot();
  if (cached && cached.cards.some((card) => isRealMspbBody(card.body))) return cached;
  try {
    return await collectMspbDecisions();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live MSPB decision fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyMspbSnapshot(
      `MSPB decision PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildMspbManifest(snap: MspbSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((card) => isRealMspbBody(card.body) && keepListing(card));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      MSPB_DECISIONS_PATH,
      "Count plus docket, kind (nonprecedential or precedential), order kind, date, citation, institution, agency, and the official PDF sourceUrl. Decision text is the paid GET /mspb-decisions payload. This free manifest lists the cached slips. asOf is the newest decision date in the cache. Primary bag is nonprecedential. Precedential Opinion and Orders share this door (kind=precedential); there is no precedential-only door. Official index JSON with an empty body field is the index, not the sold body. Not /nlrb-decisions. Not /oalj-decisions. Not /ecab-decisions.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: MSPB_DECISIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: MSPB_DECISIONS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    listedCount: snap?.listedCount ?? cards.length,
    cards: cards.map((card) => ({
      id: card.id,
      docket: card.docket,
      caseNo: card.caseNo,
      kind: card.kind,
      orderKind: card.orderKind,
      date: card.date,
      citation: card.citation,
      institution: card.institution,
      agency: card.agency,
      title: card.title,
      sourceUrl: card.sourceUrl,
    })),
    schema: { fields: [...MANIFEST_FIELDS] },
    sources: {
      nonprecedential: snap?.sources?.nonprecedential ?? NONPREC_MANIFEST_URL,
      precedential: snap?.sources?.precedential ?? PREC_MANIFEST_URL,
    },
  };
}

/** Exact kind filter. "nonprecedential" contains "precedential", so substring search is not a kind filter. */
export function filterMspbManifestByKind(manifest: Record<string, unknown>, kind?: string | null): Record<string, unknown> {
  const needle = (kind ?? "").trim().toLowerCase();
  if (needle !== "nonprecedential" && needle !== "precedential") return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    return String((raw as Record<string, unknown>).kind ?? "").toLowerCase() === needle;
  });
  return { ...manifest, cardCount: matched.length, cards: matched, kind: needle };
}

export function filterMspbManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "docket", "caseNo", "kind", "orderKind", "date", "citation", "institution", "agency", "title"].some((key) =>
      String(row[key] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadMspbManifest(q?: string): Promise<Record<string, unknown>> {
  return filterMspbManifest(buildMspbManifest(readMspbSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectMspbDecisions()
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
              orderKind: card.orderKind,
              date: card.date,
              citation: card.citation,
              institution: card.institution,
              agency: card.agency,
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
