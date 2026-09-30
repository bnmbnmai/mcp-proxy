# GET /ibla-decisions — DOI IBLA precedential decision text

Official **Interior Board of Land Appeals** precedential decision text extracted from OHA PDFs. 17 U.S.C. § 105. Same extracted-body pipe as `/ttab-decisions`, `/eeoc-appellate`, and `/ecab-decisions`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**.

**PDF store:** `https://www.oha.doi.gov/IBLA/Ibladecisions/` (links-only folder). The directory listing returns HTTP 500. The files are `%PDF-1.6`. Collect parses them with `pdftotext -layout` and normalizes form feeds and line-break hyphens.

**Links:** DOI chronological year indexes, newest first. Each row is case name, date decided, and a citation link to the PDF. `asOf` is the newest decision date on the cached cards. Newest decisions on the 2026 index run through June 16, 2026.

**Facets on the free index:** citation, docket, parties, disposition, and date. Decision text stays on the paid body.

**Not this SKU:** IBLA dispositive orders, BSEE accident reports (`/bsee-reports`), EPA EAB orders (`/epa-eab`), and FMSHRC orders (`/fmshrc-orders`).

**Path:** `/ibla-decisions` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

```bash
IBLA_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/ibla-decisions \
  IBLA_DECISIONS_LIMIT=8 IBLA_DECISIONS_MAX_FETCH=8 \
  npm run collect:ibla-decisions
```

Dry fixture collect:

```bash
IBLA_DECISIONS_DIR=/tmp/ibla-decisions-dry \
  IBLA_DECISIONS_LISTING_DIR=src/fixtures/ibla-decisions \
  npm run collect:ibla-decisions
```

Seeds: 201 IBLA 53 Maverick Solar, 201 IBLA 18 Premium Coal, 201 IBLA 1 WildEarth Guardians.

This repo does not own the bnm.farm lander. Paste the card on the tv-remote live tip, not stub `main`. Count hydrates from `GET /ibla-decisions/manifest.json` (`cardCount`). Do not hardcode a door count or the bag size.
