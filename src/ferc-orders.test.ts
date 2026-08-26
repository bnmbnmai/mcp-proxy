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
  SEED_LISTINGS,
  YEAR_LISTING_URLS,
  buildFercOrdersManifest,
  collectFercOrders,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealFercOrderBody,
  mediaSlugToOfficialPdfUrl,
  officialFercPdfUrl,
  parseFercOrderText,
  parseListingHtml,
  parseListingRows,
  pdfIdFromUrl,
  type FercListingRow,
} from "./ferc-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ferc-orders");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as FercListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official FERC excerpt lists institution orders");
  const ipl = listed.find((r) => r.id === "IN25-6-000");
  assert.ok(ipl);
  assert.match(ipl?.institution ?? "", /Interstate Power and Light/i);
  assert.equal(ipl?.date, "2026-04-17");
  assert.equal(
    ipl?.sourceUrl,
    "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
  );
  assert.ok(listed.some((r) => r.id === "IN25-4-000"));
  assert.ok(listed.some((r) => r.id === "IN25-10-000"));
  assert.ok(listed.some((r) => r.id === "IN26-2-000"));
  assert.ok(listed.some((r) => r.id === "IN25-13-000"));
  assert.ok(!listed.some((r) => r.id === "IN12-17-000"), "skip people");
  assert.ok(listed.every((r) => officialFercPdfUrl(r.sourceUrl)));
  assert.equal(
    officialFercPdfUrl(
      "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
    ),
    "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
  );
  assert.equal(
    officialFercPdfUrl("https://cms.ferc.gov/media/20260417-195ferc61048-in25-6-000-interstate-power-and-light-co-settlement-agreement"),
    null,
    "media landing page is not the PDF file",
  );
  assert.equal(officialFercPdfUrl("https://elibrary.ferc.gov/eLibrary/filelist?accession_Number=20260417-3061"), null);
  assert.equal(officialFercPdfUrl("https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf"), null);
  assert.equal(
    officialFercPdfUrl("https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf"),
    null,
  );
  assert.equal(
    officialFercPdfUrl("https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1"),
    null,
  );
  assert.equal(officialFercPdfUrl("https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf"), null);
  assert.ok(LISTING_URL.includes("ferc.gov"));
  assert.ok(YEAR_LISTING_URLS.some((u) => u.includes("all-civil-penalty-actions-2025")));
  assert.ok(YEAR_LISTING_URLS.some((u) => u.includes("all-civil-penalty-actions-2024")));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "IN25-6-000"));
  assert.ok(OFFICIAL_WALK_LISTINGS.length >= 10, "www.ferc.gov year tables 403; collect walks official cms.ferc.gov PDFs");
  assert.ok(OFFICIAL_WALK_LISTINGS.some((r) => r.docket === "IN25-9-000" && /Skye/i.test(r.institution)));
  assert.ok(OFFICIAL_WALK_LISTINGS.some((r) => r.docket === "IN24-9-000"));
  assert.ok(OFFICIAL_WALK_LISTINGS.every((r) => officialFercPdfUrl(r.sourceUrl)));
  assert.ok(!OFFICIAL_WALK_LISTINGS.some((r) => r.docket === "IN12-17-000"), "walk skips people");
  assert.ok(!OFFICIAL_WALK_LISTINGS.some((r) => r.docket === "IN21-10-000"), "walk skips Voltus people");
  assert.ok(!OFFICIAL_WALK_LISTINGS.some((r) => r.docket === "IN23-14-000"), "walk skips Ketchup Caddy people");
  const walkIds = new Set([...SEED_LISTINGS, ...OFFICIAL_WALK_LISTINGS].map((r) => r.id));
  assert.ok(walkIds.size > 5, "official PDF walk lists more than first-slice=5");
  const src = readFs(join(dirname(fileURLToPath(import.meta.url)), "../src/ferc-orders.ts"), "utf-8");
  assert.match(src, /FERC_ORDERS_LIMIT", "24"/);
  assert.match(src, /FERC_ORDERS_MAX_FETCH", "36"/);

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "IN25-6-000"));
  assert.ok(htmlListed.some((r) => r.id === "IN25-4-000"));
  assert.ok(!htmlListed.some((r) => r.id === "IN12-17-000"));

  const cordovaPdf =
    "https://cms.ferc.gov/sites/default/files/2025-09/20250903-192FERC61205-IN25-8-000-Cordova%20Energy%20Company%20LLC-Settlement%20Agreement.pdf";
  assert.equal(
    mediaSlugToOfficialPdfUrl(
      "https://cms.ferc.gov/media/20250903-192ferc61205-in25-8-000-cordova-energy-company-llc-settlement-agreement",
    ),
    officialFercPdfUrl(cordovaPdf),
  );
  assert.equal(officialFercPdfUrl(cordovaPdf), cordovaPdf);
  const yearListed = parseListingHtml(readFx("2025-year-excerpt.html"));
  assert.ok(yearListed.some((r) => r.id === "IN25-8-000" && /Cordova/i.test(r.institution)));
  assert.ok(yearListed.some((r) => r.id === "IN25-9-000" && /Skye/i.test(r.institution)));
  assert.ok(yearListed.every((r) => officialFercPdfUrl(r.sourceUrl)));
  assert.ok(!yearListed.some((r) => r.id === "IN12-17-000"), "year table skips people + terminating hearing");

  const people = rows.find((r) => (r.docket ?? "") === "IN12-17-000");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const iplRow = rows.find((r) => r.docket === "IN25-6-000" && officialFercPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(iplRow!), true);
  assert.equal(isPeopleRow(iplRow!), false);

  const iplText = parseFercOrderText(readFx("IN25-6-000.txt"), {
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
    institution: "Interstate Power and Light Company",
    date: "2026-04-17",
    docket: "IN25-6-000",
  });
  assert.equal(iplText.docket, "IN25-6-000");
  assert.match(iplText.institution, /Interstate Power and Light/i);
  assert.equal(iplText.date, "2026-04-17");
  assert.equal(iplText.title, "Order Approving Stipulation and Consent Agreement");
  assert.ok(isRealFercOrderBody(iplText.body));
  assert.ok(iplText.body.includes("commenced operations in 1978"));
  assert.ok(iplText.body.includes("Planning Resource Auction"));
  assert.ok(iplText.body.includes("Sutherland Generating Station"));
  assert.ok(CARD_FIELDS.every((f) => f in iplText));
  assert.equal(
    pdfIdFromUrl(iplText.sourceUrl),
    "20260417-195FERC61048-IN25-6-000-Interstate Power and Light Co-Settlement Agreement",
  );

  for (const [file, docket, url] of [
    [
      "IN25-4-000.txt",
      "IN25-4-000",
      "https://cms.ferc.gov/sites/default/files/2026-08/20260803-196FERC61100-IN25-4-000-Digihost-Settlement%20Agreement.pdf",
    ],
    [
      "IN25-10-000.txt",
      "IN25-10-000",
      "https://cms.ferc.gov/sites/default/files/2026-04/20260408-195FERC61019-IN25-10-000-MPH%20Rockaway%20Peakers%2C%20LLC%20and%20Bayswater-Settlement%20Agreement.pdf",
    ],
    [
      "IN26-2-000.txt",
      "IN26-2-000",
      "https://cms.ferc.gov/sites/default/files/2026-04/20260407-195FERC61016-IN26-2-000-Terra-Gen%2C%20LLC-Settlement%20Agreement.pdf",
    ],
    [
      "IN25-13-000.txt",
      "IN25-13-000",
      "https://cms.ferc.gov/sites/default/files/2026-01/20260112-194FERC61029-IN25-13-000-Tenaska%20Power%20Services%20Co-Settlement%20Agreement.pdf",
    ],
  ] as const) {
    const card = parseFercOrderText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealFercOrderBody(card.body), `${docket} is official FERC order TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialFercPdfUrl(card.sourceUrl));
  }

  const teaser = parseFercOrderText(readFx("no-body.txt"), {
    sourceUrl: LISTING_URL,
    institution: "Interstate Power and Light Company",
  });
  assert.equal(isRealFercOrderBody(teaser.body), false, "civil-penalty index teaser is not the order body");

  const elib = parseFercOrderText(readFx("elibrary-metadata.txt"), {
    sourceUrl: "https://elibrary.ferc.gov/eLibrary/filelist?accession_Number=20260417-3061",
    institution: "Interstate Power and Light Company",
  });
  assert.equal(isRealFercOrderBody(elib.body), false, "eLibrary metadata is a KILL");

  const peopleBody = parseFercOrderText(readFx("people.txt"), {
    sourceUrl: "https://cms.ferc.gov/sites/default/files/2025-01/people.pdf",
    institution: "Aaron Hall",
  });
  assert.equal(isRealFercOrderBody(peopleBody.body), false, "people file is not this SKU");

  const fr = parseFercOrderText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/04/17/2026-99999/interstate-power",
    institution: "Interstate Power and Light Company",
  });
  assert.equal(isRealFercOrderBody(fr.body), false, "Federal Register raw_text is a KILL");

  const fincen = parseFercOrderText(readFx("fincen-order.txt"), {
    sourceUrl: "https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealFercOrderBody(fincen.body), false, "FinCEN /fincen-orders is not this SKU");

  const frb = parseFercOrderText(readFx("frb-order.txt"), {
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf",
    institution: "Community Bankshares, Inc.",
  });
  assert.equal(isRealFercOrderBody(frb.body), false, "FRB /frb-orders is not this SKU");

  const fdic = parseFercOrderText(readFx("fdic-order.txt"), {
    sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
    institution: "MutualOne Bank",
  });
  assert.equal(isRealFercOrderBody(fdic.body), false, "FDIC /fdic-orders is not this SKU");

  const occ = parseFercOrderText(readFx("occ-cd.txt"), {
    sourceUrl: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
    institution: "United Texas Bank, National Association",
  });
  assert.equal(isRealFercOrderBody(occ.body), false, "OCC /occ-cd is not this SKU");

  const cfpb = parseFercOrderText(readFx("cfpb-order.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
    institution: "American Honda Finance Corporation",
  });
  assert.equal(isRealFercOrderBody(cfpb.body), false, "CFPB /cfpb-orders is not this SKU");

  const ftc = parseFercOrderText(readFx("ftc-wl.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
    institution: "Vtron Inc. d/b/a Vtron Lasers",
  });
  assert.equal(isRealFercOrderBody(ftc.body), false, "FTC /ftc-wl is not this SKU");

  const ncua = parseFercOrderText(readFx("ncua-order.txt"), {
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
    institution: "Live Life Federal Credit Union",
  });
  assert.equal(isRealFercOrderBody(ncua.body), false, "NCUA /ncua-orders is not this SKU");

  const manifest = buildFercOrdersManifest({
    ok: true,
    product: "ferc-institution-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-04-17",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      pdfHost: "https://cms.ferc.gov/",
    },
    cards: [iplText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Interstate Power and Light/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "IN25-6-000");
  assert.ok(!manBlob.includes("commenced operations in 1978"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("Planning Resource Auction"));
  assert.ok(!manBlob.includes("Sutherland Generating Station"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("IN25-6-000"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "FERC");
  assert.ok(!manBlob.includes("MutualOne"));
  assert.ok(!manBlob.includes("vtron-lasers"));

  const cache = mkdtempSync(join(tmpdir(), "ferc-orders-collect-"));
  const prevDir = process.env.FERC_ORDERS_DIR;
  process.env.FERC_ORDERS_DIR = cache;
  try {
    const snap = await collectFercOrders({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official FERC institution order bodies");
    assert.ok(snap.cards.some((c) => c.docket === "IN25-6-000" && isRealFercOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "IN25-4-000" && isRealFercOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "IN25-10-000" && isRealFercOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "IN26-2-000" && isRealFercOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "IN25-13-000" && isRealFercOrderBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealFercOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "IN12-17-000"), "skip people");
    assert.ok(snap.cards.every((c) => officialFercPdfUrl(c.sourceUrl)));
    assert.ok(
      snap.cards.every(
        (c) =>
          !/archive\.org|federalreserve\.gov|orders\.fdic\.gov|occ\.gov|consumerfinance\.gov|ftc\.gov|ncua\.gov|fincen\.gov|elibrary\.ferc\.gov|federalregister\.gov/i.test(
            c.sourceUrl,
          ),
      ),
    );

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectFercOrders({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "IN25-6-000"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.FERC_ORDERS_DIR;
    else process.env.FERC_ORDERS_DIR = prevDir;
  }

  console.log("ferc-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
