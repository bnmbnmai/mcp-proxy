# GET /eeoc-appellate — EEOC OFS appellate decision text

Official **Equal Employment Opportunity Commission, Office of Federal Sector** appellate and reconsideration text from `eeoc.gov` PDFs. 17 U.S.C. § 105. Same extracted-body pipe as `/nmb-determinations`, `/nlrb-decisions`, `/flra-decisions`, and `/ecab-decisions`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**. Habit `?since=` / ETag is the same pipe. Empty delta is unpaid 304.

**Index:** `https://www.eeoc.gov/federal-sector/appellate-decisions?appellate_keywords=`

**PDFs:** `/sites/default/files/decisions/YYYY_MM_DD/*.pdf` and `/sites/default/files/YYYY-MM/*.pdf`. Prefer Appeal No. / Request No. decisions under 29 C.F.R. Part 1614.

**Do not sell as this SKU:** digest-only pages, EEO-1 data, private-sector charge closures, and Copyright Royalty Board final rate-determination Federal Register wraps. **Not `/flra-decisions`.** **Not `/nlrb-decisions`.** **Not `/nmb-determinations`.** **Not `/ecab-decisions`.**

**Path:** `/eeoc-appellate` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

MCP tools are generated from live well-known (no hardcoded door count). Catalog `main` is not the door host. Branch stacks on the live ticks tip `cursor/nmb-determinations-apply-1be0`.

```bash
EEOC_APPELLATE_DIR=$HOME/projects/mcp-proxy/data/eeoc-appellate \
  npm run collect:eeoc-appellate
```

Dry collect from the checked-in search excerpt and seed texts:

```bash
EEOC_APPELLATE_DIR=/tmp/eeoc-appellate-dry \
  EEOC_APPELLATE_HTML_DIR=src/fixtures/eeoc-appellate \
  npm run collect:eeoc-appellate
```

Scout seeds (always queued first):

- Request 2026002858 — `https://www.eeoc.gov/sites/default/files/decisions/2026_09_08/2026002858.%20DEC.pdf` (August 24, 2026)
- Requests 2026002233 and 2026002234 — `https://www.eeoc.gov/sites/default/files/decisions/2026_09_08/2026002233%3B%202026002234%20DEC.pdf` (August 11, 2026)
- Appeal 2025003976 — `https://www.eeoc.gov/sites/default/files/2026-02/2025003976.pdf` (February 26, 2026)

This repo does not own the bnm.farm lander. Paste on the tv-remote **live tip**, not stub `main`, only after apply. Count hydrates from `GET /eeoc-appellate/manifest.json` (`cardCount`). Do not hardcode a door count or the bag size.
