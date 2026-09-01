import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ATTRIBUTION, CARD_FIELDS, CSB_REPORTS_AMOUNT_ATOMIC, CSB_REPORTS_MANIFEST_PATH, CSB_REPORTS_PATH, INDEX_URL, LICENSE, PRODUCT_ID, SEED_LISTINGS, assembleCsbReportsSnapshot, buildCsbReportsManifest, collectCsbReports, filterCsbReportsManifest, isKeptCsbFinalPdfName, isOfficialCsbFinalPdf, isPdfBytes, isSkippedCsbPdfName, officialCsbFinalPdfUrl, officialCsbPageUrl, parseCompletedIndex, parseInvestigationPage, parseListingRows, selectCsbReportCard, } from "./csb-reports.js";
const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/csb-reports");
const BIO_ID = "bio-lab-inc-conyers-fire-and-chemical-release";
const BIO_PDF = "https://www.csb.gov/assets/1/20/bio-lab_report__public_record_copy_.pdf";
const BIO_PAGE = "https://www.csb.gov/bio-lab-inc-conyers-fire-and-chemical-release-/";
const DISTINCTIVE = "trichloroisocyanuric-acid-runaway-decomposition-sequence";
function readFx(name) {
    return readFileSync(join(fixtures, name), "utf-8");
}
async function main() {
    const fromIndex = parseCompletedIndex(readFx("completed-investigations.html"));
    assert.ok(fromIndex.some((r) => r.id === BIO_ID), "completed index yields Bio-Lab Conyers");
    assert.equal(fromIndex[0]?.id, BIO_ID);
    assert.equal(fromIndex[0]?.date, "2026-07-21");
    assert.ok(fromIndex.some((r) => r.id === "givaudan-sense-colour-explosion"));
    assert.ok(fromIndex.some((r) => r.id === "dow-louisiana-operations-explosions"));
    assert.ok(fromIndex.some((r) => r.id === "pemex-deer-park-chemical-release"));
    assert.equal(fromIndex.some((r) => /current-investigations|teaser/i.test(r.pageUrl)), false, "skip current-investigation teasers");
    const listed = parseListingRows(SEED_LISTINGS);
    assert.equal(listed.length, 10, "first slice is the ten official final investigation report PDFs");
    assert.ok(listed.every((r) => officialCsbFinalPdfUrl(r.sourceUrl)));
    assert.equal(listed[0]?.id, BIO_ID, "newest seed is Bio-Lab Conyers released 2026-07-21");
    assert.equal(listed[0]?.date, "2026-07-21");
    assert.equal(officialCsbFinalPdfUrl(BIO_PDF), BIO_PDF);
    assert.equal(officialCsbPageUrl(BIO_PAGE), BIO_PAGE);
    assert.equal(officialCsbPageUrl("https://www.csb.gov/investigations/completed-investigations/bio-lab-inc-conyers-fire-and-chemical-release-/"), BIO_PAGE, "completed-investigations slug normalizes to the official page");
    assert.equal(officialCsbPageUrl("https://www.csb.gov/investigations/current-investigations/"), null);
    assert.equal(officialCsbPageUrl("https://www.csb.gov/contact/"), null);
    assert.equal(officialCsbFinalPdfUrl("https://www.csb.gov/assets/1/20/bio-lab_status_change_summary.pdf"), null, "Status Change Summary is not the SKU spine");
    assert.equal(officialCsbFinalPdfUrl("https://www.csb.gov/assets/1/20/bio-lab_investigation_update.pdf"), null);
    assert.equal(officialCsbFinalPdfUrl("https://www.csb.gov/assets/1/20/bio-lab_appendix_a.pdf"), null);
    assert.equal(officialCsbFinalPdfUrl("https://www.csb.gov/assets/1/20/bio-lab_executive_summary.pdf"), null);
    assert.equal(officialCsbFinalPdfUrl("https://www.saferproducts.gov/RestWebServices/Recall?format=json"), null, "CPSC SaferProducts.gov stays killed");
    assert.equal(officialCsbFinalPdfUrl("https://waterservices.usgs.gov/nwis/iv/"), null);
    assert.equal(officialCsbFinalPdfUrl("https://wwwapps.tc.gc.ca/Saf-Sec-Sur/2/cadors-screaq/"), null);
    assert.ok(isOfficialCsbFinalPdf(BIO_PDF));
    assert.ok(isKeptCsbFinalPdfName("bio-lab_report__public_record_copy_.pdf"));
    assert.ok(isSkippedCsbPdfName("Status_Change_Summary.pdf"));
    assert.ok(INDEX_URL.includes("completed-investigations"));
    const bio = parseInvestigationPage(readFx(`${BIO_ID}.html`), BIO_PAGE, { id: BIO_ID, date: "2026-07-21" });
    assert.equal(bio?.id, BIO_ID);
    assert.equal(bio?.sourceUrl, BIO_PDF);
    assert.equal(bio?.date, "2026-07-21");
    assert.ok(CARD_FIELDS.includes("sourceUrl"));
    const givaudan = parseInvestigationPage(readFx("givaudan-sense-colour-explosion.html"), "https://www.csb.gov/givaudan-sense-colour-explosion-/", { id: "givaudan-sense-colour-explosion" });
    assert.equal(givaudan?.sourceUrl, "https://www.csb.gov/assets/1/20/givaudan_investigation_report_publication.pdf");
    const cacheDir = mkdtempSync(join(tmpdir(), "csb-reports-"));
    const prevDir = process.env.CSB_REPORTS_DIR;
    process.env.CSB_REPORTS_DIR = cacheDir;
    const snap = await collectCsbReports({
        htmlDir: fixtures,
        limit: 4,
        maxFetch: 0,
        pauseMs: 0,
    });
    if (prevDir === undefined)
        delete process.env.CSB_REPORTS_DIR;
    else
        process.env.CSB_REPORTS_DIR = prevDir;
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 4, "htmlDir collect caches the four habit finals");
    assert.equal(snap.cards[0]?.id, BIO_ID);
    assert.equal(snap.asOf, "2026-07-21");
    assert.ok(snap.cards.every((c) => c.kind === "final-investigation-report"));
    assert.ok(snap.cards.every((c) => c.bytes > 0 && c.sha256 && c.pdfFile));
    assert.ok(!JSON.stringify(snap.cards.map((c) => ({ ...c, pdfFile: undefined }))).includes("%PDF-"));
    const assembled = assembleCsbReportsSnapshot(snap.cards, snap.fetchedAt);
    const manifest = buildCsbReportsManifest(assembled);
    assert.equal(manifest.product, PRODUCT_ID);
    assert.equal(manifest.free, true);
    assert.equal(manifest.priceUsdc, "0.05");
    assert.equal(manifest.amountAtomic, CSB_REPORTS_AMOUNT_ATOMIC);
    assert.equal(manifest.license, LICENSE);
    assert.equal(manifest.attribution, ATTRIBUTION);
    assert.equal(manifest.cardCount, assembled.cards.length);
    const manText = JSON.stringify(manifest);
    assert.ok(!manText.includes("%PDF-"), "free manifest is titles/links/counts, not PDF bytes");
    assert.ok(!manText.includes(DISTINCTIVE), "free manifest has no distinctive PDF phrase");
    assert.ok(!manText.toLowerCase().includes("saferproducts.gov"));
    const bioCard = manifest.cards.find((c) => c.id === BIO_ID);
    assert.equal(bioCard?.title?.includes("Bio-Lab"), true);
    assert.ok(!("body" in (bioCard ?? {})));
    assert.ok(!("sha256" in (bioCard ?? {})));
    const filtered = filterCsbReportsManifest(manifest, "givaudan");
    assert.equal(filtered.cardCount, 1);
    assert.equal(filtered.cards[0]?.id, "givaudan-sense-colour-explosion");
    const selected = selectCsbReportCard(assembled, { id: BIO_ID });
    assert.equal(selected?.id, BIO_ID);
    const older = selectCsbReportCard(assembled, { before: BIO_ID });
    assert.equal(older?.id, "givaudan-sense-colour-explosion");
    const pdfBytes = readFileSync(join(fixtures, `${BIO_ID}.pdf`));
    assert.ok(isPdfBytes(new Uint8Array(pdfBytes)));
    assert.ok(pdfBytes.toString("utf8").includes(DISTINCTIVE));
    assert.ok(!readFx(`${BIO_ID}.html`).includes(DISTINCTIVE), "investigation HTML is chrome");
    assert.equal(CSB_REPORTS_PATH, "/csb-reports");
    assert.equal(CSB_REPORTS_MANIFEST_PATH, "/csb-reports/manifest.json");
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=csb-reports.test.js.map