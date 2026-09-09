#!/usr/bin/env node
/**
 * EPA NEPA Environmental Impact Statement TEXT from CDX e-NEPA PDFs.
 * Official EIS document PDFs since ~Oct 2012. 17 U.S.C. § 105. Cache + resale OK.
 * Extracted-body door: free manifest; GET ?id= one official text ($0.02);
 * plain GET is the newest 10 texts ($0.05). Search HTML is chrome.
 * Skip EPA comment letters and "Summary for the" teasers. Not Superfund RODs.
 * Download is POST + ALTCHA SHA-256 PoW (not a picture captcha). Solve in-collector.
 * Chrome starts on the details page (has <altcha-widget>). Do not open last-week
 * search first: the __fsk hop strips commonSearch=lastWeek and the empty form still
 * loads leftover recaptcha/api.js, which is not a second human puzzle.
 * Cookie-session GET last30Published is the official catalog that still returns rows.
 * If a download 302s to login.gov, that file is not the public EIS — skip it.
 * Habit: last-30 FR filings (last-week GET is empty after __fsk). Kill if a no-auth
 * JSON already dumps the EIS body.
 */
export declare const EIS_REPORTS_PATH = "/eis-reports";
export declare const EIS_REPORTS_MANIFEST_PATH = "/eis-reports/manifest.json";
export declare const EIS_REPORTS_AMOUNT_ATOMIC = "50000";
export declare const EIS_REPORTS_ONE_AMOUNT_ATOMIC = "20000";
export declare const PRODUCT_ID = "epa-nepa-eis-bodies";
export declare const PRODUCT_NAME = "EPA NEPA Environmental Impact Statement text";
export declare const SEARCH_ORIGIN = "https://cdxapps.epa.gov";
export declare const SEARCH_PATH = "/cdx-enepa-II/public/action/eis/search";
export declare const DETAILS_PATH = "/cdx-enepa-II/public/action/eis/details";
export declare const LAST_WEEK_URL = "https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/search?search=&commonSearch=lastWeek";
export declare const LAST_30_URL = "https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/search?search=&commonSearch=last30Published";
export declare const DETAILS_URL = "https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/details";
export declare const ALTCHA_CHALLENGE_URL = "https://cdxapi.epa.gov/altcha/api/v1/retrieveChallenge";
export declare const ALTCHA_VERIFY_URL = "https://cdxapi.epa.gov/altcha/api/v1/verifySolution";
export declare const LICENSE = "17 USC 105";
export declare const ATTRIBUTION = "U.S. Environmental Protection Agency CDX e-NEPA";
export declare const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export declare const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export declare const CARD_FIELDS: readonly ["id", "ceqNumber", "eisId", "attachmentId", "documentType", "date", "title", "agency", "state", "pageUrl", "sourceUrl", "kind", "body"];
export declare const BODY_NEEDLE_CLINCH = "EIS_BODY_NEEDLE_CLINCH_RIVER_SEIS_20260036";
export declare const BODY_NEEDLE_F35 = "EIS_BODY_NEEDLE_F35A_BEDDOWN_20260104";
export type EisListing = {
    id: string;
    ceqNumber: string;
    eisId: string;
    attachmentId: string;
    documentType: string;
    date: string | null;
    title: string;
    agency: string;
    state: string;
    pageUrl: string;
    sourceUrl: string;
    attachmentTitle: string;
    downloadGroups?: string;
    downloadSet?: string;
};
export type EisCard = EisListing & {
    kind: string;
    body: string;
};
export type EisReportsSnapshot = {
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
    skippedNoText?: number;
    reused?: number;
    addedThisRun?: number;
    captcha?: {
        kind: "altcha-pow";
        solved: boolean;
        tookMs: number | null;
        note: string;
    };
    sources: {
        search: string;
        lastWeek: string;
        last30: string;
        details: string;
    };
    cards: EisCard[];
};
export type AltchaChallenge = {
    algorithm: string;
    challenge: string;
    salt: string;
    signature: string;
    maxnumber: number;
};
export declare function paidBodyCatalogNote(paidPath: string, catalogLead: string): string;
type CookieJar = Map<string, string>;
export declare const SEED_LISTINGS: EisListing[];
export declare function eisReportsDir(): string;
export declare function snapshotPath(): string;
export declare function decodeHtml(raw: string): string;
export declare function isoDate(raw: string | null | undefined): string | null;
export declare function officialEisPageUrl(raw: string | null | undefined): string | null;
export declare function detailsUrlFor(eisId: string): string;
export declare function sourceUrlFor(eisId: string, attachmentId: string): string;
export declare function formItem(html: string, label: string): string;
export declare function isCommentLetterTitle(title: string): boolean;
export declare function isSummaryTeaserTitle(title: string): boolean;
export declare function isSkippedEisAttachment(title: string): boolean;
export declare function cardIdFor(ceqNumber: string, attachmentId: string, keptCount: number): string;
export type EisAttachment = {
    attachmentId: string;
    title: string;
};
export declare function parseAttachmentSection(html: string, heading: string): EisAttachment[];
export declare function parseSearchDownloadEis(html: string): {
    groups: string;
    set: string;
};
export declare function parseSearchRows(html: string): Array<{
    eisId: string;
    ceqNumber: string;
    title: string;
    documentType: string;
    date: string | null;
    agency: string;
    state: string;
    pageUrl: string;
    downloadGroups: string;
    downloadSet: string;
}>;
export declare function parseDetailsListings(html: string, pageUrl: string, prior?: Partial<EisListing>): EisListing[];
export declare function parseListingRows(rows: EisListing[]): EisListing[];
export declare function isChromeEisHtml(html: string): boolean;
export declare function isPdfBytes(bytes: Uint8Array): boolean;
export declare function looksLikeLeakedEisBody(text: string): boolean;
export declare function looksLikeLoginGov(htmlOrUrl: string): boolean;
export declare function looksLikeCdxLogin(htmlOrUrl: string): boolean;
export declare function looksLikeLoginWall(htmlOrUrl: string): boolean;
export declare function looksLikeLeftoverRecaptchaScript(html: string): boolean;
export declare function looksLikeHumanCaptcha(html: string): boolean;
export declare function isSuperfundRodDump(text: string): boolean;
export declare function isRealEisBody(text: string): boolean;
export declare function parseEisReportText(text: string, meta: Partial<EisListing> & {
    sourceUrl: string;
}): EisCard;
export declare function pdfToText(pdfPath: string): string;
export declare function solveAltchaPow(challenge: Pick<AltchaChallenge, "challenge" | "salt" | "maxnumber">): number;
export declare function altchaPayload(challenge: AltchaChallenge, number: number, took: number): string;
export declare function fetchAltchaChallenge(naasIp: string, naasToken: string): Promise<AltchaChallenge>;
export declare function chromePath(): string | null;
export declare function emptyEisReportsSnapshot(reason: string): EisReportsSnapshot;
export declare function assembleEisReportsSnapshot(cards: EisCard[], fetchedAt?: string): EisReportsSnapshot;
export declare function readEisReportsSnapshot(): EisReportsSnapshot | null;
export declare function writeEisReportsSnapshot(snap: EisReportsSnapshot): void;
export declare function pdfPathForCard(card: Pick<EisCard, "id"> & {
    pdfFile?: string;
}): string;
export declare function readCachedPdf(card: Pick<EisCard, "id"> & {
    pdfFile?: string;
}): Uint8Array | null;
export declare function fetchEisText(url: string, jar?: CookieJar): Promise<string>;
export declare function warmCdxSession(): Promise<CookieJar>;
export declare function fetchOfficialSearchHtml(jar?: CookieJar): Promise<string>;
export declare function leakTestCdxNoAuth(eisId?: string): Promise<{
    leaked: boolean;
    note: string;
}>;
export declare function pickMainEisPdf(paths: string[]): string | null;
export declare function unpackEisDownload(downloadPath: string, destPath: string): Uint8Array;
type ChromeDownloadOpts = {
    eisId: string;
    attachmentId?: string;
    destPath: string;
    groups?: string;
    set?: string;
};
export declare function downloadEisPdfWithChrome(opts: ChromeDownloadOpts): Promise<{
    bytes: Uint8Array;
    captchaTookMs: number;
}>;
export declare function collectEisReports(opts?: {
    pauseMs?: number;
    htmlDir?: string;
    limit?: number;
    maxFetch?: number;
}): Promise<EisReportsSnapshot>;
export declare function loadEisReports(): Promise<EisReportsSnapshot>;
export declare function buildEisReportsManifest(snap: EisReportsSnapshot | null): Record<string, unknown>;
export declare function filterEisReportsManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown>;
export declare function loadEisReportsManifest(q?: string): Promise<Record<string, unknown>>;
export declare function selectEisReportCard(snap: EisReportsSnapshot | null, opts?: {
    id?: string;
    before?: string;
}): EisCard | null;
export {};
//# sourceMappingURL=eis-reports.d.ts.map