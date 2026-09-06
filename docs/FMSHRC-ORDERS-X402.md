# Apply GET /fmshrc-orders onto the live ticks tip

Official **FMSHRC ALJ Decision and Order / Decision on Motion** and **Commission Decision / Commission Order** TEXT from PDFs linked on the ALJ and Commission issuance boards (`https://www.fmshrc.gov/decisions/alj`, `https://www.fmshrc.gov/decisions/commission`). HTML mirrors are the same body. 17 U.S.C. § 105. Ugly PDF/HTML cache. Extracted-body door: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe as sibling body doors.

Prefer Secretary of Labor v. [Operator] civil-penalty adjudications. Do **not** sell miner discrimination / §105(c) complainant-named packs (`Secretary obo [person]`), MSHA Open Government Violations / Assessed-Violations rows, Blue Book TOC-only, or free MSHA metadata wraps.

**Path:** `/fmshrc-orders` · **$0.05** page / **$0.02** `?id=` · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base
**Collector:** ALJ + Commission `whole-review` scrape + `pdftotext`.
**Seed:** `CENT-2025-0091` (Big Spring Sands LLC, Decision and Order, 2026-07-02, Order No. 9994013). Also: Doe Run `CENT-2025-0167`, Canyon Fuel `WEST-2021-0229`, Commission Order Trap Rock `CENT-2025-0051`.

MCP tools are generated from live well-known (no hardcoded door count).

This cloud VM does **not** deploy to apollo / media-box. Code + PR only.

## Collect command

```bash
FMSHRC_ORDERS_DIR=$HOME/projects/mcp-proxy/data/fmshrc-orders \
  FMSHRC_ORDERS_LIMIT=8 FMSHRC_ORDERS_MAX_FETCH=12 \
  npm run collect:fmshrc-orders
```

Fixture / dry collect (no secrets):

```bash
FMSHRC_ORDERS_DIR=/tmp/fmshrc-orders-dry \
  FMSHRC_ORDERS_HTML_DIR=src/fixtures/fmshrc-orders \
  FMSHRC_ORDERS_LIMIT=8 FMSHRC_ORDERS_MAX_FETCH=0 \
  npm run collect:fmshrc-orders
```

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not replace other door caches. Do not checkout catalog `main`.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/fmshrc-orders-door-e154
git checkout cursor/fmshrc-orders-door-e154
export FMSHRC_ORDERS_DIR=$HOME/projects/mcp-proxy/data/fmshrc-orders
mkdir -p "$FMSHRC_ORDERS_DIR"
npm run build
FMSHRC_ORDERS_LIMIT=8 FMSHRC_ORDERS_MAX_FETCH=12 npm run collect:fmshrc-orders
systemctl --user restart idaho-ticks-x402.service
```

## After apply

- unpaid `GET https://ticks.bnm.farm/fmshrc-orders` is HTTP 402 at $0.05
- unpaid `GET ?id=CENT-2025-0091` is HTTP 402 at $0.02
- empty `?since=` delta is unpaid 304
- free `GET /fmshrc-orders/manifest.json` is HTTP 200, counts + source URLs only, no decision body
- paid GET returns JSON `cards[].body` + `records[]`
- `/.well-known/x402` lists `/fmshrc-orders`
- `/` shop JSON lists the product
- `/mcp` tools include `fmshrc-orders` generated from well-known
