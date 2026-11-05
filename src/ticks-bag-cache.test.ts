/**
 * The hay reload must not wedge the door.
 * A worker pause stands in for JSON.parse of the rewritten bag. While that
 * pause is in flight, /.well-known/x402 still has to answer.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resetTicksBagCacheForTests } from "./ticks-bag-cache.js";
import { handleRequest, TICKS_MANIFEST_PATH, TICKS_PATH, WELL_KNOWN_PATH } from "./ticks-door.js";

function row(id: string): Record<string, unknown> {
  return {
    id,
    source: "Blackfoot Livestock Auction representative sales",
    group: "cattle",
    commodity: "Feeder steers",
    market: "Blackfoot",
    unit: "$/cwt",
    price: 100,
    asOf: "2026-11-01",
  };
}

function writeBoard(dir: string, fetchedAt: string, ids: string[]): void {
  writeFileSync(
    join(dir, "board.json"),
    JSON.stringify({
      fetchedAt,
      rows: ids.map(row),
      failed: [],
      history: { points: [], emptyReports: [], series: [] },
    }),
  );
}

async function listen(): Promise<{ base: string; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    void handleRequest(req, res, 0);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

async function main(): Promise<void> {
  const absent = mkdtempSync(join(tmpdir(), "ticks-bag-absent-"));
  process.env.GMP_DIR = join(absent, "gmp");
  process.env.GMP_MD_DIR = join(absent, "gmp-md");
  process.env.FORM_483_DIR = join(absent, "form-483");
  process.env.SUPERFUND_RODS_DIR = join(absent, "superfund");
  process.env.TICKS_AMS_DIR = join(absent, "ams");
  mkdirSync(process.env.GMP_DIR, { recursive: true });
  mkdirSync(process.env.GMP_MD_DIR, { recursive: true });
  mkdirSync(process.env.FORM_483_DIR, { recursive: true });
  mkdirSync(process.env.SUPERFUND_RODS_DIR, { recursive: true });
  process.env.SHOP_REQUEST_LOG = "0";
  process.env.SETTLE_LOG = "0";
  process.env.X402_SKIP_SETTLE = "1";
  mkdirSync(process.env.TICKS_AMS_DIR, { recursive: true });

  const dir = mkdtempSync(join(tmpdir(), "ticks-bag-cache-"));
  process.env.TICKS_DIR = dir;
  writeBoard(dir, "2026-11-01T01:00:00Z", ["cattle-bf-feeder-steer"]);

  process.env.TICKS_BAG_FORCE_WORKER = "1";
  process.env.TICKS_BAG_WORKER_PAUSE_MS = "2500";
  resetTicksBagCacheForTests();
  const cold = await listen();
  try {
    const manifestP = fetch(`${cold.base}${TICKS_MANIFEST_PATH}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const started = Date.now();
    const wellKnown = await fetch(`${cold.base}${WELL_KNOWN_PATH}`);
    const elapsed = Date.now() - started;
    assert.equal(wellKnown.status, 200);
    assert.ok(elapsed < 1000, `well-known took ${elapsed}ms while the hay bag reload was still running`);
    const doc = (await wellKnown.json()) as { resources?: unknown };
    assert.ok(Array.isArray(doc.resources) && doc.resources.length > 0);
    const manifest = await manifestP;
    assert.equal(manifest.status, 200);
    const body = (await manifest.json()) as { tickCount?: number; fetchedAt?: string };
    assert.equal(body.tickCount, 1);
    assert.equal(body.fetchedAt, "2026-11-01T01:00:00Z");
  } finally {
    await cold.close();
  }

  process.env.TICKS_BAG_WORKER_PAUSE_MS = "2000";
  writeBoard(dir, "2026-11-01T02:00:00Z", ["cattle-bf-feeder-steer", "cattle-bf-feeder-heifer"]);
  const staleServer = await listen();
  try {
    const started = Date.now();
    const first = await fetch(`${staleServer.base}${TICKS_MANIFEST_PATH}`);
    const elapsed = Date.now() - started;
    assert.equal(first.status, 200);
    assert.ok(elapsed < 800, `stale manifest took ${elapsed}ms`);
    const staleBody = (await first.json()) as { tickCount?: number; fetchedAt?: string };
    assert.equal(staleBody.fetchedAt, "2026-11-01T01:00:00Z", "rewrite serves the previous bag while reload runs");
    assert.equal(staleBody.tickCount, 1);
    const startedWell = Date.now();
    const wellKnown = await fetch(`${staleServer.base}${WELL_KNOWN_PATH}`);
    const wellElapsed = Date.now() - startedWell;
    assert.equal(wellKnown.status, 200);
    assert.ok(wellElapsed < 1000, `well-known took ${wellElapsed}ms during background hay reload`);
    const other = await fetch(`${staleServer.base}/superfund-rods/manifest.json`);
    assert.equal(other.status, 200, "another door manifest stays up during hay reload");
    let freshBody: { tickCount?: number; fetchedAt?: string } = {};
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const fresh = await fetch(`${staleServer.base}${TICKS_MANIFEST_PATH}`);
      freshBody = (await fresh.json()) as { tickCount?: number; fetchedAt?: string };
      if (freshBody.fetchedAt === "2026-11-01T02:00:00Z") break;
    }
    assert.equal(freshBody.fetchedAt, "2026-11-01T02:00:00Z");
    assert.equal(freshBody.tickCount, 2);
    const paid = await fetch(`${staleServer.base}${TICKS_PATH}`, { headers: { "X-PAYMENT": "test" } });
    assert.equal(paid.status, 200);
    const paidBody = (await paid.json()) as { fetchedAt?: string; recordCount?: number };
    assert.equal(paidBody.fetchedAt, "2026-11-01T02:00:00Z");
    assert.equal(paidBody.recordCount, 2);
  } finally {
    await staleServer.close();
  }

  delete process.env.TICKS_BAG_FORCE_WORKER;
  delete process.env.TICKS_BAG_WORKER_PAUSE_MS;
  resetTicksBagCacheForTests();
  const syncDir = mkdtempSync(join(tmpdir(), "ticks-bag-sync-"));
  process.env.TICKS_DIR = syncDir;
  writeBoard(syncDir, "2026-11-01T03:00:00Z", ["cattle-bf-feeder-steer"]);
  const syncServer = await listen();
  try {
    const first = (await (await fetch(`${syncServer.base}${TICKS_MANIFEST_PATH}`)).json()) as { fetchedAt?: string };
    assert.equal(first.fetchedAt, "2026-11-01T03:00:00Z");
    writeBoard(syncDir, "2026-11-01T04:00:00Z", ["cattle-bf-feeder-steer", "cattle-bf-cow"]);
    const second = (await (await fetch(`${syncServer.base}${TICKS_MANIFEST_PATH}`)).json()) as {
      fetchedAt?: string;
      tickCount?: number;
    };
    assert.equal(second.fetchedAt, "2026-11-01T04:00:00Z", "small bags still reload on the request");
    assert.equal(second.tickCount, 2);
  } finally {
    await syncServer.close();
    resetTicksBagCacheForTests();
  }

  console.log("ticks bag cache tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
