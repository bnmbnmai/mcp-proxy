/**
 * NLRB Board Decision / Decision and Order / Supplemental Decision and Order TEXT door.
 * Official slip-opinion PDFs from apps.nlrb.gov/link/document.aspx/{id} only.
 * Harvest with wget (Safari / full browser UA) + pdftotext.
 * NLRB-authored company/institution NLRA ULP / representation Decision and Order only.
 * Not people. Not the Board Decisions listing. Not the case-page docket / allegation-code teaser.
 * Not case-search CSV. Not CiteNet. Not ALJ-only. Not FR / GovInfo / catalog.data.gov /
 * GOV.UK corporate_report. Not /nop-ad / /ico-mpn / /phmsa-cop / /fmc-orders / /fsis-hmsa.
 * License: 17 U.S.C. § 105. Official .gov host. Face: “An Agency of the United States Government.”
 * Prep only — do not list on well-known / OpenAPI / llms.txt / shop catalog.
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const NLRB_BD_PATH = "/nlrb-bd";
export const NLRB_BD_MANIFEST_PATH = "/nlrb-bd/manifest.json";
export const NLRB_BD_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "nlrb-bd-decision-bodies";
export const PRODUCT_NAME = "NLRB Board Decision / Decision and Order text";

export const LISTING_URL = "https://www.nlrb.gov/cases-decisions/decisions/board-decisions";
export const PDF_HOST = "apps.nlrb.gov";
export const PDF_ORIGIN = "https://apps.nlrb.gov";
export const ABOUT_URL = "https://www.nlrb.gov/about-nlrb";
export const DOCUMENT_RE = /\/link\/document\.aspx\/([0-9a-f]{16})\b/i;
export const CASE_RE = /\b(\d{2})[–-]([A-Z]{2})[–-](\d{5,6})\b/i;
export const LICENSE = "17 U.S.C. § 105";
export const ATTRIBUTION =
  "National Labor Relations Board. Work of the United States Government; 17 U.S.C. § 105. Official .gov host. Face: “An Agency of the United States Government.”";

/** apps.nlrb.gov accepts wget + full browser UA; keep the live-door collector. */
export const WGET_SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export const CARD_FIELDS = ["id", "docket", "pdfId", "institution", "date", "title", "sourceUrl", "body"] as const;

export type NlrbBdListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
  id?: string;
};

export type NlrbBdListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type NlrbBdCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type NlrbBdSnapshot = {
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
  sources: { listing: string; pdfHost: string; about: string };
  cards: NlrbBdCard[];
};

const OFFICIAL_HOSTS = new Set(["apps.nlrb.gov"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|Group|Hospital|University|Pharmacy|Grocery|Stores?|Services|Holdings|Partners|LP|LLP)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const DOC_TITLE_RE =
  /Board Decision|Decision and Order|Supplemental Decision and Order|Decision on Review and Order/i;
const ALJ_ONLY_RE = /\bALJ(?:D)?\b|Administrative Law Judge(?:s)? Decision/i;
const CITENET_RE = /citenet|cases\/research|cite[\s_-]?net/i;
const CASE_CSV_RE = /case[\s_-]?search|\.csv\b|export.*cases/i;
const LISTING_PAGE_RE = /\/cases-decisions\/decisions\/board-decisions\b/i;
const CASE_PAGE_RE = /nlrb\.gov\/case\//i;
const SETTLED_KILL_RE =
  /federalregister\.gov|govinfo\.gov|catalog\.data\.gov|data\.gov|gov\.uk|corporate_report|service_standard_report|ico\.org\.uk|phmsa\.dot\.gov|fmc\.gov|fsis\.usda\.gov|ams\.usda\.gov|energy\.gov|atsdr\.cdc\.gov|waterboards\.ca\.gov|\/nop-ad\b|\/ico-mpn\b|\/phmsa-cop\b|\/fmc-orders\b|\/fsis-hmsa\b|\/doe-nov\b|\/atsdr-hc\b|\/waterboards-acl\b/i;
const KILL_TITLE_RE =
  /people|citenet|case-search csv|allegation code|docket teaser|answering brief|exceptions to aljd|post-hearing brief|corporate_report|service_standard_report/i;

export const SEED_LISTINGS: NlrbBdListing[] = [
  {
    id: "starbucks-19-ca-295850",
    docket: "19-CA-295850",
    institution: "Starbucks Corporation",
    date: "2026-08-05",
    title: "Decision and Order",
    sourceUrl: "https://apps.nlrb.gov/link/document.aspx/09031d45843171e1",
    pdfId: "09031d45843171e1",
  },
  {
    id: "cvs-01-ca-365034",
    docket: "01-CA-365034",
    institution: "Rhode Island CVS Pharmacy LLC",
    date: "2026-08-05",
    title: "Decision and Order",
    sourceUrl: "https://apps.nlrb.gov/link/document.aspx/09031d458431f711",
    pdfId: "09031d458431f711",
  },
  {
    id: "osg-12-ca-386056",
    docket: "12-CA-386056",
    institution: "Overseas Shipholding Group, Inc.",
    date: "2026-08-04",
    title: "Decision and Order",
    sourceUrl: "https://apps.nlrb.gov/link/document.aspx/09031d45843204c3",
    pdfId: "09031d45843204c3",
  },
  {
    id: "ralphs-21-ca-073942",
    docket: "21-CA-073942",
    institution: "Ralphs Grocery Company",
    date: "2026-08-10",
    title: "Supplemental Decision and Order",
    sourceUrl: "https://apps.nlrb.gov/link/document.aspx/09031d45843209af",
    pdfId: "09031d45843209af",
  },
  {
    id: "x-factor-31-ca-323348",
    docket: "31-CA-323348",
    institution: "X Factor S2 LLC",
    date: "2026-08-05",
    title: "Decision and Order",
    sourceUrl: "https://apps.nlrb.gov/link/document.aspx/09031d45843209db",
    pdfId: "09031d45843209db",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function nlrbBdDir(): string {
  if (env("NLRB_BD_DIR")) return resolve(env("NLRB_BD_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/nlrb-bd"));
}

export function snapshotPath(): string {
  return join(nlrbBdDir(), "snapshot.json");
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
  const mdy = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  const named = raw.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (named) {
    const mm = MONTHS[named[1].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
  }
  const short = raw.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i);
  if (short) {
    const map: Record<string, string> = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const mm = map[short[1].slice(0, 3).toLowerCase()];
    return mm ? `${short[3]}-${mm}-${short[2].padStart(2, "0")}` : null;
  }
  return null;
}

function blockedHost(host: string): boolean {
  return (
    host === "www.federalregister.gov" ||
    host === "federalregister.gov" ||
    host === "www.govinfo.gov" ||
    host === "govinfo.gov" ||
    host === "catalog.data.gov" ||
    host === "data.gov" ||
    host === "www.gov.uk" ||
    host === "gov.uk" ||
    host === "www.ico.org.uk" ||
    host === "ico.org.uk" ||
    host === "www.phmsa.dot.gov" ||
    host === "phmsa.dot.gov" ||
    host === "www.fmc.gov" ||
    host === "fmc.gov" ||
    host === "www.fsis.usda.gov" ||
    host === "fsis.usda.gov" ||
    host === "www.ams.usda.gov" ||
    host === "ams.usda.gov" ||
    host === "www.energy.gov" ||
    host === "energy.gov" ||
    host === "www.atsdr.cdc.gov" ||
    host === "atsdr.cdc.gov" ||
    host === "www.waterboards.ca.gov" ||
    host === "waterboards.ca.gov" ||
    host === "web.archive.org"
  );
}

export function officialNlrbBdPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (CITENET_RE.test(`${host}${path}`) || CASE_CSV_RE.test(path) || LISTING_PAGE_RE.test(path) || CASE_PAGE_RE.test(`${host}${path}`)) {
      return null;
    }
    const doc = path.match(DOCUMENT_RE);
    if (!doc) return null;
    return `${PDF_ORIGIN}/link/document.aspx/${doc[1].toLowerCase()}`;
  } catch {
    return null;
  }
}

export function parseOfficialFilename(url: string | null | undefined): { pdfId: string } | null {
  const official = officialNlrbBdPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const path = decodeURIComponent(parsed.pathname);
    const doc = path.match(DOCUMENT_RE);
    if (!doc) return null;
    return { pdfId: doc[1].toLowerCase() };
  } catch {
    const doc = official.match(DOCUMENT_RE);
    if (!doc) return null;
    return { pdfId: doc[1].toLowerCase() };
  }
}

export function docketFrom(urlOrId: string, fallback?: string): string {
  const fromFallback = (fallback ?? "").match(CASE_RE);
  if (fromFallback) return `${fromFallback[1]}-${fromFallback[2].toUpperCase()}-${fromFallback[3]}`;
  const named = urlOrId.match(CASE_RE);
  if (named) return `${named[1]}-${named[2].toUpperCase()}-${named[3]}`;
  return (fallback ?? urlOrId).toUpperCase();
}

export function slugFromDocket(docket: string, fallbackId?: string): string {
  if (fallbackId && fallbackId.trim()) return fallbackId.trim();
  return docket.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function isPeopleRow(row: NlrbBdListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isListingTeaserRow(row: NlrbBdListingRow): boolean {
  return LISTING_PAGE_RE.test(`${row.sourceUrl ?? ""} ${row.type ?? ""} ${row.title ?? ""}`);
}

export function isCasePageRow(row: NlrbBdListingRow): boolean {
  return CASE_PAGE_RE.test(`${row.sourceUrl ?? ""} ${row.type ?? ""}`);
}

export function isCitenetRow(row: NlrbBdListingRow): boolean {
  return CITENET_RE.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isCaseCsvRow(row: NlrbBdListingRow): boolean {
  return CASE_CSV_RE.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`);
}

export function isAljOnlyRow(row: NlrbBdListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.pdfId ?? ""}`;
  if (DOC_TITLE_RE.test(kind) && !ALJ_ONLY_RE.test(kind)) return false;
  return ALJ_ONLY_RE.test(kind);
}

export function isKilledClassRow(row: NlrbBdListingRow): boolean {
  return SETTLED_KILL_RE.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isInstitutionDecisionRow(row: NlrbBdListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (
    isListingTeaserRow(row) ||
    isCasePageRow(row) ||
    isCitenetRow(row) ||
    isCaseCsvRow(row) ||
    isAljOnlyRow(row) ||
    isKilledClassRow(row)
  ) {
    return false;
  }
  if (!officialNlrbBdPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""} ${row.docket ?? ""}`;
  if (KILL_TITLE_RE.test(kind)) return false;
  if (!DOC_TITLE_RE.test(kind) && !CASE_RE.test(kind)) return false;
  return true;
}

export function parseListingRows(rows: NlrbBdListingRow[]): NlrbBdListing[] {
  const found: NlrbBdListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionDecisionRow(row)) continue;
    const sourceUrl = officialNlrbBdPdfUrl(row.sourceUrl ?? "");
    const parsed = parseOfficialFilename(sourceUrl ?? "");
    if (!sourceUrl || !parsed) continue;
    const docket = docketFrom(`${row.docket ?? ""} ${row.id ?? ""}`, row.docket);
    const id = (row.id ?? "").trim() || slugFromDocket(docket);
    if (seen.has(id)) continue;
    seen.add(id);
    found.push({
      id,
      docket,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: (row.title ?? "").trim() || "Decision and Order",
      sourceUrl,
      pdfId: (row.pdfId ?? "").trim() || parsed.pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return found;
}

export function parseListingHtml(html: string): NlrbBdListing[] {
  const rows: NlrbBdListingRow[] = [];
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of links) {
    const href = m[1].startsWith("http") ? m[1] : `${PDF_ORIGIN}${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (!officialNlrbBdPdfUrl(href)) continue;
    const parsed = parseOfficialFilename(href);
    if (!parsed) continue;
    const idx = m.index ?? 0;
    const nearby = stripTags(html.slice(Math.max(0, idx - 280), idx + m[0].length + 180));
    const seed = SEED_LISTINGS.find((s) => officialNlrbBdPdfUrl(s.sourceUrl) === officialNlrbBdPdfUrl(href));
    const label = stripTags(m[2]).replace(/\s*\(pdf\)\s*$/i, "").trim();
    const docket = seed?.docket || docketFrom(`${nearby} ${parsed.pdfId}`);
    rows.push({
      institution: seed?.institution || label || nearby.replace(/^\d{1,2}\/\d{1,2}\/\d{4}:\s*/, "").trim(),
      docket,
      date: isoDate(nearby) || seed?.date || undefined,
      title: seed?.title || (DOC_TITLE_RE.test(nearby) ? nearby.match(DOC_TITLE_RE)?.[0] : "Decision and Order"),
      type: "board-decision",
      sourceUrl: href,
      pdfId: parsed.pdfId,
      id: seed?.id || slugFromDocket(docket),
    });
  }
  return parseListingRows(rows);
}

export function isListingTeaserDump(text: string): boolean {
  if (/Index only — employer \/ case \/ date \/ official URL/i.test(text)) return true;
  if (/that is the index, not the sold body/i.test(text) && !DOC_TITLE_RE.test(text)) return true;
  if (/Board Decisions listing \+ case-page docket\/allegation teasers are NOT the sold body/i.test(text)) return true;
  return false;
}

export function isCasePageDump(text: string): boolean {
  if (/case-page docket\/allegation-code teaser/i.test(text)) return true;
  if (/8\(a\)\(\d\)/.test(text) && !DOC_TITLE_RE.test(text) && compactForMatch(text).length < 800) return true;
  return false;
}

export function isPeopleDump(text: string): boolean {
  if (/people-only NLRB|named-individual SKU/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isCitenetDump(text: string): boolean {
  return /CiteNet|cases\/research/i.test(text) && !DOC_TITLE_RE.test(text);
}

export function isCaseCsvDump(text: string): boolean {
  return /case-search CSV|Case Search export/i.test(text);
}

export function isAljOnlyDump(text: string): boolean {
  if (/ALJ-only/i.test(text)) return true;
  if (DOC_TITLE_RE.test(text) && /BY CHAIRMAN|NATIONAL LABOR RELATIONS BOARD/i.test(text)) return false;
  return /Administrative Law Judge(?:s)? Decision/i.test(text) && !DOC_TITLE_RE.test(text);
}

export function isKilledClassDump(text: string): boolean {
  return SETTLED_KILL_RE.test(text);
}

export function isRealNlrbBdBody(text: string): boolean {
  if (
    isListingTeaserDump(text) ||
    isCasePageDump(text) ||
    isPeopleDump(text) ||
    isCitenetDump(text) ||
    isCaseCsvDump(text) ||
    isAljOnlyDump(text) ||
    isKilledClassDump(text)
  ) {
    return false;
  }
  const compact = compactForMatch(text);
  if (compact.length < 800) return false;
  const nlrb = /National Labor Relations Board|\bNLRB\b/i.test(compact);
  const doc = DOC_TITLE_RE.test(compact);
  const face =
    /An Agency of the United States Government/i.test(compact) ||
    /bound volumes of NLRB decisions/i.test(compact) ||
    /\d{3}\s+NLRB No\.\s+\d+/i.test(compact);
  const company = ENTITY_RE.test(compact);
  return nlrb && doc && face && company;
}

export function parseNlrbBdText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
    docket?: string;
  },
): NlrbBdCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialNlrbBdPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const parsed = parseOfficialFilename(sourceUrl);
  const docket = docketFrom(`${meta.docket ?? ""} ${body.slice(0, 1600)} ${meta.id ?? ""}`, meta.docket);
  const id = meta.id && meta.id.trim() ? meta.id.trim() : slugFromDocket(docket);
  const title = (meta.title && meta.title.trim()) || "Decision and Order";
  return {
    id,
    docket,
    pdfId: meta.pdfId || parsed?.pdfId || id,
    institution: (meta.institution && meta.institution.trim()) || id,
    date: meta.date ?? isoDate(body.slice(0, 1600)),
    title,
    sourceUrl,
    body,
  };
}

export function emptyNlrbBdSnapshot(reason: string): NlrbBdSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/link/document.aspx/`, about: ABOUT_URL },
    cards: [],
  };
}

export function assembleNlrbBdSnapshot(cards: NlrbBdCard[], fetchedAt = new Date().toISOString()): NlrbBdSnapshot {
  const withBody = cards
    .filter((c) => isRealNlrbBdBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason:
      withBody.length > 0
        ? null
        : "Official NLRB Board Decision PDFs had no extractable Decision and Order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/link/document.aspx/`, about: ABOUT_URL },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): NlrbBdSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as NlrbBdSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readNlrbBdSnapshot(): NlrbBdSnapshot | null {
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

export function writeNlrbBdSnapshot(snap: NlrbBdSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function wgetOfficialPdf(url: string, dest: string): void {
  const official = officialNlrbBdPdfUrl(url);
  if (!official) throw new Error(`${url} is not an official NLRB Board Decision PDF`);
  const ua = env("NLRB_BD_WGET_UA") || WGET_SAFARI_UA;
  const helper = env("NLRB_BD_WGET") || "wget";
  const result = spawnSync(helper, ["--user-agent=" + ua, "-O", dest, "--timeout=90", official], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw new Error(`wget failed: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(
      `wget ${official} failed: ${String(result.stderr || result.stdout || result.status || "unknown").slice(0, 400)}`,
    );
  }
}

export async function fetchNlrbBdBytes(url: string): Promise<Uint8Array> {
  const dest = join(tmpdir(), `nlrb-bd-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
  try {
    wgetOfficialPdf(url, dest);
    const bytes = new Uint8Array(readFileSync(dest));
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${url} is not an official PDF`);
    return bytes;
  } finally {
    try {
      if (existsSync(dest)) unlinkSync(dest);
    } catch {
      /* ignore */
    }
  }
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("NLRB_BD_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("NLRB_BD_JSON_DIR") || env("NLRB_BD_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("NLRB_BD_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("NLRB_BD_MAX_FETCH", "8"));
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

function safePdfName(pdfId: string, id: string): string {
  const name = pdfId.endsWith(".pdf") ? pdfId : `${id}.pdf`;
  return `${id}__${name.replace(/[^\w.\-]+/g, "_")}`;
}

async function loadOfficialListings(dir: string): Promise<{ listed: NlrbBdListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as NlrbBdListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialText(row: NlrbBdListing, cacheDir: string, fetched: { n: number }): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.id));
  if (!existsSync(pdfFile)) {
    writeFileSync(pdfFile, await fetchNlrbBdBytes(row.sourceUrl));
    fetched.n += 1;
  }
  return pdfToText(pdfFile);
}

export async function collectNlrbBd(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<NlrbBdSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = nlrbBdDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, NlrbBdCard>();
  for (const card of readNlrbBdSnapshot()?.cards ?? []) {
    if (isRealNlrbBdBody(card.body)) prior.set(card.id, card);
  }
  const cards: NlrbBdCard[] = [];
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
      const parsed = parseNlrbBdText(text, row);
      if (!isRealNlrbBdBody(parsed.body)) {
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
  const snap = { ...assembleNlrbBdSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeNlrbBdSnapshot(snap);
  return snap;
}

export async function loadNlrbBd(): Promise<NlrbBdSnapshot> {
  const cached = readNlrbBdSnapshot();
  if (cached && cached.cards.some((c) => isRealNlrbBdBody(c.body))) return cached;
  try {
    return await collectNlrbBd();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live NLRB Board Decision fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyNlrbBdSnapshot(
      `NLRB Board Decision PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildNlrbBdManifest(snap: NlrbBdSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealNlrbBdBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + employer + case number + date + official PDF URL only. Board Decision / Decision and Order body is the paid GET /nlrb-bd payload. Not people. Not the listing. Not case-page 8(a) teasers. Not CiteNet. Not case-search CSV. Not ALJ-only. Prep only — do not list.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: NLRB_BD_AMOUNT_ATOMIC,
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
    sources: snap?.sources ?? {
      listing: LISTING_URL,
      pdfHost: `${PDF_ORIGIN}/link/document.aspx/`,
      about: ABOUT_URL,
    },
  };
}

export async function loadNlrbBdManifest(): Promise<Record<string, unknown>> {
  return buildNlrbBdManifest(readNlrbBdSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectNlrbBd()
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
              institution: c.institution,
              docket: c.docket,
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
