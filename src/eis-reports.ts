#!/usr/bin/env node
/**
 * EPA NEPA Environmental Impact Statement TEXT from CDX e-NEPA PDFs.
 * Official EIS document PDFs since ~Oct 2012. 17 U.S.C. § 105. Cache + resale OK.
 * Extracted-body door: free manifest; GET ?id= one official text ($0.02);
 * plain GET is the newest 10 texts ($0.05). Search HTML is chrome.
 * Skip EPA comment letters and "Summary for the" teasers. Not Superfund RODs.
 * Download is POST + ALTCHA SHA-256 PoW (not a picture captcha). Solve in-collector.
 * Prefer the public Download EIS link after PoW. If a download 302s to login.gov,
 * that file is not the public EIS — skip it. Do not stall on a CDX login wall.
 * Habit: last-week FR filings. Kill if a no-auth JSON already dumps the EIS body.
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const EIS_REPORTS_PATH = "/eis-reports";
export const EIS_REPORTS_MANIFEST_PATH = "/eis-reports/manifest.json";
export const EIS_REPORTS_AMOUNT_ATOMIC = "50000";
export const EIS_REPORTS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "epa-nepa-eis-bodies";
export const PRODUCT_NAME = "EPA NEPA Environmental Impact Statement text";

export const SEARCH_ORIGIN = "https://cdxapps.epa.gov";
export const SEARCH_PATH = "/cdx-enepa-II/public/action/eis/search";
export const DETAILS_PATH = "/cdx-enepa-II/public/action/eis/details";
export const LAST_WEEK_URL = `${SEARCH_ORIGIN}${SEARCH_PATH}?search=&commonSearch=lastWeek`;
export const LAST_30_URL = `${SEARCH_ORIGIN}${SEARCH_PATH}?search=&commonSearch=last30Published`;
export const DETAILS_URL = `${SEARCH_ORIGIN}${DETAILS_PATH}`;
export const ALTCHA_CHALLENGE_URL = "https://cdxapi.epa.gov/altcha/api/v1/retrieveChallenge";
export const ALTCHA_VERIFY_URL = "https://cdxapi.epa.gov/altcha/api/v1/verifySolution";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "U.S. Environmental Protection Agency CDX e-NEPA";

export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const CARD_FIELDS = [
  "id",
  "ceqNumber",
  "eisId",
  "attachmentId",
  "documentType",
  "date",
  "title",
  "agency",
  "state",
  "pageUrl",
  "sourceUrl",
  "kind",
  "body",
] as const;

const MIN_BODY_CHARS = 800;

export const BODY_NEEDLE_CLINCH = "EIS_BODY_NEEDLE_CLINCH_RIVER_SEIS_20260036";
export const BODY_NEEDLE_F35 = "EIS_BODY_NEEDLE_F35A_BEDDOWN_20260104";

export type EisListing = {
  id: string;
  ceqNumber: string;
  eisId: string;
  attachmentId: string;
  documentType: string;
  date: string | null;
  title: string;
  agency: string;
  state: string;
  pageUrl: string;
  sourceUrl: string;
  attachmentTitle: string;
  downloadGroups?: string;
  downloadSet?: string;
};

export type EisCard = EisListing & {
  kind: string;
  body: string;
};

export type EisReportsSnapshot = {
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
  skipped?: number;
  skippedNoText?: number;
  reused?: number;
  addedThisRun?: number;
  captcha?: { kind: "altcha-pow"; solved: boolean; tookMs: number | null; note: string };
  sources: { search: string; lastWeek: string; last30: string; details: string };
  cards: EisCard[];
};

export type AltchaChallenge = {
  algorithm: string;
  challenge: string;
  salt: string;
  signature: string;
  maxnumber: number;
};

const HTTP_UA = "bnm-data-shop/1.0 (EPA NEPA EIS PDFs; +https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/search)";
const CHROME_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export const SEED_LISTINGS: EisListing[] = [
  {
    id: "20260036",
    ceqNumber: "20260036",
    eisId: "555705",
    attachmentId: "555711",
    documentType: "Final Supplement",
    date: "2026-04-10",
    title: "Construction Permit at the Clinch River Nuclear Site, Final Report",
    agency: "Nuclear Regulatory Commission",
    state: "TN",
    pageUrl: `${DETAILS_URL}?eisId=555705`,
    sourceUrl: `${DETAILS_URL}?eisId=555705#attachment-555711`,
    attachmentTitle:
      "Supplemental Environmental Impact Statement for a Construction Permit at the Clinch River Nuclear Site, Final Report.pdf",
    downloadGroups: "555711;",
  },
  {
    id: "20260104",
    ceqNumber: "20260104",
    eisId: "569578",
    attachmentId: "569535",
    documentType: "Draft",
    date: "2026-08-28",
    title: "F-35A Beddown at Moody Air Force Base, Georgia",
    agency: "United States Air Force",
    state: "GA",
    pageUrl: `${DETAILS_URL}?eisId=569578`,
    sourceUrl: `${DETAILS_URL}?eisId=569578#attachment-569535`,
    attachmentTitle: "Draft EIS for F-35A Beddown at Moody Air Force Base, Georgia (August 2026).pdf",
    downloadGroups: "569653;569535;",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function eisReportsDir(): string {
  if (env("EIS_REPORTS_DIR")) return resolve(env("EIS_REPORTS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/eis-reports"));
}

export function snapshotPath(): string {
  return join(eisReportsDir(), "snapshot.json");
}

export function decodeHtml(raw: string): string {
  return String(raw || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const mdy = String(raw).match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!mdy) return null;
  const day = `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  const y = Number(mdy[3]);
  return y >= 1990 && y <= 2100 ? day : null;
}

export function officialEisPageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw.trim(), SEARCH_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host !== "cdxapps.epa.gov" && host !== "www.epa.gov") return null;
    const eisId = parsed.searchParams.get("eisId") || (parsed.hash.match(/eisId=(\d+)/) || [])[1];
    if (eisId && /^\d+$/.test(eisId)) return `${DETAILS_URL}?eisId=${eisId}`;
    if (parsed.pathname.includes("/action/eis/search")) return `${SEARCH_ORIGIN}${SEARCH_PATH}`;
    return null;
  } catch {
    return null;
  }
}

export function detailsUrlFor(eisId: string): string {
  return `${DETAILS_URL}?eisId=${eisId}`;
}

export function sourceUrlFor(eisId: string, attachmentId: string): string {
  return `${DETAILS_URL}?eisId=${eisId}#attachment-${attachmentId}`;
}

export function formItem(html: string, label: string): string {
  const re = new RegExp(`<h4[^>]*>\\s*${label}\\s*</h4>\\s*([^<]+)`, "i");
  return decodeHtml((html.match(re) || [])[1] || "");
}

export function isCommentLetterTitle(title: string): boolean {
  return /\b(comment letter|epa comments on)\b/i.test(title);
}

export function isSummaryTeaserTitle(title: string): boolean {
  const t = title.trim();
  if (/^summary for the\b/i.test(t)) return true;
  if (/\bhighlights\b/i.test(t) && !/\benvironmental impact statement\b/i.test(t)) return true;
  if (/^executive summary\b/i.test(t)) return true;
  return false;
}

export function isSkippedEisAttachment(title: string): boolean {
  if (!title) return true;
  if (isCommentLetterTitle(title)) return true;
  if (isSummaryTeaserTitle(title)) return true;
  if (/\.(png|jpe?g|gif|svg|csv|html?)$/i.test(title)) return true;
  return false;
}

export function cardIdFor(ceqNumber: string, attachmentId: string, keptCount: number): string {
  return keptCount === 1 ? ceqNumber : `${ceqNumber}-${attachmentId}`;
}

export type EisAttachment = { attachmentId: string; title: string };

export function parseAttachmentSection(html: string, heading: string): EisAttachment[] {
  const start = html.search(new RegExp(`<strong>\\s*${heading}`, "i"));
  if (start < 0) return [];
  const rest = html.slice(start + 1);
  const next = rest.search(/<strong>/i);
  const chunk = next >= 0 ? html.slice(start, start + 1 + next) : html.slice(start);
  const out: EisAttachment[] = [];
  const re = /startDownload\(\s*['"]downloadAttachment['"]\s*,\s*['"](\d+)['"]\s*\)[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chunk))) {
    out.push({ attachmentId: m[1], title: decodeHtml(m[2]) });
  }
  return out;
}

export function parseSearchDownloadEis(html: string): { groups: string; set: string } {
  const m = String(html || "").match(
    /startDownload\(\s*['"]downloadEisDocuments['"]\s*,\s*['"]\d+['"]\s*,\s*['"]([^'"]*)['"](?:\s*,\s*['"]([^'"]*)['"])?/i,
  );
  return { groups: m?.[1] || "", set: m?.[2] || "" };
}

export function parseSearchRows(html: string): Array<{
  eisId: string;
  ceqNumber: string;
  title: string;
  documentType: string;
  date: string | null;
  agency: string;
  state: string;
  pageUrl: string;
  downloadGroups: string;
  downloadSet: string;
}> {
  const out: Array<{
    eisId: string;
    ceqNumber: string;
    title: string;
    documentType: string;
    date: string | null;
    agency: string;
    state: string;
    pageUrl: string;
    downloadGroups: string;
    downloadSet: string;
  }> = [];
  const seen = new Set<string>();
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;
  while ((row = trRe.exec(html))) {
    const cell = row[1];
    const link = cell.match(/href="([^"]*eisId=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const eisId = link[2];
    if (seen.has(eisId)) continue;
    const tds = [...cell.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => decodeHtml(x[1]));
    if (tds.length < 3) continue;
    const ceqNumber = (tds[1] || "").match(/\d{8}/)?.[0] || "";
    if (!ceqNumber) continue;
    const dl = parseSearchDownloadEis(cell);
    seen.add(eisId);
    out.push({
      eisId,
      ceqNumber,
      title: decodeHtml(link[3]) || tds[0] || `EIS ${ceqNumber}`,
      documentType: tds[2] || "",
      date: isoDate(tds[4] || tds[3] || ""),
      agency: tds[6] || "",
      state: tds[8] || "",
      pageUrl: detailsUrlFor(eisId),
      downloadGroups: dl.groups,
      downloadSet: dl.set,
    });
  }
  return out;
}

export function parseDetailsListings(
  html: string,
  pageUrl: string,
  prior?: Partial<EisListing>,
): EisListing[] {
  const official = officialEisPageUrl(pageUrl) || officialEisPageUrl(prior?.pageUrl);
  const eisId =
    (official && new URL(official).searchParams.get("eisId")) ||
    prior?.eisId ||
    (html.match(/eisId=(\d+)/) || [])[1] ||
    "";
  if (!official || !eisId) return [];
  const ceqNumber = formItem(html, "EIS Number") || prior?.ceqNumber || "";
  if (!/^\d{8}$/.test(ceqNumber)) return [];
  const title = formItem(html, "EIS Title") || prior?.title || `EIS ${ceqNumber}`;
  const documentType = formItem(html, "Document Type") || prior?.documentType || "";
  const date = isoDate(formItem(html, "Federal Register Date")) || isoDate(prior?.date);
  const agency = formItem(html, "Lead Agency") || prior?.agency || "";
  const state = formItem(html, "State or Territory") || prior?.state || "";
  const docs = parseAttachmentSection(html, "EIS Document");
  const comments = parseAttachmentSection(html, "Comment Letter");
  const kept = docs.filter((a) => !isSkippedEisAttachment(a.title) && !comments.some((c) => c.attachmentId === a.attachmentId));
  return kept.map((a) => ({
    id: cardIdFor(ceqNumber, a.attachmentId, kept.length),
    ceqNumber,
    eisId,
    attachmentId: a.attachmentId,
    documentType,
    date,
    title,
    agency,
    state,
    pageUrl: official,
    sourceUrl: sourceUrlFor(eisId, a.attachmentId),
    attachmentTitle: a.title,
  }));
}

export function parseListingRows(rows: EisListing[]): EisListing[] {
  const seen = new Set<string>();
  const out: EisListing[] = [];
  for (const row of rows) {
    if (!row.id || !row.ceqNumber || !row.eisId) continue;
    if (!row.attachmentId && !row.downloadGroups) continue;
    if (isSkippedEisAttachment(row.attachmentTitle || row.title)) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
}

export function isChromeEisHtml(html: string): boolean {
  const t = String(html || "");
  if (t.length < 200) return false;
  const hasChrome = /EIS (Title|Number|Document)|Environmental Impact Statement \(EIS\) Database/i.test(t);
  return hasChrome && !t.trimStart().startsWith("%PDF-");
}

export function isPdfBytes(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
}

export function looksLikeLeakedEisBody(text: string): boolean {
  const t = String(text || "");
  if (t.trimStart().startsWith("%PDF-")) return true;
  if (t.includes(BODY_NEEDLE_CLINCH) || t.includes(BODY_NEEDLE_F35)) return true;
  if (/\bML26035A285\b/.test(t) || /Supplement to NUREG-2226/i.test(t)) return true;
  return false;
}

export function looksLikeLoginGov(htmlOrUrl: string): boolean {
  const t = String(htmlOrUrl || "");
  return /login\.gov|secure\.login\.gov|idp\.int\.identitysandbox\.gov/i.test(t);
}

export function looksLikeCdxLogin(htmlOrUrl: string): boolean {
  const t = String(htmlOrUrl || "");
  return /cdx\.epa\.gov\/CDX\/Login|name=["']userId["']|Sign in to CDX/i.test(t);
}

export function looksLikeLoginWall(htmlOrUrl: string): boolean {
  return looksLikeLoginGov(htmlOrUrl) || looksLikeCdxLogin(htmlOrUrl);
}

export function looksLikeHumanCaptcha(html: string): boolean {
  const t = String(html || "");
  if (/g-recaptcha|recaptcha\/api\.js|hcaptcha/i.test(t) && !/altcha-widget/i.test(t)) return true;
  if (/Please complete the (reCAPTCHA|hCaptcha|picture)/i.test(t)) return true;
  return false;
}

export function isSuperfundRodDump(text: string): boolean {
  const t = String(text || "");
  if (!/RECORD OF DECISION/i.test(t)) return false;
  if (!/superfund|SEMS|semspub\.epa\.gov/i.test(t)) return false;
  return !/Environmental Impact Statement/i.test(t);
}

export function isRealEisBody(text: string): boolean {
  const raw = String(text || "");
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length < MIN_BODY_CHARS) return false;
  if (isChromeEisHtml(raw) && /<[a-z][\s\S]*>/i.test(raw)) return false;
  if (isSuperfundRodDump(t)) return false;
  if (isCommentLetterTitle(t.slice(0, 240))) return false;
  if (/Please check the ALTCHA/i.test(t)) return false;
  const eisPhrase =
    /Environmental Impact Statement/i.test(t) ||
    /\bNUREG-\d+/i.test(t) ||
    /Docket Number:\s*\d/i.test(t) ||
    /\bML\d{8,}\b/.test(t) ||
    t.includes(BODY_NEEDLE_CLINCH) ||
    t.includes(BODY_NEEDLE_F35);
  return eisPhrase;
}

export function parseEisReportText(
  text: string,
  meta: Partial<EisListing> & { sourceUrl: string },
): EisCard {
  const body = text.replace(/\f/g, "\n").trim();
  const official = officialEisPageUrl(meta.pageUrl) || meta.pageUrl || `${SEARCH_ORIGIN}${SEARCH_PATH}`;
  const eisId = meta.eisId || "";
  const attachmentId = meta.attachmentId || "";
  return {
    id: meta.id || meta.ceqNumber || eisId,
    ceqNumber: meta.ceqNumber || "",
    eisId,
    attachmentId,
    documentType: meta.documentType || "",
    date: isoDate(meta.date),
    title: (meta.title || "").trim() || `EIS ${meta.ceqNumber || eisId}`,
    agency: (meta.agency || "").trim(),
    state: (meta.state || "").trim(),
    pageUrl: official,
    sourceUrl: meta.sourceUrl || official,
    attachmentTitle: meta.attachmentTitle || "",
    downloadGroups: meta.downloadGroups,
    downloadSet: meta.downloadSet,
    kind: "eis-document",
    body,
  };
}

export function pdfToText(pdfPath: string): string {
  const helper = env("EIS_REPORTS_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024,
  });
  if (!result.error && result.status === 0 && (result.stdout || "").trim()) {
    return result.stdout || "";
  }
  const py = spawnSync(
    "python3",
    [
      "-c",
      "import sys\nfrom pypdf import PdfReader\nr=PdfReader(sys.argv[1])\nprint('\\n'.join((p.extract_text() or '') for p in r.pages))",
      pdfPath,
    ],
    { encoding: "utf8", maxBuffer: 80 * 1024 * 1024 },
  );
  if (!py.error && py.status === 0) return py.stdout || "";
  return "";
}

export function solveAltchaPow(challenge: Pick<AltchaChallenge, "challenge" | "salt" | "maxnumber">): number {
  const target = String(challenge.challenge || "").toLowerCase();
  const salt = String(challenge.salt || "");
  const max = Number(challenge.maxnumber);
  const cap = Number.isFinite(max) && max > 0 ? Math.min(Math.floor(max), 5_000_000) : 1_000_000;
  for (let n = 0; n <= cap; n += 1) {
    if (createHash("sha256").update(`${salt}${n}`).digest("hex") === target) return n;
  }
  throw new Error("ALTCHA PoW unsolved");
}

export function altchaPayload(challenge: AltchaChallenge, number: number, took: number): string {
  return Buffer.from(
    JSON.stringify({
      algorithm: challenge.algorithm || "SHA-256",
      challenge: challenge.challenge,
      number,
      salt: challenge.salt,
      signature: challenge.signature,
      took,
    }),
  ).toString("base64");
}

export async function fetchAltchaChallenge(naasIp: string, naasToken: string): Promise<AltchaChallenge> {
  const res = await fetch(ALTCHA_CHALLENGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": HTTP_UA,
    },
    body: new URLSearchParams({ naasIp, naasToken }),
  });
  if (!res.ok) throw new Error(`ALTCHA challenge HTTP ${res.status}`);
  const raw = (await res.json()) as AltchaChallenge;
  if (!raw?.challenge || !raw.salt || !raw.signature) throw new Error("ALTCHA challenge missing fields");
  return raw;
}

export function chromePath(): string | null {
  for (const candidate of [
    env("CHROME_PATH"),
    env("PUPPETEER_EXECUTABLE_PATH"),
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
}

function emptySources(): EisReportsSnapshot["sources"] {
  return { search: `${SEARCH_ORIGIN}${SEARCH_PATH}`, lastWeek: LAST_WEEK_URL, last30: LAST_30_URL, details: DETAILS_URL };
}

export function emptyEisReportsSnapshot(reason: string): EisReportsSnapshot {
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
  };
}

export function assembleEisReportsSnapshot(cards: EisCard[], fetchedAt = new Date().toISOString()): EisReportsSnapshot {
  const kept = cards
    .filter((c) => isRealEisBody(c.body) && !isSkippedEisAttachment(c.attachmentTitle || c.title))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = kept.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: kept.length > 0 ? "ok" : "empty",
    reason: kept.length > 0 ? null : "Official EPA NEPA EIS PDFs had no extractable EIS text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): EisReportsSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as EisReportsSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readEisReportsSnapshot(): EisReportsSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeEisReportsSnapshot(snap: EisReportsSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(snap, null, 2)}\n`);
}

export function pdfPathForCard(card: Pick<EisCard, "id"> & { pdfFile?: string }): string {
  if (card.pdfFile && existsSync(card.pdfFile)) return card.pdfFile;
  return join(eisReportsDir(), `${card.id}.pdf`);
}

export function readCachedPdf(card: Pick<EisCard, "id"> & { pdfFile?: string }): Uint8Array | null {
  const path = pdfPathForCard(card);
  if (!existsSync(path)) return null;
  const bytes = new Uint8Array(readFileSync(path));
  return isPdfBytes(bytes) ? bytes : null;
}

export async function fetchEisText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,*/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function leakTestCdxNoAuth(eisId = "555705"): Promise<{ leaked: boolean; note: string }> {
  const probes = [
    `${DETAILS_URL}?eisId=${eisId}&format=json`,
    `${SEARCH_ORIGIN}/cdx-enepa-II/public/action/eis/api/${eisId}`,
    `${SEARCH_ORIGIN}/cdx-enepa-II/public/api/eis/${eisId}`,
    `${DETAILS_URL}/downloadAttachment?eisId=${eisId}&attachmentId=555711`,
  ];
  for (const url of probes) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": HTTP_UA, Accept: "application/json,application/pdf,*/*" },
        redirect: "follow",
      });
      const buf = new Uint8Array(await res.arrayBuffer());
      const head = new TextDecoder().decode(buf.slice(0, 64));
      if (isPdfBytes(buf) || looksLikeLeakedEisBody(head)) {
        return { leaked: true, note: `KILL: no-auth ${url} dumped EIS body (HTTP ${res.status}).` };
      }
    } catch {
      /* probe miss is fine */
    }
  }
  return { leaked: false, note: "No-auth JSON/GET did not dump EIS PDF bytes. Free search/details HTML is titles only." };
}

function listingDir(): string {
  return env("EIS_REPORTS_HTML_DIR") || env("EIS_REPORTS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("EIS_REPORTS_LIMIT", "10"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}

function maxFetchLimit(): number {
  const n = Number(env("EIS_REPORTS_MAX_FETCH", "10"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isZipBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

async function waitForDownloadFile(dir: string, timeoutMs: number): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const names = existsSync(dir) ? readdirSync(dir) : [];
    const hit = names.find((n) => /\.(pdf|zip)$/i.test(n) && !n.endsWith(".crdownload"));
    if (hit) {
      const path = join(dir, hit);
      try {
        const bytes = readFileSync(path);
        if ((isPdfBytes(bytes) || isZipBytes(bytes)) && bytes.byteLength > 80) return path;
      } catch {
        /* still writing */
      }
    }
    await pause(250);
  }
  return null;
}

export function pickMainEisPdf(paths: string[]): string | null {
  const scored = paths
    .filter((p) => existsSync(p))
    .map((p) => {
      const name = p.split("/").pop() || "";
      const skip = isSkippedEisAttachment(name);
      let bytes = 0;
      try {
        bytes = readFileSync(p).byteLength;
      } catch {
        bytes = 0;
      }
      return { p, name, skip, bytes };
    })
    .filter((x) => !x.skip && x.bytes > 80);
  scored.sort((a, b) => b.bytes - a.bytes);
  return scored[0]?.p ?? null;
}

export function unpackEisDownload(downloadPath: string, destPath: string): Uint8Array {
  const bytes = new Uint8Array(readFileSync(downloadPath));
  if (isPdfBytes(bytes)) {
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, bytes);
    return bytes;
  }
  if (!isZipBytes(bytes)) throw new Error(`${downloadPath} is neither a PDF nor a zip`);
  const unzipDir = `${downloadPath}.unzip`;
  mkdirSync(unzipDir, { recursive: true });
  const unzip = spawnSync("python3", ["-c", "import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])", downloadPath, unzipDir], {
    encoding: "utf8",
  });
  if (unzip.status !== 0) throw new Error(`unzip failed: ${unzip.stderr || unzip.stdout || unzip.status}`);
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const next = join(dir, name.name);
      if (name.isDirectory()) walk(next);
      else if (name.name.toLowerCase().endsWith(".pdf")) found.push(next);
    }
  };
  walk(unzipDir);
  const main = pickMainEisPdf(found);
  if (!main) throw new Error(`zip ${downloadPath} had no public EIS PDF`);
  const out = new Uint8Array(readFileSync(main));
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, out);
  return out;
}

type ChromeDownloadOpts = {
  eisId: string;
  attachmentId?: string;
  destPath: string;
  groups?: string;
  set?: string;
};

async function injectAltchaAndStart(
  page: {
    evaluate: (fn: (packed: Record<string, string>) => void, packed: Record<string, string>) => Promise<void>;
  },
  packed: Record<string, string>,
): Promise<void> {
  await page.evaluate((args: Record<string, string>) => {
    const cap = document.querySelector("#downloadFormCaptcha") as HTMLInputElement | null;
    if (!cap) throw new Error("downloadFormCaptcha missing");
    cap.value = args.payload;
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = "altcha";
    hidden.value = args.payload;
    cap.form?.appendChild(hidden);
    const start = (
      window as unknown as {
        startDownload?: (event: string, id: string, groups?: string, set?: string) => void;
      }
    ).startDownload;
    if (!start) throw new Error("startDownload missing");
    if (args.mode === "downloadEisDocuments") {
      start("downloadEisDocuments", args.eisId, args.groups || "", args.set || "");
    } else {
      start("downloadAttachment", args.attachmentId);
    }
  }, packed);
}

export async function downloadEisPdfWithChrome(opts: ChromeDownloadOpts): Promise<{ bytes: Uint8Array; captchaTookMs: number }> {
  const executablePath = chromePath();
  if (!executablePath) {
    throw new Error("Chrome not found. Set CHROME_PATH. Apply host needs google-chrome + puppeteer-core.");
  }
  let launch: (typeof import("puppeteer-core"))["launch"];
  try {
    const puppeteer = await import("puppeteer-core");
    launch = puppeteer.launch;
  } catch {
    throw new Error("puppeteer-core is not installed. npm i puppeteer-core (Chrome is not bundled).");
  }
  const downloadDir = join(eisReportsDir(), ".chrome-dl", `${opts.eisId}-${opts.attachmentId || "public"}`);
  mkdirSync(downloadDir, { recursive: true });
  for (const leftover of readdirSync(downloadDir)) {
    try {
      unlinkSync(join(downloadDir, leftover));
    } catch {
      /* ignore */
    }
  }
  const browser = await launch({
    executablePath,
    headless: true,
    protocolTimeout: 120000,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(CHROME_UA);
    page.setDefaultTimeout(45000);
    const client = await page.createCDPSession();
    await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir });

    const tryStart = async (url: string, mode: "downloadEisDocuments" | "downloadAttachment"): Promise<{ bytes: Uint8Array; took: number } | "skip" | "retry"> => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const html = await page.content();
      const urlNow = page.url();
      if (looksLikeLoginGov(urlNow) || looksLikeLoginGov(html)) {
        return "skip";
      }
      if (looksLikeHumanCaptcha(html)) {
        throw new Error(
          "BLOCKER: second human captcha (reCAPTCHA/hCaptcha) on CDX e-NEPA. Stop. Do not ask Bruce unless it is truly human-only and this is that case.",
        );
      }
      if (looksLikeCdxLogin(urlNow) || looksLikeCdxLogin(html)) {
        return "retry";
      }
      const attrs = await page.evaluate(() => {
        const w = document.querySelector("#altcha");
        return {
          naasip: w?.getAttribute("naasip") || w?.getAttribute("naasIp") || "",
          naastoken: w?.getAttribute("naastoken") || w?.getAttribute("naasToken") || "",
          hasWidget: Boolean(w),
        };
      });
      if (!attrs.hasWidget || !attrs.naasip || !attrs.naastoken) {
        throw new Error("ALTCHA widget or naasIp/naasToken missing.");
      }
      const challenge = await fetchAltchaChallenge(attrs.naasip, attrs.naastoken);
      const t0 = Date.now();
      const number = solveAltchaPow(challenge);
      const took = Date.now() - t0;
      const payload = altchaPayload(challenge, number, took);
      await injectAltchaAndStart(page, {
        payload,
        mode,
        eisId: opts.eisId,
        groups: opts.groups || "",
        set: opts.set || "",
        attachmentId: opts.attachmentId || "",
      });
      const found = await waitForDownloadFile(downloadDir, 45000);
      const afterUrl = page.url();
      const afterHtml = await page.content();
      if (looksLikeLoginGov(afterUrl) || looksLikeLoginGov(afterHtml)) {
        return "skip";
      }
      if (!found) {
        if (looksLikeCdxLogin(afterUrl) || looksLikeCdxLogin(afterHtml)) return "retry";
        return "retry";
      }
      const bytes = unpackEisDownload(found, opts.destPath);
      return { bytes, took };
    };

    let lastTook = 0;
    if (opts.groups) {
      const publicHit = await tryStart(LAST_WEEK_URL, "downloadEisDocuments");
      if (publicHit === "skip") {
        throw new Error(`SKIP: login.gov wall on public Download EIS for eisId=${opts.eisId}; not the public EIS PDF.`);
      }
      if (publicHit !== "retry") {
        return { bytes: publicHit.bytes, captchaTookMs: publicHit.took };
      }
      lastTook = 0;
    }
    if (opts.attachmentId) {
      const attachHit = await tryStart(detailsUrlFor(opts.eisId), "downloadAttachment");
      if (attachHit === "skip") {
        throw new Error(`SKIP: login.gov wall on attachment ${opts.attachmentId}; not the public EIS PDF.`);
      }
      if (attachHit !== "retry") {
        return { bytes: attachHit.bytes, captchaTookMs: attachHit.took };
      }
      lastTook = 0;
    }
    throw new Error(
      `SKIP: no public EIS PDF after PoW for eisId=${opts.eisId} (login wall or empty download). captchaTookMs=${lastTook}`,
    );
  } finally {
    await browser.close();
  }
}

async function loadOfficialListings(dir: string): Promise<{ listed: EisListing[]; listedCount: number }> {
  const fromSearch: ReturnType<typeof parseSearchRows> = [];
  if (dir) {
    const searchHtml = readNamedFile(dir, ["lastWeek.html", "last30.html", "search.html", "index.html"]);
    if (searchHtml) fromSearch.push(...parseSearchRows(searchHtml));
  } else {
    try {
      const week = await fetchEisText(LAST_WEEK_URL);
      fromSearch.push(...parseSearchRows(week));
      if (fromSearch.length < 3) {
        const month = await fetchEisText(LAST_30_URL);
        fromSearch.push(...parseSearchRows(month));
      }
    } catch {
      /* keep seeds */
    }
  }
  const enriched: EisListing[] = [];
  const seedsAndSearch = [
    ...fromSearch.map((row) => ({
      id: row.ceqNumber,
      ceqNumber: row.ceqNumber,
      eisId: row.eisId,
      attachmentId: "",
      documentType: row.documentType,
      date: row.date,
      title: row.title,
      agency: row.agency,
      state: row.state,
      pageUrl: row.pageUrl,
      sourceUrl: row.pageUrl,
      attachmentTitle: "",
      downloadGroups: row.downloadGroups,
      downloadSet: row.downloadSet,
    })),
    ...SEED_LISTINGS,
  ];
  const seenEis = new Set<string>();
  for (const row of seedsAndSearch) {
    if (seenEis.has(row.eisId)) continue;
    seenEis.add(row.eisId);
    const pageHtml = dir
      ? readNamedFile(dir, [`details-${row.eisId}.html`, `${row.eisId}.html`, `${row.id}.html`])
      : null;
    if (pageHtml) {
      enriched.push(
        ...parseDetailsListings(pageHtml, row.pageUrl, row).map((c) => ({
          ...c,
          downloadGroups: c.downloadGroups || row.downloadGroups,
          downloadSet: c.downloadSet || row.downloadSet,
        })),
      );
      continue;
    }
    if (dir) {
      if (row.attachmentId || row.downloadGroups) enriched.push(row);
      continue;
    }
    try {
      const liveHtml = await fetchEisText(row.pageUrl);
      if (looksLikeLoginGov(liveHtml)) {
        if (row.downloadGroups || row.attachmentId) enriched.push(row);
        continue;
      }
      if (looksLikeHumanCaptcha(liveHtml)) {
        throw new Error("BLOCKER: human captcha on details HTML fetch.");
      }
      if (looksLikeCdxLogin(liveHtml)) {
        if (row.downloadGroups || row.attachmentId) enriched.push(row);
        continue;
      }
      const parsed = parseDetailsListings(liveHtml, row.pageUrl, row);
      if (parsed.length) {
        enriched.push(
          ...parsed.map((c) => ({
            ...c,
            downloadGroups: c.downloadGroups || row.downloadGroups,
            downloadSet: c.downloadSet || row.downloadSet,
          })),
        );
      } else if (row.attachmentId || row.downloadGroups) {
        enriched.push(row);
      }
    } catch (err) {
      if (String(err).includes("BLOCKER") || String(err).includes("KILL")) throw err;
      if (row.attachmentId || row.downloadGroups) enriched.push(row);
    }
  }
  const listed = parseListingRows(enriched);
  return { listed, listedCount: listed.length };
}

export async function collectEisReports(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<EisReportsSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  if (!dir) {
    const leak = await leakTestCdxNoAuth();
    if (leak.leaked) throw new Error(leak.note);
  }
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = eisReportsDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, EisCard>();
  for (const card of readEisReportsSnapshot()?.cards ?? []) {
    if (isRealEisBody(card.body)) prior.set(card.id, card);
  }
  const cards: EisCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skipped = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  let captchaTookMs: number | null = null;
  let captchaSolved = false;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = prior.get(row.id);
    if (cached) {
      cards.push(cached);
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    if (!dir && pauseMs) await pause(pauseMs);
    try {
      const localText = readNamedFile(dir, [`${row.id}.txt`]) || readNamedFile(cacheDir, [`${row.id}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${row.id}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile) || !isPdfBytes(new Uint8Array(readFileSync(pdfFile)))) {
            if (dir) return "";
            const got = await downloadEisPdfWithChrome({
              eisId: row.eisId,
              attachmentId: row.attachmentId,
              destPath: pdfFile,
              groups: row.downloadGroups,
              set: row.downloadSet,
            });
            fetchedPdfs += 1;
            captchaSolved = true;
            captchaTookMs = got.captchaTookMs;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseEisReportText(text, {
        ...row,
        sourceUrl: row.sourceUrl || sourceUrlFor(row.eisId, row.attachmentId),
      });
      if (!isRealEisBody(parsed.body)) {
        skippedNoText += 1;
        continue;
      }
      cards.push(parsed);
      seen.add(row.id);
      addedThisRun += 1;
    } catch (err) {
      const msg = String(err);
      if (msg.includes("BLOCKER") || msg.includes("KILL")) throw err;
      if (msg.includes("SKIP:")) {
        skipped += 1;
        continue;
      }
      skippedNoText += 1;
    }
  }
  for (const [id, card] of prior) {
    if (!seen.has(id)) cards.push(card);
  }
  const snap: EisReportsSnapshot = {
    ...assembleEisReportsSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skipped,
    skippedNoText,
    reused,
    addedThisRun,
    captcha: {
      kind: "altcha-pow",
      solved: captchaSolved || Boolean(dir),
      tookMs: captchaTookMs,
      note: dir
        ? "htmlDir collect; ALTCHA not live. Live download is SHA-256 PoW in-collector (not a picture captcha)."
        : captchaSolved
          ? "ALTCHA SHA-256 PoW solved in-collector. Public Download EIS after PoW. login.gov 302s are skipped."
          : "No new live PDF this run; reused cache or skipped login.gov / empty extract.",
    },
  };
  writeEisReportsSnapshot(snap);
  return snap;
}

export async function loadEisReports(): Promise<EisReportsSnapshot> {
  const cached = readEisReportsSnapshot();
  if (cached) {
    const filtered = assembleEisReportsSnapshot(cached.cards, cached.fetchedAt);
    if (filtered.cards.length) return { ...cached, ...filtered };
  }
  try {
    return await collectEisReports();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealEisBody(c.body)) ? "stale" : "empty",
        reason: `Live EPA NEPA EIS fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyEisReportsSnapshot(
      `EPA NEPA EIS texts are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildEisReportsManifest(snap: EisReportsSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealEisBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      EIS_REPORTS_PATH,
      "Count + CEQ number + date + title + agency + official e-NEPA page only. EIS body is the paid GET /eis-reports payload. This free manifest lists the full catalog. Search/details HTML is chrome. Skip EPA comment letters and Summary-for-the teasers. Distinct from Superfund RODs.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: EIS_REPORTS_AMOUNT_ATOMIC,
    oneAmountAtomic: EIS_REPORTS_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      ceqNumber: c.ceqNumber,
      eisId: c.eisId,
      attachmentId: c.attachmentId,
      documentType: c.documentType,
      date: c.date,
      title: c.title,
      agency: c.agency,
      state: c.state,
      pageUrl: c.pageUrl,
      sourceUrl: c.sourceUrl,
    })),
    schema: {
      fields: ["id", "ceqNumber", "eisId", "attachmentId", "documentType", "date", "title", "agency", "state", "pageUrl", "sourceUrl"],
    },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterEisReportsManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "ceqNumber", "eisId", "title", "agency", "state", "date", "pageUrl", "documentType"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadEisReportsManifest(q?: string): Promise<Record<string, unknown> > {
  return filterEisReportsManifest(buildEisReportsManifest(readEisReportsSnapshot()), q);
}

export function selectEisReportCard(
  snap: EisReportsSnapshot | null,
  opts?: { id?: string; before?: string },
): EisCard | null {
  const all = snap?.cards ?? [];
  const one = opts?.id?.trim();
  if (one) {
    const needle = one.toLowerCase();
    return (
      all.find(
        (c) =>
          c.id.toLowerCase() === needle ||
          c.ceqNumber === one ||
          c.attachmentId === one ||
          c.eisId === one,
      ) ?? null
    );
  }
  if (opts?.before?.trim()) {
    const before = opts.before.trim().toLowerCase();
    const idx = all.findIndex(
      (c) => c.id.toLowerCase() === before || c.ceqNumber === opts.before || c.date === opts.before,
    );
    return idx >= 0 ? all[idx + 1] ?? null : null;
  }
  return all[0] ?? null;
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectEisReports()
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
            skipped: snap.skipped ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            captcha: snap.captcha,
            cards: snap.cards.map((c) => ({
              id: c.id,
              ceqNumber: c.ceqNumber,
              eisId: c.eisId,
              attachmentId: c.attachmentId,
              date: c.date,
              bodyChars: c.body.length,
              title: c.title,
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
