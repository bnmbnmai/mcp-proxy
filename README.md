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

| Path | Bag | Price |
| --- | --- | --- |
| `/ticks` | US hay, cattle, and grain ticks (USDA AMS nationwide plus official dairy, hogs, and terminal produce). Entire current table | $0.05 |
| `/import-alerts` | FDA Import Alerts / DWPE firm-product snapshot. Entire current table | $0.05 |
| `/mariners` | USCG D13 / Northwest this week's LNM | $0.05 |
| `/mariners-d11` | USCG D11 / Southwest this week's LNM | $0.05 |
| `/mariners-d7` | USCG D7 / Southeast this week's LNM | $0.05 |
| `/mariners-d8` | USCG D8 / Gulf this week's LNM | $0.05 |
| `/warning-letters` | FDA warning-letter bodies. Newest 10 official texts | $0.02 / $0.05 |
| `/untitled-letters` | FDA Untitled Letter text (CDER OPDP + CBER promo PDFs). Newest 10 official texts | $0.02 / $0.05 |
| `/awa` | USDA APHIS AWA inspection-report observation text. Newest 10 official texts | $0.02 / $0.05 |
| `/swisspar` | Swissmedic first-authorisation SwissPAR evaluation text. Newest 10 official texts | $0.02 / $0.05 |
| `/pcac` | FDA PCAC 503A briefing-memo evaluation text. Newest 10 official texts | $0.02 / $0.05 |
| `/ftc-wl` | FTC BCP warning-letter text. Newest 10 official texts | $0.02 / $0.05 |
| `/cfpb-orders` | CFPB consent-order / administrative-order text. Newest 10 official texts | $0.02 / $0.05 |
| `/occ-cd` | OCC institution C&D / consent-order text. Newest 10 official texts | $0.02 / $0.05 |
| `/fdic-orders` | FDIC institution consent-order / C&D text. Newest 10 official texts | $0.02 / $0.05 |
| `/frb-orders` | FRB institution C&D / written-agreement / PCA text. Newest 10 official texts | $0.02 / $0.05 |
| `/ncua-orders` | NCUA institution consent C&D text. Newest 10 official texts | $0.02 / $0.05 |
| `/fincen-orders` | FinCEN institution consent-order text. Newest 10 official texts | $0.02 / $0.05 |
| `/ferc-orders` | FERC institution stipulation-and-consent text. Newest 10 official texts | $0.02 / $0.05 |
| `/ofac-orders` | OFAC institution enforcement-release text. Newest 10 official texts | $0.02 / $0.05 |
| `/bis-orders` | BIS institution charging-letter / order text. Newest 10 official texts | $0.02 / $0.05 |
| `/cftc-orders` | CFTC institution enforcement-order / settlement text. Newest 10 official texts | $0.02 / $0.05 |
| `/fifra-orders` | EPA FIFRA institution order / consent text. Newest 10 official texts | $0.02 / $0.05 |
| `/denovo-orders` | FDA De Novo classification-order text. Newest 10 official texts | $0.02 / $0.05 |
| `/ttb-oic` | TTB Offer in Compromise text. Newest 10 official texts | $0.02 / $0.05 |
| `/air-letters` | USDA APHIS AIR confirmation-letter text. Newest 10 official texts | $0.02 / $0.05 |
| `/superfund-rods` | EPA Superfund Record of Decision text. Newest 10 official texts | $0.02 / $0.05 |
| `/ico-mpn` | ICO Monetary Penalty Notice text. Newest 10 official texts | $0.02 / $0.05 |
| `/cma-ca98` | UK CMA CA98 infringement-decision text. Newest 10 official texts | $0.02 / $0.05 |
| `/ema-referrals` | EMA human-medicine referral procedure text. Newest 10 official texts | $0.02 / $0.05 |
| `/cder-reviews` | FDA CDER Integrated Review text. Newest 10 official texts | $0.02 / $0.05 |
| `/npdes-permits` | EPA-issued individual NPDES permit text. Newest 10 official texts | $0.02 / $0.05 |
| `/ofsted-inspections` | Ofsted school / provider inspection-report text. Newest 10 official texts | $0.02 / $0.05 |
| `/ofwat-enforcement` | Ofwat Water Industry Act 1991 enforcement-notice / final-decision / s.19 undertakings text. Newest 10 official texts | $0.02 / $0.05 |
| `/ofgem-enforcement` | Ofgem enforcement-notice / s.27A penalty-proposal / confirmed and provisional-order text. Newest 10 official texts | $0.02 / $0.05 |
| `/gain` | USDA FAS GAIN attaché report TEXT. Newest 10 official texts | $0.02 / $0.05 |
| `/orr-enforcement` | ORR Railways Act 1993 s.55 statutory-notice / final-order / investigation-report text. Newest 10 official texts | $0.02 / $0.05 |
| `/phmsa-orders` | PHMSA pipeline enforcement-order text. Newest 10 official texts | $0.02 / $0.05 |
| `/aaib-reports` | UK AAIB investigation-report text. Newest 10 official texts | $0.02 / $0.05 |
| `/form-483` | FDA Form 483 inspectional observation bodies. Newest 10 official texts | $0.02 / $0.05 |
| `/gmp` | Health Canada Drug GMP report-card observation text + C.02 cites. Newest 10 official texts | $0.02 / $0.05 |
| `/gmp-md` | Health Canada medical-device report-card observation text + MDR cites. Newest 10 official texts | $0.02 / $0.05 |

Search URL for each body door: `https://ticks.bnm.farm/{path}/manifest.json?q=`. Full list with search links: [SHOP-INDEX.md](./SHOP-INDEX.md). Live source of truth: [https://ticks.bnm.farm/.well-known/x402](https://ticks.bnm.farm/.well-known/x402).
