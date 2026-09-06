# Fatten GET /superfund-rods with Superfund Five-Year Review PDFs

Same live door. No new path. Price stays **$0.05**.

Official EPA Superfund Five-Year Review **report** PDFs from collection **28008** on the same SEMS JSON the ROD table already walks (`https://www3.epa.gov/semsjson/HQ_MasterCollection_11.json`). Catalog JSON is title + Doc ID + PDF URL only — paid GET is the extracted report text.

Skip FYR protectiveness letters, transmittals, and deferral memos. ROD cards stay. Proposed Plans / ESD / ROD amendments stay out.

Habit newest FYR: Cape Fear Wood Preserving 5th FYR (`04-11246061`, signed 2026-09-02).

## Apply on apollo (Chief; not this VM)

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/fatten-superfund-fyr-8ec7
git checkout cursor/fatten-superfund-fyr-8ec7
export SUPERFUND_RODS_DIR=$HOME/projects/mcp-proxy/data/superfund-rods
npm run build
SUPERFUND_RODS_LIMIT=24 SUPERFUND_RODS_MAX_FETCH=36 npm run collect:superfund-rods
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** that unit. Merge into the live Superfund cache. Do not replace other doors. Do not add a new well-known URL.

`SUPERFUND_FYR=0` turns FYR collect off if needed.

## After apply

- Live `/.well-known/x402` still lists `/superfund-rods` and does **not** add a new door
- Free manifest includes FYR ids (habit: `04-11246061` Cape Fear, 2026-09-02)
- Unpaid GET stays HTTP 402 at $0.05
- `?id=`, `?since=`, and ETag stay the extracted-body semantics already on this door
