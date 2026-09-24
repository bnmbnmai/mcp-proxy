import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_MAVERICK,
  BODY_NEEDLE_PREMIUM,
  BODY_NEEDLE_WILDEARTH,
  CARD_FIELDS,
  IBLA_DECISIONS_AMOUNT_ATOMIC,
  IBLA_DECISIONS_MANIFEST_PATH,
  IBLA_DECISIONS_ONE_AMOUNT_ATOMIC,
  IBLA_DECISIONS_PATH,
  LICENSE,
  MAVERICK_ID,
  PDF_ROOT,
  PREMIUM_ID,
  PRODUCT_ID,
  SEED_LISTINGS,
  WILDEARTH_ID,
  assembleIblaSnapshot,
  buildIblaManifest,
  citationFromPdfUrl,
  collectIblaDecisions,
  filterIblaManifest,
  isDispositiveOrder,
  isRawPdf,
  isRealIblaDecisionBody,
  officialIblaPdfUrl,
  parseIblaIndexHtml,
} from "./ibla-decisions.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ibla-decisions");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(IBLA_DECISIONS_PATH, "/ibla-decisions");
  assert.equal(IBLA_DECISIONS_MANIFEST_PATH, "/ibla-decisions/manifest.json");
  assert.equal(IBLA_DECISIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(IBLA_DECISIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(PDF_ROOT.includes("/IBLA/Ibladecisions/"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(CARD_FIELDS.includes("parties"));
  assert.ok(CARD_FIELDS.includes("disposition"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === MAVERICK_ID && row.date === "2026-06-16"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === PREMIUM_ID));
  assert.ok(SEED_LISTINGS.some((row) => row.id === WILDEARTH_ID));

  assert.equal(officialIblaPdfUrl(MAVERICK_ID && "https://www.oha.doi.gov/IBLA/Ibladecisions/201IBLA/201ibla53.pdf"), "https://www.oha.doi.gov/IBLA/Ibladecisions/201IBLA/201ibla53.pdf");
  assert.equal(officialIblaPdfUrl("https://example.com/not-ibla.pdf"), null);
  assert.equal(officialIblaPdfUrl("https://www.oha.doi.gov/IBLA/Ibladecisions/"), null);
  assert.deepEqual(citationFromPdfUrl("https://www.oha.doi.gov/IBLA/Ibladecisions/200IBLA/200ibia195.pdf"), {
    volume: 200,
    page: 195,
  });
  assert.deepEqual(citationFromPdfUrl("https://www.oha.doi.gov/IBLA/Ibladecisions/200IBLA/200IBLA066.pdf"), {
    volume: 200,
    page: 66,
  });

  const listed = parseIblaIndexHtml(readFx("year-2026.html"));
  assert.equal(listed[0]?.id, MAVERICK_ID, "newest decision date sorts first even when the index lists it last");
  assert.equal(listed[0]?.date, "2026-06-16");
  assert.equal(listed[0]?.parties, "Maverick Solar, LLC et al.");
  assert.equal(listed[0]?.docket, "IBLA 2021-0216 et al.");
  assert.ok(listed.some((row) => row.id === PREMIUM_ID && row.parties.includes("Premium Coal")));
  assert.ok(listed.some((row) => row.id === WILDEARTH_ID && row.date === "2026-01-15"));
  assert.ok(listed.some((row) => row.id === "200-ibla-282"));
  assert.ok(!listed.some((row) => row.sourceUrl.includes("example.com")));

  assert.ok(isRealIblaDecisionBody(readFx("201-ibla-53.txt")));
  assert.ok(readFx("201-ibla-53.txt").includes(BODY_NEEDLE_MAVERICK));
  assert.ok(readFx("201-ibla-18.txt").includes(BODY_NEEDLE_PREMIUM));
  assert.ok(readFx("201-ibla-1.txt").includes(BODY_NEEDLE_WILDEARTH));
  assert.ok(isDispositiveOrder(readFx("dispositive-order.txt")));
  assert.ok(!isRealIblaDecisionBody(readFx("dispositive-order.txt")));
  assert.ok(isRawPdf(readFx("raw-pdf.txt")));
  assert.ok(!isRealIblaDecisionBody(readFx("raw-pdf.txt")));
  assert.ok(!isRealIblaDecisionBody("<html><body>NAME OF CASE CITATION/LINK 201 IBLA 53 Decided OPINION BY IBLA 2021-0216</body></html>"));

  const cacheDir = mkdtempSync(join(tmpdir(), "ibla-decisions-"));
  const prevDir = process.env.IBLA_DECISIONS_DIR;
  process.env.IBLA_DECISIONS_DIR = cacheDir;
  const snap = await collectIblaDecisions({ listingDir: fixtures, limit: 8, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.IBLA_DECISIONS_DIR;
  else process.env.IBLA_DECISIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.equal(snap.asOf, "2026-06-16", "asOf is the newest decision date, not fetchedAt");
  assert.equal(snap.fetchedPdfs, 0);
  assert.ok(snap.cards.some((card) => card.id === MAVERICK_ID && card.disposition.startsWith("Set aside")));
  assert.ok(snap.cards.some((card) => card.id === PREMIUM_ID && card.disposition.startsWith("Affirmed")));
  assert.ok(snap.cards.some((card) => card.id === WILDEARTH_ID && card.disposition === "Vacated."));
  assert.ok(snap.cards.some((card) => card.id === "200-ibla-282"), "dry collect keeps a non-seed precedential decision");
  assert.equal(snap.cards[0]?.id, MAVERICK_ID);
  assert.ok(snap.cards.every((card) => isRealIblaDecisionBody(card.body)));
  assert.ok(!snap.cards.some((card) => card.body.includes("%PDF-")));

  const manifest = buildIblaManifest(assembleIblaSnapshot(snap.cards, snap.fetchedAt));
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.asOf, "2026-06-16");
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 4);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; parties?: string; citation?: string }[];
  assert.ok(freeCards.every((card) => !card.body));
  assert.ok(freeCards.every((card) => !card.sourceUrl));
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes("201ibla53.pdf"));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_MAVERICK));
  assert.ok(!manifestJson.includes("%PDF-"));
  assert.ok(Number(filterIblaManifest(manifest, "maverick").cardCount) >= 1);
  assert.ok(Number(filterIblaManifest(manifest, "premium coal").cardCount) >= 1);
  assert.ok(Number(filterIblaManifest(manifest, "201 IBLA 1").cardCount) >= 1);
  assert.ok(Number(filterIblaManifest(manifest, "wildearth").cardCount) >= 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
