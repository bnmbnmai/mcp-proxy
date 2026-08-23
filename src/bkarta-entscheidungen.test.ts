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
  buildBkartaManifest,
  collectBkartaEntscheidungen,
  compactForMatch,
  isInstitutionEntscheidungRow,
  isPeopleRow,
  isRealBkartaBody,
  officialBkartaPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseBkartaText,
  pdfIdFromUrl,
  type BkartaListingRow,
} from "./bkarta-entscheidungen.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/bkarta-entscheidungen");
const AMAZON =
  "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Missbrauchsaufsicht/B2-73-20.pdf?__blob=publicationFile&v=3";

const LEAK_NEEDLES = ["Price Error Prevention", "AP-FOD", "SC-FOD", "Atypical Pricing"];

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

function hasNeedle(text: string, needle: string): boolean {
  return compactForMatch(text).includes(needle);
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as BkartaListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official BKartA excerpt lists company Entscheidungen");
  const amazon = listed.find((r) => r.id === "amazon-b2-73-20");
  assert.ok(amazon);
  assert.match(amazon?.institution ?? "", /Amazon\.com, Inc\./i);
  assert.equal(amazon?.date, "2026-02-04");
  assert.equal(amazon?.az, "B2-73/20");
  assert.equal(amazon?.sourceUrl, AMAZON);
  assert.ok(listed.some((r) => r.id === "check24-b8-40-25"));
  assert.ok(listed.some((r) => r.id === "strabag-stumpp-b1-112-25"));
  assert.ok(listed.some((r) => r.id === "toennies-vion-b4-100-24"));
  assert.ok(listed.some((r) => r.id === "ewe-telekom-gfnw-v-37-25"));
  assert.ok(!listed.some((r) => r.id === "arne-stumpp-person"), "skip people-fine");
  assert.ok(!listed.some((r) => r.id === "strabag-fallbericht"), "skip Fallbericht");
  assert.ok(!listed.some((r) => r.id === "amazon-press"), "skip press HTML");
  assert.ok(!listed.some((r) => r.id === "amazon-card"), "skip Entscheidungsdatenbank card");
  assert.ok(!listed.some((r) => r.id === "govdata-csv"), "skip govdata.de");
  assert.ok(!listed.some((r) => r.id === "gov-uk"), "skip GOV.UK");
  assert.ok(listed.every((r) => officialBkartaPdfUrl(r.sourceUrl)));
  assert.equal(officialBkartaPdfUrl(AMAZON), AMAZON);
  assert.equal(
    officialBkartaPdfUrl(
      "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Fallberichte/Fusionskontrolle/2026/B1-112-25.pdf",
    ),
    null,
  );
  assert.equal(
    officialBkartaPdfUrl("https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Missbrauchsaufsicht/B2-73-20.html"),
    null,
  );
  assert.equal(
    officialBkartaPdfUrl("https://www.bundeskartellamt.de/SharedDocs/Meldung/DE/Pressemitteilungen/2026/05_02_2026_Amazon.html"),
    null,
  );
  assert.equal(officialBkartaPdfUrl("https://www.govdata.de/web/guest/daten/-/details/bkarta"), null);
  assert.equal(officialBkartaPdfUrl("https://www.gov.uk/cma-cases/amazon"), null);
  assert.equal(officialBkartaPdfUrl("https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf"), null);
  assert.ok(LISTING_URL.includes("bundeskartellamt.de"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "amazon-b2-73-20"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "amazon-b2-73-20"));
  assert.ok(htmlListed.some((r) => /Amazon\.com/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /Check24/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /fallbericht/i.test(r.title)));
  assert.ok(!htmlListed.some((r) => /press/i.test(r.title)));

  const people = rows.find((r) => (r.docket ?? "") === "arne-stumpp-person");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionEntscheidungRow(people!), false);
  const amazonRow = rows.find((r) => r.docket === "amazon-b2-73-20" && officialBkartaPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionEntscheidungRow(amazonRow!), true);
  assert.equal(isPeopleRow(amazonRow!), false);
  const fallbericht = rows.find((r) => r.docket === "strabag-fallbericht");
  assert.equal(isInstitutionEntscheidungRow(fallbericht!), false, "Fallbericht is not this SKU");
  const press = rows.find((r) => r.docket === "amazon-press");
  assert.equal(isInstitutionEntscheidungRow(press!), false, "press HTML is not this SKU");

  const amazonText = parseBkartaText(readFx("amazon-b2-73-20.txt"), {
    sourceUrl: AMAZON,
    institution: "Amazon.com, Inc. / Amazon EU S.à r.l.",
    date: "2026-02-04",
    docket: "amazon-b2-73-20",
    az: "B2-73/20",
    title: "Verfügung",
  });
  assert.equal(amazonText.docket, "amazon-b2-73-20");
  assert.match(amazonText.institution, /Amazon\.com, Inc\./i);
  assert.equal(amazonText.date, "2026-02-04");
  assert.equal(amazonText.az, "B2-73/20");
  assert.equal(amazonText.title, "Verfügung");
  assert.ok(isRealBkartaBody(amazonText.body));
  for (const needle of LEAK_NEEDLES) {
    assert.ok(hasNeedle(amazonText.body, needle), `Amazon Verfügung contains ${needle}`);
  }
  assert.ok(CARD_FIELDS.every((f) => f in amazonText));
  assert.equal(pdfIdFromUrl(amazonText.sourceUrl), "B2-73-20.pdf");
  assert.equal(amazonText.sourceUrl, AMAZON);

  for (const [file, docket, url] of [
    [
      "check24-b8-40-25.txt",
      "check24-b8-40-25",
      "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Missbrauchsaufsicht/2026/B8-40-25.pdf?__blob=publicationFile&v=2",
    ],
    [
      "strabag-stumpp-b1-112-25.txt",
      "strabag-stumpp-b1-112-25",
      "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Fusionskontrolle/2026/B1-112-25.pdf?__blob=publicationFile&v=2",
    ],
    [
      "toennies-vion-b4-100-24.txt",
      "toennies-vion-b4-100-24",
      "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Fusionskontrolle/2026/B4-100-24.pdf?__blob=publicationFile&v=3",
    ],
    [
      "ewe-telekom-gfnw-v-37-25.txt",
      "ewe-telekom-gfnw-v-37-25",
      "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Kartellverbot/2026/V-37-25.pdf?__blob=publicationFile&v=4",
    ],
  ] as const) {
    const card = parseBkartaText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealBkartaBody(card.body), `${docket} is official BKartA Entscheidung TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialBkartaPdfUrl(card.sourceUrl));
  }

  const teaserBody = parseBkartaText(readFx("no-body.txt"), {
    sourceUrl: "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Missbrauchsaufsicht/B2-73-20.html",
    institution: "Amazon.com, Inc.",
  });
  assert.equal(isRealBkartaBody(teaserBody.body), false, "card teaser is not the Verfügung body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(teaserBody.body, needle), `teaser must not contain ${needle}`);
  }

  const pressBody = parseBkartaText(readFx("press.txt"), {
    sourceUrl: "https://www.bundeskartellamt.de/SharedDocs/Meldung/DE/Pressemitteilungen/2026/05_02_2026_Amazon.html",
    institution: "Amazon.com, Inc.",
  });
  assert.equal(isRealBkartaBody(pressBody.body), false, "press teaser is not the sold body");

  const peopleBody = parseBkartaText(readFx("people.txt"), {
    sourceUrl: AMAZON,
    institution: "Arne Stumpp",
  });
  assert.equal(isRealBkartaBody(peopleBody.body), false, "people file is not this SKU");

  const fallberichtBody = parseBkartaText(readFx("fallbericht.txt"), {
    sourceUrl: "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Fallberichte/Fusionskontrolle/2026/B1-112-25.pdf",
    institution: "STRABAG AG",
  });
  assert.equal(isRealBkartaBody(fallberichtBody.body), false, "Fallbericht is a KILL");

  const cardBody = parseBkartaText(readFx("entscheidungsdatenbank.txt"), {
    sourceUrl: "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Missbrauchsaufsicht/B2-73-20.html",
    institution: "Amazon.com, Inc.",
  });
  assert.equal(isRealBkartaBody(cardBody.body), false, "Entscheidungsdatenbank card is a KILL");

  const govdata = parseBkartaText(readFx("govdata.txt"), {
    sourceUrl: "https://www.govdata.de/web/guest/daten/-/details/bkarta",
    institution: "Amazon.com, Inc.",
  });
  assert.equal(isRealBkartaBody(govdata.body), false, "govdata.de is a KILL");

  const govUk = parseBkartaText(readFx("gov-uk.txt"), {
    sourceUrl: "https://www.gov.uk/cma-cases/amazon",
    institution: "Amazon.com, Inc.",
  });
  assert.equal(isRealBkartaBody(govUk.body), false, "GOV.UK is a KILL");

  const ico = parseBkartaText(readFx("ico-mpn.txt"), {
    sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
    institution: "Reddit, Inc.",
  });
  assert.equal(isRealBkartaBody(ico.body), false, "ICO /ico-mpn is not this SKU");

  const phmsa = parseBkartaText(readFx("phmsa-cop.txt"), {
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/12025033NOPV/12025033NOPV_Consent%20Agreement%20and%20Order_04212026_(22-259271).pdf",
    institution: "EQT Production Company",
  });
  assert.equal(isRealBkartaBody(phmsa.body), false, "PHMSA /phmsa-cop is not this SKU");

  const acm = parseBkartaText(readFx("acm-besluiten.txt"), {
    sourceUrl: "https://www.acm.nl/system/files/documents/boetebesluit-house-of-tickets.pdf",
    institution: "House of Tickets B.V.",
  });
  assert.equal(isRealBkartaBody(acm.body), false, "ACM /acm-besluiten is not this SKU");

  const ccpc = parseBkartaText(readFx("ccpc-mergers.txt"), {
    sourceUrl:
      "https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/united-hardware-dermot-kehoe-supply---diy/m-26-006-determination.pdf",
    institution: "United Hardware DAC",
  });
  assert.equal(isRealBkartaBody(ccpc.body), false, "CCPC /ccpc-mergers is not this SKU");

  const manifest = buildBkartaManifest({
    ok: true,
    product: "bkarta-institution-entscheidung-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-03-26",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/" },
    cards: [amazonText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Amazon\.com/i);
  assert.equal((manifest.cards as { az: string }[])[0]?.az, "B2-73/20");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!manBlob.includes(needle), `free manifest must not dump ${needle}`);
  }
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("amazon-b2-73-20"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "§ 5 Abs. 1 UrhG");
  assert.match(String(manifest.attribution), /§ 5 Abs\. 1 UrhG/);

  const cache = mkdtempSync(join(tmpdir(), "bkarta-entscheidungen-collect-"));
  const prevDir = process.env.BKARTA_ENTSCHEIDUNGEN_DIR;
  process.env.BKARTA_ENTSCHEIDUNGEN_DIR = cache;
  try {
    const snap = await collectBkartaEntscheidungen({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official BKartA Entscheidung bodies");
    assert.ok(snap.cards.some((c) => c.docket === "amazon-b2-73-20" && isRealBkartaBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealBkartaBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "arne-stumpp-person"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "strabag-fallbericht"), "skip Fallbericht");
    assert.ok(snap.cards.every((c) => officialBkartaPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectBkartaEntscheidungen({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "amazon-b2-73-20"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.BKARTA_ENTSCHEIDUNGEN_DIR;
    else process.env.BKARTA_ENTSCHEIDUNGEN_DIR = prevDir;
  }

  console.log("bkarta-entscheidungen parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
