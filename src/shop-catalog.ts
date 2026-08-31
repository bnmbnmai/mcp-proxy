/**
 * Shop catalog derived from live /.well-known/x402.
 * Door count is whatever well-known lists today — never hardcoded.
 */
export const LIVE_ORIGIN = "https://ticks.bnm.farm";
export const WELL_KNOWN_PATH = "/.well-known/x402";
export const OPENAPI_PATH = "/openapi.json";
export const MCP_PATH = "/mcp";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const NETWORK = "eip155:8453";

export const TABLE_PATHS = new Set(["/ticks", "/import-alerts"]);
export const MARINER_PATHS = new Set(["/mariners", "/mariners-d11", "/mariners-d7", "/mariners-d8"]);

export const SEARCH_TOOL_NAME = "search";
export const FIRM_CHECK_TOOL_NAME = "firm-check";
export const GET_PAGE_TOOL_NAME = "get-page";
export const GET_ONE_TOOL_NAME = "get-one";

export type WellKnownDoc = {
  resources?: unknown;
  instructions?: unknown;
  [key: string]: unknown;
};

export type OpenApiDoc = {
  info?: { title?: string; description?: string; version?: string };
  paths?: Record<string, { get?: { summary?: string; description?: string } }>;
};

export type LivePaidSku = {
  path: string;
  name: string;
  kind: "table" | "mariners" | "body";
  price: string;
  bag: string;
  searchMd: string;
};

const BAG_BY_PATH: Record<string, string> = {
  "/ticks":
    "US hay, cattle, and grain ticks (USDA AMS nationwide plus official dairy, hogs, and terminal produce). Entire current table",
  "/import-alerts": "FDA Import Alerts / DWPE firm-product snapshot. Entire current table",
  "/mariners": "USCG D13 / Northwest this week's LNM",
  "/mariners-d11": "USCG D11 / Southwest this week's LNM",
  "/mariners-d7": "USCG D7 / Southeast this week's LNM",
  "/mariners-d8": "USCG D8 / Gulf this week's LNM",
  "/warning-letters": "FDA warning-letter bodies. Newest 10 official texts",
  "/untitled-letters": "FDA Untitled Letter text (CDER OPDP + CBER promo PDFs). Newest 10 official texts",
  "/awa": "USDA APHIS AWA inspection-report observation text. Newest 10 official texts",
  "/swisspar": "Swissmedic first-authorisation SwissPAR evaluation text. Newest 10 official texts",
  "/pcac": "FDA PCAC 503A briefing-memo evaluation text. Newest 10 official texts",
  "/ftc-wl": "FTC BCP warning-letter text. Newest 10 official texts",
  "/cfpb-orders": "CFPB consent-order / administrative-order text. Newest 10 official texts",
  "/occ-cd": "OCC institution C&D / consent-order text. Newest 10 official texts",
  "/fdic-orders": "FDIC institution consent-order / C&D text. Newest 10 official texts",
  "/frb-orders": "FRB institution C&D / written-agreement / PCA text. Newest 10 official texts",
  "/ncua-orders": "NCUA institution consent C&D text. Newest 10 official texts",
  "/fincen-orders": "FinCEN institution consent-order text. Newest 10 official texts",
  "/ferc-orders": "FERC institution stipulation-and-consent text. Newest 10 official texts",
  "/ofac-orders": "OFAC institution enforcement-release text. Newest 10 official texts",
  "/bis-orders": "BIS institution charging-letter / order text. Newest 10 official texts",
  "/cftc-orders": "CFTC institution enforcement-order / settlement text. Newest 10 official texts",
  "/fifra-orders": "EPA FIFRA institution order / consent text. Newest 10 official texts",
  "/denovo-orders": "FDA De Novo classification-order text. Newest 10 official texts",
  "/ttb-oic": "TTB Offer in Compromise text. Newest 10 official texts",
  "/air-letters": "USDA APHIS AIR confirmation-letter text. Newest 10 official texts",
  "/superfund-rods": "EPA Superfund Record of Decision text. Newest 10 official texts",
  "/ico-mpn": "ICO Monetary Penalty Notice text. Newest 10 official texts",
  "/cma-ca98": "UK CMA CA98 infringement-decision text. Newest 10 official texts",
  "/ema-referrals": "EMA human-medicine referral procedure text. Newest 10 official texts",
  "/cder-reviews": "FDA CDER Integrated Review text. Newest 10 official texts",
  "/npdes-permits": "EPA-issued individual NPDES permit text. Newest 10 official texts",
  "/ofsted-inspections": "Ofsted school / provider inspection-report text. Newest 10 official texts",
  "/ofwat-enforcement":
    "Ofwat Water Industry Act 1991 enforcement-notice / final-decision / s.19 undertakings text. Newest 10 official texts",
  "/ofgem-enforcement":
    "Ofgem enforcement-notice / s.27A penalty-proposal / confirmed and provisional-order text. Newest 10 official texts",
  "/gain": "USDA FAS GAIN attaché report TEXT. Newest 10 official texts",
  "/orr-enforcement":
    "ORR Railways Act 1993 s.55 statutory-notice / final-order / investigation-report text. Newest 10 official texts",
  "/form-483": "FDA Form 483 inspectional observation bodies. Newest 10 official texts",
  "/gmp": "Health Canada Drug GMP report-card observation text + C.02 cites. Newest 10 official texts",
  "/gmp-md": "Health Canada medical-device report-card observation text + MDR cites. Newest 10 official texts",
};

export function resourcePath(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const path = value.startsWith("/") ? value : new URL(value).pathname;
    return path.replace(/\/+$/, "") || "/";
  } catch {
    return null;
  }
}

export function skuKind(path: string): LivePaidSku["kind"] {
  if (TABLE_PATHS.has(path)) return "table";
  if (MARINER_PATHS.has(path)) return "mariners";
  return "body";
}

export function skuPrice(kind: LivePaidSku["kind"]): string {
  return kind === "body" ? "$0.02 / $0.05" : "$0.05";
}

export function searchMarkdown(path: string): string {
  if (path === "/ticks") {
    return `[manifest.json](${LIVE_ORIGIN}/manifest.json)`;
  }
  if (path === "/import-alerts") {
    return `[firm-check?q=](${LIVE_ORIGIN}/firm-check?q=) · [manifest.json](${LIVE_ORIGIN}${path}/manifest.json)`;
  }
  if (skuKind(path) === "body") {
    return `[manifest.json?q=](${LIVE_ORIGIN}${path}/manifest.json?q=)`;
  }
  return `[manifest.json](${LIVE_ORIGIN}${path}/manifest.json)`;
}

export function bagForPath(path: string, openApi?: OpenApiDoc): string {
  const known = BAG_BY_PATH[path];
  if (known) return known;
  const op = openApi?.paths?.[path]?.get;
  const summary = typeof op?.summary === "string" ? op.summary.trim() : "";
  if (summary) {
    return skuKind(path) === "body" ? `${summary}. Newest 10 official texts` : summary;
  }
  return `Official public-data GET ${path}`;
}

export function paidPathsFromWellKnown(wellKnown: WellKnownDoc): string[] {
  const resources = Array.isArray(wellKnown.resources) ? wellKnown.resources : [];
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const raw of resources) {
    const path = resourcePath(String(raw ?? ""));
    if (!path || path === "/" || path === MCP_PATH) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return paths;
}

export function skusFromWellKnown(wellKnown: WellKnownDoc, openApi?: OpenApiDoc): LivePaidSku[] {
  return paidPathsFromWellKnown(wellKnown).map((path) => {
    const kind = skuKind(path);
    return {
      path,
      name: path.replace(/^\//, ""),
      kind,
      price: skuPrice(kind),
      bag: bagForPath(path, openApi),
      searchMd: searchMarkdown(path),
    };
  });
}

export function extraMcpToolNames(): string[] {
  return [SEARCH_TOOL_NAME, FIRM_CHECK_TOOL_NAME, GET_PAGE_TOOL_NAME, GET_ONE_TOOL_NAME];
}

export function assertNoHardcodedDoorCount(text: string): void {
  const banned = [
    /\b36 doors\b/i,
    /\b40 doors\b/i,
    /\bThirty-six paid\b/i,
    /\bForty paid GETs\b/i,
    /\bthe 36 paid\b/i,
    /\bthe 40 paid\b/i,
    /\bsame forty paid\b/i,
    /\b36 official public-data\b/i,
    /\b40 official public-data\b/i,
  ];
  for (const re of banned) {
    if (re.test(text)) {
      throw new Error(`catalog copy must not hardcode a door count (${re})`);
    }
  }
}

export function shopIndexMarkdown(skus: LivePaidSku[]): string {
  const rows = skus
    .map((sku) => `| \`${sku.path}\` | ${sku.bag} | ${sku.price} | ${sku.searchMd} |`)
    .join("\n");
  return `# BNM Data Shop — live door index

BNM Data Shop — official public-data x402 GETs at [ticks.bnm.farm](https://ticks.bnm.farm). Live count is [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402), not a hardcoded door number.

- Shop: [https://bnm.farm/](https://bnm.farm/)
- Paid host: [https://ticks.bnm.farm](https://ticks.bnm.farm)
- Discovery: [https://ticks.bnm.farm/.well-known/x402](https://ticks.bnm.farm/.well-known/x402)
- OpenAPI: [https://ticks.bnm.farm/openapi.json](https://ticks.bnm.farm/openapi.json)
- llms.txt: [https://ticks.bnm.farm/llms.txt](https://ticks.bnm.farm/llms.txt)
- MCP: [https://ticks.bnm.farm/mcp](https://ticks.bnm.farm/mcp)
- Shop JSON: [https://ticks.bnm.farm/](https://ticks.bnm.farm/)

payTo \`${PAY_TO}\` · Base (\`${NETWORK}\`) · USDC \`${USDC}\`

Unpaid GET on a paid path returns HTTP 402. After \`X-PAYMENT\`, the same URL returns JSON. Unpaid 402 \`accepts[].extra\` names \`searchUrl\`, \`oneDocPath\`, \`priceAtomic\`, \`pagePriceAtomic\`, \`pageDefault\`, \`tableWhole\`, \`firmCheckUrl\`, \`sampleUrl\`. \`extra.name\` stays USD Coin.

MCP at \`/mcp\` is generated from live [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402) (one paid tool per paid resource) plus free \`search\` and \`firm-check\`. \`/sample\` is the free canned-keys GET, not an MCP tool and not a SKU.

## Free (not paid)

| Path | Bag | URL |
| --- | --- | --- |
| \`/sample\` | Canned paid-JSON keys. HTTP 200 | [https://ticks.bnm.farm/sample](https://ticks.bnm.farm/sample) |
| \`/firm-check?q=\` | Free firm-name search across official caches. HTTP 200. Names the door and the \`?id=\` or page to buy ($0.02 one text / $0.05 page or table) | [https://ticks.bnm.farm/firm-check?q=](https://ticks.bnm.farm/firm-check?q=) |

## Live paid GETs

Same order as live [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402). Tables: **$0.05** = entire current table. Mariners: **$0.05** = this week's LNM. Body doors: free search, then **$0.02** one official text (\`?id=\`) or **$0.05** newest 10 (older page \`?before=\`).

| Path | Bag | Price | Search |
| --- | --- | --- | --- |
${rows}

Re-read live well-known before assuming a new door.
`;
}

export function readmeMarkdown(skus: LivePaidSku[]): string {
  const rows = skus.map((sku) => `| \`${sku.path}\` | ${sku.bag} | ${sku.price} |`).join("\n");
  return `# BNM Data Shop — official public-data x402 GETs at ticks.bnm.farm

Official public data as JSON at [https://ticks.bnm.farm](https://ticks.bnm.farm). Live paid GETs are [/.well-known/x402](https://ticks.bnm.farm/.well-known/x402), not a hardcoded door number. USDC on Base (\`${NETWORK}\`) to \`${PAY_TO}\`.

Shop: [https://bnm.farm/](https://bnm.farm/) · Agent brief: [https://ticks.bnm.farm/llms.txt](https://ticks.bnm.farm/llms.txt) · Door list: [SHOP-INDEX.md](./SHOP-INDEX.md)

## Bags and prices

- **Tables** (\`GET /ticks\`, \`GET /import-alerts\`) — **$0.05** = the entire current table.
- **Body doors** (the other paid GETs) — free search \`GET https://ticks.bnm.farm/{door}/manifest.json?q=\` (HTTP 200) returns \`id\` and the \`?id=\` URL. Then pay \`GET ?id=\` (**$0.02**, one official text) or the page (**$0.05**, newest 10 official texts; older page \`?before=\`, another $0.05).

Unpaid GET on a paid path returns HTTP 402 with \`PAYMENT-REQUIRED\`. No request body.

## Free (not SKUs)

- \`GET /sample\` — canned paid-JSON keys. HTTP 200.
- \`GET /firm-check?q=\` — firm-name search across official caches. HTTP 200. Names the door and the \`?id=\` or page to buy.
- \`GET /{door}/manifest.json?q=\` — free index/search on every extracted-body door.
- \`GET /.well-known/x402\` — the live paid URLs.
- \`GET /openapi.json\` — OpenAPI 3.1.
- \`GET /llms.txt\` — short agent guidance.
- \`GET /\` — shop JSON (payTo + the live products).

## MCP

\`GET/POST https://ticks.bnm.farm/mcp\` — Streamable HTTP. One tool per live paid GET, plus free \`search\`, free \`firm-check\`, paid \`get-one\` ($0.02), paid \`get-page\` ($0.05). Tools are generated from live well-known.

\`\`\`
npx -y mcp-remote https://ticks.bnm.farm/mcp
\`\`\`

## Paid doors

| Path | Bag | Price |
| --- | --- | --- |
${rows}

Search URL for each body door: \`https://ticks.bnm.farm/{path}/manifest.json?q=\`. Full list with search links: [SHOP-INDEX.md](./SHOP-INDEX.md). Live source of truth: [https://ticks.bnm.farm/.well-known/x402](https://ticks.bnm.farm/.well-known/x402).
`;
}

export async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "bnm-data-shop/1.0 (shop-catalog; +https://ticks.bnm.farm/.well-known/x402)",
    },
  });
  if (!response.ok) throw new Error(`GET ${url} HTTP ${response.status}`);
  return response.json();
}

export async function fetchLiveCatalog(origin = LIVE_ORIGIN): Promise<{
  wellKnown: WellKnownDoc;
  openApi: OpenApiDoc;
  skus: LivePaidSku[];
}> {
  const base = origin.replace(/\/+$/, "") || LIVE_ORIGIN;
  const wellKnown = (await fetchJson(`${base}${WELL_KNOWN_PATH}`)) as WellKnownDoc;
  const openApi = (await fetchJson(`${base}${OPENAPI_PATH}`)) as OpenApiDoc;
  return { wellKnown, openApi, skus: skusFromWellKnown(wellKnown, openApi) };
}
