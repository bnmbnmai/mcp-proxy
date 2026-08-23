/**
 * USDA AMS NOP Administrator Decision / Final Notice of Suspension or Revocation TEXT door.
 * Official PDFs from ams.usda.gov/sites/default/files/media/ only.
 * Harvest with wget (Safari / full browser UA) + pdftotext.
 * Company/institution only. Not people. Not settlements HTML. Not OID status directory.
 * Not /awa. Not FSIS HMSA. Not DOE. Not GOV.UK service_standard_report. Not a stub.
 * License: 17 U.S.C. § 105 + AMS “public information… may be distributed or copied.”
 * Prep only — do not list on well-known / OpenAPI / llms.txt / shop catalog.
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const NOP_AD_PATH = "/nop-ad";
export const NOP_AD_MANIFEST_PATH = "/nop-ad/manifest.json";
export const NOP_AD_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "nop-ad-decision-bodies";
export const PRODUCT_NAME = "USDA AMS NOP Administrator Decision / Final Notice text";

export const LISTING_URL = "https://www.ams.usda.gov/services/enforcement/organic/ams-decisions";
export const PDF_HOST = "www.ams.usda.gov";
export const PDF_ORIGIN = "https://www.ams.usda.gov";
export const PRIVACY_URL = "https://www.ams.usda.gov/about-ams/privacy";
export const MEDIA_RE = /\/sites\/default\/files\/media\/([^/?#]+\.pdf)$/i;
export const LICENSE = "17 U.S.C. § 105 + AMS public information notice";
export const ATTRIBUTION =
  "USDA Agricultural Marketing Service, National Organic Program. Work of the United States Government; 17 U.S.C. § 105. Information presented on the AMS web site is considered public information and may be distributed or copied; use of appropriate byline/photo/image credits is requested. No NC / no-sell restriction. https://www.ams.usda.gov/about-ams/privacy";

/** ams.usda.gov accepts wget + full browser UA; keep the live-door collector. */
export const WGET_SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export const CARD_FIELDS = ["id", "docket", "pdfId", "institution", "date", "title", "sourceUrl", "body"] as const;

export type NopAdListingRow = {
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

export type NopAdListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type NopAdCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type NopAdSnapshot = {
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
  sources: { listing: string; pdfHost: string; privacy: string };
  cards: NopAdCard[];
};

const OFFICIAL_HOSTS = new Set(["www.ams.usda.gov", "ams.usda.gov"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|E\.I\.R\.L\.?|EIRL|SAPI|S\.A\.P\.I\.|S\.A\.|SPR|S\.P\.R\.|de C\.?V\.?|S\.\s*de R\.L\.|Farm|Farms|Organics|Dairy|Manufacturing|Group|Private Limited)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const DOC_TITLE_RE =
  /Administrator['’]?s Decision|Administrator Decision|Final Notice of Suspension|Final Notice of Revocation|Notice of Proposed Suspension|Notice of Proposed Revocation/i;
const DOCKET_RE = /\b(APL-\d{3}-\d{2})\b/i;
const SETTLEMENT_HTML_RE = /settlement(?:s)?(?:\s+agreement)?\s+html|\/settlements?\//i;
const OID_RE = /organic\.ams\.usda\.gov|organic integrity database|\boid\b|\/integrity\//i;
const PRESS_FILE_RE = /press[\s_-]?release|news[\s_-]?release/i;
const KILL_TITLE_RE =
  /people|settlement html|oid status|organic integrity database|\/awa\b|awa inspection|fsis-hmsa|humane.handling|doe-nov|office of enforcement|service_standard_report|service standard report|gov\.uk/i;

export const SEED_LISTINGS: NopAdListing[] = [
  {
    id: "mapeks-apl-014-25",
    docket: "APL-014-25",
    institution: "Mapeks USA, LLC dba Mac Global",
    date: "2026-07-30",
    title: "Administrator's Decision",
    sourceUrl:
      "https://www.ams.usda.gov/sites/default/files/media/Decision_APL-014-25%20and%20049-25%20Mapeks%20USA_Redacted.pdf",
    pdfId: "Decision_APL-014-25 and 049-25 Mapeks USA_Redacted.pdf",
  },
  {
    id: "fruticola-olmos-apl-040-24",
    docket: "APL-040-24",
    institution: "Fruticola Olmos E.I.R.L.",
    date: "2026-01-15",
    title: "Administrator's Decision",
    sourceUrl: "https://www.ams.usda.gov/sites/default/files/media/DecisionAPL-040-24_FruticolaOlmos_508.pdf",
    pdfId: "DecisionAPL-040-24_FruticolaOlmos_508.pdf",
  },
  {
    id: "la-bonita-apl-047-24",
    docket: "APL-047-24",
    institution: "Invernaderos Hidroponicos La Bonita SAPI de CV",
    date: "2025-05-02",
    title: "Administrator's Decision",
    sourceUrl:
      "https://www.ams.usda.gov/sites/default/files/media/DecisionLaBonitaAPL-047-245-2-25_Redacted_508.pdf",
    pdfId: "DecisionLaBonitaAPL-047-245-2-25_Redacted_508.pdf",
  },
  {
    id: "buck-n-bird-apl-066-24",
    docket: "APL-066-24",
    institution: "Buck N Bird Farm",
    date: "2026-03-05",
    title: "Administrator's Decision",
    sourceUrl: "https://www.ams.usda.gov/sites/default/files/media/DecisionAPL-066-24_BuckNBird_508.pdf",
    pdfId: "DecisionAPL-066-24_BuckNBird_508.pdf",
  },
  {
    id: "sunshine-farms-apl-090-24",
    docket: "APL-090-24",
    institution: "Sunshine Farms of Martin County LLC",
    date: "2025-03-20",
    title: "Administrator's Decision",
    sourceUrl: "https://www.ams.usda.gov/sites/default/files/media/NOPADSunshine32025_Redacted_508.pdf",
    pdfId: "NOPADSunshine32025_Redacted_508.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function nopAdDir(): string {
  if (env("NOP_AD_DIR")) return resolve(env("NOP_AD_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/nop-ad"));
}

export function snapshotPath(): string {
  return join(nopAdDir(), "snapshot.json");
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
    host === "organic.ams.usda.gov" ||
    host === "www.fsis.usda.gov" ||
    host === "fsis.usda.gov" ||
    host === "www.aphis.usda.gov" ||
    host === "aphis.usda.gov" ||
    host === "www.energy.gov" ||
    host === "energy.gov" ||
    host === "www.gov.uk" ||
    host === "gov.uk" ||
    host === "www.nrc.gov" ||
    host === "nrc.gov" ||
    host === "www.waterboards.ca.gov" ||
    host === "waterboards.ca.gov" ||
    host === "www.atsdr.cdc.gov" ||
    host === "atsdr.cdc.gov" ||
    host === "web.archive.org"
  );
}

export function officialNopAdPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (SETTLEMENT_HTML_RE.test(path) || OID_RE.test(`${host}${path}`)) return null;
    if (/\/integrity\//i.test(path) || /\/settlements?\//i.test(path)) return null;
    const media = path.match(MEDIA_RE);
    if (!media) return null;
    return `${PDF_ORIGIN}/sites/default/files/media/${encodeURIComponent(media[1])}`;
  } catch {
    return null;
  }
}

export function parseOfficialFilename(url: string | null | undefined): { pdfId: string } | null {
  const official = officialNopAdPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const path = decodeURIComponent(parsed.pathname);
    const media = path.match(MEDIA_RE);
    if (!media) return null;
    return { pdfId: media[1] };
  } catch {
    const media = official.match(MEDIA_RE);
    if (!media) return null;
    return { pdfId: decodeURIComponent(media[1]) };
  }
}

export function docketFrom(urlOrId: string, fallback?: string): string {
  if (fallback && DOCKET_RE.test(fallback)) {
    const m = fallback.match(DOCKET_RE);
    if (m) return m[1].toUpperCase();
  }
  const named = urlOrId.match(DOCKET_RE);
  if (named) return named[1].toUpperCase();
  return (fallback ?? urlOrId.replace(/\.pdf$/i, "")).toUpperCase();
}

export function slugFromDocket(docket: string, fallbackId?: string): string {
  if (fallbackId && fallbackId.trim()) return fallbackId.trim();
  return docket.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function isPeopleRow(row: NopAdListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isSettlementHtmlRow(row: NopAdListingRow): boolean {
  return SETTLEMENT_HTML_RE.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`);
}

export function isOidRow(row: NopAdListingRow): boolean {
  return OID_RE.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isAwaRow(row: NopAdListingRow): boolean {
  return /\/awa\b|aphis\.usda\.gov|animal welfare act/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isFsisRow(row: NopAdListingRow): boolean {
  return /fsis\.usda\.gov|fsis-hmsa|humane.handling|notice of intended enforcement/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isDoeRow(row: NopAdListingRow): boolean {
  return /energy\.gov|doe-nov|office of enforcement|final notice of violation/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isGovukSsrRow(row: NopAdListingRow): boolean {
  return /gov\.uk|service_standard_report|service standard report/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isInstitutionDecisionRow(row: NopAdListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (
    isSettlementHtmlRow(row) ||
    isOidRow(row) ||
    isAwaRow(row) ||
    isFsisRow(row) ||
    isDoeRow(row) ||
    isGovukSsrRow(row)
  ) {
    return false;
  }
  if (!officialNopAdPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""} ${row.docket ?? ""}`;
  if (KILL_TITLE_RE.test(kind)) return false;
  if (!DOC_TITLE_RE.test(kind) && !DOCKET_RE.test(kind)) return false;
  return true;
}

export function parseListingRows(rows: NopAdListingRow[]): NopAdListing[] {
  const found: NopAdListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionDecisionRow(row)) continue;
    const sourceUrl = officialNopAdPdfUrl(row.sourceUrl ?? "");
    const parsed = parseOfficialFilename(sourceUrl ?? "");
    if (!sourceUrl || !parsed) continue;
    const docket = docketFrom(`${row.docket ?? ""} ${parsed.pdfId} ${row.id ?? ""}`, row.docket);
    const id = (row.id ?? "").trim() || slugFromDocket(docket);
    if (seen.has(id)) continue;
    seen.add(id);
    found.push({
      id,
      docket,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: (row.title ?? "").trim() || "Administrator's Decision",
      sourceUrl,
      pdfId: (row.pdfId ?? "").trim() || parsed.pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return found;
}

export function parseListingHtml(html: string): NopAdListing[] {
  const rows: NopAdListingRow[] = [];
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of links) {
    const href = m[1].startsWith("http") ? m[1] : `${PDF_ORIGIN}${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (!officialNopAdPdfUrl(href)) continue;
    const parsed = parseOfficialFilename(href);
    if (!parsed) continue;
    const idx = m.index ?? 0;
    const nearby = stripTags(html.slice(Math.max(0, idx - 240), idx + m[0].length + 160));
    const seed = SEED_LISTINGS.find((s) => officialNopAdPdfUrl(s.sourceUrl) === officialNopAdPdfUrl(href));
    const label = stripTags(m[2]).replace(/\s*\(pdf\)\s*$/i, "").trim();
    const docket = seed?.docket || docketFrom(`${nearby} ${parsed.pdfId}`);
    rows.push({
      institution: seed?.institution || label || nearby.replace(/^\d{1,2}\/\d{1,2}\/\d{4}:\s*/, "").trim(),
      docket,
      date: isoDate(nearby) || seed?.date || undefined,
      title: seed?.title || "Administrator's Decision",
      type: "administrator-decision",
      sourceUrl: href,
      pdfId: parsed.pdfId,
      id: seed?.id || slugFromDocket(docket),
    });
  }
  return parseListingRows(rows);
}

export function isListingTeaserDump(text: string): boolean {
  if (/Index only — company \/ APL \/ date \/ official PDF URL/i.test(text)) return true;
  if (/that is the index, not the sold body/i.test(text) && !DOC_TITLE_RE.test(text)) return true;
  if (/Listing \+ OID status directory \+ settlements HTML are NOT the sold body/i.test(text)) return true;
  return false;
}

export function isSettlementHtmlDump(text: string): boolean {
  return /settlement HTML only|This page is HTML, not an official AMS media-host/i.test(text);
}

export function isPeopleDump(text: string): boolean {
  if (/people-only AMS NOP|named-individual SKU/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isOidDump(text: string): boolean {
  return /Organic Integrity Database|\borganic\.ams\.usda\.gov\b|\/integrity\/Home/i.test(text);
}

export function isAwaDump(text: string): boolean {
  return /Animal Welfare Act|\/awa\b/i.test(text);
}

export function isFsisDump(text: string): boolean {
  return /Food Safety and Inspection Service|\/fsis-hmsa\b|Humane Methods of Slaughter/i.test(text);
}

export function isDoeDump(text: string): boolean {
  return /Office of Enforcement|\/doe-nov\b|Final Notice of Violation/i.test(text) && /Department of Energy|energy\.gov/i.test(text);
}

export function isGovukSsrDump(text: string): boolean {
  return /GOV\.UK service_standard_report|service standard report/i.test(text);
}

export function isRealNopAdBody(text: string): boolean {
  if (
    isListingTeaserDump(text) ||
    isSettlementHtmlDump(text) ||
    isPeopleDump(text) ||
    isOidDump(text) ||
    isAwaDump(text) ||
    isFsisDump(text) ||
    isDoeDump(text) ||
    isGovukSsrDump(text)
  ) {
    return false;
  }
  const compact = compactForMatch(text);
  if (compact.length < 800) return false;
  const ams = /Agricultural Marketing Service|National Organic Program|BEFORE THE ADMINISTRATOR|USDA organic regulations/i.test(
    compact,
  );
  const doc = DOC_TITLE_RE.test(compact) || DOCKET_RE.test(compact);
  const company = ENTITY_RE.test(compact);
  return ams && doc && company;
}

export function parseNopAdText(
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
): NopAdCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialNopAdPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const parsed = parseOfficialFilename(sourceUrl);
  const docket = docketFrom(`${meta.docket ?? ""} ${body.slice(0, 1200)} ${parsed?.pdfId ?? ""} ${meta.id ?? ""}`, meta.docket);
  const id = meta.id && meta.id.trim() ? meta.id.trim() : slugFromDocket(docket);
  const title = (meta.title && meta.title.trim()) || "Administrator's Decision";
  return {
    id,
    docket,
    pdfId: meta.pdfId || parsed?.pdfId || `${id}.pdf`,
    institution: (meta.institution && meta.institution.trim()) || id,
    date: meta.date ?? isoDate(body.slice(0, 1200)),
    title,
    sourceUrl,
    body,
  };
}

export function emptyNopAdSnapshot(reason: string): NopAdSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/media/`, privacy: PRIVACY_URL },
    cards: [],
  };
}

export function assembleNopAdSnapshot(cards: NopAdCard[], fetchedAt = new Date().toISOString()): NopAdSnapshot {
  const withBody = cards
    .filter((c) => isRealNopAdBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason:
      withBody.length > 0
        ? null
        : "Official AMS NOP Administrator Decision PDFs had no extractable decision / final-notice text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/media/`, privacy: PRIVACY_URL },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): NopAdSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as NopAdSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readNopAdSnapshot(): NopAdSnapshot | null {
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

export function writeNopAdSnapshot(snap: NopAdSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function wgetOfficialPdf(url: string, dest: string): void {
  const official = officialNopAdPdfUrl(url);
  if (!official) throw new Error(`${url} is not an official AMS NOP Administrator Decision PDF`);
  const ua = env("NOP_AD_WGET_UA") || WGET_SAFARI_UA;
  const helper = env("NOP_AD_WGET") || "wget";
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

export async function fetchNopAdBytes(url: string): Promise<Uint8Array> {
  const dest = join(tmpdir(), `nop-ad-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
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
  const helper = env("NOP_AD_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("NOP_AD_JSON_DIR") || env("NOP_AD_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("NOP_AD_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("NOP_AD_MAX_FETCH", "8"));
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

async function loadOfficialListings(dir: string): Promise<{ listed: NopAdListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as NopAdListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialText(row: NopAdListing, cacheDir: string, fetched: { n: number }): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.id));
  if (!existsSync(pdfFile)) {
    writeFileSync(pdfFile, await fetchNopAdBytes(row.sourceUrl));
    fetched.n += 1;
  }
  return pdfToText(pdfFile);
}

export async function collectNopAd(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<NopAdSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = nopAdDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, NopAdCard>();
  for (const card of readNopAdSnapshot()?.cards ?? []) {
    if (isRealNopAdBody(card.body)) prior.set(card.id, card);
  }
  const cards: NopAdCard[] = [];
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
      const parsed = parseNopAdText(text, row);
      if (!isRealNopAdBody(parsed.body)) {
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
  const snap = { ...assembleNopAdSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeNopAdSnapshot(snap);
  return snap;
}

export async function loadNopAd(): Promise<NopAdSnapshot> {
  const cached = readNopAdSnapshot();
  if (cached && cached.cards.some((c) => isRealNopAdBody(c.body))) return cached;
  try {
    return await collectNopAd();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live AMS NOP fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyNopAdSnapshot(
      `AMS NOP Administrator Decision PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildNopAdManifest(snap: NopAdSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealNopAdBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + company + APL + date + official PDF URL only. Administrator Decision / Final Notice body is the paid GET /nop-ad payload. Not people. Not settlements HTML. Not OID. Not /awa. Not /fsis-hmsa. Not /doe-nov. Prep only — do not list.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: NOP_AD_AMOUNT_ATOMIC,
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
      pdfHost: `${PDF_ORIGIN}/sites/default/files/media/`,
      privacy: PRIVACY_URL,
    },
  };
}

export async function loadNopAdManifest(): Promise<Record<string, unknown>> {
  return buildNopAdManifest(readNopAdSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectNopAd()
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
