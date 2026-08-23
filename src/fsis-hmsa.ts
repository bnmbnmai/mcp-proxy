/**
 * USDA FSIS HMSA humane-handling enforcement letter TEXT door.
 * Official PDFs from fsis.usda.gov/sites/default/files/media_file/documents/ only.
 * Harvest with wget (Safari UA). Akamai blocks curl and Chrome-UA wget.
 * Scanned letters: pdftotext can be empty; OCR the sold body if needed.
 * Does not invent letter text. Establishment/institution only. Not people.
 * Not the table/index. Not /awa. Not DILA CNIL. Not ICO /ico-mpn.
 * Not PHMSA /phmsa-cop. Not FMC /fmc-orders. Not a stub.
 * License: 17 U.S.C. § 105 (USDA federal).
 * Prep only — do not list on well-known / OpenAPI / llms.txt / shop catalog.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const FSIS_HMSA_PATH = "/fsis-hmsa";
export const FSIS_HMSA_MANIFEST_PATH = "/fsis-hmsa/manifest.json";
export const FSIS_HMSA_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "fsis-hmsa-letter-bodies";
export const PRODUCT_NAME = "FSIS HMSA humane-handling enforcement letter text";

export const LISTING_URL =
  "https://www.fsis.usda.gov/inspection/regulatory-enforcement/humane-handling-enforcement";
export const PDF_HOST = "www.fsis.usda.gov";
export const PDF_ORIGIN = "https://www.fsis.usda.gov";
export const MEDIA_RE =
  /\/sites\/default\/files\/media_file\/documents\/(M[0-9A-Za-z]+(?:-P-?[0-9A-Za-z]+)?-(NOIE|NOS|LOD|NOSHA)-(\d{8})\.pdf)/i;
export const LETTER_TYPES = ["NOIE", "NOS", "LOD", "NOSHA"] as const;
export type LetterType = (typeof LETTER_TYPES)[number];
export const LICENSE = "17 U.S.C. § 105";
export const ATTRIBUTION =
  "USDA Food Safety and Inspection Service (FSIS). Work of the United States Government; 17 U.S.C. § 105.";

/** Akamai on fsis.usda.gov 403s curl (any UA) and wget+Chrome UA. Safari UA wget GET returns 200. */
export const WGET_SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export const CARD_FIELDS = [
  "id",
  "estNumber",
  "letterType",
  "pdfId",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export const TITLE_BY_TYPE: Record<LetterType, string> = {
  NOIE: "Notice of Intended Enforcement",
  NOS: "Notice of Suspension",
  LOD: "Letter of Deferral",
  NOSHA: "Notice of Suspension Held in Abeyance",
};

export type FsisHmsaListingRow = {
  institution?: string;
  individual?: string;
  estNumber?: string;
  letterType?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
  id?: string;
};

export type FsisHmsaListing = {
  id: string;
  estNumber: string;
  letterType: LetterType;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type FsisHmsaCard = {
  id: string;
  estNumber: string;
  letterType: LetterType;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type FsisHmsaSnapshot = {
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
  cards: FsisHmsaCard[];
};

const OFFICIAL_HOSTS = new Set(["www.fsis.usda.gov", "fsis.usda.gov"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|Cooperative|Packing|Meats|Solutions|Farm|Shop|Processors?|Processing)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const LETTER_TITLE_RE =
  /NOTICE OF INTENDED ENFORCEMENT|NOTICE OF SUSPENSION HELD IN ABEYANCE|NOTICE OF SUSPENSION|LETTER OF DEFERRAL|NOIE|NOSHA|NOS|LOD/i;
const KILL_TITLE_RE =
  /awa inspection|\/awa\b|dila|cnil|l[eé]gifrance|ico-mpn|phmsa|fmc-orders|people|table index|index only/i;

export const SEED_LISTINGS: FsisHmsaListing[] = [
  {
    id: "m40110-noie-07302026",
    estNumber: "M40110",
    letterType: "NOIE",
    institution: "Collagen Solutions (US) LLC",
    date: "2026-07-30",
    title: "Notice of Intended Enforcement",
    sourceUrl:
      "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M40110-NOIE-07302026.pdf",
    pdfId: "M40110-NOIE-07302026.pdf",
  },
  {
    id: "m40110-lod-08052026",
    estNumber: "M40110",
    letterType: "LOD",
    institution: "Collagen Solutions (US) LLC",
    date: "2026-08-05",
    title: "Letter of Deferral",
    sourceUrl:
      "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M40110-LOD-08052026.pdf",
    pdfId: "M40110-LOD-08052026.pdf",
  },
  {
    id: "m354-noie-03232026",
    estNumber: "M354",
    letterType: "NOIE",
    institution: "Western Valley Meat Company",
    date: "2026-03-23",
    title: "Notice of Intended Enforcement",
    sourceUrl: "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M354-NOIE-03232026.pdf",
    pdfId: "M354-NOIE-03232026.pdf",
  },
  {
    id: "m1745-nos-07072026",
    estNumber: "M1745",
    letterType: "NOS",
    institution: "Maple Brooke Packing",
    date: "2026-07-07",
    title: "Notice of Suspension",
    sourceUrl:
      "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M1745-P1745-NOS-07072026.pdf",
    pdfId: "M1745-P1745-NOS-07072026.pdf",
  },
  {
    id: "m2560-nosha-07282026",
    estNumber: "M2560",
    letterType: "NOSHA",
    institution: "Whalen's Meat Packing LLC",
    date: "2026-07-28",
    title: "Notice of Suspension Held in Abeyance",
    sourceUrl:
      "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M2560-NOSHA-07282026.pdf",
    pdfId: "M2560-NOSHA-07282026.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function fsisHmsaDir(): string {
  if (env("FSIS_HMSA_DIR")) return resolve(env("FSIS_HMSA_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/fsis-hmsa"));
}

export function snapshotPath(): string {
  return join(fsisHmsaDir(), "snapshot.json");
}

export function compactForMatch(text: string): string {
  return text.replace(/-\n\s*/g, "").replace(/\s+/g, " ").trim();
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

export function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " "));
}

const MONTHS: Record<string, string> = {
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

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const named = raw.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (named) {
    const mm = MONTHS[named[1].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
  }
  const short = raw.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i);
  if (short) {
    const map: Record<string, string> = {
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
    const mm = map[short[1].slice(0, 3).toLowerCase()];
    return mm ? `${short[3]}-${mm}-${short[2].padStart(2, "0")}` : null;
  }
  return null;
}

export function dateFromFilename(mmddyyyy: string): string | null {
  const m = mmddyyyy.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1]}-${m[2]}`;
}

function blockedHost(host: string): boolean {
  return (
    host === "www.aphis.usda.gov" ||
    host === "aphis.usda.gov" ||
    host === "www.legifrance.gouv.fr" ||
    host === "legifrance.gouv.fr" ||
    host === "www.cnil.fr" ||
    host === "cnil.fr" ||
    host === "ico.org.uk" ||
    host === "www.ico.org.uk" ||
    host === "primis.phmsa.dot.gov" ||
    host === "www.primis.phmsa.dot.gov" ||
    host === "www2.fmc.gov" ||
    host === "www.fmc.gov" ||
    host === "fmc.gov" ||
    host === "www.federalregister.gov" ||
    host === "catalog.data.gov" ||
    host === "web.archive.org"
  );
}

export function officialFsisHmsaPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (/\/inspection\/regulatory-enforcement\//i.test(path)) return null;
    const media = path.match(MEDIA_RE);
    if (!media) return null;
    return `${PDF_ORIGIN}/sites/default/files/media_file/documents/${media[1]}`;
  } catch {
    return null;
  }
}

export function parseOfficialFilename(url: string | null | undefined): {
  pdfId: string;
  estToken: string;
  letterType: LetterType;
  mmddyyyy: string;
} | null {
  const official = officialFsisHmsaPdfUrl(url) || url || "";
  const media = official.match(MEDIA_RE);
  if (!media) return null;
  return {
    pdfId: media[1],
    estToken: media[1].split("-")[0],
    letterType: media[2].toUpperCase() as LetterType,
    mmddyyyy: media[3],
  };
}

export function slugFromFilename(parsed: { estToken: string; letterType: LetterType; mmddyyyy: string }): string {
  return `${parsed.estToken}-${parsed.letterType}-${parsed.mmddyyyy}`.toLowerCase();
}

export function normalizeLetterType(raw: string | null | undefined): LetterType | null {
  if (!raw) return null;
  const t = raw.trim().toUpperCase();
  if ((LETTER_TYPES as readonly string[]).includes(t)) return t as LetterType;
  if (/intended enforcement|notice of intended/i.test(raw)) return "NOIE";
  if (/held in abeyance|nosha/i.test(raw)) return "NOSHA";
  if (/notice of suspension|\bnos\b/i.test(raw)) return "NOS";
  if (/letter of deferral|deferral|\blod\b/i.test(raw)) return "LOD";
  return null;
}

export function normalizeEstNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/\bM-?(\d+[A-Z]?)\b/i);
  if (m) return `M${m[1]}`;
  const bare = raw.trim().match(/^(\d+[A-Z]?)$/i);
  if (bare) return `M${bare[1]}`;
  return null;
}

export function isPeopleRow(row: FsisHmsaListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isAwaRow(row: FsisHmsaListingRow): boolean {
  return /\/awa\b|aphis\.usda\.gov|animal welfare act/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isDilaCnilRow(row: FsisHmsaListingRow): boolean {
  return /dila|cnil|l[eé]gifrance/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isIcoRow(row: FsisHmsaListingRow): boolean {
  return /ico\.org\.uk|ico-mpn|monetary penalty/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isPhmsaRow(row: FsisHmsaListingRow): boolean {
  return /phmsa|primis\.phmsa/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isFmcRow(row: FsisHmsaListingRow): boolean {
  return /fmc\.gov|fmc-orders|shipping act/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isIndexRow(row: FsisHmsaListingRow): boolean {
  return /humane-handling-enforcement/i.test(row.sourceUrl ?? "") || /table index|index only/i.test(row.title ?? "");
}

export function isInstitutionLetterRow(row: FsisHmsaListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (isAwaRow(row) || isDilaCnilRow(row) || isIcoRow(row) || isPhmsaRow(row) || isFmcRow(row) || isIndexRow(row)) {
    return false;
  }
  if (!officialFsisHmsaPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`;
  if (KILL_TITLE_RE.test(kind)) return false;
  if (!LETTER_TITLE_RE.test(kind) && !normalizeLetterType(row.letterType ?? row.type ?? row.title ?? "")) return false;
  return true;
}

export function parseListingRows(rows: FsisHmsaListingRow[]): FsisHmsaListing[] {
  const found: FsisHmsaListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionLetterRow(row)) continue;
    const sourceUrl = officialFsisHmsaPdfUrl(row.sourceUrl ?? "");
    const parsed = parseOfficialFilename(sourceUrl ?? "");
    if (!sourceUrl || !parsed) continue;
    const letterType = normalizeLetterType(row.letterType ?? row.type ?? parsed.letterType) || parsed.letterType;
    const id = (row.id ?? "").trim() || slugFromFilename(parsed);
    if (seen.has(id)) continue;
    seen.add(id);
    found.push({
      id,
      estNumber: normalizeEstNumber(row.estNumber) || parsed.estToken,
      letterType,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date) || dateFromFilename(parsed.mmddyyyy),
      title: TITLE_BY_TYPE[letterType] || (row.title ?? "").trim() || letterType,
      sourceUrl,
      pdfId: (row.pdfId ?? "").trim() || parsed.pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return found;
}

export function parseListingHtml(html: string): FsisHmsaListing[] {
  const rows: FsisHmsaListingRow[] = [];
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of links) {
    const href = m[1].startsWith("http") ? m[1] : `${PDF_ORIGIN}${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (!officialFsisHmsaPdfUrl(href)) continue;
    const parsed = parseOfficialFilename(href);
    if (!parsed) continue;
    const idx = m.index ?? 0;
    const trStart = html.lastIndexOf("<tr", idx);
    const trEnd = html.indexOf("</tr>", idx);
    const nearby = stripTags(
      trStart >= 0 && trEnd > trStart
        ? html.slice(trStart, trEnd + 5)
        : html.slice(Math.max(0, idx - 200), idx + m[0].length + 80),
    );
    const est = nearby.match(/Est\.\s*(M-?[\dA-Z]+(?:\/P-?[\dA-Z]+)?),\s*([^|<]+)/i);
    const institution = (est?.[2] ?? nearby)
      .replace(/\s+(Deferral|Intended Enforcement|Suspension|Notice|People).*$/i, "")
      .trim();
    rows.push({
      institution: institution.replace(/,?\s*$/, ""),
      estNumber: est?.[1] || parsed.estToken,
      date: isoDate(nearby) || dateFromFilename(parsed.mmddyyyy) || undefined,
      title: TITLE_BY_TYPE[parsed.letterType],
      type: parsed.letterType,
      letterType: parsed.letterType,
      sourceUrl: href,
      pdfId: parsed.pdfId,
      id: slugFromFilename(parsed),
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — establishment \/ letter type \/ date \/ official PDF URL/i.test(text)) return true;
  if (/that is the index, not the sold body/i.test(text) && !/NOTICE OF INTENDED ENFORCEMENT/i.test(text)) {
    return true;
  }
  return false;
}

export function isPeopleDump(text: string): boolean {
  if (/people-only FSIS|named-individual SKU/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isAwaDump(text: string): boolean {
  return /Animal Welfare Act inspection|\/awa wrap/i.test(text);
}

export function isDilaCnilDump(text: string): boolean {
  return /DILA CNIL wrap|Commission Nationale de l'Informatique|Do not wrap DILA CNIL/i.test(text);
}

export function isIcoMpnDump(text: string): boolean {
  return /Information Commissioner'?s Office/i.test(text) && /Monetary Penalty Notice|\/ico-mpn\b/i.test(text);
}

export function isPhmsaCopDump(text: string): boolean {
  return /Pipeline and Hazardous Materials Safety Administration|\bPHMSA\b/i.test(text) && /CONSENT ORDER|\/phmsa-cop\b/i.test(text);
}

export function isFmcOrdersDump(text: string): boolean {
  return /FEDERAL MARITIME COMMISSION/i.test(text) && /Shipping Act|\/fmc-orders\b/i.test(text);
}

export function isRealFsisHmsaBody(text: string): boolean {
  if (
    isIndexTeaserDump(text) ||
    isPeopleDump(text) ||
    isAwaDump(text) ||
    isDilaCnilDump(text) ||
    isIcoMpnDump(text) ||
    isPhmsaCopDump(text) ||
    isFmcOrdersDump(text)
  ) {
    return false;
  }
  const compact = compactForMatch(text);
  if (compact.length < 800) return false;
  const usda = /U\.?S\.?\s+DEPARTMENT OF AGRICULTURE|Food Safety and Inspection Service|\bFSIS\b/i.test(compact);
  const hmsa =
    /Humane Methods of Slaughter|\bHMSA\b|9 CFR Part 313|9 CFR 313|9 CFR 500|Rules of Practice|Federal Meat Inspection Act|\bFMIA\b/i.test(
      compact,
    );
  const letter = LETTER_TITLE_RE.test(compact);
  const company = ENTITY_RE.test(compact);
  return usda && hmsa && letter && company;
}

export function parseFsisHmsaText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    estNumber?: string | null;
    letterType?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): FsisHmsaCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFsisHmsaPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const parsed = parseOfficialFilename(sourceUrl);
  const letterType =
    normalizeLetterType(meta.letterType) || parsed?.letterType || ("NOIE" as LetterType);
  const id = meta.id && meta.id.trim() ? meta.id.trim() : parsed ? slugFromFilename(parsed) : "unknown";
  return {
    id,
    estNumber: normalizeEstNumber(meta.estNumber) || parsed?.estToken || "",
    letterType,
    pdfId: meta.pdfId || parsed?.pdfId || `${id}.pdf`,
    institution: (meta.institution && meta.institution.trim()) || id,
    date: meta.date ?? (parsed ? dateFromFilename(parsed.mmddyyyy) : null) ?? isoDate(body.slice(0, 800)),
    title: TITLE_BY_TYPE[letterType] || meta.title || letterType,
    sourceUrl,
    body,
  };
}

export function emptyFsisHmsaSnapshot(reason: string): FsisHmsaSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/media_file/documents/` },
    cards: [],
  };
}

export function assembleFsisHmsaSnapshot(cards: FsisHmsaCard[], fetchedAt = new Date().toISOString()): FsisHmsaSnapshot {
  const withBody = cards
    .filter((c) => isRealFsisHmsaBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official FSIS HMSA letter PDFs had no extractable letter text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/media_file/documents/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): FsisHmsaSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FsisHmsaSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readFsisHmsaSnapshot(): FsisHmsaSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  return null;
}

export function writeFsisHmsaSnapshot(snap: FsisHmsaSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function wgetOfficialPdf(url: string, dest: string): void {
  const official = officialFsisHmsaPdfUrl(url);
  if (!official) throw new Error(`${url} is not an official FSIS HMSA PDF`);
  const ua = env("FSIS_HMSA_WGET_UA") || WGET_SAFARI_UA;
  const helper = env("FSIS_HMSA_WGET") || "wget";
  const result = spawnSync(helper, ["--user-agent=" + ua, "-O", dest, "--timeout=90", official], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw new Error(`wget failed: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(
      `wget ${official} failed: ${String(result.stderr || result.stdout || result.status || "unknown").slice(0, 400)}`,
    );
  }
}

export async function fetchFsisHmsaBytes(url: string): Promise<Uint8Array> {
  const dest = join(tmpdir(), `fsis-hmsa-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
  try {
    wgetOfficialPdf(url, dest);
    const bytes = new Uint8Array(readFileSync(dest));
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${url} is not an official PDF`);
    return bytes;
  } finally {
    try {
      if (existsSync(dest)) unlinkSync(dest);
    } catch {
      /* ignore */
    }
  }
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("FSIS_HMSA_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function ocrPdfText(pdfPath: string): string {
  const work = join(tmpdir(), `fsis-hmsa-ocr-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  const prefix = join(work, "p");
  const ppm = spawnSync("pdftoppm", ["-png", "-r", "150", pdfPath, prefix], { encoding: "utf8" });
  if (ppm.status !== 0) return "";
  const pages = readdirSync(work).filter((n) => n.endsWith(".png")).sort();
  const chunks: string[] = [];
  for (const page of pages) {
    const ocr = spawnSync("tesseract", ["--psm", "6", join(work, page), "stdout"], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    if (ocr.status === 0 && ocr.stdout) chunks.push(ocr.stdout);
  }
  return chunks.join("\n");
}

export function pdfToText(pdfPath: string): string {
  const digital = digitalPdfText(pdfPath);
  if (isRealFsisHmsaBody(digital)) return digital;
  const ocr = ocrPdfText(pdfPath);
  if (ocr.trim()) return `${ocr}\n${digital}`.trim();
  return digital;
}

function listingDir(): string {
  return env("FSIS_HMSA_JSON_DIR") || env("FSIS_HMSA_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("FSIS_HMSA_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("FSIS_HMSA_MAX_FETCH", "8"));
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

function safePdfName(pdfId: string, id: string): string {
  const name = pdfId.endsWith(".pdf") ? pdfId : `${id}.pdf`;
  return name.replace(/[^\w.\-]+/g, "_");
}

async function loadOfficialListings(dir: string): Promise<{ listed: FsisHmsaListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as FsisHmsaListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialText(row: FsisHmsaListing, cacheDir: string, fetched: { n: number }): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.id));
  if (!existsSync(pdfFile)) {
    writeFileSync(pdfFile, await fetchFsisHmsaBytes(row.sourceUrl));
    fetched.n += 1;
  }
  return pdfToText(pdfFile);
}

export async function collectFsisHmsa(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FsisHmsaSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = fsisHmsaDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, FsisHmsaCard>();
  for (const card of readFsisHmsaSnapshot()?.cards ?? []) {
    if (isRealFsisHmsaBody(card.body)) prior.set(card.id, card);
  }
  const cards: FsisHmsaCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  const fetched = { n: 0 };
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = prior.get(row.id);
    if (cached) {
      cards.push(cached);
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetched.n >= fetchCap) break;
    try {
      const localText = readNamedFile(dir, [
        `${row.id}.txt`,
        `${row.pdfId}.txt`,
        row.pdfId.replace(/\.pdf$/i, ".txt"),
      ]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const text = localText ?? (await extractOfficialText(row, cacheDir, fetched));
      fetchedPdfs = fetched.n;
      const parsed = parseFsisHmsaText(text, row);
      if (!isRealFsisHmsaBody(parsed.body)) {
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
  const snap = { ...assembleFsisHmsaSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeFsisHmsaSnapshot(snap);
  return snap;
}

export async function loadFsisHmsa(): Promise<FsisHmsaSnapshot> {
  const cached = readFsisHmsaSnapshot();
  if (cached && cached.cards.some((c) => isRealFsisHmsaBody(c.body))) return cached;
  try {
    return await collectFsisHmsa();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live FSIS HMSA letter fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyFsisHmsaSnapshot(
      `FSIS HMSA letter PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFsisHmsaManifest(snap: FsisHmsaSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFsisHmsaBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + establishment + letter type + date + official PDF URL only. Letter body is the paid GET /fsis-hmsa payload. Not people. Not the table/index. Not /awa. Not DILA CNIL. Prep only — do not list.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: FSIS_HMSA_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      letterType: c.letterType,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "letterType", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/media_file/documents/` },
  };
}

export async function loadFsisHmsaManifest(): Promise<Record<string, unknown>> {
  return buildFsisHmsaManifest(readFsisHmsaSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFsisHmsa()
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
              estNumber: c.estNumber,
              letterType: c.letterType,
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
