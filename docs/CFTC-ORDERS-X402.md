# CFTC institution enforcement-order / settlement text — x402 door

Official CFTC-authored **institution/company enforcement-order / settlement TEXT** extracted from per-order PDFs on `www.cftc.gov`. Does not invent order text. Not the press/teaser (institution / docket / date / PDF URL only). Not people files. Not Federal Register `raw_text`. Not BIS `/bis-orders`. Not OFAC `/ofac-orders`. Not FERC `/ferc-orders`. Not FinCEN `/fincen-orders`. Not NCUA `/ncua-orders`. Not FRB `/frb-orders`. Not FDIC `/fdic-orders`. Not OCC `/occ-cd`. Not CFPB `/cfpb-orders`. Not FTC `/ftc-wl`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /cftc-orders` is HTTP 402.

v1 seeds **5** official institution enforcement-order / settlement PDFs. Required seed is UBS Financial Services Inc. (`26-04`). Family: Netrios LP Ltd. and Red Acre Ltd. (`26-02`), Citigroup Global Markets Inc. (`25-02`), SMBC Capital Markets, Inc. (`25-03`), Banco Santander, S.A. and Santander US Capital Markets LLC (`25-04`). Skip people.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /cftc-orders` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /cftc-orders/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing / search (index only, not the product): https://www.cftc.gov/LawRegulation/Enforcement/EnforcementActions/index.htm
- Official PDFs: `https://www.cftc.gov/media/{id}/{slug}/download`
- Press-release HTML (`/PressRoom/PressReleases/...`) is not the product
- Required seed: UBS Financial Services Inc. — Docket 26-04 — dated 31 Jul 2026 — https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download
- License: **17 USC 105**. Attribute CFTC.

Paid body fields: `id`, `docket`, `pdfId`, `institution`, `date`, `title`, `sourceUrl`, `body`. `body` is official `pdftotext` of the CFTC-authored PDF. `sourceUrl` is always the `www.cftc.gov` `/media/{id}/{slug}/download` PDF.

Leak-tests already passed on the live CFTC hosts: the UBS FSI press page (`9277-26`) is an ORDER link only; unique order phrases (`$8.9 billion`, `01:44 pm, Jul 31 2026`, `third-party consultant`) stay in the PDF. Do not re-litigate unless you find a dump of the order TEXT.

`data/cftc-orders/` is gitignored. Order bodies get lost on a dead VM — do not harvest the whole catalog here. Live-apply on apollo stays at the 5 official seeds.

Free `GET /cftc-orders/manifest.json` is institution / docket / date / sourceUrl only. Needles such as `$8.9 billion`, `01:44 pm, Jul 31 2026`, and `third-party consultant` stay out of unpaid responses.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `CFTC_ORDERS_DIR` | `$HOME/projects/mcp-proxy/data/cftc-orders` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `CFTC_ORDERS_LIMIT` | `5` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `CFTC_ORDERS_MAX_FETCH` | `8` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `CFTC_ORDERS_JSON_DIR` / `CFTC_ORDERS_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.json` / `listing-excerpt.html` + `{docket}.txt` |
| `CFTC_ORDERS_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (5-seed only)

```bash
sudo apt-get install -y poppler-utils
cd ~/projects/mcp-proxy
npm run build
export CFTC_ORDERS_DIR=$HOME/projects/mcp-proxy/data/cftc-orders
CFTC_ORDERS_LIMIT=5 CFTC_ORDERS_MAX_FETCH=8 npm run collect:cftc-orders
```

## Local smoke (cloud VM / laptop)

```bash
CFTC_ORDERS_DIR=/tmp/cftc-orders-seed npm run collect:cftc-orders   # or copy the bundled seed
CFTC_ORDERS_DIR=/tmp/cftc-orders-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/cftc-orders                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/cftc-orders/manifest.json   # cardCount + institution/docket/date/sourceUrl
```
