import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  AGENT_REGISTRATION_PATH,
  AGENT_REGISTRATION_WELL_KNOWN_PATH,
  AGENT_REGISTRY,
  ERC8004_AGENT_URI,
  ERC8004_PATH,
  ERC8004_PATHS,
  IDENTITY_REGISTRY,
  erc8004Registration,
} from "./erc8004.js";
import { handleRequest, llmsTxt, PAY_TO } from "./ticks-door.js";

function registrationJson(): string {
  return JSON.stringify(erc8004Registration());
}

async function withDoor(fn: (base: string) => Promise<void>): Promise<void> {
  const prevShop = process.env.SHOP_REQUEST_LOG;
  const prevSettle = process.env.SETTLE_LOG;
  process.env.SHOP_REQUEST_LOG = "0";
  process.env.SETTLE_LOG = "0";
  const server = createServer((req, res) => {
    void handleRequest(req, res, 0);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    if (prevShop === undefined) delete process.env.SHOP_REQUEST_LOG;
    else process.env.SHOP_REQUEST_LOG = prevShop;
    if (prevSettle === undefined) delete process.env.SETTLE_LOG;
    else process.env.SETTLE_LOG = prevSettle;
  }
}

async function main(): Promise<void> {
  const doc = erc8004Registration();
  assert.equal(doc.type, "https://eips.ethereum.org/EIPS/eip-8004#registration-v1");
  assert.equal(doc.x402Support, true);
  assert.equal(doc.active, true);
  assert.equal(doc.services.find((s) => s.name === "MCP")?.endpoint, "https://ticks.bnm.farm/mcp");
  assert.equal(doc.services.find((s) => s.name === "web")?.endpoint, "https://ticks.bnm.farm/");
  assert.equal(doc.services.find((s) => s.name === "x402")?.endpoint, "https://ticks.bnm.farm/.well-known/x402");
  assert.equal(doc.services.find((s) => s.name === "agentWallet")?.endpoint, `eip155:8453:${PAY_TO}`);
  assert.equal(PAY_TO, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.equal(IDENTITY_REGISTRY, "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432");
  assert.equal(AGENT_REGISTRY, `eip155:8453:${IDENTITY_REGISTRY}`);
  assert.equal(ERC8004_AGENT_URI, "https://ticks.bnm.farm/.well-known/erc8004.json");
  assert.equal("registrations" in doc, false);
  assert.equal(JSON.stringify(doc).includes("agentId"), false);
  assert.equal(/privateKey|seed phrase|mnemonic/i.test(registrationJson()), false);

  const llms = llmsTxt();
  assert.ok(llms.includes(ERC8004_PATH));
  assert.ok(llms.includes(AGENT_REGISTRATION_PATH));
  assert.ok(llms.includes("https://ticks.bnm.farm/mcp"));

  await withDoor(async (base) => {
    for (const path of ERC8004_PATHS) {
      const res = await fetch(`${base}${path}`);
      assert.equal(res.status, 200, path);
      assert.match(res.headers.get("content-type") ?? "", /application\/json/);
      assert.equal(await res.text(), registrationJson());
      const head = await fetch(`${base}${path}`, { method: "HEAD" });
      assert.equal(head.status, 200, `HEAD ${path}`);
      assert.equal(await head.text(), "");
      const paid = await fetch(`${base}${path}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200, `unpaid-shaped header still 200 ${path}`);
      assert.equal(await paid.text(), registrationJson());
    }

    const spec = (await (await fetch(`${base}/openapi.json`)).json()) as {
      paths: Record<string, { get?: { tags?: string[]; "x-payment-info"?: unknown } }>;
    };
    for (const path of [ERC8004_PATH, AGENT_REGISTRATION_PATH, AGENT_REGISTRATION_WELL_KNOWN_PATH]) {
      assert.ok(spec.paths[path]?.get?.tags?.includes("free"), path);
      assert.equal(spec.paths[path]?.get?.["x-payment-info"], undefined);
    }

    const wk = (await (await fetch(`${base}/.well-known/x402`)).json()) as { resources?: string[] };
    assert.ok(!wk.resources?.some((r) => r.includes("erc8004") || r.includes("agent-registration")));

    const shop = (await (await fetch(`${base}/`)).json()) as { erc8004?: string; agentRegistration?: string; products?: { path: string }[] };
    assert.equal(shop.erc8004, ERC8004_PATH);
    assert.equal(shop.agentRegistration, AGENT_REGISTRATION_PATH);
    assert.ok(!shop.products?.some((p) => ERC8004_PATHS.includes(p.path as (typeof ERC8004_PATHS)[number])));

    const missing = (await (await fetch(`${base}/no-such-erc8004`)).json()) as { error?: string; paths?: string[] };
    assert.equal(missing.error, "not_found");
    for (const path of ERC8004_PATHS) assert.ok(missing.paths?.includes(path), path);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
