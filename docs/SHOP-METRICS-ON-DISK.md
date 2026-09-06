# Shop metrics on disk (apollo / media-box)

Inventory from 2026-09-06 (media-box / apollo). IPs and keys omitted.

## Job A — $0.05 settle path

**Path: `/ticks`.** HTTP **200**. Paid GET at **2026-09-05T06:30:52.126Z**. Matches on-chain `2026-09-05T06:30:53Z` / `$0.05` / `/ticks` table price (`50000` atomic). Not `/epa-cafo`. Buyer UA `Mizan/0.1`.

Sequence on the existing request tape (`~/projects/mcp-proxy/data/shop-request-log.jsonl`):

1. Unpaid probe `402` at `06:30:50.128Z` (`paymentHeader:false`)
2. Paid `200` at `06:30:52.126Z` (`paymentHeader:true`)

App journal (`journalctl --user -u idaho-ticks-x402.service`, America/Boise): `facilitator /verify` then `/settle bazaar processing` at `00:30:51-06:00` / `00:30:52-06:00`. Journal lines do **not** name the path.

## What already exists (do not reinvent)

| Path | What it measures | Gap |
| --- | --- | --- |
| `data/shop-request-log.jsonl` + `src/shop-request-log.ts` | Every `/firm-check` and paid-door GET/POST: `ts`, path, status, `paymentHeader` bool. Public `GET /shop-request-log` **404s**. Loopback rollup only. | No atomic amount, no tx hash. `paid200` mixes operator curls. |
| `docs/SHOP-REQUEST-LOG.md` | Operator notes for that tape. | — |
| `journalctl --user -u idaho-ticks-x402.service` | `facilitator /verify` / `/settle` (no path). | Cannot name the door. |
| Caddy `ticks.bnm.farm` | **No `log` directive.** No access file. Docker stdout is error-only. | Cannot backfill path for older chain txs. |
| `homelab/todo-write/refresh_shop_stats.py` | Board `shopStats`. Was hardcoded `paid=3` / `$0.06`. | Interim update to 4 / $0.11 is a board job, not this door. |

Tape `status=200` + `paymentHeader=true` (inventory pulse): three `/hhs-oig-reports` on 2026-09-03 (`curl/8.5.0`, likely operator), one `/ticks` on 2026-09-05 (this settle).

## Gap this door now closes

**Per-resource settle journal** — `data/settle.jsonl` written on **verified facilitator (or local EIP-3009) settle success**, with `path`, `amountAtomic`, `txHash` when the settle body has one, UTC `ts`, `requestId`. See [`SETTLE-LOG.md`](./SETTLE-LOG.md).

- Does not replace or change the request tape.
- `X402_SKIP_SETTLE=1` test 200s are **not** journaled (those are not settles).
- Public `/shop-request-log` stays **404**.
- Summarizer: `./scripts/settle-metrics.sh` (by path; no payer keys).
- Best-effort past events: `./scripts/backfill-settles-from-access-log.sh data/shop-request-log.jsonl` (only `paid-door` + `200` + `paymentHeader:true`). Caddy cannot help.
