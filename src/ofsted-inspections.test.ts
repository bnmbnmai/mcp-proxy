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
  buildOfstedInspectionsManifest,
  collectOfstedInspections,
  isOfficialInspectionPdf,
  isPeopleRow,
  isRealOfstedInspectionBody,
  namedDateToIso,
  officialInspectionPdfUrl,
  officialPageUrl,
  parseListingRows,
  parseOfstedInspectionText,
  parseProviderHtml,
} from "./ofsted-inspections.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ofsted-inspections");
const ABBERLEY_PDF = "https://files.ofsted.gov.uk/v1/file/50276206";
const ABBERLEY_PAGE = "https://reports.ofsted.gov.uk/provider/21/116780";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listing = parseProviderHtml(readFx("listing-excerpt.html"), ABBERLEY_PAGE);
  assert.ok(listing.some((r) => r.id === "50276206"), "provider HTML yields Abberley official PDF");
  assert.ok(listing.every((r) => officialInspectionPdfUrl(r.sourceUrl)));
  assert.ok(listing.every((r) => r.urn === "116780"));
  assert.ok(
    listing.every((r) => !/academy conversion/i.test(r.inspectionType)),
    "skip academy-conversion notices",
  );

  const listed = parseListingRows(SEED_LISTINGS);
  assert.ok(listed.length >= 14, "seed lists 14+ official Ofsted inspection PDFs");
  assert.ok(listed.some((r) => r.id === "50276206"));
  assert.ok(listed.some((r) => r.urn === "116780"));
  assert.ok(listed.every((r) => officialInspectionPdfUrl(r.sourceUrl)));
  assert.equal(officialInspectionPdfUrl(ABBERLEY_PDF), ABBERLEY_PDF);
  assert.equal(officialPageUrl(ABBERLEY_PAGE), ABBERLEY_PAGE);
  assert.equal(
    officialInspectionPdfUrl("https://reports.ofsted.gov.uk/provider/21/116780"),
    null,
    "provider HTML is the index, not the sold PDF",
  );
  assert.equal(officialInspectionPdfUrl("https://files.ofsted.gov.uk/v1/file/50276206/metadata"), null);
  assert.equal(officialPageUrl("https://reports.ofsted.gov.uk/provider/49/RP907442"), null);
  assert.ok(isOfficialInspectionPdf(ABBERLEY_PDF));
  assert.ok(INDEX_URL.includes("reports.ofsted.gov.uk"));
  assert.equal(namedDateToIso("06 May 2025"), "2025-05-06");
  assert.equal(isPeopleRow({ provider: "Jane Q Public CV", urn: "", id: "" }), true);
  assert.equal(isPeopleRow({ provider: "Jane the childminder", urn: "RP1", id: "1" }), true);

  const abberley = parseOfstedInspectionText(readFx("50276206.txt"), {
    sourceUrl: ABBERLEY_PDF,
    pageUrl: ABBERLEY_PAGE,
    provider: "Abberley Parochial VC Primary School",
    urn: "116780",
    date: "2025-05-06",
    inspectionType: "School inspection",
    id: "50276206",
    kind: "inspection-report",
  });
  assert.equal(abberley.id, "50276206");
  assert.equal(abberley.urn, "116780");
  assert.ok(isRealOfstedInspectionBody(abberley.body));
  assert.ok(abberley.body.includes("Inspection of Abberley"));
  assert.ok(abberley.body.includes("What is it like to attend this school") || abberley.body.includes("quality of education") || /quality of education/i.test(abberley.body));
  assert.ok(CARD_FIELDS.every((f) => f in abberley));

  for (const slug of ["50295804", "50309671", "50308721", "50308797"]) {
    const card = parseOfstedInspectionText(readFx(`${slug}.txt`), {
      sourceUrl: SEED_LISTINGS.find((r) => r.id === slug)?.sourceUrl || ABBERLEY_PDF,
      pageUrl: SEED_LISTINGS.find((r) => r.id === slug)?.pageUrl,
      id: slug,
      provider: slug,
      urn: SEED_LISTINGS.find((r) => r.id === slug)?.urn,
    });
    assert.ok(isRealOfstedInspectionBody(card.body), `${slug} is official Ofsted inspection TEXT`);
    assert.equal(card.id, slug);
  }

  const teaser = parseOfstedInspectionText(readFx("teaser.txt"), {
    sourceUrl: ABBERLEY_PDF,
    provider: "Abberley Parochial VC Primary School",
  });
  assert.equal(isRealOfstedInspectionBody(teaser.body), false, "grades-only teaser is not the report body");

  const peopleBody = parseOfstedInspectionText(readFx("people.txt"), {
    sourceUrl: ABBERLEY_PDF,
    provider: "Jane Q Public",
  });
  assert.equal(isRealOfstedInspectionBody(peopleBody.body), false, "people file is not this SKU");

  const wrap = parseOfstedInspectionText(readFx("json-wrap.txt"), {
    sourceUrl: ABBERLEY_PDF,
    provider: "Abberley",
  });
  assert.equal(isRealOfstedInspectionBody(wrap.body), false, "grades JSON is not the sold unit");

  const cardHtml = parseOfstedInspectionText(readFx("report-card.txt"), {
    sourceUrl: ABBERLEY_PDF,
    provider: "Abberley",
  });
  assert.equal(isRealOfstedInspectionBody(cardHtml.body), false, "report-card HTML banner is not the PDF body");

  const conversion = parseOfstedInspectionText(readFx("academy-conversion.txt"), {
    sourceUrl: "https://files.ofsted.gov.uk/v1/file/50308873",
    provider: "Wood's Foundation CofE Primary School",
  });
  assert.equal(isRealOfstedInspectionBody(conversion.body), false, "academy-conversion notice is not this SKU");

  const manifest = buildOfstedInspectionsManifest({
    ok: true,
    product: "ofsted-inspection-report-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-26T00:00:00.000Z",
    asOf: "2025-05-06",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      index: INDEX_URL,
      pdfHost: "https://files.ofsted.gov.uk/v1/file/",
      pageHost: INDEX_URL,
    },
    cards: [abberley],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.equal((manifest.cards as { provider: string }[])[0]?.provider, "Abberley Parochial VC Primary School");
  assert.equal((manifest.cards as { id: string }[])[0]?.id, "50276206");
  assert.equal((manifest.cards as { urn: string }[])[0]?.urn, "116780");
  assert.ok(!manBlob.includes("What is it like to attend this school"), "free manifest must not dump report body");
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.match(String(manifest.attribution), /Open Government Licence v3\.0/);

  const cache = mkdtempSync(join(tmpdir(), "ofsted-inspections-collect-"));
  const prevDir = process.env.OFSTED_INSPECTIONS_DIR;
  process.env.OFSTED_INSPECTIONS_DIR = cache;
  try {
    const snap = await collectOfstedInspections({ htmlDir: fixtures, limit: 12, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 6, "fixture collect extracts several official inspection bodies");
    assert.ok(snap.cards.some((c) => c.id === "50276206" && isRealOfstedInspectionBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealOfstedInspectionBody(c.body)));
    assert.ok(!snap.cards.some((c) => /jane|childminder/i.test(c.provider)), "skip people");
    assert.ok(snap.cards.every((c) => officialInspectionPdfUrl(c.sourceUrl)));
    assert.ok(snap.cards.every((c) => c.id && c.urn), "key on report id + URN, not inspector names");

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectOfstedInspections({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === "50276206"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 6);
  } finally {
    if (prevDir === undefined) delete process.env.OFSTED_INSPECTIONS_DIR;
    else process.env.OFSTED_INSPECTIONS_DIR = prevDir;
  }

  console.log("ofsted-inspections parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
