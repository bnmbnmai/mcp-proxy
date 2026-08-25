/**
 * Free extracted-body index. Agents find a record with ?q=. Each hit names
 * the id to buy (?id= = $0.02). Default / page of up to 100 is $0.05.
 * Does not return official bodies. Does not change collect.
 */

import { EXTRACTED_PAGE_SIZE, rowId, sortNewest } from "./paid-page.js";

export const FREE_INDEX_NOTE =
  "Find a record with ?q=. Each index row names the id to buy. GET ?id= is one official text for $0.02. Default GET / page of up to 100 official texts is $0.05 (newest 100 official texts, not the entire archive). Older pages are another $0.05 on the same URL (page/before).";

const SKIP_SEARCH = new Set(["body", "text", "page", "before", "note"]);

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

export function indexListKey(body: Record<string, unknown>): "letters" | "cards" | "notices" | null {
  if (Array.isArray(body.letters)) return "letters";
  if (Array.isArray(body.cards)) return "cards";
  if (Array.isArray(body.notices)) return "notices";
  return null;
}

export function paidCursorForOffset(sorted: Record<string, unknown>[], offset: number): {
  page: number;
  before: string | null;
} {
  const page = Math.floor(offset / EXTRACTED_PAGE_SIZE) + 1;
  if (page <= 1) return { page: 1, before: null };
  const prevLast = sorted[offset - (offset % EXTRACTED_PAGE_SIZE) - 1];
  return { page, before: prevLast ? rowId(prevLast) || null : null };
}

export function annotateIndexRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const sorted = sortNewest(rows);
  return sorted.map((row, offset) => {
    const cursor = paidCursorForOffset(sorted, offset);
    const id = rowId(row);
    return {
      ...row,
      page: cursor.page,
      before: cursor.before,
      ...(id ? { buy: `?id=${id}` } : {}),
    };
  });
}

function haystack(row: Record<string, unknown>): string {
  return Object.entries(row)
    .filter(([key, value]) => !SKIP_SEARCH.has(key) && (typeof value === "string" || typeof value === "number"))
    .map(([, value]) => String(value))
    .join(" ")
    .toLowerCase();
}

export function filterIndexRows(rows: Record<string, unknown>[], q: string): Record<string, unknown>[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => haystack(row).includes(needle));
}

export function applyFreeIndex<T>(manifest: T, q?: string | null): T {
  const obj = asObject(manifest);
  if (!obj) return manifest;
  const key = indexListKey(obj);
  if (!key) return manifest;
  const rows = (obj[key] as unknown[]).filter((row): row is Record<string, unknown> => Boolean(asObject(row)));
  const annotated = annotateIndexRows(rows);
  const query = str(q);
  const hits = query ? filterIndexRows(annotated, query) : annotated;
  const note = str(obj.note);
  return {
    ...obj,
    [key]: hits,
    q: query || null,
    matchedCount: hits.length,
    indexCount: annotated.length,
    note: note.includes("?q=") ? note : `${note}${note ? " " : ""}${FREE_INDEX_NOTE}`,
  } as T;
}
