/**
 * Nationwide USDA AMS hay / cattle / grain / wool / dairy / hogs / produce report bodies
 * for the existing GET /ticks door. Official PDFs (and NAL/esmis archive copies).
 * Same product: idaho-hay-feeder-ticks. Does not open a new SKU. Does not wrap marsapi
 * (403 without a key), LMR datamart JSON, NASS Quick Stats, WASDE/PSD/ESR, CME APIs,
 * the National Feeder dashboard, or SJ_LS850.txt.
 * AMS_2911 National Wool Review is public-domain 17 USC 105; parse the official PDF only.
 * AMS_2872 National Daily Hog and Pork Summary is the official AMS public PDF, not an
 * LMR dashboard / datamart wrap. Individual LM_HG* / LM_PK* PDFs stay skipped.
 *
 * Prefer live mnreports over NAL/esmis archives. Collect used to unshift ESMIS first and
 * keep the first parseable PDF — that left many Direct Hay/Cattle/Grain rows on Sept 2025
 * NAL copies while official still published Aug 2026 bodies on ams.usda.gov/mnreports.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const PRODUCT_ID = "idaho-hay-feeder-ticks";
export const ESMIS_HOST = "https://esmis.nal.usda.gov";
export const MNREPORTS_PDF = (slug: string) =>
  `https://www.ams.usda.gov/mnreports/AMS_${slug}.pdf`;
export const VIEW_REPORT = (slug: string) =>
  `https://mymarketnews.ams.usda.gov/viewReport/${slug}`;

const HTTP_UA = "bnm-data-shop/1.0 (USDA AMS public market-report PDFs; +https://www.ams.usda.gov/market-news/hay-reports)";

export type AmsGroup = "hay" | "cattle" | "grain" | "wool" | "dairy" | "hogs" | "produce";

export type AmsReport = {
  slug: string;
  group: AmsGroup;
  region: string;
  title: string;
  esmisPublication: string;
  /** Extra mnreports / ESMIS stems (dywweeklyreport, lsddhps, nx_fv010, …). */
  pdfNames?: readonly string[];
};

/**
 * Already on /ticks via farm-plan / hay.ams_ prefix: 3056 Idaho hay, 3057 Oregon hay,
 * 3058 Columbia Basin hay, 3059 NW cattle, 2914 PNW pulses. Not listed again.
 * No Illinois or Georgia Direct Hay on the official AMS hay listing (auction barns only).
 */
export const AMS_NATIONAL_REPORTS: readonly AmsReport[] = [
  { slug: "2904", group: "hay", region: "california", title: "California Direct Hay", esmisPublication: "california-direct-hay-report" },
  { slug: "2707", group: "hay", region: "texas", title: "Texas Direct Hay", esmisPublication: "texas-direct-hay-report" },
  { slug: "2885", group: "hay", region: "kansas", title: "Kansas Direct Hay", esmisPublication: "kansas-direct-hay-report" },
  { slug: "2935", group: "hay", region: "nebraska", title: "Nebraska Direct Hay", esmisPublication: "nebraska-direct-hay-report" },
  { slug: "2905", group: "hay", region: "colorado", title: "Colorado Direct Hay", esmisPublication: "colorado-direct-hay-report" },
  { slug: "2769", group: "hay", region: "montana", title: "Montana Direct Hay", esmisPublication: "montana-direct-hay-report" },
  { slug: "3236", group: "hay", region: "wyoming", title: "Wyoming Direct Hay", esmisPublication: "wyoming-direct-hay-report" },
  { slug: "3183", group: "hay", region: "south_dakota", title: "South Dakota Direct Hay", esmisPublication: "south-dakota-direct-hay-report" },
  { slug: "2807", group: "hay", region: "iowa", title: "Iowa Direct Hay", esmisPublication: "iowa-direct-hay-report" },
  { slug: "2929", group: "hay", region: "missouri", title: "Missouri Direct Hay", esmisPublication: "missouri-direct-hay-report" },
  { slug: "3905", group: "hay", region: "kentucky", title: "Kentucky Direct Hay", esmisPublication: "" },
  { slug: "3095", group: "hay", region: "oklahoma", title: "Oklahoma Direct Hay", esmisPublication: "oklahoma-direct-hay-report" },
  { slug: "2939", group: "hay", region: "new_mexico", title: "New Mexico Direct Hay", esmisPublication: "new-mexico-direct-hay-report" },
  { slug: "3731", group: "hay", region: "utah", title: "Utah Direct Hay", esmisPublication: "utah-direct-hay-report" },
  { slug: "3784", group: "hay", region: "arizona", title: "Arizona Direct Hay", esmisPublication: "arizona-direct-hay-report" },
  { slug: "3050", group: "hay", region: "alabama", title: "Alabama Direct Hay", esmisPublication: "alabama-direct-hay-report" },
  { slug: "3793", group: "hay", region: "tennessee", title: "Tennessee Direct Hay", esmisPublication: "tennessee-direct-hay-report" },
  { slug: "3926", group: "hay", region: "nevada", title: "Nevada Direct Hay", esmisPublication: "" },
  { slug: "3652", group: "hay", region: "arthur_il", title: "Arthur Sale Barn Hay Auction (Monday)", esmisPublication: "" },
  { slug: "3872", group: "hay", region: "arthur_il_sat", title: "Arthur Sale Barn Hay Auction (Saturday, seasonal)", esmisPublication: "" },
  { slug: "3679", group: "hay", region: "fort_collins_co", title: "Centennial Livestock Hay Auction (Fort Collins)", esmisPublication: "" },
  { slug: "2245", group: "hay", region: "corsica_sd", title: "Dakota Hay Auction (Corsica, Monday)", esmisPublication: "" },
  { slug: "3870", group: "hay", region: "corsica_sd_seasonal", title: "Dakota Hay Auction (Corsica, seasonal)", esmisPublication: "" },
  { slug: "3729", group: "hay", region: "union_ia", title: "HPL Auctions Hay Auction (Union)", esmisPublication: "" },
  { slug: "3627", group: "hay", region: "brush_co", title: "Livestock Exchange Hay Auction (Brush)", esmisPublication: "" },
  { slug: "3660", group: "hay", region: "bethalto_il", title: "Madison County Ag Hay Auction (Bethalto)", esmisPublication: "" },
  { slug: "2246", group: "hay", region: "pipestone_mn", title: "Pipestone Hay and Straw Auction", esmisPublication: "" },
  { slug: "3694", group: "hay", region: "greeley_co", title: "Producers Livestock Hay Auction (Greeley)", esmisPublication: "" },
  { slug: "2243", group: "hay", region: "rock_valley_ia_mon", title: "Rock Valley Hay Auction (Monday)", esmisPublication: "" },
  { slug: "2244", group: "hay", region: "rock_valley_ia_thu", title: "Rock Valley Hay Auction (Thursday)", esmisPublication: "" },
  { slug: "3489", group: "hay", region: "rushville_va", title: "Rushville Hay Auction", esmisPublication: "" },
  { slug: "3723", group: "hay", region: "golden_city_mo", title: "Southwest Missouri Hay Auction (Golden City)", esmisPublication: "" },
  { slug: "3364", group: "hay", region: "shipshewana_in", title: "Shipshewana Hay Auction", esmisPublication: "" },
  { slug: "1650", group: "hay", region: "topeka_in", title: "Topeka Hay Auction", esmisPublication: "" },
  { slug: "1716", group: "hay", region: "new_holland_pa", title: "Wolgemuth Hay Auction (New Holland)", esmisPublication: "" },
  { slug: "1725", group: "hay", region: "leola_pa", title: "Wolgemuth Hay Auction (Leola)", esmisPublication: "" },
  { slug: "2710", group: "cattle", region: "texas", title: "Texas Direct Cattle", esmisPublication: "texas-direct-cattle-report" },
  { slug: "3097", group: "cattle", region: "kansas", title: "Kansas Direct Feeder Cattle", esmisPublication: "kansas-direct-cattle-report" },
  { slug: "3098", group: "cattle", region: "oklahoma", title: "Oklahoma Direct Feeder Cattle", esmisPublication: "oklahoma-direct-cattle-report" },
  { slug: "2906", group: "cattle", region: "colorado", title: "Colorado Direct Cattle", esmisPublication: "colorado-direct-cattle-report" },
  { slug: "3096", group: "cattle", region: "eastern_cornbelt", title: "Eastern Cornbelt Direct Feeder Cattle", esmisPublication: "" },
  { slug: "3455", group: "cattle", region: "iowa", title: "Iowa Direct Feeder Cattle", esmisPublication: "iowa-direct-cattle-report" },
  { slug: "2808", group: "cattle", region: "missouri", title: "Missouri Direct Feeder Cattle", esmisPublication: "" },
  { slug: "2770", group: "cattle", region: "montana", title: "Montana Direct Feeder Cattle", esmisPublication: "montana-direct-cattle-report" },
  { slug: "2708", group: "cattle", region: "new_mexico", title: "New Mexico Direct Feeder Cattle", esmisPublication: "new-mexico-direct-cattle-report" },
  { slug: "3184", group: "cattle", region: "south_dakota", title: "South Dakota Direct Feeder Cattle", esmisPublication: "south-dakota-direct-cattle-report" },
  { slug: "2709", group: "cattle", region: "southeast", title: "Southeast Direct Feeder Cattle", esmisPublication: "" },
  { slug: "2940", group: "cattle", region: "southwest", title: "Southwest Direct Feeder Cattle", esmisPublication: "" },
  { slug: "3237", group: "cattle", region: "wyoming_nebraska", title: "Wyoming-Nebraska Direct Feeder Cattle", esmisPublication: "wyoming-nebraska-direct-cattle-report" },
  { slug: "2132", group: "cattle", region: "toppenish_wa", title: "Toppenish Livestock Commission Cattle Auction", esmisPublication: "" },
  { slug: "1773", group: "cattle", region: "miles_city_mt", title: "Miles City Livestock Commission Cattle Auction", esmisPublication: "" },
  { slug: "1774", group: "cattle", region: "billings_pay_wed", title: "Public Auction Yards Cattle Auction (Billings, Wednesday)", esmisPublication: "" },
  { slug: "1775", group: "cattle", region: "billings_lc_mon", title: "Billings Livestock Commission Cattle Auction (Monday)", esmisPublication: "" },
  { slug: "1776", group: "cattle", region: "billings_pay_fri", title: "Public Auction Yards Cattle Auction (Billings, Friday)", esmisPublication: "" },
  { slug: "1777", group: "cattle", region: "billings_lc_thu", title: "Billings Livestock Commission Cattle Auction (Thursday)", esmisPublication: "" },
  { slug: "1778", group: "cattle", region: "montana_weekly", title: "Montana Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "2036", group: "cattle", region: "cedar_city_ut", title: "Cedar Livestock Cattle Auction (Cedar City)", esmisPublication: "" },
  { slug: "2037", group: "cattle", region: "salina_ut", title: "Producers Livestock Cattle Auction (Salina)", esmisPublication: "" },
  { slug: "2383", group: "cattle", region: "monroe_ut", title: "R Livestock Connection Cattle Auction (Monroe)", esmisPublication: "" },
  { slug: "2039", group: "cattle", region: "utah_weekly", title: "Utah Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "2101", group: "cattle", region: "torrington_wy_fri", title: "Torrington Livestock Commission Cattle Auction (Friday)", esmisPublication: "" },
  { slug: "2103", group: "cattle", region: "torrington_wy_wed", title: "Torrington Livestock Commission Feeder Cattle Auction (Wednesday)", esmisPublication: "" },
  { slug: "2104", group: "cattle", region: "riverton_wy", title: "Winter Livestock Cattle Auction (Riverton)", esmisPublication: "" },
  { slug: "2106", group: "cattle", region: "wyoming_weekly", title: "Wyoming Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "1907", group: "cattle", region: "colorado_weekly", title: "Colorado Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "2027", group: "cattle", region: "south_dakota_weekly", title: "South Dakota Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "2100", group: "cattle", region: "north_dakota_weekly", title: "North Dakota Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "1860", group: "cattle", region: "nebraska_weekly", title: "Nebraska Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "1895", group: "cattle", region: "kansas_weekly", title: "Kansas Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "1784", group: "cattle", region: "new_mexico_weekly", title: "New Mexico Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "1831", group: "cattle", region: "oklahoma_weekly", title: "Oklahoma Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "1955", group: "cattle", region: "texas_weekly", title: "Texas Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "2167", group: "cattle", region: "iowa_weekly", title: "Iowa Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "1821", group: "cattle", region: "missouri_weekly", title: "Missouri Weekly Cattle Auction Summary", esmisPublication: "" },
  { slug: "3148", group: "grain", region: "portland", title: "Portland Daily Grain Bids", esmisPublication: "portland-daily-grain-bids" },
  { slug: "3046", group: "grain", region: "minneapolis", title: "Minneapolis Daily Grain", esmisPublication: "minneapolis-daily-grain-report" },
  { slug: "3223", group: "grain", region: "kansas_city", title: "Kansas City Daily Grain Bids", esmisPublication: "kansas-city-daily-grain-bids" },
  { slug: "2912", group: "grain", region: "colorado", title: "Colorado Daily Grain Bids", esmisPublication: "colorado-daily-grain-bids" },
  { slug: "3192", group: "grain", region: "illinois", title: "Illinois Daily Grain Bids", esmisPublication: "illinois-grain-bids" },
  { slug: "3225", group: "grain", region: "nebraska", title: "Nebraska Daily Grain Bids", esmisPublication: "nebraska-daily-grain-bids" },
  { slug: "2932", group: "grain", region: "missouri", title: "Missouri Daily Grain Bids", esmisPublication: "missouri-daily-grain-bids" },
  { slug: "2850", group: "grain", region: "iowa", title: "Iowa Daily Grain Bids", esmisPublication: "iowa-daily-grain-bids" },
  { slug: "2960", group: "grain", region: "arkansas", title: "Arkansas Daily Grain Bids", esmisPublication: "arkansas-daily-grain-bids" },
  { slug: "3146", group: "grain", region: "california", title: "California Weekly Grain Bids", esmisPublication: "" },
  { slug: "3463", group: "grain", region: "indiana", title: "Indiana Weekly Grain Bids", esmisPublication: "indiana-grain-bids" },
  { slug: "3043", group: "grain", region: "iowa_minnesota_barge", title: "Iowa-Southern Minnesota Barge Grain Bids", esmisPublication: "iowa-southern-minnesota-barge-terminal-grain-bids" },
  { slug: "2886", group: "grain", region: "kansas", title: "Kansas Daily Grain Bids", esmisPublication: "kansas-daily-grain-bids" },
  { slug: "2892", group: "grain", region: "kentucky", title: "Kentucky Daily Grain Bids", esmisPublication: "kentucky-daily-grain-bids" },
  { slug: "3147", group: "grain", region: "gulf", title: "Louisiana and Texas Gulf Export Bids", esmisPublication: "" },
  { slug: "2714", group: "grain", region: "maryland", title: "Maryland Weekly Grain Bids", esmisPublication: "maryland-grain-bids" },
  { slug: "3049", group: "grain", region: "southern_minnesota", title: "Southern Minnesota Daily Grain Bids", esmisPublication: "southern-minnesota-daily-grain-bids" },
  { slug: "2928", group: "grain", region: "mississippi", title: "Mississippi Daily Grain Bids", esmisPublication: "mississippi-daily-grain-bids" },
  { slug: "2771", group: "grain", region: "montana", title: "Montana Daily Elevator Grain Bids", esmisPublication: "montana-daily-grain-bids" },
  { slug: "3156", group: "grain", region: "north_carolina", title: "North Carolina Daily Grain Bids", esmisPublication: "" },
  { slug: "3878", group: "grain", region: "north_dakota", title: "North Dakota Daily Grain Bids", esmisPublication: "north-dakota-daily-grain-bids" },
  { slug: "2851", group: "grain", region: "ohio", title: "Ohio Daily Grain Bids", esmisPublication: "ohio-daily-grain-bids" },
  { slug: "3100", group: "grain", region: "oklahoma", title: "Oklahoma Daily Grain Bids", esmisPublication: "oklahoma-daily-grain-bids" },
  { slug: "3091", group: "grain", region: "pennsylvania", title: "Pennsylvania Weekly Grain Bids", esmisPublication: "pennsylvania-grain-bids" },
  { slug: "2787", group: "grain", region: "south_carolina", title: "South Carolina Daily Grain Bids", esmisPublication: "south-carolina-daily-grain-bids" },
  { slug: "3186", group: "grain", region: "south_dakota", title: "South Dakota Daily Grain Bids", esmisPublication: "south-dakota-daily-grain-bids" },
  { slug: "3088", group: "grain", region: "tennessee", title: "Tennessee Daily Grain Bids", esmisPublication: "tennessee-daily-grain-bids" },
  { slug: "2711", group: "grain", region: "texas", title: "Texas Daily Grain Bids", esmisPublication: "texas-daily-grain-bids" },
  { slug: "3167", group: "grain", region: "virginia", title: "Virginia Daily Grain Bids", esmisPublication: "virginia-daily-grain-bids" },
  { slug: "3239", group: "grain", region: "wyoming", title: "Wyoming Daily Grain Bids", esmisPublication: "wyoming-daily-grain-bids" },
  { slug: "2887", group: "grain", region: "national", title: "National Daily Sunflower Canola Millet Flaxseed", esmisPublication: "national-daily-sunflower-canola-millet-and-flaxseed-report" },
  { slug: "3802", group: "grain", region: "national_organic", title: "National Organic Grain and Feedstuffs", esmisPublication: "national-organic-grain-and-feedstuffs", pdfNames: ["lsbnof"] },
  { slug: "2911", group: "wool", region: "national", title: "National Wool Review", esmisPublication: "national-wool-review-fri" },
  { slug: "2998", group: "dairy", region: "national", title: "Dairy Market News Weekly Report", esmisPublication: "dairy-market-news-weekly-report", pdfNames: ["dywweeklyreport"] },
  { slug: "1598", group: "dairy", region: "national", title: "Dry Products Price Summary", esmisPublication: "" },
  { slug: "1101", group: "dairy", region: "east", title: "Fluid Milk and Cream East", esmisPublication: "" },
  { slug: "1100", group: "dairy", region: "central", title: "Fluid Milk and Cream Central", esmisPublication: "" },
  { slug: "1102", group: "dairy", region: "west", title: "Fluid Milk and Cream West", esmisPublication: "" },
  { slug: "2997", group: "dairy", region: "national_organic", title: "Organic Dairy Market News", esmisPublication: "", pdfNames: ["dybdairyorganic"] },
  { slug: "2872", group: "hogs", region: "national", title: "National Daily Hog and Pork Summary", esmisPublication: "national-daily-hog-pork-summary-report", pdfNames: ["lsddhps"] },
  { slug: "2314", group: "produce", region: "new_york", title: "New York Terminal Market Fruit", esmisPublication: "", pdfNames: ["nx_fv010"] },
  { slug: "2315", group: "produce", region: "new_york", title: "New York Terminal Market Vegetables", esmisPublication: "", pdfNames: ["nx_fv020"] },
  { slug: "2290", group: "produce", region: "chicago", title: "Chicago Terminal Market Fruit", esmisPublication: "", pdfNames: ["hx_fv010"] },
  { slug: "hx_fv020", group: "produce", region: "chicago", title: "Chicago Terminal Market Vegetables", esmisPublication: "", pdfNames: ["hx_fv020"] },
  { slug: "2306", group: "produce", region: "los_angeles", title: "Los Angeles Terminal Market Fruit", esmisPublication: "", pdfNames: ["hc_fv010"] },
  { slug: "2307", group: "produce", region: "los_angeles", title: "Los Angeles Terminal Market Vegetables", esmisPublication: "", pdfNames: ["hc_fv020"] },
  { slug: "aj_fv010", group: "produce", region: "atlanta", title: "Atlanta Terminal Market Fruit", esmisPublication: "", pdfNames: ["aj_fv010"] },
  { slug: "aj_fv020", group: "produce", region: "atlanta", title: "Atlanta Terminal Market Vegetables", esmisPublication: "", pdfNames: ["aj_fv020"] },
  { slug: "2302", group: "produce", region: "detroit", title: "Detroit Terminal Market Fruit", esmisPublication: "", pdfNames: ["du_fv010"] },
  { slug: "2303", group: "produce", region: "detroit", title: "Detroit Terminal Market Vegetables", esmisPublication: "", pdfNames: ["du_fv020"] },
  { slug: "na_fv010", group: "produce", region: "philadelphia", title: "Philadelphia Terminal Market Fruit", esmisPublication: "", pdfNames: ["na_fv010"] },
  { slug: "na_fv020", group: "produce", region: "philadelphia", title: "Philadelphia Terminal Market Vegetables", esmisPublication: "", pdfNames: ["na_fv020"] },
  { slug: "bh_fv010", group: "produce", region: "boston", title: "Boston Terminal Market Fruit", esmisPublication: "", pdfNames: ["bh_fv010"] },
  { slug: "bh_fv020", group: "produce", region: "boston", title: "Boston Terminal Market Vegetables", esmisPublication: "", pdfNames: ["bh_fv020"] },
];

export const SKIPPED_SOURCES = [
  { id: "marsapi", why: "marsapi.ams.usda.gov/services/v1.1/reports/{slug} returns HTTP 403 without an API key — not a no-auth JSON body" },
  { id: "lmr-datamart", why: "mpr.datamart.ams.usda.gov already exposes LMR cattle as no-auth JSON — skip wrapping that body" },
  { id: "feeder-dashboard", why: "National Feeder & Stocker Cattle Dashboard is a web app, not an ugly PDF/HTML report body" },
  { id: "SJ_LS850", why: "https://www.ams.usda.gov/mnreports/SJ_LS850.txt already returns the official plaintext body" },
  { id: "nass-quick-stats", why: "documented no-auth JSON API — KILL" },
  { id: "wasde-psd-esr", why: "documented no-auth USDA JSON/CSV — KILL" },
  { id: "ams_3056_3057_3058_3059_2914", why: "already collected on /ticks (Idaho/Oregon/Columbia Basin hay, NW Direct cattle, PNW pulses)" },
  { id: "no-il-ga-direct-hay", why: "AMS hay listing has no Illinois or Georgia Direct Hay report — IL hay is auction-barn PDFs already wired" },
  { id: "retired-city-grain-txt", why: "sj_gr851 / gx_gr110 / wh_gr110 / jc_gr111 are retired or already plaintext city grain .txt — skip wrapping" },
  { id: "ams_3045_minneapolis_basis", why: "AMS_3045 Minneapolis Daily Basis is a MIAX floor-basis sheet, not a POS bid table" },
  { id: "se-individual-cattle-barns", why: "400+ official SE/Midwest individual sale-barn PDFs stay off this slice; weekly mountain/plains summaries + PNW/MT/UT/WY barns are wired. Not a new SKU." },
  { id: "se-weekly-cattle-summaries", why: "AL/FL/GA/MS/NC/SC/TN/KY/VA/WV/PA/IN/IL daily+weekly auction summaries leftover — same door later, not this pass" },
  { id: "seasonal-specials", why: "official seasonal/replacement/stock-show specials often empty off-season; skip rather than invent" },
  { id: "video-internet-auctions", why: "feeder cattle internet/video/board sales are a different AMS family than sale-barn floor sheets" },
  { id: "lmr-slaughter-pdfs", why: "national/regional Direct Slaughter PDFs are LMR fed-cattle tables, not the feeder/POS parser this door already sells" },
  { id: "plaintext-recaps", why: "lswalabama / lswkssum / CO_LS146.txt already return official plaintext — do not wrap" },
  { id: "facebook-private-barns", why: "Facebook barns, private sale-barn homepages, and Treasure Valley Caldwell stay out — no dated official PDF/HTML print" },
  { id: "gis-echo-family-herd", why: "GIS wraps, EPA ECHO, and the sold family herd ledger are not /ticks rows" },
  { id: "new-x402-door", why: "no per-barn / per-state / per-region SKU; extra official rows stay on GET /ticks" },
  { id: "ams_2911_marsapi", why: "marsapi /services/v1.2/reports/2911 returns HTTP 403 without a key — parse the official mnreports PDF only" },
  { id: "lmr-hog-pdfs", why: "LM_HG203/206/210/212, LM_PK602, LM_HG201 are LMR licensed tables; parse official AMS_2872 / lsddhps summary PDF only — do not wrap LMR dashboards" },
  { id: "cme-cash-trading-doors", why: "dedicated CME cash slugs 1599-1602 wrap CME; weekly AMS_2998 already prints Dairy Market News weekly averages from that cash table" },
  { id: "dairy-regional-narrative", why: "AMS_1090/1089/1091 butter and AMS_1084/1083/1085 cheese regional PDFs printed overages/narrative this week, not dollar prints — skip rather than invent" },
  { id: "dairy-gdt-farmers-markets", why: "GDT 1604, farmers-market dairy, and international DMN PDFs are a leftover dairy slice; not this pass" },
  { id: "se-swine-auction-barns", why: "individual AMS swine-auction barn PDFs leftover — same door later; national 2872 summary is this hog slice" },
  { id: "sheep-goats", why: "official AMS sheep/lamb/goat PDFs are a leftover slice; LMR boxed-lamb LM_XL* skipped; parser stretch is not small" },
  { id: "poultry-eggs", why: "official AMS broiler/egg PDFs leftover — different LPGMN family than hog summary / cattle auctions" },
  { id: "cotton-rice", why: "official AMS cotton and rice PDFs leftover — not in the grain POS / organic-feedstuffs family this door already parses" },
  { id: "remaining-fv-terminals", why: "Asheville/Columbia/Raleigh/Baltimore/nuts, FV030 onion-potato city sheets, and discontinued MX_FV010 Mexico City leftover; NY/CHI/LA/ATL/DET/PHL/BOS fruit+veg are the national terminal slice" },
  { id: "mx_fv010_discontinued", why: "MX_FV010 is Mexico City terminal fruit, permanently discontinued 2024-02-09 — not a current US terminal print" },
  { id: "if_fv130_already", why: "Idaho Falls IF_FV130 shipping-point is already on /ticks via farm-plan — do not re-list" },
] as const;

export type AmsTick = {
  id: string;
  group: AmsGroup;
  commodity: string;
  label: string;
  market: string;
  classGrade: string;
  unit: string;
  price: number;
  lo?: number;
  hi?: number;
  asOf: string;
  source: string;
  sourceUrl: string;
  reportDate: string;
  series: string;
};

export type AmsFailed = {
  id: string;
  source: string;
  sourceUrl: string;
  reason: string;
};

export type AmsSnapshot = {
  ok: true;
  product: typeof PRODUCT_ID;
  fetchedAt: string;
  asOf: string | null;
  tickCount: number;
  rows: AmsTick[];
  failed: AmsFailed[];
  sources: string[];
};

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function amsNationalDir(): string {
  if (env("TICKS_AMS_DIR")) return resolve(env("TICKS_AMS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ticks-ams"));
}

export function amsSnapshotPath(dir = amsNationalDir()): string {
  return join(dir, "snapshot.json");
}

export function token(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&nbsp;/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function parseMdY(raw: string): string | null {
  const m = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!m) return null;
  const day = `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const y = Number(m[3]);
  return y >= 1990 && y <= 2100 ? day : null;
}

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

export function parseReportDate(text: string): string | null {
  const ending = text.match(/week ending\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (ending) return parseMdY(ending[1]);
  const livestockThru = text.match(
    /Livestock Weighted Average Report for\s+\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  if (livestockThru) return parseMdY(livestockThru[1]);
  const hayAuction = text.match(/Hay Auction Weighted Average Report for\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (hayAuction) return parseMdY(hayAuction[1]);
  const organicThru = text.match(/Report for\s+\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (organicThru) return parseMdY(organicThru[1]);
  const periodThru = text.match(/Information for the period\s+[A-Za-z]+\s+\d{1,2}\s*[-–]\s*(\d{1,2}),\s+(\d{4})/i);
  if (periodThru) {
    const named = text.match(
      /Information for the period\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(\d{1,2}),\s+(\d{4})/i,
    );
    if (named) {
      const mon = MONTHS[named[1].toLowerCase()];
      if (mon) return `${named[3]}-${mon}-${named[2].padStart(2, "0")}`;
    }
  }
  const weekOf = text.match(
    /WEEK OF\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(\d{1,2}),\s+(\d{4})/i,
  );
  if (weekOf) {
    const mon = MONTHS[weekOf[1].toLowerCase()];
    if (mon) return `${weekOf[3]}-${mon}-${weekOf[2].padStart(2, "0")}`;
  }
  const monthThru = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(\d{1,2}),\s+(\d{4})\b/i,
  );
  if (monthThru) {
    const mon = MONTHS[monthThru[1].toLowerCase()];
    if (mon) return `${monthThru[3]}-${mon}-${monthThru[2].padStart(2, "0")}`;
  }
  const grain = text.match(/Grain Report for\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (grain) return parseMdY(grain[1]);
  const woolThru = text.match(/Report For:\s*\d{1,2}\/\d{1,2}\/\d{4}\s+thru\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (woolThru) return parseMdY(woolThru[1]);
  const named = text.match(
    /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),\s+(\d{4})\b/i,
  );
  if (named) {
    const mon = MONTHS[named[1].toLowerCase()];
    if (mon) return `${named[3]}-${mon}-${named[2].padStart(2, "0")}`;
  }
  return parseMdY(text);
}

export function parseMoney(raw: string): { lo: number; hi: number; mid: number } | null {
  const m = raw.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/);
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = m[2] ? Number(m[2]) : lo;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return { lo, hi, mid: (lo + hi) / 2 };
}

export function esmisPdfUrls(html: string, slug: string, pdfNames: readonly string[] = []): string[] {
  const stems = [`AMS_${slug}`, `ams_${slug}`, ...pdfNames, ...pdfNames.map((n) => n.toUpperCase())];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const stem of stems) {
    const re = new RegExp(`href="(/sites/default/release-files/[^"]+/${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.PDF)"`, "gi");
    for (const match of html.matchAll(re)) {
      const url = match[1].startsWith("http") ? match[1] : `${ESMIS_HOST}${match[1]}`;
      if (seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

export function latestEsmisPdfUrl(html: string, slug: string): string | null {
  return esmisPdfUrls(html, slug)[0] ?? null;
}

export function esmisPublicationUrl(report: AmsReport): string {
  return `${ESMIS_HOST}/publication/${report.esmisPublication}`;
}

export function mnreportsPdfUrls(slug: string, pdfNames: readonly string[] = []): string[] {
  const stems = [...new Set([`ams_${slug}`, `AMS_${slug}`, ...pdfNames, ...pdfNames.map((n) => n.toLowerCase())])];
  const urls: string[] = [];
  for (const stem of stems) {
    urls.push(`https://www.ams.usda.gov/mnreports/${stem}.pdf`);
    urls.push(`https://search.ams.usda.gov/mnreports/${stem}.pdf`);
  }
  return [...new Set(urls)];
}

/** Live official host first. NAL/esmis archives are fallback only (Sept 2025 copies). */
export function officialPdfCandidateOrder(slug: string, esmisUrls: string[] = [], pdfNames: readonly string[] = []): string[] {
  return [...new Set([...mnreportsPdfUrls(slug, pdfNames), ...esmisUrls])];
}

const PACKAGE_RE =
  /\b(Large Square(?:\s+[34]x4)?|Medium Square(?:\s+3x3)?|Small Square(?:\s+3 Tie)?|Large Round|Standing)\b/i;

function hayRegion(line: string): string | null {
  const m = line.match(/^(.+?)\s+Hay\s*(?:\((Conventional|Organic)\))?\s*$/i);
  if (!m) return null;
  const name = m[1].replace(/^#+\s*/, "").trim();
  if (/direct hay weighted|compared to|please note|volume|tons:|bales:/i.test(name)) return null;
  if (name.length > 60) return null;
  return m[2] ? `${name} (${m[2]})` : name;
}

function hayPlaceLine(line: string): string | null {
  if (line.length < 3 || line.length > 48) return null;
  if (/\d|\$/.test(line)) return null;
  if (
    /alfalfa|bermuda|orchard|qty|price|source:|compared|direct hay|email us|usda |volume|please note|freight|crop age/i.test(
      line,
    )
  ) {
    return null;
  }
  return line;
}

function hayKindLine(line: string): string | null {
  const m = line.match(/^Hay\s*\((Conventional|Organic)\)\s*$/i);
  return m ? m[1] : null;
}

function hayClass(line: string): { commodity: string; grade: string; unit: string } | null {
  const m = line.match(
    /^([A-Za-z][A-Za-z0-9 /]+?)\s+-\s+(?:([A-Za-z][A-Za-z/ ]+?)\s+)?\((?:(?:Ask|Trade|Contract \(Trade\))\/)?Per\s+(Ton|Bale|Bundle)\)/i,
  );
  if (!m) return null;
  const kind = m[3].toLowerCase();
  return {
    commodity: m[1].trim(),
    grade: (m[2] || "quoted").trim(),
    unit: kind === "ton" ? "$/ton" : kind === "bundle" ? "$/bundle" : "$/bale",
  };
}

export function parseHayReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const source = `USDA AMS ${report.title} Report (AMS_${report.slug})`;
  const out: AmsTick[] = [];
  let region = report.region;
  let pendingPlace = "";
  let cls: { commodity: string; grade: string; unit: string } | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const nextRegion = hayRegion(line);
    if (nextRegion) {
      region = nextRegion;
      pendingPlace = "";
      cls = null;
      continue;
    }
    const kind = hayKindLine(line);
    if (kind && pendingPlace) {
      region = `${pendingPlace} (${kind})`;
      pendingPlace = "";
      cls = null;
      continue;
    }
    const place = hayPlaceLine(line);
    if (place) pendingPlace = place;
    const nextCls = hayClass(line);
    if (nextCls) {
      cls = nextCls;
      const inlinePkg = line.match(PACKAGE_RE);
      if (inlinePkg) parseHayRow(line, inlinePkg[1], cls, region, asOf, report, source, sourceUrl, out);
      continue;
    }
    if (!cls) continue;
    const pkg = line.match(PACKAGE_RE);
    if (!pkg) continue;
    parseHayRow(line, pkg[1], cls, region, asOf, report, source, sourceUrl, out);
  }
  return dedupeTicks(out);
}

function parseHayRow(
  line: string,
  pkg: string,
  cls: { commodity: string; grade: string; unit: string },
  region: string,
  asOf: string,
  report: AmsReport,
  source: string,
  sourceUrl: string,
  out: AmsTick[],
): void {
  const afterPkg = line
    .slice(line.toLowerCase().indexOf(pkg.toLowerCase()) + pkg.length)
    .replace(/\b\d+(?:st|nd|rd|th)\s+Cut\b/gi, "");
  const nums = [...afterPkg.matchAll(/\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?/g)].map((m) => m[0]);
  const loBound = cls.unit === "$/ton" ? 5 : 0.4;
  const hiBound = cls.unit === "$/ton" ? 800 : 200;
  const money = nums
    .map((n) => parseMoney(n))
    .filter((n): n is NonNullable<typeof n> => n !== null && n.mid >= loBound && n.mid <= hiBound);
  if (money.length === 0) return;
  const chosen = money.find((n) => !n.lo.toString().includes(".") && n.mid >= 20) && money.length > 1
    ? money[money.length - 1]
    : money[money.length > 1 ? money.length - 1 : 0];
  // Prefer an explicit weighted average (single value after a range) when present.
  const wtd = money.find((n, i) => i > 0 && n.lo === n.hi && money[0].lo !== money[0].hi) ?? chosen;
  const organic = /\borganic\b/i.test(`${region} ${cls.commodity} ${cls.grade} ${line}`);
  const id = [
    "hay",
    `ams_${report.slug}`,
    token(report.region),
    token(region.replace(/\s*\((?:conventional|organic)\)/i, "")),
    ...(organic ? ["organic"] : []),
    token(cls.commodity),
    token(cls.grade),
    token(pkg),
  ].join(".");
  out.push({
    id,
    group: "hay",
    commodity: cls.commodity,
    label: `${region} ${cls.commodity} ${cls.grade} ${pkg}`,
    market: `${report.title} — ${region}`,
    classGrade: organic ? `Organic ${cls.grade}, ${pkg}` : `${cls.grade}, ${pkg}`,
    unit: cls.unit,
    price: roundMoney(wtd.mid),
    lo: wtd.lo,
    hi: wtd.hi,
    asOf,
    source,
    sourceUrl,
    reportDate: asOf,
    series: id,
  });
}

const CATTLE_ROW_RE =
  /^(?:Current FOB\s+)?(\d+)\s+(\d+)(?:\s*-\s*(\d+))?\s+(\d+)\s+(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s+(\d+(?:\.\d+)?)/i;

const AUCTION_CATTLE_HDR =
  /^(STEERS|HEIFERS)\s+-\s+(Medium and Large [12](?:-[23])?|Large [123](?:-[23])?)\s+\(Per Cwt\s*\/\s*Actual Wt\)/i;
const AUCTION_CATTLE_ROW =
  /^(\d+)\s+(\d+)(?:-(\d+))?\s+(\d+)\s+(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?\s+(\d+(?:\.\d+)?)/;

export function looksLikeCattleAuction(text: string): boolean {
  return /Livestock Weighted Average Report for/i.test(text) || /\(Per Cwt\s*\/\s*Actual Wt\)/i.test(text);
}

export function parseCattleAuctionReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const source = `USDA AMS ${report.title} Report (AMS_${report.slug})`;
  const out: AmsTick[] = [];
  let sex = "";
  let grade = "";
  let inFeeder = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (/^FEEDER CATTLE\b/i.test(line)) {
      inFeeder = true;
      sex = "";
      grade = "";
      continue;
    }
    if (/^(SLAUGHTER|REPLACEMENT|FEEDER SHEEP|SLAUGHTER SHEEP|SLAUGHTER GOAT)/i.test(line)) {
      inFeeder = false;
      sex = "";
      grade = "";
      continue;
    }
    const hdr = line.match(AUCTION_CATTLE_HDR);
    if (hdr) {
      sex = hdr[1];
      grade = hdr[2];
      inFeeder = true;
      continue;
    }
    if (/\(Per Cwt/i.test(line) && /^(DAIRY|BEEF\/DAIRY|COWS|BULLS|PAIRS|STOCK|BRED)/i.test(line)) {
      sex = "";
      continue;
    }
    if (!sex || !inFeeder) continue;
    const row = line.match(AUCTION_CATTLE_ROW);
    if (!row) continue;
    const head = Number(row[1]);
    const wt = Number(row[4]);
    const lo = Number(row[5]);
    const hi = row[6] ? Number(row[6]) : lo;
    const avg = Number(row[7]);
    if (!Number.isFinite(avg) || avg < 20 || avg > 900) continue;
    if (!Number.isFinite(wt) || wt < 250 || wt > 1050) continue;
    const sexTok = /heifer/i.test(sex) ? "feeder-heifer" : "feeder-steer";
    const gradeTok = /2-3/.test(grade)
      ? "ml23"
      : /1-2/.test(grade)
        ? "ml12"
        : /large 3/i.test(grade)
          ? "l3"
          : /large 2/i.test(grade)
            ? "ml2"
            : /medium and large 2/i.test(grade)
              ? "ml2"
              : "ml1";
    const note = /\bunweaned\b/i.test(line) ? "unweaned" : "";
    const id = ["cattle", `ams_${report.slug}`, token(report.region), sexTok, gradeTok, `${wt}lb`].join(".");
    out.push({
      id,
      group: "cattle",
      commodity: /heifer/i.test(sex) ? "Heifers" : "Steers",
      label: `${report.title} ${sex} ${grade} ${wt} lb`,
      market: report.title,
      classGrade: `USDA ${grade}, ${wt} lb, ${head} head${note ? `, ${note}` : ""}`,
      unit: "$/cwt",
      price: roundMoney(avg),
      lo,
      hi,
      asOf,
      source,
      sourceUrl,
      reportDate: asOf,
      series: id,
    });
  }
  const headlines = headlineCattle(out, report, source, sourceUrl, asOf);
  return dedupeTicks([...headlines, ...out]);
}

export function parseCattleReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  if (looksLikeCattleAuction(text)) {
    const auction = parseCattleAuctionReport(text, report, sourceUrl);
    if (auction.length > 0) return auction;
  }
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const source = `USDA AMS ${report.title} Report (AMS_${report.slug})`;
  const out: AmsTick[] = [];
  let sex = "";
  let grade = "";
  let inCurrentFob = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const hdr = line.match(
      /^(?:(?:Beef\/Dairy|Dairy)\s+)?(Steers|Heifers)\s+-\s+(Medium and Large [12](?:-[23])?|Large [123])\s+\(Per Cwt\)/i,
    );
    if (hdr) {
      sex = hdr[1];
      grade = hdr[2];
      inCurrentFob = false;
      continue;
    }
    if (/^(?:Current\s+)?(?:DEL|Sep|Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug)\s+(?:FOB|DEL)\b/i.test(line) || /^Current DEL\b/i.test(line)) {
      inCurrentFob = false;
      continue;
    }
    if (/^Current FOB\b/i.test(line)) inCurrentFob = true;
    if (!sex || !inCurrentFob) continue;
    const row = line.match(CATTLE_ROW_RE);
    if (!row) continue;
    const head = Number(row[1]);
    const wt = Number(row[4]);
    const lo = Number(row[5]);
    const hi = row[6] ? Number(row[6]) : lo;
    const avg = Number(row[7]);
    if (!Number.isFinite(avg) || avg < 20 || avg > 900) continue;
    const sexTok = /heifer/i.test(sex) ? "feeder-heifer" : "feeder-steer";
    const gradeTok = /2-3/.test(grade)
      ? "ml23"
      : /1-2/.test(grade)
        ? "ml12"
        : /large 3/i.test(grade)
          ? "l3"
          : /large 2/i.test(grade)
            ? "ml2"
            : "ml1";
    const id = ["cattle", `ams_${report.slug}`, token(report.region), sexTok, gradeTok, `${wt}lb`].join(".");
    out.push({
      id,
      group: "cattle",
      commodity: `${sex}`,
      label: `${report.title} ${sex} ${grade} ${wt} lb`,
      market: report.title,
      classGrade: `USDA ${grade}, ${wt} lb, ${head} head`,
      unit: "$/cwt",
      price: roundMoney(avg),
      lo,
      hi,
      asOf,
      source,
      sourceUrl,
      reportDate: asOf,
      series: id,
    });
  }
  const headlines = headlineCattle(out, report, source, sourceUrl, asOf);
  return dedupeTicks([...headlines, ...out]);
}

function headlineCattle(
  rows: AmsTick[],
  report: AmsReport,
  source: string,
  sourceUrl: string,
  asOf: string,
): AmsTick[] {
  const out: AmsTick[] = [];
  for (const sexTok of ["feeder-steer", "feeder-heifer"] as const) {
    const subset = rows.filter((r) => r.id.includes(`.${sexTok}.ml1.`));
    if (subset.length === 0) continue;
    const heads = subset.map((r) => Number(r.classGrade.match(/(\d+) head/)?.[1] ?? 0));
    const total = heads.reduce((a, b) => a + b, 0) || subset.length;
    const price =
      subset.reduce((sum, r, i) => sum + r.price * (heads[i] || 1), 0) / total;
    const id = ["cattle", `ams_${report.slug}`, token(report.region), `${sexTok}s-ml1`].join(".");
    out.push({
      id,
      group: "cattle",
      commodity: sexTok.includes("heifer") ? "Feeder heifers" : "Feeder steers",
      label: `${report.title} ${sexTok.includes("heifer") ? "feeder heifers" : "feeder steers"} ML1`,
      market: report.title,
      classGrade: `USDA Medium and Large 1, ${subset.length} Current FOB prints, ${total} head`,
      unit: "$/cwt",
      price: roundMoney(price),
      asOf,
      source,
      sourceUrl,
      reportDate: asOf,
      series: id,
    });
  }
  return out;
}

export function parseGrainReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const source = `USDA AMS ${report.title} Report (AMS_${report.slug})`;
  const out: AmsTick[] = [];
  let commodity = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const hdr = line.match(/^(?:US\s+#\d+|No\.\s*\d+)\s+(.+?)(?:\s+\(Bulk\))?$/i);
    if (hdr && !/elevator|region\/location|pacific ports/i.test(line)) {
      commodity = hdr[1].replace(/\s+\(Bulk\)$/i, "").trim();
      continue;
    }
    if (!commodity || !/\bCurrent\b/.test(line) || !/Bid\b/i.test(line)) continue;
    const afterUnch = line.match(/\bUNCH\s+(\d+\.\d{2,4})(?:-(\d+\.\d{2,4}))?/);
    const afterMove = line.match(/\b(?:UP|DN)\s+\d+\.\d+\s+(\d+\.\d{2,4})(?:-(\d+\.\d{2,4}))?/);
    const picked = afterUnch ?? afterMove;
    const money = picked
      ? parseMoney(picked[2] ? `${picked[1]}-${picked[2]}` : picked[1])
      : parseMoney(line.match(/(\d+\.\d{2,4}(?:-\d+\.\d{2,4})?)/)?.[1] ?? "");
    if (!money || money.mid < 0.5 || money.mid > 30) continue;
    const protein = line.match(/\b(\d{1,2}\.\d%)\b/)?.[1] ?? line.match(/\bOrdinary\b/i)?.[0] ?? "";
    const id = ["grain", `ams_${report.slug}`, token(report.region), token(commodity), token(protein || "current")].join(".");
    out.push({
      id,
      group: "grain",
      commodity,
      label: `${report.title} ${commodity}${protein ? ` ${protein}` : ""}`,
      market: report.title,
      classGrade: protein ? `${commodity}, ${protein}, Current bid` : `${commodity}, Current bid`,
      unit: "$/bu",
      price: roundMoney(money.mid),
      lo: money.lo,
      hi: money.hi,
      asOf,
      source,
      sourceUrl,
      reportDate: asOf,
      series: id,
    });
  }
  return dedupeTicks(out);
}

const WOOL_MICRON_RE =
  /^(\d{2})\s+\(US\s+([^)]+?)\)\s+(\d+\.\d{2})\s+(?:\([^)]+\)|[0-9.]+)\s+(\d+\.\d{2})\s*-\s*(\d+\.\d{2})\s*$/i;
const WOOL_MERINO_RE =
  /^Merino Clippings\s+(\d+\.\d{2})\s+(?:\([^)]+\)|[0-9.]+)\s+(\d+\.\d{2})\s*-\s*(\d+\.\d{2})\s*$/i;

export function parseWoolReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const source = `USDA AMS ${report.title} Report (AMS_${report.slug})`;
  const out: AmsTick[] = [];
  const market = "Australia AWEX / Charleston, SC";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (/exch rate|passed in|awex emi|bales offered|^greasy\b|^volume \(lbs\)/i.test(line)) continue;
    const micron = line.match(WOOL_MICRON_RE);
    if (micron) {
      const us$ = Number(micron[3]);
      const lo = Number(micron[4]);
      const hi = Number(micron[5]);
      if (!Number.isFinite(us$) || us$ < 0.5 || us$ > 20) continue;
      const grade = micron[2].replace(/\s+/g, " ").trim();
      const id = ["wool", `ams_${report.slug}`, "awex", `${micron[1]}_micron`].join(".");
      out.push({
        id,
        group: "wool",
        commodity: `AWEX ${micron[1]} micron`,
        label: `AWEX ${micron[1]} micron ${grade} (U.S.$ delivered Charleston)`,
        market,
        classGrade: `US ${grade}, clean, delivered Charleston`,
        unit: "$/lb",
        price: roundMoney(us$),
        lo,
        hi,
        asOf,
        source,
        sourceUrl,
        reportDate: asOf,
        series: id,
      });
      continue;
    }
    const merino = line.match(WOOL_MERINO_RE);
    if (merino) {
      const us$ = Number(merino[1]);
      const lo = Number(merino[2]);
      const hi = Number(merino[3]);
      if (!Number.isFinite(us$) || us$ < 0.5 || us$ > 20) continue;
      const id = ["wool", `ams_${report.slug}`, "australia", "merino_clippings"].join(".");
      out.push({
        id,
        group: "wool",
        commodity: "Merino clippings",
        label: "AWEX Merino Clippings (U.S.$ delivered Charleston)",
        market,
        classGrade: "Merino clippings, clean, delivered Charleston",
        unit: "$/lb",
        price: roundMoney(us$),
        lo,
        hi,
        asOf,
        source,
        sourceUrl,
        reportDate: asOf,
        series: id,
      });
    }
  }
  return dedupeTicks(out);
}

function tickBase(
  report: AmsReport,
  sourceUrl: string,
  asOf: string,
): { source: string; asOf: string; sourceUrl: string; reportDate: string } {
  return {
    source: `USDA AMS ${report.title} Report (AMS_${report.slug})`,
    asOf,
    sourceUrl,
    reportDate: asOf,
  };
}

function pushTick(
  out: AmsTick[],
  report: AmsReport,
  sourceUrl: string,
  asOf: string,
  row: Omit<AmsTick, "asOf" | "source" | "sourceUrl" | "reportDate" | "series">,
): void {
  const base = tickBase(report, sourceUrl, asOf);
  out.push({ ...row, ...base, series: row.id });
}

function lastDollarOnLine(line: string): number | null {
  const all = [...line.matchAll(/\$([0-9.]+)/g)];
  if (all.length === 0) return null;
  const n = Number(all[all.length - 1][1]);
  return Number.isFinite(n) ? n : null;
}

/** CME weekly AVERAGE column survives two-column glance wraps. */
function dairyWeeklyTableAverages(text: string): Record<string, number> {
  const block = text.match(/COMMODITY[\s\S]{0,3500}?Prices are USD per lb/i)?.[0] ?? "";
  const out: Record<string, number> = {};
  const rows: { key: string; re: RegExp }[] = [
    { key: "barrels", re: /^\s*BARRELS\b/i },
    { key: "blocks", re: /^\s*BLOCKS\b/i },
    { key: "ndm", re: /^\s*GRADE A\b/i },
    { key: "butter", re: /^\s*GRADE AA\b/i },
    { key: "whey", re: /^\s*EXTRA GRADE\b/i },
  ];
  for (const line of block.split(/\n/)) {
    for (const row of rows) {
      if (out[row.key] != null) continue;
      if (!row.re.test(line)) continue;
      const price = lastDollarOnLine(line);
      if (price != null && price > 0.2 && price < 8) out[row.key] = price;
    }
  }
  return out;
}

export function parseDairyWeeklyReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  const table = dairyWeeklyTableAverages(text);
  const glance = [
    { re: /BUTTER:[\s\S]{0,400}?weekly[\s\S]{0,220}?average for Grade[\s\S]{0,220}?AA is \$([0-9.]+)/i, key: "butter" },
    { re: /weekly average for barrels is \$([0-9.]+)[\s\S]{0,80}?blocks \$([0-9.]+)/i, key: "cheese" },
    { re: /NONFAT DRY MILK:[\s\S]{0,400}?weekly[\s\S]{0,220}?average for Grade A is \$([0-9.]+)/i, key: "ndm" },
    { re: /DRY WHEY:[\s\S]{0,400}?weekly[\s\S]{0,220}?average for dry whey is \$([0-9.]+)/i, key: "whey" },
  ];
  const butterPx = table.butter ?? Number(text.match(glance[0].re)?.[1]);
  if (Number.isFinite(butterPx) && butterPx > 0) {
    pushTick(out, report, sourceUrl, asOf, {
      id: `dairy.ams_${report.slug}.national.butter.grade_aa.weekly`,
      group: "dairy",
      commodity: "Butter",
      label: "AMS Dairy Market News weekly avg Grade AA butter",
      market: report.title,
      classGrade: "CME cash Grade AA, weekly average, $/lb",
      unit: "$/lb",
      price: roundMoney(butterPx),
      lo: butterPx,
      hi: butterPx,
    });
  }
  const cheese = text.match(glance[1].re);
  const barrelPx = table.barrels ?? (cheese ? Number(cheese[1]) : NaN);
  const blockPx = table.blocks ?? (cheese ? Number(cheese[2]) : NaN);
  if (Number.isFinite(barrelPx) && barrelPx > 0) {
    pushTick(out, report, sourceUrl, asOf, {
      id: `dairy.ams_${report.slug}.national.cheese.barrels.weekly`,
      group: "dairy",
      commodity: "Cheese barrels",
      label: "AMS Dairy Market News weekly avg cheese barrels",
      market: report.title,
      classGrade: "CME cash barrels, weekly average, $/lb",
      unit: "$/lb",
      price: roundMoney(barrelPx),
    });
  }
  if (Number.isFinite(blockPx) && blockPx > 0) {
    pushTick(out, report, sourceUrl, asOf, {
      id: `dairy.ams_${report.slug}.national.cheese.blocks.weekly`,
      group: "dairy",
      commodity: "Cheese 40# blocks",
      label: "AMS Dairy Market News weekly avg 40# cheese blocks",
      market: report.title,
      classGrade: "CME cash 40# blocks, weekly average, $/lb",
      unit: "$/lb",
      price: roundMoney(blockPx),
    });
  }
  const ndmPx = table.ndm ?? Number(text.match(glance[2].re)?.[1]);
  if (Number.isFinite(ndmPx) && ndmPx > 0) {
    pushTick(out, report, sourceUrl, asOf, {
      id: `dairy.ams_${report.slug}.national.ndm.grade_a.weekly`,
      group: "dairy",
      commodity: "Nonfat dry milk",
      label: "AMS Dairy Market News weekly avg Grade A NDM",
      market: report.title,
      classGrade: "CME cash Grade A, weekly average, $/lb",
      unit: "$/lb",
      price: roundMoney(ndmPx),
    });
  }
  const wheyPx = table.whey ?? Number(text.match(glance[3].re)?.[1]);
  if (Number.isFinite(wheyPx) && wheyPx > 0) {
    pushTick(out, report, sourceUrl, asOf, {
      id: `dairy.ams_${report.slug}.national.dry_whey.extra.weekly`,
      group: "dairy",
      commodity: "Dry whey",
      label: "AMS Dairy Market News weekly avg extra-grade dry whey",
      market: report.title,
      classGrade: "CME cash extra grade, weekly average, $/lb",
      unit: "$/lb",
      price: roundMoney(wheyPx),
    });
  }
  const classI = text.match(/base Class I price for\s+[A-Za-z]+\s+(\d{4})\s+is \$([0-9.]+)\s+per cwt/i);
  if (classI) {
    pushTick(out, report, sourceUrl, asOf, {
      id: `dairy.ams_${report.slug}.national.class_i.base`,
      group: "dairy",
      commodity: "Class I milk",
      label: `AMS FMMO base Class I ${classI[1]}`,
      market: report.title,
      classGrade: `Advanced base Class I, ${classI[1]}, $/cwt`,
      unit: "$/cwt",
      price: roundMoney(Number(classI[2])),
    });
  }
  return dedupeTicks(out);
}

export function parseDairyDrySummary(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  const compact = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  for (const line of compact) {
    const m = line.match(
      /^(NONFAT DRY MILK - [A-Z/ ]+?|DRY BUTTERMILK|DRY WHEY(?: ANIMAL FEED)?|LACTOSE|WHEY PROTEIN CONCENTRATE(?: 34%)?|DRY WHOLE MILK|CASEIN - (?:ACID|RENNET))\s+(CENTRAL AND EAST|CENTRAL AND WEST|U\.S\. IMPORTS|NORTHEAST|CENTRAL|NATIONAL|WEST)\s+(\d+\.\d{4})\s*-\s*(\d+\.\d{4})/i,
    );
    if (!m) continue;
    const commodity = m[1].trim();
    const region = m[2].trim();
    const lo = Number(m[3]);
    const hi = Number(m[4]);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < 0.2 || hi > 20) continue;
    const mid = (lo + hi) / 2;
    pushTick(out, report, sourceUrl, asOf, {
      id: ["dairy", `ams_${report.slug}`, token(region), token(commodity)].join("."),
      group: "dairy",
      commodity,
      label: `${commodity} ${region}`,
      market: `${report.title} — ${region}`,
      classGrade: `${commodity}, ${region}, FOB $/lb`,
      unit: "$/lb",
      price: roundMoney(mid),
      lo,
      hi,
    });
  }
  return dedupeTicks(out);
}

export function parseDairyFluidReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    const m = line.match(
      /F\.O\.B\.\s+Cream\s+(All Classes|Class II)\s+\$\/LB Butterfat\s+(\d+\.\d{4})\s+(\d+\.\d{4})/i,
    );
    if (!m) continue;
    const lo = Number(m[2]);
    const hi = Number(m[3]);
    if (!Number.isFinite(lo) || lo < 0.5 || hi > 8) continue;
    pushTick(out, report, sourceUrl, asOf, {
      id: ["dairy", `ams_${report.slug}`, token(report.region), "cream", token(m[1]), "butterfat"].join("."),
      group: "dairy",
      commodity: "Cream",
      label: `${report.title} cream ${m[1]} $/lb butterfat`,
      market: report.title,
      classGrade: `FOB cream ${m[1]}, $/lb butterfat`,
      unit: "$/lb butterfat",
      price: roundMoney((lo + hi) / 2),
      lo,
      hi,
    });
  }
  return dedupeTicks(out);
}

export function parseDairyOrganicAds(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  const re =
    /((?:Butter|Cheese|Cream Cheese|Ice Cream|Milk|Sour Cream|Yogurt)[^\n$]{0,40}?)\s+\$(\d+\.\d{2})\s+(?:\$[\d.]+|n\.a\.)/gi;
  for (const m of text.matchAll(re)) {
    const commodity = m[1].replace(/\s+/g, " ").trim();
    const price = Number(m[2]);
    if (!Number.isFinite(price) || price < 0.5 || price > 40) continue;
    if (/n\.a\./i.test(commodity)) continue;
    pushTick(out, report, sourceUrl, asOf, {
      id: ["dairy", `ams_${report.slug}`, "organic_ads", token(commodity)].join("."),
      group: "dairy",
      commodity,
      label: `National organic advertised ${commodity}`,
      market: report.title,
      classGrade: "Weighted average advertised price, organic, this week",
      unit: "$/pkg",
      price: roundMoney(price),
    });
  }
  return dedupeTicks(out);
}

export function parseHogSummary(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  const national = text.match(
    /NATIONAL\s+-\s+AMS[\s\S]{0,400}?Range:\s+\$(\d+\.\d{2})\s+\$(\d+\.\d{2})[\s\S]{0,200}?Weighted Average:\s+\$(\d+\.\d{2})/i,
  );
  if (national) {
    const lo = Number(national[1]);
    const hi = Number(national[2]);
    const avg = Number(national[3]);
    if (avg >= 20 && avg <= 200) {
      pushTick(out, report, sourceUrl, asOf, {
        id: `hogs.ams_${report.slug}.national.negotiated.carcass`,
        group: "hogs",
        commodity: "Negotiated barrow/gilt carcass",
        label: "National negotiated hog carcass base (AMS daily summary)",
        market: report.title,
        classGrade: "Plant delivered, negotiated carcass base, wtd avg",
        unit: "$/cwt",
        price: roundMoney(avg),
        lo,
        hi,
      });
    }
  }
  const ia = text.match(/IOWA\/MINNESOTA[\s\S]{0,200}?Weighted Average:\s+\$(\d+\.\d{2})/i);
  if (ia) {
    const avg = Number(ia[1]);
    if (avg >= 20 && avg <= 200) {
      pushTick(out, report, sourceUrl, asOf, {
        id: `hogs.ams_${report.slug}.iowa_minnesota.negotiated.carcass`,
        group: "hogs",
        commodity: "Negotiated barrow/gilt carcass",
        label: "Iowa/Minnesota negotiated hog carcass base",
        market: report.title,
        classGrade: "Plant delivered, negotiated carcass base, wtd avg",
        unit: "$/cwt",
        price: roundMoney(avg),
      });
    }
  }
  const cutout = text.match(/Carcass Cutout Values\s+(\d+\.\d{2})/i);
  if (cutout) {
    const px = Number(cutout[1]);
    if (px >= 20 && px <= 250) {
      pushTick(out, report, sourceUrl, asOf, {
        id: `hogs.ams_${report.slug}.national.pork.cutout`,
        group: "hogs",
        commodity: "Pork carcass cutout",
        label: "National pork carcass cutout FOB plant",
        market: report.title,
        classGrade: "FOB plant carcass cutout",
        unit: "$/cwt",
        price: roundMoney(px),
      });
    }
  }
  const primals: Array<[RegExp, string, string]> = [
    [/Primal Loin\s+(\d+\.\d{2})/i, "loin", "Pork loin"],
    [/Primal Butt\s+(\d+\.\d{2})/i, "butt", "Pork butt"],
    [/Primal Picnic\s+(\d+\.\d{2})/i, "picnic", "Pork picnic"],
    [/Primal Rib\s+(\d+\.\d{2})/i, "rib", "Pork rib"],
    [/Primal Ham\s+(\d+\.\d{2})/i, "ham", "Pork ham"],
    [/Primal Belly\s+(\d+\.\d{2})/i, "belly", "Pork belly"],
  ];
  for (const [re, tok, name] of primals) {
    const m = text.match(re);
    if (!m) continue;
    const px = Number(m[1]);
    if (px < 20 || px > 400) continue;
    pushTick(out, report, sourceUrl, asOf, {
      id: `hogs.ams_${report.slug}.national.pork.${tok}`,
      group: "hogs",
      commodity: name,
      label: `National ${name.toLowerCase()} primal`,
      market: report.title,
      classGrade: "FOB plant primal",
      unit: "$/cwt",
      price: roundMoney(px),
    });
  }
  const prior = text.match(
    /Carcass Base Price\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})/,
  );
  if (prior) {
    const total = Number(prior[5]);
    if (total >= 20 && total <= 200) {
      pushTick(out, report, sourceUrl, asOf, {
        id: `hogs.ams_${report.slug}.national.prior_day.carcass_total`,
        group: "hogs",
        commodity: "Prior-day slaughtered swine carcass",
        label: "National prior-day producer-sold carcass base (total)",
        market: report.title,
        classGrade: "Prior day slaughtered swine, producer sold, total",
        unit: "$/cwt",
        price: roundMoney(total),
      });
    }
  }
  return dedupeTicks(out);
}

export function parseOrganicGrainReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  let commodity = "";
  let unit = "$/bu";
  let group: AmsGroup = "grain";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const hdr = line.match(/^(US\s+#\d+\s+.+?|Soybean Meal|Alfalfa(?:[ -].+)?|Timothy(?:[ -].+)?|Grass Hay.+?)\s+\(Bulk\s+-\s+\$\/(Bu|Ton)\)/i);
    if (hdr) {
      commodity = hdr[1].trim();
      unit = hdr[2].toLowerCase() === "ton" ? "$/ton" : "$/bu";
      group = /hay|alfalfa|timothy|straw/i.test(commodity) ? "hay" : "grain";
      continue;
    }
    if (!commodity) continue;
    const spot = line.match(
      /^(National|Midwest|Central|Northeast|West)\s+(Grower|Dealer)\s+Spot\s+Current\s+(\d+\.\d{2})\s*-\s*(\d+\.\d{2})(?:\s+(\d+\.\d{2}))?/i,
    );
    if (!spot) continue;
    const lo = Number(spot[3]);
    const hi = Number(spot[4]);
    const avg = spot[5] ? Number(spot[5]) : (lo + hi) / 2;
    const hiBound = unit === "$/ton" ? 2000 : 80;
    if (!Number.isFinite(avg) || avg < 1 || avg > hiBound) continue;
    const id = [
      group,
      `ams_${report.slug}`,
      "organic",
      token(spot[1]),
      token(commodity),
      "spot",
    ].join(".");
    pushTick(out, report, sourceUrl, asOf, {
      id,
      group,
      commodity: `Organic ${commodity}`,
      label: `Organic ${commodity} ${spot[1]} spot ${spot[2]}`,
      market: `${report.title} — ${spot[1]}`,
      classGrade: `Organic ${commodity}, ${spot[2]} spot current, ${unit}`,
      unit,
      price: roundMoney(avg),
      lo,
      hi,
    });
  }
  return dedupeTicks(out);
}

const FV_ORIGINS = [
  "CALIFORNIA",
  "CENTRAL COAST CALIFORNIA",
  "SAN JOAQUIN VALLEY CALIFORNIA",
  "NEW YORK",
  "NEW JERSEY",
  "WASHINGTON",
  "OREGON",
  "TEXAS",
  "FLORIDA",
  "MEXICO",
  "PERU",
  "CHILE",
  "CANADA",
  "ARGENTINA",
  "SOUTH AFRICA",
  "MOROCCO",
  "GUATEMALA",
  "ECUADOR",
  "HONDURAS",
  "COSTA RICA",
  "COLOMBIA",
  "CHINA",
  "AUSTRALIA",
  "NEW ZEALAND",
  "INDIANA",
  "MARYLAND",
  "VIRGINIA",
  "NORTH CAROLINA",
  "DELAWARE",
  "PENNSYLVANIA",
  "HAWAII",
  "ARIZONA",
  "MICHIGAN",
  "GEORGIA",
  "IDAHO",
];

export function parseProduceTerminal(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  const blocks = text.split(/---([A-Z][A-Z0-9 ,./()'-]{1,48}):/);
  for (let i = 1; i < blocks.length; i += 2) {
    const commodity = blocks[i].trim();
    const body = (blocks[i + 1] || "").replace(/\s+/g, " ");
    if (/INSUFFICIENT TO QUOTE/i.test(body) && !/\d+\.\d{2}/.test(body)) continue;
    const originRe = new RegExp(`\\b(${FV_ORIGINS.slice().sort((a, b) => b.length - a.length).join("|")})\\b`, "gi");
    const parts: { origin: string; chunk: string }[] = [];
    let last = 0;
    let origin = "";
    for (const m of body.matchAll(originRe)) {
      if (origin && m.index != null) {
        parts.push({ origin, chunk: body.slice(last, m.index) });
      }
      origin = (m[1] || "").toUpperCase();
      last = (m.index ?? 0) + m[0].length;
    }
    if (origin) parts.push({ origin, chunk: body.slice(last) });
    let added = 0;
    for (const part of parts) {
      if (added >= 8) break;
      if (/holdovers|one lot|one job|insufficient/i.test(part.chunk.slice(0, 24))) continue;
      const mostly = part.chunk.match(/mostly\s+(\d+\.\d{2})(?:-(\d+\.\d{2}))?/i);
      const first = part.chunk.match(/(\d+\.\d{2})(?:-(\d+\.\d{2}))?/);
      const picked = mostly ?? first;
      if (!picked) continue;
      const lo = Number(picked[1]);
      const hi = picked[2] ? Number(picked[2]) : lo;
      if (!Number.isFinite(lo) || lo < 1 || hi > 500) continue;
      if (/holdovers\s+\d+\.\d{2}/i.test(part.chunk) && !mostly && first && part.chunk.indexOf(first[0]) > part.chunk.search(/holdovers/i)) {
        continue;
      }
      const id = ["produce", `ams_${report.slug}`, token(report.region), token(commodity), token(part.origin)].join(".");
      pushTick(out, report, sourceUrl, asOf, {
        id,
        group: "produce",
        commodity,
        label: `${report.title} ${commodity} ${part.origin}`,
        market: report.title,
        classGrade: `${commodity}, ${part.origin}, wholesale terminal`,
        unit: "$/pkg",
        price: roundMoney((lo + hi) / 2),
        lo,
        hi,
      });
      added += 1;
    }
  }
  return dedupeTicks(out);
}

export function parseAmsReportText(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  if (report.group === "hay") return parseHayReport(text, report, sourceUrl);
  if (report.group === "cattle") return parseCattleReport(text, report, sourceUrl);
  if (report.group === "wool") return parseWoolReport(text, report, sourceUrl);
  if (report.group === "dairy") {
    if (report.slug === "2998") return parseDairyWeeklyReport(text, report, sourceUrl);
    if (report.slug === "1598") return parseDairyDrySummary(text, report, sourceUrl);
    if (report.slug === "2997") return parseDairyOrganicAds(text, report, sourceUrl);
    return parseDairyFluidReport(text, report, sourceUrl);
  }
  if (report.group === "hogs") return parseHogSummary(text, report, sourceUrl);
  if (report.group === "produce") return parseProduceTerminal(text, report, sourceUrl);
  if (report.slug === "3802" || /organic grain/i.test(report.title)) {
    return parseOrganicGrainReport(text, report, sourceUrl);
  }
  return parseGrainReport(text, report, sourceUrl);
}

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function dedupeTicks(rows: AmsTick[]): AmsTick[] {
  const seen = new Set<string>();
  const out: AmsTick[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("TICKS_AMS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw new Error(`pdftotext failed: ${result.error.message}`);
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim() || `exit ${result.status}`;
    throw new Error(`pdftotext failed: ${err}`);
  }
  return result.stdout || "";
}

function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

async function fetchBytes(url: string): Promise<{ url: string; bytes: Uint8Array; contentType: string }> {
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,application/octet-stream,*/*" },
        redirect: "follow",
      });
      if (res.status === 403 && attempt < 2) {
        lastErr = `${url} HTTP 403`;
        await pause(1500 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      return { url: res.url || url, bytes, contentType: res.headers.get("content-type") ?? "" };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      if (attempt < 2 && /HTTP 403/.test(lastErr)) {
        await pause(1500 * (attempt + 1));
        continue;
      }
      throw err instanceof Error ? err : new Error(lastErr);
    }
  }
  throw new Error(lastErr || `${url} HTTP 403`);
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": HTTP_UA, Accept: "text/html,*/*" } });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function officialPdfCandidates(report: AmsReport): Promise<string[]> {
  const esmisUrls: string[] = [];
  if (report.esmisPublication) {
    try {
      const html = await fetchText(esmisPublicationUrl(report));
      esmisUrls.push(...esmisPdfUrls(html, report.slug, report.pdfNames ?? []));
    } catch {
      /* mnreports still tried */
    }
  }
  return officialPdfCandidateOrder(report.slug, esmisUrls, report.pdfNames ?? []);
}

export async function resolveOfficialPdfUrl(report: AmsReport): Promise<string> {
  return (await officialPdfCandidates(report))[0] ?? MNREPORTS_PDF(report.slug);
}

export function readAmsSnapshot(dir = amsNationalDir()): AmsSnapshot | null {
  const path = amsSnapshotPath(dir);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const rows = Array.isArray((parsed as AmsSnapshot).rows) ? (parsed as AmsSnapshot).rows : [];
    return { ...(parsed as AmsSnapshot), rows };
  } catch {
    return null;
  }
}

export function writeAmsSnapshot(snap: AmsSnapshot, dir = amsNationalDir()): string {
  mkdirSync(dir, { recursive: true });
  const path = amsSnapshotPath(dir);
  writeFileSync(path, `${JSON.stringify(snap, null, 2)}\n`);
  return path;
}

export function mergeAmsNationalTicks<T extends {
  ticks?: unknown[];
  failed?: unknown[];
  sources?: string[];
  status?: string;
  reason?: string | null;
}>(payload: T, snap: AmsSnapshot | null = readAmsSnapshot()): T {
  if (!snap || snap.rows.length === 0) return payload;
  const ticks = Array.isArray(payload.ticks) ? [...payload.ticks] : [];
  const have = new Set(
    ticks
      .map((row) => (row && typeof row === "object" ? String((row as { id?: unknown }).id ?? "") : ""))
      .filter(Boolean),
  );
  for (const row of snap.rows) {
    if (have.has(row.id)) continue;
    ticks.push(row);
    have.add(row.id);
  }
  const failed = Array.isArray(payload.failed) ? [...payload.failed] : [];
  const failedIds = new Set(
    failed
      .map((row) => (row && typeof row === "object" ? String((row as { id?: unknown }).id ?? "") : ""))
      .filter(Boolean),
  );
  for (const row of snap.failed) {
    if (failedIds.has(row.id)) continue;
    failed.push(row);
    failedIds.add(row.id);
  }
  const sources = [...(payload.sources ?? [])];
  for (const name of snap.sources) {
    if (!sources.includes(name)) sources.push(name);
  }
  const hasTicks = ticks.length > 0;
  return {
    ...payload,
    ticks,
    failed,
    sources,
    status: hasTicks ? "ok" : payload.status,
    reason: hasTicks ? null : payload.reason,
  };
}

export async function collectAmsNational(opts?: { dir?: string; pauseMs?: number }): Promise<AmsSnapshot> {
  const dir = opts?.dir ?? amsNationalDir();
  const pauseMs = opts?.pauseMs ?? Number(env("TICKS_AMS_PAUSE_MS") || "1200");
  const rows: AmsTick[] = [];
  const failed: AmsFailed[] = [];
  const sources: string[] = [];
  mkdirSync(dir, { recursive: true });
  const tmpDir = join(dir, "tmp");
  mkdirSync(tmpDir, { recursive: true });

  for (const report of AMS_NATIONAL_REPORTS) {
    const label = `AMS_${report.slug} ${report.title}`;
    const candidates = await officialPdfCandidates(report);
    let parsed: AmsTick[] = [];
    let usedUrl = candidates[0] ?? MNREPORTS_PDF(report.slug);
    let lastErr = "";
    for (const pdfUrl of candidates) {
      try {
        const fetched = await fetchBytes(pdfUrl);
        if (!isPdf(fetched.bytes)) {
          lastErr = `official host did not return a PDF (content-type ${fetched.contentType || "unknown"})`;
          continue;
        }
        const pdfPath = join(tmpDir, `AMS_${report.slug}.pdf`);
        writeFileSync(pdfPath, fetched.bytes);
        const text = pdfToText(pdfPath);
        parsed = parseAmsReportText(text, report, pdfUrl);
        usedUrl = pdfUrl;
        if (parsed.length > 0) break;
        lastErr = "official PDF had no parseable hay/cattle/grain/wool/dairy/hogs/produce print";
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
      }
    }
    if (parsed.length > 0) {
      rows.push(...parsed);
      sources.push(label);
    } else {
      failed.push({
        id: `ams_${report.slug}`,
        source: label,
        sourceUrl: usedUrl,
        reason: lastErr || "no official PDF body",
      });
    }
    if (pauseMs > 0) await pause(pauseMs);
  }

  const asOf = rows.map((r) => r.asOf).sort().at(-1) ?? null;
  const snap: AmsSnapshot = {
    ok: true,
    product: PRODUCT_ID,
    fetchedAt: new Date().toISOString(),
    asOf,
    tickCount: rows.length,
    rows,
    failed,
    sources,
  };
  writeAmsSnapshot(snap, dir);
  return snap;
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectAmsNational()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            product: snap.product,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            tickCount: snap.tickCount,
            sources: snap.sources,
            failed: snap.failed,
            snapshot: amsSnapshotPath(),
            ids: snap.rows.map((r) => r.id),
          },
          null,
          2,
        ),
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

