# CATCH — tick-like official-data doors for ticks.bnm.farm

**Job:** research + leak-test. Not ship. Not deploy. Not Bruce. Not apollo media-box.

**Probed:** 2026-09-20 UTC (filename keeps the hunt date). Live `/ticks` snapshot `catalog.json` `fetchedAt` `2026-09-20T02:03:34.141Z`: **5,345** ticks, **155** sources, groups hay / cattle / grain / dairy / hogs / produce / pulses / wool. SE leftover cattle weeklies + five SE barns are **already on the bag**. Empty official prints this collect: `ams_2808`, `ams_2770`, `ams_2101`.

**Shape we are hunting:** habit + ugly + rebuy. Paid body is a moving official number table (or a new official page) that needs collector+cache. Free manifest of counts/URLs is OK. US federal 17 USC 105 only. Prefer fattening `GET /ticks` $0.05 `tableWhole` over a new SKU when the body is the same kind of official print.

**Leak-test first.** If the official host already serves the **body** as no-auth JSON/CSV/XLS/TXT or a documented API of that body → **KILL**. Keyed MARS (`403 Access is denied`) is **not** a dump. A free report-list / slug catalog is a manifest, not a body.

Companion machine rows: [TICK_LIKE_DOOR_HUNT_2026-09-19.json](./TICK_LIKE_DOOR_HUNT_2026-09-19.json).

---

## Chief shortlist (score / board these)

| Rank | Verdict | Name | Door | $ | Why |
| --- | --- | --- | --- | --- | --- |
| 1 | **TAKE** | AMS leftover Midwest / Northeast cattle weeklies | fatten `/ticks` cattle | $0.05 | Same sale-barn PDF family already paid. IL / PA / NY / AR + six MO regionals. MARS 403. PDFs live. |
| 2 | **TAKE** | AMS sheep / goat auctions + state weeklies | fatten `/ticks` new `sheep` group | $0.05 | Same ugly auction PDF. Not on bag. Daily/weekly habit. |
| 3 | **TAKE** | AMS Daily Spot Cotton Quotations + weekly review | fatten `/ticks` new `cotton` group | $0.05 | Daily moving quotes. PDF. MARS 403. |
| 4 | **TAKE** | AMS poultry / turkey / egg national dailies | fatten `/ticks` new `poultry` group | $0.05 | Daily national glance sheets. PDF. MARS 403. |
| 5 | **TAKE** | AMS shipping-point leftovers + national specialty sheets | fatten `/ticks` produce | $0.05 | Phoenix / Fresno / Yakima / Orlando / Miami + potato-onion / watermelon / tomato / grape. Terminal fruit/veg already on bag. |
| 6 | **TAKE** | AMS tallow / variety meats / hides | fatten `/ticks` cattle (or thin `byproduct` rows) | $0.05 | Daily/weekly packer sheets. PDF. Not LMR API. |
| 7 | **TAKE** | AMS leftover terminal nuts / onions / potatoes | fatten `/ticks` produce | $0.05 | Baltimore / Columbia / Detroit extras beside fruit+veg already cached. |
| 8 | **TAKE** | AMS National Truck Rate (FVWTRK) | fatten `/ticks` produce **or** one thin sibling only if Chief wants freight separate | $0.05 | Weekly PDF. MARS list is free; body is not. Prefer same bag. |
| 9 | **TAKE** | AMS Daily Livestock and Poultry Slaughter (AMS_3208) | fatten `/ticks` | $0.05 | Daily official head counts. PDF. Different body than monthly NASS Livestock Slaughter. |
| — | **KILL** | CFTC Commitments of Traders | — | — | Official Socrata JSON/CSV dumps the positions. |
| — | **KILL** | USDA NASS Crop Progress / Quick Stats family | — | — | Official TXT of the report + documented Quick Stats API. |
| — | **KILL** | EIA weekly petroleum + gas storage | — | — | `ir.eia.gov` CSV/JSON is the body. |
| — | **KILL** | AMS LMR boxed beef / 5-area / LMR pork / NDPSR | — | — | `mpr.datamart` LMPR API dumps the numbers no-auth. |
| — | **KILL** | WASDE / PSD / ESR / GTR tables | — | — | Official Excel/CSV/TXT/XML already published. |

Do not invent a payer class. A stranger already re-bought `/ticks`. These TAKEs are more of that official-print habit, not a new story.

---

## Scoring rules used

| Rule | Applied as |
| --- | --- |
| Leak-test first | Official no-auth JSON/CSV/XLS/TXT **or** documented API of the **body** → KILL. Manifest/list OK. |
| Ugly | Paid body is PDF/HTML/scan needing collector+cache. |
| License | US federal 17 USC 105 = yes. Non-US = PARK (none boarded here). |
| Habit | Moving number / new page beats dead archive. |
| Named payer | Plus only. Not required. Not invented. |
| Same body | Fatten `/ticks` before a new path. |
| Price | $0.05 USDC Base tableWhole. $0.02 only if Chief later splits a one-text body door (hay-shaped). These rows are table ticks. |

Hard KILL list from the brief (do not wrap): openFDA, ClinicalTrials, CMS 2567, WASDE/PSD/ESR, CBP AD/CVD service-messages, SAM notice JSON, USGS NWIS, FAA NMS-API, ATTOM, Regrid.

---

## 1) AMS / USDA Market News — fatten `/ticks` or sibling

Public slug catalog (manifest, not body): `https://marsapi.ams.usda.gov/services/v1/public/listPublishedReports/all` → HTTP 200, 1,690 reports on 2026-09-19. My Market News filerepo is the same list as HTML.

Keyed body API (not a dump): `https://marsapi.ams.usda.gov/services/v1.1/reports/{slug}` → HTTP 403 `{"status":"403 - Forbidden","errorCode":403,"message":"Access is denied"}` on leftover weeklies, cotton `3804`, turkey `2856`, sheep barn `1913`, boxed-beef slug `2465`. Same test the leftover collector already uses.

Ugly body: `https://www.ams.usda.gov/mnreports/{slug}.pdf` → HTTP 200 `%PDF` on every TAKE slug below.

**LMR exception (KILL, not TAKE):** Livestock Mandatory Reporting numbers are a different host. `https://mpr.datamart.ams.usda.gov/services/v1.1/reports/{slug}` is a **documented no-auth JSON API** of the report body (LMPRS user guide on the same host). Live: slug `2465` (LM_XB463 comprehensive boxed beef) returns `total_loads`, sales buckets, cutout sections; slug `2466` (5-area cattle) returns thousands of rows; slug `2453` (daily boxed-beef cutout) returns current cutout values; slug `2993` (National Dairy Products Sales Report) returns butter/cheese/whey/NDM sections. **AMS_2993 is already a `/ticks` dairy source.** Do not wrap more LMR. Do not unship the existing PDF row — flag only: official host already dumps that dairy body as JSON.

### TAKE-1 — Midwest / Northeast leftover cattle weeklies (fatten `/ticks`)

| | |
| --- | --- |
| **Verdict** | **TAKE** |
| **Source** | `https://www.ams.usda.gov/mnreports/ams_{slug}.pdf` |
| **Slugs (unread on live catalog)** | IL `2041`, PA `1919`, NY `2011`, AR `2056`, MO NE `1838`, MO NC `1837`, MO WC `1847`, MO SW `1845`, MO SE `1842`, MO SC `1841`, MO EC `1785` |
| **Leak-test** | MARS `v1.1/reports/2041` → 403 denied. PDFs `2041`, `1919`, `2011`, `2056`, `1838`, `1847`, `1845`, `1785` → 200 PDF. Public list is slugs only. |
| **Ugly?** | Yes. Livestock Weighted Average Report PDFs. Same parser family as SE leftovers. |
| **Habit** | Weekly new page. |
| **$** | $0.05 tableWhole on existing `/ticks`. No new path. |
| **Why** | Leftover collector already named these as unread Midwest/Northeast, not the SE slice. Same cattle `$/cwt` body a stranger just paid. Highest-confidence fatten. |

Skip `AMS_2874` / `LSWWCBS` National Weekly Cattle Beef Summary: leftover already recorded mnreports 403/404; do not invent or wrap a dashboard.

### TAKE-2 — Sheep / goat auctions + state weeklies (fatten `/ticks`)

| | |
| --- | --- |
| **Verdict** | **TAKE** |
| **Source** | e.g. `https://www.ams.usda.gov/mnreports/ams_1913.pdf` (New Holland), `ams_2014.pdf` (San Angelo), plus AL weekly goat `2005`, MO weekly sheep/goat `1833`, and the other live sheep/goat auction slugs on the public list (~50 current PDFs) |
| **Leak-test** | MARS `1913` → 403. PDF `1913` → 200. `sa_ls850.pdf` 404 — do not invent a national-summary URL; use numbered `ams_*` auction PDFs that 200. |
| **Ugly?** | Yes. Same auction-sheet PDF as cattle. |
| **Habit** | Sale-day / weekly. |
| **$** | $0.05 on `/ticks` as a new `sheep` group (bag already has `wool`). Not a new SKU. |
| **Why** | Official prints, unread, same collector shape. Do not add every tiny barn on day one — start with New Holland, San Angelo, and the two state weeklies, then add current official pages only. |

### TAKE-3 — Cotton daily spot + weekly review (fatten `/ticks`)

| | |
| --- | --- |
| **Verdict** | **TAKE** |
| **Source** | Daily Spot Cotton Quotations `https://www.ams.usda.gov/mnreports/ams_3804.pdf`. Weekly Cotton Market Review narrative/tables `mp_cn206` / `mp_cn208` / `cnwwcmr` on the public list. |
| **Leak-test** | MARS `3804` → 403. PDF → 200. No no-auth cotton-quote JSON found on ams.usda.gov. Classing *quality* summaries are a different body (grade/staple, not price) — PARK those unless Chief wants quality ticks. |
| **Ugly?** | Yes. Daily PDF quote sheet. |
| **Habit** | Daily (spot) / weekly (review). |
| **$** | $0.05 on `/ticks` new `cotton` group. |
| **Why** | Moving official quotes, US federal, unread on the 155-source bag. |

### TAKE-4 — Poultry / turkey / egg national dailies (fatten `/ticks`)

| | |
| --- | --- |
| **Verdict** | **TAKE** |
| **Source** | Turkey glance `https://www.ams.usda.gov/mnreports/ams_2856.pdf` (NW_PY044). Broiler glance `ams_2740.pdf`. Daily New York Shell Egg `ams_2734.pdf`. National Shell Egg Index `ams_2843.pdf`. Weekly poultry & egg cold storage `ams_1624.pdf`. |
| **Leak-test** | MARS `2856` → 403. Those PDFs → 200. `nw_py044.pdf` 404 — use the `ams_2856` bookmark, not the old mnemonic. |
| **Ugly?** | Yes. |
| **Habit** | Daily national sheets. |
| **$** | $0.05 on `/ticks` new `poultry` group. |
| **Why** | Same AMS PDF habit as hay/cattle. Not LMR. Do not pull LMR chicken/turkey mandatory if a later slug shows up on `mpr.datamart`. |

### TAKE-5 — Shipping-point leftovers + national specialty (fatten produce)

| | |
| --- | --- |
| **Verdict** | **TAKE** |
| **Source** | Phoenix fruit/veg `ix_fv110` / `ix_fv120`, Fresno fruit `fr_fv110`, Yakima fruit/veg `ya_fv110` / `ya_fv120`, Idaho Falls fruit `if_fv110` (onions/potatoes `if_fv130` already on bag), Orlando / Miami shipping-point, National Potato and Onion `fvdidnop`, Watermelon `fvdtvmelon`, Tomato fax `fvdtomf`, Table grape `fvdgrape`. All `https://www.ams.usda.gov/mnreports/{slug}.pdf`. |
| **Leak-test** | `ix_fv110.pdf` and `fvdidnop.pdf` → 200 PDF. Specialty Crops moved onto My Market News (2024-12-16). MMN **data** API is the same keyed MARS (`register → API key`). Public list / filerepo are catalogs. Not a no-auth price dump. |
| **Ugly?** | Yes. |
| **Habit** | Daily shipping-point / national commodity sheets. |
| **$** | $0.05 on existing produce group. |
| **Why** | `/ticks` already sells terminal fruit/veg. Shipping-point is the farm-gate sibling, not a new door. |

### TAKE-6 — Tallow / variety meats / hides (fatten `/ticks`)

| | |
| --- | --- |
| **Verdict** | **TAKE** |
| **Source** | Tallow & Protein `https://www.ams.usda.gov/mnreports/ams_2837.pdf` (NW_LS442). Beef & Pork Variety Meats `ams_2833.pdf` (NW_LS440). Major Packer Hide `ams_2830.pdf`. Weeklies `ams_2839` / `ams_2838` / `ams_2835` / `ams_2834`. |
| **Leak-test** | PDFs 200. These are LPGMN drop/by-product sheets, **not** the LMPR boxed-beef slugs that `mpr.datamart` dumps. MARS still 403. |
| **Ugly?** | Yes. |
| **Habit** | Daily + weekly. |
| **$** | $0.05. Prefer cattle/byproduct rows on `/ticks`, not `/tallow`. |
| **Why** | Official packer prints next to cattle already on the door. |

### TAKE-7 — Leftover terminal nuts / onions / potatoes (fatten produce)

| | |
| --- | --- |
| **Verdict** | **TAKE** |
| **Source** | Baltimore / Columbia / Detroit `*_fv030` (onions & potatoes) and `*_fv040` (nuts). Fruit/veg for NY / Chicago / LA / Atlanta / Detroit / Philly / Boston already on the bag. |
| **Leak-test** | Same MMN/MARS keyed + mnreports PDF pattern as TAKE-5. |
| **Ugly?** | Yes. |
| **Habit** | Daily terminal. |
| **$** | $0.05 on produce. |
| **Why** | Finish the terminal tables already started. Do not add discontinued Dallas / San Francisco / foreign terminals. |

### TAKE-8 — National Truck Rate FVWTRK

| | |
| --- | --- |
| **Verdict** | **TAKE** (same bag first) |
| **Source** | `https://www.ams.usda.gov/mnreports/fvwtrk.pdf` (SC National Truck Rate). |
| **Leak-test** | PDF 200. `wa_fv190` National Truck Rate TXT on the list is a **2022** file — dead archive, skip. |
| **Ugly?** | Yes. |
| **Habit** | Weekly. |
| **$** | $0.05. Fatten produce (freight next to shipping-point) unless Chief wants a one-row sibling. Do not open `/truck` for one sheet. |
| **Why** | Recurring official rate page. Thin, so it rides the existing table. |

### TAKE-9 — Daily livestock and poultry slaughter (AMS_3208)

| | |
| --- | --- |
| **Verdict** | **TAKE** |
| **Source** | `https://www.ams.usda.gov/mnreports/ams_3208.pdf` |
| **Leak-test** | PDF 200. This is the AMS **daily** federally inspected slaughter sheet, not NASS monthly *Livestock Slaughter* (Quick Stats / ESMIS). Do not also wrap the NASS monthly. |
| **Ugly?** | Yes. |
| **Habit** | Daily head counts. |
| **$** | $0.05 on `/ticks`. |
| **Why** | Moving official number. Not a price, still a tick. |

### PARK — AMS families we looked at and left on the bench

| Name | Why PARK |
| --- | --- |
| Hundreds of remaining individual sale barns | Leftover collector already: “stay off this slice.” Weeklies cover the same prints with less collector surface. Revisit only after TAKE-1 is on the bag. |
| Board / video / internet cattle (AMS_2029, AMS_3891, AMS_3416, Superior, …) | Leftover collector: different family than sale-barn floor sheets. Habit is real; parser is not the one we have. |
| Seasonal replacement / stock-show specials | Often empty off-season. Do not invent. |
| Mexico import plaintext `AL_LS626` / `627` / `635` | Official plaintext already — do not wrap. |
| National Weekly Cattle Beef Summary `AMS_2874` | mnreports 404 on this hunt; leftover already skipped. |
| Cotton classing quality (CNDCQS, CNWWQS, office weeklies) | Quality, not a price tick. Archive-heavy. |
| Dairy graphs / CME cash-trading slugs `1599`–`1610` | Graphs are pictures. CME cash slugs need a separate leak-test against CME/LMPR before anyone boards them. `/ticks` already has Dairy Market News + NDPSR. |
| Production-cost / retail-feature / movement (truck-air-boat) | Thin, discontinued rows, or not a price. |
| Grain Transportation Report **tables** | See KILL. Feature article alone is not a tick. |
| Feeder/stocker national PM `LSPDFSS` | Likely auction composite; confirm it is not an LMPR slug on `mpr.datamart` before boarding. If the datamart dumps it, KILL. |

---

## 2) CFTC Commitments of Traders — KILL

| | |
| --- | --- |
| **Verdict** | **KILL** |
| **Source** | [CFTC COT page](https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm) · PRE [r4w3-av2u](https://publicreporting.cftc.gov/stories/s/Commitments-of-Traders/r4w3-av2u) |
| **Leak-test** | `GET https://publicreporting.cftc.gov/resource/6dca-aqww.json?$limit=3` → HTTP 200 `application/json` with `market_and_exchange_names`, `report_date_as_yyyy_mm_dd`, open interest / position fields (Legacy Futures Only). Same dataset `.csv` → 200 `text/csv`. CFTC documents the SODA API and says tokens are not required. Disaggregated / TFF / CIT are the same PRE (`72hh-3qpy`, `gpe5-46if`, `4zgm-a668`, …). `cftc.gov` HTML/TXT 403 Cloudflare from this VM — irrelevant; PRE already dumped the body. |
| **Ugly?** | No. Body is JSON/CSV. |
| **Habit** | Weekly Friday. Habit does not save a leak. |
| **$** | — |
| **Why** | Official host serves the positions. Wrapping the short-form PDF is wrapping the same body. Bank Participation / Cotton On-Call / Weekly Swaps sit on the same PRE — treat as KILL unless a later hunt proves a PDF-only narrative with no PRE dataset. |

`/cftc-orders` stays. That door is enforcement-order **text**, not COT.

---

## 3) USDA Crop Progress / NASS — KILL

| | |
| --- | --- |
| **Verdict** | **KILL** (the numbers). PARK any “state stories” winter narrative if Chief ever wants a body door — not tick-like. |
| **Source** | [ESMIS Crop Progress](https://esmis.nal.usda.gov/publication/crop-progress) · [Quick Stats API docs](https://quickstats.nass.usda.gov/api) · [NASS JSON-for-major-reports](https://www.nass.usda.gov/Quick_Stats/JSON/index.php) |
| **Leak-test** | Latest growing-season release (week ending 2026-09-13, posted 2026-09-14): `https://esmis.nal.usda.gov/sites/default/release-files/796060/prog3726.txt` → HTTP 200, full official tables (corn dented/harvested/condition, soybeans, cotton, moisture, days suitable). Same slug `.pdf` → 200. Quick Stats `/api/api_GET/` without a key → 401 `{"error":["unauthorized"]}` — still a **documented API** of the same estimates (key is free). NASS JSON page lists Agricultural Prices / Crop Production / Livestock at release time (not Crop Progress), which still KILLs those sister reports. |
| **Ugly?** | PDF exists, but the body is already TXT + API. |
| **Habit** | Weekly in season (next listed 2026-09-21). |
| **$** | — |
| **Why** | Do not wrap Crop Progress, Cattle on Feed, Hogs & Pigs, Grain Stocks, Crop Production, Agricultural Prices, monthly Livestock Slaughter, or Cold Storage. Same Quick Stats / ESMIS dump pattern. |

---

## 4) EIA weekly petroleum / gas — KILL

| | |
| --- | --- |
| **Verdict** | **KILL** |
| **Source** | [WPSR](https://www.eia.gov/petroleum/supply/weekly/) · [WNGSR](https://ir.eia.gov/ngs/ngs.html) · [EIA API docs](https://www.eia.gov/opendata/documentation.php) · [HTTPS file list](https://ir.eia.gov/ngs/notice.html) |
| **Leak-test** | `https://ir.eia.gov/ngs/wngsr.json` → 200, `release_name` Weekly Natural Gas Storage Report, `current_week` `2026-09-11`, working-gas fields. `wngsr.csv` → 200, same table. `https://ir.eia.gov/wpsr/table1.csv` → 200, crude/product balance for `9/11/26` vs prior week. Documented API v2 on top. |
| **Ugly?** | No. CSV/JSON **is** the weekly body. PDF is a reprint. |
| **Habit** | WPSR Wednesday / WNGSR Thursday (holiday slips). |
| **$** | — |
| **Why** | Official host already hands the stocks and prices to any GET. This Week in Petroleum narrative does not make the numbers wrap-eligible. |

---

## 5) Other US federal recurring ugly sources

### KILL — already open official dumps (do not wrap)

| Name | Evidence |
| --- | --- |
| **WASDE** | [USDA WASDE](https://www.usda.gov/oce/commodity/wasde) Sep 2026 row: PDF + **XML + Excel + Text**. ESMIS keeps `wasde*.xls/xml/txt`. Historical CSV on [historical-wasde-report-data](https://www.usda.gov/historical-wasde-report-data). Brief already named this. |
| **PSD** | FAS PSD Online + OpenData `/api/psd/*`. Official revised S&D series. Brief already named this. |
| **ESR / Export Sales** | ESRQS: no login for reports, query, **and API**. CSV/XLSX export. Brief already named this. |
| **AMS Grain Transportation Report tables** | Weekly PDF exists (`GTR09102026.pdf` habit), **and** [GTR datasets](https://www.ams.usda.gov/services/transportation-analysis/gtr-datasets) publish the table bodies as XLSX. Live: `https://www.ams.usda.gov/sites/default/files/media/GTRTable1.xlsx` → 200 Office Open XML. **KILL the numbers.** Feature article is not a tick. |
| **CBP AD/CVD service-messages, SAM notice JSON, USGS NWIS, FAA NMS-API, openFDA, ClinicalTrials, CMS 2567** | Named KILLs. Not re-probed. |
| **ATTOM / Regrid** | Not US federal 17 USC 105. KILL on license even before leak. |

### PARK — ugly enough, not tick-like (or leak-risk)

These can wait. They are inspectorate / notice PDFs, not hay-shaped moving quotes. Prefer fattening an existing **body** door over a new SKU.

| Name | Source | Leak-test / why PARK |
| --- | --- | --- |
| **USDA OIG audit / inspection PDFs** | [usda.gov/oig](https://www.usda.gov/oig/) · [audit-reports](https://www.usda.gov/oig/reports/audit-reports) | HTML index + official PDFs. No JSON body seen. Could **fatten `/hhs-oig-reports`** (that bag already mixes HHS + VA OIG PDFs) instead of `/usda-oig`. Habit is a new report, not a weekly number. |
| **USDA OALJ Agriculture Decisions (PACA / P&S)** | [PACA recent decisions](https://www.ams.usda.gov/rules-regulations/paca/recent-decisions) · [PSD enforcement](https://www.ams.usda.gov/services/enforcement/psd) | Decisions live on USDA OALJ / Hearing Clerk PDFs. Shop `/oalj-decisions` is **DOL** OALJ, not USDA. Possible sibling body door later. PACA “enforcement actions” page is press-release HTML (2026 posts exist) — too thin to SKU. Sample reparation PDF is a static digest, not habit. |
| **AMS NOP organic settlements** | [organic enforcement](https://www.ams.usda.gov/services/enforcement/organic) | HTML year archives (2020–2021 pages still up). Not a dense new-page habit. PARK. |
| **MSHA fatal investigation reports** | [msha.gov/fatality-reports](https://www.msha.gov/fatality-reports) | Official final-report PDFs. Mine *statistics* are separate open data (do not wrap the stats). Body door, not a tick table. Recurring when someone dies — habit is grim and sparse. PARK unless Chief wants another CSB-shaped PDF door. |
| **USACE Notices to Navigation Interests** | [NTNI](https://ndc.ops.usace.army.mil/ords/r/ntni/notices/navigation-notices) | HTML/ORDS app, HTTP 200. Mariners sibling, not `/ticks`. Leak-test the ORDS REST **before** any door — APEX apps often dump the notice table as JSON. PARK until that GET is proven ugly. |
| **NRC ADAMS inspection / event PDFs** | [ADAMS](https://www.nrc.gov/reading-rm/adams) | PDF library. Heavy collector, search UI, not a clean weekly sheet. PARK. |
| **NTSB investigation reports** | [CAROL](https://data.ntsb.gov/carol-main-public/api-help) | Documented CAROL API / JSON export for case fields. Report **narrative** is still PDF — same shape as `/csb-reports` if Chief wants it, but case metadata is leaked. PARK; leak-test the exact narrative field before any TAKE. |
| **Federal Reserve Beige Book** | federalreserve.gov HTML | Recurring, official, but HTML (not ugly-enough) and not a farm tick. PARK. |
| **GAO / CBO / CRS reports** | gao.gov / cbo.gov / crsreports.congress.gov | Habit PDFs, US federal. Not tick-like. Several have search/API/RSS. PARK as a later body-door hunt, not this CATCH. |

---

## Existing-bag leak (do not unship, do not fatten)

`/ticks` already carries **AMS_2993 National Dairy Products Sales Report**. Official LMPR API `GET https://mpr.datamart.ams.usda.gov/services/v1.1/reports/2993` returns the butter / block cheddar / barrel cheddar / dry whey / NDM sections as no-auth JSON. That is the same body. Leave the live row. Do not add more LMR dairy/cattle/pork/boxed-beef slugs to `/ticks`.

---

## What this is not

- Not a deploy. Not a collector patch. Not a new path in well-known.
- Not a Bruce email. Not x402-list. Not CDP. Not apollo media-box.
- Not non-US (those stay PARK on license even when ugly).
- Not “agents will pay for Crop Progress / COT / EIA because the PDF looks official.” The official host already gave them the body.

---

## Board order for Chief

1. Score TAKE-1 (Midwest/NE cattle weeklies) as the next `/ticks` collect slice — same SKU, same $0.05, same parser family.
2. If that rebuy holds, board TAKE-2…5 as more groups/rows on the **same** table (sheep, cotton, poultry, shipping-point).
3. Keep TAKE-6…9 as cheap add-ons on the same door.
4. Leave every KILL off the board.
5. PARK inspectorate/notice rows for a later body-door hunt, not this tick hunt.
