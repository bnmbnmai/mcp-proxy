#!/usr/bin/env node
/**
 * BSEE District Accident Investigation Report TEXT door.
 * Official investigation-report PDFs linked from the BSEE district
 * investigation-reports index table. 17 U.S.C. § 105 (BSEE / DOI).
 * Prefer full report PDF text. Do not sell BSEE Data Center INC Online
 * Query / company INC metadata, INC counts, eWell WAR, platform INC
 * dumps, ASCII/zip company dumps, or CSB / PHMSA / FMSHRC / EPA CAFO /
 * NTSB packs already live elsewhere.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const BSEE_REPORTS_PATH = "/bsee-reports";
export const BSEE_REPORTS_MANIFEST_PATH = "/bsee-reports/manifest.json";
export const BSEE_REPORTS_AMOUNT_ATOMIC = "50000";
export const BSEE_REPORTS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "bsee-district-investigation-bodies";
export const PRODUCT_NAME = "BSEE District Accident Investigation Report text";

export const LISTING_URL =
  "https://www.bsee.gov/what-we-do/incident-investigations/offshore-incident-investigations/district-investigation-reports";
export const PDF_ORIGIN = "https://www.bsee.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Bureau of Safety and Environmental Enforcement, U.S. Department of the Interior. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const PDF_PATH_RE = /^\/sites\/bsee\.gov\/files\/\d{4}-\d{2}\/[^?#]+\.pdf$/i;
export const KIND_RE = /ACCIDENT INVESTIGATION REPORT/i;
export const AGENCY_RE =
  /BUREAU OF SAFETY AND ENVIRONMENTAL ENFORCEMENT|MARINE MINERALS ADMINISTRATION|UNITED STATES DEPARTMENT OF THE INTERIOR/i;
export const LEASE_RE = /\bLEASE:\s*(G-?\d+|\d{5})\b/i;

export const CARD_FIELDS = [
  "id",
  "title",
  "date",
  "lease",
  "areaBlock",
  "accidentType",
  "institution",
  "sourceUrl",
  "body",
] as const;

export const BODY_NEEDLE_SEED = "PBA 1210/11";

export const CANTIUM_URL =
  "https://www.bsee.gov/sites/bsee.gov/files/2026-07/MP%20298%20Cantium%2024-May-26.pdf";
export const TALOS_URL =
  "https://www.bsee.gov/sites/bsee.gov/files/2026-07/MU%2085%20Talos%20Energy%20Conductor%20Drop%2017-May-26.pdf";
export const ARENA_URL =
  "https://www.bsee.gov/sites/bsee.gov/files/2026-08/EI%20320B%20Arena%2001-JUL-2026.pdf";

export type BseeListing = {
  id: string;
  title: string;
  date: string | null;
  lease: string;
  areaBlock: string;
  accidentType: string;
  institution: string;
  sourceUrl: string;
  pdfId: string;
};

export type BseeCard = BseeListing & { body: string };

export type BseeSnapshot = {
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
  cards: BseeCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (BSEE public district investigation reports; +https://www.bsee.gov/what-we-do/incident-investigations/offshore-incident-investigations/district-investigation-reports)";
const OFFICIAL_HOSTS = new Set(["www.bsee.gov", "bsee.gov"]);
const KILL_HOSTS = new Set(["www.data.bsee.gov", "data.bsee.gov"]);

export const SEED_LISTINGS: BseeListing[] = [
  {
    id: "mp-298-cantium-2026-05-24",
    title: "Cantium MP 298 A Lease G01315 fire 24-MAY-2026",
    date: "2026-05-24",
    lease: "G01315",
    areaBlock: "MP 298",
    accidentType: "Fire",
    institution: "Cantium",
    sourceUrl: CANTIUM_URL,
    pdfId: "MP 298 Cantium 24-May-26.pdf",
  },
  {
    id: "mu-85-talos-2026-05-17",
    title: "Talos Energy MU 85 Lease G03061 conductor drop 17-MAY-2026",
    date: "2026-05-17",
    lease: "G03061",
    areaBlock: "MU 85",
    accidentType: "Conductor Drop",
    institution: "Talos Energy",
    sourceUrl: TALOS_URL,
    pdfId: "MU 85 Talos Energy Conductor Drop 17-May-26.pdf",
  },
  {
    id: "ei-320-arena-2026-07-01",
    title: "Arena EI 320B Lease G36211 required evacuation 01-JUL-2026",
    date: "2026-07-01",
    lease: "G36211",
    areaBlock: "EI 320",
    accidentType: "Required Evacuation, LTA >3 days, Other Lifting (Top Drive)",
    institution: "Arena",
    sourceUrl: ARENA_URL,
    pdfId: "EI 320B Arena 01-JUL-2026.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function bseeReportsDir(): string {
  if (env("BSEE_REPORTS_DIR")) return resolve(env("BSEE_REPORTS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/bsee-reports"));
}

export function snapshotPath(): string {
  return join(bseeReportsDir(), "snapshot.json");
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
  return decodeEntities(raw.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "));
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const named = raw.match(
    /\b(\d{1,2})[- ](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-. ]+(\d{2,4})\b/i,
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
    let year = named[3];
    if (year.length === 2) year = `20${year}`;
    return mm ? `${year}-${mm}-${named[1].padStart(2, "0")}` : null;
  }
  return null;
}

export function token(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function officialBseePdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim().replace(/&amp;/g, "&"), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (KILL_HOSTS.has(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (!PDF_PATH_RE.test(path)) return null;
    return `https://www.bsee.gov${parsed.pathname}`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string {
  const official = officialBseePdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    return decodeURIComponent(parsed.pathname.split("/").pop() || official);
  } catch {
    return official;
  }
}

export function operatorFromFilename(file: string): string {
  const base = file.replace(/\.pdf$/i, "").replace(/_Redacted$/i, "").replace(/_\d+$/, "");
  const cleaned = decodeEntities(base.replace(/%20/g, " ").replace(/\+/g, " "));
  const dateCut = cleaned.replace(
    /\s+\d{1,2}[- ](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-. ]+\d{2,4}\s*$/i,
    "",
  );
  const areaFirst = dateCut.match(
    /^(?:[A-Z]{1,3}[- ]?\d+[A-Z]?(?:[- ][A-Z0-9]+)?)\s+(.+)$/i,
  );
  if (areaFirst) {
    return areaFirst[1]
      .replace(/\s+Conductor Drop\b/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  const opFirst = dateCut.match(/^(.+?)\s+[A-Z]{1,3}\s+\d+/);
  if (opFirst) return opFirst[1].replace(/\s+/g, " ").trim();
  return dateCut.replace(/\s+/g, " ").trim();
}

export function areaBlockFromFilename(file: string): string | null {
  const base = decodeEntities(file.replace(/\.pdf$/i, "").replace(/%20/g, " "));
  const hit = base.match(/^([A-Z]{1,3})[- ](\d+)/i);
  if (!hit) return null;
  let area = hit[1].toUpperCase();
  if (area === "EL") area = "EI";
  if (area === "GL") area = "GI";
  return `${area} ${hit[2]}`;
}

export function normalizeAreaBlock(raw: string | null | undefined, file?: string): string {
  const fromFile = file ? areaBlockFromFilename(file) : null;
  const cleaned = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return fromFile ?? "";
  const hit = cleaned.match(/^([A-Za-z]{1,3})\s*[-/]?\s*(\d+)/);
  if (hit) {
    let area = hit[1].toUpperCase();
    if (area === "EL") area = "EI";
    if (area === "GL") area = "GI";
    return `${area} ${hit[2]}`;
  }
  return fromFile ?? cleaned;
}

export function normalizeLease(raw: string | null | undefined): string {
  const cleaned = (raw ?? "").replace(/\s+/g, "").toUpperCase();
  const hit = cleaned.match(/G-?(\d{4,})/) || cleaned.match(/^(\d{5})$/);
  if (!hit) return (raw ?? "").replace(/\s+/g, "").trim();
  return hit[0].startsWith("G") ? `G${hit[1]}` : hit[1];
}

export function listingId(row: {
  areaBlock: string;
  institution: string;
  date: string | null;
  lease: string;
}): string {
  const area = token(row.areaBlock) || token(row.lease) || "bsee";
  const op = token(row.institution).split("-")[0] || "operator";
  const day = row.date || "undated";
  return `${area}-${op}-${day}`;
}

export function listingTitle(row: {
  institution: string;
  areaBlock: string;
  lease: string;
  accidentType: string;
  date: string | null;
}): string {
  const when = row.date
    ? row.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => {
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        return `${d}-${months[Number(m) - 1]}-${y}`;
      })
    : "";
  const kind = row.accidentType.split(",")[0]?.trim() || "investigation";
  return [row.institution, row.areaBlock, row.lease ? `Lease ${row.lease}` : "", kind, when]
    .filter(Boolean)
    .join(" ");
}

export function isIncQueryDump(text: string): boolean {
  return /INC Online Query|data\.bsee\.gov\/Company\/INCs/i.test(text);
}

export function isEwellWarDump(text: string): boolean {
  return /\bEWELL\b.*\bWAR\b|WAR_ID,COMPANY,PLATFORM,INC_COUNT/i.test(text);
}

export function isIncCountDump(text: string): boolean {
  return /"INC_COUNT"|platformINC|ASCII\/zip company dump/i.test(text);
}

export function isSiblingPack(text: string): boolean {
  if (/U\.S\.\s+CHEMICAL SAFETY AND HAZARD INVESTIGATION BOARD/i.test(text)) return true;
  if (/PIPELINE AND HAZARDOUS MATERIALS SAFETY ADMINISTRATION/i.test(text) && /NOTICE OF PROBABLE VIOLATION/i.test(text)) {
    return true;
  }
  if (/FEDERAL MINE SAFETY AND HEALTH REVIEW COMMISSION/i.test(text) && /CIVIL PENALTY PROCEEDING/i.test(text)) {
    return true;
  }
  if (/CONSENT AGREEMENT AND FINAL ORDER/i.test(text) && /40 C\.F\.R\.?\s*(Part\s*)?22/i.test(text)) return true;
  if (/NATIONAL TRANSPORTATION SAFETY BOARD/i.test(text) && /Accident Report/i.test(text)) return true;
  return false;
}

export function isRealBseeBody(text: string): boolean {
  if (isIncQueryDump(text) || isEwellWarDump(text) || isIncCountDump(text) || isSiblingPack(text)) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 800) return false;
  return AGENCY_RE.test(text) && KIND_RE.test(text) && (LEASE_RE.test(text) || /\bAREA:\s+[A-Z]{1,3}\b/i.test(text));
}

export function parseDistrictTable(html: string): BseeListing[] {
  const out: BseeListing[] = [];
  const seen = new Set<string>();
  const yearChunks = [...html.matchAll(/id="(\d{4})">([\s\S]*?)(?=<h2 class="usa-accordion__heading"|$)/gi)];
  const tables = yearChunks.length
    ? yearChunks.map((m) => ({ year: m[1], html: m[2] }))
    : [{ year: "", html }];
  for (const table of tables) {
    for (const row of table.html.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
      if (cells.length < 5) continue;
      if (/Date Occurred/i.test(cells[0])) continue;
      const href = (cells[0].match(/href="([^"]+\.pdf[^"]*)"/i) || [])[1] || "";
      const sourceUrl = officialBseePdfUrl(href);
      if (!sourceUrl) continue;
      const date = isoDate(stripTags(cells[0]));
      const lease = normalizeLease(stripTags(cells[2]));
      const pdfId = pdfIdFromUrl(sourceUrl);
      const areaBlock = normalizeAreaBlock(stripTags(cells[3]), pdfId);
      const accidentType = stripTags(cells[4]);
      const institution = operatorFromFilename(pdfId);
      if (!date || !areaBlock) continue;
      const id = listingId({ areaBlock, institution, date, lease });
      if (seen.has(id)) continue;
      seen.add(id);
      const listing: BseeListing = {
        id,
        title: listingTitle({ institution, areaBlock, lease, accidentType, date }),
        date,
        lease,
        areaBlock,
        accidentType,
        institution,
        sourceUrl,
        pdfId,
      };
      out.push(listing);
    }
  }
  return out;
}

export function parseBseeText(text: string, meta: Partial<BseeListing> & { sourceUrl: string }): BseeCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialBseePdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const lease =
    normalizeLease(meta.lease) ||
    normalizeLease((body.match(LEASE_RE) || [])[1]) ||
    "";
  const area =
    (body.match(/\bAREA:\s+([A-Z]{1,3})\b/i) || [])[1] || "";
  const block = (body.match(/\bBLOCK:\s+([A-Z0-9 ]{1,12})/i) || [])[1]?.trim() || "";
  const areaBlock =
    meta.areaBlock ||
    (area && block ? normalizeAreaBlock(`${area} ${block}`) : "") ||
    "";
  const institution = (meta.institution && meta.institution.trim()) || operatorFromFilename(pdfIdFromUrl(sourceUrl));
  const date = meta.date ?? isoDate(body.slice(0, 2500));
  const accidentType = meta.accidentType || "Investigation";
  const title =
    meta.title ||
    listingTitle({ institution, areaBlock, lease, accidentType, date });
  return {
    id: meta.id || listingId({ areaBlock, institution, date, lease }),
    title,
    date,
    lease,
    areaBlock,
    accidentType,
    institution,
    sourceUrl,
    pdfId: meta.pdfId || pdfIdFromUrl(sourceUrl),
    body,
  };
}

function emptySources(): BseeSnapshot["sources"] {
  return { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/sites/bsee.gov/files/` };
}

export function emptyBseeSnapshot(reason: string): BseeSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: [],
  };
}

export function assembleBseeSnapshot(cards: BseeCard[], fetchedAt?: string): BseeSnapshot {
  const kept = cards.filter((c) => isRealBseeBody(c.body));
  kept.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf =
    kept
      .map((c) => c.date)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: kept.length ? "ok" : "empty",
    reason: kept.length ? null : "Official BSEE District Accident Investigation Report PDFs had no extractable report text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): BseeSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as BseeSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleBseeSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readBseeSnapshot(): BseeSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeBseeSnapshot(snap: BseeSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchBseeText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchBseeBytes(url: string): Promise<Uint8Array> {
  const official = officialBseePdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("BSEE_REPORTS_PDFTOTEXT") || "pdftotext";
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

function listingDir(): string {
  return env("BSEE_REPORTS_HTML_DIR") || env("BSEE_REPORTS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("BSEE_REPORTS_LIMIT", "18"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 18;
}

function maxFetchLimit(): number {
  const n = Number(env("BSEE_REPORTS_MAX_FETCH", "20"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function prefer2026(listed: BseeListing[]): BseeListing[] {
  const y2026 = listed.filter((r) => (r.date ?? "").startsWith("2026"));
  const rest = listed.filter((r) => !(r.date ?? "").startsWith("2026"));
  return [...y2026, ...rest];
}

function mergeListings(listed: BseeListing[]): BseeListing[] {
  const seen = new Set<string>();
  const out: BseeListing[] = [];
  for (const row of [...SEED_LISTINGS, ...prefer2026(listed)]) {
    const id = row.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

export async function walkOfficialBsee(opts?: {
  fetchText?: (url: string) => Promise<string>;
}): Promise<{ listed: BseeListing[]; listedCount: number }> {
  const fetchText = opts?.fetchText ?? fetchBseeText;
  try {
    const listed = parseDistrictTable(await fetchText(LISTING_URL));
    return { listed: mergeListings(listed), listedCount: listed.length };
  } catch {
    return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
  }
}

async function loadOfficialListings(dir: string): Promise<{ listed: BseeListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = html ? parseDistrictTable(html) : [];
    return { listed: mergeListings(listed), listedCount: listed.length };
  }
  try {
    const walked = await walkOfficialBsee();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectBseeReports(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<BseeSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = bseeReportsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, BseeCard>();
  for (const card of readBseeSnapshot()?.cards ?? []) {
    if (isRealBseeBody(card.body)) prior.set(card.id, card);
  }
  const cards: BseeCard[] = [];
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
      const localText = readNamedFile(dir, [
        `${row.id}.txt`,
        `${row.id.toLowerCase()}.txt`,
        `${row.pdfId.replace(/\.pdf$/i, "")}.txt`,
      ]);
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id.replace(/[^\w.-]+/g, "_")}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchBseeBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseBseeText(text, row);
      if (!isRealBseeBody(parsed.body)) {
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
    ...assembleBseeSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeBseeSnapshot(snap);
  return snap;
}

export async function loadBseeReports(): Promise<BseeSnapshot> {
  const cached = readBseeSnapshot();
  if (cached && cached.cards.some((c) => isRealBseeBody(c.body))) return cached;
  try {
    return await collectBseeReports();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live BSEE district investigation fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyBseeSnapshot(
      `BSEE District Accident Investigation Report PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildBseeManifest(snap: BseeSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealBseeBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      BSEE_REPORTS_PATH,
      "Count + title / date / lease / area-block / accident-type + official PDF URL only. Report body is the paid GET /bsee-reports payload. This free manifest lists the full catalog. Skip BSEE Data Center INC Online Query, INC counts, eWell WAR, platform INC dumps, and CSB / PHMSA / FMSHRC / EPA CAFO / NTSB packs.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: BSEE_REPORTS_AMOUNT_ATOMIC,
    oneAmountAtomic: BSEE_REPORTS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      title: c.title,
      date: c.date,
      lease: c.lease,
      areaBlock: c.areaBlock,
      accidentType: c.accidentType,
      institution: c.institution,
      sourceUrl: c.sourceUrl,
    })),
    schema: {
      fields: ["id", "title", "date", "lease", "areaBlock", "accidentType", "institution", "sourceUrl"],
    },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterBseeManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "title", "date", "lease", "areaBlock", "accidentType", "institution", "sourceUrl"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadBseeManifest(q?: string): Promise<Record<string, unknown>> {
  return filterBseeManifest(buildBseeManifest(readBseeSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectBseeReports()
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
              date: c.date,
              lease: c.lease,
              areaBlock: c.areaBlock,
              accidentType: c.accidentType,
              institution: c.institution,
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
