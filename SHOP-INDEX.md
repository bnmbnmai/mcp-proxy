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
| `/firm-check?q=` | Free firm-name search across official caches. HTTP 200. Names the door and the `?id=` or page to buy ($0.02 one text / $0.05 page or table) | [https://ticks.bnm.farm/firm-check?q=](https://ticks.bnm.farm/firm-check?q=) |

## Live paid GETs

Same order as live [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402). Tables: **$0.05** = entire current table. Mariners: **$0.05** = this week's LNM. Body doors: free search, then **$0.02** one official text (`?id=`) or **$0.05** newest 10 (older page `?before=`). CSB / HHS-OIG: **$0.05** one official PDF.

| Path | Bag | Price | Search |
| --- | --- | --- | --- |
| `/ticks` | USDA farm market prices (hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail). Idaho / PNW barns are example geography inside the table, not the SKU. Not forecasts, not private barn deals, not water. Entire current table | $0.05 | [manifest.json](https://ticks.bnm.farm/manifest.json) |
| `/import-alerts` | FDA Import Alerts / DWPE firm-product snapshot. Entire current table | $0.05 | [firm-check?q=](https://ticks.bnm.farm/firm-check?q=) · [manifest.json](https://ticks.bnm.farm/import-alerts/manifest.json) |
| `/mariners` | USCG D13 / Northwest Local Notice to Mariners. This week's LNM | $0.05 | [manifest.json?q=](https://ticks.bnm.farm/mariners/manifest.json?q=) |
| `/mariners-d11` | USCG D11 / Southwest Local Notice to Mariners. This week's LNM | $0.05 | [manifest.json?q=](https://ticks.bnm.farm/mariners-d11/manifest.json?q=) |
| `/mariners-d7` | USCG D7 / Southeast Local Notice to Mariners. This week's LNM | $0.05 | [manifest.json?q=](https://ticks.bnm.farm/mariners-d7/manifest.json?q=) |
| `/mariners-d8` | USCG D8 / Gulf Local Notice to Mariners. This week's LNM | $0.05 | [manifest.json?q=](https://ticks.bnm.farm/mariners-d8/manifest.json?q=) |
| `/mariners-d1` | USCG D1 / Northeast Local Notice to Mariners. This week's LNM | $0.05 | [manifest.json?q=](https://ticks.bnm.farm/mariners-d1/manifest.json?q=) |
| `/mariners-d5` | USCG D5 / Mid-Atlantic Local Notice to Mariners. This week's LNM | $0.05 | [manifest.json?q=](https://ticks.bnm.farm/mariners-d5/manifest.json?q=) |
| `/mariners-d9` | USCG D9 / Great Lakes Local Notice to Mariners. This week's LNM | $0.05 | [manifest.json?q=](https://ticks.bnm.farm/mariners-d9/manifest.json?q=) |
| `/mariners-d14` | USCG D14 / Pacific Local Notice to Mariners. This week's LNM | $0.05 | [manifest.json?q=](https://ticks.bnm.farm/mariners-d14/manifest.json?q=) |
| `/mariners-d17` | USCG D17 / Alaska Local Notice to Mariners. This week's LNM | $0.05 | [manifest.json?q=](https://ticks.bnm.farm/mariners-d17/manifest.json?q=) |
| `/warning-letters` | FDA warning-letter bodies (firm, date, subject, full letter text). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/warning-letters/manifest.json?q=) |
| `/untitled-letters` | FDA Untitled Letter text (CDER OPDP + CBER promo PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/untitled-letters/manifest.json?q=) |
| `/awa` | USDA APHIS AWA inspection-report observation text (official per-report PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/awa/manifest.json?q=) |
| `/swisspar` | Swissmedic first-authorisation SwissPAR evaluation text (official per-product PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/swisspar/manifest.json?q=) |
| `/pcac` | FDA PCAC 503A briefing-memo evaluation text (official per-substance PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/pcac/manifest.json?q=) |
| `/ftc-wl` | FTC BCP warning-letter text (official per-letter PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ftc-wl/manifest.json?q=) |
| `/cfpb-orders` | CFPB consent-order / administrative-order text (official per-order PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/cfpb-orders/manifest.json?q=) |
| `/occ-cd` | OCC institution C&D / consent-order text (official per-order PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/occ-cd/manifest.json?q=) |
| `/fdic-orders` | FDIC institution consent-order / C&D text (official per-order PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fdic-orders/manifest.json?q=) |
| `/frb-orders` | FRB institution C&D / written-agreement / PCA text (official per-order PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/frb-orders/manifest.json?q=) |
| `/ncua-orders` | NCUA institution consent C&D text (official per-order HTML). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ncua-orders/manifest.json?q=) |
| `/fincen-orders` | FinCEN institution consent-order text (official per-order PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fincen-orders/manifest.json?q=) |
| `/ferc-orders` | FERC institution stipulation-and-consent text (official cms.ferc.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ferc-orders/manifest.json?q=) |
| `/ofac-orders` | OFAC institution enforcement-release text (official ofac.treasury.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ofac-orders/manifest.json?q=) |
| `/bis-orders` | BIS institution charging-letter / order text (official bis.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/bis-orders/manifest.json?q=) |
| `/cftc-orders` | CFTC institution enforcement-order / settlement text (official cftc.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/cftc-orders/manifest.json?q=) |
| `/fifra-orders` | EPA FIFRA institution order / consent text (official yosemite.epa.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fifra-orders/manifest.json?q=) |
| `/denovo-orders` | FDA De Novo classification-order text (official accessdata.fda.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/denovo-orders/manifest.json?q=) |
| `/ttb-oic` | TTB Offer in Compromise text (official ttb.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ttb-oic/manifest.json?q=) |
| `/air-letters` | USDA APHIS AIR confirmation-letter text (official direct.aphis.usda.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/air-letters/manifest.json?q=) |
| `/superfund-rods` | EPA Superfund Record of Decision and Five-Year Review text (official semspub.epa.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/superfund-rods/manifest.json?q=) |
| `/ico-mpn` | ICO Monetary Penalty Notice text (official ico.org.uk PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ico-mpn/manifest.json?q=) |
| `/cma-ca98` | UK CMA CA98 infringement-decision text (official assets.publishing.service.gov.uk PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/cma-ca98/manifest.json?q=) |
| `/ema-referrals` | EMA human-medicine referral procedure text (official ema.europa.eu English PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ema-referrals/manifest.json?q=) |
| `/cder-reviews` | FDA CDER Integrated Review text (official accessdata.fda.gov Drugs@FDA PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/cder-reviews/manifest.json?q=) |
| `/npdes-permits` | EPA-issued individual NPDES permit text (official epa.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/npdes-permits/manifest.json?q=) |
| `/ofsted-inspections` | Ofsted school / provider inspection-report text (official files.ofsted.gov.uk PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ofsted-inspections/manifest.json?q=) |
| `/ofwat-enforcement` | Ofwat Water Industry Act 1991 enforcement-notice text (official ofwat.gov.uk PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ofwat-enforcement/manifest.json?q=) |
| `/ofgem-enforcement` | Ofgem enforcement-notice text (official ofgem.gov.uk PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ofgem-enforcement/manifest.json?q=) |
| `/gain` | USDA FAS GAIN attaché report TEXT (official gain.fas.usda.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/gain/manifest.json?q=) |
| `/orr-enforcement` | ORR Railways Act 1993 s.55 statutory-notice / final-order / investigation-report text (official orr.gov.uk PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/orr-enforcement/manifest.json?q=) |
| `/phmsa-orders` | PHMSA pipeline enforcement-order text (official primis.phmsa.dot.gov PDFs; NOPV PCP/PCO, Final Order, CAO, Consent Order, Decision on Petition). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/phmsa-orders/manifest.json?q=) |
| `/aaib-reports` | UK AAIB investigation-report text (official assets.publishing.service.gov.uk PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/aaib-reports/manifest.json?q=) |
| `/csb-reports` | US CSB final investigation report PDF (official csb.gov/assets PDFs). One official PDF | $0.05 | [manifest.json?q=](https://ticks.bnm.farm/csb-reports/manifest.json?q=) |
| `/hhs-oig-reports` | HHS OIG Audit / Evaluation and VA OIG audit / inspection / review PDFs (official oig.hhs.gov and vaoig.gov). One official PDF | $0.05 | [manifest.json?q=](https://ticks.bnm.farm/hhs-oig-reports/manifest.json?q=) |
| `/eis-reports` | EPA NEPA Environmental Impact Statement text (official CDX e-NEPA EIS document PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/eis-reports/manifest.json?q=) |
| `/fsis-humane` | USDA FSIS humane-handling enforcement letter text (official fsis.usda.gov NOS / NOIE / deferral / abeyance / reinstatement PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fsis-humane/manifest.json?q=) |
| `/epa-cafo` | EPA Part 22 CAFO / ESA administrative penalty letter text (official yosemite.epa.gov and regional epa.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/epa-cafo/manifest.json?q=) |
| `/fmshrc-orders` | FMSHRC ALJ + Commission Decision/Order text (official fmshrc.gov PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fmshrc-orders/manifest.json?q=) |
| `/bsee-reports` | BSEE District Accident Investigation Report text (official bsee.gov district-investigation PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/bsee-reports/manifest.json?q=) |
| `/oshrc-orders` | OSHRC ALJ Decision/Order + Commission Final Order text (official oshrc.gov PDF/HTML caches). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/oshrc-orders/manifest.json?q=) |
| `/epa-alj` | EPA OALJ Initial Decision and Order + ALJ Order text (official yosemite.epa.gov/oarm/alj PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/epa-alj/manifest.json?q=) |
| `/epa-eab` | EPA EAB Unpublished Final Order / Board Order text (official yosemite.epa.gov/oa/EAB_Web_Docket.nsf PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/epa-eab/manifest.json?q=) |
| `/faa-civil-penalty` | FAA Civil Penalty Appeals Administrator Order text (official drs.faa.gov CIVIL_PENALTY_APPEALS PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/faa-civil-penalty/manifest.json?q=) |
| `/stb-decisions` | STB Board Decision / Order text (official dcms-external.s3.amazonaws.com DCMS PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/stb-decisions/manifest.json?q=) |
| `/oalj-decisions` | DOL OALJ / BALCA / ARB Decision and Order text (official oalj.dol.gov and dol.gov/sites OALJ ARB PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/oalj-decisions/manifest.json?q=) |
| `/fmc-orders` | FMC Reading Room Initial Decision / Commission Order text (official www2.fmc.gov/readingroom PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/fmc-orders/manifest.json?q=) |
| `/ftc-orders` | FTC cases-proceedings ALJ Decision / Commission Decision and Order text (official ftc.gov/system/files/ftc_gov/pdf PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/ftc-orders/manifest.json?q=) |
| `/form-483` | FDA Form 483 inspectional observation bodies (posted OII FOIA PDFs). Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/form-483/manifest.json?q=) |
| `/gmp` | Health Canada Drug GMP report-card observation text + C.02 cites. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/gmp/manifest.json?q=) |
| `/gmp-md` | Health Canada medical-device report-card observation text + MDR cites. Newest 10 official texts | $0.02 / $0.05 | [manifest.json?q=](https://ticks.bnm.farm/gmp-md/manifest.json?q=) |

Re-read live well-known before assuming a new door.
