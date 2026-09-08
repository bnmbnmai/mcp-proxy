# Fatten GET /superfund-rods with Superfund Five-Year Review PDFs

Same live door. No new path. Price stays **$0.05**.

Official EPA Superfund Five-Year Review **report** PDFs from collection **28008** on the same SEMS JSON the ROD table already walks (`https://www3.epa.gov/semsjson/HQ_MasterCollection_11.json`). Catalog JSON is title + Doc ID + PDF URL only — paid GET is the extracted report text.

Skip FYR protectiveness letters, transmittals, and deferral memos. ROD cards stay. Proposed Plans / ESD / ROD amendments stay out.

Habit newest FYR: Cape Fear Wood Preserving 5th FYR (`04-11246061`, signed 2026-09-02).

**Dry-run (this VM):** empty bag **0 → 10** official FYR report bodies (`asOf` **2026-09-02**). Merge onto 5 cached ROD fixtures: **5 → 15** (ROD cards kept). Live shop before apply is **29** ROD cards; apply reuses those and adds FYRs. Bodies are extracted FYR report text (50k–530k chars), not URL stubs.

| id | date | title | site |
|---|---|---|---|
| `04-11246061` | 2026-09-02 | Fifth Five-Year Review | Cape Fear Wood Preserving |
| `03-2517425` | 2026-09-01 | Fourth Five-Year Review | Ryeland Road Arsenic |
| `03-2517424` | 2026-09-01 | Fifth Five-Year Review | Westinghouse Electric (Sharon Plant) |
| `06-100036514` | 2026-08-28 | Sixth Five-Year Review | Arkwood, Inc. |
| `02-765944` | 2026-08-28 | Fifth Five-Year Review | Reynolds Metals Co |

## Apply on apollo / media-box (not a cloud VM)

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/cfpb-superfund-health-bead
git checkout cursor/cfpb-superfund-health-bead
export SUPERFUND_RODS_DIR=$HOME/projects/mcp-proxy/data/superfund-rods
npm run build
SUPERFUND_RODS_LIMIT=24 SUPERFUND_RODS_MAX_FETCH=36 npm run collect:superfund-rods
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** that unit. Merge into the live Superfund cache. Do not replace other doors. Do not add a new well-known URL.

Public unpaid `GET /superfund-rods/manifest.json` reads slim `catalog.json` (no ROD/FYR bodies). First read of a fat bag without catalog writes that sidecar so the Cloudflare edge path stays 200.

`SUPERFUND_FYR=0` turns FYR collect off if needed.

Applied on apollo (2026-09-07): public unpaid manifest **200** / **cardCount 389** (evening ROD bag; catalog sidecar). Unpaid GET **402**. Well-known still **54**. FYR collect **not** run this apply — Cape Fear `04-11246061` is not in the live catalog yet. Next 07:45 / 19:45 Boise Superfund walk can add FYRs onto the same door.

## After apply

- Live `/.well-known/x402` still lists `/superfund-rods` and does **not** add a new door
- Public unpaid manifest is HTTP 200 with real `cardCount` (loopback and edge)
- Free manifest includes FYR ids after a Superfund collect (habit: `04-11246061` Cape Fear, 2026-09-02)
- Unpaid GET stays HTTP 402 at $0.05
- `?id=`, `?since=`, and ETag stay the extracted-body semantics already on this door
