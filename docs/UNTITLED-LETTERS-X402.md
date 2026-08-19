# FDA Untitled Letter bodies — x402 door

Official CDER OPDP + CBER APLB promo Untitled Letter PDFs at `/media/{id}/download` only. Does not invent letter text. Does not wrap the HTML index. Not `/warning-letters` HTML. Not close-out or promotional-material PDFs.

Listed on well-known / OpenAPI / llms.txt / shop catalog as a live public SKU. Unpaid `GET /untitled-letters` is HTTP 402 either way. Do not list a second untitled-letter SKU.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /untitled-letters` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /untitled-letters/manifest.json` | free | HTTP 200 count + id / firm / date / product / sourceUrl (no letter text) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- CDER OPDP listing: https://www.fda.gov/drugs/warning-letters-and-notice-violation-letters-pharmaceutical-companies/untitled-letters
- CBER promo listing: https://www.fda.gov/vaccines-blood-biologics/enforcement-actions-cber/untitled-letters-regarding-advertising-promotional-labeling-approved-biologics
- Hub: https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/issuance-untitled-letters
- Sold unit: `https://www.fda.gov/media/{id}/download` — per-letter Untitled Letter PDF only

Paid body fields: `id`, `mediaId`, `firm`, `date`, `product`, `office`, `center`, `sourceUrl`, `body`, `cites`, `said`. `body` is official `pdftotext` letter text. `cites` are 21 U.S.C. / 21 CFR / FD&C Act. Promotional-material, close-out, and warning-letter HTML are skipped.

`data/untitled-letters/` is gitignored. Letter bodies do not belong in git. The live cache lives on the media-box worker.

Free `GET /untitled-letters/manifest.json` on `ticks.bnm.farm` is count / id / firm / date / product / sourceUrl only. Do not wrap that JSON as the paid payload. Family / basic-auth stay off that host.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `UNTITLED_LETTERS_DIR` | `$HOME/projects/mcp-proxy/data/untitled-letters` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `UNTITLED_LETTERS_LIMIT` | `30` | Target **additional** real letter bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `UNTITLED_LETTERS_MAX_FETCH` | `40` | Max official PDF downloads per run. `0` = no cap |
| `UNTITLED_LETTERS_HTML_DIR` | unset | Optional already-fetched listing HTML + letter excerpts (tests / smoke) |
| `UNTITLED_LETTERS_PDFTOTEXT` | `pdftotext` | Poppler helper for official PDFs |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Media-box collect (required for live)

Cursor cloud VMs gitignore `data/untitled-letters/` and cannot restart `idaho-ticks-x402.service`. Live `cardCount` does not move until the media-box worker runs collect and restarts the door.

Official indexes list **121** Untitled Letter PDFs (115 CDER OPDP + 6 CBER promo) as of 2026-08-19. Seed on disk was **5**. Fills landed **35**, then **65**, then **95**. This remainder slice walked the rest of the official index.

Live after apollo collect + `idaho-ticks-x402.service` restart (2026-08-19): **cardCount 119**, asOf **2026-07-15**, fetchedAt **2026-08-19T22:51:15.174Z**. Price still $0.05. No new SKU. `/gmp` still **3500**. `/awa` still **5**. Two official `/media/{id}/download` PDFs were fetched but skipped: **131190** (Kowa LIVALO — `pdftotext` garbled) and **188672** (AstraZeneca FLUMIST — extract has `CBERAPLB@` but no `\bAPLB\b` / OPDP token).

```bash
# on the media-box / apollo host
cd ~/projects/mcp-proxy
git checkout cursor/untitled-letters-fill-886c
npm run build

export UNTITLED_LETTERS_DIR=$HOME/projects/mcp-proxy/data/untitled-letters

# later fills — LIMIT is additional, not total
UNTITLED_LETTERS_LIMIT=30 UNTITLED_LETTERS_MAX_FETCH=40 npm run collect:untitled-letters

npm run test:ticks
systemctl --user restart idaho-ticks-x402.service
```

The door only serves bodies already in `UNTITLED_LETTERS_DIR/snapshot.json`. Re-running collect fills that file. Restart the ticks door after collect so the paid payload and free manifest pick up the new count.

A paid `GET /untitled-letters` must not re-collect with a small limit and wipe the cache. Fill is this command. Do not wipe `data/gmp/` (live cardCount 3500). Do not harvest AWA (live cardCount 5).

## Local smoke (cloud VM / laptop)

```bash
UNTITLED_LETTERS_HTML_DIR=src/fixtures/fda-untitled-letters \
UNTITLED_LETTERS_DIR=/tmp/untitled-letters-smoke \
npm run collect:untitled-letters
```
