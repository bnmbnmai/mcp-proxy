import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CARD_FIELDS,
  CARD_URL,
  LISTING_URL,
  LIVE_MANIFEST_URL,
  OGL_NOTE,
  SEARCH_URL,
  aspNetDate,
  buildGmpMdManifest,
  cardId,
  citeFromRegulation,
  collectGmpMd,
  dedupeSummaries,
  fixMojibake,
  isRealGmpMdBody,
  parseKnownInspectionIds,
  parseReportCard,
  parseSearchJson,
  stripHcHtml,
} from "./gmp-md.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/hc-gmp-md");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

function readJson(name: string): unknown {
  return JSON.parse(readFx(name));
}

async function main(): Promise<void> {
  assert.equal(aspNetDate("/Date(1779724800000-0400)/"), "2026-05-25");
  assert.equal(aspNetDate("/Date(1779681600000-0400)/"), "2026-05-25");
  assert.equal(aspNetDate("2026-05-25"), "2026-05-25");
  assert.equal(aspNetDate("/Date(99999999999999)/"), null, "do not emit year-2825 asOf");
  assert.equal(citeFromRegulation("MDR s.58 (b) Recall procedure"), "MDR s.58 (b)");
  assert.equal(citeFromRegulation("MDR s.21 (1) Labelling deficiencies"), "MDR s.21 (1)");
  assert.equal(citeFromRegulation("MDR s.26  No sale or import of unlicensed devices"), "MDR s.26");
  assert.equal(citeFromRegulation("C.02.011 - Manufacturing control"), null, "Drug GMP cites are not this SKU");
  assert.equal(fixMojibake("a \u00E2\u20AC\u02DCnon-compliant' rating"), "a \u2018non-compliant' rating");
  assert.equal(
    stripHcHtml('<div title="Risk 1: High risk."><b>Risk 1: </b></div> The company did not adequately implement the written procedure for recalls.'),
    "Risk 1: The company did not adequately implement the written procedure for recalls.",
  );
  assert.deepEqual(
    dedupeSummaries([
      "Risk 1: The company did not adequately implement the written procedure for recalls.",
      "Risk 1: The company did not adequately implement the written procedure for recalls.",
    ]),
    ["Risk 1: The company did not adequately implement the written procedure for recalls."],
  );

  const listed = parseSearchJson(readJson("search-excerpt.json"));
  assert.ok(listed.length >= 5, "official excerpt has search INDEX rows");
  assert.ok(listed.some((row) => row.inspectionNumber === "501" && row.firm === "CAN-MED HEALTHCARE"));
  assert.ok(listed.some((row) => row.inspectionNumber === "501" && row.reportCard === true));
  assert.ok(listed.some((row) => row.inspectionNumber === "3355" && row.reportCard === false));
  assert.ok(
    listed.every((row) => !JSON.stringify(row).includes("summaryList") && !/MDR s\./.test(row.firm)),
    "search INDEX has zero observation text",
  );
  assert.ok(!JSON.stringify(listed).includes("written procedure for recalls"));
  assert.equal(LISTING_URL.includes("drug-inspections.canada.ca/md"), true);
  assert.equal(SEARCH_URL.includes("/md/handler/searchResult.ashx"), true);
  assert.equal(CARD_URL.includes("/md/handler/fullReportCard.ashx"), true);
  assert.ok(!CARD_URL.includes("/gmp/"));
  assert.equal(LIVE_MANIFEST_URL.includes("/gmp-md/manifest.json"), true);
  assert.deepEqual(parseKnownInspectionIds({ inspectionNumbers: ["501", "353"] }), ["501", "353"]);
  assert.deepEqual(
    parseKnownInspectionIds({ cards: [{ inspectionNumber: "501", firm: "CAN-MED HEALTHCARE" }] }),
    ["501"],
  );
  assert.ok(
    !JSON.stringify(parseKnownInspectionIds({ cards: [{ inspectionNumber: "501", body: "MDR s.58" }] })).includes(
      "MDR s.58",
    ),
  );

  const canMed = parseReportCard(readJson("501-can-med.json"), {
    site: "Nova Scotia",
    sourceUrl: "https://www.drug-inspections.canada.ca/md/fullReportCard-en.html?insNumber=501&lang=en",
  });
  assert.ok(canMed);
  assert.equal(canMed.inspectionNumber, "501");
  assert.equal(canMed.firm, "CAN-MED HEALTHCARE");
  assert.equal(canMed.referenceNumber, "111868");
  assert.equal(canMed.inspectedOn, "2026-05-25");
  assert.equal(canMed.ratingDesc, "Non-compliant");
  assert.equal(cardId("CAN-MED HEALTHCARE", "501"), "can-med-healthcare-501");
  assert.ok(isRealGmpMdBody(canMed));
  assert.ok(canMed.observations.some((o) => o.cite === "MDR s.58 (b)" && /recalls/i.test(o.text)));
  assert.ok(canMed.observations.some((o) => o.cite === "MDR s.21 (1)" && /Labels/i.test(o.text)));
  assert.ok(canMed.body.includes("MDR s.58 (b)"));
  assert.ok(canMed.body.includes("written procedure for recalls"));
  assert.ok(canMed.body.includes("Summary of observations"));
  assert.ok(canMed.body.includes("medical-device inspection report card"));
  assert.ok(!canMed.body.includes("C.02."));
  assert.ok(!canMed.body.includes("<div"));
  assert.deepEqual(Object.keys(canMed).sort(), [...CARD_FIELDS].sort());
  assert.ok(!/redica|we are not inventing|tcpa|form 483|awa/i.test(JSON.stringify(canMed)));

  const winsham = parseReportCard(readJson("353-winsham.json"));
  assert.ok(winsham && isRealGmpMdBody(winsham));
  assert.equal(winsham.inspectionNumber, "353");
  assert.match(winsham.firm, /WINSHAM/i);

  const fernandas = parseReportCard(readJson("209-fernandas.json"));
  assert.ok(fernandas && isRealGmpMdBody(fernandas));
  assert.equal(fernandas.firm, "FERNANDAS BEAUTY AND SPA SUPPLIES");

  const acmedent = parseReportCard(readJson("315-acmedent.json"));
  assert.ok(acmedent && isRealGmpMdBody(acmedent));
  assert.equal(acmedent.firm, "ACMEDENT CORPORATION");

  const coloplast = parseReportCard(readJson("549-coloplast.json"));
  assert.ok(coloplast && isRealGmpMdBody(coloplast));
  assert.equal(coloplast.firm, "COLOPLAST CANADA CORPORATION");
  assert.equal(coloplast.ratingDesc, "Compliant");

  const ratingOnly = parseReportCard(readJson("rating-only.json"));
  assert.ok(ratingOnly);
  assert.equal(isRealGmpMdBody(ratingOnly), false, "rating-only cards are a kill");
  assert.equal(ratingOnly.observations.length, 0);

  const drugGmpLike = parseReportCard({
    establishmentName: "Apotex Inc",
    insepctionNumber: 88796,
    insStartDate: "/Date(1776096000000-0400)/",
    rating: "Compliant",
    data: [
      {
        no: "1",
        regulation: "C.02.011 - Manufacturing control",
        summaryList: ["Investigations into deviations, reports, and/or follow-up actions were inadequate."],
      },
    ],
  });
  assert.ok(drugGmpLike);
  assert.equal(isRealGmpMdBody(drugGmpLike), false, "Drug GMP C.02 cards are not this SKU");

  const manifest = buildGmpMdManifest({
    ok: true,
    product: "hc-md-inspection-cards",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-19T00:00:00.000Z",
    asOf: "2026-05-25",
    license: OGL_NOTE,
    sources: {
      listing: LISTING_URL,
      search: SEARCH_URL,
      card: CARD_URL,
    },
    cards: [canMed],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.equal((manifest.cards as { firm: string }[])[0]?.firm, "CAN-MED HEALTHCARE");
  assert.ok(!manBlob.includes("written procedure for recalls"), "free manifest must not dump observation body");
  assert.ok(!manBlob.includes("unlicensed devices"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(!("observations" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("501"));
  assert.ok(manBlob.includes("2026-05-25"));
  assert.ok(manBlob.includes("Not /gmp") || manBlob.includes("not /gmp"));

  const cache = mkdtempSync(join(tmpdir(), "gmp-md-collect-"));
  const prevDir = process.env.GMP_MD_DIR;
  process.env.GMP_MD_DIR = cache;
  try {
    const snap = await collectGmpMd({ htmlDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok((snap.listedCount ?? 0) >= 5, "search excerpt is the INDEX, not the sold unit");
    assert.equal(snap.cards.length, 5, "seed collect is five official MD cards");
    assert.ok(snap.cards.some((c) => c.inspectionNumber === "501" && isRealGmpMdBody(c)));
    assert.ok(snap.cards.some((c) => c.inspectionNumber === "353" && isRealGmpMdBody(c)));
    assert.ok(snap.cards.some((c) => c.inspectionNumber === "209" && isRealGmpMdBody(c)));
    assert.ok(snap.cards.some((c) => c.inspectionNumber === "315" && isRealGmpMdBody(c)));
    assert.ok(snap.cards.some((c) => c.inspectionNumber === "549" && isRealGmpMdBody(c)));
    assert.ok(snap.cards.every((c) => isRealGmpMdBody(c)));
    assert.ok(!snap.cards.some((c) => c.inspectionNumber === "3355"), "INDEX-only row is not sold");
    assert.ok(!snap.cards.some((c) => c.inspectionNumber === "1"), "rating-only is a kill");
    assert.ok(!JSON.stringify(snap.cards).includes("C.02."));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectGmpMd({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.inspectionNumber === "501" && isRealGmpMdBody(c)), "re-collect keeps cached bodies");
    assert.ok((merged.addedThisRun ?? 0) === 0, "LIMIT is additional; cached bodies do not count");
    assert.ok(!JSON.stringify(merged.cards).toLowerCase().includes("redica"));
  } finally {
    if (prevDir === undefined) delete process.env.GMP_MD_DIR;
    else process.env.GMP_MD_DIR = prevDir;
  }

  console.log("gmp-md tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
