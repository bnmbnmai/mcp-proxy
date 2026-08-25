import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  ATTRIBUTION,
  CARD_FIELDS,
  LICENSE,
  LISTING_URL,
  NODE_BASE,
  PDF_BASE,
  buildFtcWlManifest,
  collectFtcWl,
  isPeopleOnlyFirm,
  isRealFtcWlBody,
  isTemplateBody,
  isTemplateListing,
  listedCountFromHtml,
  officialFtcNodeUrl,
  officialFtcPdfUrl,
  parseFtcWlText,
  parseListingHtml,
  pdfIdFromUrl,
  slugFromNodeUrl,
} from "./ftc-wl.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ftc-wl");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(listed.length >= 5, "official FTC excerpt lists company warning-letter PDFs");
  const vtron = listed.find((r) => r.id === "vtron-inc-dba-vtron-lasers");
  assert.ok(vtron);
  assert.equal(vtron?.firm, "Vtron Inc. d/b/a Vtron Lasers");
  assert.equal(vtron?.date, "2026-07-06");
  assert.equal(vtron?.nodeId, "334078");
  assert.equal(vtron?.pdfId, "vtron-lasers-musa-warningletter");
  assert.equal(vtron?.sourceUrl, "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf");
  assert.equal(vtron?.nodeUrl, `${NODE_BASE}vtron-inc-dba-vtron-lasers`);
  assert.equal(slugFromNodeUrl(vtron?.nodeUrl ?? ""), "vtron-inc-dba-vtron-lasers");
  assert.equal(pdfIdFromUrl(vtron?.sourceUrl ?? ""), "vtron-lasers-musa-warningletter");
  assert.ok(listed.some((r) => r.id === "lucky-bar-holdings-llc" && r.pdfId === "lucky-bar-musa-warningletter"));
  assert.ok(listed.some((r) => r.id === "helmel-engineering-products-inc"));
  assert.ok(listed.some((r) => r.id === "my-vape-order-inc"));
  assert.ok(listed.some((r) => r.id === "af-drum-company-llc"));
  assert.ok(!listed.some((r) => /template/i.test(r.id) || /template/i.test(r.pdfId)), "skip official templates");
  assert.ok(listed.every((r) => officialFtcPdfUrl(r.sourceUrl)));
  assert.ok(listed.every((r) => officialFtcNodeUrl(r.nodeUrl)));
  assert.equal(officialFtcPdfUrl("https://www.fda.gov/media/193344/download"), null);
  assert.equal(officialFtcPdfUrl("https://apify.com/neuton/ftc-warning-letters-scraper"), null);
  assert.equal(
    officialFtcPdfUrl("https://search.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf"),
    "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
  );
  assert.equal(
    officialFtcPdfUrl(
      "https://web.archive.org/web/20260706id_/https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
    ),
    "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
  );
  assert.ok(LISTING_URL.includes("/legal-library/browse/warning-letters"));
  assert.ok(PDF_BASE.includes("/system/files/ftc_gov/pdf/"));
  assert.equal(isTemplateListing("Take It Down Act Nudify Warning Letter Template", "tida-nudify-warning-letter-template", "take-it-down-act-nudify-warning-letter-template"), true);
  assert.equal(isPeopleOnlyFirm("Dr. Jane Smith"), true);
  assert.equal(isPeopleOnlyFirm("Vtron Inc. d/b/a Vtron Lasers"), false);
  assert.equal(isPeopleOnlyFirm("Mortgage Connect"), false);

  const node = readFx("node-vtron-excerpt.html");
  assert.ok(node.includes("/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf"));
  assert.ok(!/Bureau of Consumer Protection/i.test(node), "Vtron Drupal node is metadata/PDF URL only");
  assert.ok(!/laser machines used for engraving/i.test(node));
  assert.ok(!/nation’s consumer protection/i.test(node));

  const vtronText = parseFtcWlText(readFx("vtron-lasers-musa-warningletter.txt"), {
    sourceUrl: vtron!.sourceUrl,
    firm: "Vtron Inc. d/b/a Vtron Lasers",
    date: "2026-07-06",
    nodeId: "334078",
    nodeUrl: vtron!.nodeUrl,
    pdfId: "vtron-lasers-musa-warningletter",
    id: "vtron-inc-dba-vtron-lasers",
  });
  assert.equal(vtronText.pdfId, "vtron-lasers-musa-warningletter");
  assert.equal(vtronText.firm, "Vtron Inc. d/b/a Vtron Lasers");
  assert.equal(vtronText.date, "2026-07-06");
  assert.ok(isRealFtcWlBody(vtronText.body));
  assert.ok(vtronText.body.includes("Bureau of Consumer Protection"));
  assert.ok(vtronText.body.includes("laser machines used for engraving"));
  assert.ok(vtronText.body.includes("MUSA Labeling Rule"));
  assert.match(vtronText.subject, /Made in the USA/i);
  assert.ok(CARD_FIELDS.every((f) => f in vtronText));
  assert.ok(!/archive\.org|apify\.com/i.test(vtronText.sourceUrl));

  const lucky = parseFtcWlText(readFx("lucky-bar-musa-warningletter.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/lucky-bar-musa-warningletter.pdf",
    firm: "Lucky Bar Holdings LLC",
    pdfId: "lucky-bar-musa-warningletter",
  });
  assert.ok(isRealFtcWlBody(lucky.body));
  assert.ok(lucky.body.includes("Fifty Bar"));

  const helmel = parseFtcWlText(readFx("helmel-musa-warningletter.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/helmel-musa-warningletter.pdf",
    firm: "Helmel Engineering Products Inc.",
    pdfId: "helmel-musa-warningletter",
  });
  assert.ok(isRealFtcWlBody(helmel.body));
  assert.ok(helmel.body.includes("coordinate measuring"));

  const vape = parseFtcWlText(readFx("vape-order-inc-musa-warningletter.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vape-order-inc-musa-warningletter.pdf",
    firm: "My Vape Order, Inc.",
    pdfId: "vape-order-inc-musa-warningletter",
  });
  assert.ok(isRealFtcWlBody(vape.body));
  assert.ok(vape.body.includes("Air Factory"));

  const drum = parseFtcWlText(readFx("af-drum-musa-warningletter.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/af-drum-musa-warningletter.pdf",
    firm: "A&F Drum Company LLC",
    pdfId: "af-drum-musa-warningletter",
  });
  assert.ok(isRealFtcWlBody(drum.body));
  assert.ok(drum.body.includes("A&F Drum"));

  const tmpl = parseFtcWlText(readFx("tida-nudify-warning-letter-template.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/tida-nudify-warning-letter-template_0.pdf",
    firm: "Take It Down Act Nudify Warning Letter Template",
  });
  assert.equal(isTemplateBody(tmpl.body), true);
  assert.equal(isRealFtcWlBody(tmpl.body), false, "official template is not this SKU");

  const fake = parseFtcWlText(readFx("no-body.txt"), {
    sourceUrl: LISTING_URL,
    firm: "Vtron Inc. d/b/a Vtron Lasers",
  });
  assert.equal(isRealFtcWlBody(fake.body), false, "index metadata is not the letter body");

  const fda = parseFtcWlText(readFx("fda-warning-letter.txt"), {
    sourceUrl: "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/citra100mg-722606-03042026",
    firm: "Citra 100mg",
  });
  assert.equal(isRealFtcWlBody(fda.body), false, "FDA warning-letter HTML is not this SKU");

  const manifest = buildFtcWlManifest({
    ok: true,
    product: "ftc-bcp-warning-letter-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-07-06",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, nodeBase: NODE_BASE, pdfBase: PDF_BASE },
    cards: [vtronText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.equal((manifest.cards as { firm: string }[])[0]?.firm, "Vtron Inc. d/b/a Vtron Lasers");
  assert.equal((manifest.cards as { id: string }[])[0]?.id, "vtron-inc-dba-vtron-lasers");
  assert.ok(!manBlob.includes("laser machines used for engraving"), "free manifest must not dump letter body");
  assert.ok(!manBlob.includes("MUSA Labeling Rule"));
  assert.ok(!manBlob.includes("nation’s consumer protection"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("vtron-lasers-musa-warningletter"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "FTC");
  assert.ok(!manBlob.includes("warning-letters/citra"));

  const cache = mkdtempSync(join(tmpdir(), "ftc-wl-collect-"));
  const prevDir = process.env.FTC_WL_DIR;
  process.env.FTC_WL_DIR = cache;
  try {
    const snap = await collectFtcWl({ htmlDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official FTC BCP letter bodies");
    assert.ok(snap.cards.some((c) => c.pdfId === "vtron-lasers-musa-warningletter" && isRealFtcWlBody(c.body)));
    assert.ok(snap.cards.some((c) => c.pdfId === "lucky-bar-musa-warningletter" && isRealFtcWlBody(c.body)));
    assert.ok(snap.cards.some((c) => c.pdfId === "helmel-musa-warningletter" && isRealFtcWlBody(c.body)));
    assert.ok(snap.cards.some((c) => c.pdfId === "vape-order-inc-musa-warningletter" && isRealFtcWlBody(c.body)));
    assert.ok(snap.cards.some((c) => c.pdfId === "af-drum-musa-warningletter" && isRealFtcWlBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealFtcWlBody(c.body)));
    assert.ok(!snap.cards.some((c) => /template/i.test(c.pdfId)), "skip official templates");
    assert.ok(snap.cards.every((c) => officialFtcPdfUrl(c.sourceUrl)));
    assert.ok(snap.cards.every((c) => !/archive\.org|apify\.com|fda\.gov/i.test(c.sourceUrl)));
    assert.equal(listedCountFromHtml(readFx("listing-excerpt.html")), 779);

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectFtcWl({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.pdfId === "vtron-lasers-musa-warningletter"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.FTC_WL_DIR;
    else process.env.FTC_WL_DIR = prevDir;
  }

  console.log("ftc-wl parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
