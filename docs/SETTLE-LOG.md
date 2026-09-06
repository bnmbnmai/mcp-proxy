# Path-level settle journal

Internal shop metrics for Chief. Public x402scan only shows origin totals and no resource path. This journal records **which door paid, when, and how much**.

Not a SKU. Not a public URL. Pricing is unchanged. Does not replace the skip-pay search tape in [`SHOP-REQUEST-LOG.md`](./SHOP-REQUEST-LOG.md).

## How paid GETs verify today

`servePaid` / `servePaidPdf` in `src/ticks-door.ts`:

1. Unpaid paid path → HTTP 402 (`X-PAYMENT` / `PAYMENT-SIGNATURE` required).
2. If `X402_SKIP_SETTLE=1` (local/test only) → serve 200.
3. Else CDP facilitator `POST {X402_FACILITATOR_URL}/verify` then `/settle` (`transferWithAuthorization` / exact scheme on Base USDC).
4. Else local EIP-3009 helper when `X402_SETTLE_KEY_FILE` is set on the host (never committed).

There was no settle journal before this file. The request log records 200 vs 402 by IP for skip-pay farming; it does **not** store amount, payer, or tx hash.

## What is written (live, going forward)

On a successful paid **HTTP 200** (after verify/settle, immediately before the JSON/PDF body), the door appends one JSONL line.

Default file on apollo after deploy:

```
~/projects/mcp-proxy/data/settle.jsonl
```

Cwd is the shop checkout (`~/projects/mcp-proxy`). Directory is created if missing. Gitignored.

```json
{"ts":"2026-09-06T17:00:00.000Z","path":"/form-483","amountAtomic":"20000","requestId":"a36f186d1d9bbde9-CMH","payer":"0x1111111111111111111111111111111111111111","txHash":"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","source":"live"}
```

| Field | Notes |
| --- | --- |
| `ts` | UTC ISO timestamp |
| `path` | Resource path only (`/ticks`, `/form-483`, …) |
| `amountAtomic` | USDC 6-decimal atomic (`20000` = $0.02, `50000` = $0.05) |
| `requestId` | `CF-Ray`, else `X-Request-Id`, else a generated `s-…` id |
| `payer` | EIP-3009 `authorization.from` when the payment header decodes. Wallet address only |
| `txHash` | Facilitator / local settle `transaction` when present |
| `source` | `live` for the door writer |

Not logged: `X-PAYMENT` payloads, signatures, settle key files, CDP JWTs, letter/table bodies, family passwords.

HTTP 304 (unchanged table / empty `?since=`) and failed settle 402s are **not** journaled.

| Env | Default | Purpose |
| --- | --- | --- |
| `SETTLE_LOG` | `1` | `0` disables writes |
| `SETTLE_LOG_PATH` | `data/settle.jsonl` | absolute or cwd-relative JSONL path |

Restart after deploy so the running `idaho-ticks-x402.service` picks up the writer:

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/settle-metrics-c08d
git checkout cursor/settle-metrics-c08d
npm run build
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** that unit. Redbubble / Dryland / farm family gates stay untouched.

## How Chief / apollo reads aggregates

Prefer the script. Do **not** put settle metrics behind a paid door.

```bash
cd ~/projects/mcp-proxy
./scripts/settle-metrics.sh
# or: npm run shop:settle-metrics
# or: node build/settle-log.js
```

Prints counts and USDC totals **by path**. Payer addresses and tx hashes are not printed (only `payerCount` / `txCount`).

```bash
tail -n 20 data/settle.jsonl
```

## Best-effort backfill (past events)

Apollo access logs are the ground truth for past paid 200s. This helper is **best-effort and clearly labeled**: it cannot recover payer or tx hash from Caddy/common logs.

Typical inputs on apollo:

- `~/projects/mcp-proxy/data/shop-request-log.jsonl` (paid-door HTTP 200 lines, if that tape was applied)
- Caddy JSON or combined access logs, if the ticks reverse-proxy writes them (often `/var/log/caddy/access.log` or a journald dump). Live ticks is `via: 1.1 Caddy` behind Cloudflare.

```bash
cd ~/projects/mcp-proxy
./scripts/backfill-settles-from-access-log.sh \
  data/shop-request-log.jsonl \
  /var/log/caddy/access.log
```

Rules: HTTP 200 + GET/POST on a paid door path only. Free `/firm-check`, `/sample`, `/{door}/manifest.json`, well-known, MCP, and OpenAPI are skipped. `?id=` on extracted-body doors is recorded as `20000`; page/table/mariners as `50000`. Idempotent on `ts|path|requestId`. `source` is `access-log` or `shop-request-log`.
