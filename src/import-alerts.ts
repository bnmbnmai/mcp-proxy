/**
 * FDA Import Alert / DWPE ticks — official cms_ia HTML only.
 * Does not invent firms, products, or removals.
 * Does not wrap openFDA drug shortages.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const FDA_CATALOG_URL = "https://www.accessdata.fda.gov/cms_ia/ialist.html";
export const FDA_BY_DATE_URL = "https://www.accessdata.fda.gov/cms_ia/iapublishdate.html";
export const FDA_ALERT_BASE = "https://www.accessdata.fda.gov/cms_ia/";

export const FIRST_SLICE: { pageId: string; alertNumber: string }[] = [
  { pageId: "49", alertNumber: "16-81" },
  { pageId: "189", alertNumber: "66-40" },
  { pageId: "258", alertNumber: "99-05" },
  { pageId: "259", alertNumber: "99-08" },
  { pageId: "263", alertNumber: "99-19" },
  { pageId: "266", alertNumber: "99-23" },
];

export const IMPORT_ALERTS_PATH = "/import-alerts";
export const IMPORT_ALERTS_MANIFEST_PATH = "/import-alerts/manifest.json";
export const IMPORT_ALERTS_AMOUNT_ATOMIC = "50000";
export const TICKS_AMOUNT_ATOMIC = "50000";

export const ROW_FIELDS = [
  "alertNumber",
  "type",
  "name",
  "list",
  "firm",
  "country",
  "product",
  "datePublished",
  "sourceUrl",
  "asOf",
] as const;

export type ImportList = "red" | "green";

export type CatalogAlert = {
  alertNumber: string;
  type: string;
  name: string;
  datePublished: string;
  sourceUrl: string;
  pageId: string | null;
  firstSlice: boolean;
};

export type ImportAlertRow = {
  alertNumber: string;
  type: string;
  name: string;
  list: ImportList;
  firm: string;
  country: string;
  product: string;
  datePublished: string;
  sourceUrl: string;
  asOf: string;
};

export type AlertParseSummary = {
  alertNumber: string;
  pageId: string;
  sourceUrl: string;
  asOf: string | null;
  name: string | null;
  hasRedHeading: boolean;
  hasGreenHeading: boolean;
  firmCount: number;
  tickCount: number;
  emptyReason: string | null;
};

export type ImportAlertsSnapshot = {
  ok: true;
  product: "fda-import-alerts";
  status: "ok" | "empty" | "stale";
  reason: string | null;
  fetchedAt: string;
  asOf: string | null;
  sources: {
    catalog: string;
    byDate: string;
    pattern: string;
  };
  catalog: CatalogAlert[];
  alerts: AlertParseSummary[];
  ticks: ImportAlertRow[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FDA cms_ia public HTML; +https://www.fda.gov/)";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function importAlertsDir(): string {
  if (env("IMPORT_ALERTS_DIR")) return resolve(env("IMPORT_ALERTS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/import-alerts"));
}

export function snapshotPath(): string {
  return join(importAlertsDir(), "snapshot.json");
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

function pageIdFromHref(href: string): string | null {
  const m = href.match(/importalert_(\d+)\.html/i);
  return m ? m[1] : null;
}

export function parseCatalog(html: string): CatalogAlert[] {
  const firstSliceIds = new Set(FIRST_SLICE.map((s) => s.pageId));
  const firstSliceNums = new Set(FIRST_SLICE.map((s) => s.alertNumber));
  const rows: CatalogAlert[] = [];
  const trs = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const tr of trs) {
    const href = tr.match(/href="([^"]*importalert_\d+\.html)"/i);
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]));
    if (cells.length < 4) continue;
    const [alertNumber, type, datePublished, name] = cells;
    if (!/^\d{2}-\d{2,}$/.test(alertNumber)) continue;
    const pageId = href ? pageIdFromHref(href[1]) : null;
    rows.push({
      alertNumber,
      type,
      name: name.replace(/^"|"$/g, ""),
      datePublished,
      sourceUrl: pageId ? `${FDA_ALERT_BASE}importalert_${pageId}.html` : FDA_CATALOG_URL,
      pageId,
      firstSlice: firstSliceIds.has(pageId ?? "") || firstSliceNums.has(alertNumber),
    });
  }
  return rows;
}

function postedAsOf(html: string): string | null {
  const m = html.match(/name="posted"\s+content="(\d{4}-\d{2}-\d{2})/i);
  return m ? m[1] : null;
}

function alertNumberFromTitle(html: string): string | null {
  const m = html.match(/<title>\s*Import Alert\s+([0-9-]+)\s*<\/title>/i);
  return m ? m[1] : null;
}

function alertNameFromPage(html: string): string | null {
  const m = html.match(/Import Alert Name:<\/h3>\s*<div>([\s\S]*?)<\/div>/i);
  if (!m) return null;
  return stripTags(m[1]).replace(/^"|"$/g, "") || null;
}

function sliceListSection(html: string, list: ImportList): { html: string; hasHeading: boolean } {
  const label = list === "red" ? "Red List" : "Green List";
  const start = html.search(new RegExp(`a\\.k\\.a\\.\\s*${label}|\\(a\\.k\\.a\\.\\s*${label}\\)`, "i"));
  if (start < 0) return { html: "", hasHeading: false };
  const rest = html.slice(start);
  const other = list === "red" ? /a\.k\.a\.\s*Green List/i : /a\.k\.a\.\s*Red List/i;
  const endOther = rest.search(other);
  const endScript = rest.search(/<script[\s>]/i);
  let end = rest.length;
  if (endOther > 0) end = Math.min(end, endOther);
  if (endScript > 0) end = Math.min(end, endScript);
  return { html: rest.slice(0, end), hasHeading: true };
}

function parseDatePublished(chunk: string): string {
  const m = chunk.match(/Date Published\s*:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
  return m ? m[1] : "";
}

function parseProducts(chunk: string): { product: string; datePublished: string }[] {
  const out: { product: string; datePublished: string }[] = [];
  const re =
    /<div class="floatleft"><em>[\s\S]*?<\/em>\s*([^<]*?)(?:<br\s*\/?>)?\s*<\/div>\s*<div class="floatright[^"]*">\s*Date Published:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chunk))) {
    const name = decodeEntities(m[1]);
    const after = chunk.slice(m.index, m.index + 900);
    const desc = after.match(/<div>\s*Desc:\s*([^<]+)/i);
    const product = desc ? `${name} — ${decodeEntities(desc[1])}` : name;
    if (product) out.push({ product, datePublished: m[2] });
  }
  return out;
}

export function parseFirmSection(
  html: string,
  list: ImportList,
  meta: { alertNumber: string; type: string; name: string; sourceUrl: string; asOf: string },
): { rows: ImportAlertRow[]; hasHeading: boolean } {
  const slice = sliceListSection(html, list);
  if (!slice.hasHeading) return { rows: [], hasHeading: false };
  const rows: ImportAlertRow[] = [];
  let country = "";
  const tokens = slice.html.split(/(?=<div class="center"><h4>|<div class="div-info">)/i);
  for (const token of tokens) {
    const countryM = token.match(/<div class="center"><h4>([^<]+)<\/h4>/i);
    if (countryM && !/<div class="div-info">/i.test(token)) {
      country = stripTags(countryM[1]);
      continue;
    }
    if (!/<div class="div-info">/i.test(token)) continue;
    if (countryM) country = stripTags(countryM[1]);
    const firmM = token.match(/<div class="div-name floatleft">([\s\S]*?)<\/div>/i);
    const firm = firmM ? stripTags(firmM[1]) : "";
    if (!firm) continue;
    const firmDate = parseDatePublished(token);
    const products = parseProducts(token);
    if (products.length === 0) {
      rows.push({
        alertNumber: meta.alertNumber,
        type: meta.type,
        name: meta.name,
        list,
        firm,
        country,
        product: "",
        datePublished: firmDate,
        sourceUrl: meta.sourceUrl,
        asOf: meta.asOf,
      });
      continue;
    }
    for (const p of products) {
      rows.push({
        alertNumber: meta.alertNumber,
        type: meta.type,
        name: meta.name,
        list,
        firm,
        country,
        product: p.product,
        datePublished: p.datePublished || firmDate,
        sourceUrl: meta.sourceUrl,
        asOf: meta.asOf,
      });
    }
  }
  return { rows, hasHeading: true };
}

export function parseAlertPage(
  html: string,
  pageId: string,
  catalogRow?: CatalogAlert,
): { rows: ImportAlertRow[]; summary: AlertParseSummary } {
  const sourceUrl = `${FDA_ALERT_BASE}importalert_${pageId}.html`;
  const alertNumber = alertNumberFromTitle(html) || catalogRow?.alertNumber || pageId;
  const name = alertNameFromPage(html) || catalogRow?.name || "";
  const asOf = postedAsOf(html) || "";
  const type = catalogRow?.type || "DWPE";
  const meta = { alertNumber, type, name, sourceUrl, asOf };
  const red = parseFirmSection(html, "red", meta);
  const green = parseFirmSection(html, "green", meta);
  const rows = [...red.rows, ...green.rows];
  const firms = new Set(rows.map((r) => `${r.list}|${r.country}|${r.firm}`));
  let emptyReason: string | null = null;
  if (!red.hasHeading && !green.hasHeading) {
    emptyReason = "no firm block";
  } else if (rows.length === 0) {
    emptyReason = "no firm block";
  }
  return {
    rows,
    summary: {
      alertNumber,
      pageId,
      sourceUrl,
      asOf: asOf || null,
      name: name || null,
      hasRedHeading: red.hasHeading,
      hasGreenHeading: green.hasHeading,
      firmCount: firms.size,
      tickCount: rows.length,
      emptyReason,
    },
  };
}

export function sampleRowsFrom(rows: ImportAlertRow[], n = 2): Array<ImportAlertRow & { sample: true }> {
  return rows.slice(0, n).map((r) => ({ ...r, sample: true as const }));
}

export function buildManifest(
  catalog: CatalogAlert[],
  samples: Array<ImportAlertRow & { sample: true }>,
): Record<string, unknown> {
  return {
    product: "fda-import-alerts",
    free: true,
    note: "Catalog + schema + sample rows only. One $0.05 GET returns the entire current table. Samples are marked sample:true.",
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: IMPORT_ALERTS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    sources: {
      catalog: FDA_CATALOG_URL,
      byDate: FDA_BY_DATE_URL,
      pattern: `${FDA_ALERT_BASE}importalert_{id}.html`,
    },
    schema: {
      fields: [...ROW_FIELDS],
      list: ["red", "green"],
    },
    firstSlice: FIRST_SLICE,
    catalog,
    samples,
  };
}

export async function fetchFdaHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function readHtmlDirFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

export function htmlDir(): string {
  return env("IMPORT_ALERTS_HTML_DIR");
}

export function emptySnapshot(reason: string): ImportAlertsSnapshot {
  return {
    ok: true,
    product: "fda-import-alerts",
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    sources: {
      catalog: FDA_CATALOG_URL,
      byDate: FDA_BY_DATE_URL,
      pattern: `${FDA_ALERT_BASE}importalert_{id}.html`,
    },
    catalog: [],
    alerts: [],
    ticks: [],
  };
}

function publicRow(row: ImportAlertRow): ImportAlertRow {
  return {
    alertNumber: row.alertNumber,
    type: row.type,
    name: row.name,
    list: row.list,
    firm: row.firm,
    country: row.country,
    product: row.product,
    datePublished: row.datePublished,
    sourceUrl: row.sourceUrl,
    asOf: row.asOf,
  };
}

export function assembleSnapshot(
  catalog: CatalogAlert[],
  parsed: { rows: ImportAlertRow[]; summary: AlertParseSummary }[],
  fetchedAt = new Date().toISOString(),
): ImportAlertsSnapshot {
  const ticks = parsed.flatMap((p) => p.rows.map(publicRow));
  const alerts = parsed.map((p) => p.summary);
  const asOf = alerts.map((a) => a.asOf).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: "fda-import-alerts",
    status: ticks.length > 0 ? "ok" : "empty",
    reason: ticks.length > 0 ? null : "Official pages had no firm blocks or fetch returned no rows.",
    fetchedAt,
    asOf,
    sources: {
      catalog: FDA_CATALOG_URL,
      byDate: FDA_BY_DATE_URL,
      pattern: `${FDA_ALERT_BASE}importalert_{id}.html`,
    },
    catalog,
    alerts,
    ticks,
  };
}

export function readSnapshot(): ImportAlertsSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as ImportAlertsSnapshot;
    if (raw && raw.product === "fda-import-alerts" && Array.isArray(raw.ticks)) return raw;
  } catch {
    /* corrupt */
  }
  return null;
}

export function writeSnapshot(snap: ImportAlertsSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function collectImportAlerts(opts?: { pauseMs?: number; htmlDir?: string }): Promise<ImportAlertsSnapshot> {
  const dir = opts?.htmlDir ?? htmlDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 1500);
  const catalogHtml =
    readHtmlDirFile(dir, ["ialist.html", "ialist-excerpt.html"]) ?? (await fetchFdaHtml(FDA_CATALOG_URL));
  const catalog = parseCatalog(catalogHtml);
  const parsed: { rows: ImportAlertRow[]; summary: AlertParseSummary }[] = [];
  for (const slice of FIRST_SLICE) {
    if (!dir) await pause(pauseMs);
    const url = `${FDA_ALERT_BASE}importalert_${slice.pageId}.html`;
    try {
      const html =
        readHtmlDirFile(dir, [`ia_${slice.pageId}.html`, `importalert_${slice.pageId}.html`]) ??
        (await fetchFdaHtml(url));
      const cat = catalog.find((c) => c.pageId === slice.pageId || c.alertNumber === slice.alertNumber);
      parsed.push(parseAlertPage(html, slice.pageId, cat));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      parsed.push({
        rows: [],
        summary: {
          alertNumber: slice.alertNumber,
          pageId: slice.pageId,
          sourceUrl: url,
          asOf: null,
          name: null,
          hasRedHeading: false,
          hasGreenHeading: false,
          firmCount: 0,
          tickCount: 0,
          emptyReason: `fetch failed: ${message}`,
        },
      });
    }
  }
  const snap = assembleSnapshot(catalog, parsed);
  writeSnapshot(snap);
  return snap;
}

export async function loadImportAlerts(): Promise<ImportAlertsSnapshot> {
  const cached = readSnapshot();
  const ttlMs = Number(env("IMPORT_ALERTS_TTL_MS", String(6 * 3600 * 1000)));
  if (cached) {
    const age = Date.now() - Date.parse(cached.fetchedAt);
    if (Number.isFinite(age) && age >= 0 && age < ttlMs) return cached;
  }
  try {
    return await collectImportAlerts();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.ticks.length ? "stale" : "empty",
        reason: `Live FDA fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `FDA HTML is not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function manifestFromSnapshot(snap: ImportAlertsSnapshot | null, catalogHtml?: string): Record<string, unknown> {
  const catalog = snap?.catalog?.length
    ? snap.catalog
    : catalogHtml
      ? parseCatalog(catalogHtml)
      : [];
  const samples = sampleRowsFrom(snap?.ticks ?? [], 2);
  const base = buildManifest(catalog, samples);
  if (!snap) return base;
  const firms = new Set(snap.ticks.map((t) => `${t.alertNumber}|${t.list}|${t.country}|${t.firm}`));
  return {
    ...base,
    fetchedAt: snap.fetchedAt,
    asOf: snap.asOf,
    tickCount: snap.ticks.length,
    firmCount: firms.size,
    alerts: snap.alerts,
  };
}

export async function loadManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return manifestFromSnapshot(cached);
  try {
    const dir = htmlDir();
    const catalogHtml =
      readHtmlDirFile(dir, ["ialist.html", "ialist-excerpt.html"]) ?? (await fetchFdaHtml(FDA_CATALOG_URL));
    return buildManifest(parseCatalog(catalogHtml), []);
  } catch {
    return buildManifest([], []);
  }
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectImportAlerts()
    .then((snap) => {
      const firms = new Set(snap.ticks.map((t) => `${t.alertNumber}|${t.list}|${t.country}|${t.firm}`));
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            catalogAlerts: snap.catalog.length,
            firstSlice: snap.alerts,
            tickCount: snap.ticks.length,
            firmCount: firms.size,
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
