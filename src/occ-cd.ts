/**
 * OCC institution Cease-and-Desist / Consent Order TEXT door.
 * Official per-order PDFs from occ.gov/static/enforcement-actions only. Does not invent order text.
 * ExportToJSON is 6051-row metadata (listing only). Not IAP / people / prohibition / CMP-against-person.
 * Not CFPB /cfpb-orders. Not FTC /ftc-wl. Not SEC EDGAR complete-submission .txt.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const OCC_CD_PATH = "/occ-cd";
export const OCC_CD_MANIFEST_PATH = "/occ-cd/manifest.json";
export const OCC_CD_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "occ-institution-cd-bodies";
export const PRODUCT_NAME = "OCC institution C&D / consent-order text";

export const LISTING_URL = "https://apps.occ.gov/EASearch";
export const EXPORT_URL = "https://apps.occ.gov/EASearch/Search/ExportToJSON";
export const PDF_HOST = "www.occ.gov";
export const PDF_BASE = "https://www.occ.gov/static/enforcement-actions/";
export const DOCKET_RE = /\bAA-[A-Z]{2,4}-\s?\d{4}-\d+\b/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "OCC";

export const CARD_FIELDS = [
  "id",
  "docket",
  "pdfId",
  "bank",
  "location",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type OccExportRow = {
  Institution?: string;
  CharterNumber?: string;
  Company?: string;
  Individual?: string;
  Location?: string;
  TypeCode?: string;
  TypeDescription?: string;
  StartDate?: string;
  StartDocuments?: string[];
  TerminationDate?: string;
  TerminationDocuments?: string[];
  DocketNumber?: string;
  SubjectMatters?: unknown;
};

export type OccCdListing = {
  id: string;
  docket: string;
  bank: string;
  location: string | null;
  date: string | null;
  sourceUrl: string;
};

export type OccCdCard = {
  id: string;
  docket: string;
  pdfId: string;
  bank: string;
  location: string | null;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type OccCdSnapshot = {
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
    export: string;
    pdfHost: string;
  };
  cards: OccCdCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (OCC public enforcement actions; +https://www.occ.gov/)";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function occCdDir(): string {
  if (env("OCC_CD_DIR")) return resolve(env("OCC_CD_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/occ-cd"));
}

export function snapshotPath(): string {
  return join(occCdDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/occ-cd/seed-snapshot.json"),
    join(here, "fixtures/occ-cd/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(DOCKET_RE);
  if (!m) return null;
  return m[0].replace(/\s+/g, "").toUpperCase();
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

export function officialOccPdfUrl(urlOrDocket: string): string | null {
  if (!urlOrDocket) return null;
  const docketOnly = normalizeDocket(urlOrDocket);
  if (docketOnly && !/[./]/.test(urlOrDocket.trim())) {
    return `${PDF_BASE}ea${docketOnly}.pdf`;
  }
  try {
    const parsed = new URL(urlOrDocket, "https://www.occ.gov");
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") return null;
    if (host !== "www.occ.gov" && host !== "occ.gov") return null;
    const m = parsed.pathname.match(/\/static\/enforcement-actions\/ea(AA-[A-Z]{2,4}-\d{4}-\d+)\.pdf$/i);
    if (!m) return null;
    const docket = normalizeDocket(m[1]);
    return docket ? `${PDF_BASE}ea${docket}.pdf` : null;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string): string | null {
  const official = officialOccPdfUrl(url);
  if (!official) return null;
  const m = official.match(/\/ea(AA-[A-Z]{2,4}-\d{4}-\d+)\.pdf$/i);
  return m ? m[1].toUpperCase() : null;
}

export function isPeopleRow(row: OccExportRow): boolean {
  return Boolean((row.Individual ?? "").trim());
}

export function isTerminatedRow(row: OccExportRow): boolean {
  const term = (row.TerminationDate ?? "").trim();
  if (!term || term.toUpperCase() === "N/A") return false;
  return Boolean(isoDate(term) || /\d/.test(term));
}

export function isInstitutionCdRow(row: OccExportRow): boolean {
  if (isPeopleRow(row)) return false;
  const code = (row.TypeCode ?? "").toUpperCase();
  if (code !== "C&D") return false;
  const bank = ((row.Institution ?? row.Company) ?? "").trim();
  return bank.length > 0;
}

export function docketFromRow(row: OccExportRow): string | null {
  const fromField = normalizeDocket(row.DocketNumber);
  if (fromField) return fromField;
  for (const doc of row.StartDocuments ?? []) {
    const docket = normalizeDocket(doc);
    if (docket) return docket;
  }
  return null;
}

export function parseExportRows(rows: OccExportRow[]): OccCdListing[] {
  const found: OccCdListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionCdRow(row)) continue;
    if (isTerminatedRow(row)) continue;
    const docket = docketFromRow(row);
    if (!docket) continue;
    const sourceUrl = officialOccPdfUrl(docket);
    if (!sourceUrl) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: docket,
      docket,
      bank: ((row.Institution ?? row.Company) ?? "").trim(),
      location: (row.Location ?? "").trim() || null,
      date: isoDate(row.StartDate),
      sourceUrl,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function listedCountFromExport(rows: OccExportRow[]): number {
  return parseExportRows(rows).length;
}

export function isExportMetadataDump(text: string): boolean {
  const t = text.trim();
  if (/complaint_what_happened/i.test(t)) return true;
  if (/<SUBMISSION>|<TYPE>10-K|complete-submission\.txt/i.test(t)) return true;
  if (/"TypeCode"\s*:\s*"C&D"/.test(t) && /"StartDocuments"/.test(t) && /"Institution"/.test(t)) {
    return true;
  }
  return false;
}

export function isRealOccCdBody(text: string): boolean {
  if (isExportMetadataDump(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 2000) return false;
  if (/CONSUMER FINANCIAL PROTECTION BUREAU/i.test(text) && /File No\.\s*\d{4}-CFPB-\d+/i.test(text)) {
    return false;
  }
  if (/Bureau of Consumer Protection/i.test(text) && /Made in the USA Labeling Rule|MUSA Labeling Rule/i.test(text)) {
    return false;
  }
  if (/ORDER TERMINATING THE (CONSENT|CEASE)/i.test(text)) return false;
  if (/\bORDER OF PROHIBITION\b/i.test(text) && /institution-affiliated party/i.test(text) && !/\bCONSENT ORDER\b/i.test(text)) {
    return false;
  }
  const occ = /OFFICE OF THE COMPTROLLER OF THE CURRENCY|Comptroller of the Currency/i.test(text);
  const order = /\bCONSENT ORDER\b/i.test(text) || /\bCEASE AND DESIST\b/i.test(text) || /\bCEASE-AND-DESIST\b/i.test(text);
  const docket = DOCKET_RE.test(text) || /\bARTICLE I\b/i.test(text);
  const findings =
    /\bARTICLE I\b/i.test(text) ||
    /\bIT IS ORDERED\b/i.test(text) ||
    /\bComptroller['’]s Findings\b/i.test(text) ||
    /\bWHEREAS, the (Office of the Comptroller|OCC)/i.test(text);
  return occ && order && docket && findings;
}

export function parseOrderTitle(body: string): string {
  if (/ORDER TERMINATING/i.test(body)) return "Order Terminating";
  if (/\bCONSENT ORDER\b/i.test(body)) return "Consent Order";
  if (/\bCEASE AND DESIST\b/i.test(body) || /\bCEASE-AND-DESIST\b/i.test(body)) return "Cease and Desist Order";
  return "Consent Order";
}

export function parseDocketFromBody(body: string): string | null {
  return normalizeDocket(body.slice(0, 2500));
}

export function parseOccCdText(
  text: string,
  meta: {
    sourceUrl: string;
    bank?: string;
    location?: string | null;
    date?: string | null;
    docket?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): OccCdCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialOccPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || parseDocketFromBody(body) || pdfIdFromUrl(sourceUrl) || "unknown";
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || docket;
  return {
    id: meta.id || docket,
    docket,
    pdfId,
    bank: (meta.bank && meta.bank.trim()) || docket,
    location: meta.location ?? null,
    date: meta.date ?? isoDate(body.slice(0, 1200)),
    title: meta.title || parseOrderTitle(body),
    sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): OccCdSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, export: EXPORT_URL, pdfHost: `https://${PDF_HOST}/` },
    cards: [],
  };
}

function cardDateKey(card: Pick<OccCdCard, "date" | "docket">): string {
  return `${card.date ?? ""}${card.docket}`;
}

export function assembleSnapshot(cards: OccCdCard[], fetchedAt = new Date().toISOString()): OccCdSnapshot {
  const withBody = cards
    .filter((c) => isRealOccCdBody(c.body))
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
    reason: withBody.length > 0 ? null : "Official OCC institution C&D PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, export: EXPORT_URL, pdfHost: `https://${PDF_HOST}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): OccCdSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as OccCdSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): OccCdSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("OCC_CD_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: OccCdSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedOccCdBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealOccCdBody(c.body)));
}

function listingDir(): string {
  return env("OCC_CD_JSON_DIR") || env("OCC_CD_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("OCC_CD_LIMIT", "5");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const raw = env("OCC_CD_MAX_FETCH", "8");
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

export async function fetchOccJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.json();
}

export async function fetchOccBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function pdfToText(pdfPath: string): string {
  const helper = env("OCC_CD_PDFTOTEXT") || "pdftotext";
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

async function loadOfficialListings(dir: string): Promise<{ listed: OccCdListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing-excerpt.json", "listing.json", "export.json"]);
    const rows = raw ? (JSON.parse(raw) as OccExportRow[]) : [];
    const listed = Array.isArray(rows) ? parseExportRows(rows) : [];
    return { listed, listedCount: listed.length };
  }
  const rows = (await fetchOccJson(EXPORT_URL)) as OccExportRow[];
  const listed = Array.isArray(rows) ? parseExportRows(rows) : [];
  return { listed, listedCount: listed.length };
}

function priorBodies(): Map<string, OccCdCard> {
  const prior = new Map<string, OccCdCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealOccCdBody(card.body)) prior.set(card.id, card);
  }
  return prior;
}

export async function collectOccCd(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<OccCdSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = occCdDir();
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
        reason: "Official OCC ExportToJSON listing missed; kept cached institution C&D bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official OCC ExportToJSON had no institution C&D rows.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: OccCdCard[] = [];
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
      const localText = readNamedFile(dir, [`${row.docket}.txt`, `${row.docket}-excerpt.txt`, `${row.id}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `ea${row.docket}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchOccBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseOccCdText(text, {
        sourceUrl: row.sourceUrl,
        bank: row.bank,
        location: row.location,
        date: row.date,
        docket: row.docket,
        pdfId: row.docket,
        id: row.id,
      });
      if (!isRealOccCdBody(parsed.body)) {
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

export async function loadOccCd(): Promise<OccCdSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealOccCdBody(c.body))) {
    return cached;
  }
  try {
    return await collectOccCd();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealOccCdBody(c.body)) ? "stale" : "empty",
        reason: `Live OCC institution C&D fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `OCC institution C&D PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildOccCdManifest(snap: OccCdSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealOccCdBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + bank + docket + date + official PDF URL only. Order body is the paid GET /occ-cd payload. Not ExportToJSON metadata. Not IAP / people / prohibition / CMP-against-person. Not CFPB /cfpb-orders. Not FTC /ftc-wl. Not SEC EDGAR complete-submission .txt.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: OCC_CD_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      bank: c.bank,
      docket: c.docket,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "bank", "docket", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, export: EXPORT_URL, pdfHost: `https://${PDF_HOST}/` },
  };
}

export async function loadOccCdManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildOccCdManifest(cached);
  return buildOccCdManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectOccCd()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealOccCdBody(c.body)).length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              docket: c.docket,
              pdfId: c.pdfId,
              bank: c.bank,
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
