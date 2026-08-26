/**
 * FDA Pharmacy Compounding Advisory Committee 503A briefing-memo TEXT door.
 * Official FDA-authored per-substance PDFs from PCAC year-materials + meeting pages.
 * First-slice miss: only the July 2026 meeting page (~7 memos). Official year
 * tables list October 29, 2024 and December 4, 2024 as well.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const PCAC_PATH = "/pcac";
export const PCAC_MANIFEST_PATH = "/pcac/manifest.json";
export const PCAC_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "fda-pcac-503a-memos";
export const PRODUCT_NAME = "FDA PCAC 503A briefing-memo text";

export const MEETING_URL =
  "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026";
/** First-slice teaser: July 2026 page 0 only. Official catalog continues on year-materials. */
export const FIRST_SLICE_MEETING_URL = MEETING_URL;
export const MEETING_WAYBACK_URL =
  "https://web.archive.org/web/20260724170451id_/https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026";
/** Official year tables that list meeting pages. 2022 is a combined pack (skipped). */
export const YEAR_MATERIALS_URLS = [
  "https://www.fda.gov/advisory-committees/pharmacy-compounding-advisory-committee/2026-meeting-materials-pharmacy-compounding-advisory-committee",
  "https://www.fda.gov/advisory-committees/pharmacy-compounding-advisory-committee/2024-meeting-materials-pharmacy-compounding-advisory-committee",
] as const;
export const OCT_2024_MEETING_URL =
  "https://www.fda.gov/advisory-committees/advisory-committee-calendar/october-29-2024-meeting-pharmacy-compounding-advisory-committee-10292024";
export const DEC_2024_MEETING_URL =
  "https://www.fda.gov/advisory-committees/advisory-committee-calendar/updated-meeting-time-and-public-participation-information-december-4-2024-meeting-pharmacy";
export const MEETING_URLS = [MEETING_URL, OCT_2024_MEETING_URL, DEC_2024_MEETING_URL] as const;
export const FR_NOTICE_URL = "https://www.govinfo.gov/content/pkg/FR-2026-04-16/html/2026-07361.htm";
export const DOCKET = "FDA-2025-N-6895";
export const MEETING_LABEL = "July 23-24, 2026";
export const MEDIA_BASE = "https://www.fda.gov/media/";
export const MEDIA_PATH_RE = /\/media\/(\d+)\/download/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "FDA";

export const CARD_FIELDS = [
  "id",
  "substance",
  "date",
  "meeting",
  "mediaId",
  "sourceUrl",
  "body",
] as const;

export type PcacListing = {
  id: string;
  substance: string;
  mediaId: string;
  date: string | null;
  meeting: string;
  sourceUrl: string;
};

export type PcacCard = {
  id: string;
  substance: string;
  date: string | null;
  meeting: string;
  mediaId: string;
  sourceUrl: string;
  body: string;
};

export type PcacSnapshot = {
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
    meeting: string;
    frNotice: string;
    docket: string;
    mediaBase: string;
  };
  cards: PcacCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FDA PCAC public briefing memos; +https://www.fda.gov/)";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function pcacDir(): string {
  if (env("PCAC_DIR")) return resolve(env("PCAC_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/pcac"));
}

export function snapshotPath(): string {
  return join(pcacDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/fda-pcac/seed-snapshot.json"),
    join(here, "fixtures/fda-pcac/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function mediaIdFromUrl(url: string): string | null {
  const m = url.match(MEDIA_PATH_RE);
  return m ? m[1] : null;
}

export function officialFdaMediaUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://www.fda.gov");
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") {
      const inner = parsed.pathname.match(/\/https?:\/\/www\.fda\.gov(\/media\/\d+\/download)/i);
      return inner ? `https://www.fda.gov${inner[1]}` : null;
    }
    if (host !== "www.fda.gov" && host !== "fda.gov") return null;
    const media = parsed.pathname.match(MEDIA_PATH_RE);
    return media ? `${MEDIA_BASE}${media[1]}/download` : null;
  } catch {
    return null;
  }
}

export function slugName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cardId(substance: string, mediaId: string): string {
  const slug = slugName(substance);
  return slug ? `${slug}-${mediaId}` : mediaId;
}

function decodeHtml(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const named = raw.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
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
    const mm = months[named[2].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[1].padStart(2, "0")}` : null;
  }
  return null;
}

export function isPerSubstanceMemoTitle(title: string): boolean {
  const t = title.replace(/\s+/g, " ").trim();
  if (!/FDA Briefing Document/i.test(t)) return false;
  if (/Briefing Document(?:-\d+-?)?\s*Introduction/i.test(t)) return false;
  if (
    /FDA Presentations|Final Agenda|Meeting Roster|Webcast Information|\bQuestions\b|Waiver|Disclosure|Transcript|Minutes|Errata/i.test(
      t,
    )
  ) {
    return false;
  }
  if (/Related Bulk Drug Substances/i.test(t)) return true;
  return /FDA Briefing Document-\d+-\s*\S/i.test(t);
}

export function substanceFromTitle(title: string): string | null {
  const related = title.match(
    /FDA Briefing Document for (.+?)[- ]Related Bulk Drug Substances/i,
  );
  if (related?.[1]) return related[1].replace(/\s+/g, " ").trim();
  const numbered = title.match(/FDA Briefing Document-\d+-\s*(.+)$/i);
  if (numbered?.[1]) {
    const name = numbered[1].replace(/\s+/g, " ").trim();
    if (!name || /^introduction$/i.test(name)) return null;
    return name;
  }
  return null;
}

export function meetingLabelFromHtml(html: string, fallback = MEETING_LABEL): string {
  const blob = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const range = blob.match(
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*\d{1,2},\s+\d{4})\b/i,
  );
  if (range) return range[1].replace(/\s+/g, " ").replace("–", "-").trim();
  const single = blob.match(
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})\b/i,
  );
  return single ? single[1].replace(/\s+/g, " ").trim() : fallback;
}

export function meetingLabelFromUrl(url: string, fallback = MEETING_LABEL): string {
  const slug = url.toLowerCase();
  if (slug.includes("july-23-24-2026")) return "July 23-24, 2026";
  if (slug.includes("october-29-2024")) return "October 29, 2024";
  if (slug.includes("december-4-2024")) return "December 4, 2024";
  return fallback;
}

export function officialMeetingPageUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath, "https://www.fda.gov");
    if (parsed.hostname !== "www.fda.gov" && parsed.hostname !== "fda.gov") return null;
    if (!/\/advisory-committees\/advisory-committee-calendar\//i.test(parsed.pathname)) return null;
    if (!/pharmacy-compounding|meeting-pharmacy/i.test(parsed.pathname)) return null;
    return `https://www.fda.gov${parsed.pathname}`;
  } catch {
    return null;
  }
}

export function parseYearMaterialsHtml(html: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const blockRe = /<a\b[^>]*\bhref="([^"]+)"[^>]*>/gi;
  for (const m of html.matchAll(blockRe)) {
    const href = decodeHtml(m[1]);
    const url = officialMeetingPageUrl(href.startsWith("http") ? href : `https://www.fda.gov${href}`);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    found.push(url);
  }
  return found;
}

export function parseListingHtml(html: string, meeting?: string): PcacListing[] {
  const label = meeting || meetingLabelFromHtml(html);
  const found: PcacListing[] = [];
  const seen = new Set<string>();
  const blockRe = /<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(blockRe)) {
    const href = decodeHtml(m[1]);
    const title = decodeHtml(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (!isPerSubstanceMemoTitle(title)) continue;
    const sourceUrl = officialFdaMediaUrl(
      href.startsWith("http") ? href : `https://www.fda.gov${href}`,
    );
    if (!sourceUrl) continue;
    const mediaId = mediaIdFromUrl(sourceUrl);
    if (!mediaId || seen.has(mediaId)) continue;
    const substance = substanceFromTitle(title);
    if (!substance) continue;
    seen.add(mediaId);
    found.push({
      id: cardId(substance, mediaId),
      substance,
      mediaId,
      date: null,
      meeting: label,
      sourceUrl,
    });
  }
  return found;
}

export function mergeOfficialListings(listed: PcacListing[]): PcacListing[] {
  const seen = new Set<string>();
  const out: PcacListing[] = [];
  for (const row of listed) {
    if (!row.mediaId || seen.has(row.mediaId)) continue;
    seen.add(row.mediaId);
    out.push(row);
  }
  return out;
}

export function stripNominatorPacks(text: string): string {
  const raw = text.replace(/\r/g, "");
  const titled = raw.search(/\n[^\n]{0,80}acetate\)\s*Nominations\s*\n/i);
  if (titled >= 0) return raw.slice(0, titled).trim();
  const standalone = raw.search(/\n[ \t]*Nominations[ \t]*\n/);
  if (standalone >= 0 && standalone > raw.length * 0.4) return raw.slice(0, standalone).trim();
  return raw.trim();
}

export function isCombinedSponsorPack(text: string): boolean {
  const compact = text.replace(/\s+/g, " ");
  if (/How is the ingredient supplied\?/i.test(text) && !/FDA Evaluation of/i.test(text)) {
    return true;
  }
  if (/Sponsor\s*\/\s*Industry Briefing|combined nominator presentation/i.test(text)) return true;
  if (/FDA Briefing Document Introduction/i.test(text) && !/FDA Evaluation of .{3,40}Related/i.test(text)) {
    return true;
  }
  if (/nominator presentation supporting the nomination/i.test(compact) && compact.length < 2500) {
    return true;
  }
  return false;
}

export function isRealPcacBody(text: string): boolean {
  if (isCombinedSponsorPack(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 400) return false;
  if (/Federal Register Volume/i.test(text) && /Notice of Meeting/i.test(text) && compact.length < 4000) {
    return false;
  }
  if (/multidisciplinary review/i.test(text) && /Center for Drug Evaluation and Research/i.test(text)) {
    return false;
  }
  if (/this document lists observations made by the FDA|inspectional observations/i.test(text)) {
    return false;
  }
  if (/^\s*WARNING LETTER\b/m.test(text)) return false;
  if (/european public assessment report|swiss public assessment report/i.test(text)) return false;
  const official =
    /FDA Briefing Document/i.test(text) &&
    /Pharmacy Compounding Advisory Committee/i.test(text) &&
    /503A/i.test(text);
  const evaluation =
    /weighs against/i.test(text) ||
    /we propose not adding/i.test(text) ||
    /CONCLUSION AND RECOMMENDATION/i.test(text);
  return official && evaluation;
}

export function parsePcacText(
  text: string,
  meta: {
    sourceUrl: string;
    substance?: string;
    date?: string | null;
    meeting?: string;
    mediaId?: string;
  },
): PcacCard {
  const body = stripNominatorPacks(text.replace(/\f/g, "\n"));
  const mediaId = meta.mediaId || mediaIdFromUrl(meta.sourceUrl) || "unknown";
  const substance =
    (meta.substance && meta.substance.trim()) ||
    (body.match(/FDA Evaluation of\s+([A-Za-z0-9][A-Za-z0-9./-]*)\s*[–-]\s*Related/i) || [])[1] ||
    (body.match(/FDA Evaluation of\s+([A-Za-z0-9][A-Za-z0-9./-]*)-Related/i) || [])[1] ||
    mediaId;
  const date =
    meta.date ??
    isoDate((body.match(/DATE:\s*([^\n]+)/i) || [])[1]);
  return {
    id: cardId(substance, mediaId),
    substance,
    date,
    meeting: meta.meeting || MEETING_LABEL,
    mediaId,
    sourceUrl: officialFdaMediaUrl(meta.sourceUrl) || meta.sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): PcacSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      meeting: MEETING_URL,
      frNotice: FR_NOTICE_URL,
      docket: DOCKET,
      mediaBase: MEDIA_BASE,
    },
    cards: [],
  };
}

function cardDateKey(card: Pick<PcacCard, "date" | "mediaId">): string {
  return `${card.date ?? ""}${card.mediaId}`;
}

export function assembleSnapshot(cards: PcacCard[], fetchedAt = new Date().toISOString()): PcacSnapshot {
  const withBody = cards
    .filter((c) => isRealPcacBody(c.body))
    .sort((a, b) => cardDateKey(b).localeCompare(cardDateKey(a)));
  const asOf =
    withBody
      .map((c) => c.date)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? "2026-07-24";
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason:
      withBody.length > 0
        ? null
        : "Official FDA PCAC per-substance memos had no extractable evaluation text.",
    fetchedAt,
    asOf: withBody.length > 0 ? asOf : null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      meeting: MEETING_URL,
      frNotice: FR_NOTICE_URL,
      docket: DOCKET,
      mediaBase: MEDIA_BASE,
    },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): PcacSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as PcacSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): PcacSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("PCAC_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: PcacSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedPcacBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealPcacBody(c.body)));
}

function listingDir(): string {
  return env("PCAC_HTML_DIR") || env("PCAC_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("PCAC_LIMIT", "24");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 24;
}

function maxFetchLimit(): number {
  const raw = env("PCAC_MAX_FETCH", "36");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 36;
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

export async function waybackIdUrl(officialUrl: string): Promise<string | null> {
  const cdx = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(officialUrl)}&output=json&fl=timestamp,original,statuscode&filter=statuscode:200&limit=1&reverse=true`;
  try {
    const res = await fetch(cdx, { headers: { "User-Agent": HTTP_UA, Accept: "application/json" } });
    if (!res.ok) return null;
    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows) || rows.length < 2) return null;
    const [ts, original] = rows[1] as [string, string];
    if (!ts || !original) return null;
    return `https://web.archive.org/web/${ts}id_/${original}`;
  } catch {
    return null;
  }
}

export async function fetchOfficialPdfBytes(officialUrl: string): Promise<Uint8Array> {
  try {
    return await fetchFdaBytes(officialUrl);
  } catch {
    const archived = await waybackIdUrl(officialUrl);
    if (!archived) throw new Error(`${officialUrl} FDA fetch failed and no Wayback id_ capture`);
    return await fetchFdaBytes(archived);
  }
}

export function pdfToText(pdfPath: string): string {
  const helper = env("PCAC_PDFTOTEXT") || "pdftotext";
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

async function fetchOfficialHtml(url: string): Promise<string> {
  try {
    return await fetchFdaText(url);
  } catch {
    if (url === MEETING_URL) return await fetchFdaText(MEETING_WAYBACK_URL);
    const archived = await waybackIdUrl(url);
    if (!archived) throw new Error(`${url} FDA fetch failed and no Wayback id_ capture`);
    return await fetchFdaText(archived);
  }
}

const FIXTURE_LISTING_FILES = [
  "listing-excerpt.html",
  "listing-oct-2024-excerpt.html",
  "listing-dec-2024-excerpt.html",
  "listing.html",
  "meeting.html",
];

async function loadOfficialListings(dir: string): Promise<PcacListing[]> {
  if (dir) {
    const listed: PcacListing[] = [];
    for (const name of FIXTURE_LISTING_FILES) {
      const raw = readNamedFile(dir, [name]);
      if (raw) listed.push(...parseListingHtml(raw, meetingLabelFromHtml(raw)));
    }
    return mergeOfficialListings(listed);
  }
  const meetingUrls = new Set<string>(MEETING_URLS);
  for (const yearUrl of YEAR_MATERIALS_URLS) {
    try {
      for (const url of parseYearMaterialsHtml(await fetchOfficialHtml(yearUrl))) {
        meetingUrls.add(url);
      }
    } catch {
      /* one official year table missed; keep the others */
    }
  }
  const listed: PcacListing[] = [];
  for (const url of meetingUrls) {
    try {
      const html = await fetchOfficialHtml(url);
      listed.push(...parseListingHtml(html, meetingLabelFromHtml(html, meetingLabelFromUrl(url))));
    } catch {
      /* one official meeting page missed; keep the others */
    }
  }
  return mergeOfficialListings(listed);
}

function priorBodies(): Map<string, PcacCard> {
  const prior = new Map<string, PcacCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealPcacBody(card.body)) prior.set(card.mediaId, card);
  }
  return prior;
}

export async function collectPcac(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<PcacSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const allListed = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = pcacDir();
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
        reason: "Official PCAC meeting page missed; kept cached FDA-authored memo bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official PCAC meeting page had no per-substance FDA memo links.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: PcacCard[] = [];
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
            writeFileSync(pdfFile, await fetchOfficialPdfBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parsePcacText(text, {
        sourceUrl: row.sourceUrl,
        substance: row.substance,
        date: row.date,
        meeting: row.meeting,
        mediaId: row.mediaId,
      });
      if (!isRealPcacBody(parsed.body)) {
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

export async function loadPcac(): Promise<PcacSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealPcacBody(c.body))) {
    return cached;
  }
  try {
    return await collectPcac();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealPcacBody(c.body)) ? "stale" : "empty",
        reason: `Live PCAC fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `FDA PCAC 503A memos are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildPcacManifest(snap: PcacSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealPcacBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote("/pcac", 'Full catalog: count + substance + date + meeting + mediaId + official URL. Not the FR notice or docket 0001'),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: PCAC_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      substance: c.substance,
      date: c.date,
      meeting: c.meeting,
      mediaId: c.mediaId,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["substance", "date", "meeting", "mediaId", "sourceUrl"] },
    sources: snap?.sources ?? {
      meeting: MEETING_URL,
      frNotice: FR_NOTICE_URL,
      docket: DOCKET,
      mediaBase: MEDIA_BASE,
    },
  };
}

export async function loadPcacManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildPcacManifest(cached);
  return buildPcacManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectPcac()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealPcacBody(c.body)).length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              substance: c.substance,
              mediaId: c.mediaId,
              date: c.date,
              meeting: c.meeting,
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
