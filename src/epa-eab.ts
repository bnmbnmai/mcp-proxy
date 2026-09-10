#!/usr/bin/env node
/**
 * EPA Environmental Appeals Board Unpublished Final Order / Board Order TEXT door.
 * Official PDFs linked from the Unpublished Final Orders e-docket
 * (yosemite.epa.gov/oa/EAB_Web_Docket.nsf). 17 U.S.C. § 105.
 * Prefer Type=Permit and substantive Board Orders (dismiss petition, untimely, merits).
 * SKIP Penalty ESA/CAFO Expedited Settlement / Consent Agreement rows that twin
 * live /epa-cafo / /fifra-orders. Host is EAB NSF, not OALJ oarm/alj, not RHC oa/rhc.
 * Do not sell ECHO JSON, RHC CAFO packs, OALJ Initial Decisions, or individual
 * NPDES permit texts (/npdes-permits).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const EPA_EAB_PATH = "/epa-eab";
export const EPA_EAB_MANIFEST_PATH = "/epa-eab/manifest.json";
export const EPA_EAB_AMOUNT_ATOMIC = "50000";
export const EPA_EAB_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "epa-eab-board-order-bodies";
export const PRODUCT_NAME = "EPA EAB Unpublished Final Order / Board Order text";

export const NSF_HOST = "yosemite.epa.gov";
export const NSF_PATH = "/oa/EAB_Web_Docket.nsf";
export const LISTING_URL = `https://${NSF_HOST}${NSF_PATH}/Unpublished~Final~Orders?OpenView`;
export const SLIP_URL = `https://${NSF_HOST}${NSF_PATH}/Board+Decisions?OpenView`;
export const PDF_ORIGIN = `https://${NSF_HOST}`;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "U.S. Environmental Protection Agency, Environmental Appeals Board. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const APPEAL_RE =
  /\b((?:NPDES|UIC|CAA|CWA|RCRA|FIFRA|TSCA|SDWA|CERCLA|EPCRA|MM)[-\s]+\d{2}-\d{2}[A-Z]?)\b/i;
export const UNID_RE = /\/([0-9A-Fa-f]{32})(?:!OpenDocument|\/\$(?:File|FILE)\/)/;
export const MEDIA_RE =
  /\/oa\/EAB_Web_Docket\.nsf\/(?:Unpublished(?:~|%7E|%20| )Final(?:~|%7E|%20| )Orders|[0-9A-Fa-f]{32})\/([0-9A-Fa-f]{32})\/\$(?:File|FILE)\/([^?#]+\.pdf)/i;
export const DOC_RE = /\/oa\/EAB_Web_Docket\.nsf\/[0-9A-Fa-f]+\/([0-9A-Fa-f]{32})!OpenDocument/i;
export const OALJ_RE = /\/oarm\/alj\/alj_web_docket\.nsf/i;
export const RHC_RE = /\/oa\/rhc\/epaadmin\.nsf/i;
export const PENALTY_KIND_RE =
  /\bPenalty\b|expedited settlement|consent agreement and final order|consent agreement\s*\/?\s*final order|\bCAFO\b|\bESA\b/i;
export const PERMIT_TYPE_RE = /^\s*Permit\s*$/i;
export const BOARD_ORDER_RE =
  /unpublished final order|board order|order (?:granting|dismissing|denying)|dismissing petition|petition for review/i;
export const KEEP_KIND_RE = /unpublished final order|board order|dismissing petition/i;

export const SESD_UNID = "045E51645556248785258E35005C159E";
export const MONTALBAN_UNID = "C246ADA7BA2304E985258E2D005D00F5";
export const SESD_URL =
  "https://yosemite.epa.gov/oa/EAB_Web_Docket.nsf/4d60a7db00f72aa685258e06006de32c/045e51645556248785258e35005c159e/$FILE/South%20Essex%20Order%20Granting%20Petitioner's%20Motion%20and%20Dismissing%20Petition%20for%20Review,%20Issued%207-15-2026.pdf";
export const MONTALBAN_URL =
  "https://yosemite.epa.gov/oa/EAB_Web_Docket.nsf/4d60a7db00f72aa685258e06006de32c/c246ada7ba2304e985258e2d005d00f5/$FILE/Montalban%20Oil%20Order%20Dismissing%20Petition%20for%20Review%20as%20Untimely,%20Issued%202026.07.07.pdf";

export const CARD_FIELDS = [
  "id",
  "appeal",
  "docket",
  "unid",
  "kind",
  "type",
  "institution",
  "date",
  "title",
  "result",
  "statute",
  "citation",
  "sourceUrl",
  "body",
] as const;

export const BODY_NEEDLE_SEED = "Assented Motion to Dismiss";

export type EpaEabKind = "Board Order" | "Unpublished Final Order";
export type EpaEabType = "Permit" | "Penalty" | "";

export type EpaEabListing = {
  id: string;
  appeal: string;
  docket: string;
  unid: string;
  kind: EpaEabKind;
  type: EpaEabType;
  institution: string;
  date: string | null;
  title: string;
  result: string;
  statute: string;
  citation: string;
  sourceUrl: string;
  docUrl: string | null;
  pdfId: string;
};

export type EpaEabCard = EpaEabListing & { body: string };

export type EpaEabSnapshot = {
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
  sources: { listing: string; pdfHost: string };
  cards: EpaEabCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (EPA EAB public Board Orders; +https://yosemite.epa.gov/oa/EAB_Web_Docket.nsf)";
const OFFICIAL_HOSTS = new Set(["yosemite.epa.gov"]);

export const SEED_LISTINGS: EpaEabListing[] = [
  {
    id: "NPDES-26-03-2026-07-15",
    appeal: "NPDES-26-03",
    docket: "MA0100501",
    unid: SESD_UNID,
    kind: "Board Order",
    type: "Permit",
    institution: "South Essex Sewerage District",
    date: "2026-07-15",
    title: "Order Granting Petitioner's Motion and Dismissing Petition for Review",
    result: "Order Granting Petitioner's Motion and Dismissing Petition for Review",
    statute: "NPDES",
    citation: "Unpublished Final Order",
    sourceUrl: SESD_URL,
    docUrl: `https://${NSF_HOST}${NSF_PATH}/4d60a7db00f72aa685258e06006de32c/${SESD_UNID.toLowerCase()}!OpenDocument`,
    pdfId: SESD_UNID,
  },
  {
    id: "UIC-26-02-2026-07-07",
    appeal: "UIC-26-02",
    docket: "MT52443-12513",
    unid: MONTALBAN_UNID,
    kind: "Board Order",
    type: "Permit",
    institution: "Montalban Oil and Gas Operations, Inc.",
    date: "2026-07-07",
    title: "Order Dismissing Petition for Review as Untimely",
    result: "Order Dismissing Petition for Review as Untimely",
    statute: "UIC",
    citation: "Unpublished Final Order",
    sourceUrl: MONTALBAN_URL,
    docUrl: `https://${NSF_HOST}${NSF_PATH}/4d60a7db00f72aa685258e06006de32c/${MONTALBAN_UNID.toLowerCase()}!OpenDocument`,
    pdfId: MONTALBAN_UNID,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function epaEabDir(): string {
  if (env("EPA_EAB_DIR")) return resolve(env("EPA_EAB_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/epa-eab"));
}

export function snapshotPath(): string {
  return join(epaEabDir(), "snapshot.json");
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " "));
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const named = raw.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (named) {
    const months: Record<string, string> = {
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
    const mm = months[named[1].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
  }
  return null;
}

export function normalizeAppeal(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const hit = raw.match(APPEAL_RE);
  return hit ? hit[1].toUpperCase().replace(/\s+/g, "-") : null;
}

export function statuteFromAppeal(appeal: string | null | undefined): string {
  const a = normalizeAppeal(appeal) || (appeal ?? "").trim();
  return a ? a.split("-")[0] : "";
}

export function parseCaseType(raw: string): EpaEabType {
  if (PERMIT_TYPE_RE.test(raw.trim()) || /\bType\b[^A-Za-z]{0,20}Permit\b/i.test(raw)) return "Permit";
  if (/^\s*Penalty\s*$/i.test(raw.trim()) || PENALTY_KIND_RE.test(raw)) return "Penalty";
  return "";
}

export function parseKind(raw: string): EpaEabKind | null {
  if (PENALTY_KIND_RE.test(raw) && !BOARD_ORDER_RE.test(raw)) return null;
  if (BOARD_ORDER_RE.test(raw) || /unpublished final/i.test(raw)) return "Board Order";
  return null;
}

export function isPenaltyAppeal(appeal: string | null | undefined): boolean {
  const a = normalizeAppeal(appeal) || "";
  return /-\d{2}[CQ]$/i.test(a);
}

export function catalogId(appeal: string, date: string | null, unid: string): string {
  const app = normalizeAppeal(appeal) || appeal;
  if (date) return `${app}-${date}`;
  return `${app}-${unid.slice(0, 8).toLowerCase()}`;
}

export function encodeOfficialPath(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname
      .split("/")
      .map((part) => {
        if (part === "$File" || part === "$FILE") return part;
        try {
          return encodeURIComponent(decodeURIComponent(part.replace(/\+/g, " ")));
        } catch {
          return encodeURIComponent(part);
        }
      })
      .join("/");
    return parsed.href;
  } catch {
    return url;
  }
}

export function officialEpaEabPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim().replace(/&amp;/g, "&"), PDF_ORIGIN);
    if (!OFFICIAL_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    if (OALJ_RE.test(parsed.pathname) || RHC_RE.test(parsed.pathname)) return null;
    const path = decodeURIComponent(parsed.pathname.replace(/\+/g, " "));
    const media = path.match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
    if (!media) return null;
    const file = media[2].split("/").pop() || media[2];
    if (PENALTY_KIND_RE.test(file) && !BOARD_ORDER_RE.test(file)) return null;
    return `${PDF_ORIGIN}${NSF_PATH}/${media[0].includes("Unpublished") ? "Unpublished~Final~Orders" : "4d60a7db00f72aa685258e06006de32c"}/${media[1].toUpperCase()}/$File/${encodeURI(file)}`;
  } catch {
    return null;
  }
}

export function officialDocUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim().replace(/&amp;/g, "&"), PDF_ORIGIN);
    if (!OFFICIAL_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    if (OALJ_RE.test(parsed.pathname) || RHC_RE.test(parsed.pathname)) return null;
    if (!DOC_RE.test(parsed.pathname)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function unidFromUrl(url: string | null | undefined): string {
  const official = officialEpaEabPdfUrl(url) || url || "";
  const media = official.match(MEDIA_RE) || official.match(UNID_RE) || official.match(DOC_RE);
  return media ? media[1].toUpperCase() : official;
}

export function pdfIdFromUrl(url: string | null | undefined): string {
  return unidFromUrl(url);
}

export function isPenaltyTwin(text: string): boolean {
  if (!PENALTY_KIND_RE.test(text)) return false;
  return !/dismissing petition for review|petition for review as (?:untimely|moot)/i.test(text);
}

export function isOaljSibling(text: string): boolean {
  return (
    OALJ_RE.test(text) ||
    (/INITIAL DECISION AND ORDER|Office of Administrative Law Judges/i.test(text) &&
      !/NPDES Appeal No\.|UIC Appeal No\./i.test(text))
  );
}

export function isRhcSibling(text: string): boolean {
  return RHC_RE.test(text);
}

export function isNpdesPermitTwin(text: string): boolean {
  return /AUTHORIZATION TO DISCHARGE UNDER THE NATIONAL POLLUTANT/i.test(text) &&
    !/ENVIRONMENTAL APPEALS BOARD/i.test(text);
}

export function isEchoJson(text: string): boolean {
  return /"RegistryId"\s*:/.test(text) && /"FacName"\s*:/.test(text);
}

export function keepListing(row: Pick<EpaEabListing, "appeal" | "type" | "title" | "result" | "kind">): boolean {
  if (row.type === "Penalty" || isPenaltyTwin(`${row.type} ${row.title} ${row.result}`)) return false;
  if (isPenaltyAppeal(row.appeal) && row.type !== "Permit") return false;
  if (row.type === "Permit") return true;
  const statute = statuteFromAppeal(row.appeal);
  return statute === "NPDES" || statute === "UIC";
}

export function isRealEpaEabBody(text: string): boolean {
  if (isPenaltyTwin(text) || isOaljSibling(text) || isRhcSibling(text) || isNpdesPermitTwin(text) || isEchoJson(text)) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 1200) return false;
  const eab = /ENVIRONMENTAL APPEALS BOARD/i.test(text);
  const board =
    BOARD_ORDER_RE.test(text) ||
    /NPDES Appeal No\.|UIC Appeal No\.|BEFORE ENVIRONMENTAL APPEALS JUDGE/i.test(text);
  return eab && board;
}

export function parseUnpublishedView(html: string): EpaEabListing[] {
  const out: EpaEabListing[] = [];
  const seen = new Set<string>();
  const rows = html.split(/<tr\b/i).slice(1);
  for (const row of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((m) => stripTags(m[1]))
      .filter((c) => c.length > 0);
    if (cells.length < 3) continue;
    const date = isoDate(cells[0]);
    const appeal = normalizeAppeal(cells[1] || row);
    const institution = cells[2];
    const href = officialDocUrl((row.match(/href="([^"]+!OpenDocument[^"]*)"/i) || [])[1]);
    const unid = href ? unidFromUrl(href) : "";
    if (!institution || !appeal || !href || !unid) continue;
    const type: EpaEabType = isPenaltyAppeal(appeal) ? "Penalty" : /^(NPDES|UIC)-/i.test(appeal) ? "Permit" : "";
    if (!keepListing({ appeal, type, title: institution, result: "", kind: "Board Order" })) continue;
    const id = catalogId(appeal, date, unid);
    if (seen.has(id) || seen.has(unid)) continue;
    seen.add(id);
    seen.add(unid);
    out.push({
      id,
      appeal,
      docket: appeal,
      unid,
      kind: "Board Order",
      type,
      institution,
      date,
      title: "Unpublished Final Order",
      result: "",
      statute: statuteFromAppeal(appeal),
      citation: "Unpublished Final Order",
      sourceUrl: "",
      docUrl: href,
      pdfId: unid,
    });
  }
  out.sort((a, b) => {
    const typeRank = (t: EpaEabType) => (t === "Permit" ? 0 : 1);
    const byType = typeRank(a.type) - typeRank(b.type);
    if (byType !== 0) return byType;
    return `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`);
  });
  return out;
}

export function parseDocumentPageHtml(html: string): {
  sourceUrl: string | null;
  type: EpaEabType;
  result: string;
  docket: string;
  citation: string;
} {
  const visible = stripTags(html);
  const type = parseCaseType(visible.match(/\bType\b\s+(Permit|Penalty)\b/i)?.[1] ?? visible);
  const result =
    visible.match(/\bResult\b\s+([A-Za-z][^.]{8,160}?)(?:\s*\(PDF|\s+South Essex|\s+Montalban|\s+No other)/i)?.[1]?.trim() ??
    "";
  const docket =
    visible
      .match(/\bDocket Number\b\s+(.+?)(?:\s+Filing Number|\s+Statut|\s+Type\b|\s+Program)/i)?.[1]
      ?.trim() ?? "";
  const citation =
    visible.match(/\bCitation\b\s+(Unpublished Final Order|Published Decision|Slip Opinion)/i)?.[1] ??
    "Unpublished Final Order";
  const hrefs = [...html.matchAll(/href="([^"]+\$(?:File|FILE)\/[^"]+\.pdf[^"]*)"/gi)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
  let sourceUrl: string | null = null;
  for (const href of hrefs) {
    const official = officialEpaEabPdfUrl(href);
    if (official) {
      sourceUrl = official;
      break;
    }
  }
  return { sourceUrl, type, result: decodeEntities(result), docket: decodeEntities(docket), citation };
}

export function parseEpaEabText(
  text: string,
  meta: Partial<EpaEabListing> & { sourceUrl: string },
): EpaEabCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialEpaEabPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const appealFromBody = body.match(/\b((?:NPDES|UIC|CAA)\s+Appeal\s+No\.\s+\d{2}-\d{2}[A-Z]?)/i);
  const appeal =
    normalizeAppeal(meta.appeal) ||
    normalizeAppeal(appealFromBody ? appealFromBody[1].replace(/Appeal\s+No\.\s+/i, "") : "") ||
    normalizeAppeal(body.match(APPEAL_RE)?.[0] ?? "") ||
    meta.unid ||
    "unknown";
  const date = meta.date ?? isoDate(body.slice(0, 4000));
  const unid = (meta.unid || pdfIdFromUrl(sourceUrl)).toUpperCase();
  const type = meta.type || parseCaseType(`${meta.title ?? ""} ${body.slice(0, 2500)}`);
  const kind = meta.kind || parseKind(`${meta.title ?? ""} ${meta.result ?? ""} ${body.slice(0, 2500)}`) || "Board Order";
  return {
    id: meta.id || catalogId(appeal, date, unid),
    appeal,
    docket: (meta.docket && meta.docket.trim()) || appeal,
    unid,
    kind,
    type,
    institution: (meta.institution && meta.institution.trim()) || appeal,
    date,
    title: meta.title || meta.result || "Unpublished Final Order",
    result: meta.result || meta.title || "Unpublished Final Order",
    statute: meta.statute || statuteFromAppeal(appeal),
    citation: meta.citation || "Unpublished Final Order",
    sourceUrl,
    docUrl: meta.docUrl ?? null,
    pdfId: meta.pdfId || unid,
    body,
  };
}

function emptySources(): EpaEabSnapshot["sources"] {
  return { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}${NSF_PATH}/Unpublished~Final~Orders/` };
}

export function emptyEpaEabSnapshot(reason: string): EpaEabSnapshot {
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

export function assembleEpaEabSnapshot(cards: EpaEabCard[], fetchedAt?: string): EpaEabSnapshot {
  const kept = cards.filter((c) => isRealEpaEabBody(c.body) && keepListing(c));
  kept.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf =
    kept
      .map((c) => c.date)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: kept.length ? "ok" : "empty",
    reason: kept.length ? null : "Official EPA EAB Board Order PDFs had no extractable Board text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): EpaEabSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as EpaEabSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleEpaEabSnapshot(snap.cards, typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined);
}

export function readEpaEabSnapshot(): EpaEabSnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeEpaEabSnapshot(snap: EpaEabSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchEpaEabText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

export async function fetchEpaEabBytes(url: string): Promise<Uint8Array> {
  const official = encodeOfficialPath(officialEpaEabPdfUrl(url) || url);
  const res = await fetch(official, { headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${official} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("EPA_EAB_PDFTOTEXT") || "pdftotext";
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

function listingDir(): string {
  return env("EPA_EAB_HTML_DIR") || env("EPA_EAB_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("EPA_EAB_LIMIT", "4"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 4;
}

function maxFetchLimit(): number {
  const n = Number(env("EPA_EAB_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function viewCount(): number {
  const n = Number(env("EPA_EAB_VIEW_COUNT", "80"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 80;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function mergeListings(listed: EpaEabListing[]): EpaEabListing[] {
  const seen = new Set<string>();
  const out: EpaEabListing[] = [];
  for (const row of [...SEED_LISTINGS, ...listed]) {
    if (!keepListing(row)) continue;
    const id = row.id || catalogId(row.appeal, row.date, row.unid);
    if (!id || seen.has(id) || seen.has(row.unid)) continue;
    seen.add(id);
    seen.add(row.unid);
    out.push({ ...row, id });
  }
  out.sort((a, b) => {
    const typeRank = (t: EpaEabType) => (t === "Permit" ? 0 : 1);
    const byType = typeRank(a.type) - typeRank(b.type);
    if (byType !== 0) return byType;
    return `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`);
  });
  return out;
}

export function listingPageUrl(count = viewCount()): string {
  return `${LISTING_URL}&Count=${count}`;
}

export async function walkOfficialEpaEab(opts?: {
  fetchText?: (url: string) => Promise<string>;
  count?: number;
}): Promise<{ listed: EpaEabListing[]; listedCount: number }> {
  const fetchText = opts?.fetchText ?? fetchEpaEabText;
  const html = await fetchText(listingPageUrl(opts?.count ?? viewCount()));
  const listed = parseUnpublishedView(html);
  return { listed: mergeListings(listed), listedCount: Math.max(listed.length, SEED_LISTINGS.length) };
}

async function loadOfficialListings(dir: string): Promise<{ listed: EpaEabListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const listed = html ? parseUnpublishedView(html) : [];
    return { listed: mergeListings(listed), listedCount: listed.length };
  }
  try {
    const walked = await walkOfficialEpaEab();
    if (walked.listed.length > 0) return walked;
  } catch {
    /* keep seeds */
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function resolveSourceUrl(
  row: EpaEabListing,
  dir: string,
  fetchText: (url: string) => Promise<string>,
): Promise<{ sourceUrl: string; type: EpaEabType; result: string; docket: string }> {
  if (officialEpaEabPdfUrl(row.sourceUrl)) {
    return {
      sourceUrl: officialEpaEabPdfUrl(row.sourceUrl) as string,
      type: row.type,
      result: row.result,
      docket: row.docket,
    };
  }
  const localDoc = readNamedFile(
    dir,
    [
      `${row.id.toLowerCase()}-doc.html`,
      `${row.unid.toLowerCase()}-doc.html`,
      row.id === "NPDES-26-03-2026-07-15" ? "sesd-doc.html" : "",
      row.id === "UIC-26-02-2026-07-07" ? "montalban-doc.html" : "",
    ].filter(Boolean),
  );
  if (localDoc) {
    const fromLocal = parseDocumentPageHtml(localDoc);
    if (fromLocal.sourceUrl) {
      return {
        sourceUrl: fromLocal.sourceUrl,
        type: fromLocal.type || row.type,
        result: fromLocal.result || row.result,
        docket: fromLocal.docket || row.docket,
      };
    }
  }
  if (row.docUrl) {
    const fromLive = parseDocumentPageHtml(await fetchText(row.docUrl));
    if (fromLive.sourceUrl) {
      return {
        sourceUrl: fromLive.sourceUrl,
        type: fromLive.type || row.type,
        result: fromLive.result || row.result,
        docket: fromLive.docket || row.docket,
      };
    }
  }
  throw new Error(`no official EAB PDF for ${row.id}`);
}

export async function collectEpaEab(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<EpaEabSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = epaEabDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, EpaEabCard>();
  for (const card of readEpaEabSnapshot()?.cards ?? []) {
    if (isRealEpaEabBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  const cards: EpaEabCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    if (!keepListing(row)) {
      skippedNoText += 1;
      continue;
    }
    const cached = prior.get(row.id);
    if (cached) {
      cards.push(cached);
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetchedPdfs >= fetchCap) break;
    try {
      const localText = readNamedFile(dir, [
        `${row.id}.txt`,
        `${row.id.toLowerCase()}.txt`,
        `${row.appeal}.txt`,
        `${row.unid}.txt`,
      ]);
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const resolved = localText
        ? {
            sourceUrl: row.sourceUrl || SEED_LISTINGS.find((s) => s.id === row.id)?.sourceUrl || row.sourceUrl,
            type: row.type,
            result: row.result,
            docket: row.docket,
          }
        : await resolveSourceUrl(row, dir, fetchEpaEabText);
      if (resolved.type === "Penalty" || isPenaltyTwin(`${resolved.type} ${resolved.result} ${resolved.sourceUrl}`)) {
        skippedNoText += 1;
        continue;
      }
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id.replace(/[^\w.-]+/g, "_")}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchEpaEabBytes(resolved.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseEpaEabText(text, {
        ...row,
        type: resolved.type || row.type,
        result: resolved.result || row.result,
        docket: resolved.docket || row.docket,
        title: resolved.result || row.title,
        sourceUrl: resolved.sourceUrl || row.sourceUrl,
      });
      if (!isRealEpaEabBody(parsed.body) || !keepListing(parsed)) {
        skippedNoText += 1;
        continue;
      }
      cards.push(parsed);
      seen.add(row.id);
      addedThisRun += 1;
    } catch {
      skippedNoText += 1;
    }
  }
  for (const [id, card] of prior) {
    if (!seen.has(id)) cards.push(card);
  }
  const snap = {
    ...assembleEpaEabSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeEpaEabSnapshot(snap);
  return snap;
}

export async function loadEpaEab(): Promise<EpaEabSnapshot> {
  const cached = readEpaEabSnapshot();
  if (cached && cached.cards.some((c) => isRealEpaEabBody(c.body))) return cached;
  try {
    return await collectEpaEab();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live EPA EAB Board Order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyEpaEabSnapshot(
      `EPA EAB Board Order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildEpaEabManifest(snap: EpaEabSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealEpaEabBody(c.body) && keepListing(c));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      EPA_EAB_PATH,
      "Count + case + appeal + date + Type/Result only. Board Order body is the paid GET /epa-eab payload. This free manifest lists the full catalog. Prefer Type=Permit Unpublished Final Orders. Skip Penalty ESA/CAFO rows that twin live /epa-cafo / /fifra-orders. Host is EAB NSF, not OALJ, not RHC. Not /npdes-permits permit text.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: EPA_EAB_AMOUNT_ATOMIC,
    oneAmountAtomic: EPA_EAB_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      appeal: c.appeal,
      docket: c.docket,
      kind: c.kind,
      type: c.type,
      date: c.date,
      title: c.title,
      result: c.result,
      statute: c.statute,
      citation: c.citation,
      sourceUrl: c.sourceUrl,
    })),
    schema: {
      fields: ["id", "institution", "appeal", "docket", "kind", "type", "date", "title", "result", "statute", "citation", "sourceUrl"],
    },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterEpaEabManifest(manifest: Record<string, unknown>, q?: string): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "appeal", "docket", "kind", "type", "date", "title", "result", "statute", "citation"].some((k) =>
      String(row[k] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadEpaEabManifest(q?: string): Promise<Record<string, unknown>> {
  return filterEpaEabManifest(buildEpaEabManifest(readEpaEabSnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectEpaEab()
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
            cards: snap.cards.map((c) => ({
              id: c.id,
              appeal: c.appeal,
              docket: c.docket,
              institution: c.institution,
              kind: c.kind,
              type: c.type,
              date: c.date,
              title: c.title,
              result: c.result,
              statute: c.statute,
              bodyChars: c.body.length,
              sourceUrl: c.sourceUrl,
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
