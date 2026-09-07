# Fatten GET /hhs-oig-reports with VA OIG PDFs

Same live door. No 49th path. Price stays **$0.05**.

Official VA OIG audit / healthcare-facility inspection / mental-health inspection / review PDFs from `https://www.vaoig.gov/reports/all` (list HTML; `/jsonapi` 404s). Body is the official PDF. Merge into the existing HHS OIG ugly-PDF bag.

Skip VA dashboards, major-management-challenges, highlights, and people dumps. HHS OAS / OEI / A-* cards stay.

## Apply on apollo (Chief; not this VM)

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/fatten-va-oig-reports-f05f
git checkout cursor/fatten-va-oig-reports-f05f
export HHS_OIG_REPORTS_DIR=$HOME/projects/mcp-proxy/data/hhs-oig-reports
npm run build
HHS_OIG_REPORTS_LIMIT=20 HHS_OIG_REPORTS_MAX_FETCH=20 HHS_OIG_VA_INDEX_PAGES=3 \
  npm run collect:hhs-oig-reports
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** that unit. Merge into the live HHS cache. Do not replace other doors. Do not add a new well-known URL.

Applied on apollo (2026-09-07): live SHA **c489088**. Collect reused the 144 HHS OAS / OEI / A-* PDFs and added **20** official VA OIG PDFs (`addedThisRun` 20, `fetchedPdfs` 20, skipped 1). Live bag **cardCount 164**, asOf **2026-09-04**, fetchedAt **2026-09-07T19:50:41.853Z**. Habit `vaoig-26-00030-213` Salisbury is in the free manifest. Restarted **only** `idaho-ticks-x402.service`. Unpaid `GET https://ticks.bnm.farm/hhs-oig-reports` is **402** at $0.05. `/.well-known/x402` still lists `/hhs-oig-reports` among **48** doors. Superfund FYR (PR 199) was not applied.

## After apply

- Live `/.well-known/x402` still lists `/hhs-oig-reports` and does **not** add a 49th door
- Free manifest includes `vaoig-*` ids (habit: `vaoig-26-00030-213` Salisbury, 2026-09-04)
- Unpaid GET stays HTTP 402 at $0.05
- `HHS_OIG_VA=0` turns VA collect off if needed
