# Apply GET /bsee-reports onto the live ticks tip

Official **BSEE District Accident Investigation Report** TEXT from PDFs linked on the district investigation-reports index (`https://www.bsee.gov/what-we-do/incident-investigations/offshore-incident-investigations/district-investigation-reports`). 17 U.S.C. § 105 (BSEE / DOI). Ugly PDF cache. Extracted-body door: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as sibling body doors. Empty delta is unpaid 304.

Prefer full report PDF text. Do **not** sell BSEE Data Center INC Online Query / company INC metadata (`https://www.data.bsee.gov/Company/INCs/Default.aspx`), INC counts, eWell WAR, platform INC dumps, ASCII/zip company dumps, or CSB / PHMSA / FMSHRC / EPA CAFO / NTSB packs already live elsewhere.

**Path:** `/bsee-reports` · **$0.05** page / **$0.02** `?id=` · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base
**Collector:** 2026 accordion table scrape + `pdftotext`.
**Seeds:** Cantium MP 298 A Lease G01315 fire 24-MAY-2026 (`PBA 1210/11` glycol hose). Also Talos MU 85 conductor drop 17-MAY-2026; Arena EI 320B 01-JUL-2026.

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Stacked on `cursor/apply-settle-metrics-65c4`.

## Collect command

```bash
BSEE_REPORTS_DIR=$HOME/projects/mcp-proxy/data/bsee-reports \
  BSEE_REPORTS_LIMIT=18 BSEE_REPORTS_MAX_FETCH=20 \
  npm run collect:bsee-reports
```

Fixture / dry collect (no secrets):

```bash
BSEE_REPORTS_DIR=/tmp/bsee-reports-dry \
  BSEE_REPORTS_HTML_DIR=src/fixtures/bsee-reports \
  BSEE_REPORTS_LIMIT=18 BSEE_REPORTS_MAX_FETCH=0 \
  npm run collect:bsee-reports
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/bsee-reports-door-b89c
git checkout cursor/bsee-reports-door-b89c
export BSEE_REPORTS_DIR=$HOME/projects/mcp-proxy/data/bsee-reports
mkdir -p "$BSEE_REPORTS_DIR"
npm run build
BSEE_REPORTS_LIMIT=18 BSEE_REPORTS_MAX_FETCH=20 npm run collect:bsee-reports
systemctl --user restart idaho-ticks-x402.service
```

## Lander card (tv-remote / bnm.farm)

Paste after the FMSHRC card. Product + bag size + price only. Count hydrates from the free manifest — do not hardcode a door count.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">BSEE district investigation reports</h2>
  <p class="facts" id="bsee-reports-facts">BSEE District Accident Investigation Report text. Live bag size hydrates from the free manifest. $0.02 one text / $0.05 newest 10.</p>
  <div class="meta" aria-label="BSEE district investigation payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="bsee-reports-facts">$0.02 / $0.05</span>
  </div>
  <nav class="actions" aria-label="BSEE district investigation links">
    <a class="primary" href="https://ticks.bnm.farm/bsee-reports">Endpoint</a>
    <a href="https://ticks.bnm.farm/bsee-reports/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("bsee-reports-facts", "https://ticks.bnm.farm/bsee-reports/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("bsee-reports-facts").innerHTML;
  return "BSEE District Accident Investigation Report text. Live: <strong>" + n + "</strong> official texts. $0.02 one text / $0.05 newest 10.";
});
```

## After apply

- unpaid `GET https://ticks.bnm.farm/bsee-reports` is HTTP 402 at $0.05
- unpaid `GET ?id=mp-298-cantium-2026-05-24` is HTTP 402 at $0.02
- empty `?since=` delta is unpaid 304
- free `GET /bsee-reports/manifest.json` is HTTP 200, counts + title/date/lease/area-block/accident-type + official PDF URL only, no report body
- paid GET returns JSON `cards[].body` + `records[]`
- `/.well-known/x402` lists `/bsee-reports`
- `/` shop JSON lists the product
- `/mcp` tools include `bsee-reports` generated from well-known
