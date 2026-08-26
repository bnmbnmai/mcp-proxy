import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  ATTRIBUTION,
  CARD_FIELDS,
  INDEX_URL,
  LICENSE,
  MA_LISTING_JSON,
  MA_PAGE_URL,
  SEED_LISTINGS,
  buildNpdesPermitsManifest,
  collectNpdesPermits,
  isOfficialIndividualPermitPdf,
  isPeopleRow,
  isRealNpdesPermitBody,
  mdyToIso,
  officialIndividualPermitUrl,
  parseListingRows,
  parseNpdesPermitText,
  parsePermitListingJson,
} from "./npdes-permits.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/npdes-permits");
const CERTAINTEED_PDF = "https://www.epa.gov/system/files/documents/2026-05/finalma0003531permit-2026.pdf";
const PCC_PDF = "https://www.epa.gov/system/files/documents/2026-07/finalnh0001023permit-2026.pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listing = parsePermitListingJson(JSON.parse(readFx("listing-excerpt.json")), "MA", MA_PAGE_URL);
  assert.ok(listing.some((r) => r.id === "ma0003531"), "listing JSON yields CertainTeed individual permit");
  assert.ok(listing.every((r) => officialIndividualPermitUrl(r.sourceUrl)));
  assert.ok(
    listing.every((r) => !/coverage transferred|general permit/i.test(r.name)),
    "skip general-permit transfers",
  );

  const listed = parseListingRows(SEED_LISTINGS);
  assert.ok(listed.length >= 14, "seed lists 14+ official EPA individual NPDES PDFs");
  assert.ok(listed.some((r) => r.id === "ma0003531"));
  assert.ok(listed.some((r) => r.id === "nh0001023"));
  assert.ok(listed.some((r) => r.id === "az0024619"));
  assert.ok(listed.every((r) => officialIndividualPermitUrl(r.sourceUrl)));
  assert.equal(officialIndividualPermitUrl(CERTAINTEED_PDF), CERTAINTEED_PDF);
  assert.equal(officialIndividualPermitUrl(PCC_PDF), PCC_PDF);
  assert.equal(
    officialIndividualPermitUrl("https://www.epa.gov/system/files/documents/2026-05/finalal0003531permit-2026.pdf"),
    null,
    "non-EPA prefix inside FINALAL… is not an EPA-issued individual permit",
  );
  assert.equal(
    officialIndividualPermitUrl("https://www.epa.gov/system/files/documents/2025-07/permit_final_ms4_2003.pdf"),
    null,
  );
  assert.equal(
    officialIndividualPermitUrl("https://www.env.nm.gov/wp-content/uploads/sites/25/2017/07/NM0020231-City-of-Bayard-WWTP.pdf"),
    null,
  );
  assert.equal(
    officialIndividualPermitUrl("https://www.epa.gov/system/files/documents/2023-09/draftma0003891permit.pdf"),
    null,
  );
  assert.equal(
    officialIndividualPermitUrl("https://echo.epa.gov/system/files/ECHO%20All%20Data%20Search%20Services_v3.pdf"),
    null,
  );
  assert.ok(isOfficialIndividualPermitPdf(CERTAINTEED_PDF));
  assert.ok(INDEX_URL.includes("epa.gov/npdes-permits"));
  assert.ok(MA_LISTING_JSON.includes("permit-listing-ma.json"));
  assert.equal(mdyToIso("5/27/2026"), "2026-05-27");
  assert.equal(isPeopleRow({ name: "Jane Q Public CV", permit: "" }), true);

  const certainteed = parseNpdesPermitText(readFx("ma0003531.txt"), {
    sourceUrl: CERTAINTEED_PDF,
    pageUrl: MA_PAGE_URL,
    name: "Bird, Incorporated d/b/a CertainTeed",
    permit: "MA0003531",
    date: "2026-05-27",
    state: "MA",
    id: "ma0003531",
    kind: "individual-npdes-permit",
  });
  assert.equal(certainteed.id, "ma0003531");
  assert.equal(certainteed.permit, "MA0003531");
  assert.ok(isRealNpdesPermitBody(certainteed.body));
  assert.ok(certainteed.body.includes("AUTHORIZATION TO DISCHARGE"));
  assert.ok(certainteed.body.includes("MA0003531"));
  assert.ok(certainteed.body.includes("CertainTeed"));
  assert.ok(CARD_FIELDS.every((f) => f in certainteed));

  for (const slug of ["nh0001023", "ma0003832", "az0024619", "nm0030490"]) {
    const card = parseNpdesPermitText(readFx(`${slug}.txt`), {
      sourceUrl: SEED_LISTINGS.find((r) => r.id === slug)?.sourceUrl || CERTAINTEED_PDF,
      pageUrl: SEED_LISTINGS.find((r) => r.id === slug)?.pageUrl,
      id: slug,
      name: slug,
      permit: SEED_LISTINGS.find((r) => r.id === slug)?.permit,
    });
    assert.ok(isRealNpdesPermitBody(card.body), `${slug} is official EPA individual NPDES TEXT`);
    assert.equal(card.id, slug);
  }

  const teaser = parseNpdesPermitText(readFx("teaser.txt"), {
    sourceUrl: CERTAINTEED_PDF,
    name: "CertainTeed",
  });
  assert.equal(isRealNpdesPermitBody(teaser.body), false, "fact-sheet teaser is not the permit body");

  const peopleBody = parseNpdesPermitText(readFx("people.txt"), {
    sourceUrl: CERTAINTEED_PDF,
    name: "Jane Q Public",
  });
  assert.equal(isRealNpdesPermitBody(peopleBody.body), false, "people file is not this SKU");

  const wrap = parseNpdesPermitText(readFx("json-wrap.txt"), {
    sourceUrl: CERTAINTEED_PDF,
    name: "CertainTeed",
  });
  assert.equal(isRealNpdesPermitBody(wrap.body), false, "ECHO catalog JSON is not the sold unit");

  const echo = parseNpdesPermitText(readFx("echo.txt"), {
    sourceUrl: CERTAINTEED_PDF,
    name: "CertainTeed",
  });
  assert.equal(isRealNpdesPermitBody(echo.body), false, "ECHO metadata is not this SKU");

  const rod = parseNpdesPermitText(readFx("superfund-rod.txt"), {
    sourceUrl: "https://www.epa.gov/system/files/documents/2024-01/example-rod.pdf",
    name: "Example Superfund site",
  });
  assert.equal(isRealNpdesPermitBody(rod.body), false, "Superfund ROD is not this SKU");

  const acl = parseNpdesPermitText(readFx("waterboards-acl.txt"), {
    sourceUrl: CERTAINTEED_PDF,
    name: "Example ACL",
  });
  assert.equal(isRealNpdesPermitBody(acl.body), false, "Water Boards ACL is not this SKU");

  const gp = parseNpdesPermitText(readFx("general-permit.txt"), {
    sourceUrl: CERTAINTEED_PDF,
    name: "Construction General Permit",
  });
  assert.equal(isRealNpdesPermitBody(gp.body), false, "general permit is not this SKU");

  const granite = parseNpdesPermitText(readFx("ma0020231.txt"), {
    sourceUrl: "https://www.epa.gov/system/files/documents/2025-06/finalma0020231permit-2025.pdf",
    pageUrl: MA_PAGE_URL,
    name: "Granite State Concrete Co., Inc.",
    permit: "MA0020231",
    date: "2025-06-05",
    state: "MA",
    id: "ma0020231",
  });
  assert.ok(isRealNpdesPermitBody(granite.body), "individual permit may mention Construction General Permit");
  assert.ok(
    isRealNpdesPermitBody(
      `${granite.body}\nThis definition of storm event corresponds with the requirements in EPA's 2022 Construction General Permit to conduct inspections.`,
    ),
    "CGP mention in an individual permit is not a general-permit body",
  );

  const manifest = buildNpdesPermitsManifest({
    ok: true,
    product: "epa-npdes-individual-permit-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-26T00:00:00.000Z",
    asOf: "2026-05-27",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      index: INDEX_URL,
      pdfHost: "https://www.epa.gov/system/files/documents/",
      pageHost: INDEX_URL,
    },
    cards: [certainteed],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.equal((manifest.cards as { name: string }[])[0]?.name, "Bird, Incorporated d/b/a CertainTeed");
  assert.equal((manifest.cards as { id: string }[])[0]?.id, "ma0003531");
  assert.ok(!manBlob.includes("AUTHORIZATION TO DISCHARGE"), "free manifest must not dump permit body");
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);

  const cache = mkdtempSync(join(tmpdir(), "npdes-permits-collect-"));
  const prevDir = process.env.NPDES_PERMITS_DIR;
  process.env.NPDES_PERMITS_DIR = cache;
  try {
    const snap = await collectNpdesPermits({ htmlDir: fixtures, limit: 12, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 6, "fixture collect extracts several official individual permit bodies");
    assert.ok(snap.cards.some((c) => c.id === "ma0003531" && isRealNpdesPermitBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === "nh0001023" && isRealNpdesPermitBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealNpdesPermitBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "jane-q-public-cv"), "skip people");
    assert.ok(snap.cards.every((c) => officialIndividualPermitUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectNpdesPermits({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === "ma0003531"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 6);
  } finally {
    if (prevDir === undefined) delete process.env.NPDES_PERMITS_DIR;
    else process.env.NPDES_PERMITS_DIR = prevDir;
  }

  console.log("npdes-permits parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
