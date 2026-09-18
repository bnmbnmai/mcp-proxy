import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bagCountOf,
  classifyLiveDoor,
  paidPathsFromWellKnown,
  renderLoopCloserMarkdown,
  scanLiveDoors,
  writeLoopCloserReport,
} from "./live-door-loop-closer.js";

async function main(): Promise<void> {
  assert.equal(bagCountOf({ cardCount: 0, cards: [] }), 0);
  assert.equal(bagCountOf({ tickCount: 5291 }), 5291);
  assert.equal(bagCountOf({ noticeCount: 1825 }), 1825);

  const paths = paidPathsFromWellKnown({
    resources: ["https://ticks.bnm.farm/ticks", "https://ticks.bnm.farm/ftc-orders", "https://ticks.bnm.farm/fmc-orders"],
  });
  assert.deepEqual(paths, ["/ticks", "/ftc-orders", "/fmc-orders"]);

  const emptyFtc = classifyLiveDoor("/ftc-orders", {
    product: "ftc-order-bodies",
    cardCount: 0,
    cards: [],
  });
  assert.equal(emptyFtc.empty, true);
  assert.equal(emptyFtc.reason, "cardCount-0-awaiting-first-collect");
  assert.match(emptyFtc.draftNote, /draft only/);
  assert.match(emptyFtc.draftNote, /No outbound/);
  assert.doesNotMatch(emptyFtc.draftNote, /email|twitter|slack/i);

  const healthy = classifyLiveDoor(
    "/fmc-orders",
    { cardCount: 12, fetchedAt: "2026-09-18T01:00:00.000Z", asOf: "2026-09-17" },
    Date.parse("2026-09-18T04:00:00.000Z"),
  );
  assert.equal(healthy.empty, false);
  assert.equal(healthy.stale, false);

  const mariners = classifyLiveDoor("/mariners", {
    noticeCount: 1825,
    fetchedAt: "2026-09-17T14:01:30.247Z",
  });
  assert.equal(mariners.empty, false, "mariners noticeCount is a bag, not empty");

  const now = Date.parse("2026-09-18T04:35:00.000Z");
  const report = await scanLiveDoors({
    wellKnownUrl: "https://ticks.bnm.farm/.well-known/x402",
    nowMs: now,
    fetchImpl: async (url) => {
      if (url.endsWith("/.well-known/x402")) {
        return {
          ok: true,
          json: { resources: ["https://ticks.bnm.farm/ftc-orders", "https://ticks.bnm.farm/fmc-orders"] },
        };
      }
      if (url.includes("/ftc-orders/manifest.json")) {
        return { ok: true, json: { cardCount: 0, cards: [] } };
      }
      if (url.includes("/fmc-orders/manifest.json")) {
        return { ok: true, json: { cardCount: 12, fetchedAt: "2026-09-18T01:00:00.000Z" } };
      }
      return { ok: false, error: `unexpected ${url}` };
    },
  });
  assert.equal(report.outbound, "none");
  assert.equal(report.empty.length, 1);
  assert.equal(report.empty[0]?.path, "/ftc-orders");
  assert.equal(report.resourceCount, 2);

  const dir = mkdtempSync(join(tmpdir(), "loop-closer-"));
  const md = writeLoopCloserReport(report, join(dir, "loop.md"));
  assert.match(md, /`\/ftc-orders`/);
  assert.match(md, /draft only/);
  assert.match(readFileSync(join(dir, "loop.md"), "utf8"), /No outbound sends/);
  assert.equal(renderLoopCloserMarkdown(report).includes("twitter"), false);

  console.log("live-door-loop-closer tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
