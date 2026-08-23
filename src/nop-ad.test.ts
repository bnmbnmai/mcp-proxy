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
  buildNopAdManifest,
  collectNopAd,
  compactForMatch,
  isInstitutionDecisionRow,
  isPeopleRow,
  isRealNopAdBody,
  officialNopAdPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseNopAdText,
  type NopAdListingRow,
} from "./nop-ad.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/nop-ad");
const LEAD =
  "https://www.ams.usda.gov/sites/default/files/media/Decision_APL-014-25%20and%20049-25%20Mapeks%20USA_Redacted.pdf";

const LEAK_NEEDLES = ["diced peaches", "knowingly relabeled", "205.400"];

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

function hasNeedle(text: string, needle: string): boolean {
  return compactForMatch(text).includes(needle);
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as NopAdListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official AMS excerpt lists company/institution Administrator Decisions");
  const lead = listed.find((r) => r.id === "mapeks-apl-014-25");
  assert.ok(lead);
  assert.match(lead?.institution ?? "", /Mapeks USA, LLC/i);
  assert.equal(lead?.date, "2026-07-30");
  assert.equal(lead?.docket, "APL-014-25");
  assert.equal(lead?.sourceUrl, LEAD);
  assert.ok(listed.some((r) => r.id === "fruticola-olmos-apl-040-24"));
  assert.ok(listed.some((r) => r.id === "la-bonita-apl-047-24"));
  assert.ok(listed.some((r) => r.id === "buck-n-bird-apl-066-24"));
  assert.ok(listed.some((r) => r.id === "sunshine-farms-apl-090-24"));
  assert.ok(!listed.some((r) => r.id === "teresa-payne-person"), "skip people");
  assert.ok(!listed.some((r) => r.id === "mapeks-settlement-html"), "skip settlements HTML");
  assert.ok(!listed.some((r) => r.id === "oid-directory"), "skip OID directory");
  assert.ok(!listed.some((r) => r.id === "awa-inspection"), "skip /awa");
  assert.ok(!listed.some((r) => r.id === "fsis-hmsa"), "skip /fsis-hmsa");
  assert.ok(!listed.some((r) => r.id === "doe-nov"), "skip /doe-nov");
  assert.ok(!listed.some((r) => r.id === "govuk-ssr"), "skip GOV.UK service_standard_report");
  assert.ok(listed.every((r) => officialNopAdPdfUrl(r.sourceUrl)));
  assert.equal(officialNopAdPdfUrl(LEAD), LEAD);
  assert.equal(officialNopAdPdfUrl("https://www.ams.usda.gov/services/enforcement/organic/settlements/mapeks"), null);
  assert.equal(officialNopAdPdfUrl("https://organic.ams.usda.gov/integrity/Home"), null);
  assert.equal(officialNopAdPdfUrl("https://www.fsis.usda.gov/sites/default/files/media_file/documents/M1-NOIE-01012026.pdf"), null);
  assert.equal(
    officialNopAdPdfUrl(
      "https://www.energy.gov/sites/default/files/2026-01/Final%20Notice%20of%20Violation%2C%20Mid-America%20Conversion%20Services%2C%20LLC.pdf",
    ),
    null,
  );
  assert.equal(officialNopAdPdfUrl("https://www.gov.uk/service-standard-reports/example"), null);
  assert.ok(LISTING_URL.includes("ams-decisions"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.id === "mapeks-apl-014-25"));
  assert.match(WGET_SAFARI_UA, /Safari/);

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "mapeks-apl-014-25"));
  assert.ok(htmlListed.some((r) => /Mapeks USA/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => r.id === "buck-n-bird-apl-066-24"));
  assert.ok(htmlListed.some((r) => r.id === "sunshine-farms-apl-090-24"));
  assert.ok(!htmlListed.some((r) => /teresa payne/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /organic\.ams\.usda\.gov/i.test(r.sourceUrl)));
  assert.ok(!htmlListed.some((r) => /settlements/i.test(r.sourceUrl)));

  const people = rows.find((r) => (r.id ?? "") === "teresa-payne-person");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionDecisionRow(people!), false);
  const leadRow = rows.find((r) => r.id === "mapeks-apl-014-25" && officialNopAdPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionDecisionRow(leadRow!), true);
  assert.equal(isPeopleRow(leadRow!), false);
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "mapeks-settlement-html")!), false, "settlements HTML is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "oid-directory")!), false, "OID is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "awa-inspection")!), false, "/awa is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "fsis-hmsa")!), false, "/fsis-hmsa is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "doe-nov")!), false, "/doe-nov is a KILL");
  assert.equal(isInstitutionDecisionRow(rows.find((r) => r.id === "govuk-ssr")!), false, "GOV.UK SSR is a KILL");

  const leadText = parseNopAdText(readFx("mapeks-apl-014-25.txt"), {
    sourceUrl: LEAD,
    institution: "Mapeks USA, LLC dba Mac Global",
    date: "2026-07-30",
    id: "mapeks-apl-014-25",
    docket: "APL-014-25",
    title: "Administrator's Decision",
  });
  assert.equal(leadText.id, "mapeks-apl-014-25");
  assert.match(leadText.institution, /Mapeks USA, LLC/i);
  assert.equal(leadText.date, "2026-07-30");
  assert.equal(leadText.docket, "APL-014-25");
  assert.ok(isRealNopAdBody(leadText.body));
  for (const needle of LEAK_NEEDLES) {
    assert.ok(hasNeedle(leadText.body, needle), `Mapeks APL-014-25 contains ${needle}`);
  }
  assert.ok(CARD_FIELDS.every((f) => f in leadText));
  assert.equal(leadText.sourceUrl, LEAD);

  for (const [file, id, url] of [
    [
      "fruticola-olmos-apl-040-24.txt",
      "fruticola-olmos-apl-040-24",
      "https://www.ams.usda.gov/sites/default/files/media/DecisionAPL-040-24_FruticolaOlmos_508.pdf",
    ],
    [
      "la-bonita-apl-047-24.txt",
      "la-bonita-apl-047-24",
      "https://www.ams.usda.gov/sites/default/files/media/DecisionLaBonitaAPL-047-245-2-25_Redacted_508.pdf",
    ],
    [
      "buck-n-bird-apl-066-24.txt",
      "buck-n-bird-apl-066-24",
      "https://www.ams.usda.gov/sites/default/files/media/DecisionAPL-066-24_BuckNBird_508.pdf",
    ],
    [
      "sunshine-farms-apl-090-24.txt",
      "sunshine-farms-apl-090-24",
      "https://www.ams.usda.gov/sites/default/files/media/NOPADSunshine32025_Redacted_508.pdf",
    ],
  ] as const) {
    const card = parseNopAdText(readFx(file), { sourceUrl: url, id });
    assert.ok(isRealNopAdBody(card.body), `${id} is official AMS NOP Administrator Decision TEXT`);
    assert.equal(card.id, id);
    assert.ok(officialNopAdPdfUrl(card.sourceUrl));
  }

  const teaserBody = parseNopAdText(readFx("no-body.txt"), {
    sourceUrl: LISTING_URL,
    institution: "Mapeks USA, LLC",
  });
  assert.equal(isRealNopAdBody(teaserBody.body), false, "listing/OID teaser is not the decision body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(teaserBody.body, needle), `teaser must not contain ${needle}`);
  }
  assert.ok(teaserBody.body.includes("APL-014-25"), "index may show the APL");

  const settlementBody = parseNopAdText(readFx("settlements.txt"), {
    sourceUrl: "https://www.ams.usda.gov/services/enforcement/organic/settlements/mapeks",
    institution: "Mapeks USA, LLC",
  });
  assert.equal(isRealNopAdBody(settlementBody.body), false, "settlements HTML is not the sold body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(settlementBody.body, needle), `settlement HTML must not contain ${needle}`);
  }

  const peopleBody = parseNopAdText(readFx("people.txt"), {
    sourceUrl: LEAD,
    institution: "Teresa Payne",
  });
  assert.equal(isRealNopAdBody(peopleBody.body), false, "people file is not this SKU");

  assert.equal(
    isRealNopAdBody(
      parseNopAdText(readFx("oid.txt"), {
        sourceUrl: "https://organic.ams.usda.gov/integrity/Home",
        institution: "Mapeks USA, LLC",
      }).body,
    ),
    false,
    "OID directory is a KILL",
  );
  assert.equal(
    isRealNopAdBody(
      parseNopAdText(readFx("awa.txt"), {
        sourceUrl: "https://www.aphis.usda.gov/animal_welfare/downloads/awa/example.pdf",
        institution: "Example Exhibitor LLC",
      }).body,
    ),
    false,
    "/awa is a KILL",
  );
  assert.equal(
    isRealNopAdBody(
      parseNopAdText(readFx("fsis-hmsa.txt"), {
        sourceUrl: "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M1-NOIE-01012026.pdf",
        institution: "Example Packing LLC",
      }).body,
    ),
    false,
    "/fsis-hmsa is a KILL",
  );
  assert.equal(
    isRealNopAdBody(
      parseNopAdText(readFx("doe-nov.txt"), {
        sourceUrl:
          "https://www.energy.gov/sites/default/files/2026-01/Final%20Notice%20of%20Violation%2C%20Mid-America%20Conversion%20Services%2C%20LLC.pdf",
        institution: "Mid-America Conversion Services, LLC",
      }).body,
    ),
    false,
    "/doe-nov is a KILL",
  );
  assert.equal(
    isRealNopAdBody(
      parseNopAdText(readFx("service-standard-report.txt"), {
        sourceUrl: "https://www.gov.uk/service-standard-reports/example",
        institution: "Example Department",
      }).body,
    ),
    false,
    "GOV.UK service_standard_report is a KILL",
  );

  const manifest = buildNopAdManifest({
    ok: true,
    product: "nop-ad-decision-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-07-30",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      pdfHost: "https://www.ams.usda.gov/sites/default/files/media/",
      privacy: "https://www.ams.usda.gov/about-ams/privacy",
    },
    cards: [leadText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Mapeks USA, LLC/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "APL-014-25");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!manBlob.includes(needle), `free manifest must not dump ${needle}`);
  }
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("mapeks-apl-014-25"));
  assert.ok(manBlob.includes("APL-014-25"), "APL may appear on the card");
  assert.equal(manifest.priceUsdc, "0.05");
  assert.match(String(manifest.license), /17 U\.S\.C\. § 105/i);
  assert.match(String(manifest.attribution), /public information/i);
  assert.match(String(manifest.attribution), /may be distributed or copied/i);
  assert.ok(!/CC BY-NC|Creative Commons.*NonCommercial/i.test(String(manifest.license) + String(manifest.attribution)));

  const cache = mkdtempSync(join(tmpdir(), "nop-ad-collect-"));
  const prevDir = process.env.NOP_AD_DIR;
  process.env.NOP_AD_DIR = cache;
  try {
    const snap = await collectNopAd({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official AMS NOP bodies");
    assert.ok(snap.cards.some((c) => c.id === "mapeks-apl-014-25" && isRealNopAdBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealNopAdBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "teresa-payne-person"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "mapeks-settlement-html"), "skip settlements HTML");
    assert.ok(snap.cards.every((c) => officialNopAdPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectNopAd({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === "mapeks-apl-014-25"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.NOP_AD_DIR;
    else process.env.NOP_AD_DIR = prevDir;
  }

  console.log("nop-ad parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
