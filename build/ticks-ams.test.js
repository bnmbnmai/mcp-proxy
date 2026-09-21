import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AMS_NATIONAL_REPORTS, officialPdfCandidateOrder, parseAmsReportText, parseReportDate, } from "./ticks-ams.js";
import { PRODUCT_PUBLIC_ID, TICKS_402_DESCRIPTION, TICKS_BAG, TICKS_COMMODITY_SET, TICKS_LLMS_BULLET, TICKS_OPENAPI_DESCRIPTION, } from "./shop-sample.js";
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = here.endsWith("/build") || here.endsWith("\\build") || here.endsWith("/src") || here.endsWith("\\src")
    ? dirname(here)
    : here;
function fx(name) {
    return readFileSync(join(repoRoot, "src/fixtures/ticks-ams", name), "utf-8");
}
function report(slug) {
    const found = AMS_NATIONAL_REPORTS.find((r) => r.slug === slug);
    assert.ok(found, slug);
    return found;
}
const FAT_NEEDLES = ["eggs", "cold storage", "poultry", "cotton", "grocery retail"];
assert.equal(PRODUCT_PUBLIC_ID, "us-hay-cattle-grain-ticks", "do not rename the public product.id");
assert.ok(!TICKS_COMMODITY_SET.includes("/eggs"));
assert.ok(!TICKS_COMMODITY_SET.includes("/cotton"));
assert.ok(!TICKS_COMMODITY_SET.includes("/poultry"));
for (const needle of FAT_NEEDLES) {
    assert.ok(TICKS_COMMODITY_SET.includes(needle), `commodity set names ${needle}`);
    assert.ok(TICKS_402_DESCRIPTION.includes(needle), `402 description names ${needle}`);
    assert.ok(TICKS_OPENAPI_DESCRIPTION.includes(needle), `OpenAPI description names ${needle}`);
    assert.ok(TICKS_LLMS_BULLET.includes(needle), `llms bullet names ${needle}`);
    assert.ok(TICKS_BAG.includes(needle), `catalog bag names ${needle}`);
}
assert.ok(TICKS_402_DESCRIPTION.length <= 500, `402 description must stay under CDP 500 chars, got ${TICKS_402_DESCRIPTION.length}`);
assert.ok(TICKS_402_DESCRIPTION.includes("$0.05 = entire current table."));
assert.ok(TICKS_OPENAPI_DESCRIPTION.includes(TICKS_COMMODITY_SET));
assert.ok(TICKS_LLMS_BULLET.includes(TICKS_COMMODITY_SET));
const eggs = parseAmsReportText(fx("eggs-shell-index-2843.txt"), report("2843"), "https://www.ams.usda.gov/mnreports/ams_2843.pdf");
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
const cold = parseAmsReportText(fx("cold-storage-1095.txt"), report("1095"), "https://www.ams.usda.gov/mnreports/ams_1095.pdf");
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
const coldMissingCheese = parseAmsReportText("Weekly Cold Storage Holding - U.S.\n09/14/2026:                       61,168\nChange:                      (1,970)\n", report("1095"), "https://www.ams.usda.gov/mnreports/ams_1095.pdf");
assert.equal(coldMissingCheese.length, 0, "fail-closed when a required butter/cheese column is missing");
const chicken = parseAmsReportText(fx("weekly-national-chicken-3646.txt"), report("3646"), "https://www.ams.usda.gov/mnreports/ams_3646.pdf");
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
const chickenMissingBreast = parseAmsReportText(fx("weekly-national-chicken-3646.txt").replace(/Breast - B\/S:.*\n/, ""), report("3646"), "https://www.ams.usda.gov/mnreports/ams_3646.pdf");
assert.equal(chickenMissingBreast.length, 0, "fail-closed when a required current-week chicken print is missing");
const chickenAds = parseAmsReportText(fx("retail-chicken-2756.txt"), report("2756"), "https://www.ams.usda.gov/mnreports/ams_2756.pdf");
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
const chickenAdsMissing = parseAmsReportText(fx("retail-chicken-2756.txt").replace(/Whole Bagged Fryer\s+Conventional\s+Fresh\s+844[\s\S]*?\n/, ""), report("2756"), "https://www.ams.usda.gov/mnreports/ams_2756.pdf");
assert.equal(chickenAdsMissing.length, 0, "fail-closed when a required current-week chicken grocery print is missing");
const eggAds = parseAmsReportText(fx("retail-eggs-2757.txt"), report("2757"), "https://www.ams.usda.gov/mnreports/ams_2757.pdf");
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
const turkeyAds = parseAmsReportText(fx("retail-turkey-2867.txt"), report("2867"), "https://www.ams.usda.gov/mnreports/ams_2867.pdf");
assert.ok(turkeyAds.length >= 8, `expected national turkey grocery ads, got ${turkeyAds.length}`);
const groundTurkey = turkeyAds.find((row) => row.id === "dairy.ams_2867.ground.ground_turkey_93_1_2_lbs.conventional.fresh");
assert.ok(groundTurkey, "national conventional 93% ground turkey");
assert.equal(groundTurkey.price, 4.71);
const porkAds = parseAmsReportText(fx("retail-pork-2868.txt"), report("2868"), "https://www.ams.usda.gov/mnreports/ams_2868.pdf");
assert.ok(porkAds.length >= 20, `expected national pork grocery ads, got ${porkAds.length}`);
const hamSteak = porkAds.find((row) => row.id === "dairy.ams_2868.ham.ham_steak.conventional.fresh");
assert.ok(hamSteak, "national conventional ham steak");
assert.equal(hamSteak.price, 5.1);
const beefAds = parseAmsReportText(fx("retail-beef-3228.txt"), report("3228"), "https://www.ams.usda.gov/mnreports/ams_3228.pdf");
assert.ok(beefAds.length >= 20, `expected national beef grocery ads, got ${beefAds.length}`);
const chuckRoast = beefAds.find((row) => row.id === "dairy.ams_3228.chuck.chuck_roast_boneless_regular.conventional.fresh");
assert.ok(chuckRoast, "national conventional boneless chuck roast");
assert.equal(chuckRoast.price, 7.82);
const lambAds = parseAmsReportText(fx("retail-lamb-3229.txt"), report("3229"), "https://www.ams.usda.gov/mnreports/ams_3229.pdf");
assert.ok(lambAds.length >= 4, `expected national lamb grocery ads, got ${lambAds.length}`);
const loinChops = lambAds.find((row) => row.id === "dairy.ams_3229.loin.loin_chops_regular.antibiotic_free.fresh");
assert.ok(loinChops, "national antibiotic-free loin chops");
assert.equal(loinChops.price, 10.87);
const vealAds = parseAmsReportText(fx("retail-veal-3796.txt"), report("3796"), "https://www.ams.usda.gov/mnreports/ams_3796.pdf");
assert.equal(vealAds.length, 2, `expected lightly-tested veal grocery ads, got ${vealAds.length}`);
const vealBreast = vealAds.find((row) => row.id === "dairy.ams_3796.breast.breast_regular.conventional.fresh");
assert.ok(vealBreast, "national conventional veal breast");
assert.equal(vealBreast.price, 9.99);
const produceAds = parseAmsReportText(fx("retail-specialty-crops-3324.txt"), report("3324"), "https://www.ams.usda.gov/mnreports/fvwretail.pdf");
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
const produceAdsMissing = parseAmsReportText(fx("retail-specialty-crops-3324.txt").replace(/Apples\s+Honeycrisp\s+per lb\s+5,195[\s\S]*?\n/, ""), report("3324"), "https://www.ams.usda.gov/mnreports/fvwretail.pdf");
assert.equal(produceAdsMissing.length, 0, "fail-closed when a required current-week produce grocery print is missing");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "2756")?.group, "dairy");
assert.equal(AMS_NATIONAL_REPORTS.find((r) => r.slug === "3324")?.group, "produce");
assert.deepEqual(AMS_NATIONAL_REPORTS.find((r) => r.slug === "3324")?.pdfNames, ["fvwretail"]);
const cotton = parseAmsReportText(fx("cotton-weekly-3024.txt"), report("3024"), "https://www.ams.usda.gov/mnreports/cnwwcmr.pdf");
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
const cottonMissingSpot = parseAmsReportText(fx("cotton-weekly-3024.txt").replace(/7-Market Weekly Avg\.?\s+Spot Price[\s\S]*?76\.17 cents\/pound/, ""), report("3024"), "https://www.ams.usda.gov/mnreports/cnwwcmr.pdf");
assert.equal(cottonMissingSpot.length, 0, "fail-closed when the required 7-market spot print is missing");
const cottonMissingAwp = parseAmsReportText(fx("cotton-weekly-3024.txt").replace(/Adjusted World price 1\/\s+68\.92/, "Adjusted World price 1/"), report("3024"), "https://www.ams.usda.gov/mnreports/cnwwcmr.pdf");
assert.equal(cottonMissingAwp.length, 0, "fail-closed when the required FSA AWP print is missing");
const cottonClassic = parseAmsReportText([
    "Weekly Cotton Market Review",
    "week ending Thursday, August 27, 2026",
    "Quotations for the base quality of cotton in the seven designated markets, averaged 82.88 cents per pound for the week ending Thursday, August 27, 2026.",
    "Adjusted World Price (AWP) 71.10",
    "ICE Oct settlement price ended the week at 91.06 cents, compared to 87.02 cents last week.",
].join("\n"), report("3024"), "https://www.ams.usda.gov/mnreports/cnwwcmr.pdf");
assert.equal(cottonClassic.find((row) => row.id.endsWith("spot_41_4_34"))?.price, 82.88);
assert.equal(cottonClassic.find((row) => row.id.endsWith("adjusted_world_price"))?.price, 71.1);
assert.equal(cottonClassic.find((row) => row.id.endsWith("dec_week_ending"))?.price, 91.06);
assert.ok(!cottonClassic.some((row) => row.price === 87.02), "classic last-week ICE reprint is not a tick");
const coldPdfs = officialPdfCandidateOrder("1095", [], ["md_da953"]);
assert.ok(coldPdfs[0].includes("www.ams.usda.gov/mnreports/ams_1095.pdf"));
assert.ok(coldPdfs.some((u) => /md_da953\.pdf/i.test(u)), "weekly cold storage also tries official MD_DA953 stem");
const groceryPdfs = officialPdfCandidateOrder("3324", [], ["fvwretail"]);
assert.ok(groceryPdfs[0].includes("www.ams.usda.gov/mnreports/ams_3324.pdf"));
assert.ok(groceryPdfs.some((u) => /fvwretail\.pdf/i.test(u)), "specialty-crops grocery ads use official fvwretail stem");
const cottonPdfs = officialPdfCandidateOrder("3024", [], ["cnwwcmr"]);
assert.ok(cottonPdfs[0].includes("www.ams.usda.gov/mnreports/ams_3024.pdf"));
assert.ok(cottonPdfs.some((u) => /cnwwcmr\.pdf/i.test(u)), "weekly cotton uses official cnwwcmr stem (ams_3024.pdf is 404)");
const slugs = AMS_NATIONAL_REPORTS.map((r) => r.slug);
assert.ok(["2843", "1095", "3646", "2756", "2757", "2867", "2868", "3228", "3229", "3796", "3324", "3024"].every((s) => slugs.includes(s)), "fat AMS slugs are on the nationwide /ticks walk");
const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
const shopIndex = readFileSync(join(repoRoot, "SHOP-INDEX.md"), "utf8");
const openapi = JSON.parse(readFileSync(join(repoRoot, "openapi.json"), "utf8"));
const openapiTicks = openapi.paths?.["/ticks"]?.get?.description ?? "";
for (const needle of FAT_NEEDLES) {
    assert.ok(readme.includes(needle), `README names ${needle}`);
    assert.ok(shopIndex.includes(needle), `SHOP-INDEX names ${needle}`);
    assert.ok(openapiTicks.includes(needle), `checked-in openapi.json /ticks names ${needle}`);
}
console.log(JSON.stringify({
    ok: true,
    product: PRODUCT_PUBLIC_ID,
    commoditySet: TICKS_COMMODITY_SET,
    shellEggs2843: eggs.length,
    coldStorage1095: cold.length,
    weeklyChicken3646: chicken.length,
    groceryChicken2756: chickenAds.length,
    groceryEggs2757: eggAds.length,
    groceryTurkey2867: turkeyAds.length,
    groceryPork2868: porkAds.length,
    groceryBeef3228: beefAds.length,
    groceryLamb3229: lambAds.length,
    groceryVeal3796: vealAds.length,
    groceryProduce3324: produceAds.length,
    weeklyCotton3024: cotton.length,
}));
//# sourceMappingURL=ticks-ams.test.js.map