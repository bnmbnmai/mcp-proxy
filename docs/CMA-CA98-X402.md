# UK CMA CA98 infringement-decision text — x402 door

Official UK CMA **institution/company Competition Act 1998 infringement-decision TEXT** extracted from `assets.publishing.service.gov.uk` PDFs. Does not invent decision text. Not people. Not the press teaser. Not ICO `/ico-mpn`. Not Superfund `/superfund-rods`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /cma-ca98` is HTTP 402. MCP at `/mcp` generates a `cma-ca98` tool from well-known.

v1 seeds **5** official institution/company CA98 decision PDFs. Required seed is Citi–Deutsche Bank Case 50601 (`50601-citi-db`, decision 21 Feb 2025). Family: Roland electronic drums (`50565-5`), Dar Lighting (`50952`), ITW / Foster commercial refrigeration (`CE-9856-14`), Fender Europe guitars (`50565-3`). Skip people. Skip press teasers.

Leftover grow walks the official **CMA cases finder** (CA98 infringement Chapter I / Chapter II), then each case page, for `assets.publishing.service.gov.uk` decision PDFs. First-slice only parsed the financial-services case page. Penalty notices, court judgments, and summaries stay out. Same bag: free index + `?q=`, `?id=` $0.02, newest 10 $0.05.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /cma-ca98` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /cma-ca98/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no decision body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- First-slice listing: https://www.gov.uk/cma-cases/financial-services-sector-suspected-anti-competitive-practices
- Official leftover index: https://www.gov.uk/cma-cases?case_type%5B%5D=ca98-and-civil-cartels&outcome_type%5B%5D=ca98-infringement-chapter-i&outcome_type%5B%5D=ca98-infringement-chapter-ii
- Official PDFs: `https://assets.publishing.service.gov.uk/media/{id}/{file}.pdf`
- Required seed: Citi–Deutsche Bank — Case 50601 — 21 Feb 2025 — https://assets.publishing.service.gov.uk/media/6876390d352c290d20dcae7c/Citi-Deutsche_Bank__Non-confidential_decision.pdf
- License: **Crown copyright / Open Government Licence v3.0** (commercial reuse allowed). Departmental logos / Royal Arms reserved. Attribute UK CMA.

Paid body keeps the existing `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=cma-ca98`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official CMA listing). A repeat buyer diffs `asOf` + record ids.

Free manifest is institution / docket / date / sourceUrl only. Needles such as `Citi-DB Relevant Period`, `gilt auctions`, and `commercially sensitive information` stay out of unpaid responses.

`data/cma-ca98/` is gitignored.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `CMA_CA98_DIR` | `$HOME/projects/mcp-proxy/data/cma-ca98` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `CMA_CA98_LIMIT` | `24` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `CMA_CA98_MAX_FETCH` | `36` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `CMA_CA98_MAX_INDEX_PAGES` | `3` | Official CMA cases-finder pages to walk |
| `CMA_CA98_MAX_CASES` | `80` | Max official case pages to open for decision PDF links |
| `CMA_CA98_JSON_DIR` / `CMA_CA98_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.json` / leftover HTML + `{docket}.txt` |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo leftover collect

Build + restart **only** `idaho-ticks-x402.service`. Do not touch hay data files.

```bash
cd ~/projects/mcp-proxy
npm run build
export CMA_CA98_DIR=$HOME/projects/mcp-proxy/data/cma-ca98
CMA_CA98_LIMIT=24 CMA_CA98_MAX_FETCH=36 npm run collect:cma-ca98
systemctl --user restart idaho-ticks-x402.service
```

## Local smoke (cloud VM / laptop)

```bash
CMA_CA98_DIR=/tmp/cma-ca98-seed CMA_CA98_JSON_DIR=src/fixtures/cma-ca98 npm run collect:cma-ca98
CMA_CA98_DIR=/tmp/cma-ca98-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/cma-ca98                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/cma-ca98/manifest.json   # cardCount + institution/docket/date/sourceUrl
```
