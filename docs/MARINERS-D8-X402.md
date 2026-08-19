# USCG D8 / Gulf LNM — x402 door

Ninth live door. Same NavCEN weekly-PDF walker as `/mariners` (D13), `/mariners-d11`, and `/mariners-d7`. Official USCG District 8 / Gulf (New Orleans) Local Notice to Mariners only. 2026 weekly PDFs are on NavCEN (`lnm08{WW}g{YYYY}.pdf`). D8 rivers (`lnm08{WW}r{YYYY}.pdf`) is a separate listing — not this SKU. Does not invent notices. Does not wrap CBP AD/CVD. Does not wrap Light List GeoJSON.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /mariners-d8` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /mariners-d8/manifest.json` | free | HTTP 200 count + official source + schema (no notice body) |
| `GET /mariners` | unpaid → **HTTP 402** | **$0.05** — D13 / Northwest, unchanged |
| `GET /mariners-d11` | unpaid → **HTTP 402** | **$0.05** — D11 / Southwest northern, unchanged |
| `GET /mariners-d7` | unpaid → **HTTP 402** | **$0.05** — D7 / Southeast, unchanged |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**. `extra.name` is **USD Coin**. Network is Base.

## Sources (official PDF)

- Listing: https://www.navcen.uscg.gov/local-notices-to-mariners?district=8+0&subdistrict=g
- Weekly PDF: `https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm08{WW}g{YYYY}.pdf`

Paid body fields: `week`, `section`, `waterway`, `text`, `sourceUrl`. Text is copied from the official PDF extract. Free manifest has `noticeCount`, `week`, `asOf`, `sections[]` (name + count), and the PDF URL — not the notice body.

## Leak-test (2026-08-19)

- NavCEN still publishes 2026 D8 Gulf weekly PDFs (week 33 = `lnm0833g2026.pdf`).
- `GET` of invented LNM JSON/CSV/GeoJSON paths → HTTP 404.
- MSI Download files are Light List GeoJSON and national ATON/MSIB GIS layers, not a district-8 weekly LNM notice-body dump. Same layers exist for D7 / D11 / D13, which are already listed from the weekly PDF.
- USCG API for LNM is still "coming soon".

If NavCEN later ships district-8 weekly notice bodies as bulk JSON/CSV, kill this door.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `MARINERS_D8_DIR` | `$HOME/projects/mcp-proxy/data/mariners-d8` | Snapshot cache (`snapshot.json`) |
| `MARINERS_D8_TTL_MS` | 6 hours | Re-collect when the snapshot is older |
| `MARINERS_D8_USDC_ATOMIC` | `50000` | Override the $0.05 D8 price |
| `MARINERS_D8_LISTING_PATH` | unset | Optional already-fetched listing HTML |
| `MARINERS_D8_PDF_PATH` | unset | Optional already-fetched weekly PDF |

Do not set `X402_SKIP_SETTLE` on the standing public unit.

```bash
cd ~/projects/mcp-proxy
npm run collect:mariners-d8
npm run test:ticks
systemctl --user restart idaho-ticks-x402.service
```
