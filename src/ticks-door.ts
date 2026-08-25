#!/usr/bin/env node
/**
 * Thin x402 pay-per-pull door for the BNM Data Shop.
 *
 * GET /ticks — US hay, cattle, and grain ticks ($0.05 USDC on Base)
 * GET /import-alerts — FDA Import Alert / DWPE firm ticks ($0.05)
 * GET /import-alerts/manifest.json — free catalog + schema + sample rows
 * GET /mariners — USCG D13 / Northwest Local Notice to Mariners ($0.02 id / $0.05 page)
 * GET /mariners/manifest.json — free count + official source (no notice body)
 * GET /mariners-d11 — USCG D11 / Southwest Local Notice to Mariners ($0.02 id / $0.05 page)
 * GET /mariners-d11/manifest.json — free count + official source (no notice body)
 * GET /mariners-d7 — USCG D7 / Southeast Local Notice to Mariners ($0.02 id / $0.05 page)
 * GET /mariners-d7/manifest.json — free count + official source (no notice body)
 * GET /mariners-d8 — USCG D8 / Gulf Local Notice to Mariners ($0.02 id / $0.05 page)
 * GET /mariners-d8/manifest.json — free count + official source (no notice body)
 * GET /warning-letters — FDA warning-letter bodies ($0.02 id / $0.05 page)
 * GET /warning-letters/manifest.json — free count + source (no letter body)
 * GET /untitled-letters — FDA Untitled Letter bodies, CDER OPDP + CBER promo ($0.02 id / $0.05 page)
 * GET /untitled-letters/manifest.json — free count + id/firm/date/product (no letter text)
 * GET /awa — USDA APHIS AWA inspection-report observation text ($0.02 id / $0.05 page)
 * GET /awa/manifest.json — free count + id/firm/date/sourceUrl (no observation text)
 * GET /swisspar — Swissmedic first-authorisation SwissPAR evaluation text ($0.02 id / $0.05 page)
 * GET /swisspar/manifest.json — free count + name/date/MA/sourceUrl (no evaluation text)
 * GET /pcac — FDA PCAC 503A briefing-memo evaluation text ($0.02 id / $0.05 page)
 * GET /pcac/manifest.json — free count + substance/date/meeting/mediaId/sourceUrl (no evaluation text)
 * GET /ftc-wl — FTC BCP warning-letter PDF text ($0.02 id / $0.05 page)
 * GET /ftc-wl/manifest.json — free count + firm/date/subject/sourceUrl (no letter body)
 * GET /cfpb-orders — CFPB consent-order / administrative-order PDF text ($0.02 id / $0.05 page)
 * GET /cfpb-orders/manifest.json — free count + firm/date/title/fileNo/sourceUrl (no order body)
 * GET /occ-cd — OCC institution C&D / consent-order PDF text ($0.02 id / $0.05 page)
 * GET /occ-cd/manifest.json — free count + bank/docket/date/sourceUrl (no order body)
 * GET /fdic-orders — FDIC institution consent-order / C&D PDF text ($0.02 id / $0.05 page)
 * GET /fdic-orders/manifest.json — free count + bank/docket/date/sourceUrl (no order body)
 * GET /frb-orders — FRB institution C&D / written-agreement / PCA PDF text ($0.02 id / $0.05 page)
 * GET /frb-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /ncua-orders — NCUA institution consent C&D HTML text ($0.02 id / $0.05 page)
 * GET /ncua-orders/manifest.json — free count + credit union/docket/date/sourceUrl (no order body)
 * GET /fincen-orders — FinCEN institution consent-order PDF text ($0.02 id / $0.05 page)
 * GET /fincen-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /ferc-orders — FERC institution stipulation-and-consent / show-cause / civil-penalty PDF text ($0.02 id / $0.05 page)
 * GET /ferc-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /ofac-orders — OFAC institution/company enforcement-release PDF text ($0.02 id / $0.05 page)
 * GET /ofac-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /bis-orders — BIS institution charging-letter / order / settlement PDF text ($0.02 id / $0.05 page)
 * GET /bis-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /cftc-orders — CFTC institution enforcement-order / settlement PDF text ($0.02 id / $0.05 page)
 * GET /cftc-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /fifra-orders — EPA FIFRA institution order / consent PDF text ($0.02 id / $0.05 page)
 * GET /fifra-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /denovo-orders — FDA De Novo classification-order PDF text ($0.02 id / $0.05 page)
 * GET /denovo-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /ttb-oic — TTB institution Offer in Compromise PDF text ($0.02 id / $0.05 page)
 * GET /ttb-oic/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /air-letters — USDA APHIS AIR confirmation-letter PDF text ($0.02 id / $0.05 page)
 * GET /air-letters/manifest.json — free count + institution/docket/date/sourceUrl (no letter body)
 * GET /superfund-rods — EPA Superfund Record of Decision PDF text ($0.02 id / $0.05 page)
 * GET /superfund-rods/manifest.json — free count + institution/docket/date/sourceUrl (no ROD body)
 * GET /ico-mpn — ICO Monetary Penalty Notice PDF text ($0.02 id / $0.05 page)
 * GET /ico-mpn/manifest.json — free count + institution/docket/date/sourceUrl (no MPN body)
 * GET /cma-ca98 — UK CMA CA98 institution infringement-decision PDF text ($0.02 id / $0.05 page)
 * GET /cma-ca98/manifest.json — free count + institution/docket/date/sourceUrl (no decision body)
 * GET /form-483 — FDA Form 483 observation bodies ($0.02 id / $0.05 page). Listed only when a real body is cached.
 * GET /form-483/manifest.json — free id / date / firm (no observation body)
 * GET /gmp — Health Canada Drug GMP report-card observation bodies ($0.02 id / $0.05 page). Listed only when a real body is cached.
 * GET /gmp/manifest.json — free id / firm / date / rating (no observation text)
 * GET /gmp-md — Health Canada medical-device report-card observation bodies ($0.02 id / $0.05 page). Listed only when a real body is cached.
 * GET /gmp-md/manifest.json — free id / firm / date / rating (no report-card body text)
 *
 * Unpaid paid paths → HTTP 402. Public doors persist via a CDP v2
 * verify/settle body: paymentPayload.resource is {url,description,mimeType}
 * and extensions.bazaar lives on the payload (not on paymentRequirements).
 * No keys in the repo.
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { generateJwt } from "@coinbase/cdp-sdk/auth";
import {
  IMPORT_ALERTS_AMOUNT_ATOMIC,
  IMPORT_ALERTS_MANIFEST_PATH,
  IMPORT_ALERTS_PATH,
  TICKS_AMOUNT_ATOMIC,
  loadImportAlerts,
  loadManifest,
  manifestFromSnapshot,
  readSnapshot as readImportAlertsSnapshot,
} from "./import-alerts.js";
import {
  D7_SPEC,
  D8_SPEC,
  D11_SPEC,
  D13_SPEC,
  MARINERS_AMOUNT_ATOMIC,
  MARINERS_D7_MANIFEST_PATH,
  MARINERS_D7_PATH,
  MARINERS_D8_MANIFEST_PATH,
  MARINERS_D8_PATH,
  MARINERS_D11_MANIFEST_PATH,
  MARINERS_D11_PATH,
  MARINERS_MANIFEST_PATH,
  MARINERS_PATH,
  buildMarinersManifest,
  loadMariners,
  loadMarinersD7,
  loadMarinersD7Manifest,
  loadMarinersD8,
  loadMarinersD8Manifest,
  loadMarinersD11,
  loadMarinersD11Manifest,
  loadMarinersManifest,
  readSnapshot as readMarinersSnapshot,
} from "./mariners.js";
import {
  WARNING_LETTERS_AMOUNT_ATOMIC,
  WARNING_LETTERS_MANIFEST_PATH,
  WARNING_LETTERS_PATH,
  loadWarningLetters,
  loadWarningLettersManifest,
} from "./warning-letters.js";
import {
  UNTITLED_LETTERS_AMOUNT_ATOMIC,
  UNTITLED_LETTERS_MANIFEST_PATH,
  UNTITLED_LETTERS_PATH,
  loadUntitledLetters,
  loadUntitledLettersManifest,
} from "./untitled-letters.js";
import {
  AWA_AMOUNT_ATOMIC,
  AWA_MANIFEST_PATH,
  AWA_PATH,
  loadAwa,
  loadAwaManifest,
} from "./awa.js";
import {
  SWISSPAR_AMOUNT_ATOMIC,
  SWISSPAR_MANIFEST_PATH,
  SWISSPAR_PATH,
  loadSwisspar,
  loadSwissparManifest,
} from "./swisspar.js";
import {
  PCAC_AMOUNT_ATOMIC,
  PCAC_MANIFEST_PATH,
  PCAC_PATH,
  loadPcac,
  loadPcacManifest,
} from "./pcac.js";
import {
  FTC_WL_AMOUNT_ATOMIC,
  FTC_WL_MANIFEST_PATH,
  FTC_WL_PATH,
  loadFtcWl,
  loadFtcWlManifest,
} from "./ftc-wl.js";
import {
  CFPB_ORDERS_AMOUNT_ATOMIC,
  CFPB_ORDERS_MANIFEST_PATH,
  CFPB_ORDERS_PATH,
  loadCfpbOrders,
  loadCfpbOrdersManifest,
} from "./cfpb-orders.js";
import {
  OCC_CD_AMOUNT_ATOMIC,
  OCC_CD_MANIFEST_PATH,
  OCC_CD_PATH,
  loadOccCd,
  loadOccCdManifest,
} from "./occ-cd.js";
import {
  FDIC_ORDERS_AMOUNT_ATOMIC,
  FDIC_ORDERS_MANIFEST_PATH,
  FDIC_ORDERS_PATH,
  loadFdicOrders,
  loadFdicOrdersManifest,
} from "./fdic-orders.js";
import {
  FRB_ORDERS_AMOUNT_ATOMIC,
  FRB_ORDERS_MANIFEST_PATH,
  FRB_ORDERS_PATH,
  loadFrbOrders,
  loadFrbOrdersManifest,
} from "./frb-orders.js";
import {
  NCUA_ORDERS_AMOUNT_ATOMIC,
  NCUA_ORDERS_MANIFEST_PATH,
  NCUA_ORDERS_PATH,
  loadNcuaOrders,
  loadNcuaOrdersManifest,
} from "./ncua-orders.js";
import {
  FINCEN_ORDERS_AMOUNT_ATOMIC,
  FINCEN_ORDERS_MANIFEST_PATH,
  FINCEN_ORDERS_PATH,
  loadFincenOrders,
  loadFincenOrdersManifest,
} from "./fincen-orders.js";
import {
  FERC_ORDERS_AMOUNT_ATOMIC,
  FERC_ORDERS_MANIFEST_PATH,
  FERC_ORDERS_PATH,
  loadFercOrders,
  loadFercOrdersManifest,
} from "./ferc-orders.js";
import {
  OFAC_ORDERS_AMOUNT_ATOMIC,
  OFAC_ORDERS_MANIFEST_PATH,
  OFAC_ORDERS_PATH,
  loadOfacOrders,
  loadOfacOrdersManifest,
} from "./ofac-orders.js";
import {
  BIS_ORDERS_AMOUNT_ATOMIC,
  BIS_ORDERS_MANIFEST_PATH,
  BIS_ORDERS_PATH,
  loadBisOrders,
  loadBisOrdersManifest,
} from "./bis-orders.js";
import {
  CFTC_ORDERS_AMOUNT_ATOMIC,
  CFTC_ORDERS_MANIFEST_PATH,
  CFTC_ORDERS_PATH,
  loadCftcOrders,
  loadCftcOrdersManifest,
} from "./cftc-orders.js";
import {
  FIFRA_ORDERS_AMOUNT_ATOMIC,
  FIFRA_ORDERS_MANIFEST_PATH,
  FIFRA_ORDERS_PATH,
  loadFifraOrders,
  loadFifraOrdersManifest,
} from "./fifra-orders.js";
import {
  DENOVO_ORDERS_AMOUNT_ATOMIC,
  DENOVO_ORDERS_MANIFEST_PATH,
  DENOVO_ORDERS_PATH,
  loadDenovoOrders,
  loadDenovoOrdersManifest,
} from "./denovo-orders.js";
import {
  TTB_OIC_AMOUNT_ATOMIC,
  TTB_OIC_MANIFEST_PATH,
  TTB_OIC_PATH,
  loadTtbOic,
  loadTtbOicManifest,
} from "./ttb-oic.js";
import {
  AIR_LETTERS_AMOUNT_ATOMIC,
  AIR_LETTERS_MANIFEST_PATH,
  AIR_LETTERS_PATH,
  loadAirLetters,
  loadAirLettersManifest,
} from "./air-letters.js";
import {
  SUPERFUND_RODS_AMOUNT_ATOMIC,
  SUPERFUND_RODS_MANIFEST_PATH,
  SUPERFUND_RODS_PATH,
  loadSuperfundRods,
  loadSuperfundRodsManifest,
} from "./superfund-rods.js";
import {
  ICO_MPN_AMOUNT_ATOMIC,
  ICO_MPN_MANIFEST_PATH,
  ICO_MPN_PATH,
  loadIcoMpn,
  loadIcoMpnManifest,
} from "./ico-mpn.js";
import {
  CMA_CA98_AMOUNT_ATOMIC,
  CMA_CA98_MANIFEST_PATH,
  CMA_CA98_PATH,
  loadCmaCa98,
  loadCmaCa98Manifest,
} from "./cma-ca98.js";
import {
  FORM_483_AMOUNT_ATOMIC,
  FORM_483_MANIFEST_PATH,
  FORM_483_PATH,
  hasCachedForm483Body,
  loadForm483,
  loadForm483Manifest,
} from "./form-483.js";
import {
  paidAirLettersBody,
  paidAwaBody,
  paidBisOrdersBody,
  paidCfpbOrdersBody,
  paidCftcOrdersBody,
  paidCmaCa98Body,
  paidDenovoOrdersBody,
  paidFdicOrdersBody,
  paidFercOrdersBody,
  paidFifraOrdersBody,
  paidFincenOrdersBody,
  paidForm483Body,
  paidFrbOrdersBody,
  paidFtcWlBody,
  paidGmpBody,
  paidGmpMdBody,
  paidIcoMpnBody,
  paidImportAlertsBody,
  paidMarinersBody,
  paidMarinersD11Body,
  paidMarinersD7Body,
  paidMarinersD8Body,
  paidNcuaOrdersBody,
  paidOccCdBody,
  paidOfacOrdersBody,
  paidPcacBody,
  paidSuperfundRodsBody,
  paidSwissparBody,
  paidTicksBody,
  paidTtbOicBody,
  paidUntitledLettersBody,
  paidWarningLettersBody,
} from "./paid-records.js";
import {
  EXTRACTED_ID_AMOUNT_ATOMIC,
  EXTRACTED_PAGE_SIZE,
  isExtractedIdQuery,
  isTableSku,
  pageExtractedPaidBody,
  parseExtractedPageQuery,
  type ExtractedPageQuery,
} from "./paid-page.js";
import { applyFreeIndex } from "./free-index.js";
import { mergeAmsNationalTicks } from "./ticks-ams.js";
import {
  GMP_AMOUNT_ATOMIC,
  GMP_MANIFEST_PATH,
  GMP_PATH,
  hasCachedGmpBody,
  loadGmp,
  loadGmpManifest,
} from "./gmp.js";
import {
  GMP_MD_AMOUNT_ATOMIC,
  GMP_MD_MANIFEST_PATH,
  GMP_MD_PATH,
  hasCachedGmpMdBody,
  loadGmpMd,
  loadGmpMdManifest,
} from "./gmp-md.js";
import { handleMcpHttp, MCP_PATH } from "./ticks-mcp.js";

export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const NETWORK_V1 = "base";
export const NETWORK_V2 = "eip155:8453";
export const TICKS_PATH = "/ticks";
export const MANIFEST_PATH = "/manifest.json";
export const CATALOG_PATH = "/catalog.json";
export const WELL_KNOWN_PATH = "/.well-known/x402";
export const OPENAPI_PATH = "/openapi.json";
export const LLMS_PATH = "/llms.txt";
export { MCP_PATH } from "./ticks-mcp.js";
/** x402scan origin page for the live paid doors. */
export const X402SCAN_SERVER_URL =
  "https://www.x402scan.com/server/c6f584c5-e494-41d1-aa02-2efb07ac3546";
export const PRODUCT_ID = "idaho-hay-feeder-ticks";
export const PRODUCT_NAME = "US hay, cattle, and grain ticks";
export const PRODUCT_VERSION = "1.4.0";
const COLLECT_MEMO_RE =
  /we are not inventing|this report has no organic row|not reusing an older organic|usda printed no organic/i;

const PUBLIC_SOURCE_MARKERS = [
  "twin falls",
  "blackfoot",
  "ams_3056",
  "ams-3056",
  "ams_3059",
  "ams-3059",
  "northwest direct",
  "idaho direct hay",
  "idaho hay",
  "if_fv130",
  "if-fv130",
  "idaho falls",
  "idaho barley commission",
  "ibc.id.grain",
  "water district 1",
  "rental pool",
  "wd1.",
  "ams_3058",
  "ams-3058",
  "ams_2914",
  "ams-2914",
  "ams.2914",
  "columbia basin",
  "columbia_umatilla",
  "umatilla",
  "ams_2904",
  "ams-2904",
  "ams_2707",
  "ams-2707",
  "ams_2885",
  "ams-2885",
  "ams_2935",
  "ams-2935",
  "ams_2710",
  "ams-2710",
  "ams_3097",
  "ams-3097",
  "ams_3098",
  "ams-3098",
  "ams_3148",
  "ams-3148",
  "ams_3046",
  "ams-3046",
  "ams_3223",
  "ams-3223",
  "california direct hay",
  "texas direct hay",
  "kansas direct hay",
  "nebraska direct hay",
  "texas direct cattle",
  "kansas direct feeder",
  "oklahoma direct feeder",
  "portland daily grain",
  "minneapolis daily grain",
  "kansas city daily grain",
  "ams_2905",
  "ams-2905",
  "ams_2769",
  "ams-2769",
  "ams_3236",
  "ams-3236",
  "ams_3183",
  "ams-3183",
  "ams_2807",
  "ams-2807",
  "ams_2929",
  "ams-2929",
  "ams_3905",
  "ams-3905",
  "ams_3095",
  "ams-3095",
  "ams_2939",
  "ams-2939",
  "ams_3731",
  "ams-3731",
  "ams_3784",
  "ams-3784",
  "ams_3050",
  "ams-3050",
  "ams_3793",
  "ams-3793",
  "ams_3926",
  "ams-3926",
  "ams_2906",
  "ams-2906",
  "ams_3096",
  "ams-3096",
  "ams_3455",
  "ams-3455",
  "ams_2808",
  "ams-2808",
  "ams_2770",
  "ams-2770",
  "ams_2708",
  "ams-2708",
  "ams_3184",
  "ams-3184",
  "ams_2709",
  "ams-2709",
  "ams_2940",
  "ams-2940",
  "ams_3237",
  "ams-3237",
  "ams_2912",
  "ams-2912",
  "ams_3192",
  "ams-3192",
  "ams_3225",
  "ams-3225",
  "ams_2932",
  "ams-2932",
  "ams_2850",
  "ams-2850",
  "colorado direct hay",
  "montana direct hay",
  "wyoming direct hay",
  "south dakota direct hay",
  "iowa direct hay",
  "missouri direct hay",
  "kentucky direct hay",
  "oklahoma direct hay",
  "illinois daily grain",
  "nebraska daily grain",
  "missouri daily grain",
  "colorado daily grain",
  "iowa daily grain",
  "ams_2960",
  "ams-2960",
  "ams_3146",
  "ams-3146",
  "ams_3463",
  "ams-3463",
  "ams_3043",
  "ams-3043",
  "ams_2886",
  "ams-2886",
  "ams_2892",
  "ams-2892",
  "ams_3147",
  "ams-3147",
  "ams_2714",
  "ams-2714",
  "ams_3049",
  "ams-3049",
  "ams_2928",
  "ams-2928",
  "ams_2771",
  "ams-2771",
  "ams_3156",
  "ams-3156",
  "ams_3878",
  "ams-3878",
  "ams_2851",
  "ams-2851",
  "ams_3100",
  "ams-3100",
  "ams_3091",
  "ams-3091",
  "ams_2787",
  "ams-2787",
  "ams_3186",
  "ams-3186",
  "ams_3088",
  "ams-3088",
  "ams_2711",
  "ams-2711",
  "ams_3167",
  "ams-3167",
  "ams_3239",
  "ams-3239",
  "ams_2887",
  "ams-2887",
  "ams_2911",
  "ams-2911",
  "national wool",
  "arkansas daily grain",
  "kansas daily grain",
  "texas daily grain",
  "ohio daily grain",
  "gulf export",
];

const PUBLIC_SERIES_PREFIXES = [
  "cattle-tf-",
  "cattle-bf-",
  "cattle-nw-",
  "hay-id-",
  "hay.ams_",
  "cattle.ams_",
  "grain.ams_",
  "wool.ams_",
  "fiber.ams_",
  "ibc.id.grain.",
  "wd1.",
  "ams.2914.",
];

export const TICKS_SOURCE_NAMES = [
  "Twin Falls",
  "Blackfoot",
  "AMS_3056 hay",
  "AMS_3059 NW Direct",
  "IF_FV130 onions/potatoes",
  "IBC Idaho elevator grain",
  "WD1 rental-pool $/AF",
  "AMS_3058 Columbia Basin hay",
  "IF_FV130 WA-OR produce",
  "AMS_2914 PNW pulses",
  "AMS_2904 California hay",
  "AMS_2707 Texas hay",
  "AMS_2885 Kansas hay",
  "AMS_2935 Nebraska hay",
  "AMS_2710 Texas cattle",
  "AMS_3097 Kansas cattle",
  "AMS_3098 Oklahoma cattle",
  "AMS_3148 Portland grain",
  "AMS_3046 Minneapolis grain",
  "AMS_3223 Kansas City grain",
  "AMS_2905 Colorado hay",
  "AMS_2769 Montana hay",
  "AMS_3236 Wyoming hay",
  "AMS_3183 South Dakota hay",
  "AMS_2807 Iowa hay",
  "AMS_2929 Missouri hay",
  "AMS_3905 Kentucky hay",
  "AMS_3095 Oklahoma hay",
  "AMS_2939 New Mexico hay",
  "AMS_3731 Utah hay",
  "AMS_3784 Arizona hay",
  "AMS_3050 Alabama hay",
  "AMS_3793 Tennessee hay",
  "AMS_3926 Nevada hay",
  "AMS_2906 Colorado cattle",
  "AMS_3096 Eastern Cornbelt cattle",
  "AMS_3455 Iowa cattle",
  "AMS_2808 Missouri cattle",
  "AMS_2770 Montana cattle",
  "AMS_2708 New Mexico cattle",
  "AMS_3184 South Dakota cattle",
  "AMS_2709 Southeast cattle",
  "AMS_2940 Southwest cattle",
  "AMS_3237 Wyoming-Nebraska cattle",
  "AMS_2912 Colorado grain",
  "AMS_3192 Illinois grain",
  "AMS_3225 Nebraska grain",
  "AMS_2932 Missouri grain",
  "AMS_2850 Iowa grain",
  "AMS_2960 Arkansas grain",
  "AMS_3146 California grain",
  "AMS_3463 Indiana grain",
  "AMS_3043 Iowa-Minnesota barge grain",
  "AMS_2886 Kansas grain",
  "AMS_2892 Kentucky grain",
  "AMS_3147 Gulf export grain",
  "AMS_2714 Maryland grain",
  "AMS_3049 Southern Minnesota grain",
  "AMS_2928 Mississippi grain",
  "AMS_2771 Montana grain",
  "AMS_3156 North Carolina grain",
  "AMS_3878 North Dakota grain",
  "AMS_2851 Ohio grain",
  "AMS_3100 Oklahoma grain",
  "AMS_3091 Pennsylvania grain",
  "AMS_2787 South Carolina grain",
  "AMS_3186 South Dakota grain",
  "AMS_3088 Tennessee grain",
  "AMS_2711 Texas grain",
  "AMS_3167 Virginia grain",
  "AMS_3239 Wyoming grain",
  "AMS_2887 National sunflower/flax",
  "AMS_2911 National Wool",
] as const;

export type TickStatus = "ok" | "empty" | "stale";

export type TicksPayload = {
  ok: true;
  product: "idaho-hay-feeder-ticks";
  sources: string[];
  status: TickStatus;
  reason: string | null;
  fetchedAt: string | null;
  ticks: unknown[];
  failed: unknown[];
  history: {
    points: unknown[];
    emptyReports: unknown[];
    series: unknown[];
  };
};

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export type DoorSku = "ticks" | "import-alerts" | "mariners" | "mariners-d11" | "mariners-d7" | "mariners-d8" | "warning-letters" | "untitled-letters" | "awa" | "swisspar" | "pcac" | "ftc-wl" | "cfpb-orders" | "occ-cd" | "fdic-orders" | "frb-orders" | "ncua-orders" | "fincen-orders" | "ferc-orders" | "ofac-orders" | "bis-orders" | "cftc-orders" | "fifra-orders" | "denovo-orders" | "ttb-oic" | "air-letters" | "superfund-rods" | "ico-mpn" | "cma-ca98" | "form-483" | "gmp" | "gmp-md";
/** Always-public SKUs. /form-483, /gmp, and /gmp-md join only when a real observation body is cached. */
export const PUBLIC_BAZAAR_SKUS: readonly DoorSku[] = [
  "ticks",
  "import-alerts",
  "mariners",
  "mariners-d11",
  "mariners-d7",
  "mariners-d8",
  "warning-letters",
  "untitled-letters",
  "awa",
  "swisspar",
  "pcac",
  "ftc-wl",
  "cfpb-orders",
  "occ-cd",
  "fdic-orders",
  "frb-orders",
  "ncua-orders",
  "fincen-orders",
  "ferc-orders",
  "ofac-orders",
  "bis-orders",
  "cftc-orders",
  "fifra-orders",
  "denovo-orders",
  "ttb-oic",
  "air-letters",
  "superfund-rods",
  "ico-mpn",
  "cma-ca98",
];

export function form483IsPublic(): boolean {
  return hasCachedForm483Body();
}

export function gmpIsPublic(): boolean {
  return hasCachedGmpBody();
}

export function gmpMdIsPublic(): boolean {
  return hasCachedGmpMdBody();
}

export function publicBazaarSkus(): DoorSku[] {
  const skus: DoorSku[] = [...PUBLIC_BAZAAR_SKUS];
  if (form483IsPublic()) skus.push("form-483");
  if (gmpIsPublic()) skus.push("gmp");
  if (gmpMdIsPublic()) skus.push("gmp-md");
  return skus;
}

export function isPublicBazaarSku(sku: DoorSku): boolean {
  return publicBazaarSkus().includes(sku);
}

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "twenty-one", "twenty-two", "twenty-three", "twenty-four", "twenty-five", "twenty-six", "twenty-seven", "twenty-eight", "twenty-nine", "thirty", "thirty-one", "thirty-two"] as const;

function paidCountWord(): string {
  const n = publicBazaarSkus().length;
  return COUNT_WORDS[n] ?? String(n);
}

function noNextSkuWord(): string {
  return `Only the listed ${paidCountWord()} paid GETs are live.`;
}

function amountAtomicFor(sku: DoorSku, query?: Pick<ExtractedPageQuery, "id">): string {
  if (!isTableSku(sku) && isExtractedIdQuery(query)) {
    const raw = env("EXTRACTED_ID_USDC_ATOMIC");
    return raw.length > 0 ? raw : EXTRACTED_ID_AMOUNT_ATOMIC;
  }
  if (sku === "import-alerts") {
    const raw = env("IMPORT_ALERTS_USDC_ATOMIC");
    return raw.length > 0 ? raw : IMPORT_ALERTS_AMOUNT_ATOMIC;
  }
  if (sku === "mariners" || sku === "mariners-d11" || sku === "mariners-d7" || sku === "mariners-d8") {
    const envName = sku === "mariners-d8"
      ? "MARINERS_D8_USDC_ATOMIC"
      : sku === "mariners-d7"
        ? "MARINERS_D7_USDC_ATOMIC"
        : sku === "mariners-d11"
          ? "MARINERS_D11_USDC_ATOMIC"
          : "MARINERS_USDC_ATOMIC";
    const raw = env(envName);
    return raw.length > 0 ? raw : MARINERS_AMOUNT_ATOMIC;
  }
  if (sku === "warning-letters") {
    const raw = env("WARNING_LETTERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : WARNING_LETTERS_AMOUNT_ATOMIC;
  }
  if (sku === "untitled-letters") {
    const raw = env("UNTITLED_LETTERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : UNTITLED_LETTERS_AMOUNT_ATOMIC;
  }
  if (sku === "awa") {
    const raw = env("AWA_USDC_ATOMIC");
    return raw.length > 0 ? raw : AWA_AMOUNT_ATOMIC;
  }
  if (sku === "swisspar") {
    const raw = env("SWISSPAR_USDC_ATOMIC");
    return raw.length > 0 ? raw : SWISSPAR_AMOUNT_ATOMIC;
  }
  if (sku === "pcac") {
    const raw = env("PCAC_USDC_ATOMIC");
    return raw.length > 0 ? raw : PCAC_AMOUNT_ATOMIC;
  }
  if (sku === "ftc-wl") {
    const raw = env("FTC_WL_USDC_ATOMIC");
    return raw.length > 0 ? raw : FTC_WL_AMOUNT_ATOMIC;
  }
  if (sku === "cfpb-orders") {
    const raw = env("CFPB_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : CFPB_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "occ-cd") {
    const raw = env("OCC_CD_USDC_ATOMIC");
    return raw.length > 0 ? raw : OCC_CD_AMOUNT_ATOMIC;
  }
  if (sku === "fdic-orders") {
    const raw = env("FDIC_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : FDIC_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "frb-orders") {
    const raw = env("FRB_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : FRB_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "ncua-orders") {
    const raw = env("NCUA_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : NCUA_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "fincen-orders") {
    const raw = env("FINCEN_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : FINCEN_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "ferc-orders") {
    const raw = env("FERC_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : FERC_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "ofac-orders") {
    const raw = env("OFAC_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : OFAC_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "bis-orders") {
    const raw = env("BIS_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : BIS_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "cftc-orders") {
    const raw = env("CFTC_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : CFTC_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "fifra-orders") {
    const raw = env("FIFRA_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : FIFRA_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "denovo-orders") {
    const raw = env("DENOVO_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : DENOVO_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "ttb-oic") {
    const raw = env("TTB_OIC_USDC_ATOMIC");
    return raw.length > 0 ? raw : TTB_OIC_AMOUNT_ATOMIC;
  }
  if (sku === "air-letters") {
    const raw = env("AIR_LETTERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : AIR_LETTERS_AMOUNT_ATOMIC;
  }
  if (sku === "superfund-rods") {
    const raw = env("SUPERFUND_RODS_USDC_ATOMIC");
    return raw.length > 0 ? raw : SUPERFUND_RODS_AMOUNT_ATOMIC;
  }
  if (sku === "ico-mpn") {
    const raw = env("ICO_MPN_USDC_ATOMIC");
    return raw.length > 0 ? raw : ICO_MPN_AMOUNT_ATOMIC;
  }
  if (sku === "cma-ca98") {
    const raw = env("CMA_CA98_USDC_ATOMIC");
    return raw.length > 0 ? raw : CMA_CA98_AMOUNT_ATOMIC;
  }
  if (sku === "form-483") {
    const raw = env("FORM_483_USDC_ATOMIC");
    return raw.length > 0 ? raw : FORM_483_AMOUNT_ATOMIC;
  }
  if (sku === "gmp") {
    const raw = env("GMP_USDC_ATOMIC");
    return raw.length > 0 ? raw : GMP_AMOUNT_ATOMIC;
  }
  if (sku === "gmp-md") {
    const raw = env("GMP_MD_USDC_ATOMIC");
    return raw.length > 0 ? raw : GMP_MD_AMOUNT_ATOMIC;
  }
  const raw = env("X402_USDC_ATOMIC");
  return raw.length > 0 ? raw : TICKS_AMOUNT_ATOMIC;
}

function usdcPriceString(atomic: string): string {
  const n = Number(atomic);
  if (!Number.isFinite(n)) return atomic;
  return (n / 1e6).toFixed(2);
}

function usdcDisplayFromAtomic(atomic: string | null | undefined): string | null {
  if (!atomic) return null;
  const n = Number(atomic);
  if (!Number.isFinite(n)) return `${atomic} atomic USDC`;
  return `$${usdcPriceString(atomic)}`;
}

const SKU_COPY: Record<DoorSku, { description: string; resourcePath: string }> = {
  ticks: {
    description:
      "US hay, cattle, and grain ticks from official USDA AMS prints. The cache also has produce, wool, and WD1 water where those series exist. Days between reports are not filled in.",
    resourcePath: TICKS_PATH,
  },
  "import-alerts": {
    description: "Official FDA Import Alert / DWPE firm-product snapshot.",
    resourcePath: IMPORT_ALERTS_PATH,
  },
  mariners: {
    description: "Official USCG District 13 / Northwest Local Notice to Mariners.",
    resourcePath: MARINERS_PATH,
  },
  "mariners-d11": {
    description: "Official USCG District 11 / Southwest Local Notice to Mariners.",
    resourcePath: MARINERS_D11_PATH,
  },
  "mariners-d7": {
    description: "Official USCG District 7 / Southeast Local Notice to Mariners.",
    resourcePath: MARINERS_D7_PATH,
  },
  "mariners-d8": {
    description: "Official USCG District 8 / Gulf Local Notice to Mariners.",
    resourcePath: MARINERS_D8_PATH,
  },
  "warning-letters": {
    description: "Official FDA warning-letter bodies (firm, date, subject, full letter text).",
    resourcePath: WARNING_LETTERS_PATH,
  },
  "untitled-letters": {
    description: "Official FDA Untitled Letter text (CDER OPDP + CBER promo).",
    resourcePath: UNTITLED_LETTERS_PATH,
  },
  awa: {
    description: "Official USDA APHIS Animal Welfare Act inspection-report observation text.",
    resourcePath: AWA_PATH,
  },
  swisspar: {
    description: "Official Swissmedic first-authorisation SwissPAR evaluation text.",
    resourcePath: SWISSPAR_PATH,
  },
  pcac: {
    description: "Official FDA PCAC 503A briefing-memo evaluation text.",
    resourcePath: PCAC_PATH,
  },
  "ftc-wl": {
    description: "Official FTC Bureau of Consumer Protection warning-letter text.",
    resourcePath: FTC_WL_PATH,
  },
  "cfpb-orders": {
    description: "Official CFPB consent-order / administrative-order text.",
    resourcePath: CFPB_ORDERS_PATH,
  },
  "occ-cd": {
    description: "Official OCC institution Cease-and-Desist / Consent Order text.",
    resourcePath: OCC_CD_PATH,
  },
  "fdic-orders": {
    description: "Official FDIC institution consent-order / Cease-and-Desist text.",
    resourcePath: FDIC_ORDERS_PATH,
  },
  "frb-orders": {
    description: "Official FRB institution Cease-and-Desist / written-agreement / PCA text.",
    resourcePath: FRB_ORDERS_PATH,
  },
  "ncua-orders": {
    description: "Official NCUA institution consent Cease-and-Desist text.",
    resourcePath: NCUA_ORDERS_PATH,
  },
  "fincen-orders": {
    description: "Official FinCEN institution consent-order text.",
    resourcePath: FINCEN_ORDERS_PATH,
  },
  "ferc-orders": {
    description: "Official FERC institution stipulation-and-consent text.",
    resourcePath: FERC_ORDERS_PATH,
  },
  "ofac-orders": {
    description: "Official OFAC institution enforcement-release text.",
    resourcePath: OFAC_ORDERS_PATH,
  },
  "bis-orders": {
    description: "Official BIS institution charging-letter / order text.",
    resourcePath: BIS_ORDERS_PATH,
  },
  "cftc-orders": {
    description: "Official CFTC institution enforcement-order / settlement text.",
    resourcePath: CFTC_ORDERS_PATH,
  },
  "fifra-orders": {
    description: "Official EPA FIFRA institution order / consent text.",
    resourcePath: FIFRA_ORDERS_PATH,
  },
  "denovo-orders": {
    description: "Official FDA De Novo classification-order text.",
    resourcePath: DENOVO_ORDERS_PATH,
  },
  "ttb-oic": {
    description: "Official TTB Offer in Compromise text.",
    resourcePath: TTB_OIC_PATH,
  },
  "air-letters": {
    description: "Official USDA APHIS Am I Regulated (AIR) confirmation-letter text.",
    resourcePath: AIR_LETTERS_PATH,
  },
  "superfund-rods": {
    description: "Official EPA Superfund Record of Decision text.",
    resourcePath: SUPERFUND_RODS_PATH,
  },
  "ico-mpn": {
    description: "Official UK ICO Monetary Penalty Notice text.",
    resourcePath: ICO_MPN_PATH,
  },
  "cma-ca98": {
    description: "Official UK CMA CA98 infringement-decision text.",
    resourcePath: CMA_CA98_PATH,
  },
  "form-483": {
    description: "Official FDA Form 483 inspectional observation bodies.",
    resourcePath: FORM_483_PATH,
  },
  gmp: {
    description: "Official Health Canada Drug GMP report-card observation text + C.02 cites.",
    resourcePath: GMP_PATH,
  },
  "gmp-md": {
    description: "Official Health Canada medical-device report-card observation text + MDR cites.",
    resourcePath: GMP_MD_PATH,
  },
};

export type SkuBag = {
  count: number;
  firms?: number;
  countLabel: string;
  paidJson: string;
  oneLine: string;
};

const SKU_ONE_LINE: Record<DoorSku, string> = {
  ticks: "US hay, cattle, and grain ticks (USDA AMS official prints)",
  "import-alerts": "FDA Import Alerts / DWPE firm-product snapshot",
  mariners: "USCG D13 / Northwest Local Notice to Mariners",
  "mariners-d11": "USCG D11 / Southwest Local Notice to Mariners",
  "mariners-d7": "USCG D7 / Southeast Local Notice to Mariners",
  "mariners-d8": "USCG D8 / Gulf Local Notice to Mariners",
  "warning-letters": "FDA warning-letter bodies (firm, date, subject, full letter text)",
  "untitled-letters": "FDA Untitled Letter text (CDER OPDP + CBER promo PDFs)",
  awa: "USDA APHIS AWA inspection-report observation text (official per-report PDFs)",
  swisspar: "Swissmedic first-authorisation SwissPAR evaluation text (official per-product PDFs)",
  pcac: "FDA PCAC 503A briefing-memo evaluation text (official per-substance PDFs)",
  "ftc-wl": "FTC BCP warning-letter text (official per-letter PDFs)",
  "cfpb-orders": "CFPB consent-order / administrative-order text (official per-order PDFs)",
  "occ-cd": "OCC institution C&D / consent-order text (official per-order PDFs)",
  "fdic-orders": "FDIC institution consent-order / C&D text (official per-order PDFs)",
  "frb-orders": "FRB institution C&D / written-agreement / PCA text (official per-order PDFs)",
  "ncua-orders": "NCUA institution consent C&D text (official per-order HTML)",
  "fincen-orders": "FinCEN institution consent-order text (official per-order PDFs)",
  "ferc-orders": "FERC institution stipulation-and-consent text (official cms.ferc.gov PDFs)",
  "ofac-orders": "OFAC institution enforcement-release text (official ofac.treasury.gov PDFs)",
  "bis-orders": "BIS institution charging-letter / order text (official bis.gov PDFs)",
  "cftc-orders": "CFTC institution enforcement-order / settlement text (official cftc.gov PDFs)",
  "fifra-orders": "EPA FIFRA institution order / consent text (official yosemite.epa.gov PDFs)",
  "denovo-orders": "FDA De Novo classification-order text (official accessdata.fda.gov PDFs)",
  "ttb-oic": "TTB Offer in Compromise text (official ttb.gov PDFs)",
  "air-letters": "USDA APHIS AIR confirmation-letter text (official direct.aphis.usda.gov PDFs)",
  "superfund-rods": "EPA Superfund Record of Decision text (official semspub.epa.gov PDFs)",
  "ico-mpn": "ICO Monetary Penalty Notice text (official ico.org.uk PDFs)",
  "cma-ca98": "UK CMA CA98 infringement-decision text (official assets.publishing.service.gov.uk PDFs)",
  "form-483": "FDA Form 483 inspectional observation bodies (posted OII FOIA PDFs)",
  gmp: "Health Canada Drug GMP report-card observation text + C.02 cites",
  "gmp-md": "Health Canada medical-device report-card observation text + MDR cites",
};

const SHOP_PRODUCT_ID: Record<DoorSku, string> = {
  ticks: "idaho-hay-feeder-ticks",
  "import-alerts": "fda-import-alerts",
  mariners: "uscg-d13-lnm",
  "mariners-d11": D11_SPEC.productId,
  "mariners-d7": D7_SPEC.productId,
  "mariners-d8": D8_SPEC.productId,
  "warning-letters": "fda-warning-letter-bodies",
  "untitled-letters": "fda-untitled-letter-bodies",
  awa: "aphis-awa-inspection-observation-text",
  swisspar: "swisspar-first-auth",
  pcac: "fda-pcac-503a-memos",
  "ftc-wl": "ftc-bcp-warning-letter-bodies",
  "cfpb-orders": "cfpb-consent-order-bodies",
  "occ-cd": "occ-institution-cd-bodies",
  "fdic-orders": "fdic-institution-order-bodies",
  "frb-orders": "frb-institution-order-bodies",
  "ncua-orders": "ncua-institution-order-bodies",
  "fincen-orders": "fincen-institution-order-bodies",
  "ferc-orders": "ferc-institution-order-bodies",
  "ofac-orders": "ofac-institution-order-bodies",
  "bis-orders": "bis-institution-order-bodies",
  "cftc-orders": "cftc-institution-order-bodies",
  "fifra-orders": "fifra-institution-order-bodies",
  "denovo-orders": "fda-denovo-classification-order-bodies",
  "ttb-oic": "ttb-institution-oic-bodies",
  "air-letters": "aphis-air-confirmation-letter-bodies",
  "superfund-rods": "epa-superfund-rod-bodies",
  "ico-mpn": "ico-institution-mpn-bodies",
  "cma-ca98": "cma-ca98-infringement-decision-bodies",
  "form-483": "fda-form-483-bodies",
  gmp: "hc-gmp-report-cards",
  "gmp-md": "hc-md-inspection-cards",
};

const SHOP_MANIFEST_PATH: Record<DoorSku, string> = {
  ticks: MANIFEST_PATH,
  "import-alerts": IMPORT_ALERTS_MANIFEST_PATH,
  mariners: MARINERS_MANIFEST_PATH,
  "mariners-d11": MARINERS_D11_MANIFEST_PATH,
  "mariners-d7": MARINERS_D7_MANIFEST_PATH,
  "mariners-d8": MARINERS_D8_MANIFEST_PATH,
  "warning-letters": WARNING_LETTERS_MANIFEST_PATH,
  "untitled-letters": UNTITLED_LETTERS_MANIFEST_PATH,
  awa: AWA_MANIFEST_PATH,
  swisspar: SWISSPAR_MANIFEST_PATH,
  pcac: PCAC_MANIFEST_PATH,
  "ftc-wl": FTC_WL_MANIFEST_PATH,
  "cfpb-orders": CFPB_ORDERS_MANIFEST_PATH,
  "occ-cd": OCC_CD_MANIFEST_PATH,
  "fdic-orders": FDIC_ORDERS_MANIFEST_PATH,
  "frb-orders": FRB_ORDERS_MANIFEST_PATH,
  "ncua-orders": NCUA_ORDERS_MANIFEST_PATH,
  "fincen-orders": FINCEN_ORDERS_MANIFEST_PATH,
  "ferc-orders": FERC_ORDERS_MANIFEST_PATH,
  "ofac-orders": OFAC_ORDERS_MANIFEST_PATH,
  "bis-orders": BIS_ORDERS_MANIFEST_PATH,
  "cftc-orders": CFTC_ORDERS_MANIFEST_PATH,
  "fifra-orders": FIFRA_ORDERS_MANIFEST_PATH,
  "denovo-orders": DENOVO_ORDERS_MANIFEST_PATH,
  "ttb-oic": TTB_OIC_MANIFEST_PATH,
  "air-letters": AIR_LETTERS_MANIFEST_PATH,
  "superfund-rods": SUPERFUND_RODS_MANIFEST_PATH,
  "ico-mpn": ICO_MPN_MANIFEST_PATH,
  "cma-ca98": CMA_CA98_MANIFEST_PATH,
  "form-483": FORM_483_MANIFEST_PATH,
  gmp: GMP_MANIFEST_PATH,
  "gmp-md": GMP_MD_MANIFEST_PATH,
};

export function skuPaidJson(sku: DoorSku): string {
  if (sku === "ticks") return "ticks[] + history";
  if (sku === "import-alerts") return "ticks[]";
  if (sku === "mariners" || sku === "mariners-d11" || sku === "mariners-d7" || sku === "mariners-d8") {
    return "notices[]";
  }
  if (sku === "warning-letters" || sku === "form-483") return "letters[].body";
  return "cards[].body";
}

function skuCountUnit(sku: DoorSku): string {
  if (sku === "ticks") return "ticks";
  if (sku === "import-alerts") return "rows";
  if (sku === "mariners" || sku === "mariners-d11" || sku === "mariners-d7" || sku === "mariners-d8") {
    return "notices";
  }
  if (sku === "warning-letters" || sku === "form-483") return "letters";
  return "cards";
}

export function bagFromManifest(sku: DoorSku, man: Record<string, unknown>): SkuBag {
  const count = Number(man.tickCount ?? man.letterCount ?? man.cardCount ?? man.noticeCount ?? 0) || 0;
  const firms = typeof man.firmCount === "number" ? man.firmCount : undefined;
  const countLabel = sku === "import-alerts"
    ? `${count} rows / ${firms ?? 0} firms`
    : `${count} ${skuCountUnit(sku)}`;
  return {
    count,
    firms,
    countLabel,
    paidJson: skuPaidJson(sku),
    oneLine: SKU_ONE_LINE[sku],
  };
}

async function loadSkuManifest(sku: DoorSku): Promise<Record<string, unknown>> {
  switch (sku) {
    case "ticks":
      return buildTicksManifest("https://ticks.bnm.farm/ticks");
    case "import-alerts":
      return manifestFromSnapshot(readImportAlertsSnapshot());
    case "mariners":
      return buildMarinersManifest(readMarinersSnapshot(), D13_SPEC);
    case "mariners-d11":
      return buildMarinersManifest(readMarinersSnapshot(D11_SPEC), D11_SPEC);
    case "mariners-d7":
      return buildMarinersManifest(readMarinersSnapshot(D7_SPEC), D7_SPEC);
    case "mariners-d8":
      return buildMarinersManifest(readMarinersSnapshot(D8_SPEC), D8_SPEC);
    case "warning-letters":
      return loadWarningLettersManifest();
    case "untitled-letters":
      return loadUntitledLettersManifest();
    case "awa":
      return loadAwaManifest();
    case "swisspar":
      return loadSwissparManifest();
    case "pcac":
      return loadPcacManifest();
    case "ftc-wl":
      return loadFtcWlManifest();
    case "cfpb-orders":
      return loadCfpbOrdersManifest();
    case "occ-cd":
      return loadOccCdManifest();
    case "fdic-orders":
      return loadFdicOrdersManifest();
    case "frb-orders":
      return loadFrbOrdersManifest();
    case "ncua-orders":
      return loadNcuaOrdersManifest();
    case "fincen-orders":
      return loadFincenOrdersManifest();
    case "ferc-orders":
      return loadFercOrdersManifest();
    case "ofac-orders":
      return loadOfacOrdersManifest();
    case "bis-orders":
      return loadBisOrdersManifest();
    case "cftc-orders":
      return loadCftcOrdersManifest();
    case "fifra-orders":
      return loadFifraOrdersManifest();
    case "denovo-orders":
      return loadDenovoOrdersManifest();
    case "ttb-oic":
      return loadTtbOicManifest();
    case "air-letters":
      return loadAirLettersManifest();
    case "superfund-rods":
      return loadSuperfundRodsManifest();
    case "ico-mpn":
      return loadIcoMpnManifest();
    case "cma-ca98":
      return loadCmaCa98Manifest();
    case "form-483":
      return loadForm483Manifest();
    case "gmp":
      return loadGmpManifest();
    case "gmp-md":
      return loadGmpMdManifest();
  }
}

let skuBagsMemo: { at: number; bags: Map<DoorSku, SkuBag> } | null = null;
const SKU_BAGS_TTL_MS = 10_000;

export async function loadSkuBags(skus: DoorSku[] = publicBazaarSkus()): Promise<Map<DoorSku, SkuBag>> {
  const now = Date.now();
  if (
    skuBagsMemo
    && now - skuBagsMemo.at < SKU_BAGS_TTL_MS
    && skus.every((sku) => skuBagsMemo!.bags.has(sku))
  ) {
    return skuBagsMemo.bags;
  }
  const bags = new Map<DoorSku, SkuBag>(skuBagsMemo?.bags ?? []);
  await Promise.all(skus.map(async (sku) => {
    try {
      bags.set(sku, bagFromManifest(sku, await loadSkuManifest(sku)));
    } catch {
      bags.set(sku, bagFromManifest(sku, {}));
    }
  }));
  skuBagsMemo = { at: now, bags };
  return bags;
}

export function peekSkuBag(sku: DoorSku): SkuBag | undefined {
  return skuBagsMemo?.bags.get(sku);
}

function extractedBuyerBag(): string {
  return "Find a record on the free index (?q=). Each index row names the id to buy. GET ?id= is one official text for $0.02. Default GET is the newest 10 official texts for $0.05. If the catalog has fewer than 10, that $0.05 GET is the whole current set. Older pages are another $0.05 on the same URL (page/before).";
}

export function skuBuyerDescription(sku: DoorSku, bag?: SkuBag): string {
  const product = SKU_COPY[sku].description.trim();
  const resolved = bag ?? peekSkuBag(sku);
  const count = resolved?.countLabel ?? "live count on GET /";
  const paid = resolved?.paidJson ?? skuPaidJson(sku);
  const ended = product.endsWith(".") ? product : `${product}.`;
  if (isTableSku(sku)) {
    return `${ended} One $0.05 GET returns the entire current table (${count}). Paid JSON is ${paid}.`;
  }
  return `${ended} ${extractedBuyerBag()} Free index lists the full catalog (${count}). Paid JSON is ${paid}.`;
}

export function skuOpenApiSummary(sku: DoorSku, bag: SkuBag): string {
  if (isTableSku(sku)) {
    return `${bag.oneLine} — entire current table on one GET (${bag.countLabel})`;
  }
  return `${bag.oneLine} — ?id= one official text $0.02; default/newest 10 $0.05 (whole current set if n<10) (${bag.countLabel} in catalog)`;
}

export function skuOpenApiDescription(sku: DoorSku, bag: SkuBag): string {
  return skuBuyerDescription(sku, bag);
}

function shopProductCard(sku: DoorSku, bag: SkuBag): Record<string, unknown> {
  const amount = amountAtomicFor(sku);
  return {
    path: SKU_COPY[sku].resourcePath,
    product: SHOP_PRODUCT_ID[sku],
    name: sku === "ticks" ? PRODUCT_NAME : SKU_ONE_LINE[sku],
    priceUsdc: usdcPriceString(amount),
    amountAtomic: amount,
    manifest: SHOP_MANIFEST_PATH[sku],
    description: skuBuyerDescription(sku, bag),
    count: bag.count,
    ...(isTableSku(sku)
      ? {}
      : {
          pageSize: EXTRACTED_PAGE_SIZE,
          search: `${SHOP_MANIFEST_PATH[sku]}?q=`,
          idPriceUsdc: usdcPriceString(EXTRACTED_ID_AMOUNT_ATOMIC),
          idAmountAtomic: EXTRACTED_ID_AMOUNT_ATOMIC,
        }),
    ...(bag.firms !== undefined ? { firms: bag.firms } : {}),
  };
}

const BAZAAR_OUTPUT_EXAMPLE: Record<DoorSku, Record<string, unknown>> = {
  ticks: {
    ok: true,
    product: "idaho-hay-feeder-ticks",
    status: "ok",
    fetchedAt: "2026-08-17T21:22:50Z",
    asOf: "2026-08-12",
    source: "idaho-hay-feeder-ticks cache",
    recordCount: 1,
    records: [
      {
        id: "cattle-tf-feeder-steer",
        date: "2026-08-12",
        firm: "Twin Falls Livestock Commission (Wednesday auction)",
        url: "",
        type: "cattle",
      },
    ],
    ticks: [
      {
        id: "cattle-tf-feeder-steer",
        group: "cattle",
        commodity: "Feeder steers",
        market: "Twin Falls Livestock Commission (Wednesday auction)",
        unit: "$/cwt",
        asOf: "2026-08-12",
        price: 400.2,
        source: "Twin Falls Livestock Commission market report",
      },
    ],
  },
  "import-alerts": {
    ok: true,
    product: "fda-import-alerts",
    status: "ok",
    fetchedAt: "2026-08-18T00:56:39.767Z",
    asOf: "2026-08-17",
    source: "https://www.accessdata.fda.gov/cms_ia/ialist.html",
    recordCount: 1,
    records: [
      {
        id: "16-81:red:Clover Valley Meat Co.:Alligator & Crocodile, Other Aquatic Species — Crocodile",
        date: "2012-06-08",
        firm: "Clover Valley Meat Co.",
        url: "https://www.accessdata.fda.gov/cms_ia/importalert_49.html",
        type: "import-alert",
      },
    ],
    ticks: [
      {
        alertNumber: "16-81",
        type: "DWPE",
        list: "red",
        firm: "Clover Valley Meat Co.",
        country: "AUSTRALIA",
        product: "Alligator & Crocodile, Other Aquatic Species — Crocodile",
        datePublished: "06/08/2012",
        sourceUrl: "https://www.accessdata.fda.gov/cms_ia/importalert_49.html",
        asOf: "2026-08-17",
      },
    ],
  },
  mariners: {
    ok: true,
    product: "uscg-d13-lnm",
    status: "ok",
    week: "32-2026",
    asOf: "2026-08-12",
    source: "https://www.navcen.uscg.gov/local-notices-to-mariners?district=13+0&subdistrict=n",
    recordCount: 1,
    records: [
      {
        id: "32-2026:Federal Discrepancies:19055",
        date: "2026-08-12",
        firm: "Anacortes Harbor",
        url: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
        type: "mariners",
      },
    ],
    notices: [
      {
        week: "32-2026",
        section: "Federal Discrepancies",
        waterway: "Anacortes Harbor",
        text: "Anacortes Channel Light 4 LLNR 19055 TRLB/STRUCT MISSING/STRUCT DEST FD",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
      },
    ],
  },
  "mariners-d11": {
    ok: true,
    product: "uscg-d11-lnm",
    status: "ok",
    week: "32-2026",
    asOf: "2026-08-12",
    source: "https://www.navcen.uscg.gov/local-notices-to-mariners?district=11+0&subdistrict=n",
    recordCount: 1,
    records: [
      {
        id: "32-2026:Federal Discrepancies:5430",
        date: "2026-08-12",
        firm: "Berkeley",
        url: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm11322026.pdf",
        type: "mariners-d11",
      },
    ],
    notices: [
      {
        week: "32-2026",
        section: "Federal Discrepancies",
        waterway: "Berkeley",
        text: "Berkeley Marina Channel Light 2 LLNR 5430 LT EXT FD",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm11322026.pdf",
      },
    ],
  },
  "mariners-d7": {
    ok: true,
    product: "uscg-d7-lnm",
    status: "ok",
    week: "32-2026",
    asOf: "2026-08-12",
    source: "https://www.navcen.uscg.gov/local-notices-to-mariners?district=7+0&subdistrict=n",
    recordCount: 1,
    records: [
      {
        id: "32-2026:Federal Discrepancies:36887",
        date: "2026-08-12",
        firm: "Altamaha Sound",
        url: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm07322026.pdf",
        type: "mariners-d7",
      },
    ],
    notices: [
      {
        week: "32-2026",
        section: "Federal Discrepancies",
        waterway: "Altamaha Sound",
        text: "Altamaha Sound Daybeacon 197 LLNR 36887 STRUCT DEST/TRUB FD",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm07322026.pdf",
      },
    ],
  },
  "mariners-d8": {
    ok: true,
    product: "uscg-d8-lnm",
    status: "ok",
    week: "33-2026",
    asOf: "2026-08-19",
    source: "https://www.navcen.uscg.gov/local-notices-to-mariners?district=8+0&subdistrict=g",
    recordCount: 1,
    records: [
      {
        id: "33-2026:Federal Discrepancies:20305",
        date: "2026-08-19",
        firm: "Acadiana Navigation Channel",
        url: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm0833g2026.pdf",
        type: "mariners-d8",
      },
    ],
    notices: [
      {
        week: "33-2026",
        section: "Federal Discrepancies",
        waterway: "Acadiana Navigation Channel",
        text: "Acadiana Navigation Channel Light 6 LLNR 20305 STRUCT DEST/TRLB FD",
        sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm0833g2026.pdf",
      },
    ],
  },
  "warning-letters": {
    ok: true,
    product: "fda-warning-letter-bodies",
    status: "ok",
    fetchedAt: "2026-08-19T15:20:36.317Z",
    asOf: "2026-08-13",
    source:
      "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters",
    recordCount: 1,
    records: [
      {
        id: "citra100mg-722606-03042026",
        date: "2026-03-04",
        firm: "Citra100mg",
        url: "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/citra100mg-722606-03042026",
        type: "warning-letter",
      },
    ],
    letters: [
      {
        firm: "Citra100mg",
        cms: "722606",
        issuedOn: "2026-03-04",
        subject: "Unapproved New Drugs/Misbranded",
        sourceUrl:
          "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/citra100mg-722606-03042026",
        body: "WARNING LETTER\nMarch 4, 2026\nRE: Notice of Unlawful Sale of Unapproved and Misbranded Drugs…",
      },
    ],
  },
  "untitled-letters": {
    ok: true,
    product: "fda-untitled-letter-bodies",
    status: "ok",
    fetchedAt: "2026-08-19T22:20:31.840Z",
    asOf: "2026-04-28",
    source:
      "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/issuance-untitled-letters",
    recordCount: 1,
    records: [
      {
        id: "bayer-healthcare-pharmaceuticals-inc-192241",
        date: "2026-04-28",
        firm: "Bayer HealthCare Pharmaceuticals, Inc.",
        url: "https://www.fda.gov/media/192241/download",
        type: "untitled-letter",
      },
    ],
    cards: [
      {
        id: "bayer-healthcare-pharmaceuticals-inc-192241",
        firm: "Bayer HealthCare Pharmaceuticals, Inc.",
        date: "2026-04-28",
        product: "NUBEQA® (darolutamide) tablets, for oral use",
        office: "OPDP",
        sourceUrl: "https://www.fda.gov/media/192241/download",
        cites: ["FD&C Act"],
        said: "FDA has determined that the video and TV ad are false or misleading.",
        body: "The Office of Prescription Drug Promotion (OPDP) of the U.S. Food and Drug Administration (FDA) has reviewed the promotional communications…",
      },
    ],
  },
  awa: {
    ok: true,
    product: "aphis-awa-inspection-observation-text",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-07-07",
    source: "https://www.aphis.usda.gov/awa/public-search",
    recordCount: 1,
    records: [
      {
        id: "utah-state-university-068SJ00001KXrsj",
        date: "2026-07-07",
        firm: "Utah State University",
        url: "https://aphis.file.force.com/sfc/dist/version/download/?oid=00Dt0000000GyZH&ids=068SJ00001KXrsj&asPdf=false",
        type: "awa",
      },
    ],
    cards: [
      {
        id: "utah-state-university-068SJ00001KXrsj",
        firm: "Utah State University",
        date: "2026-07-07",
        certificate: "87-R-0002",
        inspectionId: "INS-0001617878",
        sourceUrl:
          "https://aphis.file.force.com/sfc/dist/version/download/?oid=00Dt0000000GyZH&ids=068SJ00001KXrsj&asPdf=false",
        body: "Inspection Report\nUtah State University\n2.31(c)(7) Critical\nInstitutional Animal Care and Use Committee (IACUC).\n82 naked mole rats were euthanized by a method not on the approved protocol.",
      },
    ],
  },
  swisspar: {
    ok: true,
    product: "swisspar-first-auth",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-08-18",
    source: "https://www.swissmedic.ch/swissmedic/en/home/humanarzneimittel/authorisations/swisspar.html",
    recordCount: 1,
    records: [
      {
        id: "rhapsido-70227",
        date: "2026-08-18",
        firm: "Novartis Pharma Schweiz AG",
        url: "https://www.swissmedic.ch/dam/swissmedic/en/dokumente/zulassung/swisspar/70227-rhapsido-01-swisspar-20280818.pdf.download.pdf/SwissPAR_inkl.%20FI_Rhapsido.pdf",
        type: "swisspar",
      },
    ],
    cards: [
      {
        id: "rhapsido-70227",
        name: "Rhapsido",
        inn: "remibrutinib",
        ma: "70227",
        date: "2026-08-18",
        holder: "Novartis Pharma Schweiz AG",
        sourceUrl:
          "https://www.swissmedic.ch/dam/swissmedic/en/dokumente/zulassung/swisspar/70227-rhapsido-01-swisspar-20280818.pdf.download.pdf/SwissPAR_inkl.%20FI_Rhapsido.pdf",
        body: "Swiss Public Assessment Report\nRhapsido\nInternational non-proprietary name: remibrutinib\nMarketing authorisation no.: 70227",
      },
    ],
  },
  pcac: {
    ok: true,
    product: "fda-pcac-503a-memos",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-05-11",
    source:
      "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026",
    recordCount: 1,
    records: [
      {
        id: "emideltide-193344",
        date: "2026-05-11",
        firm: "Emideltide",
        url: "https://www.fda.gov/media/193344/download",
        type: "pcac",
      },
    ],
    cards: [
      {
        id: "emideltide-193344",
        substance: "Emideltide",
        date: "2026-05-11",
        meeting: "July 23-24, 2026",
        mediaId: "193344",
        sourceUrl: "https://www.fda.gov/media/193344/download",
        body: "FDA Briefing Document\nPharmacy Compounding Advisory Committee (PCAC) Meeting\nJuly 23 -24, 2026\nFDA Evaluation of Emideltide-Related Bulk Drug Substances",
      },
    ],
  },
  "ftc-wl": {
    ok: true,
    product: "ftc-bcp-warning-letter-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-07-06",
    source: "https://www.ftc.gov/legal-library/browse/warning-letters",
    recordCount: 1,
    records: [
      {
        id: "vtron-inc-dba-vtron-lasers",
        date: "2026-07-06",
        firm: "Vtron Inc. d/b/a Vtron Lasers",
        url: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
        type: "ftc-wl",
      },
    ],
    cards: [
      {
        id: "vtron-inc-dba-vtron-lasers",
        firm: "Vtron Inc. d/b/a Vtron Lasers",
        date: "2026-07-06",
        subject: "Warning Letter Regarding “Made in the USA” Representations",
        sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
        body: "Bureau of Consumer Protection\nJuly 6, 2026\nVtron Inc. d/b/a Vtron Lasers\nRe: Warning Letter Regarding “Made in the USA” Representations",
      },
    ],
  },
  "cfpb-orders": {
    ok: true,
    product: "cfpb-consent-order-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2025-01-17",
    source: "https://www.consumerfinance.gov/enforcement/actions/",
    recordCount: 1,
    records: [
      {
        id: "american-honda-finance-corporation-2025",
        date: "2025-01-17",
        firm: "American Honda Finance Corporation",
        url: "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
        type: "cfpb-order",
      },
    ],
    cards: [
      {
        id: "american-honda-finance-corporation-2025",
        firm: "American Honda Finance Corporation",
        date: "2025-01-17",
        fileNo: "2025-CFPB-0003",
        sourceUrl:
          "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
        body: "UNITED STATES OF AMERICA\nCONSUMER FINANCIAL PROTECTION BUREAU\nADMINISTRATIVE PROCEEDING File No. 2025-CFPB-0003\nCONSENT ORDER\nAmerican Honda Finance Corp.",
      },
    ],
  },
  "occ-cd": {
    ok: true,
    product: "occ-institution-cd-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-06-16",
    source: "https://apps.occ.gov/EASearch",
    recordCount: 1,
    records: [
      {
        id: "AA-ENF-2026-29",
        date: "2026-06-16",
        firm: "United Texas Bank, National Association",
        url: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
        type: "occ-cd",
      },
    ],
    cards: [
      {
        id: "AA-ENF-2026-29",
        bank: "United Texas Bank, National Association",
        docket: "AA-ENF-2026-29",
        date: "2026-06-16",
        sourceUrl: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
        body: "UNITED STATES OF AMERICA\nDEPARTMENT OF THE TREASURY\nOFFICE OF THE COMPTROLLER OF THE CURRENCY\nAA-ENF-2026-29\nCONSENT ORDER\nUnited Texas Bank, N.A.\nDallas, Texas",
      },
    ],
  },
  "fdic-orders": {
    ok: true,
    product: "fdic-institution-order-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-01-13",
    source: "https://orders.fdic.gov/s/",
    recordCount: 1,
    records: [
      {
        id: "FDIC-26-0001b",
        date: "2026-01-13",
        firm: "MutualOne Bank",
        url: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
        type: "fdic-order",
      },
    ],
    cards: [
      {
        id: "FDIC-26-0001b",
        bank: "MutualOne Bank",
        docket: "FDIC-26-0001b",
        date: "2026-01-13",
        sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
        body: "FEDERAL DEPOSIT INSURANCE CORPORATION\nWASHINGTON, D.C.\nCONSENT ORDER FDIC-26-0001b\nMUTUALONE BANK\nFramingham, Massachusetts",
      },
    ],
  },
  "frb-orders": {
    ok: true,
    product: "frb-institution-order-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-04-14",
    source: "https://www.federalreserve.gov/supervisionreg/enforcementactions.htm",
    recordCount: 1,
    records: [
      {
        id: "26-019-B-HC",
        date: "2026-04-14",
        firm: "Community Bankshares, Inc.",
        url: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf",
        type: "frb-order",
      },
    ],
    cards: [
      {
        id: "26-019-B-HC",
        institution: "Community Bankshares, Inc.",
        docket: "26-019-B-HC",
        date: "2026-04-14",
        sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf",
        body: "BOARD OF GOVERNORS OF THE FEDERAL RESERVE SYSTEM\nDocket No. 26-019-B-HC\nCOMMUNITY BANKSHARES, INC.\nOrder to Cease and Desist",
      },
    ],
  },
  "ncua-orders": {
    ok: true,
    product: "ncua-institution-order-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2021-02-22",
    source: "https://ncua.gov/news/enforcement-actions/administrative-orders",
    recordCount: 1,
    records: [
      {
        id: "21-0105-ER",
        date: "2021-02-22",
        firm: "Live Life Federal Credit Union",
        url: "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
        type: "ncua-order",
      },
    ],
    cards: [
      {
        id: "21-0105-ER",
        creditUnion: "Live Life Federal Credit Union",
        docket: "21-0105-ER",
        date: "2021-02-22",
        sourceUrl:
          "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
        body: "NATIONAL CREDIT UNION ADMINISTRATION\nDocket No. 21-0105-ER\nLIVE LIFE FEDERAL CREDIT UNION\nStipulation and Consent to Cease and Desist Order",
      },
    ],
  },
  "fincen-orders": {
    ok: true,
    product: "fincen-institution-order-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-08-03",
    source: "https://www.fincen.gov/news/enforcement-actions",
    recordCount: 1,
    records: [
      {
        id: "2026-02",
        date: "2026-08-03",
        firm: "UBS Financial Services Inc.",
        url: "https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf",
        type: "fincen-order",
      },
    ],
    cards: [
      {
        id: "2026-02",
        institution: "UBS Financial Services Inc.",
        docket: "2026-02",
        date: "2026-08-03",
        sourceUrl: "https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf",
        body: "UNITED STATES OF AMERICA\nFINANCIAL CRIMES ENFORCEMENT NETWORK\nIN THE MATTER OF:\nUBS Financial Services Inc.\nNumber 2026-02\nCONSENT ORDER",
      },
    ],
  },
  "ferc-orders": {
    ok: true,
    product: "ferc-institution-order-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-04-17",
    source: "https://www.ferc.gov/civil-penalties/all-civil-penalty-actions-2026",
    recordCount: 1,
    records: [
      {
        id: "IN25-6-000",
        date: "2026-04-17",
        firm: "Interstate Power and Light Company",
        url: "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
        type: "ferc-order",
      },
    ],
    cards: [
      {
        id: "IN25-6-000",
        institution: "Interstate Power and Light Company",
        docket: "IN25-6-000",
        date: "2026-04-17",
        sourceUrl:
          "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
        body: "UNITED STATES OF AMERICA\nFEDERAL ENERGY REGULATORY COMMISSION\nInterstate Power and Light Company\nDocket No. IN25-6-000\nORDER APPROVING STIPULATION AND CONSENT AGREEMENT",
      },
    ],
  },
  "ofac-orders": {
    ok: true,
    product: "ofac-institution-order-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-08-12",
    source: "https://ofac.treasury.gov/civil-penalties-and-enforcement-information",
    recordCount: 1,
    records: [
      {
        id: "936706",
        date: "2026-08-12",
        firm: "Rice Lake Weighing Systems, Inc.",
        url: "https://ofac.treasury.gov/media/936706/download",
        type: "ofac-order",
      },
    ],
    cards: [
      {
        id: "936706",
        institution: "Rice Lake Weighing Systems, Inc.",
        docket: "936706",
        date: "2026-08-12",
        sourceUrl: "https://ofac.treasury.gov/media/936706/download",
        body: "DEPARTMENT OF THE TREASURY\nOFFICE OF FOREIGN ASSETS CONTROL\nEnforcement Release: August 12, 2026\nRice Lake Weighing Systems Settles with OFAC",
      },
    ],
  },
  "bis-orders": {
    ok: true,
    product: "bis-institution-order-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-04-13",
    source: "https://www.bis.gov/enforcement/charging-letters",
    recordCount: 1,
    records: [
      {
        id: "E3050",
        date: "2026-04-13",
        firm: "Coastal PVA Technology, Inc.",
        url: "https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
        type: "bis-order",
      },
    ],
    cards: [
      {
        id: "E3050",
        institution: "Coastal PVA Technology, Inc.",
        docket: "E3050",
        date: "2026-04-13",
        sourceUrl: "https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
        body: "UNITED STATES DEPARTMENT OF COMMERCE\nBureau of Industry and Security\nPROPOSED CHARGING LETTER\nCoastal PVA Technology, Inc.",
      },
    ],
  },
  "cftc-orders": {
    ok: true,
    product: "cftc-institution-order-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-07-31",
    source: "https://www.cftc.gov/LawRegulation/Enforcement/EnforcementActions/index.htm",
    recordCount: 1,
    records: [
      {
        id: "26-04",
        date: "2026-07-31",
        firm: "UBS Financial Services Inc.",
        url: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
        type: "cftc-order",
      },
    ],
    cards: [
      {
        id: "26-04",
        institution: "UBS Financial Services Inc.",
        docket: "26-04",
        date: "2026-07-31",
        sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
        body: "UNITED STATES OF AMERICA\nBefore the\nCOMMODITY FUTURES TRADING COMMISSION\nUBS Financial Services Inc.\nCFTC Docket No. 26-04\nORDER INSTITUTING PROCEEDINGS",
      },
    ],
  },
  "fifra-orders": {
    ok: true,
    product: "fifra-institution-order-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-07-29",
    source: "https://yosemite.epa.gov/oa/rhc/epaadmin.nsf",
    recordCount: 1,
    records: [
      {
        id: "FIFRA-05-2026-0015",
        date: "2026-07-29",
        firm: "Travel Caddy, Inc. dba Travelon",
        url: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/FIFRA-05-2026-0015_CAFO_TravelCaddyIncdbaTravelon_FranklinParkIllinois_14PGS.pdf",
        type: "fifra-order",
      },
    ],
    cards: [
      {
        id: "FIFRA-05-2026-0015",
        institution: "Travel Caddy, Inc. dba Travelon",
        docket: "FIFRA-05-2026-0015",
        date: "2026-07-29",
        sourceUrl: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/FIFRA-05-2026-0015_CAFO_TravelCaddyIncdbaTravelon_FranklinParkIllinois_14PGS.pdf",
        body: "UNITED STATES ENVIRONMENTAL PROTECTION AGENCY\nConsent Agreement and Final Order\nTravel Caddy, Inc. dba Travelon\nFIFRA-05-2026-0015",
      },
    ],
  },
  "denovo-orders": {
    ok: true,
    product: "fda-denovo-classification-order-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-07-28",
    source: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/denovo.cfm",
    recordCount: 1,
    records: [
      {
        id: "DEN250042",
        date: "2026-07-28",
        firm: "Caristo Diagnostics Ltd.",
        url: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf",
        type: "denovo-order",
      },
    ],
    cards: [
      {
        id: "DEN250042",
        institution: "Caristo Diagnostics Ltd.",
        docket: "DEN250042",
        date: "2026-07-28",
        sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf",
        body: "Food and Drug Administration\nCenter for Devices and Radiological Health\nRe: DEN250042\nTrade/Device Name: CaRi-Heart\nThis order, therefore, classifies the CaRi-Heart",
      },
    ],
  },
  "ttb-oic": {
    ok: true,
    product: "ttb-institution-oic-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-06-30",
    source: "https://www.ttb.gov/business-central/fo/administrative-cases",
    recordCount: 1,
    records: [
      {
        id: "21st-amendment",
        date: "2026-06-30",
        firm: "The 21st Amendment Brewery Cafe, LLC",
        url: "https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
        type: "ttb-oic",
      },
    ],
    cards: [
      {
        id: "21st-amendment",
        institution: "The 21st Amendment Brewery Cafe, LLC",
        docket: "21st-amendment",
        date: "2026-06-30",
        sourceUrl: "https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
        body: "DEPARTMENT OF THE TREASURY\nALCOHOL AND TOBACCO TAX AND TRADE BUREAU\nABSTRACT AND STATEMENT\nThe 21st Amendment Brewery Cafe, LLC\nOffer-in-Compromise",
      },
    ],
  },
  "air-letters": {
    ok: true,
    product: "aphis-air-confirmation-letter-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-06-22",
    source: "https://www.aphis.usda.gov/confirmation-letters",
    recordCount: 1,
    records: [
      {
        id: "26-173-01air",
        date: "2026-06-22",
        firm: "KAGOME Co., LTD.",
        url: "https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf",
        type: "air-letter",
      },
    ],
    cards: [
      {
        id: "26-173-01air",
        institution: "KAGOME Co., LTD.",
        docket: "26-173-01air",
        date: "2026-06-22",
        sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf",
        body: "United States Department of Agriculture\nAnimal and Plant Health Inspection Service\nBiotechnology Regulatory Services\nRe: Confirmation of the regulatory status\n26-173-01air\n7 CFR part 340",
      },
    ],
  },
  "superfund-rods": {
    ok: true,
    product: "epa-superfund-rod-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-08-05",
    source: "https://cumulis.epa.gov/supercpad/SiteProfiles/index.cfm?fuseaction=second.Cleanup&id=0501275",
    recordCount: 1,
    records: [
      {
        id: "05-711427",
        date: "2026-08-05",
        firm: "Federated Metals Corp. Whiting Superfund Site",
        url: "https://semspub.epa.gov/work/05/711427.pdf",
        type: "superfund-rod",
      },
    ],
    cards: [
      {
        id: "05-711427",
        institution: "Federated Metals Corp. Whiting Superfund Site",
        docket: "05-711427",
        date: "2026-08-05",
        sourceUrl: "https://semspub.epa.gov/work/05/711427.pdf",
        body: "United States Environmental Protection Agency\nINTERIM RECORD OF DECISION\nFederated Metals Corp. Whiting Superfund Site\nOperable Unit 1\nDECLARATION\nCERCLA",
      },
    ],
  },
  "ico-mpn": {
    ok: true,
    product: "ico-institution-mpn-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-02-23",
    source: "https://ico.org.uk/action-weve-taken/enforcement/?type=monetary-penalties",
    recordCount: 1,
    records: [
      {
        id: "reddit-mpn-20260223",
        date: "2026-02-23",
        firm: "Reddit, Inc.",
        url: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
        type: "ico-mpn",
      },
    ],
    cards: [
      {
        id: "reddit-mpn-20260223",
        institution: "Reddit, Inc.",
        docket: "reddit-mpn-20260223",
        date: "2026-02-23",
        sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
        body: "PENALTY NOTICE\nREDDIT, INC.\nDATA PROTECTION ACT 2018 (PART 6, SECTION 155)\nENFORCEMENT POWERS OF THE INFORMATION COMMISSIONER",
      },
    ],
  },
  "cma-ca98": {
    ok: true,
    product: "cma-ca98-infringement-decision-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2025-02-21",
    source: "https://www.gov.uk/cma-cases/financial-services-sector-suspected-anti-competitive-practices",
    recordCount: 1,
    records: [
      {
        id: "50601-citi-db",
        date: "2025-02-21",
        firm: "Citigroup Global Markets Limited / Deutsche Bank Aktiengesellschaft",
        url: "https://assets.publishing.service.gov.uk/media/6876390d352c290d20dcae7c/Citi-Deutsche_Bank__Non-confidential_decision.pdf",
        type: "cma-ca98",
      },
    ],
    cards: [
      {
        id: "50601-citi-db",
        institution: "Citigroup Global Markets Limited / Deutsche Bank Aktiengesellschaft",
        docket: "50601-citi-db",
        date: "2025-02-21",
        sourceUrl:
          "https://assets.publishing.service.gov.uk/media/6876390d352c290d20dcae7c/Citi-Deutsche_Bank__Non-confidential_decision.pdf",
        body: "Decision of the Competition and Markets Authority\nCompetition Act 1998\nNon-confidential infringement decision\nCrown copyright / Open Government Licence",
      },
    ],
  },
  "form-483": {
    ok: true,
    product: "fda-form-483-bodies",
    status: "ok",
    fetchedAt: "2026-08-23T10:30:48.442Z",
    asOf: "2026-08-12",
    source: "https://www.fda.gov/about-fda/office-inspections-and-investigations/oii-foia-electronic-reading-room",
    recordCount: 1,
    records: [
      {
        id: "cascade-specialty-pharmacy-llc-193964",
        date: "2026-07-31",
        firm: "Cascade Specialty Pharmacy LLC",
        url: "https://www.fda.gov/media/193964/download",
        type: "form-483",
      },
    ],
    letters: [
      {
        firm: "Cascade Specialty Pharmacy LLC",
        fei: "3015133983",
        recordDate: "2026-07-17",
        sourceUrl: "https://www.fda.gov/media/193964/download",
        body: "This document lists observations made by the FDA representative(s) during the inspection of your facility.\nOBSERVATION 1\nThe responsibilities and procedures applicable to the quality control unit are not fully followed.",
      },
    ],
  },
  gmp: {
    ok: true,
    product: "hc-gmp-report-cards",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-04-13",
    source: "https://www.drug-inspections.canada.ca/gmp/index-en.html",
    recordCount: 1,
    records: [
      {
        id: "apotex-inc-88796",
        date: "2026-04-13",
        firm: "Apotex Inc",
        url: "https://www.drug-inspections.canada.ca/gmp/fullReportCard-en.html?insNumber=88796&lang=en",
        type: "gmp",
      },
    ],
    cards: [
      {
        id: "apotex-inc-88796",
        firm: "Apotex Inc",
        inspectionNumber: "88796",
        referenceNumber: "501259",
        inspectedOn: "2026-04-13",
        sourceUrl: "https://www.drug-inspections.canada.ca/gmp/fullReportCard-en.html?insNumber=88796&lang=en",
        body: "Summary of observations\n1. C.02.011 - Manufacturing control\nInvestigations into deviations, reports, and/or follow-up actions were inadequate.",
      },
    ],
  },
  "gmp-md": {
    ok: true,
    product: "hc-md-inspection-cards",
    status: "ok",
    fetchedAt: "2026-08-23T12:00:00.000Z",
    asOf: "2026-05-25",
    source: "https://www.drug-inspections.canada.ca/md/index-en.html",
    recordCount: 1,
    records: [
      {
        id: "can-med-healthcare-501",
        date: "2026-05-25",
        firm: "CAN-MED HEALTHCARE",
        url: "https://www.drug-inspections.canada.ca/md/fullReportCard-en.html?insNumber=501&lang=en",
        type: "gmp-md",
      },
    ],
    cards: [
      {
        id: "can-med-healthcare-501",
        firm: "CAN-MED HEALTHCARE",
        inspectionNumber: "501",
        referenceNumber: "111868",
        inspectedOn: "2026-05-25",
        sourceUrl: "https://www.drug-inspections.canada.ca/md/fullReportCard-en.html?insNumber=501&lang=en",
        body: "Health Canada medical-device inspection report card\nSummary of observations\n1. MDR s.NN (official cite + observation narrative after payment)",
      },
    ],
  },
};

/** x402 Bazaar discovery block (v2 PAYMENT-REQUIRED extensions.bazaar). */
export function bazaarExtension(sku: DoorSku): Record<string, unknown> {
  const bag = peekSkuBag(sku);
  return {
    info: {
      input: {
        type: "http",
        method: "GET",
        queryParams: isTableSku(sku) ? {} : { id: "record-id", page: "1" },
      },
      output: {
        type: "json",
        description: skuBuyerDescription(sku, bag),
        example: BAZAAR_OUTPUT_EXAMPLE[sku],
      },
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            type: { type: "string", const: "http" },
            method: { type: "string", enum: ["GET", "HEAD", "DELETE"] },
            queryParams: {
              type: "object",
              additionalProperties: { type: "string" },
            },
            headers: {
              type: "object",
              additionalProperties: { type: "string" },
            },
          },
          required: ["type", "method"],
          additionalProperties: false,
        },
        output: {
          type: "object",
          properties: {
            type: { type: "string" },
            example: { type: "object" },
          },
          required: ["type"],
        },
      },
      required: ["input"],
    },
  };
}

/** Media-box default: farm-plan collector writes board.json / history.json here. */
export const DEFAULT_TICKS_DIR = join(homedir(), "projects/farm-plan/data/prices");

export function ticksDir(): string {
  if (Object.prototype.hasOwnProperty.call(process.env, "TICKS_DIR")) {
    const explicit = env("TICKS_DIR");
    if (explicit) return resolve(explicit);
    if (env("FARM_DATA_DIR")) return resolve(env("FARM_DATA_DIR"), "prices");
    return "";
  }
  if (env("FARM_DATA_DIR")) return resolve(env("FARM_DATA_DIR"), "prices");
  return resolve(DEFAULT_TICKS_DIR);
}

function boardPath(): string {
  const explicit = env("TICKS_PATH");
  if (explicit) return resolve(explicit);
  const dir = ticksDir();
  return dir ? resolve(dir, "board.json") : "";
}

function historyPath(): string {
  const dir = ticksDir();
  if (dir) return resolve(dir, "history.json");
  const board = boardPath();
  return board ? resolve(board, "..", "history.json") : "";
}

export function isOrganicHay(row: Record<string, unknown>): boolean {
  const blob = [row.id, row.series, row.kind, row.commodity, row.label, row.name]
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ");
  return /\borganic\b/.test(blob);
}

function isPublicTick(row: Record<string, unknown>): boolean {
  if (isOrganicHay(row)) return false;
  const id = String(row.id ?? row.series ?? "").toLowerCase();
  if (PUBLIC_SERIES_PREFIXES.some((p) => id.startsWith(p))) return true;
  const blob = [
    row.source,
    row.market,
    row.source_url,
    row.sourceUrl,
    row.label,
    row.id,
  ]
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ");
  return PUBLIC_SOURCE_MARKERS.some((m) => blob.includes(m));
}

export function publicEmptyReport(row: Record<string, unknown>): { id: string; status: "empty" } | null {
  if (isOrganicHay(row)) return null;
  const id = String(row.id ?? row.series ?? "").trim();
  if (!id) return null;
  return { id, status: "empty" };
}

function stripCollectMemo<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  for (const key of ["reason", "note", "message"] as const) {
    const value = next[key];
    if (typeof value === "string" && COLLECT_MEMO_RE.test(value)) delete next[key];
  }
  return next;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
}

function readJsonFile(path: string): Record<string, unknown> | null {
  if (!path || !existsSync(path) || !statSync(path).isFile()) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Newest official row per series when board.json is missing or unreadable. */
export function latestTicksFromHistory(points: Record<string, unknown>[]): Record<string, unknown>[] {
  const latest = new Map<string, Record<string, unknown>>();
  for (const point of points) {
    const series = String(point.series ?? point.id ?? "").trim();
    if (!series) continue;
    if (typeof point.price !== "number" || !Number.isFinite(point.price)) continue;
    const key = `${String(point.reportDate ?? point.asOf ?? "")}\0${String(point.collectedAt ?? "")}`;
    const prev = latest.get(series);
    const prevKey = prev
      ? `${String(prev.reportDate ?? prev.asOf ?? "")}\0${String(prev.collectedAt ?? "")}`
      : "";
    if (!prev || key > prevKey) latest.set(series, point);
  }
  return [...latest.values()].map((point) => {
    const id = String(point.series ?? point.id ?? "");
    const asOf = String(point.asOf ?? point.reportDate ?? "").slice(0, 10);
    return { ...point, id, asOf: asOf || null };
  });
}

export function loadTicks(): TicksPayload {
  const boardFile = boardPath();
  const histFile = historyPath();
  const board = readJsonFile(boardFile);
  const historyFile = readJsonFile(histFile);

  const rows = asRecordArray(board?.rows).filter(isPublicTick).map(stripCollectMemo);
  const failed = asRecordArray(board?.failed).filter(isPublicTick).map(stripCollectMemo);
  const hist = (board?.history && typeof board.history === "object"
    ? (board.history as Record<string, unknown>)
    : historyFile) ?? {};
  const points = asRecordArray(hist.points).filter(isPublicTick).map(stripCollectMemo);
  const emptyReports = asRecordArray(hist.emptyReports)
    .map(publicEmptyReport)
    .filter((row): row is { id: string; status: "empty" } => row !== null);
  const series = asRecordArray(hist.series).filter(isPublicTick).map(stripCollectMemo);
  const ticks = rows.length > 0
    ? rows
    : latestTicksFromHistory(points).filter(isPublicTick).map(stripCollectMemo);
  const fetchedAt = typeof board?.fetchedAt === "string"
    ? board.fetchedAt
    : typeof board?.cachedAt === "string"
      ? board.cachedAt
      : points.reduce<string | null>((latest, point) => {
          const collected = typeof point.collectedAt === "string" ? point.collectedAt : "";
          return collected && (!latest || collected > latest) ? collected : latest;
        }, null);

  if (!board && !historyFile) {
    return mergeAmsNationalTicks({
      ok: true,
      product: "idaho-hay-feeder-ticks",
      sources: [...TICKS_SOURCE_NAMES],
      status: "empty",
      reason:
        `Ticks are not on this host. Default cache is ${DEFAULT_TICKS_DIR} (board.json / history.json). Set TICKS_DIR or TICKS_PATH.`,
      fetchedAt: null,
      ticks: [],
      failed: [],
      history: { points: [], emptyReports: [], series: [] },
    });
  }

  const hasTicks = ticks.length + points.length > 0;
  return mergeAmsNationalTicks({
    ok: true,
    product: "idaho-hay-feeder-ticks",
    sources: [...TICKS_SOURCE_NAMES],
    status: hasTicks ? "ok" : "stale",
    reason: hasTicks
      ? null
      : "Price cache is present but has no official hay / feeder / IF_FV130 / IBC / WD1 / 3058 / 2914 / nationwide AMS ticks.",
    fetchedAt,
    ticks,
    failed,
    history: { points, emptyReports, series },
  });
}

const GROUP_LABELS: { id: string; name: string }[] = [
  { id: "hay", name: "Hay" },
  { id: "cattle", name: "Cattle" },
  { id: "produce", name: "Produce" },
  { id: "grain", name: "Grain" },
  { id: "water", name: "Water" },
  { id: "pulses", name: "Pulses" },
  { id: "wool", name: "Wool" },
];

const SAMPLE_SERIES_IDS = [
  "cattle-tf-feeder-steer",
  "hay.ams_3058.columbia_basin.alfalfa.premium",
  "ams.if_fv130.onion.yellow_hybrid.us1.sack50.jumbo.columbia_umatilla",
  "ibc.id.grain.idaho_falls.barley_malting",
  "ams.2914.pnw.garbanzo",
];

function originFromResource(resourceUrl: string): string {
  return resourceUrl.replace(/\/ticks\/?$/, "") || "https://ticks.bnm.farm";
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function inferCadence(source: string, market: string): string | null {
  const blob = `${source} ${market}`;
  if (/weekly/i.test(blob)) return "weekly";
  if (/wednesday/i.test(blob)) return "wednesday auction";
  if (/rental pool procedures/i.test(blob)) return "posted procedures";
  return null;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function latestDate(values: string[]): string | null {
  const dates = values.filter((v) => /^\d{4}-\d{2}-\d{2}/.test(v)).sort();
  return dates.at(-1) ?? null;
}

function sampleFromRow(row: Record<string, unknown>, seriesLabel: string): Record<string, unknown> {
  return {
    sample: true,
    id: str(row.id),
    name: seriesLabel || str(row.label) || str(row.commodity),
    group: str(row.group),
    commodity: str(row.commodity) || null,
    market: str(row.market) || null,
    unit: str(row.unit) || null,
    asOf: str(row.asOf) || null,
    price: num(row.price),
    source: str(row.source) || null,
  };
}

export function buildTicksManifest(resourceUrl = "https://ticks.bnm.farm/ticks"): Record<string, unknown> {
  const payload = loadTicks();
  const origin = originFromResource(resourceUrl);
  const ticks = payload.ticks as Record<string, unknown>[];
  const failed = payload.failed as Record<string, unknown>[];
  const series = payload.history.series as Record<string, unknown>[];
  const points = payload.history.points as Record<string, unknown>[];
  const seriesById = new Map(series.map((s) => [str(s.id), s]));

  const pointsBySeries = new Map<string, { count: number; first: string | null; last: string | null }>();
  for (const point of points) {
    const id = str(point.series || point.id);
    if (!id) continue;
    const day = str(point.reportDate || point.asOf).slice(0, 10);
    const prev = pointsBySeries.get(id) || { count: 0, first: null, last: null };
    prev.count += 1;
    if (day) {
      if (!prev.first || day < prev.first) prev.first = day;
      if (!prev.last || day > prev.last) prev.last = day;
    }
    pointsBySeries.set(id, prev);
  }

  const asOfBySource: Record<string, string> = {};
  for (const row of ticks) {
    const source = str(row.source);
    const asOf = str(row.asOf).slice(0, 10);
    if (!source || !asOf) continue;
    if (!asOfBySource[source] || asOf > asOfBySource[source]) asOfBySource[source] = asOf;
  }

  const groups = GROUP_LABELS.map((group) => {
    const rows = ticks.filter((row) => str(row.group) === group.id);
    const bySource = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
      const key = str(row.source) || "unknown";
      const list = bySource.get(key) || [];
      list.push(row);
      bySource.set(key, list);
    }
    const sources = [...bySource.entries()].map(([name, sourceRows]) => {
      const ids = sourceRows.map((row) => str(row.id));
      const hist = ids.map((id) => pointsBySeries.get(id)).filter(Boolean);
      return {
        name,
        sourceUrl: str(sourceRows[0]?.sourceUrl) || null,
        cadence: inferCadence(name, str(sourceRows[0]?.market)),
        tickCount: sourceRows.length,
        latestAsOf: latestDate(sourceRows.map((row) => str(row.asOf).slice(0, 10))),
        geography: uniqueSorted(sourceRows.map((row) => str(row.market))),
        units: uniqueSorted(sourceRows.map((row) => str(row.unit))),
        history: {
          seriesWithPoints: hist.length,
          pointCount: hist.reduce((n, h) => n + (h?.count ?? 0), 0),
        },
        series: sourceRows.map((row) => ({
          id: str(row.id),
          name: str(seriesById.get(str(row.id))?.label) || str(row.label) || str(row.commodity),
        })),
      };
    });
    return {
      id: group.id,
      name: group.name,
      tickCount: rows.length,
      units: uniqueSorted(rows.map((row) => str(row.unit))),
      geography: uniqueSorted(rows.map((row) => str(row.market))),
      latestAsOf: latestDate(rows.map((row) => str(row.asOf).slice(0, 10))),
      history: {
        available: rows.some((row) => (pointsBySeries.get(str(row.id))?.count ?? 0) > 0),
        pointCount: rows.reduce((n, row) => n + (pointsBySeries.get(str(row.id))?.count ?? 0), 0),
      },
      sources,
    };
  }).filter((group) => group.tickCount > 0 || group.sources.length > 0);

  const samples: Record<string, unknown>[] = [];
  const used = new Set<string>();
  for (const id of SAMPLE_SERIES_IDS) {
    const row = ticks.find((t) => str(t.id) === id);
    if (!row) continue;
    samples.push(sampleFromRow(row, str(seriesById.get(id)?.label)));
    used.add(id);
  }
  for (const group of GROUP_LABELS) {
    if (samples.length >= 5) break;
    const row = ticks.find((t) => str(t.group) === group.id && !used.has(str(t.id)));
    if (!row) continue;
    samples.push(sampleFromRow(row, str(seriesById.get(str(row.id))?.label)));
    used.add(str(row.id));
  }

  const empty = failed
    .map((item) => publicEmptyReport(item))
    .filter((row): row is { id: string; status: "empty" } => row !== null);

  const amount = amountAtomicFor("ticks");
  return {
    ok: true,
    product: {
      id: PRODUCT_ID,
      name: PRODUCT_NAME,
      version: PRODUCT_VERSION,
    },
    paidEndpoint: `${origin}${TICKS_PATH}`,
    discoveryUrl: `${origin}/`,
    manifestUrl: `${origin}${MANIFEST_PATH}`,
    openapi: `${origin}${OPENAPI_PATH}`,
    wellKnown: `${origin}${WELL_KNOWN_PATH}`,
    llmsTxt: `${origin}${LLMS_PATH}`,
    priceAtomic: amount,
    priceDisplay: usdcDisplayFromAtomic(amount),
    network: NETWORK_V2,
    networkName: "Base",
    asset: USDC_BASE,
    assetSymbol: "USDC",
    payTo: PAY_TO,
    fetchedAt: payload.fetchedAt,
    latestAsOfBySource: asOfBySource,
    tickCount: ticks.length,
    status: payload.status,
    schema: {
      tickFields: {
        id: "string — deterministic series id",
        group: "hay | cattle | produce | grain | water | pulses | wool",
        commodity: "string",
        label: "string",
        market: "string — geography / barn / shipping point",
        classGrade: "string",
        unit: "$/ton | $/cwt | $/pair | $/50 lb | $/25 lb | $/bu | $/AF | $/lb",
        price: "number | null — official print only",
        lo: "number | optional",
        hi: "number | optional",
        mid: "number | optional",
        asOf: "YYYY-MM-DD",
        source: "string",
        sourceUrl: "string — official PDF or page",
        note: "string | optional",
      },
      paidResponse: {
        ticks: "current official snapshot (all public series on this collect)",
        failed: "current failed official fetches",
        history: {
          series: "id / label / unit / group catalog",
          points: "dated official prints already stored — days between reports are not filled in",
          emptyReports: "id + status only when an official print has no row",
        },
        fetchedAt: "ISO timestamp of the last official collect",
        asOf: "YYYY-MM-DD — newest plausible tick date in this cache",
        records: "id / date / firm / url / type — same snapshot, for agent diffs. Does not replace ticks[]",
      },
    },
    groups,
    empty,
    samples,
    note: "Catalog + schema + sample rows only. One $0.05 GET returns the entire current table. Samples are marked sample:true.",
    sampleNote:
      "samples are marked sample:true and are a few real official rows for identification. The paid GET /ticks body has the full current snapshot. This manifest does not list every current price.",
  };
}

export function paymentRequiredBody(
  resourceUrl: string,
  sku: DoorSku = "ticks",
  query?: Pick<ExtractedPageQuery, "id">,
): Record<string, unknown> {
  const amount = amountAtomicFor(sku, query);
  const copy = SKU_COPY[sku];
  const buyer = skuBuyerDescription(sku);
  const acceptV1: Record<string, unknown> = {
    scheme: "exact",
    network: NETWORK_V1,
    asset: USDC_BASE,
    payTo: PAY_TO,
    resource: resourceUrl,
    description: buyer,
    mimeType: "application/json",
    maxTimeoutSeconds: 60,
    extra: { name: "USD Coin", version: "2" },
    maxAmountRequired: amount,
  };

  return {
    x402Version: 1,
    error: "X-PAYMENT header is required",
    accepts: [acceptV1],
    payTo: PAY_TO,
    network: NETWORK_V1,
    asset: USDC_BASE,
    resource: copy.resourcePath,
    // Body-only crawlers miss PAYMENT-REQUIRED; bazaar stays on the v2 header too.
    extensions: { bazaar: bazaarExtension(sku) },
  };
}

export function paymentRequiredV2(
  resourceUrl: string,
  sku: DoorSku = "ticks",
  query?: Pick<ExtractedPageQuery, "id">,
): Record<string, unknown> {
  const amount = amountAtomicFor(sku, query);
  const copy = SKU_COPY[sku];
  const buyer = skuBuyerDescription(sku);
  const accept: Record<string, unknown> = {
    scheme: "exact",
    network: NETWORK_V2,
    asset: USDC_BASE,
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    extra: { name: "USD Coin", version: "2" },
    amount,
    description: buyer,
  };
  return {
    x402Version: 2,
    error: "PAYMENT-SIGNATURE header is required",
    resource: {
      url: resourceUrl,
      description: buyer,
      mimeType: "application/json",
    },
    accepts: [accept],
    extensions: {
      bazaar: bazaarExtension(sku),
    },
  };
}

function paymentHeader(req: IncomingMessage): string | null {
  const raw =
    req.headers["x-payment"] ??
    req.headers["payment-signature"] ??
    req.headers["PAYMENT-SIGNATURE"];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return null;
}

function skipSettle(): boolean {
  return env("X402_SKIP_SETTLE") === "1";
}

function decodePayment(payment: string): Record<string, unknown> | null {
  const tryParse = (raw: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };
  return tryParse(payment) ?? tryParse(Buffer.from(payment, "base64").toString("utf8"));
}

function paymentPayload(payment: string): Record<string, unknown> | null {
  const decoded = decodePayment(payment);
  if (!decoded) return null;
  if (decoded.payload && typeof decoded.payload === "object") return decoded;
  if (decoded.authorization && decoded.signature) {
    return { x402Version: 1, scheme: "exact", network: NETWORK_V1, payload: decoded };
  }
  return decoded;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function innerPaymentPayload(raw: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!raw) return null;
  if (isPlainObject(raw.payload)) return raw.payload;
  if (typeof raw.signature === "string" && isPlainObject(raw.authorization)) {
    return { signature: raw.signature, authorization: raw.authorization };
  }
  if (typeof raw.transaction === "string") return { transaction: raw.transaction };
  return null;
}

function caip2Network(network: unknown): string {
  if (typeof network === "string" && network.startsWith("eip155:")) return network;
  if (network === "base-sepolia") return "eip155:84532";
  return NETWORK_V2;
}

function resourceUrlOf(value: unknown): string | undefined {
  if (typeof value === "string" && value) return value;
  if (isPlainObject(value) && typeof value.url === "string" && value.url) return value.url;
  return undefined;
}

function resourceInfo(
  raw: Record<string, unknown> | null,
  requirements: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const fromPayload = raw?.resource;
  const url =
    resourceUrlOf(fromPayload) ??
    resourceUrlOf(requirements.resource);
  if (!url) return undefined;
  const fromObj = isPlainObject(fromPayload) ? fromPayload : {};
  const description =
    (typeof fromObj.description === "string" && fromObj.description) ||
    (typeof requirements.description === "string" && requirements.description) ||
    undefined;
  const mimeType =
    (typeof fromObj.mimeType === "string" && fromObj.mimeType) ||
    (typeof requirements.mimeType === "string" && requirements.mimeType) ||
    "application/json";
  const info: Record<string, unknown> = { url, mimeType };
  if (description) info.description = description.length <= 500 ? description : description.slice(0, 500);
  return info;
}

function v2PaymentRequirements(requirements: Record<string, unknown>): Record<string, unknown> {
  const amount = String(requirements.amount ?? requirements.maxAmountRequired ?? "");
  const out: Record<string, unknown> = {
    scheme: requirements.scheme ?? "exact",
    network: caip2Network(requirements.network),
    asset: requirements.asset,
    amount,
    payTo: requirements.payTo,
    maxTimeoutSeconds: typeof requirements.maxTimeoutSeconds === "number"
      ? requirements.maxTimeoutSeconds
      : 60,
  };
  if (isPlainObject(requirements.extra)) out.extra = requirements.extra;
  return out;
}

function payloadExtensions(
  raw: Record<string, unknown> | null,
  requirements: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (isPlainObject(raw?.extensions)) return raw.extensions;
  if (isPlainObject(requirements.extensions)) return requirements.extensions;
  return undefined;
}

/**
 * Door-side accept + persist hints. `extensions.bazaar` is copied onto
 * paymentPayload (v2) by facilitatorBody; it is not sent on paymentRequirements.
 */
export function facilitatorPaymentRequirements(
  resourceUrl: string,
  sku: DoorSku,
  query?: Pick<ExtractedPageQuery, "id">,
): Record<string, unknown> {
  const accept = {
    ...((paymentRequiredBody(resourceUrl, sku, query).accepts as Record<string, unknown>[])[0]),
  };
  if (isPublicBazaarSku(sku)) {
    accept.extensions = { bazaar: bazaarExtension(sku) };
  }
  return accept;
}

/**
 * CDP POST /v2/x402/verify and /settle body (current facilitator OpenAPI).
 *
 * Live 400 cause: the old persist hybrid sent paymentHeader, a string
 * paymentPayload.resource, extensions.bazaar on paymentRequirements, and
 * v1 requirements (network "base", maxAmountRequired) next to a v2 payload.
 * CDP v2 oneOf accepts either a clean v1 pair or a clean v2 pair — not a mix.
 *
 * A later /ticks CDP settle should POST only:
 *   { x402Version: 2, paymentPayload, paymentRequirements }
 * where paymentPayload.resource is {url, description, mimeType},
 * paymentPayload.extensions.bazaar is the 402 bazaar block (public SKUs),
 * paymentPayload.accepted matches paymentRequirements, and
 * paymentRequirements is v2 (eip155:8453, amount, no resource / extensions).
 */
export function facilitatorBody(
  payment: string,
  requirements: Record<string, unknown>,
): Record<string, unknown> {
  const raw = paymentPayload(payment);
  const inner = innerPaymentPayload(raw);
  const accepted = isPlainObject(raw?.accepted) ? raw.accepted : v2PaymentRequirements(requirements);
  const reqs = v2PaymentRequirements(requirements);
  const payload: Record<string, unknown> = {
    x402Version: 2,
    accepted,
  };
  if (inner) payload.payload = inner;
  const resource = resourceInfo(raw, requirements);
  if (resource) payload.resource = resource;
  const extensions = payloadExtensions(raw, requirements);
  if (extensions) payload.extensions = extensions;
  return {
    x402Version: 2,
    paymentPayload: payload,
    paymentRequirements: reqs,
  };
}

/** Schema problems that make CDP v2 /verify return HTTP 400 (not 401). */
export function cdpFacilitatorBodyProblems(body: unknown): string[] {
  const problems: string[] = [];
  if (!isPlainObject(body)) return ["body is not an object"];
  if (body.paymentHeader != null) problems.push("paymentHeader is not a CDP verify/settle field");
  const extraKeys = Object.keys(body).filter(
    (k) => k !== "x402Version" && k !== "paymentPayload" && k !== "paymentRequirements",
  );
  if (extraKeys.length) problems.push(`unexpected top-level keys: ${extraKeys.join(",")}`);
  if (body.x402Version !== 1 && body.x402Version !== 2) {
    problems.push("x402Version must be 1 or 2");
  }
  if (!isPlainObject(body.paymentPayload)) problems.push("paymentPayload must be an object");
  if (!isPlainObject(body.paymentRequirements)) problems.push("paymentRequirements must be an object");
  if (!isPlainObject(body.paymentPayload) || !isPlainObject(body.paymentRequirements)) return problems;

  const payload = body.paymentPayload;
  const reqs = body.paymentRequirements;
  const version = body.x402Version === 2 || payload.x402Version === 2 || isPlainObject(payload.accepted)
    ? 2
    : 1;

  if (version === 2) {
    if (body.x402Version !== 2) problems.push("v2 body needs top-level x402Version 2");
    if (payload.x402Version !== 2) problems.push("v2 paymentPayload.x402Version must be 2");
    if (payload.scheme != null || payload.network != null) {
      problems.push("v2 paymentPayload must not have top-level scheme/network (they live on accepted)");
    }
    if (!isPlainObject(payload.accepted)) problems.push("v2 paymentPayload.accepted is required");
    if (!isPlainObject(payload.payload)) problems.push("v2 paymentPayload.payload is required");
    if (payload.resource != null && !isPlainObject(payload.resource)) {
      problems.push("v2 paymentPayload.resource must be {url, description?, mimeType?} not a string");
    }
    if (isPlainObject(payload.resource) && typeof payload.resource.url !== "string") {
      problems.push("v2 paymentPayload.resource.url is required");
    }
    if (
      isPlainObject(payload.resource) &&
      typeof payload.resource.description === "string" &&
      payload.resource.description.length > 500
    ) {
      problems.push("v2 paymentPayload.resource.description exceeds CDP 500-char limit");
    }
    for (const [label, obj] of [
      ["paymentPayload.accepted", payload.accepted],
      ["paymentRequirements", reqs],
    ] as const) {
      if (!isPlainObject(obj)) continue;
      for (const key of ["scheme", "network", "asset", "amount", "payTo", "maxTimeoutSeconds"] as const) {
        if (obj[key] == null) problems.push(`v2 ${label}.${key} is required`);
      }
      if (typeof obj.network === "string" && !obj.network.startsWith("eip155:") && !obj.network.startsWith("solana:")) {
        problems.push(`v2 ${label}.network must be CAIP-2 (eip155:8453), not "${obj.network}"`);
      }
      if (obj.maxAmountRequired != null) problems.push(`v2 ${label} uses amount, not maxAmountRequired`);
      if (obj.resource != null) problems.push(`v2 ${label} must not carry resource (that is paymentPayload.resource)`);
      if (obj.extensions != null) problems.push(`v2 ${label} must not carry extensions (that is paymentPayload.extensions)`);
      if (obj.description != null || obj.mimeType != null) {
        problems.push(`v2 ${label} must not carry resource metadata`);
      }
    }
    return problems;
  }

  if (payload.resource != null) problems.push("v1 paymentPayload must not include resource");
  if (payload.extensions != null) problems.push("v1 paymentPayload must not include extensions");
  if (payload.accepted != null) problems.push("v1 paymentPayload must not include accepted");
  for (const key of ["scheme", "network", "payload"] as const) {
    if (payload[key] == null) problems.push(`v1 paymentPayload.${key} is required`);
  }
  for (const key of ["scheme", "network", "maxAmountRequired", "resource", "description", "mimeType", "payTo", "asset", "maxTimeoutSeconds"] as const) {
    if (reqs[key] == null) problems.push(`v1 paymentRequirements.${key} is required`);
  }
  if (reqs.resource != null && typeof reqs.resource !== "string") {
    problems.push("v1 paymentRequirements.resource must be a URL string");
  }
  if (reqs.extensions != null) problems.push("v1 paymentRequirements must not include extensions");
  if (Object.prototype.hasOwnProperty.call(reqs, "outputSchema") && reqs.outputSchema == null) {
    problems.push("outputSchema: null 400s CDP v1 verify");
  }
  return problems;
}

export function cdpEnvStatus(): "set" | "CDP env not set" {
  return env("CDP_API_KEY_ID") && env("CDP_API_KEY_SECRET") ? "set" : "CDP env not set";
}

function cdpApiKeySecret(): string {
  return env("CDP_API_KEY_SECRET").replace(/\\n/g, "\n");
}

async function cdpAuthHeaders(method: "GET" | "POST", url: string): Promise<Record<string, string>> {
  if (cdpEnvStatus() !== "set") return {};
  try {
    const parsed = new URL(url);
    const jwt = await generateJwt({
      apiKeyId: env("CDP_API_KEY_ID"),
      apiKeySecret: cdpApiKeySecret(),
      requestMethod: method,
      requestHost: parsed.host,
      requestPath: parsed.pathname,
    });
    return { Authorization: `Bearer ${jwt}` };
  } catch {
    return {};
  }
}

async function facilitatorPost(
  path: "/verify" | "/settle",
  payment: string,
  requirements: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const base = env("X402_FACILITATOR_URL");
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}${path}`;
  const auth = await cdpAuthHeaders("POST", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...auth,
      },
      body: JSON.stringify(facilitatorBody(payment, requirements)),
    });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
    } catch {
      body = { rawStatus: res.status };
    }
    const extHdr = res.headers.get("extension-responses") ?? res.headers.get("EXTENSION-RESPONSES");
    if (extHdr) {
      try {
        const decoded = JSON.parse(Buffer.from(extHdr, "base64").toString("utf8")) as {
          bazaar?: { status?: string };
        };
        if (decoded.bazaar?.status) {
          console.error(`facilitator ${path} bazaar ${decoded.bazaar.status}`);
        }
      } catch {
        // header is diagnostic only
      }
    }
    if (!res.ok) {
      console.error(`facilitator ${path} HTTP ${res.status}`);
      return null;
    }
    return body;
  } catch (err) {
    console.error(`facilitator ${path} error ${err instanceof Error ? err.name : "unknown"}`);
    return null;
  }
}

async function facilitatorVerify(payment: string, requirements: Record<string, unknown>): Promise<boolean> {
  const body = await facilitatorPost("/verify", payment, requirements);
  if (!body) return false;
  return body.isValid === true || body.success === true;
}

async function facilitatorSettle(payment: string, requirements: Record<string, unknown>): Promise<boolean> {
  const body = await facilitatorPost("/settle", payment, requirements);
  if (!body) return false;
  return body.success === true || body.isValid === true || typeof body.transaction === "string";
}

function localSettleKeyFile(): string {
  const explicit = env("X402_SETTLE_KEY_FILE");
  return explicit ? resolve(explicit) : "";
}

async function localEip3009Settle(payment: string, requirements: Record<string, unknown>): Promise<boolean> {
  const keyFile = localSettleKeyFile();
  if (!keyFile || !existsSync(keyFile)) return false;
  const wrapper = paymentPayload(payment);
  const inner = (wrapper?.payload && typeof wrapper.payload === "object"
    ? (wrapper.payload as Record<string, unknown>)
    : wrapper) ?? {};
  const auth = (inner.authorization && typeof inner.authorization === "object"
    ? (inner.authorization as Record<string, unknown>)
    : null);
  const signature = typeof inner.signature === "string" ? inner.signature : "";
  if (!auth || !signature) return false;
  const wantAmount = String(requirements.maxAmountRequired ?? requirements.amount ?? "");
  const to = String(auth.to ?? "").toLowerCase();
  const value = String(auth.value ?? "");
  if (to !== PAY_TO.toLowerCase()) return false;
  if (wantAmount && value !== wantAmount) return false;
  const helper = resolve(new URL("./../scripts/local-eip3009-settle.py", import.meta.url).pathname);
  if (!existsSync(helper)) return false;
  const { spawn } = await import("node:child_process");
  return await new Promise((resolveOk) => {
    const child = spawn("python3", [helper], {
      env: { ...process.env, X402_SETTLE_KEY_FILE: keyFile },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += String(chunk);
    });
    child.stderr.on("data", () => {
      /* never forward; may be noisy, must not leak key */
    });
    child.on("close", (code) => {
      if (code !== 0) {
        resolveOk(false);
        return;
      }
      try {
        const parsed = JSON.parse(out) as { ok?: boolean; tx?: string };
        if (parsed.ok && parsed.tx) console.error(`local eip3009 settle ${parsed.tx}`);
        resolveOk(parsed.ok === true);
      } catch {
        resolveOk(false);
      }
    });
    child.on("error", () => resolveOk(false));
    child.stdin.write(
      JSON.stringify({
        asset: USDC_BASE,
        authorization: auth,
        signature,
        requirements: { payTo: requirements.payTo, asset: requirements.asset },
      }),
    );
    child.stdin.end();
  });
}


function sendJson(res: ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE, PAYMENT-RESPONSE",
    ...extraHeaders,
  });
  res.end(payload);
}

function sendText(res: ServerResponse, status: number, body: string, contentType: string): void {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function shopDiscoveryPointers(req: IncomingMessage, port: number): Record<string, string> {
  const origin = discoveryOrigin(req, port);
  return {
    openapi: `${origin}${OPENAPI_PATH}`,
    wellKnown: `${origin}${WELL_KNOWN_PATH}`,
    llmsTxt: `${origin}${LLMS_PATH}`,
    mcp: `${origin}${MCP_PATH}`,
  };
}

function withShopDiscovery(
  body: Record<string, unknown>,
  req: IncomingMessage,
  port: number,
): Record<string, unknown> {
  return { ...body, ...shopDiscoveryPointers(req, port) };
}

function sendExtractedManifest(
  res: ServerResponse,
  body: Record<string, unknown>,
  req: IncomingMessage,
  port: number,
  q: string | null,
): void {
  sendJson(res, 200, withShopDiscovery(applyFreeIndex(body, q), req, port));
}

export async function llmsTxt(): Promise<string> {
  const listed483 = form483IsPublic();
  const listedGmp = gmpIsPublic();
  const listedGmpMd = gmpMdIsPublic();
  const bags = await loadSkuBags();
  const paid = publicBazaarSkus().map((sku) => {
    const bag = bags.get(sku) ?? bagFromManifest(sku, {});
    const price = isTableSku(sku)
      ? (usdcDisplayFromAtomic(amountAtomicFor(sku)) ?? "$0.05")
      : "$0.02 / $0.05";
    return `- GET ${SKU_COPY[sku].resourcePath} — ${price} — ${skuBuyerDescription(sku, bag)}`;
  });
  const free = [
    `- GET /openapi.json — OpenAPI 3.1 with x-payment-info for the ${paidCountWord()} paid doors`,
    `- GET /.well-known/x402 — absolute URLs of the ${paidCountWord()} paid routes only`,
    `- GET / — shop JSON (payTo + the ${paidCountWord()} products)`,
    `- GET/POST /mcp — Streamable HTTP MCP for the same ${paidCountWord()} paid GETs.`,
    "- GET /manifest.json — US hay, cattle, and grain ticks count + schema",
    "- GET /import-alerts/manifest.json — FDA count + schema (not the firm dump)",
    "- GET /mariners/manifest.json — D13 LNM count + official PDF (not the notice body)",
    "- GET /mariners-d11/manifest.json — D11 LNM count + official PDF (not the notice body)",
    "- GET /mariners-d7/manifest.json — D7 LNM count + official PDF (not the notice body)",
    "- GET /mariners-d8/manifest.json — D8 LNM count + official PDF (not the notice body)",
    "- GET /warning-letters/manifest.json — FDA letter count + firm/date/subject (not the letter body)",
    "- GET /untitled-letters/manifest.json — FDA untitled count + id/firm/date/product (not the letter text)",
    "- GET /awa/manifest.json — APHIS AWA count + id/firm/date/sourceUrl (not the observation text)",
    "- GET /swisspar/manifest.json — SwissPAR count + name/date/MA/sourceUrl (not the evaluation text)",
    "- GET /pcac/manifest.json — FDA PCAC count + substance/date/meeting/mediaId/sourceUrl (not the evaluation text)",
    "- GET /ftc-wl/manifest.json — FTC BCP count + firm/date/subject/sourceUrl (not the letter body)",
    "- GET /cfpb-orders/manifest.json — CFPB order count + firm/date/title/fileNo/sourceUrl (not the order body)",
    "- GET /occ-cd/manifest.json — OCC C&D count + bank/docket/date/sourceUrl (not the order body)",
    "- GET /fdic-orders/manifest.json — FDIC order count + bank/docket/date/sourceUrl (not the order body)",
    "- GET /frb-orders/manifest.json — FRB order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /ncua-orders/manifest.json — NCUA order count + credit union/docket/date/sourceUrl (not the order body)",
    "- GET /fincen-orders/manifest.json — FinCEN order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /ferc-orders/manifest.json — FERC order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /ofac-orders/manifest.json — OFAC order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /bis-orders/manifest.json — BIS order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /cftc-orders/manifest.json — CFTC order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /fifra-orders/manifest.json — EPA FIFRA order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /denovo-orders/manifest.json — FDA De Novo order count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /ttb-oic/manifest.json — TTB OIC count + institution/docket/date/sourceUrl (not the order body)",
    "- GET /air-letters/manifest.json — APHIS AIR letter count + institution/docket/date/sourceUrl (not the letter body)",
    "- GET /superfund-rods/manifest.json — EPA Superfund ROD count + institution/docket/date/sourceUrl (not the ROD body)",
    "- GET /ico-mpn/manifest.json — ICO MPN count + institution/docket/date/sourceUrl (not the MPN body)",
    "- GET /cma-ca98/manifest.json — CMA CA98 count + institution/docket/date/sourceUrl (not the decision body)",
  ];
  if (listed483) {
    free.push("- GET /form-483/manifest.json — FDA 483 count + id/date/firm (not the observation body)");
  }
  if (listedGmp) {
    free.push("- GET /gmp/manifest.json — Health Canada GMP count + id/firm/date/rating (not the observation text)");
  }
  if (listedGmpMd) {
    free.push("- GET /gmp-md/manifest.json — Health Canada MD count + id/firm/date/rating (not the report-card body text)");
  }
  return [
    "# BNM Data Shop",
    "",
    `Official public data as JSON at https://ticks.bnm.farm. ${paidCountWord().replace(/^./, (c) => c.toUpperCase())} paid GETs. USDC on Base (eip155:8453). payTo 0xf59621FC406D266e18f314Ae18eF0a33b8401004.`,
    "",
    "## Paid",
    "",
    ...paid,
    "",
    "Unpaid GET returns HTTP 402 with PAYMENT-REQUIRED and extensions.bazaar. After a valid X-PAYMENT, the same URL returns JSON. Table doors (/ticks, /import-alerts): one $0.05 GET is the entire current table. Extracted-body doors: find a record on the free index (?q=); each row names the id to buy. GET ?id= is one official text for $0.02. Default GET is the newest 10 official texts for $0.05. If the catalog has fewer than 10, that $0.05 GET is the whole current set. Older pages are another $0.05 on the same URL. No API key. No request body.",
    "",
    "## Free discovery",
    "",
    ...free,
    "",
    `${noNextSkuWord()} Free manifests are not the paid body. Extracted-body indexes accept ?q=; each hit names the id to buy.`,
    "",
    "## MCP",
    "",
    `- URL — https://ticks.bnm.farm${MCP_PATH}`,
    "- Connect — `npx -y mcp-remote https://ticks.bnm.farm/mcp`",
    `- Free search tool \`search\` — GET {manifest}?q= on an extracted-body door. Each hit names the id to buy. Then pay GET ?id= ($0.02) or the default/newest-10 bag ($0.05; whole current set if n<10). Table doors have no page: one paid GET is the entire current table. Tools are generated at request time from /.well-known/x402; later SKUs appear without an MCP rewrite. Same ${paidCountWord()} paid URLs today. Unpaid tool calls still HTTP 402. Not Bazaar-indexed.`,
    "",
    "## Agent catalogs",
    "",
    `- x402scan — ${X402SCAN_SERVER_URL}`,
    "- Chainlink for Agents / CDP Bazaar — not listed until a CDP facilitator settle catalogs the route. Validate already accepts the listed paid URLs.",
    "",
  ].join("\n");
}

function resourceUrl(req: IncomingMessage, resPort: number, path: string): string {
  const configured = env("X402_RESOURCE_URL");
  if (configured) return configured.replace(/\/$/, "") + path;
  const host = req.headers.host || `127.0.0.1:${resPort}`;
  return `http://${host}${path}`;
}

function discoveryOrigin(req: IncomingMessage, port: number): string {
  return resourceUrl(req, port, "").replace(/\/$/, "") || "https://ticks.bnm.farm";
}

function paidDiscoveryPaths(): string[] {
  const paths = [TICKS_PATH, IMPORT_ALERTS_PATH, MARINERS_PATH, MARINERS_D11_PATH, MARINERS_D7_PATH, MARINERS_D8_PATH, WARNING_LETTERS_PATH, UNTITLED_LETTERS_PATH, AWA_PATH, SWISSPAR_PATH, PCAC_PATH, FTC_WL_PATH, CFPB_ORDERS_PATH, OCC_CD_PATH, FDIC_ORDERS_PATH, FRB_ORDERS_PATH, NCUA_ORDERS_PATH, FINCEN_ORDERS_PATH, FERC_ORDERS_PATH, OFAC_ORDERS_PATH, BIS_ORDERS_PATH, CFTC_ORDERS_PATH, FIFRA_ORDERS_PATH, DENOVO_ORDERS_PATH, TTB_OIC_PATH, AIR_LETTERS_PATH, SUPERFUND_RODS_PATH, ICO_MPN_PATH, CMA_CA98_PATH];
  if (form483IsPublic()) paths.push(FORM_483_PATH);
  if (gmpIsPublic()) paths.push(GMP_PATH);
  if (gmpMdIsPublic()) paths.push(GMP_MD_PATH);
  return paths;
}

function paidDiscoveryUrls(req: IncomingMessage, port: number): string[] {
  return paidDiscoveryPaths().map((path) => resourceUrl(req, port, path));
}

export async function wellKnownX402(req: IncomingMessage, port: number): Promise<Record<string, unknown>> {
  await loadSkuBags();
  return {
    version: 1,
    resources: paidDiscoveryUrls(req, port),
    ownershipProofs: [PAY_TO],
    ...shopDiscoveryPointers(req, port),
    instructions:
      `GET each resource unpaid for HTTP 402 with extensions.bazaar. Table doors (/ticks, /import-alerts): one $0.05 GET is the entire current table. Extracted-body doors: find a record on the free index (?q=); each row names the id to buy. GET ?id= is one official text for $0.02. Default GET is the newest 10 official texts for $0.05. If the catalog has fewer than 10, that $0.05 GET is the whole current set. Older pages are another $0.05 on the same URL. Pay USDC on Base. Free OpenAPI is at /openapi.json. MCP is at /mcp (free search tool plus the ${paidCountWord()} paid GETs). Only these ${paidCountWord()} paid routes exist. x402scan: ${X402SCAN_SERVER_URL}`,
  };
}

function paidOpenApiOp(opts: {
  sku: DoorSku;
  operationId: string;
  summary?: string;
  description?: string;
  priceUsdc: string;
  amountAtomic: string;
  example: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  bag?: SkuBag;
}): Record<string, unknown> {
  const bag = opts.bag ?? peekSkuBag(opts.sku) ?? bagFromManifest(opts.sku, {});
  return {
    operationId: opts.operationId,
    summary: opts.summary ?? skuOpenApiSummary(opts.sku, bag),
    description: opts.description ?? skuOpenApiDescription(opts.sku, bag),
    tags: ["paid"],
    security: [{ x402: [] }],
    parameters: isTableSku(opts.sku)
      ? []
      : [
          {
            name: "id",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "One official text for $0.02 on this same URL. Find the id on the free index (?q=).",
          },
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page of official texts. Default 1 is the newest 10 official texts for $0.05. If the catalog has fewer than 10, that $0.05 GET is the whole current set. Each page is another $0.05 on this same URL.",
          },
          {
            name: "before",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Cursor (item id) for the next older $0.05 page. Same URL, another $0.05.",
          },
        ],
    "x-auth": { mode: "x402" },
    "x-payment-info": {
      protocols: [
        {
          x402: {
            scheme: "exact",
            network: NETWORK_V2,
            asset: USDC_BASE,
            payTo: PAY_TO,
            amount: opts.amountAtomic,
          },
        },
      ],
      price: { mode: "fixed", currency: "USD", amount: opts.priceUsdc },
      ...(isTableSku(opts.sku)
        ? {}
        : {
            idPrice: { mode: "fixed", currency: "USD", amount: usdcPriceString(EXTRACTED_ID_AMOUNT_ATOMIC) },
            idAmountAtomic: EXTRACTED_ID_AMOUNT_ATOMIC,
          }),
      network: NETWORK_V2,
      asset: USDC_BASE,
      payTo: PAY_TO,
    },
    responses: {
      "200": {
        description: "Paid JSON body after a valid x402 settlement",
        content: {
          "application/json": {
            schema: opts.outputSchema,
            example: opts.example,
          },
        },
      },
      "402": {
        description: isTableSku(opts.sku)
          ? `Payment Required — entire current table on one GET (${bag.countLabel}). x402 challenge in PAYMENT-REQUIRED and JSON body`
          : `Payment Required — two bags on this URL. GET ?id= is one official text for $0.02. Default GET is the newest 10 official texts for $0.05 (whole current set if n<10). Find the id on the free index (?q=). Older pages are another $0.05 on this same URL (page/before). Catalog: ${bag.countLabel}. x402 challenge in PAYMENT-REQUIRED and JSON body`,
      },
    },
  };
}

function freeOpenApiOp(summary: string, description: string, extractedIndex = false): Record<string, unknown> {
  return {
    summary,
    description: extractedIndex
      ? `${description} Find a record with ?q=. Each row names the id to buy. GET ?id= is $0.02; default GET is the newest 10 for $0.05 (whole current set if n<10). Does not return official bodies.`
      : description,
    tags: ["free"],
    security: [],
    "x-auth": { mode: "none" },
    ...(extractedIndex
      ? {
          parameters: [
            {
              name: "q",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Free index search. Hits name the id to buy (?id= = $0.02). Does not return official bodies.",
            },
          ],
        }
      : {}),
    responses: {
      "200": {
        description: extractedIndex
          ? "Free JSON index. ?q= filters rows. Each row names the id to buy (?id= = $0.02; newest 10 = $0.05, or the whole current set if n<10)."
          : "Free JSON catalog / discovery document",
        content: { "application/json": { schema: { type: "object" } } },
      },
    },
  };
}

export async function buildOpenApi(req: IncomingMessage, port: number): Promise<Record<string, unknown>> {
  const origin = discoveryOrigin(req, port);
  const ticksAtomic = amountAtomicFor("ticks");
  const iaAtomic = amountAtomicFor("import-alerts");
  const lnmAtomic = amountAtomicFor("mariners");
  const lnmD11Atomic = amountAtomicFor("mariners-d11");
  const lnmD7Atomic = amountAtomicFor("mariners-d7");
  const lnmD8Atomic = amountAtomicFor("mariners-d8");
  const wlAtomic = amountAtomicFor("warning-letters");
  const ulAtomic = amountAtomicFor("untitled-letters");
  const awaAtomic = amountAtomicFor("awa");
  const swissparAtomic = amountAtomicFor("swisspar");
  const pcacAtomic = amountAtomicFor("pcac");
  const ftcWlAtomic = amountAtomicFor("ftc-wl");
  const cfpbOrdersAtomic = amountAtomicFor("cfpb-orders");
  const occCdAtomic = amountAtomicFor("occ-cd");
  const fdicOrdersAtomic = amountAtomicFor("fdic-orders");
  const frbOrdersAtomic = amountAtomicFor("frb-orders");
  const ncuaOrdersAtomic = amountAtomicFor("ncua-orders");
  const fincenOrdersAtomic = amountAtomicFor("fincen-orders");
  const fercOrdersAtomic = amountAtomicFor("ferc-orders");
  const ofacOrdersAtomic = amountAtomicFor("ofac-orders");
  const bisOrdersAtomic = amountAtomicFor("bis-orders");
  const cftcOrdersAtomic = amountAtomicFor("cftc-orders");
  const fifraOrdersAtomic = amountAtomicFor("fifra-orders");
  const denovoOrdersAtomic = amountAtomicFor("denovo-orders");
  const ttbOicAtomic = amountAtomicFor("ttb-oic");
  const airLettersAtomic = amountAtomicFor("air-letters");
  const superfundRodsAtomic = amountAtomicFor("superfund-rods");
  const icoMpnAtomic = amountAtomicFor("ico-mpn");
  const cmaCa98Atomic = amountAtomicFor("cma-ca98");
  const f483Atomic = amountAtomicFor("form-483");
  const gmpAtomic = amountAtomicFor("gmp");
  const gmpMdAtomic = amountAtomicFor("gmp-md");
  const ticksPrice = (Number(ticksAtomic) / 1e6).toFixed(2);
  const iaPrice = (Number(iaAtomic) / 1e6).toFixed(2);
  const lnmPrice = (Number(lnmAtomic) / 1e6).toFixed(2);
  const lnmD11Price = (Number(lnmD11Atomic) / 1e6).toFixed(2);
  const lnmD7Price = (Number(lnmD7Atomic) / 1e6).toFixed(2);
  const lnmD8Price = (Number(lnmD8Atomic) / 1e6).toFixed(2);
  const wlPrice = (Number(wlAtomic) / 1e6).toFixed(2);
  const ulPrice = (Number(ulAtomic) / 1e6).toFixed(2);
  const awaPrice = (Number(awaAtomic) / 1e6).toFixed(2);
  const swissparPrice = (Number(swissparAtomic) / 1e6).toFixed(2);
  const pcacPrice = (Number(pcacAtomic) / 1e6).toFixed(2);
  const ftcWlPrice = (Number(ftcWlAtomic) / 1e6).toFixed(2);
  const cfpbOrdersPrice = (Number(cfpbOrdersAtomic) / 1e6).toFixed(2);
  const occCdPrice = (Number(occCdAtomic) / 1e6).toFixed(2);
  const fdicOrdersPrice = (Number(fdicOrdersAtomic) / 1e6).toFixed(2);
  const frbOrdersPrice = (Number(frbOrdersAtomic) / 1e6).toFixed(2);
  const ncuaOrdersPrice = (Number(ncuaOrdersAtomic) / 1e6).toFixed(2);
  const fincenOrdersPrice = (Number(fincenOrdersAtomic) / 1e6).toFixed(2);
  const fercOrdersPrice = (Number(fercOrdersAtomic) / 1e6).toFixed(2);
  const ofacOrdersPrice = (Number(ofacOrdersAtomic) / 1e6).toFixed(2);
  const bisOrdersPrice = (Number(bisOrdersAtomic) / 1e6).toFixed(2);
  const cftcOrdersPrice = (Number(cftcOrdersAtomic) / 1e6).toFixed(2);
  const fifraOrdersPrice = (Number(fifraOrdersAtomic) / 1e6).toFixed(2);
  const denovoOrdersPrice = (Number(denovoOrdersAtomic) / 1e6).toFixed(2);
  const ttbOicPrice = (Number(ttbOicAtomic) / 1e6).toFixed(2);
  const airLettersPrice = (Number(airLettersAtomic) / 1e6).toFixed(2);
  const superfundRodsPrice = (Number(superfundRodsAtomic) / 1e6).toFixed(2);
  const icoMpnPrice = (Number(icoMpnAtomic) / 1e6).toFixed(2);
  const cmaCa98Price = (Number(cmaCa98Atomic) / 1e6).toFixed(2);
  const f483Price = (Number(f483Atomic) / 1e6).toFixed(2);
  const gmpPrice = (Number(gmpAtomic) / 1e6).toFixed(2);
  const gmpMdPrice = (Number(gmpMdAtomic) / 1e6).toFixed(2);
  const listed483 = form483IsPublic();
  const listedGmp = gmpIsPublic();
  const listedGmpMd = gmpMdIsPublic();
  const bags = await loadSkuBags();
  const paidBits = [
    `/ticks ($${ticksPrice})`,
    "/import-alerts ($0.05)",
    "/mariners ($0.02 / $0.05)",
    "/mariners-d11 ($0.02 / $0.05)",
    "/mariners-d7 ($0.02 / $0.05)",
    "/mariners-d8 ($0.02 / $0.05)",
    "/warning-letters ($0.02 / $0.05)",
    "/untitled-letters ($0.02 / $0.05)",
    "/awa ($0.02 / $0.05)",
    "/swisspar ($0.02 / $0.05)",
    "/pcac ($0.02 / $0.05)",
    "/ftc-wl ($0.02 / $0.05)",
    "/cfpb-orders ($0.02 / $0.05)",
    "/occ-cd ($0.02 / $0.05)",
    "/fdic-orders ($0.02 / $0.05)",
    "/frb-orders ($0.02 / $0.05)",
    "/ncua-orders ($0.02 / $0.05)",
    "/fincen-orders ($0.02 / $0.05)",
    "/ferc-orders ($0.02 / $0.05)",
    "/ofac-orders ($0.02 / $0.05)",
    "/bis-orders ($0.02 / $0.05)",
    "/cftc-orders ($0.02 / $0.05)",
    "/fifra-orders ($0.02 / $0.05)",
    "/denovo-orders ($0.02 / $0.05)",
    "/ttb-oic ($0.02 / $0.05)",
    "/air-letters ($0.02 / $0.05)",
    "/superfund-rods ($0.02 / $0.05)",
    "/ico-mpn ($0.02 / $0.05)",
    "/cma-ca98 ($0.02 / $0.05)",
  ];
  if (listed483) paidBits.push("/form-483 ($0.02 / $0.05)");
  if (listedGmp) paidBits.push("/gmp ($0.02 / $0.05)");
  if (listedGmpMd) paidBits.push("/gmp-md ($0.02 / $0.05)");
  const paidList = paidBits.join(", ");
  return {
    openapi: "3.1.0",
    info: {
      title: "BNM Data Shop",
      version: PRODUCT_VERSION,
      description: "Official public data as JSON. Unpaid paid routes return HTTP 402.",
      contact: { name: "BNM Data Shop", url: "https://bnm.farm/" },
      "x-guidance":
        `${paidCountWord().replace(/^./, (c) => c.toUpperCase())} paid GETs: ${paidList}, USDC on Base. Table doors (/ticks, /import-alerts): one $0.05 GET is the entire current table. Extracted-body doors: find a record on the free index (?q=); each row names the id to buy. GET ?id= is one official text for $0.02. Default GET is the newest 10 official texts for $0.05. If the catalog has fewer than 10, that $0.05 GET is the whole current set. Older pages are another $0.05 on the same URL. Start at GET /openapi.json or GET /.well-known/x402, then probe the paid URL unpaid for HTTP 402. MCP at GET/POST /mcp has a free search tool plus one paid GET per door. No request body. ${noNextSkuWord()}`,
    },
    "x-discovery": {
      ownershipProofs: [PAY_TO],
    },
    "x-agentcash-provenance": {
      ownershipProofs: [PAY_TO],
    },
    "x-agentcash-guidance": {
      llmsTxtUrl: `${origin}${LLMS_PATH}`,
    },
    servers: [{ url: origin }],
    paths: {
      [TICKS_PATH]: {
        get: paidOpenApiOp({
          sku: "ticks",
          operationId: "getTicks",
          priceUsdc: ticksPrice,
          amountAtomic: ticksAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE.ticks,
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              ticks: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [IMPORT_ALERTS_PATH]: {
        get: paidOpenApiOp({
          sku: "import-alerts",
          operationId: "getImportAlerts",
          priceUsdc: iaPrice,
          amountAtomic: iaAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["import-alerts"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              ticks: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [MARINERS_PATH]: {
        get: paidOpenApiOp({
          sku: "mariners",
          operationId: "getMariners",
          priceUsdc: lnmPrice,
          amountAtomic: lnmAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE.mariners,
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              week: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              notices: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [MARINERS_D11_PATH]: {
        get: paidOpenApiOp({
          sku: "mariners-d11",
          operationId: "getMarinersD11",
          priceUsdc: lnmD11Price,
          amountAtomic: lnmD11Atomic,
          example: BAZAAR_OUTPUT_EXAMPLE["mariners-d11"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              week: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              notices: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [MARINERS_D7_PATH]: {
        get: paidOpenApiOp({
          sku: "mariners-d7",
          operationId: "getMarinersD7",
          priceUsdc: lnmD7Price,
          amountAtomic: lnmD7Atomic,
          example: BAZAAR_OUTPUT_EXAMPLE["mariners-d7"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              week: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              notices: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [MARINERS_D8_PATH]: {
        get: paidOpenApiOp({
          sku: "mariners-d8",
          operationId: "getMarinersD8",
          priceUsdc: lnmD8Price,
          amountAtomic: lnmD8Atomic,
          example: BAZAAR_OUTPUT_EXAMPLE["mariners-d8"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              week: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              notices: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [WARNING_LETTERS_PATH]: {
        get: paidOpenApiOp({
          sku: "warning-letters",
          operationId: "getWarningLetters",
          priceUsdc: wlPrice,
          amountAtomic: wlAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["warning-letters"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              letters: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [UNTITLED_LETTERS_PATH]: {
        get: paidOpenApiOp({
          sku: "untitled-letters",
          operationId: "getUntitledLetters",
          priceUsdc: ulPrice,
          amountAtomic: ulAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["untitled-letters"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [AWA_PATH]: {
        get: paidOpenApiOp({
          sku: "awa",
          operationId: "getAwa",
          priceUsdc: awaPrice,
          amountAtomic: awaAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE.awa,
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [SWISSPAR_PATH]: {
        get: paidOpenApiOp({
          sku: "swisspar",
          operationId: "getSwisspar",
          priceUsdc: swissparPrice,
          amountAtomic: swissparAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE.swisspar,
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [PCAC_PATH]: {
        get: paidOpenApiOp({
          sku: "pcac",
          operationId: "getPcac",
          priceUsdc: pcacPrice,
          amountAtomic: pcacAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE.pcac,
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [FTC_WL_PATH]: {
        get: paidOpenApiOp({
          sku: "ftc-wl",
          operationId: "getFtcWl",
          priceUsdc: ftcWlPrice,
          amountAtomic: ftcWlAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ftc-wl"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [CFPB_ORDERS_PATH]: {
        get: paidOpenApiOp({
          sku: "cfpb-orders",
          operationId: "getCfpbOrders",
          priceUsdc: cfpbOrdersPrice,
          amountAtomic: cfpbOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["cfpb-orders"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [OCC_CD_PATH]: {
        get: paidOpenApiOp({
          sku: "occ-cd",
          operationId: "getOccCd",
          priceUsdc: occCdPrice,
          amountAtomic: occCdAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["occ-cd"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [FDIC_ORDERS_PATH]: {
        get: paidOpenApiOp({
          sku: "fdic-orders",
          operationId: "getFdicOrders",
          priceUsdc: fdicOrdersPrice,
          amountAtomic: fdicOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["fdic-orders"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [FRB_ORDERS_PATH]: {
        get: paidOpenApiOp({
          sku: "frb-orders",
          operationId: "getFrbOrders",
          priceUsdc: frbOrdersPrice,
          amountAtomic: frbOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["frb-orders"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [NCUA_ORDERS_PATH]: {
        get: paidOpenApiOp({
          sku: "ncua-orders",
          operationId: "getNcuaOrders",
          priceUsdc: ncuaOrdersPrice,
          amountAtomic: ncuaOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ncua-orders"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [FINCEN_ORDERS_PATH]: {
        get: paidOpenApiOp({
          sku: "fincen-orders",
          operationId: "getFincenOrders",
          priceUsdc: fincenOrdersPrice,
          amountAtomic: fincenOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["fincen-orders"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [FERC_ORDERS_PATH]: {
        get: paidOpenApiOp({
          sku: "ferc-orders",
          operationId: "getFercOrders",
          priceUsdc: fercOrdersPrice,
          amountAtomic: fercOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ferc-orders"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [OFAC_ORDERS_PATH]: {
        get: paidOpenApiOp({
          sku: "ofac-orders",
          operationId: "getOfacOrders",
          priceUsdc: ofacOrdersPrice,
          amountAtomic: ofacOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ofac-orders"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [BIS_ORDERS_PATH]: {
        get: paidOpenApiOp({
          sku: "bis-orders",
          operationId: "getBisOrders",
          priceUsdc: bisOrdersPrice,
          amountAtomic: bisOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["bis-orders"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [CFTC_ORDERS_PATH]: {
        get: paidOpenApiOp({
          sku: "cftc-orders",
          operationId: "getCftcOrders",
          priceUsdc: cftcOrdersPrice,
          amountAtomic: cftcOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["cftc-orders"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [FIFRA_ORDERS_PATH]: {
        get: paidOpenApiOp({
          sku: "fifra-orders",
          operationId: "getFifraOrders",
          priceUsdc: fifraOrdersPrice,
          amountAtomic: fifraOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["fifra-orders"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [DENOVO_ORDERS_PATH]: {
        get: paidOpenApiOp({
          sku: "denovo-orders",
          operationId: "getDenovoOrders",
          priceUsdc: denovoOrdersPrice,
          amountAtomic: denovoOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["denovo-orders"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [TTB_OIC_PATH]: {
        get: paidOpenApiOp({
          sku: "ttb-oic",
          operationId: "getTtbOic",
          priceUsdc: ttbOicPrice,
          amountAtomic: ttbOicAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ttb-oic"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [AIR_LETTERS_PATH]: {
        get: paidOpenApiOp({
          sku: "air-letters",
          operationId: "getAirLetters",
          priceUsdc: airLettersPrice,
          amountAtomic: airLettersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["air-letters"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [SUPERFUND_RODS_PATH]: {
        get: paidOpenApiOp({
          sku: "superfund-rods",
          operationId: "getSuperfundRods",
          priceUsdc: superfundRodsPrice,
          amountAtomic: superfundRodsAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["superfund-rods"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [ICO_MPN_PATH]: {
        get: paidOpenApiOp({
          sku: "ico-mpn",
          operationId: "getIcoMpn",
          priceUsdc: icoMpnPrice,
          amountAtomic: icoMpnAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ico-mpn"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      [CMA_CA98_PATH]: {
        get: paidOpenApiOp({
          sku: "cma-ca98",
          operationId: "getCmaCa98",
          priceUsdc: cmaCa98Price,
          amountAtomic: cmaCa98Atomic,
          example: BAZAAR_OUTPUT_EXAMPLE["cma-ca98"],
          outputSchema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              product: { type: "string" },
              status: { type: "string" },
              fetchedAt: { type: "string" },
              asOf: { type: "string" },
              source: { type: "string" },
              recordCount: { type: "integer" },
              records: { type: "array", items: { type: "object" } },
              cards: { type: "array", items: { type: "object" } },
            },
          },
        }),
      },
      ...(listed483
        ? {
            [FORM_483_PATH]: {
              get: paidOpenApiOp({
          sku: "form-483",
                operationId: "getForm483",
                priceUsdc: f483Price,
                amountAtomic: f483Atomic,
                example: BAZAAR_OUTPUT_EXAMPLE["form-483"],
                outputSchema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    product: { type: "string" },
                    status: { type: "string" },
                    fetchedAt: { type: "string" },
                    asOf: { type: "string" },
                    source: { type: "string" },
                    recordCount: { type: "integer" },
                    records: { type: "array", items: { type: "object" } },
                    letters: { type: "array", items: { type: "object" } },
                  },
                },
              }),
            },
          }
        : {}),
      ...(listedGmp
        ? {
            [GMP_PATH]: {
              get: paidOpenApiOp({
          sku: "gmp",
                operationId: "getGmp",
                priceUsdc: gmpPrice,
                amountAtomic: gmpAtomic,
                example: BAZAAR_OUTPUT_EXAMPLE.gmp,
                outputSchema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    product: { type: "string" },
                    status: { type: "string" },
                    fetchedAt: { type: "string" },
                    asOf: { type: "string" },
                    source: { type: "string" },
                    recordCount: { type: "integer" },
                    records: { type: "array", items: { type: "object" } },
                    cards: { type: "array", items: { type: "object" } },
                  },
                },
              }),
            },
          }
        : {}),
      ...(listedGmpMd
        ? {
            [GMP_MD_PATH]: {
              get: paidOpenApiOp({
          sku: "gmp-md",
                operationId: "getGmpMd",
                priceUsdc: gmpMdPrice,
                amountAtomic: gmpMdAtomic,
                example: BAZAAR_OUTPUT_EXAMPLE["gmp-md"],
                outputSchema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    product: { type: "string" },
                    status: { type: "string" },
                    fetchedAt: { type: "string" },
                    asOf: { type: "string" },
                    source: { type: "string" },
                    recordCount: { type: "integer" },
                    records: { type: "array", items: { type: "object" } },
                    cards: { type: "array", items: { type: "object" } },
                  },
                },
              }),
            },
          }
        : {}),
      [MANIFEST_PATH]: {
        get: freeOpenApiOp("US hay, cattle, and grain ticks free manifest", "Count, schema, and samples. Not the paid snapshot."),
      },
      [CATALOG_PATH]: {
        get: freeOpenApiOp("US hay, cattle, and grain ticks free catalog alias", "Same JSON as /manifest.json."),
      },
      [IMPORT_ALERTS_MANIFEST_PATH]: {
        get: freeOpenApiOp("FDA import-alerts free manifest", "Count, catalog, and schema. Not the paid firm list."),
      },
      [MARINERS_MANIFEST_PATH]: {
        get: freeOpenApiOp("USCG D13 LNM free manifest", "Count, week, and official PDF URL. Not the notice body.", true),
      },
      [MARINERS_D11_MANIFEST_PATH]: {
        get: freeOpenApiOp("USCG D11 LNM free manifest", "Count, week, and official PDF URL. Not the notice body.", true),
      },
      [MARINERS_D7_MANIFEST_PATH]: {
        get: freeOpenApiOp("USCG D7 LNM free manifest", "Count, week, and official PDF URL. Not the notice body.", true),
      },
      [MARINERS_D8_MANIFEST_PATH]: {
        get: freeOpenApiOp("USCG D8 LNM free manifest", "Count, week, and official PDF URL. Not the notice body.", true),
      },
      [WARNING_LETTERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA warning-letters free manifest",
          "Count, firm, date, subject, and official source URL. Not the letter body.",
          true,
        ),
      },
      [UNTITLED_LETTERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA untitled-letters free manifest",
          "Count, id, firm, date, product, and official source URL. Not the letter text.",
          true,
        ),
      },
      [AWA_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "APHIS AWA free manifest",
          "Count, id, firm, date, and official source URL. Not the observation text.",
          true,
        ),
      },
      [SWISSPAR_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "SwissPAR free manifest",
          "Count, name, date, MA, and official source URL. Not the evaluation text.",
          true,
        ),
      },
      [PCAC_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA PCAC free manifest",
          "Count, substance, date, meeting, mediaId, and official source URL. Not the evaluation text.",
          true,
        ),
      },
      [FTC_WL_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FTC BCP warning-letters free manifest",
          "Count, firm, date, subject, and official PDF URL. Not the letter body.",
          true,
        ),
      },
      [CFPB_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "CFPB consent-orders free manifest",
          "Count, firm, date, title, fileNo, and official PDF URL. Not the order body.",
          true,
        ),
      },
      [OCC_CD_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "OCC institution C&D free manifest",
          "Count, bank, docket, date, and official PDF URL. Not the order body.",
          true,
        ),
      },
      [FDIC_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDIC institution orders free manifest",
          "Count, bank, docket, date, and official PDF URL. Not the order body.",
          true,
        ),
      },
      [FRB_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FRB institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
          true,
        ),
      },
      [NCUA_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "NCUA institution orders free manifest",
          "Count, credit union, docket, date, and official HTML URL. Not the order body.",
          true,
        ),
      },
      [FINCEN_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FinCEN institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
          true,
        ),
      },
      [FERC_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FERC institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
          true,
        ),
      },
      [OFAC_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "OFAC institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
          true,
        ),
      },
      [BIS_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "BIS institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
          true,
        ),
      },
      [CFTC_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "CFTC institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
          true,
        ),
      },
      [FIFRA_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "EPA FIFRA institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
          true,
        ),
      },
      [DENOVO_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA De Novo classification orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
          true,
        ),
      },
      [TTB_OIC_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "TTB Offer in Compromise free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
          true,
        ),
      },
      [AIR_LETTERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "APHIS AIR confirmation letters free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the letter body.",
          true,
        ),
      },
      [SUPERFUND_RODS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "EPA Superfund Records of Decision free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the ROD body.",
          true,
        ),
      },
      [ICO_MPN_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "ICO Monetary Penalty Notices free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the MPN body.",
          true,
        ),
      },
      [CMA_CA98_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "UK CMA CA98 infringement decisions free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the decision body.",
          true,
        ),
      },
      ...(listed483
        ? {
            [FORM_483_MANIFEST_PATH]: {
              get: freeOpenApiOp(
                "FDA Form 483 free manifest",
                "Count, id, firm, and dates. Not the observation body.",
                true,
              ),
            },
          }
        : {}),
      ...(listedGmp
        ? {
            [GMP_MANIFEST_PATH]: {
              get: freeOpenApiOp(
                "Health Canada GMP free manifest",
                "Count, id, firm, date, and rating. Not the observation text.",
                true,
              ),
            },
          }
        : {}),
      ...(listedGmpMd
        ? {
            [GMP_MD_MANIFEST_PATH]: {
              get: freeOpenApiOp(
                "Health Canada medical-device free manifest",
                "Count, id, firm, date, and rating. Not the report-card body text.",
                true,
              ),
            },
          }
        : {}),
      [WELL_KNOWN_PATH]: {
        get: freeOpenApiOp(
          "x402 well-known fan-out",
          `Absolute URLs of the ${paidCountWord()} live paid routes only.`,
        ),
      },
      [OPENAPI_PATH]: {
        get: freeOpenApiOp("OpenAPI discovery document", "This document."),
      },
      [LLMS_PATH]: {
        get: freeOpenApiOp(
          "Short agent guidance",
          `The ${paidCountWord()} paid doors and free discovery URLs. Not a paid SKU.`,
        ),
      },
      [MCP_PATH]: {
        get: freeOpenApiOp(
          "MCP discovery",
          `Streamable HTTP MCP: free search tool plus the ${paidCountWord()} paid page GETs. Not a paid SKU. Connect: npx -y mcp-remote https://ticks.bnm.farm/mcp`,
        ),
        post: freeOpenApiOp(
          "MCP JSON-RPC",
          `initialize / tools/list / tools/call. Free search tool finds a record on the index (?q=) and names the id to buy. Paid tools GET ?id= ($0.02) or the default/newest-10 bag ($0.05; whole current set if n<10). Table doors return the entire current table. Unpaid paid tools still HTTP 402.`,
        ),
      },
      "/": {
        get: freeOpenApiOp(
          "Shop discovery JSON",
          `payTo, network, and the ${paidCountWord()} public products. Each product has a one-line description plus catalog count. Table doors return the entire current table. Extracted-body doors: find on free index (?q=), then buy ?id= for $0.02 or the default/newest 10 for $0.05 (whole current set if n<10).`,
        ),
      },
    },
    components: {
      securitySchemes: {
        x402: {
          type: "apiKey",
          in: "header",
          name: "X-PAYMENT",
          description: "x402 payment payload. Unpaid GET returns HTTP 402 with PAYMENT-REQUIRED.",
        },
      },
    },
  };
}

async function servePaid(
  req: IncomingMessage,
  res: ServerResponse,
  port: number,
  sku: DoorSku,
  load: () => unknown | Promise<unknown>,
): Promise<void> {
  const copy = SKU_COPY[sku];
  await loadSkuBags([sku]);
  const payment = paymentHeader(req);
  const resource = resourceUrl(req, port, copy.resourcePath);
  const pageQuery = parseExtractedPageQuery(new URL(req.url || copy.resourcePath, resource));
  const body402 = paymentRequiredBody(resource, sku, pageQuery);
  const v2 = paymentRequiredV2(resource, sku, pageQuery);
  const paymentRequiredHeader = Buffer.from(JSON.stringify(v2), "utf-8").toString("base64");

  if (!payment) {
    sendJson(res, 402, body402, { "PAYMENT-REQUIRED": paymentRequiredHeader });
    return;
  }

  const serve = async () => {
    const raw = await load();
    const body = !isTableSku(sku) && raw && typeof raw === "object"
      ? pageExtractedPaidBody(raw as Record<string, unknown>, pageQuery)
      : raw;
    sendJson(res, 200, body);
  };

  if (skipSettle()) {
    await serve();
    return;
  }

  const accept = facilitatorPaymentRequirements(resource, sku, pageQuery);
  const verified = await facilitatorVerify(payment, accept);
  if (verified && (await facilitatorSettle(payment, accept))) {
    await serve();
    return;
  }
  if (await localEip3009Settle(payment, accept)) {
    await serve();
    return;
  }
  sendJson(
    res,
    402,
    {
      ...body402,
      error: "Payment present but not settled. Set X402_FACILITATOR_URL or pay with a valid x402 X-PAYMENT header.",
    },
    { "PAYMENT-REQUIRED": paymentRequiredHeader },
  );
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse, port: number): Promise<void> {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === MCP_PATH) {
    const origin = discoveryOrigin(req, port);
    await handleMcpHttp(req, res, origin, {
      wellKnown: await wellKnownX402(req, port),
      openApi: await buildOpenApi(req, port),
    });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "X-PAYMENT, PAYMENT-SIGNATURE, Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  if (path === "/") {
    const bags = await loadSkuBags();
    sendJson(res, 200, {
      shop: "bnm-data-shop",
      payTo: PAY_TO,
      network: NETWORK_V1,
      asset: USDC_BASE,
      openapi: OPENAPI_PATH,
      wellKnown: WELL_KNOWN_PATH,
      llmsTxt: LLMS_PATH,
      mcp: MCP_PATH,
      search: "Extracted-body doors: GET {manifest}?q=. Each hit names the id to buy. GET ?id= is one official text for $0.02. Default GET is the newest 10 official texts for $0.05 (whole current set if n<10). Table doors have no page — one paid GET is the entire current table.",
      products: publicBazaarSkus().map((sku) => shopProductCard(sku, bags.get(sku) ?? bagFromManifest(sku, {}))),
    });
    return;
  }

  if (path === WELL_KNOWN_PATH || path === "/.well-known/x402.json") {
    sendJson(res, 200, await wellKnownX402(req, port));
    return;
  }

  if (path === OPENAPI_PATH) {
    sendJson(res, 200, await buildOpenApi(req, port));
    return;
  }

  if (path === LLMS_PATH) {
    sendText(res, 200, await llmsTxt(), "text/markdown; charset=utf-8");
    return;
  }

  if (path === MANIFEST_PATH || path === CATALOG_PATH) {
    sendJson(res, 200, buildTicksManifest(resourceUrl(req, port, TICKS_PATH)));
    return;
  }

  if (path === IMPORT_ALERTS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadManifest(), req, port));
    return;
  }

  if (path === MARINERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadMarinersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === MARINERS_D11_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadMarinersD11Manifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === MARINERS_D7_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadMarinersD7Manifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === MARINERS_D8_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadMarinersD8Manifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === IMPORT_ALERTS_PATH) {
    await servePaid(req, res, port, "import-alerts", async () => paidImportAlertsBody(await loadImportAlerts()));
    return;
  }

  if (path === MARINERS_PATH) {
    await servePaid(req, res, port, "mariners", async () => paidMarinersBody(await loadMariners()));
    return;
  }

  if (path === MARINERS_D11_PATH) {
    await servePaid(req, res, port, "mariners-d11", async () => paidMarinersD11Body(await loadMarinersD11()));
    return;
  }

  if (path === MARINERS_D7_PATH) {
    await servePaid(req, res, port, "mariners-d7", async () => paidMarinersD7Body(await loadMarinersD7()));
    return;
  }

  if (path === MARINERS_D8_PATH) {
    await servePaid(req, res, port, "mariners-d8", async () => paidMarinersD8Body(await loadMarinersD8()));
    return;
  }

  if (path === WARNING_LETTERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadWarningLettersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === WARNING_LETTERS_PATH) {
    await servePaid(req, res, port, "warning-letters", async () => paidWarningLettersBody(await loadWarningLetters()));
    return;
  }

  if (path === UNTITLED_LETTERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadUntitledLettersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === UNTITLED_LETTERS_PATH) {
    await servePaid(req, res, port, "untitled-letters", async () => paidUntitledLettersBody(await loadUntitledLetters()));
    return;
  }

  if (path === AWA_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadAwaManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === AWA_PATH) {
    await servePaid(req, res, port, "awa", async () => paidAwaBody(await loadAwa()));
    return;
  }

  if (path === SWISSPAR_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadSwissparManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === SWISSPAR_PATH) {
    await servePaid(req, res, port, "swisspar", async () => paidSwissparBody(await loadSwisspar()));
    return;
  }

  if (path === PCAC_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadPcacManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === PCAC_PATH) {
    await servePaid(req, res, port, "pcac", async () => paidPcacBody(await loadPcac()));
    return;
  }

  if (path === FTC_WL_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadFtcWlManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === FTC_WL_PATH) {
    await servePaid(req, res, port, "ftc-wl", async () => paidFtcWlBody(await loadFtcWl()));
    return;
  }

  if (path === CFPB_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadCfpbOrdersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === CFPB_ORDERS_PATH) {
    await servePaid(req, res, port, "cfpb-orders", async () => paidCfpbOrdersBody(await loadCfpbOrders()));
    return;
  }

  if (path === OCC_CD_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadOccCdManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === OCC_CD_PATH) {
    await servePaid(req, res, port, "occ-cd", async () => paidOccCdBody(await loadOccCd()));
    return;
  }

  if (path === FDIC_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadFdicOrdersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === FDIC_ORDERS_PATH) {
    await servePaid(req, res, port, "fdic-orders", async () => paidFdicOrdersBody(await loadFdicOrders()));
    return;
  }

  if (path === FRB_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadFrbOrdersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === FRB_ORDERS_PATH) {
    await servePaid(req, res, port, "frb-orders", async () => paidFrbOrdersBody(await loadFrbOrders()));
    return;
  }

  if (path === NCUA_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadNcuaOrdersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === NCUA_ORDERS_PATH) {
    await servePaid(req, res, port, "ncua-orders", async () => paidNcuaOrdersBody(await loadNcuaOrders()));
    return;
  }

  if (path === FINCEN_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadFincenOrdersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === FINCEN_ORDERS_PATH) {
    await servePaid(req, res, port, "fincen-orders", async () => paidFincenOrdersBody(await loadFincenOrders()));
    return;
  }

  if (path === FERC_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadFercOrdersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === FERC_ORDERS_PATH) {
    await servePaid(req, res, port, "ferc-orders", async () => paidFercOrdersBody(await loadFercOrders()));
    return;
  }

  if (path === OFAC_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadOfacOrdersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === OFAC_ORDERS_PATH) {
    await servePaid(req, res, port, "ofac-orders", async () => paidOfacOrdersBody(await loadOfacOrders()));
    return;
  }

  if (path === BIS_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadBisOrdersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === BIS_ORDERS_PATH) {
    await servePaid(req, res, port, "bis-orders", async () => paidBisOrdersBody(await loadBisOrders()));
    return;
  }

  if (path === CFTC_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadCftcOrdersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === CFTC_ORDERS_PATH) {
    await servePaid(req, res, port, "cftc-orders", async () => paidCftcOrdersBody(await loadCftcOrders()));
    return;
  }

  if (path === FIFRA_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadFifraOrdersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === FIFRA_ORDERS_PATH) {
    await servePaid(req, res, port, "fifra-orders", async () => paidFifraOrdersBody(await loadFifraOrders()));
    return;
  }

  if (path === DENOVO_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadDenovoOrdersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === DENOVO_ORDERS_PATH) {
    await servePaid(req, res, port, "denovo-orders", async () => paidDenovoOrdersBody(await loadDenovoOrders()));
    return;
  }

  if (path === TTB_OIC_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadTtbOicManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === TTB_OIC_PATH) {
    await servePaid(req, res, port, "ttb-oic", async () => paidTtbOicBody(await loadTtbOic()));
    return;
  }

  if (path === AIR_LETTERS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadAirLettersManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === AIR_LETTERS_PATH) {
    await servePaid(req, res, port, "air-letters", async () => paidAirLettersBody(await loadAirLetters()));
    return;
  }

  if (path === SUPERFUND_RODS_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadSuperfundRodsManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === SUPERFUND_RODS_PATH) {
    await servePaid(req, res, port, "superfund-rods", async () => paidSuperfundRodsBody(await loadSuperfundRods()));
    return;
  }

  if (path === ICO_MPN_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadIcoMpnManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === ICO_MPN_PATH) {
    await servePaid(req, res, port, "ico-mpn", async () => paidIcoMpnBody(await loadIcoMpn()));
    return;
  }

  if (path === CMA_CA98_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadCmaCa98Manifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === CMA_CA98_PATH) {
    await servePaid(req, res, port, "cma-ca98", async () => paidCmaCa98Body(await loadCmaCa98()));
    return;
  }

  if (path === FORM_483_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadForm483Manifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === FORM_483_PATH) {
    await servePaid(req, res, port, "form-483", async () => paidForm483Body(await loadForm483()));
    return;
  }

  if (path === GMP_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadGmpManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === GMP_PATH) {
    await servePaid(req, res, port, "gmp", async () => paidGmpBody(await loadGmp()));
    return;
  }

  if (path === GMP_MD_MANIFEST_PATH) {
    sendExtractedManifest(res, await loadGmpMdManifest(), req, port, url.searchParams.get("q"));
    return;
  }

  if (path === GMP_MD_PATH) {
    await servePaid(req, res, port, "gmp-md", async () => paidGmpMdBody(await loadGmpMd()));
    return;
  }

  if (path === TICKS_PATH) {
    await servePaid(req, res, port, "ticks", () => paidTicksBody(loadTicks()));
    return;
  }

  sendJson(res, 404, { error: "not_found", paths: [TICKS_PATH, MANIFEST_PATH, CATALOG_PATH, IMPORT_ALERTS_PATH, IMPORT_ALERTS_MANIFEST_PATH, MARINERS_PATH, MARINERS_MANIFEST_PATH, MARINERS_D11_PATH, MARINERS_D11_MANIFEST_PATH, MARINERS_D7_PATH, MARINERS_D7_MANIFEST_PATH, MARINERS_D8_PATH, MARINERS_D8_MANIFEST_PATH, WARNING_LETTERS_PATH, WARNING_LETTERS_MANIFEST_PATH, UNTITLED_LETTERS_PATH, UNTITLED_LETTERS_MANIFEST_PATH, AWA_PATH, AWA_MANIFEST_PATH, SWISSPAR_PATH, SWISSPAR_MANIFEST_PATH, PCAC_PATH, PCAC_MANIFEST_PATH, FTC_WL_PATH, FTC_WL_MANIFEST_PATH, CFPB_ORDERS_PATH, CFPB_ORDERS_MANIFEST_PATH, OCC_CD_PATH, OCC_CD_MANIFEST_PATH, FDIC_ORDERS_PATH, FDIC_ORDERS_MANIFEST_PATH, FRB_ORDERS_PATH, FRB_ORDERS_MANIFEST_PATH, NCUA_ORDERS_PATH, NCUA_ORDERS_MANIFEST_PATH, FINCEN_ORDERS_PATH, FINCEN_ORDERS_MANIFEST_PATH, FERC_ORDERS_PATH, FERC_ORDERS_MANIFEST_PATH, OFAC_ORDERS_PATH, OFAC_ORDERS_MANIFEST_PATH, BIS_ORDERS_PATH, BIS_ORDERS_MANIFEST_PATH, CFTC_ORDERS_PATH, CFTC_ORDERS_MANIFEST_PATH, FIFRA_ORDERS_PATH, FIFRA_ORDERS_MANIFEST_PATH, DENOVO_ORDERS_PATH, DENOVO_ORDERS_MANIFEST_PATH, TTB_OIC_PATH, TTB_OIC_MANIFEST_PATH, AIR_LETTERS_PATH, AIR_LETTERS_MANIFEST_PATH, SUPERFUND_RODS_PATH, SUPERFUND_RODS_MANIFEST_PATH, ICO_MPN_PATH, ICO_MPN_MANIFEST_PATH, CMA_CA98_PATH, CMA_CA98_MANIFEST_PATH, FORM_483_PATH, FORM_483_MANIFEST_PATH, GMP_PATH, GMP_MANIFEST_PATH, GMP_MD_PATH, GMP_MD_MANIFEST_PATH, WELL_KNOWN_PATH, OPENAPI_PATH, LLMS_PATH, MCP_PATH] });
}

export function bindHost(): string {
  return env("BIND_HOST", "0.0.0.0");
}

export function createTicksServer(port = Number(env("PORT", "4020")) || 4020) {
  const server = createHttpServer((req, res) => {
    void handleRequest(req, res, port).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) sendJson(res, 500, { error: "server_error", message });
    });
  });
  return { server, port };
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  const { server, port } = createTicksServer();
  const host = bindHost();
  server.listen(port, host, () => {
    const board = boardPath();
    console.error(`bnm data shop x402 door on ${host}:${port}`);
    const extractedBoot = "$0.02 id / $0.05 page USDC";
    console.error(`${TICKS_PATH} $${Number(amountAtomicFor("ticks")) / 1e6} USDC`);
    console.error(`${IMPORT_ALERTS_PATH} $${Number(amountAtomicFor("import-alerts")) / 1e6} USDC`);
    console.error(`${MARINERS_PATH} ${extractedBoot}`);
    console.error(`${MARINERS_D11_PATH} ${extractedBoot}`);
    console.error(`${MARINERS_D7_PATH} ${extractedBoot}`);
    console.error(`${MARINERS_D8_PATH} ${extractedBoot}`);
    console.error(`${WARNING_LETTERS_PATH} ${extractedBoot}`);
    console.error(`${UNTITLED_LETTERS_PATH} ${extractedBoot}`);
    console.error(`${AWA_PATH} ${extractedBoot}`);
    console.error(`${SWISSPAR_PATH} ${extractedBoot}`);
    console.error(`${PCAC_PATH} ${extractedBoot}`);
    console.error(`${FTC_WL_PATH} ${extractedBoot}`);
    console.error(`${CFPB_ORDERS_PATH} ${extractedBoot}`);
    console.error(`${OCC_CD_PATH} ${extractedBoot}`);
    console.error(`${FDIC_ORDERS_PATH} ${extractedBoot}`);
    console.error(`${FRB_ORDERS_PATH} ${extractedBoot}`);
    console.error(`${NCUA_ORDERS_PATH} ${extractedBoot}`);
    console.error(`${FINCEN_ORDERS_PATH} ${extractedBoot}`);
    console.error(`${FERC_ORDERS_PATH} ${extractedBoot}`);
    console.error(`${OFAC_ORDERS_PATH} ${extractedBoot}`);
    console.error(`${BIS_ORDERS_PATH} ${extractedBoot}`);
    console.error(`${CFTC_ORDERS_PATH} ${extractedBoot}`);
    console.error(`${FIFRA_ORDERS_PATH} ${extractedBoot}`);
    console.error(`${DENOVO_ORDERS_PATH} ${extractedBoot}`);
    console.error(`${TTB_OIC_PATH} ${extractedBoot}`);
    console.error(`${AIR_LETTERS_PATH} ${extractedBoot}`);
    console.error(`${SUPERFUND_RODS_PATH} ${extractedBoot}`);
    console.error(`${ICO_MPN_PATH} ${extractedBoot}`);
    console.error(`${CMA_CA98_PATH} ${extractedBoot}`);
    console.error(`${FORM_483_PATH} ${extractedBoot}${form483IsPublic() ? "" : " (unlisted until a real 483 body is cached)"}`);
    console.error(`${GMP_PATH} ${extractedBoot}${gmpIsPublic() ? "" : " (unlisted until a real GMP observation body is cached)"}`);
    console.error(`${GMP_MD_PATH} ${extractedBoot}${gmpMdIsPublic() ? "" : " (unlisted until a real MD observation body is cached)"}`);
    console.error(`mcp ${MCP_PATH} — ${paidDiscoveryPaths().length} tools from ${WELL_KNOWN_PATH}`);
    console.error(`payTo ${PAY_TO} USDC ${USDC_BASE} on Base`);
    console.error(`ticksDir ${ticksDir() || "(unset)"}`);
    console.error(`board ${board && existsSync(board) ? board : "missing — paid /ticks body will be empty/stale"}`);
  });
}
