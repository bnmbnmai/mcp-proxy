import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AMS_NATIONAL_REPORTS,
  SKIPPED_SOURCES,
  latestEsmisPdfUrl,
  mergeAmsNationalTicks,
  parseAmsReportText,
  parseReportDate,
  readAmsSnapshot,
  writeAmsSnapshot,
} from "./ticks-ams.js";
import { loadTicks, PRODUCT_ID, PRODUCT_NAME } from "./ticks-door.js";
import { paidTicksBody } from "./paid-records.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = here.endsWith("/build") || here.endsWith("\\build") || here.endsWith("/src") || here.endsWith("\\src")
  ? dirname(here)
  : here;

function fx(name: string): string {
  return readFileSync(join(repoRoot, "src/fixtures/ticks-ams", name), "utf-8");
}

function report(slug: string) {
  const found = AMS_NATIONAL_REPORTS.find((r) => r.slug === slug);
  assert.ok(found, slug);
  return found;
}

const hayCa = parseAmsReportText(
  fx("hay-california-2904.txt"),
  report("2904"),
  "https://esmis.nal.usda.gov/sites/default/release-files/th83kz35x/h702s6021/br86d3252/AMS_2904.PDF",
);
assert.equal(parseReportDate(fx("hay-california-2904.txt")), "2025-09-26");
assert.ok(hayCa.length >= 4, `expected several CA hay prints, got ${hayCa.length}`);
assert.ok(hayCa.every((row) => row.group === "hay"));
assert.ok(hayCa.every((row) => row.id.startsWith("hay.ams_2904.")));
assert.ok(!hayCa.some((row) => /organic/i.test(JSON.stringify(row))), "organic hay is not a product");
const caSupreme = hayCa.find((row) => row.id.includes("north_inter_mountains") && row.id.includes("supreme") && row.id.includes("large_square"));
assert.ok(caSupreme, "CA North Inter-Mountains supreme large square");
assert.equal(caSupreme.price, 220);
assert.equal(caSupreme.unit, "$/ton");
assert.equal(caSupreme.asOf, "2025-09-26");
assert.match(caSupreme.source, /AMS_2904/);

const hayTx = parseAmsReportText(
  fx("hay-texas-2707.txt"),
  report("2707"),
  "https://www.ams.usda.gov/mnreports/AMS_2707.pdf",
);
assert.equal(parseReportDate(fx("hay-texas-2707.txt")), "2026-08-21");
assert.ok(hayTx.length >= 3, `expected TX hay prints, got ${hayTx.length}`);
assert.ok(hayTx.every((row) => row.id.startsWith("hay.ams_2707.")));
const txAlfalfa = hayTx.find((row) => /alfalfa/i.test(row.commodity) && /premium/i.test(row.classGrade) && /small_square$/.test(row.id));
assert.ok(txAlfalfa, "TX Panhandle alfalfa premium small square");
assert.ok(txAlfalfa.price >= 13 && txAlfalfa.price <= 16.5);
assert.equal(txAlfalfa.asOf, "2026-08-21");

const cattle = parseAmsReportText(
  fx("cattle-texas-2710.txt"),
  report("2710"),
  "https://esmis.nal.usda.gov/sites/default/release-files/1r66j115k/x346g461b/cr56q004z/AMS_2710.PDF",
);
assert.equal(parseReportDate(fx("cattle-texas-2710.txt")), "2025-09-26");
assert.ok(cattle.length >= 4, `expected TX cattle prints, got ${cattle.length}`);
assert.ok(cattle.every((row) => row.group === "cattle" && row.unit === "$/cwt"));
assert.ok(!cattle.some((row) => /nov fob/i.test(row.classGrade)), "forward Nov FOB is not the current cash print");
const steer750 = cattle.find((row) => row.id.includes("feeder-steer.ml1.750lb"));
assert.ok(steer750);
assert.equal(steer750.price, 378.74);
const headlineSteer = cattle.find((row) => row.id === "cattle.ams_2710.texas.feeder-steers-ml1");
assert.ok(headlineSteer, "headline Current FOB ML1 steers");
assert.ok(headlineSteer.price > 300 && headlineSteer.price < 400);

const hayCo = parseAmsReportText(
  fx("hay-colorado-2905.txt"),
  report("2905"),
  "https://www.ams.usda.gov/mnreports/ams_2905.pdf",
);
assert.equal(parseReportDate(fx("hay-colorado-2905.txt")), "2026-08-14");
assert.ok(hayCo.length >= 2, `expected CO hay prints, got ${hayCo.length}`);
assert.ok(hayCo.every((row) => row.id.startsWith("hay.ams_2905.")));
const coGrass = hayCo.find((row) => /grass/i.test(row.commodity) && /medium_square/.test(row.id));
assert.ok(coGrass, "CO Mountains/Northwest grass medium square");
assert.equal(coGrass.price, 300);
assert.equal(coGrass.unit, "$/ton");

const cattleSe = parseAmsReportText(
  fx("cattle-southeast-2709.txt"),
  report("2709"),
  "https://www.ams.usda.gov/mnreports/ams_2709.pdf",
);
assert.equal(parseReportDate(fx("cattle-southeast-2709.txt")), "2026-08-21");
assert.ok(cattleSe.length >= 4, `expected SE cattle prints including continuation rows, got ${cattleSe.length}`);
assert.ok(cattleSe.every((row) => row.group === "cattle" && row.unit === "$/cwt"));
assert.ok(!cattleSe.some((row) => /sep fob/i.test(row.classGrade)), "forward Sep FOB is not the current cash print");
const seSteer747 = cattleSe.find((row) => row.id.includes("feeder-steer.ml12.747lb"));
assert.ok(seSteer747, "SE continuation Current FOB steer 747 lb");
assert.equal(seSteer747.price, 333.36);

const cattleSw = parseAmsReportText(
  fx("cattle-southwest-2940.txt"),
  report("2940"),
  "https://www.ams.usda.gov/mnreports/ams_2940.pdf",
);
assert.ok(cattleSw.length >= 2, `expected SW Beef/Dairy Current FOB prints, got ${cattleSw.length}`);
assert.ok(!cattleSw.some((row) => /dec del|dairy/i.test(row.classGrade)), "forward Dec DEL dairy is not the current cash print");
const swSteer = cattleSw.find((row) => row.id.includes("feeder-steer.ml23.550lb"));
assert.ok(swSteer, "SW Beef/Dairy steer ML 2-3 Current FOB");
assert.equal(swSteer.price, 362);

const grainIl = parseAmsReportText(
  fx("grain-illinois-3192.txt"),
  report("3192"),
  "https://www.ams.usda.gov/mnreports/ams_3192.pdf",
);
assert.equal(parseReportDate(fx("grain-illinois-3192.txt")), "2026-08-24");
assert.ok(grainIl.length >= 2, `expected IL grain bids, got ${grainIl.length}`);
assert.ok(grainIl.every((row) => row.group === "grain" && row.unit === "$/bu"));
const ilCorn = grainIl.find((row) => /yellow_corn/i.test(row.id));
assert.ok(ilCorn, "Illinois yellow corn Current bid");
assert.ok(ilCorn.price >= 4.6 && ilCorn.price <= 5.2);
assert.ok(!grainIl.some((row) => row.id.includes("oct")), "forward Oct-Nov grain is not the current bid");

const grainKs = parseAmsReportText(
  fx("grain-kansas-2886.txt"),
  report("2886"),
  "https://www.ams.usda.gov/mnreports/ams_2886.pdf",
);
assert.equal(parseReportDate(fx("grain-kansas-2886.txt")), "2026-08-24");
assert.ok(grainKs.length >= 2, `expected KS grain bids, got ${grainKs.length}`);
assert.ok(grainKs.every((row) => row.group === "grain" && row.id.startsWith("grain.ams_2886.")));
const ksCorn = grainKs.find((row) => /yellow_corn/i.test(row.id));
assert.ok(ksCorn, "Kansas yellow corn Current bid");
assert.ok(ksCorn.price >= 4.5 && ksCorn.price <= 5.0);
assert.ok(!grainKs.some((row) => /oct/i.test(row.id)), "forward Oct-Nov KS grain is not the current bid");

const grain = parseAmsReportText(
  fx("grain-portland-3148.txt"),
  report("3148"),
  "https://esmis.nal.usda.gov/sites/default/release-files/pk02c977h/7d27bt03r/gq67mr67j/AMS_3148.PDF",
);
assert.equal(parseReportDate(fx("grain-portland-3148.txt")), "2025-09-26");
assert.ok(grain.length >= 3, `expected Portland grain bids, got ${grain.length}`);
assert.ok(grain.every((row) => row.group === "grain" && row.unit === "$/bu"));
const sww = grain.find((row) => /soft_white_wheat/i.test(row.id));
assert.ok(sww);
assert.equal(sww.price, 5.9);
const hrw = grain.find((row) => /hard_red_winter/i.test(row.id) && /ordinary/i.test(row.id));
assert.ok(hrw);
assert.ok(hrw.price >= 5.35 && hrw.price <= 5.45);

const listing = latestEsmisPdfUrl(fx("esmis-california-listing.html"), "2904");
assert.equal(
  listing,
  "https://esmis.nal.usda.gov/sites/default/release-files/th83kz35x/h702s6021/br86d3252/AMS_2904.PDF",
);

const dir = mkdtempSync(join(tmpdir(), "ticks-ams-"));
const snap = writeAmsSnapshot(
  {
    ok: true,
    product: "idaho-hay-feeder-ticks",
    fetchedAt: "2026-08-24T16:00:00Z",
    asOf: "2026-08-21",
    tickCount: hayTx.length,
    rows: hayTx,
    failed: [],
    sources: ["AMS_2707 Texas Direct Hay"],
  },
  dir,
);
assert.equal(readAmsSnapshot(dir)?.tickCount, hayTx.length);
assert.ok(snap.endsWith("snapshot.json"));

const idaho = {
  ok: true as const,
  product: "idaho-hay-feeder-ticks" as const,
  sources: ["Twin Falls", "Blackfoot", "AMS_3056 hay", "AMS_3059 NW Direct"],
  status: "ok" as const,
  reason: null,
  fetchedAt: "2026-08-12T00:00:00Z",
  ticks: [
    {
      id: "cattle-tf-feeder-steer",
      group: "cattle",
      market: "Twin Falls Livestock Commission (Wednesday auction)",
      price: 400.2,
      asOf: "2026-08-12",
      source: "Twin Falls Livestock Commission market report",
      sourceUrl: "https://example.invalid/tf",
    },
  ],
  failed: [],
  history: { points: [], emptyReports: [], series: [] },
};
const merged = mergeAmsNationalTicks(idaho, readAmsSnapshot(dir));
assert.equal(merged.product, "idaho-hay-feeder-ticks");
assert.equal(merged.ticks[0]?.id, "cattle-tf-feeder-steer");
assert.equal((merged.ticks[0] as { price?: number }).price, 400.2);
assert.ok(merged.ticks.some((row) => String((row as { id?: string }).id ?? "").startsWith("hay.ams_2707.")));
assert.ok(merged.sources.includes("Twin Falls"));
assert.ok(merged.sources.includes("AMS_3056 hay"));
assert.ok(merged.sources.includes("AMS_2707 Texas Direct Hay"));
assert.equal(merged.status, "ok");
assert.ok(merged.ticks.length > idaho.ticks.length);

const emptyMerged = mergeAmsNationalTicks(
  { ...idaho, ticks: [], status: "stale" as const, reason: "empty" },
  readAmsSnapshot(dir),
);
assert.equal(emptyMerged.status, "ok");
assert.equal(emptyMerged.reason, null);

const slugs = AMS_NATIONAL_REPORTS.map((r) => r.slug);
assert.equal(new Set(slugs).size, slugs.length);
assert.ok(slugs.length > 10, `expected leftover nationwide slice, got ${slugs.length}`);
assert.ok(
  ["2904", "2707", "2885", "2935", "2710", "3097", "3098", "3148", "3046", "3223"].every((s) => slugs.includes(s)),
  "keep first nationwide slice",
);
assert.ok(
  ["2905", "2769", "3236", "3183", "2807", "2929", "3905", "2906", "2709", "2912", "3192", "3225", "2932"].every((s) =>
    slugs.includes(s),
  ),
  "leftover Direct Hay / Direct Cattle / Grain POS slugs",
);
assert.ok(
  ["2960", "2886", "2711", "2851", "3147", "3878", "2771", "2887"].every((s) => slugs.includes(s)),
  "leftover official Grain POS slugs from AMS state-grain listing",
);
assert.ok(!slugs.includes("3045"), "Minneapolis Daily Basis is not POS");
assert.ok(AMS_NATIONAL_REPORTS.every((r) => !["3056", "3057", "3058", "3059", "2914"].includes(r.slug)));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "marsapi"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "nass-quick-stats"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "wasde-psd-esr"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "SJ_LS850"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "hay-auction-barns"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "no-il-ga-direct-hay"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "ams_3045_minneapolis_basis"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "cattle-auction-summaries"));
assert.equal(PRODUCT_ID, "idaho-hay-feeder-ticks");
assert.equal(PRODUCT_NAME, "Idaho + nationwide USDA AMS hay/cattle/grain");

mkdirSync(join(dir, "empty"), { recursive: true });
assert.equal(mergeAmsNationalTicks(idaho, null).ticks.length, 1);

const prevEnv = {
  TICKS_DIR: process.env.TICKS_DIR,
  TICKS_PATH: process.env.TICKS_PATH,
  TICKS_AMS_DIR: process.env.TICKS_AMS_DIR,
  FARM_DATA_DIR: process.env.FARM_DATA_DIR,
};
const isolatedBoard = mkdtempSync(join(tmpdir(), "ticks-ams-board-"));
writeFileSync(
  join(isolatedBoard, "board.json"),
  JSON.stringify({
    fetchedAt: "2026-08-12T00:00:00Z",
    rows: idaho.ticks,
    failed: [],
    history: { points: [], emptyReports: [], series: [] },
  }),
);
process.env.TICKS_DIR = isolatedBoard;
process.env.TICKS_AMS_DIR = dir;
delete process.env.TICKS_PATH;
delete process.env.FARM_DATA_DIR;
try {
  const loaded = loadTicks();
  assert.equal(loaded.product, "idaho-hay-feeder-ticks");
  assert.ok(loaded.ticks.some((row) => (row as { id?: string }).id === "cattle-tf-feeder-steer"));
  assert.ok(loaded.ticks.some((row) => String((row as { id?: string }).id ?? "").startsWith("hay.ams_2707.")));
  const paid = paidTicksBody(loaded);
  assert.ok(paid.records.some((row) => row.id === "cattle-tf-feeder-steer"));
  assert.ok(paid.records.some((row) => row.id.startsWith("hay.ams_2707.")));
  assert.equal(paid.records.find((row) => row.id.startsWith("hay.ams_2707."))?.type, "hay");
  assert.ok(paid.asOf);
} finally {
  for (const [k, v] of Object.entries(prevEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

console.log("ticks-ams parse+merge tests ok");
console.log(
  JSON.stringify({
    hayCalifornia: hayCa.length,
    hayTexas: hayTx.length,
    hayColorado: hayCo.length,
    cattleTexas: cattle.length,
    cattleSoutheast: cattleSe.length,
    grainPortland: grain.length,
    grainIllinois: grainIl.length,
    grainKansas: grainKs.length,
    mergedTickCount: merged.ticks.length,
    keptTwinFalls: true,
  }),
);
