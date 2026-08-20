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
  buildCftcOrdersManifest,
  collectCftcOrders,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealCftcOrderBody,
  officialCftcPdfUrl,
  parseCftcOrderText,
  parseListingHtml,
  parseListingRows,
  pdfIdFromUrl,
  type CftcListingRow,
} from "./cftc-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/cftc-orders");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as CftcListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official CFTC excerpt lists institution enforcement orders");
  const ubs = listed.find((r) => r.id === "26-04");
  assert.ok(ubs);
  assert.match(ubs?.institution ?? "", /UBS Financial Services/i);
  assert.equal(ubs?.date, "2026-07-31");
  assert.equal(
    ubs?.sourceUrl,
    "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
  );
  assert.ok(listed.some((r) => r.id === "26-02"));
  assert.ok(listed.some((r) => r.id === "25-02"));
  assert.ok(listed.some((r) => r.id === "25-03"));
  assert.ok(listed.some((r) => r.id === "25-04"));
  assert.ok(!listed.some((r) => r.id === "26-99"), "skip people / George Santos");
  assert.ok(!listed.some((r) => /complaint/i.test(r.title)), "skip complaints");
  assert.ok(listed.every((r) => officialCftcPdfUrl(r.sourceUrl)));
  assert.equal(
    officialCftcPdfUrl("https://cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download"),
    "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
  );
  assert.equal(
    officialCftcPdfUrl("https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download?inline="),
    "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
  );
  assert.equal(officialCftcPdfUrl("https://www.cftc.gov/PressRoom/PressReleases/9277-26"), null);
  assert.equal(
    officialCftcPdfUrl("https://www.cftc.gov/media/14466/Enf_GoliathComplaint081126/download"),
    null,
  );
  assert.equal(officialCftcPdfUrl("https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf"), null);
  assert.equal(officialCftcPdfUrl("https://ofac.treasury.gov/media/936706/download"), null);
  assert.equal(
    officialCftcPdfUrl(
      "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
    ),
    null,
  );
  assert.equal(officialCftcPdfUrl("https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf"), null);
  assert.equal(officialCftcPdfUrl("https://www.federalregister.gov/documents/2026/08/03/2026-99999/ubs"), null);
  assert.ok(LISTING_URL.includes("cftc.gov"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "26-04"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "26-04"));
  assert.ok(htmlListed.some((r) => r.id === "25-04"));
  assert.ok(!htmlListed.some((r) => r.id === "26-99"));

  const people = rows.find((r) => (r.docket ?? "") === "26-99");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const ubsRow = rows.find((r) => r.docket === "26-04" && officialCftcPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(ubsRow!), true);
  assert.equal(isPeopleRow(ubsRow!), false);

  const ubsText = parseCftcOrderText(readFx("26-04.txt"), {
    sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
    institution: "UBS Financial Services Inc.",
    date: "2026-07-31",
    docket: "26-04",
  });
  assert.equal(ubsText.docket, "26-04");
  assert.match(ubsText.institution, /UBS Financial Services/i);
  assert.equal(ubsText.date, "2026-07-31");
  assert.equal(ubsText.title, "Order Instituting Proceedings");
  assert.ok(isRealCftcOrderBody(ubsText.body));
  assert.ok(ubsText.body.includes("$8.9 billion"));
  assert.ok(ubsText.body.includes("01:44 pm, Jul 31 2026"));
  assert.ok(ubsText.body.includes("third-party consultant"));
  assert.ok(CARD_FIELDS.every((f) => f in ubsText));
  assert.equal(pdfIdFromUrl(ubsText.sourceUrl), "14456");
  assert.equal(
    ubsText.sourceUrl,
    "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
  );

  for (const [file, docket, url] of [
    ["26-02.txt", "26-02", "https://www.cftc.gov/media/14291/ENF_Netrios_RedAcreOrder062626/download"],
    ["25-02.txt", "25-02", "https://www.cftc.gov/media/12611/enfcitigrouporder090425/download"],
    ["25-03.txt", "25-03", "https://www.cftc.gov/media/12616/enfsmbcorder090425/download"],
    ["25-04.txt", "25-04", "https://www.cftc.gov/media/12621/enfsantanderorder090425/download"],
  ] as const) {
    const card = parseCftcOrderText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealCftcOrderBody(card.body), `${docket} is official CFTC enforcement-order TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialCftcPdfUrl(card.sourceUrl));
  }

  const teaser = parseCftcOrderText(readFx("no-body.txt"), {
    sourceUrl: "https://www.cftc.gov/PressRoom/PressReleases/9277-26",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealCftcOrderBody(teaser.body), false, "press/teaser is not the order body");

  const peopleBody = parseCftcOrderText(readFx("people.txt"), {
    sourceUrl: "https://www.cftc.gov/media/14451/ENF_SantosOrder073126/download",
    institution: "George Anthony Devolder Santos",
  });
  assert.equal(isRealCftcOrderBody(peopleBody.body), false, "people file is not this SKU");

  const fr = parseCftcOrderText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/08/03/2026-99999/ubs",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealCftcOrderBody(fr.body), false, "Federal Register raw_text is a KILL");

  const bis = parseCftcOrderText(readFx("bis-order.txt"), {
    sourceUrl: "https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
    institution: "Coastal PVA Technology, Inc.",
  });
  assert.equal(isRealCftcOrderBody(bis.body), false, "BIS /bis-orders is not this SKU");

  const ofac = parseCftcOrderText(readFx("ofac-order.txt"), {
    sourceUrl: "https://ofac.treasury.gov/media/936706/download",
    institution: "Rice Lake Weighing Systems, Inc.",
  });
  assert.equal(isRealCftcOrderBody(ofac.body), false, "OFAC /ofac-orders is not this SKU");

  const fincen = parseCftcOrderText(readFx("fincen-order.txt"), {
    sourceUrl: "https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealCftcOrderBody(fincen.body), false, "FinCEN /fincen-orders is not this SKU");

  const ferc = parseCftcOrderText(readFx("ferc-order.txt"), {
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
    institution: "Interstate Power and Light Company",
  });
  assert.equal(isRealCftcOrderBody(ferc.body), false, "FERC /ferc-orders is not this SKU");

  const frb = parseCftcOrderText(readFx("frb-order.txt"), {
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf",
    institution: "Community Bankshares, Inc.",
  });
  assert.equal(isRealCftcOrderBody(frb.body), false, "FRB /frb-orders is not this SKU");

  const fdic = parseCftcOrderText(readFx("fdic-order.txt"), {
    sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
    institution: "MutualOne Bank",
  });
  assert.equal(isRealCftcOrderBody(fdic.body), false, "FDIC /fdic-orders is not this SKU");

  const occ = parseCftcOrderText(readFx("occ-cd.txt"), {
    sourceUrl: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
    institution: "United Texas Bank, National Association",
  });
  assert.equal(isRealCftcOrderBody(occ.body), false, "OCC /occ-cd is not this SKU");

  const cfpb = parseCftcOrderText(readFx("cfpb-order.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
    institution: "American Honda Finance Corporation",
  });
  assert.equal(isRealCftcOrderBody(cfpb.body), false, "CFPB /cfpb-orders is not this SKU");

  const ftc = parseCftcOrderText(readFx("ftc-wl.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
    institution: "Vtron Inc. d/b/a Vtron Lasers",
  });
  assert.equal(isRealCftcOrderBody(ftc.body), false, "FTC /ftc-wl is not this SKU");

  const ncua = parseCftcOrderText(readFx("ncua-order.txt"), {
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
    institution: "Live Life Federal Credit Union",
  });
  assert.equal(isRealCftcOrderBody(ncua.body), false, "NCUA /ncua-orders is not this SKU");

  const manifest = buildCftcOrdersManifest({
    ok: true,
    product: "cftc-institution-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-07-31",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      pdfHost: "https://www.cftc.gov/",
    },
    cards: [ubsText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /UBS Financial Services/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "26-04");
  assert.ok(!manBlob.includes("$8.9 billion"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("01:44 pm, Jul 31 2026"));
  assert.ok(!manBlob.includes("third-party consultant"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("26-04"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "CFTC");
  assert.ok(!manBlob.includes("MutualOne"));
  assert.ok(!manBlob.includes("vtron-lasers"));

  const cache = mkdtempSync(join(tmpdir(), "cftc-orders-collect-"));
  const prevDir = process.env.CFTC_ORDERS_DIR;
  process.env.CFTC_ORDERS_DIR = cache;
  try {
    const snap = await collectCftcOrders({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official CFTC institution order bodies");
    assert.ok(snap.cards.some((c) => c.docket === "26-04" && isRealCftcOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "26-02" && isRealCftcOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "25-02" && isRealCftcOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "25-03" && isRealCftcOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "25-04" && isRealCftcOrderBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealCftcOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "26-99"), "skip people");
    assert.ok(snap.cards.every((c) => officialCftcPdfUrl(c.sourceUrl)));
    assert.ok(
      snap.cards.every(
        (c) =>
          !/archive\.org|federalreserve\.gov|orders\.fdic\.gov|occ\.gov|consumerfinance\.gov|www\.ftc\.gov|ncua\.gov|fincen\.gov|cms\.ferc\.gov|elibrary\.ferc\.gov|ofac\.treasury\.gov|bis\.gov|federalregister\.gov/i.test(
            c.sourceUrl,
          ),
      ),
    );

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectCftcOrders({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "26-04"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.CFTC_ORDERS_DIR;
    else process.env.CFTC_ORDERS_DIR = prevDir;
  }

  console.log("cftc-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
