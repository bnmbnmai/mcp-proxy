# NEW stranger-settle alert (Chief ping)

Uses the **existing** settle journal only. Does not invent settles. Not a SKU. Not a public URL.

Shop path: after a verified facilitator / local EIP-3009 settle, `servePaid` refreshes the artifact. Collect path: `ticks-collect.sh` runs the same scan after `collect done`.

## Artifact Chief can ping

```
cat ~/projects/mcp-proxy/data/stranger-settle-alert.txt
```

One line, path / $ / payer class. No wallet. No tx hash.

```
/ticks $0.05 stranger
```

or, when the journal has no **new** stranger:

```
none
```

Empty journal → `none`. Backfill rows without a payer are class `unknown` and do not alert.

## Payer class

| Class | Meaning |
| --- | --- |
| `house` | EIP-3009 `from` listed in `HOUSE_PAYERS` or optional `data/house-payers.txt` |
| `stranger` | Wallet present and not house |
| `unknown` | No payer (best-effort backfill). Not a stranger alert |

Do **not** invent house wallets in git. Set them on apollo:

```
HOUSE_PAYERS=0x…
# or one 0x per line in data/house-payers.txt (gitignored)
```

## Commands

```bash
cd ~/projects/mcp-proxy
npm run shop:stranger-alert
# or: node build/stranger-settle-alert.js
```

| Env | Default | Purpose |
| --- | --- | --- |
| `STRANGER_SETTLE_ALERT_PATH` | `data/stranger-settle-alert.txt` | one-line ping file |
| `STRANGER_SETTLE_SEEN_PATH` | `data/stranger-settle-seen.json` | already-alerted journal keys |
| `HOUSE_PAYERS` | (empty) | comma-separated house wallets |
| `HOUSE_PAYERS_PATH` | `data/house-payers.txt` | optional house list |
| `SETTLE_LOG_PATH` | `data/settle.jsonl` | existing journal |

Restart **only** `idaho-ticks-x402.service` if you want the shop-path hook on the next real settle. Collect picks up the scan on the next 07:45 / 19:45 walk. No apollo SSH from this cloud PR.
