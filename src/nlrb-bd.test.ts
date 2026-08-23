import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  ATTRIBUTION,
  CARD_FIELDS,
  LICENSE,
  LISTING_URL,
  SEED_LISTINGS,
  WGET_SAFARI_UA,
  buildNlrbBdManifest,
  collectNlrbBd,
  compactForMatch,
  isInstitutionDecisionRow,
  isPeopleRow,
  isRealNlrbBdBody,
  officialNlrbBdPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseNlrbBdText,
  type NlrbBdListingRow,
} from "./nlrb-bd.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/nlrb-bd");
const LEAD = "https://apps.nlrb.gov/link/document.aspx/09031d45843171e1";

const LEAK_NEEDLES = ["Shift Marketplace", "we dismiss the complaint", "375 NLRB No. 28"];

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

function hasNeedle(text: string, needle: string): boolean {
  return compactForMatch(text).includes(needle);
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as NlrbBdListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official NLRB excerpt lists company/institution Board Decisions");
  const lead = listed.find((r) => r.id === "starbucks-19-ca-295850");
  assert.ok(lead);
  assert.match(lead?.institution ?? "", /Starbucks Corporation/i);
  assert.equal(lead?.date, "2026-08-05");
  assert.equal(lead?.docket, "19-CA-295850");
  assert.equal(lead?.sourceUrl, LEAD);
  assert.ok(listed.some((r) => r.id === "cvs-01-ca-365034"));
  assert.ok(listed.some((r) => r.id === "osg-12-ca-386056"));
  assert.ok(listed.some((r) => r.id === "ralphs-21-ca-073942"));
  assert.ok(listed.some((r) => r.id === "x-factor-31-ca-323348"));
  assert.ok(!listed.some((r) => r.id === "jane-doe-person"), "skip people");
  assert.ok(!listed.some((r) => r.id === "starbucks-listing-teaser"), "skip Board Decisions listing");
  assert.ok(!listed.some((r) => r.id === "starbucks-case-page"), "skip case-page teaser");
  assert.ok(!listed.some((r) => r.id === "citenet"), "skip CiteNet");
  assert.ok(!listed.some((r) => r.id === "case-search-csv"), "skip case-search CSV");
  assert.ok(!listed.some((r) => r.id === "alj-only"), "skip ALJ-only");
  assert.ok(!listed.some((r) => r.id === "fr-notice"), "skip FR");
  assert.ok(!listed.some((r) => r.id === "govinfo"), "skip GovInfo");
  assert.ok(!listed.some((r) => r.id === "catalog-data-gov"), "skip catalog.data.gov");
  assert.ok(!listed.some((r) => r.id === "govuk-corporate-report"), "skip GOV.UK corporate_report");
  assert.ok(!listed.some((r) => r.id === "nop-ad"), "skip /nop-ad");
  assert.ok(listed.every((r) => officialNlrbBdPdfUrl(r.sourceUrl)));
  assert.equal(officialNlrbBdPdfUrl(LEAD), LEAD);
  assert.equal(officialNlrbBdPdfUrl("https://www.nlrb.gov/cases-decisions/decisions/board-decisions"), null);
  assert.equal(officialNlrbBdPdfUrl("https://www.nlrb.gov/case/19-CA-295850"), null);
  assert.equal(officialNlrbBdPdfUrl("https://www.nlrb.gov/cases-decisions/cases/research"), null);
  assert.equal(officialNlrbBdPdfUrl("https://www.federalregister.gov/documents/2026/01/01/example"), null);
  assert.equal(officialNlrbBdPdfUrl("https://www.govinfo.gov/content/pkg/example/pdf/example.pdf"), null);
  assert.equal(officialNlrbBdPdfUrl("https://catalog.data.gov/dataset/nlrb"), null);
  assert.equal(officialNlrbBdPdfUrl("https://www.gov.uk/government/publications/example"), null);
  assert.ok(LISTING_URL.includes("board-decisions"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.id === "starbucks-19-ca-295850"));
  assert.match(WGET_SAFARI_UA, /Safari/);

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "starbucks-19-ca-295850"));
  assert.ok(htmlListed.some((r) => /Starbucks Corporation/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => r.id === "ralphs-21-ca-073942"));
  assert.ok(htmlListed.some((r) => r.id === "x-factor-31-ca-323348"));
  assert.ok(!htmlListed.some((r) => /jane doe/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /federalregister/i.test(r.sourceUrl)));
  assert.ok(!htmlListed.some((r) => /nlrb\.gov\/case\//i.test(r.sourceUrl)));

  const people = rows.find((r) => (r.id ?? "") === "jane-doe-person");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionDecisionRow(people!), false);
  const leadRow = rows.find((r) => r.id === "starbucks-19-ca-295850" && officialNlrbBdPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionDecisionRow(leadRow!), true);
  assert.equal(isPeopleRow(leadRow!), false);
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "starbucks-listing-teaser")!), false, "listing is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "starbucks-case-page")!), false, "case page is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "citenet")!), false, "CiteNet is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "case-search-csv")!), false, "case-search CSV is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "alj-only")!), false, "ALJ-only is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "fr-notice")!), false, "FR is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "govinfo")!), false, "GovInfo is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "catalog-data-gov")!), false, "catalog.data.gov is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "govuk-corporate-report")!), false, "GOV.UK corporate_report is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "nop-ad")!), false, "/nop-ad is a KILL");

  const leadText = parseNlrbBdText(readFx("starbucks-19-ca-295850.txt"), {
    sourceUrl: LEAD,
    institution: "Starbucks Corporation",
    date: "2026-08-05",
    id: "starbucks-19-ca-295850",
    docket: "19-CA-295850",
    title: "Decision and Order",
  });
  assert.equal(leadText.id, "starbucks-19-ca-295850");
  assert.match(leadText.institution, /Starbucks Corporation/i);
  assert.equal(leadText.date, "2026-08-05");
  assert.equal(leadText.docket, "19-CA-295850");
  assert.ok(isRealNlrbBdBody(leadText.body));
  for (const needle of LEAK_NEEDLES) {
    assert.ok(hasNeedle(leadText.body, needle), `Starbucks 19-CA-295850 contains ${needle}`);
  }
  assert.ok(CARD_FIELDS.every((f) => f in leadText));
  assert.equal(leadText.sourceUrl, LEAD);
  assert.match(leadText.body, /An Agency of the United States Government/);

  for (const [file, id, url] of [
    ["cvs-01-ca-365034.txt", "cvs-01-ca-365034", "https://apps.nlrb.gov/link/document.aspx/09031d458431f711"],
    ["osg-12-ca-386056.txt", "osg-12-ca-386056", "https://apps.nlrb.gov/link/document.aspx/09031d45843204c3"],
    ["ralphs-21-ca-073942.txt", "ralphs-21-ca-073942", "https://apps.nlrb.gov/link/document.aspx/09031d45843209af"],
    ["x-factor-31-ca-323348.txt", "x-factor-31-ca-323348", "https://apps.nlrb.gov/link/document.aspx/09031d45843209db"],
  ] as const) {
    const card = parseNlrbBdText(readFx(file), { sourceUrl: url, id });
    assert.ok(isRealNlrbBdBody(card.body), `${id} is official NLRB Board Decision TEXT`);
    assert.equal(card.id, id);
    assert.ok(officialNlrbBdPdfUrl(card.sourceUrl));
  }

  const teaserBody = parseNlrbBdText(readFx("no-body.txt"), {
    sourceUrl: LISTING_URL,
    institution: "Starbucks Corporation",
  });
  assert.equal(isRealNlrbBdBody(teaserBody.body), false, "listing teaser is not the Decision and Order body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(teaserBody.body, needle), `teaser must not contain ${needle}`);
  }
  assert.ok(teaserBody.body.includes("19-CA-295850"), "index may show the case number");

  const casePageBody = parseNlrbBdText(readFx("case-page.txt"), {
    sourceUrl: "https://www.nlrb.gov/case/19-CA-295850",
    institution: "Starbucks Corporation",
  });
  assert.equal(isRealNlrbBdBody(casePageBody.body), false, "case-page 8(a) codes are not the sold body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(casePageBody.body, needle), `case-page teaser must not contain ${needle}`);
  }
  assert.ok(casePageBody.body.includes("8(a)(1)"), "case page may show allegation codes");

  const peopleBody = parseNlrbBdText(readFx("people.txt"), {
    sourceUrl: LEAD,
    institution: "Jane Doe",
  });
  assert.equal(isRealNlrbBdBody(peopleBody.body), false, "people file is not this SKU");

  assert.equal(
    isRealNlrbBdBody(
      parseNlrbBdText(readFx("citenet.txt"), {
        sourceUrl: "https://www.nlrb.gov/cases-decisions/cases/research",
        institution: "Starbucks Corporation",
      }).body,
    ),
    false,
    "CiteNet is a KILL",
  );
  assert.equal(
    isRealNlrbBdBody(
      parseNlrbBdText(readFx("case-search-csv.txt"), {
        sourceUrl: "https://www.nlrb.gov/search/case",
        institution: "Starbucks Corporation",
      }).body,
    ),
    false,
    "case-search CSV is a KILL",
  );
  assert.equal(
    isRealNlrbBdBody(
      parseNlrbBdText(readFx("alj-only.txt"), {
        sourceUrl: "https://apps.nlrb.gov/link/document.aspx/09031d4583a8989f",
        institution: "Starbucks Corporation",
      }).body,
    ),
    false,
    "ALJ-only is a KILL",
  );
  assert.equal(
    isRealNlrbBdBody(
      parseNlrbBdText(readFx("fr.txt"), {
        sourceUrl: "https://www.federalregister.gov/documents/2026/01/01/example",
        institution: "Example Corp",
      }).body,
    ),
    false,
    "FR is a KILL",
  );
  assert.equal(
    isRealNlrbBdBody(
      parseNlrbBdText(readFx("govinfo.txt"), {
        sourceUrl: "https://www.govinfo.gov/content/pkg/example/pdf/example.pdf",
        institution: "Example Corp",
      }).body,
    ),
    false,
    "GovInfo is a KILL",
  );
  assert.equal(
    isRealNlrbBdBody(
      parseNlrbBdText(readFx("catalog-data-gov.txt"), {
        sourceUrl: "https://catalog.data.gov/dataset/nlrb",
        institution: "Example Corp",
      }).body,
    ),
    false,
    "catalog.data.gov is a KILL",
  );
  assert.equal(
    isRealNlrbBdBody(
      parseNlrbBdText(readFx("corporate-report.txt"), {
        sourceUrl: "https://www.gov.uk/government/publications/example",
        institution: "Example Department",
      }).body,
    ),
    false,
    "GOV.UK corporate_report is a KILL",
  );
  assert.equal(
    isRealNlrbBdBody(
      parseNlrbBdText(readFx("nop-ad.txt"), {
        sourceUrl: "https://www.ams.usda.gov/sites/default/files/media/DecisionAPL-000-24_ExampleOrganics.pdf",
        institution: "Example Organics, LLC",
      }).body,
    ),
    false,
    "/nop-ad is a KILL",
  );

  const manifest = buildNlrbBdManifest({
    ok: true,
    product: "nlrb-bd-decision-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-08-05",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      pdfHost: "https://apps.nlrb.gov/link/document.aspx/",
      about: "https://www.nlrb.gov/about-nlrb",
    },
    cards: [leadText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Starbucks Corporation/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "19-CA-295850");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!manBlob.includes(needle), `free manifest must not dump ${needle}`);
  }
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("starbucks-19-ca-295850"));
  assert.ok(manBlob.includes("19-CA-295850"), "case number may appear on the card");
  assert.equal(manifest.priceUsdc, "0.05");
  assert.match(String(manifest.license), /17 U\.S\.C\. § 105/i);
  assert.match(String(manifest.attribution), /An Agency of the United States Government/i);
  assert.ok(!/CC BY-NC|Creative Commons.*NonCommercial/i.test(String(manifest.license) + String(manifest.attribution)));

  const cache = mkdtempSync(join(tmpdir(), "nlrb-bd-collect-"));
  const prevDir = process.env.NLRB_BD_DIR;
  process.env.NLRB_BD_DIR = cache;
  try {
    const snap = await collectNlrbBd({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official NLRB Board Decision bodies");
    assert.ok(snap.cards.some((c) => c.id === "starbucks-19-ca-295850" && isRealNlrbBdBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealNlrbBdBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "jane-doe-person"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "starbucks-case-page"), "skip case-page teaser");
    assert.ok(snap.cards.every((c) => officialNlrbBdPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectNlrbBd({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === "starbucks-19-ca-295850"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.NLRB_BD_DIR;
    else process.env.NLRB_BD_DIR = prevDir;
  }

  console.log("nlrb-bd parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
