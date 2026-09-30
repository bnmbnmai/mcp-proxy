import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import { OCC_CD_TYPE, paidOccCdBody } from "./paid-records.js";
import {
  ATTRIBUTION,
  CARD_FIELDS,
  LICENSE,
  LISTING_URL,
  PDF_BASE,
  buildOccCdManifest,
  collectOccCd,
  docketFromRow,
  isInstitutionCdRow,
  isPeopleRow,
  isRealOccCdBody,
  isTerminatedRow,
  officialOccPdfUrl,
  officialStem,
  parseExportRows,
  parseOccCdText,
  pdfIdFromUrl,
  type OccExportRow,
} from "./occ-cd.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/occ-cd");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as OccExportRow[];
  const listed = parseExportRows(rows);
  assert.ok(listed.length >= 5, "official OCC excerpt lists institution C&Ds");
  const utb = listed.find((r) => r.id === "AA-ENF-2026-29");
  assert.ok(utb);
  assert.match(utb?.bank ?? "", /United Texas Bank/i);
  assert.equal(utb?.date, "2026-06-16");
  assert.equal(utb?.sourceUrl, `${PDF_BASE}eaAA-ENF-2026-29.pdf`);
  assert.ok(listed.some((r) => r.id === "AA-ENF-2025-21"));
  assert.ok(listed.some((r) => r.id === "AA-ENF-2025-63"));
  assert.ok(listed.some((r) => r.id === "AA-EC-2025-04"));
  assert.ok(listed.some((r) => r.id === "AA-ENF-2024-110"));
  assert.ok(!listed.some((r) => r.id === "AA-ENF-2026-28"), "skip IAP prohibition");
  assert.ok(!listed.some((r) => r.id === "AA-ENF-2026-15"), "skip IAP prohibition");
  const boa = listed.find((r) => r.id === "AA-ENF-2022-21");
  assert.ok(boa, "terminated institution C&D stays in this SKU");
  assert.equal(boa?.sourceUrl, `${PDF_BASE}ea2022-023.pdf`);
  assert.ok(listed.every((r) => officialOccPdfUrl(r.sourceUrl)));
  assert.equal(officialOccPdfUrl("https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf"), null);
  assert.equal(officialOccPdfUrl("https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf"), null);
  assert.equal(officialOccPdfUrl("https://www.sec.gov/Archives/edgar/data/0001/0001.txt"), null);
  assert.equal(officialOccPdfUrl("https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf"), `${PDF_BASE}eaAA-ENF-2026-29.pdf`);
  assert.equal(officialOccPdfUrl("AA-ENF-2026-29"), `${PDF_BASE}eaAA-ENF-2026-29.pdf`);
  assert.equal(officialOccPdfUrl("2023-031"), `${PDF_BASE}ea2023-031.pdf`);
  assert.equal(officialOccPdfUrl("https://www.occ.gov/static/enforcement-actions/ea2023-031.pdf"), `${PDF_BASE}ea2023-031.pdf`);
  assert.equal(officialOccPdfUrl("https://www.occ.gov/static/enforcement-actions/eaAA-EC-2020-64A.pdf"), `${PDF_BASE}eaAA-EC-2020-64A.pdf`);
  assert.equal(officialStem("2023-031"), "2023-031");
  assert.equal(officialStem("AA-WE- 2021-6"), "AA-WE-2021-6");
  assert.ok(LISTING_URL.includes("EASearch"));

  const leftoverRows = JSON.parse(readFx("leftover-listing-excerpt.json")) as OccExportRow[];
  const leftoverListed = parseExportRows(leftoverRows);
  assert.ok(leftoverListed.some((r) => r.id === "AA-WE-2025-20"), "leftover listing includes terminated EH National Bank");
  assert.ok(leftoverListed.some((r) => r.id === "AA-CE-2023-40"), "leftover listing includes leftover-active United Fidelity");
  assert.ok(leftoverListed.some((r) => r.id === "AA-ENF-2024-82"), "leftover listing includes terminated Clear Fork");
  assert.ok(leftoverListed.some((r) => r.id === "AA-WE-2021-6"), "leftover listing includes leftover-active Transact");
  assert.equal(leftoverListed.find((r) => r.id === "AA-CE-2023-40")?.sourceUrl, `${PDF_BASE}ea2023-031.pdf`);
  assert.equal(leftoverListed.find((r) => r.id === "AA-WE-2021-6")?.sourceUrl, `${PDF_BASE}ea2021-013.pdf`);
  assert.ok(!leftoverListed.some((r) => r.id === "AA-EC-10-113"), "skip leftover people/IAP prohibition");
  assert.ok(
    leftoverListed.every((r) => officialOccPdfUrl(r.sourceUrl)),
    "leftover walk keeps official occ.gov enforcement-action PDFs",
  );

  const people = rows.find((r) => (r.DocketNumber ?? "") === "AA-ENF-2026-28");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionCdRow(people!), false);
  const utbRow = rows.find((r) => r.DocketNumber === "AA-ENF-2026-29");
  assert.equal(isInstitutionCdRow(utbRow!), true);
  assert.equal(isPeopleRow(utbRow!), false);
  const boaRow = rows.find((r) => r.DocketNumber === "AA-ENF-2022-21");
  assert.equal(isTerminatedRow(boaRow!), true);
  assert.equal(isInstitutionCdRow(boaRow!), true, "terminated institution C&D is this SKU");
  assert.equal(docketFromRow(utbRow!), "AA-ENF-2026-29");
  const ehRow = leftoverRows.find((r) => (r.DocketNumber ?? "") === "AA-WE-2025-20");
  assert.equal(isInstitutionCdRow(ehRow!), true, "leftover terminated institution C&D is this SKU");
  const fidelityRow = leftoverRows.find((r) => r.DocketNumber === "AA-CE-2023-40");
  assert.equal(isInstitutionCdRow(fidelityRow!), true);

  const utbText = parseOccCdText(readFx("AA-ENF-2026-29.txt"), {
    sourceUrl: `${PDF_BASE}eaAA-ENF-2026-29.pdf`,
    bank: "United Texas Bank, National Association",
    location: "Dallas, TX",
    date: "2026-06-16",
    docket: "AA-ENF-2026-29",
  });
  assert.equal(utbText.docket, "AA-ENF-2026-29");
  assert.match(utbText.bank, /United Texas Bank/i);
  assert.equal(utbText.date, "2026-06-16");
  assert.equal(utbText.title, "Consent Order");
  assert.ok(isRealOccCdBody(utbText.body));
  assert.ok(utbText.body.includes("foreign correspondent banking and virtual currency customers"));
  assert.ok(utbText.body.includes("June 12, 2026"));
  assert.ok(CARD_FIELDS.every((f) => f in utbText));
  assert.equal(pdfIdFromUrl(utbText.sourceUrl), "AA-ENF-2026-29");

  const cfsb = parseOccCdText(readFx("AA-ENF-2025-21.txt"), {
    sourceUrl: `${PDF_BASE}eaAA-ENF-2025-21.pdf`,
    bank: "Community Federal Savings Bank",
    docket: "AA-ENF-2025-21",
  });
  assert.ok(isRealOccCdBody(cfsb.body));
  assert.ok(cfsb.body.includes("12 C.F.R. § 21.21"));

  const tfsb = parseOccCdText(readFx("AA-ENF-2025-63.txt"), {
    sourceUrl: `${PDF_BASE}eaAA-ENF-2025-63.pdf`,
    bank: "The Federal Savings Bank",
    docket: "AA-ENF-2025-63",
  });
  assert.ok(isRealOccCdBody(tfsb.body));
  assert.ok(tfsb.body.includes("VA cash-out refinance"));

  const enb = parseOccCdText(readFx("AA-EC-2025-04.txt"), {
    sourceUrl: `${PDF_BASE}eaAA-EC-2025-04.pdf`,
    bank: "Eastern National Bank",
    docket: "AA-EC-2025-04",
  });
  assert.ok(isRealOccCdBody(enb.body));
  assert.ok(enb.body.includes("tier 1 capital to adjusted total assets"));

  const north = parseOccCdText(readFx("AA-ENF-2024-110.txt"), {
    sourceUrl: `${PDF_BASE}eaAA-ENF-2024-110.pdf`,
    bank: "42 North Private Bank",
    docket: "AA-ENF-2024-110",
  });
  assert.ok(isRealOccCdBody(north.body));
  assert.ok(north.body.includes("Admirals Bank"));

  const eh = parseOccCdText(readFx("AA-WE-2025-20.txt"), {
    sourceUrl: `${PDF_BASE}eaAA-WE-2025-20.pdf`,
    bank: "EH National Bank",
    docket: "AA-WE-2025-20",
  });
  assert.ok(isRealOccCdBody(eh.body), "official leftover terminated EH National Bank is this SKU");
  assert.equal(eh.docket, "AA-WE-2025-20");
  assert.ok(eh.body.includes("Beverly Hills"));

  const fidelity = parseOccCdText(readFx("AA-CE-2023-40.txt"), {
    sourceUrl: `${PDF_BASE}ea2023-031.pdf`,
    bank: "United Fidelity Bank, F.S.B.",
    docket: "AA-CE-2023-40",
  });
  assert.ok(isRealOccCdBody(fidelity.body), "official leftover-active United Fidelity numeric PDF is this SKU");
  assert.equal(fidelity.sourceUrl, `${PDF_BASE}ea2023-031.pdf`);
  assert.equal(pdfIdFromUrl(fidelity.sourceUrl), "2023-031");
  assert.ok(fidelity.body.includes("Evansville"));

  const teaser = parseOccCdText(readFx("no-body.txt"), {
    sourceUrl: LISTING_URL,
    bank: "United Texas Bank, National Association",
  });
  assert.equal(isRealOccCdBody(teaser.body), false, "EASearch card teaser is not the order body");

  const dump = parseOccCdText(readFx("export-metadata.txt"), {
    sourceUrl: "https://apps.occ.gov/EASearch/Search/ExportToJSON",
    bank: "United Texas Bank, National Association",
  });
  assert.equal(isRealOccCdBody(dump.body), false, "ExportToJSON metadata is a KILL");

  const iap = parseOccCdText(readFx("iap-prohibition.txt"), {
    sourceUrl: `${PDF_BASE}eaAA-ENF-2026-28.pdf`,
    bank: "JPMorgan Chase Bank, National Association",
  });
  assert.equal(isRealOccCdBody(iap.body), false, "IAP prohibition is not this SKU");

  const term = parseOccCdText(readFx("termination.txt"), {
    sourceUrl: `${PDF_BASE}eaAA-ENF-2026-32.pdf`,
    bank: "Bank of America, N.A.",
  });
  assert.equal(isRealOccCdBody(term.body), false, "termination PDF is not the order body");

  const cfpb = parseOccCdText(readFx("cfpb-order.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
    bank: "American Honda Finance Corporation",
  });
  assert.equal(isRealOccCdBody(cfpb.body), false, "CFPB /cfpb-orders is not this SKU");

  const ftc = parseOccCdText(readFx("ftc-wl.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
    bank: "Vtron Inc. d/b/a Vtron Lasers",
  });
  assert.equal(isRealOccCdBody(ftc.body), false, "FTC /ftc-wl is not this SKU");

  const edgar = parseOccCdText(readFx("edgar-submission.txt"), {
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/0001/complete-submission.txt",
    bank: "Example Corp",
  });
  assert.equal(isRealOccCdBody(edgar.body), false, "SEC EDGAR complete-submission is a KILL");

  const manifest = buildOccCdManifest({
    ok: true,
    product: "occ-institution-cd-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-06-16",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      export: "https://apps.occ.gov/EASearch/Search/ExportToJSON",
      pdfHost: "https://www.occ.gov/",
    },
    cards: [utbText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { bank: string }[])[0]?.bank ?? "", /United Texas Bank/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "AA-ENF-2026-29");
  assert.ok(!manBlob.includes("foreign correspondent banking and virtual currency customers"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("June 12, 2026"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("eaAA-ENF-2026-29.pdf"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "OCC");
  assert.ok(!manBlob.includes("complaint_what_happened"));
  assert.ok(!manBlob.includes("vtron-lasers"));
  assert.ok(!manBlob.includes("nearly 35,000"));

  const cache = mkdtempSync(join(tmpdir(), "occ-cd-collect-"));
  const prevDir = process.env.OCC_CD_DIR;
  process.env.OCC_CD_DIR = cache;
  try {
    const snap = await collectOccCd({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 6, "fixture collect extracts first-slice seeds plus leftover official PDF text");
    assert.ok(snap.cards.some((c) => c.docket === "AA-ENF-2026-29" && isRealOccCdBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "AA-ENF-2025-21" && isRealOccCdBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "AA-ENF-2025-63" && isRealOccCdBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "AA-EC-2025-04" && isRealOccCdBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "AA-ENF-2024-110" && isRealOccCdBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "AA-WE-2025-20" && isRealOccCdBody(c.body)), "leftover terminated EH National Bank is collected");
    assert.ok(snap.cards.some((c) => c.docket === "AA-CE-2023-40" && isRealOccCdBody(c.body)), "leftover-active United Fidelity is collected");
    assert.ok(snap.cards.every((c) => isRealOccCdBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "AA-ENF-2026-28"), "skip IAP");
    assert.ok(snap.cards.every((c) => officialOccPdfUrl(c.sourceUrl)));
    assert.ok(snap.cards.every((c) => !/archive\.org|sec\.gov|ftc\.gov|consumerfinance\.gov/i.test(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectOccCd({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(
      merged.cards.some((c) => c.docket === "AA-ENF-2026-29"),
      "re-collect keeps cached bodies",
    );
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.OCC_CD_DIR;
    else process.env.OCC_CD_DIR = prevDir;
  }

  const seed = JSON.parse(readFx("seed-snapshot.json")) as {
    cards: { id?: string; bank?: string; body?: string }[];
  };
  const paid = paidOccCdBody(seed);
  assert.ok(paid.recordCount > 0, "empty records[] is a fail");
  assert.equal(paid.cards.length, seed.cards.length, "official cards[] stay");
  assert.equal(paid.records[0]?.type, OCC_CD_TYPE);
  assert.equal(paid.records[0]?.id, "AA-ENF-2026-29");
  assert.equal(paid.records[0]?.firm, "United Texas Bank, National Association");
  assert.equal(paid.cards[0]?.bank, "United Texas Bank, National Association");
  assert.deepEqual(Object.keys(paid.records[0] ?? {}).sort(), ["date", "firm", "id", "type", "url"]);
  assert.ok(paid.records.every((r) => r.firm && r.id && r.url));

  console.log("occ-cd parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
