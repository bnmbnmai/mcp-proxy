/**
 * Free GET /sample — a 3-row slice of paid /ticks JSON keys from September 2026
 * official prints. Not the entire current table. Not a paid SKU. Not a new path.
 */
export declare const SAMPLE_PATH = "/sample";
export declare const PRODUCT_PUBLIC_ID = "us-hay-cattle-grain-ticks";
export declare const PRODUCT_PUBLIC_NAME = "USDA farm market prices";
export declare const TICKS_PUBLIC_CACHE_SOURCE = "USDA farm market prices cache";
/**
 * Agent-facing /ticks commodity set. Fat rows stay on the existing $0.05 bag:
 * eggs + poultry on dairy.*, cold storage on dairy.ams_1095.*, cotton on
 * grain.ams_3024.*, grocery/retail feature ads on dairy.ams_* / produce.ams_3324.
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
export declare const SAMPLE_HOW_TO_USE: readonly ["Search a free index: GET https://ticks.bnm.farm/{door}/manifest.json?q=…", "Then one official text: GET https://ticks.bnm.farm/{door}?id=… ($0.02)", "Or a page of 10: GET https://ticks.bnm.farm/{door} ($0.05; whole current set if n<10)", "Tables: GET https://ticks.bnm.farm/ticks and GET https://ticks.bnm.farm/import-alerts ($0.05 = entire current table)", "Table rebuy: pay GET /ticks once → store ETag from the paid 200 (unpaid 402 has no ETag) → poll with If-None-Match (or ?since=) → HTTP 304 no charge when unchanged → pay again only when the body/ETag changes", "Free 3-row /ticks slice (not the whole $0.05 table): GET https://ticks.bnm.farm/sample"];
/**
 * Table-SKU keys from live paid /ticks JSON: ticks[], asOf, fetchedAt, source,
 * records[], recordCount, plus markets[]. Three September 2026 rows from the
 * official PDFs. source and sourceUrl stay on every tick. Not the whole table.
 */
export declare const SAMPLE_TABLE_SKU: {
    readonly example: true;
    readonly comment: "Free 3-row slice of GET /ticks paid JSON from September 2026 official prints. Not the entire current table. $0.05 = entire current table.";
    readonly ok: true;
    readonly product: "us-hay-cattle-grain-ticks";
    readonly status: "ok";
    readonly fetchedAt: "2026-09-25T15:18:53.000Z";
    readonly asOf: "2026-09-22";
    readonly source: "USDA farm market prices cache";
    readonly note: "$0.05 buys the entire current USDA farm market price table (hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail). This free slice is 3 rows. Days between reports are not filled in. Idaho / PNW barns are example geography inside the table, not the SKU name. Not water.";
    readonly recordCount: 3;
    readonly markets: readonly [{
        readonly id: "ams_2770";
        readonly name: "Montana Direct Feeder Cattle";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_2770.pdf";
    }, {
        readonly id: "ams_1281";
        readonly name: "OKC West Livestock Auction (El Reno)";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1281.pdf";
    }, {
        readonly id: "ams_1280";
        readonly name: "Oklahoma National Stockyards Feeder Cattle";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1280.pdf";
    }, {
        readonly id: "ams_1245";
        readonly name: "Joplin Regional Stockyards Feeder Cattle";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1245.pdf";
    }, {
        readonly id: "ams_1797";
        readonly name: "Joplin Regional Stockyards Slaughter/Replacement Cattle";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1797.pdf";
    }, {
        readonly id: "ams_2713";
        readonly name: "Superior Livestock Video Auction";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_2713.pdf";
    }, {
        readonly id: "ams_1889";
        readonly name: "Winter Livestock Cattle Auction (Dodge City)";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1889.pdf";
    }, {
        readonly id: "ams_1892";
        readonly name: "Farmers and Ranchers Livestock Commission Cattle Auction (Salina)";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1892.pdf";
    }, {
        readonly id: "private_producers_jerome";
        readonly name: "Producers Livestock Jerome";
        readonly sourceUrl: "https://www.producerslivestock.com/market-reports/";
    }, {
        readonly id: "private_producers_vale";
        readonly name: "Producers Livestock Vale";
        readonly sourceUrl: "https://www.producerslivestock.com/market-reports/";
    }, {
        readonly id: "private_treasure_valley_caldwell";
        readonly name: "Treasure Valley Livestock Auction, Caldwell ID";
        readonly sourceUrl: "https://www.treasurevalleylivestock.com/";
    }, {
        readonly id: "ams_2056";
        readonly name: "Arkansas Weekly Livestock Auction Summary";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_2056.pdf";
    }, {
        readonly id: "ams_3510";
        readonly name: "National Animal By-Product Feedstuff";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_3510.pdf";
    }, {
        readonly id: "ams_3512";
        readonly name: "National Mill-Feeds and Miscellaneous Feedstuff";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_3512.pdf";
    }];
    readonly records: readonly [{
        readonly id: "cattle.ams_1281.okc_west_el_reno.feeder-steer.ml1.826lb";
        readonly date: "2026-09-22";
        readonly firm: "OKC West Livestock Auction (El Reno)";
        readonly url: "https://www.ams.usda.gov/mnreports/ams_1281.pdf";
        readonly type: "cattle";
    }, {
        readonly id: "cattle.ams_1245.joplin_feeder.feeder-steer.ml1.1060lb";
        readonly date: "2026-09-21";
        readonly firm: "Joplin Regional Stockyards Feeder Cattle";
        readonly url: "https://www.ams.usda.gov/mnreports/ams_1245.pdf";
        readonly type: "cattle";
    }, {
        readonly id: "cattle.ams_2713.superior_video.north_central.feeder-steer.ml1.current.450lb.unweaned";
        readonly date: "2026-09-17";
        readonly firm: "Superior Livestock Video Auction — North Central";
        readonly url: "https://www.ams.usda.gov/mnreports/ams_2713.pdf";
        readonly type: "cattle";
    }];
    readonly ticks: readonly [{
        readonly id: "cattle.ams_1281.okc_west_el_reno.feeder-steer.ml1.826lb";
        readonly group: "cattle";
        readonly commodity: "Steers";
        readonly market: "OKC West Livestock Auction (El Reno)";
        readonly classGrade: "USDA Medium and Large 1, 826 lb, 535 head";
        readonly unit: "$/cwt";
        readonly asOf: "2026-09-22";
        readonly price: 330.19;
        readonly lo: 321;
        readonly hi: 336;
        readonly source: "USDA AMS OKC West Livestock Auction (El Reno) Report (AMS_1281)";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1281.pdf";
    }, {
        readonly id: "cattle.ams_1245.joplin_feeder.feeder-steer.ml1.1060lb";
        readonly group: "cattle";
        readonly commodity: "Steers";
        readonly market: "Joplin Regional Stockyards Feeder Cattle";
        readonly classGrade: "USDA Medium and Large 1, 1060 lb, 152 head";
        readonly unit: "$/cwt";
        readonly asOf: "2026-09-21";
        readonly price: 291.42;
        readonly lo: 289;
        readonly hi: 292;
        readonly source: "USDA AMS Joplin Regional Stockyards Feeder Cattle Report (AMS_1245)";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_1245.pdf";
    }, {
        readonly id: "cattle.ams_2713.superior_video.north_central.feeder-steer.ml1.current.450lb.unweaned";
        readonly group: "cattle";
        readonly commodity: "Steers";
        readonly market: "Superior Livestock Video Auction — North Central";
        readonly classGrade: "USDA Medium and Large 1, 450 lb, 58 head, Current, Unweaned";
        readonly unit: "$/cwt";
        readonly asOf: "2026-09-17";
        readonly price: 489;
        readonly lo: 489;
        readonly hi: 489;
        readonly source: "USDA AMS Superior Livestock Video Auction Report (AMS_2713)";
        readonly sourceUrl: "https://www.ams.usda.gov/mnreports/ams_2713.pdf";
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
//# sourceMappingURL=shop-sample.d.ts.map