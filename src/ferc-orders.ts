/**
 * FERC institution stipulation-and-consent / show-cause / civil-penalty TEXT door.
 * Official per-order PDFs from cms.ferc.gov only. Does not invent order text.
 * Civil-penalty index is institution / docket / date / PDF URL only (listing teaser).
 * Not eLibrary metadata. Not Federal Register raw_text. Not people files.
 * Not FinCEN /fincen-orders. Not NCUA /ncua-orders. Not FRB /frb-orders.
 * Not FDIC /fdic-orders. Not OCC /occ-cd. Not CFPB /cfpb-orders. Not FTC /ftc-wl.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paidBodyCatalogNote } from "./paid-records.js";

export const FERC_ORDERS_PATH = "/ferc-orders";
export const FERC_ORDERS_MANIFEST_PATH = "/ferc-orders/manifest.json";
export const FERC_ORDERS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "ferc-institution-order-bodies";
export const PRODUCT_NAME = "FERC institution stipulation-and-consent text";

export const LISTING_URL = "https://www.ferc.gov/civil-penalties/all-civil-penalty-actions-2026";
/** Official year tables. The live 2026 page is first-slice 5; www.ferc.gov HTML is often 403. */
export const YEAR_LISTING_URLS = [
  "https://www.ferc.gov/civil-penalties/all-civil-penalty-actions-2025",
  "https://www.ferc.gov/all-civil-penalty-actions-2024",
  "https://www.ferc.gov/all-civil-penalty-actions-2023",
  "https://www.ferc.gov/all-civil-penalty-actions-2022",
  "https://www.ferc.gov/all-civil-penalty-actions-2021",
] as const;
export const WAYBACK_CAPTURE: Record<string, string> = {
  "https://www.ferc.gov/civil-penalties/all-civil-penalty-actions-2025": "20251014062747",
  "https://www.ferc.gov/all-civil-penalty-actions-2023": "20240625073035",
  "https://www.ferc.gov/all-civil-penalty-actions-2022": "20231207201742",
  "https://www.ferc.gov/all-civil-penalty-actions-2021": "20230922060545",
};
export const PDF_HOST = "cms.ferc.gov";
export const PDF_ORIGIN = "https://cms.ferc.gov";
export const DOCKET_RE = /\b(IN\d{2}-\d{1,4}-000)\b/i;
export const PDF_PATH_RE = /^\/sites\/default\/files\/20\d{2}-\d{2}\/.+\.pdf$/i;
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "FERC";

export const CARD_FIELDS = [
  "id",
  "docket",
  "pdfId",
  "institution",
  "date",
  "title",
  "sourceUrl",
  "body",
] as const;

export type FercListingRow = {
  institution?: string;
  individual?: string;
  docket?: string;
  date?: string;
  title?: string;
  type?: string;
  sourceUrl?: string;
  pdfId?: string;
};

export type FercOrderListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  pdfId: string;
};

export type FercOrderCard = {
  id: string;
  docket: string;
  pdfId: string;
  institution: string;
  date: string | null;
  title: string;
  sourceUrl: string;
  body: string;
};

export type FercOrdersSnapshot = {
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
  sources: {
    listing: string;
    pdfHost: string;
  };
  cards: FercOrderCard[];
};

const HTTP_UA = "bnm-data-shop/1.0 (FERC public institution orders; +https://www.ferc.gov/)";

const ENTITY_RE =
  /\b(Inc\.?|LLC|L\.L\.C\.|L\.P\.?|LP|Corp\.?|Corporation|Company|Co\.|Ltd\.?|Limited|Holdings|Department|Authority|Services|Power|Energy|Utility|Utilities|Municipal|District)\b/i;
const PERSON_NAME_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,2}$/;
const ORDER_KIND_RE =
  /stipulation and consent|order approving|order to show cause|show cause|civil penalt|settlement agreement/i;

/** Official FERC institution stipulation-and-consent PDFs on cms.ferc.gov. */
export const SEED_LISTINGS: FercOrderListing[] = [
  {
    id: "IN25-6-000",
    docket: "IN25-6-000",
    institution: "Interstate Power and Light Company",
    date: "2026-04-17",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
    pdfId: "20260417-195FERC61048-IN25-6-000-Interstate Power and Light Co-Settlement Agreement",
  },
  {
    id: "IN25-4-000",
    docket: "IN25-4-000",
    institution: "Digi Power X Inc. f/k/a Digihost Technology Inc.",
    date: "2026-08-03",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2026-08/20260803-196FERC61100-IN25-4-000-Digihost-Settlement%20Agreement.pdf",
    pdfId: "20260803-196FERC61100-IN25-4-000-Digihost-Settlement Agreement",
  },
  {
    id: "IN25-10-000",
    docket: "IN25-10-000",
    institution: "MPH Rockaway Peakers, LLC and Bayswater Peaking Facility, LLC",
    date: "2026-04-08",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2026-04/20260408-195FERC61019-IN25-10-000-MPH%20Rockaway%20Peakers%2C%20LLC%20and%20Bayswater-Settlement%20Agreement.pdf",
    pdfId: "20260408-195FERC61019-IN25-10-000-MPH Rockaway Peakers, LLC and Bayswater-Settlement Agreement",
  },
  {
    id: "IN26-2-000",
    docket: "IN26-2-000",
    institution: "Terra-Gen, LLC",
    date: "2026-04-07",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2026-04/20260407-195FERC61016-IN26-2-000-Terra-Gen%2C%20LLC-Settlement%20Agreement.pdf",
    pdfId: "20260407-195FERC61016-IN26-2-000-Terra-Gen, LLC-Settlement Agreement",
  },
  {
    id: "IN25-13-000",
    docket: "IN25-13-000",
    institution: "Tenaska Power Services Co.",
    date: "2026-01-12",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2026-01/20260112-194FERC61029-IN25-13-000-Tenaska%20Power%20Services%20Co-Settlement%20Agreement.pdf",
    pdfId: "20260112-194FERC61029-IN25-13-000-Tenaska Power Services Co-Settlement Agreement",
  },
];

/** Extra official institution stipulation-and-consent PDFs. www.ferc.gov year tables 403; do not wrap media teasers. */
export const OFFICIAL_WALK_LISTINGS: FercOrderListing[] = [
  {
    id: "IN25-9-000",
    docket: "IN25-9-000",
    institution: "Skye MS, LLC",
    date: "2025-08-08",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2025-08/20250808-192FERC61136-IN25-9-000-Skye%20MS%2C%20LLC-Settlement%20Agreement.pdf",
    pdfId: "20250808-192FERC61136-IN25-9-000-Skye MS, LLC-Settlement Agreement",
  },
  {
    id: "IN25-11-000",
    docket: "IN25-11-000",
    institution: "Los Angeles Department of Water and Power",
    date: "2025-10-02",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2025-10/20251002-193FERC61010-IN25-11-000-Los%20Angeles%20Department%20of%20Water%20and%20Power-Settlement%20Agreement.pdf",
    pdfId: "20251002-193FERC61010-IN25-11-000-Los Angeles Department of Water and Power-Settlement Agreement",
  },
  {
    id: "IN25-5-000",
    docket: "IN25-5-000",
    institution: "Enel North America, Inc.",
    date: "2025-07-10",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2025-07/20250710-192FERC61048-IN25-5-000-Enel%20North%20America%20Inc%20Et%20Al-Settlement%20Agreement.pdf",
    pdfId: "20250710-192FERC61048-IN25-5-000-Enel North America Inc Et Al-Settlement Agreement",
  },
  {
    id: "IN25-8-000",
    docket: "IN25-8-000",
    institution: "Cordova Energy Company LLC",
    date: "2025-09-03",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2025-09/20250903-192FERC61205-IN25-8-000-Cordova%20Energy%20Company%20LLC-Settlement%20Agreement.pdf",
    pdfId: "20250903-192FERC61205-IN25-8-000-Cordova Energy Company LLC-Settlement Agreement",
  },
  {
    id: "IN24-9-000",
    docket: "IN24-9-000",
    institution: "Big Rivers Electric Corporation",
    date: "2024-09-05",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2024-09/20240905-188FERC61155-IN24-9-000-Big%20Rivers-Settlement%20Agreement.pdf",
    pdfId: "20240905-188FERC61155-IN24-9-000-Big Rivers-Settlement Agreement",
  },
  {
    id: "IN24-11-000",
    docket: "IN24-11-000",
    institution: "Vista Energy Storage, LLC",
    date: "2024-08-06",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2024-08/20240806-188FERC61112-IN24-11-000-Vista%20Energy%20Storage%20LLC-Settlement%20Agreement.pdf",
    pdfId: "20240806-188FERC61112-IN24-11-000-Vista Energy Storage LLC-Settlement Agreement",
  },
  {
    id: "IN24-10-000",
    docket: "IN24-10-000",
    institution: "Arlington Energy Center III, LLC",
    date: "2024-08-08",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2024-08/20240808-188FERC61117-IN24-10-000-Arlington%20Energy%20Et%20Al-Settlement%20Agreement.pdf",
    pdfId: "20240808-188FERC61117-IN24-10-000-Arlington Energy Et Al-Settlement Agreement",
  },
  {
    id: "IN24-6-000",
    docket: "IN24-6-000",
    institution: "ENGIE Energy Marketing NA, Inc.",
    date: "2024-05-20",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2024-05/20240520-187FERC61084-IN24-6-000-Engie%20Energy-Settlement%20Agreement.pdf",
    pdfId: "20240520-187FERC61084-IN24-6-000-Engie Energy-Settlement Agreement",
  },
  {
    id: "IN24-3-000",
    docket: "IN24-3-000",
    institution: "Linde, Inc.",
    date: "2024-01-04",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2024-01/20240104-186FERC61009-IN24-3-000-Linde%20Inc%20Et%20Al-Settlement%20Agreement.pdf",
    pdfId: "20240104-186FERC61009-IN24-3-000-Linde Inc Et Al-Settlement Agreement",
  },
  {
    id: "IN24-13-000",
    docket: "IN24-13-000",
    institution: "Sonoran West Solar Holdings, LLC",
    date: "2024-12-05",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2024-12/20241205-189FERC61174-IN24-13-000-Sonoran%20West%20Solar%20Et%20Al-Settlement%20Agreement.pdf",
    pdfId: "20241205-189FERC61174-IN24-13-000-Sonoran West Solar Et Al-Settlement Agreement",
  },
];

/**
 * Leftover official institution stipulation-and-consent PDFs on cms.ferc.gov.
 * 2023/2022/2021 year tables 403 on www.ferc.gov; media landings are HTML.
 * People (Chen, Meinershagen, GreenHat estate) stay out. Alliance NYGT
 * IN21-4-000 is official but lacks Before Commissioners — not this gate.
 */
export const LEFTOVER_WALK_LISTINGS: FercOrderListing[] = [
  {
    id: "IN23-3-000",
    docket: "IN23-3-000",
    institution: "NRG Energy, Inc.",
    date: "2023-07-20",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2023-07/20230720-184FERC61026-IN23-3-000-Nrg-Settlement%20Agreement.pdf",
    pdfId: "20230720-184FERC61026-IN23-3-000-Nrg-Settlement Agreement",
  },
  {
    id: "IN13-15-000",
    docket: "IN13-15-000",
    institution: "BP America Inc.",
    date: "2023-07-07",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2023-07/20230707-184FERC61016-IN13-15-000-Bp%20America%20Et%20Al-Settlement%20Agreement.pdf",
    pdfId: "20230707-184FERC61016-IN13-15-000-Bp America Et Al-Settlement Agreement",
  },
  {
    id: "IN17-7-000",
    docket: "IN17-7-000",
    institution: "Freeport LNG Development, L.P.",
    date: "2021-01-28",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2021-02/20210128-174FERC61055-Freeport%20Agreement.pdf",
    pdfId: "20210128-174FERC61055-Freeport Agreement",
  },
  {
    id: "IN20-4-000",
    docket: "IN20-4-000",
    institution: "NRG Power Marketing, LLC",
    date: "2021-01-08",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2021-01/20210108-174FERC61016-NRG%20Agreement.pdf",
    pdfId: "20210108-174FERC61016-NRG Agreement",
  },
  {
    id: "IN21-2-000",
    docket: "IN21-2-000",
    institution: "Algonquin Power Windsor Locks LLC",
    date: "2021-01-05",
    title: "Order Approving Stipulation and Consent Agreement",
    sourceUrl:
      "https://cms.ferc.gov/sites/default/files/2021-01/20210105-174FERC61001-Algonquin%20Agreement.pdf",
    pdfId: "20210105-174FERC61001-Algonquin Agreement",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function fercOrdersDir(): string {
  if (env("FERC_ORDERS_DIR")) return resolve(env("FERC_ORDERS_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ferc-orders"));
}

export function snapshotPath(): string {
  return join(fercOrdersDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/ferc-orders/seed-snapshot.json"),
    join(here, "fixtures/ferc-orders/seed-snapshot.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&ldquo;/gi, "“")
    .replace(/&rdquo;/gi, "”")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " "));
}

export function normalizeDocket(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(DOCKET_RE);
  return m ? m[1].toUpperCase() : null;
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

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const official = officialFercPdfUrl(url) || url;
  const m = official.match(/\/([^/?#]+\.pdf)(?:$|[?#])/i);
  return m ? decodeURIComponent(m[1].replace(/\.pdf$/i, "")) : null;
}

export function unwrapFercUrl(url: string): string {
  const wb = url.match(/https?:\/\/web\.archive\.org\/web\/\d+\/(https?:\/\/(?:cms\.)?ferc\.gov\/[^\s"'<>]+)/i);
  return wb ? wb[1] : url;
}

export function waybackUrl(url: string): string {
  const id = WAYBACK_CAPTURE[url] ?? "2026";
  return `https://web.archive.org/web/${id}/${url}`;
}

function titleCaseSlug(raw: string): string {
  return raw
    .split("-")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === "llc") return "LLC";
      if (lower === "inc") return "Inc";
      if (lower === "co") return "Co";
      if (lower === "dba") return "dba";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function officialFercPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = unwrapFercUrl(urlOrPath.trim());
  try {
    const parsed = new URL(trimmed, PDF_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    if (host === "web.archive.org") return null;
    if (host === "elibrary.ferc.gov") return null;
    if (host === "www.federalregister.gov" || host === "federalregister.gov") return null;
    if (host !== "cms.ferc.gov" && host !== "www.ferc.gov" && host !== "ferc.gov") return null;
    if (/\/media\//i.test(parsed.pathname) && !/\.pdf$/i.test(parsed.pathname)) return null;
    if (!PDF_PATH_RE.test(parsed.pathname)) return null;
    return `${PDF_ORIGIN}${parsed.pathname}`;
  } catch {
    return null;
  }
}

/** Media landing slug → official cms.ferc.gov /sites/default/files PDF. */
export function mediaSlugToOfficialPdfUrl(slugOrUrl: string): string | null {
  const raw = unwrapFercUrl(slugOrUrl);
  const slug = raw.replace(/^https?:\/\/(?:cms\.)?ferc\.gov\/media\//i, "").replace(/\/+$/, "");
  const m = slug.match(/^(\d{8})-(\d+ferc\d+)-(in\d{2}-\d+-\d+)-(.+)$/i);
  if (!m) return null;
  const ymd = m[1];
  const folder = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}`;
  const cite = m[2].replace(/ferc/gi, "FERC");
  const docket = m[3].toUpperCase();
  let rest = m[4];
  if (/settlement-agreementpdf$/i.test(rest)) rest = rest.replace(/-?settlement-agreementpdf$/i, "");
  else if (/settlement-agreement$/i.test(rest)) rest = rest.replace(/-?settlement-agreement$/i, "");
  else if (/settlement$/i.test(rest)) rest = rest.replace(/-?settlement$/i, "");
  else if (/approving-sa$/i.test(rest)) rest = rest.replace(/-?approving-sa$/i, "");
  const name = titleCaseSlug(rest);
  const file = `${ymd}-${cite}-${docket}-${name}-Settlement Agreement.pdf`;
  return officialFercPdfUrl(`${PDF_ORIGIN}/sites/default/files/${folder}/${file}`);
}

function listingHrefToPdf(href: string): string {
  const raw = unwrapFercUrl(href.startsWith("http") ? href : href ? `${PDF_ORIGIN}${href}` : "");
  return officialFercPdfUrl(raw) || mediaSlugToOfficialPdfUrl(raw) || raw;
}

const PERSON_PART_RE = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+$/;

function hasTrailingPerson(name: string): boolean {
  const m = name.match(/(?:,|\band)\s+([A-Za-z. /'-]+)$/);
  if (!m) return false;
  const tail = m[1].replace(/\s+f\/k\/a\s+.+$/i, "").trim();
  return tail.split(/\s+and\s+/).every((part) => {
    const cleaned = part.trim();
    return PERSON_PART_RE.test(cleaned) && !ENTITY_RE.test(cleaned);
  });
}

export function isPeopleRow(row: FercListingRow): boolean {
  if ((row.individual ?? "").trim()) return true;
  const name = (row.institution ?? "").trim();
  if (!name) return true;
  if (hasTrailingPerson(name)) return true;
  if (ENTITY_RE.test(name)) return false;
  const cleaned = name.replace(/^In the Matter of\s+/i, "").replace(/\s+d\/b\/a\s+.+$/i, "").trim();
  return PERSON_NAME_RE.test(cleaned);
}

export function isInstitutionOrderRow(row: FercListingRow): boolean {
  if (isPeopleRow(row)) return false;
  const institution = (row.institution ?? "").trim();
  if (!institution || !ENTITY_RE.test(institution)) return false;
  const docket = normalizeDocket(row.docket);
  if (!docket) return false;
  const kind = `${row.title ?? ""} ${row.type ?? ""} ${row.sourceUrl ?? ""}`;
  if (!ORDER_KIND_RE.test(kind)) return false;
  return Boolean(officialFercPdfUrl(row.sourceUrl ?? row.pdfId ?? ""));
}

export function parseListingRows(rows: FercListingRow[]): FercOrderListing[] {
  const found: FercOrderListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isInstitutionOrderRow(row)) continue;
    const docket = normalizeDocket(row.docket);
    const sourceUrl = officialFercPdfUrl(row.sourceUrl ?? row.pdfId ?? "");
    const pdfId = pdfIdFromUrl(sourceUrl ?? "") ?? (row.pdfId ?? "").trim();
    if (!docket || !sourceUrl || !pdfId) continue;
    if (seen.has(docket)) continue;
    seen.add(docket);
    found.push({
      id: docket,
      docket,
      institution: (row.institution ?? "").trim(),
      date: isoDate(row.date),
      title: /stipulation and consent|order approving/i.test(row.title ?? "")
        ? "Order Approving Stipulation and Consent Agreement"
        : (row.title ?? "").trim() || "Order Approving Stipulation and Consent Agreement",
      sourceUrl,
      pdfId,
    });
  }
  found.sort((a, b) => `${b.date ?? ""}${b.docket}`.localeCompare(`${a.date ?? ""}${a.docket}`));
  return found;
}

export function parseListingHtml(html: string): FercOrderListing[] {
  const rows: FercListingRow[] = [];
  const seenHref = new Set<string>();
  const pushFrom = (subject: string, href: string, extra = "") => {
    const sourceUrl = listingHrefToPdf(href);
    if (!sourceUrl || seenHref.has(sourceUrl)) return;
    seenHref.add(sourceUrl);
    const docket = normalizeDocket(subject) || normalizeDocket(href) || normalizeDocket(sourceUrl);
    const institution =
      subject
        .replace(/,?\s*Docket No\..+$/i, "")
        .replace(/^In the Matter of\s+/i, "")
        .trim() || subject;
    rows.push({
      institution,
      docket: docket ?? "",
      date: isoDate(subject) ?? isoDate(extra) ?? undefined,
      title: /terminat/i.test(subject) ? "Order Terminating" : subject,
      type: extra,
      sourceUrl,
    });
  };
  const trs = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of trs) {
    const href = (row.match(/href="([^"]+)"/i) || [])[1] || "";
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
    if (cells.length < 2 && !href) continue;
    pushFrom(cells[0] ?? stripTags(row), href, cells[2] ?? "");
  }
  const loose = [...html.matchAll(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of loose) {
    const href = m[1];
    if (!/cms\.ferc\.gov\/(?:media|sites\/default\/files)/i.test(unwrapFercUrl(href)) && !/\/media\//i.test(href)) {
      continue;
    }
    const around = stripTags(html.slice(Math.max(0, m.index! - 400), (m.index ?? 0) + m[0].length + 80));
    pushFrom(around, href);
  }
  return parseListingRows(rows);
}

export function isIndexTeaserDump(text: string): boolean {
  if (/Index only — institution \/ docket \/ date \/ PDF URL/i.test(text)) return true;
  if (
    /All Civil Penalty Actions/i.test(text) &&
    !/Before Commissioners/i.test(text) &&
    !/ORDER APPROVING STIPULATION AND CONSENT AGREEMENT/i.test(text)
  ) {
    return true;
  }
  return false;
}

export function isElibraryMetadataDump(text: string): boolean {
  if (/eLibrary metadata only/i.test(text)) return true;
  if (/"acesssionNumber"|"accessionNumber"/.test(text) && /"fileName"/.test(text) && !/Before Commissioners/i.test(text)) {
    return true;
  }
  if (/Filing Description for Accession Number/i.test(text) && !/Before Commissioners/i.test(text)) {
    return true;
  }
  return false;
}

export function isFederalRegisterDump(text: string): boolean {
  return /"raw_text"/.test(text) || /"full_text"/.test(text) || /federalregister\.gov/i.test(text);
}

export function isPeopleDump(text: string): boolean {
  if (/people-only FERC/i.test(text)) return true;
  if (/\bIAP\b/i.test(text) && /individual/i.test(text) && !/Before Commissioners/i.test(text)) return true;
  return false;
}

export function isRealFercOrderBody(text: string): boolean {
  if (isIndexTeaserDump(text) || isElibraryMetadataDump(text) || isFederalRegisterDump(text) || isPeopleDump(text)) {
    return false;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 2000) return false;
  if (/FINANCIAL CRIMES ENFORCEMENT NETWORK/i.test(text) && /CONSENT ORDER IMPOSING CIVIL MONEY PENALTY/i.test(text)) {
    return false;
  }
  if (/CONSUMER FINANCIAL PROTECTION BUREAU/i.test(text) && /File No\.\s*\d{4}-CFPB-\d+/i.test(text)) {
    return false;
  }
  if (/OFFICE OF THE COMPTROLLER OF THE CURRENCY/i.test(text) && /\bAA-[A-Z]{2,4}-\d{4}-\d+\b/.test(text)) {
    return false;
  }
  if (/FEDERAL DEPOSIT INSURANCE CORPORATION/i.test(text) && /\bFDIC-\d{2}-\d{4}[a-z]\b/i.test(text)) {
    return false;
  }
  if (/BOARD OF GOVERNORS OF THE FEDERAL RESERVE SYSTEM/i.test(text) && /\b\d{2}-\d{3}-(?:B|PCA|WA\/RB)/i.test(text)) {
    return false;
  }
  if (/National Credit Union Administration/i.test(text) && /\b\d{2}-\d{4}-[A-Z]{2}\b/.test(text)) {
    return false;
  }
  if (/Bureau of Consumer Protection/i.test(text) && /Made in the USA Labeling Rule|MUSA Labeling Rule/i.test(text)) {
    return false;
  }
  const ferc = /FEDERAL ENERGY REGULATORY COMMISSION/i.test(text);
  const order =
    /ORDER APPROVING STIPULATION AND CONSENT AGREEMENT/i.test(text) ||
    /ORDER TO SHOW CAUSE/i.test(text) ||
    /ORDER ASSESSING CIVIL PENALT/i.test(text);
  const docket = DOCKET_RE.test(text);
  const commissioners = /Before Commissioners/i.test(text);
  return ferc && order && docket && commissioners;
}

export function parseOrderTitle(body: string): string {
  if (/ORDER APPROVING STIPULATION AND CONSENT AGREEMENT/i.test(body)) {
    return "Order Approving Stipulation and Consent Agreement";
  }
  if (/ORDER TO SHOW CAUSE/i.test(body)) return "Order to Show Cause";
  if (/ORDER ASSESSING CIVIL PENALT/i.test(body)) return "Order Assessing Civil Penalties";
  return "Order Approving Stipulation and Consent Agreement";
}

export function parseDocketFromBody(body: string): string | null {
  return normalizeDocket(body.slice(0, 4000));
}

export function parseFercOrderText(
  text: string,
  meta: {
    sourceUrl: string;
    institution?: string;
    date?: string | null;
    docket?: string | null;
    pdfId?: string;
    id?: string;
    title?: string;
  },
): FercOrderCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialFercPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const docket = normalizeDocket(meta.docket) || parseDocketFromBody(body) || "unknown";
  const pdfId = meta.pdfId || pdfIdFromUrl(sourceUrl) || docket;
  return {
    id: meta.id || docket,
    docket,
    pdfId,
    institution: (meta.institution && meta.institution.trim()) || docket,
    date: meta.date ?? isoDate(body.slice(0, 2500)),
    title: meta.title || parseOrderTitle(body),
    sourceUrl,
    body,
  };
}

export function emptySnapshot(reason: string): FercOrdersSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: [],
  };
}

function cardDateKey(card: Pick<FercOrderCard, "date" | "docket">): string {
  return `${card.date ?? ""}${card.docket}`;
}

export function assembleSnapshot(cards: FercOrderCard[], fetchedAt = new Date().toISOString()): FercOrdersSnapshot {
  const withBody = cards
    .filter((c) => isRealFercOrderBody(c.body))
    .sort((a, b) => cardDateKey(b).localeCompare(cardDateKey(a)));
  const asOf =
    withBody
      .map((c) => c.date)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason: withBody.length > 0 ? null : "Official FERC institution order PDFs had no extractable order text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): FercOrdersSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FercOrdersSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readSnapshot(): FercOrdersSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("FERC_ORDERS_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: FercOrdersSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export function hasCachedFercOrderBody(): boolean {
  const snap = readSnapshot();
  return Boolean(snap && snap.cards.some((c) => isRealFercOrderBody(c.body)));
}

function listingDir(): string {
  return env("FERC_ORDERS_JSON_DIR") || env("FERC_ORDERS_LISTING_DIR");
}

function firstSliceLimit(): number {
  const raw = env("FERC_ORDERS_LIMIT", "24");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 24;
}

function maxFetchLimit(): number {
  const raw = env("FERC_ORDERS_MAX_FETCH", "36");
  if (raw === "0") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 36;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

export async function fetchFercBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  if (head !== "%PDF-") throw new Error(`${url} is not an official PDF`);
  return bytes;
}

export async function fetchFercText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (res.ok) return await res.text();
  if (res.status === 403 || res.status === 406 || res.status === 503) {
    const wb = await fetch(waybackUrl(url), {
      headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
    });
    if (wb.ok) return await wb.text();
    throw new Error(`${url} HTTP ${res.status}; wayback ${wb.status}`);
  }
  throw new Error(`${url} HTTP ${res.status}`);
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FERC_ORDERS_PDFTOTEXT") || "pdftotext";
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

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function mergeOfficialListings(listed: FercOrderListing[], seeds: FercOrderListing[]): FercOrderListing[] {
  const seen = new Set<string>();
  const out: FercOrderListing[] = [];
  for (const row of [...listed, ...seeds]) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

async function loadOfficialListings(dir: string): Promise<{ listed: FercOrderListing[]; listedCount: number }> {
  if (dir) {
    const listed: FercOrderListing[] = [];
    for (const name of ["listing-excerpt.json", "leftover-listing-excerpt.json", "listing.json"]) {
      const json = readNamedFile(dir, [name]);
      if (!json) continue;
      const rows = JSON.parse(json) as FercListingRow[];
      if (Array.isArray(rows)) listed.push(...parseListingRows(rows));
    }
    if (listed.length > 0) {
      const merged = mergeOfficialListings(listed, []);
      return { listed: merged, listedCount: merged.length };
    }
    const year = readNamedFile(dir, ["2025-year-excerpt.html", "year-excerpt.html"]);
    if (year) {
      const parsed = parseListingHtml(year);
      return { listed: parsed, listedCount: parsed.length };
    }
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html"]);
    const parsed = html ? parseListingHtml(html) : [];
    return { listed: parsed, listedCount: parsed.length };
  }
  try {
    const listed: FercOrderListing[] = [];
    for (const url of [LISTING_URL, ...YEAR_LISTING_URLS]) {
      try {
        listed.push(...parseListingHtml(await fetchFercText(url)));
      } catch {
        /* one official year table missed; keep the others */
      }
    }
    const merged = mergeOfficialListings(
      [...LEFTOVER_WALK_LISTINGS, ...OFFICIAL_WALK_LISTINGS, ...listed],
      SEED_LISTINGS,
    );
    if (merged.length > 0) return { listed: merged, listedCount: merged.length };
  } catch {
    /* official listing missed; walk official cms.ferc.gov PDFs */
  }
  const walked = mergeOfficialListings([...LEFTOVER_WALK_LISTINGS, ...OFFICIAL_WALK_LISTINGS], SEED_LISTINGS);
  return { listed: walked, listedCount: walked.length };
}

function priorBodies(): Map<string, FercOrderCard> {
  const prior = new Map<string, FercOrderCard>();
  for (const card of readSnapshot()?.cards ?? []) {
    if (isRealFercOrderBody(card.body)) prior.set(card.id, card);
  }
  return prior;
}

export async function collectFercOrders(opts?: {
  pauseMs?: number;
  jsonDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FercOrdersSnapshot> {
  const dir = opts?.jsonDir ?? listingDir();
  const pauseMs = opts?.pauseMs ?? (dir ? 0 : 400);
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = fercOrdersDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = priorBodies();
  if (allListed.length === 0) {
    if (prior.size > 0) {
      const snap = {
        ...assembleSnapshot([...prior.values()]),
        listedCount: 0,
        fetchedPdfs: 0,
        skippedNoText: 0,
        reused: prior.size,
        addedThisRun: 0,
        reason: "Official FERC seed listing missed; kept cached institution order bodies.",
      };
      writeSnapshot(snap);
      return snap;
    }
    const snap = emptySnapshot("Official FERC seed listing had no institution order rows.");
    writeSnapshot(snap);
    return snap;
  }
  const cards: FercOrderCard[] = [];
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
    if (!dir) await pause(pauseMs);
    try {
      const localText = readNamedFile(dir, [`${row.docket}.txt`, `${row.id}.txt`, `${row.pdfId}.txt`]);
      if (dir && !localText) {
        skippedNoText += 1;
        continue;
      }
      const pdfFile = join(cacheDir, `${row.docket}.pdf`);
      const text =
        localText ??
        (await (async () => {
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchFercBytes(row.sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseFercOrderText(text, {
        sourceUrl: row.sourceUrl,
        institution: row.institution,
        date: row.date,
        docket: row.docket,
        pdfId: row.pdfId,
        id: row.id,
        title: row.title,
      });
      if (!isRealFercOrderBody(parsed.body)) {
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
    ...assembleSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeSnapshot(snap);
  return snap;
}

export async function loadFercOrders(): Promise<FercOrdersSnapshot> {
  const cached = readSnapshot();
  if (cached && cached.cards.some((c) => isRealFercOrderBody(c.body))) {
    return cached;
  }
  try {
    return await collectFercOrders();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealFercOrderBody(c.body)) ? "stale" : "empty",
        reason: `Live FERC institution-order fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptySnapshot(
      `FERC institution-order PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFercOrdersManifest(snap: FercOrdersSnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFercOrderBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote("/ferc-orders", 'Full catalog: count + institution + docket + date + official URL. Not the civil-penalty index teaser'),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: FERC_ORDERS_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      docket: c.docket,
      date: c.date,
      sourceUrl: c.sourceUrl,
    })),
    schema: { fields: ["id", "institution", "docket", "date", "sourceUrl"] },
    sources: snap?.sources ?? { listing: LISTING_URL, pdfHost: `${PDF_ORIGIN}/` },
  };
}

export async function loadFercOrdersManifest(): Promise<Record<string, unknown>> {
  const cached = readSnapshot();
  if (cached) return buildFercOrdersManifest(cached);
  return buildFercOrdersManifest(null);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFercOrders()
    .then((snap) => {
      console.log(
        JSON.stringify(
          {
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.filter((c) => isRealFercOrderBody(c.body)).length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skippedNoText: snap.skippedNoText ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
              id: c.id,
              docket: c.docket,
              pdfId: c.pdfId,
              institution: c.institution,
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
