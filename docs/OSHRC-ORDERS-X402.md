# Apply GET /oshrc-orders onto the live ticks tip

Official **OSHRC ALJ Decision and Order / EAJA Decision** and **Commission Final Order / Commission Decision** TEXT from PDF + HTML caches linked on the rolling decision-search board (`https://www.oshrc.gov/decision-search/`). 17 U.S.C. § 105. Ugly PDF/HTML cache. Extracted-body door: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as sibling body doors. Empty delta is unpaid 304.

Walk the official index. Do **not** wrap a free `wp-json` decision-narrative API. Skip protectiveness-style junk, e-filing / password / org-chart guides, settlement/default-only packs, and FMSHRC / BSEE sibling wraps.

**Path:** `/oshrc-orders` · **$0.05** page / **$0.02** `?id=` · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base
**Collector:** decision-search ALJ + Commission table scrape + `pdftotext` with official HTML-twin fallback.
**Seeds:** Finley Farmers Grain & Elevator `24-0889-eaja` (EAJA final 2026-09-04). STIS, Inc. `24-0702` (ALJ Decision and Order 2026-07-15).

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Stacked on the live Superfund FYR tip (`16cecab` / apply-record [PR 212](https://github.com/bnmbnmai/mcp-proxy/pull/212)), which itself sits on `cursor/x402list-ownership-c90d`.

## Collect command

```bash
OSHRC_ORDERS_DIR=$HOME/projects/mcp-proxy/data/oshrc-orders \
  OSHRC_ORDERS_LIMIT=8 OSHRC_ORDERS_MAX_FETCH=12 \
  npm run collect:oshrc-orders
```

Fixture / dry collect (no secrets):

```bash
OSHRC_ORDERS_DIR=/tmp/oshrc-orders-dry \
  OSHRC_ORDERS_HTML_DIR=src/fixtures/oshrc-orders \
  OSHRC_ORDERS_LIMIT=8 OSHRC_ORDERS_MAX_FETCH=0 \
  npm run collect:oshrc-orders
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/oshrc-orders-door-84d3
git checkout cursor/apply-oshrc-orders-6483
export OSHRC_ORDERS_DIR=$HOME/projects/mcp-proxy/data/oshrc-orders
mkdir -p "$OSHRC_ORDERS_DIR"
npm run build
OSHRC_ORDERS_LIMIT=8 OSHRC_ORDERS_MAX_FETCH=12 npm run collect:oshrc-orders
systemctl --user restart idaho-ticks-x402.service
```

Applied on apollo (2026-09-08): **serving SHA `44e7a2e`** (apply-record [PR 214](https://github.com/bnmbnmai/mcp-proxy/pull/214); merge of [PR 213](https://github.com/bnmbnmai/mcp-proxy/pull/213) onto `cursor/apply-superfund-fyr-title-63f9` @ `d0e6069`). Restarted **only** `idaho-ticks-x402.service` at **2026-09-08 16:40:45 MDT** (PID 291681). Collect wrote **8** official texts (`addedThisRun` 8, `fetchedPdfs` 10, skipped 2), listedCount **20**, asOf **2026-09-04**, fetchedAt **2026-09-08T22:40:41.204Z**. Seeds `24-0889-eaja` (Finley) and `24-0702` (STIS) are in the free manifest (operator/docket/date/sourceUrl only). Unpaid `GET https://ticks.bnm.farm/oshrc-orders` is **402** at $0.05; `?id=24-0889-eaja` is **402** at $0.02. `/.well-known/x402` lists `/oshrc-orders` among **55** doors. Banner `mcp /mcp — 55 tools`. Siblings `/ticks` `/fmshrc-orders` still 402. No new collect cron. No lander PR from this apply.

## Lander card (tv-remote / bnm.farm)

Paste after the BSEE card. Product + bag size + price only. Count hydrates from the free manifest — do not hardcode a door count.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">OSHRC ALJ + Commission orders</h2>
  <p class="facts" id="oshrc-orders-facts">OSHRC ALJ Decision/Order + Commission Final Order text. Live bag size hydrates from the free manifest. $0.02 one text / $0.05 newest 10.</p>
  <div class="meta" aria-label="OSHRC decision payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="oshrc-orders-facts">$0.02 / $0.05</span>
  </div>
  <nav class="actions" aria-label="OSHRC decision links">
    <a class="primary" href="https://ticks.bnm.farm/oshrc-orders">Endpoint</a>
    <a href="https://ticks.bnm.farm/oshrc-orders/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("oshrc-orders-facts", "https://ticks.bnm.farm/oshrc-orders/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("oshrc-orders-facts").innerHTML;
  return "OSHRC ALJ Decision/Order + Commission Final Order text. Live: <strong>" + n + "</strong> official texts. $0.02 one text / $0.05 newest 10.";
});
```

## After apply

- unpaid `GET https://ticks.bnm.farm/oshrc-orders` is HTTP 402 at $0.05
- unpaid `GET ?id=24-0889-eaja` is HTTP 402 at $0.02
- empty `?since=` delta is unpaid 304
- free `GET /oshrc-orders/manifest.json` is HTTP 200, counts + source URLs only, no decision body
- paid GET returns JSON `cards[].body` + `records[]`
- `/.well-known/x402` lists `/oshrc-orders`
- `/` shop JSON lists the product
- `/mcp` tools include `oshrc-orders` generated from well-known
