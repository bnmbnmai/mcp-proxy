# BNM Data Shop — live door index

BNM Data Shop — official public-data x402 GETs at [ticks.bnm.farm](https://ticks.bnm.farm). Live count is [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402), not a hardcoded door number.

- Shop: [https://bnm.farm/](https://bnm.farm/)
- Paid host: [https://ticks.bnm.farm](https://ticks.bnm.farm)
- Discovery: [https://ticks.bnm.farm/.well-known/x402](https://ticks.bnm.farm/.well-known/x402)
- OpenAPI: [https://ticks.bnm.farm/openapi.json](https://ticks.bnm.farm/openapi.json)
- llms.txt: [https://ticks.bnm.farm/llms.txt](https://ticks.bnm.farm/llms.txt)
- MCP: [https://ticks.bnm.farm/mcp](https://ticks.bnm.farm/mcp)
- Shop JSON: [https://ticks.bnm.farm/](https://ticks.bnm.farm/)

payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · Base (`eip155:8453`) · USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

Unpaid GET on a paid path returns HTTP 402. After `X-PAYMENT`, the same URL returns JSON. Unpaid 402 `accepts[].extra` names `searchUrl`, `oneDocPath`, `priceAtomic`, `pagePriceAtomic`, `pageDefault`, `tableWhole`, `firmCheckUrl`, `sampleUrl`. `extra.name` stays USD Coin.

MCP at `/mcp` is generated from live [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402) (one paid tool per paid resource) plus free `search` and `firm-check`. `/sample` is the free canned-keys GET, not an MCP tool and not a SKU.

## Free (not paid)

| Path | Bag | URL |
| --- | --- | --- |
| `/sample` | Canned paid-JSON keys. HTTP 200 | [https://ticks.bnm.farm/sample](https://ticks.bnm.farm/sample) |
| `/firm-check?q=` | Firm-name search across Form 483, warning letters, and the import-alert table. HTTP 200. Names the door and the `?id=` or page to buy ($0.02 one text / $0.05 page or table) | [https://ticks.bnm.farm/firm-check?q=](https://ticks.bnm.farm/firm-check?q=) |

## Live paid GETs

Same order as live [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402), plus `/orr-enforcement` listed here (first slice; not live until apply). Tables: **$0.05** = entire current table. Mariners: **$0.05** = this week's LNM. Body doors: free search, then **$0.02** one official text (`?id=`) or **$0.05** newest 10 (older page `?before=`).

| Path | Bag | Price | Search |
| --- | --- | --- | --- |
| `/ticks` | US hay, cattle, and grain ticks (USDA AMS nationwide). Entire current table | $0.05 | [manifest.json](https://ticks.bnm.farm/manifest.json) |
| `/import-alerts` | FDA Import Alerts / DWPE firm-product snapshot. Entire current table | $0.05 | [firm-check?q=](https://ticks.bnm.farm/firm-check?q=) · [manifest.json](https://ticks.bnm.farm/import-alerts/manifest.json) |
| `/mariners` | USCG D13 / Northwest this week's LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners/manifest.json) |
| `/mariners-d11` | USCG D11 / Southwest this week's LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners-d11/manifest.json) |
| `/mariners-d7` | USCG D7 / Southeast this week's LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners-d7/manifest.json) |
| `/mariners-d8` | USCG D8 / Gulf this week's LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners-d8/manifest.json) |
| `/warning-letters` | FDA warning-letter bodies. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/warning-letters/manifest.json?q=) |
| `/untitled-letters` | FDA Untitled Letter text (CDER OPDP + CBER promo PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/untitled-letters/manifest.json?q=) |
| `/awa` | USDA APHIS AWA inspection-report observation text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/awa/manifest.json?q=) |
| `/swisspar` | Swissmedic first-authorisation SwissPAR evaluation text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/swisspar/manifest.json?q=) |
| `/pcac` | FDA PCAC 503A briefing-memo evaluation text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/pcac/manifest.json?q=) |
| `/ftc-wl` | FTC BCP warning-letter text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ftc-wl/manifest.json?q=) |
| `/cfpb-orders` | CFPB consent-order / administrative-order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/cfpb-orders/manifest.json?q=) |
| `/occ-cd` | OCC institution C&D / consent-order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/occ-cd/manifest.json?q=) |
| `/fdic-orders` | FDIC institution consent-order / C&D text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fdic-orders/manifest.json?q=) |
| `/frb-orders` | FRB institution C&D / written-agreement / PCA text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/frb-orders/manifest.json?q=) |
| `/ncua-orders` | NCUA institution consent C&D text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ncua-orders/manifest.json?q=) |
| `/fincen-orders` | FinCEN institution consent-order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fincen-orders/manifest.json?q=) |
| `/ferc-orders` | FERC institution stipulation-and-consent text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ferc-orders/manifest.json?q=) |
| `/ofac-orders` | OFAC institution enforcement-release text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ofac-orders/manifest.json?q=) |
| `/bis-orders` | BIS institution charging-letter / order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/bis-orders/manifest.json?q=) |
| `/cftc-orders` | CFTC institution enforcement-order / settlement text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/cftc-orders/manifest.json?q=) |
| `/fifra-orders` | EPA FIFRA institution order / consent text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fifra-orders/manifest.json?q=) |
| `/denovo-orders` | FDA De Novo classification-order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/denovo-orders/manifest.json?q=) |
| `/ttb-oic` | TTB Offer in Compromise text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ttb-oic/manifest.json?q=) |
| `/air-letters` | USDA APHIS AIR confirmation-letter text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/air-letters/manifest.json?q=) |
| `/superfund-rods` | EPA Superfund Record of Decision text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/superfund-rods/manifest.json?q=) |
| `/ico-mpn` | ICO Monetary Penalty Notice text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ico-mpn/manifest.json?q=) |
| `/cma-ca98` | UK CMA CA98 infringement-decision text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/cma-ca98/manifest.json?q=) |
| `/ema-referrals` | EMA human-medicine referral procedure text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ema-referrals/manifest.json?q=) |
| `/cder-reviews` | FDA CDER Integrated Review text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/cder-reviews/manifest.json?q=) |
| `/npdes-permits` | EPA-issued individual NPDES permit text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/npdes-permits/manifest.json?q=) |
| `/ofsted-inspections` | Ofsted school / provider inspection-report text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ofsted-inspections/manifest.json?q=) |
| `/orr-enforcement` | ORR Railways Act 1993 s.55 statutory-notice / final-order / investigation-report text (official orr.gov.uk PDFs, Crown / OGL v3.0). First slice: six harvested texts. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/orr-enforcement/manifest.json?q=) |
| `/form-483` | FDA Form 483 inspectional observation bodies. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/form-483/manifest.json?q=) |
| `/gmp` | Health Canada Drug GMP report-card observation text + C.02 cites. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/gmp/manifest.json?q=) |
| `/gmp-md` | Health Canada medical-device report-card observation text + MDR cites. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/gmp-md/manifest.json?q=) |

Re-read live well-known before assuming a new door.
