/**
 * Draft-only listing of empty / stale LIVE doors.
 *
 * Reads live well-known + free manifests only. Does not invent doors or
 * demand. Writes a local artifact. No outbound email / X / Slack / board ping.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const DEFAULT_LOOP_CLOSER_PATH = "data/live-door-loop-closer.md";
export const DEFAULT_WELL_KNOWN_URL = "https://ticks.bnm.farm/.well-known/x402";
export const DEFAULT_STALE_HOURS = 36;

export type LiveDoorRow = {
  path: string;
  ok: boolean;
  cardCount?: number;
  tickCount?: number;
  letterCount?: number;
  noticeCount?: number;
  bagCount: number | null;
  fetchedAt?: string;
  asOf?: string;
  empty: boolean;
  stale: boolean;
  reason: string;
  draftNote: string;
};

export type LoopCloserReport = {
  scannedAt: string;
  wellKnownUrl: string;
  resourceCount: number;
  empty: LiveDoorRow[];
  stale: LiveDoorRow[];
  failed: { path: string; error: string }[];
  outbound: "none";
};

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function loopCloserPath(): string {
  return resolve(env("LIVE_DOOR_LOOP_CLOSER_PATH", DEFAULT_LOOP_CLOSER_PATH));
}

export function resourcePathFromUrl(raw: string): string {
  try {
    const url = raw.startsWith("/") ? raw : new URL(raw, "https://ticks.bnm.farm").pathname;
    return url.replace(/\/+$/, "") || "/";
  } catch {
    return raw.split("?")[0] || "/";
  }
}

export function bagCountOf(manifest: Record<string, unknown>): number | null {
  for (const key of ["cardCount", "tickCount", "letterCount", "noticeCount", "recordCount"] as const) {
    const value = manifest[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  const cards = manifest.cards;
  if (Array.isArray(cards)) return cards.length;
  return null;
}

export function classifyLiveDoor(
  path: string,
  manifest: Record<string, unknown> | null,
  nowMs = Date.now(),
  staleHours = Number(env("TICKS_COLLECT_STALE_HOURS", String(DEFAULT_STALE_HOURS))) || DEFAULT_STALE_HOURS,
): LiveDoorRow {
  if (!manifest) {
    return {
      path,
      ok: false,
      bagCount: null,
      empty: false,
      stale: false,
      reason: "manifest-unreadable",
      draftNote: "draft only: re-read free manifest after collect; no outbound.",
    };
  }
  const cardCount = typeof manifest.cardCount === "number" ? manifest.cardCount : undefined;
  const tickCount = typeof manifest.tickCount === "number" ? manifest.tickCount : undefined;
  const letterCount = typeof manifest.letterCount === "number" ? manifest.letterCount : undefined;
  const noticeCount = typeof manifest.noticeCount === "number" ? manifest.noticeCount : undefined;
  const bagCount = bagCountOf(manifest);
  const fetchedAt = typeof manifest.fetchedAt === "string" ? manifest.fetchedAt : undefined;
  const asOf = typeof manifest.asOf === "string" ? manifest.asOf : undefined;
  const cards = Array.isArray(manifest.cards) ? manifest.cards : undefined;
  const empty = cardCount === 0 || (cards !== undefined && cards.length === 0 && (tickCount ?? letterCount ?? noticeCount ?? 0) === 0);
  const watermark = fetchedAt || asOf;
  const watermarkMs = watermark ? Date.parse(watermark) : Number.NaN;
  const staleByAge = Number.isFinite(watermarkMs) && nowMs - watermarkMs > staleHours * 3600 * 1000;
  const stale = empty || (!watermark && empty) || staleByAge;
  let reason = "ok";
  if (empty && path === "/ftc-orders") reason = "cardCount-0-awaiting-first-collect";
  else if (empty) reason = "cardCount-0";
  else if (staleByAge) reason = `stale>${staleHours}h`;
  const draftNote =
    path === "/ftc-orders" && empty
      ? "draft only: evening 7:45 America/Boise collect owns the first /ftc-orders bag walk. Do not start a second collect. No outbound send. Lander paste stays in docs/FTC-ORDERS-X402.md until the tv-remote lander PR applies."
      : empty
        ? "draft only: empty live bag. Wait for the scheduled collect. No outbound send."
        : staleByAge
          ? "draft only: bag older than collect stale window. Next scheduled collect owns the refresh. No outbound send."
          : "ok";
  return {
    path,
    ok: true,
    cardCount,
    tickCount,
    letterCount,
    noticeCount,
    bagCount,
    fetchedAt,
    asOf,
    empty,
    stale: Boolean(stale && (empty || staleByAge)),
    reason,
    draftNote,
  };
}

export function paidPathsFromWellKnown(body: unknown): string[] {
  const resources =
    body && typeof body === "object" && Array.isArray((body as { resources?: unknown }).resources)
      ? ((body as { resources: unknown[] }).resources)
      : [];
  const paths: string[] = [];
  for (const raw of resources) {
    const url = typeof raw === "string" ? raw : raw && typeof raw === "object" ? String((raw as { resource?: string }).resource || "") : "";
    const path = resourcePathFromUrl(url);
    if (path.startsWith("/") && path !== "/") paths.push(path);
  }
  return paths;
}

export function manifestUrlFor(path: string, origin = "https://ticks.bnm.farm"): string {
  return path === "/ticks" ? `${origin}/manifest.json` : `${origin}${path}/manifest.json`;
}

export function renderLoopCloserMarkdown(report: LoopCloserReport): string {
  const emptyLines = report.empty.length
    ? report.empty.map((row) => `- \`${row.path}\` ${row.reason} bag=${row.bagCount ?? "n/a"} fetchedAt=${row.fetchedAt ?? "none"} — ${row.draftNote}`)
    : ["- none"];
  const staleLines = report.stale.filter((row) => !row.empty).length
    ? report.stale.filter((row) => !row.empty).map((row) => `- \`${row.path}\` ${row.reason} fetchedAt=${row.fetchedAt ?? "none"} — ${row.draftNote}`)
    : ["- none beyond the empty list"];
  return [
    "# LIVE door loop-closer (draft only)",
    "",
    `Scanned ${report.scannedAt} from \`${report.wellKnownUrl}\` (${report.resourceCount} paid resources).`,
    "No outbound sends. No invented doors. Empty means the free live manifest said so.",
    "",
    "## Empty LIVE doors",
    "",
    ...emptyLines,
    "",
    "## Stale LIVE doors (bag present, watermark older than collect stale window)",
    "",
    ...staleLines,
    "",
    "## Follow-up (draft notes only)",
    "",
    "- Do not SSH apollo from cloud. Evening collect owns bag walks.",
    "- Do not invent demand or a second company.",
    "- `/ftc-orders` lander paste: `docs/FTC-ORDERS-X402.md` (tv-remote live tip, not stub main).",
    `- Outbound: ${report.outbound}.`,
    "",
  ].join("\n");
}

export async function scanLiveDoors(opts?: {
  wellKnownUrl?: string;
  origin?: string;
  nowMs?: number;
  staleHours?: number;
  fetchImpl?: (url: string) => Promise<{ ok: boolean; json?: unknown; error?: string }>;
}): Promise<LoopCloserReport> {
  const wellKnownUrl = opts?.wellKnownUrl ?? env("TICKS_COLLECT_WELL_KNOWN_URL", DEFAULT_WELL_KNOWN_URL);
  const origin = opts?.origin ?? "https://ticks.bnm.farm";
  const nowMs = opts?.nowMs ?? Date.now();
  const staleHours = opts?.staleHours ?? DEFAULT_STALE_HOURS;
  const fetchImpl =
    opts?.fetchImpl ??
    (async (url: string) => {
      try {
        const res = await fetch(url, { headers: { "User-Agent": "bnm-loop-closer-draft-only" } });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true, json: await res.json() };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    });
  const wk = await fetchImpl(wellKnownUrl);
  const paths = wk.ok ? paidPathsFromWellKnown(wk.json) : [];
  const empty: LiveDoorRow[] = [];
  const stale: LiveDoorRow[] = [];
  const failed: { path: string; error: string }[] = [];
  for (const path of paths) {
    const got = await fetchImpl(manifestUrlFor(path, origin));
    if (!got.ok) {
      failed.push({ path, error: got.error || "fetch-failed" });
      continue;
    }
    const row = classifyLiveDoor(
      path,
      got.json && typeof got.json === "object" ? (got.json as Record<string, unknown>) : null,
      nowMs,
      staleHours,
    );
    if (row.empty) empty.push(row);
    if (row.stale) stale.push(row);
  }
  return {
    scannedAt: new Date(nowMs).toISOString(),
    wellKnownUrl,
    resourceCount: paths.length,
    empty,
    stale,
    failed,
    outbound: "none",
  };
}

export function writeLoopCloserReport(report: LoopCloserReport, filePath = loopCloserPath()): string {
  const markdown = renderLoopCloserMarkdown(report);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, markdown, "utf8");
  return markdown;
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  const args = new Set(process.argv.slice(2));
  if (!args.has("--draft-only") && !args.has("--help") && args.size > 0) {
    process.stderr.write("draft-only: pass --draft-only. This helper never sends outbound.\n");
  }
  const report = await scanLiveDoors();
  const markdown = writeLoopCloserReport(report);
  process.stdout.write(markdown);
  process.stdout.write(`\n${JSON.stringify({ empty: report.empty.map((r) => r.path), failed: report.failed, outbound: "none" })}\n`);
}
