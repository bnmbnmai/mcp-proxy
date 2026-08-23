# FDA Import Alert / DWPE ticks — x402 door

Separate SKU from Idaho hay + feeder ticks. Official public FDA `cms_ia` HTML only. Does not invent firms, products, or removals. Does not wrap openFDA drug shortages.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /import-alerts` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /import-alerts/manifest.json` | free | HTTP 200 catalog + schema + sample rows marked `sample` (not the full red list) |
| `GET /ticks` | unpaid → **HTTP 402** | **$0.02** USDC on Base (`20000` atomic) — unchanged Idaho door |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

| | |
|---|---|
| Asset | USDC on Base |
| Token | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Network | `base` / `eip155:8453` |
| **payTo** | **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`** |

Public host: `https://ticks.bnm.farm` (no family / basic-auth). Live on apollo 2026-08-18.

## Sources (official HTML)

- Catalog: https://www.accessdata.fda.gov/cms_ia/ialist.html
- By date: https://www.accessdata.fda.gov/cms_ia/iapublishdate.html
- Alert pages: `https://www.accessdata.fda.gov/cms_ia/importalert_{id}.html`

First-slice firm pages (red/green rows; honest-empty if a page has no firm block):

| pageId | alert |
|---|---|
| 49 | 16-81 seafood Salmonella |
| 189 | 66-40 drug GMPs |
| 258 | 99-05 raw ag pesticides |
| 259 | 99-08 processed foods pesticides |
| 263 | 99-19 Salmonella foods |
| 266 | 99-23 produce pathogens |

Paid body keeps the existing `ticks[]` fields: `alertNumber`, `type`, `name`, `list` (`red`\|`green`), `firm`, `country`, `product`, `datePublished`, `sourceUrl`, `asOf`. No phone numbers, emails, or lead-file shape.

Alongside those keys the paid JSON adds `records[]` (`id` from alertNumber/list/firm/product, `date` from `datePublished` or `asOf`, `firm`, `url`, `type=import-alert`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official cms_ia catalog). A repeat buyer diffs `asOf` + record ids.

## Env (apollo / media-box)

| Variable | Default | Purpose |
|---|---|---|
| `IMPORT_ALERTS_DIR` | `$HOME/projects/mcp-proxy/data/import-alerts` | Snapshot cache (`snapshot.json`) |
| `IMPORT_ALERTS_HTML_DIR` | unset | Optional directory of already-fetched `ialist.html` + `ia_{id}.html` |
| `IMPORT_ALERTS_TTL_MS` | 6 hours | Re-collect from FDA HTML when the snapshot is older |
| `IMPORT_ALERTS_USDC_ATOMIC` | `50000` | Override the $0.05 import-alerts price |
| `X402_USDC_ATOMIC` | `20000` | Override the $0.02 Idaho `/ticks` price |
| `BIND_HOST` | `0.0.0.0` | LAN bind is OK |
| `PORT` | `4020` | Listen port |
| `X402_SKIP_SETTLE` | unset | `1` = local/test path: any `X-PAYMENT` header serves the body (not for public) |
| `X402_FACILITATOR_URL` | unset | Public facilitator for real settlement |
| `X402_RESOURCE_URL` | request host | Public URL prefix if behind a reverse proxy (`https://ticks.bnm.farm`) |

No keys in the repo.

## Collect + run

```bash
cd ~/projects/mcp-proxy
git checkout cursor/fda-import-alerts-3187
npm install
npm run build

# official cms_ia HTML → snapshot.json (pause between live pages)
npm run collect:import-alerts

export BIND_HOST=0.0.0.0
export PORT=4020
export X402_RESOURCE_URL=https://ticks.bnm.farm
# local smoke only — do not use on a public host
export X402_SKIP_SETTLE=1

./scripts/run-apollo-ticks-door.sh
```

```bash
# unpaid → 402 ($0.05)
curl -i http://127.0.0.1:4020/import-alerts

# free catalog + samples
curl -s http://127.0.0.1:4020/import-alerts/manifest.json | head

# Idaho door unchanged ($0.02)
curl -i http://127.0.0.1:4020/ticks
```

## Deploy note for media-box

This cloud VM **cannot** deploy to apollo or edit live Caddy (private tv-remote `homelab/Caddyfile`).

On the media-box / apollo host:

1. Checkout this branch in `~/projects/mcp-proxy`.
2. `npm run collect:import-alerts` (writes `~/projects/mcp-proxy/data/import-alerts/snapshot.json`; gitignored).
3. Run `./scripts/run-apollo-ticks-door.sh` with `BIND_HOST=0.0.0.0` `PORT=4020`.
4. Public Caddy site `ticks.bnm.farm`: **no** `basic_auth`, reverse_proxy to `127.0.0.1:4020`. Do not add farm / water / storm links on that host.
5. Leave `X402_SKIP_SETTLE` unset on the public host. Set `X402_FACILITATOR_URL` and `X402_RESOURCE_URL=https://ticks.bnm.farm`.

## Out of scope

- openFDA drug shortages (different dataset)
- Invented firms, products, or removals
- Apollo OSINT / scrape / proxy catalog
- x402scan / Bazaar listing
- Family / basic-auth on `ticks.bnm.farm`
- Keys in the repo
