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
  buildTtbOicManifest,
  collectTtbOic,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealTtbOicBody,
  officialTtbOicPdfUrl,
  parseTtbOicText,
  parseListingHtml,
  parseListingRows,
  pdfIdFromUrl,
  type TtbOicListingRow,
} from "./ttb-oic.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ttb-oic");
const TWENTY_FIRST =
  "https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as TtbOicListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official TTB excerpt lists institution Offer in Compromise forms");
  const brewery = listed.find((r) => r.id === "21st-amendment");
  assert.ok(brewery);
  assert.match(brewery?.institution ?? "", /21st Amendment/i);
  assert.equal(brewery?.date, "2026-06-30");
  assert.equal(brewery?.sourceUrl, TWENTY_FIRST);
  assert.ok(listed.some((r) => r.id === "delmic-enterprise"));
  assert.ok(listed.some((r) => r.id === "societe-brewing"));
  assert.ok(listed.some((r) => r.id === "satellite-spirits"));
  assert.ok(listed.some((r) => r.id === "workhorse-brewing"));
  assert.ok(!listed.some((r) => r.id === "jane-public"), "skip people");
  assert.ok(listed.every((r) => officialTtbOicPdfUrl(r.sourceUrl)));
  assert.equal(officialTtbOicPdfUrl(TWENTY_FIRST), TWENTY_FIRST);
  assert.equal(
    officialTtbOicPdfUrl("https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf"),
    null,
  );
  assert.equal(
    officialTtbOicPdfUrl(
      "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/x.pdf",
    ),
    null,
  );
  assert.equal(
    officialTtbOicPdfUrl("https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download"),
    null,
  );
  assert.equal(
    officialTtbOicPdfUrl("https://www.federalregister.gov/documents/2026/07/01/2026-99999/ttb-oic"),
    null,
  );
  assert.ok(LISTING_URL.includes("ttb.gov"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "21st-amendment"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => /21st Amendment/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /Delmic/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /Societe/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /Jane Q Public/i.test(r.institution)));

  const people = rows.find((r) => (r.docket ?? "") === "jane-public");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const breweryRow = rows.find((r) => r.docket === "21st-amendment" && officialTtbOicPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(breweryRow!), true);
  assert.equal(isPeopleRow(breweryRow!), false);

  const breweryText = parseTtbOicText(readFx("21st-amendment.txt"), {
    sourceUrl: TWENTY_FIRST,
    institution: "The 21st Amendment Brewery Cafe, LLC",
    date: "2026-06-30",
    docket: "21st-amendment",
  });
  assert.equal(breweryText.docket, "21st-amendment");
  assert.match(breweryText.institution, /21st Amendment/i);
  assert.equal(breweryText.date, "2026-06-30");
  assert.equal(breweryText.title, "Offer in Compromise");
  assert.ok(isRealTtbOicBody(breweryText.body));
  assert.ok(breweryText.body.includes("$423,681.93"));
  assert.ok(breweryText.body.includes("1,217,201.38"));
  assert.ok(breweryText.body.includes("2010 Williams St."));
  assert.ok(CARD_FIELDS.every((f) => f in breweryText));
  assert.equal(pdfIdFromUrl(breweryText.sourceUrl), "ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf");
  assert.equal(breweryText.sourceUrl, TWENTY_FIRST);

  for (const [file, docket, url] of [
    [
      "delmic-enterprise.txt",
      "delmic-enterprise",
      "https://www.ttb.gov/system/files/2026-06/ABSMT_Delmic_Enterprise_Redacted.pdf",
    ],
    [
      "societe-brewing.txt",
      "societe-brewing",
      "https://www.ttb.gov/system/files/2026-06/Societe_Brewing_Company_OICD_Redacted.pdf",
    ],
    [
      "satellite-spirits.txt",
      "satellite-spirits",
      "https://www.ttb.gov/system/files/2025-12/Satellite_Spirits_OIC_Redacted.pdf",
    ],
    [
      "workhorse-brewing.txt",
      "workhorse-brewing",
      "https://www.ttb.gov/system/files/2025-12/Workhorse_Brewery_DAAFO_11_20_25_Redacted.pdf",
    ],
  ] as const) {
    const card = parseTtbOicText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealTtbOicBody(card.body), `${docket} is official TTB Offer in Compromise TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialTtbOicPdfUrl(card.sourceUrl));
  }

  const teaser = parseTtbOicText(readFx("no-body.txt"), {
    sourceUrl: "https://www.ttb.gov/news/21st-amendment-press",
    institution: "The 21st Amendment Brewery Cafe, LLC",
  });
  assert.equal(isRealTtbOicBody(teaser.body), false, "press/teaser is not the order body");

  const peopleBody = parseTtbOicText(readFx("people.txt"), {
    sourceUrl: TWENTY_FIRST,
    institution: "Jane Q Public",
  });
  assert.equal(isRealTtbOicBody(peopleBody.body), false, "people file is not this SKU");

  const fr = parseTtbOicText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/07/01/2026-99999/ttb-oic",
    institution: "The 21st Amendment Brewery Cafe, LLC",
  });
  assert.equal(isRealTtbOicBody(fr.body), false, "Federal Register raw_text is a KILL");

  const fifra = parseTtbOicText(readFx("fifra-order.txt"), {
    sourceUrl:
      "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/x.pdf",
    institution: "Travel Caddy, Inc. dba Travelon",
  });
  assert.equal(isRealTtbOicBody(fifra.body), false, "FIFRA /fifra-orders is not this SKU");

  const cftc = parseTtbOicText(readFx("cftc-order.txt"), {
    sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealTtbOicBody(cftc.body), false, "CFTC /cftc-orders is not this SKU");

  const denovo = parseTtbOicText(readFx("denovo-order.txt"), {
    sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf",
    institution: "Caristo Diagnostics Ltd.",
  });
  assert.equal(isRealTtbOicBody(denovo.body), false, "De Novo /denovo-orders is not this SKU");

  const bis = parseTtbOicText(readFx("bis-order.txt"), {
    sourceUrl: "https://www.bis.gov/media/documents/order.pdf",
    institution: "Coastal Construction Products, Inc.",
  });
  assert.equal(isRealTtbOicBody(bis.body), false, "BIS /bis-orders is not this SKU");

  const manifest = buildTtbOicManifest({
    ok: true,
    product: "ttb-institution-oic-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-06-30",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://www.ttb.gov/" },
    cards: [breweryText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /21st Amendment/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "21st-amendment");
  assert.ok(!manBlob.includes("$423,681.93"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("1,217,201.38"));
  assert.ok(!manBlob.includes("2010 Williams St."));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("21st-amendment"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "TTB");

  const cache = mkdtempSync(join(tmpdir(), "ttb-oic-collect-"));
  const prevDir = process.env.TTB_OIC_DIR;
  process.env.TTB_OIC_DIR = cache;
  try {
    const snap = await collectTtbOic({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official TTB institution OIC bodies");
    assert.ok(snap.cards.some((c) => c.docket === "21st-amendment" && isRealTtbOicBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealTtbOicBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "jane-public"), "skip people");
    assert.ok(snap.cards.every((c) => officialTtbOicPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectTtbOic({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "21st-amendment"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.TTB_OIC_DIR;
    else process.env.TTB_OIC_DIR = prevDir;
  }

  console.log("ttb-oic parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
