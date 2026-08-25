import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  CARD_FIELDS,
  INDEX_URL,
  LICENSE,
  buildSwissparManifest,
  collectSwisspar,
  isEmaRelianceStub,
  isRealSwissparBody,
  maFromUrl,
  officialPdfUrl,
  parseListingHtml,
  parseSwissparText,
  stripFiAppendix,
} from "./swisspar.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/swisspar");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(listed.length >= 5, "official SwissPAR excerpt lists first-authorisation PDFs");
  const rhapsido = listed.find((r) => r.ma === "70227");
  assert.ok(rhapsido);
  assert.equal(rhapsido?.name, "Rhapsido");
  assert.equal(rhapsido?.date, "2026-08-18");
  assert.equal(rhapsido?.kind, "first-authorisation");
  assert.ok(rhapsido?.sourceUrl.startsWith("https://www.swissmedic.ch/dam/swissmedic/"));
  assert.equal(maFromUrl(rhapsido?.sourceUrl ?? ""), "70227");
  const dawnzera = listed.find((r) => r.ma === "69883");
  assert.ok(dawnzera);
  assert.equal(dawnzera?.name, "Dawnzera");
  assert.equal(dawnzera?.date, "2026-06-30");
  assert.ok(listed.every((r) => r.kind === "first-authorisation"));
  assert.ok(!listed.some((r) => r.ma === "67410"), "skip Extension of therapeutic indication");
  assert.ok(listed.every((r) => officialPdfUrl(r.sourceUrl)));
  assert.equal(officialPdfUrl("https://www.ema.europa.eu/en/medicines/human/EPAR/rhapsido"), null);
  assert.equal(officialPdfUrl("https://www.fda.gov/drugs/cder-research"), null);
  assert.equal(officialPdfUrl("https://www.swissmedicinfo.ch/"), null);
  assert.ok(INDEX_URL.includes("swissmedic.ch") && INDEX_URL.includes("swisspar"));

  const rhapsidoText = parseSwissparText(readFx("70227.txt"), {
    sourceUrl: rhapsido!.sourceUrl,
    name: "Rhapsido",
    date: "2026-08-18",
    ma: "70227",
  });
  assert.equal(rhapsidoText.ma, "70227");
  assert.equal(rhapsidoText.name, "Rhapsido");
  assert.equal(rhapsidoText.inn, "remibrutinib");
  assert.match(rhapsidoText.holder ?? "", /Novartis/);
  assert.ok(isRealSwissparBody(rhapsidoText.body));
  assert.ok(rhapsidoText.body.includes("Swiss Public Assessment Report"));
  assert.ok(
    rhapsidoText.body.includes(
      "Overall, the benefit/risk ratio for remibrutinib was assessed as positive",
    ),
  );
  assert.ok(rhapsidoText.body.includes("REMIX-1"));
  assert.ok(rhapsidoText.body.includes("REMIX-2"));
  assert.ok(!/Prescribing information for human medicines/i.test(rhapsidoText.body));
  assert.ok(!/Approved Information for healthcare professionals/i.test(rhapsidoText.body));
  assert.ok(CARD_FIELDS.every((f) => f in rhapsidoText));
  assert.ok(!/ema\.europa|fda\.gov\/drugs|cder review/i.test(JSON.stringify(rhapsidoText)));

  const dawnzeraText = parseSwissparText(readFx("69883.txt"), {
    sourceUrl: dawnzera!.sourceUrl,
    name: "Dawnzera",
    date: "2026-06-30",
    ma: "69883",
  });
  assert.ok(isRealSwissparBody(dawnzeraText.body));
  assert.equal(dawnzeraText.inn, "donidalorsen");
  assert.ok(/benefit.?risk/i.test(dawnzeraText.body));
  assert.ok(!/Approved Information for healthcare professionals/i.test(dawnzeraText.body));

  const reblozylText = parseSwissparText(readFx("69592.txt"), {
    sourceUrl:
      "https://www.swissmedic.ch/dam/swissmedic/en/dokumente/zulassung/swisspar/69592-reblozyl-01-swisspar-20260716.pdf.download.pdf/SwissPAR_Reblozyl.pdf",
    name: "Reblozyl",
    date: "2026-07-16",
    ma: "69592",
  });
  assert.ok(isRealSwissparBody(reblozylText.body), "quality/nonclinical Article 13 is not a full reliance stub");
  assert.equal(isEmaRelianceStub(reblozylText.body), false);
  assert.equal(reblozylText.inn, "luspatercept");

  const reliance = parseSwissparText(readFx("70272.txt"), {
    sourceUrl:
      "https://www.swissmedic.ch/dam/swissmedic/en/dokumente/zulassung/swisspar/70272-mnexspike-01-swisspar-20280818.pdf.download.pdf/mNEXSPIKE.pdf",
    name: "mNEXSPIKE",
    date: "2026-08-18",
    ma: "70272",
  });
  assert.equal(isEmaRelianceStub(reliance.body), true);
  assert.equal(isRealSwissparBody(reliance.body), false, "EMA-reliance stub is not this SKU");
  assert.ok(/has not assessed the primary data/i.test(reliance.body));

  const fake = parseSwissparText(readFx("no-evaluation.txt"), {
    sourceUrl: "https://www.ema.europa.eu/en/medicines/human/EPAR/example",
    name: "Index",
  });
  assert.equal(isRealSwissparBody(fake.body), false, "A–Z index / EMA EPAR / CDER is not this SKU");

  const stripped = stripFiAppendix(readFx("70227.txt"));
  assert.ok(stripped.includes("Overall, the benefit/risk ratio for remibrutinib"));
  assert.ok(!/Prescribing information for human medicines/i.test(stripped));

  const manifest = buildSwissparManifest({
    ok: true,
    product: "swisspar-first-auth",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-19T00:00:00.000Z",
    asOf: "2026-08-18",
    license: LICENSE,
    attribution: "Swissmedic",
    sources: {
      index: INDEX_URL,
      pdfHost: "https://www.swissmedic.ch/dam/swissmedic/",
      faq: INDEX_URL,
    },
    cards: [rhapsidoText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.equal((manifest.cards as { name: string }[])[0]?.name, "Rhapsido");
  assert.equal((manifest.cards as { date: string }[])[0]?.date, "2026-08-18");
  assert.equal((manifest.cards as { ma: string }[])[0]?.ma, "70227");
  assert.ok(!manBlob.includes("benefit/risk ratio for remibrutinib"), "free manifest must not dump evaluation text");
  assert.ok(!manBlob.includes("REMIX-1"));
  assert.ok(!manBlob.includes("REMIX-2"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(!("inn" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("70227"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "CopA Art. 5 para. 1 let. c");
  assert.equal(manifest.attribution, "Swissmedic");

  const cache = mkdtempSync(join(tmpdir(), "swisspar-collect-"));
  const prevDir = process.env.SWISSPAR_DIR;
  process.env.SWISSPAR_DIR = cache;
  try {
    const snap = await collectSwisspar({ htmlDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts several official first-auth bodies");
    assert.ok(snap.cards.some((c) => c.ma === "70227" && isRealSwissparBody(c.body)));
    assert.ok(snap.cards.some((c) => c.ma === "69883" && isRealSwissparBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealSwissparBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.ma === "70272"), "skip EMA-reliance stub mNEXSPIKE");
    assert.ok(!snap.cards.some((c) => c.ma === "67410"), "skip extension SwissPAR");
    assert.ok(snap.cards.every((c) => officialPdfUrl(c.sourceUrl)));
    assert.ok(snap.cards.every((c) => !/ema\.europa|fda\.gov|swissmedicinfo/i.test(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectSwisspar({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.ma === "70227"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.SWISSPAR_DIR;
    else process.env.SWISSPAR_DIR = prevDir;
  }

  console.log("swisspar parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
