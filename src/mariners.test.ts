import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  D7_LNM_LISTING_URL,
  D7_SPEC,
  D11_LNM_LISTING_URL,
  D11_SPEC,
  LNM_LISTING_URL,
  NOTICE_FIELDS,
  buildMarinersManifest,
  latestEdition,
  lnmPdfFilename,
  parseListingHtml,
  parseLnmText,
  specFromArgv,
} from "./mariners.js";

const root = dirname(fileURLToPath(import.meta.url));
const fixtures = join(root, "../src/fixtures/lnm-d13");
const d11Fixtures = join(root, "../src/fixtures/lnm-d11");
const d7Fixtures = join(root, "../src/fixtures/lnm-d7");

function readFx(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

function readD11(name: string): string {
  return readFileSync(join(d11Fixtures, name), "utf-8");
}

function readD7(name: string): string {
  return readFileSync(join(d7Fixtures, name), "utf-8");
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

  console.log("mariners parser tests ok");
}

main();
