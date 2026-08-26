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
  buildGmpManifest,
  cardId,
  citeFromRegulation,
  collectGmp,
  dedupeSummaries,
  isRealGmpBody,
  parseKnownInspectionIds,
  parseReportCard,
  parseSearchJson,
} from "./gmp.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/hc-gmp");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

function readJson(name: string): unknown {
  return JSON.parse(readFx(name));
}

async function main(): Promise<void> {
  assert.equal(aspNetDate("/Date(1776096000000-0400)/"), "2026-04-13");
  assert.equal(aspNetDate("/Date(1676394000000-0500)/"), "2023-02-14");
  assert.equal(aspNetDate("2026-04-13"), "2026-04-13");
  assert.equal(aspNetDate("/Date(99999999999999)/"), null, "do not emit year-2825 asOf");
  assert.equal(citeFromRegulation("C.02.011 - Manufacturing control"), "C.02.011");
  assert.deepEqual(
    dedupeSummaries([
      "Investigations into deviations, reports, and/or follow-up actions were inadequate.",
      "Investigations into deviations, reports, and/or follow-up actions were inadequate.",
    ]),
    ["Investigations into deviations, reports, and/or follow-up actions were inadequate."],
  );

  const listed = parseSearchJson(readJson("search-excerpt.json"));
  assert.ok(listed.length >= 5, "official excerpt has search INDEX rows");
  assert.ok(listed.some((row) => row.inspectionNumber === "88796" && row.firm === "Apotex Inc"));
  assert.ok(listed.some((row) => row.inspectionNumber === "88796" && row.reportCard === true));
  assert.ok(listed.some((row) => row.inspectionNumber === "89412" && row.reportCard === false));
  assert.ok(
    listed.every((row) => !("summaryList" in row) && !row.firm.includes("C.02.")),
    "search INDEX has zero observation text",
  );
  assert.ok(!JSON.stringify(listed).includes("Investigations into deviations"));
  assert.equal(LISTING_URL.includes("drug-inspections.canada.ca/gmp"), true);
  assert.equal(SEARCH_URL.includes("searchResult.ashx"), true);
  assert.equal(CARD_URL.includes("fullReportCard.ashx"), true);
  assert.equal(LIVE_MANIFEST_URL.includes("/gmp/manifest.json"), true);
  assert.deepEqual(parseKnownInspectionIds({ inspectionNumbers: ["88796", "80413"] }), ["88796", "80413"]);
  assert.deepEqual(
    parseKnownInspectionIds({ cards: [{ inspectionNumber: "88796", firm: "Apotex Inc" }] }),
    ["88796"],
  );
  assert.ok(
    !JSON.stringify(parseKnownInspectionIds({ cards: [{ inspectionNumber: "88796", body: "C.02.011" }] })).includes(
      "C.02.011",
    ),
  );

  const apotex = parseReportCard(readJson("88796-apotex.json"), {
    site: "A",
    sourceUrl: "https://www.drug-inspections.canada.ca/gmp/fullReportCard-en.html?insNumber=88796&lang=en",
  });
  assert.ok(apotex);
  assert.equal(apotex.inspectionNumber, "88796");
  assert.equal(apotex.firm, "Apotex Inc");
  assert.equal(apotex.referenceNumber, "501259");
  assert.equal(apotex.inspectedOn, "2026-04-13");
  assert.equal(apotex.ratingDesc, "Compliant");
  assert.equal(cardId("Apotex Inc", "88796"), "apotex-inc-88796");
  assert.ok(isRealGmpBody(apotex));
  assert.ok(apotex.observations.some((o) => o.cite === "C.02.011" && /deviations/i.test(o.text)));
  assert.ok(apotex.observations.some((o) => o.cite === "C.02.005" && /equipment/i.test(o.text)));
  assert.ok(apotex.body.includes("C.02.011"));
  assert.ok(apotex.body.includes("Investigations into deviations"));
  assert.ok(apotex.body.includes("Summary of observations"));
  assert.deepEqual(Object.keys(apotex).sort(), [...CARD_FIELDS].sort());
  assert.ok(!/redica|we are not inventing|tcpa/i.test(JSON.stringify(apotex)));

  const older = parseReportCard(readJson("80413-apotex.json"));
  assert.ok(older && isRealGmpBody(older));
  assert.equal(older.inspectionNumber, "80413");
  assert.ok(older.observations.some((o) => o.cite === "C.02.007"));

  const nc = parseReportCard(readJson("88818-svlabs.json"));
  assert.ok(nc && isRealGmpBody(nc));
  assert.equal(nc.firm, "SV Labs Toronto Corporation");
  assert.equal(nc.ratingDesc, "Non-compliant");
  assert.ok(nc.observations.length >= 8);
  assert.ok(nc.observations.every((o) => o.cite?.startsWith("C.02.")));

  const ratingOnly = parseReportCard(readJson("rating-only.json"));
  assert.ok(ratingOnly);
  assert.equal(isRealGmpBody(ratingOnly), false, "rating-only cards are a kill");
  assert.equal(ratingOnly.observations.length, 0);

  const manifest = buildGmpManifest({
    ok: true,
    product: "hc-gmp-report-cards",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-19T00:00:00.000Z",
    asOf: "2026-04-13",
    license: OGL_NOTE,
    sources: {
      listing: LISTING_URL,
      search: SEARCH_URL,
      card: CARD_URL,
    },
    cards: [apotex],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.equal((manifest.cards as { firm: string }[])[0]?.firm, "Apotex Inc");
  assert.ok(!manBlob.includes("Investigations into deviations"), "free manifest must not dump observation body");
  assert.ok(!manBlob.includes("water purification equipment"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(!("observations" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("88796"));
  assert.ok(manBlob.includes("2026-04-13"));
  assert.ok(manBlob.includes("21k-row search index") || manBlob.includes("Not the 21k"));

  const cache = mkdtempSync(join(tmpdir(), "gmp-collect-"));
  const prevDir = process.env.GMP_DIR;
  process.env.GMP_DIR = cache;
  try {
    const snap = await collectGmp({ htmlDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok((snap.listedCount ?? 0) >= 5, "search excerpt is the INDEX, not the sold unit");
    assert.ok(snap.cards.some((c) => c.inspectionNumber === "88796" && isRealGmpBody(c)));
    assert.ok(snap.cards.some((c) => c.inspectionNumber === "80413" && isRealGmpBody(c)));
    assert.ok(snap.cards.some((c) => c.inspectionNumber === "88818" && isRealGmpBody(c)));
    assert.ok(snap.cards.every((c) => isRealGmpBody(c)));
    assert.ok(!snap.cards.some((c) => c.inspectionNumber === "89412"), "INDEX-only row is not sold");
    assert.ok(!snap.cards.some((c) => c.inspectionNumber === "1"), "rating-only is a kill");

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectGmp({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.inspectionNumber === "88796" && isRealGmpBody(c)), "re-collect keeps cached bodies");
    assert.ok((merged.addedThisRun ?? 0) === 0, "LIMIT is additional; cached bodies do not count");
    assert.ok(!JSON.stringify(merged.cards).toLowerCase().includes("redica"));
  } finally {
    if (prevDir === undefined) delete process.env.GMP_DIR;
    else process.env.GMP_DIR = prevDir;
  }

  console.log("gmp tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
