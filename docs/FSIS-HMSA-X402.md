# FSIS HMSA humane-handling enforcement letter text — x402 door

Official USDA FSIS **establishment/company humane-handling enforcement letter TEXT** (NOIE / NOS / LOD / NOSHA) extracted with `pdftotext` / OCR from PDFs on `fsis.usda.gov/sites/default/files/media_file/documents/`. Pattern `M{est}-{NOIE|NOS|LOD|NOSHA}-{MMDDYYYY}.pdf`. Does not invent letter text. Not people. Not the table/index. Not `/awa`. Not DILA CNIL. Not ICO `/ico-mpn`. Not PHMSA `/phmsa-cop`. Not FMC `/fmc-orders`. Not a stub.

**Prep only. Do not list on well-known / OpenAPI / llms.txt / shop catalog.** Unpaid `GET /fsis-hmsa` is HTTP 402.

v1 seeds **5** official 2026 establishment letters. Required lead is Collagen Solutions (US) LLC Est. M40110 NOIE 30 Jul 2026 (`m40110-noie-07302026`). Family: same establishment LOD (`m40110-lod-08052026`), Western Valley Meat Company Est. M354 NOIE (`m354-noie-03232026`), Maple Brooke Packing Est. M1745 NOS (`m1745-nos-07072026`), Whalen's Meat Packing LLC Est. M2560 NOSHA (`m2560-nosha-07282026`). Skip people.

`fsis.usda.gov` is behind Akamai. Collector must be **wget + Safari UA**, not curl. Seed letters may be scans — `pdftotext` can be empty; OCR the sold body if needed.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /fsis-hmsa` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /fsis-hmsa/manifest.json` | free | HTTP 200 establishment / letter type / date / official PDF URL (no letter body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.fsis.usda.gov/inspection/regulatory-enforcement/humane-handling-enforcement
- Official PDFs: `https://www.fsis.usda.gov/sites/default/files/media_file/documents/M{est}-{NOIE|NOS|LOD|NOSHA}-{MMDDYYYY}.pdf`
- Required seed: M40110 NOIE — 30 Jul 2026 — https://www.fsis.usda.gov/sites/default/files/media_file/documents/M40110-NOIE-07302026.pdf
- License: **17 U.S.C. § 105** (USDA federal). Sold body is FSIS-authored TEXT only.

Free manifest is establishment / letter type / date / sourceUrl only. Sold-body needles such as `B-45131621`, `313.30(a)(4)`, and `Consciousness on the Rail` stay out of unpaid responses. Table HTML may mention M40110 / Collagen Solutions — that is the index, not the sold body.

`data/fsis-hmsa/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export FSIS_HMSA_DIR=$HOME/projects/mcp-proxy/data/fsis-hmsa
FSIS_HMSA_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/fsis-hmsa FSIS_HMSA_LIMIT=5 npm run collect:fsis-hmsa
```
