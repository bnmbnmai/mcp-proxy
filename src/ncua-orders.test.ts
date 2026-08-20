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
  buildNcuaOrdersManifest,
  collectNcuaOrders,
  isCmpRow,
  isInstitutionOrderRow,
  isLuaRow,
  isPeopleRow,
  isRealNcuaOrderBody,
  isTerminationRow,
  officialNcuaOrderUrl,
  parseListingHtml,
  parseListingRows,
  parseNcuaOrderHtml,
  type NcuaListingRow,
} from "./ncua-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ncua-orders");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as NcuaListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official NCUA excerpt lists institution C&D rows");
  const live = listed.find((r) => r.id === "21-0105-ER");
  assert.ok(live);
  assert.match(live?.creditUnion ?? "", /Live Life Federal Credit Union/i);
  assert.equal(live?.date, "2021-02-22");
  assert.equal(
    live?.sourceUrl,
    "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
  );
  assert.ok(listed.some((r) => r.id === "19-1061-ER"));
  assert.ok(listed.some((r) => r.id === "19-0187-ER"));
  assert.ok(listed.some((r) => r.id === "22-0112-ER"));
  assert.ok(listed.some((r) => r.id === "22-0122-ER"));
  assert.ok(!listed.some((r) => r.id === "26-0031-WR"), "skip 2026 people/IAP");
  assert.ok(!listed.some((r) => r.id === "23-0107-ER"), "skip termination");
  assert.ok(!listed.some((r) => r.id === "25-0004-SR"), "skip late-filer CMP");
  assert.ok(!listed.some((r) => r.id === "18-0001-ER"), "skip LUA");
  assert.ok(listed.every((r) => officialNcuaOrderUrl(r.sourceUrl)));
  assert.equal(
    officialNcuaOrderUrl("https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1"),
    null,
  );
  assert.equal(officialNcuaOrderUrl("https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf"), null);
  assert.equal(officialNcuaOrderUrl("https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf"), null);
  assert.equal(
    officialNcuaOrderUrl("https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf"),
    null,
  );
  assert.equal(officialNcuaOrderUrl("https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf"), null);
  assert.equal(
    officialNcuaOrderUrl(
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
    ),
    "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
  );
  assert.ok(LISTING_URL.includes("ncua.gov"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "21-0105-ER"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "21-0105-ER"));
  assert.ok(!htmlListed.some((r) => r.id === "26-0031-WR"), "HTML listing skips people/IAP");

  const people = rows.find((r) => (r.docket ?? "") === "26-0031-WR");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const liveRow = rows.find((r) => r.docket === "21-0105-ER");
  assert.equal(isInstitutionOrderRow(liveRow!), true);
  assert.equal(isPeopleRow(liveRow!), false);
  const cmp = rows.find((r) => r.docket === "25-0004-SR");
  assert.equal(isCmpRow(cmp!), true);
  assert.equal(isInstitutionOrderRow(cmp!), false);
  const term = rows.find((r) => r.docket === "23-0107-ER");
  assert.equal(isTerminationRow(term!), true);
  assert.equal(isInstitutionOrderRow(term!), false);
  const lua = rows.find((r) => r.docket === "18-0001-ER");
  assert.equal(isLuaRow(lua!), true);
  assert.equal(isInstitutionOrderRow(lua!), false);

  const liveText = parseNcuaOrderHtml(readFx("21-0105-ER.html"), {
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
    creditUnion: "Live Life Federal Credit Union",
    location: "Fraser, Michigan",
    date: "2021-02-22",
    docket: "21-0105-ER",
  });
  assert.equal(liveText.docket, "21-0105-ER");
  assert.match(liveText.creditUnion, /Live Life Federal Credit Union/i);
  assert.equal(liveText.date, "2021-02-22");
  assert.equal(liveText.title, "Stipulation and Consent to Cease and Desist Order");
  assert.ok(isRealNcuaOrderBody(liveText.body));
  assert.ok(liveText.body.includes("Marijuana-Related"));
  assert.ok(liveText.body.includes("METRC"));
  assert.ok(liveText.body.includes("BSA Expectations"));
  assert.ok(CARD_FIELDS.every((f) => f in liveText));

  const phi = parseNcuaOrderHtml(readFx("19-1061-ER.html"), {
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2019/administrative-order-matter-cease-and-desist-order-phi-beta-sigma-federal-credit-union",
    creditUnion: "Phi Beta Sigma Federal Credit Union",
    docket: "19-1061-ER",
  });
  assert.ok(isRealNcuaOrderBody(phi.body));
  assert.match(phi.creditUnion, /Phi Beta Sigma/i);

  const defense = parseNcuaOrderHtml(readFx("19-0187-ER.html"), {
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2019/administrative-order-matter-cease-and-desist-order-defense-logistics-federal-credit-union",
    creditUnion: "Defense Logistics Federal Credit Union",
    docket: "19-0187-ER",
  });
  assert.ok(isRealNcuaOrderBody(defense.body));
  assert.match(defense.creditUnion, /Defense Logistics/i);

  const inter = parseNcuaOrderHtml(readFx("22-0112-ER.html"), {
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2022/administrative-order-matter-inter-american-federal-credit-union",
    creditUnion: "Inter-American Federal Credit Union",
    docket: "22-0112-ER",
  });
  assert.ok(isRealNcuaOrderBody(inter.body));

  const yonkers = parseNcuaOrderHtml(readFx("22-0122-ER.html"), {
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2022/administrative-order-matter-yonkers-postal-employees-credit-union",
    creditUnion: "Yonkers Postal Employees Credit Union",
    docket: "22-0122-ER",
  });
  assert.ok(isRealNcuaOrderBody(yonkers.body));

  const teaser = parseNcuaOrderHtml(readFx("no-body.txt"), {
    sourceUrl: LISTING_URL,
    creditUnion: "Live Life Federal Credit Union",
  });
  assert.equal(isRealNcuaOrderBody(teaser.body), false, "index card teaser is not the order body");

  const csv = parseNcuaOrderHtml(readFx("csv-metadata.csv"), {
    sourceUrl: "https://ncua.gov/sites/default/files/list_csv/administrative-orders.csv",
    creditUnion: "Live Life Federal Credit Union",
  });
  assert.equal(isRealNcuaOrderBody(csv.body), false, "official CSV is metadata only");

  const iap = parseNcuaOrderHtml(readFx("people-iap.txt"), {
    sourceUrl: "https://ncua.gov/news/enforcement-actions/administrative-orders/2026/administrative-order-matter-jordan-l-mccarthy",
    creditUnion: "Educators Credit Union",
  });
  assert.equal(isRealNcuaOrderBody(iap.body), false, "2026 people/IAP is not this SKU");

  const cmpBody = parseNcuaOrderHtml(readFx("late-filer-cmp.txt"), {
    sourceUrl: "https://ncua.gov/news/enforcement-actions/administrative-orders/2025/administrative-order-matter-golden-circle-credit-union",
    creditUnion: "Golden Circle Credit Union",
  });
  assert.equal(isRealNcuaOrderBody(cmpBody.body), false, "late-filer CMP is not this SKU");

  const luaBody = parseNcuaOrderHtml(readFx("lua.txt"), {
    sourceUrl: "https://ncua.gov/news/enforcement-actions/administrative-orders/2018/administrative-order-matter-example-lua-credit-union",
    creditUnion: "Example LUA Credit Union",
  });
  assert.equal(isRealNcuaOrderBody(luaBody.body), false, "LUA is not this SKU");

  const termBody = parseNcuaOrderHtml(readFx("termination.txt"), {
    sourceUrl: "https://ncua.gov/news/enforcement-actions/administrative-orders/2023/administrative-order-matter-live-life-federal-credit-union",
    creditUnion: "Live Life Federal Credit Union",
  });
  assert.equal(isRealNcuaOrderBody(termBody.body), false, "termination is not the C&D body");

  const drupal = parseNcuaOrderHtml(readFx("drupal-json.txt"), {
    sourceUrl:
      "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union?_format=json",
    creditUnion: "Live Life Federal Credit Union",
  });
  assert.equal(isRealNcuaOrderBody(drupal.body), false, "Drupal ?_format=json 406 is a KILL");

  const fdic = parseNcuaOrderHtml(readFx("fdic-order.txt"), {
    sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
    creditUnion: "MutualOne Bank",
  });
  assert.equal(isRealNcuaOrderBody(fdic.body), false, "FDIC /fdic-orders is not this SKU");

  const occ = parseNcuaOrderHtml(readFx("occ-cd.txt"), {
    sourceUrl: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
    creditUnion: "United Texas Bank, National Association",
  });
  assert.equal(isRealNcuaOrderBody(occ.body), false, "OCC /occ-cd is not this SKU");

  const cfpb = parseNcuaOrderHtml(readFx("cfpb-order.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
    creditUnion: "American Honda Finance Corporation",
  });
  assert.equal(isRealNcuaOrderBody(cfpb.body), false, "CFPB /cfpb-orders is not this SKU");

  const ftc = parseNcuaOrderHtml(readFx("ftc-wl.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
    creditUnion: "Vtron Inc. d/b/a Vtron Lasers",
  });
  assert.equal(isRealNcuaOrderBody(ftc.body), false, "FTC /ftc-wl is not this SKU");

  const frb = parseNcuaOrderHtml(readFx("frb-order.txt"), {
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf",
    creditUnion: "Community Bankshares, Inc.",
  });
  assert.equal(isRealNcuaOrderBody(frb.body), false, "FRB /frb-orders is not this SKU");

  const manifest = buildNcuaOrdersManifest({
    ok: true,
    product: "ncua-institution-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2021-02-22",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      csv: "https://ncua.gov/sites/default/files/list_csv/administrative-orders.csv",
      htmlHost: "https://ncua.gov/",
    },
    cards: [liveText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { creditUnion: string }[])[0]?.creditUnion ?? "", /Live Life/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "21-0105-ER");
  assert.ok(!manBlob.includes("Marijuana-Related"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("METRC"));
  assert.ok(!manBlob.includes("BSA Expectations"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "NCUA");

  const cache = mkdtempSync(join(tmpdir(), "ncua-orders-collect-"));
  const prevDir = process.env.NCUA_ORDERS_DIR;
  process.env.NCUA_ORDERS_DIR = cache;
  try {
    const snap = await collectNcuaOrders({ htmlDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official NCUA institution C&D bodies");
    assert.ok(snap.cards.some((c) => c.docket === "21-0105-ER" && isRealNcuaOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "19-1061-ER" && isRealNcuaOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "19-0187-ER" && isRealNcuaOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "22-0112-ER" && isRealNcuaOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "22-0122-ER" && isRealNcuaOrderBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealNcuaOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "26-0031-WR"), "skip IAP");
    assert.ok(!snap.cards.some((c) => c.id === "23-0107-ER"), "skip termination");
    assert.ok(snap.cards.every((c) => officialNcuaOrderUrl(c.sourceUrl)));
    assert.ok(
      snap.cards.every((c) => !/archive\.org|fdic\.gov|occ\.gov|ftc\.gov|consumerfinance\.gov|federalreserve\.gov/i.test(c.sourceUrl)),
    );
    const liveCard = snap.cards.find((c) => c.docket === "21-0105-ER");
    assert.ok(liveCard?.body.includes("Marijuana-Related"));
    assert.ok(liveCard?.body.includes("METRC"));
    assert.ok(liveCard?.body.includes("BSA Expectations"));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectNcuaOrders({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "21-0105-ER"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.NCUA_ORDERS_DIR;
    else process.env.NCUA_ORDERS_DIR = prevDir;
  }

  console.log("ncua-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
