# Swissmedic first-authorisation SwissPAR evaluation text — x402 door

Official Swiss Public Assessment Report **first-authorisation evaluation TEXT** extracted from per-product PDFs on the Swissmedic SwissPAR index. Does not invent evaluation text. Does not wrap the A–Z HTML index. Not EMA EPARs or referrals. Not FDA CDER reviews. Not the HCP / Information for healthcare professionals appendix (that lives free on swissmedicinfo.ch).

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /swisspar` is HTTP 402.

v1 is first authorisation only. Extension-of-indication SwissPARs are skipped. EMA-reliance stubs (Swissmedic did not assess the primary data, e.g. mNEXSPIKE) are skipped.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /swisspar` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /swisspar/manifest.json` | free | HTTP 200 name / date / MA / sourceUrl (no evaluation text) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Index (name / date / PDF only): https://www.swissmedic.ch/swissmedic/en/home/humanarzneimittel/authorisations/swisspar.html
- Per-product PDFs: `https://www.swissmedic.ch/dam/swissmedic/.../{MA}-{slug}-01-swisspar-….pdf.download.pdf/…`
- License: **CopA Art. 5 para. 1 let. c** (official reports; Swissmedic FAQ + ZL000_00_030e). Attribute Swissmedic.
- Not a drug advertisement (TPA Art. 31 stays off copy).

Paid body keeps the existing `cards[]` fields: `id`, `name`, `inn`, `ma`, `date`, `holder`, `sourceUrl`, `body`. `body` is the official `pdftotext` evaluation narrative with the appended Information for healthcare professionals omitted.

Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm` from official `holder`, `url`, `type=swisspar`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official SwissPAR index). A repeat buyer diffs `asOf` + record ids.

`data/swisspar/` is gitignored. Evaluation bodies get lost on a dead VM — do not harvest the whole A–Z index here. Full fill waits for apollo.

Free `GET /swisspar/manifest.json` is name / date / MA / sourceUrl only. Family / basic-auth stay off `ticks.bnm.farm`.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `SWISSPAR_DIR` | `$HOME/projects/mcp-proxy/data/swisspar` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `SWISSPAR_LIMIT` | `5` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `SWISSPAR_MAX_FETCH` | `8` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `SWISSPAR_HTML_DIR` / `SWISSPAR_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.html` + `{MA}.txt` |
| `SWISSPAR_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (required for live)

This cloud VM cannot publish `ticks.bnm.farm` and must not restart `idaho-ticks-x402`. Live `/swisspar` stays **404** until apollo pulls this branch and restarts the door with `SWISSPAR_DIR` pointed at the seed snapshot (or a fresh `npm run collect:swisspar`).

```bash
# on apollo — not this Cloud VM
sudo apt-get install -y poppler-utils
cd ~/projects/mcp-proxy
git fetch origin
git checkout cursor/swisspar-door-1a9c
npm run build

export SWISSPAR_DIR=$HOME/projects/mcp-proxy/data/swisspar
# seed is already in src/fixtures/swisspar/seed-snapshot.json
# full fill later — LIMIT is additional, not total
SWISSPAR_LIMIT=25 SWISSPAR_MAX_FETCH=40 npm run collect:swisspar

sudo systemctl restart idaho-ticks-x402
```

## Local smoke (cloud VM / laptop)

```bash
SWISSPAR_DIR=/tmp/swisspar-seed npm run collect:swisspar   # or copy the bundled seed
SWISSPAR_DIR=/tmp/swisspar-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/swisspar                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/swisspar/manifest.json   # cardCount + name/date/MA/sourceUrl
```
