# BKartA Entscheidung text — x402 door

Official Germany Bundeskartellamt **institution/company Entscheidung / Beschluss TEXT** extracted with `pdftotext` from PDFs on `bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/`. Does not invent Entscheidung text. Not people-fine SKUs. Not Fallbericht. Not the Entscheidungsdatenbank card. Not DE/EN press teasers. Not govdata.de. Not GOV.UK. Not ICO `/ico-mpn`. Not PHMSA `/phmsa-cop`. Not ACM `/acm-besluiten`. Not CCPC `/ccpc-mergers`.

**Prep only. Do not list on well-known / OpenAPI / llms.txt / shop catalog.** Unpaid `GET /bkarta-entscheidungen` is HTTP 402.

v1 seeds **5** official company/institution Entscheidung PDFs. Required lead is Amazon.com, Inc. / Amazon EU S.à r.l. (`amazon-b2-73-20`, Verfügung 4 Feb 2026). Family: Check24 GmbH (`check24-b8-40-25`), STRABAG AG / Gebr. Stumpp GmbH & Co. KG (`strabag-stumpp-b1-112-25`), Tönnies International Management GmbH / Vion GmbH / Vion Beef B.V. (`toennies-vion-b4-100-24`), Telekom Deutschland GmbH / EWE Aktiengesellschaft (`ewe-telekom-gfnw-v-37-25`). Skip people-fine. Skip Fallbericht. Skip press HTML.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /bkarta-entscheidungen` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /bkarta-entscheidungen/manifest.json` | free | HTTP 200 institution / Az / date / official PDF URL (no Entscheidung body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.bundeskartellamt.de/DE/Entscheidungen/entscheidungen_node.html
- Official PDFs: `https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/{Missbrauchsaufsicht|Fusionskontrolle|Kartellverbot}/[{year}/]{Az}.pdf`
- Required seed: Amazon — 4 Feb 2026 — https://www.bundeskartellamt.de/SharedDocs/Entscheidung/DE/Entscheidungen/Missbrauchsaufsicht/B2-73-20.pdf?__blob=publicationFile&v=3
- License: **§ 5 Abs. 1 UrhG**. Amtliche Entscheidungen have no copyright. Logo reserved — sold body is BKartA-authored TEXT only.

Free manifest is institution / Az / date / sourceUrl only. Needles such as `Price Error Prevention`, `PEP` mechanics, `Atypical Pricing`, `AP-FOD`, and `SC-FOD` stay out of unpaid responses. Press teaser `59 Mio.` / `§ 19a` is not the sold body.

`data/bkarta-entscheidungen/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export BKARTA_ENTSCHEIDUNGEN_DIR=$HOME/projects/mcp-proxy/data/bkarta-entscheidungen
BKARTA_ENTSCHEIDUNGEN_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/bkarta-entscheidungen BKARTA_ENTSCHEIDUNGEN_LIMIT=5 npm run collect:bkarta-entscheidungen
```
