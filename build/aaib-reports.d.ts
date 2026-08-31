#!/usr/bin/env node
/**
 * UK AAIB investigation-report TEXT door.
 * Official investigation-report PDFs on assets.publishing.service.gov.uk
 * linked from GOV.UK /aaib-reports. OGL v3.0. Cache + resale OK with attribution.
 * Leak-clean: GOV.UK Content API / Search are synopsis / title / link / count only.
 * Full TEXT is in the official PDF. Does not invent report text.
 * Skip glossary PDFs, Annual Safety Review, RAIB (twin, PARK), news teasers.
 * Distinct from /orr-enforcement. Habit: new investigation reports post.
 */
export declare const AAIB_REPORTS_PATH = "/aaib-reports";
export declare const AAIB_REPORTS_MANIFEST_PATH = "/aaib-reports/manifest.json";
export declare const AAIB_REPORTS_AMOUNT_ATOMIC = "50000";
export declare const AAIB_REPORTS_ONE_AMOUNT_ATOMIC = "20000";
export declare const PRODUCT_ID = "aaib-investigation-report-bodies";
export declare const PRODUCT_NAME = "UK AAIB investigation-report text";
export declare const INDEX_URL = "https://www.gov.uk/aaib-reports";
export declare const SEARCH_URL = "https://www.gov.uk/api/search.json?filter_format=aaib_report&count=20&order=-public_timestamp";
export declare const CONTENT_API = "https://www.gov.uk/api/content";
export declare const PDF_HOST = "assets.publishing.service.gov.uk";
export declare const PDF_ORIGIN = "https://assets.publishing.service.gov.uk";
export declare const MEDIA_RE: RegExp;
export declare const PAGE_PATH_RE: RegExp;
export declare const LICENSE = "OGL v3.0";
export declare const ATTRIBUTION = "Air Accidents Investigation Branch. Contains public sector information licensed under the Open Government Licence v3.0.";
export declare const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export declare const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export declare const CARD_FIELDS: readonly ["id", "registration", "aircraft", "date", "title", "pageUrl", "sourceUrl", "kind", "body"];
export type AaibReportListing = {
    id: string;
    registration: string;
    aircraft: string;
    date: string | null;
    title: string;
    pageUrl: string;
    sourceUrl: string;
};
export type AaibReportCard = AaibReportListing & {
    kind: string;
    body: string;
};
export type AaibReportsSnapshot = {
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
    skippedNoText?: number;
    reused?: number;
    addedThisRun?: number;
    sources: {
        index: string;
        search: string;
        pdfHost: string;
    };
    cards: AaibReportCard[];
};
export declare const SEED_LISTINGS: AaibReportListing[];
export declare function aaibReportsDir(): string;
export declare function snapshotPath(): string;
export declare function bundledSeedPath(): string;
export declare function isoDate(raw: string | null | undefined): string | null;
export declare function officialAaibPageUrl(raw: string | null | undefined): string | null;
export declare function officialAaibReportPdfUrl(urlOrPath: string | null | undefined): string | null;
export declare function isOfficialAaibReportPdf(url: string | null | undefined): boolean;
export declare function idFromPageUrl(pageUrl: string): string | null;
export declare function isAnnualReviewRow(row: Pick<AaibReportListing, "id" | "title" | "pageUrl">): boolean;
export declare function isGlossaryRow(row: Pick<AaibReportListing, "title" | "sourceUrl">): boolean;
export declare function isRaibRow(row: Pick<AaibReportListing, "title" | "pageUrl" | "sourceUrl">): boolean;
export declare function isPeopleRow(row: Pick<AaibReportListing, "title" | "id" | "aircraft">): boolean;
export declare function parseListingRows(rows: AaibReportListing[]): AaibReportListing[];
export declare function parseSearchJson(raw: string): AaibReportListing[];
export declare function parseContentDocument(raw: string): AaibReportListing | null;
export declare function isIndexTeaserDump(text: string): boolean;
export declare function isRaibDump(text: string): boolean;
export declare function isAnnualReviewDump(text: string): boolean;
export declare function isGlossaryDump(text: string): boolean;
export declare function isCadorsOrNoAuthDump(text: string): boolean;
export declare function isPeopleDump(text: string): boolean;
export declare function isRealAaibReportBody(text: string): boolean;
export declare function parseAaibReportText(text: string, meta: Partial<AaibReportListing> & {
    sourceUrl: string;
}): AaibReportCard;
export declare function emptyAaibReportsSnapshot(reason: string): AaibReportsSnapshot;
export declare function assembleAaibReportsSnapshot(cards: AaibReportCard[], fetchedAt?: string): AaibReportsSnapshot;
export declare function readAaibReportsSnapshot(): AaibReportsSnapshot | null;
export declare function writeAaibReportsSnapshot(snap: AaibReportsSnapshot): void;
export declare function fetchAaibBytes(url: string): Promise<Uint8Array>;
export declare function fetchAaibText(url: string): Promise<string>;
export declare function pdfToText(pdfPath: string): string;
export declare function collectAaibReports(opts?: {
    pauseMs?: number;
    htmlDir?: string;
    limit?: number;
    maxFetch?: number;
}): Promise<AaibReportsSnapshot>;
export declare function loadAaibReports(): Promise<AaibReportsSnapshot>;
export declare function buildAaibReportsManifest(snap: AaibReportsSnapshot | null): Record<string, unknown>;
export declare function filterAaibReportsManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown>;
export declare function loadAaibReportsManifest(q?: string): Promise<Record<string, unknown>>;
export declare function buildAaibReportsPaidPage(snap: AaibReportsSnapshot | null, opts?: {
    id?: string;
    before?: string;
    page?: number;
}): Record<string, unknown>;
//# sourceMappingURL=aaib-reports.d.ts.map