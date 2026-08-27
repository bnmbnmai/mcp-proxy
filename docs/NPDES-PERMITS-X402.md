# EPA individual NPDES permit text — x402 door

Official **EPA-issued INDIVIDUAL NPDES permit TEXT** extracted from public PDFs on `www.epa.gov` (`/system/files/documents/…permit….pdf`). Official public US federal documents (**17 USC 105**). Does not invent permit text. Does not sell the free Region 1 `permit-listing-*.json` index (name / number / date / PDF URL only). Does not sell ECHO / ICIS-NPDES metadata.

**Scope lock:** EPA-issued individual NPDES permits only. Not ECHO. Not Superfund RODs. Not state Water Boards ACL orders. Not general permits (CGP / MSGP / MS4 / CAFO). Not authorized-state programs (CT / ME / RI / VT and other delegated states). Not state GIS wraps. Not hyperlocal county splits.

Public catalog (`SHOP-INDEX.md` / README) lists this door. MCP tools stay generated from live well-known (do not hardcode a door count). This listing PR does **not** apply on apollo or restart `idaho-ticks-x402`. Unpaid `GET /npdes-permits` is HTTP 402 on the live shop.

v1 seeds **16** official individual permit PDFs harvested from `epa.gov`. Required seed is **MA0003531 CertainTeed** (issued 2026-05-27). Also seeds NH0001023 PCC Structurals and AZ0024619 Moenkopi Utility Authority (EPA Region 9 tribal). Skip drafts, fact sheets, general-permit transfers, ECHO JSON, Superfund RODs, and Water Boards ACL orders.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /npdes-permits` | unpaid → **HTTP 402** | default newest 10 **$0.05** (`50000` atomic); `?id=` one official text **$0.02** (`20000` atomic) |
| `GET /npdes-permits/manifest.json` | free | HTTP 200 name / date / permit / official PDF URL (no permit body). `?q=` search names the id to buy. |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**. Same wallet / facilitator pattern as live extracted-body doors.

Older pages are another **$0.05** on the same URL (`page` / `before`). If the catalog has fewer than 10, the nickel GET is the whole current set.

## Source of truth

- Official index (not sold): https://www.epa.gov/npdes-permits
- EPA issues all individual NPDES permits in Massachusetts, New Hampshire, New Mexico, the District of Columbia, and U.S. territories (except the Virgin Islands), plus certain federal facilities and tribal lands
- Region 1 listing JSON (index-only, not the sold unit): https://www.epa.gov/system/files/other-files/2025-07/permit-listing-ma.json and `permit-listing-nh.json`
- Official individual permit PDFs: `https://www.epa.gov/system/files/documents/{yyyy-mm}/final{ma|nh}#######permit-*.pdf`
- Required seed: CertainTeed — MA0003531 — 27 May 2026 — https://www.epa.gov/system/files/documents/2026-05/finalma0003531permit-2026.pdf
- License: **17 USC 105** (US federal government work). Public domain; licensed to cache and resell the extracted official text.

Paid body keeps `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=npdes-permits`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official EPA NPDES permits index). A repeat buyer diffs `asOf` + record ids.

Free manifest is id / name / date / permit / sourceUrl only. Permit needles such as CertainTeed `AUTHORIZATION TO DISCHARGE` stay out of unpaid 402 responses.

`data/npdes-permits/` is gitignored. The repo ships a bundled seed at `src/fixtures/npdes-permits/seed-snapshot.json` (16 official texts) used when `NPDES_PERMITS_DIR` is unset.

This repo does **not** own the bnm.farm lander card. tv-remote follow-up: add a `/npdes-permits` card there after apply.

## Leak-test (re-checked 2026-08-27)

- Official individual permit PDFs on `www.epa.gov/system/files/documents/` return HTTP 200 application/pdf (ugly scanned/typeset PDFs, not a clean body API).
- Region 1 `permit-listing-*.json` is index-only (facility name / permit number / date / PDF URL). Not sold.
- ECHO / ICIS-NPDES, Superfund RODs, Water Boards ACL, state GIS, and general-permit PDFs are rejected by the collector.
- 17 USC 105: US federal government works. Cache + resell of the extracted official text is allowed.

## Apply

Build + restart **only** `idaho-ticks-x402.service` from the host that owns apollo. This listing PR does **not** apply on apollo from the cloud VM.

```bash
cd ~/projects/mcp-proxy
# optional on-disk cache; omit NPDES_PERMITS_DIR to use the bundled 16-card seed
export NPDES_PERMITS_DIR=$HOME/projects/mcp-proxy/data/npdes-permits
mkdir -p "$NPDES_PERMITS_DIR"
# first apply: copy the bundled seed if you want a writable cache
# cp src/fixtures/npdes-permits/seed-snapshot.json "$NPDES_PERMITS_DIR/snapshot.json"
npm run build
sudo systemctl restart idaho-ticks-x402.service
```

Collector (later growth; first slice stays the 16 official texts):

```bash
export NPDES_PERMITS_DIR=$HOME/projects/mcp-proxy/data/npdes-permits
NPDES_PERMITS_LIMIT=16 NPDES_PERMITS_MAX_FETCH=16 npm run collect:npdes-permits
```
