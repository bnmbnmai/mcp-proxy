# UK CMA CA98 infringement-decision text — x402 door

Official UK CMA **institution/company Competition Act 1998 infringement-decision TEXT** extracted from `assets.publishing.service.gov.uk` PDFs. Does not invent decision text. Not people. Not the press teaser. Not ICO `/ico-mpn`. Not Superfund `/superfund-rods`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /cma-ca98` is HTTP 402. MCP at `/mcp` generates a `cma-ca98` tool from well-known.

v1 seeds **5** official institution/company CA98 decision PDFs. Required seed is Citi–Deutsche Bank Case 50601 (`50601-citi-db`, decision 21 Feb 2025). Family: Roland electronic drums (`50565-5`), Dar Lighting (`50952`), ITW / Foster commercial refrigeration (`CE-9856-14`), Fender Europe guitars (`50565-3`). Skip people. Skip press teasers.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /cma-ca98` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /cma-ca98/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no decision body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.gov.uk/cma-cases/financial-services-sector-suspected-anti-competitive-practices
- Official PDFs: `https://assets.publishing.service.gov.uk/media/{id}/{file}.pdf`
- Required seed: Citi–Deutsche Bank — Case 50601 — 21 Feb 2025 — https://assets.publishing.service.gov.uk/media/6876390d352c290d20dcae7c/Citi-Deutsche_Bank__Non-confidential_decision.pdf
- License: **Crown copyright / Open Government Licence v3.0** (commercial reuse allowed). Departmental logos / Royal Arms reserved. Attribute UK CMA.

Paid body keeps the existing `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=cma-ca98`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official CMA listing). A repeat buyer diffs `asOf` + record ids.

Free manifest is institution / docket / date / sourceUrl only. Needles such as `Citi-DB Relevant Period`, `gilt auctions`, and `commercially sensitive information` stay out of unpaid responses.

`data/cma-ca98/` is gitignored.

## Apollo collect (5-seed)

```bash
cd ~/projects/mcp-proxy
export CMA_CA98_DIR=$HOME/projects/mcp-proxy/data/cma-ca98
CMA_CA98_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/cma-ca98 CMA_CA98_LIMIT=5 npm run collect:cma-ca98
```
