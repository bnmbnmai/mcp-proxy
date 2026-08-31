import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  AAIB_REPORTS_MANIFEST_PATH,
  AAIB_REPORTS_PATH,
  ATTRIBUTION,
  CARD_FIELDS,
  INDEX_URL,
  LICENSE,
  SEED_LISTINGS,
  buildAaibReportsManifest,
  buildAaibReportsPaidPage,
  collectAaibReports,
  filterAaibReportsManifest,
  isOfficialAaibReportPdf,
  isRealAaibReportBody,
  officialAaibPageUrl,
  officialAaibReportPdfUrl,
  parseAaibReportText,
  parseContentDocument,
  parseListingRows,
  parseSearchJson,
} from "./aaib-reports.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/aaib-reports");

const EUROFOX_ID = "aaib-investigation-to-eurofox-2k-g-cmax";
const EUROFOX_PDF =
  "https://assets.publishing.service.gov.uk/media/6a730cd0de77e2943cd3bbe8/Eurofox_2K_G-CMAX_09-26.pdf";
const EUROFOX_PAGE = "https://www.gov.uk/aaib-reports/aaib-investigation-to-eurofox-2k-g-cmax";
const SKYRANGER_ID = "aaib-investigation-to-skyranger-swift-912s-1-g-mlzz";
const EMBRAER_ID = "aaib-investigation-to-embraer-190ar-zs-yad";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const fromSearch = parseListingRows(parseSearchJson(readFx("listing-excerpt.json")));
  assert.ok(fromSearch.some((r) => r.id === EUROFOX_ID), "search excerpt yields Eurofox G-CMAX");
  assert.ok(fromSearch.every((r) => officialAaibPageUrl(r.pageUrl)));
  assert.equal(
    fromSearch.some((r) => /annual-safety-review|raib-reports/i.test(r.pageUrl)),
    false,
    "skip Annual Safety Review and RAIB",
  );

  const listed = parseListingRows(SEED_LISTINGS);
  assert.equal(listed.length, 10, "first slice is the ten official investigation-report PDFs");
  assert.ok(listed.every((r) => officialAaibReportPdfUrl(r.sourceUrl)));
  assert.equal(listed[0]?.id, EUROFOX_ID, "newest seed is Eurofox 2K G-CMAX published 2026-08-20");
  assert.equal(listed[0]?.date, "2026-08-20");
  assert.equal(officialAaibReportPdfUrl(EUROFOX_PDF), EUROFOX_PDF);
  assert.equal(officialAaibPageUrl(EUROFOX_PAGE), EUROFOX_PAGE);
  assert.equal(
    officialAaibPageUrl("https://www.gov.uk/aaib-reports/aaib-annual-safety-review-2025"),
    null,
    "Annual Safety Review is not an investigation-report page",
  );
  assert.equal(
    officialAaibPageUrl("https://www.gov.uk/raib-reports/some-rail-accident"),
    null,
    "RAIB stays PARK",
  );
  assert.equal(
    officialAaibReportPdfUrl(
      "https://assets.publishing.service.gov.uk/media/6a730cf4332792bd88ece534/Glossary_of_abbreviations.pdf",
    ),
    null,
    "glossary PDF is not sold",
  );
  assert.ok(isOfficialAaibReportPdf(EUROFOX_PDF));
  assert.ok(INDEX_URL.includes("/aaib-reports"));

  const eurofox = parseAaibReportText(readFx(`${EUROFOX_ID}.txt`), {
    sourceUrl: EUROFOX_PDF,
    pageUrl: EUROFOX_PAGE,
    registration: "G-CMAX",
    aircraft: "Eurofox 2K",
    date: "2026-08-20",
    id: EUROFOX_ID,
    title: "AAIB investigation to Eurofox 2K, G-CMAX",
  });
  assert.equal(eurofox.id, EUROFOX_ID);
  assert.ok(isRealAaibReportBody(eurofox.body), "Eurofox PDF excerpt is official AAIB TEXT");
  assert.ok(eurofox.body.includes("G-CMAX"));
  assert.ok(eurofox.body.includes("AAIB Bulletin"));
  assert.ok(eurofox.body.includes("Talgarth"));
  assert.ok(CARD_FIELDS.every((f) => f in eurofox));

  const skyranger = parseAaibReportText(readFx(`${SKYRANGER_ID}.txt`), {
    sourceUrl: SEED_LISTINGS[1].sourceUrl,
    pageUrl: SEED_LISTINGS[1].pageUrl,
    registration: "G-MLZZ",
    aircraft: "Skyranger Swift 912S(1)",
    date: "2026-08-13",
    id: SKYRANGER_ID,
  });
  assert.ok(isRealAaibReportBody(skyranger.body));
  assert.ok(skyranger.body.includes("G-MLZZ"));

  const embraer = parseAaibReportText(readFx(`${EMBRAER_ID}.txt`), {
    sourceUrl: SEED_LISTINGS[3].sourceUrl,
    pageUrl: SEED_LISTINGS[3].pageUrl,
    registration: "ZS-YAD",
    aircraft: "Embraer 190AR",
    date: "2026-07-16",
    id: EMBRAER_ID,
  });
  assert.ok(isRealAaibReportBody(embraer.body));
  assert.ok(embraer.body.includes("ZS-YAD"));

  const teaser = parseAaibReportText(readFx("teaser.txt"), {
    sourceUrl: EUROFOX_PDF,
    pageUrl: EUROFOX_PAGE,
    registration: "G-CMAX",
    aircraft: "Eurofox 2K",
  });
  assert.equal(isRealAaibReportBody(teaser.body), false, "Content API synopsis is not the PDF body");

  const glossary = parseAaibReportText(readFx("glossary.txt"), {
    sourceUrl: EUROFOX_PDF,
    pageUrl: EUROFOX_PAGE,
  });
  assert.equal(isRealAaibReportBody(glossary.body), false, "glossary PDF is not this SKU");

  const raib = parseAaibReportText(readFx("raib.txt"), {
    sourceUrl: EUROFOX_PDF,
    pageUrl: EUROFOX_PAGE,
  });
  assert.equal(isRealAaibReportBody(raib.body), false, "RAIB stays PARK");

  const annual = parseAaibReportText(readFx("annual-review.txt"), {
    sourceUrl: EUROFOX_PDF,
    pageUrl: EUROFOX_PAGE,
  });
  assert.equal(isRealAaibReportBody(annual.body), false, "Annual Safety Review is not an occurrence report");

  const cadors = parseAaibReportText(readFx("cadors.txt"), {
    sourceUrl: EUROFOX_PDF,
    pageUrl: EUROFOX_PAGE,
  });
  assert.equal(isRealAaibReportBody(cadors.body), false, "do not wrap no-auth JSON");

  const people = parseAaibReportText(readFx("people.txt"), {
    sourceUrl: EUROFOX_PDF,
    pageUrl: EUROFOX_PAGE,
  });
  assert.equal(isRealAaibReportBody(people.body), false, "people file is not this SKU");

  const contentDoc = parseContentDocument(
    JSON.stringify({
      title: "AAIB investigation to Eurofox 2K, G-CMAX",
      base_path: "/aaib-reports/aaib-investigation-to-eurofox-2k-g-cmax",
      first_published_at: "2026-08-20T10:00:29+01:00",
      details: {
        body: "<p>Immediately after takeoff — synopsis only</p>",
        metadata: { aircraft_type: "Eurofox 2K", registration: "G-CMAX" },
        attachments: [
          {
            title: "Eurofox 2K, G-CMAX 09-26",
            url: EUROFOX_PDF,
            content_type: "application/pdf",
          },
          {
            title: "Glossary of abbreviations",
            url: "https://assets.publishing.service.gov.uk/media/6a730cf4332792bd88ece534/Glossary_of_abbreviations.pdf",
            content_type: "application/pdf",
          },
        ],
      },
    }),
  );
  assert.equal(contentDoc?.id, EUROFOX_ID);
  assert.equal(contentDoc?.sourceUrl, EUROFOX_PDF);
  assert.ok(!JSON.stringify(contentDoc).includes("Immediately after takeoff"), "content parse drops synopsis");

  const snapCards = SEED_LISTINGS.map((row) =>
    parseAaibReportText(readFx(`${row.id}.txt`), row),
  );
  assert.ok(snapCards.every((c) => isRealAaibReportBody(c.body)), "all ten first-slice excerpts are real AAIB TEXT");

  const manifest = buildAaibReportsManifest({
    ok: true,
    product: "aaib-investigation-report-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-31T00:00:00.000Z",
    asOf: "2026-08-20",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      index: INDEX_URL,
      search: "https://www.gov.uk/api/search.json?filter_format=aaib_report",
      pdfHost: "https://assets.publishing.service.gov.uk/media/",
    },
    cards: snapCards,
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 10);
  assert.equal((manifest.cards as { id: string }[])[0]?.id, EUROFOX_ID);
  assert.ok(!manBlob.includes("Talgarth Airfield, Powys, 27 December"), "free manifest must not dump PDF body");
  assert.ok(!manBlob.includes("Rotax 915"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(!manBlob.includes("Immediately after takeoff"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, LICENSE);
  assert.match(String(manifest.attribution), /Open Government Licence v3\.0/);
  assert.equal(manifest.license, "OGL v3.0");
  assert.equal(AAIB_REPORTS_PATH, "/aaib-reports");
  assert.equal(AAIB_REPORTS_MANIFEST_PATH, "/aaib-reports/manifest.json");

  const searched = filterAaibReportsManifest(manifest, "cmax");
  assert.equal(searched.cardCount, 1);
  assert.equal((searched.cards as { id: string }[])[0]?.id, EUROFOX_ID);

  const paidOne = buildAaibReportsPaidPage(
    {
      ok: true,
      product: "aaib-investigation-report-bodies",
      status: "ok",
      reason: null,
      fetchedAt: "2026-08-31T00:00:00.000Z",
      asOf: "2026-08-20",
      license: LICENSE,
      attribution: ATTRIBUTION,
      sources: {
        index: INDEX_URL,
        search: "https://www.gov.uk/api/search.json?filter_format=aaib_report",
        pdfHost: "https://assets.publishing.service.gov.uk/media/",
      },
      cards: snapCards,
    },
    { id: EUROFOX_ID },
  );
  assert.equal(paidOne.recordCount, 1);
  assert.equal((paidOne.records as { type: string }[])[0]?.type, "aaib-reports");
  assert.ok(JSON.stringify(paidOne).includes("G-CMAX"), "paid ?id= includes the official text");

  const cache = mkdtempSync(join(tmpdir(), "aaib-reports-collect-"));
  const prevDir = process.env.AAIB_REPORTS_DIR;
  process.env.AAIB_REPORTS_DIR = cache;
  try {
    const snap = await collectAaibReports({ htmlDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.equal(snap.cards.length, 10, "first slice harvests the ten official bodies");
    assert.equal(snap.asOf, "2026-08-20");
    assert.ok(snap.cards.some((c) => c.id === EUROFOX_ID && isRealAaibReportBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealAaibReportBody(c.body)));
    assert.ok(snap.cards.every((c) => officialAaibReportPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectAaibReports({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === EUROFOX_ID), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 10);
  } finally {
    if (prevDir === undefined) delete process.env.AAIB_REPORTS_DIR;
    else process.env.AAIB_REPORTS_DIR = prevDir;
  }

  console.log("aaib-reports parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
