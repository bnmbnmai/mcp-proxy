import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_CLINCH,
  BODY_NEEDLE_F35,
  CARD_FIELDS,
  EIS_REPORTS_AMOUNT_ATOMIC,
  EIS_REPORTS_MANIFEST_PATH,
  EIS_REPORTS_ONE_AMOUNT_ATOMIC,
  EIS_REPORTS_PATH,
  LAST_WEEK_URL,
  LICENSE,
  PRODUCT_ID,
  SEED_LISTINGS,
  altchaPayload,
  assembleEisReportsSnapshot,
  buildEisReportsManifest,
  collectEisReports,
  filterEisReportsManifest,
  isChromeEisHtml,
  isCommentLetterTitle,
  isPdfBytes,
  isRealEisBody,
  isSkippedEisAttachment,
  isSummaryTeaserTitle,
  isSuperfundRodDump,
  looksLikeLeakedEisBody,
  looksLikeLoginGov,
  officialEisPageUrl,
  parseDetailsListings,
  parseSearchDownloadEis,
  parseSearchRows,
  selectEisReportCard,
  solveAltchaPow,
} from "./eis-reports.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/eis-reports");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const lastWeek = parseSearchRows(readFx("lastWeek.html"));
  assert.ok(lastWeek.some((r) => r.eisId === "569578"), "lastWeek yields F-35A Beddown");
  assert.equal(lastWeek[0]?.ceqNumber, "20260104");
  assert.equal(lastWeek[0]?.date, "2026-08-28");
  assert.equal(lastWeek.length, 5, "five last-week habit rows");
  assert.ok(lastWeek.every((r) => officialEisPageUrl(r.pageUrl)));
  assert.ok(LAST_WEEK_URL.includes("commonSearch=lastWeek"));
  const f35Dl = lastWeek.find((r) => r.eisId === "569578");
  assert.equal(f35Dl?.downloadGroups, "569653;569535;");
  const publicDl = parseSearchDownloadEis(readFx("lastWeek.html"));
  assert.ok(publicDl.groups.includes("569535"));

  const clinch = parseDetailsListings(readFx("details-555705.html"), "https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/details?eisId=555705");
  assert.equal(clinch.length, 1, "one kept EIS document; comment letter skipped");
  assert.equal(clinch[0]?.id, "20260036");
  assert.equal(clinch[0]?.attachmentId, "555711");
  assert.equal(clinch[0]?.date, "2026-04-10");
  assert.equal(clinch[0]?.agency, "Nuclear Regulatory Commission");
  assert.ok(!clinch.some((c) => c.attachmentId === "559132"), "EPA comment letter is not a SKU");
  assert.ok(isCommentLetterTitle("20260036 EPA Comments on Clinch River Nuclear Site FSEIS.pdf"));
  assert.ok(isSkippedEisAttachment("20260036 EPA Comments on Clinch River Nuclear Site FSEIS.pdf"));

  const f35 = parseDetailsListings(readFx("details-569578.html"), "https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/details?eisId=569578");
  assert.equal(f35.length, 1, "summary teaser skipped; full Draft EIS kept");
  assert.equal(f35[0]?.id, "20260104");
  assert.equal(f35[0]?.attachmentId, "569535");
  assert.ok(isSummaryTeaserTitle("Summary for the Draft EIS for F-35A Beddown at Moody AFB, GA (Aug 2026).pdf"));
  assert.ok(!f35.some((c) => c.attachmentId === "569653"));

  const salt = "bnm-altcha-test";
  const number = 42;
  const challenge = createHash("sha256").update(`${salt}${number}`).digest("hex");
  assert.equal(solveAltchaPow({ challenge, salt, maxnumber: 100 }), 42);
  const payload = altchaPayload(
    { algorithm: "SHA-256", challenge, salt, signature: "sig", maxnumber: 100 },
    42,
    5,
  );
  const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as { number: number };
  assert.equal(decoded.number, 42);

  assert.equal(officialEisPageUrl("https://evil.example/eis?eisId=1"), null);
  assert.equal(
    officialEisPageUrl("https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/details?eisId=555705"),
    "https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/details?eisId=555705",
  );
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(isChromeEisHtml(readFx("details-555705.html")));
  assert.ok(!readFx("details-555705.html").includes(BODY_NEEDLE_CLINCH), "details HTML is chrome");
  assert.ok(!readFx("lastWeek.html").includes(BODY_NEEDLE_CLINCH));
  assert.ok(!readFx("details-555705.html").includes("ML26035A285"));
  assert.ok(!looksLikeLeakedEisBody(readFx("details-555705.html")));
  assert.ok(!looksLikeLeakedEisBody(readFx("lastWeek.html")));
  assert.ok(looksLikeLoginGov("https://secure.login.gov/?redirect=1"));
  assert.ok(!looksLikeLoginGov(readFx("lastWeek.html")));
  assert.ok(isSuperfundRodDump("RECORD OF DECISION Superfund SEMS site cleanup"));
  assert.ok(!isSuperfundRodDump(readFx("20260036.txt")));
  assert.ok(!isRealEisBody(readFx("lastWeek.html")));
  assert.ok(isRealEisBody(readFx("20260036.txt")));
  assert.ok(isRealEisBody(readFx("20260104.txt")));

  const cacheDir = mkdtempSync(join(tmpdir(), "eis-reports-"));
  const prevDir = process.env.EIS_REPORTS_DIR;
  process.env.EIS_REPORTS_DIR = cacheDir;
  const snap = await collectEisReports({
    htmlDir: fixtures,
    limit: 2,
    maxFetch: 0,
    pauseMs: 0,
  });
  if (prevDir === undefined) delete process.env.EIS_REPORTS_DIR;
  else process.env.EIS_REPORTS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 2, "htmlDir collect caches Clinch River + F-35 full EIS text");
  assert.equal(snap.cards[0]?.id, "20260104", "newest habit card is last-week F-35");
  assert.equal(snap.asOf, "2026-08-28");
  assert.ok(snap.cards.every((c) => isRealEisBody(c.body)));
  assert.ok(snap.cards.some((c) => c.id === "20260036"));
  assert.ok(snap.cards.some((c) => c.body.includes("ML26035A285")));
  assert.ok(snap.captcha?.kind === "altcha-pow");

  const assembled = assembleEisReportsSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildEisReportsManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.free, true);
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.amountAtomic, EIS_REPORTS_AMOUNT_ATOMIC);
  assert.equal(manifest.oneAmountAtomic, EIS_REPORTS_ONE_AMOUNT_ATOMIC);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.cardCount, assembled.cards.length);
  const manText = JSON.stringify(manifest);
  assert.ok(!manText.includes("%PDF-"), "free manifest is titles/links/counts, not PDF bytes");
  assert.ok(!manText.includes(BODY_NEEDLE_CLINCH), "free manifest has no distinctive PDF phrase");
  assert.ok(!manText.includes(BODY_NEEDLE_F35));
  assert.ok(!manText.includes("ML26035A285"));
  const seedCard = (manifest.cards as { id?: string; body?: string; title?: string }[]).find((c) => c.id === "20260036");
  assert.equal(seedCard?.title?.includes("Clinch River"), true);
  assert.ok(!("body" in (seedCard ?? {})));
  assert.ok(!("sha256" in (seedCard ?? {})));

  const filtered = filterEisReportsManifest(manifest, "clinch");
  assert.equal(filtered.cardCount, 1);
  assert.equal((filtered.cards as { id: string }[])[0]?.id, "20260036");

  const selected = selectEisReportCard(assembled, { id: "20260104" });
  assert.equal(selected?.id, "20260104");
  const older = selectEisReportCard(assembled, { before: "20260104" });
  assert.equal(older?.id, "20260036");

  const clinchPdf = readFileSync(join(fixtures, "20260036.pdf"));
  assert.ok(isPdfBytes(new Uint8Array(clinchPdf)));
  assert.ok(clinchPdf.toString("utf8").includes(BODY_NEEDLE_CLINCH));
  const f35Pdf = readFileSync(join(fixtures, "20260104.pdf"));
  assert.ok(f35Pdf.toString("utf8").includes(BODY_NEEDLE_F35));
  assert.equal(EIS_REPORTS_PATH, "/eis-reports");
  assert.equal(EIS_REPORTS_MANIFEST_PATH, "/eis-reports/manifest.json");
  assert.equal(SEED_LISTINGS[0]?.id, "20260036");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
