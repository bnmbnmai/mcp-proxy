# BNM Data Shop — live door index

Public, agent-facing list of **live** paid GETs only. Re-read live manifests on 2026-08-25. Do not treat open door PRs in this repo as live.

## Start here

- Shop: [https://bnm.farm/](https://bnm.farm/)
- Paid host: [https://ticks.bnm.farm](https://ticks.bnm.farm)
- Discovery: [https://ticks.bnm.farm/.well-known/x402](https://ticks.bnm.farm/.well-known/x402)
- OpenAPI: [https://ticks.bnm.farm/openapi.json](https://ticks.bnm.farm/openapi.json)
- llms.txt: [https://ticks.bnm.farm/llms.txt](https://ticks.bnm.farm/llms.txt)
- Shop JSON: [https://ticks.bnm.farm/](https://ticks.bnm.farm/)
- Ticks manifest: [https://ticks.bnm.farm/manifest.json](https://ticks.bnm.farm/manifest.json)

payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · Base (`eip155:8453`) · USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

Official public data caches (PDF/HTML sources), returned as JSON after x402. Unpaid GET on a paid path returns HTTP 402. No API key. No request body.

**32 paid GETs.** `$0.05` (`50000` atomic) for every live paid GET, including `/ticks`. Table doors (`/ticks`, `/import-alerts`): one GET is the **entire current table**. Extracted-body doors: find a record on the **free index (`?q=`)**; each row names the page/before to pay. One GET is the **newest 100 official texts**, not the entire archive; older pages are another `$0.05` on the same URL. Free indexes list the full catalog. Bag sizes below are live catalog counts.

## Live paid GETs

Rows match the live well-known resource list. One-line copy plus catalog count is what an agent should see on `GET /`, `/llms.txt`, `/openapi.json`, and MCP tools.

| Path | What you get | Paid JSON | Bag | Price | Free manifest |
| --- | --- | --- | ---: | --- | --- |
| `/ticks` | US hay, cattle, and grain ticks (USDA AMS official prints). Cache also has produce, wool, and WD1 water where those series exist. One $0.05 GET returns the entire current table | `ticks[] + history` | 611 ticks | $0.05 | [manifest.json](https://ticks.bnm.farm/manifest.json) |
| `/import-alerts` | FDA Import Alerts / DWPE firm-product snapshot. One $0.05 GET returns the entire current table | `ticks[]` | 18904 rows / 6709 firms | $0.05 | [import-alerts/manifest.json](https://ticks.bnm.farm/import-alerts/manifest.json) |
| `/mariners` | USCG D13 / Northwest Local Notice to Mariners. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `notices[]` | 124 notices | $0.05 | [mariners/manifest.json](https://ticks.bnm.farm/mariners/manifest.json) |
| `/mariners-d11` | USCG D11 / Southwest Local Notice to Mariners. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `notices[]` | 198 notices | $0.05 | [mariners-d11/manifest.json](https://ticks.bnm.farm/mariners-d11/manifest.json) |
| `/mariners-d7` | USCG D7 / Southeast Local Notice to Mariners. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `notices[]` | 1825 notices | $0.05 | [mariners-d7/manifest.json](https://ticks.bnm.farm/mariners-d7/manifest.json) |
| `/mariners-d8` | USCG D8 / Gulf Local Notice to Mariners. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `notices[]` | 1258 notices | $0.05 | [mariners-d8/manifest.json](https://ticks.bnm.farm/mariners-d8/manifest.json) |
| `/warning-letters` | FDA warning-letter bodies (firm, date, subject, full letter text). Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `letters[].body` | 396 letters | $0.05 | [warning-letters/manifest.json](https://ticks.bnm.farm/warning-letters/manifest.json) |
| `/untitled-letters` | FDA Untitled Letter text (CDER OPDP + CBER promo PDFs). Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 119 cards | $0.05 | [untitled-letters/manifest.json](https://ticks.bnm.farm/untitled-letters/manifest.json) |
| `/awa` | USDA APHIS AWA inspection-report observation text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 25 cards | $0.05 | [awa/manifest.json](https://ticks.bnm.farm/awa/manifest.json) |
| `/swisspar` | Swissmedic first-authorisation SwissPAR evaluation text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 37 cards | $0.05 | [swisspar/manifest.json](https://ticks.bnm.farm/swisspar/manifest.json) |
| `/pcac` | FDA PCAC 503A briefing-memo evaluation text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 7 cards | $0.05 | [pcac/manifest.json](https://ticks.bnm.farm/pcac/manifest.json) |
| `/ftc-wl` | FTC BCP warning-letter text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 36 cards | $0.05 | [ftc-wl/manifest.json](https://ticks.bnm.farm/ftc-wl/manifest.json) |
| `/cfpb-orders` | CFPB consent-order / administrative-order text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 37 cards | $0.05 | [cfpb-orders/manifest.json](https://ticks.bnm.farm/cfpb-orders/manifest.json) |
| `/occ-cd` | OCC institution C&D / consent-order text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 10 cards | $0.05 | [occ-cd/manifest.json](https://ticks.bnm.farm/occ-cd/manifest.json) |
| `/fdic-orders` | FDIC institution consent-order / C&D text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 5 cards | $0.05 | [fdic-orders/manifest.json](https://ticks.bnm.farm/fdic-orders/manifest.json) |
| `/frb-orders` | FRB institution C&D / written-agreement / PCA text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 29 cards | $0.05 | [frb-orders/manifest.json](https://ticks.bnm.farm/frb-orders/manifest.json) |
| `/ncua-orders` | NCUA institution consent C&D text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 5 cards | $0.05 | [ncua-orders/manifest.json](https://ticks.bnm.farm/ncua-orders/manifest.json) |
| `/fincen-orders` | FinCEN institution consent-order text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 9 cards | $0.05 | [fincen-orders/manifest.json](https://ticks.bnm.farm/fincen-orders/manifest.json) |
| `/ferc-orders` | FERC institution stipulation-and-consent text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 5 cards | $0.05 | [ferc-orders/manifest.json](https://ticks.bnm.farm/ferc-orders/manifest.json) |
| `/ofac-orders` | OFAC institution enforcement-release text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 25 cards | $0.05 | [ofac-orders/manifest.json](https://ticks.bnm.farm/ofac-orders/manifest.json) |
| `/bis-orders` | BIS institution charging-letter / order text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 22 cards | $0.05 | [bis-orders/manifest.json](https://ticks.bnm.farm/bis-orders/manifest.json) |
| `/cftc-orders` | CFTC institution enforcement-order / settlement text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 7 cards | $0.05 | [cftc-orders/manifest.json](https://ticks.bnm.farm/cftc-orders/manifest.json) |
| `/fifra-orders` | EPA FIFRA institution order / consent text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 5 cards | $0.05 | [fifra-orders/manifest.json](https://ticks.bnm.farm/fifra-orders/manifest.json) |
| `/denovo-orders` | FDA De Novo classification-order text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 24 cards | $0.05 | [denovo-orders/manifest.json](https://ticks.bnm.farm/denovo-orders/manifest.json) |
| `/ttb-oic` | TTB Offer in Compromise text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 25 cards | $0.05 | [ttb-oic/manifest.json](https://ticks.bnm.farm/ttb-oic/manifest.json) |
| `/air-letters` | USDA APHIS AIR confirmation-letter text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 29 cards | $0.05 | [air-letters/manifest.json](https://ticks.bnm.farm/air-letters/manifest.json) |
| `/superfund-rods` | EPA Superfund Record of Decision text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 5 cards | $0.05 | [superfund-rods/manifest.json](https://ticks.bnm.farm/superfund-rods/manifest.json) |
| `/ico-mpn` | ICO Monetary Penalty Notice text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 20 cards | $0.05 | [ico-mpn/manifest.json](https://ticks.bnm.farm/ico-mpn/manifest.json) |
| `/cma-ca98` | UK CMA CA98 infringement-decision text. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 9 cards | $0.05 | [cma-ca98/manifest.json](https://ticks.bnm.farm/cma-ca98/manifest.json) |
| `/form-483` | FDA Form 483 inspectional observation bodies. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `letters[].body` | 314 letters | $0.05 | [form-483/manifest.json](https://ticks.bnm.farm/form-483/manifest.json) |
| `/gmp` | Health Canada Drug GMP report-card observation text + C.02 cites. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 3550 cards | $0.05 | [gmp/manifest.json](https://ticks.bnm.farm/gmp/manifest.json) |
| `/gmp-md` | Health Canada medical-device report-card observation text + MDR cites. Find on free index (?q=); each row names page/before to pay. Newest 100 official texts per GET, not the entire archive; older pages another $0.05 on the same URL | `cards[].body` | 33 cards | $0.05 | [gmp-md/manifest.json](https://ticks.bnm.farm/gmp-md/manifest.json) |

Free manifests carry count, ids, and official source URLs. They are not the paid body.

## Free discovery (not paid)

- `GET /` — shop JSON (payTo + the thirty-two products, each with `description` + `count`)
- `GET /.well-known/x402` — absolute URLs of the thirty-two paid routes only
- `GET /openapi.json` — OpenAPI 3.1 with `x-payment-info` and truthful bag-size copy
- `GET /llms.txt` — short agent guidance (table vs newest-100 bag size)
- `GET /mcp` — Streamable HTTP MCP for the same thirty-two paid GETs
- `GET /manifest.json` and `GET /{path}/manifest.json` — free per-SKU manifests

## How to buy

Find an extracted-body record on that door's free manifest with `?q=`. Each hit names the `page`/`before` to pay. Unpaid GET returns HTTP 402 with `PAYMENT-REQUIRED`. After a valid `X-PAYMENT` (USDC on Base to the payTo above), the same URL returns JSON: the entire current table for `/ticks` and `/import-alerts`, or the newest 100 official texts for extracted-body doors — not the entire archive. Older extracted pages are another `$0.05` on that same URL (`page`/`before`).

## Notes

- Re-read live well-known / OpenAPI / manifests before assuming a new door or a new bag size.
- Live list is the well-known resources only.
- Farm is no-spray, not organic-certified.
- This index does not claim Bazaar listing, CDP settlement, or sales volume.
