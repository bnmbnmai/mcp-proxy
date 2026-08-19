import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CARD_FIELDS,
  CDER_LISTING_URL,
  CBER_LISTING_URL,
  LICENSE,
  buildUntitledLettersManifest,
  collectUntitledLetters,
  isRealUntitledBody,
  parseCberListingHtml,
  parseCderListingHtml,
  parseCites,
  parseSaid,
  parseUntitledText,
} from "./untitled-letters.js";
import { readFileSync as readFs } from "node:fs";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fda-untitled-letters");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const cder = parseCderListingHtml(readFx("listing-cder-excerpt.html"));
  assert.ok(cder.length >= 3, "CDER excerpt lists official Untitled Letter PDFs");
  assert.equal(cder[0]?.mediaId, "193721");
  assert.equal(cder[0]?.firm, "Sanofi Vaccines US Inc.");
  assert.equal(cder[0]?.date, "2026-07-15");
  assert.match(cder[0]?.product ?? "", /BEYFORTUS/);
  assert.equal(cder[0]?.office, "OPDP");
  assert.equal(cder[0]?.center, "CDER");
  assert.equal(cder[0]?.sourceUrl, "https://www.fda.gov/media/193721/download");
  assert.ok(cder.some((row) => row.mediaId === "192241" && /NUBEQA/i.test(row.product)));
  assert.ok(!cder.some((row) => row.mediaId === "193720"), "Promotional Material is not the sold unit");
  assert.ok(!cder.some((row) => row.mediaId === "193719"));
  assert.ok(!cder.some((row) => row.mediaId === "193893"), "Close-Out Letter is not an untitled letter");
  assert.ok(!cder.some((row) => row.mediaId === "193054"));
  assert.ok(!cder.some((row) => /warning-letters\//i.test(row.sourceUrl)));
  assert.ok(CDER_LISTING_URL.includes("/untitled-letters"));
  assert.ok(!CDER_LISTING_URL.includes("/warning-letters/"));

  const cber = parseCberListingHtml(readFx("listing-cber-excerpt.html"));
  assert.ok(cber.length >= 2, "CBER excerpt lists official Untitled Letter PDFs");
  assert.equal(cber[0]?.mediaId, "191631");
  assert.match(cber[0]?.firm ?? "", /Iovance/);
  assert.equal(cber[0]?.date, "2026-03-09");
  assert.match(cber[0]?.product ?? "", /AMTAGVI/i);
  assert.equal(cber[0]?.office, "CBER");
  assert.equal(cber[0]?.sourceUrl, "https://www.fda.gov/media/191631/download");
  assert.ok(cber.some((row) => row.mediaId === "191630" && /BREYANZI/i.test(row.product)));
  assert.ok(CBER_LISTING_URL.includes("untitled-letters-regarding-advertising"));

  const nubeqa = parseUntitledText(readFx("192241.txt"), {
    sourceUrl: "https://www.fda.gov/media/192241/download",
    firm: "Bayer HealthCare Pharmaceuticals, Inc.",
    date: "2026-04-28",
    product: "NUBEQA® (darolutamide) tablets, for oral use",
    office: "OPDP",
    center: "CDER",
  });
  assert.equal(nubeqa.mediaId, "192241");
  assert.equal(nubeqa.firm, "Bayer HealthCare Pharmaceuticals, Inc.");
  assert.ok(isRealUntitledBody(nubeqa.body));
  assert.ok(nubeqa.body.includes("Office of Prescription Drug Promotion"));
  assert.ok(nubeqa.body.includes("NUBEQA"));
  assert.ok(nubeqa.said.length > 40);
  assert.match(nubeqa.said, /false or misleading|misbrand/i);
  assert.ok(nubeqa.cites.some((c) => /FD&C Act/i.test(c)));
  assert.ok(CARD_FIELDS.every((f) => f in nubeqa));
  assert.ok(!/redica|pink sheet|we are not inventing/i.test(JSON.stringify(nubeqa)));

  const amtagvi = parseUntitledText(readFx("191631.txt"), {
    sourceUrl: "https://www.fda.gov/media/191631/download",
    firm: "Iovance Biotherapeutics",
    date: "2026-03-09",
    product: "AMTAGVI",
    office: "CBER",
    center: "CBER",
  });
  assert.ok(isRealUntitledBody(amtagvi.body));
  assert.equal(amtagvi.office, "CBER");
  assert.ok(amtagvi.body.includes("Advertising and Promotional Labeling Branch"));
  assert.ok(amtagvi.cites.some((c) => /21 U\.S\.C\./i.test(c) || /21 CFR/i.test(c) || /FD&C Act/i.test(c)) || parseCites(amtagvi.body).length >= 0);
  assert.ok(parseSaid(amtagvi.body).length > 0 || amtagvi.body.includes("has reviewed"));

  const promo = parseUntitledText(readFx("promo-only.txt"), {
    sourceUrl: "https://www.fda.gov/media/193720/download",
    firm: "Sanofi Vaccines US Inc.",
  });
  assert.equal(isRealUntitledBody(promo.body), false);

  const warningLike = parseUntitledText(
    "WARNING LETTER\nMarch 4, 2026\nThis is to advise you that FDA reviewed your website.",
    { sourceUrl: "https://www.fda.gov/media/1/download", firm: "Citra100mg" },
  );
  assert.equal(isRealUntitledBody(warningLike.body), false, "warning-letter HTML is not this SKU");

  const manifest = buildUntitledLettersManifest({
    ok: true,
    product: "fda-untitled-letter-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-19T00:00:00.000Z",
    asOf: "2026-04-28",
    license: LICENSE,
    sources: {
      cder: CDER_LISTING_URL,
      cber: CBER_LISTING_URL,
      hub: "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/issuance-untitled-letters",
      mediaBase: "https://www.fda.gov/media/",
    },
    cards: [nubeqa],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.equal((manifest.cards as { firm: string }[])[0]?.firm, "Bayer HealthCare Pharmaceuticals, Inc.");
  assert.equal((manifest.cards as { product: string }[])[0]?.product.includes("NUBEQA"), true);
  assert.ok(!manBlob.includes("Office of Prescription Drug Promotion"), "free manifest must not dump letter text");
  assert.ok(!manBlob.includes("false or misleading"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(!("cites" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(!("said" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("192241"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");

  const cache = mkdtempSync(join(tmpdir(), "untitled-letters-collect-"));
  const prevDir = process.env.UNTITLED_LETTERS_DIR;
  process.env.UNTITLED_LETTERS_DIR = cache;
  try {
    const snap = await collectUntitledLetters({ htmlDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 3, "fixture collect extracts several official bodies");
    assert.ok(snap.cards.some((c) => c.mediaId === "192241" && isRealUntitledBody(c.body)));
    assert.ok(snap.cards.some((c) => c.mediaId === "193721" && isRealUntitledBody(c.body)));
    assert.ok(snap.cards.some((c) => c.mediaId === "191631" && isRealUntitledBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealUntitledBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.mediaId === "193720"), "no promotional-material body");
    assert.ok(!snap.cards.some((c) => c.mediaId === "192843"), "no invented SUCRAID body when official text is absent");
    assert.ok(!snap.cards.some((c) => c.mediaId === "191632"), "no invented KYMRIAH body");
    assert.ok(snap.cards.every((c) => c.sourceUrl.includes("/media/") && c.sourceUrl.endsWith("/download")));
    assert.ok(snap.cards.every((c) => !c.sourceUrl.includes("/warning-letters/")));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectUntitledLetters({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.mediaId === "192241"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 3);
  } finally {
    if (prevDir === undefined) delete process.env.UNTITLED_LETTERS_DIR;
    else process.env.UNTITLED_LETTERS_DIR = prevDir;
  }

  console.log("untitled-letters parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
