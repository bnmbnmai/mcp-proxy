# Apply leftover USCG LNM districts (D1, D5, D9, D14, D17)

Do **not** apply this from the cloud VM. Do **not** restart `idaho-ticks-x402.service` until CoS applies on apollo after the 19:45 America/Boise collect. Do **not** SSH to apollo. Do **not** touch Superfund, Redbubble, or Dryland. Do **not** merge to `main`.

Restacked on the live ticks tip (`cursor/apply-vet402-receipt-e6e8`, serving SHA `ada70dc`, paperwork tip `1db2c00`). Live well-known is **49** doors including `/bsee-reports`. `/mariners` already exists (402 / free manifest 200). This PR fattens leftover sibling districts onto that tip so an apollo apply can merge locally later.

Same NavCEN weekly-PDF walker as live `/mariners` (D13), `/mariners-d11`, `/mariners-d7`, `/mariners-d8`. Leftover paths are thin `LnmSpec` wrappers (`--district=N`) already wired in `ticks-door.ts` / `paid-records.ts` / `ticks-collect.sh` on this branch. Official week **35-2026** PDFs were on navcen when collected (asOf **2026-09-02**). Seed counts (notice body stays on disk, not in git):

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
- Collect cron unchanged (`45 7,19 * * *` TZ=America/Boise). Leftover `MARINERS_D*_DIR` + `door_argv` are already on this branch.

## Apollo steps (CoS later)

Door wiring is already on this restack branch (`ticks-door.ts`, `paid-records.ts`, `ticks-collect.sh`). Apollo apply is a local merge of this tip, then collect + restart. Do not invent a second walker. Do not touch Superfund.

1. Merge this branch onto the live checkout (`cursor/apply-vet402-receipt-e6e8` / serving `ada70dc`).
2. `npm run build`
3. Seed collect (caches are gitignored):

```
node build/mariners.js --district=1
node build/mariners.js --district=5
node build/mariners.js --district=9
node build/mariners.js --district=14
node build/mariners.js --district=17
```

4. `systemctl --user restart idaho-ticks-x402.service`

Applied on apollo (2026-09-07, after the 19:45 America/Boise collect finished at **22:07:49 MDT**): **serving SHA `787ae06`** (apply-record [PR 207](https://github.com/bnmbnmai/mcp-proxy/pull/207)) (FF merge of PR 206 onto `cursor/apply-vet402-receipt-e6e8` @ `1db2c00`). `idaho-ticks-x402.service` loaded that tree at **2026-09-07 22:23:28 MDT** (PID 1329475). Restarted only that unit; docker-gw untouched. Leftover collect wrote week **35-2026** bags: `/mariners-d1` **520**, `/mariners-d5` **901**, `/mariners-d9` **336**, `/mariners-d14` **118**, `/mariners-d17` **235** (asOf **2026-09-02**). Unpaid GET on each new path is **402** at $0.05 / `50000` atomic, `extra.name` = USD Coin. Free manifests 200 with those noticeCounts and no notice body. `/.well-known/x402` lists all five among **54** doors. Banner `mcp /mcp — 54 tools`. Sibling mariners doors still 402. Superfund FYR was not applied (public manifest still 502). No new collect cron. No lander PR from this apply.

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
