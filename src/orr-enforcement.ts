/**
 * ORR-authored Railways Act 1993 s.55 enforcement TEXT door.
 * Official PDFs on orr.gov.uk/sites/default/files/ and /media/{id}/download only.
 * Crown / OGL v3.0. Does not invent notice text. Does not sell the HTML
 * card (index + teaser only). Skip people files. Skip open-data CSVs.
 * Does not wrap GOV.UK correspondence HTML. Does not list EIS.
 * Does not apply NPDES. Not Ofgem / Ofwat / Ofsted / RAIB / MAIB.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function paidBodyCatalogNote(path: string, detail: string): string {
  return `Free index for ${path}. ${detail} GET ${path}?id= is one official text ($0.02). Plain GET ${path} is the newest 10 official texts ($0.05).`;
}

export const ORR_ENFORCEMENT_PATH = "/orr-enforcement";
export const ORR_ENFORCEMENT_MANIFEST_PATH = "/orr-enforcement/manifest.json";
export const ORR_ENFORCEMENT_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "orr-enforcement-bodies";
export const PRODUCT_NAME = "ORR Railways Act 1993 s.55 enforcement-notice text";

export const HUB_URL = "https://www.orr.gov.uk/monitoring-regulation/rail/investigations";
export const NORTHERN_PAGE =
  "https://www.orr.gov.uk/monitoring-regulation/rail/investigations/northern-trains-limited";
export const WALES_WESTERN_PAGE =
  "https://www.orr.gov.uk/monitoring-regulation/rail/investigations/wales-western";
export const PDF_HOST = "www.orr.gov.uk";
export const PDF_ORIGIN = "https://www.orr.gov.uk";
export const LICENSE = "Crown copyright / Open Government Licence v3.0";
export const ATTRIBUTION =
  "Office of Rail and Road. Contains public sector information licensed under the Open Government Licence v3.0. Logos reserved.";

export const CARD_FIELDS = [
  "id",
  "docket",
  "institution",
  "date",
  "kind",
  "title",
  "pageUrl",
  "sourceUrl",
  "body",
] as const;

export type OrrEnforcementListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  kind: string;
  title: string;
  pageUrl: string;
  sourceUrl: string;
};

export type OrrEnforcementCard = OrrEnforcementListing & { body: string };

export type OrrEnforcementSnapshot = {
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
  sources: { index: string; pdfHost: string };
  cards: OrrEnforcementCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (ORR Railways Act 1993 s.55 texts; +https://www.orr.gov.uk/monitoring-regulation/rail/investigations)";
const OFFICIAL_HOSTS = new Set(["orr.gov.uk", "www.orr.gov.uk"]);
const FILES_YM_RE = /^\/sites\/default\/files\/(\d{4})-(\d{2})\/([^/?#]+\.pdf)$/i;
const FILES_OM_RE = /^\/sites\/default\/files\/om\/([^/?#]+\.pdf)$/i;
const MEDIA_RE = /^\/media\/(\d+)\/download\/?$/i;
const MIN_BODY_CHARS = 2000;
const PEOPLE_ONLY =
  /\b(curriculum vitae|cv(?: of)?|date of birth|home address|passport number|private email|our people|board member biography|senior leadership biographies)\b/i;
const OPEN_DATA = /\b(open data|performance data pack|regulatory reporting pack)\b/i;
const CSV_OR_JSON_WRAP = /^\s*[\[{]|^\s*"[^"]+",|^\s*\w+,(\w+,)+\w+/;
const HTML_TEASER =
  /\b(read the (?:full )?(?:notice|decision|document)|download the pdf|this page is an index)\b/i;
const FOREIGN_REGULATOR =
  /\b(ofgem|ofwat|ofsted|raib|maib|npdes|environmental impact statement|\beis\b)\b/i;
const FOREIGN_HOST =
  /\b(ofgem\.gov\.uk|ofwat\.gov\.uk|ofsted\.gov\.uk|raib\.gov\.uk|maib\.gov\.uk|gov\.uk\/government\/)\b/i;

export const SEED_LISTINGS: OrrEnforcementListing[] = [
  {
    id: "orr-to-northern-trains-limited-statutory-notice-dated-3-march-2026",
    docket: "northern-s55-notice-2026-03-03",
    institution: "Northern Trains Limited",
    date: "2026-03-03",
    kind: "statutory-notice",
    title:
      "Notice in accordance with section 55(6) of the Railways Act 1993 — Northern Trains Limited Condition 5 (Accessible Travel Policy)",
    pageUrl: NORTHERN_PAGE,
    sourceUrl:
      "https://www.orr.gov.uk/sites/default/files/2026-03/orr-to-northern-trains-limited-statutory-notice-dated-3-march-2026.pdf",
  },
  {
    id: "orr-northern-trains-limited-investigation-report-march-2026",
    docket: "northern-investigation-report-2026-03",
    institution: "Northern Trains Limited",
    date: "2026-03-03",
    kind: "investigation-report",
    title: "ORR: Northern Trains Limited investigation report - March 2026",
    pageUrl: NORTHERN_PAGE,
    sourceUrl:
      "https://www.orr.gov.uk/sites/default/files/2026-03/orr-northern-trains-limited-investigation-report-march-2026.pdf",
  },
  {
    id: "wales-and-western-investigation-licence-final-order-2024-07-10",
    docket: "nr-wales-western-final-order-2024-07-10",
    institution: "Network Rail Infrastructure Limited",
    date: "2024-07-10",
    kind: "final-order",
    title:
      "Contravention of condition 1 of Network Rail’s network licence — Wales & Western: Final Order dated 10 July 2024",
    pageUrl: WALES_WESTERN_PAGE,
    sourceUrl:
      "https://www.orr.gov.uk/sites/default/files/2024-07/wales-and-western-investigation-licence-final-order-2024-07-10.pdf",
  },
  {
    id: "2024-05-29-wales-and-western-investigation-licence-draft-order",
    docket: "nr-wales-western-s56-notice-2024-05-29",
    institution: "Network Rail Infrastructure Limited",
    date: "2024-05-29",
    kind: "statutory-notice",
    title:
      "Notice in accordance with section 56 of the Railways Act 1993 — proposal to make a Final Order, Wales & Western, 29 May 2024",
    pageUrl: WALES_WESTERN_PAGE,
    sourceUrl:
      "https://www.orr.gov.uk/sites/default/files/2024-05/2024-05-29-wales-and-western-investigation-licence-draft-order.pdf",
  },
  {
    id: "2024-05-28-wales-and-western-investigation-report",
    docket: "nr-wales-western-investigation-report-2024-05-28",
    institution: "Network Rail Infrastructure Limited",
    date: "2024-05-28",
    kind: "investigation-report",
    title: "Wales & Western region - Network Rail: May 2024 investigation report",
    pageUrl: WALES_WESTERN_PAGE,
    sourceUrl:
      "https://www.orr.gov.uk/sites/default/files/2024-05/2024-05-28-wales-and-western-investigation-report.pdf",
  },
  {
    id: "enhancements-notice-2015-10-16",
    docket: "nr-enhancements-s55-notice-2015-10-16",
    institution: "Network Rail Infrastructure Limited",
    date: "2015-10-16",
    kind: "statutory-notice",
    title:
      "Notice in accordance with section 55(6) of the Railways Act 1993 — Network Rail enhancements, 16 October 2015",
    pageUrl: HUB_URL,
    sourceUrl: "https://www.orr.gov.uk/sites/default/files/om/enhancements-notice-2015-10-16.pdf",
  },
];

const MEDIA_TO_FILES: Record<string, string> = {
  "28057":
    "https://www.orr.gov.uk/sites/default/files/2026-03/orr-to-northern-trains-limited-statutory-notice-dated-3-march-2026.pdf",
  "28053":
    "https://www.orr.gov.uk/sites/default/files/2026-03/orr-northern-trains-limited-investigation-report-march-2026.pdf",
  "25603":
    "https://www.orr.gov.uk/sites/default/files/2024-07/wales-and-western-investigation-licence-final-order-2024-07-10.pdf",
  "25520":
    "https://www.orr.gov.uk/sites/default/files/2024-05/2024-05-29-wales-and-western-investigation-licence-draft-order.pdf",
  "25518":
    "https://www.orr.gov.uk/sites/default/files/2024-05/2024-05-28-wales-and-western-investigation-report.pdf",
};

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function orrEnforcementDir(): string {
  if (env("ORR_ENFORCEMENT_DIR")) return resolve(env("ORR_ENFORCEMENT_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/orr-enforcement"));
}

export function snapshotPath(): string {
  return join(orrEnforcementDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/orr-enforcement/seed-snapshot.json"),
    join(here, "fixtures/orr-enforcement/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function officialOrrPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const u = new URL(urlOrPath, PDF_ORIGIN);
    if (!OFFICIAL_HOSTS.has(u.hostname.toLowerCase())) return null;
    const path = decodeURIComponent(u.pathname.replace(/\/+/g, "/"));
    const media = path.match(MEDIA_RE);
    if (media) {
      const mapped = MEDIA_TO_FILES[media[1]];
      if (mapped) return mapped;
      return `${PDF_ORIGIN}/media/${media[1]}/download`;
    }
    const ym = path.match(FILES_YM_RE);
    if (ym) {
      const file = encodeURIComponent(ym[3]).replace(/%2E/gi, ".");
      return `${PDF_ORIGIN}/sites/default/files/${ym[1]}-${ym[2]}/${file}`;
    }
    const om = path.match(FILES_OM_RE);
    if (om) {
      const file = encodeURIComponent(om[1]).replace(/%2E/gi, ".");
      return `${PDF_ORIGIN}/sites/default/files/om/${file}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function isOfficialOrrPdf(url: string | null | undefined): boolean {
  return Boolean(officialOrrPdfUrl(url));
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialOrrPdfUrl(url);
  if (!official) return null;
  try {
    const u = new URL(official);
    const media = u.pathname.match(MEDIA_RE);
    if (media) return media[1];
    const name = decodeURIComponent(u.pathname.split("/").pop() || "");
    return name.replace(/\.pdf$/i, "") || null;
  } catch {
    return null;
  }
}

export function isPeopleRow(row: Pick<OrrEnforcementListing, "institution" | "title" | "id">): boolean {
  const blob = `${row.institution || ""} ${row.title || ""} ${row.id || ""}`;
  if (/\b(northern trains|network rail|orr|office of rail)\b/i.test(blob)) return false;
  return PEOPLE_ONLY.test(blob) || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test((row.institution || "").trim());
}

export function isOpenDataOrCsvUrl(url: string | null | undefined): boolean {
  const t = String(url || "").toLowerCase();
  return /\.(csv|json|xml|txt)(?:[?#]|$)/.test(t) || /\/(?:open-data|performance-data)\b/.test(t);
}

export function isForeignOrOutOfScopeUrl(url: string | null | undefined): boolean {
  const t = String(url || "").toLowerCase();
  return FOREIGN_HOST.test(t) || /\/eis\/|npdes/i.test(t);
}

export function parseHubHtml(html: string, pageUrl = HUB_URL): OrrEnforcementListing[] {
  const out: OrrEnforcementListing[] = [];
  const seen = new Set<string>();
  const hrefRe = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html))) {
    const raw = m[1].replace(/&amp;/g, "&");
    if (isForeignOrOutOfScopeUrl(raw) || isOpenDataOrCsvUrl(raw)) continue;
    let abs: string | null = null;
    try {
      abs = officialOrrPdfUrl(new URL(raw, pageUrl).toString());
    } catch {
      abs = null;
    }
    if (!abs) continue;
    const id = pdfIdFromUrl(abs);
    if (!id || seen.has(id) || isOpenDataOrCsvUrl(abs)) continue;
    seen.add(id);
    const around = html.slice(Math.max(0, m.index - 400), Math.min(html.length, m.index + 400));
    const title = decodeEntities(around.replace(/<[^>]+>/g, " ")).slice(0, 180) || id;
    out.push({
      id,
      docket: id,
      institution: institutionFromBlob(title) || id,
      date: isoDate(around) ?? isoDate(abs),
      kind: kindFromBlob(`${title} ${id}`),
      title,
      pageUrl,
      sourceUrl: abs,
    });
  }
  return parseListingRows(out);
}

export function parseListingRows(rows: OrrEnforcementListing[]): OrrEnforcementListing[] {
  const out: OrrEnforcementListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const sourceUrl = officialOrrPdfUrl(row.sourceUrl);
    const id = row.id || pdfIdFromUrl(sourceUrl) || "";
    if (
      !sourceUrl ||
      !id ||
      seen.has(id) ||
      isPeopleRow({ ...row, id }) ||
      isOpenDataOrCsvUrl(sourceUrl) ||
      isForeignOrOutOfScopeUrl(sourceUrl)
    ) {
      continue;
    }
    seen.add(id);
    out.push({
      id,
      docket: row.docket || id,
      institution: row.institution || institutionFromBlob(row.title) || id,
      date: isoDate(row.date) ?? isoDate(sourceUrl),
      kind: row.kind || kindFromBlob(`${row.title} ${id}`),
      title: row.title || id,
      pageUrl: row.pageUrl || HUB_URL,
      sourceUrl,
    });
  }
  return out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
}

function institutionFromBlob(raw: string): string {
  const t = String(raw || "");
  if (/northern trains/i.test(t)) return "Northern Trains Limited";
  if (/network rail/i.test(t)) return "Network Rail Infrastructure Limited";
  return "";
}

function kindFromBlob(raw: string): string {
  const t = String(raw || "").toLowerCase();
  if (t.includes("investigation-report") || t.includes("investigation report")) return "investigation-report";
  if (t.includes("provisional-order") || t.includes("provisional order")) return "provisional-order";
  if (
    (t.includes("final-order") || t.includes("final order")) &&
    !/not to make a final order|decision not to make/.test(t)
  ) {
    return "final-order";
  }
  return "statutory-notice";
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ukNamed = String(raw).match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
  );
  if (ukNamed) {
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
    const mm = months[ukNamed[2].toLowerCase()];
    return mm ? `${ukNamed[3]}-${mm}-${ukNamed[1].padStart(2, "0")}` : null;
  }
  const ym = String(raw).match(/\/sites\/default\/files\/(\d{4})-(\d{2})\//);
  if (ym) return `${ym[1]}-${ym[2]}-01`;
  return null;
}

export function isIndexTeaserDump(text: string): boolean {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length < MIN_BODY_CHARS && HTML_TEASER.test(t)) return true;
  if (/this card is a teaser/i.test(t)) return true;
  return false;
}

export function isRealOrrEnforcementBody(text: string): boolean {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length < MIN_BODY_CHARS) return false;
  if (PEOPLE_ONLY.test(t) && !/\borr\b|\brailways act\b/i.test(t)) return false;
  if (OPEN_DATA.test(t) && !/\bsection 55\b|\bfinal order\b|\binvestigation report\b/i.test(t) && t.length < 8000) {
    return false;
  }
  if (CSV_OR_JSON_WRAP.test(t) && !/\brailways act\b/i.test(t)) return false;
  if (isIndexTeaserDump(t)) return false;
  if (FOREIGN_REGULATOR.test(t) && !/\boffice of rail and road\b|\borr\b/i.test(t)) return false;
  const hasOrr = /\borr\b|\boffice of rail and road\b|\boffice of rail regulation\b/i.test(t);
  if (!hasOrr) return false;
  const hasStatute = /\brailways act 1993\b|\bsection 55\b|\bsection 56\b/i.test(t);
  const hasInvestigationReport =
    /\binvestigation report\b/i.test(t) &&
    /\b(licence|license|condition \d|accessible travel policy|network licence|gb snrp)\b/i.test(t);
  const hasEnforcement =
    /\bstatutory notice\b|\bfinal order\b|\bprovisional order\b|\bsection 55\(6\)\b|\bnotice in accordance with section 55\b|\bnotice in accordance with section 56\b/i.test(
      t,
    );
  return (hasStatute && hasEnforcement) || hasInvestigationReport;
}

export function parseOrrEnforcementText(
  text: string,
  meta: Partial<OrrEnforcementListing> & { sourceUrl: string },
): OrrEnforcementCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialOrrPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const id = meta.id || pdfIdFromUrl(sourceUrl) || sourceUrl;
  return {
    id,
    docket: meta.docket || id,
    institution: meta.institution || institutionFromBlob(`${meta.title || ""} ${body.slice(0, 800)}`) || id,
    date: isoDate(meta.date) ?? isoDate(body.slice(0, 1200)) ?? isoDate(sourceUrl),
    kind: meta.kind || kindFromBlob(`${meta.title || ""} ${id}`),
    title: meta.title || id,
    pageUrl: meta.pageUrl || HUB_URL,
    sourceUrl,
    body,
  };
}

export function emptyOrrEnforcementSnapshot(reason: string): OrrEnforcementSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: HUB_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/` },
    cards: [],
  };
}

export function assembleOrrEnforcementSnapshot(
  cards: OrrEnforcementCard[],
  fetchedAt = new Date().toISOString(),
): OrrEnforcementSnapshot {
  const withBody = cards
    .filter((c) => isRealOrrEnforcementBody(c.body) && officialOrrPdfUrl(c.sourceUrl))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason:
      withBody.length > 0
        ? null
        : "Official ORR enforcement PDFs had no extractable s.55 statutory-notice / final-order / investigation-report text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: HUB_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): OrrEnforcementSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as OrrEnforcementSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readOrrEnforcementSnapshot(): OrrEnforcementSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("ORR_ENFORCEMENT_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeOrrEnforcementSnapshot(snap: OrrEnforcementSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchOrrBytes(url: string): Promise<Uint8Array> {
  const official = officialOrrPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,*/*" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error(`${official} is not an official PDF`);
  }
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("ORR_ENFORCEMENT_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function listingDir(): string {
  return env("ORR_ENFORCEMENT_HTML_DIR") || env("ORR_ENFORCEMENT_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("ORR_ENFORCEMENT_LIMIT", "6"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
}

function maxFetchLimit(): number {
  const n = Number(env("ORR_ENFORCEMENT_MAX_FETCH", "6"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
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
): Promise<{ listed: OrrEnforcementListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html", "hub.html"]);
    const fromHtml = html ? parseHubHtml(html, HUB_URL) : [];
    const extra = SEED_LISTINGS.filter((row) => existsSync(join(dir, `${row.id}.txt`)));
    const listed = parseListingRows([...extra, ...fromHtml]);
    return { listed, listedCount: listed.length };
  }
  return { listed: parseListingRows(SEED_LISTINGS), listedCount: SEED_LISTINGS.length };
}

export async function collectOrrEnforcement(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<OrrEnforcementSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = orrEnforcementDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, OrrEnforcementCard>();
  for (const card of readOrrEnforcementSnapshot()?.cards ?? []) {
    if (isRealOrrEnforcementBody(card.body)) prior.set(card.id, card);
  }
  const cards: OrrEnforcementCard[] = [];
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
      const localText = readNamedFile(dir, [`${row.id}.txt`, `${row.docket}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialOrrPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchOrrBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseOrrEnforcementText(text, { ...row, sourceUrl });
      if (!isRealOrrEnforcementBody(parsed.body)) {
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
    ...assembleOrrEnforcementSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeOrrEnforcementSnapshot(snap);
  return snap;
}

export async function loadOrrEnforcement(): Promise<OrrEnforcementSnapshot> {
  const cached = readOrrEnforcementSnapshot();
  if (cached) {
    const filtered = assembleOrrEnforcementSnapshot(cached.cards, cached.fetchedAt);
    if (filtered.cards.length) return { ...cached, ...filtered };
  }
  try {
    return await collectOrrEnforcement();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealOrrEnforcementBody(c.body)) ? "stale" : "empty",
        reason: `Live ORR enforcement fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyOrrEnforcementSnapshot(
      `ORR enforcement PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildOrrEnforcementManifest(
  snap: OrrEnforcementSnapshot | null,
): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealOrrEnforcementBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      ORR_ENFORCEMENT_PATH,
      "Count + institution + docket + date + official ORR PDF URL only. Notice body is the paid GET /orr-enforcement payload. This free manifest lists the full catalog. HTML publication cards, people files, GOV.UK correspondence, EIS, and open-data CSVs are not sold.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: ORR_ENFORCEMENT_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      docket: c.docket,
      institution: c.institution,
      date: c.date,
      kind: c.kind,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "docket", "institution", "date", "kind", "sourceUrl"] },
    sources: snap?.sources ?? { index: HUB_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/` },
  };
}

export async function loadOrrEnforcementManifest(): Promise<Record<string, unknown>> {
  return buildOrrEnforcementManifest(readOrrEnforcementSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectOrrEnforcement()
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
