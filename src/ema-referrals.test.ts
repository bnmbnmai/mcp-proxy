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
  buildEmaReferralsManifest,
  collectEmaReferrals,
  isCompletedHumanReferral,
  isEnglishReferralPdf,
  isHumanProcedure,
  isPeopleRow,
  isRealEmaReferralBody,
  officialHumanReferralUrl,
  officialReferralPdfUrl,
  parseEmaReferralText,
  parseListingRows,
  parseOfficialReferralIndex,
  pickBestPdf,
  scoreReferralPdf,
} from "./ema-referrals.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ema-referrals");
const TAVNEOS_PDF =
  "https://www.ema.europa.eu/en/documents/referral/tavneos-article-20-procedure-assessment-report_en.pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = parseOfficialReferralIndex(readFx("listing-excerpt.json"));
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 8, "official EMA excerpt lists human referral pages");
  const tavneos = listed.find((r) => r.id === "tavneos");
  assert.ok(tavneos);
  assert.equal(tavneos?.name, "Tavneos");
  assert.equal(tavneos?.inn, "avacopan");
  assert.equal(tavneos?.date, "2026-08-13");
  assert.match(tavneos?.status ?? "", /European Commission final decision/i);
  assert.equal(tavneos?.pageUrl, "https://www.ema.europa.eu/en/medicines/human/referrals/tavneos");
  assert.ok(listed.some((r) => r.id === "tecovirimat-siga"));
  assert.ok(listed.some((r) => r.id === "oxbryta"));
  assert.ok(listed.some((r) => r.id === "ixchiq"));
  assert.ok(listed.some((r) => r.id === "adakveo"));
  assert.ok(!listed.some((r) => /albendazole/i.test(r.name)), "skip veterinary");
  assert.ok(!listed.some((r) => r.id === "jane-q-public-cv"), "skip people");
  assert.ok(listed.every((r) => officialHumanReferralUrl(r.pageUrl)));
  assert.equal(officialHumanReferralUrl("https://www.ema.europa.eu/en/medicines/human/referrals/tavneos"), "https://www.ema.europa.eu/en/medicines/human/referrals/tavneos");
  assert.equal(officialHumanReferralUrl("https://www.swissmedic.ch/swissmedic/en/home/humanarzneimittel/authorisations/swisspar.html"), null);
  assert.equal(officialReferralPdfUrl(TAVNEOS_PDF), TAVNEOS_PDF);
  assert.equal(officialReferralPdfUrl("https://www.ema.europa.eu/en/documents/referral/tavneos-article-20-procedure-notification_en.pdf"), null);
  assert.equal(officialReferralPdfUrl("https://www.ema.europa.eu/en/documents/referral/tavneos-article-20-procedure-assessment-report_de.pdf"), null);
  assert.equal(officialReferralPdfUrl("https://www.swissmedic.ch/dam/swissmedic/en/dokumente/zulassung/swisspar/70227.pdf"), null);
  assert.ok(INDEX_URL.includes("ema.europa.eu") && INDEX_URL.includes("referrals-output-json-report"));

  const rawTavneos = rows.find((r) => (r.referral_url || "").includes("/tavneos"));
  assert.equal(isCompletedHumanReferral(rawTavneos!), true);
  assert.equal(isHumanProcedure(rawTavneos!), true);
  const vet = rows.find((r) => /veterinary/i.test(String(r.category || "")));
  assert.ok(vet);
  assert.equal(isHumanProcedure(vet!), false);
  const people = rows.find((r) => /jane q public/i.test(String(r.name || "")));
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  const under = rows.find((r) => /under evaluation/i.test(String(r.status || "")));
  assert.ok(under);
  assert.equal(isCompletedHumanReferral(under!), false);

  const html = `<ul>
    <a href="/en/documents/referral/tavneos-article-20-procedure-notification_en.pdf">Notification</a>
    <a href="/en/documents/referral/tavneos-article-20-procedure-assessment-report_en.pdf">Assessment report</a>
    <a href="/en/documents/referral/tavneos-article-20-procedure-scientific-conclusions_en.pdf">Scientific conclusions</a>
    <a href="/en/documents/referral/tavneos-article-20-procedure-questions-answers-ema-recommends_en.pdf">EMA recommends</a>
    <a href="/en/documents/referral/tavneos-article-20-procedure-assessment-report_fr.pdf">FR</a>
  </ul>`;
  const best = pickBestPdf(html);
  assert.equal(best?.kind, "assessment-report");
  assert.ok(best?.href.endsWith("assessment-report_en.pdf"));
  assert.ok(isEnglishReferralPdf(TAVNEOS_PDF));
  assert.ok(scoreReferralPdf(TAVNEOS_PDF, "Assessment report") > scoreReferralPdf(
    "https://www.ema.europa.eu/en/documents/referral/tavneos-article-20-procedure-questions-answers_en.pdf",
    "Questions and answers",
  ));

  const tavneosText = parseEmaReferralText(readFx("tavneos.txt"), {
    sourceUrl: TAVNEOS_PDF,
    pageUrl: "https://www.ema.europa.eu/en/medicines/human/referrals/tavneos",
    name: "Tavneos",
    inn: "avacopan",
    date: "2026-08-13",
    status: "European Commission final decision",
    typeOfProcedure: "Article 20 procedures",
    id: "tavneos",
    kind: "assessment-report",
  });
  assert.equal(tavneosText.id, "tavneos");
  assert.equal(tavneosText.name, "Tavneos");
  assert.equal(tavneosText.inn, "avacopan");
  assert.ok(isRealEmaReferralBody(tavneosText.body));
  assert.ok(tavneosText.body.includes("CHMP recommended revocation"));
  assert.ok(tavneosText.body.includes("avacopan"));
  assert.ok(tavneosText.body.includes("ANCA-associated vasculitis"));
  assert.ok(CARD_FIELDS.every((f) => f in tavneosText));

  for (const slug of ["tecovirimat-siga", "oxbryta", "ixchiq", "mysimba", "adakveo", "synapse", "ocaliva"]) {
    const card = parseEmaReferralText(readFx(`${slug}.txt`), {
      sourceUrl: `https://www.ema.europa.eu/en/documents/referral/${slug}-article-20-procedure-assessment-report_en.pdf`,
      pageUrl: `https://www.ema.europa.eu/en/medicines/human/referrals/${slug}`,
      id: slug,
    });
    assert.ok(isRealEmaReferralBody(card.body), `${slug} is official EMA referral TEXT`);
    assert.equal(card.id, slug);
  }

  const teaser = parseEmaReferralText(readFx("teaser.txt"), {
    sourceUrl: "https://www.ema.europa.eu/en/documents/referral/tavneos-article-20-procedure-notification_en.pdf",
    name: "Tavneos",
  });
  assert.equal(isRealEmaReferralBody(teaser.body), false, "notification teaser is not the procedure body");

  const peopleBody = parseEmaReferralText(readFx("people.txt"), {
    sourceUrl: TAVNEOS_PDF,
    name: "Jane Q Public",
  });
  assert.equal(isRealEmaReferralBody(peopleBody.body), false, "people file is not this SKU");

  const wrap = parseEmaReferralText(readFx("json-wrap.txt"), {
    sourceUrl: TAVNEOS_PDF,
    name: "Tavneos",
  });
  assert.equal(isRealEmaReferralBody(wrap.body), false, "official catalog JSON is not the sold unit");

  const swiss = parseEmaReferralText(readFx("swisspar.txt"), {
    sourceUrl: "https://www.swissmedic.ch/dam/swissmedic/en/dokumente/zulassung/swisspar/70227.pdf",
    name: "Rhapsido",
  });
  assert.equal(isRealEmaReferralBody(swiss.body), false, "SwissPAR is not this SKU");

  const manifest = buildEmaReferralsManifest({
    ok: true,
    product: "ema-referral-procedure-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-25T00:00:00.000Z",
    asOf: "2026-08-13",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      index: INDEX_URL,
      pdfHost: "https://www.ema.europa.eu/en/documents/referral/",
      pageHost: "https://www.ema.europa.eu/",
    },
    cards: [tavneosText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.equal((manifest.cards as { name: string }[])[0]?.name, "Tavneos");
  assert.equal((manifest.cards as { id: string }[])[0]?.id, "tavneos");
  assert.ok(!manBlob.includes("CHMP recommended revocation"), "free manifest must not dump procedure text");
  assert.ok(!manBlob.includes("ANCA-associated vasculitis"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(!("inn" in ((manifest.cards as object[])[0] ?? {})));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);

  const cache = mkdtempSync(join(tmpdir(), "ema-referrals-collect-"));
  const prevDir = process.env.EMA_REFERRALS_DIR;
  process.env.EMA_REFERRALS_DIR = cache;
  try {
    const snap = await collectEmaReferrals({ jsonDir: fixtures, limit: 12, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 6, "fixture collect extracts several official referral bodies");
    assert.ok(snap.cards.some((c) => c.id === "tavneos" && isRealEmaReferralBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === "tecovirimat-siga" && isRealEmaReferralBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealEmaReferralBody(c.body)));
    assert.ok(!snap.cards.some((c) => /albendazole/i.test(c.name)), "skip veterinary");
    assert.ok(!snap.cards.some((c) => c.id === "jane-q-public-cv"), "skip people");
    assert.ok(snap.cards.every((c) => officialReferralPdfUrl(c.sourceUrl) || c.sourceUrl.includes("ema.europa.eu")));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectEmaReferrals({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === "tavneos"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 6);
  } finally {
    if (prevDir === undefined) delete process.env.EMA_REFERRALS_DIR;
    else process.env.EMA_REFERRALS_DIR = prevDir;
  }

  console.log("ema-referrals parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
