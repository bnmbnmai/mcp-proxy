/**
 * Ireland CCPC merger determination TEXT door.
 * Official PDFs from assets.ccpc.ie/data/docs/default-source/merger-attachments/ only, via pdftotext.
 * Does not invent determination text. Institution/company only. Not people / named-seller SKUs.
 * Not the case-card grid. Not merger-announcement PDFs.
 * Not withdrawn files with no final determination (Elis/OCL M/25/050).
 * Not Sitefinity OData. Not Cludo. Not data.gov.ie. Not Rechtspraak. Not Federal Register.
 * Not ICO /ico-mpn. Not PHMSA /phmsa-cop. Not ACM /acm-besluiten. Not CMA /cma-ca98.
 * Prep only — do not list on well-known / OpenAPI / llms.txt / shop catalog.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const CCPC_MERGERS_PATH = "/ccpc-mergers";
export const CCPC_MERGERS_MANIFEST_PATH = "/ccpc-mergers/manifest.json";
export const CCPC_MERGERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "ccpc-institution-merger-determination-bodies";
export const PRODUCT_NAME = "CCPC merger determination text";

export const LISTING_URL = "https://www.ccpc.ie/enforcement-and-regulation/mergers/find-a-merger-case";
export const CASE_ORIGIN = "https://www.ccpc.ie";
export const PDF_HOST = "assets.ccpc.ie";
export const PDF_ORIGIN = "https://assets.ccpc.ie";
export const MEDIA_RE = /\/data\/docs\/default-source\/merger-attachments\/([^?#]+\.pdf)/i;
export const DOCKET_BARE_RE = /^([a-z0-9][a-z0-9._-]{2,80})$/;
export const LICENSE = "CC-BY 4.0";
export const ATTRIBUTION =
  "Competition and Consumer Protection Commission (CCPC). Licensed under CC-BY 4.0 (Ireland PSI / Open Data Directive). CCPC logos/images and third-party material reserved — sold body is CCPC-authored TEXT only.";

export const CARD_FIELDS = [
  "id",
  "docket",
  "mNumber",
  "pdfId",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type CcpcMergersListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  mNumber?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type CcpcMergersListing = {
  id: string;
  docket: string;
  mNumber: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type CcpcMergersCard = {
  id: string;
  docket: string;
  mNumber: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type CcpcMergersSnapshot = {
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
  cards: CcpcMergersCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (CCPC merger determination texts; +https://www.ccpc.ie/)";
const OFFICIAL_HOSTS = new Set(["assets.ccpc.ie", "www.assets.ccpc.ie"]);
const ENTITY_RE =
  /\b(DAC|Designated Activity Company|Inc\.?|LLC|L\.L\.C\.|L\.L\.P\.|LLP|L\.P\.|LP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|PLC|Plc|plc|B\.V\.?|N\.V\.?|SE|GmbH|Group)\b/;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const WITHDRAWN_PATH_RE = /elis-ocl|m-25-050/i;
const ANNOUNCEMENT_RE = /merger-announcement|announcement\.pdf/i;
const DETERMINATION_FILE_RE = /(?:public-)?determination\.pdf/i;
const KILL_TITLE_RE =
  /announcement|withdrawn|odata|cludo|data\.gov\.ie|rechtspraak|federalregister|case-card|find a merger case/i;

const FILENAME_DOCKET: Record<string, string> = {
  "m-26-006-determination.pdf": "united-hardware-m26006",
  "m-26-039-determination.pdf": "bdo-m26039",
  "m-26-035-public-determination.pdf": "doehler-treatt-m26035",
  "m-26-038-determination.pdf": "wolseley-curran-m26038",
  "m-26-033-determination.pdf": "ivc-acorn-m26033",
};

const MNUMBER_DOCKET: Record<string, string> = {
  "M/26/006": "united-hardware-m26006",
  "M/26/039": "bdo-m26039",
  "M/26/035": "doehler-treatt-m26035",
  "M/26/038": "wolseley-curran-m26038",
  "M/26/033": "ivc-acorn-m26033",
};

export const SEED_LISTINGS: CcpcMergersListing[] = [
  {
    id: "united-hardware-m26006",
    docket: "united-hardware-m26006",
    mNumber: "M/26/006",
    institution: "United Hardware DAC / Ardentia / Kehoe’s Homevalue t/a Dermot Kehoe Supply & DIY",
    date: "2026-03-06",
    title: "Section 21 determination",
    sourceUrl:
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/united-hardware-dermot-kehoe-supply---diy/m-26-006-determination.pdf",
    pdfId: "m-26-006-determination.pdf",
  },
  {
    id: "bdo-m26039",
    docket: "bdo-m26039",
    mNumber: "M/26/039",
    institution: "BDO UK Partner Limited / BDO Ireland LLP",
    date: "2026-06-16",
    title: "Section 21 determination",
    sourceUrl:
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/bdo-uk-bdo-ireland/m-26-039-determination.pdf",
    pdfId: "m-26-039-determination.pdf",
  },
  {
    id: "doehler-treatt-m26035",
    docket: "doehler-treatt-m26035",
    mNumber: "M/26/035",
    institution: "Döhler Finance Management B.V. / Döhler Group SE / Treatt plc",
    date: "2026-06-03",
    title: "Section 21 determination",
    sourceUrl:
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/doehler-treatt/m-26-035-public-determination.pdf",
    pdfId: "m-26-035-public-determination.pdf",
  },
  {
    id: "wolseley-curran-m26038",
    docket: "wolseley-curran-m26038",
    mNumber: "M/26/038",
    institution: "Wolseley Group Limited / Cooperstorm Limited / Peter Curran Electric Limited",
    date: "2026-06-05",
    title: "Section 21 determination",
    sourceUrl:
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/wolseley-peter-curran-electrical/m-26-038-determination.pdf",
    pdfId: "m-26-038-determination.pdf",
  },
  {
    id: "ivc-acorn-m26033",
    docket: "ivc-acorn-m26033",
    mNumber: "M/26/033",
    institution: "Independent Vetcare Ireland Limited / IVC Evidensia / Acorn Veterinary Clinic Limited",
    date: "2026-05-25",
    title: "Section 21 determination",
    sourceUrl:
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/ivc-evidensia-ireland-acorn-veterinary-clinic/m-26-033-determination.pdf",
    pdfId: "m-26-033-determination.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ccpcMergersDir(): string {
  if (env("CCPC_MERGERS_DIR")) return resolve(env("CCPC_MERGERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ccpc-mergers"));
}

export function snapshotPath(): string {
  return join(ccpcMergersDir(), "snapshot.json");
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
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
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
    const mm = months[named[2].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[1].padStart(2, "0")}` : null;
  }
  const namedFirst = raw.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (namedFirst) {
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
    const mm = months[namedFirst[1].toLowerCase()];
    return mm ? `${namedFirst[3]}-${mm}-${namedFirst[2].padStart(2, "0")}` : null;
  }
  return null;
}

function blockedHost(host: string): boolean {
  return (
    host === "data.gov.ie" ||
    host === "www.data.gov.ie" ||
    host === "api.cludo.com" ||
    host === "cludo.com" ||
    host === "www.cludo.com" ||
    host === "uitspraken.rechtspraak.nl" ||
    host === "rechtspraak.nl" ||
    host === "www.rechtspraak.nl" ||
    host === "federalregister.gov" ||
    host === "www.federalregister.gov" ||
    host === "web.archive.org" ||
    host === "ico.org.uk" ||
    host === "www.ico.org.uk" ||
    host === "acm.nl" ||
    host === "www.acm.nl" ||
    host === "primis.phmsa.dot.gov" ||
    host === "www.primis.phmsa.dot.gov" ||
    host === "assets.publishing.service.gov.uk" ||
    host === "www.gov.uk" ||
    host === "gov.uk"
  );
}

function filenameFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return decodeURIComponent(parts.at(-1) ?? "");
}

export function officialCcpcMergerPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    if (/\/api\/default|\/odata|sitefinity/i.test(parsed.pathname)) return null;
    const path = decodeURIComponent(parsed.pathname);
    const media = path.match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
    if (!media) return null;
    const file = filenameFromPath(media[1]);
    if (ANNOUNCEMENT_RE.test(file) || ANNOUNCEMENT_RE.test(media[1])) return null;
    if (WITHDRAWN_PATH_RE.test(media[1]) || WITHDRAWN_PATH_RE.test(file)) return null;
    if (!DETERMINATION_FILE_RE.test(file)) return null;
    return `${PDF_ORIGIN}/data/docs/default-source/merger-attachments/${media[1]}`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialCcpcMergerPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = decodeURIComponent(parsed.pathname).match(MEDIA_RE);
    return media ? filenameFromPath(media[1]) : null;
  } catch {
    return null;
  }
}

export function slugFromUrl(url: string): string {
  const pdfId = pdfIdFromUrl(url) || "";
  if (FILENAME_DOCKET[pdfId]) return FILENAME_DOCKET[pdfId];
  return pdfId.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (FILENAME_DOCKET[trimmed]) return FILENAME_DOCKET[trimmed];
  const mNumber = normalizeMNumber(trimmed);
  if (mNumber && MNUMBER_DOCKET[mNumber]) return MNUMBER_DOCKET[mNumber];
  if (DOCKET_BARE_RE.test(trimmed) && !/\s/.test(trimmed)) return trimmed;
  return null;
}

export function normalizeMNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/\bM[/.](\d{2})[/.](\d{3})\b/i);
  return m ? `M/${m[1]}/${m[2]}` : null;
}

export function isPeopleRow(row: CcpcMergersListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isAnnouncementRow(row: CcpcMergersListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`;
  return /announcement/i.test(kind);
}

export function isWithdrawnRow(row: CcpcMergersListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""} ${row.mNumber ?? ""} ${row.docket ?? ""}`;
  return /withdrawn|elis-ocl|m\/25\/050|m-25-050/i.test(kind);
}

export function isCaseCardRow(row: CcpcMergersListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`;
  if (/find-a-merger-case|case-card|grid/i.test(kind) && !officialCcpcMergerPdfUrl(row.sourceUrl ?? "")) {
    return true;
  }
  return false;
}

export function isOdataRow(row: CcpcMergersListingRow): boolean {
  return /odata|sitefinity|\/api\/default/i.test(`${row.title ?? ""} ${row.sourceUrl ?? ""} ${row.type ?? ""}`);
}

export function isCludoRow(row: CcpcMergersListingRow): boolean {
  return /cludo/i.test(`${row.title ?? ""} ${row.sourceUrl ?? ""} ${row.type ?? ""}`);
}

export function isDataGovIeRow(row: CcpcMergersListingRow): boolean {
  return /data\.gov\.ie/i.test(`${row.sourceUrl ?? ""} ${row.title ?? ""}`);
}

export function isRechtspraakRow(row: CcpcMergersListingRow): boolean {
  return /rechtspraak/i.test(`${row.sourceUrl ?? ""} ${row.title ?? ""}`);
}

export function isFederalRegisterRow(row: CcpcMergersListingRow): boolean {
  return /federalregister/i.test(`${row.sourceUrl ?? ""} ${row.title ?? ""}`);
}

export function isInstitutionDeterminationRow(row: CcpcMergersListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (isAnnouncementRow(row)) return false;
  if (isWithdrawnRow(row)) return false;
  if (isCaseCardRow(row)) return false;
  if (isOdataRow(row)) return false;
  if (isCludoRow(row)) return false;
  if (isDataGovIeRow(row)) return false;
  if (isRechtspraakRow(row)) return false;
  if (isFederalRegisterRow(row)) return false;
  if (!officialCcpcMergerPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`;
  if (KILL_TITLE_RE.test(kind)) return false;
  return true;
}

export function parseListingRows(rows: CcpcMergersListingRow[]): CcpcMergersListing[] {
  const found: CcpcMergersListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionDeterminationRow(row)) continue;
    const sourceUrl = officialCcpcMergerPdfUrl(row.sourceUrl ?? "");
    const pdfId = (row.pdfId ?? "").trim() || pdfIdFromUrl(sourceUrl ?? "") || "";
    const docket = normalizeDocket(row.docket) || slugFromUrl(sourceUrl ?? "");
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: normalizeDocket(row.docket) || docket,
      docket,
      mNumber: normalizeMNumber(row.mNumber) || normalizeMNumber(row.docket) || normalizeMNumber(pdfId) || "",
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: "Section 21 determination",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): CcpcMergersListing[] {
  const rows: CcpcMergersListingRow[] = [];
  const links = [
    ...html.matchAll(
      /(?:(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}-\d{2}-\d{2})[\s\S]{0,240}?)?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];
  for (const m of links) {
    const href = m[2].startsWith("http") ? m[2] : `${PDF_ORIGIN}${m[2].startsWith("/") ? "" : "/"}${m[2]}`;
    if (!officialCcpcMergerPdfUrl(href)) continue;
    const title = stripTags(m[3]);
    const docket = slugFromUrl(href);
    rows.push({
      institution:
        title.replace(/\s+Section 21 determination.*$/i, "").trim() ||
        title.replace(/\s+M\/\d{2}\/\d+.*$/i, "").trim() ||
        title,
      date: m[1] || isoDate(title) || undefined,
      title: "Section 21 determination",
      type: "determination",
      sourceUrl: href,
      pdfId: pdfIdFromUrl(href) ?? "",
      docket,
      mNumber: normalizeMNumber(title) ?? undefined,
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ M-number \/ date \/ PDF URL/i.test(text)) return true;
  if (/CCPC case-card teaser|find-a-merger-case/i.test(text) && !/DETERMINATION OF MERGER NOTIFICATION/i.test(text)) {
    return true;
  }
  if (/INSTRUCTIONS/i.test(text) && !/DETERMINATION OF MERGER NOTIFICATION/i.test(text)) return true;
  return false;
}

export function isAnnouncementDump(text: string): boolean {
  if (/MERGER\s+ANNOUNCEMENT/i.test(text) && !/section 21\(2\)\(a\)/i.test(text)) return true;
  if (/publish the reasons for its determination/i.test(text) && !/section 21\(2\)\(a\)/i.test(text)) return true;
  return false;
}

export function isWithdrawnDump(text: string): boolean {
  if (/no final determination will be issued/i.test(text)) return true;
  if (/Outcome:\s*Withdrawn/i.test(text)) return true;
  if (/intends to carry out a full investigation under section 22/i.test(text) && /21\(2\)\(b\)/i.test(text)) {
    return true;
  }
  if (/\bM\/25\/050\b/i.test(text) && /Elis\/OCL/i.test(text)) return true;
  return false;
}

export function isFederalRegisterDump(text: string): boolean {
  return /"raw_text"/.test(text) || /"full_text"/.test(text) || /federalregister\.gov/i.test(text);
}

export function isPeopleDump(text: string): boolean {
  if (/people-only CCPC|named-seller SKU|people-only ACM|people-only CFTC/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isOdataDump(text: string): boolean {
  return /Sitefinity OData|@odata\.context|\/api\/default/i.test(text);
}

export function isCludoDump(text: string): boolean {
  return /Cludo search|api\.cludo\.com/i.test(text);
}

export function isDataGovIeDump(text: string): boolean {
  return /data\.gov\.ie/i.test(text);
}

export function isRechtspraakDump(text: string): boolean {
  return /rechtspraak/i.test(text);
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

export function isRealCcpcMergerBody(text: string): boolean {
  if (
    isIndexTeaserDump(text) ||
    isAnnouncementDump(text) ||
    isWithdrawnDump(text) ||
    isFederalRegisterDump(text) ||
    isPeopleDump(text) ||
    isOdataDump(text) ||
    isCludoDump(text) ||
    isDataGovIeDump(text) ||
    isRechtspraakDump(text) ||
    isIcoMpnDump(text) ||
    isPhmsaCopDump(text) ||
    isAcmBesluitDump(text)
  ) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 2500) return false;
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
  const header = /DETERMINATION OF MERGER NOTIFICATION/i.test(text);
  const ccpc = /Competition and Consumer Protection Commission/i.test(text);
  const statute = /Section 21 of the Competition Act 2002/i.test(text);
  const final = /section 21\(2\)\(a\)/i.test(text);
  return header && ccpc && statute && final;
}

export function parseCcpcMergerText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    docket?: string | null;
    mNumber?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): CcpcMergersCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialCcpcMergerPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(meta.id) || slugFromUrl(sourceUrl);
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || `${docket}.pdf`;
  const mNumber =
    normalizeMNumber(meta.mNumber) ||
    normalizeMNumber(meta.docket) ||
    normalizeMNumber(body.slice(0, 2500)) ||
    "";
  return {
    id: meta.id && normalizeDocket(meta.id) ? normalizeDocket(meta.id)! : docket,
    docket,
    mNumber,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 4000)),
    title: "Section 21 determination",
    sourceUrl,
    body,
  };
}

export function emptyCcpcMergersSnapshot(reason: string): CcpcMergersSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/data/docs/default-source/merger-attachments/` },
    cards: [],
  };
}

export function assembleCcpcMergersSnapshot(
  cards: CcpcMergersCard[],
  fetchedAt = new Date().toISOString(),
): CcpcMergersSnapshot {
  const withBody = cards
    .filter((c) => isRealCcpcMergerBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official CCPC determination PDFs had no extractable section 21 text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/data/docs/default-source/merger-attachments/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): CcpcMergersSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as CcpcMergersSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readCcpcMergersSnapshot(): CcpcMergersSnapshot | null {
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

export function writeCcpcMergersSnapshot(snap: CcpcMergersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchCcpcMergerBytes(url: string): Promise<Uint8Array> {
  const official = officialCcpcMergerPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("CCPC_MERGERS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("CCPC_MERGERS_JSON_DIR") || env("CCPC_MERGERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("CCPC_MERGERS_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("CCPC_MERGERS_MAX_FETCH", "8"));
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

async function loadOfficialListings(dir: string): Promise<{ listed: CcpcMergersListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as CcpcMergersListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialText(row: CcpcMergersListing, cacheDir: string, fetched: { n: number }): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.docket));
  if (!existsSync(pdfFile)) {
    writeFileSync(pdfFile, await fetchCcpcMergerBytes(row.sourceUrl));
    fetched.n += 1;
  }
  return pdfToText(pdfFile);
}

export async function collectCcpcMergers(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<CcpcMergersSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ccpcMergersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, CcpcMergersCard>();
  for (const card of readCcpcMergersSnapshot()?.cards ?? []) {
    if (isRealCcpcMergerBody(card.body)) prior.set(card.id, card);
  }
  const cards: CcpcMergersCard[] = [];
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
      const parsed = parseCcpcMergerText(text, row);
      if (!isRealCcpcMergerBody(parsed.body)) {
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
  const snap = { ...assembleCcpcMergersSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeCcpcMergersSnapshot(snap);
  return snap;
}

export async function loadCcpcMergers(): Promise<CcpcMergersSnapshot> {
  const cached = readCcpcMergersSnapshot();
  if (cached && cached.cards.some((c) => isRealCcpcMergerBody(c.body))) return cached;
  try {
    return await collectCcpcMergers();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live CCPC determination fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyCcpcMergersSnapshot(
      `CCPC determination PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildCcpcMergersManifest(snap: CcpcMergersSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealCcpcMergerBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + M-number + date + official PDF URL only. Determination body is the paid GET /ccpc-mergers payload. Not people. Not the case-card grid. Not merger-announcement PDFs. Not withdrawn-no-determination. Not Sitefinity OData. Not Cludo. Not data.gov.ie. Not ICO /ico-mpn. Not PHMSA /phmsa-cop. Not ACM /acm-besluiten. Prep only — do not list.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: CCPC_MERGERS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      mNumber: c.mNumber,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "mNumber", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/data/docs/default-source/merger-attachments/` },
  };
}

export async function loadCcpcMergersManifest(): Promise<Record<string, unknown>> {
  return buildCcpcMergersManifest(readCcpcMergersSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectCcpcMergers()
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
              mNumber: c.mNumber,
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
