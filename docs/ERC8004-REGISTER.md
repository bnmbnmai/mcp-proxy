# ERC-8004 seller agentURI

Public unpaid agentURI:

https://ticks.bnm.farm/.well-known/erc8004.json

Same JSON also at `/agent-registration.json` and `/.well-known/agent-registration.json`.

## Registered

Base mainnet (`eip155:8453`), Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`.

`register("https://ticks.bnm.farm/.well-known/erc8004.json")` from the payTo wallet `0xf59621FC406D266e18f314Ae18eF0a33b8401004`.

- agentId: **96169**
- tx: `0xa85c4180cdec1b0d9b9525ca6fc03fc787891b3539a69a194f4978bca1ef5b67`
- block: 51936320
- owner and agentWallet: the payTo address (msg.sender). `setAgentWallet` was not required.
- gas: 177780. Cost about $0.003. No USDC moved.

`registrations[]` in the agentURI:

```json
[{ "agentId": 96169, "agentRegistry": "eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" }]
```

No key is in this repo.
