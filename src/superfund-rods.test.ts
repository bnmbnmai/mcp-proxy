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
  buildSuperfundRodsManifest,
  collectSuperfundRods,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealSuperfundRodBody,
  officialSuperfundRodPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseSuperfundRodText,
  pdfIdFromUrl,
  type SuperfundRodListingRow,
} from "./superfund-rods.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/superfund-rods");
const FEDERATED = "https://semspub.epa.gov/work/05/711427.pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as SuperfundRodListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official SEMS excerpt lists institution Superfund RODs");
  const federated = listed.find((r) => r.id === "05-711427");
  assert.ok(federated);
  assert.match(federated?.institution ?? "", /Federated Metals/i);
  assert.equal(federated?.date, "2026-08-05");
  assert.equal(federated?.sourceUrl, FEDERATED);
  assert.ok(listed.some((r) => r.id === "02-744534"));
  assert.ok(listed.some((r) => r.id === "05-988133"));
  assert.ok(listed.some((r) => r.id === "05-978074"));
  assert.ok(listed.some((r) => r.id === "05-964773"));
  assert.ok(!listed.some((r) => r.id === "05-999999"), "skip people");
  assert.ok(!listed.some((r) => r.id === "05-709513"), "skip Proposed Plan");
  assert.ok(listed.every((r) => officialSuperfundRodPdfUrl(r.sourceUrl)));
  assert.equal(officialSuperfundRodPdfUrl(FEDERATED), FEDERATED);
  assert.equal(officialSuperfundRodPdfUrl("https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf"), null);
  assert.equal(officialSuperfundRodPdfUrl("https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf"), null);
  assert.equal(officialSuperfundRodPdfUrl("https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf"), null);
  assert.ok(LISTING_URL.includes("epa.gov"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "05-711427"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "05-711427"));
  assert.ok(htmlListed.some((r) => /Federated Metals/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /Velsicol/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /Jane Q Public/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /Proposed Plan/i.test(r.title)));

  const people = rows.find((r) => (r.docket ?? "") === "05-999999");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const federatedRow = rows.find((r) => r.docket === "05-711427" && officialSuperfundRodPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(federatedRow!), true);
  assert.equal(isPeopleRow(federatedRow!), false);
  const plan = rows.find((r) => r.docket === "05-709513");
  assert.equal(isInstitutionOrderRow(plan!), false, "Proposed Plan is not this SKU");

  const federatedText = parseSuperfundRodText(readFx("05-711427.txt"), {
    sourceUrl: FEDERATED,
    institution: "Federated Metals Corp. Whiting Superfund Site",
    date: "2026-08-05",
    docket: "05-711427",
    title: "Interim Record of Decision",
  });
  assert.equal(federatedText.docket, "05-711427");
  assert.match(federatedText.institution, /Federated Metals/i);
  assert.equal(federatedText.date, "2026-08-05");
  assert.equal(federatedText.title, "Interim Record of Decision");
  assert.ok(isRealSuperfundRodBody(federatedText.body));
  assert.ok(federatedText.body.includes("1,200 ppm"));
  assert.ok(federatedText.body.includes("lead dross"));
  assert.ok(federatedText.body.includes("x-ray florescence"));
  assert.ok(CARD_FIELDS.every((f) => f in federatedText));
  assert.equal(pdfIdFromUrl(federatedText.sourceUrl), "05-711427.pdf");
  assert.equal(federatedText.sourceUrl, FEDERATED);

  for (const [file, docket, url] of [
    ["02-744534.txt", "02-744534", "https://semspub.epa.gov/work/02/744534.pdf"],
    ["05-988133.txt", "05-988133", "https://semspub.epa.gov/work/05/988133.pdf"],
    ["05-978074.txt", "05-978074", "https://semspub.epa.gov/work/05/978074.pdf"],
    ["05-964773.txt", "05-964773", "https://semspub.epa.gov/work/05/964773.pdf"],
  ] as const) {
    const card = parseSuperfundRodText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealSuperfundRodBody(card.body), `${docket} is official EPA Superfund ROD TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialSuperfundRodPdfUrl(card.sourceUrl));
  }

  const teaser = parseSuperfundRodText(readFx("no-body.txt"), {
    sourceUrl: "https://www.epa.gov/superfund/federated-metals-press",
    institution: "Federated Metals Corp. Whiting Superfund Site",
  });
  assert.equal(isRealSuperfundRodBody(teaser.body), false, "press/teaser is not the ROD body");

  const planBody = parseSuperfundRodText(readFx("proposed-plan.txt"), {
    sourceUrl: "https://semspub.epa.gov/work/05/709513.pdf",
    institution: "Federated Metals Corp. Whiting Superfund Site",
  });
  assert.equal(isRealSuperfundRodBody(planBody.body), false, "Proposed Plan is not this SKU");

  const peopleBody = parseSuperfundRodText(readFx("people.txt"), {
    sourceUrl: FEDERATED,
    institution: "Jane Q Public",
  });
  assert.equal(isRealSuperfundRodBody(peopleBody.body), false, "people file is not this SKU");

  const fr = parseSuperfundRodText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/08/05/2026-99999/federated-metals",
    institution: "Federated Metals Corp. Whiting Superfund Site",
  });
  assert.equal(isRealSuperfundRodBody(fr.body), false, "Federal Register raw_text is a KILL");

  const air = parseSuperfundRodText(readFx("air-letter.txt"), {
    sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf",
    institution: "KAGOME Co., LTD.",
  });
  assert.equal(isRealSuperfundRodBody(air.body), false, "AIR /air-letters is not this SKU");

  const ttb = parseSuperfundRodText(readFx("ttb-oic.txt"), {
    sourceUrl: "https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
    institution: "The 21st Amendment Brewery Cafe, LLC",
  });
  assert.equal(isRealSuperfundRodBody(ttb.body), false, "TTB /ttb-oic is not this SKU");

  const denovo = parseSuperfundRodText(readFx("denovo-order.txt"), {
    sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf",
    institution: "Caristo Diagnostics Ltd.",
  });
  assert.equal(isRealSuperfundRodBody(denovo.body), false, "De Novo /denovo-orders is not this SKU");

  const fifra = parseSuperfundRodText(readFx("fifra-order.txt"), {
    sourceUrl: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/x.pdf",
    institution: "Travel Caddy, Inc. dba Travelon",
  });
  assert.equal(isRealSuperfundRodBody(fifra.body), false, "FIFRA /fifra-orders is not this SKU");

  const cftc = parseSuperfundRodText(readFx("cftc-order.txt"), {
    sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealSuperfundRodBody(cftc.body), false, "CFTC /cftc-orders is not this SKU");

  const ico = parseSuperfundRodText(readFx("ico-mpn.txt"), {
    sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
    institution: "Reddit, Inc.",
  });
  assert.equal(isRealSuperfundRodBody(ico.body), false, "ICO /ico-mpn is not this SKU");

  const manifest = buildSuperfundRodsManifest({
    ok: true,
    product: "epa-superfund-rod-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-08-05",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://semspub.epa.gov/" },
    cards: [federatedText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Federated Metals/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "05-711427");
  assert.ok(!manBlob.includes("1,200 ppm"), "free manifest must not dump ROD body");
  assert.ok(!manBlob.includes("lead dross"));
  assert.ok(!manBlob.includes("x-ray florescence"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("05-711427"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "U.S. EPA");

  const cache = mkdtempSync(join(tmpdir(), "superfund-rods-collect-"));
  const prevDir = process.env.SUPERFUND_RODS_DIR;
  process.env.SUPERFUND_RODS_DIR = cache;
  try {
    const snap = await collectSuperfundRods({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official EPA Superfund ROD bodies");
    assert.ok(snap.cards.some((c) => c.docket === "05-711427" && isRealSuperfundRodBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealSuperfundRodBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "05-999999"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "05-709513"), "skip Proposed Plan");
    assert.ok(snap.cards.every((c) => officialSuperfundRodPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectSuperfundRods({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "05-711427"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.SUPERFUND_RODS_DIR;
    else process.env.SUPERFUND_RODS_DIR = prevDir;
  }

  console.log("superfund-rods parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
