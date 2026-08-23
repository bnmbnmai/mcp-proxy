/**
 * UK IPO trade-mark inter partes hearing TEXT door.
 * Official PDFs from ipo.gov.uk/t-challenge-decision-results/ only, via pdftotext.
 * Does not invent hearing text. Institution/company only. Not people-applicant SKUs.
 * Not the year-grid/card. Not TM Journal XML. Not design_decision. Not a stub.
 * Not GOV.UK trademark_decision. Not Find Case Law.
 * Not ICO /ico-mpn. Not PHMSA /phmsa-cop. Not ACM /acm-besluiten.
 * Not CCPC /ccpc-mergers. Not BKartA /bkarta-entscheidungen. Not CMA /cma-ca98.
 * License: Crown + OGL v3.0 commercial. Logo reserved — sell IPO-authored TEXT, not the mark.
 * Prep only — do not list on well-known / OpenAPI / llms.txt / shop catalog.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const IPO_TM_PATH = "/ipo-tm";
export const IPO_TM_MANIFEST_PATH = "/ipo-tm/manifest.json";
export const IPO_TM_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "ipo-institution-tm-hearing-bodies";
export const PRODUCT_NAME = "IPO trade-mark hearing text";

export const LISTING_URL = "https://www.ipo.gov.uk/t-challenge-decision-results.htm";
export const PDF_HOST = "www.ipo.gov.uk";
export const PDF_ORIGIN = "https://www.ipo.gov.uk";
export const MEDIA_RE = /\/t-challenge-decision-results\/(o\d{5,7}\.pdf)/i;
export const DOCKET_BARE_RE = /^([a-z0-9][a-z0-9._-]{2,80})$/;
export const LICENSE = "Crown + OGL v3.0";
export const ATTRIBUTION =
  "UK Intellectual Property Office (IPO). Crown copyright. Licensed under the Open Government Licence v3.0 for commercial reuse. IPO logo reserved — sold body is IPO-authored TEXT only, not the mark.";

export const CARD_FIELDS = [
  "id",
  "docket",
  "bl",
  "pdfId",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type IpoTmListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  bl?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type IpoTmListing = {
  id: string;
  docket: string;
  bl: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type IpoTmCard = {
  id: string;
  docket: string;
  bl: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type IpoTmSnapshot = {
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
  cards: IpoTmCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (IPO trade-mark hearing texts; +https://www.ipo.gov.uk/)";
const OFFICIAL_HOSTS = new Set(["ipo.gov.uk", "www.ipo.gov.uk"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.L\.P\.|LLP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|PLC|Plc|plc|Pte\.?|GmbH|S\.A\.|SA|Holdings)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const KILL_TITLE_RE =
  /year-grid|tm journal|trade marks journal|\.xml|design_decision|registered design|trademark_decision|find case law|ico-mpn|phmsa|acm-besluiten|ccpc-mergers|bkarta|cma-ca98/i;

const FILENAME_DOCKET: Record<string, string> = {
  "o071326.pdf": "o071326-roadget-dsquared",
  "o072126.pdf": "o072126-savant",
  "o068626.pdf": "o068626-supermac-mcdonalds",
  "o122125.pdf": "o122125-food-brut-jolene",
  "o012125.pdf": "o012125-ronix-delonghi",
};

const BL_DOCKET: Record<string, string> = {
  "O/0713/26": "o071326-roadget-dsquared",
  "O/0721/26": "o072126-savant",
  "O/0686/26": "o068626-supermac-mcdonalds",
  "O/1221/25": "o122125-food-brut-jolene",
  "O/0121/25": "o012125-ronix-delonghi",
};

const TITLE_BY_DOCKET: Record<string, string> = {
  "o071326-roadget-dsquared": "Opposition",
  "o072126-savant": "Invalidity",
  "o068626-supermac-mcdonalds": "Opposition",
  "o122125-food-brut-jolene": "Opposition",
  "o012125-ronix-delonghi": "Appeal",
};

export const SEED_LISTINGS: IpoTmListing[] = [
  {
    id: "o071326-roadget-dsquared",
    docket: "o071326-roadget-dsquared",
    bl: "O/0713/26",
    institution: "Roadget Business Pte. Ltd / Dsquared2 Trademarks Limited",
    date: "2026-08-10",
    title: "Opposition",
    sourceUrl: "https://www.ipo.gov.uk/t-challenge-decision-results/o071326.pdf",
    pdfId: "o071326.pdf",
  },
  {
    id: "o072126-savant",
    docket: "o072126-savant",
    bl: "O/0721/26",
    institution: "Savant Systems, Inc. / Savant Group Limited",
    date: "2026-08-11",
    title: "Invalidity",
    sourceUrl: "https://www.ipo.gov.uk/t-challenge-decision-results/o072126.pdf",
    pdfId: "o072126.pdf",
  },
  {
    id: "o068626-supermac-mcdonalds",
    docket: "o068626-supermac-mcdonalds",
    bl: "O/0686/26",
    institution: "Supermac’s (Holdings) Ltd / McDonald’s International Property Company, Ltd.",
    date: "2026-07-31",
    title: "Opposition",
    sourceUrl: "https://www.ipo.gov.uk/t-challenge-decision-results/o068626.pdf",
    pdfId: "o068626.pdf",
  },
  {
    id: "o122125-food-brut-jolene",
    docket: "o122125-food-brut-jolene",
    bl: "O/1221/25",
    institution: "Food Brut Limited / Jolene, LLC",
    date: "2025-12-30",
    title: "Opposition",
    sourceUrl: "https://www.ipo.gov.uk/t-challenge-decision-results/o122125.pdf",
    pdfId: "o122125.pdf",
  },
  {
    id: "o012125-ronix-delonghi",
    docket: "o012125-ronix-delonghi",
    bl: "O/0121/25",
    institution: "Ronix (UK) Limited / De Longhi Benelux S.A.",
    date: "2025-02-11",
    title: "Appeal",
    sourceUrl: "https://www.ipo.gov.uk/t-challenge-decision-results/o012125.pdf",
    pdfId: "o012125.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ipoTmDir(): string {
  if (env("IPO_TM_DIR")) return resolve(env("IPO_TM_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ipo-tm"));
}

export function snapshotPath(): string {
  return join(ipoTmDir(), "snapshot.json");
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
  const ordinal = raw.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+day of\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
  );
  if (ordinal) {
    const mm = MONTHS[ordinal[2].toLowerCase()];
    return mm ? `${ordinal[3]}-${mm}-${ordinal[1].padStart(2, "0")}` : null;
  }
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
    host === "gov.uk" ||
    host === "www.gov.uk" ||
    host === "assets.publishing.service.gov.uk" ||
    host === "caselaw.nationalarchives.gov.uk" ||
    host === "www.caselaw.nationalarchives.gov.uk" ||
    host === "ico.org.uk" ||
    host === "www.ico.org.uk" ||
    host === "acm.nl" ||
    host === "www.acm.nl" ||
    host === "assets.ccpc.ie" ||
    host === "www.ccpc.ie" ||
    host === "ccpc.ie" ||
    host === "www.bundeskartellamt.de" ||
    host === "bundeskartellamt.de" ||
    host === "primis.phmsa.dot.gov" ||
    host === "www.primis.phmsa.dot.gov" ||
    host === "web.archive.org"
  );
}

function filenameFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return decodeURIComponent(parts.at(-1) ?? "");
}

export function officialIpoTmPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (/design_decision|d-challenge-decision-results|\/t-tmj\/|\.xml$/i.test(path)) return null;
    if (/\.html?$/i.test(path)) return null;
    const media = path.match(MEDIA_RE);
    if (!media) return null;
    return `${PDF_ORIGIN}/t-challenge-decision-results/${media[1].toLowerCase()}`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialIpoTmPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = decodeURIComponent(parsed.pathname).match(MEDIA_RE);
    return media ? filenameFromPath(media[1]).toLowerCase() : null;
  } catch {
    return null;
  }
}

export function slugFromUrl(url: string): string {
  const pdfId = pdfIdFromUrl(url) || "";
  if (FILENAME_DOCKET[pdfId]) return FILENAME_DOCKET[pdfId];
  return pdfId.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "unknown";
}

export function normalizeBl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/\b(?:BL\s*)?O[/\-](\d{3,4})[/\-](\d{2})\b/i);
  if (m) return `O/${m[1].padStart(4, "0")}/${m[2]}`;
  const file = raw.trim().match(/\bo(\d{4})(\d{2})\.pdf\b/i);
  if (file) return `O/${file[1]}/${file[2]}`;
  return null;
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (FILENAME_DOCKET[trimmed.toLowerCase()]) return FILENAME_DOCKET[trimmed.toLowerCase()];
  const bl = normalizeBl(trimmed);
  if (bl && BL_DOCKET[bl]) return BL_DOCKET[bl];
  if (DOCKET_BARE_RE.test(trimmed) && !/\s/.test(trimmed)) return trimmed;
  return null;
}

export function isPeopleRow(row: IpoTmListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isYearGridRow(row: IpoTmListingRow): boolean {
  return /year-grid|listing card|t-challenge-decision-results-bl\d/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isTmJournalRow(row: IpoTmListingRow): boolean {
  return /tm journal|trade marks journal|\.xml/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isDesignRow(row: IpoTmListingRow): boolean {
  return /design_decision|registered design|d-challenge-decision/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isGovUkRow(row: IpoTmListingRow): boolean {
  return /gov\.uk\/search-trade-mark|trademark_decision/i.test(`${row.sourceUrl ?? ""} ${row.title ?? ""}`);
}

export function isFindCaseLawRow(row: IpoTmListingRow): boolean {
  return /caselaw\.nationalarchives|find case law/i.test(`${row.sourceUrl ?? ""} ${row.title ?? ""}`);
}

export function isInstitutionHearingRow(row: IpoTmListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (isYearGridRow(row)) return false;
  if (isTmJournalRow(row)) return false;
  if (isDesignRow(row)) return false;
  if (isGovUkRow(row)) return false;
  if (isFindCaseLawRow(row)) return false;
  if (!officialIpoTmPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`;
  if (KILL_TITLE_RE.test(kind)) return false;
  return true;
}

export function parseListingRows(rows: IpoTmListingRow[]): IpoTmListing[] {
  const found: IpoTmListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionHearingRow(row)) continue;
    const sourceUrl = officialIpoTmPdfUrl(row.sourceUrl ?? "");
    const pdfId = (row.pdfId ?? "").trim().toLowerCase() || pdfIdFromUrl(sourceUrl ?? "") || "";
    const docket = normalizeDocket(row.docket) || slugFromUrl(sourceUrl ?? "");
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: normalizeDocket(row.docket) || docket,
      docket,
      bl: normalizeBl(row.bl) || normalizeBl(row.docket) || normalizeBl(pdfId) || "",
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: TITLE_BY_DOCKET[docket] || (row.title ?? "").trim() || "Hearing",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): IpoTmListing[] {
  const rows: IpoTmListingRow[] = [];
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of links) {
    const href = m[1].startsWith("http") ? m[1] : `${PDF_ORIGIN}${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (!officialIpoTmPdfUrl(href)) continue;
    const title = stripTags(m[2]);
    const docket = slugFromUrl(href);
    rows.push({
      institution:
        title.replace(/\s+(Opposition|Invalidity|Appeal|Hearing|BL).*$/i, "").trim() || title,
      date: isoDate(title) || undefined,
      title: TITLE_BY_DOCKET[docket] || "Hearing",
      type: "hearing",
      sourceUrl: href,
      pdfId: pdfIdFromUrl(href) ?? "",
      docket,
      bl: normalizeBl(title) ?? undefined,
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ BL \/ date \/ official PDF URL/i.test(text)) return true;
  if (/Year-grid listing/i.test(text) && !/TRADE MARKS ACT 1994/i.test(text)) return true;
  return false;
}

export function isPeopleDump(text: string): boolean {
  if (/people-only IPO|named-applicant SKU/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isTmJournalDump(text: string): boolean {
  return /<tm-journal|Trade Marks Journal XML/i.test(text);
}

export function isDesignDump(text: string): boolean {
  return /REGISTERED DESIGNS ACT|design_decision finder/i.test(text);
}

export function isGovUkDump(text: string): boolean {
  return /gov\.uk\/search-trade-mark|trademark_decision/i.test(text);
}

export function isFindCaseLawDump(text: string): boolean {
  return /caselaw\.nationalarchives|Find Case Law/i.test(text);
}

export function isIcoMpnDump(text: string): boolean {
  if (/Information Commissioner'?s Office/i.test(text) && /Monetary Penalty Notice|PENALTY NOTICE/i.test(text)) {
    return true;
  }
  if (/\bICO MPN\b/i.test(text) || /\/ico-mpn\b/i.test(text)) return true;
  return false;
}

export function isPhmsaCopDump(text: string): boolean {
  return /Pipeline and Hazardous Materials Safety Administration|\bPHMSA\b/i.test(text) && /CONSENT ORDER|\/phmsa-cop\b/i.test(text);
}

export function isAcmBesluitDump(text: string): boolean {
  return /Autoriteit Consument en Markt/i.test(text) && /\/acm-besluiten\b|Zaaknummer ACM\//i.test(text);
}

export function isCcpcMergerDump(text: string): boolean {
  return /Competition and Consumer Protection Commission/i.test(text) && /\/ccpc-mergers\b|DETERMINATION OF MERGER NOTIFICATION/i.test(text);
}

export function isBkartaDump(text: string): boolean {
  return /Bundeskartellamt/i.test(text) && /\/bkarta-entscheidungen\b|In dem Verwaltungsverfahren/i.test(text);
}

export function isCmaCa98Dump(text: string): boolean {
  return /Competition and Markets Authority/i.test(text) && /\/cma-ca98\b|CA98/i.test(text);
}

export function isRealIpoTmBody(text: string): boolean {
  if (
    isIndexTeaserDump(text) ||
    isPeopleDump(text) ||
    isTmJournalDump(text) ||
    isDesignDump(text) ||
    isGovUkDump(text) ||
    isFindCaseLawDump(text) ||
    isIcoMpnDump(text) ||
    isPhmsaCopDump(text) ||
    isAcmBesluitDump(text) ||
    isCcpcMergerDump(text) ||
    isBkartaDump(text) ||
    isCmaCa98Dump(text)
  ) {
    return false;
  }
  const compact = compactForMatch(text);
  if (compact.length < 2000) return false;
  if (/RECORD OF DECISION/i.test(text) && /DECLARATION/i.test(text) && /\b(CERCLA|Superfund)\b/i.test(text)) {
    return false;
  }
  const act = /TRADE MARKS ACT 1994/i.test(compact);
  const office = /Intellectual Property Office|For the Registrar|Appointed Person|Hearing Officer|Comptroller/i.test(
    compact,
  );
  const bl = /\b(?:BL\s*)?O[/\-]\d{3,4}[/\-]\d{2}\b/i.test(compact);
  const interPartes = /opposition|invalidity|appeal|IN THE MATTER OF/i.test(compact);
  const company = ENTITY_RE.test(compact);
  return act && office && bl && interPartes && company;
}

export function parseIpoTmText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    docket?: string | null;
    bl?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): IpoTmCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialIpoTmPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(meta.id) || slugFromUrl(sourceUrl);
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || `${docket}.pdf`;
  const bl = normalizeBl(meta.bl) || normalizeBl(meta.docket) || normalizeBl(body.slice(0, 2500)) || "";
  return {
    id: meta.id && normalizeDocket(meta.id) ? normalizeDocket(meta.id)! : docket,
    docket,
    bl,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 800)) ?? isoDate(body.slice(-800)),
    title: TITLE_BY_DOCKET[docket] || meta.title || "Hearing",
    sourceUrl,
    body,
  };
}

export function emptyIpoTmSnapshot(reason: string): IpoTmSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/t-challenge-decision-results/` },
    cards: [],
  };
}

export function assembleIpoTmSnapshot(cards: IpoTmCard[], fetchedAt = new Date().toISOString()): IpoTmSnapshot {
  const withBody = cards
    .filter((c) => isRealIpoTmBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official IPO trade-mark hearing PDFs had no extractable decision text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/t-challenge-decision-results/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): IpoTmSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as IpoTmSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readIpoTmSnapshot(): IpoTmSnapshot | null {
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

export function writeIpoTmSnapshot(snap: IpoTmSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchIpoTmBytes(url: string): Promise<Uint8Array> {
  const official = officialIpoTmPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("IPO_TM_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("IPO_TM_JSON_DIR") || env("IPO_TM_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("IPO_TM_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("IPO_TM_MAX_FETCH", "8"));
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

async function loadOfficialListings(dir: string): Promise<{ listed: IpoTmListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as IpoTmListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialText(row: IpoTmListing, cacheDir: string, fetched: { n: number }): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.docket));
  if (!existsSync(pdfFile)) {
    writeFileSync(pdfFile, await fetchIpoTmBytes(row.sourceUrl));
    fetched.n += 1;
  }
  return pdfToText(pdfFile);
}

export async function collectIpoTm(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<IpoTmSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ipoTmDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, IpoTmCard>();
  for (const card of readIpoTmSnapshot()?.cards ?? []) {
    if (isRealIpoTmBody(card.body)) prior.set(card.id, card);
  }
  const cards: IpoTmCard[] = [];
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
      const parsed = parseIpoTmText(text, row);
      if (!isRealIpoTmBody(parsed.body)) {
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
  const snap = { ...assembleIpoTmSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeIpoTmSnapshot(snap);
  return snap;
}

export async function loadIpoTm(): Promise<IpoTmSnapshot> {
  const cached = readIpoTmSnapshot();
  if (cached && cached.cards.some((c) => isRealIpoTmBody(c.body))) return cached;
  try {
    return await collectIpoTm();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live IPO trade-mark hearing fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyIpoTmSnapshot(
      `IPO trade-mark hearing PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildIpoTmManifest(snap: IpoTmSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealIpoTmBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + BL + date + official PDF URL only. Hearing body is the paid GET /ipo-tm payload. Not people. Not the year-grid/card. Not TM Journal XML. Not design_decision. Not GOV.UK trademark_decision. Not Find Case Law. Not ICO /ico-mpn. Not PHMSA /phmsa-cop. Not ACM /acm-besluiten. Not CCPC /ccpc-mergers. Not BKartA /bkarta-entscheidungen. Not CMA /cma-ca98. Prep only — do not list.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: IPO_TM_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      bl: c.bl,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "bl", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/t-challenge-decision-results/` },
  };
}

export async function loadIpoTmManifest(): Promise<Record<string, unknown>> {
  return buildIpoTmManifest(readIpoTmSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectIpoTm()
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
              bl: c.bl,
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
