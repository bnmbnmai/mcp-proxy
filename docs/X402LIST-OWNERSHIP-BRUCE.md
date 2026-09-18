# x402-list ownership update — Bruce only (draft)

**Draft only. Agents must not submit this.**

No outbound email from an agent box. No keys in chat. Do not invent settles. Do not POST `request-update`, publish a token, or call `verify-ownership` unless you are Bruce on the ownership email.

Official flow (x402-list API, 2026-09-18): https://x402-list.com/api — `POST /api/v1/services/:slug/request-update`, publish the one-time token, then `POST …/verify-ownership`. Browser form: https://x402-list.com/services/bnm-data-shop/update.

Listing today (stale): `GET https://x402-list.com/api/v1/services/bnm-data-shop` — `endpoint_count` **36**, description still says “36 paid GETs”, `verified=false`, `base_url` / `website_url` = `https://ticks.bnm.farm`. Live paid count is [https://ticks.bnm.farm/.well-known/x402](https://ticks.bnm.farm/.well-known/x402), not that directory row.

## Who

Bruce only, from the **ownership email** that submitted `bnm-data-shop` (this shop’s recorded contact: `brucemccray@gmail.com`). That email is the cooldown key (one live/approved request per email per service every 7 days). A rejected request does not hold the window.

## Checklist

1. **Request-update from the ownership email.** Either the browser form above or:

   ```
   POST https://x402-list.com/api/v1/services/bnm-data-shop/request-update
   ```

   Required: `email` plus at least one changed field. Empty/omitted fields stay unchanged. Measured fields (uptime, pricing, `pay_to`, verified badge) cannot be written here.

2. **Save the `ownership_token` immediately.** It is returned once in the 201 body and is not stored in clear. 72-hour expiry. If lost: `POST …/reissue-token` with `request_id` + the same email — the replacement arrives **by email only**, never in that response. One re-issue per request.

3. **Publish `/.well-known/x402list.txt` on the currently listed origin** — that is **ticks.bnm.farm**, not `bnm.farm`:

   `https://ticks.bnm.farm/.well-known/x402list.txt`

   Put the token as **its own line** of plain text. Confirm with a free GET before verify.

4. **Verify-ownership** within 72 hours:

   ```
   POST https://x402-list.com/api/v1/services/bnm-data-shop/verify-ownership
   {"request_id":"<the uuid from step 1>"}
   ```

   x402-list re-fetches that well-known file and consumes the token. Then **manual human review**. Outcome email goes to Bruce. `400` = file missing/token not in it; `410` = expired (send a new request).

5. **After review**, re-GET the listing. Description must no longer say “36 paid GETs”. `endpoint_count` should move off 36 once the added doors are accepted. Live count still comes from well-known, not from this file.

## Draft fields (do not hardcode 62)

Suggested `description` (plain text; live count is well-known — do **not** bake “62” as if it were forever):

> Official public-data x402 GETs at ticks.bnm.farm. Live paid GET count is https://ticks.bnm.farm/.well-known/x402 — read that file; do not hardcode a door number. Tables (`/ticks`, `/import-alerts`) $0.05 = the entire current table. Body doors: free search on `/{door}/manifest.json?q=`, then $0.02 for one official text (`GET ?id=`) or $0.05 for a page of 10. USDC on Base.

Why the $0.02 `?id=` sentence is required: the directory currently prices every listed path at $0.05 (`min_price_usd` 0.05) because it probes the path, not `?id=`. The $0.02 one-text SKU is real on every extracted-body door. Say it in the description. Do not invent a second listed endpoint for `?id=`.

Optional, not required: `website_url` = `https://bnm.farm/` (shop lander). Leave `base_url` as `https://ticks.bnm.farm` unless Bruce is deliberately changing identity (always-manual review; slug stays `bnm-data-shop`).

### `endpoints_add` (the 26 live doors x402-list still lacks)

These are live on well-known and missing from the 36-door row. `/ftc-orders` is stocked (`cardCount` 5 as of `2026-09-18T04:40:38.868Z`) — include it.

```
/mariners-d1
/mariners-d5
/mariners-d9
/mariners-d14
/mariners-d17
/ofwat-enforcement
/ofgem-enforcement
/gain
/orr-enforcement
/phmsa-orders
/aaib-reports
/csb-reports
/hhs-oig-reports
/eis-reports
/fsis-humane
/epa-cafo
/fmshrc-orders
/bsee-reports
/oshrc-orders
/epa-alj
/epa-eab
/faa-civil-penalty
/stb-decisions
/oalj-decisions
/fmc-orders
/ftc-orders
```

Max 50 new paths per request. Already-listed paths are ignored. GET is the default method.

## Agents must not

- Submit this request, publish the token, or verify ownership.
- Send email to x402-list or to Bruce “on his behalf”.
- Hardcode 62 in the new description.
- Invent CDP / facilitator settles to make Bazaar index the new doors.
- Revive Apollo Proxy drafts.
