# GET /msha-fatals — MSHA Fatality Investigation Final Report text

Official **Mine Safety and Health Administration** Fatality Investigation Final Report text from public msha.gov Final Report PDFs. 17 U.S.C. § 105. Same extracted-body pipe as `/fmshrc-orders`, `/ferc-issuances`, and `/bsee-reports`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. `?before=` is the older page at **$0.05**. `?since=` is newer-than at **$0.05**. Empty `?since=` is HTTP 304.

This is not `/fmshrc-orders`. `/fmshrc-orders` stays Federal Mine Safety and Health Review Commission ALJ and Commission decisions. `/msha-fatals` is the MSHA investigation final: the Final Report PDF on the fatality-report page. Preliminary reports and fatality alerts are not this SKU, including the 2026 alerts after May 19 that have no final yet.

Official search (named on the free manifest; not a file download):

- https://www.msha.gov/data-and-reports/fatality-reports/search

Paid locator (stripped from the free manifest): the final-report HTML page, for example `https://www.msha.gov/data-reports/fatality-reports/2026/march-5-2026-fatality/final-report`. The PDF under `/sites/default/files/Data_Reports/Fatals/Enforcement/` stays off the free catalog. A path that does not contain `final` is rejected, so a preliminary PDF cannot enter the bag.

**First bag is a small slice, not a mass harvest.** `listedCount` is unique final-report pages kept from the search index. `cardCount` is PDFs whose text extracted. Report date is the PDF CreationDate. Catalog `date` and `asOf` use that report date, so `?since=` sees a newly published final. Accident date comes from the page slug.

The 2026-09-29 cold collect (`MSHA_FATALS_LIMIT=8`, `MSHA_FATALS_MAX_FETCH=8`) recorded `listedCount` **599** and `cardCount` **8** (`asOf` 2026-08-28). It fetched 8 PDFs. None failed text extraction (`skippedNoText` 0, `failed` empty). The five 2026 finals through May 19 are in that slice, plus three late-2025 finals that still fit the limit. Deer Run, Panther Eagle, and Ohio County are pinned so those seeds stay in a later bag.

| Id | Mine | Operator | State | Sector | Accident | Report |
| --- | --- | --- | --- | --- | --- | --- |
| `FAI-F012928-1` | Bailey Mine | Consol Pennsylvania Coal Company, LLC | Pennsylvania | coal | 2026-05-19 | 2026-08-28 |
| `FAI-F00BE1D-1` | Deer Run Mine | Patton Mining LLC | Illinois | coal | 2026-03-05 | 2026-08-11 |
| `FAI-6322887-1` | Panther Eagle Mine | Marfork Coal Company | West Virginia | coal | 2026-04-02 | 2026-07-24 |
| `FAI-F031904-1` | Danby Quarry | Vermont Quarries Corp. | Vermont | metal/nonmetal | 2026-01-19 | 2026-07-07 |
| `FAI-F0143E4-1` | Ohio County Mine | Ohio County Coal Resources, Inc. | West Virginia | coal | 2026-04-03 | 2026-06-30 |

**Served free catalog is leak-clean.** `GET /msha-fatals/manifest.json` and `/msha-fatals/index` return HTTP 200 with id, mine, operator, state, sector, accident date, report date, classification, and `paidUrl`. The shared decorator drops `sourceUrl` and adds `paidUrl`. Root causes, enforcement actions, citations, victim role, and the report body are only on the paid JSON. `?sector=coal` and `?sector=metal/nonmetal` are exact. `?q=` searches id, mine, operator, state, sector, dates, classification, and title.

**This SKU:** MSHA Fatality Investigation Final Report text. **Not this SKU:** preliminary reports, fatality alerts, and `/fmshrc-orders`.

**Path:** `/msha-fatals` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

```bash
MSHA_FATALS_DIR=$HOME/projects/mcp-proxy/data/msha-fatals \
  MSHA_FATALS_LIMIT=8 MSHA_FATALS_MAX_FETCH=8 \
  npm run collect:msha-fatals
```

Dry fixture collect (local listing HTML + seed texts; no network):

```bash
MSHA_FATALS_DIR=/tmp/msha-fatals-dry \
  MSHA_FATALS_LISTING_DIR=src/fixtures/msha-fatals \
  MSHA_FATALS_LIMIT=8 MSHA_FATALS_MAX_FETCH=0 \
  npm run collect:msha-fatals
```

## Handoff

This change is a PR only. Do not restart `idaho-ticks-x402.service` and do not touch apollo or media-box from the cloud agent that opened the PR. After checkout on the door host, set `MSHA_FATALS_DIR` and collect the small bag before listing the path.

Door count is `publicBazaarSkus().length`. With form-483, gmp, and gmp-md caches present, that count moves from 75 to 76. MCP tools are generated from live `/.well-known/x402`. Do not hardcode a door count or the bag size.

## Lander card

This repo does not own the bnm.farm lander. Paste on the tv-remote live tip after the door host is updated. Count hydrates from `GET /msha-fatals/manifest.json` (`cardCount`).

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">MSHA Fatals</h2>
  <p class="facts" id="msha-fatals-facts">MSHA Fatality Investigation Final Report text. Live: <strong>…</strong> official texts. $0.02 one text / $0.05 newest 10.</p>
  <a class="primary" href="https://ticks.bnm.farm/msha-fatals">Endpoint</a>
  <a href="https://ticks.bnm.farm/msha-fatals/manifest.json">Manifest</a>
</article>
```
