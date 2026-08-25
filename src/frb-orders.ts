/**
 * FRB institution C&D / written-agreement / PCA TEXT door.
 * Official per-order PDFs from federalreserve.gov/newsevents/pressreleases/files only.
 * Does not invent order text.
 * Official enforcement CSV is party/type/date/press URL only (listing metadata).
 * Not ea-old.json / ea-cms-recent.json / ne-press.json teasers.
 * Not BankFind. Not IAP / prohibition-of-employee people files.
 * Not EDGAR 8-K exhibits of other banks.
 * Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FRB_ORDERS_PATH = "/frb-orders";
export const FRB_ORDERS_MANIFEST_PATH = "/frb-orders/manifest.json";
export const FRB_ORDERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "frb-institution-order-bodies";
export const PRODUCT_NAME = "FRB institution C&D / written-agreement / PCA text";

export const LISTING_URL = "https://www.federalreserve.gov/supervisionreg/enforcementactions.htm";
export const CSV_URL = "https://www.federalreserve.gov/supervisionreg/files/enforcementactions.csv";
export const PDF_HOST = "www.federalreserve.gov";
export const PDF_BASE = "https://www.federalreserve.gov/newsevents/pressreleases/files/";
export const DOCKET_RE = /\b(\d{2}-\d{3}-(?:B|PCA|WA\/RB)-(?:HC|SM|FBO))\b/i;
export const PEOPLE_DOCKET_RE = /\b\d{2}-\d{3}-(?:E|I)-(?:I|HC|SM)\b/i;
export const PDF_ID_RE = /\benf(\d{8}[a-z]\d)\.pdf\b/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "Federal Reserve Board";

export const CARD_FIELDS = [
  "id",
  "docket",
  "pdfId",
  "institution",
  "location",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type FrbListingRow = {
  institution?: string;
  organization?: string;
  individual?: string;
  location?: string;
  docket?: string;
  date?: string;
  title?: string;
  action?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type FrbOrderListing = {
  id: string;
  docket: string;
  institution: string;
  location: string | null;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type FrbOrderCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  location: string | null;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type FrbOrdersSnapshot = {
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
    csv: string;
    pdfHost: string;
  };
  cards: FrbOrderCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FRB public enforcement orders; +https://www.federalreserve.gov/)";

/** Official 2026 institution C&D / WA / PCA PDFs on federalreserve.gov. Iuka WA has two institution dockets. */
export const SEED_LISTINGS: FrbOrderListing[] = [
  {
    id: "26-019-B-HC",
    docket: "26-019-B-HC",
    institution: "Community Bankshares, Inc.",
    location: "LaGrange, Georgia",
    date: "2026-04-14",
    title: "Cease and Desist Order",
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf",
    pdfId: "enf20260416a1",
  },
  {
    id: "26-039-PCA-SM",
    docket: "26-039-PCA-SM",
    institution: "Small Business Bank",
    location: "Lenexa, Kansas",
    date: "2026-06-29",
    title: "Prompt Corrective Action Directive",
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260702a1.pdf",
    pdfId: "enf20260702a1",
  },
  {
    id: "26-016-WA/RB-HC",
    docket: "26-016-WA/RB-HC",
    institution: "TS Banking Group, Inc. and TS Contrarian Bancshares, Inc.",
    location: "Treynor, Iowa",
    date: "2026-07-06",
    title: "Written Agreement",
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260709a1.pdf",
    pdfId: "enf20260709a1",
  },
  {
    id: "26-040-WA/RB-HC",
    docket: "26-040-WA/RB-HC",
    institution: "Iuka Bancshares, Inc.",
    location: "Salem, Illinois",
    date: "2026-07-15",
    title: "Written Agreement",
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260730b1.pdf",
    pdfId: "enf20260730b1",
  },
  {
    id: "26-040-WA/RB-SM",
    docket: "26-040-WA/RB-SM",
    institution: "The Iuka State Bank",
    location: "Salem, Illinois",
    date: "2026-07-15",
    title: "Written Agreement",
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260730b1.pdf",
    pdfId: "enf20260730b1",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function frbOrdersDir(): string {
  if (env("FRB_ORDERS_DIR")) return resolve(env("FRB_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/frb-orders"));
}

export function snapshotPath(): string {
  return join(frbOrdersDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/frb-orders/seed-snapshot.json"),
    join(here, "fixtures/frb-orders/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function fileSafeDocket(docket: string): string {
  return docket.replace(/\//g, "-");
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(DOCKET_RE);
  if (!m) return null;
  const parts = m[1].split("-");
  if (parts.length < 3) return null;
  const yy = parts[0];
  const num = parts[1];
  const rest = parts.slice(2).join("-").toUpperCase();
  return `${yy}-${num}-${rest}`;
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
  if (!url) return null;
  const m = url.match(PDF_ID_RE);
  return m ? `enf${m[1].toLowerCase()}` : null;
}

export function officialFrbPdfUrl(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^enf\d{8}[a-z]\d$/i.test(trimmed)) {
    return `${PDF_BASE}${trimmed.toLowerCase()}.pdf`;
  }
  try {
    const parsed = new URL(trimmed, "https://www.federalreserve.gov");
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") return null;
    if (host !== "www.federalreserve.gov" && host !== "federalreserve.gov") return null;
    const id = pdfIdFromUrl(parsed.pathname);
    if (!id) return null;
    return `${PDF_BASE}${id}.pdf`;
  } catch {
    return null;
  }
}

export function pdfUrlFromPressUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/enforcement(\d{8}[a-z])\.htm/i);
  if (!m) return null;
  return officialFrbPdfUrl(`${PDF_BASE}enf${m[1].toLowerCase()}1.pdf`);
}

const CSV_INSTITUTION_ACTION_RE =
  /\bcease and desist\b|\bcease-and-desist\b|\bwritten agreement\b|\bprompt corrective action\b/i;

export function splitBankingOrganization(raw: string): { institution: string; location: string | null } {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  const loc = trimmed.match(/^(.*),\s+([^,]+,\s+[A-Za-z][A-Za-z .]+)$/);
  if (loc) return { institution: loc[1].trim(), location: loc[2].trim() };
  return { institution: trimmed, location: null };
}

/** Official enforcement CSV is listing metadata. Map press URLs to files/*.pdf. Skip people / IAP / §19. */
export function parseFrbCsv(text: string): FrbOrderListing[] {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const iDate = idx("effective date");
  const iIndividual = idx("individual");
  const iOrg = idx("banking organization");
  const iAction = idx("action");
  const iUrl = idx("url");
  if (iOrg < 0 || iAction < 0 || iUrl < 0) return [];
  const found: FrbOrderListing[] = [];
  const seen = new Set<string>();
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const individual = (cells[iIndividual] ?? "").trim();
    if (individual) continue;
    const action = (cells[iAction] ?? "").trim();
    if (!CSV_INSTITUTION_ACTION_RE.test(action)) continue;
    if (/\bsection 19\b|\bprohibition from banking\b/i.test(action) && !CSV_INSTITUTION_ACTION_RE.test(action)) {
      continue;
    }
    const sourceUrl = pdfUrlFromPressUrl(cells[iUrl] ?? "");
    const pdfId = pdfIdFromUrl(sourceUrl ?? "") ?? "";
    if (!sourceUrl || !pdfId) continue;
    if (seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);
    const { institution, location } = splitBankingOrganization(cells[iOrg] ?? "");
    if (!institution) continue;
    found.push({
      id: pdfId,
      docket: pdfId,
      institution,
      location,
      date: isoDate(cells[iDate] ?? ""),
      title: action,
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.pdfId}`.localeCompare(`${a.date ?? ""}${a.pdfId}`));
  return found;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function mergeOfficialListings(listed: FrbOrderListing[], seeds: FrbOrderListing[]): FrbOrderListing[] {
  const seenId = new Set<string>();
  const seenUrl = new Set<string>();
  const out: FrbOrderListing[] = [];
  for (const row of seeds) {
    if (!row.id || seenId.has(row.id)) continue;
    seenId.add(row.id);
    if (row.sourceUrl) seenUrl.add(row.sourceUrl);
    out.push(row);
  }
  for (const row of listed) {
    if (!row.id || seenId.has(row.id)) continue;
    if (row.sourceUrl && seenUrl.has(row.sourceUrl)) continue;
    seenId.add(row.id);
    if (row.sourceUrl) seenUrl.add(row.sourceUrl);
    out.push(row);
  }
  return out;
}

export function isPeopleRow(row: FrbListingRow): boolean {
  return Boolean((row.individual ?? "").trim());
}

function listingKind(row: FrbListingRow): string {
  return `${row.title ?? ""} ${row.action ?? ""} ${row.type ?? ""}`.replace(/\s+/g, " ").trim();
}

export function isProhibitionRow(row: FrbListingRow): boolean {
  const kind = listingKind(row);
  const docket = row.docket ?? "";
  if (/prohibition from banking|\border of prohibition\b/i.test(kind)) return true;
  return PEOPLE_DOCKET_RE.test(docket);
}

export function isInstitutionOrderRow(row: FrbListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (isProhibitionRow(row)) return false;
  const institution = ((row.institution ?? row.organization) ?? "").trim();
  if (!institution) return false;
  const docket = normalizeDocket(row.docket);
  if (!docket) return false;
  const kind = listingKind(row);
  if (
    kind &&
    !/\bcease and desist\b|\bcease-and-desist\b|\bwritten agreement\b|\bprompt corrective action\b|\bpca directive\b/i.test(
      kind,
    )
  ) {
    return false;
  }
  return Boolean(officialFrbPdfUrl(row.sourceUrl ?? row.pdfId ?? ""));
}

export function parseListingRows(rows: FrbListingRow[]): FrbOrderListing[] {
  const found: FrbOrderListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const docket = normalizeDocket(row.docket);
    const sourceUrl = officialFrbPdfUrl(row.sourceUrl ?? row.pdfId ?? "");
    const pdfId = pdfIdFromUrl(sourceUrl ?? "") ?? (row.pdfId ?? "").trim();
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: docket,
      docket,
      institution: ((row.institution ?? row.organization) ?? "").trim(),
      location: (row.location ?? "").trim() || null,
      date: isoDate(row.date),
      title: listingKind(row) || "Enforcement Order",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function isCsvMetadataDump(text: string): boolean {
  const t = text.trim();
  if (/^Effective Date,Termination Date,Individual/i.test(t)) return true;
  if (/Banking Organization,Action,URL/.test(t) && /Press Release/.test(t) && !/WHEREAS/.test(t)) {
    return true;
  }
  return false;
}

export function isTeaserDump(text: string): boolean {
  if (/"source"\s*:\s*"ea-(old|cms-recent)\.json"/i.test(text)) return true;
  if (/"source"\s*:\s*"ne-press\.json"/i.test(text)) return true;
  if (/"pressUrl"/.test(text) && /"party"/.test(text) && !/WHEREAS/.test(text)) return true;
  if (/Press release only\. No order text/i.test(text)) return true;
  return false;
}

export function isBankFindDump(text: string): boolean {
  return /BankFind/i.test(text) || (/"CERT"/.test(text) && /"STALP"/.test(text) && /"ACTIVE"/.test(text));
}

export function isEdgarDump(text: string): boolean {
  return /<SUBMISSION>|<TYPE>8-K|complete-submission\.txt|EX-99\.1/i.test(text);
}

export function isRealFrbOrderBody(text: string): boolean {
  if (isCsvMetadataDump(text) || isTeaserDump(text) || isBankFindDump(text) || isEdgarDump(text)) {
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
  if (/FEDERAL DEPOSIT INSURANCE CORPORATION/i.test(text) && /\bFDIC-\d{2}-\d{4}[a-z]\b/i.test(text)) {
    return false;
  }
  if (/Bureau of Consumer Protection/i.test(text) && /Made in the USA Labeling Rule|MUSA Labeling Rule|Warning Letter Regarding/i.test(text)) {
    return false;
  }
  if (/\bProhibition from Banking\b|\bOrder of Prohibition\b|\bRemoval and Prohibition\b/i.test(text)) {
    return false;
  }
  if (/\bby affixing (his|her|their) signature\b/i.test(text) && /institution-affiliated party/i.test(text)) {
    return false;
  }
  const frb = /BOARD OF GOVERNORS OF THE FEDERAL RESERVE SYSTEM/i.test(text);
  const order =
    /\bCEASE AND DESIST\b/i.test(text) ||
    /\bCEASE-AND-DESIST\b/i.test(text) ||
    /\bWritten Agreement\b/i.test(text) ||
    /\bPrompt Corrective Action\b/i.test(text);
  const docket = DOCKET_RE.test(text);
  const institution =
    /bank holding company/i.test(text) ||
    /state-chartered bank/i.test(text) ||
    /member of the Federal Reserve System/i.test(text);
  const findings = /\bWHEREAS\b/.test(text) || /\bNOW,? THEREFORE\b/i.test(text);
  return frb && order && docket && institution && findings;
}

export function parseOrderTitle(body: string): string {
  if (/\bPrompt Corrective Action\b/i.test(body)) return "Prompt Corrective Action Directive";
  if (/\bWritten Agreement\b/i.test(body)) return "Written Agreement";
  if (/\bCEASE AND DESIST\b/i.test(body) || /\bCEASE-AND-DESIST\b/i.test(body)) return "Cease and Desist Order";
  return "Enforcement Order";
}

export function parseDocketFromBody(body: string): string | null {
  return normalizeDocket(body.slice(0, 2500));
}

export function parseFrbOrderText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    location?: string | null;
    date?: string | null;
    docket?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): FrbOrderCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFrbPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || parseDocketFromBody(body) || "unknown";
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || fileSafeDocket(docket);
  return {
    id: normalizeDocket(meta.id) || docket,
    docket,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    location: meta.location ?? null,
    date: meta.date ?? isoDate(body.slice(0, 1600)),
    title: meta.title || parseOrderTitle(body),
    sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): FrbOrdersSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, csv: CSV_URL, pdfHost: `https://${PDF_HOST}/` },
    cards: [],
  };
}

function cardDateKey(card: Pick<FrbOrderCard, "date" | "docket">): string {
  return `${card.date ?? ""}${card.docket}`;
}

export function assembleSnapshot(cards: FrbOrderCard[], fetchedAt = new Date().toISOString()): FrbOrdersSnapshot {
  const seenDocket = new Set<string>();
  const withBody = cards
    .filter((c) => isRealFrbOrderBody(c.body))
    .sort((a, b) => cardDateKey(b).localeCompare(cardDateKey(a)))
    .filter((c) => {
      if (seenDocket.has(c.docket)) return false;
      seenDocket.add(c.docket);
      return true;
    });
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
    reason: withBody.length > 0 ? null : "Official FRB institution order PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, csv: CSV_URL, pdfHost: `https://${PDF_HOST}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): FrbOrdersSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FrbOrdersSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): FrbOrdersSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("FRB_ORDERS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: FrbOrdersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedFrbOrderBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealFrbOrderBody(c.body)));
}

function listingDir(): string {
  return env("FRB_ORDERS_JSON_DIR") || env("FRB_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("FRB_ORDERS_LIMIT", "5");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const raw = env("FRB_ORDERS_MAX_FETCH", "8");
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

export async function fetchFrbText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "*/*" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const text = await res.text();
  if (!/Effective Date,Termination Date,Individual/i.test(text.slice(0, 200))) {
    throw new Error(`${url} did not return the official enforcement CSV`);
  }
  return text;
}

export async function fetchFrbBytes(url: string): Promise<Uint8Array> {
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
  const helper = env("FRB_ORDERS_PDFTOTEXT") || "pdftotext";
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

async function loadOfficialListings(dir: string): Promise<{ listed: FrbOrderListing[]; listedCount: number }> {
  if (dir) {
    const csv = readNamedFile(dir, ["listing-excerpt.csv", "listing.csv"]);
    if (csv) {
      const listed = mergeOfficialListings(parseFrbCsv(csv), SEED_LISTINGS);
      return { listed, listedCount: listed.length };
    }
    const raw = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    const rows = raw ? (JSON.parse(raw) as FrbListingRow[]) : [];
    const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
    return { listed, listedCount: listed.length };
  }
  try {
    const listed = parseFrbCsv(await fetchFrbText(CSV_URL));
    const merged = mergeOfficialListings(listed, SEED_LISTINGS);
    if (merged.length > 0) return { listed: merged, listedCount: merged.length };
  } catch {
    /* official CSV missed; keep first-slice seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

function priorBodies(): Map<string, FrbOrderCard> {
  const prior = new Map<string, FrbOrderCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealFrbOrderBody(card.body)) prior.set(card.id, card);
  }
  return prior;
}

export async function collectFrbOrders(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FrbOrdersSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = frbOrdersDir();
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
        reason: "Official FRB seed listing missed; kept cached institution order bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official FRB seed listing had no institution C&D / written-agreement / PCA rows.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: FrbOrderCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached =
      prior.get(row.id) ||
      [...prior.values()].find((card) => card.sourceUrl === row.sourceUrl || card.pdfId === row.pdfId);
    if (cached) {
      cards.push(cached);
      seen.add(cached.id);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    if (!dir) await pause(pauseMs);
    try {
      const localText = readNamedFile(dir, [
        `${fileSafeDocket(row.docket)}.txt`,
        `${row.docket}.txt`,
        `${row.id}.txt`,
        `${fileSafeDocket(row.id)}.txt`,
        `${row.pdfId}.txt`,
      ]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${row.pdfId}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchFrbBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseFrbOrderText(text, {
        sourceUrl: row.sourceUrl,
        institution: row.institution,
        location: row.location,
        date: row.date,
        docket: row.docket,
        pdfId: row.pdfId,
        id: row.id,
        title: row.title,
      });
      if (!isRealFrbOrderBody(parsed.body)) {
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

export async function loadFrbOrders(): Promise<FrbOrdersSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealFrbOrderBody(c.body))) {
    return cached;
  }
  try {
    return await collectFrbOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealFrbOrderBody(c.body)) ? "stale" : "empty",
        reason: `Live FRB institution order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `FRB institution order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFrbOrdersManifest(snap: FrbOrdersSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFrbOrderBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + docket + date + official PDF URL only. Order body is the paid GET /frb-orders payload. This free manifest lists the full catalog. GET ?id= is one official text for $0.02. Default GET is the newest 10 official texts for $0.05. If the catalog has fewer than 10, that $0.05 GET is the whole current set. Older pages are another $0.05 on the same URL (page/before).",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: FRB_ORDERS_AMOUNT_ATOMIC,
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
    sources: snap?.sources ?? { listing: LISTING_URL, csv: CSV_URL, pdfHost: `https://${PDF_HOST}/` },
  };
}

export async function loadFrbOrdersManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildFrbOrdersManifest(cached);
  return buildFrbOrdersManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFrbOrders()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealFrbOrderBody(c.body)).length,
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
