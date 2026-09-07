# Path-level settle journal

Internal shop metrics for Chief. Inventory of what was already on apollo: [`SHOP-METRICS-ON-DISK.md`](./SHOP-METRICS-ON-DISK.md). This file is the **settle** journal only. The request tape stays as-is.

Not a SKU. Not a public URL. Public `GET /shop-request-log` stays **404**.

## How paid GETs verify today

`servePaid` / `servePaidPdf` in `src/ticks-door.ts`:

1. Unpaid paid path → HTTP 402 (`X-PAYMENT` / `PAYMENT-SIGNATURE` required). Request tape logs 402.
2. If `X402_SKIP_SETTLE=1` (local/test only) → serve 200. Request tape logs 200. **No settle journal line.**
3. Else CDP facilitator `POST {X402_FACILITATOR_URL}/verify` then `/settle`.
4. Else local EIP-3009 helper when `X402_SETTLE_KEY_FILE` is set on the host (never committed).

On **verified settle success** (step 3 or 4), the door appends one JSONL line, then serves the 200. Path + atomic amount + tx hash when the settle body has `transaction`.

Known past settle (from the request tape + unit journal, not this file): **`GET /ticks` $0.05 at 2026-09-05T06:30:52.126Z** (`Mizan/0.1`).

## Where it lives on apollo after deploy

```
~/projects/mcp-proxy/data/settle.jsonl
```

Cwd is the shop checkout (`~/projects/mcp-proxy`). Directory is created if missing. Gitignored. Request tape remains `~/projects/mcp-proxy/data/shop-request-log.jsonl`.

```json
{"ts":"2026-09-06T17:00:00.000Z","path":"/ticks","amountAtomic":"50000","requestId":"a36f186d1d9bbde9-CMH","payer":"0x1111111111111111111111111111111111111111","txHash":"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","source":"live"}
```

| Field | Notes |
| --- | --- |
| `ts` | UTC ISO timestamp |
| `path` | Resource path only |
| `amountAtomic` | USDC 6-decimal atomic (`20000` = $0.02, `50000` = $0.05) |
| `requestId` | `CF-Ray`, else `X-Request-Id`, else a generated `s-…` id |
| `payer` | EIP-3009 `authorization.from` when the payment header decodes. Wallet only — never a key |
| `txHash` | Facilitator / local settle `transaction` when present |
| `source` | `live` for the door writer |

Not logged: `X-PAYMENT` payloads, signatures, settle key files, CDP JWTs, letter/table bodies, family passwords.

| Env | Default | Purpose |
| --- | --- | --- |
| `SETTLE_LOG` | `1` | `0` disables writes |
| `SETTLE_LOG_PATH` | `data/settle.jsonl` | absolute or cwd-relative JSONL path |

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/apply-settle-metrics-65c4
git checkout cursor/apply-settle-metrics-65c4
npm run build
systemctl --user restart idaho-ticks-x402.service
./scripts/settle-metrics.sh
./scripts/backfill-settles-from-access-log.sh data/shop-request-log.jsonl
```

Restart **only** that unit. This apply restacks PR 194 / PR 196 onto the live VA OIG tip (`cursor/apply-va-oig-fatten-cd1b` @ `2baaf04`). Do not check out the older `cursor/settle-metrics-c08d` or `cursor/settle-on-fmshrc-2ad8` bases — they sit behind VA OIG.

Applied on apollo (2026-09-07): live SHA **d6a7137** plus isolation follow-ups on `cursor/apply-settle-metrics-65c4`. Restarted **only** `idaho-ticks-x402.service`. Banner still `mcp /mcp — 48 tools` and now also `settle journal ~/projects/mcp-proxy/data/settle.jsonl`. Unpaid `/ticks`, `/fmshrc-orders`, `/hhs-oig-reports`, `/epa-cafo` stay **402**. `/.well-known/x402` still lists **48** doors (no new settle SKU). Public `GET /shop-request-log` stays **404**. `./scripts/settle-metrics.sh` rolls up by path. Best-effort backfill from `data/shop-request-log.jsonl` wrote labeled `source=shop-request-log` lines (no tx hash). Superfund FYR (PR 199) was not applied.

## How Chief / apollo reads aggregates

```bash
cd ~/projects/mcp-proxy
./scripts/settle-metrics.sh
# or: npm run shop:settle-metrics
```

By path: count + USDC. Does not print payer addresses or tx hashes.

The skip-pay rollup is still `node build/shop-request-log.js` (loopback `GET /shop-request-log` only).

## Best-effort backfill

Caddy `ticks.bnm.farm` has **no access log**. Past path comes from the request tape.

```bash
./scripts/backfill-settles-from-access-log.sh data/shop-request-log.jsonl
```

Only `kind=paid-door` + `status=200` + `paymentHeader=true`. Infers `50000` / `20000` from path/`?id=`. Cannot recover tx hash. Operator curls on the tape (e.g. `/hhs-oig-reports` skip-settle) will still look like paid 200s — labeled best-effort.
