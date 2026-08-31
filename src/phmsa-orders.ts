#!/usr/bin/env node
/**
 * PHMSA-authored pipeline enforcement TEXT door.
 * Official PDFs from primis.phmsa.dot.gov/enforcement-documents/{CPF}/ only.
 * NOPV / Notice of Probable Violation, Final Order, Corrective Action Order (CAO),
 * and similar PHMSA-written enforcement documents. 17 U.S.C. § 105.
 * Does not invent order text. Skip operator-response / operator-reply letters.
 * Skip the killed PHMSA incident NARRATIVE zip. Do not wrap the primis TSV
 * (dates/penalties only). Distinct from /ferc-orders.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function paidBodyCatalogNote(path: string, detail: string): string {
  return `Free index for ${path}. ${detail} GET ${path}?id= is one official text ($0.02). Plain GET ${path} is the newest 10 official texts ($0.05).`;
}

export const PHMSA_ORDERS_PATH = "/phmsa-orders";
export const PHMSA_ORDERS_MANIFEST_PATH = "/phmsa-orders/manifest.json";
export const PHMSA_ORDERS_AMOUNT_ATOMIC = "50000";
export const PHMSA_ORDERS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "phmsa-enforcement-order-bodies";
export const PRODUCT_NAME = "PHMSA pipeline enforcement-order text";

export const HUB_URL = "https://primis.phmsa.dot.gov/enforcement-documents/";
export const PDF_HOST = "primis.phmsa.dot.gov";
export const PDF_ORIGIN = "https://primis.phmsa.dot.gov";
export const MEDIA_RE = /\/enforcement-documents\/([A-Za-z0-9]+)\/([^/?#]+\.pdf)/i;
export const CPF_COMPACT_RE = /^(\d)(\d{4})(\d{3})([A-Z]+)$/i;
export const LICENSE = "17 U.S.C. § 105 (U.S. government work; public domain)";
export const ATTRIBUTION =
  "Pipeline and Hazardous Materials Safety Administration (PHMSA), U.S. Department of Transportation. Work of the United States Government; 17 U.S.C. § 105.";

export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const CARD_FIELDS = [
  "id",
  "docket",
  "institution",
  "date",
  "kind",
  "title",
  "sourceUrl",
  "body",
] as const;

export type PhmsaOrderKind =
  | "final-order"
  | "corrective-action-order"
  | "nopv"
  | "consent-order"
  | "safety-order"
  | "enforcement-order";

export type PhmsaOrderListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  kind: PhmsaOrderKind | string;
  title: string;
  sourceUrl: string;
};

export type PhmsaOrderCard = PhmsaOrderListing & { body: string };

export type PhmsaOrderSnapshot = {
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
  cards: PhmsaOrderCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (PHMSA order texts; +https://primis.phmsa.dot.gov/enforcement-documents/)";
const OFFICIAL_HOSTS = new Set(["primis.phmsa.dot.gov", "www.primis.phmsa.dot.gov"]);
const MIN_BODY_CHARS = 2000;
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.P\.|LP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|Partners|Pipeline|Energy|Operating|Transmission|Holdco|Crossing)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const PHMSA_TITLE_RE =
  /Final Order|Notice of Probable Violation|\bNOPV\b|Corrective Action Order|\bCAO\b|Consent Agreement and Order|Consent Order|Safety Order|NOPSO/i;
const OPERATOR_RESPONSE_RE =
  /operator[- _]?response|operator[- _]?reply|response to the (?:notice|nopv|order)|operator reply/i;
const NARRATIVE_RE = /27nc-rsge|incident[- _]?narrative|\bNARRATIVE\b/i;
const RAW_TSV_RE =
  /PHMSA Pipeline Enforcement Raw Data|Raw Data\.txt|\.tsv\b|page-data\.json/i;
const HTML_TEASER =
  /\b(read the (?:full )?(?:order|notice|document)|download the pdf|this page is an index|case-card teaser|index only)\b/i;
const FERC_DUMP =
  /\bFEDERAL ENERGY REGULATORY COMMISSION\b.*\b(STIPULATION AND CONSENT|Docket No\. IN\d)/is;

export const SEED_LISTINGS: PhmsaOrderListing[] = [
  {
    id: "3-2026-023-cao",
    docket: "3-2026-023-CAO",
    institution: "Amoco Oil Company",
    date: "2026-08-03",
    kind: "corrective-action-order",
    title: "Corrective Action Order — CPF 3-2026-023-CAO",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/32026023CAO/32026023CAO_Corrective%20Action%20Order_08032026_(26-379109)_text.pdf",
  },
  {
    id: "3-2026-020-cao",
    docket: "3-2026-020-CAO",
    institution: "Gulf South Pipeline Company, LLC",
    date: "2026-05-16",
    kind: "corrective-action-order",
    title: "Corrective Action Order — CPF 3-2026-020-CAO",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/32026020CAO/32026020CAO_Corrective%20Action%20Order_05162026_(26-372495).pdf",
  },
  {
    id: "4-2026-012-nopv",
    docket: "4-2026-012-NOPV",
    institution: "Canyon Crossing LLC / Navigator Panhandle Holdco LLC",
    date: "2026-04-07",
    kind: "final-order",
    title: "Final Order — CPF 4-2026-012-NOPV",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/42026012NOPV/42026012NOPV_Final%20Order_04072026_(23-266706).pdf",
  },
  {
    id: "4-2026-004-nopv",
    docket: "4-2026-004-NOPV",
    institution: "Valero Partners Operating Co., LLC",
    date: "2026-04-01",
    kind: "final-order",
    title: "Final Order — CPF 4-2026-004-NOPV",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/42026004NOPV/42026004NOPV_Final%20Order_04012026_(25-329817).pdf",
  },
  {
    id: "4-2025-049-nopv",
    docket: "4-2025-049-NOPV",
    institution: "Energy Transfer Company",
    date: "2026-03-26",
    kind: "final-order",
    title: "Final Order — CPF 4-2025-049-NOPV",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/42025049NOPV/42025049NOPV_Final%20Order_03262026_(24-296979).pdf",
  },
  {
    id: "4-2026-005-cao",
    docket: "4-2026-005-CAO",
    institution: "Enterprise Products Operating, LLC",
    date: "2026-02-17",
    kind: "corrective-action-order",
    title: "Corrective Action Order — CPF 4-2026-005-CAO",
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/42026005CAO/42026005CAO_Corrective%20Action%20Order_02172026_(26-364755).pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function phmsaOrdersDir(): string {
  if (env("PHMSA_ORDERS_DIR")) return resolve(env("PHMSA_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/phmsa-orders"));
}

export function snapshotPath(): string {
  return join(phmsaOrdersDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [
    join(here, "../src/fixtures/phmsa-orders/seed-snapshot.json"),
    join(here, "fixtures/phmsa-orders/seed-snapshot.json"),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return join(here, "../src/fixtures/phmsa-orders/seed-snapshot.json");
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

export function cpfFromCompact(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(CPF_COMPACT_RE);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}-${m[4].toUpperCase()}`;
}

export function kindFromBlob(raw: string): PhmsaOrderKind {
  const t = raw.replace(/\s+/g, " ");
  if (/Corrective Action Order|\bCAO\b/i.test(t)) return "corrective-action-order";
  if (/Final Order/i.test(t)) return "final-order";
  if (/Notice of Probable Violation|\bNOPV\b/i.test(t)) return "nopv";
  if (/Consent Agreement|Consent Order/i.test(t)) return "consent-order";
  if (/Safety Order|NOPSO/i.test(t)) return "safety-order";
  return "enforcement-order";
}

export function idFromCpfAndKind(cpf: string, kind: string): string {
  const base = cpf.toLowerCase();
  if (kind === "corrective-action-order" && !/-cao$/i.test(base)) return `${base}-cao`;
  return base;
}

function blockedHost(host: string): boolean {
  return (
    host === "web.archive.org" ||
    host === "federalregister.gov" ||
    host === "www.federalregister.gov" ||
    host === "www.ferc.gov" ||
    host === "cms.ferc.gov" ||
    host === "catalog.data.gov"
  );
}

export function officialPhmsaOrderPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    if (/\/enforcement-data\//i.test(parsed.pathname)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (RAW_TSV_RE.test(path) || NARRATIVE_RE.test(path) || OPERATOR_RESPONSE_RE.test(path)) {
      return null;
    }
    if (!/\.pdf$/i.test(path)) return null;
    const media = path.match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
    if (!media) return null;
    if (NARRATIVE_RE.test(media[1]) || NARRATIVE_RE.test(media[2])) return null;
    if (OPERATOR_RESPONSE_RE.test(media[2])) return null;
    const file = media[2].replace(/ /g, "%20");
    return `${PDF_ORIGIN}/enforcement-documents/${media[1]}/${file}`;
  } catch {
    return null;
  }
}

export function isOfficialPhmsaOrderPdf(url: string | null | undefined): boolean {
  return Boolean(officialPhmsaOrderPdfUrl(url));
}

export function isPeopleRow(row: Pick<PhmsaOrderListing, "institution" | "title" | "id">): boolean {
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  if (/people-only|curriculum vitae|\bAn Individual\b/i.test(`${row.title} ${row.id} ${name}`)) {
    return true;
  }
  return PERSON_NAME_RE.test(name);
}

export function isOperatorResponseRow(row: Pick<PhmsaOrderListing, "title" | "sourceUrl" | "id">): boolean {
  return OPERATOR_RESPONSE_RE.test(`${row.title} ${row.sourceUrl} ${row.id}`);
}

export function isIncidentNarrativeRow(row: Pick<PhmsaOrderListing, "title" | "sourceUrl" | "id">): boolean {
  return NARRATIVE_RE.test(`${row.title} ${row.sourceUrl} ${row.id}`);
}

export function isTsvWrapRow(row: Pick<PhmsaOrderListing, "title" | "sourceUrl">): boolean {
  return RAW_TSV_RE.test(`${row.title} ${row.sourceUrl}`);
}

export function parseListingRows(rows: PhmsaOrderListing[]): PhmsaOrderListing[] {
  const found: PhmsaOrderListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (isPeopleRow(row) || isOperatorResponseRow(row) || isIncidentNarrativeRow(row) || isTsvWrapRow(row)) {
      continue;
    }
    const sourceUrl = officialPhmsaOrderPdfUrl(row.sourceUrl);
    if (!sourceUrl) continue;
    if (!PHMSA_TITLE_RE.test(`${row.title} ${row.kind} ${sourceUrl}`)) continue;
    const id = (row.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    found.push({
      id,
      docket: row.docket || id.toUpperCase(),
      institution: row.institution.trim(),
      date: isoDate(row.date),
      kind: row.kind || kindFromBlob(`${row.title} ${sourceUrl}`),
      title: row.title.trim() || id,
      sourceUrl,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return found;
}

export function parseHubHtml(html: string, _pageUrl = HUB_URL): PhmsaOrderListing[] {
  const rows: PhmsaOrderListing[] = [];
  const links = [
    ...html.matchAll(
      /(?:(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})[\s\S]{0,280}?)?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];
  for (const m of links) {
    const href = m[2].startsWith("http") ? m[2] : `${PDF_ORIGIN}${m[2].startsWith("/") ? "" : "/"}${m[2]}`;
    const title = stripTags(m[3]);
    const compact = decodeURIComponent(new URL(href, PDF_ORIGIN).pathname).match(MEDIA_RE)?.[1] ?? "";
    const cpf = cpfFromCompact(compact);
    const kind = kindFromBlob(`${title} ${href}`);
    const id = cpf ? idFromCpfAndKind(cpf, kind) : "";
    const before = stripTags(m[0].slice(0, 220));
    const institution =
      before
        .replace(/^\d{4}-\d{2}-\d{2}\s*/, "")
        .replace(/\s*[—-]\s*$/, "")
        .replace(/\s*<a[\s\S]*$/i, "")
        .trim() || title.replace(/\s+(Corrective|Final|Notice|Consent|Safety).*$/i, "").trim();
    rows.push({
      id,
      docket: cpf || id.toUpperCase(),
      institution,
      date: isoDate(m[1]) ?? isoDate(before) ?? isoDate(href),
      kind,
      title: PHMSA_TITLE_RE.test(title) ? title : `${kind} — ${cpf ?? id}`,
      sourceUrl: href,
    });
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length < MIN_BODY_CHARS && HTML_TEASER.test(t)) return true;
  if (/Index only — institution \/ CPF \/ date \/ PDF URL/i.test(t)) return true;
  if (/PHMSA case-card teaser/i.test(t)) return true;
  return false;
}

export function isOperatorResponseDump(text: string): boolean {
  const t = String(text || "");
  if (!OPERATOR_RESPONSE_RE.test(t)) return false;
  return !/\bFINAL ORDER\b|\bCORRECTIVE ACTION ORDER\b|\bNOTICE OF PROBABLE VIOLATION\b/i.test(t);
}

export function isIncidentNarrativeDump(text: string): boolean {
  return NARRATIVE_RE.test(text) && !/\bFINAL ORDER\b|\bCORRECTIVE ACTION ORDER\b|\bNOTICE OF PROBABLE VIOLATION\b/i.test(text);
}

export function isTsvWrapDump(text: string): boolean {
  if (/PHMSA Pipeline Enforcement Raw Data/i.test(text)) return true;
  if (/^CPF_Number\t/m.test(text) && /Opened_Date|Proposed_Penalties/i.test(text)) return true;
  return false;
}

export function isFercDump(text: string): boolean {
  return FERC_DUMP.test(text);
}

export function isPeopleDump(text: string): boolean {
  if (/people-only PHMSA/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isRealPhmsaOrderBody(text: string): boolean {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length < MIN_BODY_CHARS) return false;
  if (
    isIndexTeaserDump(t) ||
    isOperatorResponseDump(t) ||
    isIncidentNarrativeDump(t) ||
    isTsvWrapDump(t) ||
    isFercDump(t) ||
    isPeopleDump(t)
  ) {
    return false;
  }
  const phmsa = /Pipeline and Hazardous Materials Safety Administration|\bPHMSA\b/i.test(t);
  const order =
    /\bFINAL ORDER\b|\bCORRECTIVE ACTION ORDER\b|\bNOTICE OF PROBABLE VIOLATION\b|\bCONSENT (?:AGREEMENT AND )?ORDER\b|\bSAFETY ORDER\b/i.test(
      t,
    );
  const statute = /49 CFR|49 C\.F\.R\.|49 U\.S\.C\.|\bCPF\b/i.test(t);
  return phmsa && order && statute;
}

export function parsePhmsaOrderText(
  text: string,
  meta: Partial<PhmsaOrderListing> & { sourceUrl: string },
): PhmsaOrderCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialPhmsaOrderPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const compact = (() => {
    try {
      return decodeURIComponent(new URL(sourceUrl, PDF_ORIGIN).pathname).match(MEDIA_RE)?.[1] ?? "";
    } catch {
      return "";
    }
  })();
  const cpf = meta.docket || cpfFromCompact(compact) || meta.id || sourceUrl;
  const kind = meta.kind || kindFromBlob(`${meta.title || ""} ${sourceUrl}`);
  const id = meta.id || idFromCpfAndKind(String(cpf), kind);
  return {
    id,
    docket: String(cpf).toUpperCase().replace(/-CAO-CAO$/i, "-CAO"),
    institution: meta.institution || id,
    date: isoDate(meta.date) ?? isoDate(body.slice(0, 1600)) ?? isoDate(sourceUrl),
    kind,
    title: meta.title || id,
    sourceUrl,
    body,
  };
}

export function emptyPhmsaOrdersSnapshot(reason: string): PhmsaOrderSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: HUB_URL, pdfHost: `${PDF_ORIGIN}/enforcement-documents/` },
    cards: [],
  };
}

export function assemblePhmsaOrdersSnapshot(
  cards: PhmsaOrderCard[],
  fetchedAt = new Date().toISOString(),
): PhmsaOrderSnapshot {
  const withBody = cards
    .filter((c) => isRealPhmsaOrderBody(c.body) && officialPhmsaOrderPdfUrl(c.sourceUrl))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason:
      withBody.length > 0
        ? null
        : "Official PHMSA enforcement PDFs had no extractable NOPV / Final Order / CAO text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: HUB_URL, pdfHost: `${PDF_ORIGIN}/enforcement-documents/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): PhmsaOrderSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as PhmsaOrderSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readPhmsaOrdersSnapshot(): PhmsaOrderSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("PHMSA_ORDERS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writePhmsaOrdersSnapshot(snap: PhmsaOrderSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(snap, null, 2)}\n`);
}

export async function fetchPhmsaOrderBytes(url: string): Promise<Uint8Array> {
  const official = officialPhmsaOrderPdfUrl(url) || url;
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
  const helper = env("PHMSA_ORDERS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function listingDir(): string {
  return env("PHMSA_ORDERS_HTML_DIR") || env("PHMSA_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("PHMSA_ORDERS_LIMIT", "6"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
}

function maxFetchLimit(): number {
  const n = Number(env("PHMSA_ORDERS_MAX_FETCH", "6"));
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
): Promise<{ listed: PhmsaOrderListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html", "hub.html"]);
    const fromHtml = html ? parseHubHtml(html, HUB_URL) : [];
    const extra = SEED_LISTINGS.filter((row) => existsSync(join(dir, `${row.id}.txt`)));
    const listed = parseListingRows([...extra, ...fromHtml]);
    return { listed, listedCount: listed.length };
  }
  return { listed: parseListingRows(SEED_LISTINGS), listedCount: SEED_LISTINGS.length };
}

export async function collectPhmsaOrders(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<PhmsaOrderSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = phmsaOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, PhmsaOrderCard>();
  for (const card of readPhmsaOrdersSnapshot()?.cards ?? []) {
    if (isRealPhmsaOrderBody(card.body)) prior.set(card.id, card);
  }
  const cards: PhmsaOrderCard[] = [];
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
      const sourceUrl = officialPhmsaOrderPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchPhmsaOrderBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parsePhmsaOrderText(text, { ...row, sourceUrl });
      if (!isRealPhmsaOrderBody(parsed.body)) {
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
    ...assemblePhmsaOrdersSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writePhmsaOrdersSnapshot(snap);
  return snap;
}

export async function loadPhmsaOrders(): Promise<PhmsaOrderSnapshot> {
  const cached = readPhmsaOrdersSnapshot();
  if (cached) {
    const filtered = assemblePhmsaOrdersSnapshot(cached.cards, cached.fetchedAt);
    if (filtered.cards.length) return { ...cached, ...filtered };
  }
  try {
    return await collectPhmsaOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealPhmsaOrderBody(c.body)) ? "stale" : "empty",
        reason: `Live PHMSA order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyPhmsaOrdersSnapshot(
      `PHMSA order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildPhmsaOrdersManifest(snap: PhmsaOrderSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealPhmsaOrderBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      PHMSA_ORDERS_PATH,
      "Count + institution + CPF/docket + date + official PHMSA PDF URL only. Order body is the paid GET /phmsa-orders payload. This free manifest lists the full catalog. Operator-response letters, the killed incident NARRATIVE zip, and the primis TSV (dates/penalties only) are not sold. Distinct from /ferc-orders.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: PHMSA_ORDERS_AMOUNT_ATOMIC,
    oneAmountAtomic: PHMSA_ORDERS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      cpf: c.docket.replace(/-/g, ""),
      docket: c.docket,
      institution: c.institution,
      date: c.date,
      kind: c.kind,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "cpf", "docket", "institution", "date", "kind", "sourceUrl"] },
    sources: snap?.sources ?? { index: HUB_URL, pdfHost: `${PDF_ORIGIN}/enforcement-documents/` },
  };
}

export function filterPhmsaOrdersManifest(
  manifest: Record<string, unknown>,
  q?: string,
): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "docket", "institution", "date", "kind", "sourceUrl"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadPhmsaOrdersManifest(q?: string): Promise<Record<string, unknown>> {
  return filterPhmsaOrdersManifest(buildPhmsaOrdersManifest(readPhmsaOrdersSnapshot()), q);
}

export function buildPhmsaOrdersPaidPage(
  snap: PhmsaOrderSnapshot | null,
  opts?: { id?: string; before?: string; page?: number },
): Record<string, unknown> {
  const all = (snap?.cards ?? []).filter((c) => isRealPhmsaOrderBody(c.body));
  const one = opts?.id?.trim();
  const selected = one ? all.filter((c) => c.id === one) : all;
  const pageSize = 10;
  let start = 0;
  if (!one && opts?.before?.trim()) {
    const idx = selected.findIndex((c) => c.id === opts.before || c.date === opts.before);
    start = idx >= 0 ? idx + 1 : 0;
  } else if (!one && opts?.page && opts.page > 1) {
    start = (opts.page - 1) * pageSize;
  }
  const page = selected.slice(start, start + pageSize);
  const next = selected[start + pageSize];
  return {
    ok: true,
    product: PRODUCT_ID,
    status: snap?.status ?? "empty",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    source: HUB_URL,
    recordCount: page.length,
    records: page.map((c) => ({
      id: c.id,
      date: c.date,
      firm: c.institution,
      url: c.sourceUrl,
      type: "phmsa-orders",
    })),
    cards: page,
    ids: page.map((c) => c.id),
    nextBefore: next?.id ?? null,
    prevBefore: start > 0 ? selected[Math.max(0, start - pageSize)]?.id ?? null : null,
  };
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectPhmsaOrders()
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
