# UK AAIB investigation-report text — x402 door

Official **UK AAIB investigation-report TEXT** extracted from public PDFs on `assets.publishing.service.gov.uk` linked from GOV.UK `/aaib-reports`. **OGL v3.0**. Cache + resale OK with attribution. Does not invent report text. GOV.UK Content API / Search are synopsis / title / link / count only — full TEXT is in the PDF. Skip glossary PDFs and the Annual Safety Review. Not RAIB (twin, PARK). Distinct from `/orr-enforcement`. Habit: new investigation reports post.

**Scope lock:** Official investigation-report PDFs only. First slice is **10** newest official texts including the seed **Eurofox 2K G-CMAX** published **2026-08-20**. Keyed on the GOV.UK page slug (`aaib-investigation-to-eurofox-2k-g-cmax`, …). Not RAIB. Not the Content API synopsis.

Public catalog (`SHOP-INDEX.md` / README) lists this door once live well-known does. MCP tools stay generated from live well-known (do not hardcode a door count). This listing PR does **not** apply on apollo from the cloud VM.

## Lander card copy (product + bag size + price only)

| Field | Value |
| --- | --- |
| Product | UK AAIB investigation reports |
| Bag | Newest 10 official texts |
| Price | `$0.02` via `?id=`; `$0.05` newest 10 |
| Endpoint | https://ticks.bnm.farm/aaib-reports |

This repo does **not** own the bnm.farm lander card. tv-remote follow-up: add a `/aaib-reports` card there after apply, same visual language as PHMSA (product + bag + price).

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">UK AAIB investigation reports</h2>
  <p class="facts" id="aaib-reports-facts">UK AAIB investigation-report extracted text. Live: <strong>10</strong> texts. One document $0.02 via ?id=. $0.05 per 10 (newest 10 default). Free search: /aaib-reports/manifest.json?q=.</p>
  <div class="meta" aria-label="AAIB investigation report payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill">$0.02 ?id=</span>
    <span class="pill" data-nickel="aaib-reports-facts">$0.05 / 10</span>
  </div>
  <nav class="actions" aria-label="AAIB investigation report links">
    <a class="primary" href="https://ticks.bnm.farm/aaib-reports">Endpoint</a>
    <a href="https://ticks.bnm.farm/aaib-reports/manifest.json">Manifest</a>
  </nav>
</article>
```

JS hydrate (same helper as PHMSA):

```js
simpleBag("aaib-reports-facts", "https://ticks.bnm.farm/aaib-reports/manifest.json", "UK AAIB investigation-report extracted text", "official texts");
```

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /aaib-reports` | unpaid → **HTTP 402** | default newest 10 **$0.05** (`50000` atomic); `?id=` one official text **$0.02** (`20000` atomic) |
| `GET /aaib-reports/manifest.json` | free | HTTP 200 title / registration / aircraft / date / official GOV.UK page + PDF URL (no report body). `?q=` search names the id to buy. |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

Older pages are another **$0.05** on the same URL (`page` / `before`). If the catalog has fewer than 10, the nickel GET is the whole current set.

## Source of truth

- Official hub (not sold): https://www.gov.uk/aaib-reports
- Search (synopsis / title / link only): https://www.gov.uk/api/search.json?filter_format=aaib_report
- Content API (synopsis only): https://www.gov.uk/api/content/aaib-reports/{slug}
- Official PDFs: `https://assets.publishing.service.gov.uk/media/{id}/{filename}.pdf`
- Seed page: https://www.gov.uk/aaib-reports/aaib-investigation-to-eurofox-2k-g-cmax
- Seed PDF: https://assets.publishing.service.gov.uk/media/6a730cd0de77e2943cd3bbe8/Eurofox_2K_G-CMAX_09-26.pdf
- License: **OGL v3.0**. Attribution: Air Accidents Investigation Branch. Contains public sector information licensed under the Open Government Licence v3.0. Logos reserved.

Paid body keeps `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm` = `"Eurofox 2K G-CMAX"`, `url`, `type=aaib-reports`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official `/aaib-reports` hub). A repeat buyer diffs `asOf` + record ids.

Free manifest is id / registration / aircraft / date / title / pageUrl / sourceUrl only. Investigation needles such as Eurofox `Talgarth` / `AAIB-31440` / `Rotax 915` stay out of unpaid 402 responses.

`data/aaib-reports/` is gitignored. Checked-in free index: `aaib-reports/manifest.json` (titles / links / counts only).

## Leak-test

- GOV.UK Content API `details.body` is the HTML synopsis only (Eurofox ~1689 chars; no `AAIB Bulletin`).
- Search JSON is title / link / public_timestamp only.
- Glossary of abbreviations PDFs are skipped.
- Annual Safety Review is skipped.
- RAIB stays PARK.
- No no-auth JSON/CSV of the investigation **body**. Ship is allowed.

## Apply

Worker apply is **`cursor/apply-aaib-reports-a8df`** @ **`6ab0a3011805a8fe8247c14bc4fb96179499dfae`** (base `cursor/apply-phmsa-orders-7781`). This listing PR does **not** apply on apollo from the cloud VM. Do not deploy or restart `idaho-ticks-x402` from this PR. Do not touch `/ticks` AMS. Do not replace the live PHMSA cache.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/apply-aaib-reports-a8df
git checkout 6ab0a3011805a8fe8247c14bc4fb96179499dfae
export AAIB_REPORTS_DIR=$HOME/projects/mcp-proxy/data/aaib-reports
mkdir -p "$AAIB_REPORTS_DIR"
npm run build
AAIB_REPORTS_LIMIT=10 AAIB_REPORTS_MAX_FETCH=10 npm run collect:aaib-reports
systemctl --user restart idaho-ticks-x402.service
```

After apply, `npm run sync:live-shop` on catalog `main` so SHOP-INDEX / OpenAPI / README pick up `/aaib-reports` from live well-known. Then add `/aaib-reports` to `REQUIRED_LIVE_PATHS`.

Collector (later growth; first slice stays thin — do not recrawl the ~11k archive):

```bash
export AAIB_REPORTS_DIR=$HOME/projects/mcp-proxy/data/aaib-reports
AAIB_REPORTS_LIMIT=10 AAIB_REPORTS_MAX_FETCH=10 npm run collect:aaib-reports
```
