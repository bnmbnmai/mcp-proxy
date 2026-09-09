/**
 * Ofwat Water Industry Act 1991 enforcement-notice TEXT door.
 * Official Ofwat-authored PDFs on ofwat.gov.uk/wp-content/uploads/ only.
 * OGL v3.0. Does not invent notice text. Does not sell the HTML publication /
 * consultation card (index + teaser only). Skip Ofwat open-data / performance
 * CSVs. Skip people files. Not CMA / ICO / Ofsted / HSE.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const OFWAT_ENFORCEMENT_PATH = "/ofwat-enforcement";
export const OFWAT_ENFORCEMENT_MANIFEST_PATH = "/ofwat-enforcement/manifest.json";
export const OFWAT_ENFORCEMENT_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "ofwat-wia91-enforcement-bodies";
export const PRODUCT_NAME = "Ofwat Water Industry Act 1991 enforcement-notice text";

export const HUB_URL = "https://www.ofwat.gov.uk/regulated-companies/investigations/";
export const SEWAGE_INDEX_URL =
  "https://www.ofwat.gov.uk/investigation-into-sewage-treatment-works-and-networks/";
export const SEWAGE_UPDATES_URL =
  "https://www.ofwat.gov.uk/investigation-into-sewage-treatment-works-and-networks/previous-updates-on-the-investigation-into-sewage-treatment-works/";
export const INDEX_PAGES = [HUB_URL, SEWAGE_INDEX_URL, SEWAGE_UPDATES_URL] as const;
export const CASE_PAGES = [
  "https://www.ofwat.gov.uk/enforcement-case-in-yorkshire-waters-management-of-its-sewage-treatment-works-and-sewerage-networks/",
  "https://www.ofwat.gov.uk/enforcement-case-in-anglian-waters-management-of-its-sewage-treatment-works-and-sewerage-networks/",
  "https://www.ofwat.gov.uk/enforcement-case-in-thames-waters-management-of-its-sewage-treatment-works-and-sewerage-networks/",
] as const;
export const CASE_PATH_RE = /^\/enforcement-case-in-[a-z0-9-]{8,220}\/?$/i;
export const PDF_HOST = "www.ofwat.gov.uk";
export const PDF_ORIGIN = "https://www.ofwat.gov.uk";
export const LICENSE = "Crown copyright / Open Government Licence v3.0";
export const ATTRIBUTION =
  "Ofwat (Water Services Regulation Authority). Contains public sector information licensed under the Open Government Licence v3.0.";

export const CARD_FIELDS = [
  "id",
  "docket",
  "institution",
  "date",
  "kind",
  "title",
  "pageUrl",
  "sourceUrl",
  "body",
] as const;

export type OfwatEnforcementListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  kind: string;
  title: string;
  pageUrl: string;
  sourceUrl: string;
};

export type OfwatEnforcementCard = OfwatEnforcementListing & { body: string };

export type OfwatEnforcementSnapshot = {
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
  sources: { index: string; pdfHost: string };
  cards: OfwatEnforcementCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (Ofwat WIA91 enforcement texts; +https://www.ofwat.gov.uk/regulated-companies/investigations/)";
const OFFICIAL_HOSTS = new Set(["ofwat.gov.uk", "www.ofwat.gov.uk"]);
const UPLOAD_RE = /^\/wp-content\/uploads\/(\d{4})\/(\d{2})\/([^/?#]+\.pdf)$/i;
const MIN_BODY_CHARS = 2500;
const PEOPLE_ONLY =
  /\b(curriculum vitae|cv(?: of)?|date of birth|home address|passport number|private email|our people|board member biography)\b/i;
const OPEN_DATA =
  /\b(performance commitments?|discover water|open data|company monitoring framework)\b/i;
const CSV_OR_JSON_WRAP = /^\s*[\[{]|^\s*"[^"]+",|^\s*\w+,(\w+,)+\w+/;
const HTML_TEASER =
  /\b(read the (?:full )?(?:notice|decision|document)|download the pdf|this consultation has (?:now )?closed)\b/i;
const NOTICE_BLOB =
  /\b(notice of ofwat|section[- ]?19|s\.?19|undertakings?|enforcement order|financial penalty|final[- ]decision|proposal to (?:issue|accept|impose))\b/i;
const NOT_A_NOTICE =
  /\b(enforcement guidance|approach-to-enforcement|visual[- ]summary|pr24|price control|wrmp|open[- ]data|company monitoring|final determination of price|notification of the pr24|overview of .{0,80}pr24)\b/i;
const UNDERTAKER =
  /\b(south east water|thames water|southern water|anglian water|yorkshire water|wessex water|northumbrian water|south west water|d[wŵ]r cymru|welsh water|united utilities|severn trent|hafren dyfrdwy|affinity water|portsmouth water|bristol water|ses water|albion water|ofwat|undertaker)\b/i;

function seed(
  id: string,
  docket: string,
  institution: string,
  date: string,
  kind: string,
  title: string,
  sourceUrl: string,
  pageUrl = HUB_URL,
): OfwatEnforcementListing {
  return { id, docket, institution, date, kind, title, pageUrl, sourceUrl };
}

export const SEED_LISTINGS: OfwatEnforcementListing[] = [
  seed(
    "Notice-of-Ofwats-proposal-to-issue-an-enforcement-order-and-impose-a-penalty",
    "sew-enforcement-proposal-2026-03",
    "South East Water Limited",
    "2026-03-01",
    "enforcement-notice",
    "Notice of Ofwat's proposal to issue an enforcement order and impose a penalty",
    "https://www.ofwat.gov.uk/wp-content/uploads/2026/03/Notice-of-Ofwats-proposal-to-issue-an-enforcement-order-and-impose-a-penalty.pdf",
  ),
  seed(
    "Notice-of-Ofwats-decision-to-accept-section-19-undertakings-from-South-East-Water",
    "sew-s19-undertakings-2026-03",
    "South East Water Limited",
    "2026-03-01",
    "s19-undertakings",
    "Notice of Ofwat's decision to accept section 19 undertakings from South East Water",
    "https://www.ofwat.gov.uk/wp-content/uploads/2026/03/Notice-of-Ofwats-decision-to-accept-section-19-undertakings-from-South-East-Water.pdf",
  ),
  seed(
    "Notice-of-Ofwats-proposal-to-accept-Section-19-undertakings-from-Dwr-Cymru-Cyfyngedig",
    "dwr-cymru-s19-proposal-2026-03",
    "Dwr Cymru Cyfyngedig",
    "2026-03-01",
    "s19-undertakings",
    "Notice of Ofwat's proposal to accept Section 19 undertakings from Dwr Cymru Cyfyngedig",
    "https://www.ofwat.gov.uk/wp-content/uploads/2026/03/Notice-of-Ofwats-proposal-to-accept-Section-19-undertakings-from-Dwr-Cymru-Cyfyngedig.pdf",
  ),
  seed(
    "Notice-of-Ofwats-decision-to-accept-section-19-undertakings-from-Southern-Water-Services-Limited",
    "southern-s19-undertakings-2026-02",
    "Southern Water Services Limited",
    "2026-02-01",
    "s19-undertakings",
    "Notice of Ofwat's decision to accept section 19 undertakings from Southern Water Services Limited",
    "https://www.ofwat.gov.uk/wp-content/uploads/2026/02/Notice-of-Ofwats-decision-to-accept-section-19-undertakings-from-Southern-Water-Services-Limited.pdf",
  ),
  seed(
    "Notice-of-Ofwats-decision-to-accept-section-19-undertakings-from-Wessex-Water-Services-Limited",
    "wessex-s19-undertakings-2025-11",
    "Wessex Water Services Limited",
    "2025-11-01",
    "s19-undertakings",
    "Notice of Ofwat's decision to accept section 19 undertakings from Wessex Water Services Limited",
    "https://www.ofwat.gov.uk/wp-content/uploads/2025/11/Notice-of-Ofwats-decision-to-accept-section-19-undertakings-from-Wessex-Water-Services-Limited.pdf",
  ),
  seed(
    "Ofwats-decision-to-accept-section-19-undertakings-from-Anglian-Water-Services-Limited",
    "anglian-s19-undertakings-2025-07",
    "Anglian Water Services Limited",
    "2025-07-01",
    "s19-undertakings",
    "Notice of Ofwat's decision to accept section 19 undertakings from Anglian Water Services Limited",
    "https://www.ofwat.gov.uk/wp-content/uploads/2025/07/Ofwats-decision-to-accept-section-19-undertakings-from-Anglian-Water-Services-Limited.pdf",
  ),
  seed(
    "Notice-of-Ofwats-proposal-to-accept-Anglians-section-19-undertaking-1",
    "anglian-s19-proposal-2025-07",
    "Anglian Water Services Limited",
    "2025-07-01",
    "s19-undertakings",
    "Notice of Ofwat's proposal to accept section 19 undertakings from Anglian Water Services Limited",
    "https://www.ofwat.gov.uk/wp-content/uploads/2025/07/Notice-of-Ofwats-proposal-to-accept-Anglians-section-19-undertaking-1.pdf",
  ),
  seed(
    "Ofwats-decision-to-accept-section-19-undertakings-from-South-West-Water-Services-Limited",
    "sww-s19-undertakings-2025-07",
    "South West Water Limited",
    "2025-07-01",
    "s19-undertakings",
    "Notice of Ofwat's decision to accept section 19 undertakings from South West Water Services Limited",
    "https://www.ofwat.gov.uk/wp-content/uploads/2025/07/Ofwats-decision-to-accept-section-19-undertakings-from-South-West-Water-Services-Limited.pdf",
  ),
  seed(
    "2025-05-28-Thames-Water-Final-Decision-Document-REDACTED",
    "thames-final-decision-2025-05-28",
    "Thames Water",
    "2025-05-28",
    "final-decision",
    "Notice of Ofwat's decision to issue an enforcement order and impose a financial penalty on Thames Water",
    "https://www.ofwat.gov.uk/wp-content/uploads/2024/08/2025-05-28-Thames-Water-Final-Decision-Document-REDACTED.pdf",
  ),
  seed(
    "2025-05-28-Thames-Waters-Dividend-Payments-and-ConditIon-P30-Final-Decision",
    "thames-p30-final-decision-2025-05-28",
    "Thames Water",
    "2025-05-28",
    "final-decision",
    "Notice of Ofwat's decision to impose a financial penalty on Thames Water as a result of its contravention of Condition P30",
    "https://www.ofwat.gov.uk/wp-content/uploads/2024/12/2025-05-28-Thames-Waters-Dividend-Payments-and-ConditIon-P30-Final-Decision.pdf",
  ),
  seed(
    "Notice-of-Ofwats-decision-to-accept-section-19-undertakings-from-Yorkshire-Water",
    "yorkshire-s19-undertakings-2024-08",
    "Yorkshire Water Services Limited",
    "2024-08-01",
    "s19-undertakings",
    "Notice of Ofwat's decision to accept section 19 undertakings from Yorkshire Water",
    "https://www.ofwat.gov.uk/wp-content/uploads/2024/08/Notice-of-Ofwats-decision-to-accept-section-19-undertakings-from-Yorkshire-Water.pdf",
  ),
  seed(
    "Notice-of-Ofwats-proposal-to-issue-an-enforcement-order-and-impose-a-financial-penalty-on-Thames-Water",
    "thames-enforcement-proposal-2024-08",
    "Thames Water",
    "2024-08-01",
    "enforcement-notice",
    "Notice of Ofwat's proposal to issue an enforcement order and impose a financial penalty on Thames Water",
    "https://www.ofwat.gov.uk/wp-content/uploads/2024/08/Notice-of-Ofwats-proposal-to-issue-an-enforcement-order-and-impose-a-financial-penalty-on-Thames-Water.pdf",
  ),
  seed(
    "Notice-of-Ofwats-proposal-to-issue-an-enforcement-order-and-impose-a-financial-penalty-on-Northumbrian-Water",
    "northumbrian-enforcement-proposal-2024-08",
    "Northumbrian Water Limited",
    "2024-08-01",
    "enforcement-notice",
    "Notice of Ofwat's proposal to issue an enforcement order and impose a financial penalty on Northumbrian Water",
    "https://www.ofwat.gov.uk/wp-content/uploads/2024/08/Notice-of-Ofwats-proposal-to-issue-an-enforcement-order-and-impose-a-financial-penalty-on-Northumbrian-Water.pdf",
  ),
  seed(
    "Ofwats-decision-to-accept-undertakings-from-Thames-Water-Utilities-Limited",
    "thames-s19-p26-2024-08",
    "Thames Water",
    "2024-08-01",
    "s19-undertakings",
    "Ofwat's decision to accept undertakings from Thames Water Utilities Limited for the purposes of section 19",
    "https://www.ofwat.gov.uk/wp-content/uploads/2024/08/Ofwats-decision-to-accept-undertakings-from-Thames-Water-Utilities-Limited.pdf",
  ),
  seed(
    "Ofwats-final-decision-to-impose-a-financial-penalty-on-Dwr-Cymru-Cyfyngedig",
    "dwr-cymru-penalty-2024-05",
    "Dwr Cymru Cyfyngedig",
    "2024-05-01",
    "final-decision",
    "Ofwat's final decision to impose a financial penalty on Dwr Cymru Cyfyngedig",
    "https://www.ofwat.gov.uk/wp-content/uploads/2024/05/Ofwats-final-decision-to-impose-a-financial-penalty-on-Dwr-Cymru-Cyfyngedig.pdf",
  ),
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ofwatEnforcementDir(): string {
  if (env("OFWAT_ENFORCEMENT_DIR")) return resolve(env("OFWAT_ENFORCEMENT_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ofwat-enforcement"));
}

export function snapshotPath(): string {
  return join(ofwatEnforcementDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/ofwat-enforcement/seed-snapshot.json"),
    join(here, "fixtures/ofwat-enforcement/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
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

export function officialOfwatPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const u = new URL(urlOrPath, PDF_ORIGIN);
    if (!OFFICIAL_HOSTS.has(u.hostname.toLowerCase())) return null;
    const path = u.pathname.replace(/\/+/g, "/");
    if (!UPLOAD_RE.test(path)) return null;
    return `${PDF_ORIGIN}${path}`;
  } catch {
    return null;
  }
}

export function isOfficialOfwatPdf(url: string | null | undefined): boolean {
  return Boolean(officialOfwatPdfUrl(url));
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialOfwatPdfUrl(url);
  if (!official) return null;
  const name = official.split("/").pop() || "";
  return name.replace(/\.pdf$/i, "") || null;
}

export function isPeopleRow(row: Pick<OfwatEnforcementListing, "institution" | "title" | "id">): boolean {
  const blob = `${row.institution || ""} ${row.title || ""} ${row.id || ""}`;
  if (UNDERTAKER.test(blob)) return false;
  return PEOPLE_ONLY.test(blob) || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test((row.institution || "").trim());
}

export function isCandidateNotice(blob: string): boolean {
  const t = String(blob || "");
  if (NOT_A_NOTICE.test(t) && !NOTICE_BLOB.test(t)) return false;
  if (/\b(final determination of price|notification of the pr24|overview of .{0,80}pr24)\b/i.test(t)) {
    return false;
  }
  return NOTICE_BLOB.test(t);
}

export function isOpenDataOrCsvUrl(url: string | null | undefined): boolean {
  const t = String(url || "").toLowerCase();
  return /\.(csv|json|xml|txt)(?:[?#]|$)/.test(t) || /\/(?:open-data|performance-data|discover-water)\b/.test(t);
}

export function parseHubHtml(html: string, pageUrl = HUB_URL): OfwatEnforcementListing[] {
  const out: OfwatEnforcementListing[] = [];
  const seen = new Set<string>();
  const hrefRe = /href=["']([^"']+\.pdf)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html))) {
    const abs = officialOfwatPdfUrl(new URL(m[1], pageUrl).toString());
    if (!abs) continue;
    const id = pdfIdFromUrl(abs);
    if (!id || seen.has(id) || isOpenDataOrCsvUrl(abs)) continue;
    const after = html.slice(m.index, Math.min(html.length, m.index + 280));
    const linkText = decodeEntities((after.match(/>([\s\S]*?)<\/a>/i)?.[1] || "").replace(/<[^>]+>/g, " "));
    const title = (linkText || id).slice(0, 180);
    if (!isCandidateNotice(`${title} ${id} ${abs}`)) continue;
    seen.add(id);
    const around = html.slice(Math.max(0, m.index - 400), Math.min(html.length, m.index + 400));
    out.push({
      id,
      docket: id,
      institution: institutionFromBlob(title) || id,
      date: isoDate(around) ?? isoDate(abs),
      kind: kindFromBlob(`${title} ${id}`),
      title,
      pageUrl,
      sourceUrl: abs,
    });
  }
  return parseListingRows(out);
}

export function parseListingRows(rows: OfwatEnforcementListing[]): OfwatEnforcementListing[] {
  const out: OfwatEnforcementListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const sourceUrl = officialOfwatPdfUrl(row.sourceUrl);
    const id = row.id || pdfIdFromUrl(sourceUrl) || "";
    if (
      !sourceUrl ||
      !id ||
      seen.has(id) ||
      isPeopleRow({ ...row, id }) ||
      isOpenDataOrCsvUrl(sourceUrl) ||
      !isCandidateNotice(`${row.title || ""} ${id} ${sourceUrl}`)
    ) {
      continue;
    }
    seen.add(id);
    out.push({
      id,
      docket: row.docket || id,
      institution: row.institution || institutionFromBlob(row.title) || id,
      date: isoDate(row.date) ?? isoDate(sourceUrl),
      kind: row.kind || kindFromBlob(`${row.title} ${id}`),
      title: row.title || id,
      pageUrl: row.pageUrl || HUB_URL,
      sourceUrl,
    });
  }
  return out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
}

function institutionFromBlob(raw: string): string {
  const t = String(raw || "");
  if (/south east water/i.test(t)) return "South East Water Limited";
  if (/south west water/i.test(t)) return "South West Water Limited";
  if (/thames water/i.test(t)) return "Thames Water";
  if (/southern water/i.test(t)) return "Southern Water Services Limited";
  if (/anglian water/i.test(t)) return "Anglian Water Services Limited";
  if (/yorkshire water/i.test(t)) return "Yorkshire Water Services Limited";
  if (/wessex water/i.test(t)) return "Wessex Water Services Limited";
  if (/northumbrian water/i.test(t)) return "Northumbrian Water Limited";
  if (/d[wŵ]r cymru|welsh water/i.test(t)) return "Dwr Cymru Cyfyngedig";
  if (/united utilities/i.test(t)) return "United Utilities Water Limited";
  if (/severn trent/i.test(t)) return "Severn Trent Water Limited";
  if (/hafren dyfrdwy/i.test(t)) return "Hafren Dyfrdwy Cyfyngedig";
  return "";
}

export function parseCasePageUrls(html: string, pageUrl = HUB_URL): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const hrefRe = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html))) {
    try {
      const u = new URL(m[1].replace(/&amp;/g, "&"), pageUrl);
      if (!OFFICIAL_HOSTS.has(u.hostname.toLowerCase())) continue;
      const path = (u.pathname.replace(/\/+$/, "") || "/") + "/";
      if (!CASE_PATH_RE.test(path) && !CASE_PATH_RE.test(u.pathname)) continue;
      const abs = `${PDF_ORIGIN}${u.pathname.replace(/\/+$/, "")}/`;
      if (seen.has(abs)) continue;
      seen.add(abs);
      out.push(abs);
    } catch {
      /* skip */
    }
  }
  return out;
}

function kindFromBlob(raw: string): string {
  const t = String(raw || "").toLowerCase();
  if (t.includes("undertaking") || t.includes("section-19") || t.includes("section 19")) return "s19-undertakings";
  if (t.includes("final-decision") || t.includes("final decision")) return "final-decision";
  return "enforcement-notice";
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ym = String(raw).match(/\/wp-content\/uploads\/(\d{4})\/(\d{2})\//);
  if (ym) return `${ym[1]}-${ym[2]}-01`;
  return null;
}

export function isIndexTeaserDump(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length < MIN_BODY_CHARS && HTML_TEASER.test(t)) return true;
  if (/investigations - ofwat/i.test(t) && !/\bwater industry act\b/i.test(t)) return true;
  return false;
}

export function isRealOfwatEnforcementBody(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length < MIN_BODY_CHARS) return false;
  if (PEOPLE_ONLY.test(t) && !/\bofwat\b|\bwater industry act\b/i.test(t)) return false;
  if (OPEN_DATA.test(t) && !/\benforcement order\b|\bsection 19\b/i.test(t) && t.length < 8000) return false;
  if (CSV_OR_JSON_WRAP.test(t) && !/\bwater industry act\b/i.test(t)) return false;
  if (isIndexTeaserDump(t)) return false;
  const hasOfwat = /\bofwat\b|\bwater services regulation authority\b/i.test(t);
  const hasWia = /\bwater industry act\b|\bWIA91\b|\bsection 19\b/i.test(t);
  const hasEnforcement =
    /\benforcement order\b|\bfinancial penalty\b|\bfinal decision\b|\bundertakings?\b|\bnotice of ofwat/i.test(t);
  return hasOfwat && hasWia && hasEnforcement;
}

export function parseOfwatEnforcementText(
  text: string,
  meta: Partial<OfwatEnforcementListing> & { sourceUrl: string },
): OfwatEnforcementCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialOfwatPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const id = meta.id || pdfIdFromUrl(sourceUrl) || sourceUrl;
  return {
    id,
    docket: meta.docket || id,
    institution: meta.institution || institutionFromBlob(`${meta.title || ""} ${body.slice(0, 800)}`) || id,
    date: isoDate(meta.date) ?? isoDate(sourceUrl),
    kind: meta.kind || kindFromBlob(`${meta.title || ""} ${id}`),
    title: meta.title || id,
    pageUrl: meta.pageUrl || HUB_URL,
    sourceUrl,
    body,
  };
}

export function emptyOfwatEnforcementSnapshot(reason: string): OfwatEnforcementSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: HUB_URL, pdfHost: `${PDF_ORIGIN}/wp-content/uploads/` },
    cards: [],
  };
}

export function assembleOfwatEnforcementSnapshot(
  cards: OfwatEnforcementCard[],
  fetchedAt = new Date().toISOString(),
): OfwatEnforcementSnapshot {
  const withBody = cards
    .filter((c) => isRealOfwatEnforcementBody(c.body) && officialOfwatPdfUrl(c.sourceUrl))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason:
      withBody.length > 0
        ? null
        : "Official Ofwat enforcement PDFs had no extractable Water Industry Act notice text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: HUB_URL, pdfHost: `${PDF_ORIGIN}/wp-content/uploads/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): OfwatEnforcementSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as OfwatEnforcementSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readOfwatEnforcementSnapshot(): OfwatEnforcementSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("OFWAT_ENFORCEMENT_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeOfwatEnforcementSnapshot(snap: OfwatEnforcementSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

async function fetchPdfCandidate(url: string): Promise<Uint8Array | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,*/*" },
  });
  if (!res.ok) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-" ? bytes : null;
}

async function waybackPdfUrls(official: string): Promise<string[]> {
  const guessed = [
    `https://web.archive.org/web/id_/${official}`,
    `https://web.archive.org/web/2026/${official}`,
    `https://web.archive.org/web/2025/${official}`,
    `https://web.archive.org/web/2024/${official}`,
  ];
  try {
    const cdx = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(official)}&output=json&fl=timestamp,statuscode,mimetype&filter=statuscode:200&limit=5`;
    const res = await fetch(cdx, { headers: { "User-Agent": HTTP_UA, Accept: "application/json" } });
    if (!res.ok) return guessed;
    const rows = (await res.json()) as string[][];
    const captures = rows
      .slice(1)
      .filter((row) => row[1] === "200" && /pdf/i.test(row[2] || ""))
      .map((row) => `https://web.archive.org/web/${row[0]}id_/${official}`);
    return [...captures, ...guessed];
  } catch {
    return guessed;
  }
}

export async function fetchOfwatBytes(url: string): Promise<Uint8Array> {
  const official = officialOfwatPdfUrl(url) || url;
  const live = await fetchPdfCandidate(official).catch(() => null);
  if (live) return live;
  for (const wb of await waybackPdfUrls(official)) {
    const archived = await fetchPdfCandidate(wb).catch(() => null);
    if (archived) return archived;
  }
  throw new Error(`${official} is not an official PDF (live Cloudflare-blocked; Wayback had no PDF capture)`);
}

export function pdfToText(pdfPath: string): string {
  const helper = env("OFWAT_ENFORCEMENT_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function listingDir(): string {
  return env("OFWAT_ENFORCEMENT_HTML_DIR") || env("OFWAT_ENFORCEMENT_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("OFWAT_ENFORCEMENT_LIMIT", "20"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}

function maxFetchLimit(): number {
  const n = Number(env("OFWAT_ENFORCEMENT_MAX_FETCH", "24"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 24;
}

function maxCasePages(): number {
  const n = Number(env("OFWAT_ENFORCEMENT_MAX_CASES", "24"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 24;
}

function pause(ms: number): Promise<void> {
  return new Promise((resolvePause) => setTimeout(resolvePause, ms));
}

function isCloudflareBlock(html: string): boolean {
  return /you can.?t access this page right now/i.test(html) || /unusual traffic or a technical issue/i.test(html);
}

export async function fetchOfwatHtml(url: string): Promise<string> {
  const headers = { "User-Agent": HTTP_UA, Accept: "text/html,*/*" };
  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const html = await res.text();
      if (html && !isCloudflareBlock(html)) return html;
    }
  } catch {
    /* fall through to Wayback */
  }
  const waybacks = [`https://web.archive.org/web/id_/${url}`, `https://web.archive.org/web/2026/${url}`];
  for (const wb of waybacks) {
    try {
      const archived = await fetch(wb, { headers });
      if (!archived.ok) continue;
      const html = await archived.text();
      if (html && !isCloudflareBlock(html)) return html;
    } catch {
      /* try next capture */
    }
  }
  throw new Error(`${url} HTML blocked on live Ofwat and Wayback`);
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

function fixtureHtmlFiles(dir: string): string[] {
  const named = ["listing-excerpt.html", "listing.html", "hub.html", "case-card-excerpt.html"];
  let extras: string[] = [];
  try {
    extras = readdirSync(dir).filter((name) => /^case-.+\.html$/i.test(name) && !named.includes(name));
  } catch {
    extras = [];
  }
  return [...named, ...extras];
}

async function walkOfficialPages(
  pauseMs: number,
): Promise<{ listed: OfwatEnforcementListing[]; pages: string[] }> {
  const listed: OfwatEnforcementListing[] = [];
  const pages: string[] = [...INDEX_PAGES, ...CASE_PAGES];
  const seen = new Set<string>(pages);
  const cap = maxCasePages() + INDEX_PAGES.length;
  for (let i = 0; i < pages.length && i < cap; i += 1) {
    const url = pages[i];
    try {
      if (pauseMs && i > 0) await pause(pauseMs);
      const html = await fetchOfwatHtml(url);
      listed.push(...parseHubHtml(html, url));
      for (const caseUrl of parseCasePageUrls(html, url)) {
        if (seen.has(caseUrl) || pages.length >= cap) continue;
        seen.add(caseUrl);
        pages.push(caseUrl);
      }
    } catch {
      /* one official page missed; seeds + other pages still grow the bag */
    }
  }
  return { listed, pages };
}

async function loadOfficialListings(
  dir: string,
  pauseMs = 0,
): Promise<{ listed: OfwatEnforcementListing[]; listedCount: number }> {
  if (dir) {
    const fromHtml: OfwatEnforcementListing[] = [];
    for (const name of fixtureHtmlFiles(dir)) {
      const html = readNamedFile(dir, [name]);
      if (!html) continue;
      const pageUrl = /case-/.test(name) ? CASE_PAGES[1] : HUB_URL;
      fromHtml.push(...parseHubHtml(html, pageUrl));
    }
    const extra = SEED_LISTINGS.filter((row) => existsSync(join(dir, `${row.id}.txt`)));
    const listed = parseListingRows([...fromHtml, ...extra]);
    return { listed, listedCount: listed.length };
  }
  const walked = await walkOfficialPages(pauseMs);
  const listed = parseListingRows([...SEED_LISTINGS, ...walked.listed]);
  return { listed, listedCount: listed.length };
}

export async function collectOfwatEnforcement(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<OfwatEnforcementSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir, opts?.pauseMs ?? 0);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ofwatEnforcementDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, OfwatEnforcementCard>();
  for (const card of readOfwatEnforcementSnapshot()?.cards ?? []) {
    if (isRealOfwatEnforcementBody(card.body)) prior.set(card.id, card);
  }
  const cards: OfwatEnforcementCard[] = [];
  const seen = new Set<string>();
  let fetchedPdfs = 0;
  let skippedNoText = 0;
  let reused = 0;
  let addedThisRun = 0;
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
    try {
      const localText = readNamedFile(dir, [`${row.id}.txt`, `${row.docket}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const sourceUrl = officialOfwatPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchOfwatBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseOfwatEnforcementText(text, { ...row, sourceUrl });
      if (!isRealOfwatEnforcementBody(parsed.body)) {
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
    ...assembleOfwatEnforcementSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeOfwatEnforcementSnapshot(snap);
  return snap;
}

export async function loadOfwatEnforcement(): Promise<OfwatEnforcementSnapshot> {
  const cached = readOfwatEnforcementSnapshot();
  if (cached) {
    const filtered = assembleOfwatEnforcementSnapshot(cached.cards, cached.fetchedAt);
    if (filtered.cards.length) return { ...cached, ...filtered };
  }
  try {
    return await collectOfwatEnforcement();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealOfwatEnforcementBody(c.body)) ? "stale" : "empty",
        reason: `Live Ofwat enforcement fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyOfwatEnforcementSnapshot(
      `Ofwat enforcement PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildOfwatEnforcementManifest(
  snap: OfwatEnforcementSnapshot | null,
): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealOfwatEnforcementBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      OFWAT_ENFORCEMENT_PATH,
      "Count + institution + docket + date + official Ofwat PDF URL only. Notice body is the paid GET /ofwat-enforcement payload. This free manifest lists the full catalog. HTML publication cards and open-data CSVs are not sold.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: OFWAT_ENFORCEMENT_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      docket: c.docket,
      institution: c.institution,
      date: c.date,
      kind: c.kind,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "docket", "institution", "date", "kind", "sourceUrl"] },
    sources: snap?.sources ?? { index: HUB_URL, pdfHost: `${PDF_ORIGIN}/wp-content/uploads/` },
  };
}

export async function loadOfwatEnforcementManifest(): Promise<Record<string, unknown>> {
  return buildOfwatEnforcementManifest(readOfwatEnforcementSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectOfwatEnforcement()
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
              date: c.date,
              kind: c.kind,
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
