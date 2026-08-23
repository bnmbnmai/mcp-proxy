# California Water Boards ACL order text — x402 door

Official California Water Boards **ACL order TEXT** (stipulated / hearing / MMP-as-ACL) extracted with `pdftotext` from PDFs on `waterboards.ca.gov/{region}/board_decisions/adopted_orders/{year}/`. Does not invent order text. Company/institution only. Not people. Not the discretionary-ACL table + transmittal. Not CIWQS / data.ca.gov 32-col index. Not ECHO summaries. Not `/superfund-rods`. Not `/atsdr-hc`. Not a stub.

**Prep only. Do not list on well-known / OpenAPI / llms.txt / shop catalog.** Unpaid `GET /waterboards-acl` is HTTP 402.

v1 seeds **5** official 2025–2026 company/institution ACL orders. Required lead is Goleta West Sanitary District R3-2026-0023, 27 Feb 2026 (`goleta-r3-2026-0023`). Family: City of Watsonville MMP-as-ACL (`watsonville-r3-2026-0033`), Baldwin & Sons, Inc. et al. hearing ACL (`baldwin-r9-2026-0063`), Granite Rock Company MMP-as-ACL (`granite-rock-r3-2025-0051`), Moss Landing Power Company, LLC MMP-as-ACL (`moss-landing-r3-2026-0037`). Skip people. Skip transmittal letters (`*-letter.pdf`).

`waterboards.ca.gov` sits behind Imperva. Collector is **wget + full browser UA**.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /waterboards-acl` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /waterboards-acl/manifest.json` | free | HTTP 200 entity / order number / date / official PDF URL (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing (teaser only): https://www.waterboards.ca.gov/water_issues/programs/enforcement/orders_actions.html
- Official PDFs: `https://www.waterboards.ca.gov/{region}/board_decisions/adopted_orders/{year}/{file}.pdf`
- Required seed: Goleta West Sanitary District — stipulated ACL 27 Feb 2026 — https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2026/2026-0023-goleta-west-aclo.pdf
- License: **public domain** (https://www.waterboards.ca.gov/conditions_of_use.html — “distributed or copied as permitted by law”). Photo / unique branding / official seal carve-out only. Not CDI/TDI NC.

Free manifest is entity / order number / date / sourceUrl only. Sold-body needles such as `$2/gallon`, `1,070,696`, `1,713,114`, `1,549,002`, and `10,716,960` stay out of unpaid responses. The table may show Goleta / R3-2026-0023 / $1,551,145 — that is the index, not the sold body.

`data/waterboards-acl/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export WATERBOARDS_ACL_DIR=$HOME/projects/mcp-proxy/data/waterboards-acl
WATERBOARDS_ACL_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/waterboards-acl WATERBOARDS_ACL_LIMIT=5 npm run collect:waterboards-acl
```
