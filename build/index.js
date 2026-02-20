#!/usr/bin/env node
/**
 * Apollo MCP Server v4.7.0
 *
 * MCP server providing 34 tools: intelligence feeds, DeFi data, economic indicators,
 * real-time search, crypto data, OSINT, weather, ML/NLP, proxy infrastructure,
 * and bundles — all via x402 micropayments (USDC on Base).
 *
 * Tools:
 * - web_scrape: Scrape any URL with proxy rotation + content extraction ($0.02)
 * - web_search: Search the web ($0.01)
 * - x_search: Real-time X/Twitter search via Grok ($0.75)
 * - agent_intel: Agent economy opportunities ($0.05)
 * - sentiment: Social sentiment analysis ($0.02)
 * - pain_points: NLP pain point clustering ($0.08)
 * - agentic_trends: Agentic economy signals ($0.05)
 * - keyword_opportunities: Keyword flywheel ($0.05)
 * - micro_saas: Validated micro-SaaS ideas ($0.10)
 * - web3_hackathons: Live hackathon tracker ($0.05)
 * - github_trending: GitHub repos by star velocity ($0.05)
 * - producthunt: Daily Product Hunt launches ($0.05)
 * - weekly_digest: Consolidated weekly report ($0.25)
 * - crypto_prices: Live crypto prices from CoinGecko ($0.01)
 * - crypto_trending: Trending cryptocurrencies ($0.02)
 * - ip_intel: Multi-source IP intelligence ($0.03)
 * - domain_intel: Multi-source domain intelligence ($0.03)
 * - fx_rates: Live FX rates from ECB ($0.005)
 * - defi_yields: Top DeFi yields across 18K+ pools ($0.03)
 * - defi_protocols: DeFi protocol TVL rankings ($0.02)
 * - opportunity_bundle: Keywords + pain + SaaS ($0.15)
 * - agentic_insights_bundle: Trends + pain + intel ($0.12)
 * - builder_intel_bundle: GitHub + PH + agent intel ($0.10)
 * - proxy_fetch: Raw proxy relay ($0.01)
 * - proxy_status: Check service availability
 * - list_countries: Available proxy exit countries
 *
 * Payment: Via x402 protocol (USDC on Base mainnet)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Apollo API configuration
const APOLLO_API_BASE = process.env.APOLLO_API_URL || "https://apolloai.team";
const USER_AGENT = "apollo-mcp-server/4.6.0";
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
    name: "apollo-intelligence",
    version: "4.7.0",
});
/**
 * Make a request to Apollo's x402 API.
 * x402 payment headers are handled by the calling agent's wallet.
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
            // Parse preview data from 402 body — Apollo returns sample items for free
            let preview = null;
            let priceUsd = null;
            try {
                const body = await response.json();
                if (body && typeof body === "object") {
                    preview = body;
                    priceUsd = typeof body.price_usd === "number" ? body.price_usd : null;
                }
            }
            catch {
                // Body not JSON
            }
            return {
                data: null,
                error: "x402_payment_required",
                statusCode: 402,
                preview,
                priceUsd,
            };
        }
        if (!response.ok) {
            const errorText = await response.text();
            return {
                data: null,
                error: `API error (${response.status}): ${errorText.slice(0, 500)}`,
                statusCode: response.status,
                preview: null,
                priceUsd: null,
            };
        }
        const data = (await response.json());
        return { data, error: null, statusCode: response.status, preview: null, priceUsd: null };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            data: null,
            error: `Request failed: ${message}`,
            statusCode: 0,
            preview: null,
            priceUsd: null,
        };
    }
}
/**
 * Format a 402 preview response as useful tool output.
 * Returns preview data as SUCCESS (not error) so MCP clients display it properly.
 */
function formatPreviewResponse(result, toolName) {
    const preview = result.preview;
    const price = result.priceUsd ?? "unknown";
    // Extract sample data from the preview body
    const sampleKeys = [
        "sample_opportunities", "sample_items", "sample_results",
        "sample_data", "sample_entries", "sample_launches", "sample_pools",
        "sample_protocols", "sample_coins", "sample_prices",
        "preview_data", "items",
    ];
    let sampleData = null;
    let totalCount = null;
    if (preview) {
        for (const key of sampleKeys) {
            if (preview[key]) {
                sampleData = preview[key];
                break;
            }
        }
        // Look for total count indicators
        for (const key of Object.keys(preview)) {
            if (key.startsWith("total_") || key === "count") {
                totalCount = preview[key];
                break;
            }
        }
    }
    const parts = [
        `## ${toolName} — Preview (Free Sample)`,
        "",
    ];
    if (totalCount !== null && totalCount !== undefined) {
        parts.push(`**Full dataset:** ${totalCount} items available`);
    }
    if (sampleData) {
        parts.push(`**Sample data:**`);
        parts.push("```json");
        parts.push(JSON.stringify(sampleData, null, 2).slice(0, 3000));
        parts.push("```");
    }
    else if (preview) {
        parts.push("```json");
        parts.push(JSON.stringify(preview, null, 2).slice(0, 3000));
        parts.push("```");
    }
    parts.push("");
    parts.push(`---`);
    parts.push(`💡 **Full dataset: $${price} USDC** on Base mainnet via x402 protocol.`);
    parts.push(`To unlock all data, configure your agent with an x402-compatible wallet.`);
    parts.push(`Setup guide: https://apolloai.team | npm: \`npx @apollo_ai/mcp-proxy\``);
    // Return as SUCCESS (not error) — the preview IS useful data
    return { content: [{ type: "text", text: parts.join("\n") }] };
}
/**
 * Handle a tool result: return data on success, preview on 402, error otherwise.
 */
function handleToolError(result, toolName) {
    if (!result.error)
        return null; // Success — let the tool format its own data
    // For 402s with preview data, return as success with preview content
    if (result.statusCode === 402 && result.preview) {
        return formatPreviewResponse(result, toolName);
    }
    // For real errors, return as error
    return {
        content: [{ type: "text", text: `${toolName} failed: ${result.error}` }],
        isError: true,
    };
}
// ============================================
// Tool: web_scrape
// ============================================
server.registerTool("web_scrape", {
    description: "Scrape any URL and get back clean, LLM-ready text. Uses residential proxies " +
        "with 190+ country coverage, intelligent content extraction (HTML→clean text/markdown), " +
        "metadata parsing (title, description, OG tags), and link extraction. " +
        "Cost: $0.02/request (USDC on Base). 250KB content cap. 60 req/min.",
    inputSchema: {
        url: z.string().url().describe("The URL to scrape (must be http:// or https://)"),
        extract: z.boolean().default(true).describe("Extract clean text from HTML (default: true). Set false for raw HTML."),
        include_links: z.boolean().default(false).describe("Include extracted links from the page"),
        country: z.string().length(2).default("US").describe("ISO country code for proxy exit (e.g., US, GB, DE, JP)"),
        format: z.enum(["raw", "text", "markdown"]).default("markdown").describe("Output format: raw HTML, clean text, or markdown"),
    },
}, async ({ url, extract = true, include_links = false, country = "US", format = "markdown" }) => {
    console.error(`[apollo-mcp] web_scrape: ${url} (extract=${extract}, country=${country})`);
    const result = await makeApolloRequest("/api/scrape", {
        url,
        extract: String(extract),
        include_links: String(include_links),
        country: country.toUpperCase(),
        format,
    });
    {
        const err = handleToolError(result, "Scrape");
        if (err)
            return err;
    }
    const data = result.data;
    const parts = [`## Scraped: ${data.title || data.url}`, ``];
    if (data.description)
        parts.push(`> ${data.description}`, ``);
    parts.push(`**URL:** ${data.url}`, `**Status:** ${data.status_code}`, `**Method:** ${data.method_used} (${data.proxy_country})`, `**Size:** ${data.content_length} bytes | **Time:** ${data.elapsed_ms}ms`, `**Cost:** $0.02`, ``, `### Content`, ``, data.content.slice(0, 15000));
    if (data.links && data.links.length > 0) {
        parts.push(``, `### Links (${data.links.length})`, ``, ...data.links.slice(0, 20).map((l) => `- [${l.text || l.url}](${l.url})`));
    }
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: web_search
// ============================================
server.registerTool("web_search", {
    description: "Search the web and get structured results with titles, URLs, and descriptions. " +
        "Supports site filtering (reddit, hn, github, twitter, producthunt). " +
        "Cost: $0.01/query (USDC on Base). Max 20 results per query.",
    inputSchema: {
        query: z.string().min(2).describe("Search query (at least 2 characters)"),
        count: z.number().min(1).max(20).default(10).describe("Number of results to return (max 20)"),
        site: z.string().default("").describe("Optional site filter: reddit, hn, github, twitter, producthunt"),
    },
}, async ({ query, count = 10, site = "" }) => {
    console.error(`[apollo-mcp] web_search: "${query}" (count=${count}, site=${site || "all"})`);
    const params = { q: query, count: String(count) };
    if (site)
        params.site = site;
    const result = await makeApolloRequest("/api/scrape/search", params);
    {
        const err = handleToolError(result, "Search");
        if (err)
            return err;
    }
    const data = result.data;
    const parts = [
        `## Search Results: "${data.query}"`, ``,
        `**Results:** ${data.total_results}${data.site_filter !== "all" ? ` | **Site:** ${data.site_filter}` : ""}`,
        `**Cost:** $0.01`, ``,
    ];
    for (const [i, r] of data.results.entries()) {
        parts.push(`### ${i + 1}. ${r.title}`, `${r.url}${r.age ? ` (${r.age})` : ""}`);
        if (r.description)
            parts.push(`${r.description}`);
        parts.push(``);
    }
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: x_search (X/Twitter Intelligence)
// ============================================
server.registerTool("x_search", {
    description: "Search X/Twitter in real-time — get posts, engagement metrics, and AI analysis. " +
        "Powered by Grok's x_search. Filter by handles and date range. " +
        "Cost: $0.75/query (USDC on Base). Premium: real data not available via web scraping.",
    inputSchema: {
        query: z.string().min(2).describe("Search query (keywords, hashtags, handles)"),
        count: z.number().min(1).max(25).default(10).describe("Max posts to return (1-25, default 10)"),
        handles: z.string().default("").describe("Comma-separated handles to filter (max 10, optional)"),
        exclude_handles: z.string().default("").describe("Comma-separated handles to exclude (max 10, optional)"),
        from_date: z.string().default("").describe("Start date filter (YYYY-MM-DD, optional)"),
        to_date: z.string().default("").describe("End date filter (YYYY-MM-DD, optional)"),
    },
}, async ({ query, count = 10, handles = "", exclude_handles = "", from_date = "", to_date = "" }) => {
    console.error(`[apollo-mcp] x_search: "${query}" (count=${count})`);
    const params = { q: query, count: String(count) };
    if (handles)
        params.handles = handles;
    if (exclude_handles)
        params.exclude_handles = exclude_handles;
    if (from_date)
        params.from_date = from_date;
    if (to_date)
        params.to_date = to_date;
    const result = await makeApolloRequest("/api/x-search", params);
    {
        const err = handleToolError(result, "X search");
        if (err)
            return err;
    }
    const data = result.data;
    const parts = [`## X/Twitter Search: "${data.query}"`, ``, `**Posts found:** ${data.total_posts} | **Cost:** $0.75`, ``];
    for (const [i, p] of data.posts.entries()) {
        const eng = p.engagement || {};
        const engStr = [
            eng.likes ? `${eng.likes}❤️` : null,
            eng.reposts ? `${eng.reposts}🔁` : null,
            eng.views ? `${eng.views}👁️` : null,
        ].filter(Boolean).join(" ");
        parts.push(`### ${i + 1}. ${p.author} — ${p.date}`, `${p.content}`, engStr ? `*${engStr}*` : "", p.url ? `[Link](${p.url})` : "", ``);
    }
    if (data.analysis)
        parts.push(`---`, `**Analysis:** ${data.analysis}`, ``);
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: pain_points
// ============================================
server.registerTool("pain_points", {
    description: "Get pain points for any niche — aggregated from Quora, G2, Reddit, Upwork. " +
        "NLP-powered clustering into micro-SaaS ideas. " +
        "Cost: $0.08/request (USDC on Base).",
    inputSchema: {
        keyword: z.string().min(2).describe("Niche keyword (e.g., 'billing automation', 'freelance income', 'crypto trading')"),
    },
}, async ({ keyword }) => {
    console.error(`[apollo-mcp] pain_points: "${keyword}"`);
    const result = await makeApolloRequest("/api/pain-points", { keyword });
    {
        const err = handleToolError(result, "Pain points");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [
        `## Pain Points: "${d.keyword}"`,
        `**Sources:** ${d.total_sources_scraped} items from ${Object.keys(d.source_count || {}).join(", ")}`,
        ``, `### Top Pain Points (${(d.pain_points || []).length})`,
        ...(d.pain_points || []).slice(0, 10).map((p, i) => `${i + 1}. **[${p.type}]** ${p.pain}`),
        ``, `### Pain Clusters`,
        ...(d.pain_clusters || []).slice(0, 5).map((c) => `- **${c.cluster}** (${c.count} pains) → ${c.saas_suggestion}`),
        ``, `### Keyword Variants`,
        ...(d.related_searches || []).slice(0, 8).map((v) => `- ${v.keyword} (${v.type})`),
    ];
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: agentic_trends
// ============================================
server.registerTool("agentic_trends", {
    description: "Agentic economy trends — market signals, funding, multi-agent adoption. 60% reports + 40% forums. Cost: $0.05/request.",
    inputSchema: {},
}, async () => {
    console.error("[apollo-mcp] agentic_trends");
    const result = await makeApolloRequest("/api/agentic-trends");
    {
        const err = handleToolError(result, "Trends");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [
        `## Agentic Economy Trends`,
        `**Sources:** ${d.total_sources} (${d.source_mix?.reports_publications || 0} reports + ${d.source_mix?.forums_communities || 0} forums)`,
        ``, `### Signal Categories`,
        ...(d.signal_categories || []).map((s) => `- **${s.type}** (${s.count} signals)`),
        ``, `### Market Size Signals`,
        ...(d.market_size_signals || []).map((m) => `- ${m.title?.slice(0, 80)} — ${m.market_size}`),
        ``, `### Top Keywords`,
        (d.top_keywords || []).slice(0, 8).map((k) => k.keyword).join(", "),
    ];
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: keyword_opportunities
// ============================================
server.registerTool("keyword_opportunities", {
    description: "Keyword flywheel — seed a keyword, get variants, opportunities, and cross-linked feeds. " +
        "Self-reinforcing intelligence loop. Cost: $0.05/request.",
    inputSchema: {
        seed: z.string().min(2).describe("Seed keyword (e.g., 'money making', 'AI automation', 'no-code tools')"),
    },
}, async ({ seed }) => {
    console.error(`[apollo-mcp] keyword_opportunities: "${seed}"`);
    const result = await makeApolloRequest("/api/keyword-opps", { seed });
    {
        const err = handleToolError(result, "Keyword opps");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [
        `## Keyword Opportunities: "${d.seed_keyword}"`,
        `**Variants:** ${(d.keyword_variants || []).length} | **Opportunities:** ${(d.opportunities || []).length}`,
        ``, `### Top Variants`,
        ...(d.keyword_variants || []).slice(0, 10).map((v) => `- ${v.keyword} (${v.type}, relevance: ${v.relevance})`),
        ``, `### Opportunities Found`,
        ...(d.opportunities || []).slice(0, 8).map((o, i) => `${i + 1}. **${o.title?.slice(0, 80)}**\n   ${o.description?.slice(0, 120)}`),
        ``, `### Cross-Linked Feeds`,
        ...Object.entries(d.feed_links || {}).map(([k, v]) => `- ${k}: ${v}`),
    ];
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: opportunity_bundle
// ============================================
server.registerTool("opportunity_bundle", {
    description: "Opportunity Pack — keywords + pain points + micro-SaaS ideas in one bundle. 35% off vs buying individually. Cost: $0.15/request.",
    inputSchema: {
        keyword: z.string().min(2).describe("Focus keyword for the opportunity pack"),
    },
}, async ({ keyword }) => {
    console.error(`[apollo-mcp] opportunity_bundle: "${keyword}"`);
    const result = await makeApolloRequest("/api/bundle/opportunity-pack", { keyword });
    {
        const err = handleToolError(result, "Bundle");
        if (err)
            return err;
    }
    return { content: [{ type: "text", text: `## Opportunity Pack: "${result.data.keyword}"\n\n` + JSON.stringify(result.data, null, 2).slice(0, 10000) }] };
});
// ============================================
// Tool: agent_intel
// ============================================
server.registerTool("agent_intel", {
    description: "Agent economy opportunities — grants, bounties, hackathons, partnerships, market gaps. " +
        "Curated and updated every 2 hours. Cost: $0.05/request.",
    inputSchema: {},
}, async () => {
    console.error("[apollo-mcp] agent_intel");
    const result = await makeApolloRequest("/api/agent-intel");
    {
        const err = handleToolError(result, "Agent intel");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [
        `## Agent Economy Intel`,
        `**Total opportunities:** ${d.total_opportunities || 0}`,
        `**Last scan:** ${d.last_scan || "unknown"}`, ``,
        `### Top Opportunities`,
        ...(d.top_opportunities || []).slice(0, 10).map((o, i) => `${i + 1}. **${o.name}** [${o.type}] — ${o.value || "N/A"}`),
    ];
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: sentiment
// ============================================
server.registerTool("sentiment", {
    description: "Real-time social sentiment analysis from X/Twitter across crypto, DeFi, AI agents, and tech. " +
        "Powered by Grok. Cost: $0.02/request.",
    inputSchema: {
        topic: z.string().default("").describe("Optional topic filter: crypto, ai, tech, agent"),
    },
}, async ({ topic = "" }) => {
    console.error(`[apollo-mcp] sentiment: topic=${topic || "all"}`);
    const params = {};
    if (topic)
        params.topic = topic;
    const result = await makeApolloRequest("/api/sentiment", params);
    {
        const err = handleToolError(result, "Sentiment");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [`## Market Sentiment`, `**Topics analyzed:** ${d.topics_analyzed || 0}`, ``];
    for (const [key, val] of Object.entries(d.topics || {})) {
        const t = val;
        parts.push(`### ${key}`, `Sentiment: ${t.sentiment || "N/A"}`, `Confidence: ${t.confidence || "N/A"}`, ``);
    }
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: micro_saas
// ============================================
server.registerTool("micro_saas", {
    description: "Validated micro-SaaS opportunities with pain points, market signals, and competition analysis. Cost: $0.10/request.",
    inputSchema: {},
}, async () => {
    console.error("[apollo-mcp] micro_saas");
    const result = await makeApolloRequest("/api/micro-saas");
    {
        const err = handleToolError(result, "Micro-SaaS");
        if (err)
            return err;
    }
    const d = result.data;
    const ideas = d.ideas || d.micro_saas_ideas || [];
    const parts = [
        `## Micro-SaaS Ideas`, `**Total ideas:** ${ideas.length}`, ``,
        ...ideas.slice(0, 10).map((idea, i) => `${i + 1}. **${idea.name || idea.idea}**\n   Pain: ${idea.pain || "N/A"}\n   Market: ${idea.market_size || "N/A"}\n   Competition: ${idea.competition || "N/A"}`),
    ];
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: web3_hackathons
// ============================================
server.registerTool("web3_hackathons", {
    description: "Live Web3 hackathon tracker — ETHGlobal, DoraHacks, Devpost, Devfolio. Includes prize pools, deadlines, requirements. Cost: $0.05/request.",
    inputSchema: {},
}, async () => {
    console.error("[apollo-mcp] web3_hackathons");
    const result = await makeApolloRequest("/api/web3-hackathons");
    {
        const err = handleToolError(result, "Hackathons");
        if (err)
            return err;
    }
    const d = result.data;
    const hacks = d.hackathons || [];
    const parts = [
        `## Web3 Hackathons`, `**Total:** ${d.total_events || hacks.length}`, ``,
        ...hacks.slice(0, 15).map((h, i) => {
            const lines = [`${i + 1}. **${h.name}** (${h.platform || "unknown"})`];
            if (h.prize_pool)
                lines.push(`   Prize: ${h.prize_pool}`);
            if (h.deadline || h.end_date)
                lines.push(`   Deadline: ${h.deadline || h.end_date}`);
            if (h.url)
                lines.push(`   ${h.url}`);
            return lines.join("\n");
        }),
    ];
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: github_trending
// ============================================
server.registerTool("github_trending", {
    description: "GitHub trending repos ranked by star velocity (stars/day). AI-categorized across " +
        "AI agents, web3, infra, devtools. Cost: $0.05/request.",
    inputSchema: {
        language: z.string().default("").describe("Filter by language (e.g., python, rust, typescript)"),
        category: z.string().default("").describe("Filter by category: ai-agents, web3, infra, devtools"),
    },
}, async ({ language = "", category = "" }) => {
    console.error(`[apollo-mcp] github_trending: lang=${language || "all"}, cat=${category || "all"}`);
    const params = {};
    if (language)
        params.language = language;
    if (category)
        params.category = category;
    const result = await makeApolloRequest("/api/github-trending", params);
    {
        const err = handleToolError(result, "GitHub trending");
        if (err)
            return err;
    }
    const d = result.data;
    const repos = d.trending_repos || d.highlights || [];
    const parts = [
        `## GitHub Trending`, `**Total repos:** ${d.total_repos || repos.length}`, ``,
        ...repos.slice(0, 15).map((r, i) => `${i + 1}. **${r.repo || r.name}** — ${r.stars || "?"} stars (${r.velocity || r.star_velocity || "?"})\n   ${r.language || ""} | ${(r.categories || []).join(", ")}\n   ${r.url || ""}`),
    ];
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: producthunt
// ============================================
server.registerTool("producthunt", {
    description: "Daily Product Hunt launches with AI categorization. Track what's shipping across " +
        "AI, devtools, web3, SaaS. Cost: $0.05/request.",
    inputSchema: {
        category: z.string().default("").describe("Filter by category: ai, devtools, web3, saas, design"),
    },
}, async ({ category = "" }) => {
    console.error(`[apollo-mcp] producthunt: category=${category || "all"}`);
    const params = {};
    if (category)
        params.category = category;
    const result = await makeApolloRequest("/api/producthunt", params);
    {
        const err = handleToolError(result, "Product Hunt");
        if (err)
            return err;
    }
    const d = result.data;
    const launches = d.launches || d.highlights || [];
    const parts = [
        `## Product Hunt Launches`, `**Total:** ${d.total_launches || launches.length}`, ``,
        ...launches.slice(0, 15).map((l, i) => `${i + 1}. **${l.title || l.name}** — ${(l.categories || []).join(", ")}\n   ${l.description || ""}\n   ${l.url || ""}`),
    ];
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: weekly_digest
// ============================================
server.registerTool("weekly_digest", {
    description: "Consolidated weekly intelligence report. All feeds combined with cross-feed synthesis " +
        "and priority ranking. 7-day lookback. Cost: $0.25/request.",
    inputSchema: {},
}, async () => {
    console.error("[apollo-mcp] weekly_digest");
    const result = await makeApolloRequest("/api/weekly-digest");
    {
        const err = handleToolError(result, "Weekly digest");
        if (err)
            return err;
    }
    return { content: [{ type: "text", text: `## Weekly Intelligence Digest\n\n` + JSON.stringify(result.data, null, 2).slice(0, 15000) }] };
});
// ============================================
// Tool: agentic_insights_bundle
// ============================================
server.registerTool("agentic_insights_bundle", {
    description: "Agentic Insights bundle — trends + pain points + agent intel in one request. Cost: $0.12/request.",
    inputSchema: {},
}, async () => {
    console.error("[apollo-mcp] agentic_insights_bundle");
    const result = await makeApolloRequest("/api/bundle/agentic-insights");
    {
        const err = handleToolError(result, "Agentic insights bundle");
        if (err)
            return err;
    }
    return { content: [{ type: "text", text: `## Agentic Insights Bundle\n\n` + JSON.stringify(result.data, null, 2).slice(0, 15000) }] };
});
// ============================================
// Tool: builder_intel_bundle
// ============================================
server.registerTool("builder_intel_bundle", {
    description: "Builder Intel bundle — GitHub trending + Product Hunt launches + agent intel. Cost: $0.10/request.",
    inputSchema: {},
}, async () => {
    console.error("[apollo-mcp] builder_intel_bundle");
    const result = await makeApolloRequest("/api/bundle/builder-intel");
    {
        const err = handleToolError(result, "Builder intel bundle");
        if (err)
            return err;
    }
    return { content: [{ type: "text", text: `## Builder Intel Bundle\n\n` + JSON.stringify(result.data, null, 2).slice(0, 15000) }] };
});
// ============================================
// Tool: proxy_fetch
// ============================================
server.registerTool("proxy_fetch", {
    description: "Fetch any URL through Apollo's residential proxy network. " +
        "Supports 190+ countries, rotating or sticky sessions, and handles " +
        "anti-bot protection. Cost: $0.01/request (USDC on Base). " +
        "Max response: 250KB. Rate limit: 100 req/min.",
    inputSchema: {
        target_url: z.string().url().describe("The URL to fetch through the proxy (must be http:// or https://)"),
        country: z.string().length(2).default("US").describe("ISO country code for proxy exit (e.g., US, GB, DE, JP)"),
        method: z.enum(["GET", "POST", "HEAD"]).default("GET").describe("HTTP method to use"),
        session_type: z.enum(["rotating", "sticky"]).default("rotating").describe("rotating = new IP per request, sticky = same IP for session"),
    },
}, async ({ target_url, country = "US", method = "GET", session_type = "rotating" }) => {
    console.error(`[apollo-mcp] proxy_fetch: ${method} ${target_url} via ${country}`);
    const result = await makeApolloRequest("/api/proxy/request", {
        target_url,
        country: country.toUpperCase(),
        method,
        session_type,
    });
    {
        const err = handleToolError(result, "Proxy fetch");
        if (err)
            return err;
    }
    const data = result.data;
    const responseBody = typeof data.response.body === "object"
        ? JSON.stringify(data.response.body, null, 2)
        : String(data.response.body);
    const summary = [
        `## Proxy Fetch Result`, ``,
        `**Target:** ${data.target_url}`,
        `**Proxy Country:** ${data.proxy_country}`,
        `**Status:** ${data.response.status_code}`,
        `**Content-Type:** ${data.response.content_type}`,
        `**Bytes:** ${data.response.bytes_returned}${data.response.truncated ? " (truncated)" : ""}`,
        `**Cost:** $${data.price_paid_usd}`, ``,
        `### Response Body`, ``, "```",
        responseBody.slice(0, 10000), "```",
    ].join("\n");
    return { content: [{ type: "text", text: summary }] };
});
// ============================================
// Tool: proxy_status
// ============================================
server.registerTool("proxy_status", {
    description: "Check Apollo proxy service availability, pricing, and limits. Use this to verify the service is online before making requests.",
    inputSchema: {},
}, async () => {
    console.error("[apollo-mcp] proxy_status: checking service availability");
    const result = await makeApolloRequest("/api/proxy/status");
    {
        const err = handleToolError(result, "Status check");
        if (err)
            return err;
    }
    const data = result.data;
    const status = [
        `## Apollo Proxy Service Status`, ``,
        `**Service:** ${data.service}`, `**Status:** ${data.status}`, ``,
        `### Pricing`,
        `- Per request: $${data.pricing.per_request_usd} USDC (Base mainnet)`,
        `- Max response size: ${(data.pricing.max_response_bytes / 1024).toFixed(0)}KB`,
        `- Rate limit: ${data.pricing.rate_limit}`, ``,
        `### Capabilities`,
        `- Proxy types: ${data.supported_types.join(", ")}`,
        `- Countries: ${data.supported_countries}`,
        `- Session types: ${data.session_types.join(", ")}`,
        `- HTTP methods: ${data.supported_methods.join(", ")}`, ``,
        `### Payment`,
        `Payments handled via x402 protocol. Configure your agent with a USDC wallet on Base mainnet.`,
        `Wallet: 0xf59621FC406D266e18f314Ae18eF0a33b8401004`,
    ].join("\n");
    return { content: [{ type: "text", text: status }] };
});
// ============================================
// Tool: list_countries
// ============================================
server.registerTool("list_countries", {
    description: "List available proxy exit countries. Apollo supports 190+ countries " +
        "for residential proxy exits. Returns ISO 3166-1 alpha-2 country codes.",
    inputSchema: {
        region: z.enum(["all", "americas", "europe", "asia", "africa", "oceania"]).default("all").describe("Filter by region (optional)"),
    },
}, async ({ region = "all" }) => {
    console.error(`[apollo-mcp] list_countries: region=${region}`);
    const regions = {
        americas: ["US", "CA", "MX", "BR", "AR", "CL", "CO", "PE", "VE", "EC", "PA", "CR", "GT", "DO", "PR"],
        europe: ["GB", "DE", "FR", "NL", "IT", "ES", "PT", "PL", "CZ", "AT", "CH", "BE", "SE", "NO", "DK", "FI", "IE", "GR", "RO", "HU", "BG", "HR", "SK", "SI", "UA", "RU", "TR"],
        asia: ["JP", "KR", "SG", "IN", "ID", "TH", "VN", "PH", "MY", "TW", "HK", "PK", "BD", "LK", "NP", "MM", "KH", "LA", "MN", "KZ", "IL", "AE", "SA"],
        africa: ["ZA", "NG", "EG"],
        oceania: ["AU", "NZ"],
    };
    const countries = region === "all" ? PROXY_COUNTRIES : regions[region] || [];
    const output = [
        `## Available Proxy Countries`, ``,
        `**Region:** ${region}`, `**Total:** ${countries.length} countries`, ``,
        `### Country Codes`, ``, countries.join(", "), ``, `---`,
        `Use any 2-letter ISO country code with proxy_fetch.`,
        `Example: \`proxy_fetch(target_url="https://example.com", country="DE")\``,
    ].join("\n");
    return { content: [{ type: "text", text: output }] };
});
// ============================================
// Tool: crypto_prices
// ============================================
server.registerTool("crypto_prices", {
    description: "Live cryptocurrency prices from CoinGecko. Get real-time price, market cap, " +
        "and 24h change for any token. No API key needed. Cost: $0.01/request.",
    inputSchema: {
        ids: z.string().default("bitcoin,ethereum,solana").describe("Comma-separated CoinGecko coin IDs (e.g., bitcoin,ethereum,solana,base-protocol)"),
        vs_currencies: z.string().default("usd").describe("Target currencies: usd, eur, btc, eth (comma-separated)"),
    },
}, async ({ ids = "bitcoin,ethereum,solana", vs_currencies = "usd" }) => {
    console.error(`[apollo-mcp] crypto_prices: ${ids}`);
    const result = await makeApolloRequest("/api/crypto-prices", {
        ids,
        vs_currencies,
        include_market_cap: "true",
        include_24hr_change: "true",
    });
    {
        const err = handleToolError(result, "Crypto prices");
        if (err)
            return err;
    }
    const prices = result.data.prices || {};
    const parts = [`## Crypto Prices`, ``];
    for (const [coin, data] of Object.entries(prices)) {
        const currencies = Object.keys(data).filter(k => !k.includes("_"));
        for (const curr of currencies) {
            const price = data[curr];
            const change = data[`${curr}_24h_change`];
            const mcap = data[`${curr}_market_cap`];
            const changeStr = change !== undefined ? ` (${change > 0 ? "+" : ""}${change.toFixed(2)}%)` : "";
            const mcapStr = mcap ? ` | MCap: ${(mcap / 1e9).toFixed(2)}B` : "";
            parts.push(`**${coin.toUpperCase()}:** ${price.toLocaleString()} ${curr.toUpperCase()}${changeStr}${mcapStr}`);
        }
    }
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: crypto_trending
// ============================================
server.registerTool("crypto_trending", {
    description: "Trending cryptocurrencies — top movers by search volume on CoinGecko. " +
        "Shows what's hot in crypto right now. Cost: $0.02/request.",
    inputSchema: {
        limit: z.number().min(1).max(15).default(10).describe("Max results (1-15, default 10)"),
    },
}, async ({ limit = 10 }) => {
    console.error(`[apollo-mcp] crypto_trending: limit=${limit}`);
    const result = await makeApolloRequest("/api/crypto-trending", { limit: String(limit) });
    {
        const err = handleToolError(result, "Crypto trending");
        if (err)
            return err;
    }
    const coins = result.data.trending_coins || [];
    const parts = [`## Trending Cryptocurrencies`, `**Total:** ${coins.length}`, ``];
    coins.forEach((c, i) => {
        parts.push(`${i + 1}. **${c.symbol}** (${c.name}) — Rank #${c.market_cap_rank || "?"}`);
    });
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// Tool: ip_intel
server.tool("ip_intel", "Multi-source IP intelligence — geolocation, open ports, vulnerabilities, threat classification from Shodan, GreyNoise, AlienVault OTX, ip-api. $0.03/query via x402.", {
    ip: z.string().describe("IPv4 address to investigate"),
}, async ({ ip }) => {
    console.error(`[apollo-mcp] ip_intel: ${ip}`);
    const result = await makeApolloRequest("/api/ip-intel", { ip });
    {
        const err = handleToolError(result, "IP intel");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [
        `## IP Intelligence: ${d.ip}`,
        `**Threat Score:** ${d.threat_score}/100 — ${d.classification}`,
        `**Location:** ${d.geo?.city || "?"}, ${d.geo?.country || "?"} (${d.geo?.isp || "?"})`,
        `**ASN:** ${d.geo?.asn || "?"}`,
        `**Ports:** ${(d.ports || []).join(", ") || "none"}`,
        `**Vulnerabilities:** ${(d.vulns || []).length}`,
        `**Hostnames:** ${(d.hostnames || []).join(", ") || "none"}`,
        `**GreyNoise:** ${d.greynoise?.classification || "unknown"} (noise=${d.greynoise?.noise}, riot=${d.greynoise?.riot})`,
        `**OTX:** ${d.otx?.pulse_count || 0} threat pulses`,
        `**Reasons:** ${(d.threat_reasons || []).join("; ")}`,
        `**Sources:** ${(d.sources || []).join(", ")} (${d.source_count}/4)`,
    ];
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// Tool: domain_intel
server.tool("domain_intel", "Multi-source domain intelligence — DNS, SSL certificates, geo, threat analysis from CertSpotter, AlienVault OTX, ip-api. $0.03/query via x402.", {
    domain: z.string().describe("Domain name to investigate (no protocol prefix)"),
}, async ({ domain }) => {
    console.error(`[apollo-mcp] domain_intel: ${domain}`);
    const result = await makeApolloRequest("/api/domain-intel", { domain });
    {
        const err = handleToolError(result, "Domain intel");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [
        `## Domain Intelligence: ${d.domain}`,
        `**Primary IP:** ${d.primary_ip || "unresolved"}`,
        `**DNS A:** ${(d.dns?.a || []).join(", ") || "none"}`,
        `**IP Location:** ${d.ip_geo?.city || "?"}, ${d.ip_geo?.country || "?"} (${d.ip_geo?.isp || "?"})`,
        `**SSL:** ${d.ssl?.total_certs_found ? `${d.ssl.total_certs_found} certs found` : "no certs"}`,
        d.ssl?.dns_names ? `**SSL SANs:** ${d.ssl.dns_names.slice(0, 5).join(", ")}` : "",
        d.ssl?.not_after ? `**SSL Expires:** ${d.ssl.not_after}` : "",
        `**OTX:** ${d.otx?.pulse_count || 0} threat pulses`,
        `**Threats:** ${(d.threat_indicators || []).join("; ")}`,
        `**Sources:** ${(d.sources || []).join(", ")} (${d.source_count})`,
    ].filter(Boolean);
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// Tool: fx_rates
server.tool("fx_rates", "Live foreign exchange rates for 30+ currencies from ECB data. $0.005/query via x402.", {
    base: z.string().default("USD").describe("Base currency ISO code (default USD)"),
    symbols: z.string().default("").describe("Comma-separated target currencies (empty = all)"),
}, async ({ base = "USD", symbols = "" }) => {
    console.error(`[apollo-mcp] fx_rates: base=${base}`);
    const params = { base };
    if (symbols)
        params.symbols = symbols;
    const result = await makeApolloRequest("/api/fx-rates", params);
    {
        const err = handleToolError(result, "FX rates");
        if (err)
            return err;
    }
    const d = result.data;
    const rates = d.rates || {};
    const parts = [`## FX Rates (Base: ${d.base}, Date: ${d.date})`, ``];
    Object.entries(rates).forEach(([currency, rate]) => {
        parts.push(`- **${currency}:** ${rate}`);
    });
    parts.push(``, `*Source: ${d.source} | ${d.currency_count} currencies*`);
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// Tool: stackexchange
server.tool("stackexchange", "Search programming Q&A from StackExchange (StackOverflow + 170+ sites). No API key needed. $0.02/query via x402.", {
    query: z.string().describe("Search query for question titles"),
    site: z.string().default("stackoverflow").describe("StackExchange site (default: stackoverflow)"),
    tagged: z.string().default("").describe("Comma-separated tags to filter (e.g., python,django)"),
    sort: z.string().default("relevance").describe("Sort by: relevance, votes, creation, hot"),
    page: z.number().default(1).describe("Page number (1-10)"),
    pagesize: z.number().default(10).describe("Results per page (1-30, default 10)"),
}, async ({ query, site = "stackoverflow", tagged = "", sort = "relevance", page = 1, pagesize = 10 }) => {
    console.error(`[apollo-mcp] stackexchange: query=${query}, site=${site}`);
    const params = { query, site, sort, page: String(page), pagesize: String(pagesize) };
    if (tagged)
        params.tagged = tagged;
    const result = await makeApolloRequest("/api/stackexchange", params);
    {
        const err = handleToolError(result, "StackExchange");
        if (err)
            return err;
    }
    const d = result.data;
    const questions = d.questions || [];
    const parts = [`## StackExchange Results (${d.total} total on ${d.site})`, ``];
    questions.forEach((q, i) => {
        const status = q.is_answered ? "✅" : "❌";
        parts.push(`${i + 1}. **${q.title}** ${status}`);
        parts.push(`   - Score: ${q.score} | Answers: ${q.answer_count} | Views: ${q.view_count}`);
        parts.push(`   - Tags: ${q.tags?.join(", ") || "none"}`);
        parts.push(`   - Link: ${q.link}`);
        parts.push("");
    });
    if (d.has_more) {
        parts.push(`*More results available (page ${d.page})*`);
    }
    parts.push(``, `*Source: ${d.source} | Quota remaining: ${d.quota_remaining}*`);
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// Tool: defi_yields
server.tool("defi_yields", "Top DeFi yields across 18K+ pools from DefiLlama. Filter by chain, TVL, stablecoin. $0.03/query via x402.", {
    chain: z.string().default("all").describe("Filter by chain: all, ethereum, solana, base, arbitrum, polygon, avalanche, binance, optimism"),
    min_tvl: z.number().default(100000).describe("Minimum TVL in USD (default 100000)"),
    stablecoin: z.string().default("all").describe("Filter: all, true (stablecoins only), false (non-stablecoins)"),
    sort: z.string().default("apy").describe("Sort by: apy, tvl, apy_base"),
    limit: z.number().default(20).describe("Max results (1-200)"),
}, async ({ chain = "all", min_tvl = 100000, stablecoin = "all", sort = "apy", limit = 20 }) => {
    console.error(`[apollo-mcp] defi_yields: chain=${chain}, min_tvl=${min_tvl}`);
    const params = { chain, min_tvl: String(min_tvl), stablecoin, sort, limit: String(limit) };
    const result = await makeApolloRequest("/api/defi-yields", params);
    {
        const err = handleToolError(result, "DeFi yields");
        if (err)
            return err;
    }
    const d = result.data;
    const yields = d.yields || [];
    const parts = [`## Top DeFi Yields (${d.pools_matching} matching from ${d.total_pools_scanned} pools)`, ``];
    yields.slice(0, limit).forEach((y, i) => {
        parts.push(`${i + 1}. **${y.symbol}** (${y.project} / ${y.chain}) — APY: ${y.apy}% | TVL: $${(y.tvl_usd / 1e6).toFixed(1)}M${y.stablecoin ? ' 🟢 stable' : ''}${y.il_risk === 'yes' ? ' ⚠️ IL' : ''}`);
    });
    if (d.top_chains_by_tvl?.length) {
        parts.push(``, `### Top Chains by TVL`);
        d.top_chains_by_tvl.slice(0, 5).forEach((c) => {
            parts.push(`- **${c.chain}:** $${(c.tvl_usd / 1e9).toFixed(1)}B`);
        });
    }
    parts.push(``, `*Source: ${d.source} | Filters: chain=${chain}, min_tvl=$${min_tvl}*`);
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// Tool: defi_protocols
server.tool("defi_protocols", "Top DeFi protocols by TVL from DefiLlama. 7000+ protocols, category filtering. $0.02/query via x402.", {
    category: z.string().default("all").describe("Filter: all, Lending, DEX, Liquid Staking, Bridge, CDP, Yield, Derivatives"),
    chain: z.string().default("all").describe("Filter by chain presence: all, ethereum, solana, base, arbitrum"),
    limit: z.number().default(20).describe("Max results (1-200)"),
}, async ({ category = "all", chain = "all", limit = 20 }) => {
    console.error(`[apollo-mcp] defi_protocols: category=${category}, chain=${chain}`);
    const params = { category, chain, limit: String(limit) };
    const result = await makeApolloRequest("/api/defi-protocols", params);
    {
        const err = handleToolError(result, "DeFi protocols");
        if (err)
            return err;
    }
    const d = result.data;
    const protocols = d.protocols || [];
    const parts = [`## Top DeFi Protocols by TVL (${d.protocols_matching} matching from ${d.total_protocols})`, ``];
    protocols.slice(0, limit).forEach((p, i) => {
        const change1d = p.change_1d >= 0 ? `+${p.change_1d}%` : `${p.change_1d}%`;
        parts.push(`${i + 1}. **${p.name}** (${p.symbol}) — TVL: $${(p.tvl_usd / 1e9).toFixed(2)}B | 24h: ${change1d} | ${p.category} | ${p.chain_count} chains`);
    });
    if (d.categories?.length) {
        parts.push(``, `### Categories`);
        d.categories.slice(0, 8).forEach((c) => {
            parts.push(`- ${c.name}: ${c.count} protocols`);
        });
    }
    parts.push(``, `*Source: ${d.source} | Filters: category=${category}, chain=${chain}*`);
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: economic_indicators
// ============================================
server.tool("economic_indicators", "Federal Reserve (FRED) economic data — GDP, CPI, unemployment, interest rates, and 800K+ series. $0.03/query via x402.", {
    series_id: z.string().default("GDP").describe("FRED series ID: GDP, CPIAUCSL, UNRATE, DFF, T10Y2Y, FEDFUNDS, M2SL, etc."),
    limit: z.number().default(12).describe("Number of observations (1-100)"),
    sort_order: z.enum(["asc", "desc"]).default("desc").describe("Sort: desc (newest first) or asc"),
}, async ({ series_id = "GDP", limit = 12, sort_order = "desc" }) => {
    console.error(`[apollo-mcp] economic_indicators: series=${series_id}`);
    const result = await makeApolloRequest("/api/economic-indicators", {
        series_id, limit: String(limit), sort_order,
    });
    {
        const err = handleToolError(result, "Economic indicators");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [`## ${d.title || series_id}`, `*${d.frequency || ""} | ${d.units || ""} | Source: FRED*`, ``];
    (d.observations || []).slice(0, limit).forEach((o) => {
        parts.push(`- ${o.date}: **${o.value}**`);
    });
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: country_metrics
// ============================================
server.tool("country_metrics", "World Bank development indicators — GDP, population, literacy, life expectancy for 260+ countries. $0.02/query via x402.", {
    country: z.string().default("US").describe("ISO 2-letter country code (e.g., US, CN, IN, BR, DE)"),
    indicator: z.string().default("NY.GDP.MKTP.CD").describe("World Bank indicator ID: NY.GDP.MKTP.CD (GDP), SP.POP.TOTL (population), SE.ADT.LITR.ZS (literacy)"),
    per_page: z.number().default(10).describe("Results per page (1-50)"),
}, async ({ country = "US", indicator = "NY.GDP.MKTP.CD", per_page = 10 }) => {
    console.error(`[apollo-mcp] country_metrics: ${country} / ${indicator}`);
    const result = await makeApolloRequest("/api/country-metrics", {
        country, indicator, per_page: String(per_page),
    });
    {
        const err = handleToolError(result, "Country metrics");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [`## ${d.indicator_name || indicator} — ${d.country_name || country}`, `*Source: World Bank*`, ``];
    (d.data || []).slice(0, per_page).forEach((o) => {
        const val = o.value !== null ? Number(o.value).toLocaleString() : "N/A";
        parts.push(`- ${o.date}: **${val}**`);
    });
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: malware_feed
// ============================================
server.tool("malware_feed", "URLhaus malware URL feed from abuse.ch — 20K+ active threat URLs with status, threat type, and tags. $0.02/query via x402.", {
    status: z.enum(["all", "online", "offline"]).default("online").describe("Filter by URL status"),
    threat: z.string().default("all").describe("Filter by threat type: all, malware_download, phishing"),
    tag: z.string().default("").describe("Filter by tag (e.g., Emotet, QakBot, AgentTesla)"),
    hours: z.number().default(24).describe("Lookback window in hours (1-720)"),
    limit: z.number().default(20).describe("Max results (1-100)"),
}, async ({ status = "online", threat = "all", tag = "", hours = 24, limit = 20 }) => {
    console.error(`[apollo-mcp] malware_feed: status=${status}, hours=${hours}`);
    const params = { status, threat, hours: String(hours), limit: String(limit) };
    if (tag)
        params.tag = tag;
    const result = await makeApolloRequest("/api/malware-feed", params);
    {
        const err = handleToolError(result, "Malware feed");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [`## URLhaus Malware Feed (${d.total_urls || 0} URLs, last ${hours}h)`, ``];
    (d.urls || []).slice(0, limit).forEach((u) => {
        parts.push(`- **${u.status}** | ${u.threat} | ${u.url} | Tags: ${(u.tags || []).join(", ") || "none"} | Added: ${u.date_added}`);
    });
    if (d.stats)
        parts.push(``, `*Stats: ${d.stats.online || 0} online, ${d.stats.offline || 0} offline*`);
    parts.push(``, `*Source: abuse.ch URLhaus*`);
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: ip_geo
// ============================================
server.tool("ip_geo", "IP geolocation + ASN lookup via GeoJS — country, city, coordinates, timezone, organization. $0.01/query via x402.", {
    ip: z.string().describe("IPv4 or IPv6 address to geolocate"),
}, async ({ ip }) => {
    console.error(`[apollo-mcp] ip_geo: ${ip}`);
    const result = await makeApolloRequest("/api/ip-geo", { ip });
    {
        const err = handleToolError(result, "IP geolocation");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [
        `## IP Geolocation: ${ip}`,
        `- **Country:** ${d.country || "?"} (${d.country_code || "?"})`,
        `- **City:** ${d.city || "?"}, ${d.region || "?"}`,
        `- **Coords:** ${d.latitude || "?"}, ${d.longitude || "?"}`,
        `- **Organization:** ${d.organization || "?"}`,
        `- **ASN:** ${d.asn || "?"}`,
        `- **Timezone:** ${d.timezone || "?"}`,
        ``, `*Source: GeoJS*`,
    ];
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: geocode
// ============================================
server.tool("geocode", "Forward + reverse geocoding via OpenStreetMap/Nominatim. Address to coordinates or coordinates to address. $0.01/query via x402.", {
    q: z.string().optional().describe("Forward geocode: address or place name (e.g., 'Boise, Idaho')"),
    lat: z.string().optional().describe("Reverse geocode: latitude"),
    lon: z.string().optional().describe("Reverse geocode: longitude"),
    limit: z.number().default(5).describe("Max results for forward geocoding (1-10)"),
}, async ({ q, lat, lon, limit = 5 }) => {
    console.error(`[apollo-mcp] geocode: q=${q}, lat=${lat}, lon=${lon}`);
    const params = { limit: String(limit) };
    if (q)
        params.q = q;
    if (lat)
        params.lat = lat;
    if (lon)
        params.lon = lon;
    const result = await makeApolloRequest("/api/geocode", params);
    {
        const err = handleToolError(result, "Geocode");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [`## Geocode Results`];
    if (d.results) {
        d.results.slice(0, limit).forEach((r, i) => {
            parts.push(`${i + 1}. **${r.display_name}** — ${r.lat}, ${r.lon} (${r.type || "place"})`);
        });
    }
    else if (d.address) {
        parts.push(`**${d.display_name}** — ${d.lat}, ${d.lon}`);
    }
    parts.push(``, `*Source: Nominatim/OpenStreetMap*`);
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: weather
// ============================================
server.tool("weather", "Current weather + 7-day forecast from Open-Meteo. Temperature, wind, precipitation, weather codes. $0.01/query via x402.", {
    lat: z.string().describe("Latitude (e.g., 43.62)"),
    lon: z.string().describe("Longitude (e.g., -116.20)"),
    forecast: z.boolean().default(false).describe("Include 7-day forecast (default: current only)"),
}, async ({ lat, lon, forecast = false }) => {
    console.error(`[apollo-mcp] weather: ${lat}, ${lon}, forecast=${forecast}`);
    const endpoint = forecast ? "/api/weather/forecast" : "/api/weather/current";
    const result = await makeApolloRequest(endpoint, { lat, lon });
    {
        const err = handleToolError(result, "Weather");
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [`## Weather at ${lat}, ${lon}`];
    if (d.current) {
        parts.push(`**Current:** ${d.current.temperature_2m}°C | Wind: ${d.current.wind_speed_10m} km/h | ${d.current.description || ""}`);
    }
    if (d.daily?.time) {
        parts.push(``, `### 7-Day Forecast`);
        d.daily.time.forEach((date, i) => {
            const hi = d.daily.temperature_2m_max?.[i] ?? "?";
            const lo = d.daily.temperature_2m_min?.[i] ?? "?";
            const precip = d.daily.precipitation_sum?.[i] ?? 0;
            parts.push(`- ${date}: ${lo}°C – ${hi}°C | Precip: ${precip}mm`);
        });
    }
    parts.push(``, `*Source: Open-Meteo*`);
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Tool: ml_analyze
// ============================================
server.tool("ml_analyze", "Text analysis: sentiment, named entities, or summarization via HuggingFace models. $0.01–$0.02/query via x402.", {
    text: z.string().describe("Text to analyze"),
    task: z.enum(["sentiment", "entities", "summarize"]).default("sentiment").describe("Analysis task"),
}, async ({ text, task = "sentiment" }) => {
    console.error(`[apollo-mcp] ml_analyze: task=${task}, len=${text.length}`);
    const endpoint = task === "sentiment" ? "/api/ml/sentiment" : task === "entities" ? "/api/ml/entities" : "/api/ml/summarize";
    const result = await makeApolloRequest(endpoint, { text });
    {
        const err = handleToolError(result, `ML ${task}`);
        if (err)
            return err;
    }
    const d = result.data;
    const parts = [`## ML Analysis: ${task}`];
    if (task === "sentiment") {
        parts.push(`**Sentiment:** ${d.sentiment} (confidence: ${(d.confidence * 100).toFixed(1)}%)`);
        if (d.scores)
            parts.push(`Scores: ${JSON.stringify(d.scores)}`);
    }
    else if (task === "entities") {
        parts.push(`**Entities found:**`);
        (d.entities || []).forEach((e) => parts.push(`- ${e.entity} (${e.type}, ${(e.score * 100).toFixed(0)}%)`));
    }
    else {
        parts.push(`**Summary:** ${d.summary}`);
        if (d.compression_ratio)
            parts.push(`Compression: ${(d.compression_ratio * 100).toFixed(0)}%`);
    }
    return { content: [{ type: "text", text: parts.join("\n") }] };
});
// ============================================
// Main entry point
// ============================================
const TOOL_LIST = [
    "web_scrape", "web_search", "x_search", "agent_intel", "sentiment", "pain_points",
    "agentic_trends", "keyword_opportunities", "micro_saas", "web3_hackathons",
    "github_trending", "producthunt", "weekly_digest", "crypto_prices", "crypto_trending",
    "ip_intel", "domain_intel", "fx_rates", "stackexchange", "defi_yields", "defi_protocols",
    "opportunity_bundle", "agentic_insights_bundle", "builder_intel_bundle",
    "proxy_fetch", "proxy_status", "list_countries",
    "economic_indicators", "country_metrics", "malware_feed", "ip_geo", "geocode",
    "weather", "ml_analyze",
];
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Apollo MCP Server v4.7.0 running on stdio`);
    console.error(`  Tools: ${TOOL_LIST.length} (${TOOL_LIST.join(", ")})`);
    console.error("  Endpoint: https://apolloai.team/api/*");
    console.error("  Payment: x402 (USDC on Base mainnet)");
}
main().catch((error) => {
    console.error("Fatal error in Apollo MCP Server:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map