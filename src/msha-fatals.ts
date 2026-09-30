#!/usr/bin/env node
/**
 * MSHA Fatality Investigation Final Report TEXT door.
 * Official Final Report PDFs on msha.gov. Preliminary reports and fatality
 * alerts are not this SKU. 17 U.S.C. § 105. Same extracted-body pipe as
 * /fmshrc-orders (which stays the FMSHRC decision door).
 * Search: https://www.msha.gov/data-and-reports/fatality-reports/search
 * Paid locator (stripped from the free manifest): the final-report HTML page.
 * The PDF file URL is not copied onto the free catalog.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const MSHA_FATALS_PATH = "/msha-fatals";
export const MSHA_FATALS_MANIFEST_PATH = "/msha-fatals/manifest.json";
export const MSHA_FATALS_AMOUNT_ATOMIC = "50000";
export const MSHA_FATALS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "msha-fatality-final-bodies";
export const PRODUCT_NAME = "MSHA Fatality Investigation Final Report text";

export const SEARCH_URL = "https://www.msha.gov/data-and-reports/fatality-reports/search";
export const ORIGIN = "https://www.msha.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Mine Safety and Health Administration. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const SECTORS = ["coal", "metal/nonmetal"] as const;
export type MshaSector = (typeof SECTORS)[number];

export const DEER_RUN_ID = "FAI-F00BE1D-1";
export const PANTHER_EAGLE_ID = "FAI-6322887-1";
export const OHIO_COUNTY_ID = "FAI-F0143E4-1";
export const DANBY_ID = "FAI-F031904-1";
export const BAILEY_ID = "FAI-F012928-1";

export const DEER_RUN_PAGE =
  "https://www.msha.gov/data-reports/fatality-reports/2026/march-5-2026-fatality/final-report";
export const PANTHER_EAGLE_PAGE =
  "https://www.msha.gov/data-reports/fatality-reports/2026/april-2-2026-fatality/final-report";
export const OHIO_COUNTY_PAGE =
  "https://www.msha.gov/data-reports/fatality-reports/2026/april-3-2026-fatality/final-report";

/** Body needles that stay off the free catalog. */
export const BODY_NEEDLE_DEER_RUN = "miner wearable component";
export const BODY_NEEDLE_PANTHER = "9554305";
export const BODY_NEEDLE_OHIO = "written policies and procedures addressing repairs";

const REPORT_ID_RE = /\b(FAI-[A-Z0-9]+-\d+)\b/;
const FINAL_PAGE_RE = /^\/data-reports\/fatality-reports\/\d{4}\/[a-z0-9-]+\/final-report$/;
const PDF_PATH_RE = /^\/sites\/default\/files\/data_reports\/fatals\//i;

const MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

const PDFINFO_MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

export const CARD_FIELDS = [
  "id",
  "mine",
  "operator",
  "state",
  "sector",
  "accidentDate",
  "reportDate",
  "date",
  "classification",
  "victimRole",
  "rootCauses",
  "enforcement",
  "citations",
  "mineId",
  "title",
  "sourceUrl",
  "body",
] as const;

const MANIFEST_FIELDS = [
  "id",
  "mine",
  "operator",
  "state",
  "sector",
  "accidentDate",
  "reportDate",
  "date",
  "classification",
  "title",
  "sourceUrl",
] as const;

export type MshaEnforcement = {
  action: string;
  standard: string;
  citation: string;
  summary: string;
};

export type MshaListing = {
  id: string;
  pageUrl: string;
  mine: string;
  operator: string;
  state: string;
  sector: MshaSector | "";
  accidentDate: string | null;
  reportDate: string | null;
  classification: string;
  mineId: string;
};

export type MshaCard = MshaListing & {
  date: string | null;
  victimRole: string;
  rootCauses: string[];
  enforcement: MshaEnforcement[];
  citations: string[];
  title: string;
  sourceUrl: string;
  pdfUrl: string;
  body: string;
};

export type MshaFailure = {
  id: string;
  page: string;
  reason: string;
};

export type MshaSnapshot = {
  ok: true;
  product: typeof PRODUCT_ID;
  status: "ok" | "empty" | "stale";
  reason: string | null;
  fetchedAt: string;
  asOf: string | null;
  license: typeof LICENSE;
  attribution: typeof ATTRIBUTION;
  listedCount?: number;
  fetchedPdfs?: number;
  skippedNoText?: number;
  reused?: number;
  addedThisRun?: number;
  failed?: MshaFailure[];
  sources: { search: string };
  cards: MshaCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (MSHA fatality final reports; +https://www.msha.gov/data-and-reports/fatality-reports/search)";

export const SEED_LISTINGS: MshaListing[] = [
  {
    id: BAILEY_ID,
    pageUrl: "https://www.msha.gov/data-reports/fatality-reports/2026/may-19-2026-fatality/final-report",
    mine: "Bailey Mine",
    operator: "Consol Pennsylvania Coal Company LLC",
    state: "Pennsylvania",
    sector: "coal",
    accidentDate: "2026-05-19",
    reportDate: null,
    classification: "Fall of Face, Rib, Side or Highwall",
    mineId: "36-07230",
  },
  {
    id: OHIO_COUNTY_ID,
    pageUrl: OHIO_COUNTY_PAGE,
    mine: "Ohio County Mine",
    operator: "Ohio County Coal Resources, Inc.",
    state: "West Virginia",
    sector: "coal",
    accidentDate: "2026-04-03",
    reportDate: null,
    classification: "Powered Haulage",
    mineId: "46-01436",
  },
  {
    id: PANTHER_EAGLE_ID,
    pageUrl: PANTHER_EAGLE_PAGE,
    mine: "Panther Eagle Mine",
    operator: "Marfork Coal Company",
    state: "West Virginia",
    sector: "coal",
    accidentDate: "2026-04-02",
    reportDate: null,
    classification: "Fall of Roof or Back",
    mineId: "46-09212",
  },
  {
    id: DEER_RUN_ID,
    pageUrl: DEER_RUN_PAGE,
    mine: "Deer Run Mine",
    operator: "Patton Mining LLC",
    state: "Illinois",
    sector: "coal",
    accidentDate: "2026-03-05",
    reportDate: null,
    classification: "Machinery",
    mineId: "11-03182",
  },
  {
    id: DANBY_ID,
    pageUrl: "https://www.msha.gov/data-reports/fatality-reports/2026/january-19-2026-fatality/final-report",
    mine: "Danby Quarry",
    operator: "Vermont Quarries Corp.",
    state: "Vermont",
    sector: "metal/nonmetal",
    accidentDate: "2026-01-19",
    reportDate: null,
    classification: "Falling, Rolling, or Sliding Rock or Material of Any Kind",
    mineId: "43-00042",
  },
];

const PINNED_IDS = new Set<string>([DEER_RUN_ID, PANTHER_EAGLE_ID, OHIO_COUNTY_ID]);

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function mshaFatalsDir(): string {
  if (env("MSHA_FATALS_DIR")) return resolve(env("MSHA_FATALS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/msha-fatals"));
}

export function snapshotPath(): string {
  return join(mshaFatalsDir(), "snapshot.json");
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return null;
}

export function normalizeReportId(raw: string | null | undefined): string {
  const hit = String(raw ?? "").toUpperCase().match(REPORT_ID_RE);
  return hit ? hit[1] : "";
}

export function officialFinalPageUrl(urlOrPath: string | null | undefined): string | null {
  const raw = String(urlOrPath ?? "").trim();
  if (!raw || raw.includes("..")) return null;
  let pathname = raw;
  try {
    const url = new URL(raw, ORIGIN);
    if (url.origin !== ORIGIN) return null;
    pathname = url.pathname;
  } catch {
    return null;
  }
  if (!FINAL_PAGE_RE.test(pathname)) return null;
  return `${ORIGIN}${pathname}`;
}

export function officialMshaPdfUrl(urlOrPath: string | null | undefined): string | null {
  const raw = String(urlOrPath ?? "").trim();
  if (!raw || raw.includes("..")) return null;
  let url: URL;
  try {
    url = new URL(decodeURI(raw), ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== ORIGIN) return null;
  if (!PDF_PATH_RE.test(url.pathname)) return null;
  if (!url.pathname.toLowerCase().endsWith(".pdf")) return null;
  if (!/final/i.test(decodeURIComponent(url.pathname))) return null;
  return url.toString();
}

export function accidentDateFromPage(pageUrl: string): string | null {
  const path = pageUrl.replace(ORIGIN, "");
  const hit = path.match(/\/(\d{4})\/([a-z]+)-(\d{1,2})-\d{4}-fatality/i);
  if (!hit) return null;
  const month = MONTHS[hit[2].toLowerCase()];
  if (!month) return null;
  return `${hit[1]}-${month}-${hit[3].padStart(2, "0")}`;
}

export function sectorFromMaterial(raw: string | null | undefined): MshaSector | "" {
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) return "";
  if (/\bcoal\b/.test(text)) return "coal";
  return "metal/nonmetal";
}

export function normalizeSector(raw: string | null | undefined): MshaSector | "" {
  const text = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!text) return "";
  if (text === "coal") return "coal";
  if (text === "metal/nonmetal" || text === "metal-nonmetal" || text === "mnm" || text === "metalnonmetal") {
    return "metal/nonmetal";
  }
  return "";
}

function fieldAfterStrong(row: string, label: string): string {
  const re = new RegExp(`${label}:\\s*</strong>\\s*([^<]+)`, "i");
  return decodeEntities(row.match(re)?.[1] ?? "").replace(/\s+/g, " ").trim();
}

const US_STATE_NAMES = [
  "District of Columbia",
  "West Virginia",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "Wisconsin",
  "Wyoming",
];

function stateFromPlace(place: string): string {
  const text = place.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  for (const name of US_STATE_NAMES) {
    const needle = name.toLowerCase();
    if (lower === needle || lower.endsWith(`, ${needle}`) || lower.endsWith(` ${needle}`)) return name;
  }
  const comma = text.split(",").pop()?.trim() ?? "";
  return comma;
}

function locationParts(location: string): { mine: string; state: string } {
  const text = location.replace(/\s+/g, " ").trim();
  const split = text.split(/\s+-\s+/);
  if (split.length < 2) return { mine: text, state: stateFromPlace(text) };
  const mine = split.slice(0, -1).join(" - ").trim();
  const place = split[split.length - 1].trim();
  return { mine, state: stateFromPlace(place) };
}

export function parseFatalitySearch(html: string): MshaListing[] {
  const out: MshaListing[] = [];
  const seen = new Set<string>();
  const rows = html.split(/<div class="views-row">/i).slice(1);
  for (const row of rows) {
    const href = row.match(/href="([^"]+\/final-report)"/i)?.[1];
    const pageUrl = officialFinalPageUrl(href ?? "");
    if (!pageUrl || seen.has(pageUrl)) continue;
    if (!/\/final-report/i.test(row)) continue;
    seen.add(pageUrl);
    const location = fieldAfterStrong(row, "Location");
    const place = locationParts(location);
    const material = fieldAfterStrong(row, "Mined Material");
    const controller = fieldAfterStrong(row, "Mine Controller");
    const classification = fieldAfterStrong(row, "Accident Classification");
    const anchor = row.match(/<a\b[^>]*\/final-report"[^>]*>/i)?.[0] ?? "";
    const hintedId = normalizeReportId(anchor.match(/data-report-id="([^"]+)"/i)?.[1] ?? "");
    const hintedReport = isoDate(anchor.match(/data-report-date="([^"]+)"/i)?.[1] ?? "");
    out.push({
      id: hintedId,
      pageUrl,
      mine: place.mine,
      operator: controller,
      state: place.state,
      sector: sectorFromMaterial(material),
      accidentDate: accidentDateFromPage(pageUrl),
      reportDate: hintedReport,
      classification,
      mineId: "",
    });
  }
  return out;
}

export function parseFinalReportPage(html: string): { pdfUrl: string; reportId: string } {
  const hrefs = [...html.matchAll(/href="([^"]+\.pdf[^"]*)"/gi)].map((m) => m[1]);
  let pdfUrl = "";
  for (const href of hrefs) {
    const official = officialMshaPdfUrl(decodeEntities(href));
    if (official) {
      pdfUrl = official;
      break;
    }
  }
  const reportId = normalizeReportId(html);
  return { pdfUrl, reportId };
}

export function cleanReportText(raw: string): string {
  const lines = raw.replace(/\f/g, "\n").replace(/\u00a0/g, " ").split(/\n/);
  const kept: string[] = [];
  for (const line of lines) {
    const text = line.replace(/[ \t]+/g, " ").trim();
    if (!text) {
      kept.push("");
      continue;
    }
    if (/^(?:\d{1,3}|[ivx]{1,4})$/i.test(text)) continue;
    kept.push(text);
  }
  const joined: string[] = [];
  for (const line of kept) {
    const prev = joined[joined.length - 1];
    if (prev && line && !/[.!?:;]$/.test(prev) && /^[a-z(]/.test(line)) {
      joined[joined.length - 1] = `${prev} ${line}`;
      continue;
    }
    joined.push(line);
  }
  return joined.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function isPreliminaryReport(text: string): boolean {
  const flat = text.replace(/\s+/g, " ");
  if (/Preliminary Report of Accident/i.test(flat) && !/ROOT CAUSE ANALYSIS/i.test(flat)) return true;
  if (/preliminary data ONLY/i.test(flat) && !/ROOT CAUSE ANALYSIS/i.test(flat)) return true;
  if (/MSHA Form 7000-13/i.test(flat) && !/REPORT OF INVESTIGATION/i.test(flat)) return true;
  return false;
}

export function isRealMshaBody(text: string): boolean {
  if (!text || text.length < 800) return false;
  if (isPreliminaryReport(text)) return false;
  if (!/REPORT OF INVESTIGATION/i.test(text)) return false;
  if (!/MINE SAFETY AND HEALTH ADMINISTRATION/i.test(text)) return false;
  if (!/ROOT CAUSE ANALYSIS/i.test(text)) return false;
  if (!REPORT_ID_RE.test(text)) return false;
  return true;
}

function flat(raw: string): string {
  return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function lastSection(text: string, label: string, endLabels: string[]): string {
  const starts = [...text.matchAll(new RegExp(label, "gi"))].map((m) => m.index ?? 0);
  if (!starts.length) return "";
  const start = starts[starts.length - 1] + label.length;
  let end = text.length;
  const rest = text.slice(start);
  for (const endLabel of endLabels) {
    const hit = rest.search(new RegExp(endLabel, "i"));
    if (hit >= 0 && hit < end - start) end = start + hit;
  }
  return text.slice(start, end);
}

export function extractRootCauses(text: string): string[] {
  const section = flat(lastSection(text, "ROOT CAUSE ANALYSIS", ["CONCLUSION", "ENFORCEMENT ACTIONS", "APPENDIX"]));
  const out: string[] = [];
  const re = /Root Cause:\s*(.+?)(?=\s+Corrective Actions?:|\s+\d+\.\s+Root Cause:|$)/gi;
  for (const match of section.matchAll(re)) {
    const cause = match[1].replace(/\s+/g, " ").trim();
    if (cause.length > 15 && !out.includes(cause)) out.push(cause);
  }
  return out;
}

function normalizeStandard(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return "";
  const withCfr = /^30\s*CFR/i.test(text) ? text : `30 CFR ${text}`;
  return withCfr.replace(/\(([lI])\)/g, "(1)").replace(/\.+$/, "").replace(/\s+/g, " ");
}

export function extractEnforcement(text: string): MshaEnforcement[] {
  const section = flat(lastSection(text, "ENFORCEMENT ACTIONS", ["APPENDIX", "APPENDIX A"]));
  const out: MshaEnforcement[] = [];
  const re =
    /\d+\.\s+(A\s+(\d{3}\([^)]+\)(?:\([^)]+\))?)\s+(order|citation|safeguard)\b[\s\S]*?)(?=\s+\d+\.\s+A\s+\d{3}\(|$)/gi;
  for (const match of section.matchAll(re)) {
    const chunk = match[1].replace(/\s+/g, " ").trim();
    const action = `${match[2]} ${match[3].toLowerCase()}`.replace(/\s+/g, " ");
    const violated = chunk.match(/violation of\s+((?:30\s*CFR\s*)?[\d.]+(?:\([A-Za-z0-9]+\))*)/i);
    const citation = chunk.match(/\bcitation\s+(\d{6,8})\b/i)?.[1] ?? "";
    const summary = chunk.replace(/^A\s+/i, "").slice(0, 500).trim();
    out.push({
      action,
      standard: violated ? normalizeStandard(violated[1]) : "",
      citation,
      summary,
    });
  }
  return out;
}

export function extractCitations(actions: MshaEnforcement[]): string[] {
  const out: string[] = [];
  for (const row of actions) {
    if (row.citation && !out.includes(row.citation)) out.push(row.citation);
    if (row.standard && !out.includes(row.standard)) out.push(row.standard);
    if (row.action && !out.includes(row.action)) out.push(row.action);
  }
  return out;
}

export function extractVictimRole(text: string): string {
  const overviewStart = [...text.matchAll(/\bOVERVIEW\b/g)].map((m) => m.index ?? 0).at(-1);
  const window = flat(text.slice(overviewStart ?? 0, (overviewStart ?? 0) + 1200));
  const match = window.match(/year-old\s+(.+?)\s+with\b/i);
  if (!match) return "";
  return match[1].replace(/\s*\([A-Z]{2,8}\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function stripSectionGlue(name: string): string {
  return name.replace(/^.*\b(?:INFORMATION|OVERVIEW|INVESTIGATION)\s+/i, "").replace(/,$/, "").trim();
}

function extractOperatorMine(text: string): { operator: string; mine: string } {
  const body = flat(text);
  const who = body.match(/([A-Z][^.]{3,180}?),\s+who operates the\s+([A-Z][^.]{2,80}?)(?:,|\.)/);
  if (who) {
    const owner = who[1];
    const operator = owner.includes(" owns ") ? owner.split(" owns ").pop()?.trim() ?? owner : owner.trim();
    return { operator: stripSectionGlue(operator), mine: who[2].trim() };
  }
  const owns = body.match(
    /([A-Z][A-Za-z0-9 .,&'-]{2,160}?)\s+owns and operates\s+(?:the\s+)?([A-Z][A-Za-z0-9 .,&'-]{2,80}?)(?:\.|,)/,
  );
  if (owns) return { operator: stripSectionGlue(owns[1]), mine: owns[2].trim() };
  return { operator: "", mine: "" };
}

function extractClassification(text: string): string {
  const body = flat(text);
  const match = body.match(/([A-Z][^.]{3,140}?)\s+Accident Fatality Report\b/);
  if (!match) return "";
  return match[1].replace(/\s+/g, " ").trim();
}

const POSTAL_STATE: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

function namedState(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim().replace(/\.+$/, "");
  if (!text) return "";
  const full = US_STATE_NAMES.find((name) => name.toLowerCase() === text.toLowerCase());
  if (full) return full;
  return POSTAL_STATE[text.toUpperCase()] ?? "";
}

function extractState(text: string): string {
  const body = flat(text);
  const match = body.match(/,\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:ID No\.|Mine ID:)/);
  return match?.[1] ?? "";
}

function extractMineId(text: string): string {
  const match = flat(text).match(/\bID No\.\s*(\d{2}-\d{4,6})\b/i);
  return match?.[1] ?? "";
}

function extractSector(text: string, fallback: MshaSector | ""): MshaSector | "" {
  const head = flat(text.slice(0, 1800));
  if (/\(\s*Coal\s*\)/i.test(head)) return "coal";
  if (/\(\s*(?:Marble|Metal|Limestone|Sand|Stone|Gold|Copper|Granite)\b/i.test(head)) return "metal/nonmetal";
  return fallback;
}

export function parseMshaReportText(text: string, meta: Partial<MshaListing> & { pageUrl?: string; pdfUrl?: string; reportDate?: string | null }): MshaCard | null {
  const body = cleanReportText(text);
  if (!isRealMshaBody(body)) return null;
  const id = normalizeReportId(body) || normalizeReportId(meta.id);
  if (!id) return null;
  const named = extractOperatorMine(body);
  const accidentDate = meta.accidentDate ?? accidentDateFromPage(meta.pageUrl ?? "") ?? isoDate(body);
  const reportDate = isoDate(meta.reportDate) || accidentDate;
  const enforcement = extractEnforcement(body);
  const mine = named.mine || meta.mine || "";
  const operator = named.operator || meta.operator || "";
  const classification = meta.classification || extractClassification(body);
  const sector = extractSector(body, meta.sector ?? "");
  const state = extractState(body) || namedState(meta.state ?? "") || meta.state || "";
  const pageUrl = officialFinalPageUrl(meta.pageUrl ?? "") || meta.pageUrl || "";
  return {
    id,
    pageUrl,
    mine,
    operator,
    state,
    sector,
    accidentDate,
    reportDate,
    date: reportDate,
    classification,
    victimRole: extractVictimRole(body),
    rootCauses: extractRootCauses(body),
    enforcement,
    citations: extractCitations(enforcement),
    mineId: extractMineId(body) || meta.mineId || "",
    title: [mine, classification].filter(Boolean).join(" — ") || id,
    sourceUrl: pageUrl,
    pdfUrl: officialMshaPdfUrl(meta.pdfUrl ?? "") || "",
    body,
  };
}

function emptySources(): MshaSnapshot["sources"] {
  return { search: SEARCH_URL };
}

export function emptyMshaSnapshot(reason: string): MshaSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: [],
    failed: [],
  };
}

function sortKey(card: { reportDate?: string | null; accidentDate?: string | null; date?: string | null; id: string }): string {
  return `${card.reportDate || card.date || card.accidentDate || ""} ${card.id}`;
}

export function assembleMshaSnapshot(cards: MshaCard[], fetchedAt?: string): MshaSnapshot {
  const kept = cards.filter((card) => isRealMshaBody(card.body) && normalizeReportId(card.id));
  const seen = new Set<string>();
  const unique: MshaCard[] = [];
  for (const card of kept) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    unique.push(card);
  }
  unique.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  const asOf =
    unique
      .map((card) => card.reportDate || card.date || card.accidentDate)
      .filter((day): day is string => Boolean(day))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: unique.length ? "ok" : "empty",
    reason: unique.length ? null : "Official MSHA Final Report PDFs had no extractable report text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: unique,
    failed: [],
  };
}

function parseSnapshotFile(raw: unknown): MshaSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as MshaSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleMshaSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readMshaSnapshot(): MshaSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeMshaSnapshot(snap: MshaSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

function listingDir(): string {
  return env("MSHA_FATALS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("MSHA_FATALS_LIMIT", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function maxFetchLimit(): number {
  const n = Number(env("MSHA_FATALS_MAX_FETCH", "8"));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 8;
}

function maxPages(): number {
  const n = Number(env("MSHA_FATALS_MAX_PAGES", "40"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 40;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    if (!name) continue;
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

export async function fetchMshaText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchMshaBytes(url: string): Promise<Uint8Array> {
  const official = officialMshaPdfUrl(url);
  if (!official) throw new Error("not an official MSHA Final Report PDF");
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`PDF HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("response is not a PDF");
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("MSHA_FATALS_PDFTOTEXT") || "pdftotext";
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

export function pdfCreatedDate(pdfPath: string): string | null {
  const helper = env("MSHA_FATALS_PDFINFO") || "pdfinfo";
  const result = spawnSync(helper, [pdfPath], { encoding: "utf8", maxBuffer: 1024 * 1024 });
  const line = (result.stdout || "").split("\n").find((row) => row.startsWith("CreationDate:"));
  if (!line) return null;
  const match = line.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s+\d{2}:\d{2}:\d{2}\s+(20\d{2})\b/i);
  if (!match) return null;
  const month = PDFINFO_MONTHS[match[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${month}-${match[2].padStart(2, "0")}`;
}

function mergeListings(listed: MshaListing[]): MshaListing[] {
  const byPage = new Map<string, MshaListing>();
  for (const row of [...listed, ...SEED_LISTINGS]) {
    const pageUrl = officialFinalPageUrl(row.pageUrl);
    if (!pageUrl) continue;
    const prior = byPage.get(pageUrl);
    if (!prior) {
      byPage.set(pageUrl, { ...row, pageUrl, id: normalizeReportId(row.id) });
      continue;
    }
    byPage.set(pageUrl, {
      ...prior,
      ...row,
      pageUrl,
      id: normalizeReportId(row.id) || prior.id,
      mine: row.mine || prior.mine,
      operator: row.operator || prior.operator,
      state: row.state || prior.state,
      sector: row.sector || prior.sector,
      accidentDate: row.accidentDate || prior.accidentDate,
      reportDate: row.reportDate || prior.reportDate,
      classification: row.classification || prior.classification,
      mineId: row.mineId || prior.mineId,
    });
  }
  return [...byPage.values()].sort((a, b) => `${b.accidentDate ?? ""}`.localeCompare(`${a.accidentDate ?? ""}`));
}

export async function walkOfficialMsha(opts?: {
  fetchText?: (url: string) => Promise<string>;
}): Promise<{ listed: MshaListing[]; listedCount: number }> {
  const fetchText = opts?.fetchText ?? fetchMshaText;
  const cap = maxPages();
  const listed: MshaListing[] = [];
  let lastPage = 0;
  for (let page = 0; page < cap; page += 1) {
    if (page > lastPage && lastPage > 0) break;
    const url = page === 0 ? SEARCH_URL : `${SEARCH_URL}?page=${page}`;
    const html = await fetchText(url);
    const pager = [...html.matchAll(/[?&]page=(\d+)/g)].map((match) => Number(match[1]));
    if (pager.length) lastPage = Math.max(lastPage, ...pager.filter((n) => Number.isFinite(n)));
    const rows = parseFatalitySearch(html);
    if (page > 0 && rows.length === 0 && !html.includes("views-row")) break;
    listed.push(...rows);
  }
  const seen = new Set<string>();
  const unique: MshaListing[] = [];
  for (const row of listed) {
    if (seen.has(row.pageUrl)) continue;
    seen.add(row.pageUrl);
    unique.push(row);
  }
  return { listed: mergeListings(unique), listedCount: unique.length };
}

async function loadOfficialListings(dir: string): Promise<{ listed: MshaListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing.html", "search.html"]);
    const listed = html ? parseFatalitySearch(html) : [];
    const merged = mergeListings(listed);
    return { listed: merged, listedCount: listed.length };
  }
  try {
    const walked = await walkOfficialMsha();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: mergeListings([]), listedCount: SEED_LISTINGS.length };
}

function isPinned(row: MshaListing): boolean {
  return PINNED_IDS.has(row.id) || PINNED_IDS.has(normalizeReportId(row.id));
}

export async function collectMshaFatals(opts?: {
  listingDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<MshaSnapshot> {
  const dir = opts?.listingDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = mshaFatalsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, MshaCard>();
  for (const card of readMshaSnapshot()?.cards ?? []) {
    if (isRealMshaBody(card.body)) prior.set(card.id, card);
  }
  const cards: MshaCard[] = [];
  const seen = new Set<string>();
  const failed: MshaFailure[] = [];
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    const pinned = isPinned(row);
    const cached = row.id ? prior.get(row.id) : undefined;
    if (cached && isRealMshaBody(cached.body)) {
      cards.push({ ...cached, ...row, id: cached.id, body: cached.body, sourceUrl: cached.sourceUrl || row.pageUrl });
      seen.add(cached.id);
      reused += 1;
      continue;
    }
    if (!pinned && target > 0 && addedThisRun >= target) continue;
    if (!pinned && fetchCap > 0 && fetchedPdfs >= fetchCap) continue;
    try {
      let reportId = normalizeReportId(row.id);
      let reportDate = row.reportDate;
      let pdfUrl = "";
      const localText = reportId ? readNamedFile(dir, [`${reportId}.txt`]) : null;
      if (!localText && !reportId && !dir) {
        const pageHtml = await fetchMshaText(row.pageUrl);
        const parsedPage = parseFinalReportPage(pageHtml);
        reportId = parsedPage.reportId;
        pdfUrl = parsedPage.pdfUrl;
      } else if (!localText && reportId && !dir) {
        const pageHtml = await fetchMshaText(row.pageUrl);
        const parsedPage = parseFinalReportPage(pageHtml);
        reportId = parsedPage.reportId || reportId;
        pdfUrl = parsedPage.pdfUrl;
      }
      if (dir && !localText) {
        skippedNoText += 1;
        failed.push({ id: reportId || row.pageUrl, page: row.pageUrl, reason: "no local report text" });
        continue;
      }
      if (!dir && !pdfUrl && !localText) {
        skippedNoText += 1;
        failed.push({ id: reportId || row.pageUrl, page: row.pageUrl, reason: "final report page had no Final Report PDF" });
        continue;
      }
      const text =
        localText ??
        (await (async () => {
          const fileId = (reportId || "report").replace(/[^\w.-]+/g, "_");
          const pdfFile = join(cacheDir, `${fileId}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchMshaBytes(pdfUrl));
            fetchedPdfs += 1;
          }
          reportDate = reportDate || pdfCreatedDate(pdfFile);
          return pdfToText(pdfFile);
        })());
      const parsed = parseMshaReportText(text, {
        ...row,
        id: reportId || row.id,
        reportDate,
        pdfUrl,
      });
      if (!parsed) {
        skippedNoText += 1;
        failed.push({
          id: reportId || row.id || row.pageUrl,
          page: row.pageUrl,
          reason: isPreliminaryReport(text) ? "preliminary report, not a final" : "no extractable final-report text",
        });
        continue;
      }
      if (seen.has(parsed.id)) continue;
      cards.push(parsed);
      seen.add(parsed.id);
      addedThisRun += 1;
    } catch (err) {
      skippedNoText += 1;
      const reason = err instanceof Error ? err.message : String(err);
      failed.push({
        id: row.id || row.pageUrl,
        page: row.pageUrl,
        reason: reason.replace(/https?:\/\/\S+/g, "official file").slice(0, 240),
      });
    }
  }
  for (const [id, card] of prior) {
    if (!seen.has(id)) cards.push(card);
  }
  const snap: MshaSnapshot = {
    ...assembleMshaSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
    failed,
  };
  writeMshaSnapshot(snap);
  return snap;
}

export async function loadMshaFatals(): Promise<MshaSnapshot> {
  const cached = readMshaSnapshot();
  if (cached && cached.cards.some((card) => isRealMshaBody(card.body))) return cached;
  try {
    return await collectMshaFatals();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live MSHA final-report fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyMshaSnapshot(
      `MSHA Fatality Investigation Final Reports are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildMshaManifest(snap: MshaSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((card) => isRealMshaBody(card.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      MSHA_FATALS_PATH,
      "Count and asOf, plus id, mine, operator, state, sector (coal or metal/nonmetal), accident date, report date, and classification. Root causes, enforcement actions, citations, victim role, and the report body are the paid GET /msha-fatals payload. This free manifest lists the cached finals. asOf is the newest report date in the cache. Preliminary reports and fatality alerts are not this SKU. Not /fmshrc-orders (FMSHRC ALJ and Commission decisions).",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: MSHA_FATALS_AMOUNT_ATOMIC,
    oneAmountAtomic: MSHA_FATALS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    listedCount: snap?.listedCount ?? cards.length,
    cards: cards.map((card) => ({
      id: card.id,
      mine: card.mine,
      operator: card.operator,
      institution: card.operator,
      firm: card.operator,
      state: card.state,
      sector: card.sector,
      accidentDate: card.accidentDate,
      reportDate: card.reportDate,
      date: card.date,
      classification: card.classification,
      title: card.title,
      sourceUrl: card.sourceUrl,
    })),
    schema: { fields: [...MANIFEST_FIELDS] },
    sources: { search: snap?.sources?.search ?? SEARCH_URL },
  };
}

export function filterMshaManifestBySector(manifest: Record<string, unknown>, sector?: string | null): Record<string, unknown> {
  const needle = normalizeSector(sector);
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    return normalizeSector(String((raw as Record<string, unknown>).sector ?? "")) === needle;
  });
  return { ...manifest, cardCount: matched.length, cards: matched, sector: needle };
}

export function filterMshaManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "mine", "operator", "institution", "firm", "state", "sector", "accidentDate", "reportDate", "date", "classification", "title"].some((key) =>
      String(row[key] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadMshaManifest(q?: string): Promise<Record<string, unknown>> {
  return filterMshaManifest(buildMshaManifest(readMshaSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectMshaFatals()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            failed: snap.failed ?? [],
            cards: snap.cards.map((card) => ({
              id: card.id,
              mine: card.mine,
              operator: card.operator,
              state: card.state,
              sector: card.sector,
              accidentDate: card.accidentDate,
              reportDate: card.reportDate,
              classification: card.classification,
              victimRole: card.victimRole,
              rootCauseCount: card.rootCauses.length,
              enforcementCount: card.enforcement.length,
              citations: card.citations,
              sourceUrl: card.sourceUrl,
              bodyChars: card.body.length,
            })),
            snapshot: snapshotPath(),
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
