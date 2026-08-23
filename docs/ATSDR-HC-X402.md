# ATSDR PHA / Health Consultation text — x402 door

Official ATSDR **PHA / Health Consultation TEXT** extracted with `pdftotext` from PDFs on `atsdr.cdc.gov/HAC/pha/{site}/{file}-508.pdf`. Does not invent consultation text. Company/institution sites only. Not people. Not the state listing HTML. Not the 2-page factsheet teaser. Not `/superfund-rods`. Not `/fsis-hmsa`. Not Charity Commission. Not a stub.

**Prep only. Do not list on well-known / OpenAPI / llms.txt / shop catalog.** Unpaid `GET /atsdr-hc` is HTTP 402.

v1 seeds **5** official 2025–2026 ATSDR-authored company/institution consultations. Required lead is Sterigenics LLC Cobb County Final HC 18 Aug 2026 (`sterigenics-smyrna-eto`). Family: NASA Wallops PFAS (`nasa-wallops-pfas`), Former Fort Ord Army Base (`former-fort-ord`; official path `FormerFordOrd`), Jard Company, Inc. (`jard-company`), City of Bristol / Bristol Quarry Landfill (`bristol-quarry-landfill`). Skip people. Skip factsheets.

`atsdr.cdc.gov` 403s bare curl. Collector must be **wget + full browser UA**.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /atsdr-hc` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /atsdr-hc/manifest.json` | free | HTTP 200 site/company / date / official PDF URL (no consultation body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing (teaser only): https://wwwn.cdc.gov/TSP/PHA/PHAListing.aspx
- Official PDFs: `https://www.atsdr.cdc.gov/HAC/pha/{site}/{file}-508.pdf`
- Required seed: Sterigenics LLC — Final HC 18 Aug 2026 — https://www.atsdr.cdc.gov/HAC/pha/Sterigenics/SmyrnaEtO-508.pdf
- License: **17 U.S.C. § 105** (ATSDR / CDC / HHS federal). Sold body is ATSDR-authored TEXT only.

Free manifest is site/company / date / sourceUrl only. Sold-body needles such as `lifetime excess risk`, `not statistically greater`, and `110000355963` stay out of unpaid responses. Listing/factsheet HTML may mention Sterigenics LLC — that is the index, not the sold body.

`data/atsdr-hc/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export ATSDR_HC_DIR=$HOME/projects/mcp-proxy/data/atsdr-hc
ATSDR_HC_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/atsdr-hc ATSDR_HC_LIMIT=5 npm run collect:atsdr-hc
```
