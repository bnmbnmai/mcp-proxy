# PHMSA-authored pipeline enforcement text — x402 door

Official **PHMSA pipeline enforcement-order TEXT** extracted from public PDFs on `primis.phmsa.dot.gov/enforcement-documents/{CPF}/` (NOPV / Notice of Probable Violation, Final Order, Corrective Action Order / CAO, and similar PHMSA-written orders). US federal public domain (**17 U.S.C. § 105**). Does not invent order text. Skip operator-response / operator-reply letters. Skip the killed PHMSA incident NARRATIVE zip. Does not wrap the primis TSV (~53-col metadata, dates/penalties only; findings live in the PDFs). Distinct from `/ferc-orders`.

**Scope lock:** PHMSA-written enforcement PDFs only (NOPV / Notice of Probable Violation, Final Order, Corrective Action Order / CAO, and similar PHMSA-authored orders). First slice is six recent official texts including the seed **4-2026-012-NOPV Final Order** (~9 pp) and the 2026-08-03 Amoco CAO. Keyed on CPF (`4-2026-012-nopv`, `3-2026-023-cao`, …). Not `/ferc-orders`. Not the primis spreadsheet.

Public catalog (`SHOP-INDEX.md` / README) lists this door. MCP tools stay generated from live well-known (do not hardcode a door count). Live ticks.bnm.farm already lists `/phmsa-orders` (well-known, OpenAPI, MCP, unpaid 402). This PR is the mcp-proxy collect + bundled first-slice cache. It does **not** SSH to apollo and does **not** replace the live harvest. Daily grow is the later apollo `7:45 ticks-collect.sh` delta pass.

## Lander card copy (product + bag size + price only)

| Field | Value |
| --- | --- |
| Product | PHMSA pipeline enforcement-order text |
| Bag | Newest 10 official texts |
| Price | `$0.02` / `$0.05` |

This repo does **not** own the bnm.farm lander card. tv-remote follow-up: add a `/phmsa-orders` card there after apply. Do not put first-slice counts, CPF lists, or habit-calendar notes on the lander card.

## Paths

| Path | Auth | Price |
|---|---|---|
| `GET /phmsa-orders` | unpaid → **HTTP 402** | default newest 10 **$0.05** (`50000` atomic); `?id=` one official text **$0.02** (`20000` atomic) |
| `GET /phmsa-orders/manifest.json` | free | HTTP 200 institution / CPF / date / official PDF URL (no order body). `?q=` search names the id to buy. |

Receive USDC on Base at **`0xf59621FC406D266e18f314Ae18eF0a33b8401004`**.

Older pages are another **$0.05** on the same URL (`page` / `before`). If the catalog has fewer than 10, the nickel GET is the whole current set.

## Source of truth

- Official hub (not sold): https://primis.phmsa.dot.gov/enforcement-documents/
- Official PDFs: `https://primis.phmsa.dot.gov/enforcement-documents/{CPF}/`
- Primis TSV (not sold; leak-test 2026-08-04): dates/penalties only
- First-slice official PDFs:
  - 3-2026-023-CAO Corrective Action Order — Amoco Oil Company — 2026-08-03
  - 3-2026-020-CAO Corrective Action Order — Gulf South Pipeline Company, LLC — 2026-05-16
  - 4-2026-012-NOPV Final Order — Canyon Crossing LLC / Navigator Panhandle Holdco LLC — 2026-04-07 (~9 pp)
  - 4-2026-004-NOPV Final Order — Valero Partners Operating Co., LLC — 2026-04-01
  - 4-2025-049-NOPV Final Order — Energy Transfer Company — 2026-03-26
  - 4-2026-005-CAO Corrective Action Order — Enterprise Products Operating, LLC — 2026-02-17
- License: **17 U.S.C. § 105**. Attribution: Pipeline and Hazardous Materials Safety Administration (PHMSA), U.S. Department of Transportation. U.S. government work.

Paid body keeps `cards[]` fields. Alongside those keys the paid JSON adds `records[]` (`id`, `date`, `firm`, `url`, `type=phmsa-orders`), `recordCount`, honest `asOf` / `fetchedAt`, and `source` (the official enforcement-documents hub). A repeat buyer diffs `asOf` + record ids.

Free manifest is id / docket / institution / date / kind / sourceUrl only. Order needles such as Amoco `Rouge Pipeline` / seed `$62,900` / Gulf South `Choudrant` stay out of unpaid 402 responses.

`data/phmsa-orders/` is gitignored. The repo ships a bundled seed at `src/fixtures/phmsa-orders/seed-snapshot.json` (6 official texts) used when `PHMSA_ORDERS_DIR` is unset. Checked-in free index: `phmsa-orders/manifest.json`.

## Leak-test (already passed)

- Primis TSV (~53-col metadata, ~1.97 MB, as-of 2026-08-04) is dates/penalties only — do **not** wrap or sell that spreadsheet. Findings live in the PDFs.
- Official 4-2026-012-NOPV Final Order PDF: **9 pp**.
- Operator-response / operator-reply letters are skipped.
- Killed PHMSA incident NARRATIVE zip is skipped.
- 17 U.S.C. § 105. Ship is allowed.

## Apply

Build + restart **only** `idaho-ticks-x402.service` from the host that owns apollo. This PR does **not** apply on apollo and does **not** restart that unit from the cloud VM. Do not SSH from this job. Daily grow is the later apollo `7:45 ticks-collect.sh` delta pass — this listing does not replace collect cron.

```bash
cd ~/projects/mcp-proxy
export PHMSA_ORDERS_DIR=$HOME/projects/mcp-proxy/data/phmsa-orders
mkdir -p "$PHMSA_ORDERS_DIR"
# optional: copy the bundled seed if you want a writable cache
# cp src/fixtures/phmsa-orders/seed-snapshot.json "$PHMSA_ORDERS_DIR/snapshot.json"
npm run build
# sudo systemctl restart idaho-ticks-x402.service   # not this PR
```

Worker apply must: mount `loadPhmsaOrders` / `loadPhmsaOrdersManifest` on `GET /phmsa-orders` (HTTP 402 unpaid) and `GET /phmsa-orders/manifest.json` (HTTP 200), add `/phmsa-orders` to live `/.well-known/x402`, and regenerate live OpenAPI / MCP from that well-known (do not hardcode a door count).

Collector (later growth; first slice stays thin — do not recrawl a fat archive):

```bash
export PHMSA_ORDERS_DIR=$HOME/projects/mcp-proxy/data/phmsa-orders
PHMSA_ORDERS_LIMIT=6 PHMSA_ORDERS_MAX_FETCH=6 npm run collect:phmsa-orders
```
