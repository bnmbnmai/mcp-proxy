# EPA Superfund Record of Decision + Five-Year Review text — x402 door

Official EPA Superfund **institution/site Record of Decision and Five-Year Review TEXT** extracted from SEMS PDFs on `semspub.epa.gov`. Same `/superfund-rods` bag. Does not invent ROD or FYR text. Not a Proposed Plan or fact sheet. Not FYR protectiveness letters or transmittals. Not people. Not Federal Register `raw_text`. Not AIR `/air-letters`. Not TTB `/ttb-oic`. Not De Novo `/denovo-orders`. Not FIFRA `/fifra-orders`. Not CFTC `/cftc-orders`. Does not wrap the free SEMS listing JSON. Does not sell CUMULIS site-summary HTML.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /superfund-rods` is HTTP 402.

v1 seeds **5** official institution/site ROD PDFs. Required seed is Federated Metals Corp. Whiting Superfund Site OU1 IROD (`05-711427`, signed 2026-08-05). Family: Meeker Avenue Plume OU2 (`02-744534`), Ten-Mile Drain (`05-988133`), Velsicol Chemical Corporation OU3 (`05-978074`), Pike and Mulberry Streets PCE Plume (`05-964773`). FYR fatten adds newest official Five-Year Review **reports** from collection **28008** (habit: Cape Fear Wood Preserving 5th FYR, `04-11246061`, signed 2026-09-02). Skip people. Skip Proposed Plans, ESD, ROD amendments, approval memos, and FYR letters/transmittals.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /superfund-rods` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /superfund-rods/manifest.json` | free | HTTP 200 title + Doc ID + official PDF URL (no ROD/FYR body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Official ROD table: https://www.epa.gov/superfund/search-superfund-decision-documents (collection **25504**)
- Official FYR table: https://www.epa.gov/superfund/search-superfund-five-year-reviews (collection **28008**)
- First-slice miss: one CUMULIS site-profile cleanup page (`fuseaction=second.Cleanup&id=0501275`) is a teaser, not the ROD table
- Listing feed both official tables load (PDF URLs only; not the sold body): https://www3.epa.gov/semsjson/HQ_MasterCollection_11.json
- Official PDFs: `https://semspub.epa.gov/work/{region}/{docid}.pdf` (`/src/document/{region}/{docid}` 301s here)
- Required seed: Federated Metals Corp. Whiting Superfund Site — OU1 IROD — signed 5 Aug 2026 — https://semspub.epa.gov/work/05/711427.pdf
- FYR habit seed: Cape Fear Wood Preserving Superfund Site — 5th FYR — signed 2 Sep 2026 — https://semspub.epa.gov/work/04/11246061.pdf
- License: **17 USC 105**. Attribute U.S. EPA.

Paid body keeps the existing `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=superfund-rod`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official decision-document table). A repeat buyer diffs `asOf` + record ids.

Free manifest is title + Doc ID + official PDF URL (plus institution / date). Needles such as `1,200 ppm`, `lead dross`, and `x-ray florescence` stay out of unpaid responses.

`data/superfund-rods/` is gitignored.

Applied on apollo (2026-09-08): **serving SHA `16cecab`** (apply-record [PR 212](https://github.com/bnmbnmai/mcp-proxy/pull/212); FF of [PR 211](https://github.com/bnmbnmai/mcp-proxy/pull/211) onto `cursor/x402list-ownership-c90d` @ `e05b9bc`). Restarted **only** `idaho-ticks-x402.service` at **2026-09-08 13:17:59 MDT** (PID 122615). Public `GET https://ticks.bnm.farm/superfund-rods/manifest.json` is **200** (`via: Caddy`) with **cardCount 413**, asOf **2026-09-03**, fetchedAt **2026-09-08T18:27:29.933Z**, schema includes `title`, **413/413** cards titled, no body leak. Sample FYR: Cape Fear `04-11246061` **Fifth Five-Year Review**. Slim `data/superfund-rods/catalog.json` rebuilt on first loopback read. Unpaid `GET /superfund-rods` stays **402** at $0.05 / `50000`. `/.well-known/x402` still **54** doors (no new Superfund path). Did not apply stale PR 199. Did not collect.

Applied on apollo (2026-09-14): **serving SHA `ff18566`** (apply-record [PR 232](https://github.com/bnmbnmai/mcp-proxy/pull/232); cherry-pick of [PR 231](https://github.com/bnmbnmai/mcp-proxy/pull/231) `cursor/superfund-stream-write-da2d` @ `c950ab3` onto `cursor/apply-stb-decisions-c96e` @ `6b2699a` / prior serving `3e1fee6`). Restarted **only** `idaho-ticks-x402.service` at **2026-09-14 22:58:04 MDT** (PID 3804817; was 3494014). `writePrettyJsonBag` streams fat `cards[]` so evening collect can rewrite the ~529MB snapshot without `RangeError: Invalid string length`. One-door `npm run collect:superfund-rods` EXIT 0: listedCount **10766**, `addedThisRun` 5, `fetchedPdfs` 0, skipped 52, reused 337, asOf **2026-09-11**, fetchedAt **2026-09-15T05:00:49.255Z** (was stuck at **2026-09-14T15:38:04.610Z**). Bag **n 701 → 706**. Public manifest still **200** / payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. Unpaid `GET /superfund-rods` still **402** at $0.05 / `50000`. `/.well-known/x402` still **59** doors including `/stb-decisions`. docker-gw / Caddy / tunnel untouched. No shop USDC.

Applied on apollo (2026-09-16): **serving SHA `8a2b12b` / merge `d56ba151`** ([PR 240](https://github.com/bnmbnmai/mcp-proxy/pull/240) Buffer reader onto `cursor/fmc-orders-0443`; apply-record [PR 241](https://github.com/bnmbnmai/mcp-proxy/pull/241)). Restarted **only** `idaho-ticks-x402.service` at **2026-09-16 23:15:38 MDT** (PID **2129131**; was 1808175 from 17:13). `readSuperfundRodsSnapshot` now parses `cards[]` from file bytes (not one UTF-8 string) so the live **719MB** bag no longer hits V8 `RangeError: Invalid string length`. Smoke: **n=981** in **5.3s**, no RangeError. Public `GET https://ticks.bnm.farm/superfund-rods/manifest.json` still **200** cardCount **981**, asOf **2026-09-15**, fetchedAt **2026-09-17T00:47:26.064Z** (fail-closed held; bag did not grow yet). Unpaid `GET /superfund-rods` still **402** at $0.05 / `50000`. `/.well-known/x402` still **61** doors including `/fmc-orders`. Rebuild #3 left running (PID **2061938**, LIMIT=2500, MAX_FETCH=200, started 21:59 Boise; EPA HTTPS in flight). docker-gw / Caddy / tunnel untouched. No shop USDC. Did not run a second collect.

## Apollo collect (official ROD + FYR walk)

```bash
cd ~/projects/mcp-proxy
export SUPERFUND_RODS_DIR=$HOME/projects/mcp-proxy/data/superfund-rods
SUPERFUND_RODS_LIMIT=24 SUPERFUND_RODS_MAX_FETCH=36 npm run collect:superfund-rods
```
