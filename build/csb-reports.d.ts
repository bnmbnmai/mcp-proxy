#!/usr/bin/env node
/**
 * US Chemical Safety Board final investigation report PDFs (ugly PDF cache).
 * Official CSB-authored Final Investigation Report PDFs on csb.gov/assets and
 * /file.aspx. 17 U.S.C. § 105. Cache + resale OK. Does not wrap investigation
 * HTML chrome. Paid GET is the official PDF. Free manifest is titles/links/counts.
 * Skip Status Change Summary PDFs, current-investigation teasers, update-only packs.
 * Habit: CSB posts new Final Report Released On dates.
 */
export declare const CSB_REPORTS_PATH = "/csb-reports";
export declare const CSB_REPORTS_MANIFEST_PATH = "/csb-reports/manifest.json";
export declare const CSB_REPORTS_AMOUNT_ATOMIC = "50000";
export declare const PRODUCT_ID = "csb-final-investigation-report-pdfs";
export declare const PRODUCT_NAME = "US CSB final investigation report PDFs";
export declare const INDEX_URL = "https://www.csb.gov/investigations/completed-investigations/";
export declare const CURRENT_URL = "https://www.csb.gov/investigations/current-investigations/";
export declare const PDF_ORIGIN = "https://www.csb.gov";
export declare const LICENSE = "17 USC 105";
export declare const ATTRIBUTION = "U.S. Chemical Safety and Hazard Investigation Board";
export declare const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export declare const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export declare const CARD_FIELDS: readonly ["id", "facility", "date", "title", "pageUrl", "sourceUrl", "kind", "bytes", "sha256"];
export type CsbReportListing = {
    id: string;
    facility: string;
    date: string | null;
    title: string;
    pageUrl: string;
    sourceUrl: string;
};
export type CsbReportCard = CsbReportListing & {
    kind: "final-investigation-report";
    bytes: number;
    sha256: string;
    pdfFile: string;
};
export type CsbReportsSnapshot = {
    ok: true;
    product: typeof PRODUCT_ID;
    status: "ok" | "empty" | "stale";
    reason: string | null;
    fetchedAt: string;
    asOf: string | null;
    license: typeof LICENSE;
    attribution: typeof ATTRIBUTION;
    listedCount?: number;
    fetchedPdfs?: number;
    skipped?: number;
    reused?: number;
    addedThisRun?: number;
    sources: {
        index: string;
        current: string;
        pdfHost: string;
    };
    cards: CsbReportCard[];
};
export declare const SEED_LISTINGS: CsbReportListing[];
export declare function csbReportsDir(): string;
export declare function snapshotPath(): string;
export declare function isoDate(raw: string | null | undefined): string | null;
export declare function officialCsbPageUrl(raw: string | null | undefined): string | null;
export declare function idFromPageUrl(pageUrl: string): string | null;
export declare function isSkippedCsbPdfName(name: string): boolean;
export declare function isKeptCsbFinalPdfName(name: string): boolean;
export declare function officialCsbFinalPdfUrl(urlOrPath: string | null | undefined): string | null;
export declare function isOfficialCsbFinalPdf(url: string | null | undefined): boolean;
export declare function parseListingRows(rows: CsbReportListing[]): CsbReportListing[];
export declare function extractHrefCandidates(html: string): string[];
export declare function parseCompletedIndex(html: string): CsbReportListing[];
export declare function parseInvestigationPage(html: string, pageUrl: string, prior?: Partial<CsbReportListing>): CsbReportListing | null;
export declare function isChromeInvestigationHtml(html: string): boolean;
export declare function isPdfBytes(bytes: Uint8Array): boolean;
export declare function emptyCsbReportsSnapshot(reason: string): CsbReportsSnapshot;
export declare function assembleCsbReportsSnapshot(cards: CsbReportCard[], fetchedAt?: string): CsbReportsSnapshot;
export declare function readCsbReportsSnapshot(): CsbReportsSnapshot | null;
export declare function writeCsbReportsSnapshot(snap: CsbReportsSnapshot): void;
export declare function pdfPathForCard(card: Pick<CsbReportCard, "id" | "pdfFile">): string;
export declare function readCachedPdf(card: Pick<CsbReportCard, "id" | "pdfFile">): Uint8Array | null;
export declare function fetchCsbBytes(url: string): Promise<Uint8Array>;
export declare function fetchCsbText(url: string): Promise<string>;
export declare function collectCsbReports(opts?: {
    pauseMs?: number;
    htmlDir?: string;
    limit?: number;
    maxFetch?: number;
}): Promise<CsbReportsSnapshot>;
export declare function loadCsbReports(): Promise<CsbReportsSnapshot>;
export declare function buildCsbReportsManifest(snap: CsbReportsSnapshot | null): Record<string, unknown>;
export declare function filterCsbReportsManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown>;
export declare function loadCsbReportsManifest(q?: string): Promise<Record<string, unknown>>;
export declare function selectCsbReportCard(snap: CsbReportsSnapshot | null, opts?: {
    id?: string;
    before?: string;
}): CsbReportCard | null;
//# sourceMappingURL=csb-reports.d.ts.map