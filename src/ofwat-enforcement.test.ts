import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  ATTRIBUTION,
  CARD_FIELDS,
  HUB_URL,
  LICENSE,
  SEED_LISTINGS,
  buildOfwatEnforcementManifest,
  collectOfwatEnforcement,
  isOfficialOfwatPdf,
  isPeopleRow,
  isRealOfwatEnforcementBody,
  officialOfwatPdfUrl,
  parseHubHtml,
  parseListingRows,
  parseOfwatEnforcementText,
} from "./ofwat-enforcement.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ofwat-enforcement");
const SEW_PDF =
  "https://www.ofwat.gov.uk/wp-content/uploads/2026/03/Notice-of-Ofwats-proposal-to-issue-an-enforcement-order-and-impose-a-penalty.pdf";
const THAMES_PDF =
  "https://www.ofwat.gov.uk/wp-content/uploads/2024/08/2025-05-28-Thames-Water-Final-Decision-Document-REDACTED.pdf";
const SOUTHERN_PDF =
  "https://www.ofwat.gov.uk/wp-content/uploads/2026/02/Notice-of-Ofwats-decision-to-accept-section-19-undertakings-from-Southern-Water-Services-Limited.pdf";
const SEW_ID = "Notice-of-Ofwats-proposal-to-issue-an-enforcement-order-and-impose-a-penalty";
const THAMES_ID = "2025-05-28-Thames-Water-Final-Decision-Document-REDACTED";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listing = parseHubHtml(readFx("listing-excerpt.html"), HUB_URL);
  assert.ok(listing.some((r) => r.id === SEW_ID), "hub HTML yields South East Water official PDF");
  assert.ok(listing.some((r) => r.id === THAMES_ID), "hub HTML yields Thames Water official PDF");
  assert.ok(
    listing.some((r) => r.sourceUrl === SOUTHERN_PDF),
    "hub HTML yields Southern Water seed URL",
  );
  assert.ok(listing.every((r) => officialOfwatPdfUrl(r.sourceUrl)));
  assert.equal(listing.length, 3, "first slice is the three family PDFs");

  const listed = parseListingRows(SEED_LISTINGS);
  assert.equal(listed.length, 3, "seed lists the three official Ofwat enforcement PDFs");
  assert.ok(listed.every((r) => officialOfwatPdfUrl(r.sourceUrl)));
  assert.equal(officialOfwatPdfUrl(SEW_PDF), SEW_PDF);
  assert.equal(
    officialOfwatPdfUrl("https://www.ofwat.gov.uk/regulated-companies/investigations/"),
    null,
    "investigations HTML is the index, not the sold PDF",
  );
  assert.equal(officialOfwatPdfUrl("https://www.ofwat.gov.uk/wp-content/uploads/2026/03/open-data.csv"), null);
  assert.ok(isOfficialOfwatPdf(SEW_PDF));
  assert.ok(HUB_URL.includes("ofwat.gov.uk/regulated-companies/investigations"));
  assert.equal(isPeopleRow({ institution: "Jane Q Public", title: "CV of a director", id: "" }), true);
  assert.equal(isPeopleRow({ institution: "South East Water Limited", title: "enforcement notice", id: SEW_ID }), false);

  const sew = parseOfwatEnforcementText(readFx(`${SEW_ID}.txt`), {
    sourceUrl: SEW_PDF,
    pageUrl: HUB_URL,
    institution: "South East Water Limited",
    date: "2026-03-01",
    kind: "enforcement-notice",
    id: SEW_ID,
  });
  assert.equal(sew.id, SEW_ID);
  assert.ok(isRealOfwatEnforcementBody(sew.body));
  assert.ok(sew.body.includes("£22.46m"));
  assert.ok(sew.body.includes("Freeze Thaw Event"));
  assert.ok(sew.body.includes("Storm Eunice"));
  assert.ok(sew.body.includes("PWPC"));
  assert.ok(sew.body.includes("26,705"));
  assert.ok(CARD_FIELDS.every((f) => f in sew));

  const thames = parseOfwatEnforcementText(readFx(`${THAMES_ID}.txt`), {
    sourceUrl: THAMES_PDF,
    pageUrl: HUB_URL,
    institution: "Thames Water",
    date: "2025-05-28",
    kind: "final-decision",
    id: THAMES_ID,
  });
  assert.ok(isRealOfwatEnforcementBody(thames.body), "Thames final decision is official Ofwat TEXT");
  assert.equal(thames.id, THAMES_ID);

  const teaser = parseOfwatEnforcementText(readFx("teaser.txt"), {
    sourceUrl: SEW_PDF,
    institution: "South East Water Limited",
  });
  assert.equal(isRealOfwatEnforcementBody(teaser.body), false, "HTML publication card is not the notice body");

  const peopleBody = parseOfwatEnforcementText(readFx("people.txt"), {
    sourceUrl: SEW_PDF,
    institution: "Jane Q Public",
  });
  assert.equal(isRealOfwatEnforcementBody(peopleBody.body), false, "people file is not this SKU");

  const wrap = parseOfwatEnforcementText(readFx("csv-wrap.txt"), {
    sourceUrl: SEW_PDF,
    institution: "South East Water",
  });
  assert.equal(isRealOfwatEnforcementBody(wrap.body), false, "open-data CSV is not the sold unit");

  const manifest = buildOfwatEnforcementManifest({
    ok: true,
    product: "ofwat-wia91-enforcement-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-27T00:00:00.000Z",
    asOf: "2026-03-01",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      index: HUB_URL,
      pdfHost: "https://www.ofwat.gov.uk/wp-content/uploads/",
    },
    cards: [sew, thames],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 2);
  assert.equal((manifest.cards as { institution: string }[])[0]?.institution, "South East Water Limited");
  assert.equal((manifest.cards as { id: string }[])[0]?.id, SEW_ID);
  assert.ok(!manBlob.includes("£22.46m"), "free manifest must not dump notice body");
  assert.ok(!manBlob.includes("Freeze Thaw Event"));
  assert.ok(!manBlob.includes("Storm Eunice"));
  assert.ok(!manBlob.includes("26,705"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.match(String(manifest.attribution), /Open Government Licence v3\.0/);

  const cache = mkdtempSync(join(tmpdir(), "ofwat-enforcement-collect-"));
  const prevDir = process.env.OFWAT_ENFORCEMENT_DIR;
  process.env.OFWAT_ENFORCEMENT_DIR = cache;
  try {
    const snap = await collectOfwatEnforcement({ htmlDir: fixtures, limit: 3, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.equal(snap.cards.length, 2, "first slice harvests the two archived official bodies");
    assert.ok(snap.cards.some((c) => c.id === SEW_ID && isRealOfwatEnforcementBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === THAMES_ID && isRealOfwatEnforcementBody(c.body)));
    assert.ok(
      !snap.cards.some((c) => c.sourceUrl === SOUTHERN_PDF),
      "do not invent Southern Water body when the PDF is not on disk",
    );
    assert.ok(snap.cards.every((c) => isRealOfwatEnforcementBody(c.body)));
    assert.ok(!snap.cards.some((c) => /jane|curriculum vitae/i.test(c.institution)), "skip people");
    assert.ok(snap.cards.every((c) => officialOfwatPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectOfwatEnforcement({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === SEW_ID), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 2);
  } finally {
    if (prevDir === undefined) delete process.env.OFWAT_ENFORCEMENT_DIR;
    else process.env.OFWAT_ENFORCEMENT_DIR = prevDir;
  }

  console.log("ofwat-enforcement parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
