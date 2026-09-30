import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTRIBUTION,
  BODY_NEEDLE_R7685,
  BODY_NEEDLE_R7687,
  BODY_NEEDLE_R7688,
  BODY_NEEDLE_R7690,
  CARD_FIELDS,
  HUB_URL,
  LICENSE,
  LISTING_URL,
  NMB_DETERMINATIONS_AMOUNT_ATOMIC,
  NMB_DETERMINATIONS_MANIFEST_PATH,
  NMB_DETERMINATIONS_ONE_AMOUNT_ATOMIC,
  NMB_DETERMINATIONS_PATH,
  PRODUCT_ID,
  R7685_ID,
  R7685_URL,
  R7687_ID,
  R7687_URL,
  R7688_ID,
  R7688_URL,
  R7690_ID,
  R7690_URL,
  SEED_LISTINGS,
  assembleNmbDeterminationsSnapshot,
  buildNmbDeterminationsManifest,
  collectNmbDeterminations,
  discoverFyPageUrls,
  filterNmbDeterminationsManifest,
  isCommentsRss,
  isHtmlDetermination,
  isIndexHtml,
  isJsonFullText,
  isJurisdictionalOpinion,
  isPebReport,
  isRealNmbDeterminationBody,
  isRepresentationManual,
  keepListing,
  kindFromDisposition,
  officialNmbPdfUrl,
  parseNmbDeterminationText,
  parseNmbDeterminationsHtml,
  volumeFromHtml,
} from "./nmb-determinations.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/nmb-determinations");
const MANUAL_URL = "https://nmb.gov/NMB_Application/wp-content/uploads/2025/03/Rep-Manual-2024-July-1-4-1.pdf";
const PEB_URL = "https://nmb.gov/NMB_Application/wp-content/uploads/2026/03/PEB-254-Report.pdf";
const HEARING_URL =
  "https://nmb.gov/NMB_Application/wp-content/uploads/2025/11/Hearing-Notice-PEB-253-20251105-1.pdf";

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(NMB_DETERMINATIONS_PATH, "/nmb-determinations");
  assert.equal(NMB_DETERMINATIONS_MANIFEST_PATH, "/nmb-determinations/manifest.json");
  assert.equal(NMB_DETERMINATIONS_AMOUNT_ATOMIC, "50000");
  assert.equal(NMB_DETERMINATIONS_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(LISTING_URL.includes("/fy2026-determinations"));
  assert.ok(HUB_URL.includes("/agency-determinations"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === R7687_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === R7688_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === R7690_ID));
  assert.equal(SEED_LISTINGS.some((r) => r.id === R7685_ID), false, "53 NMB No. 29 is a listing row, not a frozen seed");

  assert.equal(officialNmbPdfUrl(R7687_URL), R7687_URL);
  assert.equal(officialNmbPdfUrl(` ${R7688_URL} `), R7688_URL);
  assert.equal(officialNmbPdfUrl(R7690_URL), R7690_URL);
  assert.equal(officialNmbPdfUrl(R7685_URL), R7685_URL);
  assert.equal(officialNmbPdfUrl(R7687_URL.replace("https://nmb.gov", "http://www.nmb.gov")), R7687_URL);
  assert.equal(officialNmbPdfUrl(MANUAL_URL), null, "Representation Manual is not a determination PDF");
  assert.equal(officialNmbPdfUrl(PEB_URL), null, "PEB reports are not this bag");
  assert.equal(officialNmbPdfUrl(HEARING_URL), null, "PEB hearing notices are not this bag");
  assert.equal(officialNmbPdfUrl("https://nmb.gov/NMB_Application/index.php/comments/feed/"), null, "comments RSS is not a PDF");
  assert.equal(officialNmbPdfUrl(LISTING_URL), null, "FY HTML index is not the PDF");
  assert.equal(
    officialNmbPdfUrl("https://apps.nlrb.gov/link/document.aspx/09031d458436f374"),
    null,
    "NLRB slips are not NMB",
  );
  assert.equal(
    officialNmbPdfUrl("https://www.flra.gov/system/files/decisions/74/74-541.pdf"),
    null,
    "FLRA slips are not NMB",
  );

  assert.equal(kindFromDisposition("Certification"), "Certification");
  assert.equal(kindFromDisposition("Findings Upon Investigation- Single Carrier Determination"), "Single Carrier Determination");
  assert.equal(kindFromDisposition("Findings Upon Investigation- Authorization of Election"), "Findings Upon Investigation");
  assert.equal(kindFromDisposition("Dismissal &#8211; Withdrawn During Investigation"), "Dismissal");
  assert.equal(kindFromDisposition("Request for Jurisdictional Opinion"), null);
  assert.equal(kindFromDisposition("Notice of Hearing"), null);

  assert.equal(
    keepListing({
      id: R7687_ID,
      caseNo: "R-7687",
      kind: "Certification",
      sourceUrl: R7687_URL,
    }),
    true,
  );
  assert.equal(
    keepListing({
      id: "53-nmb-no-1",
      caseNo: "A-14068",
      kind: "Certification",
      sourceUrl: HEARING_URL,
    }),
    false,
  );
  assert.equal(
    keepListing({
      id: "53-nmb-no-23",
      caseNo: "CJ-7244",
      kind: "Certification",
      sourceUrl: "https://nmb.gov/NMB_Application/wp-content/uploads/2026/04/File-No.-CJ-7244-Jurisdictional-Opinion.pdf",
    }),
    true,
    "filename alone does not name every opinion letter; the disposition gate drops them",
  );

  const listing = readFx("listing-excerpt.html");
  assert.equal(volumeFromHtml(listing), 53);
  const listed = parseNmbDeterminationsHtml(listing, LISTING_URL);
  assert.ok(listed.some((r) => r.id === R7687_ID), `seeds in listing, got ${listed.map((r) => r.id).join(",")}`);
  assert.ok(listed.some((r) => r.id === R7688_ID));
  assert.ok(listed.some((r) => r.id === R7690_ID));
  assert.ok(listed.some((r) => r.id === R7685_ID), "listing walker finds a certification beyond the scout seeds");
  assert.ok(listed.some((r) => r.id === "53-nmb-no-31"), "dismissal on the FY table is a representation determination");
  assert.ok(!listed.some((r) => r.id === "53-nmb-no-32"), "jurisdictional opinion letters are not v1");
  assert.ok(!listed.some((r) => r.id === "53-nmb-no-1"), "PEB hearing notice is not this SKU");
  assert.ok(!listed.some((r) => /rep-manual|peb-|comments\/feed/i.test(r.sourceUrl)));
  const cert = listed.find((r) => r.id === R7687_ID);
  assert.equal(cert?.caseNo, "R-7687");
  assert.equal(cert?.docket, "R-7687");
  assert.equal(cert?.date, "2026-09-17");
  assert.equal(cert?.kind, "Certification");
  assert.equal(cert?.citation, "53 NMB No. 34");
  assert.match(cert?.institution ?? "", /California Northern Railroad Company/);
  assert.equal(cert?.sourceUrl, R7687_URL);
  assert.equal(cert?.documentId, "Certification-R-7687.pdf");
  const single = listed.find((r) => r.id === R7690_ID);
  assert.equal(single?.kind, "Single Carrier Determination");
  assert.equal(single?.caseNo, "R-7690");
  assert.equal(single?.date, "2026-09-01");
  assert.match(single?.institution ?? "", /Republic Airways/);
  assert.ok(!listing.includes(BODY_NEEDLE_R7687), "index is captions");
  assert.ok(!listing.includes(BODY_NEEDLE_R7688));
  assert.ok(!listing.includes(BODY_NEEDLE_R7690));
  assert.ok(!listing.includes(BODY_NEEDLE_R7685));

  const hub = readFx("hub-excerpt.html");
  assert.deepEqual(discoverFyPageUrls(hub, HUB_URL), [
    "https://nmb.gov/NMB_Application/index.php/agency-determinations/fy2026-determinations",
    "https://nmb.gov/NMB_Application/index.php/agency-determinations/fy2025-determinations",
    "https://nmb.gov/NMB_Application/index.php/agency-determinations/fy2024-determinations",
    "https://nmb.gov/NMB_Application/index.php/agency-determinations/2023-determinations",
  ]);

  assert.ok(isRepresentationManual(readFx("representation-manual.txt")));
  assert.ok(isPebReport(readFx("peb-254.txt")));
  assert.ok(isJurisdictionalOpinion(readFx("jurisdictional-cj-7244.txt")));
  assert.ok(isHtmlDetermination(readFx("html-determination.html")));
  assert.ok(isIndexHtml(listing));
  assert.ok(isJsonFullText(readFx("json-fulltext.json")));
  assert.ok(isCommentsRss(readFx("comments-rss.xml")));
  assert.ok(!isRealNmbDeterminationBody(readFx("representation-manual.txt")));
  assert.ok(!isRealNmbDeterminationBody(readFx("peb-254.txt")));
  assert.ok(!isRealNmbDeterminationBody(readFx("jurisdictional-cj-7244.txt")));
  assert.ok(!isRealNmbDeterminationBody(readFx("html-determination.html")));
  assert.ok(!isRealNmbDeterminationBody(listing));
  assert.ok(!isRealNmbDeterminationBody(readFx("json-fulltext.json")));
  assert.ok(!isRealNmbDeterminationBody(readFx("comments-rss.xml")));
  assert.ok(isRealNmbDeterminationBody(readFx("53-nmb-no-34.txt")));
  assert.ok(isRealNmbDeterminationBody(readFx("53-nmb-no-33.txt")));
  assert.ok(isRealNmbDeterminationBody(readFx("53-nmb-no-30.txt")));
  assert.ok(isRealNmbDeterminationBody(readFx("53-nmb-no-29.txt")));
  assert.ok(!isRepresentationManual(readFx("53-nmb-no-30.txt")), "citing the Manual inside an FUI is not the Manual");
  assert.ok(readFx("53-nmb-no-34.txt").includes(BODY_NEEDLE_R7687));
  assert.ok(readFx("53-nmb-no-33.txt").includes(BODY_NEEDLE_R7688));
  assert.ok(readFx("53-nmb-no-30.txt").includes(BODY_NEEDLE_R7690));
  assert.ok(readFx("53-nmb-no-29.txt").includes(BODY_NEEDLE_R7685));

  const cacheDir = mkdtempSync(join(tmpdir(), "nmb-determinations-"));
  const prevDir = process.env.NMB_DETERMINATIONS_DIR;
  process.env.NMB_DETERMINATIONS_DIR = cacheDir;
  const snap = await collectNmbDeterminations({ htmlDir: fixtures, limit: 7, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.NMB_DETERMINATIONS_DIR;
  else process.env.NMB_DETERMINATIONS_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 4, `fixture collect caches official determination text, got ${snap.cards.length}`);
  assert.equal(snap.fetchedPdfs, 0);
  assert.equal(snap.asOf, "2026-09-17");
  assert.ok(snap.cards.some((c) => c.id === R7687_ID));
  assert.ok(snap.cards.some((c) => c.id === R7688_ID));
  assert.ok(snap.cards.some((c) => c.id === R7690_ID));
  assert.ok(snap.cards.some((c) => c.id === R7685_ID), "dry collect finds a certification that is not a scout seed");
  assert.ok(!snap.cards.some((c) => c.id === "53-nmb-no-32"));
  assert.ok(!snap.cards.some((c) => c.id === "53-nmb-no-1"));
  assert.ok(snap.cards.every((c) => isRealNmbDeterminationBody(c.body)));
  assert.ok(snap.cards.every((c) => officialNmbPdfUrl(c.sourceUrl)));
  const seedCard = snap.cards.find((c) => c.id === R7687_ID);
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_R7687));
  assert.match(seedCard?.institution ?? "", /California Northern Railroad Company/);
  assert.equal(seedCard?.kind, "Certification");
  assert.equal(snap.cards.find((c) => c.id === R7690_ID)?.kind, "Single Carrier Determination");
  assert.equal(snap.cards.find((c) => c.id === R7685_ID)?.caseNo, "R-7685");

  const assembled = assembleNmbDeterminationsSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildNmbDeterminationsManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 4);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; id?: string }[];
  assert.ok(freeCards.every((c) => !c.body), "collector manifest cards omit body");
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes("wp-content/uploads"), "free manifest has no nmb.gov PDF deep link");
  assert.ok(!manifestJson.includes(BODY_NEEDLE_R7687));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_R7688));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_R7690));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_R7685));
  assert.ok(freeCards.every((c) => !c.sourceUrl), "collector manifest cards omit sourceUrl");
  assert.ok(filterNmbDeterminationsManifest(manifest, "california northern").cardCount);
  assert.ok(filterNmbDeterminationsManifest(manifest, "53-nmb-no-29").cardCount);
  assert.ok(filterNmbDeterminationsManifest(manifest, "mesa").cardCount);
  assert.ok(parseNmbDeterminationText(readFx("53-nmb-no-34.txt"), SEED_LISTINGS[0]).body.includes(BODY_NEEDLE_R7687));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
