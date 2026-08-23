# FMC Commission / ALJ order text — x402 door

Official US Federal Maritime Commission **institution/company Commission or ALJ Shipping Act order TEXT** extracted with `pdftotext` from PDFs on `www2.fmc.gov/readingroom/`. Does not invent order text. Not people. Not press HTML. Not F.M.C.2d compilations through 2024. Not the 2023 FR OIH notice. Not `/mariners` LNM. Not PHMSA `/phmsa-cop`. Not FR. Not catalog.data.gov. Not ICO `/ico-mpn`. Not IPO `/ipo-tm`. Not a stub.

**Prep only. Do not list on well-known / OpenAPI / llms.txt / shop catalog.** Unpaid `GET /fmc-orders` is HTTP 402.

v1 seeds **5** official company/institution Commission or ALJ order PDFs. Required lead is MSC Mediterranean Shipping Company S.A. (`msc-23-08`, Docket 23-08, Order on Initial Decision, 6 Jan 2026). Family: Orient Overseas Container Line Limited / OOCL (Europe) Limited (`oocl-23-02`), Hapag-Lloyd AG (`hapag-cc-002`), Yang Ming Marine Transport Corp. (`yang-ming-24-10`), World Shipping Council (`wsc-25-10`). Skip people. Skip press HTML. Skip F.M.C.2d. Skip 2023 FR OIH.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /fmc-orders` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /fmc-orders/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www2.fmc.gov/readingroom/
- Official PDFs: `https://www2.fmc.gov/readingroom/docs/{docket}/{file}.pdf/`
- Required seed: MSC — 6 Jan 2026 — https://www2.fmc.gov/readingroom/docs/23-08/(32)%2023-08%20Order%20on%20Initial%20Decision%20(public).pdf/
- License: **17 U.S.C. § 105** (FMC federal). Sold body is FMC-authored TEXT only.

Free manifest is institution / docket / date / sourceUrl only. Sold-body needles such as `2,629`, `Jarkesy`, `Descartes`, and `22,670,000` stay out of unpaid responses. Card log / $22.67m teaser is not the sold body.

`data/fmc-orders/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export FMC_ORDERS_DIR=$HOME/projects/mcp-proxy/data/fmc-orders
FMC_ORDERS_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/fmc-orders FMC_ORDERS_LIMIT=5 npm run collect:fmc-orders
```
