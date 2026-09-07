import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  CARD_FIELDS,
  HHS_OIG_REPORTS_AMOUNT_ATOMIC,
  HHS_OIG_REPORTS_MANIFEST_PATH,
  HHS_OIG_REPORTS_PATH,
  INDEX_URL,
  LICENSE,
  PRODUCT_ID,
  SEED_LISTINGS,
  VA_INDEX_URL,
  VA_SEED_LISTINGS,
  assembleHhsOigReportsSnapshot,
  buildHhsOigReportsManifest,
  collectHhsOigReports,
  filterHhsOigReportsManifest,
  isChromeReportCardHtml,
  isKeptHhsOigPdfName,
  isOfficialBagPdf,
  isOfficialHhsOigPdf,
  isPdfBytes,
  isSkippedHhsOigPdfName,
  officialBagPdfUrl,
  officialHhsOigPageUrl,
  officialHhsOigPdfUrl,
  officialVaOigPageUrl,
  officialVaOigPdfUrl,
  parseReportCardPage,
  parseReportsIndex,
  parseListingRows,
  parseVaReportCardPage,
  parseVaReportsIndex,
  selectHhsOigReportCard,
} from "./hhs-oig-reports.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/hhs-oig-reports");
const SEED_ID = "oas-24-02-004";
const SEED_PDF = "https://oig.hhs.gov/documents/audit/11864/OAS-24-02-004.pdf";
const SEED_PAGE =
  "https://oig.hhs.gov/reports/all/2026/cms-oversight-did-not-prevent-medicare-part-d-sponsors-from-making-5877-million-in-ineligible-payments-to-pharmacies-for-drugs-available-over-the-counter-but-labeled-as-prescription-only/";
const DISTINCTIVE = "WHY WE DID THIS AUDIT";

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const fromIndex = parseReportsIndex(readFx("reports-2026.html"));
  assert.ok(fromIndex.some((r) => r.id === SEED_ID), "2026 index yields OAS-24-02-004");
  assert.equal(fromIndex[0]?.id, SEED_ID);
  assert.equal(fromIndex[0]?.date, "2026-08-31");
  assert.ok(fromIndex.some((r) => r.id === "oas-24-09-002"));
  assert.ok(fromIndex.some((r) => r.id === "oei-06-25-00150"));
  assert.equal(
    fromIndex.some((r) => /sar|tmc|budget|recommend/i.test(`${r.pageUrl} ${r.reportNumber}`)),
    false,
    "skip SAR / TMC / budget / recommendations",
  );

  const listed = parseListingRows(SEED_LISTINGS);
  assert.equal(listed.length, 3, "three habit seeds");
  assert.ok(listed.every((r) => officialHhsOigPdfUrl(r.sourceUrl)));
  assert.equal(listed[0]?.id, SEED_ID, "newest seed is OAS-24-02-004 issued 08/31/2026");
  assert.equal(listed[0]?.date, "2026-08-31");
  assert.equal(officialHhsOigPdfUrl(SEED_PDF), SEED_PDF);
  assert.equal(officialHhsOigPageUrl(SEED_PAGE), SEED_PAGE);
  assert.equal(officialHhsOigPageUrl("https://oig.hhs.gov/reports/sar/"), null);
  assert.equal(officialHhsOigPageUrl("https://oig.hhs.gov/reports/tmcs/"), null);
  assert.equal(officialHhsOigPageUrl("https://oig.hhs.gov/reports/recommendations/"), null);
  assert.equal(officialHhsOigPageUrl("https://oig.hhs.gov/about-oig/oig-budget/"), null);
  assert.equal(
    officialHhsOigPdfUrl("https://oig.hhs.gov/documents/audit/11865/OAS-24-02-004-highlights.pdf"),
    null,
    "highlights PDF is not the SKU spine",
  );
  assert.equal(
    officialHhsOigPdfUrl("https://oig.hhs.gov/documents/evaluation/11726/OEI-06-25-00150_highlights.pdf"),
    null,
    "underscore highlights PDF is not the SKU spine",
  );
  assert.equal(
    officialHhsOigPdfUrl("https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv"),
    null,
    "LEIE UPDATED.csv stays killed",
  );
  assert.equal(officialHhsOigPdfUrl("https://oig.hhs.gov/documents/reports/1154/5274-info.pdf"), null);
  assert.ok(isOfficialHhsOigPdf(SEED_PDF));
  assert.ok(isKeptHhsOigPdfName("OAS-24-02-004.pdf"));
  assert.ok(isSkippedHhsOigPdfName("OAS-24-02-004-highlights.pdf"));
  assert.ok(isSkippedHhsOigPdfName("UPDATED.csv"));
  assert.ok(INDEX_URL.includes("fy=2026"));

  const seed = parseReportCardPage(readFx(`${SEED_ID}.html`), SEED_PAGE, { id: SEED_ID, date: "2026-08-31" });
  assert.equal(seed?.id, SEED_ID);
  assert.equal(seed?.sourceUrl, SEED_PDF);
  assert.equal(seed?.date, "2026-08-31");
  assert.ok(CARD_FIELDS.includes("sourceUrl"));
  assert.ok(isChromeReportCardHtml(readFx(`${SEED_ID}.html`)));
  assert.ok(!readFx(`${SEED_ID}.html`).includes(DISTINCTIVE), "report-card HTML is chrome");
  assert.ok(!readFx(`${SEED_ID}.html`).includes("Appendix A"));

  const az = parseReportCardPage(
    readFx("oas-24-09-002.html"),
    "https://oig.hhs.gov/reports/all/2026/arizona-did-not-ensure-that-selected-medicaid-managed-care-organizations-complied-with-mental-health-and-substance-use-disorder-parity-requirements-related-to-prior-authorization/",
    { id: "oas-24-09-002" },
  );
  assert.equal(az?.sourceUrl, "https://oig.hhs.gov/documents/audit/11861/OAS-24-09-002.pdf");

  const fl = parseReportCardPage(
    readFx("oei-06-25-00150.html"),
    "https://oig.hhs.gov/reports/all/2026/florida-medicaid-fraud-control-unit-2025-inspection/",
    { id: "oei-06-25-00150" },
  );
  assert.equal(fl?.sourceUrl, "https://oig.hhs.gov/documents/evaluation/11725/OEI-06-25-00150.pdf");
  assert.equal(fl?.kind, "evaluation");

  const cacheDir = mkdtempSync(join(tmpdir(), "hhs-oig-reports-"));
  const prevDir = process.env.HHS_OIG_REPORTS_DIR;
  process.env.HHS_OIG_REPORTS_DIR = cacheDir;
  const snap = await collectHhsOigReports({
    htmlDir: fixtures,
    limit: 3,
    maxFetch: 0,
    pauseMs: 0,
  });
  if (prevDir === undefined) delete process.env.HHS_OIG_REPORTS_DIR;
  else process.env.HHS_OIG_REPORTS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 3, "htmlDir collect caches the three habit full reports");
  assert.equal(snap.cards[0]?.id, SEED_ID);
  assert.equal(snap.asOf, "2026-08-31");
  assert.ok(snap.cards.every((c) => c.bytes > 0 && c.sha256 && c.pdfFile));
  assert.ok(snap.cards.some((c) => c.kind === "audit"));
  assert.ok(snap.cards.some((c) => c.kind === "evaluation"));
  assert.ok(!JSON.stringify(snap.cards.map((c) => ({ ...c, pdfFile: undefined }))).includes("%PDF-"));

  const assembled = assembleHhsOigReportsSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildHhsOigReportsManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.free, true);
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.amountAtomic, HHS_OIG_REPORTS_AMOUNT_ATOMIC);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.cardCount, assembled.cards.length);
  const manText = JSON.stringify(manifest);
  assert.ok(!manText.includes("%PDF-"), "free manifest is titles/links/counts, not PDF bytes");
  assert.ok(!manText.includes(DISTINCTIVE), "free manifest has no distinctive PDF phrase");
  assert.ok(!manText.includes("Appendix A"));
  assert.ok(!manText.toLowerCase().includes("updated.csv"));
  assert.ok(!manText.toLowerCase().includes("leie"));
  const seedCard = (manifest.cards as { id?: string; body?: string; title?: string }[]).find((c) => c.id === SEED_ID);
  assert.equal(seedCard?.title?.includes("CMS Oversight"), true);
  assert.ok(!("body" in (seedCard ?? {})));
  assert.ok(!("sha256" in (seedCard ?? {})));

  const filtered = filterHhsOigReportsManifest(manifest, "arizona");
  assert.equal(filtered.cardCount, 1);
  assert.equal((filtered.cards as { id: string }[])[0]?.id, "oas-24-09-002");

  const selected = selectHhsOigReportCard(assembled, { id: SEED_ID });
  assert.equal(selected?.id, SEED_ID);
  const older = selectHhsOigReportCard(assembled, { before: SEED_ID });
  assert.equal(older?.id, "oas-24-09-002");

  const pdfBytes = readFileSync(join(fixtures, `${SEED_ID}.pdf`));
  assert.ok(isPdfBytes(new Uint8Array(pdfBytes)));
  assert.ok(pdfBytes.toString("utf8").includes(DISTINCTIVE));
  assert.ok(pdfBytes.toString("utf8").includes("Appendix A"));
  assert.equal(HHS_OIG_REPORTS_PATH, "/hhs-oig-reports");
  assert.equal(HHS_OIG_REPORTS_MANIFEST_PATH, "/hhs-oig-reports/manifest.json");

  const vaIndex = parseVaReportsIndex(readFx("vaoig-reports-all.html"));
  assert.ok(vaIndex.length >= 4, `VA list HTML should yield several reports, got ${vaIndex.length}`);
  assert.ok(vaIndex.some((r) => r.id === "vaoig-26-00030-213"), "Salisbury 26-00030-213");
  assert.ok(vaIndex.some((r) => r.id === "vaoig-26-00038-262"), "Tuscaloosa 26-00038-262");
  assert.ok(vaIndex.some((r) => r.id === "vaoig-26-00045-263"), "Southern Arizona 26-00045-263");
  assert.ok(vaIndex.some((r) => r.id === "vaoig-25-00255-206"), "Philadelphia 25-00255-206");
  assert.ok(
    vaIndex.filter((r) => r.date === "2026-09-04").length >= 4,
    "new inspections dated 2026-09-04",
  );
  assert.ok(vaIndex.every((r) => r.kind === "audit" || r.kind === "evaluation"));
  assert.equal(
    vaIndex.some((r) => /data-dashboard|major-management-challenges|jsonapi/i.test(r.pageUrl)),
    false,
    "skip VA dashboard / MMC / jsonapi",
  );
  assert.equal(officialVaOigPageUrl("https://www.vaoig.gov/reports/all"), null);
  assert.equal(officialVaOigPageUrl("https://www.vaoig.gov/reports/data-dashboard"), null);
  assert.equal(officialVaOigPageUrl("https://www.vaoig.gov/jsonapi/node/report"), null);
  assert.equal(
    officialVaOigPdfUrl("https://www.vaoig.gov/sites/default/files/reports/2026-09/vaoig-26-00030-213_final.pdf"),
    "https://www.vaoig.gov/sites/default/files/reports/2026-09/vaoig-26-00030-213_final.pdf",
  );
  assert.equal(
    officialVaOigPdfUrl("https://www.vaoig.gov/sites/default/files/reports/2026-09/vaoig-26-00030-213-highlights.pdf"),
    null,
  );
  assert.ok(isOfficialBagPdf("https://www.vaoig.gov/sites/default/files/reports/2026-09/vaoig-26-00030-213_final.pdf"));
  assert.ok(VA_INDEX_URL.includes("vaoig.gov/reports/all"));

  const salisbury = parseVaReportCardPage(
    readFx("vaoig-26-00030-213.html"),
    "https://www.vaoig.gov/reports/healthcare-facility-inspection/healthcare-facility-inspection-salisbury-va-health-care",
    { id: "vaoig-26-00030-213" },
  );
  assert.equal(salisbury?.id, "vaoig-26-00030-213");
  assert.equal(salisbury?.reportNumber, "VAOIG-26-00030-213");
  assert.equal(salisbury?.kind, "evaluation");
  assert.equal(salisbury?.date, "2026-09-04");
  assert.equal(
    salisbury?.sourceUrl,
    "https://www.vaoig.gov/sites/default/files/reports/2026-09/vaoig-26-00030-213_final.pdf",
  );
  const tuscaloosa = parseReportCardPage(
    readFx("vaoig-26-00038-262.html"),
    "https://www.vaoig.gov/reports/healthcare-facility-inspection/healthcare-facility-inspection-va-tuscaloosa-healthcare",
  );
  assert.equal(tuscaloosa?.id, "vaoig-26-00038-262");
  assert.equal(
    tuscaloosa?.sourceUrl,
    "https://www.vaoig.gov/sites/default/files/reports/2026-09/vaoig-26-00038-262_final.pdf",
  );
  const vaAudit = parseVaReportCardPage(
    readFx("vaoig-24-03691-175.html"),
    "https://www.vaoig.gov/reports/audit/audit-healthcare-enrollment-program-va-medical-facilities",
  );
  assert.equal(vaAudit?.kind, "audit");
  assert.equal(vaAudit?.reportNumber, "VAOIG-24-03691-175");
  assert.equal(
    vaAudit?.sourceUrl,
    "https://www.vaoig.gov/sites/default/files/reports/2026-08/vaoig-24-03691-175_-_final.pdf",
  );

  const vaListed = parseListingRows(VA_SEED_LISTINGS);
  assert.ok(vaListed.length >= 5, "VA habit seeds stay in the same bag");
  assert.ok(vaListed.every((r) => officialBagPdfUrl(r.sourceUrl)));
  assert.ok(vaListed.some((r) => r.date === "2026-09-04"));

  const vaDir = mkdtempSync(join(tmpdir(), "hhs-oig-va-"));
  const tinyPdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
  mkdirSync(vaDir, { recursive: true });
  copyFileSync(join(fixtures, "vaoig-reports-all.html"), join(vaDir, "vaoig-reports-all.html"));
  copyFileSync(join(fixtures, "vaoig-26-00030-213.html"), join(vaDir, "vaoig-26-00030-213.html"));
  copyFileSync(join(fixtures, "vaoig-26-00038-262.html"), join(vaDir, "vaoig-26-00038-262.html"));
  copyFileSync(join(fixtures, "vaoig-24-03691-175.html"), join(vaDir, "vaoig-24-03691-175.html"));
  writeFileSync(join(vaDir, "vaoig-26-00030-213.pdf"), tinyPdf);
  writeFileSync(join(vaDir, "vaoig-26-00038-262.pdf"), tinyPdf);
  writeFileSync(join(vaDir, "vaoig-24-03691-175.pdf"), tinyPdf);
  const prevVaDir = process.env.HHS_OIG_REPORTS_DIR;
  process.env.HHS_OIG_REPORTS_DIR = mkdtempSync(join(tmpdir(), "hhs-oig-va-cache-"));
  const vaSnap = await collectHhsOigReports({
    htmlDir: vaDir,
    limit: 8,
    maxFetch: 0,
    pauseMs: 0,
  });
  if (prevVaDir === undefined) delete process.env.HHS_OIG_REPORTS_DIR;
  else process.env.HHS_OIG_REPORTS_DIR = prevVaDir;
  assert.ok(vaSnap.cards.length >= 3, `VA fixture collect should cache at least 3 PDFs, got ${vaSnap.cards.length}`);
  assert.ok(vaSnap.cards.some((c) => c.id === "vaoig-26-00030-213"));
  assert.ok(vaSnap.cards.some((c) => c.id === "vaoig-26-00038-262"));
  assert.ok(vaSnap.cards.some((c) => c.id === "vaoig-24-03691-175" && c.kind === "audit"));
  assert.equal(vaSnap.asOf, "2026-09-04");
  assert.equal(HHS_OIG_REPORTS_PATH, "/hhs-oig-reports");
  const vaManifest = buildHhsOigReportsManifest(vaSnap);
  assert.ok(!JSON.stringify(vaManifest).includes("%PDF-"));
  assert.equal((vaManifest.sources as { vaIndex?: string }).vaIndex, VA_INDEX_URL);
  const picked = selectHhsOigReportCard(vaSnap, { id: "26-00030-213" });
  assert.equal(picked?.id, "vaoig-26-00030-213");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
