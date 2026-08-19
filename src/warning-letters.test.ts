import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LETTER_BASE,
  LETTER_FIELDS,
  LISTING_AJAX_URL,
  LISTING_URL,
  buildWarningLettersManifest,
  collectWarningLetters,
  parseLetterHtml,
  parseListingDatatables,
  parseListingHtml,
  viewDomIdFromListingHtml,
} from "./warning-letters.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fda-warning-letters");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.equal(listed.length, 2);
  assert.equal(listed[0]?.id, "thomas-brunner-hygiene-gmbh-729018-07242026");
  assert.equal(listed[0]?.firm, "Thomas Brunner Hygiene GmbH");
  assert.equal(listed[0]?.issuedOn, "2026-07-24");
  assert.equal(
    listed[0]?.sourceUrl,
    `${LETTER_BASE}thomas-brunner-hygiene-gmbh-729018-07242026`,
  );
  assert.equal(listed[1]?.id, "citra100mg-722606-03042026");
  assert.equal(listed[1]?.firm, "Citra100mg");
  assert.equal(listed[1]?.issuedOn, "2026-03-04");
  assert.ok(!listed.some((row) => /redica|thompson|apify/i.test(JSON.stringify(row))));
  assert.equal(LISTING_URL.startsWith("https://www.fda.gov/"), true);
  assert.equal(LISTING_AJAX_URL.startsWith("https://www.fda.gov/datatables/views/ajax"), true);

  const fromAjax = parseListingDatatables(JSON.parse(readFx("listing-ajax.json")));
  assert.equal(fromAjax.length, 3, "official DataTables excerpt has three letter rows");
  assert.equal(fromAjax[0]?.id, "citra100mg-722606-03042026");
  assert.equal(fromAjax[0]?.firm, "Citra100mg");
  assert.equal(fromAjax[1]?.id, "thomas-brunner-hygiene-gmbh-729018-07242026");
  assert.equal(fromAjax[2]?.id, "missing-letter-000000-01012026");
  assert.ok(!fromAjax.some((row) => /redica|thompson|apify/i.test(JSON.stringify(row))));
  assert.equal(
    viewDomIdFromListingHtml('<div class="js-view-dom-id-b3fcfaf49f1d99e7d65629520b72f602fdba57bfebeb3ddd0943ba0c75247637">'),
    "b3fcfaf49f1d99e7d65629520b72f602fdba57bfebeb3ddd0943ba0c75247637",
  );

  const citra = parseLetterHtml(
    readFx("citra100mg-722606-03042026-excerpt.html"),
    `${LETTER_BASE}citra100mg-722606-03042026`,
  );
  assert.equal(citra.id, "citra100mg-722606-03042026");
  assert.equal(citra.firm, "Citra100mg");
  assert.equal(citra.cms, "722606");
  assert.equal(citra.issuedOn, "2026-03-04");
  assert.match(citra.subject, /Unapproved New Drugs/i);
  assert.match(citra.issuingOffice ?? "", /Center for Drug Evaluation and Research/i);
  assert.ok(citra.body.includes("WARNING LETTER"));
  assert.ok(citra.body.includes("unapproved and misbranded"));
  assert.ok(citra.body.includes("Sangeeta Vaswani Chatterjee"));
  assert.ok(citra.body.length > 400, "official letter excerpt includes the letter body");
  assert.deepEqual(Object.keys(citra).sort(), [...LETTER_FIELDS].sort());
  assert.ok(!/redica|thompson|apify/i.test(JSON.stringify(citra)));

  const wrapped = parseLetterHtml(
    `<html><head><title>Thomas Brunner Hygiene GmbH - 729018 - 07/24/2026 | FDA</title>
<meta name="description" content="CGMP/Finished Pharmaceuticals/Adulterated" />
</head><body>
<h1>Thomas Brunner Hygiene GmbH<span>MARCS-CMS 729018 — <time datetime="2026-07-24T00:00:00Z">July 24, 2026</time></span></h1>
<p>July 24, 2026</p><p class="text-align-center"><strong>WARNING LETTER</strong><br>Reference number: 320-26-106</p><p>Dear Mr. Brunner:</p><p>This Warning Letter advises you of significant violations identified during a U.S. Food and Drug Administration (FDA) review of your records.</p>
<aside>Content current as of:</aside></body></html>`,
    `${LETTER_BASE}thomas-brunner-hygiene-gmbh-729018-07242026`,
  );
  assert.equal(wrapped.firm, "Thomas Brunner Hygiene GmbH");
  assert.equal(wrapped.cms, "729018");
  assert.ok(wrapped.body.includes("Dear Mr. Brunner"));
  assert.ok(wrapped.body.includes("significant violations"));

  const empty = parseLetterHtml(
    readFx("no-letter-body.html"),
    `${LETTER_BASE}missing-letter-000000-01012026`,
  );
  assert.equal(empty.body, "");
  assert.equal(empty.firm, "Missing Letter");

  const manifest = buildWarningLettersManifest({
    ok: true,
    product: "fda-warning-letter-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-18T00:00:00.000Z",
    asOf: "2026-03-04",
    sources: { listing: LISTING_URL, letterBase: LETTER_BASE },
    letters: [citra],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.unlisted, undefined);
  assert.equal(manifest.letterCount, 1);
  assert.ok(!manBlob.includes("www.citra100mg.com"), "free manifest must not dump letter body");
  assert.ok(!manBlob.includes("unapproved and misbranded drugs in violation"));
  assert.ok(manBlob.includes("citra100mg-722606-03042026"));

  const cache = mkdtempSync(join(tmpdir(), "warning-letters-collect-"));
  const prevDir = process.env.WARNING_LETTERS_DIR;
  process.env.WARNING_LETTERS_DIR = cache;
  try {
    const snap = await collectWarningLetters({ htmlDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.equal(snap.listedCount, 3, "DataTables listing counts official letter rows");
    assert.ok(snap.letters.some((l) => l.id === "citra100mg-722606-03042026" && l.body.length > 0));
    assert.ok(snap.letters.some((l) => l.id === "thomas-brunner-hygiene-gmbh-729018-07242026" && l.body.length > 0));
    assert.ok(!snap.letters.some((l) => l.id === "missing-letter-000000-01012026"), "no invented body");
    assert.ok((snap.skippedNoBody ?? 0) >= 1);

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectWarningLetters({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.letters.some((l) => l.id === "citra100mg-722606-03042026" && l.body.length > 0), "re-collect keeps cached bodies");
    assert.ok(merged.letters.some((l) => l.id === "thomas-brunner-hygiene-gmbh-729018-07242026"));
    assert.equal(merged.addedThisRun, 0, "LIMIT is additional; cached bodies do not consume it");

    const onlyCitra = {
      ...snap,
      letters: snap.letters.filter((l) => l.id === "citra100mg-722606-03042026"),
    };
    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(onlyCitra));
    const filled = await collectWarningLetters({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(filled.letters.some((l) => l.id === "citra100mg-722606-03042026"), "cached Citra is reused and does not consume LIMIT");
    assert.ok(filled.letters.some((l) => l.id === "thomas-brunner-hygiene-gmbh-729018-07242026" && l.body.length > 0), "LIMIT=1 additional still extracts Thomas Brunner");
    assert.equal(filled.addedThisRun, 1);
    assert.ok((filled.reused ?? 0) >= 1);
    assert.ok(!filled.letters.some((l) => l.id === "missing-letter-000000-01012026"), "still no invented Missing Letter body");
  } finally {
    if (prevDir === undefined) delete process.env.WARNING_LETTERS_DIR;
    else process.env.WARNING_LETTERS_DIR = prevDir;
  }

  console.log("warning-letters parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
