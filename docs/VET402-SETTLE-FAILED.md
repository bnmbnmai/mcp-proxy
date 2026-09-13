# Apply vet402 settle_failed fix onto the live ticks tip

Code-only stack of [PR 227](https://github.com/bnmbnmai/mcp-proxy/pull/227) (`cursor/vet402-settle-failed-8d6b` @ `12d085c`) on the live `/faa-civil-penalty` tip. Catalog `main` is not the door host. No new door. payTo and prices unchanged.

Unpaid 402 `accepts[].extra` still carries shop bag keys (`tableWhole`, `pagePriceAtomic`, …). Facilitator `POST /verify` and `/settle` extra is EIP-712 `{ name: "USD Coin", version: "2" }` only. Paid 200 still requires a real txHash. Settle-failed 402 sets `PAYMENT-RESPONSE`.

**Path:** `/ticks` · **$0.05** / **50000** atomic · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Restart **only** `idaho-ticks-x402.service`. Do not checkout catalog `main`. Do not message Bruce.

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/vet402-settle-failed-8d6b
# serving tree = 12d085c on the live faa-civil-penalty tip
npm run build
node build/ticks-door.test.js
node build/settle-log.test.js
systemctl --user daemon-reload
systemctl --user restart idaho-ticks-x402.service
```

Applied on apollo (2026-09-13): **serving SHA `6d81fe7`** (apply-record [PR 228](https://github.com/bnmbnmai/mcp-proxy/pull/228); cherry-pick of [PR 227](https://github.com/bnmbnmai/mcp-proxy/pull/227) `12d085c` onto `cursor/apply-faa-civil-penalty-f4d0` @ `d45dc73` / prior serving `18f8026`). Restarted **only** `idaho-ticks-x402.service` at **2026-09-13 13:11:10 MDT** (PID 2067443; was 3985516). `npm run build` exit 0; `ticks-door tests ok`; `settle-log tests ok`. Unpaid `GET https://ticks.bnm.farm/ticks` is **402** at $0.05 / `50000` / USD Coin with `extra.tableWhole` + `extra.pagePriceAtomic` intact and no `PAYMENT-RESPONSE`. `/.well-known/x402` still **58** doors. Banner `mcp /mcp — 58 tools`. Siblings `/faa-civil-penalty` `/epa-eab` `/epa-alj` `/air-letters` still 402. docker-gw / Caddy / tunnel untouched. No collect. No shop USDC spent.

Proof: `artifacts/vet402_settle_failed_apply_live_verify.json`
