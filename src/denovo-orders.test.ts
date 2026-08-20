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
  buildDenovoOrdersManifest,
  collectDenovoOrders,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealDenovoOrderBody,
  officialDenovoPdfUrl,
  parseDenovoOrderText,
  parseListingHtml,
  parseListingRows,
  pdfIdFromUrl,
  type DenovoListingRow,
} from "./denovo-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/denovo-orders");
const CARI = "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as DenovoListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official FDA De Novo excerpt lists institution classification orders");
  const cari = listed.find((r) => r.id === "DEN250042");
  assert.ok(cari);
  assert.match(cari?.institution ?? "", /Caristo/i);
  assert.equal(cari?.date, "2026-07-28");
  assert.equal(cari?.sourceUrl, CARI);
  assert.ok(listed.some((r) => r.id === "DEN250033"));
  assert.ok(listed.some((r) => r.id === "DEN240071"));
  assert.ok(listed.some((r) => r.id === "DEN250014"));
  assert.ok(listed.some((r) => r.id === "DEN250012"));
  assert.ok(!listed.some((r) => r.id === "DEN259999"), "skip people");
  assert.ok(listed.every((r) => officialDenovoPdfUrl(r.sourceUrl)));
  assert.equal(officialDenovoPdfUrl(CARI), CARI);
  assert.equal(officialDenovoPdfUrl("https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/x.pdf"), null);
  assert.equal(officialDenovoPdfUrl("https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download"), null);
  assert.equal(officialDenovoPdfUrl("https://www.federalregister.gov/documents/2026/07/29/2026-99999/cari-heart"), null);
  assert.ok(LISTING_URL.includes("accessdata.fda.gov"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "DEN250042"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "DEN250042"));
  assert.ok(htmlListed.some((r) => r.id === "DEN250033"));
  assert.ok(!htmlListed.some((r) => r.id === "DEN259999"));

  const people = rows.find((r) => (r.docket ?? "") === "DEN259999");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const cariRow = rows.find((r) => r.docket === "DEN250042" && officialDenovoPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(cariRow!), true);
  assert.equal(isPeopleRow(cariRow!), false);

  const cariText = parseDenovoOrderText(readFx("DEN250042.txt"), {
    sourceUrl: CARI,
    institution: "Caristo Diagnostics Ltd.",
    date: "2026-07-28",
    docket: "DEN250042",
  });
  assert.equal(cariText.docket, "DEN250042");
  assert.match(cariText.institution, /Caristo/i);
  assert.equal(cariText.date, "2026-07-28");
  assert.equal(cariText.title, "De Novo classification order");
  assert.ok(isRealDenovoOrderBody(cariText.body));
  assert.ok(cariText.body.includes("21 CFR 870.2215"));
  assert.ok(cariText.body.includes("Doc ID# 04017.08.05"));
  assert.ok(cariText.body.includes("adults from 30 to 80 years old"));
  assert.ok(CARD_FIELDS.every((f) => f in cariText));
  assert.equal(pdfIdFromUrl(cariText.sourceUrl), "DEN250042");
  assert.equal(cariText.sourceUrl, CARI);

  for (const [file, docket, url] of [
    ["DEN250033.txt", "DEN250033", "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250033.pdf"],
    ["DEN240071.txt", "DEN240071", "https://www.accessdata.fda.gov/cdrh_docs/pdf24/DEN240071.pdf"],
    ["DEN250014.txt", "DEN250014", "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250014.pdf"],
    ["DEN250012.txt", "DEN250012", "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250012.pdf"],
  ] as const) {
    const card = parseDenovoOrderText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealDenovoOrderBody(card.body), `${docket} is official FDA De Novo classification-order TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialDenovoPdfUrl(card.sourceUrl));
  }

  const teaser = parseDenovoOrderText(readFx("no-body.txt"), {
    sourceUrl: "https://www.fda.gov/news-events/cari-heart-press",
    institution: "Caristo Diagnostics Ltd.",
  });
  assert.equal(isRealDenovoOrderBody(teaser.body), false, "press/teaser is not the order body");

  const peopleBody = parseDenovoOrderText(readFx("people.txt"), {
    sourceUrl: CARI,
    institution: "Jane Q Public",
  });
  assert.equal(isRealDenovoOrderBody(peopleBody.body), false, "people file is not this SKU");

  const fr = parseDenovoOrderText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/07/29/2026-99999/cari-heart",
    institution: "Caristo Diagnostics Ltd.",
  });
  assert.equal(isRealDenovoOrderBody(fr.body), false, "Federal Register raw_text is a KILL");

  const fifra = parseDenovoOrderText(readFx("fifra-order.txt"), {
    sourceUrl: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/x.pdf",
    institution: "Travel Caddy, Inc. dba Travelon",
  });
  assert.equal(isRealDenovoOrderBody(fifra.body), false, "FIFRA /fifra-orders is not this SKU");

  const cftc = parseDenovoOrderText(readFx("cftc-order.txt"), {
    sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealDenovoOrderBody(cftc.body), false, "CFTC /cftc-orders is not this SKU");

  const manifest = buildDenovoOrdersManifest({
    ok: true,
    product: "fda-denovo-classification-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-07-28",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://www.accessdata.fda.gov/" },
    cards: [cariText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Caristo/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "DEN250042");
  assert.ok(!manBlob.includes("21 CFR 870.2215"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("Doc ID# 04017.08.05"));
  assert.ok(!manBlob.includes("adults from 30 to 80 years old"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("DEN250042"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "FDA");

  const cache = mkdtempSync(join(tmpdir(), "denovo-orders-collect-"));
  const prevDir = process.env.DENOVO_ORDERS_DIR;
  process.env.DENOVO_ORDERS_DIR = cache;
  try {
    const snap = await collectDenovoOrders({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official FDA De Novo institution classification-order bodies");
    assert.ok(snap.cards.some((c) => c.docket === "DEN250042" && isRealDenovoOrderBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealDenovoOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "DEN259999"), "skip people");
    assert.ok(snap.cards.every((c) => officialDenovoPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectDenovoOrders({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "DEN250042"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.DENOVO_ORDERS_DIR;
    else process.env.DENOVO_ORDERS_DIR = prevDir;
  }

  console.log("denovo-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
