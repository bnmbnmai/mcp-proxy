/**
 * ATSDR PHA / Health Consultation TEXT door.
 * Official PDFs from atsdr.cdc.gov/HAC/pha/{site}/{file}-508.pdf only.
 * Harvest with wget (Safari / full browser UA). Bare curl 403s.
 * Does not invent consultation text. Company/institution sites only. Not people.
 * Not the state listing HTML. Not the 2-page factsheet teaser.
 * Not /superfund-rods. Not /fsis-hmsa. Not Charity Commission. Not a stub.
 * License: 17 U.S.C. § 105 (ATSDR / CDC / HHS federal).
 * Prep only — do not list on well-known / OpenAPI / llms.txt / shop catalog.
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const ATSDR_HC_PATH = "/atsdr-hc";
export const ATSDR_HC_MANIFEST_PATH = "/atsdr-hc/manifest.json";
export const ATSDR_HC_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "atsdr-hc-consultation-bodies";
export const PRODUCT_NAME = "ATSDR PHA / Health Consultation text";

export const LISTING_URL = "https://wwwn.cdc.gov/TSP/PHA/PHAListing.aspx";
export const PDF_HOST = "www.atsdr.cdc.gov";
export const PDF_ORIGIN = "https://www.atsdr.cdc.gov";
export const MEDIA_RE = /\/HAC\/pha\/([^/?#]+)\/([^/?#]+-508\.pdf)/i;
export const LICENSE = "17 U.S.C. § 105";
export const ATTRIBUTION =
  "Agency for Toxic Substances and Disease Registry (ATSDR), Centers for Disease Control and Prevention, U.S. Department of Health and Human Services. Work of the United States Government; 17 U.S.C. § 105.";

/** atsdr.cdc.gov 403s bare curl. wget + full browser UA returns 200. */
export const WGET_SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export const CARD_FIELDS = ["id", "pdfId", "institution", "date", "title", "sourceUrl", "body"] as const;

export type AtsdrHcListingRow = {
  institution?: string;
  individual?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
  id?: string;
};

export type AtsdrHcListing = {
  id: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type AtsdrHcCard = {
  id: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type AtsdrHcSnapshot = {
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
  cards: AtsdrHcCard[];
};

const OFFICIAL_HOSTS = new Set(["www.atsdr.cdc.gov", "atsdr.cdc.gov"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|NASA|Army|Base|Facility|Landfill|City of|University|Works|Plant|Sterigenics|Institution)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const DOC_TITLE_RE = /Health Consultation|Public Health Assessment|\bPHA\b|\bHC\b/i;
const FACTSHEET_RE = /factsheet|fact[\s-]?sheet|-fs-508|-fs_508/i;
const KILL_TITLE_RE =
  /factsheet|fact sheet|state listing|people|superfund-rods|record of decision|\brod\b|fsis-hmsa|charity commission|ico-mpn|listing only/i;

export const SEED_LISTINGS: AtsdrHcListing[] = [
  {
    id: "sterigenics-smyrna-eto",
    institution: "Sterigenics LLC",
    date: "2026-08-18",
    title: "Health Consultation",
    sourceUrl: "https://www.atsdr.cdc.gov/HAC/pha/Sterigenics/SmyrnaEtO-508.pdf",
    pdfId: "SmyrnaEtO-508.pdf",
  },
  {
    id: "nasa-wallops-pfas",
    institution: "NASA Wallops Flight Facility",
    date: "2026-04-29",
    title: "Health Consultation",
    sourceUrl: "https://www.atsdr.cdc.gov/HAC/pha/Wallops/NASA-WFF-PC-508.pdf",
    pdfId: "NASA-WFF-PC-508.pdf",
  },
  {
    id: "former-fort-ord",
    institution: "Former Fort Ord Army Base",
    date: "2026-07-09",
    title: "Health Consultation",
    sourceUrl: "https://www.atsdr.cdc.gov/HAC/pha/FormerFordOrd/FortOrd-HC-508.pdf",
    pdfId: "FortOrd-HC-508.pdf",
  },
  {
    id: "jard-company",
    institution: "Jard Company, Inc.",
    date: "2026-05-21",
    title: "Public Health Assessment",
    sourceUrl: "https://www.atsdr.cdc.gov/HAC/pha/Jard/Jard-PHA-508.pdf",
    pdfId: "Jard-PHA-508.pdf",
  },
  {
    id: "bristol-quarry-landfill",
    institution: "City of Bristol, Virginia",
    date: "2025-12-22",
    title: "Health Consultation",
    sourceUrl: "https://www.atsdr.cdc.gov/HAC/pha/Bristol/Bristol-Quarry-Landfill-HC-508.pdf",
    pdfId: "Bristol-Quarry-Landfill-HC-508.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function atsdrHcDir(): string {
  if (env("ATSDR_HC_DIR")) return resolve(env("ATSDR_HC_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/atsdr-hc"));
}

export function snapshotPath(): string {
  return join(atsdrHcDir(), "snapshot.json");
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
    host === "semspub.epa.gov" ||
    host === "www.semspub.epa.gov" ||
    host === "cumulis.epa.gov" ||
    host === "www.fsis.usda.gov" ||
    host === "fsis.usda.gov" ||
    host === "ico.org.uk" ||
    host === "www.ico.org.uk" ||
    host === "www.gov.uk" ||
    host === "wwwn.cdc.gov" ||
    host === "web.archive.org"
  );
}

export function isFactsheetPdf(urlOrPath: string | null | undefined): boolean {
  return FACTSHEET_RE.test(urlOrPath ?? "");
}

export function officialAtsdrHcPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (/\/TSP\/PHA\//i.test(path) || /PHAListing/i.test(path)) return null;
    if (isFactsheetPdf(path)) return null;
    const media = path.match(MEDIA_RE);
    if (!media) return null;
    return `${PDF_ORIGIN}/HAC/pha/${media[1]}/${media[2]}`;
  } catch {
    return null;
  }
}

export function parseOfficialFilename(url: string | null | undefined): {
  siteDir: string;
  pdfId: string;
} | null {
  const official = officialAtsdrHcPdfUrl(url) || url || "";
  const media = official.match(MEDIA_RE);
  if (!media) return null;
  return { siteDir: media[1], pdfId: media[2] };
}

export function slugFromFilename(parsed: { siteDir: string; pdfId: string }, fallbackId?: string): string {
  if (fallbackId && fallbackId.trim()) return fallbackId.trim();
  return parsed.pdfId.replace(/-508\.pdf$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function isPeopleRow(row: AtsdrHcListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isFactsheetRow(row: AtsdrHcListingRow): boolean {
  return FACTSHEET_RE.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`);
}

export function isListingRow(row: AtsdrHcListingRow): boolean {
  return /PHAListing|state listing|listing only/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isSuperfundRodRow(row: AtsdrHcListingRow): boolean {
  return /semspub\.epa\.gov|superfund-rods|record of decision/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isFsisRow(row: AtsdrHcListingRow): boolean {
  return /fsis\.usda\.gov|fsis-hmsa|humane-handling/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isCharityRow(row: AtsdrHcListingRow): boolean {
  return /charity commission|charitycommission/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isIcoRow(row: AtsdrHcListingRow): boolean {
  return /ico\.org\.uk|ico-mpn|monetary penalty/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isInstitutionConsultationRow(row: AtsdrHcListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (
    isFactsheetRow(row) ||
    isListingRow(row) ||
    isSuperfundRodRow(row) ||
    isFsisRow(row) ||
    isCharityRow(row) ||
    isIcoRow(row)
  ) {
    return false;
  }
  if (!officialAtsdrHcPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`;
  if (KILL_TITLE_RE.test(kind)) return false;
  if (!DOC_TITLE_RE.test(kind)) return false;
  return true;
}

export function parseListingRows(rows: AtsdrHcListingRow[]): AtsdrHcListing[] {
  const found: AtsdrHcListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionConsultationRow(row)) continue;
    const sourceUrl = officialAtsdrHcPdfUrl(row.sourceUrl ?? "");
    const parsed = parseOfficialFilename(sourceUrl ?? "");
    if (!sourceUrl || !parsed) continue;
    const id = (row.id ?? "").trim() || slugFromFilename(parsed);
    if (seen.has(id)) continue;
    seen.add(id);
    found.push({
      id,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: (row.title ?? "").trim() || "Health Consultation",
      sourceUrl,
      pdfId: (row.pdfId ?? "").trim() || parsed.pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return found;
}

export function parseListingHtml(html: string): AtsdrHcListing[] {
  const rows: AtsdrHcListingRow[] = [];
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of links) {
    const href = m[1].startsWith("http") ? m[1] : `${PDF_ORIGIN}${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (!officialAtsdrHcPdfUrl(href)) continue;
    const parsed = parseOfficialFilename(href);
    if (!parsed) continue;
    const idx = m.index ?? 0;
    const trStart = html.lastIndexOf("<tr", idx);
    const trEnd = html.indexOf("</tr>", idx);
    const nearby = stripTags(
      trStart >= 0 && trEnd > trStart
        ? html.slice(trStart, trEnd + 5)
        : html.slice(Math.max(0, idx - 200), idx + m[0].length + 80),
    );
    const institution = nearby
      .replace(/\s+(Health Consultation|Public Health Assessment|PHA|HC).*$/i, "")
      .replace(/,?\s*$/, "")
      .trim();
    const seed = SEED_LISTINGS.find((s) => s.sourceUrl === officialAtsdrHcPdfUrl(href));
    rows.push({
      institution: institution || seed?.institution,
      date: isoDate(nearby) || seed?.date || undefined,
      title: /public health assessment/i.test(nearby) ? "Public Health Assessment" : "Health Consultation",
      type: "health-consultation",
      sourceUrl: href,
      pdfId: parsed.pdfId,
      id: seed?.id || slugFromFilename(parsed),
    });
  }
  return parseListingRows(rows);
}

export function isListingTeaserDump(text: string): boolean {
  if (/Index only — site \/ company \/ date \/ official PDF URL/i.test(text)) return true;
  if (/that is the index, not the sold body/i.test(text) && !DOC_TITLE_RE.test(text)) return true;
  if (/State listing HTML|PHA listing is NOT the sold body/i.test(text)) return true;
  return false;
}

export function isFactsheetDump(text: string): boolean {
  return /2-page factsheet|Factsheet teasers are NOT the sold body|ATSDR Factsheet/i.test(text);
}

export function isPeopleDump(text: string): boolean {
  if (/people-only ATSDR|named-individual SKU/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isSuperfundRodDump(text: string): boolean {
  return /RECORD OF DECISION|\/superfund-rods\b/i.test(text) && /Environmental Protection Agency|\bCERCLA\b/i.test(text);
}

export function isFsisHmsaDump(text: string): boolean {
  return /Food Safety and Inspection Service|\bFSIS\b/i.test(text) && /NOTICE OF INTENDED ENFORCEMENT|\/fsis-hmsa\b/i.test(text);
}

export function isCharityCommissionDump(text: string): boolean {
  return /Charity Commission/i.test(text);
}

export function isIcoMpnDump(text: string): boolean {
  return /Information Commissioner'?s Office/i.test(text) && /Monetary Penalty Notice|\/ico-mpn\b/i.test(text);
}

export function isStatePartnerDump(text: string): boolean {
  const coop =
    /Prepared by the Texas Department of State Health Services|Illinois Department of Public Health[\s\S]{0,120}prepared the following/i.test(
      text,
    );
  if (!coop) return false;
  return !/This Public Health Assessment was prepared by ATSDR|Prepared [Bb]y:\s*U\.S\. Department of Health and Human Services[\s\S]{0,80}Agency for Toxic Substances/i.test(
    text,
  );
}

export function isRealAtsdrHcBody(text: string): boolean {
  if (
    isListingTeaserDump(text) ||
    isFactsheetDump(text) ||
    isPeopleDump(text) ||
    isSuperfundRodDump(text) ||
    isFsisHmsaDump(text) ||
    isCharityCommissionDump(text) ||
    isIcoMpnDump(text) ||
    isStatePartnerDump(text)
  ) {
    return false;
  }
  const compact = compactForMatch(text);
  if (compact.length < 800) return false;
  const atsdr = /Agency for Toxic Substances and Disease Registry|\bATSDR\b/i.test(compact);
  const doc = /Health Consultation|Public Health Assessment/i.test(compact);
  const company = ENTITY_RE.test(compact);
  return atsdr && doc && company;
}

export function parseAtsdrHcText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): AtsdrHcCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialAtsdrHcPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const parsed = parseOfficialFilename(sourceUrl);
  const id = meta.id && meta.id.trim() ? meta.id.trim() : parsed ? slugFromFilename(parsed) : "unknown";
  const title =
    (meta.title && meta.title.trim()) ||
    (/Public Health Assessment/i.test(body.slice(0, 800)) ? "Public Health Assessment" : "Health Consultation");
  return {
    id,
    pdfId: meta.pdfId || parsed?.pdfId || `${id}.pdf`,
    institution: (meta.institution && meta.institution.trim()) || id,
    date: meta.date ?? isoDate(body.slice(0, 1200)),
    title,
    sourceUrl,
    body,
  };
}

export function emptyAtsdrHcSnapshot(reason: string): AtsdrHcSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/HAC/pha/` },
    cards: [],
  };
}

export function assembleAtsdrHcSnapshot(cards: AtsdrHcCard[], fetchedAt = new Date().toISOString()): AtsdrHcSnapshot {
  const withBody = cards
    .filter((c) => isRealAtsdrHcBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official ATSDR PHA / Health Consultation PDFs had no extractable consultation text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/HAC/pha/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): AtsdrHcSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as AtsdrHcSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readAtsdrHcSnapshot(): AtsdrHcSnapshot | null {
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

export function writeAtsdrHcSnapshot(snap: AtsdrHcSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function wgetOfficialPdf(url: string, dest: string): void {
  const official = officialAtsdrHcPdfUrl(url);
  if (!official) throw new Error(`${url} is not an official ATSDR PHA / Health Consultation PDF`);
  const ua = env("ATSDR_HC_WGET_UA") || WGET_SAFARI_UA;
  const helper = env("ATSDR_HC_WGET") || "wget";
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

export async function fetchAtsdrHcBytes(url: string): Promise<Uint8Array> {
  const dest = join(tmpdir(), `atsdr-hc-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
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
  const helper = env("ATSDR_HC_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("ATSDR_HC_JSON_DIR") || env("ATSDR_HC_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("ATSDR_HC_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("ATSDR_HC_MAX_FETCH", "8"));
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
  return name.replace(/[^\w.\-]+/g, "_");
}

async function loadOfficialListings(dir: string): Promise<{ listed: AtsdrHcListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as AtsdrHcListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialText(row: AtsdrHcListing, cacheDir: string, fetched: { n: number }): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.id));
  if (!existsSync(pdfFile)) {
    writeFileSync(pdfFile, await fetchAtsdrHcBytes(row.sourceUrl));
    fetched.n += 1;
  }
  return pdfToText(pdfFile);
}

export async function collectAtsdrHc(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<AtsdrHcSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = atsdrHcDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, AtsdrHcCard>();
  for (const card of readAtsdrHcSnapshot()?.cards ?? []) {
    if (isRealAtsdrHcBody(card.body)) prior.set(card.id, card);
  }
  const cards: AtsdrHcCard[] = [];
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
      const parsed = parseAtsdrHcText(text, row);
      if (!isRealAtsdrHcBody(parsed.body)) {
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
  const snap = { ...assembleAtsdrHcSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeAtsdrHcSnapshot(snap);
  return snap;
}

export async function loadAtsdrHc(): Promise<AtsdrHcSnapshot> {
  const cached = readAtsdrHcSnapshot();
  if (cached && cached.cards.some((c) => isRealAtsdrHcBody(c.body))) return cached;
  try {
    return await collectAtsdrHc();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live ATSDR PHA / Health Consultation fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyAtsdrHcSnapshot(
      `ATSDR PHA / Health Consultation PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildAtsdrHcManifest(snap: AtsdrHcSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealAtsdrHcBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + site/company + date + official PDF URL only. Consultation body is the paid GET /atsdr-hc payload. Not people. Not the state listing HTML. Not the 2-page factsheet teaser. Not /superfund-rods. Not /fsis-hmsa. Prep only — do not list.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: ATSDR_HC_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/HAC/pha/` },
  };
}

export async function loadAtsdrHcManifest(): Promise<Record<string, unknown>> {
  return buildAtsdrHcManifest(readAtsdrHcSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectAtsdrHc()
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
