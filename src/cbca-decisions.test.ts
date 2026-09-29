import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BAY_ID,
  BODY_NEEDLE_BAY,
  BODY_NEEDLE_CARE,
  BODY_NEEDLE_ECG,
  BODY_NEEDLE_GILCHRIST,
  CARE_ID,
  CARD_FIELDS,
  CDA_LISTING_URL,
  ECG_ID,
  GILCHRIST_ID,
  GILCHRIST_URL,
  LICENSE,
  PRODUCT_ID,
  SEED_LISTINGS,
  assembleCbcaSnapshot,
  buildCbcaManifest,
  collectCbcaDecisions,
  filterCbcaManifest,
  isRawPdf,
  isRealCbcaBody,
  officialCbcaPdfUrl,
  parseCbcaIndex,
  CBCA_DECISIONS_AMOUNT_ATOMIC,
  CBCA_DECISIONS_MANIFEST_PATH,
  CBCA_DECISIONS_ONE_AMOUNT_ATOMIC,
  CBCA_DECISIONS_PATH,
} from "./cbca-decisions.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/cbca-decisions");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(CBCA_DECISIONS_PATH, "/cbca-decisions");
  assert.equal(CBCA_DECISIONS_MANIFEST_PATH, "/cbca-decisions/manifest.json");
  assert.equal(CBCA_DECISIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(CBCA_DECISIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(CDA_LISTING_URL.includes("cda-cases.html"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(CARD_FIELDS.includes("sourceUrl"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === GILCHRIST_ID && row.date === "2026-09-23" && row.kind === "Decision"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === ECG_ID && row.kind === "Dismissal"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === CARE_ID && row.program === "fema"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === BAY_ID && row.kind === "Order"));

  assert.equal(officialCbcaPdfUrl(GILCHRIST_URL), GILCHRIST_URL);
  assert.equal(officialCbcaPdfUrl("https://example.com/files/decisions/2026/x.pdf"), null);
  assert.equal(officialCbcaPdfUrl("https://www.cbca.gov/howto/SFTPRule4SubmissionGuide.pdf"), null);

  const listed = parseCbcaIndex(readFx("listing.html"));
  assert.ok(listed.some((row) => row.id === GILCHRIST_ID && row.date === "2026-09-23" && row.institution.includes("Gilchrist")));
  assert.equal(officialCbcaPdfUrl(listed.find((row) => row.id === GILCHRIST_ID)?.sourceUrl), GILCHRIST_URL);
  assert.ok(listed.some((row) => row.id === ECG_ID && row.kind === "Dismissal" && row.program === "cda"));
  assert.ok(listed.some((row) => row.id === CARE_ID && row.program === "fema" && row.kind === "Decision"));
  assert.ok(listed.some((row) => row.id === BAY_ID && row.kind === "Order"));
  assert.ok(listed.some((row) => row.program === "relocation" && row.docket === "CBCA 8897-RELO"));
  assert.ok(listed.some((row) => row.program === "travel" && row.kind === "Dismissal"));
  assert.ok(!listed.some((row) => /submission guide/i.test(row.institution)), "howto PDF is not this SKU");
  assert.equal(listed[0]?.id, GILCHRIST_ID, "newest slip sorts first");

  assert.ok(isRealCbcaBody(readFx(`${GILCHRIST_ID}.txt`)));
  assert.ok(readFx(`${GILCHRIST_ID}.txt`).includes(BODY_NEEDLE_GILCHRIST));
  assert.ok(readFx(`${ECG_ID}.txt`).includes(BODY_NEEDLE_ECG));
  assert.ok(readFx(`${CARE_ID}.txt`).includes(BODY_NEEDLE_CARE));
  assert.ok(readFx(`${BAY_ID}.txt`).includes(BODY_NEEDLE_BAY));
  assert.ok(!isRealCbcaBody(readFx("not-decision.txt")));
  assert.ok(isRawPdf(readFx("raw-pdf.txt")));
  assert.ok(!isRealCbcaBody(readFx("raw-pdf.txt")));

  const cacheDir = mkdtempSync(join(tmpdir(), "cbca-decisions-"));
  const prevDir = process.env.CBCA_DECISIONS_DIR;
  process.env.CBCA_DECISIONS_DIR = cacheDir;
  const snap = await collectCbcaDecisions({ listingDir: fixtures, limit: 6, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.CBCA_DECISIONS_DIR;
  else process.env.CBCA_DECISIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.equal(snap.asOf, "2026-09-23", "asOf is the newest cached decision date");
  assert.equal(snap.fetchedPdfs, 0);
  assert.ok(snap.cards.some((card) => card.id === GILCHRIST_ID && card.body.includes(BODY_NEEDLE_GILCHRIST)));
  assert.ok(snap.cards.some((card) => card.id === ECG_ID && card.body.includes(BODY_NEEDLE_ECG)));
  assert.ok(snap.cards.some((card) => card.id === CARE_ID && card.body.includes(BODY_NEEDLE_CARE) && card.program === "fema"));
  assert.ok(snap.cards.some((card) => card.id === BAY_ID && card.kind === "Order" && card.body.includes(BODY_NEEDLE_BAY)));
  assert.ok(snap.cards.every((card) => isRealCbcaBody(card.body)));
  assert.ok(!snap.cards.some((card) => card.body.includes("%PDF-")));
  assert.ok(!snap.cards.some((card) => card.id.includes("8716")), "fixture row without a local text is not a card");

  const manifest = buildCbcaManifest(assembleCbcaSnapshot(snap.cards, snap.fetchedAt));
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.asOf, "2026-09-23");
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 4);
  const freeCards = manifest.cards as {
    body?: string;
    sourceUrl?: string;
    docket?: string;
    kind?: string;
    institution?: string;
    program?: string;
  }[];
  assert.ok(freeCards.every((card) => !card.body));
  assert.ok(freeCards.every((card) => card.sourceUrl?.startsWith("https://www.cbca.gov/files/decisions/")));
  assert.ok(freeCards.some((card) => card.docket === "CBCA 8825" && card.kind === "Decision" && card.institution?.includes("Gilchrist")));
  assert.ok(freeCards.some((card) => card.program === "fema" && card.kind === "Order"));
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes(BODY_NEEDLE_GILCHRIST));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_ECG));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_CARE));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_BAY));
  assert.ok(!manifestJson.includes("%PDF-"));
  assert.ok(Number(filterCbcaManifest(manifest, "8825").cardCount) >= 1);
  assert.ok(Number(filterCbcaManifest(manifest, "gilchrist").cardCount) >= 1);
  assert.ok(Number(filterCbcaManifest(manifest, "dismissal").cardCount) >= 1);
  assert.ok(Number(filterCbcaManifest(manifest, "fema").cardCount) >= 1);
  assert.equal(filterCbcaManifest(manifest, BODY_NEEDLE_GILCHRIST).cardCount, 0, "opinion text is not on the free manifest");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
