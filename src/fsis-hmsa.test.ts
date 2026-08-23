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
  buildFsisHmsaManifest,
  collectFsisHmsa,
  compactForMatch,
  isInstitutionLetterRow,
  isPeopleRow,
  isRealFsisHmsaBody,
  officialFsisHmsaPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseFsisHmsaText,
  type FsisHmsaListingRow,
} from "./fsis-hmsa.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fsis-hmsa");
const LEAD =
  "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M40110-NOIE-07302026.pdf";

const LEAK_NEEDLES = ["B-45131621", "313.30(a)(4)", "Consciousness on the Rail"];

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

function hasNeedle(text: string, needle: string): boolean {
  return compactForMatch(text).includes(needle);
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as FsisHmsaListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official FSIS excerpt lists establishment letters");
  const lead = listed.find((r) => r.id === "m40110-noie-07302026");
  assert.ok(lead);
  assert.match(lead?.institution ?? "", /Collagen Solutions \(US\) LLC/i);
  assert.equal(lead?.date, "2026-07-30");
  assert.equal(lead?.letterType, "NOIE");
  assert.equal(lead?.sourceUrl, LEAD);
  assert.ok(listed.some((r) => r.id === "m40110-lod-08052026"));
  assert.ok(listed.some((r) => r.id === "m354-noie-03232026"));
  assert.ok(listed.some((r) => r.id === "m1745-nos-07072026"));
  assert.ok(listed.some((r) => r.id === "m2560-nosha-07282026"));
  assert.ok(!listed.some((r) => r.id === "jane-smith-person"), "skip people");
  assert.ok(!listed.some((r) => r.id === "awa-wrap"), "skip /awa");
  assert.ok(!listed.some((r) => r.id === "dila-cnil"), "skip DILA CNIL");
  assert.ok(!listed.some((r) => r.id === "ico-mpn"), "skip ICO MPN");
  assert.ok(!listed.some((r) => r.id === "phmsa-cop"), "skip PHMSA COP");
  assert.ok(!listed.some((r) => r.id === "fmc-orders"), "skip FMC orders");
  assert.ok(!listed.some((r) => r.id === "table-index"), "skip table/index");
  assert.ok(listed.every((r) => officialFsisHmsaPdfUrl(r.sourceUrl)));
  assert.equal(officialFsisHmsaPdfUrl(LEAD), LEAD);
  assert.equal(
    officialFsisHmsaPdfUrl("https://www.aphis.usda.gov/sites/default/files/awa-inspection.pdf"),
    null,
  );
  assert.equal(officialFsisHmsaPdfUrl("https://www.legifrance.gouv.fr/cnil/id/CNILTEXT000000"), null);
  assert.equal(officialFsisHmsaPdfUrl("https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf"), null);
  assert.equal(
    officialFsisHmsaPdfUrl("https://primis.phmsa.dot.gov/enforcement-documents/12025033NOPV/order.pdf"),
    null,
  );
  assert.equal(
    officialFsisHmsaPdfUrl("https://www2.fmc.gov/readingroom/docs/23-08/order.pdf/"),
    null,
  );
  assert.equal(
    officialFsisHmsaPdfUrl("https://www.fsis.usda.gov/inspection/regulatory-enforcement/humane-handling-enforcement"),
    null,
  );
  assert.ok(LISTING_URL.includes("humane-handling-enforcement"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.id === "m40110-noie-07302026"));
  assert.match(WGET_SAFARI_UA, /Safari/);

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "m40110-noie-07302026"));
  assert.ok(htmlListed.some((r) => /Collagen Solutions/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => r.id === "m1745-nos-07072026"));
  assert.ok(!htmlListed.some((r) => /jane smith/i.test(r.institution)));

  const people = rows.find((r) => (r.id ?? "") === "jane-smith-person");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionLetterRow(people!), false);
  const leadRow = rows.find((r) => r.id === "m40110-noie-07302026" && officialFsisHmsaPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionLetterRow(leadRow!), true);
  assert.equal(isPeopleRow(leadRow!), false);
  assert.equal(isInstitutionLetterRow(rows.find((r) => r.id === "awa-wrap")!), false, "/awa is a KILL");
  assert.equal(isInstitutionLetterRow(rows.find((r) => r.id === "dila-cnil")!), false, "DILA CNIL is a KILL");

  const leadText = parseFsisHmsaText(readFx("m40110-noie-07302026.txt"), {
    sourceUrl: LEAD,
    institution: "Collagen Solutions (US) LLC",
    date: "2026-07-30",
    estNumber: "M40110",
    letterType: "NOIE",
    id: "m40110-noie-07302026",
  });
  assert.equal(leadText.id, "m40110-noie-07302026");
  assert.match(leadText.institution, /Collagen Solutions \(US\) LLC/i);
  assert.equal(leadText.date, "2026-07-30");
  assert.equal(leadText.letterType, "NOIE");
  assert.equal(leadText.title, "Notice of Intended Enforcement");
  assert.ok(isRealFsisHmsaBody(leadText.body));
  for (const needle of LEAK_NEEDLES) {
    assert.ok(hasNeedle(leadText.body, needle), `M40110-NOIE contains ${needle}`);
  }
  assert.ok(CARD_FIELDS.every((f) => f in leadText));
  assert.equal(leadText.sourceUrl, LEAD);

  for (const [file, id, url] of [
    [
      "m40110-lod-08052026.txt",
      "m40110-lod-08052026",
      "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M40110-LOD-08052026.pdf",
    ],
    [
      "m354-noie-03232026.txt",
      "m354-noie-03232026",
      "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M354-NOIE-03232026.pdf",
    ],
    [
      "m1745-nos-07072026.txt",
      "m1745-nos-07072026",
      "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M1745-P1745-NOS-07072026.pdf",
    ],
    [
      "m2560-nosha-07282026.txt",
      "m2560-nosha-07282026",
      "https://www.fsis.usda.gov/sites/default/files/media_file/documents/M2560-NOSHA-07282026.pdf",
    ],
  ] as const) {
    const card = parseFsisHmsaText(readFx(file), { sourceUrl: url, id });
    assert.ok(isRealFsisHmsaBody(card.body), `${id} is official FSIS HMSA letter TEXT`);
    assert.equal(card.id, id);
    assert.ok(officialFsisHmsaPdfUrl(card.sourceUrl));
  }

  const teaserBody = parseFsisHmsaText(readFx("no-body.txt"), {
    sourceUrl: "https://www.fsis.usda.gov/inspection/regulatory-enforcement/humane-handling-enforcement",
    institution: "Collagen Solutions (US) LLC",
  });
  assert.equal(isRealFsisHmsaBody(teaserBody.body), false, "table/index is not the letter body");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!hasNeedle(teaserBody.body, needle), `teaser must not contain ${needle}`);
  }

  const peopleBody = parseFsisHmsaText(readFx("people.txt"), {
    sourceUrl: LEAD,
    institution: "Jane Smith",
  });
  assert.equal(isRealFsisHmsaBody(peopleBody.body), false, "people file is not this SKU");

  assert.equal(
    isRealFsisHmsaBody(parseFsisHmsaText(readFx("awa.txt"), { sourceUrl: LEAD, institution: "Example Kennel LLC" }).body),
    false,
    "/awa is a KILL",
  );
  assert.equal(
    isRealFsisHmsaBody(
      parseFsisHmsaText(readFx("dila-cnil.txt"), { sourceUrl: LEAD, institution: "Example SAS" }).body,
    ),
    false,
    "DILA CNIL is a KILL",
  );
  assert.equal(
    isRealFsisHmsaBody(
      parseFsisHmsaText(readFx("ico-mpn.txt"), {
        sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
        institution: "Reddit, Inc.",
      }).body,
    ),
    false,
    "ICO /ico-mpn is not this SKU",
  );
  assert.equal(
    isRealFsisHmsaBody(
      parseFsisHmsaText(readFx("phmsa-cop.txt"), {
        sourceUrl: "https://primis.phmsa.dot.gov/enforcement-documents/12025033NOPV/order.pdf",
        institution: "EQT Production Company",
      }).body,
    ),
    false,
    "PHMSA /phmsa-cop is not this SKU",
  );
  assert.equal(
    isRealFsisHmsaBody(
      parseFsisHmsaText(readFx("fmc-orders.txt"), {
        sourceUrl: "https://www2.fmc.gov/readingroom/docs/23-08/order.pdf/",
        institution: "MSC Mediterranean Shipping Company S.A.",
      }).body,
    ),
    false,
    "FMC /fmc-orders is not this SKU",
  );

  const manifest = buildFsisHmsaManifest({
    ok: true,
    product: "fsis-hmsa-letter-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-08-05",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      pdfHost: "https://www.fsis.usda.gov/sites/default/files/media_file/documents/",
    },
    cards: [leadText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /Collagen Solutions/i);
  assert.equal((manifest.cards as { letterType: string }[])[0]?.letterType, "NOIE");
  for (const needle of LEAK_NEEDLES) {
    assert.ok(!manBlob.includes(needle), `free manifest must not dump ${needle}`);
  }
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("m40110-noie-07302026"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 U.S.C. § 105");
  assert.match(String(manifest.attribution), /17 U\.S\.C\. § 105/);

  const cache = mkdtempSync(join(tmpdir(), "fsis-hmsa-collect-"));
  const prevDir = process.env.FSIS_HMSA_DIR;
  process.env.FSIS_HMSA_DIR = cache;
  try {
    const snap = await collectFsisHmsa({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official FSIS HMSA letter bodies");
    assert.ok(snap.cards.some((c) => c.id === "m40110-noie-07302026" && isRealFsisHmsaBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealFsisHmsaBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "jane-smith-person"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "awa-wrap"), "skip /awa");
    assert.ok(snap.cards.every((c) => officialFsisHmsaPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectFsisHmsa({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === "m40110-noie-07302026"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.FSIS_HMSA_DIR;
    else process.env.FSIS_HMSA_DIR = prevDir;
  }

  console.log("fsis-hmsa parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
