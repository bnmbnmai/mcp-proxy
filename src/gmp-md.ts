/**
 * Health Canada medical-device inspection REPORT CARD bodies door.
 * Official md/handler/fullReportCard.ashx observation text + MDR cites only.
 * Distinct from /gmp (Drug GMP, /gmp/controller/fullReportCard.ashx).
 * Does not sell the public search INDEX (zero observation text).
 * Does not invent observations. Rating-only cards are a kill.
 * OGL-Canada commercial use. Not /gmp. Not FDA Form 483. Not AWA.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const GMP_MD_PATH = "/gmp-md";
export const GMP_MD_MANIFEST_PATH = "/gmp-md/manifest.json";
export const GMP_MD_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "hc-md-inspection-cards";
export const PRODUCT_NAME = "Health Canada medical-device inspection report cards";

export const LISTING_URL = "https://www.drug-inspections.canada.ca/md/index-en.html";
export const SEARCH_URL =
  "https://www.drug-inspections.canada.ca/md/handler/searchResult.ashx?estName=&ref=&site=&rate=&term=&lic=&startDate=&endDate=&eType=&prov=&licNum=&act=&actCat=&cat=&pType=MD&lang=en";
export const CARD_URL =
  "https://www.drug-inspections.canada.ca/md/handler/fullReportCard.ashx";
export const CARD_PAGE =
  "https://www.drug-inspections.canada.ca/md/fullReportCard-en.html";
export const LIVE_MANIFEST_URL = "https://ticks.bnm.farm/gmp-md/manifest.json";
export const OGL_NOTE =
  "Contains information licensed under the Open Government Licence – Canada.";

/** Additional real observation cards this run. Cached IDs do not count. `0` = keep walking. */
export const DEFAULT_FIRST_SLICE = 5;
/** Max official report-card downloads per collect. Rating-only / missing ashx are skipped. `0` = no cap. */
export const DEFAULT_MAX_FETCH = 8;

export const CARD_FIELDS = [
  "id",
  "inspectionNumber",
  "firm",
  "referenceNumber",
  "site",
  "inspectedOn",
  "rating",
  "ratingDesc",
  "insType",
  "insSubType",
  "sourceUrl",
  "outcome",
  "measuresTaken",
  "body",
  "observations",
] as const;

export type GmpMdListing = {
  inspectionNumber: string;
  firm: string;
  referenceNumber: string | null;
  site: string | null;
  inspectedOn: string | null;
  rating: string | null;
  ratingDesc: string | null;
  reportCard: boolean;
  sourceUrl: string;
};

export type GmpMdObservation = {
  n: number;
  regulation: string;
  cite: string | null;
  text: string;
};

export type GmpMdCard = {
  id: string;
  inspectionNumber: string;
  firm: string;
  referenceNumber: string | null;
  site: string | null;
  inspectedOn: string | null;
  rating: string | null;
  ratingDesc: string | null;
  insType: string | null;
  insSubType: string | null;
  sourceUrl: string;
  outcome: string[];
  measuresTaken: string[];
  body: string;
  observations: GmpMdObservation[];
};

export type GmpMdSnapshot = {
  ok: true;
  product: typeof PRODUCT_ID;
  status: "ok" | "empty" | "stale";
  reason: string | null;
  fetchedAt: string;
  asOf: string | null;
  listedCount?: number;
  reportCardCount?: number;
  fetchedCards?: number;
  skippedNoText?: number;
  skippedKnown?: number;
  reused?: number;
  addedThisRun?: number;
  license: string;
  sources: {
    listing: string;
    search: string;
    card: string;
  };
  cards: GmpMdCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (Health Canada DHPID public MD report cards; +https://www.drug-inspections.canada.ca/md/index-en.html)";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function gmpMdDir(): string {
  if (env("GMP_MD_DIR")) return resolve(env("GMP_MD_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/gmp-md"));
}

export function snapshotPath(): string {
  return join(gmpMdDir(), "snapshot.json");
}

export function skippedNoTextPath(): string {
  return join(gmpMdDir(), "skipped-no-text.json");
}

export function knownIdsPath(): string {
  return join(gmpMdDir(), "known-ids.json");
}

export function searchCachePath(): string {
  return join(gmpMdDir(), "search-all.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/hc-gmp-md/seed-snapshot.json"),
    join(here, "fixtures/hc-gmp-md/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function cardPageUrl(inspectionNumber: string): string {
  return `${CARD_PAGE}?insNumber=${encodeURIComponent(inspectionNumber)}&lang=en`;
}

export function cardApiUrl(inspectionNumber: string): string {
  return `${CARD_URL}?lang=en&insNumber=${encodeURIComponent(inspectionNumber)}`;
}

export function slugFirm(firm: string): string {
  return firm
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cardId(firm: string, inspectionNumber: string): string {
  const slug = slugFirm(firm);
  return slug ? `${slug}-${inspectionNumber}` : inspectionNumber;
}

/** Official HC JSON often double-encodes curly quotes as Windows-1252 mojibake. */
export function fixMojibake(text: string): string {
  if (!text.includes("\u00E2")) return text;
  return text
    .replace(/\u00E2\u20AC\u02DC/g, "\u2018")
    .replace(/\u00E2\u20AC\u2122/g, "\u2019")
    .replace(/\u00E2\u20AC\u0153/g, "\u201C")
    .replace(/\u00E2\u20AC\u009D/g, "\u201D")
    .replace(/\u00E2\u20AC\u201C/g, "\u201C")
    .replace(/\u00E2\u20AC\u201D/g, "\u201D")
    .replace(/\u00E2\u20AC\u201C|\u00E2\u20AC\u0153/g, "\u201C")
    .replace(/\u00E2\u20AC\u201D/g, "\u201D")
    .replace(/\u00E2\u20AC\u201C/g, "\u201C")
    .replace(/\u00E2\u20AC\u201D/g, "\u201D")
    .replace(/\u00E2\u20AC\u201C/g, "\u201C")
    .replace(/â€˜/g, "\u2018")
    .replace(/â€™/g, "\u2019")
    .replace(/â€œ/g, "\u201C")
    .replace(/â€/g, "\u201D")
    .replace(/â€“/g, "\u2013")
    .replace(/â€”/g, "\u2014");
}

export function stripHcHtml(text: string): string {
  return fixMojibake(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** ASP.NET `/Date(ms±offset)/` → YYYY-MM-DD. Uses the millisecond clock, not the offset suffix. */
export function aspNetDate(raw: unknown): string | null {
  if (raw == null) return null;
  const text = String(raw);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ms = text.match(/\/Date\((-?\d+)(?:[+-]\d+)?\)\//);
  if (!ms) return null;
  const n = Number(ms[1]);
  if (!Number.isFinite(n)) return null;
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  if (year < 1990 || year > 2100) return null;
  return d.toISOString().slice(0, 10);
}

export function citeFromRegulation(regulation: string): string | null {
  const m = regulation.match(/\b(?:MDR|FDA)\s+s\.\d+(?:\.\d+)?(?:\s*\([^)]+\))?/i);
  return m ? m[0].replace(/\s+/g, " ").replace(/^mdr/i, "MDR").replace(/^fda/i, "FDA") : null;
}

export function expandRating(rating: string | null, ratingDesc: string | null): string | null {
  if (ratingDesc && ratingDesc.trim()) return ratingDesc.trim();
  const r = (rating ?? "").trim();
  if (r === "NC") return "Non-compliant";
  if (r === "C") return "Compliant";
  if (r === "I") return "Inspection in progress";
  return r || null;
}

export function listingSite(rec: Record<string, unknown>): string | null {
  const city = String(rec.city ?? "").trim();
  const province = String(rec.province ?? rec.site ?? "").trim();
  if (city && province) return `${city}, ${province}`;
  return city || province || null;
}

export function dedupeSummaries(raw: unknown): string[] {
  const items = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const text = stripHcHtml(String(item ?? ""));
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

export function parseSearchJson(raw: unknown): GmpMdListing[] {
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : [];
  const found: GmpMdListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const inspectionNumber = String(
      rec.insepctionNumber ?? rec.iidInspectionNumber ?? rec.inspectionNumber ?? rec.drupalTempID ?? "",
    ).trim();
    if (!inspectionNumber || seen.has(inspectionNumber)) continue;
    seen.add(inspectionNumber);
    const firm = String(rec.establishmentName ?? "").trim() || inspectionNumber;
    const rating = String(rec.rating ?? "").trim() || null;
    found.push({
      inspectionNumber,
      firm,
      referenceNumber: String(rec.referenceNumber ?? "").trim() || null,
      site: listingSite(rec),
      inspectedOn: aspNetDate(rec.inspectionStartDate ?? rec.insStartDate),
      rating,
      ratingDesc: expandRating(rating, String(rec.ratingDesc ?? "").trim() || null),
      reportCard: rec.reportCard === true,
      sourceUrl: cardPageUrl(inspectionNumber),
    });
  }
  return found.sort((a, b) => {
    const da = `${a.inspectedOn ?? ""}|${a.inspectionNumber}`;
    const db = `${b.inspectedOn ?? ""}|${b.inspectionNumber}`;
    return db.localeCompare(da);
  });
}

export function parseObservations(card: Record<string, unknown>): GmpMdObservation[] {
  const rows = Array.isArray(card.data) ? card.data : [];
  const out: GmpMdObservation[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const regulation = stripHcHtml(String(rec.regulation ?? ""));
    const texts = dedupeSummaries(rec.summaryList);
    const n = Number(rec.no ?? rec.observationNo ?? out.length + 1);
    const text = texts.join(" ");
    if (!regulation && !text) continue;
    out.push({
      n: Number.isFinite(n) && n > 0 ? n : out.length + 1,
      regulation,
      cite: citeFromRegulation(regulation),
      text,
    });
  }
  return out;
}

export function buildCardBody(card: GmpMdCard): string {
  const lines: string[] = [
    `Health Canada medical-device inspection report card`,
    `Establishment: ${card.firm}`,
    `Inspection: ${card.inspectionNumber}`,
  ];
  if (card.referenceNumber) lines.push(`Reference: ${card.referenceNumber}`);
  if (card.site) lines.push(`Site: ${card.site}`);
  if (card.inspectedOn) lines.push(`Inspected: ${card.inspectedOn}`);
  if (card.ratingDesc) lines.push(`Rating: ${card.ratingDesc}`);
  if (card.insType) lines.push(`Type: ${card.insType}`);
  lines.push("");
  lines.push("Summary of observations");
  for (const obs of card.observations) {
    lines.push("");
    lines.push(`${obs.n}. ${obs.regulation}`.trim());
    if (obs.text) lines.push(obs.text);
  }
  if (card.outcome.length) {
    lines.push("");
    lines.push("Inspection outcome");
    for (const line of card.outcome) lines.push(line);
  }
  if (card.measuresTaken.length) {
    lines.push("");
    lines.push("Measures taken");
    for (const line of card.measuresTaken) lines.push(line);
  }
  return lines.join("\n").replace(/\u000a/g, "\n").trim();
}

export function parseReportCard(
  raw: unknown,
  meta?: { site?: string | null; sourceUrl?: string },
): GmpMdCard | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const inspectionNumber = String(
    rec.insepctionNumber ?? rec.iidInspectionNumber ?? rec.inspectionNumber ?? "",
  ).trim();
  if (!inspectionNumber) return null;
  const firm = String(rec.establishmentName ?? "").trim() || inspectionNumber;
  const observations = parseObservations(rec);
  const outcome = dedupeSummaries(rec.insOutcomeList);
  const measuresTaken = [
    ...dedupeSummaries(rec.measureTakenList),
    ...dedupeSummaries(rec.EnforcementActions),
  ];
  const rating = String(rec.rating ?? "").trim() || null;
  const card: GmpMdCard = {
    id: cardId(firm, inspectionNumber),
    inspectionNumber,
    firm,
    referenceNumber: String(rec.referenceNumber ?? "").trim() || null,
    site: meta?.site ?? listingSite(rec),
    inspectedOn: aspNetDate(rec.insStartDate ?? rec.inspectionStartDate),
    rating,
    ratingDesc: expandRating(rating, String(rec.ratingDesc ?? "").trim() || null),
    insType: String(rec.insType ?? rec.inspectionType ?? "").trim() || null,
    insSubType: String(rec.insSubType ?? "").trim() || null,
    sourceUrl: meta?.sourceUrl ?? cardPageUrl(inspectionNumber),
    outcome,
    measuresTaken,
    body: "",
    observations,
  };
  card.body = buildCardBody(card);
  return card;
}

/** Ugly official body required. Rating-only / empty data[] is a kill. Not Drug GMP C.02. */
export function isRealGmpMdBody(card: Pick<GmpMdCard, "body" | "observations">): boolean {
  const cites = card.observations.filter((o) => o.cite && /MDR\s+s\./i.test(o.cite) && o.text.trim().length >= 24);
  if (cites.length === 0) return false;
  const blob = card.body.replace(/\s+/g, " ");
  if (blob.length < 180) return false;
  if (!/MDR\s+s\.\d+/i.test(card.body)) return false;
  if (/C\.02\.\d+/.test(card.body)) return false;
  if (!/summary of observations/i.test(card.body)) return false;
  if (!/medical-device inspection report card/i.test(card.body)) return false;
  return true;
}

export function emptySnapshot(reason: string): GmpMdSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: OGL_NOTE,
    sources: { listing: LISTING_URL, search: SEARCH_URL, card: CARD_URL },
    cards: [],
  };
}

function cardDateKey(card: Pick<GmpMdCard, "inspectedOn" | "inspectionNumber">): string {
  return `${card.inspectedOn ?? ""}|${card.inspectionNumber.padStart(8, "0")}`;
}

export function assembleSnapshot(
  cards: GmpMdCard[],
  fetchedAt = new Date().toISOString(),
): GmpMdSnapshot {
  const withBody = cards
    .filter((c) => isRealGmpMdBody(c))
    .sort((a, b) => cardDateKey(b).localeCompare(cardDateKey(a)));
  const asOf =
    withBody
      .map((c) => c.inspectedOn)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason:
      withBody.length > 0
        ? null
        : "Official Health Canada medical-device report cards had no extractable observation text.",
    fetchedAt,
    asOf,
    license: OGL_NOTE,
    sources: { listing: LISTING_URL, search: SEARCH_URL, card: CARD_URL },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): GmpMdSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as GmpMdSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): GmpMdSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("GMP_MD_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: GmpMdSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedGmpMdBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealGmpMdBody(c)));
}

function htmlDir(): string {
  return env("GMP_MD_HTML_DIR");
}

function firstSliceLimit(): number {
  const raw = env("GMP_MD_LIMIT", String(DEFAULT_FIRST_SLICE));
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_FIRST_SLICE;
}

function maxFetchLimit(): number {
  const raw = env("GMP_MD_MAX_FETCH", String(DEFAULT_MAX_FETCH));
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_FETCH;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

export async function fetchHcText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": HTTP_UA,
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchHcJson(url: string): Promise<unknown> {
  const text = await fetchHcText(url);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${url} not JSON`);
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadOfficialListings(dir: string): Promise<GmpMdListing[]> {
  if (dir) {
    const jsonText = readNamedFile(dir, ["search-excerpt.json", "search-all.json", "listing.json"]);
    if (jsonText) {
      try {
        const listed = parseSearchJson(JSON.parse(jsonText));
        if (listed.length > 0) return listed;
      } catch {
        /* fall through */
      }
    }
    return [];
  }
  const cache = searchCachePath();
  if (existsSync(cache)) {
    try {
      const listed = parseSearchJson(JSON.parse(readFileSync(cache, "utf-8")));
      if (listed.length > 0) return listed;
    } catch {
      /* refetch */
    }
  }
  const raw = await fetchHcJson(SEARCH_URL);
  mkdirSync(gmpMdDir(), { recursive: true });
  writeFileSync(cache, JSON.stringify(raw));
  return parseSearchJson(raw);
}

function priorBodies(): Map<string, GmpMdCard> {
  const prior = new Map<string, GmpMdCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealGmpMdBody(card)) prior.set(card.inspectionNumber, card);
  }
  return prior;
}

/** Accepts `{ inspectionNumbers }`, live `{ cards: [{ inspectionNumber }] }`, or a string array. No bodies. */
export function parseKnownInspectionIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === "string" && /^\d+$/.test(item.trim())) return [item.trim()];
      if (typeof item === "number" && Number.isFinite(item)) return [String(item)];
      if (item && typeof item === "object" && "inspectionNumber" in item) {
        const id = String((item as { inspectionNumber: unknown }).inspectionNumber).trim();
        return /^\d+$/.test(id) ? [id] : [];
      }
      return [];
    });
  }
  if (!raw || typeof raw !== "object") return [];
  const rec = raw as { inspectionNumbers?: unknown; cards?: unknown; letters?: unknown };
  if (Array.isArray(rec.inspectionNumbers)) return parseKnownInspectionIds(rec.inspectionNumbers);
  if (Array.isArray(rec.cards)) return parseKnownInspectionIds(rec.cards);
  if (Array.isArray(rec.letters)) return parseKnownInspectionIds(rec.letters);
  return [];
}

function readIdSetFile(path: string): Set<string> {
  if (!existsSync(path)) return new Set();
  try {
    return new Set(parseKnownInspectionIds(JSON.parse(readFileSync(path, "utf-8"))));
  } catch {
    return new Set();
  }
}

export function readSkippedNoTextIds(): Set<string> {
  return readIdSetFile(skippedNoTextPath());
}

export function writeSkippedNoTextIds(ids: Set<string>): void {
  const path = skippedNoTextPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify(
      {
        inspectionNumbers: [...ids].sort((a, b) => Number(b) - Number(a)),
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
}

function skipIdsFromEnv(): string[] {
  return env("GMP_MD_SKIP_IDS")
    .split(/[, \s]+/)
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id));
}

function skipLiveEnabled(opts?: { skipLive?: boolean }): boolean {
  if (opts?.skipLive === true) return true;
  if (opts?.skipLive === false) return false;
  const raw = env("GMP_MD_SKIP_LIVE").toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

async function loadKnownSkipIds(opts?: { knownIds?: string[]; skipLive?: boolean }): Promise<Set<string>> {
  const ids = new Set<string>([...skipIdsFromEnv(), ...(opts?.knownIds ?? [])]);
  for (const id of readIdSetFile(knownIdsPath())) ids.add(id);
  const knownManifest = env("GMP_MD_KNOWN_MANIFEST");
  if (knownManifest && existsSync(knownManifest)) {
    try {
      for (const id of parseKnownInspectionIds(JSON.parse(readFileSync(knownManifest, "utf-8")))) {
        ids.add(id);
      }
    } catch {
      /* ignore unreadable local manifest */
    }
  }
  if (skipLiveEnabled(opts)) {
    try {
      const url = env("GMP_MD_LIVE_MANIFEST", LIVE_MANIFEST_URL);
      for (const id of parseKnownInspectionIds(await fetchHcJson(url))) ids.add(id);
    } catch {
      /* live host unreachable */
    }
  }
  return ids;
}

function keepPriorSnapshot(
  prior: Map<string, GmpMdCard>,
  extra: Partial<GmpMdSnapshot>,
  reason: string | null,
): GmpMdSnapshot {
  const snap = {
    ...assembleSnapshot([...prior.values()]),
    ...extra,
  };
  if (reason && snap.cards.length > 0) {
    snap.reason = reason;
  }
  writeSnapshot(snap);
  return snap;
}

function localCardText(dir: string, inspectionNumber: string): string | null {
  if (!dir) return null;
  const exact = readNamedFile(dir, [`${inspectionNumber}.json`, `card${inspectionNumber}.json`]);
  if (exact) return exact;
  if (!existsSync(dir)) return null;
  const prefix = `${inspectionNumber}-`;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(prefix) && name.endsWith(".json")) {
      return readFileSync(join(dir, name), "utf-8");
    }
  }
  return null;
}

export async function collectGmpMd(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
  knownIds?: string[];
  skipLive?: boolean;
}): Promise<GmpMdSnapshot> {
  const dir = opts?.htmlDir ?? htmlDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 200);
  const allListed = await loadOfficialListings(dir);
  const withCard = allListed.filter((row) => row.reportCard);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = gmpMdDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = priorBodies();
  if (allListed.length === 0) {
    if (prior.size > 0) {
      return keepPriorSnapshot(
        prior,
        { listedCount: 0, reportCardCount: 0, fetchedCards: 0, skippedNoText: 0 },
        "Official search dump missed; kept cached observation cards.",
      );
    }
    const snap = emptySnapshot("Official Health Canada medical-device search dump had no inspection rows.");
    writeSnapshot(snap);
    return snap;
  }
  const knownSkip = await loadKnownSkipIds(opts);
  const noTextSkip = readSkippedNoTextIds();
  const cards: GmpMdCard[] = [];
  const seen = new Set<string>();
  let fetchedCards = 0;
  let skippedNoText = 0;
  let skippedKnown = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of withCard) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = prior.get(row.inspectionNumber);
    if (cached) {
      cards.push(cached);
      seen.add(row.inspectionNumber);
      reused += 1;
      continue;
    }
    if (knownSkip.has(row.inspectionNumber)) {
      skippedKnown += 1;
      continue;
    }
    if (noTextSkip.has(row.inspectionNumber)) {
      skippedNoText += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedCards >= fetchCap) break;
    if (!dir) await pause(pauseMs);
    try {
      const localText = localCardText(dir, row.inspectionNumber);
      if (dir && !localText) {
        noTextSkip.add(row.inspectionNumber);
        skippedNoText += 1;
        continue;
      }
      if (!localText) fetchedCards += 1;
      const parsed = parseReportCard(localText ? JSON.parse(localText) : await fetchHcJson(cardApiUrl(row.inspectionNumber)), {
        site: row.site,
        sourceUrl: row.sourceUrl,
      });
      if (!parsed || !isRealGmpMdBody(parsed)) {
        noTextSkip.add(row.inspectionNumber);
        skippedNoText += 1;
        continue;
      }
      if (!parsed.site && row.site) parsed.site = row.site;
      cards.push(parsed);
      seen.add(row.inspectionNumber);
      addedThisRun += 1;
    } catch {
      skippedNoText += 1;
    }
  }
  writeSkippedNoTextIds(noTextSkip);
  for (const [id, card] of prior) {
    if (!seen.has(id)) cards.push(card);
  }
  const snap = {
    ...assembleSnapshot(cards),
    listedCount: allListed.length,
    reportCardCount: withCard.length,
    fetchedCards,
    skippedNoText,
    skippedKnown,
    reused,
    addedThisRun,
  };
  writeSnapshot(snap);
  return snap;
}

export async function loadGmpMd(): Promise<GmpMdSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealGmpMdBody(c))) {
    return cached;
  }
  try {
    return await collectGmpMd();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealGmpMdBody(c)) ? "stale" : "empty",
        reason: `Live Health Canada medical-device fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `Health Canada medical-device report cards are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildGmpMdManifest(snap: GmpMdSnapshot | null): Record<string, unknown> {
  const cards = snap?.cards ?? [];
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote("/gmp-md", 'Full catalog: count + id + firm + dates + rating + official URL. Not the ratings-only search index. Not /gmp'),
    license: OGL_NOTE,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: GMP_MD_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.filter((c) => isRealGmpMdBody(c)).length,
    cards: cards.map((c) => ({
      id: c.id,
      inspectionNumber: c.inspectionNumber,
      firm: c.firm,
      referenceNumber: c.referenceNumber,
      site: c.site,
      inspectedOn: c.inspectedOn,
      rating: c.rating,
      ratingDesc: c.ratingDesc,
      insType: c.insType,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: [...CARD_FIELDS] },
    sources: snap?.sources ?? { listing: LISTING_URL, search: SEARCH_URL, card: CARD_URL },
  };
}

export async function loadGmpMdManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildGmpMdManifest(cached);
  return buildGmpMdManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectGmpMd()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealGmpMdBody(c)).length,
            listedCount: snap.listedCount ?? 0,
            reportCardCount: snap.reportCardCount ?? 0,
            fetchedCards: snap.fetchedCards ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            skippedKnown: snap.skippedKnown ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            listed: snap.cards.some((c) => isRealGmpMdBody(c)),
            cards: snap.cards.map((c) => ({
              id: c.id,
              inspectionNumber: c.inspectionNumber,
              firm: c.firm,
              referenceNumber: c.referenceNumber,
              inspectedOn: c.inspectedOn,
              rating: c.ratingDesc,
              observationCount: c.observations.length,
              cites: c.observations.map((o) => o.cite).filter(Boolean),
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
