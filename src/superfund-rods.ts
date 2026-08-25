/**
 * EPA Superfund Record of Decision TEXT door.
 * Official ROD PDFs from semspub.epa.gov only.
 * Does not invent ROD text. Institution/site only. Not people. Not a Proposed Plan or fact sheet.
 * Not AIR /air-letters. Not TTB /ttb-oic. Not De Novo /denovo-orders. Not FIFRA /fifra-orders. Not CFTC /cftc-orders.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const SUPERFUND_RODS_PATH = "/superfund-rods";
export const SUPERFUND_RODS_MANIFEST_PATH = "/superfund-rods/manifest.json";
export const SUPERFUND_RODS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "epa-superfund-rod-bodies";
export const PRODUCT_NAME = "EPA Superfund ROD text";

/** Official EPA Superfund decision-document table. Collection 25504 is RODs / amendments / ESDs. */
export const LISTING_URL = "https://www.epa.gov/superfund/search-superfund-decision-documents";
/** First-slice teaser: one CUMULIS site-profile cleanup page, not the ROD table. */
export const SITE_PROFILE_URL =
  "https://cumulis.epa.gov/supercpad/SiteProfiles/index.cfm?fuseaction=second.Cleanup&id=0501275";
/** Same listing feed the official decision-document DataTable loads. Used only to find official SEMS PDF URLs. */
export const MASTER_COLLECTION_URL = "https://www3.epa.gov/semsjson/HQ_MasterCollection_11.json";
export const ROD_COLLECTION_ID = "25504";
export const PDF_HOST = "semspub.epa.gov";
export const PDF_ORIGIN = "https://semspub.epa.gov";
export const DOCKET_BARE_RE = /^(\d{2}-\d+)$/;
export const MEDIA_RE = /\/work\/(\d{2})\/(\d+)\.pdf/i;
export const DOCUMENT_RE = /\/src\/document\/(\d{2})\/(\d+)(?:\.pdf)?/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "U.S. EPA";

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

export type SuperfundRodListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type SuperfundRodListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type SuperfundRodCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type SuperfundRodSnapshot = {
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
  cards: SuperfundRodCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (EPA Superfund ROD texts; +https://www.epa.gov/superfund)";
const OFFICIAL_HOSTS = new Set(["semspub.epa.gov"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.P\.|LP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|Chemical|Superfund|Site|Plume|Drain)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;

export const SEED_LISTINGS: SuperfundRodListing[] = [
  {
    id: "05-711427",
    docket: "05-711427",
    institution: "Federated Metals Corp. Whiting Superfund Site",
    date: "2026-08-05",
    title: "Interim Record of Decision",
    sourceUrl: "https://semspub.epa.gov/work/05/711427.pdf",
    pdfId: "05-711427.pdf",
  },
  {
    id: "02-744534",
    docket: "02-744534",
    institution: "Meeker Avenue Plume Superfund Site",
    date: "2024-09-27",
    title: "Record of Decision",
    sourceUrl: "https://semspub.epa.gov/work/02/744534.pdf",
    pdfId: "02-744534.pdf",
  },
  {
    id: "05-988133",
    docket: "05-988133",
    institution: "Ten-Mile Drain Superfund Site",
    date: "2024-01-22",
    title: "Record of Decision",
    sourceUrl: "https://semspub.epa.gov/work/05/988133.pdf",
    pdfId: "05-988133.pdf",
  },
  {
    id: "05-978074",
    docket: "05-978074",
    institution: "Velsicol Chemical Corporation Superfund Site",
    date: "2022-10-06",
    title: "Record of Decision",
    sourceUrl: "https://semspub.epa.gov/work/05/978074.pdf",
    pdfId: "05-978074.pdf",
  },
  {
    id: "05-964773",
    docket: "05-964773",
    institution: "Pike and Mulberry Streets PCE Plume Superfund Site",
    date: "2021-03-11",
    title: "Record of Decision",
    sourceUrl: "https://semspub.epa.gov/work/05/964773.pdf",
    pdfId: "05-964773.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function superfundRodsDir(): string {
  if (env("SUPERFUND_RODS_DIR")) return resolve(env("SUPERFUND_RODS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/superfund-rods"));
}

export function snapshotPath(): string {
  return join(superfundRodsDir(), "snapshot.json");
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

function semsDocumentParts(pathname: string): { region: string; docId: string } | null {
  const decoded = decodeURIComponent(pathname);
  const media = decoded.match(MEDIA_RE) || decoded.match(DOCUMENT_RE);
  return media ? { region: media[1], docId: media[2] } : null;
}

export function officialSuperfundRodPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org" || host === "federalregister.gov" || host === "www.federalregister.gov") {
      return null;
    }
    if (host === "cumulis.epa.gov" || host === "www.epa.gov" || host === "www3.epa.gov") return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const media = semsDocumentParts(parsed.pathname);
    if (!media) return null;
    return `${PDF_ORIGIN}/work/${media.region}/${media.docId}.pdf`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialSuperfundRodPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = parsed.pathname.match(MEDIA_RE);
    return media ? `${media[1]}-${media[2]}.pdf` : null;
  } catch {
    return null;
  }
}

export function slugFromUrl(url: string): string {
  const official = officialSuperfundRodPdfUrl(url) || url || "";
  const media = official.match(MEDIA_RE);
  return media ? `${media[1]}-${media[2]}` : "unknown";
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (DOCKET_BARE_RE.test(trimmed) && !/\s/.test(trimmed)) return trimmed;
  return null;
}

function siteNameForPeopleCheck(name: string): string {
  return name
    .replace(/\s+(Interim\s+)?Record of Decision.*$/i, "")
    .replace(/\s+Proposed Plan.*$/i, "")
    .trim();
}

export function isPeopleRow(row: SuperfundRodListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = siteNameForPeopleCheck((row.institution ?? "").trim());
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isProposedPlanRow(row: SuperfundRodListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`;
  return /Proposed Plan|Fact Sheet|Community Update/i.test(kind);
}

export function isNonRodDecisionRow(row: SuperfundRodListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""}`;
  if (/Proposed Plan|Fact Sheet|Community Update|Five[- ]Year Review/i.test(kind)) return true;
  if (/Explanation of Signif[i]?cant Differences|\bESD\b/i.test(kind)) return true;
  if (/\bAmendment\b/i.test(kind)) return true;
  if (/Approval of the Record of Decision|US EPA Approval/i.test(kind)) return true;
  if (/Supplement to .*Record of Decision|Record of Accomplishment/i.test(kind)) return true;
  return false;
}

export function isRodTitle(title: string | null | undefined): boolean {
  const kind = title ?? "";
  if (isNonRodDecisionRow({ title: kind })) return false;
  return /Record of Decision|\bIROD\b|\bROD\b/i.test(kind);
}

export function isInstitutionOrderRow(row: SuperfundRodListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (isNonRodDecisionRow(row) || isProposedPlanRow(row)) return false;
  if (!officialSuperfundRodPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""}`;
  if (!isRodTitle(kind)) return false;
  return true;
}

export function parseListingRows(rows: SuperfundRodListingRow[]): SuperfundRodListing[] {
  const found: SuperfundRodListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const sourceUrl = officialSuperfundRodPdfUrl(row.sourceUrl ?? "");
    const pdfId = (row.pdfId ?? "").trim() || pdfIdFromUrl(sourceUrl ?? "") || "";
    const docket = normalizeDocket(row.docket) || slugFromUrl(sourceUrl ?? "");
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    const title = (row.title ?? "").trim();
    found.push({
      id: normalizeDocket(row.docket) || docket,
      docket,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: /interim/i.test(title) ? "Interim Record of Decision" : "Record of Decision",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): SuperfundRodListing[] {
  const rows: SuperfundRodListingRow[] = [];
  const links = [
    ...html.matchAll(
      /(?:(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})[\s\S]{0,240}?)?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];
  for (const m of links) {
    const href = m[2].startsWith("http") ? m[2] : `${PDF_ORIGIN}${m[2].startsWith("/") ? "" : "/"}${m[2]}`;
    if (!officialSuperfundRodPdfUrl(href)) continue;
    const title = stripTags(m[3]);
    const docket = slugFromUrl(href);
    rows.push({
      institution: siteNameForPeopleCheck(title) || title,
      date: m[1] || undefined,
      title: /proposed plan/i.test(title)
        ? "Proposed Plan"
        : /interim/i.test(title)
          ? "Interim Record of Decision"
          : "Record of Decision",
      sourceUrl: href,
      pdfId: pdfIdFromUrl(href) ?? "",
      docket,
    });
  }
  return parseListingRows(rows);
}

export type MasterCollectionRow = {
  date?: string;
  siteName?: string;
  title?: string;
  documentId?: string | number;
  region?: string;
  collections?: string;
  epaId?: string;
};

function masterCollectionRows(raw: unknown): MasterCollectionRow[] {
  if (Array.isArray(raw)) return raw as MasterCollectionRow[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: MasterCollectionRow[] }).data;
  }
  return [];
}

export function hasRodCollection(collections: string | null | undefined): boolean {
  return (collections ?? "")
    .split("|")
    .map((part) => part.trim())
    .includes(ROD_COLLECTION_ID);
}

export function parseMasterCollectionJson(raw: string | unknown): SuperfundRodListing[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const rows: SuperfundRodListingRow[] = [];
  for (const item of masterCollectionRows(parsed)) {
    if (!hasRodCollection(item.collections)) continue;
    const titleHtml = item.title ?? "";
    const href =
      (titleHtml.match(/href=['"]([^'"]+)['"]/i) || [])[1] ||
      (item.region && item.documentId ? `${PDF_ORIGIN}/src/document/${item.region}/${item.documentId}` : "");
    const title = stripTags(titleHtml).replace(/\(\s*\d+\s*pp[\s\S]*$/i, "").trim();
    rows.push({
      institution: (item.siteName ?? "").trim(),
      date: item.date,
      title,
      sourceUrl: href,
      pdfId: pdfIdFromUrl(href) ?? "",
      docket: slugFromUrl(href),
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ docket \/ date \/ PDF URL/i.test(text)) return true;
  if (/FDA De Novo press teaser|EPA FIFRA press teaser|Proposed Plan teaser/i.test(text)) return true;
  if (/"success"\s*:\s*true/.test(text) && /"documentId"/.test(text) && /"collections"/.test(text)) {
    return true;
  }
  if (/fuseaction=second\.Cleanup/i.test(text) && !/RECORD OF DECISION/i.test(text)) return true;
  if (/INSTRUCTIONS/i.test(text) && !/RECORD OF DECISION/i.test(text) && !/DECLARATION/i.test(text)) {
    return true;
  }
  return false;
}

export function isFederalRegisterDump(text: string): boolean {
  return /"raw_text"/.test(text) || /"full_text"/.test(text) || /federalregister\.gov/i.test(text);
}

export function isPeopleDump(text: string): boolean {
  if (/people-only CFTC/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isRealSuperfundRodBody(text: string): boolean {
  if (isIndexTeaserDump(text) || isFederalRegisterDump(text) || isPeopleDump(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 2000) return false;
  if (/Proposed Plan/i.test(text) && !/Record of Decision/i.test(text)) return false;
  if (/Community Update|Fact Sheet/i.test(text) && !/Record of Decision/i.test(text)) return false;
  if (/Center for Devices and Radiological Health/i.test(text) && /De Novo request/i.test(text)) return false;
  if (/ENVIRONMENTAL PROTECTION AGENCY/i.test(text) && /FIFRA-\d{2}-\d{4}-\d{4}/i.test(text)) return false;
  if (/COMMODITY FUTURES TRADING COMMISSION/i.test(text) && /CFTC Docket No/i.test(text)) return false;
  if (/Bureau of Industry and Security/i.test(text) && /PROPOSED CHARGING LETTER|ORDER RELATING TO/i.test(text)) {
    return false;
  }
  if (/ALCOHOL AND TOBACCO TAX AND TRADE BUREAU/i.test(text) && /ABSTRACT AND STATEMENT/i.test(text)) return false;
  if (/\d{2}-\d{3}-01air/i.test(text) && /Confirmation of the regulatory status/i.test(text)) return false;
  if (/(?:MONETARY )?PENALTY NOTICE/i.test(text) && /Information Commissioner/i.test(text) && /(?:Data Protection Act 2018|section 155)/i.test(text)) {
    return false;
  }
  const rod = /RECORD OF DECISION/i.test(text);
  const epa = /ENVIRONMENTAL PROTECTION AGENCY|U\.S\. EPA|United States Environmental Protection Agency/i.test(text);
  const cercla = /Superfund|CERCLA|Comprehensive Environmental Response/i.test(text);
  const declaration = /DECLARATION/i.test(text);
  return rod && epa && cercla && declaration;
}

export function parseSuperfundRodText(
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
): SuperfundRodCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialSuperfundRodPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(meta.id) || slugFromUrl(sourceUrl);
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || `${docket}.pdf`;
  const title = (meta.title ?? "").trim();
  return {
    id: meta.id && normalizeDocket(meta.id) ? normalizeDocket(meta.id)! : docket,
    docket,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 4000)),
    title: /interim/i.test(title) ? "Interim Record of Decision" : title || "Record of Decision",
    sourceUrl,
    body,
  };
}

export function emptySuperfundRodsSnapshot(reason: string): SuperfundRodSnapshot {
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

export function assembleSuperfundRodsSnapshot(
  cards: SuperfundRodCard[],
  fetchedAt = new Date().toISOString(),
): SuperfundRodSnapshot {
  const withBody = cards
    .filter((c) => isRealSuperfundRodBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official EPA Superfund ROD PDFs had no extractable ROD text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): SuperfundRodSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as SuperfundRodSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSuperfundRodsSnapshot(): SuperfundRodSnapshot | null {
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

export function writeSuperfundRodsSnapshot(snap: SuperfundRodSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchSuperfundRodBytes(url: string): Promise<Uint8Array> {
  const official = officialSuperfundRodPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export async function fetchSuperfundRodText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": HTTP_UA,
      Accept: "application/json,text/html,application/xhtml+xml,application/xml,text/xml;q=0.8,*/*;q=0.5",
    },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("SUPERFUND_RODS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("SUPERFUND_RODS_JSON_DIR") || env("SUPERFUND_RODS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("SUPERFUND_RODS_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("SUPERFUND_RODS_MAX_FETCH", "8"));
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

function mergeOfficialListings(listed: SuperfundRodListing[], seeds: SuperfundRodListing[]): SuperfundRodListing[] {
  const seenId = new Set<string>();
  const seenPdf = new Set<string>();
  const out: SuperfundRodListing[] = [];
  for (const row of [...seeds, ...listed]) {
    const pdfKey = (row.sourceUrl || row.pdfId || "").toLowerCase();
    if (!row.id || seenId.has(row.id)) continue;
    if (pdfKey && seenPdf.has(pdfKey)) continue;
    seenId.add(row.id);
    if (pdfKey) seenPdf.add(pdfKey);
    out.push(row);
  }
  out.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return out;
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadOfficialListings(dir: string): Promise<{ listed: SuperfundRodListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as SuperfundRodListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  try {
    const listed = parseMasterCollectionJson(await fetchSuperfundRodText(MASTER_COLLECTION_URL));
    const merged = mergeOfficialListings(listed, SEED_LISTINGS);
    if (merged.length > 0) return { listed: merged, listedCount: listed.length };
  } catch {
    /* official ROD table missed; keep first-slice seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectSuperfundRods(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<SuperfundRodSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = superfundRodsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, SuperfundRodCard>();
  for (const card of readSuperfundRodsSnapshot()?.cards ?? []) {
    if (isRealSuperfundRodBody(card.body)) prior.set(card.id, card);
  }
  const cards: SuperfundRodCard[] = [];
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
    try {
      const localText = readNamedFile(dir, [`${row.docket}.txt`, `${row.id}.txt`, `${row.pdfId}.txt`, row.pdfId.replace(/\.pdf$/i, ".txt")]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, row.pdfId.endsWith(".pdf") ? row.pdfId : `${row.docket}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            if (!dir) await pause(opts?.pauseMs ?? 200);
            writeFileSync(pdfFile, await fetchSuperfundRodBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseSuperfundRodText(text, row);
      if (!isRealSuperfundRodBody(parsed.body)) {
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
  const snap = { ...assembleSuperfundRodsSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeSuperfundRodsSnapshot(snap);
  return snap;
}

export async function loadSuperfundRods(): Promise<SuperfundRodSnapshot> {
  const cached = readSuperfundRodsSnapshot();
  if (cached && cached.cards.some((c) => isRealSuperfundRodBody(c.body))) return cached;
  try {
    return await collectSuperfundRods();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live Superfund ROD fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySuperfundRodsSnapshot(
      `Superfund ROD PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildSuperfundRodsManifest(snap: SuperfundRodSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealSuperfundRodBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + docket + date + official PDF URL only. ROD body is the paid GET /superfund-rods payload. Not people. Not a Proposed Plan. Not AIR /air-letters. Not TTB /ttb-oic. Not De Novo /denovo-orders. Not FIFRA /fifra-orders. Not CFTC /cftc-orders.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: SUPERFUND_RODS_AMOUNT_ATOMIC,
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

export async function loadSuperfundRodsManifest(): Promise<Record<string, unknown>> {
  return buildSuperfundRodsManifest(readSuperfundRodsSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectSuperfundRods()
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
