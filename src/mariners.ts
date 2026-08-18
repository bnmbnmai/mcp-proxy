/**
 * USCG District 13 / Northwest Local Notice to Mariners — official weekly PDF only.
 * Does not invent notices. Does not wrap CBP AD/CVD or other districts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const MARINERS_PATH = "/mariners";
export const MARINERS_MANIFEST_PATH = "/mariners/manifest.json";
export const MARINERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "uscg-d13-lnm";
export const PRODUCT_NAME = "USCG D13 / Northwest LNM";

export const LNM_LISTING_URL =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=13+0&subdistrict=n";
export const LNM_PDF_BASE = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/";
export const LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13{WW}{YYYY}.pdf";
export const DISTRICT = "13";
export const DISTRICT_NAME = "Northwest";

export const NOTICE_FIELDS = ["week", "section", "text", "sourceUrl"] as const;

export const AID_SECTIONS = [
  "Federal Discrepancies Corrected",
  "Private Discrepancies Corrected",
  "Federal Discrepancies",
  "Private Discrepancies",
  "Temporary Changes",
] as const;

export const MSI_SECTION = "Additional MSI Categories";

export const LNM_SECTIONS = [...AID_SECTIONS, MSI_SECTION] as const;

export type LnmEdition = {
  week: number;
  year: number;
  edition: string;
  href: string;
  sourceUrl: string;
};

export type MarinersNotice = {
  week: string;
  section: string;
  waterway: string | null;
  text: string;
  sourceUrl: string;
};

export type MarinersSnapshot = {
  ok: true;
  product: typeof PRODUCT_ID;
  status: "ok" | "empty" | "stale";
  reason: string | null;
  fetchedAt: string;
  asOf: string | null;
  week: string | null;
  year: number | null;
  edition: string | null;
  district: typeof DISTRICT;
  districtName: typeof DISTRICT_NAME;
  sources: {
    listing: string;
    pdfPattern: string;
    pdfUrl: string | null;
  };
  editions: LnmEdition[];
  notices: MarinersNotice[];
};

const HTTP_UA = "bnm-data-shop/1.0 (USCG D13 LNM public PDF; +https://www.navcen.uscg.gov/)";
const AID_ROW_RE = /^(?<name>.+?)\s+(?<llnr>\d{4,5}(?:\.\d+)?)\s+(?<rest>.+)$/;
const PAGE_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2}),/;
const AS_OF_RE = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function marinersDir(): string {
  if (env("MARINERS_DIR")) return resolve(env("MARINERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/mariners"));
}

export function snapshotPath(): string {
  return join(marinersDir(), "snapshot.json");
}

export function absolutePdfUrl(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("/")) return `https://www.navcen.uscg.gov${href}`;
  return `${LNM_PDF_BASE}${href.replace(/^\.\//, "")}`;
}

export function parseListingHtml(html: string): LnmEdition[] {
  const found: LnmEdition[] = [];
  const seen = new Set<string>();
  const re =
    /week_lnm_format">(\d+)<\/span>\s*-\s*<span class="year_lnm_format">(\d{4})<\/span>[\s\S]{0,400}?href="([^"]+\.pdf)"/gi;
  for (const match of html.matchAll(re)) {
    const week = Number(match[1]);
    const year = Number(match[2]);
    const href = match[3];
    if (!Number.isFinite(week) || !Number.isFinite(year) || !href) continue;
    const sourceUrl = absolutePdfUrl(href);
    const edition = `${week}-${year}`;
    const key = `${edition}|${sourceUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ week, year, edition, href, sourceUrl });
  }
  found.sort((a, b) => (a.year - b.year) || (a.week - b.week));
  return found;
}

export function latestEdition(editions: LnmEdition[]): LnmEdition | null {
  return editions.at(-1) ?? null;
}

function isNoiseLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (t === "\f" || t.includes("\f")) return true;
  if (/Maritime Safety Information Products/.test(t)) return true;
  if (/https:\/\/navcen\.uscg\.gov\/msi/i.test(t)) return true;
  if (PAGE_DATE_RE.test(t)) return true;
  if (/^\d+\/\d+$/.test(t)) return true;
  return false;
}

function matchSection(trimmed: string): string | null {
  for (const section of LNM_SECTIONS) {
    if (trimmed === section || trimmed.startsWith(`${section} `)) return section;
  }
  return null;
}

function isTableHeader(trimmed: string): boolean {
  return /\bNAME\b.*\bLLNR\b/.test(trimmed) || /\bTITLE\b.*\bSUBCATEGORY\b/.test(trimmed);
}

function isWaterwayLine(line: string, trimmed: string): boolean {
  if (matchSection(trimmed) || isTableHeader(trimmed)) return false;
  if (/Local Notice to Mariners/i.test(trimmed)) return false;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return false;
  if (trimmed.length < 3 || trimmed.length > 55) return false;
  if (/\d{4,}/.test(trimmed)) return false;
  const lead = line.length - line.replace(/^ +/, "").length;
  return lead >= 20;
}

function collapseWs(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

export function parseLnmText(
  text: string,
  meta: { week: string; sourceUrl: string },
): { asOf: string | null; notices: MarinersNotice[] } {
  const notices: MarinersNotice[] = [];
  let waterway: string | null = null;
  let section: string | null = null;
  let asOf: string | null = null;
  const msiBuf: string[] = [];

  const flushMsi = () => {
    const body = collapseWs(msiBuf.join(" "));
    msiBuf.length = 0;
    if (!body) return;
    if (/^(TITLE|SUBCATEGORY|DESCRIPTION|LOCATION)(\s|$)/i.test(body) && body.length < 80) return;
    notices.push({
      week: meta.week,
      section: MSI_SECTION,
      waterway,
      text: body,
      sourceUrl: meta.sourceUrl,
    });
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\f/g, "");
    if (isNoiseLine(line)) continue;
    const trimmed = collapseWs(line);
    if (!trimmed) continue;

    if (/Local Notice to Mariners for Northwest District/i.test(trimmed)) {
      const dated = trimmed.match(AS_OF_RE);
      if (dated) {
        const [, mm, dd, yyyy] = dated;
        asOf = `${yyyy}-${mm}-${dd}`;
      }
      continue;
    }

    const nextSection = matchSection(trimmed);
    if (nextSection) {
      if (section === MSI_SECTION) flushMsi();
      section = nextSection;
      continue;
    }

    if (isWaterwayLine(line, trimmed)) {
      if (section === MSI_SECTION) flushMsi();
      waterway = trimmed;
      continue;
    }

    if (isTableHeader(trimmed)) continue;

    if (section && (AID_SECTIONS as readonly string[]).includes(section)) {
      const m = trimmed.match(AID_ROW_RE);
      if (m?.groups && /\b(FD|PA)\b/.test(trimmed)) {
        notices.push({
          week: meta.week,
          section,
          waterway,
          text: collapseWs(`${m.groups.name} LLNR ${m.groups.llnr} ${m.groups.rest}`),
          sourceUrl: meta.sourceUrl,
        });
      }
      continue;
    }

    if (section === MSI_SECTION) {
      if (/^(TITLE|SUBCATEGORY|DESCRIPTION|LOCATION)$/i.test(trimmed)) continue;
      msiBuf.push(trimmed);
    }
  }

  if (section === MSI_SECTION) flushMsi();
  return { asOf, notices };
}

export function emptySnapshot(reason: string, editions: LnmEdition[] = []): MarinersSnapshot {
  const latest = latestEdition(editions);
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    week: latest?.edition ?? null,
    year: latest?.year ?? null,
    edition: latest?.edition ?? null,
    district: DISTRICT,
    districtName: DISTRICT_NAME,
    sources: {
      listing: LNM_LISTING_URL,
      pdfPattern: LNM_PDF_PATTERN,
      pdfUrl: latest?.sourceUrl ?? null,
    },
    editions,
    notices: [],
  };
}

export function assembleSnapshot(opts: {
  editions: LnmEdition[];
  latest: LnmEdition;
  asOf: string | null;
  notices: MarinersNotice[];
  fetchedAt?: string;
}): MarinersSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: opts.notices.length > 0 ? "ok" : "empty",
    reason: opts.notices.length > 0 ? null : "Official D13/Northwest PDF had no parseable notice rows.",
    fetchedAt: opts.fetchedAt ?? new Date().toISOString(),
    asOf: opts.asOf,
    week: opts.latest.edition,
    year: opts.latest.year,
    edition: opts.latest.edition,
    district: DISTRICT,
    districtName: DISTRICT_NAME,
    sources: {
      listing: LNM_LISTING_URL,
      pdfPattern: LNM_PDF_PATTERN,
      pdfUrl: opts.latest.sourceUrl,
    },
    editions: opts.editions,
    notices: opts.notices,
  };
}

export function pdfToText(pdfPath: string): string {
  const helper = env("MARINERS_PDFTOTEXT") || "pdftotext";
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

async function fetchBytes(url: string, accept: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: accept },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function listingPath(): string {
  return env("MARINERS_LISTING_PATH");
}

function pdfPathOverride(): string {
  return env("MARINERS_PDF_PATH");
}

export async function collectMariners(): Promise<MarinersSnapshot> {
  const listingHtml = listingPath() && existsSync(listingPath())
    ? readFileSync(listingPath(), "utf-8")
    : await fetchText(LNM_LISTING_URL);
  const editions = parseListingHtml(listingHtml);
  const latest = latestEdition(editions);
  if (!latest) {
    const snap = emptySnapshot("Official D13/Northwest listing had no weekly PDF links.");
    writeSnapshot(snap);
    return snap;
  }

  const dir = marinersDir();
  mkdirSync(dir, { recursive: true });
  const pdfFile = pdfPathOverride() && existsSync(pdfPathOverride())
    ? pdfPathOverride()
    : join(dir, `lnm${DISTRICT}${String(latest.week).padStart(2, "0")}${latest.year}.pdf`);
  if (!(pdfPathOverride() && existsSync(pdfPathOverride()))) {
    const bytes = await fetchBytes(latest.sourceUrl, "application/pdf");
    writeFileSync(pdfFile, bytes);
  }

  const extracted = pdfToText(pdfFile);
  const parsed = parseLnmText(extracted, { week: latest.edition, sourceUrl: latest.sourceUrl });
  const snap = assembleSnapshot({
    editions,
    latest,
    asOf: parsed.asOf,
    notices: parsed.notices,
  });
  writeSnapshot(snap);
  return snap;
}

export function readSnapshot(): MarinersSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as MarinersSnapshot;
    if (raw && raw.product === PRODUCT_ID && Array.isArray(raw.notices)) return raw;
  } catch {
    /* corrupt */
  }
  return null;
}

export function writeSnapshot(snap: MarinersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function loadMariners(): Promise<MarinersSnapshot> {
  const cached = readSnapshot();
  const ttlMs = Number(env("MARINERS_TTL_MS", String(6 * 3600 * 1000)));
  if (cached) {
    const age = Date.now() - Date.parse(cached.fetchedAt);
    if (Number.isFinite(age) && age >= 0 && age < ttlMs) return cached;
  }
  try {
    return await collectMariners();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.notices.length ? "stale" : "empty",
        reason: `Live USCG LNM fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `USCG D13 LNM PDF is not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function sectionCounts(notices: MarinersNotice[]): { section: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const notice of notices) {
    counts.set(notice.section, (counts.get(notice.section) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([section, count]) => ({ section, count }))
    .sort((a, b) => a.section.localeCompare(b.section));
}

export function buildMarinersManifest(snap: MarinersSnapshot | null): Record<string, unknown> {
  const notices = snap?.notices ?? [];
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + official source + schema only. Notice text is the paid GET /mariners body.",
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: MARINERS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    district: DISTRICT,
    districtName: DISTRICT_NAME,
    week: snap?.week ?? null,
    year: snap?.year ?? null,
    edition: snap?.edition ?? null,
    asOf: snap?.asOf ?? null,
    fetchedAt: snap?.fetchedAt ?? null,
    noticeCount: notices.length,
    sections: sectionCounts(notices),
    sources: snap?.sources ?? {
      listing: LNM_LISTING_URL,
      pdfPattern: LNM_PDF_PATTERN,
      pdfUrl: null,
    },
    schema: {
      fields: [...NOTICE_FIELDS],
      sections: [...LNM_SECTIONS],
    },
  };
}

export async function loadMarinersManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildMarinersManifest(cached);
  try {
    const snap = await collectMariners();
    return buildMarinersManifest(snap);
  } catch {
    return buildMarinersManifest(null);
  }
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectMariners()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            week: snap.week,
            noticeCount: snap.notices.length,
            sections: sectionCounts(snap.notices),
            sourceUrl: snap.sources.pdfUrl,
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
