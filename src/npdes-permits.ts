/**
 * Official EPA-issued INDIVIDUAL NPDES permit TEXT door.
 * Official public PDFs on www.epa.gov (`/system/files/documents/…permit….pdf`).
 * EPA-issued individual permits only (MA, NH, NM, DC, territories, tribal / federal facilities).
 * Does not sell the free Region 1 permit-listing JSON (index-only: name / number / date / PDF URL).
 * Does not invent permit text. Not ECHO / ICIS-NPDES metadata. Not Superfund RODs.
 * Not state Water Boards ACL orders. Not general permits (CGP / MSGP / MS4 / CAFO).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const NPDES_PERMITS_PATH = "/npdes-permits";
export const NPDES_PERMITS_MANIFEST_PATH = "/npdes-permits/manifest.json";
export const NPDES_PERMITS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "epa-npdes-individual-permit-bodies";
export const PRODUCT_NAME = "EPA individual NPDES permit text";

export const INDEX_URL = "https://www.epa.gov/npdes-permits";
export const PDF_HOST = "www.epa.gov";
export const PDF_ORIGIN = "https://www.epa.gov";
export const MA_LISTING_JSON = "https://www.epa.gov/system/files/other-files/2025-07/permit-listing-ma.json";
export const NH_LISTING_JSON = "https://www.epa.gov/system/files/other-files/2025-07/permit-listing-nh.json";
export const MA_PAGE_URL = "https://www.epa.gov/npdes-permits/massachusetts-final-individual-npdes-permits";
export const NH_PAGE_URL = "https://www.epa.gov/npdes-permits/new-hampshire-final-individual-npdes-permits";
export const NM_PAGE_URL = "https://www.epa.gov/npdes-permits/new-mexico-npdes-permits";
export const AZ_PAGE_URL = "https://www.epa.gov/npdes-permits/az-tribal";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "EPA NPDES / epa.gov/npdes-permits";

export const CARD_FIELDS = [
  "id",
  "name",
  "permit",
  "date",
  "state",
  "pageUrl",
  "sourceUrl",
  "kind",
  "body",
] as const;

export type NpdesPermitListing = {
  id: string;
  name: string;
  permit: string;
  date: string | null;
  state: string;
  pageUrl: string;
  sourceUrl: string;
};

export type NpdesPermitCard = {
  id: string;
  name: string;
  permit: string;
  date: string | null;
  state: string;
  pageUrl: string;
  sourceUrl: string;
  kind: string;
  body: string;
};

export type NpdesPermitsSnapshot = {
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
    maListing?: string;
    nhListing?: string;
  };
  cards: NpdesPermitCard[];
};

const HTTP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

const OFFICIAL_HOSTS = new Set(["www.epa.gov", "epa.gov"]);
/** States / territories where EPA issues the individual NPDES permit (not authorized-state programs). */
export const EPA_ISSUED_PREFIXES = new Set(["MA", "NH", "NM", "DC", "PR", "GU", "AS", "MP", "AZ"]);
const PEOPLE_ONLY =
  /\b(curriculum vitae|cv(?: of)?|date of birth|home address|passport number|social security|private email)\b/i;
const MIN_BODY_CHARS = 800;
const REJECT_PATH =
  /(general|cgp|msgp|ms4|cafo|factsheet|fact-sheet|pnextension|public-meeting|draftma|draftnh|draftnm)/i;
const PERMIT_RE = /\b([A-Z]{2}\d{7})\b/;

/** Official EPA-issued individual NPDES permit PDFs. Newest first. */
export const SEED_LISTINGS: NpdesPermitListing[] = [
  {
    id: "nh0001023",
    name: "PCC Structurals, Inc.",
    permit: "NH0001023",
    date: "2026-07-20",
    state: "NH",
    pageUrl: NH_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2026-07/finalnh0001023permit-2026.pdf",
  },
  {
    id: "ma0003531",
    name: "Bird, Incorporated d/b/a CertainTeed",
    permit: "MA0003531",
    date: "2026-05-27",
    state: "MA",
    pageUrl: MA_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2026-05/finalma0003531permit-2026.pdf",
  },
  {
    id: "ma0003832",
    name: "Procter and Gamble – Gillette",
    permit: "MA0003832",
    date: "2026-04-15",
    state: "MA",
    pageUrl: MA_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2026-04/finalma0003832permit-2026.pdf",
  },
  {
    id: "nh0000116",
    name: "Nylon Corporation of America",
    permit: "NH0000116",
    date: "2026-01-15",
    state: "NH",
    pageUrl: NH_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2026-01/finalnh0000116permit-2026.pdf",
  },
  {
    id: "ma0100501",
    name: "South Essex Wastewater Treatment Facility",
    permit: "MA0100501",
    date: "2025-12-22",
    state: "MA",
    pageUrl: MA_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2025-12/finalma0100501permit-2025.pdf",
  },
  {
    id: "ma0102598",
    name: "Charles River Pollution Control District",
    permit: "MA0102598",
    date: "2025-12-15",
    state: "MA",
    pageUrl: MA_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2025-12/finalma0102598permit-2025.pdf",
  },
  {
    id: "ma0101010",
    name: "Brockton Advanced Water Reclamation Facility",
    permit: "MA0101010",
    date: "2025-12-04",
    state: "MA",
    pageUrl: MA_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2025-12/finalma0101010permit-2025.pdf",
  },
  {
    id: "nh0100447",
    name: "City of Manchester",
    permit: "NH0100447",
    date: "2025-11-03",
    state: "NH",
    pageUrl: NH_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2025-11/finalnh0100447permit-2025.pdf",
  },
  {
    id: "nh0100170",
    name: "City of Nashua",
    permit: "NH0100170",
    date: "2025-11-03",
    state: "NH",
    pageUrl: NH_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2025-11/finalnh0100170permit-2025.pdf",
  },
  {
    id: "ma0020231",
    name: "Granite State Concrete Co., Inc.",
    permit: "MA0020231",
    date: "2025-06-05",
    state: "MA",
    pageUrl: MA_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2025-06/finalma0020231permit-2025.pdf",
  },
  {
    id: "ma0040193",
    name: "Taunton River Desalination Plant",
    permit: "MA0040193",
    date: "2025-05-30",
    state: "MA",
    pageUrl: MA_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2025-06/finalma0040193permit-2025.pdf",
  },
  {
    id: "ma0103390",
    name: "Swansea Water District Desalination Facility",
    permit: "MA0103390",
    date: "2025-04-21",
    state: "MA",
    pageUrl: MA_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2025-04/finalma0103390permit-2025.pdf",
  },
  {
    id: "nm0030490",
    name: "Dona Ana County South Central Regional WWTP",
    permit: "NM0030490",
    date: "2025-04-11",
    state: "NM",
    pageUrl: NM_PAGE_URL,
    sourceUrl:
      "https://www.epa.gov/system/files/documents/2025-04/nm0030490_dona-ana-county-utilityd_permit-final-package_april-11_2025.pdf",
  },
  {
    id: "nm0030368",
    name: "Ranchland Utility Company",
    permit: "NM0030368",
    date: "2025-01-21",
    state: "NM",
    pageUrl: NM_PAGE_URL,
    sourceUrl:
      "https://www.epa.gov/system/files/documents/2025-04/nm0030368_ranchland-utility_permit-file-package_jan-21_2025.pdf",
  },
  {
    id: "ma0004940",
    name: "Sunrise Wind Project",
    permit: "MA0004940",
    date: "2024-06-13",
    state: "MA",
    pageUrl: MA_PAGE_URL,
    sourceUrl: "https://www.epa.gov/system/files/documents/2025-06/finalma0004940permit-2024.pdf",
  },
  {
    id: "az0024619",
    name: "Moenkopi Utility Authority WWTP",
    permit: "AZ0024619",
    date: "2024-06-12",
    state: "AZ",
    pageUrl: AZ_PAGE_URL,
    sourceUrl:
      "https://www.epa.gov/system/files/documents/2025-06/az0024619-moenkopi-utility-authority-wwtp-npdes-permit-2024-06-12.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function npdesPermitsDir(): string {
  if (env("NPDES_PERMITS_DIR")) return resolve(env("NPDES_PERMITS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/npdes-permits"));
}

export function snapshotPath(): string {
  return join(npdesPermitsDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/npdes-permits/seed-snapshot.json"),
    join(here, "fixtures/npdes-permits/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function slugFromPermit(permit: string): string {
  return String(permit || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function mdyToIso(raw: string | undefined): string | null {
  const t = String(raw || "").trim();
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  const iso = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

export function pageUrlForState(state: string): string {
  const s = state.toUpperCase();
  if (s === "MA") return MA_PAGE_URL;
  if (s === "NH") return NH_PAGE_URL;
  if (s === "NM") return NM_PAGE_URL;
  if (s === "AZ") return AZ_PAGE_URL;
  return INDEX_URL;
}

export function officialIndividualPermitUrl(raw: string | undefined): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t, PDF_ORIGIN);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!OFFICIAL_HOSTS.has(u.hostname)) return null;
  if (!/^\/system\/files\/documents\/\d{4}-\d{2}\/[^/]+\.pdf$/i.test(u.pathname)) return null;
  if (REJECT_PATH.test(u.pathname)) return null;
  const file = u.pathname.split("/").pop() || "";
  if (!/permit/i.test(file)) return null;
  // Region 1 names look like finalma0003531permit-2026.pdf — do not take AL0003531 from FINALMA….
  const candidates = [...file.toUpperCase().matchAll(/([A-Z]{2}\d{7})/g)].map((m) => m[1]);
  if (candidates.length > 0) {
    const num = candidates.find((n) => EPA_ISSUED_PREFIXES.has(n.slice(0, 2)));
    if (!num) return null;
    if (/G\d{6}/.test(num) || /[A-Z]{2}G\d/.test(num)) return null;
  }
  return `https://www.epa.gov${u.pathname}`;
}

export function isOfficialIndividualPermitPdf(href: string): boolean {
  return Boolean(officialIndividualPermitUrl(href));
}

export function parsePermitListingJson(
  raw: unknown,
  state: string,
  pageUrl: string,
): NpdesPermitListing[] {
  const prefix = state.toUpperCase();
  if (!EPA_ISSUED_PREFIXES.has(prefix)) return [];
  const rows = raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)
    ? ((raw as { data: unknown[] }).data)
    : Array.isArray(raw)
      ? raw
      : [];
  const out: NpdesPermitListing[] = [];
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const permit = String(rec["Permit Number"] || rec.permit || "").toUpperCase().trim();
    if (!PERMIT_RE.test(permit) || permit.slice(0, 2) !== prefix) continue;
    const nameHtml = String(rec["Applicant / Facility Name"] || rec.name || "");
    const blob = nameHtml.toLowerCase();
    if (blob.includes("coverage transferred") || blob.includes("general permit")) continue;
    const hrefs = [...nameHtml.matchAll(/href=['"]([^'"]+)['"]/g)].map((m) => m[1]);
    const sourceUrl = hrefs.map((h) => officialIndividualPermitUrl(h)).find((u): u is string => Boolean(u));
    if (!sourceUrl) continue;
    const name = nameHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .replace(/\(\s*pdf\s*\)/gi, "")
      .replace(/\(\s*[\d.]+\s*[kmg]b\s*\)/gi, "")
      .trim();
    const date = mdyToIso(String(rec["Date of Issuance"] || rec.date || ""));
    const id = slugFromPermit(permit);
    if (!id || !name) continue;
    out.push({
      id,
      name,
      permit,
      date,
      state: prefix,
      pageUrl,
      sourceUrl,
    });
  }
  return out;
}

export function parseListingRows(rows: NpdesPermitListing[]): NpdesPermitListing[] {
  const out: NpdesPermitListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const sourceUrl = officialIndividualPermitUrl(row.sourceUrl);
    if (!sourceUrl) continue;
    if (isPeopleRow(row)) continue;
    const permit = String(row.permit || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const id = slugFromPermit(row.id || permit);
    if (!id || seen.has(id)) continue;
    if (permit && !EPA_ISSUED_PREFIXES.has(permit.slice(0, 2))) continue;
    seen.add(id);
    out.push({
      id,
      name: String(row.name || id).replace(/\s+/g, " ").trim(),
      permit,
      date: mdyToIso(row.date ?? undefined) ?? row.date ?? null,
      state: String(row.state || permit.slice(0, 2)).toUpperCase(),
      pageUrl: row.pageUrl || pageUrlForState(row.state || permit.slice(0, 2)),
      sourceUrl,
    });
  }
  return out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
}

export function isPeopleRow(row: Pick<NpdesPermitListing, "name" | "permit">): boolean {
  const blob = `${row.name || ""} ${row.permit || ""}`;
  return PEOPLE_ONLY.test(blob) && !/\b(npdes|permit|epa|wwtp|wastewater)\b/i.test(blob);
}

function looksLikePeopleDump(text: string): boolean {
  return PEOPLE_ONLY.test(text) && !/\b(authorization to discharge|national pollutant discharge)\b/i.test(text);
}

export function isRealNpdesPermitBody(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length < MIN_BODY_CHARS) return false;
  if (looksLikePeopleDump(t)) return false;
  if (/"Facilities"\s*:/.test(t) && /("CWPPermitStatus"|"SourceID")\s*:/.test(t)) return false;
  if (/\bICIS-NPDES\b/i.test(t) && /\bECHO\b/i.test(t) && !/\bauthorization to discharge\b/i.test(t)) return false;
  if (/\brecord of decision\b/i.test(t) && !/\bauthorization to discharge\b/i.test(t)) return false;
  if (/\badministrative civil liabilit/i.test(t) && /\bwater quality control board\b/i.test(t)) return false;
  // Individual permits may mention EPA's Construction General Permit in stormwater definitions.
  // Reject only documents that present a general permit as the sold unit.
  if (/\bthis general permit is not an individual\b/i.test(t)) return false;
  if (
    /\b(construction general permit|npdes general permit|multi-sector general permit)\b/i.test(t) &&
    !/\bnpdes permit no\.\s*[a-z]{2}\d{7}\b/i.test(t)
  ) {
    return false;
  }
  if (/\bthis is the fact sheet only\b/i.test(t)) return false;
  const hasNpdes = /\bnational pollutant discharge elimination system\b|\bnpdes permit\b/i.test(t);
  const hasAuth = /\bauthorization to discharge\b|\bfinal npdes permit\b/i.test(t);
  const hasEpa = /\benvironmental protection agency\b|\bepa(?:'s)? final permit\b/i.test(t);
  return hasNpdes && hasAuth && hasEpa;
}

export function parseNpdesPermitText(
  text: string,
  meta: {
    sourceUrl: string;
    pageUrl?: string;
    name?: string;
    permit?: string;
    date?: string | null;
    state?: string;
    id?: string;
    kind?: string;
  },
): NpdesPermitCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialIndividualPermitUrl(meta.sourceUrl) || meta.sourceUrl;
  const permit =
    String(meta.permit || "").toUpperCase().replace(/[^A-Z0-9]/g, "") ||
    (body.toUpperCase().match(PERMIT_RE) || [])[0] ||
    "";
  const id = meta.id || slugFromPermit(permit) || sourceUrl;
  const state = String(meta.state || permit.slice(0, 2)).toUpperCase();
  return {
    id,
    name: String(meta.name || id).replace(/\s+/g, " ").trim(),
    permit,
    date: meta.date ?? null,
    state,
    pageUrl: meta.pageUrl || pageUrlForState(state),
    sourceUrl,
    kind: meta.kind || "individual-npdes-permit",
    body,
  };
}

export function emptyNpdesPermitsSnapshot(reason: string): NpdesPermitsSnapshot {
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
      pdfHost: `${PDF_ORIGIN}/system/files/documents/`,
      pageHost: INDEX_URL,
      maListing: MA_LISTING_JSON,
      nhListing: NH_LISTING_JSON,
    },
    cards: [],
  };
}

export function assembleNpdesPermitsSnapshot(
  cards: NpdesPermitCard[],
  fetchedAt = new Date().toISOString(),
): NpdesPermitsSnapshot {
  const withBody = cards
    .filter((c) => isRealNpdesPermitBody(c.body) && officialIndividualPermitUrl(c.sourceUrl))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official EPA individual NPDES permit PDFs had no extractable permit text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      index: INDEX_URL,
      pdfHost: `${PDF_ORIGIN}/system/files/documents/`,
      pageHost: INDEX_URL,
      maListing: MA_LISTING_JSON,
      nhListing: NH_LISTING_JSON,
    },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): NpdesPermitsSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as NpdesPermitsSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readNpdesPermitsSnapshot(): NpdesPermitsSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("NPDES_PERMITS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeNpdesPermitsSnapshot(snap: NpdesPermitsSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchNpdesText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/json,*/*" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchNpdesBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,*/*" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${url} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("NPDES_PERMITS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function listingDir(): string {
  return env("NPDES_PERMITS_HTML_DIR") || env("NPDES_PERMITS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("NPDES_PERMITS_LIMIT", "16"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 16;
}

function maxFetchLimit(): number {
  const n = Number(env("NPDES_PERMITS_MAX_FETCH", "20"));
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

async function loadOfficialListings(dir: string): Promise<{ listed: NpdesPermitListing[]; listedCount: number }> {
  if (dir) {
    const jsonText = readNamedFile(dir, ["listing-excerpt.json", "listing.json", "permit-listing-ma.json"]);
    const fromJson = jsonText ? parsePermitListingJson(JSON.parse(jsonText), "MA", MA_PAGE_URL) : [];
    const extra = SEED_LISTINGS.filter((row) => existsSync(join(dir, `${row.id}.txt`)));
    const listed = parseListingRows([...fromJson, ...extra]);
    return { listed, listedCount: listed.length };
  }
  return { listed: parseListingRows(SEED_LISTINGS), listedCount: SEED_LISTINGS.length };
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function collectNpdesPermits(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<NpdesPermitsSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = npdesPermitsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, NpdesPermitCard>();
  for (const card of readNpdesPermitsSnapshot()?.cards ?? []) {
    if (isRealNpdesPermitBody(card.body)) prior.set(card.id, card);
  }
  const cards: NpdesPermitCard[] = [];
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
      const sourceUrl = officialIndividualPermitUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchNpdesBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseNpdesPermitText(text, {
        sourceUrl,
        pageUrl: row.pageUrl,
        name: row.name,
        permit: row.permit,
        date: row.date,
        state: row.state,
        id: row.id,
        kind: "individual-npdes-permit",
      });
      if (!isRealNpdesPermitBody(parsed.body)) {
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
    ...assembleNpdesPermitsSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeNpdesPermitsSnapshot(snap);
  return snap;
}

export async function loadNpdesPermits(): Promise<NpdesPermitsSnapshot> {
  const cached = readNpdesPermitsSnapshot();
  if (cached) {
    const filtered = assembleNpdesPermitsSnapshot(cached.cards, cached.fetchedAt);
    if (filtered.cards.length) return { ...cached, ...filtered };
  }
  try {
    return await collectNpdesPermits();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealNpdesPermitBody(c.body)) ? "stale" : "empty",
        reason: `Live EPA individual NPDES permit fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyNpdesPermitsSnapshot(
      `EPA individual NPDES permit PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildNpdesPermitsManifest(snap: NpdesPermitsSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealNpdesPermitBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      NPDES_PERMITS_PATH,
      "Count + name + date + permit number + official individual NPDES PDF URL only. Permit body is the paid GET /npdes-permits payload. This free manifest lists the full catalog.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: NPDES_PERMITS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      name: c.name,
      date: c.date,
      permit: c.permit,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "name", "date", "permit", "sourceUrl"] },
    sources: snap?.sources ?? {
      index: INDEX_URL,
      pdfHost: `${PDF_ORIGIN}/system/files/documents/`,
      pageHost: INDEX_URL,
    },
  };
}

export async function loadNpdesPermitsManifest(): Promise<Record<string, unknown>> {
  return buildNpdesPermitsManifest(readNpdesPermitsSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectNpdesPermits()
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
              permit: c.permit,
              date: c.date,
              state: c.state,
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
