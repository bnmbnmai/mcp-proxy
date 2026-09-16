import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_BURN,
  BODY_NEEDLE_DAIRY,
  BODY_NEEDLE_SEED,
  CARD_FIELDS,
  JOHNSON_ID,
  JOHNSON_URL,
  LICENSE,
  LISTING_URL,
  MCLAUGHLIN_ID,
  MCLAUGHLIN_URL,
  OALJ_DECISIONS_AMOUNT_ATOMIC,
  OALJ_DECISIONS_MANIFEST_PATH,
  OALJ_DECISIONS_ONE_AMOUNT_ATOMIC,
  OALJ_DECISIONS_PATH,
  PRODUCT_ID,
  SEED_LISTINGS,
  SHEFFIELD_ID,
  SHEFFIELD_URL,
  assembleOaljDecisionsSnapshot,
  buildOaljDecisionsManifest,
  catalogId,
  collectOaljDecisions,
  discoverCaselistUrls,
  filterOaljDecisionsManifest,
  isCaselistHtmlOnly,
  isCourtDecisionBody,
  isFederalRegisterHtml,
  isFrMirrorBody,
  isOflcDisclosureKill,
  isRealOaljDecisionBody,
  keepListing,
  officialOaljPdfUrl,
  parseCaselistHtml,
  parseKind,
  parseOaljDecisionText,
} from "./oalj-decisions.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/oalj-decisions");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(OALJ_DECISIONS_PATH, "/oalj-decisions");
  assert.equal(OALJ_DECISIONS_MANIFEST_PATH, "/oalj-decisions/manifest.json");
  assert.equal(OALJ_DECISIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(OALJ_DECISIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(LISTING_URL.includes("/agencies/oalj/topics/information/DECISIONS"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === MCLAUGHLIN_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === JOHNSON_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === SHEFFIELD_ID));

  assert.equal(officialOaljPdfUrl(MCLAUGHLIN_URL), MCLAUGHLIN_URL);
  assert.equal(officialOaljPdfUrl(` ${JOHNSON_URL} `), JOHNSON_URL);
  assert.equal(officialOaljPdfUrl(SHEFFIELD_URL), SHEFFIELD_URL);
  assert.equal(
    officialOaljPdfUrl("https://www.federalregister.gov/documents/2026/03/11/2026-0010/dol"),
    null,
    "FR HTML is not this bag",
  );
  assert.equal(
    officialOaljPdfUrl("https://www.dol.gov/media/H-2A_Disclosure_Data_FY2026_Q3.xlsx"),
    null,
    "OFLC disclosure XLSX is KILL",
  );
  assert.equal(
    officialOaljPdfUrl(
      "https://www.oalj.dol.gov/PUBLIC/WHISTLEBLOWER/DECISIONS/COURT_DECISIONS/15_14110_HARLEY_MARINE_11TH_CIR_JAN_26_2017.PDF",
    ),
    null,
    "court PDFs are not DOL-authored Decision/Order",
  );
  assert.equal(officialOaljPdfUrl("https://www.dol.gov/sites/dolgov/files/OALJ/OALJ_OrgChart.pdf"), null);
  assert.equal(officialOaljPdfUrl("https://www.oshrc.gov/wp-content/uploads/ALJ-Dec-Finley-Farmers-24-0889-EAJA.pdf"), null);
  assert.equal(officialOaljPdfUrl("https://www.stb.gov/proceedings-actions/decisions/"), null);

  assert.equal(catalogId("2026SPA00001"), "2026-spa-00001");
  assert.equal(catalogId("2026-TLC-8"), "2026-tlc-00008");
  assert.equal(parseKind("Decision and Order Affirming Denial of Certification"), "Decision and Order");
  assert.equal(
    keepListing({
      caseNo: "2026-TLC-00008",
      kind: "Decision and Order",
      title: "Decision and Order Affirming Denial of Certification",
      institution: "Philip Johnson",
      sourceUrl: JOHNSON_URL,
    }),
    true,
  );
  assert.equal(
    keepListing({
      caseNo: "H-2A",
      kind: "Order",
      title: "H-2A Disclosure Data FY2026 Q3",
      institution: "OFLC",
      sourceUrl: "https://www.dol.gov/media/H-2A_Disclosure_Data_FY2026_Q3.xlsx",
    }),
    false,
    "OFLC free disclosure is not this bag",
  );

  const listed = parseCaselistHtml(readFx("listing-excerpt.html"));
  assert.ok(listed.some((r) => r.id === MCLAUGHLIN_ID), `seeds in listing, got ${listed.map((r) => r.id).join(",")}`);
  assert.ok(listed.some((r) => r.id === JOHNSON_ID));
  assert.ok(listed.some((r) => r.id === SHEFFIELD_ID));
  assert.ok(listed.some((r) => r.id === "2026-tlc-00002"), "caselist walker finds decisions beyond scout seeds");
  const johnson = listed.find((r) => r.id === JOHNSON_ID);
  assert.equal(johnson?.board, "balca");
  assert.equal(johnson?.program, "TLC");
  assert.match(johnson?.institution ?? "", /Philip Johnson/i);
  assert.ok(!/^[>,]/.test(johnson?.institution ?? ""), "caselist party is not leftover markup");
  assert.ok(johnson?.sourceUrl.includes("oalj.dol.gov/DECISIONS/ALJ/TLC/"));
  const sheffield = listed.find((r) => r.id === SHEFFIELD_ID);
  assert.equal(sheffield?.board, "arb");
  assert.ok(sheffield?.sourceUrl.includes("/OALJ/PUBLIC/ARB/DECISIONS/"));
  assert.ok(!listed.some((r) => /COURT_DECISIONS/i.test(r.sourceUrl)));
  assert.ok(!listed.some((r) => /\.xlsx/i.test(r.sourceUrl)));

  const moreLists = discoverCaselistUrls(readFx("listing-excerpt.html"), LISTING_URL);
  assert.ok(moreLists.some((u) => /TLC_DECISIONS_FY2025/i.test(u)), "index/caselist pages fan out to other FY lists");

  assert.ok(isOflcDisclosureKill(readFx("oflc-disclosure.csv")));
  assert.ok(isOflcDisclosureKill("https://www.dol.gov/media/H-2A_Disclosure_Data_FY2026_Q3.xlsx"));
  assert.ok(isFederalRegisterHtml(readFx("federalregister.html")));
  assert.ok(isFrMirrorBody(readFx("federalregister.html")));
  assert.ok(isCourtDecisionBody(readFx("court-11th.txt")));
  assert.ok(isCaselistHtmlOnly(readFx("caselist-only.html")));
  assert.ok(!isRealOaljDecisionBody(readFx("oflc-disclosure.csv")));
  assert.ok(!isRealOaljDecisionBody(readFx("federalregister.html")));
  assert.ok(!isRealOaljDecisionBody(readFx("court-11th.txt")));
  assert.ok(!isRealOaljDecisionBody(readFx("caselist-only.html")));
  assert.ok(isRealOaljDecisionBody(readFx("2026-spa-00001.txt")));
  assert.ok(isRealOaljDecisionBody(readFx("2026-tlc-00008.txt")));
  assert.ok(isRealOaljDecisionBody(readFx("2026-0010.txt")));
  assert.ok(readFx("2026-spa-00001.txt").includes(BODY_NEEDLE_SEED));
  assert.ok(readFx("2026-spa-00001.txt").includes(BODY_NEEDLE_BURN));
  assert.ok(readFx("2026-tlc-00008.txt").includes(BODY_NEEDLE_DAIRY));

  const listingHtml = readFx("listing-excerpt.html");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_SEED), "index HTML is metadata");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_BURN), "index HTML has no burn-pile narrative");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_DAIRY), "index HTML has no grassfed-dairy narrative");

  const cacheDir = mkdtempSync(join(tmpdir(), "oalj-decisions-"));
  const prevDir = process.env.OALJ_DECISIONS_DIR;
  process.env.OALJ_DECISIONS_DIR = cacheDir;
  const snap = await collectOaljDecisions({ htmlDir: fixtures, limit: 4, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.OALJ_DECISIONS_DIR;
  else process.env.OALJ_DECISIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 3, `fixture collect caches official Decision/Order text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === MCLAUGHLIN_ID));
  assert.ok(snap.cards.some((c) => c.id === JOHNSON_ID));
  assert.ok(snap.cards.some((c) => c.id === SHEFFIELD_ID));
  assert.ok(
    snap.cards.some((c) => c.id === "2026-tlc-00002"),
    "dry collect finds a caselist decision that is not a scout seed",
  );
  assert.ok(snap.cards.every((c) => isRealOaljDecisionBody(c.body)));
  assert.ok(snap.cards.every((c) => officialOaljPdfUrl(c.sourceUrl)));
  const seedCard = snap.cards.find((c) => c.id === MCLAUGHLIN_ID);
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_SEED));
  assert.match(seedCard?.institution ?? "", /McLaughlin|Troy/i);

  const assembled = assembleOaljDecisionsSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildOaljDecisionsManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 3);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; id?: string }[];
  assert.ok(freeCards.every((c) => !c.body), "collector manifest cards omit body");
  assert.ok(filterOaljDecisionsManifest(manifest, "troy").cardCount);
  assert.ok(filterOaljDecisionsManifest(manifest, "2026-tlc-00008").cardCount);
  assert.ok(parseOaljDecisionText(readFx("2026-spa-00001.txt"), SEED_LISTINGS[0]).body.includes(BODY_NEEDLE_SEED));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
