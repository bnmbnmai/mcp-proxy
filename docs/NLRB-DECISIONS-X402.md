# Apply GET /nlrb-decisions onto the live ticks tip

Official **NLRB published Board Decision** TEXT from slip-opinion PDFs on `apps.nlrb.gov/link/document.aspx/{id}`, indexed by the Board Decisions AJAX sort. 17 U.S.C. § 105. Same extracted-body pipe as `/oalj-decisions` / `/stb-decisions` / `/oshrc-orders` / `/fmshrc-orders`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as sibling body doors. Empty delta is unpaid 304.

Collector shape: walk `https://www.nlrb.gov/sort-case-decisions-bd/date_issued+desc/board-decisions/date-issued/-1/all/20` (Drupal AJAX `insert` HTML, then `?page=`) → GET each `apps.nlrb.gov` PDF → `pdftotext`. Scout seeds (375 NLRB Nos. 40 / 39 / 38) are **examples, not a frozen list**. Later rows on the same sort (e.g. 375 NLRB No. 35) are first-class.

**Harvest NLRB-authored published Board Decision PDFs only** (`NNN NLRB No. N`).

**Do not sell as this SKU:** CiteNet topical index, weekly summaries, unpublished-only, ALJ-only. **KILL:** MSPB `SEARCH_MANIFEST` JSON (`DOCUMENT_CONTENT` is the free body). **Do not build `/flra-decisions` in this change** — it stays queued. Not `/oalj-decisions`, not `/oshrc-orders`, not `/fmshrc-orders`.

Free discovery is leak-clean: counts + citation / case number / date / institution + `paidUrl` only. **No `sourceUrl`** on free cards (live strip). Paid `?id=` / page still attribute the official PDF. Full Decision narrative lives in the PDF, not the card JSON.

**Path:** `/nlrb-decisions` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

**Seeds (Scout examples, not a frozen list):** **375 NLRB No. 40** Nexstar Media Corporation d/b/a NewsNation, 05-CA-367812 (Sep 17, 2026); **375 NLRB No. 39** Snowflake, Inc., 20-CA-274626 (Sep 16, 2026); **375 NLRB No. 38** IUOE Local 139 (The Boldt Company), 18-CD-352973 (Sep 11, 2026).

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Stacked on the live ticks tip (`cursor/ticks-fat-ams-cotton-c349`). Cloud VM only — do not deploy to apollo in the Imagine 2–4am window.

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

Unpaid `GET /nlrb-decisions` is **402** with `maxAmountRequired` **50000**. Unpaid `GET /nlrb-decisions?id=` is **402** with **20000**. Free `GET /nlrb-decisions/manifest.json` is **200** with card metadata only (no `sourceUrl`, no body).
