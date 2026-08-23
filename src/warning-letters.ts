/**
 * FDA warning-letter BODIES door.
 * Official fda.gov warning-letter HTML only. Does not invent letter text.
 * Does not scrape Redica / Thompson / Apify. Not the /import-alerts IA feed.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const WARNING_LETTERS_PATH = "/warning-letters";
export const WARNING_LETTERS_MANIFEST_PATH = "/warning-letters/manifest.json";
export const WARNING_LETTERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "fda-warning-letter-bodies";
export const PRODUCT_NAME = "FDA warning-letter bodies";

export const LISTING_URL =
  "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters";
export const LISTING_AJAX_URL = "https://www.fda.gov/datatables/views/ajax";
export const LISTING_VIEW_NAME = "warning_letter_solr_index";
export const LISTING_VIEW_DISPLAY = "warning_letter_solr_block";
export const LISTING_VIEW_PATH =
  "/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters";
export const LISTING_VIEW_BASE_PATH =
  "inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters/datatables-data";
export const LETTER_BASE =
  "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/";
export const LETTER_PATH_RE =
  /\/inspections-compliance-enforcement-and-criminal-investigations\/warning-letters\/([a-z0-9-]+-\d{6}-\d{8})/i;
/** Additional real letter bodies this run. Cached IDs do not count. `0` = keep walking. */
export const DEFAULT_FIRST_SLICE = 50;
/** Max official letter-page fetches per collect. `0` = no cap. */
export const DEFAULT_MAX_FETCH = 200;
/** Official DataTables page size (listing `lengthMenu` allows 100). */
export const DEFAULT_PAGE_SIZE = 100;

export const LETTER_FIELDS = [
  "id",
  "firm",
  "cms",
  "issuedOn",
  "subject",
  "issuingOffice",
  "sourceUrl",
  "body",
] as const;

export type WarningLetterListing = {
  id: string;
  firm: string;
  sourceUrl: string;
  issuedOn: string | null;
};

export type WarningLetter = {
  id: string;
  firm: string;
  cms: string | null;
  issuedOn: string | null;
  subject: string;
  issuingOffice: string | null;
  sourceUrl: string;
  body: string;
};

export type WarningLettersSnapshot = {
  ok: true;
  product: typeof PRODUCT_ID;
  status: "ok" | "empty" | "stale";
  reason: string | null;
  fetchedAt: string;
  asOf: string | null;
  listedCount?: number;
  fetchedPages?: number;
  skippedNoBody?: number;
  reused?: number;
  addedThisRun?: number;
  sources: {
    listing: string;
    listingAjax?: string;
    letterBase: string;
  };
  letters: WarningLetter[];
};

export type DatatablesPage = {
  draw?: number;
  recordsTotal?: number;
  recordsFiltered?: number;
  data?: unknown[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FDA warning-letter public HTML; +https://www.fda.gov/)";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function warningLettersDir(): string {
  if (env("WARNING_LETTERS_DIR")) return resolve(env("WARNING_LETTERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/warning-letters"));
}

export function snapshotPath(): string {
  return join(warningLettersDir(), "snapshot.json");
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

export function absoluteLetterUrl(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("/")) return `https://www.fda.gov${href}`;
  return `${LETTER_BASE}${href.replace(/^\.\//, "")}`;
}

export function letterIdFromUrl(url: string): string | null {
  const m = url.match(LETTER_PATH_RE);
  return m ? m[1].toLowerCase() : null;
}

function slugDate(id: string): string | null {
  const m = id.match(/-(\d{2})(\d{2})(\d{4})$/);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

function slugCms(id: string): string | null {
  const m = id.match(/-(\d{6})-\d{8}$/);
  return m ? m[1] : null;
}

function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function parseListingHtml(html: string): WarningLetterListing[] {
  const found: WarningLetterListing[] = [];
  const seen = new Set<string>();
  const trs = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const rows = trs.length ? trs : [html];
  for (const row of rows) {
    const href = row.match(new RegExp(`href="([^"]*${LETTER_PATH_RE.source}[^"]*)"`, "i"));
    const hrefUrl = href?.[1];
    const match = hrefUrl?.match(LETTER_PATH_RE);
    if (!hrefUrl || !match) continue;
    const id = match[1].toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    const linkText = row.match(new RegExp(`href="[^"]*${id}[^"]*"[^>]*>([\\s\\S]*?)</a>`, "i"));
    const firm = linkText ? stripTags(linkText[1]) : id;
    const issue = row.match(
      /views-field-field-letter-issue-datetime[\s\S]*?<time[^>]*datetime="([^"]+)"/i,
    );
    const anyTime = row.match(/<time[^>]*datetime="([^"]+)"/i);
    found.push({
      id,
      firm,
      sourceUrl: absoluteLetterUrl(hrefUrl),
      issuedOn: isoDate(issue?.[1] ?? anyTime?.[1]) ?? slugDate(id),
    });
  }
  if (found.length === 0) {
    for (const match of html.matchAll(new RegExp(LETTER_PATH_RE, "gi"))) {
      const id = match[1].toLowerCase();
      if (seen.has(id)) continue;
      seen.add(id);
      found.push({
        id,
        firm: id,
        sourceUrl: `${LETTER_BASE}${id}`,
        issuedOn: slugDate(id),
      });
    }
  }
  return found;
}

/** Official listing DataTables `data` rows are HTML cells. Reuses parseListingHtml. */
export function parseListingDatatables(raw: unknown): WarningLetterListing[] {
  if (!raw || typeof raw !== "object") return [];
  const data = (raw as DatatablesPage).data;
  if (!Array.isArray(data)) return [];
  const rows = data.map((row) => {
    if (!Array.isArray(row)) return "";
    const cells = row.map((cell) => `<td>${String(cell ?? "")}</td>`).join("");
    return `<tr>${cells}</tr>`;
  });
  return parseListingHtml(`<table>${rows.join("")}</table>`);
}

export function listingHasMore(start: number, pageRows: number, total: number): boolean {
  if (pageRows === 0) return false;
  if (total > 0 && start + pageRows >= total) return false;
  return true;
}

export function viewDomIdFromListingHtml(html: string): string | null {
  const js = html.match(/js-view-dom-id-([a-f0-9]{16,})/i);
  if (js) return js[1];
  const json = html.match(/"view_dom_id"\s*:\s*"([a-f0-9]+)"/i);
  return json ? json[1] : null;
}

function metaContent(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+name="${name}"[^>]+content="([^"]*)"`, "i");
  const m = html.match(re) || html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+name="${name}"`, "i"));
  return m ? decodeEntities(m[1]) : null;
}

function extractLetterHtml(html: string): string {
  const start = html.search(
    /<p[^>]*text-align-center[^>]*>\s*<strong>\s*WARNING LETTER\s*<\/strong>/i,
  );
  if (start < 0) return "";
  let rest = html.slice(start);
  const cut = rest.search(/<aside\b|Content current as of:/i);
  if (cut > 0) rest = rest.slice(0, cut);
  return rest;
}

function htmlToBody(html: string): string {
  const withBreaks = html
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n");
  return withBreaks
    .split("\n")
    .map((line) => stripTags(line))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function parseLetterHtml(html: string, sourceUrl: string): WarningLetter {
  const id = letterIdFromUrl(sourceUrl) || letterIdFromUrl(html) || "unknown";
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Firm = h1 ? stripTags(h1[1].replace(/<span[\s\S]*$/i, "")).replace(/\s+MARCS-CMS.*$/i, "") : "";
  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  const titleFirm = title ? stripTags(title[1]).replace(/\s*\|?\s*FDA\s*$/i, "").split(" - ")[0] : "";
  const cms =
    (html.match(/MARCS-CMS\s+(\d+)/i) || [])[1] ||
    (title ? (stripTags(title[1]).match(/\b(\d{6})\b/) || [])[1] : "") ||
    slugCms(id);
  const issuedOn =
    isoDate((html.match(/<h1[\s\S]*?<time[^>]*datetime="([^"]+)"/i) || [])[1]) ||
    isoDate((html.match(/<time[^>]*datetime="([^"]+)"/i) || [])[1]) ||
    slugDate(id);
  const letterHtml = extractLetterHtml(html);
  const body = htmlToBody(letterHtml);
  const reLine = body.match(/^RE:\s*(.+)$/im);
  const subject = metaContent(html, "description") || reLine?.[1] || "";
  const issuingOffice =
    metaContent(html, "dcterms.creator") ||
    (html.match(/Issuing Office:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i)
      ? stripTags(html.match(/Issuing Office:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i)![1])
      : "");
  return {
    id,
    firm: h1Firm || titleFirm || id,
    cms: cms || null,
    issuedOn,
    subject,
    issuingOffice: issuingOffice || null,
    sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): WarningLettersSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    sources: { listing: LISTING_URL, listingAjax: LISTING_AJAX_URL, letterBase: LETTER_BASE },
    letters: [],
  };
}

export function assembleSnapshot(
  letters: WarningLetter[],
  fetchedAt = new Date().toISOString(),
): WarningLettersSnapshot {
  const withBody = letters.filter((l) => l.body.length > 0);
  const asOf = withBody
    .map((l) => l.issuedOn)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official pages had no WARNING LETTER body block.",
    fetchedAt,
    asOf,
    sources: { listing: LISTING_URL, listingAjax: LISTING_AJAX_URL, letterBase: LETTER_BASE },
    letters,
  };
}

export function readSnapshot(): WarningLettersSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as WarningLettersSnapshot & {
      unlisted?: unknown;
    };
    if (raw && raw.product === PRODUCT_ID && Array.isArray(raw.letters)) {
      const { unlisted: _drop, ...rest } = raw;
      return rest;
    }
  } catch {
    /* corrupt */
  }
  return null;
}

export function writeSnapshot(snap: WarningLettersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

function htmlDir(): string {
  return env("WARNING_LETTERS_HTML_DIR");
}

function firstSliceLimit(): number {
  const raw = env("WARNING_LETTERS_LIMIT", String(DEFAULT_FIRST_SLICE));
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_FIRST_SLICE;
}

function maxFetchLimit(): number {
  const raw = env("WARNING_LETTERS_MAX_FETCH", String(DEFAULT_MAX_FETCH));
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_FETCH;
}

function pageSizeLimit(): number {
  const raw = Number(env("WARNING_LETTERS_PAGE_SIZE", String(DEFAULT_PAGE_SIZE)));
  return Number.isFinite(raw) && raw > 0 ? Math.min(100, Math.floor(raw)) : DEFAULT_PAGE_SIZE;
}

function readHtmlDirFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

export async function fetchFdaHtml(url: string): Promise<string> {
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

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function listingAjaxUrl(start: number, length: number, viewDomId: string): string {
  const url = new URL(LISTING_AJAX_URL);
  url.searchParams.set("_drupal_ajax", "1");
  url.searchParams.set("_wrapper_format", "drupal_ajax");
  url.searchParams.set("pager_element", "0");
  url.searchParams.set("view_args", "");
  url.searchParams.set("view_base_path", LISTING_VIEW_BASE_PATH);
  url.searchParams.set("view_display_id", LISTING_VIEW_DISPLAY);
  url.searchParams.set("view_dom_id", viewDomId);
  url.searchParams.set("view_name", LISTING_VIEW_NAME);
  url.searchParams.set("view_path", LISTING_VIEW_PATH);
  url.searchParams.set("draw", "1");
  url.searchParams.set("start", String(start));
  url.searchParams.set("length", String(length));
  return url.toString();
}

function readListingAjaxFile(dir: string): unknown | null {
  const text = readHtmlDirFile(dir, ["listing-ajax.json", "listing.json"]);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function loadOfficialListings(
  dir: string,
  maxRows = 0,
): Promise<{
  listed: WarningLetterListing[];
  listedCount: number;
  fetchedPages: number;
}> {
  if (dir) {
    const ajax = readListingAjaxFile(dir);
    if (ajax) {
      const listed = parseListingDatatables(ajax);
      if (listed.length > 0) return { listed, listedCount: listed.length, fetchedPages: 0 };
    }
    const html = readHtmlDirFile(dir, ["listing.html", "listing-excerpt.html"]);
    const listed = html ? parseListingHtml(html) : [];
    return { listed, listedCount: listed.length, fetchedPages: 0 };
  }
  const listingHtml = await fetchFdaHtml(LISTING_URL);
  const viewDomId = viewDomIdFromListingHtml(listingHtml);
  const pageSize = pageSizeLimit();
  if (viewDomId) {
    try {
      const listed: WarningLetterListing[] = [];
      const seen = new Set<string>();
      let fetchedPages = 0;
      let total = 0;
      for (let start = 0; start < 20000; start += pageSize) {
        if (total > 0 && start >= total) break;
        if (maxRows > 0 && listed.length >= maxRows) break;
        const page = (await fetchFdaJson(listingAjaxUrl(start, pageSize, viewDomId))) as DatatablesPage;
        fetchedPages += 1;
        total = Number(page.recordsTotal) || total;
        const rows = parseListingDatatables(page);
        if (rows.length === 0) break;
        for (const row of rows) {
          if (seen.has(row.id)) continue;
          seen.add(row.id);
          listed.push(row);
        }
        if (!listingHasMore(start, rows.length, total)) break;
        await pause(250);
      }
      if (listed.length > 0) return { listed, listedCount: total || listed.length, fetchedPages };
    } catch {
      /* official AJAX missed; first HTML page still has letter links */
    }
  }
  const listed = parseListingHtml(listingHtml);
  return { listed, listedCount: listed.length, fetchedPages: 0 };
}

function priorBodies(): Map<string, WarningLetter> {
  const prior = new Map<string, WarningLetter>();
  for (const letter of readSnapshot()?.letters ?? []) {
    if (letter.body.length > 0) prior.set(letter.id, letter);
  }
  return prior;
}

function keepPriorSnapshot(
  prior: Map<string, WarningLetter>,
  extra: Partial<WarningLettersSnapshot>,
  reason: string | null,
): WarningLettersSnapshot {
  const snap = {
    ...assembleSnapshot([...prior.values()]),
    ...extra,
  };
  if (reason && snap.letters.length > 0) snap.reason = reason;
  writeSnapshot(snap);
  return snap;
}

export async function collectWarningLetters(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<WarningLettersSnapshot> {
  const dir = opts?.htmlDir ?? htmlDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 800);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const prior = priorBodies();
  const listingCap = target > 0 ? target + prior.size + pageSizeLimit() : 0;
  const { listed: allListed, listedCount, fetchedPages } = await loadOfficialListings(dir, listingCap);
  if (allListed.length === 0) {
    if (prior.size > 0) {
      return keepPriorSnapshot(
        prior,
        { listedCount: 0, fetchedPages, skippedNoBody: 0, reused: prior.size, addedThisRun: 0 },
        "Official listing missed; kept cached bodies.",
      );
    }
    const snap = emptySnapshot("Official FDA warning-letter listing had no letter page links.");
    writeSnapshot(snap);
    return snap;
  }
  const letters: WarningLetter[] = [];
  const seen = new Set<string>();
  let skippedNoBody = 0;
  let reused = 0;
  let addedThisRun = 0;
  let fetchedLetters = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = prior.get(row.id);
    if (cached) {
      letters.push(cached);
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedLetters >= fetchCap) break;
    if (!dir) await pause(pauseMs);
    try {
      const html =
        readHtmlDirFile(dir, [`${row.id}.html`, `${row.id}-excerpt.html`]) ??
        (dir ? null : await fetchFdaHtml(row.sourceUrl));
      if (dir && !html) {
        skippedNoBody += 1;
        continue;
      }
      if (!dir) fetchedLetters += 1;
      const parsed = parseLetterHtml(html ?? "", row.sourceUrl);
      if (!parsed.firm || parsed.firm === parsed.id) parsed.firm = row.firm || parsed.firm;
      if (!parsed.issuedOn) parsed.issuedOn = row.issuedOn;
      if (!parsed.body) {
        skippedNoBody += 1;
        continue;
      }
      letters.push(parsed);
      seen.add(row.id);
      addedThisRun += 1;
    } catch {
      skippedNoBody += 1;
    }
  }
  for (const [id, letter] of prior) {
    if (!seen.has(id)) letters.push(letter);
  }
  const snap = {
    ...assembleSnapshot(letters),
    listedCount,
    fetchedPages,
    skippedNoBody,
    reused,
    addedThisRun,
  };
  writeSnapshot(snap);
  return snap;
}

export async function loadWarningLetters(): Promise<WarningLettersSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.letters.some((l) => l.body.length > 0)) {
    return cached;
  }
  try {
    return await collectWarningLetters();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.letters.some((l) => l.body) ? "stale" : "empty",
        reason: `Live FDA warning-letter fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `FDA warning-letter HTML is not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildWarningLettersManifest(snap: WarningLettersSnapshot | null): Record<string, unknown> {
  const letters = snap?.letters ?? [];
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + firm + date + subject + official source only. Letter body is the paid GET /warning-letters payload.",
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: WARNING_LETTERS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    letterCount: letters.filter((l) => l.body.length > 0).length,
    letters: letters.map((l) => ({
      id: l.id,
      firm: l.firm,
      cms: l.cms,
      issuedOn: l.issuedOn,
      subject: l.subject,
      issuingOffice: l.issuingOffice,
      sourceUrl: l.sourceUrl,
    })),
    schema: { fields: [...LETTER_FIELDS] },
  };
}

export async function loadWarningLettersManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildWarningLettersManifest(cached);
  try {
    const dir = htmlDir();
    if (dir) {
      const listingHtml = readHtmlDirFile(dir, ["listing.html", "listing-excerpt.html"]);
      if (listingHtml) {
        const listed = parseListingHtml(listingHtml);
        return buildWarningLettersManifest(
          assembleSnapshot(
            listed.map((row) => ({
              id: row.id,
              firm: row.firm,
              cms: slugCms(row.id),
              issuedOn: row.issuedOn,
              subject: "",
              issuingOffice: null,
              sourceUrl: row.sourceUrl,
              body: "",
            })),
          ),
        );
      }
    }
    return buildWarningLettersManifest(null);
  } catch {
    return buildWarningLettersManifest(null);
  }
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectWarningLetters()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            letterCount: snap.letters.filter((l) => l.body.length > 0).length,
            listedCount: snap.listedCount ?? snap.letters.length,
            fetchedPages: snap.fetchedPages ?? 0,
            skippedNoBody: snap.skippedNoBody ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            letters: snap.letters.map((l) => ({
              id: l.id,
              firm: l.firm,
              cms: l.cms,
              issuedOn: l.issuedOn,
              subject: l.subject,
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
