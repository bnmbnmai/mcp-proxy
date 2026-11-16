# CFPB consent-order / administrative-order text — x402 door

Official CFPB-authored **consent-order / administrative-order TEXT** extracted from per-order PDFs on files.consumerfinance.gov. Does not invent order text. Not the enforcement-actions HTML index. Not the action-page teaser ($2.5M, no numbered findings). Not the Consumer Complaint Database (`complaint_what_happened` is a KILL). Not FTC `/ftc-wl`. Not OCC `/occ-cd`. Not queued bank-regulator doors (`/fdic-orders`).

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /cfpb-orders` is HTTP 402.

v1 seeds **5** company administrative consent orders (Honda 2025, Equifax, Block, Performant, Wise amended). Do not harvest the whole 386-action index here.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /cfpb-orders` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /cfpb-orders/manifest.json` | free | HTTP 200 firm / date / title / fileNo / `status` (`in_force` or `terminated`) (no order body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.consumerfinance.gov/enforcement/actions/
- Per-action HTML (teaser / PDF URL only): `https://www.consumerfinance.gov/enforcement/actions/{slug}/`
- Official PDFs: `https://files.consumerfinance.gov/f/documents/{file}.pdf`
- Example: American Honda Finance Corporation 2025 `https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf`
- License: **17 USC 105**. Attribute CFPB.

Paid body keeps the existing `cards[]` fields: `id`, `fileNo`, `pdfId`, `firm`, `date`, `title`, `status`, `terminatedDate`, `terminationFileNo`, `terminationSourceUrl`, `sourceUrl`, `actionUrl`, `body`. `body` is official `pdftotext` of the CFPB-authored consent-order PDF. `sourceUrl` is always that files.consumerfinance.gov order PDF, not archive.org, not Apify, not the complaint dump. A termination PDF is not the paid body. `status` is `in_force` or `terminated`. Terminated cards stay in the bag.

`status` is filled from official CFPB "Order Terminating the Consent Order" PDFs on files.consumerfinance.gov, matched by enforcement-action id and the consent-order date printed on the termination PDF. `terminatedDate` is that PDF's docket "Filed" date. `terminationFileNo` and `terminationSourceUrl` are null on an `in_force` card. News alone does not flip a card. Wise US Inc. (`wise-us-inc`, 2025-01-30, file `2025-CFPB-0004`) stays `in_force`: the May 2025 official document is an amended consent order, not a termination. Goldman Sachs Bank USA stays `in_force` (no termination PDF; the Apple termination does not cover Goldman). The 2017 Fay order, the 2016 Toyota order, and the 2014 U.S. Bank order stay `in_force`; only the later order named in a termination PDF is `terminated`. Synapse is out of scope.

On the 137-card live bag this flags **17** `terminated` and leaves **120** `in_force`. `cardCount` does not drop.

Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=cfpb-order`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official CFPB enforcement listing). A repeat buyer diffs `asOf` + record ids.

`data/cfpb-orders/` is gitignored. Order bodies get lost on a dead VM — do not harvest the whole index here. Full fill waits for apollo.

Free `GET /cfpb-orders/manifest.json` is firm / date / title / fileNo / `status` / termination fields. The consent-order `sourceUrl` is stripped before the free JSON is sent. `terminationSourceUrl` stays on a terminated card so a buyer can see the official termination PDF. Free `?q=` matches `in_force` and `terminated`. It does not match `terminationSourceUrl`. Family / basic-auth stay off `ticks.bnm.farm`.

## Port onto the media-box serving checkout

The serving checkout is often ahead of GitHub and is on `cursor/ams-ethanol-rice-eggs-apply` locally. Do not replace `src/cfpb-orders.ts` with this branch's file. Port the diff onto the local files.

```bash
# on the media-box serving checkout — not this cloud VM
cd ~/projects/mcp-proxy
git fetch origin cursor/cfpb-order-status-5449
git diff origin/cursor/ams-ethanol-rice-eggs-apply...origin/cursor/cfpb-order-status-5449 -- \
  src/cfpb-orders.ts src/cfpb-orders.test.ts src/paid-records.ts src/ticks-door.ts docs/CFPB-ORDERS-X402.md
# apply those hunks by hand if the local branch has commits this PR does not
npm run build
node build/cfpb-orders.test.js
```

No snapshot edit. No full re-collect. Reading the snapshot applies the termination registry, so `cardCount` stays **137**, terminated cards keep their consent-order text, and the next collect persists the same flags. Do not restart from this PR. When the serving checkout is ready, restart **only** `idaho-ticks-x402.service`.

Confirm after that restart:

```bash
curl -s https://ticks.bnm.farm/cfpb-orders/manifest.json \
  | jq '{cardCount, terminatedCount, inForceCount,
        terminated: [.cards[] | select(.status=="terminated") | {id, firm, date, fileNo, status, terminatedDate, terminationFileNo}][0],
        inForce: [.cards[] | select(.id=="wise-us-inc") | {id, firm, date, fileNo, status, terminatedDate}][0]}'
# cardCount 137, terminatedCount 17, inForceCount 120
# one terminated card (for example apple-inc, terminatedDate 2025-09-22) and wise-us-inc status in_force
# free cards have no body and no consent-order sourceUrl
curl -s -o /dev/null -w 'page %{http_code}\n' https://ticks.bnm.farm/cfpb-orders
curl -s -o /dev/null -w 'id %{http_code}\n' 'https://ticks.bnm.farm/cfpb-orders?id=wise-us-inc'
# both 402. Page amount 50000 ($0.05). ?id= amount 20000 ($0.02). payTo unchanged.
curl -s 'https://ticks.bnm.farm/cfpb-orders/manifest.json?q=terminated' | jq '{matchCount, sample: .cards[0].status}'
curl -s 'https://ticks.bnm.farm/cfpb-orders/manifest.json?q=in_force' | jq '{matchCount, sample: .cards[0].status}'
```

Unpaid prices checked before this change, still the live door: `GET /cfpb-orders` **402** / `50000`, `GET /cfpb-orders?id=wise-us-inc` **402** / `20000`, payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004`, network Base, asset USDC. This PR does not change those.

## Env

| Variable | Default | Purpose |
|---|---|---|
| `CFPB_ORDERS_DIR` | `$HOME/projects/mcp-proxy/data/cfpb-orders` | Snapshot cache (`snapshot.json` + downloaded PDFs) |
| `CFPB_ORDERS_LIMIT` | `5` | Target **additional** real extractable bodies this run. Cached bodies are reused and do **not** count. `0` = keep walking |
| `CFPB_ORDERS_MAX_FETCH` | `8` | Max official PDF downloads per run. Already-on-disk PDFs do not count. `0` = no cap |
| `CFPB_ORDERS_MAX_ACTIONS` | `40` | Cap uncached action-page fetches so complaint-only rows cannot walk past the PDF cap |
| `CFPB_ORDERS_FETCH_MS` | `20000` | Listing / action / PDF fetch timeout. Later-page fail keeps the cached bag and refreshes `fetchedAt` |
| `CFPB_ORDERS_HTML_DIR` / `CFPB_ORDERS_LISTING_DIR` | unset | Optional already-fetched `listing-excerpt.html` + `{slug}.html` + `{pdfId}.txt` |
| `CFPB_ORDERS_PDFTOTEXT` | `pdftotext` | Poppler extractor |

Do not set `X402_SKIP_SETTLE` on the standing public unit. Family / basic-auth stay off `ticks.bnm.farm`.

Applied on apollo (2026-09-07): **serving SHA `3eb5cec`** (apply-record [PR 209](https://github.com/bnmbnmai/mcp-proxy/pull/209); FF of [PR 208](https://github.com/bnmbnmai/mcp-proxy/pull/208) onto `cursor/apply-vet402-receipt-e6e8` @ `43f5ce7`). Restarted **only** `idaho-ticks-x402.service` at **2026-09-07 22:54:39 MDT** (PID 1356455). One-door collect EXIT 0 in 32s: `fetchedAt` **2026-09-07T14:13:36.511Z → 2026-09-08T04:56:02.857Z**, `cardCount` still **137**, `listedCount` 386. Did not log `collect failed`. Public unpaid `GET /cfpb-orders` stays **402**.

## Apollo collect (historical first fill)

The block below is the original first-fill note. Do not check out `cursor/cfpb-orders-door-5c4d` over the serving tree. The status port is the section above. This cloud VM cannot publish `ticks.bnm.farm` and must not restart `idaho-ticks-x402`.

```bash
# on apollo — not this Cloud VM
sudo apt-get install -y poppler-utils
cd ~/projects/mcp-proxy
git fetch origin
git checkout cursor/cfpb-orders-door-5c4d
npm run build

export CFPB_ORDERS_DIR=$HOME/projects/mcp-proxy/data/cfpb-orders
# seed is already in src/fixtures/cfpb-orders/seed-snapshot.json
# full fill later — LIMIT is additional, not total
CFPB_ORDERS_LIMIT=5 CFPB_ORDERS_MAX_FETCH=8 npm run collect:cfpb-orders

sudo systemctl restart idaho-ticks-x402
```

## Local smoke (cloud VM / laptop)

```bash
CFPB_ORDERS_DIR=/tmp/cfpb-orders-seed npm run collect:cfpb-orders   # or copy the bundled seed
CFPB_ORDERS_DIR=/tmp/cfpb-orders-seed X402_SKIP_SETTLE=1 npm run start:ticks
curl -i http://127.0.0.1:4020/cfpb-orders                 # HTTP 402, 50000 atomic
curl -s http://127.0.0.1:4020/cfpb-orders/manifest.json   # cardCount + firm/date/title/fileNo/status; no order body
```
