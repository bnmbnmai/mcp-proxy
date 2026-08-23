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
  buildIcoMpnManifest,
  collectIcoMpn,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealIcoMpnBody,
  officialIcoMpnPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseIcoMpnText,
  pdfIdFromUrl,
  type IcoMpnListingRow,
} from "./ico-mpn.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ico-mpn");
const REDDIT = "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as IcoMpnListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official ICO excerpt lists institution MPNs");
  const reddit = listed.find((r) => r.id === "reddit-mpn-20260223");
  assert.ok(reddit);
  assert.match(reddit?.institution ?? "", /Reddit/i);
  assert.equal(reddit?.date, "2026-02-23");
  assert.equal(reddit?.sourceUrl, REDDIT);
  assert.ok(listed.some((r) => r.id === "medialab-20260204"));
  assert.ok(listed.some((r) => r.id === "lastpass-uk-ltd"));
  assert.ok(listed.some((r) => r.id === "capita-plc"));
  assert.ok(listed.some((r) => r.id === "south-staffordshire-plc"));
  assert.ok(!listed.some((r) => r.id === "jane-q-public"), "skip people");
  assert.ok(!listed.some((r) => r.id === "reddit-press"), "skip press teaser");
  assert.ok(listed.every((r) => officialIcoMpnPdfUrl(r.sourceUrl)));
  assert.equal(officialIcoMpnPdfUrl(REDDIT), REDDIT);
  assert.equal(
    officialIcoMpnPdfUrl(
      "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/02/reddit-issued-with-1447m-fine-for-children-s-privacy-failures/",
    ),
    null,
  );
  assert.equal(officialIcoMpnPdfUrl("https://semspub.epa.gov/work/05/711427.pdf"), null);
  assert.equal(officialIcoMpnPdfUrl("https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf"), null);
  assert.equal(
    officialIcoMpnPdfUrl("https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf"),
    null,
  );
  assert.ok(LISTING_URL.includes("ico.org.uk"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "reddit-mpn-20260223"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "reddit-mpn-20260223"));
  assert.ok(htmlListed.some((r) => /Reddit/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /LastPass/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /Jane Q Public/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /children’s privacy failures/i.test(r.title)));

  const people = rows.find((r) => (r.docket ?? "") === "jane-q-public");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const redditRow = rows.find((r) => r.docket === "reddit-mpn-20260223" && officialIcoMpnPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(redditRow!), true);
  assert.equal(isPeopleRow(redditRow!), false);
  const press = rows.find((r) => r.docket === "reddit-press");
  assert.equal(isInstitutionOrderRow(press!), false, "press/teaser is not this SKU");

  const redditText = parseIcoMpnText(readFx("reddit-mpn-20260223.txt"), {
    sourceUrl: REDDIT,
    institution: "Reddit, Inc.",
    date: "2026-02-23",
    docket: "reddit-mpn-20260223",
    title: "Monetary Penalty Notice",
  });
  assert.equal(redditText.docket, "reddit-mpn-20260223");
  assert.match(redditText.institution, /Reddit/i);
  assert.equal(redditText.date, "2026-02-23");
  assert.equal(redditText.title, "Monetary Penalty Notice");
  assert.ok(isRealIcoMpnBody(redditText.body));
  assert.ok(redditText.body.includes("548 Market Street"));
  assert.ok(redditText.body.includes("17,573,750"));
  assert.ok(redditText.body.includes("26 September 2025"));
  assert.ok(CARD_FIELDS.every((f) => f in redditText));
  assert.equal(pdfIdFromUrl(redditText.sourceUrl), "reddit-mpn-20260223.pdf");
  assert.equal(redditText.sourceUrl, REDDIT);

  for (const [file, docket, url] of [
    [
      "medialab-20260204.txt",
      "medialab-20260204",
      "https://ico.org.uk/media2/bghpp40j/medialab-penalty-notice-20260204.pdf",
    ],
    [
      "lastpass-uk-ltd.txt",
      "lastpass-uk-ltd",
      "https://ico.org.uk/media2/xfbl1uaa/lastpass-uk-ltd-penalty-notice.pdf",
    ],
    [
      "capita-plc.txt",
      "capita-plc",
      "https://ico.org.uk/media2/pv5nhks4/capita-plc-and-cpsl-monetary-penalty-notice.pdf",
    ],
    [
      "south-staffordshire-plc.txt",
      "south-staffordshire-plc",
      "https://ico.org.uk/media2/xdrfahsw/south-staffordshire-plc-and-south-staffordshire-water-plc-monetary-penalty-notice.pdf",
    ],
  ] as const) {
    const card = parseIcoMpnText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealIcoMpnBody(card.body), `${docket} is official ICO MPN TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialIcoMpnPdfUrl(card.sourceUrl));
  }

  const teaser = parseIcoMpnText(readFx("no-body.txt"), {
    sourceUrl:
      "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/02/reddit-issued-with-1447m-fine-for-children-s-privacy-failures/",
    institution: "Reddit, Inc.",
  });
  assert.equal(isRealIcoMpnBody(teaser.body), false, "press/teaser is not the MPN body");
  assert.ok(!teaser.body.includes("548 Market Street"));
  assert.ok(!teaser.body.includes("17,573,750"));
  assert.ok(!teaser.body.includes("26 September 2025"));

  const peopleBody = parseIcoMpnText(readFx("people.txt"), {
    sourceUrl: REDDIT,
    institution: "Jane Q Public",
  });
  assert.equal(isRealIcoMpnBody(peopleBody.body), false, "people file is not this SKU");

  const fr = parseIcoMpnText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/02/23/2026-99999/reddit",
    institution: "Reddit, Inc.",
  });
  assert.equal(isRealIcoMpnBody(fr.body), false, "Federal Register raw_text is a KILL");

  const air = parseIcoMpnText(readFx("air-letter.txt"), {
    sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf",
    institution: "KAGOME Co., LTD.",
  });
  assert.equal(isRealIcoMpnBody(air.body), false, "AIR /air-letters is not this SKU");

  const ttb = parseIcoMpnText(readFx("ttb-oic.txt"), {
    sourceUrl: "https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
    institution: "The 21st Amendment Brewery Cafe, LLC",
  });
  assert.equal(isRealIcoMpnBody(ttb.body), false, "TTB /ttb-oic is not this SKU");

  const denovo = parseIcoMpnText(readFx("denovo-order.txt"), {
    sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf",
    institution: "Caristo Diagnostics Ltd.",
  });
  assert.equal(isRealIcoMpnBody(denovo.body), false, "De Novo /denovo-orders is not this SKU");

  const fifra = parseIcoMpnText(readFx("fifra-order.txt"), {
    sourceUrl: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/x.pdf",
    institution: "Travel Caddy, Inc. dba Travelon",
  });
  assert.equal(isRealIcoMpnBody(fifra.body), false, "FIFRA /fifra-orders is not this SKU");

  const cftc = parseIcoMpnText(readFx("cftc-order.txt"), {
    sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealIcoMpnBody(cftc.body), false, "CFTC /cftc-orders is not this SKU");

  const superfund = parseIcoMpnText(readFx("superfund-rod.txt"), {
    sourceUrl: "https://semspub.epa.gov/work/05/711427.pdf",
    institution: "Federated Metals Corp. Whiting Superfund Site",
  });
  assert.equal(isRealIcoMpnBody(superfund.body), false, "Superfund /superfund-rods is not this SKU");

  const manifest = buildIcoMpnManifest({
    ok: true,
    product: "ico-institution-mpn-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-02-23",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://ico.org.uk/" },
    cards: [redditText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Reddit/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "reddit-mpn-20260223");
  assert.ok(!manBlob.includes("548 Market Street"), "free manifest must not dump MPN body");
  assert.ok(!manBlob.includes("17,573,750"));
  assert.ok(!manBlob.includes("26 September 2025"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("reddit-mpn-20260223"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "OGL v3.0");
  assert.match(String(manifest.attribution), /Open Government Licence/i);

  const cache = mkdtempSync(join(tmpdir(), "ico-mpn-collect-"));
  const prevDir = process.env.ICO_MPN_DIR;
  process.env.ICO_MPN_DIR = cache;
  try {
    const snap = await collectIcoMpn({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official ICO MPN bodies");
    assert.ok(snap.cards.some((c) => c.docket === "reddit-mpn-20260223" && isRealIcoMpnBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealIcoMpnBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "jane-q-public"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "reddit-press"), "skip press teaser");
    assert.ok(snap.cards.every((c) => officialIcoMpnPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectIcoMpn({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "reddit-mpn-20260223"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.ICO_MPN_DIR;
    else process.env.ICO_MPN_DIR = prevDir;
  }

  console.log("ico-mpn parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
