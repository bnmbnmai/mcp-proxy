# MCP.so / awesome-mcp-servers draft (do not submit except as bnmbnmai)

**Do not publish from a box that is not logged in as `bnmbnmai`.**

x402-list.com ownership update is Bruce-only: [docs/X402LIST-OWNERSHIP-BRUCE.md](../docs/X402LIST-OWNERSHIP-BRUCE.md). Agents must not submit it. No Apollo Proxy revival.

Live door count is [https://ticks.bnm.farm/.well-known/x402](https://ticks.bnm.farm/.well-known/x402), not a hardcoded number.

## Issue Title

Add: BNM Data Shop — official public-data x402 GETs

## Issue Body

### Server Name

BNM Data Shop

### Description

Official public data as JSON at https://ticks.bnm.farm. Tables (`/ticks`, `/import-alerts`) $0.05 = entire current table. Body doors: free `/{door}/manifest.json?q=`, then $0.02 one official text (`?id=`) or $0.05 newest 10. USDC on Base. Live paid URLs: `/.well-known/x402`.

### Connect

```
npx -y mcp-remote https://ticks.bnm.farm/mcp
```

### Category

Data

### Pricing

$0.02 / $0.05 USDC on Base (`eip155:8453`). Not a subscription.

### Links

- Shop: https://bnm.farm/
- Paid host: https://ticks.bnm.farm
- GitHub: https://github.com/bnmbnmai/mcp-proxy
- MCP registry: `io.github.bnmbnmai/bnm-data-shop`
