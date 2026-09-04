#!/usr/bin/env node
/**
 * EPA Part 22 CAFO / ESA administrative penalty letter TEXT door.
 * Official CAFO / ESA / Complaint+Final Order PDFs linked from the
 * Administrative Enforcement Dockets board (yosemite.epa.gov Filings +
 * All Dockets / Dockets by Statute) and regional epa.gov/system/files
 * mirrors hosting the same letter body. 17 U.S.C. § 105.
 * Prefer full letter PDF text. Do not sell ECHO JSON, ICIS-FE&C CSV,
 * HQ settlement-summary HTML, NPDES permit PDFs (/npdes-permits),
 * FIFRA-only packs (/fifra-orders), or Superfund RODs (/superfund-rods).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const EPA_CAFO_PATH = "/epa-cafo";
export const EPA_CAFO_MANIFEST_PATH = "/epa-cafo/manifest.json";
export const EPA_CAFO_AMOUNT_ATOMIC = "50000";
export const EPA_CAFO_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "epa-cafo-letter-bodies";
export const PRODUCT_NAME = "EPA Part 22 CAFO / ESA administrative penalty letter text";

export const LISTING_URL = "https://yosemite.epa.gov/oa/rhc/epaadmin.nsf";
export const FILINGS_VIEW_URL = "https://yosemite.epa.gov/oa/rhc/epaadmin.nsf/Filings?OpenView";
export const DOCKET_TABLE_URL =
  "https://yosemite.epa.gov/oa/rhc/epaadmin.nsf/Dockets+by+Statute?OpenView";
export const HQ_COMPANION_URL = "https://www.epa.gov/enforcement/civil-cases-and-settlements";
export const PDF_ORIGIN = "https://yosemite.epa.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "U.S. Environmental Protection Agency. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const DOCKET_RE =
  /((?:CWA|CAA|RCRA|EPCRA|SDWA|TSCA|CERCLA|MM|MPRSA)-\d{2}-\d{4}-\d{4}(?:\([a-z]\))?)/i;
export const FIFRA_DOCKET_RE = /(FIFRA-\d{2}-\d{4}-\d{4}(?:\([a-z]\))?)/i;
export const MEDIA_RE = /\/OA\/RHC\/EPAAdmin\.nsf\/Filings\/([A-Fa-f0-9]+)\/\$File\/([^?#]+\.pdf)/i;
export const FILING_DOC_RE = /\/oa\/rhc\/epaadmin\.nsf\/Filings\/([A-Fa-f0-9]+)\?OpenDocument/i;
export const DOCKET_DOC_RE = /\/oa\/rhc\/epaadmin\.nsf\/[0-9a-f]+\/[0-9a-f]+!OpenDocument/i;
export const ORDER_KIND_RE =
  /consent agreement and final order|consent agreement\s*\/?\s*final order|complaint.{0,40}final order|\bCAFO\b|expedited settlement(?: agreement)?(?: and final order)?|\bESA\b/i;
export const COMPLAINT_ONLY_RE = /\bcomplaint\b/i;
export const REFUSAL_RE = /Notice of Refusal of Admission|Green Card|ADR|Answer|Attachment #/i;

export const WALK_STATUTES = ["CWA", "CAA", "RCRA", "EPCRA", "SDWA", "TSCA", "CERCLA"] as const;
export const SKIP_STATUTES = ["FIFRA"] as const;

export const CARD_FIELDS = [
  "id",
  "docket",
  "pdfId",
  "institution",
  "date",
  "title",
  "statute",
  "sourceUrl",
  "body",
] as const;

export const BODY_NEEDLE_SEED = "Notice of Change of Ownership on December 11, 2023";

export type EpaCafoListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  statute: string;
  sourceUrl: string;
  pdfId: string;
};

export type EpaCafoCard = EpaCafoListing & { body: string };

export type EpaCafoSnapshot = {
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
  sources: { listing: string; filings: string; pdfHost: string; hqCompanion: string };
  cards: EpaCafoCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (EPA CAFO public letters; +https://yosemite.epa.gov/oa/rhc/epaadmin.nsf)";
const OFFICIAL_HOSTS = new Set(["yosemite.epa.gov", "www.epa.gov", "epa.gov"]);
const YOSEMITE_HOSTS = new Set(["yosemite.epa.gov"]);
const SYSTEM_FILES_RE = /^\/system\/files\/documents\/.+\.pdf$/i;

export const SEED_LISTINGS: EpaCafoListing[] = [
  {
    id: "CWA-06-2026-1792",
    docket: "CWA-06-2026-1792",
    institution: "Apache Feedyard",
    date: "2026-07-14",
    title: "Complaint, Consent Agreement and Final Order",
    statute: "CWA",
    sourceUrl:
      "https://www.epa.gov/system/files/documents/2026-07/apache-feedyard_nmg010040_cwa0620261792_07142026.pdf",
    pdfId: "apache-feedyard_nmg010040_cwa0620261792_07142026.pdf",
  },
  {
    id: "MM-09-2026-0093",
    docket: "MM-09-2026-0093",
    institution: "Camino Real Foods, Inc.",
    date: "2026-05-29",
    title: "Consent Agreement and Final Order",
    statute: "MM",
    sourceUrl:
      "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/1FAA7240561D1C6B85258E09003C701D/$File/Camino%20Real%20Food%20Inc.%20(MM-09-2026-0093)-Filed%20CAFO.pdf",
    pdfId: "1FAA7240561D1C6B85258E09003C701D",
  },
  {
    id: "CWA-07-2026-0005",
    docket: "CWA-07-2026-0005",
    institution: "D&S Cattle Company, LLC",
    date: "2026-01-01",
    title: "Complaint and Consent Agreement / Final Order",
    statute: "CWA",
    sourceUrl: "https://www.epa.gov/system/files/documents/2026-01/d-s-cafo.pdf",
    pdfId: "d-s-cafo.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function epaCafoDir(): string {
  if (env("EPA_CAFO_DIR")) return resolve(env("EPA_CAFO_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/epa-cafo"));
}

export function snapshotPath(): string {
  return join(epaCafoDir(), "snapshot.json");
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
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

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const hit = raw.match(DOCKET_RE);
  return hit ? hit[1].toUpperCase() : null;
}

export function statuteFromDocket(docket: string | null | undefined): string {
  const d = normalizeDocket(docket);
  return d ? d.split("-")[0] : "";
}

export function encodeOfficialPath(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname
      .split("/")
      .map((part) => {
        if (part === "$File") return part;
        try {
          return encodeURIComponent(decodeURIComponent(part));
        } catch {
          return encodeURIComponent(part);
        }
      })
      .join("/");
    return parsed.href;
  } catch {
    return url;
  }
}

export function officialEpaCafoPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  try {
    const parsed = new URL(trimmed, PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org" || host === "echo.epa.gov" || host === "www.federalregister.gov") {
      return null;
    }
    if (!OFFICIAL_HOSTS.has(host)) return null;
    if (parsed.pathname.includes("/enforcement/civil-cases-and-settlements")) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (YOSEMITE_HOSTS.has(host)) {
      const media = path.match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
      if (!media) return null;
      const file = media[2].split("/").pop() || media[2];
      if (COMPLAINT_ONLY_RE.test(file) && !ORDER_KIND_RE.test(file)) return null;
      if (FIFRA_DOCKET_RE.test(file) && !DOCKET_RE.test(file)) return null;
      return `${PDF_ORIGIN}/OA/RHC/EPAAdmin.nsf/Filings/${media[1].toUpperCase()}/$File/${file}`;
    }
    if (SYSTEM_FILES_RE.test(parsed.pathname)) {
      if (/npdes.?permit|permit-final|final-permit/i.test(parsed.pathname) && !/cafo|esa|consent/i.test(parsed.pathname)) {
        return null;
      }
      return `https://www.epa.gov${parsed.pathname}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string {
  const official = officialEpaCafoPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = decodeURIComponent(parsed.pathname).match(MEDIA_RE);
    if (media) return media[1].toUpperCase();
    const file = parsed.pathname.split("/").pop() || "";
    return file.replace(/\.pdf$/i, "") || official;
  } catch {
    return official;
  }
}

export function parseOrderTitle(raw: string): string {
  if (/complaint.{0,40}consent agreement.{0,40}final order/i.test(raw)) {
    return "Complaint, Consent Agreement and Final Order";
  }
  if (/CONSENT AGREEMENT AND FINAL ORDER/i.test(raw) || /\bCAFO\b/i.test(raw)) {
    return "Consent Agreement and Final Order";
  }
  if (/EXPEDITED SETTLEMENT/i.test(raw) || /\bESA\b/.test(raw)) return "Expedited Settlement Agreement";
  if (/CONSENT AGREEMENT/i.test(raw) && /Final Order/i.test(raw)) {
    return "Consent Agreement and Final Order";
  }
  return "Consent Agreement and Final Order";
}

export function isEchoJsonDump(text: string): boolean {
  const compact = text.trim();
  if (!(compact.startsWith("{") || compact.startsWith("["))) return false;
  return /"RegistryId"|"FacName"|"ECHO"|"ICIS"/i.test(compact);
}

export function isIcisFecDump(text: string): boolean {
  return /ACTIVITY_ID,REGISTRY_ID,FACILITY_NAME/i.test(text) || /\bICIS-FE&C\b/i.test(text);
}

export function isHqSettlementHtml(text: string): boolean {
  return (
    /civil-cases-and-settlements/i.test(text) &&
    /<html/i.test(text) &&
    !/CONSENT AGREEMENT AND FINAL ORDER/i.test(text)
  );
}

export function isNpdesPermitDump(text: string): boolean {
  const permit = /AUTHORIZATION TO DISCHARGE UNDER THE NATIONAL POLLUTANT DISCHARGE ELIMINATION SYSTEM/i.test(
    text,
  );
  const letter = ORDER_KIND_RE.test(text) && /40 C\.F\.R\.?\s*(Part\s*)?22/i.test(text);
  return permit && !letter;
}

export function isFifraOnlyDump(text: string): boolean {
  const fifra = FIFRA_DOCKET_RE.test(text) && /Federal Insecticide,? Fungicide, and Rodenticide Act|\bFIFRA\b/i.test(text);
  const other = DOCKET_RE.test(text);
  return fifra && !other;
}

export function isSuperfundRodDump(text: string): boolean {
  return /RECORD OF DECISION/i.test(text) && /DECLARATION/i.test(text) && /\b(CERCLA|Superfund)\b/i.test(text);
}

export function isIndexChrome(text: string): boolean {
  return /EPA Administrative Enforcement Dockets/i.test(text) && /<html/i.test(text) && text.length < 20000;
}

export function isCoverLetterOnly(text: string): boolean {
  const compact = text.replace(/\s+/g, " ").trim();
  return (
    compact.length < 1800 &&
    /Attached for your files is a copy of the Expedited Settlement Agreement/i.test(text)
  );
}

export function isRealEpaCafoBody(text: string): boolean {
  if (
    isEchoJsonDump(text) ||
    isIcisFecDump(text) ||
    isHqSettlementHtml(text) ||
    isNpdesPermitDump(text) ||
    isFifraOnlyDump(text) ||
    isSuperfundRodDump(text) ||
    isIndexChrome(text) ||
    isCoverLetterOnly(text)
  ) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 1500) return false;
  const epa =
    /UNITED STATES ENVIRONME?N?TAL PROTECTION AGENCY|U\.S\.\s+Environmental Protection Agency|U\.S\.\s+EPA\s+REGION/i.test(
      text,
    );
  const kind =
    /CONSENT AGREEMENT AND FINAL ORDER/i.test(text) ||
    /CONSENT AGREEMENT\s*\/\s*FINAL ORDER/i.test(text) ||
    /\bCAFO\b/i.test(text) ||
    (/CONSENT AGREEMENT/i.test(text) && /Final Order/i.test(text)) ||
    /EXPEDITED SETTLEMENT AGREEMENT/i.test(text) ||
    /Complaint and Consent Agreement and\s+Final Order/i.test(text);
  const docket = DOCKET_RE.test(text);
  const part22 = /40 C\.F\.R\.?\s*(Part\s*)?22|Consolidated Rules of Practice|Class [I12] (?:civil )?administrative penalty/i.test(
    text,
  );
  return epa && kind && docket && (part22 || compact.length > 3000);
}

export function officialHtmlUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim().replace(/&amp;/g, "&"), PDF_ORIGIN);
    if (!YOSEMITE_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function parseFilingsHtml(html: string): { href: string; label: string; date: string | null }[] {
  const out: { href: string; label: string; date: string | null }[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+Filings\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = stripTags(m[2]);
    const href = officialHtmlUrl(m[1]);
    if (!href || !FILING_DOC_RE.test(href)) continue;
    if (REFUSAL_RE.test(label) && !ORDER_KIND_RE.test(label)) continue;
    if (!ORDER_KIND_RE.test(label)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ href, label, date: isoDate(label) });
  }
  return out;
}

export function parseDocketTableHtml(html: string, statute: string): { href: string; institution: string; date: string | null }[] {
  const rows: { href: string; institution: string; date: string | null }[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+!OpenDocument[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = officialHtmlUrl(m[1]);
    const institution = stripTags(m[2]);
    if (!href || !DOCKET_DOC_RE.test(href) || !institution) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    rows.push({ href, institution, date: isoDate(institution) });
  }
  if (!rows.length) return rows;
  return rows.map((r) => ({ ...r, institution: r.institution || statute }));
}

export function parseDocketPageHtml(html: string): {
  institution: string;
  docket: string | null;
  date: string | null;
  filingHref: string | null;
  title: string;
  statute: string;
} {
  const text = stripTags(html);
  const docket = normalizeDocket(text);
  const after = (text.split(/EPA Administrative Enforcement Dockets/i).pop() || text).trim();
  const beforeDocket = after.split(/Docket Number:|U\.S\.\s+EPA Docket No/i)[0]?.trim() ?? "";
  const institution = beforeDocket.replace(/\s+/g, " ").replace(/^(.*)\s+\1$/i, "$1").slice(0, 160).trim();
  let filingHref: string | null = null;
  let title = parseOrderTitle(text);
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+Filings\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = stripTags(m[2]);
    const href = officialHtmlUrl(m[1]);
    if (!href || !FILING_DOC_RE.test(href)) continue;
    if (REFUSAL_RE.test(label) && !ORDER_KIND_RE.test(label)) continue;
    if (ORDER_KIND_RE.test(label)) {
      filingHref = href;
      title = parseOrderTitle(label);
      break;
    }
  }
  const date =
    isoDate((html.match(/Closed Date:\s*<\/strong>\s*([^<]+)/i) || [])[1]) ||
    isoDate((html.match(/\((\d{2}\/\d{2}\/\d{4})\)\s*#\d+\s*(?:Consent|CAFO|Expedited)/i) || [])[1]) ||
    isoDate(text);
  return { institution, docket, date, filingHref, title, statute: statuteFromDocket(docket) };
}

export function parseFilingPageHtml(html: string): string | null {
  const hrefs = [...html.matchAll(/href="([^"]+\$File\/[^"]+\.pdf[^"]*)"/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    const official = officialEpaCafoPdfUrl(href.replace(/&amp;/g, "&"));
    if (official) return official;
  }
  return null;
}

export function parseEpaCafoText(
  text: string,
  meta: Partial<EpaCafoListing> & { sourceUrl: string },
): EpaCafoCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialEpaCafoPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket =
    normalizeDocket(meta.docket) ||
    normalizeDocket(body.match(DOCKET_RE)?.[0] ?? "") ||
    meta.pdfId ||
    "unknown";
  return {
    id: normalizeDocket(meta.id) || docket,
    docket,
    pdfId: meta.pdfId || pdfIdFromUrl(sourceUrl),
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 4000)),
    title: meta.title || parseOrderTitle(body),
    statute: meta.statute || statuteFromDocket(docket),
    sourceUrl,
    body,
  };
}

function emptySources(): EpaCafoSnapshot["sources"] {
  return {
    listing: LISTING_URL,
    filings: FILINGS_VIEW_URL,
    pdfHost: `${PDF_ORIGIN}/OA/RHC/EPAAdmin.nsf/Filings/`,
    hqCompanion: HQ_COMPANION_URL,
  };
}

export function emptyEpaCafoSnapshot(reason: string): EpaCafoSnapshot {
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

export function assembleEpaCafoSnapshot(cards: EpaCafoCard[], fetchedAt?: string): EpaCafoSnapshot {
  const kept = cards.filter((c) => isRealEpaCafoBody(c.body));
  kept.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  const asOf =
    kept
      .map((c) => c.date)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: kept.length ? "ok" : "empty",
    reason: kept.length ? null : "Official EPA CAFO / ESA letter PDFs had no extractable letter text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): EpaCafoSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as EpaCafoSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleEpaCafoSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readEpaCafoSnapshot(): EpaCafoSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeEpaCafoSnapshot(snap: EpaCafoSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchEpaText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" } });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchEpaBytes(url: string): Promise<Uint8Array> {
  const official = encodeOfficialPath(officialEpaCafoPdfUrl(url) || url);
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("EPA_CAFO_PDFTOTEXT") || "pdftotext";
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

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function listingDir(): string {
  return env("EPA_CAFO_HTML_DIR") || env("EPA_CAFO_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("EPA_CAFO_LIMIT", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxFetchLimit(): number {
  const n = Number(env("EPA_CAFO_MAX_FETCH", "12"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 12;
}

function maxDockets(): number {
  const n = Number(env("EPA_CAFO_MAX_DOCKETS", "40"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 40;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: EpaCafoListing[]): EpaCafoListing[] {
  const seen = new Set<string>();
  const out: EpaCafoListing[] = [];
  for (const row of [...SEED_LISTINGS, ...listed]) {
    const id = normalizeDocket(row.id) || row.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ ...row, id, docket: normalizeDocket(row.docket) || id });
  }
  return out;
}

export async function walkOfficialEpaCafo(opts?: {
  pauseMs?: number;
  maxDockets?: number;
  fetchText?: (url: string) => Promise<string>;
}): Promise<{ listed: EpaCafoListing[]; listedCount: number }> {
  const pauseMs = opts?.pauseMs ?? 200;
  const docketCap = opts?.maxDockets ?? maxDockets();
  const fetchText = opts?.fetchText ?? fetchEpaText;
  const listed: EpaCafoListing[] = [];
  const seen = new Set<string>();
  let listedCount = 0;

  const take = (row: EpaCafoListing) => {
    if (seen.has(row.id)) return;
    if (FIFRA_DOCKET_RE.test(row.docket) && !DOCKET_RE.test(row.docket)) return;
    seen.add(row.id);
    listed.push(row);
  };

  let dockets = 0;
  for (const statute of WALK_STATUTES) {
    if (dockets >= docketCap) break;
    const tableUrl = `${DOCKET_TABLE_URL}&RestrictToCategory=${statute}`;
    let tableHtml: string;
    try {
      tableHtml = await fetchText(tableUrl);
    } catch {
      continue;
    }
    const rows = parseDocketTableHtml(tableHtml, statute);
    listedCount += rows.length;
    for (const row of rows) {
      if (dockets >= docketCap) break;
      dockets += 1;
      if (pauseMs) await pause(pauseMs);
      let page;
      try {
        page = parseDocketPageHtml(await fetchText(row.href));
      } catch {
        continue;
      }
      if (!page.filingHref || !page.docket) continue;
      if (pauseMs) await pause(pauseMs);
      let sourceUrl: string | null = null;
      try {
        sourceUrl = parseFilingPageHtml(await fetchText(page.filingHref));
      } catch {
        continue;
      }
      if (!sourceUrl) continue;
      take({
        id: page.docket,
        docket: page.docket,
        institution: page.institution || row.institution,
        date: page.date ?? row.date,
        title: page.title,
        statute: page.statute || statute,
        sourceUrl,
        pdfId: pdfIdFromUrl(sourceUrl),
      });
    }
  }
  return { listed: mergeListings(listed), listedCount: Math.max(listedCount, listed.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: EpaCafoListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const fromFilings = html ? parseFilingsHtml(html) : [];
    const listed: EpaCafoListing[] = fromFilings.map((row, i) => ({
      id: `fixture-${i + 1}`,
      docket: `fixture-${i + 1}`,
      institution: row.label,
      date: row.date,
      title: parseOrderTitle(row.label),
      statute: "",
      sourceUrl: row.href,
      pdfId: pdfIdFromUrl(row.href),
    }));
    return { listed: mergeListings(listed), listedCount: listed.length };
  }
  try {
    const walked = await walkOfficialEpaCafo();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectEpaCafo(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<EpaCafoSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = epaCafoDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, EpaCafoCard>();
  for (const card of readEpaCafoSnapshot()?.cards ?? []) {
    if (isRealEpaCafoBody(card.body)) prior.set(card.id, card);
  }
  const cards: EpaCafoCard[] = [];
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
        `${row.id.toLowerCase()}.txt`,
        `${row.docket.toLowerCase()}.txt`,
        `${row.pdfId}.txt`,
      ]);
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.docket.replace(/[^\w.-]+/g, "_")}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchEpaBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseEpaCafoText(text, row);
      if (!isRealEpaCafoBody(parsed.body)) {
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
    ...assembleEpaCafoSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeEpaCafoSnapshot(snap);
  return snap;
}

export async function loadEpaCafo(): Promise<EpaCafoSnapshot> {
  const cached = readEpaCafoSnapshot();
  if (cached && cached.cards.some((c) => isRealEpaCafoBody(c.body))) return cached;
  try {
    return await collectEpaCafo();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live EPA CAFO / ESA letter fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyEpaCafoSnapshot(
      `EPA CAFO / ESA letter PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildEpaCafoManifest(snap: EpaCafoSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealEpaCafoBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      EPA_CAFO_PATH,
      "Count + institution + docket + date + official PDF URL only. Letter body is the paid GET /epa-cafo payload. This free manifest lists the full catalog. HQ civil-cases HTML is chrome. Skip ECHO JSON, ICIS-FE&C, NPDES permits, FIFRA-only packs, and Superfund RODs.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: EPA_CAFO_AMOUNT_ATOMIC,
    oneAmountAtomic: EPA_CAFO_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      docket: c.docket,
      date: c.date,
      title: c.title,
      statute: c.statute,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "docket", "date", "title", "statute", "sourceUrl"] },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterEpaCafoManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "docket", "date", "title", "statute", "sourceUrl"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadEpaCafoManifest(q?: string): Promise<Record<string, unknown>> {
  return filterEpaCafoManifest(buildEpaCafoManifest(readEpaCafoSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectEpaCafo()
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
              statute: c.statute,
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
