# Apply GET /stb-decisions onto the live ticks tip

Official **Surface Transportation Board Board Decision** and **Board Order** TEXT from DCMS PDFs listed on `https://www.stb.gov/proceedings-actions/decisions/`. 17 U.S.C. § 105. Ugly PDF cache. Extracted-body door: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as sibling body doors. Empty delta is unpaid 304.

Collector shape: STB WordPress **nonce** (`stb_hook_generate_nonces`) → AJAX **`stb_hook_table_decisions`** (default `decisionType=Decision` + `decidingBody=Entire Board`) → `https://dcms-external.s3.amazonaws.com/DCMS_External_PROD/{ts}/{decisionId}.pdf` + `pdftotext`. Harvest **STB/DCMS PDFs only**. **SKIP** FR-mirrored Decision Nos. 21/30 class (AGENCY/ACTION/SUMMARY wrappers). Do not wrap Federal Register HTML as the body. **KILL** Open Data / STB free CSVs (STB-1145, EP 770, EP 724 metrics).

Free discovery is leak-clean: docket / Decision ID / date / deciding body + `paidUrl` only. **No `sourceUrl`** on free cards (strip already live). Paid `?id=` / page still attribute the DCMS PDF. Full Board narrative lives in the PDF, not the card JSON.

**Path:** `/stb-decisions` · **$0.05** page / **$0.02** `?id=` · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base
**Collector:** nonce + Entire Board Decision table + DCMS PDF + `pdftotext`.
**Seeds (Scout examples, not a frozen list):** Decision ID **52932** FD-32760-46 Decision 16 Entire Board served **2026-07-21** (BNSF Rosebluff Lead). Decision ID **52877** FD-36873 Decision 9 Entire Board served **2026-01-16**.

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Stacked on the live vet402 apply tip (`cursor/apply-vet402-settle-failed-3f56`).

## Collect command

```bash
STB_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/stb-decisions \
  STB_DECISIONS_LIMIT=4 STB_DECISIONS_MAX_FETCH=8 \
  npm run collect:stb-decisions
```

Fixture / dry collect (no secrets, no live PDF fetch):

```bash
STB_DECISIONS_DIR=/tmp/stb-decisions-dry \
  STB_DECISIONS_HTML_DIR=src/fixtures/stb-decisions \
  STB_DECISIONS_LIMIT=4 STB_DECISIONS_MAX_FETCH=0 \
  npm run collect:stb-decisions
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`. Do not message Bruce.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/stb-decisions-door-8026
git checkout cursor/stb-decisions-door-8026
export STB_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/stb-decisions
mkdir -p "$STB_DECISIONS_DIR"
npm run build
STB_DECISIONS_LIMIT=4 STB_DECISIONS_MAX_FETCH=8 npm run collect:stb-decisions
# add STB_DECISIONS_DIR to idaho-ticks-x402.service user unit
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** that unit. docker / other units untouched. No new collect cron.

Applied on apollo (2026-09-14): **serving SHA `3e1fee6`** (apply-record [PR 230](https://github.com/bnmbnmai/mcp-proxy/pull/230); FF of [PR 229](https://github.com/bnmbnmai/mcp-proxy/pull/229) `cursor/stb-decisions-door-8026` @ `3e1fee6` onto `cursor/apply-vet402-settle-failed-3f56` @ `695171a` / prior serving `6d81fe7`). Restarted **only** `idaho-ticks-x402.service` at **2026-09-14 17:03:36 MDT** (PID 3494014; was 2067443). Added `STB_DECISIONS_DIR` to the user unit. One-door collect EXIT 0: listedCount **5646**, `addedThisRun` 4, `fetchedPdfs` 6, skipped 2, asOf **2026-09-10**, fetchedAt **2026-09-14T23:02:20.913Z**. First-slice Entire Board Decisions: `53167` EP-558-29 (Railroad Cost of Capital—2025), `53180` FD-36447, `53068` AB-346-0-X, `53126` FD-36844. Scout seeds 52932 / 52877 are older than the current first page — not a frozen list. Free manifest is docket / Decision ID / date / deciding body + `paidUrl` only; **no** `sourceUrl`, no Board narrative. Unpaid `GET https://ticks.bnm.farm/stb-decisions` is **402** at $0.05; `?id=53167` is **402** at $0.02. `/.well-known/x402` lists `/stb-decisions` among **59** doors (was 58). Banner `mcp /mcp — 59 tools`. Siblings `/ticks` `/faa-civil-penalty` `/epa-eab` `/epa-alj` `/air-letters` still 402. No new collect cron (existing 07:45 / 19:45 America/Boise `ticks-collect.sh` walks live well-known). Lander card lives in tv-remote / bnm.farm and was not on this tip — apply is not blocked on a second repo.

After apply:

- unpaid `GET https://ticks.bnm.farm/stb-decisions` is HTTP 402 at $0.05
- unpaid `GET ?id=52932` is HTTP 402 at $0.02
- empty `?since=` delta is unpaid 304
- free `GET /stb-decisions/manifest.json` is HTTP 200, docket/Decision ID/date/deciding body only, **no sourceUrl**, no Board narrative
- paid GET returns JSON `cards[].body` + `records[]`
- `/.well-known/x402` lists `/stb-decisions`
- `/` shop JSON lists the product
- `/mcp` tools include `stb-decisions` generated from well-known

## Lander card (tv-remote / bnm.farm)

Paste after the FAA Civil Penalty Appeals card (or after EPA EAB if FAA is not on that lander). Product + bag size + price only. Count hydrates from the free manifest — do not hardcode a door count. Copy must say **STB Board Decisions**, not Open Data CSVs, not Federal Register HTML.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">STB Board Decisions</h2>
  <p class="facts" id="stb-decisions-facts">STB Board Decision / Order text. Live bag size hydrates from the free manifest. $0.02 one text / $0.05 newest 10.</p>
  <div class="meta" aria-label="STB Board Decisions payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="stb-decisions-facts">$0.02 / $0.05</span>
  </div>
  <nav class="actions" aria-label="STB Board Decisions links">
    <a class="primary" href="https://ticks.bnm.farm/stb-decisions">Endpoint</a>
    <a href="https://ticks.bnm.farm/stb-decisions/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("stb-decisions-facts", "https://ticks.bnm.farm/stb-decisions/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("stb-decisions-facts").innerHTML;
  return "STB Board Decision / Order text. Live: <strong>" + n + "</strong> official texts. $0.02 one text / $0.05 newest 10.";
});
```
