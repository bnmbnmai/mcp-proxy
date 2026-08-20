# Live shop — listed where / still missing

Verified 2026-08-19 from apollo. No self-settle. No family hosts. Ninth door is `/mariners-d8` on purpose. Free manifests are not the paid body.

Live paid doors (all return HTTP 402 unpaid, official bodies when paid):

| Door | Price | Live proof |
|---|---|---|
| `GET https://ticks.bnm.farm/ticks` | $0.02 | Idaho + PNW ticks |
| `GET https://ticks.bnm.farm/import-alerts` | $0.05 | FDA Import Alert / DWPE |
| `GET https://ticks.bnm.farm/mariners` | $0.05 | USCG D13 LNM |
| `GET https://ticks.bnm.farm/mariners-d11` | $0.05 | USCG D11 / Southwest LNM |
| `GET https://ticks.bnm.farm/mariners-d7` | $0.05 | USCG D7 / Southeast LNM |
| `GET https://ticks.bnm.farm/mariners-d8` | $0.05 | USCG D8 / Gulf LNM |
| `GET https://ticks.bnm.farm/warning-letters` | $0.05 | FDA warning-letter HTML |
| `GET https://ticks.bnm.farm/form-483` | $0.05 | OII FOIA 483 PDFs |
| `GET https://ticks.bnm.farm/gmp` | $0.05 | Health Canada Drug GMP report-card observation text + C.02 cites |
| `GET https://ticks.bnm.farm/gmp-md` | $0.05 | Health Canada medical-device report-card observation text + MDR cites |
| `GET https://ticks.bnm.farm/swisspar` | $0.05 | Swissmedic first-authorisation SwissPAR evaluation text |
| `GET https://ticks.bnm.farm/pcac` | $0.05 | FDA PCAC 503A briefing-memo evaluation text |
| `GET https://ticks.bnm.farm/ftc-wl` | $0.05 | FTC BCP warning-letter PDF text |
| `GET https://ticks.bnm.farm/cfpb-orders` | $0.05 | CFPB consent-order / administrative-order PDF text |
| `GET https://ticks.bnm.farm/occ-cd` | $0.05 | OCC institution C&D / consent-order PDF text |
| `GET https://ticks.bnm.farm/fdic-orders` | $0.05 | FDIC institution consent-order / C&D PDF text |
| `GET https://ticks.bnm.farm/frb-orders` | $0.05 | FRB institution C&D / written-agreement / PCA PDF text |
| `GET https://ticks.bnm.farm/ncua-orders` | $0.05 | NCUA institution consent C&D HTML text |
| `GET https://ticks.bnm.farm/fincen-orders` | $0.05 | FinCEN institution consent-order PDF text |
| `GET https://ticks.bnm.farm/ferc-orders` | $0.05 | FERC institution stipulation-and-consent / show-cause / civil-penalty PDF text |

CDP `POST /platform/v2/x402/validate` for each URL: `valid: true`, `simulation.outcome: accepted`.

## Listed

| Catalog | URL | Status |
|---|---|---|
| Shop well-known | https://ticks.bnm.farm/.well-known/x402 | Nine absolute paid URLs |
| OpenAPI | https://ticks.bnm.farm/openapi.json | Nine paid paths + `x-payment-info` |
| llms.txt | https://ticks.bnm.farm/llms.txt | Nine paid GETs; free manifests called out as not the body |
| Shop JSON | https://ticks.bnm.farm/ | Nine products |
| x402scan origin | https://www.x402scan.com/server/c6f584c5-e494-41d1-aa02-2efb07ac3546 | Registered earlier: `/ticks`, `/import-alerts`, `/mariners`, `/warning-letters`, `/form-483`. `/mariners-d11`, `/mariners-d7`, and `/mariners-d8` are live on the shop well-known. |
| x402scan register | https://www.x402scan.com/resources/register | Public add form (REST register is SIWX-gated) |
| CDP validate | `POST https://api.cdp.coinbase.com/platform/v2/x402/validate` | All five accepted |

x402scan resource ids (same origin `c6f584c5-e494-41d1-aa02-2efb07ac3546`):

- ticks `26edc2ab-1aff-43a2-80fe-0226f493460e`
- import-alerts `374f6149-3f8c-4eb3-afb6-5e740f7098c6`
- mariners `7b0065cf-c92f-41da-a07c-05dcb8536939`
- warning-letters `8cec736b-e603-4012-84e7-d31e0932af81`
- form-483 `a0e89d6f-2c03-4205-9ff4-5f72402e48d6`

## Still missing

| Catalog | Status |
|---|---|
| **CDP / Chainlink-for-Agents Bazaar** | `GET /v2/x402/discovery/merchant?payTo=0xf59621FC406D266e18f314Ae18eF0a33b8401004` → `resources: []`. Search for `ticks.bnm.farm` → empty. Indexing needs a **settled** CDP facilitator payment with `paymentPayload.resource` + `extensions.bazaar`. Do not self-settle from this VM. |
| Circle Agents services | `GET https://api.circle.com/v2/x402/discovery/resources?payTo=0xf596…` → `total: 0` |
| agent402.tools search | `GET https://agent402.tools/api/find?q=ticks.bnm.farm` → `count: 0`. Origin register returned `listed: true` but search does not surface the five doors. |
| x402scan REST `/api/x402/registry/register` | HTTP 402 SIWX — website form / public tRPC `public.resources.register` is what listed them |

## Harden in this branch (needs media-box pull + restart)

Live 402 **header** already has `extensions.bazaar`. Live 402 **JSON body** did not (v1 crawlers miss it). Live well-known lacked `ownershipProofs` (OpenAPI already has them). This branch:

- Echoes `extensions.bazaar` on the 402 JSON body
- Adds `ownershipProofs` + the x402scan server URL on `/.well-known/x402` and `llms.txt`
- Puts the SKU description on the v2 `accepts[]` entry (x402scan stored `description: ""`)

Pull `cursor/list-live-doors-6dfc` on apollo and restart `idaho-ticks-x402`. Do not wrap free JSON as paid. Family / basic-auth stay off `ticks.bnm.farm`.
