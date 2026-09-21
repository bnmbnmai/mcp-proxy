/**
 * Free GET /sample — static canned paid-JSON keys.
 * Not live cache. Not a wrap of the current table. Not a paid SKU.
 */
export declare const SAMPLE_PATH = "/sample";
export declare const PRODUCT_PUBLIC_ID = "us-hay-cattle-grain-ticks";
export declare const PRODUCT_PUBLIC_NAME = "USDA farm market prices";
export declare const TICKS_PUBLIC_CACHE_SOURCE = "USDA farm market prices cache";
/**
 * Agent-facing /ticks commodity set. Fat rows stay on the existing $0.05 bag:
 * eggs + poultry (chicken 3646 / turkey 3647) on dairy.*, cold storage on
 * dairy.ams_1095.*, cotton on grain.ams_3024.*, grocery/retail feature ads on
 * dairy.ams_* / produce.ams_3324.
 * Name them in free copy. Do not rename product.id.
 */
export declare const TICKS_COMMODITY_SET = "hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail";
/** OpenAPI GET /ticks description. Same bag. No path-split. */
export declare const TICKS_OPENAPI_DESCRIPTION = "Call GET /ticks when you need the current official USDA farm market prices (hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail). USDA AMS nationwide prints plus a few Idaho/PNW barn examples inside the same table \u2014 not the SKU. Not forecasts, not private barn deals, not water. JSON ticks plus stored history points; days between reports are not filled in. Paid JSON keeps the old keys and adds records[] (id, date, firm, url, type) plus asOf for diffs.";
/** Unpaid 402 resource + accepts[].description. Keep under CDP 500 chars. */
export declare const TICKS_402_DESCRIPTION = "Call GET /ticks when you need the current official USDA farm market prices (hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail). $0.05 = entire current table.";
/** llms.txt /ticks bullet (price + bag; door adds rebuy sentence). */
export declare const TICKS_LLMS_BULLET = "GET /ticks \u2014 $0.05 \u2014 USDA farm market prices (hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail). Idaho / PNW barns are example geography inside the table, not the SKU. Not forecasts, not private barn deals, not water.";
/** Catalog / README / SHOP-INDEX /ticks bag cell. */
export declare const TICKS_BAG = "USDA farm market prices (hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail). Idaho / PNW barns are example geography inside the table, not the SKU. Not forecasts, not private barn deals, not water. Entire current table";
/** Short agent prompt with exact shop URLs. */
export declare const SAMPLE_HOW_TO_USE: readonly ["Search a free index: GET https://ticks.bnm.farm/{door}/manifest.json?q=…", "Then one official text: GET https://ticks.bnm.farm/{door}?id=… ($0.02)", "Or a page of 10: GET https://ticks.bnm.farm/{door} ($0.05; whole current set if n<10)", "Tables: GET https://ticks.bnm.farm/ticks and GET https://ticks.bnm.farm/import-alerts ($0.05 = entire current table)", "Table rebuy: pay GET /ticks once → store ETag from the paid 200 (unpaid 402 has no ETag) → poll with If-None-Match (or ?since=) → HTTP 304 no charge when unchanged → pay again only when the body/ETag changes", "Paid JSON keys (canned example, not live): GET https://ticks.bnm.farm/sample"];
/**
 * Table-SKU keys verified from live 402 extra + paidTicksBody:
 * ticks[], asOf, fetchedAt, source, records[], recordCount, plus bag note.
 * Values are fake placeholders. Idaho/Twin Falls is not the product name.
 */
export declare const SAMPLE_TABLE_SKU: {
    readonly example: true;
    readonly comment: "Canned /ticks paid JSON keys. Not the current cache. $0.05 = entire current table.";
    readonly ok: true;
    readonly product: "us-hay-cattle-grain-ticks";
    readonly status: "ok";
    readonly fetchedAt: "2026-01-16T00:00:00Z";
    readonly asOf: "2026-01-15";
    readonly source: "USDA farm market prices cache";
    readonly note: "$0.05 buys the entire current USDA farm market price table (hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail). Days between reports are not filled in. Idaho / PNW barns are example geography inside the table, not the SKU name. Not water.";
    readonly recordCount: 1;
    readonly records: readonly [{
        readonly id: "example-hay-tx-alfalfa";
        readonly date: "2026-01-15";
        readonly firm: "Texas Direct Hay (example geography)";
        readonly url: "https://example.invalid/ams/ams_2707.pdf";
        readonly type: "hay";
    }];
    readonly ticks: readonly [{
        readonly id: "example-hay-tx-alfalfa";
        readonly group: "hay";
        readonly commodity: "Alfalfa";
        readonly market: "Texas Direct Hay (example geography)";
        readonly unit: "$/ton";
        readonly asOf: "2026-01-15";
        readonly price: 185;
        readonly source: "USDA AMS Texas Direct Hay Report (example)";
    }];
};
/**
 * Body-SKU ?id= keys verified from paidWarningLettersBody / paidCardBody:
 * top-level id, asOf, source, records[], letters[] with sourceUrl + body
 * (paid JSON uses body, not text). Tiny fake letter. Not a live cache row.
 */
export declare const SAMPLE_BODY_SKU: {
    readonly example: true;
    readonly comment: "Canned extracted-body ?id= paid JSON keys. Official text is letters[].body (or cards[].body), not a top-level text field. $0.02 = one official text.";
    readonly ok: true;
    readonly product: "fda-warning-letter-bodies";
    readonly status: "ok";
    readonly fetchedAt: "2026-01-16T00:00:00Z";
    readonly asOf: "2026-01-01";
    readonly source: "https://example.invalid/official/warning-letters";
    readonly id: "example-firm-000000-01012026";
    readonly paidWindow: 1;
    readonly catalogCount: 1;
    readonly recordCount: 1;
    readonly records: readonly [{
        readonly id: "example-firm-000000-01012026";
        readonly date: "2026-01-01";
        readonly firm: "Example Firm LLC";
        readonly url: "https://example.invalid/official/example-letter.pdf";
        readonly type: "warning-letter";
    }];
    readonly letters: readonly [{
        readonly id: "example-firm-000000-01012026";
        readonly firm: "Example Firm LLC";
        readonly issuedOn: "2026-01-01";
        readonly subject: "Example subject (not a live letter)";
        readonly sourceUrl: "https://example.invalid/official/example-letter.pdf";
        readonly body: "EXAMPLE official text. Not a live letter. Not the current cache.";
    }];
};
export declare function shopPaidJsonSample(): Record<string, unknown>;
/**
 * Preferred live GET /manifest.json samples[]. Same path the ticks door already
 * uses: look these ids up on the live ticks cache and emit the official row.
 * Missing ids are skipped — do not invent a price. Apply this list on apollo
 * `SAMPLE_SERIES_IDS` (ticks-door.ts). Product.id stays us-hay-cattle-grain-ticks.
 */
export declare const TICKS_MANIFEST_SAMPLE_IDS: readonly ["cattle-tf-feeder-steer", "hay.ams_3058.columbia_basin.alfalfa.premium", "ams.if_fv130.onion.yellow_hybrid.us1.sack50.jumbo.columbia_umatilla", "ibc.id.grain.idaho_falls.barley_malting", "ams.2914.pnw.garbanzo", "dairy.ams_2843.national.caged.graded_loose.white.large", "grain.ams_3024.cotton.seven_market.spot_41_4_34", "dairy.ams_3646.whole.delivered.national_composite_whole_bird", "dairy.ams_1095.national.butter.holdings"];
/** Group fallback order copied from the live ticks-door manifest builder. */
export declare const TICKS_MANIFEST_SAMPLE_GROUPS: readonly ["hay", "cattle", "produce", "grain", "dairy", "hogs", "pulses", "wool"];
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
/** Live-shaped sample object. Price comes from the official tick, never a placeholder. */
export declare function sampleFromTickRow(row: Record<string, unknown>, seriesLabel?: string): TicksManifestSampleRow;
/**
 * Same selection path the live door uses for eggs: preferred ids first, then
 * one unused row per group until 5 samples exist. Preferred fat rows (eggs,
 * cotton, chicken 3646, cold 1095) are extra — they do not replace the barn
 * examples and they are not invented when the cache has no matching tick.
 */
export declare function selectTicksManifestSamples(ticks: readonly Record<string, unknown>[], seriesLabelById?: ReadonlyMap<string, string>): TicksManifestSampleRow[];
//# sourceMappingURL=shop-sample.d.ts.map