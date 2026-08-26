# Ofsted inspection report text — x402 door

Official **Ofsted school / provider inspection-report TEXT** extracted from public PDFs on `files.ofsted.gov.uk` (`/v1/file/{id}`). Official public UK government documents (**OGL v3.0**). Does not invent report text. Does not sell the free `reports.ofsted.gov.uk` HTML index or the grades-only report-card banner (those are index-only: provider / URN / date / PDF URL, no report body).

**Scope lock:** Official public Ofsted inspection reports only. Keyed on official **file / report id + URN / provider**. Not a people dump: no pupil detail, not keyed on inspector or pupil names. Not childminder / registered-person pages. Not academy-conversion notices. Not NPDES / CDER / EMA / ICO.

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /ofsted-inspections` is HTTP 402. MCP at `/mcp` generates an `ofsted-inspections` tool from live well-known (do not hardcode a door count).

v1 seeds **16** official inspection-report PDFs. Required seed is **Abberley Parochial VC Primary School** (URN 116780, file 50276206, published 06 May 2025). Also seeds Hetton Lyons (new report-card PDF) and recent independent-school inspection PDFs. Skip academy-conversion notices, childminder people pages, grades-only JSON, and report-card HTML banners.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /ofsted-inspections` | unpaid → **HTTP 402** | default newest 10 **$0.05** (`50000` atomic); `?id=` one official text **$0.02** (`20000` atomic) |
| `GET /ofsted-inspections/manifest.json` | free | HTTP 200 provider / URN / date / official PDF URL (no report body). `?q=` search names the id to buy. |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

Older pages are another **$0.05** on the same URL (`page` / `before`). If the catalog has fewer than 10, the nickel GET is the whole current set.

## Source of truth

- Official index (not sold): https://reports.ofsted.gov.uk/
- Official provider page (index-only): `https://reports.ofsted.gov.uk/provider/{type}/{urn}`
- Official inspection PDFs: `https://files.ofsted.gov.uk/v1/file/{id}`
- Required seed: Abberley Parochial VC Primary School — URN 116780 — file 50276206 — published 06 May 2025 — https://files.ofsted.gov.uk/v1/file/50276206
- License: **OGL v3.0**. Attribution: Ofsted. Contains public sector information licensed under the Open Government Licence v3.0. Logos reserved.

Paid body keeps `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=ofsted-inspections`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official Ofsted reports index). A repeat buyer diffs `asOf` + record ids.

Free manifest is id / urn / provider / date / sourceUrl only. Report needles such as Abberley “What is it like to attend this school” stay out of unpaid 402 responses.

`data/ofsted-inspections/` is gitignored. The repo ships a bundled seed at `src/fixtures/ofsted-inspections/seed-snapshot.json` (16 official texts) used when `OFSTED_INSPECTIONS_DIR` is unset.

This repo does **not** own the bnm.farm lander card. tv-remote follow-up: add a `/ofsted-inspections` card there after apply.

## Apollo apply

Build + restart **only** `idaho-ticks-x402.service`. Do not touch hay data files.

```bash
cd ~/projects/mcp-proxy
# optional on-disk cache; omit OFSTED_INSPECTIONS_DIR to use the bundled 16-card seed
export OFSTED_INSPECTIONS_DIR=$HOME/projects/mcp-proxy/data/ofsted-inspections
mkdir -p "$OFSTED_INSPECTIONS_DIR"
# first apply: copy the bundled seed if you want a writable cache
# cp src/fixtures/ofsted-inspections/seed-snapshot.json "$OFSTED_INSPECTIONS_DIR/snapshot.json"
npm run build
sudo systemctl restart idaho-ticks-x402.service
```

Collector (later growth; not required for v1):

```bash
export OFSTED_INSPECTIONS_DIR=$HOME/projects/mcp-proxy/data/ofsted-inspections
OFSTED_INSPECTIONS_LIMIT=16 npm run collect:ofsted-inspections
```
