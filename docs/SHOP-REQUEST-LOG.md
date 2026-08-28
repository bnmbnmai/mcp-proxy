# Shop request log — search tape / skip-pay rollup

Local append-only JSONL on the ticks shop host. Not a SKU. Not a public URL. Search stays free. Pricing is unchanged.

## What is logged

Every `GET /firm-check` and every paid-door GET/POST (`/ticks` and the official text doors) appends one JSON line. Manifests, `/sample`, well-known, MCP, and OpenAPI are not logged.

Each line is one of:

```json
{"ts":"2026-08-28T02:20:00.000Z","ip":"203.0.113.9","path":"/firm-check","kind":"firm-check","status":200,"ua":"curl/8.5.0","q":"pfizer","matchCount":3}
```

```json
{"ts":"2026-08-28T02:20:01.000Z","ip":"203.0.113.9","path":"/untitled-letters","kind":"paid-door","status":402,"ua":"curl/8.5.0","id":"pfizer-inc-191932","paymentHeader":false}
```

| Field | When | Notes |
| --- | --- | --- |
| `ts` | always | ISO timestamp |
| `ip` | always | `CF-Connecting-IP`, else first `X-Forwarded-For`, else socket |
| `path` | always | pathname only |
| `kind` | always | `firm-check` or `paid-door` |
| `status` | always | HTTP status (`200` / `400` / `402`) |
| `ua` | always | `User-Agent`, truncated |
| `q` | firm-check | search string, truncated at 200 chars |
| `matchCount` | firm-check 200 | count from the free search payload (not the match list) |
| `id` | paid-door | `?id=` if present, truncated. Not a letter body |
| `paymentHeader` | paid-door | `true` if `X-PAYMENT` / `PAYMENT-SIGNATURE` was present. Value is never stored |

Not logged: response bodies, letter text, table rows, `X-PAYMENT` payloads, wallets, API keys.

## Where it lives

Default file: `data/shop-request-log.jsonl` under the shop cwd (`~/projects/mcp-proxy` on apollo). Append-only. Gitignored.

| Env | Default | Purpose |
| --- | --- | --- |
| `SHOP_REQUEST_LOG` | `1` | `0` disables writes |
| `SHOP_REQUEST_LOG_PATH` | `data/shop-request-log.jsonl` | absolute or cwd-relative JSONL path |
| `SHOP_REQUEST_HEAVY_SEARCH_MIN` | `5` | “searched a lot” cutoff for never-paid IPs |

## How an operator reads the skip-pay rollup

On the shop host, after the door has taken traffic:

```bash
cd ~/projects/mcp-proxy
node build/shop-request-log.js
# or: npm run shop:search-rollup
```

That prints:

- `uniqueIps` — distinct client IPs in the search tape
- `searchCount` — `/firm-check` lines
- `paidDoorCount` / `paid200Count` — paid-door hits, and how many actually returned a body
- `paidFollowCount` — unique IPs that searched, then later hit a paid door (402 or 200). Join key is `ip`
- `heavyNeverPaid` — IPs with ≥ `heavySearchMin` searches and **no** paid-door HTTP 200. That is the skip-pay question.

Optional local HTTP (not public, not in well-known):

```bash
curl -s http://127.0.0.1:4020/shop-request-log
```

This answers only when the socket is loopback **and** there is no `CF-Connecting-IP` / `X-Forwarded-For`. A request that arrived through Cloudflare 404s. It is not a free public IP dump.

Raw lines:

```bash
tail -n 50 data/shop-request-log.jsonl
```
