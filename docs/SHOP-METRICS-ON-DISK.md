# Shop metrics on disk (apollo / media-box)

Inventory from 2026-09-06. No refactor. IPs and keys omitted.

## Job A — $0.05 settle path

**Path: `/ticks`.** HTTP **200**. Paid GET at **2026-09-05T06:30:52.126Z**. Matches on-chain `2026-09-05T06:30:53Z` / `$0.05` / `/ticks` table price (`50000` atomic). Not `/epa-cafo`.

Sequence (same buyer UA `Mizan/0.1`):

1. Unpaid probe, then pay:
   ```
   {"ts":"2026-09-05T06:30:50.128Z","path":"/ticks","kind":"paid-door","status":402,"paymentHeader":false,"ua":"Mizan/0.1 (ispettore x402; https://mizan-bazar.higgsfield.app)"}
   {"ts":"2026-09-05T06:30:52.126Z","path":"/ticks","kind":"paid-door","status":200,"paymentHeader":true,"ua":"Mizan/0.1 (ispettore x402; https://mizan-bazar.higgsfield.app)"}
   ```
   Source: `~/projects/mcp-proxy/data/shop-request-log.jsonl` (gitignored).

2. App journal, America/Boise (`00:30:52-06:00` = `06:30:52Z`):
   ```
   2026-09-05T00:30:51-06:00 idaho-ticks-x402.service  facilitator /verify bazaar processing
   2026-09-05T00:30:52-06:00 idaho-ticks-x402.service  facilitator /settle bazaar processing
   ```
   Journal lines do **not** name the path. Path comes from the JSONL pair above.

### Caddy / reverse-proxy

`homelab/Caddyfile` `http://ticks.bnm.farm` has **no `log` directive**. Successful GETs are not written to a file. `bnm-caddy` stdout is error-only (`http.log.error`, mostly `/mcp` 502). Window `2026-09-05T06:30:45Z`–`06:31:05Z` has **no** `/ticks` line. Caddy error stdout still reaches **2026-08-01**.

### Log reach

| Source | Oldest kept | Notes |
| --- | --- | --- |
| `data/shop-request-log.jsonl` | 2026-08-28T02:48:05Z | Still live; ~54k lines |
| `journalctl --user -u idaho-ticks-x402.service` | 2026-08-17T12:54:49-06:00 | Not rotated away |
| Caddy access file | none | Never configured |
| `bnm-caddy` docker stdout | ~2026-08-01 | Errors only |
| Settle / receipt JSONL | **missing** | No `*settle*.jsonl` under `~/projects/mcp-proxy` or `/var/log` |

## Job B — what already records discovery / settles

Ran existing rollup: `node build/shop-request-log.js` (`npm run shop:search-rollup`).

| Path | What it measures | Gap |
| --- | --- | --- |
| `data/shop-request-log.jsonl` | Every `/firm-check` and paid-door GET/POST: `ts`, path, status, `paymentHeader` bool, optional `id` / `q` / `matchCount`. Not amount, not tx, not settle. | `paid200` ≠ on-chain settle (operator curls count). No dollars. |
| `src/shop-request-log.ts` + `GET 127.0.0.1:4020/shop-request-log` | Host rollup: `uniqueIps`, `searchCount`, `paidDoorCount`, `paid200Count`, `paidFollowCount`, `heavyNeverPaid`. Public URL 404s. | Same: no per-resource settle / revenue. |
| `docs/SHOP-REQUEST-LOG.md` | Operator notes for the tape. | — |
| `journalctl --user -u idaho-ticks-x402.service` | `facilitator /verify` / `/settle bazaar processing` (no path). Older `local eip3009 settle 0x…` (dev). | Cannot name the door. |
| `homelab/todo-write/refresh_shop_stats.py` | Maps rollup → todo `shopStats`: `searches`, `hits`, `paid`, `dollars`. **Hardcodes** `paid=3`, `dollars=0.06` (2026-08-24 x402scan). | Stale vs 4 tx / $0.11. |
| `homelab/sites/private/todo/stats.json` + `seed.json` `shopStats` | Board strip: searches 245 / hits 20897 / paid 3 / $0.06. | Not path-level. Dollars not from tape. |
| `SHOP-INDEX.md` / `docs/SHOP-INDEX.md` | Live doors + prices. Explicitly **does not** claim sales volume. | — |
| `docs/DISCOVERY-LISTINGS.md` | Where doors are listed (well-known, x402scan origin, Bazaar still empty). | Listing status, not revenue. |
| Caddy access | none | — |

Live rollup this pulse (no IPs): `uniqueIps=681`, `searchCount=390`, `paidDoorCount=53602`, `paid200Count=4`, `paidFollowCount=37`, `heavyNeverPaid=6`.

Tape `status=200` + `paymentHeader=true` (4 rows): three `/hhs-oig-reports` on 2026-09-03 (`curl/8.5.0`, likely operator), one `/ticks` on 2026-09-05 (this settle).

Public facilitator `/settle` lines in the ticks unit: 2026-08-23 (two) and **2026-09-05 `/ticks`**. Journal does not attach those August settles to a path.

## Gap to close later (not this pass)

**Per-resource settle count and revenue do not exist.** Closest proxy is JSONL `path` + `paymentHeader` + `200`, which mixes skip-settle / operator curls and stores no atomic amount. Board `dollars` is a frozen x402scan total. Caddy cannot backfill path for older chain txs. A settle journal (path, atomic, tx, ts) would be the missing piece.
