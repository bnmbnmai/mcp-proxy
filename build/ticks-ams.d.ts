/**
 * Nationwide USDA AMS hay / cattle / grain / wool / dairy / hogs / produce report bodies
 * for the existing GET /ticks door. Official PDFs (and NAL/esmis archive copies).
 * Same product: idaho-hay-feeder-ticks. Does not open a new SKU. Does not wrap marsapi
 * (403 without a key), LMR datamart JSON, NASS Quick Stats, WASDE/PSD/ESR, CME APIs,
 * the National Feeder dashboard, or SJ_LS850.txt.
 * AMS_2911 National Wool Review is public-domain 17 USC 105; parse the official PDF only.
 * AMS_2872 National Daily Hog and Pork Summary is the official AMS public PDF, not an
 * LMR dashboard / datamart wrap. Individual LM_HG* / LM_PK* PDFs stay skipped.
 * AMS_2810 National Direct Feeder Pig is the official AMS voluntary weekly print.
 * AMS_2843 Daily National Shell Egg Index is the official LPGMN public PDF; rows
 * land on the existing dairy/protein table.
 * AMS_1095 National Weekly Cold Storage (MD_DA953) is the official Dairy Market
 * News PDF of selected-center butter/cheese holdings. Holdings are 1,000 lb
 * inventory prints — not CME/NDPSR $/lb — so they get their own dairy.ams_1095.*
 * rows instead of overwriting existing butter/cheese price series. Do not wrap
 * NASS monthly Cold Storage txt/Quick Stats.
 * AMS_3646 Weekly National Chicken is the official LPGMN POS poultry PDF; rows
 * land on the existing dairy/protein table (dairy.ams_3646.*). Current-week
 * cents/lb weighted averages only — previous-week reprint is not a tick.
 * Weekly grocery / retail feature ads fatten the same $0.05 bag: AMS_2995 dairy
 * ads already live; siblings AMS_2756 chicken, AMS_2757 eggs, AMS_2867 turkey,
 * AMS_2868 pork, AMS_3228 beef, AMS_3229 lamb, AMS_3796 veal land as
 * dairy.ams_* grocery-ad rows. AMS_3324 / fvwretail specialty-crops grocery
 * ads land on the existing produce group. Current-week advertised wtd avg
 * only — previous-week / year-ago reprints and regional detail pages are not
 * ticks. Official bodies are ugly mnreports PDFs (marsapi 403; LMR datamart
 * "Invalid slug id"). AMS_3725 Egg Markets Overview is leftover narrative.
 * AMS_3024 Weekly Cotton Market Review is the official Cotton Program weekly
 * (mnreports/cnwwcmr.pdf — ams_3024.pdf is 404). Rows land on the existing
 * grain table as grain.ams_3024.cotton.*. Current-week price prints only —
 * year-ago fluff, quality charts, and weather narrative are not ticks.
 * Daily AMS_3804 spot quotations and cnwwqo quality stay leftover. Do not
 * wrap MARS / MMN JSON (403 without a key).
 * Water District 1 rental-pool $/AF is not an AMS source and stays off this table.
 *
 * Prefer live mnreports over NAL/esmis archives. Collect used to unshift ESMIS first and
 * keep the first parseable PDF — that left many Direct Hay/Cattle/Grain rows on Sept 2025
 * NAL copies while official still published Aug 2026 bodies on ams.usda.gov/mnreports.
 */
import { AMS_LEFTOVER_REPORTS, AMS_LEFTOVER_SLUGS } from "./ticks-ams-leftovers.js";
export { AMS_LEFTOVER_REPORTS, AMS_LEFTOVER_SLUGS };
export declare const PRODUCT_ID = "idaho-hay-feeder-ticks";
export declare const ESMIS_HOST = "https://esmis.nal.usda.gov";
export declare const MNREPORTS_PDF: (slug: string) => string;
export declare const VIEW_REPORT: (slug: string) => string;
export type AmsGroup = "hay" | "cattle" | "grain" | "wool" | "dairy" | "hogs" | "produce";
export type AmsReport = {
    slug: string;
    group: AmsGroup;
    region: string;
    title: string;
    esmisPublication: string;
    /** Extra mnreports / ESMIS stems (dywweeklyreport, lsddhps, nx_fv010, …). */
    pdfNames?: readonly string[];
};
/**
 * Already on /ticks via farm-plan / hay.ams_ prefix: 3056 Idaho hay, 3057 Oregon hay,
 * 3058 Columbia Basin hay, 3059 NW cattle, 2914 PNW pulses. Not listed again.
 * No Illinois or Georgia Direct Hay on the official AMS hay listing (auction barns only).
 */
export declare const AMS_NATIONAL_REPORTS: readonly AmsReport[];
export declare const SKIPPED_SOURCES: readonly [{
    readonly id: "marsapi";
    readonly why: "marsapi.ams.usda.gov/services/v1.1/reports/{slug} returns HTTP 403 without an API key — not a no-auth JSON body";
}, {
    readonly id: "lmr-datamart";
    readonly why: "mpr.datamart.ams.usda.gov already exposes LMR cattle as no-auth JSON — skip wrapping that body";
}, {
    readonly id: "feeder-dashboard";
    readonly why: "National Feeder & Stocker Cattle Dashboard is a web app, not an ugly PDF/HTML report body";
}, {
    readonly id: "SJ_LS850";
    readonly why: "https://www.ams.usda.gov/mnreports/SJ_LS850.txt already returns the official plaintext body";
}, {
    readonly id: "nass-quick-stats";
    readonly why: "documented no-auth JSON API — KILL";
}, {
    readonly id: "nass-monthly-cold-storage";
    readonly why: "NASS monthly Cold Storage txt/Quick Stats is free structured NASS — KILL; official AMS_1095 weekly PDF is the cold-storage print on this door";
}, {
    readonly id: "wasde-psd-esr";
    readonly why: "documented no-auth USDA JSON/CSV — KILL";
}, {
    readonly id: "ams_3056_3057_3058_3059_2914";
    readonly why: "already collected on /ticks (Idaho/Oregon/Columbia Basin hay, NW Direct cattle, PNW pulses)";
}, {
    readonly id: "no-il-ga-direct-hay";
    readonly why: "AMS hay listing has no Illinois or Georgia Direct Hay report — IL hay is auction-barn PDFs already wired";
}, {
    readonly id: "retired-city-grain-txt";
    readonly why: "sj_gr851 / gx_gr110 / wh_gr110 / jc_gr111 are retired or already plaintext city grain .txt — skip wrapping";
}, {
    readonly id: "ams_3045_minneapolis_basis";
    readonly why: "AMS_3045 Minneapolis Daily Basis is a MIAX floor-basis sheet, not a POS bid table";
}, {
    readonly id: "se-individual-cattle-barns";
    readonly why: "400+ remaining official SE/Midwest individual sale-barn PDFs stay off this slice; five current official SE barns (1988/1946/1995/1419/1997) + nine SE weeklies are on /ticks. Not a new SKU.";
}, {
    readonly id: "se-weekly-cattle-summaries";
    readonly why: "AL/FL/GA/KY/TN/VA/NC/MS/SC weeklies now on /ticks; leftover WV/PA/IN/IL/MO regional weeklies stay off this pass";
}, {
    readonly id: "seasonal-specials";
    readonly why: "official seasonal/replacement/stock-show specials often empty off-season; skip rather than invent";
}, {
    readonly id: "video-internet-auctions";
    readonly why: "feeder cattle internet/video/board sales are a different AMS family than sale-barn floor sheets";
}, {
    readonly id: "lmr-slaughter-pdfs";
    readonly why: "national/regional Direct Slaughter PDFs are LMR fed-cattle tables, not the feeder/POS parser this door already sells";
}, {
    readonly id: "plaintext-recaps";
    readonly why: "lswalabama / lswkssum / CO_LS146.txt already return official plaintext — do not wrap";
}, {
    readonly id: "facebook-private-barns";
    readonly why: "Facebook barns, private sale-barn homepages, and Treasure Valley Caldwell stay out — no dated official PDF/HTML print";
}, {
    readonly id: "gis-echo-family-herd";
    readonly why: "GIS wraps, EPA ECHO, and the sold family herd ledger are not /ticks rows";
}, {
    readonly id: "new-x402-door";
    readonly why: "no per-barn / per-state / per-region SKU; extra official rows stay on GET /ticks";
}, {
    readonly id: "ams_2911_marsapi";
    readonly why: "marsapi /services/v1.2/reports/2911 returns HTTP 403 without a key — parse the official mnreports PDF only";
}, {
    readonly id: "lmr-hog-pdfs";
    readonly why: "LM_HG203/206/210/212, LM_PK602, LM_HG201, AMS_3458/2498/2510/2675 are LMR licensed tables; parse official AMS_2872 / lsddhps summary PDF and AMS_2810 feeder-pig voluntary print only — do not wrap LMR dashboards";
}, {
    readonly id: "cme-cash-trading-doors";
    readonly why: "dedicated CME cash slugs 1599-1602 wrap CME; weekly AMS_2998 already prints Dairy Market News weekly averages from that cash table";
}, {
    readonly id: "dairy-regional-narrative";
    readonly why: "AMS_1090/1089/1091 butter and AMS_1084/1083/1085/1092 cheese regional PDFs printed overages/narrative this week, not dollar prints — skip rather than invent";
}, {
    readonly id: "dairy-gdt-farmers-markets";
    readonly why: "GDT 1604, farmers-market dairy, and international DMN PDFs are a leftover dairy slice; not this pass";
}, {
    readonly id: "dairy-waf-empty";
    readonly why: "AMS_1043/1044/1046/1047/1049/1050/1053 regional dry slugs 403 WAF on this VM — skip rather than leave silent holes";
}, {
    readonly id: "ams_3096_waf";
    readonly why: "AMS_3096 Eastern Cornbelt Direct Feeder Cattle mnreports 403 WAF; drop rather than leave a silent empty";
}, {
    readonly id: "se-swine-auction-barns";
    readonly why: "individual AMS swine-auction barn PDFs leftover — not a national sale-barn mill; AMS_2872 summary + AMS_2810 feeder pig are this hog slice";
}, {
    readonly id: "sheep-goats";
    readonly why: "official AMS sheep/lamb/goat sale-barn and LMR boxed-lamb LM_XL* leftover; grocery lamb/veal feature ads AMS_3229/3796 are already on /ticks";
}, {
    readonly id: "poultry-eggs";
    readonly why: "leftover official AMS broiler-glance/breaking-stock PDFs stay off this slice; AMS_2843 Daily Shell Egg Index, AMS_3646 Weekly National Chicken, and grocery feature ads AMS_2756/2757/2867 are already on /ticks dairy rows";
}, {
    readonly id: "ams-3725-egg-overview";
    readonly why: "AMS_3725 Egg Markets Overview is weekly narrative + charts, not a tabular poultry/protein print; do not scrape prose prices. Daily eggs are AMS_2843; retail egg ads are AMS_2757";
}, {
    readonly id: "cotton-rice";
    readonly why: "official AMS rice PDFs leftover. Daily AMS_3804 / Daily Spot Cotton Quotations and weekly quality cnwwqo stay leftover. Weekly Cotton Market Review (AMS_3024 / cnwwcmr) is already on /ticks grain rows";
}, {
    readonly id: "remaining-fv-terminals";
    readonly why: "Asheville/Columbia/Raleigh/Baltimore/nuts, FV030 onion-potato city sheets, and discontinued MX_FV010 Mexico City leftover; NY/CHI/LA/ATL/DET/PHL/BOS fruit+veg are the national terminal slice. Grocery produce ads are AMS_3324 / fvwretail";
}, {
    readonly id: "mx_fv010_discontinued";
    readonly why: "MX_FV010 is Mexico City terminal fruit, permanently discontinued 2024-02-09 — not a current US terminal print";
}, {
    readonly id: "if_fv130_already";
    readonly why: "Idaho Falls IF_FV130 shipping-point is already on /ticks via farm-plan — do not re-list";
}];
export type AmsTick = {
    id: string;
    group: AmsGroup;
    commodity: string;
    label: string;
    market: string;
    classGrade: string;
    unit: string;
    price: number;
    lo?: number;
    hi?: number;
    asOf: string;
    source: string;
    sourceUrl: string;
    reportDate: string;
    series: string;
};
export type AmsFailed = {
    id: string;
    source: string;
    sourceUrl: string;
    reason: string;
};
export type AmsSnapshot = {
    ok: true;
    product: typeof PRODUCT_ID;
    fetchedAt: string;
    asOf: string | null;
    tickCount: number;
    rows: AmsTick[];
    failed: AmsFailed[];
    sources: string[];
};
export declare function amsNationalDir(): string;
export declare function amsSnapshotPath(dir?: string): string;
export declare function token(raw: string): string;
export declare function parseMdY(raw: string): string | null;
export declare function parseReportDate(text: string): string | null;
export declare function parseMoney(raw: string): {
    lo: number;
    hi: number;
    mid: number;
} | null;
export declare function esmisPdfUrls(html: string, slug: string, pdfNames?: readonly string[]): string[];
export declare function latestEsmisPdfUrl(html: string, slug: string): string | null;
export declare function esmisPublicationUrl(report: AmsReport): string;
export declare function mnreportsPdfUrls(slug: string, pdfNames?: readonly string[]): string[];
/** Live official host first. NAL/esmis archives are fallback only (Sept 2025 copies). */
export declare function officialPdfCandidateOrder(slug: string, esmisUrls?: string[], pdfNames?: readonly string[]): string[];
export declare function parseHayReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function looksLikeCattleAuction(text: string): boolean;
export declare function parseCattleAuctionReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseCattleReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseGrainReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseWoolReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseDairyWeeklyReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseDairyDrySummary(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseDairyFluidReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseDairyOrganicAds(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseDairyNdpsr(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseDairyRetailAds(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
/** Official LPGMN weekly grocery-store feature ads — current-week national CW wtd avg only. */
export declare function parseGroceryRetailLp(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
/** Official Specialty Crops grocery feature ads — national THIS WEEK wtd avg only. */
export declare function parseSpecialtyCropsRetail(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseShellEggIndex(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
/** Official AMS_1095 / MD_DA953 weekly selected-center butter + cheese holdings. */
export declare function parseColdStorageWeekly(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
/** Official AMS_3646 Weekly National Chicken — current-week cents/lb weighted averages. */
export declare function parseWeeklyNationalChicken(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseDairyRegionalDry(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseFeederPigReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseHogSummary(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseOrganicGrainReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseProduceTerminal(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
/** Official AMS_3024 / CNWWCMR weekly — current-week cents/lb prints only. */
export declare function parseWeeklyCottonReview(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function parseAmsReportText(text: string, report: AmsReport, sourceUrl: string): AmsTick[];
export declare function pdfToText(pdfPath: string): string;
export declare function officialPdfCandidates(report: AmsReport): Promise<string[]>;
export declare function resolveOfficialPdfUrl(report: AmsReport): Promise<string>;
export declare function readAmsSnapshot(dir?: string): AmsSnapshot | null;
export declare function writeAmsSnapshot(snap: AmsSnapshot, dir?: string): string;
export declare function mergeAmsNationalTicks<T extends {
    ticks?: unknown[];
    failed?: unknown[];
    sources?: string[];
    status?: string;
    reason?: string | null;
    fetchedAt?: string | null;
}>(payload: T, snap?: AmsSnapshot | null): T;
export declare function collectReportFilter(): readonly {
    slug: string;
    group: AmsGroup;
    region: string;
    title: string;
    esmisPublication: string;
    pdfNames?: readonly string[];
}[];
export declare function mergePartialAmsSnapshot(prev: AmsSnapshot, next: AmsSnapshot, slugs: readonly string[]): AmsSnapshot;
/** Full-walk fail-closed: keep previous rows for slugs whose fetch failed this pass. */
export declare function mergeFailedAmsSlugs(prev: AmsSnapshot, next: AmsSnapshot): AmsSnapshot;
export declare function collectAmsNational(opts?: {
    dir?: string;
    pauseMs?: number;
}): Promise<AmsSnapshot>;
//# sourceMappingURL=ticks-ams.d.ts.map