#!/usr/bin/env node
/**
 * US Chemical Safety Board final investigation report PDFs (ugly PDF cache).
 * Official CSB-authored Final Investigation Report PDFs on csb.gov/assets and
 * /file.aspx. 17 U.S.C. § 105. Cache + resale OK. Does not wrap investigation
 * HTML chrome. Paid GET is the official PDF. Free manifest is titles/links/counts.
 * Skip Status Change Summary PDFs, current-investigation teasers, update-only packs.
 * Habit: CSB posts new Final Report Released On dates.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
export const CSB_REPORTS_PATH = "/csb-reports";
export const CSB_REPORTS_MANIFEST_PATH = "/csb-reports/manifest.json";
export const CSB_REPORTS_AMOUNT_ATOMIC = "50000";
export const PRODUCT_ID = "csb-final-investigation-report-pdfs";
export const PRODUCT_NAME = "US CSB final investigation report PDFs";
export const INDEX_URL = "https://www.csb.gov/investigations/completed-investigations/";
export const CURRENT_URL = "https://www.csb.gov/investigations/current-investigations/";
export const PDF_ORIGIN = "https://www.csb.gov";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION = "U.S. Chemical Safety and Hazard Investigation Board";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const CARD_FIELDS = ["id", "facility", "date", "title", "pageUrl", "sourceUrl", "kind", "bytes", "sha256"];
const HTTP_UA = "bnm-data-shop/1.0 (CSB final investigation reports; +https://www.csb.gov/investigations/)";
const OFFICIAL_HOSTS = new Set(["www.csb.gov", "csb.gov"]);
const PAGE_PATH_RE = /^\/[a-z0-9][a-z0-9-]{6,220}\/?$/i;
const COMPLETED_SLUG_RE = /^\/investigations\/completed-investigations\/([a-z0-9][a-z0-9-]{6,220})\/?$/i;
const CHROME_PAGE_RE = /^\/(about-the-csb|members|news|events|photos|videos|subscribe|recommendations|media-room|career-opportunities|contact|cj|records-details|en-espanol|investigations)(\/|$)/i;
const ASSET_PDF_RE = /^\/assets\/1\/(\d+)\/([^/?#]+\.pdf)$/i;
const FILE_ASPX_RE = /^\/file\.aspx$/i;
const SKIP_NAME_RE = /status[_\s-]?change|investigation[_\s-]?update|inv[_\s-]?update|factual[_\s-]?update|factual[_\s-]?investigative|appendix_|executive[_\s-]?summary|call[_\s-]?to[_\s-]?action|report[_\s-]?schedule|public[_\s-]?meeting|presentation|chairman[_\s-]?opening|dust[_\s-]?incidents|consultant[_\s-]?report/i;
const KEEP_NAME_RE = /investigation[_\s-]?report|report[_\s-]?for[_\s-]?(?:public[_\s-]?release|publication)|forpublication|final[_\s-]?report|public[_\s-]?record[_\s-]?copy|board[_\s-]?approved[_\s-]?version|report-final|report_-_final/i;
const CURRENT_TEASER_RE = /current-investigations|opens investigation|launches investigation|deploys team/i;
const PEOPLE_RE = /\b(curriculum vitae|date of birth|home address|passport number)\b/i;
const CPSC_RE = /saferproducts\.gov|RestWebServices\/Recall/i;
const USGS_CADORS_RE = /\b(usgs|nwis|cadors|edgar)\b/i;
export const SEED_LISTINGS = [
    {
        id: "bio-lab-inc-conyers-fire-and-chemical-release",
        facility: "Bio-Lab Inc. Conyers",
        date: "2026-07-21",
        title: "Bio-Lab Inc. Conyers Fire and Chemical Release",
        pageUrl: "https://www.csb.gov/bio-lab-inc-conyers-fire-and-chemical-release-/",
        sourceUrl: "https://www.csb.gov/assets/1/20/bio-lab_report__public_record_copy_.pdf",
    },
    {
        id: "givaudan-sense-colour-explosion",
        facility: "Givaudan Sense Colour",
        date: "2026-05-27",
        title: "Givaudan Sense Colour Explosion",
        pageUrl: "https://www.csb.gov/givaudan-sense-colour-explosion-/",
        sourceUrl: "https://www.csb.gov/assets/1/20/givaudan_investigation_report_publication.pdf",
    },
    {
        id: "dow-louisiana-operations-explosions",
        facility: "Dow Louisiana Operations",
        date: "2026-02-26",
        title: "Dow Louisiana Operations Explosions",
        pageUrl: "https://www.csb.gov/dow-louisiana-operations-explosions/",
        sourceUrl: "https://www.csb.gov/assets/1/20/dow_investigation_report-final_(002).pdf",
    },
    {
        id: "pemex-deer-park-chemical-release",
        facility: "PEMEX Deer Park",
        date: "2026-02-23",
        title: "PEMEX Deer Park Chemical Release",
        pageUrl: "https://www.csb.gov/pemex-deer-park-chemical-release-/",
        sourceUrl: "https://www.csb.gov/assets/1/20/pemex_investigation_report_final.pdf",
    },
    {
        id: "honeywell-geismar-chlorine-and-hydrogen-fluoride-releases",
        facility: "Honeywell Geismar",
        date: "2025-05-27",
        title: "Honeywell Geismar Chlorine and Hydrogen Fluoride Releases",
        pageUrl: "https://www.csb.gov/honeywell-geismar-chlorine-and-hydrogen-fluoride-releases/",
        sourceUrl: "https://www.csb.gov/assets/1/20/honeywell_geismar_investigation_report_-_final.pdf",
    },
    {
        id: "marathon-martinez-renewable-fuels-fire",
        facility: "Marathon Martinez Renewable Fuels",
        date: "2025-03-13",
        title: "Marathon Martinez Renewable Fuels Fire",
        pageUrl: "https://www.csb.gov/marathon-martinez-renewable-fuels-fire-/",
        sourceUrl: "https://www.csb.gov/assets/1/6/marathon_martinez_2025-03-12_forpublication.pdf",
    },
    {
        id: "didion-milling-company-explosion-and-fire",
        facility: "Didion Milling Company",
        date: "2023-12-06",
        title: "Didion Milling Company Explosion and Fire",
        pageUrl: "https://www.csb.gov/didion-milling-company-explosion-and-fire-/",
        sourceUrl: "https://www.csb.gov/assets/1/6/didion_milling_report_for_public_release.pdf",
    },
    {
        id: "yenkin-majestic-resin-plant-vapor-cloud-explosion-and-fire",
        facility: "Yenkin-Majestic Resin Plant",
        date: "2023-11-30",
        title: "Yenkin-Majestic Resin Plant Vapor Cloud Explosion and Fire",
        pageUrl: "https://www.csb.gov/yenkin-majestic-resin-plant-vapor-cloud-explosion-and-fire/",
        sourceUrl: "https://www.csb.gov/assets/1/6/yenkin-majestic_report_for_public_release-upload.pdf",
    },
    {
        id: "optima-belle-explosion-and-fire",
        facility: "Optima Belle",
        date: "2023-07-06",
        title: "Optima Belle Explosion and Fire",
        pageUrl: "https://www.csb.gov/optima-belle-explosion-and-fire/",
        sourceUrl: "https://www.csb.gov/assets/1/20/optima_report_for_publication.pdf",
    },
    {
        id: "kuraray-pasadena-release-and-fire",
        facility: "Kuraray Pasadena",
        date: "2022-12-21",
        title: "Kuraray Pasadena Release and Fire",
        pageUrl: "https://www.csb.gov/kuraray-pasadena-release-and-fire/",
        sourceUrl: "https://www.csb.gov/assets/1/20/kuraray_america_inc_final_report_2022-12-16.pdf",
    },
];
function env(name, fallback = "") {
    return (process.env[name] ?? fallback).trim();
}
export function csbReportsDir() {
    if (env("CSB_REPORTS_DIR"))
        return resolve(env("CSB_REPORTS_DIR"));
    return resolve(join(homedir(), "projects/mcp-proxy/data/csb-reports"));
}
export function snapshotPath() {
    return join(csbReportsDir(), "snapshot.json");
}
export function isoDate(raw) {
    if (!raw)
        return null;
    const iso = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso)
        return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const mdy = String(raw).match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (!mdy)
        return null;
    const day = `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
    const y = Number(mdy[3]);
    return y >= 1990 && y <= 2100 ? day : null;
}
export function officialCsbPageUrl(raw) {
    if (!raw)
        return null;
    try {
        const parsed = new URL(raw.trim(), PDF_ORIGIN);
        if (!OFFICIAL_HOSTS.has(parsed.hostname.toLowerCase()))
            return null;
        if (CURRENT_TEASER_RE.test(parsed.pathname) || PEOPLE_RE.test(parsed.pathname) || CPSC_RE.test(parsed.href)) {
            return null;
        }
        const completed = parsed.pathname.match(COMPLETED_SLUG_RE);
        const slugPath = completed ? `/${completed[1]}` : parsed.pathname.replace(/\/+$/, "") || "/";
        if (CHROME_PAGE_RE.test(`${slugPath}/`) || CHROME_PAGE_RE.test(slugPath))
            return null;
        if (!PAGE_PATH_RE.test(`${slugPath}/`) && !PAGE_PATH_RE.test(slugPath))
            return null;
        const hyphens = (slugPath.match(/-/g) || []).length;
        if (hyphens < 3)
            return null;
        return `${PDF_ORIGIN}${slugPath.replace(/\/+$/, "")}/`;
    }
    catch {
        return null;
    }
}
export function idFromPageUrl(pageUrl) {
    const official = officialCsbPageUrl(pageUrl);
    if (!official)
        return null;
    const slug = official.replace(/\/+$/, "").split("/").pop() || "";
    const id = slug.replace(/-+$/g, "").trim();
    return id || null;
}
function decodePdfName(name) {
    try {
        return decodeURIComponent(name);
    }
    catch {
        return name;
    }
}
export function isSkippedCsbPdfName(name) {
    const n = decodePdfName(name);
    if (SKIP_NAME_RE.test(n))
        return true;
    if (/\.(png|jpe?g|gif|svg)$/i.test(n))
        return true;
    return false;
}
export function isKeptCsbFinalPdfName(name) {
    const n = decodePdfName(name);
    if (isSkippedCsbPdfName(n))
        return false;
    return KEEP_NAME_RE.test(n);
}
export function officialCsbFinalPdfUrl(urlOrPath) {
    if (!urlOrPath)
        return null;
    try {
        const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
        if (CPSC_RE.test(parsed.href) || USGS_CADORS_RE.test(parsed.href))
            return null;
        const host = parsed.hostname.toLowerCase();
        if (!OFFICIAL_HOSTS.has(host))
            return null;
        const path = parsed.pathname;
        if (FILE_ASPX_RE.test(path)) {
            const doc = parsed.searchParams.get("DocumentId") || parsed.searchParams.get("documentid");
            if (!doc || !/^\d+$/.test(doc))
                return null;
            return `${PDF_ORIGIN}/file.aspx?DocumentId=${doc}`;
        }
        const asset = path.match(ASSET_PDF_RE);
        if (!asset)
            return null;
        const file = decodePdfName(asset[2]);
        if (!isKeptCsbFinalPdfName(file))
            return null;
        return `${PDF_ORIGIN}/assets/1/${asset[1]}/${file.toLowerCase()}`;
    }
    catch {
        return null;
    }
}
export function isOfficialCsbFinalPdf(url) {
    return Boolean(officialCsbFinalPdfUrl(url));
}
export function parseListingRows(rows) {
    const found = [];
    const seen = new Set();
    for (const row of rows) {
        if (CURRENT_TEASER_RE.test(`${row.pageUrl} ${row.title}`))
            continue;
        if (PEOPLE_RE.test(`${row.title} ${row.id} ${row.facility}`))
            continue;
        const sourceUrl = officialCsbFinalPdfUrl(row.sourceUrl);
        const pageUrl = officialCsbPageUrl(row.pageUrl);
        const id = (row.id || idFromPageUrl(pageUrl || "") || "").replace(/-+$/g, "").trim();
        if (!sourceUrl || !pageUrl || !id || seen.has(id))
            continue;
        seen.add(id);
        found.push({
            id,
            facility: (row.facility || "").trim() || id,
            date: isoDate(row.date),
            title: (row.title || "").trim() || id,
            pageUrl,
            sourceUrl,
        });
    }
    found.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
    return found;
}
export function extractHrefCandidates(html) {
    return Array.from(String(html || "").matchAll(/(?:href|src)=["']([^"']+)["']/gi), (m) => m[1]);
}
export function parseCompletedIndex(html) {
    const rows = [];
    const seen = new Set();
    const source = String(html || "");
    for (const mark of source.matchAll(/Final Report Released On[:\s]*(?:<\/b>\s*)?([^<\n]+)/gi)) {
        const idx = mark.index ?? 0;
        const date = isoDate(mark[1]);
        const window = source.slice(Math.max(0, idx - 2000), idx);
        const inv = window.match(/href=["']([^"']+)["'][^>]*(?:tt="inv"|class="[^"]*linkHd)/i);
        const hrefs = inv ? [inv[1], ...extractHrefCandidates(window)] : extractHrefCandidates(window);
        let pageUrl = null;
        for (let i = hrefs.length - 1; i >= 0; i -= 1) {
            const official = officialCsbPageUrl(hrefs[i]);
            if (official) {
                pageUrl = official;
                break;
            }
        }
        if (!pageUrl)
            continue;
        const id = idFromPageUrl(pageUrl);
        if (!id || seen.has(id))
            continue;
        seen.add(id);
        const invTitle = window.match(/(?:tt="inv"|class="[^"]*linkHd)[^>]*>\s*<b>([^<]{8,180})<\/b>/i);
        const titles = [...window.matchAll(/<b>([^<]{8,180})<\/b>/gi)]
            .map((m) => (m[1] || "").replace(/\s+/g, " ").trim())
            .filter((t) => t && !/^(Location|Final Report|Incident|Released)\b/i.test(t));
        const title = (invTitle?.[1] || titles.at(-1) || "").replace(/\s+/g, " ").trim() || id;
        rows.push({
            id,
            facility: title,
            date,
            title,
            pageUrl,
            sourceUrl: "",
        });
    }
    return rows;
}
export function parseInvestigationPage(html, pageUrl, prior) {
    const officialPage = officialCsbPageUrl(pageUrl);
    if (!officialPage)
        return null;
    const id = prior?.id || idFromPageUrl(officialPage);
    if (!id)
        return null;
    const date = isoDate(prior?.date) ||
        isoDate((html.match(/Final Report Released On[:\s]*([^<\n]+)/i) || [])[1] || "");
    let sourceUrl = officialCsbFinalPdfUrl(prior?.sourceUrl);
    if (!sourceUrl) {
        for (const href of extractHrefCandidates(html)) {
            const pdf = officialCsbFinalPdfUrl(href);
            if (pdf && !/\/file\.aspx/i.test(pdf)) {
                sourceUrl = pdf;
                break;
            }
        }
    }
    if (!sourceUrl) {
        for (const href of extractHrefCandidates(html)) {
            const pdf = officialCsbFinalPdfUrl(href);
            if (pdf) {
                sourceUrl = pdf;
                break;
            }
        }
    }
    if (!sourceUrl)
        return null;
    const priorTitle = (prior?.title || "").trim();
    const title = (priorTitle && !/^(Location|Final Report|Incident|Released)\b/i.test(priorTitle) ? priorTitle : "") ||
        (html.match(/<title>([^<]+)<\/title>/i)?.[1] || "").replace(/\s+\|\s+CSB\s*$/i, "").trim() ||
        id;
    return {
        id,
        facility: (prior?.facility || title).trim(),
        date,
        title,
        pageUrl: officialPage,
        sourceUrl,
    };
}
export function isChromeInvestigationHtml(html) {
    const t = String(html || "");
    if (t.length < 200)
        return false;
    const hasChrome = /Investigations \| CSB|Final Report Released On/i.test(t);
    const hasPdfBytes = t.startsWith("%PDF-");
    return hasChrome && !hasPdfBytes;
}
export function isPdfBytes(bytes) {
    return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
}
export function emptyCsbReportsSnapshot(reason) {
    return {
        ok: true,
        product: PRODUCT_ID,
        status: "empty",
        reason,
        fetchedAt: new Date().toISOString(),
        asOf: null,
        license: LICENSE,
        attribution: ATTRIBUTION,
        sources: { index: INDEX_URL, current: CURRENT_URL, pdfHost: `${PDF_ORIGIN}/assets/` },
        cards: [],
    };
}
export function assembleCsbReportsSnapshot(cards, fetchedAt = new Date().toISOString()) {
    const kept = cards
        .filter((c) => officialCsbFinalPdfUrl(c.sourceUrl) && c.bytes > 0 && c.sha256)
        .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
    const asOf = kept.map((c) => c.date).filter((d) => Boolean(d)).sort().at(-1) ?? null;
    return {
        ok: true,
        product: PRODUCT_ID,
        status: kept.length > 0 ? "ok" : "empty",
        reason: kept.length > 0 ? null : "Official CSB final investigation report PDFs were not cached.",
        fetchedAt,
        asOf,
        license: LICENSE,
        attribution: ATTRIBUTION,
        sources: { index: INDEX_URL, current: CURRENT_URL, pdfHost: `${PDF_ORIGIN}/assets/` },
        cards: kept,
    };
}
function parseSnapshotFile(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const snap = raw;
    if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards))
        return null;
    return snap;
}
export function readCsbReportsSnapshot() {
    const path = snapshotPath();
    if (!existsSync(path))
        return null;
    try {
        return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
    }
    catch {
        return null;
    }
}
export function writeCsbReportsSnapshot(snap) {
    const path = snapshotPath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(snap, null, 2)}\n`);
}
export function pdfPathForCard(card) {
    if (card.pdfFile && existsSync(card.pdfFile))
        return card.pdfFile;
    return join(csbReportsDir(), `${card.id}.pdf`);
}
export function readCachedPdf(card) {
    const path = pdfPathForCard(card);
    if (!existsSync(path))
        return null;
    const bytes = new Uint8Array(readFileSync(path));
    return isPdfBytes(bytes) ? bytes : null;
}
export async function fetchCsbBytes(url) {
    const official = officialCsbFinalPdfUrl(url) || url;
    const res = await fetch(official, {
        headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,*/*" },
        redirect: "follow",
    });
    if (!res.ok)
        throw new Error(`${official} HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (!isPdfBytes(bytes))
        throw new Error(`${official} is not an official PDF`);
    return bytes;
}
export async function fetchCsbText(url) {
    const res = await fetch(url, {
        headers: { "User-Agent": HTTP_UA, Accept: "text/html,*/*" },
        redirect: "follow",
    });
    if (!res.ok)
        throw new Error(`${url} HTTP ${res.status}`);
    return await res.text();
}
function listingDir() {
    return env("CSB_REPORTS_HTML_DIR") || env("CSB_REPORTS_LISTING_DIR");
}
function firstSliceLimit() {
    const n = Number(env("CSB_REPORTS_LIMIT", "10"));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}
function maxFetchLimit() {
    const n = Number(env("CSB_REPORTS_MAX_FETCH", "10"));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}
function readNamedFile(dir, names) {
    if (!dir)
        return null;
    for (const name of names) {
        const path = join(dir, name);
        if (existsSync(path))
            return readFileSync(path, "utf-8");
    }
    return null;
}
function pause(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
async function loadOfficialListings(dir) {
    if (dir) {
        const html = readNamedFile(dir, [
            "completed-investigations.html",
            "completed.html",
            "listing.html",
            "index.html",
        ]);
        const fromIndex = html ? parseCompletedIndex(html) : [];
        const enriched = [];
        for (const row of [...fromIndex, ...SEED_LISTINGS]) {
            const pageHtml = readNamedFile(dir, [`${row.id}.html`, `${row.id}.htm`]);
            if (pageHtml) {
                const parsed = parseInvestigationPage(pageHtml, row.pageUrl, row);
                if (parsed)
                    enriched.push(parsed);
            }
            else if (officialCsbFinalPdfUrl(row.sourceUrl)) {
                enriched.push(row);
            }
        }
        const listed = parseListingRows(enriched);
        return { listed, listedCount: listed.length };
    }
    try {
        const pages = [];
        for (const page of [1, 2, 3, 4, 5]) {
            const url = page === 1 ? `${INDEX_URL}?Type=2` : `${INDEX_URL}?Type=2&pg=${page}`;
            const html = await fetchCsbText(url);
            pages.push(...parseCompletedIndex(html));
        }
        const listed = parseListingRows([...pages, ...SEED_LISTINGS]);
        if (listed.length > 0)
            return { listed, listedCount: listed.length };
    }
    catch {
        /* keep seeds */
    }
    return { listed: parseListingRows(SEED_LISTINGS), listedCount: SEED_LISTINGS.length };
}
export async function collectCsbReports(opts) {
    const dir = opts?.htmlDir ?? listingDir();
    const pauseMs = opts?.pauseMs ?? (dir ? 0 : 300);
    const { listed: allListed, listedCount } = await loadOfficialListings(dir);
    const target = opts?.limit ?? firstSliceLimit();
    const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
    const cacheDir = csbReportsDir();
    mkdirSync(cacheDir, { recursive: true });
    const prior = new Map();
    for (const card of readCsbReportsSnapshot()?.cards ?? []) {
        if (readCachedPdf(card))
            prior.set(card.id, card);
    }
    const cards = [];
    const seen = new Set();
    let fetchedPdfs = 0;
    let skipped = 0;
    let reused = 0;
    let addedThisRun = 0;
    for (const row of allListed) {
        if (target > 0 && addedThisRun >= target)
            break;
        const cached = prior.get(row.id);
        if (cached) {
            cards.push(cached);
            seen.add(row.id);
            reused += 1;
            continue;
        }
        if (fetchCap > 0 && fetchedPdfs >= fetchCap)
            break;
        if (!dir && pauseMs)
            await pause(pauseMs);
        try {
            let listing = row;
            if (!officialCsbFinalPdfUrl(listing.sourceUrl)) {
                const pageHtml = dir
                    ? readNamedFile(dir, [`${row.id}.html`])
                    : await fetchCsbText(row.pageUrl);
                if (!pageHtml) {
                    skipped += 1;
                    continue;
                }
                const parsed = parseInvestigationPage(pageHtml, row.pageUrl, row);
                if (!parsed) {
                    skipped += 1;
                    continue;
                }
                listing = parsed;
            }
            const sourceUrl = officialCsbFinalPdfUrl(listing.sourceUrl);
            if (!sourceUrl) {
                skipped += 1;
                continue;
            }
            const pdfFile = join(cacheDir, `${listing.id}.pdf`);
            const localPdf = existsSync(pdfFile) ? new Uint8Array(readFileSync(pdfFile)) : null;
            const fixturePdf = dir ? join(dir, `${listing.id}.pdf`) : "";
            let bytes = localPdf && isPdfBytes(localPdf) ? localPdf : null;
            if (!bytes && fixturePdf && existsSync(fixturePdf)) {
                const fx = new Uint8Array(readFileSync(fixturePdf));
                if (isPdfBytes(fx))
                    bytes = fx;
            }
            if (!bytes) {
                if (dir) {
                    skipped += 1;
                    continue;
                }
                bytes = await fetchCsbBytes(sourceUrl);
                fetchedPdfs += 1;
            }
            const pdfBytes = bytes;
            writeFileSync(pdfFile, pdfBytes);
            const sha256 = createHash("sha256").update(pdfBytes).digest("hex");
            cards.push({
                ...listing,
                sourceUrl,
                kind: "final-investigation-report",
                bytes: pdfBytes.byteLength,
                sha256,
                pdfFile,
            });
            seen.add(listing.id);
            addedThisRun += 1;
        }
        catch {
            skipped += 1;
        }
    }
    for (const [id, card] of prior) {
        if (!seen.has(id))
            cards.push(card);
    }
    const snap = {
        ...assembleCsbReportsSnapshot(cards),
        listedCount,
        fetchedPdfs,
        skipped,
        reused,
        addedThisRun,
    };
    writeCsbReportsSnapshot(snap);
    return snap;
}
export async function loadCsbReports() {
    const cached = readCsbReportsSnapshot();
    if (cached) {
        const filtered = assembleCsbReportsSnapshot(cached.cards, cached.fetchedAt);
        if (filtered.cards.length)
            return { ...cached, ...filtered };
    }
    try {
        return await collectCsbReports();
    }
    catch (err) {
        if (cached) {
            return {
                ...cached,
                status: cached.cards.length ? "stale" : "empty",
                reason: `Live CSB final-report fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
            };
        }
        return emptyCsbReportsSnapshot(`CSB final investigation report PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`);
    }
}
export function buildCsbReportsManifest(snap) {
    const cards = snap?.cards ?? [];
    return {
        product: PRODUCT_ID,
        name: PRODUCT_NAME,
        free: true,
        note: "Free index for /csb-reports. Count + facility + date + official CSB page + PDF URL only. Paid GET /csb-reports is the official final investigation report PDF. License 17 USC 105.",
        license: LICENSE,
        attribution: ATTRIBUTION,
        payTo: PAY_TO,
        network: "base",
        asset: USDC,
        amountAtomic: CSB_REPORTS_AMOUNT_ATOMIC,
        priceUsdc: "0.05",
        fetchedAt: snap?.fetchedAt ?? null,
        asOf: snap?.asOf ?? null,
        cardCount: cards.length,
        cards: cards.map((c) => ({
            id: c.id,
            facility: c.facility,
            date: c.date,
            title: c.title,
            pageUrl: c.pageUrl,
            sourceUrl: c.sourceUrl,
            bytes: c.bytes,
        })),
        schema: { fields: ["id", "facility", "date", "title", "pageUrl", "sourceUrl", "bytes"] },
        sources: snap?.sources ?? { index: INDEX_URL, current: CURRENT_URL, pdfHost: `${PDF_ORIGIN}/assets/` },
    };
}
export function filterCsbReportsManifest(manifest, q) {
    const needle = (q ?? "").trim().toLowerCase();
    if (!needle)
        return manifest;
    const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
    const matched = cards.filter((raw) => {
        if (!raw || typeof raw !== "object")
            return false;
        const row = raw;
        return ["id", "facility", "date", "title", "pageUrl", "sourceUrl"].some((k) => String(row[k] ?? "")
            .toLowerCase()
            .includes(needle));
    });
    return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}
export async function loadCsbReportsManifest(q) {
    return filterCsbReportsManifest(buildCsbReportsManifest(readCsbReportsSnapshot()), q);
}
export function selectCsbReportCard(snap, opts) {
    const all = snap?.cards ?? [];
    const one = opts?.id?.trim();
    if (one)
        return all.find((c) => c.id === one) ?? null;
    if (opts?.before?.trim()) {
        const idx = all.findIndex((c) => c.id === opts.before || c.date === opts.before);
        return idx >= 0 ? all[idx + 1] ?? null : null;
    }
    return all[0] ?? null;
}
function isMain() {
    const entry = process.argv[1] ? resolve(process.argv[1]) : "";
    return Boolean(entry && import.meta.url === `file://${entry}`);
}
if (isMain()) {
    collectCsbReports()
        .then((snap) => {
        console.log(JSON.stringify({
            status: snap.status,
            fetchedAt: snap.fetchedAt,
            asOf: snap.asOf,
            cardCount: snap.cards.length,
            listedCount: snap.listedCount ?? snap.cards.length,
            fetchedPdfs: snap.fetchedPdfs ?? 0,
            skipped: snap.skipped ?? 0,
            reused: snap.reused ?? 0,
            addedThisRun: snap.addedThisRun ?? 0,
            cards: snap.cards.map((c) => ({
                id: c.id,
                facility: c.facility,
                date: c.date,
                bytes: c.bytes,
                sourceUrl: c.sourceUrl,
            })),
            snapshot: snapshotPath(),
        }, null, 2));
    })
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=csb-reports.js.map