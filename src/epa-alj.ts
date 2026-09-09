#!/usr/bin/env node
/**
 * EPA OALJ Initial Decision and Order + substantive ALJ Order TEXT door.
 * Official PDFs linked from the Decisions and Orders e-docket
 * (yosemite.epa.gov/oarm/alj/alj_web_docket.nsf). 17 U.S.C. § 105.
 * Prefer merits Initial Decision PDFs; include substantive ALJ Order PDFs.
 * SKIP Consent Agreement and Final Order (CAFO) rows when they twin live
 * /fifra-orders / /epa-cafo RHC bags. Host is OALJ NSF, not RHC
 * oa/rhc/epaadmin.nsf.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const EPA_ALJ_PATH = "/epa-alj";
export const EPA_ALJ_MANIFEST_PATH = "/epa-alj/manifest.json";
export const EPA_ALJ_AMOUNT_ATOMIC = "50000";
export const EPA_ALJ_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "epa-alj-decision-bodies";
export const PRODUCT_NAME = "EPA OALJ Initial Decision and Order + ALJ Order text";

export const NSF_HOST = "yosemite.epa.gov";
export const NSF_PATH = "/oarm/alj/alj_web_docket.nsf";
export const LISTING_URL = `https://${NSF_HOST}${NSF_PATH}/Decisions+and+Orders?OpenView`;
export const PDF_ORIGIN = `https://${NSF_HOST}`;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "U.S. Environmental Protection Agency, Office of Administrative Law Judges. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const DOCKET_RE =
  /((?:CWA|CAA|RCRA|EPCRA|SDWA|TSCA|CERCLA|FIFRA|MM|MPRSA|HQ)-\d{2}-\d{4}-\d{4}(?:\([a-z]\))?)/i;
export const UNID_RE = /\/([0-9A-Fa-f]{32})(?:!OpenDocument|\/\$File\/)/;
export const MEDIA_RE =
  /\/oarm\/alj\/alj_web_docket\.nsf\/Decisions(?:\+|%20| )and(?:\+|%20| )Orders\/([A-Fa-f0-9]{32})\/\$File\/([^?#]+\.pdf)/i;
export const DOC_RE =
  /\/oarm\/alj\/alj_web_docket\.nsf\/[0-9A-Fa-f]+\/([0-9A-Fa-f]{32})!OpenDocument/i;
export const RHC_RE = /\/oa\/rhc\/epaadmin\.nsf/i;
export const CAFO_KIND_RE =
  /consent agreement and final order|consent agreement\s*\/?\s*final order|\bCAFO\b/i;
export const INITIAL_DECISION_RE = /initial decision(?:\s+and\s+order)?/i;
export const ALJ_ORDER_RE = /\bALJ Order\b|order on motion|order on respondent|order granting|order denying/i;
export const KEEP_KIND_RE = /initial decision|\bALJ Order\b/i;

export const WILSON_UNID = "33055BE9DA2755FA85258E650060F6AC";
export const PEPPERELL_UNID = "AE0F9C66A0B865E085258E6800595D1D";
export const WILSON_URL =
  "https://yosemite.epa.gov/oarm/alj/alj_web_docket.nsf/Decisions%20and%20Orders/33055BE9DA2755FA85258E650060F6AC/$File/2026-09-01%20-%20wilsons%20pest%20control%20-%20initial%20decision%20and%20order%20(final)%20issued.pdf";
export const PEPPERELL_URL =
  "https://yosemite.epa.gov/oarm/alj/alj_web_docket.nsf/Decisions%20and%20Orders/AE0F9C66A0B865E085258E6800595D1D/$File/2026-09-04%20-%20pepperell%20-%20order%20on%20motion%20to%20file%20out%20of%20time%20-%20signed.pdf";

export const CARD_FIELDS = [
  "id",
  "docket",
  "unid",
  "kind",
  "institution",
  "date",
  "title",
  "statute",
  "sourceUrl",
  "body",
] as const;

export const BODY_NEEDLE_SEED = "distributing or selling 10 different pesticides that were not registered";

export type EpaAljKind = "Initial Decision" | "ALJ Order";

export type EpaAljListing = {
  id: string;
  docket: string;
  unid: string;
  kind: EpaAljKind;
  institution: string;
  date: string | null;
  title: string;
  statute: string;
  sourceUrl: string;
  docUrl: string | null;
  pdfId: string;
};

export type EpaAljCard = EpaAljListing & { body: string };

export type EpaAljSnapshot = {
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
  cards: EpaAljCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (EPA OALJ public decisions; +https://yosemite.epa.gov/oarm/alj/alj_web_docket.nsf)";
const OFFICIAL_HOSTS = new Set(["yosemite.epa.gov"]);

export const SEED_LISTINGS: EpaAljListing[] = [
  {
    id: "FIFRA-07-2023-0135-2026-09-01",
    docket: "FIFRA-07-2023-0135",
    unid: WILSON_UNID,
    kind: "Initial Decision",
    institution: "Timothy Wilson d/b/a Wilson's Pest Control",
    date: "2026-09-01",
    title: "Initial Decision and Order",
    statute: "FIFRA",
    sourceUrl: WILSON_URL,
    docUrl: `https://${NSF_HOST}${NSF_PATH}/66dc56bdbc6f199f85256e86004869a7/${WILSON_UNID.toLowerCase()}!OpenDocument`,
    pdfId: WILSON_UNID,
  },
  {
    id: "CWA-01-2026-0030-2026-09-04",
    docket: "CWA-01-2026-0030",
    unid: PEPPERELL_UNID,
    kind: "ALJ Order",
    institution: "Pepperell, LLC",
    date: "2026-09-04",
    title: "Order on Motion to File Out of Time",
    statute: "CWA",
    sourceUrl: PEPPERELL_URL,
    docUrl: `https://${NSF_HOST}${NSF_PATH}/66dc56bdbc6f199f85256e86004869a7/${PEPPERELL_UNID.toLowerCase()}!OpenDocument`,
    pdfId: PEPPERELL_UNID,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function epaAljDir(): string {
  if (env("EPA_ALJ_DIR")) return resolve(env("EPA_ALJ_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/epa-alj"));
}

export function snapshotPath(): string {
  return join(epaAljDir(), "snapshot.json");
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

export function parseKind(raw: string): EpaAljKind | null {
  if (CAFO_KIND_RE.test(raw)) return null;
  if (INITIAL_DECISION_RE.test(raw)) return "Initial Decision";
  if (/\bALJ Order\b/i.test(raw) || ALJ_ORDER_RE.test(raw)) return "ALJ Order";
  return null;
}

export function catalogId(docket: string, date: string | null, unid: string): string {
  const dock = normalizeDocket(docket) || docket;
  if (date) return `${dock}-${date}`;
  return `${dock}-${unid.slice(0, 8).toLowerCase()}`;
}

export function encodeOfficialPath(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname
      .split("/")
      .map((part) => {
        if (part === "$File") return part;
        try {
          return encodeURIComponent(decodeURIComponent(part.replace(/\+/g, " ")));
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

export function officialEpaAljPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim().replace(/&amp;/g, "&"), PDF_ORIGIN);
    if (!OFFICIAL_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    if (RHC_RE.test(parsed.pathname)) return null;
    const path = decodeURIComponent(parsed.pathname.replace(/\+/g, " "));
    const media = path.match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
    if (!media) return null;
    const file = media[2].split("/").pop() || media[2];
    if (CAFO_KIND_RE.test(file) && !INITIAL_DECISION_RE.test(file)) return null;
    return `${PDF_ORIGIN}${NSF_PATH}/Decisions%20and%20Orders/${media[1].toUpperCase()}/$File/${encodeURI(file)}`;
  } catch {
    return null;
  }
}

export function officialDocUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim().replace(/&amp;/g, "&"), PDF_ORIGIN);
    if (!OFFICIAL_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    if (RHC_RE.test(parsed.pathname)) return null;
    if (!DOC_RE.test(parsed.pathname)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function unidFromUrl(url: string | null | undefined): string {
  const official = officialEpaAljPdfUrl(url) || url || "";
  const media = official.match(MEDIA_RE) || official.match(UNID_RE) || official.match(DOC_RE);
  return media ? media[1].toUpperCase() : official;
}

export function pdfIdFromUrl(url: string | null | undefined): string {
  return unidFromUrl(url);
}

export function isCafoTwin(text: string): boolean {
  if (!CAFO_KIND_RE.test(text)) return false;
  return !INITIAL_DECISION_RE.test(text);
}

export function isRhcSibling(text: string): boolean {
  return RHC_RE.test(text) && !/oarm\/alj\/alj_web_docket\.nsf/i.test(text);
}

export function isOshrcSibling(text: string): boolean {
  return /OCCUPATIONAL SAFETY AND HEALTH REVIEW COMMISSION|\bOSHRC\b/i.test(text) &&
    !/ENVIRONMENTAL PROTECTION AGENCY/i.test(text);
}

export function isRealEpaAljBody(text: string): boolean {
  if (isCafoTwin(text) || isRhcSibling(text) || isOshrcSibling(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  const initial = INITIAL_DECISION_RE.test(text);
  const alj = /\bALJ\b|Administrative Law Judge|ORDER ON MOTION|SO ORDERED/i.test(text);
  const min = initial ? 2500 : 1500;
  if (compact.length < min) return false;
  const epa =
    /UNITED STATES\s+ENVIRONME?N?TAL PROTECTION AGENCY|U\.S\.\s+Environmental Protection Agency|BEFORE THE ADMINISTRATOR/i.test(
      text,
    );
  const kind = initial || (alj && /40 C\.F\.R\.?\s*(Part\s*)?22|Presiding Officer|SO ORDERED/i.test(text));
  const docket = DOCKET_RE.test(text);
  return epa && kind && docket;
}

export function parseDecisionsView(html: string): EpaAljListing[] {
  const out: EpaAljListing[] = [];
  const seen = new Set<string>();
  const rows = html.split(/<tr\b/i).slice(1);
  for (const row of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((m) => stripTags(m[1]))
      .filter((c) => c.length > 0);
    if (cells.length < 4) continue;
    const date = isoDate(cells[0]);
    const institution = cells[1];
    const kindLabel = cells[2];
    const docket = normalizeDocket(cells[3] || row);
    const kind = parseKind(kindLabel);
    const href = officialDocUrl(
      (row.match(/href="([^"]+!OpenDocument[^"]*)"/i) || [])[1],
    );
    const unid = href ? unidFromUrl(href) : "";
    if (!institution || !docket || !kind || !href || !unid) continue;
    if (CAFO_KIND_RE.test(kindLabel)) continue;
    const id = catalogId(docket, date, unid);
    if (seen.has(id) || seen.has(unid)) continue;
    seen.add(id);
    seen.add(unid);
    out.push({
      id,
      docket,
      unid,
      kind,
      institution,
      date,
      title: kind === "Initial Decision" ? "Initial Decision and Order" : kindLabel || "ALJ Order",
      statute: statuteFromDocket(docket),
      sourceUrl: "",
      docUrl: href,
      pdfId: unid,
    });
  }
  out.sort((a, b) => {
    const kindRank = (k: EpaAljKind) => (k === "Initial Decision" ? 0 : 1);
    const byKind = kindRank(a.kind) - kindRank(b.kind);
    if (byKind !== 0) return byKind;
    return `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`);
  });
  return out;
}

export function parseDocumentPageHtml(html: string): string | null {
  const hrefs = [...html.matchAll(/href="([^"]+\$File\/[^"]+\.pdf[^"]*)"/gi)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
  for (const href of hrefs) {
    const official = officialEpaAljPdfUrl(href);
    if (official) return official;
  }
  return null;
}

export function parseEpaAljText(
  text: string,
  meta: Partial<EpaAljListing> & { sourceUrl: string },
): EpaAljCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialEpaAljPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket =
    normalizeDocket(meta.docket) ||
    normalizeDocket(body.match(DOCKET_RE)?.[0] ?? "") ||
    meta.unid ||
    "unknown";
  const date = meta.date ?? isoDate(body.slice(0, 4000));
  const unid = (meta.unid || pdfIdFromUrl(sourceUrl)).toUpperCase();
  const kind = meta.kind || parseKind(`${meta.title ?? ""} ${body.slice(0, 2500)}`) || "ALJ Order";
  return {
    id: meta.id || catalogId(docket, date, unid),
    docket,
    unid,
    kind,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date,
    title: meta.title || (kind === "Initial Decision" ? "Initial Decision and Order" : "ALJ Order"),
    statute: meta.statute || statuteFromDocket(docket),
    sourceUrl,
    docUrl: meta.docUrl ?? null,
    pdfId: meta.pdfId || unid,
    body,
  };
}

function emptySources(): EpaAljSnapshot["sources"] {
  return { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}${NSF_PATH}/Decisions%20and%20Orders/` };
}

export function emptyEpaAljSnapshot(reason: string): EpaAljSnapshot {
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

export function assembleEpaAljSnapshot(cards: EpaAljCard[], fetchedAt?: string): EpaAljSnapshot {
  const kept = cards.filter((c) => isRealEpaAljBody(c.body));
  kept.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
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
    reason: kept.length ? null : "Official EPA OALJ Decision/Order PDFs had no extractable decision text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): EpaAljSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as EpaAljSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleEpaAljSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readEpaAljSnapshot(): EpaAljSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeEpaAljSnapshot(snap: EpaAljSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchEpaAljText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchEpaAljBytes(url: string): Promise<Uint8Array> {
  const official = encodeOfficialPath(officialEpaAljPdfUrl(url) || url);
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("EPA_ALJ_PDFTOTEXT") || "pdftotext";
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
  return env("EPA_ALJ_HTML_DIR") || env("EPA_ALJ_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("EPA_ALJ_LIMIT", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxFetchLimit(): number {
  const n = Number(env("EPA_ALJ_MAX_FETCH", "12"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 12;
}

function viewCount(): number {
  const n = Number(env("EPA_ALJ_VIEW_COUNT", "80"));
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

function mergeListings(listed: EpaAljListing[]): EpaAljListing[] {
  const seen = new Set<string>();
  const out: EpaAljListing[] = [];
  for (const row of [...SEED_LISTINGS, ...listed]) {
    const id = row.id || catalogId(row.docket, row.date, row.unid);
    if (!id || seen.has(id) || seen.has(row.unid)) continue;
    seen.add(id);
    seen.add(row.unid);
    out.push({ ...row, id });
  }
  out.sort((a, b) => {
    const kindRank = (k: EpaAljKind) => (k === "Initial Decision" ? 0 : 1);
    const byKind = kindRank(a.kind) - kindRank(b.kind);
    if (byKind !== 0) return byKind;
    return `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`);
  });
  return out;
}

export function listingPageUrl(count = viewCount()): string {
  return `${LISTING_URL}&Count=${count}`;
}

export async function walkOfficialEpaAlj(opts?: {
  fetchText?: (url: string) => Promise<string>;
  count?: number;
}): Promise<{ listed: EpaAljListing[]; listedCount: number }> {
  const fetchText = opts?.fetchText ?? fetchEpaAljText;
  const html = await fetchText(listingPageUrl(opts?.count ?? viewCount()));
  const listed = parseDecisionsView(html);
  return { listed: mergeListings(listed), listedCount: Math.max(listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: EpaAljListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = html ? parseDecisionsView(html) : [];
    return { listed: mergeListings(listed), listedCount: listed.length };
  }
  try {
    const walked = await walkOfficialEpaAlj();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function resolveSourceUrl(row: EpaAljListing, dir: string, fetchText: (url: string) => Promise<string>): Promise<string> {
  if (officialEpaAljPdfUrl(row.sourceUrl)) return officialEpaAljPdfUrl(row.sourceUrl) as string;
  const localDoc = readNamedFile(dir, [
    `${row.id.toLowerCase()}-doc.html`,
    `${row.unid.toLowerCase()}-doc.html`,
    row.id === "FIFRA-07-2023-0135-2026-09-01" ? "wilson-doc.html" : "",
    row.id === "CWA-01-2026-0030-2026-09-04" ? "pepperell-doc.html" : "",
  ].filter(Boolean));
  if (localDoc) {
    const fromLocal = parseDocumentPageHtml(localDoc);
    if (fromLocal) return fromLocal;
  }
  if (row.docUrl) {
    const fromLive = parseDocumentPageHtml(await fetchText(row.docUrl));
    if (fromLive) return fromLive;
  }
  throw new Error(`no official OALJ PDF for ${row.id}`);
}

export async function collectEpaAlj(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<EpaAljSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = epaAljDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, EpaAljCard>();
  for (const card of readEpaAljSnapshot()?.cards ?? []) {
    if (isRealEpaAljBody(card.body)) prior.set(card.id, card);
  }
  const cards: EpaAljCard[] = [];
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
        `${row.id}.txt`,
        `${row.id.toLowerCase()}.txt`,
        `${row.docket}.txt`,
        `${row.unid}.txt`,
      ]);
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = localText
        ? row.sourceUrl || SEED_LISTINGS.find((s) => s.id === row.id)?.sourceUrl || row.sourceUrl
        : await resolveSourceUrl(row, dir, fetchEpaAljText);
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id.replace(/[^\w.-]+/g, "_")}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchEpaAljBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseEpaAljText(text, { ...row, sourceUrl: sourceUrl || row.sourceUrl });
      if (!isRealEpaAljBody(parsed.body)) {
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
    ...assembleEpaAljSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeEpaAljSnapshot(snap);
  return snap;
}

export async function loadEpaAlj(): Promise<EpaAljSnapshot> {
  const cached = readEpaAljSnapshot();
  if (cached && cached.cards.some((c) => isRealEpaAljBody(c.body))) return cached;
  try {
    return await collectEpaAlj();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live EPA OALJ Decision/Order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyEpaAljSnapshot(
      `EPA OALJ Decision/Order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildEpaAljManifest(snap: EpaAljSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealEpaAljBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      EPA_ALJ_PATH,
      "Count + case + docket + date + label only. Decision body is the paid GET /epa-alj payload. This free manifest lists the full catalog. Skip CAFO rows that twin live /fifra-orders / /epa-cafo RHC bags. Host is OALJ NSF, not RHC.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: EPA_ALJ_AMOUNT_ATOMIC,
    oneAmountAtomic: EPA_ALJ_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      docket: c.docket,
      kind: c.kind,
      date: c.date,
      title: c.title,
      statute: c.statute,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "docket", "kind", "date", "title", "statute", "sourceUrl"] },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterEpaAljManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "docket", "kind", "date", "title", "statute", "sourceUrl"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadEpaAljManifest(q?: string): Promise<Record<string, unknown>> {
  return filterEpaAljManifest(buildEpaAljManifest(readEpaAljSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectEpaAlj()
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
              kind: c.kind,
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
