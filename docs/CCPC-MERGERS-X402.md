# CCPC merger determination text — x402 door

Official Ireland CCPC **institution/company section 21 determination TEXT** extracted with `pdftotext` from PDFs on `assets.ccpc.ie/data/docs/default-source/merger-attachments/`. Does not invent determination text. Not people / named-seller SKUs. Not the case-card grid. Not merger-announcement PDFs. Not withdrawn files with no final determination (Elis/OCL M/25/050). Not Sitefinity OData. Not Cludo. Not data.gov.ie. Not Rechtspraak. Not ICO `/ico-mpn`. Not PHMSA `/phmsa-cop`. Not ACM `/acm-besluiten`.

**Prep only. Do not list on well-known / OpenAPI / llms.txt / shop catalog.** Unpaid `GET /ccpc-mergers` is HTTP 402.

v1 seeds **5** official company/institution determination PDFs. Required lead is United Hardware DAC / Ardentia / Kehoe’s Homevalue t/a Dermot Kehoe Supply & DIY (`united-hardware-m26006`, determination 6 Mar 2026). Family: BDO UK Partner Limited / BDO Ireland LLP (`bdo-m26039`), Döhler Finance Management B.V. / Döhler Group SE / Treatt plc (`doehler-treatt-m26035`), Wolseley Group Limited / Cooperstorm Limited / Peter Curran Electric Limited (`wolseley-curran-m26038`), Independent Vetcare Ireland Limited / IVC Evidensia / Acorn Veterinary Clinic Limited (`ivc-acorn-m26033`). Skip people. Skip announcements. Skip withdrawn-no-determination.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /ccpc-mergers` | unpaid → **HTTP 402** | **$0.05** USDC on Base (`50000` atomic) |
| `GET /ccpc-mergers/manifest.json` | free | HTTP 200 institution / M-number / date / official PDF URL (no determination body) |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

## Source of truth

- Listing: https://www.ccpc.ie/enforcement-and-regulation/mergers/find-a-merger-case
- Case cards: `https://www.ccpc.ie/enforcement-and-regulation/mergers/find-a-merger-case/details/{slug}`
- Official PDFs: `https://assets.ccpc.ie/data/docs/default-source/merger-attachments/{year-path}/{file}.pdf`
- Required seed: United Hardware — 6 Mar 2026 — https://assets.ccpc.ie/data/docs/default-source/merger-attachments/m-2026/united-hardware-dermot-kehoe-supply---diy/m-26-006-determination.pdf
- License: **CC-BY 4.0** (Ireland PSI / Open Data Directive). Logos/images/third-party reserved — sold body is CCPC-authored TEXT only.

Free manifest is institution / M-number / date / sourceUrl only. Needles such as `18(1A)`, `Share Purchase Agreement`, `Vertical Relationship`, `40km radius of Kehoe`, and `Associated Hardware/National Hardware` stay out of unpaid responses.

`data/ccpc-mergers/` is gitignored. Live-apply on apollo is out of scope for this branch.

## Apollo collect (5-seed only)

```bash
cd ~/projects/mcp-proxy
export CCPC_MERGERS_DIR=$HOME/projects/mcp-proxy/data/ccpc-mergers
CCPC_MERGERS_JSON_DIR=$HOME/projects/mcp-proxy/src/fixtures/ccpc-mergers CCPC_MERGERS_LIMIT=5 npm run collect:ccpc-mergers
```
