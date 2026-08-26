/**
 * UK CMA CA98 infringement-decision TEXT door.
 * Official decision PDFs from assets.publishing.service.gov.uk only.
 * First-slice miss: only the financial-services case page plus 5 seeds.
 * Official leftover catalog is the CMA cases finder (CA98 infringement Chapter I/II).
 * Does not invent decision text. Institution/company only. Not people. Not the press teaser.
 * Not ICO /ico-mpn. Not Superfund /superfund-rods. Live public SKU. Listed on well-known / OpenAPI / llms.txt / shop catalog.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const CMA_CA98_PATH = "/cma-ca98";
export const CMA_CA98_MANIFEST_PATH = "/cma-ca98/manifest.json";
export const CMA_CA98_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "cma-ca98-infringement-decision-bodies";
export const PRODUCT_NAME = "UK CMA CA98 infringement-decision text";

export const LISTING_URL = "https://www.gov.uk/cma-cases/financial-services-sector-suspected-anti-competitive-practices";
/** First-slice teaser: one case page. Official catalog continues on the CMA cases finder. */
export const FIRST_SLICE_LISTING_URL = LISTING_URL;
export const CASES_INDEX_URL =
  "https://www.gov.uk/cma-cases?case_type%5B%5D=ca98-and-civil-cartels&outcome_type%5B%5D=ca98-infringement-chapter-i&outcome_type%5B%5D=ca98-infringement-chapter-ii";
export const CASE_PATH_RE = /^\/cma-cases\/[a-z0-9][a-z0-9-]{2,200}$/i;
export const DECISION_PDF_RE =
  /infringement|non[-_ ]?confidential|non[-_ ]?confi|non[-_ ]?conf|CA98|chapter [i12]|decision/i;
export const SKIP_PDF_RE =
  /\bsummary\b|penalty notice|judgment|judgement|commitments?|statement of objections|notice of intention|case closure|annexes\b/i;
export const PDF_HOST = "assets.publishing.service.gov.uk";
export const PDF_ORIGIN = "https://assets.publishing.service.gov.uk";
export const MEDIA_RE = /\/media\/([0-9a-f]+)\/([^/?#]+\.pdf)/i;
export const DOCKET_BARE_RE = /^(?:CE-)?\d{4,5}(?:-\d+)?(?:-[a-z0-9-]+)?$/i;
export const LICENSE = "Crown copyright / Open Government Licence v3.0";
export const ATTRIBUTION = "UK Competition and Markets Authority. Contains public sector information licensed under the Open Government Licence v3.0.";

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

export type CmaCa98ListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type CmaCa98Listing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type CmaCa98Card = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type CmaCa98Snapshot = {
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
  cards: CmaCa98Card[];
};

const HTTP_UA = "bnm-data-shop/1.0 (CMA CA98 texts; +https://www.gov.uk/cma)";
const OFFICIAL_HOSTS = new Set(["assets.publishing.service.gov.uk"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.P\.|LP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|plc|PLC|Bank|Aktiengesellschaft|Group|Lighting|Holdings|Europe|International)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;

export const SEED_LISTINGS: CmaCa98Listing[] = [
  {
    id: "50601-citi-db",
    docket: "50601-citi-db",
    institution: "Citigroup Global Markets Limited / Deutsche Bank Aktiengesellschaft",
    date: "2025-02-21",
    title: "CA98 infringement decision",
    sourceUrl:
      "https://assets.publishing.service.gov.uk/media/6876390d352c290d20dcae7c/Citi-Deutsche_Bank__Non-confidential_decision.pdf",
    pdfId: "Citi-Deutsche_Bank__Non-confidential_decision.pdf",
  },
  {
    id: "50565-5",
    docket: "50565-5",
    institution: "Roland (U.K.) Limited / Roland Corporation",
    date: "2020-06-29",
    title: "CA98 infringement decision",
    sourceUrl:
      "https://assets.publishing.service.gov.uk/media/5f171ab43a6f40727ebfb440/Non-confidential_infringement_decision.pdf",
    pdfId: "Non-confidential_infringement_decision.pdf",
  },
  {
    id: "50952",
    docket: "50952",
    institution: "Dar Lighting Limited / Castlegate 624 Limited",
    date: "2022-03-23",
    title: "CA98 infringement decision",
    sourceUrl:
      "https://assets.publishing.service.gov.uk/media/62aca145d3bf7f0af821ef5e/Case_50952_-_Non-Confi_Decision_for_Publication_21.6.22.pdf",
    pdfId: "Case_50952_-_Non-Confi_Decision_for_Publication_21.6.22.pdf",
  },
  {
    id: "CE-9856-14",
    docket: "CE-9856-14",
    institution: "ITW Limited",
    date: "2016-05-24",
    title: "CA98 infringement decision",
    sourceUrl:
      "https://assets.publishing.service.gov.uk/media/575a8f5eed915d3d24000003/commercial-catering-equipment-non-confidential-decision.pdf",
    pdfId: "commercial-catering-equipment-non-confidential-decision.pdf",
  },
  {
    id: "50565-3",
    docket: "50565-3",
    institution: "Fender Musical Instruments Europe Limited",
    date: "2020-03-20",
    title: "CA98 infringement decision",
    sourceUrl:
      "https://assets.publishing.service.gov.uk/media/5e79d8aed3bf7f52efedfcad/20200320_50565-3_-_DECISION.pdf",
    pdfId: "20200320_50565-3_-_DECISION.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function cmaCa98Dir(): string {
  if (env("CMA_CA98_DIR")) return resolve(env("CMA_CA98_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/cma-ca98"));
}

export function snapshotPath(): string {
  return join(cmaCa98Dir(), "snapshot.json");
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
  const ukDot = raw.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/);
  if (ukDot) {
    const yy = ukDot[3].length === 2 ? (Number(ukDot[3]) >= 70 ? `19${ukDot[3]}` : `20${ukDot[3]}`) : ukDot[3];
    return `${yy}-${ukDot[2].padStart(2, "0")}-${ukDot[1].padStart(2, "0")}`;
  }
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

export function officialCmaCa98PdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (
      host === "web.archive.org" ||
      host === "federalregister.gov" ||
      host === "www.federalregister.gov" ||
      host === "ico.org.uk" ||
      host === "www.ico.org.uk"
    ) {
      return null;
    }
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const media = decodeURIComponent(parsed.pathname).match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
    if (!media) return null;
    return `${PDF_ORIGIN}/media/${media[1]}/${media[2]}`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialCmaCa98PdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = parsed.pathname.match(MEDIA_RE);
    return media ? media[2] : null;
  } catch {
    return null;
  }
}

export function slugFromUrl(url: string): string {
  const official = officialCmaCa98PdfUrl(url) || url || "";
  const media = official.match(MEDIA_RE);
  if (!media) return "unknown";
  return media[2].replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\//g, "-");
  if (!trimmed || /\s/.test(trimmed)) return null;
  if (/^CE-\d{4,5}-\d+$/i.test(trimmed)) return trimmed.toUpperCase().replace(/^CE/, "CE");
  if (DOCKET_BARE_RE.test(trimmed)) {
    if (/^CE-/i.test(trimmed)) return `CE-${trimmed.slice(3)}`;
    return trimmed;
  }
  return null;
}

export function isPeopleRow(row: CmaCa98ListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  const cleaned = name
    .replace(/\s+CA98\b[\s\S]*$/i, "")
    .replace(/\s+Competition Act 1998[\s\S]*$/i, "")
    .replace(/\s+infringement[\s\S]*$/i, "")
    .replace(/\s+non-confidential[\s\S]*$/i, "")
    .trim();
  return PERSON_NAME_RE.test(name) || PERSON_NAME_RE.test(cleaned);
}

export function isPressTeaserRow(row: CmaCa98ListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`;
  if (!/press|news|teaser|settlement announced/i.test(kind)) return false;
  return !/non-confidential|infringement decision|CA98/i.test(kind);
}

export function isIcoMpnRow(row: CmaCa98ListingRow): boolean {
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.docket ?? ""}`;
  return /ico\.org\.uk|monetary penalty notice|\bico-mpn\b|ICO MPN/i.test(kind);
}

export function isDecisionPdfBlob(text: string): boolean {
  if (SKIP_PDF_RE.test(text)) return false;
  return DECISION_PDF_RE.test(text);
}

export function isInstitutionOrderRow(row: CmaCa98ListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (isPressTeaserRow(row)) return false;
  if (isIcoMpnRow(row)) return false;
  if (!officialCmaCa98PdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.docket ?? ""} ${row.pdfId ?? ""}`;
  if (!isDecisionPdfBlob(kind) && !MEDIA_RE.test(kind)) return false;
  return true;
}

function listingRank(row: CmaCa98Listing): number {
  let n = 0;
  if (normalizeDocket(row.docket)) n += 2;
  if (row.date) n += 1;
  if (ENTITY_RE.test(row.institution)) n += 2;
  if (/infringement decision/i.test(row.title)) n += 1;
  return n;
}

export function parseListingRows(rows: CmaCa98ListingRow[]): CmaCa98Listing[] {
  const found: CmaCa98Listing[] = [];
  const seen = new Map<string, number>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const sourceUrl = officialCmaCa98PdfUrl(row.sourceUrl ?? "");
    const pdfId = (row.pdfId ?? "").trim() || pdfIdFromUrl(sourceUrl ?? "") || "";
    const docket = normalizeDocket(row.docket) || slugFromUrl(sourceUrl ?? "");
    if (!docket || !sourceUrl || !pdfId) continue;
    const title = (row.title ?? "").trim();
    const next: CmaCa98Listing = {
      id: normalizeDocket(row.docket) || docket,
      docket,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: title || "CA98 infringement decision",
      sourceUrl,
      pdfId,
    };
    const prevIdx = seen.get(sourceUrl);
    if (prevIdx !== undefined) {
      if (listingRank(next) > listingRank(found[prevIdx])) found[prevIdx] = next;
      continue;
    }
    seen.set(sourceUrl, found.length);
    found.push(next);
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function docketFromText(text: string): string | null {
  const ce = text.match(/\bCE[/-](\d{4,5})[/-](\d+)\b/i);
  if (ce) return `CE-${ce[1]}-${ce[2]}`;
  const citi = text.match(/\b50601\b/) && /citi|deutsche/i.test(text);
  if (citi) return "50601-citi-db";
  const labeled = text.match(/\bCase[_\s-]+(\d{4,5}(?:-\d+)?)/i);
  if (labeled) return labeled[1];
  const pair = text.match(/\b(50\d{3}-\d)\b/);
  if (pair) return pair[1];
  const bare = text.match(/\b(50\d{3})\b/);
  if (bare) return bare[1];
  return normalizeDocket(text);
}

export function caseTitleFromHtml(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return h1 ? stripTags(h1[1]) : "";
}

export function parseCasesIndexHtml(html: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/href="([^"]+)"/gi)) {
    let href = m[1].replace(/&amp;/g, "&");
    try {
      const parsed = new URL(href, "https://www.gov.uk");
      const host = parsed.hostname.toLowerCase();
      if (host !== "www.gov.uk" && host !== "gov.uk") continue;
      const path = parsed.pathname.replace(/\/+$/, "") || "/";
      if (!CASE_PATH_RE.test(path)) continue;
      if (/email-signup/i.test(path)) continue;
      const abs = `https://www.gov.uk${path}`;
      if (seen.has(abs)) continue;
      seen.add(abs);
      found.push(abs);
    } catch {
      /* skip */
    }
  }
  return found;
}

export function parseCasesIndexPageUrls(html: string, currentUrl: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>([currentUrl]);
  for (const m of html.matchAll(/href="([^"]+page=\d+[^"]*)"/gi)) {
    const href = m[1].replace(/&amp;/g, "&");
    try {
      const parsed = new URL(href, currentUrl);
      if (!/\/cma-cases/i.test(parsed.pathname)) continue;
      const abs = parsed.toString();
      if (seen.has(abs)) continue;
      seen.add(abs);
      found.push(abs);
    } catch {
      /* skip */
    }
  }
  return found;
}

export function parseListingHtml(
  html: string,
  pageMeta?: { institution?: string; title?: string },
): CmaCa98Listing[] {
  const rows: CmaCa98ListingRow[] = [];
  const pageTitle = (pageMeta?.institution || pageMeta?.title || caseTitleFromHtml(html)).trim();
  const links = [
    ...html.matchAll(
      /(?:(\d{1,2}\.\d{1,2}\.\d{2,4}|\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})[\s\S]{0,240}?)?<a[^>]+href="([^"]+\.pdf[^"]*)"[^>]*>([\s\S]*?)<\/a>([\s\S]{0,80})/gi,
    ),
  ];
  for (const m of links) {
    const href = m[2].startsWith("http") ? m[2] : `${PDF_ORIGIN}${m[2].startsWith("/") ? "" : "/"}${m[2]}`;
    if (!officialCmaCa98PdfUrl(href)) continue;
    const title = stripTags(m[3]);
    const nearby = stripTags(m[4] ?? "");
    const blob = `${title} ${nearby} ${href} ${pdfIdFromUrl(href) ?? ""}`;
    if (!isDecisionPdfBlob(blob)) continue;
    const docket = docketFromText(`${title} ${pageTitle} ${href}`) || slugFromUrl(href);
    const institution = ENTITY_RE.test(title) ? title : pageTitle || title;
    rows.push({
      institution,
      date: m[1] || nearby || undefined,
      title: /infringement|CA98|decision/i.test(`${title} ${href}`) ? "CA98 infringement decision" : title,
      sourceUrl: href,
      pdfId: pdfIdFromUrl(href) ?? "",
      docket,
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ docket \/ date \/ PDF URL/i.test(text)) return true;
  if (/CMA press teaser|ICO MPN teaser|Proposed Plan teaser/i.test(text)) return true;
  if (/CMA reaches settlement with banks/i.test(text) && !/Chapter I prohibition/i.test(text)) return true;
  if (/INSTRUCTIONS/i.test(text) && !/Competition Act 1998/i.test(text) && !/Chapter I prohibition|Chapter II prohibition/i.test(text)) {
    return true;
  }
  return false;
}

export function isFederalRegisterDump(text: string): boolean {
  return /"raw_text"/.test(text) || /"full_text"/.test(text) || /federalregister\.gov/i.test(text);
}

export function isPeopleDump(text: string): boolean {
  if (/people-only CMA|people-only CFTC/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isIcoMpnDump(text: string): boolean {
  if (/Information Commissioner'?s Office/i.test(text) && /Monetary Penalty Notice/i.test(text)) return true;
  if (/\bICO MPN\b/i.test(text) || /\/ico-mpn\b/i.test(text)) return true;
  return false;
}

export function isRealCmaCa98Body(text: string): boolean {
  if (isIndexTeaserDump(text) || isFederalRegisterDump(text) || isPeopleDump(text) || isIcoMpnDump(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 2000) return false;
  if (/RECORD OF DECISION/i.test(text) && /CERCLA|Superfund/i.test(text)) return false;
  if (/Center for Devices and Radiological Health/i.test(text) && /De Novo request/i.test(text)) return false;
  if (/ENVIRONMENTAL PROTECTION AGENCY/i.test(text) && /FIFRA-\d{2}-\d{4}-\d{4}/i.test(text)) return false;
  if (/COMMODITY FUTURES TRADING COMMISSION/i.test(text) && /CFTC Docket No/i.test(text)) return false;
  if (/Bureau of Industry and Security/i.test(text) && /PROPOSED CHARGING LETTER|ORDER RELATING TO/i.test(text)) {
    return false;
  }
  if (/ALCOHOL AND TOBACCO TAX AND TRADE BUREAU/i.test(text) && /ABSTRACT AND STATEMENT/i.test(text)) return false;
  if (/\d{2}-\d{3}-01air/i.test(text) && /Confirmation of the regulatory status/i.test(text)) return false;
  const cma = /Competition and Markets Authority|\bCMA\b/i.test(text);
  const act = /Competition Act 1998/i.test(text);
  const chapter = /Chapter I prohibition|Chapter II prohibition|section 2\(1\)|section 18/i.test(text);
  return cma && act && chapter;
}

export function parseCmaCa98Text(
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
): CmaCa98Card {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialCmaCa98PdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(meta.id) || slugFromUrl(sourceUrl);
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || `${docket}.pdf`;
  const title = (meta.title ?? "").trim();
  return {
    id: (meta.id && normalizeDocket(meta.id)) || docket,
    docket,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 4000)),
    title: title || "CA98 infringement decision",
    sourceUrl,
    body,
  };
}

export function emptyCmaCa98Snapshot(reason: string): CmaCa98Snapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: CASES_INDEX_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: [],
  };
}

export function assembleCmaCa98Snapshot(
  cards: CmaCa98Card[],
  fetchedAt = new Date().toISOString(),
): CmaCa98Snapshot {
  const unique = new Map<string, CmaCa98Card>();
  for (const card of cards) {
    if (!isRealCmaCa98Body(card.body)) continue;
    const key = officialCmaCa98PdfUrl(card.sourceUrl) || card.sourceUrl || card.id;
    const prev = unique.get(key);
    if (!prev || listingRank(card) > listingRank(prev)) unique.set(key, card);
  }
  const withBody = [...unique.values()].sort((a, b) =>
    `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`),
  );
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official CMA CA98 decision PDFs had no extractable decision text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: CASES_INDEX_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): CmaCa98Snapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as CmaCa98Snapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readCmaCa98Snapshot(): CmaCa98Snapshot | null {
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

export function writeCmaCa98Snapshot(snap: CmaCa98Snapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchCmaCa98Bytes(url: string): Promise<Uint8Array> {
  const official = officialCmaCa98PdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchCmaCa98Text(url: string): Promise<string> {
  let last: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" } });
      if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      last = err instanceof Error ? err : new Error(String(err));
      await pause(400 * (attempt + 1));
    }
  }
  throw last ?? new Error(`${url} fetch failed`);
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("CMA_CA98_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("CMA_CA98_JSON_DIR") || env("CMA_CA98_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("CMA_CA98_LIMIT", "24");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 24;
}

function maxFetchLimit(): number {
  const raw = env("CMA_CA98_MAX_FETCH", "36");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 36;
}

function maxIndexPages(): number {
  const n = Number(env("CMA_CA98_MAX_INDEX_PAGES", "3"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
}

function maxCasePages(): number {
  const n = Number(env("CMA_CA98_MAX_CASES", "80"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 80;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeOfficialListings(listed: CmaCa98Listing[], seeds: CmaCa98Listing[] = []): CmaCa98Listing[] {
  const byUrl = new Map<string, CmaCa98Listing>();
  for (const row of [...listed, ...seeds]) {
    if (!row.sourceUrl) continue;
    const prev = byUrl.get(row.sourceUrl);
    if (!prev || listingRank(row) > listingRank(prev)) byUrl.set(row.sourceUrl, row);
  }
  return [...byUrl.values()].sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
}

const FIXTURE_LISTING_FILES = [
  "listing-excerpt.html",
  "leftover-rangers-excerpt.html",
  "listing.html",
];

async function walkOfficialCasePages(
  caseUrls: string[],
  pauseMs: number,
): Promise<CmaCa98Listing[]> {
  const listed: CmaCa98Listing[] = [];
  const cap = maxCasePages();
  for (const url of caseUrls.slice(0, cap)) {
    try {
      if (pauseMs) await pause(pauseMs);
      const html = await fetchCmaCa98Text(url);
      listed.push(...parseListingHtml(html, { institution: caseTitleFromHtml(html) }));
    } catch {
      /* one official case page missed; keep the others */
    }
  }
  return listed;
}

async function walkOfficialIndex(pauseMs: number): Promise<string[]> {
  const caseUrls: string[] = [];
  const seen = new Set<string>();
  const indexUrls = [CASES_INDEX_URL];
  const pageCap = maxIndexPages();
  for (let i = 0; i < indexUrls.length && i < pageCap; i += 1) {
    const url = indexUrls[i];
    try {
      if (pauseMs && i > 0) await pause(pauseMs);
      const html = await fetchCmaCa98Text(url);
      for (const caseUrl of parseCasesIndexHtml(html)) {
        if (seen.has(caseUrl)) continue;
        seen.add(caseUrl);
        caseUrls.push(caseUrl);
      }
      for (const next of parseCasesIndexPageUrls(html, url)) {
        if (!indexUrls.includes(next) && indexUrls.length < pageCap) indexUrls.push(next);
      }
    } catch {
      /* one official index page missed; keep the others */
    }
  }
  if (!seen.has(FIRST_SLICE_LISTING_URL)) caseUrls.unshift(FIRST_SLICE_LISTING_URL);
  return caseUrls;
}

async function loadOfficialListings(
  dir: string,
  pauseMs = 0,
): Promise<{ listed: CmaCa98Listing[]; listedCount: number }> {
  if (dir) {
    const listed: CmaCa98Listing[] = [];
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as CmaCa98ListingRow[];
      if (Array.isArray(rows)) listed.push(...parseListingRows(rows));
    }
    for (const name of FIXTURE_LISTING_FILES) {
      const html = readNamedFile(dir, [name]);
      if (html) listed.push(...parseListingHtml(html, { institution: caseTitleFromHtml(html) }));
    }
    const merged = mergeOfficialListings(listed, SEED_LISTINGS);
    return { listed: merged, listedCount: merged.length };
  }
  try {
    const caseUrls = await walkOfficialIndex(pauseMs);
    const listed = await walkOfficialCasePages(caseUrls, pauseMs);
    const merged = mergeOfficialListings(listed, SEED_LISTINGS);
    if (merged.length > 0) return { listed: merged, listedCount: merged.length };
  } catch {
    /* official listing missed; keep first-slice seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectCmaCa98(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<CmaCa98Snapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 250);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir, pauseMs);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = cmaCa98Dir();
  mkdirSync(cacheDir, { recursive: true });
  const priorById = new Map<string, CmaCa98Card>();
  const priorByUrl = new Map<string, CmaCa98Card>();
  for (const card of readCmaCa98Snapshot()?.cards ?? []) {
    if (!isRealCmaCa98Body(card.body)) continue;
    priorById.set(card.id, card);
    priorByUrl.set(officialCmaCa98PdfUrl(card.sourceUrl) || card.sourceUrl, card);
  }
  const cards: CmaCa98Card[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = priorByUrl.get(row.sourceUrl) || priorById.get(row.id);
    if (cached) {
      cards.push({ ...cached, id: row.id, docket: row.docket, institution: row.institution || cached.institution, date: row.date ?? cached.date, title: row.title || cached.title });
      seen.add(row.sourceUrl);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    if (!dir && pauseMs) await pause(pauseMs);
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
            writeFileSync(pdfFile, await fetchCmaCa98Bytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseCmaCa98Text(text, row);
      if (!isRealCmaCa98Body(parsed.body)) {
        skippedNoText += 1;
        continue;
      }
      cards.push(parsed);
      seen.add(row.sourceUrl);
      addedThisRun += 1;
    } catch {
      skippedNoText += 1;
    }
  }
  for (const [url, card] of priorByUrl) {
    if (!seen.has(url)) cards.push(card);
  }
  const snap = { ...assembleCmaCa98Snapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeCmaCa98Snapshot(snap);
  return snap;
}

export async function loadCmaCa98(): Promise<CmaCa98Snapshot> {
  const cached = readCmaCa98Snapshot();
  if (cached && cached.cards.some((c) => isRealCmaCa98Body(c.body))) return cached;
  try {
    return await collectCmaCa98();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live CMA CA98 fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyCmaCa98Snapshot(
      `CMA CA98 PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildCmaCa98Manifest(snap: CmaCa98Snapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealCmaCa98Body(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote("/cma-ca98", 'Full catalog: count + institution + docket + date + official URL. Crown/OGL v3.0; logo reserved'),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: CMA_CA98_AMOUNT_ATOMIC,
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
    sources: snap?.sources ?? { listing: CASES_INDEX_URL, pdfHost: `${PDF_ORIGIN}/` },
  };
}

export async function loadCmaCa98Manifest(): Promise<Record<string, unknown>> {
  return buildCmaCa98Manifest(readCmaCa98Snapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectCmaCa98()
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
