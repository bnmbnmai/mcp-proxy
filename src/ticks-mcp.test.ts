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
  extraMcpToolNames,
  FIRM_CHECK_TOOL_NAME,
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

/** Must-have live doors. Count is taken from well-known, not hardcoded. */
const LIVE_WELL_KNOWN_REQUIRED = [
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
  "/ema-referrals",
  "/cder-reviews",
  "/npdes-permits",
  "/ofsted-inspections",
  "/form-483",
  "/gmp",
  "/gmp-md",
] as const;

async function withServer(
  envPatch: Record<string, string | undefined>,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const prev: Record<string, string | undefined> = {};
  const patch = {
    FORM_483_DIR: join(tmpdir(), "form-483-absent-mcp-"),
    GMP_DIR: join(tmpdir(), "gmp-absent-mcp-"),
    GMP_MD_DIR: join(tmpdir(), "gmp-md-absent-mcp-"),
    SHOP_REQUEST_LOG: "0",
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
  assert.ok(livePaths.length >= 1, "live well-known lists paid GETs");
  for (const path of LIVE_WELL_KNOWN_REQUIRED) {
    assert.ok(livePaths.includes(path), `live well-known lists ${path}`);
  }
  assert.ok(!livePaths.includes("/sample"), "/sample is free discovery, not a paid MCP tool");
  assert.ok(livePaths.includes("/cma-ca98"), "live well-known lists /cma-ca98");
  assert.ok(livePaths.includes("/cder-reviews"), "live well-known lists /cder-reviews");
  assert.ok(livePaths.includes("/npdes-permits"), "live well-known lists /npdes-permits");
  assert.ok(livePaths.includes("/ofsted-inspections"), "live well-known lists /ofsted-inspections");

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
  assert.equal(
    mcpToolDescriptors(LIVE_ORIGIN, fromLive).length,
    livePaths.length + extraMcpToolNames().length,
    "one tool per live paid GET plus free search / firm-check and paid get-one / get-page",
  );
  assert.equal(MCP_CONNECT, `npx -y mcp-remote ${LIVE_ORIGIN}${MCP_PATH}`);

  const listed = await handleMcpJsonRpc(
    { jsonrpc: "2.0", id: 1, method: "tools/list" },
    { wellKnown: wk },
  );
  const tools = (listed as { result: { tools: { name: string }[] } }).result.tools;
  const extras = new Set(extraMcpToolNames());
  const paidTools = tools.filter((t) => !extras.has(t.name));
    assert.equal(paidTools.length, livePaths.length);
    assert.ok(tools.some((t) => t.name === "ema-referrals"));
    assert.ok(tools.some((t) => t.name === "cder-reviews"));
    assert.ok(tools.some((t) => t.name === "npdes-permits"));
    assert.ok(tools.some((t) => t.name === "ofsted-inspections"));
  assert.deepEqual(paidTools.map((t) => `/${t.name}`), livePaths);
  assert.ok(tools.some((t) => t.name === "search"));
  assert.ok(tools.some((t) => t.name === FIRM_CHECK_TOOL_NAME));
  assert.ok(tools.some((t) => t.name === "get-page"));
  assert.ok(tools.some((t) => t.name === "get-one"));
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
      assert.ok(shop.products.some((p) => p.path === "/ema-referrals"));
      assert.ok(shop.products.some((p) => p.path === "/cder-reviews"));
      assert.ok(shop.products.some((p) => p.path === "/npdes-permits"));
      assert.ok(shop.products.some((p) => p.path === "/ofsted-inspections"));
      assert.ok(shop.products.some((p) => p.path === "/ofwat-enforcement"));
      assert.ok(shop.products.some((p) => p.path === "/ofgem-enforcement"));
      assert.ok(shop.products.some((p) => p.path === "/gain"));
      assert.ok(shop.products.some((p) => p.path === "/orr-enforcement"));
      assert.ok(shop.products.some((p) => p.path === "/phmsa-orders"));
      assert.ok(shop.products.some((p) => p.path === "/aaib-reports"));
      assert.ok(shop.products.some((p) => p.path === "/csb-reports"));
      assert.ok(shop.products.some((p) => p.path === "/hhs-oig-reports"));
      assert.ok(shop.products.some((p) => p.path === "/eis-reports"));
      assert.ok(shop.products.some((p) => p.path === "/fsis-humane"));
      assert.ok(shop.products.some((p) => p.path === "/epa-cafo"));

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
      assert.ok(localPaths.includes("/ema-referrals"), "local well-known lists /ema-referrals");
      assert.ok(localPaths.includes("/cder-reviews"), "local well-known lists /cder-reviews");
      assert.ok(localPaths.includes("/npdes-permits"), "local well-known lists /npdes-permits");
      assert.ok(localPaths.includes("/ofsted-inspections"), "local well-known lists /ofsted-inspections");
      assert.ok(localPaths.includes("/ofwat-enforcement"), "local well-known lists /ofwat-enforcement");
      assert.ok(localPaths.includes("/ofgem-enforcement"), "local well-known lists /ofgem-enforcement");
      assert.ok(localPaths.includes("/gain"), "local well-known lists /gain");
      assert.ok(localPaths.includes("/orr-enforcement"), "local well-known lists /orr-enforcement");
      assert.ok(localPaths.includes("/phmsa-orders"), "local well-known lists /phmsa-orders");
      assert.ok(localPaths.includes("/aaib-reports"), "local well-known lists /aaib-reports");
      assert.ok(localPaths.includes("/csb-reports"), "local well-known lists /csb-reports");
      assert.ok(localPaths.includes("/hhs-oig-reports"), "local well-known lists /hhs-oig-reports");
      assert.ok(localPaths.includes("/eis-reports"), "local well-known lists /eis-reports");
      assert.ok(localPaths.includes("/fsis-humane"), "local well-known lists /fsis-humane");
      assert.ok(localPaths.includes("/epa-cafo"), "local well-known lists /epa-cafo");

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
      };
      assert.equal(card.source, WELL_KNOWN_PATH);
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

      const list = await fetch(`${base}${MCP_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      });
      const listBody = (await list.json()) as { result: { tools: { name: string }[] } };
      assert.deepEqual(
        listBody.result.tools.filter((t) => !extraMcpToolNames().includes(t.name)).map((t) => t.name),
        livePaidNames(fromLocal),
      );
      assert.ok(listBody.result.tools.some((t) => t.name === "search"));
      assert.ok(listBody.result.tools.some((t) => t.name === FIRM_CHECK_TOOL_NAME));
      assert.ok(listBody.result.tools.some((t) => t.name === "get-page"));
      assert.ok(listBody.result.tools.some((t) => t.name === "get-one"));
      assert.ok(listBody.result.tools.some((t) => t.name === "cma-ca98"));
      assert.ok(listBody.result.tools.some((t) => t.name === "ema-referrals"), "MCP tools come from local well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "cder-reviews"), "MCP tools come from local well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "npdes-permits"), "MCP tools come from local well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "ofsted-inspections"), "MCP tools come from local well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "ofwat-enforcement"), "MCP tools come from local well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "ofgem-enforcement"), "MCP tools come from local well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "gain"), "MCP tools come from local well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "orr-enforcement"), "MCP tools come from local well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "phmsa-orders"), "MCP tools include /phmsa-orders from well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "aaib-reports"), "MCP tools include /aaib-reports from well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "csb-reports"), "MCP tools include /csb-reports from well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "hhs-oig-reports"), "MCP tools include /hhs-oig-reports from well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "eis-reports"), "MCP tools include /eis-reports from well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "fsis-humane"), "MCP tools include /fsis-humane from well-known");
      assert.ok(listBody.result.tools.some((t) => t.name === "epa-cafo"), "MCP tools include /epa-cafo from well-known");

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
