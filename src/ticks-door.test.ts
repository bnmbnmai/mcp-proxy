import { createServer } from "node:http";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AddressInfo } from "node:net";
import assert from "node:assert/strict";
import { handleRequest, PAY_TO, TICKS_PATH, USDC_BASE, DEFAULT_TICKS_DIR, loadTicks, MANIFEST_PATH, CATALOG_PATH } from "./ticks-door.js";

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

  const memoDir = mkdtempSync(join(tmpdir(), "ticks-memo-"));
  writeFileSync(
    join(memoDir, "board.json"),
    JSON.stringify({
      fetchedAt: "2026-08-17T00:00:00Z",
      rows: [
        {
          id: "cattle-tf-feeder-steer",
          group: "cattle",
          commodity: "Feeder steers",
          market: "Twin Falls",
          unit: "$/cwt",
          price: 400.2,
          asOf: "2026-08-12",
          source: "Twin Falls Livestock Commission market report",
        },
      ],
      failed: [],
      history: {
        points: [],
        series: [{ id: "cattle-tf-feeder-steer", label: "Twin Falls feeder steers", group: "cattle" }],
        emptyReports: [
          {
            series: "hay-id-organic-alfalfa",
            reason:
              "No report. This report has no organic row. USDA printed no organic hay trade. We are not inventing a number and not reusing an older organic price as current.",
          },
          {
            id: "ams_3056-current",
            reason: "No report. HTTP Error 403: Forbidden",
          },
        ],
      },
    }),
  );

  await withServer(
    { TICKS_DIR: memoDir, X402_SKIP_SETTLE: "1", X402_USDC_ATOMIC: "20000" },
    async (base) => {
      const paid = await fetch(`${base}${TICKS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as ReturnType<typeof loadTicks>;
      assert.ok(!paidBody.ticks.some((row) => /organic/i.test(JSON.stringify(row))));
      assert.deepEqual(paidBody.history.emptyReports, [{ id: "ams_3056-current", status: "empty" }]);
      const blob = `${JSON.stringify(paidBody)}${JSON.stringify(await (await fetch(`${base}${MANIFEST_PATH}`)).json())}${JSON.stringify(await (await fetch(`${base}${CATALOG_PATH}`)).json())}`;
      assert.equal(/we are not inventing|this report has no organic row/i.test(blob), false);
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
        for (const marker of ["twin falls", "blackfoot", "ams_3056", "ams_3059"]) {
          assert.ok(blob.includes(marker), `paid JSON must include ${marker} when cache exists`);
        }
        assert.ok(body.ticks.length + body.history.points.length > 0, "real ticks present");
        const optionalPrefixes: [string, number][] = [
          ["ibc.id.grain.", 16],
          ["wd1.", 5],
          ["hay.ams_3058.", 4],
          ["ams.2914.", 4],
        ];
        for (const [prefix, min] of optionalPrefixes) {
          const n = body.ticks.filter((row) => String((row as Record<string, unknown>).id ?? "").startsWith(prefix)).length;
          if (n > 0) assert.ok(n >= min, `paid JSON includes ${prefix}* (${n})`);
        }
        const free = await fetch(`${base}${MANIFEST_PATH}`);
        assert.equal(free.status, 200);
        const catalog = await fetch(`${base}${CATALOG_PATH}`);
        assert.equal(catalog.status, 200);
        const manifest = (await free.json()) as {
          tickCount: number;
          groups: { id: string; tickCount: number }[];
          empty: { id?: string; status?: string; reason?: string; name?: string }[];
          samples: unknown[];
        };
        const catalogBody = await catalog.json();
        assert.equal(manifest.tickCount, body.ticks.length, "manifest count must match live public board");
        assert.ok(manifest.groups.some((g) => g.tickCount > 0), "manifest lists at least one group");
        for (const id of ["hay", "cattle", "produce", "grain", "water", "pulses"]) {
          const n = body.ticks.filter((row) => String((row as Record<string, unknown>).group ?? "") === id).length;
          if (n > 0) assert.ok(manifest.groups.some((g) => g.id === id && g.tickCount > 0), `manifest group ${id}`);
        }
        const publicCopy = `${JSON.stringify(manifest)}${JSON.stringify(catalogBody)}${JSON.stringify(body)}`;
        assert.equal(
          /we are not inventing|this report has no organic row|not reusing an older organic/i.test(publicCopy),
          false,
          "unpaid catalog/manifest and paid body must not ship collect memos",
        );
        assert.ok(!manifest.empty.some((e) => /organic/i.test(`${e.id ?? ""} ${e.name ?? ""} ${e.reason ?? ""}`)));
        assert.ok(manifest.empty.every((e) => e.status === "empty" && e.id && !("reason" in e)));
        assert.ok(manifest.samples.length >= 1 && manifest.samples.length <= 5);
        assert.ok(manifest.samples.every((s) => (s as { sample?: boolean }).sample === true));
        assert.ok(!("ticks" in manifest), "manifest must not dump paid ticks[]");
        assert.ok(
          !body.ticks.some((row) => /organic/i.test(String((row as Record<string, unknown>).id ?? ""))),
          "organic hay is not a product",
        );
        for (const row of body.history.emptyReports as Record<string, unknown>[]) {
          assert.deepEqual(Object.keys(row).sort(), ["id", "status"]);
          assert.equal(row.status, "empty");
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
      assert.ok(discovered.resources.includes("GET /catalog.json"));

      const spec = await fetch(`${base}/openapi.json`);
      assert.equal(spec.status, 200);
      const openapi = (await spec.json()) as { paths: Record<string, unknown> };
      assert.ok(openapi.paths["/ticks"]);
      assert.ok(openapi.paths[MANIFEST_PATH]);
      assert.ok(openapi.paths[CATALOG_PATH]);

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
