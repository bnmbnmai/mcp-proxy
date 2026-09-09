# Ofwat Water Industry Act 1991 enforcement-notice text — x402 door

Official **Ofwat-authored Water Industry Act 1991 enforcement-notice / final-decision / section 19 undertakings TEXT** extracted from public PDFs on `ofwat.gov.uk/wp-content/uploads/`. Official public UK government documents (**OGL v3.0** on the PDF face). Does not invent notice text. Does not sell the HTML investigations / publication / consultation card (index + teaser only). Skip Ofwat open-data / performance CSVs. Skip people files.

**Scope lock:** Company / undertaker enforcement PDFs only (WIA91 enforcement-notice / final-decision / s.19 undertakings). Keyed on official PDF filename stem. Not CMA CA98. Not ICO MPNs. Not Ofsted inspection reports. Not HSE notices. Not PR24 price-control determinations. Not Ofwat Enforcement Guidance.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /ofwat-enforcement` is HTTP 402. MCP at `/mcp` generates an `ofwat-enforcement` tool from live well-known (do not hardcode a door count).

The 2026-08 first slice was three seed URLs and stayed teaser-blocked at n=3 because collect never walked official `/enforcement-case-in-*` pages (the investigations hub is cards, not PDFs) and default LIMIT/MAX_FETCH was 3. Official Ofwat still publishes many more matching notices (Anglian, Wessex, Yorkshire, South West Water, Dŵr Cymru, further Thames / South East Water texts). Collect now seeds those official PDFs, follows case-page cards, and defaults LIMIT 20 / MAX_FETCH 24 so twice-daily grow can fatten toward growUntil 20. Live `www.ofwat.gov.uk` may still Cloudflare-challenge; Wayback CDX / `id_` is the fallback for official `wp-content/uploads` PDFs only. Do not invent notice text.

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
- Official case pages (index + teaser only; PDFs on the card are the sold unit): `/enforcement-case-in-*` plus the sewage-investigation updates page
- Seed PDFs include the original three plus later official notices (South East Water s.19 decision, Anglian / Wessex / Yorkshire / South West Water s.19, Dŵr Cymru, further Thames texts). See `SEED_LISTINGS` in `src/ofwat-enforcement.ts`.
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

Collector (twice-daily grow; cached ids do not consume LIMIT):

```bash
export OFWAT_ENFORCEMENT_DIR=$HOME/projects/mcp-proxy/data/ofwat-enforcement
# ticks-collect.sh already sets LIMIT=24 MAX_FETCH=36. Bare collect defaults to 20 / 24.
npm run collect:ofwat-enforcement
```

After apply, `/ofwat-enforcement` should log `grew` (n>3) or `current` once the official matching set is cached — not `teaser-blocked` forever. Id/date-only dry-collect proof: `docs/curl/ofwat-enforcement-grow-summary.json`.
