# EPA FIFRA institution order / consent text — x402 door

Official EPA-authored **institution/company FIFRA order / consent TEXT** extracted from per-order PDFs on `yosemite.epa.gov`. Does not invent order text. Not the press/teaser (institution / docket / date / PDF URL only). Not people files. Not Federal Register `raw_text`. Not CFTC `/cftc-orders`. Not BIS `/bis-orders`. Not OFAC `/ofac-orders`. Not FERC `/ferc-orders`. Not FinCEN `/fincen-orders`. Not NCUA `/ncua-orders`. Not FRB `/frb-orders`. Not FDIC `/fdic-orders`. Not OCC `/occ-cd`. Not CFPB `/cfpb-orders`. Not FTC `/ftc-wl`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /fifra-orders` is HTTP 402.

v1 seeds **5** official institution Consent Agreement and Final Order PDFs. Required seed is Travel Caddy, Inc. dba Travelon (`FIFRA-05-2026-0015`). Family: Crown Chemical, Inc. (`FIFRA-05-2026-0001`), Parasol Medical, LLC (`FIFRA-05-2026-0003`), Garden Grove Superstore Inc. (`FIFRA-09-2026-0020`), Nutrien Ag Solutions, Inc. (`FIFRA-10-2026-0080`). Skip people.

Collect walks the official **CAFOs + ESAs** view (not the NSF home teaser) and hops each UNID to the Filings `$File/*.pdf` body. The 7:45 cron grows past the first-slice 5 when the door is still thin.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /fifra-orders` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /fifra-orders/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing teaser (not the walk): https://yosemite.epa.gov/oa/rhc/epaadmin.nsf
- Official CAFO/ESA walk: https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/CAFOs+and+ESAs?OpenView
- Official PDFs: `https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/{UNID}/$File/{file}.pdf`
- Required seed: Travel Caddy, Inc. dba Travelon — Docket FIFRA-05-2026-0015 — filed 2026-07-29 — https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/FIFRA-05-2026-0015_CAFO_TravelCaddyIncdbaTravelon_FranklinParkIllinois_14PGS.pdf
- License: **17 USC 105**. Attribute EPA.

Paid body keeps the existing `cards[]` fields: `id`, `docket`, `pdfId`, `institution`, `date`, `title`, `sourceUrl`, `body`. `body` is official `pdftotext` of the EPA-authored PDF. `sourceUrl` is always the `yosemite.epa.gov` `/OA/RHC/EPAAdmin.nsf/Filings/{UNID}/$File/{file}.pdf` PDF.

Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=fifra-order`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official EPA listing). A repeat buyer diffs `asOf` + record ids.

Free `GET /fifra-orders/manifest.json` is institution / docket / date / sourceUrl only. Needles such as `11333 Addison Avenue`, `Style Numbers 23537, 43541`, and `Travel Caddy, Inc. doing business as Travelon` stay out of unpaid responses.

`data/fifra-orders/` is gitignored. Order bodies get lost on a dead VM — do not harvest the whole catalog here. The existing 7:45 collect grows this leftover when cardCount is still under ~20.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `FIFRA_ORDERS_DIR` | `$HOME/projects/mcp-proxy/data/fifra-orders` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `FIFRA_ORDERS_LIMIT` | `5` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `FIFRA_ORDERS_MAX_FETCH` | `8` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `FIFRA_ORDERS_JSON_DIR` / `FIFRA_ORDERS_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.json` / `listing-excerpt.html` + `{docket}.txt` |
| `FIFRA_ORDERS_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (5-seed only)

```bash
sudo apt-get install -y poppler-utils
cd ~/projects/mcp-proxy
npm run build
export FIFRA_ORDERS_DIR=$HOME/projects/mcp-proxy/data/fifra-orders
FIFRA_ORDERS_LIMIT=5 FIFRA_ORDERS_MAX_FETCH=8 npm run collect:fifra-orders
```

Yosemite is slow. Prefer fixture/local PDFs when a later collect would run into the 2:00am Imagine window.

## Local smoke (cloud VM / laptop)

```bash
FIFRA_ORDERS_DIR=/tmp/fifra-orders-seed FIFRA_ORDERS_JSON_DIR=src/fixtures/fifra-orders npm run collect:fifra-orders
FIFRA_ORDERS_DIR=/tmp/fifra-orders-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/fifra-orders                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/fifra-orders/manifest.json   # cardCount + institution/docket/date/sourceUrl
```
