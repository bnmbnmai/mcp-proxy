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

function runPlan(snapshot: unknown, staleHours = 36, growUntil = 24): { action: string; n: number } {
  const dir = mkdtempSync(join(tmpdir(), "ticks-collect-plan-"));
  const path = join(dir, "snapshot.json");
  if (snapshot !== null) writeFileSync(path, JSON.stringify(snapshot));
  const result = spawnSync(
    "python3",
    [join(repoRoot, "scripts/ticks-collect-plan.py"), path, String(staleHours), String(growUntil)],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const [action, nRaw] = result.stdout.trim().split(/\s+/);
  return { action, n: Number(nRaw) };
}

function runDryCollect(opts: { sku: string; snapshot: unknown }): string {
  const root = mkdtempSync(join(tmpdir(), "ticks-collect-dry-"));
  const skuDir = join(root, "data", opts.sku);
  mkdirSync(skuDir, { recursive: true });
  writeFileSync(join(skuDir, "snapshot.json"), JSON.stringify(opts.snapshot));
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

  const notices = runPlan({
    notices: Array.from({ length: 5 }, (_, i) => ({ id: `n${i}` })),
    fetchedAt: "2026-08-23T14:47:45Z",
    asOf: "2026-08-19",
  });
  assert.equal(notices.action, "grow");
  assert.equal(notices.n, 5);

  const mid = runPlan({
    cardCount: 13,
    fetchedAt: new Date().toISOString(),
    asOf: "2026-08-12",
  });
  assert.equal(mid.action, "grow", "past 5 but still under dozens keeps growing");
  assert.equal(mid.n, 13);

  const grownFresh = runPlan({
    cardCount: 30,
    fetchedAt: new Date().toISOString(),
    asOf: "2026-08-12",
  });
  assert.equal(grownFresh.action, "skip");
  assert.equal(grownFresh.n, 30);

  const grownStale = runPlan({
    recordCount: 30,
    cards: Array.from({ length: 30 }, (_, i) => ({ id: `c${i}` })),
    fetchedAt: "2026-08-01T00:00:00Z",
    asOf: "2026-07-15",
  });
  assert.equal(grownStale.action, "refresh");
  assert.equal(grownStale.n, 30);

  const poisoned = runPlan({
    cardCount: 40,
    fetchedAt: "2026-08-23T10:00:00Z",
    asOf: "2825-01-21",
  });
  assert.equal(poisoned.action, "refresh");

  const missing = runPlan(null);
  assert.equal(missing.action, "grow");
  assert.equal(missing.n, 0);

  const script = readFileSync(join(repoRoot, "scripts/ticks-collect.sh"), "utf-8");
  assert.match(script, /GROW_LIMIT="\$\{TICKS_COLLECT_GROW_LIMIT:-24\}"/);
  assert.match(script, /CFPB_ORDERS/);
  assert.match(script, /FIFRA_ORDERS/);
  assert.match(script, /AIR_LETTERS/);
  assert.match(script, /untitled-letters/);
  assert.match(script, /mariners-d8/);
  const doorsBlock = script.slice(script.indexOf("DOORS=("), script.indexOf("door_action"));
  assert.doesNotMatch(doorsBlock, /npdes/i);

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
  });
  assert.match(dry, /cfpb-orders grow n=5 growUntil=24 limit=24/);
  assert.match(dry, /collect start growUntil=24 limit=24/);
  assert.doesNotMatch(dry, /cfpb-orders skip/);
  assert.ok(
    listed !== null && listed > 5,
    "one existing official door listing exceeds 5, so grow+limit=24 would pass first-slice",
  );

  console.log("ticks-collect grow-past-5 tests ok");
  console.log(
    JSON.stringify({
      door: "cfpb-orders",
      officialListingRows: listed,
      firstSliceCardCount: 5,
      plannedAction: "grow",
      growUntil: 24,
      additionalBodiesThisPass: 24,
      wouldExceed5: true,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
