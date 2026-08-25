/**
 * ICO Monetary Penalty Notice TEXT door.
 * Official MPN PDFs from ico.org.uk only.
 * Does not invent notice text. Institution/company only. Not people. Not the press teaser.
 * Not Superfund /superfund-rods. Not AIR /air-letters. Not TTB /ttb-oic.
 * Not De Novo /denovo-orders. Not FIFRA /fifra-orders. Not CFTC /cftc-orders.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const ICO_MPN_PATH = "/ico-mpn";
export const ICO_MPN_MANIFEST_PATH = "/ico-mpn/manifest.json";
export const ICO_MPN_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "ico-institution-mpn-bodies";
export const PRODUCT_NAME = "ICO Monetary Penalty Notice text";

export const LISTING_URL = "https://ico.org.uk/action-weve-taken/enforcement/?type=monetary-penalties";
/** JS filter page is the press/teaser. Official per-notice pages + sitemap have the PDFs. */
export const SITEMAP_URL = "https://ico.org.uk/sitemap.xml";
export const RECOVER_FINES_URL = "https://ico.org.uk/action-weve-taken/the-icos-work-to-recover-fines/";
export const ENFORCEMENT_PAGE_RE = /\/action-weve-taken\/enforcement\/(\d{4})\/(\d{2})\/([a-z0-9][a-z0-9._-]{2,120})\/?/i;
export const PDF_HOST = "ico.org.uk";
export const PDF_ORIGIN = "https://ico.org.uk";
export const DOCKET_BARE_RE = /^([a-z0-9][a-z0-9._-]{2,80})$/;
export const MEDIA_RE = /\/media2\/([a-z0-9]+)\/([^/?#]+\.pdf)/i;
export const MPN_PDF_RE = /(?:monetary[- ]?penalty(?:[- ]notice)?|penalty[- ]notice|\bmpn\b)/i;
export const LICENSE = "OGL v3.0";
export const ATTRIBUTION =
  "Information Commissioner's Office, licensed under the Open Government Licence v3.0";

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

export type IcoMpnListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type IcoMpnListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type IcoMpnCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type IcoMpnSnapshot = {
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
  cards: IcoMpnCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (ICO MPN texts; +https://ico.org.uk/action-weve-taken/the-icos-work-to-recover-fines/)";
const OFFICIAL_HOSTS = new Set(["ico.org.uk", "www.ico.org.uk"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.L\.P\.|LLP|L\.P\.|LP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|PLC|Plc|plc|AI)\b/;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;

const FILENAME_DOCKET: Record<string, string> = {
  "reddit-mpn-20260223.pdf": "reddit-mpn-20260223",
  "medialab-penalty-notice-20260204.pdf": "medialab-20260204",
  "lastpass-uk-ltd-penalty-notice.pdf": "lastpass-uk-ltd",
  "capita-plc-and-cpsl-monetary-penalty-notice.pdf": "capita-plc",
  "south-staffordshire-plc-and-south-staffordshire-water-plc-monetary-penalty-notice.pdf":
    "south-staffordshire-plc",
};

export const SEED_LISTINGS: IcoMpnListing[] = [
  {
    id: "reddit-mpn-20260223",
    docket: "reddit-mpn-20260223",
    institution: "Reddit, Inc.",
    date: "2026-02-23",
    title: "Monetary Penalty Notice",
    sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
    pdfId: "reddit-mpn-20260223.pdf",
  },
  {
    id: "medialab-20260204",
    docket: "medialab-20260204",
    institution: "MediaLab.AI, Inc.",
    date: "2026-02-04",
    title: "Monetary Penalty Notice",
    sourceUrl: "https://ico.org.uk/media2/bghpp40j/medialab-penalty-notice-20260204.pdf",
    pdfId: "medialab-penalty-notice-20260204.pdf",
  },
  {
    id: "lastpass-uk-ltd",
    docket: "lastpass-uk-ltd",
    institution: "LastPass UK Ltd",
    date: "2025-11-20",
    title: "Monetary Penalty Notice",
    sourceUrl: "https://ico.org.uk/media2/xfbl1uaa/lastpass-uk-ltd-penalty-notice.pdf",
    pdfId: "lastpass-uk-ltd-penalty-notice.pdf",
  },
  {
    id: "capita-plc",
    docket: "capita-plc",
    institution: "Capita plc and Capita Pension Solutions Limited",
    date: "2025-10-15",
    title: "Monetary Penalty Notice",
    sourceUrl: "https://ico.org.uk/media2/pv5nhks4/capita-plc-and-cpsl-monetary-penalty-notice.pdf",
    pdfId: "capita-plc-and-cpsl-monetary-penalty-notice.pdf",
  },
  {
    id: "south-staffordshire-plc",
    docket: "south-staffordshire-plc",
    institution: "South Staffordshire Plc and South Staffordshire Water Plc",
    date: "2026-05-07",
    title: "Monetary Penalty Notice",
    sourceUrl:
      "https://ico.org.uk/media2/xdrfahsw/south-staffordshire-plc-and-south-staffordshire-water-plc-monetary-penalty-notice.pdf",
    pdfId: "south-staffordshire-plc-and-south-staffordshire-water-plc-monetary-penalty-notice.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function icoMpnDir(): string {
  if (env("ICO_MPN_DIR")) return resolve(env("ICO_MPN_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ico-mpn"));
}

export function snapshotPath(): string {
  return join(icoMpnDir(), "snapshot.json");
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
  const ukNamed = raw.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
  );
  if (ukNamed) {
    const mm = MONTHS[ukNamed[2].toLowerCase()];
    return mm ? `${ukNamed[3]}-${mm}-${ukNamed[1].padStart(2, "0")}` : null;
  }
  const named = raw.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (named) {
    const mm = MONTHS[named[1].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
  }
  const slash = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const y = slash[3];
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1) return null;
    if (a > 12 && b <= 12) return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    if (b > 12 && a <= 12) return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  }
  return null;
}

export function officialIcoMpnPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org" || host === "federalregister.gov" || host === "www.federalregister.gov") {
      return null;
    }
    if (!OFFICIAL_HOSTS.has(host)) return null;
    if (/\/about-the-ico\/media-centre\//i.test(parsed.pathname)) return null;
    const media = decodeURIComponent(parsed.pathname).match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
    if (!media) return null;
    return `${PDF_ORIGIN}/media2/${media[1]}/${media[2]}`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialIcoMpnPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = parsed.pathname.match(MEDIA_RE);
    return media ? media[2] : null;
  } catch {
    return null;
  }
}

export function slugFromUrl(url: string): string {
  const pdfId = pdfIdFromUrl(url) || "";
  if (FILENAME_DOCKET[pdfId]) return FILENAME_DOCKET[pdfId];
  return pdfId.replace(/\.pdf$/i, "") || "unknown";
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (FILENAME_DOCKET[trimmed]) return FILENAME_DOCKET[trimmed];
  if (DOCKET_BARE_RE.test(trimmed) && !/\s/.test(trimmed)) return trimmed;
  return null;
}

export function isPeopleRow(row: IcoMpnListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isPressTeaserRow(row: IcoMpnListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`;
  if (/media-centre\/news-and-blogs/i.test(kind)) return true;
  if (/\bNews\b/i.test(kind) && !officialIcoMpnPdfUrl(row.sourceUrl ?? "")) return true;
  return false;
}

export function isInstitutionOrderRow(row: IcoMpnListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (isPressTeaserRow(row)) return false;
  if (!officialIcoMpnPdfUrl(row.sourceUrl ?? "")) return false;
  return true;
}

export function parseListingRows(rows: IcoMpnListingRow[]): IcoMpnListing[] {
  const found: IcoMpnListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const sourceUrl = officialIcoMpnPdfUrl(row.sourceUrl ?? "");
    const pdfId = (row.pdfId ?? "").trim() || pdfIdFromUrl(sourceUrl ?? "") || "";
    const docket = normalizeDocket(row.docket) || slugFromUrl(sourceUrl ?? "");
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: normalizeDocket(row.docket) || docket,
      docket,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: "Monetary Penalty Notice",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): IcoMpnListing[] {
  const rows: IcoMpnListingRow[] = [];
  const links = [
    ...html.matchAll(
      /(?:(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})[\s\S]{0,240}?)?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];
  for (const m of links) {
    const href = m[2].startsWith("http") ? m[2] : `${PDF_ORIGIN}${m[2].startsWith("/") ? "" : "/"}${m[2]}`;
    if (!officialIcoMpnPdfUrl(href)) continue;
    const title = stripTags(m[3]);
    rows.push({
      institution: title.replace(/\s+Monetary Penalty Notice.*$/i, "").trim(),
      date: m[1] || undefined,
      title: "Monetary Penalty Notice",
      sourceUrl: href,
      pdfId: pdfIdFromUrl(href) ?? "",
      docket: slugFromUrl(href),
    });
  }
  rows.push(...noticePagePdfRows(html));
  return parseListingRows(rows);
}

export function officialEnforcementPageUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (!OFFICIAL_HOSTS.has(host)) return null;
    if (/\/about-the-ico\/media-centre\//i.test(parsed.pathname)) return null;
    const m = parsed.pathname.match(ENFORCEMENT_PAGE_RE);
    if (!m) return null;
    return `${PDF_ORIGIN}/action-weve-taken/enforcement/${m[1]}/${m[2]}/${m[3].toLowerCase()}/`;
  } catch {
    return null;
  }
}

export function enforcementPageSlug(urlOrPath: string | null | undefined): string | null {
  const official = officialEnforcementPageUrl(urlOrPath);
  if (!official) return null;
  const m = official.match(ENFORCEMENT_PAGE_RE);
  return m ? m[3].toLowerCase() : null;
}

export function isMpnPdfFilename(urlOrName: string | null | undefined): boolean {
  const name = (urlOrName ?? "").split("/").pop() ?? "";
  if (!/\.pdf$/i.test(name)) return false;
  if (/enforcement[- ]notice|reprimand|prosecution|proceeds[- ]of[- ]crime/i.test(name)) return false;
  return MPN_PDF_RE.test(name);
}

export function isNonMpnEnforcementSlug(slug: string | null | undefined): boolean {
  const s = (slug ?? "").toLowerCase();
  if (!s) return true;
  if (/-(?:en|enforcement-notice|reprimand)(?:-\d+)?$/.test(s)) return true;
  if (/proceeds-of-crime|prosecution/.test(s)) return true;
  return false;
}

export function isPeopleSlug(slug: string | null | undefined): boolean {
  const s = (slug ?? "").toLowerCase();
  if (!s) return true;
  if (/(?:ltd|limited|plc|inc|llc|llp|corp|company|consultancy|services|group|university|council|authority|bank|trust)\b/.test(s)) {
    return false;
  }
  if (/-mpn$|-monetary-penalty-notice$/.test(s)) return false;
  return /^[a-z]+(?:-[a-z]+){1,3}$/.test(s) && !/trading-as/.test(s);
}

export function isCandidateEnforcementPage(url: string | null | undefined): boolean {
  const official = officialEnforcementPageUrl(url);
  if (!official) return false;
  const slug = enforcementPageSlug(official);
  if (!slug || isNonMpnEnforcementSlug(slug)) return false;
  if (isPeopleSlug(slug) && !/-mpn$|-monetary-penalty-notice$/.test(slug)) return false;
  return true;
}

function absolutizeIcoHref(href: string): string {
  return href.startsWith("http") ? href : `${PDF_ORIGIN}${href.startsWith("/") ? "" : "/"}${href}`;
}

function noticePageDate(html: string, pageUrl?: string): string | null {
  const labeled = html.match(
    /Date of final notice[\s\S]{0,160}?(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
  );
  if (labeled) return isoDate(labeled[1]);
  const uk = html.match(
    /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})\b/i,
  );
  if (uk) return isoDate(uk[1]);
  const pageDate = (pageUrl ?? "").match(ENFORCEMENT_PAGE_RE);
  return pageDate ? `${pageDate[1]}-${pageDate[2]}-01` : null;
}

function noticePagePdfRows(html: string, pageUrl?: string): IcoMpnListingRow[] {
  const rows: IcoMpnListingRow[] = [];
  const title = stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "")
    .replace(/\s*\|\s*ICO\s*$/i, "")
    .trim();
  const h1 = stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "").trim();
  const institution = (h1 || title)
    .replace(/\s+Monetary Penalty Notice.*$/i, "")
    .replace(/\s+MPN\s*$/i, "")
    .trim();
  const date = noticePageDate(html, pageUrl);
  const hrefs = [
    ...html.matchAll(/<(?:a|further-Reading)\b[^>]+(?:href|x-href)="([^"]+)"[^>]*>/gi),
  ].map((m) => m[1]);
  const pageSlug = enforcementPageSlug(pageUrl);
  for (const raw of hrefs) {
    const href = absolutizeIcoHref(raw);
    if (!officialIcoMpnPdfUrl(href)) continue;
    if (!isMpnPdfFilename(href)) continue;
    const pdfId = pdfIdFromUrl(href) ?? "";
    const docket = FILENAME_DOCKET[pdfId] || (pageSlug && DOCKET_BARE_RE.test(pageSlug) ? pageSlug : slugFromUrl(href));
    rows.push({
      institution,
      date: date || undefined,
      title: "Monetary Penalty Notice",
      sourceUrl: href,
      pdfId,
      docket,
    });
  }
  return rows;
}

export function parseNoticePageHtml(html: string, pageUrl?: string): IcoMpnListing[] {
  const slug = enforcementPageSlug(pageUrl);
  if (slug && isNonMpnEnforcementSlug(slug)) return [];
  return parseListingRows(noticePagePdfRows(html, pageUrl));
}

export function parseSitemapXml(xml: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const loc of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    const official = officialEnforcementPageUrl(loc[1]);
    if (!official || !isCandidateEnforcementPage(official) || seen.has(official)) continue;
    seen.add(official);
    found.push(official);
  }
  found.sort((a, b) => b.localeCompare(a));
  return found;
}

export function parseRecoverFinesHtml(html: string): IcoMpnListingRow[] {
  const rows: IcoMpnListingRow[] = [];
  const trs = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of trs) {
    const href = (row.match(/href="([^"]+)"/i) || [])[1] || "";
    const pageUrl = officialEnforcementPageUrl(absolutizeIcoHref(href));
    if (!pageUrl || !isCandidateEnforcementPage(pageUrl)) continue;
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
    if (cells.length < 2) continue;
    rows.push({
      institution: cells[0],
      date: cells[1],
      title: "Monetary Penalty Notice",
      type: cells[2] || "Monetary Penalty Notice",
      sourceUrl: pageUrl,
      docket: enforcementPageSlug(pageUrl) ?? undefined,
    });
  }
  return rows;
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ docket \/ date \/ PDF URL/i.test(text)) return true;
  if (/ICO press teaser|media-centre news teaser/i.test(text)) return true;
  if (/Notes to editors/i.test(text) && !/Pursuant to section 155/i.test(text)) return true;
  if (/INSTRUCTIONS/i.test(text) && !/Pursuant to section 155/i.test(text) && !/PENALTY NOTICE/i.test(text)) {
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

export function isRealIcoMpnBody(text: string): boolean {
  if (isIndexTeaserDump(text) || isFederalRegisterDump(text) || isPeopleDump(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 2000) return false;
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
  const mpn = /(?:MONETARY )?PENALTY NOTICE/i.test(text);
  const ico = /Information Commissioner/i.test(text);
  const statute =
    /Data Protection Act 2018|section 155|section 55A|Privacy and Electronic Communications/i.test(text);
  return mpn && ico && statute;
}

export function parseIcoMpnText(
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
): IcoMpnCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialIcoMpnPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(meta.id) || slugFromUrl(sourceUrl);
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || `${docket}.pdf`;
  return {
    id: meta.id && normalizeDocket(meta.id) ? normalizeDocket(meta.id)! : docket,
    docket,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 4000)),
    title: "Monetary Penalty Notice",
    sourceUrl,
    body,
  };
}

export function emptyIcoMpnSnapshot(reason: string): IcoMpnSnapshot {
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

export function assembleIcoMpnSnapshot(
  cards: IcoMpnCard[],
  fetchedAt = new Date().toISOString(),
): IcoMpnSnapshot {
  const withBody = cards
    .filter((c) => isRealIcoMpnBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official ICO MPN PDFs had no extractable Penalty Notice text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): IcoMpnSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as IcoMpnSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readIcoMpnSnapshot(): IcoMpnSnapshot | null {
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

export function writeIcoMpnSnapshot(snap: IcoMpnSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchIcoMpnBytes(url: string): Promise<Uint8Array> {
  const official = officialIcoMpnPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export async function fetchIcoMpnText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml,application/xml,text/xml,text/csv;q=0.8" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("ICO_MPN_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("ICO_MPN_JSON_DIR") || env("ICO_MPN_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("ICO_MPN_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("ICO_MPN_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function pageFetchLimit(): number {
  const n = Number(env("ICO_MPN_PAGE_FETCH", "48"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 48;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeOfficialListings(listed: IcoMpnListing[], seeds: IcoMpnListing[]): IcoMpnListing[] {
  const seenId = new Set<string>();
  const seenPdf = new Set<string>();
  const out: IcoMpnListing[] = [];
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

function recoverFinesPageUrls(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const row of parseRecoverFinesHtml(html)) {
    const official = officialEnforcementPageUrl(row.sourceUrl);
    if (!official || seen.has(official)) continue;
    seen.add(official);
    urls.push(official);
  }
  return urls;
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function walkOfficialNoticePages(pageUrls: string[]): Promise<IcoMpnListing[]> {
  const listed: IcoMpnListing[] = [];
  const seen = new Set<string>();
  const cap = pageFetchLimit();
  let fetched = 0;
  for (const pageUrl of pageUrls) {
    if (fetched >= cap) break;
    if (fetched > 0) await pause(150);
    try {
      const pageListed = parseNoticePageHtml(await fetchIcoMpnText(pageUrl), pageUrl);
      fetched += 1;
      for (const row of pageListed) {
        if (!row.id || seen.has(row.id)) continue;
        seen.add(row.id);
        listed.push(row);
      }
    } catch {
      fetched += 1;
    }
  }
  return listed;
}

async function loadOfficialListings(dir: string): Promise<{ listed: IcoMpnListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as IcoMpnListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  try {
    const pageUrls: string[] = [];
    const seenPages = new Set<string>();
    const addPages = (urls: string[]) => {
      for (const url of urls) {
        const official = officialEnforcementPageUrl(url);
        if (!official || !isCandidateEnforcementPage(official) || seenPages.has(official)) continue;
        seenPages.add(official);
        pageUrls.push(official);
      }
    };
    try {
      addPages(parseSitemapXml(await fetchIcoMpnText(SITEMAP_URL)));
    } catch {
      /* sitemap missed; recover-fines table still walks official pages */
    }
    try {
      addPages(recoverFinesPageUrls(await fetchIcoMpnText(RECOVER_FINES_URL)));
    } catch {
      /* recover-fines missed; sitemap pages still walk */
    }
    pageUrls.sort((a, b) => b.localeCompare(a));
    const listed = await walkOfficialNoticePages(pageUrls);
    const merged = mergeOfficialListings(listed, SEED_LISTINGS);
    if (merged.length > 0) return { listed: merged, listedCount: merged.length };
  } catch {
    /* official listing missed; keep first-slice seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectIcoMpn(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<IcoMpnSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = icoMpnDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, IcoMpnCard>();
  for (const card of readIcoMpnSnapshot()?.cards ?? []) {
    if (isRealIcoMpnBody(card.body)) prior.set(card.id, card);
  }
  const cards: IcoMpnCard[] = [];
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
      const pdfFile = join(cacheDir, row.pdfId.endsWith(".pdf") ? row.pdfId : `${row.docket}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchIcoMpnBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseIcoMpnText(text, row);
      if (!isRealIcoMpnBody(parsed.body)) {
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
  const snap = { ...assembleIcoMpnSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeIcoMpnSnapshot(snap);
  return snap;
}

export async function loadIcoMpn(): Promise<IcoMpnSnapshot> {
  const cached = readIcoMpnSnapshot();
  if (cached && cached.cards.some((c) => isRealIcoMpnBody(c.body))) return cached;
  try {
    return await collectIcoMpn();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live ICO MPN fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyIcoMpnSnapshot(
      `ICO MPN PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildIcoMpnManifest(snap: IcoMpnSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealIcoMpnBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote("/ico-mpn", 'Full catalog: count + institution + docket + date + official URL. Not the press/teaser'),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: ICO_MPN_AMOUNT_ATOMIC,
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

export async function loadIcoMpnManifest(): Promise<Record<string, unknown>> {
  return buildIcoMpnManifest(readIcoMpnSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectIcoMpn()
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
