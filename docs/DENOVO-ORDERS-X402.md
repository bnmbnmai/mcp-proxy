# FDA De Novo classification-order text — x402 door

Official FDA-authored **institution/company De Novo classification-order TEXT** extracted from per-order PDFs on `www.accessdata.fda.gov`. Does not invent order text. Not the press/teaser. Not people. Not Federal Register `raw_text`. Not FIFRA `/fifra-orders`. Not CFTC `/cftc-orders`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /denovo-orders` is HTTP 402.

v1 seeds **5** official institution classification-order PDFs. Required seed is Caristo Diagnostics Ltd. CaRi-Heart (`DEN250042`). Family: Hjarta Care, LLC (`DEN250033`), Automated Imaging Diagnostics, LLC (`DEN240071`), Tyto Care Ltd. (`DEN250014`), LifeVac LLC (`DEN250012`). Skip people.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /denovo-orders` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /denovo-orders/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/denovo.cfm
- Official PDFs: `https://www.accessdata.fda.gov/cdrh_docs/pdf{YY}/DEN{nnnnnn}.pdf`
- Required seed: Caristo Diagnostics Ltd. — DEN250042 — dated 28 Jul 2026 — https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf
- License: **17 USC 105**. Attribute FDA.

Free manifest is institution / docket / date / sourceUrl only. Needles such as `21 CFR 870.2215`, `Doc ID# 04017.08.05`, and `adults from 30 to 80 years old` stay out of unpaid responses.

`data/denovo-orders/` is gitignored. Live-apply on apollo stays at the 5 official seeds.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export DENOVO_ORDERS_DIR=$HOME/projects/mcp-proxy/data/denovo-orders
DENOVO_ORDERS_LIMIT=5 DENOVO_ORDERS_MAX_FETCH=8 npm run collect:denovo-orders
```
