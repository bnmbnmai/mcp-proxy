/**
 * Official EMA human-medicine referral procedure TEXT door.
 * Official English referral PDFs on ema.europa.eu only (`/en/documents/referral/…_en.pdf`).
 * Does not sell the free catalog JSON. Does not invent procedure text.
 * Human medicines only. Not people. Not veterinary. Not SwissPAR / FDA / Superfund.
 * Prefer assessment report > scientific conclusions > official Q&A.
 * Skip notification / timetable / list-of-questions / annex-I teasers and product-info annexes.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const EMA_REFERRALS_PATH = "/ema-referrals";
export const EMA_REFERRALS_MANIFEST_PATH = "/ema-referrals/manifest.json";
export const EMA_REFERRALS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "ema-referral-procedure-bodies";
export const PRODUCT_NAME = "EMA human-medicine referral procedure text";

export const INDEX_URL =
  "https://www.ema.europa.eu/en/documents/report/referrals-output-json-report_en.json";
export const PAGE_HOST = "www.ema.europa.eu";
export const PDF_HOST = "https://www.ema.europa.eu/en/documents/referral/";
export const LICENSE =
  "EMA copyright. Public EMA documents may be reproduced for commercial purposes if the European Medicines Agency is acknowledged as the source.";
export const ATTRIBUTION = "European Medicines Agency (EMA)";

export const CARD_FIELDS = [
  "id",
  "name",
  "inn",
  "date",
  "status",
  "typeOfProcedure",
  "pageUrl",
  "sourceUrl",
  "kind",
  "body",
] as const;

export type EmaReferralRow = {
  name?: string;
  inn?: string;
  status?: string;
  category?: string;
  type_of_procedure?: string;
  last_updated?: string;
  ec_decision_date?: string;
  opinion_date?: string;
  start_date?: string;
  referral_url?: string;
  therapeutic_area?: string;
};

export type EmaReferralListing = {
  id: string;
  name: string;
  inn: string;
  date: string | null;
  status: string;
  typeOfProcedure: string;
  pageUrl: string;
  sourceUrl?: string;
};

export type EmaReferralCard = {
  id: string;
  name: string;
  inn: string;
  date: string | null;
  status: string;
  typeOfProcedure: string;
  pageUrl: string;
  sourceUrl: string;
  kind: string;
  body: string;
};

export type EmaReferralsSnapshot = {
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
  cards: EmaReferralCard[];
};

const HTTP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

const SKIP_PDF =
  /notification|timetable|list-of-questions|list_of_questions|annex-i-|annex_i_|product-information|product_information|annex-iii-amendments|annex_iii_amendments|_de\.pdf|_fr\.pdf|_es\.pdf|_it\.pdf|_nl\.pdf|_pl\.pdf|_pt\.pdf/i;

const PEOPLE_ONLY =
  /\b(curriculum vitae|cv of|date of birth|home address|passport number|social security|private email)\b/i;

const MIN_BODY_CHARS = 700;

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function emaReferralsDir(): string {
  if (env("EMA_REFERRALS_DIR")) return resolve(env("EMA_REFERRALS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ema-referrals"));
}

export function snapshotPath(): string {
  return join(emaReferralsDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/ema-referrals/seed-snapshot.json"),
    join(here, "fixtures/ema-referrals/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function officialHumanReferralUrl(raw: string | undefined): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.hostname !== "www.ema.europa.eu" && u.hostname !== "ema.europa.eu") return null;
  if (!/^\/en\/medicines\/human\/referrals\/[a-z0-9-]+\/?$/i.test(u.pathname)) return null;
  return `https://www.ema.europa.eu${u.pathname.replace(/\/$/, "")}`;
}

export function slugFromReferralUrl(url: string): string {
  const path = new URL(url).pathname.replace(/\/$/, "");
  return path.slice(path.lastIndexOf("/") + 1).toLowerCase();
}

export function isEnglishReferralPdf(href: string): boolean {
  let u: URL;
  try {
    u = new URL(href, "https://www.ema.europa.eu");
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.hostname !== "www.ema.europa.eu" && u.hostname !== "ema.europa.eu") return false;
  if (!u.pathname.toLowerCase().endsWith("_en.pdf")) return false;
  if (!u.pathname.toLowerCase().includes("/en/documents/referral/")) return false;
  if (SKIP_PDF.test(u.pathname)) return false;
  return true;
}

export function officialReferralPdfUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://www.ema.europa.eu");
    return isEnglishReferralPdf(parsed.href) ? parsed.href : null;
  } catch {
    return null;
  }
}

export function scoreReferralPdf(href: string, anchorText = ""): number {
  const blob = `${href} ${anchorText}`.toLowerCase();
  if (SKIP_PDF.test(blob)) return -1;
  if (/assessment-report|referral-assessment|public-assessment/.test(blob)) return 100;
  if (/scientific-conclusions/.test(blob)) return 90;
  if (/questions-answers|question-answer/.test(blob) && /recommends|starts-review|chmp|prac|article-2/.test(blob)) {
    return 80;
  }
  if (/questions-answers|question-answer/.test(blob) && !/annex/.test(blob)) return 70;
  return 40;
}

export function dmyToIso(raw: string | undefined): string | null {
  const t = String(raw || "").trim();
  const dmy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const iso = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function strField(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

export function normalizeOfficialRow(raw: Record<string, unknown>): EmaReferralRow {
  return {
    name: strField(raw.referral_name || raw.name),
    inn: strField(raw.international_non_proprietary_name_inn_common_name || raw.inn),
    status: strField(raw.current_status || raw.status),
    category: strField(raw.category),
    type_of_procedure: strField(raw.referral_type || raw.type_of_procedure),
    last_updated: dmyToIso(strField(raw.last_updated_date || raw.last_updated)) || undefined,
    ec_decision_date: dmyToIso(strField(raw.european_commission_decision_date || raw.ec_decision_date)) || undefined,
    opinion_date: dmyToIso(strField(raw.chmp_cvmp_opinion_date || raw.opinion_date)) || undefined,
    start_date: dmyToIso(strField(raw.procedure_start_date || raw.start_date)) || undefined,
    referral_url: strField(raw.referral_url),
    therapeutic_area: strField(raw.class || raw.therapeutic_area),
  };
}

export function isHumanProcedure(row: Pick<EmaReferralRow, "category" | "type_of_procedure" | "referral_url">): boolean {
  if (/veterinary/i.test(String(row.category || "")) || /\/veterinary\/referrals\//i.test(String(row.referral_url || ""))) {
    return false;
  }
  if (/human/i.test(String(row.category || ""))) return true;
  if (officialHumanReferralUrl(row.referral_url)) return true;
  return /human/i.test(String(row.type_of_procedure || ""));
}

export function isCompletedHumanReferral(row: EmaReferralRow): boolean {
  if (!isHumanProcedure(row)) return false;
  if (!officialHumanReferralUrl(row.referral_url)) return false;
  const status = String(row.status || "").toLowerCase();
  if (/withdrawn by the applicant/.test(status) && !row.ec_decision_date) return false;
  if (/under evaluation|procedure started/.test(status)) return false;
  return Boolean(
    row.ec_decision_date ||
      /final|european commission|chmp (final )?opinion|cmdh final|completed|article 107i/i.test(status),
  );
}

export function isPeopleRow(row: EmaReferralRow): boolean {
  const blob = `${row.name || ""} ${row.inn || ""} ${row.therapeutic_area || ""}`;
  return PEOPLE_ONLY.test(blob) && !/\b(chmp|prac|marketing authorisation)\b/i.test(blob);
}

function looksLikePeopleDump(text: string): boolean {
  return PEOPLE_ONLY.test(text) && !/\b(chmp|prac|marketing authorisation|benefit-risk)\b/i.test(text);
}

export function isRealEmaReferralBody(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length < MIN_BODY_CHARS) return false;
  if (looksLikePeopleDump(t)) return false;
  if (/"referral_url"\s*:/.test(t) && /("type_of_procedure"|"current_status"|"referral_name")\s*:/.test(t)) return false;
  if (/\bswisspar\b/i.test(t) && !/\beuropean medicines agency\b/i.test(t)) return false;
  if (/\bform 483\b/i.test(t) || /\bwarning letter\b/i.test(t)) return false;
  if (/\bsuperfund\b/i.test(t) && !/\bema\b/i.test(t)) return false;
  if (/\bthis is a notification only\b/i.test(t)) return false;
  if (/\bno assessment report in this teaser\b/i.test(t)) return false;
  const hasEma = /\beuropean medicines agency\b|\bema\b/i.test(t);
  const hasReferral =
    /\breferral\b/i.test(t) &&
    /\b(article 20|article 31|article 29|article 30|article 107i|pharmacovigilance)\b/i.test(t);
  const hasBody =
    /\b(chmp|prac|benefit-risk|scientific conclusions?|assessment report|marketing authorisation|committee for medicinal products)\b/i.test(
      t,
    );
  return hasEma && hasReferral && hasBody;
}

function rowDate(row: EmaReferralRow): string | null {
  const raw = String(row.last_updated || row.ec_decision_date || row.opinion_date || row.start_date || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export function parseOfficialReferralIndex(raw: string): EmaReferralRow[] {
  const parsed = JSON.parse(raw) as { data?: Record<string, unknown>[] };
  const rows = Array.isArray(parsed.data) ? parsed.data : [];
  return rows.map((row) => normalizeOfficialRow(row));
}

export function parseListingRows(rows: EmaReferralRow[]): EmaReferralListing[] {
  const out: EmaReferralListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (isPeopleRow(row)) continue;
    if (!isHumanProcedure(row)) continue;
    const pageUrl = officialHumanReferralUrl(row.referral_url);
    if (!pageUrl) continue;
    const id = slugFromReferralUrl(pageUrl);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: String(row.name || id).replace(/\s+/g, " ").trim(),
      inn: String(row.inn || "").trim(),
      date: rowDate(row),
      status: String(row.status || "").trim(),
      typeOfProcedure: String(row.type_of_procedure || "").trim(),
      pageUrl,
    });
  }
  return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.id.localeCompare(b.id));
}

export function extractEnglishReferralPdfs(html: string): { href: string; text: string; score: number }[] {
  const out: { href: string; text: string; score: number }[] = [];
  const seen = new Set<string>();
  const re = /<a\b[^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1].replace(/&amp;/g, "&");
    if (!isEnglishReferralPdf(href)) continue;
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const abs = new URL(href, "https://www.ema.europa.eu").href;
    if (seen.has(abs)) continue;
    const score = scoreReferralPdf(abs, text);
    if (score < 0) continue;
    seen.add(abs);
    out.push({ href: abs, text, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function pickBestPdf(html: string): { href: string; kind: string } | null {
  const pdfs = extractEnglishReferralPdfs(html);
  if (!pdfs.length) return null;
  const best = pdfs[0];
  let kind = "referral-document";
  if (/assessment-report|referral-assessment/i.test(best.href)) kind = "assessment-report";
  else if (/scientific-conclusions/i.test(best.href)) kind = "scientific-conclusions";
  else if (/questions-answers|question-answer/i.test(best.href)) kind = "questions-answers";
  return { href: best.href, kind };
}

export function parseEmaReferralText(
  text: string,
  meta: {
    sourceUrl: string;
    pageUrl?: string;
    name?: string;
    inn?: string;
    date?: string | null;
    status?: string;
    typeOfProcedure?: string;
    id?: string;
    kind?: string;
  },
): EmaReferralCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialReferralPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const pageUrl = officialHumanReferralUrl(meta.pageUrl) || meta.pageUrl || "";
  const id = meta.id || (pageUrl ? slugFromReferralUrl(pageUrl) : sourceUrl);
  return {
    id,
    name: (meta.name || id).replace(/\s+/g, " ").trim(),
    inn: (meta.inn || "").trim(),
    date: meta.date ?? null,
    status: (meta.status || "").trim(),
    typeOfProcedure: (meta.typeOfProcedure || "").trim(),
    pageUrl,
    sourceUrl,
    kind: meta.kind || "referral-document",
    body,
  };
}

export function emptyEmaReferralsSnapshot(reason: string): EmaReferralsSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: INDEX_URL, pdfHost: PDF_HOST, pageHost: `https://${PAGE_HOST}/` },
    cards: [],
  };
}

export function assembleEmaReferralsSnapshot(
  cards: EmaReferralCard[],
  fetchedAt = new Date().toISOString(),
): EmaReferralsSnapshot {
  const withBody = cards
    .filter((c) => isRealEmaReferralBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official EMA referral PDFs had no extractable procedure text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: INDEX_URL, pdfHost: PDF_HOST, pageHost: `https://${PAGE_HOST}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): EmaReferralsSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as EmaReferralsSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readEmaReferralsSnapshot(): EmaReferralsSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("EMA_REFERRALS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeEmaReferralsSnapshot(snap: EmaReferralsSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchEmaText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/json,*/*" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchEmaBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,*/*" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${url} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("EMA_REFERRALS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function listingDir(): string {
  return env("EMA_REFERRALS_JSON_DIR") || env("EMA_REFERRALS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("EMA_REFERRALS_LIMIT", "14"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 14;
}

function maxFetchLimit(): number {
  const n = Number(env("EMA_REFERRALS_MAX_FETCH", "20"));
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

const SEED_SLUGS = [
  "tavneos",
  "tecovirimat-siga",
  "levamisole-containing-medicinal-products",
  "melatomed-associated-names",
  "oxbryta",
  "ixchiq",
  "azithromycin-containing-medicinal-products-systemic-use",
  "finasteride-dutasteride-containing-medicinal-products",
  "mysimba",
  "metamizole-containing-medicinal-products-0",
  "ocaliva",
  "hydroxyprogesterone-caproate-containing-medicinal-products",
  "synapse",
  "pseudoephedrine-containing-medicinal-products",
  "adakveo",
  "janus-kinase-inhibitors-jaki",
];

async function loadOfficialListings(dir: string): Promise<{ listed: EmaReferralListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json", "referrals-output-json-report_en.json"]);
    if (json) {
      const rows = parseOfficialReferralIndex(json);
      const listed = parseListingRows(rows);
      return { listed, listedCount: listed.length };
    }
    return { listed: [], listedCount: 0 };
  }
  const rows = parseOfficialReferralIndex(await fetchEmaText(INDEX_URL));
  const listed = parseListingRows(rows.filter(isCompletedHumanReferral));
  const byId = new Map(listed.map((row) => [row.id, row]));
  const ordered: EmaReferralListing[] = [];
  for (const slug of SEED_SLUGS) {
    const row = byId.get(slug);
    if (row) ordered.push(row);
  }
  for (const row of listed) {
    if (!ordered.some((r) => r.id === row.id)) ordered.push(row);
  }
  return { listed: ordered, listedCount: listed.length };
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function collectEmaReferrals(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<EmaReferralsSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = emaReferralsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, EmaReferralCard>();
  for (const card of readEmaReferralsSnapshot()?.cards ?? []) {
    if (isRealEmaReferralBody(card.body)) prior.set(card.id, card);
  }
  const cards: EmaReferralCard[] = [];
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
      let sourceUrl = row.sourceUrl || "";
      let kind = "referral-document";
      const text =
        localText ??
        (await (async () => {
          const html = await fetchEmaText(row.pageUrl);
          const pdf = pickBestPdf(html);
          if (!pdf) throw new Error(`${row.pageUrl} had no official EN referral PDF`);
          sourceUrl = pdf.href;
          kind = pdf.kind;
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchEmaBytes(pdf.href));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseEmaReferralText(text, {
        sourceUrl: sourceUrl || `${PDF_HOST}${row.id}_en.pdf`,
        pageUrl: row.pageUrl,
        name: row.name,
        inn: row.inn,
        date: row.date,
        status: row.status,
        typeOfProcedure: row.typeOfProcedure,
        id: row.id,
        kind,
      });
      if (!isRealEmaReferralBody(parsed.body)) {
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
    ...assembleEmaReferralsSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeEmaReferralsSnapshot(snap);
  return snap;
}

export async function loadEmaReferrals(): Promise<EmaReferralsSnapshot> {
  const cached = readEmaReferralsSnapshot();
  if (cached && cached.cards.some((c) => isRealEmaReferralBody(c.body))) return cached;
  try {
    return await collectEmaReferrals();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealEmaReferralBody(c.body)) ? "stale" : "empty",
        reason: `Live EMA referral fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyEmaReferralsSnapshot(
      `EMA referral PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildEmaReferralsManifest(snap: EmaReferralsSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealEmaReferralBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + name + date + status + official PDF URL only. Procedure body is the paid GET /ema-referrals payload. This free manifest lists the full catalog. GET ?id= is one official text for $0.02. Default GET is the newest 10 official texts for $0.05. If the catalog has fewer than 10, that $0.05 GET is the whole current set. Older pages are another $0.05 on the same URL (page/before).",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: EMA_REFERRALS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      name: c.name,
      date: c.date,
      status: c.status,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "name", "date", "status", "sourceUrl"] },
    sources: snap?.sources ?? { index: INDEX_URL, pdfHost: PDF_HOST, pageHost: `https://${PAGE_HOST}/` },
  };
}

export async function loadEmaReferralsManifest(): Promise<Record<string, unknown>> {
  return buildEmaReferralsManifest(readEmaReferralsSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectEmaReferrals()
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
