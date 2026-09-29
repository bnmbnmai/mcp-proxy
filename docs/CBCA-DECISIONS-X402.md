# GET /cbca-decisions — CBCA decision, dismissal, and order text

Official **Civilian Board of Contract Appeals** (GSA) decision, dismissal, and order text extracted from `cbca.gov` PDFs (`%PDF`) indexed by the public HTML tables. 17 U.S.C. § 105. Same extracted-body pipe as `/oalj-decisions`, `/ecab-decisions`, `/fcc-eb-orders`, and `/uscg-alj-decisions`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. `?before=` is the older page at **$0.05**. `?since=` is newer-than at **$0.05**.

Indexes walked:

- https://www.cbca.gov/decisions/cda-cases.html
- https://www.cbca.gov/decisions/fema.html
- https://www.cbca.gov/decisions/relocation.html
- https://www.cbca.gov/decisions/travel.html

**First bag is a small slice, not a mass harvest.** The HTML indexes list thousands of slips. The collector walks those rows (`listedCount`) and extracts only `CBCA_DECISIONS_LIMIT` newest PDFs plus four pinned seeds (`cardCount`). Default limit and max fetch are 6.

Pinned seeds:

| Id | Docket | Kind | Date | Party |
| --- | --- | --- | --- | --- |
| `cbca-8825-2026-09-23-decision` | CBCA 8825 | Decision | 2026-09-23 | The Gilchrist Law Firm, P.A. |
| `cbca-8875-2026-09-21-dismissal` | CBCA 8875 | Dismissal | 2026-09-21 | ECG GSA 1, LLC |
| `cbca-8974-fema-2026-09-21-decision` | CBCA 8974-FEMA | Decision | 2026-09-21 | Care Plus Bergen |
| `cbca-8350-fema-2026-08-12-order` | CBCA 8350-FEMA | Order | 2026-08-12 | Board of Trustees of Bay Medical Center |

**Served free catalog is leak-clean.** `GET /cbca-decisions/manifest.json` and `/cbca-decisions/index` return HTTP 200 with docket, program, kind, date, judge, institution, and `paidUrl`. The shared decorator drops `sourceUrl` and the decision narrative. The collector manifest still keeps `sourceUrl` before that decorator. Opinion text is only on the paid body.

**This SKU:** official decision, dismissal, and order PDFs under `https://www.cbca.gov/files/decisions/`. **Not this SKU:** the HTML index, how-to PDFs, and other tribunals. **Not `/oalj-decisions`.** **Not `/ecab-decisions`.** **Not `/ccb-determinations`.**

**Path:** `/cbca-decisions` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

```bash
CBCA_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/cbca-decisions \
  CBCA_DECISIONS_LIMIT=6 CBCA_DECISIONS_MAX_FETCH=6 \
  npm run collect:cbca-decisions
```

Dry fixture collect (local HTML + four seed texts; no network):

```bash
CBCA_DECISIONS_DIR=/tmp/cbca-decisions-dry \
  CBCA_DECISIONS_HTML_DIR=src/fixtures/cbca-decisions \
  CBCA_DECISIONS_LIMIT=6 CBCA_DECISIONS_MAX_FETCH=0 \
  npm run collect:cbca-decisions
```

## Handoff

This change is a PR only. Do not restart `idaho-ticks-x402.service` and do not touch apollo or media-box from the cloud agent that opened the PR. After checkout on the door host, set `CBCA_DECISIONS_DIR` and collect the small bag before listing the path.

Door count is `publicBazaarSkus().length`. MCP tools are generated from live `/.well-known/x402`. Do not hardcode a door count or the bag size.

## Lander card

This repo does not own the bnm.farm lander. Paste on the tv-remote live tip after the door host is updated. Count hydrates from `GET /cbca-decisions/manifest.json` (`cardCount`).

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">CBCA Decisions</h2>
  <p class="facts" id="cbca-decisions-facts">CBCA decision, dismissal, and order text. Live: <strong>…</strong> official texts. $0.02 one text / $0.05 newest 10.</p>
  <a class="primary" href="https://ticks.bnm.farm/cbca-decisions">Endpoint</a>
  <a href="https://ticks.bnm.farm/cbca-decisions/manifest.json">Manifest</a>
</article>
```
