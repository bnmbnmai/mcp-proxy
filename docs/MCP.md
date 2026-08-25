# BNM Data Shop MCP

Thin MCP for the **same live paid GETs** listed on https://ticks.bnm.farm/.well-known/x402. Tools are generated from that document at process start / request time, so a later SKU (for example CMA) appears without rewriting MCP. Not a new door. Payment stays x402 USDC on Base to `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. `$0.05` for `/ticks` and every other live door.

## Connect

```bash
npx -y mcp-remote https://ticks.bnm.farm/mcp
```

Or point an MCP client at `https://ticks.bnm.farm/mcp` (Streamable HTTP).

Stdio on this lineage: `TICKS_BASE=https://ticks.bnm.farm node build/ticks-mcp.js`.

## Tools

A free `search` tool plus one paid page GET per live paid path from `/.well-known/x402` (enriched from `/openapi.json` and `GET /` when present). `search` GETs `{manifest}?q=` on an extracted-body door; each hit names the `page`/`before` to pay. Paid tools GET that URL and say what the paid JSON is (`ticks[] + history`, `letters[].body`, or `cards[].body`) plus the live catalog count. Table doors (`/ticks`, `/import-alerts`) return the entire current table — no page. Extracted-body paid GET is the newest 100 official texts, not the entire archive; older pages are another `$0.05` on the same URL (`page`/`before`). Unpaid still HTTP 402. After `X-PAYMENT`, the same URL returns JSON.

Does not wrap openFDA, OFAC SDN, FRED, or WASDE. `/cma-ca98` is listed on well-known in this deploy, so `/mcp` exposes a `cma-ca98` tool. Later SKUs still appear from well-known without an MCP rewrite. Not Bazaar-indexed.
