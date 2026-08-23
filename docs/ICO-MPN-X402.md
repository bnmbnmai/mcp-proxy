# ICO Monetary Penalty Notice text — x402 door

Official UK ICO **institution/company Monetary Penalty Notice TEXT** extracted from PDFs on `ico.org.uk`. Does not invent notice text. Not people. Not the press/teaser. Not Superfund `/superfund-rods`. Not AIR `/air-letters`. Not TTB `/ttb-oic`. Not De Novo `/denovo-orders`. Not FIFRA `/fifra-orders`. Not CFTC `/cftc-orders`.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /ico-mpn` is HTTP 402.

v1 seeds **5** official institution/company MPN PDFs. Required seed is Reddit, Inc. (`reddit-mpn-20260223`, 23 Feb 2026). Family: MediaLab.AI, Inc. (`medialab-20260204`), LastPass UK Ltd (`lastpass-uk-ltd`), Capita plc (`capita-plc`), South Staffordshire Plc (`south-staffordshire-plc`). Skip people. Skip the media-centre teaser.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /ico-mpn` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /ico-mpn/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no MPN body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://ico.org.uk/action-weve-taken/enforcement/?type=monetary-penalties
- Official PDFs: `https://ico.org.uk/media2/{id}/{filename}.pdf`
- Required seed: Reddit, Inc. — 23 Feb 2026 — https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf
- License: **OGL v3.0** (ICO website text). Commercial reuse allowed with attribution: Information Commissioner's Office, licensed under the Open Government Licence. Images/logos are not licensed.

Free manifest is institution / docket / date / sourceUrl only. Needles such as `548 Market Street`, `17,573,750`, and `26 September 2025` stay out of unpaid responses.

`data/ico-mpn/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export ICO_MPN_DIR=$HOME/projects/mcp-proxy/data/ico-mpn
ICO_MPN_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/ico-mpn ICO_MPN_LIMIT=5 npm run collect:ico-mpn
```
