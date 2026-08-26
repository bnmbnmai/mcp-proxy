# FDIC institution consent-order / C&D text — x402 door

Official FDIC-authored **institution consent-order / Cease-and-Desist TEXT** extracted from per-order PDFs on `orders.fdic.gov`. Does not invent order text. Not the EDOS Salesforce index. Not BankFind. Not monthly NR counts. Not IAP / 1829 / Section 19 people files. Not an EDGAR 8-K harvest. Not Federal Register `raw_text` / `full_text`. Not OCC `/occ-cd`. Not CFPB `/cfpb-orders`. Not FTC `/ftc-wl`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /fdic-orders` is HTTP 402.

v1 seeds **5** 2026-dated institution consent-order PDFs from https://orders.fdic.gov. Required seed is MutualOne Bank (`FDIC-26-0001b`, privately held co-op; no 8-K of this order).

Leftover grow walks the same official `orders.fdic.gov` shepherd path. First-slice only accepted newer `069SJ` ContentDocument ids and only kept findings needles on a single line. Leftover official PDFs use `0693d` / `069t` ids (Tioga-Franklin, First IC, WEX, and the rest of this pulse) plus leftover-new `069SJ` rows (Unity Bank, Independence Bank). People / IAP / CMP stay out. EDOS Salesforce JSON is still listing-only — not the product.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /fdic-orders` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /fdic-orders/manifest.json` | free | HTTP 200 bank / docket / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing / search (index only, not the product): https://orders.fdic.gov/s/
- Official PDFs: `https://orders.fdic.gov/sfc/servlet.shepherd/document/download/{ContentDocumentId}?operationContext=S1`
- Required seed: MutualOne Bank, Framingham — `FDIC-26-0001b` — dated 13 Jan 2026 — https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1
- License: **17 USC 105**. Attribute FDIC.

Paid body fields: `id`, `docket`, `pdfId`, `bank`, `location`, `date`, `title`, `sourceUrl`, `body`. `body` is official `pdftotext` of the FDIC-authored PDF. `sourceUrl` is always the orders.fdic.gov shepherd download.

Leak-tests already passed on the live FDIC hosts: EDOS is a Salesforce index; BankFind has no enforcement endpoint; `Accept: text/plain` still PDF / method-not-allowed; sibling `.txt` / `.json` bounce; Federal Register API 0 on MutualOne / `FDIC-26-0001b`.

`data/fdic-orders/` is gitignored. Order bodies get lost on a dead VM — do not harvest the whole catalog here. Full fill waits for apollo. **This PR does not restart apollo and does not deploy.**

Free `GET /fdic-orders/manifest.json` is bank / docket / date / sourceUrl only. Needles such as `June 9, 2025 Report of Examination` and `adversely classified “Substandard”` stay out of unpaid responses.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `FDIC_ORDERS_DIR` | `$HOME/projects/mcp-proxy/data/fdic-orders` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `FDIC_ORDERS_LIMIT` | `24` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `FDIC_ORDERS_MAX_FETCH` | `36` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `FDIC_ORDERS_JSON_DIR` / `FDIC_ORDERS_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.json` + `{docket}.txt` |
| `FDIC_ORDERS_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (do not run on this Cloud VM)

This cloud VM cannot publish `ticks.bnm.farm` and must not restart `idaho-ticks-x402`. Live `/fdic-orders` stays **404** until a later live-apply. Do not collect on apollo from this PR.

```bash
# on apollo later — not this Cloud VM, not this PR
sudo apt-get install -y poppler-utils
cd ~/projects/mcp-proxy
npm run build
export FDIC_ORDERS_DIR=$HOME/projects/mcp-proxy/data/fdic-orders
FDIC_ORDERS_LIMIT=5 FDIC_ORDERS_MAX_FETCH=8 npm run collect:fdic-orders
```

## Local smoke (cloud VM / laptop)

```bash
FDIC_ORDERS_DIR=/tmp/fdic-orders-seed npm run collect:fdic-orders   # or copy the bundled seed
FDIC_ORDERS_DIR=/tmp/fdic-orders-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/fdic-orders                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/fdic-orders/manifest.json   # cardCount + bank/docket/date/sourceUrl
```
