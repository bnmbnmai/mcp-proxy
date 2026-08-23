import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import {
  handleRequest,
  LLMS_PATH,
  MCP_PATH,
  OPENAPI_PATH,
  TICKS_PATH,
  WELL_KNOWN_PATH,
} from "./ticks-door.js";
import {
  assertNoForbiddenExtras,
  findLiveSku,
  handleMcpJsonRpc,
  LIVE_ORIGIN,
  LIVE_PAID_SKUS,
  livePaidNames,
  livePaidPaths,
  MCP_CONNECT,
  mcpDiscovery,
  mcpToolDescriptors,
} from "./ticks-mcp.js";

const LIVE_WELL_KNOWN_PATHS = [
  "/ticks",
  "/import-alerts",
  "/mariners",
  "/mariners-d11",
  "/mariners-d7",
  "/mariners-d8",
  "/warning-letters",
  "/untitled-letters",
  "/awa",
  "/swisspar",
  "/pcac",
  "/ftc-wl",
  "/cfpb-orders",
  "/occ-cd",
  "/fdic-orders",
  "/frb-orders",
  "/ncua-orders",
  "/fincen-orders",
  "/ferc-orders",
  "/ofac-orders",
  "/bis-orders",
  "/cftc-orders",
  "/fifra-orders",
  "/denovo-orders",
  "/ttb-oic",
  "/air-letters",
  "/superfund-rods",
  "/ico-mpn",
  "/form-483",
  "/gmp",
  "/gmp-md",
];

async function withServer(
  envPatch: Record<string, string | undefined>,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const prev: Record<string, string | undefined> = {};
  const patch = {
    FORM_483_DIR: join(tmpdir(), "form-483-absent-mcp-"),
    GMP_DIR: join(tmpdir(), "gmp-absent-mcp-"),
    GMP_MD_DIR: join(tmpdir(), "gmp-md-absent-mcp-"),
    ...envPatch,
  };
  for (const [k, v] of Object.entries(patch)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const server = createServer((req, res) => {
    void handleRequest(req, res, 0);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

async function main(): Promise<void> {
  assert.equal(LIVE_PAID_SKUS.length, 31, "tools === live 31");
  assert.deepEqual(livePaidPaths(), LIVE_WELL_KNOWN_PATHS);
  assert.equal(new Set(livePaidNames()).size, 31);
  assert.equal(findLiveSku("cma-ca98"), undefined);
  assert.equal(findLiveSku("/cma-ca98"), undefined);
  assert.equal(findLiveSku("economic_indicators"), undefined);
  assertNoForbiddenExtras(livePaidNames());
  assertNoForbiddenExtras(livePaidPaths());
  assert.ok(!livePaidPaths().some((p) => p.includes("cma-ca98")));
  assert.ok(!livePaidPaths().some((p) => p.includes("openfda")));
  assert.ok(!livePaidNames().includes("fred"));
  assert.ok(!livePaidNames().includes("wasde"));
  assert.equal(LIVE_PAID_SKUS[0]?.priceUsdc, "0.02");
  assert.ok(LIVE_PAID_SKUS.slice(1).every((sku) => sku.priceUsdc === "0.05"));
  assert.equal(mcpToolDescriptors().length, 31);
  assert.equal(MCP_CONNECT, `npx -y mcp-remote ${LIVE_ORIGIN}${MCP_PATH}`);

  const listed = await handleMcpJsonRpc({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  const tools = (listed as { result: { tools: { name: string }[] } }).result.tools;
  assert.equal(tools.length, 31);
  assert.deepEqual(tools.map((t) => `/${t.name}`), LIVE_WELL_KNOWN_PATHS);
  assert.ok(!tools.some((t) => t.name === "cma-ca98"));

  const unknown = await handleMcpJsonRpc({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "cma-ca98", arguments: {} },
  });
  assert.ok((unknown as { error?: { message?: string } }).error?.message?.includes("Unknown tool"));

  const liveWk = await fetch(`${LIVE_ORIGIN}/.well-known/x402`);
  assert.equal(liveWk.status, 200, "live well-known must be reachable");
  const wk = (await liveWk.json()) as { resources: string[] };
  const livePaths = wk.resources.map((url) => new URL(url).pathname);
  assert.equal(livePaths.length, 31, "live well-known is 31 paid GETs");
  assert.deepEqual(livePaidPaths(), livePaths, "MCP tools === live well-known resources");
  assert.ok(!livePaths.includes("/cma-ca98"));

  await withServer(
    { X402_SKIP_SETTLE: "1", X402_USDC_ATOMIC: "" },
    async (base) => {
      const shop = (await (await fetch(`${base}/`)).json()) as {
        mcp?: string;
        products: { path: string }[];
      };
      assert.equal(shop.mcp, MCP_PATH);
      assert.ok(!shop.products.some((p) => p.path === MCP_PATH), "/mcp is not a paid SKU");

      const wellKnown = (await (await fetch(`${base}${WELL_KNOWN_PATH}`)).json()) as {
        mcp?: string;
        resources: string[];
        instructions?: string;
      };
      assert.ok(wellKnown.mcp?.endsWith(MCP_PATH));
      assert.ok(!wellKnown.resources.some((r) => r.includes(MCP_PATH)));
      assert.ok((wellKnown.instructions ?? "").includes("/mcp"));

      const llms = await (await fetch(`${base}${LLMS_PATH}`)).text();
      assert.ok(llms.includes("GET/POST /mcp"));
      assert.ok(llms.includes("npx -y mcp-remote https://ticks.bnm.farm/mcp"));
      assert.ok(llms.includes("Not Bazaar-indexed"));
      assert.ok(!llms.includes("WASDE"));
      assert.ok(!llms.toLowerCase().includes("openfda"));

      const spec = (await (await fetch(`${base}${OPENAPI_PATH}`)).json()) as {
        paths: Record<string, { get?: { "x-payment-info"?: unknown }; post?: { "x-payment-info"?: unknown } }>;
      };
      assert.ok(spec.paths[MCP_PATH]?.get);
      assert.ok(spec.paths[MCP_PATH]?.post);
      assert.equal(spec.paths[MCP_PATH]?.get?.["x-payment-info"], undefined, "/mcp is free discovery");
      assert.equal(spec.paths[MCP_PATH]?.post?.["x-payment-info"], undefined);

      const discover = await fetch(`${base}${MCP_PATH}`);
      assert.equal(discover.status, 200);
      const card = (await discover.json()) as {
        url?: string;
        tools?: number;
        connect?: string;
        paidGets?: string[];
      };
      assert.equal(card.tools, 31);
      assert.deepEqual(card.paidGets, LIVE_WELL_KNOWN_PATHS);
      assert.ok(card.connect?.includes("mcp-remote"));
      assert.ok(card.url?.endsWith(MCP_PATH));
      assert.equal(mcpDiscovery(base).tools, 31);

      const init = await fetch(`${base}${MCP_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
      });
      assert.equal(init.status, 200);
      const initBody = (await init.json()) as { result?: { serverInfo?: { name?: string } } };
      assert.equal(initBody.result?.serverInfo?.name, "bnm-data-shop");

      const list = await fetch(`${base}${MCP_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      });
      const listBody = (await list.json()) as { result: { tools: { name: string }[] } };
      assert.equal(listBody.result.tools.length, 31);
      assert.deepEqual(listBody.result.tools.map((t) => t.name), livePaidNames());

      const unpaid = await fetch(`${base}${MCP_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "ticks", arguments: {} },
        }),
      });
      const unpaidBody = (await unpaid.json()) as { result: { content: { text: string }[] } };
      assert.ok(unpaidBody.result.content[0]?.text.includes("HTTP 402"));
      assert.ok(unpaidBody.result.content[0]?.text.includes(TICKS_PATH));

      const paid = await fetch(`${base}${MCP_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: { name: "ticks", arguments: { x_payment: "test" } },
        }),
      });
      const paidBody = (await paid.json()) as { result: { content: { text: string }[] } };
      assert.ok(paidBody.result.content[0]?.text.includes("HTTP 200"));
      assert.ok(paidBody.result.content[0]?.text.includes("idaho-hay-feeder-ticks"));
    },
  );

  console.log("ticks-mcp tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
