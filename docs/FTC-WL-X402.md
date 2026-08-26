# FTC BCP warning-letter text — x402 door

Official FTC Bureau of Consumer Protection **warning-letter TEXT** extracted from per-letter PDFs on the ftc.gov legal-library index. Does not invent letter text. Not the HTML index. Not the Drupal node (metadata + PDF URL only). Not FDA `/warning-letters`. Not official templates. Not Apify / third-party scrapers.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /ftc-wl` is HTTP 402.

v1 seeds **5** company Made-in-USA letters dated 2026-07-06. Do not harvest the whole 779-letter index here.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /ftc-wl` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /ftc-wl/manifest.json` | free | HTTP 200 firm / date / subject / official PDF URL (no letter body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.ftc.gov/legal-library/browse/warning-letters
- Per-letter Drupal node (metadata / PDF URL only): `https://www.ftc.gov/legal-library/browse/warning-letters/{slug}`
- Official PDFs: `https://www.ftc.gov/system/files/ftc_gov/pdf/{file}.pdf`
- Example: Vtron Inc. d/b/a Vtron Lasers `https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf`
- License: **17 USC 105**. Attribute FTC.

Paid body keeps the existing `cards[]` fields: `id`, `nodeId`, `pdfId`, `firm`, `date`, `subject`, `sourceUrl`, `nodeUrl`, `body`. `body` is official `pdftotext` of the FTC-authored PDF. `sourceUrl` is always the www.ftc.gov PDF, not archive.org.

Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=ftc-wl`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official FTC listing). A repeat buyer diffs `asOf` + record ids.

`data/ftc-wl/` is gitignored. Letter bodies get lost on a dead VM — do not harvest the whole index here. Full fill waits for apollo.

Free `GET /ftc-wl/manifest.json` is firm / date / subject / sourceUrl only. Family / basic-auth stay off `ticks.bnm.farm`.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `FTC_WL_DIR` | `$HOME/projects/mcp-proxy/data/ftc-wl` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `FTC_WL_LIMIT` | `5` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `FTC_WL_MAX_FETCH` | `8` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `FTC_WL_HTML_DIR` / `FTC_WL_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.html` + `{pdfId}.txt` |
| `FTC_WL_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (required for live)

This cloud VM cannot publish `ticks.bnm.farm` and must not restart `idaho-ticks-x402`. Live `/ftc-wl` stays **404** until apollo pulls this branch and restarts the door with `FTC_WL_DIR` pointed at the seed snapshot (or a fresh `npm run collect:ftc-wl`). Media-box is busy — do not collect there.

```bash
# on apollo — not this Cloud VM
sudo apt-get install -y poppler-utils
cd ~/projects/mcp-proxy
git fetch origin
git checkout cursor/ftc-wl-door-97f5
npm run build

export FTC_WL_DIR=$HOME/projects/mcp-proxy/data/ftc-wl
# seed is already in src/fixtures/ftc-wl/seed-snapshot.json
# full fill later — LIMIT is additional, not total
FTC_WL_LIMIT=5 FTC_WL_MAX_FETCH=8 npm run collect:ftc-wl

sudo systemctl restart idaho-ticks-x402
```

## Local smoke (cloud VM / laptop)

```bash
FTC_WL_DIR=/tmp/ftc-wl-seed npm run collect:ftc-wl   # or copy the bundled seed
FTC_WL_DIR=/tmp/ftc-wl-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/ftc-wl                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/ftc-wl/manifest.json   # cardCount + firm/date/subject/sourceUrl
```
