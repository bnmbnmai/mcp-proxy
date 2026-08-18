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
export const LETTER_BASE =
  "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/";
export const LETTER_PATH_RE =
  /\/inspections-compliance-enforcement-and-criminal-investigations\/warning-letters\/([a-z0-9-]+-\d{6}-\d{8})/i;
export const DEFAULT_FIRST_SLICE = 3;

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
  sources: {
    listing: string;
    letterBase: string;
  };
  letters: WarningLetter[];
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
    sources: { listing: LISTING_URL, letterBase: LETTER_BASE },
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
    sources: { listing: LISTING_URL, letterBase: LETTER_BASE },
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
  const raw = Number(env("WARNING_LETTERS_LIMIT", String(DEFAULT_FIRST_SLICE)));
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_FIRST_SLICE;
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

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function collectWarningLetters(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
}): Promise<WarningLettersSnapshot> {
  const dir = opts?.htmlDir ?? htmlDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 1500);
  const listingHtml =
    readHtmlDirFile(dir, ["listing.html", "listing-excerpt.html"]) ?? (await fetchFdaHtml(LISTING_URL));
  const listed = parseListingHtml(listingHtml).slice(0, opts?.limit ?? firstSliceLimit());
  if (listed.length === 0) {
    const snap = emptySnapshot("Official FDA warning-letter listing had no letter page links.");
    writeSnapshot(snap);
    return snap;
  }
  const letters: WarningLetter[] = [];
  for (const row of listed) {
    if (!dir) await pause(pauseMs);
    try {
      const html =
        readHtmlDirFile(dir, [`${row.id}.html`, `${row.id}-excerpt.html`]) ??
        (await fetchFdaHtml(row.sourceUrl));
      const parsed = parseLetterHtml(html, row.sourceUrl);
      if (!parsed.firm || parsed.firm === parsed.id) parsed.firm = row.firm || parsed.firm;
      if (!parsed.issuedOn) parsed.issuedOn = row.issuedOn;
      letters.push(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      letters.push({
        id: row.id,
        firm: row.firm,
        cms: slugCms(row.id),
        issuedOn: row.issuedOn,
        subject: "",
        issuingOffice: null,
        sourceUrl: row.sourceUrl,
        body: "",
      });
      void message;
    }
  }
  const snap = assembleSnapshot(letters);
  writeSnapshot(snap);
  return snap;
}

export async function loadWarningLetters(): Promise<WarningLettersSnapshot> {
  const cached = readSnapshot();
  const ttlMs = Number(env("WARNING_LETTERS_TTL_MS", String(6 * 3600 * 1000)));
  if (cached) {
    const age = Date.now() - Date.parse(cached.fetchedAt);
    if (Number.isFinite(age) && age >= 0 && age < ttlMs) return cached;
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
