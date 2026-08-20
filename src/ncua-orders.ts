/**
 * NCUA institution consent C&D TEXT door.
 * Official per-order HTML from ncua.gov administrative-order body pages only.
 * Does not invent order text.
 * Official CSV is docket/name/URL metadata only.
 * Drupal ?_format=json is 406. Sibling .json/.txt 404.
 * Not 2026 people/IAP. Not late-filer CMP $ table. Not LUAs. Not terminations.
 * Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd.
 * Not CFPB /cfpb-orders. Not FTC /ftc-wl.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const NCUA_ORDERS_PATH = "/ncua-orders";
export const NCUA_ORDERS_MANIFEST_PATH = "/ncua-orders/manifest.json";
export const NCUA_ORDERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "ncua-institution-order-bodies";
export const PRODUCT_NAME = "NCUA institution consent C&D text";

export const LISTING_URL = "https://ncua.gov/news/enforcement-actions/administrative-orders";
export const CSV_URL = "https://ncua.gov/sites/default/files/list_csv/administrative-orders.csv";
export const HTML_HOST = "ncua.gov";
export const ORDER_BASE = "https://ncua.gov/news/enforcement-actions/administrative-orders/";
export const ORDER_PATH_RE =
  /\/news\/enforcement-actions\/administrative-orders\/(\d{4})\/([a-z0-9][a-z0-9-]*)\/?/i;
export const DOCKET_RE = /\b(\d{2}-\d{4}-[A-Z]{2})\b/;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "NCUA";

export const CARD_FIELDS = [
  "id",
  "docket",
  "creditUnion",
  "location",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type NcuaListingRow = {
  creditUnion?: string;
  institution?: string;
  individual?: string;
  relationship?: string;
  location?: string;
  city?: string;
  state?: string;
  docket?: string;
  date?: string;
  year?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
};

export type NcuaOrderListing = {
  id: string;
  docket: string;
  creditUnion: string;
  location: string | null;
  date: string | null;
  title: string;
  sourceUrl: string;
};

export type NcuaOrderCard = {
  id: string;
  docket: string;
  creditUnion: string;
  location: string | null;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type NcuaOrdersSnapshot = {
  ok: true;
  product: typeof PRODUCT_ID;
  status: "ok" | "empty" | "stale";
  reason: string | null;
  fetchedAt: string;
  asOf: string | null;
  license: typeof LICENSE;
  attribution: typeof ATTRIBUTION;
  listedCount?: number;
  fetchedPages?: number;
  skippedNoText?: number;
  reused?: number;
  addedThisRun?: number;
  sources: {
    listing: string;
    csv: string;
    htmlHost: string;
  };
  cards: NcuaOrderCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (NCUA public enforcement orders; +https://ncua.gov/)";

/** Official institution consent C&D HTML body pages on ncua.gov. */
export const SEED_LISTINGS: NcuaOrderListing[] = [
  {
    id: "21-0105-ER",
    docket: "21-0105-ER",
    creditUnion: "Live Life Federal Credit Union",
    location: "Fraser, Michigan",
    date: "2021-02-22",
    title: "Stipulation and Consent to Cease and Desist Order",
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
  },
  {
    id: "19-1061-ER",
    docket: "19-1061-ER",
    creditUnion: "Phi Beta Sigma Federal Credit Union",
    location: "Washington, District of Columbia",
    date: "2019-09-05",
    title: "Stipulation and Consent to Cease and Desist Order",
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2019/administrative-order-matter-cease-and-desist-order-phi-beta-sigma-federal-credit-union",
  },
  {
    id: "19-0187-ER",
    docket: "19-0187-ER",
    creditUnion: "Defense Logistics Federal Credit Union",
    location: "Dover, New Jersey",
    date: "2019-12-12",
    title: "Stipulation and Consent to Cease and Desist Order",
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2019/administrative-order-matter-cease-and-desist-order-defense-logistics-federal-credit-union",
  },
  {
    id: "22-0112-ER",
    docket: "22-0112-ER",
    creditUnion: "Inter-American Federal Credit Union",
    location: "Brooklyn, New York",
    date: "2022-06-29",
    title: "Stipulation and Consent to Cease and Desist Order",
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2022/administrative-order-matter-inter-american-federal-credit-union",
  },
  {
    id: "22-0122-ER",
    docket: "22-0122-ER",
    creditUnion: "Yonkers Postal Employees Credit Union",
    location: "Yonkers, New York",
    date: "2022-11-29",
    title: "Stipulation and Consent to Cease and Desist Order",
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2022/administrative-order-matter-yonkers-postal-employees-credit-union",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ncuaOrdersDir(): string {
  if (env("NCUA_ORDERS_DIR")) return resolve(env("NCUA_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ncua-orders"));
}

export function snapshotPath(): string {
  return join(ncuaOrdersDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/ncua-orders/seed-snapshot.json"),
    join(here, "fixtures/ncua-orders/seed-snapshot.json"),
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
    .replace(/&ldquo;/gi, "“")
    .replace(/&rdquo;/gi, "”")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&rsquo;/gi, "’")
    .replace(/&sect;/gi, "§")
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

export function htmlToBody(html: string): string {
  const withBreaks = html
    .replace(/<\/(p|h[1-6]|li|div|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n");
  return withBreaks
    .split("\n")
    .map((line) => stripTags(line))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.toUpperCase().match(DOCKET_RE);
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

export function officialNcuaOrderUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed, "https://ncua.gov");
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") return null;
    if (host !== "ncua.gov" && host !== "www.ncua.gov") return null;
    const m = parsed.pathname.match(ORDER_PATH_RE);
    if (!m) return null;
    return `${ORDER_BASE}${m[1]}/${m[2].toLowerCase()}`;
  } catch {
    return null;
  }
}

function listingKind(row: NcuaListingRow): string {
  return `${row.title ?? ""} ${row.type ?? ""}`.replace(/\s+/g, " ").trim();
}

export function isPeopleRow(row: NcuaListingRow): boolean {
  const relationship = `${row.relationship ?? ""} ${row.individual ?? ""}`;
  if (/former employee|institution-affiliated party|\bIAP\b/i.test(relationship)) return true;
  if ((row.individual ?? "").trim()) return true;
  const name = `${row.creditUnion ?? ""} ${row.institution ?? ""}`.trim();
  if (/\bcredit union\b/i.test(name)) return false;
  return /,\s*[A-Z][a-z]+/.test(relationship);
}

export function isCmpRow(row: NcuaListingRow): boolean {
  return /civil money penalty|late[\s-]?filer|\border to pay\b/i.test(listingKind(row));
}

export function isTerminationRow(row: NcuaListingRow): boolean {
  return /terminat/i.test(listingKind(row));
}

export function isLuaRow(row: NcuaListingRow): boolean {
  return /letter of understanding|\bLUA\b/i.test(listingKind(row));
}

export function isProhibitionRow(row: NcuaListingRow): boolean {
  return /order of prohibition|prohibition from/i.test(listingKind(row));
}

export function isInstitutionOrderRow(row: NcuaListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (isCmpRow(row) || isTerminationRow(row) || isLuaRow(row) || isProhibitionRow(row)) return false;
  const creditUnion = ((row.creditUnion ?? row.institution) ?? "").trim();
  if (!creditUnion || !/credit union/i.test(creditUnion)) return false;
  const docket = normalizeDocket(row.docket);
  if (!docket) return false;
  const kind = listingKind(row);
  if (kind && !/cease and desist|cease-and-desist|consent to cease/i.test(kind)) return false;
  return Boolean(officialNcuaOrderUrl(row.sourceUrl ?? ""));
}

export function parseListingRows(rows: NcuaListingRow[]): NcuaOrderListing[] {
  const found: NcuaOrderListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const docket = normalizeDocket(row.docket);
    const sourceUrl = officialNcuaOrderUrl(row.sourceUrl ?? "");
    if (!docket || !sourceUrl) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    const loc = [row.city ?? "", row.state ?? ""].map((s) => s.trim()).filter(Boolean);
    found.push({
      id: docket,
      docket,
      creditUnion: ((row.creditUnion ?? row.institution) ?? "").trim(),
      location: (row.location ?? "").trim() || (loc.length ? loc.join(", ") : null),
      date: isoDate(row.date) ?? (row.year && /^\d{4}$/.test(row.year) ? `${row.year}-01-01` : null),
      title: listingKind(row) || "Stipulation and Consent to Cease and Desist Order",
      sourceUrl,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): NcuaOrderListing[] {
  const found: NcuaOrderListing[] = [];
  const seen = new Set<string>();
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const href = (row.match(/href="([^"]*\/news\/enforcement-actions\/administrative-orders\/[^"]+)"/i) || [])[1] || "";
    const sourceUrl = officialNcuaOrderUrl(href.startsWith("http") ? href : `https://ncua.gov${href}`);
    const docket = normalizeDocket(stripTags(row));
    if (!sourceUrl || !docket) continue;
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]));
    const name = cells[1] ?? "";
    const institution = cells[2] ?? "";
    const city = cells[3] ?? "";
    const state = cells[4] ?? "";
    const year = cells[5] ?? "";
    const parsed = parseListingRows([
      {
        creditUnion: /credit union/i.test(name) ? name.split(/\s{2,}/)[0] : institution,
        institution,
        relationship: name,
        individual: /former employee|institution-affiliated party/i.test(name) ? name : "",
        city,
        state,
        docket,
        year,
        title: /credit union/i.test(institution) && !/former employee|institution-affiliated/i.test(name)
          ? "Stipulation and Consent to Cease and Desist Order"
          : "",
        sourceUrl,
      },
    ]);
    for (const item of parsed) {
      if (seen.has(item.docket)) continue;
      seen.add(item.docket);
      found.push(item);
    }
  }
  return found;
}

export function isCsvMetadataDump(text: string): boolean {
  const t = text.trim();
  if (/^"?Docket Number"?,"?Year"?,"?First Name"?/i.test(t)) return true;
  if (/Download CSV/i.test(t) && /Administrative Orders/i.test(t) && !/STIPULATION AND CONSENT TO CEASE AND DESIST/i.test(t)) {
    return true;
  }
  return false;
}

export function isDrupalJsonDump(text: string): boolean {
  if (/Not acceptable format|406 Not Acceptable/i.test(text) && /\?_format=json/i.test(text)) return true;
  if (/"@type"\s*:\s*"GovernmentOrganization"/.test(text) && !/STIPULATION AND CONSENT TO CEASE AND DESIST/i.test(text)) {
    return true;
  }
  return false;
}

export function isRealNcuaOrderBody(text: string): boolean {
  if (isCsvMetadataDump(text) || isDrupalJsonDump(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 1200) return false;
  if (/CONSUMER FINANCIAL PROTECTION BUREAU/i.test(text) && /File No\.\s*\d{4}-CFPB-\d+/i.test(text)) {
    return false;
  }
  if (/OFFICE OF THE COMPTROLLER OF THE CURRENCY/i.test(text) && /\bAA-[A-Z]{2,4}-\d{4}-\d+\b/.test(text)) {
    return false;
  }
  if (/FEDERAL DEPOSIT INSURANCE CORPORATION/i.test(text) && /\bFDIC-\d{2}-\d{4}[a-z]\b/i.test(text)) {
    return false;
  }
  if (/BOARD OF GOVERNORS OF THE FEDERAL RESERVE SYSTEM/i.test(text) && DOCKET_RE.test(text) === false) {
    return false;
  }
  if (/BOARD OF GOVERNORS OF THE FEDERAL RESERVE SYSTEM/i.test(text) && /\b\d{2}-\d{3}-(?:B|PCA|WA\/RB)/i.test(text)) {
    return false;
  }
  if (/Bureau of Consumer Protection/i.test(text) && /Made in the USA Labeling Rule|MUSA Labeling Rule/i.test(text)) {
    return false;
  }
  if (/TERMINATION OF CONSENT CEASE AND DESIST/i.test(text) && !/\bConsent\.\b/i.test(text)) {
    return false;
  }
  if (/ORDER OF PROHIBITION/i.test(text) && /institution-affiliated party/i.test(text)) return false;
  if (/Letter of Understanding and Agreement|\bLUA\b/.test(text) && !/STIPULATION AND CONSENT TO CEASE AND DESIST/i.test(text)) {
    return false;
  }
  if (/civil money penalty|late[\s-]?filer CMP/i.test(text) && !/STIPULATION AND CONSENT TO CEASE AND DESIST/i.test(text)) {
    return false;
  }
  const ncua = /National Credit Union Administration/i.test(text);
  const order = /STIPULATION AND CONSENT TO CEASE AND DESIST/i.test(text);
  const docket = DOCKET_RE.test(text);
  const institution = /insured credit union|Federal Credit Union|Credit Union/i.test(text);
  const findings =
    /\bConsent\b/i.test(text) ||
    /\bWHEREFORE\b/i.test(text) ||
    /consents to the issuance/i.test(text) ||
    /12 U\.S\.C\.\s*§\s*1786/i.test(text);
  return ncua && order && docket && institution && findings;
}

export function extractOrderHtml(html: string): string {
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const chunk = article ? article[1] : html;
  const docket = stripTags((chunk.match(/<span class="docket">([\s\S]*?)<\/span>/i) || [])[1] || "");
  const pub =
    (chunk.match(/<div class="body field-type-text_with_summary">([\s\S]*?)<div id="publication_extras"/i) || [])[1] ||
    (chunk.match(/<div class="body field-type-text_with_summary">([\s\S]*)/i) || [])[1] ||
    "";
  const header = docket ? `<p>Docket No. ${docket}</p>\n` : "";
  return `${header}${pub || chunk}`;
}

export function extractField(html: string, name: string): string | null {
  const re = new RegExp(`<div class="${name} field-type-[^"]+"[^>]*>\\s*<div>[^<]*</div>\\s*<div class="${name}[^"]*">([\\s\\S]*?)</div>`, "i");
  const m = html.match(re);
  return m ? stripTags(m[1]) : null;
}

export function parseOrderTitle(body: string): string {
  if (/TERMINATION OF CONSENT/i.test(body)) return "Termination of Consent Cease and Desist Order";
  if (/STIPULATION AND CONSENT TO CEASE AND DESIST/i.test(body)) {
    return "Stipulation and Consent to Cease and Desist Order";
  }
  if (/CEASE AND DESIST/i.test(body)) return "Cease and Desist Order";
  return "Stipulation and Consent to Cease and Desist Order";
}

export function parseDocketFromBody(body: string): string | null {
  return normalizeDocket(body.slice(0, 2500));
}

export function parseNcuaOrderHtml(
  html: string,
  meta: {
    sourceUrl: string;
    creditUnion?: string;
    location?: string | null;
    date?: string | null;
    docket?: string | null;
    id?: string;
    title?: string;
  },
): NcuaOrderCard {
  const looksLikeHtml = /<html|<article|<div class="body|STIPULATION AND CONSENT TO CEASE AND DESIST ORDER<\/h2>/i.test(html);
  const body = looksLikeHtml ? htmlToBody(extractOrderHtml(html)) : html.replace(/\f/g, "\n").trim();
  const sourceUrl = officialNcuaOrderUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket =
    normalizeDocket(meta.docket) ||
    normalizeDocket(extractField(html, "field_docket_number") ?? "") ||
    parseDocketFromBody(body) ||
    "unknown";
  const creditUnion =
    (meta.creditUnion && meta.creditUnion.trim()) ||
    extractField(html, "field_institution") ||
    docket;
  const city = extractField(html, "field_city");
  const state = extractField(html, "field_state");
  const loc = [city ?? "", state ?? ""].map((s) => s.trim()).filter(Boolean);
  const published = (html.match(/article:published_time"[^>]*content="([^"]+)"/i) || [])[1];
  return {
    id: meta.id || docket,
    docket,
    creditUnion,
    location: meta.location ?? (loc.length ? loc.join(", ") : null),
    date: meta.date ?? isoDate(body.slice(0, 2000)) ?? isoDate(published),
    title: meta.title || parseOrderTitle(body),
    sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): NcuaOrdersSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, csv: CSV_URL, htmlHost: `https://${HTML_HOST}/` },
    cards: [],
  };
}

function cardDateKey(card: Pick<NcuaOrderCard, "date" | "docket">): string {
  return `${card.date ?? ""}${card.docket}`;
}

export function assembleSnapshot(cards: NcuaOrderCard[], fetchedAt = new Date().toISOString()): NcuaOrdersSnapshot {
  const withBody = cards
    .filter((c) => isRealNcuaOrderBody(c.body))
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
    reason: withBody.length > 0 ? null : "Official NCUA institution C&D HTML pages had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, csv: CSV_URL, htmlHost: `https://${HTML_HOST}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): NcuaOrdersSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as NcuaOrdersSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): NcuaOrdersSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("NCUA_ORDERS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: NcuaOrdersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedNcuaOrderBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealNcuaOrderBody(c.body)));
}

function listingDir(): string {
  return env("NCUA_ORDERS_HTML_DIR") || env("NCUA_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("NCUA_ORDERS_LIMIT", "5");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const raw = env("NCUA_ORDERS_MAX_FETCH", "8");
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

export async function fetchNcuaHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadOfficialListings(dir: string): Promise<{ listed: NcuaOrderListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as NcuaListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = html ? parseListingHtml(html) : [];
    return { listed, listedCount: listed.length };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

function priorBodies(): Map<string, NcuaOrderCard> {
  const prior = new Map<string, NcuaOrderCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealNcuaOrderBody(card.body)) prior.set(card.id, card);
  }
  return prior;
}

export async function collectNcuaOrders(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<NcuaOrdersSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ncuaOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = priorBodies();
  if (allListed.length === 0) {
    if (prior.size > 0) {
      const snap = {
        ...assembleSnapshot([...prior.values()]),
        listedCount: 0,
        fetchedPages: 0,
        skippedNoText: 0,
        reused: prior.size,
        addedThisRun: 0,
        reason: "Official NCUA seed listing missed; kept cached institution C&D bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official NCUA seed listing had no institution consent C&D rows.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: NcuaOrderCard[] = [];
  const seen = new Set<string>();
  let fetchedPages = 0;
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
    if (fetchCap > 0 && fetchedPages >= fetchCap) break;
    if (!dir) await pause(pauseMs);
    try {
      const local = readNamedFile(dir, [
        `${row.docket}.html`,
        `${row.id}.html`,
        `${row.docket}.txt`,
        `${row.id}.txt`,
      ]);
      if (dir && !local) {
        skippedNoText += 1;
        continue;
      }
      const cacheFile = join(cacheDir, `${row.docket}.html`);
      const raw =
        local ??
        (await (async () => {
          if (existsSync(cacheFile)) return readFileSync(cacheFile, "utf-8");
          const html = await fetchNcuaHtml(row.sourceUrl);
          writeFileSync(cacheFile, html);
          fetchedPages += 1;
          return html;
        })());
      const parsed = parseNcuaOrderHtml(raw, {
        sourceUrl: row.sourceUrl,
        creditUnion: row.creditUnion,
        location: row.location,
        date: row.date,
        docket: row.docket,
        id: row.id,
        title: row.title,
      });
      if (!isRealNcuaOrderBody(parsed.body)) {
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
    fetchedPages,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeSnapshot(snap);
  return snap;
}

export async function loadNcuaOrders(): Promise<NcuaOrdersSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealNcuaOrderBody(c.body))) {
    return cached;
  }
  try {
    return await collectNcuaOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealNcuaOrderBody(c.body)) ? "stale" : "empty",
        reason: `Live NCUA institution C&D fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `NCUA institution C&D HTML is not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildNcuaOrdersManifest(snap: NcuaOrdersSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealNcuaOrderBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + credit union + docket + date + official HTML URL only. Order body is the paid GET /ncua-orders payload. Not the official CSV. Not Drupal ?_format=json. Not 2026 people/IAP. Not late-filer CMP. Not LUAs. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: NCUA_ORDERS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      creditUnion: c.creditUnion,
      docket: c.docket,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "creditUnion", "docket", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, csv: CSV_URL, htmlHost: `https://${HTML_HOST}/` },
  };
}

export async function loadNcuaOrdersManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildNcuaOrdersManifest(cached);
  return buildNcuaOrdersManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectNcuaOrders()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealNcuaOrderBody(c.body)).length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPages: snap.fetchedPages ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              docket: c.docket,
              creditUnion: c.creditUnion,
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
