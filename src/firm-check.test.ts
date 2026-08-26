import assert from "node:assert/strict";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AddressInfo } from "node:net";
import { handleRequest, LLMS_PATH, MCP_PATH, OPENAPI_PATH, WELL_KNOWN_PATH } from "./ticks-door.js";
import {
  FIRM_CHECK_CAP,
  FIRM_CHECK_NOTE,
  FIRM_CHECK_PATH,
  FIRM_CHECK_TOOL_NAME,
  firmCheckFromIndexes,
} from "./firm-check.js";
import { extraMcpToolNames, handleMcpJsonRpc } from "./ticks-mcp.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/firm-check");

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
  const indexes = {
    form483: {
      fetchedAt: "2026-08-26T00:00:00.000Z",
      asOf: "2026-07-31",
      letters: [
        {
          id: "catalent-indiana-llc-193455",
          firm: "Catalent Indiana LLC",
          fei: "3005949964",
          issuedOn: "2026-04-24",
          sourceUrl: "https://www.fda.gov/media/193455/download",
        },
        {
          id: "cascade-specialty-pharmacy-llc-193964",
          firm: "Cascade Specialty Pharmacy LLC",
          fei: "3015133983",
          issuedOn: "2026-07-17",
        },
      ],
    },
    warningLetters: {
      fetchedAt: "2026-08-26T00:00:00.000Z",
      asOf: "2026-03-04",
      letters: [
        {
          id: "citra100mg-722606-03042026",
          firm: "Citra100mg",
          cms: "722606",
          issuedOn: "2026-03-04",
          subject: "Unapproved New Drugs/Misbranded",
        },
      ],
    },
    importAlerts: {
      fetchedAt: "2026-08-26T00:00:00.000Z",
      asOf: "2026-08-07",
      catalog: [
        {
          alertNumber: "99-05",
          name: "Detention Without Physical Examination of Raw Agricultural Products for Pesticides",
          datePublished: "08/07/2026",
          pageId: "258",
        },
        {
          alertNumber: "16-81",
          name: "Detention Without Physical Examination of Seafood Products Due to Salmonella",
          datePublished: "03/05/2026",
          pageId: "49",
        },
      ],
      samples: [
        {
          alertNumber: "16-81",
          firm: "Pacific Catch Ltd",
          name: "Detention Without Physical Examination of Seafood Products Due to Salmonella",
          datePublished: "03/05/2026",
          sample: true,
        },
      ],
    },
  };

  const catalent = firmCheckFromIndexes("catalent", indexes);
  assert.equal(catalent.free, true);
  assert.equal(catalent.product, "firm-check");
  assert.equal(catalent.matches.length, 1);
  assert.equal(catalent.matches[0]?.door, "form-483");
  assert.equal(catalent.matches[0]?.id, "catalent-indiana-llc-193455");
  assert.equal(catalent.matches[0]?.page, 1);
  assert.equal(catalent.matches[0]?.paidUrl, "/form-483?id=catalent-indiana-llc-193455");
  assert.equal(catalent.matches[0]?.priceUsdc, "0.02");
  assert.equal(catalent.matches[0]?.bag, "one official text");
  assert.equal(catalent.matches[0]?.pagePriceUsdc, "0.05");
  assert.equal(catalent.matches[0]?.fetchedAt, "2026-08-26T00:00:00.000Z");
  assert.equal(catalent.matches[0]?.asOf, "2026-07-31");
  assert.ok(!JSON.stringify(catalent).includes("body"));
  assert.ok(catalent.note.includes("free") || catalent.note.includes("Free"));
  assert.ok(catalent.note.includes("$0.02"));
  assert.ok(catalent.note.includes("$0.05"));
  assert.ok(catalent.note.includes("fetchedAt/asOf"));
  assert.ok(!catalent.note.toLowerCase().includes("idaho leftover"));
  assert.ok(!catalent.note.toLowerCase().includes("leak-test"));
  assert.ok(!catalent.note.toLowerCase().includes("tcpa"));
  assert.ok(!catalent.note.toLowerCase().includes("not people"));

  const fei = firmCheckFromIndexes("3005949964", indexes);
  assert.equal(fei.matches[0]?.id, "catalent-indiana-llc-193455");

  const cms = firmCheckFromIndexes("722606", indexes);
  assert.equal(cms.matches[0]?.door, "warning-letters");
  assert.equal(cms.matches[0]?.paidUrl, "/warning-letters?id=citra100mg-722606-03042026");
  assert.equal(cms.matches[0]?.fetchedAt, "2026-08-26T00:00:00.000Z");
  assert.equal(cms.matches[0]?.asOf, "2026-03-04");

  const alert = firmCheckFromIndexes("99-05", indexes);
  assert.equal(alert.matches[0]?.door, "import-alerts");
  assert.equal(alert.matches[0]?.id, "99-05");
  assert.equal(alert.matches[0]?.page, null);
  assert.equal(alert.matches[0]?.paidUrl, "/import-alerts");
  assert.equal(alert.matches[0]?.priceUsdc, "0.05");
  assert.equal(alert.matches[0]?.bag, "entire current table");
  assert.equal(alert.matches[0]?.fetchedAt, "2026-08-26T00:00:00.000Z");
  assert.equal(alert.matches[0]?.asOf, "2026-08-07");

  const firmOnSample = firmCheckFromIndexes("Pacific Catch", indexes);
  assert.equal(firmOnSample.matches[0]?.door, "import-alerts");
  assert.equal(firmOnSample.matches[0]?.id, "16-81");
  assert.equal(firmOnSample.matches[0]?.firm, "Pacific Catch Ltd");

  const manyLetters = Array.from({ length: 30 }, (_, i) => ({
    id: `firm-${String(i).padStart(2, "0")}`,
    firm: "Acme Pharma",
    issuedOn: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
  }));
  const capped = firmCheckFromIndexes("acme", { form483: { letters: manyLetters } });
  assert.equal(capped.matchCount, 30);
  assert.equal(capped.matches.length, FIRM_CHECK_CAP);
  assert.ok(capped.matches.every((row) => row.door === "form-483"));

  const empty = firmCheckFromIndexes("", indexes);
  assert.equal(empty.matchCount, 0);
  assert.deepEqual(empty.matches, []);

  await withServer(
    {
      FORM_483_DIR: join(FIXTURES, "form-483"),
      WARNING_LETTERS_DIR: join(FIXTURES, "warning-letters"),
      IMPORT_ALERTS_DIR: join(FIXTURES, "import-alerts"),
      FORM_483_TTL_MS: String(24 * 3600 * 1000),
      WARNING_LETTERS_TTL_MS: String(24 * 3600 * 1000),
      X402_SKIP_SETTLE: "1",
    },
    async (base) => {
      const missing = await fetch(`${base}${FIRM_CHECK_PATH}`);
      assert.equal(missing.status, 400);
      const missingBody = (await missing.json()) as { error?: string };
      assert.equal(missingBody.error, "q_required");

      const found = await fetch(`${base}${FIRM_CHECK_PATH}?q=cascade`);
      assert.equal(found.status, 200);
      const body = (await found.json()) as {
        free?: boolean;
        matches?: {
          door?: string;
          paidUrl?: string;
          id?: string;
          page?: number | null;
          fetchedAt?: string | null;
          asOf?: string | null;
        }[];
        note?: string;
      };
      assert.equal(body.free, true);
      assert.equal(body.matches?.[0]?.door, "form-483");
      assert.equal(body.matches?.[0]?.paidUrl, "/form-483?id=cascade-specialty-pharmacy-llc-193964");
      assert.equal(body.matches?.[0]?.page, 1);
      assert.equal(body.matches?.[0]?.fetchedAt, "2026-08-26T00:00:00.000Z");
      assert.equal(body.matches?.[0]?.asOf, "2026-07-31");
      const raw = JSON.stringify(body);
      assert.ok(!raw.includes("secret cascade body"));
      assert.ok(!raw.includes("secret cascade observation"));
      assert.ok(!raw.includes("Hidden Paid Firm Ltd"));
      assert.ok(!raw.includes("secret product row"));
      assert.ok((body.note ?? "").includes("$0.02"));
      assert.ok((body.note ?? "").includes("$0.05"));

      const alertRes = await fetch(`${base}${FIRM_CHECK_PATH}?q=99-05`);
      assert.equal(alertRes.status, 200);
      const alertBody = (await alertRes.json()) as {
        matches?: { door?: string; paidUrl?: string; bag?: string; fetchedAt?: string | null }[];
      };
      assert.equal(alertBody.matches?.[0]?.door, "import-alerts");
      assert.equal(alertBody.matches?.[0]?.paidUrl, "/import-alerts");
      assert.equal(alertBody.matches?.[0]?.bag, "entire current table");
      assert.equal(alertBody.matches?.[0]?.fetchedAt, "2026-08-26T00:00:00.000Z");

      const paid483 = await fetch(`${base}/form-483`);
      assert.equal(paid483.status, 402);
      const paidAlerts = await fetch(`${base}/import-alerts`);
      assert.equal(paidAlerts.status, 402);

      const wk = (await (await fetch(`${base}${WELL_KNOWN_PATH}`)).json()) as {
        resources: string[];
        firmCheck?: string;
        sample?: string;
        instructions?: string;
      };
      assert.ok(wk.firmCheck?.endsWith(FIRM_CHECK_PATH));
      assert.ok(wk.sample?.endsWith("/sample"), "/sample stays a free discovery pointer");
      assert.ok(!wk.resources.some((r) => r.includes(FIRM_CHECK_PATH)), "firm-check is not a paid resource");
      assert.ok(!wk.resources.some((r) => r.includes("/sample")), "/sample is not a paid resource");
      assert.ok((wk.instructions ?? "").includes(FIRM_CHECK_PATH));

      const shop = (await (await fetch(`${base}/`)).json()) as {
        firmCheck?: string;
        sample?: string;
        products: { path: string }[];
      };
      assert.equal(shop.firmCheck, FIRM_CHECK_PATH);
      assert.equal(shop.sample, "/sample");
      assert.ok(!shop.products.some((p) => p.path === FIRM_CHECK_PATH));
      assert.ok(!shop.products.some((p) => p.path === "/sample"));

      const sampleRes = await fetch(`${base}/sample`);
      assert.equal(sampleRes.status, 200);
      const sample = (await sampleRes.json()) as { example?: boolean };
      assert.equal(sample.example, true);

      const llms = await (await fetch(`${base}${LLMS_PATH}`)).text();
      assert.ok(llms.includes("GET /firm-check?q="));
      assert.ok(llms.includes("GET /sample"));
      assert.ok(llms.toLowerCase().includes("free"));
      assert.ok(llms.includes("$0.02"));
      assert.ok(llms.includes("$0.05"));
      assert.ok(!llms.toLowerCase().includes("idaho leftover"));
      assert.ok(!llms.toLowerCase().includes("leak-test"));
      assert.ok(!llms.toLowerCase().includes("tcpa"));
      assert.ok(!llms.toLowerCase().includes("not people"));

      const spec = (await (await fetch(`${base}${OPENAPI_PATH}`)).json()) as {
        paths: Record<string, { get?: { "x-payment-info"?: unknown } }>;
        info?: { "x-guidance"?: string };
      };
      assert.ok(spec.paths[FIRM_CHECK_PATH]?.get);
      assert.equal(spec.paths[FIRM_CHECK_PATH]?.get?.["x-payment-info"], undefined);
      assert.ok(spec.paths["/sample"]?.get);
      assert.ok((spec.info?.["x-guidance"] ?? "").includes(FIRM_CHECK_PATH));

      const listed = await handleMcpJsonRpc(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        {
          wellKnown: { resources: [`${base}/ticks`, `${base}/form-483`] },
        },
      );
      const tools = (listed as { result: { tools: { name: string }[] } }).result.tools;
      assert.ok(tools.some((t) => t.name === FIRM_CHECK_TOOL_NAME));
      assert.ok(!tools.some((t) => t.name === "firm_check"));
      assert.ok(extraMcpToolNames().includes(FIRM_CHECK_TOOL_NAME));
      const extras = new Set(extraMcpToolNames());
      const paidTools = tools.filter((t) => !extras.has(t.name));
      assert.deepEqual(paidTools.map((t) => t.name), ["ticks", "form-483"]);

      const called = await fetch(`${base}${MCP_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 9,
          method: "tools/call",
          params: { name: FIRM_CHECK_TOOL_NAME, arguments: { q: "cascade" } },
        }),
      });
      assert.equal(called.status, 200);
      const callBody = (await called.json()) as { result?: { content?: { text?: string }[]; isError?: boolean } };
      assert.equal(callBody.result?.isError, undefined);
      assert.ok(callBody.result?.content?.[0]?.text?.includes("form-483"));
      assert.ok(callBody.result?.content?.[0]?.text?.includes("HTTP 200"));
      assert.ok(callBody.result?.content?.[0]?.text?.includes("fetchedAt"));
      assert.ok(!callBody.result?.content?.[0]?.text?.includes("secret cascade body"));
    },
  );

  assert.ok(FIRM_CHECK_NOTE.includes("Free"));
  console.log("firm-check tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
