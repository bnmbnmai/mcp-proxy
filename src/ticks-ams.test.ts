import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AMS_LEFTOVER_REPORTS,
  AMS_LEFTOVER_SLUGS,
  AMS_NATIONAL_REPORTS,
  SKIPPED_SOURCES,
  latestEsmisPdfUrl,
  mergeAmsNationalTicks,
  mergeFailedAmsSlugs,
  mergePartialAmsSnapshot,
  officialPdfCandidateOrder,
  parseAmsReportText,
  parseReportDate,
  readAmsSnapshot,
  writeAmsSnapshot,
} from "./ticks-ams.js";
import { TICKS_MANIFEST_SAMPLE_IDS, selectTicksManifestSamples } from "./shop-sample.js";
import { buildTicksManifest, loadTicks, PRODUCT_ID, PRODUCT_NAME, PRODUCT_PUBLIC_ID } from "./ticks-door.js";
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
assert.ok(!cattleAuction.some((row) => row.price === 200 && /feeder-steer/.test(row.id)), "dairy steers are not the feeder print");
assert.ok(cattleAuction.some((row) => row.id.includes("dairy-steer") && row.price === 200), "MT dairy steers stay as dairy-steer");
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
const weeklyWithTable = parseAmsReportText(
  `${fx("dairy-weekly-2998.txt")}\n${fx("dairy-weekly-2998-class-table.txt")}`,
  report("2998"),
  "https://www.ams.usda.gov/mnreports/dywweeklyreport.pdf",
);
assert.equal(weeklyWithTable.find((row) => row.id.includes("class_i"))?.price, 17.04);
assert.equal(weeklyWithTable.find((row) => row.id.endsWith(".class_ii"))?.price, 21.89);
assert.equal(weeklyWithTable.find((row) => row.id.endsWith(".class_iii"))?.price, 15.52);
assert.equal(weeklyWithTable.find((row) => row.id.endsWith(".class_iv"))?.price, 18.34);

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

const ndpsr = parseAmsReportText(
  fx("dairy-ndpsr-2993.txt"),
  report("2993"),
  "https://www.ams.usda.gov/mnreports/dywdairyproductssales.pdf",
);
assert.equal(parseReportDate(fx("dairy-ndpsr-2993.txt")), "2026-08-29");
assert.ok(ndpsr.length >= 4, `expected NDPSR weighted prints, got ${ndpsr.length}`);
assert.ok(ndpsr.every((row) => row.group === "dairy" && row.unit === "$/lb"));
assert.equal(ndpsr.find((row) => row.id.includes("butter"))?.price, 1.5143);
assert.equal(ndpsr.find((row) => row.id.includes("cheese_blocks"))?.price, 1.614);
assert.equal(ndpsr.find((row) => row.id.includes("dry_whey"))?.price, 0.653);
assert.equal(ndpsr.find((row) => row.id.includes("ndm"))?.price, 1.676);

const retail = parseAmsReportText(
  fx("dairy-retail-2995.txt"),
  report("2995"),
  "https://www.ams.usda.gov/mnreports/dybretail.pdf",
);
assert.ok(retail.length >= 8, `expected national grocery dairy ads, got ${retail.length}`);
assert.ok(retail.every((row) => row.group === "dairy" && row.unit === "$/pkg"));
const convCheese = retail.find((row) => row.id.includes("conventional") && /shred/i.test(row.id) && /6_8/i.test(row.id));
assert.ok(convCheese, "conventional 6-8 oz shred");
assert.equal(convCheese.price, 2.55);
assert.ok(retail.some((row) => row.id.includes("organic")), "organic advertised dairy stays on the same table");

const chickenAds = parseAmsReportText(
  fx("retail-chicken-2756.txt"),
  report("2756"),
  "https://www.ams.usda.gov/mnreports/ams_2756.pdf",
);
assert.equal(parseReportDate(fx("retail-chicken-2756.txt")), "2026-09-18");
assert.ok(chickenAds.length >= 20, `expected national chicken grocery ads, got ${chickenAds.length}`);
assert.ok(chickenAds.every((row) => row.group === "dairy" && row.id.startsWith("dairy.ams_2756.") && (row.unit === "$/lb" || row.unit === "$/each")));
assert.ok(chickenAds.every((row) => row.asOf === "2026-09-18"));
const fryer = chickenAds.find((row) => row.id === "dairy.ams_2756.whole.whole_bagged_fryer.conventional.fresh");
assert.ok(fryer, "national conventional whole bagged fryer");
assert.equal(fryer.price, 1.7);
assert.match(fryer.classGrade, /844/);
const breastAd = chickenAds.find((row) => row.id === "dairy.ams_2756.parts.breast_boneless_skinless_regular.conventional.fresh");
assert.ok(breastAd, "national conventional boneless/skinless breast");
assert.equal(breastAd.price, 2.46);
assert.ok(!chickenAds.some((row) => row.price === 1.4 && row.id.includes("whole_bagged_fryer.conventional")), "previous-week fryer reprint is not a tick");
assert.ok(!chickenAds.some((row) => /northeast|southeast|midwest/i.test(row.id)), "regional grocery pages are not ticks");
const chickenAdsMissing = parseAmsReportText(
  fx("retail-chicken-2756.txt").replace(/Whole Bagged Fryer\s+Conventional\s+Fresh\s+844[\s\S]*?\n/, ""),
  report("2756"),
  "https://www.ams.usda.gov/mnreports/ams_2756.pdf",
);
assert.equal(chickenAdsMissing.length, 0, "fail-closed when a required current-week chicken grocery print is missing");

const eggAds = parseAmsReportText(
  fx("retail-eggs-2757.txt"),
  report("2757"),
  "https://www.ams.usda.gov/mnreports/ams_2757.pdf",
);
assert.equal(parseReportDate(fx("retail-eggs-2757.txt")), "2026-09-18");
assert.ok(eggAds.length >= 10, `expected national egg grocery ads, got ${eggAds.length}`);
assert.ok(eggAds.every((row) => row.group === "dairy" && row.id.startsWith("dairy.ams_2757.") && row.unit === "$/carton"));
const largeWhite = eggAds.find((row) => row.id === "dairy.ams_2757.shell_egg.large_white_12.conventional.fresh");
assert.ok(largeWhite, "national conventional large white 12");
assert.equal(largeWhite.price, 1.42);
const largeBrownCf = eggAds.find((row) => row.id === "dairy.ams_2757.shell_egg.large_brown_12.cage_free.fresh");
assert.ok(largeBrownCf, "national cage-free large brown 12");
assert.equal(largeBrownCf.price, 4.14);
assert.ok(!eggAds.some((row) => row.price === 0.97 && row.id.includes("large_white_12.conventional")), "previous-week egg reprint is not a tick");

const turkeyAds = parseAmsReportText(
  fx("retail-turkey-2867.txt"),
  report("2867"),
  "https://www.ams.usda.gov/mnreports/ams_2867.pdf",
);
assert.ok(turkeyAds.length >= 8, `expected national turkey grocery ads, got ${turkeyAds.length}`);
const groundTurkey = turkeyAds.find((row) => row.id === "dairy.ams_2867.ground.ground_turkey_93_1_2_lbs.conventional.fresh");
assert.ok(groundTurkey, "national conventional 93% ground turkey");
assert.equal(groundTurkey.price, 4.71);

const porkAds = parseAmsReportText(
  fx("retail-pork-2868.txt"),
  report("2868"),
  "https://www.ams.usda.gov/mnreports/ams_2868.pdf",
);
assert.ok(porkAds.length >= 20, `expected national pork grocery ads, got ${porkAds.length}`);
const hamSteak = porkAds.find((row) => row.id === "dairy.ams_2868.ham.ham_steak.conventional.fresh");
assert.ok(hamSteak, "national conventional ham steak");
assert.equal(hamSteak.price, 5.1);

const beefAds = parseAmsReportText(
  fx("retail-beef-3228.txt"),
  report("3228"),
  "https://www.ams.usda.gov/mnreports/ams_3228.pdf",
);
assert.ok(beefAds.length >= 20, `expected national beef grocery ads, got ${beefAds.length}`);
const chuckRoast = beefAds.find((row) => row.id === "dairy.ams_3228.chuck.chuck_roast_boneless_regular.conventional.fresh");
assert.ok(chuckRoast, "national conventional boneless chuck roast");
assert.equal(chuckRoast.price, 7.82);

const lambAds = parseAmsReportText(
  fx("retail-lamb-3229.txt"),
  report("3229"),
  "https://www.ams.usda.gov/mnreports/ams_3229.pdf",
);
assert.ok(lambAds.length >= 4, `expected national lamb grocery ads, got ${lambAds.length}`);
const loinChops = lambAds.find((row) => row.id === "dairy.ams_3229.loin.loin_chops_regular.antibiotic_free.fresh");
assert.ok(loinChops, "national antibiotic-free loin chops");
assert.equal(loinChops.price, 10.87);

const vealAds = parseAmsReportText(
  fx("retail-veal-3796.txt"),
  report("3796"),
  "https://www.ams.usda.gov/mnreports/ams_3796.pdf",
);
assert.equal(vealAds.length, 2, `expected lightly-tested veal grocery ads, got ${vealAds.length}`);
const vealBreast = vealAds.find((row) => row.id === "dairy.ams_3796.breast.breast_regular.conventional.fresh");
assert.ok(vealBreast, "national conventional veal breast");
assert.equal(vealBreast.price, 9.99);

const produceAds = parseAmsReportText(
  fx("retail-specialty-crops-3324.txt"),
  report("3324"),
  "https://www.ams.usda.gov/mnreports/fvwretail.pdf",
);
assert.equal(parseReportDate(fx("retail-specialty-crops-3324.txt")), "2026-09-18");
assert.ok(produceAds.length >= 40, `expected national specialty-crops grocery ads, got ${produceAds.length}`);
assert.ok(produceAds.every((row) => row.group === "produce" && row.id.startsWith("produce.ams_3324.")));
const honeycrisp = produceAds.find((row) => row.id === "produce.ams_3324.conventional.apples.honeycrisp.per_lb");
assert.ok(honeycrisp, "national conventional Honeycrisp per lb");
assert.equal(honeycrisp.price, 2.26);
const bananas = produceAds.find((row) => row.id === "produce.ams_3324.conventional.bananas.per_lb");
assert.ok(bananas, "national conventional bananas per lb");
assert.equal(bananas.price, 0.65);
assert.ok(produceAds.some((row) => row.id.includes("organic")), "organic advertised produce stays on the same table");
assert.ok(!produceAds.some((row) => row.price === 2.12 && row.id.includes("honeycrisp")), "last-week Honeycrisp reprint is not a tick");
const produceAdsMissing = parseAmsReportText(
  fx("retail-specialty-crops-3324.txt").replace(/Apples\s+Honeycrisp\s+per lb\s+5,195[\s\S]*?\n/, ""),
  report("3324"),
  "https://www.ams.usda.gov/mnreports/fvwretail.pdf",
);
assert.equal(produceAdsMissing.length, 0, "fail-closed when a required current-week produce grocery print is missing");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2756")?.group, "dairy");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "3324")?.group, "produce");
assert.deepEqual(AMS_NATIONAL_REPORTS.find((r) => r.slug === "3324")?.pdfNames, ["fvwretail"]);

const cotton = parseAmsReportText(
  fx("cotton-weekly-3024.txt"),
  report("3024"),
  "https://www.ams.usda.gov/mnreports/cnwwcmr.pdf",
);
assert.equal(parseReportDate(fx("cotton-weekly-3024.txt")), "2026-09-18");
assert.ok(cotton.length >= 8, `expected current-week cotton prints, got ${cotton.length}`);
assert.ok(cotton.every((row) => row.group === "grain" && row.id.startsWith("grain.ams_3024.cotton.") && row.unit === "cents/lb"));
assert.ok(cotton.every((row) => row.asOf === "2026-09-18"), "asOf is the weekly issue date, not NASS crop-progress reprints");
assert.ok(cotton.every((row) => /ams_.*cotton/.test(row.id)), "row ids stay *.ams_*cotton*");
const sevenMkt = cotton.find((row) => row.id === "grain.ams_3024.cotton.seven_market.spot_41_4_34");
assert.ok(sevenMkt, "7-market weekly avg spot 41-4-34");
assert.equal(sevenMkt.price, 76.17);
assert.equal(sevenMkt.lo, 76.99);
assert.equal(sevenMkt.hi, 77.2);
assert.equal(sevenMkt.commodity, "Upland cotton");
const awp = cotton.find((row) => row.id === "grain.ams_3024.cotton.fsa.adjusted_world_price");
assert.ok(awp, "FSA Adjusted World Price");
assert.equal(awp.price, 68.92);
const iceDec = cotton.find((row) => row.id === "grain.ams_3024.cotton.ice.dec_week_ending");
assert.ok(iceDec, "ICE DEC week-ending settlement");
assert.equal(iceDec.price, 82.17);
const aIndex = cotton.find((row) => row.id === "grain.ams_3024.cotton.aindex.far_eastern_week_ending");
assert.ok(aIndex, "Far Eastern A Index week-ending");
assert.equal(aIndex.price, 94.35);
const ldp = cotton.find((row) => row.id === "grain.ams_3024.cotton.fsa.ldp");
assert.ok(ldp, "FSA Loan Deficiency Payment is an official 0.00 print");
assert.equal(ldp.price, 0);
const eastTx = cotton.find((row) => row.id === "grain.ams_3024.cotton.east_texas.new_crop.color_21_32");
assert.ok(eastTx, "East Texas new-crop spot trade");
assert.equal(eastTx.price, 81.5);
const eastTxLight = cotton.find((row) => row.id === "grain.ams_3024.cotton.east_texas.new_crop.color_21_31");
assert.ok(eastTxLight, "East Texas light new-crop lot");
assert.equal(eastTxLight.price, 80);
const eastTxOld = cotton.find((row) => row.id === "grain.ams_3024.cotton.east_texas.crop_2022_2023.color_12");
assert.ok(eastTxOld, "East Texas 2022/2023-crop lot still traded this week");
assert.equal(eastTxOld.price, 55);
const westTx = cotton.find((row) => row.id === "grain.ams_3024.cotton.west_texas.crop_2025.color_21_31");
assert.ok(westTx, "West Texas 2025-crop spot trade");
assert.equal(westTx.price, 76);
const westTxOld = cotton.find((row) => row.id === "grain.ams_3024.cotton.west_texas.crop_2024.color_22_43");
assert.ok(westTxOld, "West Texas 2024-crop lot still traded this week");
assert.equal(westTxOld.price, 70.25);
const dsw = cotton.find((row) => row.id === "grain.ams_3024.cotton.desert_southwest.crop_2025.color_21_31");
assert.ok(dsw, "Desert Southwest 2025-crop spot trade");
assert.equal(dsw.price, 80);
assert.ok(!cotton.some((row) => row.price === 62.98), "year-ago 7-market reprint is not a tick");
assert.ok(!cotton.some((row) => row.price === 88.22), "last-week ICE DEC reprint is not a tick");
assert.ok(!cotton.some((row) => row.price === 435588 || row.price === 2304 || row.price === 142100), "classing/export volumes are not ticks");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "3024")?.group, "grain");
assert.deepEqual(AMS_NATIONAL_REPORTS.find((r) => r.slug === "3024")?.pdfNames, ["cnwwcmr"]);
assert.ok(!AMS_NATIONAL_REPORTS.some((r) => r.slug === "3804"), "daily AMS_3804 spot quotations stay leftover");
const cottonMissingSpot = parseAmsReportText(
  fx("cotton-weekly-3024.txt").replace(/7-Market Weekly Avg\.?\s+Spot Price[\s\S]*?76\.17 cents\/pound/, ""),
  report("3024"),
  "https://www.ams.usda.gov/mnreports/cnwwcmr.pdf",
);
assert.equal(cottonMissingSpot.length, 0, "fail-closed when the required 7-market spot print is missing");
const cottonMissingAwp = parseAmsReportText(
  fx("cotton-weekly-3024.txt").replace(/Adjusted World price 1\/\s+68\.92/, "Adjusted World price 1/"),
  report("3024"),
  "https://www.ams.usda.gov/mnreports/cnwwcmr.pdf",
);
assert.equal(cottonMissingAwp.length, 0, "fail-closed when the required FSA AWP print is missing");
const cottonClassic = parseAmsReportText(
  [
    "Weekly Cotton Market Review",
    "week ending Thursday, August 27, 2026",
    "Quotations for the base quality of cotton in the seven designated markets, averaged 82.88 cents per pound for the week ending Thursday, August 27, 2026.",
    "Adjusted World Price (AWP) 71.10",
    "ICE Oct settlement price ended the week at 91.06 cents, compared to 87.02 cents last week.",
  ].join("\n"),
  report("3024"),
  "https://www.ams.usda.gov/mnreports/cnwwcmr.pdf",
);
assert.equal(cottonClassic.find((row) => row.id.endsWith("spot_41_4_34"))?.price, 82.88);
assert.equal(cottonClassic.find((row) => row.id.endsWith("adjusted_world_price"))?.price, 71.1);
assert.equal(cottonClassic.find((row) => row.id.endsWith("dec_week_ending"))?.price, 91.06);
assert.ok(!cottonClassic.some((row) => row.price === 87.02), "classic last-week ICE reprint is not a tick");

const ndmWest = parseAmsReportText(
  fx("dairy-ndm-west-1048.txt"),
  report("1048"),
  "https://www.ams.usda.gov/mnreports/ams_1048.pdf",
);
assert.ok(ndmWest.length >= 2, `expected West NDM ranges, got ${ndmWest.length}`);
const ndmLow = ndmWest.find((row) => /low/i.test(row.id) && /medium/i.test(row.id));
assert.ok(ndmLow);
assert.equal(ndmLow.lo, 1.79);
assert.equal(ndmLow.hi, 1.88);

const wheyCentral = parseAmsReportText(
  fx("dairy-whey-central-1045.txt"),
  report("1045"),
  "https://www.ams.usda.gov/mnreports/ams_1045.pdf",
);
assert.ok(wheyCentral.some((row) => row.lo === 0.63 && row.hi === 0.7), "prefer Mostly over Price Range");
assert.ok(!wheyCentral.some((row) => row.lo === 0.62 && row.hi === 0.73), "Price Range is not the print when Mostly exists");

const casein = parseAmsReportText(
  fx("dairy-casein-1051.txt"),
  report("1051"),
  "https://www.ams.usda.gov/mnreports/ams_1051.pdf",
);
assert.equal(casein.find((row) => /acid/i.test(row.id))?.price, 4.75);
assert.equal(casein.find((row) => /rennet/i.test(row.id))?.lo, 4.4);

const lactose = parseAmsReportText(
  fx("dairy-lactose-1052.txt"),
  report("1052"),
  "https://www.ams.usda.gov/mnreports/ams_1052.pdf",
);
assert.ok(lactose.some((row) => row.lo === 0.62 && row.hi === 0.72));

const eggs = parseAmsReportText(
  fx("eggs-shell-index-2843.txt"),
  report("2843"),
  "https://www.ams.usda.gov/mnreports/ams_2843.pdf",
);
assert.equal(parseReportDate(fx("eggs-shell-index-2843.txt")), "2026-09-18");
assert.ok(eggs.length >= 14, `expected current shell-egg prints, got ${eggs.length}`);
assert.ok(eggs.every((row) => row.group === "dairy" && row.id.startsWith("dairy.ams_2843.") && row.unit === "cents/dozen"));
assert.ok(eggs.every((row) => row.asOf === "2026-09-18"));
const cagedLarge = eggs.find((row) => row.id === "dairy.ams_2843.national.caged.graded_loose.white.large");
assert.ok(cagedLarge, "national caged white Large");
assert.equal(cagedLarge.price, 35.12);
assert.equal(cagedLarge.lo, 23);
assert.equal(cagedLarge.hi, 55);
const cagedJumbo = eggs.find((row) => row.id.endsWith(".caged.graded_loose.white.jumbo"));
assert.ok(cagedJumbo);
assert.equal(cagedJumbo.price, 39);
const cageFreeXl = eggs.find((row) => row.id.includes("cage_free") && row.id.includes("extra_large"));
assert.ok(cageFreeXl);
assert.equal(cageFreeXl.price, 41.88);
const organicNest = eggs.find((row) => row.id.includes("usda_organic") && row.id.includes("nest_run"));
assert.ok(organicNest, "organic nest-run brown 1");
assert.equal(organicNest.price, 180);
const caLarge = eggs.find((row) => row.id === "dairy.ams_2843.california.cage_free.graded_loose.white.large");
assert.ok(caLarge);
assert.equal(caLarge.price, 52.17);
assert.match(caLarge.classGrade, /Delivered/);
assert.ok(!eggs.some((row) => row.price === 163.95 || row.price === 186.7 || row.price === 128.97), "year-ago is not the print");
assert.ok(!eggs.some((row) => row.price === 96 || row.price === 147 || row.price === 159.22), "empty current book is not last-week/year-ago");
assert.ok(!eggs.some((row) => /free_range/.test(row.id)), "free-range had no current volume+wtd print");
assert.ok(!eggs.some((row) => row.id.includes("volume") || /51,?024|83,?108/.test(String(row.price))), "regional volume matrix is not a tick");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2843")?.group, "dairy");

const chicken = parseAmsReportText(
  fx("weekly-national-chicken-3646.txt"),
  report("3646"),
  "https://www.ams.usda.gov/mnreports/ams_3646.pdf",
);
assert.equal(parseReportDate(fx("weekly-national-chicken-3646.txt")), "2026-09-18");
assert.equal(chicken.length, 34, `expected current-week whole/parts/export prints, got ${chicken.length}`);
assert.ok(chicken.every((row) => row.group === "dairy" && row.id.startsWith("dairy.ams_3646.") && row.unit === "cents/lb"));
assert.ok(chicken.every((row) => row.asOf === "2026-09-18"), "asOf is the Report For through-date / Friday print");
const wholeBird = chicken.find((row) => row.id === "dairy.ams_3646.whole.delivered.national_composite_whole_bird");
assert.ok(wholeBird, "national composite whole bird");
assert.equal(wholeBird.price, 116.81);
assert.equal(wholeBird.lo, 81);
assert.equal(wholeBird.hi, 149);
assert.equal(wholeBird.commodity, "Whole chicken");
const wogs = chicken.find((row) => row.id === "dairy.ams_3646.whole.delivered.wogs.national_composite_wogs");
assert.ok(wogs);
assert.equal(wogs.price, 115.9);
const breastBs = chicken.find((row) => row.id === "dairy.ams_3646.parts.fob.breast_b_s");
assert.ok(breastBs);
assert.equal(breastBs.price, 121.6);
assert.equal(breastBs.commodity, "Chicken parts");
const legQ = chicken.find((row) => row.id === "dairy.ams_3646.parts.fob.leg_quarters_bulk");
assert.ok(legQ);
assert.equal(legQ.price, 54.57);
const exportFrozen = chicken.find((row) => row.id === "dairy.ams_3646.export_frozen.fob.msc_15_20_fat_content");
assert.ok(exportFrozen);
assert.equal(exportFrozen.price, 49.36);
const ribs = chicken.find((row) => row.id.endsWith(".breast_with_ribs"));
assert.ok(ribs, "parts row with no printed change still has current wtd + volume");
assert.equal(ribs.price, 109.41);
assert.ok(!chicken.some((row) => row.price === 116.08 || row.price === 115.13 || row.price === 25.17), "previous-week reprint is not a tick");
assert.ok(!chicken.some((row) => row.id.includes("volume") || row.price === 7306 || row.price === 8107), "1,000 lb volume is not a tick");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "3646")?.group, "dairy");
assert.ok(!AMS_NATIONAL_REPORTS.some((r) => r.slug === "3725"), "AMS_3725 Egg Markets Overview stays leftover");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "3647")?.group, "dairy");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "3647")?.title, "Weekly National Turkey");
const chickenMissingBreast = parseAmsReportText(
  fx("weekly-national-chicken-3646.txt").replace(/Breast - B\/S:.*\n/, ""),
  report("3646"),
  "https://www.ams.usda.gov/mnreports/ams_3646.pdf",
);
assert.equal(chickenMissingBreast.length, 0, "fail-closed when a required current-week chicken print is missing");

const turkey = parseAmsReportText(
  fx("weekly-national-turkey-3647.txt"),
  report("3647"),
  "https://www.ams.usda.gov/mnreports/ams_3647.pdf",
);
assert.equal(parseReportDate(fx("weekly-national-turkey-3647.txt")), "2026-09-18");
assert.ok(turkey.length >= 10, `expected current-week whole/parts/export turkey prints, got ${turkey.length}`);
assert.ok(turkey.every((row) => row.group === "dairy" && row.id.startsWith("dairy.ams_3647.") && row.unit === "cents/lb"));
assert.ok(turkey.every((row) => row.asOf === "2026-09-18"), "asOf is the Report For through-date / Friday print");
const henFresh = turkey.find((row) => row.id === "dairy.ams_3647.whole.fresh.fob.whole_young_hen_basted_8_16_lb_us_grade_a");
assert.ok(henFresh, "current-week fresh whole young hen");
assert.equal(henFresh.price, 184.11);
assert.equal(henFresh.lo, 183);
assert.equal(henFresh.hi, 187);
assert.equal(henFresh.commodity, "Whole turkey");
const henFrozen = turkey.find((row) => row.id === "dairy.ams_3647.whole.frozen.fob.whole_young_hen_basted_8_16_lb_us_grade_a");
assert.ok(henFrozen, "current-week frozen whole young hen");
assert.equal(henFrozen.price, 179.53);
const tomFrozen = turkey.find((row) => row.id === "dairy.ams_3647.whole.frozen.fob.whole_young_tom_basted_16_24_lb_us_grade_a");
assert.ok(tomFrozen);
assert.equal(tomFrozen.price, 183.67);
const turkeyBreast = turkey.find((row) => row.id === "dairy.ams_3647.parts.fresh.delivered.breasts_boneless_skinless_tom");
assert.ok(turkeyBreast, "fresh delivered boneless/skinless tom breast");
assert.equal(turkeyBreast.price, 304.28);
assert.equal(turkeyBreast.commodity, "Turkey parts");
const turkeyDrum = turkey.find((row) => row.id === "dairy.ams_3647.parts.fresh.delivered.drumsticks_tom");
assert.ok(turkeyDrum);
assert.equal(turkeyDrum.price, 75);
const turkeyThigh = turkey.find((row) => row.id === "dairy.ams_3647.parts.fresh.fob.thigh_meat_boneless_skinless");
assert.ok(turkeyThigh, "page-2 thigh meat stays on the open fresh FOB parts book");
assert.equal(turkeyThigh.price, 121);
const turkeyExport = turkey.find((row) => row.id === "dairy.ams_3647.export.frozen.delivered.gizzards_defatted");
assert.ok(turkeyExport);
assert.equal(turkeyExport.price, 90);
assert.ok(!turkey.some((row) => row.price === 180 || row.price === 185.5 || row.price === 294.45), "previous-week reprint is not a tick");
assert.ok(!turkey.some((row) => row.price === 440 || row.price === 133 || (row.price === 80 && row.id.includes("whole_young_tom"))), "previous-week volume is not a tick");
assert.ok(!turkey.some((row) => /2867|grocery|feature/i.test(row.source)), "grocery turkey ads are not a substitute");
const turkeyMissingBreast = parseAmsReportText(
  fx("weekly-national-turkey-3647.txt").replace(/Breasts,Boneless\/Skinless,[\s\S]*?\n\s*Tom\n/g, ""),
  report("3647"),
  "https://www.ams.usda.gov/mnreports/ams_3647.pdf",
);
assert.equal(turkeyMissingBreast.length, 0, "fail-closed when a required current-week turkey print is missing");
const turkeyYearAgo = parseAmsReportText(
  [
    fx("weekly-national-turkey-3647.txt"),
    "Year ago whole young hen 162.40 cents per pound",
    "Last year reprint 177.40",
  ].join("\n"),
  report("3647"),
  "https://www.ams.usda.gov/mnreports/ams_3647.pdf",
);
assert.ok(!turkeyYearAgo.some((row) => row.price === 162.4 || row.price === 177.4), "year-ago reprint is not a tick");

const cold = parseAmsReportText(
  fx("cold-storage-1095.txt"),
  report("1095"),
  "https://www.ams.usda.gov/mnreports/ams_1095.pdf",
);
assert.equal(cold.length, 4, `expected current butter/cheese holdings + MTD change, got ${cold.length}`);
assert.ok(cold.every((row) => row.group === "dairy" && row.id.startsWith("dairy.ams_1095.") && row.unit === "1,000 lb"));
assert.ok(cold.every((row) => row.asOf === "2026-09-14"), "asOf is the Monday holdings date, not the Wednesday publish header");
const butterHold = cold.find((row) => row.id === "dairy.ams_1095.national.butter.holdings");
assert.ok(butterHold, "national selected-center butter holdings");
assert.equal(butterHold.price, 61168);
assert.equal(butterHold.lo, 63138);
assert.equal(butterHold.commodity, "Cold storage butter");
const cheeseHold = cold.find((row) => row.id === "dairy.ams_1095.national.cheese.holdings");
assert.ok(cheeseHold, "national selected-center cheese holdings");
assert.equal(cheeseHold.price, 84553);
assert.equal(cheeseHold.lo, 85729);
assert.equal(cheeseHold.commodity, "Cold storage cheese");
const butterChg = cold.find((row) => row.id === "dairy.ams_1095.national.butter.mtd_change");
assert.ok(butterChg);
assert.equal(butterChg.price, -1970);
const cheeseChg = cold.find((row) => row.id === "dairy.ams_1095.national.cheese.mtd_change");
assert.ok(cheeseChg);
assert.equal(cheeseChg.price, -1176);
assert.ok(!cold.some((row) => row.price === 1.451 || row.price === 1.5143), "do not map holdings onto CME/NDPSR butter $/lb");
assert.ok(!cold.some((row) => row.id.includes("grade_aa") || row.id.includes("barrels") || row.id.includes("blocks")));
assert.ok(!cold.some((row) => row.price === -3 || row.price === -1), "% change is not a tick");
assert.ok(!cold.some((row) => row.asOf === "2026-09-01"), "first-of-month reference is not its own asOf series");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "1095")?.group, "dairy");
assert.deepEqual(AMS_NATIONAL_REPORTS.find((r) => r.slug === "1095")?.pdfNames, ["md_da953"]);
const coldMissingCheese = parseAmsReportText(
  "Weekly Cold Storage Holding - U.S.\n09/14/2026:                       61,168\nChange:                      (1,970)\n",
  report("1095"),
  "https://www.ams.usda.gov/mnreports/ams_1095.pdf",
);
assert.equal(coldMissingCheese.length, 0, "fail-closed when a required butter/cheese column is missing");

assert.ok(TICKS_MANIFEST_SAMPLE_IDS.includes("dairy.ams_2843.national.caged.graded_loose.white.large"));
assert.ok(TICKS_MANIFEST_SAMPLE_IDS.includes("grain.ams_3024.cotton.seven_market.spot_41_4_34"));
assert.ok(TICKS_MANIFEST_SAMPLE_IDS.includes("dairy.ams_3646.whole.delivered.national_composite_whole_bird"));
assert.ok(TICKS_MANIFEST_SAMPLE_IDS.includes("dairy.ams_1095.national.butter.holdings"));
assert.equal(PRODUCT_PUBLIC_ID, "us-hay-cattle-grain-ticks");
const fatSampleTicks = [...eggs, ...cold, ...chicken, ...cotton];
const fatSamples = selectTicksManifestSamples(
  fatSampleTicks,
  new Map([
    ["dairy.ams_2843.national.caged.graded_loose.white.large", "National caged White Large"],
    ["grain.ams_3024.cotton.seven_market.spot_41_4_34", "7-market weekly avg spot 41-4-34"],
    ["dairy.ams_3646.whole.delivered.national_composite_whole_bird", "National composite whole bird"],
    ["dairy.ams_1095.national.butter.holdings", "US selected-center butter holdings"],
  ]),
);
const eggSample = fatSamples.find((row) => row.id === "dairy.ams_2843.national.caged.graded_loose.white.large");
const cottonSample = fatSamples.find((row) => row.id === "grain.ams_3024.cotton.seven_market.spot_41_4_34");
const chickenSample = fatSamples.find((row) => row.id === "dairy.ams_3646.whole.delivered.national_composite_whole_bird");
const coldSample = fatSamples.find((row) => row.id === "dairy.ams_1095.national.butter.holdings");
assert.ok(eggSample, "manifest samples[] still prefer the live eggs White Large row");
assert.equal(eggSample.sample, true);
assert.equal(eggSample.price, cagedLarge.price);
assert.equal(eggSample.unit, "cents/dozen");
assert.ok(cottonSample, "manifest samples[] include a live-shaped cotton row");
assert.equal(cottonSample.sample, true);
assert.equal(cottonSample.price, sevenMkt.price);
assert.equal(cottonSample.group, "grain");
assert.equal(cottonSample.unit, "cents/lb");
assert.ok(chickenSample, "manifest samples[] include a live-shaped AMS_3646 chicken row");
assert.equal(chickenSample.sample, true);
assert.equal(chickenSample.price, wholeBird.price);
assert.equal(chickenSample.unit, "cents/lb");
assert.ok(coldSample, "manifest samples[] include a live-shaped AMS_1095 cold-storage row");
assert.equal(coldSample.sample, true);
assert.equal(coldSample.price, butterHold.price);
assert.equal(coldSample.unit, "1,000 lb");
assert.ok(!fatSamples.some((row) => row.id.includes("ams_2867")), "grocery turkey ads are not a fat sample substitute");
const withoutCotton = selectTicksManifestSamples(fatSampleTicks.filter((row) => !String(row.id).includes("ams_3024")));
assert.ok(!withoutCotton.some((row) => String(row.id).includes("ams_3024")), "missing preferred ids are skipped — no invented cotton price");
assert.ok(withoutCotton.some((row) => row.id === "dairy.ams_2843.national.caged.graded_loose.white.large"));

const feederPigs = parseAmsReportText(
  fx("hog-feeder-2810.txt"),
  report("2810"),
  "https://www.ams.usda.gov/mnreports/ams_2810.pdf",
);
assert.ok(feederPigs.length >= 5, `expected feeder-pig composites, got ${feederPigs.length}`);
assert.ok(feederPigs.every((row) => row.group === "hogs" && row.unit === "$/head"));
assert.equal(feederPigs.find((row) => row.id.endsWith("early_weaned_10_12lb.cash"))?.price, 43.37);
assert.equal(feederPigs.find((row) => row.id.endsWith("feeder_40lb.cash"))?.price, 59.44);
assert.ok(!feederPigs.some((row) => /barn|auction/i.test(row.id)), "no sale-barn mill on feeder-pig report");

const dairySteers = parseAmsReportText(
  fx("cattle-colorado-weekly-1907.txt"),
  report("1907"),
  "https://www.ams.usda.gov/mnreports/ams_1907.pdf",
);
assert.ok(dairySteers.length >= 2, `expected CO dairy-steer prints, got ${dairySteers.length}`);
assert.ok(dairySteers.every((row) => row.id.includes("dairy-steer") || row.id.includes("dairy-heifer")));
assert.equal(dairySteers.find((row) => row.id.includes("419lb"))?.price, 541.93);

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
const coldPdfs = officialPdfCandidateOrder("1095", [], ["md_da953"]);
assert.ok(coldPdfs[0].includes("www.ams.usda.gov/mnreports/ams_1095.pdf"));
assert.ok(coldPdfs.some((u) => /md_da953\.pdf/i.test(u)), "weekly cold storage also tries official MD_DA953 stem");
const groceryPdfs = officialPdfCandidateOrder("3324", [], ["fvwretail"]);
assert.ok(groceryPdfs[0].includes("www.ams.usda.gov/mnreports/ams_3324.pdf"));
assert.ok(groceryPdfs.some((u) => /fvwretail\.pdf/i.test(u)), "specialty-crops grocery ads use official fvwretail stem");
const cottonPdfs = officialPdfCandidateOrder("3024", [], ["cnwwcmr"]);
assert.ok(cottonPdfs[0].includes("www.ams.usda.gov/mnreports/ams_3024.pdf"));
assert.ok(cottonPdfs.some((u) => /cnwwcmr\.pdf/i.test(u)), "weekly cotton uses official cnwwcmr stem (ams_3024.pdf is 404)");

const listing = latestEsmisPdfUrl(fx("esmis-california-listing.html"), "2904");
assert.equal(
  listing,
  "https://esmis.nal.usda.gov/sites/default/release-files/th83kz35x/h702s6021/br86d3252/AMS_2904.PDF",
);
const torrington = parseAmsReportText(
  fx("auction-torrington-2101.txt"),
  report("2101"),
  "https://www.ams.usda.gov/mnreports/ams_2101.pdf",
);
assert.equal(parseReportDate(fx("auction-torrington-2101.txt")), "2026-09-18");
assert.equal(
  parseReportDate("Fri Sep 19, 2026\nLivestock Weighted Average Report for 9/18/2026 - Final\n"),
  "2026-09-18",
  "single-day auction sale date beats the header weekday",
);
assert.equal(torrington.length, 4, `expected boner, lean, bulls, and stock cows, got ${torrington.length}`);
assert.ok(torrington.every((row) => row.group === "cattle" && row.unit === "$/cwt" && row.asOf === "2026-09-18"));
assert.ok(torrington.every((row) => row.id.startsWith("cattle.ams_2101.torrington_wy_fri.")));
const boner = torrington.find((row) => row.id === "cattle.ams_2101.torrington_wy_fri.slaughter-cow.boner.1394lb");
assert.ok(boner, "slaughter cows Boner 80-85%");
assert.equal(boner.price, 158.66);
assert.equal(boner.lo, 153);
assert.equal(boner.hi, 166);
assert.equal(boner.commodity, "Slaughter cows");
assert.match(boner.classGrade, /354 head/);
assert.match(boner.classGrade, /Average Return to Feed/);
const lean = torrington.find((row) => row.id === "cattle.ams_2101.torrington_wy_fri.slaughter-cow.lean.1157lb");
assert.ok(lean, "slaughter cows Lean 85-90%");
assert.equal(lean.price, 157.37);
assert.equal(lean.lo, 152);
assert.equal(lean.hi, 162);
const bulls = torrington.find((row) => row.id === "cattle.ams_2101.torrington_wy_fri.slaughter-bull.12.1709lb");
assert.ok(bulls, "slaughter bulls 1-2");
assert.equal(bulls.price, 183.64);
assert.equal(bulls.lo, 180);
assert.equal(bulls.hi, 198);
assert.equal(bulls.commodity, "Slaughter bulls");
assert.match(bulls.classGrade, /34 head/);
const stock = torrington.find((row) => row.id === "cattle.ams_2101.torrington_wy_fri.replacement-stock-cow.ml1.2_4.o.997lb");
assert.ok(stock, "replacement stock cows");
assert.equal(stock.price, 270.28);
assert.equal(stock.lo, 260);
assert.equal(stock.hi, 281);
assert.equal(stock.commodity, "Stock cows");
assert.match(stock.classGrade, /112 head/);
assert.match(stock.classGrade, /age 2-4/);
assert.match(stock.classGrade, /stage O/);
assert.ok(!torrington.some((row) => row.price === 2447.08 || row.price === 2250 || row.price === 2600), "per-unit bred cows are $/head, not a $/cwt tick");
assert.ok(!torrington.some((row) => row.price === 1285 || row.price === 1010 || row.price === 275), "receipt counts are not ticks");
assert.ok(!torrington.some((row) => /feeder-steer|feeder-heifer/.test(row.id)));
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2101")?.group, "cattle");

const feederWithCows = parseAmsReportText(
  readFileSync(join(repoRoot, "src/fixtures/ams-leftover-cattle-auction.txt"), "utf8"),
  report("2132"),
  "https://www.ams.usda.gov/mnreports/ams_2132.pdf",
);
assert.ok(feederWithCows.some((row) => row.id.includes("feeder-steer")));
assert.ok(feederWithCows.some((row) => row.id.includes("feeder-heifer")));
assert.ok(!feederWithCows.some((row) => /slaughter|cow/.test(row.id)), "feeder auctions keep steer/heifer rows and skip the slaughter block");
assert.ok(!feederWithCows.some((row) => row.price === 144));

const missouriDirect = parseAmsReportText(
  fx("direct-missouri-2808-empty.txt"),
  report("2808"),
  "https://www.ams.usda.gov/mnreports/ams_2808.pdf",
);
assert.equal(missouriDirect.length, 0, "Missouri Direct 'not established' stays empty");
const montanaDirect = parseAmsReportText(
  fx("direct-montana-2770-empty.txt"),
  report("2770"),
  "https://www.ams.usda.gov/mnreports/ams_2770.pdf",
);
assert.equal(montanaDirect.length, 0, "Montana Direct 'No trades this week' stays empty");

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
assert.equal(merged.fetchedAt, "2026-08-24T16:00:00Z");
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
assert.deepEqual(
  [...AMS_LEFTOVER_SLUGS],
  ["2006", "1704", "1933", "2193", "2063", "2187", "2091", "2115", "1963", "1988", "1946", "1995", "1419", "1997"],
);
assert.equal(AMS_LEFTOVER_REPORTS.length, 14);
assert.ok(
  AMS_LEFTOVER_SLUGS.every((s) => slugs.includes(s)),
  "leftover official SE weeklies + five SE barns fold into AMS_NATIONAL_REPORTS",
);
assert.ok(AMS_LEFTOVER_REPORTS.every((r) => r.group === "cattle" && r.esmisPublication === ""));
assert.equal(AMS_LEFTOVER_REPORTS.filter((r) => r.kind === "se-weekly").length, 9);
assert.equal(AMS_LEFTOVER_REPORTS.filter((r) => r.kind === "se-barn").length, 5);
{
  const prev = {
    ok: true as const,
    product: "idaho-hay-feeder-ticks" as const,
    fetchedAt: "2026-08-30T13:51:52.772Z",
    asOf: "2026-08-29",
    tickCount: 2,
    rows: [
      { id: "cattle.ams_1778.montana_weekly.feeder-steer.ml1.550lb", group: "cattle" as const, commodity: "Steers", label: "keep", market: "MT", classGrade: "x", unit: "$/cwt", price: 1, asOf: "2026-08-22", source: "old", sourceUrl: "https://example.invalid/1778", reportDate: "2026-08-22", series: "keep" },
      { id: "cattle.ams_2006.alabama_weekly.feeder-steer.ml1.550lb", group: "cattle" as const, commodity: "Steers", label: "stale leftover", market: "AL", classGrade: "x", unit: "$/cwt", price: 1, asOf: "2026-08-01", source: "old", sourceUrl: "https://example.invalid/2006", reportDate: "2026-08-01", series: "stale" },
    ],
    failed: [{ id: "ams_2006", source: "AMS_2006 old", sourceUrl: "https://example.invalid/2006", reason: "stale" }],
    sources: ["AMS_1778 Montana Weekly Cattle Auction Summary", "AMS_2006 Alabama Weekly Cattle Auction Summary"],
  };
  const next = {
    ok: true as const,
    product: "idaho-hay-feeder-ticks" as const,
    fetchedAt: "2026-08-31T01:00:00.000Z",
    asOf: "2026-08-29",
    tickCount: 1,
    rows: [
      { id: "cattle.ams_2006.alabama_weekly.feeder-steer.ml1.550lb", group: "cattle" as const, commodity: "Steers", label: "fresh leftover", market: "AL", classGrade: "x", unit: "$/cwt", price: 2, asOf: "2026-08-29", source: "new", sourceUrl: "https://example.invalid/2006", reportDate: "2026-08-29", series: "fresh" },
    ],
    failed: [],
    sources: ["AMS_2006 Alabama Weekly Cattle Auction Summary"],
  };
  const folded = mergePartialAmsSnapshot(prev, next, ["2006"]);
  assert.equal(folded.tickCount, 2);
  assert.ok(folded.rows.some((r) => r.id.startsWith("cattle.ams_1778.") && r.label === "keep"));
  assert.equal(folded.rows.find((r) => r.id.includes("ams_2006"))?.label, "fresh leftover");
  assert.equal(folded.failed.length, 0);
  assert.ok(folded.sources.includes("AMS_1778 Montana Weekly Cattle Auction Summary"));
}
{
  const prev = {
    ok: true as const,
    product: "idaho-hay-feeder-ticks" as const,
    fetchedAt: "2026-09-17T14:01:06.948Z",
    asOf: "2026-09-16",
    tickCount: 2,
    rows: [
      { id: "produce.ams_na_fv010.atlanta.tomatoes.georgia", group: "produce" as const, commodity: "Tomatoes", label: "keep produce", market: "ATL", classGrade: "x", unit: "$/cwt", price: 1, asOf: "2026-09-16", source: "old", sourceUrl: "https://example.invalid/na_fv010", reportDate: "2026-09-16", series: "keep" },
      { id: "hay.ams_2904.california.alfalfa.premium", group: "hay" as const, commodity: "Alfalfa", label: "ok hay", market: "CA", classGrade: "x", unit: "$/ton", price: 2, asOf: "2026-09-16", source: "old", sourceUrl: "https://example.invalid/2904", reportDate: "2026-09-16", series: "ok" },
    ],
    failed: [],
    sources: ["AMS_na_fv010 Atlanta Fruit and Vegetable", "AMS_2904 California Direct Hay"],
  };
  const next = {
    ok: true as const,
    product: "idaho-hay-feeder-ticks" as const,
    fetchedAt: "2026-09-18T01:58:57.430Z",
    asOf: "2026-09-17",
    tickCount: 1,
    rows: [
      { id: "hay.ams_2904.california.alfalfa.premium", group: "hay" as const, commodity: "Alfalfa", label: "fresh hay", market: "CA", classGrade: "x", unit: "$/ton", price: 3, asOf: "2026-09-17", source: "new", sourceUrl: "https://example.invalid/2904", reportDate: "2026-09-17", series: "fresh" },
    ],
    failed: [{ id: "ams_na_fv010", source: "AMS_na_fv010 Atlanta Fruit and Vegetable", sourceUrl: "https://example.invalid/na_fv010", reason: "fetch failed" }],
    sources: ["AMS_2904 California Direct Hay"],
  };
  const held = mergeFailedAmsSlugs(prev, next);
  assert.equal(held.tickCount, 2);
  assert.equal(held.rows.find((r) => r.id.includes("ams_na_fv010"))?.label, "keep produce");
  assert.equal(held.rows.find((r) => r.id.includes("ams_2904"))?.label, "fresh hay");
  assert.equal(held.failed.length, 1);
  assert.equal(held.failed[0]?.id, "ams_na_fv010");
  assert.ok(held.sources.includes("AMS_na_fv010 Atlanta Fruit and Vegetable"));
  assert.ok(held.sources.includes("AMS_2904 California Direct Hay"));
}
assert.ok(
  ["2998", "2993", "2995", "2756", "2757", "2867", "2868", "3228", "3229", "3796", "1598", "1048", "1045", "1051", "1052", "1102", "2997", "2843", "1095", "3646", "2872", "2810", "3802", "3024", "2314", "2315", "2306", "2290", "3324"].every((s) => slugs.includes(s)),
  "official AMS dairy / hog / shell-egg / cold-storage / weekly-chicken / grocery-retail / organic grain / cotton weekly / national terminal-market slugs",
);
assert.ok(!slugs.includes("3096"), "WAF-empty Eastern Cornbelt Direct Feeder is dropped");
assert.ok(!slugs.includes("3458") && !slugs.includes("2498"), "LMR hog/pork PDFs stay off the allowlist");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2998")?.group, "dairy");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2993")?.group, "dairy");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2843")?.group, "dairy");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "1095")?.group, "dairy");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "3646")?.group, "dairy");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2756")?.group, "dairy");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2757")?.group, "dairy");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "3324")?.group, "produce");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "3024")?.group, "grain");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2872")?.group, "hogs");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2810")?.group, "hogs");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2314")?.group, "produce");
assert.ok(AMS_NATIONAL_REPORTS.every((r) => !["3056", "3057", "3058", "3059", "2914"].includes(r.slug)));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "marsapi"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "nass-quick-stats"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "nass-monthly-cold-storage"));
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
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "ams_3096_waf"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "dairy-waf-empty"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "se-swine-auction-barns"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "sheep-goats"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "poultry-eggs"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "ams-3725-egg-overview"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "cotton-rice"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "if_fv130_already"));
assert.ok(SKIPPED_SOURCES.some((s) => s.id === "mx_fv010_discontinued"));
assert.ok(!slugs.includes("mx_fv010") && !slugs.includes("mx_fv020"), "discontinued Mexico City terminal is not a slug");
assert.ok(!slugs.includes("2513") && !slugs.includes("2675"), "LMR hog PDFs are not catalog slugs");
assert.ok(slugs.includes("bh_fv020") && slugs.includes("na_fv020"), "Boston/Philadelphia terminal vegetables");
assert.equal(PRODUCT_ID, "idaho-hay-feeder-ticks");
assert.equal(PRODUCT_NAME, "USDA farm market prices");

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
      fetchedAt: "2026-09-19T16:00:00Z",
      asOf: "2026-09-18",
      tickCount: eggs.length,
      rows: eggs,
      failed: [],
      sources: ["AMS_2843 Daily National Shell Egg Index"],
    },
    dir,
  );
  process.env.TICKS_AMS_DIR = dir;
  const paidEggs = paidTicksBody(loadTicks());
  const eggRec = paidEggs.records.find((row) => row.id === "dairy.ams_2843.national.caged.graded_loose.white.large");
  assert.ok(eggRec, "paid records include AMS_2843 shell eggs");
  assert.equal(eggRec.type, "dairy");
  const eggMan = buildTicksManifest("https://ticks.bnm.farm/ticks") as {
    product?: { id?: string };
    samples?: { id?: string; group?: string; unit?: string; sample?: boolean }[];
  };
  assert.equal(eggMan.product?.id, PRODUCT_PUBLIC_ID);
  const eggSample = eggMan.samples?.find((row) => row.id === "dairy.ams_2843.national.caged.graded_loose.white.large");
  assert.ok(eggSample, "manifest samples[] includes AMS_2843 shell eggs");
  assert.equal(eggSample.sample, true);
  assert.equal(eggSample.group, "dairy");
  assert.equal(eggSample.unit, "cents/dozen");
  writeAmsSnapshot(
    {
      ok: true,
      product: "idaho-hay-feeder-ticks",
      fetchedAt: "2026-09-20T16:00:00Z",
      asOf: "2026-09-14",
      tickCount: cold.length,
      rows: cold,
      failed: [],
      sources: ["AMS_1095 National Weekly Cold Storage"],
    },
    dir,
  );
  process.env.TICKS_AMS_DIR = dir;
  const paidCold = paidTicksBody(loadTicks());
  const coldRec = paidCold.records.find((row) => row.id === "dairy.ams_1095.national.butter.holdings");
  assert.ok(coldRec, "paid records include AMS_1095 cold-storage butter holdings");
  assert.equal(coldRec.type, "dairy");
  writeAmsSnapshot(
    {
      ok: true,
      product: "idaho-hay-feeder-ticks",
      fetchedAt: "2026-09-20T18:00:00Z",
      asOf: "2026-09-18",
      tickCount: chicken.length,
      rows: chicken,
      failed: [],
      sources: ["AMS_3646 Weekly National Chicken"],
    },
    dir,
  );
  process.env.TICKS_AMS_DIR = dir;
  const paidChicken = paidTicksBody(loadTicks());
  const chickenRec = paidChicken.records.find((row) => row.id === "dairy.ams_3646.whole.delivered.national_composite_whole_bird");
  assert.ok(chickenRec, "paid records include AMS_3646 weekly national chicken");
  assert.equal(chickenRec.type, "dairy");
  writeAmsSnapshot(
    {
      ok: true,
      product: "idaho-hay-feeder-ticks",
      fetchedAt: "2026-09-20T20:00:00Z",
      asOf: "2026-09-18",
      tickCount: chickenAds.length + produceAds.length,
      rows: [...chickenAds, ...produceAds],
      failed: [],
      sources: ["AMS_2756 Grocery Store Chicken Feature", "AMS_3324 Grocery Store Specialty Crops Feature"],
    },
    dir,
  );
  process.env.TICKS_AMS_DIR = dir;
  const paidRetail = paidTicksBody(loadTicks());
  const fryerRec = paidRetail.records.find((row) => row.id === "dairy.ams_2756.whole.whole_bagged_fryer.conventional.fresh");
  assert.ok(fryerRec, "paid records include AMS_2756 grocery chicken ads");
  assert.equal(fryerRec.type, "dairy");
  const honeyRec = paidRetail.records.find((row) => row.id === "produce.ams_3324.conventional.apples.honeycrisp.per_lb");
  assert.ok(honeyRec, "paid records include AMS_3324 grocery produce ads");
  assert.equal(honeyRec.type, "produce");
  writeAmsSnapshot(
    {
      ok: true,
      product: "idaho-hay-feeder-ticks",
      fetchedAt: "2026-09-20T22:00:00Z",
      asOf: "2026-09-18",
      tickCount: cotton.length,
      rows: cotton,
      failed: [],
      sources: ["AMS_3024 Weekly Cotton Market Review"],
    },
    dir,
  );
  process.env.TICKS_AMS_DIR = dir;
  const paidCotton = paidTicksBody(loadTicks());
  const cottonRec = paidCotton.records.find((row) => row.id === "grain.ams_3024.cotton.seven_market.spot_41_4_34");
  assert.ok(cottonRec, "paid records include AMS_3024 weekly cotton 7-market spot");
  assert.equal(cottonRec.type, "grain");
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
    dairyNdpsr: ndpsr.length,
    dairyRetailAds: retail.length,
    dairyNdmWest: ndmWest.length,
    dairyWheyCentral: wheyCentral.length,
    dairyCasein: casein.length,
    dairyLactose: lactose.length,
    dairyDry: dairyDry.length,
    dairyFluidWest: dairyFluid.length,
    dairyOrganicAds: dairyOrg.length,
    shellEggs2843: eggs.length,
    coldStorage1095: cold.length,
    weeklyChicken3646: chicken.length,
    weeklyTurkey3647: turkey.length,
    groceryChicken2756: chickenAds.length,
    groceryEggs2757: eggAds.length,
    groceryTurkey2867: turkeyAds.length,
    groceryPork2868: porkAds.length,
    groceryBeef3228: beefAds.length,
    groceryLamb3229: lambAds.length,
    groceryVeal3796: vealAds.length,
    groceryProduce3324: produceAds.length,
    weeklyCotton3024: cotton.length,
    hogsSummary: hogs.length,
    feederPigs: feederPigs.length,
    dairySteers1907: dairySteers.length,
    organicGrain: orgGrain.length,
    nyTerminalFruit: nyFruit.length,
    hayCaliforniaOrganic: hayCa.filter((row) => row.id.includes("organic")).length,
    mergedTickCount: merged.ticks.length,
    keptTwinFalls: true,
    torrington2101: torrington.length,
  }),
);
