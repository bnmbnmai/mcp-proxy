#!/usr/bin/env node
/**
 * Thin MCP for the live BNM Data Shop paid GETs.
 *
 * One tool per live paid URL on https://ticks.bnm.farm. Tools GET that same
 * URL: unpaid still HTTP 402, paid returns the JSON body. Not a 32nd door.
 * Does not wrap openFDA, OFAC SDN, FRED, WASDE, or other free official JSON.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { z } from "zod";

export const LIVE_ORIGIN = "https://ticks.bnm.farm";
export const MCP_PATH = "/mcp";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const MCP_CONNECT = `npx -y mcp-remote ${LIVE_ORIGIN}${MCP_PATH}`;

/** Live paid GETs from https://ticks.bnm.farm/.well-known/x402 (2026-08-23). */
export const LIVE_PAID_SKUS = [
  { path: "/ticks", name: "ticks", priceUsdc: "0.02", summary: "Idaho + PNW market ticks (USDA AMS, Idaho grain, WD1 $/AF)" },
  { path: "/import-alerts", name: "import-alerts", priceUsdc: "0.05", summary: "FDA Import Alerts / DWPE firm-product snapshot" },
  { path: "/mariners", name: "mariners", priceUsdc: "0.05", summary: "USCG D13 / Northwest Local Notice to Mariners" },
  { path: "/mariners-d11", name: "mariners-d11", priceUsdc: "0.05", summary: "USCG D11 / Southwest Local Notice to Mariners" },
  { path: "/mariners-d7", name: "mariners-d7", priceUsdc: "0.05", summary: "USCG D7 / Southeast Local Notice to Mariners" },
  { path: "/mariners-d8", name: "mariners-d8", priceUsdc: "0.05", summary: "USCG D8 / Gulf Local Notice to Mariners" },
  { path: "/warning-letters", name: "warning-letters", priceUsdc: "0.05", summary: "FDA warning-letter bodies (firm, date, subject, full letter text)" },
  { path: "/untitled-letters", name: "untitled-letters", priceUsdc: "0.05", summary: "FDA Untitled Letter text (CDER OPDP + CBER promo PDFs)" },
  { path: "/awa", name: "awa", priceUsdc: "0.05", summary: "USDA APHIS AWA inspection-report observation text (official per-report PDFs)" },
  { path: "/swisspar", name: "swisspar", priceUsdc: "0.05", summary: "Swissmedic first-authorisation SwissPAR evaluation text (official per-product PDFs)" },
  { path: "/pcac", name: "pcac", priceUsdc: "0.05", summary: "FDA PCAC 503A briefing-memo evaluation text (official per-substance PDFs)" },
  { path: "/ftc-wl", name: "ftc-wl", priceUsdc: "0.05", summary: "FTC BCP warning-letter text (official per-letter PDFs)" },
  { path: "/cfpb-orders", name: "cfpb-orders", priceUsdc: "0.05", summary: "CFPB consent-order / administrative-order text (official per-order PDFs)" },
  { path: "/occ-cd", name: "occ-cd", priceUsdc: "0.05", summary: "OCC institution C&D / consent-order text (official per-order PDFs)" },
  { path: "/fdic-orders", name: "fdic-orders", priceUsdc: "0.05", summary: "FDIC institution consent-order / C&D text (official per-order PDFs)" },
  { path: "/frb-orders", name: "frb-orders", priceUsdc: "0.05", summary: "FRB institution C&D / written-agreement / PCA text (official per-order PDFs)" },
  { path: "/ncua-orders", name: "ncua-orders", priceUsdc: "0.05", summary: "NCUA institution consent C&D text (official per-order HTML)" },
  { path: "/fincen-orders", name: "fincen-orders", priceUsdc: "0.05", summary: "FinCEN institution consent-order text (official per-order PDFs)" },
  { path: "/ferc-orders", name: "ferc-orders", priceUsdc: "0.05", summary: "FERC institution stipulation-and-consent text (official cms.ferc.gov PDFs)" },
  { path: "/ofac-orders", name: "ofac-orders", priceUsdc: "0.05", summary: "OFAC institution enforcement-release text (official ofac.treasury.gov PDFs)" },
  { path: "/bis-orders", name: "bis-orders", priceUsdc: "0.05", summary: "BIS institution charging-letter / order text (official bis.gov PDFs)" },
  { path: "/cftc-orders", name: "cftc-orders", priceUsdc: "0.05", summary: "CFTC institution enforcement-order / settlement text (official cftc.gov PDFs)" },
  { path: "/fifra-orders", name: "fifra-orders", priceUsdc: "0.05", summary: "EPA FIFRA institution order / consent text (official yosemite.epa.gov PDFs)" },
  { path: "/denovo-orders", name: "denovo-orders", priceUsdc: "0.05", summary: "FDA De Novo classification-order text (official accessdata.fda.gov PDFs)" },
  { path: "/ttb-oic", name: "ttb-oic", priceUsdc: "0.05", summary: "TTB Offer in Compromise text (official ttb.gov PDFs)" },
  { path: "/air-letters", name: "air-letters", priceUsdc: "0.05", summary: "USDA APHIS AIR confirmation-letter text (official direct.aphis.usda.gov PDFs)" },
  { path: "/superfund-rods", name: "superfund-rods", priceUsdc: "0.05", summary: "EPA Superfund Record of Decision text (official semspub.epa.gov PDFs)" },
  { path: "/ico-mpn", name: "ico-mpn", priceUsdc: "0.05", summary: "ICO Monetary Penalty Notice text (official ico.org.uk PDFs)" },
  { path: "/form-483", name: "form-483", priceUsdc: "0.05", summary: "FDA Form 483 inspectional observation bodies (posted OII FOIA PDFs)" },
  { path: "/gmp", name: "gmp", priceUsdc: "0.05", summary: "Health Canada Drug GMP report-card observation text + C.02 cites" },
  { path: "/gmp-md", name: "gmp-md", priceUsdc: "0.05", summary: "Health Canada medical-device report-card observation text + MDR cites" },
] as const;

export type LivePaidSku = (typeof LIVE_PAID_SKUS)[number];
export type LivePaidName = LivePaidSku["name"];

const FORBIDDEN_EXTRAS = [
  "/cma-ca98",
  "cma-ca98",
  "openfda",
  "ofac-sdn",
  "ofac_sdn",
  "fred",
  "wasde",
  "economic_indicators",
  "/gain",
  "/api/",
] as const;

export function livePaidPaths(): string[] {
  return LIVE_PAID_SKUS.map((sku) => sku.path);
}

export function livePaidNames(): string[] {
  return LIVE_PAID_SKUS.map((sku) => sku.name);
}

export function findLiveSku(nameOrPath: string): LivePaidSku | undefined {
  const raw = nameOrPath.trim();
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return LIVE_PAID_SKUS.find((sku) => sku.path === path || sku.name === raw);
}

export function assertNoForbiddenExtras(names: string[]): void {
  const joined = names.join(" ").toLowerCase();
  for (const extra of FORBIDDEN_EXTRAS) {
    if (joined.includes(extra.toLowerCase())) {
      throw new Error(`MCP catalog must not include ${extra}`);
    }
  }
}

export function ticksOrigin(override?: string): string {
  const raw = (override ?? process.env.TICKS_BASE ?? process.env.TICKS_MCP_ORIGIN ?? LIVE_ORIGIN).trim();
  return raw.replace(/\/+$/, "") || LIVE_ORIGIN;
}

export function mcpDiscovery(origin = LIVE_ORIGIN): Record<string, unknown> {
  const base = origin.replace(/\/+$/, "") || LIVE_ORIGIN;
  return {
    mcp: true,
    url: `${base}${MCP_PATH}`,
    transport: "streamable-http",
    protocolVersion: "2025-03-26",
    tools: LIVE_PAID_SKUS.length,
    paidGets: livePaidPaths(),
    payTo: PAY_TO,
    network: "eip155:8453",
    connect: `npx -y mcp-remote ${base}${MCP_PATH}`,
    note: "Same thirty-one paid GETs as /.well-known/x402. Not a new SKU. Unpaid tool calls still HTTP 402 on the paid URL. Not Bazaar-indexed.",
  };
}

export function mcpToolDescriptors(origin = LIVE_ORIGIN): Array<{
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    additionalProperties: false;
  };
}> {
  const base = origin.replace(/\/+$/, "") || LIVE_ORIGIN;
  return LIVE_PAID_SKUS.map((sku) => ({
    name: sku.name,
    description:
      `GET ${base}${sku.path} — $${sku.priceUsdc} USDC on Base to ${PAY_TO}. ${sku.summary} ` +
      "Unpaid returns HTTP 402. After a valid X-PAYMENT, the same URL returns JSON. Not a new SKU.",
    inputSchema: {
      type: "object",
      properties: {
        x_payment: {
          type: "string",
          description: "Optional x402 X-PAYMENT value forwarded to the paid GET as the X-PAYMENT header.",
        },
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
  opts: { origin?: string; xPayment?: string } = {},
): Promise<PaidGetResult> {
  const sku = findLiveSku(path);
  if (!sku) {
    throw new Error(`not a live paid GET: ${path}`);
  }
  const url = `${ticksOrigin(opts.origin)}${sku.path}`;
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
  opts: { origin?: string; xPayment?: string } = {},
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

  if (method === "initialize") {
    return ok({
      protocolVersion: "2025-03-26",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "bnm-data-shop", version: "1.0.0" },
      instructions:
        "Thirty-one tools, one per live paid GET on ticks.bnm.farm. Each tool GETs that URL. Unpaid is HTTP 402. Paid returns JSON. USDC on Base. Not Bazaar-indexed.",
    });
  }

  if (method === "ping" || method === "notifications/initialized") {
    return method === "ping" ? ok({}) : null;
  }

  if (method === "tools/list") {
    return ok({ tools: mcpToolDescriptors(opts.origin) });
  }

  if (method === "tools/call") {
    const name = String(message.params?.name ?? "");
    const args = (message.params?.arguments ?? {}) as { x_payment?: string };
    const sku = findLiveSku(name);
    if (!sku) {
      return err(-32602, `Unknown tool ${name}. Tools are the thirty-one live paid GETs only.`);
    }
    const xPayment = args.x_payment || opts.xPayment;
    const result = await getPaidSku(sku.path, { origin: opts.origin, xPayment });
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
): Promise<void> {
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
    sendMcpJson(res, 200, mcpDiscovery(origin));
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

export function createTicksMcpServer(origin = ticksOrigin()): McpServer {
  const server = new McpServer({
    name: "bnm-data-shop",
    version: "1.0.0",
  });
  for (const sku of LIVE_PAID_SKUS) {
    const tool = mcpToolDescriptors(origin).find((item) => item.name === sku.name)!;
    server.registerTool(
      sku.name,
      {
        description: tool.description,
        inputSchema: {
          x_payment: z.string().optional().describe(
            "Optional x402 X-PAYMENT value forwarded to the paid GET as the X-PAYMENT header.",
          ),
        },
      },
      async ({ x_payment }) => {
        const result = await getPaidSku(sku.path, { origin, xPayment: x_payment });
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
  assertNoForbiddenExtras(livePaidNames());
  if (LIVE_PAID_SKUS.length !== 31) {
    throw new Error(`MCP tools must be the live 31, got ${LIVE_PAID_SKUS.length}`);
  }
  const origin = ticksOrigin();
  const server = createTicksMcpServer(origin);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`BNM Data Shop MCP — ${LIVE_PAID_SKUS.length} tools`);
  console.error(`  Paid host: ${origin}`);
  console.error(`  Connect URL: ${origin}${MCP_PATH}`);
  console.error(`  Connect cmd: npx -y mcp-remote ${origin}${MCP_PATH}`);
  console.error(`  payTo ${PAY_TO} USDC on Base`);
}
