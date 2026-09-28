import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TABLE_PATHS } from "./shop-catalog.js";
import { TICKS_402_DESCRIPTION, TICKS_BAG, TICKS_LLMS_BULLET, TICKS_OPENAPI_DESCRIPTION, } from "./shop-sample.js";
import { candidateDumpUrls, foldMbIntoRows, isMonthlyHistoricUrl, listWeeklyPdfs, MONTHLY_HISTORIC_XLSX, OPENMB_ATTRIBUTION, parseIssueDate, parseMbWeeklyPrices, PRODUCT_ID, shouldCollectMbCattle, SKIPPED_MB, snapshotFromText, SOURCE_PAGE, textDumpsWeeklyMartBody, TICKS_PATH, TICKS_PRICE, weeklyMartDumpReason, weeklyPdfUrl, } from "./ticks-mb-cattle.js";
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = here.endsWith("/build") || here.endsWith("\\build") || here.endsWith("/src") || here.endsWith("\\src")
    ? dirname(here)
    : here;
function fx(name) {
    return readFileSync(join(repoRoot, "src/fixtures/ticks-mb-cattle", name), "utf8");
}
const SEP18_URL = weeklyPdfUrl("2026-09-18");
const AUG28_URL = weeklyPdfUrl("2026-08-28");
function mainPrices() {
    const text = fx("cattle-2026-09-18.txt");
    assert.equal(parseIssueDate(text), "2026-09-18");
    const rows = parseMbWeeklyPrices(text, SEP18_URL);
    assert.ok(rows.length >= 40, `expected a week of per-mart prints, got ${rows.length}`);
    assert.ok(rows.every((row) => row.unit === "C$/cwt"));
    assert.ok(rows.every((row) => row.reportDate === "2026-09-18"));
    assert.ok(rows.every((row) => row.source.includes(OPENMB_ATTRIBUTION)));
    assert.ok(rows.every((row) => row.sourceUrl === SEP18_URL));
    assert.ok(rows.every((row) => row.series === row.id && row.price >= 20 && row.price <= 1200));
    assert.ok(!rows.some((row) => /logo|endorsed by the government of manitoba/i.test(JSON.stringify(row))));
    assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
    assert.ok(!rows.some((row) => row.id.includes("ashern") || row.id.includes("killarney")), "no-sale marts stay empty");
    assert.ok(!rows.some((row) => row.price === 252.5 || row.price === 831.5), "previous-sale reprint is not a tick");
    assert.ok(!rows.some((row) => row.price === 212.45 || row.price === 448.38), "provincial rollup is not a per-mart tick");
    assert.ok(!rows.some((row) => row.price === 2105 || row.price === 163912 || row.price === 1.4), "head counts and FX are not prices");
    const gladCows = rows.find((row) => row.id === "cattle.mb_ag.gladstone.slaughter.d1_2_cows");
    assert.ok(gladCows, "Gladstone D1, D2 cows");
    assert.equal(gladCows.price, 202.75);
    assert.equal(gladCows.lo, 190);
    assert.equal(gladCows.hi, 215.5);
    assert.equal(gladCows.asOf, "2026-09-15");
    assert.equal(gladCows.group, "cattle");
    assert.equal(gladCows.commodity, "Cows");
    assert.equal(gladCows.market, "Gladstone Auction Mart");
    assert.notEqual(gladCows.price, 201.25, "previous Gladstone average is not the print");
    const gladSteer = rows.find((row) => row.id === "cattle.mb_ag.gladstone.feeder-steer.401_500");
    assert.ok(gladSteer);
    assert.equal(gladSteer.price, 722.5);
    assert.equal(gladSteer.commodity, "Steers");
    const gladHeifer = rows.find((row) => row.id === "cattle.mb_ag.gladstone.feeder-heifer.401_500");
    assert.ok(gladHeifer);
    assert.equal(gladHeifer.price, 586.25);
    assert.equal(gladHeifer.commodity, "Heifers");
    const grunthalSteer = rows.find((row) => row.id === "cattle.mb_ag.grunthal.feeder-steer.501_600");
    assert.ok(grunthalSteer, "Grunthal steer band after NA rows stays a steer");
    assert.equal(grunthalSteer.price, 595);
    const grunthalHeifer = rows.find((row) => row.id === "cattle.mb_ag.grunthal.feeder-heifer.501_600");
    assert.ok(grunthalHeifer);
    assert.equal(grunthalHeifer.price, 505);
    assert.ok(!rows.some((row) => row.id === "cattle.mb_ag.grunthal.feeder-steer.901_plus"), "NA steer band is not invented");
    const steRoseBulls = rows.find((row) => row.id === "cattle.mb_ag.ste_rose.slaughter.bulls");
    assert.ok(steRoseBulls);
    assert.equal(steRoseBulls.price, 272);
    assert.equal(steRoseBulls.asOf, "2026-09-17");
    const steRoseHeavy = rows.find((row) => row.id === "cattle.mb_ag.ste_rose.feeder-heifer.901_plus");
    assert.equal(steRoseHeavy, undefined, "NA heifer band is not labeled from the missing steer row");
    const virden = rows.find((row) => row.id === "cattle.mb_ag.virden.feeder-steer.401_500");
    assert.ok(virden);
    assert.equal(virden.price, 770);
    assert.equal(virden.asOf, "2026-09-16");
    const winnipegCows = rows.find((row) => row.id === "cattle.mb_ag.winnipeg.slaughter.d3_cows");
    assert.ok(winnipegCows);
    assert.equal(winnipegCows.price, 160);
    assert.equal(winnipegCows.asOf, "2026-09-11");
    const winnipegHeavyHeifer = rows.find((row) => row.id === "cattle.mb_ag.winnipeg.feeder-heifer.901_plus");
    assert.ok(winnipegHeavyHeifer, "heifer 901+ stays a heifer when the steer band is NA");
    assert.equal(winnipegHeavyHeifer.price, 358.5);
    assert.equal(winnipegHeavyHeifer.commodity, "Heifers");
    assert.ok(!rows.some((row) => row.id === "cattle.mb_ag.winnipeg.feeder-steer.901_plus"));
    const lamb = rows.find((row) => row.id === "sheep.mb_ag.winnipeg.lambs.60_80");
    assert.ok(lamb, "Winnipeg lamb weight");
    assert.equal(lamb.price, 380);
    assert.equal(lamb.group, "sheep");
    assert.equal(lamb.asOf, "2026-09-16");
    assert.equal(lamb.unit, "C$/cwt");
    const kids = rows.find((row) => row.id === "goats.mb_ag.grunthal.kids");
    assert.ok(kids);
    assert.equal(kids.price, 390);
    assert.equal(kids.group, "goats");
    assert.match(kids.classGrade, /published C\$\/cwt/);
    assert.ok(!rows.some((row) => row.id === "sheep.mb_ag.grunthal.lambs.under_60"), "NA lamb band stays off");
    const seed = snapshotFromText(text, SEP18_URL, "2026-09-18T00:00:00.000Z");
    assert.equal(seed.product, PRODUCT_ID);
    assert.equal(seed.tickCount, rows.length);
    assert.deepEqual(seed.rows, rows);
    assert.equal(seed.asOf, "2026-09-17");
    assert.equal(seed.killed, null);
    assert.equal(seed.attribution, OPENMB_ATTRIBUTION);
    const onDisk = JSON.parse(readFileSync(join(repoRoot, "src/fixtures/ticks-mb-cattle/seed-2026-09-18.json"), "utf8"));
    assert.equal(onDisk.product, PRODUCT_ID);
    assert.equal(onDisk.attribution, OPENMB_ATTRIBUTION);
    assert.equal(onDisk.tickCount, rows.length);
    assert.deepEqual(onDisk.rows, rows);
    const older = parseMbWeeklyPrices(fx("cattle-2026-08-28.txt"), AUG28_URL);
    assert.equal(parseIssueDate(fx("cattle-2026-08-28.txt")), "2026-08-28");
    assert.ok(older.every((row) => row.reportDate === "2026-08-28"));
    assert.ok(!older.some((row) => /ashern|gladstone|killarney|ste_rose|virden/.test(row.id) && row.group === "cattle"), "Aug 28 no-sale cattle marts stay off");
    const grunthalBulls = older.find((row) => row.id === "cattle.mb_ag.grunthal.slaughter.bulls");
    assert.ok(grunthalBulls);
    assert.equal(grunthalBulls.price, 215.75);
    assert.equal(grunthalBulls.asOf, "2026-08-25");
    assert.ok(!older.some((row) => row.id.startsWith("cattle.mb_ag.grunthal.feeder-")), "NA feeder bands stay off");
    assert.ok(older.some((row) => row.id.startsWith("cattle.mb_ag.winnipeg.")));
    assert.ok(!older.some((row) => row.price === 216), "previous Grunthal cow average is not the print");
}
function mainKillSwitch() {
    const listing = `
    <a href="/agriculture/markets-and-statistics/livestock-statistics/pubs/cattle-sheep-goat-prices-2026-09-18.pdf">week</a>
    <a href="/agriculture/markets-and-statistics/livestock-statistics/pubs/cattle-sheep-goat-prices-2026-09-11.pdf">prev</a>
    <a href="${MONTHLY_HISTORIC_XLSX}">monthly</a>
    <a href="https://app.powerbi.com/view?r=eyJrIjoiZTE3">charts</a>
  `;
    assert.equal(isMonthlyHistoricUrl(MONTHLY_HISTORIC_XLSX), true);
    assert.deepEqual(candidateDumpUrls(listing), []);
    assert.equal(textDumpsWeeklyMartBody(listing), false);
    const listed = listWeeklyPdfs(listing);
    assert.equal(listed[0]?.date, "2026-09-18");
    assert.equal(listed[0]?.url, SEP18_URL);
    assert.equal(listed[1]?.date, "2026-09-11");
    const csvPage = `<a href="/agriculture/markets-and-statistics/livestock-statistics/pubs/cattle-sheep-goat-prices-2026-09-18.csv">csv</a>`;
    assert.deepEqual(candidateDumpUrls(csvPage), [
        "https://www.gov.mb.ca/agriculture/markets-and-statistics/livestock-statistics/pubs/cattle-sheep-goat-prices-2026-09-18.csv",
    ]);
    const dump = [
        "Ashern Gladstone Grunthal Killarney Ste Rose Virden Winnipeg",
        "C$/cwt Average Price Low Price Feeder Cattle D1, 2 Cows",
        "200.00 210.00 220.00 230.00 240.00 250.00 260.00 270.00",
    ].join("\n");
    assert.equal(textDumpsWeeklyMartBody(dump), true);
    const canfax = "Alberta Saskatchewan Canfax fed steers heifers 180.00 190.00 200.00 210.00 220.00 230.00 240.00 250.00";
    assert.equal(textDumpsWeeklyMartBody(canfax), false, "monthly category sheet with no mart names is not the weekly body");
    assert.ok(SKIPPED_MB.some((row) => row.id === "monthly-historic-xlsx"));
    assert.ok(SKIPPED_MB.some((row) => row.id === "new-path"));
    const prior = [
        { id: "cattle.ams_1281.okc.feeder-steer.ml1.826lb" },
        { id: "cattle.mb_ag.virden.feeder-steer.401_500" },
    ];
    const kept = foldMbIntoRows(prior, { killed: null, rows: [] });
    assert.deepEqual(kept.map((row) => row.id), prior.map((row) => row.id), "a fetch miss keeps the previous Manitoba rows");
    const wiped = foldMbIntoRows(prior, { killed: "free same-body dump at https://example.invalid/week.csv", rows: [] });
    assert.deepEqual(wiped.map((row) => row.id), ["cattle.ams_1281.okc.feeder-steer.ml1.826lb"]);
    const replaced = foldMbIntoRows(prior, {
        killed: null,
        rows: parseMbWeeklyPrices(fx("cattle-2026-09-18.txt"), SEP18_URL).slice(0, 1),
    });
    assert.equal(replaced.filter((row) => row.id.includes(".mb_ag.")).length, 1);
    assert.ok(replaced.some((row) => row.id.startsWith("cattle.ams_1281")));
}
async function mainLive() {
    const res = await fetch(SOURCE_PAGE, {
        headers: { Accept: "text/html", "User-Agent": "bnm-data-shop/1.0 (mb-cattle-test)" },
    });
    assert.equal(res.status, 200);
    const html = await res.text();
    const pdfs = listWeeklyPdfs(html);
    assert.ok(pdfs.some((row) => row.date === "2026-09-18"), "listing still links the seeded weekly PDF");
    assert.equal(candidateDumpUrls(html).length, 0, `unexpected free data link: ${candidateDumpUrls(html).join(" ")}`);
    assert.equal(textDumpsWeeklyMartBody(html), false);
    const killed = await weeklyMartDumpReason(html);
    assert.equal(killed, null, killed ?? "");
}
function mainBag() {
    assert.equal(TICKS_PATH, "/ticks");
    assert.equal(TICKS_PRICE, "0.05");
    assert.equal(PRODUCT_ID, "us-hay-cattle-grain-ticks");
    assert.ok(!TABLE_PATHS.has("/mb-cattle-prices"));
    assert.deepEqual([...TABLE_PATHS], ["/ticks", "/import-alerts"]);
    for (const copy of [TICKS_BAG, TICKS_402_DESCRIPTION, TICKS_OPENAPI_DESCRIPTION, TICKS_LLMS_BULLET]) {
        assert.ok(copy.includes("Manitoba"), "ticks copy names Manitoba");
        assert.ok(!copy.includes("/mb-cattle-prices"));
    }
    assert.ok(TICKS_402_DESCRIPTION.includes("$0.05 = entire current table."));
    assert.ok(TICKS_402_DESCRIPTION.length <= 500, `402 description length ${TICKS_402_DESCRIPTION.length}`);
    const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
    const shopIndex = readFileSync(join(repoRoot, "SHOP-INDEX.md"), "utf8");
    const openapi = JSON.parse(readFileSync(join(repoRoot, "openapi.json"), "utf8"));
    assert.equal(openapi.paths?.["/mb-cattle-prices"], undefined);
    const ticks = openapi.paths?.["/ticks"]?.get?.description ?? "";
    assert.ok(ticks.includes("Manitoba"));
    assert.equal(ticks, TICKS_OPENAPI_DESCRIPTION);
    assert.ok(readme.includes("Manitoba Agriculture weekly auction-mart cattle prices"));
    assert.ok(shopIndex.includes("Manitoba Agriculture weekly auction-mart cattle prices"));
    assert.ok(readme.includes(TICKS_BAG));
    assert.ok(shopIndex.includes(TICKS_BAG));
    const prevOnly = process.env.TICKS_AMS_ONLY_SLUGS;
    const prevLeft = process.env.TICKS_AMS_LEFTOVERS_ONLY;
    process.env.TICKS_AMS_ONLY_SLUGS = "";
    process.env.TICKS_AMS_LEFTOVERS_ONLY = "";
    assert.equal(shouldCollectMbCattle(), true);
    process.env.TICKS_AMS_ONLY_SLUGS = "2843";
    assert.equal(shouldCollectMbCattle(), false);
    process.env.TICKS_AMS_ONLY_SLUGS = "mb";
    assert.equal(shouldCollectMbCattle(), true);
    process.env.TICKS_AMS_LEFTOVERS_ONLY = "1";
    process.env.TICKS_AMS_ONLY_SLUGS = "";
    assert.equal(shouldCollectMbCattle(), false);
    if (prevOnly === undefined)
        delete process.env.TICKS_AMS_ONLY_SLUGS;
    else
        process.env.TICKS_AMS_ONLY_SLUGS = prevOnly;
    if (prevLeft === undefined)
        delete process.env.TICKS_AMS_LEFTOVERS_ONLY;
    else
        process.env.TICKS_AMS_LEFTOVERS_ONLY = prevLeft;
}
async function main() {
    mainPrices();
    mainKillSwitch();
    mainBag();
    await mainLive();
    const rows = parseMbWeeklyPrices(fx("cattle-2026-09-18.txt"), SEP18_URL);
    console.log(JSON.stringify({
        ok: true,
        product: PRODUCT_ID,
        path: TICKS_PATH,
        price: TICKS_PRICE,
        sep18: rows.length,
        aug28: parseMbWeeklyPrices(fx("cattle-2026-08-28.txt"), AUG28_URL).length,
    }));
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=ticks-mb-cattle.test.js.map