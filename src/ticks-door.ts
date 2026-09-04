#!/usr/bin/env node
/**
 * Thin x402 pay-per-pull door for the BNM Data Shop.
 *
 * GET /ticks — USDA farm market prices ($0.05 USDC on Base)
 * GET /sample — free canned paid-JSON keys (not a SKU)
 * GET /firm-check?q= — free firm-name search across Form 483, warning letters, untitled letters, FTC WL, Ofwat, Ofgem, CFPB/OCC/FDIC, import-alert indexes (not a SKU)
 * GET /.well-known/x402list.txt — free static ownership proof (HTTP 200, not a SKU)
 * GET /import-alerts — FDA Import Alert / DWPE firm ticks ($0.05)
 * GET /import-alerts/manifest.json — free catalog + schema + sample rows
 * GET /mariners — USCG D13 / Northwest Local Notice to Mariners ($0.05)
 * GET /mariners/manifest.json — free count + official source (no notice body)
 * GET /mariners-d11 — USCG D11 / Southwest Local Notice to Mariners ($0.05)
 * GET /mariners-d11/manifest.json — free count + official source (no notice body)
 * GET /mariners-d7 — USCG D7 / Southeast Local Notice to Mariners ($0.05)
 * GET /mariners-d7/manifest.json — free count + official source (no notice body)
 * GET /mariners-d8 — USCG D8 / Gulf Local Notice to Mariners ($0.05)
 * GET /mariners-d8/manifest.json — free count + official source (no notice body)
 * GET /warning-letters — FDA warning-letter bodies ($0.05)
 * GET /warning-letters/manifest.json — free count + source (no letter body)
 * GET /untitled-letters — FDA Untitled Letter bodies, CDER OPDP + CBER promo ($0.05)
 * GET /untitled-letters/manifest.json — free count + id/firm/date/product (no letter text)
 * GET /awa — USDA APHIS AWA inspection-report observation text ($0.05)
 * GET /awa/manifest.json — free count + id/firm/date/sourceUrl (no observation text)
 * GET /swisspar — Swissmedic first-authorisation SwissPAR evaluation text ($0.05)
 * GET /swisspar/manifest.json — free count + name/date/MA/sourceUrl (no evaluation text)
 * GET /pcac — FDA PCAC 503A briefing-memo evaluation text ($0.05)
 * GET /pcac/manifest.json — free count + substance/date/meeting/mediaId/sourceUrl (no evaluation text)
 * GET /ftc-wl — FTC BCP warning-letter PDF text ($0.05)
 * GET /ftc-wl/manifest.json — free count + firm/date/subject/sourceUrl (no letter body)
 * GET /cfpb-orders — CFPB consent-order / administrative-order PDF text ($0.05)
 * GET /cfpb-orders/manifest.json — free count + firm/date/title/fileNo/sourceUrl (no order body)
 * GET /occ-cd — OCC institution C&D / consent-order PDF text ($0.05)
 * GET /occ-cd/manifest.json — free count + bank/docket/date/sourceUrl (no order body)
 * GET /fdic-orders — FDIC institution consent-order / C&D PDF text ($0.05)
 * GET /fdic-orders/manifest.json — free count + bank/docket/date/sourceUrl (no order body)
 * GET /frb-orders — FRB institution C&D / written-agreement / PCA PDF text ($0.05)
 * GET /frb-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /ncua-orders — NCUA institution consent C&D HTML text ($0.05)
 * GET /ncua-orders/manifest.json — free count + credit union/docket/date/sourceUrl (no order body)
 * GET /fincen-orders — FinCEN institution consent-order PDF text ($0.05)
 * GET /fincen-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /ferc-orders — FERC institution stipulation-and-consent / show-cause / civil-penalty PDF text ($0.05)
 * GET /ferc-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /ofac-orders — OFAC institution/company enforcement-release PDF text ($0.05)
 * GET /ofac-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /bis-orders — BIS institution charging-letter / order / settlement PDF text ($0.05)
 * GET /bis-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /cftc-orders — CFTC institution enforcement-order / settlement PDF text ($0.05)
 * GET /cftc-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /fifra-orders — EPA FIFRA institution order / consent PDF text ($0.05)
 * GET /fifra-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /denovo-orders — FDA De Novo classification-order PDF text ($0.05)
 * GET /denovo-orders/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /ttb-oic — TTB institution Offer in Compromise PDF text ($0.05)
 * GET /ttb-oic/manifest.json — free count + institution/docket/date/sourceUrl (no order body)
 * GET /air-letters — USDA APHIS AIR confirmation-letter PDF text ($0.05)
 * GET /air-letters/manifest.json — free count + institution/docket/date/sourceUrl (no letter body)
 * GET /superfund-rods — EPA Superfund Record of Decision PDF text ($0.05)
 * GET /superfund-rods/manifest.json — free count + institution/docket/date/sourceUrl (no ROD body)
 * GET /ico-mpn — ICO Monetary Penalty Notice PDF text ($0.05)
 * GET /ico-mpn/manifest.json — free count + institution/docket/date/sourceUrl (no MPN body)
 * GET /cma-ca98 — UK CMA CA98 institution infringement-decision PDF text ($0.05)
 * GET /cma-ca98/manifest.json — free count + institution/docket/date/sourceUrl (no decision body)
 * GET /ema-referrals — EMA human-medicine referral procedure PDF text ($0.02 id / $0.05 page)
 * GET /ema-referrals/manifest.json — free count + name/date/status/sourceUrl (no procedure body)
 * GET /cder-reviews — FDA CDER Integrated Review PDF text ($0.02 id / $0.05 page)
 * GET /cder-reviews/manifest.json — free count + name/date/application/sourceUrl (no review body)
 * GET /npdes-permits — EPA-issued individual NPDES permit PDF text ($0.02 id / $0.05 page)
 * GET /npdes-permits/manifest.json — free count + name/date/permit/sourceUrl (no permit body)
 * GET /ofsted-inspections — Ofsted school / provider inspection-report PDF text ($0.02 id / $0.05 page)
 * GET /ofsted-inspections/manifest.json — free count + provider/URN/date/sourceUrl (no report body)
 * GET /ofwat-enforcement — Ofwat Water Industry Act 1991 enforcement-notice PDF text ($0.02 id / $0.05 page)
 * GET /ofwat-enforcement/manifest.json — free count + institution/docket/date/sourceUrl (no notice body)
 * GET /ofgem-enforcement — Ofgem enforcement-notice / s.27A / provisional-order PDF text ($0.02 id / $0.05 page)
 * GET /ofgem-enforcement/manifest.json — free count + institution/docket/date/sourceUrl (no notice body)
 * GET /gain — USDA FAS GAIN attaché report TEXT ($0.02 id / $0.05 page)
 * GET /gain/manifest.json — free count + report number/country/post/date/sourceUrl (no attaché body)
 * GET /orr-enforcement — ORR Railways Act s.55 statutory-notice / final-order / investigation-report TEXT ($0.02 id / $0.05 page)
 * GET /orr-enforcement/manifest.json — free count + institution/docket/date/sourceUrl (no notice body)
 * GET /phmsa-orders — PHMSA-authored NOPV (PCP/PCO) / Final Order / CAO / Consent Order / Decision on Petition TEXT ($0.02 id / $0.05 page)
 * GET /phmsa-orders/manifest.json — free count + operator/CPF/date/sourceUrl (no order body)
 * GET /aaib-reports — UK AAIB investigation-report PDF text ($0.02 id / $0.05 page)
 * GET /aaib-reports/manifest.json — free count + title/registration/aircraft/date/sourceUrl (no report body)
 * GET /csb-reports — US CSB final investigation report PDF ($0.05 one official PDF)
 * GET /csb-reports/manifest.json — free count + facility/date/title/pageUrl/sourceUrl (no PDF bytes)
 * GET /hhs-oig-reports — HHS OIG full Audit / Evaluation report PDF ($0.05 one official PDF)
 * GET /hhs-oig-reports/manifest.json — free count + report number/date/title/pageUrl/sourceUrl (no PDF bytes)
 * GET /eis-reports — EPA NEPA Environmental Impact Statement PDF text ($0.02 id / $0.05 page)
 * GET /eis-reports/manifest.json — free count + CEQ number/date/title/agency/pageUrl (no EIS body)
 * GET /fsis-humane — USDA FSIS humane-handling enforcement letter PDF text ($0.02 id / $0.05 page)
 * GET /fsis-humane/manifest.json — free count + establishment/letter type/date/sourceUrl (no letter body)
 * GET /epa-cafo — EPA Part 22 CAFO / ESA administrative penalty letter PDF text ($0.02 id / $0.05 page)
 * GET /epa-cafo/manifest.json — free count + institution/docket/date/sourceUrl (no letter body)
 * GET /form-483 — FDA Form 483 observation bodies ($0.05). Listed only when a real body is cached.
 * GET /form-483/manifest.json — free id / date / firm (no observation body)
 * GET /gmp — Health Canada Drug GMP report-card observation bodies ($0.05). Listed only when a real body is cached.
 * GET /gmp/manifest.json — free id / firm / date / rating (no observation text)
 * GET /gmp-md — Health Canada medical-device report-card observation bodies ($0.05). Listed only when a real body is cached.
 * GET /gmp-md/manifest.json — free id / firm / date / rating (no report-card body text)
 *
 * Unpaid paid paths → HTTP 402 (GET or POST; empty JSON `{}` is accepted).
 * Public doors persist via a CDP v2
 * verify/settle body: paymentPayload.resource is {url,description,mimeType}
 * and extensions.bazaar lives on the payload (not on paymentRequirements).
 * No keys in the repo.
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateJwt } from "@coinbase/cdp-sdk/auth";
import {
  IMPORT_ALERTS_AMOUNT_ATOMIC,
  IMPORT_ALERTS_MANIFEST_PATH,
  IMPORT_ALERTS_PATH,
  TICKS_AMOUNT_ATOMIC,
  loadImportAlerts,
  loadManifest,
} from "./import-alerts.js";
import {
  D7_SPEC,
  D8_SPEC,
  D11_SPEC,
  MARINERS_AMOUNT_ATOMIC,
  MARINERS_D7_MANIFEST_PATH,
  MARINERS_D7_PATH,
  MARINERS_D8_MANIFEST_PATH,
  MARINERS_D8_PATH,
  MARINERS_D11_MANIFEST_PATH,
  MARINERS_D11_PATH,
  MARINERS_MANIFEST_PATH,
  MARINERS_PATH,
  loadMariners,
  loadMarinersD7,
  loadMarinersD7Manifest,
  loadMarinersD8,
  loadMarinersD8Manifest,
  loadMarinersD11,
  loadMarinersD11Manifest,
  loadMarinersManifest,
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
  EMA_REFERRALS_AMOUNT_ATOMIC,
  EMA_REFERRALS_MANIFEST_PATH,
  EMA_REFERRALS_PATH,
  loadEmaReferrals,
  loadEmaReferralsManifest,
} from "./ema-referrals.js";
import {
  CDER_REVIEWS_AMOUNT_ATOMIC,
  CDER_REVIEWS_MANIFEST_PATH,
  CDER_REVIEWS_PATH,
  loadCderReviews,
  loadCderReviewsManifest,
} from "./cder-reviews.js";
import {
  NPDES_PERMITS_AMOUNT_ATOMIC,
  NPDES_PERMITS_MANIFEST_PATH,
  NPDES_PERMITS_PATH,
  loadNpdesPermits,
  loadNpdesPermitsManifest,
} from "./npdes-permits.js";
import {
  OFSTED_INSPECTIONS_AMOUNT_ATOMIC,
  OFSTED_INSPECTIONS_MANIFEST_PATH,
  OFSTED_INSPECTIONS_PATH,
  loadOfstedInspections,
  loadOfstedInspectionsManifest,
} from "./ofsted-inspections.js";
import {
  OFWAT_ENFORCEMENT_AMOUNT_ATOMIC,
  OFWAT_ENFORCEMENT_MANIFEST_PATH,
  OFWAT_ENFORCEMENT_PATH,
  loadOfwatEnforcement,
  loadOfwatEnforcementManifest,
} from "./ofwat-enforcement.js";
import {
  OFGEM_ENFORCEMENT_AMOUNT_ATOMIC,
  OFGEM_ENFORCEMENT_MANIFEST_PATH,
  OFGEM_ENFORCEMENT_PATH,
  loadOfgemEnforcement,
  loadOfgemEnforcementManifest,
} from "./ofgem-enforcement.js";
import {
  GAIN_AMOUNT_ATOMIC,
  GAIN_MANIFEST_PATH,
  GAIN_PATH,
  loadGain,
  loadGainManifest,
} from "./gain.js";
import {
  ORR_ENFORCEMENT_AMOUNT_ATOMIC,
  ORR_ENFORCEMENT_MANIFEST_PATH,
  ORR_ENFORCEMENT_PATH,
  loadOrrEnforcement,
  loadOrrEnforcementManifest,
} from "./orr-enforcement.js";
import {
  PHMSA_ORDERS_AMOUNT_ATOMIC,
  PHMSA_ORDERS_MANIFEST_PATH,
  PHMSA_ORDERS_PATH,
  loadPhmsaOrders,
  loadPhmsaOrdersManifest,
} from "./phmsa-orders.js";
import {
  AAIB_REPORTS_AMOUNT_ATOMIC,
  AAIB_REPORTS_MANIFEST_PATH,
  AAIB_REPORTS_PATH,
  loadAaibReports,
  loadAaibReportsManifest,
} from "./aaib-reports.js";
import {
  CSB_REPORTS_AMOUNT_ATOMIC,
  CSB_REPORTS_MANIFEST_PATH,
  CSB_REPORTS_PATH,
  loadCsbReports,
  loadCsbReportsManifest,
  readCachedPdf,
  selectCsbReportCard,
} from "./csb-reports.js";
import {
  HHS_OIG_REPORTS_AMOUNT_ATOMIC,
  HHS_OIG_REPORTS_MANIFEST_PATH,
  HHS_OIG_REPORTS_PATH,
  loadHhsOigReports,
  loadHhsOigReportsManifest,
  readCachedPdf as readCachedHhsOigPdf,
  selectHhsOigReportCard,
} from "./hhs-oig-reports.js";
import {
  EIS_REPORTS_AMOUNT_ATOMIC,
  EIS_REPORTS_MANIFEST_PATH,
  EIS_REPORTS_PATH,
  loadEisReports,
  loadEisReportsManifest,
} from "./eis-reports.js";
import {
  FSIS_HUMANE_AMOUNT_ATOMIC,
  FSIS_HUMANE_MANIFEST_PATH,
  FSIS_HUMANE_PATH,
  loadFsisHumane,
  loadFsisHumaneManifest,
} from "./fsis-humane.js";
import {
  EPA_CAFO_AMOUNT_ATOMIC,
  EPA_CAFO_MANIFEST_PATH,
  EPA_CAFO_PATH,
  loadEpaCafo,
  loadEpaCafoManifest,
} from "./epa-cafo.js";
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
  paidCderReviewsBody,
  paidEmaReferralsBody,
  paidNpdesPermitsBody,
  paidOfstedInspectionsBody,
  paidOfwatEnforcementBody,
  paidOfgemEnforcementBody,
  paidGainBody,
  paidOrrEnforcementBody,
  paidPhmsaOrdersBody,
  paidAaibReportsBody,
  paidEisReportsBody,
  paidEpaCafoBody,
  paidFsisHumaneBody,
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
  COLLECT_CADENCE,
  decorateExtractedBodyManifest,
  etagFromPaidEnvelope,
  HTTP_429_COPY,
  ifNoneMatchHits,
  isExtractedBodySku,
  newestOfficialTextsCopy,
  newerSinceCopy,
  oneOfficialTextCopy,
  paidBodyOptsFromSearch,
  paidBodyQueryPath,
  paidBodyWindow,
  PAGE_AMOUNT_ATOMIC,
  SINGLE_DOC_AMOUNT_ATOMIC,
  tableUnchangedSince,
  type PaidBodyOpts,
} from "./paid-records.js";
import {
  FIRM_CHECK_NOTE,
  FIRM_CHECK_PATH,
  firmCheckQuery,
  runFirmCheck,
} from "./firm-check.js";
import {
  SHOP_REQUEST_LOG_ROLLUP_PATH,
  logShopRequest,
  sendLocalShopRequestRollup,
  shopRequestLogPath,
} from "./shop-request-log.js";
import {
  PRODUCT_PUBLIC_ID,
  SAMPLE_HOW_TO_USE,
  SAMPLE_PATH,
  SAMPLE_TABLE_SKU,
  TICKS_PUBLIC_CACHE_SOURCE,
  shopPaidJsonSample,
} from "./shop-sample.js";
import { mergeAmsNationalTicks } from "./ticks-ams.js";
import { attachOfficialComposites, type OfficialComposite } from "./ticks-composites.js";
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
export const X402LIST_PATH = "/.well-known/x402list.txt";
export const OPENAPI_PATH = "/openapi.json";
export const LLMS_PATH = "/llms.txt";
export { MCP_PATH } from "./ticks-mcp.js";
/** x402scan origin page for the live paid doors. /cma-ca98 is a live public SKU. */
export const X402SCAN_SERVER_URL =
  "https://www.x402scan.com/server/c6f584c5-e494-41d1-aa02-2efb07ac3546";
export const PRODUCT_ID = "idaho-hay-feeder-ticks";
export { PRODUCT_PUBLIC_ID, SAMPLE_PATH } from "./shop-sample.js";
export const PRODUCT_NAME = "USDA farm market prices";
export const PRODUCT_VERSION = "1.5.0";

function bundledX402listPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/x402list.txt"),
    join(here, "fixtures/x402list.txt"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

const X402LIST_BODY = readFileSync(bundledX402listPath(), "utf8");

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
  "ams_2998",
  "ams-2998",
  "ams_2993",
  "ams-2993",
  "ams_2995",
  "ams-2995",
  "ams_1598",
  "ams-1598",
  "ams_1045",
  "ams-1045",
  "ams_1048",
  "ams-1048",
  "ams_1051",
  "ams-1051",
  "ams_1052",
  "ams-1052",
  "ams_1100",
  "ams-1100",
  "ams_1101",
  "ams-1101",
  "ams_1102",
  "ams-1102",
  "ams_2997",
  "ams-2997",
  "ams_2872",
  "ams-2872",
  "ams_2810",
  "ams-2810",
  "ams_3802",
  "ams-3802",
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
  "dairy.ams_",
  "hogs.ams_",
  "produce.ams_",
  "fiber.ams_",
  "ibc.id.grain.",
  "ams.2914.",
];

export const TICKS_SOURCE_NAMES = [
  "Twin Falls",
  "Blackfoot",
  "AMS_3056 hay",
  "AMS_3059 NW Direct",
  "IF_FV130 onions/potatoes",
  "IBC Idaho elevator grain",
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
  "AMS_3652 Arthur hay auction",
  "AMS_2245 Dakota hay auction",
  "AMS_2246 Pipestone hay auction",
  "AMS_1716 Wolgemuth hay auction",
  "AMS_1650 Topeka hay auction",
  "AMS_2132 Toppenish cattle auction",
  "AMS_1778 Montana weekly cattle auction",
  "AMS_2039 Utah weekly cattle auction",
  "AMS_2106 Wyoming weekly cattle auction",
  "AMS_2998 Dairy Market News weekly",
  "AMS_2993 NDPSR",
  "AMS_2995 grocery dairy ads",
  "AMS_1598 Dry products",
  "AMS_1048 NDM West",
  "AMS_1045 Dry whey Central",
  "AMS_1051 Casein",
  "AMS_1052 Lactose",
  "AMS_1102 Fluid milk West",
  "AMS_2997 Organic dairy",
  "AMS_2872 National hog/pork summary",
  "AMS_2810 feeder pigs",
  "AMS_3802 National organic grain",
  "AMS_2314 New York terminal fruit",
  "AMS_2306 Los Angeles terminal fruit",
  "AMS_2290 Chicago terminal fruit",
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
  composites?: OfficialComposite[];
};

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export type DoorSku = "ticks" | "import-alerts" | "mariners" | "mariners-d11" | "mariners-d7" | "mariners-d8" | "warning-letters" | "untitled-letters" | "awa" | "swisspar" | "pcac" | "ftc-wl" | "cfpb-orders" | "occ-cd" | "fdic-orders" | "frb-orders" | "ncua-orders" | "fincen-orders" | "ferc-orders" | "ofac-orders" | "bis-orders" | "cftc-orders" | "fifra-orders" | "denovo-orders" | "ttb-oic" | "air-letters" | "superfund-rods" | "ico-mpn" | "cma-ca98" | "ema-referrals" | "cder-reviews" | "npdes-permits" | "ofsted-inspections" | "ofwat-enforcement" | "ofgem-enforcement" | "gain" | "orr-enforcement" | "phmsa-orders" | "aaib-reports" | "csb-reports" | "hhs-oig-reports" | "eis-reports" | "fsis-humane" | "epa-cafo" | "form-483" | "gmp" | "gmp-md";
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
  "ema-referrals",
  "cder-reviews",
  "npdes-permits",
  "ofsted-inspections",
  "ofwat-enforcement",
  "ofgem-enforcement",
  "gain",
  "orr-enforcement",
  "phmsa-orders",
  "aaib-reports",
  "csb-reports",
  "hhs-oig-reports",
  "eis-reports",
  "fsis-humane",
  "epa-cafo",
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

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "twenty-one", "twenty-two", "twenty-three", "twenty-four", "twenty-five", "twenty-six", "twenty-seven", "twenty-eight", "twenty-nine", "thirty", "thirty-one", "thirty-two", "thirty-three", "thirty-four", "thirty-five", "thirty-six", "thirty-seven", "thirty-eight", "thirty-nine", "forty", "forty-one", "forty-two", "forty-three", "forty-four", "forty-five", "forty-six", "forty-seven", "forty-eight"] as const;
const NEXT_SKU_WORDS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
  "thirteenth",
  "fourteenth",
  "fifteenth",
  "sixteenth",
  "seventeenth",
  "eighteenth",
  "nineteenth",
  "twentieth",
  "twenty-first",
  "twenty-second",
  "twenty-third",
  "twenty-fourth",
  "twenty-fifth",
  "twenty-sixth",
  "twenty-seventh",
  "twenty-eighth",
  "twenty-ninth",
  "thirtieth",
  "thirty-first",
  "thirty-second",
  "thirty-third",
  "thirty-fourth",
  "thirty-fifth",
  "thirty-sixth",
  "thirty-seventh",
  "thirty-eighth",
  "thirty-ninth",
  "fortieth",
  "forty-first",
  "forty-second",
  "forty-third",
  "forty-fourth",
  "forty-fifth",
  "forty-sixth",
  "forty-seventh",
  "forty-eighth",
  "forty-ninth",
] as const;

export function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

function paidCountWord(): string {
  return countWord(publicBazaarSkus().length);
}

function noNextSkuWord(): string {
  const n = publicBazaarSkus().length;
  const next = NEXT_SKU_WORDS[n] ?? `${n + 1}th`;
  return `Live public SKU count is well-known. No ${next} public SKU.`;
}

function amountAtomicFor(sku: DoorSku): string {
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
  if (sku === "ema-referrals") {
    const raw = env("EMA_REFERRALS_USDC_ATOMIC");
    return raw.length > 0 ? raw : EMA_REFERRALS_AMOUNT_ATOMIC;
  }
  if (sku === "cder-reviews") {
    const raw = env("CDER_REVIEWS_USDC_ATOMIC");
    return raw.length > 0 ? raw : CDER_REVIEWS_AMOUNT_ATOMIC;
  }
  if (sku === "npdes-permits") {
    const raw = env("NPDES_PERMITS_USDC_ATOMIC");
    return raw.length > 0 ? raw : NPDES_PERMITS_AMOUNT_ATOMIC;
  }
  if (sku === "ofsted-inspections") {
    const raw = env("OFSTED_INSPECTIONS_USDC_ATOMIC");
    return raw.length > 0 ? raw : OFSTED_INSPECTIONS_AMOUNT_ATOMIC;
  }
  if (sku === "ofwat-enforcement") {
    const raw = env("OFWAT_ENFORCEMENT_USDC_ATOMIC");
    return raw.length > 0 ? raw : OFWAT_ENFORCEMENT_AMOUNT_ATOMIC;
  }
  if (sku === "ofgem-enforcement") {
    const raw = env("OFGEM_ENFORCEMENT_USDC_ATOMIC");
    return raw.length > 0 ? raw : OFGEM_ENFORCEMENT_AMOUNT_ATOMIC;
  }
  if (sku === "gain") {
    const raw = env("GAIN_USDC_ATOMIC");
    return raw.length > 0 ? raw : GAIN_AMOUNT_ATOMIC;
  }
  if (sku === "orr-enforcement") {
    const raw = env("ORR_ENFORCEMENT_USDC_ATOMIC");
    return raw.length > 0 ? raw : ORR_ENFORCEMENT_AMOUNT_ATOMIC;
  }
  if (sku === "phmsa-orders") {
    const raw = env("PHMSA_ORDERS_USDC_ATOMIC");
    return raw.length > 0 ? raw : PHMSA_ORDERS_AMOUNT_ATOMIC;
  }
  if (sku === "aaib-reports") {
    const raw = env("AAIB_REPORTS_USDC_ATOMIC");
    return raw.length > 0 ? raw : AAIB_REPORTS_AMOUNT_ATOMIC;
  }
  if (sku === "csb-reports") {
    const raw = env("CSB_REPORTS_USDC_ATOMIC");
    return raw.length > 0 ? raw : CSB_REPORTS_AMOUNT_ATOMIC;
  }
  if (sku === "hhs-oig-reports") {
    const raw = env("HHS_OIG_REPORTS_USDC_ATOMIC");
    return raw.length > 0 ? raw : HHS_OIG_REPORTS_AMOUNT_ATOMIC;
  }
  if (sku === "eis-reports") {
    const raw = env("EIS_REPORTS_USDC_ATOMIC");
    return raw.length > 0 ? raw : EIS_REPORTS_AMOUNT_ATOMIC;
  }
  if (sku === "fsis-humane") {
    const raw = env("FSIS_HUMANE_USDC_ATOMIC");
    return raw.length > 0 ? raw : FSIS_HUMANE_AMOUNT_ATOMIC;
  }
  if (sku === "epa-cafo") {
    const raw = env("EPA_CAFO_USDC_ATOMIC");
    return raw.length > 0 ? raw : EPA_CAFO_AMOUNT_ATOMIC;
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

const PAID_BODY_N = paidBodyWindow();
const PAID_WINDOW_COPY = `GET ?id= one official text ($0.02). Newest chunk on a plain GET (${newestOfficialTextsCopy(PAID_BODY_N)}, $0.05); older page ?before= another $0.05. ${newerSinceCopy()}.`;
/** Shop-wide discovery. Free index/search, then pay one text or the page. Never “entire current cache”. */
const BODY_PAGE_DISCOVERY =
  `Extracted-body doors: free index/search on /{door}/manifest.json or /{door}/index (?q=, optional before/date), then pay ${oneOfficialTextCopy()} or the page ($0.05). ${newestOfficialTextsCopy(PAID_BODY_N)} on a plain GET ($0.05), or the whole current set if fewer; older pages on the same URL (?before, another $0.05). Poll newer with ?since=<ISO timestamp or official catalog id> ($0.05; empty new set is HTTP 304 or paid recordCount 0). Table doors (/ticks, /import-alerts) stay the whole current table; If-None-Match / ETag (or ?since=) avoids re-buying an unchanged snapshot. ${COLLECT_CADENCE} ${HTTP_429_COPY}`;

const CANONICAL_ORIGIN = "https://ticks.bnm.farm";
const CDP_DESCRIPTION_MAX = 500;
const TABLE_ENTIRE_COPY = "$0.05 = entire current table.";
const IMPORT_ALERTS_FIRM_CHECK_COPY =
  `Free firm search across 483, warning letters, untitled letters, FTC/Ofwat/Ofgem/CFPB/OCC/FDIC, and this table: GET ${CANONICAL_ORIGIN}/firm-check?q=`;

function extractedBodyFreeSearchCopy(door: string): string {
  return `Free search: GET ${CANONICAL_ORIGIN}/${door}/manifest.json?q= (HTTP 200) returns id and the ?id= URL. Then pay GET ?id= ($0.02) or the page ($0.05).`;
}

/** First product sentence only. Drops leak-test “not this / not that.” */
function sku402Product(sku: DoorSku): string {
  const text = SKU_COPY[sku].description.replace(PAID_WINDOW_COPY, "").trim();
  for (const sentence of text.split(/(?<=\.)\s+/)) {
    const t = sentence.trim();
    if (!t) continue;
    if (/^Not\b/i.test(t) || /^Does not\b/i.test(t)) continue;
    if (/\bdoes not invent\b/i.test(t) || /\bdoes not sell\b/i.test(t) || /\bdoes not wrap\b/i.test(t)) continue;
    return t;
  }
  return text;
}

function clamp402Description(text: string, mustKeep: string): string {
  if (text.length <= CDP_DESCRIPTION_MAX) return text;
  const suffix = mustKeep.startsWith(" ") ? mustKeep : ` ${mustKeep}`;
  const budget = CDP_DESCRIPTION_MAX - suffix.length;
  if (budget < 1) return suffix.trim().slice(0, CDP_DESCRIPTION_MAX);
  return `${text.slice(0, Math.max(0, text.length - suffix.length)).slice(0, budget).trim()}${suffix}`;
}

/** 402 accepts[].description — product + bag + price + where free search is. OpenAPI keeps SKU_COPY. */
function isPdfCacheSku(sku: DoorSku): boolean {
  return sku === "csb-reports" || sku === "hhs-oig-reports";
}

function skuMimeType(sku: DoorSku): string {
  return isPdfCacheSku(sku) ? "application/pdf" : "application/json";
}

export function sku402Description(sku: DoorSku): string {
  if (isPdfCacheSku(sku)) {
    const extra = `$0.05 one official PDF. Free search: GET ${CANONICAL_ORIGIN}/${sku}/manifest.json?q= (HTTP 200).`;
    return clamp402Description(`${sku402Product(sku)} ${extra}`, extra);
  }
  if (isExtractedBodySku(sku)) {
    const free = extractedBodyFreeSearchCopy(sku);
    return clamp402Description(`${sku402Product(sku)} ${PAID_WINDOW_COPY} ${free}`, free);
  }
  if (sku === "import-alerts") {
    const extra = `${TABLE_ENTIRE_COPY} ${IMPORT_ALERTS_FIRM_CHECK_COPY}`;
    return clamp402Description(`${sku402Product(sku)} ${extra}`, extra);
  }
  if (sku === "ticks") {
    return clamp402Description(`${sku402Product(sku)} ${TABLE_ENTIRE_COPY}`, TABLE_ENTIRE_COPY);
  }
  return SKU_COPY[sku].description;
}

function isTableSku(sku: DoorSku): boolean {
  return sku === "ticks" || sku === "import-alerts";
}

function isMarinersSku(sku: DoorSku): boolean {
  return sku === "mariners" || sku === "mariners-d11" || sku === "mariners-d7" || sku === "mariners-d8";
}

/**
 * 402 accepts[].extra — keep EIP-712 USDC name/version, then bag-size / how-to-buy.
 * Bazaar stays on extensions.bazaar, not here.
 */
export function paymentExtra(sku: DoorSku): Record<string, unknown> {
  const extra: Record<string, unknown> = {
    name: "USD Coin",
    version: "2",
    searchUrl: isExtractedBodySku(sku) ? `${CANONICAL_ORIGIN}/${sku}/manifest.json?q=` : null,
    pagePriceAtomic: Number(PAGE_AMOUNT_ATOMIC),
    firmCheckUrl: `${CANONICAL_ORIGIN}${FIRM_CHECK_PATH}`,
    sampleUrl: `${CANONICAL_ORIGIN}${SAMPLE_PATH}`,
  };
  if (isTableSku(sku)) {
    extra.tableWhole = true;
    return extra;
  }
  if (isExtractedBodySku(sku)) {
    extra.oneDocPath = `/${sku}?id=`;
    extra.priceAtomic = Number(SINGLE_DOC_AMOUNT_ATOMIC);
    extra.pageDefault = paidBodyWindow();
    extra.wholeSetIfFewer = true;
    return extra;
  }
  if (isPdfCacheSku(sku)) {
    extra.searchUrl = `${CANONICAL_ORIGIN}/${sku}/manifest.json?q=`;
    extra.oneDocPath = `/${sku}?id=`;
    extra.priceAtomic = Number(amountAtomicFor(sku));
    extra.pageDefault = 1;
    extra.pdf = true;
    return extra;
  }
  if (isMarinersSku(sku)) extra.wholeSetIfFewer = true;
  return extra;
}

const SKU_COPY: Record<DoorSku, { description: string; resourcePath: string }> = {
  ticks: {
    description:
      "Call GET /ticks when you need the current official USDA farm market prices (hay, cattle, grain, dairy, hogs, produce). USDA AMS nationwide prints plus a few Idaho/PNW barn examples inside the same table — not the SKU. Not forecasts, not private barn deals, not water. JSON ticks plus stored history points; days between reports are not filled in. Paid JSON keeps the old keys and adds records[] (id, date, firm, url, type) plus asOf for diffs.",
    resourcePath: TICKS_PATH,
  },
  "import-alerts": {
    description:
      "Call GET /import-alerts when you need the current FDA Import Alert / DWPE red and green firm-product snapshot from official cms_ia HTML. First-slice alert pages only. Does not wrap openFDA. Paid JSON keeps ticks[] and adds records[] (id, date, firm, url, type) plus asOf for diffs.",
    resourcePath: IMPORT_ALERTS_PATH,
  },
  mariners: {
    description:
      "Call GET /mariners when you need the latest USCG District 13 / Northwest Local Notice to Mariners as structured JSON from the official weekly PDF. Returns week, section, text, and source URL. Does not invent notices. Paid JSON keeps notices[] and adds records[] (id, date, firm, url, type) plus asOf for diffs.",
    resourcePath: MARINERS_PATH,
  },
  "mariners-d11": {
    description:
      "Call GET /mariners-d11 when you need the latest USCG District 11 / Southwest (northern) Local Notice to Mariners as structured JSON from the official weekly PDF. Same NavCEN walker as /mariners. Returns week, section, text, and source URL. Does not invent notices. Paid JSON keeps notices[] and adds records[] (id, date, firm, url, type) plus asOf for diffs.",
    resourcePath: MARINERS_D11_PATH,
  },
  "mariners-d7": {
    description:
      "Call GET /mariners-d7 when you need the latest USCG District 7 / Southeast Local Notice to Mariners as structured JSON from the official weekly PDF. Same NavCEN walker as /mariners. Returns week, section, text, and source URL. Does not invent notices. Paid JSON keeps notices[] and adds records[] (id, date, firm, url, type) plus asOf for diffs.",
    resourcePath: MARINERS_D7_PATH,
  },
  "mariners-d8": {
    description:
      "Call GET /mariners-d8 when you need the latest USCG District 8 / Gulf (New Orleans) Local Notice to Mariners as structured JSON from the official weekly PDF. Same NavCEN walker as /mariners. Returns week, section, text, and source URL. Does not invent notices. Paid JSON keeps notices[] and adds records[] (id, date, firm, url, type) plus asOf for diffs.",
    resourcePath: MARINERS_D8_PATH,
  },
  "warning-letters": {
    description:
      "Call GET /warning-letters when you need official FDA warning-letter bodies (firm, date, subject, full letter text) parsed from fda.gov HTML. Not the import-alerts IA feed. Does not invent letter text. " + PAID_WINDOW_COPY,
    resourcePath: WARNING_LETTERS_PATH,
  },
  "untitled-letters": {
    description:
      "Call GET /untitled-letters when you need official FDA Untitled Letter text (CDER OPDP + CBER APLB promo) extracted from per-letter PDFs at /media/{id}/download. Not /warning-letters HTML. Not the HTML index. Does not invent letter text. " + PAID_WINDOW_COPY,
    resourcePath: UNTITLED_LETTERS_PATH,
  },
  awa: {
    description:
      "Call GET /awa when you need official USDA APHIS Animal Welfare Act inspection-report observation/narrative text extracted from per-report PDFs on the Public Search Tool. Not the Salesforce metadata index. Not Data Liberation. Not /form-483. Not CMS 2567. Not CQC. " + PAID_WINDOW_COPY,
    resourcePath: AWA_PATH,
  },
  swisspar: {
    description:
      "Call GET /swisspar when you need official Swissmedic first-authorisation SwissPAR evaluation text extracted from per-product PDFs. Not the A–Z HTML index. Not EMA EPARs/referrals. Not FDA CDER reviews. Not the HCP/FI appendix. " + PAID_WINDOW_COPY,
    resourcePath: SWISSPAR_PATH,
  },
  pcac: {
    description:
      "Call GET /pcac when you need official FDA-authored PCAC 503A briefing-memo evaluation text extracted from per-substance PDFs. Not the FR notice or docket 0001. Not CDER multidisciplinary reviews. Not combined sponsor/AdComm packs. " + PAID_WINDOW_COPY,
    resourcePath: PCAC_PATH,
  },
  "ftc-wl": {
    description:
      "Call GET /ftc-wl when you need official FTC Bureau of Consumer Protection warning-letter text extracted from per-letter PDFs on ftc.gov. Not the legal-library index. Not the Drupal node. Not FDA /warning-letters. Not official templates. " + PAID_WINDOW_COPY,
    resourcePath: FTC_WL_PATH,
  },
  "cfpb-orders": {
    description:
      "Call GET /cfpb-orders when you need official CFPB-authored consent-order / administrative-order text extracted from per-order PDFs on files.consumerfinance.gov. Not the enforcement index. Not the action-page teaser. Not the Consumer Complaint Database. Not FTC /ftc-wl. " + PAID_WINDOW_COPY,
    resourcePath: CFPB_ORDERS_PATH,
  },
  "occ-cd": {
    description:
      "Call GET /occ-cd when you need official OCC institution Cease-and-Desist / Consent Order text extracted from per-order PDFs on occ.gov/static/enforcement-actions. Not EASearch ExportToJSON metadata. Not CFPB /cfpb-orders. Not FTC /ftc-wl. " + PAID_WINDOW_COPY,
    resourcePath: OCC_CD_PATH,
  },
  "fdic-orders": {
    description:
      "Call GET /fdic-orders when you need official FDIC institution consent-order / Cease-and-Desist text extracted from per-order PDFs on orders.fdic.gov. Not the EDOS Salesforce index. Not BankFind. Not monthly NR counts. Not EDGAR 8-K. Not Federal Register raw_text. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl. " + PAID_WINDOW_COPY,
    resourcePath: FDIC_ORDERS_PATH,
  },
  "frb-orders": {
    description:
      "Call GET /frb-orders when you need official FRB institution Cease-and-Desist / written-agreement / PCA text extracted from per-order PDFs on federalreserve.gov. Not the official enforcement CSV. Not ea-old.json / ea-cms-recent.json / ne-press.json teasers. Not BankFind. Not EDGAR 8-K. Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl. " + PAID_WINDOW_COPY,
    resourcePath: FRB_ORDERS_PATH,
  },
  "ncua-orders": {
    description:
      "Call GET /ncua-orders when you need official NCUA institution consent Cease-and-Desist text extracted from per-order HTML on ncua.gov. Not the official CSV. Not late-filer CMP. Not LUAs. Not FRB /frb-orders. Not FDIC /fdic-orders. Not OCC /occ-cd. " + PAID_WINDOW_COPY,
    resourcePath: NCUA_ORDERS_PATH,
  },
  "fincen-orders": {
    description:
      "Call GET /fincen-orders when you need official FinCEN institution consent-order text extracted from per-order PDFs on fincen.gov. Not the enforcement-actions index teaser. Not a news-release wrap. " + PAID_WINDOW_COPY,
    resourcePath: FINCEN_ORDERS_PATH,
  },
  "ferc-orders": {
    description:
      "Call GET /ferc-orders when you need official FERC institution stipulation-and-consent / show-cause / civil-penalty text extracted from per-order PDFs on cms.ferc.gov. Not the civil-penalty index teaser. Not eLibrary metadata. " + PAID_WINDOW_COPY,
    resourcePath: FERC_ORDERS_PATH,
  },
  "ofac-orders": {
    description:
      "Call GET /ofac-orders when you need official OFAC institution/company enforcement-release text extracted from per-release PDFs on ofac.treasury.gov. Not the civil-penalties chart/teaser/RSS. " + PAID_WINDOW_COPY,
    resourcePath: OFAC_ORDERS_PATH,
  },
  "bis-orders": {
    description:
      "Call GET /bis-orders when you need official BIS institution/company charging-letter / order / settlement text extracted from per-order PDFs on bis.gov. Does not invent order text. " + PAID_WINDOW_COPY,
    resourcePath: BIS_ORDERS_PATH,
  },
  "cftc-orders": {
    description:
      "Call GET /cftc-orders when you need official CFTC institution/company enforcement-order / settlement text extracted from per-order PDFs on cftc.gov. Does not invent order text. " + PAID_WINDOW_COPY,
    resourcePath: CFTC_ORDERS_PATH,
  },
  "fifra-orders": {
    description:
      "Call GET /fifra-orders when you need official EPA FIFRA institution/company order / consent text extracted from per-order PDFs on yosemite.epa.gov. Does not invent order text. " + PAID_WINDOW_COPY,
    resourcePath: FIFRA_ORDERS_PATH,
  },
  "denovo-orders": {
    description:
      "Call GET /denovo-orders when you need official FDA De Novo classification-order text extracted from per-order PDFs on accessdata.fda.gov. Does not invent order text. " + PAID_WINDOW_COPY,
    resourcePath: DENOVO_ORDERS_PATH,
  },
  "ttb-oic": {
    description:
      "Call GET /ttb-oic when you need official TTB Offer in Compromise text extracted from Abstract and Statement PDFs on ttb.gov. Does not invent order text. " + PAID_WINDOW_COPY,
    resourcePath: TTB_OIC_PATH,
  },
  "air-letters": {
    description:
      "Call GET /air-letters when you need official USDA APHIS Am I Regulated (AIR) confirmation-letter text extracted from per-letter PDFs on direct.aphis.usda.gov. Does not invent letter text. " + PAID_WINDOW_COPY,
    resourcePath: AIR_LETTERS_PATH,
  },
  "superfund-rods": {
    description:
      "Call GET /superfund-rods when you need official EPA Superfund Record of Decision text extracted from SEMS PDFs on semspub.epa.gov. Not a Proposed Plan or fact sheet. " + PAID_WINDOW_COPY,
    resourcePath: SUPERFUND_RODS_PATH,
  },
  "ico-mpn": {
    description:
      "Call GET /ico-mpn when you need official UK ICO Monetary Penalty Notice text extracted from per-notice PDFs on ico.org.uk. Does not invent notice text. " + PAID_WINDOW_COPY,
    resourcePath: ICO_MPN_PATH,
  },
  "cma-ca98": {
    description:
      "Call GET /cma-ca98 when you need official UK CMA CA98 infringement-decision text extracted from assets.publishing.service.gov.uk PDFs. Crown/OGL v3.0; logo reserved. " + PAID_WINDOW_COPY,
    resourcePath: CMA_CA98_PATH,
  },
  "ema-referrals": {
    description:
      "Call GET /ema-referrals when you need official EMA human-medicine referral procedure text extracted from ema.europa.eu English /en/documents/referral/ PDFs. Human medicines only. Does not invent procedure text. " +
      PAID_WINDOW_COPY,
    resourcePath: EMA_REFERRALS_PATH,
  },
  "cder-reviews": {
    description:
      "Call GET /cder-reviews when you need official FDA CDER drug-approval Integrated Review text extracted from accessdata.fda.gov Drugs@FDA PDFs. Official public US federal documents. Does not invent review text. Does not sell the free TOC / openFDA index. " +
      PAID_WINDOW_COPY,
    resourcePath: CDER_REVIEWS_PATH,
  },
  "npdes-permits": {
    description:
      "Call GET /npdes-permits when you need official EPA-issued individual NPDES permit text extracted from epa.gov PDFs. Official public US federal documents. EPA-issued individual permits only. Does not invent permit text. Does not sell the free Region 1 listing JSON or ECHO/ICIS metadata. Not Superfund RODs. Not state Water Boards ACL orders. Not general permits. " +
      PAID_WINDOW_COPY,
    resourcePath: NPDES_PERMITS_PATH,
  },
  "ofsted-inspections": {
    description:
      "Call GET /ofsted-inspections when you need official Ofsted school / provider inspection-report text extracted from files.ofsted.gov.uk PDFs. Official public UK documents under OGL v3.0. Keyed on report id / URN / provider, not inspector or pupil names. Does not invent report text. Does not sell the free reports.ofsted.gov.uk HTML index or grades-only report-card banner. " +
      PAID_WINDOW_COPY,
    resourcePath: OFSTED_INSPECTIONS_PATH,
  },
  "ofwat-enforcement": {
    description:
      "Call GET /ofwat-enforcement when you need official Ofwat Water Industry Act 1991 enforcement-notice / final-decision / section 19 undertakings text extracted from ofwat.gov.uk/wp-content/uploads/ PDFs. Official public UK documents under OGL v3.0. Company/undertaker files only. Does not invent notice text. Does not sell the HTML investigations card (index + teaser only) or Ofwat open-data / performance CSVs. Not people files. Not CMA / ICO / Ofsted / HSE. " +
      PAID_WINDOW_COPY,
    resourcePath: OFWAT_ENFORCEMENT_PATH,
  },
  "ofgem-enforcement": {
    description:
      "Call GET /ofgem-enforcement when you need official Ofgem-authored enforcement TEXT extracted from ofgem.gov.uk/sites/default/files/ PDFs (s.27A penalty proposals, confirmed/provisional orders, enforcement notices). Official public UK documents under Crown copyright / OGL. Company/licensee files only. Does not invent notice text. Does not sell the HTML publication card (index + teaser only), people files, RIIO/open-data CSVs, or the Ofgem logo. Not Ofwat / CMA / ICO / Ofsted. " +
      PAID_WINDOW_COPY,
    resourcePath: OFGEM_ENFORCEMENT_PATH,
  },
  gain: {
    description:
      "Call GET /gain when you need official USDA FAS GAIN attaché report TEXT extracted from gain.fas.usda.gov/Download.aspx or the matching no-auth DownloadReportByFileName PDF (Grain and Feed / Livestock / Poultry / Oilseeds). US federal public domain (17 U.S.C. § 105). Does not invent report text. Does not sell public search HTML. Does not wrap USDA commodity-table numbers. " +
      PAID_WINDOW_COPY,
    resourcePath: GAIN_PATH,
  },
  "orr-enforcement": {
    description:
      "Call GET /orr-enforcement when you need official ORR-authored Railways Act 1993 s.55 statutory-notice / final-order / investigation-report TEXT extracted from orr.gov.uk/sites/default/files/ and /media/{id}/download PDFs. Official public UK documents under Crown copyright / OGL v3.0. Company/licence-holder files only. Does not invent notice text. Does not sell the HTML investigation card (index + teaser only), people files, open-data CSVs, or GOV.UK correspondence HTML. Not Ofgem / Ofwat / Ofsted / RAIB / MAIB. Does not list EIS. " +
      PAID_WINDOW_COPY,
    resourcePath: ORR_ENFORCEMENT_PATH,
  },
  "phmsa-orders": {
    description:
      "Call GET /phmsa-orders when you need official PHMSA-authored pipeline enforcement TEXT extracted from primis.phmsa.dot.gov/enforcement-documents/{CPF}/ PDFs (NOPV PCP/PCO, Final Order, Corrective Action Order, Consent Order, Decision on Petition). US federal public domain (17 U.S.C. § 105). Does not invent order text. Does not sell the 53-column TSV. Skip operator-response PDFs. Distinct from killed PHMSA incident NARRATIVE zip and from /ferc-orders. " +
      PAID_WINDOW_COPY,
    resourcePath: PHMSA_ORDERS_PATH,
  },
  "aaib-reports": {
    description:
      "Call GET /aaib-reports when you need official UK AAIB investigation-report TEXT extracted from assets.publishing.service.gov.uk PDFs linked from GOV.UK /aaib-reports. OGL v3.0. Does not invent report text. GOV.UK Content API / Search are synopsis / title / link only — full TEXT is in the PDF. Skip glossary PDFs and the Annual Safety Review. Not RAIB. Distinct from /orr-enforcement. " +
      PAID_WINDOW_COPY,
    resourcePath: AAIB_REPORTS_PATH,
  },
  "csb-reports": {
    description:
      "Call GET /csb-reports when you need official US Chemical Safety Board final investigation report PDFs from csb.gov/assets. License 17 USC 105. $0.05 one official PDF. Same URL ?id= or ?before= is the next older official PDF for another $0.05.",
    resourcePath: CSB_REPORTS_PATH,
  },
  "hhs-oig-reports": {
    description:
      "Call GET /hhs-oig-reports when you need official HHS OIG-authored full Audit (OAS / A-*) and Evaluation / Inspection (OEI-*) report PDFs from oig.hhs.gov/documents/audit/ and oig.hhs.gov/documents/evaluation/. License 17 USC 105. $0.05 one official PDF. Same URL ?id= or ?before= is the next older official PDF for another $0.05.",
    resourcePath: HHS_OIG_REPORTS_PATH,
  },
  "eis-reports": {
    description:
      "Call GET /eis-reports when you need official EPA NEPA Environmental Impact Statement TEXT extracted from CDX e-NEPA (cdxapps.epa.gov) EIS document PDFs. License 17 USC 105. Does not invent EIS text. Search/details HTML is title / CEQ number / date / agency only — full TEXT is in the PDF. Skip EPA comment letters and Summary-for-the teasers. Distinct from Superfund RODs. " +
      PAID_WINDOW_COPY,
    resourcePath: EIS_REPORTS_PATH,
  },
  "fsis-humane": {
    description:
      "Call GET /fsis-humane when you need official USDA FSIS humane-handling enforcement letter TEXT extracted from fsis.usda.gov letter PDFs (NOS, NOIE, deferral, abeyance, reinstatement). License 17 USC 105. Does not invent letter text. Index HTML is establishment / type / date only — full TEXT is in the PDF. " +
      PAID_WINDOW_COPY,
    resourcePath: FSIS_HUMANE_PATH,
  },
  "epa-cafo": {
    description:
      "Call GET /epa-cafo when you need official EPA Part 22 Consent Agreement and Final Order (CAFO) / Expedited Settlement Agreement (ESA) administrative penalty letter TEXT extracted from yosemite.epa.gov and regional epa.gov PDFs. License 17 USC 105. Does not invent letter text. Index is institution / docket / date only — full TEXT is in the PDF. " +
      PAID_WINDOW_COPY,
    resourcePath: EPA_CAFO_PATH,
  },
  "form-483": {
    description:
      "Call GET /form-483 when you need official FDA Form 483 inspectional observation bodies parsed from posted OII FOIA Electronic Reading Room PDFs. Not warning letters. Not CMS 2567. Does not invent observation text. " + PAID_WINDOW_COPY,
    resourcePath: FORM_483_PATH,
  },
  gmp: {
    description:
      "Call GET /gmp when you need official Health Canada Drug GMP inspection report-card observation text plus C.02 cites from fullReportCard.ashx. Not the 21k-row public search index. Does not invent observations. " + PAID_WINDOW_COPY,
    resourcePath: GMP_PATH,
  },
  "gmp-md": {
    description:
      "Call GET /gmp-md when you need official Health Canada medical-device inspection report-card observation text plus MDR cites from md/handler/fullReportCard.ashx. Not the ratings-only search index. Not /gmp Drug GMP. Does not invent observations. " + PAID_WINDOW_COPY,
    resourcePath: GMP_MD_PATH,
  },
};

const BAZAAR_OUTPUT_EXAMPLE: Record<DoorSku, Record<string, unknown>> = {
  ticks: {
    ok: true,
    product: PRODUCT_PUBLIC_ID,
    status: "ok",
    fetchedAt: "2026-01-16T00:00:00Z",
    asOf: "2026-01-15",
    source: TICKS_PUBLIC_CACHE_SOURCE,
    recordCount: 1,
    records: [...SAMPLE_TABLE_SKU.records],
    ticks: [...SAMPLE_TABLE_SKU.ticks],
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
    source: "https://www.cftc.gov/LawRegulation/EnforcementActions/index.htm",
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
  "ema-referrals": {
    ok: true,
    product: "ema-referral-procedure-bodies",
    status: "ok",
    fetchedAt: "2026-08-25T12:00:00.000Z",
    asOf: "2026-08-04",
    source: "https://www.ema.europa.eu/en/documents/report/referrals-output-json-report_en.json",
    recordCount: 1,
    records: [
      {
        id: "tavneos",
        date: "2026-08-13",
        firm: "Tavneos",
        url: "https://www.ema.europa.eu/en/documents/referral/tavneos-article-20-procedure-assessment-report_en.pdf",
        type: "ema-referrals",
      },
    ],
    cards: [
      {
        id: "tavneos",
        name: "Tavneos",
        date: "2026-08-13",
        sourceUrl: "https://www.ema.europa.eu/en/documents/referral/tavneos-article-20-procedure-assessment-report_en.pdf",
        body: "European Medicines Agency\nArticle 20 referral\nCHMP assessment report\nbenefit-risk of the marketing authorisation",
      },
    ],
  },
  "cder-reviews": {
    ok: true,
    product: "fda-cder-integrated-review-bodies",
    status: "ok",
    fetchedAt: "2026-08-25T12:00:00.000Z",
    asOf: "2024-03-14",
    source: "https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm",
    recordCount: 1,
    records: [
      {
        id: "rezdiffra",
        date: "2024-03-14",
        firm: "Rezdiffra",
        url: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217785Orig1s000IntegratedR.pdf",
        type: "cder-reviews",
      },
    ],
    cards: [
      {
        id: "rezdiffra",
        name: "Rezdiffra",
        date: "2024-03-14",
        sourceUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/217785Orig1s000IntegratedR.pdf",
        body: "CENTER FOR DRUG EVALUATION AND RESEARCH\nINTEGRATED REVIEW\nNDA 217785\nREZDIFFRA\nBenefit-Risk Assessment",
      },
    ],
  },
  "npdes-permits": {
    ok: true,
    product: "epa-npdes-individual-permit-bodies",
    status: "ok",
    fetchedAt: "2026-08-26T12:00:00.000Z",
    asOf: "2026-07-20",
    source: "https://www.epa.gov/npdes-permits",
    recordCount: 1,
    records: [
      {
        id: "example-permit",
        date: "2026-01-01",
        firm: "Example wastewater treatment plant",
        url: "https://www.epa.gov/system/files/documents/2026-01/example-individual-permit.pdf",
        type: "npdes-permits",
      },
    ],
    cards: [
      {
        id: "example-permit",
        name: "Example wastewater treatment plant",
        date: "2026-01-01",
        sourceUrl: "https://www.epa.gov/system/files/documents/2026-01/example-individual-permit.pdf",
        body: "This teaser is not an official permit body. Example wastewater treatment plant individual NPDES authorization excerpt.",
      },
    ],
  },
  "ofsted-inspections": {
    ok: true,
    product: "ofsted-inspection-report-bodies",
    status: "ok",
    fetchedAt: "2026-08-26T12:00:00.000Z",
    asOf: "2025-05-06",
    source: "https://reports.ofsted.gov.uk/",
    recordCount: 1,
    records: [
      {
        id: "example-report",
        date: "2025-05-06",
        firm: "Example primary school",
        url: "https://files.ofsted.gov.uk/v1/file/00000000",
        type: "ofsted-inspections",
      },
    ],
    cards: [
      {
        id: "example-report",
        urn: "000000",
        provider: "Example primary school",
        date: "2025-05-06",
        sourceUrl: "https://files.ofsted.gov.uk/v1/file/00000000",
        body: "This teaser is not an official inspection body. Example primary school inspection excerpt.",
      },
    ],
  },
  "ofwat-enforcement": {
    ok: true,
    product: "ofwat-wia91-enforcement-bodies",
    status: "ok",
    fetchedAt: "2026-08-27T12:00:00.000Z",
    asOf: "2026-03-01",
    source: "https://www.ofwat.gov.uk/regulated-companies/investigations/",
    recordCount: 1,
    records: [
      {
        id: "example-enforcement-notice",
        date: "2026-03-01",
        firm: "Example Water Limited",
        url: "https://www.ofwat.gov.uk/wp-content/uploads/2026/03/example-enforcement-notice.pdf",
        type: "ofwat-enforcement",
      },
    ],
    cards: [
      {
        id: "example-enforcement-notice",
        institution: "Example Water Limited",
        docket: "example-enforcement-notice",
        date: "2026-03-01",
        sourceUrl: "https://www.ofwat.gov.uk/wp-content/uploads/2026/03/example-enforcement-notice.pdf",
        body: "This teaser is not an official enforcement body. Example Water Limited Water Industry Act 1991 enforcement-notice excerpt.",
      },
    ],
  },
  "ofgem-enforcement": {
    ok: true,
    product: "ofgem-enforcement-bodies",
    status: "ok",
    fetchedAt: "2026-08-27T12:00:00.000Z",
    asOf: "2026-06-03",
    source: "https://www.ofgem.gov.uk/energy-regulation/how-we-regulate/compliance-and-enforcement",
    recordCount: 1,
    records: [
      {
        id: "example-enforcement-notice",
        date: "2026-06-03",
        firm: "Example Energy Limited",
        url: "https://www.ofgem.gov.uk/sites/default/files/2026-06/example-enforcement-notice.pdf",
        type: "ofgem-enforcement",
      },
    ],
    cards: [
      {
        id: "example-enforcement-notice",
        institution: "Example Energy Limited",
        docket: "example-enforcement-notice",
        date: "2026-06-03",
        sourceUrl: "https://www.ofgem.gov.uk/sites/default/files/2026-06/example-enforcement-notice.pdf",
        body: "This teaser is not an official enforcement body. Example Energy Limited Electricity Act 1989 enforcement-notice excerpt.",
      },
    ],
  },
  gain: {
    ok: true,
    product: "gain-attache-report-bodies",
    status: "ok",
    fetchedAt: "2026-08-27T21:37:10.176Z",
    asOf: "2026-08-24",
    source: "https://gain.fas.usda.gov/",
    recordCount: 1,
    records: [
      {
        id: "MX2026-0040",
        date: "2026-08-24",
        firm: "Mexico",
        url: "https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Livestock%20and%20Products%20Annual_Mexico%20City_Mexico_MX2026-0040.pdf",
        type: "gain",
      },
    ],
    cards: [
      {
        id: "MX2026-0040",
        reportNumber: "MX2026-0040",
        country: "Mexico",
        post: "Mexico City",
        date: "2026-08-24",
        category: "Livestock and Products",
        sourceUrl: "https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Livestock%20and%20Products%20Annual_Mexico%20City_Mexico_MX2026-0040.pdf",
        body: "This teaser is not an official attaché body. USDA FAS GAIN MX2026-0040 excerpt.",
      },
    ],
  },
  "orr-enforcement": {
    ok: true,
    product: "orr-enforcement-bodies",
    status: "ok",
    fetchedAt: "2026-08-27T22:45:00.000Z",
    asOf: "2026-03-03",
    source: "https://www.orr.gov.uk/monitoring-regulation/rail/investigations",
    recordCount: 1,
    records: [
      {
        id: "orr-to-northern-trains-limited-statutory-notice-dated-3-march-2026",
        date: "2026-03-03",
        firm: "Northern Trains Limited",
        url: "https://www.orr.gov.uk/sites/default/files/2026-03/orr-to-northern-trains-limited-statutory-notice-dated-3-march-2026.pdf",
        type: "orr-enforcement",
      },
    ],
    cards: [
      {
        id: "orr-to-northern-trains-limited-statutory-notice-dated-3-march-2026",
        institution: "Northern Trains Limited",
        docket: "orr-to-northern-trains-limited-statutory-notice-dated-3-march-2026",
        date: "2026-03-03",
        sourceUrl: "https://www.orr.gov.uk/sites/default/files/2026-03/orr-to-northern-trains-limited-statutory-notice-dated-3-march-2026.pdf",
        body: "This teaser is not an official enforcement body. Northern Trains Limited Railways Act 1993 s.55 statutory-notice excerpt.",
      },
    ],
  },
  "phmsa-orders": {
    ok: true,
    product: "phmsa-enforcement-order-bodies",
    status: "ok",
    fetchedAt: "2026-08-31T22:00:00.000Z",
    asOf: "2026-08-03",
    source: "https://primis.phmsa.dot.gov/enforcement-documents/",
    recordCount: 1,
    records: [
      {
        id: "32026023CAO-corrective-action-order",
        date: "2026-08-03",
        firm: "AMOCO OIL CO",
        url: "https://primis.phmsa.dot.gov/enforcement-documents/32026023CAO/32026023CAO_Corrective%20Action%20Order_08032026_(26-379109).pdf",
        type: "phmsa-orders",
      },
    ],
    cards: [
      {
        id: "32026023CAO-corrective-action-order",
        institution: "AMOCO OIL CO",
        cpf: "32026023CAO",
        date: "2026-08-03",
        sourceUrl: "https://primis.phmsa.dot.gov/enforcement-documents/32026023CAO/32026023CAO_Corrective%20Action%20Order_08032026_(26-379109).pdf",
        body: "This teaser is not an official PHMSA order body. Amoco Oil Co Corrective Action Order excerpt.",
      },
    ],
  },
  "aaib-reports": {
    ok: true,
    product: "aaib-investigation-report-bodies",
    status: "ok",
    fetchedAt: "2026-08-31T22:00:00.000Z",
    asOf: "2026-08-20",
    source: "https://www.gov.uk/aaib-reports",
    recordCount: 1,
    records: [
      {
        id: "aaib-investigation-to-eurofox-2k-g-cmax",
        date: "2026-08-20",
        firm: "Eurofox 2K G-CMAX",
        url: "https://assets.publishing.service.gov.uk/media/6a730cd0de77e2943cd3bbe8/Eurofox_2K_G-CMAX_09-26.pdf",
        type: "aaib-reports",
      },
    ],
    cards: [
      {
        id: "aaib-investigation-to-eurofox-2k-g-cmax",
        registration: "G-CMAX",
        aircraft: "Eurofox 2K",
        date: "2026-08-20",
        title: "AAIB investigation to Eurofox 2K, G-CMAX",
        sourceUrl: "https://assets.publishing.service.gov.uk/media/6a730cd0de77e2943cd3bbe8/Eurofox_2K_G-CMAX_09-26.pdf",
        body: "This teaser is not an official AAIB investigation body. Eurofox 2K G-CMAX excerpt.",
      },
    ],
  },
  "csb-reports": {
    ok: true,
    product: "csb-final-investigation-report-pdfs",
    status: "ok",
    fetchedAt: "2026-09-01T00:00:00.000Z",
    asOf: "2026-07-21",
    source: "https://www.csb.gov/investigations/completed-investigations/",
    recordCount: 1,
    records: [
      {
        id: "bio-lab-inc-conyers-fire-and-chemical-release",
        date: "2026-07-21",
        firm: "Bio-Lab Inc. Conyers",
        url: "https://www.csb.gov/assets/1/20/bio-lab_report__public_record_copy_.pdf",
        type: "csb-reports",
      },
    ],
    cards: [
      {
        id: "bio-lab-inc-conyers-fire-and-chemical-release",
        facility: "Bio-Lab Inc. Conyers",
        date: "2026-07-21",
        title: "Bio-Lab Inc. Conyers Fire and Chemical Release",
        sourceUrl: "https://www.csb.gov/assets/1/20/bio-lab_report__public_record_copy_.pdf",
        bytes: 5568830,
      },
    ],
  },
  "hhs-oig-reports": {
    ok: true,
    product: "hhs-oig-audit-evaluation-report-pdfs",
    status: "ok",
    fetchedAt: "2026-09-03T00:00:00.000Z",
    asOf: "2026-08-31",
    source: "https://oig.hhs.gov/reports/all/?fy=2026",
    recordCount: 1,
    records: [
      {
        id: "oas-24-02-004",
        date: "2026-08-31",
        firm: "OAS-24-02-004",
        url: "https://oig.hhs.gov/documents/audit/11864/OAS-24-02-004.pdf",
        type: "hhs-oig-reports",
      },
    ],
    cards: [
      {
        id: "oas-24-02-004",
        reportNumber: "OAS-24-02-004",
        kind: "audit",
        date: "2026-08-31",
        title:
          "CMS Oversight Did Not Prevent Medicare Part D Sponsors From Making $587.7 Million in Ineligible Payments to Pharmacies for Drugs Available Over the Counter but Labeled as Prescription-Only",
        sourceUrl: "https://oig.hhs.gov/documents/audit/11864/OAS-24-02-004.pdf",
        bytes: 1712508,
      },
    ],
  },
  "eis-reports": {
    ok: true,
    product: "epa-nepa-eis-bodies",
    status: "ok",
    fetchedAt: "2026-09-03T00:00:00.000Z",
    asOf: "2026-08-28",
    source: "https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/search",
    recordCount: 1,
    records: [
      {
        id: "20260104",
        date: "2026-08-28",
        firm: "United States Air Force",
        url: "https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/details?eisId=569578",
        type: "eis-reports",
      },
    ],
    cards: [
      {
        id: "20260104",
        ceqNumber: "20260104",
        eisId: "569578",
        date: "2026-08-28",
        title: "F-35A Beddown at Moody Air Force Base, Georgia",
        agency: "United States Air Force",
        pageUrl: "https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/details?eisId=569578",
        body: "Draft Environmental Impact Statement for F-35A Beddown at Moody Air Force Base.",
      },
    ],
  },
  "fsis-humane": {
    ok: true,
    product: "fsis-humane-letter-bodies",
    status: "ok",
    fetchedAt: "2026-09-04T00:00:00.000Z",
    asOf: "2026-09-01",
    source: "https://www.fsis.usda.gov/inspection/regulatory-enforcement/humane-handling-enforcement",
    recordCount: 1,
    records: [
      {
        id: "7420mv-noros-04252024",
        date: "2024-04-25",
        firm: "Honest Meats, LLC",
        url: "https://www.fsis.usda.gov/sites/default/files/media_file/documents/7420MV-NOROS-04252024.pdf",
        type: "fsis-humane",
      },
    ],
    cards: [
      {
        id: "7420mv-noros-04252024",
        estNumber: "7420MV",
        letterType: "NOROS",
        institution: "Honest Meats, LLC",
        date: "2024-04-25",
        title: "Notice of Reinstatement of Suspension",
        sourceUrl: "https://www.fsis.usda.gov/sites/default/files/media_file/documents/7420MV-NOROS-04252024.pdf",
        body: "NOTICE OF REINSTATEMENT OF SUSPENSION. FSIS Inspection Program Personnel of the reinstatement of suspension.",
      },
    ],
  },
  "epa-cafo": {
    ok: true,
    product: "epa-cafo-letter-bodies",
    status: "ok",
    fetchedAt: "2026-09-04T00:00:00.000Z",
    asOf: "2026-07-14",
    source: "https://yosemite.epa.gov/oa/rhc/epaadmin.nsf",
    recordCount: 1,
    records: [
      {
        id: "CWA-06-2026-1792",
        date: "2026-07-14",
        firm: "Apache Feedyard",
        url: "https://www.epa.gov/system/files/documents/2026-07/apache-feedyard_nmg010040_cwa0620261792_07142026.pdf",
        type: "epa-cafo",
      },
    ],
    cards: [
      {
        id: "CWA-06-2026-1792",
        docket: "CWA-06-2026-1792",
        institution: "Apache Feedyard",
        date: "2026-07-14",
        title: "Complaint, Consent Agreement and Final Order",
        sourceUrl: "https://www.epa.gov/system/files/documents/2026-07/apache-feedyard_nmg010040_cwa0620261792_07142026.pdf",
        body: "CONSENT AGREEMENT AND FINAL ORDER. Class I Administrative Penalty Proceeding under Section 309(g) of the Clean Water Act.",
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
  return {
    info: {
      input: {
        type: "http",
        method: "GET",
        queryParams: isExtractedBodySku(sku)
          ? { id: "", before: "", since: "", page: "" }
          : isTableSku(sku)
            ? { since: "" }
            : isPdfCacheSku(sku)
              ? { id: "", before: "" }
            : {},
      },
      output: {
        type: isPdfCacheSku(sku) ? "pdf" : "json",
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

/** Water District 1 rental-pool $/AF stays out of the national farm-market table. */
export function isWaterTick(row: Record<string, unknown>): boolean {
  const id = String(row.id ?? row.series ?? "").toLowerCase();
  if (id.startsWith("wd1.") || id.startsWith("water.")) return true;
  if (String(row.group ?? "").toLowerCase() === "water") return true;
  const blob = [row.source, row.market, row.label, row.id, row.series]
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ");
  return /\bwater district 1\b|\brental pool\b|\bwd1\./.test(blob);
}

/** Invented Idaho organic placeholders only. Official AMS organic prints stay on /ticks. */
export function isOrganicHay(row: Record<string, unknown>): boolean {
  const id = String(row.id ?? row.series ?? "").toLowerCase();
  if (id.includes(".ams_") || /^(hay|grain|dairy)\.ams_/.test(id)) return false;
  const blob = [row.id, row.series, row.kind, row.commodity, row.label, row.name]
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ");
  return /\borganic\b/.test(blob);
}

function isPublicTick(row: Record<string, unknown>): boolean {
  if (isWaterTick(row)) return false;
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
  if (isWaterTick(row) || isOrganicHay(row)) return null;
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
    return attachOfficialComposites(mergeAmsNationalTicks({
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
    }));
  }

  const hasTicks = ticks.length + points.length > 0;
  return attachOfficialComposites(mergeAmsNationalTicks({
    ok: true,
    product: "idaho-hay-feeder-ticks",
    sources: [...TICKS_SOURCE_NAMES],
    status: hasTicks ? "ok" : "stale",
    reason: hasTicks
      ? null
      : "Price cache is present but has no official hay / feeder / IF_FV130 / IBC / 3058 / 2914 / nationwide AMS ticks.",
    fetchedAt,
    ticks,
    failed,
    history: { points, emptyReports, series },
  }));
}

const GROUP_LABELS: { id: string; name: string }[] = [
  { id: "hay", name: "Hay" },
  { id: "cattle", name: "Cattle" },
  { id: "produce", name: "Produce" },
  { id: "grain", name: "Grain" },
  { id: "dairy", name: "Dairy" },
  { id: "hogs", name: "Hogs" },
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
      id: PRODUCT_PUBLIC_ID,
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
    ...(payload.composites && payload.composites.length > 0 ? { composites: payload.composites } : {}),
    schema: {
      tickFields: {
        id: "string — deterministic series id",
        group: "hay | cattle | produce | grain | dairy | hogs | pulses | wool",
        commodity: "string",
        label: "string",
        market: "string — geography / barn / shipping point",
        classGrade: "string",
        unit: "$/ton | $/cwt | $/pair | $/50 lb | $/25 lb | $/bu | $/lb | $/pkg | $/head",
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
        composites: "median of official ticks already on this door (sourceCount + asOf). Omitted when empty. Not a barn quote.",
      },
    },
    groups,
    empty,
    samples,
    sampleNote:
      "samples are marked sample:true and are a few real official rows for identification. composites[] are medians of official ticks already on this door (sourceCount + asOf); omitted when the book has no matching rows. The paid GET /ticks body has the full current snapshot. This manifest does not list every current price.",
  };
}

export function paymentRequiredBody(
  resourceUrl: string,
  sku: DoorSku = "ticks",
  amountAtomic = amountAtomicFor(sku),
): Record<string, unknown> {
  const amount = amountAtomic;
  const copy = SKU_COPY[sku];
  const description = sku402Description(sku);
  const acceptV1: Record<string, unknown> = {
    scheme: "exact",
    network: NETWORK_V1,
    asset: USDC_BASE,
    payTo: PAY_TO,
    resource: resourceUrl,
    description,
    mimeType: skuMimeType(sku),
    maxTimeoutSeconds: 60,
    extra: paymentExtra(sku),
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
  amountAtomic = amountAtomicFor(sku),
): Record<string, unknown> {
  const amount = amountAtomic;
  const description = sku402Description(sku);
  const accept: Record<string, unknown> = {
    scheme: "exact",
    network: NETWORK_V2,
    asset: USDC_BASE,
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    extra: paymentExtra(sku),
    amount,
    description,
  };
  return {
    x402Version: 2,
    error: "PAYMENT-SIGNATURE header is required",
    resource: {
      url: resourceUrl,
      description,
      mimeType: skuMimeType(sku),
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
  amountAtomic = amountAtomicFor(sku),
): Record<string, unknown> {
  const accept = {
    ...((paymentRequiredBody(resourceUrl, sku, amountAtomic).accepts as Record<string, unknown>[])[0]),
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
    "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE, PAYMENT-RESPONSE, ETag",
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
    sample: `${origin}${SAMPLE_PATH}`,
    firmCheck: `${origin}${FIRM_CHECK_PATH}`,
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
  req: IncomingMessage,
  res: ServerResponse,
  port: number,
  url: URL,
  body: Record<string, unknown>,
): void {
  sendJson(
    res,
    200,
    withShopDiscovery(
      decorateExtractedBodyManifest(body, {
        q: url.searchParams.get("q"),
        before: url.searchParams.get("before"),
        date: url.searchParams.get("date"),
        paidPath: extractedCatalogPath(url.pathname.replace(/\/+$/, "") || "/").replace(
          /\/manifest\.json$/,
          "",
        ),
      }),
      req,
      port,
    ),
  );
}

/** `/{door}/index` and `/{door}/index.json` are the free catalog on extracted-body doors. */
function extractedCatalogPath(path: string): string {
  const match = path.match(/^\/([^/]+)\/index(?:\.json)?$/);
  if (!match) return path;
  return isExtractedBodySku(match[1]) ? `/${match[1]}/manifest.json` : path;
}

export function llmsTxt(): string {
  const listed483 = form483IsPublic();
  const listedGmp = gmpIsPublic();
  const listedGmpMd = gmpMdIsPublic();
  const ticksPrice = usdcDisplayFromAtomic(amountAtomicFor("ticks")) ?? "$0.05";
  const paid = [
    `- GET /ticks — ${ticksPrice} — USDA farm market prices (hay, cattle, grain, dairy, hogs, produce). Idaho / PNW barns are example geography inside the table, not the SKU. Not forecasts, not private barn deals, not water. Paid JSON keeps ticks[] and adds records[] + asOf. ETag / If-None-Match (or ?since=) 304s an unchanged snapshot.`,
    "- GET /import-alerts — $0.05 — FDA Import Alerts / DWPE firm-product snapshot. Paid JSON keeps ticks[] and adds records[] + asOf. ETag / If-None-Match (or ?since=) 304s an unchanged snapshot.",
    "- GET /mariners — $0.05 — USCG D13 / Northwest Local Notice to Mariners",
    "- GET /mariners-d11 — $0.05 — USCG D11 / Southwest Local Notice to Mariners",
    "- GET /mariners-d7 — $0.05 — USCG D7 / Southeast Local Notice to Mariners",
    "- GET /mariners-d8 — $0.05 — USCG D8 / Gulf Local Notice to Mariners",
    `- GET /warning-letters — $0.05 — FDA warning-letter bodies (firm, date, subject, full letter text). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05. Same URL ?since=<ISO timestamp or id> is newer texts only.`,
    `- GET /untitled-letters — $0.05 — FDA Untitled Letter text (CDER OPDP + CBER promo PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /awa — $0.05 — USDA APHIS AWA inspection-report observation text (official per-report PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /swisspar — $0.05 — Swissmedic first-authorisation SwissPAR evaluation text (official per-product PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /pcac — $0.05 — FDA PCAC 503A briefing-memo evaluation text (official per-substance PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /ftc-wl — $0.05 — FTC BCP warning-letter text (official per-letter PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /cfpb-orders — $0.05 — CFPB consent-order / administrative-order text (official per-order PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /occ-cd — $0.05 — OCC institution C&D / consent-order text (official per-order PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /fdic-orders — $0.05 — FDIC institution consent-order / C&D text (official per-order PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /frb-orders — $0.05 — FRB institution C&D / written-agreement / PCA text (official per-order PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /ncua-orders — $0.05 — NCUA institution consent C&D text (official per-order HTML). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /fincen-orders — $0.05 — FinCEN institution consent-order text (official per-order PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /ferc-orders — $0.05 — FERC institution stipulation-and-consent text (official cms.ferc.gov PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /ofac-orders — $0.05 — OFAC institution enforcement-release text (official ofac.treasury.gov PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /bis-orders — $0.05 — BIS institution charging-letter / order text (official bis.gov PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /cftc-orders — $0.05 — CFTC institution enforcement-order / settlement text (official cftc.gov PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /fifra-orders — $0.05 — EPA FIFRA institution order / consent text (official yosemite.epa.gov PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /denovo-orders — $0.05 — FDA De Novo classification-order text (official accessdata.fda.gov PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /ttb-oic — $0.05 — TTB Offer in Compromise text (official ttb.gov PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /air-letters — $0.05 — USDA APHIS AIR confirmation-letter text (official direct.aphis.usda.gov PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /superfund-rods — $0.05 — EPA Superfund Record of Decision text (official semspub.epa.gov PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /ico-mpn — $0.05 — ICO Monetary Penalty Notice text (official ico.org.uk PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /cma-ca98 — $0.05 — UK CMA CA98 infringement-decision text (official assets.publishing.service.gov.uk PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /ema-referrals — $0.05 — EMA human-medicine referral procedure text (official ema.europa.eu English PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /cder-reviews — $0.05 — FDA CDER Integrated Review text (official accessdata.fda.gov Drugs@FDA PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /npdes-permits — $0.05 — EPA-issued individual NPDES permit text (official epa.gov PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /ofsted-inspections — $0.05 — Ofsted school / provider inspection-report text (official files.ofsted.gov.uk PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /ofwat-enforcement — $0.05 — Ofwat Water Industry Act 1991 enforcement-notice text (official ofwat.gov.uk PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /ofgem-enforcement — $0.05 — Ofgem enforcement-notice text (official ofgem.gov.uk PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /gain — $0.05 — USDA FAS GAIN attaché report TEXT (official gain.fas.usda.gov PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /orr-enforcement — $0.05 — ORR Railways Act 1993 s.55 statutory-notice / final-order / investigation-report text (official orr.gov.uk PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /phmsa-orders — $0.05 — PHMSA pipeline enforcement-order text (official primis.phmsa.dot.gov PDFs; NOPV PCP/PCO, Final Order, CAO, Consent Order, Decision on Petition). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /aaib-reports — $0.05 — UK AAIB investigation-report text (official assets.publishing.service.gov.uk PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /csb-reports — $0.05 — US CSB final investigation report PDF (official csb.gov/assets PDFs). One official PDF. Same URL ?id= or ?before=<id or date> is the next older official PDF for another $0.05.`,
    `- GET /hhs-oig-reports — $0.05 — HHS OIG full Audit / Evaluation report PDF (official oig.hhs.gov/documents/audit/ and /documents/evaluation/ PDFs). One official PDF. Same URL ?id= or ?before=<id or date> is the next older official PDF for another $0.05.`,
    `- GET /eis-reports — $0.05 — EPA NEPA Environmental Impact Statement text (official CDX e-NEPA EIS document PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /fsis-humane — $0.05 — USDA FSIS humane-handling enforcement letter text (official fsis.usda.gov NOS / NOIE / deferral / abeyance / reinstatement PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
    `- GET /epa-cafo — $0.05 — EPA Part 22 CAFO / ESA administrative penalty letter text (official yosemite.epa.gov and regional epa.gov PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`,
  ];
  if (listed483) {
    paid.push(`- GET /form-483 — $0.05 — FDA Form 483 inspectional observation bodies (posted OII FOIA PDFs). Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`);
  }
  if (listedGmp) {
    paid.push(`- GET /gmp — $0.05 — Health Canada Drug GMP report-card observation text + C.02 cites. Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`);
  }
  if (listedGmpMd) {
    paid.push(`- GET /gmp-md — $0.05 — Health Canada medical-device report-card observation text + MDR cites. Newest ${PAID_BODY_N} official texts. Same URL ?before=<id or date> is the next older ${PAID_BODY_N} for another $0.05.`);
  }
  const free = [
    `- GET /sample — free canned paid-JSON keys (table SKU + ?id= body SKU). HTTP 200. Not live cache. Not a SKU.`,
    `- GET /firm-check?q= — free firm-name search across Form 483, FDA warning letters, FDA untitled letters, FTC BCP warning letters, Ofwat enforcement, Ofgem enforcement, CFPB orders, OCC C&Ds, FDIC orders, and the FDA import-alert catalog. HTTP 200. Names the door and the id or page to buy ($0.02 one text / $0.05 page or table). Not a SKU.`,
    `- GET /openapi.json — OpenAPI 3.1 with x-payment-info for the ${paidCountWord()} paid doors`,
    `- GET /.well-known/x402 — absolute URLs of the ${paidCountWord()} paid routes only`,
    `- GET / — shop JSON (payTo + the ${paidCountWord()} products)`,
    `- GET/POST /mcp — Streamable HTTP MCP for the same ${paidCountWord()} paid GETs plus free search and firm-check. Not a new SKU.`,
    "- GET /manifest.json — USDA farm market price count + schema + official composites (median rollups of ticks already on the door; no listings scrape)",
    "- GET /import-alerts/manifest.json — FDA count + schema (not the firm dump)",
    "- GET /mariners/manifest.json — D13 LNM count + official PDF (not the notice body)",
    "- GET /mariners-d11/manifest.json — D11 LNM count + official PDF (not the notice body)",
    "- GET /mariners-d7/manifest.json — D7 LNM count + official PDF (not the notice body)",
    "- GET /mariners-d8/manifest.json — D8 LNM count + official PDF (not the notice body)",
    "- GET /warning-letters/manifest.json — FDA letter count + firm/date/subject (full catalog + page cursor; ?q= is free search; not the letter body)",
    "- GET /untitled-letters/manifest.json — FDA untitled count + id/firm/date/product (full catalog + page cursor; ?q= is free search; not the letter text)",
    "- GET /awa/manifest.json — APHIS AWA count + id/firm/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the observation text)",
    "- GET /swisspar/manifest.json — SwissPAR count + name/date/MA/sourceUrl (full catalog + page cursor; ?q= is free search; not the evaluation text)",
    "- GET /pcac/manifest.json — FDA PCAC count + substance/date/meeting/mediaId/sourceUrl (full catalog + page cursor; ?q= is free search; not the evaluation text)",
    "- GET /ftc-wl/manifest.json — FTC BCP count + firm/date/subject/sourceUrl (full catalog + page cursor; ?q= is free search; not the letter body)",
    "- GET /cfpb-orders/manifest.json — CFPB order count + firm/date/title/fileNo/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /occ-cd/manifest.json — OCC C&D count + bank/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /fdic-orders/manifest.json — FDIC order count + bank/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /frb-orders/manifest.json — FRB order count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /ncua-orders/manifest.json — NCUA order count + credit union/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /fincen-orders/manifest.json — FinCEN order count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /ferc-orders/manifest.json — FERC order count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /ofac-orders/manifest.json — OFAC order count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /bis-orders/manifest.json — BIS order count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /cftc-orders/manifest.json — CFTC order count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /fifra-orders/manifest.json — EPA FIFRA order count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /denovo-orders/manifest.json — FDA De Novo order count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /ttb-oic/manifest.json — TTB OIC count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /air-letters/manifest.json — APHIS AIR letter count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the letter body)",
    "- GET /superfund-rods/manifest.json — EPA Superfund ROD count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the ROD body)",
    "- GET /ico-mpn/manifest.json — ICO MPN count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the MPN body)",
    "- GET /cma-ca98/manifest.json — CMA CA98 count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the decision body)",
    "- GET /ema-referrals/manifest.json — EMA referral count + name/date/status/sourceUrl (full catalog + page cursor; ?q= is free search; not the procedure body)",
    "- GET /cder-reviews/manifest.json — CDER Integrated Review count + name/date/application/sourceUrl (full catalog + page cursor; ?q= is free search; not the review body)",
    "- GET /npdes-permits/manifest.json — EPA individual NPDES permit count + name/date/permit/sourceUrl (full catalog + page cursor; ?q= is free search; not the permit body)",
    "- GET /ofsted-inspections/manifest.json — Ofsted inspection count + provider/URN/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the report body)",
    "- GET /ofwat-enforcement/manifest.json — Ofwat enforcement count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the notice body)",
    "- GET /ofgem-enforcement/manifest.json — Ofgem enforcement count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the notice body)",
    "- GET /gain/manifest.json — GAIN attaché count + report number/country/post/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the attaché body)",
    "- GET /orr-enforcement/manifest.json — ORR enforcement count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the notice body)",
    "- GET /phmsa-orders/manifest.json — PHMSA enforcement count + operator/CPF/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the order body)",
    "- GET /aaib-reports/manifest.json — AAIB investigation count + title/registration/aircraft/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the report body)",
    "- GET /csb-reports/manifest.json — CSB final-report count + facility/date/title/pageUrl/sourceUrl (full catalog; ?q= is free search; not the PDF bytes)",
    "- GET /hhs-oig-reports/manifest.json — HHS OIG report count + report number/date/title/pageUrl/sourceUrl (full catalog; ?q= is free search; not the PDF bytes)",
    "- GET /eis-reports/manifest.json — EPA NEPA EIS count + CEQ number/date/title/agency/pageUrl (full catalog + page cursor; ?q= is free search; not the EIS body)",
    "- GET /fsis-humane/manifest.json — FSIS humane-handling letter count + establishment/letter type/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the letter body)",
    "- GET /epa-cafo/manifest.json — EPA CAFO / ESA letter count + institution/docket/date/sourceUrl (full catalog + page cursor; ?q= is free search; not the letter body)",
  ];
  if (listed483) {
    free.push("- GET /form-483/manifest.json — FDA 483 count + id/date/firm (full catalog + page cursor; ?q= is free search; not the observation body)");
  }
  if (listedGmp) {
    free.push("- GET /gmp/manifest.json — Health Canada GMP count + id/firm/date/rating (full catalog + page cursor; ?q= is free search; not the observation text)");
  }
  if (listedGmpMd) {
    free.push("- GET /gmp-md/manifest.json — Health Canada MD count + id/firm/date/rating (full catalog + page cursor; ?q= is free search; not the report-card body text)");
  }
  return [
    "# BNM Data Shop",
    "",
    `Official public data as JSON at https://ticks.bnm.farm. ${paidCountWord().replace(/^./, (c) => c.toUpperCase())} paid GETs. USDC on Base (eip155:8453). payTo 0xf59621FC406D266e18f314Ae18eF0a33b8401004. ${BODY_PAGE_DISCOVERY}`,
    "",
    "## Paid",
    "",
    ...paid,
    "",
    "Unpaid GET returns HTTP 402 with PAYMENT-REQUIRED and extensions.bazaar. Unpaid POST on the same paid path (empty JSON `{}` accepted) returns that same 402 challenge and does not return data. After a valid X-PAYMENT, the same URL returns JSON: newest chunk on extracted-body doors, older chunk if they ask, newer-than ?since= if they poll, whole current table on /ticks and /import-alerts. Empty ?since= delta is HTTP 304 or paid recordCount 0. Table If-None-Match 304s an unchanged snapshot. No API key. GET has no request body.",
    "402 accepts[].extra names searchUrl, oneDocPath, priceAtomic, pagePriceAtomic, pageDefault, tableWhole, firmCheckUrl, sampleUrl. extra.name stays USD Coin.",
    "",
    "## Free discovery",
    "",
    ...free,
    "",
    `${noNextSkuWord()} Free manifests are not the paid body.`,
    "",
    "## Prompt for AI",
    "",
    ...SAMPLE_HOW_TO_USE.map((line) => `- ${line}`),
    "",
    "## MCP",
    "",
    `- URL — https://ticks.bnm.farm${MCP_PATH}`,
    "- Connect — `npx -y mcp-remote https://ticks.bnm.farm/mcp`",
    `- One tool per live paid GET from /.well-known/x402 (generated at request time; later SKUs appear without an MCP rewrite). Same ${paidCountWord()} URLs today. Free search + free firm-check + paid get-page. ${BODY_PAGE_DISCOVERY} Unpaid tool calls still HTTP 402. Not Bazaar-indexed.`,
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
  const paths = [TICKS_PATH, IMPORT_ALERTS_PATH, MARINERS_PATH, MARINERS_D11_PATH, MARINERS_D7_PATH, MARINERS_D8_PATH, WARNING_LETTERS_PATH, UNTITLED_LETTERS_PATH, AWA_PATH, SWISSPAR_PATH, PCAC_PATH, FTC_WL_PATH, CFPB_ORDERS_PATH, OCC_CD_PATH, FDIC_ORDERS_PATH, FRB_ORDERS_PATH, NCUA_ORDERS_PATH, FINCEN_ORDERS_PATH, FERC_ORDERS_PATH, OFAC_ORDERS_PATH, BIS_ORDERS_PATH, CFTC_ORDERS_PATH, FIFRA_ORDERS_PATH, DENOVO_ORDERS_PATH, TTB_OIC_PATH, AIR_LETTERS_PATH, SUPERFUND_RODS_PATH, ICO_MPN_PATH, CMA_CA98_PATH, EMA_REFERRALS_PATH, CDER_REVIEWS_PATH, NPDES_PERMITS_PATH, OFSTED_INSPECTIONS_PATH, OFWAT_ENFORCEMENT_PATH, OFGEM_ENFORCEMENT_PATH, GAIN_PATH, ORR_ENFORCEMENT_PATH, PHMSA_ORDERS_PATH, AAIB_REPORTS_PATH, CSB_REPORTS_PATH, HHS_OIG_REPORTS_PATH, EIS_REPORTS_PATH, FSIS_HUMANE_PATH, EPA_CAFO_PATH];
  if (form483IsPublic()) paths.push(FORM_483_PATH);
  if (gmpIsPublic()) paths.push(GMP_PATH);
  if (gmpMdIsPublic()) paths.push(GMP_MD_PATH);
  return paths;
}

function paidDiscoveryUrls(req: IncomingMessage, port: number): string[] {
  return paidDiscoveryPaths().map((path) => resourceUrl(req, port, path));
}

export function wellKnownX402(req: IncomingMessage, port: number): Record<string, unknown> {
  return {
    version: 1,
    resources: paidDiscoveryUrls(req, port),
    ownershipProofs: [PAY_TO],
    ...shopDiscoveryPointers(req, port),
    extra: {
      since:
        "Extracted-body doors accept ?since=<ISO timestamp or official catalog id> (same watermark shape as ?before=). Paid GET returns only official texts newer than that watermark. Empty new set: HTTP 304 with ETag, or paid 200 with empty records/ids and a stable asOf/fetchedAt. Newest-10 ?before= and ?id= stay.",
      etag:
        "GET /ticks and GET /import-alerts send ETag. If-None-Match on an unchanged snapshot returns 304 and does not re-sell the table. If the table changed, the whole current table is returned (existing product). Optional ?since= on those tables 304s when fetchedAt/asOf is not newer.",
      updateCadence: COLLECT_CADENCE,
      http429: HTTP_429_COPY,
    },
    instructions:
      `GET each resource unpaid for HTTP 402 with extensions.bazaar. Pay USDC on Base. ${BODY_PAGE_DISCOVERY} Free canned paid-JSON keys: GET /sample (HTTP 200, not a SKU). Free firm-name search: GET ${FIRM_CHECK_PATH}?q= (HTTP 200, not a SKU). ${SAMPLE_HOW_TO_USE.join(" ")} Free OpenAPI is at /openapi.json. MCP is at /mcp (same ${paidCountWord()} paid GETs plus free search and firm-check, not a new SKU). Only these ${paidCountWord()} paid routes exist. x402scan: ${X402SCAN_SERVER_URL}`,
  };
}

function paidOpenApiOp(opts: {
  operationId: string;
  summary: string;
  description: string;
  priceUsdc: string;
  amountAtomic: string;
  example: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}): Record<string, unknown> {
  const olderPages = opts.description.includes("Newest chunk on a plain GET");
  const outputSchema = olderPages
    ? {
        ...opts.outputSchema,
        properties: {
          ...((opts.outputSchema.properties as Record<string, unknown> | undefined) ?? {}),
          ids: { type: "array", items: { type: "string" }, description: "Official catalog ids on this paid page" },
          nextBefore: { type: "string", nullable: true },
          prevBefore: { type: "string", nullable: true },
        },
      }
    : opts.outputSchema;
  return {
    operationId: opts.operationId,
    summary: opts.summary,
    description: opts.description,
    tags: ["paid"],
    security: [{ x402: [] }],
    parameters: olderPages
      ? [
          {
            name: "id",
            in: "query",
            required: false,
            schema: { type: "string" },
            description:
              "Official catalog id from the free index. That one official text. $0.02 (20000 atomic). Same door, not a new SKU. Wins over since/before/page.",
          },
          {
            name: "since",
            in: "query",
            required: false,
            schema: { type: "string" },
            description:
              "ISO timestamp or official catalog id (same shape as ?before=). Official texts newer than this watermark. $0.05. Empty new set is HTTP 304 or paid recordCount 0. The other direction from ?before=.",
          },
          {
            name: "before",
            in: "query",
            required: false,
            schema: { type: "string" },
            description:
              "Official catalog id or YYYY-MM-DD from the free manifest. Next older chunk. Another $0.05. Omit for the newest chunk.",
          },
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1 },
            description: "1-based page. Page 1 is the newest chunk. Ignored when since/before is set.",
          },
        ]
      : opts.operationId === "getTicks" || opts.operationId === "getImportAlerts"
        ? [
            {
              name: "since",
              in: "query",
              required: false,
              schema: { type: "string" },
              description:
                "ISO timestamp or asOf date. If the current table fetchedAt/asOf is not newer, HTTP 304 (not charged). If the table changed, the whole current table is returned.",
            },
            {
              name: "If-None-Match",
              in: "header",
              required: false,
              schema: { type: "string" },
              description:
                "ETag from a prior paid GET. Unchanged snapshot returns HTTP 304 and does not re-sell the table.",
            },
          ]
        : [],
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
      network: NETWORK_V2,
      asset: USDC_BASE,
      payTo: PAY_TO,
    },
    responses: {
      "200": {
        description: "Paid JSON body after a valid x402 settlement",
        content: {
          "application/json": {
            schema: outputSchema,
            example: opts.example,
          },
        },
        headers: {
          ETag: { schema: { type: "string" }, description: "Snapshot / catalog-tip ETag for If-None-Match polls" },
        },
      },
      "304": {
        description:
          "Not Modified. Catalog tip or table snapshot unchanged. No body. Not charged. Send If-None-Match or ?since=.",
      },
      "402": {
        description: "Payment Required — x402 challenge in PAYMENT-REQUIRED and JSON body",
      },
      "429": {
        description: HTTP_429_COPY,
      },
    },
  };
}

const EXTRACTED_MANIFEST_OPENAPI =
  " Free index/search (?q=, optional before/date) returns id, the ?id= URL ($0.02), and the page cursor ($0.05). GET ?id= is one official text ($0.02). Plain paid GET is the newest 10 official texts ($0.05), or the whole current set if fewer — not the entire cache of a large door. Same URL ?before is the next older page ($0.05). Same URL ?since=<ISO timestamp or official catalog id> is official texts newer than that watermark ($0.05; empty new set is 304 or recordCount 0).";

function freeOpenApiOp(summary: string, description: string): Record<string, unknown> {
  const extractedCatalog =
    /Not the (letter body|letter text|observation text|evaluation text|order body|ROD body|MPN body|decision body|observation body|report-card body text)\.?$/.test(
      description,
    );
  const desc =
    extractedCatalog && !description.includes("not the entire cache")
      ? `${description.replace(/\.?$/, ".")}${EXTRACTED_MANIFEST_OPENAPI}`
      : description;
  return {
    summary,
    description: desc,
    tags: ["free"],
    security: [],
    "x-auth": { mode: "none" },
    ...(extractedCatalog
      ? {
          parameters: [
            {
              name: "q",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Free-text match against id, firm, date, subject. Not charged.",
            },
            {
              name: "before",
              in: "query",
              required: false,
              schema: { type: "string" },
              description:
                "Free filter: page cursor (id) returns that page's rows; YYYY-MM-DD returns older dates. Not charged.",
            },
            {
              name: "date",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Free date prefix filter (YYYY, YYYY-MM, or YYYY-MM-DD). Not charged.",
            },
          ],
        }
      : {}),
    responses: {
      "200": {
        description: "Free JSON catalog / discovery document",
        content: { "application/json": { schema: { type: "object" } } },
      },
    },
  };
}

export function buildOpenApi(req: IncomingMessage, port: number): Record<string, unknown> {
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
  const emaReferralsAtomic = amountAtomicFor("ema-referrals");
  const cderReviewsAtomic = amountAtomicFor("cder-reviews");
  const npdesPermitsAtomic = amountAtomicFor("npdes-permits");
  const ofstedInspectionsAtomic = amountAtomicFor("ofsted-inspections");
  const ofwatEnforcementAtomic = amountAtomicFor("ofwat-enforcement");
  const ofgemEnforcementAtomic = amountAtomicFor("ofgem-enforcement");
  const gainAtomic = amountAtomicFor("gain");
  const orrEnforcementAtomic = amountAtomicFor("orr-enforcement");
  const phmsaOrdersAtomic = amountAtomicFor("phmsa-orders");
  const aaibReportsAtomic = amountAtomicFor("aaib-reports");
  const csbReportsAtomic = amountAtomicFor("csb-reports");
  const hhsOigReportsAtomic = amountAtomicFor("hhs-oig-reports");
  const eisReportsAtomic = amountAtomicFor("eis-reports");
  const fsisHumaneAtomic = amountAtomicFor("fsis-humane");
  const epaCafoAtomic = amountAtomicFor("epa-cafo");
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
  const emaReferralsPrice = (Number(emaReferralsAtomic) / 1e6).toFixed(2);
  const cderReviewsPrice = (Number(cderReviewsAtomic) / 1e6).toFixed(2);
  const npdesPermitsPrice = (Number(npdesPermitsAtomic) / 1e6).toFixed(2);
  const ofstedInspectionsPrice = (Number(ofstedInspectionsAtomic) / 1e6).toFixed(2);
  const ofwatEnforcementPrice = (Number(ofwatEnforcementAtomic) / 1e6).toFixed(2);
  const ofgemEnforcementPrice = (Number(ofgemEnforcementAtomic) / 1e6).toFixed(2);
  const gainPrice = (Number(gainAtomic) / 1e6).toFixed(2);
  const orrEnforcementPrice = (Number(orrEnforcementAtomic) / 1e6).toFixed(2);
  const phmsaOrdersPrice = (Number(phmsaOrdersAtomic) / 1e6).toFixed(2);
  const aaibReportsPrice = (Number(aaibReportsAtomic) / 1e6).toFixed(2);
  const csbReportsPrice = (Number(csbReportsAtomic) / 1e6).toFixed(2);
  const hhsOigReportsPrice = (Number(hhsOigReportsAtomic) / 1e6).toFixed(2);
  const eisReportsPrice = (Number(eisReportsAtomic) / 1e6).toFixed(2);
  const fsisHumanePrice = (Number(fsisHumaneAtomic) / 1e6).toFixed(2);
  const epaCafoPrice = (Number(epaCafoAtomic) / 1e6).toFixed(2);
  const f483Price = (Number(f483Atomic) / 1e6).toFixed(2);
  const gmpPrice = (Number(gmpAtomic) / 1e6).toFixed(2);
  const gmpMdPrice = (Number(gmpMdAtomic) / 1e6).toFixed(2);
  const listed483 = form483IsPublic();
  const listedGmp = gmpIsPublic();
  const listedGmpMd = gmpMdIsPublic();
  const paidBits = [
    `/ticks ($${ticksPrice})`,
    "/import-alerts ($0.05)",
    "/mariners ($0.05)",
    "/mariners-d11 ($0.05)",
    "/mariners-d7 ($0.05)",
    "/mariners-d8 ($0.05)",
    "/warning-letters ($0.05)",
    "/untitled-letters ($0.05)",
    "/awa ($0.05)",
    "/swisspar ($0.05)",
    "/pcac ($0.05)",
    "/ftc-wl ($0.05)",
    "/cfpb-orders ($0.05)",
    "/occ-cd ($0.05)",
    "/fdic-orders ($0.05)",
    "/frb-orders ($0.05)",
    "/ncua-orders ($0.05)",
    "/fincen-orders ($0.05)",
    "/ferc-orders ($0.05)",
    "/ofac-orders ($0.05)",
    "/bis-orders ($0.05)",
    "/cftc-orders ($0.05)",
    "/fifra-orders ($0.05)",
    "/denovo-orders ($0.05)",
    "/ttb-oic ($0.05)",
    "/air-letters ($0.05)",
    "/superfund-rods ($0.05)",
    "/ico-mpn ($0.05)",
    "/cma-ca98 ($0.05)",
    "/ema-referrals ($0.05)",
    "/cder-reviews ($0.05)",
    "/npdes-permits ($0.05)",
    "/ofsted-inspections ($0.05)",
    "/ofwat-enforcement ($0.05)",
    "/ofgem-enforcement ($0.05)",
    "/gain ($0.05)",
    "/orr-enforcement ($0.05)",
    "/phmsa-orders ($0.05)",
    "/aaib-reports ($0.05)",
    "/csb-reports ($0.05)",
    "/hhs-oig-reports ($0.05)",
    "/eis-reports ($0.05)",
    "/fsis-humane ($0.05)",
    "/epa-cafo ($0.05)",
  ];
  if (listed483) paidBits.push("/form-483 ($0.05)");
  if (listedGmp) paidBits.push("/gmp ($0.05)");
  if (listedGmpMd) paidBits.push("/gmp-md ($0.05)");
  const paidList = paidBits.join(", ");
  return {
    openapi: "3.1.0",
    info: {
      title: "BNM Data Shop",
      version: PRODUCT_VERSION,
      description: "Official public data as JSON. Unpaid paid routes return HTTP 402.",
      contact: { name: "BNM Data Shop", url: "https://bnm.farm/" },
      "x-guidance":
        `${paidCountWord().replace(/^./, (c) => c.toUpperCase())} paid GETs: ${paidList}, USDC on Base. ${BODY_PAGE_DISCOVERY} Free canned paid-JSON keys: GET /sample (HTTP 200, not a SKU). Free firm-name search: GET ${FIRM_CHECK_PATH}?q= (HTTP 200, not a SKU). Start at GET /openapi.json or GET /.well-known/x402, then probe the paid URL unpaid for HTTP 402 (GET or POST '{}'). MCP at GET/POST /mcp lists one tool per paid GET plus free search, free firm-check, paid get-one ($0.02), and paid get-page ($0.05). Free manifests do not include the paid body. GET has no request body. ${noNextSkuWord()}`,
    },
    "x-discovery": {
      ownershipProofs: [PAY_TO],
    },
    "x-agentcash-provenance": {
      ownershipProofs: [PAY_TO],
    },
    "x-agentcash-guidance": {
      llmsTxtUrl: `${origin}${LLMS_PATH}`,
      sampleUrl: `${origin}${SAMPLE_PATH}`,
      firmCheckUrl: `${origin}${FIRM_CHECK_PATH}`,
      oneDocPriceAtomic: Number(SINGLE_DOC_AMOUNT_ATOMIC),
      pagePriceAtomic: Number(PAGE_AMOUNT_ATOMIC),
      pageDefault: paidBodyWindow(),
      since: "ISO timestamp or official catalog id on extracted-body doors; fetchedAt/asOf on /ticks and /import-alerts",
      etag: "GET /ticks and GET /import-alerts. If-None-Match → 304 when unchanged.",
      updateCadence: COLLECT_CADENCE,
      http429: HTTP_429_COPY,
    },
    servers: [{ url: origin }],
    paths: {
      [TICKS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getTicks",
          summary: "USDA farm market prices",
          description: SKU_COPY.ticks.description,
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
          operationId: "getImportAlerts",
          summary: "FDA Import Alerts / DWPE",
          description: SKU_COPY["import-alerts"].description,
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
          operationId: "getMariners",
          summary: "USCG D13 / Northwest LNM",
          description: SKU_COPY.mariners.description,
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
          operationId: "getMarinersD11",
          summary: "USCG D11 / Southwest LNM",
          description: SKU_COPY["mariners-d11"].description,
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
          operationId: "getMarinersD7",
          summary: "USCG D7 / Southeast LNM",
          description: SKU_COPY["mariners-d7"].description,
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
          operationId: "getMarinersD8",
          summary: "USCG D8 / Gulf LNM",
          description: SKU_COPY["mariners-d8"].description,
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
          operationId: "getWarningLetters",
          summary: "FDA warning-letter bodies",
          description: SKU_COPY["warning-letters"].description,
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
          operationId: "getUntitledLetters",
          summary: "FDA Untitled Letter bodies (CDER OPDP + CBER promo)",
          description: SKU_COPY["untitled-letters"].description,
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
          operationId: "getAwa",
          summary: "USDA APHIS AWA inspection-report observation text",
          description: SKU_COPY.awa.description,
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
          operationId: "getSwisspar",
          summary: "Swissmedic first-authorisation SwissPAR evaluation text",
          description: SKU_COPY.swisspar.description,
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
          operationId: "getPcac",
          summary: "FDA PCAC 503A briefing-memo evaluation text",
          description: SKU_COPY.pcac.description,
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
          operationId: "getFtcWl",
          summary: "FTC BCP warning-letter text",
          description: SKU_COPY["ftc-wl"].description,
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
          operationId: "getCfpbOrders",
          summary: "CFPB consent-order / administrative-order text",
          description: SKU_COPY["cfpb-orders"].description,
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
          operationId: "getOccCd",
          summary: "OCC institution C&D / consent-order text",
          description: SKU_COPY["occ-cd"].description,
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
          operationId: "getFdicOrders",
          summary: "FDIC institution consent-order / C&D text",
          description: SKU_COPY["fdic-orders"].description,
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
          operationId: "getFrbOrders",
          summary: "FRB institution C&D / written-agreement / PCA text",
          description: SKU_COPY["frb-orders"].description,
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
          operationId: "getNcuaOrders",
          summary: "NCUA institution consent C&D text",
          description: SKU_COPY["ncua-orders"].description,
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
          operationId: "getFincenOrders",
          summary: "FinCEN institution consent-order text",
          description: SKU_COPY["fincen-orders"].description,
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
          operationId: "getFercOrders",
          summary: "FERC institution stipulation-and-consent text",
          description: SKU_COPY["ferc-orders"].description,
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
          operationId: "getOfacOrders",
          summary: "OFAC institution enforcement-release text",
          description: SKU_COPY["ofac-orders"].description,
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
          operationId: "getBisOrders",
          summary: "BIS institution charging-letter / order text",
          description: SKU_COPY["bis-orders"].description,
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
          operationId: "getCftcOrders",
          summary: "CFTC institution enforcement-order / settlement text",
          description: SKU_COPY["cftc-orders"].description,
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
          operationId: "getFifraOrders",
          summary: "EPA FIFRA institution order / consent text",
          description: SKU_COPY["fifra-orders"].description,
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
          operationId: "getDenovoOrders",
          summary: "FDA De Novo classification-order text",
          description: SKU_COPY["denovo-orders"].description,
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
          operationId: "getTtbOic",
          summary: "TTB institution Offer in Compromise text",
          description: SKU_COPY["ttb-oic"].description,
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
          operationId: "getAirLetters",
          summary: "USDA APHIS AIR confirmation-letter text",
          description: SKU_COPY["air-letters"].description,
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
          operationId: "getSuperfundRods",
          summary: "EPA Superfund Record of Decision text",
          description: SKU_COPY["superfund-rods"].description,
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
          operationId: "getIcoMpn",
          summary: "ICO Monetary Penalty Notice text",
          description: SKU_COPY["ico-mpn"].description,
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
          operationId: "getCmaCa98",
          summary: "UK CMA CA98 infringement-decision text",
          description: SKU_COPY["cma-ca98"].description,
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
      [EMA_REFERRALS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getEmaReferrals",
          summary: "EMA human-medicine referral procedure text",
          description: SKU_COPY["ema-referrals"].description,
          priceUsdc: emaReferralsPrice,
          amountAtomic: emaReferralsAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ema-referrals"],
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
      [CDER_REVIEWS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getCderReviews",
          summary: "FDA CDER Integrated Review text",
          description: SKU_COPY["cder-reviews"].description,
          priceUsdc: cderReviewsPrice,
          amountAtomic: cderReviewsAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["cder-reviews"],
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
      [NPDES_PERMITS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getNpdesPermits",
          summary: "EPA individual NPDES permit text",
          description: SKU_COPY["npdes-permits"].description,
          priceUsdc: npdesPermitsPrice,
          amountAtomic: npdesPermitsAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["npdes-permits"],
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
      [OFSTED_INSPECTIONS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getOfstedInspections",
          summary: "Ofsted school / provider inspection report text",
          description: SKU_COPY["ofsted-inspections"].description,
          priceUsdc: ofstedInspectionsPrice,
          amountAtomic: ofstedInspectionsAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ofsted-inspections"],
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
      [OFWAT_ENFORCEMENT_PATH]: {
        get: paidOpenApiOp({
          operationId: "getOfwatEnforcement",
          summary: "Ofwat Water Industry Act 1991 enforcement-notice text",
          description: SKU_COPY["ofwat-enforcement"].description,
          priceUsdc: ofwatEnforcementPrice,
          amountAtomic: ofwatEnforcementAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ofwat-enforcement"],
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
      [OFGEM_ENFORCEMENT_PATH]: {
        get: paidOpenApiOp({
          operationId: "getOfgemEnforcement",
          summary: "Ofgem enforcement-notice text",
          description: SKU_COPY["ofgem-enforcement"].description,
          priceUsdc: ofgemEnforcementPrice,
          amountAtomic: ofgemEnforcementAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["ofgem-enforcement"],
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
      [GAIN_PATH]: {
        get: paidOpenApiOp({
          operationId: "getGain",
          summary: "USDA FAS GAIN attaché report TEXT",
          description: SKU_COPY.gain.description,
          priceUsdc: gainPrice,
          amountAtomic: gainAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE.gain,
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
      [ORR_ENFORCEMENT_PATH]: {
        get: paidOpenApiOp({
          operationId: "getOrrEnforcement",
          summary: "ORR Railways Act s.55 enforcement-notice text",
          description: SKU_COPY["orr-enforcement"].description,
          priceUsdc: orrEnforcementPrice,
          amountAtomic: orrEnforcementAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["orr-enforcement"],
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
      [PHMSA_ORDERS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getPhmsaOrders",
          summary: "PHMSA pipeline enforcement-order text",
          description: SKU_COPY["phmsa-orders"].description,
          priceUsdc: phmsaOrdersPrice,
          amountAtomic: phmsaOrdersAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["phmsa-orders"],
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
      [AAIB_REPORTS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getAaibReports",
          summary: "UK AAIB investigation-report text",
          description: SKU_COPY["aaib-reports"].description,
          priceUsdc: aaibReportsPrice,
          amountAtomic: aaibReportsAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["aaib-reports"],
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
      [CSB_REPORTS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getCsbReports",
          summary: "US CSB final investigation report PDFs",
          description: SKU_COPY["csb-reports"].description,
          priceUsdc: csbReportsPrice,
          amountAtomic: csbReportsAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["csb-reports"],
          outputSchema: {
            type: "string",
            description: "Official CSB final investigation report PDF bytes (application/pdf)",
          },
        }),
      },
      [HHS_OIG_REPORTS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getHhsOigReports",
          summary: "HHS OIG audit and evaluation report PDFs",
          description: SKU_COPY["hhs-oig-reports"].description,
          priceUsdc: hhsOigReportsPrice,
          amountAtomic: hhsOigReportsAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["hhs-oig-reports"],
          outputSchema: {
            type: "string",
            description: "Official HHS OIG full Audit / Evaluation report PDF bytes (application/pdf)",
          },
        }),
      },
      [EIS_REPORTS_PATH]: {
        get: paidOpenApiOp({
          operationId: "getEisReports",
          summary: "EPA NEPA Environmental Impact Statement PDFs",
          description: SKU_COPY["eis-reports"].description,
          priceUsdc: eisReportsPrice,
          amountAtomic: eisReportsAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["eis-reports"],
          outputSchema: {
            type: "string",
            description: "Official EPA NEPA Environmental Impact Statement PDF bytes (application/pdf)",
          },
        }),
      },
      [FSIS_HUMANE_PATH]: {
        get: paidOpenApiOp({
          operationId: "getFsisHumane",
          summary: "USDA FSIS humane-handling enforcement letter text",
          description: SKU_COPY["fsis-humane"].description,
          priceUsdc: fsisHumanePrice,
          amountAtomic: fsisHumaneAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["fsis-humane"],
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
      [EPA_CAFO_PATH]: {
        get: paidOpenApiOp({
          operationId: "getEpaCafo",
          summary: "EPA Part 22 CAFO / ESA administrative penalty letter text",
          description: SKU_COPY["epa-cafo"].description,
          priceUsdc: epaCafoPrice,
          amountAtomic: epaCafoAtomic,
          example: BAZAAR_OUTPUT_EXAMPLE["epa-cafo"],
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
                operationId: "getForm483",
                summary: "FDA Form 483 observation bodies",
                description: SKU_COPY["form-483"].description,
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
                operationId: "getGmp",
                summary: "Health Canada Drug GMP report-card observation bodies",
                description: SKU_COPY.gmp.description,
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
                operationId: "getGmpMd",
                summary: "Health Canada medical-device report-card observation bodies",
                description: SKU_COPY["gmp-md"].description,
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
      [SAMPLE_PATH]: {
        get: freeOpenApiOp(
          "Free canned paid-JSON keys",
          "HTTP 200 static example of /ticks table keys and extracted-body ?id= keys. Marked example:true. Not live cache. Not a paid SKU.",
        ),
      },
      [FIRM_CHECK_PATH]: {
        get: {
          ...freeOpenApiOp("Free firm-check across official caches", FIRM_CHECK_NOTE),
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "Firm, company, FEI, CMS, or import-alert number. Free. Not charged.",
            },
          ],
        },
      },
      [MANIFEST_PATH]: {
        get: freeOpenApiOp("USDA farm market prices free manifest", "Count, schema, and samples. Not the paid snapshot."),
      },
      [CATALOG_PATH]: {
        get: freeOpenApiOp("USDA farm market prices free catalog alias", "Same JSON as /manifest.json."),
      },
      [IMPORT_ALERTS_MANIFEST_PATH]: {
        get: freeOpenApiOp("FDA import-alerts free manifest", "Count, catalog, and schema. Not the paid firm list."),
      },
      [MARINERS_MANIFEST_PATH]: {
        get: freeOpenApiOp("USCG D13 LNM free manifest", "Count, week, and official PDF URL. Not the notice body."),
      },
      [MARINERS_D11_MANIFEST_PATH]: {
        get: freeOpenApiOp("USCG D11 LNM free manifest", "Count, week, and official PDF URL. Not the notice body."),
      },
      [MARINERS_D7_MANIFEST_PATH]: {
        get: freeOpenApiOp("USCG D7 LNM free manifest", "Count, week, and official PDF URL. Not the notice body."),
      },
      [MARINERS_D8_MANIFEST_PATH]: {
        get: freeOpenApiOp("USCG D8 LNM free manifest", "Count, week, and official PDF URL. Not the notice body."),
      },
      [WARNING_LETTERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA warning-letters free manifest",
          "Count, firm, date, subject, and official source URL. Not the letter body.",
        ),
      },
      [UNTITLED_LETTERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA untitled-letters free manifest",
          "Count, id, firm, date, product, and official source URL. Not the letter text.",
        ),
      },
      [AWA_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "APHIS AWA free manifest",
          "Count, id, firm, date, and official source URL. Not the observation text.",
        ),
      },
      [SWISSPAR_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "SwissPAR free manifest",
          "Count, name, date, MA, and official source URL. Not the evaluation text.",
        ),
      },
      [PCAC_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA PCAC free manifest",
          "Count, substance, date, meeting, mediaId, and official source URL. Not the evaluation text.",
        ),
      },
      [FTC_WL_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FTC BCP warning-letters free manifest",
          "Count, firm, date, subject, and official PDF URL. Not the letter body.",
        ),
      },
      [CFPB_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "CFPB consent-orders free manifest",
          "Count, firm, date, title, fileNo, and official PDF URL. Not the order body.",
        ),
      },
      [OCC_CD_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "OCC institution C&D free manifest",
          "Count, bank, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [FDIC_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDIC institution orders free manifest",
          "Count, bank, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [FRB_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FRB institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [NCUA_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "NCUA institution orders free manifest",
          "Count, credit union, docket, date, and official HTML URL. Not the order body.",
        ),
      },
      [FINCEN_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FinCEN institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [FERC_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FERC institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [OFAC_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "OFAC institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [BIS_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "BIS institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [CFTC_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "CFTC institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [FIFRA_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "EPA FIFRA institution orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [DENOVO_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA De Novo classification orders free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [TTB_OIC_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "TTB Offer in Compromise free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the order body.",
        ),
      },
      [AIR_LETTERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "APHIS AIR confirmation letters free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the letter body.",
        ),
      },
      [SUPERFUND_RODS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "EPA Superfund Records of Decision free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the ROD body.",
        ),
      },
      [ICO_MPN_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "ICO Monetary Penalty Notices free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the MPN body.",
        ),
      },
      [CMA_CA98_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "UK CMA CA98 infringement decisions free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the decision body.",
        ),
      },
      [EMA_REFERRALS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "EMA human-medicine referral procedures free manifest",
          "Count, name, date, status, and official PDF URL. Not the procedure body.",
        ),
      },
      [CDER_REVIEWS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FDA CDER Integrated Reviews free manifest",
          "Count, name, date, application, and official PDF URL. Not the review body.",
        ),
      },
      [NPDES_PERMITS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "EPA individual NPDES permits free manifest",
          "Count, name, date, permit number, and official PDF URL. Not the permit body.",
        ),
      },
      [OFSTED_INSPECTIONS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "Ofsted inspection reports free manifest",
          "Count, provider, URN, date, and official PDF URL. Not the report body.",
        ),
      },
      [OFWAT_ENFORCEMENT_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "Ofwat enforcement notices free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the notice body.",
        ),
      },
      [OFGEM_ENFORCEMENT_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "Ofgem enforcement notices free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the notice body.",
        ),
      },
      [GAIN_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "USDA FAS GAIN attaché reports free manifest",
          "Count, report number, country, post, date, and official PDF URL. Not the attaché body.",
        ),
      },
      [ORR_ENFORCEMENT_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "ORR enforcement notices free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the notice body.",
        ),
      },
      [PHMSA_ORDERS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "PHMSA enforcement orders free manifest",
          "Count, operator, CPF, date, and official PDF URL. Not the order body.",
        ),
      },
      [AAIB_REPORTS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "AAIB investigation reports free manifest",
          "Count, title, registration, aircraft, date, and official PDF URL. Not the report body.",
        ),
      },
      [CSB_REPORTS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "CSB final investigation reports free manifest",
          "Count, facility, date, title, official page, and PDF URL. Not the PDF bytes.",
        ),
      },
      [HHS_OIG_REPORTS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "HHS OIG audit and evaluation reports free manifest",
          "Count, report number, date, title, official page, and PDF URL. Not the PDF bytes.",
        ),
      },
      [EIS_REPORTS_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "EPA NEPA EIS free manifest",
          "Count, CEQ number, date, title, and official e-NEPA page. Not the PDF bytes.",
        ),
      },
      [FSIS_HUMANE_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "FSIS humane-handling letters free manifest",
          "Count, establishment, letter type, date, and official PDF URL. Not the letter body.",
        ),
      },
      [EPA_CAFO_MANIFEST_PATH]: {
        get: freeOpenApiOp(
          "EPA CAFO / ESA letters free manifest",
          "Count, institution, docket, date, and official PDF URL. Not the letter body.",
        ),
      },
      ...(listed483
        ? {
            [FORM_483_MANIFEST_PATH]: {
              get: freeOpenApiOp(
                "FDA Form 483 free manifest",
                "Count, id, firm, and dates. Not the observation body.",
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
          `Streamable HTTP MCP for the same ${paidCountWord()} paid GETs. Not a paid SKU. Connect: npx -y mcp-remote https://ticks.bnm.farm/mcp`,
        ),
        post: freeOpenApiOp(
          "MCP JSON-RPC",
          `initialize / tools/list / tools/call. Each tool GETs the matching paid URL. Unpaid still HTTP 402.`,
        ),
      },
      "/": {
        get: freeOpenApiOp(
          "Shop discovery JSON",
          `payTo, network, and the ${paidCountWord()} public products.`,
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

function paidOptsFromReq(req: IncomingMessage, sku: DoorSku): PaidBodyOpts | undefined {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (isPdfCacheSku(sku)) {
    const id = url.searchParams.get("id")?.trim() || undefined;
    const before = url.searchParams.get("before")?.trim() || undefined;
    const since = url.searchParams.get("since")?.trim() || undefined;
    return { id, before, since };
  }
  if (isTableSku(sku)) {
    const since = url.searchParams.get("since")?.trim() || undefined;
    return since ? { since } : {};
  }
  if (!isExtractedBodySku(sku)) return undefined;
  const opts = paidBodyOptsFromSearch(url.searchParams);
  return opts.id || opts.before || opts.since || opts.page ? opts : {};
}

function sendNotModified(res: ServerResponse, etag: string): void {
  res.writeHead(304, {
    ETag: etag,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE, PAYMENT-RESPONSE, ETag",
  });
  res.end();
}

function paidEnvelope(body: unknown): { fetchedAt?: unknown; asOf?: unknown; records?: unknown; ids?: unknown; recordCount?: unknown } {
  return body && typeof body === "object" ? (body as { fetchedAt?: unknown; asOf?: unknown; records?: unknown; ids?: unknown; recordCount?: unknown }) : {};
}

function amountAtomicForRequest(sku: DoorSku, opts?: PaidBodyOpts): string {
  if (isExtractedBodySku(sku) && opts?.id) return SINGLE_DOC_AMOUNT_ATOMIC;
  return amountAtomicFor(sku);
}

async function servePaid(
  req: IncomingMessage,
  res: ServerResponse,
  port: number,
  sku: DoorSku,
  load: (opts?: PaidBodyOpts) => unknown | Promise<unknown>,
): Promise<void> {
  const copy = SKU_COPY[sku];
  const payment = paymentHeader(req);
  const opts = paidOptsFromReq(req, sku);
  const amount = amountAtomicForRequest(sku, opts);
  const resource = resourceUrl(req, port, paidBodyQueryPath(copy.resourcePath, opts));
  const body402 = paymentRequiredBody(resource, sku, amount);
  const v2 = paymentRequiredV2(resource, sku, amount);
  const paymentRequiredHeader = Buffer.from(JSON.stringify(v2), "utf-8").toString("base64");
  const wantsNotModified =
    Boolean(opts?.since) || Boolean(req.headers["if-none-match"]);

  const logPaid = (status: number) => {
    logShopRequest(req, {
      kind: "paid-door",
      path: copy.resourcePath,
      status,
      id: opts?.id,
      paymentHeader: Boolean(payment),
    });
  };

  const maybeNotModified = (body: unknown): boolean => {
    const envelope = paidEnvelope(body);
    const etag = etagFromPaidEnvelope(sku, envelope);
    const noneMatch = ifNoneMatchHits(req.headers["if-none-match"], etag);
    const emptySince =
      Boolean(opts?.since) && !opts?.id && isExtractedBodySku(sku) && Number(envelope.recordCount ?? 0) === 0;
    const tableSame =
      isTableSku(sku) &&
      (noneMatch ||
        tableUnchangedSince(
          {
            fetchedAt: typeof envelope.fetchedAt === "string" ? envelope.fetchedAt : null,
            asOf: typeof envelope.asOf === "string" ? envelope.asOf : null,
          },
          opts?.since,
        ));
    if (tableSame || (emptySince && !payment)) {
      logPaid(304);
      sendNotModified(res, etag);
      return true;
    }
    return false;
  };

  if (!payment) {
    if (wantsNotModified) {
      const peeked = await load(opts);
      if (maybeNotModified(peeked)) return;
    }
    logPaid(402);
    sendJson(res, 402, body402, { "PAYMENT-REQUIRED": paymentRequiredHeader });
    return;
  }

  const serve = async () => {
    const body = await load(opts);
    if (maybeNotModified(body)) return;
    const etag = etagFromPaidEnvelope(sku, paidEnvelope(body));
    logPaid(200);
    sendJson(res, 200, body, { ETag: etag });
  };

  if (skipSettle()) {
    await serve();
    return;
  }

  const accept = facilitatorPaymentRequirements(resource, sku, amount);
  const verified = await facilitatorVerify(payment, accept);
  if (verified && (await facilitatorSettle(payment, accept))) {
    await serve();
    return;
  }
  if (await localEip3009Settle(payment, accept)) {
    await serve();
    return;
  }
  logPaid(402);
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

function sendPdf(
  res: ServerResponse,
  status: number,
  bytes: Uint8Array,
  filename: string,
  extraHeaders: Record<string, string> = {},
): void {
  res.writeHead(status, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE, PAYMENT-RESPONSE, ETag",
    ...extraHeaders,
  });
  res.end(Buffer.from(bytes));
}

async function servePaidPdf(
  req: IncomingMessage,
  res: ServerResponse,
  port: number,
  sku: DoorSku,
  load: (opts?: PaidBodyOpts) => Promise<{ bytes: Uint8Array; filename: string } | null>,
): Promise<void> {
  const copy = SKU_COPY[sku];
  const payment = paymentHeader(req);
  const opts = paidOptsFromReq(req, sku);
  const amount = amountAtomicForRequest(sku, opts);
  const resource = resourceUrl(req, port, paidBodyQueryPath(copy.resourcePath, opts));
  const body402 = paymentRequiredBody(resource, sku, amount);
  const v2 = paymentRequiredV2(resource, sku, amount);
  const paymentRequiredHeader = Buffer.from(JSON.stringify(v2), "utf-8").toString("base64");

  const logPaid = (status: number) => {
    logShopRequest(req, {
      kind: "paid-door",
      path: copy.resourcePath,
      status,
      id: opts?.id,
      paymentHeader: Boolean(payment),
    });
  };

  if (!payment) {
    logPaid(402);
    sendJson(res, 402, body402, { "PAYMENT-REQUIRED": paymentRequiredHeader });
    return;
  }

  const serve = async () => {
    const packed = await load(opts);
    if (!packed) {
      logPaid(404);
      sendJson(res, 404, { error: "not_found", path: copy.resourcePath });
      return;
    }
    logPaid(200);
    sendPdf(res, 200, packed.bytes, packed.filename);
  };

  if (skipSettle()) {
    await serve();
    return;
  }

  const accept = facilitatorPaymentRequirements(resource, sku, amount);
  const verified = await facilitatorVerify(payment, accept);
  if (verified && (await facilitatorSettle(payment, accept))) {
    await serve();
    return;
  }
  if (await localEip3009Settle(payment, accept)) {
    await serve();
    return;
  }
  logPaid(402);
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

function isPaidDoorPath(path: string): boolean {
  return (Object.values(SKU_COPY) as { resourcePath: string }[]).some((copy) => copy.resourcePath === path);
}

async function drainRequestBody(req: IncomingMessage): Promise<void> {
  if (req.method !== "POST") return;
  await new Promise<void>((resolve, reject) => {
    req.on("data", () => {});
    req.on("end", resolve);
    req.on("error", reject);
  });
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse, port: number): Promise<void> {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const path = extractedCatalogPath(url.pathname.replace(/\/+$/, "") || "/");
  const paidDoorPost = req.method === "POST" && isPaidDoorPath(path);

  if (path === MCP_PATH) {
    const origin = discoveryOrigin(req, port);
    await handleMcpHttp(req, res, origin, {
      wellKnown: wellKnownX402(req, port),
      openApi: buildOpenApi(req, port),
    });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "X-PAYMENT, PAYMENT-SIGNATURE, Content-Type, If-None-Match",
      "Access-Control-Allow-Methods": isPaidDoorPath(path) ? "GET, POST, OPTIONS" : "GET, OPTIONS",
    });
    res.end();
    return;
  }

  if (req.method !== "GET" && !paidDoorPost) {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  if (paidDoorPost) await drainRequestBody(req);

  if (sendLocalShopRequestRollup(req, res)) return;

  if (path === "/") {
    sendJson(res, 200, {
      shop: "bnm-data-shop",
      note: BODY_PAGE_DISCOVERY,
      payTo: PAY_TO,
      network: NETWORK_V1,
      asset: USDC_BASE,
      openapi: OPENAPI_PATH,
      wellKnown: WELL_KNOWN_PATH,
      llmsTxt: LLMS_PATH,
      mcp: MCP_PATH,
      sample: SAMPLE_PATH,
      firmCheck: FIRM_CHECK_PATH,
      products: [
        {
          path: TICKS_PATH,
          product: PRODUCT_PUBLIC_ID,
          priceUsdc: usdcPriceString(amountAtomicFor("ticks")),
          amountAtomic: amountAtomicFor("ticks"),
          manifest: MANIFEST_PATH,
        },
        {
          path: IMPORT_ALERTS_PATH,
          product: "fda-import-alerts",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("import-alerts"),
          manifest: IMPORT_ALERTS_MANIFEST_PATH,
        },
        {
          path: MARINERS_PATH,
          product: "uscg-d13-lnm",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("mariners"),
          manifest: MARINERS_MANIFEST_PATH,
        },
        {
          path: MARINERS_D11_PATH,
          product: D11_SPEC.productId,
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("mariners-d11"),
          manifest: MARINERS_D11_MANIFEST_PATH,
        },
        {
          path: MARINERS_D7_PATH,
          product: D7_SPEC.productId,
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("mariners-d7"),
          manifest: MARINERS_D7_MANIFEST_PATH,
        },
        {
          path: MARINERS_D8_PATH,
          product: D8_SPEC.productId,
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("mariners-d8"),
          manifest: MARINERS_D8_MANIFEST_PATH,
        },
        {
          path: WARNING_LETTERS_PATH,
          product: "fda-warning-letter-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("warning-letters"),
          manifest: WARNING_LETTERS_MANIFEST_PATH,
        },
        {
          path: UNTITLED_LETTERS_PATH,
          product: "fda-untitled-letter-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("untitled-letters"),
          manifest: UNTITLED_LETTERS_MANIFEST_PATH,
        },
        {
          path: AWA_PATH,
          product: "aphis-awa-inspection-observation-text",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("awa"),
          manifest: AWA_MANIFEST_PATH,
        },
        {
          path: SWISSPAR_PATH,
          product: "swisspar-first-auth",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("swisspar"),
          manifest: SWISSPAR_MANIFEST_PATH,
        },
        {
          path: PCAC_PATH,
          product: "fda-pcac-503a-memos",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("pcac"),
          manifest: PCAC_MANIFEST_PATH,
        },
        {
          path: FTC_WL_PATH,
          product: "ftc-bcp-warning-letter-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ftc-wl"),
          manifest: FTC_WL_MANIFEST_PATH,
        },
        {
          path: CFPB_ORDERS_PATH,
          product: "cfpb-consent-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("cfpb-orders"),
          manifest: CFPB_ORDERS_MANIFEST_PATH,
        },
        {
          path: OCC_CD_PATH,
          product: "occ-institution-cd-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("occ-cd"),
          manifest: OCC_CD_MANIFEST_PATH,
        },
        {
          path: FDIC_ORDERS_PATH,
          product: "fdic-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("fdic-orders"),
          manifest: FDIC_ORDERS_MANIFEST_PATH,
        },
        {
          path: FRB_ORDERS_PATH,
          product: "frb-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("frb-orders"),
          manifest: FRB_ORDERS_MANIFEST_PATH,
        },
        {
          path: NCUA_ORDERS_PATH,
          product: "ncua-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ncua-orders"),
          manifest: NCUA_ORDERS_MANIFEST_PATH,
        },
        {
          path: FINCEN_ORDERS_PATH,
          product: "fincen-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("fincen-orders"),
          manifest: FINCEN_ORDERS_MANIFEST_PATH,
        },
        {
          path: FERC_ORDERS_PATH,
          product: "ferc-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ferc-orders"),
          manifest: FERC_ORDERS_MANIFEST_PATH,
        },
        {
          path: OFAC_ORDERS_PATH,
          product: "ofac-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ofac-orders"),
          manifest: OFAC_ORDERS_MANIFEST_PATH,
        },
        {
          path: BIS_ORDERS_PATH,
          product: "bis-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("bis-orders"),
          manifest: BIS_ORDERS_MANIFEST_PATH,
        },
        {
          path: CFTC_ORDERS_PATH,
          product: "cftc-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("cftc-orders"),
          manifest: CFTC_ORDERS_MANIFEST_PATH,
        },
        {
          path: FIFRA_ORDERS_PATH,
          product: "fifra-institution-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("fifra-orders"),
          manifest: FIFRA_ORDERS_MANIFEST_PATH,
        },
        {
          path: DENOVO_ORDERS_PATH,
          product: "fda-denovo-classification-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("denovo-orders"),
          manifest: DENOVO_ORDERS_MANIFEST_PATH,
        },
        {
          path: TTB_OIC_PATH,
          product: "ttb-institution-oic-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ttb-oic"),
          manifest: TTB_OIC_MANIFEST_PATH,
        },
        {
          path: AIR_LETTERS_PATH,
          product: "aphis-air-confirmation-letter-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("air-letters"),
          manifest: AIR_LETTERS_MANIFEST_PATH,
        },
        {
          path: SUPERFUND_RODS_PATH,
          product: "epa-superfund-rod-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("superfund-rods"),
          manifest: SUPERFUND_RODS_MANIFEST_PATH,
        },
        {
          path: ICO_MPN_PATH,
          product: "ico-institution-mpn-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ico-mpn"),
          manifest: ICO_MPN_MANIFEST_PATH,
        },
        {
          path: CMA_CA98_PATH,
          product: "cma-ca98-infringement-decision-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("cma-ca98"),
          manifest: CMA_CA98_MANIFEST_PATH,
        },
        {
          path: EMA_REFERRALS_PATH,
          product: "ema-referral-procedure-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ema-referrals"),
          manifest: EMA_REFERRALS_MANIFEST_PATH,
        },
        {
          path: CDER_REVIEWS_PATH,
          product: "fda-cder-integrated-review-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("cder-reviews"),
          manifest: CDER_REVIEWS_MANIFEST_PATH,
        },
        {
          path: NPDES_PERMITS_PATH,
          product: "epa-npdes-individual-permit-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("npdes-permits"),
          manifest: NPDES_PERMITS_MANIFEST_PATH,
        },
        {
          path: OFSTED_INSPECTIONS_PATH,
          product: "ofsted-inspection-report-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ofsted-inspections"),
          manifest: OFSTED_INSPECTIONS_MANIFEST_PATH,
        },
        {
          path: OFWAT_ENFORCEMENT_PATH,
          product: "ofwat-wia91-enforcement-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ofwat-enforcement"),
          manifest: OFWAT_ENFORCEMENT_MANIFEST_PATH,
        },
        {
          path: OFGEM_ENFORCEMENT_PATH,
          product: "ofgem-enforcement-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("ofgem-enforcement"),
          manifest: OFGEM_ENFORCEMENT_MANIFEST_PATH,
        },
        {
          path: GAIN_PATH,
          product: "gain-attache-report-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("gain"),
          manifest: GAIN_MANIFEST_PATH,
        },
        {
          path: ORR_ENFORCEMENT_PATH,
          product: "orr-enforcement-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("orr-enforcement"),
          manifest: ORR_ENFORCEMENT_MANIFEST_PATH,
        },
        {
          path: PHMSA_ORDERS_PATH,
          product: "phmsa-enforcement-order-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("phmsa-orders"),
          manifest: PHMSA_ORDERS_MANIFEST_PATH,
        },
        {
          path: AAIB_REPORTS_PATH,
          product: "aaib-investigation-report-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("aaib-reports"),
          manifest: AAIB_REPORTS_MANIFEST_PATH,
        },
        {
          path: CSB_REPORTS_PATH,
          product: "csb-final-investigation-report-pdfs",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("csb-reports"),
          manifest: CSB_REPORTS_MANIFEST_PATH,
        },
        {
          path: HHS_OIG_REPORTS_PATH,
          product: "hhs-oig-audit-evaluation-report-pdfs",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("hhs-oig-reports"),
          manifest: HHS_OIG_REPORTS_MANIFEST_PATH,
        },
        {
          path: EIS_REPORTS_PATH,
          product: "epa-nepa-eis-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("eis-reports"),
          manifest: EIS_REPORTS_MANIFEST_PATH,
        },
        {
          path: FSIS_HUMANE_PATH,
          product: "fsis-humane-letter-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("fsis-humane"),
          manifest: FSIS_HUMANE_MANIFEST_PATH,
        },
        {
          path: EPA_CAFO_PATH,
          product: "epa-cafo-letter-bodies",
          priceUsdc: "0.05",
          amountAtomic: amountAtomicFor("epa-cafo"),
          manifest: EPA_CAFO_MANIFEST_PATH,
        },
        ...(form483IsPublic()
          ? [
              {
                path: FORM_483_PATH,
                product: "fda-form-483-bodies",
                priceUsdc: "0.05",
                amountAtomic: amountAtomicFor("form-483"),
                manifest: FORM_483_MANIFEST_PATH,
              },
            ]
          : []),
        ...(gmpIsPublic()
          ? [
              {
                path: GMP_PATH,
                product: "hc-gmp-report-cards",
                priceUsdc: "0.05",
                amountAtomic: amountAtomicFor("gmp"),
                manifest: GMP_MANIFEST_PATH,
              },
            ]
          : []),
        ...(gmpMdIsPublic()
          ? [
              {
                path: GMP_MD_PATH,
                product: "hc-md-inspection-cards",
                priceUsdc: "0.05",
                amountAtomic: amountAtomicFor("gmp-md"),
                manifest: GMP_MD_MANIFEST_PATH,
              },
            ]
          : []),
      ],
    });
    return;
  }

  if (path === WELL_KNOWN_PATH || path === "/.well-known/x402.json") {
    sendJson(res, 200, wellKnownX402(req, port));
    return;
  }

  if (path === OPENAPI_PATH) {
    sendJson(res, 200, buildOpenApi(req, port));
    return;
  }

  if (path === LLMS_PATH) {
    sendText(res, 200, llmsTxt(), "text/markdown; charset=utf-8");
    return;
  }

  if (path === SAMPLE_PATH) {
    sendJson(res, 200, shopPaidJsonSample());
    return;
  }

  if (path === FIRM_CHECK_PATH) {
    const q = firmCheckQuery(url.searchParams.get("q"));
    if (!q) {
      logShopRequest(req, { kind: "firm-check", path, status: 400, q: url.searchParams.get("q") ?? "" });
      sendJson(res, 400, { error: "q_required" });
      return;
    }
    const result = await runFirmCheck(q);
    logShopRequest(req, { kind: "firm-check", path, status: 200, q, matchCount: result.matchCount });
    sendJson(res, 200, result);
    return;
  }

  if (path === X402LIST_PATH) {
    sendText(res, 200, X402LIST_BODY, "text/plain");
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
    sendJson(res, 200, withShopDiscovery(await loadMarinersManifest(), req, port));
    return;
  }

  if (path === MARINERS_D11_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadMarinersD11Manifest(), req, port));
    return;
  }

  if (path === MARINERS_D7_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadMarinersD7Manifest(), req, port));
    return;
  }

  if (path === MARINERS_D8_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadMarinersD8Manifest(), req, port));
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
    sendExtractedManifest(req, res, port, url, await loadWarningLettersManifest());
    return;
  }

  if (path === WARNING_LETTERS_PATH) {
    await servePaid(req, res, port, "warning-letters", async (opts) => paidWarningLettersBody(await loadWarningLetters(), opts));
    return;
  }

  if (path === UNTITLED_LETTERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadUntitledLettersManifest());
    return;
  }

  if (path === UNTITLED_LETTERS_PATH) {
    await servePaid(req, res, port, "untitled-letters", async (opts) => paidUntitledLettersBody(await loadUntitledLetters(), opts));
    return;
  }

  if (path === AWA_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadAwaManifest());
    return;
  }

  if (path === AWA_PATH) {
    await servePaid(req, res, port, "awa", async (opts) => paidAwaBody(await loadAwa(), opts));
    return;
  }

  if (path === SWISSPAR_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadSwissparManifest());
    return;
  }

  if (path === SWISSPAR_PATH) {
    await servePaid(req, res, port, "swisspar", async (opts) => paidSwissparBody(await loadSwisspar(), opts));
    return;
  }

  if (path === PCAC_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadPcacManifest());
    return;
  }

  if (path === PCAC_PATH) {
    await servePaid(req, res, port, "pcac", async (opts) => paidPcacBody(await loadPcac(), opts));
    return;
  }

  if (path === FTC_WL_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadFtcWlManifest());
    return;
  }

  if (path === FTC_WL_PATH) {
    await servePaid(req, res, port, "ftc-wl", async (opts) => paidFtcWlBody(await loadFtcWl(), opts));
    return;
  }

  if (path === CFPB_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadCfpbOrdersManifest());
    return;
  }

  if (path === CFPB_ORDERS_PATH) {
    await servePaid(req, res, port, "cfpb-orders", async (opts) => paidCfpbOrdersBody(await loadCfpbOrders(), opts));
    return;
  }

  if (path === OCC_CD_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadOccCdManifest());
    return;
  }

  if (path === OCC_CD_PATH) {
    await servePaid(req, res, port, "occ-cd", async (opts) => paidOccCdBody(await loadOccCd(), opts));
    return;
  }

  if (path === FDIC_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadFdicOrdersManifest());
    return;
  }

  if (path === FDIC_ORDERS_PATH) {
    await servePaid(req, res, port, "fdic-orders", async (opts) => paidFdicOrdersBody(await loadFdicOrders(), opts));
    return;
  }

  if (path === FRB_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadFrbOrdersManifest());
    return;
  }

  if (path === FRB_ORDERS_PATH) {
    await servePaid(req, res, port, "frb-orders", async (opts) => paidFrbOrdersBody(await loadFrbOrders(), opts));
    return;
  }

  if (path === NCUA_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadNcuaOrdersManifest());
    return;
  }

  if (path === NCUA_ORDERS_PATH) {
    await servePaid(req, res, port, "ncua-orders", async (opts) => paidNcuaOrdersBody(await loadNcuaOrders(), opts));
    return;
  }

  if (path === FINCEN_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadFincenOrdersManifest());
    return;
  }

  if (path === FINCEN_ORDERS_PATH) {
    await servePaid(req, res, port, "fincen-orders", async (opts) => paidFincenOrdersBody(await loadFincenOrders(), opts));
    return;
  }

  if (path === FERC_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadFercOrdersManifest());
    return;
  }

  if (path === FERC_ORDERS_PATH) {
    await servePaid(req, res, port, "ferc-orders", async (opts) => paidFercOrdersBody(await loadFercOrders(), opts));
    return;
  }

  if (path === OFAC_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadOfacOrdersManifest());
    return;
  }

  if (path === OFAC_ORDERS_PATH) {
    await servePaid(req, res, port, "ofac-orders", async (opts) => paidOfacOrdersBody(await loadOfacOrders(), opts));
    return;
  }

  if (path === BIS_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadBisOrdersManifest());
    return;
  }

  if (path === BIS_ORDERS_PATH) {
    await servePaid(req, res, port, "bis-orders", async (opts) => paidBisOrdersBody(await loadBisOrders(), opts));
    return;
  }

  if (path === CFTC_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadCftcOrdersManifest());
    return;
  }

  if (path === CFTC_ORDERS_PATH) {
    await servePaid(req, res, port, "cftc-orders", async (opts) => paidCftcOrdersBody(await loadCftcOrders(), opts));
    return;
  }

  if (path === FIFRA_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadFifraOrdersManifest());
    return;
  }

  if (path === FIFRA_ORDERS_PATH) {
    await servePaid(req, res, port, "fifra-orders", async (opts) => paidFifraOrdersBody(await loadFifraOrders(), opts));
    return;
  }

  if (path === DENOVO_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadDenovoOrdersManifest());
    return;
  }

  if (path === DENOVO_ORDERS_PATH) {
    await servePaid(req, res, port, "denovo-orders", async (opts) => paidDenovoOrdersBody(await loadDenovoOrders(), opts));
    return;
  }

  if (path === TTB_OIC_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadTtbOicManifest());
    return;
  }

  if (path === TTB_OIC_PATH) {
    await servePaid(req, res, port, "ttb-oic", async (opts) => paidTtbOicBody(await loadTtbOic(), opts));
    return;
  }

  if (path === AIR_LETTERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadAirLettersManifest());
    return;
  }

  if (path === AIR_LETTERS_PATH) {
    await servePaid(req, res, port, "air-letters", async (opts) => paidAirLettersBody(await loadAirLetters(), opts));
    return;
  }

  if (path === SUPERFUND_RODS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadSuperfundRodsManifest());
    return;
  }

  if (path === SUPERFUND_RODS_PATH) {
    await servePaid(req, res, port, "superfund-rods", async (opts) => paidSuperfundRodsBody(await loadSuperfundRods(), opts));
    return;
  }

  if (path === ICO_MPN_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadIcoMpnManifest());
    return;
  }

  if (path === ICO_MPN_PATH) {
    await servePaid(req, res, port, "ico-mpn", async (opts) => paidIcoMpnBody(await loadIcoMpn(), opts));
    return;
  }

  if (path === CMA_CA98_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadCmaCa98Manifest());
    return;
  }

  if (path === CMA_CA98_PATH) {
    await servePaid(req, res, port, "cma-ca98", async (opts) => paidCmaCa98Body(await loadCmaCa98(), opts));
    return;
  }

  if (path === EMA_REFERRALS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadEmaReferralsManifest());
    return;
  }

  if (path === EMA_REFERRALS_PATH) {
    await servePaid(req, res, port, "ema-referrals", async (opts) => paidEmaReferralsBody(await loadEmaReferrals(), opts));
    return;
  }

  if (path === CDER_REVIEWS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadCderReviewsManifest());
    return;
  }

  if (path === CDER_REVIEWS_PATH) {
    await servePaid(req, res, port, "cder-reviews", async (opts) => paidCderReviewsBody(await loadCderReviews(), opts));
    return;
  }

  if (path === NPDES_PERMITS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadNpdesPermitsManifest());
    return;
  }

  if (path === NPDES_PERMITS_PATH) {
    await servePaid(req, res, port, "npdes-permits", async (opts) => paidNpdesPermitsBody(await loadNpdesPermits(), opts));
    return;
  }

  if (path === OFSTED_INSPECTIONS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadOfstedInspectionsManifest());
    return;
  }

  if (path === OFSTED_INSPECTIONS_PATH) {
    await servePaid(req, res, port, "ofsted-inspections", async (opts) => paidOfstedInspectionsBody(await loadOfstedInspections(), opts));
    return;
  }

  if (path === OFWAT_ENFORCEMENT_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadOfwatEnforcementManifest());
    return;
  }

  if (path === OFWAT_ENFORCEMENT_PATH) {
    await servePaid(req, res, port, "ofwat-enforcement", async (opts) => paidOfwatEnforcementBody(await loadOfwatEnforcement(), opts));
    return;
  }

  if (path === OFGEM_ENFORCEMENT_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadOfgemEnforcementManifest());
    return;
  }

  if (path === OFGEM_ENFORCEMENT_PATH) {
    await servePaid(req, res, port, "ofgem-enforcement", async (opts) => paidOfgemEnforcementBody(await loadOfgemEnforcement(), opts));
    return;
  }

  if (path === GAIN_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadGainManifest());
    return;
  }

  if (path === GAIN_PATH) {
    await servePaid(req, res, port, "gain", async (opts) => paidGainBody(await loadGain(), opts));
    return;
  }

  if (path === ORR_ENFORCEMENT_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadOrrEnforcementManifest());
    return;
  }

  if (path === ORR_ENFORCEMENT_PATH) {
    await servePaid(req, res, port, "orr-enforcement", async (opts) => paidOrrEnforcementBody(await loadOrrEnforcement(), opts));
    return;
  }

  if (path === PHMSA_ORDERS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadPhmsaOrdersManifest());
    return;
  }

  if (path === PHMSA_ORDERS_PATH) {
    await servePaid(req, res, port, "phmsa-orders", async (opts) => paidPhmsaOrdersBody(await loadPhmsaOrders(), opts));
    return;
  }

  if (path === AAIB_REPORTS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadAaibReportsManifest());
    return;
  }

  if (path === AAIB_REPORTS_PATH) {
    await servePaid(req, res, port, "aaib-reports", async (opts) => paidAaibReportsBody(await loadAaibReports(), opts));
    return;
  }

  if (path === CSB_REPORTS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadCsbReportsManifest(url.searchParams.get("q") ?? undefined), req, port));
    return;
  }

  if (path === CSB_REPORTS_PATH) {
    await servePaidPdf(req, res, port, "csb-reports", async (opts) => {
      const snap = await loadCsbReports();
      const card = selectCsbReportCard(snap, { id: opts?.id, before: opts?.before });
      if (!card) return null;
      const bytes = readCachedPdf(card);
      if (!bytes) return null;
      return { bytes, filename: `${card.id}.pdf` };
    });
    return;
  }

  if (path === HHS_OIG_REPORTS_MANIFEST_PATH) {
    sendJson(res, 200, withShopDiscovery(await loadHhsOigReportsManifest(url.searchParams.get("q") ?? undefined), req, port));
    return;
  }

  if (path === HHS_OIG_REPORTS_PATH) {
    await servePaidPdf(req, res, port, "hhs-oig-reports", async (opts) => {
      const snap = await loadHhsOigReports();
      const card = selectHhsOigReportCard(snap, { id: opts?.id, before: opts?.before });
      if (!card) return null;
      const bytes = readCachedHhsOigPdf(card);
      if (!bytes) return null;
      return { bytes, filename: `${card.id}.pdf` };
    });
    return;
  }

  if (path === EIS_REPORTS_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadEisReportsManifest());
    return;
  }

  if (path === EIS_REPORTS_PATH) {
    await servePaid(req, res, port, "eis-reports", async (opts) => paidEisReportsBody(await loadEisReports(), opts));
    return;
  }

  if (path === FSIS_HUMANE_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadFsisHumaneManifest());
    return;
  }

  if (path === FSIS_HUMANE_PATH) {
    await servePaid(req, res, port, "fsis-humane", async (opts) => paidFsisHumaneBody(await loadFsisHumane(), opts));
    return;
  }

  if (path === EPA_CAFO_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadEpaCafoManifest());
    return;
  }

  if (path === EPA_CAFO_PATH) {
    await servePaid(req, res, port, "epa-cafo", async (opts) => paidEpaCafoBody(await loadEpaCafo(), opts));
    return;
  }

  if (path === FORM_483_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadForm483Manifest());
    return;
  }

  if (path === FORM_483_PATH) {
    await servePaid(req, res, port, "form-483", async (opts) => paidForm483Body(await loadForm483(), opts));
    return;
  }

  if (path === GMP_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadGmpManifest());
    return;
  }

  if (path === GMP_PATH) {
    await servePaid(req, res, port, "gmp", async (opts) => paidGmpBody(await loadGmp(), opts));
    return;
  }

  if (path === GMP_MD_MANIFEST_PATH) {
    sendExtractedManifest(req, res, port, url, await loadGmpMdManifest());
    return;
  }

  if (path === GMP_MD_PATH) {
    await servePaid(req, res, port, "gmp-md", async (opts) => paidGmpMdBody(await loadGmpMd(), opts));
    return;
  }

  if (path === TICKS_PATH) {
    await servePaid(req, res, port, "ticks", () => paidTicksBody(loadTicks()));
    return;
  }

  sendJson(res, 404, { error: "not_found", paths: [TICKS_PATH, MANIFEST_PATH, CATALOG_PATH, IMPORT_ALERTS_PATH, IMPORT_ALERTS_MANIFEST_PATH, MARINERS_PATH, MARINERS_MANIFEST_PATH, MARINERS_D11_PATH, MARINERS_D11_MANIFEST_PATH, MARINERS_D7_PATH, MARINERS_D7_MANIFEST_PATH, MARINERS_D8_PATH, MARINERS_D8_MANIFEST_PATH, WARNING_LETTERS_PATH, WARNING_LETTERS_MANIFEST_PATH, UNTITLED_LETTERS_PATH, UNTITLED_LETTERS_MANIFEST_PATH, AWA_PATH, AWA_MANIFEST_PATH, SWISSPAR_PATH, SWISSPAR_MANIFEST_PATH, PCAC_PATH, PCAC_MANIFEST_PATH, FTC_WL_PATH, FTC_WL_MANIFEST_PATH, CFPB_ORDERS_PATH, CFPB_ORDERS_MANIFEST_PATH, OCC_CD_PATH, OCC_CD_MANIFEST_PATH, FDIC_ORDERS_PATH, FDIC_ORDERS_MANIFEST_PATH, FRB_ORDERS_PATH, FRB_ORDERS_MANIFEST_PATH, NCUA_ORDERS_PATH, NCUA_ORDERS_MANIFEST_PATH, FINCEN_ORDERS_PATH, FINCEN_ORDERS_MANIFEST_PATH, FERC_ORDERS_PATH, FERC_ORDERS_MANIFEST_PATH, OFAC_ORDERS_PATH, OFAC_ORDERS_MANIFEST_PATH, BIS_ORDERS_PATH, BIS_ORDERS_MANIFEST_PATH, CFTC_ORDERS_PATH, CFTC_ORDERS_MANIFEST_PATH, FIFRA_ORDERS_PATH, FIFRA_ORDERS_MANIFEST_PATH, DENOVO_ORDERS_PATH, DENOVO_ORDERS_MANIFEST_PATH, TTB_OIC_PATH, TTB_OIC_MANIFEST_PATH, AIR_LETTERS_PATH, AIR_LETTERS_MANIFEST_PATH, SUPERFUND_RODS_PATH, SUPERFUND_RODS_MANIFEST_PATH, ICO_MPN_PATH, ICO_MPN_MANIFEST_PATH, CMA_CA98_PATH, CMA_CA98_MANIFEST_PATH, EMA_REFERRALS_PATH, EMA_REFERRALS_MANIFEST_PATH, CDER_REVIEWS_PATH, CDER_REVIEWS_MANIFEST_PATH, NPDES_PERMITS_PATH, NPDES_PERMITS_MANIFEST_PATH, OFSTED_INSPECTIONS_PATH, OFSTED_INSPECTIONS_MANIFEST_PATH, OFWAT_ENFORCEMENT_PATH, OFWAT_ENFORCEMENT_MANIFEST_PATH, OFGEM_ENFORCEMENT_PATH, OFGEM_ENFORCEMENT_MANIFEST_PATH, GAIN_PATH, GAIN_MANIFEST_PATH, ORR_ENFORCEMENT_PATH, ORR_ENFORCEMENT_MANIFEST_PATH, PHMSA_ORDERS_PATH, PHMSA_ORDERS_MANIFEST_PATH, AAIB_REPORTS_PATH, AAIB_REPORTS_MANIFEST_PATH, CSB_REPORTS_PATH, CSB_REPORTS_MANIFEST_PATH, HHS_OIG_REPORTS_PATH, HHS_OIG_REPORTS_MANIFEST_PATH, EIS_REPORTS_PATH, EIS_REPORTS_MANIFEST_PATH, FSIS_HUMANE_PATH, FSIS_HUMANE_MANIFEST_PATH, EPA_CAFO_PATH, EPA_CAFO_MANIFEST_PATH, FORM_483_PATH, FORM_483_MANIFEST_PATH, GMP_PATH, GMP_MANIFEST_PATH, GMP_MD_PATH, GMP_MD_MANIFEST_PATH, SAMPLE_PATH, FIRM_CHECK_PATH, X402LIST_PATH, WELL_KNOWN_PATH, OPENAPI_PATH, LLMS_PATH, MCP_PATH] });
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
    console.error(`${TICKS_PATH} $${Number(amountAtomicFor("ticks")) / 1e6} USDC`);
    console.error(`${IMPORT_ALERTS_PATH} $${Number(amountAtomicFor("import-alerts")) / 1e6} USDC`);
    console.error(`${MARINERS_PATH} $${Number(amountAtomicFor("mariners")) / 1e6} USDC`);
    console.error(`${MARINERS_D11_PATH} $${Number(amountAtomicFor("mariners-d11")) / 1e6} USDC`);
    console.error(`${MARINERS_D7_PATH} $${Number(amountAtomicFor("mariners-d7")) / 1e6} USDC`);
    console.error(`${MARINERS_D8_PATH} $${Number(amountAtomicFor("mariners-d8")) / 1e6} USDC`);
    console.error(`${WARNING_LETTERS_PATH} $${Number(amountAtomicFor("warning-letters")) / 1e6} USDC`);
    console.error(`${UNTITLED_LETTERS_PATH} $${Number(amountAtomicFor("untitled-letters")) / 1e6} USDC`);
    console.error(`${AWA_PATH} $${Number(amountAtomicFor("awa")) / 1e6} USDC`);
    console.error(`${SWISSPAR_PATH} $${Number(amountAtomicFor("swisspar")) / 1e6} USDC`);
    console.error(`${PCAC_PATH} $${Number(amountAtomicFor("pcac")) / 1e6} USDC`);
    console.error(`${FTC_WL_PATH} $${Number(amountAtomicFor("ftc-wl")) / 1e6} USDC`);
    console.error(`${CFPB_ORDERS_PATH} $${Number(amountAtomicFor("cfpb-orders")) / 1e6} USDC`);
    console.error(`${OCC_CD_PATH} $${Number(amountAtomicFor("occ-cd")) / 1e6} USDC`);
    console.error(`${FDIC_ORDERS_PATH} $${Number(amountAtomicFor("fdic-orders")) / 1e6} USDC`);
    console.error(`${FRB_ORDERS_PATH} $${Number(amountAtomicFor("frb-orders")) / 1e6} USDC`);
    console.error(`${NCUA_ORDERS_PATH} $${Number(amountAtomicFor("ncua-orders")) / 1e6} USDC`);
    console.error(`${FINCEN_ORDERS_PATH} $${Number(amountAtomicFor("fincen-orders")) / 1e6} USDC`);
    console.error(`${FERC_ORDERS_PATH} $${Number(amountAtomicFor("ferc-orders")) / 1e6} USDC`);
    console.error(`${OFAC_ORDERS_PATH} $${Number(amountAtomicFor("ofac-orders")) / 1e6} USDC`);
    console.error(`${BIS_ORDERS_PATH} $${Number(amountAtomicFor("bis-orders")) / 1e6} USDC`);
    console.error(`${CFTC_ORDERS_PATH} $${Number(amountAtomicFor("cftc-orders")) / 1e6} USDC`);
    console.error(`${FIFRA_ORDERS_PATH} $${Number(amountAtomicFor("fifra-orders")) / 1e6} USDC`);
    console.error(`${DENOVO_ORDERS_PATH} $${Number(amountAtomicFor("denovo-orders")) / 1e6} USDC`);
    console.error(`${TTB_OIC_PATH} $${Number(amountAtomicFor("ttb-oic")) / 1e6} USDC`);
    console.error(`${AIR_LETTERS_PATH} $${Number(amountAtomicFor("air-letters")) / 1e6} USDC`);
    console.error(`${SUPERFUND_RODS_PATH} $${Number(amountAtomicFor("superfund-rods")) / 1e6} USDC`);
    console.error(`${ICO_MPN_PATH} $${Number(amountAtomicFor("ico-mpn")) / 1e6} USDC`);
    console.error(`${CMA_CA98_PATH} $${Number(amountAtomicFor("cma-ca98")) / 1e6} USDC`);
    console.error(`${EMA_REFERRALS_PATH} $${Number(amountAtomicFor("ema-referrals")) / 1e6} USDC`);
    console.error(`${CDER_REVIEWS_PATH} $${Number(amountAtomicFor("cder-reviews")) / 1e6} USDC`);
    console.error(`${NPDES_PERMITS_PATH} $${Number(amountAtomicFor("npdes-permits")) / 1e6} USDC`);
    console.error(`${OFSTED_INSPECTIONS_PATH} $${Number(amountAtomicFor("ofsted-inspections")) / 1e6} USDC`);
    console.error(`${OFWAT_ENFORCEMENT_PATH} $${Number(amountAtomicFor("ofwat-enforcement")) / 1e6} USDC`);
    console.error(`${OFGEM_ENFORCEMENT_PATH} $${Number(amountAtomicFor("ofgem-enforcement")) / 1e6} USDC`);
    console.error(`${GAIN_PATH} $${Number(amountAtomicFor("gain")) / 1e6} USDC`);
    console.error(`${ORR_ENFORCEMENT_PATH} $${Number(amountAtomicFor("orr-enforcement")) / 1e6} USDC`);
    console.error(`${PHMSA_ORDERS_PATH} $${Number(amountAtomicFor("phmsa-orders")) / 1e6} USDC`);
    console.error(`${AAIB_REPORTS_PATH} $${Number(amountAtomicFor("aaib-reports")) / 1e6} USDC`);
    console.error(`${CSB_REPORTS_PATH} $${Number(amountAtomicFor("csb-reports")) / 1e6} USDC`);
    console.error(`${HHS_OIG_REPORTS_PATH} $${Number(amountAtomicFor("hhs-oig-reports")) / 1e6} USDC`);
    console.error(`${EIS_REPORTS_PATH} $${Number(amountAtomicFor("eis-reports")) / 1e6} USDC`);
    console.error(`${FSIS_HUMANE_PATH} $${Number(amountAtomicFor("fsis-humane")) / 1e6} USDC`);
    console.error(`${EPA_CAFO_PATH} $${Number(amountAtomicFor("epa-cafo")) / 1e6} USDC`);
    console.error(`${FORM_483_PATH} $${Number(amountAtomicFor("form-483")) / 1e6} USDC${form483IsPublic() ? "" : " (unlisted until a real 483 body is cached)"}`);
    console.error(`${GMP_PATH} $${Number(amountAtomicFor("gmp")) / 1e6} USDC${gmpIsPublic() ? "" : " (unlisted until a real GMP observation body is cached)"}`);
    console.error(`${GMP_MD_PATH} $${Number(amountAtomicFor("gmp-md")) / 1e6} USDC${gmpMdIsPublic() ? "" : " (unlisted until a real MD observation body is cached)"}`);
    console.error(`mcp ${MCP_PATH} — ${paidDiscoveryPaths().length} tools from ${WELL_KNOWN_PATH}`);
    console.error(`payTo ${PAY_TO} USDC ${USDC_BASE} on Base`);
    console.error(`ticksDir ${ticksDir() || "(unset)"}`);
    console.error(`board ${board && existsSync(board) ? board : "missing — paid /ticks body will be empty/stale"}`);
    console.error(`shop request log ${shopRequestLogPath()} (rollup: node build/shop-request-log.js or GET ${SHOP_REQUEST_LOG_ROLLUP_PATH} on loopback)`);
  });
}
