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
  PDF_BASE,
  SEED_LISTINGS,
  buildFrbOrdersManifest,
  collectFrbOrders,
  isInstitutionOrderRow,
  isPeopleRow,
  isProhibitionRow,
  isRealFrbOrderBody,
  officialFrbPdfUrl,
  parseFrbCsv,
  parseFrbOrderText,
  parseListingRows,
  pdfIdFromUrl,
  pdfUrlFromPressUrl,
  type FrbListingRow,
} from "./frb-orders.js";
import { FRB_ORDER_TYPE, paidFrbOrdersBody } from "./paid-records.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/frb-orders");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as FrbListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official FRB excerpt lists institution C&D / WA / PCA orders");
  const cbi = listed.find((r) => r.id === "26-019-B-HC");
  assert.ok(cbi);
  assert.match(cbi?.institution ?? "", /Community Bankshares/i);
  assert.equal(cbi?.date, "2026-04-14");
  assert.equal(cbi?.sourceUrl, `${PDF_BASE}enf20260416a1.pdf`);
  assert.ok(listed.some((r) => r.id === "26-039-PCA-SM"));
  assert.ok(listed.some((r) => r.id === "26-016-WA/RB-HC"));
  assert.ok(listed.some((r) => r.id === "26-040-WA/RB-HC"));
  assert.ok(listed.some((r) => r.id === "26-040-WA/RB-SM"));
  assert.ok(!listed.some((r) => r.id === "26-041-E-I"), "skip prohibition-of-employee");
  assert.ok(!listed.some((r) => /Jason Burns/i.test(r.institution)), "skip people C&D");
  assert.ok(listed.every((r) => officialFrbPdfUrl(r.sourceUrl)));
  assert.equal(
    officialFrbPdfUrl("https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1"),
    null,
  );
  assert.equal(officialFrbPdfUrl("https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf"), null);
  assert.equal(officialFrbPdfUrl("https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf"), null);
  assert.equal(
    officialFrbPdfUrl("https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf"),
    null,
  );
  assert.equal(officialFrbPdfUrl("https://www.sec.gov/Archives/edgar/data/1408534/ex991-consentorder.htm"), null);
  assert.equal(officialFrbPdfUrl("https://banks.data.fdic.gov/bankfind-suite/bankfind"), null);
  assert.equal(
    officialFrbPdfUrl("https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf"),
    `${PDF_BASE}enf20260416a1.pdf`,
  );
  assert.equal(officialFrbPdfUrl("enf20260416a1"), `${PDF_BASE}enf20260416a1.pdf`);
  assert.ok(LISTING_URL.includes("federalreserve.gov"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "26-019-B-HC"));

  const csvListed = parseFrbCsv(readFx("listing-excerpt.csv"));
  assert.ok(csvListed.some((r) => /SouthPoint/i.test(r.institution)), "official CSV lists later institution WA");
  assert.equal(
    csvListed.find((r) => /SouthPoint/i.test(r.institution))?.sourceUrl,
    `${PDF_BASE}enf20260820b1.pdf`,
  );
  assert.ok(csvListed.every((r) => officialFrbPdfUrl(r.sourceUrl)));
  assert.ok(!csvListed.some((r) => /Kilbert|Gonzalez/i.test(r.institution)), "CSV people rows stay out");
  assert.equal(
    pdfUrlFromPressUrl("/newsevents/pressreleases/enforcement20260820b.htm"),
    `${PDF_BASE}enf20260820b1.pdf`,
  );

  const people = rows.find((r) => (r.docket ?? "") === "26-041-E-I");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isProhibitionRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const cbiRow = rows.find((r) => r.docket === "26-019-B-HC");
  assert.equal(isInstitutionOrderRow(cbiRow!), true);
  assert.equal(isPeopleRow(cbiRow!), false);
  const burns = rows.find((r) => (r.individual ?? "") === "Jason Burns");
  assert.equal(isPeopleRow(burns!), true);
  assert.equal(isInstitutionOrderRow(burns!), false);

  const cbiText = parseFrbOrderText(readFx("26-019-B-HC.txt"), {
    sourceUrl: `${PDF_BASE}enf20260416a1.pdf`,
    institution: "Community Bankshares, Inc.",
    location: "LaGrange, Georgia",
    date: "2026-04-14",
    docket: "26-019-B-HC",
  });
  assert.equal(cbiText.docket, "26-019-B-HC");
  assert.match(cbiText.institution, /Community Bankshares/i);
  assert.equal(cbiText.date, "2026-04-14");
  assert.equal(cbiText.title, "Cease and Desist Order");
  assert.ok(isRealFrbOrderBody(cbiText.body));
  assert.ok(cbiText.body.includes("WHEREAS"));
  assert.ok(cbiText.body.includes("Capital Plan"));
  assert.ok(CARD_FIELDS.every((f) => f in cbiText));
  assert.equal(pdfIdFromUrl(cbiText.sourceUrl), "enf20260416a1");

  const sbb = parseFrbOrderText(readFx("26-039-PCA-SM.txt"), {
    sourceUrl: `${PDF_BASE}enf20260702a1.pdf`,
    institution: "Small Business Bank",
    docket: "26-039-PCA-SM",
  });
  assert.ok(isRealFrbOrderBody(sbb.body));
  assert.ok(/significantly\s+undercapitalized/.test(sbb.body));
  assert.equal(sbb.title, "Prompt Corrective Action Directive");

  const ts = parseFrbOrderText(readFx("26-016-WA-RB-HC.txt"), {
    sourceUrl: `${PDF_BASE}enf20260709a1.pdf`,
    institution: "TS Banking Group, Inc. and TS Contrarian Bancshares, Inc.",
    docket: "26-016-WA/RB-HC",
  });
  assert.ok(isRealFrbOrderBody(ts.body));
  assert.ok(ts.body.includes("Capital Plan"));
  assert.equal(ts.title, "Written Agreement");
  assert.equal(ts.docket, "26-016-WA/RB-HC");

  const iukaHc = parseFrbOrderText(readFx("26-040-WA-RB-HC.txt"), {
    sourceUrl: `${PDF_BASE}enf20260730b1.pdf`,
    institution: "Iuka Bancshares, Inc.",
    docket: "26-040-WA/RB-HC",
  });
  assert.ok(isRealFrbOrderBody(iukaHc.body));
  assert.ok(iukaHc.body.includes("Capital Plan"));

  const iukaSm = parseFrbOrderText(readFx("26-040-WA-RB-SM.txt"), {
    sourceUrl: `${PDF_BASE}enf20260730b1.pdf`,
    institution: "The Iuka State Bank",
    docket: "26-040-WA/RB-SM",
  });
  assert.ok(isRealFrbOrderBody(iukaSm.body));
  assert.equal(iukaSm.docket, "26-040-WA/RB-SM");

  const teaser = parseFrbOrderText(readFx("no-body.txt"), {
    sourceUrl: LISTING_URL,
    institution: "Community Bankshares, Inc.",
  });
  assert.equal(isRealFrbOrderBody(teaser.body), false, "press teaser is not the order body");

  const csv = parseFrbOrderText(readFx("csv-metadata.txt"), {
    sourceUrl: "https://www.federalreserve.gov/supervisionreg/files/enforcementactions.csv",
    institution: "Community Bankshares, Inc.",
  });
  assert.equal(isRealFrbOrderBody(csv.body), false, "official CSV is metadata only");

  const eaOld = parseFrbOrderText(readFx("ea-old.json"), {
    sourceUrl: LISTING_URL,
    institution: "Community Bankshares, Inc.",
  });
  assert.equal(isRealFrbOrderBody(eaOld.body), false, "ea-old.json teaser is a KILL");

  const eaCms = parseFrbOrderText(readFx("ea-cms-recent.json"), {
    sourceUrl: LISTING_URL,
    institution: "Community Bankshares, Inc.",
  });
  assert.equal(isRealFrbOrderBody(eaCms.body), false, "ea-cms-recent.json teaser is a KILL");

  const nePress = parseFrbOrderText(readFx("ne-press.json"), {
    sourceUrl: LISTING_URL,
    institution: "Community Bankshares, Inc.",
  });
  assert.equal(isRealFrbOrderBody(nePress.body), false, "ne-press.json teaser is a KILL");

  const bankfind = parseFrbOrderText(readFx("bankfind.txt"), {
    sourceUrl: "https://banks.data.fdic.gov/bankfind-suite/bankfind",
    institution: "Community Bankshares, Inc.",
  });
  assert.equal(isRealFrbOrderBody(bankfind.body), false, "BankFind is a KILL");

  const iap = parseFrbOrderText(readFx("prohibition.txt"), {
    sourceUrl: `${PDF_BASE}enf20260813a1.pdf`,
    institution: "Regions Bank",
  });
  assert.equal(isRealFrbOrderBody(iap.body), false, "IAP prohibition is not this SKU");

  const peopleCd = parseFrbOrderText(readFx("people-cd.txt"), {
    sourceUrl: `${PDF_BASE}enf20260625b1.pdf`,
    institution: "Jason Burns",
  });
  assert.equal(isRealFrbOrderBody(peopleCd.body), false, "people C&D is not this SKU");

  const fdic = parseFrbOrderText(readFx("fdic-order.txt"), {
    sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
    institution: "MutualOne Bank",
  });
  assert.equal(isRealFrbOrderBody(fdic.body), false, "FDIC /fdic-orders is not this SKU");

  const occ = parseFrbOrderText(readFx("occ-cd.txt"), {
    sourceUrl: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
    institution: "United Texas Bank, National Association",
  });
  assert.equal(isRealFrbOrderBody(occ.body), false, "OCC /occ-cd is not this SKU");

  const cfpb = parseFrbOrderText(readFx("cfpb-order.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
    institution: "American Honda Finance Corporation",
  });
  assert.equal(isRealFrbOrderBody(cfpb.body), false, "CFPB /cfpb-orders is not this SKU");

  const ftc = parseFrbOrderText(readFx("ftc-wl.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
    institution: "Vtron Inc. d/b/a Vtron Lasers",
  });
  assert.equal(isRealFrbOrderBody(ftc.body), false, "FTC /ftc-wl is not this SKU");

  const edgar = parseFrbOrderText(readFx("edgar-8k.txt"), {
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1408534/ex991-consentorder.htm",
    institution: "Community Bankshares, Inc.",
  });
  assert.equal(isRealFrbOrderBody(edgar.body), false, "EDGAR 8-K harvest is a KILL");

  const manifest = buildFrbOrdersManifest({
    ok: true,
    product: "frb-institution-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-04-14",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      csv: "https://www.federalreserve.gov/supervisionreg/files/enforcementactions.csv",
      pdfHost: "https://www.federalreserve.gov/",
    },
    cards: [cbiText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Community Bankshares/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "26-019-B-HC");
  assert.ok(!manBlob.includes("WHEREAS"), "free manifest must not dump order body");
  assert.ok(!/significantly\s+undercapitalized/.test(manBlob));
  assert.ok(!manBlob.includes("Capital Plan"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("enf20260416a1"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "Federal Reserve Board");
  assert.ok(!manBlob.includes("complaint_what_happened"));
  assert.ok(!manBlob.includes("vtron-lasers"));
  assert.ok(!manBlob.includes("MutualOne"));

  const cache = mkdtempSync(join(tmpdir(), "frb-orders-collect-"));
  const prevDir = process.env.FRB_ORDERS_DIR;
  process.env.FRB_ORDERS_DIR = cache;
  try {
    const snap = await collectFrbOrders({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official FRB institution order bodies");
    assert.ok(snap.cards.some((c) => c.docket === "26-019-B-HC" && isRealFrbOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "26-039-PCA-SM" && isRealFrbOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "26-016-WA/RB-HC" && isRealFrbOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "26-040-WA/RB-HC" && isRealFrbOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "26-040-WA/RB-SM" && isRealFrbOrderBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealFrbOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "26-041-E-I"), "skip IAP");
    assert.ok(snap.cards.every((c) => officialFrbPdfUrl(c.sourceUrl)));
    assert.ok(snap.cards.every((c) => !/archive\.org|sec\.gov|ftc\.gov|consumerfinance\.gov|orders\.fdic\.gov|occ\.gov/i.test(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectFrbOrders({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(
      merged.cards.some((c) => c.docket === "26-019-B-HC"),
      "re-collect keeps cached bodies",
    );
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.FRB_ORDERS_DIR;
    else process.env.FRB_ORDERS_DIR = prevDir;
  }

  const seed = JSON.parse(readFx("seed-snapshot.json")) as {
    cards: { id?: string; institution?: string; body?: string }[];
  };
  const paid = paidFrbOrdersBody(seed);
  assert.ok(paid.recordCount > 0, "empty records[] is a fail");
  assert.equal(paid.cards.length, seed.cards.length, "official cards[] stay");
  assert.equal(paid.records[0]?.type, FRB_ORDER_TYPE);
  // date-desc, then id-asc: 26-040-WA/RB-HC before 26-040-WA/RB-SM on 2026-07-15
  assert.equal(paid.records[0]?.firm, "Iuka Bancshares, Inc.");
  assert.equal(paid.cards[0]?.institution, "The Iuka State Bank");
  assert.deepEqual(Object.keys(paid.records[0] ?? {}).sort(), ["date", "firm", "id", "type", "url"]);
  assert.ok(paid.records.every((r) => r.firm && r.id && r.url));

  console.log("frb-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
