import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AddressInfo, Socket } from "node:net";
import { handleRequest } from "./ticks-door.js";
import {
  Q_MAX,
  SHOP_REQUEST_LOG_ROLLUP_PATH,
  clientIp,
  firstForwardedIp,
  isLocalOperator,
  parseShopRequestLog,
  paymentHeaderPresent,
  rollupShopRequestLog,
  sanitizeShopRequestLogEvent,
  truncateField,
  type ShopRequestLogEvent,
} from "./shop-request-log.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/firm-check");

function fakeReq(headers: Record<string, string | string[] | undefined>, remoteAddress = "10.0.0.9"): IncomingMessage {
  const socket = { remoteAddress } as Socket;
  return { headers, socket } as IncomingMessage;
}

async function withLoggedServer(
  envPatch: Record<string, string | undefined>,
  fn: (base: string, logPath: string) => Promise<void>,
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "shop-request-log-"));
  const logPath = join(dir, "shop-request-log.jsonl");
  const prev: Record<string, string | undefined> = {};
  const patch = { SHOP_REQUEST_LOG: "1", SHOP_REQUEST_LOG_PATH: logPath, ...envPatch };
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
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    rmSync(dir, { recursive: true, force: true });
  }
}

function readLog(path: string): ShopRequestLogEvent[] {
  try {
    return parseShopRequestLog(readFileSync(path, "utf8"));
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  assert.equal(firstForwardedIp("203.0.113.9, 10.0.0.1"), "203.0.113.9");
  assert.equal(clientIp(fakeReq({ "cf-connecting-ip": "203.0.113.4" }, "127.0.0.1")), "203.0.113.4");
  assert.equal(
    clientIp(fakeReq({ "x-forwarded-for": "198.51.100.7, 10.1.1.1" }, "127.0.0.1")),
    "198.51.100.7",
  );
  assert.equal(clientIp(fakeReq({}, "127.0.0.1")), "127.0.0.1");
  assert.equal(clientIp(fakeReq({}, "::ffff:192.0.2.8")), "192.0.2.8");
  assert.equal(truncateField("x".repeat(Q_MAX + 20), Q_MAX).length, Q_MAX);

  const dirty = sanitizeShopRequestLogEvent({
    kind: "paid-door",
    path: "/form-483",
    status: 402,
    ip: "203.0.113.9",
    ua: "agent/1",
    paymentHeader: true,
    q: "should-not-keep-on-paid",
    ...({
      payment: "eyJ4cGF5bWVudCI6InNlY3JldCJ9",
      wallet: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
      body: "DURING AN INSPECTION secret letter body",
    } as Record<string, string>),
  });
  assert.equal(dirty.paymentHeader, true);
  assert.equal(dirty.q, undefined);
  assert.ok(!JSON.stringify(dirty).includes("secret"));
  assert.ok(!JSON.stringify(dirty).includes("0xf59621"));
  assert.ok(!JSON.stringify(dirty).includes("eyJ4cGF5bWVud"));
  assert.equal(paymentHeaderPresent(fakeReq({ "x-payment": "secret-payload" })), true);

  const farmer: ShopRequestLogEvent[] = [
    { ts: "2026-08-28T00:00:00.000Z", ip: "1.1.1.1", path: "/firm-check", kind: "firm-check", status: 200, ua: "a", q: "acme", matchCount: 1 },
    { ts: "2026-08-28T00:00:01.000Z", ip: "1.1.1.1", path: "/firm-check", kind: "firm-check", status: 200, ua: "a", q: "pfizer", matchCount: 3 },
    { ts: "2026-08-28T00:00:02.000Z", ip: "1.1.1.1", path: "/firm-check", kind: "firm-check", status: 200, ua: "a", q: "nestle", matchCount: 1 },
    { ts: "2026-08-28T00:00:03.000Z", ip: "1.1.1.1", path: "/firm-check", kind: "firm-check", status: 200, ua: "a", q: "sanofi", matchCount: 1 },
    { ts: "2026-08-28T00:00:04.000Z", ip: "1.1.1.1", path: "/firm-check", kind: "firm-check", status: 200, ua: "a", q: "thames", matchCount: 1 },
    { ts: "2026-08-28T00:01:00.000Z", ip: "2.2.2.2", path: "/firm-check", kind: "firm-check", status: 200, ua: "b", q: "ovo", matchCount: 1 },
    { ts: "2026-08-28T00:01:30.000Z", ip: "2.2.2.2", path: "/form-483", kind: "paid-door", status: 200, ua: "b", id: "cascade", paymentHeader: true },
    { ts: "2026-08-28T00:02:00.000Z", ip: "3.3.3.3", path: "/ticks", kind: "paid-door", status: 402, ua: "c", paymentHeader: false },
  ];
  const rollup = rollupShopRequestLog(farmer, 5);
  assert.equal(rollup.uniqueIps, 3);
  assert.equal(rollup.searchCount, 6);
  assert.equal(rollup.paidFollowCount, 1);
  assert.equal(rollup.paid200Count, 1);
  assert.deepEqual(rollup.heavyNeverPaid.map((row) => row.ip), ["1.1.1.1"]);
  assert.equal(rollup.heavyNeverPaid[0]?.searchCount, 5);
  assert.equal(rollup.heavyNeverPaid[0]?.paid200Count, 0);

  assert.equal(isLocalOperator(fakeReq({}, "127.0.0.1")), true);
  assert.equal(isLocalOperator(fakeReq({ "cf-connecting-ip": "203.0.113.4" }, "127.0.0.1")), false);
  assert.equal(isLocalOperator(fakeReq({ "x-forwarded-for": "203.0.113.4" }, "127.0.0.1")), false);

  await withLoggedServer(
    {
      FORM_483_DIR: join(mkdtempSync(join(tmpdir(), "fc-483-")), "form-483"),
      WARNING_LETTERS_DIR: join(mkdtempSync(join(tmpdir(), "fc-wl-")), "warning-letters"),
      IMPORT_ALERTS_DIR: join(mkdtempSync(join(tmpdir(), "fc-ia-")), "import-alerts"),
      UNTITLED_LETTERS_DIR: join(tmpdir(), "untitled-absent-log-"),
      FTC_WL_DIR: join(tmpdir(), "ftc-wl-absent-log-"),
      OFWAT_ENFORCEMENT_DIR: join(tmpdir(), "ofwat-absent-log-"),
      OFGEM_ENFORCEMENT_DIR: join(tmpdir(), "ofgem-absent-log-"),
      CFPB_ORDERS_DIR: join(tmpdir(), "cfpb-absent-log-"),
      OCC_CD_DIR: join(tmpdir(), "occ-absent-log-"),
      FDIC_ORDERS_DIR: join(tmpdir(), "fdic-absent-log-"),
      X402_SKIP_SETTLE: "1",
    },
    async (base, logPath) => {
      const scratch = mkdtempSync(join(tmpdir(), "shop-log-fixtures-"));
      cpSync(join(FIXTURES, "form-483"), join(scratch, "form-483"), { recursive: true });
      cpSync(join(FIXTURES, "warning-letters"), join(scratch, "warning-letters"), { recursive: true });
      cpSync(join(FIXTURES, "import-alerts"), join(scratch, "import-alerts"), { recursive: true });
      process.env.FORM_483_DIR = join(scratch, "form-483");
      process.env.WARNING_LETTERS_DIR = join(scratch, "warning-letters");
      process.env.IMPORT_ALERTS_DIR = join(scratch, "import-alerts");

      const search = await fetch(`${base}/firm-check?q=cascade`, {
        headers: {
          "User-Agent": "farm-test/1",
          "CF-Connecting-IP": "203.0.113.88",
        },
      });
      assert.equal(search.status, 200);
      const searchBody = (await search.json()) as { matchCount?: number; matches?: { body?: string }[] };
      assert.equal(typeof searchBody.matchCount, "number");
      assert.ok((searchBody.matchCount ?? 0) >= 1);
      assert.ok(!JSON.stringify(searchBody).includes("secret cascade body"));

      const huge = `cascade${"x".repeat(400)}`;
      const hugeRes = await fetch(`${base}/firm-check?q=${encodeURIComponent(huge)}`, {
        headers: { "CF-Connecting-IP": "203.0.113.88", "User-Agent": "farm-test/1" },
      });
      assert.equal(hugeRes.status, 200);

      const missing = await fetch(`${base}/firm-check`, {
        headers: { "CF-Connecting-IP": "203.0.113.88", "User-Agent": "farm-test/1" },
      });
      assert.equal(missing.status, 400);

      const unpaid = await fetch(`${base}/form-483?id=cascade-specialty-pharmacy-llc-193964`, {
        headers: { "CF-Connecting-IP": "203.0.113.88", "User-Agent": "farm-test/1" },
      });
      assert.equal(unpaid.status, 402);
      const unpaidBody = (await unpaid.json()) as { accepts?: unknown };
      assert.ok(unpaidBody.accepts, "402 challenge still present");

      const ticks402 = await fetch(`${base}/ticks`, {
        headers: { "CF-Connecting-IP": "203.0.113.88", "User-Agent": "farm-test/1" },
      });
      assert.equal(ticks402.status, 402);

      const paid = await fetch(`${base}/ticks`, {
        headers: {
          "CF-Connecting-IP": "203.0.113.88",
          "User-Agent": "farm-test/1",
          "X-PAYMENT": "test-should-never-be-logged",
        },
      });
      assert.equal(paid.status, 200);

      const localRollup = await fetch(`${base}${SHOP_REQUEST_LOG_ROLLUP_PATH}`);
      assert.equal(localRollup.status, 200);
      const localBody = (await localRollup.json()) as {
        uniqueIps?: number;
        searchCount?: number;
        paidFollowCount?: number;
        paid200Count?: number;
      };
      assert.equal(localBody.uniqueIps, 1);
      assert.equal(localBody.searchCount, 3);
      assert.equal(localBody.paidFollowCount, 1);
      assert.equal(localBody.paid200Count, 1);

      const publicRollup = await fetch(`${base}${SHOP_REQUEST_LOG_ROLLUP_PATH}`, {
        headers: { "CF-Connecting-IP": "203.0.113.88" },
      });
      assert.equal(publicRollup.status, 404);

      const lines = readLog(logPath);
      assert.equal(lines.length, 6);
      const firm = lines.filter((row) => row.kind === "firm-check");
      assert.equal(firm[0]?.ip, "203.0.113.88");
      assert.equal(firm[0]?.path, "/firm-check");
      assert.equal(firm[0]?.status, 200);
      assert.equal(firm[0]?.ua, "farm-test/1");
      assert.equal(firm[0]?.q, "cascade");
      assert.equal(typeof firm[0]?.matchCount, "number");
      assert.equal(firm[1]?.q?.startsWith("cascade"), true);
      assert.ok((firm[1]?.q?.length ?? 0) <= Q_MAX);
      assert.ok((firm[1]?.q?.length ?? 0) < huge.length);
      assert.equal(firm[2]?.status, 400);

      const doors = lines.filter((row) => row.kind === "paid-door");
      assert.equal(doors[0]?.path, "/form-483");
      assert.equal(doors[0]?.status, 402);
      assert.equal(doors[0]?.id, "cascade-specialty-pharmacy-llc-193964");
      assert.equal(doors[0]?.paymentHeader, false);
      assert.equal(doors[1]?.path, "/ticks");
      assert.equal(doors[1]?.status, 402);
      assert.equal(doors[2]?.status, 200);
      assert.equal(doors[2]?.paymentHeader, true);

      const raw = readFileSync(logPath, "utf8");
      assert.ok(!raw.includes("test-should-never-be-logged"));
      assert.ok(!raw.includes("secret cascade body"));
      assert.ok(!raw.includes("secret cascade observation"));
      assert.ok(!raw.includes("0xf59621FC406D266e18f314Ae18eF0a33b8401004"));
    },
  );

  console.log("shop-request-log tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
