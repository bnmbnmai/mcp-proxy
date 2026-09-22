import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_CP,
  BODY_NEEDLE_RW,
  BODY_NEEDLE_SS,
  CARD_FIELDS,
  CP_ID,
  CP_URL,
  ECAB_DECISIONS_AMOUNT_ATOMIC,
  ECAB_DECISIONS_MANIFEST_PATH,
  ECAB_DECISIONS_ONE_AMOUNT_ATOMIC,
  ECAB_DECISIONS_PATH,
  LICENSE,
  LISTING_URL,
  PRODUCT_ID,
  RW_ID,
  RW_URL,
  SEED_LISTINGS,
  SS_ID,
  SS_URL,
  assembleEcabDecisionsSnapshot,
  buildEcabDecisionsManifest,
  discoverMonthPageUrls,
  keepEcabMonthIndex,
  filterEcabDecisionsManifest,
  isAb1Form,
  isFeePetition,
  isHtmlDecision,
  isIndexHtml,
  isJsonFullText,
  isOrderSlip,
  isRealEcabDecisionBody,
  keepListing,
  officialEcabPdfUrl,
  parseEcabDecisionText,
  parseEcabDecisionsHtml,
  parseParties,
  collectEcabDecisions,
} from "./ecab-decisions.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ecab-decisions");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(ECAB_DECISIONS_PATH, "/ecab-decisions");
  assert.equal(ECAB_DECISIONS_MANIFEST_PATH, "/ecab-decisions/manifest.json");
  assert.equal(ECAB_DECISIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(ECAB_DECISIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(LISTING_URL.includes("/agencies/ecab/decisions"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === CP_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === SS_ID));
  assert.equal(SEED_LISTINGS.some((r) => r.id === RW_ID), false, "24-0755 is a listing row, not a frozen seed");

  assert.equal(officialEcabPdfUrl(CP_URL), CP_URL);
  assert.equal(officialEcabPdfUrl(` ${SS_URL} `), SS_URL);
  assert.equal(officialEcabPdfUrl(RW_URL), RW_URL);
  assert.equal(
    officialEcabPdfUrl("https://www.dol.gov/sites/dolgov/files/ecab/decisions/2026/AUG/26-0527_O.pdf"),
    null,
    "order slips are not Decision and Order PDFs",
  );
  assert.equal(
    officialEcabPdfUrl("https://www.dol.gov/sites/dolgov/files/ecab/decisions/fee_petition_orders/13-0233_Granted.pdf"),
    null,
    "fee petitions are not this bag",
  );
  assert.equal(officialEcabPdfUrl("https://www.dol.gov/sites/dolgov/files/ecab/ab-1.pdf"), null, "AB-1 is a form");
  assert.equal(officialEcabPdfUrl("https://www.dol.gov/agencies/ecab/decisions/2026/July"), null, "month index is not the PDF");
  assert.equal(officialEcabPdfUrl("https://www.dol.gov/agencies/ecab/decisions/2026/Jul"), null);
  assert.equal(
    officialEcabPdfUrl("https://www.oalj.dol.gov/DECISIONS/ALJ/SPA/2026/McLaughlin_v_Troy.pdf"),
    null,
    "OALJ slips are not ECAB",
  );

  assert.equal(
    keepListing({
      citation: "Docket No. 26-0528",
      docket: "26-0528",
      kind: "Decision and Order",
      title: "Docket No. 26-0528",
      institution: "C.P. and U.S. POSTAL SERVICE",
      sourceUrl: CP_URL,
    }),
    true,
  );
  assert.equal(
    keepListing({
      citation: "Docket No. 26-0527",
      docket: "26-0527",
      kind: "Decision and Order",
      title: "Order",
      institution: "S.W. and U.S. POSTAL SERVICE",
      sourceUrl: "https://www.dol.gov/sites/dolgov/files/ecab/decisions/2026/AUG/26-0527_O.pdf",
    }),
    false,
  );

  const listing = readFx("listing-excerpt.html");
  const listed = parseEcabDecisionsHtml(listing);
  assert.ok(listed.some((r) => r.id === CP_ID), `seeds in listing, got ${listed.map((r) => r.id).join(",")}`);
  assert.ok(listed.some((r) => r.id === SS_ID));
  assert.ok(listed.some((r) => r.id === RW_ID), "listing walker finds a Decision and Order beyond the scout seeds");
  assert.ok(!listed.some((r) => r.id.includes("_o") || /_O/.test(r.documentId)));
  assert.ok(!listed.some((r) => /fee_petition|ab-1/i.test(r.sourceUrl)));
  const cp = listed.find((r) => r.id === CP_ID);
  assert.equal(cp?.docket, "26-0528");
  assert.equal(cp?.date, "2026-08-27");
  assert.match(cp?.institution ?? "", /POSTAL SERVICE/i);
  assert.equal(cp?.sourceUrl, CP_URL);
  assert.equal(cp?.documentId, "26-0528.pdf");
  assert.ok(!listing.includes(BODY_NEEDLE_CP), "index is captions");
  assert.ok(!listing.includes(BODY_NEEDLE_SS));
  assert.ok(!listing.includes(BODY_NEEDLE_RW));

  const hub = readFx("hub-excerpt.html");
  const months = discoverMonthPageUrls(hub, LISTING_URL);
  assert.deepEqual(months, [
    "https://www.dol.gov/agencies/ecab/decisions/2026/Aug",
    "https://www.dol.gov/agencies/ecab/decisions/2026/July",
    "https://www.dol.gov/agencies/ecab/decisions/1998/Jul",
    "https://www.dol.gov/agencies/ecab/decisions/1998/Apr",
  ]);
  assert.ok(!months.some((u) => /\/2026\/Jul$/.test(u)), "2026 July folder is spelled July; /Jul is 404");
  assert.ok(!months.some((u) => /\/2026\/August$/.test(u)), "August index is Aug, not August");
  assert.equal(keepEcabMonthIndex(2026, "July"), true);
  assert.equal(keepEcabMonthIndex(2026, "Jul"), false);
  assert.equal(keepEcabMonthIndex(1998, "Jul"), true);
  assert.equal(keepEcabMonthIndex(2026, "Aug"), true);

  assert.ok(isOrderSlip(readFx("order-remand.txt")));
  assert.ok(isAb1Form(readFx("ab-1.txt")));
  assert.ok(isFeePetition("In the Matter of M.S. fee_petition_orders"));
  assert.ok(isHtmlDecision(readFx("html-decision.html")));
  assert.ok(isIndexHtml(listing));
  assert.ok(isJsonFullText(readFx("json-fulltext.json")));
  assert.ok(!isRealEcabDecisionBody(readFx("order-remand.txt")));
  assert.ok(!isRealEcabDecisionBody(readFx("ab-1.txt")));
  assert.ok(!isRealEcabDecisionBody(readFx("html-decision.html")));
  assert.ok(!isRealEcabDecisionBody(listing));
  assert.ok(!isRealEcabDecisionBody(readFx("json-fulltext.json")));
  assert.ok(isRealEcabDecisionBody(readFx("26-0528.txt"), "26-0528"));
  assert.ok(isRealEcabDecisionBody(readFx("26-0526.txt"), "26-0526"));
  assert.ok(isRealEcabDecisionBody(readFx("24-0755.txt"), "24-0755"));
  assert.ok(readFx("26-0528.txt").includes(BODY_NEEDLE_CP));
  assert.ok(readFx("26-0526.txt").includes(BODY_NEEDLE_SS));
  assert.ok(readFx("24-0755.txt").includes(BODY_NEEDLE_RW));
  assert.match(parseParties(readFx("26-0528.txt")), /^C\.P\. and U\.S\. POSTAL SERVICE, GERMANTOWN POST OFFICE, Philadelphia, PA$/);
  assert.ok(!parseParties(readFx("26-0528.txt")).includes("United States Department of Labor"));
  assert.match(parseParties(readFx("24-0755.txt")), /Timberlake, NC/);
  assert.match(parseParties(readFx("26-0526.txt")), /Tomah, WI/);

  const cacheDir = mkdtempSync(join(tmpdir(), "ecab-decisions-"));
  const prevDir = process.env.ECAB_DECISIONS_DIR;
  process.env.ECAB_DECISIONS_DIR = cacheDir;
  const snap = await collectEcabDecisions({ htmlDir: fixtures, limit: 7, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.ECAB_DECISIONS_DIR;
  else process.env.ECAB_DECISIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 3, `fixture collect caches official Decision text, got ${snap.cards.length}`);
  assert.equal(snap.fetchedPdfs, 0);
  assert.equal(snap.asOf, "2026-08-27");
  assert.ok(snap.cards.some((c) => c.id === CP_ID));
  assert.ok(snap.cards.some((c) => c.id === SS_ID));
  assert.ok(snap.cards.some((c) => c.id === RW_ID), "dry collect finds a Decision and Order that is not a scout seed");
  assert.ok(snap.cards.every((c) => isRealEcabDecisionBody(c.body, c.docket)));
  assert.ok(snap.cards.every((c) => officialEcabPdfUrl(c.sourceUrl)));
  const seedCard = snap.cards.find((c) => c.id === CP_ID);
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_CP));
  assert.match(seedCard?.institution ?? "", /GERMANTOWN POST OFFICE, Philadelphia, PA/);
  assert.equal(seedCard?.kind, "Decision and Order");
  assert.equal(snap.cards.find((c) => c.id === RW_ID)?.docket, "24-0755");
  assert.match(snap.cards.find((c) => c.id === RW_ID)?.institution ?? "", /TIMBERLAKE POST OFFICE/);

  const assembled = assembleEcabDecisionsSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildEcabDecisionsManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 3);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; id?: string }[];
  assert.ok(freeCards.every((c) => !c.body), "collector manifest cards omit body");
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes("/sites/dolgov/files/ecab/"), "free manifest has no decision PDF deep link");
  assert.ok(!manifestJson.includes(BODY_NEEDLE_CP));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_SS));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_RW));
  assert.ok(freeCards.every((c) => !c.sourceUrl), "collector manifest cards omit sourceUrl");
  assert.ok(filterEcabDecisionsManifest(manifest, "germantown").cardCount);
  assert.ok(filterEcabDecisionsManifest(manifest, "24-0755").cardCount);
  assert.ok(parseEcabDecisionText(readFx("26-0528.txt"), SEED_LISTINGS[0]).body.includes(BODY_NEEDLE_CP));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
