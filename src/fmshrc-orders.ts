#!/usr/bin/env node
/**
 * FMSHRC ALJ + Commission Decision/Order TEXT door.
 * Official Decision and Order / Decision on Motion / Commission Decision /
 * Commission Order PDFs linked from the ALJ and Commission issuance boards.
 * HTML mirrors are the same body. 17 U.S.C. § 105.
 * Prefer Secretary of Labor v. [Operator] civil-penalty adjudications.
 * Do not sell miner discrimination / §105(c) complainant-named packs
 * (Secretary obo [person]), MSHA Open Government Violations/Assessed-Violations
 * rows, Blue Book TOC-only, or free MSHA metadata wraps.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const FMSHRC_ORDERS_PATH = "/fmshrc-orders";
export const FMSHRC_ORDERS_MANIFEST_PATH = "/fmshrc-orders/manifest.json";
export const FMSHRC_ORDERS_AMOUNT_ATOMIC = "50000";
export const FMSHRC_ORDERS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "fmshrc-order-bodies";
export const PRODUCT_NAME = "FMSHRC ALJ + Commission Decision/Order text";

export const ALJ_LISTING_URL = "https://www.fmshrc.gov/decisions/alj";
export const COMMISSION_LISTING_URL = "https://www.fmshrc.gov/decisions/commission";
export const PDF_ORIGIN = "https://www.fmshrc.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Federal Mine Safety and Health Review Commission. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const DOCKET_RE =
  /\b((?:CENT|WEST|SE|NE|LAKE|WEVA|PENN|KENT|YORK|VA|SOUTH)\s+\d{4}-\d{4}(?:-[A-Z]{1,3})?)\b/i;
export const PDF_PATH_RE = /^\/sites\/default\/files\/decisions\/(alj|commission)\/[^?#]+\.pdf$/i;
export const KIND_RE =
  /Decision and Order(?: on Remand)?|Decision on Motion|Commission Decision|Commission Order/i;
export const OBO_RE = /secretary(?:\s+of\s+labor)?\s+obo\b|\bobo\s+[A-Z][a-z]+/i;
export const DISCRIM_RE = /§\s*105\s*\(\s*c\s*\)|section\s+105\s*\(\s*c\s*\)|discrimination proceeding/i;
export const SECRETARY_V_RE = /^secretary(?:\s+of\s+labor)?\s+v\./i;

export const CARD_FIELDS = [
  "id",
  "docket",
  "board",
  "kind",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export const BODY_NEEDLE_SEED = "Order No. 9994013 alleges Big Spring violated";

export type FmshrcBoard = "alj" | "commission";
export type FmshrcKind =
  | "Decision and Order"
  | "Decision on Motion"
  | "Commission Decision"
  | "Commission Order";

export type FmshrcListing = {
  id: string;
  docket: string;
  board: FmshrcBoard;
  kind: FmshrcKind;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type FmshrcCard = FmshrcListing & { body: string };

export type FmshrcSnapshot = {
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
  sources: { alj: string; commission: string; pdfHost: string };
  cards: FmshrcCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (FMSHRC public decisions; +https://www.fmshrc.gov/decisions/alj)";
const OFFICIAL_HOSTS = new Set(["www.fmshrc.gov", "fmshrc.gov"]);

export const SEED_LISTINGS: FmshrcListing[] = [
  {
    id: "CENT-2025-0091",
    docket: "CENT-2025-0091",
    board: "alj",
    kind: "Decision and Order",
    institution: "Big Spring Sands LLC",
    date: "2026-07-02",
    title: "SECRETARY OF LABOR v. BIG SPRING SANDS LLC",
    sourceUrl:
      "https://www.fmshrc.gov/sites/default/files/decisions/alj/Big%20Spring%20Sands%20LLC%20CENT%202025-0091-Decision%20and%20Order.pdf",
    pdfId: "Big Spring Sands LLC CENT 2025-0091-Decision and Order.pdf",
  },
  {
    id: "CENT-2025-0167",
    docket: "CENT-2025-0167",
    board: "alj",
    kind: "Decision on Motion",
    institution: "Doe Run Co.",
    date: "2026-03-02",
    title: "Secretary of Labor v. Doe Run Co.",
    sourceUrl: "https://www.fmshrc.gov/sites/default/files/decisions/alj/ALJd_3022026-CENT-2025-0167.pdf",
    pdfId: "ALJd_3022026-CENT-2025-0167.pdf",
  },
  {
    id: "WEST-2021-0229",
    docket: "WEST-2021-0229",
    board: "alj",
    kind: "Decision and Order",
    institution: "Canyon Fuel Company, LLC",
    date: "2026-07-23",
    title: "SECRETARY OF LABOR v. CANYON FUEL COMPANY, LLC",
    sourceUrl:
      "https://www.fmshrc.gov/sites/default/files/decisions/alj/WEST%202021-0229%20et%20al%20-%20Decision%20and%20Order%20on%20Remand.pdf",
    pdfId: "WEST 2021-0229 et al - Decision and Order on Remand.pdf",
  },
  {
    id: "CENT-2025-0051",
    docket: "CENT-2025-0051",
    board: "commission",
    kind: "Commission Order",
    institution: "Trap Rock and Granite Quarries, LLC",
    date: "2026-03-09",
    title: "Secretary of Labor v. Trap Rock and Granite Quarries, LLC",
    sourceUrl:
      "https://www.fmshrc.gov/sites/default/files/decisions/commission/COMMo_3092026-CENT%202025-0051.pdf",
    pdfId: "COMMo_3092026-CENT 2025-0051.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function fmshrcOrdersDir(): string {
  if (env("FMSHRC_ORDERS_DIR")) return resolve(env("FMSHRC_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/fmshrc-orders"));
}

export function snapshotPath(): string {
  return join(fmshrcOrdersDir(), "snapshot.json");
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

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const hit = raw.match(DOCKET_RE);
  if (!hit) return null;
  return hit[1].toUpperCase().replace(/\s+/g, "-");
}

export function parseKind(raw: string, board: FmshrcBoard): FmshrcKind | null {
  if (/Decision on Motion/i.test(raw)) return "Decision on Motion";
  if (/Commission Decision/i.test(raw) || /COMMd[_-]/i.test(raw)) return "Commission Decision";
  if (/Commission Order/i.test(raw) || /COMMo[_-]/i.test(raw) || (board === "commission" && /\bORDER\b/.test(raw))) {
    return "Commission Order";
  }
  if (/Decision and Order/i.test(raw) || /Decision on Remand/i.test(raw) || /ALJd[_-]/i.test(raw)) {
    return "Decision and Order";
  }
  if (board === "alj" && (/\bDECISION\b/i.test(raw) || /ALJo[_-]/i.test(raw))) return "Decision and Order";
  // Official board PDF with no prose kind in the filename (ALJd_ / COMMo_ style).
  if (board === "alj") return "Decision and Order";
  if (board === "commission") return "Commission Order";
  return null;
}

export function officialFmshrcPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim().replace(/&amp;/g, "&"), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (!PDF_PATH_RE.test(path)) return null;
    return `https://www.fmshrc.gov${parsed.pathname}`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string {
  const official = officialFmshrcPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    return decodeURIComponent(parsed.pathname.split("/").pop() || official);
  } catch {
    return official;
  }
}

export function operatorFromCaption(title: string): string {
  const cleaned = title.replace(/\s+/g, " ").trim();
  const vs = cleaned.split(/\s+v\.?\s+/i);
  if (vs.length >= 2) return vs.slice(1).join(" v. ").replace(/\s+et al\.?$/i, "").trim();
  return cleaned;
}

export function isDiscriminationPack(text: string): boolean {
  const compact = text.replace(/\s+/g, " ");
  if (OBO_RE.test(compact)) return true;
  if (DISCRIM_RE.test(compact) && /complainant/i.test(compact)) return true;
  if (/-DM\b/.test(compact) && !SECRETARY_V_RE.test(compact.trim())) return true;
  const caption = compact.trim();
  if (/^[A-Z][A-Za-z. '-]+ v\. /i.test(caption) && !SECRETARY_V_RE.test(caption) && !/secretary of labor/i.test(caption.slice(0, 80))) {
    return true;
  }
  return false;
}

export function isMshaViolationsDump(text: string): boolean {
  return /EVENT_NO,MINE_ID,VIOLATION_NO|Assessed[- ]Violations|MSHA Open Government/i.test(text);
}

export function isBlueBookToc(text: string): boolean {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!/BLUE BOOK/i.test(compact) || !/TABLE OF CONTENTS/i.test(compact)) return false;
  // Real Decision/Order PDFs can mention the Blue Book. TOC-only packs have no findings.
  return !(
    /CIVIL PENALTY PROCEEDING/i.test(compact) &&
    DOCKET_RE.test(compact) &&
    compact.length >= 1500
  );
}

export function isMshaMetadataWrap(text: string): boolean {
  const compact = text.trim();
  if (!(compact.startsWith("{") || compact.startsWith("["))) return false;
  return /"AssessedViolations"|"MSHAOpenGov"|"EVENT_NO"/i.test(compact);
}

export function isRealFmshrcBody(text: string): boolean {
  if (isMshaViolationsDump(text) || isBlueBookToc(text) || isMshaMetadataWrap(text)) return false;
  if (isDiscriminationPack(text) && !/CIVIL PENALTY PROCEEDING/i.test(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 1500) return false;
  const fmshrc = /FEDERAL MINE SAFETY AND HEALTH REVIEW COMMISSION/i.test(text);
  const kind =
    KIND_RE.test(text) ||
    (/\bORDER\b/.test(text) && /Commissioners/i.test(text)) ||
    /CIVIL PENALTY PROCEEDING/i.test(text);
  const docket = DOCKET_RE.test(text);
  return fmshrc && kind && docket;
}

export function isSellableListing(row: {
  title: string;
  docket: string;
  kind: FmshrcKind | null;
  sourceUrl: string | null;
}): boolean {
  if (!row.sourceUrl || !row.docket || !row.kind) return false;
  if (OBO_RE.test(row.title)) return false;
  if (/-DM$/.test(row.docket)) return false;
  if (isDiscriminationPack(row.title)) return false;
  if (!SECRETARY_V_RE.test(row.title.trim()) && !/secretary of labor\s+v\./i.test(row.title)) {
    return false;
  }
  return true;
}

export function parseBoardHtml(html: string, board: FmshrcBoard): FmshrcListing[] {
  const out: FmshrcListing[] = [];
  const seen = new Set<string>();
  const chunks = html.split(/<div class="whole-review">/i).slice(1);
  for (const chunk of chunks) {
    const title = stripTags((chunk.match(/class="review-title"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) || [])[1] || "");
    const date = isoDate(stripTags((chunk.match(/class="review-date"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || ""));
    const docks = [...chunk.matchAll(/class="dock-num"[^>]*>([\s\S]*?)<\/li>/gi)].map((m) =>
      normalizeDocket(stripTags(m[1])),
    );
    const docket = docks.find((d): d is string => Boolean(d)) || normalizeDocket(title);
    const pdfHref = (chunk.match(/href="([^"]+\.pdf[^"]*)"/i) || [])[1] || "";
    const sourceUrl = officialFmshrcPdfUrl(pdfHref);
    const fileLabel = stripTags((chunk.match(/href="[^"]+\.pdf[^"]*"[^>]*>([\s\S]*?)<\/a>/i) || [])[1] || "");
    const kind = parseKind(`${title} ${fileLabel} ${pdfHref}`, board);
    if (!title || !docket) continue;
    const row = {
      title,
      docket,
      kind,
      sourceUrl,
    };
    if (!isSellableListing(row) || !sourceUrl || !kind) continue;
    const id = docket;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      docket,
      board,
      kind,
      institution: operatorFromCaption(title),
      date,
      title,
      sourceUrl,
      pdfId: pdfIdFromUrl(sourceUrl),
    });
  }
  return out;
}

export function parseFmshrcText(
  text: string,
  meta: Partial<FmshrcListing> & { sourceUrl: string },
): FmshrcCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFmshrcPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const board: FmshrcBoard =
    meta.board || (sourceUrl.includes("/decisions/commission/") ? "commission" : "alj");
  const docket = normalizeDocket(meta.docket) || normalizeDocket(body) || meta.pdfId || "unknown";
  const title = meta.title || "SECRETARY OF LABOR v. operator";
  return {
    id: normalizeDocket(meta.id) || docket,
    docket,
    board,
    kind: meta.kind || parseKind(`${title} ${body.slice(0, 2500)}`, board) || "Decision and Order",
    institution: (meta.institution && meta.institution.trim()) || operatorFromCaption(title),
    date: meta.date ?? isoDate(body.slice(0, 4000)),
    title,
    sourceUrl,
    pdfId: meta.pdfId || pdfIdFromUrl(sourceUrl),
    body,
  };
}

function emptySources(): FmshrcSnapshot["sources"] {
  return { alj: ALJ_LISTING_URL, commission: COMMISSION_LISTING_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/decisions/` };
}

export function emptyFmshrcSnapshot(reason: string): FmshrcSnapshot {
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

export function assembleFmshrcSnapshot(cards: FmshrcCard[], fetchedAt?: string): FmshrcSnapshot {
  const kept = cards.filter((c) => isRealFmshrcBody(c.body) && !isDiscriminationPack(`${c.title} ${c.docket}`));
  kept.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
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
    reason: kept.length ? null : "Official FMSHRC Decision/Order PDFs had no extractable decision text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): FmshrcSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FmshrcSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleFmshrcSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readFmshrcSnapshot(): FmshrcSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeFmshrcSnapshot(snap: FmshrcSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchFmshrcText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" } });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchFmshrcBytes(url: string): Promise<Uint8Array> {
  const official = officialFmshrcPdfUrl(url) || url;
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FMSHRC_ORDERS_PDFTOTEXT") || "pdftotext";
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
  return env("FMSHRC_ORDERS_HTML_DIR") || env("FMSHRC_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("FMSHRC_ORDERS_LIMIT", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxFetchLimit(): number {
  const n = Number(env("FMSHRC_ORDERS_MAX_FETCH", "12"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 12;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: FmshrcListing[]): FmshrcListing[] {
  const seen = new Set<string>();
  const out: FmshrcListing[] = [];
  for (const row of [...SEED_LISTINGS, ...listed]) {
    const id = normalizeDocket(row.id) || row.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ ...row, id, docket: normalizeDocket(row.docket) || id });
  }
  return out;
}

export async function walkOfficialFmshrc(opts?: {
  fetchText?: (url: string) => Promise<string>;
}): Promise<{ listed: FmshrcListing[]; listedCount: number }> {
  const fetchText = opts?.fetchText ?? fetchFmshrcText;
  const listed: FmshrcListing[] = [];
  let listedCount = 0;
  for (const [url, board] of [
    [ALJ_LISTING_URL, "alj"],
    [COMMISSION_LISTING_URL, "commission"],
  ] as const) {
    try {
      const rows = parseBoardHtml(await fetchText(url), board);
      listedCount += rows.length;
      listed.push(...rows);
    } catch {
      /* keep seeds */
    }
  }
  return { listed: mergeListings(listed), listedCount: Math.max(listedCount, listed.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: FmshrcListing[]; listedCount: number }> {
  if (dir) {
    const alj = readNamedFile(dir, ["alj-listing.html", "listing.html"]);
    const comm = readNamedFile(dir, ["commission-listing.html"]);
    const listed = [
      ...(alj ? parseBoardHtml(alj, "alj") : []),
      ...(comm ? parseBoardHtml(comm, "commission") : []),
    ];
    return { listed: mergeListings(listed), listedCount: listed.length };
  }
  try {
    const walked = await walkOfficialFmshrc();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

export async function collectFmshrcOrders(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FmshrcSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = fmshrcOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, FmshrcCard>();
  for (const card of readFmshrcSnapshot()?.cards ?? []) {
    if (isRealFmshrcBody(card.body)) prior.set(card.id, card);
  }
  const cards: FmshrcCard[] = [];
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
        `${row.id.toLowerCase()}.txt`,
        `${row.docket.toLowerCase()}.txt`,
        `${row.pdfId.replace(/\.pdf$/i, "")}.txt`,
      ]);
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.docket.replace(/[^\w.-]+/g, "_")}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchFmshrcBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseFmshrcText(text, row);
      if (!isRealFmshrcBody(parsed.body) || isDiscriminationPack(`${parsed.title} ${parsed.docket}`)) {
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
    ...assembleFmshrcSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeFmshrcSnapshot(snap);
  return snap;
}

export async function loadFmshrcOrders(): Promise<FmshrcSnapshot> {
  const cached = readFmshrcSnapshot();
  if (cached && cached.cards.some((c) => isRealFmshrcBody(c.body))) return cached;
  try {
    return await collectFmshrcOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live FMSHRC Decision/Order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyFmshrcSnapshot(
      `FMSHRC Decision/Order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFmshrcManifest(snap: FmshrcSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFmshrcBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      FMSHRC_ORDERS_PATH,
      "Count + operator + docket + date + official PDF URL only. Decision body is the paid GET /fmshrc-orders payload. This free manifest lists the full catalog. Skip miner discrimination / §105(c) complainant packs, MSHA Open Government violation rows, Blue Book TOC, and free MSHA metadata wraps.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: FMSHRC_ORDERS_AMOUNT_ATOMIC,
    oneAmountAtomic: FMSHRC_ORDERS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      docket: c.docket,
      board: c.board,
      kind: c.kind,
      date: c.date,
      title: c.title,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "docket", "board", "kind", "date", "title", "sourceUrl"] },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterFmshrcManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "docket", "board", "kind", "date", "title", "sourceUrl"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadFmshrcManifest(q?: string): Promise<Record<string, unknown>> {
  return filterFmshrcManifest(buildFmshrcManifest(readFmshrcSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFmshrcOrders()
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
              docket: c.docket,
              institution: c.institution,
              board: c.board,
              kind: c.kind,
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
