# FDA PCAC 503A briefing-memo text — x402 door

Official FDA-authored Pharmacy Compounding Advisory Committee **503A briefing-memo TEXT** extracted from per-substance PDFs on the July 23–24, 2026 PCAC meeting page (docket FDA-2025-N-6895). Does not invent evaluation text. Not CDER multidisciplinary reviews. Not combined sponsor/AdComm packs. Not the FR notice or docket 0001 (those are names/uses only).

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /pcac` is HTTP 402.

v1 seeds **5** FDA-only July 2026 peptide memos. Do not harvest the whole docket here.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /pcac` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /pcac/manifest.json` | free | HTTP 200 substance / date / meeting / mediaId / sourceUrl (no evaluation text) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Meeting page (media links): https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026
- FR notice (names/uses only): https://www.govinfo.gov/content/pkg/FR-2026-04-16/html/2026-07361.htm
- Per-substance PDFs: `https://www.fda.gov/media/{id}/download`
- Example: Emideltide / DSIP `https://www.fda.gov/media/193344/download` (Wayback `id_` if Akamai 401s)
- License: **17 USC 105**. Attribute FDA.

Paid body fields: `id`, `substance`, `date`, `meeting`, `mediaId`, `sourceUrl`, `body`. `body` is the official `pdftotext` FDA evaluation narrative with appended nominator packages omitted. `sourceUrl` is always the fda.gov URL, not archive.org.

`data/pcac/` is gitignored. Evaluation bodies get lost on a dead VM — do not harvest the whole docket here. Full fill waits for apollo.

Free `GET /pcac/manifest.json` is substance / date / meeting / mediaId / sourceUrl only. Family / basic-auth stay off `ticks.bnm.farm`.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `PCAC_DIR` | `$HOME/projects/mcp-proxy/data/pcac` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `PCAC_LIMIT` | `5` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `PCAC_MAX_FETCH` | `8` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `PCAC_HTML_DIR` / `PCAC_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.html` + `{mediaId}.txt` |
| `PCAC_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (required for live)

This cloud VM cannot publish `ticks.bnm.farm` and must not restart `idaho-ticks-x402`. Live `/pcac` stays **404** until apollo pulls this branch and restarts the door with `PCAC_DIR` pointed at the seed snapshot (or a fresh `npm run collect:pcac`).

```bash
# on apollo — not this Cloud VM
sudo apt-get install -y poppler-utils
cd ~/projects/mcp-proxy
git fetch origin
git checkout cursor/pcac-door-4d7b
npm run build

export PCAC_DIR=$HOME/projects/mcp-proxy/data/pcac
# seed is already in src/fixtures/fda-pcac/seed-snapshot.json
# full fill later — LIMIT is additional, not total
PCAC_LIMIT=5 PCAC_MAX_FETCH=8 npm run collect:pcac

sudo systemctl restart idaho-ticks-x402
```

## Local smoke (cloud VM / laptop)

```bash
PCAC_DIR=/tmp/pcac-seed npm run collect:pcac   # or copy the bundled seed
PCAC_DIR=/tmp/pcac-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/pcac                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/pcac/manifest.json   # cardCount + substance/date/meeting/mediaId/sourceUrl
```
