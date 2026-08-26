# FDA CDER Integrated Review text — x402 door

Official **FDA CDER drug-approval Integrated Review TEXT** extracted from public PDFs on `www.accessdata.fda.gov` Drugs@FDA (`/drugsatfda_docs/nda/…IntegratedR.pdf`). Official public US federal documents (**17 USC 105**). Does not invent review text. Does not sell the free Drugs@FDA TOC or the openFDA `application_docs` index (those are index-only: id / url / date / type, no review body).

Always listed on well-known / OpenAPI / llms.txt / shop catalog. Unpaid `GET /cder-reviews` is HTTP 402. MCP at `/mcp` generates a `cder-reviews` tool from live well-known (do not hardcode a door count).

v1 seeds **16** official Integrated Review PDFs. Required seed is **Rezdiffra** (NDA 217785, approved 2024-03-14). Also seeds Journavx and Blujepa. Skip approval-letter teasers, labels, CBER-only SBRAs, people files, SwissPAR, EMA referrals, warning letters, and Form 483.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /cder-reviews` | unpaid → **HTTP 402** | default newest 10 **$0.05** (`50000` atomic); `?id=` one official text **$0.02** (`20000` atomic) |
| `GET /cder-reviews/manifest.json` | free | HTTP 200 name / date / application / official PDF URL (no review body). `?q=` search names the id to buy. |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

Older pages are another **$0.05** on the same URL (`page` / `before`). If the catalog has fewer than 10, the nickel GET is the whole current set.

## Source of truth

- Official index (not sold): https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm
- Review-package TOC (JS, `integratedR: 1` + `pdfBaseName`): `https://www.accessdata.fda.gov/drugsatfda_docs/nda/{year}/{pdfBaseName}TOC.html`
- Official Integrated Review PDFs: `https://www.accessdata.fda.gov/drugsatfda_docs/nda/{year}/{pdfBaseName}IntegratedR.pdf`
- Required seed: Rezdiffra — NDA 217785 — 14 Mar 2024 — https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217785Orig1s000IntegratedR.pdf
- License: **17 USC 105** (US federal government work)

Paid body keeps `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=cder-reviews`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official Drugs@FDA index). A repeat buyer diffs `asOf` + record ids.

Free manifest is id / name / date / application / sourceUrl only. Review needles such as Rezdiffra `resmetirom` stay out of unpaid responses.

`data/cder-reviews/` is gitignored. The repo ships a bundled seed at `src/fixtures/cder-reviews/seed-snapshot.json` (16 official texts) used when `CDER_REVIEWS_DIR` is unset.

This repo does **not** own the bnm.farm lander card. tv-remote follow-up: add a `/cder-reviews` card there after apply.

## Apollo apply

Build + restart **only** `idaho-ticks-x402.service`. Do not touch hay data files.

```bash
cd ~/projects/mcp-proxy
# optional on-disk cache; omit CDER_REVIEWS_DIR to use the bundled 16-card seed
export CDER_REVIEWS_DIR=$HOME/projects/mcp-proxy/data/cder-reviews
mkdir -p "$CDER_REVIEWS_DIR"
# first apply: copy the bundled seed if you want a writable cache
# cp src/fixtures/cder-reviews/seed-snapshot.json "$CDER_REVIEWS_DIR/snapshot.json"
npm run build
sudo systemctl restart idaho-ticks-x402.service
```

Collector (later growth; not required for v1):

```bash
export CDER_REVIEWS_DIR=$HOME/projects/mcp-proxy/data/cder-reviews
CDER_REVIEWS_LIMIT=16 npm run collect:cder-reviews
```
