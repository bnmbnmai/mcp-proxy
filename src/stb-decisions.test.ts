import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_FEE,
  BODY_NEEDLE_SEED,
  CARD_FIELDS,
  DCMS_HOST,
  LICENSE,
  LISTING_URL,
  PRODUCT_ID,
  ROSEBLUFF_ID,
  ROSEBLUFF_URL,
  SEED_LISTINGS,
  STB_DECISIONS_AMOUNT_ATOMIC,
  STB_DECISIONS_MANIFEST_PATH,
  STB_DECISIONS_ONE_AMOUNT_ATOMIC,
  STB_DECISIONS_PATH,
  UPNS_ID,
  UPNS_URL,
  assembleStbDecisionsSnapshot,
  buildStbDecisionsManifest,
  catalogId,
  collectStbDecisions,
  filterStbDecisionsManifest,
  isFederalRegisterHtml,
  isFrMirrorBody,
  isOpenDataKill,
  isRealStbDecisionBody,
  keepListing,
  officialDcmsPdfUrl,
  parseDecisionTableHtml,
  parseKind,
  parseStbDecisionText,
} from "./stb-decisions.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/stb-decisions");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(STB_DECISIONS_PATH, "/stb-decisions");
  assert.equal(STB_DECISIONS_MANIFEST_PATH, "/stb-decisions/manifest.json");
  assert.equal(STB_DECISIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(STB_DECISIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(LISTING_URL.includes("proceedings-actions/decisions"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === ROSEBLUFF_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === UPNS_ID));

  assert.equal(officialDcmsPdfUrl(ROSEBLUFF_URL), ROSEBLUFF_URL);
  assert.equal(officialDcmsPdfUrl(` ${UPNS_URL} `), UPNS_URL);
  assert.equal(
    officialDcmsPdfUrl("https://www.federalregister.gov/documents/2026/05/28/2026-12345/stb"),
    null,
    "FR HTML is not this bag",
  );
  assert.equal(
    officialDcmsPdfUrl("https://www.stb.gov/wp-content/uploads/Jan-16-2026-STB-Decision-in-UP-NS-Merger-FD-36873.pdf"),
    null,
    "WordPress mirrors are not DCMS",
  );
  assert.equal(officialDcmsPdfUrl("https://example.com/52932.pdf"), null);

  assert.equal(catalogId("52932", "FD_32760_46", "16"), "52932");
  assert.equal(parseKind("Decision"), "Board Decision");
  assert.equal(
    keepListing({
      decisionId: "53227",
      decisionNo: "",
      docket: "FD-36951",
      decisionType: "Notice of Exemption",
      decidingBody: "Chief Counsel, Office of Chief Counsel",
      title: "Fortress",
      summary: "",
      sourceUrl: "https://dcms-external.s3.amazonaws.com/DCMS_External_PROD/1789137002791/53227.pdf",
    }),
    false,
    "Notice of Exemption is not a Board Decision bag",
  );
  assert.equal(
    keepListing({
      decisionId: ROSEBLUFF_ID,
      decisionNo: "16",
      docket: "FD-32760-46",
      decisionType: "Decision",
      decidingBody: "Entire Board",
      title: "BNSF Rosebluff",
      summary: "Decision No. 16",
      sourceUrl: ROSEBLUFF_URL,
    }),
    true,
  );
  assert.equal(
    keepListing({
      decisionId: "53052",
      decisionNo: "21",
      docket: "FD-36873",
      decisionType: "Decision",
      decidingBody: "Entire Board",
      title: "Notice of Acceptance of Application",
      summary: "AGENCY: Surface Transportation Board. ACTION: Notice. SUMMARY: FR-mirrored Decision No. 21.",
      sourceUrl: "https://dcms-external.s3.amazonaws.com/DCMS_External_PROD/1779972242620/53052.pdf",
    }),
    false,
    "FR-mirrored Decision Nos. 21/30 class is not this bag",
  );

  const listed = parseDecisionTableHtml(readFx("listing-excerpt.html"));
  assert.ok(listed.some((r) => r.id === ROSEBLUFF_ID), `seeds in listing, got ${listed.map((r) => r.id).join(",")}`);
  assert.ok(listed.some((r) => r.id === UPNS_ID));
  const rose = listed.find((r) => r.id === ROSEBLUFF_ID);
  assert.equal(rose?.docket, "FD-32760-46");
  assert.equal(rose?.decisionType, "Decision");
  assert.equal(rose?.decidingBody, "Entire Board");
  assert.ok(rose?.sourceUrl.includes(DCMS_HOST));
  assert.ok(!listed.some((r) => r.decisionType === "Notice of Exemption"));

  assert.ok(isFrMirrorBody(readFx("fr-mirror-21.txt")));
  assert.ok(isFederalRegisterHtml(readFx("federalregister.html")));
  assert.ok(isOpenDataKill(readFx("open-data.csv")));
  assert.ok(isOpenDataKill("EP 724 weekly performance metrics"));
  assert.ok(!isRealStbDecisionBody(readFx("fr-mirror-21.txt")));
  assert.ok(!isRealStbDecisionBody(readFx("notice-of-exemption.txt")));
  assert.ok(!isRealStbDecisionBody(readFx("federalregister.html")));
  assert.ok(isRealStbDecisionBody(readFx("52932.txt")));
  assert.ok(isRealStbDecisionBody(readFx("52877.txt")));
  assert.ok(readFx("52932.txt").includes(BODY_NEEDLE_SEED));
  assert.ok(readFx("52932.txt").includes(BODY_NEEDLE_FEE));
  assert.match(readFx("52877.txt"), /Decision No\.\s*9/);
  assert.match(readFx("52877.txt"), /reject the application/i);

  const listingHtml = readFx("listing-excerpt.html");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_SEED), "index HTML is metadata");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_FEE), "index HTML has no $9.90 fee narrative");
  assert.ok(!listingHtml.includes("must reject the application"), "index HTML has no Decision 9 narrative");

  const cacheDir = mkdtempSync(join(tmpdir(), "stb-decisions-"));
  const prevDir = process.env.STB_DECISIONS_DIR;
  process.env.STB_DECISIONS_DIR = cacheDir;
  const snap = await collectStbDecisions({ htmlDir: fixtures, limit: 4, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.STB_DECISIONS_DIR;
  else process.env.STB_DECISIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 2, `fixture collect caches official Board text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === ROSEBLUFF_ID));
  assert.ok(snap.cards.some((c) => c.id === UPNS_ID));
  assert.ok(snap.cards.every((c) => isRealStbDecisionBody(c.body)));
  assert.ok(snap.cards.every((c) => c.sourceUrl.includes(DCMS_HOST)));
  const seedCard = snap.cards.find((c) => c.id === ROSEBLUFF_ID);
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_SEED));
  assert.match(seedCard?.institution ?? "", /BNSF/i);

  const assembled = assembleStbDecisionsSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildStbDecisionsManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 2);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; id?: string }[];
  assert.ok(freeCards.every((c) => !c.body), "collector manifest cards omit body");
  assert.ok(filterStbDecisionsManifest(manifest, "bnsf").cardCount);
  assert.ok(filterStbDecisionsManifest(manifest, "52932").cardCount);
  assert.ok(parseStbDecisionText(readFx("52932.txt"), SEED_LISTINGS[0]).body.includes(BODY_NEEDLE_SEED));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
