import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BEP_ID,
  BEP_URL,
  BODY_NEEDLE_BEP,
  BODY_NEEDLE_ERS,
  BODY_NEEDLE_NATCA,
  BODY_NEEDLE_USMC,
  CARD_FIELDS,
  ERS_ID,
  FLRA_DECISIONS_AMOUNT_ATOMIC,
  FLRA_DECISIONS_MANIFEST_PATH,
  FLRA_DECISIONS_ONE_AMOUNT_ATOMIC,
  FLRA_DECISIONS_PATH,
  LICENSE,
  LISTING_URL,
  NATCA_ID,
  NATCA_URL,
  PRODUCT_ID,
  SEED_LISTINGS,
  USMC_ID,
  USMC_URL,
  ajaxInsertHtml,
  assembleFlraDecisionsSnapshot,
  buildFlraDecisionsManifest,
  catalogIdFromCitation,
  collectFlraDecisions,
  discoverListingPageUrls,
  filterFlraDecisionsManifest,
  isAljOnly,
  isCaseDigest,
  isHtmlDecision,
  isIndexHtml,
  isJsonFullText,
  isRealFlraDecisionBody,
  keepListing,
  officialFlraPdfUrl,
  parseAuthorityDecisionsHtml,
  parseCitation,
  parseFlraDecisionText,
  parseKind,
  parseSlipNo,
} from "./flra-decisions.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/flra-decisions");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(FLRA_DECISIONS_PATH, "/flra-decisions");
  assert.equal(FLRA_DECISIONS_MANIFEST_PATH, "/flra-decisions/manifest.json");
  assert.equal(FLRA_DECISIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(FLRA_DECISIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(LISTING_URL.includes("/decisions/authority-decisions"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === USMC_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === BEP_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === NATCA_ID));

  assert.equal(officialFlraPdfUrl(USMC_URL), USMC_URL);
  assert.equal(officialFlraPdfUrl(` ${BEP_URL} `), BEP_URL);
  assert.equal(officialFlraPdfUrl(NATCA_URL), NATCA_URL);
  assert.equal(
    officialFlraPdfUrl("https://www.flra.gov/system/files/digest/Digest%205810.pdf"),
    null,
    "case digests are not the decision PDF",
  );
  assert.equal(officialFlraPdfUrl("https://www.flra.gov/decisions/v74/74-80"), null, "HTML slip is not the PDF");
  assert.equal(officialFlraPdfUrl("https://apps.nlrb.gov/link/document.aspx/09031d458436f374"), null);
  assert.equal(parseCitation("Citation # 74 FLRA 541"), "74 FLRA 541");
  assert.equal(parseCitation("74 FLRA No. 80"), "", "issuance number is not the volume-page citation");
  assert.equal(parseSlipNo("74 FLRA No. 80"), "74 FLRA No. 80");
  assert.equal(catalogIdFromCitation("74 FLRA 541"), USMC_ID);
  assert.equal(parseKind("ORDER DISMISSING EXCEPTIONS"), "Order Dismissing Exceptions");

  assert.equal(
    keepListing({
      citation: "74 FLRA 541",
      caseNo: "0-AR-5810",
      kind: "Order Dismissing Exceptions",
      title: "74 FLRA 541",
      institution: "United States Marine Corps",
      sourceUrl: USMC_URL,
    }),
    true,
  );
  assert.equal(
    keepListing({
      citation: "74 FLRA 541",
      caseNo: "0-AR-5810",
      kind: "Authority Decision",
      title: "Case digest",
      institution: "United States Marine Corps",
      sourceUrl: "https://www.flra.gov/system/files/digest/Digest%205810.pdf",
    }),
    false,
    "digest PDFs are not this bag",
  );

  const listing = readFx("listing-excerpt.html");
  const listed = parseAuthorityDecisionsHtml(listing);
  const ajax = JSON.stringify([{ command: "insert", data: listing }]);
  const ajaxListed = parseAuthorityDecisionsHtml(`<textarea>${ajax}</textarea>`);
  assert.ok(listed.some((r) => r.id === USMC_ID), `seeds in listing, got ${listed.map((r) => r.id).join(",")}`);
  assert.ok(ajaxListed.some((r) => r.id === ERS_ID), "textarea-wrapped Drupal AJAX still parses a decision beyond the scout seeds");
  assert.equal(ajaxInsertHtml(`<textarea>${ajax}</textarea>`).includes("74 FLRA 541"), true);
  assert.ok(listed.some((r) => r.id === BEP_ID));
  assert.ok(listed.some((r) => r.id === NATCA_ID));
  assert.ok(listed.some((r) => r.id === ERS_ID), "listing walker finds an Authority Decision beyond the three scout seeds");
  const usmc = listed.find((r) => r.id === USMC_ID);
  assert.equal(usmc?.caseNo, "0-AR-5810");
  assert.equal(usmc?.date, "2026-09-22");
  assert.match(usmc?.institution ?? "", /Marine Corps/i);
  assert.equal(usmc?.sourceUrl, USMC_URL);
  assert.equal(usmc?.documentId, "v74_80.pdf");
  assert.ok(!listed.some((r) => /\/digest\//i.test(r.sourceUrl)));
  assert.ok(!listed.some((r) => /\/decisions\/v74\//i.test(r.sourceUrl)));

  const pages = discoverListingPageUrls(listing, LISTING_URL);
  assert.ok(pages.some((u) => /authority-decisions\?page=1/.test(u)), "authority index paginates");

  assert.ok(isCaseDigest(readFx("digest-5810.txt")));
  assert.ok(isHtmlDecision(readFx("html-decision.html")));
  assert.ok(isIndexHtml(listing));
  assert.ok(isJsonFullText(readFx("json-fulltext.json")));
  assert.ok(isAljOnly(readFx("alj-only.txt")));
  assert.ok(!isRealFlraDecisionBody(readFx("digest-5810.txt")));
  assert.ok(!isRealFlraDecisionBody(readFx("html-decision.html")));
  assert.ok(!isRealFlraDecisionBody(listing));
  assert.ok(!isRealFlraDecisionBody(readFx("json-fulltext.json")));
  assert.ok(!isRealFlraDecisionBody(readFx("alj-only.txt")));
  assert.ok(isRealFlraDecisionBody(readFx("74-flra-541.txt"), "74 FLRA 541"));
  assert.ok(isRealFlraDecisionBody(readFx("74-flra-530.txt"), "74 FLRA 530"));
  assert.ok(isRealFlraDecisionBody(readFx("74-flra-524.txt"), "74 FLRA 524"));
  assert.ok(isRealFlraDecisionBody(readFx("74-flra-508.txt"), "74 FLRA 508"));
  assert.ok(readFx("74-flra-541.txt").includes(BODY_NEEDLE_USMC));
  assert.ok(readFx("74-flra-530.txt").includes(BODY_NEEDLE_BEP));
  assert.ok(readFx("74-flra-524.txt").includes(BODY_NEEDLE_NATCA));
  assert.ok(readFx("74-flra-508.txt").includes(BODY_NEEDLE_ERS));
  assert.ok(!listing.includes(BODY_NEEDLE_USMC), "index is captions");
  assert.ok(!listing.includes(BODY_NEEDLE_BEP));
  assert.ok(!listing.includes(BODY_NEEDLE_NATCA));
  assert.ok(!listing.includes(BODY_NEEDLE_ERS));

  const cacheDir = mkdtempSync(join(tmpdir(), "flra-decisions-"));
  const prevDir = process.env.FLRA_DECISIONS_DIR;
  process.env.FLRA_DECISIONS_DIR = cacheDir;
  const snap = await collectFlraDecisions({ htmlDir: fixtures, limit: 7, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.FLRA_DECISIONS_DIR;
  else process.env.FLRA_DECISIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 4, `fixture collect caches official Authority Decision text, got ${snap.cards.length}`);
  assert.equal(snap.fetchedPdfs, 0);
  assert.ok(snap.asOf);
  assert.ok(snap.cards.some((c) => c.id === USMC_ID));
  assert.ok(snap.cards.some((c) => c.id === BEP_ID));
  assert.ok(snap.cards.some((c) => c.id === NATCA_ID));
  assert.ok(snap.cards.some((c) => c.id === ERS_ID), "dry collect finds an Authority Decision that is not a scout seed");
  assert.ok(snap.cards.every((c) => isRealFlraDecisionBody(c.body, c.citation)));
  assert.ok(snap.cards.every((c) => officialFlraPdfUrl(c.sourceUrl)));
  const seedCard = snap.cards.find((c) => c.id === USMC_ID);
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_USMC));
  assert.match(seedCard?.institution ?? "", /Marine Corps/i);
  assert.equal(seedCard?.kind, "Order Dismissing Exceptions");
  assert.equal(snap.cards.find((c) => c.id === ERS_ID)?.caseNo, "0-NG-3576");

  const assembled = assembleFlraDecisionsSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildFlraDecisionsManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 4);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; id?: string }[];
  assert.ok(freeCards.every((c) => !c.body), "collector manifest cards omit body");
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes("/system/files/decisions/"), "free manifest has no decision PDF deep link");
  assert.ok(!manifestJson.includes("/decisions/v74/"), "free manifest has no HTML slip that bypasses pay");
  assert.ok(!manifestJson.includes(BODY_NEEDLE_USMC));
  assert.ok(freeCards.every((c) => !c.sourceUrl), "collector manifest cards omit sourceUrl");
  assert.ok(filterFlraDecisionsManifest(manifest, "marine corps").cardCount);
  assert.ok(filterFlraDecisionsManifest(manifest, "0-NG-3576").cardCount);
  assert.ok(parseFlraDecisionText(readFx("74-flra-541.txt"), SEED_LISTINGS[0]).body.includes(BODY_NEEDLE_USMC));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
