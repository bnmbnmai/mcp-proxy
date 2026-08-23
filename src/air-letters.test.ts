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
  buildAirLettersManifest,
  collectAirLetters,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealAirLetterBody,
  officialAirLetterPdfUrl,
  parseAirLetterText,
  parseListingHtml,
  parseListingRows,
  pdfIdFromUrl,
  type AirLetterListingRow,
} from "./air-letters.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/air-letters");
const KAGOME = "https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as AirLetterListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official APHIS excerpt lists institution AIR confirmation letters");
  const kagome = listed.find((r) => r.id === "26-173-01air");
  assert.ok(kagome);
  assert.match(kagome?.institution ?? "", /KAGOME/i);
  assert.equal(kagome?.date, "2026-06-22");
  assert.equal(kagome?.sourceUrl, KAGOME);
  assert.ok(listed.some((r) => r.id === "26-009-01air"));
  assert.ok(listed.some((r) => r.id === "25-364-01air"));
  assert.ok(listed.some((r) => r.id === "25-317-01air"));
  assert.ok(listed.some((r) => r.id === "25-226-01air"));
  assert.ok(!listed.some((r) => r.id === "26-999-01air"), "skip people");
  assert.ok(listed.every((r) => officialAirLetterPdfUrl(r.sourceUrl)));
  assert.equal(officialAirLetterPdfUrl(KAGOME), KAGOME);
  assert.equal(officialAirLetterPdfUrl("https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf"), null);
  assert.equal(officialAirLetterPdfUrl("https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf"), null);
  assert.equal(officialAirLetterPdfUrl("https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download"), null);
  assert.ok(LISTING_URL.includes("aphis.usda.gov"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "26-173-01air"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "26-173-01air"));
  assert.ok(htmlListed.some((r) => /KAGOME/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /Inari/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /Jane Q Public/i.test(r.institution)));

  const people = rows.find((r) => (r.docket ?? "") === "26-999-01air");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const kagomeRow = rows.find((r) => r.docket === "26-173-01air" && officialAirLetterPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(kagomeRow!), true);
  assert.equal(isPeopleRow(kagomeRow!), false);

  const kagomeText = parseAirLetterText(readFx("26-173-01air.txt"), {
    sourceUrl: KAGOME,
    institution: "KAGOME Co., LTD.",
    date: "2026-06-22",
    docket: "26-173-01air",
  });
  assert.equal(kagomeText.docket, "26-173-01air");
  assert.match(kagomeText.institution, /KAGOME/i);
  assert.equal(kagomeText.date, "2026-06-22");
  assert.equal(kagomeText.title, "AIR confirmation letter");
  assert.ok(isRealAirLetterBody(kagomeText.body));
  assert.ok(kagomeText.body.includes("enhanced abiotic stress tolerance"));
  assert.ok(kagomeText.body.includes("2026.08.14 09:05:45"));
  assert.ok(kagomeText.body.includes("reynolds.alan@epa.gov"));
  assert.ok(CARD_FIELDS.every((f) => f in kagomeText));
  assert.equal(pdfIdFromUrl(kagomeText.sourceUrl), "26-173-01air-response.pdf");
  assert.equal(kagomeText.sourceUrl, KAGOME);

  for (const [file, docket, url] of [
    ["26-009-01air.txt", "26-009-01air", "https://direct.aphis.usda.gov/sites/default/files/26-009-01air-response.pdf"],
    ["25-364-01air.txt", "25-364-01air", "https://direct.aphis.usda.gov/sites/default/files/25-364-01air-response.pdf"],
    ["25-317-01air.txt", "25-317-01air", "https://direct.aphis.usda.gov/sites/default/files/25-317-01air-response.pdf"],
    ["25-226-01air.txt", "25-226-01air", "https://direct.aphis.usda.gov/sites/default/files/25-226-01air-response.pdf"],
  ] as const) {
    const card = parseAirLetterText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealAirLetterBody(card.body), `${docket} is official APHIS AIR confirmation-letter TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialAirLetterPdfUrl(card.sourceUrl));
  }

  const teaser = parseAirLetterText(readFx("no-body.txt"), {
    sourceUrl: "https://www.aphis.usda.gov/news/kagome-press",
    institution: "KAGOME Co., LTD.",
  });
  assert.equal(isRealAirLetterBody(teaser.body), false, "press/teaser is not the letter body");

  const peopleBody = parseAirLetterText(readFx("people.txt"), {
    sourceUrl: KAGOME,
    institution: "Jane Q Public",
  });
  assert.equal(isRealAirLetterBody(peopleBody.body), false, "people file is not this SKU");

  const fr = parseAirLetterText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/08/14/2026-99999/kagome",
    institution: "KAGOME Co., LTD.",
  });
  assert.equal(isRealAirLetterBody(fr.body), false, "Federal Register raw_text is a KILL");

  const ttb = parseAirLetterText(readFx("ttb-oic.txt"), {
    sourceUrl: "https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
    institution: "The 21st Amendment Brewery Cafe, LLC",
  });
  assert.equal(isRealAirLetterBody(ttb.body), false, "TTB /ttb-oic is not this SKU");

  const denovo = parseAirLetterText(readFx("denovo-order.txt"), {
    sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf",
    institution: "Caristo Diagnostics Ltd.",
  });
  assert.equal(isRealAirLetterBody(denovo.body), false, "De Novo /denovo-orders is not this SKU");

  const fifra = parseAirLetterText(readFx("fifra-order.txt"), {
    sourceUrl: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/x.pdf",
    institution: "Travel Caddy, Inc. dba Travelon",
  });
  assert.equal(isRealAirLetterBody(fifra.body), false, "FIFRA /fifra-orders is not this SKU");

  const cftc = parseAirLetterText(readFx("cftc-order.txt"), {
    sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealAirLetterBody(cftc.body), false, "CFTC /cftc-orders is not this SKU");

  const superfund = parseAirLetterText(readFx("superfund-rod.txt"), {
    sourceUrl: "https://semspub.epa.gov/work/05/711427.pdf",
    institution: "Federated Metals Corp. Whiting Superfund Site",
  });
  assert.equal(isRealAirLetterBody(superfund.body), false, "Superfund /superfund-rods is not this SKU");

  const ico = parseAirLetterText(readFx("ico-mpn.txt"), {
    sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
    institution: "Reddit, Inc.",
  });
  assert.equal(isRealAirLetterBody(ico.body), false, "ICO /ico-mpn is not this SKU");

  const manifest = buildAirLettersManifest({
    ok: true,
    product: "aphis-air-confirmation-letter-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-06-22",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://direct.aphis.usda.gov/" },
    cards: [kagomeText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /KAGOME/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "26-173-01air");
  assert.ok(!manBlob.includes("enhanced abiotic stress tolerance"), "free manifest must not dump letter body");
  assert.ok(!manBlob.includes("2026.08.14 09:05:45"));
  assert.ok(!manBlob.includes("reynolds.alan@epa.gov"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("26-173-01air"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "USDA APHIS");

  const cache = mkdtempSync(join(tmpdir(), "air-letters-collect-"));
  const prevDir = process.env.AIR_LETTERS_DIR;
  process.env.AIR_LETTERS_DIR = cache;
  try {
    const snap = await collectAirLetters({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official APHIS institution AIR letter bodies");
    assert.ok(snap.cards.some((c) => c.docket === "26-173-01air" && isRealAirLetterBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealAirLetterBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "26-999-01air"), "skip people");
    assert.ok(snap.cards.every((c) => officialAirLetterPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectAirLetters({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "26-173-01air"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.AIR_LETTERS_DIR;
    else process.env.AIR_LETTERS_DIR = prevDir;
  }

  console.log("air-letters parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
