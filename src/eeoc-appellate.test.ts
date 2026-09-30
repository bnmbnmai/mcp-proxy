import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPEAL_3976_ID,
  APPEAL_3976_URL,
  ATTRIBUTION,
  BODY_NEEDLE_2233,
  BODY_NEEDLE_2858,
  BODY_NEEDLE_3976,
  CARD_FIELDS,
  EEOC_APPELLATE_AMOUNT_ATOMIC,
  EEOC_APPELLATE_MANIFEST_PATH,
  EEOC_APPELLATE_ONE_AMOUNT_ATOMIC,
  EEOC_APPELLATE_PATH,
  LICENSE,
  PRODUCT_ID,
  REQUEST_2233_ID,
  REQUEST_2233_URL,
  REQUEST_2858_ID,
  REQUEST_2858_URL,
  SEARCH_URL,
  SEED_LISTINGS,
  assembleEeocAppellateSnapshot,
  buildEeocAppellateManifest,
  collectEeocAppellate,
  discoverSearchPageUrls,
  filterEeocAppellateManifest,
  isChargeClosure,
  isCrbWrap,
  isDigestOnly,
  isEeo1,
  isHtmlDecision,
  isRealEeocAppellateBody,
  keepListing,
  officialEeocPdfUrl,
  flattenText,
  institutionFromText,
  parseEeocAppellateHtml,
  parseEeocAppellateText,
} from "./eeoc-appellate.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/eeoc-appellate");
const NLRB_URL = "https://apps.nlrb.gov/link/document.aspx/09031d458436f374";
const CRB_URL = "https://www.federalregister.gov/documents/2026/09/08/crb-final-rate-determination";
const EEO1_URL = "https://www.eeoc.gov/sites/default/files/eeo1/eeo1-data.pdf";
const DIGEST_URL = "https://www.eeoc.gov/sites/default/files/decisions/2026_09_08/digest-only.pdf";

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  assert.equal(EEOC_APPELLATE_PATH, "/eeoc-appellate");
  assert.equal(EEOC_APPELLATE_MANIFEST_PATH, "/eeoc-appellate/manifest.json");
  assert.equal(EEOC_APPELLATE_AMOUNT_ATOMIC, "50000");
  assert.equal(EEOC_APPELLATE_ONE_AMOUNT_ATOMIC, "20000");
  assert.ok(SEARCH_URL.includes("/federal-sector/appellate-decisions"));
  assert.ok(CARD_FIELDS.includes("body"));
  assert.ok(SEED_LISTINGS.some((r) => r.id === REQUEST_2858_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === REQUEST_2233_ID));
  assert.ok(SEED_LISTINGS.some((r) => r.id === APPEAL_3976_ID));

  assert.equal(officialEeocPdfUrl(REQUEST_2858_URL), REQUEST_2858_URL);
  assert.equal(officialEeocPdfUrl(REQUEST_2233_URL), REQUEST_2233_URL);
  assert.equal(officialEeocPdfUrl(APPEAL_3976_URL), APPEAL_3976_URL);
  assert.equal(officialEeocPdfUrl(DIGEST_URL), null, "digest PDFs are not this bag");
  assert.equal(officialEeocPdfUrl(EEO1_URL), null, "EEO-1 files are not this bag");
  assert.equal(officialEeocPdfUrl(CRB_URL), null, "CRB Federal Register wraps are not this bag");
  assert.equal(officialEeocPdfUrl(NLRB_URL), null, "NLRB slips are not EEOC");
  assert.equal(officialEeocPdfUrl(SEARCH_URL), null, "the search HTML is not the PDF");
  assert.equal(
    officialEeocPdfUrl("https://www.eeoc.gov/sites/default/files/decisions/2026_09_08/charge-closure.pdf"),
    null,
    "charge-closure filenames are not this bag",
  );

  assert.equal(
    keepListing({ id: REQUEST_2858_ID, sourceUrl: REQUEST_2858_URL }),
    true,
  );
  assert.equal(keepListing({ id: "digest", sourceUrl: DIGEST_URL }), false);

  const listing = readFx("search-excerpt.html");
  const listed = parseEeocAppellateHtml(listing);
  assert.ok(listed.some((r) => r.sourceUrl === REQUEST_2858_URL));
  assert.ok(listed.some((r) => r.sourceUrl === REQUEST_2233_URL));
  assert.ok(listed.some((r) => r.sourceUrl === APPEAL_3976_URL));
  assert.ok(listed.some((r) => r.id === "ofs-2026009999"), "walker finds a non-seed OFS PDF");
  assert.ok(!listed.some((r) => /digest|eeo1|charge-closure|federalregister/i.test(r.sourceUrl)));
  assert.ok(!listing.includes(BODY_NEEDLE_3976), "search index is snippet-only");
  assert.deepEqual(discoverSearchPageUrls(listing, SEARCH_URL), [
    "https://www.eeoc.gov/federal-sector/appellate-decisions?appellate_keywords=2026&page=0",
    "https://www.eeoc.gov/federal-sector/appellate-decisions?appellate_keywords=2026&page=1",
  ]);

  assert.ok(isDigestOnly(readFx("digest-only.txt")));
  assert.ok(isDigestOnly(readFx("ofs-2026000001.txt")));
  assert.ok(isEeo1(readFx("eeo1.txt")));
  assert.ok(isChargeClosure(readFx("charge-closure.txt")));
  assert.ok(isChargeClosure(readFx("ofs-2026000002.txt")));
  assert.ok(isCrbWrap(readFx("crb-wrap.txt")));
  assert.ok(isHtmlDecision(readFx("html-decision.html")));
  assert.ok(!isRealEeocAppellateBody(readFx("digest-only.txt")));
  assert.ok(!isRealEeocAppellateBody(readFx("eeo1.txt")));
  assert.ok(!isRealEeocAppellateBody(readFx("charge-closure.txt")));
  assert.ok(!isRealEeocAppellateBody(readFx("crb-wrap.txt")));
  assert.ok(!isRealEeocAppellateBody(readFx("html-decision.html")));
  assert.ok(isRealEeocAppellateBody(readFx("request-2026002858.txt")));
  assert.ok(isRealEeocAppellateBody(readFx("request-2026002233.txt")));
  assert.ok(isRealEeocAppellateBody(readFx("appeal-2025003976.txt")));
  assert.ok(readFx("request-2026002858.txt").includes(BODY_NEEDLE_2858));
  assert.ok(readFx("request-2026002233.txt").includes(BODY_NEEDLE_2233));
  assert.ok(readFx("appeal-2025003976.txt").includes(BODY_NEEDLE_3976));

  assert.equal(
    institutionFromText(
      flattenText("Washington, DC 20013 Walter S., 1 Complainant, v. United States Postal Service DECISION Complainant timely"),
    ),
    "Walter S.; United States Postal Service",
  );
  assert.equal(
    institutionFromText(
      flattenText("Jene M., 1 Complainant, v. Department of Homeland Security RECONSIDERATION Complainant requested"),
    ),
    "Jene M.; Department of Homeland Security",
  );
  assert.equal(
    institutionFromText(flattenText("Lenard T,1 Complainant, v. Department of Transportation (Federal Aviation Administration), Agency.")),
    "Lenard T; Department of Transportation; Federal Aviation Administration",
  );
  assert.ok(!/^(DECISION|RECONSIDERATION)$/.test(institutionFromText("DECISION Complainant timely filed")));

  const parsed2858 = parseEeocAppellateText(readFx("request-2026002858.txt"), SEED_LISTINGS[0]);
  assert.equal(parsed2858.id, REQUEST_2858_ID);
  assert.match(parsed2858.institution, /Lenard T/);
  assert.equal(parsed2858.date, "2026-08-24");
  assert.equal(parsed2858.kind, "Request for Reconsideration");
  const parsed3976 = parseEeocAppellateText(readFx("appeal-2025003976.txt"), SEED_LISTINGS[2]);
  assert.equal(parsed3976.id, APPEAL_3976_ID);
  assert.match(parsed3976.institution, /Army/);
  assert.equal(parsed3976.date, "2026-02-26");

  const cacheDir = mkdtempSync(join(tmpdir(), "eeoc-appellate-"));
  const prevDir = process.env.EEOC_APPELLATE_DIR;
  process.env.EEOC_APPELLATE_DIR = cacheDir;
  const snap = await collectEeocAppellate({ htmlDir: fixtures, limit: 7, maxFetch: 0 });
  if (prevDir === undefined) delete process.env.EEOC_APPELLATE_DIR;
  else process.env.EEOC_APPELLATE_DIR = prevDir;

  assert.equal(snap.status, "ok");
  assert.ok(snap.cards.length >= 3, `fixture collect caches the scout seeds, got ${snap.cards.length}`);
  assert.equal(snap.fetchedPdfs, 0);
  assert.ok(snap.cards.some((c) => c.id === REQUEST_2858_ID));
  assert.ok(snap.cards.some((c) => c.id === REQUEST_2233_ID));
  assert.ok(snap.cards.some((c) => c.id === APPEAL_3976_ID));
  assert.ok(snap.cards.some((c) => c.id === "request-2026009999"), "dry collect finds a reconsideration that is not a scout seed");
  assert.ok(!snap.cards.some((c) => c.id === "request-2026000001" || c.id === "appeal-2026000001"));
  assert.ok(!snap.cards.some((c) => c.id === "request-2026000002" || c.id === "appeal-2026000002"));
  assert.ok(snap.cards.every((c) => isRealEeocAppellateBody(c.body)));
  assert.ok(snap.cards.every((c) => officialEeocPdfUrl(c.sourceUrl)));
  const seedCard = snap.cards.find((c) => c.id === REQUEST_2858_ID);
  assert.ok(seedCard?.body.includes(BODY_NEEDLE_2858));
  assert.match(seedCard?.institution ?? "", /Lenard T/);
  assert.equal(seedCard?.date, "2026-08-24");
  assert.equal(snap.cards.find((c) => c.id === REQUEST_2233_ID)?.docket, "2026002233; 2026002234");
  assert.equal(snap.cards.find((c) => c.id === APPEAL_3976_ID)?.kind, "Appeal");
  assert.equal(snap.cards.find((c) => c.id === APPEAL_3976_ID)?.sourceUrl, APPEAL_3976_URL);

  const assembled = assembleEeocAppellateSnapshot(snap.cards, snap.fetchedAt);
  const manifest = buildEeocAppellateManifest(assembled);
  assert.equal(manifest.product, PRODUCT_ID);
  assert.equal(manifest.license, LICENSE);
  assert.equal(manifest.attribution, ATTRIBUTION);
  assert.equal(manifest.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.ok(Number(manifest.cardCount) >= 3);
  const freeCards = manifest.cards as { body?: string; sourceUrl?: string; institution?: string }[];
  assert.ok(freeCards.every((c) => !c.body), "collector manifest cards omit body");
  assert.ok(freeCards.every((c) => !c.sourceUrl), "collector manifest cards omit sourceUrl");
  const manifestJson = JSON.stringify(manifest);
  assert.ok(!manifestJson.includes("sites/default/files"), "free manifest has no eeoc.gov PDF deep link");
  assert.ok(!manifestJson.includes(BODY_NEEDLE_2858));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_2233));
  assert.ok(!manifestJson.includes(BODY_NEEDLE_3976));
  assert.ok(filterEeocAppellateManifest(manifest, "lenard").cardCount);
  assert.ok(filterEeocAppellateManifest(manifest, "2026002858").cardCount);
  assert.ok(filterEeocAppellateManifest(manifest, "2026002234").cardCount);
  assert.ok(filterEeocAppellateManifest(manifest, "2025003976").cardCount);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
