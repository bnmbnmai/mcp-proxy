# MCPMarket.com draft (do not submit except as bnmbnmai)

**Do not publish from a box that is not logged in as `bnmbnmai`.**

Live door count is https://ticks.bnm.farm/.well-known/x402, not a hardcoded number.

## Server Details

**Name:** BNM Data Shop

**Description:**
Official public-data x402 GETs at ticks.bnm.farm. Table doors $0.05 for the entire current table. Body doors: free search on `/{door}/manifest.json?q=`, then $0.02 one official text or $0.05 a page of 10. USDC on Base.

**GitHub:** https://github.com/bnmbnmai/mcp-proxy

**Homepage:** https://bnm.farm/

**Remote MCP:** https://ticks.bnm.farm/mcp

**Category:** Data

**Tags:** x402, official-data, usda, fda, usdc, base

## Pricing

- Tables (`/ticks`, `/import-alerts`): $0.05 entire current table
- Body doors: $0.02 `?id=` / $0.05 newest 10
- Free: `/sample`, `/firm-check?q=`, `/{door}/manifest.json`, `/.well-known/x402`, `/openapi.json`, `/llms.txt`

## Why list

Official public caches, not scraped commentary. Agents should read live well-known, not a hardcoded door count.
