import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_ISLER,
  BODY_NEEDLE_PHELPS,
  BODY_NEEDLE_RIVERA,
  BODY_NEEDLE_WAIS,
  CARD_FIELDS,
  ISLER_ID,
  ISLER_URL,
  LICENSE,
  MSPB_DECISIONS_AMOUNT_ATOMIC,
  MSPB_DECISIONS_MANIFEST_PATH,
  MSPB_DECISIONS_ONE_AMOUNT_ATOMIC,
  MSPB_DECISIONS_PATH,
  NONPREC_MANIFEST_URL,
  PHELPS_ID,
  PRODUCT_ID,
  RIVERA_ID,
  SEED_LISTINGS,
  WAIS_ID,
  assembleMspbSnapshot,
  buildMspbManifest,
  collectMspbDecisions,
  enabledKinds,
  filterMspbManifest,
  filterMspbManifestByKind,
  isRawPdf,
  isRealMspbBody,
  officialMspbPdfUrl,
  parseMspbManifest,
} from "./mspb-decisions.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/mspb-decisions");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(MSPB_DECISIONS_PATH, "/mspb-decisions");
  assert.equal(MSPB_DECISIONS_MANIFEST_PATH, "/mspb-decisions/manifest.json");
  assert.equal(MSPB_DECISIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(MSPB_DECISIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(NONPREC_MANIFEST_URL.includes("/nonprecedential/"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(CARD_FIELDS.includes("sourceUrl"));
  assert.ok(CARD_FIELDS.includes("kind"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === ISLER_ID && row.date === "2026-09-28" && row.kind === "nonprecedential"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === WAIS_ID && row.kind === "nonprecedential"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === PHELPS_ID && row.agency.includes("General Services")));
  assert.ok(SEED_LISTINGS.some((row) => row.id === RIVERA_ID && row.kind === "precedential" && row.citation === "2026 MSPB 8"));
  assert.ok(SEED_LISTINGS.filter((row) => row.kind === "nonprecedential").length >= 3, "primary bag is nonprecedential");

  const prevKinds = process.env.MSPB_DECISIONS_KINDS;
  process.env.MSPB_DECISIONS_KINDS = "precedential";
  assert.ok(enabledKinds().includes("nonprecedential"), "a precedential-only env still keeps the primary bag");
  assert.ok(enabledKinds()[0] === "nonprecedential");
  if (prevKinds === undefined) delete process.env.MSPB_DECISIONS_KINDS;
  else process.env.MSPB_DECISIONS_KINDS = prevKinds;

  assert.equal(officialMspbPdfUrl("Isler_Tanetta_N_DC-3443-25-2251-I-1_4142556.pdf", "nonprecedential"), ISLER_URL);
  assert.equal(officialMspbPdfUrl("../westlaw/slip.pdf", "nonprecedential"), null);
  assert.equal(officialMspbPdfUrl("not-a-decision.html", "nonprecedential"), null);
  assert.equal(officialMspbPdfUrl("https://example.com/decisions/nonprecedential/x.pdf", "nonprecedential"), null);

  const listed = parseMspbManifest(readFx("nonprecedential.json"), "nonprecedential");
  assert.ok(listed.some((row) => row.id === ISLER_ID && row.date === "2026-09-28" && row.institution.includes("Isler")));
  assert.equal(listed.find((row) => row.id === ISLER_ID)?.sourceUrl, ISLER_URL);
  assert.ok(listed.some((row) => row.id === WAIS_ID && row.kind === "nonprecedential" && row.orderKind === "Final Order"));
  assert.ok(listed.some((row) => row.id === PHELPS_ID && row.agency.includes("General Services")));
  assert.ok(!listed.some((row) => row.id.includes("0000")), "JSON full-text, HTML, and path-traversal rows are not this SKU");
  assert.equal(listed[0]?.id, ISLER_ID, "newest nonprecedential slip sorts first");
  const prec = parseMspbManifest(readFx("precedential.json"), "precedential");
  assert.ok(prec.some((row) => row.id === RIVERA_ID && row.kind === "precedential" && row.citation === "2026 MSPB 8"));

  assert.ok(isRealMspbBody(readFx(`${ISLER_ID}.txt`)));
  assert.ok(readFx(`${ISLER_ID}.txt`).includes(BODY_NEEDLE_ISLER));
  assert.ok(readFx(`${WAIS_ID}.txt`).includes(BODY_NEEDLE_WAIS));
  assert.ok(readFx(`${PHELPS_ID}.txt`).includes(BODY_NEEDLE_PHELPS));
  assert.ok(readFx(`${RIVERA_ID}.txt`).includes(BODY_NEEDLE_RIVERA));
  assert.ok(!isRealMspbBody(readFx("not-decision.txt")));
  assert.ok(isRawPdf(readFx("raw-pdf.txt")));
  assert.ok(!isRealMspbBody(readFx("raw-pdf.txt")));
  assert.ok(!isRealMspbBody('{"DOCUMENT_CONTENT":"UNITED STATES OF AMERICA MERIT SYSTEMS PROTECTION BOARD FINAL ORDER secret json body that is long enough to look like a decision but is the manifest full text rather than the official PDF."}'));

  const cacheDir = mkdtempSync(join(tmpdir(), "mspb-decisions-"));
  const prevDir = process.env.MSPB_DECISIONS_DIR;
  process.env.MSPB_DECISIONS_DIR = cacheDir;
  const snap = await collectMspbDecisions({ listingDir: fixtures, limit: 6, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.MSPB_DECISIONS_DIR;
  else process.env.MSPB_DECISIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.equal(snap.asOf, "2026-09-28", "asOf is the newest cached decision date");
  assert.equal(snap.fetchedPdfs, 0);
  assert.ok(snap.cards.some((card) => card.id === ISLER_ID && card.kind === "nonprecedential" && card.body.includes(BODY_NEEDLE_ISLER)));
  assert.ok(snap.cards.some((card) => card.id === WAIS_ID && card.body.includes(BODY_NEEDLE_WAIS)));
  assert.ok(snap.cards.some((card) => card.id === PHELPS_ID && card.body.includes(BODY_NEEDLE_PHELPS)));
  assert.ok(snap.cards.some((card) => card.id === RIVERA_ID && card.kind === "precedential" && card.body.includes(BODY_NEEDLE_RIVERA)));
  assert.ok(snap.cards.filter((card) => card.kind === "nonprecedential").length >= 3);
  assert.ok(snap.cards.every((card) => isRealMspbBody(card.body)));
  assert.ok(!snap.cards.some((card) => card.body.includes("%PDF-")));
  assert.ok(!snap.cards.some((card) => card.body.includes("SECRET MSPB JSON")));
  assert.equal(snap.cards[0]?.id, ISLER_ID);

  const manifest = buildMspbManifest(assembleMspbSnapshot(snap.cards, snap.fetchedAt));
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.asOf, "2026-09-28");
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 4);
  const freeCards = manifest.cards as {
    body?: string;
    sourceUrl?: string;
    docket?: string;
    kind?: string;
    orderKind?: string;
    institution?: string;
    citation?: string;
  }[];
  assert.ok(freeCards.every((card) => !card.body));
  assert.ok(freeCards.every((card) => card.sourceUrl?.startsWith("https://mspbpublic.azurewebsites.net/decisions/")));
  assert.ok(freeCards.some((card) => card.docket === "DC-3443-25-2251-I-1" && card.kind === "nonprecedential" && card.institution?.includes("Isler")));
  assert.ok(freeCards.some((card) => card.kind === "precedential" && card.citation === "2026 MSPB 8" && card.orderKind === "Opinion and Order"));
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes(BODY_NEEDLE_ISLER));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_WAIS));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_PHELPS));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_RIVERA));
  assert.ok(!manifestJson.includes("%PDF-"));
  assert.ok(!manifestJson.includes("DOCUMENT_CONTENT"));
  assert.ok(Number(filterMspbManifest(manifest, "nonprecedential").cardCount) >= 3);
  assert.ok(Number(filterMspbManifest(manifest, "precedential").cardCount) >= 1);
  const precOnly = filterMspbManifestByKind(manifest, "precedential");
  const precCards = precOnly.cards as { kind?: string }[];
  assert.ok(precCards.length >= 1);
  assert.ok(precCards.every((card) => card.kind === "precedential"));
  const npOnly = filterMspbManifestByKind(manifest, "nonprecedential");
  assert.ok(Number(npOnly.cardCount) >= 3);
  assert.ok((npOnly.cards as { kind?: string }[]).every((card) => card.kind === "nonprecedential"));
  assert.ok(Number(filterMspbManifest(manifest, "isler").cardCount) >= 1);
  assert.ok(Number(filterMspbManifest(manifest, "2026 MSPB 8").cardCount) >= 1);
  assert.equal(filterMspbManifest(manifest, BODY_NEEDLE_ISLER).cardCount, 0, "opinion text is not on the free manifest");
  assert.equal(filterMspbManifest(manifest, BODY_NEEDLE_RIVERA).cardCount, 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
