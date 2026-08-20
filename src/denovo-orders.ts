/**
 * FDA De Novo institution/company classification-order TEXT door.
 * Official per-order classification-order PDFs from accessdata.fda.gov cdrh_docs only.
 * Does not invent order text. Press teasers / index pages are listing metadata.
 * Institution/company only. Not people. Not the press teaser.
 * Not BIS /bis-orders. Not OFAC /ofac-orders. Not FERC /ferc-orders.
 * Not FinCEN /fincen-orders. Not NCUA /ncua-orders. Not FRB /frb-orders.
 * Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl. Not CFTC /cftc-orders. Not FIFRA /fifra-orders.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DENOVO_ORDERS_PATH = "/denovo-orders";
export const DENOVO_ORDERS_MANIFEST_PATH = "/denovo-orders/manifest.json";
export const DENOVO_ORDERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "fda-denovo-classification-order-bodies";
export const PRODUCT_NAME = "FDA De Novo classification-order text";

export const LISTING_URL = "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/denovo.cfm";
export const PDF_HOST = "www.accessdata.fda.gov";
export const PDF_ORIGIN = "https://www.accessdata.fda.gov";
export const DOCKET_LABEL_RE = /(?:Re:\s*)?(DEN\d{6})\b/i;
export const DOCKET_BARE_RE = /^(DEN\d{6})$/i;
export const MEDIA_RE = /\/cdrh_docs\/pdf(\d{2})\/(DEN\d{6})\.pdf/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "FDA";

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

export type DenovoListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type DenovoOrderListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type DenovoOrderCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type DenovoOrdersSnapshot = {
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
  cards: DenovoOrderCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FDA De Novo public institution classification orders; +https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/denovo.cfm)";

const OFFICIAL_HOSTS = new Set(["www.accessdata.fda.gov", "accessdata.fda.gov"]);

const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.P\.|LP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|S\.A\.|Banco|Bank|Holdings|Enterprises|Capital Markets|Markets|Securities|Services|Group|Partners|International|Industries|Solutions|Superstore|Chemical|Medical)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const ORDER_KIND_RE =
  /de novo|classification order|classifies the/i;
const COMPLAINT_RE = /\bcomplaint\b/i;

/** Official FDA De Novo institution/company classification-order PDFs on accessdata.fda.gov. */
export const SEED_LISTINGS: DenovoOrderListing[] = [
  {
    id: "DEN250042",
    docket: "DEN250042",
    institution: "Caristo Diagnostics Ltd.",
    date: "2026-07-28",
    title: "De Novo classification order",
    sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf",
    pdfId: "DEN250042",
  },
  {
    id: "DEN250033",
    docket: "DEN250033",
    institution: "Hjarta Care, LLC",
    date: "2026-04-17",
    title: "De Novo classification order",
    sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250033.pdf",
    pdfId: "DEN250033",
  },
  {
    id: "DEN240071",
    docket: "DEN240071",
    institution: "Automated Imaging Diagnostics, LLC",
    date: "2026-04-03",
    title: "De Novo classification order",
    sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf24/DEN240071.pdf",
    pdfId: "DEN240071",
  },
  {
    id: "DEN250014",
    docket: "DEN250014",
    institution: "Tyto Care Ltd.",
    date: "2026-03-17",
    title: "De Novo classification order",
    sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250014.pdf",
    pdfId: "DEN250014",
  },
  {
    id: "DEN250012",
    docket: "DEN250012",
    institution: "LifeVac LLC",
    date: "2026-03-04",
    title: "De Novo classification order",
    sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250012.pdf",
    pdfId: "DEN250012",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function denovoOrdersDir(): string {
  if (env("DENOVO_ORDERS_DIR")) return resolve(env("DENOVO_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/denovo-orders"));
}

export function snapshotPath(): string {
  return join(denovoOrdersDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/denovo-orders/seed-snapshot.json"),
    join(here, "fixtures/denovo-orders/seed-snapshot.json"),
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

export function officialDenovoPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  try {
    const parsed = new URL(trimmed, PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") return null;
    if (host === "www.federalregister.gov" || host === "federalregister.gov") return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    const media = path.match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
    if (!media) return null;
    const yy = media[1];
    const den = media[2].toUpperCase();
    return `${PDF_ORIGIN}/cdrh_docs/pdf${yy}/${den}.pdf`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialDenovoPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = parsed.pathname.match(MEDIA_RE);
    return media?.[2]?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const labeled = raw.match(DOCKET_LABEL_RE);
  if (labeled) return labeled[1];
  const bare = raw.trim().match(DOCKET_BARE_RE);
  if (bare) return bare[1];
  return null;
}

export function isPeopleRow(row: DenovoListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  const cleaned = name.replace(/^In the Matter of\s+/i, "").replace(/\s+d\/b\/a\s+.+$/i, "").trim();
  return PERSON_NAME_RE.test(cleaned);
}

export function isInstitutionOrderRow(row: DenovoListingRow): boolean {
  if (isPeopleRow(row)) return false;
  const institution = (row.institution ?? "").trim();
  if (!institution || !ENTITY_RE.test(institution)) return false;
  const source = officialDenovoPdfUrl(row.sourceUrl ?? "");
  if (!source) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`;
  if (COMPLAINT_RE.test(kind)) return false;
  if (kind.trim() && !ORDER_KIND_RE.test(kind) && !MEDIA_RE.test(kind)) {
    return false;
  }
  return true;
}

export function parseListingRows(rows: DenovoListingRow[]): DenovoOrderListing[] {
  const found: DenovoOrderListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const sourceUrl = officialDenovoPdfUrl(row.sourceUrl ?? "");
    const pdfId = (row.pdfId ?? "").trim() || pdfIdFromUrl(sourceUrl ?? "") || "";
    const docket = normalizeDocket(row.docket) || normalizeDocket(row.title ?? "") || pdfId;
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: normalizeDocket(row.docket) || docket,
      docket,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: parseOrderTitle(`${row.title ?? ""} ${row.type ?? ""}`),
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): DenovoOrderListing[] {
  const rows: DenovoListingRow[] = [];
  const trs = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of trs) {
    const href = (row.match(/href="([^"]+)"/i) || [])[1] || "";
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
    if (cells.length < 2) continue;
    const date = cells.find((c) => isoDate(c)) ?? cells[0] ?? "";
    const institution =
      cells.find((c) => ENTITY_RE.test(c) || PERSON_NAME_RE.test(c)) ?? cells[1] ?? "";
    const sourceUrl = href.startsWith("http") ? href : href ? `${PDF_ORIGIN}${href}` : "";
    const docket = normalizeDocket(cells.find((c) => normalizeDocket(c)) ?? "") ?? "";
    rows.push({
      institution,
      docket,
      date,
      title: cells.find((c) => ORDER_KIND_RE.test(c) || COMPLAINT_RE.test(c)) ?? "Order",
      type: cells[2] ?? "",
      sourceUrl,
      pdfId: pdfIdFromUrl(sourceUrl) ?? "",
    });
  }
  const loose = [...html.matchAll(/href="([^"]*cdrh_docs\/pdf\d{2}\/DEN\d{6}\.pdf[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of loose) {
    const title = stripTags(m[2]);
    const institution = title.replace(/^(?:Administrative\s+)?(?:Consent\s+)?Order:\s*/i, "").trim();
    rows.push({
      institution,
      title,
      sourceUrl: m[1],
      pdfId: pdfIdFromUrl(m[1]) ?? "",
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ docket \/ date \/ PDF URL/i.test(text)) return true;
  if (/EPA FIFRA press teaser/i.test(text)) return true;
  if (/FDA De Novo press teaser/i.test(text)) return true;
  const compact = text.replace(/\s+/g, " ").trim();
  if (
    /announced an order filing and settling charges/i.test(text) &&
    !/CONSENT AGREEMENT AND FINAL ORDER/i.test(text) &&
    !/FIFRA-/i.test(text)
  ) {
    return true;
  }
  if (compact.length < 400 && /Order:/i.test(text) && /\/media\/\d+\//i.test(text)) return true;
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

export function isRealDenovoOrderBody(text: string): boolean {
  if (isIndexTeaserDump(text) || isFederalRegisterDump(text) || isPeopleDump(text)) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 1500) return false;
  if (/Bureau of Industry and Security/i.test(text) && /PROPOSED CHARGING LETTER|ORDER RELATING TO/i.test(text)) {
    return false;
  }
  if (/OFFICE OF FOREIGN ASSETS CONTROL/i.test(text) && /Enforcement Release:/i.test(text)) {
    return false;
  }
  if (/FEDERAL ENERGY REGULATORY COMMISSION/i.test(text) && /ORDER APPROVING STIPULATION AND CONSENT AGREEMENT/i.test(text)) {
    return false;
  }
  if (/FINANCIAL CRIMES ENFORCEMENT NETWORK/i.test(text) && /CONSENT ORDER IMPOSING CIVIL MONEY PENALTY/i.test(text)) {
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
  if (/COMMODITY FUTURES TRADING COMMISSION/i.test(text) && /CFTC Docket No/i.test(text)) {
    return false;
  }
  if (/ENVIRONMENTAL PROTECTION AGENCY/i.test(text) && /FIFRA-\d{2}-\d{4}-\d{4}/i.test(text)) {
    return false;
  }
  if (/ALCOHOL AND TOBACCO TAX AND TRADE BUREAU/i.test(text) && /ABSTRACT AND STATEMENT/i.test(text)) {
    return false;
  }
  const fda = /Food and Drug Administration|\bFDA\b/i.test(text);
  const cdrh = /Center for Devices and Radiological Health|\bCDRH\b/i.test(text);
  const kind =
    /De Novo request/i.test(text) ||
    /This order, therefore, classifies/i.test(text) ||
    /De Novo classification/i.test(text);
  const docket = DOCKET_LABEL_RE.test(text);
  return fda && cdrh && kind && docket;
}

export function parseOrderTitle(body: string): string {
  if (/De Novo/i.test(body) || /classifies the/i.test(body)) return "De Novo classification order";
  return "Classification order";
}

export function parseDenovoOrderText(
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
): DenovoOrderCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialDenovoPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket =
    normalizeDocket(meta.docket) ||
    normalizeDocket(body.match(DOCKET_LABEL_RE)?.[0] ?? "") ||
    meta.pdfId ||
    pdfIdFromUrl(sourceUrl) ||
    "unknown";
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || docket;
  return {
    id: meta.id && normalizeDocket(meta.id) ? normalizeDocket(meta.id)! : docket,
    docket,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 4000)) ?? isoDate(body.match(/Dated:\s*([^\n]+)/i)?.[1] ?? ""),
    title: meta.title || parseOrderTitle(body),
    sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): DenovoOrdersSnapshot {
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

function cardDateKey(card: Pick<DenovoOrderCard, "date" | "docket">): string {
  return `${card.date ?? ""}${card.docket}`;
}

export function assembleSnapshot(cards: DenovoOrderCard[], fetchedAt = new Date().toISOString()): DenovoOrdersSnapshot {
  const withBody = cards
    .filter((c) => isRealDenovoOrderBody(c.body))
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
    reason: withBody.length > 0 ? null : "Official FDA De Novo classification-order PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): DenovoOrdersSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as DenovoOrdersSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): DenovoOrdersSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("DENOVO_ORDERS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: DenovoOrdersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedDenovoOrderBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealDenovoOrderBody(c.body)));
}

function listingDir(): string {
  return env("DENOVO_ORDERS_JSON_DIR") || env("DENOVO_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("DENOVO_ORDERS_LIMIT", "5");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const raw = env("DENOVO_ORDERS_MAX_FETCH", "8");
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

export async function fetchDenovoBytes(url: string): Promise<Uint8Array> {
  const official = officialDenovoPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  if (head !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("DENOVO_ORDERS_PDFTOTEXT") || "pdftotext";
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

async function loadOfficialListings(dir: string): Promise<{ listed: DenovoOrderListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as DenovoListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = html ? parseListingHtml(html) : [];
    return { listed, listedCount: listed.length };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

function priorBodies(): Map<string, DenovoOrderCard> {
  const prior = new Map<string, DenovoOrderCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealDenovoOrderBody(card.body)) prior.set(card.id, card);
  }
  return prior;
}

export async function collectDenovoOrders(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<DenovoOrdersSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = denovoOrdersDir();
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
        reason: "Official FDA De Novo seed listing missed; kept cached institution classification-order bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official FDA De Novo seed listing had no institution classification-order rows.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: DenovoOrderCard[] = [];
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
            writeFileSync(pdfFile, await fetchDenovoBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseDenovoOrderText(text, {
        sourceUrl: row.sourceUrl,
        institution: row.institution,
        date: row.date,
        docket: row.docket,
        pdfId: row.pdfId,
        id: row.id,
        title: row.title,
      });
      if (!isRealDenovoOrderBody(parsed.body)) {
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

export async function loadDenovoOrders(): Promise<DenovoOrdersSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealDenovoOrderBody(c.body))) {
    return cached;
  }
  try {
    return await collectDenovoOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealDenovoOrderBody(c.body)) ? "stale" : "empty",
        reason: `Live FDA De Novo classification-order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `FDA De Novo classification-order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildDenovoOrdersManifest(snap: DenovoOrdersSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealDenovoOrderBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + docket + date + official PDF URL only. Order body is the paid GET /denovo-orders payload. Not the press/teaser. Not people. Not Federal Register raw_text. Not FIFRA /fifra-orders. Not CFTC /cftc-orders. Not BIS /bis-orders. Not OFAC /ofac-orders. Not FERC /ferc-orders. Not FinCEN /fincen-orders. Not NCUA /ncua-orders. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: DENOVO_ORDERS_AMOUNT_ATOMIC,
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

export async function loadDenovoOrdersManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildDenovoOrdersManifest(cached);
  return buildDenovoOrdersManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectDenovoOrders()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealDenovoOrderBody(c.body)).length,
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
