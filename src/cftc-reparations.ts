#!/usr/bin/env node
/**
 * CFTC reparations disposition + Commission opinion TEXT door.
 * Official PDFs from the HTML indexes only. ?_format=json is HTTP 406
 * ("Supported formats: html"). jsonapi and /api are 404. No free structured body.
 * Dispositions: https://www.cftc.gov/LawRegulation/Dispositions/index.htm
 * Opinions:     https://www.cftc.gov/LawRegulation/OpinionsAdjudicatoryOrders/index.htm
 * PDF host:     https://www.cftc.gov/sites/default/files/YYYY/MM/*.pdf
 * 17 U.S.C. § 105. Same extracted-body pipe as /cftc-orders, /nlrb-decisions,
 * and /eeoc-appellate.
 * Reparations dockets are YY-R### (26-R021). Not /cftc-orders (enforcement
 * institution orders such as Docket No. 26-04 under /media/{id}/download).
 * Statutory-disqualification dispositions (SD ##-##) stay off this door.
 * Commission opinions on the opinions index stay, including reparations appeals
 * and other adjudicatory orders (YY-E-##, CRAA).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const CFTC_REPARATIONS_PATH = "/cftc-reparations";
export const CFTC_REPARATIONS_MANIFEST_PATH = "/cftc-reparations/manifest.json";
export const CFTC_REPARATIONS_AMOUNT_ATOMIC = "50000";
export const CFTC_REPARATIONS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "cftc-reparations-bodies";
export const PRODUCT_NAME = "CFTC reparations disposition and Commission opinion text";

export const DISPOSITIONS_URL = "https://www.cftc.gov/LawRegulation/Dispositions/index.htm";
export const OPINIONS_URL = "https://www.cftc.gov/LawRegulation/OpinionsAdjudicatoryOrders/index.htm";
export const PDF_ORIGIN = "https://www.cftc.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Commodity Futures Trading Commission. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const SKU_KINDS = ["disposition", "opinion"] as const;
export type CftcReparationsKind = (typeof SKU_KINDS)[number];

const REPARATIONS_DOCKET_RE = /\b(\d{2}-R\d{2,4})\b/gi;
const OTHER_DOCKET_RE = /\b((?:SD|CRAA)\s+\d{2}-\d{2,4}|\d{2}-E-\d{2,4})\b/gi;
const FILES_RE = /^\/sites\/default\/files\/\d{4}\/\d{2}\/[^/?#]+\.pdf$/i;
const ENFORCEMENT_DOCKET_RE = /CFTC\s+Docket\s+No\.\s*\d{2}-\d{2}\b/i;
const ENFORCEMENT_OIP_RE = /ORDER INSTITUTING PROCEEDINGS/i;

export const ASMAD_ID = "cftc-disposition-26-r021-2026-09-29";
export const NIKOLOSKI_ID = "cftc-disposition-26-r030-2026-09-18";
export const RUARK_ID = "cftc-disposition-26-r032-2026-09-18";
export const AMA_ID = "cftc-disposition-25-r015-2026-04-17";
export const SHAH_ID = "cftc-opinion-23-r001-2025-12-12";

export const ASMAD_URL = "https://www.cftc.gov/sites/default/files/2026/09/Asmad092926.pdf";
export const NIKOLOSKI_URL = "https://www.cftc.gov/sites/default/files/2026/09/Nikoloski091826.pdf";
export const RUARK_URL = "https://www.cftc.gov/sites/default/files/2026/09/Ruark09182026.pdf";
export const AMA_URL = "https://www.cftc.gov/sites/default/files/2026/04/idAMA041726.pdf";
export const SHAH_URL = "https://www.cftc.gov/sites/default/files/2025/12/ogcOrderShah12122025.pdf";

/** Phrases from the PDF text that are not on the HTML index. */
export const BODY_NEEDLE_ASMAD = "purported account statement";
export const BODY_NEEDLE_NIKOLOSKI = "vulnerable client procedures";
export const BODY_NEEDLE_RUARK = "losses in excess of $150,000";
export const BODY_NEEDLE_AMA = "Andy Movsesian";
export const BODY_NEEDLE_SHAH = "ORDER OF SUMMARY AFFIRMANCE";

export const CARD_FIELDS = [
  "id",
  "docket",
  "dockets",
  "caseNo",
  "kind",
  "orderKind",
  "date",
  "institution",
  "title",
  "sourceUrl",
  "body",
] as const;

export type CftcReparationsListing = {
  id: string;
  docket: string;
  dockets: string[];
  caseNo: string;
  kind: CftcReparationsKind;
  orderKind: string;
  date: string | null;
  institution: string;
  title: string;
  sourceUrl: string;
};

export type CftcReparationsCard = CftcReparationsListing & { body: string };

export type CftcReparationsSnapshot = {
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
  sources: { dispositions: string; opinions: string };
  cards: CftcReparationsCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (CFTC reparations dispositions and opinions; +https://www.cftc.gov/)";
const OFFICIAL_HOSTS = new Set(["www.cftc.gov", "cftc.gov"]);

const MANIFEST_FIELDS = [
  "id",
  "docket",
  "dockets",
  "caseNo",
  "kind",
  "orderKind",
  "date",
  "institution",
  "title",
  "sourceUrl",
] as const;

const ORDER_KIND: Record<CftcReparationsKind, string> = {
  disposition: "Reparations disposition",
  opinion: "Commission opinion",
};

/** Pinned proof PDFs. A one-kind env still keeps both bags. */
export const SEED_LISTINGS: CftcReparationsListing[] = [
  listing("disposition", "26-R021", "2026-09-29", "Cristofer Arguedas Asmad v. Interactive Brokers, LLC", ASMAD_URL),
  listing("disposition", "26-R030", "2026-09-18", "Aleksandar Nikoloski v. Oanda Corporation", NIKOLOSKI_URL),
  listing("disposition", "26-R032", "2026-09-18", "Nathan Ruark v. AMP Global Clearing LLC", RUARK_URL),
  listing("disposition", "25-R015", "2026-04-17", "AMA Real Estate and Financial Services, LLC v. NinjaTrader Clearing, LLC", AMA_URL),
  listing("opinion", "23-R001", "2025-12-12", "Himanshu Shah v. GAIN Capital Group, LLC", SHAH_URL),
];

function listing(
  kind: CftcReparationsKind,
  docket: string,
  date: string,
  institution: string,
  sourceUrl: string,
): CftcReparationsListing {
  const official = officialCftcReparationsPdfUrl(sourceUrl) || sourceUrl;
  return {
    id: reparationsId(kind, docket, date, official),
    docket,
    dockets: [docket],
    caseNo: docket,
    kind,
    orderKind: ORDER_KIND[kind],
    date,
    institution,
    title: institution,
    sourceUrl: official,
  };
}

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function cftcReparationsDir(): string {
  if (env("CFTC_REPARATIONS_DIR")) return resolve(env("CFTC_REPARATIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/cftc-reparations"));
}

export function snapshotPath(): string {
  return join(cftcReparationsDir(), "snapshot.json");
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&ldquo;/gi, "“")
    .replace(/&rdquo;/gi, "”")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
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
  return null;
}

export function enabledKinds(): CftcReparationsKind[] {
  return ["disposition", "opinion"];
}

export function indexPageUrl(kind: CftcReparationsKind, page: number): string {
  const base = kind === "disposition" ? DISPOSITIONS_URL : OPINIONS_URL;
  const n = Math.max(0, Math.floor(page));
  return n === 0 ? base : `${base}?page=${n}`;
}

export function lastPageFromHtml(html: string): number {
  let last = 0;
  for (const match of html.matchAll(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const page = match[1].match(/[?&]page=(\d+)/);
    if (!page) continue;
    const n = Number(page[1]);
    if (/last/i.test(stripTags(match[2]))) return n;
    if (Number.isFinite(n) && n > last) last = n;
  }
  return last;
}

export function officialCftcReparationsPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    if (/\/media\/\d+\//i.test(parsed.pathname)) return null;
    if (/enforcementmanual/i.test(parsed.pathname)) return null;
    if (!FILES_RE.test(parsed.pathname)) return null;
    return `${PDF_ORIGIN}${parsed.pathname}`;
  } catch {
    return null;
  }
}

export function pdfStem(url: string): string {
  try {
    const name = decodeURIComponent(new URL(url, PDF_ORIGIN).pathname.split("/").pop() || "");
    return name.replace(/\.pdf$/i, "");
  } catch {
    return "";
  }
}

export function reparationsDockets(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(REPARATIONS_DOCKET_RE)) {
    const docket = match[1].toUpperCase();
    if (!out.includes(docket)) out.push(docket);
  }
  return out;
}

export function otherDockets(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(OTHER_DOCKET_RE)) {
    const docket = match[1].toUpperCase().replace(/\s+/g, " ");
    if (!out.includes(docket)) out.push(docket);
  }
  return out;
}

export function captionFromLink(title: string): string {
  return title
    .replace(/,?\s*CFTC Docket Nos?\..*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function reparationsId(kind: CftcReparationsKind, docket: string, date: string | null, sourceUrl: string): string {
  const stem = pdfStem(sourceUrl).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const key = (docket || stem || "undocketed").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `cftc-${kind}-${key}-${date || "undated"}`;
}

export function isRawPdf(text: string): boolean {
  return text.trimStart().startsWith("%PDF-");
}

export function isEnforcementInstitutionOrder(text: string): boolean {
  if (reparationsDockets(text).length > 0) return false;
  return ENFORCEMENT_OIP_RE.test(text) && ENFORCEMENT_DOCKET_RE.test(text);
}

export function isRealCftcReparationsBody(text: string): boolean {
  if (!text || isRawPdf(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 800) return false;
  if (!/COMMODITY FUTURES TRADING COMMISSION/i.test(text)) return false;
  if (isEnforcementInstitutionOrder(text)) return false;
  if (/\/media\/\d+\/[^/\s]+\/download/i.test(text) && reparationsDockets(text).length === 0) return false;
  if (reparationsDockets(text).length > 0) return true;
  if (/\bReparations\b/i.test(text)) return true;
  if (/Judgment Officer/i.test(text)) return true;
  if (/INITIAL DECISION/i.test(text)) return true;
  if (/OPINION AND ORDER|ORDER OF SUMMARY AFFIRMANCE|ADJUDICATORY ORDER/i.test(text)) return true;
  return false;
}

export function parseIndexHtml(html: string, kind: CftcReparationsKind): CftcReparationsListing[] {
  const found: CftcReparationsListing[] = [];
  const seen = new Set<string>();
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const href = (row.match(/href="([^"]+)"/i) || [])[1] || "";
    const sourceUrl = officialCftcReparationsPdfUrl(href.startsWith("http") ? href : href ? `${PDF_ORIGIN}${href}` : "");
    if (!sourceUrl) continue;
    const linkText = stripTags((row.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i) || [])[1] || "");
    const cell = stripTags(row);
    const time = (row.match(/<time[^>]*datetime="([^"]+)"/i) || [])[1] || "";
    const date = isoDate(time) || isoDate(cell);
    const reparations = reparationsDockets(`${linkText} ${cell}`);
    const others = otherDockets(`${linkText} ${cell}`);
    if (kind === "disposition" && reparations.length === 0) continue;
    const dockets = reparations.length > 0 ? reparations : others;
    const docket = dockets[0] || "";
    const institution = captionFromLink(linkText) || docket || pdfStem(sourceUrl);
    if (!institution) continue;
    let id = reparationsId(kind, docket, date, sourceUrl);
    if (seen.has(id)) id = `${id}-${pdfStem(sourceUrl).toLowerCase()}`;
    if (seen.has(id) || seen.has(sourceUrl)) continue;
    seen.add(id);
    seen.add(sourceUrl);
    found.push({
      id,
      docket,
      dockets,
      caseNo: docket,
      kind,
      orderKind: ORDER_KIND[kind],
      date,
      institution,
      title: institution,
      sourceUrl,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return found;
}

function mergeListings(rows: CftcReparationsListing[]): CftcReparationsListing[] {
  const byId = new Map<string, CftcReparationsListing>();
  for (const row of [...SEED_LISTINGS, ...rows]) {
    if (!keepListing(row)) continue;
    const prev = byId.get(row.id);
    if (!prev) {
      byId.set(row.id, row);
      continue;
    }
    byId.set(row.id, {
      ...prev,
      ...row,
      dockets: row.dockets.length > 0 ? row.dockets : prev.dockets,
      institution: row.institution || prev.institution,
      title: row.title || prev.title,
      date: row.date || prev.date,
      sourceUrl: officialCftcReparationsPdfUrl(row.sourceUrl) || prev.sourceUrl,
    });
  }
  return [...byId.values()].sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
}

export function keepListing(row: Pick<CftcReparationsListing, "kind" | "docket" | "sourceUrl">): boolean {
  if (!officialCftcReparationsPdfUrl(row.sourceUrl)) return false;
  if (row.kind === "disposition" && !/^\d{2}-R\d{2,4}$/i.test(row.docket)) return false;
  return row.kind === "disposition" || row.kind === "opinion";
}

export function parseCftcReparationsText(
  text: string,
  meta: CftcReparationsListing,
): CftcReparationsCard {
  const body = text.replace(/\f/g, "\n").trim();
  const fromBody = reparationsDockets(body);
  const dockets = meta.dockets.length > 0 ? meta.dockets : fromBody;
  const docket = meta.docket || dockets[0] || "";
  const sourceUrl = officialCftcReparationsPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  return {
    ...meta,
    docket,
    dockets,
    caseNo: docket,
    sourceUrl,
    date: meta.date ?? isoDate(body.slice(0, 2500)),
    body,
  };
}

export function emptySnapshot(reason: string): CftcReparationsSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { dispositions: DISPOSITIONS_URL, opinions: OPINIONS_URL },
    cards: [],
  };
}

export function assembleSnapshot(cards: CftcReparationsCard[], fetchedAt = new Date().toISOString()): CftcReparationsSnapshot {
  const seen = new Set<string>();
  const withBody = cards
    .filter((card) => {
      if (!isRealCftcReparationsBody(card.body) || !keepListing(card)) return false;
      const key = card.id || card.sourceUrl;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf =
    withBody
      .map((card) => card.date)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official CFTC reparations PDFs had no extractable decision text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { dispositions: DISPOSITIONS_URL, opinions: OPINIONS_URL },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): CftcReparationsSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as CftcReparationsSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): CftcReparationsSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: CftcReparationsSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

function listingDir(): string {
  return env("CFTC_REPARATIONS_LISTING_DIR") || env("CFTC_REPARATIONS_HTML_DIR");
}

function firstSliceLimit(): number {
  const raw = env("CFTC_REPARATIONS_LIMIT", "8");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxFetchLimit(): number {
  const raw = env("CFTC_REPARATIONS_MAX_FETCH", "8");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function pageLimit(): number {
  const raw = env("CFTC_REPARATIONS_PAGES", "60");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 80) : 60;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    if (!name) continue;
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

export async function fetchCftcBytes(url: string): Promise<Uint8Array> {
  const official = officialCftcReparationsPdfUrl(url);
  if (!official) throw new Error(`${url} is not an official CFTC reparations PDF`);
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  if (head !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export async function fetchCftcHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export function pdfToText(pdfPath: string): string {
  const helper = env("CFTC_REPARATIONS_PDFTOTEXT") || "pdftotext";
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

function pause(ms: number): Promise<void> {
  return new Promise((resolvePause) => setTimeout(resolvePause, ms));
}

async function fetchKindHtml(kind: CftcReparationsKind): Promise<string[]> {
  const first = await fetchCftcHtml(indexPageUrl(kind, 0));
  const last = Math.min(lastPageFromHtml(first), pageLimit() - 1);
  const pages = [first];
  for (let page = 1; page <= last; page += 1) {
    await pause(300);
    pages.push(await fetchCftcHtml(indexPageUrl(kind, page)));
  }
  return pages;
}

export async function walkOfficialIndexes(): Promise<{ listed: CftcReparationsListing[]; listedCount: number }> {
  const listed: CftcReparationsListing[] = [];
  for (const kind of enabledKinds()) {
    const pages = await fetchKindHtml(kind);
    for (const html of pages) listed.push(...parseIndexHtml(html, kind));
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: merged.length };
}

async function loadOfficialListings(dir: string): Promise<{ listed: CftcReparationsListing[]; listedCount: number }> {
  if (dir) {
    const chunks: CftcReparationsListing[] = [];
    const dispositions = readNamedFile(dir, ["dispositions.html", "dispositions.htm"]);
    const opinions = readNamedFile(dir, ["opinions.html", "opinions.htm"]);
    if (dispositions) chunks.push(...parseIndexHtml(dispositions, "disposition"));
    if (opinions) chunks.push(...parseIndexHtml(opinions, "opinion"));
    const merged = mergeListings(chunks);
    return { listed: merged, listedCount: merged.length };
  }
  try {
    const walked = await walkOfficialIndexes();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: mergeListings([]), listedCount: SEED_LISTINGS.length };
}

export async function collectCftcReparations(opts?: {
  listingDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<CftcReparationsSnapshot> {
  const dir = opts?.listingDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = cftcReparationsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, CftcReparationsCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealCftcReparationsBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const seedIds = new Set(SEED_LISTINGS.map((row) => row.id));
  const cards: CftcReparationsCard[] = [];
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
      const sourceUrl = officialCftcReparationsPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (existsSync(pdfFile)) return pdfToText(pdfFile);
          fetchedPdfs += 1;
          const bytes = await fetchCftcBytes(sourceUrl);
          writeFileSync(pdfFile, bytes);
          await pause(250);
          return pdfToText(pdfFile);
        })());
      if (!isRealCftcReparationsBody(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseCftcReparationsText(text, { ...row, sourceUrl });
      if (!isRealCftcReparationsBody(parsed.body) || !keepListing(parsed)) {
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
    ...assembleSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeSnapshot(snap);
  return snap;
}

export async function loadCftcReparations(): Promise<CftcReparationsSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((card) => isRealCftcReparationsBody(card.body))) return cached;
  try {
    return await collectCftcReparations();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live CFTC reparations fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `CFTC reparations PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildCftcReparationsManifest(snap: CftcReparationsSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((card) => isRealCftcReparationsBody(card.body) && keepListing(card));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      CFTC_REPARATIONS_PATH,
      "Count plus docket, kind (disposition or opinion), order kind, date, institution, and title. Decision text is the paid GET /cftc-reparations payload. asOf is the newest decision date in the cache. Dispositions are reparations YY-R dockets from the Dispositions index. Opinions are Commission opinions and adjudicatory orders from the Opinions & Adjudicatory Orders index. Both kinds stay on this door. The HTML index is not the sold body. Not /cftc-orders (enforcement institution orders such as Docket No. 26-04). Not statutory-disqualification dispositions.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: CFTC_REPARATIONS_AMOUNT_ATOMIC,
    oneAmountAtomic: CFTC_REPARATIONS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    listedCount: snap?.listedCount ?? cards.length,
    cards: cards.map((card) => ({
      id: card.id,
      docket: card.docket,
      dockets: card.dockets,
      caseNo: card.caseNo,
      kind: card.kind,
      orderKind: card.orderKind,
      date: card.date,
      institution: card.institution,
      title: card.title,
      sourceUrl: card.sourceUrl,
    })),
    schema: { fields: [...MANIFEST_FIELDS] },
    sources: {
      dispositions: snap?.sources?.dispositions ?? DISPOSITIONS_URL,
      opinions: snap?.sources?.opinions ?? OPINIONS_URL,
    },
  };
}

export function filterCftcReparationsManifestByKind(
  manifest: Record<string, unknown>,
  kind?: string | null,
): Record<string, unknown> {
  const needle = (kind ?? "").trim().toLowerCase();
  if (needle !== "disposition" && needle !== "opinion") return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    return String((raw as Record<string, unknown>).kind ?? "").toLowerCase() === needle;
  });
  return { ...manifest, cardCount: matched.length, cards: matched, kind: needle };
}

export function filterCftcReparationsManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    const dockets = Array.isArray(row.dockets) ? row.dockets.join(" ") : "";
    return ["id", "docket", "caseNo", "kind", "orderKind", "date", "institution", "title"].some((key) =>
      String(row[key] ?? "")
        .toLowerCase()
        .includes(needle),
    ) || dockets.toLowerCase().includes(needle);
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadCftcReparationsManifest(q?: string): Promise<Record<string, unknown>> {
  return filterCftcReparationsManifest(buildCftcReparationsManifest(readSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectCftcReparations()
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
              dockets: card.dockets,
              kind: card.kind,
              orderKind: card.orderKind,
              date: card.date,
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
