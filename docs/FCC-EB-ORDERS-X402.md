# GET /fcc-eb-orders — FCC Enforcement Bureau order text

Official **Enforcement Bureau** order text from `docs.fcc.gov/public/attachments/DA-*-A1.pdf`, discovered on the FCC Daily Digest at `www.fcc.gov/edocs/daily-digest/YYYY/MM/DD`. 17 U.S.C. § 105. Same extracted-body pipe as `/nlrb-decisions` and `/ecab-decisions`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe. Empty delta is unpaid 304.

Collector shape: walk `https://www.fcc.gov/edocs/daily-digest` → newest day pages → keep rows whose bureau token is **EB** and whose instrument is an order, Notice of Violation, Final Determination Order, NAL, forfeiture order, consent decree, citation, admonishment, or Notice of Illegal Pirate Radio Broadcasting → `https://docs.fcc.gov/public/attachments/DA-NN-NNNNA1.pdf` → `pdftotext -layout`. Scout seeds (**DA-26-1006** Vazquez Broadcasting NOV, released 2026-09-18; **DA-26-237** Belthrough LLC Final Determination Order, released 2026-03-12, digest day 2026-03-13) are **examples, not a frozen list**. Later EB rows on the same September digests (**DA-26-987** Joseph Pacius NIPRB; **DA-26-954** Satcom Global consent decree) are first-class.

**Harvest Enforcement Bureau DA orders only.**

**Do not sell as this SKU:** Satellite / Space Bureau (`SB`) digest rows, Media Bureau (`MB`) rows, Public Safety and Homeland Security (`PSHSB`, including joint `OMR PSHSB` / `WTB PSHSB`) rows, Wireline (`WCB`), International (`OIA`), and other non-EB bureaus. DOC- public-notice compilations, `.txt` / `.docx` siblings, and `A2` appendices are not the slip. An EB workshop announcement with no order instrument is not this SKU.

`www.fcc.gov` Daily Digest is Akamai **403** from the cloud VM and from apollo (descriptive User-Agent, Mozilla-compatible, and a browser User-Agent). Fetch uses the same descriptive `bnm-data-shop` User-Agent live `/oalj-decisions` and `/ecab-decisions` already use (`bnm-data-shop/1.0 (FCC Enforcement Bureau orders; +https://www.fcc.gov/edocs/daily-digest)`). `docs.fcc.gov` returns **406** for `Accept: application/pdf` and `%PDF-` when `Accept` includes `*/*`. PDF fetch uses `application/pdf,application/octet-stream,*/*`. When every digest day is 403, collect still fetches the scout seed PDFs.

## Leak test (2026-09-22) — not a kill

The opinion lives in the DA PDF. The digest is a caption list (bureau, DA number, attachment names). It does not contain the order body.

| Probe | Result |
| --- | --- |
| `GET /edocs/daily-digest/2026/09/18` | Digest captions. EB row: Vazquez Broadcasting NOV, `(DA No. 26-1006). EB.`, `DA-26-1006A1.pdf`. MB / SB / PSHSB rows on the same page are not EB orders. |
| `GET /edocs/daily-digest/2026/03/13` | Belthrough Final Determination Order `(DA No. 26-237). EB.` Adopted 2026-03-12. |
| `GET https://docs.fcc.gov/public/attachments/DA-26-1006A1.pdf` | **200** `application/pdf`, `%PDF-1.7`. |
| `GET https://docs.fcc.gov/public/attachments/DA-26-237A1.pdf` | **200** `application/pdf`, `%PDF-1.7`. |
| Sibling `DA-26-1006A1.txt` | **200** `text/plain`. Same document, not the sold body, and not linked from the free manifest. |

Free discovery is leak-clean: counts + DA number / date / institution + `paidUrl` only. **No `sourceUrl`**, no `docs.fcc.gov` PDF or txt path. Paid `?id=` / page still attribute the official PDF.

**Path:** `/fcc-eb-orders` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

**Seeds (examples, not a frozen list):** **DA-26-1006** Vazquez Broadcasting Corporation, AM station WSDS, Salem Township, Michigan (September 18, 2026); **DA-26-237** Belthrough LLC (March 12, 2026).

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Branch stacks on the live ticks tip `cursor/ecab-decisions-apply-2155` (`0870e58`).

## Collect command

```bash
FCC_EB_ORDERS_DIR=$HOME/projects/mcp-proxy/data/fcc-eb-orders \
  FCC_EB_ORDERS_LIMIT=7 FCC_EB_ORDERS_MAX_FETCH=8 FCC_EB_ORDERS_PAGES=4 \
  npm run collect:fcc-eb-orders
```

Fixture / dry collect (no secrets, no live PDF fetch):

```bash
FCC_EB_ORDERS_DIR=/tmp/fcc-eb-orders-dry \
  FCC_EB_ORDERS_HTML_DIR=src/fixtures/fcc-eb-orders \
  FCC_EB_ORDERS_LIMIT=7 FCC_EB_ORDERS_MAX_FETCH=0 \
  npm run collect:fcc-eb-orders
```

Local fixture bag (2026-09-22, `fetchedPdfs` 0): **cardCount 4**, **listedCount 5**, **asOf 2026-09-18**. Cards: DA-26-1006 Notice of Violation (Vazquez Broadcasting Corporation), DA-26-987 Notice of Illegal Pirate Radio Broadcasting (Joseph Pacius and Myriam Pierrevilus), DA-26-954 Consent Decree (Satcom Global, Inc.), DA-26-237 Final Determination Order (Belthrough LLC). DA-26-981 is listed and skipped (no local text). Free manifest from that snapshot: `cardCount` 4, no `sourceUrl`, no body, no `docs.fcc.gov`. Live Daily Digest walk from this VM is Akamai 403, so this bag is the fixture harvest, not a live digest crawl.

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service` after checkout of this branch (not catalog `main`). Do not replace other door caches. Do not message Bruce. Do not touch Imagine/RB/Dryland. Do not touch Docker, Caddy, or the tunnel. This VM did not restart apollo and did not deploy.

```bash
export FCC_EB_ORDERS_DIR=$HOME/projects/mcp-proxy/data/fcc-eb-orders
mkdir -p "$FCC_EB_ORDERS_DIR"
FCC_EB_ORDERS_LIMIT=7 FCC_EB_ORDERS_MAX_FETCH=8 FCC_EB_ORDERS_PAGES=4 npm run collect:fcc-eb-orders
# add FCC_EB_ORDERS_DIR to idaho-ticks-x402.service user unit
```

Local unpaid proof (`node build/ticks-door.test.js`, 2026-09-22, `X402_SKIP_SETTLE=1`, snapshot DA-26-1006): unpaid `GET /fcc-eb-orders` **402** `maxAmountRequired` **50000**; unpaid `GET /fcc-eb-orders?id=DA-26-1006` **402** **20000**; empty `?since=2026-09-19` **304**; free `GET /fcc-eb-orders/manifest.json` **200** with card metadata and `paidUrl` only (no `sourceUrl`, no body, no `docs.fcc.gov`). Paid `X-PAYMENT` returned **200** with the order body and the official PDF `sourceUrl`.

## Lander card

This repo does not own the bnm.farm lander. Paste on the tv-remote **live tip**, not stub `main`. Count hydrates from `GET /fcc-eb-orders/manifest.json` (`cardCount`). Do not hardcode a door count or the bag size.

```html
<article class="door" data-door="fcc-eb-orders">
  <h2>FCC EB Orders</h2>
  <p>Official FCC Enforcement Bureau order text (NOV, Final Determination Order, consent decree). 17 U.S.C. § 105. $0.05 newest 10 · $0.02 one id.</p>
  <p class="live">Live: <span data-hydrate="cardCount">…</span> official texts</p>
  <a href="https://ticks.bnm.farm/fcc-eb-orders/manifest.json">Free index</a>
</article>
```
