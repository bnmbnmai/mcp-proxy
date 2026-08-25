import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  ATTRIBUTION,
  CARD_FIELDS,
  INDEX_URL,
  LICENSE,
  SEED_LISTINGS,
  buildCderReviewsManifest,
  collectCderReviews,
  isOfficialIntegratedReviewPdf,
  isPeopleRow,
  isRealCderReviewBody,
  mdyToIso,
  officialIntegratedReviewUrl,
  officialTocUrl,
  parseCderReviewText,
  parseDrugsAtFdaToc,
  parseListingRows,
} from "./cder-reviews.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/cder-reviews");
const REZDIFFRA_PDF =
  "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217785Orig1s000IntegratedR.pdf";
const REZDIFFRA_TOC =
  "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217785Orig1s000TOC.html";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const toc = parseDrugsAtFdaToc(readFx("listing-excerpt.html"), REZDIFFRA_TOC);
  assert.ok(toc);
  assert.equal(toc?.id, "rezdiffra");
  assert.equal(toc?.name, "Rezdiffra");
  assert.equal(toc?.application, "217785");
  assert.equal(toc?.date, "2024-03-14");
  assert.equal(toc?.sourceUrl, REZDIFFRA_PDF);
  assert.equal(toc?.pageUrl, REZDIFFRA_TOC);

  const noInt = parseDrugsAtFdaToc(
    readFx("listing-no-integrated.html"),
    "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/761336Orig1s000TOC.html",
  );
  assert.equal(noInt, null, "TOC without integratedR is not this SKU");

  const listed = parseListingRows(SEED_LISTINGS);
  assert.ok(listed.length >= 14, "seed lists 14+ official Integrated Review PDFs");
  assert.ok(listed.some((r) => r.id === "rezdiffra"));
  assert.ok(listed.some((r) => r.id === "journavx"));
  assert.ok(listed.some((r) => r.id === "blujepa"));
  assert.ok(listed.every((r) => officialIntegratedReviewUrl(r.sourceUrl)));
  assert.equal(officialIntegratedReviewUrl(REZDIFFRA_PDF), REZDIFFRA_PDF);
  assert.equal(officialIntegratedReviewUrl("https://www.accessdata.fda.gov/drugsatfda_docs/appletter/2024/217785Orig1s000ltr.pdf"), null);
  assert.equal(officialIntegratedReviewUrl("https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217785Orig1s000TOC.html"), null);
  assert.equal(officialIntegratedReviewUrl("https://www.ema.europa.eu/en/documents/referral/tavneos-article-20-procedure-assessment-report_en.pdf"), null);
  assert.equal(officialTocUrl(REZDIFFRA_TOC), REZDIFFRA_TOC);
  assert.ok(isOfficialIntegratedReviewPdf(REZDIFFRA_PDF));
  assert.ok(INDEX_URL.includes("accessdata.fda.gov") && INDEX_URL.includes("cder/daf"));
  assert.equal(mdyToIso("3/14/2024"), "2024-03-14");
  assert.equal(isPeopleRow({ name: "Jane Q Public CV", sponsor: "", inn: "" }), true);

  const rezdiffra = parseCderReviewText(readFx("rezdiffra.txt"), {
    sourceUrl: REZDIFFRA_PDF,
    pageUrl: REZDIFFRA_TOC,
    name: "Rezdiffra",
    inn: "resmetirom",
    application: "217785",
    date: "2024-03-14",
    sponsor: "Madrigal Pharmaceuticals, Inc.",
    id: "rezdiffra",
    kind: "integrated-review",
  });
  assert.equal(rezdiffra.id, "rezdiffra");
  assert.equal(rezdiffra.name, "Rezdiffra");
  assert.equal(rezdiffra.inn, "resmetirom");
  assert.ok(isRealCderReviewBody(rezdiffra.body));
  assert.ok(rezdiffra.body.includes("INTEGRATED REVIEW") || rezdiffra.body.includes("Integrated Review"));
  assert.ok(rezdiffra.body.includes("resmetirom"));
  assert.ok(rezdiffra.body.includes("CENTER FOR DRUG EVALUATION AND"));
  assert.ok(CARD_FIELDS.every((f) => f in rezdiffra));

  for (const slug of ["journavx", "blujepa", "nexviazyme", "duvyzat", "xolremdi"]) {
    const card = parseCderReviewText(readFx(`${slug}.txt`), {
      sourceUrl: SEED_LISTINGS.find((r) => r.id === slug)?.sourceUrl || REZDIFFRA_PDF,
      pageUrl: SEED_LISTINGS.find((r) => r.id === slug)?.pageUrl,
      id: slug,
      name: slug,
    });
    assert.ok(isRealCderReviewBody(card.body), `${slug} is official CDER Integrated Review TEXT`);
    assert.equal(card.id, slug);
  }

  const teaser = parseCderReviewText(readFx("teaser.txt"), {
    sourceUrl: REZDIFFRA_PDF,
    name: "Rezdiffra",
  });
  assert.equal(isRealCderReviewBody(teaser.body), false, "approval-letter teaser is not the review body");

  const peopleBody = parseCderReviewText(readFx("people.txt"), {
    sourceUrl: REZDIFFRA_PDF,
    name: "Jane Q Public",
  });
  assert.equal(isRealCderReviewBody(peopleBody.body), false, "people file is not this SKU");

  const wrap = parseCderReviewText(readFx("json-wrap.txt"), {
    sourceUrl: REZDIFFRA_PDF,
    name: "Rezdiffra",
  });
  assert.equal(isRealCderReviewBody(wrap.body), false, "openFDA catalog JSON is not the sold unit");

  const swiss = parseCderReviewText(readFx("swisspar.txt"), {
    sourceUrl: "https://www.swissmedic.ch/dam/swissmedic/en/dokumente/zulassung/swisspar/70227.pdf",
    name: "Rhapsido",
  });
  assert.equal(isRealCderReviewBody(swiss.body), false, "SwissPAR is not this SKU");

  const wl = parseCderReviewText(readFx("warning-letter.txt"), {
    sourceUrl: REZDIFFRA_PDF,
    name: "Rezdiffra",
  });
  assert.equal(isRealCderReviewBody(wl.body), false, "warning letter is not this SKU");

  const manifest = buildCderReviewsManifest({
    ok: true,
    product: "fda-cder-integrated-review-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-25T00:00:00.000Z",
    asOf: "2024-03-14",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      index: INDEX_URL,
      pdfHost: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/",
      pageHost: INDEX_URL,
    },
    cards: [rezdiffra],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.equal((manifest.cards as { name: string }[])[0]?.name, "Rezdiffra");
  assert.equal((manifest.cards as { id: string }[])[0]?.id, "rezdiffra");
  assert.ok(!manBlob.includes("resmetirom"), "free manifest must not dump review INN/body");
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(!("inn" in ((manifest.cards as object[])[0] ?? {})));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);

  const cache = mkdtempSync(join(tmpdir(), "cder-reviews-collect-"));
  const prevDir = process.env.CDER_REVIEWS_DIR;
  process.env.CDER_REVIEWS_DIR = cache;
  try {
    const snap = await collectCderReviews({ htmlDir: fixtures, limit: 12, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 6, "fixture collect extracts several official Integrated Review bodies");
    assert.ok(snap.cards.some((c) => c.id === "rezdiffra" && isRealCderReviewBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === "journavx" && isRealCderReviewBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealCderReviewBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "jane-q-public-cv"), "skip people");
    assert.ok(snap.cards.every((c) => officialIntegratedReviewUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectCderReviews({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === "rezdiffra"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 6);
  } finally {
    if (prevDir === undefined) delete process.env.CDER_REVIEWS_DIR;
    else process.env.CDER_REVIEWS_DIR = prevDir;
  }

  console.log("cder-reviews parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
