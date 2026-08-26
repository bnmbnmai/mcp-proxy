# Health Canada medical-device report-card bodies — x402 door

Official medical-device inspection (`md/handler/fullReportCard.ashx`) report-card **TEXT** plus MDR cites. Distinct from `/gmp` (Drug GMP, `/gmp/controller/fullReportCard.ashx`). Does not invent observations. Does not sell the public search INDEX (rating / firm / date only). Not FDA Form 483. Not AWA.

Listed on well-known / OpenAPI / llms.txt / shop catalog **only** when at least one real observation body is cached. Unpaid `GET /gmp-md` is HTTP 402 either way.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /gmp-md` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /gmp-md/manifest.json` | free | HTTP 200 id / firm / dates / rating (no report-card body text) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**. `extra.name` is **USD Coin**.

## Source of truth

- Search UI: https://www.drug-inspections.canada.ca/md/index-en.html
- Public INDEX (do not sell): `GET /md/handler/searchResult.ashx?...&pType=MD&lang=en` — ratings / firm / date only, zero `summaryList` / MDR text
- Sold unit: `GET /md/handler/fullReportCard.ashx?lang=en&insNumber={n}` — verified on CAN-MED HEALTHCARE inspection **501**
- Human page: `fullReportCard-en.html?insNumber={n}&lang=en`

Paid body fields: `id`, `inspectionNumber`, `firm`, `referenceNumber`, `site`, `inspectedOn`, `rating`, `sourceUrl`, `body`, `observations[]`. `observations[].cite` is the MDR (or FDA) regulation. Rating-only cards (empty `data[]`) are skipped. Drug GMP C.02 cards are a kill.

`data/gmp-md/` is gitignored. Observation bodies do not belong in the live cache path. A 5-card seed snapshot ships in `src/fixtures/hc-gmp-md/seed-snapshot.json`.

Contains information licensed under the Open Government Licence – Canada. Attribute Health Canada. Commercial use is permitted.

Free `GET /gmp-md/manifest.json` is count / firm / date / rating only. Do not wrap that JSON as the paid payload. Family / basic-auth stay off that host.

## Leak-test (2026-08-19, this Cloud VM)

- Official `searchResult.ashx` INDEX rows have no `summaryList` and no `MDR s.` observation text
- Observation text exists only on per-card `fullReportCard.ashx`
- Free manifest + unpaid GET must not include report-card body text

If Health Canada later ships bulk MD observation JSON/CSV for free, kill this door.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `GMP_MD_DIR` | `$HOME/projects/mcp-proxy/data/gmp-md` | Snapshot cache (`snapshot.json` + `search-all.json` + `skipped-no-text.json`) |
| `GMP_MD_LIMIT` | `5` | Target **additional** real observation cards this run. Cached cards are reused and do **not** count. `0` = keep walking |
| `GMP_MD_MAX_FETCH` | `8` | Max official report-card downloads per run. `0` = no cap |
| `GMP_MD_SKIP_IDS` | unset | Comma-separated inspection numbers to skip |
| `GMP_MD_SKIP_LIVE` | unset | `1` = load inspection numbers from the free live manifest and skip them |
| `GMP_MD_LIVE_MANIFEST` | `https://ticks.bnm.farm/gmp-md/manifest.json` | Free manifest URL when `GMP_MD_SKIP_LIVE=1` |
| `GMP_MD_HTML_DIR` | unset | Optional already-fetched `search-excerpt.json` + card JSON |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (required for live)

This cloud VM must not restart `idaho-ticks-x402`. Live `/gmp-md` stays **404** until apollo pulls this branch and restarts the door with `GMP_MD_DIR` pointed at the seed snapshot (or a fresh `npm run collect:gmp-md`). Do not harvest the whole MD index here.

```bash
# on apollo — not this Cloud VM
cd ~/projects/mcp-proxy
git fetch origin
git checkout cursor/gmp-md-door-57db
npm run build

export GMP_MD_DIR=$HOME/projects/mcp-proxy/data/gmp-md
# seed is already in src/fixtures/hc-gmp-md/seed-snapshot.json
# later fills — LIMIT is additional, not total
GMP_MD_LIMIT=25 GMP_MD_MAX_FETCH=40 npm run collect:gmp-md

sudo systemctl restart idaho-ticks-x402
```

## Local smoke (cloud VM / laptop)

```bash
GMP_MD_HTML_DIR=src/fixtures/hc-gmp-md \
GMP_MD_DIR=/tmp/gmp-md-smoke \
npm run collect:gmp-md

GMP_MD_DIR=/tmp/gmp-md-smoke X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/gmp-md                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/gmp-md/manifest.json   # cardCount + id/firm/date (no body text)
```
