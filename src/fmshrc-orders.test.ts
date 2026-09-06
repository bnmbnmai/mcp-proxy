import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_SEED,
  CARD_FIELDS,
  FMSHRC_ORDERS_AMOUNT_ATOMIC,
  FMSHRC_ORDERS_MANIFEST_PATH,
  FMSHRC_ORDERS_ONE_AMOUNT_ATOMIC,
  FMSHRC_ORDERS_PATH,
  LICENSE,
  ALJ_LISTING_URL,
  PRODUCT_ID,
  SEED_LISTINGS,
  assembleFmshrcSnapshot,
  buildFmshrcManifest,
  collectFmshrcOrders,
  filterFmshrcManifest,
  isBlueBookToc,
  isDiscriminationPack,
  isMshaMetadataWrap,
  isMshaViolationsDump,
  isRealFmshrcBody,
  officialFmshrcPdfUrl,
  parseBoardHtml,
  parseFmshrcText,
} from "./fmshrc-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fmshrc-orders");
const BIG_SPRING_URL =
  "https://www.fmshrc.gov/sites/default/files/decisions/alj/Big%20Spring%20Sands%20LLC%20CENT%202025-0091-Decision%20and%20Order.pdf";
const TRAP_URL =
  "https://www.fmshrc.gov/sites/default/files/decisions/commission/COMMo_3092026-CENT%202025-0051.pdf";

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(FMSHRC_ORDERS_PATH, "/fmshrc-orders");
  assert.equal(FMSHRC_ORDERS_MANIFEST_PATH, "/fmshrc-orders/manifest.json");
  assert.ok(ALJ_LISTING_URL.includes("fmshrc.gov/decisions/alj"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "CENT-2025-0091"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "CENT-2025-0167"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "WEST-2021-0229"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "CENT-2025-0051"));

  assert.equal(officialFmshrcPdfUrl(BIG_SPRING_URL), BIG_SPRING_URL);
  assert.equal(officialFmshrcPdfUrl(TRAP_URL), TRAP_URL);
  assert.equal(officialFmshrcPdfUrl("https://www.msha.gov/data-and-reports/open-government-data"), null);
  assert.equal(officialFmshrcPdfUrl("https://arlweb.msha.gov/OpenGovernmentData/DataSets/AssessedViolations.zip"), null);

  const aljListed = parseBoardHtml(readFx("alj-listing.html"), "alj");
  assert.ok(aljListed.some((r) => r.id === "CENT-2025-0091"));
  assert.ok(aljListed.some((r) => r.id === "CENT-2025-0167"));
  assert.ok(aljListed.some((r) => r.id === "WEST-2021-0229"));
  assert.ok(!aljListed.some((r) => /THOMAS|Ludescher|Lockhart|obo/i.test(r.title)));
  assert.ok(!aljListed.some((r) => r.docket.endsWith("-DM")));

  const commListed = parseBoardHtml(readFx("commission-listing.html"), "commission");
  assert.ok(commListed.some((r) => r.id === "CENT-2025-0051"));
  assert.match(commListed.find((r) => r.id === "CENT-2025-0051")?.institution ?? "", /Trap Rock/i);

  assert.ok(isMshaViolationsDump(readFx("msha-violations.csv")));
  assert.ok(isBlueBookToc(readFx("blue-book-toc.txt")));
  assert.ok(isMshaMetadataWrap(readFx("msha-metadata.json")));
  assert.ok(isDiscriminationPack(readFx("discrimination-obo.txt")));
  assert.ok(!isRealFmshrcBody(readFx("msha-violations.csv")));
  assert.ok(!isRealFmshrcBody(readFx("blue-book-toc.txt")));
  assert.ok(!isRealFmshrcBody(readFx("msha-metadata.json")));
  assert.ok(!isRealFmshrcBody(readFx("discrimination-obo.txt")));
  assert.ok(isRealFmshrcBody(readFx("cent-2025-0091.txt")));
  assert.ok(isRealFmshrcBody(readFx("cent-2025-0167.txt")));
  assert.ok(isRealFmshrcBody(readFx("west-2021-0229.txt")));
  assert.ok(isRealFmshrcBody(readFx("cent-2025-0051.txt")));
  assert.ok(readFx("cent-2025-0091.txt").includes(BODY_NEEDLE_SEED));

  const cacheDir = mkdtempSync(join(tmpdir(), "fmshrc-orders-"));
  const prevDir = process.env.FMSHRC_ORDERS_DIR;
  process.env.FMSHRC_ORDERS_DIR = cacheDir;
  const snap = await collectFmshrcOrders({ htmlDir: fixtures, limit: 8, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.FMSHRC_ORDERS_DIR;
  else process.env.FMSHRC_ORDERS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 4, `fixture collect caches official decision text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === "CENT-2025-0091"));
  assert.ok(snap.cards.some((c) => c.id === "CENT-2025-0167"));
  assert.ok(snap.cards.some((c) => c.id === "WEST-2021-0229"));
  assert.ok(snap.cards.some((c) => c.id === "CENT-2025-0051"));
  assert.ok(snap.cards.every((c) => isRealFmshrcBody(c.body)));
  assert.ok(!snap.cards.some((c) => isDiscriminationPack(c.title)));
  const seedCard = snap.cards.find((c) => c.id === "CENT-2025-0091");
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_SEED));
  assert.match(seedCard?.institution ?? "", /Big Spring Sands/i);

  const assembled = assembleFmshrcSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildFmshrcManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.free, true);
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.amountAtomic, FMSHRC_ORDERS_AMOUNT_ATOMIC);
  assert.equal(manifest.oneAmountAtomic, FMSHRC_ORDERS_ONE_AMOUNT_ATOMIC);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  const manText = JSON.stringify(manifest);
  assert.ok(!manText.includes("%PDF-"), "free manifest is titles/links/counts");
  assert.ok(!manText.includes(BODY_NEEDLE_SEED), "free manifest has no seed decision body");
  assert.ok(!manText.includes("9994013 alleges"));
  const manSeed = (manifest.cards as { id?: string; body?: string; sourceUrl?: string }[]).find(
    (c) => c.id === "CENT-2025-0091",
  );
  assert.equal(manSeed?.sourceUrl, BIG_SPRING_URL);
  assert.ok(!("body" in (manSeed ?? {})));

  const filtered = filterFmshrcManifest(manifest, "big spring");
  assert.ok(Number(filtered.cardCount) >= 1);
  assert.ok((filtered.cards as { institution?: string }[]).every((c) => /big spring/i.test(c.institution ?? "")));

  const parsed = parseFmshrcText(readFx("cent-2025-0091.txt"), SEED_LISTINGS[0]);
  assert.equal(parsed.docket, "CENT-2025-0091");
  assert.ok(parsed.body.includes(BODY_NEEDLE_SEED));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
