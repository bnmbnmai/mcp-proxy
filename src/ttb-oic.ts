/**
 * TTB institution/company Offer in Compromise TEXT door.
 * Official Abstract and Statement PDFs from ttb.gov only.
 * Does not invent order text. Page-1 is often a scan; tesseract --psm 6 is OK.
 * Institution/company only. Not people. Not the press teaser.
 * Not De Novo /denovo-orders. Not FIFRA /fifra-orders. Not CFTC /cftc-orders.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TTB_OIC_PATH = "/ttb-oic";
export const TTB_OIC_MANIFEST_PATH = "/ttb-oic/manifest.json";
export const TTB_OIC_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "ttb-institution-oic-bodies";
export const PRODUCT_NAME = "TTB Offer in Compromise text";

export const LISTING_URL = "https://www.ttb.gov/business-central/fo/administrative-cases";
export const PDF_HOST = "www.ttb.gov";
export const PDF_ORIGIN = "https://www.ttb.gov";
export const DOCKET_BARE_RE = /^([A-Za-z0-9][A-Za-z0-9._-]{3,80})$/;
export const MEDIA_RE = /\/system\/files\/(\d{4}-\d{2})\/([^/?#]+\.pdf)/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "TTB";

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

export type TtbOicListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type TtbOicListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type TtbOicCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type TtbOicSnapshot = {
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
  cards: TtbOicCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (TTB public institution OIC; +https://www.ttb.gov/business-central/fo/administrative-cases)";
const OFFICIAL_HOSTS = new Set(["www.ttb.gov", "ttb.gov"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.P\.|LP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|Enterprise|Brewery|Brewing|Spirits|Cafe|Café)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;

export const SEED_LISTINGS: TtbOicListing[] = [
  {
    id: "21st-amendment",
    docket: "21st-amendment",
    institution: "The 21st Amendment Brewery Cafe, LLC",
    date: "2026-06-30",
    title: "Offer in Compromise",
    sourceUrl: "https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
    pdfId: "ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
  },
  {
    id: "delmic-enterprise",
    docket: "delmic-enterprise",
    institution: "Delmic Enterprise LLC",
    date: "2026-06-16",
    title: "Offer in Compromise",
    sourceUrl: "https://www.ttb.gov/system/files/2026-06/ABSMT_Delmic_Enterprise_Redacted.pdf",
    pdfId: "ABSMT_Delmic_Enterprise_Redacted.pdf",
  },
  {
    id: "societe-brewing",
    docket: "societe-brewing",
    institution: "Societe Brewing Company, LLC",
    date: "2026-01-06",
    title: "Offer in Compromise",
    sourceUrl: "https://www.ttb.gov/system/files/2026-06/Societe_Brewing_Company_OICD_Redacted.pdf",
    pdfId: "Societe_Brewing_Company_OICD_Redacted.pdf",
  },
  {
    id: "satellite-spirits",
    docket: "satellite-spirits",
    institution: "Satellite Spirits Inc.",
    date: "2025-12-10",
    title: "Offer in Compromise",
    sourceUrl: "https://www.ttb.gov/system/files/2025-12/Satellite_Spirits_OIC_Redacted.pdf",
    pdfId: "Satellite_Spirits_OIC_Redacted.pdf",
  },
  {
    id: "workhorse-brewing",
    docket: "workhorse-brewing",
    institution: "Workhorse Brewing Company, Inc.",
    date: "2025-11-30",
    title: "Offer in Compromise",
    sourceUrl: "https://www.ttb.gov/system/files/2025-12/Workhorse_Brewery_DAAFO_11_20_25_Redacted.pdf",
    pdfId: "Workhorse_Brewery_DAAFO_11_20_25_Redacted.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ttbOicDir(): string {
  if (env("TTB_OIC_DIR")) return resolve(env("TTB_OIC_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ttb-oic"));
}

export function snapshotPath(): string {
  return join(ttbOicDir(), "snapshot.json");
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
      january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
      july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
    };
    const mm = months[named[1].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
  }
  return null;
}

export function officialTtbOicPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org" || host === "federalregister.gov" || host === "www.federalregister.gov") return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const media = decodeURIComponent(parsed.pathname).match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
    if (!media) return null;
    return `${PDF_ORIGIN}/system/files/${media[1]}/${media[2]}`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialTtbOicPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = parsed.pathname.match(MEDIA_RE);
    return media?.[2] ?? null;
  } catch {
    return null;
  }
}

export function slugFromUrl(url: string): string {
  const file = pdfIdFromUrl(url) || "";
  return file.replace(/\.pdf$/i, "").replace(/_Redacted$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (DOCKET_BARE_RE.test(trimmed) && !/\s/.test(trimmed)) return trimmed;
  return null;
}

export function isPeopleRow(row: TtbOicListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isInstitutionOrderRow(row: TtbOicListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!officialTtbOicPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`;
  if (!/OIC|Offer|ABSTMT|ABSMT|Compromise/i.test(kind) && !MEDIA_RE.test(kind)) return false;
  return true;
}

export function parseListingRows(rows: TtbOicListingRow[]): TtbOicListing[] {
  const found: TtbOicListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const sourceUrl = officialTtbOicPdfUrl(row.sourceUrl ?? "");
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
      title: "Offer in Compromise",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): TtbOicListing[] {
  const rows: TtbOicListingRow[] = [];
  const links = [
    ...html.matchAll(
      /(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})[\s\S]{0,240}?<a[^>]+href="([^"]+\.pdf[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];
  for (const m of links) {
    const title = stripTags(m[3]);
    rows.push({
      institution: title,
      date: m[1],
      title: "Offer in Compromise",
      sourceUrl: m[2].startsWith("http") ? m[2] : `${PDF_ORIGIN}${m[2]}`,
      pdfId: pdfIdFromUrl(m[2].startsWith("http") ? m[2] : `${PDF_ORIGIN}${m[2]}`) ?? "",
      docket: slugFromUrl(m[2].startsWith("http") ? m[2] : `${PDF_ORIGIN}${m[2]}`),
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ docket \/ date \/ PDF URL/i.test(text)) return true;
  if (/FDA De Novo press teaser|EPA FIFRA press teaser/i.test(text)) return true;
  if (/INSTRUCTIONS/i.test(text) && !/ABSTRACT AND STATEMENT/i.test(text) && !/Offer-in-Compromise/i.test(text)) {
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

export function isRealTtbOicBody(text: string): boolean {
  if (isIndexTeaserDump(text) || isFederalRegisterDump(text) || isPeopleDump(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 1200) return false;
  if (/Center for Devices and Radiological Health/i.test(text) && /De Novo request/i.test(text)) return false;
  if (/ENVIRONMENTAL PROTECTION AGENCY/i.test(text) && /FIFRA-\d{2}-\d{4}-\d{4}/i.test(text)) return false;
  if (/COMMODITY FUTURES TRADING COMMISSION/i.test(text) && /CFTC Docket No/i.test(text)) return false;
  if (/Bureau of Industry and Security/i.test(text) && /PROPOSED CHARGING LETTER|ORDER RELATING TO/i.test(text)) return false;
  if (/\d{2}-\d{3}-01air/i.test(text) && /Confirmation of the regulatory status/i.test(text)) return false;
  if (/RECORD OF DECISION/i.test(text) && /DECLARATION/i.test(text) && /\b(CERCLA|Superfund)\b/i.test(text)) return false;
  if (/(?:MONETARY )?PENALTY NOTICE/i.test(text) && /Information Commissioner/i.test(text) && /(?:Data Protection Act 2018|section 155)/i.test(text)) return false;
  const ttb = /ALCOHOL AND TOBACCO TAX AND TRADE BUREAU/i.test(text);
  const kind = /ABSTRACT AND STATEMENT/i.test(text) && /Offer-in-Compromise|Offer in Compromise|\bOIC\b/i.test(text);
  return ttb && kind;
}

export function parseTtbOicText(
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
): TtbOicCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialTtbOicPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(meta.id) || slugFromUrl(sourceUrl);
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || docket;
  return {
    id: meta.id && normalizeDocket(meta.id) ? normalizeDocket(meta.id)! : docket,
    docket,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 4000)),
    title: meta.title || "Offer in Compromise",
    sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): TtbOicSnapshot {
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

export function assembleSnapshot(cards: TtbOicCard[], fetchedAt = new Date().toISOString()): TtbOicSnapshot {
  const withBody = cards.filter((c) => isRealTtbOicBody(c.body)).sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official TTB Offer in Compromise PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): TtbOicSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as TtbOicSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): TtbOicSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch { /* corrupt */ }
  }
  return null;
}

export function writeSnapshot(snap: TtbOicSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchTtbOicBytes(url: string): Promise<Uint8Array> {
  const official = officialTtbOicPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("TTB_OIC_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function ocrPdfText(pdfPath: string): string {
  const work = join(tmpdir(), `ttb-oic-ocr-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  const prefix = join(work, "p");
  const ppm = spawnSync("pdftoppm", ["-png", pdfPath, prefix], { encoding: "utf8" });
  if (ppm.status !== 0) return "";
  const pages = readdirSync(work).filter((n) => n.endsWith(".png")).sort();
  const chunks: string[] = [];
  for (const page of pages) {
    const ocr = spawnSync("tesseract", ["--psm", "6", join(work, page), "stdout"], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    if (ocr.status === 0 && ocr.stdout) chunks.push(ocr.stdout);
  }
  return chunks.join("\n");
}

export function pdfToText(pdfPath: string): string {
  const digital = digitalPdfText(pdfPath);
  if (isRealTtbOicBody(digital)) return digital;
  const ocr = ocrPdfText(pdfPath);
  if (ocr.trim()) return `${ocr}\n${digital}`.trim();
  return digital;
}

function listingDir(): string {
  return env("TTB_OIC_JSON_DIR") || env("TTB_OIC_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("TTB_OIC_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("TTB_OIC_MAX_FETCH", "8"));
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

async function loadOfficialListings(dir: string): Promise<{ listed: TtbOicListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as TtbOicListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectTtbOic(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<TtbOicSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ttbOicDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, TtbOicCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealTtbOicBody(card.body)) prior.set(card.id, card);
  }
  const cards: TtbOicCard[] = [];
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
      const localText = readNamedFile(dir, [`${row.docket}.txt`, `${row.id}.txt`, `${row.pdfId}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, row.pdfId.endsWith(".pdf") ? row.pdfId : `${row.docket}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchTtbOicBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseTtbOicText(text, row);
      if (!isRealTtbOicBody(parsed.body)) {
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
  const snap = { ...assembleSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeSnapshot(snap);
  return snap;
}

export async function loadTtbOic(): Promise<TtbOicSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealTtbOicBody(c.body))) return cached;
  try {
    return await collectTtbOic();
  } catch (err) {
    if (cached) {
      return { ...cached, status: "stale", reason: `Live TTB OIC fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}` };
    }
    return emptySnapshot(`TTB OIC PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function buildTtbOicManifest(snap: TtbOicSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealTtbOicBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + docket + date + official PDF URL only. Order body is the paid GET /ttb-oic payload. Not people. Not De Novo /denovo-orders. Not FIFRA /fifra-orders. Not CFTC /cftc-orders.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: TTB_OIC_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({ id: c.id, institution: c.institution, docket: c.docket, date: c.date, sourceUrl: c.sourceUrl })),
    schema: { fields: ["id", "institution", "docket", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
  };
}

export async function loadTtbOicManifest(): Promise<Record<string, unknown>> {
  return buildTtbOicManifest(readSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectTtbOic()
    .then((snap) => {
      console.log(JSON.stringify({
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
          id: c.id, docket: c.docket, institution: c.institution, date: c.date, title: c.title,
          bodyChars: c.body.length, sourceUrl: c.sourceUrl,
        })),
        snapshot: snapshotPath(),
      }, null, 2));
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
