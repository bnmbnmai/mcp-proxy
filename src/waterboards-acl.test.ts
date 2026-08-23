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
  buildWaterboardsAclManifest,
  collectWaterboardsAcl,
  compactForMatch,
  isInstitutionAclRow,
  isPeopleRow,
  isRealWaterboardsAclBody,
  officialWaterboardsAclPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseWaterboardsAclText,
  type WaterboardsAclListingRow,
} from "./waterboards-acl.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/waterboards-acl");
const LEAD =
  "https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2026/2026-0023-goleta-west-aclo.pdf";

const LEAK_NEEDLES = ["$2/gallon", "1,070,696", "1,713,114", "1,549,002", "10,716,960"];

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

function hasNeedle(text: string, needle: string): boolean {
  return compactForMatch(text).includes(needle);
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as WaterboardsAclListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official Water Boards excerpt lists company/institution ACL orders");
  const lead = listed.find((r) => r.id === "goleta-r3-2026-0023");
  assert.ok(lead);
  assert.match(lead?.institution ?? "", /Goleta West Sanitary District/i);
  assert.equal(lead?.date, "2026-02-27");
  assert.equal(lead?.orderNumber, "R3-2026-0023");
  assert.equal(lead?.sourceUrl, LEAD);
  assert.ok(listed.some((r) => r.id === "watsonville-r3-2026-0033"));
  assert.ok(listed.some((r) => r.id === "baldwin-r9-2026-0063"));
  assert.ok(listed.some((r) => r.id === "granite-rock-r3-2025-0051"));
  assert.ok(listed.some((r) => r.id === "moss-landing-r3-2026-0037"));
  assert.ok(!listed.some((r) => r.id === "jane-smith-person"), "skip people");
  assert.ok(!listed.some((r) => r.id === "goleta-transmittal"), "skip transmittal letters");
  assert.ok(!listed.some((r) => r.id === "acl-table"), "skip discretionary-ACL table");
  assert.ok(!listed.some((r) => r.id === "ciwqs-index"), "skip CIWQS index");
  assert.ok(!listed.some((r) => r.id === "echo-summary"), "skip ECHO");
  assert.ok(!listed.some((r) => r.id === "superfund-rods"), "skip /superfund-rods");
  assert.ok(!listed.some((r) => r.id === "atsdr-hc"), "skip /atsdr-hc");
  assert.ok(!listed.some((r) => r.id === "fcc-edocs"), "skip FCC EDOCS");
  assert.ok(listed.every((r) => officialWaterboardsAclPdfUrl(r.sourceUrl)));
  assert.equal(officialWaterboardsAclPdfUrl(LEAD), LEAD);
  assert.equal(
    officialWaterboardsAclPdfUrl(
      "https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2026/2026-0023-goleta-west-letter.pdf",
    ),
    null,
  );
  assert.equal(
    officialWaterboardsAclPdfUrl("https://www.waterboards.ca.gov/water_issues/programs/enforcement/orders_actions.html"),
    null,
  );
  assert.equal(officialWaterboardsAclPdfUrl("https://ciwqs.waterboards.ca.gov/ciwqs/readOnly/CiwqsReportServlet"), null);
  assert.equal(officialWaterboardsAclPdfUrl("https://echo.epa.gov/detailed-facility-report"), null);
  assert.equal(officialWaterboardsAclPdfUrl("https://semspub.epa.gov/work/05/711427.pdf"), null);
  assert.equal(
    officialWaterboardsAclPdfUrl("https://www.atsdr.cdc.gov/HAC/pha/Sterigenics/SmyrnaEtO-508.pdf"),
    null,
  );
  assert.equal(officialWaterboardsAclPdfUrl("https://docs.fcc.gov/public/attachments/FCC-26-1A1.pdf"), null);
  assert.ok(LISTING_URL.includes("enforcement"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.id === "goleta-r3-2026-0023"));
  assert.match(WGET_SAFARI_UA, /Safari/);

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "goleta-r3-2026-0023"));
  assert.ok(htmlListed.some((r) => /Goleta West Sanitary District/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => r.id === "baldwin-r9-2026-0063"));
  assert.ok(!htmlListed.some((r) => /jane smith/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /letter\.pdf/i.test(r.sourceUrl)));

  const people = rows.find((r) => (r.id ?? "") === "jane-smith-person");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionAclRow(people!), false);
  const leadRow = rows.find((r) => r.id === "goleta-r3-2026-0023" && officialWaterboardsAclPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionAclRow(leadRow!), true);
  assert.equal(isPeopleRow(leadRow!), false);
  assert.equal(isInstitutionAclRow(rows.find((r) => r.id === "goleta-transmittal")!), false, "transmittal is a KILL");
  assert.equal(isInstitutionAclRow(rows.find((r) => r.id === "acl-table")!), false, "ACL table is a KILL");
  assert.equal(isInstitutionAclRow(rows.find((r) => r.id === "superfund-rods")!), false, "/superfund-rods is a KILL");
  assert.equal(isInstitutionAclRow(rows.find((r) => r.id === "atsdr-hc")!), false, "/atsdr-hc is a KILL");
  assert.equal(isInstitutionAclRow(rows.find((r) => r.id === "fcc-edocs")!), false, "FCC EDOCS is a KILL");

  const leadText = parseWaterboardsAclText(readFx("goleta-r3-2026-0023.txt"), {
    sourceUrl: LEAD,
    institution: "Goleta West Sanitary District",
    date: "2026-02-27",
    id: "goleta-r3-2026-0023",
    orderNumber: "R3-2026-0023",
    title: "Settlement Agreement and Stipulation for Entry of Administrative Civil Liability Order",
  });
  assert.equal(leadText.id, "goleta-r3-2026-0023");
  assert.match(leadText.institution, /Goleta West Sanitary District/i);
  assert.equal(leadText.date, "2026-02-27");
  assert.equal(leadText.orderNumber, "R3-2026-0023");
  assert.ok(isRealWaterboardsAclBody(leadText.body));
  for (const needle of LEAK_NEEDLES) {
    assert.ok(hasNeedle(leadText.body, needle), `Goleta R3-2026-0023 contains ${needle}`);
  }
  assert.ok(CARD_FIELDS.every((f) => f in leadText));
  assert.equal(leadText.sourceUrl, LEAD);

  for (const [file, id, url] of [
    [
      "watsonville-r3-2026-0033.txt",
      "watsonville-r3-2026-0033",
      "https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2026/2026-0033-watsonville-aclo.pdf",
    ],
    [
      "baldwin-r9-2026-0063.txt",
      "baldwin-r9-2026-0063",
      "https://www.waterboards.ca.gov/sandiego/board_decisions/adopted_orders/2026/r9-2026-0063.pdf",
    ],
    [
      "granite-rock-r3-2025-0051.txt",
      "granite-rock-r3-2025-0051",
      "https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2025/2025-0051-granite-rock-aclo.pdf",
    ],
    [
      "moss-landing-r3-2026-0037.txt",
      "moss-landing-r3-2026-0037",
      "https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2026/2026-0037-moss-landing-aclo.pdf",
    ],
  ] as const) {
    const card = parseWaterboardsAclText(readFx(file), { sourceUrl: url, id });
    assert.ok(isRealWaterboardsAclBody(card.body), `${id} is official Water Boards ACL TEXT`);
    assert.equal(card.id, id);
    assert.ok(officialWaterboardsAclPdfUrl(card.sourceUrl));
  }

  const teaserBody = parseWaterboardsAclText(readFx("no-body.txt"), {
    sourceUrl: "https://www.waterboards.ca.gov/water_issues/programs/enforcement/orders_actions.html",
    institution: "Goleta West Sanitary District",
  });
  assert.equal(isRealWaterboardsAclBody(teaserBody.body), false, "table/transmittal teaser is not the ACL body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(teaserBody.body, needle), `teaser must not contain ${needle}`);
  }
  assert.ok(teaserBody.body.includes("$1,551,145"), "index may show the table liability");

  const transmittalBody = parseWaterboardsAclText(readFx("transmittal.txt"), {
    sourceUrl:
      "https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2026/2026-0023-goleta-west-letter.pdf",
    institution: "Goleta West Sanitary District",
  });
  assert.equal(isRealWaterboardsAclBody(transmittalBody.body), false, "transmittal letter is not the sold body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(transmittalBody.body, needle), `transmittal must not contain ${needle}`);
  }

  const peopleBody = parseWaterboardsAclText(readFx("people.txt"), {
    sourceUrl: LEAD,
    institution: "Jane Smith",
  });
  assert.equal(isRealWaterboardsAclBody(peopleBody.body), false, "people file is not this SKU");

  assert.equal(
    isRealWaterboardsAclBody(
      parseWaterboardsAclText(readFx("ciwqs.txt"), {
        sourceUrl: "https://ciwqs.waterboards.ca.gov/ciwqs/readOnly/CiwqsReportServlet",
        institution: "Goleta West Sanitary District",
      }).body,
    ),
    false,
    "CIWQS index is a KILL",
  );
  assert.equal(
    isRealWaterboardsAclBody(
      parseWaterboardsAclText(readFx("echo.txt"), {
        sourceUrl: "https://echo.epa.gov/detailed-facility-report",
        institution: "Goleta West Sanitary District",
      }).body,
    ),
    false,
    "ECHO is a KILL",
  );
  assert.equal(
    isRealWaterboardsAclBody(
      parseWaterboardsAclText(readFx("superfund-rods.txt"), {
        sourceUrl: "https://semspub.epa.gov/work/05/711427.pdf",
        institution: "Federated Metals Corp. Whiting Superfund Site",
      }).body,
    ),
    false,
    "/superfund-rods is a KILL",
  );
  assert.equal(
    isRealWaterboardsAclBody(
      parseWaterboardsAclText(readFx("atsdr-hc.txt"), {
        sourceUrl: "https://www.atsdr.cdc.gov/HAC/pha/Sterigenics/SmyrnaEtO-508.pdf",
        institution: "Sterigenics LLC",
      }).body,
    ),
    false,
    "/atsdr-hc is a KILL",
  );
  assert.equal(
    isRealWaterboardsAclBody(
      parseWaterboardsAclText(readFx("fcc-edocs.txt"), {
        sourceUrl: "https://docs.fcc.gov/public/attachments/FCC-26-1A1.pdf",
        institution: "Example Broadcaster Inc.",
      }).body,
    ),
    false,
    "FCC EDOCS is a KILL",
  );

  const manifest = buildWaterboardsAclManifest({
    ok: true,
    product: "waterboards-acl-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-07-21",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      pdfHost: "https://www.waterboards.ca.gov/{region}/board_decisions/adopted_orders/",
      conditions: "https://www.waterboards.ca.gov/conditions_of_use.html",
    },
    cards: [leadText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Goleta West Sanitary District/i);
  assert.equal((manifest.cards as { orderNumber: string }[])[0]?.orderNumber, "R3-2026-0023");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!manBlob.includes(needle), `free manifest must not dump ${needle}`);
  }
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("goleta-r3-2026-0023"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.match(String(manifest.license), /public domain/i);
  assert.match(String(manifest.attribution), /distributed or copied as permitted by law/i);

  const cache = mkdtempSync(join(tmpdir(), "waterboards-acl-collect-"));
  const prevDir = process.env.WATERBOARDS_ACL_DIR;
  process.env.WATERBOARDS_ACL_DIR = cache;
  try {
    const snap = await collectWaterboardsAcl({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official Water Boards ACL bodies");
    assert.ok(snap.cards.some((c) => c.id === "goleta-r3-2026-0023" && isRealWaterboardsAclBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealWaterboardsAclBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "jane-smith-person"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "goleta-transmittal"), "skip transmittal");
    assert.ok(snap.cards.every((c) => officialWaterboardsAclPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectWaterboardsAcl({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === "goleta-r3-2026-0023"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.WATERBOARDS_ACL_DIR;
    else process.env.WATERBOARDS_ACL_DIR = prevDir;
  }

  console.log("waterboards-acl parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
