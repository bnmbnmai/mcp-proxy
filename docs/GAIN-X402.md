# USDA FAS GAIN attaché report TEXT — x402 door

Official **USDA FAS GAIN attaché report TEXT** extracted from public attaché PDFs on `gain.fas.usda.gov/Download.aspx` (same official PDF via no-auth `DownloadReportByFileName` when the filename is known). US federal public domain (**17 U.S.C. § 105**). Does not invent report text. Does not sell public search HTML. Does not wrap WASDE / PSD / ESR or FAS Open Data GATS numbers. Staff `newgainapi` token / GetRecentReports is OAuth, not this SKU.

**Scope lock:** Grain and Feed / Livestock and Products / Poultry and Products / Oilseeds and Products attaché PDFs only. First slice is eight recent official texts. Keyed on GAIN report number (`MX2026-0040`, …). Not `/ticks` AMS rows. Not NPDES. Not a news/GDELT door.

Public catalog (`SHOP-INDEX.md` / README) lists this door. MCP tools stay generated from live well-known (do not hardcode a door count). This apply wires GET `/gain` and `/gain/manifest.json` into `idaho-ticks-x402`. Unpaid `GET /gain` is HTTP 402.

## Lander card copy (product + bag size + price only)

| Field | Value |
| --- | --- |
| Product | USDA FAS GAIN attaché report TEXT |
| Bag | Newest 10 official texts |
| Price | `$0.02` / `$0.05` |

This repo does **not** own the bnm.farm lander card. tv-remote follow-up: add a `/gain` card there after apply. Do not put first-slice counts, category lists, or habit-calendar notes on the lander card.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /gain` | unpaid → **HTTP 402** | default newest 10 **$0.05** (`50000` atomic); `?id=` one official text **$0.02** (`20000` atomic) |
| `GET /gain/manifest.json` | free | HTTP 200 report number / country / post / date / official PDF URL (no attaché body). `?q=` search names the id to buy. |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

Older pages are another **$0.05** on the same URL (`page` / `before`). If the catalog has fewer than 10, the nickel GET is the whole current set.

## Source of truth

- Official hub (not sold): https://gain.fas.usda.gov/
- Official PDFs: `https://gain.fas.usda.gov/Download.aspx?p=&q=`
- Habit calendar: https://gain.fas.usda.gov/assets/GAIN%20Report%20Schedule.pdf
- First-slice official PDFs (no-auth `application/pdf`):
  - MX2026-0040 Livestock and Products Annual — Mexico City — 2026-08-24
  - CH2026-0087 Poultry and Products Annual — Beijing — 2026-07-13
  - CA2026-0008 Oilseeds and Products Annual — Ottawa — 2026-04-23
  - E42026-0034 Grain and Feed Annual — Madrid — 2026-04-20
  - VM2026-0012 Grain and Feed Annual — Ho Chi Minh City — 2026-04-15
  - AR2026-0005 Oilseeds and Products Annual — Buenos Aires — 2026-04-09
  - TU2026-0013 Grain and Feed Annual — Ankara — 2026-04-08
  - CA2026-0006 Livestock and Products Semi-Annual — Ottawa — 2026-04-01
- License: **17 U.S.C. § 105**. Attribution: USDA Foreign Agricultural Service, Global Agricultural Information Network (GAIN). U.S. government work.

Paid body keeps `cards[]` fields. Free manifest is id / reportNumber / country / post / date / category / sourceUrl only. Attaché needles such as Mexico `New World screwworm` / China `546,000 MT` / EU `277.2 million MT` stay out of unpaid 402 responses.

`data/gain/` is gitignored. The repo ships a bundled seed at `src/fixtures/gain/seed-snapshot.json` (8 official texts) used when `GAIN_DIR` is unset.

## Leak-test (re-checked 2026-08-27)

- `GET https://gain.fas.usda.gov/Download.aspx?p=2702&q=2e483a59-f4cc-4c33-871f-7b4093ae72e2` → **200** `application/pdf`.
- Public search HTML (`/search`, `/api/search?q=`) → **200** HTML, not report JSON.
- `https://apps.fas.usda.gov/newgainapi/token` → **400** unsupported_grant_type (staff OAuth).
- `https://apps.fas.usda.gov/newgainapi/api/Report/GetRecentReports` → **404**.
- FAS Open Data / GATS / PSD / ESR are commodity tables, not attaché TEXT.

## Apply

Build + restart **only** `idaho-ticks-x402.service` from the host that owns apollo. Bundled seed is used when `GAIN_DIR` is unset.

```bash
cd ~/projects/mcp-proxy
# optional on-disk cache; omit GAIN_DIR to use the bundled 8-card seed
export GAIN_DIR=$HOME/projects/mcp-proxy/data/gain
mkdir -p "$GAIN_DIR"
# first apply: copy the bundled seed if you want a writable cache
# cp src/fixtures/gain/seed-snapshot.json "$GAIN_DIR/snapshot.json"
npm run build
systemctl --user restart idaho-ticks-x402.service
```

Collector (later growth; first slice stays thin — do not recrawl a fat archive):

```bash
export GAIN_DIR=$HOME/projects/mcp-proxy/data/gain
GAIN_LIMIT=8 GAIN_MAX_FETCH=8 npm run collect:gain
```
