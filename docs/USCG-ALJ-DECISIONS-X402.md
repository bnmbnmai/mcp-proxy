# GET /uscg-alj-decisions — USCG ALJ Suspension & Revocation Decisions and Orders

Official **United States Coast Guard** Administrative Law Judge Suspension and Revocation **Decision and Order** text extracted from `uscg.mil` PDFs (`%PDF`) indexed by the public year tables. Docket form `YYYY-NNNN`. 17 U.S.C. § 105. Same extracted-body pipe as `/ccb-determinations`, `/ibla-decisions`, `/ttab-decisions`, `/oalj-decisions`, and `/oshrc-orders`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**.

**Habit through Sep 15 2026.** The 2026 index lists the docket, order date, allegations, findings, and dispositive order type. Scout seeds (must collect into the bag):

| Docket | Respondent | Order | Date | EA |
| --- | --- | --- | --- | --- |
| 2026-0155 | Tamryn Trevino | Default Order | 2026-07-09 | 8332918 |
| 2026-0152 | Antonio Wooten | Default Order | 2026-07-01 | 8332444 |
| 2026-0157 | Xavier Singleton | Consent Order | 2026-06-01 | 8357522 |

**Leak PASS:** the public index is metadata only. Free discovery is leak-clean: counts + docket / date / disposition label + `paidUrl`. **No `sourceUrl`**, no `/Portals/0/` PDF path, no respondent name, no order narrative.

**This SKU:** Default Orders, Consent Orders, and Decisions and Orders. **Not this SKU:** complaints, service packets, NTSB, Commandant CDOA appeals, Withdrawals, Admission Orders, pending rows with no PDF. **Not `/mariners`** (Local Notice to Mariners). **Not `/oalj-decisions`** (DOL). **Not `/oshrc-orders`.**

**Path:** `/uscg-alj-decisions` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

```bash
USCG_ALJ_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/uscg-alj-decisions \
  USCG_ALJ_DECISIONS_LIMIT=8 USCG_ALJ_DECISIONS_MAX_FETCH=8 \
  npm run collect:uscg-alj-decisions
```

Direct `uscg.mil` from this host is Akamai 403. The collector tries the official PDF first (`pdftotext`) and, on 403, reads the same official URL through a text extractor so the bag still holds the order text. `sourceUrl` stays the official `uscg.mil` PDF.

Dry fixture collect:

```bash
USCG_ALJ_DECISIONS_DIR=/tmp/uscg-alj-decisions-dry \
  USCG_ALJ_DECISIONS_HTML_DIR=src/fixtures/uscg-alj-decisions \
  USCG_ALJ_DECISIONS_LIMIT=8 USCG_ALJ_DECISIONS_MAX_FETCH=0 \
  npm run collect:uscg-alj-decisions
```

## Apply on media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service` after checkout of this branch. Do not replace other door caches. Do not message Bruce. Do not touch apollo.

```bash
export USCG_ALJ_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/uscg-alj-decisions
mkdir -p "$USCG_ALJ_DECISIONS_DIR"
USCG_ALJ_DECISIONS_LIMIT=8 USCG_ALJ_DECISIONS_MAX_FETCH=8 npm run collect:uscg-alj-decisions
# add USCG_ALJ_DECISIONS_DIR to idaho-ticks-x402.service user unit
systemctl --user daemon-reload
systemctl --user restart idaho-ticks-x402.service
```

Well-known goes 71 → 72 when this path is in `paidDiscoveryPaths()`.

## Lander card

This repo does not own the bnm.farm lander. Paste on the tv-remote live tip after apply. Count hydrates from `GET /uscg-alj-decisions/manifest.json` (`cardCount`). Do not hardcode a door count or the bag size.

```html
<article class="card">
  <p class="kicker">Product</p>
  <h2 class="product">USCG ALJ Decisions</h2>
  <p class="facts" id="uscg-alj-decisions-facts">USCG ALJ Suspension and Revocation Decision and Order text. Live: <strong>…</strong> official texts. $0.02 one text / $0.05 newest 10.</p>
  <a class="primary" href="https://ticks.bnm.farm/uscg-alj-decisions">Endpoint</a>
  <a href="https://ticks.bnm.farm/uscg-alj-decisions/manifest.json">Manifest</a>
</article>
```
