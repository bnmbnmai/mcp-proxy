# BNM Data Shop MCP

Thin MCP for the **same thirty-one live paid GETs** on https://ticks.bnm.farm. Not a 32nd door. Payment stays x402 USDC on Base to `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. `$0.02` `/ticks`, `$0.05` everything else.

## Connect

```bash
npx -y mcp-remote https://ticks.bnm.farm/mcp
```

Or point an MCP client at `https://ticks.bnm.farm/mcp` (Streamable HTTP).

Stdio on this lineage: `TICKS_BASE=https://ticks.bnm.farm node build/ticks-mcp.js`.

## Tools

One tool per live paid path from `/.well-known/x402`. Each tool GETs that URL. Unpaid still HTTP 402. After `X-PAYMENT`, the same URL returns JSON.

Does not wrap openFDA, OFAC SDN, FRED, WASDE, or `/cma-ca98`. Not Bazaar-indexed.
