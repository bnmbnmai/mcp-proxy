# Apply GET /eis-reports onto the live ticks tip

Official **EPA NEPA Environmental Impact Statement TEXT** extracted from CDX e-NEPA EIS document PDFs (`https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/search`). 17 U.S.C. § 105. Extracted-body door. Free manifest is titles / CEQ numbers / dates / agencies / links only. Paid `GET ?id=` is one official PDF text. Plain GET is the newest 10 official texts. Skip EPA comment letters and “Summary for the …” teasers. Not Superfund RODs (already live). Habit: last-week FR filings; PDFs since ~Oct 2012.

**Price:** **$0.02** (`20000`) one official text via `?id=`. **$0.05** (`50000`) newest 10 on a plain GET. Wallet stays `0xf59621FC406D266e18f314Ae18eF0a33b8401004`. Not a PDF-cache door. Not a wrap of search/details HTML. Do not invent a 46th SKU besides `/eis-reports`.

**Download gate:** ALTCHA SHA-256 proof-of-work (not a picture captcha). Collector solves it in-process and injects the payload into `#downloadFormCaptcha`. Prefer the public **Download EIS** link (`startDownload('downloadEisDocuments', eisId, groups, set)`) after PoW. If a download **302s to login.gov**, that file is not the public EIS PDF — skip it and take the public Download EIS link. A CDX Login 302 on a raw HTTP POST is a bot/session difference, not a second human puzzle; Chrome + injected PoW already fetched public EIS PDFs. If a real picture captcha (reCAPTCHA/hCaptcha) appears, **stop** and report. Do not ask Bruce to click puzzles.

**Leak-test:** no-auth JSON / `?format=json` / `/api/eis/{id}` do **not** dump EIS body. Free search/details HTML is titles, CEQ numbers, dates, agencies, attachment IDs. Distinctive PDF phrases (`ML26035A285`, `Supplement to NUREG-2226`) are not in the HTML chrome. If a no-auth JSON starts dumping the EIS body, KILL the door.

**First cache (cloud VM unattended):** **2 texts**, asOf **2026-08-28**. Clinch River SEIS `20260036` (live PDF 6,606,213 bytes; extracted text includes `ML26035A285` / `NUREG-2226` / `Docket Number: 50-615`). F-35A Beddown Draft EIS `20260104` (live PDF 101,414,998 bytes). Official PDFs + extracted snapshot stay on Apollo under `data/eis-reports/` (gitignored). Captcha: ALTCHA PoW solved in-collector.

This cloud VM is **not** apollo. Do **not** apply live from here. Leave this handoff.

## Apply on apollo / media-box (`systemctl --user`; no sudo)

```bash
cd ~/projects/mcp-proxy
git fetch origin cursor/eis-reports-dedd
git checkout cursor/eis-reports-dedd
# Chrome is required for live PDF fetch. puppeteer-core is a package.json dep (no bundled Chromium).
# pdftotext (poppler-utils) is preferred; collector falls back to python3 + pypdf.
export CHROME_PATH="${CHROME_PATH:-/usr/local/bin/google-chrome}"
test -x "$CHROME_PATH" || CHROME_PATH=$(command -v google-chrome || command -v chromium || true)
export EIS_REPORTS_DIR=$HOME/projects/mcp-proxy/data/eis-reports
mkdir -p "$EIS_REPORTS_DIR"
npm install
npm run build
EIS_REPORTS_LIMIT=10 EIS_REPORTS_MAX_FETCH=10 npm run collect:eis-reports
systemctl --user restart idaho-ticks-x402.service
```

Set `EIS_REPORTS_DIR` and `CHROME_PATH` on the unit if they are not already in the environment file. Restart **only** `idaho-ticks-x402.service`. Merge into the live cache. Do not replace other doors. Do not replace the live HHS OIG, CSB, AAIB, or PHMSA caches.

If prior PDF bytes are already under `data/eis-reports/` (or a copied `/tmp/eis-live-cache/`), collect will extract text from those files and skip a re-download.

## Lander card (tv-remote / bnm.farm)

Stacked on the HHS OIG lander tip. Product + bag + price only (`$0.02 ?id=`, `$0.05 / 10`). No “not this” copy. See the tv-remote PR on `cursor/eis-reports-lander-dedd`.

## After apply

- unpaid `GET https://ticks.bnm.farm/eis-reports` is HTTP 402 at $0.05
- unpaid `GET ?id=20260104` is HTTP 402 at $0.02
- free `GET /eis-reports/manifest.json` is HTTP 200, titles/links/counts only, no `body`
- paid GET returns JSON `cards[].body` + `records[]` (not `application/pdf`)
- `/.well-known/x402` lists `/eis-reports`
- `/` shop JSON lists the product
- `/mcp` tools include `eis-reports` generated from well-known (no hardcoded door count)
- lander https://bnm.farm/ shows the EIS card
- catalog `npm run sync:live-shop` is a **later** listing PR on `main` after this apply is live
