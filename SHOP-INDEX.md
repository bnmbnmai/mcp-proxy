# BNM Data Shop — live door index

Public, agent-facing list of **live** paid GETs only. Re-read live manifests before shipping bag sizes.

## Start here

- Shop: [https://bnm.farm/](https://bnm.farm/)
- Paid host: [https://ticks.bnm.farm](https://ticks.bnm.farm)
- Discovery: [https://ticks.bnm.farm/.well-known/x402](https://ticks.bnm.farm/.well-known/x402)
- OpenAPI: [https://ticks.bnm.farm/openapi.json](https://ticks.bnm.farm/openapi.json)
- llms.txt: [https://ticks.bnm.farm/llms.txt](https://ticks.bnm.farm/llms.txt)
- Sample (free canned paid-JSON keys): [https://ticks.bnm.farm/sample](https://ticks.bnm.farm/sample)
- Firm check (free cross-door search): [https://ticks.bnm.farm/firm-check?q=](https://ticks.bnm.farm/firm-check?q=)
- Shop JSON: [https://ticks.bnm.farm/](https://ticks.bnm.farm/)
- Ticks manifest: [https://ticks.bnm.farm/manifest.json](https://ticks.bnm.farm/manifest.json)

payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · Base (`eip155:8453`) · USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

Official public data caches (PDF/HTML sources), returned as JSON after x402. Not free-JSON wraps. Unpaid GET on a paid path returns HTTP 402. No API key. No request body.

Paid GETs are listed on live well-known (do not hardcode a door count). `$0.05` (`50000` atomic) for table / page GETs. Extracted-body `?id=` is `$0.02` (`20000` atomic). No per-record SKU. No alerts/delta door.

Extracted-body doors: **free index/search** on `/{door}/manifest.json` or `/{door}/index` (`?q=`, optional `before`/`date`) returns one row per collected record (id, date, title/firm/subject, `?id=` URL, page cursor). Then pay **one official text** `GET ?id=` at **$0.02** (`20000` atomic) or the page at **$0.05**. A plain GET sells the **newest 10 official texts** (or the whole current set if fewer). The same URL with `?before=` sells the next older page of up to 10 for another $0.05. Same door. No per-record Bazaar SKU. `/ticks` and `/import-alerts` stay the full current table. Mariners doors stay **this week's LNM**.

## Live paid GETs

| Path | What you get | Paid JSON | Catalog | Price | Free manifest |
| --- | --- | --- | ---: | --- | --- |
| `/ticks` | US hay, cattle, and grain ticks (USDA AMS nationwide). Idaho / PNW barns are example geography inside the table, not the SKU. Entire current table on one GET | `ticks[] + history` | 611 ticks | $0.05 | [manifest.json](https://ticks.bnm.farm/manifest.json) |
| `/import-alerts` | FDA Import Alerts / DWPE firm-product snapshot. Entire current table on one GET | `ticks[]` | 18904 rows / 6709 firms | $0.05 | [import-alerts/manifest.json](https://ticks.bnm.farm/import-alerts/manifest.json) |
| `/mariners` | USCG D13 / Northwest this week's LNM | `notices[]` | 124 notices | $0.05 | [mariners/manifest.json](https://ticks.bnm.farm/mariners/manifest.json) |
| `/mariners-d11` | USCG D11 / Southwest this week's LNM | `notices[]` | 198 notices | $0.05 | [mariners-d11/manifest.json](https://ticks.bnm.farm/mariners-d11/manifest.json) |
| `/mariners-d7` | USCG D7 / Southeast this week's LNM | `notices[]` | 1825 notices | $0.05 | [mariners-d7/manifest.json](https://ticks.bnm.farm/mariners-d7/manifest.json) |
| `/mariners-d8` | USCG D8 / Gulf this week's LNM | `notices[]` | 1258 notices | $0.05 | [mariners-d8/manifest.json](https://ticks.bnm.farm/mariners-d8/manifest.json) |
| `/warning-letters` | FDA warning-letter bodies. Newest 10 official texts | `letters[].body` | 396 letters | $0.05 | [warning-letters/manifest.json](https://ticks.bnm.farm/warning-letters/manifest.json) |
| `/untitled-letters` | FDA Untitled Letter text (CDER OPDP + CBER promo PDFs). Newest 10 official texts | `cards[].body` | 119 cards | $0.05 | [untitled-letters/manifest.json](https://ticks.bnm.farm/untitled-letters/manifest.json) |
| `/awa` | USDA APHIS AWA inspection-report observation text. Newest 10 official texts | `cards[].body` | 25 cards | $0.05 | [awa/manifest.json](https://ticks.bnm.farm/awa/manifest.json) |
| `/swisspar` | Swissmedic first-authorisation SwissPAR evaluation text. Newest 10 official texts | `cards[].body` | 37 cards | $0.05 | [swisspar/manifest.json](https://ticks.bnm.farm/swisspar/manifest.json) |
| `/pcac` | FDA PCAC 503A briefing-memo evaluation text. Newest 10 official texts | `cards[].body` | 14 cards | $0.05 | [pcac/manifest.json](https://ticks.bnm.farm/pcac/manifest.json) |
| `/ftc-wl` | FTC BCP warning-letter text. Newest 10 official texts | `cards[].body` | 36 cards | $0.05 | [ftc-wl/manifest.json](https://ticks.bnm.farm/ftc-wl/manifest.json) |
| `/cfpb-orders` | CFPB consent-order / administrative-order text. Newest 10 official texts | `cards[].body` | 37 cards | $0.05 | [cfpb-orders/manifest.json](https://ticks.bnm.farm/cfpb-orders/manifest.json) |
| `/occ-cd` | OCC institution C&D / consent-order text. Newest 10 official texts | `cards[].body` | 34 cards | $0.05 | [occ-cd/manifest.json](https://ticks.bnm.farm/occ-cd/manifest.json) |
| `/fdic-orders` | FDIC institution consent-order / C&D text. Newest 10 official texts | `cards[].body` | 5 cards | $0.05 | [fdic-orders/manifest.json](https://ticks.bnm.farm/fdic-orders/manifest.json) |
| `/frb-orders` | FRB institution C&D / written-agreement / PCA text. Newest 10 official texts | `cards[].body` | 29 cards | $0.05 | [frb-orders/manifest.json](https://ticks.bnm.farm/frb-orders/manifest.json) |
| `/ncua-orders` | NCUA institution consent C&D text. Newest 10 official texts | `cards[].body` | 12 cards | $0.05 | [ncua-orders/manifest.json](https://ticks.bnm.farm/ncua-orders/manifest.json) |
| `/fincen-orders` | FinCEN institution consent-order text. Newest 10 official texts | `cards[].body` | 33 cards | $0.05 | [fincen-orders/manifest.json](https://ticks.bnm.farm/fincen-orders/manifest.json) |
| `/ferc-orders` | FERC institution stipulation-and-consent text. Newest 10 official texts | `cards[].body` | 5 cards | $0.05 | [ferc-orders/manifest.json](https://ticks.bnm.farm/ferc-orders/manifest.json) |
| `/ofac-orders` | OFAC institution enforcement-release text. Newest 10 official texts | `cards[].body` | 25 cards | $0.05 | [ofac-orders/manifest.json](https://ticks.bnm.farm/ofac-orders/manifest.json) |
| `/bis-orders` | BIS institution charging-letter / order text. Newest 10 official texts | `cards[].body` | 22 cards | $0.05 | [bis-orders/manifest.json](https://ticks.bnm.farm/bis-orders/manifest.json) |
| `/cftc-orders` | CFTC institution enforcement-order / settlement text. Newest 10 official texts | `cards[].body` | 7 cards | $0.05 | [cftc-orders/manifest.json](https://ticks.bnm.farm/cftc-orders/manifest.json) |
| `/fifra-orders` | EPA FIFRA institution order / consent text. Newest 10 official texts | `cards[].body` | 5 cards | $0.05 | [fifra-orders/manifest.json](https://ticks.bnm.farm/fifra-orders/manifest.json) |
| `/denovo-orders` | FDA De Novo classification-order text. Newest 10 official texts | `cards[].body` | 24 cards | $0.05 | [denovo-orders/manifest.json](https://ticks.bnm.farm/denovo-orders/manifest.json) |
| `/ttb-oic` | TTB Offer in Compromise text. Newest 10 official texts | `cards[].body` | 25 cards | $0.05 | [ttb-oic/manifest.json](https://ticks.bnm.farm/ttb-oic/manifest.json) |
| `/air-letters` | USDA APHIS AIR confirmation-letter text. Newest 10 official texts | `cards[].body` | 29 cards | $0.05 | [air-letters/manifest.json](https://ticks.bnm.farm/air-letters/manifest.json) |
| `/superfund-rods` | EPA Superfund Record of Decision text. Newest 10 official texts | `cards[].body` | 5 cards | $0.05 | [superfund-rods/manifest.json](https://ticks.bnm.farm/superfund-rods/manifest.json) |
| `/ico-mpn` | ICO Monetary Penalty Notice text. Newest 10 official texts | `cards[].body` | 20 cards | $0.05 | [ico-mpn/manifest.json](https://ticks.bnm.farm/ico-mpn/manifest.json) |
| `/cma-ca98` | UK CMA CA98 infringement-decision text. Newest 10 official texts | `cards[].body` | 32 cards | $0.05 | [cma-ca98/manifest.json](https://ticks.bnm.farm/cma-ca98/manifest.json) |
| `/ema-referrals` | EMA human-medicine referral procedure text. Find on free index (?q=); each row names the id to buy. GET ?id= one official text $0.02. Default GET is the newest 10 for $0.05 (whole current set if n<10); older pages another $0.05 on the same URL | `cards[].body` | 14 cards | $0.02 / $0.05 | [ema-referrals/manifest.json](https://ticks.bnm.farm/ema-referrals/manifest.json) |
| `/cder-reviews` | FDA CDER Integrated Review text (official accessdata.fda.gov Drugs@FDA PDFs). Find on free index (?q=); each row names the id to buy. GET ?id= one official text $0.02. Default GET is the newest 10 for $0.05 (whole current set if n<10); older pages another $0.05 on the same URL | `cards[].body` | 16 cards | $0.02 / $0.05 | [cder-reviews/manifest.json](https://ticks.bnm.farm/cder-reviews/manifest.json) |
| `/npdes-permits` | EPA-issued individual NPDES permit text (official epa.gov PDFs). Find on free index (?q=); each row names the id to buy. GET ?id= one official text $0.02. Default GET is the newest 10 for $0.05 (whole current set if n<10); older pages another $0.05 on the same URL | `cards[].body` | 16 cards | $0.02 / $0.05 | [npdes-permits/manifest.json](https://ticks.bnm.farm/npdes-permits/manifest.json) |
| `/ofsted-inspections` | Ofsted school / provider inspection-report text (official files.ofsted.gov.uk PDFs, OGL v3.0). Find on free index (?q=); each row names the id to buy. GET ?id= one official text $0.02. Default GET is the newest 10 for $0.05 (whole current set if n<10); older pages another $0.05 on the same URL | `cards[].body` | 16 cards | $0.02 / $0.05 | [ofsted-inspections/manifest.json](https://ticks.bnm.farm/ofsted-inspections/manifest.json) |
| `/form-483` | FDA Form 483 inspectional observation bodies. Newest 10 official texts | `letters[].body` | 314 letters | $0.05 | [form-483/manifest.json](https://ticks.bnm.farm/form-483/manifest.json) |
| `/gmp` | Health Canada Drug GMP report-card observation text + C.02 cites. Newest 10 official texts | `cards[].body` | 3550 cards | $0.05 | [gmp/manifest.json](https://ticks.bnm.farm/gmp/manifest.json) |
| `/gmp-md` | Health Canada medical-device report-card observation text + MDR cites. Newest 10 official texts | `cards[].body` | 33 cards | $0.05 | [gmp-md/manifest.json](https://ticks.bnm.farm/gmp-md/manifest.json) |

Free manifests carry the full catalog (count, ids, official source URLs). They are not the paid body. Catalog sizes above are live as of 2026-08-25; paid extracted-body GETs return at most 10 bodies per page (or the whole current set if fewer).

## Free discovery (not paid)

- `GET /sample` — free canned paid-JSON keys (table SKU + `?id=` body SKU). HTTP 200. Marked `example:true`. Not live cache. Not a 37th SKU.
- `GET /` — shop JSON (payTo + live products). Note says free index/search, then pay the page.
- `GET /.well-known/x402` — absolute URLs of the live paid routes only (not a SKU per page). Lists `/sample` as a free discovery URL, not a resource.
- `GET /openapi.json` — OpenAPI 3.1 with `x-payment-info`. Body doors: free index/search, then pay the page. Not the entire cache.
- `GET /llms.txt` — short agent guidance (free index/search, then pay the page) plus a Prompt for AI block with exact URLs
- `GET /mcp` — Streamable HTTP MCP: one tool per paid GET (from live well-known) plus free `search`, free `firm-check`, paid `get-one` ($0.02), and paid `get-page` ($0.05)
- `GET /firm-check?q=` — free cross-door search of Form 483, FDA warning letters, and the FDA import-alert catalog. HTTP 200 JSON. Hits name the door, the id or page to buy, and fetchedAt/asOf. Buyer still pays $0.02 one official text or $0.05 page/table. Not a paid SKU. Does not return letter bodies or the full import-alert table.
- `GET /manifest.json` and `GET /{path}/manifest.json` (or `/{path}/index`) — free per-SKU catalogs + `?id=` URL + page cursor; `?q=` / `before` / `date` stay free

## How to buy

Unpaid GET returns HTTP 402 with `PAYMENT-REQUIRED`. Extracted-body `?id=` asks `20000` atomic ($0.02). Page / default body GETs ask `50000` atomic ($0.05). After a valid `X-PAYMENT` (USDC on Base to the payTo above), the same URL returns that one official text, the newest 10, the older page of up to 10, the full current table on `/ticks` and `/import-alerts`, or this week's LNM on Mariners.

## Notes

- Re-read live well-known / OpenAPI / manifests before assuming a new door or a new catalog size.
- No next public SKU beyond live well-known. No alerts/delta door. No per-record Bazaar SKU. Same-door `?id=` is $0.02.
- Farm is no-spray, not organic-certified.
- This index does not claim Bazaar listing, CDP settlement, or sales volume.
