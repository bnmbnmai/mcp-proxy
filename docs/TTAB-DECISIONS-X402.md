# GET /ttab-decisions — USPTO TTAB reading-room decision text

Official **Trademark Trial and Appeal Board** decision text extracted from reading-room PDFs. 17 U.S.C. § 105. Same extracted-body pipe as `/nlrb-decisions`, `/flra-decisions`, `/ecab-decisions`, and `/eeoc-appellate`: free manifest, `?id=` one official text at **$0.02**, plain GET newest 10 at **$0.05**.

**List:** `POST https://ttab-reading-room.uspto.gov/ttab-efoia-api/decision/search` (metadata only).

**PDF:** `GET https://ttab-reading-room.uspto.gov/cms/rest` + `documentId`.

**asOf** is the newest `issueDateStr` on the cached cards. The reading-room index lags the mail date.

**Facets on the free index:** parties (public case caption), mark, proceeding type, outcome, precedential, grounds (likelihood of confusion, descriptiveness, and the reading-room issue codes).

**Not this SKU:** TTABVUE docket events, USPTO Open Data Portal TTAB proceeding XML (event text, not the opinion), and PTAB decisions (USPTO Open Data Portal already serves those as JSON with PDF links). Party names stay on the case caption. This door does not build a people export.

**Path:** `/ttab-decisions` · **$0.05** page (`50000`) / **$0.02** `?id=` (`20000`) · payTo `0xf59621FC406D266e18f314Ae18eF0a33b8401004` · USDC on Base

```bash
TTAB_DECISIONS_DIR=$HOME/projects/mcp-proxy/data/ttab-decisions \
  npm run collect:ttab-decisions
```

Dry fixture collect:

```bash
TTAB_DECISIONS_DIR=/tmp/ttab-decisions-dry \
  TTAB_DECISIONS_LISTING_DIR=src/fixtures/ttab-decisions \
  npm run collect:ttab-decisions
```

Seeds: Cancellation 92081421 DERMALIZE, Opposition 91272167 BIRTH JUSTICE (precedential), Serial 97811850 Rivers IP Holdings, Serial 98651023 MAP Elite.

This repo does not own the bnm.farm lander. Paste the card on the tv-remote live tip, not stub `main`. Count hydrates from `GET /ttab-decisions/manifest.json` (`cardCount`). Do not hardcode a door count or the bag size.
