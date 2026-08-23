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
  buildAcmBesluitenManifest,
  collectAcmBesluiten,
  isInstitutionBesluitRow,
  isPeopleRow,
  isRealAcmBesluitBody,
  officialAcmBesluitPdfUrl,
  parseListingHtml,
  parseListingRows,
  parseAcmBesluitText,
  pdfIdFromUrl,
  type AcmBesluitenListingRow,
} from "./acm-besluiten.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/acm-besluiten");
const HOT = "https://www.acm.nl/system/files/documents/boetebesluit-house-of-tickets.pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFx("listing-excerpt.json")) as AcmBesluitenListingRow[];
  const listed = parseListingRows(rows);
  assert.ok(listed.length >= 5, "official ACM excerpt lists company besluiten");
  const hot = listed.find((r) => r.id === "house-of-tickets-201019");
  assert.ok(hot);
  assert.match(hot?.institution ?? "", /House of Tickets B\.V\./i);
  assert.equal(hot?.date, "2026-05-22");
  assert.equal(hot?.zaak, "ACM/26/201019");
  assert.equal(hot?.sourceUrl, HOT);
  assert.ok(listed.some((r) => r.id === "sk-jura-bol-198871"));
  assert.ok(listed.some((r) => r.id === "ommen-gww-196956"));
  assert.ok(listed.some((r) => r.id === "gt-ecom-193961"));
  assert.ok(listed.some((r) => r.id === "eetrip-191276"));
  assert.ok(!listed.some((r) => r.id === "de-heer-a"), "skip people");
  assert.ok(!listed.some((r) => r.id === "house-of-tickets-press"), "skip press HTML");
  assert.ok(!listed.some((r) => r.id === "jsonapi"), "skip jsonapi");
  assert.ok(!listed.some((r) => r.id === "overheid-dataset"), "skip data.overheid.nl");
  assert.ok(!listed.some((r) => r.id === "zuivel-toezegging"), "skip commitments");
  assert.ok(listed.every((r) => officialAcmBesluitPdfUrl(r.sourceUrl)));
  assert.equal(officialAcmBesluitPdfUrl(HOT), HOT);
  assert.equal(
    officialAcmBesluitPdfUrl("https://www.acm.nl/nl/publicaties/boete-house-tickets-voor-misleiding-bij-online-veilingen"),
    null,
  );
  assert.equal(officialAcmBesluitPdfUrl("https://www.acm.nl/jsonapi/node/publication"), null);
  assert.equal(officialAcmBesluitPdfUrl("https://data.overheid.nl/dataset/acm-besluiten"), null);
  assert.equal(officialAcmBesluitPdfUrl("https://www.gov.uk/government/publications/x"), null);
  assert.equal(officialAcmBesluitPdfUrl("https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf"), null);
  assert.equal(officialAcmBesluitPdfUrl("https://www.acm.nl/system/files/documents/boetebesluit-580034.pdf"), null);
  assert.ok(LISTING_URL.includes("acm.nl"));
  assert.equal(SEED_LISTINGS.length, 5);
  assert.ok(SEED_LISTINGS.some((r) => r.docket === "house-of-tickets-201019"));

  const htmlListed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(htmlListed.some((r) => r.id === "house-of-tickets-201019"));
  assert.ok(htmlListed.some((r) => /House of Tickets/i.test(r.institution)));
  assert.ok(htmlListed.some((r) => /GT Ecom/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /de heer A/i.test(r.institution)));
  assert.ok(!htmlListed.some((r) => /jsonapi/i.test(r.title)));

  const people = rows.find((r) => (r.docket ?? "") === "de-heer-a");
  assert.ok(people);
  assert.equal(isPeopleRow(people!), true);
  assert.equal(isInstitutionBesluitRow(people!), false);
  const hotRow = rows.find((r) => r.docket === "house-of-tickets-201019" && officialAcmBesluitPdfUrl(r.sourceUrl ?? ""));
  assert.equal(isInstitutionBesluitRow(hotRow!), true);
  assert.equal(isPeopleRow(hotRow!), false);
  const teaser = rows.find((r) => r.docket === "house-of-tickets-press");
  assert.equal(isInstitutionBesluitRow(teaser!), false, "press HTML is not this SKU");

  const hotText = parseAcmBesluitText(readFx("house-of-tickets-201019.txt"), {
    sourceUrl: HOT,
    institution: "House of Tickets B.V. / Ticketveiling B.V.",
    date: "2026-05-22",
    docket: "house-of-tickets-201019",
    zaak: "ACM/26/201019",
    title: "Boetebesluit",
  });
  assert.equal(hotText.docket, "house-of-tickets-201019");
  assert.match(hotText.institution, /House of Tickets B\.V\./i);
  assert.equal(hotText.date, "2026-05-22");
  assert.equal(hotText.zaak, "ACM/26/201019");
  assert.equal(hotText.title, "Boetebesluit");
  assert.ok(isRealAcmBesluitBody(hotText.body));
  assert.ok(hotText.body.includes("71.420"));
  assert.ok(hotText.body.includes("33.027"));
  assert.ok(hotText.body.includes("plotters"));
  assert.ok(hotText.body.includes("lachende tweede"));
  assert.ok(hotText.body.includes("Leiderdorp"));
  assert.ok(hotText.body.includes("ACM/UIT/679013"));
  assert.ok(CARD_FIELDS.every((f) => f in hotText));
  assert.equal(pdfIdFromUrl(hotText.sourceUrl), "boetebesluit-house-of-tickets.pdf");
  assert.equal(hotText.sourceUrl, HOT);

  for (const [file, docket, url] of [
    [
      "sk-jura-bol-198871.txt",
      "sk-jura-bol-198871",
      "https://www.acm.nl/system/files/documents/openbare-versie-afwijzing-handhavingsverzoek-skcompany-acm.pdf",
    ],
    [
      "ommen-gww-196956.txt",
      "ommen-gww-196956",
      "https://www.acm.nl/system/files/documents/boetebesluit-aanbesteding-gemeente-ommen.pdf",
    ],
    [
      "gt-ecom-193961.txt",
      "gt-ecom-193961",
      "https://www.acm.nl/system/files/documents/boetebesluit-gt-ecom.pdf",
    ],
    [
      "eetrip-191276.txt",
      "eetrip-191276",
      "https://www.acm.nl/system/files/documents/handhavingsbesluit-tegen-energie-exploitatie-detrip-acm.pdf",
    ],
  ] as const) {
    const card = parseAcmBesluitText(readFx(file), { sourceUrl: url, docket });
    assert.ok(isRealAcmBesluitBody(card.body), `${docket} is official ACM besluit TEXT`);
    assert.equal(card.docket, docket);
    assert.ok(officialAcmBesluitPdfUrl(card.sourceUrl));
  }

  const teaserBody = parseAcmBesluitText(readFx("no-body.txt"), {
    sourceUrl: "https://www.acm.nl/nl/publicaties/boete-house-tickets-voor-misleiding-bij-online-veilingen",
    institution: "House of Tickets B.V.",
  });
  assert.equal(isRealAcmBesluitBody(teaserBody.body), false, "press teaser is not the besluit body");
  assert.ok(!teaserBody.body.includes("71.420"));
  assert.ok(!teaserBody.body.includes("33.027"));
  assert.ok(!teaserBody.body.includes("plotters"));
  assert.ok(!teaserBody.body.includes("lachende tweede"));
  assert.ok(!teaserBody.body.includes("Leiderdorp"));
  assert.ok(!teaserBody.body.includes("ACM/UIT/679013"));

  const peopleBody = parseAcmBesluitText(readFx("people.txt"), {
    sourceUrl: HOT,
    institution: "de heer A",
  });
  assert.equal(isRealAcmBesluitBody(peopleBody.body), false, "people file is not this SKU");

  const jsonapi = parseAcmBesluitText(readFx("jsonapi.txt"), {
    sourceUrl: "https://www.acm.nl/jsonapi/node/publication",
    institution: "House of Tickets B.V.",
  });
  assert.equal(isRealAcmBesluitBody(jsonapi.body), false, "jsonapi is a KILL");

  const overheid = parseAcmBesluitText(readFx("overheid.txt"), {
    sourceUrl: "https://data.overheid.nl/dataset/acm-besluiten",
    institution: "Autoriteit Consument en Markt",
  });
  assert.equal(isRealAcmBesluitBody(overheid.body), false, "data.overheid.nl is a KILL");

  const commitment = parseAcmBesluitText(readFx("commitment.txt"), {
    sourceUrl: "https://www.acm.nl/system/files/documents/besluit-op-bezwaar-zuivelnl-definitieve-openbare-versie.pdf",
    institution: "ZuivelNL",
  });
  assert.equal(isRealAcmBesluitBody(commitment.body), false, "commitments/consultaties are a KILL");

  const ico = parseAcmBesluitText(readFx("ico-mpn.txt"), {
    sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
    institution: "Reddit, Inc.",
  });
  assert.equal(isRealAcmBesluitBody(ico.body), false, "ICO /ico-mpn is not this SKU");

  const phmsa = parseAcmBesluitText(readFx("phmsa-cop.txt"), {
    sourceUrl:
      "https://primis.phmsa.dot.gov/enforcement-documents/12025033NOPV/12025033NOPV_Consent%20Agreement%20and%20Order_04212026_(22-259271).pdf",
    institution: "EQT Production Company",
  });
  assert.equal(isRealAcmBesluitBody(phmsa.body), false, "PHMSA /phmsa-cop is not this SKU");

  const govuk = parseAcmBesluitText(readFx("govuk.txt"), {
    sourceUrl: "https://www.gov.uk/government/publications/x",
    institution: "House of Tickets B.V.",
  });
  assert.equal(isRealAcmBesluitBody(govuk.body), false, "GOV.UK is a KILL");

  const manifest = buildAcmBesluitenManifest({
    ok: true,
    product: "acm-institution-besluit-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-23T00:00:00.000Z",
    asOf: "2026-05-22",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: "https://www.acm.nl/system/files/documents/" },
    cards: [hotText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.match((manifest.cards as { institution: string }[])[0]?.institution ?? "", /House of Tickets/i);
  assert.equal((manifest.cards as { zaak: string }[])[0]?.zaak, "ACM/26/201019");
  assert.ok(!manBlob.includes("71.420"), "free manifest must not dump besluit body");
  assert.ok(!manBlob.includes("33.027"));
  assert.ok(!manBlob.includes("plotters"));
  assert.ok(!manBlob.includes("lachende tweede"));
  assert.ok(!manBlob.includes("Leiderdorp"));
  assert.ok(!manBlob.includes("ACM/UIT/679013"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(!("kenmerk" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("house-of-tickets-201019"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "Dutch government publication");
  assert.match(String(manifest.attribution), /Dutch government publication/);

  const cache = mkdtempSync(join(tmpdir(), "acm-besluiten-collect-"));
  const prevDir = process.env.ACM_BESLUITEN_DIR;
  process.env.ACM_BESLUITEN_DIR = cache;
  try {
    const snap = await collectAcmBesluiten({ jsonDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official ACM besluit bodies");
    assert.ok(snap.cards.some((c) => c.docket === "house-of-tickets-201019" && isRealAcmBesluitBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealAcmBesluitBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "de-heer-a"), "skip people");
    assert.ok(!snap.cards.some((c) => c.id === "house-of-tickets-press"), "skip press HTML");
    assert.ok(snap.cards.every((c) => officialAcmBesluitPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectAcmBesluiten({ jsonDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.docket === "house-of-tickets-201019"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.ACM_BESLUITEN_DIR;
    else process.env.ACM_BESLUITEN_DIR = prevDir;
  }

  console.log("acm-besluiten parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
