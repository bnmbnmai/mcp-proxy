# USDA AMS NOP Administrator Decision / Final Notice text — x402 door

Official USDA AMS **NOP Administrator Decision / Final Notice of Suspension or Revocation TEXT** extracted with `pdftotext` from PDFs on `ams.usda.gov/sites/default/files/media/`. Does not invent decision text. Company/institution operations only. Not people. Not settlements HTML. Not the Organic Integrity Database status directory. Not `/awa`. Not `/fsis-hmsa`. Not `/doe-nov`. Not a stub.

**Prep only. Do not list on well-known / OpenAPI / llms.txt / shop catalog.** Unpaid `GET /nop-ad` is HTTP 402.

v1 seeds **5** official 2024–2026 company/institution Administrator Decisions. Required lead is Mapeks USA, LLC dba Mac Global, APL-014-25 / 049-25, listed 30 Jul 2026 (`mapeks-apl-014-25`). Family: Fruticola Olmos E.I.R.L. APL-040-24 (`fruticola-olmos-apl-040-24`), Invernaderos Hidroponicos La Bonita SAPI de CV APL-047-24 (`la-bonita-apl-047-24`), Buck N Bird Farm APL-066-24 (`buck-n-bird-apl-066-24`), Sunshine Farms of Martin County LLC APL-090-24 (`sunshine-farms-apl-090-24`). Skip people. Skip settlements HTML. Skip OID.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /nop-ad` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /nop-ad/manifest.json` | free | HTTP 200 company / APL / date / official PDF URL (no body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing (date + name + href only): https://www.ams.usda.gov/services/enforcement/organic/ams-decisions
- Official PDFs: `https://www.ams.usda.gov/sites/default/files/media/{file}.pdf`
- Required seed: Mapeks USA, LLC — APL-014-25 / 049-25, listed 30 Jul 2026 — https://www.ams.usda.gov/sites/default/files/media/Decision_APL-014-25%20and%20049-25%20Mapeks%20USA_Redacted.pdf
- License: **17 U.S.C. § 105 + AMS public-information notice** (https://www.ams.usda.gov/about-ams/privacy — “Information presented on the AMS web site is considered public information and may be distributed or copied”). No NC / no-sell.

Free manifest is company / APL / date / sourceUrl only. Sold-body needles such as `diced peaches`, `knowingly relabeled`, and `205.400` stay out of unpaid responses. The card may show Mapeks / APL-014-25 — that is the index, not the sold body.

`data/nop-ad/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export NOP_AD_DIR=$HOME/projects/mcp-proxy/data/nop-ad
NOP_AD_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/nop-ad NOP_AD_LIMIT=5 npm run collect:nop-ad
```
