#!/usr/bin/env node
/**
 * UK AAIB investigation-report TEXT door.
 * Official investigation-report PDFs on assets.publishing.service.gov.uk
 * linked from GOV.UK /aaib-reports. OGL v3.0. Cache + resale OK with attribution.
 * Leak-clean: GOV.UK Content API / Search are synopsis / title / link / count only.
 * Full TEXT is in the official PDF. Does not invent report text.
 * Skip glossary PDFs, Annual Safety Review, RAIB (twin, PARK), news teasers.
 * Distinct from /orr-enforcement. Habit: new investigation reports post.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
function paidBodyCatalogNote(path, detail) {
    return `Free index for ${path}. ${detail} GET ${path}?id= is one official text ($0.02). Plain GET ${path} is the newest 10 official texts ($0.05).`;
}
export const AAIB_REPORTS_PATH = "/aaib-reports";
export const AAIB_REPORTS_MANIFEST_PATH = "/aaib-reports/manifest.json";
export const AAIB_REPORTS_AMOUNT_ATOMIC = "50000";
export const AAIB_REPORTS_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "aaib-investigation-report-bodies";
export const PRODUCT_NAME = "UK AAIB investigation-report text";
export const INDEX_URL = "https://www.gov.uk/aaib-reports";
export const SEARCH_URL = "https://www.gov.uk/api/search.json?filter_format=aaib_report&count=20&order=-public_timestamp";
export const CONTENT_API = "https://www.gov.uk/api/content";
export const PDF_HOST = "assets.publishing.service.gov.uk";
export const PDF_ORIGIN = "https://assets.publishing.service.gov.uk";
export const MEDIA_RE = /\/media\/([0-9a-f]+)\/([^/?#]+\.pdf)/i;
export const PAGE_PATH_RE = /^\/aaib-reports\/aaib-investigation-to-[a-z0-9][a-z0-9-]{2,200}$/i;
export const LICENSE = "OGL v3.0";
export const ATTRIBUTION = "Air Accidents Investigation Branch. Contains public sector information licensed under the Open Government Licence v3.0.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const CARD_FIELDS = [
    "id",
    "registration",
    "aircraft",
    "date",
    "title",
    "pageUrl",
    "sourceUrl",
    "kind",
    "body",
];
const HTTP_UA = "bnm-data-shop/1.0 (AAIB investigation-report texts; +https://www.gov.uk/aaib-reports)";
const OFFICIAL_PDF_HOSTS = new Set(["assets.publishing.service.gov.uk"]);
const OFFICIAL_PAGE_HOSTS = new Set(["www.gov.uk", "gov.uk"]);
const MIN_BODY_CHARS = 1200;
const GLOSSARY_RE = /glossary of abbreviations|abbreviations\.pdf/i;
const ANNUAL_REVIEW_RE = /annual safety review/i;
const RAIB_RE = /\bRail Accident Investigation Branch\b|\bRAIB\b/;
const PEOPLE_RE = /\b(curriculum vitae|date of birth|home address|passport number)\b/i;
const SYNOPSIS_RE = /this page is an index synopsis|GOV\.UK Content API body|INDEX ONLY — title/i;
const HTML_SYNOPSIS_RE = /<p>[\s\S]{80,}<\/p>/i;
export const SEED_LISTINGS = [
    {
        id: "aaib-investigation-to-eurofox-2k-g-cmax",
        registration: "G-CMAX",
        aircraft: "Eurofox 2K",
        date: "2026-08-20",
        title: "AAIB investigation to Eurofox 2K, G-CMAX",
        pageUrl: "https://www.gov.uk/aaib-reports/aaib-investigation-to-eurofox-2k-g-cmax",
        sourceUrl: "https://assets.publishing.service.gov.uk/media/6a730cd0de77e2943cd3bbe8/Eurofox_2K_G-CMAX_09-26.pdf",
    },
    {
        id: "aaib-investigation-to-skyranger-swift-912s-1-g-mlzz",
        registration: "G-MLZZ",
        aircraft: "Skyranger Swift 912S(1)",
        date: "2026-08-13",
        title: "AAIB investigation to Skyranger Swift 912S(1), G-MLZZ",
        pageUrl: "https://www.gov.uk/aaib-reports/aaib-investigation-to-skyranger-swift-912s-1-g-mlzz",
        sourceUrl: "https://assets.publishing.service.gov.uk/media/6a73474ad7839e24e776398d/Skyranger_Swift_912S_1__G-MLZZ_08-26.pdf",
    },
    {
        id: "aaib-investigation-to-skymagic-x245-uas-registration-n-slash-a",
        registration: "n/a",
        aircraft: "Skymagic X245",
        date: "2026-08-13",
        title: "AAIB investigation to Skymagic X245, (UAS registration n/a)",
        pageUrl: "https://www.gov.uk/aaib-reports/aaib-investigation-to-skymagic-x245-uas-registration-n-slash-a",
        sourceUrl: "https://assets.publishing.service.gov.uk/media/6a73486e6e8c7d8d7c3c2867/Skymagic_X245_UAS_registration_n_a_08-26.pdf",
    },
    {
        id: "aaib-investigation-to-embraer-190ar-zs-yad",
        registration: "ZS-YAD",
        aircraft: "Embraer 190AR",
        date: "2026-07-16",
        title: "AAIB investigation to Embraer 190AR, ZS-YAD",
        pageUrl: "https://www.gov.uk/aaib-reports/aaib-investigation-to-embraer-190ar-zs-yad",
        sourceUrl: "https://assets.publishing.service.gov.uk/media/6a4cb0bdc5aa1b17abab40d4/Embraer_190AR_ZS-YAD_08-26.pdf",
    },
    {
        id: "aaib-investigation-to-jodel-d18-g-bodt",
        registration: "G-BODT",
        aircraft: "Jodel D18",
        date: "2026-07-16",
        title: "AAIB investigation to Jodel D18, G-BODT",
        pageUrl: "https://www.gov.uk/aaib-reports/aaib-investigation-to-jodel-d18-g-bodt",
        sourceUrl: "https://assets.publishing.service.gov.uk/media/6a47bede732d8e7ce5f53cf3/Jodel_D18_G-BODT_08-26.pdf",
    },
    {
        id: "aaib-investigation-to-boeing-737-8-g-crux",
        registration: "G-CRUX",
        aircraft: "Boeing 737-8",
        date: "2026-07-09",
        title: "AAIB investigation to Boeing 737-8, G-CRUX",
        pageUrl: "https://www.gov.uk/aaib-reports/aaib-investigation-to-boeing-737-8-g-crux",
        sourceUrl: "https://assets.publishing.service.gov.uk/media/6a478997732d8e7ce5f53c07/Boeing_737-8_G-CRUX.pdf",
    },
    {
        id: "aaib-investigation-to-westland-scout-ah1-g-bwhu",
        registration: "G-BWHU",
        aircraft: "Westland Scout AH1",
        date: "2026-07-09",
        title: "AAIB investigation to Westland Scout AH1, G-BWHU",
        pageUrl: "https://www.gov.uk/aaib-reports/aaib-investigation-to-westland-scout-ah1-g-bwhu",
        sourceUrl: "https://assets.publishing.service.gov.uk/media/6a4789ca8effd97622f53bfb/Westland_Scout_AH1_G-BWHU_07-26.pdf",
    },
    {
        id: "aaib-investigation-to-de-havilland-aircraft-of-canada-limited-dhc-8-9h-lwb",
        registration: "9H-LWB",
        aircraft: "De Havilland Aircraft of Canada Limited DHC-8",
        date: "2026-07-02",
        title: "AAIB investigation to De Havilland Aircraft of Canada Limited DHC-8, 9H-LWB",
        pageUrl: "https://www.gov.uk/aaib-reports/aaib-investigation-to-de-havilland-aircraft-of-canada-limited-dhc-8-9h-lwb",
        sourceUrl: "https://assets.publishing.service.gov.uk/media/6a42410db9f58f0eb4c13f14/De_Havilland_Aircraft_of_Canada_Limited_DHC-8_9H-LWB_07-26.pdf",
    },
    {
        id: "aaib-investigation-to-dyn-aero-mcr-01-g-tomx",
        registration: "G-TOMX",
        aircraft: "Dyn Aero MCR-01",
        date: "2026-06-18",
        title: "AAIB investigation to Dyn Aero MCR-01, G-TOMX",
        pageUrl: "https://www.gov.uk/aaib-reports/aaib-investigation-to-dyn-aero-mcr-01-g-tomx",
        sourceUrl: "https://assets.publishing.service.gov.uk/media/6a1eae0559fb7a60f827f5fe/Dyn_Aero_MCR-01_G-TOMX_07-26.pdf",
    },
    {
        id: "aaib-investigation-to-mw6-1-1-g-mnmw",
        registration: "G-MNMW",
        aircraft: "MW6-1-1",
        date: "2026-06-11",
        title: "AAIB investigation to MW6-1-1, G-MNMW",
        pageUrl: "https://www.gov.uk/aaib-reports/aaib-investigation-to-mw6-1-1-g-mnmw",
        sourceUrl: "https://assets.publishing.service.gov.uk/media/6a1da728b95db968c8f3bd0e/MW6-1-1_G-MNMW_06-26.pdf",
    },
];
function env(name, fallback = "") {
    return (process.env[name] ?? fallback).trim();
}
export function aaibReportsDir() {
    if (env("AAIB_REPORTS_DIR"))
        return resolve(env("AAIB_REPORTS_DIR"));
    return resolve(join(homedir(), "projects/mcp-proxy/data/aaib-reports"));
}
export function snapshotPath() {
    return join(aaibReportsDir(), "snapshot.json");
}
export function bundledSeedPath() {
    const here = dirname(fileURLToPath(import.meta.url));
    for (const candidate of [
        join(here, "../src/fixtures/aaib-reports/seed-snapshot.json"),
        join(here, "fixtures/aaib-reports/seed-snapshot.json"),
    ]) {
        if (existsSync(candidate))
            return candidate;
    }
    return join(here, "../src/fixtures/aaib-reports/seed-snapshot.json");
}
export function isoDate(raw) {
    if (!raw)
        return null;
    const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}
export function officialAaibPageUrl(raw) {
    if (!raw)
        return null;
    try {
        const parsed = new URL(raw.trim(), "https://www.gov.uk");
        if (!OFFICIAL_PAGE_HOSTS.has(parsed.hostname.toLowerCase()))
            return null;
        const path = parsed.pathname.replace(/\/+$/, "") || "/";
        if (!PAGE_PATH_RE.test(path))
            return null;
        if (ANNUAL_REVIEW_RE.test(path) || /\/raib-reports\//i.test(path))
            return null;
        return `https://www.gov.uk${path}`;
    }
    catch {
        return null;
    }
}
export function officialAaibReportPdfUrl(urlOrPath) {
    if (!urlOrPath)
        return null;
    try {
        const parsed = new URL(urlOrPath.trim(), PDF_ORIGIN);
        const host = parsed.hostname.toLowerCase();
        if (host === "web.archive.org" || host === "www.raib.gov.uk" || host === "raib.gov.uk")
            return null;
        if (!OFFICIAL_PDF_HOSTS.has(host))
            return null;
        const path = decodeURIComponent(parsed.pathname);
        if (GLOSSARY_RE.test(path) || ANNUAL_REVIEW_RE.test(path))
            return null;
        const media = path.match(MEDIA_RE) || parsed.pathname.match(MEDIA_RE);
        if (!media)
            return null;
        if (GLOSSARY_RE.test(media[2]))
            return null;
        return `${PDF_ORIGIN}/media/${media[1]}/${media[2]}`;
    }
    catch {
        return null;
    }
}
export function isOfficialAaibReportPdf(url) {
    return Boolean(officialAaibReportPdfUrl(url));
}
export function idFromPageUrl(pageUrl) {
    const official = officialAaibPageUrl(pageUrl);
    if (!official)
        return null;
    return official.split("/").pop() || null;
}
export function isAnnualReviewRow(row) {
    return ANNUAL_REVIEW_RE.test(`${row.id} ${row.title} ${row.pageUrl}`);
}
export function isGlossaryRow(row) {
    return GLOSSARY_RE.test(`${row.title} ${row.sourceUrl}`);
}
export function isRaibRow(row) {
    return /\/raib-reports\//i.test(`${row.pageUrl} ${row.sourceUrl}`) || /\bRAIB investigation\b/i.test(row.title);
}
export function isPeopleRow(row) {
    return PEOPLE_RE.test(`${row.title} ${row.id} ${row.aircraft}`);
}
export function parseListingRows(rows) {
    const found = [];
    const seen = new Set();
    for (const row of rows) {
        if (isAnnualReviewRow(row) || isGlossaryRow(row) || isRaibRow(row) || isPeopleRow(row))
            continue;
        const sourceUrl = officialAaibReportPdfUrl(row.sourceUrl);
        const pageUrl = officialAaibPageUrl(row.pageUrl);
        const id = (row.id || idFromPageUrl(pageUrl || "") || "").trim();
        if (!sourceUrl || !pageUrl || !id || seen.has(id))
            continue;
        seen.add(id);
        found.push({
            id,
            registration: (row.registration || "").trim() || "n/a",
            aircraft: (row.aircraft || "").trim() || id,
            date: isoDate(row.date),
            title: (row.title || "").trim() || id,
            pageUrl,
            sourceUrl,
        });
    }
    found.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
    return found;
}
export function parseSearchJson(raw) {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return [];
    }
    const results = Array.isArray(parsed)
        ? parsed
        : parsed?.results;
    if (!Array.isArray(results))
        return [];
    const rows = [];
    for (const item of results) {
        if (!item || typeof item !== "object")
            continue;
        const row = item;
        const link = String(row.link ?? "");
        const pageUrl = officialAaibPageUrl(link.startsWith("http") ? link : `https://www.gov.uk${link}`);
        if (!pageUrl)
            continue;
        const id = idFromPageUrl(pageUrl);
        if (!id)
            continue;
        rows.push({
            id,
            registration: String(row.registration ?? ""),
            aircraft: String(row.aircraft ?? ""),
            date: isoDate(String(row.public_timestamp ?? row.date ?? "")) ?? null,
            title: String(row.title ?? id),
            pageUrl,
            sourceUrl: String(row.sourceUrl ?? ""),
        });
    }
    return rows;
}
export function parseContentDocument(raw) {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return null;
    }
    if (!parsed || typeof parsed !== "object")
        return null;
    const doc = parsed;
    const details = (doc.details && typeof doc.details === "object" ? doc.details : {});
    const metadata = (details.metadata && typeof details.metadata === "object" ? details.metadata : {});
    const pageUrl = officialAaibPageUrl(String(doc.base_path ?? doc.pageUrl ?? ""));
    if (!pageUrl)
        return null;
    const attachments = Array.isArray(details.attachments) ? details.attachments : [];
    let sourceUrl = "";
    for (const att of attachments) {
        if (!att || typeof att !== "object")
            continue;
        const a = att;
        const url = officialAaibReportPdfUrl(String(a.url ?? ""));
        const title = String(a.title ?? "");
        if (!url || GLOSSARY_RE.test(title))
            continue;
        sourceUrl = url;
        break;
    }
    if (!sourceUrl)
        return null;
    const id = idFromPageUrl(pageUrl);
    if (!id)
        return null;
    return {
        id,
        registration: String(metadata.registration ?? "n/a"),
        aircraft: String(metadata.aircraft_type ?? ""),
        date: isoDate(String(doc.first_published_at ?? doc.public_updated_at ?? "")) ?? null,
        title: String(doc.title ?? id),
        pageUrl,
        sourceUrl,
    };
}
export function isIndexTeaserDump(text) {
    const t = String(text || "").trim();
    if (SYNOPSIS_RE.test(t))
        return true;
    if (HTML_SYNOPSIS_RE.test(t) && !/AAIB Bulletin/i.test(t))
        return true;
    if (/Index only — title \/ registration \/ date \/ PDF URL/i.test(t))
        return true;
    return false;
}
export function isRaibDump(text) {
    return RAIB_RE.test(text) && !/AAIB Bulletin/i.test(text);
}
export function isAnnualReviewDump(text) {
    return ANNUAL_REVIEW_RE.test(text) && !/Aircraft Type and Registration/i.test(text);
}
export function isGlossaryDump(text) {
    return /Glossary of abbreviations/i.test(text) && !/Aircraft Type and Registration/i.test(text);
}
export function isCadorsOrNoAuthDump(text) {
    if (/"CADORS"\s*:/.test(text))
        return true;
    if (/"raw_text"/.test(text) && /edgar|usgs|nwis/i.test(text))
        return true;
    return false;
}
export function isPeopleDump(text) {
    return PEOPLE_RE.test(text) && !/AAIB Bulletin/i.test(text);
}
export function isRealAaibReportBody(text) {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    if (t.length < MIN_BODY_CHARS)
        return false;
    if (isIndexTeaserDump(t) ||
        isRaibDump(t) ||
        isAnnualReviewDump(t) ||
        isGlossaryDump(t) ||
        isCadorsOrNoAuthDump(t) ||
        isPeopleDump(t)) {
        return false;
    }
    const bulletin = /AAIB Bulletin/i.test(t);
    const typeLine = /Aircraft Type and Registration/i.test(t);
    const aaibRef = /\bAAIB-\d{4,}\b/i.test(t);
    return bulletin && typeLine && aaibRef;
}
export function parseAaibReportText(text, meta) {
    const body = text.replace(/\f/g, "\n").trim();
    const sourceUrl = officialAaibReportPdfUrl(meta.sourceUrl) || meta.sourceUrl;
    const pageUrl = officialAaibPageUrl(meta.pageUrl) || meta.pageUrl || INDEX_URL;
    const id = meta.id || idFromPageUrl(pageUrl) || sourceUrl;
    return {
        id,
        registration: (meta.registration || "").trim() || "n/a",
        aircraft: (meta.aircraft || "").trim() || id,
        date: isoDate(meta.date) ?? isoDate(body.slice(0, 800)),
        title: (meta.title || "").trim() || id,
        pageUrl,
        sourceUrl,
        kind: "investigation-report",
        body,
    };
}
export function emptyAaibReportsSnapshot(reason) {
    return {
        ok: true,
        product: PRODUCT_ID,
        status: "empty",
        reason,
        fetchedAt: new Date().toISOString(),
        asOf: null,
        license: LICENSE,
        attribution: ATTRIBUTION,
        sources: { index: INDEX_URL, search: SEARCH_URL, pdfHost: `${PDF_ORIGIN}/media/` },
        cards: [],
    };
}
export function assembleAaibReportsSnapshot(cards, fetchedAt = new Date().toISOString()) {
    const withBody = cards
        .filter((c) => isRealAaibReportBody(c.body) && officialAaibReportPdfUrl(c.sourceUrl))
        .sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
    const asOf = withBody.map((c) => c.date).filter((d) => Boolean(d)).sort().at(-1) ?? null;
    return {
        ok: true,
        product: PRODUCT_ID,
        status: withBody.length > 0 ? "ok" : "empty",
        reason: withBody.length > 0
            ? null
            : "Official AAIB investigation-report PDFs had no extractable investigation text.",
        fetchedAt,
        asOf,
        license: LICENSE,
        attribution: ATTRIBUTION,
        sources: { index: INDEX_URL, search: SEARCH_URL, pdfHost: `${PDF_ORIGIN}/media/` },
        cards: withBody,
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
export function readAaibReportsSnapshot() {
    const path = snapshotPath();
    if (existsSync(path)) {
        try {
            const parsed = parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
            if (parsed)
                return parsed;
        }
        catch {
            /* corrupt */
        }
    }
    if (env("AAIB_REPORTS_DIR"))
        return null;
    const seed = bundledSeedPath();
    if (!existsSync(seed))
        return null;
    try {
        return parseSnapshotFile(JSON.parse(readFileSync(seed, "utf-8")));
    }
    catch {
        return null;
    }
}
export function writeAaibReportsSnapshot(snap) {
    const path = snapshotPath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(snap, null, 2)}\n`);
}
export async function fetchAaibBytes(url) {
    const official = officialAaibReportPdfUrl(url) || url;
    const res = await fetch(official, {
        headers: { "User-Agent": HTTP_UA, Accept: "application/pdf,*/*" },
    });
    if (!res.ok)
        throw new Error(`${official} HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
        throw new Error(`${official} is not an official PDF`);
    }
    return bytes;
}
export async function fetchAaibText(url) {
    const res = await fetch(url, {
        headers: { "User-Agent": HTTP_UA, Accept: "application/json,text/html,*/*" },
    });
    if (!res.ok)
        throw new Error(`${url} HTTP ${res.status}`);
    return await res.text();
}
export function pdfToText(pdfPath) {
    const helper = env("AAIB_REPORTS_PDFTOTEXT") || "pdftotext";
    const result = spawnSync(helper, ["-layout", pdfPath, "-"], {
        encoding: "utf8",
        maxBuffer: 40 * 1024 * 1024,
    });
    if (result.error || result.status !== 0)
        return "";
    return result.stdout || "";
}
function listingDir() {
    return env("AAIB_REPORTS_HTML_DIR") || env("AAIB_REPORTS_LISTING_DIR");
}
function firstSliceLimit() {
    const n = Number(env("AAIB_REPORTS_LIMIT", "10"));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}
function maxFetchLimit() {
    const n = Number(env("AAIB_REPORTS_MAX_FETCH", "10"));
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
        const json = readNamedFile(dir, ["listing-excerpt.json", "listing.json"]);
        const fromSearch = json ? parseSearchJson(json) : [];
        const extra = SEED_LISTINGS.filter((row) => existsSync(join(dir, `${row.id}.txt`)));
        const listed = parseListingRows([...extra, ...fromSearch]);
        return { listed, listedCount: listed.length };
    }
    try {
        const search = await fetchAaibText(SEARCH_URL);
        const fromSearch = parseSearchJson(search);
        const enriched = [];
        for (const row of fromSearch.slice(0, firstSliceLimit() + 4)) {
            try {
                const path = new URL(row.pageUrl).pathname;
                const doc = await fetchAaibText(`${CONTENT_API}${path}`);
                const parsed = parseContentDocument(doc);
                if (parsed)
                    enriched.push(parsed);
            }
            catch {
                /* keep search row without PDF */
            }
        }
        const listed = parseListingRows([...enriched, ...SEED_LISTINGS]);
        if (listed.length > 0)
            return { listed, listedCount: listed.length };
    }
    catch {
        /* official listing missed; keep first-slice seeds */
    }
    return { listed: parseListingRows(SEED_LISTINGS), listedCount: SEED_LISTINGS.length };
}
export async function collectAaibReports(opts) {
    const dir = opts?.htmlDir ?? listingDir();
    const pauseMs = opts?.pauseMs ?? (dir ? 0 : 300);
    const { listed: allListed, listedCount } = await loadOfficialListings(dir);
    const target = opts?.limit ?? firstSliceLimit();
    const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
    const cacheDir = aaibReportsDir();
    mkdirSync(cacheDir, { recursive: true });
    const prior = new Map();
    for (const card of readAaibReportsSnapshot()?.cards ?? []) {
        if (isRealAaibReportBody(card.body))
            prior.set(card.id, card);
    }
    const cards = [];
    const seen = new Set();
    let fetchedPdfs = 0;
    let skippedNoText = 0;
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
            const localText = readNamedFile(dir, [`${row.id}.txt`]);
            if (dir && !localText) {
                skippedNoText += 1;
                continue;
            }
            const sourceUrl = officialAaibReportPdfUrl(row.sourceUrl) || row.sourceUrl;
            const text = localText ??
                (await (async () => {
                    const pdfFile = join(cacheDir, `${row.id}.pdf`);
                    if (!existsSync(pdfFile)) {
                        writeFileSync(pdfFile, await fetchAaibBytes(sourceUrl));
                        fetchedPdfs += 1;
                    }
                    return pdfToText(pdfFile);
                })());
            const parsed = parseAaibReportText(text, { ...row, sourceUrl });
            if (!isRealAaibReportBody(parsed.body)) {
                skippedNoText += 1;
                continue;
            }
            cards.push(parsed);
            seen.add(row.id);
            addedThisRun += 1;
        }
        catch {
            skippedNoText += 1;
        }
    }
    for (const [id, card] of prior) {
        if (!seen.has(id))
            cards.push(card);
    }
    const snap = {
        ...assembleAaibReportsSnapshot(cards),
        listedCount,
        fetchedPdfs,
        skippedNoText,
        reused,
        addedThisRun,
    };
    writeAaibReportsSnapshot(snap);
    return snap;
}
export async function loadAaibReports() {
    const cached = readAaibReportsSnapshot();
    if (cached) {
        const filtered = assembleAaibReportsSnapshot(cached.cards, cached.fetchedAt);
        if (filtered.cards.length)
            return { ...cached, ...filtered };
    }
    try {
        return await collectAaibReports();
    }
    catch (err) {
        if (cached) {
            return {
                ...cached,
                status: cached.cards.some((c) => isRealAaibReportBody(c.body)) ? "stale" : "empty",
                reason: `Live AAIB investigation-report fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
            };
        }
        return emptyAaibReportsSnapshot(`AAIB investigation-report PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`);
    }
}
export function buildAaibReportsManifest(snap) {
    const cards = (snap?.cards ?? []).filter((c) => isRealAaibReportBody(c.body));
    return {
        product: PRODUCT_ID,
        name: PRODUCT_NAME,
        free: true,
        note: paidBodyCatalogNote(AAIB_REPORTS_PATH, "Count + title + registration + aircraft + date + official GOV.UK page + PDF URL only. Investigation body is the paid GET /aaib-reports payload. This free manifest lists the full catalog. GOV.UK Content API / Search synopsis is not sold. Glossary PDFs and the Annual Safety Review are skipped. Distinct from RAIB."),
        license: LICENSE,
        attribution: ATTRIBUTION,
        payTo: PAY_TO,
        network: "base",
        asset: USDC,
        amountAtomic: AAIB_REPORTS_AMOUNT_ATOMIC,
        oneAmountAtomic: AAIB_REPORTS_ONE_AMOUNT_ATOMIC,
        priceUsdc: "0.05",
        fetchedAt: snap?.fetchedAt ?? null,
        asOf: snap?.asOf ?? null,
        cardCount: cards.length,
        cards: cards.map((c) => ({
            id: c.id,
            registration: c.registration,
            aircraft: c.aircraft,
            date: c.date,
            title: c.title,
            pageUrl: c.pageUrl,
            sourceUrl: c.sourceUrl,
        })),
        schema: { fields: ["id", "registration", "aircraft", "date", "title", "pageUrl", "sourceUrl"] },
        sources: snap?.sources ?? { index: INDEX_URL, search: SEARCH_URL, pdfHost: `${PDF_ORIGIN}/media/` },
    };
}
export function filterAaibReportsManifest(manifest, q) {
    const needle = (q ?? "").trim().toLowerCase();
    if (!needle)
        return manifest;
    const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
    const matched = cards.filter((raw) => {
        if (!raw || typeof raw !== "object")
            return false;
        const row = raw;
        return ["id", "registration", "aircraft", "date", "title", "pageUrl", "sourceUrl"].some((k) => String(row[k] ?? "")
            .toLowerCase()
            .includes(needle));
    });
    return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}
export async function loadAaibReportsManifest(q) {
    return filterAaibReportsManifest(buildAaibReportsManifest(readAaibReportsSnapshot()), q);
}
export function buildAaibReportsPaidPage(snap, opts) {
    const all = (snap?.cards ?? []).filter((c) => isRealAaibReportBody(c.body));
    const one = opts?.id?.trim();
    const selected = one ? all.filter((c) => c.id === one) : all;
    const pageSize = 10;
    let start = 0;
    if (!one && opts?.before?.trim()) {
        const idx = selected.findIndex((c) => c.id === opts.before || c.date === opts.before);
        start = idx >= 0 ? idx + 1 : 0;
    }
    else if (!one && opts?.page && opts.page > 1) {
        start = (opts.page - 1) * pageSize;
    }
    const page = selected.slice(start, start + pageSize);
    const next = selected[start + pageSize];
    return {
        ok: true,
        product: PRODUCT_ID,
        status: snap?.status ?? "empty",
        fetchedAt: snap?.fetchedAt ?? null,
        asOf: snap?.asOf ?? null,
        source: INDEX_URL,
        recordCount: page.length,
        records: page.map((c) => ({
            id: c.id,
            date: c.date,
            firm: `${c.aircraft} ${c.registration}`.trim(),
            url: c.sourceUrl,
            type: "aaib-reports",
        })),
        cards: page,
        ids: page.map((c) => c.id),
        nextBefore: next?.id ?? null,
        prevBefore: start > 0 ? selected[Math.max(0, start - pageSize)]?.id ?? null : null,
    };
}
function isMain() {
    const entry = process.argv[1] ? resolve(process.argv[1]) : "";
    return Boolean(entry && import.meta.url === `file://${entry}`);
}
if (isMain()) {
    collectAaibReports()
        .then((snap) => {
        console.log(JSON.stringify({
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
                registration: c.registration,
                aircraft: c.aircraft,
                date: c.date,
                bodyChars: c.body.length,
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
//# sourceMappingURL=aaib-reports.js.map