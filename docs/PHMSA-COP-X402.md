# PHMSA OPS consent / final / CAO / safety-order text — x402 door

Official PHMSA Office of Pipeline Safety **institution/company Consent Order / Consent Agreement / Final Order / Corrective Action Order / Safety Order TEXT** extracted with `pdftotext` from PDFs on `primis.phmsa.dot.gov/enforcement-documents/`. Does not invent order text. Not people. Not the case-card teaser. Not PHMSA 27nc-rsge incident NARRATIVE. Not Raw Data.txt / page-data.json. Not ICO `/ico-mpn`.

**Prep only. Do not list on well-known / OpenAPI / llms.txt / shop catalog until `/ico-mpn` is live.** Unpaid `GET /phmsa-cop` is HTTP 402.

v1 seeds **5** official operator enforcement PDFs. Required lead is EQT Production Company (`eqt-1-2025-033-nopv`, Consent Order 21 Apr 2026). Family: Denbury Gulf Coast Pipelines LLC (`denbury-4-2025-024-nopv1`), Cove Point LNG, LP (`cove-point-4-2025-010-nopso`), Valero Partners Operating Co., LLC (`valero-4-2026-004-nopv`), Enterprise Products Operating, LLC (`enterprise-4-2026-005-cao`). Skip people. Skip hazmat shipper tickets. Skip Republic Testing Laboratories `42025024NOPV2`.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /phmsa-cop` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /phmsa-cop/manifest.json` | free | HTTP 200 operator / CPF / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://primis.phmsa.dot.gov/enforcement-documents/
- Official PDFs: `https://primis.phmsa.dot.gov/enforcement-documents/{case}/{file}.pdf`
- Required seed: EQT Production Company — 21 Apr 2026 — https://primis.phmsa.dot.gov/enforcement-documents/12025033NOPV/12025033NOPV_Consent%20Agreement%20and%20Order_04212026_(22-259271).pdf
- License: **17 U.S.C. § 105**. Author PHMSA. Official `.gov` host.

Free manifest is operator / CPF / date / sourceUrl only. Needles such as `Rager Mountain`, `Well 2244`, `top joint casing corrosion`, and `466,550` stay out of unpaid responses.

`data/phmsa-cop/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export PHMSA_COP_DIR=$HOME/projects/mcp-proxy/data/phmsa-cop
PHMSA_COP_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/phmsa-cop PHMSA_COP_LIMIT=5 npm run collect:phmsa-cop
```
