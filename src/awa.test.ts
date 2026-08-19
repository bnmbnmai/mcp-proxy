import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  CARD_FIELDS,
  INDEX_URL,
  LICENSE,
  buildAwaManifest,
  collectAwa,
  contentIdFromUrl,
  isRealAwaBody,
  officialPdfUrl,
  parseAwaText,
  parseListingJson,
  parseObservations,
} from "./awa.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/aphis-awa");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listed = parseListingJson(JSON.parse(readFx("listing-excerpt.json")));
  assert.ok(listed.length >= 5, "official Salesforce excerpt lists per-report PDFs");
  const utah = listed.find((r) => r.contentId === "068SJ00001KXrsj");
  assert.ok(utah);
  assert.equal(utah?.firm, "Utah State University");
  assert.equal(utah?.date, "2026-07-07");
  assert.equal(utah?.certificate, "87-R-0002");
  assert.ok(utah?.sourceUrl.startsWith("https://aphis.file.force.com/sfc/dist/version/download/"));
  assert.equal(contentIdFromUrl(utah?.sourceUrl ?? ""), "068SJ00001KXrsj");
  assert.ok(listed.some((r) => r.contentId === "068SJ00001Li8K4" && /Alaska/i.test(r.firm)));
  assert.ok(listed.every((r) => officialPdfUrl(r.sourceUrl)));
  assert.equal(officialPdfUrl("https://github.com/data-liberation-project/aphis-inspection-reports"), null);
  assert.equal(officialPdfUrl("https://www.fda.gov/media/193964/download"), null);
  assert.ok(INDEX_URL.includes("aphis.my.site.com/PublicSearchTool/s/inspection-reports"));

  const utahText = parseAwaText(readFx("068SJ00001KXrsj.txt"), {
    sourceUrl: utah!.sourceUrl,
    firm: "Utah State University",
    date: "2026-07-07",
    certificate: "87-R-0002",
    customerNumber: "2",
  });
  assert.equal(utahText.contentId, "068SJ00001KXrsj");
  assert.equal(utahText.firm, "Utah State University");
  assert.ok(isRealAwaBody(utahText.body));
  assert.ok(utahText.body.includes("Animal and Plant Health Inspection Service"));
  assert.ok(utahText.body.includes("naked mole rats"));
  assert.equal(utahText.inspectionId, "INS-0001617878");
  assert.match(utahText.inspectionType ?? "", /ROUTINE INSPECTION/);
  const cites = parseObservations(utahText.body);
  assert.ok(cites.some((o) => o.cite === "2.31(c)(7)" && o.severity === "Critical"));
  assert.ok(cites.some((o) => o.cite === "2.33(b)(4)" && /anesthetic/i.test(o.text)));
  assert.ok(CARD_FIELDS.every((f) => f in utahText));
  assert.ok(!/data.?liberation|cms.?2567|form 483|cqc/i.test(JSON.stringify(utahText)));

  const alaska = parseAwaText(readFx("068SJ00001Li8K4.txt"), {
    sourceUrl:
      "https://aphis.file.force.com/sfc/dist/version/download/?oid=00Dt0000000GyZH&ids=068SJ00001Li8K4&d=%2Fa&asPdf=false",
    firm: "University Of Alaska - Anchorage",
    date: "2026-07-22",
  });
  assert.ok(isRealAwaBody(alaska.body));
  assert.ok(/no non-compliant items/i.test(alaska.body));
  assert.equal(alaska.observations.length, 0);

  const fake483 = parseAwaText(readFx("no-observation.txt"), {
    sourceUrl: "https://www.fda.gov/media/193964/download",
    firm: "Cascade Specialty Pharmacy LLC",
  });
  assert.equal(isRealAwaBody(fake483.body), false, "Form 483 / CMS 2567 / CQC is not this SKU");

  const warningLike = parseAwaText(
    "WARNING LETTER\nMarch 4, 2026\nThis is to advise you that FDA reviewed your website.",
    { sourceUrl: "https://www.fda.gov/media/1/download", firm: "Citra100mg" },
  );
  assert.equal(isRealAwaBody(warningLike.body), false, "FDA warning-letter HTML is not this SKU");

  const manifest = buildAwaManifest({
    ok: true,
    product: "aphis-awa-inspection-observation-text",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-19T00:00:00.000Z",
    asOf: "2026-07-07",
    license: LICENSE,
    sources: {
      index: INDEX_URL,
      aura: "https://aphis.my.site.com/PublicSearchTool/s/sfsites/aura",
      pdfHost: "https://aphis.file.force.com/sfc/dist/version/download/",
      hub: "https://www.aphis.usda.gov/awa/public-search",
    },
    cards: [utahText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.equal((manifest.cards as { firm: string }[])[0]?.firm, "Utah State University");
  assert.equal((manifest.cards as { date: string }[])[0]?.date, "2026-07-07");
  assert.ok(!manBlob.includes("naked mole rats"), "free manifest must not dump observation text");
  assert.ok(!manBlob.includes("Institutional Animal Care"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(!("observations" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("068SJ00001KXrsj"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");

  const cache = mkdtempSync(join(tmpdir(), "awa-collect-"));
  const prevDir = process.env.AWA_DIR;
  process.env.AWA_DIR = cache;
  try {
    const snap = await collectAwa({ htmlDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts several official bodies");
    assert.ok(snap.cards.some((c) => c.contentId === "068SJ00001KXrsj" && isRealAwaBody(c.body)));
    assert.ok(snap.cards.some((c) => c.contentId === "068SJ00001Li8K4" && isRealAwaBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealAwaBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.contentId === "068SJ00001LzQ69"), "no invented body when official text is absent");
    assert.ok(snap.cards.every((c) => officialPdfUrl(c.sourceUrl)));
    assert.ok(snap.cards.every((c) => !/data-liberation|github.com/i.test(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectAwa({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.contentId === "068SJ00001KXrsj"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.AWA_DIR;
    else process.env.AWA_DIR = prevDir;
  }

  console.log("awa parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
