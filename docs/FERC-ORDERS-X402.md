# FERC institution stipulation-and-consent text — x402 door

Official FERC-authored **institution stipulation-and-consent / show-cause / civil-penalty TEXT** extracted from per-order PDFs on `cms.ferc.gov`. Does not invent order text. Not the civil-penalty index teaser (institution / docket / date / PDF URL only). Not eLibrary metadata. Not Federal Register `raw_text`. Not people files. Not FinCEN `/fincen-orders`. Not NCUA `/ncua-orders`. Not FRB `/frb-orders`. Not FDIC `/fdic-orders`. Not OCC `/occ-cd`. Not CFPB `/cfpb-orders`. Not FTC `/ftc-wl`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /ferc-orders` is HTTP 402.

Live after leftover apply (2026-08-26): **listedCount 54**, **cardCount 22**, asOf **2026-08-03**, fetchedAt **2026-08-26T20:08:22.613Z**. This pulse reused 16 bodies and fetched 6 leftover official texts (NRG Energy `IN23-3-000`, BP America `IN13-15-000`, Montpelier / Rockland `IN24-15-000`, Freeport LNG `IN17-7-000`, NRG Power Marketing `IN20-4-000`, Algonquin `IN21-2-000`). Price still $0.02 / $0.05. No new SKU. Restarted only `idaho-ticks-x402.service`.

v1 seeds **5** official institution stipulation-and-consent PDFs. Required seed is Interstate Power and Light Company (`IN25-6-000`). Family: Digi Power X Inc. f/k/a Digihost Technology Inc. (`IN25-4-000`), MPH Rockaway Peakers / Bayswater (`IN25-10-000`), Terra-Gen, LLC (`IN26-2-000`), Tenaska Power Services Co. (`IN25-13-000`). Skip people.

Leftover grow walks the same official `cms.ferc.gov` `/sites/default/files/{YYYY-MM}/` PDFs. First-slice only parsed the 2026 teaser plus 2025/2024 year tables (live lander still showed 5). Leftover official texts are on the 2023/2022/2021 civil-penalty year tables (`www.ferc.gov` HTML is often 403; Wayback + hardcoded leftover PDFs). People (Chen, Meinershagen, GreenHat estate) stay out. Alliance NYGT `IN21-4-000` is official but lacks `Before Commissioners` — not this gate.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /ferc-orders` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /ferc-orders/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing / search (index only, not the product): https://www.ferc.gov/civil-penalties/all-civil-penalty-actions-2026 plus year tables 2025–2021
- Official PDFs: `https://cms.ferc.gov/sites/default/files/{YYYY-MM}/{name}.pdf`
- Media landing pages (`/media/...`) are HTML, not the product
- Required seed: Interstate Power and Light Company — Docket IN25-6-000 — dated 17 Apr 2026 — https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf
- License: **17 USC 105**. Attribute FERC.

Paid body fields: `id`, `docket`, `pdfId`, `institution`, `date`, `title`, `sourceUrl`, `body`. `body` is official `pdftotext` of the FERC-authored PDF. `sourceUrl` is always the cms.ferc.gov PDF.

Leak-tests already passed on the live FERC hosts: civil-penalty index is institution / docket / date / PDF URL; the official file stays PDF; eLibrary metadata is not TEXT; Federal Register unique phrases 0. Do not re-litigate unless you find a dump of the order TEXT.

`data/ferc-orders/` is gitignored. Order bodies get lost on a dead VM — do not harvest the whole catalog here. Full fill waits for apollo. **This PR does not restart apollo and does not deploy.**

Free `GET /ferc-orders/manifest.json` is institution / docket / date / sourceUrl only. Needles such as `commenced operations in 1978`, `Planning Resource Auction`, and `Sutherland Generating Station` stay out of unpaid responses.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `FERC_ORDERS_DIR` | `$HOME/projects/mcp-proxy/data/ferc-orders` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `FERC_ORDERS_LIMIT` | `24` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `FERC_ORDERS_MAX_FETCH` | `36` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `FERC_ORDERS_JSON_DIR` / `FERC_ORDERS_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.json` / `listing-excerpt.html` + `{docket}.txt` |
| `FERC_ORDERS_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (do not run on this Cloud VM)

This cloud VM cannot publish `ticks.bnm.farm` and must not restart `idaho-ticks-x402`. Live `/ferc-orders` stays **404** until a later live-apply. Do not collect on apollo from this PR.

```bash
# on apollo later — not this Cloud VM, not this PR
sudo apt-get install -y poppler-utils
cd ~/projects/mcp-proxy
npm run build
export FERC_ORDERS_DIR=$HOME/projects/mcp-proxy/data/ferc-orders
FERC_ORDERS_LIMIT=5 FERC_ORDERS_MAX_FETCH=8 npm run collect:ferc-orders
```

## Local smoke (cloud VM / laptop)

```bash
FERC_ORDERS_DIR=/tmp/ferc-orders-seed npm run collect:ferc-orders   # or copy the bundled seed
FERC_ORDERS_DIR=/tmp/ferc-orders-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/ferc-orders                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/ferc-orders/manifest.json   # cardCount + institution/docket/date/sourceUrl
```
