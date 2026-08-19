# USCG D13 / Northwest LNM — x402 door

Separate SKU from Idaho ticks, FDA import alerts, and USCG D11 (`/mariners-d11`). Official USCG District 13 / Northwest weekly Local Notice to Mariners PDF only. Does not invent notices. Does not wrap CBP AD/CVD. `/mariners` stays D13.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /mariners` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /mariners/manifest.json` | free | HTTP 200 count + official source + schema (no notice body) |
| `GET /ticks` | unpaid → **HTTP 402** | **$0.02** — unchanged |
| `GET /import-alerts` | unpaid → **HTTP 402** | **$0.05** — unchanged |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Sources (official PDF)

- Listing: https://www.navcen.uscg.gov/local-notices-to-mariners?district=13+0&subdistrict=n
- Weekly PDF: `https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13{WW}{YYYY}.pdf`

Paid body fields: `week`, `section`, `waterway`, `text`, `sourceUrl`. Text is copied from the official PDF extract. Free manifest has `noticeCount`, `week`, `sections[]` (name + count), and the PDF URL — not the notice body.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `MARINERS_DIR` | `$HOME/projects/mcp-proxy/data/mariners` | Snapshot cache (`snapshot.json`) |
| `MARINERS_TTL_MS` | 6 hours | Re-collect when the snapshot is older |
| `MARINERS_USDC_ATOMIC` | `50000` | Override the $0.05 mariners price |
| `MARINERS_LISTING_PATH` | unset | Optional already-fetched listing HTML |
| `MARINERS_PDF_PATH` | unset | Optional already-fetched weekly PDF |

Do not set `X402_SKIP_SETTLE` on the standing public unit.

D11 / Southwest northern is a separate SKU at `/mariners-d11`. D7 / Southeast is `/mariners-d7`. Same walker. See `docs/MARINERS-D11-X402.md` and `docs/MARINERS-D7-X402.md`.

```bash
cd ~/projects/mcp-proxy
npm run collect:mariners
npm run test:ticks
```
