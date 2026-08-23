/**
 * Netherlands ACM boetebesluit / besluit TEXT door.
 * Official PDFs from acm.nl/system/files/documents/ only, via pdftotext.
 * Does not invent besluit text. Institution/company only. Not people.
 * Not the publication-page press teaser. Not jsonapi (403). Not data.overheid.nl.
 * Not named-director / “de heer A/B/C” personal-fine SKUs.
 * Not ICO /ico-mpn. Not PHMSA /phmsa-cop. Not CMA /cma-ca98.
 * Prep only — do not list on well-known / OpenAPI / llms.txt / shop catalog.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const ACM_BESLUITEN_PATH = "/acm-besluiten";
export const ACM_BESLUITEN_MANIFEST_PATH = "/acm-besluiten/manifest.json";
export const ACM_BESLUITEN_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "acm-institution-besluit-bodies";
export const PRODUCT_NAME = "ACM boetebesluit / besluit text";

export const LISTING_URL = "https://www.acm.nl/nl/publicaties?type=besluit";
export const PDF_HOST = "www.acm.nl";
export const PDF_ORIGIN = "https://www.acm.nl";
export const MEDIA_RE = /\/system\/files\/documents\/([^/?#]+\.pdf)/i;
export const DOCKET_BARE_RE = /^([a-z0-9][a-z0-9._-]{2,80})$/;
export const LICENSE = "Dutch government publication";
export const ATTRIBUTION =
  "Autoriteit Consument en Markt (ACM). Dutch government publication: copy and publish unless a work explicitly reserves copyright. ACM logo reserved — sold body is ACM-authored TEXT only.";

export const CARD_FIELDS = [
  "id",
  "docket",
  "zaak",
  "pdfId",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type AcmBesluitenListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  zaak?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type AcmBesluitenListing = {
  id: string;
  docket: string;
  zaak: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type AcmBesluitenCard = {
  id: string;
  docket: string;
  zaak: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type AcmBesluitenSnapshot = {
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
  cards: AcmBesluitenCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (ACM besluit texts; +https://www.acm.nl/)";
const OFFICIAL_HOSTS = new Set(["acm.nl", "www.acm.nl"]);
const ENTITY_RE =
  /\b(B\.V\.?|N\.V\.?|BV|NV|V\.O\.F\.|VOF|C\.V\.|CV|gemeente|Inc\.?|LLC|L\.L\.C\.|Ltd\.?|Limited|Corp\.?|Corporation|Company|Co\.|GmbH|plc|PLC|Plc)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const DE_HEER_RE = /\bde heer\b/i;
const BESLUIT_TITLE_RE = /boetebesluit|handhavingsbesluit|afwijzing|besluit/i;
const KILL_TITLE_RE =
  /toezegging|consultatie|concentratiebesluit|woo[- ]besluit|\bnieuws\b|press teaser|jsonapi|data\.overheid/i;

const FILENAME_DOCKET: Record<string, string> = {
  "boetebesluit-house-of-tickets.pdf": "house-of-tickets-201019",
  "openbare-versie-afwijzing-handhavingsverzoek-skcompany-acm.pdf": "sk-jura-bol-198871",
  "boetebesluit-aanbesteding-gemeente-ommen.pdf": "ommen-gww-196956",
  "boetebesluit-gt-ecom.pdf": "gt-ecom-193961",
  "handhavingsbesluit-tegen-energie-exploitatie-detrip-acm.pdf": "eetrip-191276",
};

const ZAAK_DOCKET: Record<string, string> = {
  "ACM/26/201019": "house-of-tickets-201019",
  "ACM/25/198871": "sk-jura-bol-198871",
  "ACM/25/196956": "ommen-gww-196956",
  "ACM/25/193961": "gt-ecom-193961",
  "ACM/24/191276": "eetrip-191276",
};

export const SEED_LISTINGS: AcmBesluitenListing[] = [
  {
    id: "house-of-tickets-201019",
    docket: "house-of-tickets-201019",
    zaak: "ACM/26/201019",
    institution: "House of Tickets B.V. / Ticketveiling B.V.",
    date: "2026-05-22",
    title: "Boetebesluit",
    sourceUrl: "https://www.acm.nl/system/files/documents/boetebesluit-house-of-tickets.pdf",
    pdfId: "boetebesluit-house-of-tickets.pdf",
  },
  {
    id: "sk-jura-bol-198871",
    docket: "sk-jura-bol-198871",
    zaak: "ACM/25/198871",
    institution: "SK Company B.V. / Jura Nederland B.V. / bol.com B.V.",
    date: "2026-03-19",
    title: "Afwijzing handhavingsverzoek",
    sourceUrl: "https://www.acm.nl/system/files/documents/openbare-versie-afwijzing-handhavingsverzoek-skcompany-acm.pdf",
    pdfId: "openbare-versie-afwijzing-handhavingsverzoek-skcompany-acm.pdf",
  },
  {
    id: "ommen-gww-196956",
    docket: "ommen-gww-196956",
    zaak: "ACM/25/196956",
    institution:
      "Bouwhuis Aannemingsmaatschappij “Bouwmij” B.V. / Timmerhuis Weg & Waterbouw B.V. / Aannemingsmaatschappij Van Gelder B.V.",
    date: "2026-05-28",
    title: "Boetebesluit",
    sourceUrl: "https://www.acm.nl/system/files/documents/boetebesluit-aanbesteding-gemeente-ommen.pdf",
    pdfId: "boetebesluit-aanbesteding-gemeente-ommen.pdf",
  },
  {
    id: "gt-ecom-193961",
    docket: "gt-ecom-193961",
    zaak: "ACM/25/193961",
    institution: "GT Ecom B.V.",
    date: "2025-05-02",
    title: "Boetebesluit",
    sourceUrl: "https://www.acm.nl/system/files/documents/boetebesluit-gt-ecom.pdf",
    pdfId: "boetebesluit-gt-ecom.pdf",
  },
  {
    id: "eetrip-191276",
    docket: "eetrip-191276",
    zaak: "ACM/24/191276",
    institution: "Energie Exploitatie De Trip B.V.",
    date: "2025-09-23",
    title: "Handhavingsbesluit",
    sourceUrl: "https://www.acm.nl/system/files/documents/handhavingsbesluit-tegen-energie-exploitatie-detrip-acm.pdf",
    pdfId: "handhavingsbesluit-tegen-energie-exploitatie-detrip-acm.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function acmBesluitenDir(): string {
  if (env("ACM_BESLUITEN_DIR")) return resolve(env("ACM_BESLUITEN_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/acm-besluiten"));
}

export function snapshotPath(): string {
  return join(acmBesluitenDir(), "snapshot.json");
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
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(\d{1,2}),?\s+(\d{4})\b/i,
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
      januari: "01",
      februari: "02",
      maart: "03",
      mei: "05",
      juni: "06",
      juli: "07",
      augustus: "08",
      oktober: "10",
    };
    const mm = months[named[1].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
  }
  const dutch = raw.match(
    /\b(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(\d{4})\b/i,
  );
  if (dutch) {
    const months: Record<string, string> = {
      januari: "01",
      februari: "02",
      maart: "03",
      april: "04",
      mei: "05",
      juni: "06",
      juli: "07",
      augustus: "08",
      september: "09",
      oktober: "10",
      november: "11",
      december: "12",
    };
    const mm = months[dutch[2].toLowerCase()];
    return mm ? `${dutch[3]}-${mm}-${dutch[1].padStart(2, "0")}` : null;
  }
  return null;
}

function blockedHost(host: string): boolean {
  return (
    host === "data.overheid.nl" ||
    host === "www.data.overheid.nl" ||
    host === "overheid.nl" ||
    host === "web.archive.org" ||
    host === "ico.org.uk" ||
    host === "www.ico.org.uk" ||
    host === "assets.publishing.service.gov.uk" ||
    host === "www.gov.uk" ||
    host === "gov.uk" ||
    host === "primis.phmsa.dot.gov" ||
    host === "www.primis.phmsa.dot.gov" ||
    host === "federalregister.gov" ||
    host === "www.federalregister.gov"
  );
}

export function officialAcmBesluitPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    if (/\/jsonapi\//i.test(parsed.pathname)) return null;
    if (/\/nl\/publicaties\//i.test(parsed.pathname) && !/\.pdf$/i.test(parsed.pathname)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (!/\.pdf$/i.test(path)) return null;
    const media = path.match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
    if (!media) return null;
    if (/boetebesluit-580034/i.test(media[1])) return null;
    return `${PDF_ORIGIN}/system/files/documents/${media[1]}`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialAcmBesluitPdfUrl(url) || url || "";
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
  return pdfId.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (FILENAME_DOCKET[trimmed]) return FILENAME_DOCKET[trimmed];
  if (ZAAK_DOCKET[trimmed]) return ZAAK_DOCKET[trimmed];
  if (DOCKET_BARE_RE.test(trimmed) && !/\s/.test(trimmed)) return trimmed;
  return null;
}

export function normalizeZaak(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/\bACM\/\d{2}\/\d+\b/i);
  return m ? m[0].toUpperCase().replace("ACM/", "ACM/") : null;
}

export function isPeopleRow(row: AcmBesluitenListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (DE_HEER_RE.test(name)) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isPressTeaserRow(row: AcmBesluitenListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`;
  if (/\/nl\/publicaties\//i.test(kind) && !officialAcmBesluitPdfUrl(row.sourceUrl ?? "")) return true;
  if (/\bnieuws\b|press teaser/i.test(kind) && !officialAcmBesluitPdfUrl(row.sourceUrl ?? "")) return true;
  return false;
}

export function isCommitmentRow(row: AcmBesluitenListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.docket ?? ""}`;
  return /toezegging|consultatie/i.test(kind);
}

export function isJsonapiRow(row: AcmBesluitenListingRow): boolean {
  return /jsonapi/i.test(`${row.title ?? ""} ${row.sourceUrl ?? ""} ${row.docket ?? ""}`);
}

export function isOverheidRow(row: AcmBesluitenListingRow): boolean {
  return /data\.overheid\.nl/i.test(`${row.sourceUrl ?? ""} ${row.title ?? ""}`);
}

export function isInstitutionBesluitRow(row: AcmBesluitenListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (isPressTeaserRow(row)) return false;
  if (isCommitmentRow(row)) return false;
  if (isJsonapiRow(row)) return false;
  if (isOverheidRow(row)) return false;
  if (!officialAcmBesluitPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`;
  if (KILL_TITLE_RE.test(kind)) return false;
  if (!BESLUIT_TITLE_RE.test(kind)) return false;
  return true;
}

export function parseListingRows(rows: AcmBesluitenListingRow[]): AcmBesluitenListing[] {
  const found: AcmBesluitenListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionBesluitRow(row)) continue;
    const sourceUrl = officialAcmBesluitPdfUrl(row.sourceUrl ?? "");
    const pdfId = (row.pdfId ?? "").trim() || pdfIdFromUrl(sourceUrl ?? "") || "";
    const docket = normalizeDocket(row.docket) || slugFromUrl(sourceUrl ?? "");
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    const title = (row.title ?? "").trim();
    found.push({
      id: normalizeDocket(row.docket) || docket,
      docket,
      zaak: normalizeZaak(row.zaak) || normalizeZaak(row.docket) || "",
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: title || "Besluit",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): AcmBesluitenListing[] {
  const rows: AcmBesluitenListingRow[] = [];
  const links = [
    ...html.matchAll(
      /(?:(\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4}|\d{4}-\d{2}-\d{2})[\s\S]{0,240}?)?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];
  for (const m of links) {
    const href = m[2].startsWith("http") ? m[2] : `${PDF_ORIGIN}${m[2].startsWith("/") ? "" : "/"}${m[2]}`;
    if (!officialAcmBesluitPdfUrl(href)) continue;
    const title = stripTags(m[3]);
    const docket = slugFromUrl(href);
    rows.push({
      institution: title.replace(/\s+(Boetebesluit|Handhavingsbesluit|Afwijzing|Besluit).*$/i, "").trim() || title,
      date: m[1] || undefined,
      title: BESLUIT_TITLE_RE.test(title)
        ? title.replace(/^.*?\b(Boetebesluit|Handhavingsbesluit|Afwijzing|Besluit).*$/i, "$1").trim() || title
        : title,
      type: /boetebesluit/i.test(title) ? "boetebesluit" : /handhavingsbesluit/i.test(title) ? "handhavingsbesluit" : "besluit",
      sourceUrl: href,
      pdfId: pdfIdFromUrl(href) ?? "",
      docket,
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ zaak \/ date \/ PDF URL/i.test(text)) return true;
  if (/ACM press teaser|publication-page press teaser/i.test(text)) return true;
  if (/INSTRUCTIONS/i.test(text) && !/\bBesluit\b/i.test(text)) return true;
  return false;
}

export function isFederalRegisterDump(text: string): boolean {
  return /"raw_text"/.test(text) || /"full_text"/.test(text) || /federalregister\.gov/i.test(text);
}

export function isPeopleDump(text: string): boolean {
  if (/people-only ACM|people-only CFTC/i.test(text)) return true;
  if (DE_HEER_RE.test(text) && /geboren op/i.test(text) && !ENTITY_RE.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isJsonapiDump(text: string): boolean {
  return /"jsonapi"|\/jsonapi\//i.test(text) && !/\bBesluit van de Autoriteit Consument en Markt\b/i.test(text);
}

export function isOverheidDump(text: string): boolean {
  return /data\.overheid\.nl/i.test(text);
}

export function isCommitmentDump(text: string): boolean {
  if (/toezegging|consultatie/i.test(text) && !/boetebesluit|handhavingsbesluit|afwijzing handhavingsverzoek/i.test(text)) {
    return true;
  }
  return false;
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

export function isGovUkDump(text: string): boolean {
  return /assets\.publishing\.service\.gov\.uk|\bGOV\.UK\b|Crown copyright/i.test(text);
}

export function isRealAcmBesluitBody(text: string): boolean {
  if (
    isIndexTeaserDump(text) ||
    isFederalRegisterDump(text) ||
    isPeopleDump(text) ||
    isJsonapiDump(text) ||
    isOverheidDump(text) ||
    isCommitmentDump(text) ||
    isIcoMpnDump(text) ||
    isPhmsaCopDump(text) ||
    isGovUkDump(text)
  ) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 1500) return false;
  if (/auteursrecht voorbehouden/i.test(text)) return false;
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
  const acm = /Autoriteit Consument en Markt|\bACM\b/i.test(text);
  const besluit = /\bBesluit\b/i.test(text);
  const official = /Zaaknummer|Ons kenmerk|ACM\/\d{2}\/\d+|ACM\/UIT\//i.test(text);
  const statute =
    /Mededingingswet|Wet handhaving consumentenbescherming|\bWhc\b|Warmtewet|artikel 8\.8|artikel 6 Mw|Prijzenwet/i.test(
      text,
    );
  return acm && besluit && official && statute;
}

export function parseAcmBesluitText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    docket?: string | null;
    zaak?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): AcmBesluitenCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialAcmBesluitPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(meta.id) || slugFromUrl(sourceUrl);
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || `${docket}.pdf`;
  const title = (meta.title ?? "").trim();
  const zaak =
    normalizeZaak(meta.zaak) ||
    normalizeZaak(body.slice(0, 2500)) ||
    "";
  return {
    id: meta.id && normalizeDocket(meta.id) ? normalizeDocket(meta.id)! : docket,
    docket,
    zaak,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 4000)),
    title: title || "Besluit",
    sourceUrl,
    body,
  };
}

export function emptyAcmBesluitenSnapshot(reason: string): AcmBesluitenSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/system/files/documents/` },
    cards: [],
  };
}

export function assembleAcmBesluitenSnapshot(
  cards: AcmBesluitenCard[],
  fetchedAt = new Date().toISOString(),
): AcmBesluitenSnapshot {
  const withBody = cards
    .filter((c) => isRealAcmBesluitBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official ACM besluit PDFs had no extractable besluit text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/system/files/documents/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): AcmBesluitenSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as AcmBesluitenSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readAcmBesluitenSnapshot(): AcmBesluitenSnapshot | null {
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

export function writeAcmBesluitenSnapshot(snap: AcmBesluitenSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchAcmBesluitBytes(url: string): Promise<Uint8Array> {
  const official = officialAcmBesluitPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("ACM_BESLUITEN_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("ACM_BESLUITEN_JSON_DIR") || env("ACM_BESLUITEN_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("ACM_BESLUITEN_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("ACM_BESLUITEN_MAX_FETCH", "8"));
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

async function loadOfficialListings(dir: string): Promise<{ listed: AcmBesluitenListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as AcmBesluitenListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialText(row: AcmBesluitenListing, cacheDir: string, fetched: { n: number }): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.docket));
  if (!existsSync(pdfFile)) {
    writeFileSync(pdfFile, await fetchAcmBesluitBytes(row.sourceUrl));
    fetched.n += 1;
  }
  return pdfToText(pdfFile);
}

export async function collectAcmBesluiten(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<AcmBesluitenSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = acmBesluitenDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, AcmBesluitenCard>();
  for (const card of readAcmBesluitenSnapshot()?.cards ?? []) {
    if (isRealAcmBesluitBody(card.body)) prior.set(card.id, card);
  }
  const cards: AcmBesluitenCard[] = [];
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
      const parsed = parseAcmBesluitText(text, row);
      if (!isRealAcmBesluitBody(parsed.body)) {
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
  const snap = { ...assembleAcmBesluitenSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeAcmBesluitenSnapshot(snap);
  return snap;
}

export async function loadAcmBesluiten(): Promise<AcmBesluitenSnapshot> {
  const cached = readAcmBesluitenSnapshot();
  if (cached && cached.cards.some((c) => isRealAcmBesluitBody(c.body))) return cached;
  try {
    return await collectAcmBesluiten();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live ACM besluit fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyAcmBesluitenSnapshot(
      `ACM besluit PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildAcmBesluitenManifest(snap: AcmBesluitenSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealAcmBesluitBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + zaak + date + official PDF URL only. Besluit body is the paid GET /acm-besluiten payload. Not people. Not the publication-page press teaser. Not jsonapi. Not data.overheid.nl. Not ICO /ico-mpn. Not PHMSA /phmsa-cop. Prep only — do not list.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: ACM_BESLUITEN_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      zaak: c.zaak,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "zaak", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/system/files/documents/` },
  };
}

export async function loadAcmBesluitenManifest(): Promise<Record<string, unknown>> {
  return buildAcmBesluitenManifest(readAcmBesluitenSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectAcmBesluiten()
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
              zaak: c.zaak,
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
