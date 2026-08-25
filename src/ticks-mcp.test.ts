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
  livePaidNames,
  livePaidPaths,
  MCP_CONNECT,
  mcpDiscovery,
  mcpToolDescriptors,
  resolveMcpCatalog,
  skusFromWellKnown,
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
  "/cma-ca98",
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
  const liveWk = await fetch(`${LIVE_ORIGIN}${WELL_KNOWN_PATH}`);
  assert.equal(liveWk.status, 200, "live well-known must be reachable");
  const wk = (await liveWk.json()) as { resources: string[] };
  const livePaths = wk.resources.map((url) => new URL(url).pathname);
  assert.equal(livePaths.length, 32, "this deploy well-known is 32 paid GETs after /cma-ca98");
  assert.deepEqual(livePaths, LIVE_WELL_KNOWN_PATHS);
  assert.ok(livePaths.includes("/cma-ca98"), "live well-known lists /cma-ca98");

  const fromLive = skusFromWellKnown(wk);
  assert.deepEqual(livePaidPaths(fromLive), livePaths, "MCP tools === well-known resources");
  assert.equal(findLiveSku("cma-ca98", fromLive)?.path, "/cma-ca98");
  assert.equal(findLiveSku("/cma-ca98", fromLive)?.name, "cma-ca98");
  assert.equal(findLiveSku("economic_indicators", fromLive), undefined);
  assertNoForbiddenExtras(livePaidNames(fromLive));
  assertNoForbiddenExtras(livePaidPaths(fromLive));
  assert.ok(!livePaidNames(fromLive).includes("fred"));
  assert.ok(!livePaidNames(fromLive).includes("wasde"));
  assert.equal(fromLive[0]?.priceUsdc, "0.05");
  assert.ok(fromLive.every((sku) => sku.priceUsdc === "0.05"));
  assert.equal(mcpToolDescriptors(LIVE_ORIGIN, fromLive).length, 32);
  assert.equal(MCP_CONNECT, `npx -y mcp-remote ${LIVE_ORIGIN}${MCP_PATH}`);

  const listed = await handleMcpJsonRpc(
    { jsonrpc: "2.0", id: 1, method: "tools/list" },
    { wellKnown: wk },
  );
  const tools = (listed as { result: { tools: { name: string }[] } }).result.tools;
  assert.equal(tools.length, 32);
  assert.deepEqual(tools.map((t) => `/${t.name}`), livePaths);
  assert.ok(tools.some((t) => t.name === "cma-ca98"));

  const unknown = await handleMcpJsonRpc(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "not-a-shop-door", arguments: {} },
    },
    { wellKnown: wk },
  );
  assert.ok((unknown as { error?: { message?: string } }).error?.message?.includes("Unknown tool"));

  const futureWk = {
    resources: [...wk.resources, `${LIVE_ORIGIN}/future-door`],
  };
  const future = skusFromWellKnown(futureWk);
  assert.ok(future.some((sku) => sku.name === "future-door"), "new well-known SKU becomes a tool");
  assert.ok(future.some((sku) => sku.name === "cma-ca98"), "CMA stays a tool when well-known lists it");
  const futureList = await handleMcpJsonRpc(
    { jsonrpc: "2.0", id: 5, method: "tools/list" },
    { wellKnown: futureWk },
  );
  const futureTools = (futureList as { result: { tools: { name: string }[] } }).result.tools;
  assert.ok(futureTools.some((t) => t.name === "future-door"));
  assert.ok(futureTools.some((t) => t.name === "cma-ca98"));
  assert.ok(!livePaths.includes("/future-door"));
  assert.ok(livePaths.includes("/cma-ca98"));

  await withServer(
    { X402_SKIP_SETTLE: "1", X402_USDC_ATOMIC: "" },
    async (base) => {
      const shop = (await (await fetch(`${base}/`)).json()) as {
        mcp?: string;
        products: { path: string }[];
      };
      assert.equal(shop.mcp, MCP_PATH);
      assert.ok(!shop.products.some((p) => p.path === MCP_PATH), "/mcp is not a paid SKU");
      assert.ok(shop.products.some((p) => p.path === "/cma-ca98"));

      const wellKnown = (await (await fetch(`${base}${WELL_KNOWN_PATH}`)).json()) as {
        mcp?: string;
        resources: string[];
        instructions?: string;
      };
      assert.ok(wellKnown.mcp?.endsWith(MCP_PATH));
      assert.ok(!wellKnown.resources.some((r) => r.includes(MCP_PATH)));
      assert.ok((wellKnown.instructions ?? "").includes("/mcp"));
      const localPaths = wellKnown.resources.map((url) => new URL(url).pathname);
      assert.ok(localPaths.includes("/cma-ca98"));

      const llms = await (await fetch(`${base}${LLMS_PATH}`)).text();
      assert.ok(llms.includes("GET/POST /mcp"));
      assert.ok(llms.includes("npx -y mcp-remote https://ticks.bnm.farm/mcp"));
      assert.ok(llms.includes("generated at request time"));
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
        source?: string;
        note?: string;
      };
      assert.equal(card.source, WELL_KNOWN_PATH);
      assert.ok((card.note ?? "").includes("entire current table"));
      assert.ok((card.note ?? "").includes("newest 100 official texts"));
      assert.ok(!(card.note ?? "").includes("entire current cache"));
      assert.deepEqual(card.paidGets, localPaths);
      assert.equal(card.tools, localPaths.length);
      assert.ok(card.connect?.includes("mcp-remote"));
      assert.ok(card.url?.endsWith(MCP_PATH));
      const fromLocal = await resolveMcpCatalog({ origin: base, wellKnown });
      assert.deepEqual(livePaidPaths(fromLocal), localPaths);
      assert.equal(mcpDiscovery(base, fromLocal).tools, localPaths.length);

      const init = await fetch(`${base}${MCP_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
      });
      assert.equal(init.status, 200);
      const initBody = (await init.json()) as { result?: { serverInfo?: { name?: string }; instructions?: string } };
      assert.equal(initBody.result?.serverInfo?.name, "bnm-data-shop");
      assert.ok(initBody.result?.instructions?.includes(WELL_KNOWN_PATH));
      assert.ok(initBody.result?.instructions?.includes("entire current table"));
      assert.ok(initBody.result?.instructions?.includes("newest 100 official texts"));
      assert.ok(!(initBody.result?.instructions ?? "").includes("entire current cache"));

      const list = await fetch(`${base}${MCP_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      });
      const listBody = (await list.json()) as { result: { tools: { name: string; title?: string; description?: string }[] } };
      assert.deepEqual(listBody.result.tools.map((t) => t.name), livePaidNames(fromLocal));
      assert.ok(listBody.result.tools.some((t) => t.name === "cma-ca98"));
      const ticksTool = listBody.result.tools.find((t) => t.name === "ticks");
      const lettersTool = listBody.result.tools.find((t) => t.name === "warning-letters");
      const cardsTool = listBody.result.tools.find((t) => t.name === "cma-ca98");
      assert.equal(ticksTool?.name, "ticks");
      assert.equal(ticksTool?.title, "US hay, cattle, and grain ticks");
      assert.ok((ticksTool?.description ?? "").includes("US hay, cattle, and grain ticks"));
      assert.ok(!(ticksTool?.title ?? "").startsWith("Idaho"));
      assert.ok(!(ticksTool?.title ?? "").startsWith("PNW"));
      assert.ok(!(ticksTool?.description ?? "").includes("Idaho +"));
      assert.ok(!(ticksTool?.description ?? "").includes("PNW barns"));
      assert.ok((ticksTool?.description ?? "").includes("ticks[] + history"));
      assert.ok((ticksTool?.description ?? "").includes("entire current table"));
      assert.equal((ticksTool?.description ?? "").split("Paid JSON is").length - 1, 1);
      assert.equal((ticksTool?.description ?? "").split("One $0.05 GET returns the entire current table").length - 1, 1);
      assert.ok(!(ticksTool?.description ?? "").includes("entire current cache"));
      assert.ok(!(ticksTool?.description ?? "").includes("Entire current cache"));
      const icoTool = listBody.result.tools.find((t) => t.name === "ico-mpn");
      assert.ok((icoTool?.description ?? "").includes("newest 100 official texts"));
      assert.equal((icoTool?.description ?? "").split("One $0.05 GET returns the newest 100 official texts").length - 1, 1);
      assert.ok(!(icoTool?.description ?? "").includes("entire current cache"));
      assert.ok(!(ticksTool?.description ?? "").includes("Not people"));
      assert.ok(!(ticksTool?.description ?? "").includes("Not a new SKU"));
      assert.ok((lettersTool?.description ?? "").includes("letters[].body"));
      assert.ok((cardsTool?.description ?? "").includes("cards[].body"));
      assert.ok(!listBody.result.tools.some((t) => (t.description ?? "").includes("31 paid")));

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
