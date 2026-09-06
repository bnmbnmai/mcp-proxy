import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALL_LNM_SPECS,
  D1_LNM_LISTING_URL,
  D1_SPEC,
  D5_LNM_LISTING_URL,
  D5_SPEC,
  D9_LNM_LISTING_URL,
  D9_SPEC,
  D14_LNM_LISTING_URL,
  D14_SPEC,
  D17_LNM_LISTING_URL,
  D17_SPEC,
  LEFTOVER_LNM_SPECS,
  NOTICE_FIELDS,
  MarinersSnapshot,
  buildMarinersManifest,
  latestEdition,
  leftoverCollectArgv,
  lnmPdfFilename,
  parseListingHtml,
  parseLnmText,
  specFromArgv,
} from "./mariners.js";

const root = dirname(fileURLToPath(import.meta.url));

function fx(district: string, name: string): string {
  return readFileSync(join(root, `../src/fixtures/lnm-d${district}`, name), "utf-8");
}

function leftoverSnap(
  spec: typeof D1_SPEC,
  parsed: ReturnType<typeof parseLnmText>,
  editions: ReturnType<typeof parseListingHtml>,
  latestUrl: string,
): MarinersSnapshot {
  return {
    ok: true,
    product: spec.productId,
    status: "ok",
    reason: null,
    fetchedAt: "2026-09-06T00:00:00.000Z",
    asOf: parsed.asOf,
    week: "35-2026",
    year: 2026,
    edition: "35-2026",
    district: spec.district,
    districtName: spec.districtName,
    sources: {
      listing: spec.listingUrl,
      pdfPattern: spec.pdfPattern,
      pdfUrl: latestUrl,
    },
    editions,
    notices: parsed.notices,
  };
}

function assertLeftoverDoor(opts: {
  district: string;
  spec: typeof D1_SPEC;
  listingUrl: string;
  pdf: string;
  aid: { waterway: string; name: string; llnr: string };
  msi: RegExp;
}): void {
  const editions = parseListingHtml(fx(opts.district, "listing-excerpt.html"));
  assert.deepEqual(
    editions.map((e) => e.edition),
    ["34-2026", "35-2026"],
    `same NavCEN listing walker reads D${opts.district} week/year + PDF hrefs`,
  );
  const latest = latestEdition(editions);
  assert.equal(latest?.edition, "35-2026");
  assert.equal(latest?.sourceUrl, `https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/${opts.pdf}`);
  assert.equal(lnmPdfFilename(opts.spec.district, 35, 2026, opts.spec.pdfInfix ?? ""), opts.pdf);
  assert.equal(specFromArgv(["node", "mariners.js", leftoverCollectArgv(opts.spec)]).district, opts.spec.district);

  const parsed = parseLnmText(fx(opts.district, `${opts.pdf.replace(".pdf", "")}-excerpt.txt`), {
    week: "35-2026",
    sourceUrl: latest!.sourceUrl,
  });
  assert.equal(parsed.asOf, "2026-09-02", `D${opts.district} header date is the same walker`);
  assert.ok(parsed.notices.length >= 2, `D${opts.district} excerpt has aid rows and MSI`);
  assert.ok(
    parsed.notices.some(
      (n) =>
        n.section === "Federal Discrepancies" &&
        n.waterway === opts.aid.waterway &&
        n.text.includes(opts.aid.name) &&
        n.text.includes(opts.aid.llnr),
    ),
    `${opts.aid.name} is on the official D${opts.district} week 35 PDF`,
  );
  assert.ok(
    parsed.notices.some((n) => n.section === "Additional MSI Categories" && opts.msi.test(n.text)),
    `official D${opts.district} MSI text is present`,
  );

  const manifest = buildMarinersManifest(leftoverSnap(opts.spec, parsed, editions, latest!.sourceUrl), opts.spec);
  assert.equal(manifest.product, opts.spec.productId);
  assert.equal(manifest.district, opts.spec.district);
  assert.equal(manifest.free, true);
  assert.equal(manifest.noticeCount, parsed.notices.length);
  assert.ok(Number(manifest.noticeCount) > 0);
  assert.deepEqual(manifest.schema && (manifest.schema as { fields: string[] }).fields, [...NOTICE_FIELDS]);
  const blob = JSON.stringify(manifest);
  assert.ok(!blob.includes(opts.aid.name), "free manifest must not include aid text");
  assert.ok(!opts.msi.test(blob), "free manifest must not include MSI body");
  assert.ok(blob.includes(opts.listingUrl));
}

function main(): void {
  assert.deepEqual(
    LEFTOVER_LNM_SPECS.map((s) => s.path),
    ["/mariners-d1", "/mariners-d5", "/mariners-d9", "/mariners-d14", "/mariners-d17"],
  );
  assert.deepEqual(
    ALL_LNM_SPECS.map((s) => s.district),
    ["13", "11", "7", "8", "1", "5", "9", "14", "17"],
  );

  assertLeftoverDoor({
    district: "1",
    spec: D1_SPEC,
    listingUrl: D1_LNM_LISTING_URL,
    pdf: "lnm01352026.pdf",
    aid: { waterway: "Ambrose Channel", name: "Ambrose Channel Lighted Buoy 12", llnr: "34850" },
    msi: /INSPIRE Environmental|Empire Wind/i,
  });
  assertLeftoverDoor({
    district: "5",
    spec: D5_SPEC,
    listingUrl: D5_LNM_LISTING_URL,
    pdf: "lnm05352026.pdf",
    aid: { waterway: "Albemarle Sound", name: "Kendrick Creek Channel Entrance Light 1KC", llnr: "31660" },
    msi: /Great Lakes Dredge|Absecon Inlet/i,
  });
  assertLeftoverDoor({
    district: "9",
    spec: D9_SPEC,
    listingUrl: D9_LNM_LISTING_URL,
    pdf: "lnm09352026.pdf",
    aid: { waterway: "Alpena", name: "Thunder Bay Traffic Lighted Bell Buoy TB", llnr: "11355" },
    msi: /Kokosing|Devils Island/i,
  });
  assertLeftoverDoor({
    district: "14",
    spec: D14_SPEC,
    listingUrl: D14_LNM_LISTING_URL,
    pdf: "lnm14352026.pdf",
    aid: { waterway: "Kaneohe Bay", name: "Kaneohe Bay Channel Daybeacon 5", llnr: "28700" },
    msi: /Mokapu|Kaneohe Bay/i,
  });
  assertLeftoverDoor({
    district: "17",
    spec: D17_SPEC,
    listingUrl: D17_LNM_LISTING_URL,
    pdf: "lnm17352026.pdf",
    aid: { waterway: "Adak Island", name: "Finger Shoal Lighted Bell Buoy 3", llnr: "27520" },
    msi: /Coast Pilot|Cape Spencer/i,
  });

  console.log("mariners leftover-district parser tests ok");
}

main();
