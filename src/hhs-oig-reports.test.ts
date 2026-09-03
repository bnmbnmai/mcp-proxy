import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
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
  assembleHhsOigReportsSnapshot,
  buildHhsOigReportsManifest,
  collectHhsOigReports,
  filterHhsOigReportsManifest,
  isChromeReportCardHtml,
  isKeptHhsOigPdfName,
  isOfficialHhsOigPdf,
  isPdfBytes,
  isSkippedHhsOigPdfName,
  officialHhsOigPageUrl,
  officialHhsOigPdfUrl,
  parseReportCardPage,
  parseReportsIndex,
  parseListingRows,
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
