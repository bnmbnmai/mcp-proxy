# NLRB Board Decision / Decision and Order text — x402 door

Official **NLRB Board Decision / Decision and Order / Supplemental Decision and Order TEXT** extracted with `pdftotext` from slip-opinion PDFs on `apps.nlrb.gov/link/document.aspx/{id}`. Does not invent decision text. NLRB-authored company/institution NLRA ULP / representation Decision and Order only. Not people. Not the Board Decisions listing. Not the case-page docket / allegation-code teaser. Not case-search CSV. Not CiteNet. Not ALJ-only. Not a stub.

**Prep only. Do not list on well-known / OpenAPI / llms.txt / shop catalog.** Unpaid `GET /nlrb-bd` is HTTP 402.

v1 seeds **5** official 2025–2026 company/institution Board Decisions. Required lead is Starbucks Corporation, 19–CA–295850, 375 NLRB No. 28, Decision and Order 5 Aug 2026 (`starbucks-19-ca-295850`). Family: Rhode Island CVS Pharmacy LLC 01–CA–365034 (`cvs-01-ca-365034`), Overseas Shipholding Group, Inc. 12–CA–386056 (`osg-12-ca-386056`), Ralphs Grocery Company 21–CA–073942 Supplemental Decision and Order (`ralphs-21-ca-073942`), X Factor S2 LLC 31–CA–323348 (`x-factor-31-ca-323348`). Skip people. Skip listing teasers. Skip case-page 8(a) codes. Skip ALJ-only.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /nlrb-bd` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /nlrb-bd/manifest.json` | free | HTTP 200 employer / case number / date / official PDF URL (no body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing (employer + case + date + href only): https://www.nlrb.gov/cases-decisions/decisions/board-decisions
- Official PDFs: `https://apps.nlrb.gov/link/document.aspx/{id}`
- Required seed: Starbucks Corporation — 19–CA–295850, Decision and Order 5 Aug 2026 — https://apps.nlrb.gov/link/document.aspx/09031d45843171e1
- License: **17 U.S.C. § 105**. Official .gov host. Face: “An Agency of the United States Government.”

Free manifest is employer / case number / date / sourceUrl only. Sold-body needles such as `Shift Marketplace`, `we dismiss the complaint`, and `375 NLRB No. 28` stay out of unpaid responses. The card may show Starbucks / 19-CA-295850 — that is the index, not the sold body. Case-page 8(a)(1) codes are not the sold body.

`data/nlrb-bd/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export NLRB_BD_DIR=$HOME/projects/mcp-proxy/data/nlrb-bd
NLRB_BD_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/nlrb-bd NLRB_BD_LIMIT=5 npm run collect:nlrb-bd
```
