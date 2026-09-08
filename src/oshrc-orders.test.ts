import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_SEED,
  CARD_FIELDS,
  FINLEY_HTML_URL,
  FINLEY_URL,
  LICENSE,
  LISTING_URL,
  OSHRC_ORDERS_AMOUNT_ATOMIC,
  OSHRC_ORDERS_MANIFEST_PATH,
  OSHRC_ORDERS_ONE_AMOUNT_ATOMIC,
  OSHRC_ORDERS_PATH,
  PRODUCT_ID,
  SEED_LISTINGS,
  STIS_URL,
  assembleOshrcSnapshot,
  buildOshrcManifest,
  catalogId,
  collectOshrcOrders,
  filterOshrcManifest,
  htmlTwinUrl,
  isEfilingGuide,
  isProtectivenessJunk,
  isRealOshrcBody,
  isSettlementDefault,
  isSiblingPack,
  isWpJsonNarrative,
  officialOshrcFileUrl,
  parseDecisionTables,
  parseOshrcText,
} from "./oshrc-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/oshrc-orders");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(OSHRC_ORDERS_PATH, "/oshrc-orders");
  assert.equal(OSHRC_ORDERS_MANIFEST_PATH, "/oshrc-orders/manifest.json");
  assert.ok(LISTING_URL.includes("oshrc.gov/decision-search"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "24-0889-eaja"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "24-0702"));

  assert.equal(officialOshrcFileUrl(FINLEY_URL), FINLEY_URL);
  assert.equal(officialOshrcFileUrl(` ${FINLEY_URL} `), FINLEY_URL);
  assert.equal(officialOshrcFileUrl(FINLEY_HTML_URL), FINLEY_HTML_URL);
  assert.equal(officialOshrcFileUrl(STIS_URL), STIS_URL);
  assert.equal(htmlTwinUrl(FINLEY_URL), FINLEY_HTML_URL);
  assert.equal(officialOshrcFileUrl("https://www.oshrc.gov/wp-json/wp/v2/decision/240889"), null);
  assert.equal(
    officialOshrcFileUrl("https://www.oshrc.gov/wp-content/uploads/Commission_E-File_System_Guide_-_FINAL_2-21.pdf"),
    null,
  );
  assert.equal(officialOshrcFileUrl("https://www.fmshrc.gov/sites/default/files/decisions/alj/example.pdf"), null);

  assert.equal(catalogId("24-0889 (EAJA)"), "24-0889-eaja");
  assert.equal(catalogId("24-0702"), "24-0702");
  assert.equal(catalogId("18-1287 & 18-1288"), "18-1287-18-1288");

  const listed = parseDecisionTables(readFx("listing-excerpt.html"));
  assert.ok(listed.some((r) => r.id === "24-0889-eaja"));
  assert.ok(listed.some((r) => r.id === "24-0702"));
  const finley = listed.find((r) => r.id === "24-0889-eaja");
  assert.equal(finley?.board, "alj");
  assert.equal(finley?.kind, "EAJA Decision and Order");
  assert.equal(finley?.sourceUrl, FINLEY_URL);
  assert.equal(finley?.htmlUrl, FINLEY_HTML_URL);
  assert.match(finley?.institution ?? "", /Finley Farmers/i);
  const stis = listed.find((r) => r.id === "24-0702");
  assert.equal(stis?.sourceUrl, STIS_URL);
  assert.match(stis?.institution ?? "", /STIS/i);
  assert.ok(listed.some((r) => r.board === "commission" && /Bluewater/i.test(r.title)));
  const firstMarine = listed.find((r) => r.id === "18-1287-18-1288");
  assert.equal(
    firstMarine?.htmlUrl,
    "https://www.oshrc.gov/wp-content/uploads/First-Marine-LLC-18-1287-18-1288-Comm-Decision.html",
    "text_link href can follow the URL; do not guess the PDF stem .html",
  );
  const bluewater = listed.find((r) => r.id === "24-0451");
  assert.equal(bluewater?.kind, "Commission Final Order");
  assert.ok(listed.every((r) => officialOshrcFileUrl(r.sourceUrl)));
  assert.ok(!listed.some((r) => /wp-json|e-fil|password|organizational/i.test(r.sourceUrl)));

  assert.ok(isProtectivenessJunk(readFx("protectiveness-letter.txt")));
  assert.ok(isEfilingGuide(readFx("e-filing-guide.txt")));
  assert.ok(isSettlementDefault(readFx("settlement-default.txt")));
  assert.ok(isWpJsonNarrative(readFx("wp-json-narrative.json")));
  assert.ok(isSiblingPack(readFx("fmshrc-sibling.txt")));
  assert.ok(!isRealOshrcBody(readFx("protectiveness-letter.txt")));
  assert.ok(!isRealOshrcBody(readFx("e-filing-guide.txt")));
  assert.ok(!isRealOshrcBody(readFx("settlement-default.txt")));
  assert.ok(!isRealOshrcBody(readFx("wp-json-narrative.json")));
  assert.ok(!isRealOshrcBody(readFx("fmshrc-sibling.txt")));
  assert.ok(isRealOshrcBody(readFx("24-0889-eaja.txt")));
  assert.ok(isRealOshrcBody(readFx("24-0702.txt")));
  assert.ok(isRealOshrcBody(readFx("commission-final-short.txt")));
  assert.ok(readFx("24-0889-eaja.txt").includes(BODY_NEEDLE_SEED));
  assert.match(readFx("24-0702.txt"), /crane in excess of its rated capacity/i);

  const cacheDir = mkdtempSync(join(tmpdir(), "oshrc-orders-"));
  const prevDir = process.env.OSHRC_ORDERS_DIR;
  process.env.OSHRC_ORDERS_DIR = cacheDir;
  const snap = await collectOshrcOrders({ htmlDir: fixtures, limit: 8, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.OSHRC_ORDERS_DIR;
  else process.env.OSHRC_ORDERS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 2, `fixture collect caches official decision text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === "24-0889-eaja"));
  assert.ok(snap.cards.some((c) => c.id === "24-0702"));
  assert.ok(snap.cards.every((c) => isRealOshrcBody(c.body)));
  const seedCard = snap.cards.find((c) => c.id === "24-0889-eaja");
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_SEED));
  assert.match(seedCard?.institution ?? "", /Finley Farmers/i);

  const assembled = assembleOshrcSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildOshrcManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.free, true);
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.amountAtomic, OSHRC_ORDERS_AMOUNT_ATOMIC);
  assert.equal(manifest.oneAmountAtomic, OSHRC_ORDERS_ONE_AMOUNT_ATOMIC);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  const manText = JSON.stringify(manifest);
  assert.ok(!manText.includes("%PDF-"), "free manifest is titles/links/counts");
  assert.ok(!manText.includes(BODY_NEEDLE_SEED), "free manifest has no seed decision body");
  assert.ok(!manText.includes("crane in excess of its rated capacity"));
  const manSeed = (manifest.cards as { id?: string; body?: string; sourceUrl?: string; htmlUrl?: string }[]).find(
    (c) => c.id === "24-0889-eaja",
  );
  assert.equal(manSeed?.sourceUrl, FINLEY_URL);
  assert.equal(manSeed?.htmlUrl, FINLEY_HTML_URL);
  assert.ok(!("body" in (manSeed ?? {})));

  const filtered = filterOshrcManifest(manifest, "finley");
  assert.ok(Number(filtered.cardCount) >= 1);
  assert.ok((filtered.cards as { institution?: string }[]).every((c) => /finley/i.test(c.institution ?? "")));

  const parsed = parseOshrcText(readFx("24-0889-eaja.txt"), SEED_LISTINGS[0]);
  assert.equal(parsed.id, "24-0889-eaja");
  assert.ok(parsed.body.includes(BODY_NEEDLE_SEED));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
