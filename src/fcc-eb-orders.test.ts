import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_BT,
  BODY_NEEDLE_JP,
  BODY_NEEDLE_SG,
  BODY_NEEDLE_VZ,
  BT_ID,
  BT_URL,
  CARD_FIELDS,
  FCC_EB_ORDERS_AMOUNT_ATOMIC,
  FCC_EB_ORDERS_MANIFEST_PATH,
  FCC_EB_ORDERS_ONE_AMOUNT_ATOMIC,
  FCC_EB_ORDERS_PATH,
  JP_ID,
  JP_URL,
  LICENSE,
  LISTING_URL,
  PRODUCT_ID,
  SEED_LISTINGS,
  SG_ID,
  SG_URL,
  VZ_ID,
  VZ_URL,
  assembleFccEbOrdersSnapshot,
  buildFccEbOrdersManifest,
  bureauFromWindow,
  collectFccEbOrders,
  discoverDigestUrls,
  filterFccEbOrdersManifest,
  isDigestIndex,
  isEbBureau,
  isHtmlOrder,
  isJsonFullText,
  isRealFccEbOrderBody,
  keepListing,
  kindFromBlurb,
  officialFccEbPdfUrl,
  parseFccEbDigest,
  parseFccEbOrderText,
} from "./fcc-eb-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fcc-eb-orders");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(FCC_EB_ORDERS_PATH, "/fcc-eb-orders");
  assert.equal(FCC_EB_ORDERS_MANIFEST_PATH, "/fcc-eb-orders/manifest.json");
  assert.equal(FCC_EB_ORDERS_AMOUNT_ATOMIC, "50000");
  assert.equal(FCC_EB_ORDERS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(LISTING_URL.includes("/edocs/daily-digest"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === VZ_ID));
  assert.ok(SEED_LISTINGS.some((row) => row.id === BT_ID));
  assert.equal(SEED_LISTINGS.some((row) => row.id === JP_ID), false, "DA-26-987 is a digest row, not a frozen seed");
  assert.equal(SEED_LISTINGS.some((row) => row.id === SG_ID), false, "DA-26-954 is a digest row, not a frozen seed");

  assert.equal(officialFccEbPdfUrl(VZ_URL), VZ_URL);
  assert.equal(officialFccEbPdfUrl(` ${BT_URL} `), BT_URL);
  assert.equal(officialFccEbPdfUrl(JP_URL), JP_URL);
  assert.equal(officialFccEbPdfUrl(SG_URL), SG_URL);
  assert.equal(officialFccEbPdfUrl("https://docs.fcc.gov/public/attachments/DA-26-1006A1.txt"), null, "txt sibling is not the PDF");
  assert.equal(officialFccEbPdfUrl("https://docs.fcc.gov/public/attachments/DA-26-1006A1.docx"), null);
  assert.equal(officialFccEbPdfUrl("https://docs.fcc.gov/public/attachments/DA-26-1006A2.pdf"), null, "A2 is not the order slip");
  assert.equal(officialFccEbPdfUrl("https://docs.fcc.gov/public/attachments/DOC-425157A1.pdf"), null, "DOC public notices are not EB orders");
  assert.equal(officialFccEbPdfUrl("https://www.fcc.gov/edocs/daily-digest/2026/09/18"), null, "digest page is not the PDF");
  assert.equal(officialFccEbPdfUrl("https://www.fcc.gov/document/eb-issues-final-determination-order-against-belthrough-llc"), null);

  assert.equal(isEbBureau(["EB"]), true);
  assert.equal(isEbBureau(["MB"]), false);
  assert.equal(isEbBureau(["SB"]), false);
  assert.equal(isEbBureau(["PSHSB"]), false);
  assert.equal(isEbBureau(["OMR", "PSHSB"]), false, "joint public-safety rows are not EB-only");
  assert.equal(isEbBureau(bureauFromWindow("by NOV. (DA No. 26-1006). EB.")), true);
  assert.equal(isEbBureau(bureauFromWindow("(DA No. 26-1002). SB. Contact: ICFSinfo@fcc.gov.")), false);
  assert.equal(isEbBureau(bureauFromWindow("ACTIONS. MB.")), false);
  assert.equal(isEbBureau(bureauFromWindow("(DA No. 26-990). OMR PSHSB.")), false);

  assert.equal(kindFromBlurb("by NOV. (DA No. 26-1006). EB."), "Notice of Violation");
  assert.equal(kindFromBlurb("Final Determination Order against Belthrough. by ORDER. (DA No. 26-237). EB."), "Final Determination Order");
  assert.equal(kindFromBlurb("by NIPRB. (DA No. 26-987). EB."), "Notice of Illegal Pirate Radio Broadcasting");
  assert.equal(kindFromBlurb("by Consent Decree. (DA No. 26-954). EB."), "Consent Decree");
  assert.equal(kindFromBlurb("ENFORCEMENT BUREAU ANNOUNCES A PUBLIC WORKSHOP. EB."), null);

  const listing = readFx("listing-excerpt.html");
  const listed = parseFccEbDigest(listing);
  assert.ok(listed.some((row) => row.id === VZ_ID), `NOV in listing, got ${listed.map((row) => row.id).join(",")}`);
  assert.ok(listed.some((row) => row.id === BT_ID));
  assert.ok(listed.some((row) => row.id === JP_ID), "listing walker finds an EB notice beyond the scout seeds");
  assert.ok(listed.some((row) => row.id === SG_ID), "listing walker finds the Satcom consent decree");
  assert.ok(listed.some((row) => row.id === "DA-26-981"), "same-day NIPRB beyond the scout pair is listed");
  assert.ok(!listed.some((row) => row.id === "DA-26-1002"), "satellite SB row is not an EB order");
  assert.ok(!listed.some((row) => row.id === "DA-26-996"), "public-safety row is not an EB order");
  assert.ok(!listed.some((row) => row.id === "DA-26-990"), "joint PSHSB row is not an EB order");
  assert.ok(!listed.some((row) => row.id === "DA-26-985"), "space bureau transfer is not an EB order");
  assert.ok(!listed.some((row) => row.id === "DA-26-235"), "media bureau order is not an EB order");
  assert.ok(!listed.some((row) => /DOC-/.test(row.documentId)));
  assert.ok(!listed.some((row) => row.id === "DA-26-1008"), "EB workshop announcement is not an order");
  const vz = listed.find((row) => row.id === VZ_ID);
  assert.equal(vz?.kind, "Notice of Violation");
  assert.equal(vz?.date, "2026-09-18");
  assert.match(vz?.institution ?? "", /VAZQUEZ BROADCASTING/i);
  assert.equal(vz?.sourceUrl, VZ_URL);
  assert.equal(vz?.documentId, "DA-26-1006A1.pdf");
  assert.equal(listed.find((row) => row.id === BT_ID)?.date, "2026-03-12");
  assert.equal(listed.find((row) => row.id === BT_ID)?.kind, "Final Determination Order");
  assert.equal(listed.find((row) => row.id === JP_ID)?.date, "2026-09-16");
  assert.equal(listed.find((row) => row.id === SG_ID)?.date, "2026-09-14");
  assert.equal(listed.find((row) => row.id === SG_ID)?.kind, "Consent Decree");
  assert.ok(!listing.includes(BODY_NEEDLE_VZ), "digest is captions");
  assert.ok(!listing.includes(BODY_NEEDLE_BT));
  assert.ok(!listing.includes(BODY_NEEDLE_JP));
  assert.ok(!listing.includes(BODY_NEEDLE_SG));

  const bare = parseFccEbDigest(
    "JOSEPH PACIUS AND MYRIAM PIERREVILUS; LAKE WORTH, FLORIDA. Notice of Illegal Pirate Radio Broadcasting. by NIPRB. (DA No. 26-987). EB. DA-26-987A1.pdf",
    "https://www.fcc.gov/edocs/daily-digest/2026/09/16",
  );
  assert.equal(bare[0]?.date, "2026-09-16", "a digest row with no Released line takes the day URL");
  assert.equal(bare[0]?.sourceUrl, JP_URL);

  const months = discoverDigestUrls(readFx("hub-excerpt.html"), LISTING_URL);
  assert.deepEqual(months, [
    "https://www.fcc.gov/edocs/daily-digest/2026/09/18",
    "https://www.fcc.gov/edocs/daily-digest/2026/09/16",
    "https://www.fcc.gov/edocs/daily-digest/2026/09/15",
    "https://www.fcc.gov/edocs/daily-digest/2026/03/13",
  ]);

  assert.ok(isHtmlOrder(readFx("html-order.html")));
  assert.ok(isJsonFullText(readFx("json-fulltext.json")));
  assert.ok(isDigestIndex(listing));
  assert.ok(!isRealFccEbOrderBody(readFx("media-order.txt")));
  assert.ok(!isRealFccEbOrderBody(readFx("html-order.html")));
  assert.ok(!isRealFccEbOrderBody(listing));
  assert.ok(!isRealFccEbOrderBody(readFx("json-fulltext.json")));
  assert.ok(isRealFccEbOrderBody(readFx("DA-26-1006.txt"), VZ_ID));
  assert.ok(isRealFccEbOrderBody(readFx("DA-26-237.txt"), BT_ID));
  assert.ok(isRealFccEbOrderBody(readFx("DA-26-987.txt"), JP_ID));
  assert.equal(
    kindFromBlurb(readFx("DA-26-987.txt")),
    "Notice of Illegal Pirate Radio Broadcasting",
    "wrapped NOTICE OF ILLEGAL / PIRATE RADIO title is still a NIPRB",
  );
  assert.ok(isRealFccEbOrderBody(readFx("DA-26-954.txt"), SG_ID));
  assert.ok(readFx("DA-26-1006.txt").includes(BODY_NEEDLE_VZ));
  assert.ok(readFx("DA-26-237.txt").includes(BODY_NEEDLE_BT));
  assert.ok(readFx("DA-26-987.txt").includes(BODY_NEEDLE_JP));
  assert.ok(readFx("DA-26-954.txt").includes(BODY_NEEDLE_SG));
  assert.ok(!readFx("DA-26-987.txt").includes("Westfall"));

  assert.equal(
    keepListing({
      id: VZ_ID,
      kind: "Notice of Violation",
      title: "DA 26-1006",
      institution: "Vazquez Broadcasting Corporation",
      sourceUrl: VZ_URL,
    }),
    true,
  );
  assert.equal(
    keepListing({
      id: "DA-26-1002",
      kind: "Order",
      title: "Satellite",
      institution: "Space Bureau",
      sourceUrl: "https://docs.fcc.gov/public/attachments/DA-26-1002A1.pdf",
    }),
    true,
  );
  assert.equal(
    keepListing({
      id: "DOC-425157",
      kind: "Order",
      title: "Media",
      institution: "Media Bureau",
      sourceUrl: "https://docs.fcc.gov/public/attachments/DOC-425157A1.pdf",
    }),
    false,
  );

  const cacheDir = mkdtempSync(join(tmpdir(), "fcc-eb-orders-"));
  const prevDir = process.env.FCC_EB_ORDERS_DIR;
  process.env.FCC_EB_ORDERS_DIR = cacheDir;
  const snap = await collectFccEbOrders({ htmlDir: fixtures, limit: 7, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.FCC_EB_ORDERS_DIR;
  else process.env.FCC_EB_ORDERS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 4, `fixture collect caches official order text, got ${snap.cards.length}`);
  assert.equal(snap.fetchedPdfs, 0);
  assert.equal(snap.asOf, "2026-09-18");
  assert.ok(snap.cards.some((card) => card.id === VZ_ID));
  assert.ok(snap.cards.some((card) => card.id === BT_ID));
  assert.ok(snap.cards.some((card) => card.id === JP_ID), "dry collect finds an EB notice that is not a scout seed");
  assert.ok(snap.cards.some((card) => card.id === SG_ID));
  assert.ok(!snap.cards.some((card) => card.id === "DA-26-1002"));
  assert.ok(!snap.cards.some((card) => card.id === "DA-26-996"));
  assert.ok(snap.cards.every((card) => isRealFccEbOrderBody(card.body, card.id)));
  assert.ok(snap.cards.every((card) => officialFccEbPdfUrl(card.sourceUrl)));
  const seedCard = snap.cards.find((card) => card.id === VZ_ID);
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_VZ));
  assert.match(seedCard?.institution ?? "", /Vazquez Broadcasting/i);
  assert.equal(seedCard?.kind, "Notice of Violation");
  assert.match(seedCard?.docket ?? "", /EB-FIELDNER-24-00037648/);
  assert.equal(snap.cards.find((card) => card.id === BT_ID)?.kind, "Final Determination Order");
  assert.match(snap.cards.find((card) => card.id === BT_ID)?.institution ?? "", /Belthrough/);
  assert.match(snap.cards.find((card) => card.id === JP_ID)?.institution ?? "", /Pacius/);
  assert.match(snap.cards.find((card) => card.id === SG_ID)?.institution ?? "", /Satcom/);

  const assembled = assembleFccEbOrdersSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildFccEbOrdersManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 4);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; id?: string }[];
  assert.ok(freeCards.every((card) => !card.body), "collector manifest cards omit body");
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes("docs.fcc.gov"), "free manifest has no docs.fcc.gov deep link");
  assert.ok(!manifestJson.includes(BODY_NEEDLE_VZ));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_BT));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_JP));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_SG));
  assert.ok(freeCards.every((card) => !card.sourceUrl), "collector manifest cards omit sourceUrl");
  assert.ok(filterFccEbOrdersManifest(manifest, "vazquez").cardCount);
  assert.ok(filterFccEbOrdersManifest(manifest, "belthrough").cardCount);
  assert.ok(filterFccEbOrdersManifest(manifest, JP_ID).cardCount);
  assert.ok(parseFccEbOrderText(readFx("DA-26-1006.txt"), SEED_LISTINGS[0]).body.includes(BODY_NEEDLE_VZ));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
