import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BELL_ID,
  BODY_NEEDLE_BELL,
  BODY_NEEDLE_BOEKER,
  BODY_NEEDLE_JOHNSON,
  BODY_NEEDLE_LAU,
  BODY_NEEDLE_LAU_OPINION,
  BOEKER_ID,
  CARD_FIELDS,
  CCB_DETERMINATIONS_AMOUNT_ATOMIC,
  CCB_DETERMINATIONS_MANIFEST_PATH,
  CCB_DETERMINATIONS_ONE_AMOUNT_ATOMIC,
  CCB_DETERMINATIONS_PATH,
  JOHNSON_ID,
  LAU_ID,
  LAU_URL,
  LICENSE,
  LISTING_URL,
  PRODUCT_ID,
  SEED_LISTINGS,
  assembleCcbSnapshot,
  buildCcbManifest,
  collectCcbDeterminations,
  filterCcbManifest,
  isRawPdf,
  isRealCcbDeterminationBody,
  officialCcbPdfUrl,
  parseCcbDocumentsHtml,
} from "./ccb-determinations.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ccb-determinations");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(CCB_DETERMINATIONS_PATH, "/ccb-determinations");
  assert.equal(CCB_DETERMINATIONS_MANIFEST_PATH, "/ccb-determinations/manifest.json");
  assert.equal(CCB_DETERMINATIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(CCB_DETERMINATIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(LISTING_URL.includes("dockets.ccb.gov/search/documents"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(CARD_FIELDS.includes("docket"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === LAU_ID && row.date === "2026-09-22"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === BELL_ID));
  assert.ok(SEED_LISTINGS.some((row) => row.id === BOEKER_ID));
  assert.ok(SEED_LISTINGS.some((row) => row.id === JOHNSON_ID));

  assert.equal(officialCcbPdfUrl(LAU_URL), LAU_URL);
  assert.equal(officialCcbPdfUrl("https://dockets.ccb.gov/document/download/21779"), LAU_URL);
  assert.equal(officialCcbPdfUrl("https://example.com/document/download/1"), null);
  assert.equal(officialCcbPdfUrl("https://dockets.ccb.gov/case/detail/24-CCB-0180"), null);

  const listed = parseCcbDocumentsHtml(readFx("listing.html"));
  assert.ok(listed.some((row) => row.id === LAU_ID && row.documentId === "21779"));
  assert.ok(listed.some((row) => row.id === BELL_ID && row.date === "2026-09-22"));
  assert.ok(listed.some((row) => row.id === BOEKER_ID));
  assert.ok(listed.some((row) => row.id === JOHNSON_ID && row.date === "2026-08-18"));
  assert.equal(listed[0]?.id, LAU_ID, "newest filed date sorts first");
  assert.ok(!listed.some((row) => row.sourceUrl.includes("example.com")));

  assert.ok(isRealCcbDeterminationBody(readFx("24-ccb-0180.txt")));
  assert.ok(readFx("24-ccb-0180.txt").includes(BODY_NEEDLE_LAU));
  assert.ok(readFx("23-ccb-0332.txt").includes(BODY_NEEDLE_BELL));
  assert.ok(readFx("24-ccb-0405.txt").includes(BODY_NEEDLE_BOEKER));
  assert.ok(readFx("25-ccb-0121.txt").includes(BODY_NEEDLE_JOHNSON));
  assert.ok(!isRealCcbDeterminationBody(readFx("not-final.txt")));
  assert.ok(isRawPdf(readFx("raw-pdf.txt")));
  assert.ok(!isRealCcbDeterminationBody(readFx("raw-pdf.txt")));

  const cacheDir = mkdtempSync(join(tmpdir(), "ccb-determinations-"));
  const prevDir = process.env.CCB_DETERMINATIONS_DIR;
  process.env.CCB_DETERMINATIONS_DIR = cacheDir;
  const snap = await collectCcbDeterminations({ listingDir: fixtures, limit: 8, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.CCB_DETERMINATIONS_DIR;
  else process.env.CCB_DETERMINATIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.equal(snap.asOf, "2026-09-22", "asOf is the newest filed date, not fetchedAt");
  assert.equal(snap.fetchedPdfs, 0);
  assert.ok(snap.cards.some((card) => card.id === LAU_ID && card.body.includes(BODY_NEEDLE_LAU)));
  assert.ok(snap.cards.some((card) => card.id === BELL_ID && card.body.includes(BODY_NEEDLE_BELL)));
  assert.ok(snap.cards.some((card) => card.id === BOEKER_ID && card.body.includes(BODY_NEEDLE_BOEKER)));
  assert.ok(snap.cards.some((card) => card.id === JOHNSON_ID && card.body.includes(BODY_NEEDLE_JOHNSON)));
  assert.equal(snap.cards[0]?.id, LAU_ID);
  assert.ok(snap.cards.every((card) => isRealCcbDeterminationBody(card.body)));
  assert.ok(!snap.cards.some((card) => card.body.includes("%PDF-")));

  const manifest = buildCcbManifest(assembleCcbSnapshot(snap.cards, snap.fetchedAt));
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.asOf, "2026-09-22");
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 4);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; docket?: string }[];
  assert.ok(freeCards.every((card) => !card.body));
  assert.ok(freeCards.every((card) => !card.sourceUrl));
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes("/document/download/"));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_LAU_OPINION));
  assert.ok(!manifestJson.includes("%PDF-"));
  assert.ok(Number(filterCcbManifest(manifest, "ping lau").cardCount) >= 1);
  assert.ok(Number(filterCcbManifest(manifest, "24-CCB-0405").cardCount) >= 1);
  assert.ok(Number(filterCcbManifest(manifest, "johnson").cardCount) >= 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
