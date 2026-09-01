import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoHardcodedDoorCount, extraMcpToolNames, fetchLiveCatalog, LIVE_ORIGIN, paidPathsFromWellKnown, readmeMarkdown, shopIndexMarkdown, skusFromWellKnown, } from "./shop-catalog.js";
const REQUIRED_LIVE_PATHS = [
    "/ticks",
    "/import-alerts",
    "/ofwat-enforcement",
    "/ofgem-enforcement",
    "/gain",
    "/orr-enforcement",
    "/form-483",
    "/gmp",
    "/gmp-md",
];
function fixtureWellKnown(paths) {
    return { resources: paths.map((p) => `${LIVE_ORIGIN}${p}`) };
}
async function main() {
    const two = skusFromWellKnown(fixtureWellKnown(["/ticks", "/ofwat-enforcement"]));
    assert.equal(two.length, 2);
    assert.equal(two[0].path, "/ticks");
    assert.equal(two[0].kind, "table");
    assert.equal(two[1].path, "/ofwat-enforcement");
    assert.equal(two[1].kind, "body");
    const pdf = skusFromWellKnown(fixtureWellKnown(["/csb-reports"]))[0];
    assert.equal(pdf.kind, "pdf");
    assert.equal(pdf.price, "$0.05");
    assert.match(pdf.bag, /US CSB final investigation report PDFs/);
    assert.doesNotMatch(pdf.bag, /not this|SaferProducts|CPSC/i);
    const md2 = shopIndexMarkdown(two);
    assert.match(md2, /\/ofwat-enforcement/);
    assert.doesNotMatch(md2, /36 doors|40 doors|Thirty-six|Forty paid/);
    assertNoHardcodedDoorCount(md2);
    assertNoHardcodedDoorCount(readmeMarkdown(two));
    const live = await fetchLiveCatalog();
    const paths = paidPathsFromWellKnown(live.wellKnown);
    assert.ok(paths.length >= 1, "live well-known lists paid GETs");
    for (const path of REQUIRED_LIVE_PATHS) {
        assert.ok(paths.includes(path), `live well-known lists ${path}`);
    }
    assert.ok(!paths.includes("/sample"), "/sample is free, not a paid SKU");
    assert.deepEqual(live.skus.map((s) => s.path), paths, "SKU order matches live well-known");
    assert.ok(extraMcpToolNames().includes("search") && extraMcpToolNames().includes("firm-check"), "MCP adds free search and firm-check");
    const index = shopIndexMarkdown(live.skus);
    const readme = readmeMarkdown(live.skus);
    assertNoHardcodedDoorCount(index);
    assertNoHardcodedDoorCount(readme);
    for (const path of paths) {
        assert.ok(index.includes(`\`${path}\``), `SHOP-INDEX lists ${path}`);
        assert.ok(readme.includes(`\`${path}\``), `README lists ${path}`);
    }
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const shopIndexOnDisk = readFileSync(join(root, "SHOP-INDEX.md"), "utf8");
    const readmeOnDisk = readFileSync(join(root, "README.md"), "utf8");
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const server = JSON.parse(readFileSync(join(root, "server.json"), "utf8"));
    assertNoHardcodedDoorCount(shopIndexOnDisk);
    assertNoHardcodedDoorCount(readmeOnDisk);
    assertNoHardcodedDoorCount(pkg.description);
    assertNoHardcodedDoorCount(server.description);
    for (const path of paths) {
        assert.ok(shopIndexOnDisk.includes(`\`${path}\``), `checked-in SHOP-INDEX lists ${path}`);
    }
    assert.ok(!shopIndexOnDisk.includes("36 doors"), "checked-in SHOP-INDEX dropped the stale 36");
    const liveOpenapiHasFour = ["/ofwat-enforcement", "/ofgem-enforcement", "/gain", "/orr-enforcement"].every((p) => Boolean(live.openApi.paths?.[p]));
    assert.ok(liveOpenapiHasFour, "live OpenAPI already lists the four doors");
    console.log(`shop-catalog tests ok (live paid GETs: ${paths.length}; MCP extras: ${extraMcpToolNames().join(",")})`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=shop-catalog.test.js.map