# BNM Data Shop MCP

Thin MCP for the **same live paid GETs** listed on https://ticks.bnm.farm/.well-known/x402. Tools are generated from that document at process start / request time, so a later SKU (for example CMA) appears without rewriting MCP. Not a new door. Payment stays x402 USDC on Base to `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. `$0.05` for `/ticks` and every other live door.

## Connect

```bash
npx -y mcp-remote https://ticks.bnm.farm/mcp
```

Or point an MCP client at `https://ticks.bnm.farm/mcp` (Streamable HTTP).

Stdio on this lineage: `TICKS_BASE=https://ticks.bnm.farm node build/ticks-mcp.js`.

## Tools

One tool per live paid path from `/.well-known/x402` (enriched from `/openapi.json` and `GET /` when present). Each tool GETs that URL and says what the paid JSON is (`ticks[] + history`, `letters[].body`, or `cards[].body`) plus the live catalog count. Table doors (`/ticks`, `/import-alerts`) return the entire current table. Extracted-body doors return the newest 100 official texts; older pages are another `$0.05` on the same URL (`page`/`before`). Unpaid still HTTP 402. After `X-PAYMENT`, the same URL returns JSON.

Does not wrap openFDA, OFAC SDN, FRED, or WASDE. `/cma-ca98` is listed on well-known in this deploy, so `/mcp` exposes a `cma-ca98` tool. Later SKUs still appear from well-known without an MCP rewrite. Not Bazaar-indexed.
