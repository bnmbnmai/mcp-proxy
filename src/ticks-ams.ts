/**
 * Nationwide USDA AMS hay / cattle / grain / wool / dairy / hogs / produce report bodies
 * for the existing GET /ticks door. Official PDFs (and NAL/esmis archive copies).
 * Same product: idaho-hay-feeder-ticks. Does not open a new SKU. Does not wrap marsapi
 * (403 without a key), LMR datamart JSON, NASS Quick Stats, WASDE/PSD/ESR, CME APIs,
 * the National Feeder dashboard, or SJ_LS850.txt.
 * AMS_2911 National Wool Review is public-domain 17 USC 105; parse the official PDF only.
 * AMS_2872 National Daily Hog and Pork Summary is the official AMS public PDF, not an
 * LMR dashboard / datamart wrap. Individual LM_HG* / LM_PK* PDFs stay skipped.
 * AMS_2810 National Direct Feeder Pig is the official AMS voluntary weekly print.
 * AMS_2843 Daily National Shell Egg Index is the official LPGMN public PDF; rows
 * land on the existing dairy/protein table.
 * AMS_1095 National Weekly Cold Storage (MD_DA953) is the official Dairy Market
 * News PDF of selected-center butter/cheese holdings. Holdings are 1,000 lb
 * inventory prints — not CME/NDPSR $/lb — so they get their own dairy.ams_1095.*
 * rows instead of overwriting existing butter/cheese price series. Do not wrap
 * NASS monthly Cold Storage txt/Quick Stats.
 * AMS_3646 Weekly National Chicken is the official LPGMN POS poultry PDF; rows
 * land on the existing dairy/protein table (dairy.ams_3646.*). Current-week
 * cents/lb weighted averages only — previous-week reprint is not a tick.
 * AMS_3647 Weekly National Turkey is the official sibling LPGMN POS turkey
 * weekly (mnreports/ams_3647.pdf). Rows land on the same dairy/protein table
 * (dairy.ams_3647.*). Current-week cents/lb weighted averages only —
 * previous-week / year-ago reprints are not ticks. Grocery turkey feature ads
 * AMS_2867 are not a substitute. AMS_3725 Egg Markets Overview stays leftover
 * narrative (not the turkey weekly).
 * Weekly grocery / retail feature ads fatten the same $0.05 bag: AMS_2995 dairy
 * ads already live; siblings AMS_2756 chicken, AMS_2757 eggs, AMS_2867 turkey,
 * AMS_2868 pork, AMS_3228 beef, AMS_3229 lamb, AMS_3796 veal land as
 * dairy.ams_* grocery-ad rows. AMS_3324 / fvwretail specialty-crops grocery
 * ads land on the existing produce group. Current-week advertised wtd avg
 * only — previous-week / year-ago reprints and regional detail pages are not
 * ticks. Official bodies are ugly mnreports PDFs (marsapi 403; LMR datamart
 * "Invalid slug id").
 * AMS_3024 Weekly Cotton Market Review is the official Cotton Program weekly
 * (mnreports/cnwwcmr.pdf — ams_3024.pdf is 404). Rows land on the existing
 * grain table as grain.ams_3024.cotton.*. Current-week price prints only —
 * year-ago fluff, quality charts, and weather narrative are not ticks.
 * Daily AMS_3804 spot quotations and cnwwqo quality stay leftover. Do not
 * wrap MARS / MMN JSON (403 without a key).
 * Water District 1 rental-pool $/AF is not an AMS source and stays off this table.
 *
 * Prefer live mnreports over NAL/esmis archives. Collect used to unshift ESMIS first and
 * keep the first parseable PDF — that left many Direct Hay/Cattle/Grain rows on Sept 2025
 * NAL copies while official still published Aug 2026 bodies on ams.usda.gov/mnreports.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { AMS_LEFTOVER_REPORTS, AMS_LEFTOVER_SLUGS } from "./ticks-ams-leftovers.js";

export { AMS_LEFTOVER_REPORTS, AMS_LEFTOVER_SLUGS };

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
  ...AMS_LEFTOVER_REPORTS,
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
  { slug: "3024", group: "grain", region: "national", title: "Weekly Cotton Market Review", esmisPublication: "weekly-cotton-market-review", pdfNames: ["cnwwcmr"] },
  { slug: "2911", group: "wool", region: "national", title: "National Wool Review", esmisPublication: "national-wool-review-fri" },
  { slug: "2998", group: "dairy", region: "national", title: "Dairy Market News Weekly Report", esmisPublication: "dairy-market-news-weekly-report", pdfNames: ["dywweeklyreport"] },
  { slug: "2993", group: "dairy", region: "national", title: "National Dairy Products Sales Report", esmisPublication: "", pdfNames: ["dywdairyproductssales"] },
  { slug: "2995", group: "dairy", region: "national_retail", title: "Grocery Store Dairy Feature", esmisPublication: "", pdfNames: ["dybretail"] },
  { slug: "2756", group: "dairy", region: "national_retail", title: "Grocery Store Chicken Feature", esmisPublication: "" },
  { slug: "2757", group: "dairy", region: "national_retail", title: "Grocery Store Egg Feature", esmisPublication: "" },
  { slug: "2867", group: "dairy", region: "national_retail", title: "Grocery Store Turkey Feature", esmisPublication: "" },
  { slug: "2868", group: "dairy", region: "national_retail", title: "Grocery Store Pork Feature", esmisPublication: "" },
  { slug: "3228", group: "dairy", region: "national_retail", title: "Grocery Store Beef Feature", esmisPublication: "" },
  { slug: "3229", group: "dairy", region: "national_retail", title: "Grocery Store Lamb Feature", esmisPublication: "" },
  { slug: "3796", group: "dairy", region: "national_retail", title: "Grocery Store Veal Feature", esmisPublication: "" },
  { slug: "1598", group: "dairy", region: "national", title: "Dry Products Price Summary", esmisPublication: "" },
  { slug: "1045", group: "dairy", region: "central", title: "Dry Whey Central", esmisPublication: "" },
  { slug: "1048", group: "dairy", region: "west", title: "Nonfat Dry Milk West", esmisPublication: "" },
  { slug: "1051", group: "dairy", region: "national", title: "Casein US", esmisPublication: "" },
  { slug: "1052", group: "dairy", region: "central_west", title: "Lactose Central and West", esmisPublication: "" },
  { slug: "1101", group: "dairy", region: "east", title: "Fluid Milk and Cream East", esmisPublication: "" },
  { slug: "1100", group: "dairy", region: "central", title: "Fluid Milk and Cream Central", esmisPublication: "" },
  { slug: "1102", group: "dairy", region: "west", title: "Fluid Milk and Cream West", esmisPublication: "" },
  { slug: "2997", group: "dairy", region: "national_organic", title: "Organic Dairy Market News", esmisPublication: "", pdfNames: ["dybdairyorganic"] },
  { slug: "2843", group: "dairy", region: "national", title: "Daily National Shell Egg Index", esmisPublication: "" },
  { slug: "1095", group: "dairy", region: "national", title: "National Weekly Cold Storage", esmisPublication: "weekly-cold-storage-holdings", pdfNames: ["md_da953"] },
  { slug: "3646", group: "dairy", region: "national", title: "Weekly National Chicken", esmisPublication: "" },
  { slug: "3647", group: "dairy", region: "national", title: "Weekly National Turkey", esmisPublication: "" },
  { slug: "2872", group: "hogs", region: "national", title: "National Daily Hog and Pork Summary", esmisPublication: "national-daily-hog-pork-summary-report", pdfNames: ["lsddhps"] },
  { slug: "2810", group: "hogs", region: "national", title: "National Direct Feeder Pig", esmisPublication: "" },
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
  { slug: "3324", group: "produce", region: "national_retail", title: "Grocery Store Specialty Crops Feature", esmisPublication: "", pdfNames: ["fvwretail"] },
];

export const SKIPPED_SOURCES = [
  { id: "marsapi", why: "marsapi.ams.usda.gov/services/v1.1/reports/{slug} returns HTTP 403 without an API key — not a no-auth JSON body" },
  { id: "lmr-datamart", why: "mpr.datamart.ams.usda.gov already exposes LMR cattle as no-auth JSON — skip wrapping that body" },
  { id: "feeder-dashboard", why: "National Feeder & Stocker Cattle Dashboard is a web app, not an ugly PDF/HTML report body" },
  { id: "SJ_LS850", why: "https://www.ams.usda.gov/mnreports/SJ_LS850.txt already returns the official plaintext body" },
  { id: "nass-quick-stats", why: "documented no-auth JSON API — KILL" },
  { id: "nass-monthly-cold-storage", why: "NASS monthly Cold Storage txt/Quick Stats is free structured NASS — KILL; official AMS_1095 weekly PDF is the cold-storage print on this door" },
  { id: "wasde-psd-esr", why: "documented no-auth USDA JSON/CSV — KILL" },
  { id: "ams_3056_3057_3058_3059_2914", why: "already collected on /ticks (Idaho/Oregon/Columbia Basin hay, NW Direct cattle, PNW pulses)" },
  { id: "no-il-ga-direct-hay", why: "AMS hay listing has no Illinois or Georgia Direct Hay report — IL hay is auction-barn PDFs already wired" },
  { id: "retired-city-grain-txt", why: "sj_gr851 / gx_gr110 / wh_gr110 / jc_gr111 are retired or already plaintext city grain .txt — skip wrapping" },
  { id: "ams_3045_minneapolis_basis", why: "AMS_3045 Minneapolis Daily Basis is a MIAX floor-basis sheet, not a POS bid table" },
  { id: "se-individual-cattle-barns", why: "400+ remaining official SE/Midwest individual sale-barn PDFs stay off this slice; five current official SE barns (1988/1946/1995/1419/1997) + nine SE weeklies are on /ticks. Not a new SKU." },
  { id: "se-weekly-cattle-summaries", why: "AL/FL/GA/KY/TN/VA/NC/MS/SC weeklies now on /ticks; leftover WV/PA/IN/IL/MO regional weeklies stay off this pass" },
  { id: "seasonal-specials", why: "official seasonal/replacement/stock-show specials often empty off-season; skip rather than invent" },
  { id: "video-internet-auctions", why: "feeder cattle internet/video/board sales are a different AMS family than sale-barn floor sheets" },
  { id: "lmr-slaughter-pdfs", why: "national/regional Direct Slaughter PDFs are LMR fed-cattle tables, not the feeder/POS parser this door already sells" },
  { id: "plaintext-recaps", why: "lswalabama / lswkssum / CO_LS146.txt already return official plaintext — do not wrap" },
  { id: "facebook-private-barns", why: "Facebook barns, private sale-barn homepages, and Treasure Valley Caldwell stay out — no dated official PDF/HTML print" },
  { id: "gis-echo-family-herd", why: "GIS wraps, EPA ECHO, and the sold family herd ledger are not /ticks rows" },
  { id: "new-x402-door", why: "no per-barn / per-state / per-region SKU; extra official rows stay on GET /ticks" },
  { id: "ams_2911_marsapi", why: "marsapi /services/v1.2/reports/2911 returns HTTP 403 without a key — parse the official mnreports PDF only" },
  { id: "lmr-hog-pdfs", why: "LM_HG203/206/210/212, LM_PK602, LM_HG201, AMS_3458/2498/2510/2675 are LMR licensed tables; parse official AMS_2872 / lsddhps summary PDF and AMS_2810 feeder-pig voluntary print only — do not wrap LMR dashboards" },
  { id: "cme-cash-trading-doors", why: "dedicated CME cash slugs 1599-1602 wrap CME; weekly AMS_2998 already prints Dairy Market News weekly averages from that cash table" },
  { id: "dairy-regional-narrative", why: "AMS_1090/1089/1091 butter and AMS_1084/1083/1085/1092 cheese regional PDFs printed overages/narrative this week, not dollar prints — skip rather than invent" },
  { id: "dairy-gdt-farmers-markets", why: "GDT 1604, farmers-market dairy, and international DMN PDFs are a leftover dairy slice; not this pass" },
  { id: "dairy-waf-empty", why: "AMS_1043/1044/1046/1047/1049/1050/1053 regional dry slugs 403 WAF on this VM — skip rather than leave silent holes" },
  { id: "ams_3096_waf", why: "AMS_3096 Eastern Cornbelt Direct Feeder Cattle mnreports 403 WAF; drop rather than leave a silent empty" },
  { id: "se-swine-auction-barns", why: "individual AMS swine-auction barn PDFs leftover — not a national sale-barn mill; AMS_2872 summary + AMS_2810 feeder pig are this hog slice" },
  { id: "sheep-goats", why: "official AMS sheep/lamb/goat sale-barn and LMR boxed-lamb LM_XL* leftover; grocery lamb/veal feature ads AMS_3229/3796 are already on /ticks" },
  { id: "poultry-eggs", why: "leftover official AMS broiler-glance/breaking-stock PDFs stay off this slice; AMS_2843 Daily Shell Egg Index, AMS_3646 Weekly National Chicken, AMS_3647 Weekly National Turkey, and grocery feature ads AMS_2756/2757/2867 are already on /ticks dairy rows" },
  { id: "ams-3725-egg-overview", why: "AMS_3725 Egg Markets Overview is weekly narrative + charts, not a tabular poultry/protein print; do not scrape prose prices. Daily eggs are AMS_2843; retail egg ads are AMS_2757. Official turkey weekly is AMS_3647, not 3725" },
  { id: "cotton-rice", why: "official AMS rice PDFs leftover. Daily AMS_3804 / Daily Spot Cotton Quotations and weekly quality cnwwqo stay leftover. Weekly Cotton Market Review (AMS_3024 / cnwwcmr) is already on /ticks grain rows" },
  { id: "remaining-fv-terminals", why: "Asheville/Columbia/Raleigh/Baltimore/nuts, FV030 onion-potato city sheets, and discontinued MX_FV010 Mexico City leftover; NY/CHI/LA/ATL/DET/PHL/BOS fruit+veg are the national terminal slice. Grocery produce ads are AMS_3324 / fvwretail" },
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
  const weeksEnding = text.match(
    /Weeks Ending:\s+\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  if (weeksEnding) return parseMdY(weeksEnding[1]);
  const endingNamed = text.match(
    /week ending\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/i,
  );
  if (endingNamed) {
    const mon = MONTHS[endingNamed[1].toLowerCase()];
    if (mon) return `${endingNamed[3]}-${mon}-${endingNamed[2].padStart(2, "0")}`;
  }
  const ending = text.match(/week ending\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (ending) return parseMdY(ending[1]);
  const livestockThru = text.match(
    /Livestock Weighted Average Report for\s+\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  if (livestockThru) return parseMdY(livestockThru[1]);
  const livestockDay = text.match(
    /Livestock Weighted Average Report for\s+(\d{1,2}\/\d{1,2}\/\d{4})\b/i,
  );
  if (livestockDay) return parseMdY(livestockDay[1]);
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
  const woolThru = text.match(/Report For:\s*\d{1,2}\/\d{1,2}\/\d{4}\s+(?:thru|to)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
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
    const dairyHdr = line.match(
      /^DAIRY (STEERS|HEIFERS)\s+-\s+(Medium and Large [12](?:-[23])?|Large [123](?:-[23])?)\s+\(Per Cwt/i,
    );
    if (dairyHdr) {
      sex = `DAIRY ${dairyHdr[1]}`;
      grade = dairyHdr[2];
      inFeeder = true;
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
    const sexTok = /dairy/i.test(sex)
      ? /heifer/i.test(sex)
        ? "dairy-heifer"
        : "dairy-steer"
      : /heifer/i.test(sex)
        ? "feeder-heifer"
        : "feeder-steer";
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
      commodity: /dairy/i.test(sex)
        ? /heifer/i.test(sex)
          ? "Dairy heifers"
          : "Dairy steers"
        : /heifer/i.test(sex)
          ? "Heifers"
          : "Steers",
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
  if (out.length > 0) {
    const headlines = headlineCattle(out, report, source, sourceUrl, asOf);
    return dedupeTicks([...headlines, ...out]);
  }
  // Cow sales (Torrington Friday AMS_2101) print slaughter cows/bulls and
  // replacement stock $/cwt with no steer/heifer rows. Those are the ticks.
  // Per-unit bred cows are $/head, not this $/cwt series. A sheet with neither
  // feeder nor slaughter/stock prices stays empty — do not invent.
  return parseAuctionCowSale(text, report, source, sourceUrl, asOf);
}

const SLAUGHTER_CLASS_HDR =
  /^(COWS|BULLS)\s+-\s+(.+?)\s+\(Per Cwt\s*\/\s*Actual Wt\)/i;
const REPLACEMENT_CLASS_HDR =
  /^(STOCK COWS|BRED COWS)\s+-\s+(.+?)\s+\((Per Cwt|Per Unit)\s*\/\s*Actual Wt\)/i;
const REPLACEMENT_ROW_RE =
  /^(>?\d+(?:-\d+)?)\s+(O|T\d(?:-\d)?)\s+(\d+)\s+(\d+)(?:-(\d+))?\s+(\d+)\s+(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?\s+(\d+(?:\.\d+)?)/i;

function auctionCowGradeTok(grade: string): string {
  if (/boner/i.test(grade)) return "boner";
  if (/breaker/i.test(grade)) return "breaker";
  if (/lean/i.test(grade)) return "lean";
  if (/2-3/.test(grade)) return "ml23";
  if (/1-2/.test(grade) && /medium|large/i.test(grade)) return "ml12";
  if (/^1-2$/i.test(grade.trim())) return "12";
  if (/large 3/i.test(grade)) return "l3";
  if (/large 2/i.test(grade)) return "l2";
  if (/medium and large 2/i.test(grade)) return "ml2";
  if (/medium and large 1/i.test(grade)) return "ml1";
  if (/large 1/i.test(grade)) return "l1";
  return token(grade);
}

function auctionAgeTok(age: string): string {
  return token(age.replace(/^>/, "over ").replace(/^</, "under "));
}

/** Slaughter cows/bulls and replacement stock cows when the feeder table is empty. */
function parseAuctionCowSale(
  text: string,
  report: AmsReport,
  source: string,
  sourceUrl: string,
  asOf: string,
): AmsTick[] {
  const out: AmsTick[] = [];
  let section: "" | "slaughter" | "replacement" = "";
  let sex = "";
  let grade = "";
  let perUnit = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (/^SLAUGHTER CATTLE$/i.test(line)) {
      section = "slaughter";
      sex = "";
      grade = "";
      perUnit = false;
      continue;
    }
    if (/^REPLACEMENT CATTLE$/i.test(line)) {
      section = "replacement";
      sex = "";
      grade = "";
      perUnit = false;
      continue;
    }
    if (/^(FEEDER CATTLE|FEEDER SHEEP|SLAUGHTER SHEEP|SLAUGHTER GOAT|PLEASE NOTE|EXPLANATORY NOTES|SOURCE:)\b/i.test(line)) {
      section = "";
      sex = "";
      grade = "";
      perUnit = false;
      continue;
    }
    const slaughterHdr = section === "slaughter" ? line.match(SLAUGHTER_CLASS_HDR) : null;
    if (slaughterHdr) {
      sex = slaughterHdr[1];
      grade = slaughterHdr[2];
      perUnit = false;
      continue;
    }
    const replacementHdr = section === "replacement" ? line.match(REPLACEMENT_CLASS_HDR) : null;
    if (replacementHdr) {
      sex = replacementHdr[1];
      grade = replacementHdr[2];
      perUnit = /unit/i.test(replacementHdr[3]);
      continue;
    }
    if (!sex || !section || perUnit) continue;
    if (section === "slaughter") {
      const row = line.match(AUCTION_CATTLE_ROW);
      if (!row) continue;
      const head = Number(row[1]);
      const wt = Number(row[4]);
      const lo = Number(row[5]);
      const hi = row[6] ? Number(row[6]) : lo;
      const avg = Number(row[7]);
      if (!Number.isFinite(avg) || avg < 20 || avg > 900) continue;
      if (!Number.isFinite(wt) || wt < 400 || wt > 3200) continue;
      const bulls = /bull/i.test(sex);
      const sexTok = bulls ? "slaughter-bull" : "slaughter-cow";
      const gradeTok = auctionCowGradeTok(grade);
      const dressing = line.slice(row[0].length).trim();
      const id = ["cattle", `ams_${report.slug}`, token(report.region), sexTok, gradeTok, `${wt}lb`].join(".");
      out.push({
        id,
        group: "cattle",
        commodity: bulls ? "Slaughter bulls" : "Slaughter cows",
        label: `${report.title} ${sex} ${grade} ${wt} lb`,
        market: report.title,
        classGrade: `USDA ${grade}, ${wt} lb, ${head} head${dressing ? `, ${dressing}` : ""}`,
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
      continue;
    }
    if (!/stock/i.test(sex)) continue;
    const row = line.match(REPLACEMENT_ROW_RE);
    if (!row) continue;
    const age = row[1];
    const stage = row[2];
    const head = Number(row[3]);
    const wt = Number(row[6]);
    const lo = Number(row[7]);
    const hi = row[8] ? Number(row[8]) : lo;
    const avg = Number(row[9]);
    if (!Number.isFinite(avg) || avg < 20 || avg > 900) continue;
    if (!Number.isFinite(wt) || wt < 400 || wt > 3200) continue;
    const gradeTok = auctionCowGradeTok(grade);
    const id = [
      "cattle",
      `ams_${report.slug}`,
      token(report.region),
      "replacement-stock-cow",
      gradeTok,
      auctionAgeTok(age),
      token(stage),
      `${wt}lb`,
    ].join(".");
    out.push({
      id,
      group: "cattle",
      commodity: "Stock cows",
      label: `${report.title} ${sex} ${grade} ${wt} lb`,
      market: report.title,
      classGrade: `USDA ${grade}, ${wt} lb, ${head} head, age ${age}, stage ${stage}`,
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
  return dedupeTicks(out);
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
  const fmmo = dairyFmmoClassPrices(text);
  const fmmoYear = text.match(/FEDERAL MILK ORDER CLASS PRICES FOR\s+(\d{4})/i)?.[1] ?? asOf.slice(0, 4);
  const fmmoRows: Array<[string, string, string]> = [
    ["class_i", "Class I milk", "base"],
    ["class_ii", "Class II milk", ""],
    ["class_iii", "Class III milk", ""],
    ["class_iv", "Class IV milk", ""],
  ];
  for (const [key, commodity, suffix] of fmmoRows) {
    const px = fmmo[key];
    if (px == null) continue;
    const idSuffix = suffix ? `${key}.${suffix}` : key;
    pushTick(out, report, sourceUrl, asOf, {
      id: `dairy.ams_${report.slug}.national.${idSuffix}`,
      group: "dairy",
      commodity,
      label: `AMS FMMO ${commodity} ${fmmoYear}`,
      market: report.title,
      classGrade: `FMMO ${commodity}, ${fmmoYear}, $/cwt`,
      unit: "$/cwt",
      price: roundMoney(px),
    });
  }
  return dedupeTicks(out);
}

function dairyFmmoClassPrices(text: string): Record<string, number> {
  const block =
    text.match(/FEDERAL MILK ORDER CLASS PRICES[\s\S]{0,900}?(?:Further information|NATIONAL DAIRY PRODUCTS)/i)?.[0] ??
    "";
  const out: Record<string, number> = {};
  const rows: Array<[string, RegExp]> = [
    ["class_i", /^\s*I\s*\(BASE\)\s+(.+)$/im],
    ["class_ii", /^\s*II\s+(.+)$/im],
    ["class_iii", /^\s*III\s+(.+)$/im],
    ["class_iv", /^\s*IV\s+(.+)$/im],
  ];
  for (const [key, re] of rows) {
    const m = block.match(re);
    if (!m) continue;
    const nums = [...m[1].matchAll(/(\d+\.\d{2})/g)].map((x) => Number(x[1]));
    const last = nums.at(-1);
    if (last != null && last >= 5 && last <= 40) out[key] = last;
  }
  return out;
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

export function parseDairyNdpsr(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  const rows: Array<[RegExp, string, string, string]> = [
    [/Butter Prices and Sales[\s\S]{0,500}?Weighted Price\s+((?:\*?[\d.]+(?:\s+|\s*$))+)/i, "butter", "Butter", "NDPSR US weighted butter"],
    [/40-Pound Block Cheddar Cheese Prices and Sales[\s\S]{0,500}?Weighted Price\s+((?:\*?[\d.]+(?:\s+|\s*$))+)/i, "cheese_blocks", "Cheddar 40# blocks", "NDPSR US weighted 40# cheddar"],
    [/500-Pound Barrel Cheddar Cheese Prices[\s\S]{0,500}?Weighted Price\s+((?:\*?[\d.]+(?:\s+|\s*$))+)/i, "cheese_barrels", "Cheddar 500# barrels", "NDPSR US weighted 500# cheddar"],
    [/Dry Whey Prices and Sales[\s\S]{0,500}?Weighted Price\s+((?:\*?[\d.]+(?:\s+|\s*$))+)/i, "dry_whey", "Dry whey", "NDPSR US weighted dry whey"],
    [/Nonfat Dry Milk Prices and Sales[\s\S]{0,500}?Weighted Price\s+((?:\*?[\d.]+(?:\s+|\s*$))+)/i, "ndm", "Nonfat dry milk", "NDPSR US weighted NDM"],
  ];
  for (const [re, tok, commodity, label] of rows) {
    const m = text.match(re);
    if (!m) continue;
    const nums = [...m[1].matchAll(/\*?(\d+\.\d{2,4})/g)].map((x) => Number(x[1]));
    const px = nums.at(-1);
    if (px == null || px < 0.2 || px > 8) continue;
    pushTick(out, report, sourceUrl, asOf, {
      id: `dairy.ams_${report.slug}.national.${tok}.weighted`,
      group: "dairy",
      commodity,
      label,
      market: report.title,
      classGrade: `NDPSR US weighted average, week ending ${asOf}, $/lb`,
      unit: "$/lb",
      price: roundMoney(px),
    });
  }
  return dedupeTicks(out);
}

export function parseDairyRetailAds(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  const sections: Array<[string, string]> = [
    ["NATIONAL -- CONVENTIONAL DAIRY PRODUCTS", "conventional"],
    ["NATIONAL -- ORGANIC DAIRY PRODUCTS", "organic"],
  ];
  const packRe =
    /((?:\d+-?\d*\s*(?:oz|lb)|Half Gallon|Gallon)(?:\s+(?:Block|Shred|Sliced))?)\s+(\s*)(\d+)\s+(\d+\.\d{2})\b/i;
  for (const [header, channel] of sections) {
    const start = text.indexOf(header);
    if (start < 0) continue;
    const rest = text.slice(start);
    const next = rest.search(/\n\s*(REGIONAL --|NATIONAL -- ORGANIC|1--Dairy Market News)/i);
    const block = next > 0 ? rest.slice(0, next) : rest.slice(0, 8000);
    for (const raw of block.split(/\r?\n/)) {
      if (!/^(Butter|Cheese|Cottage Cheese|Cream Cheese|Flavored Milk|Ice Cream|Milk|Sour Cream|Yogurt)\b/i.test(raw.trim())) {
        continue;
      }
      const m = raw.match(packRe);
      if (!m) continue;
      // Collapsed last-week columns sit far right of pack size when this period is empty.
      if ((m[2] ?? "").length > 28) continue;
      const stores = Number(m[3]);
      const price = Number(m[4]);
      if (!Number.isFinite(price) || price < 0.4 || price > 20) continue;
      if (!Number.isFinite(stores) || stores < 1) continue;
      const name = raw
        .slice(0, raw.indexOf(m[1]!))
        .replace(/\s+/g, " ")
        .trim();
      const commodity = `${name} ${m[1]}`.replace(/\s+/g, " ").trim();
      pushTick(out, report, sourceUrl, asOf, {
        id: ["dairy", `ams_${report.slug}`, channel, token(commodity)].join("."),
        group: "dairy",
        commodity,
        label: `National ${channel} advertised ${commodity}`,
        market: report.title,
        classGrade: `Weighted average advertised price, ${channel}, ${stores} stores`,
        unit: "$/pkg",
        price: roundMoney(price),
      });
    }
  }
  return dedupeTicks(out);
}

const RETAIL_LP_SLUGS = new Set(["2756", "2757", "2867", "2868", "3228", "3229", "3796"]);

const RETAIL_LP_COMMODITY: Record<string, string> = {
  "2756": "Chicken",
  "2757": "Shell eggs",
  "2867": "Turkey",
  "2868": "Pork",
  "3228": "Beef",
  "3229": "Lamb",
  "3796": "Veal",
};

const RETAIL_LP_REQUIRED: Record<string, readonly string[]> = {
  "2756": ["whole.whole_bagged_fryer.conventional.fresh", "parts.breast_boneless_skinless_regular.conventional.fresh"],
  "2757": ["shell_egg.large_white_12.conventional.fresh", "shell_egg.large_brown_12.cage_free.fresh"],
  "2867": ["ground.ground_turkey_93_1_2_lbs.conventional.fresh"],
  "2868": ["ham.ham_steak.conventional.fresh"],
  "3228": ["chuck.chuck_roast_boneless_regular.conventional.fresh"],
  "3229": ["loin.loin_chops_regular.antibiotic_free.fresh"],
  "3796": ["breast.breast_regular.conventional.fresh"],
};

const RETAIL_PAGE_RE =
  /Weekly Grocery Store|Email us with|Advertised Prices|MARKET HIGHLIGHTS|Explanatory Notes|Source:\s+USDA|Page \d|for Monday,|Metric\s+|Total Outlets|Activity Index|Feature Rate|This week in|The information contained/i;
const RETAIL_HEADER_RE = /Section\s+.*Wtd Avg/i;
const RETAIL_REGION_RE =
  /^(?:NORTHEAST|SOUTHEAST|MIDWEST|SOUTH CENTRAL|SOUTHWEST|NORTHWEST|ALASKA|HAWAII)\s+REGION\b/i;

function retailColNum(line: string, start: number, end: number): number | null {
  const chunk = line.slice(start, end);
  const m = chunk.match(/[\d,]+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function retailSlice(line: string, start: number, end: number): string {
  return line.slice(start, end).replace(/\s+/g, " ").trim();
}

const RETAIL_ENVS = [
  "USDA Organic, Pasture Raised",
  "USDA Organic, Free Range",
  "Nutritionally Enhanced (Omega-3)",
  "ABF, Pasture Raised",
  "ABF, Free Range",
  "ABF, Grass Fed",
  "Vegetarian-Fed",
  "Antibiotic Free",
  "Pasture Raised",
  "USDA Organic",
  "Free Range",
  "Cage-Free",
  "Conventional",
  "Kosher",
  "Halal",
] as const;

function healRetailPhrase(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\bAn\s+tibiotic\b/gi, "Antibiotic")
    .replace(/\bCo\s+nventional\b/gi, "Conventional")
    .replace(/\bCon\s+ventional\b/gi, "Conventional")
    .replace(/\bOrg\s+anic\b/gi, "Organic")
    .replace(/\bF\s+resh\b/gi, "Fresh")
    .replace(/\bFr\s+esh\b/gi, "Fresh")
    .replace(/\bFre\s+sh\b/gi, "Fresh")
    .replace(/\bFres\s+h\b/gi, "Fresh")
    .replace(/\bFroze\s+n\b/gi, "Frozen")
    .replace(/\bFroz\s+en\b/gi, "Frozen")
    .replace(/\bPrepare\s+d\b/gi, "Prepared")
    .trim();
}

function healRetailFields(item: string, env: string, cond: string): { item: string; env: string; cond: string } {
  let blob = healRetailPhrase(`${item} ${env} ${cond}`);
  let condition = "";
  const condM = blob.match(/^(.*?)(?:\s+)?(Fresh|Frozen|Prepared)$/i);
  if (condM) {
    blob = (condM[1] || "").trim();
    condition = condM[2];
  }
  for (const known of RETAIL_ENVS) {
    const escaped = known.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^(.*?)\\s+${escaped}\\s*$`, "i");
    const m = blob.match(re);
    if (m?.[1]?.trim()) {
      return { item: m[1].trim(), env: known, cond: condition };
    }
  }
  return { item: healRetailPhrase(item), env: healRetailPhrase(env), cond: condition };
}

function retailUnit(raw: string): string {
  if (/per\s*lb/i.test(raw)) return "$/lb";
  if (/per\s*carton/i.test(raw)) return "$/carton";
  if (/^each$/i.test(raw.trim())) return "$/each";
  if (/per\s*bunch/i.test(raw)) return "$/bunch";
  if (/per\s*pkg|per\s*package/i.test(raw)) return "$/pkg";
  const tok = token(raw);
  return tok ? `$/${tok}` : "$/pkg";
}

function nationalRetailBlock(text: string, startRe: RegExp, stopRe: RegExp): string | null {
  const start = text.search(startRe);
  if (start < 0) return null;
  const rest = text.slice(start);
  const stop = rest.slice(8).search(stopRe);
  return stop >= 0 ? rest.slice(0, stop + 8) : rest;
}

/** Official LPGMN weekly grocery-store feature ads — current-week national CW wtd avg only. */
export function parseGroceryRetailLp(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const block = nationalRetailBlock(text, /\nNATIONAL\s*\n/, /\n(?:NORTHEAST|SOUTHEAST|MIDWEST|SOUTH CENTRAL|SOUTHWEST|NORTHWEST|ALASKA|HAWAII)\s+REGION\b|\nExplanatory Notes:/);
  if (!block) return [];
  const lines = block.split(/\r?\n/).map((ln) => ln.replace(/\r$/, ""));
  let cols: { item: number; env: number; cond: number; stores0: number; stores1: number; avg0: number; avg1: number; nums: number } | null =
    null;
  let section = "";
  let unitRaw = "";
  const out: AmsTick[] = [];
  const commodity = RETAIL_LP_COMMODITY[report.slug] || report.title;
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i] ?? "";
    if (RETAIL_HEADER_RE.test(raw)) {
      const item = raw.indexOf("Item");
      const env = raw.indexOf("Environment");
      const cond = raw.indexOf("Condition");
      const s1 = raw.indexOf("Stores");
      const w1 = raw.indexOf("Wtd Avg");
      const s2 = raw.indexOf("Stores", s1 + 1);
      if (item >= 0 && s1 >= 0 && w1 >= 0) {
        cols = {
          item,
          env: env >= 0 ? env : s1,
          cond: cond >= 0 ? cond : s1,
          stores0: Math.max(0, s1 - 1),
          stores1: w1,
          avg0: w1,
          avg1: s2 > 0 ? s2 : w1 + 12,
          nums: Math.max(0, s1 - 1),
        };
      }
      i += 1;
      continue;
    }
    if (!cols) {
      i += 1;
      continue;
    }
    if (!raw.trim() || (RETAIL_PAGE_RE.test(raw) && !/Per (?:lb|Carton|Pkg)|Each\b/i.test(raw))) {
      i += 1;
      continue;
    }
    if (RETAIL_REGION_RE.test(raw.trim())) break;
    const left = raw.slice(0, cols.item).replace(/\s+/g, " ").trim();
    const sec = left.match(/^([A-Za-z][A-Za-z./ -]+?)\s+(Per (?:lb|Carton|Pkg)|Each)\b/i);
    if (sec) {
      section = sec[1].trim();
      unitRaw = sec[2];
    }
    const stores = retailColNum(raw, cols.stores0, cols.stores1);
    const avg = retailColNum(raw, cols.avg0, cols.avg1);
    let item = retailSlice(raw, cols.item, cols.env);
    let env = retailSlice(raw, cols.env, cols.cond);
    let cond = retailSlice(raw, cols.cond, cols.stores0);
    let j = i + 1;
    while (j < lines.length) {
      const nxt = lines[j] ?? "";
      if (!nxt.trim()) {
        j += 1;
        continue;
      }
      if (RETAIL_HEADER_RE.test(nxt) || RETAIL_PAGE_RE.test(nxt) || RETAIL_REGION_RE.test(nxt.trim())) break;
      const nxtLeft = nxt.slice(0, cols.item).replace(/\s+/g, " ").trim();
      if (/Per (?:lb|Carton|Pkg)|Each\b/i.test(nxtLeft)) break;
      const nxtNums = nxt.slice(cols.nums).match(/[\d,]+(?:\.\d+)?/);
      if (nxtNums) break;
      const wrapSec = nxt.slice(0, cols.item).replace(/\s+/g, " ").trim();
      if (wrapSec && !/Per (?:lb|Carton|Pkg)|Each\b/i.test(wrapSec)) {
        section = `${section} ${wrapSec}`.replace(/\s+/g, " ").trim();
      }
      item = `${item} ${retailSlice(nxt, cols.item, cols.env)}`.replace(/\s+/g, " ").trim();
      env = `${env} ${retailSlice(nxt, cols.env, cols.cond)}`.replace(/\s+/g, " ").trim();
      cond = `${cond} ${retailSlice(nxt, cols.cond, cols.stores0)}`.replace(/\s+/g, " ").trim();
      j += 1;
    }
    if (stores != null && avg != null && stores >= 1 && avg >= 0.2 && avg <= 80 && item) {
      const split = healRetailFields(item, env, cond);
      if (!split.item) {
        i = j > i + 1 ? j : i + 1;
        continue;
      }
      const envTok = token(split.env) || "unspecified";
      const condTok = token(split.cond) || "fresh";
      const secTok = token(section) || "item";
      const itemTok = token(split.item);
      const id = ["dairy", `ams_${report.slug}`, secTok, itemTok, envTok, condTok].join(".");
      const unit = retailUnit(unitRaw || "Per lb");
      pushTick(out, report, sourceUrl, asOf, {
        id,
        group: "dairy",
        commodity,
        label: `National advertised ${split.item}${split.env ? ` ${split.env}` : ""}${split.cond ? ` ${split.cond}` : ""}`,
        market: `${report.title} — National grocery ads`,
        classGrade: `Current-week advertised wtd avg, ${stores.toLocaleString("en-US")} stores, ${split.env || "quoted"} ${split.cond}`.trim(),
        unit,
        price: roundMoney(avg),
      });
    }
    i = j > i + 1 ? j : i + 1;
  }
  const have = new Set(out.map((row) => row.id.replace(/^dairy\.ams_\d+\./, "")));
  const required = RETAIL_LP_REQUIRED[report.slug] ?? [];
  if (required.length > 0 && !required.every((id) => have.has(id))) return [];
  return dedupeTicks(out);
}

const SPECIALTY_REQUIRED = ["conventional.apples.honeycrisp.per_lb", "conventional.bananas.per_lb"] as const;

function splitProduceLeft(left: string): { commodity: string; variety: string; unit: string } | null {
  const cleaned = left.replace(/\s+/g, " ").trim();
  if (!cleaned || /^(Commodity|Fruit|Vegetables|Potatoes|THIS WEEK|LAST WEEK|LAST YEAR|Wtd Avg)/i.test(cleaned)) {
    return null;
  }
  const unitM = cleaned.match(
    /^(.*?)(?:\s+)(per lb|each|per bunch|per package|\d[\w .()/%-]*)$/i,
  );
  if (!unitM) return null;
  const head = unitM[1].trim();
  const unit = unitM[2].trim();
  const comm = head.match(/^([A-Z][A-Za-z]+(?:,\s+[A-Z][A-Za-z]+)?)(?:\s+(.*))?$/);
  if (!comm) return null;
  return { commodity: comm[1], variety: (comm[2] || "").trim(), unit };
}

/** Official Specialty Crops grocery feature ads — national THIS WEEK wtd avg only. */
export function parseSpecialtyCropsRetail(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const sections: Array<[string, string]> = [
    ["NATIONAL CONVENTIONAL SUMMARY", "conventional"],
    ["NATIONAL ORGANIC SUMMARY", "organic"],
  ];
  const out: AmsTick[] = [];
  for (const [header, channel] of sections) {
    const start = text.indexOf(header);
    if (start < 0) continue;
    const rest = text.slice(start);
    const next = rest.search(/\n\s*REGIONAL (?:CONVENTIONAL|ORGANIC) DETAILS|\n\s*NATIONAL ORGANIC SUMMARY/i);
    const block = next > 0 ? rest.slice(0, next) : rest.slice(0, 80_000);
    const lines = block.split(/\r?\n/).map((ln) => ln.replace(/\r$/, ""));
    let cols: { ads0: number; ads1: number; avg0: number; avg1: number } | null = null;
    let pendingLeft = "";
    for (const raw of lines) {
      if (/Commodity/.test(raw) && /Wtd Avg/.test(raw) && /Number/.test(raw)) {
        const n1 = raw.search(/Number/);
        const w1 = raw.search(/Wtd Avg/);
        const n2 = raw.indexOf("Number", n1 + 1);
        if (n1 >= 0 && w1 >= 0) {
          cols = {
            ads0: Math.max(0, n1 - 2),
            ads1: w1,
            avg0: w1,
            avg1: n2 > 0 ? n2 : w1 + 12,
          };
        }
        continue;
      }
      if (!cols) continue;
      if (/Wtd Avg - Simple weighted average|Page \d+ of|Weekly Grocery Store Specialty/i.test(raw)) continue;
      const ads = retailColNum(raw, cols.ads0, cols.ads1);
      const avg = retailColNum(raw, cols.avg0, cols.avg1);
      const leftBit = raw.slice(0, cols.ads0).trim();
      if (leftBit && /^[A-Z]/.test(leftBit)) pendingLeft = leftBit;
      else if (pendingLeft && leftBit) pendingLeft = `${pendingLeft} ${leftBit}`.replace(/\s+/g, " ").trim();
      if (ads == null || avg == null || ads < 1 || avg < 0.15 || avg > 40) continue;
      const split = splitProduceLeft(pendingLeft || leftBit);
      pendingLeft = "";
      if (!split) continue;
      const unitTok = token(split.unit) || "pkg";
      const parts = ["produce", `ams_${report.slug}`, channel, token(split.commodity)];
      if (split.variety) parts.push(token(split.variety));
      parts.push(unitTok);
      pushTick(out, report, sourceUrl, asOf, {
        id: parts.join("."),
        group: "produce",
        commodity: split.commodity,
        label: `National ${channel} advertised ${split.commodity}${split.variety ? ` ${split.variety}` : ""} ${split.unit}`,
        market: `${report.title} — National grocery ads`,
        classGrade: `Current-week advertised wtd avg, ${channel}, ${ads.toLocaleString("en-US")} ads, ${split.unit}`,
        unit: retailUnit(split.unit),
        price: roundMoney(avg),
      });
    }
  }
  const have = new Set(out.map((row) => row.id.replace(/^produce\.ams_\d+\./, "")));
  if (!SPECIALTY_REQUIRED.every((id) => have.has(id))) return [];
  return dedupeTicks(out);
}

const EGG_SECTION_RE =
  /^(NATIONAL|CALIFORNIA)\s+SHELL EGGS[¹1]?\s*-\s*(Caged|Cage-Free|Free-Range|USDA Organic)\b/i;
const EGG_ROW_RE =
  /(?:(?:Graded Loose|Gradeable Nest Run)\s+)?(White|Brown)\s+(Jumbo|Extra Large|Large|Medium|Small|\d+)\s+([\d,]+)\s+(\d+\.\d{2})\s*-\s*(\d+\.\d{2})\s+(\d+\.\d{2})\b/i;

export function parseShellEggIndex(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  let market = "national";
  let environment = "";
  let kind = "graded_loose";
  let basis = "FOB";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const hdr = line.match(EGG_SECTION_RE);
    if (hdr) {
      market = hdr[1].toLowerCase() === "california" ? "california" : "national";
      environment = token(hdr[2]);
      kind = "graded_loose";
      basis = "FOB";
      continue;
    }
    if (/Cents Per Dozen/i.test(line)) {
      basis = /Delivered/i.test(line) ? "Delivered" : "FOB";
      continue;
    }
    if (/^Gradeable Nest Run\b/i.test(line)) kind = "nest_run";
    else if (/^Graded Loose\b/i.test(line)) kind = "graded_loose";
    if (!environment) continue;
    const row = line.match(EGG_ROW_RE);
    if (!row) continue;
    const volume = Number(row[3].replace(/,/g, ""));
    const lo = Number(row[4]);
    const hi = Number(row[5]);
    const avg = Number(row[6]);
    if (!Number.isFinite(volume) || volume < 1) continue;
    if (!Number.isFinite(avg) || avg < 5 || avg > 500) continue;
    const color = row[1];
    const cls = row[2];
    const nest = /^\d+$/.test(cls) || /nest_run|Gradeable Nest Run/i.test(`${kind} ${line}`);
    const rowKind = nest ? "nest_run" : kind;
    const classTok = /^\d+$/.test(cls) ? `g${cls}` : token(cls);
    const id = ["dairy", `ams_${report.slug}`, token(market), environment, token(rowKind), token(color), classTok].join(".");
    const envLabel = environment.replace(/_/g, " ");
    const place = market === "california" ? "California" : "National";
    pushTick(out, report, sourceUrl, asOf, {
      id,
      group: "dairy",
      commodity: "Shell eggs",
      label: `${place} ${envLabel} ${color} ${cls}${rowKind === "nest_run" ? " nest run" : ""}`,
      market: `${report.title} — ${place} ${envLabel}`,
      classGrade: `${rowKind === "nest_run" ? "Gradeable nest run" : "Graded loose Grade A+"}, ${color} ${cls}, ${volume} cases (30-doz), ${basis}`,
      unit: "cents/dozen",
      price: roundMoney(avg),
      lo,
      hi,
    });
  }
  return dedupeTicks(out);
}

const COLD_QTY_RE = /\(?-?[\d,]+(?:\.\d+)?\)?/g;

function parseSignedThousands(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const parenNeg = /^\(.*\)$/.test(t);
  const n = Number(t.replace(/[(),]/g, ""));
  if (!Number.isFinite(n)) return null;
  return parenNeg ? -Math.abs(n) : n;
}

function pairQuantities(raw: string): [number, number] | null {
  const qtys = [...raw.matchAll(COLD_QTY_RE)]
    .map((m) => parseSignedThousands(m[0]))
    .filter((n): n is number => n != null);
  if (qtys.length < 2) return null;
  return [qtys[0], qtys[1]];
}

/** Official AMS_1095 / MD_DA953 weekly selected-center butter + cheese holdings. */
export function parseColdStorageWeekly(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const dated: { asOf: string; butter: number; cheese: number }[] = [];
  let change: { butter: number; cheese: number } | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const dateRow = line.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s*:\s*(.+)$/);
    if (dateRow) {
      const asOf = parseMdY(dateRow[1]);
      const pair = pairQuantities(dateRow[2]);
      if (asOf && pair && pair[0] > 100 && pair[1] > 100 && pair[0] < 5_000_000 && pair[1] < 5_000_000) {
        dated.push({ asOf, butter: pair[0], cheese: pair[1] });
      }
      continue;
    }
    const chg = line.match(/^Change:\s*(.+)$/i);
    if (chg) {
      const pair = pairQuantities(chg[1]);
      if (pair) change = { butter: pair[0], cheese: pair[1] };
    }
  }
  const current = dated[0];
  if (!current) return [];
  const monthStart = dated[1];
  if (!change && monthStart) {
    change = { butter: current.butter - monthStart.butter, cheese: current.cheese - monthStart.cheese };
  }
  const out: AmsTick[] = [];
  const products = [
    { key: "butter" as const, commodity: "Cold storage butter", label: "US selected-center butter holdings" },
    { key: "cheese" as const, commodity: "Cold storage cheese", label: "US selected-center cheese holdings" },
  ];
  for (const product of products) {
    const holdings = current[product.key];
    const start = monthStart?.[product.key];
    const delta = change?.[product.key];
    const deltaNote =
      delta == null
        ? "gross change from first of month not printed"
        : `MTD ${delta > 0 ? "+" : ""}${delta.toLocaleString("en-US")} (1,000 lb)`;
    pushTick(out, report, sourceUrl, current.asOf, {
      id: ["dairy", `ams_${report.slug}`, "national", product.key, "holdings"].join("."),
      group: "dairy",
      commodity: product.commodity,
      label: product.label,
      market: `${report.title} — National selected centers`,
      classGrade: `Edible, selected US storage centers, includes government stocks, ${deltaNote}`,
      unit: "1,000 lb",
      price: holdings,
      lo: start ?? holdings,
      hi: holdings,
    });
    if (delta != null) {
      pushTick(out, report, sourceUrl, current.asOf, {
        id: ["dairy", `ams_${report.slug}`, "national", product.key, "mtd_change"].join("."),
        group: "dairy",
        commodity: product.commodity,
        label: `${product.label.replace(/holdings$/, "MTD change")}`,
        market: `${report.title} — National selected centers`,
        classGrade: "Gross change from first of month, selected US storage centers, includes government stocks",
        unit: "1,000 lb",
        price: delta,
        lo: delta,
        hi: delta,
      });
    }
  }
  return dedupeTicks(out);
}

const CHICKEN_ROW_RE =
  /^(.+?)\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s+(-?\d+(?:\.\d+)?))?\s+([\d,]+)\b/;

const CHICKEN_REQUIRED_IDS = [
  "whole.delivered.national_composite_whole_bird",
  "whole.delivered.wogs.national_composite_wogs",
  "parts.fob.breast_b_s",
  "parts.fob.leg_quarters_bulk",
] as const;

function chickenItemToken(label: string): string {
  const cleaned = label.replace(/:+$/, "").trim();
  if (/^national composite whole(?: bird)?$/i.test(cleaned)) return "national_composite_whole_bird";
  return token(cleaned);
}

/** Official AMS_3646 Weekly National Chicken — current-week cents/lb weighted averages. */
export function parseWeeklyNationalChicken(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  let section = "";
  let basis = "";
  let family = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (/^Chicken,\s*Whole\b/i.test(line)) {
      section = "whole";
      family = "";
      continue;
    }
    if (/^Chicken,\s*Parts\b/i.test(line)) {
      section = "parts";
      family = "";
      continue;
    }
    if (/^Export\s*-\s*Fresh\b/i.test(line)) {
      section = "export_fresh";
      family = "";
      continue;
    }
    if (/^Export\s*-\s*Frozen\b/i.test(line)) {
      section = "export_frozen";
      family = "";
      continue;
    }
    if (/Domestic\b.*\bConventional\b/i.test(line) || /^Export\b.*\bConventional\b/i.test(line)) {
      basis = /Delivered/i.test(line) ? "delivered" : /FOB/i.test(line) ? "fob" : basis;
      continue;
    }
    if (/^WOG Trading\b/i.test(line)) {
      family = "wogs";
      continue;
    }
    if (/^Whole Body Trading\b/i.test(line)) {
      family = "whole_body";
      continue;
    }
    if (/^Regional and Specific\b/i.test(line)) {
      family = "regional";
      continue;
    }
    if (!section) continue;
    const row = line.match(CHICKEN_ROW_RE);
    if (!row) continue;
    const lo = Number(row[2]);
    const hi = Number(row[3]);
    const avg = Number(row[4]);
    const volume = Number(row[6].replace(/,/g, ""));
    if (!Number.isFinite(avg) || avg < 1 || avg > 400) continue;
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < 0 || hi > 400) continue;
    if (!Number.isFinite(volume) || volume < 1) continue;
    const item = chickenItemToken(row[1]);
    if (!item) continue;
    const idParts = ["dairy", `ams_${report.slug}`, section, basis || "fob"];
    if (family) idParts.push(family);
    idParts.push(item);
    const id = idParts.join(".");
    const place =
      section === "export_fresh"
        ? "Export fresh"
        : section === "export_frozen"
          ? "Export frozen"
          : section === "parts"
            ? "National parts"
            : "National whole";
    const commodity = section === "parts" || section.startsWith("export") ? "Chicken parts" : "Whole chicken";
    const basisLabel = (basis || "fob").replace(/^./, (c) => c.toUpperCase());
    pushTick(out, report, sourceUrl, asOf, {
      id,
      group: "dairy",
      commodity,
      label: `${place} ${row[1].replace(/:+$/, "").trim()}`,
      market: `${report.title} — ${place}`,
      classGrade: `Conventional fresh, ${basisLabel}, ${volume.toLocaleString("en-US")} (1,000 lb) current-week trading`,
      unit: "cents/lb",
      price: roundMoney(avg),
      lo,
      hi,
    });
  }
  const have = new Set(out.map((row) => row.id.replace(/^dairy\.ams_\d+\./, "")));
  if (!CHICKEN_REQUIRED_IDS.every((id) => have.has(id))) return [];
  return dedupeTicks(out);
}

const TURKEY_ROW_RE =
  /^(.+?)\s+(?:Yes|No)\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s+(-?\d+(?:\.\d+)?))?\s+([\d,]+)\b/;

function turkeyHeaderKind(line: string): "skip" | "section" | "basis" | "row" | "cont" {
  if (/^Turkey,\s*Whole\b/i.test(line) || /^Turkey,\s*Part\b/i.test(line)) return "section";
  if (/^(?:Domestic|Export)\s*-\s*(?:Fresh|Frozen)\b/i.test(line)) return "basis";
  if (TURKEY_ROW_RE.test(line)) return "row";
  if (
    /Current Weeks Trading|Previous Weeks Trading|Price Range|Wtd Avg|1,000 lbs|^Offer\b/i.test(line) ||
    /Weekly National Turkey|Agricultural Marketing Service|Livestock, Poultry and Grain Market News/i.test(line) ||
    /Email us with accessibility|Report For:|USDA AMS Livestock|General inquiries|https?:\/\//i.test(line) ||
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i.test(
      line,
    )
  ) {
    return "skip";
  }
  return "cont";
}

function attachTurkeyContinuation(rowLine: string, extra: string): string {
  const m = rowLine.match(/^(.*?)(\s+(?:Yes|No)\s+\d)/);
  if (!m) return `${rowLine} ${extra}`;
  const label = `${m[1].replace(/[,\s]+$/, "")} ${extra.replace(/^[,\s]+/, "")}`.replace(/\s+/g, " ").trim();
  return `${label}${m[2]}${rowLine.slice(m[0].length)}`;
}

function mergeTurkeyWrappedLines(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const kind = turkeyHeaderKind(line);
    if (kind === "cont" && out.length && turkeyHeaderKind(out[out.length - 1]) === "row") {
      out[out.length - 1] = attachTurkeyContinuation(out[out.length - 1], line);
      continue;
    }
    out.push(line);
  }
  return out;
}

function turkeyItemToken(label: string): string {
  return token(label.replace(/U\.S\./gi, "US").replace(/:+$/, ""));
}

function turkeyHasRequired(ids: Iterable<string>): boolean {
  const list = [...ids];
  return (
    list.some((id) => /whole\./.test(id) && /whole_young_(hen|tom)/.test(id)) &&
    list.some((id) => /breasts_boneless_skinless/.test(id)) &&
    list.some((id) => /drumsticks_tom/.test(id))
  );
}

/** Official AMS_3647 Weekly National Turkey — current-week cents/lb weighted averages. */
export function parseWeeklyNationalTurkey(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  let section = "";
  let form = "";
  let basis = "";
  for (const line of mergeTurkeyWrappedLines(text)) {
    if (/^Turkey,\s*Whole\b/i.test(line)) {
      section = "whole";
      form = "";
      basis = "";
      continue;
    }
    if (/^Turkey,\s*Part\b/i.test(line)) {
      section = "parts";
      form = "";
      basis = "";
      continue;
    }
    const basisLine = line.match(/^(Domestic|Export)\s*-\s*(Fresh|Frozen)\s*-.*\b(FOB|Delivered)\b/i);
    if (basisLine) {
      if (/^Export$/i.test(basisLine[1])) section = "export";
      form = basisLine[2].toLowerCase();
      basis = basisLine[3].toLowerCase();
      continue;
    }
    if (!section || !form || !basis) continue;
    const row = line.match(TURKEY_ROW_RE);
    if (!row) continue;
    const lo = Number(row[2]);
    const hi = Number(row[3]);
    const avg = Number(row[4]);
    const volume = Number(row[6].replace(/,/g, ""));
    if (!Number.isFinite(avg) || avg < 1 || avg > 800) continue;
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < 0 || hi > 800) continue;
    if (!Number.isFinite(volume) || volume < 1) continue;
    const item = turkeyItemToken(row[1]);
    if (!item) continue;
    const id = ["dairy", `ams_${report.slug}`, section, form, basis, item].join(".");
    const place =
      section === "export"
        ? `Export ${form}`
        : section === "parts"
          ? `National parts ${form}`
          : `National whole ${form}`;
    const commodity = section === "whole" ? "Whole turkey" : "Turkey parts";
    const basisLabel = basis.replace(/^./, (c) => c.toUpperCase());
    pushTick(out, report, sourceUrl, asOf, {
      id,
      group: "dairy",
      commodity,
      label: `${place} ${row[1].replace(/:+$/, "").trim()}`,
      market: `${report.title} — ${place}`,
      classGrade: `Conventional ${form}, ${basisLabel}, ${volume.toLocaleString("en-US")} (1,000 lb) current-week trading`,
      unit: "cents/lb",
      price: roundMoney(avg),
      lo,
      hi,
    });
  }
  const have = new Set(out.map((row) => row.id.replace(/^dairy\.ams_\d+\./, "")));
  if (!turkeyHasRequired(have)) return [];
  return dedupeTicks(out);
}

export function parseDairyRegionalDry(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const found: Array<{ kind: string; grade: string; lo: number; hi: number }> = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    const m = line.match(
      /^(?:(Mostly Range|Price Range)\s+-\s+([^;]+);\s*\$\/LB:|([A-Za-z][A-Za-z /-]+);\s*Price Range\s+-\s*\$\/LB:)\s*(\d*\.\d{2,4})\s*-\s*(\d*\.\d{2,4})/i,
    );
    if (!m) continue;
    const lo = Number(m[4]);
    const hi = Number(m[5]);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < 0.1 || hi > 20) continue;
    found.push({
      kind: (m[1] || "Price Range").toLowerCase(),
      grade: (m[2] || m[3] || "quoted").trim(),
      lo,
      hi,
    });
  }
  const mostly = new Set(found.filter((r) => r.kind.startsWith("mostly")).map((r) => token(r.grade)));
  const out: AmsTick[] = [];
  for (const row of found) {
    const tok = token(row.grade);
    if (!row.kind.startsWith("mostly") && mostly.has(tok)) continue;
    pushTick(out, report, sourceUrl, asOf, {
      id: ["dairy", `ams_${report.slug}`, token(report.region), tok].join("."),
      group: "dairy",
      commodity: report.title,
      label: `${report.title} ${row.grade}`,
      market: report.title,
      classGrade: `${row.kind} ${row.grade}, FOB $/lb`,
      unit: "$/lb",
      price: roundMoney((row.lo + row.hi) / 2),
      lo: row.lo,
      hi: row.hi,
    });
  }
  return dedupeTicks(out);
}

export function parseFeederPigReport(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseReportDate(text);
  if (!asOf) return [];
  const out: AmsTick[] = [];
  let cls = "";
  let sale = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (/^PIGS EARLY WEANED\s*-\s*10/i.test(line)) {
      cls = "early_weaned_10_12lb";
      sale = "";
      continue;
    }
    if (/^PIGS - 40 lb\b/i.test(line)) {
      cls = "feeder_40lb";
      sale = "";
      continue;
    }
    if (/^Cash Current\b/i.test(line)) {
      sale = "cash";
      continue;
    }
    if (/^Formula Current\b/i.test(line)) {
      sale = "formula";
      continue;
    }
    const composite = line.match(
      /^Total Composite\s+([\d,]+)\s+(\d+\.\d{2})\s*-\s*(\d+\.\d{2})\s+(\d+\.\d{2})\b/i,
    );
    const onePx = line.match(/^Total Composite\s+([\d,]+)\s+(\d+\.\d{2})\s+(\d+\.\d{2})\b/i);
    const picked = composite
      ? { head: composite[1], lo: Number(composite[2]), hi: Number(composite[3]), avg: Number(composite[4]) }
      : onePx
        ? { head: onePx[1], lo: Number(onePx[2]), hi: Number(onePx[2]), avg: Number(onePx[3]) }
        : null;
    if (picked && cls && sale) {
      const avg = picked.avg;
      if (avg >= 5 && avg <= 200) {
        pushTick(out, report, sourceUrl, asOf, {
          id: `hogs.ams_${report.slug}.national.${cls}.${sale}`,
          group: "hogs",
          commodity: cls.startsWith("early") ? "Early-weaned pigs 10-12 lb" : "Feeder pigs 40 lb",
          label: `National ${sale} ${cls.replace(/_/g, " ")}`,
          market: report.title,
          classGrade: `${sale} current, ${picked.head} head, delivered, $/head`,
          unit: "$/head",
          price: roundMoney(avg),
          lo: picked.lo,
          hi: picked.hi,
        });
      }
      continue;
    }
    const all = line.match(
      /^Pigs (Early Weaned - All|-\s*All)\s+([\d,]+)\s+(\d+\.\d{2})\b/i,
    );
    if (!all) continue;
    const avg = Number(all[3]);
    if (avg < 5 || avg > 200) continue;
    const tok = /early/i.test(all[1]) ? "early_weaned_all" : "feeder_40lb_all";
    pushTick(out, report, sourceUrl, asOf, {
      id: `hogs.ams_${report.slug}.national.${tok}`,
      group: "hogs",
      commodity: /early/i.test(all[1]) ? "Early-weaned pigs" : "Feeder pigs 40 lb",
      label: `National composite ${tok.replace(/_/g, " ")}`,
      market: report.title,
      classGrade: `Formula and cash composite, ${all[2]} head, $/head`,
      unit: "$/head",
      price: roundMoney(avg),
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

const COTTON_REQUIRED_IDS = ["cotton.seven_market.spot_41_4_34", "cotton.fsa.adjusted_world_price"] as const;

function flattenCotton(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");
}

function parseCottonAsOf(text: string): string | null {
  const header = text.match(
    /Weekly Cotton Market Review[\s\S]{0,200}?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/i,
  );
  if (header) {
    const mon = MONTHS[header[1].toLowerCase()];
    if (mon) return `${header[3]}-${mon}-${header[2].padStart(2, "0")}`;
  }
  return parseReportDate(text);
}

function cottonCents(raw: string): number | null {
  const n = Number(String(raw).replace(/[¢,]/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 200) return null;
  return n;
}

function cottonRegionToken(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (/east texas/i.test(t)) return "east_texas";
  if (/west texas/i.test(t)) return "west_texas";
  if (/desert southwest/i.test(t)) return "desert_southwest";
  if (/san joaquin/i.test(t)) return "san_joaquin";
  if (/american pima/i.test(t)) return "american_pima";
  if (/north delta/i.test(t)) return "north_delta";
  if (/south delta/i.test(t)) return "south_delta";
  if (/southeast/i.test(t)) return "southeast";
  return token(t);
}

function cottonCropToken(raw: string): string {
  const years = [...raw.matchAll(/\b(20\d{2})\b/g)].map((m) => m[1]);
  if (/new-crop/i.test(raw)) return "new_crop";
  if (years.length >= 2) return `crop_${years[0]}_${years[1]}`;
  if (years.length === 1) return `crop_${years[0]}`;
  return "current";
}

function cottonColorToken(raw: string): string {
  const range = raw.match(/\bcolor\s+(\d{2})\s*[-–]\s*(\d{2})\b/i);
  if (range) return `color_${range[1]}_${range[2]}`;
  const pair = raw.match(/\bcolor\s+(\d{2})\s+and\s+(\d{2})\b/i);
  if (pair) return `color_${pair[1]}_${pair[2]}`;
  const one = raw.match(/\bcolor\s+(\d{2})\b/i);
  if (one) return `color_${one[1]}`;
  return "";
}

function pushCottonTick(
  out: AmsTick[],
  report: AmsReport,
  sourceUrl: string,
  asOf: string,
  parts: string[],
  row: {
    commodity: string;
    label: string;
    market: string;
    classGrade: string;
    price: number;
    lo?: number;
    hi?: number;
  },
): void {
  pushTick(out, report, sourceUrl, asOf, {
    id: ["grain", `ams_${report.slug}`, ...parts].join("."),
    group: "grain",
    unit: "cents/lb",
    ...row,
  });
}

/** Official AMS_3024 / CNWWCMR weekly — current-week cents/lb prints only. */
export function parseWeeklyCottonReview(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  const asOf = parseCottonAsOf(text);
  if (!asOf) return [];
  const flat = flattenCotton(text);
  const out: AmsTick[] = [];

  const spot =
    flat.match(/7-Market Weekly Avg\.?\s+Spot Price\s*\(\s*41-4-34\s*\):[\s\S]{0,240}?(\d+\.\d{2})\s*cents(?:\s*\/\s*pound)?/i) ??
    flat.match(/seven designated markets,?\s+averaged\s+(\d+\.\d{2})\s+cents per pound/i);
  const range = flat.match(/Weekly Range:\s*(\d+\.\d{2})\s*¢?\s*[–-]\s*(\d+\.\d{2})\s*¢/i);
  const iceDec =
    flat.match(/ICE\s+DEC\s+Futures\s+Week Ending Settlement\s+Price:\s*(\d+\.\d{2})/i) ??
    flat.match(/ICE\s+(?:Oct|DEC|Dec)\s+settlement price ended the week at\s+(\d+\.\d{2})/i);
  const awp =
    flat.match(/Adjusted World price\s*1?\/?\s+(\d+\.\d{2})/i) ??
    flat.match(/Adjusted World Price\s*\(AWP\)[^\d]{0,48}(\d+\.\d{2})/i);

  const spotPx = spot ? cottonCents(spot[1]) : null;
  if (spotPx != null && spotPx >= 20) {
    const lo = range ? cottonCents(range[1]) : null;
    const hi = range ? cottonCents(range[2]) : null;
    pushCottonTick(out, report, sourceUrl, asOf, ["cotton", "seven_market", "spot_41_4_34"], {
      commodity: "Upland cotton",
      label: "7-market weekly avg spot 41-4-34",
      market: `${report.title} — Seven designated markets`,
      classGrade: "Color 41, leaf 4, staple 34, weekly average, cents/lb",
      price: roundMoney(spotPx),
      lo: lo != null && hi != null ? Math.min(lo, hi) : spotPx,
      hi: lo != null && hi != null ? Math.max(lo, hi) : spotPx,
    });
  }

  const awpPx = awp ? cottonCents(awp[1]) : null;
  if (awpPx != null) {
    pushCottonTick(out, report, sourceUrl, asOf, ["cotton", "fsa", "adjusted_world_price"], {
      commodity: "Upland cotton",
      label: "FSA Adjusted World Price",
      market: `${report.title} — USDA FSA`,
      classGrade: "Adjusted World Price, cents/lb, prices in effect this week",
      price: roundMoney(awpPx),
      lo: awpPx,
      hi: awpPx,
    });
  }

  const fsaRows: Array<{ re: RegExp; key: string; label: string }> = [
    { re: /Fine Count Adjustment\s+'?25\s+(\d+\.\d{2})/i, key: "fine_count_adj_25", label: "Fine Count Adjustment 2025" },
    { re: /Fine Count Adjustment\s+'?26\s+(\d+\.\d{2})/i, key: "fine_count_adj_26", label: "Fine Count Adjustment 2026" },
    { re: /Coul?rse Count Adjustment\s+(\d+\.\d{2})/i, key: "coarse_count_adj", label: "Coarse Count Adjustment" },
    { re: /Loan Deficiency Payment\s+(\d+\.\d{2})/i, key: "ldp", label: "Loan Deficiency Payment" },
    { re: /ELS\s*Competitiveness Payment[\s\S]{0,80}?(\d+\.\d{2})/i, key: "els_competitiveness", label: "ELS Competitiveness Payment" },
  ];
  for (const row of fsaRows) {
    const m = flat.match(row.re);
    const px = m ? cottonCents(m[1]) : null;
    if (px == null) continue;
    pushCottonTick(out, report, sourceUrl, asOf, ["cotton", "fsa", row.key], {
      commodity: "Upland cotton",
      label: `FSA ${row.label}`,
      market: `${report.title} — USDA FSA`,
      classGrade: `${row.label}, cents/lb`,
      price: roundMoney(px),
      lo: px,
      hi: px,
    });
  }

  const icePx = iceDec ? cottonCents(iceDec[1]) : null;
  if (icePx != null && icePx >= 20) {
    pushCottonTick(out, report, sourceUrl, asOf, ["cotton", "ice", "dec_week_ending"], {
      commodity: "Cotton ICE futures",
      label: "ICE DEC week-ending settlement",
      market: `${report.title} — ICE`,
      classGrade: "ICE December cotton futures, week-ending settlement, cents/lb",
      price: roundMoney(icePx),
      lo: icePx,
      hi: icePx,
    });
  }

  const iceRows = [...text.matchAll(/^\s*Sep\s+\d{1,2}\s+((?:\d+\.\d{2}\s+)+)/gim)];
  const lastIce = iceRows.at(-1);
  if (lastIce) {
    const nums = [...lastIce[1].matchAll(/\d+\.\d{2}/g)].map((m) => Number(m[0]));
    const aIndex = nums.length >= 8 ? nums[nums.length - 1] : null;
    if (aIndex != null && aIndex >= 40 && aIndex <= 200) {
      pushCottonTick(out, report, sourceUrl, asOf, ["cotton", "aindex", "far_eastern_week_ending"], {
        commodity: "Cotton A Index",
        label: "Far Eastern A Index week-ending",
        market: `${report.title} — Cotton Outlook of Liverpool`,
        classGrade: "Far Eastern A Index, week-ending print, cents/lb",
        price: roundMoney(aIndex),
        lo: aIndex,
        hi: aIndex,
      });
    }
  }

  let regionLabel = "";
  let bullet = "";
  const flushCottonBullet = (): void => {
    const lot = bullet.replace(/\s+/g, " ").trim();
    bullet = "";
    if (!regionLabel || !lot) return;
    const trade = lot.match(/(?:sold for around|traded for)\s+(\d+\.\d{2})\s+cents/i);
    const px = trade ? cottonCents(trade[1]) : null;
    if (px == null || px < 20) return;
    const region = cottonRegionToken(regionLabel);
    const crop = cottonCropToken(lot);
    const color = cottonColorToken(lot);
    const parts = ["cotton", region, crop];
    if (color) parts.push(color);
    const terms = /FOB warehouse/i.test(lot)
      ? "FOB warehouse"
      : /FOB car\/truck/i.test(lot)
        ? "FOB car/truck"
        : "spot trade";
    pushCottonTick(out, report, sourceUrl, asOf, parts, {
      commodity: /pima/i.test(region) ? "American Pima cotton" : "Upland cotton",
      label: `${regionLabel} ${crop.replace(/_/g, " ")} ${px.toFixed(2)}¢`,
      market: `${report.title} — ${regionLabel}`,
      classGrade: `${crop.replace(/_/g, " ")}${color ? `, ${color.replace(/_/g, " ")}` : ""}, ${terms}, current-week trade`,
      price: roundMoney(px),
      lo: px,
      hi: px,
    });
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const regionLine = line.match(
      /^(East Texas\/South Texas|West Texas,\s*Kansas,\s*Oklahoma|Desert Southwest|San Joaquin Valley|American Pima|North Delta|South Delta)\b/i,
    );
    if (regionLine) {
      flushCottonBullet();
      regionLabel = regionLine[1].replace(/\s+/g, " ");
      continue;
    }
    if (/^[•·]\s*/.test(line)) {
      flushCottonBullet();
      bullet = line.replace(/^[•·]\s*/, "");
      continue;
    }
    if (bullet) bullet += ` ${line}`;
  }
  flushCottonBullet();

  const have = new Set(out.map((row) => row.id.replace(/^grain\.ams_[^.]+\./, "")));
  if (!COTTON_REQUIRED_IDS.every((id) => have.has(id))) return [];
  return dedupeTicks(out);
}

export function parseAmsReportText(text: string, report: AmsReport, sourceUrl: string): AmsTick[] {
  if (report.group === "hay") return parseHayReport(text, report, sourceUrl);
  if (report.group === "cattle") return parseCattleReport(text, report, sourceUrl);
  if (report.group === "wool") return parseWoolReport(text, report, sourceUrl);
  if (report.group === "dairy") {
    if (report.slug === "2998") return parseDairyWeeklyReport(text, report, sourceUrl);
    if (report.slug === "2993") return parseDairyNdpsr(text, report, sourceUrl);
    if (report.slug === "2995") return parseDairyRetailAds(text, report, sourceUrl);
    if (RETAIL_LP_SLUGS.has(report.slug)) return parseGroceryRetailLp(text, report, sourceUrl);
    if (report.slug === "1598") return parseDairyDrySummary(text, report, sourceUrl);
    if (report.slug === "2997") return parseDairyOrganicAds(text, report, sourceUrl);
    if (report.slug === "2843") return parseShellEggIndex(text, report, sourceUrl);
    if (report.slug === "1095") return parseColdStorageWeekly(text, report, sourceUrl);
    if (report.slug === "3646") return parseWeeklyNationalChicken(text, report, sourceUrl);
    if (report.slug === "3647") return parseWeeklyNationalTurkey(text, report, sourceUrl);
    if (["1045", "1048", "1051", "1052"].includes(report.slug)) {
      return parseDairyRegionalDry(text, report, sourceUrl);
    }
    return parseDairyFluidReport(text, report, sourceUrl);
  }
  if (report.group === "hogs") {
    if (report.slug === "2810") return parseFeederPigReport(text, report, sourceUrl);
    return parseHogSummary(text, report, sourceUrl);
  }
  if (report.group === "produce") {
    if (report.slug === "3324") return parseSpecialtyCropsRetail(text, report, sourceUrl);
    return parseProduceTerminal(text, report, sourceUrl);
  }
  if (report.slug === "3802" || /organic grain/i.test(report.title)) {
    return parseOrganicGrainReport(text, report, sourceUrl);
  }
  if (report.slug === "3024" || /cotton market review/i.test(report.title) || (report.pdfNames ?? []).includes("cnwwcmr")) {
    return parseWeeklyCottonReview(text, report, sourceUrl);
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
  fetchedAt?: string | null;
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
  const fetchedAt =
    snap.fetchedAt && (!payload.fetchedAt || snap.fetchedAt > payload.fetchedAt)
      ? snap.fetchedAt
      : payload.fetchedAt;
  return {
    ...payload,
    ticks,
    failed,
    sources,
    status: hasTicks ? "ok" : payload.status,
    reason: hasTicks ? null : payload.reason,
    fetchedAt,
  };
}

function reportSlugFromTickId(id: string): string | null {
  const m = id.match(/\.ams_([a-z0-9_]+)\./i);
  return m ? m[1] : null;
}

function reportSlugFromFailedId(id: string): string | null {
  const m = id.match(/^ams_([a-z0-9_]+)$/i);
  return m ? m[1] : null;
}

function reportSlugFromSourceLabel(label: string): string | null {
  const m = label.match(/^AMS_([a-z0-9_]+)\b/i);
  return m ? m[1] : null;
}

export function collectReportFilter(): readonly { slug: string; group: AmsGroup; region: string; title: string; esmisPublication: string; pdfNames?: readonly string[] }[] {
  const leftoverOnly = /^(1|true|yes)$/i.test(env("TICKS_AMS_LEFTOVERS_ONLY"));
  const only = leftoverOnly
    ? [...AMS_LEFTOVER_SLUGS]
    : env("TICKS_AMS_ONLY_SLUGS")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  if (only.length === 0) return AMS_NATIONAL_REPORTS;
  const want = new Set(only);
  return AMS_NATIONAL_REPORTS.filter((r) => want.has(r.slug));
}

export function mergePartialAmsSnapshot(prev: AmsSnapshot, next: AmsSnapshot, slugs: readonly string[]): AmsSnapshot {
  const want = new Set(slugs);
  const rows = [
    ...prev.rows.filter((row) => {
      const slug = reportSlugFromTickId(row.id);
      return !slug || !want.has(slug);
    }),
    ...next.rows,
  ];
  const failed = [
    ...prev.failed.filter((row) => {
      const slug = reportSlugFromFailedId(row.id);
      return !slug || !want.has(slug);
    }),
    ...next.failed,
  ];
  const sources = [
    ...prev.sources.filter((label) => {
      const slug = reportSlugFromSourceLabel(label);
      return !slug || !want.has(slug);
    }),
    ...next.sources,
  ];
  const asOf = rows.map((r) => r.asOf).sort().at(-1) ?? next.asOf ?? prev.asOf;
  return {
    ok: true,
    product: prev.product || next.product,
    fetchedAt: next.fetchedAt,
    asOf,
    tickCount: rows.length,
    rows,
    failed,
    sources,
  };
}

/** Full-walk fail-closed: keep previous rows for slugs whose fetch failed this pass. */
export function mergeFailedAmsSlugs(prev: AmsSnapshot, next: AmsSnapshot): AmsSnapshot {
  const failedSlugs = new Set(
    next.failed
      .map((row) => reportSlugFromFailedId(row.id))
      .filter((slug): slug is string => Boolean(slug)),
  );
  if (failedSlugs.size === 0) return next;
  const keepRows = prev.rows.filter((row) => {
    const slug = reportSlugFromTickId(row.id);
    return Boolean(slug && failedSlugs.has(slug));
  });
  if (keepRows.length === 0) return next;
  const keepSources = prev.sources.filter((label) => {
    const slug = reportSlugFromSourceLabel(label);
    return Boolean(slug && failedSlugs.has(slug));
  });
  const rows = [...keepRows, ...next.rows];
  const sources = [...keepSources.filter((label) => !next.sources.includes(label)), ...next.sources];
  const asOf = rows.map((r) => r.asOf).sort().at(-1) ?? next.asOf ?? prev.asOf;
  return {
    ok: true,
    product: next.product || prev.product,
    fetchedAt: next.fetchedAt,
    asOf,
    tickCount: rows.length,
    rows,
    failed: next.failed,
    sources,
  };
}

export async function collectAmsNational(opts?: { dir?: string; pauseMs?: number }): Promise<AmsSnapshot> {
  const dir = opts?.dir ?? amsNationalDir();
  const pauseMs = opts?.pauseMs ?? Number(env("TICKS_AMS_PAUSE_MS") || "1200");
  const reports = collectReportFilter();
  const rows: AmsTick[] = [];
  const failed: AmsFailed[] = [];
  const sources: string[] = [];
  mkdirSync(dir, { recursive: true });
  const tmpDir = join(dir, "tmp");
  mkdirSync(tmpDir, { recursive: true });

  for (const report of reports) {
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
        lastErr = "official PDF had no parseable hay/cattle/grain/wool/dairy/hogs/produce/egg/cold-storage/chicken/grocery-retail/cotton print";
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
  let snap: AmsSnapshot = {
    ok: true,
    product: PRODUCT_ID,
    fetchedAt: new Date().toISOString(),
    asOf,
    tickCount: rows.length,
    rows,
    failed,
    sources,
  };
  const filteredSlugs = reports.map((r) => r.slug);
  const prev = readAmsSnapshot(dir);
  if (prev && prev.rows.length > 0) {
    if (reports.length < AMS_NATIONAL_REPORTS.length) {
      snap = mergePartialAmsSnapshot(prev, snap, filteredSlugs);
    } else if (failed.length > 0) {
      snap = mergeFailedAmsSlugs(prev, snap);
    }
  }
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

