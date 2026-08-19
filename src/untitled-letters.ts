/**
 * FDA Untitled Letter BODIES door (CDER OPDP + CBER APLB promo).
 * Official per-letter PDFs at /media/{id}/download only.
 * Does not invent letter text. Does not wrap the HTML index.
 * Distinct from /warning-letters (HTML warning-letter bodies).
 * Not Form 483. Not openFDA. Not OII dashboard CRLs.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const UNTITLED_LETTERS_PATH = "/untitled-letters";
export const UNTITLED_LETTERS_MANIFEST_PATH = "/untitled-letters/manifest.json";
export const UNTITLED_LETTERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "fda-untitled-letter-bodies";
export const PRODUCT_NAME = "FDA Untitled Letters (CDER OPDP + CBER promo)";

export const CDER_LISTING_URL =
  "https://www.fda.gov/drugs/warning-letters-and-notice-violation-letters-pharmaceutical-companies/untitled-letters";
export const CBER_LISTING_URL =
  "https://www.fda.gov/vaccines-blood-biologics/enforcement-actions-cber/untitled-letters-regarding-advertising-promotional-labeling-approved-biologics";
export const HUB_URL =
  "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/issuance-untitled-letters";
export const CDER_WAYBACK_URL =
  "https://web.archive.org/web/20260629/https://www.fda.gov/drugs/warning-letters-and-notice-violation-letters-pharmaceutical-companies/untitled-letters";
export const CBER_WAYBACK_URL =
  "https://web.archive.org/web/20260629/https://www.fda.gov/vaccines-blood-biologics/enforcement-actions-cber/untitled-letters-regarding-advertising-promotional-labeling-approved-biologics";
export const MEDIA_BASE = "https://www.fda.gov/media/";
export const MEDIA_PATH_RE = /\/media\/(\d+)\/download/i;
export const LICENSE = "17 USC 105";

export const CARD_FIELDS = [
  "id",
  "mediaId",
  "firm",
  "date",
  "product",
  "office",
  "center",
  "sourceUrl",
  "body",
  "cites",
  "said",
] as const;

export type UntitledOffice = "OPDP" | "CBER";
export type UntitledCenter = "CDER" | "CBER";

export type UntitledListing = {
  id: string;
  mediaId: string;
  firm: string;
  date: string | null;
  product: string;
  office: UntitledOffice;
  center: UntitledCenter;
  sourceUrl: string;
};

export type UntitledCard = {
  id: string;
  mediaId: string;
  firm: string;
  date: string | null;
  product: string;
  office: UntitledOffice;
  center: UntitledCenter;
  sourceUrl: string;
  body: string;
  cites: string[];
  said: string;
};

export type UntitledLettersSnapshot = {
  ok: true;
  product: typeof PRODUCT_ID;
  status: "ok" | "empty" | "stale";
  reason: string | null;
  fetchedAt: string;
  asOf: string | null;
  license: typeof LICENSE;
  listedCount?: number;
  fetchedPdfs?: number;
  skippedNoText?: number;
  reused?: number;
  addedThisRun?: number;
  sources: {
    cder: string;
    cber: string;
    hub: string;
    mediaBase: string;
  };
  cards: UntitledCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FDA untitled-letter public PDFs; +https://www.fda.gov/)";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function untitledLettersDir(): string {
  if (env("UNTITLED_LETTERS_DIR")) return resolve(env("UNTITLED_LETTERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/untitled-letters"));
}

export function snapshotPath(): string {
  return join(untitledLettersDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/fda-untitled-letters/seed-snapshot.json"),
    join(here, "fixtures/fda-untitled-letters/seed-snapshot.json"),
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

export function absolutePdfUrl(href: string): string {
  const clean = href.replace(/\?attachment.*$/i, "");
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    const media = clean.match(MEDIA_PATH_RE);
    return media ? `${MEDIA_BASE}${media[1]}/download` : clean;
  }
  if (clean.startsWith("/")) {
    const media = clean.match(MEDIA_PATH_RE);
    return media ? `${MEDIA_BASE}${media[1]}/download` : `https://www.fda.gov${clean}`;
  }
  return `${MEDIA_BASE}${clean.replace(/^\.\//, "")}`;
}

export function mediaIdFromUrl(url: string): string | null {
  const m = url.match(MEDIA_PATH_RE);
  return m ? m[1] : null;
}

export function slugFirm(firm: string): string {
  return firm
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function letterId(firm: string, mediaId: string): string {
  const slug = slugFirm(firm);
  return slug ? `${slug}-${mediaId}` : mediaId;
}

function isoDate(raw: string | null | undefined): string | null {
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

function isUntitledLetterLink(label: string, title: string): boolean {
  const blob = `${label} ${title}`.toLowerCase();
  if (!blob.includes("untitled letter")) return false;
  if (/promotional material|close-?out|response letter|warning letter/i.test(blob)) return false;
  return true;
}

export function parseCderListingHtml(html: string): UntitledListing[] {
  const found: UntitledListing[] = [];
  const seen = new Set<string>();
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const tds = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? [];
    if (tds.length < 3) continue;
    const date = isoDate(stripTags(tds[0] ?? ""));
    const product = stripTags(tds[2] ?? "");
    const companyHtml = tds[1] ?? "";
    const firmP = companyHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const firm = stripTags(firmP?.[1] ?? companyHtml.split(/<ul|<li|<a/i)[0]) || "";
    const anchors = companyHtml.match(/<a[^>]+href="[^"]+"[^>]*>[\s\S]*?<\/a>/gi) ?? [];
    for (const a of anchors) {
      const href = (a.match(/href="([^"]+)"/i) || [])[1];
      const title = (a.match(/title="([^"]+)"/i) || [])[1] ?? "";
      const label = stripTags(a);
      if (!href || !MEDIA_PATH_RE.test(href) || !isUntitledLetterLink(label, title)) continue;
      const mediaId = mediaIdFromUrl(href);
      if (!mediaId || seen.has(mediaId)) continue;
      seen.add(mediaId);
      const firmName = firm || title.split("|")[0]?.trim() || mediaId;
      found.push({
        id: letterId(firmName, mediaId),
        mediaId,
        firm: firmName,
        date,
        product,
        office: "OPDP",
        center: "CDER",
        sourceUrl: absolutePdfUrl(href),
      });
    }
  }
  return found;
}

export function parseCberListingHtml(html: string): UntitledListing[] {
  const found: UntitledListing[] = [];
  const seen = new Set<string>();
  const items = html.match(/<li[^>]*>[\s\S]*?<\/li>/gi) ?? [];
  const blobs = items.length ? items : [html];
  for (const item of blobs) {
    const href = (item.match(/href="([^"]*\/media\/\d+\/download[^"]*)"/i) || [])[1];
    const title = (item.match(/title="([^"]+)"/i) || [])[1] ?? "";
    const label = stripTags((item.match(/<a[^>]*>([\s\S]*?)<\/a>/i) || [])[1] ?? "");
    if (!href || !isUntitledLetterLink(label, title)) continue;
    const mediaId = mediaIdFromUrl(href);
    if (!mediaId || seen.has(mediaId)) continue;
    seen.add(mediaId);
    const after = stripTags(item.replace(/<a[\s\S]*?<\/a>/i, " "));
    const titled = title || label;
    const product =
      (titled.match(/untitled letter\s*[-–—]\s*(.+)$/i) || [])[1]?.trim() ||
      after.split(/\s{2,}/)[0] ||
      "";
    const firm = after.replace(/^\d{4}\s*/, "").trim() || product || mediaId;
    found.push({
      id: letterId(firm, mediaId),
      mediaId,
      firm,
      date: isoDate(titled) ?? isoDate(item),
      product,
      office: "CBER",
      center: "CBER",
      sourceUrl: absolutePdfUrl(href),
    });
  }
  return found;
}

export function parseListingHtml(html: string): UntitledListing[] {
  const cder = parseCderListingHtml(html);
  if (cder.length > 0) return cder;
  return parseCberListingHtml(html);
}

export function isRealUntitledBody(text: string): boolean {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 400) return false;
  if (/this document lists observations|inspectional observations/i.test(text)) return false;
  if (/^\s*WARNING LETTER\b/m.test(text) && !/untitled/i.test(text)) return false;
  const office =
    /office of prescription drug promotion|\bOPDP\b|advertising and promotional labeling branch|\bAPLB\b/i.test(
      text,
    );
  const violation = /misbrand|false or misleading|promotional communication|promotional materials/i.test(text);
  return office && violation;
}

export function parseCites(body: string): string[] {
  const found = new Set<string>();
  const add = (raw: string) => {
    const clean = raw.replace(/\s+/g, " ").replace(/[.,;]+$/g, "").trim();
    if (clean.length >= 6 && clean.length < 80) found.add(clean);
  };
  for (const m of body.matchAll(/21\s+U\.S\.C\.\s+\d+(?:\([a-z0-9]+\))?/gi)) add(m[0]);
  for (const m of body.matchAll(/21\s+CFR\s+[\d.]+(?:\([a-z0-9]+\))*/gi)) add(m[0]);
  if (/FD&C Act/i.test(body)) found.add("FD&C Act");
  return [...found];
}

export function parseSaid(body: string): string {
  const paras = body
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/[ \t]+/g, " ").replace(/\s+\n/g, "\n").trim())
    .filter((p) => p.length > 60);
  const determined = paras.find(
    (p) => /has determined that|false or misleading|misbrand/i.test(p) && p.length < 1400,
  );
  if (determined) return determined.replace(/\s+/g, " ").trim();
  const reviewed = paras.find((p) => /has reviewed/i.test(p) && p.length < 1400);
  return reviewed ? reviewed.replace(/\s+/g, " ").trim() : "";
}

function officeFromBody(text: string, fallback: UntitledOffice): UntitledOffice {
  if (/advertising and promotional labeling branch|\bAPLB\b/i.test(text)) return "CBER";
  if (/office of prescription drug promotion|\bOPDP\b/i.test(text)) return "OPDP";
  return fallback;
}

function productFromBody(text: string, fallback: string): string {
  const re = text.match(
    /RE:\s*(?:NDA\s+\d+\s+|BLA\s+[\d/,\s]+)?\s*([A-Z0-9®™][^\n]{2,80}?)(?:\s+MA\s+\d+|\s*$)/im,
  );
  if (re?.[1]) return re[1].replace(/\s+/g, " ").trim();
  return fallback;
}

function dateFromBody(text: string, fallback: string | null): string | null {
  const top = text.slice(0, 800);
  return isoDate(top) ?? fallback;
}

export function parseUntitledText(
  text: string,
  meta: {
    sourceUrl: string;
    firm?: string;
    date?: string | null;
    product?: string;
    office?: UntitledOffice;
    center?: UntitledCenter;
  },
): UntitledCard {
  const mediaId = mediaIdFromUrl(meta.sourceUrl) || "unknown";
  const body = text.replace(/\f/g, "\n").trim();
  const office = officeFromBody(body, meta.office ?? "OPDP");
  const center = meta.center ?? (office === "CBER" ? "CBER" : "CDER");
  const firm = (meta.firm && meta.firm.trim()) || mediaId;
  return {
    id: letterId(firm, mediaId),
    mediaId,
    firm,
    date: dateFromBody(body, meta.date ?? null),
    product: productFromBody(body, meta.product ?? ""),
    office,
    center,
    sourceUrl: meta.sourceUrl,
    body,
    cites: parseCites(body),
    said: parseSaid(body),
  };
}

export function emptySnapshot(reason: string): UntitledLettersSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    sources: { cder: CDER_LISTING_URL, cber: CBER_LISTING_URL, hub: HUB_URL, mediaBase: MEDIA_BASE },
    cards: [],
  };
}

function cardDateKey(card: Pick<UntitledCard, "date">): string {
  return card.date ?? "";
}

export function assembleSnapshot(
  cards: UntitledCard[],
  fetchedAt = new Date().toISOString(),
): UntitledLettersSnapshot {
  const withBody = cards
    .filter((c) => isRealUntitledBody(c.body))
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
    reason: withBody.length > 0 ? null : "Official untitled-letter PDFs had no extractable OPDP/CBER letter text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    sources: { cder: CDER_LISTING_URL, cber: CBER_LISTING_URL, hub: HUB_URL, mediaBase: MEDIA_BASE },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): UntitledLettersSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as UntitledLettersSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): UntitledLettersSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("UNTITLED_LETTERS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: UntitledLettersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedUntitledBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealUntitledBody(c.body)));
}

function htmlDir(): string {
  return env("UNTITLED_LETTERS_HTML_DIR");
}

function firstSliceLimit(): number {
  const raw = env("UNTITLED_LETTERS_LIMIT", "30");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

function maxFetchLimit(): number {
  const raw = env("UNTITLED_LETTERS_MAX_FETCH", "40");
  if (raw === "0") return 0;
  const n = Number(raw);
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

export async function fetchFdaText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchFdaBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function pdfToText(pdfPath: string): string {
  const helper = env("UNTITLED_LETTERS_PDFTOTEXT") || "pdftotext";
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

async function fetchListingWithWayback(liveUrl: string, waybackUrl: string): Promise<string> {
  try {
    return await fetchFdaText(liveUrl);
  } catch {
    return await fetchFdaText(waybackUrl);
  }
}

async function loadOfficialListings(dir: string): Promise<UntitledListing[]> {
  if (dir) {
    const cderHtml = readNamedFile(dir, ["listing-cder-excerpt.html", "listing-cder.html", "listing.html"]);
    const cberHtml = readNamedFile(dir, ["listing-cber-excerpt.html", "listing-cber.html"]);
    const listed = [
      ...(cderHtml ? parseCderListingHtml(cderHtml) : []),
      ...(cberHtml ? parseCberListingHtml(cberHtml) : []),
    ];
    if (listed.length > 0) return listed;
    const any = readNamedFile(dir, ["listing.html", "listing-excerpt.html"]);
    return any ? parseListingHtml(any) : [];
  }
  const [cderHtml, cberHtml] = await Promise.all([
    fetchListingWithWayback(CDER_LISTING_URL, CDER_WAYBACK_URL),
    fetchListingWithWayback(CBER_LISTING_URL, CBER_WAYBACK_URL),
  ]);
  return [...parseCderListingHtml(cderHtml), ...parseCberListingHtml(cberHtml)];
}

function priorBodies(): Map<string, UntitledCard> {
  const prior = new Map<string, UntitledCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealUntitledBody(card.body)) prior.set(card.mediaId, card);
  }
  return prior;
}

export async function collectUntitledLetters(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<UntitledLettersSnapshot> {
  const dir = opts?.htmlDir ?? htmlDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const allListed = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = untitledLettersDir();
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
        reason: "Official listing missed; kept cached untitled-letter bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official CDER/CBER untitled-letter indexes had no per-letter PDF links.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: UntitledCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = prior.get(row.mediaId);
    if (cached) {
      cards.push(cached);
      seen.add(row.mediaId);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    if (!dir) await pause(pauseMs);
    try {
      const localText = readNamedFile(dir, [`${row.mediaId}.txt`, `${row.mediaId}-excerpt.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${row.mediaId}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchFdaBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseUntitledText(text, {
        sourceUrl: row.sourceUrl,
        firm: row.firm,
        date: row.date,
        product: row.product,
        office: row.office,
        center: row.center,
      });
      if (!isRealUntitledBody(parsed.body)) {
        skippedNoText += 1;
        continue;
      }
      cards.push(parsed);
      seen.add(row.mediaId);
      addedThisRun += 1;
    } catch {
      skippedNoText += 1;
    }
  }
  for (const [mediaId, card] of prior) {
    if (!seen.has(mediaId)) cards.push(card);
  }
  const snap = {
    ...assembleSnapshot(cards),
    listedCount: allListed.length,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeSnapshot(snap);
  return snap;
}

export async function loadUntitledLetters(): Promise<UntitledLettersSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealUntitledBody(c.body))) {
    return cached;
  }
  try {
    return await collectUntitledLetters();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealUntitledBody(c.body)) ? "stale" : "empty",
        reason: `Live FDA untitled-letter fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `FDA untitled-letter PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildUntitledLettersManifest(snap: UntitledLettersSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealUntitledBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + id + firm + date + product + official source only. Letter text / Cites / what OPDP or CBER said is the paid GET /untitled-letters payload. Not /warning-letters.",
    license: LICENSE,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: UNTITLED_LETTERS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      firm: c.firm,
      date: c.date,
      product: c.product,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "firm", "date", "product", "sourceUrl"] },
    sources: snap?.sources ?? {
      cder: CDER_LISTING_URL,
      cber: CBER_LISTING_URL,
      hub: HUB_URL,
      mediaBase: MEDIA_BASE,
    },
  };
}

export async function loadUntitledLettersManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildUntitledLettersManifest(cached);
  return buildUntitledLettersManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectUntitledLetters()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealUntitledBody(c.body)).length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              mediaId: c.mediaId,
              firm: c.firm,
              date: c.date,
              product: c.product,
              office: c.office,
              citeCount: c.cites.length,
              saidChars: c.said.length,
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
