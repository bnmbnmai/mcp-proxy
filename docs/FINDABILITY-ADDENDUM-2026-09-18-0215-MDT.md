# Findability addendum — America/Boise ~2:15am 2026-09-18

Docs/truth only. Cloud VM re-probe. No invented settles. No outbound email. Agents must not submit x402-list ownership.

This file is the current truth. The 04:32Z snapshot in [FINDABILITY-PASS-2026-09-18.md](./FINDABILITY-PASS-2026-09-18.md) is historical.

Re-probed from this box: `2026-09-18T08:11Z`–`08:20Z` UTC (America/Boise ~2:11–2:20am).

## What changed vs the 04:32Z probe

| Surface | 04:32Z–04:36Z | ~2:15am MDT (this addendum) |
| --- | --- | --- |
| Live WK `extra.resourceCount` | 62, includes `/ftc-orders` | **Same.** `GET https://ticks.bnm.farm/.well-known/x402` → 62 / 62. |
| `bnm.farm/` HTML | **61** `class="product"` cards; no FTC card | **LIVE 62.** FTC Orders / `ftc-orders` card, curl block, and hydrate are on the public lander. Apply already live. Do not re-open the lander patch as pending. |
| `/ftc-orders` free manifest | `cardCount` **0**, `asOf` null | **Stocked.** `cardCount` **5**, `asOf` `2026-08-31`, `fetchedAt` `2026-09-18T04:40:38.868Z`. Five ids: `berettaruger`, `9449-2026-08-31`, `9444-2026-04-28`, `9443-2026-01-27`, `182-3000-fleetcor-technologies-matter`. |
| ticks `/llms.txt` | “Sixty-two paid GETs”, lists `/ftc-orders` | **Same**, plus `## Table rebuy` (ETag / If-None-Match) for `/ticks` + `/import-alerts` already live. |
| GitHub `mcp-proxy` `main` | 04:32Z pass still needed the 40→62 docs sync | **MERGED.** `#247` (`ef7db97`) — README / SHOP-INDEX / OpenAPI / `docs/live-well-known.json` already 62 on main. |
| x402-list `bnm-data-shop` | `endpoint_count` **36**, description “36 paid GETs” | **Still stale.** Last check `2026-09-18T08:11:03Z`. `verified=false`. Directory still does not list the $0.02 `?id=` SKU as its own endpoint (`min_price_usd` 0.05). |
| CDP Bazaar | only `/ticks` | **Still only `/ticks`.** Merchant `payTo=0xf596…1004` `pagination.total` **1**. Do **not** invent settles to force indexing. |

## TAKE status (tonight)

### TAKE-1 — CDP Bazaar: index the other 61 doors — **PARK execute (settle-gated)**

Unchanged. Wait for a **real** unpaid→402→pay→settle on each missing door (or the facilitator’s documented bazaar path). Re-probe merchant `total` after each real settle. Do not invent settles, replay, or fake `X-PAYMENT`.

### TAKE-2 — x402-list 36 → live well-known — **PARK (Bruce-email gated)**

Unchanged gate. Draft only: [X402LIST-OWNERSHIP-BRUCE.md](./X402LIST-OWNERSHIP-BRUCE.md). Bruce sends `request-update` from the ownership email, publishes `/.well-known/x402list.txt` on **ticks.bnm.farm**, then `verify-ownership`. New description must say the live count comes from well-known — do **not** hardcode 62 forever. Include the $0.02 `?id=` price story. `/ftc-orders` is now stocked (`cardCount` 5), so it may be listed. **Agents must not submit this.**

### TAKE-3 — x402scan recrawl — **PARK**

Unchanged. No fake volume.

### TAKE-4 — GitHub mcp-proxy copy 40 → live 62 — **DONE**

Shipped on main as `#247`. Do not re-open as a docs sync.

### TAKE-5 — Lander `/ftc-orders` card — **LIVE**

Public HTML has the FTC Orders card. [lander-ftc-orders.patch](./lander-ftc-orders.patch) is historical. No apollo apply from this box. No Apollo Proxy revival.

### TAKE-6 — Harvest `/ftc-orders` — **DONE (bag stocked)**

Free manifest `cardCount` 5 as of `fetchedAt` `2026-09-18T04:40:38.868Z`. Door is no longer an empty-bag honesty problem.

### TAKE-7 — MCP / lobehub / mcp.so — **PARK / low**

Official MCP registry already listed and honest. Do not republish Apollo Proxy drafts.

## Own rails (tonight)

| Surface | Count | Honest? |
| --- | --- | --- |
| ticks `/.well-known/x402` | 62 | Yes |
| ticks `/` shop JSON | 62 products | Yes |
| ticks `/llms.txt` + apex `/llms.txt` | “Sixty-two paid GETs”, `/ftc-orders`, `## Table rebuy` | Yes |
| ticks `/openapi.json` | 3.1.0 `1.5.0`, “Sixty-two paid GETs” | Yes |
| `bnm.farm/` HTML | **62** `class="product"` cards, includes FTC Orders | Yes |
| GitHub `mcp-proxy` `main` | README / SHOP-INDEX / OpenAPI / `docs/live-well-known.json` **62** after `#247` | Yes |

## Still the recurring-dollar leak

Agents that start at our own rails see all 62. Agents that start at **CDP Bazaar** still see **only `/ticks`**. Agents that start at **x402-list** still see a frozen **36**-door listing whose description still says “36 paid GETs”.

This addendum does not create settles and does not submit x402-list ownership.
