# GET /ferc-issuances — FERC eLibrary Commission order/opinion and ALJ initial-decision text

Official **Federal Energy Regulatory Commission** issuance text from public eLibrary slips. 17 U.S.C. § 105. Same extracted-body pipe as `/mspb-decisions`, `/cbca-decisions`, `/oalj-decisions`, and `/ecab-decisions`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. `?before=` is the older page at **$0.05**. `?since=` is newer-than at **$0.05**.

Both kinds stay on this door. A one-kind env does not drop the other.

- **commission** — class `Order/Opinion`, type `Commission Order/Opinion`
- **alj** — class `ALJ Issuance`, type `ALJ Initial Decision`

This is not `/ferc-orders`. `/ferc-orders` is institution stipulation-and-consent, show-cause, and civil-penalty text from `cms.ferc.gov` PDFs indexed off the ferc.gov civil-penalty year tables (`IN` dockets such as `IN25-6-000`). `/ferc-issuances` is eLibrary Commission Orders/Opinions and ALJ Initial Decisions (CP, ER, EL, OR, PR, and the rest).

Official search (POST JSON; the free manifest names this URL and the two class/type pairs, not a file download):

- https://elibrary.ferc.gov/eLibrarywebapi/api/Search/AdvancedSearch

Paid locator (stripped from the free manifest): `https://elibrary.ferc.gov/eLibrary/docinfo?accession_number={accession}`

Slip bytes are `POST https://elibrary.ferc.gov/eLibrarywebapi/api/File/DownloadPDF?accesssionNumber={accession}` with `{"FileID":"{fileId}","Islegacy":false}`. The query spells accession with three s. DownloadPDF returns a PDF for native PDF slips and for DOCX slips. Public files only (`availCode` P). A `PRIV` twin is skipped. eLibrary `curPage` 0 and 1 are the same first page; the next page is `curPage` 2.

**First bag is a small slice, not a mass harvest.** `listedCount` is unique index rows kept after the client filter, not raw `totalHits` and not PDFs downloaded. The class filter is not exclusive, so the collector keeps only the exact document type, a public file, and a real docket. It drops Formal Notices, Delegated Orders, ALJ procedural and discovery orders, `PRIV` twins, empty dockets, and eLibrary smoke tests (`TESTDOCUMENTONLY`, `smoke test`, `eLibrary Test`).

Windows on the 2026-09-29 cold collect: Commission filed on or after 2026-01-01, ALJ Initial Decisions filed on or after 2018-01-01. That run recorded `listedCount` **820** and `cardCount` **9** (`asOf` 2026-09-28). It fetched 10 slips; one had no extractable order text. Default limit and max fetch are 8. Four slips are pinned so the bag still has both kinds when the newest slice is all Commission orders.

Pinned seeds:

| Id | Kind | Docket | Date | Cite | Party |
| --- | --- | --- | --- | --- | --- |
| `ferc-commission-20260928-3137` | commission | CP23-29-002 | 2026-09-28 | 196 FERC ¶ 61,241 | Saguaro Connector Pipeline, L.L.C. |
| `ferc-commission-20260925-3063` | commission | OR26-1-000 | 2026-09-25 | 196 FERC ¶ 61,236 | ExxonMobil Oil Corporation v. LOCAP LLC |
| `ferc-alj-20260505-3058` | alj | EL24-67-001 | 2026-05-05 | 195 FERC ¶ 63,017 | Viridon New York Inc. |
| `ferc-alj-20251125-3026` | alj | EL02-60-018 (also EL02-62-017) | 2025-11-25 | 193 FERC ¶ 63,028 | Public Utilities Commission of the State of California et al. v. Sellers of Long-Term Contracts |

**Served free catalog is leak-clean.** `GET /ferc-issuances/manifest.json` and `/ferc-issuances/index` return HTTP 200 with accession, docket, kind, order kind, date, citation, institution, library, and `paidUrl`. The shared decorator drops `sourceUrl` and the order narrative. File names are not on the free catalog (`PUB.pdf` / `PRIV.pdf` names would leak `.pdf`). The collector manifest still keeps each card's docinfo `sourceUrl` before that decorator. Order text is only on the paid body. `?kind=commission` and `?kind=alj` are exact. `?q=` searches accession, docket, kind, citation, institution, library, and title.

**This SKU:** public eLibrary Commission Order/Opinion and ALJ Initial Decision slips. **Not this SKU:** Delegated Orders, dissents, notices, ALJ procedural or discovery orders, non-public `PRIV` files, and eLibrary test documents. **Not `/ferc-orders`.**

**Path:** `/ferc-issuances` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

```bash
FERC_ISSUANCES_DIR=$HOME/projects/mcp-proxy/data/ferc-issuances \
  FERC_ISSUANCES_LIMIT=8 FERC_ISSUANCES_MAX_FETCH=8 \
  npm run collect:ferc-issuances
```

Dry fixture collect (local search JSON + four seed texts; no network):

```bash
FERC_ISSUANCES_DIR=/tmp/ferc-issuances-dry \
  FERC_ISSUANCES_LISTING_DIR=src/fixtures/ferc-issuances \
  FERC_ISSUANCES_LIMIT=8 FERC_ISSUANCES_MAX_FETCH=0 \
  npm run collect:ferc-issuances
```

## Handoff

This change is a PR only. Do not restart `idaho-ticks-x402.service` and do not touch apollo or media-box from the cloud agent that opened the PR. After checkout on the door host, set `FERC_ISSUANCES_DIR` and collect the small bag before listing the path.

Door count is `publicBazaarSkus().length`. MCP tools are generated from live `/.well-known/x402`. Do not hardcode a door count or the bag size.

## Lander card

This repo does not own the bnm.farm lander. Paste on the tv-remote live tip after the door host is updated. Count hydrates from `GET /ferc-issuances/manifest.json` (`cardCount`).

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">FERC Issuances</h2>
  <p class="facts" id="ferc-issuances-facts">FERC eLibrary Commission order/opinion and ALJ initial-decision text. Live: <strong>…</strong> official texts. $0.02 one text / $0.05 newest 10.</p>
  <a class="primary" href="https://ticks.bnm.farm/ferc-issuances">Endpoint</a>
  <a href="https://ticks.bnm.farm/ferc-issuances/manifest.json">Manifest</a>
</article>
```
