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
  buildBisOrdersManifest,
  collectBisOrders,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealBisOrderBody,
  officialBisPdfUrl,
  parseBisOrderText,
  parseListingHtml,
  parseListingRows,
  pdfIdFromUrl,
  type BisListingRow,
} from "./bis-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/bis-orders");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as BisListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official BIS excerpt lists institution charging letters / orders");
  const coastal = listed.find((r) => r.id === "E3050");
  assert.ok(coastal);
  assert.match(coastal?.institution ?? "", /Coastal PVA Technology/i);
  assert.equal(coastal?.date, "2026-04-13");
  assert.equal(
    coastal?.sourceUrl,
    "https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
  );
  assert.ok(listed.some((r) => r.id === "plexon-inc"));
  assert.ok(listed.some((r) => r.id === "andritz-inc"));
  assert.ok(listed.some((r) => r.id === "E2995"));
  assert.ok(listed.some((r) => r.id === "E2994"));
  assert.ok(!listed.some((r) => r.id === "E2946"), "skip people / Charles McGonigal");
  assert.ok(listed.every((r) => officialBisPdfUrl(r.sourceUrl)));
  assert.equal(
    officialBisPdfUrl("https://media.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf"),
    "https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
  );
  assert.equal(
    officialBisPdfUrl("https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf?inline="),
    "https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
  );
  assert.equal(officialBisPdfUrl("https://www.bis.gov/enforcement/charging-letters"), null);
  assert.equal(
    officialBisPdfUrl("https://media.bis.gov/press-release/bis-reaches-administrative-enforcement-settlement-coastal-pva-technology-inc."),
    null,
  );
  assert.equal(officialBisPdfUrl("https://ofac.treasury.gov/media/936706/download"), null);
  assert.equal(
    officialBisPdfUrl(
      "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
    ),
    null,
  );
  assert.equal(officialBisPdfUrl("https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf"), null);
  assert.equal(officialBisPdfUrl("https://www.federalregister.gov/documents/2026/04/14/2026-99999/coastal-pva"), null);
  assert.ok(LISTING_URL.includes("bis.gov"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "E3050"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "E3050"));
  assert.ok(htmlListed.some((r) => r.id === "E2994"));
  assert.ok(!htmlListed.some((r) => r.id === "E2946"));

  const people = rows.find((r) => (r.docket ?? "") === "E2946");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const coastalRow = rows.find((r) => r.docket === "E3050" && officialBisPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(coastalRow!), true);
  assert.equal(isPeopleRow(coastalRow!), false);

  const coastalText = parseBisOrderText(readFx("E3050.txt"), {
    sourceUrl: "https://media.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
    institution: "Coastal PVA Technology, Inc.",
    date: "2026-04-13",
    docket: "E3050",
  });
  assert.equal(coastalText.docket, "E3050");
  assert.match(coastalText.institution, /Coastal PVA Technology/i);
  assert.equal(coastalText.date, "2026-04-13");
  assert.equal(coastalText.title, "Proposed Charging Letter");
  assert.ok(isRealBisOrderBody(coastalText.body));
  assert.ok(coastalText.body.includes("4031 Alvis Court"));
  assert.ok(coastalText.body.includes("post-etched semiconductor wafers"));
  assert.ok(coastalText.body.includes("Malorie Eisenbrei"));
  assert.ok(CARD_FIELDS.every((f) => f in coastalText));
  assert.equal(pdfIdFromUrl(coastalText.sourceUrl), "coastal-pva-technology-inc-4-13-2026-rev");
  assert.equal(
    coastalText.sourceUrl,
    "https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
  );

  for (const [file, docket, url] of [
    ["plexon-inc.txt", "plexon-inc", "https://www.bis.gov/media/documents/plexon-inc.-8-14-2026.pdf"],
    [
      "andritz-inc.txt",
      "andritz-inc",
      "https://www.bis.gov/sites/default/files/documents/Andritz%20Inc.%20Final%20Order%207-29-2025.pdf",
    ],
    [
      "E2995.txt",
      "E2995",
      "https://www.bis.gov/sites/default/files/documents/E2995_Alpha%20and%20Omega%20Semiconductor%20%28AOS%29%20Final%20Order%206.27.25.pdf",
    ],
    [
      "E2994.txt",
      "E2994",
      "https://www.bis.gov/sites/default/files/documents/E2994-Unicat%20Catalyst%20Technologies%20Final%20Order%20-%2012-20-2024.pdf",
    ],
  ] as const) {
    const card = parseBisOrderText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealBisOrderBody(card.body), `${docket} is official BIS charging-letter / order TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialBisPdfUrl(card.sourceUrl));
  }

  const teaser = parseBisOrderText(readFx("no-body.txt"), {
    sourceUrl: LISTING_URL,
    institution: "Coastal PVA Technology, Inc.",
  });
  assert.equal(isRealBisOrderBody(teaser.body), false, "press/teaser is not the order body");

  const peopleBody = parseBisOrderText(readFx("people.txt"), {
    sourceUrl: "https://efoia.bis.doc.gov/index.php/documents/export-violations/export-violations-2024/1618-e2946",
    institution: "Charles McGonigal",
  });
  assert.equal(isRealBisOrderBody(peopleBody.body), false, "people file is not this SKU");

  const fr = parseBisOrderText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/04/14/2026-99999/coastal-pva",
    institution: "Coastal PVA Technology, Inc.",
  });
  assert.equal(isRealBisOrderBody(fr.body), false, "Federal Register raw_text is a KILL");

  const ofac = parseBisOrderText(readFx("ofac-order.txt"), {
    sourceUrl: "https://ofac.treasury.gov/media/936706/download",
    institution: "Rice Lake Weighing Systems, Inc.",
  });
  assert.equal(isRealBisOrderBody(ofac.body), false, "OFAC /ofac-orders is not this SKU");

  const fincen = parseBisOrderText(readFx("fincen-order.txt"), {
    sourceUrl: "https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealBisOrderBody(fincen.body), false, "FinCEN /fincen-orders is not this SKU");

  const ferc = parseBisOrderText(readFx("ferc-order.txt"), {
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
    institution: "Interstate Power and Light Company",
  });
  assert.equal(isRealBisOrderBody(ferc.body), false, "FERC /ferc-orders is not this SKU");

  const frb = parseBisOrderText(readFx("frb-order.txt"), {
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf",
    institution: "Community Bankshares, Inc.",
  });
  assert.equal(isRealBisOrderBody(frb.body), false, "FRB /frb-orders is not this SKU");

  const fdic = parseBisOrderText(readFx("fdic-order.txt"), {
    sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
    institution: "MutualOne Bank",
  });
  assert.equal(isRealBisOrderBody(fdic.body), false, "FDIC /fdic-orders is not this SKU");

  const occ = parseBisOrderText(readFx("occ-cd.txt"), {
    sourceUrl: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
    institution: "United Texas Bank, National Association",
  });
  assert.equal(isRealBisOrderBody(occ.body), false, "OCC /occ-cd is not this SKU");

  const cfpb = parseBisOrderText(readFx("cfpb-order.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
    institution: "American Honda Finance Corporation",
  });
  assert.equal(isRealBisOrderBody(cfpb.body), false, "CFPB /cfpb-orders is not this SKU");

  const ftc = parseBisOrderText(readFx("ftc-wl.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
    institution: "Vtron Inc. d/b/a Vtron Lasers",
  });
  assert.equal(isRealBisOrderBody(ftc.body), false, "FTC /ftc-wl is not this SKU");

  const cftc = parseBisOrderText(readFx("cftc-order.txt"), {
    sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealBisOrderBody(cftc.body), false, "CFTC /cftc-orders is not this SKU");

  const ncua = parseBisOrderText(readFx("ncua-order.txt"), {
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
    institution: "Live Life Federal Credit Union",
  });
  assert.equal(isRealBisOrderBody(ncua.body), false, "NCUA /ncua-orders is not this SKU");

  const manifest = buildBisOrdersManifest({
    ok: true,
    product: "bis-institution-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-08-14",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      pdfHost: "https://www.bis.gov/",
    },
    cards: [coastalText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Coastal PVA Technology/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "E3050");
  assert.ok(!manBlob.includes("4031 Alvis Court"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("post-etched semiconductor wafers"));
  assert.ok(!manBlob.includes("Malorie Eisenbrei"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("E3050"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "BIS");
  assert.ok(!manBlob.includes("MutualOne"));
  assert.ok(!manBlob.includes("vtron-lasers"));

  const cache = mkdtempSync(join(tmpdir(), "bis-orders-collect-"));
  const prevDir = process.env.BIS_ORDERS_DIR;
  process.env.BIS_ORDERS_DIR = cache;
  try {
    const snap = await collectBisOrders({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official BIS institution charging-letter / order bodies");
    assert.ok(snap.cards.some((c) => c.docket === "E3050" && isRealBisOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "plexon-inc" && isRealBisOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "andritz-inc" && isRealBisOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "E2995" && isRealBisOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "E2994" && isRealBisOrderBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealBisOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "E2946"), "skip people");
    assert.ok(snap.cards.every((c) => officialBisPdfUrl(c.sourceUrl)));
    assert.ok(
      snap.cards.every(
        (c) =>
          !/archive\.org|federalreserve\.gov|orders\.fdic\.gov|occ\.gov|consumerfinance\.gov|ftc\.gov|ncua\.gov|fincen\.gov|cms\.ferc\.gov|elibrary\.ferc\.gov|ofac\.treasury\.gov|federalregister\.gov/i.test(
            c.sourceUrl,
          ),
      ),
    );

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectBisOrders({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "E3050"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.BIS_ORDERS_DIR;
    else process.env.BIS_ORDERS_DIR = prevDir;
  }

  console.log("bis-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
