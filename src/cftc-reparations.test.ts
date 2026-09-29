import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isRealCftcOrderBody } from "./cftc-orders.js";
import {
  AMA_ID,
  AMA_URL,
  ASMAD_ID,
  ASMAD_URL,
  ATTRIBUTION,
  BODY_NEEDLE_AMA,
  BODY_NEEDLE_ASMAD,
  BODY_NEEDLE_NIKOLOSKI,
  BODY_NEEDLE_RUARK,
  BODY_NEEDLE_SHAH,
  CARD_FIELDS,
  CFTC_REPARATIONS_AMOUNT_ATOMIC,
  CFTC_REPARATIONS_MANIFEST_PATH,
  CFTC_REPARATIONS_ONE_AMOUNT_ATOMIC,
  CFTC_REPARATIONS_PATH,
  DISPOSITIONS_URL,
  LICENSE,
  NIKOLOSKI_ID,
  NIKOLOSKI_URL,
  OPINIONS_URL,
  PRODUCT_ID,
  RUARK_ID,
  RUARK_URL,
  SEED_LISTINGS,
  SHAH_ID,
  SHAH_URL,
  assembleSnapshot,
  buildCftcReparationsManifest,
  captionFromLink,
  collectCftcReparations,
  enabledKinds,
  filterCftcReparationsManifest,
  filterCftcReparationsManifestByKind,
  indexPageUrl,
  isEnforcementInstitutionOrder,
  isRawPdf,
  isRealCftcReparationsBody,
  lastPageFromHtml,
  officialCftcReparationsPdfUrl,
  parseIndexHtml,
} from "./cftc-reparations.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/cftc-reparations");
const cftcOrders = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/cftc-orders");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(CFTC_REPARATIONS_PATH, "/cftc-reparations");
  assert.equal(CFTC_REPARATIONS_MANIFEST_PATH, "/cftc-reparations/manifest.json");
  assert.equal(CFTC_REPARATIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(CFTC_REPARATIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(DISPOSITIONS_URL.endsWith("/Dispositions/index.htm"));
  assert.ok(OPINIONS_URL.endsWith("/OpinionsAdjudicatoryOrders/index.htm"));
  assert.ok(!DISPOSITIONS_URL.includes("_format=json"));
  assert.ok(!OPINIONS_URL.includes("_format=json"));
  assert.equal(indexPageUrl("disposition", 0), DISPOSITIONS_URL);
  assert.equal(indexPageUrl("opinion", 2), `${OPINIONS_URL}?page=2`);
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(CARD_FIELDS.includes("docket"));
  assert.ok(CARD_FIELDS.includes("kind"));
  assert.deepEqual(enabledKinds(), ["disposition", "opinion"]);
  const prevKinds = process.env.CFTC_REPARATIONS_KINDS;
  process.env.CFTC_REPARATIONS_KINDS = "disposition";
  assert.deepEqual(enabledKinds(), ["disposition", "opinion"], "a one-kind env still keeps both bags");
  if (prevKinds === undefined) delete process.env.CFTC_REPARATIONS_KINDS;
  else process.env.CFTC_REPARATIONS_KINDS = prevKinds;

  assert.equal(officialCftcReparationsPdfUrl(ASMAD_URL), ASMAD_URL);
  assert.equal(officialCftcReparationsPdfUrl("/sites/default/files/2026/09/Asmad092926.pdf"), ASMAD_URL);
  assert.equal(officialCftcReparationsPdfUrl("/LawRegulation/EnforcementManual.pdf"), null);
  assert.equal(
    officialCftcReparationsPdfUrl("https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download"),
    null,
    "enforcement /media downloads stay on /cftc-orders",
  );
  assert.equal(officialCftcReparationsPdfUrl("https://web.archive.org/web/2026/https://www.cftc.gov/sites/default/files/2026/09/Asmad092926.pdf"), null);
  assert.equal(lastPageFromHtml(readFx("dispositions.html")), 45);
  assert.equal(
    captionFromLink("Himanshu Shah v. GAIN Capital Group, LLC, CFTC Docket No. 23-R001"),
    "Himanshu Shah v. GAIN Capital Group, LLC",
  );

  const dispositions = parseIndexHtml(readFx("dispositions.html"), "disposition");
  assert.ok(dispositions.some((row) => row.id === ASMAD_ID && row.docket === "26-R021" && row.date === "2026-09-29"));
  assert.equal(dispositions.find((row) => row.id === ASMAD_ID)?.sourceUrl, ASMAD_URL);
  assert.ok(dispositions.some((row) => row.id === NIKOLOSKI_ID && row.docket === "26-R030" && row.institution.includes("Oanda")));
  assert.equal(dispositions.find((row) => row.id === NIKOLOSKI_ID)?.sourceUrl, NIKOLOSKI_URL);
  assert.ok(dispositions.some((row) => row.id === RUARK_ID && row.docket === "26-R032"));
  assert.equal(dispositions.find((row) => row.id === RUARK_ID)?.sourceUrl, RUARK_URL);
  assert.ok(dispositions.some((row) => row.id === AMA_ID && row.docket === "25-R015" && row.date === "2026-04-17"));
  assert.equal(dispositions.find((row) => row.id === AMA_ID)?.sourceUrl, AMA_URL);
  assert.ok(dispositions.some((row) => row.docket === "26-R007" && row.institution.includes("Robinhood")));
  assert.ok(!dispositions.some((row) => /SD\s+22-01/i.test(row.docket)), "statutory disqualification is not this SKU");
  assert.ok(!dispositions.some((row) => row.docket === "26-04"), "enforcement docket 26-04 is /cftc-orders");
  assert.ok(!JSON.stringify(dispositions).includes("EnforcementManual"));
  assert.ok(!JSON.stringify(dispositions).includes("/media/"));
  assert.equal(dispositions[0]?.id, ASMAD_ID, "newest reparations disposition sorts first");

  const opinions = parseIndexHtml(readFx("opinions.html"), "opinion");
  assert.ok(opinions.some((row) => row.id === SHAH_ID && row.kind === "opinion" && row.docket === "23-R001"));
  assert.equal(opinions.find((row) => row.id === SHAH_ID)?.sourceUrl, SHAH_URL);
  assert.equal(opinions.find((row) => row.id === SHAH_ID)?.orderKind, "Commission opinion");
  const thompson = opinions.find((row) => row.dockets.includes("20-R025"));
  assert.ok(thompson, "multi-docket Commission opinion stays in the index");
  assert.ok(thompson?.dockets.includes("20-R007"));
  assert.equal(thompson?.docket, "20-R007");
  assert.ok(opinions.some((row) => row.docket === "11-E-01" && row.institution.includes("CME Group")));
  assert.ok(!JSON.stringify(opinions).includes("EnforcementManual"));

  assert.ok(SEED_LISTINGS.some((row) => row.id === ASMAD_ID && row.kind === "disposition"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === SHAH_ID && row.kind === "opinion"));
  assert.ok(SEED_LISTINGS.filter((row) => row.kind === "disposition").length >= 4);
  assert.ok(SEED_LISTINGS.filter((row) => row.kind === "opinion").length >= 1);

  assert.ok(isRealCftcReparationsBody(readFx(`${ASMAD_ID}.txt`)));
  assert.ok(readFx(`${ASMAD_ID}.txt`).includes(BODY_NEEDLE_ASMAD));
  assert.ok(readFx(`${NIKOLOSKI_ID}.txt`).includes(BODY_NEEDLE_NIKOLOSKI));
  assert.ok(readFx(`${RUARK_ID}.txt`).includes(BODY_NEEDLE_RUARK));
  assert.ok(readFx(`${AMA_ID}.txt`).includes(BODY_NEEDLE_AMA));
  assert.ok(readFx(`${SHAH_ID}.txt`).includes(BODY_NEEDLE_SHAH));
  assert.ok(isRawPdf(readFx("raw-pdf.txt")));
  assert.ok(!isRealCftcReparationsBody(readFx("raw-pdf.txt")));
  assert.ok(!isRealCftcReparationsBody("COMMODITY FUTURES TRADING COMMISSION CFTC Docket No. 26-R001 too short"));
  const enforcement = readFileSync(join(cftcOrders, "26-04.txt"), "utf-8");
  assert.ok(isEnforcementInstitutionOrder(enforcement));
  assert.ok(!isRealCftcReparationsBody(enforcement), "/cftc-orders enforcement text is not this SKU");
  assert.ok(isRealCftcOrderBody(enforcement));
  assert.ok(!isRealCftcOrderBody(readFx(`${ASMAD_ID}.txt`)), "a reparations disposition is not /cftc-orders");
  assert.ok(!isRealCftcOrderBody(readFx(`${SHAH_ID}.txt`)));

  const cacheDir = mkdtempSync(join(tmpdir(), "cftc-reparations-"));
  const prevDir = process.env.CFTC_REPARATIONS_DIR;
  process.env.CFTC_REPARATIONS_DIR = cacheDir;
  const snap = await collectCftcReparations({ listingDir: fixtures, limit: 8, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.CFTC_REPARATIONS_DIR;
  else process.env.CFTC_REPARATIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.equal(snap.asOf, "2026-09-29", "asOf is the newest cached decision date");
  assert.equal(snap.fetchedPdfs, 0);
  assert.ok((snap.listedCount ?? 0) >= 8, "listedCount counts kept index rows, including rows with no local text");
  assert.equal(snap.cards.length, 5);
  assert.ok(snap.cards.some((card) => card.id === ASMAD_ID && card.kind === "disposition" && card.body.includes(BODY_NEEDLE_ASMAD)));
  assert.ok(snap.cards.some((card) => card.id === NIKOLOSKI_ID && card.body.includes(BODY_NEEDLE_NIKOLOSKI)));
  assert.ok(snap.cards.some((card) => card.id === RUARK_ID && card.docket === "26-R032" && card.body.includes(BODY_NEEDLE_RUARK)));
  assert.ok(snap.cards.some((card) => card.id === AMA_ID && card.body.includes(BODY_NEEDLE_AMA)));
  assert.ok(snap.cards.some((card) => card.id === SHAH_ID && card.kind === "opinion" && card.body.includes(BODY_NEEDLE_SHAH)));
  assert.ok(snap.cards.filter((card) => card.kind === "disposition").length >= 4);
  assert.ok(snap.cards.filter((card) => card.kind === "opinion").length >= 1);
  assert.ok(snap.cards.every((card) => isRealCftcReparationsBody(card.body)));
  assert.ok(!snap.cards.some((card) => card.body.includes("%PDF-")));
  assert.ok(!snap.cards.some((card) => card.docket === "26-R007"), "no local text means no sold card");
  assert.ok(!snap.cards.some((card) => card.docket === "11-E-01"));
  assert.equal(snap.cards[0]?.id, ASMAD_ID);
  assert.equal(snap.cards.find((card) => card.id === SHAH_ID)?.sourceUrl, SHAH_URL);

  const manifest = buildCftcReparationsManifest(assembleSnapshot(snap.cards, snap.fetchedAt));
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.asOf, "2026-09-29");
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.equal(manifest.cardCount, 5);
  const freeCards = manifest.cards as {
    body?: string;
    id?: string;
    docket?: string;
    date?: string;
    title?: string;
    kind?: string;
    institution?: string;
    sourceUrl?: string;
  }[];
  assert.ok(freeCards.every((card) => card.id && card.docket && card.date && card.title));
  assert.ok(freeCards.every((card) => !card.body));
  assert.ok(freeCards.some((card) => card.id === ASMAD_ID && card.kind === "disposition" && card.institution?.includes("Interactive Brokers")));
  assert.ok(freeCards.some((card) => card.id === SHAH_ID && card.kind === "opinion" && card.docket === "23-R001"));
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes(BODY_NEEDLE_ASMAD));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_NIKOLOSKI));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_RUARK));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_AMA));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_SHAH));
  assert.ok(!manifestJson.includes("%PDF-"));
  assert.ok(manifestJson.includes(DISPOSITIONS_URL));
  assert.ok(manifestJson.includes(OPINIONS_URL));
  assert.ok(!manifestJson.includes("_format=json"));
  assert.ok(Number(filterCftcReparationsManifest(manifest, "disposition").cardCount) >= 4);
  assert.ok(Number(filterCftcReparationsManifest(manifest, "23-R001").cardCount) >= 1);
  assert.ok(Number(filterCftcReparationsManifest(manifest, "Interactive Brokers").cardCount) >= 1);
  const opinionOnly = filterCftcReparationsManifestByKind(manifest, "opinion");
  const opinionCards = opinionOnly.cards as { kind?: string; id?: string }[];
  assert.ok(opinionCards.every((card) => card.kind === "opinion"));
  assert.ok(opinionCards.some((card) => card.id === SHAH_ID));
  const dispositionOnly = filterCftcReparationsManifestByKind(manifest, "disposition");
  assert.equal(dispositionOnly.cardCount, 4);
  assert.ok((dispositionOnly.cards as { kind?: string }[]).every((card) => card.kind === "disposition"));
  assert.equal(filterCftcReparationsManifest(manifest, BODY_NEEDLE_ASMAD).cardCount, 0, "decision text is not on the free manifest");
  assert.equal(filterCftcReparationsManifest(manifest, BODY_NEEDLE_SHAH).cardCount, 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
