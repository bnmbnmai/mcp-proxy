/**
 * Free GET /sample — static canned paid-JSON keys.
 * Not live cache. Not a wrap of the current table. Not a paid SKU.
 */

export const SAMPLE_PATH = "/sample";

export const PRODUCT_PUBLIC_ID = "us-hay-cattle-grain-ticks";
export const PRODUCT_PUBLIC_NAME = "USDA farm market prices";
export const TICKS_PUBLIC_CACHE_SOURCE = "USDA farm market prices cache";

const CANONICAL = "https://ticks.bnm.farm";

/** 3–6 line agent prompt with exact shop URLs. */
export const SAMPLE_HOW_TO_USE = [
  `Search a free index: GET ${CANONICAL}/{door}/manifest.json?q=…`,
  `Then one official text: GET ${CANONICAL}/{door}?id=… ($0.02)`,
  `Or a page of 10: GET ${CANONICAL}/{door} ($0.05; whole current set if n<10)`,
  `Tables: GET ${CANONICAL}/ticks and GET ${CANONICAL}/import-alerts ($0.05 = entire current table)`,
  `Paid JSON keys (canned example, not live): GET ${CANONICAL}/sample`,
] as const;

/**
 * Table-SKU keys verified from live 402 extra + paidTicksBody:
 * ticks[], asOf, fetchedAt, source, records[], recordCount, plus bag note.
 * Values are fake placeholders. Idaho/Twin Falls is not the product name.
 */
export const SAMPLE_TABLE_SKU = {
  example: true,
  comment: "Canned /ticks paid JSON keys. Not the current cache. $0.05 = entire current table.",
  ok: true,
  product: PRODUCT_PUBLIC_ID,
  status: "ok",
  fetchedAt: "2026-01-16T00:00:00Z",
  asOf: "2026-01-15",
  source: TICKS_PUBLIC_CACHE_SOURCE,
  note: "$0.05 buys the entire current USDA farm market price table (hay, cattle, grain, dairy, hogs, produce). Days between reports are not filled in. Idaho / PNW barns are example geography inside the table, not the SKU name. Not water.",
  recordCount: 1,
  records: [
    {
      id: "example-hay-tx-alfalfa",
      date: "2026-01-15",
      firm: "Texas Direct Hay (example geography)",
      url: "https://example.invalid/ams/ams_2707.pdf",
      type: "hay",
    },
  ],
  ticks: [
    {
      id: "example-hay-tx-alfalfa",
      group: "hay",
      commodity: "Alfalfa",
      market: "Texas Direct Hay (example geography)",
      unit: "$/ton",
      asOf: "2026-01-15",
      price: 185,
      source: "USDA AMS Texas Direct Hay Report (example)",
    },
  ],
} as const;

/**
 * Body-SKU ?id= keys verified from paidWarningLettersBody / paidCardBody:
 * top-level id, asOf, source, records[], letters[] with sourceUrl + body
 * (paid JSON uses body, not text). Tiny fake letter. Not a live cache row.
 */
export const SAMPLE_BODY_SKU = {
  example: true,
  comment:
    "Canned extracted-body ?id= paid JSON keys. Official text is letters[].body (or cards[].body), not a top-level text field. $0.02 = one official text.",
  ok: true,
  product: "fda-warning-letter-bodies",
  status: "ok",
  fetchedAt: "2026-01-16T00:00:00Z",
  asOf: "2026-01-01",
  source: "https://example.invalid/official/warning-letters",
  id: "example-firm-000000-01012026",
  paidWindow: 1,
  catalogCount: 1,
  recordCount: 1,
  records: [
    {
      id: "example-firm-000000-01012026",
      date: "2026-01-01",
      firm: "Example Firm LLC",
      url: "https://example.invalid/official/example-letter.pdf",
      type: "warning-letter",
    },
  ],
  letters: [
    {
      id: "example-firm-000000-01012026",
      firm: "Example Firm LLC",
      issuedOn: "2026-01-01",
      subject: "Example subject (not a live letter)",
      sourceUrl: "https://example.invalid/official/example-letter.pdf",
      body: "EXAMPLE official text. Not a live letter. Not the current cache.",
    },
  ],
} as const;

export function shopPaidJsonSample(): Record<string, unknown> {
  return {
    example: true,
    comment:
      "Static canned examples of paid JSON keys. HTTP 200. Not live cache data. Not a wrap of the current table. Not a paid SKU.",
    howToUse: [...SAMPLE_HOW_TO_USE],
    sample: `${CANONICAL}${SAMPLE_PATH}`,
    table: SAMPLE_TABLE_SKU,
    body: SAMPLE_BODY_SKU,
  };
}
