import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_SEED,
  CARD_FIELDS,
  EPA_EAB_AMOUNT_ATOMIC,
  EPA_EAB_MANIFEST_PATH,
  EPA_EAB_ONE_AMOUNT_ATOMIC,
  EPA_EAB_PATH,
  LICENSE,
  LISTING_URL,
  MONTALBAN_URL,
  NSF_PATH,
  PRODUCT_ID,
  SEED_LISTINGS,
  SESD_URL,
  assembleEpaEabSnapshot,
  buildEpaEabManifest,
  catalogId,
  collectEpaEab,
  filterEpaEabManifest,
  isOaljSibling,
  isPenaltyTwin,
  isRealEpaEabBody,
  isRhcSibling,
  keepListing,
  officialEpaEabPdfUrl,
  parseDocumentPageHtml,
  parseEpaEabText,
  parseKind,
  parseUnpublishedView,
} from "./epa-eab.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/epa-eab");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(EPA_EAB_PATH, "/epa-eab");
  assert.equal(EPA_EAB_MANIFEST_PATH, "/epa-eab/manifest.json");
  assert.ok(LISTING_URL.includes("oa/EAB_Web_Docket.nsf"));
  assert.ok(!LISTING_URL.toLowerCase().includes("oarm/alj"));
  assert.ok(!LISTING_URL.toLowerCase().includes("oa/rhc/epaadmin.nsf"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "NPDES-26-03-2026-07-15"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === "UIC-26-02-2026-07-07"));

  assert.ok(officialEpaEabPdfUrl(SESD_URL));
  assert.ok(officialEpaEabPdfUrl(` ${SESD_URL} `));
  assert.ok(officialEpaEabPdfUrl(MONTALBAN_URL));
  assert.equal(
    officialEpaEabPdfUrl(
      "https://yosemite.epa.gov/oarm/alj/alj_web_docket.nsf/Decisions%20and%20Orders/33055BE9DA2755FA85258E650060F6AC/$File/wilson.pdf",
    ),
    null,
    "OALJ Initial Decision twins are not this bag",
  );
  assert.equal(
    officialEpaEabPdfUrl(
      "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/FIFRA-05-2026-0015_CAFO.pdf",
    ),
    null,
    "RHC CAFO twins are not this bag",
  );
  assert.equal(
    officialEpaEabPdfUrl(
      "https://yosemite.epa.gov/oa/EAB_Web_Docket.nsf/Unpublished~Final~Orders/49043468D71081BC85258E65006D529A/$File/Chase Cooling Systems Expedited Settlement Agreement and Final Order, Issued 2026.09.01.pdf",
    ),
    null,
    "Penalty ESA filenames are not this bag",
  );

  assert.equal(parseKind("Order Dismissing Petition for Review as Untimely"), "Board Order");
  assert.equal(parseKind("Expedited Settlement Agreement and Final Order"), null);
  assert.equal(catalogId("NPDES 26-03", "2026-07-15", SESD_URL.slice(-8)), "NPDES-26-03-2026-07-15");
  assert.equal(keepListing({ appeal: "CAA-26-09C", type: "Penalty", title: "Chase", result: "ESA", kind: "Board Order" }), false);
  assert.equal(keepListing({ appeal: "NPDES-26-03", type: "Permit", title: "South Essex", result: "Dismiss", kind: "Board Order" }), true);

  const listed = parseUnpublishedView(readFx("listing-excerpt.html"));
  assert.ok(listed.some((r) => r.id === "NPDES-26-03-2026-07-15"));
  assert.ok(listed.some((r) => r.id === "UIC-26-02-2026-07-07"));
  const sesd = listed.find((r) => r.id === "NPDES-26-03-2026-07-15");
  assert.equal(sesd?.type, "Permit");
  assert.match(sesd?.institution ?? "", /South Essex/i);
  assert.equal(sesd?.appeal, "NPDES-26-03");
  const montalban = listed.find((r) => r.id === "UIC-26-02-2026-07-07");
  assert.equal(montalban?.type, "Permit");
  assert.match(montalban?.institution ?? "", /Montalban/i);
  assert.ok(!listed.some((r) => /26-09C|Chase Cooling/i.test(`${r.appeal} ${r.institution}`)));
  assert.ok(listed.every((r) => r.docUrl && r.docUrl.includes(NSF_PATH)));
  assert.equal(listed[0]?.type, "Permit", "prefer Type=Permit first");

  const sesdPdf = parseDocumentPageHtml(readFx("sesd-doc.html"));
  assert.ok(sesdPdf.sourceUrl);
  assert.equal(sesdPdf.type, "Permit");
  assert.match(sesdPdf.result, /Dismissing Petition/i);
  const chasePdf = parseDocumentPageHtml(readFx("chase-doc.html"));
  assert.equal(chasePdf.type, "Penalty");
  assert.match(chasePdf.result, /Expedited Settlement/i);

  assert.ok(isPenaltyTwin(readFx("penalty-twin.txt")));
  assert.ok(isOaljSibling(readFx("oalj-sibling.txt")));
  assert.ok(isRhcSibling(readFx("rhc-sibling.txt")));
  assert.ok(!isRealEpaEabBody(readFx("penalty-twin.txt")));
  assert.ok(!isRealEpaEabBody(readFx("oalj-sibling.txt")));
  assert.ok(!isRealEpaEabBody(readFx("rhc-sibling.txt")));
  assert.ok(!isRealEpaEabBody(readFx("npdes-permit.txt")));
  assert.ok(!isRealEpaEabBody(readFx("echo-facility.json")));
  assert.ok(isRealEpaEabBody(readFx("NPDES-26-03-2026-07-15.txt")));
  assert.ok(isRealEpaEabBody(readFx("UIC-26-02-2026-07-07.txt")));
  assert.ok(readFx("NPDES-26-03-2026-07-15.txt").includes(BODY_NEEDLE_SEED));
  assert.ok(readFx("NPDES-26-03-2026-07-15.txt").includes("Aaron P. Avila"));
  assert.ok(readFx("NPDES-26-03-2026-07-15.txt").includes("draft permit modification"));
  assert.match(readFx("UIC-26-02-2026-07-07.txt"), /Untimely/i);

  const listingHtml = readFx("listing-excerpt.html");
  const sesdCard = readFx("sesd-doc.html");
  const montalbanCard = readFx("montalban-doc.html");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_SEED), "index HTML is metadata");
  assert.ok(!sesdCard.includes(BODY_NEEDLE_SEED), "card HTML has no Assented Motion narrative");
  assert.ok(!sesdCard.includes("Aaron P. Avila"), "card HTML has no judge names");
  assert.ok(!sesdCard.includes("draft permit modification"), "card HTML has no draft permit narrative");
  assert.ok(!montalbanCard.includes(BODY_NEEDLE_SEED));

  const cacheDir = mkdtempSync(join(tmpdir(), "epa-eab-"));
  const prevDir = process.env.EPA_EAB_DIR;
  process.env.EPA_EAB_DIR = cacheDir;
  const snap = await collectEpaEab({ htmlDir: fixtures, limit: 4, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.EPA_EAB_DIR;
  else process.env.EPA_EAB_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 2, `fixture collect caches official Board text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === "NPDES-26-03-2026-07-15"));
  assert.ok(snap.cards.some((c) => c.id === "UIC-26-02-2026-07-07"));
  assert.ok(snap.cards.every((c) => isRealEpaEabBody(c.body)));
  assert.ok(snap.cards.every((c) => c.type === "Permit"));
  const seedCard = snap.cards.find((c) => c.id === "NPDES-26-03-2026-07-15");
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_SEED));
  assert.match(seedCard?.institution ?? "", /South Essex/i);

  const assembled = assembleEpaEabSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildEpaEabManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.free, true);
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.amountAtomic, EPA_EAB_AMOUNT_ATOMIC);
  assert.equal(manifest.oneAmountAtomic, EPA_EAB_ONE_AMOUNT_ATOMIC);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  const manText = JSON.stringify(manifest);
  assert.ok(!manText.includes("%PDF-"), "free manifest is titles/links/counts");
  assert.ok(!manText.includes(BODY_NEEDLE_SEED), "free manifest has no seed Board narrative");
  assert.ok(!manText.includes("draft permit modification"));
  const manSeed = (manifest.cards as { id?: string; body?: string; sourceUrl?: string }[]).find(
    (c) => c.id === "NPDES-26-03-2026-07-15",
  );
  assert.ok(manSeed?.sourceUrl);
  assert.ok(!("body" in (manSeed ?? {})));

  const filtered = filterEpaEabManifest(manifest, "south essex");
  assert.ok(Number(filtered.cardCount) >= 1);
  assert.ok((filtered.cards as { institution?: string }[]).every((c) => /south essex/i.test(c.institution ?? "")));

  const parsed = parseEpaEabText(readFx("NPDES-26-03-2026-07-15.txt"), SEED_LISTINGS[0]);
  assert.equal(parsed.id, "NPDES-26-03-2026-07-15");
  assert.equal(parsed.appeal, "NPDES-26-03");
  assert.ok(parsed.body.includes(BODY_NEEDLE_SEED));
  assert.equal(sesdPdf.docket, "MA0100501");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
