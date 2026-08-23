# EPA Superfund Record of Decision text — x402 door

Official EPA Superfund **institution/site Record of Decision TEXT** extracted from SEMS PDFs on `semspub.epa.gov`. Does not invent ROD text. Not a Proposed Plan or fact sheet. Not people. Not Federal Register `raw_text`. Not AIR `/air-letters`. Not TTB `/ttb-oic`. Not De Novo `/denovo-orders`. Not FIFRA `/fifra-orders`. Not CFTC `/cftc-orders`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /superfund-rods` is HTTP 402.

v1 seeds **5** official institution/site ROD PDFs. Required seed is Federated Metals Corp. Whiting Superfund Site OU1 IROD (`05-711427`, signed 2026-08-05). Family: Meeker Avenue Plume OU2 (`02-744534`), Ten-Mile Drain (`05-988133`), Velsicol Chemical Corporation OU3 (`05-978074`), Pike and Mulberry Streets PCE Plume (`05-964773`). Skip people. Skip Proposed Plans.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /superfund-rods` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /superfund-rods/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no ROD body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing / site profile: https://cumulis.epa.gov/supercpad/SiteProfiles/index.cfm?fuseaction=second.Cleanup&id=0501275
- Official PDFs: `https://semspub.epa.gov/work/{region}/{docid}.pdf`
- Required seed: Federated Metals Corp. Whiting Superfund Site — OU1 IROD — signed 5 Aug 2026 — https://semspub.epa.gov/work/05/711427.pdf
- License: **17 USC 105**. Attribute U.S. EPA.

Paid body keeps the existing `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=superfund-rod`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official Superfund site profile). A repeat buyer diffs `asOf` + record ids.

Free manifest is institution / docket / date / sourceUrl only. Needles such as `1,200 ppm`, `lead dross`, and `x-ray florescence` stay out of unpaid responses.

`data/superfund-rods/` is gitignored. Live-apply on apollo stays at the 5 official seeds.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export SUPERFUND_RODS_DIR=$HOME/projects/mcp-proxy/data/superfund-rods
SUPERFUND_RODS_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/superfund-rods SUPERFUND_RODS_LIMIT=5 npm run collect:superfund-rods
```
