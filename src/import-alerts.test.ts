import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIRST_SLICE,
  ROW_FIELDS,
  parseAlertPage,
  parseCatalog,
  sampleRowsFrom,
} from "./import-alerts.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/cms_ia");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

function main(): void {
  const catalog = parseCatalog(readFx("ialist-excerpt.html"));
  const byNum = Object.fromEntries(catalog.map((c) => [c.alertNumber, c]));
  assert.equal(catalog.length, 8, "official excerpt has eight catalog rows");
  assert.equal(byNum["16-81"]?.pageId, "49");
  assert.equal(byNum["16-81"]?.type, "DWPE");
  assert.equal(byNum["16-81"]?.firstSlice, true);
  assert.equal(byNum["16-105"]?.pageId, "19");
  assert.equal(byNum["16-105"]?.firstSlice, false);
  assert.equal(byNum["66-40"]?.pageId, "189");
  assert.equal(byNum["99-05"]?.pageId, "258");
  assert.equal(byNum["99-08"]?.pageId, "259");
  assert.equal(byNum["99-19"]?.pageId, "263");
  assert.equal(byNum["99-23"]?.pageId, "266");
  assert.equal(byNum["16-39"]?.firstSlice, false);
  assert.ok(byNum["16-81"]?.name.includes("Salmonella"));
  for (const slice of FIRST_SLICE) {
    assert.ok(
      catalog.some((c) => c.pageId === slice.pageId && c.alertNumber === slice.alertNumber),
      `catalog excerpt must include first-slice ${slice.alertNumber}`,
    );
  }

  const seafood = parseAlertPage(readFx("importalert_49-excerpt.html"), "49", byNum["16-81"]);
  assert.equal(seafood.summary.hasRedHeading, true);
  assert.equal(seafood.summary.hasGreenHeading, false);
  assert.equal(seafood.summary.emptyReason, null);
  assert.equal(seafood.summary.asOf, "2026-08-17");
  assert.equal(seafood.summary.alertNumber, "16-81");
  assert.ok(seafood.rows.length >= 3, "official Clover Valley products present");
  const clover = seafood.rows.filter((r) => r.firm === "Clover Valley Meat Co.");
  assert.ok(clover.length >= 1, "Clover Valley Meat Co. is on the official 16-81 red list");
  assert.equal(clover[0]?.country, "AUSTRALIA");
  assert.equal(clover[0]?.list, "red");
  assert.ok(clover.some((r) => r.product.includes("Alligator")));
  for (const row of clover) {
    assert.deepEqual(Object.keys(row).sort(), [...ROW_FIELDS].sort());
    assert.equal(row.sourceUrl, "https://www.accessdata.fda.gov/cms_ia/importalert_49.html");
    assert.equal(row.asOf, "2026-08-17");
    assert.match(JSON.stringify(row), /^(?!.*@).*$/);
  }

  const green = parseAlertPage(readFx("importalert_261-green-excerpt.html"), "261");
  assert.equal(green.summary.hasRedHeading, false);
  assert.equal(green.summary.hasGreenHeading, true);
  assert.equal(green.summary.emptyReason, null);
  assert.ok(green.rows.length >= 1);
  assert.equal(green.rows[0]?.list, "green");
  assert.equal(green.rows[0]?.firm, "Angel Yi dba Produccion Agricola Universal S A");
  assert.equal(green.rows[0]?.country, "DOMINICAN REPUBLIC (THE)");
  assert.ok(green.rows.some((r) => r.product.includes("Peas")));

  const empty = parseAlertPage(readFx("no-firm-block.html"), "49");
  assert.equal(empty.summary.hasRedHeading, false);
  assert.equal(empty.summary.hasGreenHeading, false);
  assert.deepEqual(empty.rows, []);
  assert.equal(empty.summary.emptyReason, "no firm block");
  assert.equal(empty.summary.firmCount, 0);

  const samples = sampleRowsFrom(clover, 2);
  assert.ok(samples.every((s) => s.sample === true));
  assert.ok(samples.length <= 2);

  console.log("import-alerts parser tests ok");
}

main();
