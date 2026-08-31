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
  PHMSA_ORDERS_MANIFEST_PATH,
  PHMSA_ORDERS_PATH,
  SEED_LISTINGS,
  buildPhmsaOrdersManifest,
  buildPhmsaOrdersPaidPage,
  collectPhmsaOrders,
  filterPhmsaOrdersManifest,
  isOfficialPhmsaOrderPdf,
  isOperatorResponseRow,
  isPeopleRow,
  isRealPhmsaOrderBody,
  officialPhmsaOrderPdfUrl,
  parseHubHtml,
  parseListingRows,
  parsePhmsaOrderText,
} from "./phmsa-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/phmsa-orders");

const AMOCO_PDF =
  "https://primis.phmsa.dot.gov/enforcement-documents/32026023CAO/32026023CAO_Corrective%20Action%20Order_08032026_(26-379109)_text.pdf";
const GULF_PDF =
  "https://primis.phmsa.dot.gov/enforcement-documents/32026020CAO/32026020CAO_Corrective%20Action%20Order_05162026_(26-372495).pdf";
const NAV_PDF =
  "https://primis.phmsa.dot.gov/enforcement-documents/42026012NOPV/42026012NOPV_Final%20Order_04072026_(23-266706).pdf";
const VALERO_PDF =
  "https://primis.phmsa.dot.gov/enforcement-documents/42026004NOPV/42026004NOPV_Final%20Order_04012026_(25-329817).pdf";
const ETC_PDF =
  "https://primis.phmsa.dot.gov/enforcement-documents/42025049NOPV/42025049NOPV_Final%20Order_03262026_(24-296979).pdf";
const ENT_PDF =
  "https://primis.phmsa.dot.gov/enforcement-documents/42026005CAO/42026005CAO_Corrective%20Action%20Order_02172026_(26-364755).pdf";

const AMOCO_ID = "3-2026-023-cao";
const GULF_ID = "3-2026-020-cao";
const NAV_ID = "4-2026-012-nopv";
const VALERO_ID = "4-2026-004-nopv";
const ETC_ID = "4-2025-049-nopv";
const ENT_ID = "4-2026-005-cao";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listing = parseHubHtml(readFx("listing-excerpt.html"), HUB_URL);
  assert.ok(listing.some((r) => r.id === AMOCO_ID), "hub HTML yields Amoco 2026-08-03 CAO");
  assert.ok(listing.some((r) => r.id === GULF_ID), "hub HTML yields Gulf South CAO");
  assert.ok(listing.some((r) => r.id === NAV_ID), "hub HTML yields 4-2026-012-NOPV Final Order");
  assert.ok(listing.some((r) => r.id === VALERO_ID), "hub HTML yields Valero Final Order");
  assert.ok(listing.some((r) => r.id === ETC_ID), "hub HTML yields Energy Transfer Final Order");
  assert.ok(listing.some((r) => r.id === ENT_ID), "hub HTML yields Enterprise CAO");
  assert.ok(listing.every((r) => officialPhmsaOrderPdfUrl(r.sourceUrl)));
  assert.equal(
    listing.some((r) => /operator.response|NARRATIVE|Raw Data/i.test(r.sourceUrl)),
    false,
    "skip operator-response, incident NARRATIVE, and primis TSV",
  );
  assert.equal(listing.length, 6, "first slice is the six official PHMSA-authored PDFs");

  const listed = parseListingRows(SEED_LISTINGS);
  assert.equal(listed.length, 6, "seed lists the six official PHMSA enforcement PDFs");
  assert.ok(listed.every((r) => officialPhmsaOrderPdfUrl(r.sourceUrl)));
  assert.equal(officialPhmsaOrderPdfUrl(NAV_PDF), NAV_PDF);
  assert.equal(
    officialPhmsaOrderPdfUrl("https://primis.phmsa.dot.gov/enforcement-data/operator/395"),
    null,
    "enforcement-data TSV/operator card is not the sold PDF",
  );
  assert.equal(
    officialPhmsaOrderPdfUrl(
      "https://primis.phmsa.dot.gov/enforcement-documents/PHMSA%20Pipeline%20Enforcement%20Raw%20Data.txt",
    ),
    null,
    "primis TSV / Raw Data.txt is dates/penalties only — not sold",
  );
  assert.equal(
    officialPhmsaOrderPdfUrl(
      "https://primis.phmsa.dot.gov/enforcement-documents/42026012NOPV/42026012NOPV_Operator_Response_03192026.pdf",
    ),
    null,
    "operator-response PDF is not this SKU",
  );
  assert.equal(
    officialPhmsaOrderPdfUrl(
      "https://primis.phmsa.dot.gov/enforcement-documents/27nc-rsge/PHMSA_incident_NARRATIVE.zip",
    ),
    null,
    "killed incident NARRATIVE zip is not this SKU",
  );
  assert.equal(
    officialPhmsaOrderPdfUrl(
      "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000.pdf",
    ),
    null,
    "FERC PDFs stay on /ferc-orders",
  );
  assert.ok(isOfficialPhmsaOrderPdf(NAV_PDF));
  assert.ok(HUB_URL.includes("primis.phmsa.dot.gov/enforcement-documents"));
  assert.equal(isPeopleRow({ institution: "Jane Q Public", title: "CV of a director", id: "" }), true);
  assert.equal(isPeopleRow({ institution: "Amoco Oil Company", title: "Corrective Action Order", id: AMOCO_ID }), false);
  assert.equal(
    isOperatorResponseRow({
      title: "Operator Response to the Notice",
      sourceUrl: "https://primis.phmsa.dot.gov/enforcement-documents/42026012NOPV/42026012NOPV_Operator_Response.pdf",
      id: "operator-response",
    }),
    true,
  );

  const amoco = parsePhmsaOrderText(readFx(`${AMOCO_ID}.txt`), {
    sourceUrl: AMOCO_PDF,
    institution: "Amoco Oil Company",
    date: "2026-08-03",
    kind: "corrective-action-order",
    id: AMOCO_ID,
    docket: "3-2026-023-CAO",
    title: "Corrective Action Order — CPF 3-2026-023-CAO",
  });
  assert.equal(amoco.id, AMOCO_ID);
  assert.ok(isRealPhmsaOrderBody(amoco.body));
  assert.ok(amoco.body.includes("Rouge Pipeline"));
  assert.ok(amoco.body.includes("Whiting Refinery"));
  assert.ok(CARD_FIELDS.every((f) => f in amoco));

  const gulf = parsePhmsaOrderText(readFx(`${GULF_ID}.txt`), {
    sourceUrl: GULF_PDF,
    institution: "Gulf South Pipeline Company, LLC",
    date: "2026-05-16",
    kind: "corrective-action-order",
    id: GULF_ID,
  });
  assert.ok(isRealPhmsaOrderBody(gulf.body));
  assert.ok(gulf.body.includes("Choudrant"));

  const nav = parsePhmsaOrderText(readFx(`${NAV_ID}.txt`), {
    sourceUrl: NAV_PDF,
    institution: "Canyon Crossing LLC / Navigator Panhandle Holdco LLC",
    date: "2026-04-07",
    kind: "final-order",
    id: NAV_ID,
    docket: "4-2026-012-NOPV",
  });
  assert.ok(isRealPhmsaOrderBody(nav.body), "4-2026-012-NOPV Final Order (~9 pp) is official PHMSA TEXT");
  assert.ok(nav.body.includes("$62,900"));
  assert.ok(nav.body.includes("195.452"));

  const valero = parsePhmsaOrderText(readFx(`${VALERO_ID}.txt`), {
    sourceUrl: VALERO_PDF,
    institution: "Valero Partners Operating Co., LLC",
    date: "2026-04-01",
    kind: "final-order",
    id: VALERO_ID,
  });
  assert.ok(isRealPhmsaOrderBody(valero.body));
  assert.ok(valero.body.includes("195.428"));

  const etc = parsePhmsaOrderText(readFx(`${ETC_ID}.txt`), {
    sourceUrl: ETC_PDF,
    institution: "Energy Transfer Company",
    date: "2026-03-26",
    kind: "final-order",
    id: ETC_ID,
  });
  assert.ok(isRealPhmsaOrderBody(etc.body));
  assert.ok(etc.body.includes("Sunoco Lea to Midland"));

  const ent = parsePhmsaOrderText(readFx(`${ENT_ID}.txt`), {
    sourceUrl: ENT_PDF,
    institution: "Enterprise Products Operating, LLC",
    date: "2026-02-17",
    kind: "corrective-action-order",
    id: ENT_ID,
  });
  assert.ok(isRealPhmsaOrderBody(ent.body));
  assert.ok(ent.body.includes("East Leg Loop"));

  const teaser = parsePhmsaOrderText(readFx("teaser.txt"), {
    sourceUrl: NAV_PDF,
    institution: "Canyon Crossing LLC / Navigator Panhandle Holdco LLC",
  });
  assert.equal(isRealPhmsaOrderBody(teaser.body), false, "case-card teaser is not the order body");
  assert.ok(!teaser.body.includes("$62,900"));

  const reply = parsePhmsaOrderText(readFx("operator-response.txt"), {
    sourceUrl: NAV_PDF,
    institution: "Canyon Crossing LLC",
  });
  assert.equal(isRealPhmsaOrderBody(reply.body), false, "operator-response letter is not this SKU");

  const narrative = parsePhmsaOrderText(readFx("incident-narrative.txt"), {
    sourceUrl: NAV_PDF,
    institution: "Amoco Oil Company",
  });
  assert.equal(isRealPhmsaOrderBody(narrative.body), false, "incident NARRATIVE zip is not this SKU");

  const tsv = parsePhmsaOrderText(readFx("tsv-wrap.txt"), {
    sourceUrl: NAV_PDF,
    institution: "NAVIGATOR PANHANDLE HOLDCO LLC",
  });
  assert.equal(isRealPhmsaOrderBody(tsv.body), false, "primis TSV is dates/penalties only");

  const peopleBody = parsePhmsaOrderText(readFx("people.txt"), {
    sourceUrl: NAV_PDF,
    institution: "Jane Q Public",
  });
  assert.equal(isRealPhmsaOrderBody(peopleBody.body), false, "people file is not this SKU");

  const ferc = parsePhmsaOrderText(readFx("ferc-order.txt"), {
    sourceUrl: NAV_PDF,
    institution: "Interstate Power and Light Company",
  });
  assert.equal(isRealPhmsaOrderBody(ferc.body), false, "FERC stipulation stays on /ferc-orders");

  const manifest = buildPhmsaOrdersManifest({
    ok: true,
    product: "phmsa-enforcement-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-31T00:00:00.000Z",
    asOf: "2026-08-03",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: HUB_URL, pdfHost: "https://primis.phmsa.dot.gov/enforcement-documents/" },
    cards: [amoco, gulf, nav, valero, etc, ent],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 6);
  assert.equal((manifest.cards as { institution: string }[])[0]?.institution, "Amoco Oil Company");
  assert.equal((manifest.cards as { id: string }[])[0]?.id, AMOCO_ID);
  assert.ok(!manBlob.includes("Rouge Pipeline"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("$62,900"));
  assert.ok(!manBlob.includes("Choudrant"));
  assert.ok(!manBlob.includes("East Leg Loop"));
  assert.ok(!manBlob.includes("Sunoco Lea to Midland"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, LICENSE);
  assert.match(String(manifest.attribution), /17 U\.S\.C/);
  assert.equal(PHMSA_ORDERS_PATH, "/phmsa-orders");
  assert.equal(PHMSA_ORDERS_MANIFEST_PATH, "/phmsa-orders/manifest.json");

  const searched = filterPhmsaOrdersManifest(manifest, "amoco");
  assert.equal(searched.cardCount, 1);
  assert.equal((searched.cards as { id: string }[])[0]?.id, AMOCO_ID);

  const paidOne = buildPhmsaOrdersPaidPage(
    {
      ok: true,
      product: "phmsa-enforcement-order-bodies",
      status: "ok",
      reason: null,
      fetchedAt: "2026-08-31T00:00:00.000Z",
      asOf: "2026-08-03",
      license: LICENSE,
      attribution: ATTRIBUTION,
      sources: { index: HUB_URL, pdfHost: "https://primis.phmsa.dot.gov/enforcement-documents/" },
      cards: [amoco, gulf, nav, valero, etc, ent],
    },
    { id: NAV_ID },
  );
  assert.equal(paidOne.recordCount, 1);
  assert.equal((paidOne.records as { type: string }[])[0]?.type, "phmsa-orders");
  assert.ok(JSON.stringify(paidOne).includes("$62,900"), "paid ?id= includes the official text");

  const cache = mkdtempSync(join(tmpdir(), "phmsa-orders-collect-"));
  const prevDir = process.env.PHMSA_ORDERS_DIR;
  process.env.PHMSA_ORDERS_DIR = cache;
  try {
    const snap = await collectPhmsaOrders({ htmlDir: fixtures, limit: 6, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.equal(snap.cards.length, 6, "first slice harvests the six official bodies");
    assert.equal(snap.asOf, "2026-08-03");
    assert.ok(snap.cards.some((c) => c.id === AMOCO_ID && isRealPhmsaOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === GULF_ID && isRealPhmsaOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === NAV_ID && isRealPhmsaOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === VALERO_ID && isRealPhmsaOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === ETC_ID && isRealPhmsaOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.id === ENT_ID && isRealPhmsaOrderBody(c.body)));
    assert.ok(snap.cards.every((c) => isRealPhmsaOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => /jane|curriculum vitae/i.test(c.institution)), "skip people");
    assert.ok(snap.cards.every((c) => officialPhmsaOrderPdfUrl(c.sourceUrl)));

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectPhmsaOrders({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.id === AMOCO_ID), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 6);
  } finally {
    if (prevDir === undefined) delete process.env.PHMSA_ORDERS_DIR;
    else process.env.PHMSA_ORDERS_DIR = prevDir;
  }

  console.log("phmsa-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
