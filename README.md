# Apollo Proxy MCP Server 🌐

**Give your AI agent access to the web through residential proxies.**

A Model Context Protocol (MCP) server that provides web fetching capabilities through Apollo's global residential proxy network. Pay per request via x402 micropayments (USDC on Base).

[![npm version](https://img.shields.io/npm/v/@apollo-intel/mcp-proxy)](https://www.npmjs.com/package/@apollo-intel/mcp-proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🌍 **190+ Countries** — Exit from any country in the world
- 🏠 **Residential IPs** — Real residential IPs, not datacenter proxies
- 🔄 **Rotating or Sticky** — New IP per request or maintain session
- 💰 **Pay Per Use** — $0.005/request via x402 (USDC on Base)
- ⚡ **Fast Integration** — Works with Claude Desktop, Cursor, and any MCP client
- 🤖 **Agent-Native** — Built for AI agents that need web access

## Quick Start

### Installation

```bash
npm install -g @apollo-intel/mcp-proxy
```

### Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "apollo-proxy": {
      "command": "npx",
      "args": ["@apollo-intel/mcp-proxy"]
    }
  }
}
```

### Cursor Configuration

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "apollo-proxy": {
      "command": "npx",
      "args": ["@apollo-intel/mcp-proxy"]
    }
  }
}
```

## Tools

### `proxy_fetch`

Fetch any URL through residential proxies.

**Parameters:**
- `target_url` (required) — URL to fetch
- `country` — ISO country code (default: "US")
- `method` — HTTP method: GET, POST, HEAD (default: "GET")
- `session_type` — "rotating" or "sticky" (default: "rotating")

**Example:**
```
fetch https://example.com through a German proxy
```

### `proxy_status`

Check service availability and pricing.

**Example:**
```
check if apollo proxy is available
```

### `list_countries`

List available proxy exit countries by region.

**Parameters:**
- `region` — all, americas, europe, asia, africa, oceania

**Example:**
```
list asian proxy countries
```

## Pricing

| Metric | Value |
|--------|-------|
| Cost per request | $0.005 USDC |
| Max response size | 250KB |
| Rate limit | 100 req/min |
| Network | Base (Ethereum L2) |

Payments are handled via [x402](https://x402.org) protocol. Your agent needs a USDC wallet on Base mainnet.

**Payment Address:** `0xf59621FC406D266e18f314Ae18eF0a33b8401004`

## Use Cases

### Web Scraping
```
Fetch the pricing page from competitor.com using a US proxy
```

### Geo-Restricted Content
```
Get the news homepage from bbc.co.uk through a UK proxy
```

### API Access
```
Fetch https://api.example.com/data via Japan proxy
```

### Market Research
```
Check product availability on amazon.de using a German proxy
```

## Supported Countries

### Americas
US, CA, MX, BR, AR, CL, CO, PE, VE, EC, PA, CR, GT, DO, PR

### Europe  
GB, DE, FR, NL, IT, ES, PT, PL, CZ, AT, CH, BE, SE, NO, DK, FI, IE, GR, RO, HU, BG, HR, SK, SI, UA, RU, TR

### Asia
JP, KR, SG, IN, ID, TH, VN, PH, MY, TW, HK, PK, BD, LK, NP, MM, KH, LA, MN, KZ, IL, AE, SA

### Africa
ZA, NG, EG

### Oceania
AU, NZ

## API Reference

This MCP server is a client to Apollo's x402 API at `https://apolloai.team`.

Direct API endpoints:
- `GET /api/proxy/request` — Proxy fetch ($0.005)
- `GET /api/proxy/status` — Service status ($0.001)
- `GET /.well-known/x402` — x402 discovery document

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APOLLO_API_URL` | Override API endpoint | `https://apolloai.team` |

## Requirements

- Node.js 18+
- MCP-compatible client (Claude Desktop, Cursor, etc.)
- For paid endpoints: x402-compatible wallet with USDC on Base

## About Apollo

Apollo is a multi-agent intelligence system that provides curated data and infrastructure services for AI agents. We believe in the agent economy — AI systems that can transact directly with each other.

- **Website:** [apolloai.team](https://apolloai.team)
- **Contact:** apollo_08@agentmail.to
- **x402 Discovery:** [/.well-known/x402](https://apolloai.team/.well-known/x402)

## License

MIT

---

Built with 🧠 by [Apollo Intelligence Network](https://apolloai.team)
