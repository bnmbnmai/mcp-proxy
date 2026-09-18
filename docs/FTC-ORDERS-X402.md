# Apply GET /ftc-orders onto the live ticks tip

Official **FTC cases-proceedings ALJ Decision / Commission Decision and Order** TEXT from ugly official PDFs on `ftc.gov/system/files/ftc_gov/pdf/` linked from `ftc.gov/legal-library/browse/cases-proceedings` (OSCAR). 17 U.S.C. § 105. Same extracted-body pipe as `/fmc-orders` / `/oalj-decisions`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as sibling body doors. Empty delta is unpaid 304.

Collector shape: walk cases-proceedings listing + case pages → official `/system/files/ftc_gov/pdf/` → `pdftotext`. Scout seeds (Jason Scott DVM Docket 9449 ALJ Decision 2026-08-31, Overly 9443, Juarez-Rufino 9444, Beretta Decision and Order) are **examples, not a frozen list**. Fresh ALJ Decision / Decision of the ALJ / Decision and Order rows are first-class. Habit is ongoing OSCAR / cases-proceedings.

**Harvest FTC-authored ALJ Decision / Decision and Order PDFs only.** Prefer substantive ALJ Decision and Commission Decision and Order bodies.

**KILL / do not wrap:** `/ftc-wl` warning letters. Complaints. ACCO/AAPC. Motions / briefs. Federal Register HTML wraps. CourtListener mirrors. Remand / vacate Commission orders. Distinct from live `/ftc-wl` `/fmc-orders`. Not `/dea-orders`.

Free discovery is leak-clean: counts + docket / OSCAR / date / institution + `paidUrl` only. **No `sourceUrl`** on free cards (live strip). Paid `?id=` / page still attribute the official PDF. Full ALJ Decision / Decision and Order narrative lives in the PDF, not the card JSON.

**Path:** `/ftc-orders` · **$0.05** page / **$0.02** `?id=` · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base
**Collector:** case HTML → official FTC PDF + `pdftotext`.
**Seeds (Scout examples, not a frozen list):** **9449** Jason Scott DVM ALJ Decision served 2026-08-31 (`616193.2026.08.31_..._0.pdf`); **9443** Overly ALJ Decision; **9444** Juarez-Rufino Decision of the ALJ; **Beretta** Decision and Order (`Beretta-Ruger-Order.pdf`).

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Stacked on the live FMC apply tip (`cursor/fmc-orders-0443` / `fc83faf`). Branch `cursor/ftc-orders-door-127f`.

## Collect command

```bash
FTC_ORDERS_DIR=$HOME/projects/mcp-proxy/data/ftc-orders \
  FTC_ORDERS_LIMIT=5 FTC_ORDERS_MAX_FETCH=8 \
  npm run collect:ftc-orders
```

Fixture / dry collect (no secrets, no live PDF fetch):

```bash
FTC_ORDERS_DIR=/tmp/ftc-orders-dry \
  FTC_ORDERS_HTML_DIR=src/fixtures/ftc-orders \
  FTC_ORDERS_LIMIT=5 FTC_ORDERS_MAX_FETCH=0 \
  npm run collect:ftc-orders
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`. Do not message Bruce.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/ftc-orders-door-127f
git checkout cursor/ftc-orders-door-127f
export FTC_ORDERS_DIR=$HOME/projects/mcp-proxy/data/ftc-orders
mkdir -p "$FTC_ORDERS_DIR"
npm run build
FTC_ORDERS_LIMIT=5 FTC_ORDERS_MAX_FETCH=8 npm run collect:ftc-orders
# add FTC_ORDERS_DIR to idaho-ticks-x402.service user unit
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** that unit. docker / other units untouched. No new collect cron — existing 07:45 / 19:45 America/Boise `ticks-collect.sh` walks live well-known and runs `build/ftc-orders.js` once `/ftc-orders` is on well-known.

Applied on apollo (2026-09-17): **serving SHA `73853b6`** ([PR 244](https://github.com/bnmbnmai/mcp-proxy/pull/244) merge `60b5364` / head `03a23d86` onto live tip `cursor/collect-well-known-timeout-71e6` / `29db46a`; apply-record [PR 245](https://github.com/bnmbnmai/mcp-proxy/pull/245) `cursor/ftc-orders-apply-7c31`). Restarted **only** `idaho-ticks-x402.service` at **2026-09-17 19:11:25 MDT** (PID 3146339). Added `FTC_ORDERS_DIR` to the user unit. Did **not** start a first-slice collect — evening 7:45 owns the next bag walk; free manifest `cardCount` **0** until that walk. Unpaid `GET https://ticks.bnm.farm/ftc-orders` is **402** at $0.05. Live `/.well-known/x402` is **62** and lists `https://ticks.bnm.farm/ftc-orders`. Free `/ftc-orders/manifest.json` is **200**. MCP banner: `62 tools from /.well-known/x402`.

Cloud re-read 2026-09-18T04:35Z: `cardCount` **0**. Re-read 2026-09-18T04:56Z: free manifest `cardCount` **5**, `fetchedAt` 2026-09-18T04:40:38Z (evening collect wrote the first bag; do not start a second walk). Loop-closer draft: [`LIVE-DOOR-LOOP-CLOSER.md`](./LIVE-DOOR-LOOP-CLOSER.md). Lander card paste below — apply on the tv-remote **live tip** (`cursor/lander-61-apply-c0a4` lineage), not stub `main`. TV-remote PR: [bnmbnmai/tv-remote#98](https://github.com/bnmbnmai/tv-remote/pull/98) (`cursor/ftc-orders-lander-card-1bc3` onto `cursor/lander-61-apply-c0a4`). Ships `ftc-orders-lander.patch` + snippet; do not apply neutralized probe branch `cursor/ftc-orders-lander-1bc3`.

Applied on apollo (2026-09-17 23:12 MDT): pulled live tip `cursor/ftc-orders-apply-7c31` **serving SHA `e4429ef`** (squash [#246](https://github.com/bnmbnmai/mcp-proxy/pull/246) AMS `mergeFailedAmsSlugs` + [#248](https://github.com/bnmbnmai/mcp-proxy/pull/248) stranger-settle Chief ping; ETag/#243 and `/ftc-orders` already on tip). Restarted **only** `idaho-ticks-x402.service` at **2026-09-17 23:12:08 MDT** (PID 3365146; previous 3146339). Unpaid `GET /ticks` **402**. Live `llms.txt` still has `## Table rebuy`. `data/stranger-settle-alert.txt` present/writable (journal scan only; no invented settles). WK **62**. `/ftc-orders` manifest `cardCount` **5**. Did **not** start a second all-door collect. Superfund rebuild #4 left running.

## Lander card (tv-remote / bnm.farm)

Paste after the FMC Orders card. Product + bag size + price only. Count hydrates from the free manifest — do not hardcode a door count. Copy must say **FTC ALJ Decision / Commission Decision and Order**, not warning letters, not Federal Register HTML, not `/ftc-wl` / `/fmc-orders`. Live-tip PR: [tv-remote#98](https://github.com/bnmbnmai/tv-remote/pull/98).

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">FTC Orders</h2>
  <p class="facts" id="ftc-orders-facts">FTC cases-proceedings ALJ Decision / Commission Decision and Order text. Live bag size hydrates from the free manifest. $0.02 one text / $0.05 newest 10.</p>
  <div class="meta" aria-label="FTC Orders payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="ftc-orders-facts">$0.02 / $0.05</span>
  </div>
  <nav class="actions" aria-label="FTC Orders links">
    <a class="primary" href="https://ticks.bnm.farm/ftc-orders">Endpoint</a>
    <a href="https://ticks.bnm.farm/ftc-orders/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("ftc-orders-facts", "https://ticks.bnm.farm/ftc-orders/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("ftc-orders-facts").innerHTML;
  return "FTC cases-proceedings ALJ Decision / Commission Decision and Order text. Live: <strong>" + n + "</strong> official texts. $0.02 one text / $0.05 newest 10.";
});
```
