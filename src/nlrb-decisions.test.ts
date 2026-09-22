import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_BOLDT,
  BODY_NEEDLE_NEXSTAR,
  BODY_NEEDLE_SNOWFLAKE,
  BOLDT_ID,
  BOLDT_URL,
  CARD_FIELDS,
  LICENSE,
  LISTING_URL,
  NEXSTAR_ID,
  NEXSTAR_URL,
  NLRB_DECISIONS_AMOUNT_ATOMIC,
  NLRB_DECISIONS_MANIFEST_PATH,
  NLRB_DECISIONS_ONE_AMOUNT_ATOMIC,
  NLRB_DECISIONS_PATH,
  PRODUCT_ID,
  SEED_LISTINGS,
  SNOWFLAKE_ID,
  SNOWFLAKE_URL,
  SORT_URL,
  assembleNlrbDecisionsSnapshot,
  buildNlrbDecisionsManifest,
  catalogIdFromCitation,
  collectNlrbDecisions,
  discoverSortPageUrls,
  filterNlrbDecisionsManifest,
  isAljOnly,
  isCiteNet,
  isFederalRegisterHtml,
  isFrMirrorBody,
  isMspbLeak,
  isRealNlrbDecisionBody,
  isWeeklySummary,
  keepListing,
  officialNlrbPdfUrl,
  parseBoardDecisionsHtml,
  parseCitation,
  parseKind,
  parseNlrbDecisionText,
} from "./nlrb-decisions.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/nlrb-decisions");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(NLRB_DECISIONS_PATH, "/nlrb-decisions");
  assert.equal(NLRB_DECISIONS_MANIFEST_PATH, "/nlrb-decisions/manifest.json");
  assert.equal(NLRB_DECISIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(NLRB_DECISIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(LISTING_URL.includes("/cases-decisions/decisions/board-decisions"));
  assert.ok(SORT_URL.includes("/sort-case-decisions-bd/date_issued+desc/"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === NEXSTAR_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === SNOWFLAKE_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === BOLDT_ID));

  assert.equal(officialNlrbPdfUrl(NEXSTAR_URL), NEXSTAR_URL);
  assert.equal(officialNlrbPdfUrl(` ${SNOWFLAKE_URL} `), SNOWFLAKE_URL);
  assert.equal(officialNlrbPdfUrl(BOLDT_URL), BOLDT_URL);
  assert.equal(officialNlrbPdfUrl("https://citenet.nlrb.gov"), null, "CiteNet is not the PDF host");
  assert.equal(
    officialNlrbPdfUrl("https://www.nlrb.gov/reports/nlrb-case-decisions/weekly-summaries"),
    null,
    "weekly summaries are not this bag",
  );
  assert.equal(officialNlrbPdfUrl("https://www.federalregister.gov/documents/2026/09/17/nlrb"), null);
  assert.equal(officialNlrbPdfUrl("https://www.mspb.gov/decisions/precdec.htm"), null);
  assert.equal(officialNlrbPdfUrl("https://www.flra.gov/decisions"), null, "FLRA stays queued");
  assert.equal(parseCitation("375 NLRB No. 40"), "375 NLRB No. 40");
  assert.equal(catalogIdFromCitation("375 NLRB No. 40"), NEXSTAR_ID);
  assert.equal(parseKind("DECISION AND ORDER QUASHING NOTICE OF HEARING"), "Decision and Order Quashing Notice of Hearing");

  assert.equal(
    keepListing({
      citation: "375 NLRB No. 40",
      caseNo: "05-CA-367812",
      kind: "Decision and Order",
      title: "375 NLRB No. 40",
      institution: "Nexstar Media Corporation d/b/a NewsNation",
      sourceUrl: NEXSTAR_URL,
    }),
    true,
  );
  assert.equal(
    keepListing({
      citation: "Weekly Summary",
      caseNo: "weekly",
      kind: "Board Decision",
      title: "Weekly Summary of NLRB Cases",
      institution: "NLRB",
      sourceUrl: "https://www.nlrb.gov/reports/nlrb-case-decisions/weekly-summaries",
    }),
    false,
    "weekly summaries are not this bag",
  );
  assert.equal(
    keepListing({
      citation: "JD-40-26",
      caseNo: "01-CA-000001",
      kind: "Board Decision",
      title: "ALJ Decision only",
      institution: "ALJ Decision only",
      sourceUrl: "https://apps.nlrb.gov/link/document.aspx/aaaaaaaaaaaaaaaa",
    }),
    false,
    "ALJ-only slips are not the Board Decision SKU",
  );

  const listed = parseBoardDecisionsHtml(readFx("listing-excerpt.json"));
  const textareaListed = parseBoardDecisionsHtml(`<textarea>${readFx("listing-excerpt.json")}</textarea>`);
  assert.ok(listed.some((r) => r.id === NEXSTAR_ID), `seeds in listing, got ${listed.map((r) => r.id).join(",")}`);
  assert.ok(
    textareaListed.some((r) => r.id === "375-nlrb-no-35"),
    "textarea-wrapped Drupal AJAX still parses a Board Decision beyond the scout seeds",
  );
  assert.ok(listed.some((r) => r.id === SNOWFLAKE_ID));
  assert.ok(listed.some((r) => r.id === BOLDT_ID));
  assert.ok(listed.some((r) => r.id === "375-nlrb-no-35"), "AJAX walker finds a Board Decision beyond the three scout seeds");
  const nexstar = listed.find((r) => r.id === NEXSTAR_ID);
  assert.equal(nexstar?.caseNo, "05-CA-367812");
  assert.equal(nexstar?.date, "2026-09-17");
  assert.match(nexstar?.institution ?? "", /Nexstar/i);
  assert.equal(nexstar?.sourceUrl, NEXSTAR_URL);
  const boldt = listed.find((r) => r.id === BOLDT_ID);
  assert.equal(boldt?.caseNo, "18-CD-352973");
  assert.match(boldt?.institution ?? "", /Boldt/i);
  assert.ok(!listed.some((r) => /citenet/i.test(r.sourceUrl)));
  assert.ok(!listed.some((r) => /weekly-summaries/i.test(r.sourceUrl)));
  assert.ok(!listed.some((r) => r.citation.startsWith("JD-")));

  const pages = discoverSortPageUrls(readFx("listing-excerpt.html"), SORT_URL);
  assert.ok(pages.some((u) => /sort-case-decisions-bd\/.+\?page=1/.test(u)), "sort feed paginates");

  assert.ok(isWeeklySummary(readFx("weekly-summary.html")));
  assert.ok(isCiteNet(readFx("listing-excerpt.html")));
  assert.ok(isFederalRegisterHtml(readFx("federalregister.html")));
  assert.ok(isFrMirrorBody(readFx("federalregister.html")));
  assert.ok(isMspbLeak(readFx("mspb-manifest.json")));
  assert.ok(isAljOnly(readFx("alj-only.txt")));
  assert.ok(!isRealNlrbDecisionBody(readFx("weekly-summary.html")));
  assert.ok(!isRealNlrbDecisionBody(readFx("federalregister.html")));
  assert.ok(!isRealNlrbDecisionBody(readFx("mspb-manifest.json")));
  assert.ok(!isRealNlrbDecisionBody(readFx("alj-only.txt")));
  assert.ok(!isRealNlrbDecisionBody(readFx("listing-excerpt.html")));
  assert.ok(isRealNlrbDecisionBody(readFx("375-nlrb-no-40.txt")));
  assert.ok(isRealNlrbDecisionBody(readFx("375-nlrb-no-39.txt")));
  assert.ok(isRealNlrbDecisionBody(readFx("375-nlrb-no-38.txt")));
  assert.ok(isRealNlrbDecisionBody(readFx("375-nlrb-no-35.txt")));
  assert.ok(readFx("375-nlrb-no-40.txt").includes(BODY_NEEDLE_NEXSTAR));
  assert.ok(readFx("375-nlrb-no-39.txt").includes(BODY_NEEDLE_SNOWFLAKE));
  assert.ok(readFx("375-nlrb-no-38.txt").includes(BODY_NEEDLE_BOLDT));

  const listingHtml = readFx("listing-excerpt.html");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_NEXSTAR), "AJAX index is captions");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_SNOWFLAKE), "AJAX index has no discharge narrative");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_BOLDT), "AJAX index has no quash narrative");

  const cacheDir = mkdtempSync(join(tmpdir(), "nlrb-decisions-"));
  const prevDir = process.env.NLRB_DECISIONS_DIR;
  process.env.NLRB_DECISIONS_DIR = cacheDir;
  const snap = await collectNlrbDecisions({ htmlDir: fixtures, limit: 4, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.NLRB_DECISIONS_DIR;
  else process.env.NLRB_DECISIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 3, `fixture collect caches official Board Decision text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === NEXSTAR_ID));
  assert.ok(snap.cards.some((c) => c.id === SNOWFLAKE_ID));
  assert.ok(snap.cards.some((c) => c.id === BOLDT_ID));
  assert.ok(snap.cards.some((c) => c.id === "375-nlrb-no-35"), "dry collect finds a Board Decision that is not a scout seed");
  assert.ok(snap.cards.every((c) => isRealNlrbDecisionBody(c.body)));
  assert.ok(snap.cards.every((c) => officialNlrbPdfUrl(c.sourceUrl)));
  const seedCard = snap.cards.find((c) => c.id === NEXSTAR_ID);
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_NEXSTAR));
  assert.match(seedCard?.institution ?? "", /Nexstar/i);
  assert.equal(snap.cards.find((c) => c.id === BOLDT_ID)?.kind, "Decision and Order Quashing Notice of Hearing");

  const assembled = assembleNlrbDecisionsSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildNlrbDecisionsManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 3);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; id?: string }[];
  assert.ok(freeCards.every((c) => !c.body), "collector manifest cards omit body");
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes("apps.nlrb.gov"), "free manifest has no apps.nlrb.gov deep link");
  assert.ok(freeCards.every((c) => !c.sourceUrl), "collector manifest cards omit sourceUrl");
  assert.ok(filterNlrbDecisionsManifest(manifest, "nexstar").cardCount);
  assert.ok(filterNlrbDecisionsManifest(manifest, "20-CA-274626").cardCount);
  assert.ok(parseNlrbDecisionText(readFx("375-nlrb-no-40.txt"), SEED_LISTINGS[0]).body.includes(BODY_NEEDLE_NEXSTAR));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
