/**
 * Deterministic paid-body normalize for live official doors.
 * Reads OUR cache only. Does not call official APIs or an LLM.
 * Existing paid keys stay; records[] is added alongside for agent diffs.
 * Shape is always {id, date, firm, url, type} — same as the first-pass /ticks /form-483 /warning-letters product.
 *
 * Extracted-body doors sell the newest N official texts on a plain GET (default 10).
 * Same URL ?before=<id or date> (from the free manifest) is the next older N for
 * another $0.05. If the door has fewer than N collected records, the $0.05 page
 * is the whole current set. Free /{door}/manifest.json stays the full catalog.
 * /ticks, /import-alerts, and Mariners weekly editions are not windowed.
 */

export const DEFAULT_PAID_BODY_WINDOW = 10;
export const PAID_BODY_WINDOW_ENV = "PAID_BODY_WINDOW";
/** Same-door GET ?id= one official text. Not a new Bazaar SKU. */
export const SINGLE_DOC_AMOUNT_ATOMIC = "20000";
export const SINGLE_DOC_PRICE_USDC = "0.02";
export const PAGE_AMOUNT_ATOMIC = "50000";
export const PAGE_PRICE_USDC = "0.05";

/** Live extracted-body doors. One GET, newest N official texts. Not /ticks, /import-alerts, or Mariners. */
export const EXTRACTED_BODY_SKUS = [
  "warning-letters",
  "untitled-letters",
  "form-483",
  "gmp",
  "gmp-md",
  "awa",
  "swisspar",
  "pcac",
  "ftc-wl",
  "cfpb-orders",
  "occ-cd",
  "fdic-orders",
  "frb-orders",
  "ncua-orders",
  "fincen-orders",
  "ferc-orders",
  "ofac-orders",
  "bis-orders",
  "cftc-orders",
  "fifra-orders",
  "denovo-orders",
  "ttb-oic",
  "air-letters",
  "superfund-rods",
  "ico-mpn",
  "cma-ca98",
  "ema-referrals",
  "cder-reviews",
  "npdes-permits",
  "ofsted-inspections",
  "ofwat-enforcement",
  "ofgem-enforcement",
  "gain",
  "orr-enforcement",
] as const;

export type ExtractedBodySku = (typeof EXTRACTED_BODY_SKUS)[number];

export type PaidBodyOpts = {
  /** Override the live N. Default is PAID_BODY_WINDOW or 10. */
  window?: number;
  /** Official catalog id, or YYYY-MM-DD. Next older page after that cursor. */
  before?: string;
  /** 1-based page. Page 1 is the newest chunk. Ignored when before is set. */
  page?: number;
  /** Official catalog id. That one official text ($0.02). Wins over before/page. */
  id?: string;
};

export function isExtractedBodySku(sku: string): sku is ExtractedBodySku {
  return (EXTRACTED_BODY_SKUS as readonly string[]).includes(sku);
}

export function paidBodyWindow(explicit?: number, env: NodeJS.ProcessEnv = process.env): number {
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit >= 1) {
    return Math.floor(explicit);
  }
  const raw = env[PAID_BODY_WINDOW_ENV];
  if (raw == null || String(raw).trim() === "") return DEFAULT_PAID_BODY_WINDOW;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAID_BODY_WINDOW;
  return Math.floor(n);
}

export function newestOfficialTextsCopy(n = paidBodyWindow()): string {
  return `newest ${n} official texts`;
}

export function olderChunkCopy(n = paidBodyWindow()): string {
  return `older chunk if they ask (?before=<id or date>, another $0.05)`;
}

export function oneOfficialTextCopy(): string {
  return `one official text GET ?id= ($0.02)`;
}

/** Free-manifest note: free index/search, then pay one text or the page. */
export function paidBodyCatalogNote(paidPath: string, catalogLead: string): string {
  const n = paidBodyWindow();
  const lead = catalogLead.trim().replace(/\.?$/, ".");
  return `${lead} Free index/search (?q=, optional before/date) stays free and includes id, the ?id= URL ($0.02), and the page cursor ($0.05). GET ${paidPath}?id= is ${oneOfficialTextCopy()}. Plain paid GET ${paidPath} is the ${newestOfficialTextsCopy(n)}; ${olderChunkCopy(n)}.`;
}

export const TICKS_CACHE_SOURCE = "US hay, cattle, and grain ticks cache";
export const FORM_483_TYPE = "form-483";
export const WARNING_LETTER_TYPE = "warning-letter";
export const CMA_CA98_TYPE = "cma-ca98";
export const ICO_MPN_TYPE = "ico-mpn";
export const FTC_WL_TYPE = "ftc-wl";
export const UNTITLED_LETTER_TYPE = "untitled-letter";
export const AIR_LETTER_TYPE = "air-letter";
export const IMPORT_ALERT_TYPE = "import-alert";
export const CFTC_ORDER_TYPE = "cftc-order";
export const FIFRA_ORDER_TYPE = "fifra-order";
export const DENOVO_ORDER_TYPE = "denovo-order";
export const TTB_OIC_TYPE = "ttb-oic";
export const SUPERFUND_ROD_TYPE = "superfund-rod";
export const PCAC_TYPE = "pcac";
export const AWA_TYPE = "awa";
export const SWISSPAR_TYPE = "swisspar";
export const EMA_REFERRALS_TYPE = "ema-referrals";
export const CDER_REVIEWS_TYPE = "cder-reviews";
export const NPDES_PERMITS_TYPE = "npdes-permits";
export const OFSTED_INSPECTIONS_TYPE = "ofsted-inspections";
export const OFWAT_ENFORCEMENT_TYPE = "ofwat-enforcement";
export const OFGEM_ENFORCEMENT_TYPE = "ofgem-enforcement";
export const GAIN_TYPE = "gain";
export const ORR_ENFORCEMENT_TYPE = "orr-enforcement";
export const CFPB_ORDER_TYPE = "cfpb-order";
export const OFAC_ORDER_TYPE = "ofac-order";
export const FRB_ORDER_TYPE = "frb-order";
export const FINCEN_ORDER_TYPE = "fincen-order";
export const FERC_ORDER_TYPE = "ferc-order";
export const BIS_ORDER_TYPE = "bis-order";
export const OCC_CD_TYPE = "occ-cd";
export const FDIC_ORDER_TYPE = "fdic-order";
export const NCUA_ORDER_TYPE = "ncua-order";
export const GMP_TYPE = "gmp";
export const GMP_MD_TYPE = "gmp-md";
export const MARINERS_TYPE = "mariners";
export const MARINERS_D11_TYPE = "mariners-d11";
export const MARINERS_D7_TYPE = "mariners-d7";
export const MARINERS_D8_TYPE = "mariners-d8";

export const CMA_CA98_SOURCE =
  "https://www.gov.uk/cma-cases/financial-services-sector-suspected-anti-competitive-practices";
export const ICO_MPN_SOURCE = "https://ico.org.uk/action-weve-taken/enforcement/?type=monetary-penalties";
export const FTC_WL_SOURCE = "https://www.ftc.gov/legal-library/browse/warning-letters";
export const UNTITLED_LETTER_SOURCE =
  "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/issuance-untitled-letters";
export const AIR_LETTER_SOURCE = "https://www.aphis.usda.gov/confirmation-letters";
export const IMPORT_ALERT_SOURCE = "https://www.accessdata.fda.gov/cms_ia/ialist.html";
export const CFTC_ORDER_SOURCE = "https://www.cftc.gov/LawRegulation/EnforcementActions/index.htm";
export const FIFRA_ORDER_SOURCE = "https://yosemite.epa.gov/oa/rhc/epaadmin.nsf";
export const DENOVO_ORDER_SOURCE = "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/denovo.cfm";
export const TTB_OIC_SOURCE = "https://www.ttb.gov/business-central/fo/administrative-cases";
export const SUPERFUND_ROD_SOURCE =
  "https://cumulis.epa.gov/supercpad/SiteProfiles/index.cfm?fuseaction=second.Cleanup&id=0501275";
export const PCAC_SOURCE =
  "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026";
export const AWA_SOURCE = "https://www.aphis.usda.gov/awa/public-search";
export const SWISSPAR_SOURCE =
  "https://www.swissmedic.ch/swissmedic/en/home/humanarzneimittel/authorisations/swisspar.html";
export const EMA_REFERRALS_SOURCE =
  "https://www.ema.europa.eu/en/documents/report/referrals-output-json-report_en.json";
export const CDER_REVIEWS_SOURCE = "https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm";
export const NPDES_PERMITS_SOURCE = "https://www.epa.gov/npdes-permits";
export const OFSTED_INSPECTIONS_SOURCE = "https://reports.ofsted.gov.uk/";
export const OFWAT_ENFORCEMENT_SOURCE = "https://www.ofwat.gov.uk/regulated-companies/investigations/";
export const OFGEM_ENFORCEMENT_SOURCE =
  "https://www.ofgem.gov.uk/energy-regulation/how-we-regulate/compliance-and-enforcement";
export const GAIN_SOURCE = "https://gain.fas.usda.gov/";
export const ORR_ENFORCEMENT_SOURCE = "https://www.orr.gov.uk/monitoring-regulation/rail/investigations";
export const CFPB_ORDER_SOURCE = "https://www.consumerfinance.gov/enforcement/actions/";
export const OFAC_ORDER_SOURCE = "https://ofac.treasury.gov/civil-penalties-and-enforcement-information";
export const FRB_ORDER_SOURCE = "https://www.federalreserve.gov/supervisionreg/enforcementactions.htm";
export const FINCEN_ORDER_SOURCE = "https://www.fincen.gov/news/enforcement-actions";
export const FERC_ORDER_SOURCE = "https://www.ferc.gov/civil-penalties/all-civil-penalty-actions-2026";
export const BIS_ORDER_SOURCE = "https://www.bis.gov/enforcement/charging-letters";
export const OCC_CD_SOURCE = "https://apps.occ.gov/EASearch";
export const FDIC_ORDER_SOURCE = "https://orders.fdic.gov/s/";
export const NCUA_ORDER_SOURCE = "https://ncua.gov/news/enforcement-actions/administrative-orders";
export const GMP_SOURCE = "https://www.drug-inspections.canada.ca/gmp/index-en.html";
export const GMP_MD_SOURCE = "https://www.drug-inspections.canada.ca/md/index-en.html";
export const MARINERS_SOURCE =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=13+0&subdistrict=n";
export const MARINERS_D11_SOURCE =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=11+0&subdistrict=n";
export const MARINERS_D7_SOURCE =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=7+0&subdistrict=n";
export const MARINERS_D8_SOURCE =
  "https://www.navcen.uscg.gov/local-notices-to-mariners?district=8+0&subdistrict=g";

export type PaidRecord = {
  id: string;
  date: string | null;
  firm: string;
  url: string;
  type: string;
};

export type PaidEnvelope = {
  records: PaidRecord[];
  recordCount: number;
  asOf: string | null;
  fetchedAt: string | null;
  source: string;
};

export type PaidBodyWindowEnvelope = PaidEnvelope & {
  paidWindow: number;
  catalogCount: number;
  ids: string[];
  id: string | null;
  before: string | null;
  nextBefore: string | null;
  prevBefore: string | null;
  page: number;
  pageCount: number;
};

/** Reject OCR / ASP.NET-style year-2825 and empty dates. */
export function isPlausibleDate(raw: string | null | undefined): raw is string {
  if (!raw) return false;
  const day = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const y = Number(day.slice(0, 4));
  return Number.isFinite(y) && y >= 1990 && y <= 2100;
}

export function honestFetchedAt(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const y = Number(raw.slice(0, 4));
  if (!Number.isFinite(y) || y < 1990 || y > 2100) return null;
  return raw;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asList(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(asObject(item)));
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function firstPlausibleDate(...values: unknown[]): string | null {
  for (const value of values) {
    const day = str(value).slice(0, 10);
    if (isPlausibleDate(day)) return day;
  }
  return null;
}

/** cms_ia datePublished is MM/DD/YYYY. Map that; do not invent a date. */
export function isoFromOfficialDate(raw: unknown): string | null {
  const iso = firstPlausibleDate(raw);
  if (iso) return iso;
  const mdy = str(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!mdy) return null;
  const day = `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  return isPlausibleDate(day) ? day : null;
}

export function sortRecords(rows: PaidRecord[]): PaidRecord[] {
  return [...rows].sort((a, b) => {
    const dateCmp = (b.date ?? "").localeCompare(a.date ?? "");
    if (dateCmp !== 0) return dateCmp;
    return a.id.localeCompare(b.id);
  });
}

function dedupeById(rows: PaidRecord[]): PaidRecord[] {
  const seen = new Set<string>();
  const out: PaidRecord[] = [];
  for (const row of rows) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function latestRecordDate(records: PaidRecord[]): string | null {
  return sortRecords(records).find((row) => row.date)?.date ?? null;
}

export type PaidCatalogSlice = {
  records: PaidRecord[];
  id: string | null;
  before: string | null;
  nextBefore: string | null;
  prevBefore: string | null;
  page: number;
  pageCount: number;
};

function isDateCursor(raw: string): boolean {
  return raw.length === 10 && isPlausibleDate(raw);
}

/** Newest-first catalog. id= is that one text; before=<id> starts after that id; before=<YYYY-MM-DD> starts at the first older date. */
export function slicePaidCatalog(
  catalog: PaidRecord[],
  limit: number,
  opts?: PaidBodyOpts,
): PaidCatalogSlice {
  const pageCount = Math.max(1, Math.ceil(catalog.length / limit) || 1);
  const rawId = str(opts?.id);
  if (rawId) {
    const idx = catalog.findIndex((row) => row.id === rawId);
    const records = idx >= 0 ? [catalog[idx]] : [];
    const page = idx >= 0 ? Math.floor(idx / limit) + 1 : 1;
    return {
      records,
      id: rawId,
      before: null,
      nextBefore: null,
      prevBefore: null,
      page,
      pageCount,
    };
  }
  let start = 0;
  let before: string | null = null;
  const rawBefore = str(opts?.before);
  if (rawBefore) {
    before = rawBefore;
    if (isDateCursor(rawBefore)) {
      const idx = catalog.findIndex((row) => (row.date ?? "") < rawBefore);
      start = idx >= 0 ? idx : catalog.length;
    } else {
      const idx = catalog.findIndex((row) => row.id === rawBefore);
      start = idx >= 0 ? idx + 1 : catalog.length;
    }
  } else if (typeof opts?.page === "number" && Number.isFinite(opts.page) && opts.page >= 1) {
    start = (Math.floor(opts.page) - 1) * limit;
    before = start <= 0 ? null : (catalog[start - 1]?.id ?? null);
  }
  if (start < 0) start = 0;
  const records = catalog.slice(start, start + limit);
  const page = catalog.length === 0 ? 1 : Math.floor(start / limit) + 1;
  const nextBefore =
    start + records.length < catalog.length ? (records[records.length - 1]?.id ?? null) : null;
  const prevStart = Math.max(0, start - limit);
  const prevBefore = start <= 0 ? null : prevStart <= 0 ? null : (catalog[prevStart - 1]?.id ?? null);
  return { records, id: null, before, nextBefore, prevBefore, page, pageCount };
}

export function attachPaidPageCursors(
  rows: Record<string, unknown>[],
  window = paidBodyWindow(),
): Record<string, unknown>[] {
  const dated = rows.map((row) => ({
    row,
    id: officialItemId(row),
    date: firstPlausibleDate(row.date, row.issuedOn, row.publishedOn, row.inspectedOn, row.recordDate),
  }));
  const sorted = [...dated].sort((a, b) => {
    const dateCmp = (b.date ?? "").localeCompare(a.date ?? "");
    if (dateCmp !== 0) return dateCmp;
    return a.id.localeCompare(b.id);
  });
  const ids = sorted.map((item) => item.id);
  const byId = new Map<string, { page: number; before: string | null }>();
  sorted.forEach((item, index) => {
    const page = Math.floor(index / window) + 1;
    const before = page <= 1 ? null : (ids[(page - 1) * window - 1] ?? null);
    if (item.id && !byId.has(item.id)) byId.set(item.id, { page, before });
  });
  return rows.map((row) => {
    const id = officialItemId(row);
    const cursor = byId.get(id) ?? { page: 1, before: null };
    const date =
      firstPlausibleDate(row.date, row.issuedOn, row.publishedOn, row.inspectedOn, row.recordDate) ??
      (str(row.date) || null);
    return { ...row, date, page: cursor.page, before: cursor.before };
  });
}

export type CatalogSearchQuery = {
  q?: string | null;
  before?: string | null;
  date?: string | null;
  paidPath?: string | null;
};

function catalogRowDate(row: Record<string, unknown>): string {
  return (
    firstPlausibleDate(row.date, row.issuedOn, row.publishedOn, row.inspectedOn, row.recordDate) ??
    str(row.date)
  );
}

export function searchCatalogRows(rows: Record<string, unknown>[], q: string): Record<string, unknown>[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => {
    const hay = [row.id, row.docket, row.firm, row.institution, row.bank, row.creditUnion, row.subject, row.title, row.name, row.substance, row.urn, row.provider, row.permit, row.country, row.post, row.reportNumber, row.date, row.issuedOn, row.publishedOn, row.inspectedOn, row.recordDate, row.sourceUrl]
      .map((value) => str(value).toLowerCase())
      .join(" ");
    return hay.includes(needle);
  });
}

/** Free index filters. before=<id> is that page; before=<YYYY-MM-DD> is older dates. date= is a prefix. */
export function filterCatalogRows(
  rows: Record<string, unknown>[],
  query: CatalogSearchQuery = {},
): Record<string, unknown>[] {
  let out = rows;
  const q = str(query.q);
  if (q) out = searchCatalogRows(out, q);
  const date = str(query.date);
  if (date) {
    out = out.filter((row) => catalogRowDate(row).startsWith(date));
  }
  const before = str(query.before);
  if (before) {
    if (isDateCursor(before)) {
      out = out.filter((row) => (catalogRowDate(row) || "") < before);
    } else {
      out = out.filter((row) => str(row.before) === before);
    }
  }
  return out;
}

export function catalogSearchQueryString(query: CatalogSearchQuery = {}): string {
  const q = new URLSearchParams();
  const text = str(query.q);
  const before = str(query.before);
  const date = str(query.date);
  if (text) q.set("q", text);
  if (before) q.set("before", before);
  if (date) q.set("date", date);
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

export function paidBodyOptsFromSearch(search: string | URLSearchParams): PaidBodyOpts {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") || search.includes("=") ? search.replace(/^\?/, "") : "")
      : search;
  const id = str(params.get("id"));
  const before = str(params.get("before"));
  const pageRaw = str(params.get("page"));
  const page = Number(pageRaw);
  const out: PaidBodyOpts = {};
  if (id) out.id = id;
  if (before) out.before = before;
  if (Number.isFinite(page) && page >= 1) out.page = Math.floor(page);
  return out;
}

export function paidBodyQueryPath(path: string, opts?: PaidBodyOpts): string {
  const q = new URLSearchParams();
  if (opts?.id) q.set("id", opts.id);
  else if (opts?.before) q.set("before", opts.before);
  else if (opts?.page && opts.page > 1) q.set("page", String(opts.page));
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

export function paidOneUrl(paidPath: string, id: string): string {
  return `${paidPath}?id=${encodeURIComponent(id)}`;
}

export function decorateExtractedBodyManifest(
  manifest: Record<string, unknown>,
  query: CatalogSearchQuery = {},
): Record<string, unknown> {
  const listKey = Array.isArray(manifest.cards) ? "cards" : Array.isArray(manifest.letters) ? "letters" : null;
  if (!listKey) return manifest;
  const paidPath = str(query.paidPath);
  const rows = filterCatalogRows(attachPaidPageCursors(asList(manifest[listKey])), query).map((row) => {
    const id = officialItemId(row);
    return paidPath && id ? { ...row, paidUrl: paidOneUrl(paidPath, id) } : row;
  });
  const q = str(query.q);
  const before = str(query.before);
  const date = str(query.date);
  const searching = Boolean(q || before || date);
  return {
    ...manifest,
    [listKey]: rows,
    search: q || null,
    before: before || null,
    date: date || null,
    ...(searching ? { matchCount: rows.length } : {}),
  };
}

function officialItemId(row: Record<string, unknown>): string {
  return str(row.id) || str(row.docket) || str(row.mediaId) || str(row.inspectionNumber);
}

/** Keep only the windowed official bodies, newest-first to match records[]. */
function windowOfficialItems(
  items: Record<string, unknown>[],
  records: PaidRecord[],
): Record<string, unknown>[] {
  const order = new Map(records.map((row, i) => [row.id, i]));
  return items
    .filter((row) => order.has(officialItemId(row)))
    .sort((a, b) => (order.get(officialItemId(a)) ?? 0) - (order.get(officialItemId(b)) ?? 0));
}

export function normalizeTicksRecords(payload: { ticks?: unknown[] }): PaidRecord[] {
  const out: PaidRecord[] = [];
  for (const row of asList(payload.ticks)) {
    const id = str(row.id);
    if (!id) continue;
    out.push({
      id,
      date: firstPlausibleDate(row.asOf, row.reportDate),
      firm: str(row.market) || str(row.source) || id,
      url: str(row.sourceUrl),
      type: str(row.group) || "tick",
    });
  }
  return sortRecords(dedupeById(out));
}

export function normalizeForm483Records(payload: { letters?: unknown[] }): PaidRecord[] {
  const out: PaidRecord[] = [];
  for (const row of asList(payload.letters)) {
    const body = str(row.body);
    if (!body) continue;
    const id = str(row.id) || str(row.mediaId);
    if (!id) continue;
    out.push({
      id,
      date: firstPlausibleDate(row.publishedOn, row.recordDate, row.issuedOn),
      firm: str(row.firm) || id,
      url: str(row.sourceUrl),
      type: FORM_483_TYPE,
    });
  }
  return sortRecords(dedupeById(out));
}

export function normalizeWarningLetterRecords(payload: { letters?: unknown[] }): PaidRecord[] {
  const out: PaidRecord[] = [];
  for (const row of asList(payload.letters)) {
    if (!str(row.body)) continue;
    const id = str(row.id);
    if (!id) continue;
    out.push({
      id,
      date: firstPlausibleDate(row.issuedOn),
      firm: str(row.firm) || id,
      url: str(row.sourceUrl),
      type: WARNING_LETTER_TYPE,
    });
  }
  return sortRecords(dedupeById(out));
}

function listingSource(payload: { sources?: unknown }, fallback: string): string {
  const sources = asObject(payload.sources);
  const listing =
    str(sources?.listing) ||
    str(sources?.hub) ||
    str(sources?.cder) ||
    str(sources?.catalog) ||
    str(sources?.index) ||
    str(sources?.meeting);
  return listing || fallback;
}

/**
 * First-slice card doors share id / date / institution|firm|bank|creditUnion / sourceUrl / body.
 * Occupied subject keys (bank, creditUnion, holder, substance) map onto firm.
 * Health Canada report cards use inspectedOn instead of date.
 * Empty-body cards stay in the official cache and are not sold as records[].
 */
export function normalizeCardRecords(
  payload: { cards?: unknown[] },
  type: string,
): PaidRecord[] {
  const out: PaidRecord[] = [];
  for (const row of asList(payload.cards)) {
    if (!str(row.body)) continue;
    const id = str(row.id) || str(row.docket) || str(row.mediaId) || str(row.inspectionNumber);
    if (!id) continue;
    out.push({
      id,
      date: firstPlausibleDate(row.date, row.issuedOn, row.publishedOn, row.inspectedOn),
      firm:
        str(row.firm) ||
        str(row.institution) ||
        str(row.bank) ||
        str(row.creditUnion) ||
        str(row.holder) ||
        str(row.substance) ||
        str(row.name) ||
        str(row.provider) ||
        str(row.country) ||
        id,
      url: str(row.sourceUrl),
      type,
    });
  }
  return sortRecords(dedupeById(out));
}

export function normalizeImportAlertRecords(payload: { ticks?: unknown[] }): PaidRecord[] {
  const out: PaidRecord[] = [];
  for (const row of asList(payload.ticks)) {
    const alertNumber = str(row.alertNumber);
    const firm = str(row.firm);
    if (!alertNumber || !firm) continue;
    const list = str(row.list);
    const product = str(row.product);
    const id = [alertNumber, list, firm, product].filter(Boolean).join(":");
    out.push({
      id,
      date: isoFromOfficialDate(row.datePublished) ?? firstPlausibleDate(row.asOf),
      firm,
      url: str(row.sourceUrl),
      type: IMPORT_ALERT_TYPE,
    });
  }
  return sortRecords(dedupeById(out));
}

function paidCardBody<T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown }>(
  payload: T,
  type: string,
  fallbackSource: string,
  opts?: PaidBodyOpts,
): T & PaidBodyWindowEnvelope {
  const catalog = normalizeCardRecords(payload, type);
  const limit = paidBodyWindow(opts?.window);
  const sliced = slicePaidCatalog(catalog, limit, opts);
  const records = sliced.records;
  const one = Boolean(sliced.id);
  return {
    ...payload,
    cards: windowOfficialItems(asList(payload.cards), records),
    asOf: latestRecordDate(records),
    fetchedAt: honestFetchedAt(payload.fetchedAt),
    source: listingSource(payload, fallbackSource),
    records,
    recordCount: records.length,
    ids: records.map((row) => row.id),
    paidWindow: one ? 1 : limit,
    catalogCount: catalog.length,
    id: sliced.id,
    before: sliced.before,
    nextBefore: sliced.nextBefore,
    prevBefore: sliced.prevBefore,
    page: sliced.page,
    pageCount: sliced.pageCount,
  };
}

export function paidTicksBody<T extends { ticks?: unknown[]; fetchedAt?: unknown; sources?: unknown }>(
  payload: T,
): T & PaidEnvelope {
  const records = normalizeTicksRecords(payload);
  return {
    ...payload,
    asOf: latestRecordDate(records),
    fetchedAt: honestFetchedAt(payload.fetchedAt),
    source: TICKS_CACHE_SOURCE,
    records,
    recordCount: records.length,
  };
}

export function paidForm483Body<T extends { letters?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown }>(
  payload: T,
  opts?: PaidBodyOpts,
): T & PaidBodyWindowEnvelope {
  const catalog = normalizeForm483Records(payload);
  const limit = paidBodyWindow(opts?.window);
  const sliced = slicePaidCatalog(catalog, limit, opts);
  const records = sliced.records;
  const one = Boolean(sliced.id);
  return {
    ...payload,
    letters: windowOfficialItems(asList(payload.letters), records),
    asOf: latestRecordDate(records),
    fetchedAt: honestFetchedAt(payload.fetchedAt),
    source: listingSource(
      payload,
      "https://www.fda.gov/about-fda/office-inspections-and-investigations/oii-foia-electronic-reading-room",
    ),
    records,
    recordCount: records.length,
    ids: records.map((row) => row.id),
    paidWindow: one ? 1 : limit,
    catalogCount: catalog.length,
    id: sliced.id,
    before: sliced.before,
    nextBefore: sliced.nextBefore,
    prevBefore: sliced.prevBefore,
    page: sliced.page,
    pageCount: sliced.pageCount,
  };
}

export function paidWarningLettersBody<
  T extends { letters?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  const catalog = normalizeWarningLetterRecords(payload);
  const limit = paidBodyWindow(opts?.window);
  const sliced = slicePaidCatalog(catalog, limit, opts);
  const records = sliced.records;
  const one = Boolean(sliced.id);
  return {
    ...payload,
    letters: windowOfficialItems(asList(payload.letters), records),
    asOf: latestRecordDate(records),
    fetchedAt: honestFetchedAt(payload.fetchedAt),
    source: listingSource(
      payload,
      "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters",
    ),
    records,
    recordCount: records.length,
    ids: records.map((row) => row.id),
    paidWindow: one ? 1 : limit,
    catalogCount: catalog.length,
    id: sliced.id,
    before: sliced.before,
    nextBefore: sliced.nextBefore,
    prevBefore: sliced.prevBefore,
    page: sliced.page,
    pageCount: sliced.pageCount,
  };
}

type CardPayload = { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown };

export function paidCmaCa98Body<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, CMA_CA98_TYPE, CMA_CA98_SOURCE, opts);
}

export function paidEmaReferralsBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, EMA_REFERRALS_TYPE, EMA_REFERRALS_SOURCE, opts);
}

export function paidCderReviewsBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, CDER_REVIEWS_TYPE, CDER_REVIEWS_SOURCE, opts);
}

export function paidNpdesPermitsBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, NPDES_PERMITS_TYPE, NPDES_PERMITS_SOURCE, opts);
}

export function paidOfstedInspectionsBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, OFSTED_INSPECTIONS_TYPE, OFSTED_INSPECTIONS_SOURCE, opts);
}

export function paidOfwatEnforcementBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, OFWAT_ENFORCEMENT_TYPE, OFWAT_ENFORCEMENT_SOURCE, opts);
}

export function paidOfgemEnforcementBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, OFGEM_ENFORCEMENT_TYPE, OFGEM_ENFORCEMENT_SOURCE, opts);
}

export function paidGainBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, GAIN_TYPE, GAIN_SOURCE, opts);
}

export function paidOrrEnforcementBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, ORR_ENFORCEMENT_TYPE, ORR_ENFORCEMENT_SOURCE, opts);
}

export function paidIcoMpnBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, ICO_MPN_TYPE, ICO_MPN_SOURCE, opts);
}

export function paidFtcWlBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, FTC_WL_TYPE, FTC_WL_SOURCE, opts);
}

export function paidUntitledLettersBody<T extends CardPayload>(
  payload: T,
  opts?: PaidBodyOpts,
): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, UNTITLED_LETTER_TYPE, UNTITLED_LETTER_SOURCE, opts);
}

export function paidAirLettersBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, AIR_LETTER_TYPE, AIR_LETTER_SOURCE, opts);
}

export function paidCftcOrdersBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, CFTC_ORDER_TYPE, CFTC_ORDER_SOURCE, opts);
}

export function paidFifraOrdersBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, FIFRA_ORDER_TYPE, FIFRA_ORDER_SOURCE, opts);
}

export function paidDenovoOrdersBody<T extends CardPayload>(
  payload: T,
  opts?: PaidBodyOpts,
): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, DENOVO_ORDER_TYPE, DENOVO_ORDER_SOURCE, opts);
}

export function paidTtbOicBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, TTB_OIC_TYPE, TTB_OIC_SOURCE, opts);
}

export function paidSuperfundRodsBody<T extends CardPayload>(
  payload: T,
  opts?: PaidBodyOpts,
): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, SUPERFUND_ROD_TYPE, SUPERFUND_ROD_SOURCE, opts);
}

export function paidPcacBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, PCAC_TYPE, PCAC_SOURCE, opts);
}

export function paidAwaBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, AWA_TYPE, AWA_SOURCE, opts);
}

export function paidSwissparBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, SWISSPAR_TYPE, SWISSPAR_SOURCE, opts);
}

export function paidCfpbOrdersBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, CFPB_ORDER_TYPE, CFPB_ORDER_SOURCE, opts);
}

export function paidOfacOrdersBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, OFAC_ORDER_TYPE, OFAC_ORDER_SOURCE, opts);
}

export function paidFrbOrdersBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, FRB_ORDER_TYPE, FRB_ORDER_SOURCE, opts);
}

export function paidFincenOrdersBody<T extends CardPayload>(
  payload: T,
  opts?: PaidBodyOpts,
): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, FINCEN_ORDER_TYPE, FINCEN_ORDER_SOURCE, opts);
}

export function paidFercOrdersBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, FERC_ORDER_TYPE, FERC_ORDER_SOURCE, opts);
}

export function paidBisOrdersBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, BIS_ORDER_TYPE, BIS_ORDER_SOURCE, opts);
}

export function paidOccCdBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, OCC_CD_TYPE, OCC_CD_SOURCE, opts);
}

export function paidFdicOrdersBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, FDIC_ORDER_TYPE, FDIC_ORDER_SOURCE, opts);
}

export function paidNcuaOrdersBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, NCUA_ORDER_TYPE, NCUA_ORDER_SOURCE, opts);
}

export function paidGmpBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, GMP_TYPE, GMP_SOURCE, opts);
}

export function paidGmpMdBody<T extends CardPayload>(payload: T, opts?: PaidBodyOpts): T & PaidBodyWindowEnvelope {
  return paidCardBody(payload, GMP_MD_TYPE, GMP_MD_SOURCE, opts);
}

/** Official Light List Number already copied into notice text by the LNM walker. */
export function officialLlnr(text: string): string {
  return text.match(/\bLLNR\s+(\d{4,5}(?:\.\d+)?)\b/)?.[1] ?? "";
}

/** Aid name before LLNR, or the MSI title lead. Official text only. */
export function officialNoticeTitle(text: string): string {
  const aid = text.split(/\s+LLNR\s+/)[0]?.trim() ?? "";
  if (aid && aid !== text.trim()) return aid;
  const lead = text.split(/\s{2,}|\s+-\s+/)[0]?.trim() ?? "";
  return lead.slice(0, 80);
}

/**
 * LNM notices[] is week / section / waterway / text / sourceUrl — not cards[].
 * id is composed from official columns (week + section + LLNR or waterway),
 * same idea as import-alerts. firm is the official waterway/chart/title, never a company.
 * Empty-text notices stay in notices[] and are not sold as records[].
 */
export function normalizeMarinersRecords(
  payload: { notices?: unknown[]; asOf?: unknown },
  type: string,
): PaidRecord[] {
  const editionDate = firstPlausibleDate(payload.asOf);
  const out: PaidRecord[] = [];
  for (const row of asList(payload.notices)) {
    const text = str(row.text);
    if (!text) continue;
    const week = str(row.week);
    const section = str(row.section);
    const waterway = str(row.waterway);
    const llnr = officialLlnr(text);
    const title = officialNoticeTitle(text);
    const id = [week, section, llnr || waterway || title].filter(Boolean).join(":");
    if (!id) continue;
    const dateInText = text.match(/\b(?:19|20)\d{2}-\d{2}-\d{2}\b/)?.[0];
    out.push({
      id,
      date: firstPlausibleDate(dateInText, editionDate),
      firm: waterway || title || section || id,
      url: str(row.sourceUrl),
      type,
    });
  }
  return sortRecords(dedupeById(out));
}

function paidNoticeBody<
  T extends { notices?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T, type: string, fallbackSource: string): T & PaidEnvelope {
  const records = normalizeMarinersRecords(payload, type);
  return {
    ...payload,
    asOf: firstPlausibleDate(payload.asOf) ?? latestRecordDate(records),
    fetchedAt: honestFetchedAt(payload.fetchedAt),
    source: listingSource(payload, fallbackSource),
    records,
    recordCount: records.length,
  };
}

export function paidMarinersBody<
  T extends { notices?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidNoticeBody(payload, MARINERS_TYPE, MARINERS_SOURCE);
}

export function paidMarinersD11Body<
  T extends { notices?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidNoticeBody(payload, MARINERS_D11_TYPE, MARINERS_D11_SOURCE);
}

export function paidMarinersD7Body<
  T extends { notices?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidNoticeBody(payload, MARINERS_D7_TYPE, MARINERS_D7_SOURCE);
}

export function paidMarinersD8Body<
  T extends { notices?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidNoticeBody(payload, MARINERS_D8_TYPE, MARINERS_D8_SOURCE);
}

export function paidImportAlertsBody<
  T extends { ticks?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  const records = normalizeImportAlertRecords(payload);
  return {
    ...payload,
    asOf: firstPlausibleDate(payload.asOf) ?? latestRecordDate(records),
    fetchedAt: honestFetchedAt(payload.fetchedAt),
    source: listingSource(payload, IMPORT_ALERT_SOURCE),
    records,
    recordCount: records.length,
  };
}

export const RECORD_FIELDS = ["id", "date", "firm", "url", "type"] as const;
