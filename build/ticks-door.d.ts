#!/usr/bin/env node
/**
 * Thin x402 pay-per-pull door for Idaho hay + feeder ticks.
 *
 * One HTTP resource: GET /ticks
 *   unpaid → HTTP 402 with payment instructions (USDC on Base)
 *   paid   → JSON ticks from a local farm-plan prices cache, or an honest
 *            empty/stale payload when that cache is not on this host.
 *
 * Does not scrape, does not list on x402scan/Bazaar, does not resurrect
 * the Apollo Intelligence catalog. No keys in the repo.
 */
import { type IncomingMessage, type ServerResponse } from "node:http";
export declare const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export declare const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export declare const NETWORK_V1 = "base";
export declare const NETWORK_V2 = "eip155:8453";
export declare const TICKS_PATH = "/ticks";
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
/** Media-box default: farm-plan collector writes board.json / history.json here. */
export declare const DEFAULT_TICKS_DIR: string;
export declare function ticksDir(): string;
export declare function loadTicks(): TicksPayload;
export declare function paymentRequiredBody(resourceUrl: string): Record<string, unknown>;
export declare function paymentRequiredV2(resourceUrl: string): Record<string, unknown>;
export declare function handleRequest(req: IncomingMessage, res: ServerResponse, port: number): void;
export declare function bindHost(): string;
export declare function createTicksServer(port?: number): {
    server: import("http").Server<typeof IncomingMessage, typeof ServerResponse>;
    port: number;
};
//# sourceMappingURL=ticks-door.d.ts.map