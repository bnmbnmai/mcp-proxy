# LIVE door loop-closer (draft only)

Lists **empty / stale LIVE doors** from public well-known + free manifests. No outbound email, X, Slack, or board send. Does not invent doors or demand.

## Live snapshot (2026-09-18T04:35Z, unpaid / free only)

`GET https://ticks.bnm.farm/.well-known/x402` → **62** resources, includes `/ftc-orders`.

| Path | Bag | Watermark | Status | Draft follow-up |
| --- | --- | --- | --- | --- |
| `/ftc-orders` | `cardCount` **0**, `cards` [] | no `fetchedAt` / `asOf` | empty LIVE door | Evening 7:45 America/Boise collect owns the first bag walk. Do not start a second collect. No outbound. Lander paste: [`FTC-ORDERS-X402.md`](./FTC-ORDERS-X402.md). |

All other live paid doors returned a positive bag count (`cardCount` / `tickCount` / `letterCount` / `noticeCount`) or a fresh-enough watermark. Mariners / Form 483 / warning-letters use those other count keys — they are **not** empty.

`GET /llms.txt` on this scan includes **`## Table rebuy`**. Unpaid `GET /ticks` 402 bazaar already advertises `If-None-Match` + `?since=`. PR #243 ETag rebuy docs are **on the serving tip** (`cursor/ftc-orders-apply-7c31` / live SHA `73853b6`). No cherry-pick.

## Helper (draft notes only)

```bash
cd ~/projects/mcp-proxy
npm run shop:loop-closer
# writes data/live-door-loop-closer.md (gitignored) and prints the same draft
```

`ticks-collect.sh` runs this after a real collect (`--draft-only`). Dry-run collect does **not** hit the network.

Empty = free live manifest `cardCount === 0` (or empty `cards` with no other bag count). Stale = bag older than `TICKS_COLLECT_STALE_HOURS` (36). Do not treat a missing `cardCount` on mariners as empty.

No apollo SSH from this cloud PR. Evening collect is busy; this file is the cloud-side list.
