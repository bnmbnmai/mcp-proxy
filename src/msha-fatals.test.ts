import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BAILEY_ID,
  BODY_NEEDLE_DEER_RUN,
  BODY_NEEDLE_OHIO,
  BODY_NEEDLE_PANTHER,
  CARD_FIELDS,
  DANBY_ID,
  DEER_RUN_ID,
  DEER_RUN_PAGE,
  LICENSE,
  MSHA_FATALS_AMOUNT_ATOMIC,
  MSHA_FATALS_MANIFEST_PATH,
  MSHA_FATALS_ONE_AMOUNT_ATOMIC,
  MSHA_FATALS_PATH,
  OHIO_COUNTY_ID,
  PANTHER_EAGLE_ID,
  PRODUCT_ID,
  SEARCH_URL,
  SEED_LISTINGS,
  buildMshaManifest,
  collectMshaFatals,
  filterMshaManifestBySector,
  isPreliminaryReport,
  isRealMshaBody,
  officialFinalPageUrl,
  officialMshaPdfUrl,
  parseFatalitySearch,
  parseMshaReportText,
} from "./msha-fatals.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/msha-fatals");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(MSHA_FATALS_PATH, "/msha-fatals");
  assert.equal(MSHA_FATALS_MANIFEST_PATH, "/msha-fatals/manifest.json");
  assert.equal(MSHA_FATALS_AMOUNT_ATOMIC, "50000");
  assert.equal(MSHA_FATALS_ONE_AMOUNT_ATOMIC, "20000");
  assert.equal(LICENSE, "17 USC 105");
  assert.ok(ATTRIBUTION.includes("17 U.S.C."));
  assert.equal(PRODUCT_ID, "msha-fatality-final-bodies");
  assert.ok(SEARCH_URL.includes("/fatality-reports/search"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(CARD_FIELDS.includes("rootCauses"));
  assert.ok(CARD_FIELDS.includes("enforcement"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === DEER_RUN_ID && row.mine === "Deer Run Mine"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === PANTHER_EAGLE_ID));
  assert.ok(SEED_LISTINGS.some((row) => row.id === OHIO_COUNTY_ID));
  assert.equal(officialFinalPageUrl(DEER_RUN_PAGE), DEER_RUN_PAGE);
  assert.equal(officialFinalPageUrl("https://www.msha.gov/data-reports/fatality-reports/2026/august-13-2026-fatality/preliminary-report"), null);
  assert.equal(officialMshaPdfUrl("https://example.com/April-Final-Report.pdf"), null);
  assert.ok(
    officialMshaPdfUrl(
      "https://www.msha.gov/sites/default/files/Data_Reports/Fatals/Enforcement/2026/March%205%2C%202026%20-%20Final%20Report.pdf",
    )?.includes("Final"),
  );
  assert.equal(
    officialMshaPdfUrl(
      "https://www.msha.gov/sites/default/files/Data_Reports/Fatals/Enforcement/2026/May%2019%2C%202026-Preliminary%20Report.pdf",
    ),
    null,
  );

  const listed = parseFatalitySearch(readFx("listing.html"));
  assert.equal(listed.length, 5, "preliminary and alert-only rows are not this SKU");
  assert.ok(listed.every((row) => row.pageUrl.endsWith("/final-report")));
  assert.equal(listed.find((row) => row.id === DEER_RUN_ID)?.mine, "Deer Run Mine");
  assert.equal(listed.find((row) => row.id === DEER_RUN_ID)?.state, "Illinois");
  assert.equal(listed.find((row) => row.id === DEER_RUN_ID)?.sector, "coal");
  assert.equal(listed.find((row) => row.id === DEER_RUN_ID)?.accidentDate, "2026-03-05");
  assert.equal(listed.find((row) => row.id === DEER_RUN_ID)?.classification, "Machinery");
  assert.equal(listed.find((row) => row.id === DANBY_ID)?.sector, "metal/nonmetal");
  assert.equal(listed.find((row) => row.id === BAILEY_ID)?.accidentDate, "2026-05-19");
  assert.ok(!listed.some((row) => row.mine === "Perry"));

  assert.equal(isPreliminaryReport(readFx("preliminary.txt")), true);
  assert.equal(isRealMshaBody(readFx("preliminary.txt")), false);

  const deer = parseMshaReportText(readFx("FAI-F00BE1D-1.txt"), {
    id: DEER_RUN_ID,
    pageUrl: DEER_RUN_PAGE,
    accidentDate: "2026-03-05",
    reportDate: "2026-08-11",
    classification: "Machinery",
    sector: "coal",
    state: "Illinois",
  });
  assert.ok(deer);
  assert.equal(deer?.id, DEER_RUN_ID);
  assert.equal(deer?.mine, "Deer Run Mine");
  assert.equal(deer?.operator, "Patton Mining LLC");
  assert.equal(deer?.state, "Illinois");
  assert.equal(deer?.sector, "coal");
  assert.equal(deer?.accidentDate, "2026-03-05");
  assert.equal(deer?.reportDate, "2026-08-11");
  assert.equal(deer?.classification, "Machinery");
  assert.equal(deer?.victimRole, "continuous mining machine operator");
  assert.equal(deer?.rootCauses.length, 2);
  assert.ok(deer?.rootCauses[0]?.includes("red zone"));
  assert.ok(deer?.enforcement.some((row) => row.action === "103(k) order"));
  assert.ok(deer?.enforcement.some((row) => row.action === "104(d)(2) order" && row.standard.includes("75.220")));
  assert.ok(deer?.body.includes(BODY_NEEDLE_DEER_RUN));
  assert.ok(!deer?.body.includes("\f"));

  const panther = parseMshaReportText(readFx("FAI-6322887-1.txt"), {
    id: PANTHER_EAGLE_ID,
    pageUrl: "https://www.msha.gov/data-reports/fatality-reports/2026/april-2-2026-fatality/final-report",
    accidentDate: "2026-04-02",
    reportDate: "2026-07-24",
    classification: "Fall of Roof or Back",
    sector: "coal",
    state: "West Virginia",
  });
  assert.equal(panther?.mine, "Panther Eagle Mine");
  assert.equal(panther?.operator, "Marfork Coal Company");
  assert.equal(panther?.victimRole, "shuttle car operator");
  assert.ok((panther?.rootCauses.length ?? 0) >= 1);
  assert.ok(panther?.citations.includes(BODY_NEEDLE_PANTHER));
  assert.ok(panther?.enforcement.some((row) => row.citation === BODY_NEEDLE_PANTHER));

  const ohio = parseMshaReportText(readFx("FAI-F0143E4-1.txt"), {
    id: OHIO_COUNTY_ID,
    pageUrl: "https://www.msha.gov/data-reports/fatality-reports/2026/april-3-2026-fatality/final-report",
    accidentDate: "2026-04-03",
    reportDate: "2026-06-30",
    classification: "Powered Haulage",
    sector: "coal",
  });
  assert.equal(ohio?.mine, "Ohio County Mine");
  assert.equal(ohio?.operator, "Ohio County Coal Resources, Inc.");
  assert.equal(ohio?.victimRole, "section supervisor");
  assert.ok(ohio?.body.includes(BODY_NEEDLE_OHIO));
  assert.ok(ohio?.enforcement.some((row) => row.action === "314(b) safeguard"));

  const danby = parseMshaReportText(readFx("FAI-F031904-1.txt"), {
    id: DANBY_ID,
    accidentDate: "2026-01-19",
    reportDate: "2026-07-07",
    sector: "metal/nonmetal",
    pageUrl: "https://www.msha.gov/data-reports/fatality-reports/2026/january-19-2026-fatality/final-report",
  });
  assert.equal(danby?.sector, "metal/nonmetal");
  assert.equal(danby?.operator, "Vermont Quarries Corp.");
  assert.equal(danby?.mine, "Danby Quarry");
  assert.equal(danby?.victimRole, "mill saw operator");

  const bailey = parseMshaReportText(readFx("FAI-F012928-1.txt"), {
    id: BAILEY_ID,
    accidentDate: "2026-05-19",
    reportDate: "2026-08-28",
    sector: "coal",
    pageUrl: "https://www.msha.gov/data-reports/fatality-reports/2026/may-19-2026-fatality/final-report",
  });
  assert.equal(bailey?.mine, "Bailey Mine");
  assert.equal(bailey?.operator, "Consol Pennsylvania Coal Company, LLC");
  assert.equal(bailey?.victimRole, "assistant shift foreman");
  assert.equal(bailey?.state, "Pennsylvania");

  const dir = mkdtempSync(join(tmpdir(), "msha-fatals-"));
  const prevDir = process.env.MSHA_FATALS_DIR;
  process.env.MSHA_FATALS_DIR = dir;
  const snap = await collectMshaFatals({ listingDir: fixtures, limit: 8, maxFetch: 0 });
  assert.equal(snap.listedCount, 5);
  assert.equal(snap.cards.length, 5);
  assert.ok(snap.cards.some((card) => card.id === DEER_RUN_ID && card.rootCauses.length === 2));
  assert.equal(snap.asOf, "2026-08-28");
  const manifest = buildMshaManifest(snap);
  const manifestJson = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 5);
  assert.equal(manifest.asOf, "2026-08-28");
  assert.ok(!manifestJson.includes(BODY_NEEDLE_DEER_RUN));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_PANTHER));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_OHIO));
  assert.ok(!manifestJson.includes(".pdf"), "builder manifest does not carry a PDF file name");
  assert.ok(!manifestJson.includes("\"body\""));
  assert.ok(!manifestJson.includes("rootCauses"));
  assert.ok(!manifestJson.includes("victimRole"));
  const deerCard = (manifest.cards as { id?: string; sourceUrl?: string }[]).find((card) => card.id === DEER_RUN_ID);
  assert.equal(deerCard?.sourceUrl, DEER_RUN_PAGE);
  const coal = filterMshaManifestBySector(manifest, "coal");
  assert.equal(coal.cardCount, 4);
  const metal = filterMshaManifestBySector(manifest, "metal/nonmetal");
  assert.equal(metal.cardCount, 1);
  if (prevDir === undefined) delete process.env.MSHA_FATALS_DIR;
  else process.env.MSHA_FATALS_DIR = prevDir;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
