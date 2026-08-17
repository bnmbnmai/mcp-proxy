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
import { resolve } from "node:path";

export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const NETWORK_V1 = "base";
export const NETWORK_V2 = "eip155:8453";
export const TICKS_PATH = "/ticks";

const PUBLIC_SOURCE_MARKERS = [
  "twin falls",
  "blackfoot",
  "ams_3056",
  "ams_3059",
  "northwest direct",
  "idaho direct hay",
];

const PUBLIC_SERIES_PREFIXES = [
  "cattle-tf-",
  "cattle-bf-",
  "cattle-nw-",
  "hay-id-",
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

function ticksDir(): string {
  return resolve(env("TICKS_DIR", env("FARM_DATA_DIR") ? `${env("FARM_DATA_DIR")}/prices` : ""));
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
      sources: ["Twin Falls", "Blackfoot", "AMS_3056 hay", "AMS_3059 NW Direct"],
      status: "empty",
      reason:
        "Ticks are not on this host. Point TICKS_PATH or TICKS_DIR at farm-plan data/prices (board.json / history.json).",
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

export function paymentRequiredBody(resourceUrl: string): Record<string, unknown> {
  const amount = amountAtomic();
  const acceptV1: Record<string, unknown> = {
    scheme: "exact",
    network: NETWORK_V1,
    asset: USDC_BASE,
    payTo: PAY_TO,
    resource: resourceUrl,
    description: "Idaho hay + feeder ticks (Twin Falls, Blackfoot, AMS_3056, AMS_3059)",
    mimeType: "application/json",
    outputSchema: null,
    maxTimeoutSeconds: 60,
    extra: { name: "USDC", version: "2" },
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
    extra: { name: "USDC", version: "2" },
  };
  if (amount) accept.amount = amount;
  return {
    x402Version: 2,
    error: "PAYMENT-SIGNATURE header is required",
    resource: {
      url: resourceUrl,
      description: "Idaho hay + feeder ticks (Twin Falls, Blackfoot, AMS_3056, AMS_3059)",
      mimeType: "application/json",
    },
    accepts: [accept],
    extensions: {},
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

async function facilitatorVerify(payment: string, requirements: Record<string, unknown>): Promise<boolean> {
  const base = env("X402_FACILITATOR_URL");
  if (!base) return false;
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
    if (!res.ok) return false;
    const body = (await res.json()) as { isValid?: boolean; success?: boolean };
    return body.isValid === true || body.success === true;
  } catch {
    return false;
  }
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
    });
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
  void facilitatorVerify(payment, accept).then((ok) => {
    if (ok) {
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
  });
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
  server.listen(port, "0.0.0.0", () => {
    console.error(`idaho ticks x402 door on :${port}${TICKS_PATH}`);
    console.error(`payTo ${PAY_TO} USDC ${USDC_BASE} on Base`);
  });
}
