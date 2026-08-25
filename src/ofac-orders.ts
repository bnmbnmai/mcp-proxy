/**
 * OFAC institution/company enforcement-release TEXT door.
 * Official per-release PDFs from ofac.treasury.gov/media/{id}/download only.
 * Does not invent order text. Civil-penalties chart / teaser / RSS are listing metadata.
 * Institution/company only. Not people. Not Federal Register raw_text.
 * Not FinCEN /fincen-orders. Not FERC /ferc-orders. Not NCUA /ncua-orders.
 * Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd.
 * Not CFPB /cfpb-orders. Not FTC /ftc-wl.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const OFAC_ORDERS_PATH = "/ofac-orders";
export const OFAC_ORDERS_MANIFEST_PATH = "/ofac-orders/manifest.json";
export const OFAC_ORDERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "ofac-institution-order-bodies";
export const PRODUCT_NAME = "OFAC institution enforcement-release text";

export const LISTING_URL = "https://ofac.treasury.gov/civil-penalties-and-enforcement-information";
/** Official year tables with per-release PDFs. The live 2026 chart is first-slice 5. */
export const YEAR_LISTING_URLS = [
  "https://ofac.treasury.gov/civil-penalties-and-enforcement-information/2025-enforcement-information",
  "https://ofac.treasury.gov/civil-penalties-and-enforcement-information/2024-enforcement-information",
] as const;
export const PDF_HOST = "ofac.treasury.gov";
export const PDF_ORIGIN = "https://ofac.treasury.gov";
export const MEDIA_RE = /\/media\/(\d+)(?:\/download)?\/?(?:$|[?#])/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "OFAC";

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

export type OfacListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type OfacOrderListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type OfacOrderCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type OfacOrdersSnapshot = {
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
  sources: {
    listing: string;
    pdfHost: string;
  };
  cards: OfacOrderCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (OFAC public enforcement releases; +https://ofac.treasury.gov/)";

const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.P\.|LP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|Holdings|Enterprises|Consulting|Securities|Academy|Systems|Services|Bank|N\.A\.|National Association|Trust|Group|Partners|International|Industries|AG|GmbH|S\.p\.A\.?)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,2}$/;
const AN_INDIVIDUAL_RE = /^an individual$/i;
const RELEASE_KIND_RE = /enforcement release|settles with ofac|apparent violations|civil penalt/i;

/** Official OFAC institution/company enforcement-release PDFs on ofac.treasury.gov. */
export const SEED_LISTINGS: OfacOrderListing[] = [
  {
    id: "936706",
    docket: "936706",
    institution: "Rice Lake Weighing Systems, Inc.",
    date: "2026-08-12",
    title: "Enforcement Release",
    sourceUrl: "https://ofac.treasury.gov/media/936706/download",
    pdfId: "936706",
  },
  {
    id: "935651",
    docket: "935651",
    institution: "FTI Consulting, Inc.",
    date: "2026-06-01",
    title: "Enforcement Release",
    sourceUrl: "https://ofac.treasury.gov/media/935651/download",
    pdfId: "935651",
  },
  {
    id: "935631",
    docket: "935631",
    institution: "Adani Enterprises Limited",
    date: "2026-05-18",
    title: "Enforcement Release",
    sourceUrl: "https://ofac.treasury.gov/media/935631/download",
    pdfId: "935631",
  },
  {
    id: "935351",
    docket: "935351",
    institution: "TradeStation Securities, Inc.",
    date: "2026-03-17",
    title: "Enforcement Release",
    sourceUrl: "https://ofac.treasury.gov/media/935351/download",
    pdfId: "935351",
  },
  {
    id: "935006",
    docket: "935006",
    institution: "IMG Academy, LLC",
    date: "2026-02-12",
    title: "Enforcement Release",
    sourceUrl: "https://ofac.treasury.gov/media/935006/download",
    pdfId: "935006",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ofacOrdersDir(): string {
  if (env("OFAC_ORDERS_DIR")) return resolve(env("OFAC_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ofac-orders"));
}

export function snapshotPath(): string {
  return join(ofacOrdersDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/ofac-orders/seed-snapshot.json"),
    join(here, "fixtures/ofac-orders/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&ldquo;/gi, "“")
    .replace(/&rdquo;/gi, "”")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " "));
}

export function mediaIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(MEDIA_RE);
  return m ? m[1] : null;
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const media = mediaIdFromUrl(raw) || raw.trim();
  if (/^\d{5,7}$/.test(media)) return media;
  return null;
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

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  return mediaIdFromUrl(officialOfacPdfUrl(url) || url || "");
}

export function officialOfacPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  try {
    const parsed = new URL(trimmed, PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") return null;
    if (host === "www.federalregister.gov" || host === "federalregister.gov") return null;
    if (host !== "ofac.treasury.gov" && host !== "www.ofac.treasury.gov") return null;
    if (/civil-penalties-and-enforcement-information/i.test(parsed.pathname) && !MEDIA_RE.test(parsed.pathname)) {
      return null;
    }
    if (/\/rss|\/feed/i.test(parsed.pathname)) return null;
    const id = mediaIdFromUrl(parsed.pathname + parsed.search);
    if (!id) return null;
    return `${PDF_ORIGIN}/media/${id}/download`;
  } catch {
    return null;
  }
}

export function isPeopleRow(row: OfacListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (AN_INDIVIDUAL_RE.test(name)) return true;
  if (ENTITY_RE.test(name)) return false;
  const cleaned = name.replace(/^In the Matter of\s+/i, "").replace(/\s+d\/b\/a\s+.+$/i, "").trim();
  return PERSON_NAME_RE.test(cleaned) || AN_INDIVIDUAL_RE.test(cleaned);
}

export function isInstitutionOrderRow(row: OfacListingRow): boolean {
  if (isPeopleRow(row)) return false;
  const institution = (row.institution ?? "").trim();
  if (!institution || !ENTITY_RE.test(institution)) return false;
  const docket = normalizeDocket(row.docket ?? row.sourceUrl ?? row.pdfId ?? "");
  if (!docket) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`;
  if (kind.trim() && !RELEASE_KIND_RE.test(kind) && !MEDIA_RE.test(kind)) return false;
  return Boolean(officialOfacPdfUrl(row.sourceUrl ?? row.pdfId ?? ""));
}

export function parseListingRows(rows: OfacListingRow[]): OfacOrderListing[] {
  const found: OfacOrderListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const docket = normalizeDocket(row.docket ?? row.sourceUrl ?? row.pdfId ?? "");
    const sourceUrl = officialOfacPdfUrl(row.sourceUrl ?? row.pdfId ?? "");
    const pdfId = pdfIdFromUrl(sourceUrl ?? "") ?? (row.pdfId ?? "").trim();
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: docket,
      docket,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: /enforcement release/i.test(row.title ?? "") ? "Enforcement Release" : (row.title ?? "").trim() || "Enforcement Release",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): OfacOrderListing[] {
  const rows: OfacListingRow[] = [];
  const trs = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of trs) {
    const href = (row.match(/href="([^"]+)"/i) || [])[1] || "";
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
    if (cells.length < 2) continue;
    const date = cells.find((c) => isoDate(c)) ?? cells[0] ?? "";
    const institution =
      cells.find((c) => ENTITY_RE.test(c) || AN_INDIVIDUAL_RE.test(c) || PERSON_NAME_RE.test(c)) ??
      cells[1] ??
      "";
    const sourceUrl = href.startsWith("http") ? href : href ? `${PDF_ORIGIN}${href}` : "";
    const docket = mediaIdFromUrl(sourceUrl) ?? "";
    rows.push({
      institution,
      docket,
      date,
      title: "Enforcement Release",
      type: cells[2] ?? "",
      sourceUrl,
      pdfId: docket,
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ docket \/ date \/ PDF URL/i.test(text)) return true;
  if (
    /Civil Penalties and Enforcement Information|2026 Civil Penalties Information Chart/i.test(text) &&
    !/Description of the Apparent Violations/i.test(text) &&
    !/Enforcement Release:/i.test(text)
  ) {
    return true;
  }
  return false;
}

export function isRssDump(text: string): boolean {
  if (/OFAC RSS teaser/i.test(text)) return true;
  if (/<rss\b/i.test(text) && !/Description of the Apparent Violations/i.test(text)) return true;
  if (/<item\b/i.test(text) && /<guid\b/i.test(text) && !/OFFICE OF FOREIGN ASSETS CONTROL/i.test(text)) {
    return true;
  }
  return false;
}

export function isFederalRegisterDump(text: string): boolean {
  return /"raw_text"/.test(text) || /"full_text"/.test(text) || /federalregister\.gov/i.test(text);
}

export function isPeopleDump(text: string): boolean {
  if (/people-only OFAC/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text) && !/Inc\.|LLC|Limited|Corporation/i.test(text)) {
    return true;
  }
  return false;
}

export function isRealOfacOrderBody(text: string): boolean {
  if (isIndexTeaserDump(text) || isRssDump(text) || isFederalRegisterDump(text) || isPeopleDump(text)) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 2000) return false;
  if (/FINANCIAL CRIMES ENFORCEMENT NETWORK/i.test(text) && /CONSENT ORDER IMPOSING CIVIL MONEY PENALTY/i.test(text)) {
    return false;
  }
  if (/FEDERAL ENERGY REGULATORY COMMISSION/i.test(text) && /ORDER APPROVING STIPULATION AND CONSENT AGREEMENT/i.test(text)) {
    return false;
  }
  if (/CONSUMER FINANCIAL PROTECTION BUREAU/i.test(text) && /File No\.\s*\d{4}-CFPB-\d+/i.test(text)) {
    return false;
  }
  if (/OFFICE OF THE COMPTROLLER OF THE CURRENCY/i.test(text) && /\bAA-[A-Z]{2,4}-\d{4}-\d+\b/.test(text)) {
    return false;
  }
  if (/FEDERAL DEPOSIT INSURANCE CORPORATION/i.test(text) && /\bFDIC-\d{2}-\d{4}[a-z]\b/i.test(text)) {
    return false;
  }
  if (/BOARD OF GOVERNORS OF THE FEDERAL RESERVE SYSTEM/i.test(text) && /\b\d{2}-\d{3}-(?:B|PCA|WA\/RB)/i.test(text)) {
    return false;
  }
  if (/National Credit Union Administration/i.test(text) && /\b\d{2}-\d{4}-[A-Z]{2}\b/.test(text)) {
    return false;
  }
  if (/Bureau of Consumer Protection/i.test(text) && /Made in the USA Labeling Rule|MUSA Labeling Rule/i.test(text)) {
    return false;
  }
  const ofac = /OFFICE OF FOREIGN ASSETS CONTROL/i.test(text);
  const release = /Enforcement Release:/i.test(text);
  const facts = /Description of the Apparent Violations/i.test(text) || /Apparent Violations/i.test(text);
  const penalty = /Penalty Calculations and General Factors Analysis/i.test(text) || /Enforcement Guidelines/i.test(text);
  return ofac && release && facts && penalty;
}

export function parseOrderTitle(body: string): string {
  if (/Enforcement Release:/i.test(body)) return "Enforcement Release";
  return "Enforcement Release";
}

export function parseOfacOrderText(
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
): OfacOrderCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialOfacPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || normalizeDocket(sourceUrl) || "unknown";
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || docket;
  return {
    id: meta.id || docket,
    docket,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 2500)),
    title: meta.title || parseOrderTitle(body),
    sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): OfacOrdersSnapshot {
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

function cardDateKey(card: Pick<OfacOrderCard, "date" | "docket">): string {
  return `${card.date ?? ""}${card.docket}`;
}

export function assembleSnapshot(cards: OfacOrderCard[], fetchedAt = new Date().toISOString()): OfacOrdersSnapshot {
  const withBody = cards
    .filter((c) => isRealOfacOrderBody(c.body))
    .sort((a, b) => cardDateKey(b).localeCompare(cardDateKey(a)));
  const asOf =
    withBody
      .map((c) => c.date)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official OFAC institution enforcement-release PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): OfacOrdersSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as OfacOrdersSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): OfacOrdersSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("OFAC_ORDERS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: OfacOrdersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedOfacOrderBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealOfacOrderBody(c.body)));
}

function listingDir(): string {
  return env("OFAC_ORDERS_JSON_DIR") || env("OFAC_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("OFAC_ORDERS_LIMIT", "5");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const raw = env("OFAC_ORDERS_MAX_FETCH", "8");
  if (raw === "0") return 0;
  const n = Number(raw);
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

export async function fetchOfacBytes(url: string): Promise<Uint8Array> {
  const official = officialOfacPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  if (head !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export async function fetchOfacText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export function pdfToText(pdfPath: string): string {
  const helper = env("OFAC_ORDERS_PDFTOTEXT") || "pdftotext";
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

async function loadOfficialListings(dir: string): Promise<{ listed: OfacOrderListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as OfacListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = html ? parseListingHtml(html) : [];
    return { listed, listedCount: listed.length };
  }
  try {
    const listed: OfacOrderListing[] = [];
    for (const url of [LISTING_URL, ...YEAR_LISTING_URLS]) {
      try {
        listed.push(...parseListingHtml(await fetchOfacText(url)));
      } catch {
        /* one official year table missed; keep the others */
      }
    }
    const merged = mergeOfficialListings(listed, SEED_LISTINGS);
    if (merged.length > 0) return { listed: merged, listedCount: merged.length };
  } catch {
    /* official listing missed; keep first-slice seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

function mergeOfficialListings(listed: OfacOrderListing[], seeds: OfacOrderListing[]): OfacOrderListing[] {
  const seen = new Set<string>();
  const out: OfacOrderListing[] = [];
  for (const row of [...listed, ...seeds]) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function priorBodies(): Map<string, OfacOrderCard> {
  const prior = new Map<string, OfacOrderCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealOfacOrderBody(card.body)) prior.set(card.id, card);
  }
  return prior;
}

export async function collectOfacOrders(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<OfacOrdersSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ofacOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = priorBodies();
  if (allListed.length === 0) {
    if (prior.size > 0) {
      const snap = {
        ...assembleSnapshot([...prior.values()]),
        listedCount: 0,
        fetchedPdfs: 0,
        skippedNoText: 0,
        reused: prior.size,
        addedThisRun: 0,
        reason: "Official OFAC seed listing missed; kept cached institution enforcement-release bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official OFAC seed listing had no institution enforcement-release rows.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: OfacOrderCard[] = [];
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
    if (!dir) await pause(pauseMs);
    try {
      const localText = readNamedFile(dir, [`${row.docket}.txt`, `${row.id}.txt`, `${row.pdfId}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${row.docket}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchOfacBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseOfacOrderText(text, {
        sourceUrl: row.sourceUrl,
        institution: row.institution,
        date: row.date,
        docket: row.docket,
        pdfId: row.pdfId,
        id: row.id,
        title: row.title,
      });
      if (!isRealOfacOrderBody(parsed.body)) {
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
    ...assembleSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeSnapshot(snap);
  return snap;
}

export async function loadOfacOrders(): Promise<OfacOrdersSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealOfacOrderBody(c.body))) {
    return cached;
  }
  try {
    return await collectOfacOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealOfacOrderBody(c.body)) ? "stale" : "empty",
        reason: `Live OFAC institution enforcement-release fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `OFAC institution enforcement-release PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildOfacOrdersManifest(snap: OfacOrdersSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealOfacOrderBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + docket + date + official PDF URL only. Order body is the paid GET /ofac-orders payload. Not the civil-penalties chart/teaser/RSS. Not people. Not Federal Register raw_text. Not FinCEN /fincen-orders. Not FERC /ferc-orders. Not NCUA /ncua-orders. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: OFAC_ORDERS_AMOUNT_ATOMIC,
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

export async function loadOfacOrdersManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildOfacOrdersManifest(cached);
  return buildOfacOrdersManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectOfacOrders()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealOfacOrderBody(c.body)).length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              docket: c.docket,
              pdfId: c.pdfId,
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
