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
  FIRST_SLICE_LISTING_URL,
  LISTING_URL,
  SEED_LISTINGS,
  buildFincenOrdersManifest,
  collectFincenOrders,
  isCasinoRow,
  isInstitutionOrderRow,
  isOfficialOrderRow,
  isPeopleRow,
  isRealFincenOrderBody,
  officialFincenPdfUrl,
  parseFincenOrderText,
  parseListingHtml,
  parseListingRows,
  pdfIdFromUrl,
  type FincenListingRow,
} from "./fincen-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fincen-orders");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as FincenListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official FinCEN excerpt lists institution consent orders");
  const ubs = listed.find((r) => r.id === "2026-02");
  assert.ok(ubs);
  assert.match(ubs?.institution ?? "", /UBS Financial Services/i);
  assert.equal(ubs?.date, "2026-08-03");
  assert.equal(ubs?.sourceUrl, "https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf");
  assert.ok(listed.some((r) => r.id === "2026-01"));
  assert.ok(listed.some((r) => r.id === "2025-02"));
  assert.ok(listed.some((r) => r.id === "2025-01"));
  assert.ok(listed.some((r) => r.id === "2024-02"));
  assert.ok(!listed.some((r) => r.id === "2024-01"), "skip people-only CMP");
  assert.ok(!listed.some((r) => /Lake Elsinore|Sahara Dunes/i.test(r.institution)), "skip casino");
  assert.ok(listed.every((r) => officialFincenPdfUrl(r.sourceUrl)));
  assert.equal(
    officialFincenPdfUrl("https://www.fincen.gov/system/files?file=2025-12%2FPaxfulConsentOrder.pdf"),
    "https://www.fincen.gov/system/files/2025-12/PaxfulConsentOrder.pdf",
  );
  assert.equal(
    officialFincenPdfUrl("https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf"),
    null,
  );
  assert.equal(
    officialFincenPdfUrl("https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1"),
    null,
  );
  assert.equal(officialFincenPdfUrl("https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf"), null);
  assert.equal(
    officialFincenPdfUrl("https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf"),
    null,
  );
  assert.equal(officialFincenPdfUrl("https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf"), null);
  assert.equal(
    officialFincenPdfUrl(
      "https://www.fincen.gov/news/news-releases/fincen-assesses-historic-125-million-penalty-against-ubs-financial-services-inc",
    ),
    null,
  );
  assert.equal(officialFincenPdfUrl("https://www.fincen.gov/news/enforcement-actions"), null);
  assert.equal(
    officialFincenPdfUrl("https://www.fincen.gov/system/files/enforcement_action/HSBC_ASSESSMENT.pdf"),
    "https://www.fincen.gov/system/files/enforcement_action/HSBC_ASSESSMENT.pdf",
  );
  assert.ok(LISTING_URL.includes("fincen.gov"));
  assert.equal(FIRST_SLICE_LISTING_URL, LISTING_URL);
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "2026-02"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "2026-02"));
  assert.ok(htmlListed.some((r) => r.id === "2024-02"));
  assert.ok(!htmlListed.some((r) => r.id === "2024-01"));
  assert.ok(!htmlListed.some((r) => /Lake Elsinore/i.test(r.institution)));

  const leftoverRows = JSON.parse(readFx("leftover-listing-excerpt.json")) as FincenListingRow[];
  const leftoverListed = parseListingRows(leftoverRows);
  assert.ok(leftoverListed.some((r) => r.id === "2023-03"), "leftover listing includes Shinhan Bank America");
  assert.ok(leftoverListed.some((r) => r.id === "2023-02"), "leftover listing includes Bancrédito");
  assert.ok(leftoverListed.some((r) => r.id === "2021-01"), "leftover listing includes Capital One assessment");
  assert.ok(leftoverListed.some((r) => r.id === "2014-01"), "leftover listing includes JPMorgan assessment");
  assert.ok(leftoverListed.some((r) => r.id === "2012-02"), "leftover listing includes HSBC assessment");
  assert.ok(leftoverListed.some((r) => r.id === "2025-01"), "Brink’s listing row is an official order even without consent in the title");
  assert.ok(!leftoverListed.some((r) => r.id === "2024-01"), "skip people-only CMP");
  assert.ok(!leftoverListed.some((r) => /Lake Elsinore/i.test(r.institution)), "skip casino");
  assert.ok(leftoverListed.every((r) => officialFincenPdfUrl(r.sourceUrl)), "leftover walk keeps official fincen.gov PDFs");
  const leftoverHtml = parseListingHtml(readFx("leftover-listing-excerpt.html"));
  assert.ok(leftoverHtml.some((r) => r.id === "2021-01"));
  assert.ok(leftoverHtml.some((r) => r.id === "2012-02"));
  assert.ok(!leftoverHtml.some((r) => r.id === "2024-01"));

  const people = rows.find((r) => (r.docket ?? "") === "2024-01");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const casino = rows.find((r) => (r.docket ?? "") === "2024-03");
  assert.ok(casino);
  assert.equal(isCasinoRow(casino!), true);
  assert.equal(isInstitutionOrderRow(casino!), false);
  const ubsRow = rows.find((r) => r.docket === "2026-02" && officialFincenPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(ubsRow!), true);
  assert.equal(isOfficialOrderRow(ubsRow!), true);
  assert.equal(isPeopleRow(ubsRow!), false);
  const capitalOneRow = leftoverRows.find((r) => r.docket === "2021-01");
  assert.equal(isInstitutionOrderRow(capitalOneRow!), true, "institution CMP assessment is this SKU");
  assert.equal(isOfficialOrderRow(capitalOneRow!), true);
  const shinhanRow = leftoverRows.find((r) => r.docket === "2023-03");
  assert.equal(isInstitutionOrderRow(shinhanRow!), true, "leftover consent order without consent in the title is this SKU");

  const ubsText = parseFincenOrderText(readFx("2026-02.txt"), {
    sourceUrl: "https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf",
    institution: "UBS Financial Services Inc.",
    date: "2026-08-03",
    docket: "2026-02",
  });
  assert.equal(ubsText.docket, "2026-02");
  assert.match(ubsText.institution, /UBS Financial Services/i);
  assert.equal(ubsText.date, "2026-08-03");
  assert.equal(ubsText.title, "Consent Order Imposing Civil Money Penalty");
  assert.ok(isRealFincenOrderBody(ubsText.body));
  assert.ok(ubsText.body.includes("Jaclyn A. Barnao"));
  assert.ok(ubsText.body.includes("61,500"));
  assert.ok(ubsText.body.includes("STATEMENT OF FACTS"));
  assert.ok(CARD_FIELDS.every((f) => f in ubsText));
  assert.equal(pdfIdFromUrl(ubsText.sourceUrl), "UBS-Consent-Order");

  const canaccord = parseFincenOrderText(readFx("2026-01.txt"), {
    sourceUrl: "https://www.fincen.gov/system/files/2026-03/Canaccord-Consent-Order-No-2026-01.pdf",
    institution: "Canaccord Genuity LLC",
    docket: "2026-01",
  });
  assert.ok(isRealFincenOrderBody(canaccord.body));
  assert.ok(canaccord.body.includes("STATEMENT OF FACTS"));
  assert.equal(canaccord.title, "Consent Order Imposing Civil Money Penalty");
  assert.equal(canaccord.docket, "2026-01");

  const paxful = parseFincenOrderText(readFx("2025-02.txt"), {
    sourceUrl: "https://www.fincen.gov/system/files?file=2025-12%2FPaxfulConsentOrder.pdf",
    institution: "Paxful, Inc. and Paxful USA, Inc.",
    docket: "2025-02",
  });
  assert.ok(isRealFincenOrderBody(paxful.body));
  assert.equal(paxful.sourceUrl, "https://www.fincen.gov/system/files/2025-12/PaxfulConsentOrder.pdf");
  assert.equal(paxful.docket, "2025-02");

  const brinks = parseFincenOrderText(readFx("2025-01.txt"), {
    sourceUrl: "https://www.fincen.gov/system/files/enforcement_action/2025-02-06/FinCEN-Brinks-FINALv508.pdf",
    institution: "Brink’s Global Services USA, Inc.",
    docket: "2025-01",
  });
  assert.ok(isRealFincenOrderBody(brinks.body));
  assert.equal(brinks.docket, "2025-01");

  const td = parseFincenOrderText(readFx("2024-02.txt"), {
    sourceUrl:
      "https://www.fincen.gov/system/files/enforcement_action/2024-10-10/FinCEN-TD-Bank-Consent-Order-508FINAL.pdf",
    institution: "TD Bank, N.A. and TD Bank USA, N.A.",
    docket: "2024-02",
  });
  assert.ok(isRealFincenOrderBody(td.body));
  assert.equal(td.docket, "2024-02");

  const teaser = parseFincenOrderText(readFx("no-body.txt"), {
    sourceUrl: LISTING_URL,
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealFincenOrderBody(teaser.body), false, "enforcement-actions index is not the order body");

  const nr = parseFincenOrderText(readFx("news-release.txt"), {
    sourceUrl:
      "https://www.fincen.gov/news/news-releases/fincen-assesses-historic-125-million-penalty-against-ubs-financial-services-inc",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealFincenOrderBody(nr.body), false, "news-release wrap is a KILL");

  const peopleBody = parseFincenOrderText(readFx("people-cmp.txt"), {
    sourceUrl: "https://www.fincen.gov/system/files/enforcement_action/2024-01-31/FinCEN_Consent_Order_2024-01_FINAL508.pdf",
    institution: "Gyanendra Kumar Asre",
  });
  assert.equal(isRealFincenOrderBody(peopleBody.body), false, "people-only CMP is not this SKU");

  const capitalOne = parseFincenOrderText(readFx("2021-01.txt"), {
    sourceUrl: "https://www.fincen.gov/system/files/enforcement_action/2023-04-05/Assessment_CONA_508_0.pdf",
    institution: "Capital One, National Association",
    date: "2021-01-15",
    docket: "2021-01",
  });
  assert.ok(isRealFincenOrderBody(capitalOne.body), "official leftover Capital One assessment is this SKU");
  assert.equal(capitalOne.docket, "2021-01");
  assert.equal(capitalOne.title, "Assessment of Civil Money Penalty");
  assert.match(capitalOne.institution, /Capital One/i);

  const shinhan = parseFincenOrderText(readFx("2023-03.txt"), {
    sourceUrl: "https://www.fincen.gov/system/files/enforcement_action/2023-09-29/SHBA_9-28_FINAL_508.pdf",
    institution: "Shinhan Bank America",
    date: "2023-09-29",
    docket: "2023-03",
  });
  assert.ok(isRealFincenOrderBody(shinhan.body), "official leftover Shinhan consent order is this SKU");
  assert.equal(shinhan.docket, "2023-03");
  assert.equal(shinhan.title, "Consent Order Imposing Civil Money Penalty");

  const fr = parseFincenOrderText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/08/03/2026-99999/fincen-ubs",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealFincenOrderBody(fr.body), false, "Federal Register raw_text is a KILL");

  const drupal = parseFincenOrderText(readFx("drupal-json.txt"), {
    sourceUrl: "https://www.fincen.gov/news/enforcement-actions?_format=json",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealFincenOrderBody(drupal.body), false, "Drupal ?_format=json is a KILL");

  const frb = parseFincenOrderText(readFx("frb-order.txt"), {
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf",
    institution: "Community Bankshares, Inc.",
  });
  assert.equal(isRealFincenOrderBody(frb.body), false, "FRB /frb-orders is not this SKU");

  const fdic = parseFincenOrderText(readFx("fdic-order.txt"), {
    sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
    institution: "MutualOne Bank",
  });
  assert.equal(isRealFincenOrderBody(fdic.body), false, "FDIC /fdic-orders is not this SKU");

  const occ = parseFincenOrderText(readFx("occ-cd.txt"), {
    sourceUrl: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
    institution: "United Texas Bank, National Association",
  });
  assert.equal(isRealFincenOrderBody(occ.body), false, "OCC /occ-cd is not this SKU");

  const cfpb = parseFincenOrderText(readFx("cfpb-order.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
    institution: "American Honda Finance Corporation",
  });
  assert.equal(isRealFincenOrderBody(cfpb.body), false, "CFPB /cfpb-orders is not this SKU");

  const ftc = parseFincenOrderText(readFx("ftc-wl.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
    institution: "Vtron Inc. d/b/a Vtron Lasers",
  });
  assert.equal(isRealFincenOrderBody(ftc.body), false, "FTC /ftc-wl is not this SKU");

  const ncua = parseFincenOrderText(readFx("ncua-order.txt"), {
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
    institution: "Live Life Federal Credit Union",
  });
  assert.equal(isRealFincenOrderBody(ncua.body), false, "NCUA /ncua-orders is not this SKU");

  const manifest = buildFincenOrdersManifest({
    ok: true,
    product: "fincen-institution-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-08-03",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      pdfHost: "https://www.fincen.gov/",
    },
    cards: [ubsText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /UBS Financial Services/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "2026-02");
  assert.ok(!manBlob.includes("Jaclyn A. Barnao"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("61,500"));
  assert.ok(!manBlob.includes("STATEMENT OF FACTS"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("UBS-Consent-Order"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "FinCEN");
  assert.ok(!manBlob.includes("MutualOne"));
  assert.ok(!manBlob.includes("vtron-lasers"));

  const cache = mkdtempSync(join(tmpdir(), "fincen-orders-collect-"));
  const prevDir = process.env.FINCEN_ORDERS_DIR;
  process.env.FINCEN_ORDERS_DIR = cache;
  try {
    const snap = await collectFincenOrders({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 6, "fixture collect extracts first-slice seeds plus leftover official PDF text");
    assert.ok(snap.cards.some((c) => c.docket === "2026-02" && isRealFincenOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "2026-01" && isRealFincenOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "2025-02" && isRealFincenOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "2025-01" && isRealFincenOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "2024-02" && isRealFincenOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "2023-03" && isRealFincenOrderBody(c.body)), "leftover Shinhan consent order is collected");
    assert.ok(snap.cards.some((c) => c.docket === "2021-01" && isRealFincenOrderBody(c.body)), "leftover Capital One assessment is collected");
    assert.ok(snap.cards.every((c) => isRealFincenOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "2024-01"), "skip people CMP");
    assert.ok(snap.cards.every((c) => officialFincenPdfUrl(c.sourceUrl)));
    assert.ok(
      snap.cards.every(
        (c) => !/archive\.org|federalreserve\.gov|orders\.fdic\.gov|occ\.gov|consumerfinance\.gov|ftc\.gov|ncua\.gov/i.test(c.sourceUrl),
      ),
    );

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectFincenOrders({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "2026-02"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.FINCEN_ORDERS_DIR;
    else process.env.FINCEN_ORDERS_DIR = prevDir;
  }

  console.log("fincen-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
