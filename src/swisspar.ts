/**
 * Swissmedic first-authorisation SwissPAR evaluation TEXT door.
 * Official per-product PDFs on the SwissPAR index only.
 * Does not invent evaluation text. Does not wrap the A–Z HTML index.
 * Not EMA EPARs/referrals. Not FDA CDER reviews. Not the HCP/FI appendix.
 * First authorisation only in v1. Skips extension SwissPARs and EMA-reliance stubs.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SWISSPAR_PATH = "/swisspar";
export const SWISSPAR_MANIFEST_PATH = "/swisspar/manifest.json";
export const SWISSPAR_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "swisspar-first-auth";
export const PRODUCT_NAME = "Swissmedic first-authorisation SwissPAR evaluation text";

export const INDEX_URL =
  "https://www.swissmedic.ch/swissmedic/en/home/humanarzneimittel/authorisations/swisspar.html";
export const PDF_HOST = "https://www.swissmedic.ch/dam/swissmedic/";
export const FAQ_URL =
  "https://www.swissmedic.ch/swissmedic/en/home/humanarzneimittel/authorisations/swisspar.html";
export const LICENSE = "CopA Art. 5 para. 1 let. c";
export const ATTRIBUTION = "Swissmedic";
export const MA_RE = /\/(\d{5})-[a-z0-9]/i;

export const CARD_FIELDS = [
  "id",
  "name",
  "inn",
  "ma",
  "date",
  "holder",
  "sourceUrl",
  "body",
] as const;

export type SwissparListing = {
  id: string;
  name: string;
  ma: string;
  date: string | null;
  sourceUrl: string;
  kind: "first-authorisation" | "extension" | "other";
};

export type SwissparCard = {
  id: string;
  name: string;
  inn: string | null;
  ma: string;
  date: string | null;
  holder: string | null;
  sourceUrl: string;
  body: string;
};

export type SwissparSnapshot = {
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
    index: string;
    pdfHost: string;
    faq: string;
  };
  cards: SwissparCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (Swissmedic SwissPAR public reports; +https://www.swissmedic.ch/)";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function swissparDir(): string {
  if (env("SWISSPAR_DIR")) return resolve(env("SWISSPAR_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/swisspar"));
}

export function snapshotPath(): string {
  return join(swissparDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/swisspar/seed-snapshot.json"),
    join(here, "fixtures/swisspar/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function maFromUrl(url: string): string | null {
  const m = url.match(MA_RE);
  return m ? m[1] : null;
}

export function officialPdfUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://www.swissmedic.ch");
    const host = parsed.hostname.toLowerCase();
    if (host !== "www.swissmedic.ch" && host !== "swissmedic.ch") return null;
    if (!/\/dam\/swissmedic\//i.test(parsed.pathname)) return null;
    if (!/\.pdf/i.test(`${parsed.pathname}${parsed.search}`)) return null;
    return parsed.href;
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

export function cardId(name: string, ma: string): string {
  const slug = slugName(name);
  return slug ? `${slug}-${ma}` : ma;
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

function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ch = raw.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  if (ch) return `${ch[3]}-${ch[2].padStart(2, "0")}-${ch[1].padStart(2, "0")}`;
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

function listingKind(info: string): SwissparListing["kind"] {
  const blob = info.replace(/\s+/g, " ").trim();
  if (/extension of therapeutic indication/i.test(blob)) return "extension";
  if (/first authorisation/i.test(blob)) return "first-authorisation";
  return "other";
}

export function parseListingHtml(html: string): SwissparListing[] {
  const found: SwissparListing[] = [];
  const seen = new Set<string>();
  const blockRe =
    /<a\s+href="([^"]+)"[^>]*title="([^"]*)"[^>]*>[\s\S]*?<\/a>\s*<span class=['"]downloadinfo['"]>([\s\S]*?)<\/span>/gi;
  for (const m of html.matchAll(blockRe)) {
    const href = decodeHtml(m[1]);
    const sourceUrl = officialPdfUrl(
      href.startsWith("http") ? href : `https://www.swissmedic.ch${href}`,
    );
    if (!sourceUrl) continue;
    const ma = maFromUrl(sourceUrl);
    if (!ma || seen.has(ma)) continue;
    const kind = listingKind(decodeHtml(m[3]));
    if (kind !== "first-authorisation") continue;
    seen.add(ma);
    const title = decodeHtml(m[2]).replace(/^SwissPAR\s*[–-]\s*/i, "").trim();
    const dimmed = (m[0].match(/text-dimmed[^>]*>([\s\S]*?)<\/span>/i) || [])[1] ?? "";
    const name = title || ma;
    found.push({
      id: cardId(name, ma),
      name,
      ma,
      date: isoDate(decodeHtml(dimmed)) ?? isoDate(decodeHtml(m[0])),
      sourceUrl,
      kind,
    });
  }
  return found;
}

export function isEmaRelianceStub(text: string): boolean {
  // Full EMA-reliance stub: Swissmedic did not assess the primary clinical / study data
  // (e.g. mNEXSPIKE). Quality- or nonclinical-only Article 13 wording is not enough.
  if (/has not assessed the primary data\s*\([^)]*study reports/i.test(text)) return true;
  return /has not assessed the primary data relating to clinical/i.test(text);
}

export function stripFiAppendix(text: string): string {
  const raw = text.replace(/\r/g, "");
  // Cut at the FI appendix notice, not the table-of-contents "8 Appendix …… 16" line.
  const approved = raw.search(/\nApproved Information for healthcare professionals\b/i);
  if (approved < 0) return raw.trim();
  const before = raw.slice(0, approved);
  const heading = before.match(/\n8\s+Appendix\s*$/i);
  if (heading && heading.index != null) return before.slice(0, heading.index).trim();
  return before.trim();
}

export function isRealSwissparBody(text: string): boolean {
  if (isEmaRelianceStub(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 400) return false;
  if (/search by name of the medicinal product/i.test(text)) return false;
  if (/sorted by name of the medicinal product/i.test(text) && /first authorisation/i.test(text) && compact.length < 2000) {
    return false;
  }
  if (/european public assessment report/i.test(text) && !/swiss public assessment report/i.test(text)) {
    return false;
  }
  if (/\bCDER\b/i.test(text) && /center for drug evaluation and research/i.test(text)) return false;
  if (/this document lists observations made by the FDA|inspectional observations/i.test(text)) {
    return false;
  }
  if (/^\s*WARNING LETTER\b/m.test(text)) return false;
  const official = /swiss public assessment report/i.test(text) && /swissmedic/i.test(text);
  const evaluation =
    /benefit[/\-\s]?risk/i.test(text) ||
    /final clinical benefit/i.test(text) ||
    /clinical aspects/i.test(text);
  return official && evaluation;
}

function fieldAfter(label: RegExp, text: string): string | null {
  const m = text.match(label);
  if (!m) return null;
  const value = m[1].replace(/\s+/g, " ").trim();
  return value || null;
}

export function parseSwissparText(
  text: string,
  meta: {
    sourceUrl: string;
    name?: string;
    date?: string | null;
    ma?: string;
  },
): SwissparCard {
  const body = stripFiAppendix(text.replace(/\f/g, "\n"));
  const ma = meta.ma || maFromUrl(meta.sourceUrl) || fieldAfter(/Marketing authorisation no\.:\s*(\d{5})/i, body) || "unknown";
  const name =
    (meta.name && meta.name.trim()) ||
    (body.match(/Swiss Public Assessment Report\s+([A-Za-z0-9][^\n]{1,80}?)\s+International non-proprietary name/i) || [])[1]?.trim() ||
    ma;
  const inn = fieldAfter(/International non-proprietary name:\s*([^\n]+)/i, body);
  const holder = fieldAfter(/Marketing authorisation holder:\s*([^\n]+)/i, body);
  const date =
    meta.date ??
    isoDate((body.match(/^Date:\s*([^\n]+)/m) || [])[1]) ??
    isoDate((body.match(/approved on\s+([0-9A-Za-z.\s]+)/i) || [])[1]);
  return {
    id: cardId(name, ma),
    name,
    inn,
    ma,
    date,
    holder,
    sourceUrl: meta.sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): SwissparSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: INDEX_URL, pdfHost: PDF_HOST, faq: FAQ_URL },
    cards: [],
  };
}

function cardDateKey(card: Pick<SwissparCard, "date">): string {
  return card.date ?? "";
}

export function assembleSnapshot(cards: SwissparCard[], fetchedAt = new Date().toISOString()): SwissparSnapshot {
  const withBody = cards
    .filter((c) => isRealSwissparBody(c.body))
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
        : "Official SwissPAR first-authorisation PDFs had no extractable evaluation text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: INDEX_URL, pdfHost: PDF_HOST, faq: FAQ_URL },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): SwissparSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as SwissparSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): SwissparSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("SWISSPAR_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: SwissparSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedSwissparBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealSwissparBody(c.body)));
}

function listingDir(): string {
  return env("SWISSPAR_HTML_DIR") || env("SWISSPAR_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("SWISSPAR_LIMIT", "5");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const raw = env("SWISSPAR_MAX_FETCH", "8");
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

export async function fetchSwissmedicText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchSwissmedicBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function pdfToText(pdfPath: string): string {
  const helper = env("SWISSPAR_PDFTOTEXT") || "pdftotext";
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

async function loadOfficialListings(dir: string): Promise<SwissparListing[]> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing-excerpt.html", "index.html", "swisspar.html"]);
    if (raw) return parseListingHtml(raw);
    return [];
  }
  return parseListingHtml(await fetchSwissmedicText(INDEX_URL));
}

function priorBodies(): Map<string, SwissparCard> {
  const prior = new Map<string, SwissparCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealSwissparBody(card.body)) prior.set(card.ma, card);
  }
  return prior;
}

export async function collectSwisspar(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<SwissparSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const allListed = (await loadOfficialListings(dir)).sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? ""),
  );
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = swissparDir();
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
        reason: "Official SwissPAR index missed; kept cached first-authorisation evaluation bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official SwissPAR A–Z index had no first-authorisation PDF links.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: SwissparCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = prior.get(row.ma);
    if (cached) {
      cards.push(cached);
      seen.add(row.ma);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    if (!dir) await pause(pauseMs);
    try {
      const localText = readNamedFile(dir, [`${row.ma}.txt`, `${row.ma}-excerpt.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${row.ma}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchSwissmedicBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseSwissparText(text, {
        sourceUrl: row.sourceUrl,
        name: row.name,
        date: row.date,
        ma: row.ma,
      });
      if (!isRealSwissparBody(parsed.body)) {
        skippedNoText += 1;
        continue;
      }
      cards.push(parsed);
      seen.add(row.ma);
      addedThisRun += 1;
    } catch {
      skippedNoText += 1;
    }
  }
  for (const [ma, card] of prior) {
    if (!seen.has(ma)) cards.push(card);
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

export async function loadSwisspar(): Promise<SwissparSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealSwissparBody(c.body))) {
    return cached;
  }
  try {
    return await collectSwisspar();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealSwissparBody(c.body)) ? "stale" : "empty",
        reason: `Live SwissPAR fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `SwissPAR first-authorisation PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildSwissparManifest(snap: SwissparSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealSwissparBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + name + date + MA + official source only. Evaluation / benefit-risk / study-result text is the paid GET /swisspar payload. This free manifest lists the full catalog. GET ?id= is one official text for $0.02. Default GET is the newest 10 official texts for $0.05. If the catalog has fewer than 10, that $0.05 GET is the whole current set. Older pages are another $0.05 on the same URL (page/before).",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: SWISSPAR_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      name: c.name,
      date: c.date,
      ma: c.ma,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["name", "date", "ma", "sourceUrl"] },
    sources: snap?.sources ?? { index: INDEX_URL, pdfHost: PDF_HOST, faq: FAQ_URL },
  };
}

export async function loadSwissparManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildSwissparManifest(cached);
  return buildSwissparManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectSwisspar()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealSwissparBody(c.body)).length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              name: c.name,
              inn: c.inn,
              ma: c.ma,
              date: c.date,
              holder: c.holder,
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
