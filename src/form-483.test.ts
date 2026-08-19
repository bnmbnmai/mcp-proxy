import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LETTER_FIELDS,
  LISTING_JSON_URL,
  LISTING_URL,
  LIVE_MANIFEST_URL,
  RECORD_TYPE_483,
  buildForm483Manifest,
  collectForm483,
  isReal483Body,
  parse483Text,
  parseKnownMediaIds,
  parseListingHtml,
  parseListingJson,
  parseObservations,
  readSkippedNoTextIds,
} from "./form-483.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fda-form-483");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(listed.length >= 3, "official excerpt has posted 483 PDF rows");
  assert.ok(
    listed.every((row) => row.sourceUrl.includes("/media/") && row.sourceUrl.endsWith("/download")),
  );
  assert.ok(!listed.some((row) => /untitled letter|483 response|amended 483/i.test(JSON.stringify(row))));
  assert.equal(listed[0]?.mediaId, "193964");
  assert.equal(listed[0]?.firm, "Cascade Specialty Pharmacy LLC");
  assert.equal(listed[0]?.fei, "3015133983");
  assert.equal(listed[0]?.recordDate, "2026-07-17");
  assert.equal(listed[0]?.publishedOn, "2026-07-31");
  assert.equal(listed[0]?.sourceUrl, "https://www.fda.gov/media/193964/download");
  assert.ok(!listed.some((row) => row.mediaId === "193646"), "Untitled Letter is not a Form 483");
  assert.ok(!listed.some((row) => /redica|cms.?2567|wasde/i.test(JSON.stringify(row))));
  assert.equal(LISTING_URL.includes("oii-foia-electronic-reading-room"), true);
  assert.equal(LISTING_JSON_URL.includes("datatables-json/ora-foia-reading.json"), true);
  assert.equal(LIVE_MANIFEST_URL.includes("/form-483/manifest.json"), true);
  assert.equal(RECORD_TYPE_483, "483");
  assert.deepEqual(parseKnownMediaIds({ mediaIds: ["193964", "194143"] }), ["193964", "194143"]);
  assert.deepEqual(
    parseKnownMediaIds({ letters: [{ mediaId: "193964", firm: "Cascade Specialty Pharmacy LLC" }] }),
    ["193964"],
  );
  assert.ok(!JSON.stringify(parseKnownMediaIds({ letters: [{ mediaId: "193964", body: "OBSERVATION 1" }] })).includes("OBSERVATION"));

  const fromJson = parseListingJson(JSON.parse(readFx("listing.json")));
  assert.equal(fromJson.length, 5, "official JSON excerpt has five posted 483 PDFs");
  assert.equal(fromJson[0]?.mediaId, "194143", "newest published 483 is first");
  assert.equal(fromJson[0]?.firm, "Veterinary Pharmacy Corporation");
  assert.equal(fromJson[0]?.publishedOn, "2026-08-12");
  assert.equal(fromJson[0]?.sourceUrl, "https://www.fda.gov/media/194143/download");
  assert.ok(fromJson.some((row) => row.mediaId === "193964"));
  assert.ok(fromJson.some((row) => row.mediaId === "193769"), "HTML first-slice leftover is still a 483");
  assert.ok(!fromJson.some((row) => row.mediaId === "193646"), "Untitled Letter is not a Form 483");
  assert.ok(!fromJson.some((row) => /redica|cms.?2567|wasde|483 response|amended 483/i.test(JSON.stringify(row))));

  const cascade = parse483Text(readFx("193964-cascade-excerpt.txt"), {
    sourceUrl: "https://www.fda.gov/media/193964/download",
    firm: "Cascade Specialty Pharmacy LLC",
    fei: "3015133983",
    recordDate: "2026-07-17",
    publishedOn: "2026-07-31",
    state: "Washington",
    establishmentType: "Producer of Non Sterile Drug Products",
  });
  assert.equal(cascade.mediaId, "193964");
  assert.equal(cascade.firm, "Cascade Specialty Pharmacy LLC");
  assert.ok(isReal483Body(cascade.body));
  assert.ok(cascade.body.includes("This document lists observations"));
  assert.ok(cascade.body.includes("Gabapentin 100 mg/mL"));
  assert.ok(cascade.observations.some((o) => o.n === 1 && /quality control unit/i.test(o.text)));
  assert.ok(cascade.observations[0]?.text.startsWith("OBSERVATION 1"));
  assert.deepEqual(
    Object.keys(cascade).sort(),
    [...LETTER_FIELDS].sort(),
  );
  assert.ok(!/redica|we are not inventing/i.test(JSON.stringify(cascade)));

  const annovex = parse483Text(readFx("193728-annovex-excerpt.txt"), {
    sourceUrl: "https://www.fda.gov/media/193728/download",
    firm: "Annovex Pharma Inc",
    fei: "3020928491",
    recordDate: "2026-07-03",
  });
  assert.ok(isReal483Body(annovex.body));
  assert.ok(annovex.body.includes("Annovex Pharma"));
  assert.ok(annovex.observations.some((o) => /laminar airflow/i.test(o.text)));

  const empty = parse483Text(readFx("no-observation.txt"), {
    sourceUrl: "https://www.fda.gov/media/193646/download",
    firm: "Denver Solutions LLC dba Leiters Health",
  });
  assert.equal(isReal483Body(empty.body), false);
  assert.deepEqual(parseObservations(empty.body), []);

  const manifest = buildForm483Manifest({
    ok: true,
    product: "fda-form-483-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-18T00:00:00.000Z",
    asOf: "2026-07-31",
    sources: {
      listing: LISTING_URL,
      listingJson: LISTING_JSON_URL,
      mediaBase: "https://www.fda.gov/media/",
    },
    letters: [cascade],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.letterCount, 1);
  assert.equal((manifest.letters as { firm: string }[])[0]?.firm, "Cascade Specialty Pharmacy LLC");
  assert.ok(!manBlob.includes("Gabapentin 100 mg/mL"), "free manifest must not dump observation body");
  assert.ok(!manBlob.includes("quality control unit are not fully followed"));
  assert.ok(!("body" in ((manifest.letters as object[])[0] ?? {})));
  assert.ok(!("observations" in ((manifest.letters as object[])[0] ?? {})));
  assert.ok(manBlob.includes("193964"));
  assert.ok(manBlob.includes("2026-07-17"));

  const cache = mkdtempSync(join(tmpdir(), "form-483-collect-"));
  const prevDir = process.env.FORM_483_DIR;
  process.env.FORM_483_DIR = cache;
  try {
    const snap = await collectForm483({ htmlDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.listedCount === 5, "JSON listing counts official 483 rows, not Untitled Letter");
    assert.ok(snap.letters.some((l) => l.mediaId === "193964" && isReal483Body(l.body)));
    assert.ok(snap.letters.some((l) => l.mediaId === "193728" && isReal483Body(l.body)));
    assert.ok(snap.letters.every((l) => isReal483Body(l.body)));
    assert.ok(!snap.letters.some((l) => l.mediaId === "193646"));
    assert.ok(!snap.letters.some((l) => l.mediaId === "194143"), "no invented body when official text is absent");

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectForm483({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.letters.some((l) => l.mediaId === "193964" && isReal483Body(l.body)), "re-collect keeps cached bodies");
    assert.ok(merged.letters.some((l) => l.mediaId === "193728"));
    assert.ok(!merged.letters.some((l) => l.mediaId === "194143"), "still no invented Veterinary body");
    assert.ok((merged.addedThisRun ?? 0) === 0, "LIMIT is additional; cached 2 already meet no new-body target until extras exist");

    const onlyCascade = {
      ...snap,
      letters: snap.letters.filter((l) => l.mediaId === "193964"),
    };
    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(onlyCascade));
    const filled = await collectForm483({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(filled.letters.some((l) => l.mediaId === "193964"), "cached Cascade is reused and does not consume LIMIT");
    assert.ok(filled.letters.some((l) => l.mediaId === "193728" && isReal483Body(l.body)), "LIMIT=1 additional still extracts Annovex");
    assert.equal(filled.addedThisRun, 1);
    assert.ok((filled.reused ?? 0) >= 1);
    assert.ok(!filled.letters.some((l) => l.mediaId === "194143"), "no invented Veterinary body");

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify({ ...snap, letters: [] }));
    const knownOnly = await collectForm483({
      htmlDir: fixtures,
      limit: 1,
      pauseMs: 0,
      knownIds: ["193964", "193728"],
    });
    assert.ok(!knownOnly.letters.some((l) => l.mediaId === "193964"), "known live IDs are not re-fetched or invented");
    assert.ok(!knownOnly.letters.some((l) => l.mediaId === "193728"));
    assert.ok((knownOnly.skippedKnown ?? 0) >= 2, "known live IDs are skipped without inventing text");
    assert.ok(readSkippedNoTextIds().has("194143"), "image-only / no-text IDs persist so later fills do not re-walk them");
  } finally {
    if (prevDir === undefined) delete process.env.FORM_483_DIR;
    else process.env.FORM_483_DIR = prevDir;
  }

  console.log("form-483 parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
