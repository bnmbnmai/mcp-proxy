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
 * eggs + poultry (chicken 3646 / turkey 3647) on dairy.*, cold storage on
 * dairy.ams_1095.*, cotton on grain.ams_3024.*, grocery/retail feature ads on
 * dairy.ams_* / produce.ams_3324.
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

/**
 * Preferred live GET /manifest.json samples[]. Same path the ticks door already
 * uses: look these ids up on the live ticks cache and emit the official row.
 * Missing ids are skipped — do not invent a price. Apply this list on apollo
 * `SAMPLE_SERIES_IDS` (ticks-door.ts). Product.id stays us-hay-cattle-grain-ticks.
 */
export const TICKS_MANIFEST_SAMPLE_IDS = [
  "cattle-tf-feeder-steer",
  "hay.ams_3058.columbia_basin.alfalfa.premium",
  "ams.if_fv130.onion.yellow_hybrid.us1.sack50.jumbo.columbia_umatilla",
  "ibc.id.grain.idaho_falls.barley_malting",
  "ams.2914.pnw.garbanzo",
  "dairy.ams_2843.national.caged.graded_loose.white.large",
  "grain.ams_3024.cotton.seven_market.spot_41_4_34",
  "dairy.ams_3646.whole.delivered.national_composite_whole_bird",
  "dairy.ams_1095.national.butter.holdings",
] as const;

/** Group fallback order copied from the live ticks-door manifest builder. */
export const TICKS_MANIFEST_SAMPLE_GROUPS = [
  "hay",
  "cattle",
  "produce",
  "grain",
  "dairy",
  "hogs",
  "pulses",
  "wool",
] as const;

export type TicksManifestSampleRow = {
  sample: true;
  id: string;
  name: string;
  group: string;
  commodity: string | null;
  market: string | null;
  unit: string | null;
  asOf: string | null;
  price: number | null;
  source: string | null;
};

function sampleFieldString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function sampleFieldNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Live-shaped sample object. Price comes from the official tick, never a placeholder. */
export function sampleFromTickRow(row: Record<string, unknown>, seriesLabel = ""): TicksManifestSampleRow {
  return {
    sample: true,
    id: sampleFieldString(row.id),
    name: seriesLabel || sampleFieldString(row.label) || sampleFieldString(row.commodity),
    group: sampleFieldString(row.group),
    commodity: sampleFieldString(row.commodity) || null,
    market: sampleFieldString(row.market) || null,
    unit: sampleFieldString(row.unit) || null,
    asOf: sampleFieldString(row.asOf) || null,
    price: sampleFieldNumber(row.price),
    source: sampleFieldString(row.source) || null,
  };
}

/**
 * Same selection path the live door uses for eggs: preferred ids first, then
 * one unused row per group until 5 samples exist. Preferred fat rows (eggs,
 * cotton, chicken 3646, cold 1095) are extra — they do not replace the barn
 * examples and they are not invented when the cache has no matching tick.
 */
export function selectTicksManifestSamples(
  ticks: readonly Record<string, unknown>[],
  seriesLabelById: ReadonlyMap<string, string> = new Map(),
): TicksManifestSampleRow[] {
  const samples: TicksManifestSampleRow[] = [];
  const used = new Set<string>();
  for (const id of TICKS_MANIFEST_SAMPLE_IDS) {
    const row = ticks.find((t) => sampleFieldString(t.id) === id);
    if (!row) continue;
    samples.push(sampleFromTickRow(row, seriesLabelById.get(id) ?? ""));
    used.add(id);
  }
  for (const group of TICKS_MANIFEST_SAMPLE_GROUPS) {
    if (samples.length >= 5) break;
    const row = ticks.find((t) => sampleFieldString(t.group) === group && !used.has(sampleFieldString(t.id)));
    if (!row) continue;
    const id = sampleFieldString(row.id);
    samples.push(sampleFromTickRow(row, seriesLabelById.get(id) ?? ""));
    used.add(id);
  }
  return samples;
}
