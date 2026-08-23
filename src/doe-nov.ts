/**
 * DOE Office of Enforcement FNOV / PNOV / enforcement-letter TEXT door.
 * Official PDFs from energy.gov/sites/default/files/{yyyy-mm}/ only.
 * Harvest with wget (Safari / full browser UA) + pdftotext.
 * Company/institution contractors only. Not people. Not listing + article teasers.
 * Not NRC. Not /csb-reports. Not Water Boards. Not ATSDR. Not FSIS. Not a stub.
 * License: 17 U.S.C. § 105 + energy.gov public-domain notice. Attribution requested.
 * No NC / no-sell.
 * Prep only — do not list on well-known / OpenAPI / llms.txt / shop catalog.
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const DOE_NOV_PATH = "/doe-nov";
export const DOE_NOV_MANIFEST_PATH = "/doe-nov/manifest.json";
export const DOE_NOV_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "doe-nov-enforcement-bodies";
export const PRODUCT_NAME = "DOE Office of Enforcement FNOV / PNOV / enforcement-letter text";

export const LISTING_URL = "https://www.energy.gov/ea/listings/final-notices-violation";
export const PDF_HOST = "www.energy.gov";
export const PDF_ORIGIN = "https://www.energy.gov";
export const POLICIES_URL = "https://www.energy.gov/web-policies";
export const MEDIA_RE = /\/sites\/default\/files\/(20\d{2}-\d{2})\/([^/?#]+\.pdf)$/i;
export const LICENSE = "17 U.S.C. § 105 + energy.gov public-domain notice";
export const ATTRIBUTION =
  "U.S. Department of Energy, Office of Enterprise Assessments, Office of Enforcement. Work of the United States Government; 17 U.S.C. § 105. Government information at energy.gov is in the public domain and may be freely distributed and copied; the Department of Energy requests appropriate acknowledgement. No NC / no-sell restriction. https://www.energy.gov/web-policies";

/** energy.gov is fine with wget + full browser UA; keep the live-door collector. */
export const WGET_SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export const CARD_FIELDS = ["id", "docket", "pdfId", "institution", "date", "title", "sourceUrl", "body"] as const;

export type DoeNovListingRow = {
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

export type DoeNovListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type DoeNovCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type DoeNovSnapshot = {
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
  sources: { listing: string; pdfHost: string; policies: string };
  cards: DoeNovCard[];
};

const OFFICIAL_HOSTS = new Set(["www.energy.gov", "energy.gov"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|National Security|Laboratory|Services|Institution|University|Authority|Partners)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const DOC_TITLE_RE =
  /Final Notice of Violation|Preliminary Notice of Violation|Enforcement Letter|\bFNOV\b|\bPNOV\b/i;
const DOCKET_RE = /\b((?:NEA|WEA|WEL|NEL|SEA|SEL)-\d{4}-\d{2})\b/i;
const PRESS_FILE_RE = /doe\s+cites|press[\s_-]?release|news[\s_-]?release/i;
const CONSENT_FILE_RE = /consent[\s_-]?order|consent[\s_-]?agreement/i;
const NOI_FILE_RE = /notice[\s_-]?of[\s_-]?intent/i;
const KILL_TITLE_RE =
  /people|press html|doe cites|nrc\.gov|nuclear regulatory commission|\/csb-reports|chemical safety board|waterboards|atsdr-hc|health consultation|fsis-hmsa|health canada|summary reports api|consent order|notice of intent|listing only|article teaser/i;

export const SEED_LISTINGS: DoeNovListing[] = [
  {
    id: "nea-2026-01-mcs",
    docket: "NEA-2026-01",
    institution: "Mid-America Conversion Services, LLC",
    date: "2026-01-15",
    title: "Final Notice of Violation",
    sourceUrl:
      "https://www.energy.gov/sites/default/files/2026-01/Final%20Notice%20of%20Violation%2C%20Mid-America%20Conversion%20Services%2C%20LLC.pdf",
    pdfId: "Final Notice of Violation, Mid-America Conversion Services, LLC.pdf",
  },
  {
    id: "wea-2024-04-harris",
    docket: "WEA-2024-04",
    institution: "Harris Rebar Placing, LLC",
    date: "2025-10-29",
    title: "Final Notice of Violation",
    sourceUrl:
      "https://www.energy.gov/sites/default/files/2025-10/Final%20Notice%20of%20Violation%2C%20Harris%20Rebar%20Replacing%2C%20LLC.pdf",
    pdfId: "Final Notice of Violation, Harris Rebar Replacing, LLC.pdf",
  },
  {
    id: "wea-2025-01-mcs",
    docket: "WEA-2025-01",
    institution: "Mid-America Conversion Services, LLC",
    date: "2025-12-03",
    title: "Final Notice of Violation",
    sourceUrl:
      "https://www.energy.gov/sites/default/files/2025-12/Final%20Notice%20of%20Violation%2C%20Mid-America%20Conversion%20Services%2C%20LLC.pdf",
    pdfId: "Final Notice of Violation, Mid-America Conversion Services, LLC.pdf",
  },
  {
    id: "wel-2026-01-triad",
    docket: "WEL-2026-01",
    institution: "Triad National Security, LLC",
    date: "2026-07-27",
    title: "Enforcement Letter",
    sourceUrl:
      "https://www.energy.gov/sites/default/files/2026-07/Enforcement%20Letter%2C%20Triad%20National%20Security%2C%20LLC.pdf",
    pdfId: "Enforcement Letter, Triad National Security, LLC.pdf",
  },
  {
    id: "wea-2025-03-engert",
    docket: "WEA-2025-03",
    institution: "Engert, LLC",
    date: "2025-07-29",
    title: "Preliminary Notice of Violation",
    sourceUrl:
      "https://www.energy.gov/sites/default/files/2025-08/Preliminary%20Notice%20of%20Violation%2C%20BESCO-Engert%2C%20LLC.pdf",
    pdfId: "Preliminary Notice of Violation, BESCO-Engert, LLC.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function doeNovDir(): string {
  if (env("DOE_NOV_DIR")) return resolve(env("DOE_NOV_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/doe-nov"));
}

export function snapshotPath(): string {
  return join(doeNovDir(), "snapshot.json");
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
    host === "www.nrc.gov" ||
    host === "nrc.gov" ||
    host === "www.csb.gov" ||
    host === "csb.gov" ||
    host === "www.waterboards.ca.gov" ||
    host === "waterboards.ca.gov" ||
    host === "www.atsdr.cdc.gov" ||
    host === "atsdr.cdc.gov" ||
    host === "www.fsis.usda.gov" ||
    host === "fsis.usda.gov" ||
    host === "health-products.canada.ca" ||
    host === "www.canada.ca" ||
    host === "web.archive.org"
  );
}

export function isPressPdf(urlOrPath: string | null | undefined): boolean {
  return PRESS_FILE_RE.test(urlOrPath ?? "");
}

export function isConsentPdf(urlOrPath: string | null | undefined): boolean {
  return CONSENT_FILE_RE.test(urlOrPath ?? "");
}

export function isNoticeOfIntentPdf(urlOrPath: string | null | undefined): boolean {
  return NOI_FILE_RE.test(urlOrPath ?? "");
}

export function officialDoeNovPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (isPressPdf(path) || isConsentPdf(path) || isNoticeOfIntentPdf(path)) return null;
    if (/\/ea\/articles\//i.test(path) || /\/ea\/listings\//i.test(path)) return null;
    const media = path.match(MEDIA_RE);
    if (!media) return null;
    const file = media[2];
    return `${PDF_ORIGIN}/sites/default/files/${media[1]}/${encodeURIComponent(file).replace(/%2C/gi, "%2C")}`;
  } catch {
    return null;
  }
}

export function parseOfficialFilename(url: string | null | undefined): {
  yyyymm: string;
  pdfId: string;
} | null {
  const official = officialDoeNovPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const path = decodeURIComponent(parsed.pathname);
    const media = path.match(MEDIA_RE);
    if (!media) return null;
    return { yyyymm: media[1], pdfId: media[2] };
  } catch {
    const media = official.match(MEDIA_RE);
    if (!media) return null;
    return { yyyymm: media[1], pdfId: decodeURIComponent(media[2]) };
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

export function isPeopleRow(row: DoeNovListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isPressRow(row: DoeNovListingRow): boolean {
  return PRESS_FILE_RE.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`);
}

export function isNrcRow(row: DoeNovListingRow): boolean {
  return /nrc\.gov|nuclear regulatory commission|\bnrc\b/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isCsbRow(row: DoeNovListingRow): boolean {
  return /csb\.gov|\/csb-reports|chemical safety board/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isWaterboardsRow(row: DoeNovListingRow): boolean {
  return /waterboards\.ca\.gov|waterboards-acl|administrative civil liability/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isAtsdrRow(row: DoeNovListingRow): boolean {
  return /atsdr\.cdc\.gov|atsdr-hc|health consultation|public health assessment/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isFsisRow(row: DoeNovListingRow): boolean {
  return /fsis\.usda\.gov|fsis-hmsa|humane.handling|notice of intended enforcement/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isHealthCanadaRow(row: DoeNovListingRow): boolean {
  return /health canada|summary reports api|fullReportCard\.ashx|health-products\.canada\.ca/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isInstitutionNovRow(row: DoeNovListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (
    isPressRow(row) ||
    isNrcRow(row) ||
    isCsbRow(row) ||
    isWaterboardsRow(row) ||
    isAtsdrRow(row) ||
    isFsisRow(row) ||
    isHealthCanadaRow(row)
  ) {
    return false;
  }
  if (!officialDoeNovPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""} ${row.docket ?? ""}`;
  if (KILL_TITLE_RE.test(kind)) return false;
  if (CONSENT_FILE_RE.test(kind) || NOI_FILE_RE.test(kind)) return false;
  if (!DOC_TITLE_RE.test(kind) && !DOCKET_RE.test(kind)) return false;
  return true;
}

export function parseListingRows(rows: DoeNovListingRow[]): DoeNovListing[] {
  const found: DoeNovListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionNovRow(row)) continue;
    const sourceUrl = officialDoeNovPdfUrl(row.sourceUrl ?? "");
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
      title: (row.title ?? "").trim() || titleFromKind(docket),
      sourceUrl,
      pdfId: (row.pdfId ?? "").trim() || parsed.pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return found;
}

function titleFromKind(docket: string): string {
  if (/^WEL-|^NEL-/i.test(docket)) return "Enforcement Letter";
  if (/PNOV|Preliminary/i.test(docket)) return "Preliminary Notice of Violation";
  return "Final Notice of Violation";
}

export function parseListingHtml(html: string): DoeNovListing[] {
  const rows: DoeNovListingRow[] = [];
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of links) {
    const href = m[1].startsWith("http") ? m[1] : `${PDF_ORIGIN}${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (!officialDoeNovPdfUrl(href)) continue;
    const parsed = parseOfficialFilename(href);
    if (!parsed) continue;
    const idx = m.index ?? 0;
    const nearby = stripTags(html.slice(Math.max(0, idx - 240), idx + m[0].length + 160));
    const seed = SEED_LISTINGS.find((s) => officialDoeNovPdfUrl(s.sourceUrl) === officialDoeNovPdfUrl(href));
    const docket = seed?.docket || docketFrom(`${nearby} ${parsed.pdfId}`);
    rows.push({
      institution: seed?.institution || nearby.replace(/\s+(Final|Preliminary|Enforcement|NEA-|WEA-|WEL-).*$/i, "").trim(),
      docket,
      date: isoDate(nearby) || seed?.date || undefined,
      title: seed?.title || (/enforcement letter/i.test(nearby) ? "Enforcement Letter" : /preliminary/i.test(nearby) ? "Preliminary Notice of Violation" : "Final Notice of Violation"),
      type: /enforcement letter/i.test(nearby) ? "enforcement-letter" : /preliminary/i.test(nearby) ? "pnov" : "fnov",
      sourceUrl: href,
      pdfId: parsed.pdfId,
      id: seed?.id || slugFromDocket(docket),
    });
  }
  return parseListingRows(rows);
}

export function isListingTeaserDump(text: string): boolean {
  if (/Index only — contractor \/ docket \/ date \/ official PDF URL/i.test(text)) return true;
  if (/that is the index, not the sold body/i.test(text) && !DOC_TITLE_RE.test(text)) return true;
  if (/listing \+ article teasers are NOT the sold body/i.test(text)) return true;
  return false;
}

export function isPressDump(text: string): boolean {
  if (/DOE Cites .+ for violations/i.test(text) && !/Office of Enforcement/i.test(text)) return true;
  if (/press HTML|article teaser only/i.test(text)) return true;
  return false;
}

export function isPeopleDump(text: string): boolean {
  if (/people-only DOE|named-individual SKU/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isNrcDump(text: string): boolean {
  return /Nuclear Regulatory Commission|\bnrc\.gov\b|\/nrc-/i.test(text);
}

export function isCsbDump(text: string): boolean {
  return /Chemical Safety and Hazard Investigation Board|\/csb-reports\b|csb\.gov/i.test(text);
}

export function isWaterboardsDump(text: string): boolean {
  return /Regional Water Quality Control Board|\/waterboards-acl\b/i.test(text);
}

export function isAtsdrHcDump(text: string): boolean {
  return /Agency for Toxic Substances and Disease Registry|\bATSDR\b/i.test(text) && /Health Consultation|\/atsdr-hc\b/i.test(text);
}

export function isFsisDump(text: string): boolean {
  return /Food Safety and Inspection Service|\/fsis-hmsa\b|Humane Methods of Slaughter/i.test(text);
}

export function isHealthCanadaDump(text: string): boolean {
  return /Health Canada Summary Reports|fullReportCard\.ashx|\/gmp-md\b|\/gmp\b/.test(text) && /Health Canada/i.test(text);
}

export function isRealDoeNovBody(text: string): boolean {
  if (
    isListingTeaserDump(text) ||
    isPressDump(text) ||
    isPeopleDump(text) ||
    isNrcDump(text) ||
    isCsbDump(text) ||
    isWaterboardsDump(text) ||
    isAtsdrHcDump(text) ||
    isFsisDump(text) ||
    isHealthCanadaDump(text)
  ) {
    return false;
  }
  const compact = compactForMatch(text);
  if (compact.length < 800) return false;
  const doe = /Department of Energy|Office of Enforcement|Office of Enterprise Assessments/i.test(compact);
  const doc = DOC_TITLE_RE.test(compact) || DOCKET_RE.test(compact);
  const company = ENTITY_RE.test(compact);
  return doe && doc && company;
}

export function parseDoeNovText(
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
): DoeNovCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialDoeNovPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const parsed = parseOfficialFilename(sourceUrl);
  const docket = docketFrom(`${meta.docket ?? ""} ${body.slice(0, 1200)} ${parsed?.pdfId ?? ""} ${meta.id ?? ""}`, meta.docket);
  const id = meta.id && meta.id.trim() ? meta.id.trim() : slugFromDocket(docket);
  const title =
    (meta.title && meta.title.trim()) ||
    (/Enforcement Letter/i.test(body.slice(0, 800))
      ? "Enforcement Letter"
      : /Preliminary Notice of Violation/i.test(body.slice(0, 800))
        ? "Preliminary Notice of Violation"
        : "Final Notice of Violation");
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

export function emptyDoeNovSnapshot(reason: string): DoeNovSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/{yyyy-mm}/`, policies: POLICIES_URL },
    cards: [],
  };
}

export function assembleDoeNovSnapshot(cards: DoeNovCard[], fetchedAt = new Date().toISOString()): DoeNovSnapshot {
  const withBody = cards
    .filter((c) => isRealDoeNovBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official DOE Office of Enforcement PDFs had no extractable FNOV / PNOV / enforcement-letter text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/{yyyy-mm}/`, policies: POLICIES_URL },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): DoeNovSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as DoeNovSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readDoeNovSnapshot(): DoeNovSnapshot | null {
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

export function writeDoeNovSnapshot(snap: DoeNovSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function wgetOfficialPdf(url: string, dest: string): void {
  const official = officialDoeNovPdfUrl(url);
  if (!official) throw new Error(`${url} is not an official DOE Office of Enforcement PDF`);
  const ua = env("DOE_NOV_WGET_UA") || WGET_SAFARI_UA;
  const helper = env("DOE_NOV_WGET") || "wget";
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

export async function fetchDoeNovBytes(url: string): Promise<Uint8Array> {
  const dest = join(tmpdir(), `doe-nov-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
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
  const helper = env("DOE_NOV_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("DOE_NOV_JSON_DIR") || env("DOE_NOV_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("DOE_NOV_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("DOE_NOV_MAX_FETCH", "8"));
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

async function loadOfficialListings(dir: string): Promise<{ listed: DoeNovListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as DoeNovListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialText(row: DoeNovListing, cacheDir: string, fetched: { n: number }): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.id));
  if (!existsSync(pdfFile)) {
    writeFileSync(pdfFile, await fetchDoeNovBytes(row.sourceUrl));
    fetched.n += 1;
  }
  return pdfToText(pdfFile);
}

export async function collectDoeNov(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<DoeNovSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = doeNovDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, DoeNovCard>();
  for (const card of readDoeNovSnapshot()?.cards ?? []) {
    if (isRealDoeNovBody(card.body)) prior.set(card.id, card);
  }
  const cards: DoeNovCard[] = [];
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
      const parsed = parseDoeNovText(text, row);
      if (!isRealDoeNovBody(parsed.body)) {
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
  const snap = { ...assembleDoeNovSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeDoeNovSnapshot(snap);
  return snap;
}

export async function loadDoeNov(): Promise<DoeNovSnapshot> {
  const cached = readDoeNovSnapshot();
  if (cached && cached.cards.some((c) => isRealDoeNovBody(c.body))) return cached;
  try {
    return await collectDoeNov();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live DOE Office of Enforcement fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyDoeNovSnapshot(
      `DOE Office of Enforcement PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildDoeNovManifest(snap: DoeNovSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealDoeNovBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + contractor + docket + date + official PDF URL only. FNOV / PNOV / enforcement-letter body is the paid GET /doe-nov payload. Not people. Not listing + article teasers. Not NRC. Not /csb-reports. Not /waterboards-acl. Not /atsdr-hc. Not /fsis-hmsa. Prep only — do not list.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: DOE_NOV_AMOUNT_ATOMIC,
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
      pdfHost: `${PDF_ORIGIN}/sites/default/files/{yyyy-mm}/`,
      policies: POLICIES_URL,
    },
  };
}

export async function loadDoeNovManifest(): Promise<Record<string, unknown>> {
  return buildDoeNovManifest(readDoeNovSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectDoeNov()
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
