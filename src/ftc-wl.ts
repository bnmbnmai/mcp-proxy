/**
 * FTC Bureau of Consumer Protection warning-letter TEXT door.
 * Official per-letter PDFs from ftc.gov only. Does not invent letter text.
 * Does not wrap the legal-library index or Drupal node (metadata / PDF URL only).
 * Distinct from FDA /warning-letters. Not Apify / Vtron-as-index. Not templates.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FTC_WL_PATH = "/ftc-wl";
export const FTC_WL_MANIFEST_PATH = "/ftc-wl/manifest.json";
export const FTC_WL_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "ftc-bcp-warning-letter-bodies";
export const PRODUCT_NAME = "FTC BCP warning-letter text";

export const LISTING_URL = "https://www.ftc.gov/legal-library/browse/warning-letters";
export const NODE_BASE = "https://www.ftc.gov/legal-library/browse/warning-letters/";
export const PDF_BASE = "https://www.ftc.gov/system/files/ftc_gov/pdf/";
export const NODE_PATH_RE = /\/legal-library\/browse\/warning-letters\/([a-z0-9][a-z0-9-]*)/i;
export const PDF_PATH_RE = /\/system\/files\/(?:ftc_gov\/pdf\/|warning-letters\/)([^"'?\s]+\.pdf)/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "FTC";

export const CARD_FIELDS = [
  "id",
  "nodeId",
  "pdfId",
  "firm",
  "date",
  "subject",
  "sourceUrl",
  "nodeUrl",
  "body",
] as const;

export type FtcWlListing = {
  id: string;
  nodeId: string | null;
  pdfId: string;
  firm: string;
  date: string | null;
  sourceUrl: string;
  nodeUrl: string;
};

export type FtcWlCard = {
  id: string;
  nodeId: string | null;
  pdfId: string;
  firm: string;
  date: string | null;
  subject: string;
  sourceUrl: string;
  nodeUrl: string;
  body: string;
};

export type FtcWlSnapshot = {
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
    nodeBase: string;
    pdfBase: string;
  };
  cards: FtcWlCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FTC BCP public warning letters; +https://www.ftc.gov/)";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ftcWlDir(): string {
  if (env("FTC_WL_DIR")) return resolve(env("FTC_WL_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ftc-wl"));
}

export function snapshotPath(): string {
  return join(ftcWlDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/ftc-wl/seed-snapshot.json"),
    join(here, "fixtures/ftc-wl/seed-snapshot.json"),
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

export function slugFromNodeUrl(url: string): string | null {
  const m = url.match(NODE_PATH_RE);
  return m ? m[1].toLowerCase() : null;
}

export function pdfIdFromUrl(url: string): string | null {
  const m = url.match(PDF_PATH_RE);
  if (!m) return null;
  return m[1].replace(/\.pdf$/i, "").toLowerCase();
}

export function officialFtcPdfUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://www.ftc.gov");
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") {
      const inner = parsed.pathname.match(/\/https?:\/\/(?:www\.)?ftc\.gov(\/system\/files\/.+)/i);
      return inner ? officialFtcPdfUrl(`https://www.ftc.gov${inner[1]}`) : null;
    }
    if (host === "search.ftc.gov") {
      return officialFtcPdfUrl(`https://www.ftc.gov${parsed.pathname}${parsed.search}`);
    }
    if (host !== "www.ftc.gov" && host !== "ftc.gov") return null;
    const pdf = parsed.pathname.match(PDF_PATH_RE);
    if (!pdf) return null;
    if (/\/system\/files\/warning-letters\//i.test(parsed.pathname)) {
      return `https://www.ftc.gov/system/files/warning-letters/${pdf[1]}`;
    }
    return `${PDF_BASE}${pdf[1]}`;
  } catch {
    return null;
  }
}

export function officialFtcNodeUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://www.ftc.gov");
    const host = parsed.hostname.toLowerCase();
    if (host !== "www.ftc.gov" && host !== "ftc.gov") return null;
    const slug = slugFromNodeUrl(parsed.pathname);
    return slug ? `${NODE_BASE}${slug}` : null;
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

export function isTemplateListing(firm: string, pdfId: string, slug: string): boolean {
  const blob = `${firm} ${pdfId} ${slug}`.toLowerCase();
  return /\btemplate\b/.test(blob);
}

export function isPeopleOnlyFirm(firm: string): boolean {
  const t = firm.replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (/\b(inc|llc|ltd|corp|company|co\.|holdings|group|llp|plc|bank|technologies|products|partners|services|foundation|association|university|hospital|motors|automotive|d\/b\/a|dba)\b/i.test(t)) {
    return false;
  }
  return /^(dr|mr|ms|mrs|prof)\.?\s/i.test(t);
}

export function isTemplateBody(text: string): boolean {
  return /\[recipient name\]|\[insert recipient|\[platform name\]|\[recipient contact/i.test(text);
}

export function isRealFtcWlBody(text: string): boolean {
  if (isTemplateBody(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 400) return false;
  if (/this document lists observations|inspectional observations|MARCS-CMS/i.test(text)) return false;
  if (/FDA Briefing Document|Pharmacy Compounding Advisory Committee/i.test(text)) return false;
  const bureau = /Bureau of Consumer Protection/i.test(text);
  const ftc = /Federal Trade Commission/i.test(text);
  const letter =
    /warning letter/i.test(text) ||
    /Made in the USA Labeling Rule|MUSA Labeling Rule/i.test(text) ||
    /Section 5 of the FTC Act|15 U\.S\.C\.\s*§\s*45/i.test(text);
  return bureau && ftc && letter;
}

export function listedCountFromHtml(html: string): number | null {
  const m = html.match(/Displaying\s+\d+\s+-\s+\d+\s+of\s+([\d,]+)/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseListingHtml(html: string): FtcWlListing[] {
  const found: FtcWlListing[] = [];
  const seen = new Set<string>();
  const articles = html.match(/<article\b[^>]*node--type-warning-letter[\s\S]*?<\/article>/gi) ?? [];
  for (const article of articles) {
    const about = (article.match(/\babout="([^"]+)"/i) || [])[1] || "";
    const href =
      (article.match(/<h3[^>]*>[\s\S]*?href="([^"]*\/legal-library\/browse\/warning-letters\/[^"]+)"/i) ||
        [])[1] || about;
    const slug = slugFromNodeUrl(href) || slugFromNodeUrl(about);
    if (!slug) continue;
    const firm = stripTags((article.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [])[1] || "") || slug;
    const pdfHref = (article.match(/href="([^"]*\/system\/files\/[^"]+\.pdf)"/i) || [])[1] || "";
    const sourceUrl = officialFtcPdfUrl(pdfHref.startsWith("http") ? pdfHref : `https://www.ftc.gov${pdfHref}`);
    if (!sourceUrl) continue;
    const pdfId = pdfIdFromUrl(sourceUrl);
    if (!pdfId || seen.has(pdfId)) continue;
    if (isTemplateListing(firm, pdfId, slug)) continue;
    if (isPeopleOnlyFirm(firm)) continue;
    seen.add(pdfId);
    const nodeId = (article.match(/node--(\d{3,})/i) || [])[1] || null;
    const dt = (article.match(/<time[^>]*datetime="([^"]+)"/i) || [])[1] || "";
    found.push({
      id: slug,
      nodeId,
      pdfId,
      firm,
      date: isoDate(dt),
      sourceUrl,
      nodeUrl: `${NODE_BASE}${slug}`,
    });
  }
  return found;
}

export function parseSubject(body: string): string {
  const re = body.match(/Re:\s+([^\n]+)/i);
  return re ? re[1].replace(/\s+/g, " ").trim() : "";
}

export function parseFtcWlText(
  text: string,
  meta: {
    sourceUrl: string;
    firm?: string;
    date?: string | null;
    nodeId?: string | null;
    nodeUrl?: string;
    pdfId?: string;
    id?: string;
  },
): FtcWlCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFtcPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || "unknown";
  const nodeUrl = meta.nodeUrl ? officialFtcNodeUrl(meta.nodeUrl) || meta.nodeUrl : "";
  const id = meta.id || slugFromNodeUrl(nodeUrl) || pdfId;
  const date = meta.date ?? isoDate(body.slice(0, 900));
  return {
    id,
    nodeId: meta.nodeId ?? null,
    pdfId,
    firm: (meta.firm && meta.firm.trim()) || id,
    date,
    subject: parseSubject(body),
    sourceUrl,
    nodeUrl: nodeUrl || `${NODE_BASE}${id}`,
    body,
  };
}

export function emptySnapshot(reason: string): FtcWlSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, nodeBase: NODE_BASE, pdfBase: PDF_BASE },
    cards: [],
  };
}

function cardDateKey(card: Pick<FtcWlCard, "date" | "pdfId">): string {
  return `${card.date ?? ""}${card.pdfId}`;
}

export function assembleSnapshot(cards: FtcWlCard[], fetchedAt = new Date().toISOString()): FtcWlSnapshot {
  const withBody = cards
    .filter((c) => isRealFtcWlBody(c.body))
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
        : "Official FTC warning-letter PDFs had no extractable BCP letter text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, nodeBase: NODE_BASE, pdfBase: PDF_BASE },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): FtcWlSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FtcWlSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): FtcWlSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("FTC_WL_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: FtcWlSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedFtcWlBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealFtcWlBody(c.body)));
}

function listingDir(): string {
  return env("FTC_WL_HTML_DIR") || env("FTC_WL_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("FTC_WL_LIMIT", "5");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const raw = env("FTC_WL_MAX_FETCH", "8");
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

export async function fetchFtcText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchFtcBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FTC_WL_PDFTOTEXT") || "pdftotext";
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
  if (page <= 0) return LISTING_URL;
  return `${LISTING_URL}?page=${page}`;
}

async function loadOfficialListings(dir: string): Promise<{ listed: FtcWlListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = raw ? parseListingHtml(raw) : [];
    return { listed, listedCount: raw ? listedCountFromHtml(raw) ?? listed.length : 0 };
  }
  const first = await fetchFtcText(LISTING_URL);
  const listed = parseListingHtml(first);
  const listedCount = listedCountFromHtml(first) ?? listed.length;
  const seen = new Set(listed.map((r) => r.pdfId));
  const pageCap = 40;
  for (let page = 1; page < pageCap; page += 1) {
    if (listed.length >= listedCount && listedCount > 0) break;
    await pause(250);
    const html = await fetchFtcText(listingPageUrl(page));
    const rows = parseListingHtml(html);
    if (rows.length === 0) break;
    let added = 0;
    for (const row of rows) {
      if (seen.has(row.pdfId)) continue;
      seen.add(row.pdfId);
      listed.push(row);
      added += 1;
    }
    if (added === 0) break;
  }
  return { listed, listedCount };
}

function priorBodies(): Map<string, FtcWlCard> {
  const prior = new Map<string, FtcWlCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealFtcWlBody(card.body)) prior.set(card.pdfId, card);
  }
  return prior;
}

export async function collectFtcWl(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FtcWlSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ftcWlDir();
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
        reason: "Official FTC warning-letter listing missed; kept cached BCP letter bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official FTC warning-letter listing had no per-letter PDF links.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: FtcWlCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = prior.get(row.pdfId);
    if (cached) {
      cards.push(cached);
      seen.add(row.pdfId);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    if (!dir) await pause(pauseMs);
    try {
      const localText = readNamedFile(dir, [`${row.pdfId}.txt`, `${row.pdfId}-excerpt.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${row.pdfId}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchFtcBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseFtcWlText(text, {
        sourceUrl: row.sourceUrl,
        firm: row.firm,
        date: row.date,
        nodeId: row.nodeId,
        nodeUrl: row.nodeUrl,
        pdfId: row.pdfId,
        id: row.id,
      });
      if (!isRealFtcWlBody(parsed.body)) {
        skippedNoText += 1;
        continue;
      }
      cards.push(parsed);
      seen.add(row.pdfId);
      addedThisRun += 1;
    } catch {
      skippedNoText += 1;
    }
  }
  for (const [pdfId, card] of prior) {
    if (!seen.has(pdfId)) cards.push(card);
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

export async function loadFtcWl(): Promise<FtcWlSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealFtcWlBody(c.body))) {
    return cached;
  }
  try {
    return await collectFtcWl();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealFtcWlBody(c.body)) ? "stale" : "empty",
        reason: `Live FTC warning-letter fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `FTC BCP warning-letter PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFtcWlManifest(snap: FtcWlSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFtcWlBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + firm + date + subject + official PDF URL only. Letter body is the paid GET /ftc-wl payload.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: FTC_WL_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      firm: c.firm,
      date: c.date,
      subject: c.subject,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "firm", "date", "subject", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, nodeBase: NODE_BASE, pdfBase: PDF_BASE },
  };
}

export async function loadFtcWlManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildFtcWlManifest(cached);
  return buildFtcWlManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFtcWl()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealFtcWlBody(c.body)).length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              nodeId: c.nodeId,
              pdfId: c.pdfId,
              firm: c.firm,
              date: c.date,
              subject: c.subject,
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
