/**
 * USCG District 13 / Northwest Local Notice to Mariners — official weekly PDF only.
 * Does not invent notices. Does not wrap CBP AD/CVD or other districts.
 */
export declare const MARINERS_PATH = "/mariners";
export declare const MARINERS_MANIFEST_PATH = "/mariners/manifest.json";
export declare const MARINERS_AMOUNT_ATOMIC = "50000";
export declare const PRODUCT_ID = "uscg-d13-lnm";
export declare const PRODUCT_NAME = "USCG D13 / Northwest LNM";
export declare const LNM_LISTING_URL = "https://www.navcen.uscg.gov/local-notices-to-mariners?district=13+0&subdistrict=n";
export declare const LNM_PDF_BASE = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/";
export declare const LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13{WW}{YYYY}.pdf";
export declare const DISTRICT = "13";
export declare const DISTRICT_NAME = "Northwest";
export declare const NOTICE_FIELDS: readonly ["week", "section", "text", "sourceUrl"];
export declare const AID_SECTIONS: readonly ["Federal Discrepancies Corrected", "Private Discrepancies Corrected", "Federal Discrepancies", "Private Discrepancies", "Temporary Changes"];
export declare const MSI_SECTION = "Additional MSI Categories";
export declare const LNM_SECTIONS: readonly ["Federal Discrepancies Corrected", "Private Discrepancies Corrected", "Federal Discrepancies", "Private Discrepancies", "Temporary Changes", "Additional MSI Categories"];
export type LnmEdition = {
    week: number;
    year: number;
    edition: string;
    href: string;
    sourceUrl: string;
};
export type MarinersNotice = {
    week: string;
    section: string;
    waterway: string | null;
    text: string;
    sourceUrl: string;
};
export type MarinersSnapshot = {
    ok: true;
    product: typeof PRODUCT_ID;
    status: "ok" | "empty" | "stale";
    reason: string | null;
    fetchedAt: string;
    asOf: string | null;
    week: string | null;
    year: number | null;
    edition: string | null;
    district: typeof DISTRICT;
    districtName: typeof DISTRICT_NAME;
    sources: {
        listing: string;
        pdfPattern: string;
        pdfUrl: string | null;
    };
    editions: LnmEdition[];
    notices: MarinersNotice[];
};
export declare function marinersDir(): string;
export declare function snapshotPath(): string;
export declare function absolutePdfUrl(href: string): string;
export declare function parseListingHtml(html: string): LnmEdition[];
export declare function latestEdition(editions: LnmEdition[]): LnmEdition | null;
export declare function parseLnmText(text: string, meta: {
    week: string;
    sourceUrl: string;
}): {
    asOf: string | null;
    notices: MarinersNotice[];
};
export declare function emptySnapshot(reason: string, editions?: LnmEdition[]): MarinersSnapshot;
export declare function assembleSnapshot(opts: {
    editions: LnmEdition[];
    latest: LnmEdition;
    asOf: string | null;
    notices: MarinersNotice[];
    fetchedAt?: string;
}): MarinersSnapshot;
export declare function pdfToText(pdfPath: string): string;
export declare function collectMariners(): Promise<MarinersSnapshot>;
export declare function readSnapshot(): MarinersSnapshot | null;
export declare function writeSnapshot(snap: MarinersSnapshot): void;
export declare function loadMariners(): Promise<MarinersSnapshot>;
export declare function sectionCounts(notices: MarinersNotice[]): {
    section: string;
    count: number;
}[];
export declare function buildMarinersManifest(snap: MarinersSnapshot | null): Record<string, unknown>;
export declare function loadMarinersManifest(): Promise<Record<string, unknown>>;
//# sourceMappingURL=mariners.d.ts.map