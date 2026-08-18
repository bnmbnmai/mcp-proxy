/**
 * Unlisted FDA warning-letter BODIES door.
 * Official fda.gov warning-letter HTML only. Does not invent letter text.
 * Does not scrape Redica / Thompson / Apify. Not the /import-alerts IA feed.
 * Not a public lander / catalog / well-known SKU.
 */
export declare const WARNING_LETTERS_PATH = "/warning-letters";
export declare const WARNING_LETTERS_MANIFEST_PATH = "/warning-letters/manifest.json";
export declare const WARNING_LETTERS_AMOUNT_ATOMIC = "50000";
export declare const PRODUCT_ID = "fda-warning-letter-bodies";
export declare const PRODUCT_NAME = "FDA warning-letter bodies";
export declare const LISTING_URL = "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters";
export declare const LETTER_BASE = "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/";
export declare const LETTER_PATH_RE: RegExp;
export declare const DEFAULT_FIRST_SLICE = 3;
export declare const LETTER_FIELDS: readonly ["id", "firm", "cms", "issuedOn", "subject", "issuingOffice", "sourceUrl", "body"];
export type WarningLetterListing = {
    id: string;
    firm: string;
    sourceUrl: string;
    issuedOn: string | null;
};
export type WarningLetter = {
    id: string;
    firm: string;
    cms: string | null;
    issuedOn: string | null;
    subject: string;
    issuingOffice: string | null;
    sourceUrl: string;
    body: string;
};
export type WarningLettersSnapshot = {
    ok: true;
    product: typeof PRODUCT_ID;
    status: "ok" | "empty" | "stale";
    reason: string | null;
    fetchedAt: string;
    asOf: string | null;
    unlisted: true;
    sources: {
        listing: string;
        letterBase: string;
    };
    letters: WarningLetter[];
};
export declare function warningLettersDir(): string;
export declare function snapshotPath(): string;
export declare function decodeEntities(raw: string): string;
export declare function stripTags(raw: string): string;
export declare function absoluteLetterUrl(href: string): string;
export declare function letterIdFromUrl(url: string): string | null;
export declare function parseListingHtml(html: string): WarningLetterListing[];
export declare function parseLetterHtml(html: string, sourceUrl: string): WarningLetter;
export declare function emptySnapshot(reason: string): WarningLettersSnapshot;
export declare function assembleSnapshot(letters: WarningLetter[], fetchedAt?: string): WarningLettersSnapshot;
export declare function readSnapshot(): WarningLettersSnapshot | null;
export declare function writeSnapshot(snap: WarningLettersSnapshot): void;
export declare function fetchFdaHtml(url: string): Promise<string>;
export declare function collectWarningLetters(opts?: {
    pauseMs?: number;
    htmlDir?: string;
    limit?: number;
}): Promise<WarningLettersSnapshot>;
export declare function loadWarningLetters(): Promise<WarningLettersSnapshot>;
export declare function buildWarningLettersManifest(snap: WarningLettersSnapshot | null): Record<string, unknown>;
export declare function loadWarningLettersManifest(): Promise<Record<string, unknown>>;
//# sourceMappingURL=warning-letters.d.ts.map