#!/usr/bin/env node
/**
 * FTC cases-proceedings ALJ Decision / Commission Decision-and-Order TEXT door.
 * Official PDFs linked from ftc.gov/legal-library/browse/cases-proceedings
 * case pages (OSCAR /system/files/ftc_gov/pdf/). 17 U.S.C. § 105.
 * Harvest ALJ Decision and Commission Decision and Order PDFs only.
 * Skip /ftc-wl warning letters, complaints, ACCO/AAPC, motions, briefs,
 * FR HTML wraps, and CourtListener mirrors. Not /dea-orders.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const FTC_ORDERS_PATH = "/ftc-orders";
export const FTC_ORDERS_MANIFEST_PATH = "/ftc-orders/manifest.json";
export const FTC_ORDERS_AMOUNT_ATOMIC = "50000";
export const FTC_ORDERS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "ftc-order-bodies";
export const PRODUCT_NAME = "FTC ALJ Decision / Commission Decision and Order text";

export const LISTING_URL = "https://www.ftc.gov/legal-library/browse/cases-proceedings";
export const CASE_BASE = "https://www.ftc.gov/legal-library/browse/cases-proceedings/";
export const PDF_BASE = "https://www.ftc.gov/system/files/ftc_gov/pdf/";
export const CASE_PATH_RE = /\/legal-library\/browse\/cases-proceedings\/([a-z0-9][a-z0-9-]*)/i;
export const PDF_PATH_RE = /\/system\/files\/(?:ftc_gov\/pdf\/)([^"'?\s]+\.pdf)/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Federal Trade Commission. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const SCOTT_ID = "9449-2026-08-31";
export const OVERLY_ID = "9443-2026-01-27";
export const JUAREZ_ID = "9444-2026-04-28";
export const BERETTA_ID = "berettaruger-2026-09-16";

export const SCOTT_URL =
  "https://www.ftc.gov/system/files/ftc_gov/pdf/616193.2026.08.31_administrative_law_judge_decision_on_application_for_review_0.pdf";
export const OVERLY_URL =
  "https://www.ftc.gov/system/files/ftc_gov/pdf/614746.2026.01.27_administrative_law_judge_decision_on_application_for_review.pdf";
export const JUAREZ_URL =
  "https://www.ftc.gov/system/files/ftc_gov/pdf/615347.2026.04.28_decision_of_the_administrative_law_judge_on_petition_for_review.pdf";
export const BERETTA_URL = "https://www.ftc.gov/system/files/ftc_gov/pdf/Beretta-Ruger-Order.pdf";

export const SCOTT_SLUG = "jason-scott-dvm-matter";
export const OVERLY_SLUG = "larry-rickman-overly-matter";
export const JUAREZ_SLUG = "eusabio-juarez-ruffino-matter";
export const BERETTA_SLUG = "berettaruger";

export const SEED_CASES = [SCOTT_SLUG, OVERLY_SLUG, JUAREZ_SLUG, BERETTA_SLUG];

export const BODY_NEEDLE_SCOTT = "Banned Substances on his veterinary SUV";
export const BODY_NEEDLE_OVERLY = "HIWU’s Discovery of Testosterone and Isoxsuprine";
export const BODY_NEEDLE_JUAREZ = "diisopropylamine (“dipa”)";
export const BODY_NEEDLE_BERETTA = "familial, personal, financial, contractual, professional";

export const CARD_FIELDS = [
  "id",
  "docket",
  "oscar",
  "kind",
  "board",
  "institution",
  "date",
  "title",
  "filename",
  "sourceUrl",
  "caseUrl",
  "body",
] as const;

export type FtcOrderBoard = "alj" | "commission";
export type FtcOrderKind = "ALJ Decision" | "Decision and Order";

export type FtcOrderListing = {
  id: string;
  docket: string;
  oscar: string;
  kind: FtcOrderKind;
  board: FtcOrderBoard;
  institution: string;
  date: string | null;
  title: string;
  filename: string;
  sourceUrl: string;
  caseUrl: string;
};

export type FtcOrderCard = FtcOrderListing & { body: string };

export type FtcOrderSnapshot = {
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
  sources: { listing: string; caseBase: string; pdfHost: string };
  cards: FtcOrderCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (FTC cases-proceedings ALJ / Decision and Order; +https://www.ftc.gov/legal-library/browse/cases-proceedings)";
const OFFICIAL_HOSTS = new Set(["www.ftc.gov", "ftc.gov", "search.ftc.gov"]);

export const SEED_LISTINGS: FtcOrderListing[] = [
  {
    id: SCOTT_ID,
    docket: "9449",
    oscar: "616193",
    kind: "ALJ Decision",
    board: "alj",
    institution: "Jason Scott, DVM",
    date: "2026-08-31",
    title: "Administrative Law Judge Decision on Application for Review",
    filename: "616193.2026.08.31_administrative_law_judge_decision_on_application_for_review_0.pdf",
    sourceUrl: SCOTT_URL,
    caseUrl: `${CASE_BASE}${SCOTT_SLUG}`,
  },
  {
    id: OVERLY_ID,
    docket: "9443",
    oscar: "614746",
    kind: "ALJ Decision",
    board: "alj",
    institution: "Larry Rickman Overly, DVM",
    date: "2026-01-27",
    title: "Administrative Law Judge Decision On Review",
    filename: "614746.2026.01.27_administrative_law_judge_decision_on_application_for_review.pdf",
    sourceUrl: OVERLY_URL,
    caseUrl: `${CASE_BASE}${OVERLY_SLUG}`,
  },
  {
    id: JUAREZ_ID,
    docket: "9444",
    oscar: "615347",
    kind: "ALJ Decision",
    board: "alj",
    institution: "Eusebio Juarez-Rufino",
    date: "2026-04-28",
    title: "Decision of the Administrative Law Judge on Petition for Review",
    filename: "615347.2026.04.28_decision_of_the_administrative_law_judge_on_petition_for_review.pdf",
    sourceUrl: JUAREZ_URL,
    caseUrl: `${CASE_BASE}${JUAREZ_SLUG}`,
  },
  {
    id: BERETTA_ID,
    docket: "",
    oscar: "",
    kind: "Decision and Order",
    board: "commission",
    institution: "Beretta Holding S.A.",
    date: "2026-09-16",
    title: "Decision and Order",
    filename: "Beretta-Ruger-Order.pdf",
    sourceUrl: BERETTA_URL,
    caseUrl: `${CASE_BASE}${BERETTA_SLUG}`,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ftcOrdersDir(): string {
  if (env("FTC_ORDERS_DIR")) return resolve(env("FTC_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ftc-orders"));
}

export function snapshotPath(): string {
  return join(ftcOrdersDir(), "snapshot.json");
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
  const dotted = raw.match(/\b(\d{4})\.(\d{2})\.(\d{2})\b/);
  if (dotted) return `${dotted[1]}-${dotted[2]}-${dotted[3]}`;
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const named = raw.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/i,
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

export function slugFromCaseUrl(url: string): string | null {
  const m = url.match(CASE_PATH_RE);
  if (!m) return null;
  const slug = m[1].toLowerCase();
  if (slug === "adjudicative-proceedings" || slug === "commissioner-statements") return null;
  if (/-timeline-item-/.test(slug)) return null;
  return slug;
}

export function officialFtcPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim().replace(/&amp;/g, "&");
  try {
    const parsed = new URL(trimmed, "https://www.ftc.gov");
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") {
      const inner = parsed.pathname.match(/\/https?:\/\/(?:www\.)?ftc\.gov(\/system\/files\/.+)/i);
      return inner ? officialFtcPdfUrl(`https://www.ftc.gov${inner[1]}`) : null;
    }
    if (host === "search.ftc.gov") {
      return officialFtcPdfUrl(`https://www.ftc.gov${parsed.pathname}${parsed.search}`);
    }
    if (!OFFICIAL_HOSTS.has(host)) return null;
    if (/federalregister\.gov|courtlistener\.com|dea\.gov/i.test(parsed.href)) return null;
    if (/\/legal-library\/browse\/warning-letters\//i.test(parsed.pathname)) return null;
    if (/\/system\/files\/warning-letters\//i.test(parsed.pathname)) return null;
    const pdf = parsed.pathname.match(PDF_PATH_RE);
    if (!pdf) return null;
    return `${PDF_BASE}${pdf[1]}`;
  } catch {
    return null;
  }
}

export function officialCaseUrl(urlOrSlug: string | null | undefined): string | null {
  if (!urlOrSlug) return null;
  const slug = slugFromCaseUrl(urlOrSlug) || (/^[a-z0-9][a-z0-9-]*$/i.test(urlOrSlug) ? urlOrSlug : null);
  return slug ? `${CASE_BASE}${slug.toLowerCase()}` : null;
}

export function oscarFromFilename(filename: string): string {
  const m = filename.match(/^(\d{6})\./);
  return m ? m[1] : "";
}

export function catalogId(docket: string, date: string | null, slug: string): string {
  const dock = (docket || "").replace(/\D/g, "");
  if (dock && date) return `${dock}-${date}`;
  const cleanSlug = (slug || "unknown").toLowerCase();
  if (date) return `${cleanSlug}-${date}`;
  return cleanSlug;
}

export function parseKind(raw: string): FtcOrderKind | null {
  const title = raw.replace(/\s+/g, " ").trim();
  if (/Vacating Administrative Law Judge|Granting Petition for Review/i.test(title)) return null;
  if (/Agreement Containing Consent|Analysis of Agreement/i.test(title)) return null;
  if (/warning letter/i.test(title)) return null;
  if (/^Complaint\b/i.test(title)) return null;
  if (/^(?:Decision and Order|Decision & Order)\b/i.test(title)) return "Decision and Order";
  if (/^(?:Administrative Law Judge Decision|Decision of the Administrative Law Judge)\b/i.test(title)) {
    return "ALJ Decision";
  }
  return null;
}

export function parseBoard(kind: FtcOrderKind): FtcOrderBoard {
  return kind === "ALJ Decision" ? "alj" : "commission";
}

export function isFrMirrorBody(text: string): boolean {
  if (/federalregister\.gov|govinfo\.gov\/content\/pkg\/FR/i.test(text)) return true;
  return /(?:^|\s|>)AGENCY:\s*/im.test(text) && /(?:^|\s|>)ACTION:\s*/im.test(text) && /(?:^|\s|>)SUMMARY:\s*/im.test(text);
}

export function isFederalRegisterHtml(text: string): boolean {
  return /<html[\s>]/i.test(text) && /Federal Register/i.test(text) && /AGENCY:/i.test(text);
}

export function isCourtListenerMirror(text: string): boolean {
  return /courtlistener\.com/i.test(text) || (/CourtListener/i.test(text) && /Filed:/i.test(text));
}

export function isWarningLetterBody(text: string): boolean {
  return /Bureau of Consumer Protection/i.test(text) && /warning letter/i.test(text);
}

export function isCaseHtmlOnly(text: string): boolean {
  return (
    /<html[\s>]/i.test(text) &&
    /node--type-case|cases-proceedings|field--name-field-docket-number/i.test(text) &&
    !/ADMINISTRATIVE LAW JUDGE DECISION|DECISION OF THE ADMINISTRATIVE LAW JUDGE|DECISION AND ORDER/i.test(text)
  );
}

export function keepListing(
  row: Pick<FtcOrderListing, "kind" | "title" | "sourceUrl" | "institution" | "caseUrl">,
): boolean {
  if (!officialFtcPdfUrl(row.sourceUrl)) return false;
  if (!parseKind(row.kind) && !parseKind(row.title)) return false;
  const hay = `${row.kind} ${row.title} ${row.institution} ${row.sourceUrl} ${row.caseUrl}`;
  if (/warning-letters|warning letter|dea\.gov|courtlistener|federalregister/i.test(hay)) return false;
  return true;
}

export function isRealFtcOrderBody(text: string): boolean {
  if (
    isFrMirrorBody(text) ||
    isFederalRegisterHtml(text) ||
    isCourtListenerMirror(text) ||
    isWarningLetterBody(text) ||
    isCaseHtmlOnly(text)
  ) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 800) return false;
  const ftc = /FEDERAL TRADE COMMISSION|Federal Trade Commission/i.test(text);
  const docket = /Docket\s+No\.?/i.test(text);
  const decision =
    /ADMINISTRATIVE LAW JUDGE DECISION|DECISION OF THE ADMINISTRATIVE LAW JUDGE|DECISION AND ORDER/i.test(text);
  return ftc && docket && decision;
}

function emptySources(): FtcOrderSnapshot["sources"] {
  return { listing: LISTING_URL, caseBase: CASE_BASE, pdfHost: PDF_BASE };
}

export function caseUrl(slug: string): string {
  return `${CASE_BASE}${slug.replace(/\/+$/, "")}`;
}

export function discoverCaseSlugs(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/\babout="([^"]+)"/gi)) {
    const slug = slugFromCaseUrl(match[1]);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  for (const match of html.matchAll(/href="([^"]+)"/gi)) {
    const slug = slugFromCaseUrl(match[1]);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

export function parseDocket(html: string): string {
  const field = html.match(
    /field--name-field-docket-number[\s\S]{0,400}?field__item">\s*([^<]+)/i,
  );
  if (field) {
    const n = field[1].replace(/\D/g, "");
    if (n) return n;
  }
  const text = stripTags(html);
  return text.match(/Docket(?:\s+Number|\s+No\.?)\s*([0-9]{3,5})/i)?.[1] ?? "";
}

export function parseInstitution(html: string): string {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const name = stripTags(h1[1]).replace(/,?\s*In the Matter of\.?$/i, "").trim();
    if (name) return name;
  }
  return "";
}

export function parseCaseHtml(html: string, pageSlug = ""): FtcOrderListing[] {
  const out: FtcOrderListing[] = [];
  const seen = new Set<string>();
  const slug = slugFromCaseUrl(pageSlug) || slugFromCaseUrl(html) || pageSlug;
  const docket = parseDocket(html);
  const institution = parseInstitution(html);
  const caseHref = officialCaseUrl(slug) || (slug ? caseUrl(slug) : "");
  const anchors = html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi);
  for (const match of anchors) {
    const sourceUrl = officialFtcPdfUrl(match[1]);
    if (!sourceUrl) continue;
    const title = stripTags(match[2]);
    const kind = parseKind(title);
    if (!kind) continue;
    const filename = decodeURIComponent(sourceUrl.split("/").pop() || "");
    const date =
      isoDate(filename) ||
      isoDate(html.slice(Math.max(0, match.index ?? 0) - 240, (match.index ?? 0) + 80));
    const listing: FtcOrderListing = {
      id: catalogId(docket, date, slug),
      docket,
      oscar: oscarFromFilename(filename),
      kind,
      board: parseBoard(kind),
      institution: institution || title,
      date,
      title,
      filename,
      sourceUrl,
      caseUrl: caseHref,
    };
    if (!keepListing(listing)) continue;
    if (seen.has(listing.id) || seen.has(listing.sourceUrl)) continue;
    seen.add(listing.id);
    seen.add(listing.sourceUrl);
    out.push(listing);
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export function parseListingHtml(html: string): string[] {
  return discoverCaseSlugs(html);
}

export function parseFtcOrderText(
  text: string,
  meta: Partial<FtcOrderListing> & { sourceUrl: string },
): FtcOrderCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFtcPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket =
    meta.docket ||
    body.match(/Docket\s+No\.?\s*C?\s*([0-9]{3,5})/i)?.[1] ||
    "";
  const filename = meta.filename || decodeURIComponent(sourceUrl.split("/").pop() || "");
  const date = meta.date ?? isoDate(filename) ?? isoDate(body.slice(0, 900));
  const kind = meta.kind || parseKind(`${meta.title ?? ""} ${body.slice(0, 500)}`) || "ALJ Decision";
  const slug = slugFromCaseUrl(meta.caseUrl || "") || "";
  return {
    id: meta.id || catalogId(docket, date, slug || filename.replace(/\.pdf$/i, "")),
    docket,
    oscar: meta.oscar || oscarFromFilename(filename),
    kind,
    board: meta.board || parseBoard(kind),
    institution: (meta.institution && meta.institution.trim()) || docket || kind,
    date,
    title: meta.title || kind,
    filename,
    sourceUrl,
    caseUrl: officialCaseUrl(meta.caseUrl || "") || meta.caseUrl || "",
    body,
  };
}

export function emptyFtcOrdersSnapshot(reason: string): FtcOrderSnapshot {
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

export function assembleFtcOrdersSnapshot(cards: FtcOrderCard[], fetchedAt?: string): FtcOrderSnapshot {
  const kept = cards.filter((c) => isRealFtcOrderBody(c.body) && keepListing(c));
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
    reason: kept.length
      ? null
      : "Official FTC cases-proceedings ALJ Decision / Decision and Order PDFs had no extractable text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): FtcOrderSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FtcOrderSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleFtcOrdersSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readFtcOrdersSnapshot(): FtcOrderSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeFtcOrdersSnapshot(snap: FtcOrderSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchFtcText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchFtcBytes(url: string): Promise<{ bytes: Uint8Array; finalUrl: string }> {
  const official = officialFtcPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error(`${official} is not an official PDF`);
  }
  return { bytes, finalUrl: res.url || official };
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FTC_ORDERS_PDFTOTEXT") || "pdftotext";
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
  return env("FTC_ORDERS_HTML_DIR") || env("FTC_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("FTC_ORDERS_LIMIT", "4"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 4;
}

function maxFetchLimit(): number {
  const n = Number(env("FTC_ORDERS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxCasePages(): number {
  const n = Number(env("FTC_ORDERS_CASES", "8"));
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

function mergeListings(listed: FtcOrderListing[]): FtcOrderListing[] {
  const seen = new Set<string>();
  const out: FtcOrderListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepListing(row)) continue;
    const id = row.id || catalogId(row.docket, row.date, slugFromCaseUrl(row.caseUrl) || "");
    if (!id || seen.has(id) || seen.has(row.sourceUrl)) continue;
    seen.add(id);
    seen.add(row.sourceUrl);
    out.push({ ...row, id });
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export async function walkOfficialFtcOrders(): Promise<{ listed: FtcOrderListing[]; listedCount: number }> {
  const queue = [...SEED_CASES];
  const seenPages = new Set<string>();
  const listed: FtcOrderListing[] = [];
  const cap = maxCasePages();
  try {
    const listingHtml = await fetchFtcText(LISTING_URL);
    for (const slug of discoverCaseSlugs(listingHtml)) {
      if (!queue.includes(slug)) queue.push(slug);
    }
  } catch {
    /* keep seeds */
  }
  while (queue.length && seenPages.size < cap) {
    const slug = queue.shift();
    if (!slug || seenPages.has(slug)) continue;
    seenPages.add(slug);
    try {
      const html = await fetchFtcText(caseUrl(slug));
      listed.push(...parseCaseHtml(html, slug));
      for (const next of discoverCaseSlugs(html)) {
        if (!seenPages.has(next) && queue.length + seenPages.size < cap) queue.push(next);
      }
    } catch {
      /* keep walking */
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: FtcOrderListing[]; listedCount: number }> {
  if (dir) {
    const listed: FtcOrderListing[] = [];
    const listingHtml = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const slugs = listingHtml ? discoverCaseSlugs(listingHtml) : [...SEED_CASES];
    for (const slug of [...new Set([...SEED_CASES, ...slugs])]) {
      const html = readNamedFile(dir, [`${slug}.html`, `${slug}.htm`]);
      if (html) listed.push(...parseCaseHtml(html, slug));
    }
    const merged = mergeListings(listed);
    return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialFtcOrders();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectFtcOrders(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FtcOrderSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ftcOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, FtcOrderCard>();
  for (const card of readFtcOrdersSnapshot()?.cards ?? []) {
    if (isRealFtcOrderBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const cards: FtcOrderCard[] = [];
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
        [`${row.id}.txt`, `${row.oscar}.txt`, `${row.filename.replace(/\.pdf$/i, "")}.txt`].filter(Boolean),
      );
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialFtcPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            const got = await fetchFtcBytes(sourceUrl);
            writeFileSync(pdfFile, got.bytes);
            fetchedPdfs += 1;
          } else {
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (
        isFrMirrorBody(text) ||
        isFederalRegisterHtml(text) ||
        isCourtListenerMirror(text) ||
        isWarningLetterBody(text) ||
        isCaseHtmlOnly(text)
      ) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseFtcOrderText(text, { ...row, sourceUrl });
      if (!isRealFtcOrderBody(parsed.body) || !keepListing(parsed)) {
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
    ...assembleFtcOrdersSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeFtcOrdersSnapshot(snap);
  return snap;
}

export async function loadFtcOrders(): Promise<FtcOrderSnapshot> {
  const cached = readFtcOrdersSnapshot();
  if (cached && cached.cards.some((c) => isRealFtcOrderBody(c.body))) return cached;
  try {
    return await collectFtcOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live FTC cases-proceedings fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyFtcOrdersSnapshot(
      `FTC cases-proceedings ALJ Decision / Decision and Order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFtcOrdersManifest(snap: FtcOrderSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFtcOrderBody(c.body) && keepListing(c));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      FTC_ORDERS_PATH,
      "Count + docket + OSCAR + date + institution only. ALJ Decision / Commission Decision and Order body is the paid GET /ftc-orders payload. This free manifest lists the full catalog. Harvest FTC-authored cases-proceedings ALJ Decision and Decision and Order PDFs only. Warning letters (/ftc-wl), complaints, ACCO/AAPC, FR HTML wraps, and CourtListener mirrors are not this SKU.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: FTC_ORDERS_AMOUNT_ATOMIC,
    oneAmountAtomic: FTC_ORDERS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      docket: c.docket,
      oscar: c.oscar,
      kind: c.kind,
      board: c.board,
      date: c.date,
      title: c.title,
      sourceUrl: c.sourceUrl,
    })),
    schema: {
      fields: ["id", "institution", "docket", "oscar", "kind", "board", "date", "title", "sourceUrl"],
    },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterFtcOrdersManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "docket", "oscar", "kind", "board", "date", "title"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadFtcOrdersManifest(q?: string): Promise<Record<string, unknown>> {
  return filterFtcOrdersManifest(buildFtcOrdersManifest(readFtcOrdersSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFtcOrders()
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
              oscar: c.oscar,
              kind: c.kind,
              board: c.board,
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
