/**
 * USCG Local Notice to Mariners — official weekly NavCEN PDF only.
 * One parser walks District 13 / Northwest (`/mariners`), District 11 /
 * Southwest northern (`/mariners-d11`), District 7 / Southeast
 * (`/mariners-d7`), District 8 / Gulf (`/mariners-d8`), plus leftover
 * Districts 1 / Northeast (`/mariners-d1`), 5 / Mid-Atlantic
 * (`/mariners-d5`), 9 / Great Lakes (`/mariners-d9`), 14 / Pacific
 * (`/mariners-d14`), and 17 / Alaska (`/mariners-d17`). Does not invent
 * notices. Does not wrap CBP AD/CVD. Does not wrap Light List GeoJSON or
 * MSI Download dumps. D11 south has no 2026 weekly PDFs — not shipped.
 * D8 rivers is a separate NavCEN listing — not this SKU.
 */
export declare const MARINERS_PATH = "/mariners";
export declare const MARINERS_MANIFEST_PATH = "/mariners/manifest.json";
export declare const MARINERS_D11_PATH = "/mariners-d11";
export declare const MARINERS_D11_MANIFEST_PATH = "/mariners-d11/manifest.json";
export declare const MARINERS_D7_PATH = "/mariners-d7";
export declare const MARINERS_D7_MANIFEST_PATH = "/mariners-d7/manifest.json";
export declare const MARINERS_D8_PATH = "/mariners-d8";
export declare const MARINERS_D8_MANIFEST_PATH = "/mariners-d8/manifest.json";
export declare const MARINERS_D1_PATH = "/mariners-d1";
export declare const MARINERS_D1_MANIFEST_PATH = "/mariners-d1/manifest.json";
export declare const MARINERS_D5_PATH = "/mariners-d5";
export declare const MARINERS_D5_MANIFEST_PATH = "/mariners-d5/manifest.json";
export declare const MARINERS_D9_PATH = "/mariners-d9";
export declare const MARINERS_D9_MANIFEST_PATH = "/mariners-d9/manifest.json";
export declare const MARINERS_D14_PATH = "/mariners-d14";
export declare const MARINERS_D14_MANIFEST_PATH = "/mariners-d14/manifest.json";
export declare const MARINERS_D17_PATH = "/mariners-d17";
export declare const MARINERS_D17_MANIFEST_PATH = "/mariners-d17/manifest.json";
export declare const MARINERS_AMOUNT_ATOMIC = "50000";
export declare const PRODUCT_ID = "uscg-d13-lnm";
export declare const PRODUCT_NAME = "USCG D13 / Northwest LNM";
export declare const D11_PRODUCT_ID = "uscg-d11-lnm";
export declare const D11_PRODUCT_NAME = "USCG D11 / Southwest LNM";
export declare const D7_PRODUCT_ID = "uscg-d7-lnm";
export declare const D7_PRODUCT_NAME = "USCG D7 / Southeast LNM";
export declare const D8_PRODUCT_ID = "uscg-d8-lnm";
export declare const D8_PRODUCT_NAME = "USCG D8 / Gulf LNM";
export declare const D1_PRODUCT_ID = "uscg-d1-lnm";
export declare const D1_PRODUCT_NAME = "USCG D1 / Northeast LNM";
export declare const D5_PRODUCT_ID = "uscg-d5-lnm";
export declare const D5_PRODUCT_NAME = "USCG D5 / Mid-Atlantic LNM";
export declare const D9_PRODUCT_ID = "uscg-d9-lnm";
export declare const D9_PRODUCT_NAME = "USCG D9 / Great Lakes LNM";
export declare const D14_PRODUCT_ID = "uscg-d14-lnm";
export declare const D14_PRODUCT_NAME = "USCG D14 / Pacific LNM";
export declare const D17_PRODUCT_ID = "uscg-d17-lnm";
export declare const D17_PRODUCT_NAME = "USCG D17 / Alaska LNM";
export declare const LNM_LISTING_URL = "https://www.navcen.uscg.gov/local-notices-to-mariners?district=13+0&subdistrict=n";
export declare const D11_LNM_LISTING_URL = "https://www.navcen.uscg.gov/local-notices-to-mariners?district=11+0&subdistrict=n";
export declare const D7_LNM_LISTING_URL = "https://www.navcen.uscg.gov/local-notices-to-mariners?district=7+0&subdistrict=n";
export declare const D8_LNM_LISTING_URL = "https://www.navcen.uscg.gov/local-notices-to-mariners?district=8+0&subdistrict=g";
export declare const D1_LNM_LISTING_URL = "https://www.navcen.uscg.gov/local-notices-to-mariners?district=1+0&subdistrict=n";
export declare const D5_LNM_LISTING_URL = "https://www.navcen.uscg.gov/local-notices-to-mariners?district=5+0&subdistrict=n";
export declare const D9_LNM_LISTING_URL = "https://www.navcen.uscg.gov/local-notices-to-mariners?district=9+0&subdistrict=n";
export declare const D14_LNM_LISTING_URL = "https://www.navcen.uscg.gov/local-notices-to-mariners?district=14+0&subdistrict=n";
export declare const D17_LNM_LISTING_URL = "https://www.navcen.uscg.gov/local-notices-to-mariners?district=17+0&subdistrict=n";
export declare const LNM_PDF_BASE = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/";
export declare const LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13{WW}{YYYY}.pdf";
export declare const D11_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm11{WW}{YYYY}.pdf";
export declare const D7_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm07{WW}{YYYY}.pdf";
export declare const D8_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm08{WW}g{YYYY}.pdf";
export declare const D1_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm01{WW}{YYYY}.pdf";
export declare const D5_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm05{WW}{YYYY}.pdf";
export declare const D9_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm09{WW}{YYYY}.pdf";
export declare const D14_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm14{WW}{YYYY}.pdf";
export declare const D17_LNM_PDF_PATTERN = "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm17{WW}{YYYY}.pdf";
export declare const DISTRICT = "13";
export declare const DISTRICT_NAME = "Northwest";
export declare const D11_DISTRICT = "11";
export declare const D11_DISTRICT_NAME = "Southwest";
export declare const D7_DISTRICT = "7";
export declare const D7_DISTRICT_NAME = "Southeast";
export declare const D8_DISTRICT = "8";
export declare const D8_DISTRICT_NAME = "Gulf";
export declare const D1_DISTRICT = "1";
export declare const D1_DISTRICT_NAME = "Northeast";
export declare const D5_DISTRICT = "5";
export declare const D5_DISTRICT_NAME = "Mid-Atlantic";
export declare const D9_DISTRICT = "9";
export declare const D9_DISTRICT_NAME = "Great Lakes";
export declare const D14_DISTRICT = "14";
export declare const D14_DISTRICT_NAME = "Pacific";
export declare const D17_DISTRICT = "17";
export declare const D17_DISTRICT_NAME = "Alaska";
export type LnmSpec = {
    productId: string;
    productName: string;
    district: string;
    districtName: string;
    listingUrl: string;
    pdfPattern: string;
    /** Official weekly PDF infix (`g` for D8 Gulf `lnm08{WW}g{YYYY}.pdf`). */
    pdfInfix?: string;
    path: string;
    cacheDir: string;
    dirEnv: string;
    ttlEnv: string;
    listingPathEnv: string;
    pdfPathEnv: string;
    userAgent: string;
};
export declare const D13_SPEC: LnmSpec;
export declare const D11_SPEC: LnmSpec;
export declare const D7_SPEC: LnmSpec;
export declare const D8_SPEC: LnmSpec;
export declare const D1_SPEC: LnmSpec;
export declare const D5_SPEC: LnmSpec;
export declare const D9_SPEC: LnmSpec;
export declare const D14_SPEC: LnmSpec;
export declare const D17_SPEC: LnmSpec;
/** Live sibling doors already on ticks.bnm.farm. */
export declare const LIVE_LNM_SPECS: readonly LnmSpec[];
/** Dual-hunt TAKE 2026-09-06 leftover districts (same walker, new paths). */
export declare const LEFTOVER_LNM_SPECS: readonly LnmSpec[];
export declare const ALL_LNM_SPECS: readonly LnmSpec[];
/** NavCEN weekly PDF prefix is two digits (`lnm01…`, `lnm07…`, `lnm08…g`, `lnm11…`, `lnm13…`). */
export declare function lnmPdfCode(district: string): string;
export declare function lnmPdfFilename(district: string, week: number, year: number, infix?: string): string;
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
    product: string;
    status: "ok" | "empty" | "stale";
    reason: string | null;
    fetchedAt: string;
    asOf: string | null;
    week: string | null;
    year: number | null;
    edition: string | null;
    district: string;
    districtName: string;
    sources: {
        listing: string;
        pdfPattern: string;
        pdfUrl: string | null;
    };
    editions: LnmEdition[];
    notices: MarinersNotice[];
};
export declare function marinersDir(spec?: LnmSpec): string;
export declare function snapshotPath(spec?: LnmSpec): string;
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
export declare function emptySnapshot(reason: string, editions?: LnmEdition[], spec?: LnmSpec): MarinersSnapshot;
export declare function assembleSnapshot(opts: {
    editions: LnmEdition[];
    latest: LnmEdition;
    asOf: string | null;
    notices: MarinersNotice[];
    fetchedAt?: string;
    spec?: LnmSpec;
}): MarinersSnapshot;
export declare function pdfToText(pdfPath: string): string;
export declare function collectMariners(spec?: LnmSpec): Promise<MarinersSnapshot>;
export declare function readSnapshot(spec?: LnmSpec): MarinersSnapshot | null;
export declare function writeSnapshot(snap: MarinersSnapshot, spec?: LnmSpec): void;
export declare function loadMariners(spec?: LnmSpec): Promise<MarinersSnapshot>;
export declare function sectionCounts(notices: MarinersNotice[]): {
    section: string;
    count: number;
}[];
export declare function buildMarinersManifest(snap: MarinersSnapshot | null, spec?: LnmSpec): Record<string, unknown>;
export declare function loadMarinersManifest(spec?: LnmSpec): Promise<Record<string, unknown>>;
export declare function collectMarinersD11(): Promise<MarinersSnapshot>;
export declare function loadMarinersD11(): Promise<MarinersSnapshot>;
export declare function loadMarinersD11Manifest(): Promise<Record<string, unknown>>;
export declare function collectMarinersD7(): Promise<MarinersSnapshot>;
export declare function loadMarinersD7(): Promise<MarinersSnapshot>;
export declare function loadMarinersD7Manifest(): Promise<Record<string, unknown>>;
export declare function collectMarinersD8(): Promise<MarinersSnapshot>;
export declare function loadMarinersD8(): Promise<MarinersSnapshot>;
export declare function loadMarinersD8Manifest(): Promise<Record<string, unknown>>;
export declare function collectMarinersD1(): Promise<MarinersSnapshot>;
export declare function loadMarinersD1(): Promise<MarinersSnapshot>;
export declare function loadMarinersD1Manifest(): Promise<Record<string, unknown>>;
export declare function collectMarinersD5(): Promise<MarinersSnapshot>;
export declare function loadMarinersD5(): Promise<MarinersSnapshot>;
export declare function loadMarinersD5Manifest(): Promise<Record<string, unknown>>;
export declare function collectMarinersD9(): Promise<MarinersSnapshot>;
export declare function loadMarinersD9(): Promise<MarinersSnapshot>;
export declare function loadMarinersD9Manifest(): Promise<Record<string, unknown>>;
export declare function collectMarinersD14(): Promise<MarinersSnapshot>;
export declare function loadMarinersD14(): Promise<MarinersSnapshot>;
export declare function loadMarinersD14Manifest(): Promise<Record<string, unknown>>;
export declare function collectMarinersD17(): Promise<MarinersSnapshot>;
export declare function loadMarinersD17(): Promise<MarinersSnapshot>;
export declare function loadMarinersD17Manifest(): Promise<Record<string, unknown>>;
export declare function specFromDistrict(raw: string | undefined): LnmSpec;
export declare function specFromArgv(argv?: string[]): LnmSpec;
export declare function leftoverCollectArgv(spec: LnmSpec): string;
//# sourceMappingURL=mariners.d.ts.map