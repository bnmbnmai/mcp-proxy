/**
 * Deterministic paid-body normalize for live official doors.
 * Reads OUR cache only. Does not call official APIs or an LLM.
 * Existing paid keys stay; records[] is added alongside for agent diffs.
 * Shape is always {id, date, firm, url, type} — same as the first-pass /ticks /form-483 /warning-letters product.
 */

export const TICKS_CACHE_SOURCE = "idaho-hay-feeder-ticks cache";
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
export const CFPB_ORDER_TYPE = "cfpb-order";
export const OFAC_ORDER_TYPE = "ofac-order";

export const CMA_CA98_SOURCE =
  "https://www.gov.uk/cma-cases/financial-services-sector-suspected-anti-competitive-practices";
export const ICO_MPN_SOURCE = "https://ico.org.uk/action-weve-taken/enforcement/?type=monetary-penalties";
export const FTC_WL_SOURCE = "https://www.ftc.gov/legal-library/browse/warning-letters";
export const UNTITLED_LETTER_SOURCE =
  "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/issuance-untitled-letters";
export const AIR_LETTER_SOURCE = "https://www.aphis.usda.gov/confirmation-letters";
export const IMPORT_ALERT_SOURCE = "https://www.accessdata.fda.gov/cms_ia/ialist.html";
export const CFTC_ORDER_SOURCE = "https://www.cftc.gov/LawRegulation/Enforcement/EnforcementActions/index.htm";
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
export const CFPB_ORDER_SOURCE = "https://www.consumerfinance.gov/enforcement/actions/";
export const OFAC_ORDER_SOURCE = "https://ofac.treasury.gov/civil-penalties-and-enforcement-information";

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
 * First-slice card doors share id / date / institution|firm / sourceUrl / body.
 * Empty-body cards stay in the official cache and are not sold as records[].
 */
export function normalizeCardRecords(
  payload: { cards?: unknown[] },
  type: string,
): PaidRecord[] {
  const out: PaidRecord[] = [];
  for (const row of asList(payload.cards)) {
    if (!str(row.body)) continue;
    const id = str(row.id) || str(row.docket) || str(row.mediaId);
    if (!id) continue;
    out.push({
      id,
      date: firstPlausibleDate(row.date, row.issuedOn, row.publishedOn),
      firm:
        str(row.firm) ||
        str(row.institution) ||
        str(row.holder) ||
        str(row.substance) ||
        str(row.name) ||
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
): T & PaidEnvelope {
  const records = normalizeCardRecords(payload, type);
  return {
    ...payload,
    asOf: firstPlausibleDate(payload.asOf) ?? latestRecordDate(records),
    fetchedAt: honestFetchedAt(payload.fetchedAt),
    source: listingSource(payload, fallbackSource),
    records,
    recordCount: records.length,
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

export function paidCmaCa98Body<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, CMA_CA98_TYPE, CMA_CA98_SOURCE);
}

export function paidIcoMpnBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, ICO_MPN_TYPE, ICO_MPN_SOURCE);
}

export function paidFtcWlBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, FTC_WL_TYPE, FTC_WL_SOURCE);
}

export function paidUntitledLettersBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, UNTITLED_LETTER_TYPE, UNTITLED_LETTER_SOURCE);
}

export function paidAirLettersBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, AIR_LETTER_TYPE, AIR_LETTER_SOURCE);
}

export function paidCftcOrdersBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, CFTC_ORDER_TYPE, CFTC_ORDER_SOURCE);
}

export function paidFifraOrdersBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, FIFRA_ORDER_TYPE, FIFRA_ORDER_SOURCE);
}

export function paidDenovoOrdersBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, DENOVO_ORDER_TYPE, DENOVO_ORDER_SOURCE);
}

export function paidTtbOicBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, TTB_OIC_TYPE, TTB_OIC_SOURCE);
}

export function paidSuperfundRodsBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, SUPERFUND_ROD_TYPE, SUPERFUND_ROD_SOURCE);
}

export function paidPcacBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, PCAC_TYPE, PCAC_SOURCE);
}

export function paidAwaBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, AWA_TYPE, AWA_SOURCE);
}

export function paidSwissparBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, SWISSPAR_TYPE, SWISSPAR_SOURCE);
}

export function paidCfpbOrdersBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, CFPB_ORDER_TYPE, CFPB_ORDER_SOURCE);
}

export function paidOfacOrdersBody<
  T extends { cards?: unknown[]; fetchedAt?: unknown; asOf?: unknown; sources?: unknown },
>(payload: T): T & PaidEnvelope {
  return paidCardBody(payload, OFAC_ORDER_TYPE, OFAC_ORDER_SOURCE);
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
