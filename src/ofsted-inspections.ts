/**
 * Official Ofsted school / provider inspection-report TEXT door.
 * Official public PDFs on files.ofsted.gov.uk (`/v1/file/{id}`).
 * OGL v3.0. Does not invent report text. Does not sell the free reports.ofsted.gov.uk
 * HTML index or grades-only report-card banner (those are index-only).
 * Keyed on official file / report id + URN / provider. Not people.
 * Not pupil detail. Not childminder / registered-person dumps.
 * Not academy-conversion notices. Not NPDES / CDER / EMA / ICO.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const OFSTED_INSPECTIONS_PATH = "/ofsted-inspections";
export const OFSTED_INSPECTIONS_MANIFEST_PATH = "/ofsted-inspections/manifest.json";
export const OFSTED_INSPECTIONS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "ofsted-inspection-report-bodies";
export const PRODUCT_NAME = "Ofsted school / provider inspection report text";

export const INDEX_URL = "https://reports.ofsted.gov.uk/";
export const PDF_HOST = "files.ofsted.gov.uk";
export const PDF_ORIGIN = "https://files.ofsted.gov.uk";
export const PAGE_HOST = "reports.ofsted.gov.uk";
export const LICENSE = "OGL v3.0";
export const ATTRIBUTION =
  "Ofsted. Contains public sector information licensed under the Open Government Licence v3.0.";

export const CARD_FIELDS = [
  "id",
  "urn",
  "provider",
  "date",
  "inspectionType",
  "pageUrl",
  "sourceUrl",
  "kind",
  "body",
] as const;

export type OfstedInspectionListing = {
  id: string;
  urn: string;
  provider: string;
  date: string | null;
  inspectionType: string;
  pageUrl: string;
  sourceUrl: string;
};

export type OfstedInspectionCard = {
  id: string;
  urn: string;
  provider: string;
  date: string | null;
  inspectionType: string;
  pageUrl: string;
  sourceUrl: string;
  kind: string;
  body: string;
};

export type OfstedInspectionsSnapshot = {
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
  cards: OfstedInspectionCard[];
};

const HTTP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

const OFFICIAL_FILE_HOSTS = new Set(["files.ofsted.gov.uk"]);
const OFFICIAL_PAGE_HOSTS = new Set(["reports.ofsted.gov.uk"]);
const PEOPLE_ONLY =
  /\b(curriculum vitae|cv(?: of)?|date of birth|home address|passport number|social security|private email|pupil roll|class list)\b/i;
const CHILDMINDER_PEOPLE = /\b(childminder|registered person)\b/i;
const ACADEMY_CONVERSION = /\bacademy conversion and predecessor schools\b/i;
const MIN_BODY_CHARS = 3000;
const FILE_ID_RE = /^(\d{5,})$/;
const URN_RE = /^[A-Z0-9]{3,12}$/i;

/** Official files.ofsted.gov.uk inspection-report PDFs. Newest first after Abberley seed. */
export const SEED_LISTINGS: OfstedInspectionListing[] = [
  {
    id: "50276206",
    urn: "116780",
    provider: "Abberley Parochial VC Primary School",
    date: "2025-05-06",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/21/116780",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50276206",
  },
  {
    id: "50309671",
    urn: "137279",
    provider: "New Forest School",
    date: "2026-08-18",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/137279",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50309671",
  },
  {
    id: "50309644",
    urn: "150379",
    provider: "Yew Tree Farm School",
    date: "2026-08-18",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/150379",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50309644",
  },
  {
    id: "50309638",
    urn: "152633",
    provider: "Meadow School",
    date: "2026-08-18",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/152633",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50309638",
  },
  {
    id: "50309585",
    urn: "152461",
    provider: "Swallow Grange",
    date: "2026-08-17",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/152461",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50309585",
  },
  {
    id: "50309584",
    urn: "152625",
    provider: "Lake House School",
    date: "2026-08-17",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/152625",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50309584",
  },
  {
    id: "50309583",
    urn: "152642",
    provider: "Red Balloon Aylesbury",
    date: "2026-08-17",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/152642",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50309583",
  },
  {
    id: "50308930",
    urn: "147473",
    provider: "Compass Community School Essex",
    date: "2026-08-05",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/147473",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50308930",
  },
  {
    id: "50308797",
    urn: "152511",
    provider: "Aspire and Achieve",
    date: "2026-08-03",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/152511",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50308797",
  },
  {
    id: "50310126",
    urn: "152614",
    provider: "Infinite Schools - Warrington",
    date: "2026-07-30",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/152614",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50310126",
  },
  {
    id: "50308486",
    urn: "149890",
    provider: "Courtlands Independent Special School",
    date: "2026-07-29",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/149890",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50308486",
  },
  {
    id: "50308387",
    urn: "118123",
    provider: "Froebel House School",
    date: "2026-07-27",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/118123",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50308387",
  },
  {
    id: "50309389",
    urn: "146736",
    provider: "Alchemy School",
    date: "2026-07-14",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/146736",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50309389",
  },
  {
    id: "50308721",
    urn: "140555",
    provider: "Djanogly Strelley Academy",
    date: "2026-06-23",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/21/140555",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50308721",
  },
  {
    id: "50310061",
    urn: "142572",
    provider: "Talmud Torah London",
    date: "2026-06-02",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/27/142572",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50310061",
  },
  {
    id: "50295804",
    urn: "144225",
    provider: "Hetton Lyons Primary School",
    date: "2026-02-20",
    inspectionType: "School inspection",
    pageUrl: "https://reports.ofsted.gov.uk/provider/21/144225",
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50295804",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ofstedInspectionsDir(): string {
  if (env("OFSTED_INSPECTIONS_DIR")) return resolve(env("OFSTED_INSPECTIONS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ofsted-inspections"));
}

export function snapshotPath(): string {
  return join(ofstedInspectionsDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/ofsted-inspections/seed-snapshot.json"),
    join(here, "fixtures/ofsted-inspections/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function officialReportId(raw: string | undefined): string | null {
  const t = String(raw || "").trim();
  if (!FILE_ID_RE.test(t)) return null;
  return t;
}

export function officialUrn(raw: string | undefined): string | null {
  const t = String(raw || "").trim().toUpperCase();
  if (!URN_RE.test(t)) return null;
  if (/^RP/i.test(t)) return null;
  return t;
}

export function namedDateToIso(raw: string | undefined): string | null {
  const t = String(raw || "").trim();
  const named = t.match(
    /^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i,
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
    const mm = months[named[2].toLowerCase()];
    if (mm) return `${named[3]}-${mm}-${named[1].padStart(2, "0")}`;
  }
  const iso = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

export function officialPageUrl(raw: string | undefined): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t, "https://reports.ofsted.gov.uk");
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!OFFICIAL_PAGE_HOSTS.has(u.hostname)) return null;
  if (!/^\/provider\/\d+\/[A-Z0-9]+$/i.test(u.pathname)) return null;
  if (/\/provider\/49\//i.test(u.pathname)) return null;
  return `https://reports.ofsted.gov.uk${u.pathname}`;
}

export function officialInspectionPdfUrl(raw: string | undefined): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t, PDF_ORIGIN);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!OFFICIAL_FILE_HOSTS.has(u.hostname)) return null;
  const m = u.pathname.match(/^\/v1\/file\/(\d{5,})$/);
  if (!m) return null;
  return `${PDF_ORIGIN}/v1/file/${m[1]}`;
}

export function isOfficialInspectionPdf(href: string): boolean {
  return Boolean(officialInspectionPdfUrl(href));
}

function decodeEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function parseProviderHtml(html: string, pageUrl: string): OfstedInspectionListing[] {
  const officialPage = officialPageUrl(pageUrl);
  if (!officialPage) return [];
  const urn = officialUrn(officialPage.split("/").pop() || "") || "";
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const provider = nameMatch ? stripTags(nameMatch[1]) : urn;
  const urnMatch = html.match(/\bURN:\s*([A-Z0-9]+)/i);
  const pageUrn = officialUrn(urnMatch?.[1] || urn) || urn;
  const out: OfstedInspectionListing[] = [];
  const seen = new Set<string>();
  const re =
    /<a class="publication-link"[^>]+href="(https:\/\/files\.ofsted\.gov\.uk\/v1\/file\/(\d+))"[^>]*>([\s\S]*?)<\/a>([\s\S]{0,420})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const sourceUrl = officialInspectionPdfUrl(m[1]);
    const id = officialReportId(m[2]);
    if (!sourceUrl || !id || seen.has(id)) continue;
    const blob = stripTags(`${m[3]} ${m[4]}`);
    if (ACADEMY_CONVERSION.test(blob)) continue;
    if (/\bmonitoring visit\b/i.test(blob) && !/\b(school inspection|full inspection)\b/i.test(blob)) {
      continue;
    }
    const typeMatch = blob.match(
      /\b(School inspection|Full inspection|Short inspection|Inspection report|Material change inspection|Pre-registration inspection)\b/i,
    );
    const dates = [...blob.matchAll(
      /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/gi,
    )].map((d) => namedDateToIso(d[1]));
    const published = /\bPublished\b/i.test(blob) ? dates.at(-1) ?? dates[0] ?? null : dates[0] ?? null;
    seen.add(id);
    out.push({
      id,
      urn: pageUrn,
      provider,
      date: published,
      inspectionType: typeMatch ? typeMatch[1] : "School inspection",
      pageUrl: officialPage,
      sourceUrl,
    });
  }
  return out;
}

export function parseListingRows(rows: OfstedInspectionListing[]): OfstedInspectionListing[] {
  const out: OfstedInspectionListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const sourceUrl = officialInspectionPdfUrl(row.sourceUrl);
    const pageUrl = officialPageUrl(row.pageUrl) || row.pageUrl;
    const id = officialReportId(row.id) || officialReportId(sourceUrl?.split("/").pop());
    if (!sourceUrl || !id || seen.has(id)) continue;
    if (isPeopleRow(row)) continue;
    seen.add(id);
    out.push({
      id,
      urn: officialUrn(row.urn) || "",
      provider: String(row.provider || id).replace(/\s+/g, " ").trim(),
      date: namedDateToIso(row.date ?? undefined) ?? row.date ?? null,
      inspectionType: String(row.inspectionType || "School inspection").trim(),
      pageUrl,
      sourceUrl,
    });
  }
  return out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
}

export function isPeopleRow(row: Pick<OfstedInspectionListing, "provider" | "urn" | "id">): boolean {
  const blob = `${row.provider || ""} ${row.urn || ""} ${row.id || ""}`;
  if (CHILDMINDER_PEOPLE.test(blob) && !/\b(school|academy|college|nursery|provider)\b/i.test(blob)) {
    return true;
  }
  return PEOPLE_ONLY.test(blob) && !/\b(ofsted|urn|school|inspection)\b/i.test(blob);
}

function looksLikePeopleDump(text: string): boolean {
  return PEOPLE_ONLY.test(text) && !/\b(office for standards in education|ofsted)\b/i.test(text);
}

export function isRealOfstedInspectionBody(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length < MIN_BODY_CHARS) return false;
  if (looksLikePeopleDump(t)) return false;
  if (ACADEMY_CONVERSION.test(t) && !/\bwhat is it like to attend this school\b/i.test(t)) return false;
  if (/"urn"\s*:/.test(t) && /("latestInspection"|"judgements")\s*:/.test(t) && !/\bwhat is it like to attend\b/i.test(t)) {
    return false;
  }
  if (/\bno inspection narrative in this teaser\b/i.test(t)) return false;
  if (/\bauthorization to discharge\b/i.test(t) && /\bnpdes\b/i.test(t)) return false;
  if (/\bintegrated review\b/i.test(t) && /\bcenter for drug evaluation\b/i.test(t)) return false;
  if (/\barticle 20 referral\b/i.test(t)) return false;
  const hasOfsted = /\bofsted\b|\boffice for standards in education\b/i.test(t);
  const hasInspection =
    /\binspection of\b|\bschool report\b|\binspection (?:report|dates?)\b|\bmaterial change inspection\b|\bpre-registration inspection\b/i.test(
      t,
    );
  const hasNarrative =
    /\bwhat is it like to attend this school\b|\bwhat does the school do well\b|\bquality of education\b|\bindependent school standards\b|\bsafeguarding standards\b|\bpersonal development\b|\bpupils (?:generally )?achieve\b|\bthe school is\b/i.test(
      t,
    );
  return hasOfsted && hasInspection && hasNarrative;
}

export function parseOfstedInspectionText(
  text: string,
  meta: {
    sourceUrl: string;
    pageUrl?: string;
    provider?: string;
    urn?: string;
    date?: string | null;
    inspectionType?: string;
    id?: string;
    kind?: string;
  },
): OfstedInspectionCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialInspectionPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const id = officialReportId(meta.id) || officialReportId(sourceUrl.split("/").pop()) || sourceUrl;
  const pageUrl = officialPageUrl(meta.pageUrl) || meta.pageUrl || INDEX_URL;
  let urn = officialUrn(meta.urn) || "";
  if (!urn) {
    const m = body.match(/\b(?:URN|Unique reference number)\s*[:.]?\s*([A-Z0-9]{3,12})\b/i);
    if (m) urn = officialUrn(m[1]) || "";
  }
  let provider = String(meta.provider || "").replace(/\s+/g, " ").trim();
  if (!provider) {
    const m = body.match(/Inspection of\s+([^\n]+)/i);
    if (m) provider = m[1].replace(/\s+/g, " ").trim();
  }
  return {
    id,
    urn,
    provider: provider || id,
    date: meta.date ?? null,
    inspectionType: meta.inspectionType || "School inspection",
    pageUrl,
    sourceUrl,
    kind: meta.kind || "inspection-report",
    body,
  };
}

export function emptyOfstedInspectionsSnapshot(reason: string): OfstedInspectionsSnapshot {
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
      pdfHost: `${PDF_ORIGIN}/v1/file/`,
      pageHost: INDEX_URL,
    },
    cards: [],
  };
}

export function assembleOfstedInspectionsSnapshot(
  cards: OfstedInspectionCard[],
  fetchedAt = new Date().toISOString(),
): OfstedInspectionsSnapshot {
  const withBody = cards
    .filter((c) => isRealOfstedInspectionBody(c.body) && officialInspectionPdfUrl(c.sourceUrl))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason:
      withBody.length > 0
        ? null
        : "Official Ofsted inspection-report PDFs had no extractable inspection text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      index: INDEX_URL,
      pdfHost: `${PDF_ORIGIN}/v1/file/`,
      pageHost: INDEX_URL,
    },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): OfstedInspectionsSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as OfstedInspectionsSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readOfstedInspectionsSnapshot(): OfstedInspectionsSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("OFSTED_INSPECTIONS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeOfstedInspectionsSnapshot(snap: OfstedInspectionsSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchOfstedText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/json,*/*" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchOfstedBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,*/*" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${url} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("OFSTED_INSPECTIONS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function listingDir(): string {
  return env("OFSTED_INSPECTIONS_HTML_DIR") || env("OFSTED_INSPECTIONS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("OFSTED_INSPECTIONS_LIMIT", "16"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 16;
}

function maxFetchLimit(): number {
  const n = Number(env("OFSTED_INSPECTIONS_MAX_FETCH", "20"));
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

async function loadOfficialListings(
  dir: string,
): Promise<{ listed: OfstedInspectionListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html", "provider.html"]);
    const fromHtml = html
      ? parseProviderHtml(html, "https://reports.ofsted.gov.uk/provider/21/116780")
      : [];
    const extra = SEED_LISTINGS.filter((row) => existsSync(join(dir, `${row.id}.txt`)));
    const listed = parseListingRows([...fromHtml, ...extra]);
    return { listed, listedCount: listed.length };
  }
  return { listed: parseListingRows(SEED_LISTINGS), listedCount: SEED_LISTINGS.length };
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function collectOfstedInspections(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<OfstedInspectionsSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ofstedInspectionsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, OfstedInspectionCard>();
  for (const card of readOfstedInspectionsSnapshot()?.cards ?? []) {
    if (isRealOfstedInspectionBody(card.body)) prior.set(card.id, card);
  }
  const cards: OfstedInspectionCard[] = [];
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
      const sourceUrl = officialInspectionPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchOfstedBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseOfstedInspectionText(text, {
        sourceUrl,
        pageUrl: row.pageUrl,
        provider: row.provider,
        urn: row.urn,
        date: row.date,
        inspectionType: row.inspectionType,
        id: row.id,
        kind: "inspection-report",
      });
      if (!isRealOfstedInspectionBody(parsed.body)) {
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
    ...assembleOfstedInspectionsSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeOfstedInspectionsSnapshot(snap);
  return snap;
}

export async function loadOfstedInspections(): Promise<OfstedInspectionsSnapshot> {
  const cached = readOfstedInspectionsSnapshot();
  if (cached) {
    const filtered = assembleOfstedInspectionsSnapshot(cached.cards, cached.fetchedAt);
    if (filtered.cards.length) return { ...cached, ...filtered };
  }
  try {
    return await collectOfstedInspections();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealOfstedInspectionBody(c.body)) ? "stale" : "empty",
        reason: `Live Ofsted inspection-report fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyOfstedInspectionsSnapshot(
      `Ofsted inspection-report PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildOfstedInspectionsManifest(
  snap: OfstedInspectionsSnapshot | null,
): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealOfstedInspectionBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      OFSTED_INSPECTIONS_PATH,
      "Count + provider + URN + date + official inspection PDF URL only. Report body is the paid GET /ofsted-inspections payload. This free manifest lists the full catalog. Keyed on report id / URN / provider, not inspector or pupil names.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: OFSTED_INSPECTIONS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      urn: c.urn,
      provider: c.provider,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "urn", "provider", "date", "sourceUrl"] },
    sources: snap?.sources ?? {
      index: INDEX_URL,
      pdfHost: `${PDF_ORIGIN}/v1/file/`,
      pageHost: INDEX_URL,
    },
  };
}

export async function loadOfstedInspectionsManifest(): Promise<Record<string, unknown>> {
  return buildOfstedInspectionsManifest(readOfstedInspectionsSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectOfstedInspections()
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
              urn: c.urn,
              provider: c.provider,
              date: c.date,
              inspectionType: c.inspectionType,
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
