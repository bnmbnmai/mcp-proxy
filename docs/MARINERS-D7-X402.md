# USCG D7 / Southeast LNM — x402 door

Seventh live door. Same NavCEN weekly-PDF walker as `/mariners` (D13) and `/mariners-d11`. Official USCG District 7 / Southeast Local Notice to Mariners only. 2026 weekly PDFs are on NavCEN (`lnm07{WW}{YYYY}.pdf`). Does not invent notices. Does not wrap CBP AD/CVD.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /mariners-d7` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /mariners-d7/manifest.json` | free | HTTP 200 count + official source + schema (no notice body) |
| `GET /mariners` | unpaid → **HTTP 402** | **$0.05** — D13 / Northwest, unchanged |
| `GET /mariners-d11` | unpaid → **HTTP 402** | **$0.05** — D11 / Southwest northern, unchanged |
| `GET /mariners-d8` | unpaid → **HTTP 402** | **$0.05** — D8 / Gulf, separate SKU |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**. `extra.name` is **USD Coin**. Network is Base.

## Sources (official PDF)

- Listing: https://www.navcen.uscg.gov/local-notices-to-mariners?district=7+0&subdistrict=n
- Weekly PDF: `https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm07{WW}{YYYY}.pdf`

Paid body fields: `week`, `section`, `waterway`, `text`, `sourceUrl`. Text is copied from the official PDF extract. Free manifest has `noticeCount`, `week`, `asOf`, `sections[]` (name + count), and the PDF URL — not the notice body.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `MARINERS_D7_DIR` | `$HOME/projects/mcp-proxy/data/mariners-d7` | Snapshot cache (`snapshot.json`) |
| `MARINERS_D7_TTL_MS` | 6 hours | Re-collect when the snapshot is older |
| `MARINERS_D7_USDC_ATOMIC` | `50000` | Override the $0.05 D7 price |
| `MARINERS_D7_LISTING_PATH` | unset | Optional already-fetched listing HTML |
| `MARINERS_D7_PDF_PATH` | unset | Optional already-fetched weekly PDF |

Do not set `X402_SKIP_SETTLE` on the standing public unit.

```bash
cd ~/projects/mcp-proxy
npm run collect:mariners-d7
npm run test:ticks
systemctl --user restart idaho-ticks-x402.service
```
