# Apply GET /nlrb-decisions onto the live ticks tip

Official **NLRB published Board Decision** TEXT from slip-opinion PDFs on `apps.nlrb.gov/link/document.aspx/{id}`, indexed by the Board Decisions AJAX sort. 17 U.S.C. § 105. Same extracted-body pipe as `/oalj-decisions` / `/stb-decisions` / `/oshrc-orders` / `/fmshrc-orders`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as sibling body doors. Empty delta is unpaid 304.

Collector shape: walk `https://www.nlrb.gov/sort-case-decisions-bd/date_issued+desc/board-decisions/date-issued/-1/all/20` (Drupal AJAX JSON inside a `<textarea>`, `command: insert` HTML, then `?page=`) → GET each `apps.nlrb.gov` PDF → `pdftotext`. Scout seeds (375 NLRB Nos. 40 / 39 / 38) are **examples, not a frozen list**. Later rows on the same sort (e.g. 375 NLRB No. 35) are first-class.

**Harvest NLRB-authored published Board Decision PDFs only** (`NNN NLRB No. N`).

**Do not sell as this SKU:** CiteNet topical index, weekly summaries, unpublished-only, ALJ-only. **KILL:** MSPB `SEARCH_MANIFEST` JSON (`DOCUMENT_CONTENT` is the free body). **Do not build `/flra-decisions` in this change** — it stays queued. Not `/oalj-decisions`, not `/oshrc-orders`, not `/fmshrc-orders`.

Free discovery is leak-clean: counts + citation / case number / date / institution + `paidUrl` only. **No `sourceUrl`** on free cards (live strip). Paid `?id=` / page still attribute the official PDF. Full Decision narrative lives in the PDF, not the card JSON.

**Path:** `/nlrb-decisions` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

**Seeds (Scout examples, not a frozen list):** **375 NLRB No. 40** Nexstar Media Corporation d/b/a NewsNation, 05-CA-367812 (Sep 17, 2026); **375 NLRB No. 39** Snowflake, Inc., 20-CA-274626 (Sep 16, 2026); **375 NLRB No. 38** IUOE Local 139 (The Boldt Company), 18-CD-352973 (Sep 11, 2026).

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Cherry-picked onto the live ticks tip `cursor/ticks-turkey-3647-apply-e1fd` @ `68bf97f` (PR #265 was stacked on `cursor/ticks-fat-ams-cotton-c349`, which is not that tip). Free manifest omits `sourceUrl`, card bodies, and `apps.nlrb.gov` (index `listing` / `sort` only).

## Collect command

```bash
NLRB_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/nlrb-decisions \
  NLRB_DECISIONS_LIMIT=4 NLRB_DECISIONS_MAX_FETCH=8 \
  npm run collect:nlrb-decisions
```

Fixture / dry collect (no secrets, no live PDF fetch):

```bash
NLRB_DECISIONS_DIR=/tmp/nlrb-decisions-dry \
  NLRB_DECISIONS_HTML_DIR=src/fixtures/nlrb-decisions \
  NLRB_DECISIONS_LIMIT=4 NLRB_DECISIONS_MAX_FETCH=0 \
  npm run collect:nlrb-decisions
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`. Do not message Bruce. Do not touch Imagine/RB/Dryland.

```bash
export NLRB_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/nlrb-decisions
mkdir -p "$NLRB_DECISIONS_DIR"
NLRB_DECISIONS_LIMIT=4 NLRB_DECISIONS_MAX_FETCH=8 npm run collect:nlrb-decisions
# add NLRB_DECISIONS_DIR to idaho-ticks-x402.service user unit
```

Unpaid `GET /nlrb-decisions` is **402** with `maxAmountRequired` **50000**. Unpaid `GET /nlrb-decisions?id=` is **402** with **20000**. Free `GET /nlrb-decisions/manifest.json` is **200** with card metadata only (no `sourceUrl`, no body, no `apps.nlrb.gov`).

Applied on apollo (2026-09-22): cherry-pick of [PR 265](https://github.com/bnmbnmai/mcp-proxy/pull/265) `2ddc070` onto live tip `cursor/ticks-turkey-3647-apply-e1fd` @ `68bf97f` (that tip is ahead of PR 265's cotton base `58bd54c`; cotton/poultry/retail commits there are already on the serving tip through AMS_3647). Apply-record branch `cursor/nlrb-decisions-apply-47f8`. Restarted **only** `idaho-ticks-x402.service` at **2026-09-22 10:54:20 MDT** (PID 533812; was 3522805). Added `NLRB_DECISIONS_DIR` to the user unit. Live sort responses are Drupal AJAX inside `<textarea>`; the walker unwraps that before reading `command: insert`. One-door collect EXIT 0: listedCount **60**, `cardCount` **7**, `fetchedPdfs` 4 this pass plus 3 reused scout PDFs, `addedThisRun` 4, skipped 0, asOf **2026-09-17**, fetchedAt **2026-09-22T16:51:49.811Z**. First slice includes scout **375 NLRB No. 40 / 39 / 38** and non-seed **375 NLRB No. 35** Leo Marine. Free manifest is citation / case number / date / institution + `paidUrl` only; **no** `sourceUrl`, no body, no `apps.nlrb.gov`. Unpaid `GET https://ticks.bnm.farm/nlrb-decisions` is **402** at $0.05 (`50000`); `?id=375-nlrb-no-40` is **402** at $0.02 (`20000`). `/.well-known/x402` lists `/nlrb-decisions` among **63** doors (was 62). Banner `mcp /mcp — 63 tools`. Siblings `/ftc-orders` `/oalj-decisions` `/ticks` still 402. payTo unchanged `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. docker / Caddy / tunnel untouched. No new collect cron. Lander card is on bnm.farm (tv-remote), hydrating the free manifest.
