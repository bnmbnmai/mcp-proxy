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
  ACTION_BASE,
  buildCfpbOrdersManifest,
  collectCfpbOrders,
  isPeopleOnlyFirm,
  isRealCfpbOrderBody,
  listedCountFromHtml,
  officialCfpbActionUrl,
  officialCfpbPdfUrl,
  parseActionOrderPdf,
  parseCfpbOrderText,
  parseListingHtml,
  pdfIdFromUrl,
  slugFromActionUrl,
} from "./cfpb-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/cfpb-orders");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(listed.length >= 5, "official CFPB excerpt lists company enforcement actions");
  const honda = listed.find((r) => r.id === "american-honda-finance-corporation-2025");
  assert.ok(honda);
  assert.equal(honda?.firm, "American Honda Finance Corporation");
  assert.equal(honda?.date, "2025-01-17");
  assert.equal(honda?.actionUrl, `${ACTION_BASE}american-honda-finance-corporation-2025/`);
  assert.equal(slugFromActionUrl(honda?.actionUrl ?? ""), "american-honda-finance-corporation-2025");
  assert.ok(listed.some((r) => r.id === "wise-us-inc"));
  assert.ok(listed.some((r) => r.id === "equifax-inc-and-equifax-information-services-llc"));
  assert.ok(listed.some((r) => r.id === "block-inc"));
  assert.ok(listed.some((r) => r.id === "performant-recovery-inc"));
  assert.ok(!listed.some((r) => r.id === "dr-jane-q-public"), "skip people-only");
  assert.ok(listed.every((r) => officialCfpbActionUrl(r.actionUrl)));
  assert.equal(officialCfpbPdfUrl("https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf"), null);
  assert.equal(officialCfpbPdfUrl("https://www.fda.gov/media/193344/download"), null);
  assert.equal(officialCfpbPdfUrl("https://apify.com/mibedk/cfpb-enforcement-monitor"), null);
  assert.equal(
    officialCfpbPdfUrl(
      "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
    ),
    "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
  );
  assert.equal(
    officialCfpbPdfUrl(
      "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-stipulation_2025-01.pdf",
    ),
    null,
    "stipulation is not the order body",
  );
  assert.equal(
    officialCfpbPdfUrl(
      "https://files.consumerfinance.gov/f/documents/cfpb_synapse-financial-technologies_complaint_2025-08.pdf",
    ),
    null,
    "complaint PDF is not this SKU",
  );
  assert.ok(LISTING_URL.includes("/enforcement/actions"));
  assert.equal(isPeopleOnlyFirm("Dr. Jane Q. Public"), true);
  assert.equal(isPeopleOnlyFirm("American Honda Finance Corporation"), false);
  assert.equal(isPeopleOnlyFirm("Block, Inc."), false);

  const hondaPage = readFx("american-honda-finance-corporation-2025.html");
  assert.ok(hondaPage.includes("cfpb_american-honda-finance-corp-consent-order_2025-01.pdf"));
  assert.ok(/\$2\.5 million/i.test(hondaPage), "Honda action HTML is the $2.5M teaser");
  assert.ok(!/nearly 35,000/i.test(hondaPage), "Honda action HTML does not leak numbered findings");
  assert.ok(!/Appendix E/i.test(hondaPage));
  assert.ok(!/Furnisher Rule/i.test(hondaPage));
  assert.ok(!/wiring instructions/i.test(hondaPage));
  assert.equal(
    parseActionOrderPdf(hondaPage),
    "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
  );

  const wisePage = readFx("wise-us-inc.html");
  assert.equal(
    parseActionOrderPdf(wisePage),
    "https://files.consumerfinance.gov/f/documents/cfpb_wise-us-inc_amended-consent-order_2025-05.pdf",
    "prefer the amended consent order when both exist",
  );

  const synapsePage = readFx("synapse-financial-technologies-inc.html");
  assert.equal(parseActionOrderPdf(synapsePage), null, "complaint-only action is not this SKU");

  const hondaText = parseCfpbOrderText(
    readFx("cfpb_american-honda-finance-corp-consent-order_2025-01.txt"),
    {
      sourceUrl:
        "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
      firm: "American Honda Finance Corporation",
      date: "2025-01-17",
      actionUrl: honda!.actionUrl,
      pdfId: "cfpb_american-honda-finance-corp-consent-order_2025-01",
      id: "american-honda-finance-corporation-2025",
    },
  );
  assert.equal(hondaText.pdfId, "cfpb_american-honda-finance-corp-consent-order_2025-01");
  assert.equal(hondaText.firm, "American Honda Finance Corporation");
  assert.equal(hondaText.date, "2025-01-17");
  assert.equal(hondaText.fileNo, "2025-CFPB-0003");
  assert.equal(hondaText.title, "Consent Order");
  assert.ok(isRealCfpbOrderBody(hondaText.body));
  assert.ok(hondaText.body.includes("nearly 35,000"));
  assert.ok(hondaText.body.includes("Appendix E"));
  assert.ok(hondaText.body.includes("Furnisher Rule"));
  assert.ok(/wiring instructions/i.test(hondaText.body));
  assert.ok(CARD_FIELDS.every((f) => f in hondaText));
  assert.ok(!/archive\.org|apify\.com|complaint_what_happened/i.test(hondaText.sourceUrl));
  assert.equal(pdfIdFromUrl(hondaText.sourceUrl), "cfpb_american-honda-finance-corp-consent-order_2025-01");

  const equifax = parseCfpbOrderText(readFx("cfpb_equifax-inc-consent-order_2025-01.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_equifax-inc-consent-order_2025-01.pdf",
    firm: "Equifax, Inc. and Equifax Information Services LLC",
    pdfId: "cfpb_equifax-inc-consent-order_2025-01",
  });
  assert.ok(isRealCfpbOrderBody(equifax.body));
  assert.equal(equifax.fileNo, "2025-CFPB-0002");
  assert.ok(equifax.body.includes("consumer credit file dispute"));

  const block = parseCfpbOrderText(readFx("cfpb_block-inc-consent-order_2025-01.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_block-inc-consent-order_2025-01.pdf",
    firm: "Block, Inc.",
    pdfId: "cfpb_block-inc-consent-order_2025-01",
  });
  assert.ok(isRealCfpbOrderBody(block.body));
  assert.equal(block.fileNo, "2025-CFPB-0001");
  assert.ok(block.body.includes("Cash App"));

  const performant = parseCfpbOrderText(readFx("cfpb_performant-recovery-inc-consent-order_12-2024.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_performant-recovery-inc-consent-order_12-2024.pdf",
    firm: "Performant Recovery, Inc.",
    pdfId: "cfpb_performant-recovery-inc-consent-order_12-2024",
  });
  assert.ok(isRealCfpbOrderBody(performant.body));
  assert.equal(performant.fileNo, "2024-CFPB-0016");
  assert.ok(performant.body.includes("Federal Family Education"));

  const wise = parseCfpbOrderText(readFx("cfpb_wise-us-inc_amended-consent-order_2025-05.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_wise-us-inc_amended-consent-order_2025-05.pdf",
    firm: "Wise US Inc.",
    pdfId: "cfpb_wise-us-inc_amended-consent-order_2025-05",
  });
  assert.ok(isRealCfpbOrderBody(wise.body));
  assert.equal(wise.fileNo, "2025-CFPB-0004");
  assert.equal(wise.title, "Amended Consent Order");
  assert.ok(wise.body.includes("remittance transfer provider"));

  const teaser = parseCfpbOrderText(readFx("no-body.txt"), {
    sourceUrl: LISTING_URL,
    firm: "American Honda Finance Corporation",
  });
  assert.equal(isRealCfpbOrderBody(teaser.body), false, "index/action teaser is not the order body");

  const dump = parseCfpbOrderText(readFx("complaint-database.txt"), {
    sourceUrl: "https://www.consumerfinance.gov/data-research/consumer-complaints/",
    firm: "EQUIFAX, INC.",
  });
  assert.equal(isRealCfpbOrderBody(dump.body), false, "Consumer Complaint Database is a KILL");

  const ftc = parseCfpbOrderText(readFx("ftc-warning-letter.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
    firm: "Vtron Inc. d/b/a Vtron Lasers",
  });
  assert.equal(isRealCfpbOrderBody(ftc.body), false, "FTC /ftc-wl is not this SKU");

  const stip = parseCfpbOrderText(readFx("stipulation-only.txt"), {
    sourceUrl: "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-stipulation_2025-01.pdf",
    firm: "American Honda Finance Corporation",
  });
  assert.equal(isRealCfpbOrderBody(stip.body), false, "stipulation-only is not the order body");

  const manifest = buildCfpbOrdersManifest({
    ok: true,
    product: "cfpb-consent-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    asOf: "2025-01-17",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      actionBase: ACTION_BASE,
      pdfHost: "https://files.consumerfinance.gov/",
    },
    cards: [hondaText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.equal((manifest.cards as { firm: string }[])[0]?.firm, "American Honda Finance Corporation");
  assert.equal((manifest.cards as { id: string }[])[0]?.id, "american-honda-finance-corporation-2025");
  assert.ok(!manBlob.includes("nearly 35,000"), "free manifest must not dump order body");
  assert.ok(!manBlob.includes("Appendix E"));
  assert.ok(!manBlob.includes("Furnisher Rule"));
  assert.ok(!manBlob.includes("wiring instructions"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("cfpb_american-honda-finance-corp-consent-order_2025-01"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "CFPB");
  assert.ok(!manBlob.includes("complaint_what_happened"));
  assert.ok(!manBlob.includes("vtron-lasers"));

  const cache = mkdtempSync(join(tmpdir(), "cfpb-orders-collect-"));
  const prevDir = process.env.CFPB_ORDERS_DIR;
  process.env.CFPB_ORDERS_DIR = cache;
  try {
    const snap = await collectCfpbOrders({ htmlDir: fixtures, limit: 10, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok(snap.cards.length >= 5, "fixture collect extracts five official CFPB consent-order bodies");
    assert.ok(
      snap.cards.some(
        (c) => c.pdfId === "cfpb_american-honda-finance-corp-consent-order_2025-01" && isRealCfpbOrderBody(c.body),
      ),
    );
    assert.ok(snap.cards.some((c) => c.pdfId === "cfpb_equifax-inc-consent-order_2025-01" && isRealCfpbOrderBody(c.body)));
    assert.ok(snap.cards.some((c) => c.pdfId === "cfpb_block-inc-consent-order_2025-01" && isRealCfpbOrderBody(c.body)));
    assert.ok(
      snap.cards.some((c) => c.pdfId === "cfpb_performant-recovery-inc-consent-order_12-2024" && isRealCfpbOrderBody(c.body)),
    );
    assert.ok(
      snap.cards.some((c) => c.pdfId === "cfpb_wise-us-inc_amended-consent-order_2025-05" && isRealCfpbOrderBody(c.body)),
    );
    assert.ok(snap.cards.every((c) => isRealCfpbOrderBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.id === "synapse-financial-technologies-inc"), "skip complaint-only");
    assert.ok(!snap.cards.some((c) => c.id === "dr-jane-q-public"), "skip people-only");
    assert.ok(snap.cards.every((c) => officialCfpbPdfUrl(c.sourceUrl)));
    assert.ok(snap.cards.every((c) => !/archive\.org|apify\.com|ftc\.gov|fda\.gov/i.test(c.sourceUrl)));
    assert.equal(listedCountFromHtml(readFx("listing-excerpt.html")), 386);

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectCfpbOrders({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(
      merged.cards.some((c) => c.pdfId === "cfpb_american-honda-finance-corp-consent-order_2025-01"),
      "re-collect keeps cached bodies",
    );
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.CFPB_ORDERS_DIR;
    else process.env.CFPB_ORDERS_DIR = prevDir;
  }

  console.log("cfpb-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
