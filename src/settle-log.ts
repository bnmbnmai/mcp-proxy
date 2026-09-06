/**
 * Path-level x402 settle journal for the ticks shop.
 *
 * One JSONL line per verified facilitator / local EIP-3009 settle success.
 * Skip-settle test 200s are not journaled. Not a SKU. Not a public URL.
 *
 * Does not log X-PAYMENT payloads, facilitator JWTs, settle key files,
 * letter/table bodies, or private keys. Payer is the EIP-3009 `from`
 * address when present — never a key.
 */
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { dirname, resolve } from "node:path";

export const DEFAULT_SETTLE_LOG_PATH = "data/settle.jsonl";
export const SINGLE_DOC_AMOUNT_ATOMIC = "20000";
export const PAGE_AMOUNT_ATOMIC = "50000";
export const PAYER_MAX = 42;
export const TX_MAX = 66;
export const PATH_MAX = 200;
export const REQUEST_ID_MAX = 80;

export type SettleSource = "live" | "access-log" | "shop-request-log";

export type SettleEvent = {
  ts: string;
  path: string;
  amountAtomic: string;
  requestId: string;
  payer?: string;
  txHash?: string;
  source?: SettleSource;
};

export type SettlePathRollup = {
  path: string;
  count: number;
  amountAtomic: string;
  amountUsdc: string;
  firstTs: string;
  lastTs: string;
  payerCount: number;
  txCount: number;
};

export type SettleMetrics = {
  log: string;
  eventCount: number;
  pathCount: number;
  amountAtomic: string;
  amountUsdc: string;
  firstTs: string | null;
  lastTs: string | null;
  byPath: SettlePathRollup[];
};

const FREE_PATHS = new Set([
  "/",
  "/sample",
  "/firm-check",
  "/openapi.json",
  "/llms.txt",
  "/mcp",
  "/.well-known/x402",
  "/.well-known/x402list.txt",
  "/x402list.txt",
  "/shop-request-log",
  "/manifest.json",
]);

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function settleLogEnabled(): boolean {
  return env("SETTLE_LOG", "1") !== "0";
}

export function settleLogPath(): string {
  return resolve(env("SETTLE_LOG_PATH", DEFAULT_SETTLE_LOG_PATH));
}

export function truncateField(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

function headerValue(req: IncomingMessage, name: string): string {
  const raw = req.headers[name];
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return "";
}

export function isWalletAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function isTxHash(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function decodePaymentObject(payment: string): Record<string, unknown> | null {
  return tryParseJsonObject(payment) ?? tryParseJsonObject(Buffer.from(payment, "base64").toString("utf8"));
}

function walkFrom(value: unknown, depth = 0): string | undefined {
  if (depth > 4 || !value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const obj = value as Record<string, unknown>;
  const direct = obj.from;
  if (typeof direct === "string" && isWalletAddress(direct)) return direct;
  const auth = obj.authorization;
  if (auth && typeof auth === "object" && !Array.isArray(auth)) {
    const fromAuth = (auth as Record<string, unknown>).from;
    if (typeof fromAuth === "string" && isWalletAddress(fromAuth)) return fromAuth;
  }
  if (obj.payload && typeof obj.payload === "object") {
    const nested = walkFrom(obj.payload, depth + 1);
    if (nested) return nested;
  }
  return undefined;
}

/** EIP-3009 `from` only. Never returns the payment payload. */
export function payerFromPayment(payment: string | null | undefined): string | undefined {
  if (!payment?.trim()) return undefined;
  const decoded = decodePaymentObject(payment.trim());
  if (!decoded) return undefined;
  return walkFrom(decoded);
}

export function txHashFromSettleBody(body: Record<string, unknown> | null | undefined): string | undefined {
  if (!body) return undefined;
  for (const key of ["transaction", "txHash", "tx", "transactionHash"]) {
    const value = body[key];
    if (typeof value === "string" && isTxHash(value)) return value;
  }
  return undefined;
}

export function requestIdFromReq(req: IncomingMessage): string {
  const cf = headerValue(req, "cf-ray");
  if (cf) return truncateField(cf, REQUEST_ID_MAX);
  const rid = headerValue(req, "x-request-id");
  if (rid) return truncateField(rid, REQUEST_ID_MAX);
  return `s-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

export function resourcePathOf(raw: string): string {
  const value = raw.trim();
  if (!value) return "/";
  try {
    const path = value.startsWith("/") ? value.split("?")[0] ?? value : new URL(value, "https://ticks.bnm.farm").pathname;
    return (path.replace(/\/+$/, "") || "/") as string;
  } catch {
    const path = value.split("?")[0] ?? value;
    return path.replace(/\/+$/, "") || "/";
  }
}

export function isFreeShopPath(path: string): boolean {
  const clean = resourcePathOf(path);
  if (FREE_PATHS.has(clean)) return true;
  if (clean.endsWith("/manifest.json") || clean.endsWith("/index")) return true;
  return false;
}

export function isPaidShopPath(path: string): boolean {
  const clean = resourcePathOf(path);
  if (isFreeShopPath(clean)) return false;
  return /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean);
}

const PAGE_ONLY_PATHS = new Set([
  "/ticks",
  "/import-alerts",
  "/mariners",
  "/mariners-d11",
  "/mariners-d7",
  "/mariners-d8",
]);

export function amountAtomicFromQuery(path: string, search = ""): string {
  const clean = resourcePathOf(path);
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (params.get("id")?.trim() && isPaidShopPath(clean) && !PAGE_ONLY_PATHS.has(clean)) {
    return SINGLE_DOC_AMOUNT_ATOMIC;
  }
  return PAGE_AMOUNT_ATOMIC;
}

export function sanitizeSettleEvent(
  input: Partial<SettleEvent> & Pick<SettleEvent, "path" | "amountAtomic">,
): SettleEvent {
  const amount = String(input.amountAtomic ?? "").replace(/[^\d]/g, "");
  const event: SettleEvent = {
    ts: typeof input.ts === "string" && input.ts ? input.ts : new Date().toISOString(),
    path: truncateField(resourcePathOf(String(input.path || "/")), PATH_MAX),
    amountAtomic: amount || "0",
    requestId: truncateField(String(input.requestId || `s-${Date.now().toString(36)}`), REQUEST_ID_MAX),
  };
  if (typeof input.payer === "string" && isWalletAddress(input.payer)) {
    event.payer = truncateField(input.payer, PAYER_MAX);
  }
  if (typeof input.txHash === "string" && isTxHash(input.txHash)) {
    event.txHash = truncateField(input.txHash, TX_MAX);
  }
  if (input.source === "live" || input.source === "access-log" || input.source === "shop-request-log") {
    event.source = input.source;
  }
  return event;
}

export function appendSettleEvent(event: SettleEvent, filePath = settleLogPath()): void {
  if (!settleLogEnabled()) return;
  const line = JSON.stringify(sanitizeSettleEvent(event));
  mkdirSync(dirname(filePath), { recursive: true });
  appendFileSync(filePath, `${line}\n`, "utf8");
}

export function logPaidSettle(
  req: IncomingMessage,
  fields: {
    path: string;
    amountAtomic: string;
    payment?: string | null;
    txHash?: string;
    requestId?: string;
    ts?: string;
  },
): void {
  try {
    appendSettleEvent(
      sanitizeSettleEvent({
        ts: fields.ts,
        path: fields.path,
        amountAtomic: fields.amountAtomic,
        requestId: fields.requestId ?? requestIdFromReq(req),
        payer: payerFromPayment(fields.payment),
        txHash: fields.txHash,
        source: "live",
      }),
    );
  } catch {
    // Journal must never break the 200 / 402 path.
  }
}

export function parseSettleLog(text: string): SettleEvent[] {
  const events: SettleEvent[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const raw = JSON.parse(trimmed) as Partial<SettleEvent>;
      if (!raw || typeof raw.path !== "string" || raw.amountAtomic == null) continue;
      events.push(
        sanitizeSettleEvent({
          ...raw,
          path: raw.path,
          amountAtomic: String(raw.amountAtomic),
        }),
      );
    } catch {
      // skip a corrupt line
    }
  }
  return events;
}

export function readSettleLog(filePath = settleLogPath()): SettleEvent[] {
  try {
    return parseSettleLog(readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

export function atomicToUsdc(atomic: string): string {
  const n = BigInt(atomic || "0");
  const whole = n / 1_000_000n;
  const frac = n % 1_000_000n;
  return `${whole}.${frac.toString().padStart(6, "0")}`;
}

export function summarizeSettles(events: SettleEvent[], log = settleLogPath()): SettleMetrics {
  const byPath = new Map<
    string,
    { count: number; atomic: bigint; firstTs: string; lastTs: string; payers: Set<string>; txes: Set<string> }
  >();
  let total = 0n;
  let firstTs: string | null = null;
  let lastTs: string | null = null;

  const ordered = [...events].sort((a, b) => a.ts.localeCompare(b.ts));
  for (const event of ordered) {
    const atomic = BigInt(event.amountAtomic || "0");
    total += atomic;
    if (!firstTs || event.ts < firstTs) firstTs = event.ts;
    if (!lastTs || event.ts > lastTs) lastTs = event.ts;
    let bucket = byPath.get(event.path);
    if (!bucket) {
      bucket = { count: 0, atomic: 0n, firstTs: event.ts, lastTs: event.ts, payers: new Set(), txes: new Set() };
      byPath.set(event.path, bucket);
    }
    bucket.count += 1;
    bucket.atomic += atomic;
    if (event.ts < bucket.firstTs) bucket.firstTs = event.ts;
    if (event.ts > bucket.lastTs) bucket.lastTs = event.ts;
    if (event.payer) bucket.payers.add(event.payer.toLowerCase());
    if (event.txHash) bucket.txes.add(event.txHash.toLowerCase());
  }

  const rows = [...byPath.entries()]
    .map(([path, bucket]) => ({
      path,
      count: bucket.count,
      amountAtomic: bucket.atomic.toString(),
      amountUsdc: atomicToUsdc(bucket.atomic.toString()),
      firstTs: bucket.firstTs,
      lastTs: bucket.lastTs,
      payerCount: bucket.payers.size,
      txCount: bucket.txes.size,
    }))
    .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path));

  return {
    log,
    eventCount: events.length,
    pathCount: rows.length,
    amountAtomic: total.toString(),
    amountUsdc: atomicToUsdc(total.toString()),
    firstTs,
    lastTs,
    byPath: rows,
  };
}

function caddyTs(value: unknown): string {
  if (typeof value === "string" && value) {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && asNum > 1_000_000_000) {
      return new Date(asNum > 1e12 ? asNum : asNum * 1000).toISOString();
    }
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value > 1e12 ? value : value * 1000).toISOString();
  }
  return new Date().toISOString();
}

function headerMapValue(headers: unknown, name: string): string {
  if (!headers || typeof headers !== "object") return "";
  const rec = headers as Record<string, unknown>;
  const want = name.toLowerCase();
  for (const [key, raw] of Object.entries(rec)) {
    if (key.toLowerCase() !== want) continue;
    if (typeof raw === "string") return raw.trim();
    if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  }
  return "";
}

const COMBINED_RE =
  /\[([^\]]+)\]\s+"(\w+)\s+(\S+)\s+[^"]+"\s+(\d{3})/;

function parseCombinedLine(line: string): { ts: string; method: string; uri: string; status: number } | null {
  const m = line.match(COMBINED_RE);
  if (!m) return null;
  const tsRaw = m[1] ?? "";
  const normalized = tsRaw.replace(/:/, " ").replace(/\//g, " ");
  const parsed = Date.parse(normalized);
  return {
    ts: Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString(),
    method: (m[2] ?? "GET").toUpperCase(),
    uri: m[3] ?? "/",
    status: Number(m[4]),
  };
}

export function settleEventFromAccessRecord(raw: unknown): SettleEvent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;

  if (rec.kind === "paid-door" && Number(rec.status) === 200 && rec.paymentHeader === true && typeof rec.path === "string") {
    const path = resourcePathOf(rec.path);
    if (!isPaidShopPath(path)) return null;
    const id = typeof rec.id === "string" ? rec.id : "";
    return sanitizeSettleEvent({
      ts: typeof rec.ts === "string" ? rec.ts : new Date().toISOString(),
      path,
      amountAtomic: amountAtomicFromQuery(path, id ? `id=${id}` : ""),
      requestId: typeof rec.ts === "string" ? `shop-req-${rec.ts}` : `shop-req-${Date.now()}`,
      source: "shop-request-log",
    });
  }

  const request = rec.request && typeof rec.request === "object" ? (rec.request as Record<string, unknown>) : null;
  const method = String(request?.method ?? rec.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "POST") return null;
  const status = Number(rec.status ?? rec.statusCode);
  if (status !== 200) return null;
  const uri = String(request?.uri ?? rec.uri ?? rec.url ?? rec.path ?? "");
  if (!uri) return null;
  let parsed: URL;
  try {
    parsed = new URL(uri, "https://ticks.bnm.farm");
  } catch {
    return null;
  }
  const path = resourcePathOf(parsed.pathname);
  if (!isPaidShopPath(path)) return null;
  const headers = request?.headers ?? rec.headers;
  const paidHeader =
    headerMapValue(headers, "x-payment") || headerMapValue(headers, "payment-signature");
  if (!paidHeader) return null;
  const requestId = headerMapValue(headers, "cf-ray") || headerMapValue(headers, "x-request-id") || `access-${caddyTs(rec.ts)}`;
  return sanitizeSettleEvent({
    ts: caddyTs(rec.ts),
    path,
    amountAtomic: amountAtomicFromQuery(path, parsed.search),
    requestId,
    source: "access-log",
  });
}

export function parseAccessLog(text: string): SettleEvent[] {
  const events: SettleEvent[] = [];
  const seen = new Set<string>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let event: SettleEvent | null = null;
    if (trimmed.startsWith("{")) {
      try {
        event = settleEventFromAccessRecord(JSON.parse(trimmed));
      } catch {
        event = null;
      }
    } else {
      // Combined logs cannot prove X-PAYMENT. Apollo ticks Caddy has no access file.
      event = null;
    }
    if (!event) continue;
    const key = `${event.ts}|${event.path}|${event.requestId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push(event);
  }
  return events;
}

export function backfillSettlesFromAccessLog(
  text: string,
  filePath = settleLogPath(),
): { scanned: number; wrote: number; skipped: number; log: string } {
  const incoming = parseAccessLog(text);
  const existing = readSettleLog(filePath);
  const seen = new Set(existing.map((e) => `${e.ts}|${e.path}|${e.requestId}`));
  let wrote = 0;
  for (const event of incoming) {
    const key = `${event.ts}|${event.path}|${event.requestId}`;
    if (seen.has(key)) continue;
    appendSettleEvent(event, filePath);
    seen.add(key);
    wrote += 1;
  }
  return { scanned: incoming.length, wrote, skipped: incoming.length - wrote, log: filePath };
}

function printMetrics(metrics: SettleMetrics): void {
  process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  const args = process.argv.slice(2);
  const backfillAt = args.indexOf("--backfill");
  if (backfillAt >= 0) {
    const files = args.slice(backfillAt + 1).filter((a) => a && !a.startsWith("-"));
    if (files.length === 0) {
      process.stderr.write(
        "best-effort backfill: pass Caddy JSON / combined access logs or shop-request-log.jsonl\n" +
          "usage: node build/settle-log.js --backfill /var/log/caddy/access.log [more.jsonl]\n",
      );
      process.exit(2);
    }
    const results = [];
    for (const file of files) {
      let text = "";
      try {
        text = readFileSync(file, "utf8");
      } catch (err) {
        process.stderr.write(`skip unreadable ${file}: ${err instanceof Error ? err.message : String(err)}\n`);
        continue;
      }
      results.push({ file, ...backfillSettlesFromAccessLog(text) });
    }
    process.stdout.write(
      `${JSON.stringify({ bestEffort: true, note: "access-log backfill cannot recover payer or tx hash", results }, null, 2)}\n`,
    );
  } else {
    const filePath = args[0] && !args[0].startsWith("-") ? resolve(args[0]) : settleLogPath();
    printMetrics(summarizeSettles(readSettleLog(filePath), filePath));
  }
}
