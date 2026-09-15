#!/usr/bin/env node
/**
 * DOL OALJ / BALCA / ARB Decision and Order TEXT door.
 * Official Decision/Order PDFs linked from OALJ caselists / libraries:
 * https://www.dol.gov/agencies/oalj/topics/information/DECISIONS
 * Hosts: oalj.dol.gov/DECISIONS/ALJ/... and
 * dol.gov/sites/dolgov/files/OALJ/PUBLIC/ARB/DECISIONS/...
 * 17 U.S.C. § 105.
 * Harvest DOL-authored Decision/Order PDFs only. Prefer substantive
 * Decision/Order bodies. Skip OFLC Foreign Labor Certification Disclosure
 * Data free XLSX/CSV (H-2A/H-2B/PERM/LCA). Skip FR HTML wraps. Do not
 * sell caselist HTML-only as the paid product. Not /oshrc-orders,
 * /fmshrc-orders, or /stb-decisions.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const OALJ_DECISIONS_PATH = "/oalj-decisions";
export const OALJ_DECISIONS_MANIFEST_PATH = "/oalj-decisions/manifest.json";
export const OALJ_DECISIONS_AMOUNT_ATOMIC = "50000";
export const OALJ_DECISIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "oalj-decision-bodies";
export const PRODUCT_NAME = "DOL OALJ / BALCA / ARB Decision and Order text";

export const LISTING_URL = "https://www.dol.gov/agencies/oalj/topics/information/DECISIONS";
export const TLC_FY2026_URL =
  "https://www.dol.gov/agencies/oalj/PUBLIC/INA/REFERENCES/CASELISTS/TLC_DECISIONS_FY2026";
export const SPA_LIST_URL =
  "https://www.dol.gov/agencies/oalj/PUBLIC/WHISTLEBLOWER/REFERENCES/CASELISTS/SPALIST1";
export const ALJ_HOST = "www.oalj.dol.gov";
export const ARB_HOST = "www.dol.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "U.S. Department of Labor, Office of Administrative Law Judges / Board of Alien Labor Certification Appeals / Administrative Review Board. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const CASE_NO_RE = /\b((?:19|20)\d{2}[- ]?(?:[A-Z]{2,6}[- ]?)?\d{1,5})\b/i;
export const ALJ_PDF_RE = /\/DECISIONS\/ALJ\/[A-Z0-9]+\/\d{4}\/[^"'?\s>]+\.pdf/i;
export const ARB_PDF_RE = /\/(?:sites\/dolgov\/files\/OALJ\/)?PUBLIC\/ARB\/DECISIONS\/[^"'?\s>]+\.pdf/i;
export const COURT_PDF_RE = /\/COURT_DECISIONS\//i;
export const OFLC_KILL_RE =
  /\b(?:H-2A|H-2B|PERM|LCA)_Disclosure|foreign-labor\/performance|Disclosure_Data_FY|\.xlsx\b/i;
export const KEEP_KIND_RE = /Decision and Order|\bDecision\b|\bOrder\b/i;
export const SKIP_KIND_RE =
  /Notice of Exemption|^Notice$|Organizational Chart|e-?fil(e|ing)|how to file/i;

export const MCLAUGHLIN_ID = "2026-spa-00001";
export const JOHNSON_ID = "2026-tlc-00008";
export const SHEFFIELD_ID = "2026-0010";
export const MCLAUGHLIN_URL =
  "https://www.oalj.dol.gov/DECISIONS/ALJ/SPA/2026/McLaughlin_v_Troy_Construction_LL_2026SPA00001_(JUL_30_2026)_100012_CADEC_PD.PDF";
export const JOHNSON_URL =
  "https://www.oalj.dol.gov/DECISIONS/ALJ/TLC/2026/Employment_and_Train_v_Johnson_2026TLC00008_(JAN_29_2026)_161818_CADEC_PD.PDF";
export const SHEFFIELD_URL =
  "https://www.dol.gov/sites/dolgov/files/OALJ/PUBLIC/ARB/DECISIONS/ARB_DECISIONS/FDA/2026-0010-FDAP.pdf";

export const CASELIST_SEEDS = [LISTING_URL, TLC_FY2026_URL, SPA_LIST_URL];

export const CARD_FIELDS = [
  "id",
  "caseNo",
  "aljNo",
  "board",
  "kind",
  "program",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export const BODY_NEEDLE_SEED = "night watch worker on a pipeline project near Orange, Texas";
export const BODY_NEEDLE_BURN = "burn pile was left burning unattended";
export const BODY_NEEDLE_DAIRY = "organic grassfed dairy farm in Wisconsin";

export type OaljBoard = "oalj" | "balca" | "arb";
export type OaljKind = "Decision and Order" | "Order" | "Decision";

export type OaljListing = {
  id: string;
  caseNo: string;
  aljNo: string;
  board: OaljBoard;
  kind: OaljKind;
  program: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
};

export type OaljCard = OaljListing & { body: string };

export type OaljSnapshot = {
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
  sources: { listing: string; caselists: string[]; pdfHosts: string[] };
  cards: OaljCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (DOL OALJ decisions; +https://www.dol.gov/agencies/oalj/topics/information/DECISIONS)";
const OFFICIAL_HOSTS = new Set(["www.oalj.dol.gov", "oalj.dol.gov", "www.dol.gov", "dol.gov"]);

export const SEED_LISTINGS: OaljListing[] = [
  {
    id: MCLAUGHLIN_ID,
    caseNo: "2026-SPA-00001",
    aljNo: "2026-SPA-00001",
    board: "oalj",
    kind: "Order",
    program: "SPA",
    institution: "McLaughlin v. Troy Construction, LLC",
    date: "2026-07-30",
    title: "Order on Respondent's Motion to Dismiss",
    sourceUrl: MCLAUGHLIN_URL,
  },
  {
    id: JOHNSON_ID,
    caseNo: "2026-TLC-00008",
    aljNo: "2026-TLC-00008",
    board: "balca",
    kind: "Decision and Order",
    program: "TLC",
    institution: "Philip Johnson dba Johnson Grass Dairy",
    date: "2026-01-29",
    title: "Decision and Order Affirming Denial of Certification",
    sourceUrl: JOHNSON_URL,
  },
  {
    id: SHEFFIELD_ID,
    caseNo: "2026-0010",
    aljNo: "2025-FDA-00018",
    board: "arb",
    kind: "Decision and Order",
    program: "FDA",
    institution: "Sheffield v. Tyson Foods, Inc.",
    date: "2026-03-11",
    title: "Decision and Order",
    sourceUrl: SHEFFIELD_URL,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function oaljDecisionsDir(): string {
  if (env("OALJ_DECISIONS_DIR")) return resolve(env("OALJ_DECISIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/oalj-decisions"));
}

export function snapshotPath(): string {
  return join(oaljDecisionsDir(), "snapshot.json");
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
  if (named) {
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
    const key = named[1].toLowerCase().replace(/\.$/, "");
    const mm = months[key];
    return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
  }
  return null;
}

export function normalizeCaseNo(raw: string | null | undefined): string {
  if (!raw) return "";
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const alj = compact.match(/^(\d{4})-([A-Z]{2,6})-(\d{1,5})$/);
  if (alj) return `${alj[1]}-${alj[2]}-${alj[3].padStart(5, "0")}`;
  const glued = compact.match(/^(\d{4})([A-Z]{2,6})(\d{1,5})$/);
  if (glued) return `${glued[1]}-${glued[2]}-${glued[3].padStart(5, "0")}`;
  const arb = compact.match(/^(\d{4})-(\d{1,5})$/);
  if (arb) return `${arb[1]}-${arb[2].padStart(4, "0")}`;
  return compact;
}

export function catalogId(caseNo: string): string {
  return normalizeCaseNo(caseNo).toLowerCase() || "unknown";
}

export function officialOaljPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim().replace(/&amp;/g, "&");
  try {
    const parsed = new URL(trimmed, "https://www.dol.gov/");
    const host = parsed.hostname.toLowerCase();
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = parsed.pathname;
    if (COURT_PDF_RE.test(path) || /OALJ_OrgChart/i.test(path)) return null;
    if (OFLC_KILL_RE.test(path) || !/\.pdf$/i.test(path)) return null;
    const alj = path.match(ALJ_PDF_RE);
    if (alj && (host === "www.oalj.dol.gov" || host === "oalj.dol.gov")) {
      return `https://www.oalj.dol.gov${alj[0]}`;
    }
    const arb = path.match(ARB_PDF_RE);
    if (arb) {
      if (path.includes("/sites/dolgov/files/OALJ/PUBLIC/ARB/DECISIONS/")) {
        return `https://www.dol.gov${path}`;
      }
      if (host === "www.oalj.dol.gov" || host === "oalj.dol.gov") {
        return `https://www.oalj.dol.gov${path}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function caseNoFromUrl(url: string): string {
  const file = url.split("/").pop() ?? "";
  const glued = file.match(/((?:19|20)\d{2}[A-Z]{2,6}\d{3,5})/i);
  if (glued) return normalizeCaseNo(glued[1]);
  const arb = file.match(/((?:19|20)\d{2}-\d{3,5})/);
  if (arb) return normalizeCaseNo(arb[1]);
  return "";
}

export function programFromUrl(url: string): string {
  const alj = url.match(/\/DECISIONS\/ALJ\/([A-Z0-9]+)\//i);
  if (alj) return alj[1].toUpperCase();
  const arb = url.match(/\/ARB\/DECISIONS\/(?:ARB_DECISIONS\/)?([A-Z0-9]+)\//i);
  if (arb) return arb[1].toUpperCase();
  return "";
}

export function parseBoard(url: string, program: string, title: string): OaljBoard {
  if (/\/ARB\/DECISIONS\//i.test(url) || /\bARB\b/i.test(title)) return "arb";
  if (/^(TLC|INA|BALCA)$/i.test(program) || /\bBALCA\b/i.test(title)) return "balca";
  return "oalj";
}

export function parseKind(raw: string): OaljKind {
  if (/Decision and Order/i.test(raw)) return "Decision and Order";
  if (/\bOrder\b/i.test(raw) && !/\bDecision\b/i.test(raw)) return "Order";
  return "Decision";
}

export function isOflcDisclosureKill(text: string): boolean {
  if (OFLC_KILL_RE.test(text)) return true;
  if (/^CASE_NUMBER,CASE_STATUS/i.test(text.trim())) return true;
  if (/\.xlsx\b/i.test(text) && /dol\.gov\/media/i.test(text)) return true;
  return false;
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

export function isCourtDecisionBody(text: string): boolean {
  return /UNITED STATES COURT OF APPEALS|PER CURIAM/i.test(text) && /v\.\s*USDOL/i.test(text);
}

export function isCaselistHtmlOnly(text: string): boolean {
  return /<html[\s>]/i.test(text) && /caselist|FY \d{4} TLC Decisions|CASELISTS/i.test(text);
}

export function keepListing(
  row: Pick<OaljListing, "caseNo" | "kind" | "title" | "sourceUrl" | "institution">,
): boolean {
  if (!officialOaljPdfUrl(row.sourceUrl)) return false;
  const hay = `${row.caseNo} ${row.kind} ${row.title} ${row.institution} ${row.sourceUrl}`;
  if (isOflcDisclosureKill(hay)) return false;
  if (COURT_PDF_RE.test(row.sourceUrl)) return false;
  if (SKIP_KIND_RE.test(row.title) || SKIP_KIND_RE.test(row.kind)) return false;
  if (!KEEP_KIND_RE.test(`${row.kind} ${row.title}`)) return false;
  return Boolean(row.caseNo);
}

export function isRealOaljDecisionBody(text: string): boolean {
  if (
    isFrMirrorBody(text) ||
    isFederalRegisterHtml(text) ||
    isOflcDisclosureKill(text) ||
    isCourtDecisionBody(text) ||
    isCaselistHtmlOnly(text)
  ) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 800) return false;
  const dol =
    /U\.S\.\s*Department of Labor|Office of Administrative Law Judges|Board of Alien Labor Certification Appeals|Administrative Review Board/i.test(
      text,
    );
  const decision = /DECISION AND ORDER|\bDECISION\b|\bORDER\b/i.test(text);
  const slip = /It is hereby ORDERED|SO ORDERED|OALJ No\.|BALCA Case No\.|ARB Case No\./i.test(text);
  return dol && decision && slip;
}

function emptySources(): OaljSnapshot["sources"] {
  return {
    listing: LISTING_URL,
    caselists: [...CASELIST_SEEDS],
    pdfHosts: [`https://${ALJ_HOST}/DECISIONS/ALJ/`, `https://${ARB_HOST}/sites/dolgov/files/OALJ/PUBLIC/ARB/DECISIONS/`],
  };
}

export function parseCaselistHtml(html: string): OaljListing[] {
  const out: OaljListing[] = [];
  const seen = new Set<string>();
  const blocks = html.split(/<(?:p|h2|li)\b/i).slice(1);
  let pendingParty = "";
  let pendingCase = "";
  for (const block of blocks) {
    const text = stripTags(block);
    const hrefs = [...block.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
    const caseHit = text.match(
      /\b((?:19|20)\d{2}[- ][A-Z]{2,6}[- ]?\d{1,5}|(?:19|20)\d{2}[- ]\d{3,5})\b/i,
    );
    if (caseHit && !hrefs.some((h) => officialOaljPdfUrl(h))) {
      pendingCase = normalizeCaseNo(caseHit[1]);
      pendingParty = text
        .replace(caseHit[0], "")
        .replace(/^[,:\s]+/, "")
        .replace(/\s+/g, " ")
        .trim();
      continue;
    }
    for (const href of hrefs) {
      const sourceUrl = officialOaljPdfUrl(href);
      if (!sourceUrl) continue;
      const fromUrl = caseNoFromUrl(sourceUrl);
      const caseNo = fromUrl || pendingCase || normalizeCaseNo(text.match(CASE_NO_RE)?.[1] ?? "");
      if (!caseNo) continue;
      const title = text.replace(/\s+/g, " ").replace(/\bPDF\b/gi, "").trim() || pendingParty || caseNo;
      const listing: OaljListing = {
        id: catalogId(caseNo),
        caseNo,
        aljNo: pendingCase && pendingCase !== caseNo ? pendingCase : caseNo,
        board: parseBoard(sourceUrl, programFromUrl(sourceUrl), `${title} ${pendingParty}`),
        kind: parseKind(title),
        program: programFromUrl(sourceUrl),
        institution: pendingParty || title,
        date: isoDate(text) ?? isoDate(sourceUrl),
        title,
        sourceUrl,
      };
      if (!keepListing(listing)) continue;
      if (seen.has(listing.id) || seen.has(listing.sourceUrl.toLowerCase())) continue;
      seen.add(listing.id);
      seen.add(listing.sourceUrl.toLowerCase());
      out.push(listing);
    }
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export function parseOaljDecisionText(
  text: string,
  meta: Partial<OaljListing> & { sourceUrl: string },
): OaljCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialOaljPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const caseNo =
    normalizeCaseNo(meta.caseNo) ||
    caseNoFromUrl(sourceUrl) ||
    normalizeCaseNo(body.match(/OALJ No\.:\s*([A-Z0-9-]+)/i)?.[1] ?? "") ||
    normalizeCaseNo(body.match(/BALCA Case No\.:\s*([A-Z0-9-]+)/i)?.[1] ?? "") ||
    normalizeCaseNo(body.match(/ARB Case No\.:\s*([A-Z0-9-]+)/i)?.[1] ?? "");
  const aljNo =
    normalizeCaseNo(meta.aljNo) ||
    normalizeCaseNo(body.match(/ALJ Case No\.:\s*([A-Z0-9-]+)/i)?.[1] ?? "") ||
    caseNo;
  const date = meta.date ?? isoDate(body.slice(0, 800));
  const caption = body
    .match(/In the Matter of:\s*([\s\S]{8,180}?)\n\s*(?:ORDER|DECISION)/i)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
  return {
    id: meta.id || catalogId(caseNo),
    caseNo,
    aljNo,
    board: meta.board || parseBoard(sourceUrl, meta.program || programFromUrl(sourceUrl), body.slice(0, 400)),
    kind: meta.kind || parseKind(`${meta.title ?? ""} ${body.slice(0, 400)}`),
    program: meta.program || programFromUrl(sourceUrl),
    institution: (meta.institution && meta.institution.trim()) || caption || caseNo,
    date,
    title: meta.title || caption || `DOL Decision ${caseNo}`,
    sourceUrl,
    body,
  };
}

export function emptyOaljDecisionsSnapshot(reason: string): OaljSnapshot {
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

export function assembleOaljDecisionsSnapshot(cards: OaljCard[], fetchedAt?: string): OaljSnapshot {
  const kept = cards.filter((c) => isRealOaljDecisionBody(c.body) && keepListing(c));
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
    reason: kept.length ? null : "Official DOL OALJ / BALCA / ARB Decision PDFs had no extractable Decision/Order text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): OaljSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as OaljSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleOaljDecisionsSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readOaljDecisionsSnapshot(): OaljSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeOaljDecisionsSnapshot(snap: OaljSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchOaljText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/json" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchOaljBytes(url: string): Promise<Uint8Array> {
  const official = officialOaljPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("OALJ_DECISIONS_PDFTOTEXT") || "pdftotext";
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
  return env("OALJ_DECISIONS_HTML_DIR") || env("OALJ_DECISIONS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("OALJ_DECISIONS_LIMIT", "4"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 4;
}

function maxFetchLimit(): number {
  const n = Number(env("OALJ_DECISIONS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxCaselistPages(): number {
  const n = Number(env("OALJ_DECISIONS_CASELISTS", "6"));
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

function mergeListings(listed: OaljListing[]): OaljListing[] {
  const seen = new Set<string>();
  const out: OaljListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepListing(row)) continue;
    const id = row.id || catalogId(row.caseNo);
    if (!id || seen.has(id) || seen.has(row.sourceUrl.toLowerCase())) continue;
    seen.add(id);
    seen.add(row.sourceUrl.toLowerCase());
    out.push({ ...row, id });
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export function discoverCaselistUrls(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/href="([^"]+)"/gi)) {
    try {
      const url = new URL(match[1], baseUrl);
      const href = url.href;
      if (seen.has(href)) continue;
      if (!OFFICIAL_HOSTS.has(url.hostname.toLowerCase())) continue;
      if (!/CASELISTS|TLC_DECISIONS|SPALIST|ARB.*DECISIONS|REFERENCES\/CASELISTS/i.test(href)) continue;
      if (/\.pdf$/i.test(href) || OFLC_KILL_RE.test(href)) continue;
      seen.add(href);
      out.push(href);
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function walkOfficialOaljDecisions(): Promise<{ listed: OaljListing[]; listedCount: number }> {
  const queue = [...CASELIST_SEEDS];
  const seenPages = new Set<string>();
  const listed: OaljListing[] = [];
  const cap = maxCaselistPages();
  while (queue.length && seenPages.size < cap) {
    const page = queue.shift();
    if (!page || seenPages.has(page)) continue;
    seenPages.add(page);
    try {
      const html = await fetchOaljText(page);
      listed.push(...parseCaselistHtml(html));
      for (const next of discoverCaselistUrls(html, page)) {
        if (!seenPages.has(next) && queue.length + seenPages.size < cap) queue.push(next);
      }
    } catch {
      /* keep walking */
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: OaljListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = html ? parseCaselistHtml(html) : [];
    const merged = mergeListings(listed);
    return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialOaljDecisions();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectOaljDecisions(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<OaljSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = oaljDecisionsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, OaljCard>();
  for (const card of readOaljDecisionsSnapshot()?.cards ?? []) {
    if (isRealOaljDecisionBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const cards: OaljCard[] = [];
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
        [`${row.id}.txt`, `${row.caseNo}.txt`, `${row.caseNo.toLowerCase()}.txt`].filter(Boolean),
      );
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialOaljPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchOaljBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (isFrMirrorBody(text) || isOflcDisclosureKill(text) || isFederalRegisterHtml(text) || isCourtDecisionBody(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseOaljDecisionText(text, { ...row, sourceUrl });
      if (!isRealOaljDecisionBody(parsed.body) || !keepListing(parsed)) {
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
    ...assembleOaljDecisionsSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeOaljDecisionsSnapshot(snap);
  return snap;
}

export async function loadOaljDecisions(): Promise<OaljSnapshot> {
  const cached = readOaljDecisionsSnapshot();
  if (cached && cached.cards.some((c) => isRealOaljDecisionBody(c.body))) return cached;
  try {
    return await collectOaljDecisions();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live DOL OALJ Decision fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyOaljDecisionsSnapshot(
      `DOL OALJ / BALCA / ARB Decision PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildOaljDecisionsManifest(snap: OaljSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealOaljDecisionBody(c.body) && keepListing(c));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      OALJ_DECISIONS_PATH,
      "Count + case number + board + date + institution only. Decision/Order body is the paid GET /oalj-decisions payload. This free manifest lists the full catalog. Harvest DOL-authored OALJ / BALCA / ARB Decision/Order PDFs only. OFLC disclosure XLSX/CSV, FR HTML wraps, and caselist HTML-only are not this SKU.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: OALJ_DECISIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: OALJ_DECISIONS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      caseNo: c.caseNo,
      aljNo: c.aljNo,
      board: c.board,
      kind: c.kind,
      program: c.program,
      date: c.date,
      title: c.title,
      sourceUrl: c.sourceUrl,
    })),
    schema: {
      fields: ["id", "institution", "caseNo", "aljNo", "board", "kind", "program", "date", "title", "sourceUrl"],
    },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterOaljDecisionsManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "caseNo", "aljNo", "board", "kind", "program", "date", "title"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadOaljDecisionsManifest(q?: string): Promise<Record<string, unknown>> {
  return filterOaljDecisionsManifest(buildOaljDecisionsManifest(readOaljDecisionsSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectOaljDecisions()
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
              caseNo: c.caseNo,
              aljNo: c.aljNo,
              board: c.board,
              kind: c.kind,
              program: c.program,
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
