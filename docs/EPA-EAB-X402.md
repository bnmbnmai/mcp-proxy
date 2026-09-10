# Apply GET /epa-eab onto the live ticks tip

Official **EPA Environmental Appeals Board Unpublished Final Order** and substantive **Board Order** TEXT from PDFs linked on the Unpublished Final Orders e-docket (`https://yosemite.epa.gov/oa/EAB_Web_Docket.nsf/Unpublished~Final~Orders?OpenView`). Host NSF is **EAB** `yosemite.epa.gov/oa/EAB_Web_Docket.nsf`, not OALJ `oarm/alj/alj_web_docket.nsf`, not RHC `oa/rhc/epaadmin.nsf`. 17 U.S.C. § 105. Ugly PDF/HTML cache. Extracted-body door: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as sibling body doors. Empty delta is unpaid 304.

Prefer **Type=Permit** and substantive Board Orders (dismiss petition, untimely, merits). **SKIP** Penalty ESA / CAFO / Expedited Settlement / Consent Agreement rows when they twin live `/epa-cafo` / `/fifra-orders`. Do not sell ECHO JSON, RHC CAFO packs, OALJ Initial Decisions (`/epa-alj`), or individual NPDES permit texts (`/npdes-permits`).

Free discovery is leak-clean: case / appeal / date / Type / Result + `paidUrl` only. **No `sourceUrl`** on free cards (strip already live). Paid `?id=` / page still attribute the official PDF. Full Board narrative lives in the `$FILE` PDF, not the card HTML.

**Path:** `/epa-eab` · **$0.05** page / **$0.02** `?id=` · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base
**Collector:** Unpublished Final Orders view walk + document-page `$FILE` PDF + `pdftotext`.
**Seeds:** South Essex Sewerage District NPDES Appeal `26-03` Board Order 2026-07-15. Montalban Oil and Gas Operations, Inc. UIC Appeal `26-02` untimely dismiss 2026-07-07.
**Bag (live collect on this VM):** **cardCount 4**, listedCount 13, fetchedPdfs 4, asOf **2026-07-15**. Seeds required. Two additional 2026 Type=Permit Board Orders (Albuquerque NPDES 26-01 moot; ExxonMobil UIC 25-03 moot). Penalty ESA/CAFO twins skipped.

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Stacked on the live `/epa-alj` apply tip (`f777341` / [PR 222](https://github.com/bnmbnmai/mcp-proxy/pull/222)).

## Leak-test (2026-09-10, PASS)

Official card/index HTML is metadata (appeal no / case / dates / Type / Result + PDF link). Distinctive SESD phrases are **absent** from card HTML and present only in the `$FILE` PDF:

| Surface | `Assented Motion to Dismiss` | `Aaron P. Avila` | `draft permit modification` |
| --- | --- | --- | --- |
| Index HTML (260421 B) | absent | absent | absent |
| SESD card HTML (41726 B, Type=Permit) | absent | absent | absent |
| Montalban card HTML (41683 B, Type=Permit) | absent | absent | absent |
| SESD `$FILE` PDF text | present | present | present |

Cross-bag (live ticks.bnm.farm free manifests, 2026-09-10):

- `/epa-alj?q=South Essex` / `26-03` / `Assented Motion` → **0** cards
- `/epa-cafo?q=South Essex` / `26-03` / `Assented Motion` / `Montalban` → **0** cards
- `/npdes-permits?q=South Essex` / `ma0100501` → **1** card (`ma0100501`) — OK, different product (permit text, not EAB order)

Evidence: `docs/curl/epa-eab-leak-test.json`.

## Collect command

```bash
EPA_EAB_DIR=$HOME/projects/mcp-proxy/data/epa-eab \
  EPA_EAB_LIMIT=4 EPA_EAB_MAX_FETCH=8 \
  npm run collect:epa-eab
```

Fixture / dry collect (no secrets):

```bash
EPA_EAB_DIR=/tmp/epa-eab-dry \
  EPA_EAB_HTML_DIR=src/fixtures/epa-eab \
  EPA_EAB_LIMIT=4 EPA_EAB_MAX_FETCH=0 \
  npm run collect:epa-eab
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/epa-eab-door-4402
git checkout cursor/epa-eab-door-4402
export EPA_EAB_DIR=$HOME/projects/mcp-proxy/data/epa-eab
mkdir -p "$EPA_EAB_DIR"
npm run build
EPA_EAB_LIMIT=4 EPA_EAB_MAX_FETCH=8 npm run collect:epa-eab
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** that unit. docker / other units untouched.

Applied on apollo (2026-09-10): **serving SHA `6c16a68`** (apply-record [PR 224](https://github.com/bnmbnmai/mcp-proxy/pull/224); [PR 223](https://github.com/bnmbnmai/mcp-proxy/pull/223) `cursor/epa-eab-door-4402` @ `6c16a68` stacked on `cursor/apply-epa-alj-6c6a` @ `f777341` / prior serving `dbaed3c`). Restarted **only** `idaho-ticks-x402.service` at **2026-09-10 16:30:55 MDT** (PID 2737323). Added `EPA_EAB_DIR` to the user unit. One-door collect EXIT 0: listedCount **13**, `addedThisRun` 4, `fetchedPdfs` 4, skipped 0, asOf **2026-07-15**, fetchedAt **2026-09-10T22:30:50.231Z**. Seeds `NPDES-26-03-2026-07-15` (South Essex) and `UIC-26-02-2026-07-07` (Montalban) plus Albuquerque NPDES-26-01 and ExxonMobil UIC-25-03 — all Type=Permit Board Orders; no Penalty ESA/CAFO twins. Free manifest is case/appeal/date/Type/Result + `paidUrl` only; **no** `sourceUrl`, no Board narrative. Unpaid `GET https://ticks.bnm.farm/epa-eab` is **402** at $0.05; `?id=NPDES-26-03-2026-07-15` is **402** at $0.02. `/.well-known/x402` lists `/epa-eab` among **57** doors (was 56). Banner `mcp /mcp — 57 tools`. Siblings `/ticks` `/oshrc-orders` `/epa-alj` `/epa-cafo` still 402. No new collect cron. Lander card lives in tv-remote / bnm.farm and was not on this tip — apply is not blocked on a second repo.

After apply:

- unpaid `GET https://ticks.bnm.farm/epa-eab` is HTTP 402 at $0.05
- unpaid `GET ?id=NPDES-26-03-2026-07-15` is HTTP 402 at $0.02
- empty `?since=` delta is unpaid 304
- free `GET /epa-eab/manifest.json` is HTTP 200, case/appeal/date/Type/Result only, **no sourceUrl**, no Board narrative
- paid GET returns JSON `cards[].body` + `records[]`
- `/.well-known/x402` lists `/epa-eab`
- `/` shop JSON lists the product
- `/mcp` tools include `epa-eab` generated from well-known

## Lander card (tv-remote / bnm.farm)

Paste after the EPA OALJ card (or after BSEE if OALJ is not on that lander). Product + bag size + price only. Count hydrates from the free manifest — do not hardcode a door count. Copy must say **EAB Board Orders**, not OALJ, not CAFO.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">EPA EAB Board Orders</h2>
  <p class="facts" id="epa-eab-facts">EPA Environmental Appeals Board Unpublished Final Order / Board Order text. Live bag size hydrates from the free manifest. $0.02 one text / $0.05 newest 10.</p>
  <div class="meta" aria-label="EPA EAB Board Order payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="epa-eab-facts">$0.02 / $0.05</span>
  </div>
  <nav class="actions" aria-label="EPA EAB Board Order links">
    <a class="primary" href="https://ticks.bnm.farm/epa-eab">Endpoint</a>
    <a href="https://ticks.bnm.farm/epa-eab/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("epa-eab-facts", "https://ticks.bnm.farm/epa-eab/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("epa-eab-facts").innerHTML;
  return "EPA Environmental Appeals Board Unpublished Final Order / Board Order text. Live: <strong>" + n + "</strong> official texts. $0.02 one text / $0.05 newest 10.";
});
```
