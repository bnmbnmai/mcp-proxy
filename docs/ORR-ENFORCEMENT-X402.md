# ORR Railways Act 1993 s.55 enforcement-notice text — x402 door

Official **ORR-authored Railways Act 1993 s.55 statutory-notice / final-order / investigation-report TEXT** extracted from public PDFs on `orr.gov.uk/sites/default/files/` and `/media/{id}/download`. Official public UK government documents (**Crown copyright / OGL v3.0**). Does not invent notice text. Does not sell the HTML investigation card (index + teaser only). Skip people files. Skip open-data CSVs. Does not wrap GOV.UK correspondence HTML. Does not list EIS. Does not apply NPDES. Not Ofgem / Ofwat / Ofsted / RAIB / MAIB.

**Scope lock:** Company / licence-holder enforcement PDFs only (Northern Trains; Network Rail on the first slice). Keyed on official PDF filename stem. Not Ofgem. Not Ofwat. Not Ofsted. Not RAIB. Not MAIB.

Public catalog (`SHOP-INDEX.md` / README) lists this door. MCP tools stay generated from live well-known (do not hardcode a door count). This listing PR does **not** apply on apollo. Unpaid `GET /orr-enforcement` is HTTP 402 once the worker apply lands.

## Lander card copy (product + bag size + price only)

| Field | Value |
| --- | --- |
| Product | ORR Railways Act 1993 s.55 statutory notices / final orders / investigation reports (UK rail licence holders) |
| Bag | first slice: **6** official texts |
| Price | `$0.02` via `?id=`; `$0.05` newest 10 (whole current set while the bag is under 10) |
| Endpoint | https://ticks.bnm.farm/orr-enforcement |

This repo does **not** own the bnm.farm lander card. tv-remote follow-up: add a `/orr-enforcement` card there after apply.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /orr-enforcement` | unpaid → **HTTP 402** | default newest 10 **$0.05** (`50000` atomic); `?id=` one official text **$0.02** (`20000` atomic) |
| `GET /orr-enforcement/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no notice body). `?q=` search names the id to buy. |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

Older pages are another **$0.05** on the same URL (`page` / `before`). If the catalog has fewer than 10, the nickel GET is the whole current set.

## Source of truth

- Official hub (not sold): https://www.orr.gov.uk/monitoring-regulation/rail/investigations
- Northern card (index only): https://www.orr.gov.uk/monitoring-regulation/rail/investigations/northern-trains-limited
- Wales & Western card (index only): https://www.orr.gov.uk/monitoring-regulation/rail/investigations/wales-western
- Official PDFs: `https://www.orr.gov.uk/sites/default/files/` and `https://www.orr.gov.uk/media/{id}/download`
- First-slice PDFs:
  - https://www.orr.gov.uk/sites/default/files/2026-03/orr-to-northern-trains-limited-statutory-notice-dated-3-march-2026.pdf
  - https://www.orr.gov.uk/sites/default/files/2026-03/orr-northern-trains-limited-investigation-report-march-2026.pdf
  - https://www.orr.gov.uk/sites/default/files/2024-07/wales-and-western-investigation-licence-final-order-2024-07-10.pdf
  - https://www.orr.gov.uk/sites/default/files/2024-05/2024-05-29-wales-and-western-investigation-licence-draft-order.pdf
  - https://www.orr.gov.uk/sites/default/files/2024-05/2024-05-28-wales-and-western-investigation-report.pdf
  - https://www.orr.gov.uk/sites/default/files/om/enhancements-notice-2015-10-16.pdf
- License: **Crown copyright / OGL v3.0**. Attribution: Office of Rail and Road. Contains public sector information licensed under the Open Government Licence v3.0. Logos reserved.

Paid body keeps `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=orr-enforcement`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official investigations hub). A repeat buyer diffs `asOf` + record ids.

Free manifest is id / docket / institution / date / kind / sourceUrl only. Notice needles such as Northern `23 actions` / Wales & Western `£3,000,000` / 2015 `Enhancements Improvement Plan` stay out of unpaid 402 responses.

`data/orr-enforcement/` is gitignored. The repo ships a bundled seed at `src/fixtures/orr-enforcement/seed-snapshot.json` (6 official texts) used when `ORR_ENFORCEMENT_DIR` is unset.

## Leak-test (re-checked 2026-08-27)

- Official Northern s.55(6) PDF: **192248 B / 9 pp**.
- Sibling `.json` / `.txt` of that PDF: HTTP 404.
- `Accept: application/json` on the official PDF still returns `application/pdf`.
- Drupal `?_format=json` on the Northern investigation card: HTTP 406.
- HTML teaser / investigation card is index only (no `23 actions` / `£3,000,000` / `Enhancements Improvement Plan`).
- GOV.UK Search does not dump the notice body.
- No no-auth JSON/CSV/XML/TXT of the enforcement **body**. Ship is allowed.

## Apply

Build + restart **only** `idaho-ticks-x402.service` from the host that owns apollo. This listing PR does **not** apply on apollo from the cloud VM. Do not deploy or restart `idaho-ticks-x402` from this PR. Do not touch `/ticks` AMS.

```bash
cd ~/projects/mcp-proxy
# optional on-disk cache; omit ORR_ENFORCEMENT_DIR to use the bundled 6-card seed
export ORR_ENFORCEMENT_DIR=$HOME/projects/mcp-proxy/data/orr-enforcement
mkdir -p "$ORR_ENFORCEMENT_DIR"
# first apply: copy the bundled seed if you want a writable cache
# cp src/fixtures/orr-enforcement/seed-snapshot.json "$ORR_ENFORCEMENT_DIR/snapshot.json"
npm run build
sudo systemctl restart idaho-ticks-x402.service
```

Collector (later growth; first slice stays thin — do not recrawl a fat archive):

```bash
export ORR_ENFORCEMENT_DIR=$HOME/projects/mcp-proxy/data/orr-enforcement
ORR_ENFORCEMENT_LIMIT=6 ORR_ENFORCEMENT_MAX_FETCH=6 npm run collect:orr-enforcement
```
