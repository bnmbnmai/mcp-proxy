/**
 * Ofgem-authored enforcement TEXT door.
 * Official PDFs on ofgem.gov.uk/sites/default/files/ only.
 * Crown / OGL. Does not invent notice text. Does not sell the HTML
 * publication card (index + teaser only). Skip RIIO / open-data CSVs.
 * Skip people files. Does not sell the Ofgem logo.
 * Not Ofwat / CMA / ICO / Ofsted.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function paidBodyCatalogNote(path: string, detail: string): string {
  return `Free index for ${path}. ${detail} GET ${path}?id= is one official text ($0.02). Plain GET ${path} is the newest 10 official texts ($0.05).`;
}

export const OFGEM_ENFORCEMENT_PATH = "/ofgem-enforcement";
export const OFGEM_ENFORCEMENT_MANIFEST_PATH = "/ofgem-enforcement/manifest.json";
export const OFGEM_ENFORCEMENT_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "ofgem-enforcement-bodies";
export const PRODUCT_NAME = "Ofgem enforcement-notice text";

export const HUB_URL =
  "https://www.ofgem.gov.uk/energy-regulation/how-we-regulate/compliance-and-enforcement";
export const PDF_HOST = "www.ofgem.gov.uk";
export const PDF_ORIGIN = "https://www.ofgem.gov.uk";
export const LICENSE = "Crown copyright / Open Government Licence v3.0";
export const ATTRIBUTION =
  "Ofgem (Gas and Electricity Markets Authority). Contains public sector information licensed under the Open Government Licence v3.0. Logos reserved.";
export const COPYRIGHT_URL = "https://www.ofgem.gov.uk/c-ofgem-2026";

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

export type OfgemEnforcementListing = {
  id: string;
  docket: string;
  institution: string;
  date: string | null;
  kind: string;
  title: string;
  pageUrl: string;
  sourceUrl: string;
};

export type OfgemEnforcementCard = OfgemEnforcementListing & { body: string };

export type OfgemEnforcementSnapshot = {
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
  cards: OfgemEnforcementCard[];
};

const HTTP_UA =
  "bnm-data-shop/1.0 (Ofgem enforcement texts; +https://www.ofgem.gov.uk/energy-regulation/how-we-regulate/compliance-and-enforcement)";
const OFFICIAL_HOSTS = new Set(["ofgem.gov.uk", "www.ofgem.gov.uk"]);
const UPLOAD_RE = /^\/sites\/default\/files\/(\d{4})-(\d{2})\/([^/?#]+\.pdf)$/i;
const MIN_BODY_CHARS = 2500;
const PEOPLE_ONLY =
  /\b(curriculum vitae|cv(?: of)?|date of birth|home address|passport number|private email|our people|board member biography|senior leadership biographies)\b/i;
const RIIO_OPEN_DATA =
  /\b(RIIO|open data|regulatory reporting pack|price control financial model)\b/i;
const CSV_OR_JSON_WRAP = /^\s*[\[{]|^\s*"[^"]+",|^\s*\w+,(\w+,)+\w+/;
const HTML_TEASER =
  /\b(read the (?:full )?(?:notice|decision|document)|download the pdf|publication type:\s*enforcement case)\b/i;

export const SEED_LISTINGS: OfgemEnforcementListing[] = [
  {
    id: "Decision to close investigation into OVO Energy Limited prepayment meter practices",
    docket: "ovo-ppm-close-2026-06",
    institution: "OVO Energy Limited",
    date: "2026-06-03",
    kind: "enforcement-notice",
    title: "Decision to close investigation into OVO Energy Limited prepayment meter practices",
    pageUrl: "https://www.ofgem.gov.uk/publications/ovo-energy-prepayment-meter-practices",
    sourceUrl:
      "https://www.ofgem.gov.uk/sites/default/files/2026-06/Decision%20to%20close%20investigation%20into%20OVO%20Energy%20Limited%20prepayment%20meter%20practices.pdf",
  },
  {
    id: "Tomato Energy Limited - Notice of Proposal to Impose a Penalty",
    docket: "tomato-s27a-proposal-2025-10",
    institution: "Tomato Energy Limited",
    date: "2025-10-10",
    kind: "penalty-proposal",
    title: "Notice of Proposal to Impose a Financial Penalty Pursuant to Section 27A(3) of the Electricity Act 1989",
    pageUrl: "https://www.ofgem.gov.uk/publications/tomato-energy-limited-failure-maintain-liquidity",
    sourceUrl:
      "https://www.ofgem.gov.uk/sites/default/files/2025-10/Tomato%20Energy%20Limited%20-%20Notice%20of%20Proposal%20to%20Impose%20a%20Penalty.pdf",
  },
  {
    id: "PO7.Confirmed-Provisional-Order-Tomato-Energy-Ltd-Unsigned",
    docket: "tomato-confirmed-po-2025-07",
    institution: "Tomato Energy Limited",
    date: "2025-07-09",
    kind: "provisional-order",
    title: "Provisional Order confirmed under section 25(4) of the Electricity Act 1989",
    pageUrl: "https://www.ofgem.gov.uk/publications/tomato-energy-limited-provisional-order",
    sourceUrl:
      "https://www.ofgem.gov.uk/sites/default/files/2025-07/PO7.Confirmed-Provisional-Order-Tomato-Energy-Ltd-Unsigned.pdf",
  },
  {
    id: "Farringdon-Energy-PO-Penalty-Notice",
    docket: "farringdon-s27a-decision-2025-06",
    institution: "Farringdon Energy Limited",
    date: "2025-06-16",
    kind: "penalty-decision",
    title: "Notice of decision to impose a financial penalty pursuant to section 27A(1) and (5) of the Electricity Act 1989",
    pageUrl: HUB_URL,
    sourceUrl: "https://www.ofgem.gov.uk/sites/default/files/2025-06/Farringdon-Energy-PO-Penalty-Notice.pdf",
  },
  {
    id: "Farringdon_Energy_Penalty_Proposal_Notice",
    docket: "farringdon-s27a-proposal-2024-11",
    institution: "Farringdon Energy Limited",
    date: "2024-11-06",
    kind: "penalty-proposal",
    title: "Notice of proposal to impose a financial penalty pursuant to section 27A(3) of the Electricity Act 1989",
    pageUrl: HUB_URL,
    sourceUrl: "https://www.ofgem.gov.uk/sites/default/files/2024-11/Farringdon_Energy_Penalty_Proposal_Notice.pdf",
  },
  {
    id: "July 2023 SSE Foyers TCLC - Final penalty notice",
    docket: "sse-foyers-tclc-2023-07",
    institution: "SSE Generation Limited",
    date: "2023-07-25",
    kind: "penalty-decision",
    title: "Notice of decision to impose a financial penalty pursuant to section 27A(5) of the Electricity Act 1989",
    pageUrl: HUB_URL,
    sourceUrl:
      "https://www.ofgem.gov.uk/sites/default/files/2023-07/July%202023%20SSE%20Foyers%20TCLC%20-%20Final%20penalty%20notice.pdf",
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function ofgemEnforcementDir(): string {
  if (env("OFGEM_ENFORCEMENT_DIR")) return resolve(env("OFGEM_ENFORCEMENT_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/ofgem-enforcement"));
}

export function snapshotPath(): string {
  return join(ofgemEnforcementDir(), "snapshot.json");
}

export function bundledSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../src/fixtures/ofgem-enforcement/seed-snapshot.json"),
    join(here, "fixtures/ofgem-enforcement/seed-snapshot.json"),
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

export function officialOfgemPdfUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  try {
    const u = new URL(urlOrPath, PDF_ORIGIN);
    if (!OFFICIAL_HOSTS.has(u.hostname.toLowerCase())) return null;
    const path = decodeURIComponent(u.pathname.replace(/\/+/g, "/"));
    const m = path.match(UPLOAD_RE);
    if (!m) return null;
    const file = encodeURIComponent(m[3]).replace(/%2E/gi, ".");
    return `${PDF_ORIGIN}/sites/default/files/${m[1]}-${m[2]}/${file}`;
  } catch {
    return null;
  }
}

export function isOfficialOfgemPdf(url: string | null | undefined): boolean {
  return Boolean(officialOfgemPdfUrl(url));
}

export function pdfIdFromUrl(url: string | null | undefined): string | null {
  const official = officialOfgemPdfUrl(url);
  if (!official) return null;
  try {
    const name = decodeURIComponent(new URL(official).pathname.split("/").pop() || "");
    return name.replace(/\.pdf$/i, "") || null;
  } catch {
    return null;
  }
}

export function isPeopleRow(row: Pick<OfgemEnforcementListing, "institution" | "title" | "id">): boolean {
  const blob = `${row.institution || ""} ${row.title || ""} ${row.id || ""}`;
  if (/\b(tomato energy|farringdon|champion energy|ovo energy|sse generation|ofgem)\b/i.test(blob)) {
    return false;
  }
  return PEOPLE_ONLY.test(blob) || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test((row.institution || "").trim());
}

export function isRiioOrCsvUrl(url: string | null | undefined): boolean {
  const t = String(url || "").toLowerCase();
  return /\.(csv|json|xml|txt)(?:[?#]|$)/.test(t) || /\/(?:riio|open-data|regulatory-reporting)\b/.test(t);
}

export function parseHubHtml(html: string, pageUrl = HUB_URL): OfgemEnforcementListing[] {
  const out: OfgemEnforcementListing[] = [];
  const seen = new Set<string>();
  const hrefRe = /href=["']([^"']+\.pdf)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html))) {
    const abs = officialOfgemPdfUrl(new URL(m[1].replace(/&amp;/g, "&"), pageUrl).toString());
    if (!abs) continue;
    const id = pdfIdFromUrl(abs);
    if (!id || seen.has(id) || isRiioOrCsvUrl(abs)) continue;
    seen.add(id);
    const around = html.slice(Math.max(0, m.index - 400), Math.min(html.length, m.index + 400));
    const title = decodeEntities(around.replace(/<[^>]+>/g, " ")).slice(0, 180) || id;
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

export function parseListingRows(rows: OfgemEnforcementListing[]): OfgemEnforcementListing[] {
  const out: OfgemEnforcementListing[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const sourceUrl = officialOfgemPdfUrl(row.sourceUrl);
    const id = row.id || pdfIdFromUrl(sourceUrl) || "";
    if (!sourceUrl || !id || seen.has(id) || isPeopleRow({ ...row, id }) || isRiioOrCsvUrl(sourceUrl)) {
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
  if (/tomato energy/i.test(t)) return "Tomato Energy Limited";
  if (/farringdon|champion energy/i.test(t)) return "Farringdon Energy Limited";
  if (/\bovo\b/i.test(t)) return "OVO Energy Limited";
  if (/\bsse\b/i.test(t)) return "SSE Generation Limited";
  return "";
}

function kindFromBlob(raw: string): string {
  const t = String(raw || "").toLowerCase();
  if (t.includes("provisional-order") || t.includes("provisional order")) return "provisional-order";
  if (t.includes("proposal") || t.includes("intention to impose")) return "penalty-proposal";
  if (t.includes("decision to impose") || t.includes("final penalty")) return "penalty-decision";
  return "enforcement-notice";
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ukNamed = String(raw).match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
  );
  if (ukNamed) {
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
    const mm = months[ukNamed[2].toLowerCase()];
    return mm ? `${ukNamed[3]}-${mm}-${ukNamed[1].padStart(2, "0")}` : null;
  }
  const ym = String(raw).match(/\/sites\/default\/files\/(\d{4})-(\d{2})\//);
  if (ym) return `${ym[1]}-${ym[2]}-01`;
  return null;
}

export function isIndexTeaserDump(text: string): boolean {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length < MIN_BODY_CHARS && HTML_TEASER.test(t)) return true;
  if (/publication type:\s*enforcement case/i.test(t) && !/\bsection 27A\b|\bprovisional order\b/i.test(t)) {
    return true;
  }
  return false;
}

export function isRealOfgemEnforcementBody(text: string): boolean {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length < MIN_BODY_CHARS) return false;
  if (PEOPLE_ONLY.test(t) && !/\bofgem\b|\belectricity act\b/i.test(t)) return false;
  if (RIIO_OPEN_DATA.test(t) && !/\bsection 27A\b|\bprovisional order\b/i.test(t) && t.length < 8000) {
    return false;
  }
  if (CSV_OR_JSON_WRAP.test(t) && !/\belectricity act\b|\bgas act\b/i.test(t)) return false;
  if (isIndexTeaserDump(t)) return false;
  const hasOfgem = /\bofgem\b|\bgas and electricity markets authority\b/i.test(t);
  const hasStatute =
    /\belectricity act 1989\b|\bgas act 1986\b|\bsection 27A\b|\bsection 25\b|\bstandard licence condition/i.test(t);
  const hasEnforcement =
    /\bprovisional order\b|\bpenalty notice\b|\bfinancial penalty\b|\benforcement\b|\bpenalty policy\b|\bdecision to close investigation\b/i.test(
      t,
    );
  return hasOfgem && hasStatute && hasEnforcement;
}

export function parseOfgemEnforcementText(
  text: string,
  meta: Partial<OfgemEnforcementListing> & { sourceUrl: string },
): OfgemEnforcementCard {
  const body = text.replace(/\f/g, "\n").trim();
  const sourceUrl = officialOfgemPdfUrl(meta.sourceUrl) || meta.sourceUrl;
  const id = meta.id || pdfIdFromUrl(sourceUrl) || sourceUrl;
  return {
    id,
    docket: meta.docket || id,
    institution: meta.institution || institutionFromBlob(`${meta.title || ""} ${body.slice(0, 800)}`) || id,
    date: isoDate(meta.date) ?? isoDate(body.slice(0, 1200)) ?? isoDate(sourceUrl),
    kind: meta.kind || kindFromBlob(`${meta.title || ""} ${id}`),
    title: meta.title || id,
    pageUrl: meta.pageUrl || HUB_URL,
    sourceUrl,
    body,
  };
}

export function emptyOfgemEnforcementSnapshot(reason: string): OfgemEnforcementSnapshot {
  return {
    ok: true,
    product: PRODUCT_ID,
    status: "empty",
    reason,
    fetchedAt: new Date().toISOString(),
    asOf: null,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: HUB_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/` },
    cards: [],
  };
}

export function assembleOfgemEnforcementSnapshot(
  cards: OfgemEnforcementCard[],
  fetchedAt = new Date().toISOString(),
): OfgemEnforcementSnapshot {
  const withBody = cards
    .filter((c) => isRealOfgemEnforcementBody(c.body) && officialOfgemPdfUrl(c.sourceUrl))
    .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const asOf = withBody.map((c) => c.date).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ok: true,
    product: PRODUCT_ID,
    status: withBody.length > 0 ? "ok" : "empty",
    reason:
      withBody.length > 0
        ? null
        : "Official Ofgem enforcement PDFs had no extractable penalty / provisional-order / enforcement-notice text.",
    fetchedAt,
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: { index: HUB_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/` },
    cards: withBody,
  };
}

function parseSnapshotFile(raw: unknown): OfgemEnforcementSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as OfgemEnforcementSnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return snap;
}

export function readOfgemEnforcementSnapshot(): OfgemEnforcementSnapshot | null {
  const path = snapshotPath();
  if (existsSync(path)) {
    try {
      const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
      if (parsed) return parsed;
    } catch {
      /* corrupt */
    }
  }
  if (env("OFGEM_ENFORCEMENT_DIR")) return null;
  const seed = bundledSeedPath();
  if (!existsSync(seed)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
  } catch {
    return null;
  }
}

export function writeOfgemEnforcementSnapshot(snap: OfgemEnforcementSnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

export async function fetchOfgemBytes(url: string): Promise<Uint8Array> {
  const official = officialOfgemPdfUrl(url) || url;
  const res = await fetch(official, {
    headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,*/*" },
  });
  if (!res.ok) throw new Error(`${official} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error(`${official} is not an official PDF`);
  }
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("OFGEM_ENFORCEMENT_PDFTOTEXT") || "pdftotext";
  const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function listingDir(): string {
  return env("OFGEM_ENFORCEMENT_HTML_DIR") || env("OFGEM_ENFORCEMENT_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("OFGEM_ENFORCEMENT_LIMIT", "6"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
}

function maxFetchLimit(): number {
  const n = Number(env("OFGEM_ENFORCEMENT_MAX_FETCH", "6"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
}

function readNamedFile(dir: string, names: string[]): string | null {
  if (!dir) return null;
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return readFileSync(path, "utf-8");
  }
  return null;
}

async function loadOfficialListings(
  dir: string,
): Promise<{ listed: OfgemEnforcementListing[]; listedCount: number }> {
  if (dir) {
    const html = readNamedFile(dir, ["listing-excerpt.html", "listing.html", "hub.html"]);
    const fromHtml = html ? parseHubHtml(html, HUB_URL) : [];
    const extra = SEED_LISTINGS.filter((row) => existsSync(join(dir, `${row.id}.txt`)));
    const listed = parseListingRows([...extra, ...fromHtml]);
    return { listed, listedCount: listed.length };
  }
  return { listed: parseListingRows(SEED_LISTINGS), listedCount: SEED_LISTINGS.length };
}

export async function collectOfgemEnforcement(opts?: {
  pauseMs?: number;
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<OfgemEnforcementSnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = ofgemEnforcementDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, OfgemEnforcementCard>();
  for (const card of readOfgemEnforcementSnapshot()?.cards ?? []) {
    if (isRealOfgemEnforcementBody(card.body)) prior.set(card.id, card);
  }
  const cards: OfgemEnforcementCard[] = [];
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
      const sourceUrl = officialOfgemPdfUrl(row.sourceUrl) || row.sourceUrl;
      const text =
        localText ??
        (await (async () => {
          const pdfFile = join(cacheDir, `${row.id}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchOfgemBytes(sourceUrl));
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseOfgemEnforcementText(text, { ...row, sourceUrl });
      if (!isRealOfgemEnforcementBody(parsed.body)) {
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
    ...assembleOfgemEnforcementSnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeOfgemEnforcementSnapshot(snap);
  return snap;
}

export async function loadOfgemEnforcement(): Promise<OfgemEnforcementSnapshot> {
  const cached = readOfgemEnforcementSnapshot();
  if (cached) {
    const filtered = assembleOfgemEnforcementSnapshot(cached.cards, cached.fetchedAt);
    if (filtered.cards.length) return { ...cached, ...filtered };
  }
  try {
    return await collectOfgemEnforcement();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: cached.cards.some((c) => isRealOfgemEnforcementBody(c.body)) ? "stale" : "empty",
        reason: `Live Ofgem enforcement fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyOfgemEnforcementSnapshot(
      `Ofgem enforcement PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildOfgemEnforcementManifest(
  snap: OfgemEnforcementSnapshot | null,
): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealOfgemEnforcementBody(c.body));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      OFGEM_ENFORCEMENT_PATH,
      "Count + institution + docket + date + official Ofgem PDF URL only. Notice body is the paid GET /ofgem-enforcement payload. This free manifest lists the full catalog. HTML publication cards, people files, and RIIO / open-data CSVs are not sold.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: "0xf59621FC406D266e18f314Ae18eF0a33b8401004",
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountAtomic: OFGEM_ENFORCEMENT_AMOUNT_ATOMIC,
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
    sources: snap?.sources ?? { index: HUB_URL, pdfHost: `${PDF_ORIGIN}/sites/default/files/` },
  };
}

export async function loadOfgemEnforcementManifest(): Promise<Record<string, unknown>> {
  return buildOfgemEnforcementManifest(readOfgemEnforcementSnapshot());
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectOfgemEnforcement()
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
