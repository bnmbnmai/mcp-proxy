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
  D7_LNM_LISTING_URL,
  D7_SPEC,
  D8_LNM_LISTING_URL,
  D8_SPEC,
  D9_LNM_LISTING_URL,
  D9_SPEC,
  D11_LNM_LISTING_URL,
  D11_SPEC,
  D14_LNM_LISTING_URL,
  D14_SPEC,
  D17_LNM_LISTING_URL,
  D17_SPEC,
  LEFTOVER_LNM_SPECS,
  LNM_LISTING_URL,
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
const fixtures = join(root, "../src/fixtures/lnm-d13");
const d11Fixtures = join(root, "../src/fixtures/lnm-d11");
const d7Fixtures = join(root, "../src/fixtures/lnm-d7");
const d8Fixtures = join(root, "../src/fixtures/lnm-d8");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

function readD11(name: string): string {
  return readFileSync(join(d11Fixtures, name), "utf-8");
}

function readD7(name: string): string {
  return readFileSync(join(d7Fixtures, name), "utf-8");
}

function readD8(name: string): string {
  return readFileSync(join(d8Fixtures, name), "utf-8");
}

function main(): void {
  const editions = parseListingHtml(readFx("listing-excerpt.html"));
  assert.deepEqual(
    editions.map((e) => e.edition),
    ["31-2026", "32-2026"],
    "official listing excerpt has weeks 31 and 32 of 2026",
  );
  const latest = latestEdition(editions);
  assert.equal(latest?.edition, "32-2026");
  assert.equal(
    latest?.sourceUrl,
    "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
  );

  const parsed = parseLnmText(readFx("lnm13322026-excerpt.txt"), {
    week: "32-2026",
    sourceUrl: latest!.sourceUrl,
  });
  assert.equal(parsed.asOf, "2026-08-12");
  assert.ok(parsed.notices.length >= 8, "official excerpt has aid rows and MSI blocks");
  assert.ok(
    parsed.notices.every((n) => n.week === "32-2026" && n.sourceUrl === latest!.sourceUrl),
  );
  assert.ok(
    parsed.notices.some(
      (n) =>
        n.section === "Federal Discrepancies" &&
        n.waterway === "Anacortes Harbor" &&
        n.text.includes("Anacortes Channel Light 4") &&
        n.text.includes("19055"),
    ),
    "Anacortes Channel Light 4 is on the official week 32 PDF",
  );
  assert.ok(
    parsed.notices.some(
      (n) => n.section === "Additional MSI Categories" && /ESSAYONS/i.test(n.text),
    ),
    "Astoria ESSAYONS dredging notice is official text",
  );
  assert.ok(
    !parsed.notices.some((n) => /we are not inventing|organic hay/i.test(n.text)),
  );

  const manifest = buildMarinersManifest({
    ok: true,
    product: "uscg-d13-lnm",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-18T00:00:00.000Z",
    asOf: parsed.asOf,
    week: "32-2026",
    year: 2026,
    edition: "32-2026",
    district: "13",
    districtName: "Northwest",
    sources: {
      listing: LNM_LISTING_URL,
      pdfPattern: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13{WW}{YYYY}.pdf",
      pdfUrl: latest!.sourceUrl,
    },
    editions,
    notices: parsed.notices,
  });
  assert.equal(manifest.free, true);
  assert.equal(manifest.noticeCount, parsed.notices.length);
  assert.equal(manifest.week, "32-2026");
  assert.deepEqual(manifest.schema && (manifest.schema as { fields: string[] }).fields, [...NOTICE_FIELDS]);
  const blob = JSON.stringify(manifest);
  assert.ok(!blob.includes("ESSAYONS"), "free manifest must not include notice body");
  assert.ok(!blob.includes("Anacortes Channel Light 4"), "free manifest must not include aid text");
  assert.ok(blob.includes(LNM_LISTING_URL));

  const d11Editions = parseListingHtml(readD11("listing-excerpt.html"));
  assert.deepEqual(
    d11Editions.map((e) => e.edition),
    ["26-2026", "31-2026", "32-2026"],
    "same NavCEN listing walker reads D11 week/year + PDF hrefs",
  );
  const d11Latest = latestEdition(d11Editions);
  assert.equal(d11Latest?.edition, "32-2026");
  assert.equal(
    d11Latest?.sourceUrl,
    "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm11322026.pdf",
  );
  const d11Parsed = parseLnmText(readD11("lnm11322026-excerpt.txt"), {
    week: "32-2026",
    sourceUrl: d11Latest!.sourceUrl,
  });
  assert.equal(d11Parsed.asOf, "2026-08-12", "Southwest District header date is the same walker");
  assert.ok(d11Parsed.notices.length >= 4, "D11 excerpt has aid rows and MSI");
  assert.ok(
    d11Parsed.notices.some(
      (n) =>
        n.section === "Federal Discrepancies" &&
        n.waterway === "Berkeley" &&
        n.text.includes("Berkeley Marina Channel Light 2") &&
        n.text.includes("5430"),
    ),
    "Berkeley Marina Channel Light 2 is on the official D11 week 32 PDF",
  );
  assert.ok(
    d11Parsed.notices.some(
      (n) => n.section === "Additional MSI Categories" && /WAMS/i.test(n.text),
    ),
    "Alameda WAMS MSI notice is official D11 text",
  );
  const d11Manifest = buildMarinersManifest(
    {
      ok: true,
      product: "uscg-d11-lnm",
      status: "ok",
      reason: null,
      fetchedAt: "2026-08-19T00:00:00.000Z",
      asOf: d11Parsed.asOf,
      week: "32-2026",
      year: 2026,
      edition: "32-2026",
      district: "11",
      districtName: "Southwest",
      sources: {
        listing: D11_LNM_LISTING_URL,
        pdfPattern: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm11{WW}{YYYY}.pdf",
        pdfUrl: d11Latest!.sourceUrl,
      },
      editions: d11Editions,
      notices: d11Parsed.notices,
    },
    D11_SPEC,
  );
  assert.equal(d11Manifest.product, "uscg-d11-lnm");
  assert.equal(d11Manifest.district, "11");
  assert.equal(d11Manifest.noticeCount, d11Parsed.notices.length);
  assert.ok(d11Manifest.noticeCount && Number(d11Manifest.noticeCount) > 0);
  const d11Blob = JSON.stringify(d11Manifest);
  assert.ok(!d11Blob.includes("Berkeley Marina Channel Light 2"));
  assert.ok(!d11Blob.includes("WAMS"));
  assert.ok(d11Blob.includes(D11_LNM_LISTING_URL));

  const d7Editions = parseListingHtml(readD7("listing-excerpt.html"));
  assert.deepEqual(
    d7Editions.map((e) => e.edition),
    ["26-2026", "31-2026", "32-2026"],
    "same NavCEN listing walker reads D7 week/year + PDF hrefs",
  );
  const d7Latest = latestEdition(d7Editions);
  assert.equal(d7Latest?.edition, "32-2026");
  assert.equal(
    d7Latest?.sourceUrl,
    "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm07322026.pdf",
  );
  assert.equal(lnmPdfFilename("7", 32, 2026), "lnm07322026.pdf");
  assert.equal(specFromArgv(["node", "mariners.js", "--district=7"]).district, "7");
  const d7Parsed = parseLnmText(readD7("lnm07322026-excerpt.txt"), {
    week: "32-2026",
    sourceUrl: d7Latest!.sourceUrl,
  });
  assert.equal(d7Parsed.asOf, "2026-08-12", "Southeast District header date is the same walker");
  assert.ok(d7Parsed.notices.length >= 4, "D7 excerpt has aid rows and MSI");
  assert.ok(
    d7Parsed.notices.some(
      (n) =>
        n.section === "Federal Discrepancies" &&
        n.waterway === "Altamaha Sound" &&
        n.text.includes("Altamaha Sound Daybeacon 197") &&
        n.text.includes("36887"),
    ),
    "Altamaha Sound Daybeacon 197 is on the official D7 week 32 PDF",
  );
  assert.ok(
    d7Parsed.notices.some(
      (n) => n.section === "Additional MSI Categories" && /Army Terminal Channel/i.test(n.text),
    ),
    "Bahia De San Juan Army Terminal MSI notice is official D7 text",
  );
  const d7Manifest = buildMarinersManifest(
    {
      ok: true,
      product: "uscg-d7-lnm",
      status: "ok",
      reason: null,
      fetchedAt: "2026-08-19T00:00:00.000Z",
      asOf: d7Parsed.asOf,
      week: "32-2026",
      year: 2026,
      edition: "32-2026",
      district: "7",
      districtName: "Southeast",
      sources: {
        listing: D7_LNM_LISTING_URL,
        pdfPattern: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm07{WW}{YYYY}.pdf",
        pdfUrl: d7Latest!.sourceUrl,
      },
      editions: d7Editions,
      notices: d7Parsed.notices,
    },
    D7_SPEC,
  );
  assert.equal(d7Manifest.product, "uscg-d7-lnm");
  assert.equal(d7Manifest.district, "7");
  assert.equal(d7Manifest.noticeCount, d7Parsed.notices.length);
  assert.ok(d7Manifest.noticeCount && Number(d7Manifest.noticeCount) > 0);
  const d7Blob = JSON.stringify(d7Manifest);
  assert.ok(!d7Blob.includes("Altamaha Sound Daybeacon 197"));
  assert.ok(!d7Blob.includes("Army Terminal Channel Port Entry Light"));
  assert.ok(d7Blob.includes(D7_LNM_LISTING_URL));

  const d8Editions = parseListingHtml(readD8("listing-excerpt.html"));
  assert.deepEqual(
    d8Editions.map((e) => e.edition),
    ["26-2026", "32-2026", "33-2026"],
    "same NavCEN listing walker reads D8 Gulf week/year + PDF hrefs",
  );
  const d8Latest = latestEdition(d8Editions);
  assert.equal(d8Latest?.edition, "33-2026");
  assert.equal(
    d8Latest?.sourceUrl,
    "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm0833g2026.pdf",
  );
  assert.equal(lnmPdfFilename("8", 33, 2026, "g"), "lnm0833g2026.pdf");
  assert.equal(specFromArgv(["node", "mariners.js", "--district=8"]).district, "8");
  const d8Parsed = parseLnmText(readD8("lnm0833g2026-excerpt.txt"), {
    week: "33-2026",
    sourceUrl: d8Latest!.sourceUrl,
  });
  assert.equal(d8Parsed.asOf, "2026-08-19", "Heartland (Gulf) District header date is the same walker");
  assert.ok(d8Parsed.notices.length >= 3, "D8 excerpt has aid rows and MSI");
  assert.ok(
    d8Parsed.notices.some(
      (n) =>
        n.section === "Federal Discrepancies" &&
        n.waterway === "Acadiana Navigation Channel" &&
        n.text.includes("Acadiana Navigation Channel Light 6") &&
        n.text.includes("20305"),
    ),
    "Acadiana Navigation Channel Light 6 is on the official D8 week 33 PDF",
  );
  assert.ok(
    d8Parsed.notices.some(
      (n) => n.section === "Additional MSI Categories" && /Algiers Lock/i.test(n.text),
    ),
    "Algiers Canal GIWW lock MSI notice is official D8 text",
  );
  const d8Manifest = buildMarinersManifest(
    {
      ok: true,
      product: "uscg-d8-lnm",
      status: "ok",
      reason: null,
      fetchedAt: "2026-08-19T00:00:00.000Z",
      asOf: d8Parsed.asOf,
      week: "33-2026",
      year: 2026,
      edition: "33-2026",
      district: "8",
      districtName: "Gulf",
      sources: {
        listing: D8_LNM_LISTING_URL,
        pdfPattern: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm08{WW}g{YYYY}.pdf",
        pdfUrl: d8Latest!.sourceUrl,
      },
      editions: d8Editions,
      notices: d8Parsed.notices,
    },
    D8_SPEC,
  );
  assert.equal(d8Manifest.product, "uscg-d8-lnm");
  assert.equal(d8Manifest.district, "8");
  assert.equal(d8Manifest.noticeCount, d8Parsed.notices.length);
  assert.ok(d8Manifest.noticeCount && Number(d8Manifest.noticeCount) > 0);
  const d8Blob = JSON.stringify(d8Manifest);
  assert.ok(!d8Blob.includes("Acadiana Navigation Channel Light 6"));
  assert.ok(!d8Blob.includes("Algiers Lock"));
  assert.ok(d8Blob.includes(D8_LNM_LISTING_URL));

  function leftoverFx(district: string, name: string): string {
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
    const editions = parseListingHtml(leftoverFx(opts.district, "listing-excerpt.html"));
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

    const parsed = parseLnmText(leftoverFx(opts.district, `${opts.pdf.replace(".pdf", "")}-excerpt.txt`), {
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

  console.log("mariners parser tests ok");
}

main();
