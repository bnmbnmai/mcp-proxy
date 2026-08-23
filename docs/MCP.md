# BNM Data Shop MCP

Thin MCP for the **same live paid GETs** listed on https://ticks.bnm.farm/.well-known/x402. Tools are generated from that document at process start / request time, so a later SKU (for example CMA) appears without rewriting MCP. Not a new door. Payment stays x402 USDC on Base to `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. `$0.02` `/ticks`, `$0.05` everything else.

## Connect

```bash
npx -y mcp-remote https://ticks.bnm.farm/mcp
```

Or point an MCP client at `https://ticks.bnm.farm/mcp` (Streamable HTTP).

Stdio on this lineage: `TICKS_BASE=https://ticks.bnm.farm node build/ticks-mcp.js`.

## Tools

One tool per live paid path from `/.well-known/x402` (enriched from `/openapi.json` when present). Each tool GETs that URL. Unpaid still HTTP 402. After `X-PAYMENT`, the same URL returns JSON.

Does not wrap openFDA, OFAC SDN, FRED, or WASDE. `/cma-ca98` is not listed on well-known in this deploy, so it is not an MCP tool yet — it will appear automatically when that URL is added to well-known. Not Bazaar-indexed.
