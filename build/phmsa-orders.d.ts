#!/usr/bin/env node
/**
 * PHMSA-authored pipeline enforcement TEXT door.
 * Official PDFs from primis.phmsa.dot.gov/enforcement-documents/{CPF}/ only.
 * NOPV / Notice of Probable Violation, Final Order, Corrective Action Order (CAO),
 * and similar PHMSA-written enforcement documents. 17 U.S.C. § 105.
 * Does not invent order text. Skip operator-response / operator-reply letters.
 * Skip the killed PHMSA incident NARRATIVE zip. Do not wrap the primis TSV
 * (dates/penalties only). Distinct from /ferc-orders.
 */
export declare const PHMSA_ORDERS_PATH = "/phmsa-orders";
export declare const PHMSA_ORDERS_MANIFEST_PATH = "/phmsa-orders/manifest.json";
export declare const PHMSA_ORDERS_AMOUNT_ATOMIC = "50000";
export declare const PHMSA_ORDERS_ONE_AMOUNT_ATOMIC = "20000";
export declare const PRODUCT_ID = "phmsa-enforcement-order-bodies";
export declare const PRODUCT_NAME = "PHMSA pipeline enforcement-order text";
export declare const HUB_URL = "https://primis.phmsa.dot.gov/enforcement-documents/";
export declare const PDF_HOST = "primis.phmsa.dot.gov";
export declare const PDF_ORIGIN = "https://primis.phmsa.dot.gov";
export declare const MEDIA_RE: RegExp;
export declare const CPF_COMPACT_RE: RegExp;
export declare const LICENSE = "17 U.S.C. \u00A7 105 (U.S. government work; public domain)";
export declare const ATTRIBUTION = "Pipeline and Hazardous Materials Safety Administration (PHMSA), U.S. Department of Transportation. Work of the United States Government; 17 U.S.C. \u00A7 105.";
export declare const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export declare const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export declare const CARD_FIELDS: readonly ["id", "docket", "institution", "date", "kind", "title", "sourceUrl", "body"];
export type PhmsaOrderKind = "final-order" | "corrective-action-order" | "nopv" | "consent-order" | "safety-order" | "enforcement-order";
export type PhmsaOrderListing = {
    id: string;
    docket: string;
    institution: string;
    date: string | null;
    kind: PhmsaOrderKind | string;
    title: string;
    sourceUrl: string;
};
export type PhmsaOrderCard = PhmsaOrderListing & {
    body: string;
};
export type PhmsaOrderSnapshot = {
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
        pdfHost: string;
    };
    cards: PhmsaOrderCard[];
};
export declare const SEED_LISTINGS: PhmsaOrderListing[];
export declare function phmsaOrdersDir(): string;
export declare function snapshotPath(): string;
export declare function bundledSeedPath(): string;
export declare function decodeEntities(raw: string): string;
export declare function stripTags(raw: string): string;
export declare function isoDate(raw: string | null | undefined): string | null;
export declare function cpfFromCompact(raw: string | null | undefined): string | null;
export declare function kindFromBlob(raw: string): PhmsaOrderKind;
export declare function idFromCpfAndKind(cpf: string, kind: string): string;
export declare function officialPhmsaOrderPdfUrl(urlOrPath: string | null | undefined): string | null;
export declare function isOfficialPhmsaOrderPdf(url: string | null | undefined): boolean;
export declare function isPeopleRow(row: Pick<PhmsaOrderListing, "institution" | "title" | "id">): boolean;
export declare function isOperatorResponseRow(row: Pick<PhmsaOrderListing, "title" | "sourceUrl" | "id">): boolean;
export declare function isIncidentNarrativeRow(row: Pick<PhmsaOrderListing, "title" | "sourceUrl" | "id">): boolean;
export declare function isTsvWrapRow(row: Pick<PhmsaOrderListing, "title" | "sourceUrl">): boolean;
export declare function parseListingRows(rows: PhmsaOrderListing[]): PhmsaOrderListing[];
export declare function parseHubHtml(html: string, _pageUrl?: string): PhmsaOrderListing[];
export declare function isIndexTeaserDump(text: string): boolean;
export declare function isOperatorResponseDump(text: string): boolean;
export declare function isIncidentNarrativeDump(text: string): boolean;
export declare function isTsvWrapDump(text: string): boolean;
export declare function isFercDump(text: string): boolean;
export declare function isPeopleDump(text: string): boolean;
export declare function isRealPhmsaOrderBody(text: string): boolean;
export declare function parsePhmsaOrderText(text: string, meta: Partial<PhmsaOrderListing> & {
    sourceUrl: string;
}): PhmsaOrderCard;
export declare function emptyPhmsaOrdersSnapshot(reason: string): PhmsaOrderSnapshot;
export declare function assemblePhmsaOrdersSnapshot(cards: PhmsaOrderCard[], fetchedAt?: string): PhmsaOrderSnapshot;
export declare function readPhmsaOrdersSnapshot(): PhmsaOrderSnapshot | null;
export declare function writePhmsaOrdersSnapshot(snap: PhmsaOrderSnapshot): void;
export declare function fetchPhmsaOrderBytes(url: string): Promise<Uint8Array>;
export declare function pdfToText(pdfPath: string): string;
export declare function collectPhmsaOrders(opts?: {
    pauseMs?: number;
    htmlDir?: string;
    limit?: number;
    maxFetch?: number;
}): Promise<PhmsaOrderSnapshot>;
export declare function loadPhmsaOrders(): Promise<PhmsaOrderSnapshot>;
export declare function buildPhmsaOrdersManifest(snap: PhmsaOrderSnapshot | null): Record<string, unknown>;
export declare function filterPhmsaOrdersManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown>;
export declare function loadPhmsaOrdersManifest(q?: string): Promise<Record<string, unknown>>;
export declare function buildPhmsaOrdersPaidPage(snap: PhmsaOrderSnapshot | null, opts?: {
    id?: string;
    before?: string;
    page?: number;
}): Record<string, unknown>;
//# sourceMappingURL=phmsa-orders.d.ts.map