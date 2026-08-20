# USDA APHIS AIR confirmation-letter text — x402 door

Official USDA APHIS Biotechnology Regulatory Services **institution/company Am I Regulated (AIR) confirmation-letter TEXT** extracted from per-letter PDFs on `direct.aphis.usda.gov`. Does not invent letter text. Not the press/teaser. Not people. Not Federal Register `raw_text`. Not TTB `/ttb-oic`. Not De Novo `/denovo-orders`. Not FIFRA `/fifra-orders`. Not CFTC `/cftc-orders`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /air-letters` is HTTP 402.

v1 seeds **5** official institution AIR confirmation-letter PDFs. Required seed is KAGOME Co., LTD. (`26-173-01air`). Family: KAGOME `26-009-01air`, LaSemilla. Co. Ltd (`25-364-01air`), Inari Agriculture, Inc. (`25-317-01air`), The Traits Company (`25-226-01air`). Skip people.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /air-letters` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /air-letters/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no letter body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.aphis.usda.gov/confirmation-letters
- Official PDFs: `https://direct.aphis.usda.gov/sites/default/files/{YY}-{DDD}-01air-response.pdf`
- Required seed: KAGOME Co., LTD. — 26-173-01air — received 22 Jun 2026 — https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf
- License: **17 USC 105**. Attribute USDA APHIS.

Free manifest is institution / docket / date / sourceUrl only. Needles such as `enhanced abiotic stress tolerance`, `2026.08.14 09:05:45`, and `reynolds.alan@epa.gov` stay out of unpaid responses.

`data/air-letters/` is gitignored. Live-apply on apollo stays at the 5 official seeds.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export AIR_LETTERS_DIR=$HOME/projects/mcp-proxy/data/air-letters
AIR_LETTERS_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/air-letters AIR_LETTERS_LIMIT=5 npm run collect:air-letters
```
