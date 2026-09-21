/**
 * Free GET /sample — static canned paid-JSON keys.
 * Not live cache. Not a wrap of the current table. Not a paid SKU.
 */

export const SAMPLE_PATH = "/sample";

export const PRODUCT_PUBLIC_ID = "us-hay-cattle-grain-ticks";
export const PRODUCT_PUBLIC_NAME = "USDA farm market prices";
export const TICKS_PUBLIC_CACHE_SOURCE = "USDA farm market prices cache";
/**
 * Agent-facing /ticks commodity set. Fat rows stay on the existing $0.05 bag:
 * eggs + poultry on dairy.*, cold storage on dairy.ams_1095.*, cotton on
 * grain.ams_3024.*, grocery/retail feature ads on dairy.ams_* / produce.ams_3324.
 * Name them in free copy. Do not rename product.id.
 */
export const TICKS_COMMODITY_SET =
  "hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail";

/** OpenAPI GET /ticks description. Same bag. No path-split. */
export const TICKS_OPENAPI_DESCRIPTION =
  `Call GET /ticks when you need the current official USDA farm market prices (${TICKS_COMMODITY_SET}). USDA AMS nationwide prints plus a few Idaho/PNW barn examples inside the same table — not the SKU. Not forecasts, not private barn deals, not water. JSON ticks plus stored history points; days between reports are not filled in. Paid JSON keeps the old keys and adds records[] (id, date, firm, url, type) plus asOf for diffs.`;

/** Unpaid 402 resource + accepts[].description. Keep under CDP 500 chars. */
export const TICKS_402_DESCRIPTION =
  `Call GET /ticks when you need the current official USDA farm market prices (${TICKS_COMMODITY_SET}). $0.05 = entire current table.`;

/** llms.txt /ticks bullet (price + bag; door adds rebuy sentence). */
export const TICKS_LLMS_BULLET =
  `GET /ticks — $0.05 — USDA farm market prices (${TICKS_COMMODITY_SET}). Idaho / PNW barns are example geography inside the table, not the SKU. Not forecasts, not private barn deals, not water.`;

/** Catalog / README / SHOP-INDEX /ticks bag cell. */
export const TICKS_BAG =
  `USDA farm market prices (${TICKS_COMMODITY_SET}). Idaho / PNW barns are example geography inside the table, not the SKU. Not forecasts, not private barn deals, not water. Entire current table`;

const CANONICAL = "https://ticks.bnm.farm";

/** Short agent prompt with exact shop URLs. */
export const SAMPLE_HOW_TO_USE = [
  `Search a free index: GET ${CANONICAL}/{door}/manifest.json?q=…`,
  `Then one official text: GET ${CANONICAL}/{door}?id=… ($0.02)`,
  `Or a page of 10: GET ${CANONICAL}/{door} ($0.05; whole current set if n<10)`,
  `Tables: GET ${CANONICAL}/ticks and GET ${CANONICAL}/import-alerts ($0.05 = entire current table)`,
  `Table rebuy: pay GET /ticks once → store ETag from the paid 200 (unpaid 402 has no ETag) → poll with If-None-Match (or ?since=) → HTTP 304 no charge when unchanged → pay again only when the body/ETag changes`,
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
  note: `$0.05 buys the entire current USDA farm market price table (${TICKS_COMMODITY_SET}). Days between reports are not filled in. Idaho / PNW barns are example geography inside the table, not the SKU name. Not water.`,
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
