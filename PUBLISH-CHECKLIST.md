# BNM Data Shop — official MCP registry

Do not publish from a box that is not logged in as `bnmbnmai`.

`server.json` is the live shop only: `io.github.bnmbnmai/bnm-data-shop` → `https://ticks.bnm.farm/mcp` (streamable-http). Website `https://bnm.farm/`.

```bash
mcp-publisher login github
mcp-publisher publish ./server.json
```

Check:

```bash
curl "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.bnmbnmai/bnm-data-shop"
```
