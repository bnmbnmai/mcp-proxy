/**
 * California Water Boards ACL order TEXT door.
 * Official PDFs from waterboards.ca.gov/{region}/board_decisions/adopted_orders/{year}/.
 * Stipulated / hearing / MMP-as-ACL company/institution orders only.
 * Does not invent order text. Not people. Not the discretionary-ACL table + transmittal.
 * Not CIWQS / data.ca.gov 32-col index. Not ECHO summaries.
 * Not /superfund-rods. Not /atsdr-hc. Not FCC EDOCS. Not a stub.
 * License: public domain (waterboards.ca.gov/conditions_of_use.html —
 * “distributed or copied as permitted by law”). Photo/seal carve-out only.
 * Prep only — do not list on well-known / OpenAPI / llms.txt / shop catalog.
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const WATERBOARDS_ACL_PATH = "/waterboards-acl";
export const WATERBOARDS_ACL_MANIFEST_PATH = "/waterboards-acl/manifest.json";
export const WATERBOARDS_ACL_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "waterboards-acl-order-bodies";
export const PRODUCT_NAME = "California Water Boards ACL order text";

export const LISTING_URL = "https://www.waterboards.ca.gov/water_issues/programs/enforcement/orders_actions.html";
export const PDF_HOST = "www.waterboards.ca.gov";
export const PDF_ORIGIN = "https://www.waterboards.ca.gov";
export const CONDITIONS_URL = "https://www.waterboards.ca.gov/conditions_of_use.html";
export const REGIONS = [
  "centralcoast",
  "sandiego",
  "losangeles",
  "centralvalley",
  "northcoast",
  "sanfranciscobay",
  "lahontan",
  "coloradoriver",
  "santaana",
] as const;
export const MEDIA_RE = new RegExp(
  `\\/(${REGIONS.join("|")})\\/board_decisions\\/adopted_orders\\/(20\\d{2})\\/([^/?#]+\\.pdf)$`,
  "i",
);
export const LICENSE = "Public domain (California Water Boards Conditions of Use)";
export const ATTRIBUTION =
  "California State Water Resources Control Board / Regional Water Quality Control Boards. Information on waterboards.ca.gov is considered in the public domain and may be distributed or copied as permitted by law. Photo, unique branding, and official seal carve-out only. https://www.waterboards.ca.gov/conditions_of_use.html";

/** Imperva in front of waterboards.ca.gov. wget + full browser UA is the reliable collector. */
export const WGET_SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export const CARD_FIELDS = ["id", "orderNumber", "pdfId", "institution", "date", "title", "sourceUrl", "body"] as const;

export type WaterboardsAclListingRow = {
  institution?: string;
  individual?: string;
  orderNumber?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
  id?: string;
};

export type WaterboardsAclListing = {
  id: string;
  orderNumber: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type WaterboardsAclCard = {
  id: string;
  orderNumber: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type WaterboardsAclSnapshot = {
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
  sources: { listing: string; pdfHost: string; conditions: string };
  cards: WaterboardsAclCard[];
};

const OFFICIAL_HOSTS = new Set(["www.waterboards.ca.gov", "waterboards.ca.gov"]);
const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|District|City of|County of|Sanitary|Municipal|Authority|Partners|Power|Quarry|Institution)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
const DOC_TITLE_RE =
  /Administrative Civil Liability|\bACL\b|Stipulat(?:ed|ion)(?:\s+Order)?|Settlement Agreement and Stipulation|Acceptance of Conditional Settlement|Mandatory Minimum Penalty|\bMMP\b/i;
const TRANSMITTAL_FILE_RE = /-letter\.pdf|transmittal|cover.?letter/i;
const ATTACHMENT_FILE_RE = /(?:^|[/_-])(?:att[-_]|attachment|pen-calcs|exhibits)/i;
const KILL_TITLE_RE =
  /transmittal letter|discretionary.?acl table|ciwqs|data\.ca\.gov|echo|superfund-rods|record of decision|\brod\b|atsdr-hc|health consultation|fcc edocs|listing only|people/i;

export const SEED_LISTINGS: WaterboardsAclListing[] = [
  {
    id: "goleta-r3-2026-0023",
    orderNumber: "R3-2026-0023",
    institution: "Goleta West Sanitary District",
    date: "2026-02-27",
    title: "Settlement Agreement and Stipulation for Entry of Administrative Civil Liability Order",
    sourceUrl:
      "https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2026/2026-0023-goleta-west-aclo.pdf",
    pdfId: "2026-0023-goleta-west-aclo.pdf",
  },
  {
    id: "watsonville-r3-2026-0033",
    orderNumber: "R3-2026-0033",
    institution: "City of Watsonville",
    date: "2026-05-26",
    title: "Administrative Civil Liability Order (MMP)",
    sourceUrl:
      "https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2026/2026-0033-watsonville-aclo.pdf",
    pdfId: "2026-0033-watsonville-aclo.pdf",
  },
  {
    id: "baldwin-r9-2026-0063",
    orderNumber: "R9-2026-0063",
    institution: "Baldwin & Sons, Inc. et al.",
    date: "2026-05-13",
    title: "Order Assessing Administrative Civil Liability",
    sourceUrl: "https://www.waterboards.ca.gov/sandiego/board_decisions/adopted_orders/2026/r9-2026-0063.pdf",
    pdfId: "r9-2026-0063.pdf",
  },
  {
    id: "granite-rock-r3-2025-0051",
    orderNumber: "R3-2025-0051",
    institution: "Granite Rock Company",
    date: "2025-09-04",
    title: "Administrative Civil Liability Order (MMP)",
    sourceUrl:
      "https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2025/2025-0051-granite-rock-aclo.pdf",
    pdfId: "2025-0051-granite-rock-aclo.pdf",
  },
  {
    id: "moss-landing-r3-2026-0037",
    orderNumber: "R3-2026-0037",
    institution: "Moss Landing Power Company, LLC",
    date: "2026-07-21",
    title: "Administrative Civil Liability Order (MMP)",
    sourceUrl:
      "https://www.waterboards.ca.gov/centralcoast/board_decisions/adopted_orders/2026/2026-0037-moss-landing-aclo.pdf",
    pdfId: "2026-0037-moss-landing-aclo.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function waterboardsAclDir(): string {
  if (env("WATERBOARDS_ACL_DIR")) return resolve(env("WATERBOARDS_ACL_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/waterboards-acl"));
}

export function snapshotPath(): string {
  return join(waterboardsAclDir(), "snapshot.json");
}

export function compactForMatch(text: string): string {
  return text.replace(/-\n\s*/g, "").replace(/\s+/g, " ").trim();
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " "));
}

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

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const named = raw.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (named) {
    const mm = MONTHS[named[1].toLowerCase()];
    return mm ? `${named[3]}-${mm}-${named[2].padStart(2, "0")}` : null;
  }
  const short = raw.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i);
  if (short) {
    const map: Record<string, string> = {
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
    const mm = map[short[1].slice(0, 3).toLowerCase()];
    return mm ? `${short[3]}-${mm}-${short[2].padStart(2, "0")}` : null;
  }
  return null;
}

function blockedHost(host: string): boolean {
  return (
    host === "ciwqs.waterboards.ca.gov" ||
    host === "data.ca.gov" ||
    host === "echo.epa.gov" ||
    host === "www.echo.epa.gov" ||
    host === "semspub.epa.gov" ||
    host === "www.semspub.epa.gov" ||
    host === "atsdr.cdc.gov" ||
    host === "www.atsdr.cdc.gov" ||
    host === "docs.fcc.gov" ||
    host === "www.fcc.gov" ||
    host === "fcc.gov" ||
    host === "ico.org.uk" ||
    host === "www.ico.org.uk" ||
    host === "www.fsis.usda.gov" ||
    host === "primis.phmsa.dot.gov" ||
    host === "web.archive.org"
  );
}

export function isTransmittalPdf(urlOrPath: string | null | undefined): boolean {
  return TRANSMITTAL_FILE_RE.test(urlOrPath ?? "");
}

export function isAttachmentPdf(urlOrPath: string | null | undefined): boolean {
  return ATTACHMENT_FILE_RE.test(urlOrPath ?? "");
}

export function officialWaterboardsAclPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (blockedHost(host)) return null;
    if (!OFFICIAL_HOSTS.has(host)) return null;
    const path = decodeURIComponent(parsed.pathname);
    if (isTransmittalPdf(path) || isAttachmentPdf(path)) return null;
    if (/\/water_issues\/programs\/enforcement\//i.test(path) && !/adopted_orders/i.test(path)) return null;
    const media = path.match(MEDIA_RE);
    if (!media) return null;
    return `${PDF_ORIGIN}/${media[1]}/board_decisions/adopted_orders/${media[2]}/${media[3]}`;
  } catch {
    return null;
  }
}

export function parseOfficialFilename(url: string | null | undefined): {
  region: string;
  year: string;
  pdfId: string;
} | null {
  const official = officialWaterboardsAclPdfUrl(url) || url || "";
  const media = official.match(MEDIA_RE);
  if (!media) return null;
  return { region: media[1], year: media[2], pdfId: media[3] };
}

export function orderNumberFrom(urlOrId: string, fallback?: string): string {
  if (fallback && fallback.trim()) return fallback.trim().toUpperCase();
  const named = urlOrId.match(/\b(R[1-9]|R1[0-9])[-_](\d{4})[-_](\d{3,4})\b/i);
  if (named) return `${named[1].toUpperCase()}-${named[2]}-${named[3]}`;
  const yearFirst = urlOrId.match(/\b(20\d{2})[-_](\d{4})\b/);
  if (yearFirst) return `R3-${yearFirst[1]}-${yearFirst[2]}`;
  return urlOrId.replace(/\.pdf$/i, "").toUpperCase();
}

export function slugFromFilename(parsed: { pdfId: string }, fallbackId?: string): string {
  if (fallbackId && fallbackId.trim()) return fallbackId.trim();
  return parsed.pdfId.replace(/\.pdf$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function isPeopleRow(row: WaterboardsAclListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (ENTITY_RE.test(name)) return false;
  return PERSON_NAME_RE.test(name);
}

export function isTransmittalRow(row: WaterboardsAclListingRow): boolean {
  return TRANSMITTAL_FILE_RE.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`);
}

export function isTableRow(row: WaterboardsAclListingRow): boolean {
  return /discretionary.?acl|acl table|orders_actions|listing only/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isCiwqsRow(row: WaterboardsAclListingRow): boolean {
  return /ciwqs|data\.ca\.gov/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isEchoRow(row: WaterboardsAclListingRow): boolean {
  return /echo\.epa\.gov|\becho\b/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isSuperfundRodRow(row: WaterboardsAclListingRow): boolean {
  return /semspub\.epa\.gov|superfund-rods|record of decision/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isAtsdrRow(row: WaterboardsAclListingRow): boolean {
  return /atsdr\.cdc\.gov|atsdr-hc|health consultation|public health assessment/i.test(
    `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`,
  );
}

export function isFccRow(row: WaterboardsAclListingRow): boolean {
  return /docs\.fcc\.gov|fcc edocs|\bfcc\b/i.test(`${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`);
}

export function isInstitutionAclRow(row: WaterboardsAclListingRow): boolean {
  if (isPeopleRow(row)) return false;
  if (!ENTITY_RE.test((row.institution ?? "").trim())) return false;
  if (
    isTransmittalRow(row) ||
    isTableRow(row) ||
    isCiwqsRow(row) ||
    isEchoRow(row) ||
    isSuperfundRodRow(row) ||
    isAtsdrRow(row) ||
    isFccRow(row)
  ) {
    return false;
  }
  if (!officialWaterboardsAclPdfUrl(row.sourceUrl ?? "")) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""} ${row.pdfId ?? ""}`;
  if (KILL_TITLE_RE.test(kind)) return false;
  if (!DOC_TITLE_RE.test(kind) && !/-aclo\.pdf|acl-/i.test(row.sourceUrl ?? "") && !/-aclo\.pdf|acl-/i.test(row.pdfId ?? "")) {
    return false;
  }
  return true;
}

export function parseListingRows(rows: WaterboardsAclListingRow[]): WaterboardsAclListing[] {
  const found: WaterboardsAclListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionAclRow(row)) continue;
    const sourceUrl = officialWaterboardsAclPdfUrl(row.sourceUrl ?? "");
    const parsed = parseOfficialFilename(sourceUrl ?? "");
    if (!sourceUrl || !parsed) continue;
    const id = (row.id ?? "").trim() || slugFromFilename(parsed);
    if (seen.has(id)) continue;
    seen.add(id);
    found.push({
      id,
      orderNumber: orderNumberFrom(`${row.orderNumber ?? ""} ${parsed.pdfId} ${id}`, row.orderNumber),
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: (row.title ?? "").trim() || "Administrative Civil Liability Order",
      sourceUrl,
      pdfId: (row.pdfId ?? "").trim() || parsed.pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return found;
}

export function parseListingHtml(html: string): WaterboardsAclListing[] {
  const rows: WaterboardsAclListingRow[] = [];
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of links) {
    const href = m[1].startsWith("http") ? m[1] : `${PDF_ORIGIN}${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (!officialWaterboardsAclPdfUrl(href)) continue;
    const parsed = parseOfficialFilename(href);
    if (!parsed) continue;
    const idx = m.index ?? 0;
    const trStart = html.lastIndexOf("<tr", idx);
    const trEnd = html.indexOf("</tr>", idx);
    const nearby = stripTags(
      trStart >= 0 && trEnd > trStart
        ? html.slice(trStart, trEnd + 5)
        : html.slice(Math.max(0, idx - 200), idx + m[0].length + 80),
    );
    const seed = SEED_LISTINGS.find((s) => s.sourceUrl === officialWaterboardsAclPdfUrl(href));
    const institution = nearby
      .replace(/\s+(ACL|MMP|Hearing|Stipulat|Order|R[1-9]-).*$/i, "")
      .replace(/,?\s*$/, "")
      .trim();
    rows.push({
      institution: institution || seed?.institution,
      orderNumber: seed?.orderNumber || orderNumberFrom(parsed.pdfId),
      date: isoDate(nearby) || seed?.date || undefined,
      title: /stipulat/i.test(nearby)
        ? "Settlement Agreement and Stipulation for Entry of Administrative Civil Liability Order"
        : /hearing/i.test(nearby)
          ? "Order Assessing Administrative Civil Liability"
          : "Administrative Civil Liability Order",
      type: /mmp/i.test(nearby) ? "mmp-acl" : /hearing/i.test(nearby) ? "hearing-acl" : "stipulated-acl",
      sourceUrl: href,
      pdfId: parsed.pdfId,
      id: seed?.id || slugFromFilename(parsed),
    });
  }
  return parseListingRows(rows);
}

export function isListingTeaserDump(text: string): boolean {
  if (/Index only — entity \/ order number \/ date \/ official PDF URL/i.test(text)) return true;
  if (/that is the index, not the sold body/i.test(text) && !DOC_TITLE_RE.test(text)) return true;
  if (/Discretionary-ACL table \+ transmittal|32-column CIWQS/i.test(text)) return true;
  return false;
}

export function isTransmittalDump(text: string): boolean {
  if (/This transmittal letter is NOT the sold body/i.test(text)) return true;
  const compact = compactForMatch(text);
  if (compact.length > 2500) return false;
  const letter = /^dear\b/im.test(text) && /attached is/i.test(text);
  const order =
    /SETTLEMENT AGREEMENT AND\s+STIPULATION FOR ENTRY OF\s+ADMINISTRATIVE CIVIL LIABILITY/i.test(text) ||
    /ACCEPTANCE OF CONDITIONAL SETTLEMENT OFFER/i.test(text) ||
    /ASSESSING ADMINISTRATIVE CIVIL LIABILITY/i.test(text);
  return letter && !order;
}

export function isPeopleDump(text: string): boolean {
  if (/people-only Water Boards|named-individual SKU/i.test(text)) return true;
  if (/\bAn Individual\b/i.test(text) && !ENTITY_RE.test(text)) return true;
  return false;
}

export function isCiwqsDump(text: string): boolean {
  return /ciwqs\.waterboards\.ca\.gov|data\.ca\.gov\/dataset/i.test(text) && /32[- ]col/i.test(text);
}

export function isEchoDump(text: string): boolean {
  return /echo\.epa\.gov|Enforcement and Compliance History Online/i.test(text);
}

export function isSuperfundRodDump(text: string): boolean {
  return /RECORD OF DECISION|\/superfund-rods\b/i.test(text) && /Environmental Protection Agency|\bCERCLA\b/i.test(text);
}

export function isAtsdrHcDump(text: string): boolean {
  return /Agency for Toxic Substances and Disease Registry|\bATSDR\b/i.test(text) && /Health Consultation|\/atsdr-hc\b/i.test(text);
}

export function isFccEdocsDump(text: string): boolean {
  return /Federal Communications Commission|FCC EDOCS|docs\.fcc\.gov/i.test(text);
}

export function isRealWaterboardsAclBody(text: string): boolean {
  if (
    isListingTeaserDump(text) ||
    isTransmittalDump(text) ||
    isPeopleDump(text) ||
    isCiwqsDump(text) ||
    isEchoDump(text) ||
    isSuperfundRodDump(text) ||
    isAtsdrHcDump(text) ||
    isFccEdocsDump(text)
  ) {
    return false;
  }
  const compact = compactForMatch(text);
  if (compact.length < 800) return false;
  const board = /Regional Water Quality Control Board|State Water Resources Control Board|California Water Board/i.test(
    compact,
  );
  const doc = DOC_TITLE_RE.test(compact);
  const company = ENTITY_RE.test(compact);
  return board && doc && company;
}

export function parseWaterboardsAclText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
    orderNumber?: string;
  },
): WaterboardsAclCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialWaterboardsAclPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const parsed = parseOfficialFilename(sourceUrl);
  const id = meta.id && meta.id.trim() ? meta.id.trim() : parsed ? slugFromFilename(parsed) : "unknown";
  const title =
    (meta.title && meta.title.trim()) ||
    (/Settlement Agreement and Stipulation/i.test(body.slice(0, 800))
      ? "Settlement Agreement and Stipulation for Entry of Administrative Civil Liability Order"
      : /Assessing Administrative Civil Liability/i.test(body.slice(0, 800))
        ? "Order Assessing Administrative Civil Liability"
        : "Administrative Civil Liability Order");
  return {
    id,
    orderNumber: orderNumberFrom(`${meta.orderNumber ?? ""} ${parsed?.pdfId ?? ""} ${id}`, meta.orderNumber),
    pdfId: meta.pdfId || parsed?.pdfId || `${id}.pdf`,
    institution: (meta.institution && meta.institution.trim()) || id,
    date: meta.date ?? isoDate(body.slice(0, 1200)),
    title,
    sourceUrl,
    body,
  };
}

export function emptyWaterboardsAclSnapshot(reason: string): WaterboardsAclSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/{region}/board_decisions/adopted_orders/`, conditions: CONDITIONS_URL },
    cards: [],
  };
}

export function assembleWaterboardsAclSnapshot(
  cards: WaterboardsAclCard[],
  fetchedAt = new Date().toISOString(),
): WaterboardsAclSnapshot {
  const withBody = cards
    .filter((c) => isRealWaterboardsAclBody(c.body))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official Water Boards ACL PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/{region}/board_decisions/adopted_orders/`, conditions: CONDITIONS_URL },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): WaterboardsAclSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as WaterboardsAclSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readWaterboardsAclSnapshot(): WaterboardsAclSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  return null;
}

export function writeWaterboardsAclSnapshot(snap: WaterboardsAclSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function wgetOfficialPdf(url: string, dest: string): void {
  const official = officialWaterboardsAclPdfUrl(url);
  if (!official) throw new Error(`${url} is not an official Water Boards ACL PDF`);
  const ua = env("WATERBOARDS_ACL_WGET_UA") || WGET_SAFARI_UA;
  const helper = env("WATERBOARDS_ACL_WGET") || "wget";
  const result = spawnSync(helper, ["--user-agent=" + ua, "-O", dest, "--timeout=90", official], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw new Error(`wget failed: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(
      `wget ${official} failed: ${String(result.stderr || result.stdout || result.status || "unknown").slice(0, 400)}`,
    );
  }
}

export async function fetchWaterboardsAclBytes(url: string): Promise<Uint8Array> {
  const dest = join(tmpdir(), `waterboards-acl-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
  try {
    wgetOfficialPdf(url, dest);
    const bytes = new Uint8Array(readFileSync(dest));
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${url} is not an official PDF`);
    return bytes;
  } finally {
    try {
      if (existsSync(dest)) unlinkSync(dest);
    } catch {
      /* ignore */
    }
  }
}

function digitalPdfText(pdfPath: string): string {
  const helper = env("WATERBOARDS_ACL_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

export function pdfToText(pdfPath: string): string {
  return digitalPdfText(pdfPath);
}

function listingDir(): string {
  return env("WATERBOARDS_ACL_JSON_DIR") || env("WATERBOARDS_ACL_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("WATERBOARDS_ACL_LIMIT", "5"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function maxFetchLimit(): number {
  const n = Number(env("WATERBOARDS_ACL_MAX_FETCH", "8"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function safePdfName(pdfId: string, id: string): string {
  const name = pdfId.endsWith(".pdf") ? pdfId : `${id}.pdf`;
  return name.replace(/[^\w.\-]+/g, "_");
}

async function loadOfficialListings(dir: string): Promise<{ listed: WaterboardsAclListing[]; listedCount: number }> {
  if (dir) {
    const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
    if (json) {
      const rows = JSON.parse(json) as WaterboardsAclListingRow[];
      const listed = Array.isArray(rows) ? parseListingRows(rows) : [];
      return { listed, listedCount: listed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    return { listed: html ? parseListingHtml(html) : [], listedCount: html ? parseListingHtml(html).length : 0 };
  }
  return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length };
}

async function extractOfficialText(
  row: WaterboardsAclListing,
  cacheDir: string,
  fetched: { n: number },
): Promise<string> {
  const pdfFile = join(cacheDir, safePdfName(row.pdfId, row.id));
  if (!existsSync(pdfFile)) {
    writeFileSync(pdfFile, await fetchWaterboardsAclBytes(row.sourceUrl));
    fetched.n += 1;
  }
  return pdfToText(pdfFile);
}

export async function collectWaterboardsAcl(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<WaterboardsAclSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = waterboardsAclDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, WaterboardsAclCard>();
  for (const card of readWaterboardsAclSnapshot()?.cards ?? []) {
    if (isRealWaterboardsAclBody(card.body)) prior.set(card.id, card);
  }
  const cards: WaterboardsAclCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
  const fetched = { n: 0 };
  for (const row of allListed) {
    if (target > 0 && addedThisRun >= target) break;
    const cached = prior.get(row.id);
    if (cached) {
      cards.push(cached);
      seen.add(row.id);
      reused += 1;
      continue;
    }
    if (fetchCap > 0 && fetched.n >= fetchCap) break;
    try {
      const localText = readNamedFile(dir, [
        `${row.id}.txt`,
        `${row.pdfId}.txt`,
        row.pdfId.replace(/\.pdf$/i, ".txt"),
      ]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const text = localText ?? (await extractOfficialText(row, cacheDir, fetched));
      fetchedPdfs = fetched.n;
      const parsed = parseWaterboardsAclText(text, row);
      if (!isRealWaterboardsAclBody(parsed.body)) {
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
  const snap = { ...assembleWaterboardsAclSnapshot(cards), listedCount, fetchedPdfs, skippedNoText, reused, addedThisRun };
  writeWaterboardsAclSnapshot(snap);
  return snap;
}

export async function loadWaterboardsAcl(): Promise<WaterboardsAclSnapshot> {
  const cached = readWaterboardsAclSnapshot();
  if (cached && cached.cards.some((c) => isRealWaterboardsAclBody(c.body))) return cached;
  try {
    return await collectWaterboardsAcl();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live Water Boards ACL fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyWaterboardsAclSnapshot(
      `Water Boards ACL PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildWaterboardsAclManifest(snap: WaterboardsAclSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealWaterboardsAclBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: "Count + entity + order number + date + official PDF URL only. ACL order body is the paid GET /waterboards-acl payload. Not people. Not the discretionary-ACL table + transmittal. Not CIWQS / data.ca.gov. Not ECHO. Not /superfund-rods. Not /atsdr-hc. Prep only — do not list.",
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: WATERBOARDS_ACL_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      orderNumber: c.orderNumber,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "orderNumber", "date", "sourceUrl"] },
    sources: snap?.sources ?? {
      listing: LISTING_URL,
      pdfHost: `${PDF_ORIGIN}/{region}/board_decisions/adopted_orders/`,
      conditions: CONDITIONS_URL,
    },
  };
}

export async function loadWaterboardsAclManifest(): Promise<Record<string, unknown>> {
  return buildWaterboardsAclManifest(readWaterboardsAclSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectWaterboardsAcl()
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
              institution: c.institution,
              orderNumber: c.orderNumber,
              date: c.date,
              title: c.title,
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
