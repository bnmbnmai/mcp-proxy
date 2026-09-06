# Apply leftover USCG LNM districts (D1, D5, D9, D14, D17)

Do **not** apply this from the cloud VM. Do **not** restart `idaho-ticks-x402.service` until CoS applies on apollo. Do **not** touch Redbubble or Dryland.

Same NavCEN weekly-PDF walker as live `/mariners` (D13), `/mariners-d11`, `/mariners-d7`, `/mariners-d8`. New paths are thin `LnmSpec` wrappers (`--district=N`). Official week **35-2026** PDFs were on navcen when collected (asOf **2026-09-02**). Seed counts (notice body stays on disk, not in git):

| Path | District | PDF | noticeCount |
| --- | --- | --- | ---: |
| `/mariners-d1` | D1 / Northeast | `lnm01352026.pdf` | 520 |
| `/mariners-d5` | D5 / Mid-Atlantic | `lnm05352026.pdf` | 901 |
| `/mariners-d9` | D9 / Great Lakes | `lnm09352026.pdf` | 336 |
| `/mariners-d14` | D14 / Pacific | `lnm14352026.pdf` | 118 |
| `/mariners-d17` | D17 / Alaska | `lnm17352026.pdf` | 235 |

Sold unit matches siblings: weekly notice bodies (`week`, `section`, `waterway`, `text`, `sourceUrl`) plus `records[]`. Price **$0.05** / `50000` atomic USDC (page / whole current week). Same `?id=` **$0.02** extra is **not** on sibling mariners doors — keep mariners as `isMarinersSku` (whole week, `wholeSetIfFewer`), not extracted-body. `?since=` / ETag stay on the existing `servePaid` path so leftover doors inherit the sibling peek.

Free `GET /mariners-dN/manifest.json` is count + week + official PDF URL only.

## Live unit

- Checkout: `/home/apollo/projects/mcp-proxy`
- Worker: `idaho-ticks-x402.service` (`node build/ticks-door.js` on `127.0.0.1:4020`)
- Collect cron unchanged (`45 7,19 * * *` TZ=America/Boise). Add env + `door_argv` only.

## Apollo steps (CoS later)

1. Copy this branch's `src/mariners.ts` onto the live ticks tree (replace the four-district walker).
2. Wire `src/ticks-door.ts` the same way D8 was wired:
   - Import `D1_SPEC` / `D5_SPEC` / `D9_SPEC` / `D14_SPEC` / `D17_SPEC` plus `loadMarinersD*` / `loadMarinersD*Manifest` / `MARINERS_D*_PATH` / `MARINERS_D*_MANIFEST_PATH`.
   - Add `"mariners-d1" | "mariners-d5" | "mariners-d9" | "mariners-d14" | "mariners-d17"` to `DoorSku`.
   - Append those five names to `PUBLIC_BAZAAR_SKUS` (after `/mariners-d8`).
   - Extend `isMarinersSku` to include them (this is what keeps `?since=` / ETag / 402 extras on the sibling mariners path).
   - `amountAtomicFor`: `MARINERS_D1_USDC_ATOMIC` … `MARINERS_D17_USDC_ATOMIC`, default `MARINERS_AMOUNT_ATOMIC`.
   - `SKU_COPY`, bazaar examples, `llms.txt` lines, shop `products[]`, OpenAPI paths, and `paidDiscoveryPaths()` — same blocks as D8.
   - Manifest + paid routes:

```ts
if (path === MARINERS_D1_MANIFEST_PATH) {
  sendJson(res, 200, withShopDiscovery(await loadMarinersD1Manifest(), req, port));
  return;
}
if (path === MARINERS_D1_PATH) {
  await servePaid(req, res, port, "mariners-d1", async () => paidMarinersD1Body(await loadMarinersD1()));
  return;
}
```

   Repeat for d5 / d9 / d14 / d17.

3. `src/paid-records.ts`: add `MARINERS_D1_TYPE` … `MARINERS_D17_TYPE` and `paidMarinersD1Body` … `paidMarinersD17Body` as one-line wrappers over the existing `paidNoticeBody` / `normalizeMarinersRecords`. Listing sources:

```
district=1+0&subdistrict=n
district=5+0&subdistrict=n
district=9+0&subdistrict=n
district=14+0&subdistrict=n
district=17+0&subdistrict=n
```

4. `scripts/ticks-collect.sh`:

```bash
export MARINERS_D1_DIR="${MARINERS_D1_DIR:-$MCP/data/mariners-d1}"
export MARINERS_D5_DIR="${MARINERS_D5_DIR:-$MCP/data/mariners-d5}"
export MARINERS_D9_DIR="${MARINERS_D9_DIR:-$MCP/data/mariners-d9}"
export MARINERS_D14_DIR="${MARINERS_D14_DIR:-$MCP/data/mariners-d14}"
export MARINERS_D17_DIR="${MARINERS_D17_DIR:-$MCP/data/mariners-d17}"
```

```bash
door_argv() {
  case "$sku" in
    mariners-d11) printf '%s\n' --district=11 ;;
    mariners-d7) printf '%s\n' --district=7 ;;
    mariners-d8) printf '%s\n' --district=8 ;;
    mariners-d1) printf '%s\n' --district=1 ;;
    mariners-d5) printf '%s\n' --district=5 ;;
    mariners-d9) printf '%s\n' --district=9 ;;
    mariners-d14) printf '%s\n' --district=14 ;;
    mariners-d17) printf '%s\n' --district=17 ;;
  esac
}

door_js() {
  case "$sku" in
    mariners-d11|mariners-d7|mariners-d8|mariners-d1|mariners-d5|mariners-d9|mariners-d14|mariners-d17)
      printf '%s\n' "$MCP/build/mariners.js" ;;
    *) printf '%s\n' "$MCP/build/${sku}.js" ;;
  esac
}
```

5. `npm run build`
6. Seed collect (caches are gitignored):

```
node build/mariners.js --district=1
node build/mariners.js --district=5
node build/mariners.js --district=9
node build/mariners.js --district=14
node build/mariners.js --district=17
```

7. `systemctl --user restart idaho-ticks-x402.service`

## Lander (tv-remote / bnm.farm)

Same card add as D8 (`tv-remote` PR 34). Five new shop cards: path, week, noticeCount, official PDF. Do **not** open a lander PR from this apply. Do **not** touch Redbubble or Dryland.

## Verify after apply

- Unpaid GET on each new path is HTTP 402, `50000` atomic, `extra.name` = USD Coin
- Free `/mariners-dN/manifest.json` has `noticeCount > 0`, week **35-2026** (or newer), no notice `text`
- `/.well-known/x402` lists the five new absolute URLs
- Sibling `/mariners` `/mariners-d11` `/mariners-d7` `/mariners-d8` still 402
- `?since=` / If-None-Match on the new doors behave like the sibling mariners `servePaid` peek (no collect on a plain unpaid 402)

## Not this SKU

- D11 south (no 2026 weekly PDFs)
- D8 rivers
- MSI Download / Light List GeoJSON
- Invented LNM JSON/CSV APIs
