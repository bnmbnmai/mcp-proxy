/**
 * USDA APHIS Animal Welfare Act inspection-report observation TEXT door.
 * Official Salesforce metadata + per-report PDFs only.
 * Does not invent observation text. Does not wrap the Salesforce index.
 * Does not use Data Liberation GitHub as the source.
 * Not CMS 2567. Not CQC. Not /form-483. Not /warning-letters.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const AWA_PATH = "/awa";
export const AWA_MANIFEST_PATH = "/awa/manifest.json";
export const AWA_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "aphis-awa-inspection-observation-text";
export const PRODUCT_NAME = "USDA APHIS AWA inspection-report observation text";

export const INDEX_URL = "https://aphis.my.site.com/PublicSearchTool/s/inspection-reports";
export const AURA_URL = "https://aphis.my.site.com/PublicSearchTool/s/sfsites/aura";
export const PDF_HOST = "https://aphis.file.force.com/sfc/dist/version/download/";
export const HUB_URL = "https://www.aphis.usda.gov/awa/public-search";
export const LICENSE = "17 USC 105";
export const CONTENT_ID_RE = /[?&]ids=([0-9a-zA-Z]+)/;
export const INSPECTION_ID_RE = /INS-0*(\d+)/i;
export const CITE_RE = /^(\d+\.\d+(?:\([a-z0-9]+\))*)\s*(Critical|Direct)?\s*$/im;

export const CARD_FIELDS = [
  "id",
  "contentId",
  "firm",
  "date",
  "certificate",
  "customerNumber",
  "inspectionId",
  "inspectionType",
  "sourceUrl",
  "body",
  "observations",
] as const;

export type AwaListing = {
  id: string;
  contentId: string;
  firm: string;
  date: string | null;
  certificate: string;
  customerNumber: string;
  sourceUrl: string;
};

export type AwaObservation = {
  cite: string;
  severity: string | null;
  title: string;
  text: string;
};

export type AwaCard = {
  id: string;
  contentId: string;
  firm: string;
  date: string | null;
  certificate: string;
  customerNumber: string;
  inspectionId: string | null;
  inspectionType: string | null;
  sourceUrl: string;
  body: string;
  observations: AwaObservation[];
};

export type AwaSnapshot = {
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
    index: string;
    aura: string;
    pdfHost: string;
    hub: string;
  };
  cards: AwaCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (APHIS AWA public inspection PDFs; +https://www.aphis.usda.gov/awa/public-search)";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function awaDir(): string {
  if (env("AWA_DIR")) return resolve(env("AWA_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/awa"));
}

export function snapshotPath(): string {
  return join(awaDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/aphis-awa/seed-snapshot.json"),
    join(here, "fixtures/aphis-awa/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function contentIdFromUrl(url: string): string | null {
  const m = url.match(CONTENT_ID_RE);
  return m ? m[1] : null;
}

export function officialPdfUrl(url: string): string | null {
  if (!url) return null;
  if (!/^https:\/\/aphis\.(file\.force\.com|my\.site\.com|--c\.na21\.content\.force\.com)\//i.test(url)) {
    if (!/aphis\.file\.force\.com\/sfc\/dist\/version\/download/i.test(url)) return null;
  }
  const id = contentIdFromUrl(url);
  if (!id) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.get("oid") || !parsed.searchParams.get("ids")) return null;
    return url;
  } catch {
    return null;
  }
}

export function slugFirm(firm: string): string {
  return firm
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cardId(firm: string, contentId: string): string {
  const slug = slugFirm(firm);
  return slug ? `${slug}-${contentId}` : contentId;
}

function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const named = raw.match(
    /\b(\d{1,2})-(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-(\d{4})\b/i,
  );
  if (named) {
    const months: Record<string, string> = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const mm = months[named[2].slice(0, 3).toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[1].padStart(2, "0")}` : null;
  }
  return null;
}

export function parseListingJson(raw: unknown): AwaListing[] {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(root.results)
      ? root.results
      : Array.isArray(root.cards)
        ? root.cards
        : [];
  const found: AwaListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const sourceUrl = officialPdfUrl(String(rec.reportLink ?? rec.sourceUrl ?? ""));
    if (!sourceUrl) continue;
    const contentId = contentIdFromUrl(sourceUrl);
    if (!contentId || seen.has(contentId)) continue;
    seen.add(contentId);
    const firm = String(rec.legalName ?? rec.firm ?? rec.siteName ?? contentId).trim();
    found.push({
      id: cardId(firm, contentId),
      contentId,
      firm,
      date: isoDate(String(rec.inspectionDate ?? rec.date ?? "")) ,
      certificate: String(rec.certNumber ?? rec.certificate ?? ""),
      customerNumber: String(rec.customerNumber ?? ""),
      sourceUrl,
    });
  }
  return found;
}

export function isRealAwaBody(text: string): boolean {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 200) return false;
  if (/this document lists observations made by the FDA|inspectional observations/i.test(text)) return false;
  if (/\bCMS[- ]?2567\b|statement of deficiencies/i.test(text)) return false;
  if (/\bCQC\b|care quality commission/i.test(text)) return false;
  if (/data[- ]liberation/i.test(text)) return false;
  if (/^\s*WARNING LETTER\b/m.test(text) && !/animal and plant health/i.test(text)) return false;
  const official =
    /animal and plant health inspection service/i.test(text) && /inspection report/i.test(text);
  const narrative =
    /no non-compliant items/i.test(text) ||
    /\b\d+\.\d+(?:\([a-z0-9]+\))*\b/.test(text) ||
    /this inspection and exit interview/i.test(text);
  return official && narrative;
}

export function parseObservations(body: string): AwaObservation[] {
  const lines = body.replace(/\r/g, "").split("\n");
  const found: AwaObservation[] = [];
  let current: AwaObservation | null = null;
  const flush = () => {
    if (!current) return;
    current.text = current.text.replace(/\s+/g, " ").trim();
    current.title = current.title.replace(/\s+/g, " ").trim();
    if (current.cite && (current.text.length > 20 || current.title.length > 3)) found.push(current);
    current = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^page \d+ of \d+$/i.test(line) || /^species inspected$/i.test(line)) {
      flush();
      break;
    }
    if (/this inspection and exit interview/i.test(line) || /^prepared by:/i.test(line)) {
      flush();
      continue;
    }
    const cite = line.match(/^(\d+\.\d+(?:\([a-z0-9]+\))*)\s*(Critical|Direct)?\s*$/i);
    if (cite) {
      flush();
      current = { cite: cite[1], severity: cite[2] ?? null, title: "", text: "" };
      continue;
    }
    if (!current) continue;
    if (!current.title && /[A-Za-z]/.test(line) && line.length < 160) {
      current.title = line;
      continue;
    }
    current.text += (current.text ? " " : "") + line;
  }
  flush();
  return found;
}

export function parseAwaText(
  text: string,
  meta: {
    sourceUrl: string;
    firm?: string;
    date?: string | null;
    certificate?: string;
    customerNumber?: string;
  },
): AwaCard {
  const contentId = contentIdFromUrl(meta.sourceUrl) || "unknown";
  const body = text.replace(/\f/g, "\n").trim();
  const firm =
    (meta.firm && meta.firm.trim()) ||
    (body.match(/Inspection Report\s+([A-Za-z][^\n]{2,80}?)\s{2,}Customer ID/i) || [])[1]?.trim() ||
    contentId;
  const inspectionId = (body.match(INSPECTION_ID_RE) || [])[0] ?? null;
  const inspectionType =
    (body.match(/Type:\s*([A-Z][A-Z \-]+INSPECTION)/i) || [])[1]?.replace(/\s+/g, " ").trim() ?? null;
  const date =
    meta.date ??
    isoDate((body.match(/Date:\s*([0-9A-Za-z\-]+)/i) || [])[1]) ??
    isoDate((body.match(/Inspection Date:\s*([0-9A-Za-z\-]+)/i) || [])[1]);
  const certificate =
    meta.certificate ||
    (body.match(/Certificate:\s*([0-9A-Z\-]+)/i) || [])[1] ||
    "";
  const customerNumber =
    meta.customerNumber ||
    (body.match(/Customer ID:\s*(\d+)/i) || [])[1] ||
    "";
  return {
    id: cardId(firm, contentId),
    contentId,
    firm,
    date,
    certificate,
    customerNumber,
    inspectionId,
    inspectionType,
    sourceUrl: meta.sourceUrl,
    body,
    observations: parseObservations(body),
  };
}

export function emptySnapshot(reason: string): AwaSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    sources: { index: INDEX_URL, aura: AURA_URL, pdfHost: PDF_HOST, hub: HUB_URL },
    cards: [],
  };
}

function cardDateKey(card: Pick<AwaCard, "date">): string {
  return card.date ?? "";
}

export function assembleSnapshot(cards: AwaCard[], fetchedAt = new Date().toISOString()): AwaSnapshot {
  const withBody = cards
    .filter((c) => isRealAwaBody(c.body))
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
    reason: withBody.length > 0 ? null : "Official APHIS AWA PDFs had no extractable observation text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    sources: { index: INDEX_URL, aura: AURA_URL, pdfHost: PDF_HOST, hub: HUB_URL },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): AwaSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as AwaSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): AwaSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("AWA_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: AwaSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedAwaBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealAwaBody(c.body)));
}

function listingDir(): string {
  return env("AWA_HTML_DIR") || env("AWA_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("AWA_LIMIT", "5");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const raw = env("AWA_MAX_FETCH", "8");
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

export async function fetchAphisText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchAphisBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function pdfToText(pdfPath: string): string {
  const helper = env("AWA_PDFTOTEXT") || "pdftotext";
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

function fwuidFromHtml(html: string): string | null {
  const enc = html.match(/%22fwuid%22%3A%22([^%]+)%22%2C/);
  if (enc) return enc[1];
  const raw = html.match(/"fwuid":"([^"]+)"/);
  return raw ? raw[1] : null;
}

async function fetchOfficialListingsLive(): Promise<AwaListing[]> {
  const html = await fetchAphisText(INDEX_URL);
  const fwuid = fwuidFromHtml(html);
  if (!fwuid) throw new Error("Official APHIS index had no fwuid.");
  const action = {
    descriptor: "apex://EFL_PSTController/ACTION$doIRSearch_UI",
    params: {
      searchCriteria: { index: 0, numberOfRows: 25 },
      getCount: true,
    },
  };
  const auraContext = {
    mode: "PROD",
    fwuid,
    app: "siteforce:communityApp",
    loaded: {
      "APPLICATION@markup://siteforce:communityApp": "11hSeJMz5y2BtbPLHOZFww",
      "COMPONENT@markup://instrumentation:o11yCoreCollector": "tdPw-EhKVwwEbR_9pvC9og",
    },
    dn: [],
    globals: {},
    uad: false,
  };
  const body = new URLSearchParams({
    message: JSON.stringify({ actions: [action] }),
    "aura.context": JSON.stringify(auraContext),
    "aura.token": "null",
  });
  const res = await fetch(AURA_URL, {
    method: "POST",
    headers: {
      "User-Agent": HTTP_UA,
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Origin: "https://aphis.my.site.com",
      Referer: INDEX_URL,
    },
    body,
  });
  if (!res.ok) throw new Error(`${AURA_URL} HTTP ${res.status}`);
  const json = (await res.json()) as {
    actions?: { returnValue?: { results?: unknown[] } }[];
  };
  return parseListingJson(json.actions?.[0]?.returnValue ?? {});
}

async function loadOfficialListings(dir: string): Promise<AwaListing[]> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (raw) return parseListingJson(JSON.parse(raw));
    return [];
  }
  return await fetchOfficialListingsLive();
}

function priorBodies(): Map<string, AwaCard> {
  const prior = new Map<string, AwaCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealAwaBody(card.body)) prior.set(card.contentId, card);
  }
  return prior;
}

export async function collectAwa(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<AwaSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const allListed = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = awaDir();
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
        reason: "Official Salesforce listing missed; kept cached AWA observation bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official APHIS Salesforce inspection-report index had no per-report PDF links.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: AwaCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = prior.get(row.contentId);
    if (cached) {
      cards.push(cached);
      seen.add(row.contentId);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    if (!dir) await pause(pauseMs);
    try {
      const localText = readNamedFile(dir, [`${row.contentId}.txt`, `${row.contentId}-excerpt.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${row.contentId}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchAphisBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseAwaText(text, {
        sourceUrl: row.sourceUrl,
        firm: row.firm,
        date: row.date,
        certificate: row.certificate,
        customerNumber: row.customerNumber,
      });
      if (!isRealAwaBody(parsed.body)) {
        skippedNoText += 1;
        continue;
      }
      cards.push(parsed);
      seen.add(row.contentId);
      addedThisRun += 1;
    } catch {
      skippedNoText += 1;
    }
  }
  for (const [contentId, card] of prior) {
    if (!seen.has(contentId)) cards.push(card);
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

export async function loadAwa(): Promise<AwaSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealAwaBody(c.body))) {
    return cached;
  }
  try {
    return await collectAwa();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealAwaBody(c.body)) ? "stale" : "empty",
        reason: `Live APHIS AWA fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `APHIS AWA inspection PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildAwaManifest(snap: AwaSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealAwaBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + id + firm + date + official source only. Observation / narrative text is the paid GET /awa payload. Not the Salesforce metadata index. Not /form-483. Not CMS 2567. Not CQC.",
    license: LICENSE,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: AWA_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      firm: c.firm,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "firm", "date", "sourceUrl"] },
    sources: snap?.sources ?? { index: INDEX_URL, aura: AURA_URL, pdfHost: PDF_HOST, hub: HUB_URL },
  };
}

export async function loadAwaManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildAwaManifest(cached);
  return buildAwaManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectAwa()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealAwaBody(c.body)).length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              contentId: c.contentId,
              firm: c.firm,
              date: c.date,
              certificate: c.certificate,
              inspectionId: c.inspectionId,
              observationCount: c.observations.length,
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
