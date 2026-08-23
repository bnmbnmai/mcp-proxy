/**
 * US FMC Commission / ALJ Shipping Act order TEXT door.
 * Official PDFs from www2.fmc.gov/readingroom/ only, via pdftotext.
 * Does not invent order text. Institution/company only. Not people.
 * Not press HTML. Not F.M.C.2d compilations through 2024. Not the 2023 FR OIH notice.
 * Not /mariners LNM. Not PHMSA /phmsa-cop. Not a stub.
 * Not FR. Not catalog.data.gov. Not ICO /ico-mpn. Not IPO /ipo-tm.
 * License: 17 U.S.C. § 105 (FMC federal).
 * Prep only — do not list on well-known / OpenAPI / llms.txt / shop catalog.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const FMC_ORDERS_PATH = "/fmc-orders";
export const FMC_ORDERS_MANIFEST_PATH = "/fmc-orders/manifest.json";
export const FMC_ORDERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "fmc-institution-order-bodies";
export const PRODUCT_NAME = "FMC Commission / ALJ Shipping Act order text";

export const LISTING_URL = "https://www2.fmc.gov/readingroom/";
export const PDF_HOST = "www2.fmc.gov";
export const PDF_ORIGIN = "https://www2.fmc.gov";
export const MEDIA_RE = /\/readingroom\/docs\/([^/]+)\/([^/?#]+?\.pdf)\/?/i;
export const DOCKET_BARE_RE = /^([a-z0-9][a-z0-9._-]{2,80})$/;
export const LICENSE = "17 U.S.C. § 105";
export const ATTRIBUTION =
  "Federal Maritime Commission (FMC). Work of the United States Government; 17 U.S.C. § 105.";

export const CARD_FIELDS = [
  "id",
  "docket",
  "proceeding",
  "pdfId",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type FmcOrdersListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  proceeding?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type FmcOrdersListing = {
  id: string;
  docket: string;
  proceeding: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type FmcOrdersCard = {
  id: string;
  docket: string;
  proceeding: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type FmcOrdersSnapshot = {
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
  cards: FmcOrdersCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FMC order texts; +https://www2.fmc.gov/readingroom/)";
const OFFICIAL_HOSTS = new Set(["www2.fmc.gov"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.L\.P\.|LLP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|PLC|Plc|plc|Pte\.?|GmbH|S\.A\.|SA|AG|Holdings|Lines|Shipping|Marine|Transport|Logistics|Council)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const ORDER_TITLE_RE =
  /Order on Initial Decision|Initial Decision|Order to Show Cause|Order Directing|Show Cause|BY THE COMMISSION/i;
const KILL_TITLE_RE =
  /press html|f\.?m\.?c\.?\s*2d|compilation|federal register|fr oih|catalog\.data\.gov|mariners|lnm|phmsa|ico-mpn|ipo-tm|people/i;

const FILENAME_DOCKET: Record<string, string> = {
  "(32) 23-08 Order on Initial Decision (public).pdf": "msc-23-08",
  "(143) 23-02 Initial Decision (public version).pdf": "oocl-23-02",
  "(01) CC-002 Order Directing Hapag-Lloyd AG to Show Cause (public).pdf": "hapag-cc-002",
  "(35) 24-10 Initial Decision.pdf": "yang-ming-24-10",
  "(01) 25-10 Order to Show Cause on WSC Agreement(Public).pdf": "wsc-25-10",
};

const PROCEEDING_DOCKET: Record<string, string> = {
  "23-08": "msc-23-08",
  "23-02": "oocl-23-02",
  "CC-002": "hapag-cc-002",
  "24-10": "yang-ming-24-10",
  "25-10": "wsc-25-10",
};

const TITLE_BY_DOCKET: Record<string, string> = {
  "msc-23-08": "Order on Initial Decision",
  "oocl-23-02": "Initial Decision",
  "hapag-cc-002": "Order to Show Cause",
  "yang-ming-24-10": "Initial Decision",
  "wsc-25-10": "Order to Show Cause",
};

export const SEED_LISTINGS: FmcOrdersListing[] = [
  {
    id: "msc-23-08",
    docket: "msc-23-08",
    proceeding: "23-08",
    institution: "MSC Mediterranean Shipping Company S.A.",
    date: "2026-01-06",
    title: "Order on Initial Decision",
    sourceUrl:
      "https://www2.fmc.gov/readingroom/docs/23-08/(32)%2023-08%20Order%20on%20Initial%20Decision%20(public).pdf/",
    pdfId: "(32) 23-08 Order on Initial Decision (public).pdf",
  },
  {
    id: "oocl-23-02",
    docket: "oocl-23-02",
    proceeding: "23-02",
    institution: "Orient Overseas Container Line Limited / OOCL (Europe) Limited",
    date: "2026-04-24",
    title: "Initial Decision",
    sourceUrl:
      "https://www2.fmc.gov/readingroom/docs/23-02/(143)%2023-02%20Initial%20Decision%20(public%20version).pdf/",
    pdfId: "(143) 23-02 Initial Decision (public version).pdf",
  },
  {
    id: "hapag-cc-002",
    docket: "hapag-cc-002",
    proceeding: "CC-002",
    institution: "Hapag-Lloyd AG",
    date: "2026-03-06",
    title: "Order to Show Cause",
    sourceUrl:
      "https://www2.fmc.gov/readingroom/docs/CC-002/(01)%20CC-002%20Order%20Directing%20Hapag-Lloyd%20AG%20to%20Show%20Cause%20(public).pdf/",
    pdfId: "(01) CC-002 Order Directing Hapag-Lloyd AG to Show Cause (public).pdf",
  },
  {
    id: "yang-ming-24-10",
    docket: "yang-ming-24-10",
    proceeding: "24-10",
    institution: "Yang Ming Marine Transport Corp.",
    date: "2025-03-24",
    title: "Initial Decision",
    sourceUrl: "https://www2.fmc.gov/readingroom/docs/24-10/(35)%2024-10%20Initial%20Decision.pdf/",
    pdfId: "(35) 24-10 Initial Decision.pdf",
  },
  {
    id: "wsc-25-10",
    docket: "wsc-25-10",
    proceeding: "25-10",
    institution: "World Shipping Council",
    date: "2025-06-26",
    title: "Order to Show Cause",
    sourceUrl:
      "https://www2.fmc.gov/readingroom/docs/25-10/(01)%2025-10%20Order%20to%20Show%20Cause%20on%20WSC%20Agreement(Public).pdf/",
    pdfId: "(01) 25-10 Order to Show Cause on WSC Agreement(Public).pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function fmcOrdersDir(): string {
  if (env("FMC_ORDERS_DIR")) return resolve(env("FMC_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/fmc-orders"));
}

export function snapshotPath(): string {
  return join(fmcOrdersDir(), "snapshot.json");
}

export function compactForMatch(text: string): string {
  return text.replace(/-\n\s*/g, "").replace(/\s+/g, " ").trim();
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " "));
}

const MONTHS: Record<string, string> = {
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

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const named = raw.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
  );
  if (named) {
    const mm = MONTHS[named[2].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[1].padStart(2, "0")}` : null;
  }
  return null;
}

function blockedHost(host: string): boolean {
  return (
    host === "www.federalregister.gov" ||
    host === "federalregister.gov" ||
    host === "catalog.data.gov" ||
    host === "www.data.gov" ||
    host === "data.gov" ||
    host === "primis.phmsa.dot.gov" ||
    host === "www.primis.phmsa.dot.gov" ||
    host === "www.navcen.uscg.gov" ||
    host === "navcen.uscg.gov" ||
    host === "www.fmc.gov" ||
    host === "fmc.gov" ||
    host === "ico.org.uk" ||
    host === "www.ico.org.uk" ||
    host === "www.ipo.gov.uk" ||
    host === "ipo.gov.uk" ||
    host === "web.archive.org"
  );
}

function encodePdfFilename(name: string): string {
  return name.replace(/ /g, "%20");
}

function filenameFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return decodeURIComponent(parts.at(-1) ?? "");
}

export function officialFmcOrdersPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (/\/articles\//i.test(path) || /\.html?$/i.test(path)) return null;
    if (/fmc2d|f\.m\.c\.2d|compilation/i.test(path)) return null;
    if (/federalregister|catalog\.data\.gov/i.test(path)) return null;
    const media = path.match(MEDIA_RE);
    if (!media) return null;
    return `${PDF_ORIGIN}/readingroom/docs/${media[1]}/${encodePdfFilename(media[2])}/`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialFmcOrdersPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = decodeURIComponent(parsed.pathname).match(MEDIA_RE);
    return media ? filenameFromPath(media[2]) : null;
  } catch {
    return null;
  }
}

export function proceedingFromUrl(url: string | null | undefined): string | null {
  const official = officialFmcOrdersPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = decodeURIComponent(parsed.pathname).match(MEDIA_RE);
    return media ? media[1] : null;
  } catch {
    return null;
  }
}

export function slugFromUrl(url: string): string {
  const pdfId = pdfIdFromUrl(url) || "";
  if (FILENAME_DOCKET[pdfId]) return FILENAME_DOCKET[pdfId];
  const proceeding = proceedingFromUrl(url);
  if (proceeding && PROCEEDING_DOCKET[proceeding]) return PROCEEDING_DOCKET[proceeding];
  return pdfId.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "unknown";
}

export function normalizeProceeding(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const cc = trimmed.match(/^CC-?0*(\d{1,4})$/i);
  if (cc) return `CC-${cc[1].padStart(3, "0")}`;
  const docket = trimmed.match(/^(\d{2})-(\d{2})$/);
  if (docket) return `${docket[1]}-${docket[2]}`;
  if (PROCEEDING_DOCKET[trimmed]) return trimmed;
  return null;
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (FILENAME_DOCKET[trimmed]) return FILENAME_DOCKET[trimmed];
  const proceeding = normalizeProceeding(trimmed);
  if (proceeding && PROCEEDING_DOCKET[proceeding]) return PROCEEDING_DOCKET[proceeding];
  if (DOCKET_BARE_RE.test(trimmed) && !/\s/.test(trimmed)) return trimmed;
  return null;
}

export function isPeopleRow(row: FmcOrdersListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isPressRow(row: FmcOrdersListingRow): boolean {
  return /press|\/articles\//i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isFmc2dRow(row: FmcOrdersListingRow): boolean {
  return /f\.?m\.?c\.?\s*2d|compilation/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.proceeding ?? ""}`);
}

export function isFrOihRow(row: FmcOrdersListingRow): boolean {
  return /fr oih|federalregister|2023 FR/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isMarinersRow(row: FmcOrdersListingRow): boolean {
  return /mariners|lnm|navcen/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isPhmsaRow(row: FmcOrdersListingRow): boolean {
  return /phmsa|primis\.phmsa/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isCatalogRow(row: FmcOrdersListingRow): boolean {
  return /catalog\.data\.gov/i.test(`${row.sourceUrl ?? ""} ${row.title ?? ""}`);
}

export function isInstitutionOrderRow(row: FmcOrdersListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (isPressRow(row)) return false;
  if (isFmc2dRow(row)) return false;
  if (isFrOihRow(row)) return false;
  if (isMarinersRow(row)) return false;
  if (isPhmsaRow(row)) return false;
  if (isCatalogRow(row)) return false;
  if (!officialFmcOrdersPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`;
  if (KILL_TITLE_RE.test(kind)) return false;
  if (!ORDER_TITLE_RE.test(kind)) return false;
  return true;
}

export function parseListingRows(rows: FmcOrdersListingRow[]): FmcOrdersListing[] {
  const found: FmcOrdersListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const sourceUrl = officialFmcOrdersPdfUrl(row.sourceUrl ?? "");
    const pdfId = (row.pdfId ?? "").trim() || pdfIdFromUrl(sourceUrl ?? "") || "";
    const docket = normalizeDocket(row.docket) || slugFromUrl(sourceUrl ?? "");
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: normalizeDocket(row.docket) || docket,
      docket,
      proceeding: normalizeProceeding(row.proceeding) || proceedingFromUrl(sourceUrl) || "",
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: TITLE_BY_DOCKET[docket] || (row.title ?? "").trim() || "Order",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): FmcOrdersListing[] {
  const rows: FmcOrdersListingRow[] = [];
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of links) {
    const href = m[1].startsWith("http") ? m[1] : `${PDF_ORIGIN}${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (!officialFmcOrdersPdfUrl(href)) continue;
    const title = stripTags(m[2]);
    const docket = slugFromUrl(href);
    rows.push({
      institution: title.replace(/\s+(Order|Initial Decision|Show Cause|Docket).*$/i, "").trim() || title,
      date: isoDate(title) || undefined,
      title: TITLE_BY_DOCKET[docket] || "Order",
      type: "order",
      sourceUrl: href,
      pdfId: pdfIdFromUrl(href) ?? "",
      docket,
      proceeding: proceedingFromUrl(href) ?? undefined,
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ docket \/ date \/ official PDF URL/i.test(text)) return true;
  if (/Card log \/ \$22\.67m teaser is NOT the sold body/i.test(text) && !/FEDERAL MARITIME COMMISSION/i.test(text)) {
    return true;
  }
  return false;
}

export function isPeopleDump(text: string): boolean {
  if (/people-only FMC|named-individual SKU/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isPressDump(text: string): boolean {
  return /fmc\.gov\/articles\/|MSC Assessed Civil Penalties|Press HTML/i.test(text);
}

export function isFmc2dDump(text: string): boolean {
  return /F\.M\.C\.2d compilation|bound reporter volume/i.test(text);
}

export function isFrOihDump(text: string): boolean {
  return /2023 Federal Register Order of Investigation|88 FR OIH|federalregister\.gov wrap/i.test(text);
}

export function isMarinersDump(text: string): boolean {
  return /Local Notice to Mariners|\/mariners\b/i.test(text);
}

export function isPhmsaCopDump(text: string): boolean {
  return /Pipeline and Hazardous Materials Safety Administration|\bPHMSA\b/i.test(text) && /CONSENT ORDER|\/phmsa-cop\b/i.test(text);
}

export function isFederalRegisterDump(text: string): boolean {
  return /Federal Register raw_text wrap|Do not wrap FR/i.test(text);
}

export function isCatalogDump(text: string): boolean {
  return /catalog\.data\.gov wrap|Do not wrap catalog\.data\.gov/i.test(text);
}

export function isIcoMpnDump(text: string): boolean {
  if (/Information Commissioner'?s Office/i.test(text) && /Monetary Penalty Notice|PENALTY NOTICE/i.test(text)) {
    return true;
  }
  if (/\bICO MPN\b/i.test(text) || /\/ico-mpn\b/i.test(text)) return true;
  return false;
}

export function isIpoTmDump(text: string): boolean {
  return /TRADE MARKS ACT 1994/i.test(text) && /\/ipo-tm\b|For the Registrar/i.test(text);
}

export function isRealFmcOrderBody(text: string): boolean {
  if (
    isIndexTeaserDump(text) ||
    isPeopleDump(text) ||
    isPressDump(text) ||
    isFmc2dDump(text) ||
    isFrOihDump(text) ||
    isMarinersDump(text) ||
    isPhmsaCopDump(text) ||
    isFederalRegisterDump(text) ||
    isCatalogDump(text) ||
    isIcoMpnDump(text) ||
    isIpoTmDump(text)
  ) {
    return false;
  }
  const compact = compactForMatch(text);
  if (compact.length < 2000) return false;
  const commission = /FEDERAL MARITIME COMMISSION/i.test(compact);
  const statute = /Shipping Act|46 U\.S\.C\./i.test(compact);
  const order =
    /Order on Initial Decision|INITIAL DECISION|ORDER TO SHOW CAUSE|ORDER DIRECTING|BY THE COMMISSION|Administrative Law Judge/i.test(
      compact,
    );
  const company = ENTITY_RE.test(compact);
  return commission && statute && order && company;
}

export function parseFmcOrdersText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    docket?: string | null;
    proceeding?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): FmcOrdersCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFmcOrdersPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(meta.id) || slugFromUrl(sourceUrl);
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || `${docket}.pdf`;
  const proceeding = normalizeProceeding(meta.proceeding) || proceedingFromUrl(sourceUrl) || "";
  return {
    id: meta.id && normalizeDocket(meta.id) ? normalizeDocket(meta.id)! : docket,
    docket,
    proceeding,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 800)) ?? isoDate(body.slice(-800)),
    title: TITLE_BY_DOCKET[docket] || meta.title || "Order",
    sourceUrl,
    body,
  };
}

export function emptyFmcOrdersSnapshot(reason: string): FmcOrdersSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/readingroom/` },
    cards: [],
  };
}

export function assembleFmcOrdersSnapshot(cards: FmcOrdersCard[], fetchedAt = new Date().toISOString()): FmcOrdersSnapshot {
  const withBody = cards
    .filter((c) => isRealFmcOrderBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official FMC Commission/ALJ order PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/readingroom/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): FmcOrdersSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FmcOrdersSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readFmcOrdersSnapshot(): FmcOrdersSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  return null;
}

export function writeFmcOrdersSnapshot(snap: FmcOrdersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchFmcOrdersBytes(url: string): Promise<Uint8Array> {
  const official = officialFmcOrdersPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("FMC_ORDERS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("FMC_ORDERS_JSON_DIR") || env("FMC_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("FMC_ORDERS_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("FMC_ORDERS_MAX_FETCH", "8"));
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

function safePdfName(pdfId: string, docket: string): string {
  const name = pdfId.endsWith(".pdf") ? pdfId : `${docket}.pdf`;
  return name.replace(/[^\w.\- ()]+/g, "_");
}

async function loadOfficialListings(dir: string): Promise<{ listed: FmcOrdersListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as FmcOrdersListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialText(row: FmcOrdersListing, cacheDir: string, fetched: { n: number }): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.docket));
  if (!existsSync(pdfFile)) {
    writeFileSync(pdfFile, await fetchFmcOrdersBytes(row.sourceUrl));
    fetched.n += 1;
  }
  return pdfToText(pdfFile);
}

export async function collectFmcOrders(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FmcOrdersSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = fmcOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, FmcOrdersCard>();
  for (const card of readFmcOrdersSnapshot()?.cards ?? []) {
    if (isRealFmcOrderBody(card.body)) prior.set(card.id, card);
  }
  const cards: FmcOrdersCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  const fetched = { n: 0 };
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = prior.get(row.id);
    if (cached) {
      cards.push(cached);
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetched.n >= fetchCap) break;
    try {
      const localText = readNamedFile(dir, [
        `${row.docket}.txt`,
        `${row.id}.txt`,
        `${row.pdfId}.txt`,
        row.pdfId.replace(/\.pdf$/i, ".txt"),
      ]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const text = localText ?? (await extractOfficialText(row, cacheDir, fetched));
      fetchedPdfs = fetched.n;
      const parsed = parseFmcOrdersText(text, row);
      if (!isRealFmcOrderBody(parsed.body)) {
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
  const snap = { ...assembleFmcOrdersSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeFmcOrdersSnapshot(snap);
  return snap;
}

export async function loadFmcOrders(): Promise<FmcOrdersSnapshot> {
  const cached = readFmcOrdersSnapshot();
  if (cached && cached.cards.some((c) => isRealFmcOrderBody(c.body))) return cached;
  try {
    return await collectFmcOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live FMC order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyFmcOrdersSnapshot(
      `FMC order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFmcOrdersManifest(snap: FmcOrdersSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFmcOrderBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + docket + date + official PDF URL only. Order body is the paid GET /fmc-orders payload. Not people. Not press HTML. Not F.M.C.2d compilations. Not the 2023 FR OIH notice. Not /mariners LNM. Not PHMSA /phmsa-cop. Not FR. Not catalog.data.gov. Prep only — do not list.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: FMC_ORDERS_AMOUNT_ATOMIC,
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
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/readingroom/` },
  };
}

export async function loadFmcOrdersManifest(): Promise<Record<string, unknown>> {
  return buildFmcOrdersManifest(readFmcOrdersSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFmcOrders()
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
              proceeding: c.proceeding,
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
