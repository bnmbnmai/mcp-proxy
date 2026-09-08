import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  ATTRIBUTION,
  CARD_FIELDS,
  LICENSE,
  FYR_COLLECTION_ID,
  FYR_LISTING_URL,
  FYR_SEED_LISTINGS,
  LISTING_URL,
  MASTER_COLLECTION_URL,
  ROD_COLLECTION_ID,
  SEED_LISTINGS,
  SITE_PROFILE_URL,
  buildSuperfundRodsManifest,
  catalogPath,
  collectSuperfundRods,
  loadSuperfundRodsManifest,
  stripJsonStringField,
  isFyrChromeTitle,
  isFyrReportTitle,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealSuperfundFyrBody,
  isRealSuperfundRodBody,
  officialSuperfundRodPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseMasterCollectionJson,
  parseSuperfundRodText,
  pdfIdFromUrl,
  type SuperfundRodListingRow,
} from "./superfund-rods.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/superfund-rods");
const FEDERATED = "https://semspub.epa.gov/work/05/711427.pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as SuperfundRodListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official SEMS excerpt lists institution Superfund RODs");
  const federated = listed.find((r) => r.id === "05-711427");
  assert.ok(federated);
  assert.match(federated?.institution ?? "", /Federated Metals/i);
  assert.equal(federated?.date, "2026-08-05");
  assert.equal(federated?.sourceUrl, FEDERATED);
  assert.ok(listed.some((r) => r.id === "02-744534"));
  assert.ok(listed.some((r) => r.id === "05-988133"));
  assert.ok(listed.some((r) => r.id === "05-978074"));
  assert.ok(listed.some((r) => r.id === "05-964773"));
  assert.ok(!listed.some((r) => r.id === "05-999999"), "skip people");
  assert.ok(!listed.some((r) => r.id === "05-709513"), "skip Proposed Plan");
  assert.ok(listed.some((r) => r.id === "04-11246061" && r.title === "Fifth Five-Year Review"));
  assert.ok(!listed.some((r) => r.id === "04-11246059"), "skip FYR protectiveness letter");
  assert.ok(listed.every((r) => officialSuperfundRodPdfUrl(r.sourceUrl)));
  assert.equal(officialSuperfundRodPdfUrl(FEDERATED), FEDERATED);
  assert.equal(
    officialSuperfundRodPdfUrl("https://semspub.epa.gov/src/document/05/711427"),
    FEDERATED,
    "SEMS document pages rewrite to official work PDFs",
  );
  assert.equal(officialSuperfundRodPdfUrl(SITE_PROFILE_URL), null, "CUMULIS site-profile HTML is not an official ROD PDF");
  assert.equal(officialSuperfundRodPdfUrl("https://www3.epa.gov/semsjson/HQ_MasterCollection_11.json"), null);
  assert.equal(officialSuperfundRodPdfUrl("https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf"), null);
  assert.equal(officialSuperfundRodPdfUrl("https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf"), null);
  assert.equal(officialSuperfundRodPdfUrl("https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf"), null);
  assert.ok(LISTING_URL.includes("search-superfund-decision-documents"), "live collect walks the official ROD table");
  assert.ok(FYR_LISTING_URL.includes("search-superfund-five-year-reviews"), "same door also walks the official FYR table");
  assert.ok(MASTER_COLLECTION_URL.includes("HQ_MasterCollection_11.json"));
  assert.equal(ROD_COLLECTION_ID, "25504");
  assert.equal(FYR_COLLECTION_ID, "28008");
  assert.ok(SITE_PROFILE_URL.includes("fuseaction=second.Cleanup"), "site profile stays the first-slice teaser");
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "05-711427"));
  assert.ok(FYR_SEED_LISTINGS.some((r) => r.docket === "04-11246061"), "Cape Fear 5th FYR is the habit seed");
  assert.ok(FYR_SEED_LISTINGS.every((r) => isFyrReportTitle(r.title)));

  const officialListed = parseMasterCollectionJson(readFx("master-collection-excerpt.json"));
  assert.ok(officialListed.some((r) => r.id === "05-711427" && r.sourceUrl === FEDERATED));
  assert.ok(officialListed.some((r) => r.id === "02-762775"), "Pierson's Creek is an official site ROD");
  assert.ok(officialListed.some((r) => r.id === "02-744534"));
  assert.ok(!officialListed.some((r) => r.id === "04-11238616"), "skip ESD even with SIGNIFCANT typo");
  assert.ok(!officialListed.some((r) => r.id === "07-30284035"), "skip ROD amendment");
  assert.ok(!officialListed.some((r) => r.id === "02-774375"), "skip EPA approval-of-ROD memo");
  assert.ok(!officialListed.some((r) => r.id === "05-709513"), "skip Proposed Plan outside collection 25504");
  assert.ok(officialListed.some((r) => r.id === "04-11246061" && r.title === "Fifth Five-Year Review"), "keep official FYR reports from collection 28008");
  assert.ok(officialListed.some((r) => r.id === "03-2517424"));
  assert.ok(!officialListed.some((r) => r.id === "04-11246059"), "skip FYR protectiveness letters");
  assert.ok(officialListed.every((r) => officialSuperfundRodPdfUrl(r.sourceUrl)));

  const creek = {
    institution: "PIERSON'S CREEK",
    docket: "02-762775",
    date: "2026-07-01",
    title: "RECORD OF DECISION FOR OU1 FOR THE PIERSON'S CREEK SITE",
    sourceUrl: "https://semspub.epa.gov/src/document/02/762775",
  };
  assert.equal(isPeopleRow(creek), false, "all-caps Superfund site names are not people");
  assert.equal(isInstitutionOrderRow(creek), true);

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "05-711427"));
  assert.ok(htmlListed.some((r) => /Federated Metals/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /Velsicol/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => r.id === "04-11246061" && r.title === "Fifth Five-Year Review"));
  assert.ok(!htmlListed.some((r) => /Jane Q Public/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /Proposed Plan/i.test(r.title)));
  assert.ok(!htmlListed.some((r) => r.id === "04-11246059"), "HTML listing skips FYR letters");

  const people = rows.find((r) => (r.docket ?? "") === "05-999999");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const federatedRow = rows.find((r) => r.docket === "05-711427" && officialSuperfundRodPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(federatedRow!), true);
  assert.equal(isPeopleRow(federatedRow!), false);
  const plan = rows.find((r) => r.docket === "05-709513");
  assert.equal(isInstitutionOrderRow(plan!), false, "Proposed Plan is not this SKU");
  const capeFearRow = rows.find((r) => r.docket === "04-11246061");
  assert.ok(capeFearRow);
  assert.equal(isFyrReportTitle(capeFearRow!.title), true);
  assert.equal(isInstitutionOrderRow(capeFearRow!), true, "official FYR report is this SKU");
  const fyrLetterRow = rows.find((r) => r.docket === "04-11246059");
  assert.ok(fyrLetterRow);
  assert.equal(isFyrChromeTitle(fyrLetterRow!.title), true);
  assert.equal(isInstitutionOrderRow(fyrLetterRow!), false, "FYR protectiveness letter is not the report body");

  const federatedText = parseSuperfundRodText(readFx("05-711427.txt"), {
    sourceUrl: FEDERATED,
    institution: "Federated Metals Corp. Whiting Superfund Site",
    date: "2026-08-05",
    docket: "05-711427",
    title: "Interim Record of Decision",
  });
  assert.equal(federatedText.docket, "05-711427");
  assert.match(federatedText.institution, /Federated Metals/i);
  assert.equal(federatedText.date, "2026-08-05");
  assert.equal(federatedText.title, "Interim Record of Decision");
  assert.ok(isRealSuperfundRodBody(federatedText.body));
  assert.ok(federatedText.body.includes("1,200 ppm"));
  assert.ok(federatedText.body.includes("lead dross"));
  assert.ok(federatedText.body.includes("x-ray florescence"));
  assert.ok(CARD_FIELDS.every((f) => f in federatedText));
  assert.equal(pdfIdFromUrl(federatedText.sourceUrl), "05-711427.pdf");
  assert.equal(federatedText.sourceUrl, FEDERATED);

  for (const [file, docket, url] of [
    ["02-744534.txt", "02-744534", "https://semspub.epa.gov/work/02/744534.pdf"],
    ["05-988133.txt", "05-988133", "https://semspub.epa.gov/work/05/988133.pdf"],
    ["05-978074.txt", "05-978074", "https://semspub.epa.gov/work/05/978074.pdf"],
    ["05-964773.txt", "05-964773", "https://semspub.epa.gov/work/05/964773.pdf"],
  ] as const) {
    const card = parseSuperfundRodText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealSuperfundRodBody(card.body), `${docket} is official EPA Superfund ROD TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialSuperfundRodPdfUrl(card.sourceUrl));
  }

  const capeFear = parseSuperfundRodText(readFx("04-11246061.txt"), {
    sourceUrl: "https://semspub.epa.gov/work/04/11246061.pdf",
    institution: "Cape Fear Wood Preserving Superfund Site",
    date: "2026-09-02",
    docket: "04-11246061",
    title: "Fifth Five-Year Review Report for Cape Fear Wood Preserving Superfund Site",
  });
  assert.equal(capeFear.docket, "04-11246061");
  assert.equal(capeFear.title, "Fifth Five-Year Review");
  assert.equal(capeFear.date, "2026-09-02");
  assert.ok(isRealSuperfundFyrBody(capeFear.body));
  assert.ok(isRealSuperfundRodBody(capeFear.body), "FYR report text is a real body in this bag");
  assert.match(capeFear.body, /FIFTH FIVE-YEAR REVIEW REPORT/i);
  assert.match(capeFear.body, /CAPE FEAR WOOD PRESERVING/i);
  assert.match(capeFear.body, /PROTECTIVENESS STATEMENT/i);

  const westinghouse = parseSuperfundRodText(readFx("03-2517424.txt"), {
    sourceUrl: "https://semspub.epa.gov/work/03/2517424.pdf",
    docket: "03-2517424",
    title: "Fifth Five Year Review Report",
  });
  assert.ok(isRealSuperfundFyrBody(westinghouse.body));
  assert.equal(westinghouse.title, "Fifth Five-Year Review");

  const fyrLetter = parseSuperfundRodText(readFx("fyr-letter.txt"), {
    sourceUrl: "https://semspub.epa.gov/work/04/11246059.pdf",
    institution: "USN Air Station Cecil Field",
    title: "LETTER FROM HUNTER JOHNSON protectiveness determination",
  });
  assert.equal(isRealSuperfundFyrBody(fyrLetter.body), false, "FYR protectiveness letter is not the report");
  assert.equal(isRealSuperfundRodBody(fyrLetter.body), false);

  const teaser = parseSuperfundRodText(readFx("no-body.txt"), {
    sourceUrl: "https://www.epa.gov/superfund/federated-metals-press",
    institution: "Federated Metals Corp. Whiting Superfund Site",
  });
  assert.equal(isRealSuperfundRodBody(teaser.body), false, "press/teaser is not the ROD body");

  const planBody = parseSuperfundRodText(readFx("proposed-plan.txt"), {
    sourceUrl: "https://semspub.epa.gov/work/05/709513.pdf",
    institution: "Federated Metals Corp. Whiting Superfund Site",
  });
  assert.equal(isRealSuperfundRodBody(planBody.body), false, "Proposed Plan is not this SKU");

  const peopleBody = parseSuperfundRodText(readFx("people.txt"), {
    sourceUrl: FEDERATED,
    institution: "Jane Q Public",
  });
  assert.equal(isRealSuperfundRodBody(peopleBody.body), false, "people file is not this SKU");

  const wrapJson = parseSuperfundRodText(readFx("master-collection-excerpt.json"), {
    sourceUrl: FEDERATED,
    institution: "FEDERATED METALS CORP WHITING",
  });
  assert.equal(isRealSuperfundRodBody(wrapJson.body), false, "do not wrap the free SEMS listing JSON");

  const fr = parseSuperfundRodText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/08/05/2026-99999/federated-metals",
    institution: "Federated Metals Corp. Whiting Superfund Site",
  });
  assert.equal(isRealSuperfundRodBody(fr.body), false, "Federal Register raw_text is a KILL");

  const air = parseSuperfundRodText(readFx("air-letter.txt"), {
    sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf",
    institution: "KAGOME Co., LTD.",
  });
  assert.equal(isRealSuperfundRodBody(air.body), false, "AIR /air-letters is not this SKU");

  const ttb = parseSuperfundRodText(readFx("ttb-oic.txt"), {
    sourceUrl: "https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
    institution: "The 21st Amendment Brewery Cafe, LLC",
  });
  assert.equal(isRealSuperfundRodBody(ttb.body), false, "TTB /ttb-oic is not this SKU");

  const denovo = parseSuperfundRodText(readFx("denovo-order.txt"), {
    sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf",
    institution: "Caristo Diagnostics Ltd.",
  });
  assert.equal(isRealSuperfundRodBody(denovo.body), false, "De Novo /denovo-orders is not this SKU");

  const fifra = parseSuperfundRodText(readFx("fifra-order.txt"), {
    sourceUrl: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/x.pdf",
    institution: "Travel Caddy, Inc. dba Travelon",
  });
  assert.equal(isRealSuperfundRodBody(fifra.body), false, "FIFRA /fifra-orders is not this SKU");

  const cftc = parseSuperfundRodText(readFx("cftc-order.txt"), {
    sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealSuperfundRodBody(cftc.body), false, "CFTC /cftc-orders is not this SKU");

  const ico = parseSuperfundRodText(readFx("ico-mpn.txt"), {
    sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
    institution: "Reddit, Inc.",
  });
  assert.equal(isRealSuperfundRodBody(ico.body), false, "ICO /ico-mpn is not this SKU");

  const manifest = buildSuperfundRodsManifest({
    ok: true,
    product: "epa-superfund-rod-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-08-05",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://semspub.epa.gov/" },
    cards: [federatedText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Federated Metals/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "05-711427");
  assert.equal((manifest.cards as { title: string }[])[0]?.title, "Interim Record of Decision");
  assert.ok(!manBlob.includes("1,200 ppm"), "free manifest must not dump ROD body");
  assert.ok(!manBlob.includes("lead dross"));
  assert.ok(!manBlob.includes("x-ray florescence"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("05-711427"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "U.S. EPA");

  const cache = mkdtempSync(join(tmpdir(), "superfund-rods-collect-"));
  const prevDir = process.env.SUPERFUND_RODS_DIR;
  process.env.SUPERFUND_RODS_DIR = cache;
  try {
    const snap = await collectSuperfundRods({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 7, "fixture collect extracts ROD bodies plus official FYR reports");
    assert.ok(snap.cards.some((c) => c.docket === "05-711427" && isRealSuperfundRodBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "04-11246061" && isRealSuperfundFyrBody(c.body)));
    assert.ok(snap.cards.some((c) => c.docket === "03-2517424" && c.title === "Fifth Five-Year Review"));
    assert.ok(snap.cards.every((c) => isRealSuperfundRodBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "05-999999"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "05-709513"), "skip Proposed Plan");
    assert.ok(!snap.cards.some((c) => c.id === "04-11246059"), "skip FYR protectiveness letter");
    assert.ok(snap.cards.every((c) => officialSuperfundRodPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectSuperfundRods({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "05-711427"), "re-collect keeps cached bodies");
    assert.ok(merged.cards.some((c) => c.docket === "04-11246061"), "re-collect keeps cached FYR bodies");
    assert.ok((merged.reused ?? 0) >= 7);
    assert.ok(existsSync(catalogPath()), "collect writes slim catalog.json next to the fat bag");
    const fromCatalog = await loadSuperfundRodsManifest();
    assert.ok((fromCatalog.cardCount as number) >= 7);
    const catalogCards = fromCatalog.cards as { docket?: string; title?: string }[];
    assert.equal(catalogCards.find((c) => c.docket === "04-11246061")?.title, "Fifth Five-Year Review");
    assert.deepEqual(fromCatalog.schema, { fields: ["id", "institution", "docket", "date", "title", "sourceUrl"] });
    assert.ok(!JSON.stringify(fromCatalog).includes("DECLARATION"), "catalog path must not dump ROD/FYR bodies");
  } finally {
    if (prevDir === undefined) delete process.env.SUPERFUND_RODS_DIR;
    else process.env.SUPERFUND_RODS_DIR = prevDir;
  }

  const fatDir = mkdtempSync(join(tmpdir(), "superfund-rods-fat-"));
  const fatPrev = process.env.SUPERFUND_RODS_DIR;
  process.env.SUPERFUND_RODS_DIR = fatDir;
  try {
    const huge = `${"RECORD OF DECISION\n".repeat(80)}United States Environmental Protection Agency\nDECLARATION\nCERCLA Superfund\n${"x".repeat(4000)}`;
    const fatCards = Array.from({ length: 24 }, (_, i) => ({
      id: `05-${700000 + i}`,
      docket: `05-${700000 + i}`,
      pdfId: `05-${700000 + i}.pdf`,
      institution: `Fat Superfund Site ${i}`,
      date: "2026-08-05",
      title: "Record of Decision",
      sourceUrl: `https://semspub.epa.gov/work/05/${700000 + i}.pdf`,
      body: `${huge} needle-${i}-lead-dross`,
    }));
    writeFileSync(
      join(fatDir, "snapshot.json"),
      JSON.stringify(
        {
          ok: true,
          product: "epa-superfund-rod-bodies",
          status: "ok",
          reason: null,
          fetchedAt: "2026-09-07T20:22:00.000Z",
          asOf: "2026-09-02",
          license: LICENSE,
          attribution: ATTRIBUTION,
          sources: { listing: LISTING_URL, pdfHost: "https://semspub.epa.gov/" },
          cards: fatCards,
        },
        null,
        2,
      ),
    );
    const stripped = stripJsonStringField(readFs(join(fatDir, "snapshot.json"), "utf-8"));
    assert.ok(!stripped.includes("lead-dross"), "strip bodies before public parse");
    const publicMan = await loadSuperfundRodsManifest();
    assert.equal(publicMan.cardCount, 24, "public unpaid manifest keeps real cardCount from the fat bag");
    const publicBlob = JSON.stringify(publicMan);
    assert.ok(!publicBlob.includes("lead-dross"));
    assert.ok(!publicBlob.includes("RECORD OF DECISION"));
    assert.equal((publicMan.cards as { title?: string }[])[0]?.title, "Record of Decision");
    assert.ok(existsSync(catalogPath()), "first public read writes catalog.json so the edge path stays cheap");
    const again = await loadSuperfundRodsManifest();
    assert.equal(again.cardCount, 24);

    writeFileSync(
      catalogPath(),
      JSON.stringify({
        product: "epa-superfund-rod-bodies",
        fetchedAt: "2026-09-08T18:27:29.933Z",
        asOf: "2026-09-03",
        cardCount: 1,
        cards: [
          {
            id: "04-11246061",
            institution: "Cape Fear Wood Preserving Superfund Site",
            docket: "04-11246061",
            date: "2026-09-02",
            sourceUrl: "https://semspub.epa.gov/work/04/11246061.pdf",
          },
        ],
      }),
    );
    writeFileSync(
      join(fatDir, "snapshot.json"),
      JSON.stringify({
        ok: true,
        product: "epa-superfund-rod-bodies",
        status: "ok",
        reason: null,
        fetchedAt: "2026-09-08T18:27:29.933Z",
        asOf: "2026-09-03",
        license: LICENSE,
        attribution: ATTRIBUTION,
        sources: { listing: LISTING_URL, pdfHost: "https://semspub.epa.gov/" },
        cards: [
          {
            id: "04-11246061",
            docket: "04-11246061",
            pdfId: "04-11246061.pdf",
            institution: "Cape Fear Wood Preserving Superfund Site",
            date: "2026-09-02",
            title: "Fifth Five-Year Review",
            sourceUrl: "https://semspub.epa.gov/work/04/11246061.pdf",
            body: `${huge} Cape Fear FYR body needle`,
          },
        ],
      }),
    );
    const upgraded = await loadSuperfundRodsManifest();
    assert.equal((upgraded.cards as { title?: string; docket?: string }[])[0]?.title, "Fifth Five-Year Review");
    assert.equal((upgraded.cards as { docket?: string }[])[0]?.docket, "04-11246061");
    assert.ok(!JSON.stringify(upgraded).includes("Cape Fear FYR body needle"), "title rebuild must not dump FYR body");
  } finally {
    if (fatPrev === undefined) delete process.env.SUPERFUND_RODS_DIR;
    else process.env.SUPERFUND_RODS_DIR = fatPrev;
  }

  console.log("superfund-rods parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
