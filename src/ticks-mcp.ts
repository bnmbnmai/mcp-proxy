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
import { FIRM_CHECK_NOTE, FIRM_CHECK_PATH, FIRM_CHECK_TOOL_NAME, firmCheckQuery, runFirmCheck } from "./firm-check.js";
import { catalogSearchQueryString, EXTRACTED_BODY_SKUS, isExtractedBodySku, newestOfficialTextsCopy } from "./paid-records.js";

export const LIVE_ORIGIN = "https://ticks.bnm.farm";
export const MCP_PATH = "/mcp";
export const WELL_KNOWN_PATH = "/.well-known/x402";
export const OPENAPI_PATH = "/openapi.json";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const MCP_CONNECT = `npx -y mcp-remote ${LIVE_ORIGIN}${MCP_PATH}`;
export const SEARCH_TOOL_NAME = "search";
export const GET_PAGE_TOOL_NAME = "get-page";
export const GET_ONE_TOOL_NAME = "get-one";
export { FIRM_CHECK_TOOL_NAME } from "./firm-check.js";

export function extraMcpToolNames(): string[] {
  return [SEARCH_TOOL_NAME, GET_PAGE_TOOL_NAME, GET_ONE_TOOL_NAME, FIRM_CHECK_TOOL_NAME];
}

export type LivePaidSku = {
  path: string;
  name: string;
  priceUsdc: string;
  summary: string;
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
    });
  }
  return skus;
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
  return skusFromWellKnown(wellKnown, openApi);
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
      `Same ${catalog.length} paid GETs as ${WELL_KNOWN_PATH}. Free ${SEARCH_TOOL_NAME} finds id, the ?id= URL ($0.02), and the page cursor; free ${FIRM_CHECK_TOOL_NAME} searches Form 483, FDA warning letters, FDA untitled letters, FTC BCP warning letters, Ofwat, Ofgem, CFPB orders, OCC C&Ds, FDIC orders, and the FDA import-alert catalog; paid ${GET_ONE_TOOL_NAME} is one official text ($0.02); paid ${GET_PAGE_TOOL_NAME} is the page ($0.05). Extracted-body doors: ${newestOfficialTextsCopy()} on a plain GET; older pages on the same URL (?before). Table doors stay the whole current table. Free ${SEARCH_TOOL_NAME} and ${FIRM_CHECK_TOOL_NAME} are not paid SKUs. Unpaid tool calls still HTTP 402 on the paid URL. Not Bazaar-indexed.`,
    freeTools: [SEARCH_TOOL_NAME, FIRM_CHECK_TOOL_NAME],
  };
}

export function mcpToolDescriptors(
  origin = LIVE_ORIGIN,
  catalog: LivePaidSku[],
): Array<{
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    additionalProperties: false;
  };
}> {
  const base = origin.replace(/\/+$/, "") || LIVE_ORIGIN;
  const paid = catalog.map((sku) => {
    const extracted = isExtractedBodySku(sku.name);
    const properties: Record<string, { type: string; description: string }> = {
      x_payment: {
        type: "string",
        description: "Optional x402 X-PAYMENT value forwarded to the paid GET as the X-PAYMENT header.",
      },
    };
    if (extracted) {
      properties.id = {
        type: "string",
        description: "Official catalog id. That one official text, $0.02. Same door, not a new SKU.",
      };
      properties.before = {
        type: "string",
        description: "Official catalog id or YYYY-MM-DD. Next older chunk on the same URL, another $0.05. Omit for the newest chunk.",
      };
      properties.page = {
        type: "string",
        description: "1-based page. Page 1 is the newest chunk. Ignored when before is set.",
      };
    }
    return {
      name: sku.name,
      description:
        `GET ${base}${sku.path} — $${sku.priceUsdc} USDC on Base to ${PAY_TO}. ${sku.summary} ` +
        (extracted
          ? "GET ?id= is one official text ($0.02). Newest chunk on a plain GET ($0.05); older chunk if they ask (?before, $0.05). "
          : "") +
        "Unpaid returns HTTP 402. After a valid X-PAYMENT, the same URL returns JSON. Not a new SKU.",
      inputSchema: {
        type: "object" as const,
        properties,
        additionalProperties: false as const,
      },
    };
  });
  return [
    ...paid,
    {
      name: FIRM_CHECK_TOOL_NAME,
      description: FIRM_CHECK_NOTE,
      inputSchema: {
        type: "object" as const,
        properties: {
          q: {
            type: "string",
            description: "Firm, institution, bank, company, FEI, CMS, or import-alert number. Free. Not charged.",
          },
        },
        additionalProperties: false as const,
      },
    },
    {
      name: SEARCH_TOOL_NAME,
      description:
        "Free catalog search on an extracted-body door. Returns matching rows plus id, the ?id= URL ($0.02), and the page cursor ($0.05). Optional before/date filters. Not a paid SKU. Does not return official bodies.",
      inputSchema: {
        type: "object" as const,
        properties: {
          door: {
            type: "string",
            description: `Extracted-body door name, e.g. gmp. One of: ${EXTRACTED_BODY_SKUS.join(", ")}`,
          },
          q: {
            type: "string",
            description: "Free-text match against the free manifest (id, firm, date, subject).",
          },
          before: {
            type: "string",
            description: "Free filter: page cursor (id) or YYYY-MM-DD older-than date.",
          },
          date: {
            type: "string",
            description: "Free date prefix (YYYY, YYYY-MM, or YYYY-MM-DD).",
          },
        },
        additionalProperties: false as const,
      },
    },
    {
      name: GET_PAGE_TOOL_NAME,
      description:
        `Paid get-page on an extracted-body door. Same URL as the door GET ($0.05). Omit before/page for the ${newestOfficialTextsCopy()}; pass the free-index cursor for an older page. Not a new SKU. Unpaid returns HTTP 402.`,
      inputSchema: {
        type: "object" as const,
        properties: {
          door: {
            type: "string",
            description: `Extracted-body door name, e.g. gmp. One of: ${EXTRACTED_BODY_SKUS.join(", ")}`,
          },
          before: {
            type: "string",
            description: "Official catalog id or YYYY-MM-DD from free search. Next older page, another $0.05.",
          },
          page: {
            type: "string",
            description: "1-based page. Page 1 is the newest chunk. Ignored when before is set.",
          },
          x_payment: {
            type: "string",
            description: "Optional x402 X-PAYMENT value forwarded to the paid GET as the X-PAYMENT header.",
          },
        },
        additionalProperties: false as const,
      },
    },
    {
      name: GET_ONE_TOOL_NAME,
      description:
        "Paid get-one on an extracted-body door. Same URL ?id= ($0.02 / 20000 atomic). Not a new SKU. Unpaid returns HTTP 402 asking 20000.",
      inputSchema: {
        type: "object" as const,
        properties: {
          door: {
            type: "string",
            description: `Extracted-body door name, e.g. gmp. One of: ${EXTRACTED_BODY_SKUS.join(", ")}`,
          },
          id: {
            type: "string",
            description: "Official catalog id from free search.",
          },
          x_payment: {
            type: "string",
            description: "Optional x402 X-PAYMENT value forwarded to the paid GET as the X-PAYMENT header.",
          },
        },
        additionalProperties: false as const,
      },
    },
  ];
}

export type PaidGetResult = {
  url: string;
  status: number;
  body: string;
  paymentRequired: string | null;
};

export async function getPaidSku(
  path: string,
  opts: {
    origin?: string;
    xPayment?: string;
    catalog?: LivePaidSku[];
    before?: string;
    page?: string | number;
    id?: string;
  } = {},
): Promise<PaidGetResult> {
  const catalog = opts.catalog ?? (await resolveMcpCatalog({ origin: opts.origin }));
  const sku = findLiveSku(path, catalog);
  if (!sku) {
    throw new Error(`not a live paid GET: ${path}`);
  }
  const q = new URLSearchParams();
  if (opts.id?.trim()) q.set("id", opts.id.trim());
  else if (opts.before?.trim()) q.set("before", opts.before.trim());
  else if (opts.page != null && String(opts.page).trim()) q.set("page", String(opts.page).trim());
  const qs = q.toString();
  const url = `${ticksOrigin(opts.origin)}${sku.path}${qs ? `?${qs}` : ""}`;
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
        `${catalog.length} paid GETs from ${WELL_KNOWN_PATH}, plus free ${SEARCH_TOOL_NAME}, free ${FIRM_CHECK_TOOL_NAME}, paid ${GET_ONE_TOOL_NAME} ($0.02), and paid ${GET_PAGE_TOOL_NAME} ($0.05). Free index/search finds id and the ?id= URL; then pay one text or the page. Extracted-body doors: ${newestOfficialTextsCopy()} on a plain GET; older pages on the same URL (?before). Table doors stay the whole current table. Unpaid is HTTP 402. USDC on Base. Not Bazaar-indexed.`,
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
    const args = (message.params?.arguments ?? {}) as {
      x_payment?: string;
      before?: string;
      page?: string | number;
      door?: string;
      q?: string;
      date?: string;
      id?: string;
    };
    if (name === FIRM_CHECK_TOOL_NAME) {
      const q = firmCheckQuery(args.q);
      if (!q) {
        return err(-32602, `firm-check needs q (firm, institution, bank, company, FEI, CMS, or import-alert number).`);
      }
      const origin = (opts.origin ?? LIVE_ORIGIN).replace(/\/+$/, "");
      const url = `${origin}${FIRM_CHECK_PATH}?q=${encodeURIComponent(q)}`;
      const result = await runFirmCheck(q);
      return ok({
        content: [
          {
            type: "text",
            text: [`GET ${url}`, "HTTP 200", "", JSON.stringify(result)].join("\n"),
          },
        ],
      });
    }
    if (name === SEARCH_TOOL_NAME) {
      const door = String(args.door ?? "").replace(/^\//, "");
      if (!isExtractedBodySku(door)) {
        return err(-32602, `search is free catalog search on extracted-body doors only.`);
      }
      const origin = (opts.origin ?? LIVE_ORIGIN).replace(/\/+$/, "");
      const qs = catalogSearchQueryString({ q: args.q, before: args.before, date: args.date });
      const url = `${origin}/${door}/manifest.json${qs}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": "bnm-data-shop-mcp/1.0" },
      });
      const body = await response.text();
      return ok({
        content: [
          {
            type: "text",
            text: [`GET ${url}`, `HTTP ${response.status}`, "", body].join("\n"),
          },
        ],
        isError: response.status >= 500,
      });
    }
    if (name === GET_PAGE_TOOL_NAME) {
      const door = String(args.door ?? "").replace(/^\//, "");
      const sku = findLiveSku(door, catalog);
      if (!sku || !isExtractedBodySku(sku.name)) {
        return err(-32602, `get-page is the paid page GET on extracted-body doors only.`);
      }
      const xPayment = args.x_payment || opts.xPayment;
      const result = await getPaidSku(sku.path, {
        origin: opts.origin,
        xPayment,
        catalog,
        before: args.before,
        page: args.page,
      });
      return ok({
        content: [{ type: "text", text: formatPaidToolText(result) }],
        isError: result.status >= 500,
      });
    }
    if (name === GET_ONE_TOOL_NAME) {
      const door = String(args.door ?? "").replace(/^\//, "");
      const recordId = String(args.id ?? "").trim();
      const sku = findLiveSku(door, catalog);
      if (!sku || !isExtractedBodySku(sku.name) || !recordId) {
        return err(-32602, `get-one is the paid ?id= GET on extracted-body doors only.`);
      }
      const xPayment = args.x_payment || opts.xPayment;
      const result = await getPaidSku(sku.path, {
        origin: opts.origin,
        xPayment,
        catalog,
        id: recordId,
      });
      return ok({
        content: [{ type: "text", text: formatPaidToolText(result) }],
        isError: result.status >= 500,
      });
    }
    const sku = findLiveSku(name, catalog);
    if (!sku) {
      return err(-32602, `Unknown tool ${name}. Tools are the live paid GETs from ${WELL_KNOWN_PATH}, plus free ${SEARCH_TOOL_NAME}, free ${FIRM_CHECK_TOOL_NAME}, paid ${GET_ONE_TOOL_NAME}, and paid ${GET_PAGE_TOOL_NAME}.`);
    }
    const xPayment = args.x_payment || opts.xPayment;
    const result = await getPaidSku(sku.path, {
      origin: opts.origin,
      xPayment,
      catalog,
      id: args.id,
      before: args.before,
      page: args.page,
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
    const extracted = isExtractedBodySku(sku.name);
    server.registerTool(
      sku.name,
      {
        description: tool.description,
        inputSchema: {
          x_payment: z.string().optional().describe(
            "Optional x402 X-PAYMENT value forwarded to the paid GET as the X-PAYMENT header.",
          ),
          ...(extracted
            ? {
                id: z.string().optional().describe("Official catalog id. That one official text, $0.02."),
                before: z.string().optional().describe(
                  "Official catalog id or YYYY-MM-DD. Next older chunk on the same URL, another $0.05.",
                ),
                page: z.string().optional().describe("1-based page. Page 1 is the newest chunk."),
              }
            : {}),
        },
      },
      async ({ x_payment, id: recordId, before, page }: { x_payment?: string; id?: string; before?: string; page?: string }) => {
        const result = await getPaidSku(sku.path, { origin, xPayment: x_payment, catalog, id: recordId, before, page });
        return {
          content: [{ type: "text" as const, text: formatPaidToolText(result) }],
          isError: result.status >= 500,
        };
      },
    );
  }
  server.registerTool(
    FIRM_CHECK_TOOL_NAME,
    {
      description: FIRM_CHECK_NOTE,
      inputSchema: {
        q: z.string().describe("Firm, institution, bank, company, FEI, CMS, or import-alert number. Free. Not charged."),
      },
    },
    async ({ q }) => {
      const query = firmCheckQuery(q);
      if (!query) {
        return { content: [{ type: "text" as const, text: "firm-check needs q." }], isError: true };
      }
      const result = await runFirmCheck(query);
      const url = `${origin.replace(/\/+$/, "")}${FIRM_CHECK_PATH}?q=${encodeURIComponent(query)}`;
      return {
        content: [{ type: "text" as const, text: [`GET ${url}`, "HTTP 200", "", JSON.stringify(result)].join("\n") }],
      };
    },
  );
  server.registerTool(
    SEARCH_TOOL_NAME,
    {
      description:
        "Free catalog search on an extracted-body door. Returns matching rows plus id, the ?id= URL ($0.02), and the page cursor ($0.05). Optional before/date filters. Not a paid SKU.",
      inputSchema: {
        door: z.string().describe("Extracted-body door name, e.g. gmp"),
        q: z.string().optional().describe("Free-text match against the free manifest."),
        before: z.string().optional().describe("Free filter: page cursor (id) or YYYY-MM-DD older-than date."),
        date: z.string().optional().describe("Free date prefix (YYYY, YYYY-MM, or YYYY-MM-DD)."),
      },
    },
    async ({ door, q, before, date }) => {
      const name = String(door ?? "").replace(/^\//, "");
      if (!isExtractedBodySku(name)) {
        return { content: [{ type: "text" as const, text: "search is for extracted-body doors only." }], isError: true };
      }
      const qs = catalogSearchQueryString({ q, before, date });
      const url = `${origin.replace(/\/+$/, "")}/${name}/manifest.json${qs}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": "bnm-data-shop-mcp/1.0" },
      });
      const body = await response.text();
      return {
        content: [{ type: "text" as const, text: [`GET ${url}`, `HTTP ${response.status}`, "", body].join("\n") }],
        isError: response.status >= 500,
      };
    },
  );
  server.registerTool(
    GET_PAGE_TOOL_NAME,
    {
      description:
        `Paid get-page on an extracted-body door. Same URL as the door GET ($0.05). Omit before/page for the ${newestOfficialTextsCopy()}. Not a new SKU.`,
      inputSchema: {
        door: z.string().describe("Extracted-body door name, e.g. gmp"),
        before: z.string().optional().describe("Official catalog id or YYYY-MM-DD from free search."),
        page: z.string().optional().describe("1-based page. Page 1 is the newest chunk."),
        x_payment: z.string().optional().describe("Optional x402 X-PAYMENT value."),
      },
    },
    async ({ door, before, page, x_payment }) => {
      const sku = findLiveSku(String(door ?? ""), catalog);
      if (!sku || !isExtractedBodySku(sku.name)) {
        return { content: [{ type: "text" as const, text: "get-page is for extracted-body doors only." }], isError: true };
      }
      const result = await getPaidSku(sku.path, { origin, xPayment: x_payment, catalog, before, page });
      return {
        content: [{ type: "text" as const, text: formatPaidToolText(result) }],
        isError: result.status >= 500,
      };
    },
  );
  server.registerTool(
    GET_ONE_TOOL_NAME,
    {
      description:
        "Paid get-one on an extracted-body door. Same URL ?id= ($0.02 / 20000 atomic). Not a new SKU.",
      inputSchema: {
        door: z.string().describe("Extracted-body door name, e.g. gmp"),
        id: z.string().describe("Official catalog id from free search."),
        x_payment: z.string().optional().describe("Optional x402 X-PAYMENT value."),
      },
    },
    async ({ door, id: recordId, x_payment }) => {
      const sku = findLiveSku(String(door ?? ""), catalog);
      if (!sku || !isExtractedBodySku(sku.name) || !String(recordId ?? "").trim()) {
        return { content: [{ type: "text" as const, text: "get-one is for extracted-body doors with an id." }], isError: true };
      }
      const result = await getPaidSku(sku.path, {
        origin,
        xPayment: x_payment,
        catalog,
        id: String(recordId).trim(),
      });
      return {
        content: [{ type: "text" as const, text: formatPaidToolText(result) }],
        isError: result.status >= 500,
      };
    },
  );
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
