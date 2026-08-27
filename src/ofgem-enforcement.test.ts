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
  buildOfgemEnforcementManifest,
  collectOfgemEnforcement,
  isOfficialOfgemPdf,
  isPeopleRow,
  isRealOfgemEnforcementBody,
  officialOfgemPdfUrl,
  parseHubHtml,
  parseListingRows,
  parseOfgemEnforcementText,
} from "./ofgem-enforcement.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ofgem-enforcement");
const TOMATO_PENALTY_PDF =
  "https://www.ofgem.gov.uk/sites/default/files/2025-10/Tomato%20Energy%20Limited%20-%20Notice%20of%20Proposal%20to%20Impose%20a%20Penalty.pdf";
const TOMATO_PO_PDF =
  "https://www.ofgem.gov.uk/sites/default/files/2025-07/PO7.Confirmed-Provisional-Order-Tomato-Energy-Ltd-Unsigned.pdf";
const FARRINGDON_PROPOSAL_PDF =
  "https://www.ofgem.gov.uk/sites/default/files/2024-11/Farringdon_Energy_Penalty_Proposal_Notice.pdf";
const FARRINGDON_DECISION_PDF =
  "https://www.ofgem.gov.uk/sites/default/files/2025-06/Farringdon-Energy-PO-Penalty-Notice.pdf";
const SSE_PDF =
  "https://www.ofgem.gov.uk/sites/default/files/2023-07/July%202023%20SSE%20Foyers%20TCLC%20-%20Final%20penalty%20notice.pdf";
const OVO_PDF =
  "https://www.ofgem.gov.uk/sites/default/files/2026-06/Decision%20to%20close%20investigation%20into%20OVO%20Energy%20Limited%20prepayment%20meter%20practices.pdf";
const TOMATO_PENALTY_ID = "Tomato Energy Limited - Notice of Proposal to Impose a Penalty";
const TOMATO_PO_ID = "PO7.Confirmed-Provisional-Order-Tomato-Energy-Ltd-Unsigned";
const FARRINGDON_PROPOSAL_ID = "Farringdon_Energy_Penalty_Proposal_Notice";
const FARRINGDON_DECISION_ID = "Farringdon-Energy-PO-Penalty-Notice";
const SSE_ID = "July 2023 SSE Foyers TCLC - Final penalty notice";
const OVO_ID = "Decision to close investigation into OVO Energy Limited prepayment meter practices";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listing = parseHubHtml(readFx("listing-excerpt.html"), HUB_URL);
  assert.ok(listing.some((r) => r.id === TOMATO_PENALTY_ID), "hub HTML yields Tomato s.27A proposal");
  assert.ok(listing.some((r) => r.id === TOMATO_PO_ID), "hub HTML yields Tomato confirmed PO");
  assert.ok(listing.some((r) => r.id === FARRINGDON_PROPOSAL_ID), "hub HTML yields Farringdon proposal");
  assert.ok(listing.some((r) => r.id === FARRINGDON_DECISION_ID), "hub HTML yields Farringdon decision");
  assert.ok(listing.some((r) => r.id === SSE_ID), "hub HTML yields SSE Foyers TCLC");
  assert.ok(listing.some((r) => r.id === OVO_ID), "hub HTML yields 2026 OVO decision");
  assert.ok(listing.every((r) => officialOfgemPdfUrl(r.sourceUrl)));
  assert.equal(listing.some((r) => /riio|open-data|\.csv/i.test(r.sourceUrl)), false, "skip RIIO/open-data CSV");
  assert.equal(listing.length, 6, "first slice is the six official enforcement PDFs");

  const listed = parseListingRows(SEED_LISTINGS);
  assert.equal(listed.length, 6, "seed lists the six official Ofgem enforcement PDFs");
  assert.ok(listed.every((r) => officialOfgemPdfUrl(r.sourceUrl)));
  assert.equal(officialOfgemPdfUrl(TOMATO_PENALTY_PDF), TOMATO_PENALTY_PDF);
  assert.equal(
    officialOfgemPdfUrl("https://www.ofgem.gov.uk/publications/tomato-energy-limited-failure-maintain-liquidity"),
    null,
    "HTML publication card is the index, not the sold PDF",
  );
  assert.equal(officialOfgemPdfUrl("https://www.ofgem.gov.uk/sites/default/files/2024-01/riio-ed2-open-data.csv"), null);
  assert.ok(isOfficialOfgemPdf(TOMATO_PENALTY_PDF));
  assert.ok(HUB_URL.includes("ofgem.gov.uk"));
  assert.equal(isPeopleRow({ institution: "Jane Q Public", title: "CV of a director", id: "" }), true);
  assert.equal(isPeopleRow({ institution: "Tomato Energy Limited", title: "penalty proposal", id: TOMATO_PENALTY_ID }), false);

  const tomato = parseOfgemEnforcementText(readFx(`${TOMATO_PENALTY_ID}.txt`), {
    sourceUrl: TOMATO_PENALTY_PDF,
    pageUrl: "https://www.ofgem.gov.uk/publications/tomato-energy-limited-failure-maintain-liquidity",
    institution: "Tomato Energy Limited",
    date: "2025-10-10",
    kind: "penalty-proposal",
    id: TOMATO_PENALTY_ID,
  });
  assert.equal(tomato.id, TOMATO_PENALTY_ID);
  assert.ok(isRealOfgemEnforcementBody(tomato.body));
  assert.ok(tomato.body.includes("SLC 4B.1") || tomato.body.includes("SLC.4B.1") || tomato.body.includes("4B.1"));
  assert.ok(tomato.body.includes("gas crisis"));
  assert.ok(tomato.body.includes("Penalty Policy"));
  assert.ok(CARD_FIELDS.every((f) => f in tomato));

  const tomatoPo = parseOfgemEnforcementText(readFx(`${TOMATO_PO_ID}.txt`), {
    sourceUrl: TOMATO_PO_PDF,
    institution: "Tomato Energy Limited",
    date: "2025-07-09",
    kind: "provisional-order",
    id: TOMATO_PO_ID,
  });
  assert.ok(isRealOfgemEnforcementBody(tomatoPo.body), "confirmed provisional order is official Ofgem TEXT");

  const farringdon = parseOfgemEnforcementText(readFx(`${FARRINGDON_PROPOSAL_ID}.txt`), {
    sourceUrl: FARRINGDON_PROPOSAL_PDF,
    institution: "Farringdon Energy Limited",
    date: "2024-11-06",
    id: FARRINGDON_PROPOSAL_ID,
  });
  assert.ok(isRealOfgemEnforcementBody(farringdon.body));

  const farringdonDecision = parseOfgemEnforcementText(readFx(`${FARRINGDON_DECISION_ID}.txt`), {
    sourceUrl: FARRINGDON_DECISION_PDF,
    institution: "Farringdon Energy Limited",
    date: "2025-06-16",
    id: FARRINGDON_DECISION_ID,
  });
  assert.ok(isRealOfgemEnforcementBody(farringdonDecision.body));

  const sse = parseOfgemEnforcementText(readFx(`${SSE_ID}.txt`), {
    sourceUrl: SSE_PDF,
    institution: "SSE Generation Limited",
    date: "2023-07-25",
    id: SSE_ID,
  });
  assert.ok(isRealOfgemEnforcementBody(sse.body), "SSE Foyers TCLC is official Ofgem TEXT");

  const ovo = parseOfgemEnforcementText(readFx(`${OVO_ID}.txt`), {
    sourceUrl: OVO_PDF,
    institution: "OVO Energy Limited",
    date: "2026-06-03",
    id: OVO_ID,
  });
  assert.ok(isRealOfgemEnforcementBody(ovo.body), "2026 OVO closure decision is official Ofgem TEXT");

  const teaser = parseOfgemEnforcementText(readFx("teaser.txt"), {
    sourceUrl: TOMATO_PENALTY_PDF,
    institution: "Tomato Energy Limited",
  });
  assert.equal(isRealOfgemEnforcementBody(teaser.body), false, "HTML publication card is not the notice body");
  assert.ok(!teaser.body.includes("SLC 4B.1"));
  assert.ok(!teaser.body.includes("gas crisis"));
  assert.ok(!teaser.body.includes("Penalty Policy"));

  const peopleBody = parseOfgemEnforcementText(readFx("people.txt"), {
    sourceUrl: TOMATO_PENALTY_PDF,
    institution: "Jane Q Public",
  });
  assert.equal(isRealOfgemEnforcementBody(peopleBody.body), false, "people file is not this SKU");

  const wrap = parseOfgemEnforcementText(readFx("csv-wrap.txt"), {
    sourceUrl: TOMATO_PENALTY_PDF,
    institution: "Tomato Energy Limited",
  });
  assert.equal(isRealOfgemEnforcementBody(wrap.body), false, "RIIO/open-data CSV is not the sold unit");

  const manifest = buildOfgemEnforcementManifest({
    ok: true,
    product: "ofgem-enforcement-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-27T00:00:00.000Z",
    asOf: "2026-06-03",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      index: HUB_URL,
      pdfHost: "https://www.ofgem.gov.uk/sites/default/files/",
    },
    cards: [ovo, tomato, tomatoPo, farringdonDecision, farringdon, sse],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 6);
  assert.equal((manifest.cards as { institution: string }[])[0]?.institution, "OVO Energy Limited");
  assert.equal((manifest.cards as { id: string }[])[0]?.id, OVO_ID);
  assert.ok(!manBlob.includes("SLC 4B.1"), "free manifest must not dump notice body");
  assert.ok(!manBlob.includes("gas crisis"));
  assert.ok(!manBlob.includes("Penalty Policy"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.match(String(manifest.attribution), /Open Government Licence v3\.0/);
  assert.match(String(manifest.attribution), /Logos reserved/);

  const cache = mkdtempSync(join(tmpdir(), "ofgem-enforcement-collect-"));
  const prevDir = process.env.OFGEM_ENFORCEMENT_DIR;
  process.env.OFGEM_ENFORCEMENT_DIR = cache;
  try {
    const snap = await collectOfgemEnforcement({ htmlDir: fixtures, limit: 6, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.equal(snap.cards.length, 6, "first slice harvests the six official bodies");
    assert.equal(snap.asOf, "2026-06-03");
    assert.ok(snap.cards.some((c) => c.id === TOMATO_PENALTY_ID && isRealOfgemEnforcementBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === TOMATO_PO_ID && isRealOfgemEnforcementBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === FARRINGDON_PROPOSAL_ID && isRealOfgemEnforcementBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === FARRINGDON_DECISION_ID && isRealOfgemEnforcementBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === SSE_ID && isRealOfgemEnforcementBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === OVO_ID && isRealOfgemEnforcementBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealOfgemEnforcementBody(c.body)));
    assert.ok(!snap.cards.some((c) => /jane|curriculum vitae/i.test(c.institution)), "skip people");
    assert.ok(snap.cards.every((c) => officialOfgemPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectOfgemEnforcement({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === TOMATO_PENALTY_ID), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 6);
  } finally {
    if (prevDir === undefined) delete process.env.OFGEM_ENFORCEMENT_DIR;
    else process.env.OFGEM_ENFORCEMENT_DIR = prevDir;
  }

  console.log("ofgem-enforcement parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
