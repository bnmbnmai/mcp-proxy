/**
 * EPA FIFRA institution/company order / consent TEXT door.
 * Official per-order PDFs from yosemite.epa.gov EPA Administrative Enforcement Dockets only.
 * Does not invent order text. Press teasers / index pages are listing metadata.
 * Institution/company only. Not people. Not the press teaser.
 * Not BIS /bis-orders. Not OFAC /ofac-orders. Not FERC /ferc-orders.
 * Not FinCEN /fincen-orders. Not NCUA /ncua-orders. Not FRB /frb-orders.
 * Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl. Not CFTC /cftc-orders.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FIFRA_ORDERS_PATH = "/fifra-orders";
export const FIFRA_ORDERS_MANIFEST_PATH = "/fifra-orders/manifest.json";
export const FIFRA_ORDERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "fifra-institution-order-bodies";
export const PRODUCT_NAME = "EPA FIFRA institution order / consent text";

export const LISTING_URL = "https://yosemite.epa.gov/oa/rhc/epaadmin.nsf";
export const PDF_HOST = "yosemite.epa.gov";
export const PDF_ORIGIN = "https://yosemite.epa.gov";
export const DOCKET_LABEL_RE = /(?:Docket\s+No\.?\s*)?(FIFRA-\d{2}-\d{4}-\d{4})\b/i;
export const DOCKET_BARE_RE = /^(FIFRA-\d{2}-\d{4}-\d{4})$/i;
export const MEDIA_RE = /\/OA\/RHC\/EPAAdmin\.nsf\/Filings\/([A-Fa-f0-9]+)\/\$File\/([^?#]+\.pdf)/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "EPA";

export const CARD_FIELDS = [
  "id",
  "docket",
  "pdfId",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type FifraListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type FifraOrderListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type FifraOrderCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type FifraOrdersSnapshot = {
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
    listing: string;
    pdfHost: string;
  };
  cards: FifraOrderCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (EPA FIFRA public institution orders; +https://yosemite.epa.gov/oa/rhc/epaadmin.nsf)";

const OFFICIAL_HOSTS = new Set(["yosemite.epa.gov"]);

const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.P\.|LP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|S\.A\.|Banco|Bank|Holdings|Enterprises|Capital Markets|Markets|Securities|Services|Group|Partners|International|Industries|Solutions|Superstore|Chemical|Medical)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const ORDER_KIND_RE =
  /consent agreement and final order|consent agreement|final order|\bCAFO\b|expedited settlement/i;
const COMPLAINT_RE = /\bcomplaint\b/i;

/** Official EPA FIFRA institution/company order / consent PDFs on yosemite.epa.gov. */
export const SEED_LISTINGS: FifraOrderListing[] = [
  {
    id: "FIFRA-05-2026-0015",
    docket: "FIFRA-05-2026-0015",
    institution: "Travel Caddy, Inc. dba Travelon",
    date: "2026-07-29",
    title: "Consent Agreement and Final Order",
    sourceUrl: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/FIFRA-05-2026-0015_CAFO_TravelCaddyIncdbaTravelon_FranklinParkIllinois_14PGS.pdf",
    pdfId: "F4CB3764E5AB61EA85258E43006880DC",
  },
  {
    id: "FIFRA-05-2026-0001",
    docket: "FIFRA-05-2026-0001",
    institution: "Crown Chemical, Inc.",
    date: "2025-10-10",
    title: "Consent Agreement and Final Order",
    sourceUrl: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/89673C7E7F9F815185258D220041F413/$File/FIFRA-05-2026-0001_CAFO_CrownChemicalInc_CrestwoodIllinois_15PGS.pdf",
    pdfId: "89673C7E7F9F815185258D220041F413",
  },
  {
    id: "FIFRA-05-2026-0003",
    docket: "FIFRA-05-2026-0003",
    institution: "Parasol Medical, LLC",
    date: "2025-12-18",
    title: "Consent Agreement and Final Order",
    sourceUrl: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/3540F23EA19BD66485258D64006DE491/$File/FIFRA-05-2026-0003_CAFO_ParasolMedicalLLC_BuffaloGroveIllinois_15PGS.pdf",
    pdfId: "3540F23EA19BD66485258D64006DE491",
  },
  {
    id: "FIFRA-09-2026-0020",
    docket: "FIFRA-09-2026-0020",
    institution: "Garden Grove Superstore Inc.",
    date: "2026-01-15",
    title: "Consent Agreement and Final Order",
    sourceUrl: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/29411C7B446B74E085258D5D006DF909/$File/Garden%20Grove%20Superstore%20Inc.%20(FIFRA-09-2026-0020)%20-%20Filed%20CAFO.pdf",
    pdfId: "29411C7B446B74E085258D5D006DF909",
  },
  {
    id: "FIFRA-10-2026-0080",
    docket: "FIFRA-10-2026-0080",
    institution: "Nutrien Ag Solutions, Inc.",
    date: "2026-03-18",
    title: "Consent Agreement and Final Order",
    sourceUrl: "https://yosemite.epa.gov/oa/rhc/epaadmin.nsf/Filings/351B0FB7BF85CA3685258DBF006864F9/$File/Nutrien%20Ag%20Consent%20Agreement%20and%20Final%20Order.pdf",
    pdfId: "351B0FB7BF85CA3685258DBF006864F9",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function fifraOrdersDir(): string {
  if (env("FIFRA_ORDERS_DIR")) return resolve(env("FIFRA_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/fifra-orders"));
}

export function snapshotPath(): string {
  return join(fifraOrdersDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/fifra-orders/seed-snapshot.json"),
    join(here, "fixtures/fifra-orders/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&ldquo;/gi, "“")
    .replace(/&rdquo;/gi, "”")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " "));
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

export function officialFifraPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  try {
    const parsed = new URL(trimmed, PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") return null;
    if (host === "www.federalregister.gov" || host === "federalregister.gov") return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    const media = path.match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
    if (!media) return null;
    const unid = media[1].toUpperCase();
    const file = media[2].split("/").pop() || media[2];
    if (COMPLAINT_RE.test(file) && !/CAFO|Consent/i.test(file)) return null;
    return `${PDF_ORIGIN}/OA/RHC/EPAAdmin.nsf/Filings/${unid}/$File/${file}`;
  } catch {
    return null;
  }
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialFifraPdfUrl(url) || url || "";
  try {
    const parsed = new URL(official, PDF_ORIGIN);
    const media = parsed.pathname.match(MEDIA_RE);
    return media?.[1] ?? null;
  } catch {
    return null;
  }
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const labeled = raw.match(DOCKET_LABEL_RE);
  if (labeled) return labeled[1];
  const bare = raw.trim().match(DOCKET_BARE_RE);
  if (bare) return bare[1];
  return null;
}

export function isPeopleRow(row: FifraListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  const cleaned = name.replace(/^In the Matter of\s+/i, "").replace(/\s+d\/b\/a\s+.+$/i, "").trim();
  return PERSON_NAME_RE.test(cleaned);
}

export function isInstitutionOrderRow(row: FifraListingRow): boolean {
  if (isPeopleRow(row)) return false;
  const institution = (row.institution ?? "").trim();
  if (!institution || !ENTITY_RE.test(institution)) return false;
  const source = officialFifraPdfUrl(row.sourceUrl ?? "");
  if (!source) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`;
  if (COMPLAINT_RE.test(kind)) return false;
  if (kind.trim() && !ORDER_KIND_RE.test(kind) && !MEDIA_RE.test(kind)) {
    return false;
  }
  return true;
}

export function parseListingRows(rows: FifraListingRow[]): FifraOrderListing[] {
  const found: FifraOrderListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const sourceUrl = officialFifraPdfUrl(row.sourceUrl ?? "");
    const pdfId = (row.pdfId ?? "").trim() || pdfIdFromUrl(sourceUrl ?? "") || "";
    const docket = normalizeDocket(row.docket) || normalizeDocket(row.title ?? "") || pdfId;
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: normalizeDocket(row.docket) || docket,
      docket,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: parseOrderTitle(`${row.title ?? ""} ${row.type ?? ""}`),
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): FifraOrderListing[] {
  const rows: FifraListingRow[] = [];
  const trs = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of trs) {
    const href = (row.match(/href="([^"]+)"/i) || [])[1] || "";
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
    if (cells.length < 2) continue;
    const date = cells.find((c) => isoDate(c)) ?? cells[0] ?? "";
    const institution =
      cells.find((c) => ENTITY_RE.test(c) || PERSON_NAME_RE.test(c)) ?? cells[1] ?? "";
    const sourceUrl = href.startsWith("http") ? href : href ? `${PDF_ORIGIN}${href}` : "";
    const docket = normalizeDocket(cells.find((c) => normalizeDocket(c)) ?? "") ?? "";
    rows.push({
      institution,
      docket,
      date,
      title: cells.find((c) => ORDER_KIND_RE.test(c) || COMPLAINT_RE.test(c)) ?? "Order",
      type: cells[2] ?? "",
      sourceUrl,
      pdfId: pdfIdFromUrl(sourceUrl) ?? "",
    });
  }
  const loose = [...html.matchAll(/href="([^"]*EPAAdmin\.nsf\/Filings\/[^"]+\$File\/[^"]+\.pdf[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of loose) {
    const title = stripTags(m[2]);
    const institution = title.replace(/^(?:Administrative\s+)?(?:Consent\s+)?Order:\s*/i, "").trim();
    rows.push({
      institution,
      title,
      sourceUrl: m[1],
      pdfId: pdfIdFromUrl(m[1]) ?? "",
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ docket \/ date \/ PDF URL/i.test(text)) return true;
  if (/EPA FIFRA press teaser/i.test(text)) return true;
  const compact = text.replace(/\s+/g, " ").trim();
  if (
    /announced an order filing and settling charges/i.test(text) &&
    !/CONSENT AGREEMENT AND FINAL ORDER/i.test(text) &&
    !/FIFRA-/i.test(text)
  ) {
    return true;
  }
  if (compact.length < 400 && /Order:/i.test(text) && /\/media\/\d+\//i.test(text)) return true;
  return false;
}

export function isFederalRegisterDump(text: string): boolean {
  return /"raw_text"/.test(text) || /"full_text"/.test(text) || /federalregister\.gov/i.test(text);
}

export function isPeopleDump(text: string): boolean {
  if (/people-only CFTC/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isRealFifraOrderBody(text: string): boolean {
  if (isIndexTeaserDump(text) || isFederalRegisterDump(text) || isPeopleDump(text)) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 1500) return false;
  if (/Bureau of Industry and Security/i.test(text) && /PROPOSED CHARGING LETTER|ORDER RELATING TO/i.test(text)) {
    return false;
  }
  if (/OFFICE OF FOREIGN ASSETS CONTROL/i.test(text) && /Enforcement Release:/i.test(text)) {
    return false;
  }
  if (/FEDERAL ENERGY REGULATORY COMMISSION/i.test(text) && /ORDER APPROVING STIPULATION AND CONSENT AGREEMENT/i.test(text)) {
    return false;
  }
  if (/FINANCIAL CRIMES ENFORCEMENT NETWORK/i.test(text) && /CONSENT ORDER IMPOSING CIVIL MONEY PENALTY/i.test(text)) {
    return false;
  }
  if (/CONSUMER FINANCIAL PROTECTION BUREAU/i.test(text) && /File No\.\s*\d{4}-CFPB-\d+/i.test(text)) {
    return false;
  }
  if (/OFFICE OF THE COMPTROLLER OF THE CURRENCY/i.test(text) && /\bAA-[A-Z]{2,4}-\d{4}-\d+\b/.test(text)) {
    return false;
  }
  if (/FEDERAL DEPOSIT INSURANCE CORPORATION/i.test(text) && /\bFDIC-\d{2}-\d{4}[a-z]\b/i.test(text)) {
    return false;
  }
  if (/BOARD OF GOVERNORS OF THE FEDERAL RESERVE SYSTEM/i.test(text) && /\b\d{2}-\d{3}-(?:B|PCA|WA\/RB)/i.test(text)) {
    return false;
  }
  if (/National Credit Union Administration/i.test(text) && /\b\d{2}-\d{4}-[A-Z]{2}\b/.test(text)) {
    return false;
  }
  if (/Bureau of Consumer Protection/i.test(text) && /Made in the USA Labeling Rule|MUSA Labeling Rule/i.test(text)) {
    return false;
  }
  if (/COMMODITY FUTURES TRADING COMMISSION/i.test(text) && /CFTC Docket No/i.test(text)) {
    return false;
  }
  if (/Center for Devices and Radiological Health/i.test(text) && /De Novo request/i.test(text) && /DEN\d{6}/i.test(text)) {
    return false;
  }
  if (/ALCOHOL AND TOBACCO TAX AND TRADE BUREAU/i.test(text) && /ABSTRACT AND STATEMENT/i.test(text)) {
    return false;
  }
  if (/\d{2}-\d{3}-01air/i.test(text) && /Confirmation of the regulatory status/i.test(text)) {
    return false;
  }
  if (/RECORD OF DECISION/i.test(text) && /DECLARATION/i.test(text) && /\b(CERCLA|Superfund)\b/i.test(text)) {
    return false;
  }
  if (/(?:MONETARY )?PENALTY NOTICE/i.test(text) && /Information Commissioner/i.test(text) && /(?:Data Protection Act 2018|section 155)/i.test(text)) {
    return false;
  }
  const epa =
    /UNITED STATES ENVIRONME?N?TAL PROTECTION AGENCY|ENVIRONMENTAL PROTECTION AGENCY|U\.S\.\s+Environmental Protection Agency|U\.S\.\s+EPA\s+REGION/i.test(
      text,
    );
  const fifra = /Federal Insecticide,? Fungicide, and Rodenticide Act|\bFIFRA\b/i.test(text);
  const kind =
    /CONSENT AGREEMENT AND FINAL ORDER/i.test(text) ||
    /\bCAFO\b/i.test(text) ||
    (/CONSENT AGREEMENT/i.test(text) && /Final Order/i.test(text));
  const docket = DOCKET_LABEL_RE.test(text);
  return epa && fifra && kind && docket;
}

export function parseOrderTitle(body: string): string {
  if (/CONSENT AGREEMENT AND FINAL ORDER/i.test(body) || /\bCAFO\b/i.test(body)) return "Consent Agreement and Final Order";
  if (/EXPEDITED SETTLEMENT/i.test(body)) return "Expedited Settlement Agreement";
  if (/CONSENT AGREEMENT/i.test(body)) return "Consent Agreement";
  return "Order";
}

export function parseFifraOrderText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    docket?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): FifraOrderCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFifraPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket =
    normalizeDocket(meta.docket) ||
    normalizeDocket(body.match(DOCKET_LABEL_RE)?.[0] ?? "") ||
    meta.pdfId ||
    pdfIdFromUrl(sourceUrl) ||
    "unknown";
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || docket;
  return {
    id: meta.id && normalizeDocket(meta.id) ? normalizeDocket(meta.id)! : docket,
    docket,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 4000)) ?? isoDate(body.match(/Dated:\s*([^\n]+)/i)?.[1] ?? ""),
    title: meta.title || parseOrderTitle(body),
    sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): FifraOrdersSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: [],
  };
}

function cardDateKey(card: Pick<FifraOrderCard, "date" | "docket">): string {
  return `${card.date ?? ""}${card.docket}`;
}

export function assembleSnapshot(cards: FifraOrderCard[], fetchedAt = new Date().toISOString()): FifraOrdersSnapshot {
  const withBody = cards
    .filter((c) => isRealFifraOrderBody(c.body))
    .sort((a, b) => cardDateKey(b).localeCompare(cardDateKey(a)));
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
    reason: withBody.length > 0 ? null : "Official EPA FIFRA institution order / consent PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): FifraOrdersSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FifraOrdersSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): FifraOrdersSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("FIFRA_ORDERS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: FifraOrdersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedFifraOrderBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealFifraOrderBody(c.body)));
}

function listingDir(): string {
  return env("FIFRA_ORDERS_JSON_DIR") || env("FIFRA_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("FIFRA_ORDERS_LIMIT", "5");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const raw = env("FIFRA_ORDERS_MAX_FETCH", "8");
  if (raw === "0") return 0;
  const n = Number(raw);
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

export async function fetchFifraBytes(url: string): Promise<Uint8Array> {
  const official = officialFifraPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  if (head !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export async function fetchFifraText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FIFRA_ORDERS_PDFTOTEXT") || "pdftotext";
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

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function mergeOfficialListings(listed: FifraOrderListing[], seeds: FifraOrderListing[]): FifraOrderListing[] {
  const seen = new Set<string>();
  const out: FifraOrderListing[] = [];
  for (const row of [...listed, ...seeds]) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

async function loadOfficialListings(dir: string): Promise<{ listed: FifraOrderListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as FifraListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = html ? parseListingHtml(html) : [];
    return { listed, listedCount: listed.length };
  }
  try {
    const listed = parseListingHtml(await fetchFifraText(LISTING_URL));
    const merged = mergeOfficialListings(listed, SEED_LISTINGS);
    if (merged.length > 0) return { listed: merged, listedCount: merged.length };
  } catch {
    /* official listing missed; keep first-slice seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

function priorBodies(): Map<string, FifraOrderCard> {
  const prior = new Map<string, FifraOrderCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealFifraOrderBody(card.body)) prior.set(card.id, card);
  }
  return prior;
}

export async function collectFifraOrders(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FifraOrdersSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = fifraOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = priorBodies();
  if (allListed.length === 0) {
    if (prior.size > 0) {
      const snap = {
        ...assembleSnapshot([...prior.values()]),
        listedCount: 0,
        fetchedPdfs: 0,
        skippedNoText: 0,
        reused: prior.size,
        addedThisRun: 0,
        reason: "Official EPA FIFRA seed listing missed; kept cached institution order / consent bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official EPA FIFRA seed listing had no institution order / consent rows.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: FifraOrderCard[] = [];
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
      const localText = readNamedFile(dir, [`${row.docket}.txt`, `${row.id}.txt`, `${row.pdfId}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${row.docket}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchFifraBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseFifraOrderText(text, {
        sourceUrl: row.sourceUrl,
        institution: row.institution,
        date: row.date,
        docket: row.docket,
        pdfId: row.pdfId,
        id: row.id,
        title: row.title,
      });
      if (!isRealFifraOrderBody(parsed.body)) {
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
    ...assembleSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeSnapshot(snap);
  return snap;
}

export async function loadFifraOrders(): Promise<FifraOrdersSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealFifraOrderBody(c.body))) {
    return cached;
  }
  try {
    return await collectFifraOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealFifraOrderBody(c.body)) ? "stale" : "empty",
        reason: `Live EPA FIFRA institution order / consent fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `EPA FIFRA institution order / consent PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFifraOrdersManifest(snap: FifraOrdersSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFifraOrderBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + institution + docket + date + official PDF URL only. Order body is the paid GET /fifra-orders payload. This free manifest lists the full catalog. One $0.05 GET returns the newest 100 official texts; older pages are another $0.05 on the same URL (page/before).",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: FIFRA_ORDERS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      docket: c.docket,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "docket", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
  };
}

export async function loadFifraOrdersManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildFifraOrdersManifest(cached);
  return buildFifraOrdersManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFifraOrders()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealFifraOrderBody(c.body)).length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              docket: c.docket,
              pdfId: c.pdfId,
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
