/**
 * CFPB consent-order / administrative-order TEXT door.
 * Official per-order PDFs from files.consumerfinance.gov only. Does not invent order text.
 * Does not wrap the enforcement-actions index or action HTML (teaser + PDF URL only).
 * Does not wrap the Consumer Complaint Database (complaint_what_happened is a KILL).
 * Distinct from FTC /ftc-wl and OCC /occ-cd.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CFPB_ORDERS_PATH = "/cfpb-orders";
export const CFPB_ORDERS_MANIFEST_PATH = "/cfpb-orders/manifest.json";
export const CFPB_ORDERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "cfpb-consent-order-bodies";
export const PRODUCT_NAME = "CFPB consent-order / administrative-order text";

export const LISTING_URL = "https://www.consumerfinance.gov/enforcement/actions/";
export const ACTION_BASE = "https://www.consumerfinance.gov/enforcement/actions/";
export const PDF_HOST = "files.consumerfinance.gov";
export const PDF_PATH_RE =
  /\/f\/(?:documents\/)?([^"'?\s]+\.pdf)/i;
export const ACTION_PATH_RE = /\/enforcement\/actions\/([a-z0-9][a-z0-9-]*)\/?/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "CFPB";

export const CARD_FIELDS = [
  "id",
  "fileNo",
  "pdfId",
  "firm",
  "date",
  "title",
  "sourceUrl",
  "actionUrl",
  "body",
] as const;

export type CfpbOrderListing = {
  id: string;
  firm: string;
  date: string | null;
  actionUrl: string;
};

export type CfpbOrderCard = {
  id: string;
  fileNo: string | null;
  pdfId: string;
  firm: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  actionUrl: string;
  body: string;
};

export type CfpbOrderSnapshot = {
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
    actionBase: string;
    pdfHost: string;
  };
  cards: CfpbOrderCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (CFPB public consent orders; +https://www.consumerfinance.gov/)";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function cfpbOrdersDir(): string {
  if (env("CFPB_ORDERS_DIR")) return resolve(env("CFPB_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/cfpb-orders"));
}

export function snapshotPath(): string {
  return join(cfpbOrdersDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/cfpb-orders/seed-snapshot.json"),
    join(here, "fixtures/cfpb-orders/seed-snapshot.json"),
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
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " "));
}

export function slugFromActionUrl(url: string): string | null {
  const m = url.match(ACTION_PATH_RE);
  return m ? m[1].toLowerCase() : null;
}

export function pdfIdFromUrl(url: string): string | null {
  const m = url.match(PDF_PATH_RE);
  if (!m) return null;
  return m[1].replace(/\.pdf$/i, "").toLowerCase();
}

export function isOrderPdfName(name: string): boolean {
  const n = name.toLowerCase();
  if (/\bstipulation\b/.test(n)) return false;
  if (/\bcomplaint\b/.test(n) && !/consent-order|administrative-order/.test(n)) return false;
  if (/\bpress\b/.test(n)) return false;
  return /consent-order|administrative-order/.test(n);
}

export function orderPdfRank(name: string): number {
  const n = name.toLowerCase();
  if (/amended-consent-order/.test(n)) return 3;
  if (/consent-order/.test(n)) return 2;
  if (/administrative-order/.test(n)) return 1;
  return 0;
}

export function officialCfpbPdfUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://files.consumerfinance.gov");
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") {
      const inner = parsed.pathname.match(
        /\/https?:\/\/(?:files\.)?consumerfinance\.gov(\/f\/.+)/i,
      );
      return inner ? officialCfpbPdfUrl(`https://files.consumerfinance.gov${inner[1]}`) : null;
    }
    if (host !== "files.consumerfinance.gov" && host !== "www.consumerfinance.gov") return null;
    const pdf = parsed.pathname.match(PDF_PATH_RE);
    if (!pdf) return null;
    if (!isOrderPdfName(pdf[1])) return null;
    if (/\/f\/documents\//i.test(parsed.pathname)) {
      return `https://files.consumerfinance.gov/f/documents/${pdf[1]}`;
    }
    return `https://files.consumerfinance.gov/f/${pdf[1]}`;
  } catch {
    return null;
  }
}

export function officialCfpbActionUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://www.consumerfinance.gov");
    const host = parsed.hostname.toLowerCase();
    if (host !== "www.consumerfinance.gov" && host !== "consumerfinance.gov") return null;
    const slug = slugFromActionUrl(parsed.pathname);
    if (!slug || slug === "enforcement-action-definitions") return null;
    return `${ACTION_BASE}${slug}/`;
  } catch {
    return null;
  }
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const named = raw.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/i,
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

export function isPeopleOnlyFirm(firm: string): boolean {
  const t = firm.replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (
    /\b(inc|llc|ltd|corp|company|co\.|holdings|group|llp|plc|bank|n\.a\.|na\b|credit union|technologies|products|partners|services|foundation|association|university|hospital|finance|financial|mortgage|recovery|d\/b\/a|dba)\b/i.test(
      t,
    )
  ) {
    return false;
  }
  return /^(dr|mr|ms|mrs|prof)\.?\s/i.test(t);
}

export function isComplaintDump(text: string): boolean {
  return /complaint_what_happened/i.test(text);
}

export function isRealCfpbOrderBody(text: string): boolean {
  if (isComplaintDump(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 2000) return false;
  if (/Bureau of Consumer Protection/i.test(text) && /Made in the USA Labeling Rule|MUSA Labeling Rule/i.test(text)) {
    return false;
  }
  if (/this document lists observations|inspectional observations|MARCS-CMS/i.test(text)) return false;
  if (/FDA Briefing Document|Pharmacy Compounding Advisory Committee/i.test(text)) return false;
  const bureau = /CONSUMER FINANCIAL PROTECTION BUREAU|Consumer Financial Protection Bureau/i.test(text);
  const order =
    /\bAMENDED CONSENT ORDER\b/i.test(text) ||
    /\bCONSENT ORDER\b/i.test(text) ||
    /\bADMINISTRATIVE ORDER\b/i.test(text);
  const docket =
    /File No\.\s*\d{4}-CFPB-\d+/i.test(text) ||
    /\bADMINISTRATIVE PROCEEDING\b/i.test(text) ||
    /\bFindings of Fact\b/i.test(text);
  const findings =
    /\bFindings of Fact\b/i.test(text) ||
    /\bIT IS ORDERED\b/i.test(text) ||
    /\bIT IS HEREBY ORDERED\b/i.test(text) ||
    /\n\s*\d+\.\s+[A-Z]/.test(text);
  return bureau && order && docket && findings;
}

export function listedCountFromHtml(html: string): number | null {
  const m = html.match(/([\d,]+)\s+filtered results/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseListingHtml(html: string): CfpbOrderListing[] {
  const found: CfpbOrderListing[] = [];
  const seen = new Set<string>();
  const articles = html.match(/<article\b[^>]*o-post-preview[\s\S]*?<\/article>/gi) ?? [];
  for (const article of articles) {
    const href =
      (article.match(/href="([^"]*\/enforcement\/actions\/[^"]+)"/i) || [])[1] || "";
    const slug = slugFromActionUrl(href);
    if (!slug || slug === "enforcement-action-definitions") continue;
    const firm = stripTags((article.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [])[1] || "") || slug;
    if (isPeopleOnlyFirm(firm)) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    const dt = (article.match(/<time[^>]*datetime="([^"]+)"/i) || [])[1] || "";
    found.push({
      id: slug,
      firm,
      date: isoDate(dt),
      actionUrl: `${ACTION_BASE}${slug}/`,
    });
  }
  return found;
}

export function parseActionOrderPdf(html: string): string | null {
  const hrefs = [...html.matchAll(/href="([^"]+\.pdf)"/gi)].map((m) => m[1]);
  const ranked = hrefs
    .map((href) => officialCfpbPdfUrl(href.startsWith("http") ? href : `https://files.consumerfinance.gov${href}`))
    .filter((u): u is string => Boolean(u))
    .sort((a, b) => orderPdfRank(b) - orderPdfRank(a));
  return ranked[0] ?? null;
}

export function parseFileNo(body: string): string | null {
  const file = body.match(/File No\.\s*(\d{4}-CFPB-\d+)/i);
  if (file) return file[1];
  const header = body.match(/\b(\d{4}-CFPB-\d+)\b/);
  return header ? header[1] : null;
}

export function parseOrderTitle(body: string): string {
  if (/\bAMENDED CONSENT ORDER\b/i.test(body)) return "Amended Consent Order";
  if (/\bCONSENT ORDER\b/i.test(body)) return "Consent Order";
  if (/\bADMINISTRATIVE ORDER\b/i.test(body)) return "Administrative Order";
  return "Consent Order";
}

export function parseCfpbOrderText(
  text: string,
  meta: {
    sourceUrl: string;
    firm?: string;
    date?: string | null;
    actionUrl?: string;
    pdfId?: string;
    id?: string;
    fileNo?: string | null;
    title?: string;
  },
): CfpbOrderCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialCfpbPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || "unknown";
  const actionUrl = meta.actionUrl
    ? officialCfpbActionUrl(meta.actionUrl) || meta.actionUrl
    : "";
  const id = meta.id || slugFromActionUrl(actionUrl) || pdfId;
  const date = meta.date ?? isoDate(body.slice(0, 900));
  return {
    id,
    fileNo: meta.fileNo ?? parseFileNo(body),
    pdfId,
    firm: (meta.firm && meta.firm.trim()) || id,
    date,
    title: meta.title || parseOrderTitle(body),
    sourceUrl,
    actionUrl: actionUrl || `${ACTION_BASE}${id}/`,
    body,
  };
}

export function emptySnapshot(reason: string): CfpbOrderSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, actionBase: ACTION_BASE, pdfHost: `https://${PDF_HOST}/` },
    cards: [],
  };
}

function cardDateKey(card: Pick<CfpbOrderCard, "date" | "pdfId">): string {
  return `${card.date ?? ""}${card.pdfId}`;
}

export function assembleSnapshot(
  cards: CfpbOrderCard[],
  fetchedAt = new Date().toISOString(),
): CfpbOrderSnapshot {
  const withBody = cards
    .filter((c) => isRealCfpbOrderBody(c.body))
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
    reason:
      withBody.length > 0
        ? null
        : "Official CFPB consent-order PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, actionBase: ACTION_BASE, pdfHost: `https://${PDF_HOST}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): CfpbOrderSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as CfpbOrderSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): CfpbOrderSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("CFPB_ORDERS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: CfpbOrderSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedCfpbOrderBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealCfpbOrderBody(c.body)));
}

function listingDir(): string {
  return env("CFPB_ORDERS_HTML_DIR") || env("CFPB_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("CFPB_ORDERS_LIMIT", "5");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const raw = env("CFPB_ORDERS_MAX_FETCH", "8");
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

export async function fetchCfpbText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchCfpbBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function pdfToText(pdfPath: string): string {
  const helper = env("CFPB_ORDERS_PDFTOTEXT") || "pdftotext";
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

export function listingPageUrl(page: number): string {
  if (page <= 1) return LISTING_URL;
  return `${LISTING_URL}?page=${page}`;
}

async function loadOfficialListings(dir: string): Promise<{ listed: CfpbOrderListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = raw ? parseListingHtml(raw) : [];
    return { listed, listedCount: raw ? listedCountFromHtml(raw) ?? listed.length : 0 };
  }
  const first = await fetchCfpbText(LISTING_URL);
  const listed = parseListingHtml(first);
  const listedCount = listedCountFromHtml(first) ?? listed.length;
  const seen = new Set(listed.map((r) => r.id));
  const pageCap = 20;
  for (let page = 2; page < pageCap; page += 1) {
    if (listed.length >= listedCount && listedCount > 0) break;
    await pause(250);
    const html = await fetchCfpbText(listingPageUrl(page));
    const rows = parseListingHtml(html);
    if (rows.length === 0) break;
    let added = 0;
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      listed.push(row);
      added += 1;
    }
    if (added === 0) break;
  }
  return { listed, listedCount };
}

function priorBodies(): Map<string, CfpbOrderCard> {
  const prior = new Map<string, CfpbOrderCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealCfpbOrderBody(card.body)) prior.set(card.id, card);
  }
  return prior;
}

async function resolveOrderPdf(
  row: CfpbOrderListing,
  dir: string,
): Promise<{ sourceUrl: string; pdfId: string } | null> {
  const localHtml = readNamedFile(dir, [`${row.id}.html`, `${row.id}-excerpt.html`]);
  if (dir && !localHtml) return null;
  const html = localHtml ?? (await fetchCfpbText(row.actionUrl));
  const sourceUrl = parseActionOrderPdf(html);
  if (!sourceUrl) return null;
  const pdfId = pdfIdFromUrl(sourceUrl);
  if (!pdfId) return null;
  return { sourceUrl, pdfId };
}

export async function collectCfpbOrders(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<CfpbOrderSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = cfpbOrdersDir();
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
        reason: "Official CFPB enforcement listing missed; kept cached consent-order bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official CFPB enforcement listing had no company action links.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: CfpbOrderCard[] = [];
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
      const resolved = await resolveOrderPdf(row, dir);
      if (!resolved) {
        skippedNoText += 1;
        continue;
      }
      const localText = readNamedFile(dir, [`${resolved.pdfId}.txt`, `${resolved.pdfId}-excerpt.txt`, `${row.id}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${resolved.pdfId}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchCfpbBytes(resolved.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseCfpbOrderText(text, {
        sourceUrl: resolved.sourceUrl,
        firm: row.firm,
        date: row.date,
        actionUrl: row.actionUrl,
        pdfId: resolved.pdfId,
        id: row.id,
      });
      if (!isRealCfpbOrderBody(parsed.body)) {
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

export async function loadCfpbOrders(): Promise<CfpbOrderSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealCfpbOrderBody(c.body))) {
    return cached;
  }
  try {
    return await collectCfpbOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealCfpbOrderBody(c.body)) ? "stale" : "empty",
        reason: `Live CFPB consent-order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `CFPB consent-order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildCfpbOrdersManifest(snap: CfpbOrderSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealCfpbOrderBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + firm + date + title + fileNo + official PDF URL only. Order body is the paid GET /cfpb-orders payload. Not the enforcement index. Not the action-page teaser. Not the Consumer Complaint Database. Not FTC /ftc-wl.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: CFPB_ORDERS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      firm: c.firm,
      date: c.date,
      title: c.title,
      fileNo: c.fileNo,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "firm", "date", "title", "fileNo", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, actionBase: ACTION_BASE, pdfHost: `https://${PDF_HOST}/` },
  };
}

export async function loadCfpbOrdersManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildCfpbOrdersManifest(cached);
  return buildCfpbOrdersManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectCfpbOrders()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealCfpbOrderBody(c.body)).length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              fileNo: c.fileNo,
              pdfId: c.pdfId,
              firm: c.firm,
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
