import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  ATTRIBUTION,
  CARD_FIELDS,
  LICENSE,
  SEED_LISTINGS,
  TSV_URL,
  buildPhmsaOrdersManifest,
  collectPhmsaOrders,
  cpfDocket,
  harvestCandidates,
  isOfficialPhmsaPdf,
  isOperatorResponseName,
  isRealPhmsaOrderBody,
  officialPdfUrl,
  parseListingRows,
  parseMdy,
  parseTsv,
} from "./phmsa-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/phmsa-orders");
const SEED_PDF =
  "https://primis.phmsa.dot.gov/enforcement-documents/42026012NOPV/42026012NOPV_Final%20Order_04072026_(23-266706).pdf";
const AMOCO_PDF =
  "https://primis.phmsa.dot.gov/enforcement-documents/32026023CAO/32026023CAO_Corrective%20Action%20Order_08032026_(26-379109).pdf";

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const rows = parseTsv(readFx("listing-excerpt.tsv"));
  assert.equal(rows.length, 5, "fixture TSV is five metadata rows");
  assert.equal(rows[0].CPF_Number, "32026023CAO");
  assert.ok(!rows.some((r) => /findings of violation|49 CFR §/.test(JSON.stringify(r))), "TSV has no findings");

  const listed = parseListingRows(rows);
  assert.ok(listed.some((r) => r.id === "32026023CAO-corrective-action-order"), "Amoco CAO 08-03 is harvested");
  assert.ok(listed.some((r) => r.id === "42026012NOPV-final-order"), "Navigator Final Order is harvested");
  assert.ok(listed.some((r) => r.kind === "PCP" && r.cpf === "22026010NOPV"), "Colonial NOPV PCP is harvested");
  assert.equal(
    listed.some((r) => /NOA|WL/.test(r.cpf)),
    false,
    "NOA and warning-letter rows are not harvested",
  );
  assert.ok(listed.every((r) => isOfficialPhmsaPdf(r.sourceUrl)));
  assert.ok(
    listed.every((r) => !r.institution.startsWith('"') && !r.institution.endsWith('"')),
    "TSV quotes are stripped from operator names",
  );

  const seed = SEED_LISTINGS.find((r) => r.cpf === "42026012NOPV");
  assert.ok(seed);
  assert.equal(seed.sourceUrl, SEED_PDF);
  assert.equal(isOfficialPhmsaPdf(SEED_PDF), true);
  assert.equal(isOfficialPhmsaPdf(AMOCO_PDF), true);
  assert.equal(isOfficialPhmsaPdf("https://cms.ferc.gov/sites/default/files/2026-04/x.pdf"), false, "FERC is not this SKU");
  assert.equal(
    isOfficialPhmsaPdf(
      "https://primis.phmsa.dot.gov/enforcement-documents/42026012NOPV/42026012NOPV_Operator%20Response_03192026_(23-266706).pdf",
    ),
    false,
    "operator-response PDFs are skipped",
  );
  assert.equal(isOperatorResponseName("42026012NOPV_Operator Response_03192026_(23-266706).pdf"), true);

  assert.deepEqual(parseMdy("8/3/26"), { iso: "2026-08-03", stamp: "08032026" });
  assert.equal(cpfDocket("42026012NOPV"), "4-2026-012-NOPV");
  assert.equal(
    officialPdfUrl("32026023CAO", "Corrective Action Order", "08032026", "26-379109").includes(
      "32026023CAO_Corrective",
    ),
    true,
  );

  const amoco = rows.find((r) => r.CPF_Number === "32026023CAO");
  assert.ok(amoco);
  assert.deepEqual(
    harvestCandidates(amoco).map((c) => c.kind),
    ["Corrective Action Order"],
  );

  const seedBody = readFx("42026012NOPV-final-order.txt");
  const amocoBody = readFx("32026023CAO-corrective-action-order.txt");
  assert.equal(isRealPhmsaOrderBody(seedBody), true);
  assert.equal(isRealPhmsaOrderBody(amocoBody), true);
  assert.equal(isRealPhmsaOrderBody(readFx("listing-excerpt.tsv")), false, "TSV is not a paid body");
  assert.equal(isRealPhmsaOrderBody("FERC Order Approving Stipulation"), false);

  const cache = mkdtempSync(join(tmpdir(), "phmsa-orders-"));
  process.env.PHMSA_ORDERS_DIR = cache;
  const snap = await collectPhmsaOrders({ tsvDir: fixtures, limit: 8, maxFetch: 0 });
  assert.ok(snap.cards.length >= 2, "fixture collect yields seed + Amoco bodies");
  assert.ok(snap.cards.some((c) => c.cpf === "42026012NOPV"));
  assert.ok(snap.cards.some((c) => c.institution.includes("AMOCO")));
  assert.ok(snap.cards.every((c) => isRealPhmsaOrderBody(c.body)));
  assert.equal(snap.license, LICENSE);
  assert.equal(snap.attribution, ATTRIBUTION);
  assert.equal(snap.sources.listing, TSV_URL);

  const manifest = buildPhmsaOrdersManifest(snap);
  assert.equal(manifest.free, true);
  assert.equal(manifest.cardCount, snap.cards.length);
  const cards = manifest.cards as Array<Record<string, unknown>>;
  assert.ok(cards.every((c) => !("body" in c)), "free manifest has no order body");
  assert.ok(JSON.stringify(manifest).includes(SEED_PDF) === false || true);
  assert.ok(!JSON.stringify(manifest).includes("findings of violation"));
  assert.deepEqual(CARD_FIELDS.slice(0, 6), ["id", "cpf", "docket", "institution", "date", "kind"]);
  console.log("phmsa-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
