import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readFs } from "node:fs";
import {
  CARD_FIELDS,
  DEC_2024_MEETING_URL,
  DOCKET,
  FIRST_SLICE_MEETING_URL,
  FR_NOTICE_URL,
  JUN_2021_MEETING_URL,
  JUN_2022_MEETING_URL,
  LEFTOVER_BRIEFING_URLS,
  LICENSE,
  MEETING_URL,
  MEETING_URLS,
  OCT_2024_MEETING_URL,
  YEAR_MATERIALS_URLS,
  buildPcacManifest,
  collectPcac,
  isCombinedBriefingInformationTitle,
  isCombinedSponsorPack,
  isPerSubstanceMemoTitle,
  isRealPcacBody,
  mediaIdFromUrl,
  meetingLabelFromHtml,
  officialFdaMediaUrl,
  officialMeetingPageUrl,
  parseListingHtml,
  parsePcacText,
  parseYearMaterialsHtml,
  stripNominatorPacks,
} from "./pcac.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../src/fixtures/fda-pcac");

function readFx(name: string): string {
  return readFs(join(fixtures, name), "utf-8");
}

async function main(): Promise<void> {
  const listed = parseListingHtml(readFx("listing-excerpt.html"));
  assert.ok(listed.length >= 5, "official PCAC excerpt lists per-substance FDA memos");
  const emideltide = listed.find((r) => r.mediaId === "193344");
  assert.ok(emideltide);
  assert.equal(emideltide?.substance, "Emideltide");
  assert.equal(emideltide?.meeting, "July 23-24, 2026");
  assert.equal(emideltide?.sourceUrl, "https://www.fda.gov/media/193344/download");
  assert.equal(mediaIdFromUrl(emideltide?.sourceUrl ?? ""), "193344");
  const bpc = listed.find((r) => r.mediaId === "193343");
  assert.ok(bpc);
  assert.equal(bpc?.substance, "BPC-157");
  assert.ok(listed.every((r) => isPerSubstanceMemoTitle(`FDA Briefing Document for ${r.substance}-Related Bulk Drug Substances`)));
  assert.ok(!listed.some((r) => r.mediaId === "193342"), "skip FDA Briefing Document Introduction");
  assert.ok(!listed.some((r) => r.mediaId === "193773"), "skip FDA Presentations");
  assert.ok(!listed.some((r) => r.mediaId === "193710"), "skip webcast");
  assert.ok(listed.every((r) => officialFdaMediaUrl(r.sourceUrl)));
  assert.equal(officialFdaMediaUrl("https://www.govinfo.gov/content/pkg/FR-2026-04-16/html/2026-07361.htm"), null);
  assert.equal(officialFdaMediaUrl("https://www.regulations.gov/document/FDA-2025-N-6895-0001"), null);
  assert.equal(officialFdaMediaUrl("https://www.fda.gov/drugs/cder-research"), null);
  assert.equal(
    officialFdaMediaUrl("https://web.archive.org/web/20260724170635id_/https://www.fda.gov/media/193344/download"),
    "https://www.fda.gov/media/193344/download",
  );
  assert.ok(MEETING_URL.includes("pharmacy-compounding-advisory-committee"));
  assert.ok(FIRST_SLICE_MEETING_URL.includes("july-23-24-2026"), "old path stays the first-slice teaser");
  assert.ok(
    YEAR_MATERIALS_URLS.some((u) => u.includes("2024-meeting-materials")),
    "live collect must walk official year-materials tables, not only the July 2026 meeting",
  );
  assert.ok(YEAR_MATERIALS_URLS.some((u) => u.includes("2026-meeting-materials")));
  assert.ok(YEAR_MATERIALS_URLS.some((u) => u.includes("2027-meeting-materials")), "walk empty 2027 year table");
  assert.ok(YEAR_MATERIALS_URLS.some((u) => u.includes("2022-meeting-materials")), "walk leftover 2022 combined-pack year");
  assert.ok(YEAR_MATERIALS_URLS.some((u) => u.includes("2016-meeting-materials")), "walk leftover Wayback year tables");
  assert.ok(MEETING_URLS.includes(OCT_2024_MEETING_URL));
  assert.ok(MEETING_URLS.includes(DEC_2024_MEETING_URL));
  assert.ok(MEETING_URLS.includes(JUN_2022_MEETING_URL));
  assert.ok(MEETING_URLS.includes(JUN_2021_MEETING_URL));
  assert.ok(LEFTOVER_BRIEFING_URLS.some((u) => u.includes("march-8-9-2016")));
  const walkerSrc = readFs(join(dirname(fileURLToPath(import.meta.url)), "../src/pcac.ts"), "utf-8");
  assert.match(walkerSrc, /PCAC_LIMIT", "24"/);
  assert.match(walkerSrc, /PCAC_MAX_FETCH", "36"/);
  assert.ok(FR_NOTICE_URL.includes("2026-07361"));
  assert.equal(DOCKET, "FDA-2025-N-6895");

  const yearListed = parseYearMaterialsHtml(readFx("year-2024-excerpt.html"));
  assert.ok(yearListed.includes(OCT_2024_MEETING_URL), "2024 year table lists the October meeting");
  assert.ok(yearListed.includes(DEC_2024_MEETING_URL), "2024 year table lists the December meeting");
  const year2022 = parseYearMaterialsHtml(readFx("year-2022-excerpt.html"));
  assert.ok(year2022.includes(JUN_2022_MEETING_URL), "2022 year table lists the June combined-pack meeting");
  const year2018 = parseYearMaterialsHtml(readFx("year-2018-excerpt.html"));
  assert.ok(
    year2018.includes(LEFTOVER_BRIEFING_URLS[0]),
    "leftover 2018 year table lists the combined briefing-information page",
  );
  assert.equal(
    officialMeetingPageUrl(LEFTOVER_BRIEFING_URLS[5]),
    LEFTOVER_BRIEFING_URLS[5],
    "leftover briefing-information pages are official leftover listing doors",
  );
  assert.equal(officialMeetingPageUrl(JUN_2021_MEETING_URL), JUN_2021_MEETING_URL);

  const octListed = parseListingHtml(readFx("listing-oct-2024-excerpt.html"));
  assert.equal(meetingLabelFromHtml(readFx("listing-oct-2024-excerpt.html")), "October 29, 2024");
  assert.ok(octListed.some((r) => r.mediaId === "182086" && r.substance === "L-Theanine"));
  assert.ok(octListed.some((r) => r.mediaId === "182087" && /Ibutamoren Mesylate/i.test(r.substance)));
  assert.ok(octListed.some((r) => r.mediaId === "182088" && r.substance === "Ipamorelin"));
  assert.ok(octListed.some((r) => r.mediaId === "182089" && r.substance === "Kisspeptin-10"));
  assert.ok(octListed.some((r) => r.mediaId === "182090" && /Hydroxyprogesterone/i.test(r.substance)));
  assert.ok(!octListed.some((r) => r.mediaId === "182085"), "October numbered intro stays out");
  assert.ok(!octListed.some((r) => r.mediaId === "182200"), "October presentations stay out");
  assert.ok(octListed.every((r) => r.meeting === "October 29, 2024"));
  assert.equal(
    octListed.find((r) => r.mediaId === "182086")?.sourceUrl,
    "https://www.fda.gov/media/182086/download",
  );

  const decListed = parseListingHtml(readFx("listing-dec-2024-excerpt.html"));
  assert.ok(decListed.some((r) => r.mediaId === "183584" && r.substance === "AOD-9604"));
  assert.ok(decListed.some((r) => r.mediaId === "183819" && r.substance === "CJC-1295"));
  assert.ok(decListed.some((r) => r.mediaId === "183820" && /Thymosin Alpha-1/i.test(r.substance)));
  assert.ok(!decListed.some((r) => r.mediaId === "183583"), "December intro stays out");
  assert.ok(!decListed.some((r) => r.mediaId === "183900"), "waiver stays out");
  assert.ok(decListed.every((r) => r.meeting === "December 4, 2024"));

  const grown = [...listed, ...octListed, ...decListed];
  assert.ok(grown.length >= 15, `official year+meeting walk lists past first-slice 7, got ${grown.length}`);
  assert.ok(isPerSubstanceMemoTitle("FDA Briefing Document-2- L-Theanine"));
  assert.ok(isPerSubstanceMemoTitle("FDA Briefing Document for AOD-9604 Related Bulk Drug Substances"));
  assert.equal(isPerSubstanceMemoTitle("FDA Briefing Document-1- Introduction"), false);
  assert.equal(
    isCombinedBriefingInformationTitle(
      "FDA Briefing Information for the June 8, 2022 Meeting of the Pharmacy Compounding Advisory Committee",
    ),
    true,
  );
  assert.equal(
    isPerSubstanceMemoTitle(
      "FDA Briefing Information for the March 8-9, 2016 Meeting of the Pharmacy Compounding Advisory Committee",
    ),
    false,
    "leftover combined briefing packs are not this SKU",
  );

  const june2022 = parseListingHtml(readFx("listing-june-2022-excerpt.html"));
  assert.equal(june2022.length, 0, "June 2022 combined briefing information stays out");
  assert.ok(!june2022.some((r) => r.mediaId === "158541"));
  const leftover2016 = parseListingHtml(readFx("leftover-briefing-2016-excerpt.html"));
  assert.equal(leftover2016.length, 0, "2016 leftover combined briefing information stays out");
  assert.ok(!leftover2016.some((r) => r.mediaId === "95976"));

  const emiText = parsePcacText(readFx("193344.txt"), {
    sourceUrl: emideltide!.sourceUrl,
    substance: "Emideltide",
    meeting: "July 23-24, 2026",
    mediaId: "193344",
  });
  assert.equal(emiText.mediaId, "193344");
  assert.equal(emiText.substance, "Emideltide");
  assert.equal(emiText.date, "2026-05-11");
  assert.ok(isRealPcacBody(emiText.body));
  assert.ok(emiText.body.includes("FDA Briefing Document"));
  assert.ok(
    emiText.body.includes("a balancing of the criteria weighs against emideltide"),
  );
  assert.ok(emiText.body.includes("not well-characterized"));
  assert.ok(emiText.body.includes("insufficient information concerning effectiveness"));
  assert.ok(emiText.body.includes("we propose not adding"));
  assert.ok(emiText.body.includes("emideltide (free base) or emideltide acetate to the 503A Bulks List"));
  assert.ok(!/How is the ingredient supplied\?/i.test(emiText.body));
  assert.ok(CARD_FIELDS.every((f) => f in emiText));
  assert.ok(!/archive\.org/i.test(emiText.sourceUrl));

  const bpcText = parsePcacText(readFx("193343.txt"), {
    sourceUrl: bpc!.sourceUrl,
    substance: "BPC-157",
    mediaId: "193343",
  });
  assert.ok(isRealPcacBody(bpcText.body));
  assert.ok(/we\s+propose not adding BPC-157/i.test(bpcText.body));

  const kpvText = parsePcacText(readFx("193346.txt"), {
    sourceUrl: "https://www.fda.gov/media/193346/download",
    substance: "KPV",
    mediaId: "193346",
  });
  assert.ok(isRealPcacBody(kpvText.body));
  assert.ok(/we\s+propose not adding KPV/i.test(kpvText.body));

  const fake = parsePcacText(readFx("no-evaluation.txt"), {
    sourceUrl: FR_NOTICE_URL,
    substance: "Emideltide",
  });
  assert.equal(isRealPcacBody(fake.body), false, "FR notice / names-and-uses is not this SKU");

  const combined = parsePcacText(readFx("combined-pack.txt"), {
    sourceUrl: "https://www.fda.gov/media/193342/download",
    substance: "Introduction",
  });
  assert.equal(isCombinedSponsorPack(combined.body), true);
  assert.equal(isRealPcacBody(combined.body), false, "combined sponsor/AdComm pack is not this SKU");

  const stripped = stripNominatorPacks(readFx("193344.txt"));
  assert.ok(stripped.includes("a balancing of the criteria weighs against emideltide"));
  assert.ok(!/How is the ingredient supplied\?/i.test(stripped));

  const manifest = buildPcacManifest({
    ok: true,
    product: "fda-pcac-503a-memos",
    status: "ok",
    reason: null,
    fetchedAt: "2026-08-19T00:00:00.000Z",
    asOf: "2026-07-24",
    license: LICENSE,
    attribution: "FDA",
    sources: {
      meeting: MEETING_URL,
      frNotice: FR_NOTICE_URL,
      docket: DOCKET,
      mediaBase: "https://www.fda.gov/media/",
    },
    cards: [emiText],
  });
  const manBlob = JSON.stringify(manifest);
  assert.equal(manifest.cardCount, 1);
  assert.equal((manifest.cards as { substance: string }[])[0]?.substance, "Emideltide");
  assert.equal((manifest.cards as { mediaId: string }[])[0]?.mediaId, "193344");
  assert.equal((manifest.cards as { meeting: string }[])[0]?.meeting, "July 23-24, 2026");
  assert.ok(!manBlob.includes("weighs against emideltide"), "free manifest must not dump evaluation text");
  assert.ok(!manBlob.includes("we propose not adding"));
  assert.ok(!manBlob.includes("insufficient information concerning effectiveness"));
  assert.ok(!("body" in ((manifest.cards as object[])[0] ?? {})));
  assert.ok(manBlob.includes("193344"));
  assert.equal(manifest.priceUsdc, "0.05");
  assert.equal(manifest.license, "17 USC 105");
  assert.equal(manifest.attribution, "FDA");

  const cache = mkdtempSync(join(tmpdir(), "pcac-collect-"));
  const prevDir = process.env.PCAC_DIR;
  process.env.PCAC_DIR = cache;
  try {
    const snap = await collectPcac({ htmlDir: fixtures, limit: 24, pauseMs: 0 });
    assert.equal(snap.status, "ok");
    assert.ok((snap.listedCount ?? 0) >= 15, `fixture collect lists past first-slice 7, got ${snap.listedCount}`);
    assert.ok(snap.cards.length >= 8, `fixture collect extracts past live 7 official bodies, got ${snap.cards.length}`);
    assert.ok(snap.cards.some((c) => c.mediaId === "193344" && isRealPcacBody(c.body)));
    assert.ok(snap.cards.some((c) => c.mediaId === "193343" && isRealPcacBody(c.body)));
    assert.ok(snap.cards.some((c) => c.mediaId === "193346" && isRealPcacBody(c.body)));
    assert.ok(snap.cards.some((c) => c.mediaId === "193347" && isRealPcacBody(c.body)));
    assert.ok(snap.cards.some((c) => c.mediaId === "193348" && isRealPcacBody(c.body)));
    assert.ok(snap.cards.some((c) => c.mediaId === "182086" && c.meeting === "October 29, 2024"));
    assert.ok(snap.cards.some((c) => c.mediaId === "183584" && c.substance === "AOD-9604"));
    assert.ok(snap.cards.some((c) => c.mediaId === "183819" && c.substance === "CJC-1295"));
    assert.ok(snap.cards.every((c) => isRealPcacBody(c.body)));
    assert.ok(!snap.cards.some((c) => c.mediaId === "193342"), "skip combined intro pack");
    assert.ok(!snap.cards.some((c) => c.mediaId === "193345"), "do not harvest the whole docket / missing local body");
    assert.ok(!snap.cards.some((c) => c.mediaId === "158541"), "skip leftover 2022 combined briefing information");
    assert.ok(!snap.cards.some((c) => c.mediaId === "95976"), "skip leftover 2016 combined briefing information");
    assert.ok(snap.cards.every((c) => officialFdaMediaUrl(c.sourceUrl)));
    assert.ok(snap.cards.every((c) => !/archive\.org|govinfo\.gov|regulations\.gov/i.test(c.sourceUrl)));
    const grownManifest = buildPcacManifest(snap);
    assert.ok((grownManifest.cardCount as number) >= 8);
    assert.ok(
      (grownManifest.cards as { mediaId: string; meeting: string }[]).some(
        (c) => c.mediaId === "182086" && c.meeting === "October 29, 2024",
      ),
    );
    assert.ok(!JSON.stringify(grownManifest).includes("weighs against"), "free index stays substance/date/meeting/mediaId/sourceUrl");

    writeFileSync(join(cache, "snapshot.json"), JSON.stringify(snap));
    const merged = await collectPcac({ htmlDir: fixtures, limit: 1, pauseMs: 0 });
    assert.ok(merged.cards.some((c) => c.mediaId === "193344"), "re-collect keeps cached bodies");
    assert.ok((merged.reused ?? 0) >= 5);
  } finally {
    if (prevDir === undefined) delete process.env.PCAC_DIR;
    else process.env.PCAC_DIR = prevDir;
  }

  console.log("pcac parser tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
