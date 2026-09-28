import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_SINGLETON,
  BODY_NEEDLE_SINGLETON_EA,
  BODY_NEEDLE_TREVINO,
  BODY_NEEDLE_TREVINO_EA,
  BODY_NEEDLE_WOOTEN,
  BODY_NEEDLE_WOOTEN_EA,
  CARD_FIELDS,
  LICENSE,
  LISTING_URL,
  PRODUCT_ID,
  SEED_LISTINGS,
  SINGLETON_ID,
  TREVINO_ID,
  TREVINO_URL,
  USCG_ALJ_DECISIONS_AMOUNT_ATOMIC,
  USCG_ALJ_DECISIONS_MANIFEST_PATH,
  USCG_ALJ_DECISIONS_ONE_AMOUNT_ATOMIC,
  USCG_ALJ_DECISIONS_PATH,
  WOOTEN_ID,
  assembleUscgSnapshot,
  buildUscgManifest,
  collectUscgAljDecisions,
  filterUscgManifest,
  isRawPdf,
  isRealUscgAljBody,
  officialUscgPdfUrl,
  parseUscgIndex,
} from "./uscg-alj-decisions.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/uscg-alj-decisions");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(USCG_ALJ_DECISIONS_PATH, "/uscg-alj-decisions");
  assert.equal(USCG_ALJ_DECISIONS_MANIFEST_PATH, "/uscg-alj-decisions/manifest.json");
  assert.equal(USCG_ALJ_DECISIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(USCG_ALJ_DECISIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(LISTING_URL.includes("ALJ-Decisions-2026"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(CARD_FIELDS.includes("docket"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === TREVINO_ID && row.date === "2026-07-09" && row.kind === "Default Order"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === WOOTEN_ID && row.kind === "Default Order"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === SINGLETON_ID && row.kind === "Consent Order"));

  assert.equal(officialUscgPdfUrl(TREVINO_URL), TREVINO_URL);
  assert.equal(officialUscgPdfUrl("https://example.com/2026-0155.pdf"), null);
  assert.equal(
    officialUscgPdfUrl("https://www.uscg.mil/Portals/0/Headquarters/Administrative%20Law%20Judges/CDOA/2026-0155.pdf"),
    null,
  );

  const listed = parseUscgIndex(readFx("listing.txt"));
  assert.ok(listed.some((row) => row.id === TREVINO_ID && row.date === "2026-07-09" && row.kind === "Default Order"));
  assert.ok(listed.some((row) => row.id === WOOTEN_ID && row.date === "2026-07-01"));
  assert.ok(listed.some((row) => row.id === SINGLETON_ID && row.date === "2026-06-01" && row.kind === "Consent Order"));
  assert.equal(listed[0]?.id, "2026-0151", "newest dispositive order sorts first");
  assert.ok(!listed.some((row) => row.id === "2026-0005"), "Withdrawal is not this SKU");
  assert.ok(!listed.some((row) => row.id === "2026-0010"), "Admission Order is not this SKU");
  assert.ok(!listed.some((row) => row.id === "2026-0009"), "Pending rows without a decision PDF are not this SKU");
  assert.ok(listed.length >= 80, `expected the 2026 SKU slice, got ${listed.length}`);

  const html = `<table><tr><th>Docket</th></tr>
    <tr><td><a href="${TREVINO_URL}">2026-0155.pdf</a></td><td>7/9/2026</td><td>Use of dangerous drugs</td><td>Revoked</td><td>Default Order</td></tr>
    <tr><td><a href="https://www.uscg.mil/Portals/0/Headquarters/Administrative%20Law%20Judges/Decisions%20and%20Orders/2026/2026-0005.pdf">2026-0005.pdf</a></td><td>3/11/2026</td><td>drugs</td><td>Withdrawn</td><td>Withdrawal</td></tr>
  </table>`;
  const htmlListed = parseUscgIndex(html);
  assert.ok(htmlListed.some((row) => row.id === TREVINO_ID && row.kind === "Default Order"));
  assert.ok(!htmlListed.some((row) => row.id === "2026-0005"));

  assert.ok(isRealUscgAljBody(readFx("2026-0155.txt")));
  assert.ok(readFx("2026-0155.txt").includes(BODY_NEEDLE_TREVINO));
  assert.ok(readFx("2026-0155.txt").includes(BODY_NEEDLE_TREVINO_EA));
  assert.ok(readFx("2026-0152.txt").includes(BODY_NEEDLE_WOOTEN));
  assert.ok(readFx("2026-0152.txt").includes(BODY_NEEDLE_WOOTEN_EA));
  assert.ok(readFx("2026-0157.txt").includes(BODY_NEEDLE_SINGLETON));
  assert.ok(readFx("2026-0157.txt").includes(BODY_NEEDLE_SINGLETON_EA));
  assert.ok(!isRealUscgAljBody(readFx("not-order.txt")));
  assert.ok(isRawPdf(readFx("raw-pdf.txt")));
  assert.ok(!isRealUscgAljBody(readFx("raw-pdf.txt")));

  const cacheDir = mkdtempSync(join(tmpdir(), "uscg-alj-decisions-"));
  const prevDir = process.env.USCG_ALJ_DECISIONS_DIR;
  process.env.USCG_ALJ_DECISIONS_DIR = cacheDir;
  const snap = await collectUscgAljDecisions({ listingDir: fixtures, limit: 8, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.USCG_ALJ_DECISIONS_DIR;
  else process.env.USCG_ALJ_DECISIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.equal(snap.asOf, "2026-07-09", "asOf is the newest cached order date");
  assert.equal(snap.fetchedPdfs, 0);
  assert.ok(snap.cards.some((card) => card.id === TREVINO_ID && card.body.includes(BODY_NEEDLE_TREVINO)));
  assert.ok(snap.cards.some((card) => card.id === WOOTEN_ID && card.body.includes(BODY_NEEDLE_WOOTEN)));
  assert.ok(snap.cards.some((card) => card.id === SINGLETON_ID && card.body.includes(BODY_NEEDLE_SINGLETON) && card.respondent.includes("XAVIER SINGLETON")));
  assert.ok(snap.cards.every((card) => isRealUscgAljBody(card.body)));
  assert.ok(!snap.cards.some((card) => card.body.includes("%PDF-")));

  const manifest = buildUscgManifest(assembleUscgSnapshot(snap.cards, snap.fetchedAt));
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.asOf, "2026-07-09");
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 3);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; docket?: string; kind?: string; respondent?: string }[];
  assert.ok(freeCards.every((card) => !card.body));
  assert.ok(freeCards.every((card) => !card.sourceUrl));
  assert.ok(freeCards.every((card) => !card.respondent));
  assert.ok(freeCards.some((card) => card.docket === TREVINO_ID && card.kind === "Default Order"));
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes("/Portals/0/"));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_TREVINO));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_TREVINO_EA));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_WOOTEN));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_SINGLETON));
  assert.ok(!manifestJson.includes("%PDF-"));
  assert.ok(Number(filterUscgManifest(manifest, "2026-0155").cardCount) >= 1);
  assert.ok(Number(filterUscgManifest(manifest, "default order").cardCount) >= 1);
  assert.ok(Number(filterUscgManifest(manifest, "consent order").cardCount) >= 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
