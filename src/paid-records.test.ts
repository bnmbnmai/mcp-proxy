import assert from "node:assert/strict";
import {
  FORM_483_TYPE,
  RECORD_FIELDS,
  TICKS_CACHE_SOURCE,
  WARNING_LETTER_TYPE,
  honestFetchedAt,
  isPlausibleDate,
  normalizeForm483Records,
  normalizeTicksRecords,
  normalizeWarningLetterRecords,
  paidForm483Body,
  paidTicksBody,
  paidWarningLettersBody,
} from "./paid-records.js";

function letter(n: number, date: string, extra: Record<string, unknown> = {}) {
  return {
    id: `firm-${n}-${date.replaceAll("-", "")}`,
    firm: `Firm ${n}`,
    issuedOn: date,
    publishedOn: date,
    recordDate: date,
    sourceUrl: `https://www.fda.gov/media/${1000 + n}/download`,
    body: `This document lists observations.\nOBSERVATION 1\n${"x".repeat(200)}`,
    ...extra,
  };
}

async function main(): Promise<void> {
  assert.equal(isPlausibleDate("2825-01-21"), false);
  assert.equal(isPlausibleDate("2026-08-12"), true);
  assert.equal(isPlausibleDate(""), false);
  assert.equal(honestFetchedAt("2825-01-21T00:00:00Z"), null);
  assert.equal(honestFetchedAt("2026-08-23T10:29:03Z"), "2026-08-23T10:29:03Z");

  const ticksCache = {
    ok: true as const,
    product: "idaho-hay-feeder-ticks" as const,
    sources: ["Twin Falls", "Blackfoot"],
    status: "ok" as const,
    reason: null,
    fetchedAt: "2026-08-23T10:29:03Z",
    ticks: [
      {
        id: "cattle-bf-feeder-steer",
        group: "cattle",
        commodity: "Feeder steers",
        market: "Blackfoot Livestock Auction",
        unit: "$/cwt",
        price: 376.57,
        asOf: "2026-08-14",
        source: "Blackfoot Livestock Auction representative sales",
        sourceUrl: "https://blackfootlivestockauction.com/representative-sales/",
      },
      {
        id: "cattle-tf-feeder-steer",
        group: "cattle",
        commodity: "Feeder steers",
        market: "Twin Falls Livestock Commission (Wednesday auction)",
        unit: "$/cwt",
        price: 400.2,
        asOf: "2026-08-12",
        source: "Twin Falls Livestock Commission market report",
        sourceUrl: "http://www.twinfallslivestock.com/wed.pdf",
      },
      {
        id: "hay-id-poison",
        group: "hay",
        market: "Idaho Direct Hay",
        asOf: "2825-01-21",
        sourceUrl: "https://www.ams.usda.gov/mnreports/ams_3056.pdf",
      },
    ],
    failed: [],
    history: { points: [], emptyReports: [], series: [] },
  };

  const ticksA = paidTicksBody(ticksCache);
  const ticksB = paidTicksBody(structuredClone(ticksCache));
  assert.deepEqual(ticksA.records, ticksB.records, "ticks normalize is deterministic");
  assert.equal(JSON.stringify(ticksA.records), JSON.stringify(ticksB.records));
  assert.deepEqual(ticksA.ticks, ticksCache.ticks, "existing ticks[] keys stay");
  assert.deepEqual(ticksA.sources, ticksCache.sources);
  assert.equal(ticksA.product, "idaho-hay-feeder-ticks");
  assert.equal(ticksA.fetchedAt, "2026-08-23T10:29:03Z");
  assert.equal(ticksA.asOf, "2026-08-14");
  assert.equal(ticksA.source, TICKS_CACHE_SOURCE);
  assert.equal(ticksA.recordCount, 3);
  assert.equal(ticksA.records[0]?.id, "cattle-bf-feeder-steer");
  assert.equal(ticksA.records[0]?.date, "2026-08-14");
  assert.equal(ticksA.records[0]?.firm, "Blackfoot Livestock Auction");
  assert.equal(ticksA.records[0]?.type, "cattle");
  assert.equal(ticksA.records[2]?.id, "hay-id-poison");
  assert.equal(ticksA.records[2]?.date, null, "year-2825 is not sold as asOf");
  assert.deepEqual(Object.keys(ticksA.records[0] ?? {}).sort(), [...RECORD_FIELDS].sort());

  const letters = [
    letter(1, "2026-07-01"),
    letter(2, "2026-07-31"),
    letter(3, "2026-06-15"),
    letter(4, "2026-08-12"),
    letter(5, "2026-05-01"),
    letter(6, "2026-08-01"),
    letter(7, "2825-01-21", { issuedOn: "2825-01-21", publishedOn: "2026-02-03", recordDate: "2026-01-21" }),
    { id: "empty-body", firm: "No Text Inc", publishedOn: "2026-08-12", sourceUrl: "https://www.fda.gov/media/1/download", body: "" },
  ];

  const f483Snap = {
    ok: true as const,
    product: "fda-form-483-bodies" as const,
    status: "ok" as const,
    reason: null,
    fetchedAt: "2026-08-23T10:30:48.442Z",
    asOf: "2825-01-21",
    sources: {
      listing: "https://www.fda.gov/about-fda/office-inspections-and-investigations/oii-foia-electronic-reading-room",
    },
    letters,
  };
  const f483A = paidForm483Body(f483Snap);
  const f483B = paidForm483Body(structuredClone(f483Snap));
  assert.deepEqual(f483A.records, f483B.records, "483 normalize is deterministic");
  assert.equal(JSON.stringify(f483A.records), JSON.stringify(normalizeForm483Records(f483Snap)));
  assert.equal(f483A.letters.length, 8, "raw letters[] stay, including empty-body rows");
  assert.equal(f483A.letters[0]?.firm, "Firm 1");
  assert.ok(f483A.recordCount > 5, "paid records grow past the old first-slice 5");
  assert.equal(f483A.recordCount, 7);
  assert.equal(f483A.asOf, "2026-08-12", "year-2825 snapshot asOf is replaced by latest plausible record date");
  assert.equal(f483A.records[0]?.id, "firm-4-20260812");
  assert.equal(f483A.records[0]?.type, FORM_483_TYPE);
  assert.equal(f483A.records.find((r) => r.id === "firm-7-28250121")?.date, "2026-02-03");
  assert.ok(!f483A.records.some((r) => r.id === "empty-body"));
  assert.equal(f483A.source.includes("oii-foia-electronic-reading-room"), true);

  const wlLetters = letters.map((row, i) => ({
    ...row,
    cms: String(700000 + i),
    subject: "CGMP",
    sourceUrl: `https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/${row.id}`,
  }));
  const wlSnap = {
    ok: true as const,
    product: "fda-warning-letter-bodies" as const,
    status: "ok" as const,
    reason: null,
    fetchedAt: "2026-08-19T15:20:36.317Z",
    asOf: "2026-08-12",
    sources: {
      listing:
        "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters",
    },
    letters: wlLetters,
  };
  const wlA = paidWarningLettersBody(wlSnap);
  const wlB = paidWarningLettersBody(structuredClone(wlSnap));
  assert.deepEqual(wlA.records, wlB.records, "warning-letter normalize is deterministic");
  assert.deepEqual(wlA.records, normalizeWarningLetterRecords(wlSnap));
  assert.equal(wlA.letters[0]?.cms, "700000");
  assert.ok(wlA.recordCount > 5);
  assert.equal(wlA.recordCount, 7);
  assert.equal(wlA.asOf, "2026-08-12");
  assert.equal(wlA.records[0]?.type, WARNING_LETTER_TYPE);
  assert.equal(wlA.records.find((r) => r.id.startsWith("firm-7-"))?.date, null, "WL issuedOn 2825 is dropped");
  assert.equal(wlA.source.includes("warning-letters"), true);

  const shuffled = paidForm483Body({
    ...f483Snap,
    letters: [...letters].reverse(),
  });
  assert.deepEqual(
    shuffled.records.map((r) => r.id),
    f483A.records.map((r) => r.id),
    "record order is date-desc then id, not cache insertion order",
  );

  console.log("paid-records normalize tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
