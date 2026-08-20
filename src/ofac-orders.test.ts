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
  buildOfacOrdersManifest,
  collectOfacOrders,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealOfacOrderBody,
  officialOfacPdfUrl,
  parseOfacOrderText,
  parseListingHtml,
  parseListingRows,
  pdfIdFromUrl,
  type OfacListingRow,
} from "./ofac-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ofac-orders");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as OfacListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official OFAC excerpt lists institution enforcement releases");
  const rice = listed.find((r) => r.id === "936706");
  assert.ok(rice);
  assert.match(rice?.institution ?? "", /Rice Lake Weighing Systems/i);
  assert.equal(rice?.date, "2026-08-12");
  assert.equal(rice?.sourceUrl, "https://ofac.treasury.gov/media/936706/download");
  assert.ok(listed.some((r) => r.id === "935651"));
  assert.ok(listed.some((r) => r.id === "935631"));
  assert.ok(listed.some((r) => r.id === "935351"));
  assert.ok(listed.some((r) => r.id === "935006"));
  assert.ok(!listed.some((r) => r.id === "935041"), "skip people / An Individual");
  assert.ok(listed.every((r) => officialOfacPdfUrl(r.sourceUrl)));
  assert.equal(
    officialOfacPdfUrl("https://ofac.treasury.gov/media/936706/download?inline="),
    "https://ofac.treasury.gov/media/936706/download",
  );
  assert.equal(
    officialOfacPdfUrl("https://ofac.treasury.gov/media/936706"),
    "https://ofac.treasury.gov/media/936706/download",
  );
  assert.equal(officialOfacPdfUrl("https://ofac.treasury.gov/civil-penalties-and-enforcement-information"), null);
  assert.equal(officialOfacPdfUrl("https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf"), null);
  assert.equal(
    officialOfacPdfUrl(
      "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
    ),
    null,
  );
  assert.equal(
    officialOfacPdfUrl("https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf"),
    null,
  );
  assert.equal(
    officialOfacPdfUrl("https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union"),
    null,
  );
  assert.equal(officialOfacPdfUrl("https://www.federalregister.gov/documents/2026/08/12/2026-99999/rice-lake"), null);
  assert.ok(LISTING_URL.includes("ofac.treasury.gov"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "936706"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "936706"));
  assert.ok(htmlListed.some((r) => r.id === "935006"));
  assert.ok(!htmlListed.some((r) => r.id === "935041"));

  const people = rows.find((r) => (r.docket ?? "") === "935041");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const riceRow = rows.find((r) => r.docket === "936706" && officialOfacPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(riceRow!), true);
  assert.equal(isPeopleRow(riceRow!), false);

  const riceText = parseOfacOrderText(readFx("936706.txt"), {
    sourceUrl: "https://ofac.treasury.gov/media/936706/download?inline=",
    institution: "Rice Lake Weighing Systems, Inc.",
    date: "2026-08-12",
    docket: "936706",
  });
  assert.equal(riceText.docket, "936706");
  assert.match(riceText.institution, /Rice Lake Weighing Systems/i);
  assert.equal(riceText.date, "2026-08-12");
  assert.equal(riceText.title, "Enforcement Release");
  assert.ok(isRealOfacOrderBody(riceText.body));
  assert.ok(riceText.body.includes("Dini Argeo S.r.l."));
  assert.ok(riceText.body.includes("Pand Weighing Control"));
  assert.ok(riceText.body.includes("Import Export Coordinator"));
  assert.ok(CARD_FIELDS.every((f) => f in riceText));
  assert.equal(pdfIdFromUrl(riceText.sourceUrl), "936706");
  assert.equal(riceText.sourceUrl, "https://ofac.treasury.gov/media/936706/download");

  for (const [file, docket, url] of [
    ["935651.txt", "935651", "https://ofac.treasury.gov/media/935651/download"],
    ["935631.txt", "935631", "https://ofac.treasury.gov/media/935631/download"],
    ["935351.txt", "935351", "https://ofac.treasury.gov/media/935351/download"],
    ["935006.txt", "935006", "https://ofac.treasury.gov/media/935006/download"],
  ] as const) {
    const card = parseOfacOrderText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealOfacOrderBody(card.body), `${docket} is official OFAC enforcement-release TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialOfacPdfUrl(card.sourceUrl));
  }

  const teaser = parseOfacOrderText(readFx("no-body.txt"), {
    sourceUrl: LISTING_URL,
    institution: "Rice Lake Weighing Systems, Inc.",
  });
  assert.equal(isRealOfacOrderBody(teaser.body), false, "civil-penalties chart/teaser is not the order body");

  const rss = parseOfacOrderText(readFx("rss.txt"), {
    sourceUrl: "https://ofac.treasury.gov/rss",
    institution: "Rice Lake Weighing Systems, Inc.",
  });
  assert.equal(isRealOfacOrderBody(rss.body), false, "RSS teaser is a KILL");

  const peopleBody = parseOfacOrderText(readFx("people.txt"), {
    sourceUrl: "https://ofac.treasury.gov/media/935041/download",
    institution: "An Individual",
  });
  assert.equal(isRealOfacOrderBody(peopleBody.body), false, "people file is not this SKU");

  const fr = parseOfacOrderText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/08/12/2026-99999/rice-lake",
    institution: "Rice Lake Weighing Systems, Inc.",
  });
  assert.equal(isRealOfacOrderBody(fr.body), false, "Federal Register raw_text is a KILL");

  const fincen = parseOfacOrderText(readFx("fincen-order.txt"), {
    sourceUrl: "https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealOfacOrderBody(fincen.body), false, "FinCEN /fincen-orders is not this SKU");

  const ferc = parseOfacOrderText(readFx("ferc-order.txt"), {
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
    institution: "Interstate Power and Light Company",
  });
  assert.equal(isRealOfacOrderBody(ferc.body), false, "FERC /ferc-orders is not this SKU");

  const frb = parseOfacOrderText(readFx("frb-order.txt"), {
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf",
    institution: "Community Bankshares, Inc.",
  });
  assert.equal(isRealOfacOrderBody(frb.body), false, "FRB /frb-orders is not this SKU");

  const fdic = parseOfacOrderText(readFx("fdic-order.txt"), {
    sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
    institution: "MutualOne Bank",
  });
  assert.equal(isRealOfacOrderBody(fdic.body), false, "FDIC /fdic-orders is not this SKU");

  const occ = parseOfacOrderText(readFx("occ-cd.txt"), {
    sourceUrl: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
    institution: "United Texas Bank, National Association",
  });
  assert.equal(isRealOfacOrderBody(occ.body), false, "OCC /occ-cd is not this SKU");

  const cfpb = parseOfacOrderText(readFx("cfpb-order.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
    institution: "American Honda Finance Corporation",
  });
  assert.equal(isRealOfacOrderBody(cfpb.body), false, "CFPB /cfpb-orders is not this SKU");

  const ftc = parseOfacOrderText(readFx("ftc-wl.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
    institution: "Vtron Inc. d/b/a Vtron Lasers",
  });
  assert.equal(isRealOfacOrderBody(ftc.body), false, "FTC /ftc-wl is not this SKU");

  const ncua = parseOfacOrderText(readFx("ncua-order.txt"), {
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
    institution: "Live Life Federal Credit Union",
  });
  assert.equal(isRealOfacOrderBody(ncua.body), false, "NCUA /ncua-orders is not this SKU");

  const manifest = buildOfacOrdersManifest({
    ok: true,
    product: "ofac-institution-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-08-12",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      pdfHost: "https://ofac.treasury.gov/",
    },
    cards: [riceText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Rice Lake Weighing Systems/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "936706");
  assert.ok(!manBlob.includes("Dini Argeo S.r.l."), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("Pand Weighing Control"));
  assert.ok(!manBlob.includes("Import Export Coordinator"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("936706"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "OFAC");
  assert.ok(!manBlob.includes("MutualOne"));
  assert.ok(!manBlob.includes("vtron-lasers"));

  const cache = mkdtempSync(join(tmpdir(), "ofac-orders-collect-"));
  const prevDir = process.env.OFAC_ORDERS_DIR;
  process.env.OFAC_ORDERS_DIR = cache;
  try {
    const snap = await collectOfacOrders({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official OFAC institution enforcement-release bodies");
    assert.ok(snap.cards.some((c) => c.docket === "936706" && isRealOfacOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "935651" && isRealOfacOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "935631" && isRealOfacOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "935351" && isRealOfacOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "935006" && isRealOfacOrderBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealOfacOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "935041"), "skip people");
    assert.ok(snap.cards.every((c) => officialOfacPdfUrl(c.sourceUrl)));
    assert.ok(
      snap.cards.every(
        (c) =>
          !/archive\.org|federalreserve\.gov|orders\.fdic\.gov|occ\.gov|consumerfinance\.gov|ftc\.gov|ncua\.gov|fincen\.gov|cms\.ferc\.gov|elibrary\.ferc\.gov|federalregister\.gov/i.test(
            c.sourceUrl,
          ),
      ),
    );

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectOfacOrders({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "936706"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.OFAC_ORDERS_DIR;
    else process.env.OFAC_ORDERS_DIR = prevDir;
  }

  console.log("ofac-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
