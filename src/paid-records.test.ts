import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AIR_LETTER_TYPE,
  AWA_TYPE,
  BIS_ORDER_TYPE,
  CFPB_ORDER_TYPE,
  CFTC_ORDER_TYPE,
  CMA_CA98_TYPE,
  DENOVO_ORDER_TYPE,
  FDIC_ORDER_TYPE,
  FERC_ORDER_TYPE,
  FIFRA_ORDER_TYPE,
  FINCEN_ORDER_TYPE,
  FORM_483_TYPE,
  FRB_ORDER_TYPE,
  FTC_WL_TYPE,
  GMP_MD_TYPE,
  GMP_TYPE,
  ICO_MPN_TYPE,
  IMPORT_ALERT_TYPE,
  MARINERS_D11_TYPE,
  MARINERS_TYPE,
  NCUA_ORDER_TYPE,
  OCC_CD_TYPE,
  OFAC_ORDER_TYPE,
  PCAC_TYPE,
  DEFAULT_PAID_BODY_WINDOW,
  EXTRACTED_BODY_SKUS,
  RECORD_FIELDS,
  SUPERFUND_ROD_TYPE,
  SWISSPAR_TYPE,
  TICKS_CACHE_SOURCE,
  TTB_OIC_TYPE,
  UNTITLED_LETTER_TYPE,
  WARNING_LETTER_TYPE,
  honestFetchedAt,
  isoFromOfficialDate,
  isPlausibleDate,
  newestOfficialTextsCopy,
  olderChunkCopy,
  paidBodyCatalogNote,
  paidBodyOptsFromSearch,
  paidBodyWindow,
  normalizeCardRecords,
  normalizeForm483Records,
  normalizeImportAlertRecords,
  normalizeMarinersRecords,
  normalizeTicksRecords,
  normalizeWarningLetterRecords,
  paidAirLettersBody,
  paidAwaBody,
  paidBisOrdersBody,
  paidCfpbOrdersBody,
  paidCftcOrdersBody,
  paidCmaCa98Body,
  paidDenovoOrdersBody,
  paidFdicOrdersBody,
  paidFercOrdersBody,
  paidFifraOrdersBody,
  paidFincenOrdersBody,
  paidForm483Body,
  paidFrbOrdersBody,
  paidFtcWlBody,
  paidGmpBody,
  paidGmpMdBody,
  paidIcoMpnBody,
  paidImportAlertsBody,
  paidMarinersBody,
  paidMarinersD11Body,
  paidNcuaOrdersBody,
  paidOccCdBody,
  paidOfacOrdersBody,
  paidPcacBody,
  paidSuperfundRodsBody,
  paidSwissparBody,
  paidTicksBody,
  paidTtbOicBody,
  paidUntitledLettersBody,
  paidWarningLettersBody,
} from "./paid-records.js";

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures");

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
  assert.deepEqual(f483A.records, normalizeForm483Records(f483Snap), "catalog under the default window stays complete");
  assert.equal(f483A.letters.length, 7, "paid letters[] are official extracted bodies only");
  assert.equal(f483A.letters[0]?.firm, "Firm 4", "paid letters[] are newest-first");
  assert.ok(f483A.recordCount > 5, "paid records grow past the old first-slice 5");
  assert.equal(f483A.recordCount, 7);
  assert.equal(f483A.catalogCount, 7);
  assert.equal(f483A.paidWindow, DEFAULT_PAID_BODY_WINDOW);
  assert.equal(f483A.asOf, "2026-08-12", "year-2825 snapshot asOf is replaced by latest plausible record date");
  assert.equal(f483A.records[0]?.id, "firm-4-20260812");
  assert.equal(f483A.records[0]?.type, FORM_483_TYPE);
  assert.equal(f483A.records.find((r) => r.id === "firm-7-28250121")?.date, "2026-02-03");
  assert.ok(!f483A.records.some((r) => r.id === "empty-body"));
  assert.ok(!f483A.letters.some((row) => row.id === "empty-body"));
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
  assert.equal(wlA.letters[0]?.cms, "700003", "paid letters[] are newest-first (firm-4)");
  assert.ok(wlA.recordCount > 5);
  assert.equal(wlA.recordCount, 7);
  assert.equal(wlA.catalogCount, 7);
  assert.equal(wlA.paidWindow, DEFAULT_PAID_BODY_WINDOW);
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
  assert.equal(cmaA.cards.length, 6, "paid cards[] are official extracted bodies only");
  assert.equal(cmaA.cards[0]?.institution, "Institution 4", "paid cards[] are newest-first");
  assert.ok(cmaA.recordCount > 0, "empty records[] is a fail");
  assert.equal(cmaA.recordCount, 6);
  assert.equal(cmaA.catalogCount, 6);
  assert.equal(cmaA.paidWindow, DEFAULT_PAID_BODY_WINDOW);
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
  assert.equal(icoA.cards.length, 6);
  assert.ok(!icoA.cards.some((row) => row.id === "empty-card"));

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

  const denovoA = paidDenovoOrdersBody({
    ok: true as const,
    product: "fda-denovo-classification-order-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-07-28",
    sources: { listing: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/denovo.cfm" },
    cards: [
      {
        id: "DEN250042",
        institution: "Caristo Diagnostics Ltd.",
        docket: "DEN250042",
        date: "2026-07-28",
        sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf",
        body: "De Novo classification order\nDEN250042\nCaRi-Heart",
      },
      {
        id: "empty-denovo",
        institution: "No Text Devices Ltd",
        date: "2026-07-01",
        sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/empty.pdf",
        body: "",
      },
    ],
  });
  assert.deepEqual(denovoA.records, normalizeCardRecords(denovoA, DENOVO_ORDER_TYPE));
  assert.equal(denovoA.cards.length, 1, "paid cards[] drop empty-body rows");
  assert.ok(denovoA.recordCount > 0, "empty records[] is a fail");
  assert.equal(denovoA.recordCount, 1);
  assert.equal(denovoA.records[0]?.id, "DEN250042");
  assert.equal(denovoA.records[0]?.firm, "Caristo Diagnostics Ltd.");
  assert.equal(denovoA.records[0]?.type, DENOVO_ORDER_TYPE);
  assert.deepEqual(Object.keys(denovoA.records[0] ?? {}).sort(), [...RECORD_FIELDS].sort());
  assert.ok(!denovoA.records.some((r) => r.id === "empty-denovo"));

  const ttbA = paidTtbOicBody({
    ok: true as const,
    product: "ttb-institution-oic-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-06-30",
    sources: { listing: "https://www.ttb.gov/business-central/fo/administrative-cases" },
    cards: [
      {
        id: "21st-amendment",
        institution: "The 21st Amendment Brewery Cafe, LLC",
        docket: "21st-amendment",
        date: "2026-06-30",
        sourceUrl: "https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
        body: "ABSTRACT AND STATEMENT\nThe 21st Amendment Brewery Cafe, LLC\nOffer-in-Compromise",
      },
    ],
  });
  assert.equal(ttbA.records[0]?.type, TTB_OIC_TYPE);
  assert.equal(ttbA.records[0]?.id, "21st-amendment");
  assert.equal(ttbA.records[0]?.firm, "The 21st Amendment Brewery Cafe, LLC");
  assert.ok(ttbA.recordCount > 0);

  const rodA = paidSuperfundRodsBody({
    ok: true as const,
    product: "epa-superfund-rod-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-08-05",
    sources: {
      listing: "https://cumulis.epa.gov/supercpad/SiteProfiles/index.cfm?fuseaction=second.Cleanup&id=0501275",
    },
    cards: [
      {
        id: "05-711427",
        institution: "Federated Metals Corp. Whiting Superfund Site",
        docket: "05-711427",
        date: "2026-08-05",
        sourceUrl: "https://semspub.epa.gov/work/05/711427.pdf",
        body: "INTERIM RECORD OF DECISION\nFederated Metals Corp. Whiting Superfund Site",
      },
    ],
  });
  assert.equal(rodA.records[0]?.type, SUPERFUND_ROD_TYPE);
  assert.equal(rodA.records[0]?.id, "05-711427");
  assert.ok(rodA.recordCount > 0);

  const pcacA = paidPcacBody({
    ok: true as const,
    product: "fda-pcac-503a-memos" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-07-24",
    sources: {
      meeting:
        "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026",
    },
    cards: [
      {
        id: "emideltide-193344",
        substance: "Emideltide",
        date: "2026-05-11",
        mediaId: "193344",
        sourceUrl: "https://www.fda.gov/media/193344/download",
        body: "FDA Evaluation of Emideltide-Related Bulk Drug Substances",
      },
    ],
  });
  assert.equal(pcacA.records[0]?.type, PCAC_TYPE);
  assert.equal(pcacA.records[0]?.firm, "Emideltide", "PCAC substance is the official subject");
  assert.equal(pcacA.source.includes("pharmacy-compounding-advisory-committee"), true);
  assert.ok(pcacA.recordCount > 0);

  const awaA = paidAwaBody({
    ok: true as const,
    product: "aphis-awa-inspection-observation-text" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-07-07",
    sources: { hub: "https://www.aphis.usda.gov/awa/public-search" },
    cards: [
      {
        id: "utah-state-university-068SJ00001KXrsj",
        firm: "Utah State University",
        date: "2026-07-07",
        sourceUrl:
          "https://aphis.file.force.com/sfc/dist/version/download/?oid=00Dt0000000GyZH&ids=068SJ00001KXrsj&asPdf=false",
        body: "Inspection Report\nUtah State University\n2.31(c)(7) Critical",
      },
    ],
  });
  assert.equal(awaA.records[0]?.type, AWA_TYPE);
  assert.equal(awaA.records[0]?.firm, "Utah State University");
  assert.equal(awaA.source.includes("awa/public-search"), true);
  assert.ok(awaA.recordCount > 0);

  const swissA = paidSwissparBody({
    ok: true as const,
    product: "swisspar-first-auth" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-08-18",
    sources: {
      index: "https://www.swissmedic.ch/swissmedic/en/home/humanarzneimittel/authorisations/swisspar.html",
    },
    cards: [
      {
        id: "rhapsido-70227",
        name: "Rhapsido",
        holder: "Novartis Pharma Schweiz AG",
        date: "2026-08-18",
        sourceUrl:
          "https://www.swissmedic.ch/dam/swissmedic/en/dokumente/zulassung/swisspar/70227-rhapsido-01-swisspar-20280818.pdf.download.pdf/SwissPAR_inkl.%20FI_Rhapsido.pdf",
        body: "Swiss Public Assessment Report\nRhapsido\nMarketing authorisation no.: 70227",
      },
    ],
  });
  assert.equal(swissA.records[0]?.type, SWISSPAR_TYPE);
  assert.equal(swissA.records[0]?.firm, "Novartis Pharma Schweiz AG", "SwissPAR holder is the official firm");
  assert.equal(swissA.source.includes("swisspar.html"), true);
  assert.ok(swissA.recordCount > 0);

  const cfpbA = paidCfpbOrdersBody({
    ok: true as const,
    product: "cfpb-consent-order-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2025-01-17",
    sources: { listing: "https://www.consumerfinance.gov/enforcement/actions/" },
    cards: [
      {
        id: "american-honda-finance-corporation-2025",
        firm: "American Honda Finance Corporation",
        date: "2025-01-17",
        sourceUrl:
          "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
        body: "CONSENT ORDER\nAmerican Honda Finance Corp.",
      },
    ],
  });
  assert.equal(cfpbA.records[0]?.type, CFPB_ORDER_TYPE);
  assert.equal(cfpbA.records[0]?.firm, "American Honda Finance Corporation");
  assert.ok(cfpbA.recordCount > 0);

  const ofacA = paidOfacOrdersBody({
    ok: true as const,
    product: "ofac-institution-order-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-08-12",
    sources: { listing: "https://ofac.treasury.gov/civil-penalties-and-enforcement-information" },
    cards: [
      {
        id: "936706",
        institution: "Rice Lake Weighing Systems, Inc.",
        docket: "936706",
        date: "2026-08-12",
        sourceUrl: "https://ofac.treasury.gov/media/936706/download",
        body: "Enforcement Release\nRice Lake Weighing Systems Settles with OFAC",
      },
    ],
  });
  assert.equal(ofacA.records[0]?.type, OFAC_ORDER_TYPE);
  assert.equal(ofacA.records[0]?.id, "936706");
  assert.equal(ofacA.records[0]?.firm, "Rice Lake Weighing Systems, Inc.");
  assert.ok(ofacA.recordCount > 0);

  const frbA = paidFrbOrdersBody({
    ok: true as const,
    product: "frb-institution-order-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-04-14",
    sources: { listing: "https://www.federalreserve.gov/supervisionreg/enforcementactions.htm" },
    cards: [
      {
        id: "26-019-B-HC",
        institution: "Community Bankshares, Inc.",
        docket: "26-019-B-HC",
        date: "2026-04-14",
        sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf",
        body: "BOARD OF GOVERNORS OF THE FEDERAL RESERVE SYSTEM\nDocket No. 26-019-B-HC",
      },
      {
        id: "empty-frb",
        institution: "No Text Bank",
        date: "2026-04-01",
        sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/empty.pdf",
        body: "",
      },
    ],
  });
  assert.equal(frbA.cards.length, 1, "paid cards[] drop empty-body rows");
  assert.equal(frbA.cards[0]?.institution, "Community Bankshares, Inc.");
  assert.ok(frbA.recordCount > 0, "empty records[] is a fail");
  assert.equal(frbA.recordCount, 1);
  assert.equal(frbA.records[0]?.type, FRB_ORDER_TYPE);
  assert.equal(frbA.records[0]?.id, "26-019-B-HC");
  assert.equal(frbA.records[0]?.firm, "Community Bankshares, Inc.");
  assert.ok(!frbA.records.some((r) => r.id === "empty-frb"));

  const fincenA = paidFincenOrdersBody({
    ok: true as const,
    product: "fincen-institution-order-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-08-03",
    sources: { listing: "https://www.fincen.gov/news/enforcement-actions" },
    cards: [
      {
        id: "2026-02",
        institution: "UBS Financial Services Inc.",
        docket: "2026-02",
        date: "2026-08-03",
        sourceUrl: "https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf",
        body: "FINANCIAL CRIMES ENFORCEMENT NETWORK\nNumber 2026-02\nCONSENT ORDER",
      },
    ],
  });
  assert.equal(fincenA.records[0]?.type, FINCEN_ORDER_TYPE);
  assert.equal(fincenA.records[0]?.id, "2026-02");
  assert.equal(fincenA.records[0]?.firm, "UBS Financial Services Inc.");
  assert.ok(fincenA.recordCount > 0);

  const fercA = paidFercOrdersBody({
    ok: true as const,
    product: "ferc-institution-order-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-04-17",
    sources: { listing: "https://www.ferc.gov/civil-penalties/all-civil-penalty-actions-2026" },
    cards: [
      {
        id: "IN25-6-000",
        institution: "Interstate Power and Light Company",
        docket: "IN25-6-000",
        date: "2026-04-17",
        sourceUrl:
          "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
        body: "FEDERAL ENERGY REGULATORY COMMISSION\nDocket No. IN25-6-000",
      },
    ],
  });
  assert.equal(fercA.records[0]?.type, FERC_ORDER_TYPE);
  assert.equal(fercA.records[0]?.id, "IN25-6-000");
  assert.ok(fercA.recordCount > 0);

  const bisA = paidBisOrdersBody({
    ok: true as const,
    product: "bis-institution-order-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-04-13",
    sources: { listing: "https://www.bis.gov/enforcement/charging-letters" },
    cards: [
      {
        id: "E3050",
        institution: "Coastal PVA Technology, Inc.",
        docket: "E3050",
        date: "2026-04-13",
        sourceUrl: "https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
        body: "Bureau of Industry and Security\nPROPOSED CHARGING LETTER",
      },
    ],
  });
  assert.equal(bisA.records[0]?.type, BIS_ORDER_TYPE);
  assert.equal(bisA.records[0]?.id, "E3050");
  assert.ok(bisA.recordCount > 0);

  const occA = paidOccCdBody({
    ok: true as const,
    product: "occ-institution-cd-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-06-16",
    sources: { listing: "https://apps.occ.gov/EASearch" },
    cards: [
      {
        id: "AA-ENF-2026-29",
        bank: "United Texas Bank, National Association",
        docket: "AA-ENF-2026-29",
        date: "2026-06-16",
        sourceUrl: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
        body: "OFFICE OF THE COMPTROLLER OF THE CURRENCY\nAA-ENF-2026-29\nCONSENT ORDER",
      },
      {
        id: "empty-occ",
        bank: "No Text National Bank",
        date: "2026-06-01",
        sourceUrl: "https://www.occ.gov/static/enforcement-actions/empty.pdf",
        body: "",
      },
    ],
  });
  assert.deepEqual(occA.records, normalizeCardRecords(occA, OCC_CD_TYPE));
  assert.equal(occA.cards.length, 1, "paid cards[] drop empty-body rows");
  assert.equal(occA.cards[0]?.bank, "United Texas Bank, National Association");
  assert.ok(occA.recordCount > 0, "empty records[] is a fail");
  assert.equal(occA.recordCount, 1);
  assert.equal(occA.records[0]?.id, "AA-ENF-2026-29");
  assert.equal(occA.records[0]?.firm, "United Texas Bank, National Association", "OCC bank maps onto firm");
  assert.equal(occA.records[0]?.type, OCC_CD_TYPE);
  assert.deepEqual(Object.keys(occA.records[0] ?? {}).sort(), [...RECORD_FIELDS].sort());
  assert.ok(!occA.records.some((r) => r.id === "empty-occ"));

  const fdicA = paidFdicOrdersBody({
    ok: true as const,
    product: "fdic-institution-order-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-01-13",
    sources: { listing: "https://orders.fdic.gov/s/" },
    cards: [
      {
        id: "FDIC-26-0001b",
        bank: "MutualOne Bank",
        docket: "FDIC-26-0001b",
        date: "2026-01-13",
        sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
        body: "FEDERAL DEPOSIT INSURANCE CORPORATION\nCONSENT ORDER FDIC-26-0001b",
      },
    ],
  });
  assert.equal(fdicA.records[0]?.type, FDIC_ORDER_TYPE);
  assert.equal(fdicA.records[0]?.firm, "MutualOne Bank", "FDIC bank maps onto firm");
  assert.equal(fdicA.cards[0]?.bank, "MutualOne Bank", "official bank key stays");
  assert.ok(fdicA.recordCount > 0);

  const ncuaA = paidNcuaOrdersBody({
    ok: true as const,
    product: "ncua-institution-order-bodies" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2021-02-22",
    sources: { listing: "https://ncua.gov/news/enforcement-actions/administrative-orders" },
    cards: [
      {
        id: "21-0105-ER",
        creditUnion: "Live Life Federal Credit Union",
        docket: "21-0105-ER",
        date: "2021-02-22",
        sourceUrl:
          "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
        body: "NATIONAL CREDIT UNION ADMINISTRATION\nDocket No. 21-0105-ER",
      },
    ],
  });
  assert.equal(ncuaA.records[0]?.type, NCUA_ORDER_TYPE);
  assert.equal(ncuaA.records[0]?.firm, "Live Life Federal Credit Union", "NCUA creditUnion maps onto firm");
  assert.equal(ncuaA.cards[0]?.creditUnion, "Live Life Federal Credit Union", "official creditUnion key stays");
  assert.ok(ncuaA.recordCount > 0);

  const gmpA = paidGmpBody({
    ok: true as const,
    product: "hc-gmp-report-cards" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-04-13",
    sources: { listing: "https://www.drug-inspections.canada.ca/gmp/index-en.html" },
    cards: [
      {
        id: "apotex-inc-88796",
        inspectionNumber: "88796",
        firm: "Apotex Inc",
        inspectedOn: "2026-04-13",
        sourceUrl: "https://www.drug-inspections.canada.ca/gmp/fullReportCard-en.html?insNumber=88796&lang=en",
        body: "Summary of observations\n1. C.02.011 - Manufacturing control",
      },
      {
        inspectionNumber: "80413",
        firm: "Apotex Inc older",
        inspectedOn: "2023-02-14",
        sourceUrl: "https://www.drug-inspections.canada.ca/gmp/fullReportCard-en.html?insNumber=80413&lang=en",
        body: "Summary of observations\n1. C.02.007",
      },
    ],
  });
  assert.equal(gmpA.records[0]?.type, GMP_TYPE);
  assert.equal(gmpA.records[0]?.id, "apotex-inc-88796");
  assert.equal(gmpA.records[0]?.date, "2026-04-13", "GMP inspectedOn maps onto date");
  assert.equal(gmpA.records[0]?.firm, "Apotex Inc");
  assert.equal(gmpA.records[1]?.id, "80413", "inspectionNumber is a stable fallback when id is absent");
  assert.ok(gmpA.recordCount > 0);

  const gmpMdA = paidGmpMdBody({
    ok: true as const,
    product: "hc-md-inspection-cards" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-05-25",
    sources: { listing: "https://www.drug-inspections.canada.ca/md/index-en.html" },
    cards: [
      {
        id: "can-med-healthcare-501",
        inspectionNumber: "501",
        firm: "CAN-MED HEALTHCARE",
        inspectedOn: "2026-05-25",
        sourceUrl: "https://www.drug-inspections.canada.ca/md/fullReportCard-en.html?insNumber=501&lang=en",
        body: "Summary of observations\n1. MDR s.58 (b) Recall procedure",
      },
    ],
  });
  assert.equal(gmpMdA.records[0]?.type, GMP_MD_TYPE);
  assert.equal(gmpMdA.records[0]?.date, "2026-05-25");
  assert.equal(gmpMdA.records[0]?.firm, "CAN-MED HEALTHCARE");
  assert.ok(gmpMdA.recordCount > 0);

  const occSnap = JSON.parse(readFileSync(join(fixturesRoot, "occ-cd/seed-snapshot.json"), "utf-8")) as {
    cards: { bank?: string; body?: string }[];
  };
  const occFromFx = paidOccCdBody(occSnap);
  assert.ok(occFromFx.recordCount > 0, "occ-cd fixture records[] is a fail if empty");
  assert.equal(occFromFx.cards.length, occFromFx.recordCount, "paid cards[] match the sold window");
  assert.equal(occFromFx.records[0]?.type, OCC_CD_TYPE);
  assert.equal(occFromFx.records[0]?.firm, "United Texas Bank, National Association");
  assert.equal(occFromFx.cards[0]?.bank, "United Texas Bank, National Association");
  assert.ok(occFromFx.records.every((r) => r.firm && r.id));

  const frbSnap = JSON.parse(readFileSync(join(fixturesRoot, "frb-orders/seed-snapshot.json"), "utf-8")) as {
    cards: { institution?: string }[];
  };
  const frbFromFx = paidFrbOrdersBody(frbSnap);
  assert.ok(frbFromFx.recordCount > 0, "frb-orders fixture records[] is a fail if empty");
  assert.equal(frbFromFx.cards.length, frbFromFx.recordCount);
  assert.equal(frbFromFx.records[0]?.type, FRB_ORDER_TYPE);
  // date-desc, then id-asc: 26-040-WA/RB-HC before 26-040-WA/RB-SM on 2026-07-15
  assert.equal(frbFromFx.records[0]?.firm, "Iuka Bancshares, Inc.");
  assert.equal(frbFromFx.cards[0]?.institution, "Iuka Bancshares, Inc.");

  const marinersSnap = {
    ok: true as const,
    product: "uscg-d13-lnm" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-18T00:00:00.000Z",
    asOf: "2026-08-12",
    week: "32-2026",
    sources: {
      listing: "https://www.navcen.uscg.gov/local-notices-to-mariners?district=13+0&subdistrict=n",
    },
    notices: [
      {
        week: "32-2026",
        section: "Federal Discrepancies",
        waterway: "Anacortes Harbor",
        text: "Anacortes Channel Light 4 LLNR 19055 TRLB/STRUCT MISSING/STRUCT DEST FD",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
      },
      {
        week: "32-2026",
        section: "Temporary Changes",
        waterway: "Anacortes Harbor",
        text: "Anacortes Channel Light 4 LLNR 19055 TRLB FD",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
      },
      {
        week: "32-2026",
        section: "Additional MSI Categories",
        waterway: "Astoria",
        text: "Tansy Point - Astoria/General/Marine Construction The M/V ESSAYONS will be conducting dredging.",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
      },
      {
        week: "32-2026",
        section: "Federal Discrepancies Corrected",
        waterway: "Bonneville Pool",
        text: "Wind Mountain Lower Range Rear Light LLNR 11845 WATCHING PROPERLY FD 2026-08-01",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
      },
      {
        week: "32-2026",
        section: "Federal Discrepancies",
        waterway: "Empty Harbor",
        text: "",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
      },
    ],
  };
  const marinersA = paidMarinersBody(marinersSnap);
  const marinersB = paidMarinersBody(structuredClone(marinersSnap));
  assert.deepEqual(marinersA.records, marinersB.records, "mariners normalize is deterministic");
  assert.deepEqual(marinersA.records, normalizeMarinersRecords(marinersSnap, MARINERS_TYPE));
  assert.equal(marinersA.notices.length, 5, "raw notices[] stay, including empty-text rows");
  assert.equal(marinersA.notices[0]?.waterway, "Anacortes Harbor");
  assert.ok(marinersA.recordCount > 0, "empty records[] is a fail");
  assert.equal(marinersA.recordCount, 4);
  assert.equal(marinersA.asOf, "2026-08-12");
  assert.equal(marinersA.records.find((r) => r.id === "32-2026:Federal Discrepancies:19055")?.firm, "Anacortes Harbor");
  assert.equal(marinersA.records.find((r) => r.id === "32-2026:Temporary Changes:19055")?.firm, "Anacortes Harbor");
  assert.equal(
    marinersA.records.find((r) => r.id === "32-2026:Additional MSI Categories:Astoria")?.firm,
    "Astoria",
    "MSI firm is official waterway, not a company",
  );
  assert.equal(
    marinersA.records.find((r) => r.id === "32-2026:Federal Discrepancies Corrected:11845")?.date,
    "2026-08-01",
    "official correction date in text maps onto date",
  );
  assert.ok(marinersA.records.every((r) => r.type === MARINERS_TYPE));
  assert.ok(!marinersA.records.some((r) => r.firm === "Empty Harbor"));
  assert.deepEqual(Object.keys(marinersA.records[0] ?? {}).sort(), [...RECORD_FIELDS].sort());
  assert.equal(marinersA.source.includes("district=13"), true);

  const d13Fx = JSON.parse(readFileSync(join(fixturesRoot, "lnm-d13/seed-snapshot.json"), "utf-8")) as {
    notices: { waterway?: string; text?: string }[];
  };
  const d13FromFx = paidMarinersBody(d13Fx);
  assert.ok(d13FromFx.recordCount > 0, "/mariners fixture records[] is a fail if empty");
  assert.equal(d13FromFx.notices.length, d13Fx.notices.length, "fixture notices[] stay");
  assert.equal(d13FromFx.records[0]?.type, MARINERS_TYPE);
  assert.ok(d13FromFx.records.some((r) => r.firm === "Anacortes Harbor" && r.id.includes("19055")));
  assert.ok(d13FromFx.notices.some((n) => n.waterway === "Anacortes Harbor" && n.text?.includes("19055")));
  assert.ok(d13FromFx.records.every((r) => r.firm && r.id && r.url.includes("navcen.uscg.gov")));

  const d11Fx = JSON.parse(readFileSync(join(fixturesRoot, "lnm-d11/seed-snapshot.json"), "utf-8")) as {
    notices: { waterway?: string; text?: string }[];
  };
  const d11FromFx = paidMarinersD11Body(d11Fx);
  assert.ok(d11FromFx.recordCount > 0, "/mariners-d11 fixture records[] is a fail if empty");
  assert.equal(d11FromFx.notices.length, d11Fx.notices.length);
  assert.equal(d11FromFx.records[0]?.type, MARINERS_D11_TYPE);
  assert.ok(d11FromFx.records.some((r) => r.firm === "Berkeley" && r.id.includes("5430")));
  assert.ok(d11FromFx.notices.some((n) => n.waterway === "Berkeley" && n.text?.includes("5430")));
  assert.ok(d11FromFx.records.every((r) => r.firm && r.id));

  assert.equal(paidBodyWindow(), DEFAULT_PAID_BODY_WINDOW);
  assert.equal(paidBodyWindow(undefined, { PAID_BODY_WINDOW: "0" }), DEFAULT_PAID_BODY_WINDOW);
  assert.equal(paidBodyWindow(undefined, { PAID_BODY_WINDOW: "25" }), 25);
  assert.equal(paidBodyWindow(3), 3);
  assert.equal(newestOfficialTextsCopy(100), "newest 100 official texts");
  assert.ok(olderChunkCopy(100).includes("?before="));
  assert.equal(
    paidBodyCatalogNote("/gmp", "Full catalog: count + id + firm + date + url"),
    "Full catalog: count + id + firm + date + url. Plain paid GET /gmp is the newest 100 official texts; older chunk if they ask (?before=<id or date>, another $0.05). Free ?q= search stays free.",
  );
  assert.deepEqual(paidBodyOptsFromSearch("before=gmp-0100"), { before: "gmp-0100" });
  assert.deepEqual(paidBodyOptsFromSearch("page=2"), { page: 2 });
  assert.equal(EXTRACTED_BODY_SKUS.includes("gmp"), true);
  assert.equal((EXTRACTED_BODY_SKUS as readonly string[]).includes("ticks"), false);

  const fatGmpCards = Array.from({ length: 120 }, (_, i) => {
    const n = i + 1;
    const day = String((n % 28) + 1).padStart(2, "0");
    const month = String((Math.floor(n / 28) % 12) + 1).padStart(2, "0");
    return {
      id: `gmp-${String(n).padStart(4, "0")}`,
      inspectionNumber: String(80000 + n),
      firm: `Firm ${n}`,
      inspectedOn: `2024-${month}-${day}`,
      sourceUrl: `https://www.drug-inspections.canada.ca/gmp/fullReportCard-en.html?insNumber=${80000 + n}&lang=en`,
      body: `Summary of observations\n1. C.02.011 card ${n}`,
    };
  });
  fatGmpCards.push({
    id: "gmp-empty",
    inspectionNumber: "79999",
    firm: "Empty Ltd",
    inspectedOn: "2026-08-11",
    sourceUrl: "https://www.drug-inspections.canada.ca/gmp/fullReportCard-en.html?insNumber=79999&lang=en",
    body: "",
  });
  const fatGmp = paidGmpBody({
    ok: true as const,
    product: "hc-gmp-report-cards" as const,
    status: "ok" as const,
    fetchedAt: "2026-08-25T12:00:00.000Z",
    asOf: "2026-08-11",
    sources: { listing: "https://www.drug-inspections.canada.ca/gmp/index-en.html" },
    cards: fatGmpCards,
  });
  assert.equal(fatGmp.catalogCount, 120, "empty-body rows are not official extracted bodies");
  assert.equal(fatGmp.paidWindow, 100);
  assert.equal(fatGmp.recordCount, 100);
  assert.equal(fatGmp.cards.length, 100);
  assert.equal(fatGmp.records.length, 100);
  assert.ok(fatGmp.cards.every((row) => String(row.body ?? "").length > 0));
  assert.equal(fatGmp.records[0]?.id, fatGmp.cards[0]?.id);
  const windowedIds = new Set(fatGmp.records.map((r) => r.id));
  assert.equal(windowedIds.has("gmp-empty"), false);
  const sliced = paidGmpBody(
    {
      ok: true as const,
      product: "hc-gmp-report-cards" as const,
      cards: fatGmpCards,
    },
    { window: 3 },
  );
  assert.equal(sliced.paidWindow, 3);
  assert.equal(sliced.recordCount, 3);
  assert.equal(sliced.cards.length, 3);
  assert.equal(sliced.catalogCount, 120);
  assert.equal(sliced.asOf, sliced.records[0]?.date);
  assert.equal(fatGmp.page, 1);
  assert.equal(fatGmp.pageCount, 2);
  assert.equal(fatGmp.before, null);
  assert.ok(fatGmp.nextBefore);
  const olderGmp = paidGmpBody(
    {
      ok: true as const,
      product: "hc-gmp-report-cards" as const,
      cards: fatGmpCards,
    },
    { before: fatGmp.nextBefore ?? undefined },
  );
  assert.equal(olderGmp.page, 2);
  assert.equal(olderGmp.recordCount, 20);
  assert.equal(olderGmp.cards.length, 20);
  assert.equal(olderGmp.catalogCount, 120);
  assert.equal(olderGmp.nextBefore, null);
  const newestIds = new Set(fatGmp.records.map((r) => r.id));
  assert.ok(olderGmp.records.every((r) => !newestIds.has(r.id)), "older page does not repeat the newest chunk");
  const page2 = paidGmpBody(
    {
      ok: true as const,
      product: "hc-gmp-report-cards" as const,
      cards: fatGmpCards,
    },
    { page: 2 },
  );
  assert.deepEqual(page2.records.map((r) => r.id), olderGmp.records.map((r) => r.id));

  const fatTicks = {
    ticks: Array.from({ length: 120 }, (_, i) => ({
      id: `tick-${i}`,
      group: "hay",
      market: `Market ${i}`,
      asOf: "2026-08-01",
      sourceUrl: "https://www.ams.usda.gov/mnreports/ams_3056.pdf",
    })),
    fetchedAt: "2026-08-25T12:00:00.000Z",
  };
  const uncappedTicks = paidTicksBody(fatTicks);
  assert.equal(uncappedTicks.recordCount, 120, "/ticks is not windowed");
  assert.equal(uncappedTicks.ticks.length, 120);
  assert.equal("paidWindow" in uncappedTicks, false);

  const fatIa = paidImportAlertsBody({
    ticks: Array.from({ length: 120 }, (_, i) => ({
      alertNumber: "16-81",
      list: "red",
      firm: `Firm ${i}`,
      product: "Lettuce",
      datePublished: "08/17/2026",
      sourceUrl: "https://www.accessdata.fda.gov/cms_ia/importalert_49.html",
    })),
    fetchedAt: "2026-08-25T12:00:00.000Z",
    asOf: "2026-08-17",
  });
  assert.equal(fatIa.recordCount, 120, "/import-alerts is not windowed");
  assert.equal(fatIa.ticks.length, 120);

  const fatNotices = paidMarinersBody({
    asOf: "2026-08-12",
    week: "32-2026",
    fetchedAt: "2026-08-18T00:00:00.000Z",
    notices: Array.from({ length: 120 }, (_, i) => ({
      week: "32-2026",
      section: "Federal Discrepancies",
      waterway: `Harbor ${i}`,
      text: `Harbor ${i} Light ${i} LLNR ${10000 + i} TRLB FD`,
      sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
    })),
  });
  assert.equal(fatNotices.recordCount, 120, "Mariners weekly edition is not a 100-notice slice");
  assert.equal(fatNotices.notices.length, 120);

  console.log("paid-records normalize tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
