# Apollo MCP Server - Publish Checklist

**Status:** Ready for publish (Bruce QC approved)  
**Created:** 2026-02-07

## Step 1: npm Publish (Required First)

```bash
cd projects/apollo-mcp-server

# Login to npm (interactive)
npm login

# Verify login
npm whoami

# Publish (scoped public package)
npm publish --access public
```

**Note:** The @apollo-intel org may need to be created first:
- Go to https://www.npmjs.com/org/create
- Create org: apollo-intel
- Then publish

## Step 2: GitHub Repository

```bash
# Create repo on GitHub: https://github.com/new
# Name: mcp-proxy
# Org: apollo-intel (or personal account)

cd projects/apollo-mcp-server
git init
git add .
git commit -m "Initial release: Apollo Proxy MCP Server v1.0.0"
git remote add origin https://github.com/apollo-intel/mcp-proxy.git
git push -u origin main
```

## Step 3: Directory Submissions

### 3a. mcpmarket.com
1. Go to https://mcpmarket.com/submit
2. Use info from `submissions/mcpmarket-submission.md`
3. Submit form

### 3b. mcp.so (Awesome MCP Servers)
1. Go to https://github.com/punkpeye/awesome-mcp-servers/issues/new
2. Copy content from `submissions/mcp-so-issue.md`
3. Submit issue

### 3c. LobeHub MCP Marketplace
1. Fork https://github.com/lobehub/lobe-chat-plugins
2. Copy `submissions/lobehub-plugin.json` to `src/apollo-proxy.json`
3. Submit PR

### 3d. PulseMCP (Auto-indexed)
- Will auto-index from npm within 24-48 hours
- https://www.pulsemcp.com/servers

## Step 4: Verify

After npm publish, verify installation works:

```bash
# Test global install
npm install -g @apollo-intel/mcp-proxy
apollo-proxy-mcp --help

# Test npx
npx @apollo-intel/mcp-proxy
```

## Key Info for Forms

| Field | Value |
|-------|-------|
| Package Name | @apollo-intel/mcp-proxy |
| Homepage | https://apolloai.team |
| Author | Apollo Intelligence Network |
| Email | apollo_08@agentmail.to |
| License | MIT |
| Pricing | $0.005/req (x402, USDC on Base) |
| Tools | proxy_fetch, proxy_status, list_countries |

## Time Estimate

- npm publish: 2 minutes
- GitHub repo: 5 minutes  
- Directory submissions: 15 minutes total
- **Total: ~25 minutes**
