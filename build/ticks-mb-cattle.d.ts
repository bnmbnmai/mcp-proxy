#!/usr/bin/env node
export declare const PRODUCT_ID = "us-hay-cattle-grain-ticks";
export declare const TICKS_PATH = "/ticks";
export declare const TICKS_PRICE = "0.05";
export declare const SOURCE_PAGE = "https://www.gov.mb.ca/agriculture/markets-and-statistics/livestock-statistics/livestock-market-prices-current.html";
export declare const PDF_BASE = "https://www.gov.mb.ca/agriculture/markets-and-statistics/livestock-statistics/pubs";
export declare const MONTHLY_HISTORIC_XLSX = "https://www.gov.mb.ca/agriculture/markets-and-statistics/livestock-statistics/pubs/livestock-monthly-prices-historic.xlsx";
export declare const DASHBOARDS_JS = "https://www.gov.mb.ca/agriculture/pubs/js2/dashboards.js";
export declare const LICENSE_NAME = "OpenMB Information and Data Use Licence";
export declare const LICENSE_URL = "https://www.manitoba.ca/asset_library/en/legal/OpenMB-Information-Data-Use-Licence.pdf";
export declare const OPENMB_ATTRIBUTION = "Contains information from the Government of Manitoba, licensed under the OpenMB Information and Data Use License (Manitoba.ca/OpenMB)";
export declare const MB_SOURCE_NAME = "Manitoba Agriculture weekly Cattle, Sheep and Goat Prices";
export declare const MB_MARTS: readonly ["Ashern", "Gladstone", "Grunthal", "Killarney", "Ste Rose", "Virden", "Winnipeg"];
export type MbMart = (typeof MB_MARTS)[number];
export declare const SKIPPED_MB: readonly [{
    readonly id: "monthly-historic-xlsx";
    readonly why: "livestock-monthly-prices-historic.xlsx is aggregate Canfax/category series with no auction-mart names — not the weekly per-mart PDF body";
}, {
    readonly id: "powerbi-charts";
    readonly why: "Cattle dashboard (dashboards.js → app.powerbi.com) is charts only. Kill only if a free JSON/CSV/XLSX of the weekly multi-mart body appears";
}, {
    readonly id: "sheep-monthly-pdf";
    readonly why: "sheep-lamb-mb-markets-prices monthly PDF is not the weekly multi-mart cattle table";
}, {
    readonly id: "new-path";
    readonly why: "No /mb-cattle-prices door. Rows stay on GET /ticks $0.05 tableWhole";
}, {
    readonly id: "logos";
    readonly why: "OpenMB: commercial use with attribution; no endorsement; no Manitoba logos";
}];
export type MbGroup = "cattle" | "sheep" | "goats";
/** Same keys as the /ticks table row (AmsTick), unit stays C$/cwt. */
export type MbTick = {
    id: string;
    group: MbGroup;
    commodity: string;
    label: string;
    market: string;
    classGrade: string;
    unit: "C$/cwt";
    price: number;
    lo: number;
    hi: number;
    asOf: string;
    source: string;
    sourceUrl: string;
    reportDate: string;
    series: string;
};
export type MbFailed = {
    id: string;
    source: string;
    sourceUrl: string;
    reason: string;
};
export type MbSnapshot = {
    ok: true;
    product: typeof PRODUCT_ID;
    fetchedAt: string;
    asOf: string | null;
    tickCount: number;
    rows: MbTick[];
    failed: MbFailed[];
    sources: string[];
    attribution: typeof OPENMB_ATTRIBUTION;
    license: {
        name: typeof LICENSE_NAME;
        url: typeof LICENSE_URL;
    };
    killed: string | null;
};
export declare function mbCattleDir(): string;
export declare function isMbCattleTickId(id: string): boolean;
/** Full AMS walk includes Manitoba. A slug filter collects it only when asked. */
export declare function shouldCollectMbCattle(): boolean;
export declare function parseIssueDate(text: string): string | null;
export declare function weeklyPdfUrl(isoDate: string): string;
export declare function isMonthlyHistoricUrl(url: string): boolean;
/** Data links on the listing page that might be a free same-body dump. Monthly XLSX is not one. */
export declare function candidateDumpUrls(html: string): string[];
export declare function listWeeklyPdfs(html: string): {
    date: string;
    url: string;
}[];
/**
 * True when text is the weekly multi-mart auction body (several mart names
 * plus C$/cwt-style prices). A Canfax/category sheet with no mart names is false.
 * PowerBI embed HTML without those prints is false.
 */
export declare function textDumpsWeeklyMartBody(text: string): boolean;
/** Current-week per-mart prints. Provincial averages and previous-sale columns stay off. */
export declare function parseMbWeeklyPrices(text: string, sourceUrl: string): MbTick[];
export declare function snapshotFromText(text: string, sourceUrl: string, fetchedAt: string): MbSnapshot;
export declare function pdftotext(bytes: Buffer): string;
/** Kill reason when a free file already dumps the weekly multi-mart body. Null means PDF collect is still the body. */
export declare function weeklyMartDumpReason(html: string): Promise<string | null>;
/** Drop Manitoba rows only when a free same-body dump killed the collect. A fetch miss keeps the previous rows. */
export declare function foldMbIntoRows<T extends {
    id: string;
}>(rows: T[], mb: Pick<MbSnapshot, "killed" | "rows"> | null): T[];
export declare function collectMbCattle(): Promise<MbSnapshot>;
export declare function writeMbSnapshot(snap: MbSnapshot, dir?: string): string;
//# sourceMappingURL=ticks-mb-cattle.d.ts.map