# BNM Data Shop — live door index

Public, agent-facing list of **live** paid GETs only. Checked against production on 2026-08-23. Do not treat open door PRs in this repo as live.

## Start here

- Shop: [https://bnm.farm/](https://bnm.farm/)
- Paid host: [https://ticks.bnm.farm](https://ticks.bnm.farm)
- Discovery: [https://ticks.bnm.farm/.well-known/x402](https://ticks.bnm.farm/.well-known/x402)
- OpenAPI: [https://ticks.bnm.farm/openapi.json](https://ticks.bnm.farm/openapi.json)
- llms.txt: [https://ticks.bnm.farm/llms.txt](https://ticks.bnm.farm/llms.txt)
- Ticks manifest: [https://ticks.bnm.farm/manifest.json](https://ticks.bnm.farm/manifest.json)

payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · Base (`eip155:8453`) · USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

Official public data caches (PDF/HTML sources), returned as JSON after x402. Not free-JSON wraps. Unpaid GET on a paid path returns HTTP 402. No API key. No request body.

**32 paid GETs.** `$0.02` for `/ticks`. `$0.05` for every other live paid GET.

## Live paid GETs

Rows match the live well-known resource list and OpenAPI `x-payment-info` prices. One-line copy is from live `llms.txt`.

| Path | What you get | Price | Free manifest |
| --- | --- | --- | --- |
| `/ticks` | Idaho + PNW market ticks (USDA AMS, Idaho grain, WD1 $/AF). Paid JSON keeps `ticks[]` and adds `records[]` + `asOf` for agent diffs | $0.02 | [manifest.json](https://ticks.bnm.farm/manifest.json) |
| `/import-alerts` | FDA Import Alerts / DWPE firm-product snapshot | $0.05 | [import-alerts/manifest.json](https://ticks.bnm.farm/import-alerts/manifest.json) |
| `/mariners` | USCG D13 / Northwest Local Notice to Mariners | $0.05 | [mariners/manifest.json](https://ticks.bnm.farm/mariners/manifest.json) |
| `/mariners-d11` | USCG D11 / Southwest Local Notice to Mariners | $0.05 | [mariners-d11/manifest.json](https://ticks.bnm.farm/mariners-d11/manifest.json) |
| `/mariners-d7` | USCG D7 / Southeast Local Notice to Mariners | $0.05 | [mariners-d7/manifest.json](https://ticks.bnm.farm/mariners-d7/manifest.json) |
| `/mariners-d8` | USCG D8 / Gulf Local Notice to Mariners | $0.05 | [mariners-d8/manifest.json](https://ticks.bnm.farm/mariners-d8/manifest.json) |
| `/warning-letters` | FDA warning-letter bodies (firm, date, subject, full letter text). Paid JSON keeps `letters[]` and adds `records[]` + `asOf` for agent diffs | $0.05 | [warning-letters/manifest.json](https://ticks.bnm.farm/warning-letters/manifest.json) |
| `/untitled-letters` | FDA Untitled Letter text (CDER OPDP + CBER promo PDFs) | $0.05 | [untitled-letters/manifest.json](https://ticks.bnm.farm/untitled-letters/manifest.json) |
| `/awa` | USDA APHIS AWA inspection-report observation text (official per-report PDFs) | $0.05 | [awa/manifest.json](https://ticks.bnm.farm/awa/manifest.json) |
| `/swisspar` | Swissmedic first-authorisation SwissPAR evaluation text (official per-product PDFs) | $0.05 | [swisspar/manifest.json](https://ticks.bnm.farm/swisspar/manifest.json) |
| `/pcac` | FDA PCAC 503A briefing-memo evaluation text (official per-substance PDFs) | $0.05 | [pcac/manifest.json](https://ticks.bnm.farm/pcac/manifest.json) |
| `/ftc-wl` | FTC BCP warning-letter text (official per-letter PDFs) | $0.05 | [ftc-wl/manifest.json](https://ticks.bnm.farm/ftc-wl/manifest.json) |
| `/cfpb-orders` | CFPB consent-order / administrative-order text (official per-order PDFs) | $0.05 | [cfpb-orders/manifest.json](https://ticks.bnm.farm/cfpb-orders/manifest.json) |
| `/occ-cd` | OCC institution C&D / consent-order text (official per-order PDFs) | $0.05 | [occ-cd/manifest.json](https://ticks.bnm.farm/occ-cd/manifest.json) |
| `/fdic-orders` | FDIC institution consent-order / C&D text (official per-order PDFs) | $0.05 | [fdic-orders/manifest.json](https://ticks.bnm.farm/fdic-orders/manifest.json) |
| `/frb-orders` | FRB institution C&D / written-agreement / PCA text (official per-order PDFs) | $0.05 | [frb-orders/manifest.json](https://ticks.bnm.farm/frb-orders/manifest.json) |
| `/ncua-orders` | NCUA institution consent C&D text (official per-order HTML) | $0.05 | [ncua-orders/manifest.json](https://ticks.bnm.farm/ncua-orders/manifest.json) |
| `/fincen-orders` | FinCEN institution consent-order text (official per-order PDFs) | $0.05 | [fincen-orders/manifest.json](https://ticks.bnm.farm/fincen-orders/manifest.json) |
| `/ferc-orders` | FERC institution stipulation-and-consent text (official cms.ferc.gov PDFs) | $0.05 | [ferc-orders/manifest.json](https://ticks.bnm.farm/ferc-orders/manifest.json) |
| `/ofac-orders` | OFAC institution enforcement-release text (official ofac.treasury.gov PDFs) | $0.05 | [ofac-orders/manifest.json](https://ticks.bnm.farm/ofac-orders/manifest.json) |
| `/bis-orders` | BIS institution charging-letter / order text (official bis.gov PDFs) | $0.05 | [bis-orders/manifest.json](https://ticks.bnm.farm/bis-orders/manifest.json) |
| `/cftc-orders` | CFTC institution enforcement-order / settlement text (official cftc.gov PDFs) | $0.05 | [cftc-orders/manifest.json](https://ticks.bnm.farm/cftc-orders/manifest.json) |
| `/fifra-orders` | EPA FIFRA institution order / consent text (official yosemite.epa.gov PDFs) | $0.05 | [fifra-orders/manifest.json](https://ticks.bnm.farm/fifra-orders/manifest.json) |
| `/denovo-orders` | FDA De Novo classification-order text (official accessdata.fda.gov PDFs) | $0.05 | [denovo-orders/manifest.json](https://ticks.bnm.farm/denovo-orders/manifest.json) |
| `/ttb-oic` | TTB Offer in Compromise text (official ttb.gov PDFs) | $0.05 | [ttb-oic/manifest.json](https://ticks.bnm.farm/ttb-oic/manifest.json) |
| `/air-letters` | USDA APHIS AIR confirmation-letter text (official direct.aphis.usda.gov PDFs) | $0.05 | [air-letters/manifest.json](https://ticks.bnm.farm/air-letters/manifest.json) |
| `/superfund-rods` | EPA Superfund Record of Decision text (official semspub.epa.gov PDFs) | $0.05 | [superfund-rods/manifest.json](https://ticks.bnm.farm/superfund-rods/manifest.json) |
| `/ico-mpn` | ICO Monetary Penalty Notice text (official ico.org.uk PDFs) | $0.05 | [ico-mpn/manifest.json](https://ticks.bnm.farm/ico-mpn/manifest.json) |
| `/cma-ca98` | UK CMA CA98 infringement-decision text (official assets.publishing.service.gov.uk PDFs) | $0.05 | [cma-ca98/manifest.json](https://ticks.bnm.farm/cma-ca98/manifest.json) |
| `/form-483` | FDA Form 483 inspectional observation bodies (posted OII FOIA PDFs). Paid JSON keeps `letters[]` and adds `records[]` + `asOf` for agent diffs | $0.05 | [form-483/manifest.json](https://ticks.bnm.farm/form-483/manifest.json) |
| `/gmp` | Health Canada Drug GMP report-card observation text + C.02 cites | $0.05 | [gmp/manifest.json](https://ticks.bnm.farm/gmp/manifest.json) |
| `/gmp-md` | Health Canada medical-device report-card observation text + MDR cites | $0.05 | [gmp-md/manifest.json](https://ticks.bnm.farm/gmp-md/manifest.json) |

Free manifests carry count, ids, and official source URLs. They are not the paid body.

## Free discovery (not paid)

- `GET /` — shop JSON (payTo + the thirty-two products)
- `GET /.well-known/x402` — absolute URLs of the thirty-two paid routes only
- `GET /openapi.json` — OpenAPI 3.1 with `x-payment-info`
- `GET /llms.txt` — short agent guidance
- `GET /mcp` — Streamable HTTP MCP for the same thirty-two paid GETs (not a new SKU)
- `GET /manifest.json` and `GET /{path}/manifest.json` — free per-SKU manifests

## How to buy

Unpaid GET returns HTTP 402 with `PAYMENT-REQUIRED`. After a valid `X-PAYMENT` (USDC on Base to the payTo above), the same URL returns JSON.

## Notes

- Re-read live well-known / OpenAPI before assuming a new door exists.
- Farm is no-spray, not organic-certified.
- This index does not claim Bazaar listing, CDP settlement, or sales volume.
