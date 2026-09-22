# GET /nmb-determinations — NMB representation determination text

Official **National Mediation Board** Railway Labor Act §2 Ninth representation determination TEXT from PDFs on `nmb.gov/NMB_Application/wp-content/uploads/YYYY/MM/`, indexed by the FY Determinations HTML tables. 17 U.S.C. § 105. Same extracted-body pipe as `/nlrb-decisions`, `/flra-decisions`, and `/ecab-decisions`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe. Empty delta is unpaid 304.

Collector shape: walk `https://nmb.gov/NMB_Application/index.php/agency-determinations/` → newest FY tables (`/fy2026-determinations/`, then `/fy2025-determinations/`) → keep representation Findings Upon Investigation, certification, single-carrier, dismissal, reconsideration, and revocation rows → `pdftotext -layout`. Scout seeds (**53 NMB No. 34** / R-7687 certification, California Northern Railroad Company, September 17, 2026; **53 NMB No. 33** / R-7688 certification, Iowa Interstate Railroad, September 16, 2026; **53 NMB No. 30** / R-7690 single-carrier Findings Upon Investigation, Republic Airways / Mesa Airlines, September 1, 2026) are **examples, not a frozen list**. Later rows on the same FY2026 table (**53 NMB No. 29** / R-7685 Temple & Central Texas Railway) are first-class.

**Harvest representation FUI, certification, and single-carrier bodies.** Dismissal, reconsideration, and revocation rows on the same FY table are the same determination product.

**Do not sell as this SKU:** the Representation Manual (`Rep-Manual-*.pdf`), PEB reports and hearing notices (`PEB-*.pdf`, `Hearing-Notice-PEB-*.pdf`), jurisdictional opinion letters (optional later fat), and the WordPress comments RSS. **Not `/nlrb-decisions`.** **Not `/flra-decisions`.**

## Leak test (2026-09-22) — not a kill

No free official full-text API returns the determination.

| Probe | Result |
| --- | --- |
| `GET /agency-determinations/fy2026-determinations/` | **200** HTML caption table (page cite, date, case, carrier, union, craft, disposition, NMB number + PDF href). Opinion needles are absent. |
| `GET /agency-determinations/` | **200** year index. Also links the Representation Manual and PEB 254. Those PDFs are not this SKU. |
| Seed `Certification-R-7687.pdf`, `Certification-R-7688.pdf`, `Findings-Upon-Investigation-R-7690.pdf` | **200** `application/pdf`. The opinion is in the PDF, not the table. |
| `GET /wp-json/wp/v2/pages?slug=fy2026-determinations` | **401**. No anonymous full text. |
| `GET /comments/feed/` | **200** RSS shell. No determination text. |
| FY2025 table header | `52 NMB Number`. Volume comes from the table header, not a frozen 53. |

Free discovery is leak-clean: counts + citation / case / date / institution + `paidUrl` only. **No `sourceUrl`**, no `wp-content/uploads` PDF. Paid `?id=` / page still attribute the official PDF.

**Path:** `/nmb-determinations` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Branch stacks on the live ticks tip `cursor/fcc-eb-orders-apply-6bd2`.

## Collect command

```bash
NMB_DETERMINATIONS_DIR=$HOME/projects/mcp-proxy/data/nmb-determinations \
  NMB_DETERMINATIONS_LIMIT=7 NMB_DETERMINATIONS_MAX_FETCH=8 NMB_DETERMINATIONS_PAGES=2 \
  npm run collect:nmb-determinations
```

Cloud VM collect (2026-09-22): `cardCount` **7**, `listedCount` **74**, `fetchedPdfs` **7**, `asOf` **2026-09-17**, `fetchedAt` **2026-09-22T22:42:57.150Z**. Ids: `53-nmb-no-34` (scout certification R-7687), `53-nmb-no-33` (scout certification R-7688), `53-nmb-no-31` (dismissal R-7689, not a scout seed), `53-nmb-no-30` (scout single-carrier FUI R-7690), `53-nmb-no-29` (certification R-7685, not a scout seed), `53-nmb-no-28` (FUI R-7688), `53-nmb-no-27` (certification R-7684). FY2026 and FY2025 tables were walked. Jurisdictional opinion letters and the PEB hearing notice stayed off the bag.

Local unpaid proof against that bag: `GET /nmb-determinations` **402**, `maxAmountRequired` **50000**. `GET /nmb-determinations?id=53-nmb-no-34` **402**, **20000**. Free manifest **200**, `cardCount` 7, `asOf` 2026-09-17, cards have `paidUrl` only — no `sourceUrl`, no `wp-content/uploads` PDF, no opinion needle.

Fixture / dry collect (no secrets, no live PDF fetch):

```bash
NMB_DETERMINATIONS_DIR=/tmp/nmb-determinations-dry \
  NMB_DETERMINATIONS_HTML_DIR=src/fixtures/nmb-determinations \
  NMB_DETERMINATIONS_LIMIT=7 NMB_DETERMINATIONS_MAX_FETCH=0 \
  npm run collect:nmb-determinations
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service` after checkout of this branch (not catalog `main`). Do not replace other door caches. Do not message Bruce. Do not touch Imagine/RB/Dryland. Do not touch Docker, Caddy, or the tunnel.

```bash
export NMB_DETERMINATIONS_DIR=$HOME/projects/mcp-proxy/data/nmb-determinations
mkdir -p "$NMB_DETERMINATIONS_DIR"
NMB_DETERMINATIONS_LIMIT=7 NMB_DETERMINATIONS_MAX_FETCH=8 NMB_DETERMINATIONS_PAGES=2 npm run collect:nmb-determinations
# add NMB_DETERMINATIONS_DIR to idaho-ticks-x402.service user unit
```

Applied on apollo (2026-09-22): fast-forward of [PR 273](https://github.com/bnmbnmai/mcp-proxy/pull/273) `fa4793e` onto live tip `cursor/fcc-eb-orders-apply-6bd2` @ `90d1c17` (FCC EB door `9e9cb66`). Apply-record branch `cursor/nmb-determinations-apply-1be0`. Restarted **only** `idaho-ticks-x402.service` at **2026-09-22 16:47:19 MDT** (PID 840884; was 727915). Added `NMB_DETERMINATIONS_DIR` to the user unit (`~/projects/mcp-proxy/data/nmb-determinations`). The door commit already exports that dir and the grow prefix in `scripts/ticks-collect.sh` (no new cron). One-door collect EXIT 0: FY2026 and FY2025 Determinations tables walked, `listedCount` **74**, `cardCount` **7**, `fetchedPdfs` **7**, `addedThisRun` 7, skipped 0, asOf **2026-09-17**, fetchedAt **2026-09-22T22:48:13.562Z**. Cards: **53 NMB No. 34** / R-7687 certification (California Northern Railroad Company), **53 NMB No. 33** / R-7688 certification (Iowa Interstate Railroad), **53 NMB No. 31** / R-7689 dismissal (not a scout seed), **53 NMB No. 30** / R-7690 single-carrier Findings Upon Investigation (Republic Airways / Mesa Airlines), **53 NMB No. 29** / R-7685 certification (Temple & Central Texas Railway), **53 NMB No. 28** / R-7688 Findings Upon Investigation, **53 NMB No. 27** / R-7684 certification. Representation Manual, PEB, and jurisdictional letters stayed off the bag. Free manifest is citation / case / date / institution + `paidUrl`; `sources.listing` is the agency-determinations index only. **No** `sourceUrl`, no card body, no `wp-content/uploads` PDF path. Unpaid `GET https://ticks.bnm.farm/nmb-determinations` is **402** at $0.05 (`50000`); `?id=53-nmb-no-34` is **402** at $0.02 (`20000`). A blank `?id=` is trimmed and priced as the page (`50000`), same as live `/fcc-eb-orders` and `/ecab-decisions`. `/.well-known/x402` lists `/nmb-determinations` among **67** doors (was 66). Banner `mcp /mcp — 67 tools`. Siblings `/fcc-eb-orders` and `/ticks` still 402. payTo unchanged `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. docker / Caddy / tunnel untouched. Lander card is on bnm.farm (tv-remote `43d7201`), hydrating the free manifest (Live: 7).

## Lander card

This repo does not own the bnm.farm lander. Paste on the tv-remote **live tip**, not stub `main`, only after apply. Count hydrates from `GET /nmb-determinations/manifest.json` (`cardCount`). Do not hardcode a door count or the bag size.

```html
<article class="door" data-door="nmb-determinations">
  <h2>NMB Determinations</h2>
  <p>Official National Mediation Board Railway Labor Act §2 Ninth representation determination text. 17 U.S.C. § 105. $0.05 newest 10 · $0.02 one id.</p>
  <p class="live">Live: <span data-hydrate="cardCount">…</span> official texts</p>
  <a href="https://ticks.bnm.farm/nmb-determinations/manifest.json">Free index</a>
</article>
```
