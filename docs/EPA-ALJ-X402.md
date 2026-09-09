# Apply GET /epa-alj onto the live ticks tip

Official **EPA OALJ Initial Decision and Order** and substantive **ALJ Order** TEXT from PDFs linked on the Decisions and Orders e-docket (`https://yosemite.epa.gov/oarm/alj/alj_web_docket.nsf/Decisions+and+Orders?OpenView`). Host NSF is **OALJ** `yosemite.epa.gov/oarm/alj/alj_web_docket.nsf`, not RHC `oa/rhc/epaadmin.nsf`. 17 U.S.C. § 105. Ugly PDF/HTML cache. Extracted-body door: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as sibling body doors. Empty delta is unpaid 304.

Prefer merits **Initial Decision** PDFs. Include substantive **ALJ Order** PDFs. **SKIP** Consent Agreement and Final Order (CAFO) rows on this index when they twin live `/fifra-orders` / `/epa-cafo` RHC bags. Do not re-pitch those doors or `/oshrc-orders`.

Free discovery is leak-clean: case / docket / date / label + `paidUrl` only. **No `sourceUrl`** on free cards (strip already live). Paid `?id=` / page still attribute the official PDF.

**Path:** `/epa-alj` · **$0.05** page / **$0.02** `?id=` · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base
**Collector:** Decisions and Orders view walk + document-page `$File` PDF + `pdftotext`.
**Seeds:** Wilson’s Pest Control / Timothy Wilson d/b/a `FIFRA-07-2023-0135` Initial Decision 2026-09-01. Pepperell, LLC `CWA-01-2026-0030` ALJ Order 2026-09-04.

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Stacked on the live strip-free-sourceUrl tip (`100430e` / [PR 219](https://github.com/bnmbnmai/mcp-proxy/pull/219) apply-record [PR 220](https://github.com/bnmbnmai/mcp-proxy/pull/220)).

## Collect command

```bash
EPA_ALJ_DIR=$HOME/projects/mcp-proxy/data/epa-alj \
  EPA_ALJ_LIMIT=8 EPA_ALJ_MAX_FETCH=12 \
  npm run collect:epa-alj
```

Fixture / dry collect (no secrets):

```bash
EPA_ALJ_DIR=/tmp/epa-alj-dry \
  EPA_ALJ_HTML_DIR=src/fixtures/epa-alj \
  EPA_ALJ_LIMIT=8 EPA_ALJ_MAX_FETCH=0 \
  npm run collect:epa-alj
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/epa-alj-door-0cd5
git checkout cursor/epa-alj-door-0cd5
export EPA_ALJ_DIR=$HOME/projects/mcp-proxy/data/epa-alj
mkdir -p "$EPA_ALJ_DIR"
npm run build
EPA_ALJ_LIMIT=8 EPA_ALJ_MAX_FETCH=12 npm run collect:epa-alj
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** that unit. docker / other units untouched.

Applied on apollo (2026-09-09): **serving SHA `dbaed3c`** (apply-record [PR 222](https://github.com/bnmbnmai/mcp-proxy/pull/222); merge of [PR 221](https://github.com/bnmbnmai/mcp-proxy/pull/221) `3bc1dd7` onto `cursor/apply-strip-free-sourceurl-ec52` @ `e62a38b` / prior serving `100430e`). Restarted **only** `idaho-ticks-x402.service` at **2026-09-09 16:33:40 MDT** (PID 1510988). One-door collect EXIT 0: listedCount **70**, `addedThisRun` 8, `fetchedPdfs` 5, skipped 4, asOf **2026-09-04**, fetchedAt **2026-09-09T22:33:32.301Z**. Seeds `FIFRA-07-2023-0135-2026-09-01` (Wilson) and `CWA-01-2026-0030-2026-09-04` (Pepperell) are in the free manifest (case/docket/date/label + `paidUrl` only; **no** `sourceUrl`). Unpaid `GET https://ticks.bnm.farm/epa-alj` is **402** at $0.05; `?id=FIFRA-07-2023-0135-2026-09-01` is **402** at $0.02. `/.well-known/x402` lists `/epa-alj` among **56** doors (was 55). Banner `mcp /mcp — 56 tools`. Siblings `/ticks` `/oshrc-orders` `/epa-cafo` still 402. No new collect cron. Lander card pasted on live bnm.farm after the BSEE card (OSHRC card is not on that lander).

## Lander card (tv-remote / bnm.farm)

Paste after the OSHRC card (live apply: after BSEE; OSHRC card was not on bnm.farm). Product + bag size + price only. Count hydrates from the free manifest — do not hardcode a door count.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">EPA OALJ decisions</h2>
  <p class="facts" id="epa-alj-facts">EPA OALJ Initial Decision and Order + ALJ Order text. Live bag size hydrates from the free manifest. $0.02 one text / $0.05 newest 10.</p>
  <div class="meta" aria-label="EPA OALJ decision payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="epa-alj-facts">$0.02 / $0.05</span>
  </div>
  <nav class="actions" aria-label="EPA OALJ decision links">
    <a class="primary" href="https://ticks.bnm.farm/epa-alj">Endpoint</a>
    <a href="https://ticks.bnm.farm/epa-alj/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("epa-alj-facts", "https://ticks.bnm.farm/epa-alj/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("epa-alj-facts").innerHTML;
  return "EPA OALJ Initial Decision and Order + ALJ Order text. Live: <strong>" + n + "</strong> official texts. $0.02 one text / $0.05 newest 10.";
});
```

## After apply

- unpaid `GET https://ticks.bnm.farm/epa-alj` is HTTP 402 at $0.05
- unpaid `GET ?id=FIFRA-07-2023-0135-2026-09-01` is HTTP 402 at $0.02
- empty `?since=` delta is unpaid 304
- free `GET /epa-alj/manifest.json` is HTTP 200, case/docket/date/label only, **no sourceUrl**, no decision body
- paid GET returns JSON `cards[].body` + `records[]`
- `/.well-known/x402` lists `/epa-alj`
- `/` shop JSON lists the product
- `/mcp` tools include `epa-alj` generated from well-known
