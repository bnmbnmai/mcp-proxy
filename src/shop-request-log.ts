/**
 * Append-only shop request log for free /firm-check and paid-door traffic.
 * Answers whether an IP searches a lot and never pays for a body (skip-pay).
 *
 * Not a SKU. Not a public URL. Does not log payment payloads, wallets,
 * keys, or letter/table bodies.
 */
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";

export const SHOP_REQUEST_LOG_ROLLUP_PATH = "/shop-request-log";
export const DEFAULT_SHOP_REQUEST_LOG_PATH = "data/shop-request-log.jsonl";
export const Q_MAX = 200;
export const UA_MAX = 200;
export const ID_MAX = 120;
export const HEAVY_SEARCH_MIN_DEFAULT = 5;

export type ShopRequestKind = "firm-check" | "paid-door";

export type ShopRequestLogEvent = {
  ts: string;
  ip: string;
  path: string;
  kind: ShopRequestKind;
  status: number;
  ua: string;
  q?: string;
  matchCount?: number;
  id?: string;
  paymentHeader?: boolean;
};

export type ShopRequestRollup = {
  uniqueIps: number;
  searchCount: number;
  paidDoorCount: number;
  paid200Count: number;
  paidFollowCount: number;
  heavySearchMin: number;
  heavyNeverPaid: Array<{
    ip: string;
    searchCount: number;
    paidDoorCount: number;
    paid200Count: number;
  }>;
};

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function shopRequestLogEnabled(): boolean {
  return env("SHOP_REQUEST_LOG", "1") !== "0";
}

export function shopRequestLogPath(): string {
  return resolve(env("SHOP_REQUEST_LOG_PATH", DEFAULT_SHOP_REQUEST_LOG_PATH));
}

export function heavySearchMin(): number {
  const raw = Number(env("SHOP_REQUEST_HEAVY_SEARCH_MIN", String(HEAVY_SEARCH_MIN_DEFAULT)));
  return Number.isFinite(raw) && raw > 0 ? raw : HEAVY_SEARCH_MIN_DEFAULT;
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

export function firstForwardedIp(value: string): string {
  const part = value.split(",")[0]?.trim() ?? "";
  return part.replace(/^\[|\]$/g, "");
}

export function normalizeIp(value: string | undefined | null): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("::ffff:")) return raw.slice("::ffff:".length);
  return raw;
}

export function isLoopbackAddress(value: string | undefined | null): boolean {
  const ip = normalizeIp(value);
  return ip === "127.0.0.1" || ip === "::1";
}

export function clientIp(req: IncomingMessage): string {
  const cf = firstForwardedIp(headerValue(req, "cf-connecting-ip"));
  if (cf) return normalizeIp(cf);
  const xff = firstForwardedIp(headerValue(req, "x-forwarded-for"));
  if (xff) return normalizeIp(xff);
  return normalizeIp(req.socket?.remoteAddress) || "unknown";
}

export function userAgent(req: IncomingMessage): string {
  return truncateField(headerValue(req, "user-agent"), UA_MAX);
}

export function paymentHeaderPresent(req: IncomingMessage): boolean {
  return Boolean(
    headerValue(req, "x-payment") ||
      headerValue(req, "payment-signature") ||
      headerValue(req, "PAYMENT-SIGNATURE".toLowerCase()),
  );
}

/**
 * Direct local operator only. Public ticks.bnm.farm traffic is proxied
 * onto loopback with CF-Connecting-IP / X-Forwarded-For, so those headers
 * keep this from becoming a public IP dump.
 */
export function isLocalOperator(req: IncomingMessage): boolean {
  if (headerValue(req, "cf-connecting-ip")) return false;
  if (headerValue(req, "x-forwarded-for")) return false;
  return isLoopbackAddress(req.socket?.remoteAddress);
}

export function sanitizeShopRequestLogEvent(
  input: Partial<ShopRequestLogEvent> & Pick<ShopRequestLogEvent, "kind" | "path" | "status">,
): ShopRequestLogEvent {
  const event: ShopRequestLogEvent = {
    ts: typeof input.ts === "string" && input.ts ? input.ts : new Date().toISOString(),
    ip: truncateField(String(input.ip || "unknown"), 80),
    path: truncateField(String(input.path || "/"), 200),
    kind: input.kind === "paid-door" ? "paid-door" : "firm-check",
    status: Number.isFinite(input.status) ? Number(input.status) : 0,
    ua: truncateField(String(input.ua || ""), UA_MAX),
  };
  if (event.kind === "firm-check" && input.q != null) {
    event.q = truncateField(String(input.q), Q_MAX);
  }
  if (event.kind === "firm-check" && typeof input.matchCount === "number" && Number.isFinite(input.matchCount)) {
    event.matchCount = input.matchCount;
  }
  if (event.kind === "paid-door" && input.id) {
    event.id = truncateField(String(input.id), ID_MAX);
  }
  if (event.kind === "paid-door") {
    event.paymentHeader = Boolean(input.paymentHeader);
  }
  return event;
}

export function appendShopRequestLog(event: ShopRequestLogEvent, filePath = shopRequestLogPath()): void {
  if (!shopRequestLogEnabled()) return;
  const line = JSON.stringify(sanitizeShopRequestLogEvent(event));
  mkdirSync(dirname(filePath), { recursive: true });
  appendFileSync(filePath, `${line}\n`, "utf8");
}

export function logShopRequest(
  req: IncomingMessage,
  fields: Omit<ShopRequestLogEvent, "ts" | "ip" | "ua"> & Partial<Pick<ShopRequestLogEvent, "ts" | "ip" | "ua">>,
): void {
  try {
    appendShopRequestLog(
      sanitizeShopRequestLogEvent({
        ...fields,
        ts: fields.ts,
        ip: fields.ip ?? clientIp(req),
        ua: fields.ua ?? userAgent(req),
      }),
    );
  } catch {
    // Logging must never break the 402 / 200 response path.
  }
}

export function parseShopRequestLog(text: string): ShopRequestLogEvent[] {
  const events: ShopRequestLogEvent[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const raw = JSON.parse(trimmed) as Partial<ShopRequestLogEvent>;
      if (!raw || (raw.kind !== "firm-check" && raw.kind !== "paid-door")) continue;
      events.push(
        sanitizeShopRequestLogEvent({
          ...raw,
          kind: raw.kind,
          path: String(raw.path || "/"),
          status: Number(raw.status) || 0,
        }),
      );
    } catch {
      // skip a corrupt line; keep reading
    }
  }
  return events;
}

export function readShopRequestLog(filePath = shopRequestLogPath()): ShopRequestLogEvent[] {
  try {
    return parseShopRequestLog(readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

export function rollupShopRequestLog(
  events: ShopRequestLogEvent[],
  minHeavy = heavySearchMin(),
): ShopRequestRollup {
  type Bucket = {
    searchCount: number;
    paidDoorCount: number;
    paid200Count: number;
    firstSearchTs?: string;
    laterPaid: boolean;
  };
  const byIp = new Map<string, Bucket>();
  const touch = (ip: string): Bucket => {
    let bucket = byIp.get(ip);
    if (!bucket) {
      bucket = { searchCount: 0, paidDoorCount: 0, paid200Count: 0, laterPaid: false };
      byIp.set(ip, bucket);
    }
    return bucket;
  };

  const ordered = [...events].sort((a, b) => a.ts.localeCompare(b.ts));
  for (const event of ordered) {
    const bucket = touch(event.ip);
    if (event.kind === "firm-check") {
      bucket.searchCount += 1;
      if (!bucket.firstSearchTs) bucket.firstSearchTs = event.ts;
      continue;
    }
    bucket.paidDoorCount += 1;
    if (event.status === 200) bucket.paid200Count += 1;
    if (bucket.firstSearchTs && event.ts >= bucket.firstSearchTs) bucket.laterPaid = true;
  }

  const heavyNeverPaid: ShopRequestRollup["heavyNeverPaid"] = [];
  let paidFollowCount = 0;
  for (const [ip, bucket] of byIp) {
    if (bucket.laterPaid) paidFollowCount += 1;
    if (bucket.searchCount >= minHeavy && bucket.paid200Count === 0) {
      heavyNeverPaid.push({
        ip,
        searchCount: bucket.searchCount,
        paidDoorCount: bucket.paidDoorCount,
        paid200Count: bucket.paid200Count,
      });
    }
  }
  heavyNeverPaid.sort((a, b) => b.searchCount - a.searchCount || a.ip.localeCompare(b.ip));

  return {
    uniqueIps: byIp.size,
    searchCount: events.filter((event) => event.kind === "firm-check").length,
    paidDoorCount: events.filter((event) => event.kind === "paid-door").length,
    paid200Count: events.filter((event) => event.kind === "paid-door" && event.status === 200).length,
    paidFollowCount,
    heavySearchMin: minHeavy,
    heavyNeverPaid,
  };
}

export function sendLocalShopRequestRollup(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== "GET") return false;
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path !== SHOP_REQUEST_LOG_ROLLUP_PATH) return false;
  if (!isLocalOperator(req)) return false;
  const body = rollupShopRequestLog(readShopRequestLog());
  const payload = JSON.stringify(body);
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
  return true;
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  const filePath = shopRequestLogPath();
  const rollup = rollupShopRequestLog(readShopRequestLog(filePath));
  process.stdout.write(
    `${JSON.stringify({ log: filePath, ...rollup }, null, 2)}\n`,
  );
}
