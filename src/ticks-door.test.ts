import { createServer } from "node:http";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AddressInfo } from "node:net";
import assert from "node:assert/strict";
import { handleRequest, PAY_TO, TICKS_PATH, USDC_BASE, DEFAULT_TICKS_DIR, loadTicks, MANIFEST_PATH, CATALOG_PATH, bazaarExtension } from "./ticks-door.js";
import {
  IMPORT_ALERTS_AMOUNT_ATOMIC,
  IMPORT_ALERTS_MANIFEST_PATH,
  IMPORT_ALERTS_PATH,
  TICKS_AMOUNT_ATOMIC,
} from "./import-alerts.js";
import {
  MARINERS_AMOUNT_ATOMIC,
  MARINERS_MANIFEST_PATH,
  MARINERS_PATH,
} from "./mariners.js";

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
      (body.accepts[0] as { maxAmountRequired?: string }).maxAmountRequired,
      TICKS_AMOUNT_ATOMIC,
      "Idaho /ticks list price is $0.02 (20000 atomic)",
    );
    const pr = res.headers.get("payment-required");
    assert.ok(pr, "v2 PAYMENT-REQUIRED header");
    const v2 = JSON.parse(Buffer.from(pr, "base64").toString("utf8")) as {
      extensions?: { bazaar?: { info?: { input?: { type?: string; method?: string } } } };
      resource?: { description?: string };
    };
    assert.equal(v2.extensions?.bazaar?.info?.input?.type, "http");
    assert.equal(v2.extensions?.bazaar?.info?.input?.method, "GET");
    assert.ok((v2.resource?.description ?? "").includes("Call GET /ticks"));
    assert.ok((v2.resource?.description ?? "").length <= 500);
    const declared = bazaarExtension("ticks");
    assert.deepEqual(
      v2.extensions?.bazaar?.info?.input,
      (declared.info as { input: unknown }).input,
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
      failed: [
        {
          id: "hay-idaho-organic",
          reason:
            "No report. This report has no organic row. USDA printed no organic hay trade. We are not inventing a number and not reusing an older organic price as current.",
        },
      ],
      history: {
        points: [],
        series: [
          { id: "cattle-tf-feeder-steer", label: "Twin Falls feeder steers", group: "cattle" },
          { id: "hay-id-organic-alfalfa", label: "USDA organic (Idaho)", group: "hay" },
        ],
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
      assert.ok(!paidBody.failed.some((row) => /organic/i.test(JSON.stringify(row))));
      assert.ok(!paidBody.history.series.some((row) => /organic/i.test(JSON.stringify(row))));
      assert.deepEqual(paidBody.history.emptyReports, [{ id: "ams_3056-current", status: "empty" }]);
      const manifest = await (await fetch(`${base}${MANIFEST_PATH}`)).json() as {
        empty?: { id?: string; status?: string; reason?: string; name?: string }[];
      };
      const catalog = await (await fetch(`${base}${CATALOG_PATH}`)).json();
      const blob = `${JSON.stringify(paidBody)}${JSON.stringify(manifest)}${JSON.stringify(catalog)}`;
      assert.equal(/we are not inventing|this report has no organic row|usda organic/i.test(blob), false);
      assert.ok((manifest.empty ?? []).every((e) => e.status === "empty" && e.id && !("reason" in e)));
      assert.ok(!(manifest.empty ?? []).some((e) => /organic/i.test(`${e.id ?? ""} ${e.name ?? ""}`)));
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
        for (const marker of ["twin falls", "blackfoot", "ams_3056", "ams_3059", "ibc.id.grain", "wd1.", "hay.ams_3058", "ams.2914"]) {
          assert.ok(blob.includes(marker), `paid JSON must include ${marker} when cache exists`);
        }
        assert.ok(body.ticks.length + body.history.points.length > 0, "real ticks present");
        const ticksManifest = await fetch(`${base}${MANIFEST_PATH}`);
        assert.equal(ticksManifest.status, 200);
        const catalogRes = await fetch(`${base}${CATALOG_PATH}`);
        assert.equal(catalogRes.status, 200);
        const tm = (await ticksManifest.json()) as {
          tickCount: number;
          empty?: { id?: string; status?: string; reason?: string; name?: string }[];
        };
        const catalogBody = await catalogRes.json();
        assert.equal(tm.tickCount, body.ticks.length);
        const publicCopy = `${JSON.stringify(tm)}${JSON.stringify(catalogBody)}${JSON.stringify(body)}`.toLowerCase();
        assert.ok(!publicCopy.includes("inventing"), "unpaid catalog/manifest and paid body must not include collect-policy prose");
        assert.ok(!publicCopy.includes("usda organic"), "organic hay is not a product");
        assert.ok(!publicCopy.includes("we are not inventing"), "must not include first-person collect notes");
        assert.ok(!(tm.empty ?? []).some((e) => /organic/i.test(`${e.id ?? ""} ${e.name ?? ""} ${e.reason ?? ""}`)));
        assert.ok((tm.empty ?? []).every((e) => e.status === "empty" && e.id && !("reason" in e)));
        assert.ok(!body.ticks.some((row) => /organic/i.test(String((row as Record<string, unknown>).id ?? ""))));
        for (const row of body.history.emptyReports as Record<string, unknown>[]) {
          assert.deepEqual(Object.keys(row).sort(), ["id", "status"]);
          assert.equal(row.status, "empty");
          assert.ok(!/organic/i.test(String(row.id ?? "")));
        }
      },
    );
  }

  const iaDir = mkdtempSync(join(tmpdir(), "import-alerts-"));
  writeFileSync(
    join(iaDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "fda-import-alerts",
      status: "ok",
      reason: null,
      fetchedAt: "2026-08-17T00:00:00.000Z",
      asOf: "2026-08-17",
      sources: {
        catalog: "https://www.accessdata.fda.gov/cms_ia/ialist.html",
        byDate: "https://www.accessdata.fda.gov/cms_ia/iapublishdate.html",
        pattern: "https://www.accessdata.fda.gov/cms_ia/importalert_{id}.html",
      },
      catalog: [
        {
          alertNumber: "16-81",
          type: "DWPE",
          name: "Detention Without Physical Examination of Seafood Products Due to the Presence of Salmonella",
          datePublished: "08/17/2026",
          sourceUrl: "https://www.accessdata.fda.gov/cms_ia/importalert_49.html",
          pageId: "49",
          firstSlice: true,
        },
      ],
      alerts: [],
      ticks: [
        {
          alertNumber: "16-81",
          type: "DWPE",
          name: "Detention Without Physical Examination of Seafood Products Due to the Presence of Salmonella",
          list: "red",
          firm: "Clover Valley Meat Co.",
          country: "AUSTRALIA",
          product: "Alligator & Crocodile, Other Aquatic Species",
          datePublished: "06/08/2012",
          sourceUrl: "https://www.accessdata.fda.gov/cms_ia/importalert_49.html",
          asOf: "2026-08-17",
        },
      ],
    }),
  );

  await withServer(
    {
      IMPORT_ALERTS_DIR: iaDir,
      IMPORT_ALERTS_TTL_MS: String(24 * 3600 * 1000),
      X402_SKIP_SETTLE: "1",
    },
    async (base) => {
      const unpaid = await fetch(`${base}${IMPORT_ALERTS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /import-alerts must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; payTo: string }[];
      };
      assert.equal(body402.payTo, PAY_TO);
      assert.equal(body402.asset, USDC_BASE);
      assert.equal(body402.resource, IMPORT_ALERTS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, IMPORT_ALERTS_AMOUNT_ATOMIC);
      const iaPr = unpaid.headers.get("payment-required");
      assert.ok(iaPr, "v2 PAYMENT-REQUIRED header");
      const iaV2 = JSON.parse(Buffer.from(iaPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(iaV2.extensions?.bazaar?.info?.input?.method, "GET");

      const ticksUnpaid = await fetch(`${base}${TICKS_PATH}`);
      assert.equal(ticksUnpaid.status, 402);
      const ticks402 = (await ticksUnpaid.json()) as { accepts: { maxAmountRequired?: string }[] };
      assert.equal(ticks402.accepts[0]?.maxAmountRequired, TICKS_AMOUNT_ATOMIC);

      const manifest = await fetch(`${base}${IMPORT_ALERTS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "unpaid manifest is free");
      const man = (await manifest.json()) as {
        free: boolean;
        samples: { sample?: boolean; firm?: string }[];
        catalog: unknown[];
        schema: { fields: string[] };
      };
      assert.equal(man.free, true);
      assert.ok(man.catalog.length >= 1);
      assert.ok(man.samples.every((s) => s.sample === true));
      assert.ok(man.samples.length <= 2);
      assert.ok(!JSON.stringify(man).includes("phone"));
      assert.equal((man as { tickCount?: number }).tickCount, 1);

      const paid = await fetch(`${base}${IMPORT_ALERTS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        ticks: { firm: string; list: string }[];
      };
      assert.equal(paidBody.product, "fda-import-alerts");
      assert.equal(paidBody.ticks[0]?.firm, "Clover Valley Meat Co.");
      assert.equal(paidBody.ticks[0]?.list, "red");
    },
  );

  const marinersDir = mkdtempSync(join(tmpdir(), "mariners-"));
  writeFileSync(
    join(marinersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "uscg-d13-lnm",
      status: "ok",
      reason: null,
      fetchedAt: "2026-08-18T00:00:00.000Z",
      asOf: "2026-08-12",
      week: "32-2026",
      year: 2026,
      edition: "32-2026",
      district: "13",
      districtName: "Northwest",
      sources: {
        listing: "https://www.navcen.uscg.gov/local-notices-to-mariners?district=13+0&subdistrict=n",
        pdfPattern: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13{WW}{YYYY}.pdf",
        pdfUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
      },
      editions: [
        {
          week: 32,
          year: 2026,
          edition: "32-2026",
          href: "/sites/default/files/pdf/lnms/lnm13322026.pdf",
          sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
        },
      ],
      notices: [
        {
          week: "32-2026",
          section: "Federal Discrepancies",
          waterway: "Anacortes Harbor",
          text: "Anacortes Channel Light 4 LLNR 19055 TRLB/STRUCT MISSING/STRUCT DEST FD",
          sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
        },
      ],
    }),
  );

  await withServer(
    {
      MARINERS_DIR: marinersDir,
      MARINERS_TTL_MS: String(24 * 3600 * 1000),
      X402_SKIP_SETTLE: "1",
    },
    async (base) => {
      const unpaid = await fetch(`${base}${MARINERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /mariners must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; payTo: string }[];
      };
      assert.equal(body402.payTo, PAY_TO);
      assert.equal(body402.asset, USDC_BASE);
      assert.equal(body402.resource, MARINERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, MARINERS_AMOUNT_ATOMIC);
      const lnmPr = unpaid.headers.get("payment-required");
      assert.ok(lnmPr, "v2 PAYMENT-REQUIRED header");
      const lnmV2 = JSON.parse(Buffer.from(lnmPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string }; output?: { example?: unknown } } } };
      };
      assert.equal(lnmV2.extensions?.bazaar?.info?.input?.method, "GET");
      assert.ok(lnmV2.extensions?.bazaar?.info?.output?.example);

      const ticksUnpaid = await fetch(`${base}${TICKS_PATH}`);
      assert.equal(ticksUnpaid.status, 402);
      const ticks402 = (await ticksUnpaid.json()) as { accepts: { maxAmountRequired?: string }[] };
      assert.equal(ticks402.accepts[0]?.maxAmountRequired, TICKS_AMOUNT_ATOMIC);

      const iaUnpaid = await fetch(`${base}${IMPORT_ALERTS_PATH}`);
      assert.equal(iaUnpaid.status, 402);

      const manifest = await fetch(`${base}${MARINERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "unpaid mariners manifest is free");
      const man = (await manifest.json()) as {
        free: boolean;
        noticeCount?: number;
        week?: string;
        sources?: { pdfUrl?: string };
      };
      assert.equal(man.free, true);
      assert.equal(man.noticeCount, 1);
      assert.equal(man.week, "32-2026");
      assert.ok(man.sources?.pdfUrl?.includes("lnm13322026.pdf"));
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("Anacortes Channel Light 4"), "free manifest must not dump notice body");
      assert.ok(!manBlob.includes("organic"));
      assert.ok(!manBlob.includes("inventing"));

      const root = await fetch(`${base}/`);
      const shop = (await root.json()) as { products: { path: string; priceUsdc: string }[] };
      assert.ok(shop.products.some((p) => p.path === MARINERS_PATH && p.priceUsdc === "0.05"));

      const paid = await fetch(`${base}${MARINERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        notices: { text: string; section: string }[];
      };
      assert.equal(paidBody.product, "uscg-d13-lnm");
      assert.equal(paidBody.notices[0]?.section, "Federal Discrepancies");
      assert.ok(paidBody.notices[0]?.text.includes("Anacortes Channel Light 4"));
    },
  );

  console.log("ticks-door tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
