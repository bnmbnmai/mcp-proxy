# IPO trade-mark hearing text — x402 door

Official UK Intellectual Property Office **institution/company trade-mark inter partes hearing TEXT** extracted with `pdftotext` from PDFs on `ipo.gov.uk/t-challenge-decision-results/`. Does not invent hearing text. Not people-applicant SKUs. Not the year-grid/card. Not TM Journal XML. Not design_decision. Not GOV.UK `trademark_decision`. Not Find Case Law. Not ICO `/ico-mpn`. Not PHMSA `/phmsa-cop`. Not ACM `/acm-besluiten`. Not CCPC `/ccpc-mergers`. Not BKartA `/bkarta-entscheidungen`. Not CMA `/cma-ca98`.

**Prep only. Do not list on well-known / OpenAPI / llms.txt / shop catalog.** Unpaid `GET /ipo-tm` is HTTP 402.

v1 seeds **5** official company/institution hearing PDFs. Required lead is Roadget Business Pte. Ltd / Dsquared2 Trademarks Limited (`o071326-roadget-dsquared`, O/0713/26, 10 Aug 2026, SHEIN ICON opposition). Family: Savant Systems, Inc. / Savant Group Limited (`o072126-savant`), Supermac’s (Holdings) Ltd / McDonald’s International Property Company, Ltd. (`o068626-supermac-mcdonalds`), Food Brut Limited / Jolene, LLC (`o122125-food-brut-jolene`), Ronix (UK) Limited / De Longhi Benelux S.A. (`o012125-ronix-delonghi`). Skip people-applicant. Skip year-grid. Skip TM Journal. Skip design_decision.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /ipo-tm` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /ipo-tm/manifest.json` | free | HTTP 200 institution / BL / date / official PDF URL (no hearing body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.ipo.gov.uk/t-challenge-decision-results.htm
- Official PDFs: `https://www.ipo.gov.uk/t-challenge-decision-results/oNNNNNN.pdf`
- Required seed: Roadget / Dsquared2 — 10 Aug 2026 — https://www.ipo.gov.uk/t-challenge-decision-results/o071326.pdf
- License: **Crown + OGL v3.0** commercial. Logo reserved — sold body is IPO-authored TEXT only, not the mark.

Free manifest is institution / BL / date / sourceUrl only. Sold-body needles such as `442930`, `3914395`, `£2800`, and `section 5(2)(b)` stay out of unpaid responses. Year-grid listing id is not the sold body.

`data/ipo-tm/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export IPO_TM_DIR=$HOME/projects/mcp-proxy/data/ipo-tm
IPO_TM_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/ipo-tm IPO_TM_LIMIT=5 npm run collect:ipo-tm
```
