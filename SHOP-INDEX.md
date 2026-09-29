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

Unpaid GET on a paid path returns HTTP 402 JSON with `extensions.bazaar` and `accepts[]`. After `X-PAYMENT`, the same URL returns JSON. Unpaid 402 `accepts[].extra` names `searchUrl`, `oneDocPath`, `priceAtomic`, `pagePriceAtomic`, `pageDefault`, `tableWhole`, `firmCheckUrl`, `sampleUrl`. `extra.name` stays USD Coin. CDP Bazaar is a separate catalog and can list fewer doors than this index. The paid list is [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402).

MCP at `/mcp` is generated from live [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402) (one paid tool per paid resource) plus free `search` and `firm-check`. `/sample` is the free 3-row slice, not an MCP tool and not a SKU.

## Free (not paid)

| Path | Bag | URL |
| --- | --- | --- |
| `/sample` | Free 3-row /ticks slice. HTTP 200. Not the whole $0.05 table | [https://ticks.bnm.farm/sample](https://ticks.bnm.farm/sample) |
| `/firm-check?q=` | Free firm-name search across official caches. HTTP 200. Names the door and the `?id=` or page to buy ($0.02 one text / $0.05 page or table) | [https://ticks.bnm.farm/firm-check?q=](https://ticks.bnm.farm/firm-check?q=) |

## Live paid GETs

Same order as live [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402). Tables: **$0.05** = entire current table. Mariners: **$0.05** = this week's LNM. Body doors: free search, then **$0.02** one official text (`?id=`) or **$0.05** newest 10 (older page `?before=`).

| Path | Bag | Price | Search |
| --- | --- | --- | --- |
| `/ticks` | USDA farm market prices (hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail). Idaho / PNW barns are example geography inside the table, not the SKU. Not forecasts, not private barn deals, not water. Entire current table | $0.05 | [manifest.json](https://ticks.bnm.farm/manifest.json) |
| `/import-alerts` | FDA Import Alerts / DWPE firm-product snapshot. Entire current table | $0.05 | [firm-check?q=](https://ticks.bnm.farm/firm-check?q=) · [manifest.json](https://ticks.bnm.farm/import-alerts/manifest.json) |
| `/mariners` | USCG D13 / Northwest this week's LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners/manifest.json) |
| `/mariners-d11` | USCG D11 / Southwest this week's LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners-d11/manifest.json) |
| `/mariners-d7` | USCG D7 / Southeast this week's LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners-d7/manifest.json) |
| `/mariners-d8` | USCG D8 / Gulf this week's LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners-d8/manifest.json) |
| `/mariners-d1` | USCG D1 / Northeast LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners-d1/manifest.json) |
| `/mariners-d5` | USCG D5 / Mid-Atlantic LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners-d5/manifest.json) |
| `/mariners-d9` | USCG D9 / Great Lakes LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners-d9/manifest.json) |
| `/mariners-d14` | USCG D14 / Pacific LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners-d14/manifest.json) |
| `/mariners-d17` | USCG D17 / Alaska LNM | $0.05 | [manifest.json](https://ticks.bnm.farm/mariners-d17/manifest.json) |
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
| `/ofwat-enforcement` | Ofwat Water Industry Act 1991 enforcement-notice / final-decision / s.19 undertakings text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ofwat-enforcement/manifest.json?q=) |
| `/ofgem-enforcement` | Ofgem enforcement-notice / s.27A penalty-proposal / confirmed and provisional-order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ofgem-enforcement/manifest.json?q=) |
| `/gain` | USDA FAS GAIN attaché report TEXT. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/gain/manifest.json?q=) |
| `/orr-enforcement` | ORR Railways Act 1993 s.55 statutory-notice / final-order / investigation-report text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/orr-enforcement/manifest.json?q=) |
| `/phmsa-orders` | PHMSA pipeline enforcement-order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/phmsa-orders/manifest.json?q=) |
| `/aaib-reports` | UK AAIB investigation-report text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/aaib-reports/manifest.json?q=) |
| `/csb-reports` | US CSB final investigation report PDFs. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/csb-reports/manifest.json?q=) |
| `/hhs-oig-reports` | HHS OIG audit and evaluation report PDFs. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/hhs-oig-reports/manifest.json?q=) |
| `/eis-reports` | EPA NEPA Environmental Impact Statement PDFs. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/eis-reports/manifest.json?q=) |
| `/fsis-humane` | USDA FSIS humane-handling enforcement letter text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fsis-humane/manifest.json?q=) |
| `/epa-cafo` | EPA Part 22 CAFO / ESA administrative penalty letter text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/epa-cafo/manifest.json?q=) |
| `/fmshrc-orders` | FMSHRC ALJ + Commission Decision/Order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fmshrc-orders/manifest.json?q=) |
| `/bsee-reports` | BSEE District Accident Investigation Report text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/bsee-reports/manifest.json?q=) |
| `/oshrc-orders` | OSHRC ALJ Decision/Order + Commission Final Order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/oshrc-orders/manifest.json?q=) |
| `/epa-alj` | EPA OALJ Initial Decision and Order + ALJ Order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/epa-alj/manifest.json?q=) |
| `/epa-eab` | EPA EAB Unpublished Final Order / Board Order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/epa-eab/manifest.json?q=) |
| `/faa-civil-penalty` | FAA Civil Penalty Appeals Administrator Order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/faa-civil-penalty/manifest.json?q=) |
| `/stb-decisions` | STB Board Decision / Order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/stb-decisions/manifest.json?q=) |
| `/oalj-decisions` | DOL OALJ / BALCA / ARB Decision and Order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/oalj-decisions/manifest.json?q=) |
| `/fmc-orders` | FMC Initial Decision / Commission Order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fmc-orders/manifest.json?q=) |
| `/ftc-orders` | FTC ALJ Decision / Commission Decision and Order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ftc-orders/manifest.json?q=) |
| `/nlrb-decisions` | NLRB published Board Decision text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/nlrb-decisions/manifest.json?q=) |
| `/flra-decisions` | FLRA Authority Decision text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/flra-decisions/manifest.json?q=) |
| `/ecab-decisions` | ECAB FECA Decision and Order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ecab-decisions/manifest.json?q=) |
| `/fcc-eb-orders` | FCC Enforcement Bureau order text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fcc-eb-orders/manifest.json?q=) |
| `/nmb-determinations` | NMB representation determination text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/nmb-determinations/manifest.json?q=) |
| `/eeoc-appellate` | EEOC OFS appellate decision text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/eeoc-appellate/manifest.json?q=) |
| `/ttab-decisions` | USPTO TTAB reading-room decision text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ttab-decisions/manifest.json?q=) |
| `/ibla-decisions` | DOI IBLA precedential decision text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ibla-decisions/manifest.json?q=) |
| `/ccb-determinations` | Copyright Claims Board Final Determination text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ccb-determinations/manifest.json?q=) |
| `/uscg-alj-decisions` | USCG ALJ Suspension and Revocation Decisions and Orders text. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/uscg-alj-decisions/manifest.json?q=) |
| `/form-483` | FDA Form 483 inspectional observation bodies. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/form-483/manifest.json?q=) |
| `/gmp` | Health Canada Drug GMP report-card observation text + C.02 cites. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/gmp/manifest.json?q=) |
| `/gmp-md` | Health Canada medical-device report-card observation text + MDR cites. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/gmp-md/manifest.json?q=) |

Re-read live well-known before assuming a new door.
