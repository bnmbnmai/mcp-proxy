# FDA warning-letter bodies — x402 door

Official fda.gov warning-letter HTML only. Does not invent letter text. Does not scrape Redica / Thompson / Apify. Not the `/import-alerts` IA feed. Not Form 483 PDFs.

Listed on well-known / OpenAPI / llms.txt / shop catalog as one of the five live doors. Unpaid `GET /warning-letters` is HTTP 402 either way.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /warning-letters` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /warning-letters/manifest.json` | free | HTTP 200 count + firm / date / subject (no letter body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters
- Official DataTables AJAX for that same listing: https://www.fda.gov/datatables/views/ajax (`view_name=warning_letter_solr_index`)
- Letter pages: `https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/{slug}`

Paid body fields: `id`, `firm`, `cms`, `issuedOn`, `subject`, `issuingOffice`, `sourceUrl`, `body`. `body` is the official `WARNING LETTER` HTML block, tags stripped.

`data/warning-letters/` is gitignored. Letter bodies do not belong in git. The live cache lives on the media-box worker.

Free `GET /warning-letters/manifest.json` on `ticks.bnm.farm` is count / firm / date / subject only. Do not wrap that JSON as the paid payload. Family / basic-auth stay off that host.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `WARNING_LETTERS_DIR` | `$HOME/projects/mcp-proxy/data/warning-letters` | Snapshot cache (`snapshot.json`) |
| `WARNING_LETTERS_TTL_MS` | unused once a real body is cached | Fill is the collect command. Request path must not wipe a filled cache back to 3. |
| `WARNING_LETTERS_LIMIT` | `50` | Target **additional** real letter bodies this run. Cached bodies are reused and do **not** count. Walks official DataTables newest-first. `0` = keep walking |
| `WARNING_LETTERS_MAX_FETCH` | `200` | Max official letter-page downloads per run. `0` = no cap |
| `WARNING_LETTERS_PAGE_SIZE` | `100` | Official DataTables `length` (max 100) |
| `WARNING_LETTERS_HTML_DIR` | unset | Optional already-fetched `listing-ajax.json` / listing HTML + letter excerpts |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Media-box collect (required for live)

Cursor cloud VMs gitignore `data/warning-letters/` and cannot restart `idaho-ticks-x402.service`. Live `letterCount` does not move until the media-box worker runs collect and restarts the door.

The HTML first page is 10 rows. `DEFAULT_FIRST_SLICE = 3` was the stub (`letterCount` 3). Collect now walks the official listing AJAX (`recordsTotal` ~3662) and **keeps** cached bodies.

```bash
# on the media-box / apollo host
cd ~/projects/mcp-proxy
git fetch origin
git checkout cursor/warning-letters-fill-3ef5
npm run build

export WARNING_LETTERS_DIR=$HOME/projects/mcp-proxy/data/warning-letters

# keep the 3 cached bodies, add ~200 more official HTML bodies
WARNING_LETTERS_LIMIT=200 WARNING_LETTERS_MAX_FETCH=250 npm run collect:warning-letters

# later fills — LIMIT is additional, not total
WARNING_LETTERS_LIMIT=200 WARNING_LETTERS_MAX_FETCH=250 npm run collect:warning-letters

npm run test:ticks
systemctl --user restart idaho-ticks-x402.service
```

The door only serves bodies already in `WARNING_LETTERS_DIR/snapshot.json`. Re-running collect fills that file. Restart the ticks door after collect so the paid payload and free manifest pick up the new count.

A paid `GET /warning-letters` must not re-collect with limit 3 and wipe the cache. Fill is this command.

## Local smoke (cloud VM / laptop)

```bash
WARNING_LETTERS_HTML_DIR=src/fixtures/fda-warning-letters \
WARNING_LETTERS_DIR=/tmp/warning-letters-smoke \
npm run collect:warning-letters
```
