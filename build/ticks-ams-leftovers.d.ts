#!/usr/bin/env node
export declare const PRODUCT_ID = "us-hay-cattle-grain-ticks";
export declare const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export declare const MNREPORTS_PDF: (slug: string) => string;
export declare const MARS_REPORT: (slug: string) => string;
export type LeftoverKind = "se-weekly" | "se-barn";
export type LeftoverReport = {
    slug: string;
    group: "cattle";
    region: string;
    title: string;
    kind: LeftoverKind;
};
/** Official leftover SE weeklies + SE sale barns still unpublished on /ticks. */
export declare const AMS_LEFTOVER_REPORTS: readonly LeftoverReport[];
export declare const SKIPPED_LEFTOVERS: readonly [{
    readonly id: "already-on-ticks";
    readonly why: "Western/plains weeklies and Direct/POS hay-cattle-grain slugs already in AMS_NATIONAL_REPORTS / live latestAsOfBySource";
}, {
    readonly id: "se-400-barns";
    readonly why: "Hundreds of remaining SE/Midwest individual barns stay off this slice; five current official SE barns + nine SE weeklies are the unread official pages";
}, {
    readonly id: "board-video";
    readonly why: "Feeder cattle board/video/internet sales (AMS_2029, AMS_3891, AMS_2247, …) are a different family than sale-barn floor sheets";
}, {
    readonly id: "seasonal-specials";
    readonly why: "Replacement/stock-show specials often empty off-season; do not invent";
}, {
    readonly id: "plaintext-mexico";
    readonly why: "AL_LS626 / AL_LS627 / AL_LS635 already return official plaintext — do not wrap";
}, {
    readonly id: "national-2874-waf";
    readonly why: "AMS_2874 National Weekly Cattle Beef Summary mnreports 403 on this VM; skip rather than invent or wrap a dashboard";
}, {
    readonly id: "mo-regional-weeklies";
    readonly why: "Missouri NE/NC/WC/SW/SE/EC weeklies are leftover Midwest, not this SE slice";
}, {
    readonly id: "il-pa-ny-weeklies";
    readonly why: "Illinois / Pennsylvania / New York weeklies leftover — not SE";
}, {
    readonly id: "marsapi-keyed";
    readonly why: "marsapi /services/v1.1/reports/{slug} is HTTP 403 without a key — not a no-auth JSON body dump";
}, {
    readonly id: "facebook-private";
    readonly why: "Facebook barns and private sale-barn sites stay out";
}, {
    readonly id: "new-sku";
    readonly why: "No per-barn / per-state path; extra official rows stay on GET /ticks $0.05 tableWhole";
}];
export type LeftoverTick = {
    id: string;
    group: "cattle";
    commodity: string;
    label: string;
    market: string;
    classGrade: string;
    unit: "$/cwt";
    price: number;
    lo?: number;
    hi?: number;
    asOf: string;
    source: string;
    sourceUrl: string;
    reportDate: string;
    series: string;
};
export type LeftoverFailed = {
    id: string;
    source: string;
    sourceUrl: string;
    reason: string;
};
export declare function leftoverDir(): string;
export declare function token(raw: string): string;
export declare function parseMdY(raw: string): string | null;
export declare function parseReportDate(text: string): string | null;
export declare function looksLikeCattleAuction(text: string): boolean;
export declare function parseCattleAuctionReport(text: string, report: LeftoverReport, sourceUrl: string): LeftoverTick[];
export declare function jsonDumpsBody(raw: string): boolean;
export declare function leakTestSlug(slug: string): Promise<{
    ok: boolean;
    reason: string;
}>;
export declare function fetchOfficialPdf(slug: string): Promise<{
    url: string;
    bytes: Buffer;
} | {
    url: string;
    error: string;
}>;
export declare function pdftotext(bytes: Buffer): string;
export declare function collectLeftovers(reports?: readonly LeftoverReport[]): Promise<{
    ok: true;
    product: typeof PRODUCT_ID;
    fetchedAt: string;
    tickCount: number;
    rows: LeftoverTick[];
    failed: LeftoverFailed[];
    sources: string[];
    leakSkipped: string[];
}>;
//# sourceMappingURL=ticks-ams-leftovers.d.ts.map