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
  WGET_SAFARI_UA,
  buildAtsdrHcManifest,
  collectAtsdrHc,
  compactForMatch,
  isInstitutionConsultationRow,
  isPeopleRow,
  isRealAtsdrHcBody,
  officialAtsdrHcPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseAtsdrHcText,
  type AtsdrHcListingRow,
} from "./atsdr-hc.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/atsdr-hc");
const LEAD = "https://www.atsdr.cdc.gov/HAC/pha/Sterigenics/SmyrnaEtO-508.pdf";

const LEAK_NEEDLES = ["lifetime excess risk", "not statistically greater", "110000355963"];

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

function hasNeedle(text: string, needle: string): boolean {
  return compactForMatch(text).includes(needle);
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as AtsdrHcListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official ATSDR excerpt lists company/institution consultations");
  const lead = listed.find((r) => r.id === "sterigenics-smyrna-eto");
  assert.ok(lead);
  assert.match(lead?.institution ?? "", /Sterigenics LLC/i);
  assert.equal(lead?.date, "2026-08-18");
  assert.equal(lead?.sourceUrl, LEAD);
  assert.ok(listed.some((r) => r.id === "nasa-wallops-pfas"));
  assert.ok(listed.some((r) => r.id === "former-fort-ord"));
  assert.ok(listed.some((r) => r.id === "jard-company"));
  assert.ok(listed.some((r) => r.id === "bristol-quarry-landfill"));
  assert.ok(!listed.some((r) => r.id === "jane-smith-person"), "skip people");
  assert.ok(!listed.some((r) => r.id === "factsheet-teaser"), "skip 2-page factsheet");
  assert.ok(!listed.some((r) => r.id === "state-listing"), "skip state listing HTML");
  assert.ok(!listed.some((r) => r.id === "superfund-rods"), "skip /superfund-rods");
  assert.ok(!listed.some((r) => r.id === "fsis-hmsa"), "skip /fsis-hmsa");
  assert.ok(!listed.some((r) => r.id === "charity-commission"), "skip Charity Commission");
  assert.ok(!listed.some((r) => r.id === "ico-mpn"), "skip ICO MPN");
  assert.ok(listed.every((r) => officialAtsdrHcPdfUrl(r.sourceUrl)));
  assert.equal(officialAtsdrHcPdfUrl(LEAD), LEAD);
  assert.equal(
    officialAtsdrHcPdfUrl("https://www.atsdr.cdc.gov/HAC/pha/Sterigenics/EvaluationOfEthyleneOxide-factsheet-508.pdf"),
    null,
  );
  assert.equal(
    officialAtsdrHcPdfUrl("https://wwwn.cdc.gov/TSP/PHA/PHAListing.aspx?StateIndicator=GA"),
    null,
  );
  assert.equal(officialAtsdrHcPdfUrl("https://semspub.epa.gov/work/05/711427.pdf"), null);
  assert.equal(
    officialAtsdrHcPdfUrl("https://www.fsis.usda.gov/sites/default/files/media_file/documents/M40110-NOIE-07302026.pdf"),
    null,
  );
  assert.equal(officialAtsdrHcPdfUrl("https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf"), null);
  assert.ok(LISTING_URL.includes("PHAListing"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.id === "sterigenics-smyrna-eto"));
  assert.match(WGET_SAFARI_UA, /Safari/);

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "sterigenics-smyrna-eto"));
  assert.ok(htmlListed.some((r) => /Sterigenics/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => r.id === "former-fort-ord"));
  assert.ok(htmlListed.some((r) => r.sourceUrl.includes("FormerFordOrd")));
  assert.ok(!htmlListed.some((r) => /jane smith/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /factsheet/i.test(r.sourceUrl)));

  const people = rows.find((r) => (r.id ?? "") === "jane-smith-person");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionConsultationRow(people!), false);
  const leadRow = rows.find((r) => r.id === "sterigenics-smyrna-eto" && officialAtsdrHcPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionConsultationRow(leadRow!), true);
  assert.equal(isPeopleRow(leadRow!), false);
  assert.equal(isInstitutionConsultationRow(rows.find((r) => r.id === "factsheet-teaser")!), false, "factsheet is a KILL");
  assert.equal(isInstitutionConsultationRow(rows.find((r) => r.id === "superfund-rods")!), false, "/superfund-rods is a KILL");
  assert.equal(isInstitutionConsultationRow(rows.find((r) => r.id === "fsis-hmsa")!), false, "/fsis-hmsa is a KILL");
  assert.equal(
    isInstitutionConsultationRow(rows.find((r) => r.id === "charity-commission")!),
    false,
    "Charity Commission is a KILL",
  );

  const leadText = parseAtsdrHcText(readFx("sterigenics-smyrna-eto.txt"), {
    sourceUrl: LEAD,
    institution: "Sterigenics LLC",
    date: "2026-08-18",
    id: "sterigenics-smyrna-eto",
    title: "Health Consultation",
  });
  assert.equal(leadText.id, "sterigenics-smyrna-eto");
  assert.match(leadText.institution, /Sterigenics LLC/i);
  assert.equal(leadText.date, "2026-08-18");
  assert.equal(leadText.title, "Health Consultation");
  assert.ok(isRealAtsdrHcBody(leadText.body));
  for (const needle of LEAK_NEEDLES) {
    assert.ok(hasNeedle(leadText.body, needle), `Sterigenics Final HC contains ${needle}`);
  }
  assert.ok(CARD_FIELDS.every((f) => f in leadText));
  assert.equal(leadText.sourceUrl, LEAD);

  for (const [file, id, url] of [
    [
      "nasa-wallops-pfas.txt",
      "nasa-wallops-pfas",
      "https://www.atsdr.cdc.gov/HAC/pha/Wallops/NASA-WFF-PC-508.pdf",
    ],
    [
      "former-fort-ord.txt",
      "former-fort-ord",
      "https://www.atsdr.cdc.gov/HAC/pha/FormerFordOrd/FortOrd-HC-508.pdf",
    ],
    ["jard-company.txt", "jard-company", "https://www.atsdr.cdc.gov/HAC/pha/Jard/Jard-PHA-508.pdf"],
    [
      "bristol-quarry-landfill.txt",
      "bristol-quarry-landfill",
      "https://www.atsdr.cdc.gov/HAC/pha/Bristol/Bristol-Quarry-Landfill-HC-508.pdf",
    ],
  ] as const) {
    const card = parseAtsdrHcText(readFx(file), { sourceUrl: url, id });
    assert.ok(isRealAtsdrHcBody(card.body), `${id} is official ATSDR PHA / HC TEXT`);
    assert.equal(card.id, id);
    assert.ok(officialAtsdrHcPdfUrl(card.sourceUrl));
  }

  const teaserBody = parseAtsdrHcText(readFx("no-body.txt"), {
    sourceUrl: "https://wwwn.cdc.gov/TSP/PHA/PHAListing.aspx?StateIndicator=GA",
    institution: "Sterigenics LLC",
  });
  assert.equal(isRealAtsdrHcBody(teaserBody.body), false, "listing/factsheet teaser is not the consultation body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(teaserBody.body, needle), `teaser must not contain ${needle}`);
  }

  const factsheetBody = parseAtsdrHcText(readFx("factsheet.txt"), {
    sourceUrl: "https://www.atsdr.cdc.gov/HAC/pha/Sterigenics/EvaluationOfEthyleneOxide-factsheet-508.pdf",
    institution: "Sterigenics LLC",
  });
  assert.equal(isRealAtsdrHcBody(factsheetBody.body), false, "2-page factsheet is not the sold body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(factsheetBody.body, needle), `factsheet must not contain ${needle}`);
  }

  const peopleBody = parseAtsdrHcText(readFx("people.txt"), {
    sourceUrl: LEAD,
    institution: "Jane Smith",
  });
  assert.equal(isRealAtsdrHcBody(peopleBody.body), false, "people file is not this SKU");

  assert.equal(
    isRealAtsdrHcBody(
      parseAtsdrHcText(readFx("superfund-rods.txt"), {
        sourceUrl: "https://semspub.epa.gov/work/05/711427.pdf",
        institution: "Federated Metals Corp. Whiting Superfund Site",
      }).body,
    ),
    false,
    "/superfund-rods is a KILL",
  );
  assert.equal(
    isRealAtsdrHcBody(
      parseAtsdrHcText(readFx("fsis-hmsa.txt"), {
        sourceUrl: "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M40110-NOIE-07302026.pdf",
        institution: "Collagen Solutions (US) LLC",
      }).body,
    ),
    false,
    "/fsis-hmsa is a KILL",
  );
  assert.equal(
    isRealAtsdrHcBody(
      parseAtsdrHcText(readFx("charity-commission.txt"), {
        sourceUrl: "https://www.gov.uk/government/publications/charity-commission-inquiry.pdf",
        institution: "Example Charity Ltd",
      }).body,
    ),
    false,
    "Charity Commission is a KILL",
  );
  assert.equal(
    isRealAtsdrHcBody(
      parseAtsdrHcText(readFx("ico-mpn.txt"), {
        sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
        institution: "Reddit, Inc.",
      }).body,
    ),
    false,
    "ICO /ico-mpn is not this SKU",
  );

  const manifest = buildAtsdrHcManifest({
    ok: true,
    product: "atsdr-hc-consultation-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-08-18",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://www.atsdr.cdc.gov/HAC/pha/" },
    cards: [leadText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Sterigenics LLC/i);
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!manBlob.includes(needle), `free manifest must not dump ${needle}`);
  }
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("sterigenics-smyrna-eto"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 U.S.C. § 105");
  assert.match(String(manifest.attribution), /17 U\.S\.C\. § 105/);

  const cache = mkdtempSync(join(tmpdir(), "atsdr-hc-collect-"));
  const prevDir = process.env.ATSDR_HC_DIR;
  process.env.ATSDR_HC_DIR = cache;
  try {
    const snap = await collectAtsdrHc({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official ATSDR consultation bodies");
    assert.ok(snap.cards.some((c) => c.id === "sterigenics-smyrna-eto" && isRealAtsdrHcBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealAtsdrHcBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "jane-smith-person"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "factsheet-teaser"), "skip factsheet");
    assert.ok(snap.cards.every((c) => officialAtsdrHcPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectAtsdrHc({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === "sterigenics-smyrna-eto"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.ATSDR_HC_DIR;
    else process.env.ATSDR_HC_DIR = prevDir;
  }

  console.log("atsdr-hc parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
