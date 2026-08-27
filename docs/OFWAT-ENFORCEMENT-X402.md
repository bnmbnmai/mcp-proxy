# Ofwat Water Industry Act 1991 enforcement-notice text — x402 door

Official **Ofwat-authored Water Industry Act 1991 enforcement-notice / final-decision / section 19 undertakings TEXT** extracted from public PDFs on `ofwat.gov.uk/wp-content/uploads/`. Official public UK government documents (**OGL v3.0** on the PDF face). Does not invent notice text. Does not sell the HTML investigations / publication / consultation card (index + teaser only). Skip Ofwat open-data / performance CSVs. Skip people files.

**Scope lock:** Company / undertaker enforcement PDFs only (South East Water, Thames Water, Southern Water on the first slice). Keyed on official PDF filename stem. Not CMA CA98. Not ICO MPNs. Not Ofsted inspection reports. Not HSE notices.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /ofwat-enforcement` is HTTP 402. MCP at `/mcp` generates an `ofwat-enforcement` tool from live well-known (do not hardcode a door count).

v1 first slice is the three family seed URLs. Two official texts are harvested (South East Water proposal; Thames Water final decision). The Southern Water section 19 undertakings PDF stays a seed URL — this VM could not fetch a body (live Cloudflare challenge; no Wayback `id_` capture). Do not invent that body.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /ofwat-enforcement` | unpaid → **HTTP 402** | default newest 10 **$0.05** (`50000` atomic); `?id=` one official text **$0.02** (`20000` atomic) |
| `GET /ofwat-enforcement/manifest.json` | free | HTTP 200 institution / docket / date / official PDF URL (no notice body). `?q=` search names the id to buy. |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

Older pages are another **$0.05** on the same URL (`page` / `before`). If the catalog has fewer than 10, the nickel GET is the whole current set.

## Source of truth

- Official index (not sold): https://www.ofwat.gov.uk/regulated-companies/investigations/
- Official PDFs: `https://www.ofwat.gov.uk/wp-content/uploads/YYYY/MM/*.pdf`
- Seed PDFs:
  - https://www.ofwat.gov.uk/wp-content/uploads/2026/03/Notice-of-Ofwats-proposal-to-issue-an-enforcement-order-and-impose-a-penalty.pdf
  - https://www.ofwat.gov.uk/wp-content/uploads/2024/08/2025-05-28-Thames-Water-Final-Decision-Document-REDACTED.pdf
  - https://www.ofwat.gov.uk/wp-content/uploads/2026/02/Notice-of-Ofwats-decision-to-accept-section-19-undertakings-from-Southern-Water-Services-Limited.pdf
- License: **OGL v3.0**. Attribution: Ofwat (Water Services Regulation Authority). Contains public sector information licensed under the Open Government Licence v3.0. Logos reserved.

Paid body keeps `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=ofwat-enforcement`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official investigations hub). A repeat buyer diffs `asOf` + record ids.

Free manifest is id / docket / institution / date / kind / sourceUrl only. Notice needles such as South East Water `£22.46m` / Freeze Thaw Event / Storm Eunice / PWPC / `26,705` stay out of unpaid 402 responses.

`data/ofwat-enforcement/` is gitignored. The repo ships a bundled seed at `src/fixtures/ofwat-enforcement/seed-snapshot.json` (2 official texts) used when `OFWAT_ENFORCEMENT_DIR` is unset.

This repo does **not** own the bnm.farm lander card. tv-remote follow-up: add a `/ofwat-enforcement` card there after apply.

## Leak-test (re-checked 2026-08-27)

- Live `www.ofwat.gov.uk` (hub, WP JSON, official PDFs) returns Cloudflare challenge 403. WP JSON 403 is not a dump.
- GOV.UK Search `filter_organisations=ofwat` and charge-phrase queries (`£22.46m` / Freeze Thaw / Storm Eunice / PWPC) returned 0 results.
- Wayback hub HTML is index/teaser only (no PDF body, no needles).
- Harvested SEW + Thames PDFs via Wayback `id_`. License footer is Crown copyright + OGL v3.0.
- No no-auth JSON/CSV/XML/TXT of the enforcement **body**. Ship is allowed.

## Apply

Build + restart **only** `idaho-ticks-x402.service` from the host that owns apollo. This listing PR does **not** apply on apollo from the cloud VM.

```bash
cd ~/projects/mcp-proxy
# optional on-disk cache; omit OFWAT_ENFORCEMENT_DIR to use the bundled 2-card seed
export OFWAT_ENFORCEMENT_DIR=$HOME/projects/mcp-proxy/data/ofwat-enforcement
mkdir -p "$OFWAT_ENFORCEMENT_DIR"
# first apply: copy the bundled seed if you want a writable cache
# cp src/fixtures/ofwat-enforcement/seed-snapshot.json "$OFWAT_ENFORCEMENT_DIR/snapshot.json"
npm run build
sudo systemctl restart idaho-ticks-x402.service
```

Collector (later growth; first slice stays thin — do not recrawl a fat archive):

```bash
export OFWAT_ENFORCEMENT_DIR=$HOME/projects/mcp-proxy/data/ofwat-enforcement
OFWAT_ENFORCEMENT_LIMIT=3 OFWAT_ENFORCEMENT_MAX_FETCH=3 npm run collect:ofwat-enforcement
```
