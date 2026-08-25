/**
 * Official FDA CDER drug-approval Integrated Review TEXT door.
 * Official public PDFs on accessdata.fda.gov Drugs@FDA (`/drugsatfda_docs/nda/…IntegratedR.pdf`).
 * Does not sell the free Drugs@FDA TOC / openFDA catalog JSON (those are index-only).
 * Does not invent review text. CDER review packages only. Not people. Not labels.
 * Not approval letters. Not CBER-only SBRA. Not SwissPAR / EMA / warning letters / Form 483.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const CDER_REVIEWS_PATH = "/cder-reviews";
export const CDER_REVIEWS_MANIFEST_PATH = "/cder-reviews/manifest.json";
export const CDER_REVIEWS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "fda-cder-integrated-review-bodies";
export const PRODUCT_NAME = "FDA CDER Integrated Review text";

export const INDEX_URL = "https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm";
export const PDF_HOST = "www.accessdata.fda.gov";
export const PDF_ORIGIN = "https://www.accessdata.fda.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "FDA CDER / Drugs@FDA";

export const CARD_FIELDS = [
  "id",
  "name",
  "inn",
  "application",
  "date",
  "sponsor",
  "pageUrl",
  "sourceUrl",
  "kind",
  "body",
] as const;

export type CderReviewListing = {
  id: string;
  name: string;
  inn: string;
  application: string;
  date: string | null;
  sponsor: string;
  pageUrl: string;
  sourceUrl: string;
};

export type CderReviewCard = {
  id: string;
  name: string;
  inn: string;
  application: string;
  date: string | null;
  sponsor: string;
  pageUrl: string;
  sourceUrl: string;
  kind: string;
  body: string;
};

export type CderReviewsSnapshot = {
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
    index: string;
    pdfHost: string;
    pageHost: string;
  };
  cards: CderReviewCard[];
};

const HTTP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

const OFFICIAL_HOSTS = new Set(["www.accessdata.fda.gov", "accessdata.fda.gov"]);
const PEOPLE_ONLY =
  /\b(curriculum vitae|cv(?: of)?|date of birth|home address|passport number|social security|private email)\b/i;
const MIN_BODY_CHARS = 800;

/** Official Drugs@FDA Integrated Review PDFs (TOC `integratedR: 1`). Newest first. */
export const SEED_LISTINGS: CderReviewListing[] = [
  {
    id: "blujepa",
    name: "Blujepa",
    inn: "gepotidacin",
    application: "218230",
    date: "2025-03-25",
    sponsor: "GlaxoSmithKline",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2025/218230Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2025/218230Orig1s000IntegratedR.pdf",
  },
  {
    id: "journavx",
    name: "Journavx",
    inn: "suzetrigine",
    application: "219209",
    date: "2025-01-30",
    sponsor: "Vertex Pharmaceuticals",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2025/219209Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2025/219209Orig1s000IntegratedR.pdf",
  },
  {
    id: "ensacove",
    name: "Ensacove",
    inn: "ensartinib",
    application: "218171",
    date: "2024-12-18",
    sponsor: "Xcovery Holdings, Inc.",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2025/218171Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2025/218171Orig1s000IntegratedR.pdf",
  },
  {
    id: "crenessity",
    name: "Crenessity",
    inn: "crinecerfont",
    application: "218808",
    date: "2024-12-13",
    sponsor: "Neurocrine Biosciences, Inc.",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2025/218808Orig1s000,218820Orig1s000TOC.html",
    sourceUrl:
      "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2025/218808Orig1s000,218820Orig1s000IntegratedR.pdf",
  },
  {
    id: "attruby",
    name: "Attruby",
    inn: "acoramidis",
    application: "216540",
    date: "2024-11-22",
    sponsor: "BridgeBio Pharma, Inc.",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/216540Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/216540Orig1s000IntegratedR.pdf",
  },
  {
    id: "cobenfy",
    name: "Cobenfy",
    inn: "xanomeline and trospium chloride",
    application: "216158",
    date: "2024-09-26",
    sponsor: "Bristol-Myers Squibb",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/216158Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/216158Orig1s000IntegratedR.pdf",
  },
  {
    id: "aqneursa",
    name: "Aqneursa",
    inn: "levacetylleucine",
    application: "219132",
    date: "2024-09-24",
    sponsor: "IntraBio Inc.",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/219132Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/219132Orig1s000IntegratedR.pdf",
  },
  {
    id: "livdelzi",
    name: "Livdelzi",
    inn: "seladelpar",
    application: "217899",
    date: "2024-08-14",
    sponsor: "Gilead Sciences Inc",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217899Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217899Orig1s000IntegratedR.pdf",
  },
  {
    id: "nemluvio",
    name: "Nemluvio",
    inn: "nemolizumab",
    application: "761390",
    date: "2024-08-12",
    sponsor: "Galderma Laboratories, L.P.",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/761390Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/761390Orig1s000IntegratedR.pdf",
  },
  {
    id: "ohtuvayre",
    name: "Ohtuvayre",
    inn: "ensifentrine",
    application: "217389",
    date: "2024-06-26",
    sponsor: "Verona Pharma, Inc.",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217389Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217389Orig1s000IntegratedR.pdf",
  },
  {
    id: "piasky",
    name: "Piasky",
    inn: "crovalimab",
    application: "761388",
    date: "2024-06-20",
    sponsor: "Genentech, Inc.",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/761388Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/761388Orig1s000IntegratedR.pdf",
  },
  {
    id: "xolremdi",
    name: "Xolremdi",
    inn: "mavorixafor",
    application: "218709",
    date: "2024-04-26",
    sponsor: "X4 Pharmaceuticals, Inc.",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/218709Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/218709Orig1s000IntegratedR.pdf",
  },
  {
    id: "zevtera",
    name: "Zevtera",
    inn: "ceftobiprole medocaril",
    application: "218275",
    date: "2024-04-03",
    sponsor: "Basilea Pharmaceutica International Ltd",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/218275Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/218275Orig1s000IntegratedR.pdf",
  },
  {
    id: "duvyzat",
    name: "Duvyzat",
    inn: "givinostat",
    application: "217865",
    date: "2024-03-21",
    sponsor: "ITF Therapeutics, LLC",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217865Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217865Orig1s000IntegratedR.pdf",
  },
  {
    id: "rezdiffra",
    name: "Rezdiffra",
    inn: "resmetirom",
    application: "217785",
    date: "2024-03-14",
    sponsor: "Madrigal Pharmaceuticals, Inc.",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217785Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217785Orig1s000IntegratedR.pdf",
  },
  {
    id: "nexviazyme",
    name: "Nexviazyme",
    inn: "avalglucosidase alfa-ngpt",
    application: "761194",
    date: "2021-08-06",
    sponsor: "Genzyme Corporation",
    pageUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2021/761194Orig1s000TOC.html",
    sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2021/761194Orig1s000IntegratedR.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function cderReviewsDir(): string {
  if (env("CDER_REVIEWS_DIR")) return resolve(env("CDER_REVIEWS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/cder-reviews"));
}

export function snapshotPath(): string {
  return join(cderReviewsDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/cder-reviews/seed-snapshot.json"),
    join(here, "fixtures/cder-reviews/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function slugFromName(name: string): string {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function mdyToIso(raw: string | undefined): string | null {
  const t = String(raw || "").trim();
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  const named = t.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
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
    if (mm) return `${named[3]}-${mm}-${named[2].padStart(2, "0")}`;
  }
  const ymd = t.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const iso = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

export function officialTocUrl(raw: string | undefined): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!OFFICIAL_HOSTS.has(u.hostname)) return null;
  if (!/\/drugsatfda_docs\/nda\/\d{4}\/[^/]+TOC\.html?$/i.test(u.pathname)) return null;
  return `https://www.accessdata.fda.gov${u.pathname}`;
}

export function officialIntegratedReviewUrl(raw: string | undefined): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!OFFICIAL_HOSTS.has(u.hostname)) return null;
  if (!/\/drugsatfda_docs\/nda\/\d{4}\/[^/]*IntegratedR\.pdf$/i.test(u.pathname)) return null;
  if (/appletter|label|lbl\.pdf|denovo|cdrh_docs/i.test(u.pathname)) return null;
  return `https://www.accessdata.fda.gov${u.pathname}`;
}

export function isOfficialIntegratedReviewPdf(href: string): boolean {
  return Boolean(officialIntegratedReviewUrl(href));
}

function jsString(html: string, name: string): string {
  const m = html.match(new RegExp(`var ${name} = "([^"]*)"`));
  return m ? m[1].trim() : "";
}

export function parseDrugsAtFdaToc(
  html: string,
  tocUrl: string,
): CderReviewListing | null {
  const pageUrl = officialTocUrl(tocUrl);
  if (!pageUrl) return null;
  const integrated = /integratedR:\s*1\b/.test(html);
  if (!integrated) return null;
  const name = jsString(html, "drugName") || "unknown";
  const sponsor = jsString(html, "companyName");
  const application = (jsString(html, "applicationNumber").match(/\d{5,}/) || [])[0] || "";
  const date = mdyToIso(jsString(html, "approvalDate"));
  const pdfBase = jsString(html, "pdfBaseName");
  const year = pageUrl.match(/\/nda\/(\d{4})\//)?.[1];
  if (!pdfBase || !year) return null;
  const sourceUrl = officialIntegratedReviewUrl(
    `${PDF_ORIGIN}/drugsatfda_docs/nda/${year}/${pdfBase}IntegratedR.pdf`,
  );
  if (!sourceUrl) return null;
  const id = slugFromName(name);
  if (!id) return null;
  return {
    id,
    name,
    inn: "",
    application,
    date,
    sponsor,
    pageUrl,
    sourceUrl,
  };
}

export function parseListingRows(rows: CderReviewListing[]): CderReviewListing[] {
  const out: CderReviewListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const sourceUrl = officialIntegratedReviewUrl(row.sourceUrl);
    const pageUrl = officialTocUrl(row.pageUrl) || row.pageUrl;
    if (!sourceUrl) continue;
    if (isPeopleRow(row)) continue;
    const id = slugFromName(row.id || row.name);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: String(row.name || id).replace(/\s+/g, " ").trim(),
      inn: String(row.inn || "").trim(),
      application: String(row.application || "").replace(/\D/g, ""),
      date: mdyToIso(row.date ?? undefined) ?? row.date ?? null,
      sponsor: String(row.sponsor || "").trim(),
      pageUrl,
      sourceUrl,
    });
  }
  return out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
}

export function isPeopleRow(row: Pick<CderReviewListing, "name" | "sponsor" | "inn">): boolean {
  const blob = `${row.name || ""} ${row.sponsor || ""} ${row.inn || ""}`;
  return PEOPLE_ONLY.test(blob) && !/\b(fda|cder|nda|bla)\b/i.test(blob);
}

function looksLikePeopleDump(text: string): boolean {
  return PEOPLE_ONLY.test(text) && !/\b(integrated review|center for drug evaluation)\b/i.test(text);
}

export function isRealCderReviewBody(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length < MIN_BODY_CHARS) return false;
  if (looksLikePeopleDump(t)) return false;
  if (/"application_docs"\s*:/.test(t) && /("doc_url"|"openfda")\s*:/.test(t)) return false;
  if (/\bswisspar\b/i.test(t) && !/\bcenter for drug evaluation\b/i.test(t)) return false;
  if (/\barticle 20 referral\b/i.test(t) && !/\bintegrated review\b/i.test(t)) return false;
  if (/\bform 483\b/i.test(t) || /\bwarning letter\b/i.test(t)) return false;
  if (/\bthis is the approval letter only\b/i.test(t)) return false;
  if (/\bno integrated review in this teaser\b/i.test(t)) return false;
  const hasCder = /\bcenter for drug evaluation and research\b|\bcder\b/i.test(t);
  const hasIntegrated = /\bintegrated review\b/i.test(t);
  const hasBody = /\b(benefit-risk|nda\s+\d+|bla\s+\d+|application number)\b/i.test(t);
  return hasCder && hasIntegrated && hasBody;
}

export function parseCderReviewText(
  text: string,
  meta: {
    sourceUrl: string;
    pageUrl?: string;
    name?: string;
    inn?: string;
    application?: string;
    date?: string | null;
    sponsor?: string;
    id?: string;
    kind?: string;
  },
): CderReviewCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialIntegratedReviewUrl(meta.sourceUrl) || meta.sourceUrl;
  const pageUrl = officialTocUrl(meta.pageUrl) || meta.pageUrl || "";
  const name = (meta.name || "").replace(/\s+/g, " ").trim();
  const id = meta.id || slugFromName(name) || sourceUrl;
  let inn = (meta.inn || "").trim();
  if (!inn) {
    const m = body.match(/\(([A-Za-z][A-Za-z0-9][A-Za-z0-9\s,;/-]{1,80})\)/);
    if (m && !/orig\d|s\d{3}/i.test(m[1])) inn = m[1].split(";")[0].trim();
  }
  return {
    id,
    name: name || id,
    inn,
    application: String(meta.application || "").replace(/\D/g, ""),
    date: meta.date ?? null,
    sponsor: (meta.sponsor || "").trim(),
    pageUrl,
    sourceUrl,
    kind: meta.kind || "integrated-review",
    body,
  };
}

export function emptyCderReviewsSnapshot(reason: string): CderReviewsSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: INDEX_URL, pdfHost: `${PDF_ORIGIN}/drugsatfda_docs/nda/`, pageHost: INDEX_URL },
    cards: [],
  };
}

export function assembleCderReviewsSnapshot(
  cards: CderReviewCard[],
  fetchedAt = new Date().toISOString(),
): CderReviewsSnapshot {
  const withBody = cards
    .filter((c) => isRealCderReviewBody(c.body) && officialIntegratedReviewUrl(c.sourceUrl))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official CDER Integrated Review PDFs had no extractable review text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: INDEX_URL, pdfHost: `${PDF_ORIGIN}/drugsatfda_docs/nda/`, pageHost: INDEX_URL },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): CderReviewsSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as CderReviewsSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readCderReviewsSnapshot(): CderReviewsSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("CDER_REVIEWS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeCderReviewsSnapshot(snap: CderReviewsSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchCderText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/json,*/*" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchCderBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,*/*" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${url} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("CDER_REVIEWS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function listingDir(): string {
  return env("CDER_REVIEWS_HTML_DIR") || env("CDER_REVIEWS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("CDER_REVIEWS_LIMIT", "16"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 16;
}

function maxFetchLimit(): number {
  const n = Number(env("CDER_REVIEWS_MAX_FETCH", "20"));
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

async function loadOfficialListings(dir: string): Promise<{ listed: CderReviewListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html", "toc.html"]);
    if (html) {
      const parsed = parseDrugsAtFdaToc(
        html,
        "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217785Orig1s000TOC.html",
      );
      const extra = SEED_LISTINGS.filter((row) => existsSync(join(dir, `${row.id}.txt`)));
      const listed = parseListingRows([...(parsed ? [parsed] : []), ...extra]);
      return { listed, listedCount: listed.length };
    }
    const extra = SEED_LISTINGS.filter((row) => existsSync(join(dir, `${row.id}.txt`)));
    return { listed: parseListingRows(extra), listedCount: extra.length };
  }
  return { listed: parseListingRows(SEED_LISTINGS), listedCount: SEED_LISTINGS.length };
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function collectCderReviews(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<CderReviewsSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = cderReviewsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, CderReviewCard>();
  for (const card of readCderReviewsSnapshot()?.cards ?? []) {
    if (isRealCderReviewBody(card.body)) prior.set(card.id, card);
  }
  const cards: CderReviewCard[] = [];
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
      const localText = readNamedFile(dir, [`${row.id}.txt`, `${row.id}-excerpt.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialIntegratedReviewUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchCderBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseCderReviewText(text, {
        sourceUrl,
        pageUrl: row.pageUrl,
        name: row.name,
        inn: row.inn,
        application: row.application,
        date: row.date,
        sponsor: row.sponsor,
        id: row.id,
        kind: "integrated-review",
      });
      if (!isRealCderReviewBody(parsed.body)) {
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
    ...assembleCderReviewsSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeCderReviewsSnapshot(snap);
  return snap;
}

export async function loadCderReviews(): Promise<CderReviewsSnapshot> {
  const cached = readCderReviewsSnapshot();
  if (cached && cached.cards.some((c) => isRealCderReviewBody(c.body))) return cached;
  try {
    return await collectCderReviews();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealCderReviewBody(c.body)) ? "stale" : "empty",
        reason: `Live CDER Integrated Review fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyCderReviewsSnapshot(
      `CDER Integrated Review PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildCderReviewsManifest(snap: CderReviewsSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealCderReviewBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      CDER_REVIEWS_PATH,
      "Count + name + date + application + official Integrated Review PDF URL only. Review body is the paid GET /cder-reviews payload. This free manifest lists the full catalog.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: CDER_REVIEWS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      name: c.name,
      date: c.date,
      application: c.application,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "name", "date", "application", "sourceUrl"] },
    sources: snap?.sources ?? { index: INDEX_URL, pdfHost: `${PDF_ORIGIN}/drugsatfda_docs/nda/`, pageHost: INDEX_URL },
  };
}

export async function loadCderReviewsManifest(): Promise<Record<string, unknown>> {
  return buildCderReviewsManifest(readCderReviewsSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectCderReviews()
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
              name: c.name,
              inn: c.inn,
              application: c.application,
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
