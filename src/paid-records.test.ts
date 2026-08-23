import assert from "node:assert/strict";
import {
  AIR_LETTER_TYPE,
  CFTC_ORDER_TYPE,
  CMA_CA98_TYPE,
  FIFRA_ORDER_TYPE,
  FORM_483_TYPE,
  FTC_WL_TYPE,
  ICO_MPN_TYPE,
  IMPORT_ALERT_TYPE,
  RECORD_FIELDS,
  TICKS_CACHE_SOURCE,
  UNTITLED_LETTER_TYPE,
  WARNING_LETTER_TYPE,
  honestFetchedAt,
  isoFromOfficialDate,
  isPlausibleDate,
  normalizeCardRecords,
  normalizeForm483Records,
  normalizeImportAlertRecords,
  normalizeTicksRecords,
  normalizeWarningLetterRecords,
  paidAirLettersBody,
  paidCftcOrdersBody,
  paidCmaCa98Body,
  paidFifraOrdersBody,
  paidForm483Body,
  paidFtcWlBody,
  paidIcoMpnBody,
  paidImportAlertsBody,
  paidTicksBody,
  paidUntitledLettersBody,
  paidWarningLettersBody,
} from "./paid-records.js";

function letter(n: number, date: string, extra: Record<string, unknown> = {}) {
  return {
    id: `firm-${n}-${date.replaceAll("-", "")}`,
    firm: `Firm ${n}`,
    issuedOn: date,
    publishedOn: date,
    recordDate: date,
    sourceUrl: `https://www.fda.gov/media/${1000 + n}/download`,
    body: `This document lists observations.\nOBSERVATION 1\n${"x".repeat(200)}`,
    ...extra,
  };
}

async function main(): Promise<void> {
  assert.equal(isPlausibleDate("2825-01-21"), false);
  assert.equal(isPlausibleDate("2026-08-12"), true);
  assert.equal(isPlausibleDate(""), false);
  assert.equal(honestFetchedAt("2825-01-21T00:00:00Z"), null);
  assert.equal(honestFetchedAt("2026-08-23T10:29:03Z"), "2026-08-23T10:29:03Z");

  const ticksCache = {
    ok: true as const,
    product: "idaho-hay-feeder-ticks" as const,
    sources: ["Twin Falls", "Blackfoot"],
    status: "ok" as const,
    reason: null,
    fetchedAt: "2026-08-23T10:29:03Z",
    ticks: [
      {
        id: "cattle-bf-feeder-steer",
        group: "cattle",
        commodity: "Feeder steers",
        market: "Blackfoot Livestock Auction",
        unit: "$/cwt",
        price: 376.57,
        asOf: "2026-08-14",
        source: "Blackfoot Livestock Auction representative sales",
        sourceUrl: "https://blackfootlivestockauction.com/representative-sales/",
      },
      {
        id: "cattle-tf-feeder-steer",
        group: "cattle",
        commodity: "Feeder steers",
        market: "Twin Falls Livestock Commission (Wednesday auction)",
        unit: "$/cwt",
        price: 400.2,
        asOf: "2026-08-12",
        source: "Twin Falls Livestock Commission market report",
        sourceUrl: "http://www.twinfallslivestock.com/wed.pdf",
      },
      {
        id: "hay-id-poison",
        group: "hay",
        market: "Idaho Direct Hay",
        asOf: "2825-01-21",
        sourceUrl: "https://www.ams.usda.gov/mnreports/ams_3056.pdf",
      },
    ],
    failed: [],
    history: { points: [], emptyReports: [], series: [] },
  };

  const ticksA = paidTicksBody(ticksCache);
  const ticksB = paidTicksBody(structuredClone(ticksCache));
  assert.deepEqual(ticksA.records, ticksB.records, "ticks normalize is deterministic");
  assert.equal(JSON.stringify(ticksA.records), JSON.stringify(ticksB.records));
  assert.deepEqual(ticksA.ticks, ticksCache.ticks, "existing ticks[] keys stay");
  assert.deepEqual(ticksA.sources, ticksCache.sources);
  assert.equal(ticksA.product, "idaho-hay-feeder-ticks");
  assert.equal(ticksA.fetchedAt, "2026-08-23T10:29:03Z");
  assert.equal(ticksA.asOf, "2026-08-14");
  assert.equal(ticksA.source, TICKS_CACHE_SOURCE);
  assert.equal(ticksA.recordCount, 3);
  assert.equal(ticksA.records[0]?.id, "cattle-bf-feeder-steer");
  assert.equal(ticksA.records[0]?.date, "2026-08-14");
  assert.equal(ticksA.records[0]?.firm, "Blackfoot Livestock Auction");
  assert.equal(ticksA.records[0]?.type, "cattle");
  assert.equal(ticksA.records[2]?.id, "hay-id-poison");
  assert.equal(ticksA.records[2]?.date, null, "year-2825 is not sold as asOf");
  assert.deepEqual(Object.keys(ticksA.records[0] ?? {}).sort(), [...RECORD_FIELDS].sort());

  const letters = [
    letter(1, "2026-07-01"),
    letter(2, "2026-07-31"),
    letter(3, "2026-06-15"),
    letter(4, "2026-08-12"),
    letter(5, "2026-05-01"),
    letter(6, "2026-08-01"),
    letter(7, "2825-01-21", { issuedOn: "2825-01-21", publishedOn: "2026-02-03", recordDate: "2026-01-21" }),
    { id: "empty-body", firm: "No Text Inc", publishedOn: "2026-08-12", sourceUrl: "https://www.fda.gov/media/1/download", body: "" },
  ];

  const f483Snap = {
    ok: true as const,
    product: "fda-form-483-bodies" as const,
    status: "ok" as const,
    reason: null,
    fetchedAt: "2026-08-23T10:30:48.442Z",
    asOf: "2825-01-21",
    sources: {
      listing: "https://www.fda.gov/about-fda/office-inspections-and-investigations/oii-foia-electronic-reading-room",
    },
    letters,
  };
  const f483A = paidForm483Body(f483Snap);
  const f483B = paidForm483Body(structuredClone(f483Snap));
  assert.deepEqual(f483A.records, f483B.records, "483 normalize is deterministic");
  assert.equal(JSON.stringify(f483A.records), JSON.stringify(normalizeForm483Records(f483Snap)));
  assert.equal(f483A.letters.length, 8, "raw letters[] stay, including empty-body rows");
  assert.equal(f483A.letters[0]?.firm, "Firm 1");
  assert.ok(f483A.recordCount > 5, "paid records grow past the old first-slice 5");
  assert.equal(f483A.recordCount, 7);
  assert.equal(f483A.asOf, "2026-08-12", "year-2825 snapshot asOf is replaced by latest plausible record date");
  assert.equal(f483A.records[0]?.id, "firm-4-20260812");
  assert.equal(f483A.records[0]?.type, FORM_483_TYPE);
  assert.equal(f483A.records.find((r) => r.id === "firm-7-28250121")?.date, "2026-02-03");
  assert.ok(!f483A.records.some((r) => r.id === "empty-body"));
  assert.equal(f483A.source.includes("oii-foia-electronic-reading-room"), true);

  const wlLetters = letters.map((row, i) => ({
    ...row,
    cms: String(700000 + i),
    subject: "CGMP",
    sourceUrl: `https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/${row.id}`,
  }));
  const wlSnap = {
    ok: true as const,
    product: "fda-warning-letter-bodies" as const,
    status: "ok" as const,
    reason: null,
    fetchedAt: "2026-08-19T15:20:36.317Z",
    asOf: "2026-08-12",
    sources: {
      listing:
        "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters",
    },
    letters: wlLetters,
  };
  const wlA = paidWarningLettersBody(wlSnap);
  const wlB = paidWarningLettersBody(structuredClone(wlSnap));
  assert.deepEqual(wlA.records, wlB.records, "warning-letter normalize is deterministic");
  assert.deepEqual(wlA.records, normalizeWarningLetterRecords(wlSnap));
  assert.equal(wlA.letters[0]?.cms, "700000");
  assert.ok(wlA.recordCount > 5);
  assert.equal(wlA.recordCount, 7);
  assert.equal(wlA.asOf, "2026-08-12");
  assert.equal(wlA.records[0]?.type, WARNING_LETTER_TYPE);
  assert.equal(wlA.records.find((r) => r.id.startsWith("firm-7-"))?.date, null, "WL issuedOn 2825 is dropped");
  assert.equal(wlA.source.includes("warning-letters"), true);

  const shuffled = paidForm483Body({
    ...f483Snap,
    letters: [...letters].reverse(),
  });
  assert.deepEqual(
    shuffled.records.map((r) => r.id),
    f483A.records.map((r) => r.id),
    "record order is date-desc then id, not cache insertion order",
  );

  assert.equal(isoFromOfficialDate("06/08/2012"), "2012-06-08");
  assert.equal(isoFromOfficialDate("2026-08-17"), "2026-08-17");
  assert.equal(isoFromOfficialDate("2825-01-21"), null);

  function card(n: number, date: string, extra: Record<string, unknown> = {}) {
    return {
      id: `card-${n}`,
      docket: `docket-${n}`,
      institution: `Institution ${n}`,
      date,
      sourceUrl: `https://example.gov/doc/${n}.pdf`,
      body: `Official body ${n}\n${"x".repeat(80)}`,
      ...extra,
    };
  }

  const cards = [
    card(1, "2026-01-01"),
    card(2, "2026-07-31"),
    card(3, "2025-02-21"),
    card(4, "2026-08-12"),
    card(5, "2026-06-22"),
    { id: "empty-card", institution: "No Text Ltd", date: "2026-08-01", sourceUrl: "https://example.gov/empty.pdf", body: "" },
    card(6, "2825-01-21"),
  ];

  const cmaSnap = {
    ok: true as const,
    product: "cma-ca98-infringement-decision-bodies" as const,
    status: "ok" as const,
    reason: null,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-08-12",
    sources: {
      listing: "https://www.gov.uk/cma-cases/financial-services-sector-suspected-anti-competitive-practices",
    },
    cards,
  };
  const cmaA = paidCmaCa98Body(cmaSnap);
  const cmaB = paidCmaCa98Body(structuredClone(cmaSnap));
  assert.deepEqual(cmaA.records, cmaB.records, "cma-ca98 normalize is deterministic");
  assert.deepEqual(cmaA.records, normalizeCardRecords(cmaSnap, CMA_CA98_TYPE));
  assert.equal(cmaA.cards.length, 7, "raw cards[] stay, including empty-body rows");
  assert.equal(cmaA.cards[0]?.institution, "Institution 1");
  assert.ok(cmaA.recordCount > 0, "empty records[] is a fail");
  assert.equal(cmaA.recordCount, 6);
  assert.equal(cmaA.asOf, "2026-08-12");
  assert.equal(cmaA.records[0]?.id, "card-4");
  assert.equal(cmaA.records[0]?.firm, "Institution 4");
  assert.equal(cmaA.records[0]?.type, CMA_CA98_TYPE);
  assert.equal(cmaA.records.find((r) => r.id === "card-6")?.date, null, "year-2825 card date is dropped");
  assert.ok(!cmaA.records.some((r) => r.id === "empty-card"));
  assert.deepEqual(Object.keys(cmaA.records[0] ?? {}).sort(), [...RECORD_FIELDS].sort());

  const icoA = paidIcoMpnBody({ ...cmaSnap, product: "ico-institution-mpn-bodies" as const });
  assert.equal(icoA.records[0]?.type, ICO_MPN_TYPE);
  assert.equal(icoA.recordCount, 6);
  assert.deepEqual(icoA.cards, cmaSnap.cards);

  const ftcCards = cards.map((row, i) => ({
    ...row,
    firm: `Firm ${i + 1}`,
    institution: undefined,
  }));
  const ftcA = paidFtcWlBody({
    ok: true as const,
    product: "ftc-bcp-warning-letter-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-07-06",
    sources: { listing: "https://www.ftc.gov/legal-library/browse/warning-letters" },
    cards: ftcCards,
  });
  assert.equal(ftcA.records[0]?.type, FTC_WL_TYPE);
  assert.equal(ftcA.records[0]?.firm, "Firm 4");
  assert.ok(ftcA.recordCount > 0);

  const untitledA = paidUntitledLettersBody({
    ok: true as const,
    product: "fda-untitled-letter-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-19T22:20:31.840Z",
    asOf: "2026-07-15",
    sources: {
      hub: "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/issuance-untitled-letters",
    },
    cards: [
      {
        id: "bayer-healthcare-pharmaceuticals-inc-192241",
        mediaId: "192241",
        firm: "Bayer HealthCare Pharmaceuticals, Inc.",
        date: "2026-04-28",
        sourceUrl: "https://www.fda.gov/media/192241/download",
        body: "The Office of Prescription Drug Promotion has reviewed the promotional communications.",
      },
      {
        mediaId: "193721",
        firm: "Sanofi Vaccines US Inc.",
        date: "2026-07-15",
        sourceUrl: "https://www.fda.gov/media/193721/download",
        body: "Untitled letter body for Beyfortus.",
      },
    ],
  });
  assert.equal(untitledA.records[0]?.type, UNTITLED_LETTER_TYPE);
  assert.equal(untitledA.records[0]?.id, "193721", "mediaId is a stable fallback when id is absent");
  assert.equal(untitledA.records[0]?.date, "2026-07-15");
  assert.equal(untitledA.records[1]?.id, "bayer-healthcare-pharmaceuticals-inc-192241");
  assert.equal(untitledA.source.includes("issuance-untitled-letters"), true);
  assert.ok(untitledA.recordCount > 0);

  const airA = paidAirLettersBody({
    ok: true as const,
    product: "aphis-air-confirmation-letter-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-06-22",
    sources: { listing: "https://www.aphis.usda.gov/confirmation-letters" },
    cards: [
      {
        id: "26-173-01air",
        institution: "KAGOME Co., LTD.",
        docket: "26-173-01air",
        date: "2026-06-22",
        sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf",
        body: "Confirmation of the regulatory status\n26-173-01air\n7 CFR part 340",
      },
    ],
  });
  assert.equal(airA.records[0]?.type, AIR_LETTER_TYPE);
  assert.equal(airA.records[0]?.id, "26-173-01air");
  assert.equal(airA.records[0]?.firm, "KAGOME Co., LTD.");
  assert.ok(airA.recordCount > 0);

  const cftcA = paidCftcOrdersBody({
    ok: true as const,
    product: "cftc-institution-order-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-07-31",
    sources: { listing: "https://www.cftc.gov/LawRegulation/Enforcement/EnforcementActions/index.htm" },
    cards: [
      {
        id: "26-04",
        institution: "UBS Financial Services Inc.",
        docket: "26-04",
        date: "2026-07-31",
        sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
        body: "ORDER INSTITUTING PROCEEDINGS\nCFTC Docket No. 26-04",
      },
    ],
  });
  assert.equal(cftcA.records[0]?.type, CFTC_ORDER_TYPE);
  assert.equal(cftcA.records[0]?.id, "26-04");
  assert.ok(cftcA.recordCount > 0);

  const fifraA = paidFifraOrdersBody({
    ok: true as const,
    product: "fifra-institution-order-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-07-29",
    sources: { listing: "https://yosemite.epa.gov/oa/rhc/epaadmin.nsf" },
    cards: [
      {
        id: "FIFRA-05-2026-0015",
        institution: "Travel Caddy, Inc. dba Travelon",
        docket: "FIFRA-05-2026-0015",
        date: "2026-07-29",
        sourceUrl:
          "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/FIFRA-05-2026-0015_CAFO_TravelCaddyIncdbaTravelon_FranklinParkIllinois_14PGS.pdf",
        body: "Consent Agreement and Final Order\nFIFRA-05-2026-0015",
      },
    ],
  });
  assert.equal(fifraA.records[0]?.type, FIFRA_ORDER_TYPE);
  assert.equal(fifraA.records[0]?.id, "FIFRA-05-2026-0015");
  assert.ok(fifraA.recordCount > 0);

  const iaSnap = {
    ok: true as const,
    product: "fda-import-alerts" as const,
    status: "ok" as const,
    reason: null,
    fetchedAt: "2026-08-18T00:56:39.767Z",
    asOf: "2026-08-17",
    sources: {
      catalog: "https://www.accessdata.fda.gov/cms_ia/ialist.html",
    },
    ticks: [
      {
        alertNumber: "16-81",
        type: "DWPE",
        list: "red",
        firm: "Clover Valley Meat Co.",
        country: "AUSTRALIA",
        product: "Alligator & Crocodile, Other Aquatic Species — Crocodile",
        datePublished: "06/08/2012",
        sourceUrl: "https://www.accessdata.fda.gov/cms_ia/importalert_49.html",
        asOf: "2026-08-17",
      },
      {
        alertNumber: "99-05",
        type: "DWPE",
        list: "green",
        firm: "Example Produce Ltd",
        product: "Lettuce",
        datePublished: "08/17/2026",
        sourceUrl: "https://www.accessdata.fda.gov/cms_ia/importalert_258.html",
        asOf: "2026-08-17",
      },
    ],
  };
  const iaA = paidImportAlertsBody(iaSnap);
  const iaB = paidImportAlertsBody(structuredClone(iaSnap));
  assert.deepEqual(iaA.records, iaB.records, "import-alerts normalize is deterministic");
  assert.deepEqual(iaA.records, normalizeImportAlertRecords(iaSnap));
  assert.equal(iaA.ticks[0]?.firm, "Clover Valley Meat Co.", "existing ticks[] stay");
  assert.equal(iaA.recordCount, 2);
  assert.ok(iaA.recordCount > 0);
  assert.equal(iaA.records[0]?.date, "2026-08-17");
  assert.equal(iaA.records[0]?.type, IMPORT_ALERT_TYPE);
  assert.equal(iaA.records[1]?.id, "16-81:red:Clover Valley Meat Co.:Alligator & Crocodile, Other Aquatic Species — Crocodile");
  assert.equal(iaA.records[1]?.date, "2012-06-08", "cms_ia MM/DD/YYYY is mapped, not invented");
  assert.equal(iaA.source.includes("cms_ia/ialist.html"), true);

  console.log("paid-records normalize tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
