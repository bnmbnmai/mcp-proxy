# Apply GET /oalj-decisions onto the live ticks tip

Official **DOL OALJ / BALCA / ARB Decision and Order** TEXT from ugly official PDFs on `oalj.dol.gov/DECISIONS/ALJ/...` and `dol.gov/sites/dolgov/files/OALJ/PUBLIC/ARB/DECISIONS/...`. 17 U.S.C. § 105. Same extracted-body pipe as `/stb-decisions` / warning letters / Form 483: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as sibling body doors. Empty delta is unpaid 304.

Collector shape: walk the Decisions index + rolling program caselists (TLC FY lists, SPA lists, other `CASELISTS` / `REFERENCES` pages discovered from those pages) → GET official Decision/Order PDFs → `pdftotext`. Scout seeds (McLaughlin SPA, Johnson BALCA TLC, Sheffield ARB) are **examples, not a frozen list**. Fresh caselist rows (e.g. 2026-TLC-00002 / 00003) are first-class.

**Harvest DOL-authored Decision/Order PDFs only.** Prefer substantive Decision/Order bodies (denials, dismissals, merits, BALCA certification review, ARB Final Decision and Order).

**KILL / do not wrap:** OFLC Foreign Labor Certification Disclosure Data free XLSX/CSV (H-2A / H-2B / PERM / LCA quarterly spreadsheets on dol.gov/media). Federal Register HTML wraps. Caselist HTML-only as the paid product. Court-of-appeals PDFs under `COURT_DECISIONS`. Distinct from live `/oshrc-orders` `/fmshrc-orders` `/stb-decisions`.

Free discovery is leak-clean: counts + case number / board / date / institution + `paidUrl` only. **No `sourceUrl`** on free cards (live strip). Paid `?id=` / page still attribute the official PDF. Full Decision/Order narrative lives in the PDF, not the card JSON.

**Path:** `/oalj-decisions` · **$0.05** page / **$0.02** `?id=` · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base
**Collector:** caselist HTML → official OALJ/ARB PDF + `pdftotext`.
**Seeds (Scout examples, not a frozen list):** OALJ **2026-SPA-00001** McLaughlin v. Troy Construction (Jul 30 2026); BALCA **2026-TLC-00008** Philip Johnson dba Johnson Grass Dairy (Jan 29 2026); ARB **2026-0010** Sheffield v. Tyson Foods (Mar 11 2026).

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Stacked on the live Superfund stream-write apply tip (`cursor/apply-superfund-stream-write-5f88`).

## Collect command

```bash
OALJ_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/oalj-decisions \
  OALJ_DECISIONS_LIMIT=4 OALJ_DECISIONS_MAX_FETCH=8 \
  npm run collect:oalj-decisions
```

Fixture / dry collect (no secrets, no live PDF fetch):

```bash
OALJ_DECISIONS_DIR=/tmp/oalj-decisions-dry \
  OALJ_DECISIONS_HTML_DIR=src/fixtures/oalj-decisions \
  OALJ_DECISIONS_LIMIT=4 OALJ_DECISIONS_MAX_FETCH=0 \
  npm run collect:oalj-decisions
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`. Do not message Bruce.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/oalj-decisions-6296
git checkout cursor/oalj-decisions-6296
export OALJ_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/oalj-decisions
mkdir -p "$OALJ_DECISIONS_DIR"
npm run build
OALJ_DECISIONS_LIMIT=4 OALJ_DECISIONS_MAX_FETCH=8 npm run collect:oalj-decisions
# add OALJ_DECISIONS_DIR to idaho-ticks-x402.service user unit
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** that unit. docker / other units untouched. No new collect cron — existing 07:45 / 19:45 America/Boise `ticks-collect.sh` walks live well-known and runs `build/oalj-decisions.js`.

After apply:

- unpaid `GET https://ticks.bnm.farm/oalj-decisions` is HTTP 402 at $0.05
- unpaid `GET ?id=2026-spa-00001` is HTTP 402 at $0.02
- empty `?since=` delta is unpaid 304
- free `GET /oalj-decisions/manifest.json` is HTTP 200, counts + case/board/date/institution + `paidUrl` only, **no sourceUrl**, no Decision/Order narrative
- paid GET returns JSON `cards[].body` + `records[]`
- `/.well-known/x402` lists `/oalj-decisions`
- `/` shop JSON lists the product
- `/mcp` tools include `oalj-decisions` generated from well-known

## Lander card (tv-remote / bnm.farm)

Paste after the STB Board Decisions card. Product + bag size + price only. Count hydrates from the free manifest — do not hardcode a door count. Copy must say **DOL OALJ / BALCA / ARB Decisions**, not OFLC disclosure XLSX, not Federal Register HTML, not `/oshrc-orders` / `/stb-decisions`.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">DOL OALJ Decisions</h2>
  <p class="facts" id="oalj-decisions-facts">DOL OALJ / BALCA / ARB Decision and Order text. Live bag size hydrates from the free manifest. $0.02 one text / $0.05 newest 10.</p>
  <div class="meta" aria-label="DOL OALJ Decisions payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="oalj-decisions-facts">$0.02 / $0.05</span>
  </div>
  <nav class="actions" aria-label="DOL OALJ Decisions links">
    <a class="primary" href="https://ticks.bnm.farm/oalj-decisions">Endpoint</a>
    <a href="https://ticks.bnm.farm/oalj-decisions/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("oalj-decisions-facts", "https://ticks.bnm.farm/oalj-decisions/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("oalj-decisions-facts").innerHTML;
  return "DOL OALJ / BALCA / ARB Decision and Order text. Live: <strong>" + n + "</strong> official texts. $0.02 one text / $0.05 newest 10.";
});
```
