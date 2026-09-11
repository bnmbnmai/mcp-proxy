import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_JUDGE,
  BODY_NEEDLE_SEED,
  CARD_FIELDS,
  FAA_CIVIL_PENALTY_AMOUNT_ATOMIC,
  FAA_CIVIL_PENALTY_MANIFEST_PATH,
  FAA_CIVIL_PENALTY_ONE_AMOUNT_ATOMIC,
  FAA_CIVIL_PENALTY_PATH,
  HUB_URL,
  LEAHEY_GUID,
  LICENSE,
  LISTING_URL,
  PRODUCT_ID,
  SEED_LISTINGS,
  assembleFaaCivilPenaltySnapshot,
  buildFaaCivilPenaltyManifest,
  catalogId,
  collectFaaCivilPenalty,
  filterFaaCivilPenaltyManifest,
  isAirLetterTwin,
  isNmsAsiasJson,
  isRealFaaCivilPenaltyBody,
  keepListing,
  officialPdfUrl,
  parseFaaCivilPenaltyText,
  parseKind,
  parseMetadatasJson,
} from "./faa-civil-penalty.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/faa-civil-penalty");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(FAA_CIVIL_PENALTY_PATH, "/faa-civil-penalty");
  assert.equal(FAA_CIVIL_PENALTY_MANIFEST_PATH, "/faa-civil-penalty/manifest.json");
  assert.ok(LISTING_URL.includes("CIVIL_PENALTY_APPEALS"));
  assert.ok(HUB_URL.includes("civil_penalty"));
  assert.ok(!LISTING_URL.toLowerCase().includes("air-letters"));
  assert.ok(!LISTING_URL.toLowerCase().includes("asias"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "2026-04" && r.guid === LEAHEY_GUID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "2026-03"));

  assert.equal(officialPdfUrl(LEAHEY_GUID), `https://drs.faa.gov/api/content/reports/${LEAHEY_GUID}`);
  assert.equal(catalogId("2026-04", LEAHEY_GUID), "2026-04");
  assert.equal(parseKind("ORDER GRANTING MOTION"), "Administrator Order");
  assert.equal(parseKind("Decision and Order"), "Decision and Order");
  assert.equal(
    keepListing({
      orderNo: "2026-04",
      mimeType: "application/pdf",
      title: "Amicus",
      subjects: "Amicus Curiae Briefs",
      guid: LEAHEY_GUID,
    }),
    true,
  );
  assert.equal(
    keepListing({
      orderNo: "2026-04",
      mimeType: "application/json",
      title: "NMS dump",
      subjects: "ASIAS",
      guid: LEAHEY_GUID,
    }),
    false,
  );

  const parsedList = parseMetadatasJson(JSON.parse(readFx("metadatas.json")));
  assert.ok(parsedList.listedCount >= 4);
  assert.ok(parsedList.listed.some((r) => r.id === "2026-04"));
  assert.ok(parsedList.listed.some((r) => r.id === "2026-03"));
  const leahey = parsedList.listed.find((r) => r.id === "2026-04");
  assert.equal(leahey?.docket, "G13-22-040");
  assert.match(leahey?.institution ?? "", /Leahey/i);
  assert.equal(leahey?.guid, LEAHEY_GUID);
  assert.equal(leahey?.date, "2026-07-02");

  assert.ok(isNmsAsiasJson(readFx("nms-asias.json")));
  assert.ok(isAirLetterTwin(readFx("air-letter-twin.txt")));
  assert.ok(!isRealFaaCivilPenaltyBody(readFx("nms-asias.json")));
  assert.ok(!isRealFaaCivilPenaltyBody(readFx("air-letter-twin.txt")));
  assert.ok(isRealFaaCivilPenaltyBody(readFx("2026-04.txt")));
  assert.ok(isRealFaaCivilPenaltyBody(readFx("2026-03.txt")));
  assert.ok(readFx("2026-04.txt").includes(BODY_NEEDLE_SEED));
  assert.ok(readFx("2026-04.txt").includes(BODY_NEEDLE_JUDGE));
  assert.ok(readFx("2026-04.txt").includes("G13-22-040"));

  const metaText = readFx("metadatas.json");
  assert.ok(!metaText.includes(BODY_NEEDLE_SEED), "card JSON is metadata");
  assert.ok(!metaText.includes(BODY_NEEDLE_JUDGE), "card JSON has no judge names");
  assert.ok(metaText.includes("G13-22-040"), "docket is card metadata");
  assert.ok(metaText.includes("Leahey"), "case name is card metadata");

  const cacheDir = mkdtempSync(join(tmpdir(), "faa-civil-penalty-"));
  const prevDir = process.env.FAA_CIVIL_PENALTY_DIR;
  process.env.FAA_CIVIL_PENALTY_DIR = cacheDir;
  const snap = await collectFaaCivilPenalty({ htmlDir: fixtures, limit: 4, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.FAA_CIVIL_PENALTY_DIR;
  else process.env.FAA_CIVIL_PENALTY_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 2, `fixture collect caches official Order text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === "2026-04"));
  assert.ok(snap.cards.some((c) => c.id === "2026-03"));
  assert.ok(snap.cards.every((c) => isRealFaaCivilPenaltyBody(c.body)));
  const seedCard = snap.cards.find((c) => c.id === "2026-04");
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_SEED));
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_JUDGE));
  assert.match(seedCard?.institution ?? "", /Leahey/i);

  const assembled = assembleFaaCivilPenaltySnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildFaaCivilPenaltyManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.free, true);
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.amountAtomic, FAA_CIVIL_PENALTY_AMOUNT_ATOMIC);
  assert.equal(manifest.oneAmountAtomic, FAA_CIVIL_PENALTY_ONE_AMOUNT_ATOMIC);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  const manText = JSON.stringify(manifest);
  assert.ok(!manText.includes("%PDF-"), "free manifest is titles/links/counts");
  assert.ok(!manText.includes(BODY_NEEDLE_SEED), "free manifest has no seed Order narrative");
  assert.ok(!manText.includes(BODY_NEEDLE_JUDGE));
  const manSeed = (manifest.cards as { id?: string; body?: string; sourceUrl?: string }[]).find(
    (c) => c.id === "2026-04",
  );
  assert.ok(manSeed?.sourceUrl);
  assert.ok(!("body" in (manSeed ?? {})));

  const filtered = filterFaaCivilPenaltyManifest(manifest, "leahey");
  assert.ok(Number(filtered.cardCount) >= 1);
  assert.ok((filtered.cards as { institution?: string }[]).every((c) => /leahey/i.test(c.institution ?? "")));

  const parsed = parseFaaCivilPenaltyText(readFx("2026-04.txt"), SEED_LISTINGS[0]);
  assert.equal(parsed.id, "2026-04");
  assert.equal(parsed.docket, "G13-22-040");
  assert.ok(parsed.body.includes(BODY_NEEDLE_SEED));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
