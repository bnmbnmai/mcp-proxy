import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BERETTA_ID,
  BERETTA_URL,
  BODY_NEEDLE_BERETTA,
  BODY_NEEDLE_JUAREZ,
  BODY_NEEDLE_OVERLY,
  BODY_NEEDLE_SCOTT,
  CARD_FIELDS,
  FTC_ORDERS_AMOUNT_ATOMIC,
  FTC_ORDERS_MANIFEST_PATH,
  FTC_ORDERS_ONE_AMOUNT_ATOMIC,
  FTC_ORDERS_PATH,
  JUAREZ_ID,
  JUAREZ_URL,
  LICENSE,
  LISTING_URL,
  OVERLY_ID,
  OVERLY_URL,
  PRODUCT_ID,
  SCOTT_ID,
  SCOTT_URL,
  SEED_LISTINGS,
  assembleFtcOrdersSnapshot,
  buildFtcOrdersManifest,
  catalogId,
  collectFtcOrders,
  enrichFtcOrderCard,
  isoDate,
  issuedDateFromBody,
  discoverCaseSlugs,
  filterFtcOrdersManifest,
  isCaseHtmlOnly,
  isCourtListenerMirror,
  isFederalRegisterHtml,
  isFrMirrorBody,
  isRealFtcOrderBody,
  isWarningLetterBody,
  keepListing,
  nearestDocumentDate,
  officialFtcPdfUrl,
  parseCaseHtml,
  parseDocketFromText,
  parseKind,
  parseFtcOrderText,
  writeFtcOrdersSnapshot,
} from "./ftc-orders.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/ftc-orders");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(FTC_ORDERS_PATH, "/ftc-orders");
  assert.equal(FTC_ORDERS_MANIFEST_PATH, "/ftc-orders/manifest.json");
  assert.equal(FTC_ORDERS_AMOUNT_ATOMIC, "50000");
  assert.equal(FTC_ORDERS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(LISTING_URL.includes("ftc.gov/legal-library/browse/cases-proceedings"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === SCOTT_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === OVERLY_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === JUAREZ_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === BERETTA_ID));

  assert.equal(officialFtcPdfUrl(SCOTT_URL), SCOTT_URL);
  assert.equal(officialFtcPdfUrl(` ${OVERLY_URL} `), OVERLY_URL);
  assert.equal(officialFtcPdfUrl(JUAREZ_URL), JUAREZ_URL);
  assert.equal(officialFtcPdfUrl(BERETTA_URL), BERETTA_URL);
  assert.equal(
    officialFtcPdfUrl("https://www.federalregister.gov/documents/2026/08/31/ftc-9449"),
    null,
    "FR HTML is not this bag",
  );
  assert.equal(
    officialFtcPdfUrl("https://www.courtlistener.com/opinion/999999/jason-scott/"),
    null,
    "CourtListener is not this bag",
  );
  assert.equal(
    officialFtcPdfUrl("https://www.ftc.gov/legal-library/browse/warning-letters/vtron-lasers"),
    null,
    "warning-letter nodes are /ftc-wl",
  );
  assert.equal(
    officialFtcPdfUrl("https://www.ftc.gov/system/files/warning-letters/vtron.pdf"),
    null,
    "warning-letter PDF path is /ftc-wl",
  );
  assert.equal(officialFtcPdfUrl("https://www.dea.gov/documents/orders/example.pdf"), null);

  assert.equal(catalogId("9449", "2026-08-31", "jason-scott-dvm-matter"), SCOTT_ID);
  assert.equal(catalogId("", "2026-09-16", "berettaruger"), BERETTA_ID);
  assert.equal(catalogId("9403", "2026-09-17", "182-3000-fleetcor-technologies-matter"), "9403-2026-09-17");
  assert.equal(isoDate("616193.2026.08.31_administrative_law_judge_decision_on_application_for_review_0.pdf"), "2026-08-31");
  assert.equal(isoDate("Beretta-Ruger-Order.pdf"), null);
  assert.equal(parseDocketFromText("Docket No. D-9403"), "9403");
  assert.equal(parseDocketFromText("Docket No. C-4798"), "4798");
  assert.equal(parseDocketFromText("Docket No. C"), "", "unnumbered Commission caption is not a docket");
  assert.equal(issuedDateFromBody("On December 20, 2019, the Federal Trade Commission filed suit"), null);
  assert.equal(issuedDateFromBody("ISSUED:\n\n"), null);
  assert.equal(issuedDateFromBody("FILED 08/31/2026 OSCAR NO. 616193"), "2026-08-31");
  assert.equal(parseKind("Administrative Law Judge Decision on Application for Review"), "ALJ Decision");
  assert.equal(parseKind("Decision of the Administrative Law Judge on Petition for Review"), "ALJ Decision");
  assert.equal(parseKind("Administrative Law Judge Decision On Review"), "ALJ Decision");
  assert.equal(parseKind("Decision and Order"), "Decision and Order");
  assert.equal(parseKind("Agreement Containing Consent Order"), null);
  assert.equal(parseKind("Analysis of Agreement Containing Consent Order to Aid Public Comment"), null);
  assert.equal(
    parseKind("Order Granting Petition for Review, Vacating Administrative Law Judge's Decision, and Remanding for Further Consideration"),
    null,
  );
  assert.equal(parseKind("Complaint"), null);
  assert.equal(
    keepListing({
      kind: "ALJ Decision",
      title: "Administrative Law Judge Decision on Application for Review",
      institution: "Jason Scott, DVM",
      sourceUrl: SCOTT_URL,
      caseUrl: "https://www.ftc.gov/legal-library/browse/cases-proceedings/jason-scott-dvm-matter",
    }),
    true,
  );

  const slugs = discoverCaseSlugs(readFx("listing-excerpt.html"));
  assert.ok(slugs.includes("jason-scott-dvm-matter"), `listing fans out to Scott, got ${slugs.join(",")}`);
  assert.ok(slugs.includes("larry-rickman-overly-matter"));
  assert.ok(slugs.includes("eusabio-juarez-ruffino-matter"));
  assert.ok(slugs.includes("berettaruger"));
  assert.ok(!slugs.includes("adjudicative-proceedings"), "record-type crumb is not a case slug");

  const scottCase = parseCaseHtml(readFx("jason-scott-dvm-matter.html"), "jason-scott-dvm-matter");
  assert.ok(scottCase.some((r) => r.id === SCOTT_ID), `Scott ALJ in case page, got ${scottCase.map((r) => r.id).join(",")}`);
  assert.ok(!scottCase.some((r) => /warning letter|complaint|motion|brief/i.test(r.title)));
  const scott = scottCase.find((r) => r.id === SCOTT_ID);
  assert.equal(scott?.board, "alj");
  assert.equal(scott?.docket, "9449");
  assert.equal(scott?.oscar, "616193");
  assert.match(scott?.institution ?? "", /Jason Scott/i);

  const overlyCase = parseCaseHtml(readFx("larry-rickman-overly-matter.html"), "larry-rickman-overly-matter");
  assert.ok(overlyCase.some((r) => r.id === OVERLY_ID));
  assert.ok(!overlyCase.some((r) => /Vacating Administrative Law Judge/i.test(r.title)));

  const juarezCase = parseCaseHtml(readFx("eusabio-juarez-ruffino-matter.html"), "eusabio-juarez-ruffino-matter");
  assert.ok(juarezCase.some((r) => r.id === JUAREZ_ID));
  assert.ok(!juarezCase.some((r) => /Order on Remand/i.test(r.title)));

  const berettaCase = parseCaseHtml(readFx("berettaruger.html"), "berettaruger");
  assert.ok(berettaCase.some((r) => r.id === BERETTA_ID), `Beretta D&O in case page, got ${berettaCase.map((r) => r.id).join(",")}`);
  assert.ok(!berettaCase.some((r) => /Complaint|Agreement Containing|Analysis of Agreement/i.test(r.title)));
  const beretta = berettaCase.find((r) => r.id === BERETTA_ID);
  assert.equal(beretta?.board, "commission");
  assert.equal(beretta?.kind, "Decision and Order");
  assert.equal(beretta?.date, "2026-09-16");
  assert.equal(beretta?.docket, "", "official PDF caption is Docket No. C with no number");
  assert.equal(beretta?.oscar, "", "Commission D&O filename has no OSCAR prefix");
  const berettaHref = berettaCase.find((r) => r.sourceUrl === BERETTA_URL);
  assert.ok(berettaHref);
  assert.equal(
    nearestDocumentDate(readFx("berettaruger.html"), readFx("berettaruger.html").indexOf("Beretta-Ruger-Order.pdf")),
    "2026-09-16",
  );

  const fleetcorCase = parseCaseHtml(
    readFx("182-3000-fleetcor-technologies-matter.html"),
    "182-3000-fleetcor-technologies-matter",
  );
  const fleetcor = fleetcorCase.find((r) => r.kind === "Decision and Order");
  assert.equal(fleetcor?.docket, "9403");
  assert.equal(fleetcor?.date, "2026-09-17");
  assert.equal(fleetcor?.id, "9403-2026-09-17");
  assert.equal(fleetcor?.oscar, "", "FleetCor D&O filename has no OSCAR prefix");
  assert.equal(fleetcor?.board, "commission");
  const fleetcorText = parseFtcOrderText(readFx("182-3000-fleetcor-technologies-matter.txt"), {
    ...fleetcor!,
    id: "182-3000-fleetcor-technologies-matter",
    date: fleetcor?.date ?? null,
  });
  assert.equal(fleetcorText.docket, "9403");
  assert.equal(fleetcorText.date, "2026-09-17", "case-page date wins over December 20, 2019 lawsuit sentence");
  assert.equal(fleetcorText.id, "9403-2026-09-17");
  const fleetcorBodyOnly = parseFtcOrderText(readFx("182-3000-fleetcor-technologies-matter.txt"), {
    sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/Fleetcor-DecisionandOrder_1.pdf",
    caseUrl: "https://www.ftc.gov/legal-library/browse/cases-proceedings/182-3000-fleetcor-technologies-matter",
    id: "182-3000-fleetcor-technologies-matter",
  });
  assert.equal(fleetcorBodyOnly.docket, "9403");
  assert.equal(fleetcorBodyOnly.date, null, "do not steal the 2019 lawsuit date from the narrative");
  assert.equal(fleetcorBodyOnly.id, "182-3000-fleetcor-technologies-matter");

  assert.ok(isFrMirrorBody(readFx("federalregister.html")));
  assert.ok(isFederalRegisterHtml(readFx("federalregister.html")));
  assert.ok(isCourtListenerMirror(readFx("courtlistener.html")));
  assert.ok(isWarningLetterBody(readFx("warning-letter.txt")));
  assert.ok(isCaseHtmlOnly(readFx("case-only.html")));
  assert.ok(!isRealFtcOrderBody(readFx("federalregister.html")));
  assert.ok(!isRealFtcOrderBody(readFx("courtlistener.html")));
  assert.ok(!isRealFtcOrderBody(readFx("warning-letter.txt")));
  assert.ok(!isRealFtcOrderBody(readFx("case-only.html")));
  assert.ok(isRealFtcOrderBody(readFx("9449-2026-08-31.txt")));
  assert.ok(isRealFtcOrderBody(readFx("9443-2026-01-27.txt")));
  assert.ok(isRealFtcOrderBody(readFx("9444-2026-04-28.txt")));
  assert.ok(isRealFtcOrderBody(readFx("berettaruger-2026-09-16.txt")));
  assert.ok(readFx("9449-2026-08-31.txt").includes(BODY_NEEDLE_SCOTT));
  assert.ok(readFx("9443-2026-01-27.txt").includes(BODY_NEEDLE_OVERLY));
  assert.ok(readFx("9444-2026-04-28.txt").includes(BODY_NEEDLE_JUAREZ));
  assert.ok(readFx("berettaruger-2026-09-16.txt").includes(BODY_NEEDLE_BERETTA));

  const listingHtml = readFx("listing-excerpt.html");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_SCOTT), "index HTML is metadata");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_OVERLY), "index HTML has no Overly Isoxsuprine narrative");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_JUAREZ), "index HTML has no Juarez dipa narrative");
  assert.ok(!listingHtml.includes(BODY_NEEDLE_BERETTA), "index HTML has no Beretta Material Relationship definition");
  const scottHtml = readFx("jason-scott-dvm-matter.html");
  assert.ok(!scottHtml.includes(BODY_NEEDLE_SCOTT), "case page HTML is titles, not the Decision body");

  const cacheDir = mkdtempSync(join(tmpdir(), "ftc-orders-"));
  const prevDir = process.env.FTC_ORDERS_DIR;
  process.env.FTC_ORDERS_DIR = cacheDir;
  const snap = await collectFtcOrders({ htmlDir: fixtures, limit: 4, maxFetch: 0 });
  const dirtyBeretta = snap.cards.find((c) => c.id === BERETTA_ID);
  assert.ok(dirtyBeretta);
  writeFtcOrdersSnapshot({
    ...snap,
    cards: snap.cards.map((c) =>
      c.id === BERETTA_ID
        ? { ...c, id: "berettaruger", date: null, docket: "", oscar: "" }
        : c,
    ),
  });
  const refreshed = await collectFtcOrders({ htmlDir: fixtures, limit: 4, maxFetch: 0 });
  const berettaLive = refreshed.cards.find((c) => c.sourceUrl === BERETTA_URL);
  assert.equal(berettaLive?.id, BERETTA_ID, "refresh upgrades slug-only Commission id to slug-date");
  assert.equal(berettaLive?.date, "2026-09-16");
  assert.equal(refreshed.cards.length, snap.cards.length, "refresh does not fatten the first-slice bag");
  const dirtyFleet = enrichFtcOrderCard(
    {
      id: "182-3000-fleetcor-technologies-matter",
      docket: "9403",
      oscar: "",
      kind: "Decision and Order",
      board: "commission",
      institution: "Fleetcor Technologies",
      date: "2019-12-20",
      title: "Decision and Order",
      filename: "Fleetcor-DecisionandOrder_1.pdf",
      sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/Fleetcor-DecisionandOrder_1.pdf",
      caseUrl: "https://www.ftc.gov/legal-library/browse/cases-proceedings/182-3000-fleetcor-technologies-matter",
      body: readFx("182-3000-fleetcor-technologies-matter.txt"),
    },
    fleetcor,
  );
  assert.equal(dirtyFleet.id, "9403-2026-09-17");
  assert.equal(dirtyFleet.date, "2026-09-17");
  assert.equal(dirtyFleet.docket, "9403");
  if (prevDir === undefined) delete process.env.FTC_ORDERS_DIR;
  else process.env.FTC_ORDERS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 4, `fixture collect caches official FTC order text, got ${snap.cards.length}`);
  assert.ok(snap.cards.some((c) => c.id === SCOTT_ID));
  assert.ok(snap.cards.some((c) => c.id === OVERLY_ID));
  assert.ok(snap.cards.some((c) => c.id === JUAREZ_ID));
  assert.ok(snap.cards.some((c) => c.id === BERETTA_ID));
  assert.ok(snap.cards.every((c) => isRealFtcOrderBody(c.body)));
  assert.ok(snap.cards.every((c) => officialFtcPdfUrl(c.sourceUrl)));
  const seedCard = snap.cards.find((c) => c.id === SCOTT_ID);
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_SCOTT));
  assert.match(seedCard?.institution ?? "", /Jason Scott/i);

  const assembled = assembleFtcOrdersSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildFtcOrdersManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 4);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; id?: string }[];
  assert.ok(freeCards.every((c) => !c.body), "collector manifest cards omit body");
  assert.ok(filterFtcOrdersManifest(manifest, "scott").cardCount);
  assert.ok(filterFtcOrdersManifest(manifest, "9449").cardCount);
  assert.ok(filterFtcOrdersManifest(manifest, "beretta").cardCount);
  assert.ok(parseFtcOrderText(readFx("9449-2026-08-31.txt"), SEED_LISTINGS[0]).body.includes(BODY_NEEDLE_SCOTT));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
