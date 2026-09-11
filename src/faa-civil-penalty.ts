#!/usr/bin/env node
/**
 * FAA DRS Civil Penalty Appeals Administrator Final Order / Decision & Order TEXT door.
 * Official PDFs from the DRS CIVIL_PENALTY_APPEALS browse (14 CFR §13.233).
 * 17 U.S.C. § 105.
 * Guest browse session → POST metadatas list → GET /api/content/reports/{guid} PDF.
 * Bare GET without guest session is often 403 (leak-clean, not a free dump).
 * Prefer substantive Order / Decision PDFs. Skip NMS/ASIAS JSON and APHIS AIR twins
 * (live /air-letters). Not /air-letters.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { paidBodyCatalogNote } from "./paid-records.js";

export const FAA_CIVIL_PENALTY_PATH = "/faa-civil-penalty";
export const FAA_CIVIL_PENALTY_MANIFEST_PATH = "/faa-civil-penalty/manifest.json";
export const FAA_CIVIL_PENALTY_AMOUNT_ATOMIC = "50000";
export const FAA_CIVIL_PENALTY_ONE_AMOUNT_ATOMIC = "20000";
export const PRODUCT_ID = "faa-civil-penalty-order-bodies";
export const PRODUCT_NAME = "FAA Civil Penalty Appeals Administrator Order text";

export const DRS_ORIGIN = "https://drs.faa.gov";
export const DOCTYPE = "CIVIL_PENALTY_APPEALS";
export const LISTING_URL = `${DRS_ORIGIN}/browse/${DOCTYPE}/doctypeDetails`;
export const GUEST_LOGIN_URL = `${DRS_ORIGIN}/guest/login?targetUrl=/browse/${DOCTYPE}/doctypeDetails`;
export const METADATAS_URL = `${DRS_ORIGIN}/api/browse/doctype/${DOCTYPE}/documents/metadatas`;
export const HUB_URL =
  "https://www.faa.gov/about/office_org/headquarters_offices/agc/practice_areas/adjudication/civil_penalty";
export const LICENSE = "17 USC 105";
export const ATTRIBUTION =
  "Federal Aviation Administration, Civil Penalty Appeals. Work of the United States Government; 17 U.S.C. § 105.";
export const PAY_TO = "0xf59621FC406D266e18f314Ae18eF0a33b8401004";
export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ORDER_NO_RE = /^(?:FAA[- ])?(\d{4}-\d{2})$/i;
export const DOCKET_RE = /\b(G\d{2}-\d{2}-\d{3})\b/i;

export const LEAHEY_GUID = "df4fc23a-5ec0-4c54-893d-3fff1e63de03";
export const BENNETT_GUID = "6986fda5-f01d-48b5-8ad0-8cd81754bed3";

export const CARD_FIELDS = [
  "id",
  "orderNo",
  "institution",
  "docket",
  "kind",
  "date",
  "served",
  "issued",
  "title",
  "subjects",
  "guid",
  "sourceUrl",
  "body",
] as const;

export const BODY_NEEDLE_SEED = "ORDER GRANTING MOTION FOR LEAVE TO FILE AMICUS";
export const BODY_NEEDLE_JUDGE = "Diana R. Rabinowitz";

export type FaaCivilPenaltyKind = "Administrator Order" | "Decision and Order";

export type FaaCivilPenaltyListing = {
  id: string;
  orderNo: string;
  institution: string;
  docket: string;
  kind: FaaCivilPenaltyKind;
  date: string | null;
  served: string | null;
  issued: string | null;
  title: string;
  subjects: string;
  guid: string;
  mimeType: string;
  sourceUrl: string;
};

export type FaaCivilPenaltyCard = FaaCivilPenaltyListing & { body: string };

export type FaaCivilPenaltySnapshot = {
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
  sources: { listing: string; hub: string; pdfHost: string };
  cards: FaaCivilPenaltyCard[];
};

type DrsSession = { jwt: string; user: string };

type MetaField = { metadataName?: string; metadataValue?: string };

const HTTP_UA = "BNM-farm-faa-civil-penalty/0.1 (+https://ticks.bnm.farm/faa-civil-penalty)";

export const SEED_LISTINGS: FaaCivilPenaltyListing[] = [
  {
    id: "2026-04",
    orderNo: "2026-04",
    institution: "Matter of Michael Leahey",
    docket: "G13-22-040",
    kind: "Administrator Order",
    date: "2026-07-02",
    served: "2026-07-02",
    issued: null,
    title: "Amicus Curiae Briefs",
    subjects: "Amicus Curiae Briefs",
    guid: LEAHEY_GUID,
    mimeType: "application/pdf",
    sourceUrl: LISTING_URL,
  },
  {
    id: "2026-03",
    orderNo: "2026-03",
    institution: "Matter of Michael Bennett",
    docket: "",
    kind: "Administrator Order",
    date: "2026-06-11",
    served: "2026-05-06",
    issued: "2026-06-11",
    title: "Appeals - Failure to File Notice of Appeal | Appeals - Timeliness of Notice of Appeal",
    subjects: "Appeals - Failure to File Notice of Appeal | Appeals - Timeliness of Notice of Appeal",
    guid: BENNETT_GUID,
    mimeType: "application/pdf",
    sourceUrl: LISTING_URL,
  },
];

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function faaCivilPenaltyDir(): string {
  if (env("FAA_CIVIL_PENALTY_DIR")) return resolve(env("FAA_CIVIL_PENALTY_DIR"));
  return resolve(join(homedir(), "projects/mcp-proxy/data/faa-civil-penalty"));
}

export function snapshotPath(): string {
  return join(faaCivilPenaltyDir(), "snapshot.json");
}

export function officialPdfUrl(guid: string): string {
  return `${DRS_ORIGIN}/api/content/reports/${guid}`;
}

export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return null;
}

export function catalogId(orderNo: string, guid: string): string {
  const hit = orderNo.trim().match(ORDER_NO_RE);
  if (hit) return orderNo.trim();
  return guid.slice(0, 8).toLowerCase();
}

export function parseKind(raw: string): FaaCivilPenaltyKind {
  if (/decision\s+and\s+order/i.test(raw)) return "Decision and Order";
  return "Administrator Order";
}

function metaVal(fields: MetaField[] | undefined, name: string): string {
  const hit = (fields ?? []).find((f) => (f.metadataName ?? "").trim() === name);
  return (hit?.metadataValue ?? "").trim();
}

export function isNmsAsiasJson(text: string): boolean {
  const compact = text.trim();
  if (!compact.startsWith("{") && !compact.startsWith("[")) return false;
  return /"NMS"\s*:/.test(text) || /"ASIAS"\s*:/.test(text);
}

export function isAirLetterTwin(text: string): boolean {
  return (
    /ANIMAL AND PLANT HEALTH INSPECTION SERVICE/i.test(text) ||
    /\bAIR letter\b/i.test(text) ||
    /\d{2}-\d{3}-\d{2}air/i.test(text)
  );
}

export function keepListing(row: Pick<FaaCivilPenaltyListing, "orderNo" | "mimeType" | "title" | "subjects" | "guid">): boolean {
  if (row.mimeType && !/pdf/i.test(row.mimeType)) return false;
  if (!GUID_RE.test(row.guid)) return false;
  if (!ORDER_NO_RE.test(row.orderNo.trim())) return false;
  const hay = `${row.title} ${row.subjects} ${row.orderNo}`;
  if (/\bNMS\b|\bASIAS\b/i.test(hay)) return false;
  return true;
}

export function isRealFaaCivilPenaltyBody(text: string): boolean {
  if (isNmsAsiasJson(text) || isAirLetterTwin(text)) return false;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 400) return false;
  const faa = /FEDERAL AVIATION ADMINISTRATION|FAA Order No\.?/i.test(text);
  const order =
    /ORDER GRANTING|ORDER DENYING|DECISION AND ORDER|CIVIL PENALTY|Administrator/i.test(text);
  return faa && order;
}

export function parseMetadatasJson(raw: unknown): {
  listed: FaaCivilPenaltyListing[];
  listedCount: number;
} {
  if (!raw || typeof raw !== "object") return { listed: [], listedCount: 0 };
  const obj = raw as { documentListTotalCount?: unknown; documentList?: unknown };
  const docs = Array.isArray(obj.documentList) ? obj.documentList : [];
  const listed: FaaCivilPenaltyListing[] = [];
  const seen = new Set<string>();
  for (const item of docs) {
    if (!item || typeof item !== "object") continue;
    const d = item as {
      id?: unknown;
      mimeType?: unknown;
      headerLink?: MetaField;
      description?: MetaField[];
      subText?: MetaField[];
    };
    const guid = String(d.id ?? "").trim();
    const orderNo = String(d.headerLink?.metadataValue ?? "").trim();
    const institution = metaVal(d.subText, "Case Name") || orderNo;
    const docket = metaVal(d.subText, "Docket Number") || docketFromText(institution);
    const served = isoDate(metaVal(d.subText, "Served Date"));
    const issued = isoDate(metaVal(d.subText, "Issue Date"));
    const subjects = (d.description ?? [])
      .map((f) => (f.metadataValue ?? "").trim())
      .filter(Boolean)
      .join(" | ");
    const mimeType = String(d.mimeType ?? "").trim();
    const title = subjects.split("|")[0]?.trim() || institution;
    const row: FaaCivilPenaltyListing = {
      id: catalogId(orderNo, guid),
      orderNo,
      institution,
      docket,
      kind: parseKind(`${title} ${subjects}`),
      date: issued || served,
      served,
      issued,
      title,
      subjects,
      guid,
      mimeType,
      sourceUrl: LISTING_URL,
    };
    if (!keepListing(row)) continue;
    if (seen.has(row.id) || seen.has(row.guid)) continue;
    seen.add(row.id);
    seen.add(row.guid);
    listed.push(row);
  }
  listed.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  const listedCount =
    typeof obj.documentListTotalCount === "number" && Number.isFinite(obj.documentListTotalCount)
      ? obj.documentListTotalCount
      : listed.length;
  return { listed, listedCount };
}

export function docketFromText(raw: string): string {
  return raw.match(DOCKET_RE)?.[1]?.toUpperCase() ?? "";
}

export function parseFaaCivilPenaltyText(
  text: string,
  meta: Partial<FaaCivilPenaltyListing> & { guid: string; sourceUrl: string },
): FaaCivilPenaltyCard {
  const body = text.replace(/\f/g, "\n").trim();
  const orderFromBody = body.match(/FAA Order No\.?\s*((?:FAA[- ])?\d{4}-\d{2})/i)?.[1];
  const orderNo = (meta.orderNo || orderFromBody || "").trim();
  const guid = meta.guid;
  const served = meta.served ?? isoDate(body.slice(0, 2500));
  const issued = meta.issued ?? null;
  return {
    id: meta.id || catalogId(orderNo, guid),
    orderNo: orderNo || catalogId("", guid),
    institution: (meta.institution && meta.institution.trim()) || orderNo || guid,
    docket: (meta.docket && meta.docket.trim()) || docketFromText(body),
    kind: meta.kind || parseKind(`${meta.title ?? ""} ${meta.subjects ?? ""} ${body.slice(0, 1500)}`),
    date: meta.date ?? issued ?? served,
    served,
    issued,
    title: (meta.title && meta.title.trim()) || (meta.subjects && meta.subjects.trim()) || `FAA Order ${orderNo}`,
    subjects: meta.subjects || "",
    guid,
    mimeType: meta.mimeType || "application/pdf",
    sourceUrl: meta.sourceUrl || LISTING_URL,
    body,
  };
}

function emptySources(): FaaCivilPenaltySnapshot["sources"] {
  return { listing: LISTING_URL, hub: HUB_URL, pdfHost: `${DRS_ORIGIN}/api/content/reports/` };
}

export function emptyFaaCivilPenaltySnapshot(reason: string): FaaCivilPenaltySnapshot {
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

export function assembleFaaCivilPenaltySnapshot(
  cards: FaaCivilPenaltyCard[],
  fetchedAt?: string,
): FaaCivilPenaltySnapshot {
  const kept = cards.filter((c) => isRealFaaCivilPenaltyBody(c.body) && keepListing(c));
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
    reason: kept.length ? null : "Official FAA Civil Penalty Appeals PDFs had no extractable Order text.",
    fetchedAt: fetchedAt || new Date().toISOString(),
    asOf,
    license: LICENSE,
    attribution: ATTRIBUTION,
    sources: emptySources(),
    cards: kept,
  };
}

function parseSnapshotFile(raw: unknown): FaaCivilPenaltySnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as FaaCivilPenaltySnapshot;
  if (snap.product !== PRODUCT_ID || !Array.isArray(snap.cards)) return null;
  return assembleFaaCivilPenaltySnapshot(
    snap.cards,
    typeof snap.fetchedAt === "string" ? snap.fetchedAt : undefined,
  );
}

export function readFaaCivilPenaltySnapshot(): FaaCivilPenaltySnapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

export function writeFaaCivilPenaltySnapshot(snap: FaaCivilPenaltySnapshot): void {
  const path = snapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
}

function cookiesFromResponse(res: Response): Record<string, string> {
  const raw =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : res.headers.get("set-cookie")
        ? [res.headers.get("set-cookie") as string]
        : [];
  const out: Record<string, string> = {};
  for (const line of raw) {
    const pair = line.split(";")[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return out;
}

function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

export async function openDrsGuestSession(): Promise<DrsSession> {
  const res = await fetch(GUEST_LOGIN_URL, {
    method: "GET",
    redirect: "manual",
    headers: { "User-Agent": HTTP_UA, Accept: "text/html,application/xhtml+xml" },
  });
  let cookies = cookiesFromResponse(res);
  if (!cookies.jwt) {
    const loc = res.headers.get("location");
    if (loc) {
      const follow = await fetch(new URL(loc, DRS_ORIGIN), {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": HTTP_UA,
          Cookie: cookieHeader(cookies),
        },
      });
      cookies = { ...cookies, ...cookiesFromResponse(follow) };
    }
  }
  const jwt = cookies.jwt ?? "";
  if (!jwt) throw new Error("DRS guest login did not set jwt (bare PDF GET is 403 without a guest session)");
  return { jwt, user: cookies.user || "G" };
}

function sessionHeaders(session: DrsSession): Record<string, string> {
  return {
    "User-Agent": HTTP_UA,
    jwt: session.jwt,
    user: session.user,
    Cookie: `jwt=${session.jwt}; user=${session.user}`,
  };
}

export async function fetchDrsMetadatas(session: DrsSession): Promise<unknown> {
  const res = await fetch(METADATAS_URL, {
    method: "POST",
    headers: {
      ...sessionHeaders(session),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: "{}",
  });
  if (!res.ok) throw new Error(`${METADATAS_URL} HTTP ${res.status}`);
  return await res.json();
}

export async function fetchDrsPdfBytes(guid: string, session: DrsSession): Promise<Uint8Array> {
  if (!GUID_RE.test(guid)) throw new Error(`invalid DRS guid ${guid}`);
  const url = officialPdfUrl(guid);
  const res = await fetch(url, {
    headers: { ...sessionHeaders(session), Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${url} is not an official PDF`);
  return bytes;
}

export function pdfToText(pdfPath: string): string {
  const helper = env("FAA_CIVIL_PENALTY_PDFTOTEXT") || "pdftotext";
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
  return env("FAA_CIVIL_PENALTY_HTML_DIR") || env("FAA_CIVIL_PENALTY_LISTING_DIR");
}

function firstSliceLimit(): number {
  const n = Number(env("FAA_CIVIL_PENALTY_LIMIT", "4"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 4;
}

function maxFetchLimit(): number {
  const n = Number(env("FAA_CIVIL_PENALTY_MAX_FETCH", "8"));
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

function mergeListings(listed: FaaCivilPenaltyListing[]): FaaCivilPenaltyListing[] {
  const seen = new Set<string>();
  const out: FaaCivilPenaltyListing[] = [];
  for (const row of [...SEED_LISTINGS, ...listed]) {
    if (!keepListing(row)) continue;
    const id = row.id || catalogId(row.orderNo, row.guid);
    if (!id || seen.has(id) || seen.has(row.guid)) continue;
    seen.add(id);
    seen.add(row.guid);
    out.push({ ...row, id });
  }
  out.sort((a, b) => `${b.date ?? ""}${b.id}`.localeCompare(`${a.date ?? ""}${a.id}`));
  return out;
}

async function loadOfficialListings(
  dir: string,
): Promise<{ listed: FaaCivilPenaltyListing[]; listedCount: number; session: DrsSession | null }> {
  if (dir) {
    const raw = readNamedFile(dir, ["metadatas.json", "metadatas-excerpt.json"]);
    const parsed = raw ? parseMetadatasJson(JSON.parse(raw)) : { listed: [], listedCount: 0 };
    return { listed: mergeListings(parsed.listed), listedCount: parsed.listedCount || parsed.listed.length, session: null };
  }
  try {
    const session = await openDrsGuestSession();
    const parsed = parseMetadatasJson(await fetchDrsMetadatas(session));
    if (parsed.listed.length > 0) {
      return { listed: mergeListings(parsed.listed), listedCount: parsed.listedCount, session };
    }
    return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length, session };
  } catch {
    return { listed: [...SEED_LISTINGS], listedCount: SEED_LISTINGS.length, session: null };
  }
}

export async function collectFaaCivilPenalty(opts?: {
  htmlDir?: string;
  limit?: number;
  maxFetch?: number;
}): Promise<FaaCivilPenaltySnapshot> {
  const dir = opts?.htmlDir ?? listingDir();
  const { listed: allListed, listedCount, session: opened } = await loadOfficialListings(dir);
  const target = opts?.limit ?? firstSliceLimit();
  const fetchCap = opts?.maxFetch ?? (dir ? 0 : maxFetchLimit());
  const cacheDir = faaCivilPenaltyDir();
  mkdirSync(cacheDir, { recursive: true });
  const prior = new Map<string, FaaCivilPenaltyCard>();
  for (const card of readFaaCivilPenaltySnapshot()?.cards ?? []) {
    if (isRealFaaCivilPenaltyBody(card.body) && keepListing(card)) prior.set(card.id, card);
  }
  let session = opened;
  const cards: FaaCivilPenaltyCard[] = [];
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
        `${row.orderNo}.txt`,
        `${row.guid}.txt`,
      ]);
      if (dir && !localText && !SEED_LISTINGS.some((s) => s.id === row.id)) {
        skippedNoText += 1;
        continue;
      }
      const text =
        localText ??
        (await (async () => {
          if (!session) session = await openDrsGuestSession();
          const pdfFile = join(cacheDir, `${row.id.replace(/[^\w.-]+/g, "_")}.pdf`);
          if (!existsSync(pdfFile)) {
            writeFileSync(pdfFile, await fetchDrsPdfBytes(row.guid, session));
            fetchedPdfs += 1;
          } else {
            fetchedPdfs += 1;
          }
          return pdfToText(pdfFile);
        })());
      const parsed = parseFaaCivilPenaltyText(text, {
        ...row,
        sourceUrl: row.sourceUrl || LISTING_URL,
        guid: row.guid,
      });
      if (!isRealFaaCivilPenaltyBody(parsed.body) || !keepListing(parsed)) {
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
    ...assembleFaaCivilPenaltySnapshot(cards),
    listedCount,
    fetchedPdfs,
    skippedNoText,
    reused,
    addedThisRun,
  };
  writeFaaCivilPenaltySnapshot(snap);
  return snap;
}

export async function loadFaaCivilPenalty(): Promise<FaaCivilPenaltySnapshot> {
  const cached = readFaaCivilPenaltySnapshot();
  if (cached && cached.cards.some((c) => isRealFaaCivilPenaltyBody(c.body))) return cached;
  try {
    return await collectFaaCivilPenalty();
  } catch (err) {
    if (cached) {
      return {
        ...cached,
        status: "stale",
        reason: `Live FAA Civil Penalty Appeals fetch failed; showing last cache. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return emptyFaaCivilPenaltySnapshot(
      `FAA Civil Penalty Appeals PDFs are not on this host and live fetch failed. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function buildFaaCivilPenaltyManifest(snap: FaaCivilPenaltySnapshot | null): Record<string, unknown> {
  const cards = (snap?.cards ?? []).filter((c) => isRealFaaCivilPenaltyBody(c.body) && keepListing(c));
  return {
    product: PRODUCT_ID,
    name: PRODUCT_NAME,
    free: true,
    note: paidBodyCatalogNote(
      FAA_CIVIL_PENALTY_PATH,
      "Count + order no + case + docket + dates + subjects only. Administrator Order body is the paid GET /faa-civil-penalty payload. This free manifest lists the full catalog. Prefer substantive Order / Decision PDFs (14 CFR §13.233). Skip NMS/ASIAS JSON and APHIS AIR twins. Not /air-letters. DRS guest session is required for the official PDF; bare GET is 403.",
    ),
    license: LICENSE,
    attribution: ATTRIBUTION,
    payTo: PAY_TO,
    network: "base",
    asset: USDC,
    amountAtomic: FAA_CIVIL_PENALTY_AMOUNT_ATOMIC,
    oneAmountAtomic: FAA_CIVIL_PENALTY_ONE_AMOUNT_ATOMIC,
    priceUsdc: "0.05",
    fetchedAt: snap?.fetchedAt ?? null,
    asOf: snap?.asOf ?? null,
    cardCount: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      institution: c.institution,
      orderNo: c.orderNo,
      docket: c.docket,
      kind: c.kind,
      date: c.date,
      served: c.served,
      issued: c.issued,
      title: c.title,
      subjects: c.subjects,
      sourceUrl: c.sourceUrl,
    })),
    schema: {
      fields: [
        "id",
        "institution",
        "orderNo",
        "docket",
        "kind",
        "date",
        "served",
        "issued",
        "title",
        "subjects",
        "sourceUrl",
      ],
    },
    sources: snap?.sources ?? emptySources(),
  };
}

export function filterFaaCivilPenaltyManifest(
  manifest: Record<string, unknown>,
  q?: string,
): Record<string, unknown> {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return manifest;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const matched = cards.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    return ["id", "institution", "orderNo", "docket", "kind", "date", "served", "issued", "title", "subjects"].some(
      (k) =>
        String(row[k] ?? "")
          .toLowerCase()
          .includes(needle),
    );
  });
  return { ...manifest, cardCount: matched.length, cards: matched, q: needle };
}

export async function loadFaaCivilPenaltyManifest(q?: string): Promise<Record<string, unknown> > {
  return filterFaaCivilPenaltyManifest(buildFaaCivilPenaltyManifest(readFaaCivilPenaltySnapshot()), q);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  collectFaaCivilPenalty()
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
              orderNo: c.orderNo,
              docket: c.docket,
              institution: c.institution,
              kind: c.kind,
              date: c.date,
              title: c.title,
              subjects: c.subjects,
              bodyChars: c.body.length,
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
