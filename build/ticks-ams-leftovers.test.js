import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AMS_LEFTOVER_REPORTS, jsonDumpsBody, leakTestSlug, looksLikeCattleAuction, parseCattleAuctionReport, parseReportDate, } from "./ticks-ams-leftovers.js";
const LIVE_SOURCES = "https://ticks.bnm.farm/catalog.json";
async function liveSourceSlugs() {
    const res = await fetch(LIVE_SOURCES, {
        headers: { Accept: "application/json", "User-Agent": "bnm-data-shop/1.0 (ams-leftover-test)" },
    });
    assert.equal(res.status, 200, "live catalog.json must be free");
    const body = (await res.json());
    const slugs = new Set();
    for (const name of Object.keys(body.latestAsOfBySource ?? {})) {
        const m = name.match(/AMS_([A-Za-z0-9_]+)/);
        if (m)
            slugs.add(m[1].toLowerCase());
    }
    return slugs;
}
async function main() {
    const here = dirname(fileURLToPath(import.meta.url));
    const fixture = readFileSync(join(here, "../src/fixtures/ams-leftover-cattle-auction.txt"), "utf8");
    assert.ok(looksLikeCattleAuction(fixture));
    assert.equal(parseReportDate(fixture), "2026-08-25");
    const report = AMS_LEFTOVER_REPORTS.find((r) => r.slug === "1988");
    assert.ok(report);
    const ticks = parseCattleAuctionReport(fixture, report, "https://www.ams.usda.gov/mnreports/ams_1988.pdf");
    assert.ok(ticks.length >= 2, "fixture must yield feeder ticks");
    assert.ok(ticks.every((t) => t.group === "cattle" && t.unit === "$/cwt"));
    assert.ok(ticks.every((t) => t.price >= 20 && t.price <= 900));
    assert.ok(!ticks.some((t) => /slaughter|cow/i.test(t.id)));
    assert.ok(ticks.some((t) => t.id.includes("feeder-steer")));
    assert.ok(ticks.some((t) => t.id.includes("feeder-heifer")));
    assert.equal(jsonDumpsBody('{"status":"403 - Forbidden","errorCode":403,"message":"Access is denied"}'), false);
    assert.equal(jsonDumpsBody(JSON.stringify({
        results: Array.from({ length: 8 }, () => ({
            price: 388.5,
            avg_price: 366.25,
            description: "feeder cattle steers weighted_avg",
        })),
    })), true);
    const live = await liveSourceSlugs();
    for (const leftover of AMS_LEFTOVER_REPORTS) {
        assert.ok(!live.has(leftover.slug.toLowerCase()), `AMS_${leftover.slug} must not already be on live /ticks`);
    }
    const leak = await leakTestSlug("1988");
    assert.ok(leak.ok, leak.reason);
    console.log(`ticks-ams-leftovers tests ok (${AMS_LEFTOVER_REPORTS.length} leftover slugs; fixture ticks ${ticks.length}; leak ${leak.reason})`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=ticks-ams-leftovers.test.js.map