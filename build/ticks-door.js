#!/usr/bin/env node
/**
 * Thin x402 pay-per-pull door for the BNM Data Shop.
 *
 * GET /ticks — Idaho hay + feeder ticks ($0.02 USDC on Base)
 * GET /import-alerts — FDA Import Alert / DWPE firm ticks ($0.05)
 * GET /import-alerts/manifest.json — free catalog + schema + sample rows
 *
 * Unpaid paid paths → HTTP 402. Does not list on x402scan/Bazaar, does not
 * resurrect the Apollo Intelligence catalog. No keys in the repo.
 */
import { createServer as createHttpServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { IMPORT_ALERTS_AMOUNT_ATOMIC, IMPORT_ALERTS_MANIFEST_PATH, IMPORT_ALERTS_PATH, TICKS_AMOUNT_ATOMIC, loadImportAlerts, loadManifest, } from "./import-alerts.js";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const NETWORK_V1 = "base";
export const NETWORK_V2 = "eip155:8453";
export const TICKS_PATH = "/ticks";
const PUBLIC_SOURCE_MARKERS = [
    "twin falls",
    "blackfoot",
    "ams_3056",
    "ams-3056",
    "ams_3059",
    "ams-3059",
    "northwest direct",
    "idaho direct hay",
    "idaho hay",
];
const PUBLIC_SERIES_PREFIXES = [
    "cattle-tf-",
    "cattle-bf-",
    "cattle-nw-",
    "hay-id-",
];
function env(name, fallback = "") {
    return (process.env[name] ?? fallback).trim();
}
function amountAtomicFor(sku) {
    if (sku === "import-alerts") {
        const raw = env("IMPORT_ALERTS_USDC_ATOMIC");
        return raw.length > 0 ? raw : IMPORT_ALERTS_AMOUNT_ATOMIC;
    }
    const raw = env("X402_USDC_ATOMIC");
    return raw.length > 0 ? raw : TICKS_AMOUNT_ATOMIC;
}
const SKU_COPY = {
    ticks: {
        description: "Idaho hay + feeder ticks (Twin Falls, Blackfoot, AMS_3056, AMS_3059)",
        resourcePath: TICKS_PATH,
    },
    "import-alerts": {
        description: "FDA Import Alert / DWPE firm ticks (official cms_ia HTML)",
        resourcePath: IMPORT_ALERTS_PATH,
    },
};
/** Media-box default: farm-plan collector writes board.json / history.json here. */
export const DEFAULT_TICKS_DIR = join(homedir(), "projects/farm-plan/data/prices");
export function ticksDir() {
    if (Object.prototype.hasOwnProperty.call(process.env, "TICKS_DIR")) {
        const explicit = env("TICKS_DIR");
        if (explicit)
            return resolve(explicit);
        if (env("FARM_DATA_DIR"))
            return resolve(env("FARM_DATA_DIR"), "prices");
        return "";
    }
    if (env("FARM_DATA_DIR"))
        return resolve(env("FARM_DATA_DIR"), "prices");
    return resolve(DEFAULT_TICKS_DIR);
}
function boardPath() {
    const explicit = env("TICKS_PATH");
    if (explicit)
        return resolve(explicit);
    const dir = ticksDir();
    return dir ? resolve(dir, "board.json") : "";
}
function historyPath() {
    const dir = ticksDir();
    if (dir)
        return resolve(dir, "history.json");
    const board = boardPath();
    return board ? resolve(board, "..", "history.json") : "";
}
function isPublicTick(row) {
    const id = String(row.id ?? row.series ?? "").toLowerCase();
    if (PUBLIC_SERIES_PREFIXES.some((p) => id.startsWith(p)))
        return true;
    const blob = [
        row.source,
        row.market,
        row.source_url,
        row.sourceUrl,
        row.label,
        row.id,
    ]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");
    return PUBLIC_SOURCE_MARKERS.some((m) => blob.includes(m));
}
function asRecordArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((item) => !!item && typeof item === "object");
}
function readJsonFile(path) {
    if (!path || !existsSync(path) || !statSync(path).isFile())
        return null;
    try {
        const parsed = JSON.parse(readFileSync(path, "utf-8"));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : null;
    }
    catch {
        return null;
    }
}
export function loadTicks() {
    const boardFile = boardPath();
    const histFile = historyPath();
    const board = readJsonFile(boardFile);
    const historyFile = readJsonFile(histFile);
    const rows = asRecordArray(board?.rows).filter(isPublicTick);
    const failed = asRecordArray(board?.failed).filter(isPublicTick);
    const hist = (board?.history && typeof board.history === "object"
        ? board.history
        : historyFile) ?? {};
    const points = asRecordArray(hist.points).filter(isPublicTick);
    const emptyReports = asRecordArray(hist.emptyReports).filter(isPublicTick);
    const series = asRecordArray(hist.series).filter(isPublicTick);
    const fetchedAt = typeof board?.fetchedAt === "string"
        ? board.fetchedAt
        : typeof board?.cachedAt === "string"
            ? board.cachedAt
            : null;
    if (!board && !historyFile) {
        return {
            ok: true,
            product: "idaho-hay-feeder-ticks",
            sources: ["Twin Falls", "Blackfoot", "AMS_3056 hay", "AMS_3059 NW Direct"],
            status: "empty",
            reason: `Ticks are not on this host. Default cache is ${DEFAULT_TICKS_DIR} (board.json / history.json). Set TICKS_DIR or TICKS_PATH.`,
            fetchedAt: null,
            ticks: [],
            failed: [],
            history: { points: [], emptyReports: [], series: [] },
        };
    }
    const hasTicks = rows.length + points.length > 0;
    return {
        ok: true,
        product: "idaho-hay-feeder-ticks",
        sources: ["Twin Falls", "Blackfoot", "AMS_3056 hay", "AMS_3059 NW Direct"],
        status: hasTicks ? "ok" : "stale",
        reason: hasTicks
            ? null
            : "Price cache is present but has no Twin Falls / Blackfoot / AMS_3056 / AMS_3059 ticks.",
        fetchedAt,
        ticks: rows,
        failed,
        history: { points, emptyReports, series },
    };
}
export function paymentRequiredBody(resourceUrl, sku = "ticks") {
    const amount = amountAtomicFor(sku);
    const copy = SKU_COPY[sku];
    const acceptV1 = {
        scheme: "exact",
        network: NETWORK_V1,
        asset: USDC_BASE,
        payTo: PAY_TO,
        resource: resourceUrl,
        description: copy.description,
        mimeType: "application/json",
        outputSchema: null,
        maxTimeoutSeconds: 60,
        extra: { name: "USDC", version: "2" },
        maxAmountRequired: amount,
    };
    return {
        x402Version: 1,
        error: "X-PAYMENT header is required",
        accepts: [acceptV1],
        payTo: PAY_TO,
        network: NETWORK_V1,
        asset: USDC_BASE,
        resource: copy.resourcePath,
    };
}
export function paymentRequiredV2(resourceUrl, sku = "ticks") {
    const amount = amountAtomicFor(sku);
    const copy = SKU_COPY[sku];
    const accept = {
        scheme: "exact",
        network: NETWORK_V2,
        asset: USDC_BASE,
        payTo: PAY_TO,
        maxTimeoutSeconds: 60,
        extra: { name: "USDC", version: "2" },
        amount,
    };
    return {
        x402Version: 2,
        error: "PAYMENT-SIGNATURE header is required",
        resource: {
            url: resourceUrl,
            description: copy.description,
            mimeType: "application/json",
        },
        accepts: [accept],
        extensions: {},
    };
}
function paymentHeader(req) {
    const raw = req.headers["x-payment"] ??
        req.headers["payment-signature"] ??
        req.headers["PAYMENT-SIGNATURE"];
    if (typeof raw === "string" && raw.trim())
        return raw.trim();
    if (Array.isArray(raw) && raw[0])
        return String(raw[0]).trim();
    return null;
}
function skipSettle() {
    return env("X402_SKIP_SETTLE") === "1";
}
async function facilitatorVerify(payment, requirements) {
    const base = env("X402_FACILITATOR_URL");
    if (!base)
        return false;
    const url = `${base.replace(/\/$/, "")}/verify`;
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                x402Version: 1,
                paymentHeader: payment,
                paymentRequirements: requirements,
            }),
        });
        if (!res.ok)
            return false;
        const body = (await res.json());
        return body.isValid === true || body.success === true;
    }
    catch {
        return false;
    }
}
function sendJson(res, status, body, extraHeaders = {}) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE, PAYMENT-RESPONSE",
        ...extraHeaders,
    });
    res.end(payload);
}
function resourceUrl(req, port, path) {
    const configured = env("X402_RESOURCE_URL");
    if (configured)
        return configured.replace(/\/$/, "") + path;
    const host = req.headers.host || `127.0.0.1:${port}`;
    return `http://${host}${path}`;
}
async function servePaid(req, res, port, sku, load) {
    const copy = SKU_COPY[sku];
    const payment = paymentHeader(req);
    const resource = resourceUrl(req, port, copy.resourcePath);
    const body402 = paymentRequiredBody(resource, sku);
    const v2 = paymentRequiredV2(resource, sku);
    const paymentRequiredHeader = Buffer.from(JSON.stringify(v2), "utf-8").toString("base64");
    if (!payment) {
        sendJson(res, 402, body402, { "PAYMENT-REQUIRED": paymentRequiredHeader });
        return;
    }
    const serve = async () => sendJson(res, 200, await load());
    if (skipSettle()) {
        await serve();
        return;
    }
    const accept = body402.accepts[0];
    const ok = await facilitatorVerify(payment, accept);
    if (ok) {
        await serve();
        return;
    }
    sendJson(res, 402, {
        ...body402,
        error: "Payment present but not settled. Set X402_FACILITATOR_URL or pay with a valid x402 X-PAYMENT header.",
    }, { "PAYMENT-REQUIRED": paymentRequiredHeader });
}
export async function handleRequest(req, res, port) {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "X-PAYMENT, PAYMENT-SIGNATURE, Content-Type",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
        });
        res.end();
        return;
    }
    if (req.method !== "GET") {
        sendJson(res, 405, { error: "method_not_allowed" });
        return;
    }
    if (path === "/") {
        const dir = ticksDir();
        sendJson(res, 200, {
            shop: "bnm-data-shop",
            payTo: PAY_TO,
            network: NETWORK_V1,
            asset: USDC_BASE,
            products: [
                {
                    path: TICKS_PATH,
                    product: "idaho-hay-feeder-ticks",
                    priceUsdc: "0.02",
                    amountAtomic: amountAtomicFor("ticks"),
                },
                {
                    path: IMPORT_ALERTS_PATH,
                    product: "fda-import-alerts",
                    priceUsdc: "0.05",
                    amountAtomic: amountAtomicFor("import-alerts"),
                    manifest: IMPORT_ALERTS_MANIFEST_PATH,
                },
            ],
            ticksDir: dir || null,
            board: boardPath() && existsSync(boardPath()) ? boardPath() : null,
        });
        return;
    }
    if (path === IMPORT_ALERTS_MANIFEST_PATH) {
        sendJson(res, 200, await loadManifest());
        return;
    }
    if (path === IMPORT_ALERTS_PATH) {
        await servePaid(req, res, port, "import-alerts", () => loadImportAlerts());
        return;
    }
    if (path === TICKS_PATH) {
        await servePaid(req, res, port, "ticks", () => loadTicks());
        return;
    }
    sendJson(res, 404, { error: "not_found", paths: [TICKS_PATH, IMPORT_ALERTS_PATH, IMPORT_ALERTS_MANIFEST_PATH] });
}
export function bindHost() {
    return env("BIND_HOST", "0.0.0.0");
}
export function createTicksServer(port = Number(env("PORT", "4020")) || 4020) {
    const server = createHttpServer((req, res) => {
        void handleRequest(req, res, port).catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            if (!res.headersSent)
                sendJson(res, 500, { error: "server_error", message });
        });
    });
    return { server, port };
}
function isMain() {
    const entry = process.argv[1] ? resolve(process.argv[1]) : "";
    return Boolean(entry && import.meta.url === `file://${entry}`);
}
if (isMain()) {
    const { server, port } = createTicksServer();
    const host = bindHost();
    server.listen(port, host, () => {
        const board = boardPath();
        console.error(`bnm data shop x402 door on ${host}:${port}`);
        console.error(`${TICKS_PATH} $${Number(amountAtomicFor("ticks")) / 1e6} USDC`);
        console.error(`${IMPORT_ALERTS_PATH} $${Number(amountAtomicFor("import-alerts")) / 1e6} USDC`);
        console.error(`payTo ${PAY_TO} USDC ${USDC_BASE} on Base`);
        console.error(`ticksDir ${ticksDir() || "(unset)"}`);
        console.error(`board ${board && existsSync(board) ? board : "missing — paid /ticks body will be empty/stale"}`);
    });
}
//# sourceMappingURL=ticks-door.js.map