# Apply GET /eis-reports collect fix (no human captcha)

Official **EPA NEPA Environmental Impact Statement TEXT** from CDX e-NEPA EIS document PDFs. Door is already live on ticks.bnm.farm at `/eis-reports` (teaser-blocked at `cardCount` 1 since apply). This PR is the collect-path fix only. Do **not** apply from this VM. One media-box worker lane; Chief launches apply.

## Root cause (verified 2026-09-09)

Evening all-door collect died in `downloadEisPdfWithChrome` → `tryStart(LAST_WEEK_URL)`:

```
BLOCKER: second human captcha (reCAPTCHA/hCaptcha) on CDX e-NEPA.
```

That was a **false human-captcha trip**, not a new picture puzzle:

1. Cookie-less / first-hop GET `?search=&commonSearch=lastWeek` 302s to `?search=&__fsk=…` and **drops** `commonSearch=lastWeek`.
2. The empty search form still includes leftover `https://www.google.com/recaptcha/api.js` in `<head>` and has **no** `<altcha-widget>`.
3. Old detector treated `recaptcha/api.js` without the string `altcha-widget` as a human blocker and aborted the whole run.
4. Details pages and a warmed-session GET `commonSearch=last30Published` still serve `<altcha-widget>` and official rows. Download JS is still “Please check the altcha.” Raw HTTP POST of the download form 302s to CDX Login (bot/session), same as before — Chrome + injected ALTCHA PoW on the **details** page is the public PDF path.

There is no official no-auth PDF URL. Federal Register weekly NOA is titles only. NRC ADAMS 403’d from this VM. Do not ask Bruce to click captchas.

## What changed

- Cookie-session catalog: warm `GET /search`, then `GET last30Published` (the official list that still returns rows). last-week GET stays empty after `__fsk`.
- Chrome download starts on `/action/eis/details?eisId=` (always has ALTCHA). Never open last-week search first.
- `looksLikeHumanCaptcha` only fires on a **visible** reCAPTCHA/hCaptcha widget or “Please complete the …” copy. Leftover `recaptcha/api.js` is not a blocker.

## Apply on apollo / media-box (`systemctl --user`; no sudo)

Merge collect functions into the live EIS tip (`src/eis-reports.ts`). Do not checkout catalog `main` over the live door. Do not replace other doors.

```bash
cd ~/projects/mcp-proxy
# stay on the live EIS / apply-since-etag tip
# merge src/eis-reports.ts collect + captcha + listing helpers from this branch
export CHROME_PATH="${CHROME_PATH:-/usr/local/bin/google-chrome}"
test -x "$CHROME_PATH" || CHROME_PATH=$(command -v google-chrome || command -v chromium || true)
export EIS_REPORTS_DIR=$HOME/projects/mcp-proxy/data/eis-reports
mkdir -p "$EIS_REPORTS_DIR"
npm install
npm run build
EIS_REPORTS_LIMIT=20 EIS_REPORTS_MAX_FETCH=10 npm run collect:eis-reports
# expect cardCount > 1 (toward growUntil ~20). captcha.kind remains altcha-pow.
systemctl --user restart idaho-ticks-x402.service
```

Restart **only** `idaho-ticks-x402.service`. Verify `https://ticks.bnm.farm/eis-reports/manifest.json` `cardCount` moves above 1.

If a **visible** reCAPTCHA/hCaptcha widget appears on the details page (not leftover `api.js`), stop and report. That would be truly human-only.
