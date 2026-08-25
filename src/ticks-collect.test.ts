import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { listedCountFromHtml } from "./cfpb-orders.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolveRepoRoot(here);

function resolveRepoRoot(from: string): string {
  if (from.endsWith("/build") || from.endsWith("\\build")) return dirname(from);
  if (from.endsWith("/src") || from.endsWith("\\src")) return dirname(from);
  return from;
}

function readFx(name: string): string {
  return readFileSync(join(repoRoot, "src/fixtures/cfpb-orders", name), "utf-8");
}

function runPlan(
  snapshot: unknown,
  staleHours = 36,
  growUntil = 20,
): { action: string; n: number; reason: string } {
  const dir = mkdtempSync(join(tmpdir(), "ticks-collect-plan-"));
  const path = join(dir, "snapshot.json");
  if (snapshot !== null) writeFileSync(path, JSON.stringify(snapshot));
  const result = spawnSync(
    "python3",
    [join(repoRoot, "scripts/ticks-collect-plan.py"), path, String(staleHours), String(growUntil)],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const [action, nRaw, reason] = result.stdout.trim().split(/\s+/);
  return { action, n: Number(nRaw), reason };
}

function runDryCollect(opts: {
  sku?: string;
  snapshot?: unknown;
  doors?: Array<{ sku: string; snapshot: unknown }>;
  ticks?: unknown;
}): string {
  const root = mkdtempSync(join(tmpdir(), "ticks-collect-dry-"));
  const doors = opts.doors ?? (opts.sku && opts.snapshot !== undefined ? [{ sku: opts.sku, snapshot: opts.snapshot }] : []);
  for (const door of doors) {
    const skuDir = join(root, "data", door.sku);
    mkdirSync(skuDir, { recursive: true });
    writeFileSync(join(skuDir, "snapshot.json"), JSON.stringify(door.snapshot));
  }
  const ticksDir = join(root, "data", "prices");
  mkdirSync(ticksDir, { recursive: true });
  if (opts.ticks !== undefined) {
    writeFileSync(join(ticksDir, "manifest.json"), JSON.stringify(opts.ticks));
  }
  const log = join(root, "ticks-collect.log");
  const result = spawnSync("bash", [join(repoRoot, "scripts/ticks-collect.sh")], {
    encoding: "utf8",
    env: {
      ...process.env,
      TZ: "America/Boise",
      TICKS_COLLECT_DRY_RUN: "1",
      TICKS_COLLECT_SKIP_IMAGINE: "1",
      SKIP_HAY: "1",
      MCP_PROXY_DIR: root,
      TICKS_DIR: ticksDir,
      TICKS_COLLECT_PLAN: join(repoRoot, "scripts/ticks-collect-plan.py"),
      TICKS_COLLECT_LOG: log,
      TICKS_COLLECT_LOCK: join(root, "ticks-collect.lock"),
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return `${result.stdout}\n${readFileSync(log, "utf-8")}`;
}

async function main(): Promise<void> {
  const listed = listedCountFromHtml(readFx("listing-excerpt.html"));
  assert.ok((listed ?? 0) > 5, "existing CFPB official listing has more than 5 rows");
  assert.equal(listed, 386);

  const thin = runPlan({
    cardCount: 5,
    cards: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
    fetchedAt: "2026-08-23T14:49:34.065Z",
    asOf: "2026-07-29",
  });
  assert.equal(thin.action, "grow");
  assert.equal(thin.n, 5);
  assert.equal(thin.reason, "thin");

  const notices = runPlan({
    notices: Array.from({ length: 5 }, (_, i) => ({ id: `n${i}` })),
    fetchedAt: "2026-08-23T14:47:45Z",
    asOf: "2026-08-19",
  });
  assert.equal(notices.action, "grow");
  assert.equal(notices.n, 5);
  assert.equal(notices.reason, "thin");

  const mid = runPlan({
    cardCount: 13,
    fetchedAt: new Date().toISOString(),
    asOf: "2026-08-12",
  });
  assert.equal(mid.action, "grow", "past 5 but still under ~20 keeps growing");
  assert.equal(mid.n, 13);
  assert.equal(mid.reason, "thin");

  const grownFresh = runPlan({
    cardCount: 20,
    fetchedAt: new Date().toISOString(),
    asOf: "2026-08-12",
  });
  assert.equal(grownFresh.action, "skip");
  assert.equal(grownFresh.n, 20);
  assert.equal(grownFresh.reason, "fresh");

  const fatFresh = runPlan({
    cardCount: 3550,
    fetchedAt: new Date().toISOString(),
    asOf: "2026-08-11",
  });
  assert.equal(fatFresh.action, "skip");
  assert.equal(fatFresh.n, 3550);
  assert.equal(fatFresh.reason, "fat");

  const hayFresh = runPlan({
    tickCount: 611,
    fetchedAt: new Date().toISOString(),
    asOf: "2026-08-25",
  });
  assert.equal(hayFresh.action, "skip");
  assert.equal(hayFresh.reason, "fat");

  const grownStale = runPlan({
    recordCount: 30,
    cards: Array.from({ length: 30 }, (_, i) => ({ id: `c${i}` })),
    fetchedAt: "2026-08-01T00:00:00Z",
    asOf: "2026-07-15",
  });
  assert.equal(grownStale.action, "refresh");
  assert.equal(grownStale.n, 30);
  assert.equal(grownStale.reason, "stale");

  const poisoned = runPlan({
    cardCount: 40,
    fetchedAt: "2026-08-23T10:00:00Z",
    asOf: "2825-01-21",
  });
  assert.equal(poisoned.action, "refresh");
  assert.equal(poisoned.reason, "asof");

  const missing = runPlan(null);
  assert.equal(missing.action, "grow");
  assert.equal(missing.n, 0);
  assert.equal(missing.reason, "thin");

  const script = readFileSync(join(repoRoot, "scripts/ticks-collect.sh"), "utf-8");
  assert.match(script, /GROW_UNTIL="\$\{TICKS_COLLECT_GROW_UNTIL:-20\}"/);
  assert.match(script, /GROW_LIMIT="\$\{TICKS_COLLECT_GROW_LIMIT:-24\}"/);
  assert.match(script, /CFPB_ORDERS/);
  assert.match(script, /FIFRA_ORDERS/);
  assert.match(script, /FDIC_ORDERS/);
  assert.match(script, /FERC_ORDERS/);
  assert.match(script, /NCUA_ORDERS/);
  assert.match(script, /AIR_LETTERS/);
  assert.match(script, /untitled-letters/);
  assert.match(script, /mariners-d8/);
  assert.match(script, /ticks-ams\.js/);
  assert.match(script, /nationwide AMS hay\/cattle\/grain/);
  assert.match(script, /Always consider \/ticks first/);
  assert.doesNotMatch(script, /crontab -e|0 8 \*|0 6 \*/);
  assert.match(script, /No second cron/);
  assert.match(script, /02:00-04:00 America\/Boise/);
  const hayBlock = script.slice(script.indexOf("hay/cattle collect"), script.indexOf("DOORS=("));
  assert.match(hayBlock, /collect-prices\.py/);
  assert.match(hayBlock, /ticks-ams\.js/);
  assert.ok(hayBlock.indexOf("collect-prices.py") < hayBlock.indexOf("ticks-ams.js"), "Idaho hay stays first");
  const doorsBlock = script.slice(script.indexOf("DOORS=("), script.indexOf("door_snap"));
  assert.doesNotMatch(doorsBlock, /npdes/i);
  assert.doesNotMatch(doorsBlock, /ticks-ams/);

  const dry = runDryCollect({
    sku: "cfpb-orders",
    snapshot: {
      product: "cfpb-consent-order-bodies",
      cardCount: 5,
      cards: [
        { id: "honda" },
        { id: "block" },
        { id: "equifax" },
        { id: "performant" },
        { id: "wise" },
      ],
      fetchedAt: "2026-08-23T14:49:34.065Z",
      asOf: "2026-07-29",
    },
    ticks: { tickCount: 611, fetchedAt: new Date().toISOString(), asOf: "2026-08-25" },
  });
  assert.match(dry, /cfpb-orders grow n=5 growUntil=20 limit=24/);
  assert.match(dry, /collect start growUntil=20 limit=24/);
  assert.match(dry, /dry-run plan nationwide AMS hay\/cattle\/grain \(same \/ticks door\)/);
  assert.match(dry, /\/ticks, 611, 611, fat/);
  assert.match(dry, /\/cfpb-orders, 5, 5, thin/);
  assert.doesNotMatch(dry, /cfpb-orders skip/);
  assert.ok(dry.indexOf("/ticks,") < dry.indexOf("/cfpb-orders,"), "/ticks is planned first");

  const fatDry = runDryCollect({
    doors: [
      {
        sku: "gmp",
        snapshot: { cardCount: 3550, fetchedAt: new Date().toISOString(), asOf: "2026-08-11" },
      },
      {
        sku: "import-alerts",
        snapshot: { tickCount: 18904, fetchedAt: new Date().toISOString(), asOf: "2026-08-24" },
      },
      {
        sku: "warning-letters",
        snapshot: { letterCount: 396, fetchedAt: new Date().toISOString(), asOf: "2026-08-14" },
      },
      {
        sku: "form-483",
        snapshot: { letterCount: 314, fetchedAt: new Date().toISOString(), asOf: "2026-08-12" },
      },
      {
        sku: "mariners-d7",
        snapshot: { noticeCount: 1825, fetchedAt: new Date().toISOString(), asOf: "2026-08-20" },
      },
      {
        sku: "mariners-d8",
        snapshot: { noticeCount: 1258, fetchedAt: new Date().toISOString(), asOf: "2026-08-20" },
      },
    ],
    ticks: { tickCount: 611, fetchedAt: new Date().toISOString(), asOf: "2026-08-25" },
  });
  assert.match(fatDry, /\/gmp, 3550, 3550, fat/);
  assert.match(fatDry, /\/import-alerts, 18904, 18904, fat/);
  assert.match(fatDry, /\/warning-letters, 396, 396, fat/);
  assert.match(fatDry, /\/form-483, 314, 314, fat/);
  assert.match(fatDry, /\/mariners-d7, 1825, 1825, fat/);
  assert.match(fatDry, /\/mariners-d8, 1258, 1258, fat/);
  assert.doesNotMatch(fatDry, /gmp grow /);
  assert.ok(fatDry.indexOf("/ticks,") < fatDry.indexOf("/gmp,"), "/ticks stays first on a fat pass");

  assert.ok(
    listed !== null && listed > 5,
    "one existing official door listing exceeds 5, so grow+limit=24 would pass first-slice",
  );

  console.log("ticks-collect skip-fresh-fat tests ok");
  console.log(
    JSON.stringify({
      door: "cfpb-orders",
      officialListingRows: listed,
      firstSliceCardCount: 5,
      plannedAction: "grow",
      growUntil: 20,
      additionalBodiesThisPass: 24,
      wouldExceed5: true,
      skipFreshFat: true,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
