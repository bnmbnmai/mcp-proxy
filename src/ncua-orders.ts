/**
 * NCUA institution consent C&D TEXT door.
 * Official per-order HTML body pages, or official /files/administrative-orders PDFs
 * when the Drupal page is only a teaser. Does not invent order text.
 * Official leftover catalog is the same /files/administrative-orders path —
 * leftover AO{YYYY}-*.pdf plus leftover {docket}.pdf stems the first walk
 * missed. 2011–2017 leftover C&D teasers are image-only scans (pdftotext
 * empty). Does not invent OCR. Official CSV is docket/name/URL metadata only.
 * Drupal ?_format=json is 406. Sibling .json/.txt 404.
 * Not 2026 people/IAP. Not late-filer CMP $ table. Not LUAs. Not terminations.
 * Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd.
 * Not CFPB /cfpb-orders. Not FTC /ftc-wl.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

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
export const PDF_ORIGIN = "https://ncua.gov";
/** Official leftover PDF stem: AO{YYYY}-* or leftover {yy}-{nnnn}-{region}. */
export const PDF_PATH_RE =
  /^\/files\/administrative-orders\/(?:ao[^/?#]+|\d{2}-\d{4}-(?:[a-z]{2}|r[1-5]|i{1,3}|iv|vi?|[1-5]))\.pdf$/i;
/** Recent ER/WR/SR plus older regional R1–R5 / roman / digit suffixes. */
export const DOCKET_RE = /\b(\d{2}-\d{4}-(?:[A-Z]{2}|R[1-5]|I{1,3}|IV|VI?|[1-5]))\b/i;
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
  fetchedPdfs?: number;
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

/** Extra official institution C&D PDFs. Recent CSV/HTML rows are late-filer CMP teasers. */
export const OFFICIAL_WALK_LISTINGS: NcuaOrderListing[] = [
  {
    id: "16-0188-R2",
    docket: "16-0188-R2",
    creditUnion: "S M Federal Credit Union",
    location: "Philadelphia, PA",
    date: "2016-12-08",
    title: "Stipulation and Consent to Cease and Desist Order",
    sourceUrl: "https://ncua.gov/files/administrative-orders/AO2016-0188-R2.pdf",
  },
  {
    id: "14-0247-R2",
    docket: "14-0247-R2",
    creditUnion: "New Bethel Federal Credit Union",
    location: "Portsmouth, VA",
    date: "2014-12-18",
    title: "Stipulation and Consent to Cease and Desist Order",
    sourceUrl: "https://ncua.gov/files/administrative-orders/AO2014-0247-R2.pdf",
  },
  {
    id: "09-0059-IV",
    docket: "09-0059-IV",
    creditUnion: "Rapid City Telco Federal Credit Union",
    location: "Rapid City, SD",
    date: "2009-11-10",
    title: "Stipulation and Consent to Cease and Desist Order",
    sourceUrl: "https://ncua.gov/files/administrative-orders/AO2009-0059-IV.pdf",
  },
  {
    id: "07-0203-II",
    docket: "07-0203-II",
    creditUnion: "Dover N.J. Spanish American Federal Credit Union",
    location: null,
    date: "2007-01-01",
    title: "Stipulation and Consent to Cease and Desist Order",
    sourceUrl: "https://ncua.gov/files/administrative-orders/AO2007-0203-II.pdf",
  },
  {
    id: "02-0901-I",
    docket: "02-0901-I",
    creditUnion: "Korean American Catholics Federal Credit Union",
    location: null,
    date: "2002-09-16",
    title: "Stipulation and Consent to Cease and Desist Order",
    sourceUrl: "https://ncua.gov/files/administrative-orders/AO2002-0901-I.pdf",
  },
  {
    id: "98-0101-I",
    docket: "98-0101-I",
    creditUnion: "Polish & Slavic Federal Credit Union",
    location: null,
    date: "1998-01-12",
    title: "Stipulation and Consent to Cease and Desist Order",
    sourceUrl: "https://ncua.gov/files/administrative-orders/AO1998-0101-I.pdf",
  },
  {
    id: "98-0601-I",
    docket: "98-0601-I",
    creditUnion: "Waterside Federal Credit Union",
    location: null,
    date: "1998-06-22",
    title: "Stipulation and Consent to Cease and Desist Order",
    sourceUrl: "https://ncua.gov/files/administrative-orders/AO1998-0601-1.pdf",
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

export function officialNcuaPdfUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed, PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") return null;
    if (host !== "ncua.gov" && host !== "www.ncua.gov") return null;
    if (!PDF_PATH_RE.test(parsed.pathname)) return null;
    return `${PDF_ORIGIN}${parsed.pathname}`;
  } catch {
    return null;
  }
}

export function extractOfficialPdfUrl(html: string): string | null {
  const hrefs = [...html.matchAll(/href="([^"]*\/files\/administrative-orders\/[^"]+\.pdf[^"]*)"/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    const abs = href.startsWith("http") ? href : `${PDF_ORIGIN}${href}`;
    const official = officialNcuaPdfUrl(abs);
    if (official) return official;
  }
  return null;
}

export function officialNcuaOrderUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const pdf = officialNcuaPdfUrl(url);
  if (pdf) return pdf;
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

function looksLikeCreditUnion(raw: string | null | undefined): boolean {
  return /credit union|\bFCU\b/i.test(raw ?? "");
}

export function isPeopleRow(row: NcuaListingRow): boolean {
  const relationship = `${row.relationship ?? ""} ${row.individual ?? ""}`;
  if (/former employee|institution-affiliated party|\bIAP\b/i.test(relationship)) return true;
  const individual = (row.individual ?? "").trim();
  if (individual && !looksLikeCreditUnion(individual)) return true;
  const name = `${row.creditUnion ?? ""} ${row.institution ?? ""}`.trim();
  if (looksLikeCreditUnion(name)) return false;
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
  if (!creditUnion || !looksLikeCreditUnion(creditUnion)) return false;
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

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/** Official administrative-orders CSV is listing metadata. Do not sell the CSV. */
export function parseNcuaCsv(text: string): NcuaOrderListing[] {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const iDocket = idx("docket number");
  const iYear = idx("year");
  const iFirst = idx("first name");
  const iLast = idx("last name");
  const iInst = idx("institution");
  const iRel = idx("relationship");
  const iCity = idx("city");
  const iState = idx("state");
  const iUrl = idx("url");
  if (iDocket < 0 || iUrl < 0) return [];
  const rows: NcuaListingRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const last = (cells[iLast] ?? "").trim();
    const first = (cells[iFirst] ?? "").trim();
    const institution = (cells[iInst] ?? "").trim() || first;
    const url = (cells[iUrl] ?? "").trim();
    const relationship = (cells[iRel] ?? "").trim();
    const people = last && !/^n\/a$/i.test(last) && !looksLikeCreditUnion(last);
    const kind = `${url} ${relationship}`;
    if (/prohibition|civil-money|civil money|late[\s-]?filer|terminat|letter-of-understanding|\blua\b/i.test(kind)) {
      continue;
    }
    const title =
      /cease-and-desist|cease and desist/i.test(url) || (!people && /credit union/i.test(institution))
        ? "Stipulation and Consent to Cease and Desist Order"
        : "";
    rows.push({
      creditUnion: institution,
      institution,
      individual: people ? `${first} ${last}`.trim() : "",
      relationship,
      city: cells[iCity] ?? "",
      state: cells[iState] ?? "",
      docket: cells[iDocket] ?? "",
      year: cells[iYear] ?? "",
      title,
      sourceUrl: url,
    });
  }
  return parseListingRows(rows);
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
  if (/civil money penalty|late[\s-]?filer CMP/i.test(text) && !/cease[\s-]+and[\s-]+desist/i.test(text)) {
    return false;
  }
  const ncua = /National Credit Union Administration/i.test(compact);
  const order =
    /STIPULATION AND CONSENT\s+TO(?:\s+ISSUANCE OF(?:\s+A(?:N)?(?:\s+FINAL)?)?(?:\s+ORDER)?)?\s+(?:TO\s+)?CEASE AND DESIST/i.test(
      compact,
    ) ||
    /CONSENT CEASE AND DESIST ORDER/i.test(compact) ||
    /Consent to a Cease and Desist Order/i.test(compact) ||
    /ORDER TO CEASE AND DESIST/i.test(compact) ||
    /In the Matter of the\s+Cease-and-Desist Order/i.test(compact);
  const docket = DOCKET_RE.test(text);
  const institution = /insured credit union|Federal Credit Union|Credit Union/i.test(compact);
  const findings =
    /\bConsent\b/i.test(compact) ||
    /\bWHEREFORE\b/i.test(compact) ||
    /consents to the issuance/i.test(compact) ||
    /12 U\.S\.C\.\s*§\s*1786/i.test(compact);
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
  const raw = env("NCUA_ORDERS_LIMIT", "24");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 24;
}

function maxFetchLimit(): number {
  const raw = env("NCUA_ORDERS_MAX_FETCH", "36");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 36;
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

export async function fetchNcuaBytes(url: string): Promise<Uint8Array> {
  const official = officialNcuaPdfUrl(url);
  if (!official) throw new Error(`${url} is not an official NCUA administrative-order PDF`);
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  if (head !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("NCUA_ORDERS_PDFTOTEXT") || "pdftotext";
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

function mergeOfficialListings(listed: NcuaOrderListing[], seeds: NcuaOrderListing[]): NcuaOrderListing[] {
  const seen = new Set<string>();
  const out: NcuaOrderListing[] = [];
  const preferCd = (row: NcuaOrderListing) => /cease-and-desist|cease and desist/i.test(row.sourceUrl + " " + row.title);
  const ranked = [...listed].sort((a, b) => Number(preferCd(b)) - Number(preferCd(a)));
  for (const row of [...seeds, ...ranked]) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

async function loadOfficialListings(dir: string): Promise<{ listed: NcuaOrderListing[]; listedCount: number }> {
  if (dir) {
    const listed: NcuaOrderListing[] = [];
    for (const name of ["listing-excerpt.json", "leftover-listing-excerpt.json", "listing.json"]) {
      const json = readNamedFile(dir, [name]);
      if (!json) continue;
      const rows = JSON.parse(json) as NcuaListingRow[];
      if (Array.isArray(rows)) listed.push(...parseListingRows(rows));
    }
    if (listed.length > 0) {
      const merged = mergeOfficialListings(listed, []);
      return { listed: merged, listedCount: merged.length };
    }
    const csv = readNamedFile(dir, ["csv-metadata.csv", "administrative-orders.csv"]);
    if (csv) {
      const fromCsv = parseNcuaCsv(csv);
      return { listed: fromCsv, listedCount: fromCsv.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const fromHtml = html ? parseListingHtml(html) : [];
    return { listed: fromHtml, listedCount: fromHtml.length };
  }
  try {
    const listed = parseNcuaCsv(await fetchNcuaHtml(CSV_URL));
    const merged = mergeOfficialListings([...OFFICIAL_WALK_LISTINGS, ...listed], SEED_LISTINGS);
    if (merged.length > 0) return { listed: merged, listedCount: merged.length };
  } catch {
    /* official CSV missed; try Drupal listing HTML */
  }
  try {
    const listed = parseListingHtml(await fetchNcuaHtml(LISTING_URL));
    const merged = mergeOfficialListings([...OFFICIAL_WALK_LISTINGS, ...listed], SEED_LISTINGS);
    if (merged.length > 0) return { listed: merged, listedCount: merged.length };
  } catch {
    /* official listing missed; walk official administrative-order PDFs */
  }
  const walked = mergeOfficialListings(OFFICIAL_WALK_LISTINGS, SEED_LISTINGS);
  return { listed: walked, listedCount: walked.length };
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
        fetchedPdfs: 0,
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
    if (fetchCap > 0 && fetchedPages + fetchedPdfs >= fetchCap) break;
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
      const pdfFile = join(cacheDir, `${row.docket}.pdf`);
      let raw =
        local ??
        (officialNcuaPdfUrl(row.sourceUrl)
          ? ""
          : await (async () => {
              if (existsSync(cacheFile)) return readFileSync(cacheFile, "utf-8");
              const html = await fetchNcuaHtml(row.sourceUrl);
              writeFileSync(cacheFile, html);
              fetchedPages += 1;
              return html;
            })());
      let parsed = parseNcuaOrderHtml(raw, {
        sourceUrl: row.sourceUrl,
        creditUnion: row.creditUnion,
        location: row.location,
        date: row.date,
        docket: row.docket,
        id: row.id,
        title: row.title,
      });
      if (!isRealNcuaOrderBody(parsed.body)) {
        const pdfUrl = officialNcuaPdfUrl(row.sourceUrl) || officialNcuaPdfUrl(extractOfficialPdfUrl(raw));
        if (pdfUrl) {
          const localPdfText = readNamedFile(dir, [`${row.docket}.txt`, `${row.id}.txt`]);
          const text =
            localPdfText ??
            (await (async () => {
              if (!existsSync(pdfFile)) {
                writeFileSync(pdfFile, await fetchNcuaBytes(pdfUrl));
                fetchedPdfs += 1;
              }
              return pdfToText(pdfFile);
            })());
          parsed = parseNcuaOrderHtml(text, {
            sourceUrl: pdfUrl,
            creditUnion: row.creditUnion,
            location: row.location,
            date: row.date,
            docket: row.docket,
            id: row.id,
            title: row.title,
          });
        }
      }
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
    fetchedPdfs,
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
    note: paidBodyCatalogNote("/ncua-orders", 'Full catalog: count + credit union + docket + date + official URL. Not the official CSV'),
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
            fetchedPdfs: snap.fetchedPdfs ?? 0,
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
