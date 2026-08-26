# FDA PCAC 503A briefing-memo text — x402 door

Official FDA-authored Pharmacy Compounding Advisory Committee **503A briefing-memo TEXT** extracted from per-substance PDFs. Bag: newest 10 official texts ($0.05); one official text `?id=` ($0.02). Free `GET /pcac/manifest.json?q=` is the searchable index.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /pcac` is HTTP 402.

First-slice walked only the July 23–24, 2026 meeting page (7 per-substance memos). Official year-materials tables also list October 29, 2024 and December 4, 2024.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /pcac` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /pcac/manifest.json` | free | HTTP 200 substance / date / meeting / mediaId / sourceUrl (no evaluation text) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Official year tables: https://www.fda.gov/advisory-committees/pharmacy-compounding-advisory-committee/2026-meeting-materials-pharmacy-compounding-advisory-committee and `/2024-meeting-materials-pharmacy-compounding-advisory-committee`
- First-slice miss: only https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026 (7 memos)
- October 29, 2024 meeting: https://www.fda.gov/advisory-committees/advisory-committee-calendar/october-29-2024-meeting-pharmacy-compounding-advisory-committee-10292024
- December 4, 2024 meeting: https://www.fda.gov/advisory-committees/advisory-committee-calendar/updated-meeting-time-and-public-participation-information-december-4-2024-meeting-pharmacy
- Per-substance PDFs: `https://www.fda.gov/media/{id}/download`
- Example: Emideltide / DSIP `https://www.fda.gov/media/193344/download` (Wayback `id_` if Akamai 401s)
- License: **17 USC 105**. Attribute FDA.

Paid body keeps the existing `cards[]` fields: `id`, `substance`, `date`, `meeting`, `mediaId`, `sourceUrl`, `body`. `body` is the official `pdftotext` FDA evaluation narrative with appended nominator packages omitted. `sourceUrl` is always the fda.gov URL, not archive.org.

Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm` from official `substance`, `url`, `type=pcac`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official PCAC meeting page). A repeat buyer diffs `asOf` + record ids.

`data/pcac/` is gitignored. Evaluation bodies get lost on a dead VM — do not harvest archived combined packs here.

Free `GET /pcac/manifest.json` is substance / date / meeting / mediaId / sourceUrl only. Family / basic-auth stay off `ticks.bnm.farm`.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `PCAC_DIR` | `$HOME/projects/mcp-proxy/data/pcac` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `PCAC_LIMIT` | `24` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `PCAC_MAX_FETCH` | `36` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `PCAC_HTML_DIR` / `PCAC_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.html` / `listing-oct-2024-excerpt.html` / `listing-dec-2024-excerpt.html` + `{mediaId}.txt` |
| `PCAC_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (official year-materials walk)

```bash
cd ~/projects/mcp-proxy
npm run build
export PCAC_DIR=$HOME/projects/mcp-proxy/data/pcac
# LIMIT is additional, not total. Cached July 2026 bodies are reused.
PCAC_LIMIT=24 PCAC_MAX_FETCH=36 npm run collect:pcac
systemctl --user restart idaho-ticks-x402.service
```

Live after leftover apply (2026-08-26): **listedCount 15**, **cardCount 14**, asOf **2026-05-15**, fetchedAt **2026-08-26T15:42:23.299Z**. Hydroxyprogesterone caproate (`182090`, Withdrawn or Removed) failed the 503A evaluation gate. Price still $0.02 / $0.05. No new SKU. Restarted only `idaho-ticks-x402.service`. Official live catalog is the July 2026 + October 29, 2024 + December 4, 2024 meeting pages.

## Local smoke (cloud VM / laptop)

```bash
PCAC_DIR=/tmp/pcac-seed npm run collect:pcac   # or copy the bundled seed
PCAC_DIR=/tmp/pcac-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/pcac                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/pcac/manifest.json   # cardCount + substance/date/meeting/mediaId/sourceUrl
```
