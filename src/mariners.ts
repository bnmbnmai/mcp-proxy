/**
 * USCG Local Notice to Mariners — official weekly NavCEN PDF only.
 * One parser walks District 13 / Northwest (`/mariners`), District 11 /
 * Southwest northern (`/mariners-d11`), District 7 / Southeast
 * (`/mariners-d7`), District 8 / Gulf (`/mariners-d8`), plus leftover
 * Districts 1 / Northeast (`/mariners-d1`), 5 / Mid-Atlantic
 * (`/mariners-d5`), 9 / Great Lakes (`/mariners-d9`), 14 / Pacific
 * (`/mariners-d14`), and 17 / Alaska (`/mariners-d17`). Does not invent
 * notices. Does not wrap CBP AD/CVD. Does not wrap Light List GeoJSON or
 * MSI Download dumps. D11 south has no 2026 weekly PDFs — not shipped.
 * D8 rivers is a separate NavCEN listing — not this SKU.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const MARINERS_PATH = "/mariners";
export const MARINERS_MANIFEST_PATH = "/mariners/manifest.json";
export const MARINERS_D11_PATH = "/mariners-d11";
export const MARINERS_D11_MANIFEST_PATH = "/mariners-d11/manifest.json";
export const MARINERS_D7_PATH = "/mariners-d7";
export const MARINERS_D7_MANIFEST_PATH = "/mariners-d7/manifest.json";
export const MARINERS_D8_PATH = "/mariners-d8";
export const MARINERS_D8_MANIFEST_PATH = "/mariners-d8/manifest.json";
export const MARINERS_D1_PATH = "/mariners-d1";
export const MARINERS_D1_MANIFEST_PATH = "/mariners-d1/manifest.json";
export const MARINERS_D5_PATH = "/mariners-d5";
export const MARINERS_D5_MANIFEST_PATH = "/mariners-d5/manifest.json";
export const MARINERS_D9_PATH = "/mariners-d9";
export const MARINERS_D9_MANIFEST_PATH = "/mariners-d9/manifest.json";
export const MARINERS_D14_PATH = "/mariners-d14";
export const MARINERS_D14_MANIFEST_PATH = "/mariners-d14/manifest.json";
export const MARINERS_D17_PATH = "/mariners-d17";
export const MARINERS_D17_MANIFEST_PATH = "/mariners-d17/manifest.json";
export const MARINERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "uscg-d13-lnm";
export const PRODUCT_NAME = "USCG D13 / Northwest LNM";
export const D11_PRODUCT_ID = "uscg-d11-lnm";
export const D11_PRODUCT_NAME = "USCG D11 / Southwest LNM";
export const D7_PRODUCT_ID = "uscg-d7-lnm";
export const D7_PRODUCT_NAME = "USCG D7 / Southeast LNM";
export const D8_PRODUCT_ID = "uscg-d8-lnm";
export const D8_PRODUCT_NAME = "USCG D8 / Gulf LNM";
export const D1_PRODUCT_ID = "uscg-d1-lnm";
export const D1_PRODUCT_NAME = "USCG D1 / Northeast LNM";
export const D5_PRODUCT_ID = "uscg-d5-lnm";
export const D5_PRODUCT_NAME = "USCG D5 / Mid-Atlantic LNM";
export const D9_PRODUCT_ID = "uscg-d9-lnm";
export const D9_PRODUCT_NAME = "USCG D9 / Great Lakes LNM";
export const D14_PRODUCT_ID = "uscg-d14-lnm";
export const D14_PRODUCT_NAME = "USCG D14 / Pacific LNM";
export const D17_PRODUCT_ID = "uscg-d17-lnm";
export const D17_PRODUCT_NAME = "USCG D17 / Alaska LNM";

export const LNM_LISTING_URL =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=13+0&subdistrict=n";
export const D11_LNM_LISTING_URL =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=11+0&subdistrict=n";
export const D7_LNM_LISTING_URL =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=7+0&subdistrict=n";
export const D8_LNM_LISTING_URL =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=8+0&subdistrict=g";
export const D1_LNM_LISTING_URL =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=1+0&subdistrict=n";
export const D5_LNM_LISTING_URL =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=5+0&subdistrict=n";
export const D9_LNM_LISTING_URL =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=9+0&subdistrict=n";
export const D14_LNM_LISTING_URL =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=14+0&subdistrict=n";
export const D17_LNM_LISTING_URL =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=17+0&subdistrict=n";
export const LNM_PDF_BASE = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/";
export const LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13{WW}{YYYY}.pdf";
export const D11_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm11{WW}{YYYY}.pdf";
export const D7_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm07{WW}{YYYY}.pdf";
export const D8_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm08{WW}g{YYYY}.pdf";
export const D1_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm01{WW}{YYYY}.pdf";
export const D5_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm05{WW}{YYYY}.pdf";
export const D9_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm09{WW}{YYYY}.pdf";
export const D14_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm14{WW}{YYYY}.pdf";
export const D17_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm17{WW}{YYYY}.pdf";
export const DISTRICT = "13";
export const DISTRICT_NAME = "Northwest";
export const D11_DISTRICT = "11";
export const D11_DISTRICT_NAME = "Southwest";
export const D7_DISTRICT = "7";
export const D7_DISTRICT_NAME = "Southeast";
export const D8_DISTRICT = "8";
export const D8_DISTRICT_NAME = "Gulf";
export const D1_DISTRICT = "1";
export const D1_DISTRICT_NAME = "Northeast";
export const D5_DISTRICT = "5";
export const D5_DISTRICT_NAME = "Mid-Atlantic";
export const D9_DISTRICT = "9";
export const D9_DISTRICT_NAME = "Great Lakes";
export const D14_DISTRICT = "14";
export const D14_DISTRICT_NAME = "Pacific";
export const D17_DISTRICT = "17";
export const D17_DISTRICT_NAME = "Alaska";

export type LnmSpec = {
  productId: string;
  productName: string;
  district: string;
  districtName: string;
  listingUrl: string;
  pdfPattern: string;
  /** Official weekly PDF infix (`g` for D8 Gulf `lnm08{WW}g{YYYY}.pdf`). */
  pdfInfix?: string;
  path: string;
  cacheDir: string;
  dirEnv: string;
  ttlEnv: string;
  listingPathEnv: string;
  pdfPathEnv: string;
  userAgent: string;
};

export const D13_SPEC: LnmSpec = {
  productId: PRODUCT_ID,
  productName: PRODUCT_NAME,
  district: DISTRICT,
  districtName: DISTRICT_NAME,
  listingUrl: LNM_LISTING_URL,
  pdfPattern: LNM_PDF_PATTERN,
  path: MARINERS_PATH,
  cacheDir: "mariners",
  dirEnv: "MARINERS_DIR",
  ttlEnv: "MARINERS_TTL_MS",
  listingPathEnv: "MARINERS_LISTING_PATH",
  pdfPathEnv: "MARINERS_PDF_PATH",
  userAgent: "bnm-data-shop/1.0 (USCG D13 LNM public PDF; +https://www.navcen.uscg.gov/)",
};

export const D11_SPEC: LnmSpec = {
  productId: D11_PRODUCT_ID,
  productName: D11_PRODUCT_NAME,
  district: D11_DISTRICT,
  districtName: D11_DISTRICT_NAME,
  listingUrl: D11_LNM_LISTING_URL,
  pdfPattern: D11_LNM_PDF_PATTERN,
  path: MARINERS_D11_PATH,
  cacheDir: "mariners-d11",
  dirEnv: "MARINERS_D11_DIR",
  ttlEnv: "MARINERS_D11_TTL_MS",
  listingPathEnv: "MARINERS_D11_LISTING_PATH",
  pdfPathEnv: "MARINERS_D11_PDF_PATH",
  userAgent: "bnm-data-shop/1.0 (USCG D11 LNM public PDF; +https://www.navcen.uscg.gov/)",
};

export const D7_SPEC: LnmSpec = {
  productId: D7_PRODUCT_ID,
  productName: D7_PRODUCT_NAME,
  district: D7_DISTRICT,
  districtName: D7_DISTRICT_NAME,
  listingUrl: D7_LNM_LISTING_URL,
  pdfPattern: D7_LNM_PDF_PATTERN,
  path: MARINERS_D7_PATH,
  cacheDir: "mariners-d7",
  dirEnv: "MARINERS_D7_DIR",
  ttlEnv: "MARINERS_D7_TTL_MS",
  listingPathEnv: "MARINERS_D7_LISTING_PATH",
  pdfPathEnv: "MARINERS_D7_PDF_PATH",
  userAgent: "bnm-data-shop/1.0 (USCG D7 LNM public PDF; +https://www.navcen.uscg.gov/)",
};

export const D8_SPEC: LnmSpec = {
  productId: D8_PRODUCT_ID,
  productName: D8_PRODUCT_NAME,
  district: D8_DISTRICT,
  districtName: D8_DISTRICT_NAME,
  listingUrl: D8_LNM_LISTING_URL,
  pdfPattern: D8_LNM_PDF_PATTERN,
  pdfInfix: "g",
  path: MARINERS_D8_PATH,
  cacheDir: "mariners-d8",
  dirEnv: "MARINERS_D8_DIR",
  ttlEnv: "MARINERS_D8_TTL_MS",
  listingPathEnv: "MARINERS_D8_LISTING_PATH",
  pdfPathEnv: "MARINERS_D8_PDF_PATH",
  userAgent: "bnm-data-shop/1.0 (USCG D8 LNM public PDF; +https://www.navcen.uscg.gov/)",
};

function leftoverSpec(opts: {
  productId: string;
  productName: string;
  district: string;
  districtName: string;
  listingUrl: string;
  pdfPattern: string;
  path: string;
  cacheDir: string;
  envKey: string;
}): LnmSpec {
  return {
    productId: opts.productId,
    productName: opts.productName,
    district: opts.district,
    districtName: opts.districtName,
    listingUrl: opts.listingUrl,
    pdfPattern: opts.pdfPattern,
    path: opts.path,
    cacheDir: opts.cacheDir,
    dirEnv: `${opts.envKey}_DIR`,
    ttlEnv: `${opts.envKey}_TTL_MS`,
    listingPathEnv: `${opts.envKey}_LISTING_PATH`,
    pdfPathEnv: `${opts.envKey}_PDF_PATH`,
    userAgent: `bnm-data-shop/1.0 (USCG D${opts.district} LNM public PDF; +https://www.navcen.uscg.gov/)`,
  };
}

export const D1_SPEC: LnmSpec = leftoverSpec({
  productId: D1_PRODUCT_ID,
  productName: D1_PRODUCT_NAME,
  district: D1_DISTRICT,
  districtName: D1_DISTRICT_NAME,
  listingUrl: D1_LNM_LISTING_URL,
  pdfPattern: D1_LNM_PDF_PATTERN,
  path: MARINERS_D1_PATH,
  cacheDir: "mariners-d1",
  envKey: "MARINERS_D1",
});

export const D5_SPEC: LnmSpec = leftoverSpec({
  productId: D5_PRODUCT_ID,
  productName: D5_PRODUCT_NAME,
  district: D5_DISTRICT,
  districtName: D5_DISTRICT_NAME,
  listingUrl: D5_LNM_LISTING_URL,
  pdfPattern: D5_LNM_PDF_PATTERN,
  path: MARINERS_D5_PATH,
  cacheDir: "mariners-d5",
  envKey: "MARINERS_D5",
});

export const D9_SPEC: LnmSpec = leftoverSpec({
  productId: D9_PRODUCT_ID,
  productName: D9_PRODUCT_NAME,
  district: D9_DISTRICT,
  districtName: D9_DISTRICT_NAME,
  listingUrl: D9_LNM_LISTING_URL,
  pdfPattern: D9_LNM_PDF_PATTERN,
  path: MARINERS_D9_PATH,
  cacheDir: "mariners-d9",
  envKey: "MARINERS_D9",
});

export const D14_SPEC: LnmSpec = leftoverSpec({
  productId: D14_PRODUCT_ID,
  productName: D14_PRODUCT_NAME,
  district: D14_DISTRICT,
  districtName: D14_DISTRICT_NAME,
  listingUrl: D14_LNM_LISTING_URL,
  pdfPattern: D14_LNM_PDF_PATTERN,
  path: MARINERS_D14_PATH,
  cacheDir: "mariners-d14",
  envKey: "MARINERS_D14",
});

export const D17_SPEC: LnmSpec = leftoverSpec({
  productId: D17_PRODUCT_ID,
  productName: D17_PRODUCT_NAME,
  district: D17_DISTRICT,
  districtName: D17_DISTRICT_NAME,
  listingUrl: D17_LNM_LISTING_URL,
  pdfPattern: D17_LNM_PDF_PATTERN,
  path: MARINERS_D17_PATH,
  cacheDir: "mariners-d17",
  envKey: "MARINERS_D17",
});

/** Live sibling doors already on ticks.bnm.farm. */
export const LIVE_LNM_SPECS: readonly LnmSpec[] = [D13_SPEC, D11_SPEC, D7_SPEC, D8_SPEC];

/** Dual-hunt TAKE 2026-09-06 leftover districts (same walker, new sibling paths). */
export const LEFTOVER_LNM_SPECS: readonly LnmSpec[] = [D1_SPEC, D5_SPEC, D9_SPEC, D14_SPEC, D17_SPEC];

export const ALL_LNM_SPECS: readonly LnmSpec[] = [...LIVE_LNM_SPECS, ...LEFTOVER_LNM_SPECS];

/** NavCEN weekly PDF prefix is two digits (`lnm01…`, `lnm07…`, `lnm08…g`, `lnm11…`, `lnm13…`). */
export function lnmPdfCode(district: string): string {
  return district.padStart(2, "0");
}

export function lnmPdfFilename(district: string, week: number, year: number, infix = ""): string {
  return `lnm${lnmPdfCode(district)}${String(week).padStart(2, "0")}${infix}${year}.pdf`;
}

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
  product: string;
  status: "ok" | "empty" | "stale";
  reason: string | null;
  fetchedAt: string;
  asOf: string | null;
  week: string | null;
  year: number | null;
  edition: string | null;
  district: string;
  districtName: string;
  sources: {
    listing: string;
    pdfPattern: string;
    pdfUrl: string | null;
  };
  editions: LnmEdition[];
  notices: MarinersNotice[];
};
const AID_ROW_RE = /^(?<name>.+?)\s+(?<llnr>\d{4,5}(?:\.\d+)?)\s+(?<rest>.+)$/;
const PAGE_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2}),/;
const AS_OF_RE = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function marinersDir(spec: LnmSpec = D13_SPEC): string {
  if (env(spec.dirEnv)) return resolve(env(spec.dirEnv));
  return resolve(join(homedir(), "projects/mcp-proxy/data", spec.cacheDir));
}

export function snapshotPath(spec: LnmSpec = D13_SPEC): string {
  return join(marinersDir(spec), "snapshot.json");
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

    if (/Local Notice to Mariners for .+ District/i.test(trimmed)) {
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

export function emptySnapshot(
  reason: string,
  editions: LnmEdition[] = [],
  spec: LnmSpec = D13_SPEC,
): MarinersSnapshot {
  const latest = latestEdition(editions);
  return {
    ok: true,
    product: spec.productId,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    week: latest?.edition ?? null,
    year: latest?.year ?? null,
    edition: latest?.edition ?? null,
    district: spec.district,
    districtName: spec.districtName,
    sources: {
      listing: spec.listingUrl,
      pdfPattern: spec.pdfPattern,
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
  spec?: LnmSpec;
}): MarinersSnapshot {
  const spec = opts.spec ?? D13_SPEC;
  return {
    ok: true,
    product: spec.productId,
    status: opts.notices.length > 0 ? "ok" : "empty",
    reason: opts.notices.length > 0
      ? null
      : `Official ${spec.districtName} PDF had no parseable notice rows.`,
    fetchedAt: opts.fetchedAt ?? new Date().toISOString(),
    asOf: opts.asOf,
    week: opts.latest.edition,
    year: opts.latest.year,
    edition: opts.latest.edition,
    district: spec.district,
    districtName: spec.districtName,
    sources: {
      listing: spec.listingUrl,
      pdfPattern: spec.pdfPattern,
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

async function fetchBytes(url: string, accept: string, spec: LnmSpec): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": spec.userAgent, Accept: accept },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function fetchText(url: string, spec: LnmSpec): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": spec.userAgent, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function listingPath(spec: LnmSpec): string {
  return env(spec.listingPathEnv);
}

function pdfPathOverride(spec: LnmSpec): string {
  return env(spec.pdfPathEnv);
}

export async function collectMariners(spec: LnmSpec = D13_SPEC): Promise<MarinersSnapshot> {
  const listingFile = listingPath(spec);
  const listingHtml = listingFile && existsSync(listingFile)
    ? readFileSync(listingFile, "utf-8")
    : await fetchText(spec.listingUrl, spec);
  const editions = parseListingHtml(listingHtml);
  const latest = latestEdition(editions);
  if (!latest) {
    const snap = emptySnapshot(
      `Official ${spec.districtName} listing had no weekly PDF links.`,
      [],
      spec,
    );
    writeSnapshot(snap, spec);
    return snap;
  }

  const dir = marinersDir(spec);
  mkdirSync(dir, { recursive: true });
  const override = pdfPathOverride(spec);
  const pdfFile = override && existsSync(override)
    ? override
    : join(dir, lnmPdfFilename(spec.district, latest.week, latest.year, spec.pdfInfix ?? ""));
  if (!(override && existsSync(override))) {
    const bytes = await fetchBytes(latest.sourceUrl, "application/pdf", spec);
    writeFileSync(pdfFile, bytes);
  }

  const extracted = pdfToText(pdfFile);
  const parsed = parseLnmText(extracted, { week: latest.edition, sourceUrl: latest.sourceUrl });
  const snap = assembleSnapshot({
    editions,
    latest,
    asOf: parsed.asOf,
    notices: parsed.notices,
    spec,
  });
  writeSnapshot(snap, spec);
  return snap;
}

export function readSnapshot(spec: LnmSpec = D13_SPEC): MarinersSnapshot | null {
  const path = snapshotPath(spec);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as MarinersSnapshot;
    if (raw && raw.product === spec.productId && Array.isArray(raw.notices)) return raw;
  } catch {
    /* corrupt */
  }
  return null;
}

export function writeSnapshot(snap: MarinersSnapshot, spec: LnmSpec = D13_SPEC): void {
  const path = snapshotPath(spec);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function loadMariners(spec: LnmSpec = D13_SPEC): Promise<MarinersSnapshot> {
  const cached = readSnapshot(spec);
  const ttlMs = Number(env(spec.ttlEnv, String(6 * 3600 * 1000)));
  if (cached) {
    const age = Date.now() - Date.parse(cached.fetchedAt);
    if (Number.isFinite(age) && age >= 0 && age < ttlMs) return cached;
  }
  try {
    return await collectMariners(spec);
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.notices.length ? "stale" : "empty",
        reason: `Live USCG LNM fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `USCG ${spec.districtName} LNM PDF is not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
      [],
      spec,
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

export function buildMarinersManifest(
  snap: MarinersSnapshot | null,
  spec: LnmSpec = D13_SPEC,
): Record<string, unknown> {
  const notices = snap?.notices ?? [];
  return {
    product: spec.productId,
    name: spec.productName,
    free: true,
    note: `Count + official source + schema only. Notice text is the paid GET ${spec.path} body.`,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: MARINERS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    district: spec.district,
    districtName: spec.districtName,
    week: snap?.week ?? null,
    year: snap?.year ?? null,
    edition: snap?.edition ?? null,
    asOf: snap?.asOf ?? null,
    fetchedAt: snap?.fetchedAt ?? null,
    noticeCount: notices.length,
    sections: sectionCounts(notices),
    sources: snap?.sources ?? {
      listing: spec.listingUrl,
      pdfPattern: spec.pdfPattern,
      pdfUrl: null,
    },
    schema: {
      fields: [...NOTICE_FIELDS],
      sections: [...LNM_SECTIONS],
    },
  };
}

export async function loadMarinersManifest(spec: LnmSpec = D13_SPEC): Promise<Record<string, unknown>> {
  const cached = readSnapshot(spec);
  if (cached) return buildMarinersManifest(cached, spec);
  try {
    const snap = await collectMariners(spec);
    return buildMarinersManifest(snap, spec);
  } catch {
    return buildMarinersManifest(null, spec);
  }
}

export function collectMarinersD11(): Promise<MarinersSnapshot> {
  return collectMariners(D11_SPEC);
}

export function loadMarinersD11(): Promise<MarinersSnapshot> {
  return loadMariners(D11_SPEC);
}

export function loadMarinersD11Manifest(): Promise<Record<string, unknown>> {
  return loadMarinersManifest(D11_SPEC);
}

export function collectMarinersD7(): Promise<MarinersSnapshot> {
  return collectMariners(D7_SPEC);
}

export function loadMarinersD7(): Promise<MarinersSnapshot> {
  return loadMariners(D7_SPEC);
}

export function loadMarinersD7Manifest(): Promise<Record<string, unknown>> {
  return loadMarinersManifest(D7_SPEC);
}

export function collectMarinersD8(): Promise<MarinersSnapshot> {
  return collectMariners(D8_SPEC);
}

export function loadMarinersD8(): Promise<MarinersSnapshot> {
  return loadMariners(D8_SPEC);
}

export function loadMarinersD8Manifest(): Promise<Record<string, unknown>> {
  return loadMarinersManifest(D8_SPEC);
}

export function collectMarinersD1(): Promise<MarinersSnapshot> {
  return collectMariners(D1_SPEC);
}

export function loadMarinersD1(): Promise<MarinersSnapshot> {
  return loadMariners(D1_SPEC);
}

export function loadMarinersD1Manifest(): Promise<Record<string, unknown>> {
  return loadMarinersManifest(D1_SPEC);
}

export function collectMarinersD5(): Promise<MarinersSnapshot> {
  return collectMariners(D5_SPEC);
}

export function loadMarinersD5(): Promise<MarinersSnapshot> {
  return loadMariners(D5_SPEC);
}

export function loadMarinersD5Manifest(): Promise<Record<string, unknown>> {
  return loadMarinersManifest(D5_SPEC);
}

export function collectMarinersD9(): Promise<MarinersSnapshot> {
  return collectMariners(D9_SPEC);
}

export function loadMarinersD9(): Promise<MarinersSnapshot> {
  return loadMariners(D9_SPEC);
}

export function loadMarinersD9Manifest(): Promise<Record<string, unknown>> {
  return loadMarinersManifest(D9_SPEC);
}

export function collectMarinersD14(): Promise<MarinersSnapshot> {
  return collectMariners(D14_SPEC);
}

export function loadMarinersD14(): Promise<MarinersSnapshot> {
  return loadMariners(D14_SPEC);
}

export function loadMarinersD14Manifest(): Promise<Record<string, unknown>> {
  return loadMarinersManifest(D14_SPEC);
}

export function collectMarinersD17(): Promise<MarinersSnapshot> {
  return collectMariners(D17_SPEC);
}

export function loadMarinersD17(): Promise<MarinersSnapshot> {
  return loadMariners(D17_SPEC);
}

export function loadMarinersD17Manifest(): Promise<Record<string, unknown>> {
  return loadMarinersManifest(D17_SPEC);
}

export function specFromDistrict(raw: string | undefined): LnmSpec {
  const key = (raw ?? "").trim().replace(/^0+/, "") || "13";
  const hit = ALL_LNM_SPECS.find((spec) => spec.district === key);
  return hit ?? D13_SPEC;
}

export function specFromArgv(argv: string[] = process.argv): LnmSpec {
  const raw = argv.find((arg) => arg.startsWith("--district="))?.slice("--district=".length);
  return specFromDistrict(raw);
}

export function leftoverCollectArgv(spec: LnmSpec): string {
  return `--district=${spec.district}`;
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  const spec = specFromArgv();
  collectMariners(spec)
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            product: snap.product,
            district: snap.district,
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            week: snap.week,
            noticeCount: snap.notices.length,
            sections: sectionCounts(snap.notices),
            sourceUrl: snap.sources.pdfUrl,
            snapshot: snapshotPath(spec),
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
