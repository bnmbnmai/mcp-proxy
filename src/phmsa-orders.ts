/**
 * PHMSA-authored pipeline enforcement TEXT door.
 * Official PDFs on primis.phmsa.dot.gov/enforcement-documents/{CPF}/ only.
 * Harvest: NOPV (PCP/PCO), Final Order, Corrective Action Order, Consent Order,
 * Decision on Petition. Skip operator-response PDFs. Skip NOA / warning letter /
 * safety-order / WI. TSV is 53-col metadata only — findings stay in the PDFs.
 * 17 USC 105. Distinct from killed PHMSA incident NARRATIVE zip and /ferc-orders.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const PHMSA_ORDERS_PATH = "/phmsa-orders";
export const PHMSA_ORDERS_MANIFEST_PATH = "/phmsa-orders/manifest.json";
export const PHMSA_ORDERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "phmsa-enforcement-order-bodies";
export const PRODUCT_NAME = "PHMSA pipeline enforcement-order text";

export const TSV_URL =
  "https://primis.phmsa.dot.gov/enforcement-documents/PHMSA%20Pipeline%20Enforcement%20Raw%20Data.txt";
export const PDF_HOST = "primis.phmsa.dot.gov";
export const PDF_ORIGIN = "https://primis.phmsa.dot.gov";
export const DOC_BASE = `${PDF_ORIGIN}/enforcement-documents`;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "PHMSA / U.S. Department of Transportation";

export const CARD_FIELDS = [
  "id",
  "cpf",
  "docket",
  "institution",
  "date",
  "kind",
  "title",
  "sourceUrl",
  "body",
] as const;

export const HARVEST_KINDS = [
  "PCP",
  "PCO",
  "Final Order",
  "Corrective Action Order",
  "Consent Order",
  "Decision on Petition",
] as const;

export type PhmsaOrderKind = (typeof HARVEST_KINDS)[number];

export type PhmsaTsvRow = Record<string, string>;

export type PhmsaOrderListing = {
  id: string;
  cpf: string;
  docket: string;
  institution: string;
  date: string | null;
  kind: PhmsaOrderKind;
  title: string;
  sourceUrl: string;
  wms: string;
};

export type PhmsaOrderCard = PhmsaOrderListing & { body: string };

export type PhmsaOrdersSnapshot = {
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
  sources: { listing: string; pdfHost: string };
  cards: PhmsaOrderCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (PHMSA public enforcement PDFs; +https://primis.phmsa.dot.gov/)";
const MIN_BODY_CHARS = 800;
const OPERATOR_RESPONSE_RE =
  /(?:^|[\s._-])(operator.?response|response to (?:the )?nopv|request for hearing|hearing request|operator comment)(?:$|[\s._-])/i;
const SKIP_CASE_RE = /^(Notice of Amendment|Warning Letter|Safety Order)$/i;
const FERC_RE = /\bferc\b|cms\.ferc\.gov|eLibrary/i;
const NARRATIVE_ZIP_RE = /\bincident narrative\b|\bnarrative\.zip\b/i;
const TSV_DUMP_RE = /^CPF_Number\tOperator_ID\tOperator_Name/m;

export const SEED_LISTINGS: PhmsaOrderListing[] = [
  {
    id: "42026012NOPV-final-order",
    cpf: "42026012NOPV",
    docket: "4-2026-012-NOPV",
    institution: "NAVIGATOR PANHANDLE HOLDCO LLC",
    date: "2026-04-07",
    kind: "Final Order",
    title: "Final Order — Navigator Panhandle Holdco LLC (CPF 4-2026-012-NOPV)",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/42026012NOPV/42026012NOPV_Final%20Order_04072026_(23-266706).pdf",
    wms: "23-266706",
  },
  {
    id: "32026023CAO-corrective-action-order",
    cpf: "32026023CAO",
    docket: "3-2026-023-CAO",
    institution: "AMOCO OIL CO",
    date: "2026-08-03",
    kind: "Corrective Action Order",
    title: "Corrective Action Order — Amoco Oil Co (CPF 3-2026-023-CAO)",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/32026023CAO/32026023CAO_Corrective%20Action%20Order_08032026_(26-379109).pdf",
    wms: "26-379109",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function phmsaOrdersDir(): string {
  if (env("PHMSA_ORDERS_DIR")) return resolve(env("PHMSA_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/phmsa-orders"));
}

export function snapshotPath(): string {
  return join(phmsaOrdersDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/phmsa-orders/seed-snapshot.json"),
    join(here, "fixtures/phmsa-orders/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function parseMdy(raw: string | null | undefined): { iso: string; stamp: string } | null {
  const s = String(raw || "").trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const stamp = `${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}${String(year).padStart(4, "0")}`;
  return { iso, stamp };
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return parseMdy(raw)?.iso ?? null;
}

export function slugKind(kind: string): string {
  return kind
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function cpfDocket(cpf: string): string {
  const m = String(cpf || "").match(/^(\d)(\d{4})(\d{3})([A-Z]+)$/i);
  if (!m) return cpf;
  return `${m[1]}-${m[2]}-${m[3]}-${m[4].toUpperCase()}`;
}

export function isOperatorResponseName(name: string): boolean {
  return OPERATOR_RESPONSE_RE.test(name);
}

export function isOfficialPhmsaPdf(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.hostname.toLowerCase() !== PDF_HOST) return false;
    if (!u.pathname.startsWith("/enforcement-documents/")) return false;
    if (!/\.pdf$/i.test(u.pathname)) return false;
    const file = decodeURIComponent(u.pathname.split("/").pop() || "");
    if (isOperatorResponseName(file)) return false;
    if (/\.zip$/i.test(file) || NARRATIVE_ZIP_RE.test(file)) return false;
    return true;
  } catch {
    return false;
  }
}

export function officialPdfUrl(cpf: string, kind: string, stamp: string, wms: string): string {
  const file = `${cpf}_${kind}_${stamp}_(${wms}).pdf`;
  return `${DOC_BASE}/${encodeURIComponent(cpf)}/${encodeURIComponent(file)}`;
}

export function parseTsv(raw: string): PhmsaTsvRow[] {
  if (TSV_DUMP_RE.test(raw) === false && !raw.includes("CPF_Number")) return [];
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split("\t").map((h) => h.trim());
  if (header.length < 10 || header[0] !== "CPF_Number") return [];
  const rows: PhmsaTsvRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split("\t");
    const row: PhmsaTsvRow = {};
    header.forEach((key, i) => {
      row[key] = (cols[i] ?? "").trim();
    });
    if (row.CPF_Number) rows.push(row);
  }
  return rows;
}

function yes(row: PhmsaTsvRow, key: string): boolean {
  return /^(yes|y|1|true)$/i.test(row[key] || "");
}

export function harvestCandidates(row: PhmsaTsvRow): Array<{ kind: PhmsaOrderKind; dateRaw: string }> {
  const caseType = (row.Case_Type || "").trim();
  if (SKIP_CASE_RE.test(caseType) && !/NOPV|CAO/i.test(row.CPF_Number || "")) return [];
  const out: Array<{ kind: PhmsaOrderKind; dateRaw: string }> = [];
  const push = (kind: PhmsaOrderKind, dateRaw: string) => {
    if (dateRaw) out.push({ kind, dateRaw });
  };
  if (yes(row, "Corrective_Action_Order_Ind") || row.Latest_Order_Type === "Corrective Action Order") {
    push("Corrective Action Order", row.Corrective_Action_Order_Date || row.Latest_Order_Date || row.Opened_Date);
  }
  if (yes(row, "Final_Order_Ind") || row.Latest_Order_Type === "Final Order") {
    push("Final Order", row.Final_Order_Date || row.Latest_Order_Date);
  }
  if (yes(row, "Consent_Order_Ind") || row.Latest_Order_Type === "Consent Order") {
    push("Consent Order", row.Consent_Order_Date || row.Latest_Order_Date);
  }
  if (yes(row, "Decision_on_Petition_Ind") || /decision on petition|decision for reconsideration/i.test(row.Latest_Order_Type || "")) {
    push("Decision on Petition", row.Decision_on_Petition_Date || row.Latest_Order_Date);
  }
  const cpf = row.CPF_Number || "";
  const notice = row.Notice_Sent_Date || row.Opened_Date;
  const actions = row.Notice_Actions || "";
  const isNopv = /NOPV/i.test(cpf) || /^Notice of Probable Violation$/i.test(caseType);
  if (isNopv) {
    if (/\bCP\b/.test(actions)) push("PCP", notice);
    if (/\bCO\b/.test(actions)) push("PCO", notice);
  }
  const seen = new Set<string>();
  return out.filter((item) => {
    const key = `${item.kind}|${item.dateRaw}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function listingFromRow(
  row: PhmsaTsvRow,
  kind: PhmsaOrderKind,
  dateRaw: string,
): PhmsaOrderListing | null {
  const cpf = (row.CPF_Number || "").trim();
  const wms = (row.WMS_Activity_Seq || "").trim();
  const parsed = parseMdy(dateRaw);
  if (!cpf || !wms || !parsed) return null;
  const sourceUrl = officialPdfUrl(cpf, kind, parsed.stamp, wms);
  if (!isOfficialPhmsaPdf(sourceUrl) || isOperatorResponseName(sourceUrl)) return null;
  const institution = (row.Operator_Name || row.Operator_Searchable_Name || cpf).trim();
  return {
    id: `${cpf}-${slugKind(kind)}`,
    cpf,
    docket: cpfDocket(cpf),
    institution,
    date: parsed.iso,
    kind,
    title: `${kind} — ${institution} (CPF ${cpfDocket(cpf)})`,
    sourceUrl,
    wms,
  };
}

export function parseListingRows(rows: PhmsaTsvRow[]): PhmsaOrderListing[] {
  const out: PhmsaOrderListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const cand of harvestCandidates(row)) {
      const listing = listingFromRow(row, cand.kind, cand.dateRaw);
      if (!listing || seen.has(listing.id)) continue;
      seen.add(listing.id);
      out.push(listing);
    }
  }
  return out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
}

export function isRealPhmsaOrderBody(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length < MIN_BODY_CHARS) return false;
  if (TSV_DUMP_RE.test(t)) return false;
  if (NARRATIVE_ZIP_RE.test(t)) return false;
  if (FERC_RE.test(t) && !/\bphmsa\b/i.test(t)) return false;
  if (isOperatorResponseName(t) && !/\bphmsa\b|\bpipeline and hazardous materials\b/i.test(t)) return false;
  const hasPhmsa =
    /\bphmsa\b/i.test(t) ||
    /\bpipeline and hazardous materials safety administration\b/i.test(t) ||
    /\boffice of pipeline safety\b/i.test(t);
  if (!hasPhmsa) return false;
  const hasKind =
    /\bfinal order\b/i.test(t) ||
    /\bcorrective action order\b/i.test(t) ||
    /\bconsent order\b/i.test(t) ||
    /\bnotice of probable violation\b/i.test(t) ||
    /\bproposed civil penalty\b/i.test(t) ||
    /\bproposed compliance order\b/i.test(t) ||
    /\bdecision on petition\b/i.test(t) ||
    /\b49 cfr\b/i.test(t);
  return hasKind;
}

export function parsePhmsaOrderText(
  text: string,
  meta: Partial<PhmsaOrderListing> & { sourceUrl: string },
): PhmsaOrderCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = meta.sourceUrl;
  const id = meta.id || `${meta.cpf || "phmsa"}-${slugKind(meta.kind || "order")}`;
  return {
    id,
    cpf: meta.cpf || id,
    docket: meta.docket || (meta.cpf ? cpfDocket(meta.cpf) : id),
    institution: meta.institution || id,
    date: isoDate(meta.date) ?? isoDate(body.slice(0, 1600)),
    kind: (meta.kind as PhmsaOrderKind) || "Final Order",
    title: meta.title || id,
    sourceUrl,
    wms: meta.wms || "",
    body,
  };
}

export function emptyPhmsaOrdersSnapshot(reason: string): PhmsaOrdersSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: TSV_URL, pdfHost: DOC_BASE },
    cards: [],
  };
}

export function assemblePhmsaOrdersSnapshot(
  cards: PhmsaOrderCard[],
  fetchedAt = new Date().toISOString(),
): PhmsaOrdersSnapshot {
  const withBody = cards
    .filter((c) => isRealPhmsaOrderBody(c.body) && isOfficialPhmsaPdf(c.sourceUrl))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
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
        : "Official PHMSA enforcement PDFs had no extractable PHMSA-authored order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: TSV_URL, pdfHost: DOC_BASE },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): PhmsaOrdersSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as PhmsaOrdersSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readPhmsaOrdersSnapshot(): PhmsaOrdersSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("PHMSA_ORDERS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writePhmsaOrdersSnapshot(snap: PhmsaOrdersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchPhmsaText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/plain,*/*" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchPhmsaBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,*/*" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error(`${url} is not an official PDF`);
  }
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("PHMSA_ORDERS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function listingDir(): string {
  return env("PHMSA_ORDERS_TSV_DIR") || env("PHMSA_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("PHMSA_ORDERS_LIMIT", "16"));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 16;
}

function maxFetchLimit(): number {
  const n = Number(env("PHMSA_ORDERS_MAX_FETCH", "24"));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 24;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: PhmsaOrderListing[], seeds: PhmsaOrderListing[]): PhmsaOrderListing[] {
  const seen = new Set<string>();
  const out: PhmsaOrderListing[] = [];
  for (const row of [...listed, ...seeds]) {
    if (!row.id || seen.has(row.id) || !isOfficialPhmsaPdf(row.sourceUrl)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
}

async function loadOfficialListings(dir: string): Promise<{ listed: PhmsaOrderListing[]; listedCount: number }> {
  if (dir) {
    const tsv = readNamedFile(dir, ["listing-excerpt.tsv", "listing.tsv", "PHMSA Pipeline Enforcement Raw Data.txt"]);
    const fromTsv = tsv ? parseListingRows(parseTsv(tsv)) : [];
    const extra = SEED_LISTINGS.filter((row) => existsSync(join(dir, `${row.id}.txt`)));
    const listed = mergeListings(fromTsv, extra);
    return { listed, listedCount: listed.length };
  }
  try {
    const tsv = await fetchPhmsaText(TSV_URL);
    const listed = mergeListings(parseListingRows(parseTsv(tsv)), SEED_LISTINGS);
    return { listed, listedCount: listed.length };
  } catch {
    return { listed: mergeListings([], SEED_LISTINGS), listedCount: SEED_LISTINGS.length };
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function collectPhmsaOrders(opts?: {
  pauseMs?: number;
  tsvDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<PhmsaOrdersSnapshot> {
  const dir = opts?.tsvDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = phmsaOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, PhmsaOrderCard>();
  for (const card of readPhmsaOrdersSnapshot()?.cards ?? []) {
    if (isRealPhmsaOrderBody(card.body)) prior.set(card.id, card);
  }
  const cards: PhmsaOrderCard[] = [];
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
    try {
      const localText = readNamedFile(dir, [`${row.id}.txt`, `${row.cpf}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      if (!dir) await pause(opts?.pauseMs ?? 250);
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchPhmsaBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parsePhmsaOrderText(text, row);
      if (!isRealPhmsaOrderBody(parsed.body)) {
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
    ...assemblePhmsaOrdersSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writePhmsaOrdersSnapshot(snap);
  return snap;
}

export async function loadPhmsaOrders(): Promise<PhmsaOrdersSnapshot> {
  const cached = readPhmsaOrdersSnapshot();
  if (cached) {
    const filtered = assemblePhmsaOrdersSnapshot(cached.cards, cached.fetchedAt);
    if (filtered.cards.length) return { ...cached, ...filtered };
  }
  try {
    return await collectPhmsaOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealPhmsaOrderBody(c.body)) ? "stale" : "empty",
        reason: `Live PHMSA enforcement fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyPhmsaOrdersSnapshot(
      `PHMSA enforcement PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildPhmsaOrdersManifest(snap: PhmsaOrdersSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealPhmsaOrderBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      PHMSA_ORDERS_PATH,
      "Count + operator + CPF + date + official PHMSA PDF URL only. Order body is the paid GET /phmsa-orders payload. This free manifest lists the full catalog. TSV metadata, operator-response PDFs, incident NARRATIVE zips, and FERC orders are not sold.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: PHMSA_ORDERS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      cpf: c.cpf,
      docket: c.docket,
      institution: c.institution,
      date: c.date,
      kind: c.kind,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "cpf", "docket", "institution", "date", "kind", "sourceUrl"] },
    sources: snap?.sources ?? { listing: TSV_URL, pdfHost: DOC_BASE },
  };
}

export async function loadPhmsaOrdersManifest(): Promise<Record<string, unknown>> {
  return buildPhmsaOrdersManifest(readPhmsaOrdersSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectPhmsaOrders()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              institution: c.institution,
              date: c.date,
              kind: c.kind,
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
