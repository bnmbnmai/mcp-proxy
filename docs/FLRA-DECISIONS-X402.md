# GET /flra-decisions — FLRA Authority Decision text

Official **FLRA Authority Decision** TEXT from slip-opinion PDFs on `www.flra.gov/system/files/decisions/`, indexed by the Authority Decisions table. 17 U.S.C. § 105. Same extracted-body pipe as `/nlrb-decisions`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe. Empty delta is unpaid 304.

Collector shape: walk `https://www.flra.gov/decisions/authority-decisions` (Drupal views HTML, optional `?page=`, or `/views/ajax` `command: insert`) → keep `/system/files/decisions/*.pdf` → `pdftotext -layout`. Scout seeds (74 FLRA 541 / 530 / 524) are **examples, not a frozen list**. Later rows on the same table (74 FLRA 508 and the rest of the first page) are first-class.

**Harvest FLRA-authored Authority Decision PDFs only** (`NN FLRA NNN`).

**Do not sell as this SKU:** case-digest PDFs under `/system/files/digest/`, ALJ decisions, FSIP decisions, the HTML slip at `/decisions/vNN/NN-N` (that page is the opinion in HTML, so it must not appear on the free manifest). **Not a KILL:** `GET /decisions/authority-decisions?_format=json` and `GET /decisions/v74/74-80?_format=json` are HTTP **406** (`A route that returns a rendered array as its response only supports the HTML format.`). `/jsonapi`, `/api`, `/rest`, and `/json` are 404. `/views/ajax` JSON is the listing table (citation, case, parties, PDF/HTML/digest links), not the opinion. Not `/nlrb-decisions`.

Free discovery is leak-clean: counts + citation / case number / date / institution + `paidUrl` only. **No `sourceUrl`**, no `/system/files/decisions/` PDF, no `/decisions/v74/` HTML slip. Paid `?id=` / page still attribute the official PDF.

**Path:** `/flra-decisions` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

**Seeds (examples, not a frozen list):** **74 FLRA 541** Marine Corps Twentynine Palms, 0-AR-5810 (Sep 22, 2026); **74 FLRA 530** Bureau of Engraving and Printing, 0-AR-6030 (Sep 15, 2026); **74 FLRA 524** NATCA / FAA, 0-AR-5877 (Sep 14, 2026).

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Branch stacks on the live ticks tip `cursor/nlrb-decisions-apply-47f8` @ `4987272`.

## Collect command

```bash
FLRA_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/flra-decisions \
  FLRA_DECISIONS_LIMIT=7 FLRA_DECISIONS_MAX_FETCH=8 FLRA_DECISIONS_PAGES=1 \
  npm run collect:flra-decisions
```

Fixture / dry collect (no secrets, no live PDF fetch):

```bash
FLRA_DECISIONS_DIR=/tmp/flra-decisions-dry \
  FLRA_DECISIONS_HTML_DIR=src/fixtures/flra-decisions \
  FLRA_DECISIONS_LIMIT=7 FLRA_DECISIONS_MAX_FETCH=0 \
  npm run collect:flra-decisions
```

Cloud VM collect (2026-09-22): `cardCount` **7**, `listedCount` **10**, `fetchedPdfs` **7**, `asOf` **2026-09-22**, `fetchedAt` **2026-09-22T17:17:53.103Z**. Ids: `74-flra-541`, `74-flra-530`, `74-flra-524`, `74-flra-508` (not a scout seed), `74-flra-497`, `74-flra-490`, `74-flra-486`.

Local unpaid proof against that bag: `GET /flra-decisions` **402**, `maxAmountRequired` **50000**. `GET /flra-decisions?id=74-flra-541` **402**, **20000**. Free manifest **200**, `cardCount` 7, `asOf` 2026-09-22, cards have `paidUrl` only — no `sourceUrl`, no PDF path, no HTML slip, no opinion needle.

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service` after checkout of this branch (not catalog `main`). Do not replace other door caches. Do not message Bruce. Do not touch Imagine/RB/Dryland.

```bash
export FLRA_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/flra-decisions
mkdir -p "$FLRA_DECISIONS_DIR"
FLRA_DECISIONS_LIMIT=7 FLRA_DECISIONS_MAX_FETCH=8 FLRA_DECISIONS_PAGES=1 npm run collect:flra-decisions
# add FLRA_DECISIONS_DIR to idaho-ticks-x402.service user unit
```

Unpaid `GET /flra-decisions` is **402** with `maxAmountRequired` **50000**. Unpaid `GET /flra-decisions?id=` is **402** with **20000**. Free `GET /flra-decisions/manifest.json` is **200** with card metadata only (no `sourceUrl`, no body, no decision PDF, no HTML slip).

Applied on apollo (2026-09-22): fast-forward of [PR 267](https://github.com/bnmbnmai/mcp-proxy/pull/267) `1b8801f` onto live tip `cursor/nlrb-decisions-apply-47f8` @ `4987272` (that commit already stacks on the NLRB apply). Apply-record branch `cursor/flra-decisions-apply-9207`. Restarted **only** `idaho-ticks-x402.service` at **2026-09-22 11:28:15 MDT** (PID 565736; was 533812). Added `FLRA_DECISIONS_DIR` to the user unit. Wired the same dir and grow prefix into `scripts/ticks-collect.sh` (no new cron). One-door collect EXIT 0: listedCount **10**, `cardCount` **7**, `fetchedPdfs` 7, `addedThisRun` 7, skipped 0, asOf **2026-09-22**, fetchedAt **2026-09-22T17:28:09.876Z**. First slice includes scout **74 FLRA 541 / 530 / 524** and non-seed **74 FLRA 508**. Free manifest is citation / case number / date / institution + `paidUrl`; `sources.listing` is the authority-decisions index only. **No** `sourceUrl`, no card body, no `/system/files/decisions/` PDF, no `/decisions/v74/` HTML slip. Unpaid `GET https://ticks.bnm.farm/flra-decisions` is **402** at $0.05 (`50000`); `?id=74-flra-541` is **402** at $0.02 (`20000`). `/.well-known/x402` lists `/flra-decisions` among **64** doors (was 63). Banner `mcp /mcp — 64 tools`. Siblings `/nlrb-decisions` and `/ticks` still 402. payTo unchanged `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. docker / Caddy / tunnel untouched. Lander card is on bnm.farm (tv-remote), hydrating the free manifest (Live: 7).

## Lander card

This repo does not own the bnm.farm lander. Paste on the tv-remote **live tip** (the same line as `cursor/nlrb-decisions-lander-47f8`), not stub `main`. Count hydrates from `GET /flra-decisions/manifest.json` (`cardCount`). Do not hardcode a door count or the bag size.

```html
<article class="door" data-door="flra-decisions">
  <h2>FLRA Authority Decisions</h2>
  <p>Official Authority slip-opinion text. 17 U.S.C. § 105. $0.05 newest 10 · $0.02 one id.</p>
  <p class="live">Live: <span data-hydrate="cardCount">…</span> official texts</p>
  <a href="https://ticks.bnm.farm/flra-decisions/manifest.json">Free index</a>
</article>
```
