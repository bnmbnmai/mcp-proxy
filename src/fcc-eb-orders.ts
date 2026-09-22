#!/usr/bin/env node
/**
 * FCC Enforcement Bureau order TEXT door.
 * Index: https://www.fcc.gov/edocs/daily-digest/YYYY/MM/DD
 * PDFs: https://docs.fcc.gov/public/attachments/DA-NN-NNNNA1.pdf
 * 17 U.S.C. § 105. Same extracted-body pipe as /nlrb-decisions and /ecab-decisions.
 * Harvest Enforcement Bureau DA orders only (NOV, NAL, forfeiture, consent decree,
 * citation, Final Determination Order, pirate-radio notice, and other EB orders).
 * Satellite (SB), Media (MB), and Public Safety (PSHSB) digest rows are not this SKU.
 * Sibling .txt/.docx on the digest are not the sold body. Free manifest has no
 * docs.fcc.gov deep link.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const FCC_EB_ORDERS_PATH = "/fcc-eb-orders";
export const FCC_EB_ORDERS_MANIFEST_PATH = "/fcc-eb-orders/manifest.json";
export const FCC_EB_ORDERS_AMOUNT_ATOMIC = "50000";
export const FCC_EB_ORDERS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "fcc-eb-order-bodies";
export const PRODUCT_NAME = "FCC Enforcement Bureau order text";

export const LISTING_URL = "https://www.fcc.gov/edocs/daily-digest";
export const PDF_HOST = "docs.fcc.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Federal Communications Commission, Enforcement Bureau. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** Primary slip only. A2 appendices, DOC- public notices, and .txt siblings fail this shape. */
export const SLIP_PDF_RE = /^\/public\/attachments\/DA-\d+-\d+A1\.pdf$/i;
export const DIGEST_DAY_RE = /^\/edocs\/daily-digest\/((?:19|20)\d{2})\/(\d{2})\/(\d{2})\/?$/i;
const BUREAU_ALT = "PSHSB|OMD|OIA|OET|OEA|OGC|CGB|WTB|WCB|OMR|OSP|OCBO|EB|MB|SB|IB";
const BUREAU_GROUP_RE = new RegExp(`\\b((?:${BUREAU_ALT})(?:\\s+(?:${BUREAU_ALT}))*)\\.`, "g");
const ATTACH_RE =
  /(?:https:\/\/docs\.fcc\.gov)?\/public\/attachments\/((?:DA|DOC)-\d+-\d+)(A\d+)\.(pdf|docx|txt)\b|(?<![/\w])((?:DA|DOC)-\d+-\d+)(A\d+)\.(pdf|docx|txt)\b/gi;

export const VZ_ID = "DA-26-1006";
export const BT_ID = "DA-26-237";
export const JP_ID = "DA-26-987";
export const SG_ID = "DA-26-954";
export const VZ_URL = "https://docs.fcc.gov/public/attachments/DA-26-1006A1.pdf";
export const BT_URL = "https://docs.fcc.gov/public/attachments/DA-26-237A1.pdf";
export const JP_URL = "https://docs.fcc.gov/public/attachments/DA-26-987A1.pdf";
export const SG_URL = "https://docs.fcc.gov/public/attachments/DA-26-954A1.pdf";

export const BODY_NEEDLE_VZ = "Sage Digital";
export const BODY_NEEDLE_BT = "Robocall Mitigation Database";
export const BODY_NEEDLE_JP = "direction finding techniques";
export const BODY_NEEDLE_SG = "$100,000 voluntary contribution";

export const CARD_FIELDS = [
  "id",
  "citation",
  "docket",
  "caseNo",
  "documentId",
  "kind",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type FccEbKind =
  | "Notice of Violation"
  | "Final Determination Order"
  | "Notice of Illegal Pirate Radio Broadcasting"
  | "Consent Decree"
  | "Notice of Apparent Liability"
  | "Forfeiture Order"
  | "Initial Determination Order"
  | "Citation"
  | "Admonishment"
  | "Order";

export type FccEbListing = {
  id: string;
  citation: string;
  docket: string;
  caseNo: string;
  documentId: string;
  kind: FccEbKind;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
};

export type FccEbCard = FccEbListing & { body: string };

export type FccEbSnapshot = {
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
  cards: FccEbCard[];
};

const HTTP_UA = "Mozilla/5.0 (compatible; bnm-data-shop/1.0; +https://www.fcc.gov/edocs/daily-digest)";

export const SEED_LISTINGS: FccEbListing[] = [
  {
    id: VZ_ID,
    citation: "DA 26-1006",
    docket: "EB-FIELDNER-24-00037648",
    caseNo: "EB-FIELDNER-24-00037648",
    documentId: "DA-26-1006A1.pdf",
    kind: "Notice of Violation",
    institution: "Vazquez Broadcasting Corporation, licensee of AM Station WSDS, Salem Township, Michigan",
    date: "2026-09-18",
    title: "DA 26-1006",
    sourceUrl: VZ_URL,
  },
  {
    id: BT_ID,
    citation: "DA 26-237",
    docket: "EB-TCD-24-00037445",
    caseNo: "22-174",
    documentId: "DA-26-237A1.pdf",
    kind: "Final Determination Order",
    institution: "Belthrough LLC",
    date: "2026-03-12",
    title: "DA 26-237",
    sourceUrl: BT_URL,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function fccEbOrdersDir(): string {
  if (env("FCC_EB_ORDERS_DIR")) return resolve(env("FCC_EB_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/fcc-eb-orders"));
}

export function snapshotPath(): string {
  return join(fccEbOrdersDir(), "snapshot.json");
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const named = raw.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (!named) return null;
  const months: Record<string, string> = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12",
  };
  const mm = months[named[1].toLowerCase().replace(/\.$/, "")];
  return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
}

export function dateFromDigestUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const hit = url.match(/\/edocs\/daily-digest\/((?:19|20)\d{2})\/(\d{2})\/(\d{2})\/?$/i);
  if (!hit) return null;
  const year = Number(hit[1]);
  const month = Number(hit[2]);
  const day = Number(hit[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${hit[1]}-${hit[2]}-${hit[3]}`;
}

export function daIdFromStem(stem: string | null | undefined): string {
  const hit = (stem ?? "").toUpperCase().match(/^(DA-\d+-\d+)/);
  return hit ? hit[1] : "";
}

export function citationFor(id: string): string {
  const hit = id.toUpperCase().match(/^DA-(\d+)-(\d+)$/);
  return hit ? `DA ${hit[1]}-${hit[2]}` : id;
}

export function officialFccEbPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim().replace(/&amp;/g, "&");
  try {
    const parsed = new URL(trimmed, "https://docs.fcc.gov/");
    const host = parsed.hostname.toLowerCase();
    if (host !== "docs.fcc.gov") return null;
    const path = decodeURIComponent(parsed.pathname);
    if (!SLIP_PDF_RE.test(path)) return null;
    return `https://docs.fcc.gov${path}`;
  } catch {
    return null;
  }
}

export function documentIdFromUrl(url: string | null | undefined): string {
  const official = officialFccEbPdfUrl(url);
  if (!official) return "";
  try {
    return decodeURIComponent(new URL(official).pathname.split("/").pop() || "");
  } catch {
    return "";
  }
}

export function kindFromBlurb(text: string): FccEbKind | null {
  const flat = text.replace(/\s+/g, " ");
  if (/FINAL DETERMINATION/i.test(flat)) return "Final Determination Order";
  if (/by\s+NOV\b|NOTICE OF VIOLATION/i.test(flat)) return "Notice of Violation";
  if (/by\s+NIPRB\b|ILLEGAL PIRATE RADIO/i.test(flat)) return "Notice of Illegal Pirate Radio Broadcasting";
  if (/CONSENT DECREE/i.test(flat)) return "Consent Decree";
  if (/APPARENT LIABILITY|\bby\s+NAL\b/i.test(flat)) return "Notice of Apparent Liability";
  if (/FORFEITURE ORDER/i.test(flat)) return "Forfeiture Order";
  if (/INITIAL DETERMINATION/i.test(flat)) return "Initial Determination Order";
  if (/\bCITATION\b/i.test(flat)) return "Citation";
  if (/\bADMONISH/i.test(flat)) return "Admonishment";
  if (/\bby\s+ORDER\b|\bORDER\b/i.test(flat)) return "Order";
  return null;
}

export function bureauFromWindow(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(BUREAU_GROUP_RE)) {
    found.push(match[1] ?? "");
  }
  const last = found.at(-1) ?? "";
  return last
    .split(/\s+/)
    .map((token) => token.toUpperCase())
    .filter(Boolean);
}

export function isEbBureau(tokens: string[]): boolean {
  return tokens.length === 1 && tokens[0] === "EB";
}

export function institutionFromBlurb(text: string): string {
  const matter = text.match(/IN THE MATTER OF\s+(.+?)(?:\.\s|Notice of|FCC EB|FCC Enforcement)/i);
  if (matter) {
    return matter[1].replace(/\s+/g, " ").replace(/[,;\s]+$/, "").trim();
  }
  const lead = (text.split(/\.\s/)[0] ?? "").replace(/^Released:\s*\d{4}-\d{2}-\d{2}\s*/i, "").trim();
  if (!lead || /^Report No\b/i.test(lead) || /^THE FOLLOWING ITEMS/i.test(lead)) return "";
  return lead.replace(/\s+/g, " ").replace(/[;,\s]+$/, "");
}

export function fileNoFromText(text: string): string {
  const file = text.match(/File No\.:\s*(EB-[A-Z0-9-]+)/i);
  if (file) return file[1].toUpperCase();
  const caseNo = text.match(/Case Number:\s*(EB-[A-Z0-9-]+)/i);
  if (caseNo) return caseNo[1].toUpperCase();
  const eb = text.match(/\b(EB-[A-Z]{2,}-\d{2}-\d{6,})\b/);
  return eb ? eb[1].toUpperCase() : "";
}

export function docketNoFromText(text: string): string {
  const hit = text.match(/EB Docket No\.\s*(\d{2}-\d+)/i) || text.match(/\(Dkt No\s+(\d{2}-\d+)/i);
  return hit ? hit[1] : "";
}

export function isHtmlOrder(text: string): boolean {
  return /<html[\s>]/i.test(text) && /Federal Communications Commission/i.test(text);
}

export function isDigestIndex(text: string): boolean {
  return /THE FOLLOWING ITEMS ARE DATED AND RELEASED TODAY/i.test(text) && /docs\.fcc\.gov\/public\/attachments|DA-\d+-\d+A1\.pdf/i.test(text);
}

export function isJsonFullText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function isRealFccEbOrderBody(text: string, id?: string): boolean {
  if (isHtmlOrder(text) || isDigestIndex(text) || isJsonFullText(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 800) return false;
  const fcc = /Federal Communications Commission/i.test(text);
  const bureau = /Enforcement Bureau/i.test(text);
  const da = id ? new RegExp(id.replace("DA-", "DA\\s*").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : /DA\s*\d{2}-\d{3,4}/i;
  const slip = da.test(text) || /DA\s*\d{2}-\d{3,4}/i.test(text);
  const instrument =
    /NOTICE OF VIOLATION|FINAL DETERMINATION ORDER|NOTICE OF ILLEGAL|PIRATE RADIO|CONSENT DECREE|NOTICE OF APPARENT LIABILITY|FORFEITURE ORDER|INITIAL DETERMINATION ORDER|\bCITATION\b|\bORDER\b/i.test(
      text,
    );
  return fcc && bureau && slip && instrument;
}

export function digestHtmlToText(raw: string): string {
  const noScript = raw.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const withHrefs = noScript.replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi, " $1 ");
  return decodeEntities(withHrefs.replace(/<[^>]+>/g, " "));
}

export function splitDigestPages(raw: string): { pageUrl: string; html: string }[] {
  const marks = [...raw.matchAll(/<!--\s*(https:\/\/www\.fcc\.gov\/edocs\/daily-digest\/\d{4}\/\d{2}\/\d{2})\s*-->/gi)];
  if (marks.length === 0) {
    const inline = raw.match(/https:\/\/www\.fcc\.gov\/edocs\/daily-digest\/\d{4}\/\d{2}\/\d{2}/i);
    return [{ pageUrl: inline?.[0] ?? "", html: raw }];
  }
  return marks.map((mark, index) => ({
    pageUrl: matchPage(mark[1] ?? ""),
    html: raw.slice(mark.index ?? 0, marks[index + 1]?.index ?? raw.length),
  }));
}

function matchPage(url: string): string {
  return url.replace(/\/$/, "");
}

type AttachHit = { start: number; end: number; stem: string; part: string; ext: string };

function attachmentHits(text: string): AttachHit[] {
  const out: AttachHit[] = [];
  for (const match of text.matchAll(ATTACH_RE)) {
    const stem = (match[1] || match[4] || "").toUpperCase();
    const part = (match[2] || match[5] || "").toUpperCase();
    const ext = (match[3] || match[6] || "").toLowerCase();
    if (!stem || !part || !ext) continue;
    out.push({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length, stem, part, ext });
  }
  return out;
}

function itemDate(window: string, pageUrl: string): string | null {
  const released = window.match(/Released:\s*([^.]{0,40})/i);
  const adopted = window.match(/Adopted:\s*([^.]{0,40})/i);
  return isoDate(released?.[1]) || isoDate(adopted?.[1]) || dateFromDigestUrl(pageUrl);
}

export function parseFccEbDigest(raw: string, pageUrl = ""): FccEbListing[] {
  const pages = splitDigestPages(raw);
  const out: FccEbListing[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    const url = page.pageUrl || pageUrl;
    const text = digestHtmlToText(page.html);
    const hits = attachmentHits(text);
    let cursor = 0;
    let index = 0;
    while (index < hits.length) {
      const stem = hits[index].stem;
      let end = index;
      while (end + 1 < hits.length && hits[end + 1].stem === stem) end += 1;
      const cluster = hits.slice(index, end + 1);
      const window = text.slice(cursor, cluster[0].start);
      cursor = cluster[cluster.length - 1].end;
      index = end + 1;
      const pdf = cluster.find((hit) => hit.ext === "pdf" && hit.part === "A1" && hit.stem.startsWith("DA-"));
      if (!pdf) continue;
      const id = daIdFromStem(pdf.stem);
      const sourceUrl = officialFccEbPdfUrl(`https://docs.fcc.gov/public/attachments/${pdf.stem}${pdf.part}.pdf`);
      const kind = kindFromBlurb(window);
      const bureaus = bureauFromWindow(window);
      if (!id || !sourceUrl || !kind || !isEbBureau(bureaus)) continue;
      const listing: FccEbListing = {
        id,
        citation: citationFor(id),
        docket: fileNoFromText(window) || docketNoFromText(window) || id,
        caseNo: docketNoFromText(window) || fileNoFromText(window) || id,
        documentId: `${pdf.stem}${pdf.part}.pdf`,
        kind,
        institution: institutionFromBlurb(window) || id,
        date: itemDate(window, url),
        title: citationFor(id),
        sourceUrl,
      };
      if (!keepListing(listing)) continue;
      if (seen.has(listing.id)) continue;
      seen.add(listing.id);
      out.push(listing);
    }
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export function discoverDigestUrls(raw: string, baseUrl = LISTING_URL): string[] {
  const out: { href: string; key: string }[] = [];
  const seen = new Set<string>();
  for (const match of raw.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    try {
      const url = new URL(match[1], baseUrl);
      const host = url.hostname.toLowerCase();
      if (host !== "www.fcc.gov" && host !== "fcc.gov") continue;
      if (!DIGEST_DAY_RE.test(url.pathname)) continue;
      const href = `https://www.fcc.gov${url.pathname.replace(/\/$/, "")}`;
      if (seen.has(href)) continue;
      seen.add(href);
      const day = dateFromDigestUrl(href) ?? "";
      out.push({ href, key: day });
    } catch {
      /* skip */
    }
  }
  out.sort((a, b) => b.key.localeCompare(a.key) || b.href.localeCompare(a.href));
  return out.map((row) => row.href);
}

export function recentDigestUrls(days: number, today = new Date()): string[] {
  const count = Number.isFinite(days) && days > 0 ? Math.floor(days) : 0;
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const when = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const y = when.getUTCFullYear();
    const m = String(when.getUTCMonth() + 1).padStart(2, "0");
    const d = String(when.getUTCDate()).padStart(2, "0");
    out.push(`https://www.fcc.gov/edocs/daily-digest/${y}/${m}/${d}`);
  }
  return out;
}

export function keepListing(row: Pick<FccEbListing, "id" | "kind" | "sourceUrl" | "title" | "institution">): boolean {
  if (!officialFccEbPdfUrl(row.sourceUrl)) return false;
  if (!daIdFromStem(row.id)) return false;
  if (!row.kind) return false;
  const hay = `${row.id} ${row.kind} ${row.title} ${row.institution} ${row.sourceUrl}`;
  if (/\.txt\b|\.docx\b/i.test(row.sourceUrl)) return false;
  if (/\/DOC-\d+/i.test(row.sourceUrl)) return false;
  if (/\b(MB|SB|PSHSB|WTB|WCB|OIA|OMD|OET)\b/.test(hay) && !/\bEB\b/.test(row.id)) {
    /* bureau filter already happened; do not drop EB rows that mention another bureau in the caption */
  }
  return true;
}

export function partiesFromOrder(text: string): string {
  const leftLines = text.split(/\n/).map((line) => (line.trim().split(/\s{3,}/)[0] ?? "").replace(/\)/g, "").trim());
  const matter = leftLines.findIndex((line) => /^In the Matter of$/i.test(line));
  if (matter >= 0) {
    for (const line of leftLines.slice(matter + 1, matter + 8)) {
      if (!line || /^_+$/.test(line)) continue;
      if (/^(File No|NOTICE|FINAL|ORDER|CONSENT|Adopted|Released|By the)\b/i.test(line)) break;
      return line.replace(/[,.\s]+$/, "");
    }
  }
  const pirate = text.match(
    /\n([A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+){0,4}(?:\s+and\s+[A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+){0,4})?)\n/,
  );
  if (pirate && /NOTICE OF ILLEGAL/i.test(text)) return pirate[1].trim();
  return "";
}

function emptySources(): FccEbSnapshot["sources"] {
  return { listing: LISTING_URL, pdfHost: "https://docs.fcc.gov/public/attachments/" };
}

export function parseFccEbOrderText(text: string, meta: Partial<FccEbListing> & { sourceUrl: string }): FccEbCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFccEbPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const id = daIdFromStem(meta.id) || daIdFromStem(documentIdFromUrl(sourceUrl).replace(/A1\.pdf$/i, "")) || meta.id || "";
  const fileNo = fileNoFromText(body) || meta.docket || id;
  const docketNo = docketNoFromText(body) || meta.caseNo || "";
  const parties = partiesFromOrder(body);
  const released =
    isoDate(body.match(/Released:\s*([A-Za-z]+\.?\s+\d{1,2},\s+\d{4})/)?.[1] ?? "") ||
    isoDate(body.match(/\n\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\s*\n/)?.[0] ?? "");
  return {
    id,
    citation: citationFor(id),
    docket: fileNo,
    caseNo: docketNo || fileNo,
    documentId: meta.documentId || documentIdFromUrl(sourceUrl),
    kind: kindFromBlurb(body) || meta.kind || "Order",
    institution: parties || meta.institution || id,
    date: meta.date ?? released,
    title: meta.title || citationFor(id) || "FCC Enforcement Bureau order",
    sourceUrl,
    body,
  };
}

export function emptyFccEbOrdersSnapshot(reason: string): FccEbSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: [],
  };
}

export function assembleFccEbOrdersSnapshot(cards: FccEbCard[], fetchedAt?: string): FccEbSnapshot {
  const kept = cards.filter((card) => isRealFccEbOrderBody(card.body, card.id) && keepListing(card));
  kept.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf =
    kept
      .map((card) => card.date)
      .filter((day): day is string => Boolean(day))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: kept.length ? "ok" : "empty",
    reason: kept.length ? null : "Official FCC Enforcement Bureau order PDFs had no extractable order text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): FccEbSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FccEbSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleFccEbOrdersSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readFccEbOrdersSnapshot(): FccEbSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeFccEbOrdersSnapshot(snap: FccEbSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchFccText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchFccBytes(url: string): Promise<Uint8Array> {
  const official = officialFccEbPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,application/octet-stream" },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FCC_EB_ORDERS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw new Error(`pdftotext failed: ${result.error.message}`);
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim() || `exit ${result.status}`;
    throw new Error(`pdftotext failed: ${err}`);
  }
  return result.stdout || "";
}

function listingDir(): string {
  return env("FCC_EB_ORDERS_HTML_DIR") || env("FCC_EB_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("FCC_EB_ORDERS_LIMIT", "7"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 7;
}

function maxFetchLimit(): number {
  const n = Number(env("FCC_EB_ORDERS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxListingPages(): number {
  const n = Number(env("FCC_EB_ORDERS_PAGES", "4"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 4;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: FccEbListing[]): FccEbListing[] {
  const seen = new Set<string>();
  const out: FccEbListing[] = [];
  for (const row of [...listed, ...SEED_LISTINGS]) {
    if (!keepListing(row)) continue;
    const id = row.id || daIdFromStem(row.documentId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ ...row, id });
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

export async function walkOfficialFccEbOrders(): Promise<{ listed: FccEbListing[]; listedCount: number }> {
  const listed: FccEbListing[] = [];
  let pages: string[] = [];
  try {
    pages = discoverDigestUrls(await fetchFccText(LISTING_URL), LISTING_URL);
  } catch {
    pages = [];
  }
  if (pages.length === 0) pages = recentDigestUrls(Math.max(maxListingPages() * 4, 16));
  const cap = maxListingPages();
  let got = 0;
  let attempts = 0;
  const attemptCap = Math.max(cap * 6, 12);
  for (const page of pages) {
    if (got >= cap || attempts >= attemptCap) break;
    attempts += 1;
    try {
      const html = await fetchFccText(page);
      const rows = parseFccEbDigest(html, page);
      listed.push(...rows);
      got += 1;
    } catch {
      /* unpublished days and Akamai 403s are skipped; keep walking newer-first */
    }
  }
  const merged = mergeListings(listed);
  return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: FccEbListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = raw ? parseFccEbDigest(raw) : [];
    const merged = mergeListings(listed);
    return { listed: merged, listedCount: Math.max(merged.length, listed.length, SEED_LISTINGS.length) };
  }
  try {
    const walked = await walkOfficialFccEbOrders();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectFccEbOrders(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FccEbSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = fccEbOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, FccEbCard>();
  for (const card of readFccEbOrdersSnapshot()?.cards ?? []) {
    if (isRealFccEbOrderBody(card.body, card.id) && keepListing(card)) prior.set(card.id, card);
  }
  const cards: FccEbCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    if (!keepListing(row)) {
      skippedNoText += 1;
      continue;
    }
    const cached = prior.get(row.id);
    if (cached) {
      cards.push(cached);
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    try {
      const localText = readNamedFile(dir, [`${row.id}.txt`, `${row.docket}.txt`].filter(Boolean));
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialFccEbPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchFccBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      if (isHtmlOrder(text) || isJsonFullText(text) || isDigestIndex(text)) {
        skippedNoText += 1;
        continue;
      }
      const parsed = parseFccEbOrderText(text, { ...row, sourceUrl });
      if (!isRealFccEbOrderBody(parsed.body, parsed.id) || !keepListing(parsed)) {
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
  const snap = {
    ...assembleFccEbOrdersSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeFccEbOrdersSnapshot(snap);
  return snap;
}

export async function loadFccEbOrders(): Promise<FccEbSnapshot> {
  const cached = readFccEbOrdersSnapshot();
  if (cached && cached.cards.some((card) => isRealFccEbOrderBody(card.body, card.id))) return cached;
  try {
    return await collectFccEbOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live FCC EB order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyFccEbOrdersSnapshot(
      `FCC Enforcement Bureau order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFccEbOrdersManifest(snap: FccEbSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((card) => isRealFccEbOrderBody(card.body, card.id) && keepListing(card));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      FCC_EB_ORDERS_PATH,
      "Count + DA number + date + institution only. Order body is the paid GET /fcc-eb-orders payload. This free manifest lists the full catalog. Harvest Enforcement Bureau DA orders only. Satellite, media, and public-safety digest rows are not this SKU.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: FCC_EB_ORDERS_AMOUNT_ATOMIC,
    oneAmountAtomic: FCC_EB_ORDERS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((card) => ({
      id: card.id,
      institution: card.institution,
      citation: card.citation,
      docket: card.docket,
      caseNo: card.caseNo,
      documentId: card.documentId,
      kind: card.kind,
      date: card.date,
      title: card.title,
    })),
    schema: {
      fields: ["id", "institution", "citation", "docket", "caseNo", "documentId", "kind", "date", "title"],
    },
    sources: {
      listing: (snap?.sources ?? emptySources()).listing,
    },
  };
}

export function filterFccEbOrdersManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "citation", "docket", "caseNo", "documentId", "kind", "date", "title"].some((key) =>
      String(row[key] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadFccEbOrdersManifest(q?: string): Promise<Record<string, unknown>> {
  return filterFccEbOrdersManifest(buildFccEbOrdersManifest(readFccEbOrdersSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFccEbOrders()
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
            cards: snap.cards.map((card) => ({
              id: card.id,
              citation: card.citation,
              docket: card.docket,
              documentId: card.documentId,
              kind: card.kind,
              institution: card.institution,
              date: card.date,
              title: card.title,
              bodyChars: card.body.length,
              sourceUrl: card.sourceUrl,
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
