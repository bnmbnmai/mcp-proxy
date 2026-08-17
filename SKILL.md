# Idaho ticks — live x402 SKU

Public ungated door. Agents pay USDC on Base; there is no login wall.

## Endpoint

```
GET https://ticks.bnm.farm/ticks
```

Unpaid (no `X-PAYMENT` / `PAYMENT-SIGNATURE`) returns **HTTP 402** with a real x402 envelope.

```bash
curl -i https://ticks.bnm.farm/ticks
```

LAN backend (same SKU, still loopback-only):

```bash
curl -i http://127.0.0.1:4020/ticks
```

## Price

| | |
|---|---|
| Price | **$0.02 USDC** |
| Atomic | `20000` (USDC 6 decimals) |
| Asset | Native USDC on Base `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Network | `base` / `eip155:8453` |
| **payTo** | **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`** |
| Scheme | `exact` (EIP-3009 `transferWithAuthorization`) |

Facilitator rail: CDP `https://api.cdp.coinbase.com/platform/v2/x402` (verify + settle). Do not set `X402_SKIP_SETTLE` on the live unit.

## What you get after a valid pay

JSON from the farm-plan price cache on apollo. The door **reads** the cache; it does not scrape and it does not invent prices.

When the cache is fresh you get the same public series the LAN door already serves:

- Twin Falls Livestock Commission feeder cattle
- Blackfoot Livestock Auction feeder cattle
- USDA AMS Idaho Direct Hay (AMS_3056) — conventional / premium squares
- USDA AMS Northwest Direct Cattle (AMS_3059)
- USDA AMS Specialty Crops Idaho Falls (**IF_FV130**) onions and potatoes
- Idaho Barley Commission (**IBC**) elevator grain — barley $/cwt and wheat $/bu as printed (Idaho Falls, Twin Falls/Buhl, Meridian, Lewiston, Moscow/Genesee, Nezperce/Craigmont). Blank printed cells stay empty.
- Water District 1 (**WD1**) rental-pool posted all-in **$/AF** (common above Milner, flow aug, assignment fill / no-fill). Official 2026 procedures PDF only — nothing invented.

**Organic hay stays empty** unless an official organic quote is in the cache. Treasure Valley is not filled in. Failed official fetches are listed under `failed`, not guessed.

Typical paid shape:

```json
{
  "ok": true,
  "product": "idaho-hay-feeder-ticks",
  "status": "ok",
  "fetchedAt": "2026-08-17T19:28:42Z",
  "ticks": [],
  "failed": [],
  "history": { "points": [], "emptyReports": [], "series": [] }
}
```

## Cache window

Farm-plan `board.json` `cacheTtlSeconds` is **14400** (4 hours). `fetchedAt` is the last official collect. Stale/empty cache returns honest `status: "stale"` or `"empty"` after pay — still not invented prices.

## Discovery (unpaid, 200)

- `GET https://ticks.bnm.farm/.well-known/x402`
- `GET https://ticks.bnm.farm/.well-known/x402.json`
- `GET https://ticks.bnm.farm/openapi.json`

The 402 `accepts[].outputSchema` marks `GET /ticks` `discoverable: true` for CDP Bazaar / x402scan.

## Listings submitted

- x402scan register (origin + endpoint): [recipient 0xf596…1004](https://www.x402scan.com/recipient/0xf59621FC406D266e18f314Ae18eF0a33b8401004) — resource `https://ticks.bnm.farm/ticks`, origin id `c6f584c5-e494-41d1-aa02-2efb07ac3546`
- CDP / Chainlink Agents Bazaar: no public submit form. Door already uses CDP facilitator `https://api.cdp.coinbase.com/platform/v2/x402`. Bazaar indexes after a successful CDP verify+settle (this box has no CDP API key; facilitator returns 401). Local EIP-3009 settle still works for real pays.

## Out of scope

- `farm.bnm.farm`, `water.bnm.farm`, `storm.bnm.farm` stay family/agent gated
- No basic-auth on this host
- No keys or family passwords in this file
