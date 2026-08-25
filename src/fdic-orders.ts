/**
 * FDIC institution consent-order / C&D TEXT door.
 * Official per-order PDFs from orders.fdic.gov only. Does not invent order text.
 * EDOS is a Salesforce index (listing only). Not BankFind. Not monthly NR counts.
 * Not IAP / 1829 / Section 19 people files. Not EDGAR 8-K. Not Federal Register raw_text.
 * Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const FDIC_ORDERS_PATH = "/fdic-orders";
export const FDIC_ORDERS_MANIFEST_PATH = "/fdic-orders/manifest.json";
export const FDIC_ORDERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "fdic-institution-order-bodies";
export const PRODUCT_NAME = "FDIC institution consent-order / C&D text";

export const LISTING_URL = "https://orders.fdic.gov/s/";
export const PDF_HOST = "orders.fdic.gov";
export const PDF_DOWNLOAD = "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/";
export const DOCKET_RE = /\bFDIC-\d{2}-\d{4}[a-z]\b/i;
export const CONTENT_ID_RE = /\b069SJ[0-9A-Za-z]{10,13}\b/;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "FDIC";

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

export type FdicListingRow = {
  bank?: string;
  institution?: string;
  individual?: string;
  location?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type FdicOrderListing = {
  id: string;
  docket: string;
  bank: string;
  location: string | null;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type FdicOrderCard = {
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

export type FdicOrdersSnapshot = {
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
  cards: FdicOrderCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FDIC public enforcement orders; +https://orders.fdic.gov/)";

/** Official first-slice institution consent-order / C&D PDFs on orders.fdic.gov. */
export const SEED_LISTINGS: FdicOrderListing[] = [
  {
    id: "FDIC-26-0001b",
    docket: "FDIC-26-0001b",
    bank: "MutualOne Bank",
    location: "Framingham, Massachusetts",
    date: "2026-01-13",
    title: "Consent Order",
    sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
    pdfId: "069SJ000013gUnXYAU",
  },
  {
    id: "FDIC-25-0127b",
    docket: "FDIC-25-0127b",
    bank: "Community Bank and Trust – West Georgia",
    location: "LaGrange, Georgia",
    date: "2026-01-12",
    title: "Consent Order",
    sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013EZOfYAO?operationContext=S1",
    pdfId: "069SJ000013EZOfYAO",
  },
  {
    id: "FDIC-22-0042b",
    docket: "FDIC-22-0042b",
    bank: "Union County Savings Bank",
    location: "Elizabeth, New Jersey",
    date: "2026-02-17",
    title: "Amended and Restated Consent Order",
    sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000016cJFgYAM?operationContext=S1",
    pdfId: "069SJ000016cJFgYAM",
  },
  {
    id: "FDIC-26-0011b",
    docket: "FDIC-26-0011b",
    bank: "Covington County Bank",
    location: "Collins, Mississippi",
    date: "2026-03-26",
    title: "Consent Order",
    sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000019kAxyYAE?operationContext=S1",
    pdfId: "069SJ000019kAxyYAE",
  },
  {
    id: "FDIC-25-0148b",
    docket: "FDIC-25-0148b",
    bank: "Connect Community Bank",
    location: "Raymond, Washington",
    date: "2026-05-13",
    title: "Consent Order",
    sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ00001GluRdYAJ?operationContext=S1",
    pdfId: "069SJ00001GluRdYAJ",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function fdicOrdersDir(): string {
  if (env("FDIC_ORDERS_DIR")) return resolve(env("FDIC_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/fdic-orders"));
}

export function snapshotPath(): string {
  return join(fdicOrdersDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/fdic-orders/seed-snapshot.json"),
    join(here, "fixtures/fdic-orders/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(DOCKET_RE);
  if (!m) return null;
  const docket = m[0].toUpperCase();
  return `FDIC-${docket.slice(5, 7)}-${docket.slice(8, 12)}${docket.slice(12).toLowerCase()}`;
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

export function contentIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/document\/download\/(069SJ[0-9A-Za-z]{10,13})\b/);
  return m ? m[1] : null;
}

export function officialFdicPdfUrl(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (CONTENT_ID_RE.test(trimmed) && !/[./]/.test(trimmed)) {
    return `${PDF_DOWNLOAD}${trimmed}?operationContext=S1`;
  }
  try {
    const parsed = new URL(trimmed, "https://orders.fdic.gov");
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") return null;
    if (host !== "orders.fdic.gov") return null;
    const id = contentIdFromUrl(parsed.pathname);
    if (!id) return null;
    return `${PDF_DOWNLOAD}${id}?operationContext=S1`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string): string | null {
  return contentIdFromUrl(officialFdicPdfUrl(url) || url);
}

export function isPeopleRow(row: FdicListingRow): boolean {
  return Boolean((row.individual ?? "").trim());
}

function listingKind(row: FdicListingRow): string {
  return `${row.title ?? ""} ${row.type ?? ""}`.replace(/\s+/g, " ").trim();
}

export function isCmpRow(row: FdicListingRow): boolean {
  const kind = listingKind(row);
  const docket = normalizeDocket(row.docket) ?? "";
  if (/civil money penalty|\border to pay\b/i.test(kind) && !/\bconsent order\b/i.test(kind)) return true;
  return /k$/.test(docket);
}

export function isTerminationRow(row: FdicListingRow): boolean {
  return /terminat/i.test(listingKind(row));
}

export function isSection19Row(row: FdicListingRow): boolean {
  return /section\s*19|\b1829\b/i.test(listingKind(row));
}

export function isProhibitionRow(row: FdicListingRow): boolean {
  const kind = listingKind(row);
  const docket = normalizeDocket(row.docket) ?? "";
  if (/prohibition from further participation|\border of prohibition\b/i.test(kind)) return true;
  return /e$/.test(docket);
}

export function isInstitutionOrderRow(row: FdicListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (isCmpRow(row) || isTerminationRow(row) || isSection19Row(row) || isProhibitionRow(row)) return false;
  const bank = ((row.bank ?? row.institution) ?? "").trim();
  if (!bank) return false;
  const docket = normalizeDocket(row.docket);
  if (!docket || !/b$/.test(docket)) return false;
  const kind = listingKind(row);
  if (kind && !/\bconsent order\b|\bcease and desist\b|\bcease-and-desist\b/i.test(kind)) return false;
  return Boolean(officialFdicPdfUrl(row.sourceUrl ?? row.pdfId ?? ""));
}

export function parseListingRows(rows: FdicListingRow[]): FdicOrderListing[] {
  const found: FdicOrderListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const docket = normalizeDocket(row.docket);
    const sourceUrl = officialFdicPdfUrl(row.sourceUrl ?? row.pdfId ?? "");
    const pdfId = pdfIdFromUrl(sourceUrl ?? "") ?? (row.pdfId ?? "").trim();
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: docket,
      docket,
      bank: ((row.bank ?? row.institution) ?? "").trim(),
      location: (row.location ?? "").trim() || null,
      date: isoDate(row.date),
      title: listingKind(row) || "Consent Order",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function isEdosIndexDump(text: string): boolean {
  const t = text.trim();
  if (/"ContentDocumentId"/.test(t) && /"attributes"\s*:\s*\{/.test(t) && /EDOS_/i.test(t)) return true;
  if (/"Docket_Number__c"/.test(t) && /"Order_Type__c"/.test(t)) return true;
  return false;
}

export function isBankFindDump(text: string): boolean {
  return /BankFind/i.test(text) || (/"CERT"/.test(text) && /"STALP"/.test(text) && /"ACTIVE"/.test(text));
}

export function isFederalRegisterDump(text: string): boolean {
  return /"raw_text"/.test(text) || /"full_text"/.test(text) || /federalregister\.gov/i.test(text);
}

export function isEdgarDump(text: string): boolean {
  return /<SUBMISSION>|<TYPE>8-K|complete-submission\.txt|EX-99\.1/i.test(text);
}

export function isMonthlyNrDump(text: string): boolean {
  return /FDIC (Publishes|issued \w+ orders)/i.test(text) && /enforcement actions/i.test(text);
}

export function isRealFdicOrderBody(text: string): boolean {
  if (isEdosIndexDump(text) || isBankFindDump(text) || isFederalRegisterDump(text) || isEdgarDump(text) || isMonthlyNrDump(text)) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 2000) return false;
  if (/CONSUMER FINANCIAL PROTECTION BUREAU/i.test(text) && /File No\.\s*\d{4}-CFPB-\d+/i.test(text)) {
    return false;
  }
  if (/OFFICE OF THE COMPTROLLER OF THE CURRENCY/i.test(text) && /\bAA-[A-Z]{2,4}-\d{4}-\d+\b/.test(text)) {
    return false;
  }
  if (/Bureau of Consumer Protection/i.test(text) && /Made in the USA Labeling Rule|MUSA Labeling Rule/i.test(text)) {
    return false;
  }
  if (/ORDER TERMINATING/i.test(text)) return false;
  if (/\bORDER OF PROHIBITION\b/i.test(text) && /institution-affiliated party/i.test(text) && !/\bCONSENT ORDER\b/i.test(text)) {
    return false;
  }
  if (/Section 19 of the (FDI|Federal Deposit Insurance) Act/i.test(text) && /12 U\.S\.C\.\s*§\s*1829\b/.test(text) && !/1829b/.test(text)) {
    return false;
  }
  if (/ORDER TO PAY\s+CIVIL MONEY PENALTY/i.test(text) && !/\bCONSENT ORDER\b/i.test(text)) {
    return false;
  }
  const fdic = /FEDERAL DEPOSIT INSURANCE CORPORATION/i.test(text);
  const order = /\bCONSENT ORDER\b/i.test(text) || /\bCEASE AND DESIST\b/i.test(text) || /\bCEASE-AND-DESIST\b/i.test(text);
  const docket = DOCKET_RE.test(text);
  const institution = /Insured State Nonmember|INSURED STATE NONMEMBER|STATE CHARTERED[\s\S]{0,40}INSURED NONMEMBER/i.test(text);
  const findings =
    /\bIT IS (HEREBY )?ORDERED\b/i.test(text) ||
    /\bthe FDIC and the .{0,80} (order|hereby order)/i.test(text) ||
    /\bHaving determined that the requirements for issuance of an order/i.test(text) ||
    /\bBOARD REQUIREMENTS\b/i.test(text) ||
    /\bACTION PLAN\b/i.test(text);
  return fdic && order && docket && institution && findings;
}

export function parseOrderTitle(body: string): string {
  if (/ORDER TERMINATING/i.test(body)) return "Order Terminating";
  if (/AMENDED AND RESTATED CONSENT ORDER/i.test(body)) return "Amended and Restated Consent Order";
  if (/\bCONSENT ORDER\b/i.test(body)) return "Consent Order";
  if (/\bCEASE AND DESIST\b/i.test(body) || /\bCEASE-AND-DESIST\b/i.test(body)) return "Cease and Desist Order";
  return "Consent Order";
}

export function parseDocketFromBody(body: string): string | null {
  return normalizeDocket(body.slice(0, 2500));
}

export function parseFdicOrderText(
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
): FdicOrderCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFdicPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || parseDocketFromBody(body) || "unknown";
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || docket;
  return {
    id: meta.id || docket,
    docket,
    pdfId,
    bank: (meta.bank && meta.bank.trim()) || docket,
    location: meta.location ?? null,
    date: meta.date ?? isoDate(body.slice(0, 1600)),
    title: meta.title || parseOrderTitle(body),
    sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): FdicOrdersSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `https://${PDF_HOST}/` },
    cards: [],
  };
}

function cardDateKey(card: Pick<FdicOrderCard, "date" | "docket">): string {
  return `${card.date ?? ""}${card.docket}`;
}

export function assembleSnapshot(cards: FdicOrderCard[], fetchedAt = new Date().toISOString()): FdicOrdersSnapshot {
  const withBody = cards
    .filter((c) => isRealFdicOrderBody(c.body))
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
    reason: withBody.length > 0 ? null : "Official FDIC institution order PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `https://${PDF_HOST}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): FdicOrdersSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FdicOrdersSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): FdicOrdersSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("FDIC_ORDERS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: FdicOrdersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedFdicOrderBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealFdicOrderBody(c.body)));
}

function listingDir(): string {
  return env("FDIC_ORDERS_JSON_DIR") || env("FDIC_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("FDIC_ORDERS_LIMIT", "5");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const raw = env("FDIC_ORDERS_MAX_FETCH", "8");
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

export async function fetchFdicBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  if (head !== "%PDF-") throw new Error(`${url} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FDIC_ORDERS_PDFTOTEXT") || "pdftotext";
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

async function loadOfficialListings(dir: string): Promise<{ listed: FdicOrderListing[]; listedCount: number }> {
  if (dir) {
    const raw = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    const rows = raw ? (JSON.parse(raw) as FdicListingRow[]) : [];
    const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
    return { listed, listedCount: listed.length };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

function priorBodies(): Map<string, FdicOrderCard> {
  const prior = new Map<string, FdicOrderCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealFdicOrderBody(card.body)) prior.set(card.id, card);
  }
  return prior;
}

export async function collectFdicOrders(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FdicOrdersSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = fdicOrdersDir();
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
        reason: "Official FDIC seed listing missed; kept cached institution order bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official FDIC seed listing had no institution consent-order / C&D rows.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: FdicOrderCard[] = [];
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
      const localText = readNamedFile(dir, [`${row.docket}.txt`, `${row.docket}-excerpt.txt`, `${row.id}.txt`, `${row.pdfId}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${row.pdfId}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchFdicBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseFdicOrderText(text, {
        sourceUrl: row.sourceUrl,
        bank: row.bank,
        location: row.location,
        date: row.date,
        docket: row.docket,
        pdfId: row.pdfId,
        id: row.id,
        title: row.title,
      });
      if (!isRealFdicOrderBody(parsed.body)) {
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

export async function loadFdicOrders(): Promise<FdicOrdersSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealFdicOrderBody(c.body))) {
    return cached;
  }
  try {
    return await collectFdicOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealFdicOrderBody(c.body)) ? "stale" : "empty",
        reason: `Live FDIC institution order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `FDIC institution order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFdicOrdersManifest(snap: FdicOrdersSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFdicOrderBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote("/fdic-orders", 'Full catalog: count + bank + docket + date + official URL. Not the EDOS Salesforce index'),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: FDIC_ORDERS_AMOUNT_ATOMIC,
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
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `https://${PDF_HOST}/` },
  };
}

export async function loadFdicOrdersManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildFdicOrdersManifest(cached);
  return buildFdicOrdersManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFdicOrders()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealFdicOrderBody(c.body)).length,
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
