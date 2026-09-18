import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SettleEvent } from "./settle-log.js";
import {
  alertLineFor,
  amountUsdcFromAtomic,
  eventKey,
  loadHousePayers,
  newStrangerSettles,
  payerClassOf,
  scanStrangerSettleAlert,
} from "./stranger-settle-alert.js";

const HOUSE = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const STRANGER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function ev(partial: Partial<SettleEvent> & Pick<SettleEvent, "path" | "requestId">): SettleEvent {
  return {
    ts: partial.ts ?? "2026-09-18T00:00:00.000Z",
    path: partial.path,
    amountAtomic: partial.amountAtomic ?? "50000",
    requestId: partial.requestId,
    payer: partial.payer,
    source: partial.source ?? "live",
  };
}

async function main(): Promise<void> {
  assert.equal(amountUsdcFromAtomic("50000"), "$0.05");
  assert.equal(amountUsdcFromAtomic("20000"), "$0.02");
  assert.equal(alertLineFor(ev({ path: "/ticks", requestId: "a", payer: STRANGER }), "stranger"), "/ticks $0.05 stranger");

  const house = new Set([HOUSE]);
  assert.equal(payerClassOf(ev({ path: "/ticks", requestId: "h", payer: HOUSE }), house), "house");
  assert.equal(payerClassOf(ev({ path: "/ticks", requestId: "s", payer: STRANGER }), house), "stranger");
  assert.equal(payerClassOf(ev({ path: "/ticks", requestId: "u" }), house), "unknown");

  const dir = mkdtempSync(join(tmpdir(), "house-payers-"));
  writeFileSync(join(dir, "house.txt"), `# comment\n${HOUSE}\nnot-a-wallet\n`);
  const loaded = loadHousePayers(join(dir, "house.txt"), "");
  assert.equal(loaded.has(HOUSE), true);
  assert.equal(loaded.size, 1, "do not invent house wallets from junk lines");

  const journal: SettleEvent[] = [
    ev({ path: "/ticks", requestId: "known-house", payer: HOUSE, ts: "2026-09-05T06:30:52.126Z" }),
    ev({ path: "/form-483", requestId: "backfill", amountAtomic: "20000", ts: "2026-09-03T00:00:00.000Z" }),
    ev({ path: "/ftc-orders", requestId: "new-stranger", payer: STRANGER, ts: "2026-09-18T04:00:00.000Z" }),
  ];
  const fresh = newStrangerSettles(journal, new Set(), house);
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0]?.requestId, "new-stranger");
  assert.equal(eventKey(fresh[0]!), "2026-09-18T04:00:00.000Z|/ftc-orders|new-stranger");

  const emptyDir = mkdtempSync(join(tmpdir(), "stranger-none-"));
  const none = scanStrangerSettleAlert({
    events: [],
    alertPath: join(emptyDir, "alert.txt"),
    seenPath: join(emptyDir, "seen.json"),
    house,
  });
  assert.equal(none.line, "none");
  assert.equal(none.wrote, false);
  assert.equal(none.journalCount, 0, "empty journal does not invent a settle");
  assert.equal(readFileSync(none.alertPath, "utf8"), "none\n");

  const work = mkdtempSync(join(tmpdir(), "stranger-alert-"));
  const first = scanStrangerSettleAlert({
    events: journal,
    alertPath: join(work, "alert.txt"),
    seenPath: join(work, "seen.json"),
    house,
  });
  assert.equal(first.line, "/ftc-orders $0.05 stranger");
  assert.equal(first.wrote, true);
  assert.equal(first.newStrangerCount, 1);
  assert.ok(!first.line.includes(STRANGER), "alert line is path/$/class only");
  assert.equal(readFileSync(first.alertPath, "utf8").trim(), "/ftc-orders $0.05 stranger");

  const second = scanStrangerSettleAlert({
    events: journal,
    alertPath: join(work, "alert.txt"),
    seenPath: join(work, "seen.json"),
    house,
  });
  assert.equal(second.line, "none", "already-seen stranger is not NEW");
  assert.equal(second.newStrangerCount, 0);

  console.log("stranger-settle-alert tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
