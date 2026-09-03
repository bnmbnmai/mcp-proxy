# Apply GET /hhs-oig-reports onto the live ticks tip

Official **HHS OIG–authored full Audit (OAS / A-*) and Evaluation / Inspection (OEI-*) report PDFs** from `oig.hhs.gov/documents/audit/` and `oig.hhs.gov/documents/evaluation/`. 17 U.S.C. § 105. Ugly PDF cache. Paid GET is the official full report PDF. Free manifest is titles / links / counts only. Skip `*-highlights.pdf`, SAR / TMC / budget HTML, and the recommendations HTML index. Kill HHS OIG LEIE `UPDATED.csv`. Habit: 2026 report-card index; new ones still posting.

**Price:** **$0.05** (`50000`) one official PDF, including `?id=`. Wallet stays `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. Not an extracted-text door. Not a wrap of report-card HTML.

**First cache:** 2026 habit OAS / OEI / A-* full reports. Seed: OAS-24-02-004 (`https://oig.hhs.gov/documents/audit/11864/OAS-24-02-004.pdf`, issued 08/31/2026, posted 09/02/2026). Habit seeds: Arizona MH/SUD OAS-24-09-002; Florida MFCU OEI-06-25-00150. Official PDFs stay on Apollo under `data/hhs-oig-reports/` (gitignored).

## Apply on apollo / media-box (`systemctl --user`; no sudo)

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/apply-hhs-oig-reports-1838
git checkout cursor/apply-hhs-oig-reports-1838
export HHS_OIG_REPORTS_DIR=$HOME/projects/mcp-proxy/data/hhs-oig-reports
mkdir -p "$HHS_OIG_REPORTS_DIR"
npm run build
HHS_OIG_REPORTS_LIMIT=100 HHS_OIG_REPORTS_MAX_FETCH=100 HHS_OIG_REPORTS_INDEX_PAGES=8 npm run collect:hhs-oig-reports
systemctl --user restart idaho-ticks-x402.service
```

Set `HHS_OIG_REPORTS_DIR` on the unit if it is not already in the environment file. Restart **only** `idaho-ticks-x402.service`. Merge into the live cache. Do not replace other doors. Do not replace the live CSB, AAIB, or PHMSA caches.

## Lander card (tv-remote / bnm.farm)

Paste after the CSB card. Product + bag size + price only. No “not this” copy.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">HHS OIG audit and evaluation reports</h2>
  <p class="facts" id="hhs-oig-reports-facts">HHS OIG audit and evaluation report PDFs. Live: <strong>10</strong> PDFs. $0.05 one official PDF.</p>
  <div class="meta" aria-label="HHS OIG audit and evaluation report payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="hhs-oig-reports-facts">$0.05 / 1 PDF</span>
  </div>
  <nav class="actions" aria-label="HHS OIG audit and evaluation report links">
    <a class="primary" href="https://ticks.bnm.farm/hhs-oig-reports">Endpoint</a>
    <a href="https://ticks.bnm.farm/hhs-oig-reports/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("hhs-oig-reports-facts", "https://ticks.bnm.farm/hhs-oig-reports/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("hhs-oig-reports-facts").innerHTML;
  return "HHS OIG audit and evaluation report PDFs. Live: <strong>" + n + "</strong> PDFs. $0.05 one official PDF.";
});
```

## After apply

- unpaid `GET https://ticks.bnm.farm/hhs-oig-reports` is HTTP 402 at $0.05
- unpaid `GET ?id=oas-24-02-004` is HTTP 402 at $0.05
- free `GET /hhs-oig-reports/manifest.json` is HTTP 200, titles/links/counts only, no PDF bytes
- paid GET returns `application/pdf` (`%PDF-`) for a full OIG report (not a highlights PDF)
- `/.well-known/x402` lists `/hhs-oig-reports`
- `/` shop JSON lists the product
- `/mcp` tools include `hhs-oig-reports` generated from well-known (no hardcoded door count)
- lander https://bnm.farm/ shows the HHS OIG card
