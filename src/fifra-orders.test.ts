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
  buildFifraOrdersManifest,
  collectFifraOrders,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealFifraOrderBody,
  officialFifraPdfUrl,
  parseFifraOrderText,
  parseListingHtml,
  parseListingRows,
  pdfIdFromUrl,
  type FifraListingRow,
} from "./fifra-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fifra-orders");
const TRAVELON =
  "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/FIFRA-05-2026-0015_CAFO_TravelCaddyIncdbaTravelon_FranklinParkIllinois_14PGS.pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as FifraListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official EPA FIFRA excerpt lists institution order/consent CAFOs");
  const travelon = listed.find((r) => r.id === "FIFRA-05-2026-0015");
  assert.ok(travelon);
  assert.match(travelon?.institution ?? "", /Travelon/i);
  assert.equal(travelon?.date, "2026-07-29");
  assert.equal(travelon?.sourceUrl, TRAVELON);
  assert.ok(listed.some((r) => r.id === "FIFRA-05-2026-0001"));
  assert.ok(listed.some((r) => r.id === "FIFRA-05-2026-0003"));
  assert.ok(listed.some((r) => r.id === "FIFRA-09-2026-0020"));
  assert.ok(listed.some((r) => r.id === "FIFRA-10-2026-0080"));
  assert.ok(!listed.some((r) => r.id === "FIFRA-05-2026-0099"), "skip people");
  assert.ok(listed.every((r) => officialFifraPdfUrl(r.sourceUrl)));
  assert.equal(officialFifraPdfUrl(TRAVELON), TRAVELON);
  assert.equal(officialFifraPdfUrl("https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download"), null);
  assert.equal(officialFifraPdfUrl("https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf"), null);
  assert.equal(officialFifraPdfUrl("https://ofac.treasury.gov/media/936706/download"), null);
  assert.equal(officialFifraPdfUrl("https://www.federalregister.gov/documents/2026/08/03/2026-99999/travelon"), null);
  assert.ok(LISTING_URL.includes("yosemite.epa.gov"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "FIFRA-05-2026-0015"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "FIFRA-05-2026-0015"));
  assert.ok(htmlListed.some((r) => r.id === "FIFRA-09-2026-0020"));
  assert.ok(!htmlListed.some((r) => r.id === "FIFRA-05-2026-0099"));

  const people = rows.find((r) => (r.docket ?? "") === "FIFRA-05-2026-0099");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const travelonRow = rows.find((r) => r.docket === "FIFRA-05-2026-0015" && officialFifraPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(travelonRow!), true);
  assert.equal(isPeopleRow(travelonRow!), false);

  const travelonText = parseFifraOrderText(readFx("FIFRA-05-2026-0015.txt"), {
    sourceUrl: TRAVELON,
    institution: "Travel Caddy, Inc. dba Travelon",
    date: "2026-07-29",
    docket: "FIFRA-05-2026-0015",
  });
  assert.equal(travelonText.docket, "FIFRA-05-2026-0015");
  assert.match(travelonText.institution, /Travelon/i);
  assert.equal(travelonText.date, "2026-07-29");
  assert.equal(travelonText.title, "Consent Agreement and Final Order");
  assert.ok(isRealFifraOrderBody(travelonText.body));
  assert.ok(travelonText.body.includes("11333 Addison Avenue"));
  assert.ok(travelonText.body.includes("Style Numbers 23537, 43541"));
  assert.ok(travelonText.body.includes("Travel Caddy, Inc. doing business as Travelon"));
  assert.ok(CARD_FIELDS.every((f) => f in travelonText));
  assert.equal(pdfIdFromUrl(travelonText.sourceUrl), "F4CB3764E5AB61EA85258E43006880DC");
  assert.equal(travelonText.sourceUrl, TRAVELON);

  for (const [file, docket, url] of [
    [
      "FIFRA-05-2026-0001.txt",
      "FIFRA-05-2026-0001",
      "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/89673C7E7F9F815185258D220041F413/$File/FIFRA-05-2026-0001_CAFO_CrownChemicalInc_CrestwoodIllinois_15PGS.pdf",
    ],
    [
      "FIFRA-05-2026-0003.txt",
      "FIFRA-05-2026-0003",
      "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/3540F23EA19BD66485258D64006DE491/$File/FIFRA-05-2026-0003_CAFO_ParasolMedicalLLC_BuffaloGroveIllinois_15PGS.pdf",
    ],
    [
      "FIFRA-09-2026-0020.txt",
      "FIFRA-09-2026-0020",
      "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/29411C7B446B74E085258D5D006DF909/$File/Garden%20Grove%20Superstore%20Inc.%20(FIFRA-09-2026-0020)%20-%20Filed%20CAFO.pdf",
    ],
    [
      "FIFRA-10-2026-0080.txt",
      "FIFRA-10-2026-0080",
      "https://yosemite.epa.gov/oa/rhc/epaadmin.nsf/Filings/351B0FB7BF85CA3685258DBF006864F9/$File/Nutrien%20Ag%20Consent%20Agreement%20and%20Final%20Order.pdf",
    ],
  ] as const) {
    const card = parseFifraOrderText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealFifraOrderBody(card.body), `${docket} is official EPA FIFRA order TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialFifraPdfUrl(card.sourceUrl));
  }

  const teaser = parseFifraOrderText(readFx("no-body.txt"), {
    sourceUrl: "https://www.epa.gov/enforcement/travelon-press",
    institution: "Travel Caddy, Inc. dba Travelon",
  });
  assert.equal(isRealFifraOrderBody(teaser.body), false, "press/teaser is not the order body");

  const peopleBody = parseFifraOrderText(readFx("people.txt"), {
    sourceUrl: TRAVELON,
    institution: "Jane Q Public",
  });
  assert.equal(isRealFifraOrderBody(peopleBody.body), false, "people file is not this SKU");

  const fr = parseFifraOrderText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/08/03/2026-99999/travelon",
    institution: "Travel Caddy, Inc. dba Travelon",
  });
  assert.equal(isRealFifraOrderBody(fr.body), false, "Federal Register raw_text is a KILL");

  const cftc = parseFifraOrderText(readFx("cftc-order.txt"), {
    sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
    institution: "UBS Financial Services Inc.",
  });
  assert.equal(isRealFifraOrderBody(cftc.body), false, "CFTC /cftc-orders is not this SKU");

  const bis = parseFifraOrderText(readFx("bis-order.txt"), {
    sourceUrl: "https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
    institution: "Coastal PVA Technology, Inc.",
  });
  assert.equal(isRealFifraOrderBody(bis.body), false, "BIS /bis-orders is not this SKU");

  const ofac = parseFifraOrderText(readFx("ofac-order.txt"), {
    sourceUrl: "https://ofac.treasury.gov/media/936706/download",
    institution: "Rice Lake Weighing Systems, Inc.",
  });
  assert.equal(isRealFifraOrderBody(ofac.body), false, "OFAC /ofac-orders is not this SKU");

  const manifest = buildFifraOrdersManifest({
    ok: true,
    product: "fifra-institution-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2026-07-29",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://yosemite.epa.gov/" },
    cards: [travelonText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Travelon/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "FIFRA-05-2026-0015");
  assert.ok(!manBlob.includes("11333 Addison Avenue"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("Style Numbers 23537, 43541"));
  assert.ok(!manBlob.includes("Travel Caddy, Inc. doing business as Travelon"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("FIFRA-05-2026-0015"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "EPA");

  const cache = mkdtempSync(join(tmpdir(), "fifra-orders-collect-"));
  const prevDir = process.env.FIFRA_ORDERS_DIR;
  process.env.FIFRA_ORDERS_DIR = cache;
  try {
    const snap = await collectFifraOrders({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official EPA FIFRA institution order bodies");
    assert.ok(snap.cards.some((c) => c.docket === "FIFRA-05-2026-0015" && isRealFifraOrderBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealFifraOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "FIFRA-05-2026-0099"), "skip people");
    assert.ok(snap.cards.every((c) => officialFifraPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectFifraOrders({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "FIFRA-05-2026-0015"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.FIFRA_ORDERS_DIR;
    else process.env.FIFRA_ORDERS_DIR = prevDir;
  }

  console.log("fifra-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
