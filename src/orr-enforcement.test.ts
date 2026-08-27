import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  ATTRIBUTION,
  CARD_FIELDS,
  HUB_URL,
  LICENSE,
  SEED_LISTINGS,
  buildOrrEnforcementManifest,
  collectOrrEnforcement,
  isOfficialOrrPdf,
  isPeopleRow,
  isRealOrrEnforcementBody,
  officialOrrPdfUrl,
  parseHubHtml,
  parseListingRows,
  parseOrrEnforcementText,
} from "./orr-enforcement.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/orr-enforcement");
const NORTHERN_NOTICE_PDF =
  "https://www.orr.gov.uk/sites/default/files/2026-03/orr-to-northern-trains-limited-statutory-notice-dated-3-march-2026.pdf";
const NORTHERN_REPORT_PDF =
  "https://www.orr.gov.uk/sites/default/files/2026-03/orr-northern-trains-limited-investigation-report-march-2026.pdf";
const WW_FINAL_PDF =
  "https://www.orr.gov.uk/sites/default/files/2024-07/wales-and-western-investigation-licence-final-order-2024-07-10.pdf";
const WW_DRAFT_PDF =
  "https://www.orr.gov.uk/sites/default/files/2024-05/2024-05-29-wales-and-western-investigation-licence-draft-order.pdf";
const WW_REPORT_PDF =
  "https://www.orr.gov.uk/sites/default/files/2024-05/2024-05-28-wales-and-western-investigation-report.pdf";
const NR_ENH_PDF = "https://www.orr.gov.uk/sites/default/files/om/enhancements-notice-2015-10-16.pdf";
const NORTHERN_NOTICE_ID = "orr-to-northern-trains-limited-statutory-notice-dated-3-march-2026";
const NORTHERN_REPORT_ID = "orr-northern-trains-limited-investigation-report-march-2026";
const WW_FINAL_ID = "wales-and-western-investigation-licence-final-order-2024-07-10";
const WW_DRAFT_ID = "2024-05-29-wales-and-western-investigation-licence-draft-order";
const WW_REPORT_ID = "2024-05-28-wales-and-western-investigation-report";
const NR_ENH_ID = "enhancements-notice-2015-10-16";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listing = parseHubHtml(readFx("listing-excerpt.html"), HUB_URL);
  assert.ok(listing.some((r) => r.id === NORTHERN_NOTICE_ID), "hub HTML yields Northern s.55(6) notice");
  assert.ok(listing.some((r) => r.id === NORTHERN_REPORT_ID), "hub HTML yields Northern investigation report");
  assert.ok(listing.some((r) => r.id === WW_FINAL_ID), "hub HTML yields Wales & Western final order");
  assert.ok(listing.some((r) => r.id === WW_DRAFT_ID), "hub HTML yields Wales & Western s.56 notice");
  assert.ok(listing.some((r) => r.id === WW_REPORT_ID), "hub HTML yields Wales & Western investigation report");
  assert.ok(listing.some((r) => r.id === NR_ENH_ID), "hub HTML yields 2015 Network Rail s.55(6) notice");
  assert.ok(listing.every((r) => officialOrrPdfUrl(r.sourceUrl)));
  assert.equal(listing.some((r) => /open-data|\.csv|gov\.uk\/government|raib|ofgem/i.test(r.sourceUrl)), false);
  assert.equal(listing.length, 6, "first slice is the six official ORR enforcement PDFs");

  const listed = parseListingRows(SEED_LISTINGS);
  assert.equal(listed.length, 6, "seed lists the six official ORR enforcement PDFs");
  assert.ok(listed.every((r) => officialOrrPdfUrl(r.sourceUrl)));
  assert.equal(officialOrrPdfUrl(NORTHERN_NOTICE_PDF), NORTHERN_NOTICE_PDF);
  assert.equal(
    officialOrrPdfUrl("https://www.orr.gov.uk/media/28057/download"),
    NORTHERN_NOTICE_PDF,
    "/media/{id}/download maps to the official files PDF",
  );
  assert.equal(
    officialOrrPdfUrl("https://www.orr.gov.uk/monitoring-regulation/rail/investigations/northern-trains-limited"),
    null,
    "HTML investigation card is the index, not the sold PDF",
  );
  assert.equal(officialOrrPdfUrl("https://www.orr.gov.uk/sites/default/files/2024-01/rail-open-data.csv"), null);
  assert.equal(
    officialOrrPdfUrl(
      "https://www.ofgem.gov.uk/sites/default/files/2025-10/Tomato%20Energy%20Limited%20-%20Notice%20of%20Proposal%20to%20Impose%20a%20Penalty.pdf",
    ),
    null,
    "Ofgem PDFs are not this SKU",
  );
  assert.ok(isOfficialOrrPdf(NORTHERN_NOTICE_PDF));
  assert.ok(isOfficialOrrPdf(NR_ENH_PDF));
  assert.ok(HUB_URL.includes("orr.gov.uk"));
  assert.equal(isPeopleRow({ institution: "Jane Q Public", title: "CV of a director", id: "" }), true);
  assert.equal(
    isPeopleRow({ institution: "Northern Trains Limited", title: "statutory notice", id: NORTHERN_NOTICE_ID }),
    false,
  );

  const northern = parseOrrEnforcementText(readFx(`${NORTHERN_NOTICE_ID}.txt`), {
    sourceUrl: NORTHERN_NOTICE_PDF,
    pageUrl: "https://www.orr.gov.uk/monitoring-regulation/rail/investigations/northern-trains-limited",
    institution: "Northern Trains Limited",
    date: "2026-03-03",
    kind: "statutory-notice",
    id: NORTHERN_NOTICE_ID,
  });
  assert.equal(northern.id, NORTHERN_NOTICE_ID);
  assert.ok(isRealOrrEnforcementBody(northern.body));
  assert.ok(northern.body.includes("23 actions"));
  assert.ok(northern.body.includes("section 55(6)") || northern.body.includes("SECTION 55(6)"));
  assert.ok(northern.body.includes("Accessible Travel Policy"));
  assert.ok(CARD_FIELDS.every((f) => f in northern));

  const northernReport = parseOrrEnforcementText(readFx(`${NORTHERN_REPORT_ID}.txt`), {
    sourceUrl: NORTHERN_REPORT_PDF,
    institution: "Northern Trains Limited",
    date: "2026-03-03",
    kind: "investigation-report",
    id: NORTHERN_REPORT_ID,
  });
  assert.ok(isRealOrrEnforcementBody(northernReport.body), "Northern investigation report is official ORR TEXT");

  const wwFinal = parseOrrEnforcementText(readFx(`${WW_FINAL_ID}.txt`), {
    sourceUrl: WW_FINAL_PDF,
    institution: "Network Rail Infrastructure Limited",
    date: "2024-07-10",
    kind: "final-order",
    id: WW_FINAL_ID,
  });
  assert.ok(isRealOrrEnforcementBody(wwFinal.body), "Wales & Western final order is official ORR TEXT");
  assert.ok(wwFinal.body.includes("£3,000,000"));

  const wwDraft = parseOrrEnforcementText(readFx(`${WW_DRAFT_ID}.txt`), {
    sourceUrl: WW_DRAFT_PDF,
    institution: "Network Rail Infrastructure Limited",
    date: "2024-05-29",
    id: WW_DRAFT_ID,
  });
  assert.ok(isRealOrrEnforcementBody(wwDraft.body), "Wales & Western s.56 notice is official ORR TEXT");

  const wwReport = parseOrrEnforcementText(readFx(`${WW_REPORT_ID}.txt`), {
    sourceUrl: WW_REPORT_PDF,
    institution: "Network Rail Infrastructure Limited",
    date: "2024-05-28",
    id: WW_REPORT_ID,
  });
  assert.ok(isRealOrrEnforcementBody(wwReport.body), "Wales & Western investigation report is official ORR TEXT");

  const nrEnh = parseOrrEnforcementText(readFx(`${NR_ENH_ID}.txt`), {
    sourceUrl: NR_ENH_PDF,
    institution: "Network Rail Infrastructure Limited",
    date: "2015-10-16",
    id: NR_ENH_ID,
  });
  assert.ok(isRealOrrEnforcementBody(nrEnh.body), "2015 Network Rail s.55(6) notice is official ORR TEXT");
  assert.ok(nrEnh.body.includes("Enhancements Improvement Plan"));

  const teaser = parseOrrEnforcementText(readFx("teaser.txt"), {
    sourceUrl: NORTHERN_NOTICE_PDF,
    institution: "Northern Trains Limited",
  });
  assert.equal(isRealOrrEnforcementBody(teaser.body), false, "HTML publication card is not the notice body");
  assert.ok(!teaser.body.includes("23 actions"));
  assert.ok(!teaser.body.includes("£3,000,000"));

  const peopleBody = parseOrrEnforcementText(readFx("people.txt"), {
    sourceUrl: NORTHERN_NOTICE_PDF,
    institution: "Jane Q Public",
  });
  assert.equal(isRealOrrEnforcementBody(peopleBody.body), false, "people file is not this SKU");

  const wrap = parseOrrEnforcementText(readFx("csv-wrap.txt"), {
    sourceUrl: NORTHERN_NOTICE_PDF,
    institution: "Northern Trains Limited",
  });
  assert.equal(isRealOrrEnforcementBody(wrap.body), false, "open-data CSV is not the sold unit");

  const manifest = buildOrrEnforcementManifest({
    ok: true,
    product: "orr-enforcement-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-27T00:00:00.000Z",
    asOf: "2026-03-03",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      index: HUB_URL,
      pdfHost: "https://www.orr.gov.uk/sites/default/files/",
    },
    cards: [northern, northernReport, wwFinal, wwDraft, wwReport, nrEnh],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 6);
  assert.equal((manifest.cards as { institution: string }[])[0]?.institution, "Northern Trains Limited");
  assert.equal((manifest.cards as { id: string }[])[0]?.id, NORTHERN_NOTICE_ID);
  assert.ok(!manBlob.includes("23 actions"), "free manifest must not dump notice body");
  assert.ok(!manBlob.includes("£3,000,000"));
  assert.ok(!manBlob.includes("Enhancements Improvement Plan"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.match(String(manifest.attribution), /Open Government Licence v3\.0/);
  assert.match(String(manifest.attribution), /Logos reserved/);

  const cache = mkdtempSync(join(tmpdir(), "orr-enforcement-collect-"));
  const prevDir = process.env.ORR_ENFORCEMENT_DIR;
  process.env.ORR_ENFORCEMENT_DIR = cache;
  try {
    const snap = await collectOrrEnforcement({ htmlDir: fixtures, limit: 6, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.equal(snap.cards.length, 6, "first slice harvests the six official bodies");
    assert.equal(snap.asOf, "2026-03-03");
    assert.ok(snap.cards.some((c) => c.id === NORTHERN_NOTICE_ID && isRealOrrEnforcementBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === NORTHERN_REPORT_ID && isRealOrrEnforcementBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === WW_FINAL_ID && isRealOrrEnforcementBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === WW_DRAFT_ID && isRealOrrEnforcementBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === WW_REPORT_ID && isRealOrrEnforcementBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === NR_ENH_ID && isRealOrrEnforcementBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealOrrEnforcementBody(c.body)));
    assert.ok(!snap.cards.some((c) => /jane|curriculum vitae/i.test(c.institution)), "skip people");
    assert.ok(snap.cards.every((c) => officialOrrPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectOrrEnforcement({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === NORTHERN_NOTICE_ID), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 6);
  } finally {
    if (prevDir === undefined) delete process.env.ORR_ENFORCEMENT_DIR;
    else process.env.ORR_ENFORCEMENT_DIR = prevDir;
  }

  console.log("orr-enforcement parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
