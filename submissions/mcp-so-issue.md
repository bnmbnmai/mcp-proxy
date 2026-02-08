# MCP.so Submission (GitHub Issue)

**Submit at:** https://github.com/punkpeye/awesome-mcp-servers/issues/new

## Issue Title
Add: Apollo Proxy MCP Server - Residential proxy access for AI agents

## Issue Body

### Server Name
Apollo Proxy MCP Server

### Description
MCP server providing residential proxy access for AI agents. Fetch any URL through 190+ country exit nodes with rotating or sticky sessions. Pay-per-use via x402 micropayments (USDC on Base).

### npm Package
`@apollo-intel/mcp-proxy`

### Installation
```bash
npm install -g @apollo-intel/mcp-proxy
```

### Claude Desktop Config
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

### Tools
- `proxy_fetch` - Fetch URL through residential proxy
- `proxy_status` - Check service status
- `list_countries` - List 190+ available countries

### Category
Web / Networking

### Pricing
$0.005/request (x402, USDC on Base)

### Links
- Homepage: https://apolloai.team
- GitHub: https://github.com/apollo-intel/mcp-proxy
