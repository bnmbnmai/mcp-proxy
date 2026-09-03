#!/usr/bin/env node
/**
 * HHS OIG–authored full Audit (OAS / A-*) and Evaluation / Inspection (OEI-*)
 * report PDFs under oig.hhs.gov/documents/audit/ and
 * oig.hhs.gov/documents/evaluation/. 17 U.S.C. § 105. Ugly PDF cache.
 * Paid GET is the official full report PDF. Free manifest is titles/links/counts.
 * Skip *-highlights.pdf, SAR/TMC/budget HTML, recommendations HTML index.
 * Kill HHS OIG LEIE UPDATED.csv (people-as-product). Habit: 2026 report index.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HHS_OIG_REPORTS_PATH = "/hhs-oig-reports";
export const HHS_OIG_REPORTS_MANIFEST_PATH = "/hhs-oig-reports/manifest.json";
export const HHS_OIG_REPORTS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "hhs-oig-audit-evaluation-report-pdfs";
export const PRODUCT_NAME = "HHS OIG audit and evaluation report PDFs";

export const INDEX_URL = "https://oig.hhs.gov/reports/all/?fy=2026";
export const AUDIT_HOST = "https://oig.hhs.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "U.S. Department of Health and Human Services Office of Inspector General";

export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const CARD_FIELDS = ["id", "reportNumber", "kind", "date", "title", "pageUrl", "sourceUrl", "bytes", "sha256"] as const;

export const REPORT_NUMBER_RE = /^(OAS|A|OEI)-\d{2}-\d{2}-\d{3,5}$/i;
export const KEEP_KINDS = new Set(["audit", "evaluation", "inspection"]);

export type HhsOigKind = "audit" | "evaluation";

export type HhsOigListing = {
  id: string;
  reportNumber: string;
  kind: HhsOigKind;
  date: string | null;
  title: string;
  pageUrl: string;
  sourceUrl: string;
};

export type HhsOigCard = HhsOigListing & {
  bytes: number;
  sha256: string;
  pdfFile: string;
};

export type HhsOigReportsSnapshot = {
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
  skipped?: number;
  reused?: number;
  addedThisRun?: number;
  sources: { index: string; auditHost: string; evaluationHost: string };
  cards: HhsOigCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (HHS OIG audit and evaluation reports; +https://oig.hhs.gov/reports/)";
const OFFICIAL_HOSTS = new Set(["oig.hhs.gov", "www.oig.hhs.gov"]);
const PAGE_PATH_RE = /^\/reports\/all\/20\d{2}\/[a-z0-9][a-z0-9-]{6,220}\/?$/i;
const PDF_PATH_RE = /^\/documents\/(audit|evaluation)\/(\d+)\/([^/?#]+\.pdf)$/i;
const HIGHLIGHTS_RE = /highlights/i;
const SKIP_PAGE_RE =
  /\/(reports\/sar|reports\/tmcs|reports\/recommendations|about-oig\/oig-budget|reports-and-publications\/budget|exclusions)\b/i;
const LEIE_RE = /UPDATED\.csv|\/exclusions\/downloadables\/|leie/i;
const PEOPLE_RE = /\b(curriculum vitae|date of birth|home address|passport number)\b/i;
const INFO_PDF_RE = /\/documents\/reports\//i;

export const SEED_LISTINGS: HhsOigListing[] = [
  {
    id: "oas-24-02-004",
    reportNumber: "OAS-24-02-004",
    kind: "audit",
    date: "2026-08-31",
    title:
      "CMS Oversight Did Not Prevent Medicare Part D Sponsors From Making $587.7 Million in Ineligible Payments to Pharmacies for Drugs Available Over the Counter but Labeled as Prescription-Only",
    pageUrl:
      "https://oig.hhs.gov/reports/all/2026/cms-oversight-did-not-prevent-medicare-part-d-sponsors-from-making-5877-million-in-ineligible-payments-to-pharmacies-for-drugs-available-over-the-counter-but-labeled-as-prescription-only/",
    sourceUrl: "https://oig.hhs.gov/documents/audit/11864/OAS-24-02-004.pdf",
  },
  {
    id: "oas-24-09-002",
    reportNumber: "OAS-24-09-002",
    kind: "audit",
    date: "2026-08-20",
    title:
      "Arizona Did Not Ensure That Selected Medicaid Managed Care Organizations Complied With Mental Health and Substance Use Disorder Parity Requirements Related to Prior Authorization",
    pageUrl:
      "https://oig.hhs.gov/reports/all/2026/arizona-did-not-ensure-that-selected-medicaid-managed-care-organizations-complied-with-mental-health-and-substance-use-disorder-parity-requirements-related-to-prior-authorization/",
    sourceUrl: "https://oig.hhs.gov/documents/audit/11861/OAS-24-09-002.pdf",
  },
  {
    id: "oei-06-25-00150",
    reportNumber: "OEI-06-25-00150",
    kind: "evaluation",
    date: "2026-06-30",
    title: "Florida Medicaid Fraud Control Unit: 2025 Inspection",
    pageUrl: "https://oig.hhs.gov/reports/all/2026/florida-medicaid-fraud-control-unit-2025-inspection/",
    sourceUrl: "https://oig.hhs.gov/documents/evaluation/11725/OEI-06-25-00150.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function hhsOigReportsDir(): string {
  if (env("HHS_OIG_REPORTS_DIR")) return resolve(env("HHS_OIG_REPORTS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/hhs-oig-reports"));
}

export function snapshotPath(): string {
  return join(hhsOigReportsDir(), "snapshot.json");
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const mdy = String(raw).match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!mdy) return null;
  const day = `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  const y = Number(mdy[3]);
  return y >= 1990 && y <= 2100 ? day : null;
}

export function normalizeReportNumber(raw: string | null | undefined): string | null {
  const text = String(raw || "").trim().toUpperCase();
  const match = text.match(/\b((?:OAS|A|OEI)-\d{2}-\d{2}-\d{3,5})\b/i);
  if (!match) return null;
  const num = match[1].toUpperCase();
  return REPORT_NUMBER_RE.test(num) ? num : null;
}

export function idFromReportNumber(reportNumber: string): string {
  return reportNumber.toLowerCase();
}

export function kindFromLabel(raw: string | null | undefined, reportNumber?: string | null): HhsOigKind | null {
  const label = String(raw || "").trim().toLowerCase();
  if (label === "sar" || label === "tmc" || label === "budget") return null;
  if (label === "audit") return "audit";
  if (label === "evaluation" || label === "inspection") return "evaluation";
  const num = (reportNumber || "").toUpperCase();
  if (num.startsWith("OAS-") || num.startsWith("A-")) return "audit";
  if (num.startsWith("OEI-")) return "evaluation";
  return null;
}

function decodePdfName(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

export function isSkippedHhsOigPdfName(name: string): boolean {
  const n = decodePdfName(name);
  if (HIGHLIGHTS_RE.test(n)) return true;
  if (/\.(png|jpe?g|gif|svg|csv|html?)$/i.test(n)) return true;
  if (/^UPDATED\.csv$/i.test(n)) return true;
  return false;
}

export function isKeptHhsOigPdfName(name: string): boolean {
  const n = decodePdfName(name);
  if (isSkippedHhsOigPdfName(n)) return false;
  const stem = n.replace(/\.pdf$/i, "");
  return Boolean(normalizeReportNumber(stem));
}

export function officialHhsOigPageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw.trim(), AUDIT_HOST);
    if (!OFFICIAL_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    if (SKIP_PAGE_RE.test(parsed.pathname) || LEIE_RE.test(parsed.href) || PEOPLE_RE.test(parsed.pathname)) {
      return null;
    }
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    if (!PAGE_PATH_RE.test(`${path}/`) && !PAGE_PATH_RE.test(path)) return null;
    return `${AUDIT_HOST}${path}/`;
  } catch {
    return null;
  }
}

export function officialHhsOigPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), AUDIT_HOST);
    if (!OFFICIAL_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    if (LEIE_RE.test(parsed.href) || INFO_PDF_RE.test(parsed.pathname) || SKIP_PAGE_RE.test(parsed.pathname)) {
      return null;
    }
    const asset = parsed.pathname.match(PDF_PATH_RE);
    if (!asset) return null;
    const file = decodePdfName(asset[3]);
    if (!isKeptHhsOigPdfName(file)) return null;
    return `${AUDIT_HOST}/documents/${asset[1]}/${asset[2]}/${file}`;
  } catch {
    return null;
  }
}

export function isOfficialHhsOigPdf(url: string | null | undefined): boolean {
  return Boolean(officialHhsOigPdfUrl(url));
}

export function parseListingRows(rows: HhsOigListing[]): HhsOigListing[] {
  const found: HhsOigListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (PEOPLE_RE.test(`${row.title} ${row.id} ${row.reportNumber}`)) continue;
    if (LEIE_RE.test(`${row.title} ${row.pageUrl} ${row.sourceUrl}`)) continue;
    const reportNumber = normalizeReportNumber(row.reportNumber || row.id);
    const kind = kindFromLabel(row.kind, reportNumber);
    const sourceUrl = officialHhsOigPdfUrl(row.sourceUrl);
    const pageUrl = officialHhsOigPageUrl(row.pageUrl);
    const id = (row.id || (reportNumber ? idFromReportNumber(reportNumber) : "")).replace(/-+$/g, "").trim();
    if (!reportNumber || !kind || !sourceUrl || !pageUrl || !id || seen.has(id)) continue;
    if (!KEEP_KINDS.has(kind) && kind !== "audit" && kind !== "evaluation") continue;
    seen.add(id);
    found.push({
      id,
      reportNumber,
      kind,
      date: isoDate(row.date),
      title: (row.title || "").trim() || reportNumber,
      pageUrl,
      sourceUrl,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return found;
}

export function extractHrefCandidates(html: string): string[] {
  return Array.from(String(html || "").matchAll(/(?:href|src)=["']?([^"'\s>]+)/gi), (m) => m[1]);
}

function decodeHtml(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8250;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseReportsIndex(html: string): HhsOigListing[] {
  const rows: HhsOigListing[] = [];
  const seen = new Set<string>();
  const source = String(html || "");
  const cards = source.split(/<li class="usa-card[^"]*"/i).slice(1);
  for (const card of cards) {
    const href = (card.match(/href=["']?(\/reports\/all\/20\d{2}\/[^"'>\s]+)/i) || [])[1] || "";
    const pageUrl = officialHhsOigPageUrl(href);
    const title = decodeHtml((card.match(/<a[^>]*>([\s\S]*?)<\/a>/i) || [])[1] || "");
    const terms = Array.from(
      card.matchAll(/<dt class="pep-metadata__term">([^<]+)<\/dt>\s*<dd class="pep-metadata__def[^"]*">([^<]+)<\/dd>/gi),
    ).map((m) => [decodeHtml(m[1]), decodeHtml(m[2])] as const);
    const typeLabel = terms.find(([k]) => /^(Audit|Evaluation|Inspection|SAR|TMC)$/i.test(k))?.[0] || "";
    const reportNumber = normalizeReportNumber(
      terms.find(([k]) => /^(Audit|Evaluation|Inspection)$/i.test(k))?.[1] || "",
    );
    const date = isoDate(terms.find(([k]) => /^Issued$/i.test(k))?.[1] || "");
    const kind = kindFromLabel(typeLabel, reportNumber);
    if (!pageUrl || !reportNumber || !kind) continue;
    const id = idFromReportNumber(reportNumber);
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({
      id,
      reportNumber,
      kind,
      date,
      title: title || reportNumber,
      pageUrl,
      sourceUrl: "",
    });
  }
  return rows;
}

export function parseReportCardPage(
  html: string,
  pageUrl: string,
  prior?: Partial<HhsOigListing>,
): HhsOigListing | null {
  const officialPage = officialHhsOigPageUrl(pageUrl);
  if (!officialPage) return null;
  const reportNumber =
    normalizeReportNumber(prior?.reportNumber) ||
    normalizeReportNumber((html.match(/Report number:\s*([A-Z0-9-]+)/i) || [])[1] || "") ||
    normalizeReportNumber((html.match(/\b((?:OAS|A|OEI)-\d{2}-\d{2}-\d{3,5})\b/i) || [])[1] || "");
  const kind =
    kindFromLabel(prior?.kind, reportNumber) ||
    kindFromLabel((html.match(/<dt class="pep-metadata__term">([^<]+)<\/dt>/i) || [])[1] || "", reportNumber);
  if (!reportNumber || !kind) return null;
  let sourceUrl = officialHhsOigPdfUrl(prior?.sourceUrl);
  if (!sourceUrl) {
    for (const href of extractHrefCandidates(html)) {
      const pdf = officialHhsOigPdfUrl(href);
      if (pdf) {
        sourceUrl = pdf;
        break;
      }
    }
  }
  if (!sourceUrl) return null;
  const date =
    isoDate(prior?.date) ||
    isoDate((html.match(/datetime="(\d{4}-\d{2}-\d{2})/i) || [])[1] || "") ||
    isoDate((html.match(/Issued on[^<]*>([^<]+)/i) || [])[1] || "");
  const title =
    (prior?.title || "").trim() ||
    decodeHtml((html.match(/<h1[^>]*>\s*([^<]+)/i) || [])[1] || "") ||
    decodeHtml((html.match(/<title>([^<]+)<\/title>/i) || [])[1] || "").replace(/\s+\|\s+Office of Inspector General.*$/i, "") ||
    reportNumber;
  return {
    id: prior?.id || idFromReportNumber(reportNumber),
    reportNumber,
    kind,
    date,
    title,
    pageUrl: officialPage,
    sourceUrl,
  };
}

export function isChromeReportCardHtml(html: string): boolean {
  const t = String(html || "");
  if (t.length < 200) return false;
  const hasChrome = /Report Materials|Office of Inspector General|pep-metadata/i.test(t);
  const hasPdfBytes = t.startsWith("%PDF-");
  return hasChrome && !hasPdfBytes;
}

export function isPdfBytes(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
}

export function emptyHhsOigReportsSnapshot(reason: string): HhsOigReportsSnapshot {
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
      index: INDEX_URL,
      auditHost: `${AUDIT_HOST}/documents/audit/`,
      evaluationHost: `${AUDIT_HOST}/documents/evaluation/`,
    },
    cards: [],
  };
}

export function assembleHhsOigReportsSnapshot(
  cards: HhsOigCard[],
  fetchedAt = new Date().toISOString(),
): HhsOigReportsSnapshot {
  const kept = cards
    .filter((c) => officialHhsOigPdfUrl(c.sourceUrl) && c.bytes > 0 && c.sha256)
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = kept.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: kept.length > 0 ? "ok" : "empty",
    reason: kept.length > 0 ? null : "Official HHS OIG audit and evaluation report PDFs were not cached.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      index: INDEX_URL,
      auditHost: `${AUDIT_HOST}/documents/audit/`,
      evaluationHost: `${AUDIT_HOST}/documents/evaluation/`,
    },
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): HhsOigReportsSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as HhsOigReportsSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readHhsOigReportsSnapshot(): HhsOigReportsSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeHhsOigReportsSnapshot(snap: HhsOigReportsSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(snap, null, 2)}\n`);
}

export function pdfPathForCard(card: Pick<HhsOigCard, "id" | "pdfFile">): string {
  if (card.pdfFile && existsSync(card.pdfFile)) return card.pdfFile;
  return join(hhsOigReportsDir(), `${card.id}.pdf`);
}

export function readCachedPdf(card: Pick<HhsOigCard, "id" | "pdfFile">): Uint8Array | null {
  const path = pdfPathForCard(card);
  if (!existsSync(path)) return null;
  const bytes = new Uint8Array(readFileSync(path));
  return isPdfBytes(bytes) ? bytes : null;
}

export async function fetchHhsOigBytes(url: string): Promise<Uint8Array> {
  const official = officialHhsOigPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,*/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!isPdfBytes(bytes)) throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export async function fetchHhsOigText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,*/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function listingDir(): string {
  return env("HHS_OIG_REPORTS_HTML_DIR") || env("HHS_OIG_REPORTS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("HHS_OIG_REPORTS_LIMIT", "10"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}

function maxFetchLimit(): number {
  const n = Number(env("HHS_OIG_REPORTS_MAX_FETCH", "10"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}

function maxIndexPages(): number {
  const n = Number(env("HHS_OIG_REPORTS_INDEX_PAGES", "8"));
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

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadOfficialListings(dir: string): Promise<{ listed: HhsOigListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["reports-2026.html", "index.html", "listing.html"]);
    const fromIndex = html ? parseReportsIndex(html) : [];
    const enriched: HhsOigListing[] = [];
    for (const row of [...fromIndex, ...SEED_LISTINGS]) {
      const pageHtml = readNamedFile(dir, [`${row.id}.html`, `${row.id}.htm`]);
      if (pageHtml) {
        const parsed = parseReportCardPage(pageHtml, row.pageUrl, row);
        if (parsed) enriched.push(parsed);
      } else if (officialHhsOigPdfUrl(row.sourceUrl)) {
        enriched.push(row);
      }
    }
    const listed = parseListingRows(enriched);
    return { listed, listedCount: listed.length };
  }
  try {
    const pages: HhsOigListing[] = [];
    for (let page = 1; page <= maxIndexPages(); page += 1) {
      const url = page === 1 ? INDEX_URL : `https://oig.hhs.gov/reports/all/?fy=2026&page=${page}`;
      const html = await fetchHhsOigText(url);
      const rows = parseReportsIndex(html);
      if (!rows.length) break;
      pages.push(...rows);
    }
    const listed = parseListingRows([...pages, ...SEED_LISTINGS]);
    if (listed.length > 0) return { listed, listedCount: listed.length };
  } catch {
    /* keep seeds */
  }
  return { listed: parseListingRows(SEED_LISTINGS), listedCount: SEED_LISTINGS.length };
}

export async function collectHhsOigReports(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<HhsOigReportsSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 300);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = hhsOigReportsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, HhsOigCard>();
  for (const card of readHhsOigReportsSnapshot()?.cards ?? []) {
    if (readCachedPdf(card)) prior.set(card.id, card);
  }
  const cards: HhsOigCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skipped = 0;
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
    if (!dir && pauseMs) await pause(pauseMs);
    try {
      let listing = row;
      if (!officialHhsOigPdfUrl(listing.sourceUrl)) {
        const pageHtml = dir ? readNamedFile(dir, [`${row.id}.html`]) : await fetchHhsOigText(row.pageUrl);
        if (!pageHtml) {
          skipped += 1;
          continue;
        }
        const parsed = parseReportCardPage(pageHtml, row.pageUrl, row);
        if (!parsed) {
          skipped += 1;
          continue;
        }
        listing = parsed;
      }
      const sourceUrl = officialHhsOigPdfUrl(listing.sourceUrl);
      if (!sourceUrl) {
        skipped += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${listing.id}.pdf`);
      const localPdf = existsSync(pdfFile) ? new Uint8Array(readFileSync(pdfFile)) : null;
      const fixturePdf = dir ? join(dir, `${listing.id}.pdf`) : "";
      let bytes: Uint8Array | null = localPdf && isPdfBytes(localPdf) ? localPdf : null;
      if (!bytes && fixturePdf && existsSync(fixturePdf)) {
        const fx = new Uint8Array(readFileSync(fixturePdf));
        if (isPdfBytes(fx)) bytes = fx;
      }
      if (!bytes) {
        if (dir) {
          skipped += 1;
          continue;
        }
        bytes = await fetchHhsOigBytes(sourceUrl);
        fetchedPdfs += 1;
      }
      const pdfBytes = bytes;
      writeFileSync(pdfFile, pdfBytes);
      const sha256 = createHash("sha256").update(pdfBytes).digest("hex");
      cards.push({
        ...listing,
        sourceUrl,
        bytes: pdfBytes.byteLength,
        sha256,
        pdfFile,
      });
      seen.add(listing.id);
      addedThisRun += 1;
    } catch {
      skipped += 1;
    }
  }
  for (const [id, card] of prior) {
    if (!seen.has(id)) cards.push(card);
  }
  const snap = {
    ...assembleHhsOigReportsSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skipped,
    reused,
    addedThisRun,
  };
  writeHhsOigReportsSnapshot(snap);
  return snap;
}

export async function loadHhsOigReports(): Promise<HhsOigReportsSnapshot> {
  const cached = readHhsOigReportsSnapshot();
  if (cached) {
    const filtered = assembleHhsOigReportsSnapshot(cached.cards, cached.fetchedAt);
    if (filtered.cards.length) return { ...cached, ...filtered };
  }
  try {
    return await collectHhsOigReports();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.length ? "stale" : "empty",
        reason: `Live HHS OIG report fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyHhsOigReportsSnapshot(
      `HHS OIG audit and evaluation report PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildHhsOigReportsManifest(snap: HhsOigReportsSnapshot | null): Record<string, unknown> {
  const cards = snap?.cards ?? [];
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Free index for /hhs-oig-reports. Count + report number + date + official OIG page + PDF URL only. Paid GET /hhs-oig-reports is the official full Audit / Evaluation report PDF. License 17 USC 105.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: HHS_OIG_REPORTS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      reportNumber: c.reportNumber,
      kind: c.kind,
      date: c.date,
      title: c.title,
      pageUrl: c.pageUrl,
      sourceUrl: c.sourceUrl,
      bytes: c.bytes,
    })),
    schema: { fields: ["id", "reportNumber", "kind", "date", "title", "pageUrl", "sourceUrl", "bytes"] },
    sources: snap?.sources ?? {
      index: INDEX_URL,
      auditHost: `${AUDIT_HOST}/documents/audit/`,
      evaluationHost: `${AUDIT_HOST}/documents/evaluation/`,
    },
  };
}

export function filterHhsOigReportsManifest(
  manifest: Record<string, unknown>,
  q?: string,
): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "reportNumber", "kind", "date", "title", "pageUrl", "sourceUrl"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadHhsOigReportsManifest(q?: string): Promise<Record<string, unknown>> {
  return filterHhsOigReportsManifest(buildHhsOigReportsManifest(readHhsOigReportsSnapshot()), q);
}

export function selectHhsOigReportCard(
  snap: HhsOigReportsSnapshot | null,
  opts?: { id?: string; before?: string },
): HhsOigCard | null {
  const all = snap?.cards ?? [];
  const one = opts?.id?.trim();
  if (one) {
    const needle = one.toLowerCase();
    return all.find((c) => c.id === needle || c.reportNumber.toLowerCase() === needle) ?? null;
  }
  if (opts?.before?.trim()) {
    const before = opts.before.trim().toLowerCase();
    const idx = all.findIndex((c) => c.id === before || c.reportNumber.toLowerCase() === before || c.date === opts.before);
    return idx >= 0 ? all[idx + 1] ?? null : null;
  }
  return all[0] ?? null;
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectHhsOigReports()
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
            skipped: snap.skipped ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              reportNumber: c.reportNumber,
              kind: c.kind,
              date: c.date,
              bytes: c.bytes,
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
