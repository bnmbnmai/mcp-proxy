import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADENARIWO_DOC,
  ADENARIWO_ID,
  ADENARIWO_URL,
  ATTRIBUTION,
  BBBY_ID,
  BBBY_URL,
  BODY_NEEDLE_DEPOSIT,
  BODY_NEEDLE_DEPOT,
  BODY_NEEDLE_EMPTY,
  BODY_NEEDLE_NOR,
  CARD_FIELDS,
  FMC_ORDERS_AMOUNT_ATOMIC,
  FMC_ORDERS_MANIFEST_PATH,
  FMC_ORDERS_ONE_AMOUNT_ATOMIC,
  FMC_ORDERS_PATH,
  GIBSON_ID,
  GIBSON_URL,
  LICENSE,
  LISTING_URL,
  MSC_ORDER_ID,
  MSC_ORDER_URL,
  PRODUCT_ID,
  SEED_LISTINGS,
  assembleFmcOrdersSnapshot,
  buildFmcOrdersManifest,
  catalogId,
  collectFmcOrders,
  discoverProceedingUrls,
  filterFmcOrdersManifest,
  isFederalRegisterHtml,
  isFrMirrorBody,
  isPhmsaTsvKill,
  isProceedingHtmlOnly,
  isRealFmcOrderBody,
  isWordpressCms,
  keepListing,
  officialFmcPdfUrl,
  parseFmcOrderText,
  parseKind,
  parseProceedingHtml,
} from "./fmc-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fmc-orders");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(FMC_ORDERS_PATH, "/fmc-orders");
  assert.equal(FMC_ORDERS_MANIFEST_PATH, "/fmc-orders/manifest.json");
  assert.equal(FMC_ORDERS_AMOUNT_ATOMIC, "50000");
  assert.equal(FMC_ORDERS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(LISTING_URL.includes("www2.fmc.gov/readingroom/DocumentSearch"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === MSC_ORDER_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === ADENARIWO_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === GIBSON_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === BBBY_ID));

  assert.equal(officialFmcPdfUrl(MSC_ORDER_URL), MSC_ORDER_URL);
  assert.equal(officialFmcPdfUrl(` ${ADENARIWO_URL} `), ADENARIWO_URL);
  assert.equal(officialFmcPdfUrl(GIBSON_URL), GIBSON_URL);
  assert.equal(officialFmcPdfUrl(BBBY_URL), BBBY_URL);
  assert.equal(officialFmcPdfUrl(ADENARIWO_DOC), ADENARIWO_DOC);
  assert.equal(
    officialFmcPdfUrl("https://www.federalregister.gov/documents/2026/01/06/fmc-23-08"),
    null,
    "FR HTML is not this bag",
  );
  assert.equal(
    officialFmcPdfUrl("https://www.fmc.gov/wp-json/wp/v2/pages/4021"),
    null,
    "wordpress wp-json is site CMS, not the order body",
  );
  assert.equal(
    officialFmcPdfUrl("https://primis.phmsa.dot.gov/comm/reports/enforce/documents/PipelineEnforcementRawData.tsv"),
    null,
    "PHMSA raw TSV is KILL",
  );
  assert.equal(officialFmcPdfUrl("https://www.stb.gov/proceedings-actions/decisions/"), null);
  assert.equal(officialFmcPdfUrl("https://www.oalj.dol.gov/DECISIONS/ALJ/SPA/2026/x.PDF"), null);

  assert.equal(catalogId("2033(I)", "136187"), "2033-i-136187");
  assert.equal(catalogId("23-08", "131865"), "23-08-131865");
  assert.equal(parseKind("Served Order on Initial Decision"), "Order on Initial Decision");
  assert.equal(parseKind("Served Initial Decision (public & confidential versions)"), "Initial Decision");
  assert.equal(parseKind("Notice of Filing appeared in Federal Register 88 FR 55699. (initial decision due: August 12, 2024)"), null);
  assert.equal(
    keepListing({
      docket: "23-08",
      documentId: "131865",
      kind: "Order on Initial Decision",
      title: "Served Order on Initial Decision",
      institution: "Mediterranean Shipping Company, S.A.",
      sourceUrl: MSC_ORDER_URL,
    }),
    true,
  );
  assert.equal(
    keepListing({
      docket: "23-08",
      documentId: "119887",
      kind: "Initial Decision",
      title: "Received Bureau of Enforcement Exceptions to Initial Decision",
      institution: "MSC",
      sourceUrl: "https://www2.fmc.gov/readingroom/documents/119887",
    }),
    false,
    "party exceptions are not this bag",
  );

  const listed = parseProceedingHtml(readFx("listing-excerpt.html"));
  assert.ok(listed.some((r) => r.id === MSC_ORDER_ID), `seeds in listing, got ${listed.map((r) => r.id).join(",")}`);
  assert.ok(listed.some((r) => r.id === ADENARIWO_ID));
  assert.ok(listed.some((r) => r.id === GIBSON_ID));
  assert.ok(listed.some((r) => r.id === BBBY_ID));
  assert.ok(listed.some((r) => r.id === "23-08-118811"), "23-08 Initial Decision is first-class, not just the Commission Order");
  assert.ok(!listed.some((r) => r.documentId === "93099"), "FR notice is not this bag");
  assert.ok(!listed.some((r) => r.documentId === "119887"), "party exceptions are not this bag");
  const msc = listed.find((r) => r.id === MSC_ORDER_ID);
  assert.equal(msc?.board, "commission");
  assert.equal(msc?.kind, "Order on Initial Decision");
  assert.match(msc?.institution ?? "", /Mediterranean Shipping/i);
  assert.ok(!/Last Updated/i.test(msc?.institution ?? ""), "Last Updated heading is not the party");
  assert.ok(msc?.sourceUrl.includes("/readingroom/docs/23-08/"));
  assert.ok(msc?.sourceUrl.includes("Order%20on%20Initial%20Decision"));
  assert.ok(!msc?.sourceUrl.includes("/.pdf/"), "hidden extension-only .pdf cell is not the filename");
  assert.ok(msc?.sourceUrl.endsWith("/"));
  const aden = listed.find((r) => r.id === ADENARIWO_ID);
  assert.equal(aden?.board, "alj");
  assert.ok(aden?.sourceUrl.includes("2033(I)"));

  const more = discoverProceedingUrls(readFx("listing-excerpt.html"), LISTING_URL);
  assert.ok(more.some((u) => /proceeding\/23-08/i.test(u)), "listing fans out to proceeding pages");
  assert.ok(more.some((u) => /2033\(I\)/i.test(u)));

  assert.ok(isPhmsaTsvKill(readFx("phmsa-raw.tsv")));
  assert.ok(isWordpressCms(readFx("wp-json.json")));
  assert.ok(isFrMirrorBody(readFx("federalregister.html")));
  assert.ok(isFederalRegisterHtml(readFx("federalregister.html")));
  assert.ok(isProceedingHtmlOnly(readFx("proceeding-only.html")));
  assert.ok(!isRealFmcOrderBody(readFx("phmsa-raw.tsv")));
  assert.ok(!isRealFmcOrderBody(readFx("wp-json.json")));
  assert.ok(!isRealFmcOrderBody(readFx("federalregister.html")));
  assert.ok(!isRealFmcOrderBody(readFx("proceeding-only.html")));
  assert.ok(isRealFmcOrderBody(readFx("23-08-131865.txt")));
  assert.ok(isRealFmcOrderBody(readFx("2033-i-136187.txt")));
  assert.ok(isRealFmcOrderBody(readFx("2030-i-136166.txt")));
  assert.ok(isRealFmcOrderBody(readFx("23-02-136277.txt")));
  assert.ok(readFx("23-08-131865.txt").includes(BODY_NEEDLE_NOR));
  assert.ok(readFx("2033-i-136187.txt").includes(BODY_NEEDLE_DEPOSIT));
  assert.ok(readFx("2030-i-136166.txt").includes(BODY_NEEDLE_DEPOT));
  assert.ok(readFx("23-02-136277.txt").includes(BODY_NEEDLE_EMPTY));

  const listingHtml = readFx("listing-excerpt.html");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_NOR), "index HTML is metadata");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_DEPOSIT), "index HTML has no Adenariwo deposit narrative");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_DEPOT), "index HTML has no Gibson depot narrative");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_EMPTY), "index HTML has no BBBY empty-equipment narrative");

  const cacheDir = mkdtempSync(join(tmpdir(), "fmc-orders-"));
  const prevDir = process.env.FMC_ORDERS_DIR;
  process.env.FMC_ORDERS_DIR = cacheDir;
  const snap = await collectFmcOrders({ htmlDir: fixtures, limit: 5, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.FMC_ORDERS_DIR;
  else process.env.FMC_ORDERS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 4, `fixture collect caches official FMC order text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === MSC_ORDER_ID));
  assert.ok(snap.cards.some((c) => c.id === ADENARIWO_ID));
  assert.ok(snap.cards.some((c) => c.id === GIBSON_ID));
  assert.ok(snap.cards.some((c) => c.id === BBBY_ID));
  assert.ok(snap.cards.every((c) => isRealFmcOrderBody(c.body)));
  assert.ok(snap.cards.every((c) => officialFmcPdfUrl(c.sourceUrl)));
  const seedCard = snap.cards.find((c) => c.id === MSC_ORDER_ID);
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_NOR));
  assert.match(seedCard?.institution ?? "", /Mediterranean Shipping/i);

  const assembled = assembleFmcOrdersSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildFmcOrdersManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 4);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; id?: string }[];
  assert.ok(freeCards.every((c) => !c.body), "collector manifest cards omit body");
  assert.ok(filterFmcOrdersManifest(manifest, "adenariwo").cardCount);
  assert.ok(filterFmcOrdersManifest(manifest, "23-08").cardCount);
  assert.ok(parseFmcOrderText(readFx("23-08-131865.txt"), SEED_LISTINGS[0]).body.includes(BODY_NEEDLE_NOR));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
