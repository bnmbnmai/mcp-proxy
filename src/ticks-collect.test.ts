import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
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
  wellKnown?: string[];
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
  const wkSkus = opts.wellKnown ?? ["ticks", ...doors.map((d) => d.sku)];
  const wkPath = join(root, "well-known.json");
  writeFileSync(
    wkPath,
    JSON.stringify({
      version: 1,
      resources: wkSkus.map((sku) => `https://ticks.bnm.farm/${sku}`),
    }),
  );
  const log = join(root, "ticks-collect.log");
  const result = spawnSync("bash", [join(repoRoot, "scripts/ticks-collect.sh")], {
    encoding: "utf8",
    env: {
      ...process.env,
      TZ: "America/Boise",
      TICKS_COLLECT_DRY_RUN: "1",
      TICKS_COLLECT_SKIP_IMAGINE: "1",
      TICKS_COLLECT_SKIP_LIVE_HAY: "1",
      MCP_PROXY_DIR: root,
      TICKS_DIR: ticksDir,
      TICKS_COLLECT_PLAN: join(repoRoot, "scripts/ticks-collect-plan.py"),
      TICKS_COLLECT_WELL_KNOWN_FILE: wkPath,
      TICKS_COLLECT_LOG: log,
      TICKS_COLLECT_LOCK: join(root, "ticks-collect.lock"),
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return `${result.stdout}\n${readFileSync(log, "utf-8")}`;
}

function runParallelDoorProbe(): { log: string; mark: string; root: string } {
  const root = mkdtempSync(join(tmpdir(), "ticks-collect-parallel-"));
  const mark = join(root, "mark.txt");
  const stub = join(root, "stub-node.sh");
  writeFileSync(
    stub,
    `#!/bin/bash
sku=$(basename "$1" .js)
printf 'start %s %s\\n' "$sku" "$(date +%s%N)" >> ${JSON.stringify(mark)}
echo "stub-start $sku"
sleep 1
printf 'end %s %s\\n' "$sku" "$(date +%s%N)" >> ${JSON.stringify(mark)}
echo "stub-end $sku"
`,
  );
  chmodSync(stub, 0o755);
  const skus = ["cfpb-orders", "superfund-rods", "gmp", "phmsa-orders", "eis-reports"];
  mkdirSync(join(root, "build"), { recursive: true });
  for (const sku of skus) {
    const skuDir = join(root, "data", sku);
    mkdirSync(skuDir, { recursive: true });
    writeFileSync(
      join(skuDir, "snapshot.json"),
      JSON.stringify({ cardCount: 20, fetchedAt: new Date().toISOString(), asOf: "2026-09-28" }),
    );
    writeFileSync(join(root, "build", `${sku}.js`), "// probe\n");
  }
  const ticksDir = join(root, "data", "prices");
  mkdirSync(ticksDir, { recursive: true });
  writeFileSync(
    join(ticksDir, "manifest.json"),
    JSON.stringify({ tickCount: 611, fetchedAt: new Date().toISOString(), asOf: "2026-09-28" }),
  );
  const wkPath = join(root, "well-known.json");
  writeFileSync(
    wkPath,
    JSON.stringify({
      version: 1,
      resources: ["ticks", ...skus].map((sku) => `https://ticks.bnm.farm/${sku}`),
    }),
  );
  const log = join(root, "ticks-collect.log");
  const result = spawnSync("bash", [join(repoRoot, "scripts/ticks-collect.sh")], {
    encoding: "utf8",
    env: {
      ...process.env,
      TZ: "America/Boise",
      SKIP_HAY: "1",
      TICKS_COLLECT_SKIP_IMAGINE: "1",
      TICKS_COLLECT_SKIP_LIVE_HAY: "1",
      MCP_PROXY_DIR: root,
      TICKS_DIR: ticksDir,
      NODE_BIN: stub,
      TICKS_COLLECT_PLAN: join(repoRoot, "scripts/ticks-collect-plan.py"),
      TICKS_COLLECT_WELL_KNOWN_FILE: wkPath,
      TICKS_COLLECT_LOG: log,
      TICKS_COLLECT_LOCK: join(root, "ticks-collect.lock"),
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return { log: `${result.stdout}\n${readFileSync(log, "utf-8")}`, mark: readFileSync(mark, "utf8"), root };
}

async function withHayOrigin(
  routes: Record<string, { status: number; body?: unknown }>,
  fn: (origin: string) => Promise<void>,
): Promise<void> {
  // A child process, not an in-process server: ticks-collect.sh is spawnSync,
  // which would stall this process's event loop and make the hay curl time out.
  const file = join(tmpdir(), `ticks-hay-server-${process.pid}-${Date.now()}.mjs`);
  writeFileSync(
    file,
    `import { createServer } from "node:http";
const routes = ${JSON.stringify(routes)};
const server = createServer((req, res) => {
  const path = (req.url || "/").split("?")[0];
  const route = routes[path];
  if (!route) {
    res.writeHead(404);
    res.end();
    return;
  }
  const payload = route.body === undefined ? "" : JSON.stringify(route.body);
  res.writeHead(route.status, { "Content-Type": "application/json" });
  res.end(payload);
});
server.listen(0, "127.0.0.1", () => {
  const addr = server.address();
  process.stdout.write(String(addr && typeof addr === "object" ? addr.port : "") + "\\n");
});
`,
  );
  const child = spawn(process.execPath, [file], { stdio: ["ignore", "pipe", "inherit"] });
  const port = await new Promise<string>((resolve, reject) => {
    let buf = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      const line = buf.split("\n")[0]?.trim() ?? "";
      if (/^\d+$/.test(line)) resolve(line);
    });
    child.once("error", reject);
    child.once("exit", (code) => reject(new Error(`hay server exited ${code} before listening`)));
  });
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    child.kill();
  }
}

function runHayProbe(origin: string): string {
  const root = mkdtempSync(join(tmpdir(), "ticks-collect-hay-"));
  const ticksDir = join(root, "data", "prices");
  mkdirSync(ticksDir, { recursive: true });
  writeFileSync(
    join(ticksDir, "manifest.json"),
    JSON.stringify({ tickCount: 3, fetchedAt: new Date().toISOString(), asOf: "2026-10-01" }),
  );
  const skuDir = join(root, "data", "cfpb-orders");
  mkdirSync(skuDir, { recursive: true });
  writeFileSync(
    join(skuDir, "snapshot.json"),
    JSON.stringify({ cardCount: 20, fetchedAt: new Date().toISOString(), asOf: "2026-10-16" }),
  );
  const wkPath = join(root, "well-known.json");
  writeFileSync(
    wkPath,
    JSON.stringify({
      version: 1,
      resources: ["https://ticks.bnm.farm/ticks", "https://ticks.bnm.farm/cfpb-orders"],
    }),
  );
  const log = join(root, "ticks-collect.log");
  const env = { ...process.env };
  delete env.TICKS_COLLECT_SKIP_LIVE_HAY;
  delete env.TICKS_COLLECT_HAY_MANIFEST_URL;
  const result = spawnSync("bash", [join(repoRoot, "scripts/ticks-collect.sh")], {
    encoding: "utf8",
    env: {
      ...env,
      TZ: "America/Boise",
      TICKS_COLLECT_DRY_RUN: "1",
      TICKS_COLLECT_SKIP_IMAGINE: "1",
      MCP_PROXY_DIR: root,
      TICKS_DIR: ticksDir,
      TICKS_COLLECT_PLAN: join(repoRoot, "scripts/ticks-collect-plan.py"),
      TICKS_COLLECT_WELL_KNOWN_FILE: wkPath,
      TICKS_COLLECT_LOG: log,
      TICKS_COLLECT_LOCK: join(root, "ticks-collect.lock"),
      TICKS_COLLECT_HAY_PLAN: join(root, "hay-plan.json"),
      TICKS_COLLECT_HAY_ORIGIN: origin,
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return `${result.stdout}\n${readFileSync(log, "utf-8")}`;
}

function runFailedDoorProbe(): string {
  const root = mkdtempSync(join(tmpdir(), "ticks-collect-fail-"));
  const stub = join(root, "stub-node.sh");
  writeFileSync(stub, "#!/bin/bash\necho 'navcen down' >&2\nexit 1\n");
  chmodSync(stub, 0o755);
  mkdirSync(join(root, "build"), { recursive: true });
  writeFileSync(join(root, "build", "mariners.js"), "// probe\n");
  const skuDir = join(root, "data", "mariners");
  mkdirSync(skuDir, { recursive: true });
  writeFileSync(
    join(skuDir, "snapshot.json"),
    JSON.stringify({
      noticeCount: 40,
      notices: Array.from({ length: 40 }, (_, i) => ({ id: `n${i}` })),
      fetchedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      asOf: "2026-10-21",
    }),
  );
  const ticksDir = join(root, "data", "prices");
  mkdirSync(ticksDir, { recursive: true });
  writeFileSync(
    join(ticksDir, "manifest.json"),
    JSON.stringify({ tickCount: 611, fetchedAt: new Date().toISOString(), asOf: "2026-10-21" }),
  );
  const wkPath = join(root, "well-known.json");
  writeFileSync(
    wkPath,
    JSON.stringify({
      version: 1,
      resources: ["ticks", "mariners"].map((sku) => `https://ticks.bnm.farm/${sku}`),
    }),
  );
  const log = join(root, "ticks-collect.log");
  const result = spawnSync("bash", [join(repoRoot, "scripts/ticks-collect.sh")], {
    encoding: "utf8",
    env: {
      ...process.env,
      TZ: "America/Boise",
      SKIP_HAY: "1",
      TICKS_COLLECT_SKIP_IMAGINE: "1",
      TICKS_COLLECT_SKIP_LIVE_HAY: "1",
      MCP_PROXY_DIR: root,
      TICKS_DIR: ticksDir,
      NODE_BIN: stub,
      TICKS_COLLECT_PLAN: join(repoRoot, "scripts/ticks-collect-plan.py"),
      TICKS_COLLECT_WELL_KNOWN_FILE: wkPath,
      TICKS_COLLECT_LOG: log,
      TICKS_COLLECT_LOCK: join(root, "ticks-collect.lock"),
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return `${result.stdout}\n${readFileSync(log, "utf-8")}`;
}

function runListOfficial(origin: string, env: Record<string, string>, doorSrc?: string): string {
  const result = spawnSync(
    "python3",
    [
      join(repoRoot, "scripts/ticks-collect-plan.py"),
      "--list-official",
      "--url",
      `${origin}/.well-known/x402`,
      ...(doorSrc ? ["--door-src", doorSrc] : []),
    ],
    {
      encoding: "utf8",
      env: { ...process.env, ...env },
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

async function withWellKnownServer(
  mode: "retry" | "never",
  fn: (origin: string) => Promise<void>,
): Promise<void> {
  // Child process: runListOfficial is spawnSync, which would stall this
  // process and make the well-known stub unable to answer.
  const file = join(tmpdir(), `ticks-well-known-${process.pid}-${Date.now()}.mjs`);
  writeFileSync(
    file,
    `import { createServer } from "node:http";
let hits = 0;
const mode = ${JSON.stringify(mode)};
const server = createServer((req, res) => {
  hits += 1;
  if (!(mode === "retry" && hits >= 2)) return;
  const body = JSON.stringify({
    resources: ["https://ticks.bnm.farm/ticks", "https://ticks.bnm.farm/cfpb-orders"],
  });
  res.writeHead(200, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
});
server.listen(0, "127.0.0.1", () => {
  const addr = server.address();
  process.stdout.write(String(addr && typeof addr === "object" ? addr.port : "") + "\\n");
});
`,
  );
  const child = spawn(process.execPath, [file], { stdio: ["ignore", "pipe", "inherit"] });
  const port = await new Promise<string>((resolve, reject) => {
    let buf = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      const line = buf.split("\n")[0]?.trim() ?? "";
      if (/^\d+$/.test(line)) resolve(line);
    });
    child.once("error", reject);
    child.once("exit", (code) => reject(new Error(`well-known stub exited ${code} before listening`)));
  });
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    child.kill();
  }
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
  assert.match(script, /SUPERFUND_MAX_NEW_PER_PASS=6/);
  assert.match(script, /SUPERFUND_MAX_NEW_PER_PASS=4/);
  assert.match(script, /SUPERFUND_PASS_DEADLINE_MS="\$\{SUPERFUND_PASS_DEADLINE_MS:-2400000\}"/);
  assert.match(script, /parallel_skus=\(superfund-rods phmsa-orders eis-reports\)/);
  assert.match(script, /ticks-collect-\$\{sku\}\.log/);
  assert.match(script, /flock -w 60 8/);
  assert.match(script, /CFPB_ORDERS/);
  assert.match(script, /FIFRA_ORDERS/);
  assert.match(script, /FDIC_ORDERS/);
  assert.match(script, /FERC_ORDERS/);
  assert.match(script, /NCUA_ORDERS/);
  assert.match(script, /EMA_REFERRALS/);
  assert.match(script, /AIR_LETTERS/);
  assert.match(script, /untitled-letters/);
  assert.match(script, /mariners-d8/);
  assert.match(script, /mariners-d1/);
  assert.match(script, /mariners-d5/);
  assert.match(script, /mariners-d9/);
  assert.match(script, /mariners-d14/);
  assert.match(script, /mariners-d17/);
  assert.match(script, /ticks-ams\.js/);
  assert.match(script, /nationwide AMS hay\/cattle\/grain/);
  assert.match(script, /Always consider \/ticks first/);
  assert.doesNotMatch(script, /crontab -e|0 8 \*|0 6 \*/);
  assert.match(script, /Two passes: 7:45am and 7:45pm/);
  assert.match(script, /02:00-04:00 America\/Boise/);
  assert.match(script, /--list-official/);
  assert.match(script, /live well-known/);
  assert.match(script, /FCC_EB_ORDERS_PAGES/);
  assert.match(script, /FMC_ORDERS_PROCEEDINGS/);
  assert.match(script, /source-down/);
  assert.match(script, /Not a complete walk/);
  assert.match(script, /done="failed"/);
  assert.match(script, /collect failed \(exit/);
  assert.match(script, /stranger-settle-alert/, "collect path refreshes Chief stranger-settle ping");
  assert.match(script, /live-door-loop-closer/, "collect path lists empty/stale LIVE doors");
  assert.match(script, /draft-only/, "loop-closer is draft notes only");
  assert.doesNotMatch(script, /curl .* (api\.twitter|hooks\.slack|mailto:)/);
  const hayBlock = script.slice(script.indexOf("hay/cattle collect"), script.indexOf("list_official_doors"));
  assert.match(hayBlock, /collect-prices\.py/);
  assert.match(hayBlock, /ticks-ams\.js/);
  assert.ok(hayBlock.indexOf("collect-prices.py") < hayBlock.indexOf("ticks-ams.js"), "Idaho hay stays first");
  assert.ok(
    hayBlock.indexOf("ticks-ams.js") < hayBlock.indexOf("ticks_disk_snapshot"),
    "post-refresh tick count comes from the files just written, not a live manifest parse",
  );
  assert.doesNotMatch(script, /No NPDES/);
  const listBlock = script.slice(script.indexOf("list_official_doors"), script.indexOf("door_snap"));
  assert.match(listBlock, /well-known/);
  assert.match(listBlock, /retry live well-known/);
  assert.doesNotMatch(listBlock, /ticks-ams/);
  const planSrc = readFileSync(join(repoRoot, "scripts/ticks-collect-plan.py"), "utf-8");
  assert.match(planSrc, /WELL_KNOWN_ATTEMPT_TIMEOUTS = \(5, 8, 12, 15\)/);
  assert.match(planSrc, /WELL_KNOWN_BACKOFF_S = \(1\.0, 2\.0, 4\.0\)/);
  assert.match(planSrc, /TICKS_WELL_KNOWN_SKIP_PUBLIC/);
  assert.match(planSrc, /def fetch_well_known/);

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
  assert.match(dry, /official doors 1 from well-known-file/);
  assert.match(dry, /dry-run plan nationwide AMS hay\/cattle\/grain \(same \/ticks door\)/);
  assert.match(dry, /\/ticks, 611, 611, fat/);
  assert.match(dry, /\/cfpb-orders, 5, 5, thin/);
  assert.doesNotMatch(dry, /cfpb-orders skip/);
  assert.doesNotMatch(dry, /\/ferc-orders/);
  assert.ok(dry.indexOf("/ticks,") < dry.indexOf("/cfpb-orders,"), "/ticks is planned first");

  const leftoverDry = runDryCollect({
    doors: [
      {
        sku: "npdes-permits",
        snapshot: { cardCount: 5, fetchedAt: "2026-08-23T14:49:34.065Z", asOf: "2026-07-29" },
      },
    ],
    wellKnown: ["ticks", "npdes-permits", "hhs-oig-reports"],
    ticks: { tickCount: 611, fetchedAt: new Date().toISOString(), asOf: "2026-08-25" },
  });
  assert.match(leftoverDry, /official doors 2 from well-known-file/);
  assert.match(leftoverDry, /\/npdes-permits, 5, 5, thin/);
  assert.match(leftoverDry, /\/hhs-oig-reports, 0, 0, thin/);
  assert.doesNotMatch(leftoverDry, /\/ferc-orders/);

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
      {
        sku: "ema-referrals",
        snapshot: { cardCount: 14, fetchedAt: "2026-08-25T21:19:10.114Z", asOf: "2026-08-13" },
      },
      {
        sku: "fifra-orders",
        snapshot: { cardCount: 26, fetchedAt: new Date().toISOString(), asOf: "2026-08-25" },
      },
      {
        sku: "superfund-rods",
        snapshot: { cardCount: 29, fetchedAt: new Date().toISOString(), asOf: "2026-08-05" },
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
  assert.match(fatDry, /\/ema-referrals, 14, 14, thin/);
  assert.match(fatDry, /\/fifra-orders, 26, 26, fresh/);
  assert.match(fatDry, /\/superfund-rods, 29, 29, fresh/);
  assert.doesNotMatch(fatDry, /gmp grow /);
  assert.ok(fatDry.indexOf("/ticks,") < fatDry.indexOf("/gmp,"), "/ticks stays first on a fat pass");

  const dryParallelOrder = runDryCollect({
    doors: [
      {
        sku: "superfund-rods",
        snapshot: { cardCount: 29, fetchedAt: new Date().toISOString(), asOf: "2026-08-05" },
      },
      {
        sku: "gmp",
        snapshot: { cardCount: 3550, fetchedAt: new Date().toISOString(), asOf: "2026-08-11" },
      },
      {
        sku: "phmsa-orders",
        snapshot: { cardCount: 20, fetchedAt: new Date().toISOString(), asOf: "2026-08-11" },
      },
    ],
    ticks: { tickCount: 611, fetchedAt: new Date().toISOString(), asOf: "2026-08-25" },
  });
  assert.doesNotMatch(dryParallelOrder, /parallel doors/, "dry-run stays serial");
  assert.ok(
    dryParallelOrder.indexOf("/superfund-rods,") < dryParallelOrder.indexOf("/gmp,"),
    "dry-run keeps well-known order",
  );
  assert.ok(
    dryParallelOrder.indexOf("/gmp,") < dryParallelOrder.indexOf("/phmsa-orders,"),
    "dry-run does not pull later parallel doors forward",
  );

  const parallelLive = runParallelDoorProbe();
  assert.match(parallelLive.log, /parallel doors superfund-rods phmsa-orders eis-reports/);
  assert.ok(parallelLive.log.indexOf("/cfpb-orders,") < parallelLive.log.indexOf("parallel doors"));
  assert.ok(parallelLive.log.indexOf("/gmp,") > parallelLive.log.indexOf("/eis-reports,"));
  assert.ok(parallelLive.log.indexOf("/gmp,") > parallelLive.log.indexOf("/phmsa-orders,"));
  assert.ok(parallelLive.log.indexOf("/gmp,") > parallelLive.log.indexOf("/superfund-rods,"));
  for (const sku of ["superfund-rods", "phmsa-orders", "eis-reports"]) {
    const doorLog = readFileSync(join(parallelLive.root, `ticks-collect-${sku}.log`), "utf8");
    assert.match(doorLog, new RegExp(`stub-start ${sku}`));
    assert.match(doorLog, new RegExp(`parallel door ${sku}`));
  }
  const bySku = new Map<string, { start: bigint; end: bigint }>();
  for (const line of parallelLive.mark.trim().split("\n")) {
    const [kind, sku, ns] = line.split(" ");
    const row = bySku.get(sku) ?? { start: 0n, end: 0n };
    if (kind === "start") row.start = BigInt(ns);
    if (kind === "end") row.end = BigInt(ns);
    bySku.set(sku, row);
  }
  const trio = ["superfund-rods", "phmsa-orders", "eis-reports"].map((sku) => bySku.get(sku)!);
  const cfpb = bySku.get("cfpb-orders")!;
  const gmp = bySku.get("gmp")!;
  assert.ok(trio.every((row) => row.start > 0n && row.end > row.start));
  const earliestStart = trio.reduce((m, row) => (row.start < m ? row.start : m), trio[0]!.start);
  const latestStart = trio.reduce((m, row) => (row.start > m ? row.start : m), 0n);
  const earliestEnd = trio.reduce((m, row) => (row.end < m ? row.end : m), trio[0]!.end);
  const latestEnd = trio.reduce((m, row) => (row.end > m ? row.end : m), 0n);
  assert.ok(cfpb.end <= earliestStart, "doors before the group finish first");
  assert.ok(latestStart < earliestEnd, "superfund, phmsa, and eis overlap");
  assert.ok(gmp.start >= latestEnd, "a door listed between them waits until the group finishes");

  const failedDoor = runFailedDoorProbe();
  assert.match(failedDoor, /\/mariners, 40, 40, failed \(collect failed \(exit 1\)\)/);
  assert.doesNotMatch(failedDoor, /\/mariners, 40, 40, current/);

  assert.ok(
    listed !== null && listed > 5,
    "one existing official door listing exceeds 5, so grow+limit=24 would pass first-slice",
  );

  const doorSrc = join(repoRoot, "src/ticks-door.ts");
  await withWellKnownServer("retry", async (origin) => {
    const started = Date.now();
    const listedDoors = runListOfficial(origin, {
      TICKS_WELL_KNOWN_RETRIES: "3",
      TICKS_WELL_KNOWN_TIMEOUT: "0.3",
      TICKS_WELL_KNOWN_BACKOFF: "0.05",
      TICKS_WELL_KNOWN_SKIP_PUBLIC: "1",
    });
    assert.ok(Date.now() - started < 4000, "retry budget stays bounded");
    assert.match(listedDoors, /^well-known\n/);
    assert.match(listedDoors, /^cfpb-orders$/m);
    assert.doesNotMatch(listedDoors, /public-bazaar-skus/);
  });
  await withWellKnownServer("never", async (origin) => {
      const started = Date.now();
      const listedDoors = runListOfficial(
        origin,
        {
          TICKS_WELL_KNOWN_RETRIES: "2",
          TICKS_WELL_KNOWN_TIMEOUT: "0.2",
          TICKS_WELL_KNOWN_BACKOFF: "0.05",
          TICKS_WELL_KNOWN_SKIP_PUBLIC: "1",
        },
        doorSrc,
      );
      const elapsed = Date.now() - started;
      assert.ok(elapsed < 3000, `fallback must not freeze the walk (${elapsed}ms)`);
      assert.match(listedDoors, /^public-bazaar-skus\n/);
      assert.match(listedDoors, /^cfpb-orders$/m);
      assert.match(listedDoors, /^superfund-rods$/m);
      assert.match(listedDoors, /^ftc-wl$/m);
    },
  );

  const freshHay = {
    tickCount: 8692,
    fetchedAt: new Date().toISOString(),
    asOf: "2026-10-16",
  };
  await withHayOrigin(
    {
      "/ticks/manifest.json": { status: 404 },
      "/manifest.json": { status: 200, body: freshHay },
    },
    async (origin) => {
      const hayLog = runHayProbe(origin);
      assert.match(hayLog, /\/ticks, 8692, 8692, fat/, "a 404 on /ticks/manifest.json falls through to /manifest.json");
      assert.doesNotMatch(hayLog, /\/ticks, 3, 3/);
    },
  );
  await withHayOrigin(
    {
      "/ticks/manifest.json": { status: 200, body: freshHay },
      "/manifest.json": { status: 404 },
    },
    async (origin) => {
      const hayLog = runHayProbe(origin);
      assert.match(hayLog, /\/ticks, 8692, 8692, fat/, "hay check accepts /ticks/manifest.json");
    },
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
