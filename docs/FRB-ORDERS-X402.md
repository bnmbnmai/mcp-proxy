# FRB institution C&D / written-agreement / PCA text — x402 door

Official FRB-authored **institution Cease-and-Desist / written-agreement / Prompt Corrective Action TEXT** extracted from per-order PDFs on `federalreserve.gov`. Does not invent order text. Not the official enforcement CSV (party / type / date / press URL only). Not `ea-old.json` / `ea-cms-recent.json` / `ne-press.json` teasers. Not BankFind. Not IAP / prohibition-of-employee people files. Not an EDGAR 8-K harvest. Not FDIC `/fdic-orders`. Not OCC `/occ-cd`. Not CFPB `/cfpb-orders`. Not FTC `/ftc-wl`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /frb-orders` is HTTP 402.

v1 seeds **5** 2026 institution cards from the only four 2026 institution C&D / WA / PCA PDFs on federalreserve.gov (official CSV 2026 census: 28 rows, 24 people files). Iuka WA carries two official institution dockets in one PDF. Required seed is Community Bankshares, Inc. (`26-019-B-HC`). Do not harvest the people-file backlog here.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /frb-orders` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /frb-orders/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing / search (index only, not the product): https://www.federalreserve.gov/supervisionreg/enforcementactions.htm
- Official CSV (metadata only): https://www.federalreserve.gov/supervisionreg/files/enforcementactions.csv
- Official PDFs: `https://www.federalreserve.gov/newsevents/pressreleases/files/enfYYYYMMDDxN.pdf`
- Required seed: Community Bankshares, Inc., LaGrange — `26-019-B-HC` — dated 14 Apr 2026 — https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf
- License: **17 USC 105**. Attribute Federal Reserve Board.

Paid body fields: `id`, `docket`, `pdfId`, `institution`, `location`, `date`, `title`, `sourceUrl`, `body`. `body` is official `pdftotext` of the FRB-authored PDF. `sourceUrl` is always the federalreserve.gov press-files PDF.

Leak-tests already passed on the live FRB hosts: official CSV is metadata; `Accept: text/plain` on the PDF stays PDF; sibling `.txt` / `.json` 404; Federal Register API 0 on `26-019-B-HC`. Do not re-litigate unless you find a dump of the order TEXT.

`data/frb-orders/` is gitignored. Order bodies get lost on a dead VM — do not harvest the whole catalog here. Full fill waits for apollo. **This PR does not restart apollo and does not deploy.**

Free `GET /frb-orders/manifest.json` is institution / docket / date / sourceUrl only. Needles such as `WHEREAS`, `significantly undercapitalized`, and `Capital Plan` stay out of unpaid responses.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `FRB_ORDERS_DIR` | `$HOME/projects/mcp-proxy/data/frb-orders` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `FRB_ORDERS_LIMIT` | `5` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `FRB_ORDERS_MAX_FETCH` | `8` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `FRB_ORDERS_JSON_DIR` / `FRB_ORDERS_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.json` + `{docket}.txt` |
| `FRB_ORDERS_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (do not run on this Cloud VM)

This cloud VM cannot publish `ticks.bnm.farm` and must not restart `idaho-ticks-x402`. Live `/frb-orders` stays **404** until a later live-apply. Do not collect on apollo from this PR.

```bash
# on apollo later — not this Cloud VM, not this PR
sudo apt-get install -y poppler-utils
cd ~/projects/mcp-proxy
npm run build
export FRB_ORDERS_DIR=$HOME/projects/mcp-proxy/data/frb-orders
FRB_ORDERS_LIMIT=5 FRB_ORDERS_MAX_FETCH=8 npm run collect:frb-orders
```

## Local smoke (cloud VM / laptop)

```bash
FRB_ORDERS_DIR=/tmp/frb-orders-seed npm run collect:frb-orders   # or copy the bundled seed
FRB_ORDERS_DIR=/tmp/frb-orders-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/frb-orders                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/frb-orders/manifest.json   # cardCount + institution/docket/date/sourceUrl
```
