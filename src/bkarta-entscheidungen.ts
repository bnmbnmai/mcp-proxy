/**
 * Germany Bundeskartellamt Entscheidung / Beschluss TEXT door.
 * Official PDFs from bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/ only, via pdftotext.
 * Does not invent Entscheidung text. Institution/company only. Not people-fine SKUs.
 * Not Fallbericht. Not the Entscheidungsdatenbank card. Not DE/EN press teasers. Not a stub.
 * Not govdata.de. Not GOV.UK. Not ICO /ico-mpn. Not PHMSA /phmsa-cop.
 * Not ACM /acm-besluiten. Not CCPC /ccpc-mergers. Not CMA /cma-ca98.
 * License: § 5 Abs. 1 UrhG — amtliche Entscheidungen have no copyright. Sell BKartA-authored TEXT, not the logo.
 * Prep only — do not list on well-known / OpenAPI / llms.txt / shop catalog.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const BKARTA_ENTSCHEIDUNGEN_PATH = "/bkarta-entscheidungen";
export const BKARTA_ENTSCHEIDUNGEN_MANIFEST_PATH = "/bkarta-entscheidungen/manifest.json";
export const BKARTA_ENTSCHEIDUNGEN_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "bkarta-institution-entscheidung-bodies";
export const PRODUCT_NAME = "BKartA Entscheidung text";

export const LISTING_URL = "https://www.bundeskartellamt.de/DE/Entscheidungen/entscheidungen_node.html";
export const PDF_HOST = "www.bundeskartellamt.de";
export const PDF_ORIGIN = "https://www.bundeskartellamt.de";
export const MEDIA_RE =
  /\/SharedDocs\/Entscheidung\/DE\/Entscheidungen\/(Missbrauchsaufsicht|Fusionskontrolle|Kartellverbot)\/(?:\d{4}\/)?([A-Za-z]+\d+(?:-\d+)*\.pdf)/i;
export const DOCKET_BARE_RE = /^([a-z0-9][a-z0-9._-]{2,80})$/;
export const LICENSE = "§ 5 Abs. 1 UrhG";
export const ATTRIBUTION =
  "Bundeskartellamt (BKartA). Amtliche Entscheidungen have no copyright (§ 5 Abs. 1 UrhG). BKartA logo reserved — sold body is BKartA-authored TEXT only.";

export const CARD_FIELDS = [
  "id",
  "docket",
  "az",
  "pdfId",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type BkartaListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  az?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type BkartaListing = {
  id: string;
  docket: string;
  az: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type BkartaCard = {
  id: string;
  docket: string;
  az: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type BkartaSnapshot = {
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
  cards: BkartaCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (BKartA Entscheidung texts; +https://www.bundeskartellamt.de/)";
const OFFICIAL_HOSTS = new Set(["bundeskartellamt.de", "www.bundeskartellamt.de"]);
const ENTITY_RE =
  /\b(GmbH|AG|SE|KG|OHG|UG|e\.V\.|Inc\.?|LLC|L\.L\.C\.|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|PLC|Plc|plc|B\.V\.?|N\.V\.?|S\.à\s*r\.l\.|Aktiengesellschaft|Gruppe)\b/i;
const PERSON_NAME_RE = /^[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ]\.?)?(?:\s+[A-ZÄÖÜ][a-zäöüß]+){1,3}$/;
const KILL_TITLE_RE =
  /fallbericht|pressemitteilung|press teaser|entscheidungsdatenbank|govdata|gov\.uk|ico-mpn|phmsa|acm-besluiten|ccpc-mergers|cma-ca98/i;
const DECISION_CLASS = /Missbrauchsaufsicht|Fusionskontrolle|Kartellverbot/;

const FILENAME_DOCKET: Record<string, string> = {
  "B2-73-20.pdf": "amazon-b2-73-20",
  "B8-40-25.pdf": "check24-b8-40-25",
  "B1-112-25.pdf": "strabag-stumpp-b1-112-25",
  "B4-100-24.pdf": "toennies-vion-b4-100-24",
  "V-37-25.pdf": "ewe-telekom-gfnw-v-37-25",
};

const AZ_DOCKET: Record<string, string> = {
  "B2-73/20": "amazon-b2-73-20",
  "B8-40/25": "check24-b8-40-25",
  "B1-112/25": "strabag-stumpp-b1-112-25",
  "B4-100/24": "toennies-vion-b4-100-24",
  "V-37/25": "ewe-telekom-gfnw-v-37-25",
};

const TITLE_BY_DOCKET: Record<string, string> = {
  "amazon-b2-73-20": "Verfügung",
  "check24-b8-40-25": "Verpflichtungszusagen",
  "strabag-stumpp-b1-112-25": "Freigabe",
  "toennies-vion-b4-100-24": "Untersagung",
  "ewe-telekom-gfnw-v-37-25": "Einstellung",
};

export const SEED_LISTINGS: BkartaListing[] = [
  {
    id: "amazon-b2-73-20",
    docket: "amazon-b2-73-20",
    az: "B2-73/20",
    institution: "Amazon.com, Inc. / Amazon EU S.à r.l.",
    date: "2026-02-04",
    title: "Verfügung",
    sourceUrl:
      "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Missbrauchsaufsicht/B2-73-20.pdf?__blob=publicationFile&v=3",
    pdfId: "B2-73-20.pdf",
  },
  {
    id: "check24-b8-40-25",
    docket: "check24-b8-40-25",
    az: "B8-40/25",
    institution: "Check24 GmbH",
    date: "2026-02-18",
    title: "Verpflichtungszusagen",
    sourceUrl:
      "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Missbrauchsaufsicht/2026/B8-40-25.pdf?__blob=publicationFile&v=2",
    pdfId: "B8-40-25.pdf",
  },
  {
    id: "strabag-stumpp-b1-112-25",
    docket: "strabag-stumpp-b1-112-25",
    az: "B1-112/25",
    institution: "STRABAG AG / Gebr. Stumpp GmbH & Co. KG",
    date: "2026-03-02",
    title: "Freigabe",
    sourceUrl:
      "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Fusionskontrolle/2026/B1-112-25.pdf?__blob=publicationFile&v=2",
    pdfId: "B1-112-25.pdf",
  },
  {
    id: "toennies-vion-b4-100-24",
    docket: "toennies-vion-b4-100-24",
    az: "B4-100/24",
    institution: "Tönnies International Management GmbH / Vion GmbH / Vion Beef B.V.",
    date: "2025-06-11",
    title: "Untersagung",
    sourceUrl:
      "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Fusionskontrolle/2026/B4-100-24.pdf?__blob=publicationFile&v=3",
    pdfId: "B4-100-24.pdf",
  },
  {
    id: "ewe-telekom-gfnw-v-37-25",
    docket: "ewe-telekom-gfnw-v-37-25",
    az: "V-37/25",
    institution: "Telekom Deutschland GmbH / EWE Aktiengesellschaft",
    date: "2026-03-26",
    title: "Einstellung",
    sourceUrl:
      "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Kartellverbot/2026/V-37-25.pdf?__blob=publicationFile&v=4",
    pdfId: "V-37-25.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function bkartaEntscheidungenDir(): string {
  if (env("BKARTA_ENTSCHEIDUNGEN_DIR")) return resolve(env("BKARTA_ENTSCHEIDUNGEN_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/bkarta-entscheidungen"));
}

export function snapshotPath(): string {
  return join(bkartaEntscheidungenDir(), "snapshot.json");
}

export function compactForMatch(text: string): string {
  return text.replace(/-\s+/g, "").replace(/\s+/g, " ").trim();
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

const DE_MONTHS: Record<string, string> = {
  januar: "01",
  february: "02",
  februar: "02",
  march: "03",
  märz: "03",
  marz: "03",
  april: "04",
  may: "05",
  mai: "05",
  june: "06",
  juni: "06",
  july: "07",
  juli: "07",
  august: "08",
  september: "09",
  october: "10",
  oktober: "10",
  november: "11",
  december: "12",
  dezember: "12",
};

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const de = raw.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  if (de) return `${de[3]}-${de[2].padStart(2, "0")}-${de[1].padStart(2, "0")}`;
  const named = raw.match(
    /\b(\d{1,2})\.?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Januar|Februar|März|Marz|Mai|Juni|Juli|Oktober|Dezember)\s+(\d{4})\b/i,
  );
  if (named) {
    const mm = DE_MONTHS[named[2].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[1].padStart(2, "0")}` : null;
  }
  return null;
}

function blockedHost(host: string): boolean {
  return (
    host === "govdata.de" ||
    host === "www.govdata.de" ||
    host === "gov.uk" ||
    host === "www.gov.uk" ||
    host === "assets.publishing.service.gov.uk" ||
    host === "ico.org.uk" ||
    host === "www.ico.org.uk" ||
    host === "acm.nl" ||
    host === "www.acm.nl" ||
    host === "assets.ccpc.ie" ||
    host === "www.ccpc.ie" ||
    host === "ccpc.ie" ||
    host === "primis.phmsa.dot.gov" ||
    host === "www.primis.phmsa.dot.gov" ||
    host === "web.archive.org" ||
    host === "data.gov.ie" ||
    host === "www.data.gov.ie"
  );
}

function filenameFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return decodeURIComponent(parts.at(-1) ?? "");
}

export function officialBkartaPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (/\/Fallberichte\//i.test(path)) return null;
    if (/\/Meldung\//i.test(path)) return null;
    if (/\.html?$/i.test(path)) return null;
    const media = path.match(MEDIA_RE);
    if (!media) return null;
    const klass = media[1];
    const file = media[2];
    if (!DECISION_CLASS.test(klass)) return null;
    const year = path.match(/\/Entscheidungen\/[^/]+\/(\d{4})\//);
    const rest = year ? `${klass}/${year[1]}/${file}` : `${klass}/${file}`;
    const version = parsed.searchParams.get("v");
    const qs = version ? `?__blob=publicationFile&v=${version}` : "?__blob=publicationFile";
    return `${PDF_ORIGIN}/SharedDocs/Entscheidung/DE/Entscheidungen/${rest}${qs}`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialBkartaPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = decodeURIComponent(parsed.pathname).match(MEDIA_RE);
    return media ? filenameFromPath(media[2]) : null;
  } catch {
    return null;
  }
}

export function slugFromUrl(url: string): string {
  const pdfId = pdfIdFromUrl(url) || "";
  if (FILENAME_DOCKET[pdfId]) return FILENAME_DOCKET[pdfId];
  return pdfId.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "unknown";
}

export function normalizeAz(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/\b(?:Az\.?:?\s*)?(B)\s*(\d+)\s*[-–]\s*(\d+)\s*\/\s*(\d{2})\b/i);
  if (m) return `B${m[2]}-${m[3]}/${m[4]}`;
  const v = raw.trim().match(/\b(?:Az\.?:?\s*)?(V)\s*[-–]\s*(\d+)\s*\/\s*(\d{2})\b/i);
  if (v) return `V-${v[2]}/${v[3]}`;
  return null;
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (FILENAME_DOCKET[trimmed]) return FILENAME_DOCKET[trimmed];
  const az = normalizeAz(trimmed);
  if (az && AZ_DOCKET[az]) return AZ_DOCKET[az];
  if (DOCKET_BARE_RE.test(trimmed) && !/\s/.test(trimmed)) return trimmed;
  return null;
}

export function isPeopleRow(row: BkartaListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isFallberichtRow(row: BkartaListingRow): boolean {
  return /fallbericht/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isPressRow(row: BkartaListingRow): boolean {
  return /pressemitteilung|press teaser|\/Meldung\//i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isCardRow(row: BkartaListingRow): boolean {
  return /entscheidungsdatenbank|\.html/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isGovdataRow(row: BkartaListingRow): boolean {
  return /govdata/i.test(`${row.sourceUrl ?? ""} ${row.title ?? ""}`);
}

export function isGovUkRow(row: BkartaListingRow): boolean {
  return /gov\.uk/i.test(`${row.sourceUrl ?? ""} ${row.title ?? ""}`);
}

export function isInstitutionEntscheidungRow(row: BkartaListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (isFallberichtRow(row)) return false;
  if (isPressRow(row)) return false;
  if (isCardRow(row)) return false;
  if (isGovdataRow(row)) return false;
  if (isGovUkRow(row)) return false;
  if (!officialBkartaPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`;
  if (KILL_TITLE_RE.test(kind)) return false;
  return true;
}

export function parseListingRows(rows: BkartaListingRow[]): BkartaListing[] {
  const found: BkartaListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionEntscheidungRow(row)) continue;
    const sourceUrl = officialBkartaPdfUrl(row.sourceUrl ?? "");
    const pdfId = (row.pdfId ?? "").trim() || pdfIdFromUrl(sourceUrl ?? "") || "";
    const docket = normalizeDocket(row.docket) || slugFromUrl(sourceUrl ?? "");
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: normalizeDocket(row.docket) || docket,
      docket,
      az: normalizeAz(row.az) || normalizeAz(row.docket) || normalizeAz(pdfId) || "",
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: TITLE_BY_DOCKET[docket] || (row.title ?? "").trim() || "Entscheidung",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): BkartaListing[] {
  const rows: BkartaListingRow[] = [];
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of links) {
    const href = m[1].startsWith("http") ? m[1] : `${PDF_ORIGIN}${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (!officialBkartaPdfUrl(href)) continue;
    const title = stripTags(m[2]);
    const docket = slugFromUrl(href);
    rows.push({
      institution:
        title.replace(/\s+(Verfügung|Verpflichtungszusagen|Freigabe|Untersagung|Einstellung|Az).*$/i, "").trim() || title,
      date: isoDate(title) || undefined,
      title: TITLE_BY_DOCKET[docket] || "Entscheidung",
      type: "entscheidung",
      sourceUrl: href,
      pdfId: pdfIdFromUrl(href) ?? "",
      docket,
      az: normalizeAz(title) ?? undefined,
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ Az \/ date \/ official PDF URL/i.test(text)) return true;
  if (/Entscheidungsdatenbank card/i.test(text) && !/In dem Verwaltungsverfahren/i.test(text)) return true;
  return false;
}

export function isFallberichtDump(text: string): boolean {
  if (/Fallbericht/i.test(text) && !/In dem Verwaltungsverfahren/i.test(text)) return true;
  return false;
}

export function isPressDump(text: string): boolean {
  if (/Pressemitteilung/i.test(text) && !/In dem Verwaltungsverfahren/i.test(text)) return true;
  if (/59 Mio\. Euro wirtschaftlichen Vorteils/i.test(text) && !/Price Error Prevention|AP-FOD|SC-FOD/i.test(text)) {
    return true;
  }
  return false;
}

export function isPeopleDump(text: string): boolean {
  if (/people-only BKartA|named-seller SKU|people-fine/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isGovdataDump(text: string): boolean {
  return /govdata\.de/i.test(text);
}

export function isGovUkDump(text: string): boolean {
  return /gov\.uk/i.test(text) && !/bundeskartellamt/i.test(text);
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

export function isRealBkartaBody(text: string): boolean {
  if (
    isIndexTeaserDump(text) ||
    isFallberichtDump(text) ||
    isPressDump(text) ||
    isPeopleDump(text) ||
    isGovdataDump(text) ||
    isGovUkDump(text) ||
    isIcoMpnDump(text) ||
    isPhmsaCopDump(text) ||
    isAcmBesluitDump(text) ||
    isCcpcMergerDump(text)
  ) {
    return false;
  }
  const compact = compactForMatch(text);
  if (compact.length < 2000) return false;
  if (/RECORD OF DECISION/i.test(text) && /DECLARATION/i.test(text) && /\b(CERCLA|Superfund)\b/i.test(text)) {
    return false;
  }
  if (/Center for Devices and Radiological Health/i.test(text) && /De Novo request/i.test(text)) return false;
  const amt = /Bundeskartellamt|Beschlussabteilung/i.test(compact);
  const kind = /Beschluss|Verfügung|Verfuegung/i.test(compact);
  const gwb = /\bGWB\b/.test(compact);
  const az = /\b(?:B\s*\d+|V)\s*[-–]\s*\d+\s*\/\s*\d{2}\b/i.test(compact);
  const tenor = /beschlossen/i.test(compact);
  const proceeding = /In dem Verwaltungsverfahren/i.test(compact);
  return amt && kind && gwb && az && tenor && proceeding;
}

export function parseBkartaText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    docket?: string | null;
    az?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): BkartaCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialBkartaPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(meta.id) || slugFromUrl(sourceUrl);
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || `${docket}.pdf`;
  const az = normalizeAz(meta.az) || normalizeAz(meta.docket) || normalizeAz(body.slice(0, 2500)) || "";
  return {
    id: meta.id && normalizeDocket(meta.id) ? normalizeDocket(meta.id)! : docket,
    docket,
    az,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 4000)),
    title: TITLE_BY_DOCKET[docket] || meta.title || "Entscheidung",
    sourceUrl,
    body,
  };
}

export function emptyBkartaSnapshot(reason: string): BkartaSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/SharedDocs/Entscheidung/DE/Entscheidungen/` },
    cards: [],
  };
}

export function assembleBkartaSnapshot(cards: BkartaCard[], fetchedAt = new Date().toISOString()): BkartaSnapshot {
  const withBody = cards
    .filter((c) => isRealBkartaBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official BKartA Entscheidung PDFs had no extractable Beschluss text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/SharedDocs/Entscheidung/DE/Entscheidungen/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): BkartaSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as BkartaSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readBkartaSnapshot(): BkartaSnapshot | null {
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

export function writeBkartaSnapshot(snap: BkartaSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchBkartaBytes(url: string): Promise<Uint8Array> {
  const official = officialBkartaPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("BKARTA_ENTSCHEIDUNGEN_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("BKARTA_ENTSCHEIDUNGEN_JSON_DIR") || env("BKARTA_ENTSCHEIDUNGEN_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("BKARTA_ENTSCHEIDUNGEN_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("BKARTA_ENTSCHEIDUNGEN_MAX_FETCH", "8"));
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

async function loadOfficialListings(dir: string): Promise<{ listed: BkartaListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as BkartaListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialText(row: BkartaListing, cacheDir: string, fetched: { n: number }): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.docket));
  if (!existsSync(pdfFile)) {
    writeFileSync(pdfFile, await fetchBkartaBytes(row.sourceUrl));
    fetched.n += 1;
  }
  return pdfToText(pdfFile);
}

export async function collectBkartaEntscheidungen(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<BkartaSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = bkartaEntscheidungenDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, BkartaCard>();
  for (const card of readBkartaSnapshot()?.cards ?? []) {
    if (isRealBkartaBody(card.body)) prior.set(card.id, card);
  }
  const cards: BkartaCard[] = [];
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
      const parsed = parseBkartaText(text, row);
      if (!isRealBkartaBody(parsed.body)) {
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
  const snap = { ...assembleBkartaSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeBkartaSnapshot(snap);
  return snap;
}

export async function loadBkartaEntscheidungen(): Promise<BkartaSnapshot> {
  const cached = readBkartaSnapshot();
  if (cached && cached.cards.some((c) => isRealBkartaBody(c.body))) return cached;
  try {
    return await collectBkartaEntscheidungen();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live BKartA Entscheidung fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyBkartaSnapshot(
      `BKartA Entscheidung PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildBkartaManifest(snap: BkartaSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealBkartaBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + Az + date + official PDF URL only. Entscheidung body is the paid GET /bkarta-entscheidungen payload. Not people. Not Fallbericht. Not the Entscheidungsdatenbank card. Not DE/EN press teasers. Not govdata.de. Not GOV.UK. Not ICO /ico-mpn. Not PHMSA /phmsa-cop. Not ACM /acm-besluiten. Not CCPC /ccpc-mergers. Prep only — do not list.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: BKARTA_ENTSCHEIDUNGEN_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      az: c.az,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "az", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/SharedDocs/Entscheidung/DE/Entscheidungen/` },
  };
}

export async function loadBkartaEntscheidungenManifest(): Promise<Record<string, unknown>> {
  return buildBkartaManifest(readBkartaSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectBkartaEntscheidungen()
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
              az: c.az,
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
