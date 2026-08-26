# EPA Superfund Record of Decision text — x402 door

Official EPA Superfund **institution/site Record of Decision TEXT** extracted from SEMS PDFs on `semspub.epa.gov`. Does not invent ROD text. Not a Proposed Plan or fact sheet. Not people. Not Federal Register `raw_text`. Not AIR `/air-letters`. Not TTB `/ttb-oic`. Not De Novo `/denovo-orders`. Not FIFRA `/fifra-orders`. Not CFTC `/cftc-orders`. Does not wrap the free SEMS listing JSON. Does not sell CUMULIS site-summary HTML.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /superfund-rods` is HTTP 402.

v1 seeds **5** official institution/site ROD PDFs. Required seed is Federated Metals Corp. Whiting Superfund Site OU1 IROD (`05-711427`, signed 2026-08-05). Family: Meeker Avenue Plume OU2 (`02-744534`), Ten-Mile Drain (`05-988133`), Velsicol Chemical Corporation OU3 (`05-978074`), Pike and Mulberry Streets PCE Plume (`05-964773`). Skip people. Skip Proposed Plans, ESD, ROD amendments, and approval memos.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /superfund-rods` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /superfund-rods/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no ROD body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Official ROD table: https://www.epa.gov/superfund/search-superfund-decision-documents (collection **25504**)
- First-slice miss: one CUMULIS site-profile cleanup page (`fuseaction=second.Cleanup&id=0501275`) is a teaser, not the ROD table
- Listing feed the official table loads (PDF URLs only; not the sold body): https://www3.epa.gov/semsjson/HQ_MasterCollection_11.json
- Official PDFs: `https://semspub.epa.gov/work/{region}/{docid}.pdf` (`/src/document/{region}/{docid}` 301s here)
- Required seed: Federated Metals Corp. Whiting Superfund Site — OU1 IROD — signed 5 Aug 2026 — https://semspub.epa.gov/work/05/711427.pdf
- License: **17 USC 105**. Attribute U.S. EPA.

Paid body keeps the existing `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=superfund-rod`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official decision-document table). A repeat buyer diffs `asOf` + record ids.

Free manifest is institution / docket / date / sourceUrl only. Needles such as `1,200 ppm`, `lead dross`, and `x-ray florescence` stay out of unpaid responses.

`data/superfund-rods/` is gitignored.

## Apollo collect (official ROD walk)

```bash
cd ~/projects/mcp-proxy
export SUPERFUND_RODS_DIR=$HOME/projects/mcp-proxy/data/superfund-rods
SUPERFUND_RODS_LIMIT=24 SUPERFUND_RODS_MAX_FETCH=36 npm run collect:superfund-rods
```
