# Fatten GET /superfund-rods with Superfund Five-Year Review PDFs

Same live door. No new path. Price stays **$0.05**.

Official EPA Superfund Five-Year Review **report** PDFs from collection **28008** on the same SEMS JSON the ROD table already walks (`https://www3.epa.gov/semsjson/HQ_MasterCollection_11.json`). Catalog JSON is title + Doc ID + PDF URL (plus institution / date) — paid GET is the extracted report text.

Skip FYR protectiveness letters, transmittals, and deferral memos. ROD cards stay. Proposed Plans / ESD / ROD amendments stay out.

Habit newest FYR: Cape Fear Wood Preserving 5th FYR (`04-11246061`, signed 2026-09-02).

**Collector (already on the live tip via PR 208):** `FYR_COLLECTION_ID = "28008"`, `SUPERFUND_FYR` defaults on. Dry-run on the original PR 199 VM: empty bag **0 → 10** official FYR report bodies (`asOf` **2026-09-02**). Merge onto 5 cached ROD fixtures: **5 → 15**.

| id | date | title | site |
|---|---|---|---|
| `04-11246061` | 2026-09-02 | Fifth Five-Year Review | Cape Fear Wood Preserving |
| `03-2517425` | 2026-09-01 | Fourth Five-Year Review | Ryeland Road Arsenic |
| `03-2517424` | 2026-09-01 | Fifth Five-Year Review | Westinghouse Electric (Sharon Plant) |
| `06-100036514` | 2026-08-28 | Sixth Five-Year Review | Arkwood, Inc. |
| `02-765944` | 2026-08-28 | Fifth Five-Year Review | Reynolds Metals Co |

**Live shop (2026-09-08):** public unpaid manifest **200** / **cardCount 413** / fetchedAt **2026-09-08T18:27:29.933Z**. Cape Fear `04-11246061` and the other habit FYR ids are already in that bag. PR 199 stayed stale on `cursor/fmshrc-orders-door-e154`; this restack sits on the current live tip so catalog `title` and shop-index copy match the collector.

`SUPERFUND_FYR=0` turns FYR collect off if needed.

## Apply on apollo / media-box (not a cloud VM)

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/restack-superfund-fyr-d94f
git checkout cursor/restack-superfund-fyr-d94f
npm run build
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** that unit. Do not replace other doors. Do not add a new well-known URL. Do not run collect from a cloud VM — the next 07:45 / 19:45 Boise Superfund walk keeps growing the same bag. First unpaid manifest after apply rebuilds slim `catalog.json` from the fat bag (bodies stripped) so title lands without a 502.

Applied on apollo (2026-09-08): **serving SHA `16cecab`** (apply-record [PR 212](https://github.com/bnmbnmai/mcp-proxy/pull/212); FF of [PR 211](https://github.com/bnmbnmai/mcp-proxy/pull/211)). Restarted **only** `idaho-ticks-x402.service` at **2026-09-08 13:17:59 MDT** (PID 122615). Public unpaid manifest **200** / **cardCount 413** / **413 titled** / fetchedAt **2026-09-08T18:27:29.933Z**. Cape Fear `04-11246061` title **Fifth Five-Year Review**. Unpaid GET **402**. Well-known still **54**. Stale PR 199 not applied. Collect not run.

## After apply

- Live `/.well-known/x402` still lists `/superfund-rods` and does **not** add a new door
- Public unpaid manifest is HTTP 200 with real `cardCount` (loopback and edge)
- Free catalog cards include `title` (habit: `Fifth Five-Year Review` on `04-11246061`)
- Unpaid GET stays HTTP 402 at $0.05
- `?id=`, `?since=`, and ETag stay the extracted-body semantics already on this door
