# NCUA institution consent C&D text — x402 door

Official NCUA-authored **institution consent Cease-and-Desist TEXT** extracted from per-order HTML body pages on `ncua.gov`. Does not invent order text. Not the official administrative-orders CSV (docket/name/URL only). Not Drupal `?_format=json` (406). Not 2026 people/IAP. Not late-filer CMP $ table. Not LUAs. Not terminations. Not FRB `/frb-orders`. Not FDIC `/fdic-orders`. Not OCC `/occ-cd`. Not CFPB `/cfpb-orders`. Not FTC `/ftc-wl`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /ncua-orders` is HTTP 402.

v1 seeds **5** official institution C&D body pages. Required seed is Live Life Federal Credit Union (`21-0105-ER`, 2021). Family: Phi Beta Sigma `19-1061-ER`, Defense Logistics `19-0187-ER`. Recent institution cards are often CMP/termination — harvest stays on C&D body pages.

Collect walks the official administrative-orders **CSV as listing metadata only**, then fetches institution C&D HTML bodies. Do not sell the CSV. Skip people / CMP / LUA / terminations. The 7:45 cron grows past the first-slice 5 when the door is still thin.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /ncua-orders` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /ncua-orders/manifest.json` | free | HTTP 200 credit union / docket / date / official HTML URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing teaser (Drupal HTML, not the walk): https://ncua.gov/news/enforcement-actions/administrative-orders
- Official CSV walk (metadata only — finds HTML bodies): https://ncua.gov/sites/default/files/list_csv/administrative-orders.csv
- Official C&D HTML: `https://ncua.gov/news/enforcement-actions/administrative-orders/{year}/{slug}`
- Required seed: Live Life Federal Credit Union, Fraser — `21-0105-ER` — dated 22 Feb 2021 — https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union
- License: **17 USC 105**. Attribute NCUA.

Paid body fields: `id`, `docket`, `creditUnion`, `location`, `date`, `title`, `sourceUrl`, `body`. `body` is official HTML-extracted order TEXT. `sourceUrl` is always the ncua.gov administrative-order page.

Leak-tests already passed on the live NCUA hosts: official CSV is metadata; Drupal `?_format=json` → 406; sibling `.json` / `.txt` 404; Federal Register API 0 on `21-0105-ER`.

`data/ncua-orders/` is gitignored. Order bodies get lost on a dead VM — do not harvest the whole catalog here. Full fill waits for apollo. **This PR does not restart apollo and does not deploy.**

Free `GET /ncua-orders/manifest.json` is credit union / docket / date / sourceUrl only. Needles such as `Marijuana-Related`, `METRC`, and `BSA Expectations` stay out of unpaid responses.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `NCUA_ORDERS_DIR` | `$HOME/projects/mcp-proxy/data/ncua-orders` | Snapshot cache (`snapshot.json` + downloaded HTML) |
| `NCUA_ORDERS_LIMIT` | `5` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `NCUA_ORDERS_MAX_FETCH` | `8` | Max official HTML downloads per run. Already-on-disk pages do not count. `0` = no cap |
| `NCUA_ORDERS_HTML_DIR` / `NCUA_ORDERS_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.json` / `listing-excerpt.html` + `{docket}.html` |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

## Apollo collect (do not run on this Cloud VM)

This cloud VM cannot publish `ticks.bnm.farm` and must not restart `idaho-ticks-x402`. Live `/ncua-orders` stays **404** until a later live-apply. Do not collect on apollo from this PR.

```bash
# on apollo later — not this Cloud VM, not this PR
cd ~/projects/mcp-proxy
npm run build
export NCUA_ORDERS_DIR=$HOME/projects/mcp-proxy/data/ncua-orders
NCUA_ORDERS_LIMIT=5 NCUA_ORDERS_MAX_FETCH=8 npm run collect:ncua-orders
```

## Local smoke (cloud VM / laptop)

```bash
NCUA_ORDERS_DIR=/tmp/ncua-orders-seed npm run collect:ncua-orders   # or copy the bundled seed
NCUA_ORDERS_DIR=/tmp/ncua-orders-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/ncua-orders                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/ncua-orders/manifest.json   # cardCount + creditUnion/docket/date/sourceUrl
```
