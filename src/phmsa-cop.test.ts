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
  SEED_LISTINGS,
  buildPhmsaCopManifest,
  collectPhmsaCop,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealPhmsaCopBody,
  officialPhmsaCopPdfUrl,
  parseListingHtml,
  parseListingRows,
  parsePhmsaCopText,
  pdfIdFromUrl,
  type PhmsaCopListingRow,
} from "./phmsa-cop.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/phmsa-cop");
const EQT =
  "https://primis.phmsa.dot.gov/enforcement-documents/12025033NOPV/12025033NOPV_Consent%20Agreement%20and%20Order_04212026_(22-259271).pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as PhmsaCopListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official PHMSA excerpt lists operator orders");
  const eqt = listed.find((r) => r.id === "eqt-1-2025-033-nopv");
  assert.ok(eqt);
  assert.match(eqt?.institution ?? "", /EQT Production Company/i);
  assert.equal(eqt?.date, "2026-04-21");
  assert.equal(eqt?.sourceUrl, EQT);
  assert.ok(listed.some((r) => r.id === "denbury-4-2025-024-nopv1"));
  assert.ok(listed.some((r) => r.id === "cove-point-4-2025-010-nopso"));
  assert.ok(listed.some((r) => r.id === "valero-4-2026-004-nopv"));
  assert.ok(listed.some((r) => r.id === "enterprise-4-2026-005-cao"));
  assert.ok(!listed.some((r) => r.id === "jane-q-public"), "skip people");
  assert.ok(!listed.some((r) => r.id === "eqt-case-card"), "skip case-card teaser");
  assert.ok(!listed.some((r) => r.id === "republic-42025024NOPV2"), "skip Republic lab split-off");
  assert.ok(!listed.some((r) => r.id === "phmsa-27nc-rsge"), "skip incident NARRATIVE");
  assert.ok(!listed.some((r) => r.id === "raw-data"), "skip Raw Data.txt");
  assert.ok(!listed.some((r) => r.id === "page-data"), "skip page-data.json");
  assert.ok(!listed.some((r) => r.id === "hazmat-shipper"), "skip hazmat shipper tickets");
  assert.ok(listed.every((r) => officialPhmsaCopPdfUrl(r.sourceUrl)));
  assert.equal(officialPhmsaCopPdfUrl(EQT), EQT);
  assert.equal(officialPhmsaCopPdfUrl("https://primis.phmsa.dot.gov/enforcement-data/case/12025033NOPV"), null);
  assert.equal(
    officialPhmsaCopPdfUrl("https://primis.phmsa.dot.gov/enforcement-documents/PHMSA%20Pipeline%20Enforcement%20Raw%20Data.txt"),
    null,
  );
  assert.equal(officialPhmsaCopPdfUrl("https://www.federalregister.gov/documents/2026/04/21/eqt"), null);
  assert.equal(officialPhmsaCopPdfUrl("https://catalog.data.gov/dataset/phmsa"), null);
  assert.equal(officialPhmsaCopPdfUrl("https://www.govinfo.gov/content/pkg/eqt.pdf"), null);
  assert.equal(officialPhmsaCopPdfUrl("https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf"), null);
  assert.ok(LISTING_URL.includes("primis.phmsa.dot.gov/enforcement-documents"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "eqt-1-2025-033-nopv"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "eqt-1-2025-033-nopv"));
  assert.ok(htmlListed.some((r) => /EQT/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /Denbury/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /Jane Q Public/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /Raw Data/i.test(r.title)));

  const people = rows.find((r) => (r.docket ?? "") === "jane-q-public");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const eqtRow = rows.find((r) => r.docket === "eqt-1-2025-033-nopv" && officialPhmsaCopPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(eqtRow!), true);
  assert.equal(isPeopleRow(eqtRow!), false);
  const teaser = rows.find((r) => r.docket === "eqt-case-card");
  assert.equal(isInstitutionOrderRow(teaser!), false, "case-card teaser is not this SKU");

  const eqtText = parsePhmsaCopText(readFx("eqt-1-2025-033-nopv.txt"), {
    sourceUrl: EQT,
    institution: "EQT Production Company",
    date: "2026-04-21",
    docket: "eqt-1-2025-033-nopv",
    title: "Consent Agreement and Order",
  });
  assert.equal(eqtText.docket, "eqt-1-2025-033-nopv");
  assert.match(eqtText.institution, /EQT Production Company/i);
  assert.equal(eqtText.date, "2026-04-21");
  assert.equal(eqtText.title, "Consent Agreement and Order");
  assert.ok(isRealPhmsaCopBody(eqtText.body));
  assert.ok(eqtText.body.includes("Rager Mountain"));
  assert.ok(eqtText.body.includes("Well 2244"));
  assert.ok(eqtText.body.includes("top joint casing corrosion"));
  assert.ok(eqtText.body.includes("466,550"));
  assert.ok(CARD_FIELDS.every((f) => f in eqtText));
  assert.equal(
    pdfIdFromUrl(eqtText.sourceUrl),
    "12025033NOPV_Consent Agreement and Order_04212026_(22-259271).pdf",
  );
  assert.equal(eqtText.sourceUrl, EQT);

  for (const [file, docket, url] of [
    [
      "denbury-4-2025-024-nopv1.txt",
      "denbury-4-2025-024-nopv1",
      "https://primis.phmsa.dot.gov/enforcement-documents/42025024NOPV1/42025024NOPV1_Consent%20Agreement%20and%20Order_05222026_(23-284937).pdf",
    ],
    [
      "cove-point-4-2025-010-nopso.txt",
      "cove-point-4-2025-010-nopso",
      "https://primis.phmsa.dot.gov/enforcement-documents/42025010NOPSO/42025010NOPSO_Consent%20Agreement%20and%20Order_01282026_(25-353455).pdf",
    ],
    [
      "valero-4-2026-004-nopv.txt",
      "valero-4-2026-004-nopv",
      "https://primis.phmsa.dot.gov/enforcement-documents/42026004NOPV/42026004NOPV_Final%20Order_04012026_(25-329817).pdf",
    ],
    [
      "enterprise-4-2026-005-cao.txt",
      "enterprise-4-2026-005-cao",
      "https://primis.phmsa.dot.gov/enforcement-documents/42026005CAO/42026005CAO_Corrective%20Action%20Order_02172026_(26-364755).pdf",
    ],
  ] as const) {
    const card = parsePhmsaCopText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealPhmsaCopBody(card.body), `${docket} is official PHMSA order TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialPhmsaCopPdfUrl(card.sourceUrl));
  }

  const teaserBody = parsePhmsaCopText(readFx("no-body.txt"), {
    sourceUrl: "https://primis.phmsa.dot.gov/enforcement-data/case/12025033NOPV",
    institution: "EQT Production Company",
  });
  assert.equal(isRealPhmsaCopBody(teaserBody.body), false, "case-card teaser is not the order body");
  assert.ok(!teaserBody.body.includes("Rager Mountain"));
  assert.ok(!teaserBody.body.includes("Well 2244"));
  assert.ok(!teaserBody.body.includes("top joint casing corrosion"));
  assert.ok(!teaserBody.body.includes("466,550"));

  const peopleBody = parsePhmsaCopText(readFx("people.txt"), {
    sourceUrl: EQT,
    institution: "Jane Q Public",
  });
  assert.equal(isRealPhmsaCopBody(peopleBody.body), false, "people file is not this SKU");

  const fr = parsePhmsaCopText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/04/21/2026-99999/eqt",
    institution: "EQT Production Company",
  });
  assert.equal(isRealPhmsaCopBody(fr.body), false, "Federal Register raw_text is a KILL");

  const raw = parsePhmsaCopText(readFx("raw-data.txt"), {
    sourceUrl: "https://primis.phmsa.dot.gov/enforcement-documents/PHMSA%20Pipeline%20Enforcement%20Raw%20Data.txt",
    institution: "PHMSA",
  });
  assert.equal(isRealPhmsaCopBody(raw.body), false, "Raw Data.txt codes file is a KILL");

  const pageData = parsePhmsaCopText(readFx("page-data.json"), {
    sourceUrl: "https://primis.phmsa.dot.gov/enforcement-documents/page-data.json",
    institution: "EQT Production Company",
  });
  assert.equal(isRealPhmsaCopBody(pageData.body), false, "page-data.json is a KILL");

  const narrative = parsePhmsaCopText(readFx("incident-narrative.txt"), {
    sourceUrl: "https://www.phmsa.dot.gov/sites/phmsa.dot.gov/files/2024-06/20230212-Gulf-South-Jackson-MS-Final2-May-2024.pdf",
    institution: "Gulf South Pipeline Company, LLC",
  });
  assert.equal(isRealPhmsaCopBody(narrative.body), false, "27nc-rsge incident NARRATIVE is a KILL");

  const republic = parsePhmsaCopText(readFx("republic-lab.txt"), {
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/42025024NOPV2/42025024NOPV2_Consent%20Agreement%20and%20Order_05222026_(23-284937).pdf",
    institution: "Republic Testing Laboratories, LLC",
  });
  assert.equal(isRealPhmsaCopBody(republic.body), false, "Republic 42025024NOPV2 is a KILL");

  const ico = parsePhmsaCopText(readFx("ico-mpn.txt"), {
    sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
    institution: "Reddit, Inc.",
  });
  assert.equal(isRealPhmsaCopBody(ico.body), false, "ICO /ico-mpn is not this SKU");

  const superfund = parsePhmsaCopText(readFx("superfund-rod.txt"), {
    sourceUrl: "https://semspub.epa.gov/work/05/711427.pdf",
    institution: "Federated Metals Corp. Whiting Superfund Site",
  });
  assert.equal(isRealPhmsaCopBody(superfund.body), false, "Superfund /superfund-rods is not this SKU");

  const cftc = parsePhmsaCopText(readFx("cftc-order.txt"), {
    sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealPhmsaCopBody(cftc.body), false, "CFTC /cftc-orders is not this SKU");

  const manifest = buildPhmsaCopManifest({
    ok: true,
    product: "phmsa-ops-consent-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-04-21",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://primis.phmsa.dot.gov/enforcement-documents/" },
    cards: [eqtText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /EQT/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "eqt-1-2025-033-nopv");
  assert.ok(!manBlob.includes("Rager Mountain"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("Well 2244"));
  assert.ok(!manBlob.includes("Well #2244"));
  assert.ok(!manBlob.includes("1.037 billion cubic feet"));
  assert.ok(!manBlob.includes("top joint casing corrosion"));
  assert.ok(!manBlob.includes("466,550"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("eqt-1-2025-033-nopv"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 U.S.C. § 105");
  assert.match(String(manifest.attribution), /17 U\.S\.C\. § 105/);

  const cache = mkdtempSync(join(tmpdir(), "phmsa-cop-collect-"));
  const prevDir = process.env.PHMSA_COP_DIR;
  process.env.PHMSA_COP_DIR = cache;
  try {
    const snap = await collectPhmsaCop({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official PHMSA order bodies");
    assert.ok(snap.cards.some((c) => c.docket === "eqt-1-2025-033-nopv" && isRealPhmsaCopBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealPhmsaCopBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "jane-q-public"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "eqt-case-card"), "skip case-card teaser");
    assert.ok(!snap.cards.some((c) => c.id === "republic-42025024NOPV2"), "skip Republic lab");
    assert.ok(snap.cards.every((c) => officialPhmsaCopPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectPhmsaCop({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "eqt-1-2025-033-nopv"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.PHMSA_COP_DIR;
    else process.env.PHMSA_COP_DIR = prevDir;
  }

  console.log("phmsa-cop parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
