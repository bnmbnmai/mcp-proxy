# FinCEN institution consent-order text — x402 door

Official FinCEN-authored **institution consent-order / assessment TEXT** extracted from per-order PDFs on `fincen.gov`. Does not invent order text. Not the enforcement-actions index teaser (title / date / matter / PDF URL only). Not people-only CMP letters. Not casino cards. Not a news-release wrap. Not Federal Register `raw_text`. Not Drupal `?_format=json`. Not NCUA `/ncua-orders`. Not FRB `/frb-orders`. Not FDIC `/fdic-orders`. Not OCC `/occ-cd`. Not CFPB `/cfpb-orders`. Not FTC `/ftc-wl`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /fincen-orders` is HTTP 402.

v1 seeds **5** official institution consent-order PDFs (BD / MSB / bank). Required seeds are UBS Financial Services Inc. (`2026-02`), Canaccord Genuity LLC (`2026-01`), and Paxful (`2025-02`). Family: Brink’s Global Services USA (`2025-01`), TD Bank (`2024-02`). Skip people-only CMP and casino cards.

Leftover grow walks the same official **enforcement-actions table**. First-slice only kept rows whose listing title/URL said “consent order” and whose PDF sat in a dated folder. Leftover institution consent orders (Shinhan, Bancrédito, Brink’s) and institution CMP assessments (Capital One, JPMorgan, HSBC) stay in this SKU. Same bag: free index + `?q=`, `?id=` $0.02, newest 10 $0.05.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /fincen-orders` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /fincen-orders/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing / search (index only, not the product): https://www.fincen.gov/news/enforcement-actions
- Official PDFs: `https://www.fincen.gov/system/files/{YYYY-MM}/{name}.pdf`, `https://www.fincen.gov/system/files/enforcement_action/{YYYY-MM-DD}/{name}.pdf`, and leftover `https://www.fincen.gov/system/files/enforcement_action/{name}.pdf`
- Query form of the same file is accepted and normalized: `https://www.fincen.gov/system/files?file=2025-12%2FPaxfulConsentOrder.pdf`
- Required seed: UBS Financial Services Inc. — Number 2026-02 — dated 03 Aug 2026 — https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf
- License: **17 USC 105**. Attribute FinCEN.

Paid body fields: `id`, `docket`, `pdfId`, `institution`, `date`, `title`, `sourceUrl`, `body`. `body` is official `pdftotext` of the FinCEN-authored PDF. `sourceUrl` is always the fincen.gov PDF.

Leak-tests already passed on the live FinCEN hosts: index + NR are title/date/matter/PDF URL; `Accept: text/plain` on the PDF stays PDF; sibling `.txt` / `.json` 404; Drupal `?_format=json` → 406; Federal Register unique phrases 0. Do not re-litigate unless you find a dump of the order TEXT.

`data/fincen-orders/` is gitignored.

Free `GET /fincen-orders/manifest.json` is institution / docket / date / sourceUrl only. Needles such as `Jaclyn A. Barnao`, `61,500`, and `STATEMENT OF FACTS` stay out of unpaid responses.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `FINCEN_ORDERS_DIR` | `$HOME/projects/mcp-proxy/data/fincen-orders` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `FINCEN_ORDERS_LIMIT` | `24` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `FINCEN_ORDERS_MAX_FETCH` | `36` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `FINCEN_ORDERS_JSON_DIR` / `FINCEN_ORDERS_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.json` / leftover HTML + `{docket}.txt` |
| `FINCEN_ORDERS_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo leftover collect

Build + restart **only** `idaho-ticks-x402.service`. Do not touch hay data files.

```bash
cd ~/projects/mcp-proxy
npm run build
export FINCEN_ORDERS_DIR=$HOME/projects/mcp-proxy/data/fincen-orders
FINCEN_ORDERS_LIMIT=24 FINCEN_ORDERS_MAX_FETCH=36 npm run collect:fincen-orders
systemctl --user restart idaho-ticks-x402.service
```

Live first-slice before leftover apply: **cardCount 9**. Official enforcement-actions table lists the leftover institution consent orders and CMP assessments on the same page.

## Local smoke (cloud VM / laptop)

```bash
FINCEN_ORDERS_DIR=/tmp/fincen-orders-seed npm run collect:fincen-orders   # or copy the bundled seed
FINCEN_ORDERS_DIR=/tmp/fincen-orders-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/fincen-orders                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/fincen-orders/manifest.json   # cardCount + institution/docket/date/sourceUrl
```
