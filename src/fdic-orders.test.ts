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
  OFFICIAL_WALK_LISTINGS,
  PDF_DOWNLOAD,
  SEED_LISTINGS,
  buildFdicOrdersManifest,
  collectFdicOrders,
  isCmpRow,
  isInstitutionOrderRow,
  isPeopleRow,
  isProhibitionRow,
  isRealFdicOrderBody,
  isTerminationRow,
  officialFdicPdfUrl,
  parseFdicOrderText,
  parseListingRows,
  pdfIdFromUrl,
  type FdicListingRow,
} from "./fdic-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fdic-orders");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as FdicListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official FDIC excerpt lists institution consent orders");
  const mutual = listed.find((r) => r.id === "FDIC-26-0001b");
  assert.ok(mutual);
  assert.match(mutual?.bank ?? "", /MutualOne Bank/i);
  assert.equal(mutual?.date, "2026-01-13");
  assert.equal(
    mutual?.sourceUrl,
    `${PDF_DOWNLOAD}069SJ000013gUnXYAU?operationContext=S1`,
  );
  assert.ok(listed.some((r) => r.id === "FDIC-25-0127b"));
  assert.ok(listed.some((r) => r.id === "FDIC-22-0042b"));
  assert.ok(listed.some((r) => r.id === "FDIC-26-0011b"));
  assert.ok(listed.some((r) => r.id === "FDIC-25-0148b"));
  assert.ok(!listed.some((r) => r.id === "FDIC-26-0002e"), "skip IAP prohibition");
  assert.ok(!listed.some((r) => r.id === "FDIC-26-0006k"), "skip CMP");
  assert.ok(!listed.some((r) => r.id === "FDIC-22-0001b"), "skip termination");
  assert.ok(listed.every((r) => officialFdicPdfUrl(r.sourceUrl)));
  assert.equal(
    officialFdicPdfUrl("https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf"),
    null,
  );
  assert.equal(officialFdicPdfUrl("https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf"), null);
  assert.equal(officialFdicPdfUrl("https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf"), null);
  assert.equal(officialFdicPdfUrl("https://www.sec.gov/Archives/edgar/data/1408534/ex991-consentorder.htm"), null);
  assert.equal(officialFdicPdfUrl("https://www.federalregister.gov/documents/2026/01/01/fdic-26-0001b"), null);
  assert.equal(officialFdicPdfUrl("https://banks.data.fdic.gov/bankfind-suite/bankfind"), null);
  assert.equal(
    officialFdicPdfUrl("https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1"),
    `${PDF_DOWNLOAD}069SJ000013gUnXYAU?operationContext=S1`,
  );
  assert.equal(officialFdicPdfUrl("069SJ000013gUnXYAU"), `${PDF_DOWNLOAD}069SJ000013gUnXYAU?operationContext=S1`);
  assert.ok(LISTING_URL.includes("orders.fdic.gov"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "FDIC-26-0001b"));
  assert.ok(OFFICIAL_WALK_LISTINGS.length >= 10, "EDOS index is a JS teaser; collect walks official shepherd PDFs");
  assert.ok(OFFICIAL_WALK_LISTINGS.some((r) => r.docket === "FDIC-24-0112b" && /FFB Bank/i.test(r.bank)));
  assert.ok(OFFICIAL_WALK_LISTINGS.some((r) => r.docket === "FDIC-25-0022b"));
  assert.ok(OFFICIAL_WALK_LISTINGS.some((r) => r.docket === "FDIC-25-0134b"));
  assert.ok(OFFICIAL_WALK_LISTINGS.every((r) => officialFdicPdfUrl(r.sourceUrl)));
  assert.ok(OFFICIAL_WALK_LISTINGS.every((r) => /b$/.test(r.docket)), "walk is institution consent orders only");
  assert.ok(!OFFICIAL_WALK_LISTINGS.some((r) => /e$|k$/.test(r.docket)), "walk skips people/CMP");

  const people = rows.find((r) => (r.docket ?? "") === "FDIC-26-0002e");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isProhibitionRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const mutualRow = rows.find((r) => r.docket === "FDIC-26-0001b");
  assert.equal(isInstitutionOrderRow(mutualRow!), true);
  assert.equal(isPeopleRow(mutualRow!), false);
  const cmp = rows.find((r) => r.docket === "FDIC-26-0006k");
  assert.equal(isCmpRow(cmp!), true);
  assert.equal(isInstitutionOrderRow(cmp!), false);
  const term = rows.find((r) => r.docket === "FDIC-22-0001b");
  assert.equal(isTerminationRow(term!), true);
  assert.equal(isInstitutionOrderRow(term!), false);

  const mutualText = parseFdicOrderText(readFx("FDIC-26-0001b.txt"), {
    sourceUrl: `${PDF_DOWNLOAD}069SJ000013gUnXYAU?operationContext=S1`,
    bank: "MutualOne Bank",
    location: "Framingham, Massachusetts",
    date: "2026-01-13",
    docket: "FDIC-26-0001b",
  });
  assert.equal(mutualText.docket, "FDIC-26-0001b");
  assert.match(mutualText.bank, /MutualOne Bank/i);
  assert.equal(mutualText.date, "2026-01-13");
  assert.equal(mutualText.title, "Consent Order");
  assert.ok(isRealFdicOrderBody(mutualText.body));
  assert.ok(mutualText.body.includes("June 9, 2025 Report of Examination"));
  assert.ok(/adversely classified[\s\S]{0,40}“Substandard”/.test(mutualText.body));
  assert.ok(CARD_FIELDS.every((f) => f in mutualText));
  assert.equal(pdfIdFromUrl(mutualText.sourceUrl), "069SJ000013gUnXYAU");

  const cbt = parseFdicOrderText(readFx("FDIC-25-0127b.txt"), {
    sourceUrl: `${PDF_DOWNLOAD}069SJ000013EZOfYAO?operationContext=S1`,
    bank: "Community Bank and Trust – West Georgia",
    docket: "FDIC-25-0127b",
  });
  assert.ok(isRealFdicOrderBody(cbt.body));
  assert.ok(cbt.body.includes("Asset Reduction Plan"));

  const union = parseFdicOrderText(readFx("FDIC-22-0042b.txt"), {
    sourceUrl: `${PDF_DOWNLOAD}069SJ000016cJFgYAM?operationContext=S1`,
    bank: "Union County Savings Bank",
    docket: "FDIC-22-0042b",
  });
  assert.ok(isRealFdicOrderBody(union.body));
  assert.ok(union.body.includes("2024 Consent Order"));
  assert.equal(union.title, "Amended and Restated Consent Order");

  const covington = parseFdicOrderText(readFx("FDIC-26-0011b.txt"), {
    sourceUrl: `${PDF_DOWNLOAD}069SJ000019kAxyYAE?operationContext=S1`,
    bank: "Covington County Bank",
    docket: "FDIC-26-0011b",
  });
  assert.ok(isRealFdicOrderBody(covington.body));
  assert.ok(covington.body.includes("Bank Secrecy Act"));

  const connect = parseFdicOrderText(readFx("FDIC-25-0148b.txt"), {
    sourceUrl: `${PDF_DOWNLOAD}069SJ00001GluRdYAJ?operationContext=S1`,
    bank: "Connect Community Bank",
    docket: "FDIC-25-0148b",
  });
  assert.ok(isRealFdicOrderBody(connect.body));
  assert.ok(connect.body.includes("interest rate risk"));

  const teaser = parseFdicOrderText(readFx("no-body.txt"), {
    sourceUrl: LISTING_URL,
    bank: "MutualOne Bank",
  });
  assert.equal(isRealFdicOrderBody(teaser.body), false, "EDOS card teaser is not the order body");

  const edos = parseFdicOrderText(readFx("edos-index.txt"), {
    sourceUrl: LISTING_URL,
    bank: "MutualOne Bank",
  });
  assert.equal(isRealFdicOrderBody(edos.body), false, "EDOS Salesforce index is a KILL");

  const bankfind = parseFdicOrderText(readFx("bankfind.txt"), {
    sourceUrl: "https://banks.data.fdic.gov/bankfind-suite/bankfind",
    bank: "MutualOne Bank",
  });
  assert.equal(isRealFdicOrderBody(bankfind.body), false, "BankFind is a KILL");

  const iap = parseFdicOrderText(readFx("iap-prohibition.txt"), {
    sourceUrl: `${PDF_DOWNLOAD}069SJ00001PEOPLEFILE?operationContext=S1`,
    bank: "The Fountain Trust Company",
  });
  assert.equal(isRealFdicOrderBody(iap.body), false, "IAP prohibition is not this SKU");

  const section19 = parseFdicOrderText(readFx("section19.txt"), {
    sourceUrl: `${PDF_DOWNLOAD}069SJ00001SECTION19X?operationContext=S1`,
    bank: "John Q. Applicant",
  });
  assert.equal(isRealFdicOrderBody(section19.body), false, "Section 19 / 1829 people file is not this SKU");

  const cmpBody = parseFdicOrderText(readFx("cmp-only.txt"), {
    sourceUrl: `${PDF_DOWNLOAD}069SJ000019jBYFYA2?operationContext=S1`,
    bank: "Main Street Bank Corp.",
  });
  assert.equal(isRealFdicOrderBody(cmpBody.body), false, "CMP-only is not this SKU");

  const termBody = parseFdicOrderText(readFx("termination.txt"), {
    sourceUrl: `${PDF_DOWNLOAD}069SJ00001TERMINATE1?operationContext=S1`,
    bank: "Independence Bank",
  });
  assert.equal(isRealFdicOrderBody(termBody.body), false, "termination PDF is not the order body");

  const cfpb = parseFdicOrderText(readFx("cfpb-order.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
    bank: "American Honda Finance Corporation",
  });
  assert.equal(isRealFdicOrderBody(cfpb.body), false, "CFPB /cfpb-orders is not this SKU");

  const occ = parseFdicOrderText(readFx("occ-cd.txt"), {
    sourceUrl: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
    bank: "United Texas Bank, National Association",
  });
  assert.equal(isRealFdicOrderBody(occ.body), false, "OCC /occ-cd is not this SKU");

  const ftc = parseFdicOrderText(readFx("ftc-wl.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
    bank: "Vtron Inc. d/b/a Vtron Lasers",
  });
  assert.equal(isRealFdicOrderBody(ftc.body), false, "FTC /ftc-wl is not this SKU");

  const edgar = parseFdicOrderText(readFx("edgar-8k.txt"), {
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1408534/ex991-consentorder.htm",
    bank: "First Guaranty Bank",
  });
  assert.equal(isRealFdicOrderBody(edgar.body), false, "EDGAR 8-K harvest is a KILL");

  const fr = parseFdicOrderText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/api/v1/documents.json",
    bank: "MutualOne Bank",
  });
  assert.equal(isRealFdicOrderBody(fr.body), false, "Federal Register raw_text/full_text is a KILL");

  const nr = parseFdicOrderText(readFx("monthly-nr.txt"), {
    sourceUrl: "https://www.fdic.gov/news/press-releases/2026/fdic-publishes-january-enforcement-actions",
    bank: "MutualOne Bank",
  });
  assert.equal(isRealFdicOrderBody(nr.body), false, "monthly NR counts are a KILL");

  const manifest = buildFdicOrdersManifest({
    ok: true,
    product: "fdic-institution-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-01-13",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://orders.fdic.gov/" },
    cards: [mutualText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { bank: string }[])[0]?.bank ?? "", /MutualOne Bank/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "FDIC-26-0001b");
  assert.ok(!manBlob.includes("June 9, 2025 Report of Examination"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("adversely classified"));
  assert.ok(!manBlob.includes("Substandard"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("069SJ000013gUnXYAU"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "FDIC");
  assert.ok(!manBlob.includes("complaint_what_happened"));
  assert.ok(!manBlob.includes("vtron-lasers"));
  assert.ok(!manBlob.includes("nearly 35,000"));

  const cache = mkdtempSync(join(tmpdir(), "fdic-orders-collect-"));
  const prevDir = process.env.FDIC_ORDERS_DIR;
  process.env.FDIC_ORDERS_DIR = cache;
  try {
    const snap = await collectFdicOrders({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official FDIC institution order bodies");
    assert.ok(snap.cards.some((c) => c.docket === "FDIC-26-0001b" && isRealFdicOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "FDIC-25-0127b" && isRealFdicOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "FDIC-22-0042b" && isRealFdicOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "FDIC-26-0011b" && isRealFdicOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "FDIC-25-0148b" && isRealFdicOrderBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealFdicOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "FDIC-26-0002e"), "skip IAP");
    assert.ok(!snap.cards.some((c) => c.id === "FDIC-26-0006k"), "skip CMP");
    assert.ok(snap.cards.every((c) => officialFdicPdfUrl(c.sourceUrl)));
    assert.ok(snap.cards.every((c) => !/archive\.org|sec\.gov|ftc\.gov|consumerfinance\.gov|federalregister\.gov|occ\.gov/i.test(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectFdicOrders({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(
      merged.cards.some((c) => c.docket === "FDIC-26-0001b"),
      "re-collect keeps cached bodies",
    );
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.FDIC_ORDERS_DIR;
    else process.env.FDIC_ORDERS_DIR = prevDir;
  }

  console.log("fdic-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
