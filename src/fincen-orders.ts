/**
 * FinCEN institution consent-order TEXT door.
 * Official per-order PDFs from fincen.gov only. Does not invent order text.
 * Enforcement-actions index is title/date/matter/PDF URL only (listing metadata).
 * Not people-only CMP letters. Not a news-release wrap. Not Federal Register raw_text.
 * Not Drupal ?_format=json. Not NCUA /ncua-orders. Not FRB /frb-orders.
 * Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FINCEN_ORDERS_PATH = "/fincen-orders";
export const FINCEN_ORDERS_MANIFEST_PATH = "/fincen-orders/manifest.json";
export const FINCEN_ORDERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "fincen-institution-order-bodies";
export const PRODUCT_NAME = "FinCEN institution consent-order text";

export const LISTING_URL = "https://www.fincen.gov/news/enforcement-actions";
export const PDF_HOST = "www.fincen.gov";
export const PDF_ORIGIN = "https://www.fincen.gov";
export const DOCKET_RE = /\b(20\d{2}-\d{2})\b/;
export const NUMBER_RE = /\bNumber\s+(20\d{2}-\d{2})\b/i;
export const PDF_PATH_RE =
  /^\/system\/files\/(?:20\d{2}-\d{2}|enforcement_action\/\d{4}-\d{2}-\d{2})\/[A-Za-z0-9._%-]+\.pdf$/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "FinCEN";

export const CARD_FIELDS = [
  "id",
  "docket",
  "pdfId",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type FincenListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type FincenOrderListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type FincenOrderCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type FincenOrdersSnapshot = {
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
  sources: {
    listing: string;
    pdfHost: string;
  };
  cards: FincenOrderCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FinCEN public consent orders; +https://www.fincen.gov/)";

const INSTITUTION_TYPE_RE =
  /securities and futures|money services business|depository institution/i;
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.P\.|LP|Corp\.?|Corporation|Bank|N\.A\.|Ltd\.?|Limited|Company|Services|Holdings|Trust|National Association)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,2}$/;

/** Official FinCEN institution consent-order PDFs on fincen.gov. BD / MSB / bank only. */
export const SEED_LISTINGS: FincenOrderListing[] = [
  {
    id: "2026-02",
    docket: "2026-02",
    institution: "UBS Financial Services Inc.",
    date: "2026-08-03",
    title: "Consent Order Imposing Civil Money Penalty",
    sourceUrl: "https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf",
    pdfId: "UBS-Consent-Order",
  },
  {
    id: "2026-01",
    docket: "2026-01",
    institution: "Canaccord Genuity LLC",
    date: "2026-03-06",
    title: "Consent Order Imposing Civil Money Penalty",
    sourceUrl: "https://www.fincen.gov/system/files/2026-03/Canaccord-Consent-Order-No-2026-01.pdf",
    pdfId: "Canaccord-Consent-Order-No-2026-01",
  },
  {
    id: "2025-02",
    docket: "2025-02",
    institution: "Paxful, Inc. and Paxful USA, Inc.",
    date: "2025-12-09",
    title: "Consent Order Imposing Civil Money Penalty",
    sourceUrl: "https://www.fincen.gov/system/files/2025-12/PaxfulConsentOrder.pdf",
    pdfId: "PaxfulConsentOrder",
  },
  {
    id: "2025-01",
    docket: "2025-01",
    institution: "Brink’s Global Services USA, Inc.",
    date: "2025-01-31",
    title: "Consent Order Imposing Civil Money Penalty",
    sourceUrl: "https://www.fincen.gov/system/files/enforcement_action/2025-02-06/FinCEN-Brinks-FINALv508.pdf",
    pdfId: "FinCEN-Brinks-FINALv508",
  },
  {
    id: "2024-02",
    docket: "2024-02",
    institution: "TD Bank, N.A. and TD Bank USA, N.A.",
    date: "2024-10-10",
    title: "Consent Order Imposing Civil Money Penalty",
    sourceUrl:
      "https://www.fincen.gov/system/files/enforcement_action/2024-10-10/FinCEN-TD-Bank-Consent-Order-508FINAL.pdf",
    pdfId: "FinCEN-TD-Bank-Consent-Order-508FINAL",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function fincenOrdersDir(): string {
  if (env("FINCEN_ORDERS_DIR")) return resolve(env("FINCEN_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/fincen-orders"));
}

export function snapshotPath(): string {
  return join(fincenOrdersDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/fincen-orders/seed-snapshot.json"),
    join(here, "fixtures/fincen-orders/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
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

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(DOCKET_RE);
  return m ? m[1] : null;
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

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const official = officialFincenPdfUrl(url) || url;
  const m = official.match(/\/([^/?#]+\.pdf)(?:$|[?#])/i);
  return m ? m[1].replace(/\.pdf$/i, "") : null;
}

export function officialFincenPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  try {
    const parsed = new URL(trimmed, PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") return null;
    if (host !== "www.fincen.gov" && host !== "fincen.gov") return null;
    if (/\/news\//i.test(parsed.pathname)) return null;
    let pathname = parsed.pathname;
    const file = parsed.searchParams.get("file");
    if (file) {
      pathname = `/system/files/${decodeURIComponent(file).replace(/^\/+/, "")}`;
    }
    if (!PDF_PATH_RE.test(pathname)) return null;
    return `${PDF_ORIGIN}${pathname}`;
  } catch {
    return null;
  }
}

function listingKind(row: FincenListingRow): string {
  return `${row.title ?? ""} ${row.type ?? ""}`.replace(/\s+/g, " ").trim();
}

export function isPeopleRow(row: FincenListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  const cleaned = name.replace(/^In the Matter of\s+/i, "").replace(/\s+d\/b\/a\s+.+$/i, "").trim();
  return PERSON_NAME_RE.test(cleaned);
}

export function isCasinoRow(row: FincenListingRow): boolean {
  return /\bcasinos?\b/i.test(row.type ?? "") && !INSTITUTION_TYPE_RE.test(row.type ?? "");
}

export function isNewsReleaseRow(row: FincenListingRow): boolean {
  const url = row.sourceUrl ?? "";
  if (/\/news\/news-releases\//i.test(url)) return true;
  return /assesses .+ penalty|news release/i.test(row.title ?? "") && !officialFincenPdfUrl(url);
}

export function isConsentOrderRow(row: FincenListingRow): boolean {
  const blob = `${row.title ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`;
  return /consent[\s_-]?order/i.test(blob);
}

export function isBdMsbBankType(row: FincenListingRow): boolean {
  const type = row.type ?? "";
  if (!type.trim()) return ENTITY_RE.test(row.institution ?? "");
  return INSTITUTION_TYPE_RE.test(type);
}

export function isInstitutionOrderRow(row: FincenListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (isCasinoRow(row)) return false;
  if (isNewsReleaseRow(row)) return false;
  if (!isBdMsbBankType(row)) return false;
  if (!isConsentOrderRow(row)) return false;
  const institution = (row.institution ?? "").trim();
  if (!institution || !ENTITY_RE.test(institution)) return false;
  const docket = normalizeDocket(row.docket);
  if (!docket) return false;
  return Boolean(officialFincenPdfUrl(row.sourceUrl ?? row.pdfId ?? ""));
}

export function parseListingRows(rows: FincenListingRow[]): FincenOrderListing[] {
  const found: FincenOrderListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const docket = normalizeDocket(row.docket);
    const sourceUrl = officialFincenPdfUrl(row.sourceUrl ?? row.pdfId ?? "");
    const pdfId = pdfIdFromUrl(sourceUrl ?? "") ?? (row.pdfId ?? "").trim();
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: docket,
      docket,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: /consent/i.test(row.title ?? "") ? "Consent Order Imposing Civil Money Penalty" : listingKind(row),
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): FincenOrderListing[] {
  const rows: FincenListingRow[] = [];
  const trs = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of trs) {
    const href = (row.match(/href="([^"]+)"/i) || [])[1] || "";
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]));
    if (cells.length < 3) continue;
    const title = cells[0] ?? "";
    const date = cells[1] ?? "";
    const docket = cells[2] ?? "";
    const type = cells[3] ?? "";
    const sourceUrl = href.startsWith("http") ? href : `${PDF_ORIGIN}${href}`;
    rows.push({
      institution: title.replace(/^In the Matter of\s+/i, "").trim() || title,
      docket,
      date,
      title,
      type,
      sourceUrl,
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — title \/ date \/ matter \/ PDF URL/i.test(text)) return true;
  if (
    /FinCEN may bring an enforcement action for violations of the/i.test(text) &&
    !/CONSENT ORDER IMPOSING CIVIL MONEY PENALTY/i.test(text)
  ) {
    return true;
  }
  return false;
}

export function isNewsReleaseDump(text: string): boolean {
  if (/news-release wrap/i.test(text)) return true;
  if (/FinCEN Assesses Historic/i.test(text) && !/CONSENT ORDER IMPOSING CIVIL MONEY PENALTY/i.test(text)) {
    return true;
  }
  return false;
}

export function isFederalRegisterDump(text: string): boolean {
  return /"raw_text"/.test(text) || /"full_text"/.test(text) || /federalregister\.gov/i.test(text);
}

export function isDrupalJsonDump(text: string): boolean {
  if (/Not acceptable format|406 Not Acceptable/i.test(text) && /\?_format=json/i.test(text)) return true;
  if (/"@type"\s*:\s*"GovernmentOrganization"/.test(text) && !/CONSENT ORDER IMPOSING CIVIL MONEY PENALTY/i.test(text)) {
    return true;
  }
  return false;
}

export function isPeopleCmpDump(text: string): boolean {
  if (/people-only CMP/i.test(text)) return true;
  if (/ASSESSMENT OF CIVIL MONEY PENALTY/i.test(text) && !/CONSENT ORDER IMPOSING CIVIL MONEY PENALTY/i.test(text)) {
    return true;
  }
  return false;
}

export function isRealFincenOrderBody(text: string): boolean {
  if (
    isIndexTeaserDump(text) ||
    isNewsReleaseDump(text) ||
    isFederalRegisterDump(text) ||
    isDrupalJsonDump(text) ||
    isPeopleCmpDump(text)
  ) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 2000) return false;
  if (/CONSUMER FINANCIAL PROTECTION BUREAU/i.test(text) && /File No\.\s*\d{4}-CFPB-\d+/i.test(text)) {
    return false;
  }
  if (/OFFICE OF THE COMPTROLLER OF THE CURRENCY/i.test(text) && /\bAA-[A-Z]{2,4}-\d{4}-\d+\b/.test(text)) {
    return false;
  }
  if (/FEDERAL DEPOSIT INSURANCE CORPORATION/i.test(text) && /\bFDIC-\d{2}-\d{4}[a-z]\b/i.test(text)) {
    return false;
  }
  if (/BOARD OF GOVERNORS OF THE FEDERAL RESERVE SYSTEM/i.test(text) && /\b\d{2}-\d{3}-(?:B|PCA|WA\/RB)/i.test(text)) {
    return false;
  }
  if (/National Credit Union Administration/i.test(text) && /\b\d{2}-\d{4}-[A-Z]{2}\b/.test(text)) {
    return false;
  }
  if (/Bureau of Consumer Protection/i.test(text) && /Made in the USA Labeling Rule|MUSA Labeling Rule/i.test(text)) {
    return false;
  }
  const fincen = /FINANCIAL CRIMES ENFORCEMENT NETWORK/i.test(text);
  const order = /CONSENT ORDER IMPOSING CIVIL MONEY PENALTY/i.test(text) || /\bCONSENT ORDER\b/i.test(text);
  const docket = NUMBER_RE.test(text) || DOCKET_RE.test(text);
  const facts = /STATEMENT OF FACTS/i.test(text) || /DETERMINATION/i.test(text) || /VIOLATIONS/i.test(text);
  return fincen && order && docket && facts;
}

export function parseOrderTitle(body: string): string {
  if (/CONSENT ORDER IMPOSING CIVIL MONEY PENALTY/i.test(body)) {
    return "Consent Order Imposing Civil Money Penalty";
  }
  if (/\bCONSENT ORDER\b/i.test(body)) return "Consent Order";
  return "Consent Order Imposing Civil Money Penalty";
}

export function parseDocketFromBody(body: string): string | null {
  const numbered = body.slice(0, 2500).match(NUMBER_RE);
  if (numbered) return numbered[1];
  return normalizeDocket(body.slice(0, 2500));
}

export function parseFincenOrderText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    docket?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): FincenOrderCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFincenPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || parseDocketFromBody(body) || "unknown";
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || docket;
  return {
    id: meta.id || docket,
    docket,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 2000)),
    title: meta.title || parseOrderTitle(body),
    sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): FincenOrdersSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: [],
  };
}

function cardDateKey(card: Pick<FincenOrderCard, "date" | "docket">): string {
  return `${card.date ?? ""}${card.docket}`;
}

export function assembleSnapshot(cards: FincenOrderCard[], fetchedAt = new Date().toISOString()): FincenOrdersSnapshot {
  const withBody = cards
    .filter((c) => isRealFincenOrderBody(c.body))
    .sort((a, b) => cardDateKey(b).localeCompare(cardDateKey(a)));
  const asOf =
    withBody
      .map((c) => c.date)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official FinCEN institution consent-order PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): FincenOrdersSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FincenOrdersSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): FincenOrdersSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("FINCEN_ORDERS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: FincenOrdersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedFincenOrderBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealFincenOrderBody(c.body)));
}

function listingDir(): string {
  return env("FINCEN_ORDERS_JSON_DIR") || env("FINCEN_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("FINCEN_ORDERS_LIMIT", "5");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const raw = env("FINCEN_ORDERS_MAX_FETCH", "8");
  if (raw === "0") return 0;
  const n = Number(raw);
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

export async function fetchFincenBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  if (head !== "%PDF-") throw new Error(`${url} is not an official PDF`);
  return bytes;
}

export async function fetchFincenText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FINCEN_ORDERS_PDFTOTEXT") || "pdftotext";
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
  return new Promise((r) => setTimeout(r, ms));
}

function mergeOfficialListings(listed: FincenOrderListing[], seeds: FincenOrderListing[]): FincenOrderListing[] {
  const seen = new Set<string>();
  const out: FincenOrderListing[] = [];
  for (const row of [...listed, ...seeds]) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

async function loadOfficialListings(dir: string): Promise<{ listed: FincenOrderListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as FincenListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = html ? parseListingHtml(html) : [];
    return { listed, listedCount: listed.length };
  }
  try {
    const listed = parseListingHtml(await fetchFincenText(LISTING_URL));
    const merged = mergeOfficialListings(listed, SEED_LISTINGS);
    if (merged.length > 0) return { listed: merged, listedCount: merged.length };
  } catch {
    /* official listing missed; keep first-slice seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

function priorBodies(): Map<string, FincenOrderCard> {
  const prior = new Map<string, FincenOrderCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealFincenOrderBody(card.body)) prior.set(card.id, card);
  }
  return prior;
}

export async function collectFincenOrders(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FincenOrdersSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = fincenOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = priorBodies();
  if (allListed.length === 0) {
    if (prior.size > 0) {
      const snap = {
        ...assembleSnapshot([...prior.values()]),
        listedCount: 0,
        fetchedPdfs: 0,
        skippedNoText: 0,
        reused: prior.size,
        addedThisRun: 0,
        reason: "Official FinCEN seed listing missed; kept cached institution consent-order bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official FinCEN seed listing had no institution consent-order rows.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: FincenOrderCard[] = [];
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
    if (!dir) await pause(pauseMs);
    try {
      const localText = readNamedFile(dir, [
        `${row.docket}.txt`,
        `${row.id}.txt`,
        `${row.pdfId}.txt`,
      ]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${row.pdfId}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchFincenBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseFincenOrderText(text, {
        sourceUrl: row.sourceUrl,
        institution: row.institution,
        date: row.date,
        docket: row.docket,
        pdfId: row.pdfId,
        id: row.id,
        title: row.title,
      });
      if (!isRealFincenOrderBody(parsed.body)) {
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

export async function loadFincenOrders(): Promise<FincenOrdersSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealFincenOrderBody(c.body))) {
    return cached;
  }
  try {
    return await collectFincenOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealFincenOrderBody(c.body)) ? "stale" : "empty",
        reason: `Live FinCEN institution consent-order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `FinCEN institution consent-order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFincenOrdersManifest(snap: FincenOrdersSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFincenOrderBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + docket + date + official PDF URL only. Order body is the paid GET /fincen-orders payload.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: FINCEN_ORDERS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      docket: c.docket,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "docket", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
  };
}

export async function loadFincenOrdersManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildFincenOrdersManifest(cached);
  return buildFincenOrdersManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFincenOrders()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealFincenOrderBody(c.body)).length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              docket: c.docket,
              pdfId: c.pdfId,
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
