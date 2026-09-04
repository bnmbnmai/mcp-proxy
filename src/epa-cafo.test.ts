import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_SEED,
  CARD_FIELDS,
  EPA_CAFO_AMOUNT_ATOMIC,
  EPA_CAFO_MANIFEST_PATH,
  EPA_CAFO_ONE_AMOUNT_ATOMIC,
  EPA_CAFO_PATH,
  LICENSE,
  LISTING_URL,
  PRODUCT_ID,
  SEED_LISTINGS,
  assembleEpaCafoSnapshot,
  buildEpaCafoManifest,
  collectEpaCafo,
  filterEpaCafoManifest,
  isEchoJsonDump,
  isFifraOnlyDump,
  isHqSettlementHtml,
  isIcisFecDump,
  isNpdesPermitDump,
  isRealEpaCafoBody,
  isSuperfundRodDump,
  officialEpaCafoPdfUrl,
  parseEpaCafoText,
  parseFilingsHtml,
} from "./epa-cafo.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/epa-cafo");
const APACHE_URL =
  "https://www.epa.gov/system/files/documents/2026-07/apache-feedyard_nmg010040_cwa0620261792_07142026.pdf";
const CAMINO_URL =
  "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/1FAA7240561D1C6B85258E09003C701D/$File/Camino%20Real%20Food%20Inc.%20(MM-09-2026-0093)-Filed%20CAFO.pdf";

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(EPA_CAFO_PATH, "/epa-cafo");
  assert.equal(EPA_CAFO_MANIFEST_PATH, "/epa-cafo/manifest.json");
  assert.ok(LISTING_URL.includes("epaadmin.nsf"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "CWA-06-2026-1792"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "MM-09-2026-0093"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "CWA-07-2026-0005"));

  assert.equal(officialEpaCafoPdfUrl(APACHE_URL), APACHE_URL);
  assert.equal(officialEpaCafoPdfUrl(CAMINO_URL), CAMINO_URL.replace(/%20/g, " ").replace(/%28/g, "(").replace(/%29/g, ")"));
  assert.equal(officialEpaCafoPdfUrl("https://echo.epa.gov/facility/110000.json"), null);
  assert.equal(officialEpaCafoPdfUrl("https://www.epa.gov/enforcement/civil-cases-and-settlements"), null);
  assert.equal(officialEpaCafoPdfUrl("https://www.epa.gov/npdes-permits/example-permit.pdf"), null);

  const listed = parseFilingsHtml(readFx("listing-excerpt.html"));
  assert.ok(listed.some((r) => /CAFO|Consent Agreement/i.test(r.label)));

  assert.ok(isEchoJsonDump(readFx("echo-facility.json")));
  assert.ok(isIcisFecDump(readFx("icis-fec.csv")));
  assert.ok(isHqSettlementHtml(readFx("hq-settlement.html")));
  assert.ok(isNpdesPermitDump(readFx("npdes-permit.txt")));
  assert.ok(isFifraOnlyDump(readFx("fifra-only.txt")));
  assert.ok(isSuperfundRodDump(readFx("superfund-rod.txt")));
  assert.ok(!isRealEpaCafoBody(readFx("echo-facility.json")));
  assert.ok(!isRealEpaCafoBody(readFx("icis-fec.csv")));
  assert.ok(!isRealEpaCafoBody(readFx("hq-settlement.html")));
  assert.ok(!isRealEpaCafoBody(readFx("npdes-permit.txt")));
  assert.ok(!isRealEpaCafoBody(readFx("fifra-only.txt")));
  assert.ok(!isRealEpaCafoBody(readFx("superfund-rod.txt")));
  assert.ok(isRealEpaCafoBody(readFx("cwa-06-2026-1792.txt")));
  assert.ok(isRealEpaCafoBody(readFx("cwa-07-2026-0005.txt")));
  assert.ok(isRealEpaCafoBody(readFx("mm-09-2026-0093.txt")));
  assert.ok(readFx("cwa-06-2026-1792.txt").includes(BODY_NEEDLE_SEED));

  const cacheDir = mkdtempSync(join(tmpdir(), "epa-cafo-"));
  const prevDir = process.env.EPA_CAFO_DIR;
  process.env.EPA_CAFO_DIR = cacheDir;
  const snap = await collectEpaCafo({ htmlDir: fixtures, limit: 8, maxFetch: 0, pauseMs: 0 });
  if (prevDir === undefined) delete process.env.EPA_CAFO_DIR;
  else process.env.EPA_CAFO_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 3, `fixture collect caches official letter text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === "CWA-06-2026-1792"));
  assert.ok(snap.cards.some((c) => c.id === "MM-09-2026-0093"));
  assert.ok(snap.cards.some((c) => c.id === "CWA-07-2026-0005"));
  assert.ok(snap.cards.every((c) => isRealEpaCafoBody(c.body)));
  const seedCard = snap.cards.find((c) => c.id === "CWA-06-2026-1792");
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_SEED));
  assert.match(seedCard?.institution ?? "", /Apache Feedyard/i);

  const assembled = assembleEpaCafoSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildEpaCafoManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.free, true);
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.amountAtomic, EPA_CAFO_AMOUNT_ATOMIC);
  assert.equal(manifest.oneAmountAtomic, EPA_CAFO_ONE_AMOUNT_ATOMIC);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  const manText = JSON.stringify(manifest);
  assert.ok(!manText.includes("%PDF-"), "free manifest is titles/links/counts");
  assert.ok(!manText.includes(BODY_NEEDLE_SEED), "free manifest has no seed letter body");
  assert.ok(!manText.includes("Rabbit Ear Creek"));
  const manSeed = (manifest.cards as { id?: string; body?: string; sourceUrl?: string }[]).find(
    (c) => c.id === "CWA-06-2026-1792",
  );
  assert.equal(manSeed?.sourceUrl, APACHE_URL);
  assert.ok(!("body" in (manSeed ?? {})));

  const filtered = filterEpaCafoManifest(manifest, "camino");
  assert.ok(Number(filtered.cardCount) >= 1);
  assert.ok((filtered.cards as { institution?: string }[]).every((c) => /camino/i.test(c.institution ?? "")));

  const parsed = parseEpaCafoText(readFx("cwa-06-2026-1792.txt"), SEED_LISTINGS[0]);
  assert.equal(parsed.docket, "CWA-06-2026-1792");
  assert.ok(parsed.body.includes(BODY_NEEDLE_SEED));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
