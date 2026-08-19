# USCG D11 / Southwest LNM — x402 door

Sixth live door. Same NavCEN weekly-PDF walker as `/mariners` (D13). Official USCG District 11 / Southwest **northern** Local Notice to Mariners only. D11 south had no 2026 weekly PDFs on collect — not shipped. Does not invent notices. Does not wrap CBP AD/CVD.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /mariners-d11` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /mariners-d11/manifest.json` | free | HTTP 200 count + official source + schema (no notice body) |
| `GET /mariners` | unpaid → **HTTP 402** | **$0.05** — D13 / Northwest, unchanged |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Sources (official PDF)

- Listing: https://www.navcen.uscg.gov/local-notices-to-mariners?district=11+0&subdistrict=n
- Weekly PDF: `https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm11{WW}{YYYY}.pdf`

Paid body fields: `week`, `section`, `waterway`, `text`, `sourceUrl`. Text is copied from the official PDF extract. Free manifest has `noticeCount`, `week`, `asOf`, `sections[]` (name + count), and the PDF URL — not the notice body.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `MARINERS_D11_DIR` | `$HOME/projects/mcp-proxy/data/mariners-d11` | Snapshot cache (`snapshot.json`) |
| `MARINERS_D11_TTL_MS` | 6 hours | Re-collect when the snapshot is older |
| `MARINERS_D11_USDC_ATOMIC` | `50000` | Override the $0.05 D11 price |
| `MARINERS_D11_LISTING_PATH` | unset | Optional already-fetched listing HTML |
| `MARINERS_D11_PDF_PATH` | unset | Optional already-fetched weekly PDF |

Do not set `X402_SKIP_SETTLE` on the standing public unit.

```bash
cd ~/projects/mcp-proxy
npm run collect:mariners-d11
npm run test:ticks
systemctl --user restart idaho-ticks-x402.service
```
