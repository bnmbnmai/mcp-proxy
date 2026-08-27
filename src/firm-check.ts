/**
 * Free cross-door firm check on official caches already indexed here.
 * Searches firm/institution/bank-nameable official indexes that already
 * expose a usable name field: Form 483, FDA warning letters, FDA untitled
 * letters, FTC BCP warning letters, Ofwat, Ofgem, CFPB orders, OCC C&Ds,
 * FDIC orders, and the FDA import-alert catalog.
 * Does not scrape FDA.gov. Does not return letter bodies or the full import-alert table.
 * Not a paid SKU. Does not invent a new paid door.
 */

import { loadCfpbOrdersManifest } from "./cfpb-orders.js";
import { loadFdicOrdersManifest } from "./fdic-orders.js";
import { loadForm483Manifest } from "./form-483.js";
import { loadFtcWlManifest } from "./ftc-wl.js";
import { loadManifest as loadImportAlertsManifest } from "./import-alerts.js";
import { loadOccCdManifest } from "./occ-cd.js";
import { loadOfgemEnforcementManifest } from "./ofgem-enforcement.js";
import { loadOfwatEnforcementManifest } from "./ofwat-enforcement.js";
import {
  attachPaidPageCursors,
  PAGE_PRICE_USDC,
  paidOneUrl,
  SINGLE_DOC_PRICE_USDC,
} from "./paid-records.js";
import { loadUntitledLettersManifest } from "./untitled-letters.js";
import { loadWarningLettersManifest } from "./warning-letters.js";

export const FIRM_CHECK_PATH = "/firm-check";
export const FIRM_CHECK_TOOL_NAME = "firm-check";
export const FIRM_CHECK_CAP = 20;
export const FIRM_CHECK_DOORS = [
  "form-483",
  "warning-letters",
  "untitled-letters",
  "ftc-wl",
  "ofwat-enforcement",
  "ofgem-enforcement",
  "cfpb-orders",
  "occ-cd",
  "fdic-orders",
  "import-alerts",
] as const;

export const FIRM_CHECK_NOTE =
  "Free cross-door search of official caches: Form 483, FDA warning letters, FDA untitled letters, FTC BCP warning letters, Ofwat enforcement, Ofgem enforcement, CFPB orders, OCC C&Ds, FDIC orders, and the FDA import-alert catalog. Not a paid SKU. Hits name the door, the id or page to buy, and fetchedAt/asOf. One official text is GET ?id= ($0.02). The page of newest 10 official texts is $0.05. The import-alert table stays the entire current table at $0.05. Does not return letter bodies or the full import-alert table.";

const BODY_DOOR_ORDER: Record<string, number> = Object.fromEntries(
  FIRM_CHECK_DOORS.map((door, i) => [door, i]),
);

export type FirmCheckIndexes = {
  form483?: Record<string, unknown> | null;
  warningLetters?: Record<string, unknown> | null;
  untitledLetters?: Record<string, unknown> | null;
  ftcWl?: Record<string, unknown> | null;
  ofwatEnforcement?: Record<string, unknown> | null;
  ofgemEnforcement?: Record<string, unknown> | null;
  cfpbOrders?: Record<string, unknown> | null;
  occCd?: Record<string, unknown> | null;
  fdicOrders?: Record<string, unknown> | null;
  importAlerts?: Record<string, unknown> | null;
};

const BODY_INDEX_DOORS: Array<{ door: Exclude<(typeof FIRM_CHECK_DOORS)[number], "import-alerts">; key: keyof FirmCheckIndexes }> = [
  { door: "form-483", key: "form483" },
  { door: "warning-letters", key: "warningLetters" },
  { door: "untitled-letters", key: "untitledLetters" },
  { door: "ftc-wl", key: "ftcWl" },
  { door: "ofwat-enforcement", key: "ofwatEnforcement" },
  { door: "ofgem-enforcement", key: "ofgemEnforcement" },
  { door: "cfpb-orders", key: "cfpbOrders" },
  { door: "occ-cd", key: "occCd" },
  { door: "fdic-orders", key: "fdicOrders" },
];

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function asList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    : [];
}

function haystack(row: Record<string, unknown>): string {
  return [
    row.id,
    row.docket,
    row.mediaId,
    row.firm,
    row.institution,
    row.bank,
    row.title,
    row.name,
    row.subject,
    row.fei,
    row.cms,
    row.alertNumber,
    row.pageId,
    row.product,
    row.country,
    row.date,
    row.issuedOn,
    row.publishedOn,
    row.recordDate,
    row.datePublished,
    row.sourceUrl,
  ]
    .map((value) => str(value).toLowerCase())
    .join(" ");
}

function rowDate(row: Record<string, unknown>): string | null {
  const raw =
    str(row.date) ||
    str(row.issuedOn) ||
    str(row.publishedOn) ||
    str(row.recordDate) ||
    str(row.datePublished);
  return raw || null;
}

function rowId(row: Record<string, unknown>): string {
  return str(row.id) || str(row.alertNumber) || str(row.mediaId) || str(row.cms) || str(row.pageId);
}

function rowFirmName(row: Record<string, unknown>): string {
  return str(row.firm) || str(row.institution) || str(row.bank);
}

function rowTitle(row: Record<string, unknown>): string {
  return rowFirmName(row) || str(row.title) || str(row.name) || str(row.subject) || rowId(row);
}

function matchesNeedle(row: Record<string, unknown>, needle: string): boolean {
  return haystack(row).includes(needle);
}

function cacheStamp(index: Record<string, unknown> | null | undefined): {
  fetchedAt: string | null;
  asOf: string | null;
} {
  return {
    fetchedAt: str(index?.fetchedAt) || null,
    asOf: str(index?.asOf) || null,
  };
}

function rowPage(row: Record<string, unknown>): number | null {
  if (typeof row.page === "number" && Number.isFinite(row.page)) return row.page;
  const raw = Number(row.page);
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

export type FirmCheckMatch = {
  door: string;
  id: string;
  page: number | null;
  title: string;
  firm: string | null;
  date: string | null;
  fetchedAt: string | null;
  asOf: string | null;
  paidUrl: string;
  bag: string;
  priceUsdc: string;
  pagePaidUrl?: string;
  pageBag?: string;
  pagePriceUsdc?: string;
};

export type FirmCheckResult = {
  free: true;
  product: "firm-check";
  name: string;
  note: string;
  q: string;
  doors: string[];
  cap: number;
  matchCount: number;
  matches: FirmCheckMatch[];
  paidPulls: {
    oneOfficialText: { priceUsdc: string; bag: string };
    page: { priceUsdc: string; bag: string };
    table: { priceUsdc: string; bag: string; path: string };
  };
};

function bodyMatch(
  door: string,
  row: Record<string, unknown>,
  stamp: { fetchedAt: string | null; asOf: string | null },
): FirmCheckMatch {
  const id = rowId(row);
  return {
    door,
    id,
    page: rowPage(row),
    title: rowTitle(row),
    firm: rowFirmName(row) || null,
    date: rowDate(row),
    fetchedAt: stamp.fetchedAt,
    asOf: stamp.asOf,
    paidUrl: paidOneUrl(`/${door}`, id),
    bag: "one official text",
    priceUsdc: SINGLE_DOC_PRICE_USDC,
    pagePaidUrl: `/${door}`,
    pageBag: "newest 10 official texts",
    pagePriceUsdc: PAGE_PRICE_USDC,
  };
}

function tableMatch(
  row: Record<string, unknown>,
  stamp: { fetchedAt: string | null; asOf: string | null },
): FirmCheckMatch {
  return {
    door: "import-alerts",
    id: rowId(row),
    page: null,
    title: rowTitle(row),
    firm: rowFirmName(row) || null,
    date: rowDate(row),
    fetchedAt: stamp.fetchedAt,
    asOf: stamp.asOf,
    paidUrl: "/import-alerts",
    bag: "entire current table",
    priceUsdc: PAGE_PRICE_USDC,
  };
}

function searchBodyIndex(door: string, manifest: Record<string, unknown>, needle: string): FirmCheckMatch[] {
  const listKey = Array.isArray(manifest.letters) ? "letters" : Array.isArray(manifest.cards) ? "cards" : null;
  if (!listKey) return [];
  const stamp = cacheStamp(manifest);
  return attachPaidPageCursors(asList(manifest[listKey]))
    .filter((row) => matchesNeedle(row, needle))
    .map((row) => bodyMatch(door, row, stamp));
}

function searchImportAlertIndex(manifest: Record<string, unknown>, needle: string): FirmCheckMatch[] {
  const stamp = cacheStamp(manifest);
  const sampleHits = asList(manifest.samples).filter((row) => matchesNeedle(row, needle));
  const used = new Set(sampleHits.map((row) => rowId(row)));
  const catalogHits = asList(manifest.catalog).filter((row) => {
    const id = rowId(row);
    return matchesNeedle(row, needle) && !used.has(id);
  });
  return [...sampleHits, ...catalogHits].map((row) => tableMatch(row, stamp));
}

export function firmCheckFromIndexes(
  q: string,
  indexes: FirmCheckIndexes,
  cap = FIRM_CHECK_CAP,
): FirmCheckResult {
  const needle = q.trim().toLowerCase();
  const collected: FirmCheckMatch[] = [];
  if (needle) {
    for (const { door, key } of BODY_INDEX_DOORS) {
      const index = indexes[key];
      if (index) collected.push(...searchBodyIndex(door, index, needle));
    }
    if (indexes.importAlerts) collected.push(...searchImportAlertIndex(indexes.importAlerts, needle));
  }
  collected.sort((a, b) => {
    const dateCmp = (b.date ?? "").localeCompare(a.date ?? "");
    if (dateCmp !== 0) return dateCmp;
    const doorCmp = (BODY_DOOR_ORDER[a.door] ?? 99) - (BODY_DOOR_ORDER[b.door] ?? 99);
    if (doorCmp !== 0) return doorCmp;
    return a.id.localeCompare(b.id);
  });
  return {
    free: true,
    product: "firm-check",
    name: "Firm check",
    note: FIRM_CHECK_NOTE,
    q: q.trim(),
    doors: [...FIRM_CHECK_DOORS],
    cap,
    matchCount: collected.length,
    matches: collected.slice(0, cap),
    paidPulls: {
      oneOfficialText: { priceUsdc: SINGLE_DOC_PRICE_USDC, bag: "one official text GET ?id=" },
      page: { priceUsdc: PAGE_PRICE_USDC, bag: "newest 10 official texts on a plain GET" },
      table: { priceUsdc: PAGE_PRICE_USDC, bag: "entire current table", path: "/import-alerts" },
    },
  };
}

export async function runFirmCheck(q: string, cap = FIRM_CHECK_CAP): Promise<FirmCheckResult> {
  const [
    form483,
    warningLetters,
    untitledLetters,
    ftcWl,
    ofwatEnforcement,
    ofgemEnforcement,
    cfpbOrders,
    occCd,
    fdicOrders,
    importAlerts,
  ] = await Promise.all([
    loadForm483Manifest(),
    loadWarningLettersManifest(),
    loadUntitledLettersManifest(),
    loadFtcWlManifest(),
    loadOfwatEnforcementManifest(),
    loadOfgemEnforcementManifest(),
    loadCfpbOrdersManifest(),
    loadOccCdManifest(),
    loadFdicOrdersManifest(),
    loadImportAlertsManifest(),
  ]);
  return firmCheckFromIndexes(
    q,
    {
      form483,
      warningLetters,
      untitledLetters,
      ftcWl,
      ofwatEnforcement,
      ofgemEnforcement,
      cfpbOrders,
      occCd,
      fdicOrders,
      importAlerts,
    },
    cap,
  );
}

export function firmCheckQuery(q: unknown): string {
  return str(q);
}
