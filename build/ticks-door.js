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
export const MANIFEST_PATH = "/manifest.json";
export const PRODUCT_ID = "idaho-hay-feeder-ticks";
export const PRODUCT_NAME = "Idaho + PNW Market Ticks";
export const PRODUCT_VERSION = "1.1.0";
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
    "if_fv130",
    "if-fv130",
    "idaho falls",
    "idaho barley commission",
    "ibc.id.grain",
    "water district 1",
    "rental pool",
    "wd1.",
    "ams_3058",
    "ams-3058",
    "ams_2914",
    "ams-2914",
    "ams.2914",
    "columbia basin",
    "columbia_umatilla",
    "umatilla",
];
const PUBLIC_SERIES_PREFIXES = [
    "cattle-tf-",
    "cattle-bf-",
    "cattle-nw-",
    "hay-id-",
    "hay.ams_3058.",
    "ibc.id.grain.",
    "wd1.",
    "ams.2914.",
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
        description: "Idaho + PNW official ticks: hay, feeder, IF_FV130, IBC grain, WD1, AMS 3058, AMS 2914",
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
            sources: [
                "Twin Falls",
                "Blackfoot",
                "AMS_3056 hay",
                "AMS_3059 NW Direct",
                "IF_FV130 onions/potatoes",
                "IBC Idaho elevator grain",
                "WD1 rental-pool $/AF",
                "AMS_3058 Columbia Basin hay",
                "IF_FV130 WA-OR produce",
                "AMS_2914 PNW pulses",
            ],
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
        sources: [
            "Twin Falls",
            "Blackfoot",
            "AMS_3056 hay",
            "AMS_3059 NW Direct",
            "IF_FV130 onions/potatoes",
            "IBC Idaho elevator grain",
            "WD1 rental-pool $/AF",
            "AMS_3058 Columbia Basin hay",
            "IF_FV130 WA-OR produce",
            "AMS_2914 PNW pulses",
        ],
        status: hasTicks ? "ok" : "stale",
        reason: hasTicks
            ? null
            : "Price cache is present but has no official hay / feeder / IF_FV130 / IBC / WD1 / 3058 / 2914 ticks.",
        fetchedAt,
        ticks: rows,
        failed,
        history: { points, emptyReports, series },
    };
}
const GROUP_LABELS = [
    { id: "hay", name: "Hay" },
    { id: "cattle", name: "Cattle" },
    { id: "produce", name: "Produce" },
    { id: "grain", name: "Grain" },
    { id: "water", name: "Water" },
    { id: "pulses", name: "Pulses" },
];
const SAMPLE_SERIES_IDS = [
    "cattle-tf-feeder-steer",
    "hay.ams_3058.columbia_basin.alfalfa.premium",
    "ams.if_fv130.onion.yellow_hybrid.us1.sack50.jumbo.columbia_umatilla",
    "ibc.id.grain.idaho_falls.barley_malting",
    "ams.2914.pnw.garbanzo",
];
function originFromResource(resourceUrl) {
    return resourceUrl.replace(/\/ticks\/?$/, "") || "https://ticks.bnm.farm";
}
function str(value) {
    return typeof value === "string" ? value : value == null ? "" : String(value);
}
function num(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function inferCadence(source, market) {
    const blob = `${source} ${market}`;
    if (/weekly/i.test(blob))
        return "weekly";
    if (/wednesday/i.test(blob))
        return "wednesday auction";
    if (/rental pool procedures/i.test(blob))
        return "posted procedures";
    return null;
}
function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
function latestDate(values) {
    const dates = values.filter((v) => /^\d{4}-\d{2}-\d{2}/.test(v)).sort();
    return dates.at(-1) ?? null;
}
function sampleFromRow(row, seriesLabel) {
    return {
        sample: true,
        id: str(row.id),
        name: seriesLabel || str(row.label) || str(row.commodity),
        group: str(row.group),
        commodity: str(row.commodity) || null,
        market: str(row.market) || null,
        unit: str(row.unit) || null,
        asOf: str(row.asOf) || null,
        price: num(row.price),
        source: str(row.source) || null,
    };
}
export function buildTicksManifest(resourceUrl = "https://ticks.bnm.farm/ticks") {
    const payload = loadTicks();
    const origin = originFromResource(resourceUrl);
    const ticks = payload.ticks;
    const failed = payload.failed;
    const series = payload.history.series;
    const points = payload.history.points;
    const emptyReports = payload.history.emptyReports;
    const seriesById = new Map(series.map((s) => [str(s.id), s]));
    const pointsBySeries = new Map();
    for (const point of points) {
        const id = str(point.series || point.id);
        if (!id)
            continue;
        const day = str(point.reportDate || point.asOf).slice(0, 10);
        const prev = pointsBySeries.get(id) || { count: 0, first: null, last: null };
        prev.count += 1;
        if (day) {
            if (!prev.first || day < prev.first)
                prev.first = day;
            if (!prev.last || day > prev.last)
                prev.last = day;
        }
        pointsBySeries.set(id, prev);
    }
    const asOfBySource = {};
    for (const row of ticks) {
        const source = str(row.source);
        const asOf = str(row.asOf).slice(0, 10);
        if (!source || !asOf)
            continue;
        if (!asOfBySource[source] || asOf > asOfBySource[source])
            asOfBySource[source] = asOf;
    }
    const groups = GROUP_LABELS.map((group) => {
        const rows = ticks.filter((row) => str(row.group) === group.id);
        const bySource = new Map();
        for (const row of rows) {
            const key = str(row.source) || "unknown";
            const list = bySource.get(key) || [];
            list.push(row);
            bySource.set(key, list);
        }
        const sources = [...bySource.entries()].map(([name, sourceRows]) => {
            const ids = sourceRows.map((row) => str(row.id));
            const hist = ids.map((id) => pointsBySeries.get(id)).filter(Boolean);
            return {
                name,
                sourceUrl: str(sourceRows[0]?.sourceUrl) || null,
                cadence: inferCadence(name, str(sourceRows[0]?.market)),
                tickCount: sourceRows.length,
                latestAsOf: latestDate(sourceRows.map((row) => str(row.asOf).slice(0, 10))),
                geography: uniqueSorted(sourceRows.map((row) => str(row.market))),
                units: uniqueSorted(sourceRows.map((row) => str(row.unit))),
                history: {
                    seriesWithPoints: hist.length,
                    pointCount: hist.reduce((n, h) => n + (h?.count ?? 0), 0),
                },
                series: sourceRows.map((row) => ({
                    id: str(row.id),
                    name: str(seriesById.get(str(row.id))?.label) || str(row.label) || str(row.commodity),
                })),
            };
        });
        return {
            id: group.id,
            name: group.name,
            tickCount: rows.length,
            units: uniqueSorted(rows.map((row) => str(row.unit))),
            geography: uniqueSorted(rows.map((row) => str(row.market))),
            latestAsOf: latestDate(rows.map((row) => str(row.asOf).slice(0, 10))),
            history: {
                available: rows.some((row) => (pointsBySeries.get(str(row.id))?.count ?? 0) > 0),
                pointCount: rows.reduce((n, row) => n + (pointsBySeries.get(str(row.id))?.count ?? 0), 0),
            },
            sources,
        };
    }).filter((group) => group.tickCount > 0 || group.sources.length > 0);
    const samples = [];
    const used = new Set();
    for (const id of SAMPLE_SERIES_IDS) {
        const row = ticks.find((t) => str(t.id) === id);
        if (!row)
            continue;
        samples.push(sampleFromRow(row, str(seriesById.get(id)?.label)));
        used.add(id);
    }
    for (const group of GROUP_LABELS) {
        if (samples.length >= 5)
            break;
        const row = ticks.find((t) => str(t.group) === group.id && !used.has(str(t.id)));
        if (!row)
            continue;
        samples.push(sampleFromRow(row, str(seriesById.get(str(row.id))?.label)));
        used.add(str(row.id));
    }
    const empty = [
        ...failed.map((item) => ({
            status: "empty",
            product: false,
            id: str(item.id) || null,
            name: str(item.label) || str(item.id) || "empty report",
            reason: str(item.reason) || "No official row. Not a product.",
            source: str(item.source) || null,
            sourceUrl: str(item.sourceUrl) || null,
        })),
        ...emptyReports
            .filter((item) => /organic/i.test(`${item.series ?? ""} ${item.reason ?? ""}`))
            .slice(-1)
            .map((item) => ({
            status: "empty",
            product: false,
            id: str(item.series) || "hay-idaho-organic",
            name: "USDA organic (Idaho) hay",
            reason: str(item.reason) || "Official print has no organic row. Not a product.",
            source: str(item.source) || null,
            sourceUrl: str(item.sourceUrl) || null,
            latestEmptyAsOf: str(item.reportDate).slice(0, 10) || null,
        })),
    ];
    const amount = amountAtomicFor("ticks");
    return {
        ok: true,
        product: {
            id: PRODUCT_ID,
            name: PRODUCT_NAME,
            version: PRODUCT_VERSION,
        },
        paidEndpoint: `${origin}${TICKS_PATH}`,
        discoveryUrl: `${origin}/`,
        manifestUrl: `${origin}${MANIFEST_PATH}`,
        priceAtomic: amount,
        priceDisplay: amount === "20000" ? "$0.02" : amount ? `${amount} atomic USDC` : null,
        network: NETWORK_V2,
        networkName: "Base",
        asset: USDC_BASE,
        assetSymbol: "USDC",
        payTo: PAY_TO,
        fetchedAt: payload.fetchedAt,
        latestAsOfBySource: asOfBySource,
        tickCount: ticks.length,
        status: payload.status,
        schema: {
            tickFields: {
                id: "string — deterministic series id",
                group: "hay | cattle | produce | grain | water | pulses",
                commodity: "string",
                label: "string",
                market: "string — geography / barn / shipping point",
                classGrade: "string",
                unit: "$/ton | $/cwt | $/pair | $/50 lb | $/25 lb | $/bu | $/AF",
                price: "number | null — official print only",
                lo: "number | optional",
                hi: "number | optional",
                mid: "number | optional",
                asOf: "YYYY-MM-DD",
                source: "string",
                sourceUrl: "string — official PDF or page",
                note: "string | optional",
            },
            paidResponse: {
                ticks: "current official snapshot (all public series on this collect)",
                failed: "current honest-empty / failed official fetches",
                history: {
                    series: "id / label / unit / group catalog",
                    points: "dated official prints already stored — days between reports are not filled in",
                    emptyReports: "official prints with no row (organic hay stays empty)",
                },
                fetchedAt: "ISO timestamp of the last official collect",
            },
        },
        groups,
        empty,
        samples,
        sampleNote: "samples are marked sample:true and are a few real official rows for identification. The paid GET /ticks body has the full current snapshot. This manifest does not list every current price.",
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
function decodePayment(payment) {
    const tryParse = (raw) => {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? parsed
                : null;
        }
        catch {
            return null;
        }
    };
    return tryParse(payment) ?? tryParse(Buffer.from(payment, "base64").toString("utf8"));
}
function paymentPayload(payment) {
    const decoded = decodePayment(payment);
    if (!decoded)
        return null;
    if (decoded.payload && typeof decoded.payload === "object")
        return decoded;
    if (decoded.authorization && decoded.signature) {
        return { x402Version: 1, scheme: "exact", network: NETWORK_V1, payload: decoded };
    }
    return decoded;
}
function facilitatorBody(payment, requirements) {
    const payload = paymentPayload(payment);
    return {
        x402Version: payload?.x402Version ?? 1,
        paymentPayload: payload ?? { paymentHeader: payment },
        paymentRequirements: requirements,
        paymentHeader: payment,
    };
}
async function facilitatorPost(path, payment, requirements) {
    const base = env("X402_FACILITATOR_URL");
    if (!base)
        return null;
    const url = `${base.replace(/\/$/, "")}${path}`;
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(facilitatorBody(payment, requirements)),
        });
        const text = await res.text();
        let body = {};
        try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
                body = parsed;
        }
        catch {
            body = { rawStatus: res.status };
        }
        if (!res.ok) {
            console.error(`facilitator ${path} HTTP ${res.status}`);
            return null;
        }
        return body;
    }
    catch (err) {
        console.error(`facilitator ${path} error ${err instanceof Error ? err.name : "unknown"}`);
        return null;
    }
}
async function facilitatorVerify(payment, requirements) {
    const body = await facilitatorPost("/verify", payment, requirements);
    if (!body)
        return false;
    return body.isValid === true || body.success === true;
}
async function facilitatorSettle(payment, requirements) {
    const body = await facilitatorPost("/settle", payment, requirements);
    if (!body)
        return false;
    return body.success === true || body.isValid === true || typeof body.transaction === "string";
}
function localSettleKeyFile() {
    const explicit = env("X402_SETTLE_KEY_FILE");
    return explicit ? resolve(explicit) : "";
}
async function localEip3009Settle(payment, requirements) {
    const keyFile = localSettleKeyFile();
    if (!keyFile || !existsSync(keyFile))
        return false;
    const wrapper = paymentPayload(payment);
    const inner = (wrapper?.payload && typeof wrapper.payload === "object"
        ? wrapper.payload
        : wrapper) ?? {};
    const auth = (inner.authorization && typeof inner.authorization === "object"
        ? inner.authorization
        : null);
    const signature = typeof inner.signature === "string" ? inner.signature : "";
    if (!auth || !signature)
        return false;
    const wantAmount = String(requirements.maxAmountRequired ?? requirements.amount ?? "");
    const to = String(auth.to ?? "").toLowerCase();
    const value = String(auth.value ?? "");
    if (to !== PAY_TO.toLowerCase())
        return false;
    if (wantAmount && value !== wantAmount)
        return false;
    const helper = resolve(new URL("./../scripts/local-eip3009-settle.py", import.meta.url).pathname);
    if (!existsSync(helper))
        return false;
    const { spawn } = await import("node:child_process");
    return await new Promise((resolveOk) => {
        const child = spawn("python3", [helper], {
            env: { ...process.env, X402_SETTLE_KEY_FILE: keyFile },
            stdio: ["pipe", "pipe", "pipe"],
        });
        let out = "";
        child.stdout.on("data", (chunk) => {
            out += String(chunk);
        });
        child.stderr.on("data", () => {
            /* never forward; may be noisy, must not leak key */
        });
        child.on("close", (code) => {
            if (code !== 0) {
                resolveOk(false);
                return;
            }
            try {
                const parsed = JSON.parse(out);
                if (parsed.ok && parsed.tx)
                    console.error(`local eip3009 settle ${parsed.tx}`);
                resolveOk(parsed.ok === true);
            }
            catch {
                resolveOk(false);
            }
        });
        child.on("error", () => resolveOk(false));
        child.stdin.write(JSON.stringify({
            asset: USDC_BASE,
            authorization: auth,
            signature,
            requirements: { payTo: requirements.payTo, asset: requirements.asset },
        }));
        child.stdin.end();
    });
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
    const verified = await facilitatorVerify(payment, accept);
    if (verified && (await facilitatorSettle(payment, accept))) {
        await serve();
        return;
    }
    if (await localEip3009Settle(payment, accept)) {
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
                    manifest: MANIFEST_PATH,
                },
                {
                    path: IMPORT_ALERTS_PATH,
                    product: "fda-import-alerts",
                    priceUsdc: "0.05",
                    amountAtomic: amountAtomicFor("import-alerts"),
                    manifest: IMPORT_ALERTS_MANIFEST_PATH,
                },
            ],
        });
        return;
    }
    if (path === "/.well-known/x402" || path === "/.well-known/x402.json") {
        sendJson(res, 200, {
            version: 1,
            resources: [`GET ${TICKS_PATH}`, `GET ${MANIFEST_PATH}`, `GET ${IMPORT_ALERTS_PATH}`, `GET ${IMPORT_ALERTS_MANIFEST_PATH}`],
        });
        return;
    }
    if (path === MANIFEST_PATH || path === "/catalog.json") {
        sendJson(res, 200, buildTicksManifest(resourceUrl(req, port, TICKS_PATH)));
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
    sendJson(res, 404, { error: "not_found", paths: [TICKS_PATH, MANIFEST_PATH, IMPORT_ALERTS_PATH, IMPORT_ALERTS_MANIFEST_PATH] });
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