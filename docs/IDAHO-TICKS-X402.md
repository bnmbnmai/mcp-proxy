# Idaho hay + feeder ticks — x402 door

Thin pay-per-pull HTTP door. Not the Apollo Intelligence catalog.

Public ungated host: **`https://ticks.bnm.farm/ticks`**. See `SKILL.md` for the live SKU.

## Path

```
GET /ticks
```

Unpaid (must be **HTTP 402**):

```bash
curl -i https://ticks.bnm.farm/ticks
curl -i http://127.0.0.1:4020/ticks
```

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

| | |
|---|---|
| Asset | USDC on Base |
| Token | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Network | `base` / `eip155:8453` |
| **payTo** | **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`** |

Live LAN list price is **$0.02 USDC** (`X402_USDC_ATOMIC=20000`). Set `X402_USDC_ATOMIC` to override.

## Env (apollo / media box)

| Variable | Default | Purpose |
|---|---|---|
| `TICKS_DIR` | `$HOME/projects/farm-plan/data/prices` | Directory with `board.json` + `history.json` from farm-plan `collect-prices.py` / farm-api |
| `TICKS_PATH` | `$TICKS_DIR/board.json` | Override the board file only |
| `FARM_DATA_DIR` | (unset) | If set and `TICKS_DIR` is not, reads `$FARM_DATA_DIR/prices` |
| `BIND_HOST` | `0.0.0.0` | LAN bind is OK |
| `PORT` | `4020` | Listen port |
| `X402_SKIP_SETTLE` | unset | `1` = local/test path: any `X-PAYMENT` header serves ticks (not for public) |
| `X402_FACILITATOR_URL` | unset | Public facilitator for real settlement |
| `X402_USDC_ATOMIC` | `20000` ($0.02) | List price in USDC 6-decimal units |
| `X402_RESOURCE_URL` | request host | Public URL prefix if behind a reverse proxy |

The door **only reads** the farm-plan price cache. It does not scrape. Refresh ticks on apollo the same way the Market tab already does:

```bash
# already-collected cache (typical)
ls ~/projects/farm-plan/data/prices/board.json

# optional refresh (official barn + USDA only; do not invent prices)
FARM_DATA_DIR=~/projects/farm-plan/data \
  python3 ~/projects/farm-plan/scripts/collect-prices.py --pause 2.5
# or: click Fetch latest cash on farm.bnm.farm Market tab
```

If `board.json` / `history.json` are missing, a paid call returns an honest empty/stale JSON. No family ledger, no basic-auth dump.

## Run on apollo (LAN)

```bash
cd ~/projects/mcp-proxy   # this repo checkout
git checkout cursor/idaho-ticks-x402-3187
npm install
npm run build

export TICKS_DIR=$HOME/projects/farm-plan/data/prices
export BIND_HOST=0.0.0.0
export PORT=4020
# local smoke only — do not use on a public host
export X402_SKIP_SETTLE=1

./scripts/run-apollo-ticks-door.sh
# or: npm run start:ticks
```

From another machine on the LAN (media box is often `192.168.1.243`):

```bash
# unpaid → 402
curl -i http://192.168.1.243:4020/ticks

# documented test path (settle-skip) → real ticks when the cache exists
curl -s http://192.168.1.243:4020/ticks -H 'X-PAYMENT: test' | head
```

Paid JSON includes Twin Falls, Blackfoot, AMS_3056 hay, AMS_3059 NW Direct, IF_FV130 (Idaho + WA-OR), IBC grain, WD1, AMS 3058 Columbia Basin hay, and AMS 2914 PNW pulses **when those series are in the cache**. A source that 403s on this host is listed under `failed` (honest), not filled in. Organic hay stays empty unless an official organic quote is present.

## Out of scope

- Apollo OSINT / scrape / proxy catalog
- LINK, prediction markets, auto-trade
- Keys in the repo
- Ungating farm / water / storm
