# EMA human-medicine referral procedure text — x402 door

Official **EMA human-medicine referral procedure TEXT** extracted from English PDFs on `www.ema.europa.eu` (`/en/documents/referral/…_en.pdf`). Does not invent procedure text. Does not sell the free catalog JSON. Human medicines only. Not people. Not veterinary. Not SwissPAR `/swisspar`. Not FDA Form 483 / warning letters. Not Superfund.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /ema-referrals` is HTTP 402. MCP at `/mcp` generates an `ema-referrals` tool from live well-known (do not hardcode a door count).

v1 seeds **14** completed human referral procedure PDFs. Required seed is **Tavneos** (Article 20, EC decision 2026-08-04). Prefer public assessment report > scientific conclusions > official “EMA recommends…” Q&A. Skip notification / timetable / list-of-questions / annex-I teasers, product-information annexes, and non-English PDFs.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /ema-referrals` | unpaid → **HTTP 402** | default newest 10 **$0.05** (`50000` atomic); `?id=` one official text **$0.02** (`20000` atomic) |
| `GET /ema-referrals/manifest.json` | free | HTTP 200 name / date / status / official PDF URL (no procedure body). `?q=` search names the id to buy. |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

Older pages are another **$0.05** on the same URL (`page` / `before`). If the catalog has fewer than 10, the nickel GET is the whole current set.

## Source of truth

- Official catalog (index only, not sold): https://www.ema.europa.eu/en/documents/report/referrals-output-json-report_en.json
- Procedure pages: `https://www.ema.europa.eu/en/medicines/human/referrals/{slug}`
- Official English PDFs: `https://www.ema.europa.eu/en/documents/referral/…_en.pdf`
- Required seed: Tavneos — Article 20 — EC decision 4 Aug 2026 — https://www.ema.europa.eu/en/medicines/human/referrals/tavneos
- License: **EMA copyright**. Public EMA documents may be reproduced for **commercial** purposes if the European Medicines Agency is acknowledged as the source.

Paid body keeps `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=ema-referrals`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official catalog URL). A repeat buyer diffs `asOf` + record ids.

Free manifest is id / name / date / status / sourceUrl only. Procedure needles such as Tavneos CHMP revocation language stay out of unpaid responses.

`data/ema-referrals/` is gitignored.

This repo does **not** own the bnm.farm lander card. tv-remote follow-up: add an `/ema-referrals` card there after apply.

## Apollo collect

```bash
cd ~/projects/mcp-proxy
export EMA_REFERRALS_DIR=$HOME/projects/mcp-proxy/data/ema-referrals
EMA_REFERRALS_LIMIT=14 npm run collect:ema-referrals
```
