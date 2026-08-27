# Ofgem enforcement-notice text — x402 door

Official **Ofgem-authored enforcement TEXT** extracted from public PDFs on `ofgem.gov.uk/sites/default/files/`. s.27A penalty proposals, confirmed/provisional orders, and enforcement notices. Official public UK government documents (**Crown copyright / OGL**). Does not invent notice text. Does not sell the HTML publication card (index + teaser only). Skip people files. Skip RIIO / open-data CSVs. Does not sell the Ofgem logo.

**Scope lock:** Company / licensee enforcement PDFs only (Tomato Energy, Farringdon Energy, OVO Energy, SSE Generation on the first slice). Keyed on official PDF filename stem. Not Ofwat WIA91. Not CMA CA98. Not ICO MPNs. Not Ofsted inspection reports.

Public catalog (`SHOP-INDEX.md` / README) lists this door. MCP tools stay generated from live well-known (do not hardcode a door count). This listing PR does **not** apply on apollo. Worker apply is the sibling extra-bag PR. Unpaid `GET /ofgem-enforcement` is HTTP 402 once the worker apply lands.

## Lander card copy (product + bag size + price only)

| Field | Value |
| --- | --- |
| Product | Ofgem enforcement notices / s.27A penalty proposals / confirmed and provisional orders (UK energy licensees) |
| Bag | first slice: **6** official texts |
| Price | `$0.02` via `?id=`; `$0.05` newest 10 (whole current set while the bag is under 10) |
| Endpoint | https://ticks.bnm.farm/ofgem-enforcement |

This repo does **not** own the bnm.farm lander card. tv-remote follow-up: add a `/ofgem-enforcement` card there after apply.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /ofgem-enforcement` | unpaid → **HTTP 402** | default newest 10 **$0.05** (`50000` atomic); `?id=` one official text **$0.02** (`20000` atomic) |
| `GET /ofgem-enforcement/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no notice body). `?q=` search names the id to buy. |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

Older pages are another **$0.05** on the same URL (`page` / `before`). If the catalog has fewer than 10, the nickel GET is the whole current set.

## Source of truth

- Official hub (not sold): https://www.ofgem.gov.uk/energy-regulation/how-we-regulate/compliance-and-enforcement
- Official PDFs: `https://www.ofgem.gov.uk/sites/default/files/YYYY-MM/*.pdf`
- First-slice PDFs:
  - https://www.ofgem.gov.uk/sites/default/files/2026-06/Decision%20to%20close%20investigation%20into%20OVO%20Energy%20Limited%20prepayment%20meter%20practices.pdf
  - https://www.ofgem.gov.uk/sites/default/files/2025-10/Tomato%20Energy%20Limited%20-%20Notice%20of%20Proposal%20to%20Impose%20a%20Penalty.pdf
  - https://www.ofgem.gov.uk/sites/default/files/2025-07/PO7.Confirmed-Provisional-Order-Tomato-Energy-Ltd-Unsigned.pdf
  - https://www.ofgem.gov.uk/sites/default/files/2025-06/Farringdon-Energy-PO-Penalty-Notice.pdf
  - https://www.ofgem.gov.uk/sites/default/files/2024-11/Farringdon_Energy_Penalty_Proposal_Notice.pdf
  - https://www.ofgem.gov.uk/sites/default/files/2023-07/July%202023%20SSE%20Foyers%20TCLC%20-%20Final%20penalty%20notice.pdf
- License: **Crown copyright / OGL**. Attribution: Ofgem (Gas and Electricity Markets Authority). Contains public sector information licensed under the Open Government Licence v3.0. Logos reserved. https://www.ofgem.gov.uk/c-ofgem-2026

Paid body keeps `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=ofgem-enforcement`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official enforcement hub). A repeat buyer diffs `asOf` + record ids.

Free manifest is id / docket / institution / date / kind / sourceUrl only. Notice needles such as Tomato `SLC 4B.1` / gas crisis / Penalty Policy stay out of unpaid 402 responses.

`data/ofgem-enforcement/` is gitignored. The repo ships a bundled seed at `src/fixtures/ofgem-enforcement/seed-snapshot.json` (6 official texts) used when `OFGEM_ENFORCEMENT_DIR` is unset.

## Leak-test (re-checked 2026-08-27)

- Sibling `.json` / `.txt` of the Tomato s.27A PDF: HTTP 404.
- `Accept: application/json` on the official PDF still returns `application/pdf`.
- Drupal `?_format=json` on the Tomato case card: HTTP 406 (HTML-only route).
- HTML teaser / publication card is index only (no `SLC 4B.1` / gas crisis / Penalty Policy).
- No no-auth JSON/CSV/XML/TXT of the enforcement **body**. Ship is allowed.

## Apply

Build + restart **only** `idaho-ticks-x402.service` from the host that owns apollo. This PR does **not** apply on apollo from the cloud VM.

```bash
cd ~/projects/mcp-proxy
# optional on-disk cache; omit OFGEM_ENFORCEMENT_DIR to use the bundled 6-card seed
export OFGEM_ENFORCEMENT_DIR=$HOME/projects/mcp-proxy/data/ofgem-enforcement
mkdir -p "$OFGEM_ENFORCEMENT_DIR"
# first apply: copy the bundled seed if you want a writable cache
# cp src/fixtures/ofgem-enforcement/seed-snapshot.json "$OFGEM_ENFORCEMENT_DIR/snapshot.json"
npm run build
sudo systemctl restart idaho-ticks-x402.service
```

Collector (later growth; first slice stays thin — do not recrawl a fat archive):

```bash
export OFGEM_ENFORCEMENT_DIR=$HOME/projects/mcp-proxy/data/ofgem-enforcement
OFGEM_ENFORCEMENT_LIMIT=6 OFGEM_ENFORCEMENT_MAX_FETCH=6 npm run collect:ofgem-enforcement
```
