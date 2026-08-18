/**
 * FDA Import Alert / DWPE ticks — official cms_ia HTML only.
 * Does not invent firms, products, or removals.
 * Does not wrap openFDA drug shortages.
 */
export declare const FDA_CATALOG_URL = "https://www.accessdata.fda.gov/cms_ia/ialist.html";
export declare const FDA_BY_DATE_URL = "https://www.accessdata.fda.gov/cms_ia/iapublishdate.html";
export declare const FDA_ALERT_BASE = "https://www.accessdata.fda.gov/cms_ia/";
export declare const FIRST_SLICE: {
    pageId: string;
    alertNumber: string;
}[];
export declare const IMPORT_ALERTS_PATH = "/import-alerts";
export declare const IMPORT_ALERTS_MANIFEST_PATH = "/import-alerts/manifest.json";
export declare const IMPORT_ALERTS_AMOUNT_ATOMIC = "50000";
export declare const TICKS_AMOUNT_ATOMIC = "20000";
export declare const ROW_FIELDS: readonly ["alertNumber", "type", "name", "list", "firm", "country", "product", "datePublished", "sourceUrl", "asOf"];
export type ImportList = "red" | "green";
export type CatalogAlert = {
    alertNumber: string;
    type: string;
    name: string;
    datePublished: string;
    sourceUrl: string;
    pageId: string | null;
    firstSlice: boolean;
};
export type ImportAlertRow = {
    alertNumber: string;
    type: string;
    name: string;
    list: ImportList;
    firm: string;
    country: string;
    product: string;
    datePublished: string;
    sourceUrl: string;
    asOf: string;
};
export type AlertParseSummary = {
    alertNumber: string;
    pageId: string;
    sourceUrl: string;
    asOf: string | null;
    name: string | null;
    hasRedHeading: boolean;
    hasGreenHeading: boolean;
    firmCount: number;
    tickCount: number;
    emptyReason: string | null;
};
export type ImportAlertsSnapshot = {
    ok: true;
    product: "fda-import-alerts";
    status: "ok" | "empty" | "stale";
    reason: string | null;
    fetchedAt: string;
    asOf: string | null;
    sources: {
        catalog: string;
        byDate: string;
        pattern: string;
    };
    catalog: CatalogAlert[];
    alerts: AlertParseSummary[];
    ticks: ImportAlertRow[];
};
export declare function importAlertsDir(): string;
export declare function snapshotPath(): string;
export declare function decodeEntities(raw: string): string;
export declare function stripTags(raw: string): string;
export declare function parseCatalog(html: string): CatalogAlert[];
export declare function parseFirmSection(html: string, list: ImportList, meta: {
    alertNumber: string;
    type: string;
    name: string;
    sourceUrl: string;
    asOf: string;
}): {
    rows: ImportAlertRow[];
    hasHeading: boolean;
};
export declare function parseAlertPage(html: string, pageId: string, catalogRow?: CatalogAlert): {
    rows: ImportAlertRow[];
    summary: AlertParseSummary;
};
export declare function sampleRowsFrom(rows: ImportAlertRow[], n?: number): Array<ImportAlertRow & {
    sample: true;
}>;
export declare function buildManifest(catalog: CatalogAlert[], samples: Array<ImportAlertRow & {
    sample: true;
}>): Record<string, unknown>;
export declare function fetchFdaHtml(url: string): Promise<string>;
export declare function htmlDir(): string;
export declare function emptySnapshot(reason: string): ImportAlertsSnapshot;
export declare function assembleSnapshot(catalog: CatalogAlert[], parsed: {
    rows: ImportAlertRow[];
    summary: AlertParseSummary;
}[], fetchedAt?: string): ImportAlertsSnapshot;
export declare function readSnapshot(): ImportAlertsSnapshot | null;
export declare function writeSnapshot(snap: ImportAlertsSnapshot): void;
export declare function collectImportAlerts(opts?: {
    pauseMs?: number;
    htmlDir?: string;
}): Promise<ImportAlertsSnapshot>;
export declare function loadImportAlerts(): Promise<ImportAlertsSnapshot>;
export declare function manifestFromSnapshot(snap: ImportAlertsSnapshot | null, catalogHtml?: string): Record<string, unknown>;
export declare function loadManifest(): Promise<Record<string, unknown>>;
//# sourceMappingURL=import-alerts.d.ts.map