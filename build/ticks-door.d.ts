#!/usr/bin/env node
/**
 * Thin x402 pay-per-pull door for the BNM Data Shop.
 *
 * GET /ticks — Idaho hay + feeder ticks ($0.02 USDC on Base)
 * GET /import-alerts — FDA Import Alert / DWPE firm ticks ($0.05)
 * GET /import-alerts/manifest.json — free catalog + schema + sample rows
 * GET /mariners — USCG D13 / Northwest Local Notice to Mariners ($0.05)
 * GET /mariners/manifest.json — free count + official source (no notice body)
 *
 * Unpaid paid paths → HTTP 402. Does not list on x402scan/Bazaar, does not
 * resurrect the Apollo Intelligence catalog. No keys in the repo.
 */
import { type IncomingMessage, type ServerResponse } from "node:http";
export declare const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export declare const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export declare const NETWORK_V1 = "base";
export declare const NETWORK_V2 = "eip155:8453";
export declare const TICKS_PATH = "/ticks";
export declare const MANIFEST_PATH = "/manifest.json";
export declare const CATALOG_PATH = "/catalog.json";
export declare const PRODUCT_ID = "idaho-hay-feeder-ticks";
export declare const PRODUCT_NAME = "Idaho + PNW Market Ticks";
export declare const PRODUCT_VERSION = "1.1.0";
export type TickStatus = "ok" | "empty" | "stale";
export type TicksPayload = {
    ok: true;
    product: "idaho-hay-feeder-ticks";
    sources: string[];
    status: TickStatus;
    reason: string | null;
    fetchedAt: string | null;
    ticks: unknown[];
    failed: unknown[];
    history: {
        points: unknown[];
        emptyReports: unknown[];
        series: unknown[];
    };
};
export type DoorSku = "ticks" | "import-alerts" | "mariners";
/** x402 Bazaar discovery block (v2 PAYMENT-REQUIRED extensions.bazaar). */
export declare function bazaarExtension(sku: DoorSku): Record<string, unknown>;
/** Media-box default: farm-plan collector writes board.json / history.json here. */
export declare const DEFAULT_TICKS_DIR: string;
export declare function ticksDir(): string;
export declare function isOrganicHay(row: Record<string, unknown>): boolean;
export declare function publicEmptyReport(row: Record<string, unknown>): {
    id: string;
    status: "empty";
} | null;
export declare function loadTicks(): TicksPayload;
export declare function buildTicksManifest(resourceUrl?: string): Record<string, unknown>;
export declare function paymentRequiredBody(resourceUrl: string, sku?: DoorSku): Record<string, unknown>;
export declare function paymentRequiredV2(resourceUrl: string, sku?: DoorSku): Record<string, unknown>;
export declare function handleRequest(req: IncomingMessage, res: ServerResponse, port: number): Promise<void>;
export declare function bindHost(): string;
export declare function createTicksServer(port?: number): {
    server: import("http").Server<typeof IncomingMessage, typeof ServerResponse>;
    port: number;
};
//# sourceMappingURL=ticks-door.d.ts.map