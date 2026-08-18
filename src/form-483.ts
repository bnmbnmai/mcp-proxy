/**
 * FDA Form 483 inspectional-observation BODIES door.
 * Official posted/proactive OII FOIA Electronic Reading Room PDFs only.
 * Does not invent observation text. Does not scrape Redica.
 * Does not wrap the free CMS 2567 CSV. Not WASDE. Not warning-letters HTML.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const FORM_483_PATH = "/form-483";
export const FORM_483_MANIFEST_PATH = "/form-483/manifest.json";
export const FORM_483_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "fda-form-483-bodies";
export const PRODUCT_NAME = "FDA Form 483 observation bodies";

export const LISTING_URL =
  "https://www.fda.gov/about-fda/office-inspections-and-investigations/oii-foia-electronic-reading-room";
export const LISTING_JSON_URL =
  "https://www.fda.gov/datatables-json/ora-foia-reading.json?_format=json";
export const MEDIA_BASE = "https://www.fda.gov/media/";
export const MEDIA_PATH_RE = /\/media\/(\d+)\/download/i;
export const RECORD_TYPE_483 = "483";
/** Target real extractable 483 bodies per collect. `0` = keep walking the official list. */
export const DEFAULT_FIRST_SLICE = 25;
/** Max official PDF downloads per collect. Image-only scans are skipped, not invented. `0` = no cap. */
export const DEFAULT_MAX_FETCH = 80;

export const LETTER_FIELDS = [
  "id",
  "mediaId",
  "firm",
  "fei",
  "recordDate",
  "publishedOn",
  "issuedOn",
  "state",
  "country",
  "establishmentType",
  "sourceUrl",
  "filename",
  "body",
  "observations",
] as const;

export type Form483Listing = {
  id: string;
  mediaId: string;
  firm: string;
  fei: string | null;
  recordDate: string | null;
  publishedOn: string | null;
  state: string | null;
  country: string | null;
  establishmentType: string | null;
  sourceUrl: string;
};

export type Form483Observation = {
  n: number;
  text: string;
};

export type Form483Letter = {
  id: string;
  mediaId: string;
  firm: string;
  fei: string | null;
  recordDate: string | null;
  publishedOn: string | null;
  issuedOn: string | null;
  state: string | null;
  country: string | null;
  establishmentType: string | null;
  sourceUrl: string;
  filename: string | null;
  body: string;
  observations: Form483Observation[];
};

export type Form483Snapshot = {
  ok: true;
  product: typeof PRODUCT_ID;
  status: "ok" | "empty" | "stale";
  reason: string | null;
  fetchedAt: string;
  asOf: string | null;
  listedCount?: number;
  fetchedPdfs?: number;
  skippedNoText?: number;
  sources: {
    listing: string;
    listingJson?: string;
    mediaBase: string;
  };
  letters: Form483Letter[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FDA OII FOIA public 483 PDFs; +https://www.fda.gov/)";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function form483Dir(): string {
  if (env("FORM_483_DIR")) return resolve(env("FORM_483_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/form-483"));
}

export function snapshotPath(): string {
  return join(form483Dir(), "snapshot.json");
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " "));
}

export function absolutePdfUrl(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("/")) return `https://www.fda.gov${href}`;
  return `${MEDIA_BASE}${href.replace(/^\.\//, "")}`;
}

export function mediaIdFromUrl(url: string): string | null {
  const m = url.match(MEDIA_PATH_RE);
  return m ? m[1] : null;
}

export function slugFirm(firm: string): string {
  return firm
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function letterId(firm: string, mediaId: string): string {
  const slug = slugFirm(firm);
  return slug ? `${slug}-${mediaId}` : mediaId;
}

function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) {
    return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  return null;
}

function cellText(row: string, field: string): string {
  const re = new RegExp(
    `class="[^"]*views-field-${field}[^"]*"[^>]*>([\\s\\S]*?)</td>`,
    "i",
  );
  const m = row.match(re);
  return m ? stripTags(m[1]) : "";
}

function cellTime(row: string, field: string): string | null {
  const re = new RegExp(
    `class="[^"]*views-field-${field}[^"]*"[^>]*>[\\s\\S]*?<time[^>]*datetime="([^"]+)"`,
    "i",
  );
  const m = row.match(re);
  return isoDate(m?.[1] ?? cellText(row, field));
}

export function parseListingHtml(html: string): Form483Listing[] {
  const found: Form483Listing[] = [];
  const seen = new Set<string>();
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const href = row.match(/href="([^"]*\/media\/\d+\/download[^"]*)"/i);
    if (!href?.[1]) continue;
    const typeLabel = stripTags(
      (row.match(/href="[^"]*\/media\/\d+\/download[^"]*"[^>]*>([\s\S]*?)<\/a>/i) || [])[1] ?? "",
    );
    if (typeLabel !== RECORD_TYPE_483) continue;
    const mediaId = mediaIdFromUrl(href[1]);
    if (!mediaId || seen.has(mediaId)) continue;
    seen.add(mediaId);
    const firm = cellText(row, "company-name") || mediaId;
    found.push({
      id: letterId(firm, mediaId),
      mediaId,
      firm,
      fei: cellText(row, "fein-name") || null,
      recordDate: cellTime(row, "field-record-date"),
      publishedOn: cellTime(row, "field-publish-date-1") ?? cellTime(row, "field-publish-date"),
      state: cellText(row, "state-name") || null,
      country: cellText(row, "country-name") || null,
      establishmentType: cellText(row, "establishment-type-name") || null,
      sourceUrl: absolutePdfUrl(href[1]),
    });
  }
  return sortListings(found);
}

function listingDateKey(row: Pick<Form483Listing, "publishedOn" | "recordDate">): string {
  return `${row.publishedOn ?? ""}|${row.recordDate ?? ""}`;
}

export function sortListings(rows: Form483Listing[]): Form483Listing[] {
  return [...rows].sort((a, b) => listingDateKey(b).localeCompare(listingDateKey(a)));
}

/** Official DataTables JSON for the same OII FOIA reading room. Record Type 483 only. */
export function parseListingJson(raw: unknown): Form483Listing[] {
  const rows = Array.isArray(raw) ? raw : [];
  const found: Form483Listing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const typeLabel = stripTags(String(rec.field_foia_record_type ?? rec.field_foia_record_type_1 ?? ""));
    if (typeLabel !== RECORD_TYPE_483) continue;
    const hrefBlob = String(rec.field_foia_record_type_1 ?? rec.field_foia_record_type ?? "");
    const href = hrefBlob.match(/href="([^"]*\/media\/\d+\/download[^"]*)"/i);
    if (!href?.[1]) continue;
    const mediaId = mediaIdFromUrl(href[1]);
    if (!mediaId || seen.has(mediaId)) continue;
    seen.add(mediaId);
    const firm = stripTags(String(rec.field_company_name_1 ?? "")) || mediaId;
    found.push({
      id: letterId(firm, mediaId),
      mediaId,
      firm,
      fei: stripTags(String(rec.field_fein ?? "")) || null,
      recordDate: isoDate(String(rec.field_record_date ?? "")),
      publishedOn: isoDate(String(rec.field_publish_date ?? "")),
      state: stripTags(String(rec.field_state_1 ?? "")) || null,
      country: stripTags(String(rec.field_country_1 ?? rec.field_country ?? "")) || null,
      establishmentType: stripTags(String(rec.field_establishment_type_1 ?? "")) || null,
      sourceUrl: absolutePdfUrl(href[1]),
    });
  }
  return sortListings(found);
}

export function isReal483Body(text: string): boolean {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 200) return false;
  return (
    /this document lists observations/i.test(text) ||
    /inspectional observations/i.test(text) ||
    /\bobservation\s+\d+/i.test(text)
  );
}

function collapseWs(value: string): string {
  return value.replace(/[ \t]+/g, " ").replace(/\s+\n/g, "\n").trim();
}

export function parseObservations(body: string): Form483Observation[] {
  const matches = [...body.matchAll(/^OBSERVATION\s+(\d+)\s*$/gim)];
  if (matches.length === 0) return [];
  const out: Form483Observation[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = matches[i + 1]?.index ?? body.length;
    const chunk = collapseWs(body.slice(start, end));
    const n = Number(matches[i][1]);
    if (!Number.isFinite(n) || chunk.length < 16) continue;
    out.push({ n, text: chunk });
  }
  return out;
}

export function parse483Text(
  text: string,
  meta: {
    sourceUrl: string;
    firm?: string;
    fei?: string | null;
    recordDate?: string | null;
    publishedOn?: string | null;
    state?: string | null;
    country?: string | null;
    establishmentType?: string | null;
    filename?: string | null;
  },
): Form483Letter {
  const mediaId = mediaIdFromUrl(meta.sourceUrl) || "unknown";
  const firm = (meta.firm && meta.firm.trim()) || mediaId;
  const issued =
    isoDate((text.match(/DATE\s*ISSUED\s+(\d{1,2}\/\d{1,2}\/\d{4})/i) || [])[1]) ||
    isoDate((text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\s*$/m) || [])[1]);
  const body = text.replace(/\f/g, "\n").trim();
  return {
    id: letterId(firm, mediaId),
    mediaId,
    firm,
    fei: meta.fei ?? null,
    recordDate: meta.recordDate ?? null,
    publishedOn: meta.publishedOn ?? null,
    issuedOn: issued ?? meta.recordDate ?? null,
    state: meta.state ?? null,
    country: meta.country ?? null,
    establishmentType: meta.establishmentType ?? null,
    sourceUrl: meta.sourceUrl,
    filename: meta.filename ?? null,
    body,
    observations: parseObservations(body),
  };
}

export function emptySnapshot(reason: string): Form483Snapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    sources: { listing: LISTING_URL, listingJson: LISTING_JSON_URL, mediaBase: MEDIA_BASE },
    letters: [],
  };
}

export function assembleSnapshot(
  letters: Form483Letter[],
  fetchedAt = new Date().toISOString(),
): Form483Snapshot {
  const withBody = letters
    .filter((l) => isReal483Body(l.body))
    .sort((a, b) => listingDateKey(b).localeCompare(listingDateKey(a)));
  const asOf =
    withBody
      .flatMap((l) => [l.publishedOn, l.recordDate, l.issuedOn])
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official OII FOIA 483 PDFs had no extractable observation text.",
    fetchedAt,
    asOf,
    sources: { listing: LISTING_URL, listingJson: LISTING_JSON_URL, mediaBase: MEDIA_BASE },
    letters: withBody,
  };
}

export function readSnapshot(): Form483Snapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as Form483Snapshot;
    if (raw && raw.product === PRODUCT_ID && Array.isArray(raw.letters)) return raw;
  } catch {
    /* corrupt */
  }
  return null;
}

export function writeSnapshot(snap: Form483Snapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

/** Public listing gate: at least one official 483 body is on disk. */
export function hasCachedForm483Body(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.letters.some((l) => isReal483Body(l.body)));
}

function htmlDir(): string {
  return env("FORM_483_HTML_DIR");
}

function firstSliceLimit(): number {
  const raw = env("FORM_483_LIMIT", String(DEFAULT_FIRST_SLICE));
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_FIRST_SLICE;
}

function maxFetchLimit(): number {
  const raw = env("FORM_483_MAX_FETCH", String(DEFAULT_MAX_FETCH));
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

export async function fetchFdaText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchFdaJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.json();
}

export async function fetchFdaBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) return decodeURIComponent(star[1].trim());
  const plain = header.match(/filename=([^;]+)/i);
  if (!plain) return null;
  return plain[1].trim().replace(/^"|"$/g, "");
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FORM_483_PDFTOTEXT") || "pdftotext";
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

async function loadOfficialListings(dir: string): Promise<Form483Listing[]> {
  if (dir) {
    const jsonText = readNamedFile(dir, ["listing.json", "ora-foia-reading.json"]);
    if (jsonText) {
      try {
        const listed = parseListingJson(JSON.parse(jsonText));
        if (listed.length > 0) return listed;
      } catch {
        /* fall through to HTML excerpt */
      }
    }
    const html = readNamedFile(dir, ["listing.html", "listing-excerpt.html"]);
    return html ? parseListingHtml(html) : [];
  }
  try {
    const listed = parseListingJson(await fetchFdaJson(LISTING_JSON_URL));
    if (listed.length > 0) return listed;
  } catch {
    /* official JSON missed; HTML first page still has posted 483 rows */
  }
  return parseListingHtml(await fetchFdaText(LISTING_URL));
}

function priorBodies(): Map<string, Form483Letter> {
  const prior = new Map<string, Form483Letter>();
  for (const letter of readSnapshot()?.letters ?? []) {
    if (isReal483Body(letter.body)) prior.set(letter.mediaId, letter);
  }
  return prior;
}

export async function collectForm483(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<Form483Snapshot> {
  const dir = opts?.htmlDir ?? htmlDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 800);
  const allListed = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  if (allListed.length === 0) {
    const snap = emptySnapshot("Official OII FOIA listing had no posted Form 483 PDF links.");
    writeSnapshot(snap);
    return snap;
  }
  const cacheDir = form483Dir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = priorBodies();
  const letters: Form483Letter[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  const realCount = (): number => letters.filter((l) => isReal483Body(l.body)).length;
  for (const row of allListed) {
    if (target > 0 && realCount() >= target) break;
    const cached = prior.get(row.mediaId);
    if (cached) {
      letters.push(cached);
      seen.add(row.mediaId);
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    if (!dir) await pause(pauseMs);
    try {
      const localText = readNamedFile(dir, [
        `${row.mediaId}.txt`,
        `${row.mediaId}-excerpt.txt`,
        `${row.mediaId}-cascade-excerpt.txt`,
        `${row.mediaId}-annovex-excerpt.txt`,
      ]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${row.mediaId}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchFdaBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parse483Text(text, {
        sourceUrl: row.sourceUrl,
        firm: row.firm,
        fei: row.fei,
        recordDate: row.recordDate,
        publishedOn: row.publishedOn,
        state: row.state,
        country: row.country,
        establishmentType: row.establishmentType,
      });
      if (!isReal483Body(parsed.body)) {
        skippedNoText += 1;
        continue;
      }
      letters.push(parsed);
      seen.add(row.mediaId);
    } catch {
      skippedNoText += 1;
    }
  }
  for (const [mediaId, letter] of prior) {
    if (!seen.has(mediaId)) letters.push(letter);
  }
  const snap = {
    ...assembleSnapshot(letters),
    listedCount: allListed.length,
    fetchedPdfs,
    skippedNoText,
  };
  writeSnapshot(snap);
  return snap;
}

export async function loadForm483(): Promise<Form483Snapshot> {
  const cached = readSnapshot();
  const ttlMs = Number(env("FORM_483_TTL_MS", String(6 * 3600 * 1000)));
  if (cached) {
    const age = Date.now() - Date.parse(cached.fetchedAt);
    if (Number.isFinite(age) && age >= 0 && age < ttlMs) return cached;
  }
  try {
    return await collectForm483();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.letters.some((l) => isReal483Body(l.body)) ? "stale" : "empty",
        reason: `Live FDA Form 483 fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `FDA Form 483 PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildForm483Manifest(snap: Form483Snapshot | null): Record<string, unknown> {
  const letters = snap?.letters ?? [];
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + id + firm + dates only. Observation / letter body is the paid GET /form-483 payload.",
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: FORM_483_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    letterCount: letters.filter((l) => isReal483Body(l.body)).length,
    letters: letters.map((l) => ({
      id: l.id,
      mediaId: l.mediaId,
      firm: l.firm,
      fei: l.fei,
      recordDate: l.recordDate,
      publishedOn: l.publishedOn,
      issuedOn: l.issuedOn,
      sourceUrl: l.sourceUrl,
    })),
    schema: { fields: [...LETTER_FIELDS] },
    sources: snap?.sources ?? {
      listing: LISTING_URL,
      listingJson: LISTING_JSON_URL,
      mediaBase: MEDIA_BASE,
    },
  };
}

export async function loadForm483Manifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildForm483Manifest(cached);
  try {
    const dir = htmlDir();
    if (dir) {
      const listed = await loadOfficialListings(dir);
      if (listed.length > 0) {
        return buildForm483Manifest(
          assembleSnapshot(
            listed.map((row) => ({
              id: row.id,
              mediaId: row.mediaId,
              firm: row.firm,
              fei: row.fei,
              recordDate: row.recordDate,
              publishedOn: row.publishedOn,
              issuedOn: row.recordDate,
              state: row.state,
              country: row.country,
              establishmentType: row.establishmentType,
              sourceUrl: row.sourceUrl,
              filename: null,
              body: "",
              observations: [],
            })),
          ),
        );
      }
    }
    return buildForm483Manifest(null);
  } catch {
    return buildForm483Manifest(null);
  }
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectForm483()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            letterCount: snap.letters.filter((l) => isReal483Body(l.body)).length,
            listedCount: snap.listedCount ?? snap.letters.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            listed: snap.letters.some((l) => isReal483Body(l.body)),
            letters: snap.letters.map((l) => ({
              id: l.id,
              mediaId: l.mediaId,
              firm: l.firm,
              fei: l.fei,
              recordDate: l.recordDate,
              publishedOn: l.publishedOn,
              issuedOn: l.issuedOn,
              observationCount: l.observations.length,
              bodyChars: l.body.length,
              sourceUrl: l.sourceUrl,
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
