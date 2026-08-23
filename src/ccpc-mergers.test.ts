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
  buildCcpcMergersManifest,
  collectCcpcMergers,
  isInstitutionDeterminationRow,
  isPeopleRow,
  isRealCcpcMergerBody,
  officialCcpcMergerPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseCcpcMergerText,
  pdfIdFromUrl,
  type CcpcMergersListingRow,
} from "./ccpc-mergers.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ccpc-mergers");
const UH =
  "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/united-hardware-dermot-kehoe-supply---diy/m-26-006-determination.pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as CcpcMergersListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official CCPC excerpt lists company determinations");
  const uh = listed.find((r) => r.id === "united-hardware-m26006");
  assert.ok(uh);
  assert.match(uh?.institution ?? "", /United Hardware DAC/i);
  assert.equal(uh?.date, "2026-03-06");
  assert.equal(uh?.mNumber, "M/26/006");
  assert.equal(uh?.sourceUrl, UH);
  assert.ok(listed.some((r) => r.id === "bdo-m26039"));
  assert.ok(listed.some((r) => r.id === "doehler-treatt-m26035"));
  assert.ok(listed.some((r) => r.id === "wolseley-curran-m26038"));
  assert.ok(listed.some((r) => r.id === "ivc-acorn-m26033"));
  assert.ok(!listed.some((r) => r.id === "dermot-kehoe-person"), "skip people");
  assert.ok(!listed.some((r) => r.id === "united-hardware-announce"), "skip announcements");
  assert.ok(!listed.some((r) => r.id === "elis-ocl-m25050"), "skip withdrawn Elis/OCL");
  assert.ok(!listed.some((r) => r.id === "case-card-grid"), "skip case-card grid");
  assert.ok(!listed.some((r) => r.id === "sitefinity-odata"), "skip Sitefinity OData");
  assert.ok(!listed.some((r) => r.id === "cludo"), "skip Cludo");
  assert.ok(!listed.some((r) => r.id === "data-gov-ie"), "skip data.gov.ie");
  assert.ok(!listed.some((r) => r.id === "rechtspraak"), "skip Rechtspraak");
  assert.ok(listed.every((r) => officialCcpcMergerPdfUrl(r.sourceUrl)));
  assert.equal(officialCcpcMergerPdfUrl(UH), UH);
  assert.equal(
    officialCcpcMergerPdfUrl(
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/united-hardware-dermot-kehoe-supply---diy/m-26-006-merger-announcement.pdf",
    ),
    null,
  );
  assert.equal(
    officialCcpcMergerPdfUrl(
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2025/elis-ocl-laundry-services/m-25-050-determination.pdf",
    ),
    null,
  );
  assert.equal(
    officialCcpcMergerPdfUrl(
      "https://www.ccpc.ie/enforcement-and-regulation/mergers/find-a-merger-case/details/united-hardware-dermot-kehoe-supply---diy",
    ),
    null,
  );
  assert.equal(officialCcpcMergerPdfUrl("https://www.ccpc.ie/api/default/documents"), null);
  assert.equal(officialCcpcMergerPdfUrl("https://api.cludo.com/api/v3/ccpc/search"), null);
  assert.equal(officialCcpcMergerPdfUrl("https://data.gov.ie/dataset/ccpc-mergers"), null);
  assert.equal(officialCcpcMergerPdfUrl("https://uitspraken.rechtspraak.nl/details"), null);
  assert.equal(officialCcpcMergerPdfUrl("https://www.federalregister.gov/documents/2026/03/06/ccpc"), null);
  assert.equal(officialCcpcMergerPdfUrl("https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf"), null);
  assert.ok(LISTING_URL.includes("ccpc.ie"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "united-hardware-m26006"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "united-hardware-m26006"));
  assert.ok(htmlListed.some((r) => /United Hardware/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /BDO UK Partner/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /announcement/i.test(r.title)));
  assert.ok(!htmlListed.some((r) => /elis-ocl/i.test(r.id)));

  const people = rows.find((r) => (r.docket ?? "") === "dermot-kehoe-person");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionDeterminationRow(people!), false);
  const uhRow = rows.find((r) => r.docket === "united-hardware-m26006" && officialCcpcMergerPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionDeterminationRow(uhRow!), true);
  assert.equal(isPeopleRow(uhRow!), false);
  const announce = rows.find((r) => r.docket === "united-hardware-announce");
  assert.equal(isInstitutionDeterminationRow(announce!), false, "announcement PDF is not this SKU");
  const withdrawn = rows.find((r) => r.docket === "elis-ocl-m25050");
  assert.equal(isInstitutionDeterminationRow(withdrawn!), false, "withdrawn Elis/OCL is not this SKU");

  const uhText = parseCcpcMergerText(readFx("united-hardware-m26006.txt"), {
    sourceUrl: UH,
    institution: "United Hardware DAC / Ardentia / Kehoe’s Homevalue t/a Dermot Kehoe Supply & DIY",
    date: "2026-03-06",
    docket: "united-hardware-m26006",
    mNumber: "M/26/006",
    title: "Section 21 determination",
  });
  assert.equal(uhText.docket, "united-hardware-m26006");
  assert.match(uhText.institution, /United Hardware DAC/i);
  assert.equal(uhText.date, "2026-03-06");
  assert.equal(uhText.mNumber, "M/26/006");
  assert.equal(uhText.title, "Section 21 determination");
  assert.ok(isRealCcpcMergerBody(uhText.body));
  const uhCompact = uhText.body.replace(/\s+/g, " ");
  assert.ok(uhText.body.includes("18(1A)"));
  assert.ok(uhCompact.includes("Share Purchase Agreement"));
  assert.ok(uhText.body.includes("Vertical Relationship"));
  assert.ok(uhText.body.includes("40km radius of Kehoe"));
  assert.ok(uhText.body.includes("Associated Hardware/National Hardware"));
  assert.ok(CARD_FIELDS.every((f) => f in uhText));
  assert.equal(pdfIdFromUrl(uhText.sourceUrl), "m-26-006-determination.pdf");
  assert.equal(uhText.sourceUrl, UH);

  for (const [file, docket, url] of [
    [
      "bdo-m26039.txt",
      "bdo-m26039",
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/bdo-uk-bdo-ireland/m-26-039-determination.pdf",
    ],
    [
      "doehler-treatt-m26035.txt",
      "doehler-treatt-m26035",
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/doehler-treatt/m-26-035-public-determination.pdf",
    ],
    [
      "wolseley-curran-m26038.txt",
      "wolseley-curran-m26038",
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/wolseley-peter-curran-electrical/m-26-038-determination.pdf",
    ],
    [
      "ivc-acorn-m26033.txt",
      "ivc-acorn-m26033",
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/ivc-evidensia-ireland-acorn-veterinary-clinic/m-26-033-determination.pdf",
    ],
  ] as const) {
    const card = parseCcpcMergerText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealCcpcMergerBody(card.body), `${docket} is official CCPC determination TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialCcpcMergerPdfUrl(card.sourceUrl));
  }

  const teaserBody = parseCcpcMergerText(readFx("no-body.txt"), {
    sourceUrl: "https://www.ccpc.ie/enforcement-and-regulation/mergers/find-a-merger-case/details/united-hardware-dermot-kehoe-supply---diy",
    institution: "United Hardware DAC",
  });
  assert.equal(isRealCcpcMergerBody(teaserBody.body), false, "case-card teaser is not the determination body");
  assert.ok(!teaserBody.body.includes("18(1A)"));
  assert.ok(!teaserBody.body.replace(/\s+/g, " ").includes("Share Purchase Agreement"));
  assert.ok(!teaserBody.body.includes("Vertical Relationship"));
  assert.ok(!teaserBody.body.includes("40km radius of Kehoe"));
  assert.ok(!teaserBody.body.includes("Associated Hardware/National Hardware"));

  const announceBody = parseCcpcMergerText(readFx("announcement.txt"), {
    sourceUrl:
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/united-hardware-dermot-kehoe-supply---diy/m-26-006-merger-announcement.pdf",
    institution: "United Hardware DAC",
  });
  assert.equal(isRealCcpcMergerBody(announceBody.body), false, "announcement is not the determination body");

  const peopleBody = parseCcpcMergerText(readFx("people.txt"), {
    sourceUrl: UH,
    institution: "Dermot Kehoe",
  });
  assert.equal(isRealCcpcMergerBody(peopleBody.body), false, "people file is not this SKU");

  const withdrawnBody = parseCcpcMergerText(readFx("withdrawn-elis.txt"), {
    sourceUrl:
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2025/elis-ocl-laundry-services/m-25-050-determination.pdf",
    institution: "Elis Textile Services Limited",
  });
  assert.equal(isRealCcpcMergerBody(withdrawnBody.body), false, "withdrawn Elis/OCL is a KILL");

  const odata = parseCcpcMergerText(readFx("sitefinity-odata.txt"), {
    sourceUrl: "https://www.ccpc.ie/api/default/documents",
    institution: "United Hardware DAC",
  });
  assert.equal(isRealCcpcMergerBody(odata.body), false, "Sitefinity OData is a KILL");

  const cludo = parseCcpcMergerText(readFx("cludo.txt"), {
    sourceUrl: "https://api.cludo.com/api/v3/ccpc/search",
    institution: "United Hardware DAC",
  });
  assert.equal(isRealCcpcMergerBody(cludo.body), false, "Cludo is a KILL");

  const dataGov = parseCcpcMergerText(readFx("data-gov-ie.txt"), {
    sourceUrl: "https://data.gov.ie/dataset/ccpc-mergers",
    institution: "Competition and Consumer Protection Commission",
  });
  assert.equal(isRealCcpcMergerBody(dataGov.body), false, "data.gov.ie is a KILL");

  const rechtspraak = parseCcpcMergerText(readFx("rechtspraak.txt"), {
    sourceUrl: "https://uitspraken.rechtspraak.nl/details",
    institution: "United Hardware DAC",
  });
  assert.equal(isRealCcpcMergerBody(rechtspraak.body), false, "Rechtspraak is a KILL");

  const fr = parseCcpcMergerText(readFx("fr.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/03/06/ccpc",
    institution: "United Hardware DAC",
  });
  assert.equal(isRealCcpcMergerBody(fr.body), false, "Federal Register is a KILL");

  const ico = parseCcpcMergerText(readFx("ico-mpn.txt"), {
    sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
    institution: "Reddit, Inc.",
  });
  assert.equal(isRealCcpcMergerBody(ico.body), false, "ICO /ico-mpn is not this SKU");

  const phmsa = parseCcpcMergerText(readFx("phmsa-cop.txt"), {
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/12025033NOPV/12025033NOPV_Consent%20Agreement%20and%20Order_04212026_(22-259271).pdf",
    institution: "EQT Production Company",
  });
  assert.equal(isRealCcpcMergerBody(phmsa.body), false, "PHMSA /phmsa-cop is not this SKU");

  const acm = parseCcpcMergerText(readFx("acm-besluiten.txt"), {
    sourceUrl: "https://www.acm.nl/system/files/documents/boetebesluit-house-of-tickets.pdf",
    institution: "House of Tickets B.V.",
  });
  assert.equal(isRealCcpcMergerBody(acm.body), false, "ACM /acm-besluiten is not this SKU");

  const manifest = buildCcpcMergersManifest({
    ok: true,
    product: "ccpc-institution-merger-determination-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-03-06",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/" },
    cards: [uhText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /United Hardware/i);
  assert.equal((manifest.cards as { mNumber: string }[])[0]?.mNumber, "M/26/006");
  assert.ok(!manBlob.includes("18(1A)"), "free manifest must not dump determination body");
  assert.ok(!manBlob.includes("Share Purchase"));
  assert.ok(!manBlob.includes("Vertical Relationship"));
  assert.ok(!manBlob.includes("40km radius of Kehoe"));
  assert.ok(!manBlob.includes("Associated Hardware/National Hardware"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("united-hardware-m26006"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "CC-BY 4.0");
  assert.match(String(manifest.attribution), /CC-BY 4\.0/);

  const cache = mkdtempSync(join(tmpdir(), "ccpc-mergers-collect-"));
  const prevDir = process.env.CCPC_MERGERS_DIR;
  process.env.CCPC_MERGERS_DIR = cache;
  try {
    const snap = await collectCcpcMergers({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official CCPC determination bodies");
    assert.ok(snap.cards.some((c) => c.docket === "united-hardware-m26006" && isRealCcpcMergerBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealCcpcMergerBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "dermot-kehoe-person"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "united-hardware-announce"), "skip announcements");
    assert.ok(!snap.cards.some((c) => c.id === "elis-ocl-m25050"), "skip withdrawn");
    assert.ok(snap.cards.every((c) => officialCcpcMergerPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectCcpcMergers({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "united-hardware-m26006"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.CCPC_MERGERS_DIR;
    else process.env.CCPC_MERGERS_DIR = prevDir;
  }

  console.log("ccpc-mergers parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
