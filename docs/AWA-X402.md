# USDA APHIS AWA inspection-report observation text — x402 door

Official Animal Welfare Act inspection-report **observation / narrative TEXT** extracted from per-report PDFs on the APHIS Public Search Tool. Does not invent observations. Does not wrap the Salesforce metadata index. Does not use Data Liberation GitHub as the source. Not CMS 2567. Not CQC. Not `/form-483`. Not `/warning-letters`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /awa` is HTTP 402.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /awa` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /awa/manifest.json` | free | HTTP 200 id / firm / date / sourceUrl (no observation text) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Index: https://aphis.my.site.com/PublicSearchTool/s/inspection-reports
- Official Salesforce Aura search: `apex://EFL_PSTController/ACTION$doIRSearch_UI`
- Per-report PDFs: `https://aphis.file.force.com/sfc/dist/version/download/?oid=00Dt0000000GyZH&ids={contentVersionId}`
- Hub: https://www.aphis.usda.gov/awa/public-search
- License: **17 USC 105** (US federal public domain)

Paid body keeps the existing `cards[]` fields: `id`, `firm`, `date`, `certificate`, `customerNumber`, `inspectionId`, `sourceUrl`, `body`, `observations[]`. `body` and `observations[].text` are official `pdftotext` extracts.

Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=awa`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official APHIS AWA hub). A repeat buyer diffs `asOf` + record ids.

`data/awa/` is gitignored. Observation bodies get lost on a dead VM — do not harvest the archive here. Full fill waits for apollo.

Free `GET /awa/manifest.json` is id / firm / date / sourceUrl only. Family / basic-auth stay off `ticks.bnm.farm`.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `AWA_DIR` | `$HOME/projects/mcp-proxy/data/awa` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `AWA_LIMIT` | `5` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `AWA_MAX_FETCH` | `8` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `AWA_HTML_DIR` / `AWA_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.json` + `{contentId}.txt` |
| `AWA_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (required for live)

This cloud VM cannot publish `ticks.bnm.farm` and must not restart `idaho-ticks-x402`. Live `/awa` stays **404** until apollo pulls this branch and restarts the door with `AWA_DIR` pointed at the seed snapshot (or a fresh `npm run collect:awa`).

```bash
# on apollo — not this Cloud VM
sudo apt-get install -y poppler-utils
cd ~/projects/mcp-proxy
git fetch origin
git checkout cursor/awa-door-f1d5
npm run build

export AWA_DIR=$HOME/projects/mcp-proxy/data/awa
# seed is already in src/fixtures/aphis-awa/seed-snapshot.json
# full fill later — LIMIT is additional, not total
AWA_LIMIT=25 AWA_MAX_FETCH=40 npm run collect:awa

sudo systemctl restart idaho-ticks-x402
```

## Local smoke (cloud VM / laptop)

```bash
AWA_DIR=/tmp/awa-seed npm run collect:awa   # or copy the bundled seed
AWA_DIR=/tmp/awa-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/awa                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/awa/manifest.json   # cardCount + id/firm/date/sourceUrl
```
