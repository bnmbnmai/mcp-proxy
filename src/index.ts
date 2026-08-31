#!/usr/bin/env node
/**
 * BNM Data Shop MCP (stdio).
 *
 * Paid tools are generated from GET https://ticks.bnm.farm/.well-known/x402
 * plus free search and firm-check. Door count is whatever well-known lists
 * today — never hardcoded.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  extraMcpToolNames,
  fetchLiveCatalog,
  FIRM_CHECK_TOOL_NAME,
  GET_ONE_TOOL_NAME,
  GET_PAGE_TOOL_NAME,
  LIVE_ORIGIN,
  LivePaidSku,
  MCP_PATH,
  PAY_TO,
  SEARCH_TOOL_NAME,
} from "./shop-catalog.js";

const UA = "bnm-data-shop-mcp/1.0";

async function getJson(url: string, xPayment?: string): Promise<{ status: number; body: string }> {
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": UA };
  if (xPayment?.trim()) headers["X-PAYMENT"] = xPayment.trim();
  const response = await fetch(url, { method: "GET", headers });
  return { status: response.status, body: await response.text() };
}

function paidText(url: string, status: number, body: string): string {
  const parts = [`GET ${url}`, `HTTP ${status}`, "", body];
  if (status === 402) {
    parts.push("", `Pay USDC on Base to ${PAY_TO}, then retry with x_payment set to the X-PAYMENT value.`);
  }
  return parts.join("\n");
}

function registerPaidTool(server: McpServer, sku: LivePaidSku): void {
  const extracted = sku.kind === "body";
  const shape: Record<string, z.ZodTypeAny> = {
    x_payment: z.string().optional().describe("Optional x402 X-PAYMENT value forwarded as X-PAYMENT."),
  };
  if (extracted) {
    shape.id = z.string().optional().describe("Official catalog id. One official text, $0.02.");
    shape.before = z.string().optional().describe("Official catalog id or YYYY-MM-DD. Next older chunk, $0.05.");
    shape.page = z.string().optional().describe("1-based page. Page 1 is the newest chunk.");
  }
  server.tool(
    sku.name,
    `GET ${LIVE_ORIGIN}${sku.path} — ${sku.price} USDC on Base to ${PAY_TO}. ${sku.bag} Unpaid returns HTTP 402.`,
    shape,
    async (args) => {
      const q = new URLSearchParams();
      if (typeof args.id === "string" && args.id.trim()) q.set("id", args.id.trim());
      else if (typeof args.before === "string" && args.before.trim()) q.set("before", args.before.trim());
      else if (typeof args.page === "string" && args.page.trim()) q.set("page", args.page.trim());
      const qs = q.toString();
      const url = `${LIVE_ORIGIN}${sku.path}${qs ? `?${qs}` : ""}`;
      const result = await getJson(url, typeof args.x_payment === "string" ? args.x_payment : undefined);
      return { content: [{ type: "text", text: paidText(url, result.status, result.body) }] };
    },
  );
}

async function main(): Promise<void> {
  const { skus } = await fetchLiveCatalog();
  const server = new McpServer({
    name: "bnm-data-shop",
    version: "1.0.0",
  });

  for (const sku of skus) registerPaidTool(server, sku);

  server.tool(
    FIRM_CHECK_TOOL_NAME,
    "Free firm-name search across official caches. HTTP 200. Not a SKU.",
    { q: z.string().describe("Firm, institution, bank, company, or import-alert number. Free.") },
    async ({ q }) => {
      const url = `${LIVE_ORIGIN}/firm-check?q=${encodeURIComponent(q)}`;
      const result = await getJson(url);
      return { content: [{ type: "text", text: paidText(url, result.status, result.body) }] };
    },
  );

  server.tool(
    SEARCH_TOOL_NAME,
    "Free catalog search on an extracted-body door. Returns matching rows plus id and the ?id= URL. Not a paid SKU.",
    {
      door: z.string().describe("Extracted-body door name, e.g. warning-letters."),
      q: z.string().optional().describe("Free-text match against the free manifest."),
    },
    async ({ door, q }) => {
      const name = door.replace(/^\//, "");
      const sku = skus.find((s) => s.name === name);
      if (!sku || sku.kind !== "body") {
        return { content: [{ type: "text", text: `not an extracted-body door: ${door}` }], isError: true };
      }
      const url = new URL(`${LIVE_ORIGIN}${sku.path}/manifest.json`);
      if (q?.trim()) url.searchParams.set("q", q.trim());
      const result = await getJson(url.toString());
      return { content: [{ type: "text", text: paidText(url.toString(), result.status, result.body) }] };
    },
  );

  server.tool(
    GET_PAGE_TOOL_NAME,
    "Paid get-page on an extracted-body door. Same URL as the door GET ($0.05). Not a new SKU.",
    {
      door: z.string().describe("Extracted-body door name."),
      before: z.string().optional().describe("Official catalog id or YYYY-MM-DD."),
      x_payment: z.string().optional().describe("Optional x402 X-PAYMENT value."),
    },
    async ({ door, before, x_payment }) => {
      const name = door.replace(/^\//, "");
      const sku = skus.find((s) => s.name === name);
      if (!sku || sku.kind !== "body") {
        return { content: [{ type: "text", text: `not an extracted-body door: ${door}` }], isError: true };
      }
      const url = new URL(`${LIVE_ORIGIN}${sku.path}`);
      if (before?.trim()) url.searchParams.set("before", before.trim());
      const result = await getJson(url.toString(), x_payment);
      return { content: [{ type: "text", text: paidText(url.toString(), result.status, result.body) }] };
    },
  );

  server.tool(
    GET_ONE_TOOL_NAME,
    "Paid get-one on an extracted-body door. Same URL ?id= ($0.02). Not a new SKU.",
    {
      door: z.string().describe("Extracted-body door name."),
      id: z.string().describe("Official catalog id from free search."),
      x_payment: z.string().optional().describe("Optional x402 X-PAYMENT value."),
    },
    async ({ door, id, x_payment }) => {
      const name = door.replace(/^\//, "");
      const sku = skus.find((s) => s.name === name);
      if (!sku || sku.kind !== "body") {
        return { content: [{ type: "text", text: `not an extracted-body door: ${door}` }], isError: true };
      }
      const url = new URL(`${LIVE_ORIGIN}${sku.path}`);
      url.searchParams.set("id", id.trim());
      const result = await getJson(url.toString(), x_payment);
      return { content: [{ type: "text", text: paidText(url.toString(), result.status, result.body) }] };
    },
  );

  const extra = extraMcpToolNames();
  console.error(
    `[bnm-data-shop] MCP tools from ${LIVE_ORIGIN}/.well-known/x402: ${skus.length} paid + ${extra.join(", ")}. Connect live: npx -y mcp-remote ${LIVE_ORIGIN}${MCP_PATH}`,
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
