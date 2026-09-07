import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AddressInfo } from "node:net";
import { handleRequest, PAY_TO } from "./ticks-door.js";
import { SHOP_REQUEST_LOG_ROLLUP_PATH } from "./shop-request-log.js";
import {
  PAGE_AMOUNT_ATOMIC,
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

const PAYER = "0x1111111111111111111111111111111111111111";
const TX = "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

function samplePayment(from: string): string {
  return Buffer.from(
    JSON.stringify({
      x402Version: 2,
      payload: {
        authorization: {
          from,
          to: PAY_TO,
          value: PAGE_AMOUNT_ATOMIC,
        },
        signature: "0xdeadbeef",
      },
    }),
    "utf8",
  ).toString("base64");
}

function v1ExactPayment(): string {
  return JSON.stringify({
    x402Version: 1,
    scheme: "exact",
    network: "base",
    payload: {
      signature: `0x${"ab".repeat(65)}`,
      authorization: {
        from: PAYER,
        to: PAY_TO,
        value: PAGE_AMOUNT_ATOMIC,
        validAfter: "0",
        validBefore: "9999999999",
        nonce: `0x${"22".repeat(32)}`,
      },
    },
  });
}

async function withSettleServer(
  envPatch: Record<string, string | undefined>,
  fn: (base: string, logPath: string) => Promise<void>,
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "settle-log-"));
  const logPath = join(dir, "settle.jsonl");
  const prev: Record<string, string | undefined> = {};
  const patch = { SETTLE_LOG: "1", SETTLE_LOG_PATH: logPath, SHOP_REQUEST_LOG: "0", ...envPatch };
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

async function withMockFacilitator(fn: (url: string) => Promise<void>): Promise<void> {
  const mock = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => {
      const path = req.url || "";
      res.writeHead(200, { "Content-Type": "application/json" });
      if (path.endsWith("/verify")) {
        res.end(JSON.stringify({ isValid: true }));
        return;
      }
      res.end(JSON.stringify({ success: true, transaction: TX }));
    });
  });
  await new Promise<void>((resolve) => mock.listen(0, "127.0.0.1", resolve));
  const { port } = mock.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => mock.close((err) => (err ? reject(err) : resolve())));
  }
}

async function main(): Promise<void> {
  const payment = samplePayment(PAYER);
  assert.equal(payerFromPayment(payment), PAYER);
  assert.equal(payerFromPayment("not-json"), undefined);
  assert.equal(payerFromPayment(""), undefined);

  const dirty = sanitizeSettleEvent({
    path: "/form-483",
    amountAtomic: "20000",
    requestId: "ray-1",
    payer: PAYER,
    txHash: TX,
    ...({
      payment,
      key: "family-password-must-not-land",
      body: "secret letter",
    } as Record<string, string>),
  });
  const dirtyJson = JSON.stringify(dirty);
  assert.equal(dirty.payer, PAYER);
  assert.ok(!dirtyJson.includes("family-password"));
  assert.ok(!dirtyJson.includes("secret letter"));
  assert.ok(!dirtyJson.includes("deadbeef"));
  assert.ok(!dirtyJson.includes(payment));

  assert.equal(txHashFromSettleBody({ success: true, transaction: TX }), TX);
  assert.equal(txHashFromSettleBody({ transaction: "nope" }), undefined);

  assert.equal(isPaidShopPath("/ticks"), true);
  assert.equal(isPaidShopPath("/firm-check"), false);
  assert.equal(isPaidShopPath("/form-483/manifest.json"), false);
  assert.equal(amountAtomicFromQuery("/form-483", "?id=cascade"), "20000");
  assert.equal(amountAtomicFromQuery("/ticks", "?id=ignored"), "50000");
  assert.equal(atomicToUsdc("70000"), "0.070000");

  const events: SettleEvent[] = [
    { ts: "2026-09-01T00:00:00.000Z", path: "/ticks", amountAtomic: "50000", requestId: "a", payer: PAYER },
    { ts: "2026-09-01T00:01:00.000Z", path: "/form-483", amountAtomic: "20000", requestId: "b", payer: PAYER, txHash: TX },
    { ts: "2026-09-01T00:02:00.000Z", path: "/ticks", amountAtomic: "50000", requestId: "c" },
  ];
  const metrics = summarizeSettles(events, "/tmp/settle.jsonl");
  assert.equal(metrics.eventCount, 3);
  assert.equal(metrics.amountAtomic, "120000");
  assert.equal(metrics.byPath[0]?.path, "/ticks");
  const metricsJson = JSON.stringify(metrics);
  assert.ok(!metricsJson.includes(PAYER), "summarizer must not dump payer addresses");
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
    `203.0.113.9 - - [06/Sep/2026:17:00:00 +0000] "GET /warning-letters HTTP/1.1" 200 99`,
    JSON.stringify({
      ts: "2026-09-05T06:30:52.126Z",
      kind: "paid-door",
      path: "/ticks",
      status: 200,
      paymentHeader: true,
      ua: "Mizan/0.1",
    }),
    JSON.stringify({
      ts: "2026-09-03T00:00:00.000Z",
      kind: "paid-door",
      path: "/hhs-oig-reports",
      status: 200,
      paymentHeader: false,
    }),
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
  assert.equal(parsed.some((e) => e.path === "/ticks" && e.source === "shop-request-log"), true);
  assert.equal(parsed.some((e) => e.path === "/form-483" && e.amountAtomic === "20000"), true);
  assert.equal(parsed.some((e) => e.path === "/gmp"), true);
  assert.equal(parsed.some((e) => e.path === "/hhs-oig-reports"), false, "skip-settle / no paymentHeader is not a settle");
  assert.equal(parsed.some((e) => e.path === "/warning-letters"), false, "combined log cannot prove payment");
  assert.equal(
    parsed.some((e) => e.path === "/ticks" && e.source === "access-log"),
    false,
    "Caddy 200 without X-PAYMENT is not a settle",
  );
  assert.ok(!JSON.stringify(parsed).includes("eyJ4cGF5bWVud"));

  const backDir = mkdtempSync(join(tmpdir(), "settle-backfill-"));
  const backFile = join(backDir, "settle.jsonl");
  const first = backfillSettlesFromAccessLog(access, backFile);
  const second = backfillSettlesFromAccessLog(access, backFile);
  assert.equal(first.wrote, 3);
  assert.equal(second.wrote, 0);
  rmSync(backDir, { recursive: true, force: true });

  await withSettleServer(
    {
      X402_SKIP_SETTLE: "1",
      X402_FACILITATOR_URL: undefined,
      FORM_483_DIR: join(tmpdir(), "form-483-absent-settle-"),
      WARNING_LETTERS_DIR: join(tmpdir(), "wl-absent-settle-"),
      IMPORT_ALERTS_DIR: join(tmpdir(), "ia-absent-settle-"),
    },
    async (base, logPath) => {
      const unpaid = await fetch(`${base}/ticks`);
      assert.equal(unpaid.status, 402);
      const skipped = await fetch(`${base}/ticks`, {
        headers: { "X-PAYMENT": payment, "CF-Ray": "skip-settle-ray" },
      });
      assert.equal(skipped.status, 200);
      assert.equal(
        existsSync(logPath) ? parseSettleLog(readFileSync(logPath, "utf8")).length : 0,
        0,
        "skip-settle 200 is not a settle",
      );

      const publicRollup = await fetch(`${base}${SHOP_REQUEST_LOG_ROLLUP_PATH}`, {
        headers: { "CF-Connecting-IP": "203.0.113.88" },
      });
      assert.equal(publicRollup.status, 404, "public shop-request-log stays 404");
    },
  );

  await withMockFacilitator(async (facilitatorUrl) => {
    await withSettleServer(
      {
        X402_SKIP_SETTLE: undefined,
        X402_FACILITATOR_URL: facilitatorUrl,
        CDP_API_KEY_ID: undefined,
        CDP_API_KEY_SECRET: undefined,
        TICKS_DIR: "",
        TICKS_PATH: "",
        FORM_483_DIR: join(tmpdir(), "form-483-absent-fac-"),
        WARNING_LETTERS_DIR: join(tmpdir(), "wl-absent-fac-"),
        IMPORT_ALERTS_DIR: join(tmpdir(), "ia-absent-fac-"),
      },
      async (base, logPath) => {
        const paid = await fetch(`${base}/ticks`, {
          headers: {
            "X-PAYMENT": v1ExactPayment(),
            "CF-Ray": "settle-test-ray",
          },
        });
        assert.equal(paid.status, 200, "mock facilitator settle serves 200");
        const raw = readFileSync(logPath, "utf8");
        const lines = parseSettleLog(raw);
        assert.equal(lines.length, 1);
        assert.equal(lines[0]?.path, "/ticks");
        assert.equal(lines[0]?.amountAtomic, PAGE_AMOUNT_ATOMIC);
        assert.equal(lines[0]?.requestId, "settle-test-ray");
        assert.equal(lines[0]?.payer, PAYER);
        assert.equal(lines[0]?.txHash, TX);
        assert.ok(!raw.includes("deadbeef"));
        assert.ok(!raw.includes("0xab".repeat(4)));
      },
    );
  });

  console.log("settle-log tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
