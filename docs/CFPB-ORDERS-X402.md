# CFPB consent-order / administrative-order text — x402 door

Official CFPB-authored **consent-order / administrative-order TEXT** extracted from per-order PDFs on files.consumerfinance.gov. Does not invent order text. Not the enforcement-actions HTML index. Not the action-page teaser ($2.5M, no numbered findings). Not the Consumer Complaint Database (`complaint_what_happened` is a KILL). Not FTC `/ftc-wl`. Not OCC `/occ-cd`. Not queued bank-regulator doors (`/fdic-orders`).

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /cfpb-orders` is HTTP 402.

v1 seeds **5** company administrative consent orders (Honda 2025, Equifax, Block, Performant, Wise amended). Do not harvest the whole 386-action index here.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /cfpb-orders` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /cfpb-orders/manifest.json` | free | HTTP 200 firm / date / title / fileNo / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.consumerfinance.gov/enforcement/actions/
- Per-action HTML (teaser / PDF URL only): `https://www.consumerfinance.gov/enforcement/actions/{slug}/`
- Official PDFs: `https://files.consumerfinance.gov/f/documents/{file}.pdf`
- Example: American Honda Finance Corporation 2025 `https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf`
- License: **17 USC 105**. Attribute CFPB.

Paid body fields: `id`, `fileNo`, `pdfId`, `firm`, `date`, `title`, `sourceUrl`, `actionUrl`, `body`. `body` is official `pdftotext` of the CFPB-authored PDF. `sourceUrl` is always the files.consumerfinance.gov order PDF, not archive.org, not Apify, not the complaint dump.

`data/cfpb-orders/` is gitignored. Order bodies get lost on a dead VM — do not harvest the whole index here. Full fill waits for apollo.

Free `GET /cfpb-orders/manifest.json` is firm / date / title / fileNo / sourceUrl only. Family / basic-auth stay off `ticks.bnm.farm`.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `CFPB_ORDERS_DIR` | `$HOME/projects/mcp-proxy/data/cfpb-orders` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `CFPB_ORDERS_LIMIT` | `5` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `CFPB_ORDERS_MAX_FETCH` | `8` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `CFPB_ORDERS_HTML_DIR` / `CFPB_ORDERS_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.html` + `{slug}.html` + `{pdfId}.txt` |
| `CFPB_ORDERS_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (required for live)

This cloud VM cannot publish `ticks.bnm.farm` and must not restart `idaho-ticks-x402`. Live `/cfpb-orders` stays **404** until apollo pulls this branch and restarts the door with `CFPB_ORDERS_DIR` pointed at the seed snapshot (or a fresh `npm run collect:cfpb-orders`). Media-box is busy — do not collect there.

```bash
# on apollo — not this Cloud VM
sudo apt-get install -y poppler-utils
cd ~/projects/mcp-proxy
git fetch origin
git checkout cursor/cfpb-orders-door-5c4d
npm run build

export CFPB_ORDERS_DIR=$HOME/projects/mcp-proxy/data/cfpb-orders
# seed is already in src/fixtures/cfpb-orders/seed-snapshot.json
# full fill later — LIMIT is additional, not total
CFPB_ORDERS_LIMIT=5 CFPB_ORDERS_MAX_FETCH=8 npm run collect:cfpb-orders

sudo systemctl restart idaho-ticks-x402
```

## Local smoke (cloud VM / laptop)

```bash
CFPB_ORDERS_DIR=/tmp/cfpb-orders-seed npm run collect:cfpb-orders   # or copy the bundled seed
CFPB_ORDERS_DIR=/tmp/cfpb-orders-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/cfpb-orders                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/cfpb-orders/manifest.json   # cardCount + firm/date/title/fileNo/sourceUrl
```
