# DOE Office of Enforcement FNOV / PNOV / enforcement-letter text — x402 door

Official DOE Office of Enforcement **FNOV / PNOV / enforcement-letter TEXT** extracted with `pdftotext` from PDFs on `energy.gov/sites/default/files/{yyyy-mm}/`. Does not invent enforcement text. Company/institution contractors only. Not people. Not the listing + article teasers. Not NRC. Not `/csb-reports`. Not `/waterboards-acl`. Not `/atsdr-hc`. Not `/fsis-hmsa`. Not a stub.

**Prep only. Do not list on well-known / OpenAPI / llms.txt / shop catalog.** Unpaid `GET /doe-nov` is HTTP 402.

v1 seeds **5** official 2024–2026 company/institution FNOV / PNOV / enforcement letters. Required lead is Mid-America Conversion Services, LLC NEA-2026-01 nuclear-safety FNOV, 15 Jan 2026 (`nea-2026-01-mcs`). Family: Harris Rebar Placing, LLC WEA-2024-04 Fermilab FNOV (`wea-2024-04-harris`), Mid-America Conversion Services, LLC WEA-2025-01 toluene FNOV (`wea-2025-01-mcs`), Triad National Security, LLC WEL-2026-01 LANL telehandler enforcement letter (`wel-2026-01-triad`), Engert, LLC WEA-2025-03 ORNL telehandler PNOV (`wea-2025-03-engert`). Skip people. Skip press HTML.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /doe-nov` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /doe-nov/manifest.json` | free | HTTP 200 contractor / docket / date / official PDF URL (no body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing (teaser only): https://www.energy.gov/ea/listings/final-notices-violation
- Official PDFs: `https://www.energy.gov/sites/default/files/{yyyy-mm}/{file}.pdf`
- Required seed: Mid-America Conversion Services, LLC — NEA-2026-01 FNOV 15 Jan 2026 — https://www.energy.gov/sites/default/files/2026-01/Final%20Notice%20of%20Violation%2C%20Mid-America%20Conversion%20Services%2C%20LLC.pdf
- License: **17 U.S.C. § 105 + energy.gov public-domain notice** (https://www.energy.gov/web-policies — “Government information at DOE websites is in the public domain… freely distributed and copied”; attribution requested). No NC / no-sell.

Free manifest is contractor / docket / date / sourceUrl only. Sold-body needles such as `$131,000`, `830.122`, and `crane X-0-CHS-CN-002` stay out of unpaid responses. The card may show MCS / NEA-2026-01 — that is the index, not the sold body.

`data/doe-nov/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export DOE_NOV_DIR=$HOME/projects/mcp-proxy/data/doe-nov
DOE_NOV_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/doe-nov DOE_NOV_LIMIT=5 npm run collect:doe-nov
```
