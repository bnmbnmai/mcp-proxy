# TTB Offer in Compromise text — x402 door

Official TTB-authored **institution/company Offer in Compromise TEXT** extracted from Abstract and Statement PDFs on `www.ttb.gov`. Page-1 is often a scan; `tesseract --psm 6` is OK. Does not invent order text. Not the press/teaser. Not people. Not Federal Register `raw_text`. Not De Novo `/denovo-orders`. Not FIFRA `/fifra-orders`. Not CFTC `/cftc-orders`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /ttb-oic` is HTTP 402.

v1 seeds **5** official institution OIC PDFs. Required seed is The 21st Amendment Brewery Cafe, LLC (accepted 30 Jun 2026). Family: Delmic Enterprise LLC, Societe Brewing Company, LLC, Satellite Spirits Inc., Workhorse Brewing Company, Inc. Skip people.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /ttb-oic` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /ttb-oic/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.ttb.gov/business-central/fo/administrative-cases
- Official PDFs: `https://www.ttb.gov/system/files/{YYYY-MM}/{file}.pdf`
- Required seed: The 21st Amendment Brewery Cafe, LLC — accepted 30 Jun 2026 — https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf
- License: **17 USC 105**. Attribute TTB.

Paid body keeps the existing `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=ttb-oic`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official TTB listing). A repeat buyer diffs `asOf` + record ids.

Free manifest is institution / docket / date / sourceUrl only. Needles such as `$423,681.93`, `1,217,201.38`, and `2010 Williams St.` stay out of unpaid responses.

`data/ttb-oic/` is gitignored. Live-apply on apollo stays at the 5 official seeds.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export TTB_OIC_DIR=$HOME/projects/mcp-proxy/data/ttb-oic
TTB_OIC_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/ttb-oic TTB_OIC_LIMIT=5 npm run collect:ttb-oic
```
