# Apply GET /fmc-orders onto the live ticks tip

Official **FMC Reading Room Initial Decision / Commission Order** TEXT from ugly official PDFs on `www2.fmc.gov/readingroom`. 17 U.S.C. § 105. Same extracted-body pipe as `/stb-decisions` / `/oalj-decisions`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as sibling body doors. Empty delta is unpaid 304.

Collector shape: walk Reading Room proceeding pages (DocumentSearch / ProceedingSearch tables) → `/readingroom/documents/{id}` 302s to `/readingroom/docs/{docket}/{filename}/` (trailing slash required) → `pdftotext`. Scout seeds (23-08 MSC Order on Initial Decision, 2033(I) Adenariwo, 2030(I) Gibson, 23-02 BBBY/OOCL) are **examples, not a frozen list**. Fresh Served Initial Decision / Order on Initial Decision / Commission Order rows are first-class.

**Harvest FMC-authored Initial Decision / Commission Order PDFs only.** Prefer substantive Initial Decision and Commission Order / Order on Initial Decision bodies.

**KILL / do not wrap:** PHMSA Pipeline Enforcement Raw Data free TSV (`/phmsa-orders` is already live). Federal Register HTML wraps. wordpress `wp-json` site CMS (not the order body). Party exceptions / scheduling orders / proceeding HTML-only as the paid product. Distinct from live `/phmsa-orders` `/stb-decisions` `/oalj-decisions`.

Free discovery is leak-clean: counts + docket / document id / date / institution + `paidUrl` only. **No `sourceUrl`** on free cards (live strip). Paid `?id=` / page still attribute the official PDF. Full Initial Decision / Commission Order narrative lives in the PDF, not the card JSON.

**Path:** `/fmc-orders` · **$0.05** page / **$0.02** `?id=` · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base
**Collector:** proceeding HTML → official Reading Room PDF + `pdftotext`.
**Seeds (Scout examples, not a frozen list):** **23-08** MSC Order on Initial Decision served 2026-01-06 (doc 131865, 476,847 bytes); **2033(I)** Adenariwo Initial Decision (doc 136187); **2030(I)** Gibson Initial Decision (doc 136166); **23-02** BBBY/OOCL Initial Decision (doc 136277).

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Stacked on the live Superfund disk-PDF apply tip (`cursor/superfund-disk-pdfs-6b0e` / `dddbafd`). Branch `cursor/fmc-orders-0443`.

## Collect command

```bash
FMC_ORDERS_DIR=$HOME/projects/mcp-proxy/data/fmc-orders \
  FMC_ORDERS_LIMIT=5 FMC_ORDERS_MAX_FETCH=8 \
  npm run collect:fmc-orders
```

Fixture / dry collect (no secrets, no live PDF fetch):

```bash
FMC_ORDERS_DIR=/tmp/fmc-orders-dry \
  FMC_ORDERS_HTML_DIR=src/fixtures/fmc-orders \
  FMC_ORDERS_LIMIT=5 FMC_ORDERS_MAX_FETCH=0 \
  npm run collect:fmc-orders
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`. Do not message Bruce.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/fmc-orders-0443
git checkout cursor/fmc-orders-0443
export FMC_ORDERS_DIR=$HOME/projects/mcp-proxy/data/fmc-orders
mkdir -p "$FMC_ORDERS_DIR"
npm run build
FMC_ORDERS_LIMIT=5 FMC_ORDERS_MAX_FETCH=8 npm run collect:fmc-orders
# add FMC_ORDERS_DIR to idaho-ticks-x402.service user unit
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** that unit. docker / other units untouched. No new collect cron — existing 07:45 / 19:45 America/Boise `ticks-collect.sh` walks live well-known and runs `build/fmc-orders.js`.

Applied on apollo (2026-09-16): **serving SHA `1e5faa0`** ([PR 239](https://github.com/bnmbnmai/mcp-proxy/pull/239) `cursor/fmc-orders-0443` onto live tip `cursor/apply-oalj-decisions-a04c` / PR 238). Restarted **only** `idaho-ticks-x402.service` at **2026-09-16 17:13:32 MDT** (PID 1808175). Added `FMC_ORDERS_DIR` to the user unit. One-door collect EXIT 0: listedCount **5**, `addedThisRun` 5, `fetchedPdfs` 5, skipped 0, asOf **2026-04-24**, fetchedAt **2026-09-16T23:13:25.691Z**. First-slice: **23-02-136277** BBBY/OOCL Initial Decision, **2033-i-136187** Adenariwo, **2030-i-136166** Gibson, **23-08-131865** MSC Order on Initial Decision (476,847 byte PDF), **23-08-118811** MSC Initial Decision. Scout seeds are examples, not a frozen list. Free manifest is docket / document id / date / institution + `paidUrl` only; **no** `sourceUrl`, no Decision/Order narrative. Unpaid `GET https://ticks.bnm.farm/fmc-orders` is **402** at $0.05; `?id=23-08-131865` is **402** at $0.02. Live `/.well-known/x402` is **61**. Shop index **61**. MCP `tools/list` includes `fmc-orders` from well-known. Lander card is on https://bnm.farm/ (tv-remote `cursor/fmc-orders-lander-0443`).

## Lander card (tv-remote / bnm.farm)

Paste after the DOL OALJ Decisions card. Product + bag size + price only. Count hydrates from the free manifest — do not hardcode a door count. Copy must say **FMC Initial Decision / Commission Order**, not PHMSA TSV, not Federal Register HTML, not `/stb-decisions` / `/oalj-decisions`.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">FMC Orders</h2>
  <p class="facts" id="fmc-orders-facts">FMC Reading Room Initial Decision / Commission Order text. Live bag size hydrates from the free manifest. $0.02 one text / $0.05 newest 10.</p>
  <div class="meta" aria-label="FMC Orders payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="fmc-orders-facts">$0.02 / $0.05</span>
  </div>
  <nav class="actions" aria-label="FMC Orders links">
    <a class="primary" href="https://ticks.bnm.farm/fmc-orders">Endpoint</a>
    <a href="https://ticks.bnm.farm/fmc-orders/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("fmc-orders-facts", "https://ticks.bnm.farm/fmc-orders/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("fmc-orders-facts").innerHTML;
  return "FMC Reading Room Initial Decision / Commission Order text. Live: <strong>" + n + "</strong> official texts. $0.02 one text / $0.05 newest 10.";
});
```
