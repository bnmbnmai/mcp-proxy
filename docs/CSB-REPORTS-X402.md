# Apply GET /csb-reports onto the live ticks tip

Official **US Chemical Safety Board final investigation report PDFs** from `csb.gov/assets` and `/file.aspx`. 17 U.S.C. § 105. Ugly PDF cache. Paid GET is the official PDF. Free manifest is titles / links / counts only. Skip Status Change Summary PDFs, current-investigation teasers, and update-only packs. Habit: CSB posts new Final Report Released On dates.

**Price:** **$0.05** (`50000`) one official PDF, including `?id=`. Wallet stays `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. Not an extracted-text door.

**First cache:** first-slice 10 confirmed finals. Seed: Bio-Lab Conyers (`bio-lab_report__public_record_copy_.pdf`, last-modified 2026-08-10). Habit seeds: Givaudan, Dow Louisiana, PEMEX Deer Park. Official PDFs stay on Apollo under `data/csb-reports/` (gitignored).

This cloud VM cannot publish `ticks.bnm.farm` and must not restart `idaho-ticks-x402`. Live `/csb-reports` stays **404** until apollo / media-box checks out this apply SHA and restarts the door with `CSB_REPORTS_DIR` pointed at the harvest (or a fresh `npm run collect:csb-reports`). Merge into the live cache. Do not replace other doors. Do not replace the live AAIB or PHMSA caches.

## Apply on apollo / media-box (`systemctl --user`; no sudo)

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/apply-csb-reports-705d
git checkout cursor/apply-csb-reports-705d
# apply SHA: 19e9406124596755d4ef3f427ea8accf6ba0f6ad
export CSB_REPORTS_DIR=$HOME/projects/mcp-proxy/data/csb-reports
mkdir -p "$CSB_REPORTS_DIR"
npm run build
CSB_REPORTS_LIMIT=10 CSB_REPORTS_MAX_FETCH=10 npm run collect:csb-reports
systemctl --user restart idaho-ticks-x402.service
```

Set `CSB_REPORTS_DIR` on the unit if it is not already in the environment file. Restart **only** `idaho-ticks-x402.service`.

## Lander card (tv-remote / bnm.farm)

Paste after the AAIB card. Product + bag size + price only. No “not this” copy.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">US CSB final investigation reports</h2>
  <p class="facts" id="csb-reports-facts">US CSB final investigation report PDFs. Live: <strong>10</strong> PDFs. $0.05 one official PDF.</p>
  <div class="meta" aria-label="CSB final investigation report payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="csb-reports-facts">$0.05 / 1 PDF</span>
  </div>
  <nav class="actions" aria-label="CSB final investigation report links">
    <a class="primary" href="https://ticks.bnm.farm/csb-reports">Endpoint</a>
    <a href="https://ticks.bnm.farm/csb-reports/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
simpleBag("csb-reports-facts", "https://ticks.bnm.farm/csb-reports/manifest.json", "US CSB final investigation report PDFs", "PDFs");
```

## After apply

- unpaid `GET https://ticks.bnm.farm/csb-reports` is HTTP 402 at $0.05
- unpaid `GET ?id=bio-lab-inc-conyers-fire-and-chemical-release` is HTTP 402 at $0.05
- free `GET /csb-reports/manifest.json` is HTTP 200, titles/links/counts only, no PDF bytes
- paid GET returns `application/pdf` (`%PDF-`)
- `/.well-known/x402` lists `/csb-reports`
- `/` shop JSON lists the product
- `/mcp` tools include `csb-reports` generated from well-known (no hardcoded door count)
- lander https://bnm.farm/ shows the CSB card
- catalog `main`: `npm run sync:live-shop` then add `/csb-reports` to `REQUIRED_LIVE_PATHS`
