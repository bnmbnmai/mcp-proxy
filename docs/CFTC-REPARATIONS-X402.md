# GET /cftc-reparations — CFTC reparations dispositions and Commission opinions

Official **Commodity Futures Trading Commission** reparations decision text extracted from `www.cftc.gov` PDFs (`%PDF`). 17 U.S.C. § 105. Same extracted-body pipe as `/cftc-orders`, `/nlrb-decisions`, and `/eeoc-appellate`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. `?before=` is the older page at **$0.05**. `?since=` is newer-than at **$0.05**.

**Path is `/cftc-reparations`, not `/cftc-dispositions`.** The product is two bags on one door: reparations dispositions and Commission opinions/adjudicatory orders. `/cftc-dispositions` would name only the first index. `/cftc-orders` stays the enforcement institution-order door (dockets like `26-04`). Reparations dockets are `YY-R###` (for example `26-R021`).

The indexes are HTML only. `?_format=json` is HTTP 406 (`Supported formats: html`). jsonapi and `/api` are 404. This door does not invent a free JSON wrapper. It scrapes the HTML indexes, downloads the official PDFs, and sells the extracted text.

Official indexes:

- Dispositions: https://www.cftc.gov/LawRegulation/Dispositions/index.htm
- Opinions & Adjudicatory Orders: https://www.cftc.gov/LawRegulation/OpinionsAdjudicatoryOrders/index.htm

PDF pattern: `https://www.cftc.gov/sites/default/files/YYYY/MM/{file}.pdf`

**Dispositions bag** keeps reparations dockets (`YY-R##` / `YY-R###`, including older `08-R33`). Statutory-disqualification rows (`SD ##-##`) and `/media/{id}/…/download` enforcement orders are not this SKU.

**Opinions bag** keeps Commission opinions and adjudicatory orders from that index, including reparations appeals and other Commission adjudicatory orders (`YY-E-##`, CRAA). Both kinds stay on this door. There is no opinions-only door.

**First bag is a small slice, not a mass harvest.** `listedCount` is unique index rows kept, not PDFs downloaded. Default limit and max fetch are 8. Five slips are pinned so the bag stays honest if the limit fills with newer neighbors. September 2026 dispositions are on the live index.

Pinned seeds:

| Id | Kind | Docket | Date | Parties |
| --- | --- | --- | --- | --- |
| `cftc-disposition-26-r021-2026-09-29` | disposition | 26-R021 | 2026-09-29 | Cristofer Arguedas Asmad v. Interactive Brokers, LLC |
| `cftc-disposition-26-r032-2026-09-18` | disposition | 26-R032 | 2026-09-18 | Nathan Ruark v. AMP Global Clearing LLC |
| `cftc-disposition-26-r030-2026-09-18` | disposition | 26-R030 | 2026-09-18 | Aleksandar Nikoloski v. Oanda Corporation |
| `cftc-disposition-25-r015-2026-04-17` | disposition | 25-R015 | 2026-04-17 | AMA Real Estate and Financial Services, LLC v. NinjaTrader Clearing, LLC |
| `cftc-opinion-23-r001-2025-12-12` | opinion | 23-R001 | 2025-12-12 | Himanshu Shah v. GAIN Capital Group, LLC |

**Served free catalog is leak-clean.** `GET /cftc-reparations/manifest.json` and `/cftc-reparations/index` return HTTP 200 with id, docket, kind, date, title, institution, and `paidUrl`. The shared decorator drops `sourceUrl` and the decision narrative. Opinion and disposition text is only on the paid body. `?kind=disposition` and `?kind=opinion` are exact. `?q=` is the shared substring search (docket, institution, title).

**This SKU:** official CFTC reparations disposition PDFs and Commission opinion PDFs. **Not this SKU:** `/cftc-orders` enforcement orders, the enforcement manual, statutory-disqualification dispositions, Westlaw, and Lexis. **Not a free JSON API.**

**Path:** `/cftc-reparations` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

```bash
CFTC_REPARATIONS_DIR=$HOME/projects/mcp-proxy/data/cftc-reparations \
  CFTC_REPARATIONS_LIMIT=8 CFTC_REPARATIONS_MAX_FETCH=8 \
  npm run collect:cftc-reparations
```

Dry fixture collect (local HTML + five seed texts; no network):

```bash
CFTC_REPARATIONS_DIR=/tmp/cftc-reparations-dry \
  CFTC_REPARATIONS_LISTING_DIR=src/fixtures/cftc-reparations \
  CFTC_REPARATIONS_LIMIT=8 CFTC_REPARATIONS_MAX_FETCH=0 \
  npm run collect:cftc-reparations
```

## Handoff

This change is a PR only. Do not restart `idaho-ticks-x402.service` and do not collect on apollo from this agent. Evening collect stays on the door host. After checkout on the door host, set `CFTC_REPARATIONS_DIR` and collect the small bag before relying on a full cache. The path is listed from `PUBLIC_BAZAAR_SKUS` once this build is the one the host runs.

Door count is `publicBazaarSkus().length`. MCP tools are generated from live `/.well-known/x402`. Do not hardcode a door count or the bag size.

## Lander card

This repo does not own the bnm.farm lander. Paste on the tv-remote live tip after the door host is updated. Count hydrates from `GET /cftc-reparations/manifest.json` (`cardCount`).

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">CFTC Reparations</h2>
  <p class="facts" id="cftc-reparations-facts">CFTC reparations dispositions and Commission opinions. Live: <strong>…</strong> official texts. $0.02 one text / $0.05 newest 10.</p>
  <a class="primary" href="https://ticks.bnm.farm/cftc-reparations">Endpoint</a>
  <a href="https://ticks.bnm.farm/cftc-reparations/manifest.json">Manifest</a>
</article>
```
