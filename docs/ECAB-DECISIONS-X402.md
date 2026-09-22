# GET /ecab-decisions — ECAB FECA Decision and Order text

Official **Employees' Compensation Appeals Board** Decision and Order TEXT from slip PDFs on `www.dol.gov/sites/dolgov/files/ecab/decisions/`, indexed by the monthly tables at `www.dol.gov/agencies/ecab/decisions`. 17 U.S.C. § 105. Same extracted-body pipe as `/nlrb-decisions` and `/flra-decisions`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe. Empty delta is unpaid 304.

Collector shape: walk `https://www.dol.gov/agencies/ecab/decisions` → newest month indexes spelled in full (`/2026/Aug`, `/2026/July`; `/2026/Jul` is **404**) → keep `/sites/dolgov/files/ecab/decisions/YYYY/MON/NN-NNNN.pdf` → `pdftotext -layout`. Scout seeds (**26-0528** C.P. / U.S. Postal Service, Germantown, issued 2026-08-27; **26-0526** S.S. / Tomah VA) are **examples, not a frozen list**. Later rows on the same August table (**24-0755** R.W. / Timberlake) are first-class.

**Harvest ECAB-authored Decision and Order PDFs only.**

**Do not sell as this SKU:** `*_O.pdf` order slips (ORDER REMANDING / DISMISSING / DENYING), `fee_petition_orders/*`, and the AB-1 application form at `/sites/dolgov/files/ecab/ab-1.pdf`. **Not `/oalj-decisions`** (OALJ / BALCA / ARB caselists, not ECAB FECA slips).

Plain browser GET is Akamai **403**. Fetch uses the same descriptive `bnm-data-shop` User-Agent live `/oalj-decisions` already uses for dol.gov PDFs (`Accept: text/html` for indexes, `Accept: application/pdf` for slips). That returns the month tables and `%PDF-` slips.

## Leak test (2026-09-22) — not a kill

No free official full-text API returns the Decision and Order.

| Probe | Result |
| --- | --- |
| `GET /agencies/ecab/decisions/2026/Aug` and `/2026/July` with the OALJ dol.gov User-Agent | **200** HTML caption tables (docket, date, truncated parties). No opinion body. |
| `GET /agencies/ecab/decisions/2026/Jul` | **404**. Month folder is spelled `July`. |
| `GET /agencies/ecab/decisions/2026/Aug?_format=json` | Akamai **403**. Same for `/decisions?_format=json`. |
| `GET /jsonapi` | **404** |
| `GET /api` JSON:API index | **200**, `data: []`. Resource types are Drupal config / agency pages / ILAB. No ECAB decision type. |
| `GET /api/node/agency_pages?filter[title]=ECAB` | **200** one node, alias `/agencies/ecab`, **no body field**. Not the slip. |
| `GET /agencies/ecab.json` and `/decisions.json` | **404** |
| `https://data.dol.gov/ecab` | **200** JS shell (“You need to enable JavaScript”). No decision text. |
| `catalog.data.gov` package search for ECAB FECA | **404** API; HTML search has **0** ECAB hits. |
| `www.ecab.gov` / `ecab.dol.gov` | DNS does not resolve. |
| Slip `.../2026/AUG/26-0528.pdf` | **200** `application/pdf`. Opinion is in the PDF, not the index. |

Free discovery is leak-clean: counts + docket / date / institution + `paidUrl` only. **No `sourceUrl`**, no `/sites/dolgov/files/ecab/` PDF. Paid `?id=` / page still attribute the official PDF.

Appellants on the slips are initials (C.P., S.S., R.W.). Employers are named (U.S. Postal Service, Germantown; Tomah VA; Timberlake). Counsel on the scout slip is Wayne Johnson. Named payer is a plus, not a cutoff. Dockets move: the August table is a live caption list, and the walker takes the newest Decision and Order rows rather than a frozen seed list.

**Path:** `/ecab-decisions` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

**Seeds (examples, not a frozen list):** **26-0528** C.P. and U.S. Postal Service, Germantown Post Office, Philadelphia, PA (August 27, 2026); **26-0526** S.S. and Department of Veterans Affairs, Tomah VA Medical Center (August 26, 2026).

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Branch stacks on the live ticks tip `cursor/flra-decisions-apply-9207`.

## Collect command

```bash
ECAB_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/ecab-decisions \
  ECAB_DECISIONS_LIMIT=7 ECAB_DECISIONS_MAX_FETCH=8 ECAB_DECISIONS_PAGES=2 \
  npm run collect:ecab-decisions
```

Cloud VM collect (2026-09-22): `cardCount` **7**, `listedCount` **108**, `fetchedPdfs` **7**, `asOf` **2026-08-27**, `fetchedAt` **2026-09-22T19:39:46.249Z**. Ids: `26-0528` (scout), `24-0755` (not a scout seed), `26-0526` (scout), `26-0460`, `26-0534`, `26-0506`, `26-0479`. August and July indexes were walked; unpublished 2026 Dec/Nov/Oct/Sep links on the hub 404 and are skipped. `/2026/Jul` is not fetched (404); the folder is `July`.

Local unpaid proof against that bag: `GET /ecab-decisions` **402**, `maxAmountRequired` **50000**. `GET /ecab-decisions?id=26-0528` **402**, **20000**. Free manifest **200**, `cardCount` 7, `asOf` 2026-08-27, cards have `paidUrl` only — no `sourceUrl`, no PDF path, no opinion needle.

Fixture / dry collect (no secrets, no live PDF fetch):

```bash
ECAB_DECISIONS_DIR=/tmp/ecab-decisions-dry \
  ECAB_DECISIONS_HTML_DIR=src/fixtures/ecab-decisions \
  ECAB_DECISIONS_LIMIT=7 ECAB_DECISIONS_MAX_FETCH=0 \
  npm run collect:ecab-decisions
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service` after checkout of this branch (not catalog `main`). Do not replace other door caches. Do not message Bruce. Do not touch Imagine/RB/Dryland. Do not touch Docker, Caddy, or the tunnel.

```bash
export ECAB_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/ecab-decisions
mkdir -p "$ECAB_DECISIONS_DIR"
ECAB_DECISIONS_LIMIT=7 ECAB_DECISIONS_MAX_FETCH=8 ECAB_DECISIONS_PAGES=2 npm run collect:ecab-decisions
# add ECAB_DECISIONS_DIR to idaho-ticks-x402.service user unit
```

Unpaid `GET /ecab-decisions` is **402** with `maxAmountRequired` **50000**. Unpaid `GET /ecab-decisions?id=` is **402** with **20000**. Free `GET /ecab-decisions/manifest.json` is **200** with card metadata only (no `sourceUrl`, no body, no decision PDF).

Applied on apollo (2026-09-22): fast-forward of [PR 269](https://github.com/bnmbnmai/mcp-proxy/pull/269) `94b9627` onto live tip `cursor/flra-decisions-apply-9207` @ `10cdf03`. Apply-record branch `cursor/ecab-decisions-apply-2155`. Restarted **only** `idaho-ticks-x402.service` at **2026-09-22 13:47:08 MDT** (PID 684898; was 565736). Added `ECAB_DECISIONS_DIR` to the user unit (`~/projects/mcp-proxy/data/ecab-decisions`). The door commit already exports that dir and the grow prefix in `scripts/ticks-collect.sh` (no new cron). One-door collect EXIT 0: listedCount **108**, `cardCount` **7**, `fetchedPdfs` 7, `addedThisRun` 7, skipped 0, asOf **2026-08-27**, fetchedAt **2026-09-22T19:47:28.911Z**. First slice includes scout **26-0528** / **26-0526** and non-seed **24-0755**. Free manifest is docket / date / institution + `paidUrl`; `sources.listing` is the ECAB decisions index only. **No** `sourceUrl`, no card body, no `/sites/dolgov/files/ecab/` PDF path. Unpaid `GET https://ticks.bnm.farm/ecab-decisions` is **402** at $0.05 (`50000`); `?id=26-0528` is **402** at $0.02 (`20000`). `/.well-known/x402` lists `/ecab-decisions` among **65** doors (was 64). Banner `mcp /mcp — 65 tools`. Siblings `/flra-decisions` and `/ticks` still 402. payTo unchanged `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. docker / Caddy / tunnel untouched. Lander card is on bnm.farm (tv-remote `8907025`), hydrating the free manifest (Live: 7).

## Lander card

This repo does not own the bnm.farm lander. Paste on the tv-remote **live tip**, not stub `main`. Count hydrates from `GET /ecab-decisions/manifest.json` (`cardCount`). Do not hardcode a door count or the bag size.

```html
<article class="door" data-door="ecab-decisions">
  <h2>ECAB FECA Decisions</h2>
  <p>Official Employees' Compensation Appeals Board Decision and Order text. 17 U.S.C. § 105. $0.05 newest 10 · $0.02 one id.</p>
  <p class="live">Live: <span data-hydrate="cardCount">…</span> official texts</p>
  <a href="https://ticks.bnm.farm/ecab-decisions/manifest.json">Free index</a>
</article>
```
