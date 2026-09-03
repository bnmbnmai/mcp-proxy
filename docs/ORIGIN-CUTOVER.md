# Origin cutover — mcp-proxy + tv-remote (2026-09-03)

Chief asked for the smallest cutover that makes Cursor Origin (`bnm800`) the place new commits land for the live shop repos. Ofwat is already live (44 paid GETs on `ticks.bnm.farm/.well-known/x402`). This hosted agent did **not** flip Origin. Live hosts were left up. No force-push. No deploy.

## What flipped

**Nothing on Origin.** This cloud agent is bound to GitHub `bnmbnmai/mcp-proxy`. The Origin CLI is installed but not signed in (`origin auth status` → not logged in). There is no `CURSOR_API_KEY` / `CURSOR_AUTH_TOKEN` in the environment. `cursor.com/codebase/bnm800` redirects to login. Detach-from-GitHub is a Settings click, not a documented CLI command. Per standing orders, that is a Bruce step.

Live hosts were checked and left running:

| Host | Check (2026-09-03 ~05:57Z) |
| --- | --- |
| `https://ticks.bnm.farm/` | HTTP 200 shop JSON (`via: Caddy`, Cloudflare) |
| `https://ticks.bnm.farm/.well-known/x402` | HTTP 200, **44** paid resources, includes `/ofwat-enforcement` |
| `https://bnm.farm/` | HTTP 200, `Last-Modified: 2026-09-03 02:58:12 GMT` |

## Inspection

### GitHub (first-pass mirror, still the write remote for this agent)

| Repo | Visibility | Default branch | GitHub tip this agent can see | Role |
| --- | --- | --- | --- | --- |
| `bnmbnmai/mcp-proxy` | public | `main` | `67132d3` (2026-08-31 catalog sync) | Public catalog **and** the live ticks apply tree |
| `bnmbnmai/tv-remote` | private | `main` | `ab4bc94` (2026-08-28 todo-board merge) | `bnm.farm` lander + Caddy edge |

`mcp-proxy` `main` is the **catalog**. It is not the live serving tip. Catalog `SHOP-INDEX.md` on `main` is behind live well-known (live has `/phmsa-orders`, `/aaib-reports`, `/csb-reports`, `/hhs-oig-reports` that `main` does not list). New door work is cherry-picked onto a long-lived **apply tip** on apollo; hosted VMs must not `git checkout main` on that tree.

`tv-remote` `main` Caddyfile does **not** mention `ticks.bnm.farm`. Lander/apply branches do. Example from `cursor/ofwat-enforcement-lander-3bbb`:

```caddy
http://ticks.bnm.farm {
	encode gzip
	reverse_proxy 172.20.0.1:4020
}
```

Backend is host loopback `:4020` (`idaho-ticks-x402.service`). Caddy reaches it via the `bnm-edge` gateway. Do not bind the door to `0.0.0.0`.

GitHub `tv-remote` `pushedAt` was 2026-09-03T02:58:37Z (branch pushes). Default-branch commit is still 2026-08-28. Live lander HTML is newer than `main`.

### Origin (cannot confirm SHAs without Bruce)

Documented remotes:

- HTTPS: `https://origin.cursor.com/{owner}/{repo}.git`
- Browse: `https://cursor.com/codebase/{owner}/{repo}`

Unauthenticated probes:

- `https://origin.cursor.com/bnm800/mcp-proxy` → 307 to `https://cursor.com/codebase/bnm800/mcp-proxy`
- `https://cursor.com/codebase/bnm800` and `…/mcp-proxy`, `…/tv-remote`, `…/dryland-listings` → login wall (not 404)
- `git ls-remote https://origin.cursor.com/bnm800/*.git` → auth required (cannot tell empty vs private)
- `origin repo list --namespace bnm800` / `origin repo view` → not authenticated

So the **namespace `bnm800` is claimed** and those repo URLs exist at the product layer. Whether `mcp-proxy` / `tv-remote` are already minted, GitHub-synced, or Origin-ahead is **unconfirmed**. `bnm800/dryland-listings` is treated as already-private Origin (new work already mints Origin).

`origin repo create-mirrored` must **not** be used for this cutover. A GitHub mirror keeps GitHub as the source of truth; pushes to the Origin remote pass through to GitHub.

The documented flip for an existing mirror is UI-only: repo **Settings → General → Danger Zone → Detach from GitHub**. After Detach, Origin is the source of truth and GitHub is untouched (no force-push).

### How apollo deploys (do not change tonight)

apollo = media-box (`apollo@192.168.1.243`, Cursor worker **media-box**, idle and connected during this run). Hosted Cursor VMs cannot reach the LAN. Apply happens on the box.

**ticks.bnm.farm**

- Disk: `~/projects/mcp-proxy` (user `apollo`)
- Unit: `systemctl --user restart idaho-ticks-x402.service` (no sudo)
- Port: `127.0.0.1:4020`
- Pattern from open apply PRs (`#171`, `#177`, `#179`): `git fetch origin <apply-branch>` then `git checkout <SHA>` on the **current apply tip**. Do not reset to catalog `main`. Then `npm run build` / collect / restart the unit.
- This hosted VM has no SSH to apollo. The media-box worker is still labeled `github.com-bnmbnmai/bnmbnmai/tv-remote`.

**bnm.farm lander**

- Disk: `~/projects/tv-remote`
- Caddy bind-mounts `homelab/` from **whatever branch is checked out**. Do not `git checkout` another `tv-remote` branch unless the task owns live routing.
- Worker workspace is this checkout. Phone / My Machines → media-box.

This agent did **not** run commands on media-box (no checkout, no pull, no restart).

## What is still GitHub

- This agent's `origin` remote: `https://github.com/bnmbnmai/mcp-proxy`
- Catalog `main` and the live apply-tip fetch URL (until remotes change on apollo)
- `tv-remote` default remote on the media-box worker
- Skipped tonight (per brief): `lead-engine-cre`, `agentrtb`, `eyeofthestorm`, `fastcasematch`, `adcre`
- Other GitHub that is live on the same box but not this pass: `farm-plan`, `basin34-water-transparency`
- Public leftovers (not shop): `x402`, `gold-402`, assorted awesome-lists

GitHub stays a readable first-pass mirror. Do not delete it. Do not force-push it to “catch” Origin.

## Bruce steps (stop here)

Do these as Bruce. Do not invent other Origin write APIs.

1. **Auth for agents / CLI**
   - On a signed-in machine: `origin auth login` (browser), **or** put `CURSOR_API_KEY` on the next cloud agent / environment so `origin repo list --namespace bnm800` works.
   - Confirm: `origin auth status` then `origin repo list --namespace bnm800`.

2. **One click per live repo on [cursor.com/codebase](https://cursor.com/codebase)**
   - Open `bnm800/mcp-proxy` and `bnm800/tv-remote`.
   - Settings → General: if Sync Status says GitHub is the source, **Detach from GitHub**.
   - If a repo is missing: **New** native Origin repo (Internal/Private as appropriate) — not Sync-from-GitHub unless you will Detach in the same sitting.
   - Then, from a checkout that already has the history you want (catalog `main` **or** the live apply tip — they are different):  
     `git remote add cursor https://origin.cursor.com/bnm800/mcp-proxy.git`  
     `git push -u cursor HEAD`  
     Same for `tv-remote`. Fast-forward only. No `--force`.

3. **Media-box remotes (read first, then add a second remote)**
   - My Machines → media-box. Do not switch the live `tv-remote` branch.
   - Record `git -C ~/projects/mcp-proxy remote -v` / `branch --show-current` / `rev-parse HEAD`.
   - Record the same for `~/projects/tv-remote`.
   - Add `https://origin.cursor.com/bnm800/<repo>.git` as a **named extra remote** (`cursor`). Leave GitHub `origin` until the next apply has been fetched from Origin once.
   - Do not restart `idaho-ticks-x402` for the remote add.
   - After Detach, launch **new** shop agents from the Origin repo, not from GitHub `bnmbnmai/mcp-proxy`.

4. **Do not do tonight**
   - Point Caddy or the systemd unit at a different branch because of this cutover.
   - Mirror with `origin repo create-mirrored` (wrong source of truth).
   - Force-push, delete GitHub, or take ticks / `bnm.farm` down.

## Next repo if this pass works

**`farm-plan`** (`farm.bnm.farm`, private, same apollo checkout `~/projects/farm-plan`). Same media-box rules. Still skip `lead-engine-cre`, `agentrtb`, `eyeofthestorm`, `fastcasematch`, `adcre`.

After farm-plan: `basin34-water-transparency` (`water.bnm.farm`).
