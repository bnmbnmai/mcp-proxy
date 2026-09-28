/**
 * Free GET /sample — a 3-row slice of paid /ticks JSON keys from September 2026
 * official prints. Not the entire current table. Not a paid SKU. Not a new path.
 */

export const SAMPLE_PATH = "/sample";

export const PRODUCT_PUBLIC_ID = "us-hay-cattle-grain-ticks";
export const PRODUCT_PUBLIC_NAME = "USDA farm market prices";
export const TICKS_PUBLIC_CACHE_SOURCE = "USDA farm market prices cache";
/**
 * Agent-facing /ticks commodity set. Fat rows stay on the existing $0.05 bag:
 * eggs + poultry (chicken 3646 / turkey 3647) on dairy.*, cold storage on
 * dairy.ams_1095.*, cotton on grain.ams_3024.*, grocery/retail feature ads on
 * dairy.ams_* / produce.ams_3324, grass-fed DTC on dairy.ams_2811.grassfed.*.
 * Name them in free copy. Do not rename product.id.
 */
export const TICKS_COMMODITY_SET =
  "hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail, grass-fed DTC";

/**
 * Unpaid GET /ticks accepts[].description. CDP limit is 500 characters.
 * One SKU: nationwide USDA AMS. Idaho/PNW barns stay example rows.
 */
export const TICKS_402_DESCRIPTION =
  `Call GET /ticks when you need the current official USDA farm market prices (${TICKS_COMMODITY_SET}). $0.05 = entire current table. Nationwide USDA AMS; Idaho/PNW barns are example rows in that one table. Sample https://ticks.bnm.farm/sample. Rebuy: paid 200 ETag; If-None-Match 304 is no charge.`;

const CANONICAL = "https://ticks.bnm.farm";

/** Short agent prompt with exact shop URLs. */
export const SAMPLE_HOW_TO_USE = [
  `Search a free index: GET ${CANONICAL}/{door}/manifest.json?q=…`,
  `Then one official text: GET ${CANONICAL}/{door}?id=… ($0.02)`,
  `Or a page of 10: GET ${CANONICAL}/{door} ($0.05; whole current set if n<10)`,
  `Tables: GET ${CANONICAL}/ticks and GET ${CANONICAL}/import-alerts ($0.05 = entire current table)`,
  `Table rebuy: pay GET /ticks once → store ETag from the paid 200 (unpaid 402 has no ETag) → poll with If-None-Match (or ?since=) → HTTP 304 no charge when unchanged → pay again only when the body/ETag changes`,
  `Free 3-row /ticks slice (not the whole $0.05 table): GET ${CANONICAL}/sample`,
] as const;

/**
 * Table-SKU keys from live paid /ticks JSON: ticks[], asOf, fetchedAt, source,
 * records[], recordCount, plus markets[]. Three September 2026 rows from the
 * official PDFs. source and sourceUrl stay on every tick. Not the whole table.
 */
export const SAMPLE_TABLE_SKU = {
  example: true,
  comment:
    "Free 3-row slice of GET /ticks paid JSON from September 2026 official prints. $0.05 = entire current table.",
  ok: true,
  product: PRODUCT_PUBLIC_ID,
  status: "ok",
  fetchedAt: "2026-09-25T15:18:53.000Z",
  asOf: "2026-09-22",
  source: TICKS_PUBLIC_CACHE_SOURCE,
  note: `$0.05 buys the entire current nationwide USDA AMS table (${TICKS_COMMODITY_SET}), one SKU. This free slice is 3 September 2026 rows. Idaho/PNW barns are example rows inside the table.`,
  recordCount: 3,
  markets: [
    { id: "ams_2770", name: "Montana Direct Feeder Cattle", sourceUrl: "https://www.ams.usda.gov/mnreports/ams_2770.pdf" },
    { id: "ams_1281", name: "OKC West Livestock Auction (El Reno)", sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1281.pdf" },
    { id: "ams_1280", name: "Oklahoma National Stockyards Feeder Cattle", sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1280.pdf" },
    { id: "ams_1245", name: "Joplin Regional Stockyards Feeder Cattle", sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1245.pdf" },
    { id: "ams_1797", name: "Joplin Regional Stockyards Slaughter/Replacement Cattle", sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1797.pdf" },
    { id: "ams_2713", name: "Superior Livestock Video Auction", sourceUrl: "https://www.ams.usda.gov/mnreports/ams_2713.pdf" },
    { id: "ams_1889", name: "Winter Livestock Cattle Auction (Dodge City)", sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1889.pdf" },
    { id: "ams_1892", name: "Farmers and Ranchers Livestock Commission Cattle Auction (Salina)", sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1892.pdf" },
    { id: "private_producers_jerome", name: "Producers Livestock Jerome", sourceUrl: "https://www.producerslivestock.com/market-reports/" },
    { id: "private_producers_vale", name: "Producers Livestock Vale", sourceUrl: "https://www.producerslivestock.com/market-reports/" },
  ],
  records: [
    {
      id: "cattle.ams_1281.okc_west_el_reno.feeder-steer.ml1.826lb",
      date: "2026-09-22",
      firm: "OKC West Livestock Auction (El Reno)",
      url: "https://www.ams.usda.gov/mnreports/ams_1281.pdf",
      type: "cattle",
    },
    {
      id: "cattle.ams_1245.joplin_feeder.feeder-steer.ml1.1060lb",
      date: "2026-09-21",
      firm: "Joplin Regional Stockyards Feeder Cattle",
      url: "https://www.ams.usda.gov/mnreports/ams_1245.pdf",
      type: "cattle",
    },
    {
      id: "cattle.ams_2713.superior_video.north_central.feeder-steer.ml1.current.450lb.unweaned",
      date: "2026-09-17",
      firm: "Superior Livestock Video Auction — North Central",
      url: "https://www.ams.usda.gov/mnreports/ams_2713.pdf",
      type: "cattle",
    },
  ],
  ticks: [
    {
      id: "cattle.ams_1281.okc_west_el_reno.feeder-steer.ml1.826lb",
      group: "cattle",
      commodity: "Steers",
      market: "OKC West Livestock Auction (El Reno)",
      classGrade: "USDA Medium and Large 1, 826 lb, 535 head",
      unit: "$/cwt",
      asOf: "2026-09-22",
      price: 330.19,
      lo: 321,
      hi: 336,
      source: "USDA AMS OKC West Livestock Auction (El Reno) Report (AMS_1281)",
      sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1281.pdf",
    },
    {
      id: "cattle.ams_1245.joplin_feeder.feeder-steer.ml1.1060lb",
      group: "cattle",
      commodity: "Steers",
      market: "Joplin Regional Stockyards Feeder Cattle",
      classGrade: "USDA Medium and Large 1, 1060 lb, 152 head",
      unit: "$/cwt",
      asOf: "2026-09-21",
      price: 291.42,
      lo: 289,
      hi: 292,
      source: "USDA AMS Joplin Regional Stockyards Feeder Cattle Report (AMS_1245)",
      sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1245.pdf",
    },
    {
      id: "cattle.ams_2713.superior_video.north_central.feeder-steer.ml1.current.450lb.unweaned",
      group: "cattle",
      commodity: "Steers",
      market: "Superior Livestock Video Auction — North Central",
      classGrade: "USDA Medium and Large 1, 450 lb, 58 head, Current, Unweaned",
      unit: "$/cwt",
      asOf: "2026-09-17",
      price: 489,
      lo: 489,
      hi: 489,
      source: "USDA AMS Superior Livestock Video Auction Report (AMS_2713)",
      sourceUrl: "https://www.ams.usda.gov/mnreports/ams_2713.pdf",
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
      "Free 3-row /ticks slice plus a canned body-SKU example. HTTP 200. Not the entire current table. Not a paid SKU.",
    howToUse: [...SAMPLE_HOW_TO_USE],
    sample: `${CANONICAL}${SAMPLE_PATH}`,
    table: SAMPLE_TABLE_SKU,
    body: SAMPLE_BODY_SKU,
  };
}

/**
 * Preferred live GET /manifest.json samples[]. Same path the ticks door already
 * uses: look these ids up on the live ticks cache and emit the official row.
 * Missing ids are skipped — do not invent a price. Wired to SAMPLE_SERIES_IDS
 * in ticks-door.ts. Product.id stays us-hay-cattle-grain-ticks.
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
  "dairy.ams_2811.grassfed.retail.steaks.filet_mignon",
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
 * cotton, chicken 3646, cold 1095, grass-fed DTC 2811) are extra — they do
 * not replace the barn examples and they are not invented when the cache has
 * no matching tick.
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
