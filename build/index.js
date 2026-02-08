#!/usr/bin/env node
/**
 * Apollo Proxy MCP Server v1.0.0
 *
 * MCP server that provides access to Apollo's residential proxy network
 * through x402 micropayments (USDC on Base).
 *
 * Tools:
 * - proxy_fetch: Fetch any URL through 190+ country residential proxies
 * - proxy_status: Check service availability and pricing
 * - list_countries: List available proxy exit countries
 *
 * Payment: $0.005/request via x402 protocol (USDC on Base mainnet)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Apollo API configuration
const APOLLO_API_BASE = process.env.APOLLO_API_URL || "https://apolloai.team";
const USER_AGENT = "apollo-mcp-proxy/1.0.0";
// Available countries for proxy exit (ISO 3166-1 alpha-2)
const PROXY_COUNTRIES = [
    "US", "GB", "DE", "FR", "NL", "CA", "AU", "JP", "KR", "SG",
    "BR", "MX", "AR", "IN", "ID", "TH", "VN", "PH", "MY", "TW",
    "HK", "IT", "ES", "PT", "PL", "CZ", "AT", "CH", "BE", "SE",
    "NO", "DK", "FI", "IE", "IL", "AE", "SA", "ZA", "NG", "EG",
    "RU", "UA", "TR", "GR", "RO", "HU", "BG", "HR", "SK", "SI",
    "CL", "CO", "PE", "VE", "EC", "PA", "CR", "GT", "DO", "PR",
    "NZ", "PK", "BD", "LK", "NP", "MM", "KH", "LA", "MN", "KZ"
];
// Create MCP server instance
const server = new McpServer({
    name: "apollo-proxy",
    version: "1.0.0",
});
/**
 * Make a request to Apollo's x402 API
 * Note: x402 payment headers are handled by the calling agent's wallet
 */
async function makeApolloRequest(endpoint, params) {
    const url = new URL(endpoint, APOLLO_API_BASE);
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
    }
    const headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    };
    try {
        const response = await fetch(url.toString(), { headers });
        if (response.status === 402) {
            // Payment required - return x402 payment info
            const paymentHeader = response.headers.get("x-payment");
            const wwwAuth = response.headers.get("www-authenticate");
            return {
                data: null,
                error: `Payment required (x402). This endpoint costs $0.005 USDC on Base. ` +
                    `Configure your agent with an x402-compatible wallet to use this service. ` +
                    `Payment info: ${paymentHeader || wwwAuth || 'See apolloai.team'}`,
                statusCode: 402,
            };
        }
        if (!response.ok) {
            const errorText = await response.text();
            return {
                data: null,
                error: `API error (${response.status}): ${errorText.slice(0, 500)}`,
                statusCode: response.status,
            };
        }
        const data = await response.json();
        return { data, error: null, statusCode: response.status };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            data: null,
            error: `Request failed: ${message}`,
            statusCode: 0,
        };
    }
}
// ============================================
// Tool: proxy_fetch
// ============================================
server.registerTool("proxy_fetch", {
    description: "Fetch any URL through Apollo's residential proxy network. " +
        "Supports 190+ countries, rotating or sticky sessions, and handles " +
        "anti-bot protection. Cost: $0.005/request (USDC on Base). " +
        "Max response: 250KB. Rate limit: 100 req/min.",
    inputSchema: {
        target_url: z
            .string()
            .url()
            .describe("The URL to fetch through the proxy (must be http:// or https://)"),
        country: z
            .string()
            .length(2)
            .default("US")
            .describe("ISO country code for proxy exit (e.g., US, GB, DE, JP)"),
        method: z
            .enum(["GET", "POST", "HEAD"])
            .default("GET")
            .describe("HTTP method to use"),
        session_type: z
            .enum(["rotating", "sticky"])
            .default("rotating")
            .describe("rotating = new IP per request, sticky = same IP for session"),
    },
}, async ({ target_url, country = "US", method = "GET", session_type = "rotating" }) => {
    console.error(`[apollo-mcp] proxy_fetch: ${method} ${target_url} via ${country}`);
    const result = await makeApolloRequest("/api/proxy/request", {
        target_url,
        country: country.toUpperCase(),
        method,
        session_type,
    });
    if (result.error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Proxy fetch failed: ${result.error}`,
                },
            ],
            isError: true,
        };
    }
    const data = result.data;
    const responseBody = typeof data.response.body === "object"
        ? JSON.stringify(data.response.body, null, 2)
        : String(data.response.body);
    // Summarize the response
    const summary = [
        `## Proxy Fetch Result`,
        ``,
        `**Target:** ${data.target_url}`,
        `**Proxy Country:** ${data.proxy_country}`,
        `**Status:** ${data.response.status_code}`,
        `**Content-Type:** ${data.response.content_type}`,
        `**Bytes:** ${data.response.bytes_returned}${data.response.truncated ? " (truncated)" : ""}`,
        `**Cost:** $${data.price_paid_usd}`,
        ``,
        `### Response Body`,
        ``,
        "```",
        responseBody.slice(0, 10000), // Limit display size
        "```",
    ].join("\n");
    return {
        content: [
            {
                type: "text",
                text: summary,
            },
        ],
    };
});
// ============================================
// Tool: proxy_status
// ============================================
server.registerTool("proxy_status", {
    description: "Check Apollo proxy service availability, pricing, and limits. " +
        "Use this to verify the service is online before making requests.",
    inputSchema: {},
}, async () => {
    console.error("[apollo-mcp] proxy_status: checking service availability");
    const result = await makeApolloRequest("/api/proxy/status");
    if (result.error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Status check failed: ${result.error}`,
                },
            ],
            isError: true,
        };
    }
    const data = result.data;
    const status = [
        `## Apollo Proxy Service Status`,
        ``,
        `**Service:** ${data.service}`,
        `**Status:** ${data.status}`,
        ``,
        `### Pricing`,
        `- Per request: $${data.pricing.per_request_usd} USDC (Base mainnet)`,
        `- Max response size: ${(data.pricing.max_response_bytes / 1024).toFixed(0)}KB`,
        `- Rate limit: ${data.pricing.rate_limit}`,
        ``,
        `### Capabilities`,
        `- Proxy types: ${data.supported_types.join(", ")}`,
        `- Countries: ${data.supported_countries}`,
        `- Session types: ${data.session_types.join(", ")}`,
        `- HTTP methods: ${data.supported_methods.join(", ")}`,
        ``,
        `### Payment`,
        `Payments handled via x402 protocol. Configure your agent with a USDC wallet on Base mainnet.`,
        `Wallet: 0xf59621FC406D266e18f314Ae18eF0a33b8401004`,
    ].join("\n");
    return {
        content: [
            {
                type: "text",
                text: status,
            },
        ],
    };
});
// ============================================
// Tool: list_countries
// ============================================
server.registerTool("list_countries", {
    description: "List available proxy exit countries. Apollo supports 190+ countries " +
        "for residential proxy exits. Returns ISO 3166-1 alpha-2 country codes.",
    inputSchema: {
        region: z
            .enum(["all", "americas", "europe", "asia", "africa", "oceania"])
            .default("all")
            .describe("Filter by region (optional)"),
    },
}, async ({ region = "all" }) => {
    console.error(`[apollo-mcp] list_countries: region=${region}`);
    // Group countries by region
    const regions = {
        americas: ["US", "CA", "MX", "BR", "AR", "CL", "CO", "PE", "VE", "EC", "PA", "CR", "GT", "DO", "PR"],
        europe: ["GB", "DE", "FR", "NL", "IT", "ES", "PT", "PL", "CZ", "AT", "CH", "BE", "SE", "NO", "DK", "FI", "IE", "GR", "RO", "HU", "BG", "HR", "SK", "SI", "UA", "RU", "TR"],
        asia: ["JP", "KR", "SG", "IN", "ID", "TH", "VN", "PH", "MY", "TW", "HK", "PK", "BD", "LK", "NP", "MM", "KH", "LA", "MN", "KZ", "IL", "AE", "SA"],
        africa: ["ZA", "NG", "EG"],
        oceania: ["AU", "NZ"],
    };
    let countries;
    if (region === "all") {
        countries = PROXY_COUNTRIES;
    }
    else {
        countries = regions[region] || [];
    }
    const output = [
        `## Available Proxy Countries`,
        ``,
        `**Region:** ${region}`,
        `**Total:** ${countries.length} countries`,
        ``,
        `### Country Codes`,
        ``,
        countries.join(", "),
        ``,
        `---`,
        `Use any 2-letter ISO country code with proxy_fetch.`,
        `Example: \`proxy_fetch(target_url="https://example.com", country="DE")\``,
    ].join("\n");
    return {
        content: [
            {
                type: "text",
                text: output,
            },
        ],
    };
});
// ============================================
// Main entry point
// ============================================
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Apollo Proxy MCP Server running on stdio");
    console.error("  Tools: proxy_fetch, proxy_status, list_countries");
    console.error("  Endpoint: https://apolloai.team/api/proxy/*");
    console.error("  Payment: $0.005/request (USDC on Base)");
}
main().catch((error) => {
    console.error("Fatal error in Apollo MCP Server:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map