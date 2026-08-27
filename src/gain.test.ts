import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  ATTRIBUTION,
  CARD_FIELDS,
  HUB_URL,
  LICENSE,
  SEED_LISTINGS,
  buildGainManifest,
  collectGain,
  filenamePdfUrl,
  isOfficialGainPdf,
  isRealGainBody,
  officialGainPdfUrl,
  parseGainText,
  parseHubHtml,
  parseListingRows,
} from "./gain.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/gain");

const MX_LIV = filenamePdfUrl("Livestock and Products Annual_Mexico City_Mexico_MX2026-0040.pdf");
const CH_POULTRY = filenamePdfUrl(
  "Poultry and Products Annual_Beijing_China - People's Republic of_CH2026-0087.pdf",
);
const CA_OIL = filenamePdfUrl("Oilseeds and Products Annual_Ottawa_Canada_CA2026-0008.pdf");
const EU_GRAIN = filenamePdfUrl("Grain and Feed Annual_Madrid_European Union_E42026-0034.pdf");
const VM_GRAIN = filenamePdfUrl("Grain and Feed Annual_Ho Chi Minh City_Vietnam_VM2026-0012.pdf");
const AR_OIL = filenamePdfUrl("Oilseeds and Products Annual_Buenos Aires_Argentina_AR2026-0005.pdf");
const TU_GRAIN = filenamePdfUrl("Grain and Feed Annual_Ankara_Turkiye_TU2026-0013.pdf");
const CA_LIV = filenamePdfUrl("Livestock and Products Semi-Annual_Ottawa_Canada_CA2026-0006.pdf");
const HUNT_CHEESE = "https://gain.fas.usda.gov/Download.aspx?p=2702&q=2e483a59-f4cc-4c33-871f-7b4093ae72e2";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listing = parseHubHtml(readFx("listing-excerpt.html"), HUB_URL);
  assert.equal(listing.length, 8, "first slice is the eight official attaché PDFs");
  assert.ok(listing.some((r) => r.id === "MX2026-0040"));
  assert.ok(listing.some((r) => r.id === "CH2026-0087"));
  assert.ok(listing.some((r) => r.id === "CA2026-0008"));
  assert.ok(listing.some((r) => r.id === "E42026-0034"));
  assert.ok(listing.some((r) => r.id === "VM2026-0012"));
  assert.ok(listing.some((r) => r.id === "AR2026-0005"));
  assert.ok(listing.some((r) => r.id === "TU2026-0013"));
  assert.ok(listing.some((r) => r.id === "CA2026-0006"));
  assert.ok(listing.every((r) => officialGainPdfUrl(r.sourceUrl)));
  assert.equal(
    listing.some((r) => /gats|psdonline|wasde|esrquery|opendataweb/i.test(r.sourceUrl)),
    false,
    "skip WASDE/PSD/ESR/GATS wraps",
  );

  const listed = parseListingRows(SEED_LISTINGS);
  assert.equal(listed.length, 8, "seed lists the eight official GAIN attaché PDFs");
  assert.ok(listed.every((r) => officialGainPdfUrl(r.sourceUrl)));
  assert.equal(officialGainPdfUrl(MX_LIV), MX_LIV);
  assert.equal(officialGainPdfUrl(HUNT_CHEESE), HUNT_CHEESE, "Download.aspx with p+q is an official PDF URL");
  assert.equal(
    officialGainPdfUrl("https://gain.fas.usda.gov/"),
    null,
    "public search HTML is the index, not the sold PDF",
  );
  assert.equal(officialGainPdfUrl("https://apps.fas.usda.gov/opendataweb/home"), null);
  assert.equal(officialGainPdfUrl("https://apps.fas.usda.gov/newgainapi/token"), null);
  assert.equal(officialGainPdfUrl("https://apps.fas.usda.gov/newgainapi/api/Report/GetRecentReports"), null);
  assert.equal(officialGainPdfUrl("https://apps.fas.usda.gov/psdonline/circulars/livestock_poultry.PDF"), null);
  assert.equal(officialGainPdfUrl("https://apps.fas.usda.gov/GATS/default.aspx"), null);
  assert.ok(isOfficialGainPdf(EU_GRAIN));
  assert.ok(HUB_URL.includes("gain.fas.usda.gov"));

  const mexico = parseGainText(readFx("MX2026-0040.txt"), {
    sourceUrl: MX_LIV,
    pageUrl: "https://www.fas.usda.gov/data/gain/2026/08/mexico-livestock-and-products-annual",
    country: "Mexico",
    post: "Mexico City",
    date: "2026-08-24",
    category: "Livestock and Products",
    id: "MX2026-0040",
    reportNumber: "MX2026-0040",
    title: "Livestock and Products Annual",
  });
  assert.equal(mexico.id, "MX2026-0040");
  assert.ok(isRealGainBody(mexico.body));
  assert.ok(mexico.body.includes("New World screwworm"));
  assert.ok(mexico.body.includes("Gustavo Lara"));
  assert.ok(CARD_FIELDS.every((f) => f in mexico));

  const china = parseGainText(readFx("CH2026-0087.txt"), {
    sourceUrl: CH_POULTRY,
    country: "China - People's Republic of",
    post: "Beijing",
    date: "2026-07-13",
    category: "Poultry and Products",
    id: "CH2026-0087",
    reportNumber: "CH2026-0087",
  });
  assert.ok(isRealGainBody(china.body));
  assert.ok(china.body.includes("546,000 MT"));
  assert.ok(china.body.includes("17 U.S. states"));

  const canadaOil = parseGainText(readFx("CA2026-0008.txt"), {
    sourceUrl: CA_OIL,
    country: "Canada",
    date: "2026-04-23",
    category: "Oilseeds and Products",
    id: "CA2026-0008",
  });
  assert.ok(isRealGainBody(canadaOil.body));
  assert.ok(canadaOil.body.includes("5.9 percent"));
  assert.ok(canadaOil.body.includes("27.55 million metric tons"));

  const euGrain = parseGainText(readFx("E42026-0034.txt"), {
    sourceUrl: EU_GRAIN,
    country: "European Union",
    date: "2026-04-20",
    category: "Grain and Feed",
    id: "E42026-0034",
  });
  assert.ok(isRealGainBody(euGrain.body));
  assert.ok(euGrain.body.includes("intra EU trade"));
  assert.ok(euGrain.body.includes("277.2 million MT"));

  const vnGrain = parseGainText(readFx("VM2026-0012.txt"), {
    sourceUrl: VM_GRAIN,
    country: "Vietnam",
    date: "2026-04-15",
    category: "Grain and Feed",
    id: "VM2026-0012",
  });
  assert.ok(isRealGainBody(vnGrain.body));
  assert.ok(vnGrain.body.includes("Loc Nguyen"));
  assert.ok(vnGrain.body.includes("Less expensive feed wheat from Brazil and Ukraine"));

  const arOil = parseGainText(readFx("AR2026-0005.txt"), {
    sourceUrl: AR_OIL,
    country: "Argentina",
    date: "2026-04-09",
    category: "Oilseeds and Products",
    id: "AR2026-0005",
  });
  assert.ok(isRealGainBody(arOil.body));
  assert.ok(arOil.body.includes("3.3 million hectares"));

  const tuGrain = parseGainText(readFx("TU2026-0013.txt"), {
    sourceUrl: TU_GRAIN,
    country: "Turkiye",
    date: "2026-04-08",
    category: "Grain and Feed",
    id: "TU2026-0013",
  });
  assert.ok(isRealGainBody(tuGrain.body));
  assert.ok(tuGrain.body.includes("Turkish Grain Board"));

  const canadaLiv = parseGainText(readFx("CA2026-0006.txt"), {
    sourceUrl: CA_LIV,
    country: "Canada",
    date: "2026-04-01",
    category: "Livestock and Products",
    id: "CA2026-0006",
  });
  assert.ok(isRealGainBody(canadaLiv.body));
  assert.ok(canadaLiv.body.includes("consolidation phase"));

  const teaser = parseGainText(readFx("teaser.txt"), { sourceUrl: MX_LIV, country: "Mexico" });
  assert.equal(isRealGainBody(teaser.body), false, "public search HTML is not the report body");
  assert.ok(!teaser.body.includes("New World screwworm"));
  assert.ok(!teaser.body.includes("Gustavo Lara"));

  const gats = parseGainText(readFx("gats-wrap.txt"), { sourceUrl: MX_LIV, country: "Mexico" });
  assert.equal(isRealGainBody(gats.body), false, "GATS numbers are not this SKU");

  const psd = parseGainText(readFx("psd-wrap.txt"), { sourceUrl: MX_LIV, country: "Mexico" });
  assert.equal(isRealGainBody(psd.body), false, "PSD circular is not this SKU");

  const wasde = parseGainText(readFx("wasde.txt"), { sourceUrl: MX_LIV, country: "Mexico" });
  assert.equal(isRealGainBody(wasde.body), false, "WASDE is not this SKU");

  const news = parseGainText(readFx("news.txt"), { sourceUrl: MX_LIV, country: "Mexico" });
  assert.equal(isRealGainBody(news.body), false, "news/GDELT is not this SKU");

  const cards = [mexico, china, canadaOil, euGrain, vnGrain, arOil, tuGrain, canadaLiv];
  const manifest = buildGainManifest({
    ok: true,
    product: "gain-attache-report-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-27T00:00:00.000Z",
    asOf: "2026-08-24",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      index: HUB_URL,
      pdfHost: "https://gain.fas.usda.gov/Download.aspx",
      schedule: "https://gain.fas.usda.gov/assets/GAIN%20Report%20Schedule.pdf",
    },
    cards,
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 8);
  assert.equal((manifest.cards as { id: string }[])[0]?.id, "MX2026-0040");
  assert.ok(!manBlob.includes("New World screwworm"), "free manifest must not dump attaché body");
  assert.ok(!manBlob.includes("Gustavo Lara"));
  assert.ok(!manBlob.includes("546,000 MT"));
  assert.ok(!manBlob.includes("277.2 million MT"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.match(String(manifest.attribution), /17 U\.S\.C\. § 105/);

  const cache = mkdtempSync(join(tmpdir(), "gain-collect-"));
  const prevDir = process.env.GAIN_DIR;
  process.env.GAIN_DIR = cache;
  try {
    const snap = await collectGain({ htmlDir: fixtures, limit: 8, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.equal(snap.cards.length, 8, "first slice harvests the eight official bodies");
    assert.equal(snap.asOf, "2026-08-24");
    assert.ok(snap.cards.some((c) => c.id === "MX2026-0040" && isRealGainBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === "CH2026-0087" && isRealGainBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === "CA2026-0008" && isRealGainBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === "E42026-0034" && isRealGainBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === "VM2026-0012" && isRealGainBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === "AR2026-0005" && isRealGainBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === "TU2026-0013" && isRealGainBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === "CA2026-0006" && isRealGainBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealGainBody(c.body)));
    assert.ok(snap.cards.every((c) => officialGainPdfUrl(c.sourceUrl)));
    assert.ok(snap.cards.some((c) => c.category === "Grain and Feed"));
    assert.ok(snap.cards.some((c) => c.category === "Livestock and Products"));
    assert.ok(snap.cards.some((c) => c.category === "Poultry and Products"));
    assert.ok(snap.cards.some((c) => c.category === "Oilseeds and Products"));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectGain({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === "MX2026-0040"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 8);
  } finally {
    if (prevDir === undefined) delete process.env.GAIN_DIR;
    else process.env.GAIN_DIR = prevDir;
  }

  console.log("gain parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
