/**
 * Deterministic paid-body normalize for /ticks, /form-483, /warning-letters.
 * Reads OUR cache only. Does not call official APIs or an LLM.
 * Existing paid keys stay; records[] is added alongside for agent diffs.
 */

export const TICKS_CACHE_SOURCE = "idaho-hay-feeder-ticks cache";
export const FORM_483_TYPE = "form-483";
export const WARNING_LETTER_TYPE = "warning-letter";

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
  const listing = str(sources?.listing);
  return listing || fallback;
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
): T & PaidEnvelope {
  const records = normalizeForm483Records(payload);
  return {
    ...payload,
    asOf: firstPlausibleDate(payload.asOf) ?? latestRecordDate(records),
    fetchedAt: honestFetchedAt(payload.fetchedAt),
    source: listingSource(
      payload,
      "https://www.fda.gov/about-fda/office-inspections-and-investigations/oii-foia-electronic-reading-room",
    ),
    records,
    recordCount: records.length,
  };
}

export function paidWarningLettersBody<
  T extends { letters?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  const records = normalizeWarningLetterRecords(payload);
  return {
    ...payload,
    asOf: firstPlausibleDate(payload.asOf) ?? latestRecordDate(records),
    fetchedAt: honestFetchedAt(payload.fetchedAt),
    source: listingSource(
      payload,
      "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters",
    ),
    records,
    recordCount: records.length,
  };
}

export const RECORD_FIELDS = ["id", "date", "firm", "url", "type"] as const;
