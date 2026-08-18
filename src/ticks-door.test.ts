import { createServer } from "node:http";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AddressInfo } from "node:net";
import assert from "node:assert/strict";
import { handleRequest, PAY_TO, TICKS_PATH, USDC_BASE, DEFAULT_TICKS_DIR, loadTicks, MANIFEST_PATH, CATALOG_PATH, WELL_KNOWN_PATH, OPENAPI_PATH, LLMS_PATH, NETWORK_V2, bazaarExtension, cdpEnvStatus } from "./ticks-door.js";
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
import {
  WARNING_LETTERS_AMOUNT_ATOMIC,
  WARNING_LETTERS_MANIFEST_PATH,
  WARNING_LETTERS_PATH,
} from "./warning-letters.js";

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
  await withServer({
    TICKS_PATH: "",
    TICKS_DIR: "",
    FARM_DATA_DIR: "",
    X402_USDC_ATOMIC: "",
    CDP_API_KEY_ID: undefined,
    CDP_API_KEY_SECRET: undefined,
  }, async (base) => {
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

    const wellKnown = await fetch(`${base}${WELL_KNOWN_PATH}`);
    assert.equal(wellKnown.status, 200);
    const wk = (await wellKnown.json()) as {
      version: number;
      resources: string[];
      openapi?: string;
      llmsTxt?: string;
      instructions?: string;
    };
    assert.equal(wk.version, 1);
    assert.equal(wk.resources.length, 3, "well-known lists the three live doors only");
    assert.ok(wk.resources.some((r) => r.endsWith(TICKS_PATH) && r.startsWith("http")));
    assert.ok(wk.resources.some((r) => r.endsWith(IMPORT_ALERTS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(MARINERS_PATH)));
    assert.ok(wk.resources.every((r) => r.startsWith("http")), "well-known resources must be absolute URLs");
    assert.ok(wk.openapi?.endsWith(OPENAPI_PATH));
    assert.ok(wk.llmsTxt?.endsWith(LLMS_PATH));
    assert.ok((wk.instructions ?? "").includes("three paid"));
    assert.ok(!wk.resources.some((r) => r.includes("/gain")));
    assert.ok(!wk.resources.some((r) => r.includes(WARNING_LETTERS_PATH)));
    assert.equal(cdpEnvStatus(), "CDP env not set");

    const specRes = await fetch(`${base}${OPENAPI_PATH}`);
    assert.equal(specRes.status, 200);
    const spec = (await specRes.json()) as {
      openapi: string;
      info: { title: string; version: string; contact?: { name?: string; url?: string } };
      "x-discovery"?: { ownershipProofs?: string[] };
      "x-agentcash-provenance"?: { ownershipProofs?: string[] };
      "x-agentcash-guidance"?: { llmsTxtUrl?: string };
      paths: Record<string, {
        get?: {
          "x-auth"?: { mode?: string };
          security?: unknown;
          "x-payment-info"?: {
            protocols?: { x402?: { payTo?: string; network?: string; asset?: string; amount?: string } }[];
            price?: { amount?: string };
            payTo?: string;
          };
          responses?: Record<string, unknown>;
        };
      }>;
    };
    assert.equal(spec.openapi, "3.1.0");
    assert.ok(spec.info.title);
    assert.ok(spec.info.version);
    assert.equal(spec.info.contact?.url, "https://bnm.farm/");
    assert.deepEqual(spec["x-discovery"]?.ownershipProofs, [PAY_TO]);
    assert.deepEqual(spec["x-agentcash-provenance"]?.ownershipProofs, [PAY_TO]);
    assert.ok(spec["x-agentcash-guidance"]?.llmsTxtUrl?.endsWith(LLMS_PATH));
    for (const paid of [TICKS_PATH, IMPORT_ALERTS_PATH, MARINERS_PATH]) {
      const op = spec.paths[paid]?.get;
      assert.ok(op?.["x-payment-info"], `${paid} must declare x-payment-info`);
      assert.equal(op?.["x-auth"]?.mode, "x402");
      assert.ok(op?.responses?.["402"], `${paid} must declare 402`);
      assert.equal(op?.["x-payment-info"]?.payTo, PAY_TO);
      assert.equal(op?.["x-payment-info"]?.protocols?.[0]?.x402?.network, NETWORK_V2);
      assert.equal(op?.["x-payment-info"]?.protocols?.[0]?.x402?.asset, USDC_BASE);
    }
    assert.equal(spec.paths[TICKS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.02");
    assert.equal(spec.paths[IMPORT_ALERTS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[MARINERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[CATALOG_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.deepEqual(spec.paths[CATALOG_PATH]?.get?.security, []);
    assert.ok(spec.paths["/"]?.get);
    assert.ok(spec.paths[LLMS_PATH]?.get);
    assert.equal(spec.paths["/gain"], undefined);
    assert.equal(spec.paths[WARNING_LETTERS_PATH], undefined);
    assert.equal(spec.paths[WARNING_LETTERS_MANIFEST_PATH], undefined);
    assert.equal(
      Object.keys(spec.paths).filter((p) => spec.paths[p].get?.["x-payment-info"]).length,
      3,
      "OpenAPI must not grow a fourth public paid path",
    );

    const llms = await fetch(`${base}${LLMS_PATH}`);
    assert.equal(llms.status, 200);
    const llmsBody = await llms.text();
    assert.ok(llmsBody.includes("GET /ticks"));
    assert.ok(llmsBody.includes("GET /import-alerts"));
    assert.ok(llmsBody.includes("GET /mariners"));
    assert.ok(!llmsBody.toLowerCase().includes("/gain"));
    assert.ok(!llmsBody.includes("WASDE"));
    assert.ok(!llmsBody.includes(WARNING_LETTERS_PATH));

    const shop = (await (await fetch(`${base}/`)).json()) as {
      products: { path: string }[];
      openapi?: string;
      wellKnown?: string;
      llmsTxt?: string;
    };
    assert.deepEqual(shop.products.map((p) => p.path), [TICKS_PATH, IMPORT_ALERTS_PATH, MARINERS_PATH]);
    assert.equal(shop.openapi, OPENAPI_PATH);
    assert.equal(shop.wellKnown, WELL_KNOWN_PATH);
    assert.equal(shop.llmsTxt, LLMS_PATH);
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
      const shop = (await root.json()) as {
        products: { path: string; priceUsdc: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.ok(shop.products.some((p) => p.path === MARINERS_PATH && p.priceUsdc === "0.05"));
      assert.equal(shop.products.length, 3);
      assert.equal(shop.openapi, OPENAPI_PATH);
      assert.equal(shop.wellKnown, WELL_KNOWN_PATH);

      const iaMan = (await (await fetch(`${base}${IMPORT_ALERTS_MANIFEST_PATH}`)).json()) as {
        openapi?: string;
        wellKnown?: string;
      };
      assert.ok(iaMan.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(iaMan.wellKnown?.endsWith(WELL_KNOWN_PATH));

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

  const wlDir = mkdtempSync(join(tmpdir(), "warning-letters-"));
  writeFileSync(
    join(wlDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "fda-warning-letter-bodies",
      status: "ok",
      reason: null,
      fetchedAt: "2026-08-18T00:00:00.000Z",
      asOf: "2026-03-04",
      unlisted: true,
      sources: {
        listing:
          "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters",
        letterBase:
          "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/",
      },
      letters: [
        {
          id: "citra100mg-722606-03042026",
          firm: "Citra100mg",
          cms: "722606",
          issuedOn: "2026-03-04",
          subject: "Unapproved New Drugs/Misbranded",
          issuingOffice: "Center for Drug Evaluation and Research",
          sourceUrl:
            "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/citra100mg-722606-03042026",
          body: "WARNING LETTER\nMarch 4, 2026\nRE: Notice of Unlawful Sale of Unapproved and Misbranded Drugs to United States Consumers Over the Internet\nThis is to advise you that the United States (U.S.) Food and Drug Administration (FDA) recently reviewed your website.",
        },
      ],
    }),
  );

  await withServer(
    {
      WARNING_LETTERS_DIR: wlDir,
      WARNING_LETTERS_TTL_MS: String(24 * 3600 * 1000),
      X402_SKIP_SETTLE: "1",
    },
    async (base) => {
      const unpaid = await fetch(`${base}${WARNING_LETTERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /warning-letters must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string }[];
      };
      assert.equal(body402.resource, WARNING_LETTERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, WARNING_LETTERS_AMOUNT_ATOMIC);
      const wlPr = unpaid.headers.get("payment-required");
      assert.ok(wlPr, "v2 PAYMENT-REQUIRED header");
      const wlV2 = JSON.parse(Buffer.from(wlPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(wlV2.extensions?.bazaar?.info?.input?.method, "GET");

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === WARNING_LETTERS_PATH), false);
      assert.equal(shop.products.length, 3);

      const manifest = await fetch(`${base}${WARNING_LETTERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "unlisted free manifest is free");
      const man = (await manifest.json()) as {
        unlisted?: boolean;
        letterCount?: number;
        letters?: { firm?: string; body?: string }[];
      };
      assert.equal(man.unlisted, true);
      assert.equal(man.letterCount, 1);
      assert.equal(man.letters?.[0]?.firm, "Citra100mg");
      assert.ok(!JSON.stringify(man).includes("reviewed your website"));
      assert.ok(!("body" in (man.letters?.[0] ?? {})));

      const paid = await fetch(`${base}${WARNING_LETTERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        unlisted?: boolean;
        letters: { firm: string; issuedOn: string; subject: string; body: string }[];
      };
      assert.equal(paidBody.product, "fda-warning-letter-bodies");
      assert.equal(paidBody.unlisted, true);
      assert.equal(paidBody.letters[0]?.firm, "Citra100mg");
      assert.equal(paidBody.letters[0]?.issuedOn, "2026-03-04");
      assert.match(paidBody.letters[0]?.subject ?? "", /Unapproved New Drugs/);
      assert.ok(paidBody.letters[0]?.body.includes("WARNING LETTER"));
      assert.ok(paidBody.letters[0]?.body.includes("reviewed your website"));
    },
  );

  await withServer(
    {
      X402_FACILITATOR_URL: "http://127.0.0.1:9",
      CDP_API_KEY_ID: undefined,
      CDP_API_KEY_SECRET: undefined,
      X402_SKIP_SETTLE: undefined,
      TICKS_DIR: "",
      TICKS_PATH: "",
    },
    async (base) => {
      assert.equal(cdpEnvStatus(), "CDP env not set");
      for (const path of [TICKS_PATH, IMPORT_ALERTS_PATH, MARINERS_PATH]) {
        const unpaid = await fetch(`${base}${path}`);
        assert.equal(unpaid.status, 402, `unpaid ${path} must stay 402`);
        const present = await fetch(`${base}${path}`, { headers: { "X-PAYMENT": "test" } });
        assert.equal(present.status, 402, `${path} unpaid-or-unsettled stays 402 without inventing keys`);
        const body = (await present.json()) as { error?: string };
        assert.notEqual(body.error, "CDP env not set");
      }
      const wk = (await (await fetch(`${base}${WELL_KNOWN_PATH}`)).json()) as { resources: string[] };
      assert.equal(wk.resources.length, 3);
      assert.ok(!wk.resources.some((r) => r.includes(WARNING_LETTERS_PATH)));
    },
  );

  console.log("ticks-door tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
