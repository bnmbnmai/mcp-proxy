# ERC-8004 seller agentURI — register later

Public unpaid agentURI (this shop, after deploy):

https://ticks.bnm.farm/.well-known/erc8004.json

Same JSON also at `/agent-registration.json` and `/.well-known/agent-registration.json`.

`registrations[]` is omitted until the agent NFT exists. Do not invent an `agentId`. No key is in this repo.

## Once, from the Apollo payTo wallet

Needs the live key for `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. Do not commit that key. Do not run this from a cloud agent.

1. On Base mainnet (`eip155:8453`), Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`:
   `register("https://ticks.bnm.farm/.well-known/erc8004.json")`.
2. Read `agentId` from the `Registered` event.
3. Add `registrations: [{ "agentId": <minted id>, "agentRegistry": "eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" }]` to the registration file.
4. `register()` sets on-chain `agentWallet` to `msg.sender`. If that sender is already the payTo wallet, stop. If the NFT owner and payTo later differ, `setAgentWallet` needs a signature from the new wallet.
