# Findability pass — ticks.bnm.farm (2026-09-18)

**Current truth (America/Boise ~2:15am / ~08:15Z):** [FINDABILITY-ADDENDUM-2026-09-18-0215-MDT.md](./FINDABILITY-ADDENDUM-2026-09-18-0215-MDT.md). x402-list ownership is Bruce-only: [X402LIST-OWNERSHIP-BRUCE.md](./X402LIST-OWNERSHIP-BRUCE.md). Agents must not submit it.

The 04:32Z–04:36Z probe below is the morning snapshot. Do not treat its empty `/ftc-orders` bag, 61-card lander, or “mcp-proxy still on 40” row as live. Later the same night: lander FTC card **LIVE**; `/ftc-orders` bag **stocked** (`cardCount` 5); `#247` **merged** (docs/README/OpenAPI already 62 on main). CDP TAKE stays settle-gated PARK execute. x402-list TAKE stays Bruce-email gated.

Galaxy steal: AI-search visibility. Hunt + what we can fix without inventing settles or claiming x402-list ownership.

Probed: `2026-09-18T04:32Z`–`04:36Z` UTC.

## Verdict

Live shop is **62 paid GETs**. Agents that start at our own rails (well-known, llms.txt, OpenAPI, shop JSON, MCP) see all 62. Agents that start at **CDP Bazaar** see **only `/ticks`**. Agents that start at **x402-list** see a frozen **36**-door listing. That gap is the recurring-dollar leak.

No settles were created. x402-list ownership was not submitted (needs Bruce email).

## 1) Live well-known

`GET https://ticks.bnm.farm/.well-known/x402` → HTTP 200, `extra.resourceCount` **62**, `resources.length` **62**.

`GET https://bnm.farm/.well-known/x402` → same JSON (apex proxy from lander-61). `GET https://bnm.farm/llms.txt` is identical to ticks.

Paths, WK order:

1. `/ticks`
2. `/import-alerts`
3. `/mariners`
4. `/mariners-d11`
5. `/mariners-d7`
6. `/mariners-d8`
7. `/mariners-d1`
8. `/mariners-d5`
9. `/mariners-d9`
10. `/mariners-d14`
11. `/mariners-d17`
12. `/warning-letters`
13. `/untitled-letters`
14. `/awa`
15. `/swisspar`
16. `/pcac`
17. `/ftc-wl`
18. `/cfpb-orders`
19. `/occ-cd`
20. `/fdic-orders`
21. `/frb-orders`
22. `/ncua-orders`
23. `/fincen-orders`
24. `/ferc-orders`
25. `/ofac-orders`
26. `/bis-orders`
27. `/cftc-orders`
28. `/fifra-orders`
29. `/denovo-orders`
30. `/ttb-oic`
31. `/air-letters`
32. `/superfund-rods`
33. `/ico-mpn`
34. `/cma-ca98`
35. `/ema-referrals`
36. `/cder-reviews`
37. `/npdes-permits`
38. `/ofsted-inspections`
39. `/ofwat-enforcement`
40. `/ofgem-enforcement`
41. `/gain`
42. `/orr-enforcement`
43. `/phmsa-orders`
44. `/aaib-reports`
45. `/csb-reports`
46. `/hhs-oig-reports`
47. `/eis-reports`
48. `/fsis-humane`
49. `/epa-cafo`
50. `/fmshrc-orders`
51. `/bsee-reports`
52. `/oshrc-orders`
53. `/epa-alj`
54. `/epa-eab`
55. `/faa-civil-penalty`
56. `/stb-decisions`
57. `/oalj-decisions`
58. `/fmc-orders`
59. `/ftc-orders`
60. `/form-483`
61. `/gmp`
62. `/gmp-md`

`/ftc-orders` is the 62nd door after lander-61. **At 04:32Z** the free manifest `cardCount` was **0** (`asOf` null). **Later the same night** the bag is stocked: `cardCount` **5**, `fetchedAt` `2026-09-18T04:40:38.868Z`, `asOf` `2026-08-31`. Sell it as a live door with a small bag, not as empty.

## 2) CDP discovery (Bazaar)

Public, no API key.

| Probe | Indexed BNM doors |
| --- | --- |
| `GET /v2/x402/discovery/search?query=ticks.bnm.farm` | **only** `https://ticks.bnm.farm/ticks` |
| `query=bnm` | only `/ticks` |
| `query=bnm-data-shop` | **0** |
| `urlSubstring=ticks.bnm.farm` | only `/ticks` |
| `urlSubstring=ticks.bnm.farm/form-483` (and `/warning-letters`) | **0** |
| `payTo=0xf59621FC406D266e18f314Ae18eF0a33b8401004` | only `/ticks` |
| merchant `…/discovery/merchant?payTo=0xf596…1004` | `pagination.total` **1** = `/ticks` |

Intent searches that should hit later doors hit **competitors**, not BNM:

- `FDA warning letters` → govparse, kadec0, agent402, datalayer. **No BNM.**
- `Form 483 inspectional observations` → agentstools / agent402. **No BNM.** (`/form-483` live bag **1189**.)
- `import-alerts`, `Health Canada GMP report-card`, `USCG local notice mariners bnm` → **no BNM** (`/gmp` live bag **4099**; `/import-alerts` **18924**).
- `USDA hay cattle` → `/ticks` ranks first (the one indexed door).

Confirmed: CDP has **only `/ticks`**. The other 61 live paid routes are not in Bazaar.

## 3) x402-list.com `bnm-data-shop`

`GET https://x402-list.com/api/v1/services/bnm-data-shop`

- `endpoint_count` **36** (array length 36). Live WK **62**. Gap **26**.
- `description` still says “36 paid GETs”.
- `source=submitted`, `verified=false`, `status=online`, uptime 24h 100 / 30d 98.4.
- Last check `2026-09-18T04:27Z`. Assessment envelope captured `2026-08-27T16:36Z`.
- `min_price_usd` 0.05 (directory does not list the $0.02 `?id=` SKU as a separate endpoint).
- `website_url` / `base_url` = `https://ticks.bnm.farm` (not `https://bnm.farm/`).

Listed 36: `/air-letters` `/awa` `/bis-orders` `/cder-reviews` `/cfpb-orders` `/cftc-orders` `/cma-ca98` `/denovo-orders` `/ema-referrals` `/fdic-orders` `/ferc-orders` `/fifra-orders` `/fincen-orders` `/form-483` `/frb-orders` `/ftc-wl` `/gmp` `/gmp-md` `/ico-mpn` `/import-alerts` `/mariners` `/mariners-d11` `/mariners-d7` `/mariners-d8` `/ncua-orders` `/npdes-permits` `/occ-cd` `/ofac-orders` `/ofsted-inspections` `/pcac` `/superfund-rods` `/swisspar` `/ticks` `/ttb-oic` `/untitled-letters` `/warning-letters`.

Missing 26 vs live: `/mariners-d1` `/mariners-d5` `/mariners-d9` `/mariners-d14` `/mariners-d17` `/ofwat-enforcement` `/ofgem-enforcement` `/gain` `/orr-enforcement` `/phmsa-orders` `/aaib-reports` `/csb-reports` `/hhs-oig-reports` `/eis-reports` `/fsis-humane` `/epa-cafo` `/fmshrc-orders` `/bsee-reports` `/oshrc-orders` `/epa-alj` `/epa-eab` `/faa-civil-penalty` `/stb-decisions` `/oalj-decisions` `/fmc-orders` `/ftc-orders`.

Ownership update is `POST /api/v1/services/bnm-data-shop/request-update` then publish a one-time token at `{origin}/.well-known/x402list.txt` and `verify-ownership`. **Not done here.** Needs Bruce email (`brucemccray@gmail.com`). Draft runbook: [X402LIST-OWNERSHIP-BRUCE.md](./X402LIST-OWNERSHIP-BRUCE.md). Agents must not submit. Re-checked `2026-09-18T08:11Z`: still `endpoint_count` 36, description still “36 paid GETs”.

## 4) x402scan + other public indexes

### x402scan

Server page live: https://www.x402scan.com/server/c6f584c5-e494-41d1-aa02-2efb07ac3546

Recipient page live: https://www.x402scan.com/recipient/0xf59621FC406D266e18f314Ae18eF0a33b8401004

HTML catalog `lastUpdated` **2026-08-27**. Paid (`x402Version: 2`) resources match the late-August shop: the x402-list 36 **plus** `/ofwat-enforcement` (~37 paid). Free/discovery URLs also indexed (`/`, `/.well-known/x402`, manifests, `/sample`, `/firm-check`, `/mcp`, `/llms.txt`, `/openapi.json`, `/catalog.json`).

Not on x402scan: the 25 doors added after that crawl (five extra LNM districts, ofgem/gain/orr, PHMSA through FMC, `/ftc-orders`). Sitemap has **no** `bnm` URL. Public JSON API routes 404.

### MCP registry

`https://registry.modelcontextprotocol.io/v0/servers?search=io.github.bnmbnmai/bnm-data-shop` lists `io.github.bnmbnmai/bnm-data-shop` → `https://ticks.bnm.farm/mcp`. Description is count-free. Honest.

### Other

- lobehub plugin URL 404.
- mcp.so API: Cloudflare challenge (not readable here).
- `x402.directory`: TLS failed from this box.
- Repo `submissions/*` still described **Apollo Proxy** (residential proxy, apolloai.team). Retired in this pass. x402-list pointer: [X402LIST-OWNERSHIP-BRUCE.md](./X402LIST-OWNERSHIP-BRUCE.md) (Bruce only; do not revive Apollo).

## 5) Own rails after lander-61

| Surface | Count | Honest? |
| --- | --- | --- |
| ticks `/.well-known/x402` | 62 | Yes |
| ticks `/` shop JSON | 62 products | Yes |
| ticks `/llms.txt` + apex `/llms.txt` | “Sixty-two paid GETs”, lists `/ftc-orders`; `## Table rebuy` (ETag / If-None-Match) for `/ticks` + `/import-alerts` | Yes |
| ticks `/openapi.json` | 3.1.0 `1.5.0`, “Sixty-two paid GETs” | Yes |
| `bnm.farm/` HTML | **61** `class="product"` cards at 04:32Z; **62 LIVE** by ~2:15am MDT (FTC Orders card on) | **Yes** (after later apply) |
| GitHub `mcp-proxy` `main` | README / SHOP-INDEX / `docs/live-well-known.json` were **40** before `#247`; **62** on main after `#247` | **Yes** (after `#247`) |
| lander-61 leftovers (wool/water, Ofwat Live: 2, hardcoded 61) | gone on live HTML | Yes |
| `shopStats 6 / $0.21` | apply-record / board only; not on public HTML | N/A |

`/sitemap.xml` is 404 (JSON `not_found` that lists live paths). `robots.txt` points `Sitemap: /openapi.json`. Not a door-count lie.

## 6) TAKE / PARK ranked for recurring $

Higher rank = more missed agent buys if we leave it.

### TAKE-1 — CDP Bazaar: index the other 61 doors (PARK execute, settle-gated)

**Why $:** This is the AI-search surface. `FDA warning letters` / `Form 483` / `import-alerts` / `GMP` already return **other shops**. `/warning-letters` (1997), `/form-483` (1189), `/gmp` (4099), `/import-alerts` (18924), `/superfund-rods` (1204) are live and invisible.

**Do:** wait for a **real** unpaid→402→pay→settle on each missing door (or the facilitator’s documented bazaar path). Re-probe merchant `total` after each real settle.

**Do not:** invent settles, replay, or fake X-PAYMENT.

### TAKE-2 — x402-list 36 → live well-known (PARK, Bruce email)

**Why $:** Directory agents still read “36 paid GETs”. Missing stocked doors include `/phmsa-orders` (526), extra LNM districts (126–1760 notices), `/hhs-oig-reports` (202), `/bsee-reports` (132), `/fsis-humane` (93), `/eis-reports` (74), `/stb-decisions` (62). `/ftc-orders` is now stocked (`cardCount` 5) — include it.

**Do:** Bruce-only runbook [X402LIST-OWNERSHIP-BRUCE.md](./X402LIST-OWNERSHIP-BRUCE.md). Bruce sends `request-update` from the ownership email, publishes `/.well-known/x402list.txt` on ticks.bnm.farm, verify. New description: live count is well-known; do not hardcode 62. Include the $0.02 `?id=` price story.

**Do not:** submit from this agent.

### TAKE-3 — x402scan recrawl (PARK)

**Why $:** Same stale August set as x402-list plus Ofwat. Lower than CDP/x402-list (no sitemap; fewer agent entry points) but still a public catalog.

**Do:** ask x402scan to recrawl `https://ticks.bnm.farm/.well-known/x402` / server `c6f584c5-…`. No fake volume.

### TAKE-4 — GitHub mcp-proxy copy 40 → live 62 (DONE, `#247`)

**Why $:** Agents and humans that start at the official repo were still seeing 40 doors and “forty” in the checked-in OpenAPI.

**Done:** `#247` merged on main. README, SHOP-INDEX, `docs/live-well-known.json`, live OpenAPI snapshot, and the 04:32Z findability report are already 62. Apollo submission drafts were retired there. Do not re-open as a sync.

### TAKE-5 — Lander `/ftc-orders` card (LIVE)

**Why $:** Honesty. At 04:32Z `cardCount` was 0 and HTML had 61 cards.

**Done later the same night:** public `bnm.farm/` has the FTC Orders / `ftc-orders` card (62 `class="product"`). [lander-ftc-orders.patch](./lander-ftc-orders.patch) is historical. No apollo apply from this box.

### TAKE-6 — Harvest `/ftc-orders` (DONE)

**At 04:32Z** the door was empty. **Later the same night** free manifest `cardCount` is **5** (`fetchedAt` `2026-09-18T04:40:38.868Z`). Bag is stocked. Do not keep this PARK as empty-door.

### TAKE-7 — MCP / lobehub / mcp.so (PARK / low)

Official MCP registry is already listed and honest. lobehub 404 and mcp.so challenge are not the $ path. Do not republish Apollo Proxy drafts.

## What this pass changed

- mcp-proxy docs: shop index + OpenAPI snapshot aligned to live WK (62). Shipped on main as `#247`.
- submissions: Apollo Proxy leftovers replaced with BNM Data Shop drafts.
- tv-remote: `/ftc-orders` lander copy was still pending apollo at 04:32Z. **Later the same night the lander card is LIVE**; do not treat apply as open work.
- Later-same-night truth + Bruce-only x402-list draft: [FINDABILITY-ADDENDUM-2026-09-18-0215-MDT.md](./FINDABILITY-ADDENDUM-2026-09-18-0215-MDT.md), [X402LIST-OWNERSHIP-BRUCE.md](./X402LIST-OWNERSHIP-BRUCE.md).
