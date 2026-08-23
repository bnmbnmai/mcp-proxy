# ACM boetebesluit / besluit text — x402 door

Official Netherlands ACM **institution/company boetebesluit / besluit TEXT** extracted with `pdftotext` from PDFs on `acm.nl/system/files/documents/`. Does not invent besluit text. Not people. Not the publication-page press teaser. Not jsonapi (403). Not data.overheid.nl. Not named-director / “de heer A/B/C” personal-fine SKUs. Not ICO `/ico-mpn`. Not PHMSA `/phmsa-cop`.

**Prep only. Do not list on well-known / OpenAPI / llms.txt / shop catalog.** Unpaid `GET /acm-besluiten` is HTTP 402.

v1 seeds **5** official company/institution besluit PDFs. Required lead is House of Tickets B.V. / Ticketveiling B.V. (`house-of-tickets-201019`, boete 22 May 2026). Family: SK Company B.V. / Jura Nederland B.V. / bol.com B.V. (`sk-jura-bol-198871`), Bouwhuis / Timmerhuis / Van Gelder (`ommen-gww-196956`), GT Ecom B.V. (`gt-ecom-193961`), Energie Exploitatie De Trip B.V. (`eetrip-191276`). Skip people. Skip press HTML. Skip commitments/consultaties.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /acm-besluiten` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /acm-besluiten/manifest.json` | free | HTTP 200 institution / zaak / date / official PDF URL (no besluit body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.acm.nl/nl/publicaties?type=besluit
- Official PDFs: `https://www.acm.nl/system/files/documents/{file}.pdf`
- Required seed: House of Tickets B.V. — 22 May 2026 — https://www.acm.nl/system/files/documents/boetebesluit-house-of-tickets.pdf
- License: **Dutch government publication**. ACM “Over deze site”: copy and publish unless a work explicitly reserves copyright. Logo reserved — sold body is ACM-authored TEXT only. Face of sold PDFs has no “auteursrecht voorbehouden”.

Free manifest is institution / zaak / date / sourceUrl only. Needles such as `71.420`, `33.027`, `plotters`, `lachende tweede`, `Leiderdorp`, and `ACM/UIT/679013` stay out of unpaid responses.

`data/acm-besluiten/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export ACM_BESLUITEN_DIR=$HOME/projects/mcp-proxy/data/acm-besluiten
ACM_BESLUITEN_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/acm-besluiten ACM_BESLUITEN_LIMIT=5 npm run collect:acm-besluiten
```
