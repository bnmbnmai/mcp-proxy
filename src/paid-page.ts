/**
 * Paid bag sizes. Table doors return the whole table. Extracted-body doors
 * return the newest 100 official texts; older pages are another $0.05 on the
 * same URL via page/before. Does not change collect.
 */

export const EXTRACTED_PAGE_SIZE = 100;

export type TableSku = "ticks" | "import-alerts";

export type ExtractedPageQuery = {
  page: number;
  before: string | null;
};

export type ExtractedNextPage = {
  page: number;
  before: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

export function isTableSku(sku: string): sku is TableSku {
  return sku === "ticks" || sku === "import-alerts";
}

export function parseExtractedPageQuery(url: URL): ExtractedPageQuery {
  const raw = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  const before = str(url.searchParams.get("before")) || null;
  return { page, before };
}

export function rowId(row: Record<string, unknown>): string {
  return str(row.id) || str(row.docket) || str(row.mediaId);
}

function rowDate(row: Record<string, unknown>): string {
  return str(row.date || row.publishedOn || row.issuedOn || row.inspectedOn || row.asOf || row.week).slice(0, 10);
}

function listKey(body: Record<string, unknown>): "letters" | "cards" | "notices" | null {
  if (Array.isArray(body.letters)) return "letters";
  if (Array.isArray(body.cards)) return "cards";
  if (Array.isArray(body.notices)) return "notices";
  return null;
}

export function sortNewest(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...rows].sort((a, b) => {
    const dateCmp = rowDate(b).localeCompare(rowDate(a));
    if (dateCmp !== 0) return dateCmp;
    return rowId(a).localeCompare(rowId(b));
  });
}

export type ExtractedPageMeta = {
  page: number;
  pageSize: number;
  returnedCount: number;
  catalogCount: number;
  next: ExtractedNextPage | null;
};

export function pageExtractedPaidBody<T>(body: T, query: ExtractedPageQuery): T {
  const obj = asObject(body);
  if (!obj) return body;
  const key = listKey(obj);
  if (!key) return body;
  const rows = (obj[key] as unknown[]).filter((row): row is Record<string, unknown> => Boolean(asObject(row)));
  const sorted = sortNewest(rows);
  let start = (query.page - 1) * EXTRACTED_PAGE_SIZE;
  if (query.before) {
    const idx = sorted.findIndex((row) => rowId(row) === query.before);
    start = idx >= 0 ? idx + 1 : start;
  }
  const slice = sorted.slice(start, start + EXTRACTED_PAGE_SIZE);
  const last = slice[slice.length - 1];
  const hasMore = start + slice.length < sorted.length;
  const next: ExtractedNextPage | null = hasMore && last
    ? {
        page: Math.floor(start / EXTRACTED_PAGE_SIZE) + 2,
        before: rowId(last),
      }
    : null;
  const sliceIds = new Set(slice.map((row) => rowId(row)).filter(Boolean));
  const recordRows = Array.isArray(obj.records)
    ? (obj.records as unknown[]).filter((row): row is Record<string, unknown> => Boolean(asObject(row)))
    : [];
  const sortedRecords = sortNewest(recordRows);
  const records = Array.isArray(obj.records)
    ? (sliceIds.size > 0
      ? sortedRecords.filter((row) => sliceIds.has(rowId(row)))
      : sortedRecords.slice(start, start + EXTRACTED_PAGE_SIZE))
    : obj.records;
  return {
    ...obj,
    [key]: slice,
    ...(Array.isArray(obj.records) ? { records, recordCount: Array.isArray(records) ? records.length : slice.length } : {}),
    page: query.before ? Math.floor(start / EXTRACTED_PAGE_SIZE) + 1 : query.page,
    pageSize: EXTRACTED_PAGE_SIZE,
    returnedCount: slice.length,
    catalogCount: sorted.length,
    next,
  } as T;
}
