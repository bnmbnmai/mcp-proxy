import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALJ_TYPE,
  ATTRIBUTION,
  BODY_NEEDLE_CPUC,
  BODY_NEEDLE_EXXON,
  BODY_NEEDLE_SAGUARO,
  BODY_NEEDLE_VIRIDON,
  CARD_FIELDS,
  COMMISSION_TYPE,
  CPUC_ID,
  CPUC_URL,
  EXXON_ID,
  EXXON_URL,
  FERC_ISSUANCES_AMOUNT_ATOMIC,
  FERC_ISSUANCES_MANIFEST_PATH,
  FERC_ISSUANCES_ONE_AMOUNT_ATOMIC,
  FERC_ISSUANCES_PATH,
  LICENSE,
  PRODUCT_ID,
  SAGUARO_ID,
  SAGUARO_URL,
  SEARCH_URL,
  SEED_LISTINGS,
  VIRIDON_ID,
  VIRIDON_URL,
  assembleFercSnapshot,
  buildFercManifest,
  collectFercIssuances,
  elibraryCurPage,
  enabledKinds,
  filterFercManifest,
  filterFercManifestByKind,
  isRawPdf,
  isRealFercBody,
  isTestIssuance,
  officialDocinfoUrl,
  parseFercSearch,
} from "./ferc-issuances.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ferc-issuances");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(FERC_ISSUANCES_PATH, "/ferc-issuances");
  assert.equal(FERC_ISSUANCES_MANIFEST_PATH, "/ferc-issuances/manifest.json");
  assert.equal(FERC_ISSUANCES_AMOUNT_ATOMIC, "50000");
  assert.equal(FERC_ISSUANCES_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(SEARCH_URL.includes("/Search/AdvancedSearch"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(CARD_FIELDS.includes("sourceUrl"));
  assert.ok(CARD_FIELDS.includes("kind"));
  assert.ok(CARD_FIELDS.includes("accession"));
  assert.equal(elibraryCurPage(0), 0, "first eLibrary page is curPage 0");
  assert.equal(elibraryCurPage(1), 2, "curPage 1 repeats page 0; the second page is curPage 2");
  assert.equal(elibraryCurPage(2), 3);

  assert.ok(SEED_LISTINGS.some((row) => row.id === SAGUARO_ID && row.kind === "commission" && row.docket === "CP23-29-002"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === EXXON_ID && row.date === "2026-09-25" && row.citation === "196 FERC ¶ 61,236"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === VIRIDON_ID && row.kind === "alj" && row.docket === "EL24-67-001"));
  assert.ok(SEED_LISTINGS.some((row) => row.id === CPUC_ID && row.dockets.includes("EL02-62-017")));
  assert.ok(SEED_LISTINGS.filter((row) => row.kind === "commission").length >= 2);
  assert.ok(SEED_LISTINGS.filter((row) => row.kind === "alj").length >= 2);

  const prevKinds = process.env.FERC_ISSUANCES_KINDS;
  process.env.FERC_ISSUANCES_KINDS = "alj";
  assert.deepEqual(enabledKinds(), ["commission", "alj"], "a one-kind env still keeps both bags");
  if (prevKinds === undefined) delete process.env.FERC_ISSUANCES_KINDS;
  else process.env.FERC_ISSUANCES_KINDS = prevKinds;

  assert.equal(officialDocinfoUrl("20260928-3137"), SAGUARO_URL);
  assert.equal(officialDocinfoUrl("../westlaw"), null);
  assert.equal(officialDocinfoUrl("not-an-accession"), null);
  assert.ok(isTestIssuance("GP04 | Delayed Release - DE>>eLibrary Test", "TESTDOCUMENTONLY.docx"));
  assert.ok(isTestIssuance("smoke test 4/2", "Testing file.pdf"));
  assert.ok(!isTestIssuance("Order on Complaint re ExxonMobil Oil Corporation v. LOCAP LLC under OR26-1.", "OR26-1-000.docx"));

  const commission = parseFercSearch(readFx("commission.json"), "commission");
  assert.ok(commission.some((row) => row.id === SAGUARO_ID && row.date === "2026-09-28" && row.institution.includes("Saguaro")));
  assert.equal(commission.find((row) => row.id === SAGUARO_ID)?.sourceUrl, SAGUARO_URL);
  assert.ok(commission.some((row) => row.id === EXXON_ID && row.kind === "commission" && row.orderKind === "Commission Order/Opinion"));
  const letter = commission.find((row) => row.accession === "20260928-3136");
  assert.ok(letter, "a real letter order in the same class stays in the index");
  assert.ok(letter?.institution.includes("ISO New England"));
  assert.ok(!letter?.institution.toLowerCase().includes("under er26"), "docket tail is not the institution");
  assert.ok(!commission.some((row) => row.docket === "NP26-13-000"), "Formal Notice is not this SKU");
  assert.ok(!commission.some((row) => row.accession === "20260918-9002"), "Delegated Order is not this SKU");
  assert.equal(commission[0]?.id, SAGUARO_ID, "newest commission slip sorts first");
  assert.ok(!JSON.stringify(commission).includes(".pdf"), "index rows do not carry a .pdf file name");

  const alj = parseFercSearch(readFx("alj.json"), "alj");
  assert.ok(alj.some((row) => row.id === VIRIDON_ID && row.kind === "alj" && row.institution.includes("Viridon")));
  assert.equal(alj.find((row) => row.id === VIRIDON_ID)?.sourceUrl, VIRIDON_URL);
  assert.ok(alj.some((row) => row.id === CPUC_ID && row.dockets.includes("EL02-60-018") && row.dockets.includes("EL02-62-017")));
  assert.ok(!alj.some((row) => row.accession === "20260505-3059"), "PRIV twin is not this SKU");
  assert.ok(!alj.some((row) => row.accession === "20260815-4002"), "eLibrary test documents are not this SKU");
  assert.ok(!alj.some((row) => row.accession === "20260402-3089"), "smoke-test rows are not this SKU");
  assert.ok(!alj.some((row) => row.accession === "20260301-7001"), "ALJ procedural orders are not this SKU");
  assert.equal(alj.find((row) => row.id === VIRIDON_ID)?.fileType, "PDF");

  assert.ok(isRealFercBody(readFx(`${SAGUARO_ID}.txt`)));
  assert.ok(readFx(`${SAGUARO_ID}.txt`).includes(BODY_NEEDLE_SAGUARO));
  assert.ok(readFx(`${EXXON_ID}.txt`).includes(BODY_NEEDLE_EXXON));
  assert.ok(readFx(`${VIRIDON_ID}.txt`).includes(BODY_NEEDLE_VIRIDON));
  assert.ok(readFx(`${CPUC_ID}.txt`).includes(BODY_NEEDLE_CPUC));
  assert.ok(!isRealFercBody(readFx("not-issuance.txt")));
  assert.ok(isRawPdf(readFx("raw-pdf.txt")));
  assert.ok(!isRealFercBody(readFx("raw-pdf.txt")));

  const cacheDir = mkdtempSync(join(tmpdir(), "ferc-issuances-"));
  const prevDir = process.env.FERC_ISSUANCES_DIR;
  process.env.FERC_ISSUANCES_DIR = cacheDir;
  const snap = await collectFercIssuances({ listingDir: fixtures, limit: 8, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.FERC_ISSUANCES_DIR;
  else process.env.FERC_ISSUANCES_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.equal(snap.asOf, "2026-09-28", "asOf is the newest cached issuance date");
  assert.equal(snap.fetchedPdfs, 0);
  assert.ok((snap.listedCount ?? 0) >= 5, "listedCount counts kept index rows, including rows with no local text");
  assert.ok(snap.cards.some((card) => card.id === SAGUARO_ID && card.kind === "commission" && card.body.includes(BODY_NEEDLE_SAGUARO)));
  assert.ok(snap.cards.some((card) => card.id === EXXON_ID && card.citation === "196 FERC ¶ 61,236" && card.body.includes(BODY_NEEDLE_EXXON)));
  assert.ok(snap.cards.some((card) => card.id === VIRIDON_ID && card.kind === "alj" && card.body.includes(BODY_NEEDLE_VIRIDON)));
  assert.ok(snap.cards.some((card) => card.id === CPUC_ID && card.kind === "alj" && card.body.includes(BODY_NEEDLE_CPUC) && card.citation === "193 FERC ¶ 63,028"));
  assert.ok(snap.cards.filter((card) => card.kind === "commission").length >= 2);
  assert.ok(snap.cards.filter((card) => card.kind === "alj").length >= 2);
  assert.ok(snap.cards.every((card) => isRealFercBody(card.body)));
  assert.ok(!snap.cards.some((card) => card.body.includes("%PDF-")));
  assert.ok(!snap.cards.some((card) => card.accession === "20260928-3136"), "no local text means no sold card");
  assert.equal(snap.cards[0]?.id, SAGUARO_ID);
  assert.equal(snap.cards.find((card) => card.id === VIRIDON_ID)?.sourceUrl, VIRIDON_URL);
  assert.equal(snap.cards.find((card) => card.id === EXXON_ID)?.sourceUrl, EXXON_URL);
  assert.equal(snap.cards.find((card) => card.id === CPUC_ID)?.sourceUrl, CPUC_URL);

  const manifest = buildFercManifest(assembleFercSnapshot(snap.cards, snap.fetchedAt));
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.asOf, "2026-09-28");
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 4);
  const freeCards = manifest.cards as {
    body?: string;
    sourceUrl?: string;
    fileName?: string;
    fileId?: string;
    docket?: string;
    kind?: string;
    orderKind?: string;
    institution?: string;
    citation?: string;
    accession?: string;
  }[];
  assert.ok(freeCards.every((card) => !card.body));
  assert.ok(freeCards.every((card) => !card.fileName && !card.fileId));
  assert.ok(freeCards.every((card) => card.sourceUrl?.startsWith("https://elibrary.ferc.gov/eLibrary/docinfo?accession_number=")));
  assert.ok(freeCards.some((card) => card.docket === "CP23-29-002" && card.kind === "commission" && card.institution?.includes("Saguaro")));
  assert.ok(freeCards.some((card) => card.kind === "alj" && card.citation === "195 FERC ¶ 63,017" && card.orderKind === "ALJ Initial Decision"));
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes(BODY_NEEDLE_SAGUARO));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_EXXON));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_VIRIDON));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_CPUC));
  assert.ok(!manifestJson.includes("%PDF-"));
  assert.ok(!manifestJson.includes(".pdf"), "builder manifest does not leak a PDF file name");
  assert.ok(manifestJson.includes(COMMISSION_TYPE));
  assert.ok(manifestJson.includes(ALJ_TYPE));
  assert.ok(manifestJson.includes("AdvancedSearch"));
  assert.ok(!manifestJson.includes("DownloadPDF"));
  assert.ok(Number(filterFercManifest(manifest, "commission").cardCount) >= 2);
  assert.ok(Number(filterFercManifest(manifest, "alj").cardCount) >= 2);
  const aljOnly = filterFercManifestByKind(manifest, "alj");
  const aljCards = aljOnly.cards as { kind?: string }[];
  assert.ok(aljCards.length >= 2);
  assert.ok(aljCards.every((card) => card.kind === "alj"));
  const commissionOnly = filterFercManifestByKind(manifest, "commission");
  assert.ok(Number(commissionOnly.cardCount) >= 2);
  assert.ok((commissionOnly.cards as { kind?: string }[]).every((card) => card.kind === "commission"));
  assert.ok(Number(filterFercManifest(manifest, "saguaro").cardCount) >= 1);
  assert.ok(Number(filterFercManifest(manifest, "EL02-62-017").cardCount) >= 1);
  assert.ok(Number(filterFercManifest(manifest, "196 FERC").cardCount) >= 1);
  assert.equal(filterFercManifest(manifest, BODY_NEEDLE_SAGUARO).cardCount, 0, "opinion text is not on the free manifest");
  assert.equal(filterFercManifest(manifest, BODY_NEEDLE_VIRIDON).cardCount, 0);
  assert.equal(filterFercManifest(manifest, BODY_NEEDLE_CPUC).cardCount, 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
