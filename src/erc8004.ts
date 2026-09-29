/**
 * ERC-8004 registration-v1 agentURI for the BNM Data Shop seller.
 *
 * Public unpaid JSON. Not a SKU. No private key, seed, or wallet JSON.
 *
 * Base mainnet Identity Registry 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 * (eip155:8453). agentId 96169 was minted by register(ERC8004_AGENT_URI)
 * from the payTo wallet. See docs/ERC8004-REGISTER.md.
 */

/** Shop origin. Same host as ticks-mcp LIVE_ORIGIN. */
export const SHOP_ORIGIN = "https://ticks.bnm.farm";
/** Payout address. Same as ticks-door / ticks-mcp PAY_TO. */
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
/** Matches ticks-mcp initialize / mcpDiscovery protocolVersion. */
export const MCP_PROTOCOL_VERSION = "2025-03-26";

export const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
export const AGENT_REGISTRY = `eip155:8453:${IDENTITY_REGISTRY}`;
/** Minted by IdentityRegistry.register on Base. Tx 0xa85c4180cdec1b0d9b9525ca6fc03fc787891b3539a69a194f4978bca1ef5b67. */
export const ERC8004_AGENT_ID = 96169;

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

export type Erc8004OnchainRegistration = {
  agentId: number;
  agentRegistry: string;
};

export type Erc8004Registration = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";
  name: string;
  description: string;
  services: Erc8004Service[];
  x402Support: true;
  active: true;
  registrations: Erc8004OnchainRegistration[];
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
    registrations: [
      {
        agentId: ERC8004_AGENT_ID,
        agentRegistry: AGENT_REGISTRY,
      },
    ],
  };
}
