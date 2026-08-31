/**
 * Shop catalog derived from live /.well-known/x402.
 * Door count is whatever well-known lists today — never hardcoded.
 */
export declare const LIVE_ORIGIN = "https://ticks.bnm.farm";
export declare const WELL_KNOWN_PATH = "/.well-known/x402";
export declare const OPENAPI_PATH = "/openapi.json";
export declare const MCP_PATH = "/mcp";
export declare const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export declare const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export declare const NETWORK = "eip155:8453";
export declare const TABLE_PATHS: Set<string>;
export declare const MARINER_PATHS: Set<string>;
export declare const SEARCH_TOOL_NAME = "search";
export declare const FIRM_CHECK_TOOL_NAME = "firm-check";
export declare const GET_PAGE_TOOL_NAME = "get-page";
export declare const GET_ONE_TOOL_NAME = "get-one";
export type WellKnownDoc = {
    resources?: unknown;
    instructions?: unknown;
    [key: string]: unknown;
};
export type OpenApiDoc = {
    info?: {
        title?: string;
        description?: string;
        version?: string;
    };
    paths?: Record<string, {
        get?: {
            summary?: string;
            description?: string;
        };
    }>;
};
export type LivePaidSku = {
    path: string;
    name: string;
    kind: "table" | "mariners" | "body";
    price: string;
    bag: string;
    searchMd: string;
};
export declare function resourcePath(raw: string): string | null;
export declare function skuKind(path: string): LivePaidSku["kind"];
export declare function skuPrice(kind: LivePaidSku["kind"]): string;
export declare function searchMarkdown(path: string): string;
export declare function bagForPath(path: string, openApi?: OpenApiDoc): string;
export declare function paidPathsFromWellKnown(wellKnown: WellKnownDoc): string[];
export declare function skusFromWellKnown(wellKnown: WellKnownDoc, openApi?: OpenApiDoc): LivePaidSku[];
export declare function extraMcpToolNames(): string[];
export declare function assertNoHardcodedDoorCount(text: string): void;
export declare function shopIndexMarkdown(skus: LivePaidSku[]): string;
export declare function readmeMarkdown(skus: LivePaidSku[]): string;
export declare function fetchJson(url: string): Promise<unknown>;
export declare function fetchLiveCatalog(origin?: string): Promise<{
    wellKnown: WellKnownDoc;
    openApi: OpenApiDoc;
    skus: LivePaidSku[];
}>;
//# sourceMappingURL=shop-catalog.d.ts.map