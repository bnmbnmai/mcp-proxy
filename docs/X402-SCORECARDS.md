# x402 scorecard fixes (ticks door)

Do **not** merge to `main`. Live checkout after apollo apply is `cursor/apply-vet402-receipt-e6e8`.

Applied on apollo (2026-09-07): **serving SHA `ada70dc`** (merge of PR 204 @ `0334c84` onto `cursor/apply-bsee-reports-5a99` @ `4e416e4`). Restarted **only** `idaho-ticks-x402.service` at **2026-09-07 17:39:59 MDT** (PID 1084062). Unpaid `GET /ticks` is **402**. `HEAD /ticks` is **402** with `PAYMENT-REQUIRED` (not 405). `HEAD /llms.txt` is **200**. `/.well-known/x402` lists **49** doors including `/bsee-reports` and publishes `extra.resourceCount` 49. x402-list owner `endpoints_add` is still Chief/human. Superfund FYR was not applied. No new collect cron.

## Issue → fix

| Scorecard | Finding | Fix in this PR | Still human / later |
| --- | --- | --- | --- |
| vet402 L1 (`delivered_no_receipt`, 2026-09-06T19:00:22Z GET `/ticks`, UA `vet402-observatory-l1/1.0`) | Paid HTTP 200 with no settlement receipt | JSON and PDF paid 200s set `PAYMENT-RESPONSE` and `X-PAYMENT-RESPONSE` to the same base64 `SettlementResponse` (`success`, `transaction`, `network`, `payer`) **only** when facilitator / local EIP-3009 settle returned a real `txHash` | Re-probe after apollo apply |
| vet402 L2 (`l2_schema: mismatch`) | Catalog required key was discovery wrapper `type`, not paid JSON | Paid-body schema is `extensions.bazaar.info.output.schema` (`required` = example keys). Wrapper `schema.properties.output.required: ["type"]` is gone. `info.output.type` stays `json`/`pdf` | Re-probe after catalog re-index / next settle |
| x402-list `verified: false` | FORTE badge = **their** paid delivery probe, not domain proof. Proof file already live at `/.well-known/x402list.txt` | Receipts on settled 200s so a future x402-list paid probe can count as delivered | They must run the paid probe. Owner update cannot set `verified`. Do not mint a new ownership token from this VM |
| x402-list `endpoint_count` / description **36** vs live well-known **49** | Listing metadata frozen from 2026-08-27 capture | Live `/.well-known/x402`, `/llms.txt`, `/openapi.json`, `GET /` publish `resourceCount` / dynamic door words. `GET /robots.txt` + `/.well-known/llms.txt` + `Link: rel=llms-txt` | Owner update (below) to refresh their stored description + `endpoints_add` |
| x402-list `site.llms_txt: false` | Their site check HEADs `/llms.txt`. Live HEAD on every free path was **405** | **HEAD on discovery paths is the same 200 as GET** (empty body, `Content-Length` of the GET payload). `/llms.txt` is `text/plain` | Re-crawl after apollo apply |
| x402-list `envelope_captured_at` 2026-08-27 / `economics.stability: 0` | Stale captured envelope; live price is flat `$0.05` / `50000` (`distinct_price_count: 1`) | Unpaid 402 still v1 body + v2 `PAYMENT-REQUIRED`. `maxAmountRequired` and v2 `amount` are the same atomic string. Shop JSON `network` is CAIP-2 `eip155:8453` | `stability: 0` is their historical $0.02→$0.05 step. Do not change prices |
| Fuchss `/ticks` C/55, 91.3% 30d, 5 error + 1 warn | Live **HEAD `/ticks` → 405** `{error: method_not_allowed}` with no `PAYMENT-REQUIRED`. That is the same cascade as their preview `last-probe-failed` + `envelope-noncompliant` + `envelope:http-status-*` + `missing-x402-version` + `no-accepts` (five errors). One warn is almost certainly `shared-payto-wallet` (one payTo, many doors). Receipt/schema also poison paid re-probes | **HEAD `/ticks` → 402** (same wall as GET, empty body, never settles). Receipt + paid-body schema so later paid probes clear those causes. Discovery HEAD 200 so crawlers see llms/OpenAPI | Remaining uptime holes are worker restarts on apply. EU 1223ms is vantage RTT, not a fake-able number. Did not buy their $0.005 report (no shop wallet on this VM) |

## x402-list owner update (Chief, no passwords here)

Domain proof already served: `GET https://ticks.bnm.farm/.well-known/x402list.txt`  
(current token line is already on the live door; a **new** update issues a **new** token that must replace that file).

1. Browser: https://x402-list.com/services/bnm-data-shop/update  
   or API: `POST https://x402-list.com/api/v1/services/bnm-data-shop/request-update`
2. Change description to current well-known count (live `extra.resourceCount` / `resources.length`, 49 on the bsee apply tip). Add missing paths via `endpoints_add` (only doors not already on their 36-row list: `/gain`, `/orr-enforcement`, `/phmsa-orders`, `/aaib-reports`, `/csb-reports`, `/hhs-oig-reports`, `/eis-reports`, `/fsis-humane`, `/epa-cafo`, `/fmshrc-orders`, `/bsee-reports`, plus any later doors on well-known).
3. Publish the returned `ownership_token` as the **only line** of `src/fixtures/x402list.txt` and apply on apollo (72h expiry).
4. `POST /api/v1/services/bnm-data-shop/verify-ownership` with `request_id`. Manual review; email outcome.

`verified`, uptime, and payTo cannot be written through that channel.

## Receipt shape

```json
{"success":true,"transaction":"0x…64 hex…","network":"base","payer":"0x…"}
```

v2 payments use `network: "eip155:8453"`. Same JSON on both header names. No header if settle had no txHash (including `X402_SKIP_SETTLE=1`).
