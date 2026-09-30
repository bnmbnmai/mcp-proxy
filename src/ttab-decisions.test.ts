import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_BIRTH,
  BODY_NEEDLE_DERMALIZE,
  BODY_NEEDLE_MAP,
  BODY_NEEDLE_RIVERS,
  CAN_92081421_ID,
  CARD_FIELDS,
  EXA_97811850_ID,
  EXA_98651023_ID,
  LICENSE,
  OPP_91272167_ID,
  PRODUCT_ID,
  SEARCH_URL,
  SEED_LISTINGS,
  TTAB_DECISIONS_AMOUNT_ATOMIC,
  TTAB_DECISIONS_MANIFEST_PATH,
  TTAB_DECISIONS_ONE_AMOUNT_ATOMIC,
  TTAB_DECISIONS_PATH,
  assembleTtabSnapshot,
  buildTtabManifest,
  collectTtabDecisions,
  decisionIdFromDocument,
  filterTtabManifest,
  isProceedingDocket,
  isRealTtabDecisionBody,
  isSearchJson,
  keepDocument,
  listingFromHit,
  officialTtabPdfUrl,
  parseIssueDateStr,
  parseTtabSearch,
} from "./ttab-decisions.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ttab-decisions");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(TTAB_DECISIONS_PATH, "/ttab-decisions");
  assert.equal(TTAB_DECISIONS_MANIFEST_PATH, "/ttab-decisions/manifest.json");
  assert.equal(TTAB_DECISIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(TTAB_DECISIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(SEARCH_URL.includes("/ttab-efoia-api/decision/search"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(CARD_FIELDS.includes("parties"));
  assert.ok(!CARD_FIELDS.includes("people" as never));
  assert.ok(SEED_LISTINGS.some((row) => row.id === CAN_92081421_ID));
  assert.ok(SEED_LISTINGS.some((row) => row.id === OPP_91272167_ID && row.precedential));
  assert.ok(SEED_LISTINGS.some((row) => row.id === EXA_97811850_ID));
  assert.ok(SEED_LISTINGS.some((row) => row.id === EXA_98651023_ID));

  assert.equal(parseIssueDateStr("11-SEP-2026"), "2026-09-11");
  assert.equal(parseIssueDateStr("10-SEP-2026"), "2026-09-10");
  assert.equal(parseIssueDateStr("01-JAN-1996"), "1996-01-01");
  assert.equal(parseIssueDateStr("not-a-date"), null);
  assert.equal(decisionIdFromDocument("/legal-proceeding/92081421/decision/CAN_45.pdf"), CAN_92081421_ID);
  assert.equal(
    officialTtabPdfUrl("/legal-proceeding/91272167/decision/OPP_88.pdf"),
    "https://ttab-reading-room.uspto.gov/cms/rest/legal-proceeding/91272167/decision/OPP_88.pdf",
  );
  assert.equal(officialTtabPdfUrl("None"), null);
  assert.equal(officialTtabPdfUrl("/ttabvue/111/docket.xml"), null);
  assert.equal(keepDocument("None"), false);
  assert.equal(listingFromHit({ documentId: "None", proceedingNumber: 91293506 }), null);

  const parsed = parseTtabSearch(readFx("search.json"));
  assert.equal(parsed.listedCount, 18908);
  assert.ok(parsed.listed.some((row) => row.id === CAN_92081421_ID && row.date === "2026-09-11"));
  assert.ok(parsed.listed.some((row) => row.id === OPP_91272167_ID && row.precedential && row.date === "2026-09-10"));
  assert.ok(parsed.listed.some((row) => row.grounds.includes("Likelihood of Confusion")));
  assert.ok(parsed.listed.some((row) => row.mark.includes("DERMALIZE")));
  assert.ok(parsed.listed.some((row) => row.mark.includes("BIRTH JUSTICE")));
  assert.ok(!parsed.listed.some((row) => row.proceedingNumber === "91293506"));
  assert.ok(!parsed.listed.some((row) => row.documentId.includes("ttabvue")));

  assert.ok(isRealTtabDecisionBody(readFx("92081421-can-45.txt")));
  assert.ok(readFx("92081421-can-45.txt").includes(BODY_NEEDLE_DERMALIZE));
  assert.ok(readFx("91272167-opp-88.txt").includes(BODY_NEEDLE_BIRTH));
  assert.ok(readFx("97811850-exa-28.txt").includes(BODY_NEEDLE_RIVERS));
  assert.ok(readFx("98651023-exa-10.txt").includes(BODY_NEEDLE_MAP));
  assert.ok(isProceedingDocket(readFx("79355823-exa-9.txt")));
  assert.ok(!isRealTtabDecisionBody(readFx("79355823-exa-9.txt")));
  assert.ok(isSearchJson('{"recordTotalQuantity":1,"results":[{"_class":"x"}]}'));
  assert.ok(!isRealTtabDecisionBody("<html><body>Trademark Trial and Appeal Board Decision</body></html>"));

  const cacheDir = mkdtempSync(join(tmpdir(), "ttab-decisions-"));
  const prevDir = process.env.TTAB_DECISIONS_DIR;
  process.env.TTAB_DECISIONS_DIR = cacheDir;
  const snap = await collectTtabDecisions({ listingDir: fixtures, limit: 7, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.TTAB_DECISIONS_DIR;
  else process.env.TTAB_DECISIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.equal(snap.asOf, "2026-09-11", "asOf is the newest issueDateStr, not fetchedAt");
  assert.ok(snap.asOf !== snap.fetchedAt.slice(0, 10) || snap.asOf === "2026-09-11");
  assert.equal(snap.fetchedPdfs, 0);
  assert.ok(snap.cards.some((card) => card.id === CAN_92081421_ID));
  assert.ok(snap.cards.some((card) => card.id === OPP_91272167_ID && card.precedential));
  assert.ok(snap.cards.some((card) => card.id === EXA_97811850_ID));
  assert.ok(snap.cards.some((card) => card.id === EXA_98651023_ID));
  assert.ok(snap.cards.some((card) => card.id === "97772966-exa-14"), "dry collect keeps a non-seed reading-room decision");
  assert.ok(!snap.cards.some((card) => card.id === "79355823-exa-9"), "proceeding docket XML is not a decision");
  assert.ok(!snap.cards.some((card) => card.proceedingNumber === "91293506"));
  assert.ok(snap.cards.every((card) => isRealTtabDecisionBody(card.body)));
  assert.ok(snap.cards.every((card) => !("people" in card)));
  assert.ok(snap.cards.every((card) => !("examiningAttorney" in card)));
  const birth = snap.cards.find((card) => card.id === OPP_91272167_ID);
  assert.equal(birth?.date, "2026-09-10");
  assert.match(birth?.parties ?? "", /Emily Grace Thomas/);
  assert.ok(birth?.mark.includes("BIRTH JUSTICE"));
  assert.ok(birth?.grounds.includes("Ownership"));

  const manifest = buildTtabManifest(assembleTtabSnapshot(snap.cards, snap.fetchedAt));
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.asOf, "2026-09-11");
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 4);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; parties?: string; people?: unknown }[];
  assert.ok(freeCards.every((card) => !card.body));
  assert.ok(freeCards.every((card) => !card.sourceUrl));
  assert.ok(freeCards.every((card) => card.people === undefined));
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes("ttab-reading-room.uspto.gov/cms"));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_DERMALIZE));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_BIRTH));
  assert.ok(!manifestJson.includes("%PDF-"));
  assert.ok(Number(filterTtabManifest(manifest, "dermalize").cardCount) >= 1);
  assert.ok(Number(filterTtabManifest(manifest, "birth justice").cardCount) >= 1);
  assert.ok(Number(filterTtabManifest(manifest, "likelihood of confusion").cardCount) >= 1);
  assert.ok(Number(filterTtabManifest(manifest, "92081421").cardCount) >= 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
