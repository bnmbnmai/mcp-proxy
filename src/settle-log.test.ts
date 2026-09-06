import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AddressInfo } from "node:net";
import { handleRequest } from "./ticks-door.js";
import {
  amountAtomicFromQuery,
  atomicToUsdc,
  backfillSettlesFromAccessLog,
  isPaidShopPath,
  parseAccessLog,
  parseSettleLog,
  payerFromPayment,
  sanitizeSettleEvent,
  summarizeSettles,
  txHashFromSettleBody,
  type SettleEvent,
} from "./settle-log.js";

function samplePayment(from: string): string {
  return Buffer.from(
    JSON.stringify({
      x402Version: 2,
      payload: {
        authorization: {
          from,
          to: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
          value: "50000",
        },
        signature: "0xdeadbeef",
      },
    }),
    "utf8",
  ).toString("base64");
}

async function withSettleServer(
  envPatch: Record<string, string | undefined>,
  fn: (base: string, logPath: string) => Promise<void>,
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "settle-log-"));
  const logPath = join(dir, "settle.jsonl");
  const prev: Record<string, string | undefined> = {};
  const patch = { SETTLE_LOG: "1", SETTLE_LOG_PATH: logPath, ...envPatch };
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
    await fn(`http://127.0.0.1:${port}`, logPath);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const payer = "0x1111111111111111111111111111111111111111";
  const payment = samplePayment(payer);
  assert.equal(payerFromPayment(payment), payer);
  assert.equal(payerFromPayment("not-json"), undefined);
  assert.equal(payerFromPayment(""), undefined);
  assert.ok(!JSON.stringify(sanitizeSettleEvent({ path: "/ticks", amountAtomic: "50000" })).includes("deadbeef"));

  const dirty = sanitizeSettleEvent({
    path: "/form-483",
    amountAtomic: "20000",
    requestId: "ray-1",
    payer,
    txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ...({
      payment: payment,
      key: "family-password-must-not-land",
      body: "secret letter",
    } as Record<string, string>),
  });
  const dirtyJson = JSON.stringify(dirty);
  assert.equal(dirty.payer, payer);
  assert.equal(dirty.amountAtomic, "20000");
  assert.ok(!dirtyJson.includes("family-password"));
  assert.ok(!dirtyJson.includes("secret letter"));
  assert.ok(!dirtyJson.includes("deadbeef"));
  assert.ok(!dirtyJson.includes(payment));

  assert.equal(
    txHashFromSettleBody({
      success: true,
      transaction: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    }),
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  );
  assert.equal(txHashFromSettleBody({ transaction: "nope" }), undefined);

  assert.equal(isPaidShopPath("/ticks"), true);
  assert.equal(isPaidShopPath("/form-483"), true);
  assert.equal(isPaidShopPath("/firm-check"), false);
  assert.equal(isPaidShopPath("/form-483/manifest.json"), false);
  assert.equal(isPaidShopPath("/sample"), false);
  assert.equal(amountAtomicFromQuery("/form-483", "?id=cascade"), "20000");
  assert.equal(amountAtomicFromQuery("/form-483", ""), "50000");
  assert.equal(amountAtomicFromQuery("/ticks", "?id=ignored"), "50000");
  assert.equal(atomicToUsdc("70000"), "0.070000");

  const events: SettleEvent[] = [
    {
      ts: "2026-09-01T00:00:00.000Z",
      path: "/ticks",
      amountAtomic: "50000",
      requestId: "a",
      payer,
    },
    {
      ts: "2026-09-01T00:01:00.000Z",
      path: "/form-483",
      amountAtomic: "20000",
      requestId: "b",
      payer,
      txHash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    },
    {
      ts: "2026-09-01T00:02:00.000Z",
      path: "/ticks",
      amountAtomic: "50000",
      requestId: "c",
    },
  ];
  const metrics = summarizeSettles(events, "/tmp/settle.jsonl");
  assert.equal(metrics.eventCount, 3);
  assert.equal(metrics.pathCount, 2);
  assert.equal(metrics.amountAtomic, "120000");
  assert.equal(metrics.amountUsdc, "0.120000");
  assert.equal(metrics.byPath[0]?.path, "/ticks");
  assert.equal(metrics.byPath[0]?.count, 2);
  assert.equal(metrics.byPath[0]?.payerCount, 1);
  assert.equal(metrics.byPath[1]?.path, "/form-483");
  assert.equal(metrics.byPath[1]?.amountAtomic, "20000");
  const metricsJson = JSON.stringify(metrics);
  assert.ok(!metricsJson.includes(payer), "summarizer must not dump payer addresses");
  assert.ok(!metricsJson.includes("0xcccc"), "summarizer must not dump tx hashes");

  const access = [
    JSON.stringify({
      ts: 1757184000,
      request: { method: "GET", uri: "/ticks", headers: { "Cf-Ray": ["ray-ticks"] } },
      status: 200,
    }),
    JSON.stringify({
      ts: 1757184060,
      request: { method: "GET", uri: "/form-483?id=cascade", headers: { "X-Payment": ["eyJ4cGF5bWVudCI6InNlY3JldCJ9"] } },
      status: 200,
    }),
    JSON.stringify({
      ts: 1757184120,
      request: { method: "GET", uri: "/form-483/manifest.json?q=cascade" },
      status: 200,
    }),
    JSON.stringify({
      ts: 1757184180,
      request: { method: "GET", uri: "/firm-check?q=acme" },
      status: 200,
    }),
    JSON.stringify({
      ts: 1757184240,
      request: { method: "GET", uri: "/untitled-letters" },
      status: 402,
    }),
    `203.0.113.9 - - [06/Sep/2026:17:00:00 +0000] "GET /warning-letters HTTP/1.1" 200 99`,
    JSON.stringify({
      ts: "2026-09-01T00:00:00.000Z",
      kind: "paid-door",
      path: "/gmp",
      status: 200,
      id: "card-1",
      paymentHeader: true,
    }),
  ].join("\n");
  const parsed = parseAccessLog(access);
  assert.equal(parsed.some((e) => e.path === "/ticks" && e.amountAtomic === "50000"), true);
  assert.equal(parsed.some((e) => e.path === "/form-483" && e.amountAtomic === "20000"), true);
  assert.equal(parsed.some((e) => e.path === "/warning-letters"), true);
  assert.equal(parsed.some((e) => e.path === "/gmp" && e.amountAtomic === "20000"), true);
  assert.equal(parsed.some((e) => e.path === "/firm-check"), false);
  assert.equal(parsed.some((e) => e.path.includes("manifest")), false);
  const rawAccess = JSON.stringify(parsed);
  assert.ok(!rawAccess.includes("eyJ4cGF5bWVud"), "backfill must not copy X-PAYMENT");
  assert.ok(!rawAccess.includes("secret"));

  const backDir = mkdtempSync(join(tmpdir(), "settle-backfill-"));
  const backFile = join(backDir, "settle.jsonl");
  const first = backfillSettlesFromAccessLog(access, backFile);
  const second = backfillSettlesFromAccessLog(access, backFile);
  assert.ok(first.wrote >= 4);
  assert.equal(second.wrote, 0, "second backfill is idempotent");
  const backLines = parseSettleLog(readFileSync(backFile, "utf8"));
  assert.equal(backLines.length, first.wrote);
  rmSync(backDir, { recursive: true, force: true });

  await withSettleServer(
    {
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-settle-"),
      WARNING_LETTERS_DIR: join(tmpdir(), "wl-absent-settle-"),
      IMPORT_ALERTS_DIR: join(tmpdir(), "ia-absent-settle-"),
    },
    async (base, logPath) => {
      const unpaid = await fetch(`${base}/ticks`);
      assert.equal(unpaid.status, 402);
      const paid = await fetch(`${base}/ticks`, {
        headers: {
          "X-PAYMENT": payment,
          "CF-Ray": "settle-test-ray",
        },
      });
      assert.equal(paid.status, 200);

      const raw = readFileSync(logPath, "utf8");
      const lines = parseSettleLog(raw);
      assert.equal(lines.length, 1, "paid 200 appends one settle line; unpaid 402 does not");
      assert.equal(lines[0]?.path, "/ticks");
      assert.equal(lines[0]?.amountAtomic, "50000");
      assert.equal(lines[0]?.requestId, "settle-test-ray");
      assert.equal(lines[0]?.payer, payer);
      assert.ok(!raw.includes(payment));
      assert.ok(!raw.includes("deadbeef"));
      assert.equal(raw.includes("X-PAYMENT"), false);
    },
  );

  console.log("settle-log tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
