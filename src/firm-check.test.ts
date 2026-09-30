import assert from "node:assert/strict";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AddressInfo } from "node:net";
import { handleRequest, LLMS_PATH, MCP_PATH, OPENAPI_PATH, WELL_KNOWN_PATH } from "./ticks-door.js";
import {
  FIRM_CHECK_CAP,
  FIRM_CHECK_DOORS,
  FIRM_CHECK_NOTE,
  FIRM_CHECK_PATH,
  FIRM_CHECK_TOOL_NAME,
  firmCheckFromIndexes,
} from "./firm-check.js";
import { extraMcpToolNames, handleMcpJsonRpc } from "./ticks-mcp.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/firm-check");

async function withServer(
  envPatch: Record<string, string | undefined>,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const prev: Record<string, string | undefined> = {};
  if (!Object.prototype.hasOwnProperty.call(envPatch, "SHOP_REQUEST_LOG")) {
    envPatch = { ...envPatch, SHOP_REQUEST_LOG: "0" };
  }
  for (const [k, v] of Object.entries(envPatch)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const server = createServer((req, res) => {
    void handleRequest(req, res, 0);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

async function main(): Promise<void> {
  const indexes = {
    form483: {
      fetchedAt: "2026-08-26T00:00:00.000Z",
      asOf: "2026-07-31",
      letters: [
        {
          id: "catalent-indiana-llc-193455",
          firm: "Catalent Indiana LLC",
          fei: "3005949964",
          issuedOn: "2026-04-24",
          sourceUrl: "https://www.fda.gov/media/193455/download",
        },
        {
          id: "cascade-specialty-pharmacy-llc-193964",
          firm: "Cascade Specialty Pharmacy LLC",
          fei: "3015133983",
          issuedOn: "2026-07-17",
        },
      ],
    },
    warningLetters: {
      fetchedAt: "2026-08-26T00:00:00.000Z",
      asOf: "2026-03-04",
      letters: [
        {
          id: "citra100mg-722606-03042026",
          firm: "Citra100mg",
          cms: "722606",
          issuedOn: "2026-03-04",
          subject: "Unapproved New Drugs/Misbranded",
        },
      ],
    },
    importAlerts: {
      fetchedAt: "2026-08-26T00:00:00.000Z",
      asOf: "2026-08-07",
      catalog: [
        {
          alertNumber: "99-05",
          name: "Detention Without Physical Examination of Raw Agricultural Products for Pesticides",
          datePublished: "08/07/2026",
          pageId: "258",
        },
        {
          alertNumber: "16-81",
          name: "Detention Without Physical Examination of Seafood Products Due to Salmonella",
          datePublished: "03/05/2026",
          pageId: "49",
        },
      ],
      samples: [
        {
          alertNumber: "16-81",
          firm: "Pacific Catch Ltd",
          name: "Detention Without Physical Examination of Seafood Products Due to Salmonella",
          datePublished: "03/05/2026",
          sample: true,
        },
      ],
    },
    untitledLetters: {
      fetchedAt: "2026-08-26T00:00:00.000Z",
      asOf: "2026-07-15",
      cards: [
        {
          id: "sanofi-vaccines-us-inc-193721",
          firm: "Sanofi Vaccines US Inc.",
          date: "2026-07-15",
          product: "BEYFORTUS",
        },
      ],
    },
    ftcWl: {
      fetchedAt: "2026-08-26T00:00:00.000Z",
      asOf: "2026-07-06",
      cards: [
        {
          id: "vtron-inc-dba-vtron-lasers",
          firm: "Vtron Inc. d/b/a Vtron Lasers",
          date: "2026-07-06",
          subject: "Warning Letter Regarding “Made in the USA” Representations",
        },
      ],
    },
    ftcOrders: {
      fetchedAt: "2026-09-18T04:40:38.000Z",
      asOf: "2026-08-31",
      cards: [
        {
          id: "berettaruger",
          institution: "Beretta/Ruger",
          title: "Decision and Order",
          date: "2026-09-16",
        },
      ],
    },
    fmcOrders: {
      fetchedAt: "2026-09-16T23:13:25.691Z",
      asOf: "2026-04-24",
      cards: [
        {
          id: "23-08-131865",
          institution:
            "Mediterranean Shipping Company, S.A. - Possible Violations of the Shipping Act, 46 U.S.C. §§ 41102(c), 40501, and 41104(a)(2)(A)",
          title: "Served Order on Initial Decision",
          date: "2025-04-24",
        },
      ],
    },
    nmbDeterminations: {
      fetchedAt: "2026-09-22T22:48:13.562Z",
      asOf: "2026-09-17",
      cards: [
        {
          id: "53-nmb-no-34",
          institution: "California Northern Railroad Company; BRS; Signal Department Employees",
          citation: "53 NMB No. 34",
          docket: "R-7687",
          caseNo: "R-7687",
          documentId: "Certification-R-7687.pdf",
          kind: "Certification",
          date: "2026-09-17",
          title: "53 NMB No. 34",
          body: "SECRET NMB DETERMINATION BODY",
          sourceUrl: "https://nmb.gov/secret-r-7687.pdf",
        },
      ],
    },
    nlrbDecisions: {
      fetchedAt: "2026-09-22T16:51:49.811Z",
      asOf: "2026-09-17",
      cards: [
        {
          id: "375-nlrb-no-40",
          institution: "Nexstar Media Corporation d/b/a NewsNation",
          citation: "375 NLRB No. 40",
          caseNo: "05-CA-367812",
          date: "2026-09-17",
          title: "375 NLRB No. 40",
          body: "SECRET NLRB DECISION BODY",
        },
      ],
    },
    flraDecisions: {
      fetchedAt: "2026-09-22T17:28:09.876Z",
      asOf: "2026-09-22",
      cards: [
        {
          id: "74-flra-541",
          institution:
            "United States Marine Corps, Marine Air Ground Task Force Training Command, Marine Corps Air Ground Combat Center, Twentynine Palms, California (Agency) and American Federation of Government Employees, Local 2018 (Union)",
          citation: "74 FLRA 541",
          caseNo: "0-AR-5810",
          date: "2026-09-22",
          title: "74 FLRA 541",
          body: "SECRET FLRA DECISION BODY",
        },
      ],
    },
    ecabDecisions: {
      fetchedAt: "2026-09-22T19:47:28.911Z",
      asOf: "2026-08-27",
      cards: [
        {
          id: "26-0528",
          institution: "C.P. and U.S. POSTAL SERVICE, GERMANTOWN POST OFFICE, Philadelphia, PA",
          citation: "Docket No. 26-0528",
          docket: "26-0528",
          date: "2026-08-27",
          title: "Docket No. 26-0528",
          body: "SECRET ECAB DECISION BODY",
        },
      ],
    },
    fccEbOrders: {
      fetchedAt: "2026-09-22T20:35:18.400Z",
      asOf: "2026-09-18",
      cards: [
        {
          id: "DA-26-1006",
          institution: "Vazquez Broadcasting Corporation, licensee of AM Station WSDS, Salem Township, Michigan",
          citation: "DA 26-1006",
          docket: "EB-FIELDNER-24-00037648",
          date: "2026-09-18",
          title: "DA 26-1006",
          body: "SECRET FCC EB ORDER BODY",
        },
      ],
    },
    eeocAppellate: {
      fetchedAt: "2026-09-23T23:00:00.000Z",
      asOf: "2026-08-24",
      cards: [
        {
          id: "request-2026002858",
          institution: "Lenard T; Department of Transportation; Federal Aviation Administration",
          citation: "Request No. 2026002858",
          docket: "2026002858",
          caseNo: "2025001848",
          date: "2026-08-24",
          title: "Request No. 2026002858",
          body: "SECRET EEOC APPELLATE BODY",
          sourceUrl: "https://www.eeoc.gov/secret-2026002858.pdf",
        },
        {
          id: "appeal-2025003976",
          institution: "Department of the Army",
          citation: "Appeal No. 2025003976",
          docket: "2025003976",
          caseNo: "2025003976",
          date: "2026-02-26",
          title: "Appeal No. 2025003976",
          body: "SECRET EEOC APPEAL BODY",
        },
      ],
    },
    ofwatEnforcement: {
      fetchedAt: "2026-08-27T00:00:00.000Z",
      asOf: "2026-03-01",
      cards: [
        {
          id: "2025-05-28-Thames-Water-Final-Decision-Document-REDACTED",
          institution: "Thames Water",
          docket: "thames-final-2025-05",
          date: "2025-05-28",
        },
      ],
    },
    ofgemEnforcement: {
      fetchedAt: "2026-08-27T20:00:00.000Z",
      asOf: "2026-06-03",
      cards: [
        {
          id: "Tomato Energy Limited - Notice of Proposal to Impose a Penalty",
          institution: "Tomato Energy Limited",
          docket: "tomato-penalty-2025-10",
          date: "2025-10-10",
        },
      ],
    },
    cfpbOrders: {
      fetchedAt: "2026-08-26T00:00:00.000Z",
      asOf: "2025-01-17",
      cards: [
        {
          id: "equifax-inc-and-equifax-information-services-llc",
          firm: "Equifax, Inc. and Equifax Information Services LLC",
          title: "Consent Order",
          date: "2025-01-17",
        },
      ],
    },
    occCd: {
      fetchedAt: "2026-08-26T00:00:00.000Z",
      asOf: "2026-06-16",
      cards: [
        {
          id: "AA-ENF-2026-29",
          bank: "United Texas Bank, National Association",
          docket: "AA-ENF-2026-29",
          date: "2026-06-16",
        },
      ],
    },
    fdicOrders: {
      fetchedAt: "2026-08-26T00:00:00.000Z",
      asOf: "2026-05-13",
      cards: [
        {
          id: "FDIC-25-0148b",
          bank: "Connect Community Bank",
          docket: "FDIC-25-0148b",
          date: "2026-05-13",
        },
      ],
    },
  };

  assert.deepEqual([...FIRM_CHECK_DOORS], [
    "form-483",
    "warning-letters",
    "untitled-letters",
    "ftc-wl",
    "ftc-orders",
    "fmc-orders",
    "nmb-determinations",
    "nlrb-decisions",
    "flra-decisions",
    "ecab-decisions",
    "fcc-eb-orders",
    "eeoc-appellate",
    "ofwat-enforcement",
    "ofgem-enforcement",
    "cfpb-orders",
    "occ-cd",
    "fdic-orders",
    "import-alerts",
  ]);
  assert.ok(FIRM_CHECK_NOTE.includes("FDA untitled letters"));
  assert.ok(FIRM_CHECK_NOTE.includes("FTC BCP warning letters"));
  assert.ok(FIRM_CHECK_NOTE.includes("FTC ALJ/Commission orders"));
  assert.ok(FIRM_CHECK_NOTE.includes("FMC orders"));
  assert.ok(FIRM_CHECK_NOTE.includes("NMB representation determinations"));
  assert.ok(FIRM_CHECK_NOTE.includes("NLRB Board decisions"));
  assert.ok(FIRM_CHECK_NOTE.includes("FLRA Authority decisions"));
  assert.ok(FIRM_CHECK_NOTE.includes("ECAB decisions"));
  assert.ok(FIRM_CHECK_NOTE.includes("FCC Enforcement Bureau orders"));
  assert.ok(FIRM_CHECK_NOTE.includes("EEOC OFS appellate decisions"));
  assert.ok(FIRM_CHECK_NOTE.includes("Ofwat enforcement"));
  assert.ok(FIRM_CHECK_NOTE.includes("Ofgem enforcement"));
  assert.ok(FIRM_CHECK_NOTE.includes("CFPB orders"));
  assert.ok(FIRM_CHECK_NOTE.includes("OCC C&Ds"));
  assert.ok(FIRM_CHECK_NOTE.includes("FDIC orders"));
  assert.ok(!FIRM_CHECK_NOTE.toLowerCase().includes("sku #39"));
  assert.ok(!FIRM_CHECK_NOTE.toLowerCase().includes("39th"));

  const catalent = firmCheckFromIndexes("catalent", indexes);
  assert.equal(catalent.free, true);
  assert.equal(catalent.product, "firm-check");
  assert.deepEqual(catalent.doors, [...FIRM_CHECK_DOORS]);
  assert.equal(catalent.matches.length, 1);
  assert.equal(catalent.matches[0]?.door, "form-483");
  assert.equal(catalent.matches[0]?.id, "catalent-indiana-llc-193455");
  assert.equal(catalent.matches[0]?.page, 1);
  assert.equal(catalent.matches[0]?.paidUrl, "/form-483?id=catalent-indiana-llc-193455");
  assert.equal(catalent.matches[0]?.priceUsdc, "0.02");
  assert.equal(catalent.matches[0]?.bag, "one official text");
  assert.equal(catalent.matches[0]?.pagePriceUsdc, "0.05");
  assert.equal(catalent.matches[0]?.fetchedAt, "2026-08-26T00:00:00.000Z");
  assert.equal(catalent.matches[0]?.asOf, "2026-07-31");
  assert.ok(!("sourceUrl" in (catalent.matches[0] ?? {})));
  assert.ok(!("officialUrl" in (catalent.matches[0] ?? {})));
  assert.ok(!("pdfUrl" in (catalent.matches[0] ?? {})));
  assert.ok(!("htmlUrl" in (catalent.matches[0] ?? {})));
  assert.ok(!("pageUrl" in (catalent.matches[0] ?? {})));
  assert.ok(!("body" in (catalent.matches[0] ?? {})));
  assert.ok(!JSON.stringify(catalent.matches).includes("fda.gov"));
  assert.ok(!JSON.stringify(catalent.matches).includes("body"));
  assert.ok(catalent.note.includes("free") || catalent.note.includes("Free"));
  assert.ok(catalent.note.includes("$0.02"));
  assert.ok(catalent.note.includes("$0.05"));
  assert.ok(catalent.note.includes("fetchedAt/asOf"));
  assert.ok(!catalent.note.toLowerCase().includes("idaho leftover"));
  assert.ok(!catalent.note.toLowerCase().includes("leak-test"));
  assert.ok(!catalent.note.toLowerCase().includes("tcpa"));
  assert.ok(!catalent.note.toLowerCase().includes("not people"));

  const fei = firmCheckFromIndexes("3005949964", indexes);
  assert.equal(fei.matches[0]?.id, "catalent-indiana-llc-193455");

  const cms = firmCheckFromIndexes("722606", indexes);
  assert.equal(cms.matches[0]?.door, "warning-letters");
  assert.equal(cms.matches[0]?.paidUrl, "/warning-letters?id=citra100mg-722606-03042026");
  assert.equal(cms.matches[0]?.fetchedAt, "2026-08-26T00:00:00.000Z");
  assert.equal(cms.matches[0]?.asOf, "2026-03-04");

  const alert = firmCheckFromIndexes("99-05", indexes);
  assert.equal(alert.matches[0]?.door, "import-alerts");
  assert.equal(alert.matches[0]?.id, "99-05");
  assert.equal(alert.matches[0]?.page, null);
  assert.equal(alert.matches[0]?.paidUrl, "/import-alerts");
  assert.equal(alert.matches[0]?.priceUsdc, "0.05");
  assert.equal(alert.matches[0]?.bag, "entire current table");
  assert.equal(alert.matches[0]?.fetchedAt, "2026-08-26T00:00:00.000Z");
  assert.equal(alert.matches[0]?.asOf, "2026-08-07");

  const firmOnSample = firmCheckFromIndexes("Pacific Catch", indexes);
  assert.equal(firmOnSample.matches[0]?.door, "import-alerts");
  assert.equal(firmOnSample.matches[0]?.id, "16-81");
  assert.equal(firmOnSample.matches[0]?.firm, "Pacific Catch Ltd");

  const untitled = firmCheckFromIndexes("sanofi", indexes);
  assert.equal(untitled.matches[0]?.door, "untitled-letters");
  assert.equal(untitled.matches[0]?.firm, "Sanofi Vaccines US Inc.");
  assert.equal(untitled.matches[0]?.paidUrl, "/untitled-letters?id=sanofi-vaccines-us-inc-193721");
  assert.equal(untitled.matches[0]?.priceUsdc, "0.02");

  const ftc = firmCheckFromIndexes("vtron", indexes);
  assert.equal(ftc.matches[0]?.door, "ftc-wl");
  assert.equal(ftc.matches[0]?.firm, "Vtron Inc. d/b/a Vtron Lasers");

  const ftcOrder = firmCheckFromIndexes("Beretta", indexes);
  assert.equal(ftcOrder.matches[0]?.door, "ftc-orders");
  assert.equal(ftcOrder.matches[0]?.id, "berettaruger");
  assert.equal(ftcOrder.matches[0]?.firm, "Beretta/Ruger");
  assert.equal(ftcOrder.matches[0]?.paidUrl, "/ftc-orders?id=berettaruger");
  assert.equal(ftcOrder.matches[0]?.pagePaidUrl, "/ftc-orders");
  assert.ok(!("body" in (ftcOrder.matches[0] ?? {})));
  assert.ok(!JSON.stringify(ftcOrder.matches).includes("body"));

  const fmcOrder = firmCheckFromIndexes("Mediterranean Shipping", indexes);
  assert.equal(fmcOrder.matches[0]?.door, "fmc-orders");
  assert.equal(fmcOrder.matches[0]?.id, "23-08-131865");
  assert.equal(fmcOrder.matches[0]?.paidUrl, "/fmc-orders?id=23-08-131865");
  assert.equal(fmcOrder.matches[0]?.pagePaidUrl, "/fmc-orders");
  assert.ok(!("body" in (fmcOrder.matches[0] ?? {})));

  const nmb = firmCheckFromIndexes("nmb", indexes);
  assert.equal(nmb.matches[0]?.door, "nmb-determinations");
  assert.equal(nmb.matches[0]?.id, "53-nmb-no-34");
  assert.equal(nmb.matches[0]?.paidUrl, "/nmb-determinations?id=53-nmb-no-34");
  assert.equal(nmb.matches[0]?.pagePaidUrl, "/nmb-determinations");
  assert.equal(nmb.matches[0]?.priceUsdc, "0.02");
  assert.equal(nmb.matches[0]?.pagePriceUsdc, "0.05");
  assert.equal(nmb.matches[0]?.fetchedAt, "2026-09-22T22:48:13.562Z");
  assert.ok(!("body" in (nmb.matches[0] ?? {})));
  assert.ok(!("sourceUrl" in (nmb.matches[0] ?? {})));
  assert.ok(!JSON.stringify(nmb.matches).includes("SECRET NMB"));
  assert.ok(!JSON.stringify(nmb.matches).includes("nmb.gov"));

  const california = firmCheckFromIndexes("California Northern", indexes);
  assert.equal(california.matches[0]?.door, "nmb-determinations");
  assert.equal(california.matches[0]?.id, "53-nmb-no-34");
  assert.equal(california.matches[0]?.firm, "California Northern Railroad Company; BRS; Signal Department Employees");

  const r7687 = firmCheckFromIndexes("R-7687", indexes);
  assert.equal(r7687.matches[0]?.door, "nmb-determinations");
  assert.equal(r7687.matches[0]?.id, "53-nmb-no-34");
  assert.equal(r7687.matches[0]?.paidUrl, "/nmb-determinations?id=53-nmb-no-34");
  assert.ok(!JSON.stringify(r7687).includes("SECRET NMB DETERMINATION BODY"));

  const nlrb = firmCheckFromIndexes("Nexstar", indexes);
  assert.equal(nlrb.matches[0]?.door, "nlrb-decisions");
  assert.equal(nlrb.matches[0]?.paidUrl, "/nlrb-decisions?id=375-nlrb-no-40");
  assert.ok(!JSON.stringify(nlrb.matches).includes("SECRET NLRB"));

  const flra = firmCheckFromIndexes("Twentynine Palms", indexes);
  assert.equal(flra.matches[0]?.door, "flra-decisions");
  assert.equal(flra.matches[0]?.id, "74-flra-541");
  assert.equal(flra.matches[0]?.paidUrl, "/flra-decisions?id=74-flra-541");
  assert.ok(!JSON.stringify(flra.matches).includes("SECRET FLRA"));

  const ecab = firmCheckFromIndexes("Germantown", indexes);
  assert.equal(ecab.matches[0]?.door, "ecab-decisions");
  assert.equal(ecab.matches[0]?.id, "26-0528");
  assert.equal(ecab.matches[0]?.paidUrl, "/ecab-decisions?id=26-0528");
  assert.ok(!JSON.stringify(ecab.matches).includes("SECRET ECAB"));

  const fcc = firmCheckFromIndexes("Vazquez", indexes);
  assert.equal(fcc.matches[0]?.door, "fcc-eb-orders");
  assert.equal(fcc.matches[0]?.id, "DA-26-1006");
  assert.equal(fcc.matches[0]?.paidUrl, "/fcc-eb-orders?id=DA-26-1006");
  assert.equal(fcc.matches[0]?.pagePaidUrl, "/fcc-eb-orders");
  assert.ok(!JSON.stringify(fcc.matches).includes("SECRET FCC"));

  const eeoc = firmCheckFromIndexes("Lenard", indexes);
  assert.equal(eeoc.matches[0]?.door, "eeoc-appellate");
  assert.equal(eeoc.matches[0]?.id, "request-2026002858");
  assert.equal(eeoc.matches[0]?.paidUrl, "/eeoc-appellate?id=request-2026002858");
  assert.equal(eeoc.matches[0]?.pagePaidUrl, "/eeoc-appellate");
  assert.equal(eeoc.matches[0]?.priceUsdc, "0.02");
  assert.equal(eeoc.matches[0]?.pagePriceUsdc, "0.05");
  assert.equal(eeoc.matches[0]?.fetchedAt, "2026-09-23T23:00:00.000Z");
  assert.ok(!("body" in (eeoc.matches[0] ?? {})));
  assert.ok(!("sourceUrl" in (eeoc.matches[0] ?? {})));
  assert.ok(!JSON.stringify(eeoc.matches).includes("SECRET EEOC"));
  assert.ok(!JSON.stringify(eeoc.matches).includes("eeoc.gov"));

  const requestNo = firmCheckFromIndexes("2026002858", indexes);
  assert.equal(requestNo.matches[0]?.door, "eeoc-appellate");
  assert.equal(requestNo.matches[0]?.paidUrl, "/eeoc-appellate?id=request-2026002858");

  const appealNo = firmCheckFromIndexes("2025003976", indexes);
  assert.equal(appealNo.matches[0]?.door, "eeoc-appellate");
  assert.equal(appealNo.matches[0]?.id, "appeal-2025003976");

  const secretBody = firmCheckFromIndexes("SECRET NMB DETERMINATION BODY", indexes);
  assert.equal(secretBody.matchCount, 0);

  const thames = firmCheckFromIndexes("Thames", indexes);
  assert.equal(thames.matches[0]?.door, "ofwat-enforcement");
  assert.equal(thames.matches[0]?.firm, "Thames Water");
  assert.equal(thames.matches[0]?.title, "Thames Water");
  assert.equal(
    thames.matches[0]?.paidUrl,
    "/ofwat-enforcement?id=2025-05-28-Thames-Water-Final-Decision-Document-REDACTED",
  );

  const tomato = firmCheckFromIndexes("Tomato", indexes);
  assert.equal(tomato.matches[0]?.door, "ofgem-enforcement");
  assert.equal(tomato.matches[0]?.firm, "Tomato Energy Limited");
  assert.equal(tomato.matches[0]?.pagePaidUrl, "/ofgem-enforcement");

  const cfpb = firmCheckFromIndexes("equifax", indexes);
  assert.equal(cfpb.matches[0]?.door, "cfpb-orders");
  assert.equal(cfpb.matches[0]?.firm, "Equifax, Inc. and Equifax Information Services LLC");

  const occ = firmCheckFromIndexes("United Texas", indexes);
  assert.equal(occ.matches[0]?.door, "occ-cd");
  assert.equal(occ.matches[0]?.firm, "United Texas Bank, National Association");
  assert.equal(occ.matches[0]?.id, "AA-ENF-2026-29");

  const fdic = firmCheckFromIndexes("Connect Community", indexes);
  assert.equal(fdic.matches[0]?.door, "fdic-orders");
  assert.equal(fdic.matches[0]?.firm, "Connect Community Bank");
  assert.equal(fdic.matches[0]?.paidUrl, "/fdic-orders?id=FDIC-25-0148b");

  const manyLetters = Array.from({ length: 30 }, (_, i) => ({
    id: `firm-${String(i).padStart(2, "0")}`,
    firm: "Acme Pharma",
    issuedOn: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
  }));
  const capped = firmCheckFromIndexes("acme", { form483: { letters: manyLetters } });
  assert.equal(capped.matchCount, 30);
  assert.equal(capped.matches.length, FIRM_CHECK_CAP);
  assert.ok(capped.matches.every((row) => row.door === "form-483"));

  const empty = firmCheckFromIndexes("", indexes);
  assert.equal(empty.matchCount, 0);
  assert.deepEqual(empty.matches, []);

  await withServer(
    {
      FORM_483_DIR: join(FIXTURES, "form-483"),
      WARNING_LETTERS_DIR: join(FIXTURES, "warning-letters"),
      IMPORT_ALERTS_DIR: join(FIXTURES, "import-alerts"),
      FORM_483_TTL_MS: String(24 * 3600 * 1000),
      WARNING_LETTERS_TTL_MS: String(24 * 3600 * 1000),
      X402_SKIP_SETTLE: "1",
    },
    async (base) => {
      const missing = await fetch(`${base}${FIRM_CHECK_PATH}`);
      assert.equal(missing.status, 400);
      const missingBody = (await missing.json()) as { error?: string };
      assert.equal(missingBody.error, "q_required");

      const found = await fetch(`${base}${FIRM_CHECK_PATH}?q=cascade`);
      assert.equal(found.status, 200);
      const body = (await found.json()) as {
        free?: boolean;
        doors?: string[];
        matches?: {
          door?: string;
          paidUrl?: string;
          id?: string;
          page?: number | null;
          fetchedAt?: string | null;
          asOf?: string | null;
        }[];
        note?: string;
      };
      assert.equal(body.free, true);
      assert.deepEqual(body.doors, [...FIRM_CHECK_DOORS]);
      assert.equal(body.matches?.[0]?.door, "form-483");
      assert.equal(body.matches?.[0]?.paidUrl, "/form-483?id=cascade-specialty-pharmacy-llc-193964");
      assert.equal(body.matches?.[0]?.page, 1);
      assert.equal(body.matches?.[0]?.fetchedAt, "2026-08-26T00:00:00.000Z");
      assert.equal(body.matches?.[0]?.asOf, "2026-07-31");
      assert.ok((body.note ?? "").includes("NMB representation determinations"));
      assert.ok((body.note ?? "").includes("FCC Enforcement Bureau orders"));
      assert.ok((body.note ?? "").includes("Ofwat enforcement"));
      assert.ok((body.note ?? "").includes("Ofgem enforcement"));

      const nestle = await fetch(`${base}${FIRM_CHECK_PATH}?q=nestle`);
      assert.equal(nestle.status, 200);
      const nestleBody = (await nestle.json()) as { matches?: { door?: string; firm?: string | null }[] };
      assert.equal(nestleBody.matches?.[0]?.door, "form-483");
      assert.ok((nestleBody.matches?.[0]?.firm ?? "").toLowerCase().includes("nestle"));

      const water = await fetch(`${base}${FIRM_CHECK_PATH}?q=Thames`);
      assert.equal(water.status, 200);
      const waterBody = (await water.json()) as {
        matches?: { door?: string; firm?: string | null; paidUrl?: string }[];
      };
      assert.equal(waterBody.matches?.[0]?.door, "ofwat-enforcement");
      assert.equal(waterBody.matches?.[0]?.firm, "Thames Water");

      const energy = await fetch(`${base}${FIRM_CHECK_PATH}?q=OVO`);
      assert.equal(energy.status, 200);
      const energyBody = (await energy.json()) as {
        matches?: { door?: string; firm?: string | null }[];
      };
      assert.equal(energyBody.matches?.[0]?.door, "ofgem-enforcement");
      assert.equal(energyBody.matches?.[0]?.firm, "OVO Energy Limited");
      const raw = JSON.stringify(body);
      assert.ok(!raw.includes("secret cascade body"));
      assert.ok(!raw.includes("secret cascade observation"));
      assert.ok(!raw.includes("secret nestle body"));
      assert.ok(!raw.includes("Hidden Paid Firm Ltd"));
      assert.ok(!raw.includes("secret product row"));
      assert.ok((body.note ?? "").includes("$0.02"));
      assert.ok((body.note ?? "").includes("$0.05"));

      const alertRes = await fetch(`${base}${FIRM_CHECK_PATH}?q=99-05`);
      assert.equal(alertRes.status, 200);
      const alertBody = (await alertRes.json()) as {
        matches?: { door?: string; paidUrl?: string; bag?: string; fetchedAt?: string | null }[];
      };
      assert.equal(alertBody.matches?.[0]?.door, "import-alerts");
      assert.equal(alertBody.matches?.[0]?.paidUrl, "/import-alerts");
      assert.equal(alertBody.matches?.[0]?.bag, "entire current table");
      assert.equal(alertBody.matches?.[0]?.fetchedAt, "2026-08-26T00:00:00.000Z");

      const paid483 = await fetch(`${base}/form-483`);
      assert.equal(paid483.status, 402);
      const paidAlerts = await fetch(`${base}/import-alerts`);
      assert.equal(paidAlerts.status, 402);

      const wk = (await (await fetch(`${base}${WELL_KNOWN_PATH}`)).json()) as {
        resources: string[];
        firmCheck?: string;
        sample?: string;
        instructions?: string;
      };
      assert.ok(wk.firmCheck?.endsWith(FIRM_CHECK_PATH));
      assert.ok(wk.sample?.endsWith("/sample"), "/sample stays a free discovery pointer");
      assert.ok(!wk.resources.some((r) => r.includes(FIRM_CHECK_PATH)), "firm-check is not a paid resource");
      assert.ok(!wk.resources.some((r) => r.includes("/sample")), "/sample is not a paid resource");
      assert.ok((wk.instructions ?? "").includes(FIRM_CHECK_PATH));

      const shop = (await (await fetch(`${base}/`)).json()) as {
        firmCheck?: string;
        sample?: string;
        products: { path: string }[];
      };
      assert.equal(shop.firmCheck, FIRM_CHECK_PATH);
      assert.equal(shop.sample, "/sample");
      assert.ok(!shop.products.some((p) => p.path === FIRM_CHECK_PATH));
      assert.ok(!shop.products.some((p) => p.path === "/sample"));

      const sampleRes = await fetch(`${base}/sample`);
      assert.equal(sampleRes.status, 200);
      const sample = (await sampleRes.json()) as { example?: boolean };
      assert.equal(sample.example, true);

      const llms = await (await fetch(`${base}${LLMS_PATH}`)).text();
      assert.ok(llms.includes("GET /firm-check?q="));
      assert.ok(llms.includes("GET /sample"));
      assert.ok(llms.toLowerCase().includes("free"));
      assert.ok(llms.includes("$0.02"));
      assert.ok(llms.includes("$0.05"));
      assert.ok(!llms.toLowerCase().includes("idaho leftover"));
      assert.ok(!llms.toLowerCase().includes("leak-test"));
      assert.ok(!llms.toLowerCase().includes("tcpa"));
      assert.ok(!llms.toLowerCase().includes("not people"));

      const spec = (await (await fetch(`${base}${OPENAPI_PATH}`)).json()) as {
        paths: Record<string, { get?: { "x-payment-info"?: unknown } }>;
        info?: { "x-guidance"?: string };
      };
      assert.ok(spec.paths[FIRM_CHECK_PATH]?.get);
      assert.equal(spec.paths[FIRM_CHECK_PATH]?.get?.["x-payment-info"], undefined);
      assert.ok(spec.paths["/sample"]?.get);
      assert.ok((spec.info?.["x-guidance"] ?? "").includes(FIRM_CHECK_PATH));

      const listed = await handleMcpJsonRpc(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        {
          wellKnown: { resources: [`${base}/ticks`, `${base}/form-483`] },
        },
      );
      const tools = (listed as { result: { tools: { name: string }[] } }).result.tools;
      assert.ok(tools.some((t) => t.name === FIRM_CHECK_TOOL_NAME));
      assert.ok(!tools.some((t) => t.name === "firm_check"));
      assert.ok(extraMcpToolNames().includes(FIRM_CHECK_TOOL_NAME));
      const extras = new Set(extraMcpToolNames());
      const paidTools = tools.filter((t) => !extras.has(t.name));
      assert.deepEqual(paidTools.map((t) => t.name), ["ticks", "form-483"]);

      const called = await fetch(`${base}${MCP_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 9,
          method: "tools/call",
          params: { name: FIRM_CHECK_TOOL_NAME, arguments: { q: "cascade" } },
        }),
      });
      assert.equal(called.status, 200);
      const callBody = (await called.json()) as { result?: { content?: { text?: string }[]; isError?: boolean } };
      assert.equal(callBody.result?.isError, undefined);
      assert.ok(callBody.result?.content?.[0]?.text?.includes("form-483"));
      assert.ok(callBody.result?.content?.[0]?.text?.includes("HTTP 200"));
      assert.ok(callBody.result?.content?.[0]?.text?.includes("fetchedAt"));
      assert.ok(!callBody.result?.content?.[0]?.text?.includes("secret cascade body"));
    },
  );

  assert.ok(FIRM_CHECK_NOTE.includes("Free"));
  console.log("firm-check tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
