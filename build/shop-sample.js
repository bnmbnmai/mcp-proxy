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
 * eggs + poultry on dairy.*, cold storage on dairy.ams_1095.*, cotton on
 * grain.ams_3024.*, ag energy on grain.ams_2805.*, grocery/retail feature ads
 * on dairy.ams_* / produce.ams_3324. Name them in free copy. Do not rename product.id.
 */
export const TICKS_COMMODITY_SET = "hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail, ag energy";
/** OpenAPI GET /ticks description. Same bag. No path-split. */
export const TICKS_OPENAPI_DESCRIPTION = `Call GET /ticks when you need the current official USDA farm market prices (${TICKS_COMMODITY_SET}). USDA AMS nationwide prints plus a few Idaho/PNW barn examples inside the same table — not the SKU. Not forecasts, not private barn deals, not water. JSON ticks plus stored history points; days between reports are not filled in. Paid JSON keeps the old keys and adds records[] (id, date, firm, url, type) plus asOf for diffs.`;
/** Unpaid 402 resource + accepts[].description. Keep under CDP 500 chars. */
export const TICKS_402_DESCRIPTION = `Call GET /ticks when you need the current official USDA farm market prices (${TICKS_COMMODITY_SET}). $0.05 = entire current table.`;
/** llms.txt /ticks bullet (price + bag; door adds rebuy sentence). */
export const TICKS_LLMS_BULLET = `GET /ticks — $0.05 — USDA farm market prices (${TICKS_COMMODITY_SET}). Idaho / PNW barns are example geography inside the table, not the SKU. Not forecasts, not private barn deals, not water.`;
/** Catalog / README / SHOP-INDEX /ticks bag cell. */
export const TICKS_BAG = `USDA farm market prices (${TICKS_COMMODITY_SET}). Idaho / PNW barns are example geography inside the table, not the SKU. Not forecasts, not private barn deals, not water. Entire current table`;
const CANONICAL = "https://ticks.bnm.farm";
/** Short agent prompt with exact shop URLs. */
export const SAMPLE_HOW_TO_USE = [
    `Search a free index: GET ${CANONICAL}/{door}/manifest.json?q=…`,
    `Then one official text: GET ${CANONICAL}/{door}?id=… ($0.02)`,
    `Or a page of 10: GET ${CANONICAL}/{door} ($0.05; whole current set if n<10)`,
    `Tables: GET ${CANONICAL}/ticks and GET ${CANONICAL}/import-alerts ($0.05 = entire current table)`,
    `Table rebuy: pay GET /ticks once → store ETag from the paid 200 (unpaid 402 has no ETag) → poll with If-None-Match (or ?since=) → HTTP 304 no charge when unchanged → pay again only when the body/ETag changes`,
    `Free 3-row /ticks slice (not the whole $0.05 table): GET ${CANONICAL}/sample`,
];
/**
 * Table-SKU keys from live paid /ticks JSON: ticks[], asOf, fetchedAt, source,
 * records[], recordCount, plus markets[]. Three September 2026 rows from the
 * official PDFs. source and sourceUrl stay on every tick. Not the whole table.
 */
export const SAMPLE_TABLE_SKU = {
    example: true,
    comment: "Free 3-row slice of GET /ticks paid JSON from September 2026 official prints. Not the entire current table. $0.05 = entire current table.",
    ok: true,
    product: PRODUCT_PUBLIC_ID,
    status: "ok",
    fetchedAt: "2026-09-25T15:18:53.000Z",
    asOf: "2026-09-22",
    source: TICKS_PUBLIC_CACHE_SOURCE,
    note: `$0.05 buys the entire current USDA farm market price table (${TICKS_COMMODITY_SET}). This free slice is 3 rows. Days between reports are not filled in. Idaho / PNW barns are example geography inside the table, not the SKU name. Not water.`,
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
};
/**
 * Body-SKU ?id= keys verified from paidWarningLettersBody / paidCardBody:
 * top-level id, asOf, source, records[], letters[] with sourceUrl + body
 * (paid JSON uses body, not text). Tiny fake letter. Not a live cache row.
 */
export const SAMPLE_BODY_SKU = {
    example: true,
    comment: "Canned extracted-body ?id= paid JSON keys. Official text is letters[].body (or cards[].body), not a top-level text field. $0.02 = one official text.",
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
};
export function shopPaidJsonSample() {
    return {
        example: true,
        comment: "Free 3-row /ticks slice plus a canned body-SKU example. HTTP 200. Not the entire current table. Not a paid SKU.",
        howToUse: [...SAMPLE_HOW_TO_USE],
        sample: `${CANONICAL}${SAMPLE_PATH}`,
        table: SAMPLE_TABLE_SKU,
        body: SAMPLE_BODY_SKU,
    };
}
//# sourceMappingURL=shop-sample.js.map