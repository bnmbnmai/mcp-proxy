/**
 * ERC-8004 registration-v1 agentURI for the BNM Data Shop seller.
 *
 * Public unpaid JSON. Not a SKU. No private key, seed, or wallet JSON.
 *
 * registrations[] is omitted on purpose. EIP-8004 requires agentId and
 * agentRegistry on each entry, and agentId is assigned by
 * IdentityRegistry.register. Do not invent one.
 *
 * Follow-up (once, Apollo payTo wallet, not this file): see docs/ERC8004-REGISTER.md.
 * Base mainnet Identity Registry 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 * (eip155:8453). register(tokenURI) with ERC8004_AGENT_URI, then fill
 * registrations[] from the minted agentId.
 */

/** Shop origin. Same host as ticks-mcp LIVE_ORIGIN. */
export const SHOP_ORIGIN = "https://ticks.bnm.farm";
/** Payout address. Same as ticks-door / ticks-mcp PAY_TO. */
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
/** Matches ticks-mcp initialize / mcpDiscovery protocolVersion. */
export const MCP_PROTOCOL_VERSION = "2025-03-26";

export const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
export const AGENT_REGISTRY = `eip155:8453:${IDENTITY_REGISTRY}`;

export const ERC8004_PATH = "/.well-known/erc8004.json";
export const AGENT_REGISTRATION_PATH = "/agent-registration.json";
export const AGENT_REGISTRATION_WELL_KNOWN_PATH = "/.well-known/agent-registration.json";

export const ERC8004_PATHS = [
  ERC8004_PATH,
  AGENT_REGISTRATION_PATH,
  AGENT_REGISTRATION_WELL_KNOWN_PATH,
] as const;

/** Canonical tokenURI for a later IdentityRegistry.register(tokenURI). */
export const ERC8004_AGENT_URI = `${SHOP_ORIGIN}${ERC8004_PATH}`;

export type Erc8004Service = {
  name: string;
  endpoint: string;
  version?: string;
};

export type Erc8004Registration = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";
  name: string;
  description: string;
  services: Erc8004Service[];
  x402Support: true;
  active: true;
};

export function erc8004Registration(): Erc8004Registration {
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "BNM Data Shop",
    description:
      "Official public-data x402 shop at https://ticks.bnm.farm. Paid GETs are USDC on Base (eip155:8453); the payout address is the agentWallet service. Live paid URLs are https://ticks.bnm.farm/.well-known/x402 (do not hardcode a door count). MCP is Streamable HTTP at https://ticks.bnm.farm/mcp. Unpaid GET on a paid path returns HTTP 402. Free discovery includes /sample, /firm-check, per-door manifests, /openapi.json, and /llms.txt.",
    services: [
      {
        name: "MCP",
        endpoint: `${SHOP_ORIGIN}/mcp`,
        version: MCP_PROTOCOL_VERSION,
      },
      {
        name: "web",
        endpoint: `${SHOP_ORIGIN}/`,
      },
      {
        name: "x402",
        endpoint: `${SHOP_ORIGIN}/.well-known/x402`,
      },
      {
        name: "agentWallet",
        endpoint: `eip155:8453:${PAY_TO}`,
      },
    ],
    x402Support: true,
    active: true,
  };
}
