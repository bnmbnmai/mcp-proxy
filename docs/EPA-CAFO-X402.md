# Apply GET /epa-cafo onto the live ticks tip

Official **EPA Part 22 Consent Agreement and Final Order (CAFO) / Expedited Settlement Agreement (ESA) administrative penalty letter TEXT** from PDFs linked on the Administrative Enforcement Dockets board (`https://yosemite.epa.gov/oa/rhc/epaadmin.nsf` Filings + Dockets by Statute) and regional `epa.gov/system/files` mirrors hosting the same letter body. 17 U.S.C. § 105. Ugly PDF/HTML cache. Extracted-body door: free manifest, `?id=` one official letter at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as PRs 185/187/188.

Do not sell ECHO facility/enforcement JSON, ICIS-FE&C CSV columns, HQ settlement-summary HTML alone (`https://www.epa.gov/enforcement/civil-cases-and-settlements` is chrome, not the SKU), NPDES permit PDFs (live `/npdes-permits`), FIFRA-only packs (live `/fifra-orders`), or Superfund RODs (live `/superfund-rods`). Index is institution / docket / date / PDF URL only — full TEXT is in the letter PDF.

**Path:** `/epa-cafo` · **$0.05** page / **$0.02** `?id=` · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base
**Collector:** docket-table walk (CWA/CAA/RCRA/EPCRA/SDWA/TSCA/CERCLA, not FIFRA) + Filings CAFO/ESA labels + `pdftotext`.
**Seed:** `CWA-06-2026-1792` (Apache Feedyard, Complaint / CAFO, 2026-07-14). Habit: Camino Real Foods `MM-09-2026-0093`, D&S Cattle `CWA-07-2026-0005`.

MCP tools are generated from live well-known (no hardcoded door count).

## Collect command

```bash
EPA_CAFO_DIR=$HOME/projects/mcp-proxy/data/epa-cafo \
  EPA_CAFO_LIMIT=8 EPA_CAFO_MAX_FETCH=12 \
  npm run collect:epa-cafo
```

Fixture / dry collect (no secrets):

```bash
EPA_CAFO_DIR=/tmp/epa-cafo-dry \
  EPA_CAFO_HTML_DIR=src/fixtures/epa-cafo \
  EPA_CAFO_LIMIT=8 EPA_CAFO_MAX_FETCH=0 \
  npm run collect:epa-cafo
```

Live board + seed + recent letters (no settle key):

```bash
EPA_CAFO_DIR=/tmp/epa-cafo-live \
  EPA_CAFO_LIMIT=8 EPA_CAFO_MAX_FETCH=12 \
  npm run collect:epa-cafo
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`. Do not flip Origin.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/epa-cafo-door-74df
git checkout cursor/epa-cafo-door-74df
export EPA_CAFO_DIR=$HOME/projects/mcp-proxy/data/epa-cafo
mkdir -p "$EPA_CAFO_DIR"
npm run build
EPA_CAFO_LIMIT=8 EPA_CAFO_MAX_FETCH=12 npm run collect:epa-cafo
systemctl --user restart idaho-ticks-x402.service
```

## Lander card (tv-remote / bnm.farm)

Paste after the FSIS humane-handling card. Product + bag size + price only.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">EPA CAFO / ESA letters</h2>
  <p class="facts" id="epa-cafo-facts">EPA Part 22 CAFO / ESA administrative penalty letter text. Live: <strong>8</strong> official texts. $0.02 one text / $0.05 newest 10.</p>
  <div class="meta" aria-label="EPA CAFO letter payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="epa-cafo-facts">$0.02 / $0.05</span>
  </div>
  <nav class="actions" aria-label="EPA CAFO letter links">
    <a class="primary" href="https://ticks.bnm.farm/epa-cafo">Endpoint</a>
    <a href="https://ticks.bnm.farm/epa-cafo/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("epa-cafo-facts", "https://ticks.bnm.farm/epa-cafo/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("epa-cafo-facts").innerHTML;
  return "EPA Part 22 CAFO / ESA administrative penalty letter text. Live: <strong>" + n + "</strong> official texts. $0.02 one text / $0.05 newest 10.";
});
```

## After apply

- unpaid `GET https://ticks.bnm.farm/epa-cafo` is HTTP 402 at $0.05
- unpaid `GET ?id=CWA-06-2026-1792` is HTTP 402 at $0.02
- empty `?since=` delta is unpaid 304
- free `GET /epa-cafo/manifest.json` is HTTP 200, counts + source URLs only, no letter body
- paid GET returns JSON `cards[].body` + `records[]`
- `/.well-known/x402` lists `/epa-cafo`
- `/` shop JSON lists the product
- `/mcp` tools include `epa-cafo` generated from well-known
