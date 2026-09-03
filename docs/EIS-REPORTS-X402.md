# Apply GET /eis-reports onto the live ticks tip

Official **EPA NEPA Environmental Impact Statement PDFs** from CDX e-NEPA (`cdxapps.epa.gov/cdx-enepa-II`). 17 U.S.C. § 105. Ugly PDF cache. Paid GET is one official EIS document PDF. Free manifest is titles / links / counts only. Skip EPA comment letters and “Summary for the …” teasers. Habit: last-week FR filings; PDFs since ~2012.

**Price:** **$0.05** (`50000`) one official PDF, including `?id=`. Wallet stays `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. Not an extracted-text door. Not a wrap of search/details HTML.

**Download gate:** ALTCHA SHA-256 proof-of-work (not a picture captcha). Collector solves it in-process (~0.3s, `maxnumber` 1e6) and injects the payload into `#downloadFormCaptcha`, then `startDownload('downloadAttachment', attachmentId)` in headless Chrome. Raw HTTP POST after a valid PoW 302s to `cdx.epa.gov/CDX/Login` — that is a bot/session difference, not a second human puzzle. If a real CDX login form or reCAPTCHA/hCaptcha appears, **stop** and report the blocker. Do not ask Bruce to click puzzles.

**Leak-test:** no-auth JSON / `?format=json` / `/api/eis/{id}` do **not** dump EIS PDF bytes. Free search/details HTML is titles, CEQ numbers, dates, agencies, attachment IDs. If a no-auth JSON starts dumping the EIS body, KILL the door.

**First cache:** last-week habit + Clinch River SEIS seed `20260036` (eisId `555705`, attachment `555711`, FR `2026-04-10`). Official PDFs stay on Apollo under `data/eis-reports/` (gitignored).

This cloud VM is **not** apollo. Do **not** fight apollo / media-box for the live apply if a LeadRTB agent (`bc-6ee4f761`) is still on the box. Leave this handoff.

## Apply on apollo / media-box (`systemctl --user`; no sudo)

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/eis-reports-dedd
git checkout cursor/eis-reports-dedd
# Chrome is required for live PDF fetch. puppeteer-core is a package.json dep (no bundled Chromium).
export CHROME_PATH="${CHROME_PATH:-/usr/local/bin/google-chrome}"
test -x "$CHROME_PATH" || CHROME_PATH=$(command -v google-chrome || command -v chromium || true)
export EIS_REPORTS_DIR=$HOME/projects/mcp-proxy/data/eis-reports
mkdir -p "$EIS_REPORTS_DIR"
npm install
npm run build
EIS_REPORTS_LIMIT=10 EIS_REPORTS_MAX_FETCH=10 npm run collect:eis-reports
systemctl --user restart idaho-ticks-x402.service
```

Set `EIS_REPORTS_DIR` and `CHROME_PATH` on the unit if they are not already in the environment file. Restart **only** `idaho-ticks-x402.service`. Merge into the live cache. Do not replace other doors. Do not replace the live HHS OIG, CSB, AAIB, or PHMSA caches.

## Lander card (tv-remote / bnm.farm)

Paste after the HHS OIG card. Product + bag size + price only. No “not this” copy.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">EPA NEPA EIS reports</h2>
  <p class="facts" id="eis-reports-facts">EPA NEPA Environmental Impact Statement PDFs. Live: <strong>2</strong> PDFs. $0.05 one official PDF.</p>
  <div class="meta" aria-label="EPA NEPA EIS payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="eis-reports-facts">$0.05 / 1 PDF</span>
  </div>
  <nav class="actions" aria-label="EPA NEPA EIS links">
    <a class="primary" href="https://ticks.bnm.farm/eis-reports">Endpoint</a>
    <a href="https://ticks.bnm.farm/eis-reports/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("eis-reports-facts", "https://ticks.bnm.farm/eis-reports/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("eis-reports-facts").innerHTML;
  return "EPA NEPA Environmental Impact Statement PDFs. Live: <strong>" + n + "</strong> PDFs. $0.05 one official PDF.";
});
```

## After apply

- unpaid `GET https://ticks.bnm.farm/eis-reports` is HTTP 402 at $0.05
- unpaid `GET ?id=20260104` is HTTP 402 at $0.05
- free `GET /eis-reports/manifest.json` is HTTP 200, titles/links/counts only, no PDF bytes
- paid GET returns `application/pdf` (`%PDF-`) for a full EIS document (not a comment letter, not a “Summary for the” teaser)
- `/.well-known/x402` lists `/eis-reports`
- `/` shop JSON lists the product
- `/mcp` tools include `eis-reports` generated from well-known (no hardcoded door count)
- lander https://bnm.farm/ shows the EIS card
- catalog `npm run sync:live-shop` is a **later** listing PR on `main` after this apply is live
