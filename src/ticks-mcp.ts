#!/usr/bin/env node
/**
 * Thin MCP for the live BNM Data Shop paid GETs.
 *
 * Tools are generated from GET /.well-known/x402 (optionally enriched from
 * /openapi.json). When a new SKU is listed there, /mcp picks it up without
 * rewriting this file. Not a new SKU itself. Unpaid still HTTP 402.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { z } from "zod";

export const LIVE_ORIGIN = "https://ticks.bnm.farm";
export const MCP_PATH = "/mcp";
export const WELL_KNOWN_PATH = "/.well-known/x402";
export const OPENAPI_PATH = "/openapi.json";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const MCP_CONNECT = `npx -y mcp-remote ${LIVE_ORIGIN}${MCP_PATH}`;

export type LivePaidSku = {
  path: string;
  name: string;
  priceUsdc: string;
  summary: string;
  count?: number;
  firms?: number;
  paidJson?: string;
};

export type WellKnownDoc = {
  resources?: unknown;
  [key: string]: unknown;
};

export type OpenApiDoc = {
  paths?: Record<string, { get?: Record<string, unknown> }>;
};

const FORBIDDEN_NON_SHOP = [
  "openfda",
  "ofac-sdn",
  "ofac_sdn",
  "fred",
  "wasde",
  "economic_indicators",
  "/gain",
  "/api/",
] as const;

export function ticksOrigin(override?: string): string {
  const raw = (override ?? process.env.TICKS_BASE ?? process.env.TICKS_MCP_ORIGIN ?? LIVE_ORIGIN).trim();
  return raw.replace(/\/+$/, "") || LIVE_ORIGIN;
}

function resourcePath(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const path = value.startsWith("/") ? value : new URL(value).pathname;
    return path.replace(/\/+$/, "") || "/";
  } catch {
    return null;
  }
}

function defaultPriceUsdc(_name: string): string {
  return "0.05";
}

export function paidJsonForPath(path: string): string {
  if (path === "/ticks") return "ticks[] + history";
  if (path === "/import-alerts") return "ticks[]";
  if (path === "/mariners" || path.startsWith("/mariners-")) return "notices[]";
  if (path === "/warning-letters" || path === "/form-483") return "letters[].body";
  return "cards[].body";
}

export function isTablePath(path: string): boolean {
  return path === "/ticks" || path === "/import-alerts";
}

function countLabel(sku: LivePaidSku): string | undefined {
  if (typeof sku.count !== "number") return undefined;
  if (sku.path === "/import-alerts") {
    return `${sku.count} rows / ${sku.firms ?? 0} firms`;
  }
  return `${sku.count}`;
}

function priceFromOpenApi(op: Record<string, unknown> | undefined): string | undefined {
  const info = op?.["x-payment-info"] as { price?: { amount?: unknown } } | undefined;
  const amount = info?.price?.amount;
  if (typeof amount === "string" && amount.trim()) return amount.trim();
  if (typeof amount === "number" && Number.isFinite(amount)) return String(amount);
  return undefined;
}

export function skusFromWellKnown(
  wellKnown: WellKnownDoc,
  openApi?: OpenApiDoc,
): LivePaidSku[] {
  const resources = Array.isArray(wellKnown.resources) ? wellKnown.resources : [];
  const seen = new Set<string>();
  const skus: LivePaidSku[] = [];
  for (const raw of resources) {
    const path = resourcePath(String(raw ?? ""));
    if (!path || path === "/" || path === MCP_PATH) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    const name = path.replace(/^\//, "");
    if (!name) continue;
    const op = openApi?.paths?.[path]?.get;
    const summary =
      (typeof op?.summary === "string" && op.summary.trim()) ||
      (typeof op?.description === "string" && op.description.trim()) ||
      `Paid GET ${path}`;
    skus.push({
      path,
      name,
      priceUsdc: priceFromOpenApi(op) ?? defaultPriceUsdc(name),
      summary,
      paidJson: paidJsonForPath(path),
    });
  }
  return skus;
}

type ShopDoc = {
  products?: Array<{
    path?: string;
    description?: string;
    count?: number;
    firms?: number;
  }>;
};

export function enrichSkusFromShop(skus: LivePaidSku[], shop?: ShopDoc): LivePaidSku[] {
  const byPath = new Map((shop?.products ?? []).map((p) => [p.path, p]));
  return skus.map((sku) => {
    const product = byPath.get(sku.path);
    return {
      ...sku,
      summary:
        (typeof product?.description === "string" && product.description.trim())
        || sku.summary,
      count: typeof product?.count === "number" ? product.count : sku.count,
      firms: typeof product?.firms === "number" ? product.firms : sku.firms,
      paidJson: sku.paidJson ?? paidJsonForPath(sku.path),
    };
  });
}

export function livePaidPaths(catalog: LivePaidSku[]): string[] {
  return catalog.map((sku) => sku.path);
}

export function livePaidNames(catalog: LivePaidSku[]): string[] {
  return catalog.map((sku) => sku.name);
}

export function findLiveSku(nameOrPath: string, catalog: LivePaidSku[]): LivePaidSku | undefined {
  const raw = nameOrPath.trim();
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return catalog.find((sku) => sku.path === path || sku.name === raw);
}

export function assertNoForbiddenExtras(names: string[]): void {
  const joined = names.join(" ").toLowerCase();
  for (const extra of FORBIDDEN_NON_SHOP) {
    if (joined.includes(extra.toLowerCase())) {
      throw new Error(`MCP catalog must not include ${extra}`);
    }
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", "User-Agent": "bnm-data-shop-mcp/1.0" },
  });
  if (!response.ok) {
    throw new Error(`GET ${url} HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchWellKnown(origin = ticksOrigin()): Promise<WellKnownDoc> {
  const base = origin.replace(/\/+$/, "") || LIVE_ORIGIN;
  return (await fetchJson(`${base}${WELL_KNOWN_PATH}`)) as WellKnownDoc;
}

export async function fetchOpenApi(origin = ticksOrigin()): Promise<OpenApiDoc> {
  const base = origin.replace(/\/+$/, "") || LIVE_ORIGIN;
  return (await fetchJson(`${base}${OPENAPI_PATH}`)) as OpenApiDoc;
}

export async function resolveMcpCatalog(opts: {
  origin?: string;
  wellKnown?: WellKnownDoc;
  openApi?: OpenApiDoc;
  shop?: ShopDoc;
} = {}): Promise<LivePaidSku[]> {
  const origin = ticksOrigin(opts.origin);
  const wellKnown = opts.wellKnown ?? (await fetchWellKnown(origin));
  let openApi = opts.openApi;
  if (!openApi && opts.wellKnown === undefined) {
    try {
      openApi = await fetchOpenApi(origin);
    } catch {
      openApi = undefined;
    }
  }
  let shop = opts.shop;
  if (!shop) {
    try {
      shop = (await fetchJson(`${origin}/`)) as ShopDoc;
    } catch {
      shop = undefined;
    }
  }
  return enrichSkusFromShop(skusFromWellKnown(wellKnown, openApi), shop);
}

export function mcpDiscovery(origin = LIVE_ORIGIN, catalog: LivePaidSku[]): Record<string, unknown> {
  const base = origin.replace(/\/+$/, "") || LIVE_ORIGIN;
  return {
    mcp: true,
    url: `${base}${MCP_PATH}`,
    transport: "streamable-http",
    protocolVersion: "2025-03-26",
    tools: catalog.length,
    paidGets: livePaidPaths(catalog),
    payTo: PAY_TO,
    network: "eip155:8453",
    connect: `npx -y mcp-remote ${base}${MCP_PATH}`,
    source: WELL_KNOWN_PATH,
    note:
      `Same ${catalog.length} paid GETs as ${WELL_KNOWN_PATH}. Table doors return the entire current table. Extracted-body doors return the newest 100 official texts; older pages are another $0.05 on the same URL (page/before). Tools are generated from that document so later SKUs appear without an MCP rewrite. Unpaid tool calls still HTTP 402 on the paid URL. Not Bazaar-indexed.`,
  };
}

export function mcpToolDescriptors(
  origin = LIVE_ORIGIN,
  catalog: LivePaidSku[],
): Array<{
  name: string;
  title: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    additionalProperties: false;
  };
}> {
  const base = origin.replace(/\/+$/, "") || LIVE_ORIGIN;
  return catalog.map((sku) => ({
    name: sku.name,
    title: sku.path === "/ticks" ? "US hay, cattle, and grain ticks" : sku.name,
    description:
      `GET ${base}${sku.path} — $${sku.priceUsdc} USDC on Base to ${PAY_TO}. ${sku.summary} ` +
      `Paid JSON is ${sku.paidJson ?? paidJsonForPath(sku.path)}` +
      `${countLabel(sku) ? ` (${countLabel(sku)} in catalog)` : ""}. ` +
      (isTablePath(sku.path)
        ? "One $0.05 GET returns the entire current table. "
        : "One $0.05 GET returns the newest 100 official texts. Older pages are another $0.05 on the same URL (page/before). ") +
      "Unpaid returns HTTP 402. After a valid X-PAYMENT, the same URL returns JSON.",
    inputSchema: {
      type: "object",
      properties: {
        x_payment: {
          type: "string",
          description: "Optional x402 X-PAYMENT value forwarded to the paid GET as the X-PAYMENT header.",
        },
        ...(isTablePath(sku.path)
          ? {}
          : {
              page: {
                type: "string",
                description: "Optional page of official texts. Default 1 is the newest 100. Same URL, another $0.05.",
              },
              before: {
                type: "string",
                description: "Optional cursor (item id) for the next older page. Same URL, another $0.05.",
              },
            }),
      },
      additionalProperties: false,
    },
  }));
}

export type PaidGetResult = {
  url: string;
  status: number;
  body: string;
  paymentRequired: string | null;
};

export async function getPaidSku(
  path: string,
  opts: { origin?: string; xPayment?: string; catalog?: LivePaidSku[]; page?: string; before?: string } = {},
): Promise<PaidGetResult> {
  const catalog = opts.catalog ?? (await resolveMcpCatalog({ origin: opts.origin }));
  const sku = findLiveSku(path, catalog);
  if (!sku) {
    throw new Error(`not a live paid GET: ${path}`);
  }
  const qs = new URLSearchParams();
  if (opts.page?.trim()) qs.set("page", opts.page.trim());
  if (opts.before?.trim()) qs.set("before", opts.before.trim());
  const query = qs.toString();
  const url = `${ticksOrigin(opts.origin)}${sku.path}${query ? `?${query}` : ""}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.xPayment?.trim()) headers["X-PAYMENT"] = opts.xPayment.trim();
  const response = await fetch(url, { method: "GET", headers });
  return {
    url,
    status: response.status,
    body: await response.text(),
    paymentRequired: response.headers.get("payment-required"),
  };
}

export function formatPaidToolText(result: PaidGetResult): string {
  const parts = [`GET ${result.url}`, `HTTP ${result.status}`];
  if (result.paymentRequired) parts.push(`PAYMENT-REQUIRED: ${result.paymentRequired}`);
  parts.push("", result.body);
  if (result.status === 402) {
    parts.push(
      "",
      `Pay USDC on Base to ${PAY_TO}, then retry this tool with x_payment set to the X-PAYMENT value.`,
    );
  }
  return parts.join("\n");
}

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
};

export async function handleMcpJsonRpc(
  message: JsonRpcRequest,
  opts: {
    origin?: string;
    xPayment?: string;
    wellKnown?: WellKnownDoc;
    openApi?: OpenApiDoc;
    catalog?: LivePaidSku[];
  } = {},
): Promise<Record<string, unknown> | null> {
  const id = message.id ?? null;
  const method = message.method ?? "";
  if (message.id === undefined && method.startsWith("notifications/")) {
    return null;
  }

  const ok = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const err = (code: number, errorMessage: string) => ({
    jsonrpc: "2.0",
    id,
    error: { code, message: errorMessage },
  });

  const catalog =
    opts.catalog ??
    (await resolveMcpCatalog({
      origin: opts.origin,
      wellKnown: opts.wellKnown,
      openApi: opts.openApi,
    }));

  if (method === "initialize") {
    return ok({
      protocolVersion: "2025-03-26",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "bnm-data-shop", version: "1.0.0" },
      instructions:
        `${catalog.length} tools, one per live paid GET from ${WELL_KNOWN_PATH}. Table doors return the entire current table. Extracted-body doors return the newest 100 official texts; older pages are another $0.05 on the same URL (page/before). Unpaid is HTTP 402. Paid returns JSON. USDC on Base. Not Bazaar-indexed.`,
    });
  }

  if (method === "ping" || method === "notifications/initialized") {
    return method === "ping" ? ok({}) : null;
  }

  if (method === "tools/list") {
    return ok({ tools: mcpToolDescriptors(opts.origin ?? LIVE_ORIGIN, catalog) });
  }

  if (method === "tools/call") {
    const name = String(message.params?.name ?? "");
    const args = (message.params?.arguments ?? {}) as { x_payment?: string; page?: string; before?: string };
    const sku = findLiveSku(name, catalog);
    if (!sku) {
      return err(-32602, `Unknown tool ${name}. Tools are the live paid GETs from ${WELL_KNOWN_PATH}.`);
    }
    const xPayment = args.x_payment || opts.xPayment;
    const result = await getPaidSku(sku.path, {
      origin: opts.origin,
      xPayment,
      catalog,
      page: args.page,
      before: args.before,
    });
    return ok({
      content: [{ type: "text", text: formatPaidToolText(result) }],
      isError: result.status >= 500,
    });
  }

  return err(-32601, `Method not found: ${method}`);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return null;
  return JSON.parse(raw);
}

function headerPayment(req: IncomingMessage): string | undefined {
  const raw = req.headers["x-payment"] ?? req.headers["payment-signature"];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return undefined;
}

function sendMcpJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "X-PAYMENT, PAYMENT-SIGNATURE, Content-Type, Accept, Mcp-Session-Id",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  });
  res.end(JSON.stringify(body));
}

export async function handleMcpHttp(
  req: IncomingMessage,
  res: ServerResponse,
  origin: string,
  discovery: { wellKnown?: WellKnownDoc; openApi?: OpenApiDoc } = {},
): Promise<void> {
  const catalog = await resolveMcpCatalog({
    origin,
    wellKnown: discovery.wellKnown,
    openApi: discovery.openApi,
  });

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "X-PAYMENT, PAYMENT-SIGNATURE, Content-Type, Accept, Mcp-Session-Id",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    });
    res.end();
    return;
  }

  if (req.method === "DELETE") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  if (req.method === "GET") {
    sendMcpJson(res, 200, mcpDiscovery(origin, catalog));
    return;
  }

  if (req.method !== "POST") {
    sendMcpJson(res, 405, { error: "method_not_allowed", allow: ["GET", "POST", "DELETE", "OPTIONS"] });
    return;
  }

  let parsed: unknown;
  try {
    parsed = await readJsonBody(req);
  } catch {
    sendMcpJson(res, 400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }

  const messages = Array.isArray(parsed) ? parsed : [parsed];
  const replies: Record<string, unknown>[] = [];
  for (const message of messages) {
    const reply = await handleMcpJsonRpc((message ?? {}) as JsonRpcRequest, {
      origin,
      xPayment: headerPayment(req),
      catalog,
    });
    if (reply) replies.push(reply);
  }

  if (replies.length === 0) {
    res.writeHead(202, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  sendMcpJson(res, 200, Array.isArray(parsed) ? replies : replies[0]);
}

export async function createTicksMcpServer(origin = ticksOrigin()): Promise<McpServer> {
  const catalog = await resolveMcpCatalog({ origin });
  const server = new McpServer({
    name: "bnm-data-shop",
    version: "1.0.0",
  });
  for (const sku of catalog) {
    const tool = mcpToolDescriptors(origin, catalog).find((item) => item.name === sku.name)!;
    server.registerTool(
      sku.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: {
          x_payment: z.string().optional().describe(
            "Optional x402 X-PAYMENT value forwarded to the paid GET as the X-PAYMENT header.",
          ),
          ...(isTablePath(sku.path)
            ? {}
            : {
                page: z.string().optional().describe(
                  "Optional page of official texts. Default 1 is the newest 100. Same URL, another $0.05.",
                ),
                before: z.string().optional().describe(
                  "Optional cursor (item id) for the next older page. Same URL, another $0.05.",
                ),
              }),
        },
      },
      async ({ x_payment, page, before }: { x_payment?: string; page?: string; before?: string }) => {
        const result = await getPaidSku(sku.path, { origin, xPayment: x_payment, catalog, page, before });
        return {
          content: [{ type: "text" as const, text: formatPaidToolText(result) }],
          isError: result.status >= 500,
        };
      },
    );
  }
  return server;
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  const origin = ticksOrigin();
  const catalog = await resolveMcpCatalog({ origin });
  assertNoForbiddenExtras(livePaidNames(catalog));
  const server = await createTicksMcpServer(origin);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`BNM Data Shop MCP — ${catalog.length} tools from ${WELL_KNOWN_PATH}`);
  console.error(`  Paid host: ${origin}`);
  console.error(`  Connect URL: ${origin}${MCP_PATH}`);
  console.error(`  Connect cmd: npx -y mcp-remote ${origin}${MCP_PATH}`);
  console.error(`  payTo ${PAY_TO} USDC on Base`);
}
