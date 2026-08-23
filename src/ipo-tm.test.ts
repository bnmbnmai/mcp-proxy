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
  buildIpoTmManifest,
  collectIpoTm,
  compactForMatch,
  isInstitutionHearingRow,
  isPeopleRow,
  isRealIpoTmBody,
  officialIpoTmPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseIpoTmText,
  pdfIdFromUrl,
  type IpoTmListingRow,
} from "./ipo-tm.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ipo-tm");
const ROADGET = "https://www.ipo.gov.uk/t-challenge-decision-results/o071326.pdf";

const LEAK_NEEDLES = ["442930", "3914395", "£2800", "section 5(2)(b)"];

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

function hasNeedle(text: string, needle: string): boolean {
  return compactForMatch(text).includes(needle);
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as IpoTmListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official IPO excerpt lists company hearings");
  const roadget = listed.find((r) => r.id === "o071326-roadget-dsquared");
  assert.ok(roadget);
  assert.match(roadget?.institution ?? "", /Roadget Business Pte\. Ltd/i);
  assert.equal(roadget?.date, "2026-08-10");
  assert.equal(roadget?.bl, "O/0713/26");
  assert.equal(roadget?.sourceUrl, ROADGET);
  assert.ok(listed.some((r) => r.id === "o072126-savant"));
  assert.ok(listed.some((r) => r.id === "o068626-supermac-mcdonalds"));
  assert.ok(listed.some((r) => r.id === "o122125-food-brut-jolene"));
  assert.ok(listed.some((r) => r.id === "o012125-ronix-delonghi"));
  assert.ok(!listed.some((r) => r.id === "jane-smith-person"), "skip people-applicant");
  assert.ok(!listed.some((r) => r.id === "year-grid-card"), "skip year-grid card");
  assert.ok(!listed.some((r) => r.id === "tm-journal-xml"), "skip TM Journal XML");
  assert.ok(!listed.some((r) => r.id === "design-decision"), "skip design_decision");
  assert.ok(!listed.some((r) => r.id === "govuk-trademark-decision"), "skip GOV.UK");
  assert.ok(!listed.some((r) => r.id === "find-case-law"), "skip Find Case Law");
  assert.ok(listed.every((r) => officialIpoTmPdfUrl(r.sourceUrl)));
  assert.equal(officialIpoTmPdfUrl(ROADGET), ROADGET);
  assert.equal(officialIpoTmPdfUrl("https://www.ipo.gov.uk/t-challenge-decision-results/t-challenge-decision-results-bl26.htm"), null);
  assert.equal(officialIpoTmPdfUrl("https://www.ipo.gov.uk/d-challenge-decision-results/o010026.pdf"), null);
  assert.equal(officialIpoTmPdfUrl("https://www.ipo.gov.uk/t-tmj/tmj.xml"), null);
  assert.equal(officialIpoTmPdfUrl("https://www.gov.uk/search-trade-mark-decisions"), null);
  assert.equal(officialIpoTmPdfUrl("https://caselaw.nationalarchives.gov.uk/ukipo/o-0713-26"), null);
  assert.equal(officialIpoTmPdfUrl("https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf"), null);
  assert.ok(LISTING_URL.includes("ipo.gov.uk"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "o071326-roadget-dsquared"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "o071326-roadget-dsquared"));
  assert.ok(htmlListed.some((r) => /Roadget/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /Savant/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /year-grid/i.test(r.title)));
  assert.ok(!htmlListed.some((r) => /journal/i.test(r.title)));

  const people = rows.find((r) => (r.docket ?? "") === "jane-smith-person");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionHearingRow(people!), false);
  const roadgetRow = rows.find((r) => r.docket === "o071326-roadget-dsquared" && officialIpoTmPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionHearingRow(roadgetRow!), true);
  assert.equal(isPeopleRow(roadgetRow!), false);
  const grid = rows.find((r) => r.docket === "year-grid-card");
  assert.equal(isInstitutionHearingRow(grid!), false, "year-grid card is not this SKU");
  const journal = rows.find((r) => r.docket === "tm-journal-xml");
  assert.equal(isInstitutionHearingRow(journal!), false, "TM Journal XML is not this SKU");

  const roadgetText = parseIpoTmText(readFx("o071326-roadget-dsquared.txt"), {
    sourceUrl: ROADGET,
    institution: "Roadget Business Pte. Ltd / Dsquared2 Trademarks Limited",
    date: "2026-08-10",
    docket: "o071326-roadget-dsquared",
    bl: "O/0713/26",
    title: "Opposition",
  });
  assert.equal(roadgetText.docket, "o071326-roadget-dsquared");
  assert.match(roadgetText.institution, /Roadget Business Pte\. Ltd/i);
  assert.equal(roadgetText.date, "2026-08-10");
  assert.equal(roadgetText.bl, "O/0713/26");
  assert.equal(roadgetText.title, "Opposition");
  assert.ok(isRealIpoTmBody(roadgetText.body));
  for (const needle of LEAK_NEEDLES) {
    assert.ok(hasNeedle(roadgetText.body, needle), `O/0713/26 hearing contains ${needle}`);
  }
  assert.ok(hasNeedle(roadgetText.body, "Roadget"));
  assert.ok(hasNeedle(roadgetText.body, "Dsquared"));
  assert.ok(CARD_FIELDS.every((f) => f in roadgetText));
  assert.equal(pdfIdFromUrl(roadgetText.sourceUrl), "o071326.pdf");
  assert.equal(roadgetText.sourceUrl, ROADGET);

  for (const [file, docket, url] of [
    ["o072126-savant.txt", "o072126-savant", "https://www.ipo.gov.uk/t-challenge-decision-results/o072126.pdf"],
    ["o068626-supermac-mcdonalds.txt", "o068626-supermac-mcdonalds", "https://www.ipo.gov.uk/t-challenge-decision-results/o068626.pdf"],
    ["o122125-food-brut-jolene.txt", "o122125-food-brut-jolene", "https://www.ipo.gov.uk/t-challenge-decision-results/o122125.pdf"],
    ["o012125-ronix-delonghi.txt", "o012125-ronix-delonghi", "https://www.ipo.gov.uk/t-challenge-decision-results/o012125.pdf"],
  ] as const) {
    const card = parseIpoTmText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealIpoTmBody(card.body), `${docket} is official IPO hearing TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialIpoTmPdfUrl(card.sourceUrl));
  }

  const teaserBody = parseIpoTmText(readFx("no-body.txt"), {
    sourceUrl: "https://www.ipo.gov.uk/t-challenge-decision-results/t-challenge-decision-results-bl26.htm",
    institution: "Roadget Business Pte. Ltd",
  });
  assert.equal(isRealIpoTmBody(teaserBody.body), false, "year-grid card is not the hearing body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(teaserBody.body, needle), `teaser must not contain ${needle}`);
  }

  const peopleBody = parseIpoTmText(readFx("people.txt"), {
    sourceUrl: ROADGET,
    institution: "Jane Smith",
  });
  assert.equal(isRealIpoTmBody(peopleBody.body), false, "people file is not this SKU");

  const gridBody = parseIpoTmText(readFx("year-grid.txt"), {
    sourceUrl: "https://www.ipo.gov.uk/t-challenge-decision-results/t-challenge-decision-results-bl26.htm",
    institution: "Roadget Business Pte. Ltd",
  });
  assert.equal(isRealIpoTmBody(gridBody.body), false, "year-grid is a KILL");

  const journalBody = parseIpoTmText(readFx("tm-journal.txt"), {
    sourceUrl: "https://www.ipo.gov.uk/t-tmj/tmj.xml",
    institution: "Roadget Business Pte. Ltd",
  });
  assert.equal(isRealIpoTmBody(journalBody.body), false, "TM Journal XML is a KILL");

  const designBody = parseIpoTmText(readFx("design-decision.txt"), {
    sourceUrl: "https://www.ipo.gov.uk/d-challenge-decision-results/o010026.pdf",
    institution: "Acme Designs Limited",
  });
  assert.equal(isRealIpoTmBody(designBody.body), false, "design_decision is a KILL");

  const govUk = parseIpoTmText(readFx("gov-uk.txt"), {
    sourceUrl: "https://www.gov.uk/search-trade-mark-decisions",
    institution: "Roadget Business Pte. Ltd",
  });
  assert.equal(isRealIpoTmBody(govUk.body), false, "GOV.UK trademark_decision is a KILL");

  const caselaw = parseIpoTmText(readFx("find-case-law.txt"), {
    sourceUrl: "https://caselaw.nationalarchives.gov.uk/ukipo/o-0713-26",
    institution: "Roadget Business Pte. Ltd",
  });
  assert.equal(isRealIpoTmBody(caselaw.body), false, "Find Case Law is a KILL");

  const ico = parseIpoTmText(readFx("ico-mpn.txt"), {
    sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
    institution: "Reddit, Inc.",
  });
  assert.equal(isRealIpoTmBody(ico.body), false, "ICO /ico-mpn is not this SKU");

  const phmsa = parseIpoTmText(readFx("phmsa-cop.txt"), {
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/12025033NOPV/12025033NOPV_Consent%20Agreement%20and%20Order_04212026_(22-259271).pdf",
    institution: "EQT Production Company",
  });
  assert.equal(isRealIpoTmBody(phmsa.body), false, "PHMSA /phmsa-cop is not this SKU");

  const acm = parseIpoTmText(readFx("acm-besluiten.txt"), {
    sourceUrl: "https://www.acm.nl/system/files/documents/boetebesluit-house-of-tickets.pdf",
    institution: "House of Tickets B.V.",
  });
  assert.equal(isRealIpoTmBody(acm.body), false, "ACM /acm-besluiten is not this SKU");

  const ccpc = parseIpoTmText(readFx("ccpc-mergers.txt"), {
    sourceUrl:
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/united-hardware-dermot-kehoe-supply---diy/m-26-006-determination.pdf",
    institution: "United Hardware DAC",
  });
  assert.equal(isRealIpoTmBody(ccpc.body), false, "CCPC /ccpc-mergers is not this SKU");

  const bkarta = parseIpoTmText(readFx("bkarta-entscheidungen.txt"), {
    sourceUrl:
      "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Missbrauchsaufsicht/B2-73-20.pdf?__blob=publicationFile&v=3",
    institution: "Amazon.com, Inc.",
  });
  assert.equal(isRealIpoTmBody(bkarta.body), false, "BKartA /bkarta-entscheidungen is not this SKU");

  const cma = parseIpoTmText(readFx("cma-ca98.txt"), {
    sourceUrl: "https://assets.publishing.service.gov.uk/media/cma-ca98.pdf",
    institution: "A Company Ltd",
  });
  assert.equal(isRealIpoTmBody(cma.body), false, "CMA /cma-ca98 is not this SKU");

  const manifest = buildIpoTmManifest({
    ok: true,
    product: "ipo-institution-tm-hearing-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-08-11",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://www.ipo.gov.uk/t-challenge-decision-results/" },
    cards: [roadgetText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Roadget/i);
  assert.equal((manifest.cards as { bl: string }[])[0]?.bl, "O/0713/26");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!manBlob.includes(needle), `free manifest must not dump ${needle}`);
  }
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("o071326-roadget-dsquared"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "Crown + OGL v3.0");
  assert.match(String(manifest.attribution), /Open Government Licence v3\.0/);

  const cache = mkdtempSync(join(tmpdir(), "ipo-tm-collect-"));
  const prevDir = process.env.IPO_TM_DIR;
  process.env.IPO_TM_DIR = cache;
  try {
    const snap = await collectIpoTm({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official IPO hearing bodies");
    assert.ok(snap.cards.some((c) => c.docket === "o071326-roadget-dsquared" && isRealIpoTmBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealIpoTmBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "jane-smith-person"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "year-grid-card"), "skip year-grid");
    assert.ok(snap.cards.every((c) => officialIpoTmPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectIpoTm({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "o071326-roadget-dsquared"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.IPO_TM_DIR;
    else process.env.IPO_TM_DIR = prevDir;
  }

  console.log("ipo-tm parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
