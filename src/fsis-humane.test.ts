import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import {
  ATTRIBUTION,
  BODY_NEEDLE_NOIE,
  BODY_NEEDLE_SEED,
  CARD_FIELDS,
  FSIS_HUMANE_AMOUNT_ATOMIC,
  FSIS_HUMANE_MANIFEST_PATH,
  FSIS_HUMANE_ONE_AMOUNT_ATOMIC,
  FSIS_HUMANE_PATH,
  LICENSE,
  LISTING_URL,
  PRODUCT_ID,
  SEED_LISTINGS,
  assembleFsisHumaneSnapshot,
  buildFsisHumaneManifest,
  collectFsisHumane,
  compactForMatch,
  filterFsisHumaneManifest,
  isFoiaPeopleDump,
  isIndexHtmlChrome,
  isMpiDirectoryDump,
  isQerHatsDump,
  isRealFsisHumaneBody,
  officialFsisHumanePdfUrl,
  parseListingHtml,
  parseOfficialFilename,
  parseFsisHumaneText,
} from "./fsis-humane.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fsis-humane");
const SEED_URL = "https://www.fsis.usda.gov/sites/default/files/media_file/documents/7420MV-NOROS-04252024.pdf";

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(FSIS_HUMANE_PATH, "/fsis-humane");
  assert.equal(FSIS_HUMANE_MANIFEST_PATH, "/fsis-humane/manifest.json");
  assert.ok(LISTING_URL.includes("humane-handling-enforcement"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "7420mv-noros-04252024"));

  const listed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(listed.length >= 20, `index table yields letter PDFs, got ${listed.length}`);
  const recent = listed.find((r) => r.id === "m47033-nosha-09012026");
  assert.ok(recent, "NOSHA-M47033-09012026 parses (type-first filename)");
  assert.match(recent?.institution ?? "", /Salsabil Meat Processing/i);
  assert.equal(recent?.letterType, "NOSHA");
  assert.equal(recent?.date, "2026-09-01");
  const noie = listed.find((r) => r.id === "m40110-noie-07302026");
  assert.ok(noie);
  assert.match(noie?.institution ?? "", /Collagen Solutions/i);
  assert.equal(noie?.letterType, "NOIE");
  assert.ok(listed.some((r) => r.letterType === "NOROS"), "reinstatement letters are harvested");
  assert.ok(listed.some((r) => r.id === "1749-nosha-04102026" || r.estNumber === "1749"), "bare establishment numbers");
  assert.ok(listed.every((r) => officialFsisHumanePdfUrl(r.sourceUrl)));

  assert.equal(officialFsisHumanePdfUrl(SEED_URL), SEED_URL);
  assert.equal(officialFsisHumanePdfUrl("https://www.osha.gov/data.json"), null);
  assert.equal(officialFsisHumanePdfUrl("https://www.fsis.usda.gov/inspection/regulatory-enforcement/humane-handling-enforcement"), null);
  assert.equal(
    officialFsisHumanePdfUrl("https://www.aphis.usda.gov/sites/default/files/media_file/documents/M40110-NOIE-07302026.pdf"),
    null,
  );

  const seedName = parseOfficialFilename("7420MV-NOROS-04252024.pdf");
  assert.equal(seedName?.letterType, "NOROS");
  assert.equal(seedName?.estToken, "7420MV");
  assert.equal(seedName?.mmddyyyy, "04252024");
  const typeFirst = parseOfficialFilename("NOSHA-M47033-09012026.pdf");
  assert.equal(typeFirst?.letterType, "NOSHA");
  assert.equal(typeFirst?.estToken, "M47033");
  const dual = parseOfficialFilename("M1745-P1745-NOS-07072026.pdf");
  assert.equal(dual?.letterType, "NOS");
  assert.equal(dual?.estToken, "M1745-P1745");

  assert.ok(isQerHatsDump(readFx("qer-hats.txt")));
  assert.ok(isMpiDirectoryDump(readFx("mpi-directory.txt")));
  assert.ok(isFoiaPeopleDump(readFx("foia-people.txt")));
  assert.ok(!isRealFsisHumaneBody(readFx("qer-hats.txt")));
  assert.ok(!isRealFsisHumaneBody(readFx("mpi-directory.txt")));
  assert.ok(!isRealFsisHumaneBody(readFx("foia-people.txt")));
  assert.ok(!isRealFsisHumaneBody(readFx("no-body.txt")));
  assert.ok(isIndexHtmlChrome(readFx("listing-excerpt.html")));
  assert.ok(!isRealFsisHumaneBody(readFx("listing-excerpt.html")));
  assert.ok(isRealFsisHumaneBody(readFx("7420mv-noros-04252024.txt")));
  assert.ok(isRealFsisHumaneBody(readFx("m40110-noie-07302026.txt")));
  assert.ok(isRealFsisHumaneBody(readFx("m47033-nos-08202026.txt")));
  assert.ok(readFx("7420mv-noros-04252024.txt").includes(BODY_NEEDLE_SEED));
  assert.ok(compactForMatch(readFx("m40110-noie-07302026.txt")).includes(BODY_NEEDLE_NOIE));
  assert.ok(!readFx("listing-excerpt.html").includes(BODY_NEEDLE_SEED), "index HTML is chrome");
  assert.ok(!readFx("listing-excerpt.html").includes(BODY_NEEDLE_NOIE));
  assert.ok(!readFx("listing-excerpt.html").includes("B-45131621"));

  const cacheDir = mkdtempSync(join(tmpdir(), "fsis-humane-"));
  const prevDir = process.env.FSIS_HUMANE_DIR;
  process.env.FSIS_HUMANE_DIR = cacheDir;
  const snap = await collectFsisHumane({ htmlDir: fixtures, limit: 6, maxFetch: 0, pauseMs: 0 });
  if (prevDir === undefined) delete process.env.FSIS_HUMANE_DIR;
  else process.env.FSIS_HUMANE_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 4, `fixture collect caches official letter text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === "7420mv-noros-04252024"));
  assert.ok(snap.cards.some((c) => c.id === "m47033-nosha-09012026"));
  assert.ok(snap.cards.some((c) => c.id === "m40110-noie-07302026"));
  assert.ok(snap.cards.every((c) => isRealFsisHumaneBody(c.body)));
  const seedCard = snap.cards.find((c) => c.id === "7420mv-noros-04252024");
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_SEED));
  assert.match(seedCard?.institution ?? "", /Honest Meats/i);

  const assembled = assembleFsisHumaneSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildFsisHumaneManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.free, true);
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.amountAtomic, FSIS_HUMANE_AMOUNT_ATOMIC);
  assert.equal(manifest.oneAmountAtomic, FSIS_HUMANE_ONE_AMOUNT_ATOMIC);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  const manText = JSON.stringify(manifest);
  assert.ok(!manText.includes("%PDF-"), "free manifest is titles/links/counts");
  assert.ok(!manText.includes(BODY_NEEDLE_SEED), "free manifest has no seed letter body");
  assert.ok(!manText.includes(BODY_NEEDLE_NOIE));
  assert.ok(!manText.includes("B-45131621"));
  const manSeed = (manifest.cards as { id?: string; body?: string; sourceUrl?: string }[]).find(
    (c) => c.id === "7420mv-noros-04252024",
  );
  assert.equal(manSeed?.sourceUrl, SEED_URL);
  assert.ok(!("body" in (manSeed ?? {})));

  const filtered = filterFsisHumaneManifest(manifest, "salsabil");
  assert.ok(Number(filtered.cardCount) >= 1);
  assert.ok((filtered.cards as { institution?: string }[]).every((c) => /salsabil/i.test(c.institution ?? "")));

  const parsed = parseFsisHumaneText(readFx("7420mv-noros-04252024.txt"), SEED_LISTINGS[0]);
  assert.equal(parsed.letterType, "NOROS");
  assert.ok(parsed.body.includes(BODY_NEEDLE_SEED));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
