import { createServer } from "node:http";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AddressInfo } from "node:net";
import assert from "node:assert/strict";
import { handleRequest, PAY_TO, TICKS_PATH, USDC_BASE, DEFAULT_TICKS_DIR, loadTicks, MANIFEST_PATH } from "./ticks-door.js";

async function withServer(
  envPatch: Record<string, string | undefined>,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(envPatch)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const server = createServer((req, res) => handleRequest(req, res, 0));
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
  await withServer({ TICKS_PATH: "", TICKS_DIR: "", FARM_DATA_DIR: "", X402_USDC_ATOMIC: "" }, async (base) => {
    const res = await fetch(`${base}${TICKS_PATH}`);
    assert.equal(res.status, 402, "unpaid GET /ticks must be 402");
    const body = (await res.json()) as {
      payTo: string;
      asset: string;
      accepts: { payTo: string; asset: string; network: string }[];
    };
    assert.equal(body.payTo, PAY_TO);
    assert.equal(body.asset, USDC_BASE);
    assert.equal(body.accepts[0]?.payTo, PAY_TO);
    assert.equal(body.accepts[0]?.network, "base");
    assert.ok(res.headers.get("payment-required"), "v2 PAYMENT-REQUIRED header");
    assert.equal(
      Object.prototype.hasOwnProperty.call(body.accepts[0], "maxAmountRequired"),
      false,
      "must not invent a list price when X402_USDC_ATOMIC is unset",
    );
  });

  const dir = mkdtempSync(join(tmpdir(), "idaho-ticks-"));
  writeFileSync(
    join(dir, "board.json"),
    JSON.stringify({
      fetchedAt: "2026-08-12T00:00:00Z",
      rows: [],
      failed: [],
      history: { points: [], emptyReports: [], series: [] },
    }),
  );

  await withServer(
    { TICKS_DIR: dir, X402_SKIP_SETTLE: "1", X402_USDC_ATOMIC: "" },
    async (base) => {
      const unpaid = await fetch(`${base}${TICKS_PATH}`);
      assert.equal(unpaid.status, 402);
      const paid = await fetch(`${base}${TICKS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const body = (await paid.json()) as ReturnType<typeof loadTicks>;
      assert.equal(body.product, "idaho-hay-feeder-ticks");
      assert.equal(body.status, "stale");
      assert.ok(body.reason);
      assert.deepEqual(body.ticks, []);
    },
  );

  const liveBoard = join(DEFAULT_TICKS_DIR, "board.json");
  if (existsSync(liveBoard)) {
    await withServer(
      { TICKS_DIR: DEFAULT_TICKS_DIR, X402_SKIP_SETTLE: "1", X402_USDC_ATOMIC: "" },
      async (base) => {
        const unpaid = await fetch(`${base}${TICKS_PATH}`);
        assert.equal(unpaid.status, 402);
        const paid = await fetch(`${base}${TICKS_PATH}`, { headers: { "X-PAYMENT": "test" } });
        assert.equal(paid.status, 200);
        const body = (await paid.json()) as ReturnType<typeof loadTicks>;
        const blob = JSON.stringify(body).toLowerCase();
        for (const marker of [
          "twin falls",
          "blackfoot",
          "ams_3056",
          "ams_3059",
          "if_fv130",
          "ibc.id.grain",
          "wd1.",
          "hay.ams_3058",
          "columbia_umatilla",
          "ams.2914",
        ]) {
          assert.ok(blob.includes(marker), `paid JSON must include ${marker} when cache exists`);
        }
        assert.ok(body.ticks.length + body.history.points.length > 0, "real ticks present");
        const grain = body.ticks.filter((row) =>
          String((row as Record<string, unknown>).id ?? "").startsWith("ibc.id.grain."),
        );
        assert.ok(grain.length >= 16, `paid JSON must include IBC grain ticks already in the cache (got ${grain.length})`);
        const wd1 = body.ticks.filter((row) =>
          String((row as Record<string, unknown>).id ?? "").startsWith("wd1."),
        );
        assert.ok(wd1.length >= 5, `paid JSON must include WD1 rental-pool ticks already in the cache (got ${wd1.length})`);
        const hay3058 = body.ticks.filter((row) =>
          String((row as Record<string, unknown>).id ?? "").startsWith("hay.ams_3058."),
        );
        assert.ok(hay3058.length >= 4, `paid JSON must include AMS 3058 Columbia Basin hay (got ${hay3058.length})`);
        const waor = body.ticks.filter((row) =>
          String((row as Record<string, unknown>).id ?? "").includes("columbia_umatilla"),
        );
        assert.ok(waor.length >= 15, `paid JSON must include IF_FV130 columbia_umatilla ticks (got ${waor.length})`);
        const pulses = body.ticks.filter((row) =>
          String((row as Record<string, unknown>).id ?? "").startsWith("ams.2914."),
        );
        assert.ok(pulses.length >= 4, `paid JSON must include AMS 2914 PNW pulses (got ${pulses.length})`);
        const free = await fetch(`${base}${MANIFEST_PATH}`);
        assert.equal(free.status, 200);
        const manifest = (await free.json()) as {
          tickCount: number;
          groups: { id: string; tickCount: number }[];
          empty: { product?: boolean; name?: string; reason?: string }[];
          samples: unknown[];
        };
        assert.equal(manifest.tickCount, body.ticks.length, "manifest count must match live public board");
        for (const id of ["hay", "cattle", "produce", "grain", "water", "pulses"]) {
          assert.ok(manifest.groups.some((g) => g.id === id && g.tickCount > 0), `manifest group ${id}`);
        }
        assert.ok(
          manifest.empty.some((e) => e.product === false && /organic/i.test(`${e.name ?? ""} ${e.reason ?? ""}`)),
          "organic hay must be labeled empty, not a product",
        );
        assert.ok(manifest.samples.length >= 3 && manifest.samples.length <= 5);
        assert.ok(manifest.samples.every((s) => (s as { sample?: boolean }).sample === true));
        assert.ok(!("ticks" in manifest), "manifest must not dump paid ticks[]");
        const organic = body.ticks.filter((row) => {
          const rec = row as Record<string, unknown>;
          return String(rec.id ?? "").toLowerCase() === "hay-idaho-organic";
        });
        for (const row of organic) {
          const rec = row as Record<string, unknown>;
          assert.equal(rec.price, undefined, "organic hay must stay empty — do not invent a price");
        }
      },
    );
  }

  await withServer(
    { TICKS_DIR: dir, X402_USDC_ATOMIC: "20000", X402_RESOURCE_URL: "https://ticks.bnm.farm" },
    async (base) => {
      const unpaid = await fetch(`${base}${TICKS_PATH}`);
      assert.equal(unpaid.status, 402);
      const body = (await unpaid.json()) as {
        payTo: string;
        accepts: { maxAmountRequired?: string; resource?: string; outputSchema?: { input?: { discoverable?: boolean } } }[];
      };
      assert.equal(body.payTo, PAY_TO);
      assert.equal(body.accepts[0]?.maxAmountRequired, "20000");
      assert.equal(body.accepts[0]?.resource, "https://ticks.bnm.farm/ticks");
      assert.equal(body.accepts[0]?.outputSchema?.input?.discoverable, true);

      const wellKnown = await fetch(`${base}/.well-known/x402`);
      assert.equal(wellKnown.status, 200);
      const discovered = (await wellKnown.json()) as { resources: string[] };
      assert.ok(discovered.resources.includes("GET /ticks"));
      assert.ok(discovered.resources.includes("GET /manifest.json"));

      const spec = await fetch(`${base}/openapi.json`);
      assert.equal(spec.status, 200);
      const openapi = (await spec.json()) as { paths: Record<string, unknown> };
      assert.ok(openapi.paths["/ticks"]);
      assert.ok(openapi.paths[MANIFEST_PATH]);

      const manifestRes = await fetch(`${base}${MANIFEST_PATH}`);
      assert.equal(manifestRes.status, 200, "GET /manifest.json is free (no payment)");
      const manifest = (await manifestRes.json()) as {
        tickCount: number;
        samples: unknown[];
        schema?: { paidResponse?: { ticks?: string } };
      };
      assert.equal(typeof manifest.tickCount, "number");
      assert.ok(!("ticks" in manifest), "manifest must not dump paid ticks[]");
      assert.ok(manifest.schema?.paidResponse?.ticks);
    },
  );

  console.log("ticks-door tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
