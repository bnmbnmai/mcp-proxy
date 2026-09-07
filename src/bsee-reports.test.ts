import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARENA_URL,
  ATTRIBUTION,
  BODY_NEEDLE_SEED,
  BSEE_REPORTS_AMOUNT_ATOMIC,
  BSEE_REPORTS_MANIFEST_PATH,
  BSEE_REPORTS_ONE_AMOUNT_ATOMIC,
  BSEE_REPORTS_PATH,
  CANTIUM_URL,
  CARD_FIELDS,
  LICENSE,
  LISTING_URL,
  PRODUCT_ID,
  SEED_LISTINGS,
  TALOS_URL,
  assembleBseeSnapshot,
  buildBseeManifest,
  collectBseeReports,
  filterBseeManifest,
  isEwellWarDump,
  isIncCountDump,
  isIncQueryDump,
  isRealBseeBody,
  isSiblingPack,
  officialBseePdfUrl,
  parseBseeText,
  parseDistrictTable,
} from "./bsee-reports.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/bsee-reports");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(BSEE_REPORTS_PATH, "/bsee-reports");
  assert.equal(BSEE_REPORTS_MANIFEST_PATH, "/bsee-reports/manifest.json");
  assert.ok(LISTING_URL.includes("district-investigation-reports"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(CARD_FIELDS.includes("lease"));
  assert.ok(CARD_FIELDS.includes("areaBlock"));
  assert.ok(CARD_FIELDS.includes("accidentType"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "mp-298-cantium-2026-05-24"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "mu-85-talos-2026-05-17"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "ei-320-arena-2026-07-01"));

  assert.equal(officialBseePdfUrl(CANTIUM_URL), CANTIUM_URL);
  assert.equal(officialBseePdfUrl(TALOS_URL), TALOS_URL);
  assert.equal(officialBseePdfUrl(ARENA_URL), ARENA_URL);
  assert.equal(officialBseePdfUrl("https://www.data.bsee.gov/Company/INCs/Default.aspx"), null);
  assert.equal(officialBseePdfUrl("https://www.data.bsee.gov/Company/INCs/inc.zip"), null);
  assert.equal(officialBseePdfUrl("https://www.csb.gov/assets/1/20/example.pdf"), null);

  const listed = parseDistrictTable(readFx("listing-excerpt.html"));
  assert.ok(listed.length >= 18, `2026 table lists ~18 dated rows, got ${listed.length}`);
  assert.ok(listed.some((r) => r.id === "mp-298-cantium-2026-05-24"));
  assert.ok(listed.some((r) => r.id === "mu-85-talos-2026-05-17"));
  assert.ok(listed.some((r) => r.id === "ei-320-arena-2026-07-01"));
  const cantium = listed.find((r) => r.id === "mp-298-cantium-2026-05-24");
  assert.equal(cantium?.lease, "G01315");
  assert.equal(cantium?.areaBlock, "MP 298");
  assert.match(cantium?.accidentType ?? "", /Fire/i);
  assert.equal(cantium?.sourceUrl, CANTIUM_URL);
  assert.ok(listed.every((r) => (r.date ?? "").startsWith("2026")));
  assert.ok(!listed.some((r) => /data\.bsee\.gov/i.test(r.sourceUrl)));

  assert.ok(isIncQueryDump(readFx("inc-query.html")));
  assert.ok(isEwellWarDump(readFx("ewell-war.csv")));
  assert.ok(isIncCountDump(readFx("inc-metadata.json")));
  assert.ok(isSiblingPack(readFx("csb-report.txt")));
  assert.ok(isSiblingPack(readFx("phmsa-order.txt")));
  assert.ok(!isRealBseeBody(readFx("inc-query.html")));
  assert.ok(!isRealBseeBody(readFx("ewell-war.csv")));
  assert.ok(!isRealBseeBody(readFx("inc-metadata.json")));
  assert.ok(!isRealBseeBody(readFx("csb-report.txt")));
  assert.ok(!isRealBseeBody(readFx("phmsa-order.txt")));
  assert.ok(isRealBseeBody(readFx("mp-298-cantium-2026-05-24.txt")));
  assert.ok(isRealBseeBody(readFx("mu-85-talos-2026-05-17.txt")));
  assert.ok(isRealBseeBody(readFx("ei-320-arena-2026-07-01.txt")));
  assert.ok(readFx("mp-298-cantium-2026-05-24.txt").includes(BODY_NEEDLE_SEED));
  assert.ok(readFx("mp-298-cantium-2026-05-24.txt").includes("glycol"));
  assert.match(readFx("mp-298-cantium-2026-05-24.txt"), /glycol pump hose fitting|failed hose connection/i);

  const cacheDir = mkdtempSync(join(tmpdir(), "bsee-reports-"));
  const prevDir = process.env.BSEE_REPORTS_DIR;
  process.env.BSEE_REPORTS_DIR = cacheDir;
  const snap = await collectBseeReports({ htmlDir: fixtures, limit: 18, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.BSEE_REPORTS_DIR;
  else process.env.BSEE_REPORTS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 3, `fixture collect caches official report text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === "mp-298-cantium-2026-05-24"));
  assert.ok(snap.cards.some((c) => c.id === "mu-85-talos-2026-05-17"));
  assert.ok(snap.cards.some((c) => c.id === "ei-320-arena-2026-07-01"));
  assert.ok(snap.cards.every((c) => isRealBseeBody(c.body)));
  const seedCard = snap.cards.find((c) => c.id === "mp-298-cantium-2026-05-24");
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_SEED));
  assert.match(seedCard?.institution ?? "", /Cantium/i);
  assert.equal(seedCard?.lease, "G01315");

  const assembled = assembleBseeSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildBseeManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.free, true);
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.amountAtomic, BSEE_REPORTS_AMOUNT_ATOMIC);
  assert.equal(manifest.oneAmountAtomic, BSEE_REPORTS_ONE_AMOUNT_ATOMIC);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  const manText = JSON.stringify(manifest);
  assert.ok(!manText.includes("%PDF-"), "free manifest is titles/links/counts");
  assert.ok(!manText.includes(BODY_NEEDLE_SEED), "free manifest has no seed report body");
  assert.ok(!manText.includes("glycol leaked from a failed hose"));
  const manSeed = (manifest.cards as { id?: string; body?: string; sourceUrl?: string; lease?: string }[]).find(
    (c) => c.id === "mp-298-cantium-2026-05-24",
  );
  assert.equal(manSeed?.sourceUrl, CANTIUM_URL);
  assert.equal(manSeed?.lease, "G01315");
  assert.ok(!("body" in (manSeed ?? {})));

  const filtered = filterBseeManifest(manifest, "cantium");
  assert.ok(Number(filtered.cardCount) >= 1);
  assert.ok((filtered.cards as { institution?: string }[]).every((c) => /cantium/i.test(c.institution ?? "")));

  const parsed = parseBseeText(readFx("mp-298-cantium-2026-05-24.txt"), SEED_LISTINGS[0]);
  assert.equal(parsed.lease, "G01315");
  assert.ok(parsed.body.includes(BODY_NEEDLE_SEED));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
