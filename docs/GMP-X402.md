# Health Canada Drug GMP report-card bodies — x402 door

Official Drug & Health Product Inspections (`fullReportCard.ashx`) observation text plus C.02 cites. Does not invent observations. Does not sell the public search INDEX (~21k rows, rating / firm / date only). Not FDA Form 483. Not warning letters.

Listed on well-known / OpenAPI / llms.txt / shop catalog **only** when at least one real observation body is cached. Unpaid `GET /gmp` is HTTP 402 either way.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /gmp` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /gmp/manifest.json` | free | HTTP 200 id / firm / dates / rating (no observation text) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**. `extra.name` is **USD Coin**.

## Source of truth

- Search UI: https://www.drug-inspections.canada.ca/gmp/index-en.html
- Public INDEX (do not sell): `GET /gmp/controller/searchResult.ashx?...&pType=GMP&lang=en` — ~21k rows, zero `summaryList` / C.02 text
- Sold unit: `GET /gmp/controller/fullReportCard.ashx?lang=en&insNumber={n}` — verified on Apotex inspection **88796**
- Human page: `fullReportCard-en.html?insNumber={n}&lang=en`

Paid body fields: `id`, `inspectionNumber`, `firm`, `referenceNumber`, `site`, `inspectedOn`, `rating`, `sourceUrl`, `body`, `observations[]`. `observations[].cite` is the C.02 regulation. Rating-only cards (empty `data[]`) are skipped.

`data/gmp/` is gitignored. Observation bodies do not belong in git. The live cache lives on the media-box worker.

Contains information licensed under the Open Government Licence – Canada. Commercial use is permitted.

Free `GET /gmp/manifest.json` on `ticks.bnm.farm` is count / firm / date / rating only. Do not wrap that JSON as the paid payload. Family / basic-auth stay off that host.

## Leak-test (2026-08-19, apollo)

- open.canada.ca DHPID dataset is HTML links to the search UI, not a bulk observation CSV/JSON
- Unfiltered official `searchResult.ashx` = **21456** INDEX rows, no `summaryList`, no `C.02.` observation text
- `reportCard: true` = **4147** rows that *may* have a report card
- Observation text exists only on per-inspection `fullReportCard.ashx`

If Health Canada later ships bulk observation JSON/CSV for free, kill this door.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `GMP_DIR` | `$HOME/projects/mcp-proxy/data/gmp` | Snapshot cache (`snapshot.json` + `search-all.json` + `skipped-no-text.json`) |
| `GMP_LIMIT` | `50` | Target **additional** real observation cards this run. Cached cards are reused and do **not** count. `0` = keep walking |
| `GMP_MAX_FETCH` | `400` | Max official report-card downloads per run. `0` = no cap |
| `GMP_SKIP_IDS` | unset | Comma-separated inspection numbers to skip |
| `GMP_SKIP_LIVE` | unset | `1` = load inspection numbers from the free live manifest and skip them |
| `GMP_LIVE_MANIFEST` | `https://ticks.bnm.farm/gmp/manifest.json` | Free manifest URL when `GMP_SKIP_LIVE=1` |
| `GMP_HTML_DIR` | unset | Optional already-fetched `search-excerpt.json` + card JSON |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Media-box collect (required for live)

Cursor cloud VMs gitignore `data/gmp/` and cannot restart `idaho-ticks-x402.service`. Live `cardCount` does not move until the media-box worker runs collect and restarts the door.

Live after apollo collect + `idaho-ticks-x402.service` restart (2026-08-19): **cardCount 1900**, asOf **2026-07-30**, fetchedAt **2026-08-19T21:37:18.343Z**. Price still $0.05. No new SKU.

```bash
# on the media-box / apollo host
cd ~/projects/mcp-proxy
git fetch origin
git checkout cursor/gmp-fill-d73a
npm run build

export GMP_DIR=$HOME/projects/mcp-proxy/data/gmp

# first fill — official INDEX is cached; walk report cards newest-first
GMP_LIMIT=200 GMP_MAX_FETCH=400 npm run collect:gmp

# later fills — LIMIT is additional, not total
GMP_LIMIT=200 GMP_MAX_FETCH=400 npm run collect:gmp

npm run test:ticks
systemctl --user restart idaho-ticks-x402.service
```

The door only serves bodies already in `GMP_DIR/snapshot.json`. Re-running collect fills that file. Restart the ticks door after collect so the paid payload and free manifest pick up the new count.

A paid `GET /gmp` must not re-collect with limit 50 and wipe the cache. Fill is this command.

## Local smoke (cloud VM / laptop)

```bash
GMP_HTML_DIR=src/fixtures/hc-gmp \
GMP_DIR=/tmp/gmp-smoke \
npm run collect:gmp
```
