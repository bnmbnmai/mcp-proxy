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
  buildFmcOrdersManifest,
  collectFmcOrders,
  compactForMatch,
  isInstitutionOrderRow,
  isPeopleRow,
  isRealFmcOrderBody,
  officialFmcOrdersPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseFmcOrdersText,
  pdfIdFromUrl,
  type FmcOrdersListingRow,
} from "./fmc-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fmc-orders");
const MSC =
  "https://www2.fmc.gov/readingroom/docs/23-08/(32)%2023-08%20Order%20on%20Initial%20Decision%20(public).pdf/";

const LEAK_NEEDLES = ["2,629", "Jarkesy", "Descartes", "22,670,000"];

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

function hasNeedle(text: string, needle: string): boolean {
  return compactForMatch(text).includes(needle);
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as FmcOrdersListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official FMC excerpt lists company orders");
  const msc = listed.find((r) => r.id === "msc-23-08");
  assert.ok(msc);
  assert.match(msc?.institution ?? "", /MSC Mediterranean Shipping Company S\.A\./i);
  assert.equal(msc?.date, "2026-01-06");
  assert.equal(msc?.proceeding, "23-08");
  assert.equal(msc?.sourceUrl, MSC);
  assert.ok(listed.some((r) => r.id === "oocl-23-02"));
  assert.ok(listed.some((r) => r.id === "hapag-cc-002"));
  assert.ok(listed.some((r) => r.id === "yang-ming-24-10"));
  assert.ok(listed.some((r) => r.id === "wsc-25-10"));
  assert.ok(!listed.some((r) => r.id === "jane-smith-person"), "skip people");
  assert.ok(!listed.some((r) => r.id === "press-html"), "skip press HTML");
  assert.ok(!listed.some((r) => r.id === "fmc2d-compilation"), "skip F.M.C.2d compilations");
  assert.ok(!listed.some((r) => r.id === "fr-oih-2023"), "skip 2023 FR OIH notice");
  assert.ok(!listed.some((r) => r.id === "mariners-lnm"), "skip /mariners LNM");
  assert.ok(!listed.some((r) => r.id === "phmsa-cop"), "skip PHMSA COP");
  assert.ok(!listed.some((r) => r.id === "catalog-data-gov"), "skip catalog.data.gov");
  assert.ok(listed.every((r) => officialFmcOrdersPdfUrl(r.sourceUrl)));
  assert.equal(officialFmcOrdersPdfUrl(MSC), MSC);
  assert.equal(officialFmcOrdersPdfUrl("https://www.fmc.gov/articles/msc-assessed-civil-penalties-totaling-22-67-million/"), null);
  assert.equal(officialFmcOrdersPdfUrl("https://www2.fmc.gov/readingroom/docs/FMC2d/FMC2d-2024-compilation.pdf/"), null);
  assert.equal(officialFmcOrdersPdfUrl("https://www.federalregister.gov/documents/2023/11/01/2023-oih-notice"), null);
  assert.equal(officialFmcOrdersPdfUrl("https://www.navcen.uscg.gov/sites/default/files/pdf/lnm/lnm13322026.pdf"), null);
  assert.equal(
    officialFmcOrdersPdfUrl(
      "https://primis.phmsa.dot.gov/enforcement-documents/12025033NOPV/12025033NOPV_Consent%20Agreement%20and%20Order_04212026_(22-259271).pdf",
    ),
    null,
  );
  assert.equal(officialFmcOrdersPdfUrl("https://catalog.data.gov/dataset/fmc-orders"), null);
  assert.ok(LISTING_URL.includes("www2.fmc.gov/readingroom"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "msc-23-08"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "msc-23-08"));
  assert.ok(htmlListed.some((r) => /MSC Mediterranean Shipping/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /Hapag-Lloyd/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /press/i.test(r.title)));
  assert.ok(!htmlListed.some((r) => /compilation/i.test(r.title)));

  const people = rows.find((r) => (r.docket ?? "") === "jane-smith-person");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionOrderRow(people!), false);
  const mscRow = rows.find((r) => r.docket === "msc-23-08" && officialFmcOrdersPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionOrderRow(mscRow!), true);
  assert.equal(isPeopleRow(mscRow!), false);
  const press = rows.find((r) => r.docket === "press-html");
  assert.equal(isInstitutionOrderRow(press!), false, "press HTML is not this SKU");
  const compilation = rows.find((r) => r.docket === "fmc2d-compilation");
  assert.equal(isInstitutionOrderRow(compilation!), false, "F.M.C.2d compilation is a KILL");

  const mscText = parseFmcOrdersText(readFx("msc-23-08.txt"), {
    sourceUrl: MSC,
    institution: "MSC Mediterranean Shipping Company S.A.",
    date: "2026-01-06",
    docket: "msc-23-08",
    proceeding: "23-08",
    title: "Order on Initial Decision",
  });
  assert.equal(mscText.docket, "msc-23-08");
  assert.match(mscText.institution, /MSC Mediterranean Shipping Company S\.A\./i);
  assert.equal(mscText.date, "2026-01-06");
  assert.equal(mscText.proceeding, "23-08");
  assert.equal(mscText.title, "Order on Initial Decision");
  assert.ok(isRealFmcOrderBody(mscText.body));
  for (const needle of LEAK_NEEDLES) {
    assert.ok(hasNeedle(mscText.body, needle), `23-08 order contains ${needle}`);
  }
  assert.ok(CARD_FIELDS.every((f) => f in mscText));
  assert.equal(pdfIdFromUrl(mscText.sourceUrl), "(32) 23-08 Order on Initial Decision (public).pdf");
  assert.equal(mscText.sourceUrl, MSC);

  for (const [file, docket, url] of [
    [
      "oocl-23-02.txt",
      "oocl-23-02",
      "https://www2.fmc.gov/readingroom/docs/23-02/(143)%2023-02%20Initial%20Decision%20(public%20version).pdf/",
    ],
    [
      "hapag-cc-002.txt",
      "hapag-cc-002",
      "https://www2.fmc.gov/readingroom/docs/CC-002/(01)%20CC-002%20Order%20Directing%20Hapag-Lloyd%20AG%20to%20Show%20Cause%20(public).pdf/",
    ],
    [
      "yang-ming-24-10.txt",
      "yang-ming-24-10",
      "https://www2.fmc.gov/readingroom/docs/24-10/(35)%2024-10%20Initial%20Decision.pdf/",
    ],
    [
      "wsc-25-10.txt",
      "wsc-25-10",
      "https://www2.fmc.gov/readingroom/docs/25-10/(01)%2025-10%20Order%20to%20Show%20Cause%20on%20WSC%20Agreement(Public).pdf/",
    ],
  ] as const) {
    const card = parseFmcOrdersText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealFmcOrderBody(card.body), `${docket} is official FMC order TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialFmcOrdersPdfUrl(card.sourceUrl));
  }

  const teaserBody = parseFmcOrdersText(readFx("no-body.txt"), {
    sourceUrl: "https://www.fmc.gov/articles/msc-assessed-civil-penalties-totaling-22-67-million/",
    institution: "MSC Mediterranean Shipping Company S.A.",
  });
  assert.equal(isRealFmcOrderBody(teaserBody.body), false, "card teaser is not the order body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(teaserBody.body, needle), `teaser must not contain ${needle}`);
  }

  const peopleBody = parseFmcOrdersText(readFx("people.txt"), {
    sourceUrl: MSC,
    institution: "Jane Smith",
  });
  assert.equal(isRealFmcOrderBody(peopleBody.body), false, "people file is not this SKU");

  const pressBody = parseFmcOrdersText(readFx("press.txt"), {
    sourceUrl: "https://www.fmc.gov/articles/msc-assessed-civil-penalties-totaling-22-67-million/",
    institution: "MSC Mediterranean Shipping Company S.A.",
  });
  assert.equal(isRealFmcOrderBody(pressBody.body), false, "press HTML is a KILL");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(pressBody.body, needle), `press teaser must not contain ${needle}`);
  }

  const compilationBody = parseFmcOrdersText(readFx("fmc2d.txt"), {
    sourceUrl: "https://www2.fmc.gov/readingroom/docs/FMC2d/FMC2d-2024-compilation.pdf/",
    institution: "MSC Mediterranean Shipping Company S.A.",
  });
  assert.equal(isRealFmcOrderBody(compilationBody.body), false, "F.M.C.2d compilation is a KILL");

  const frOih = parseFmcOrdersText(readFx("fr-oih.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2023/11/01/2023-oih-notice",
    institution: "MSC Mediterranean Shipping Company S.A.",
  });
  assert.equal(isRealFmcOrderBody(frOih.body), false, "2023 FR OIH notice is a KILL");

  const mariners = parseFmcOrdersText(readFx("mariners.txt"), {
    sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnm/lnm13322026.pdf",
    institution: "U.S. Coast Guard",
  });
  assert.equal(isRealFmcOrderBody(mariners.body), false, "/mariners LNM is a KILL");

  const phmsa = parseFmcOrdersText(readFx("phmsa-cop.txt"), {
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/12025033NOPV/12025033NOPV_Consent%20Agreement%20and%20Order_04212026_(22-259271).pdf",
    institution: "EQT Production Company",
  });
  assert.equal(isRealFmcOrderBody(phmsa.body), false, "PHMSA /phmsa-cop is not this SKU");

  const fr = parseFmcOrdersText(readFx("federal-register.txt"), {
    sourceUrl: "https://www.federalregister.gov/documents/2026/01/01/fmc-wrap",
    institution: "MSC Mediterranean Shipping Company S.A.",
  });
  assert.equal(isRealFmcOrderBody(fr.body), false, "FR wrap is a KILL");

  const catalog = parseFmcOrdersText(readFx("catalog-data-gov.txt"), {
    sourceUrl: "https://catalog.data.gov/dataset/fmc-orders",
    institution: "MSC Mediterranean Shipping Company S.A.",
  });
  assert.equal(isRealFmcOrderBody(catalog.body), false, "catalog.data.gov is a KILL");

  const ico = parseFmcOrdersText(readFx("ico-mpn.txt"), {
    sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
    institution: "Reddit, Inc.",
  });
  assert.equal(isRealFmcOrderBody(ico.body), false, "ICO /ico-mpn is not this SKU");

  const ipo = parseFmcOrdersText(readFx("ipo-tm.txt"), {
    sourceUrl: "https://www.ipo.gov.uk/t-challenge-decision-results/o071326.pdf",
    institution: "Roadget Business Pte. Ltd",
  });
  assert.equal(isRealFmcOrderBody(ipo.body), false, "IPO /ipo-tm is not this SKU");

  const manifest = buildFmcOrdersManifest({
    ok: true,
    product: "fmc-institution-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-04-24",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://www2.fmc.gov/readingroom/" },
    cards: [mscText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /MSC Mediterranean Shipping/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "msc-23-08");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!manBlob.includes(needle), `free manifest must not dump ${needle}`);
  }
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("msc-23-08"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 U.S.C. § 105");
  assert.match(String(manifest.attribution), /17 U\.S\.C\. § 105/);

  const cache = mkdtempSync(join(tmpdir(), "fmc-orders-collect-"));
  const prevDir = process.env.FMC_ORDERS_DIR;
  process.env.FMC_ORDERS_DIR = cache;
  try {
    const snap = await collectFmcOrders({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official FMC order bodies");
    assert.ok(snap.cards.some((c) => c.docket === "msc-23-08" && isRealFmcOrderBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealFmcOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "jane-smith-person"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "press-html"), "skip press");
    assert.ok(snap.cards.every((c) => officialFmcOrdersPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectFmcOrders({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "msc-23-08"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.FMC_ORDERS_DIR;
    else process.env.FMC_ORDERS_DIR = prevDir;
  }

  console.log("fmc-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
