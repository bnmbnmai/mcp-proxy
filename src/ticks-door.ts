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

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

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
  "if_fv130",
  "if-fv130",
  "idaho falls",
  "idaho barley commission",
  "ibc.id.grain",
  "water district 1",
  "rental pool",
  "wd1.",
];

const PUBLIC_SERIES_PREFIXES = [
  "cattle-tf-",
  "cattle-bf-",
  "cattle-nw-",
  "hay-id-",
  "ibc.id.grain.",
  "wd1.",
];

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

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

function amountAtomic(): string | null {
  const raw = env("X402_USDC_ATOMIC");
  return raw.length > 0 ? raw : null;
}

/** Media-box default: farm-plan collector writes board.json / history.json here. */
export const DEFAULT_TICKS_DIR = join(homedir(), "projects/farm-plan/data/prices");

export function ticksDir(): string {
  if (Object.prototype.hasOwnProperty.call(process.env, "TICKS_DIR")) {
    const explicit = env("TICKS_DIR");
    if (explicit) return resolve(explicit);
    if (env("FARM_DATA_DIR")) return resolve(env("FARM_DATA_DIR"), "prices");
    return "";
  }
  if (env("FARM_DATA_DIR")) return resolve(env("FARM_DATA_DIR"), "prices");
  return resolve(DEFAULT_TICKS_DIR);
}

function boardPath(): string {
  const explicit = env("TICKS_PATH");
  if (explicit) return resolve(explicit);
  const dir = ticksDir();
  return dir ? resolve(dir, "board.json") : "";
}

function historyPath(): string {
  const dir = ticksDir();
  if (dir) return resolve(dir, "history.json");
  const board = boardPath();
  return board ? resolve(board, "..", "history.json") : "";
}

function isPublicTick(row: Record<string, unknown>): boolean {
  const id = String(row.id ?? row.series ?? "").toLowerCase();
  if (PUBLIC_SERIES_PREFIXES.some((p) => id.startsWith(p))) return true;
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

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
}

function readJsonFile(path: string): Record<string, unknown> | null {
  if (!path || !existsSync(path) || !statSync(path).isFile()) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function loadTicks(): TicksPayload {
  const boardFile = boardPath();
  const histFile = historyPath();
  const board = readJsonFile(boardFile);
  const historyFile = readJsonFile(histFile);

  const rows = asRecordArray(board?.rows).filter(isPublicTick);
  const failed = asRecordArray(board?.failed).filter(isPublicTick);
  const hist = (board?.history && typeof board.history === "object"
    ? (board.history as Record<string, unknown>)
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
      ],
      status: "empty",
      reason:
        `Ticks are not on this host. Default cache is ${DEFAULT_TICKS_DIR} (board.json / history.json). Set TICKS_DIR or TICKS_PATH.`,
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
    ],
    status: hasTicks ? "ok" : "stale",
    reason: hasTicks
      ? null
      : "Price cache is present but has no Twin Falls / Blackfoot / AMS_3056 / AMS_3059 / IF_FV130 / IBC grain / WD1 ticks.",
    fetchedAt,
    ticks: rows,
    failed,
    history: { points, emptyReports, series },
  };
}

const TICKS_DESCRIPTION =
  "Idaho hay + feeder + onion + potato + IBC grain + WD1 rental-pool ticks (Twin Falls, Blackfoot, AMS_3056, AMS_3059, IF_FV130, IBC, WD1)";

export function ticksOutputSchema(): Record<string, unknown> {
  return {
    input: {
      type: "http",
      method: "GET",
      discoverable: true,
      schema: {
        type: "object",
        properties: {},
      },
    },
    output: {
      type: "json",
      example: {
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
        ],
        status: "ok",
        reason: null,
        fetchedAt: "2026-08-14T00:00:00Z",
        ticks: [],
        failed: [],
        history: { points: [], emptyReports: [], series: [] },
      },
    },
  };
}

export function bazaarExtension(): Record<string, unknown> {
  return {
    bazaar: {
      info: ticksOutputSchema(),
    },
  };
}

export function wellKnownX402(): Record<string, unknown> {
  return {
    version: 1,
    resources: [`GET ${TICKS_PATH}`],
  };
}

export function openApiSpec(resourceUrl: string): Record<string, unknown> {
  const origin = resourceUrl.replace(/\/ticks\/?$/, "") || "https://ticks.bnm.farm";
  return {
    openapi: "3.1.0",
    info: {
      title: "Idaho ticks x402 door",
      version: "1.0.0",
      description: TICKS_DESCRIPTION,
    },
    servers: [{ url: origin }],
    paths: {
      [TICKS_PATH]: {
        get: {
          operationId: "getIdahoTicks",
          summary: TICKS_DESCRIPTION,
          description:
            "Unpaid GET returns HTTP 402 (USDC on Base, $0.02 / 20000 atomic). After a valid x402 pay, JSON ticks from the farm-plan price cache (hay, feeder cattle, IF_FV130 onions/potatoes, IBC Idaho elevator grain, WD1 rental-pool $/AF). Organic hay is honest-empty when the cache has no official organic quotes.",
          responses: {
            "402": { description: "Payment required (x402)" },
            "200": { description: "Paid ticks JSON" },
          },
        },
      },
    },
  };
}

export function paymentRequiredBody(resourceUrl: string): Record<string, unknown> {
  const amount = amountAtomic();
  const acceptV1: Record<string, unknown> = {
    scheme: "exact",
    network: NETWORK_V1,
    asset: USDC_BASE,
    payTo: PAY_TO,
    resource: resourceUrl,
    description: TICKS_DESCRIPTION,
    mimeType: "application/json",
    outputSchema: ticksOutputSchema(),
    maxTimeoutSeconds: 60,
    extra: { name: "USD Coin", version: "2", assetTransferMethod: "eip3009" },
  };
  if (amount) acceptV1.maxAmountRequired = amount;

  return {
    x402Version: 1,
    error: "X-PAYMENT header is required",
    accepts: [acceptV1],
    payTo: PAY_TO,
    network: NETWORK_V1,
    asset: USDC_BASE,
    resource: TICKS_PATH,
  };
}

export function paymentRequiredV2(resourceUrl: string): Record<string, unknown> {
  const amount = amountAtomic();
  const accept: Record<string, unknown> = {
    scheme: "exact",
    network: NETWORK_V2,
    asset: USDC_BASE,
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    extra: { name: "USD Coin", version: "2", assetTransferMethod: "eip3009" },
  };
  if (amount) accept.amount = amount;
  return {
    x402Version: 2,
    error: "PAYMENT-SIGNATURE header is required",
    resource: {
      url: resourceUrl,
      description: TICKS_DESCRIPTION,
      mimeType: "application/json",
      serviceName: "Idaho ticks",
      tags: ["idaho", "hay", "cattle", "onions", "potatoes"],
    },
    accepts: [accept],
    extensions: bazaarExtension(),
  };
}

function paymentHeader(req: IncomingMessage): string | null {
  const raw =
    req.headers["x-payment"] ??
    req.headers["payment-signature"] ??
    req.headers["PAYMENT-SIGNATURE"];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return null;
}

function skipSettle(): boolean {
  return env("X402_SKIP_SETTLE") === "1";
}

function decodePayment(payment: string): Record<string, unknown> | null {
  const tryParse = (raw: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };
  return tryParse(payment) ?? tryParse(Buffer.from(payment, "base64").toString("utf8"));
}

function paymentPayload(payment: string): Record<string, unknown> | null {
  const decoded = decodePayment(payment);
  if (!decoded) return null;
  if (decoded.payload && typeof decoded.payload === "object") return decoded;
  if (decoded.authorization && decoded.signature) {
    return { x402Version: 1, scheme: "exact", network: NETWORK_V1, payload: decoded };
  }
  return decoded;
}

function facilitatorBody(payment: string, requirements: Record<string, unknown>): Record<string, unknown> {
  const payload = paymentPayload(payment);
  return {
    x402Version: payload?.x402Version ?? 1,
    paymentPayload: payload ?? { paymentHeader: payment },
    paymentRequirements: requirements,
    paymentHeader: payment,
  };
}

async function facilitatorPost(
  path: "/verify" | "/settle",
  payment: string,
  requirements: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const base = env("X402_FACILITATOR_URL");
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(facilitatorBody(payment, requirements)),
    });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
    } catch {
      body = { rawStatus: res.status };
    }
    if (!res.ok) {
      console.error(`facilitator ${path} HTTP ${res.status}`);
      return null;
    }
    return body;
  } catch (err) {
    console.error(`facilitator ${path} error ${err instanceof Error ? err.name : "unknown"}`);
    return null;
  }
}

async function facilitatorVerify(payment: string, requirements: Record<string, unknown>): Promise<boolean> {
  const body = await facilitatorPost("/verify", payment, requirements);
  if (!body) return false;
  return body.isValid === true || body.success === true;
}

async function facilitatorSettle(payment: string, requirements: Record<string, unknown>): Promise<boolean> {
  const body = await facilitatorPost("/settle", payment, requirements);
  if (!body) return false;
  return body.success === true || body.isValid === true || typeof body.transaction === "string";
}

function localSettleKeyFile(): string {
  const explicit = env("X402_SETTLE_KEY_FILE");
  return explicit ? resolve(explicit) : "";
}

async function localEip3009Settle(payment: string, requirements: Record<string, unknown>): Promise<boolean> {
  const keyFile = localSettleKeyFile();
  if (!keyFile || !existsSync(keyFile)) return false;
  const wrapper = paymentPayload(payment);
  const inner = (wrapper?.payload && typeof wrapper.payload === "object"
    ? (wrapper.payload as Record<string, unknown>)
    : wrapper) ?? {};
  const auth = (inner.authorization && typeof inner.authorization === "object"
    ? (inner.authorization as Record<string, unknown>)
    : null);
  const signature = typeof inner.signature === "string" ? inner.signature : "";
  if (!auth || !signature) return false;
  const wantAmount = amountAtomic();
  const to = String(auth.to ?? "").toLowerCase();
  const value = String(auth.value ?? "");
  if (to !== PAY_TO.toLowerCase()) return false;
  if (wantAmount && value !== wantAmount) return false;
  const helper = resolve(new URL("./../scripts/local-eip3009-settle.py", import.meta.url).pathname);
  if (!existsSync(helper)) return false;
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
        const parsed = JSON.parse(out) as { ok?: boolean; tx?: string };
        if (parsed.ok && parsed.tx) console.error(`local eip3009 settle ${parsed.tx}`);
        resolveOk(parsed.ok === true);
      } catch {
        resolveOk(false);
      }
    });
    child.on("error", () => resolveOk(false));
    child.stdin.write(
      JSON.stringify({
        asset: USDC_BASE,
        authorization: auth,
        signature,
        requirements: { payTo: requirements.payTo, asset: requirements.asset },
      }),
    );
    child.stdin.end();
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}): void {
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

function resourceUrl(req: IncomingMessage, port: number): string {
  const configured = env("X402_RESOURCE_URL");
  if (configured) return configured.replace(/\/$/, "") + TICKS_PATH;
  const host = req.headers.host || `127.0.0.1:${port}`;
  return `http://${host}${TICKS_PATH}`;
}

export function handleRequest(req: IncomingMessage, res: ServerResponse, port: number): void {
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
      door: "idaho-hay-feeder-ticks",
      path: TICKS_PATH,
      payTo: PAY_TO,
      network: NETWORK_V1,
      asset: USDC_BASE,
      priceAtomic: amountAtomic(),
    });
    return;
  }

  if (path === "/.well-known/x402" || path === "/.well-known/x402.json") {
    sendJson(res, 200, wellKnownX402());
    return;
  }

  if (path === "/openapi.json") {
    sendJson(res, 200, openApiSpec(resourceUrl(req, port)));
    return;
  }

  if (path !== TICKS_PATH) {
    sendJson(res, 404, { error: "not_found", path: TICKS_PATH });
    return;
  }

  const payment = paymentHeader(req);
  const resource = resourceUrl(req, port);
  const body402 = paymentRequiredBody(resource);
  const v2 = paymentRequiredV2(resource);
  const paymentRequiredHeader = Buffer.from(JSON.stringify(v2), "utf-8").toString("base64");

  if (!payment) {
    sendJson(res, 402, body402, { "PAYMENT-REQUIRED": paymentRequiredHeader });
    return;
  }

  const serve = () => sendJson(res, 200, loadTicks());

  if (skipSettle()) {
    serve();
    return;
  }

  const accept = (body402.accepts as Record<string, unknown>[])[0];
  void (async () => {
    const verified = await facilitatorVerify(payment, accept);
    if (verified && (await facilitatorSettle(payment, accept))) {
      serve();
      return;
    }
    if (await localEip3009Settle(payment, accept)) {
      serve();
      return;
    }
    sendJson(
      res,
      402,
      {
        ...body402,
        error: "Payment present but not settled. Set X402_FACILITATOR_URL or pay with a valid x402 X-PAYMENT header.",
      },
      { "PAYMENT-REQUIRED": paymentRequiredHeader },
    );
  })();
}

export function bindHost(): string {
  return env("BIND_HOST", "0.0.0.0");
}

export function createTicksServer(port = Number(env("PORT", "4020")) || 4020) {
  const server = createHttpServer((req, res) => {
    try {
      handleRequest(req, res, port);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendJson(res, 500, { error: "server_error", message });
    }
  });
  return { server, port };
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  const { server, port } = createTicksServer();
  const host = bindHost();
  server.listen(port, host, () => {
    const board = boardPath();
    console.error(`idaho ticks x402 door on ${host}:${port}${TICKS_PATH}`);
    console.error(`payTo ${PAY_TO} USDC ${USDC_BASE} on Base`);
    console.error(`ticksDir ${ticksDir() || "(unset)"}`);
    console.error(`board ${board && existsSync(board) ? board : "missing — paid body will be empty/stale"}`);
  });
}
