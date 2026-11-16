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
  CFPB_ORDERS_AMOUNT_ATOMIC,
  CFPB_ORDERS_PATH,
  CFPB_TERMINATIONS,
  applyCfpbOrderStatus,
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
  readSnapshot,
  slugFromActionUrl,
} from "./cfpb-orders.js";
import { decorateExtractedBodyManifest, searchCatalogRows, SINGLE_DOC_AMOUNT_ATOMIC } from "./paid-records.js";

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
      "https://files.consumerfinance.gov/f/documents/cfpb_apple-inc-2024_termination-consent-order_2025-09.pdf",
    ),
    null,
    "a termination order is not the paid consent-order body",
  );
  assert.equal(
    parseActionOrderPdf(
      `<a href="https://files.consumerfinance.gov/f/documents/cfpb_apple-inc-2024_termination-consent-order_2025-09.pdf">term</a>
       <a href="https://files.consumerfinance.gov/f/documents/cfpb_apple-inc-consent-order_2024-10.pdf">order</a>`,
    ),
    "https://files.consumerfinance.gov/f/documents/cfpb_apple-inc-consent-order_2024-10.pdf",
    "collect keeps the consent order when a termination PDF is also linked",
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
  assert.equal(hondaText.status, "in_force");
  assert.equal(hondaText.terminatedDate, null);
  assert.equal(hondaText.terminationFileNo, null);
  assert.equal(hondaText.terminationSourceUrl, null);
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
  assert.equal(wise.status, "in_force", "Wise was amended in May 2025, not terminated");
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
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.equal(manifest.network, "base");
  assert.equal(CFPB_ORDERS_AMOUNT_ATOMIC, "50000");
  assert.equal(CFPB_ORDERS_PATH, "/cfpb-orders");
  assert.equal(SINGLE_DOC_AMOUNT_ATOMIC, "20000");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "CFPB");
  assert.equal((manifest.cards as { status: string }[])[0]?.status, "in_force");
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

    const beforeKeep = Date.now() - 1000;
    const prevListing = process.env.CFPB_ORDERS_LISTING_URL;
    const prevFetchMs = process.env.CFPB_ORDERS_FETCH_MS;
    process.env.CFPB_ORDERS_LISTING_URL = "http://127.0.0.1:9/enforcement/actions/";
    process.env.CFPB_ORDERS_FETCH_MS = "250";
    try {
      const kept = await collectCfpbOrders({ pauseMs: 0, limit: 24, maxFetch: 8 });
      assert.ok(
        kept.cards.some((c) => c.pdfId === "cfpb_american-honda-finance-corp-consent-order_2025-01"),
        "listing timeout/refuse keeps the cached bag",
      );
      assert.ok((kept.reused ?? 0) >= 5);
      assert.equal(kept.addedThisRun, 0);
      assert.ok(kept.reason && /listing failed|collect failed/i.test(kept.reason));
      assert.ok(Date.parse(kept.fetchedAt) >= beforeKeep, "kept bag refreshes fetchedAt so health is not stuck");
    } finally {
      if (prevListing === undefined) delete process.env.CFPB_ORDERS_LISTING_URL;
      else process.env.CFPB_ORDERS_LISTING_URL = prevListing;
      if (prevFetchMs === undefined) delete process.env.CFPB_ORDERS_FETCH_MS;
      else process.env.CFPB_ORDERS_FETCH_MS = prevFetchMs;
    }

    const liveCount = listedCountFromHtml(
      `<div class="m-notification__message">386 filtered results</div><article class="o-post-preview">`,
    );
    assert.equal(liveCount, 386, "live CFPB listing still reports filtered results");
  } finally {
    if (prevDir === undefined) delete process.env.CFPB_ORDERS_DIR;
    else process.env.CFPB_ORDERS_DIR = prevDir;
  }

  function flagged(id: string, date: string, firm: string, fileNo: string | null = null) {
    return parseCfpbOrderText(hondaText.body, {
      sourceUrl: hondaText.sourceUrl,
      firm,
      date,
      actionUrl: `${ACTION_BASE}${id}/`,
      pdfId: hondaText.pdfId,
      id,
      fileNo,
    });
  }

  const apple = flagged("apple-inc", "2024-10-23", "Apple Inc.", "2024-CFPB-0012");
  assert.equal(apple.status, "terminated");
  assert.equal(apple.terminatedDate, "2025-09-22");
  assert.equal(apple.terminationFileNo, "2024-CFPB-0012");
  assert.equal(
    apple.terminationSourceUrl,
    "https://files.consumerfinance.gov/f/documents/cfpb_apple-inc-2024_termination-consent-order_2025-09.pdf",
  );
  assert.ok(isRealCfpbOrderBody(apple.body), "terminated cards stay in the bag");
  assert.equal(flagged("apple-inc", "2024-10-22", "Apple Inc.").status, "in_force", "date must match the termination PDF");
  assert.equal(flagged("wise-us-inc", "2025-01-30", "Wise US Inc.", "2025-CFPB-0004").status, "in_force");
  assert.equal(flagged("goldman-sachs-bank-usa", "2024-10-23", "Goldman Sachs Bank USA").status, "in_force");
  assert.equal(flagged("fay-servicing-llc", "2017-06-07", "Fay Servicing, LLC", "2017-CFPB-0014").status, "in_force");
  assert.equal(flagged("fay-servicing-llc-2024", "2024-08-21", "Fay Servicing, LLC", "2024-CFPB-0007").status, "terminated");
  assert.equal(flagged("toyota-motor-credit-corporation", "2016-02-02", "Toyota Motor Credit Corporation").status, "in_force");
  assert.equal(flagged("us-bank", "2014-09-25", "U.S. Bank National Association", "2014-CFPB-0013").status, "in_force");
  const regions = flagged("regions-bank", "2022-09-28", "Regions Bank", "2015-CFPB-0009");
  assert.equal(regions.status, "terminated");
  assert.equal(regions.terminationFileNo, "2022-CFPB-0008");
  assert.equal(regions.fileNo, "2015-CFPB-0009", "a bad stored fileNo does not block a verified id+date match");

  assert.equal(CFPB_TERMINATIONS.length, 17);
  assert.ok(
    CFPB_TERMINATIONS.every((row) => {
      const url = new URL(row.terminationSourceUrl);
      return url.hostname === "files.consumerfinance.gov" && url.pathname.startsWith("/f/documents/") && url.pathname.endsWith(".pdf");
    }),
  );
  const liveIds = new Set([
    "apple-inc",
    "vystar-credit-union",
    "fay-servicing-llc-2024",
    "navy-federal-credit-union-overdraft-2024",
    "toyota-motor-credit-corporation-2023",
    "citibank-n-a",
    "transunion-trans-union-llc-and-transunion-interactive-inc",
    "us-bank-national-association-prepaid-cards-2023",
    "washington-federal-na",
    "enova-international-inc-2023",
    "planet-home-lending-llc",
    "carrington-mortgage-services-llc",
    "regions-bank",
    "us-bank-national-association",
    "bank-of-america-na-hmda-data-2023",
    "synchrony-bank-fka-ge-capital-retail-bank",
    "washington-federal",
  ]);
  assert.deepEqual(CFPB_TERMINATIONS.map((row) => row.id).sort(), [...liveIds].sort());

  const paired = buildCfpbOrdersManifest({
    ok: true,
    product: "cfpb-consent-order-bodies",
    status: "ok",
    reason: null,
    fetchedAt: "2026-11-16T00:00:00.000Z",
    asOf: "2025-01-30",
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: {
      listing: LISTING_URL,
      actionBase: ACTION_BASE,
      pdfHost: "https://files.consumerfinance.gov/",
    },
    cards: [apple, hondaText],
  });
  assert.equal(paired.cardCount, 2, "terminated cards stay in the catalog count");
  assert.equal(paired.terminatedCount, 1);
  assert.equal(paired.inForceCount, 1);
  const pairedBlob = JSON.stringify(paired);
  assert.ok(!pairedBlob.includes("nearly 35,000"), "free manifest still hides the order body");
  const free = decorateExtractedBodyManifest(paired, { paidPath: "/cfpb-orders" });
  const freeCards = free.cards as {
    id: string;
    status: string;
    terminatedDate: string | null;
    terminationSourceUrl?: string;
    sourceUrl?: string;
    body?: string;
  }[];
  const freeTerminated = freeCards.find((c) => c.id === "apple-inc");
  const freeInForce = freeCards.find((c) => c.id === "american-honda-finance-corporation-2025");
  assert.equal(freeTerminated?.status, "terminated");
  assert.equal(freeTerminated?.terminatedDate, "2025-09-22");
  assert.ok(freeTerminated?.terminationSourceUrl?.includes("cfpb_apple-inc-2024_termination-consent-order_2025-09.pdf"));
  assert.equal(freeTerminated?.sourceUrl, undefined, "consent-order PDF URL stays off the free card");
  assert.equal(freeTerminated?.body, undefined);
  assert.equal(freeInForce?.status, "in_force");
  assert.equal(freeInForce?.sourceUrl, undefined);
  const found = searchCatalogRows(paired.cards as Record<string, unknown>[], "terminated");
  assert.deepEqual(found.map((row) => row.id), ["apple-inc"]);
  const inForceHits = searchCatalogRows(paired.cards as Record<string, unknown>[], "in_force");
  assert.deepEqual(inForceHits.map((row) => row.id), ["american-honda-finance-corporation-2025"]);
  assert.equal(
    searchCatalogRows(paired.cards as Record<string, unknown>[], "cfpb_apple-inc-2024_termination-consent-order_2025-09").length,
    0,
    "free search does not match the termination PDF URL",
  );
  const searched = decorateExtractedBodyManifest(paired, { q: "terminated", paidPath: "/cfpb-orders" });
  assert.equal(searched.matchCount, 1);
  assert.equal((searched.cards as { id: string }[])[0]?.id, "apple-inc");
  assert.ok(!JSON.stringify(searched).includes("nearly 35,000"));

  const bare = applyCfpbOrderStatus({ id: "navy-federal-credit-union-overdraft-2024", date: "2024-11-07" });
  assert.equal(bare.status, "terminated");
  assert.equal(bare.terminationFileNo, "2024-CFPB-0014");
  const prevReadDir = process.env.CFPB_ORDERS_DIR;
  process.env.CFPB_ORDERS_DIR = cache;
  try {
    writeFileSync(
      join(cache, "snapshot.json"),
      JSON.stringify({
        ok: true,
        product: "cfpb-consent-order-bodies",
        status: "ok",
        cards: [{ id: "vystar-credit-union", date: "2024-10-31", firm: "VyStar Credit Union", body: hondaText.body }],
      }),
    );
    const patched = readSnapshot();
    assert.equal(patched?.cards.length, 1);
    assert.equal(patched?.cards[0]?.status, "terminated");
    assert.equal(patched?.cards[0]?.terminatedDate, "2025-07-21");
    assert.equal(patched?.status, "ok", "snapshot health status stays separate from card status");
    assert.ok(patched?.cards[0]?.body.includes("nearly 35,000"), "patch keeps the consent-order text");
  } finally {
    if (prevReadDir === undefined) delete process.env.CFPB_ORDERS_DIR;
    else process.env.CFPB_ORDERS_DIR = prevReadDir;
  }

  console.log("cfpb-orders parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
