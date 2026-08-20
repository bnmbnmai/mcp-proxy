# OCC institution C&D / consent-order text — x402 door

Official OCC-authored **institution Cease-and-Desist / Consent Order TEXT** extracted from per-order PDFs on `occ.gov/static/enforcement-actions`. Does not invent order text. Not EASearch ExportToJSON (6051-row metadata). Not IAP / people / prohibition / CMP-against-person. Not CFPB `/cfpb-orders`. Not FTC `/ftc-wl`. Not SEC EDGAR complete-submission `.txt`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /occ-cd` is HTTP 402.

v1 seeds **5** still-active institution C&D / consent-order PDFs from https://apps.occ.gov/EASearch. Official ExportToJSON (2026-08-19) has only **three** institution C&Ds with StartDate in 2026; the other two are the next most recent still-active institution C&Ds on that same catalog. Do not harvest the 24-row active-C&D backlog here.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /occ-cd` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /occ-cd/manifest.json` | free | HTTP 200 bank / docket / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing / search: https://apps.occ.gov/EASearch
- Official metadata catalog (not the product): https://apps.occ.gov/EASearch/Search/ExportToJSON
- Official PDFs: `https://www.occ.gov/static/enforcement-actions/ea{DOCKET}.pdf`
- Required seed: United Texas Bank, N.A., Dallas — `AA-ENF-2026-29` — https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf
- License: **17 USC 105**. Attribute OCC.

Paid body fields: `id`, `docket`, `pdfId`, `bank`, `location`, `date`, `title`, `sourceUrl`, `body`. `body` is official `pdftotext` of the OCC-authored PDF. `sourceUrl` is always the occ.gov enforcement-action PDF.

Leak-tests already passed on the live OCC hosts: ExportToJSON is metadata only; `Accept: text/plain` on the PDF is HTTP 406 / stays PDF.

`data/occ-cd/` is gitignored. Order bodies get lost on a dead VM — do not harvest the whole catalog here. Seed stays at the five official institution C&Ds. Do not fill past the seed.

Free `GET /occ-cd/manifest.json` is bank / docket / date / sourceUrl only.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `OCC_CD_DIR` | `$HOME/projects/mcp-proxy/data/occ-cd` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `OCC_CD_LIMIT` | `5` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `OCC_CD_MAX_FETCH` | `8` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `OCC_CD_JSON_DIR` / `OCC_CD_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.json` + `{docket}.txt` |
| `OCC_CD_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (do not run on this Cloud VM)

Live-apply onto the apollo ticks unit. Seed the five bundled cards only. Do not collect past the seed.

```bash
cd ~/projects/mcp-proxy
npm run build
export OCC_CD_DIR=$HOME/projects/mcp-proxy/data/occ-cd
# copy src/fixtures/occ-cd/seed-snapshot.json → $OCC_CD_DIR/snapshot.json
```

## Local smoke (cloud VM / laptop)

```bash
OCC_CD_DIR=/tmp/occ-cd-seed npm run collect:occ-cd   # or copy the bundled seed
OCC_CD_DIR=/tmp/occ-cd-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/occ-cd                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/occ-cd/manifest.json   # cardCount + bank/docket/date/sourceUrl
```
