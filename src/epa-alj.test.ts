import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_SEED,
  CARD_FIELDS,
  EPA_ALJ_AMOUNT_ATOMIC,
  EPA_ALJ_MANIFEST_PATH,
  EPA_ALJ_ONE_AMOUNT_ATOMIC,
  EPA_ALJ_PATH,
  LICENSE,
  LISTING_URL,
  NSF_PATH,
  PEPPERELL_URL,
  PRODUCT_ID,
  SEED_LISTINGS,
  WILSON_URL,
  assembleEpaAljSnapshot,
  buildEpaAljManifest,
  catalogId,
  collectEpaAlj,
  filterEpaAljManifest,
  isCafoTwin,
  isRealEpaAljBody,
  isRhcSibling,
  officialEpaAljPdfUrl,
  parseDecisionsView,
  parseDocumentPageHtml,
  parseEpaAljText,
  parseKind,
} from "./epa-alj.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/epa-alj");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(EPA_ALJ_PATH, "/epa-alj");
  assert.equal(EPA_ALJ_MANIFEST_PATH, "/epa-alj/manifest.json");
  assert.ok(LISTING_URL.includes("oarm/alj/alj_web_docket.nsf"));
  assert.ok(!LISTING_URL.toLowerCase().includes("oa/rhc/epaadmin.nsf"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "FIFRA-07-2023-0135-2026-09-01"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "CWA-01-2026-0030-2026-09-04"));

  assert.equal(officialEpaAljPdfUrl(WILSON_URL), WILSON_URL);
  assert.equal(officialEpaAljPdfUrl(` ${WILSON_URL} `), WILSON_URL);
  assert.equal(officialEpaAljPdfUrl(PEPPERELL_URL), PEPPERELL_URL);
  assert.equal(
    officialEpaAljPdfUrl(
      "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/FIFRA-05-2026-0015_CAFO.pdf",
    ),
    null,
    "RHC CAFO twins are not this bag",
  );
  assert.equal(officialEpaAljPdfUrl("https://www.oshrc.gov/wp-content/uploads/ALJ-Dec-Finley-Farmers-24-0889-EAJA.pdf"), null);

  assert.equal(parseKind("Initial Decision"), "Initial Decision");
  assert.equal(parseKind("ALJ Order"), "ALJ Order");
  assert.equal(parseKind("Consent Agreement and Final Order"), null);
  assert.equal(catalogId("FIFRA-07-2023-0135", "2026-09-01", "33055BE9DA2755FA85258E650060F6AC"), "FIFRA-07-2023-0135-2026-09-01");

  const listed = parseDecisionsView(readFx("listing-excerpt.html"));
  assert.ok(listed.some((r) => r.id === "FIFRA-07-2023-0135-2026-09-01"));
  assert.ok(listed.some((r) => r.id === "CWA-01-2026-0030-2026-09-04"));
  const wilson = listed.find((r) => r.id === "FIFRA-07-2023-0135-2026-09-01");
  assert.equal(wilson?.kind, "Initial Decision");
  assert.match(wilson?.institution ?? "", /Wilson/i);
  assert.equal(wilson?.docket, "FIFRA-07-2023-0135");
  const pepperell = listed.find((r) => r.id === "CWA-01-2026-0030-2026-09-04");
  assert.equal(pepperell?.kind, "ALJ Order");
  assert.match(pepperell?.institution ?? "", /Pepperell/i);
  assert.ok(!listed.some((r) => /consent agreement and final order|\bCAFO\b/i.test(r.title + r.kind)));
  assert.ok(listed.every((r) => r.docUrl && r.docUrl.includes(NSF_PATH)));
  assert.equal(listed[0]?.kind, "Initial Decision", "prefer merits Initial Decision first");

  const wilsonPdf = parseDocumentPageHtml(readFx("wilson-doc.html"));
  assert.equal(wilsonPdf, WILSON_URL);
  const pepperellPdf = parseDocumentPageHtml(readFx("pepperell-doc.html"));
  assert.equal(pepperellPdf, PEPPERELL_URL);

  assert.ok(isCafoTwin(readFx("cafo-twin.txt")));
  assert.ok(isRhcSibling(readFx("rhc-sibling.txt")));
  assert.ok(!isRealEpaAljBody(readFx("cafo-twin.txt")));
  assert.ok(!isRealEpaAljBody(readFx("rhc-sibling.txt")));
  assert.ok(isRealEpaAljBody(readFx("FIFRA-07-2023-0135-2026-09-01.txt")));
  assert.ok(isRealEpaAljBody(readFx("CWA-01-2026-0030-2026-09-04.txt")));
  assert.ok(readFx("FIFRA-07-2023-0135-2026-09-01.txt").includes(BODY_NEEDLE_SEED));
  assert.match(readFx("CWA-01-2026-0030-2026-09-04.txt"), /Motion to File Out of Time/i);

  const cacheDir = mkdtempSync(join(tmpdir(), "epa-alj-"));
  const prevDir = process.env.EPA_ALJ_DIR;
  process.env.EPA_ALJ_DIR = cacheDir;
  const snap = await collectEpaAlj({ htmlDir: fixtures, limit: 8, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.EPA_ALJ_DIR;
  else process.env.EPA_ALJ_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 2, `fixture collect caches official decision text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === "FIFRA-07-2023-0135-2026-09-01"));
  assert.ok(snap.cards.some((c) => c.id === "CWA-01-2026-0030-2026-09-04"));
  assert.ok(snap.cards.every((c) => isRealEpaAljBody(c.body)));
  const seedCard = snap.cards.find((c) => c.id === "FIFRA-07-2023-0135-2026-09-01");
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_SEED));
  assert.match(seedCard?.institution ?? "", /Wilson/i);

  const assembled = assembleEpaAljSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildEpaAljManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.free, true);
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.amountAtomic, EPA_ALJ_AMOUNT_ATOMIC);
  assert.equal(manifest.oneAmountAtomic, EPA_ALJ_ONE_AMOUNT_ATOMIC);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  const manText = JSON.stringify(manifest);
  assert.ok(!manText.includes("%PDF-"), "free manifest is titles/links/counts");
  assert.ok(!manText.includes(BODY_NEEDLE_SEED), "free manifest has no seed decision body");
  assert.ok(!manText.includes("excusable neglect"));
  const manSeed = (manifest.cards as { id?: string; body?: string; sourceUrl?: string }[]).find(
    (c) => c.id === "FIFRA-07-2023-0135-2026-09-01",
  );
  assert.equal(manSeed?.sourceUrl, WILSON_URL);
  assert.ok(!("body" in (manSeed ?? {})));

  const filtered = filterEpaAljManifest(manifest, "wilson");
  assert.ok(Number(filtered.cardCount) >= 1);
  assert.ok((filtered.cards as { institution?: string }[]).every((c) => /wilson/i.test(c.institution ?? "")));

  const parsed = parseEpaAljText(readFx("FIFRA-07-2023-0135-2026-09-01.txt"), SEED_LISTINGS[0]);
  assert.equal(parsed.id, "FIFRA-07-2023-0135-2026-09-01");
  assert.ok(parsed.body.includes(BODY_NEEDLE_SEED));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
