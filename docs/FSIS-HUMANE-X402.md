# Apply GET /fsis-humane onto the live ticks tip

Official **USDA FSIS humane-handling enforcement letter TEXT** from PDFs linked on `https://www.fsis.usda.gov/inspection/regulatory-enforcement/humane-handling-enforcement` (NOS, NOIE, deferral / LOD, abeyance / NOSHA, reinstatement / NOROS / NOROSHA). 17 U.S.C. § 105. Ugly PDF/HTML cache. Extracted-body door: free manifest, `?id=` one official letter at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as PRs 185/187/188.

Do not sell MPI directory rows, QER table-only packs, HATS time-series, or FOIA people dumps. Index HTML is establishment / letter type / date / PDF URL only — full TEXT is in the letter PDF. OSHA/DOL open-data JSON is a kill.

**Path:** `/fsis-humane` · **$0.05** page / **$0.02** `?id=` · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base
**Collector:** table-scrape + wget Safari UA (Akamai 403s curl) + `pdftotext`; OCR via tesseract when the PDF is a scan.
**Seed:** `7420MV-NOROS-04252024` (Honest Meats, LLC, Notice of Reinstatement of Suspension, 2024-04-25). Habit: current index letters including Salsabil M47033 NOS/NOSHA.

MCP tools are generated from live well-known (no hardcoded door count).

## Collect command

```bash
FSIS_HUMANE_DIR=$HOME/projects/mcp-proxy/data/fsis-humane \
  FSIS_HUMANE_LIMIT=12 FSIS_HUMANE_MAX_FETCH=16 \
  npm run collect:fsis-humane
```

Fixture / dry collect (no secrets):

```bash
FSIS_HUMANE_DIR=/tmp/fsis-humane-dry \
  FSIS_HUMANE_HTML_DIR=src/fixtures/fsis-humane \
  FSIS_HUMANE_LIMIT=8 FSIS_HUMANE_MAX_FETCH=0 \
  npm run collect:fsis-humane
```

Live index + seed + recent letters (wget Safari UA, no settle key):

```bash
FSIS_HUMANE_DIR=/tmp/fsis-humane-live \
  FSIS_HUMANE_LIMIT=8 FSIS_HUMANE_MAX_FETCH=8 \
  npm run collect:fsis-humane
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

This VM is not the media-box worker. Live apply is blocked until that Cursor worker advertises both `tv-remote` and `mcp-proxy` dirs (or an existing deploy path). Do not cut over to Origin mid-ship.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/fsis-humane-door-d9b9
git checkout cursor/fsis-humane-door-d9b9
export FSIS_HUMANE_DIR=$HOME/projects/mcp-proxy/data/fsis-humane
mkdir -p "$FSIS_HUMANE_DIR"
npm run build
FSIS_HUMANE_LIMIT=12 FSIS_HUMANE_MAX_FETCH=16 npm run collect:fsis-humane
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`. Do not flip Origin.

## Lander card (tv-remote / bnm.farm)

Paste after the EIS / HHS OIG cards. Product + bag size + price only.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">FSIS humane-handling letters</h2>
  <p class="facts" id="fsis-humane-facts">USDA FSIS humane-handling enforcement letter text. Live: <strong>10</strong> official texts. $0.02 one text / $0.05 newest 10.</p>
  <div class="meta" aria-label="FSIS humane-handling letter payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="fsis-humane-facts">$0.02 / $0.05</span>
  </div>
  <nav class="actions" aria-label="FSIS humane-handling letter links">
    <a class="primary" href="https://ticks.bnm.farm/fsis-humane">Endpoint</a>
    <a href="https://ticks.bnm.farm/fsis-humane/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("fsis-humane-facts", "https://ticks.bnm.farm/fsis-humane/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("fsis-humane-facts").innerHTML;
  return "USDA FSIS humane-handling enforcement letter text. Live: <strong>" + n + "</strong> official texts. $0.02 one text / $0.05 newest 10.";
});
```

## After apply

- unpaid `GET https://ticks.bnm.farm/fsis-humane` is HTTP 402 at $0.05
- unpaid `GET ?id=7420mv-noros-04252024` is HTTP 402 at $0.02
- empty `?since=` delta is unpaid 304
- free `GET /fsis-humane/manifest.json` is HTTP 200, counts + source URLs only, no letter body
- paid GET returns JSON `cards[].body` + `records[]`
- `/.well-known/x402` lists `/fsis-humane`
- `/` shop JSON lists the product
- `/mcp` tools include `fsis-humane` generated from well-known
