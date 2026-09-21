# BNM Data Shop — official public-data x402 GETs at ticks.bnm.farm

Official public data as JSON at [https://ticks.bnm.farm](https://ticks.bnm.farm). Live paid GETs are [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402), not a hardcoded door number. USDC on Base (`eip155:8453`) to `0xf59621FC406D266e18f314Ae18eF0a33b8401004`.

Shop: [https://bnm.farm/](https://bnm.farm/) · Agent brief: [https://ticks.bnm.farm/llms.txt](https://ticks.bnm.farm/llms.txt) · Door list: [SHOP-INDEX.md](./SHOP-INDEX.md)

## Bags and prices

- **Tables** (`GET /ticks`, `GET /import-alerts`) — **$0.05** = the entire current table.
- **Body doors** (the other paid GETs) — free search `GET https://ticks.bnm.farm/{door}/manifest.json?q=` (HTTP 200) returns `id` and the `?id=` URL. Then pay `GET ?id=` (**$0.02**, one official text) or the page (**$0.05**, newest 10 official texts; older page `?before=`, another $0.05).

Unpaid GET on a paid path returns HTTP 402 with `PAYMENT-REQUIRED`. No request body.

## Free (not SKUs)

- `GET /sample` — canned paid-JSON keys. HTTP 200.
- `GET /firm-check?q=` — firm-name search across official caches. HTTP 200. Names the door and the `?id=` or page to buy.
- `GET /{door}/manifest.json?q=` — free index/search on every extracted-body door.
- `GET /.well-known/x402` — the live paid URLs.
- `GET /openapi.json` — OpenAPI 3.1.
- `GET /llms.txt` — short agent guidance.
- `GET /` — shop JSON (payTo + the live products).

## MCP

`GET/POST https://ticks.bnm.farm/mcp` — Streamable HTTP. One tool per live paid GET, plus free `search`, free `firm-check`, paid `get-one` ($0.02), paid `get-page` ($0.05). Tools are generated from live well-known.

```
npx -y mcp-remote https://ticks.bnm.farm/mcp
```

## Paid doors

Same order as live [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402). Snapshot below was 62 paid GETs. Re-read live well-known before assuming a new door.

| Path | Bag | Price |
| --- | --- | --- |
| `/ticks` | USDA farm market prices (hay, cattle, grain, dairy, hogs, produce, eggs, cold storage, poultry, cotton, grocery retail). Idaho / PNW barns are example geography inside the table, not the SKU. Not forecasts, not private barn deals, not water. Entire current table | $0.05 |
| `/import-alerts` | FDA Import Alerts / DWPE firm-product snapshot. Entire current table | $0.05 |
| `/mariners` | USCG D13 / Northwest Local Notice to Mariners. This week's LNM | $0.05 |
| `/mariners-d11` | USCG D11 / Southwest Local Notice to Mariners. This week's LNM | $0.05 |
| `/mariners-d7` | USCG D7 / Southeast Local Notice to Mariners. This week's LNM | $0.05 |
| `/mariners-d8` | USCG D8 / Gulf Local Notice to Mariners. This week's LNM | $0.05 |
| `/mariners-d1` | USCG D1 / Northeast Local Notice to Mariners. This week's LNM | $0.05 |
| `/mariners-d5` | USCG D5 / Mid-Atlantic Local Notice to Mariners. This week's LNM | $0.05 |
| `/mariners-d9` | USCG D9 / Great Lakes Local Notice to Mariners. This week's LNM | $0.05 |
| `/mariners-d14` | USCG D14 / Pacific Local Notice to Mariners. This week's LNM | $0.05 |
| `/mariners-d17` | USCG D17 / Alaska Local Notice to Mariners. This week's LNM | $0.05 |
| `/warning-letters` | FDA warning-letter bodies (firm, date, subject, full letter text). Newest 10 official texts | $0.02 / $0.05 |
| `/untitled-letters` | FDA Untitled Letter text (CDER OPDP + CBER promo PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/awa` | USDA APHIS AWA inspection-report observation text (official per-report PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/swisspar` | Swissmedic first-authorisation SwissPAR evaluation text (official per-product PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/pcac` | FDA PCAC 503A briefing-memo evaluation text (official per-substance PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/ftc-wl` | FTC BCP warning-letter text (official per-letter PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/cfpb-orders` | CFPB consent-order / administrative-order text (official per-order PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/occ-cd` | OCC institution C&D / consent-order text (official per-order PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/fdic-orders` | FDIC institution consent-order / C&D text (official per-order PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/frb-orders` | FRB institution C&D / written-agreement / PCA text (official per-order PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/ncua-orders` | NCUA institution consent C&D text (official per-order HTML). Newest 10 official texts | $0.02 / $0.05 |
| `/fincen-orders` | FinCEN institution consent-order text (official per-order PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/ferc-orders` | FERC institution stipulation-and-consent text (official cms.ferc.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/ofac-orders` | OFAC institution enforcement-release text (official ofac.treasury.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/bis-orders` | BIS institution charging-letter / order text (official bis.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/cftc-orders` | CFTC institution enforcement-order / settlement text (official cftc.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/fifra-orders` | EPA FIFRA institution order / consent text (official yosemite.epa.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/denovo-orders` | FDA De Novo classification-order text (official accessdata.fda.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/ttb-oic` | TTB Offer in Compromise text (official ttb.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/air-letters` | USDA APHIS AIR confirmation-letter text (official direct.aphis.usda.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/superfund-rods` | EPA Superfund Record of Decision and Five-Year Review text (official semspub.epa.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/ico-mpn` | ICO Monetary Penalty Notice text (official ico.org.uk PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/cma-ca98` | UK CMA CA98 infringement-decision text (official assets.publishing.service.gov.uk PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/ema-referrals` | EMA human-medicine referral procedure text (official ema.europa.eu English PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/cder-reviews` | FDA CDER Integrated Review text (official accessdata.fda.gov Drugs@FDA PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/npdes-permits` | EPA-issued individual NPDES permit text (official epa.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/ofsted-inspections` | Ofsted school / provider inspection-report text (official files.ofsted.gov.uk PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/ofwat-enforcement` | Ofwat Water Industry Act 1991 enforcement-notice text (official ofwat.gov.uk PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/ofgem-enforcement` | Ofgem enforcement-notice text (official ofgem.gov.uk PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/gain` | USDA FAS GAIN attaché report TEXT (official gain.fas.usda.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/orr-enforcement` | ORR Railways Act 1993 s.55 statutory-notice / final-order / investigation-report text (official orr.gov.uk PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/phmsa-orders` | PHMSA pipeline enforcement-order text (official primis.phmsa.dot.gov PDFs; NOPV PCP/PCO, Final Order, CAO, Consent Order, Decision on Petition). Newest 10 official texts | $0.02 / $0.05 |
| `/aaib-reports` | UK AAIB investigation-report text (official assets.publishing.service.gov.uk PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/csb-reports` | US CSB final investigation report PDF (official csb.gov/assets PDFs). One official PDF | $0.05 |
| `/hhs-oig-reports` | HHS OIG Audit / Evaluation and VA OIG audit / inspection / review PDFs (official oig.hhs.gov and vaoig.gov). One official PDF | $0.05 |
| `/eis-reports` | EPA NEPA Environmental Impact Statement text (official CDX e-NEPA EIS document PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/fsis-humane` | USDA FSIS humane-handling enforcement letter text (official fsis.usda.gov NOS / NOIE / deferral / abeyance / reinstatement PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/epa-cafo` | EPA Part 22 CAFO / ESA administrative penalty letter text (official yosemite.epa.gov and regional epa.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/fmshrc-orders` | FMSHRC ALJ + Commission Decision/Order text (official fmshrc.gov PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/bsee-reports` | BSEE District Accident Investigation Report text (official bsee.gov district-investigation PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/oshrc-orders` | OSHRC ALJ Decision/Order + Commission Final Order text (official oshrc.gov PDF/HTML caches). Newest 10 official texts | $0.02 / $0.05 |
| `/epa-alj` | EPA OALJ Initial Decision and Order + ALJ Order text (official yosemite.epa.gov/oarm/alj PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/epa-eab` | EPA EAB Unpublished Final Order / Board Order text (official yosemite.epa.gov/oa/EAB_Web_Docket.nsf PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/faa-civil-penalty` | FAA Civil Penalty Appeals Administrator Order text (official drs.faa.gov CIVIL_PENALTY_APPEALS PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/stb-decisions` | STB Board Decision / Order text (official dcms-external.s3.amazonaws.com DCMS PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/oalj-decisions` | DOL OALJ / BALCA / ARB Decision and Order text (official oalj.dol.gov and dol.gov/sites OALJ ARB PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/fmc-orders` | FMC Reading Room Initial Decision / Commission Order text (official www2.fmc.gov/readingroom PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/ftc-orders` | FTC cases-proceedings ALJ Decision / Commission Decision and Order text (official ftc.gov/system/files/ftc_gov/pdf PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/form-483` | FDA Form 483 inspectional observation bodies (posted OII FOIA PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/gmp` | Health Canada Drug GMP report-card observation text + C.02 cites. Newest 10 official texts | $0.02 / $0.05 |
| `/gmp-md` | Health Canada medical-device report-card observation text + MDR cites. Newest 10 official texts | $0.02 / $0.05 |

Search URL for each body door: `https://ticks.bnm.farm/{path}/manifest.json?q=`. Full list with search links: [SHOP-INDEX.md](./SHOP-INDEX.md). Live source of truth: [https://ticks.bnm.farm/.well-known/x402](https://ticks.bnm.farm/.well-known/x402).
