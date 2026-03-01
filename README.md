# Apollo Intelligence MCP Server 🏛️

**40 tools for AI agents: intelligence feeds, economic data, DeFi, real-time search, crypto, OSINT, weather, ML/NLP, proxy infrastructure — all via x402 micropayments.**

Give your AI agent access to curated market intelligence, web scraping through 190+ country residential proxies, real-time X/Twitter search, crypto prices, GitHub trending data, and more.

**🆓 Free trial: 5 requests/day per IP — no payment needed.** Just install and start using it.

**🔑 API Key (easiest):** Get a free key with $0.10 balance — no crypto needed:
```bash
curl -X POST https://apolloai.team/api/keys/signup -H "Content-Type: application/json" -d '{"name":"my-agent"}'
```
Then set `APOLLO_API_KEY=ak_YOUR_KEY` in your MCP config (see below).

**💎 x402 (crypto):** Pay per request with USDC on Base — fully automatic via x402 protocol.

[![npm version](https://img.shields.io/npm/v/@apollo_ai/mcp-proxy)](https://www.npmjs.com/package/@apollo_ai/mcp-proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![x402scan](https://img.shields.io/badge/x402scan-listed-blue)](https://www.x402scan.com/server/3e61cb80-3b13-48cc-be79-db9dd85f57a4)
[![MCP](https://img.shields.io/badge/MCP-compatible-green)](https://modelcontextprotocol.io)

## Quick Start

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "apollo": {
      "command": "npx",
      "args": ["@apollo_ai/mcp-proxy"],
      "env": {
        "APOLLO_API_KEY": "ak_YOUR_KEY_HERE"
      }
    }
  }
}
```

### Cursor / Windsurf / Any MCP Client

```json
{
  "mcpServers": {
    "apollo": {
      "command": "npx",
      "args": ["@apollo_ai/mcp-proxy"],
      "env": {
        "APOLLO_API_KEY": "ak_YOUR_KEY_HERE"
      }
    }
  }
}
```

> **Note:** The `APOLLO_API_KEY` env var is optional. Without it, you get 5 free requests/day. Get a key for more: `curl -X POST https://apolloai.team/api/keys/signup -H "Content-Type: application/json" -d '{"name":"my-agent"}'`

### Install Globally

```bash
npm install -g @apollo_ai/mcp-proxy
```

## All 40 Tools

### 🔍 Search & Scraping

| Tool | Description | Cost |
|------|-------------|------|
| `web_scrape` | Scrape any URL — proxy rotation, content extraction, markdown output | $0.02 |
| `web_search` | Web search with site filters (Reddit, HN, GitHub, Twitter) | $0.01 |
| `x_search` | Real-time X/Twitter search — posts, engagement, AI analysis (via Grok) | $0.75 |
| `proxy_fetch` | Raw residential proxy relay — 190+ countries, rotating or sticky | $0.01 |
| `proxy_status` | Check service availability and pricing | Free |
| `list_countries` | List 190+ available proxy exit countries | Free |

### 📊 Intelligence Feeds

| Tool | Description | Cost |
|------|-------------|------|
| `agent_intel` | Agent economy opportunities — grants, bounties, hackathons, market gaps | $0.05 |
| `sentiment` | Real-time social sentiment (crypto, DeFi, AI, tech) via Grok | $0.02 |
| `pain_points` | NLP-clustered pain points from Quora, G2, Reddit, Upwork → SaaS ideas | $0.08 |
| `agentic_trends` | Agentic economy signals — funding, adoption, multi-agent trends | $0.05 |
| `keyword_opportunities` | Keyword flywheel — seed → variants → opportunity mapping | $0.05 |
| `micro_saas` | Validated micro-SaaS ideas with market sizing and competition analysis | $0.10 |
| `web3_hackathons` | Live hackathon tracker — ETHGlobal, DoraHacks, Devpost, Devfolio | $0.05 |
| `github_trending` | GitHub repos ranked by star velocity, AI-categorized | $0.05 |
| `producthunt` | Daily Product Hunt launches with AI categorization | $0.05 |
| `weekly_digest` | Consolidated weekly intelligence report with cross-feed synthesis | $0.25 |
| `stackexchange` | StackOverflow Q&A search — answers, scores, tags | $0.02 |

### 💰 Crypto & DeFi

| Tool | Description | Cost |
|------|-------------|------|
| `crypto_prices` | Live cryptocurrency prices from CoinGecko — any token | $0.01 |
| `crypto_trending` | Trending cryptocurrencies with price changes and market cap | $0.02 |
| `defi_yields` | Top DeFi yields across 18K+ pools — filter by chain, TVL, stablecoin | $0.03 |
| `defi_protocols` | DeFi protocol TVL rankings — 7000+ protocols, category filtering | $0.02 |

### 📈 Economic Data

| Tool | Description | Cost |
|------|-------------|------|
| `economic_indicators` | Federal Reserve (FRED) data — GDP, CPI, unemployment, rates, 800K+ series | $0.03 |
| `country_metrics` | World Bank development indicators — 260+ countries, GDP, population, literacy | $0.02 |
| `fx_rates` | Live FX rates for 30+ currencies from ECB data | $0.005 |

### 🔒 OSINT & Security

| Tool | Description | Cost |
|------|-------------|------|
| `ip_intel` | Multi-source IP intelligence — geo, ports, vulns, threats (4 sources) | $0.03 |
| `domain_intel` | Domain intelligence — DNS, SSL certs, geo, threat analysis | $0.03 |
| `ip_geo` | IP geolocation + ASN — country, city, coordinates, organization | $0.01 |
| `malware_feed` | URLhaus threat feed — 20K+ active malware URLs from abuse.ch | $0.02 |
| `ip_reputation` | IP abuse scoring via AbuseIPDB — confidence score, reports, categories | $0.03 |
| `malware_url_check` | VirusTotal URL scanning — malware detection across 70+ engines | $0.05 |
| `breach_check` | Email breach check via HaveIBeenPwned (Troy Hunt) | $0.05 |
| `geocode` | Forward + reverse geocoding via OpenStreetMap/Nominatim | $0.01 |

### ⛓️ Ethereum / Etherscan

| Tool | Description | Cost |
|------|-------------|------|
| `eth_balance` | Ethereum wallet balance via Etherscan | $0.03 |
| `eth_transactions` | Ethereum transaction history via Etherscan | $0.03 |
| `eth_gas` | Live Ethereum gas prices via Etherscan | $0.02 |

### 🌤️ Weather & ML

| Tool | Description | Cost |
|------|-------------|------|
| `weather` | Current weather + 7-day forecast from Open-Meteo | $0.01 |
| `ml_analyze` | Text sentiment, entity extraction, or summarization via HuggingFace | $0.01–$0.02 |

### 📦 Bundles (Save 33-50%)

| Tool | Includes | Cost |
|------|----------|------|
| `opportunity_bundle` | Keywords + pain points + micro-SaaS ideas | $0.15 |
| `agentic_insights_bundle` | Trends + pain points + agent intel | $0.12 |
| `builder_intel_bundle` | GitHub trending + Product Hunt + agent intel | $0.10 |

## Usage Examples

### Find market opportunities
```
Search for pain points in "billing automation" and suggest micro-SaaS ideas
```

### Research competitors
```
Scrape https://competitor.com/pricing through a US proxy and extract the content
```

### Track trending repos
```
Show me GitHub trending repos in the AI agents category
```

### Real-time social intelligence
```
Search X/Twitter for discussions about "MCP protocol" in the last week
```

### Web search with site filters
```
Search for "x402 micropayments" on Reddit and Hacker News
```

### Get weekly intelligence
```
Give me the weekly intelligence digest — what opportunities should I focus on?
```

### Check crypto markets
```
What are the trending cryptocurrencies right now? Show prices and market caps.
```

## How Payment Works

All paid tools use the [x402 protocol](https://x402.org) — an open standard for machine-to-machine micropayments.

1. Your agent makes a request
2. Server returns `402 Payment Required` with payment details
3. Agent's wallet sends USDC on Base to complete the payment
4. Server delivers the response

**No API keys. No subscriptions. No accounts.** Just a USDC wallet on Base mainnet.

**Payment wallet:** `0xf59621FC406D266e18f314Ae18eF0a33b8401004`

> **📖 [Getting Started Guide](https://apolloai.team/docs/getting-started)** — Step-by-step instructions for Python, TypeScript, Go, and MCP. Make your first paid request in under 5 minutes.

> **Note:** x402 payment handling depends on your MCP client. Clients like [x402scan Composer](https://www.x402scan.com/composer) handle payments automatically. For Claude Desktop, you'll need an x402-compatible wallet integration.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APOLLO_API_URL` | Override API endpoint | `https://apolloai.team` |

## Data Freshness

All intelligence feeds are pre-computed by Apollo's multi-agent system and refreshed every 2-6 hours:

- **Scrape daemon** runs autonomously — DDG, HN, Reddit, GitHub via residential proxies
- **NLP pipeline** — keyword expansion, pain point clustering, opportunity scoring
- **Zero LLM cost per request** — all data pre-computed from real sources
- **X/Twitter search** — real-time via Grok (not cached)

## OpenAPI Specification

Full OpenAPI 3.1 spec for all 40 endpoints: [`openapi.json`](./openapi.json)

Import into Postman, Insomnia, or any API client to explore and test all endpoints interactively.

## Ecosystem

Apollo is listed across the x402 ecosystem:

- **x402 Official Ecosystem:** [x402.org/ecosystem](https://x402.org/ecosystem)
- **x402scan Marketplace:** [x402scan listing](https://www.x402scan.com/server/3e61cb80-3b13-48cc-be79-db9dd85f57a4)
- **npm:** [@apollo_ai/mcp-proxy](https://www.npmjs.com/package/@apollo_ai/mcp-proxy)
- **GitHub:** [bnmbnmai/mcp-proxy](https://github.com/bnmbnmai/mcp-proxy)

## API Reference

This MCP server wraps Apollo's x402 API at `https://apolloai.team`. You can also call the API directly:

```bash
# Discovery document (lists all endpoints)
curl https://apolloai.team/.well-known/x402

# Any endpoint returns 402 with payment info + preview data
curl https://apolloai.team/api/pain-points

# OpenAPI spec
curl https://apolloai.team/openapi.json

# Free landing page
curl https://apolloai.team/
```

**Direct API endpoints:** [apolloai.team](https://apolloai.team) | **Getting Started:** [Guide](https://apolloai.team/docs/getting-started) | **Marketplace:** [x402scan](https://www.x402scan.com/server/3e61cb80-3b13-48cc-be79-db9dd85f57a4)

## Requirements

- Node.js 18+
- MCP-compatible client (Claude Desktop, Cursor, Windsurf, etc.)
- For paid tools: x402-compatible wallet with USDC on Base

## About Apollo

Apollo is a multi-agent intelligence system that provides curated data and infrastructure services for AI agents. We believe in the agent economy — AI systems that transact directly with each other.

- **Website:** [apolloai.team](https://apolloai.team)
- **x402scan:** [Marketplace listing](https://www.x402scan.com/server/3e61cb80-3b13-48cc-be79-db9dd85f57a4)
- **Contact:** apollo_08@agentmail.to

## License

MIT

---

Built by [Apollo Intelligence Network](https://apolloai.team) 🏛️
