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
  buildCmaCa98Manifest,
  collectCmaCa98,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealCmaCa98Body,
  officialCmaCa98PdfUrl,
  parseListingHtml,
  parseListingRows,
  parseCmaCa98Text,
  pdfIdFromUrl,
  type CmaCa98ListingRow,
} from "./cma-ca98.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/cma-ca98");
const CITI_DB =
  "https://assets.publishing.service.gov.uk/media/6876390d352c290d20dcae7c/Citi-Deutsche_Bank__Non-confidential_decision.pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as CmaCa98ListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official CMA excerpt lists institution CA98 decisions");
  const citi = listed.find((r) => r.id === "50601-citi-db");
  assert.ok(citi);
  assert.match(citi?.institution ?? "", /Citigroup|Deutsche Bank/i);
  assert.equal(citi?.date, "2025-02-21");
  assert.equal(citi?.sourceUrl, CITI_DB);
  assert.ok(listed.some((r) => r.id === "50565-5"));
  assert.ok(listed.some((r) => r.id === "50952"));
  assert.ok(listed.some((r) => r.id === "CE-9856-14"));
  assert.ok(listed.some((r) => r.id === "50565-3"));
  assert.ok(!listed.some((r) => r.id === "50601-people"), "skip people");
  assert.ok(!listed.some((r) => r.id === "50601-press"), "skip press teaser");
  assert.ok(!listed.some((r) => r.id === "ico-mpn-clearview"), "skip ICO /ico-mpn");
  assert.ok(listed.every((r) => officialCmaCa98PdfUrl(r.sourceUrl)));
  assert.equal(officialCmaCa98PdfUrl(CITI_DB), CITI_DB);
  assert.equal(officialCmaCa98PdfUrl("https://semspub.epa.gov/work/05/711427.pdf"), null);
  assert.equal(officialCmaCa98PdfUrl("https://ico.org.uk/media/action-weve-taken/mpns/4020436/clearview-ai-inc-mpn.pdf"), null);
  assert.ok(LISTING_URL.includes("gov.uk/cma-cases"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "50601-citi-db"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "50601-citi-db"));
  assert.ok(htmlListed.some((r) => /Citigroup|Deutsche Bank/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /Dar Lighting/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /Jane Q Public/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /settlement with banks/i.test(r.title)));

  const people = rows.find((r) => (r.docket ?? "") === "50601-people");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const citiRow = rows.find((r) => r.docket === "50601-citi-db" && officialCmaCa98PdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(citiRow!), true);
  assert.equal(isPeopleRow(citiRow!), false);
  const press = rows.find((r) => r.docket === "50601-press");
  assert.equal(isInstitutionOrderRow(press!), false, "press teaser is not this SKU");
  const ico = rows.find((r) => r.docket === "ico-mpn-clearview");
  assert.equal(isInstitutionOrderRow(ico!), false, "ICO /ico-mpn is not this SKU");

  const citiText = parseCmaCa98Text(readFx("50601-citi-db.txt"), {
    sourceUrl: CITI_DB,
    institution: "Citigroup Global Markets Limited / Deutsche Bank Aktiengesellschaft",
    date: "2025-02-21",
    docket: "50601-citi-db",
    title: "CA98 infringement decision",
  });
  assert.equal(citiText.docket, "50601-citi-db");
  assert.match(citiText.institution, /Citigroup|Deutsche Bank/i);
  assert.equal(citiText.date, "2025-02-21");
  assert.equal(citiText.title, "CA98 infringement decision");
  assert.ok(isRealCmaCa98Body(citiText.body));
  assert.ok(citiText.body.includes("Citi-DB Relevant Period"));
  assert.ok(citiText.body.includes("gilt auctions"));
  assert.ok(citiText.body.includes("commercially sensitive information"));
  assert.ok(CARD_FIELDS.every((f) => f in citiText));
  assert.equal(pdfIdFromUrl(citiText.sourceUrl), "Citi-Deutsche_Bank__Non-confidential_decision.pdf");
  assert.equal(citiText.sourceUrl, CITI_DB);

  for (const [file, docket, url] of [
    [
      "50565-5.txt",
      "50565-5",
      "https://assets.publishing.service.gov.uk/media/5f171ab43a6f40727ebfb440/Non-confidential_infringement_decision.pdf",
    ],
    [
      "50952.txt",
      "50952",
      "https://assets.publishing.service.gov.uk/media/62aca145d3bf7f0af821ef5e/Case_50952_-_Non-Confi_Decision_for_Publication_21.6.22.pdf",
    ],
    [
      "CE-9856-14.txt",
      "CE-9856-14",
      "https://assets.publishing.service.gov.uk/media/575a8f5eed915d3d24000003/commercial-catering-equipment-non-confidential-decision.pdf",
    ],
    [
      "50565-3.txt",
      "50565-3",
      "https://assets.publishing.service.gov.uk/media/5e79d8aed3bf7f52efedfcad/20200320_50565-3_-_DECISION.pdf",
    ],
  ] as const) {
    const card = parseCmaCa98Text(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealCmaCa98Body(card.body), `${docket} is official CMA CA98 TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialCmaCa98PdfUrl(card.sourceUrl));
  }

  const teaser = parseCmaCa98Text(readFx("no-body.txt"), {
    sourceUrl: "https://www.gov.uk/government/news/cma-reaches-settlement-with-banks-in-competition-case",
    institution: "Citigroup Global Markets Limited / Deutsche Bank Aktiengesellschaft",
  });
  assert.equal(isRealCmaCa98Body(teaser.body), false, "press/teaser is not the decision body");

  const peopleBody = parseCmaCa98Text(readFx("people.txt"), {
    sourceUrl: CITI_DB,
    institution: "Jane Q Public",
  });
  assert.equal(isRealCmaCa98Body(peopleBody.body), false, "people file is not this SKU");

  const icoBody = parseCmaCa98Text(readFx("ico-mpn.txt"), {
    sourceUrl: "https://ico.org.uk/media/action-weve-taken/mpns/4020436/clearview-ai-inc-mpn.pdf",
    institution: "Clearview AI Inc.",
  });
  assert.equal(isRealCmaCa98Body(icoBody.body), false, "ICO /ico-mpn is not this SKU");

  const fr = parseCmaCa98Text(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2025/02/21/2025-99999/citi-db",
    institution: "Citigroup Global Markets Limited",
  });
  assert.equal(isRealCmaCa98Body(fr.body), false, "Federal Register raw_text is a KILL");

  const rod = parseCmaCa98Text(readFx("superfund-rod.txt"), {
    sourceUrl: "https://semspub.epa.gov/work/05/711427.pdf",
    institution: "Federated Metals Corp. Whiting Superfund Site",
  });
  assert.equal(isRealCmaCa98Body(rod.body), false, "Superfund /superfund-rods is not this SKU");

  const air = parseCmaCa98Text(readFx("air-letter.txt"), {
    sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf",
    institution: "KAGOME Co., LTD.",
  });
  assert.equal(isRealCmaCa98Body(air.body), false, "AIR /air-letters is not this SKU");

  const ttb = parseCmaCa98Text(readFx("ttb-oic.txt"), {
    sourceUrl: "https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
    institution: "The 21st Amendment Brewery Cafe, LLC",
  });
  assert.equal(isRealCmaCa98Body(ttb.body), false, "TTB /ttb-oic is not this SKU");

  const manifest = buildCmaCa98Manifest({
    ok: true,
    product: "cma-ca98-infringement-decision-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2025-02-21",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://assets.publishing.service.gov.uk/" },
    cards: [citiText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Citigroup|Deutsche Bank/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "50601-citi-db");
  assert.ok(!manBlob.includes("Citi-DB Relevant Period"), "free manifest must not dump decision body");
  assert.ok(!manBlob.includes("gilt auctions"));
  assert.ok(!manBlob.includes("commercially sensitive information"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("50601-citi-db"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "Crown copyright / Open Government Licence v3.0");
  assert.match(String(manifest.attribution), /Competition and Markets Authority/);

  const cache = mkdtempSync(join(tmpdir(), "cma-ca98-collect-"));
  const prevDir = process.env.CMA_CA98_DIR;
  process.env.CMA_CA98_DIR = cache;
  try {
    const snap = await collectCmaCa98({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official CMA CA98 bodies");
    assert.ok(snap.cards.some((c) => c.docket === "50601-citi-db" && isRealCmaCa98Body(c.body)));
    assert.ok(snap.cards.every((c) => isRealCmaCa98Body(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "50601-people"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "50601-press"), "skip press teaser");
    assert.ok(!snap.cards.some((c) => c.id === "ico-mpn-clearview"), "skip ICO /ico-mpn");
    assert.ok(snap.cards.every((c) => officialCmaCa98PdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectCmaCa98({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "50601-citi-db"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.CMA_CA98_DIR;
    else process.env.CMA_CA98_DIR = prevDir;
  }

  console.log("cma-ca98 parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
