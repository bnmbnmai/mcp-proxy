# BIS institution charging-letter / order text — x402 door

Official BIS-authored **institution/company charging-letter / order / settlement TEXT** extracted from per-order PDFs on `www.bis.gov` (legacy host `bis.doc.gov` redirects here). Does not invent order text. Not the press/teaser (institution / docket / date / PDF URL only). Not people files. Not Federal Register `raw_text`. Not OFAC `/ofac-orders`. Not FERC `/ferc-orders`. Not FinCEN `/fincen-orders`. Not NCUA `/ncua-orders`. Not FRB `/frb-orders`. Not FDIC `/fdic-orders`. Not OCC `/occ-cd`. Not CFPB `/cfpb-orders`. Not FTC `/ftc-wl`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /bis-orders` is HTTP 402.

v1 seeds **5** official institution charging-letter / settlement / order PDFs. Required seed is Coastal PVA Technology, Inc. (`E3050`). Family: Plexon, Inc. (`plexon-inc`), Andritz Inc. (`andritz-inc`), Alpha and Omega Semiconductor Incorporated (`E2995`), Unicat Catalyst Technologies, LLC (`E2994`). Skip people.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /bis-orders` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /bis-orders/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing / search (index only, not the product): https://www.bis.gov/enforcement/charging-letters
- Official PDFs: `https://www.bis.gov/media/documents/{name}.pdf` and `https://www.bis.gov/sites/default/files/documents/{name}.pdf`
- Press-release HTML (`/press-release/...`) is not the product
- Required seed: Coastal PVA Technology, Inc. — Docket E3050 — dated 13 Apr 2026 — https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf
- License: **17 USC 105**. Attribute BIS.

Paid body fields: `id`, `docket`, `pdfId`, `institution`, `date`, `title`, `sourceUrl`, `body`. `body` is official `pdftotext` of the BIS-authored PDF. `sourceUrl` is always the `www.bis.gov` PDF (`media.bis.gov` and `bis.doc.gov` canonicalize to `www.bis.gov`).

Leak-tests already passed on the live BIS hosts: the Coastal press page is an ORDER link only; unique charging-letter phrases (`4031 Alvis Court`, `post-etched semiconductor wafers`, `Malorie Eisenbrei`) stay in the PDF. Do not re-litigate unless you find a dump of the order TEXT.

`data/bis-orders/` is gitignored. Order bodies get lost on a dead VM — do not harvest the whole catalog here. Live-apply on apollo stays at the 5 official seeds.

Free `GET /bis-orders/manifest.json` is institution / docket / date / sourceUrl only. Needles such as `4031 Alvis Court`, `post-etched semiconductor wafers`, and `Malorie Eisenbrei` stay out of unpaid responses.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `BIS_ORDERS_DIR` | `$HOME/projects/mcp-proxy/data/bis-orders` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `BIS_ORDERS_LIMIT` | `5` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `BIS_ORDERS_MAX_FETCH` | `8` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `BIS_ORDERS_JSON_DIR` / `BIS_ORDERS_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.json` / `listing-excerpt.html` + `{docket}.txt` |
| `BIS_ORDERS_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (5-seed only)

```bash
sudo apt-get install -y poppler-utils
cd ~/projects/mcp-proxy
npm run build
export BIS_ORDERS_DIR=$HOME/projects/mcp-proxy/data/bis-orders
BIS_ORDERS_LIMIT=5 BIS_ORDERS_MAX_FETCH=8 npm run collect:bis-orders
```

## Local smoke (cloud VM / laptop)

```bash
BIS_ORDERS_DIR=/tmp/bis-orders-seed npm run collect:bis-orders   # or copy the bundled seed
BIS_ORDERS_DIR=/tmp/bis-orders-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/bis-orders                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/bis-orders/manifest.json   # cardCount + institution/docket/date/sourceUrl
```
