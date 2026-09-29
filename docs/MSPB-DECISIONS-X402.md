# GET /mspb-decisions — MSPB nonprecedential and precedential decision text

Official **Merit Systems Protection Board** decision text extracted from `mspbpublic.azurewebsites.net` PDFs (`%PDF`). 17 U.S.C. § 105. Same extracted-body pipe as `/oalj-decisions`, `/fmshrc-orders`, `/oshrc-orders`, `/ecab-decisions`, `/fcc-eb-orders`, `/nlrb-decisions`, and `/cbca-decisions`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. `?before=` is the older page at **$0.05**. `?since=` is newer-than at **$0.05**.

Primary bag is **nonprecedential** (high cadence). Precedential Opinion & Orders fat-cache onto the same door (`kind=precedential`). There is no precedential-only door.

Official indexes (manifest JSON; `DOCUMENT_CONTENT` is empty and is not the sold body):

- https://mspbpublic.azurewebsites.net/decisions/nonprecedential/NonPrecedentialDecisions_Manifest-updmar2025.json
- https://mspbpublic.azurewebsites.net/decisions/precedential/PrecedentialDecisions_Manifest_updMar2025.json

PDF pattern: `https://mspbpublic.azurewebsites.net/decisions/{nonprecedential|precedential}/{FILE_NAME}`

**First bag is a small slice, not a mass harvest.** `listedCount` is unique index rows kept (dashed docket plus a safe official PDF filename), not the raw JSON length and not PDFs downloaded. On 2026-09-29 the raw nonprecedential index was 10,691 rows (10,673 kept) and the raw precedential index was 16,816 rows (5,858 kept; older undashed docket numbers stay out of this index). That collect recorded `listedCount` 16,528 and `cardCount` 7. Default limit and max fetch are 6. Four slips are pinned so the bag stays honest if the limit fills with newer neighbors.

Pinned seeds:

| Id | Kind | Order | Date | Party |
| --- | --- | --- | --- | --- |
| `mspb-np-dc-3443-25-2251-i-1-2026-09-28` | nonprecedential | Final Order | 2026-09-28 | Tanetta N. Isler, Consumer Product Safety Commission |
| `mspb-np-ph-0752-24-0241-i-1-2026-09-17` | nonprecedential | Final Order | 2026-09-17 | Lucianna Wais, Department of the Army |
| `mspb-np-ph-3443-25-1805-i-1-2026-09-17` | nonprecedential | Final Order | 2026-09-17 | Juliann Phelps, General Services Administration |
| `mspb-p-da-0752-25-0110-i-1-2026-09-01` | precedential | Opinion and Order | 2026-09-01 | Arielle Rivera, Department of Justice (`2026 MSPB 8`) |

Isler (8 pages, `%PDF-1.7`, issued 2026-09-28) is an official PDF newer than the manifest's newest `ISSUED_DATE` (2026-09-17). It is pinned, not a claim that the whole September set was harvested.

**Served free catalog is leak-clean.** `GET /mspb-decisions/manifest.json` and `/mspb-decisions/index` return HTTP 200 with docket, kind, order kind, date, citation, institution, and `paidUrl`. The shared decorator drops `sourceUrl` and the decision narrative. The collector manifest still keeps each card's `sourceUrl` before that decorator. Opinion text is only on the paid body. `?kind=nonprecedential` and `?kind=precedential` are exact. `?q=` is the shared substring search (docket, institution, citation, title). The word nonprecedential contains precedential, so `?q=precedential` is not the kind filter.

**This SKU:** official MSPB decision PDFs. **Not this SKU:** Westlaw, Lexis, NLRB CiteNet, and MSPB JSON rows whose `DOCUMENT_CONTENT` is already the decision text. **Not `/nlrb-decisions`.** **Not `/oalj-decisions`.** **Not `/ecab-decisions`.**

**Path:** `/mspb-decisions` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

```bash
MSPB_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/mspb-decisions \
  MSPB_DECISIONS_LIMIT=6 MSPB_DECISIONS_MAX_FETCH=6 \
  npm run collect:mspb-decisions
```

Dry fixture collect (local manifest JSON + four seed texts; no network):

```bash
MSPB_DECISIONS_DIR=/tmp/mspb-decisions-dry \
  MSPB_DECISIONS_MANIFEST_DIR=src/fixtures/mspb-decisions \
  MSPB_DECISIONS_LIMIT=6 MSPB_DECISIONS_MAX_FETCH=0 \
  npm run collect:mspb-decisions
```

## Handoff

This change is a PR only. Do not restart `idaho-ticks-x402.service` and do not touch apollo or media-box from the cloud agent that opened the PR. After checkout on the door host, set `MSPB_DECISIONS_DIR` and collect the small bag before listing the path.

Door count is `publicBazaarSkus().length`. MCP tools are generated from live `/.well-known/x402`. Do not hardcode a door count or the bag size.

## Lander card

This repo does not own the bnm.farm lander. Paste on the tv-remote live tip after the door host is updated. Count hydrates from `GET /mspb-decisions/manifest.json` (`cardCount`).

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">MSPB Decisions</h2>
  <p class="facts" id="mspb-decisions-facts">MSPB nonprecedential and precedential decision text. Live: <strong>…</strong> official texts. $0.02 one text / $0.05 newest 10.</p>
  <a class="primary" href="https://ticks.bnm.farm/mspb-decisions">Endpoint</a>
  <a href="https://ticks.bnm.farm/mspb-decisions/manifest.json">Manifest</a>
</article>
```
