# Apply GET /faa-civil-penalty onto the live ticks tip

Official **FAA DRS Civil Penalty Appeals Administrator Final Order** and **Decision & Order** TEXT from PDFs listed on the DRS CIVIL_PENALTY_APPEALS browse (`https://drs.faa.gov/browse/CIVIL_PENALTY_APPEALS/doctypeDetails`; hub `https://www.faa.gov/about/office_org/headquarters_offices/agc/practice_areas/adjudication/civil_penalty`). 14 CFR §13.233. 17 U.S.C. § 105. Ugly PDF cache. Extracted-body door: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as sibling body doors. Empty delta is unpaid 304.

Collector shape: DRS **guest browse session** → POST metadatas list → GET `/api/content/reports/{guid}` PDF. Bare GET without guest session is often **403** (leak-clean, not a free dump). Prefer substantive Order / Decision PDFs. **SKIP** NMS/ASIAS JSON and APHIS AIR twins (live `/air-letters`). Not `/air-letters`.

Free discovery is leak-clean: order no / case / docket / dates / subjects + `paidUrl` only. **No `sourceUrl`** on free cards (strip already live). Paid `?id=` / page still attribute the DRS browse. Full Order narrative lives in the PDF, not the card JSON.

**Path:** `/faa-civil-penalty` · **$0.05** page / **$0.02** `?id=` · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base
**Collector:** DRS guest login + CIVIL_PENALTY_APPEALS metadatas + `/api/content/reports/{guid}` PDF + `pdftotext`.
**Seeds:** FAA Order **2026-04** Matter of Michael Leahey, dkt **G13-22-040**, served **07/02/2026**. FAA Order **2026-03** Matter of Michael Bennett.
**Bag (live collect on this VM):** **cardCount 4**, listedCount 653, fetchedPdfs 4, skippedNoText 0, asOf **2026-07-02**, fetchedAt **2026-09-11T22:49:36.123Z**. Seeds required. Additional first-page Administrator Orders: 2026-02 Matter of Skyler Jensen (G13-22-065); 2025-06 Matter of John Nunez (G13-23-021).

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Stacked on the live `/epa-eab` apply tip (`cursor/apply-epa-eab-5575` / [PR 224](https://github.com/bnmbnmai/mcp-proxy/pull/224)).

## Leak-test (2026-09-11, PASS)

Official card/index is metadata (order no / case / subjects / dates / docket). Distinctive Leahey phrases are **absent** from card JSON and present only in the guest-session PDF:

| Surface | `ORDER GRANTING MOTION FOR LEAVE TO FILE AMICUS` | `Diana R. Rabinowitz` |
| --- | --- | --- |
| SPA index HTML (22779 B) | absent | absent |
| Metadatas card JSON (first page, 653 listed) | absent | absent |
| Bare `GET /api/content/reports/{guid}` | **403** empty | **403** empty |
| Guest PDF 2026-04 (43992 B) | present | present |

Cross-bag (2026-09-11):

- FR API `G13-22-040` → **count 0**
- Live `/air-letters` full catalog → no Leahey / G13-22-040 / Rabinowitz / ORDER GRANTING… (different product)
- Not NMS/ASIAS JSON

Evidence: `docs/curl/faa-civil-penalty-leak-test.json`.

## Collect command

```bash
FAA_CIVIL_PENALTY_DIR=$HOME/projects/mcp-proxy/data/faa-civil-penalty \
  FAA_CIVIL_PENALTY_LIMIT=4 FAA_CIVIL_PENALTY_MAX_FETCH=8 \
  npm run collect:faa-civil-penalty
```

Fixture / dry collect (no secrets):

```bash
FAA_CIVIL_PENALTY_DIR=/tmp/faa-civil-penalty-dry \
  FAA_CIVIL_PENALTY_HTML_DIR=src/fixtures/faa-civil-penalty \
  FAA_CIVIL_PENALTY_LIMIT=4 FAA_CIVIL_PENALTY_MAX_FETCH=0 \
  npm run collect:faa-civil-penalty
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`. Do not message Bruce.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/faa-civil-penalty-eb16
git checkout cursor/faa-civil-penalty-eb16
export FAA_CIVIL_PENALTY_DIR=$HOME/projects/mcp-proxy/data/faa-civil-penalty
mkdir -p "$FAA_CIVIL_PENALTY_DIR"
npm run build
FAA_CIVIL_PENALTY_LIMIT=4 FAA_CIVIL_PENALTY_MAX_FETCH=8 npm run collect:faa-civil-penalty
# add FAA_CIVIL_PENALTY_DIR to idaho-ticks-x402.service user unit
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** that unit. docker / other units untouched. No new collect cron.

Applied on apollo (2026-09-11): **serving SHA `18f8026`** (apply-record [PR 226](https://github.com/bnmbnmai/mcp-proxy/pull/226); [PR 225](https://github.com/bnmbnmai/mcp-proxy/pull/225) `cursor/faa-civil-penalty-eb16` @ `18f8026` stacked on `cursor/apply-epa-eab-5575` @ `39d9648` / prior serving `6c16a68`). Restarted **only** `idaho-ticks-x402.service` at **2026-09-11 16:56:28 MDT** (PID 3985516). Added `FAA_CIVIL_PENALTY_DIR` to the user unit. One-door collect EXIT 0: listedCount **653**, `addedThisRun` 4, `fetchedPdfs` 4, skipped 0, asOf **2026-07-02**, fetchedAt **2026-09-11T22:56:22.054Z**. Seeds `2026-04` (Leahey, G13-22-040) and `2026-03` (Bennett) plus `2026-02` (Skyler Jensen, G13-22-065) and `2025-06` (John Nunez, G13-23-021). Free titles are DRS card subjects, not PDF order captions. Free manifest is order no/case/docket/dates/subjects + `paidUrl` only; **no** `sourceUrl`, no Order narrative. Unpaid `GET https://ticks.bnm.farm/faa-civil-penalty` is **402** at $0.05; `?id=2026-04` is **402** at $0.02. `/.well-known/x402` lists `/faa-civil-penalty` among **58** doors (was 57). Banner `mcp /mcp — 58 tools`. Siblings `/ticks` `/air-letters` `/epa-eab` `/epa-alj` still 402. No new collect cron. Lander card lives in tv-remote / bnm.farm and was not on this tip — apply is not blocked on a second repo.

After apply:

- unpaid `GET https://ticks.bnm.farm/faa-civil-penalty` is HTTP 402 at $0.05
- unpaid `GET ?id=2026-04` is HTTP 402 at $0.02
- empty `?since=` delta is unpaid 304
- free `GET /faa-civil-penalty/manifest.json` is HTTP 200, order no/case/docket/dates/subjects only, **no sourceUrl**, no Order narrative
- paid GET returns JSON `cards[].body` + `records[]`
- `/.well-known/x402` lists `/faa-civil-penalty`
- `/` shop JSON lists the product
- `/mcp` tools include `faa-civil-penalty` generated from well-known

## Lander card (tv-remote / bnm.farm)

Paste after the EPA EAB card (or after OSHRC if EAB is not on that lander). Product + bag size + price only. Count hydrates from the free manifest — do not hardcode a door count. Copy must say **FAA Civil Penalty Appeals**, not AIR letters, not NMS/ASIAS.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">FAA Civil Penalty Appeals</h2>
  <p class="facts" id="faa-civil-penalty-facts">FAA Civil Penalty Appeals Administrator Final Order / Decision &amp; Order text. Live bag size hydrates from the free manifest. $0.02 one text / $0.05 newest 10.</p>
  <div class="meta" aria-label="FAA Civil Penalty Appeals payment">
    <span class="pill">Base</span>
    <span class="pill">USDC</span>
    <span class="pill" data-nickel="faa-civil-penalty-facts">$0.02 / $0.05</span>
  </div>
  <nav class="actions" aria-label="FAA Civil Penalty Appeals links">
    <a class="primary" href="https://ticks.bnm.farm/faa-civil-penalty">Endpoint</a>
    <a href="https://ticks.bnm.farm/faa-civil-penalty/manifest.json">Manifest</a>
  </nav>
</article>
```

```js
hydrate("faa-civil-penalty-facts", "https://ticks.bnm.farm/faa-civil-penalty/manifest.json", (m) => {
  const n = publishedCount(m);
  if (n == null) return document.getElementById("faa-civil-penalty-facts").innerHTML;
  return "FAA Civil Penalty Appeals Administrator Final Order / Decision &amp; Order text. Live: <strong>" + n + "</strong> official texts. $0.02 one text / $0.05 newest 10.";
});
```
