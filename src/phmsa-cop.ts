/**
 * PHMSA Office of Pipeline Safety Consent Order / Consent Agreement /
 * Final Order / Corrective Action Order / Safety Order TEXT door.
 * Official PDFs from primis.phmsa.dot.gov/enforcement-documents/ only.
 * Does not invent order text. Institution/company operators only. Not people.
 * Not the case-card teaser. Not PHMSA 27nc-rsge incident NARRATIVE.
 * Not Raw Data.txt / page-data.json. Not ICO /ico-mpn. Not CMA /cma-ca98.
 * Prep only — do not list until /ico-mpn is live.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const PHMSA_COP_PATH = "/phmsa-cop";
export const PHMSA_COP_MANIFEST_PATH = "/phmsa-cop/manifest.json";
export const PHMSA_COP_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "phmsa-ops-consent-order-bodies";
export const PRODUCT_NAME = "PHMSA Office of Pipeline Safety consent / final / corrective / safety order text";

export const LISTING_URL = "https://primis.phmsa.dot.gov/enforcement-documents/";
export const PDF_HOST = "primis.phmsa.dot.gov";
export const PDF_ORIGIN = "https://primis.phmsa.dot.gov";
export const MEDIA_RE = /\/enforcement-documents\/([A-Za-z0-9]+)\/([^/?#]+\.pdf)/i;
export const DOCKET_BARE_RE = /^([a-z0-9][a-z0-9._-]{2,80})$/;
export const LICENSE = "17 U.S.C. § 105";
export const ATTRIBUTION =
  "Pipeline and Hazardous Materials Safety Administration (PHMSA), U.S. Department of Transportation. Work of the United States Government; 17 U.S.C. § 105.";

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

export type PhmsaCopListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type PhmsaCopListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type PhmsaCopCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type PhmsaCopSnapshot = {
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
  cards: PhmsaCopCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (PHMSA COP texts; +https://primis.phmsa.dot.gov/enforcement-documents/)";
const OFFICIAL_HOSTS = new Set(["primis.phmsa.dot.gov", "www.primis.phmsa.dot.gov"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.P\.|LP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|Partners|Pipeline|Energy|Operating|Transmission|LNG|Terminaling)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const ORDER_TITLE_RE =
  /Consent Agreement and Order|Consent Order|Consent Agreement|Final Order|Corrective Action Order|\bCAO\b|Safety Order|NOPSO/i;
const KILL_FILE_RE =
  /Raw Data\.txt|page-data\.json|NARRATIVE|27nc-rsge|42025024NOPV2|PHMSA Pipeline Enforcement Raw Data/i;

const FILENAME_DOCKET: Record<string, string> = {
  "12025033NOPV_Consent Agreement and Order_04212026_(22-259271).pdf": "eqt-1-2025-033-nopv",
  "42025024NOPV1_Consent Agreement and Order_05222026_(23-284937).pdf": "denbury-4-2025-024-nopv1",
  "42025010NOPSO_Consent Agreement and Order_01282026_(25-353455).pdf": "cove-point-4-2025-010-nopso",
  "42026004NOPV_Final Order_04012026_(25-329817).pdf": "valero-4-2026-004-nopv",
  "42026005CAO_Corrective Action Order_02172026_(26-364755).pdf": "enterprise-4-2026-005-cao",
};

const CASE_DOCKET: Record<string, string> = {
  "12025033NOPV": "eqt-1-2025-033-nopv",
  "42025024NOPV1": "denbury-4-2025-024-nopv1",
  "42025010NOPSO": "cove-point-4-2025-010-nopso",
  "42026004NOPV": "valero-4-2026-004-nopv",
  "42026005CAO": "enterprise-4-2026-005-cao",
};

export const SEED_LISTINGS: PhmsaCopListing[] = [
  {
    id: "eqt-1-2025-033-nopv",
    docket: "eqt-1-2025-033-nopv",
    institution: "EQT Production Company",
    date: "2026-04-21",
    title: "Consent Agreement and Order",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/12025033NOPV/12025033NOPV_Consent%20Agreement%20and%20Order_04212026_(22-259271).pdf",
    pdfId: "12025033NOPV_Consent Agreement and Order_04212026_(22-259271).pdf",
  },
  {
    id: "denbury-4-2025-024-nopv1",
    docket: "denbury-4-2025-024-nopv1",
    institution: "Denbury Gulf Coast Pipelines LLC / ExxonMobil Pipeline Company LLC",
    date: "2026-05-22",
    title: "Consent Agreement and Order",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/42025024NOPV1/42025024NOPV1_Consent%20Agreement%20and%20Order_05222026_(23-284937).pdf",
    pdfId: "42025024NOPV1_Consent Agreement and Order_05222026_(23-284937).pdf",
  },
  {
    id: "cove-point-4-2025-010-nopso",
    docket: "cove-point-4-2025-010-nopso",
    institution: "Cove Point LNG, LP / BHE GT&S, LLC",
    date: "2026-01-28",
    title: "Consent Agreement and Order",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/42025010NOPSO/42025010NOPSO_Consent%20Agreement%20and%20Order_01282026_(25-353455).pdf",
    pdfId: "42025010NOPSO_Consent Agreement and Order_01282026_(25-353455).pdf",
  },
  {
    id: "valero-4-2026-004-nopv",
    docket: "valero-4-2026-004-nopv",
    institution: "Valero Partners Operating Co., LLC",
    date: "2026-04-01",
    title: "Final Order",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/42026004NOPV/42026004NOPV_Final%20Order_04012026_(25-329817).pdf",
    pdfId: "42026004NOPV_Final Order_04012026_(25-329817).pdf",
  },
  {
    id: "enterprise-4-2026-005-cao",
    docket: "enterprise-4-2026-005-cao",
    institution: "Enterprise Products Operating, LLC",
    date: "2026-02-17",
    title: "Corrective Action Order",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/42026005CAO/42026005CAO_Corrective%20Action%20Order_02172026_(26-364755).pdf",
    pdfId: "42026005CAO_Corrective Action Order_02172026_(26-364755).pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function phmsaCopDir(): string {
  if (env("PHMSA_COP_DIR")) return resolve(env("PHMSA_COP_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/phmsa-cop"));
}

export function snapshotPath(): string {
  return join(phmsaCopDir(), "snapshot.json");
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

function blockedHost(host: string): boolean {
  return (
    host === "web.archive.org" ||
    host === "federalregister.gov" ||
    host === "www.federalregister.gov" ||
    host === "www.govinfo.gov" ||
    host === "govinfo.gov" ||
    host === "catalog.data.gov" ||
    host === "data.gov" ||
    host === "www.data.gov" ||
    host === "ico.org.uk" ||
    host === "www.ico.org.uk" ||
    host === "assets.publishing.service.gov.uk"
  );
}

export function officialPhmsaCopPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    if (/\/enforcement-data\//i.test(parsed.pathname)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (KILL_FILE_RE.test(path) || KILL_FILE_RE.test(parsed.pathname)) return null;
    if (!/\.pdf$/i.test(path)) return null;
    const media = path.match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
    if (!media) return null;
    if (/42025024NOPV2/i.test(media[1]) || /42025024NOPV2/i.test(media[2])) return null;
    if (/NARRATIVE|27nc-rsge/i.test(media[2])) return null;
    const file = media[2].replace(/ /g, "%20");
    return `${PDF_ORIGIN}/enforcement-documents/${media[1]}/${file}`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialPhmsaCopPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = decodeURIComponent(parsed.pathname).match(MEDIA_RE);
    return media ? media[2] : null;
  } catch {
    return null;
  }
}

export function slugFromUrl(url: string): string {
  const pdfId = pdfIdFromUrl(url) || "";
  if (FILENAME_DOCKET[pdfId]) return FILENAME_DOCKET[pdfId];
  const official = officialPhmsaCopPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = decodeURIComponent(parsed.pathname).match(MEDIA_RE);
    if (media && CASE_DOCKET[media[1]]) return CASE_DOCKET[media[1]];
  } catch {
    /* fall through */
  }
  return pdfId.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (FILENAME_DOCKET[trimmed]) return FILENAME_DOCKET[trimmed];
  if (CASE_DOCKET[trimmed]) return CASE_DOCKET[trimmed];
  if (DOCKET_BARE_RE.test(trimmed) && !/\s/.test(trimmed)) return trimmed;
  return null;
}

export function isPeopleRow(row: PhmsaCopListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isPressTeaserRow(row: PhmsaCopListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`;
  if (/case-card|enforcement-data\/case|teaser/i.test(kind) && !officialPhmsaCopPdfUrl(row.sourceUrl ?? "")) {
    return true;
  }
  return false;
}

export function isRepublicLabRow(row: PhmsaCopListingRow): boolean {
  const blob = `${row.docket ?? ""} ${row.institution ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`;
  return /42025024NOPV2|Republic Testing Laboratories/i.test(blob);
}

export function isHazmatShipperRow(row: PhmsaCopListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.docket ?? ""} ${row.sourceUrl ?? ""}`;
  return /hazmat shipper ticket|\bHM-\d+|HM\d{4}TICKET/i.test(kind);
}

export function isIncidentNarrativeRow(row: PhmsaCopListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.docket ?? ""} ${row.sourceUrl ?? ""}`;
  return /27nc-rsge|incident NARRATIVE|\bNARRATIVE\b/i.test(kind);
}

export function isInstitutionOrderRow(row: PhmsaCopListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (isPressTeaserRow(row)) return false;
  if (isRepublicLabRow(row)) return false;
  if (isHazmatShipperRow(row)) return false;
  if (isIncidentNarrativeRow(row)) return false;
  if (!officialPhmsaCopPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`;
  if (!ORDER_TITLE_RE.test(kind)) return false;
  return true;
}

export function parseListingRows(rows: PhmsaCopListingRow[]): PhmsaCopListing[] {
  const found: PhmsaCopListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const sourceUrl = officialPhmsaCopPdfUrl(row.sourceUrl ?? "");
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
      title: title || "Consent Order",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): PhmsaCopListing[] {
  const rows: PhmsaCopListingRow[] = [];
  const links = [
    ...html.matchAll(
      /(?:(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})[\s\S]{0,240}?)?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];
  for (const m of links) {
    const href = m[2].startsWith("http") ? m[2] : `${PDF_ORIGIN}${m[2].startsWith("/") ? "" : "/"}${m[2]}`;
    if (!officialPhmsaCopPdfUrl(href)) continue;
    const title = stripTags(m[3]);
    const docket = slugFromUrl(href);
    rows.push({
      institution: title.replace(/\s+(Consent|Final|Corrective|Safety).*$/i, "").trim() || title,
      date: m[1] || undefined,
      title: ORDER_TITLE_RE.test(title) ? title.replace(/^.*?\b(Consent|Final|Corrective|Safety).*$/i, "$1").trim() || title : title,
      type: ORDER_TITLE_RE.test(title) ? "Consent Order" : title,
      sourceUrl: href,
      pdfId: pdfIdFromUrl(href) ?? "",
      docket,
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ docket \/ date \/ PDF URL/i.test(text)) return true;
  if (/PHMSA case-card teaser|primis case-card teaser/i.test(text)) return true;
  if (/PHMSA Pipeline Enforcement Raw Data/i.test(text) && !/CONSENT ORDER|FINAL ORDER|CORRECTIVE ACTION ORDER/i.test(text)) {
    return true;
  }
  if (/INSTRUCTIONS/i.test(text) && !/CONSENT ORDER|FINAL ORDER|CORRECTIVE ACTION ORDER|SAFETY ORDER/i.test(text)) {
    return true;
  }
  return false;
}

export function isFederalRegisterDump(text: string): boolean {
  return /"raw_text"/.test(text) || /"full_text"/.test(text) || /federalregister\.gov/i.test(text);
}

export function isPeopleDump(text: string): boolean {
  if (/people-only PHMSA|people-only CFTC/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isIncidentNarrativeDump(text: string): boolean {
  return /27nc-rsge|incident NARRATIVE/i.test(text) && !/CONSENT ORDER|FINAL ORDER|CORRECTIVE ACTION ORDER/i.test(text);
}

export function isRawIndexDump(text: string): boolean {
  if (/page-data\.json|componentChunkName/i.test(text)) return true;
  if (/PHMSA Pipeline Enforcement Raw Data\.txt/i.test(text)) return true;
  return false;
}

export function isRepublicLabDump(text: string): boolean {
  return /42025024NOPV2/i.test(text) && /Republic Testing Laboratories/i.test(text);
}

export function isIcoMpnDump(text: string): boolean {
  if (/Information Commissioner'?s Office/i.test(text) && /Monetary Penalty Notice|PENALTY NOTICE/i.test(text)) {
    return true;
  }
  if (/\bICO MPN\b/i.test(text) || /\/ico-mpn\b/i.test(text)) return true;
  return false;
}

export function isRealPhmsaCopBody(text: string): boolean {
  if (
    isIndexTeaserDump(text) ||
    isFederalRegisterDump(text) ||
    isPeopleDump(text) ||
    isIncidentNarrativeDump(text) ||
    isRawIndexDump(text) ||
    isRepublicLabDump(text) ||
    isIcoMpnDump(text)
  ) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 1500) return false;
  if (/RECORD OF DECISION/i.test(text) && /DECLARATION/i.test(text) && /\b(CERCLA|Superfund)\b/i.test(text)) {
    return false;
  }
  if (/Center for Devices and Radiological Health/i.test(text) && /De Novo request/i.test(text)) return false;
  if (/ENVIRONMENTAL PROTECTION AGENCY/i.test(text) && /FIFRA-\d{2}-\d{4}-\d{4}/i.test(text)) return false;
  if (/COMMODITY FUTURES TRADING COMMISSION/i.test(text) && /CFTC Docket No/i.test(text)) return false;
  if (/Bureau of Industry and Security/i.test(text) && /PROPOSED CHARGING LETTER|ORDER RELATING TO/i.test(text)) {
    return false;
  }
  if (/ALCOHOL AND TOBACCO TAX AND TRADE BUREAU/i.test(text) && /ABSTRACT AND STATEMENT/i.test(text)) return false;
  if (/\d{2}-\d{3}-01air/i.test(text) && /Confirmation of the regulatory status/i.test(text)) return false;
  const phmsa = /Pipeline and Hazardous Materials Safety Administration|\bPHMSA\b/i.test(text);
  const ops = /Office of Pipeline Safety|\bOPS\b/i.test(text);
  const order = /CONSENT ORDER|CONSENT AGREEMENT|FINAL ORDER|CORRECTIVE ACTION ORDER|SAFETY ORDER/i.test(text);
  const statute = /49 CFR|49 C\.F\.R\.|49 U\.S\.C\.|\bCPF\b/i.test(text);
  return phmsa && (ops || statute) && order && statute;
}

export function parsePhmsaCopText(
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
): PhmsaCopCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialPhmsaCopPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(meta.id) || slugFromUrl(sourceUrl);
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || `${docket}.pdf`;
  const title = (meta.title ?? "").trim();
  return {
    id: meta.id && normalizeDocket(meta.id) ? normalizeDocket(meta.id)! : docket,
    docket,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 4000)),
    title: title || "Consent Order",
    sourceUrl,
    body,
  };
}

export function emptyPhmsaCopSnapshot(reason: string): PhmsaCopSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/enforcement-documents/` },
    cards: [],
  };
}

export function assemblePhmsaCopSnapshot(
  cards: PhmsaCopCard[],
  fetchedAt = new Date().toISOString(),
): PhmsaCopSnapshot {
  const withBody = cards
    .filter((c) => isRealPhmsaCopBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official PHMSA enforcement PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/enforcement-documents/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): PhmsaCopSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as PhmsaCopSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readPhmsaCopSnapshot(): PhmsaCopSnapshot | null {
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

export function writePhmsaCopSnapshot(snap: PhmsaCopSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchPhmsaCopBytes(url: string): Promise<Uint8Array> {
  const official = officialPhmsaCopPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("PHMSA_COP_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("PHMSA_COP_JSON_DIR") || env("PHMSA_COP_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("PHMSA_COP_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("PHMSA_COP_MAX_FETCH", "8"));
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

function textLayerUrl(url: string): string | null {
  const official = officialPhmsaCopPdfUrl(url);
  if (!official) return null;
  if (/_text\.pdf$/i.test(official)) return official;
  return official.replace(/\.pdf$/i, "_text.pdf");
}

function safePdfName(pdfId: string, docket: string): string {
  const name = pdfId.endsWith(".pdf") ? pdfId : `${docket}.pdf`;
  return name.replace(/[^\w.\- ()]+/g, "_");
}

async function loadOfficialListings(dir: string): Promise<{ listed: PhmsaCopListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as PhmsaCopListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialText(row: PhmsaCopListing, cacheDir: string, fetched: { n: number }): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.docket));
  if (!existsSync(pdfFile)) {
    writeFileSync(pdfFile, await fetchPhmsaCopBytes(row.sourceUrl));
    fetched.n += 1;
  }
  const primary = pdfToText(pdfFile);
  if (isRealPhmsaCopBody(primary)) return primary;
  const altUrl = textLayerUrl(row.sourceUrl);
  if (altUrl && altUrl !== officialPhmsaCopPdfUrl(row.sourceUrl)) {
    const altFile = join(cacheDir, safePdfName(row.pdfId, row.docket).replace(/\.pdf$/i, "_text.pdf"));
    try {
      if (!existsSync(altFile)) {
        writeFileSync(altFile, await fetchPhmsaCopBytes(altUrl));
        fetched.n += 1;
      }
      const alt = pdfToText(altFile);
      if (isRealPhmsaCopBody(alt)) return alt;
    } catch {
      /* keep primary */
    }
  }
  return primary;
}

export async function collectPhmsaCop(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<PhmsaCopSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = phmsaCopDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, PhmsaCopCard>();
  for (const card of readPhmsaCopSnapshot()?.cards ?? []) {
    if (isRealPhmsaCopBody(card.body)) prior.set(card.id, card);
  }
  const cards: PhmsaCopCard[] = [];
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
      const parsed = parsePhmsaCopText(text, row);
      if (!isRealPhmsaCopBody(parsed.body)) {
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
  const snap = { ...assemblePhmsaCopSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writePhmsaCopSnapshot(snap);
  return snap;
}

export async function loadPhmsaCop(): Promise<PhmsaCopSnapshot> {
  const cached = readPhmsaCopSnapshot();
  if (cached && cached.cards.some((c) => isRealPhmsaCopBody(c.body))) return cached;
  try {
    return await collectPhmsaCop();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live PHMSA COP fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyPhmsaCopSnapshot(
      `PHMSA COP PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildPhmsaCopManifest(snap: PhmsaCopSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealPhmsaCopBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + operator + CPF/docket + date + official PDF URL only. Order body is the paid GET /phmsa-cop payload. Not people. Not the case-card teaser. Not PHMSA 27nc-rsge incident NARRATIVE. Not Raw Data.txt / page-data.json. Not ICO /ico-mpn. Prep only — do not list until /ico-mpn is live.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: PHMSA_COP_AMOUNT_ATOMIC,
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
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/enforcement-documents/` },
  };
}

export async function loadPhmsaCopManifest(): Promise<Record<string, unknown>> {
  return buildPhmsaCopManifest(readPhmsaCopSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectPhmsaCop()
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
