# GET /ccb-determinations — Copyright Claims Board Final Determination text

Official **Copyright Claims Board** Final Determination TEXT extracted from `dockets.ccb.gov/document/download/{id}` PDFs (`%PDF`), indexed by the public Document search filtered to Final Determination (`docTypeGroup=type:19`). Docket form `YY-CCB-NNNN`. 17 U.S.C. § 105. Same extracted-body pipe as `/ibla-decisions`, `/ttab-decisions`, and `/oalj-decisions`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**.

**Habit through Sep 22 2026.** Scout seeds (must collect into bag):

| Docket | Parties | Filed | Doc id |
| --- | --- | --- | --- |
| 24-CCB-0180 | Ping Lau / Skievaski | 2026-09-22 | 21779 |
| 23-CCB-0332 | Bell v ARHA ($750) | 2026-09-22 | 21743 |
| 24-CCB-0405 | Boeker default ($3,000) | 2026-09-14 | 21582 |
| 25-CCB-0121 | Johnson | 2026-08-18 | 21036 |

**Leak PASS:** search is metadata + download href only; eCCB APIs Login HTML/404; FR distinctive dockets/parties all 0; CourtListener 0. Free discovery is leak-clean: counts + docket / parties / caption / kind / date + `paidUrl` only. **No `sourceUrl`**, no `/document/download/` path, no determination narrative.

**Not this SKU:** eCCB Login HTML, Request for Certified Copy of Final Determination, FR wraps, CourtListener. **Not `/ttab-decisions`.** **Not `/ibla-decisions`.** **Not `/oalj-decisions`.** **Not `/cbca-decisions`** (HF free dumps — stay KILLED).

**Path:** `/ccb-determinations` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

```bash
CCB_DETERMINATIONS_DIR=$HOME/projects/mcp-proxy/data/ccb-determinations \
  CCB_DETERMINATIONS_LIMIT=8 CCB_DETERMINATIONS_MAX_FETCH=8 CCB_DETERMINATIONS_PAGES=2 \
  npm run collect:ccb-determinations
```

Dry fixture collect:

```bash
CCB_DETERMINATIONS_DIR=/tmp/ccb-determinations-dry \
  CCB_DETERMINATIONS_HTML_DIR=src/fixtures/ccb-determinations \
  CCB_DETERMINATIONS_LIMIT=8 CCB_DETERMINATIONS_MAX_FETCH=0 \
  npm run collect:ccb-determinations
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service` after checkout of this branch. Do not replace other door caches. Do not message Bruce.

```bash
export CCB_DETERMINATIONS_DIR=$HOME/projects/mcp-proxy/data/ccb-determinations
mkdir -p "$CCB_DETERMINATIONS_DIR"
CCB_DETERMINATIONS_LIMIT=8 CCB_DETERMINATIONS_MAX_FETCH=8 CCB_DETERMINATIONS_PAGES=2 npm run collect:ccb-determinations
# add CCB_DETERMINATIONS_DIR to idaho-ticks-x402.service user unit
systemctl --user daemon-reload
systemctl --user restart idaho-ticks-x402.service
```

## Lander card

This repo does not own the bnm.farm lander. Paste on the tv-remote **live tip**, not stub `main`, only after apply. Count hydrates from `GET /ccb-determinations/manifest.json` (`cardCount`). Do not hardcode a door count or the bag size.

```html
<article class="door" data-door="ccb-determinations">
  <h2>CCB Determinations</h2>
  <p>Official Copyright Claims Board Final Determination text. 17 U.S.C. § 105. $0.05 newest 10 · $0.02 one id.</p>
  <p class="live">Live: <span data-hydrate="cardCount">…</span> official texts</p>
  <a href="https://ticks.bnm.farm/ccb-determinations/manifest.json">Free index</a>
</article>
```
