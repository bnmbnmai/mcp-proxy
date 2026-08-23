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
  buildDoeNovManifest,
  collectDoeNov,
  compactForMatch,
  isInstitutionNovRow,
  isPeopleRow,
  isRealDoeNovBody,
  officialDoeNovPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseDoeNovText,
  type DoeNovListingRow,
} from "./doe-nov.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/doe-nov");
const LEAD =
  "https://www.energy.gov/sites/default/files/2026-01/Final%20Notice%20of%20Violation%2C%20Mid-America%20Conversion%20Services%2C%20LLC.pdf";

const LEAK_NEEDLES = ["$131,000", "830.122", "crane X-0-CHS-CN-002"];

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

function hasNeedle(text: string, needle: string): boolean {
  return compactForMatch(text).includes(needle);
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as DoeNovListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official DOE excerpt lists company/institution FNOV/PNOV/letters");
  const lead = listed.find((r) => r.id === "nea-2026-01-mcs");
  assert.ok(lead);
  assert.match(lead?.institution ?? "", /Mid-America Conversion Services, LLC/i);
  assert.equal(lead?.date, "2026-01-15");
  assert.equal(lead?.docket, "NEA-2026-01");
  assert.equal(lead?.sourceUrl, LEAD);
  assert.ok(listed.some((r) => r.id === "wea-2024-04-harris"));
  assert.ok(listed.some((r) => r.id === "wea-2025-01-mcs"));
  assert.ok(listed.some((r) => r.id === "wel-2026-01-triad"));
  assert.ok(listed.some((r) => r.id === "wea-2025-03-engert"));
  assert.ok(!listed.some((r) => r.id === "jane-smith-person"), "skip people");
  assert.ok(!listed.some((r) => r.id === "mcs-press"), "skip press");
  assert.ok(!listed.some((r) => r.id === "mcs-article"), "skip article teasers");
  assert.ok(!listed.some((r) => r.id === "nrc-ea"), "skip NRC");
  assert.ok(!listed.some((r) => r.id === "csb-reports"), "skip /csb-reports");
  assert.ok(!listed.some((r) => r.id === "waterboards-acl"), "skip /waterboards-acl");
  assert.ok(!listed.some((r) => r.id === "atsdr-hc"), "skip /atsdr-hc");
  assert.ok(!listed.some((r) => r.id === "fsis-hmsa"), "skip /fsis-hmsa");
  assert.ok(!listed.some((r) => r.id === "health-canada"), "skip Health Canada");
  assert.ok(listed.every((r) => officialDoeNovPdfUrl(r.sourceUrl)));
  assert.equal(officialDoeNovPdfUrl(LEAD), LEAD);
  assert.equal(
    officialDoeNovPdfUrl("https://www.energy.gov/ea/articles/final-notice-violation-mid-america-conversion-services-llc-january-2026"),
    null,
  );
  assert.equal(
    officialDoeNovPdfUrl("https://www.energy.gov/sites/default/files/2026-01/DOE%20Cites%20Mid-America%20Conversion%20Services.pdf"),
    null,
  );
  assert.equal(officialDoeNovPdfUrl("https://www.nrc.gov/docs/ML2601/ML260110001.pdf"), null);
  assert.equal(officialDoeNovPdfUrl("https://www.csb.gov/assets/1/6/example.pdf"), null);
  assert.equal(
    officialDoeNovPdfUrl("https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2026/2026-0023-goleta-west-aclo.pdf"),
    null,
  );
  assert.equal(officialDoeNovPdfUrl("https://www.atsdr.cdc.gov/HAC/pha/Sterigenics/SmyrnaEtO-508.pdf"), null);
  assert.equal(
    officialDoeNovPdfUrl("https://www.fsis.usda.gov/sites/default/files/media_file/documents/M1-NOIE-01012026.pdf"),
    null,
  );
  assert.ok(LISTING_URL.includes("final-notices-violation"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.id === "nea-2026-01-mcs"));
  assert.match(WGET_SAFARI_UA, /Safari/);

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "nea-2026-01-mcs"));
  assert.ok(htmlListed.some((r) => /Mid-America Conversion Services/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => r.id === "wel-2026-01-triad"));
  assert.ok(!htmlListed.some((r) => /jane smith/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /ea\/articles/i.test(r.sourceUrl)));

  const people = rows.find((r) => (r.id ?? "") === "jane-smith-person");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionNovRow(people!), false);
  const leadRow = rows.find((r) => r.id === "nea-2026-01-mcs" && officialDoeNovPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionNovRow(leadRow!), true);
  assert.equal(isPeopleRow(leadRow!), false);
  assert.equal(isInstitutionNovRow(rows.find((r) => r.id === "mcs-press")!), false, "press is a KILL");
  assert.equal(isInstitutionNovRow(rows.find((r) => r.id === "nrc-ea")!), false, "NRC is a KILL");
  assert.equal(isInstitutionNovRow(rows.find((r) => r.id === "csb-reports")!), false, "/csb-reports is a KILL");
  assert.equal(isInstitutionNovRow(rows.find((r) => r.id === "waterboards-acl")!), false, "/waterboards-acl is a KILL");
  assert.equal(isInstitutionNovRow(rows.find((r) => r.id === "atsdr-hc")!), false, "/atsdr-hc is a KILL");
  assert.equal(isInstitutionNovRow(rows.find((r) => r.id === "fsis-hmsa")!), false, "/fsis-hmsa is a KILL");
  assert.equal(isInstitutionNovRow(rows.find((r) => r.id === "health-canada")!), false, "Health Canada is a KILL");

  const leadText = parseDoeNovText(readFx("nea-2026-01-mcs.txt"), {
    sourceUrl: LEAD,
    institution: "Mid-America Conversion Services, LLC",
    date: "2026-01-15",
    id: "nea-2026-01-mcs",
    docket: "NEA-2026-01",
    title: "Final Notice of Violation",
  });
  assert.equal(leadText.id, "nea-2026-01-mcs");
  assert.match(leadText.institution, /Mid-America Conversion Services, LLC/i);
  assert.equal(leadText.date, "2026-01-15");
  assert.equal(leadText.docket, "NEA-2026-01");
  assert.ok(isRealDoeNovBody(leadText.body));
  for (const needle of LEAK_NEEDLES) {
    assert.ok(hasNeedle(leadText.body, needle), `NEA-2026-01 contains ${needle}`);
  }
  assert.ok(CARD_FIELDS.every((f) => f in leadText));
  assert.equal(leadText.sourceUrl, LEAD);

  for (const [file, id, url] of [
    [
      "wea-2024-04-harris.txt",
      "wea-2024-04-harris",
      "https://www.energy.gov/sites/default/files/2025-10/Final%20Notice%20of%20Violation%2C%20Harris%20Rebar%20Replacing%2C%20LLC.pdf",
    ],
    [
      "wea-2025-01-mcs.txt",
      "wea-2025-01-mcs",
      "https://www.energy.gov/sites/default/files/2025-12/Final%20Notice%20of%20Violation%2C%20Mid-America%20Conversion%20Services%2C%20LLC.pdf",
    ],
    [
      "wel-2026-01-triad.txt",
      "wel-2026-01-triad",
      "https://www.energy.gov/sites/default/files/2026-07/Enforcement%20Letter%2C%20Triad%20National%20Security%2C%20LLC.pdf",
    ],
    [
      "wea-2025-03-engert.txt",
      "wea-2025-03-engert",
      "https://www.energy.gov/sites/default/files/2025-08/Preliminary%20Notice%20of%20Violation%2C%20BESCO-Engert%2C%20LLC.pdf",
    ],
  ] as const) {
    const card = parseDoeNovText(readFx(file), { sourceUrl: url, id });
    assert.ok(isRealDoeNovBody(card.body), `${id} is official DOE Office of Enforcement TEXT`);
    assert.equal(card.id, id);
    assert.ok(officialDoeNovPdfUrl(card.sourceUrl));
  }

  const teaserBody = parseDoeNovText(readFx("no-body.txt"), {
    sourceUrl: "https://www.energy.gov/ea/listings/final-notices-violation",
    institution: "Mid-America Conversion Services, LLC",
  });
  assert.equal(isRealDoeNovBody(teaserBody.body), false, "listing/article teaser is not the FNOV body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(teaserBody.body, needle), `teaser must not contain ${needle}`);
  }
  assert.ok(teaserBody.body.includes("NEA-2026-01"), "index may show the docket");

  const pressBody = parseDoeNovText(readFx("press.txt"), {
    sourceUrl: "https://www.energy.gov/ea/articles/final-notice-violation-mid-america-conversion-services-llc-january-2026",
    institution: "Mid-America Conversion Services, LLC",
  });
  assert.equal(isRealDoeNovBody(pressBody.body), false, "press HTML is not the sold body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(pressBody.body, needle), `press must not contain ${needle}`);
  }

  const peopleBody = parseDoeNovText(readFx("people.txt"), {
    sourceUrl: LEAD,
    institution: "Jane Smith",
  });
  assert.equal(isRealDoeNovBody(peopleBody.body), false, "people file is not this SKU");

  assert.equal(
    isRealDoeNovBody(
      parseDoeNovText(readFx("nrc.txt"), {
        sourceUrl: "https://www.nrc.gov/docs/ML2601/ML260110001.pdf",
        institution: "Example Nuclear Operator, LLC",
      }).body,
    ),
    false,
    "NRC is a KILL",
  );
  assert.equal(
    isRealDoeNovBody(
      parseDoeNovText(readFx("csb-reports.txt"), {
        sourceUrl: "https://www.csb.gov/assets/1/6/example.pdf",
        institution: "Example Chemical Plant, LLC",
      }).body,
    ),
    false,
    "/csb-reports is a KILL",
  );
  assert.equal(
    isRealDoeNovBody(
      parseDoeNovText(readFx("waterboards-acl.txt"), {
        sourceUrl: "https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2026/2026-0023-goleta-west-aclo.pdf",
        institution: "Goleta West Sanitary District",
      }).body,
    ),
    false,
    "/waterboards-acl is a KILL",
  );
  assert.equal(
    isRealDoeNovBody(
      parseDoeNovText(readFx("atsdr-hc.txt"), {
        sourceUrl: "https://www.atsdr.cdc.gov/HAC/pha/Sterigenics/SmyrnaEtO-508.pdf",
        institution: "Sterigenics LLC",
      }).body,
    ),
    false,
    "/atsdr-hc is a KILL",
  );
  assert.equal(
    isRealDoeNovBody(
      parseDoeNovText(readFx("fsis-hmsa.txt"), {
        sourceUrl: "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M1-NOIE-01012026.pdf",
        institution: "Example Packing LLC",
      }).body,
    ),
    false,
    "/fsis-hmsa is a KILL",
  );
  assert.equal(
    isRealDoeNovBody(
      parseDoeNovText(readFx("health-canada.txt"), {
        sourceUrl: "https://health-products.canada.ca/gmp/fullReportCard.ashx?id=1",
        institution: "Example Pharma Inc.",
      }).body,
    ),
    false,
    "Health Canada is a KILL",
  );

  const manifest = buildDoeNovManifest({
    ok: true,
    product: "doe-nov-enforcement-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-07-27",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      pdfHost: "https://www.energy.gov/sites/default/files/{yyyy-mm}/",
      policies: "https://www.energy.gov/web-policies",
    },
    cards: [leadText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Mid-America Conversion Services, LLC/i);
  assert.equal((manifest.cards as { docket: string }[])[0]?.docket, "NEA-2026-01");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!manBlob.includes(needle), `free manifest must not dump ${needle}`);
  }
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("nea-2026-01-mcs"));
  assert.ok(manBlob.includes("NEA-2026-01"), "docket may appear on the card");
  assert.equal(manifest.priceUsdc, "0.05");
  assert.match(String(manifest.license), /17 U\.S\.C\. § 105/i);
  assert.match(String(manifest.attribution), /public domain/i);
  assert.match(String(manifest.attribution), /acknowledgement/i);
  assert.ok(!/CC BY-NC|Creative Commons.*NonCommercial/i.test(String(manifest.license) + String(manifest.attribution)));

  const cache = mkdtempSync(join(tmpdir(), "doe-nov-collect-"));
  const prevDir = process.env.DOE_NOV_DIR;
  process.env.DOE_NOV_DIR = cache;
  try {
    const snap = await collectDoeNov({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official DOE Office of Enforcement bodies");
    assert.ok(snap.cards.some((c) => c.id === "nea-2026-01-mcs" && isRealDoeNovBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealDoeNovBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "jane-smith-person"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "mcs-press"), "skip press");
    assert.ok(snap.cards.every((c) => officialDoeNovPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectDoeNov({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === "nea-2026-01-mcs"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.DOE_NOV_DIR;
    else process.env.DOE_NOV_DIR = prevDir;
  }

  console.log("doe-nov parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
