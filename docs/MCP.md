# BNM Data Shop MCP

Thin MCP for the **same live paid GETs** listed on https://ticks.bnm.farm/.well-known/x402. Tools are generated from that document at process start / request time, so a later SKU (for example CMA) appears without rewriting MCP. Not a new door. Payment stays x402 USDC on Base to `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. `$0.05` for `/ticks` and every other live door.

## Connect

```bash
npx -y mcp-remote https://ticks.bnm.farm/mcp
```

Or point an MCP client at `https://ticks.bnm.farm/mcp` (Streamable HTTP).

Stdio on this lineage: `TICKS_BASE=https://ticks.bnm.farm node build/ticks-mcp.js`.

## Tools

One tool per live paid path from `/.well-known/x402` (enriched from `/openapi.json` and `GET /` when present). Paid tools are generated from that document — do not hardcode a door count. Free extras: `search` (one extracted-body door) and `firm-check` (cross-door Form 483 / warning letters / import-alert catalog). Paid `get-one` is `?id=` at $0.02; paid `get-page` is the page at $0.05. Unpaid paid URLs still HTTP 402.

`firm-check` is free HTTP 200 JSON at `/firm-check?q=` and the MCP tool of the same name. It does not return letter bodies or the full import-alert table.

Does not wrap openFDA, OFAC SDN, FRED, or WASDE. Later SKUs still appear from well-known without an MCP rewrite. Not Bazaar-indexed.
