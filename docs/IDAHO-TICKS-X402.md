# Idaho hay + feeder ticks — x402 door

Thin pay-per-pull HTTP door. Not the Apollo Intelligence catalog. Not listed on x402scan / Bazaar until a paid call on a host that actually has ticks returns them.

## Path

```
GET /ticks
```

Unpaid:

```bash
curl -i http://127.0.0.1:4020/ticks
```

Expect **HTTP 402** and payment instructions. Receive address is in the JSON body (`payTo`) and in the `PAYMENT-REQUIRED` header.

## Receive address

| | |
|---|---|
| Asset | USDC on Base |
| Token | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Network | `base` / `eip155:8453` |
| **payTo** | **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`** |

This repo does **not** publish a list price. If you need `maxAmountRequired` / `amount` on the 402, set `X402_USDC_ATOMIC` at deploy (USDC 6-decimal atomic units). Do not invent hay or cattle prices; do not invent a catalog of tool fees.

## Paid call

Retry with an x402 payment header (`X-PAYMENT` v1 or `PAYMENT-SIGNATURE` v2). Settlement uses `X402_FACILITATOR_URL` when set. For a local smoke of the JSON shape only:

```bash
X402_SKIP_SETTLE=1 node build/ticks-door.js
curl -s http://127.0.0.1:4020/ticks -H 'X-PAYMENT: test'
```

On this public repo host the paid body is an **honest empty/stale** payload unless you point the door at the farm-plan price cache that already collects Twin Falls, Blackfoot, AMS_3056 hay, and AMS_3059 NW Direct:

```bash
TICKS_DIR=/path/to/farm-plan/data/prices PORT=4020 node build/ticks-door.js
```

Reads `board.json` / `history.json` only. Does not scrape. Does not put family / basic-auth on a public dump.

## Run

```bash
npm run build
npm run start:ticks
```

Default listen: `0.0.0.0:4020` (`PORT` overrides).

## Out of scope

- Apollo OSINT / scrape / proxy tools
- x402scan / Bazaar / SKILL.md listing
- LINK, prediction markets, auto-trade
- Keys in the repo
