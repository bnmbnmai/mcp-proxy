# Apply GET /aaib-reports onto the live ticks tip

Official **UK AAIB investigation-report TEXT** from `assets.publishing.service.gov.uk` PDFs linked on GOV.UK `/aaib-reports`. OGL v3.0. Cache + resale OK with attribution. Leak-clean: Content API / Search are synopsis only. Skip glossary PDFs, Annual Safety Review, RAIB.

**Price:** page $0.05 (`50000`); one `?id=` $0.02 (`20000`). Wallet stays `0xf59621FC406D266e18f314Ae18eF0a33b8401004`.

**First cache:** `cardCount` **10**, `asOf` **2026-08-20**. Seed: Eurofox 2K G-CMAX. Official PDFs stay on Apollo under `data/aaib-reports/` (gitignored).

This cloud VM cannot publish `ticks.bnm.farm` and must not restart `idaho-ticks-x402`. Live `/aaib-reports` stays **404** until apollo checks out this apply SHA and restarts the door with `AAIB_REPORTS_DIR` pointed at the harvest (or a fresh `npm run collect:aaib-reports`). Merge into the live cache. Do not replace other doors. Do not replace the live PHMSA 16-card cache.

## Apply on apollo / media-box (`systemctl --user`; no sudo)

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/apply-aaib-reports-a8df
git checkout cursor/apply-aaib-reports-a8df
# apply SHA is the tip of this branch after push — document it in the PR
export AAIB_REPORTS_DIR=$HOME/projects/mcp-proxy/data/aaib-reports
mkdir -p "$AAIB_REPORTS_DIR"
npm run build
AAIB_REPORTS_LIMIT=10 AAIB_REPORTS_MAX_FETCH=10 npm run collect:aaib-reports
systemctl --user restart idaho-ticks-x402.service
```

Set `AAIB_REPORTS_DIR` on the unit if it is not already in the environment file. Restart **only** `idaho-ticks-x402.service`.

## Lander card (tv-remote / bnm.farm)

Paste after the PHMSA card. Product + bag size + price. Hydrate from the free manifest.

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

```js
simpleBag("aaib-reports-facts", "https://ticks.bnm.farm/aaib-reports/manifest.json", "UK AAIB investigation-report extracted text", "official texts");
```

## After apply

- unpaid `GET https://ticks.bnm.farm/aaib-reports` is HTTP 402 at $0.05
- unpaid `GET ?id=aaib-investigation-to-eurofox-2k-g-cmax` is HTTP 402 at $0.02
- free `GET /aaib-reports/manifest.json` is HTTP 200, `cardCount=10`, `asOf=2026-08-20`, no body
- `/.well-known/x402` lists `/aaib-reports`
- `/` shop JSON lists the product
- `/mcp` tools include `aaib-reports` generated from well-known (no hardcoded door count)
- lander https://bnm.farm/ shows the AAIB card
- catalog `main`: `npm run sync:live-shop` then add `/aaib-reports` to `REQUIRED_LIVE_PATHS`
