import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LNM_LISTING_URL,
  NOTICE_FIELDS,
  buildMarinersManifest,
  latestEdition,
  parseListingHtml,
  parseLnmText,
} from "./mariners.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/lnm-d13");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

function main(): void {
  const editions = parseListingHtml(readFx("listing-excerpt.html"));
  assert.deepEqual(
    editions.map((e) => e.edition),
    ["31-2026", "32-2026"],
    "official listing excerpt has weeks 31 and 32 of 2026",
  );
  const latest = latestEdition(editions);
  assert.equal(latest?.edition, "32-2026");
  assert.equal(
    latest?.sourceUrl,
    "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
  );

  const parsed = parseLnmText(readFx("lnm13322026-excerpt.txt"), {
    week: "32-2026",
    sourceUrl: latest!.sourceUrl,
  });
  assert.equal(parsed.asOf, "2026-08-12");
  assert.ok(parsed.notices.length >= 8, "official excerpt has aid rows and MSI blocks");
  assert.ok(
    parsed.notices.every((n) => n.week === "32-2026" && n.sourceUrl === latest!.sourceUrl),
  );
  assert.ok(
    parsed.notices.some(
      (n) =>
        n.section === "Federal Discrepancies" &&
        n.waterway === "Anacortes Harbor" &&
        n.text.includes("Anacortes Channel Light 4") &&
        n.text.includes("19055"),
    ),
    "Anacortes Channel Light 4 is on the official week 32 PDF",
  );
  assert.ok(
    parsed.notices.some(
      (n) => n.section === "Additional MSI Categories" && /ESSAYONS/i.test(n.text),
    ),
    "Astoria ESSAYONS dredging notice is official text",
  );
  assert.ok(
    !parsed.notices.some((n) => /we are not inventing|organic hay/i.test(n.text)),
  );

  const manifest = buildMarinersManifest({
    ok: true,
    product: "uscg-d13-lnm",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-18T00:00:00.000Z",
    asOf: parsed.asOf,
    week: "32-2026",
    year: 2026,
    edition: "32-2026",
    district: "13",
    districtName: "Northwest",
    sources: {
      listing: LNM_LISTING_URL,
      pdfPattern: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13{WW}{YYYY}.pdf",
      pdfUrl: latest!.sourceUrl,
    },
    editions,
    notices: parsed.notices,
  });
  assert.equal(manifest.free, true);
  assert.equal(manifest.noticeCount, parsed.notices.length);
  assert.equal(manifest.week, "32-2026");
  assert.deepEqual(manifest.schema && (manifest.schema as { fields: string[] }).fields, [...NOTICE_FIELDS]);
  const blob = JSON.stringify(manifest);
  assert.ok(!blob.includes("ESSAYONS"), "free manifest must not include notice body");
  assert.ok(!blob.includes("Anacortes Channel Light 4"), "free manifest must not include aid text");
  assert.ok(blob.includes(LNM_LISTING_URL));

  console.log("mariners parser tests ok");
}

main();
