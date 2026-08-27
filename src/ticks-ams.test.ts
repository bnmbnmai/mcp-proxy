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
  officialPdfCandidateOrder,
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
const caSupreme = hayCa.find((row) => row.id.includes("north_inter_mountains") && row.id.includes("supreme") && row.id.includes("large_square") && !row.id.includes("organic"));
assert.ok(caSupreme, "CA North Inter-Mountains supreme large square");
assert.equal(caSupreme.price, 220);
const caOrganic = hayCa.find((row) => row.id.includes("organic") && row.id.includes("supreme"));
assert.ok(caOrganic, "CA North Inter-Mountains organic supreme");
assert.equal(caOrganic.price, 300);
assert.match(caOrganic.classGrade, /organic/i);
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

const wool = parseAmsReportText(
  fx("wool-national-2911.txt"),
  report("2911"),
  "https://www.ams.usda.gov/mnreports/ams_2911.pdf",
);
assert.equal(parseReportDate(fx("wool-national-2911.txt")), "2026-08-21");
assert.equal(wool.length, 12, `expected 11 micron prints + merino, got ${wool.length}`);
assert.ok(wool.every((row) => row.group === "wool" && row.unit === "$/lb"));
assert.ok(wool.every((row) => row.id.startsWith("wool.ams_2911.")));
assert.ok(wool.every((row) => row.asOf === "2026-08-21"));
assert.ok(wool.every((row) => row.sourceUrl.includes("ams_2911")));
const micron17 = wool.find((row) => row.id === "wool.ams_2911.awex.17_micron");
assert.ok(micron17, "AWEX 17 micron");
assert.equal(micron17.price, 8.09);
assert.equal(micron17.lo, 6.07);
assert.equal(micron17.hi, 6.88);
assert.match(micron17.label, /17 micron/i);
assert.match(micron17.market, /Charleston/i);
const micron23 = wool.find((row) => row.id.includes("23_micron"));
assert.equal(micron23, undefined, "empty 23 micron has no U.S.$ print");
assert.ok(!wool.some((row) => row.id.includes("24_micron")), "empty 24 micron has no U.S.$ print");
const merino = wool.find((row) => row.id === "wool.ams_2911.australia.merino_clippings");
assert.ok(merino, "Merino clippings");
assert.equal(merino.price, 3.71);
assert.equal(merino.lo, 2.78);
assert.equal(merino.hi, 3.15);
assert.ok(!wool.some((row) => /emi|exch|bales|greasy/i.test(row.id + row.label)));
assert.ok(!wool.some((row) => /domestic/i.test(row.id)), "no invented domestic wool when AMS printed no trades");

const hayAuction = parseAmsReportText(
  fx("hay-arthur-3652.txt"),
  report("3652"),
  "https://www.ams.usda.gov/mnreports/ams_3652.pdf",
);
assert.equal(parseReportDate(fx("hay-arthur-3652.txt")), "2026-08-17");
assert.ok(hayAuction.length >= 3, `expected Arthur hay-auction prints, got ${hayAuction.length}`);
assert.ok(hayAuction.every((row) => row.id.startsWith("hay.ams_3652.") && row.asOf === "2026-08-17"));
const arthurPrem = hayAuction.find((row) => row.id.includes("alfalfa.premium.small_square"));
assert.ok(arthurPrem, "Arthur alfalfa premium small square");
assert.equal(arthurPrem.unit, "$/bale");
assert.equal(arthurPrem.price, 6.5);
const arthurGoodMix = hayAuction.find((row) => /clover/i.test(row.commodity) && row.price > 2 && row.price < 3);
assert.ok(arthurGoodMix, "Arthur clover/grass mix good avg 2.32");
assert.equal(arthurGoodMix.price, 2.32);

const cattleAuction = parseAmsReportText(
  fx("cattle-montana-auction-1778.txt"),
  report("1778"),
  "https://www.ams.usda.gov/mnreports/ams_1778.pdf",
);
assert.equal(parseReportDate(fx("cattle-montana-auction-1778.txt")), "2026-08-22");
assert.ok(cattleAuction.length >= 5, `expected MT weekly auction feeder prints, got ${cattleAuction.length}`);
assert.ok(cattleAuction.every((row) => row.group === "cattle" && row.unit === "$/cwt"));
assert.ok(cattleAuction.every((row) => row.id.startsWith("cattle.ams_1778.")));
const mtSteer484 = cattleAuction.find((row) => row.id.includes("feeder-steer.ml1.484lb"));
assert.ok(mtSteer484, "MT weekly ML1 steer 484 lb");
assert.equal(mtSteer484.price, 456.82);
const mtHeifer625 = cattleAuction.find((row) => row.id.includes("feeder-heifer.ml1.625lb"));
assert.ok(mtHeifer625);
assert.equal(mtHeifer625.price, 380);
assert.ok(!cattleAuction.some((row) => row.price === 200), "dairy steers are not the feeder print");
assert.ok(!cattleAuction.some((row) => row.price === 169.49), "slaughter cows are not the feeder print");
const mtHeadline = cattleAuction.find((row) => row.id === "cattle.ams_1778.montana_weekly.feeder-steers-ml1");
assert.ok(mtHeadline, "MT weekly headline ML1 steers");

const dairyWeekly = parseAmsReportText(
  fx("dairy-weekly-2998.txt"),
  report("2998"),
  "https://www.ams.usda.gov/mnreports/dywweeklyreport.pdf",
);
assert.equal(parseReportDate(fx("dairy-weekly-2998.txt")), "2026-08-21");
assert.ok(dairyWeekly.length >= 5, `expected dairy weekly prints, got ${dairyWeekly.length}`);
assert.ok(dairyWeekly.every((row) => row.group === "dairy" && row.id.startsWith("dairy.ams_2998.")));
const butterWk = dairyWeekly.find((row) => row.id.includes("butter.grade_aa"));
assert.ok(butterWk);
assert.equal(butterWk.price, 1.451);
assert.equal(butterWk.unit, "$/lb");
const barrelWk = dairyWeekly.find((row) => row.id.includes("cheese.barrels"));
assert.ok(barrelWk);
assert.equal(barrelWk.price, 1.565);
const classI = dairyWeekly.find((row) => row.id.includes("class_i"));
assert.ok(classI);
assert.equal(classI.price, 17.04);
assert.equal(classI.unit, "$/cwt");

const dairyDry = parseAmsReportText(
  fx("dairy-dry-1598.txt"),
  report("1598"),
  "https://www.ams.usda.gov/mnreports/ams_1598.pdf",
);
assert.equal(parseReportDate(fx("dairy-dry-1598.txt")), "2026-08-21");
assert.ok(dairyDry.length >= 4, `expected dry-product prints, got ${dairyDry.length}`);
const ndmEast = dairyDry.find((row) => /ndm|nonfat/i.test(row.id) && /central_and_east|low_medium/i.test(row.id));
assert.ok(ndmEast, "NDM Central and East");
assert.equal(ndmEast.lo, 1.6);
assert.equal(ndmEast.hi, 1.9);

const dairyFluid = parseAmsReportText(
  fx("dairy-fluid-west-1102.txt"),
  report("1102"),
  "https://www.ams.usda.gov/mnreports/ams_1102.pdf",
);
assert.equal(parseReportDate(fx("dairy-fluid-west-1102.txt")), "2026-08-28");
assert.ok(dairyFluid.length >= 2, `expected West cream butterfat prints, got ${dairyFluid.length}`);
const creamAll = dairyFluid.find((row) => row.id.includes("all_classes"));
assert.ok(creamAll);
assert.equal(creamAll.lo, 1.6686);
assert.equal(creamAll.hi, 1.8863);
assert.ok(!dairyFluid.some((row) => /multiple/i.test(row.classGrade)), "cream multiples are not $/lb butterfat");

const dairyOrg = parseAmsReportText(
  fx("dairy-organic-2997.txt"),
  report("2997"),
  "https://www.ams.usda.gov/mnreports/dybdairyorganic.pdf",
);
assert.equal(parseReportDate(fx("dairy-organic-2997.txt")), "2026-08-21");
assert.ok(dairyOrg.length >= 4, `expected organic advertised dairy, got ${dairyOrg.length}`);
const orgMilk = dairyOrg.find((row) => /half_gal|milk/i.test(row.id));
assert.ok(orgMilk, "organic half-gal milk ad");
assert.equal(orgMilk.price, 4.16);
assert.ok(!dairyOrg.some((row) => row.price === 9.41), "n.a. this-week butter 1 lb is not last-week's price");

const hogs = parseAmsReportText(
  fx("hog-summary-2872.txt"),
  report("2872"),
  "https://www.ams.usda.gov/mnreports/lsddhps.pdf",
);
assert.equal(parseReportDate(fx("hog-summary-2872.txt")), "2026-08-26");
assert.ok(hogs.length >= 8, `expected hog/pork summary prints, got ${hogs.length}`);
assert.ok(hogs.every((row) => row.group === "hogs" && row.unit === "$/cwt"));
const hogNat = hogs.find((row) => row.id === "hogs.ams_2872.national.negotiated.carcass");
assert.ok(hogNat);
assert.equal(hogNat.price, 90.75);
assert.equal(hogNat.lo, 83);
assert.equal(hogNat.hi, 91.5);
const cutout = hogs.find((row) => row.id.includes("pork.cutout"));
assert.ok(cutout);
assert.equal(cutout.price, 95.55);
assert.ok(!hogs.some((row) => row.price === 0 || Number.isNaN(row.price)), "confidential * is not a tick");

const orgGrain = parseAmsReportText(
  fx("organic-grain-3802.txt"),
  report("3802"),
  "https://www.ams.usda.gov/mnreports/ams_3802.pdf",
);
assert.equal(parseReportDate(fx("organic-grain-3802.txt")), "2026-08-14");
const orgCorn = orgGrain.find((row) => row.group === "grain" && /yellow_corn/i.test(row.id) && /national/i.test(row.id));
assert.ok(orgCorn, "organic national spot corn");
assert.equal(orgCorn.price, 13.85);
assert.equal(orgCorn.unit, "$/bu");
const orgHay = orgGrain.find((row) => row.group === "hay" && /alfalfa/i.test(row.id));
assert.ok(orgHay, "organic alfalfa when the same 3802 family prints hay");
assert.equal(orgHay.price, 300);
assert.ok(!orgGrain.some((row) => row.price === 920), "forward-contract meal is not a spot tick");

const nyFruit = parseAmsReportText(
  fx("produce-ny-fruit-2314.txt"),
  report("2314"),
  "https://www.ams.usda.gov/mnreports/nx_fv010.pdf",
);
assert.equal(parseReportDate(fx("produce-ny-fruit-2314.txt")), "2026-08-27");
assert.ok(nyFruit.length >= 4, `expected NY terminal fruit prints, got ${nyFruit.length}`);
assert.ok(nyFruit.every((row) => row.group === "produce" && row.id.startsWith("produce.ams_2314.")));
const bbCa = nyFruit.find((row) => /blackberr/i.test(row.commodity) && /california/i.test(row.id));
assert.ok(bbCa);
assert.equal(bbCa.lo, 36);
assert.equal(bbCa.hi, 38);
const straw = nyFruit.find((row) => /strawberr/i.test(row.commodity));
assert.ok(straw);
assert.equal(straw.price, 24, "use mostly 24.00, not holdovers 12-14");
assert.ok(!nyFruit.some((row) => row.price === 13 || (row.lo === 12 && row.hi === 14)), "holdovers are not the print");

const liveFirst = officialPdfCandidateOrder("2904", [
  "https://esmis.nal.usda.gov/sites/default/release-files/th83kz35x/h702s6021/br86d3252/AMS_2904.PDF",
]);
assert.equal(liveFirst[0], "https://www.ams.usda.gov/mnreports/ams_2904.pdf");
assert.ok(liveFirst.some((u) => u.includes("esmis.nal.usda.gov")));
assert.ok(liveFirst.findIndex((u) => u.includes("esmis")) > liveFirst.findIndex((u) => u.includes("ams.usda.gov/mnreports")));
const dairyPdfs = officialPdfCandidateOrder("2998", [], ["dywweeklyreport"]);
assert.ok(dairyPdfs.some((u) => /dywweeklyreport\.pdf/i.test(u)), "weekly dairy uses official dywweeklyreport stem");
assert.ok(dairyPdfs[0].includes("www.ams.usda.gov/mnreports"));

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
assert.ok(slugs.includes("2911"), "National Wool Review leftover");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2911")?.group, "wool");
assert.ok(
  ["3652", "2245", "2246", "1716", "1650", "2132", "1778", "2039", "2106", "1775"].every((s) => slugs.includes(s)),
  "official AMS hay-auction barns + PNW/mountain cattle auctions",
);
assert.ok(
  ["2998", "1598", "1102", "2997", "2872", "3802", "2314", "2315", "2306", "2290"].every((s) => slugs.includes(s)),
  "official AMS dairy / hog / organic grain / national terminal-market slugs",
);
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2998")?.group, "dairy");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2872")?.group, "hogs");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2314")?.group, "produce");
assert.ok(AMS_NATIONAL_REPORTS.every((r) => !["3056", "3057", "3058", "3059", "2914"].includes(r.slug)));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "marsapi"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "nass-quick-stats"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "wasde-psd-esr"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "SJ_LS850"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "no-il-ga-direct-hay"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "ams_3045_minneapolis_basis"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "se-individual-cattle-barns"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "facebook-private-barns"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "gis-echo-family-herd"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "new-x402-door"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "ams_2911_marsapi"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "lmr-hog-pdfs"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "cme-cash-trading-doors"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "sheep-goats"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "poultry-eggs"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "cotton-rice"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "if_fv130_already"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "mx_fv010_discontinued"));
assert.ok(!slugs.includes("mx_fv010") && !slugs.includes("mx_fv020"), "discontinued Mexico City terminal is not a slug");
assert.ok(!slugs.includes("2513") && !slugs.includes("2675"), "LMR hog PDFs are not catalog slugs");
assert.ok(slugs.includes("bh_fv020") && slugs.includes("na_fv020"), "Boston/Philadelphia terminal vegetables");
assert.equal(PRODUCT_ID, "idaho-hay-feeder-ticks");
assert.equal(PRODUCT_NAME, "Idaho + nationwide USDA AMS hay/cattle/grain/dairy/hogs/produce");

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
  const woolSnap = writeAmsSnapshot(
    {
      ok: true,
      product: "idaho-hay-feeder-ticks",
      fetchedAt: "2026-08-25T16:00:00Z",
      asOf: "2026-08-21",
      tickCount: hayTx.length + wool.length,
      rows: [...hayTx, ...wool],
      failed: [],
      sources: ["AMS_2707 Texas Direct Hay", "AMS_2911 National Wool Review"],
    },
    dir,
  );
  assert.ok(woolSnap.endsWith("snapshot.json"));
  process.env.TICKS_AMS_DIR = dir;
  const loadedWool = loadTicks();
  const paidWool = paidTicksBody(loadedWool);
  assert.ok(paidWool.records.some((row) => row.id.startsWith("hay.ams_2707.")));
  assert.equal(paidWool.records.find((row) => row.id.startsWith("hay.ams_2707."))?.type, "hay");
  const woolRec = paidWool.records.find((row) => row.id === "wool.ams_2911.awex.17_micron");
  assert.ok(woolRec, "paid records include AMS_2911 wool");
  assert.equal(woolRec.type, "wool");
  assert.ok(paid.asOf);
  writeAmsSnapshot(
    {
      ok: true,
      product: "idaho-hay-feeder-ticks",
      fetchedAt: "2026-08-27T16:00:00Z",
      asOf: "2026-08-26",
      tickCount: hayCa.length + dairyOrg.length + orgGrain.length,
      rows: [...hayCa, ...dairyOrg, ...orgGrain],
      failed: [],
      sources: ["AMS_2904 California Direct Hay", "AMS_2997 Organic Dairy Market News", "AMS_3802 National Organic Grain"],
    },
    dir,
  );
  process.env.TICKS_AMS_DIR = dir;
  const loadedOrg = loadTicks();
  const paidOrg = paidTicksBody(loadedOrg);
  assert.ok(paidOrg.records.some((row) => row.id.includes("organic") && row.id.startsWith("hay.ams_2904.")));
  assert.ok(paidOrg.records.some((row) => row.id.startsWith("dairy.ams_2997.")));
  assert.ok(paidOrg.records.some((row) => row.id.startsWith("grain.ams_3802.")));
  writeAmsSnapshot(
    {
      ok: true,
      product: "idaho-hay-feeder-ticks",
      fetchedAt: "2026-08-27T18:00:00Z",
      asOf: "2026-08-26",
      tickCount: dairyWeekly.length + hogs.length + 1,
      rows: [
        ...dairyWeekly,
        ...hogs,
        {
          id: "hay.ams_3056.idaho.alfalfa.premium.large_square",
          group: "hay",
          commodity: "Alfalfa",
          label: "Idaho alfalfa premium large square",
          market: "Idaho Direct Hay",
          classGrade: "Premium, Large Square",
          unit: "$/ton",
          price: 210,
          asOf: "2026-08-21",
          source: "AMS_3056 hay",
          sourceUrl: "https://www.ams.usda.gov/mnreports/ams_3056.pdf",
          reportDate: "2026-08-21",
          series: "hay.ams_3056.idaho.alfalfa.premium.large_square",
        },
      ],
      failed: [],
      sources: ["AMS_2998 Dairy Market News weekly", "AMS_2872 National hog/pork summary", "AMS_3056 hay"],
    },
    dir,
  );
  process.env.TICKS_AMS_DIR = dir;
  const paidComp = paidTicksBody(loadTicks());
  const comps = paidComp.composites ?? [];
  assert.ok(comps.some((row) => row.id === "composite.pnw.alfalfa.ton" && row.price === 210 && row.sourceCount === 1));
  assert.ok(comps.some((row) => row.id === "composite.us.feeder_steer.cwt"));
  assert.ok(comps.some((row) => row.id === "composite.us.dairy.class_i.cwt" && row.price === 17.04));
  const hogCarcass = comps.find((row) => row.id === "composite.us.hogs.negotiated_carcass.cwt");
  assert.ok(hogCarcass);
  assert.equal(hogCarcass.sourceCount, 2);
  assert.equal(hogCarcass.price, 90.735);
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
    woolNational: wool.length,
    hayArthurAuction: hayAuction.length,
    cattleMontanaAuction: cattleAuction.length,
    dairyWeekly: dairyWeekly.length,
    dairyDry: dairyDry.length,
    dairyFluidWest: dairyFluid.length,
    dairyOrganicAds: dairyOrg.length,
    hogsSummary: hogs.length,
    organicGrain: orgGrain.length,
    nyTerminalFruit: nyFruit.length,
    hayCaliforniaOrganic: hayCa.filter((row) => row.id.includes("organic")).length,
    mergedTickCount: merged.ticks.length,
    keptTwinFalls: true,
  }),
);
