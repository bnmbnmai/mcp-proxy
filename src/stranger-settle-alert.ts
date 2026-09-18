/**
 * NEW stranger-settle alert for Chief.
 *
 * Reads the existing settle journal only. Does not invent settles.
 * Payer class: house (HOUSE_PAYERS / optional house-payers file),
 * stranger (wallet present, not house), unknown (no payer — backfill).
 * One-line artifact Chief can ping: `/ticks $0.05 stranger`
 *
 * Not a SKU. Not a public URL. Never writes payer addresses or tx hashes
 * into the alert line.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  atomicToUsdc,
  readSettleLog,
  type SettleEvent,
} from "./settle-log.js";

export const DEFAULT_STRANGER_ALERT_PATH = "data/stranger-settle-alert.txt";
export const DEFAULT_STRANGER_SEEN_PATH = "data/stranger-settle-seen.json";
export const DEFAULT_HOUSE_PAYERS_PATH = "data/house-payers.txt";

export type PayerClass = "house" | "stranger" | "unknown";

export type StrangerAlertScan = {
  alertPath: string;
  line: string;
  wrote: boolean;
  newStrangerCount: number;
  journalCount: number;
  latest?: { path: string; amountUsdc: string; payerClass: PayerClass; ts: string };
};

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function strangerAlertPath(): string {
  return resolve(env("STRANGER_SETTLE_ALERT_PATH", DEFAULT_STRANGER_ALERT_PATH));
}

export function strangerSeenPath(): string {
  return resolve(env("STRANGER_SETTLE_SEEN_PATH", DEFAULT_STRANGER_SEEN_PATH));
}

export function housePayersPath(): string {
  return resolve(env("HOUSE_PAYERS_PATH", DEFAULT_HOUSE_PAYERS_PATH));
}

export function eventKey(event: SettleEvent): string {
  return `${event.ts}|${event.path}|${event.requestId}`;
}

export function amountUsdcFromAtomic(atomic: string): string {
  const usdc = atomicToUsdc(atomic || "0");
  return `$${usdc.replace(/0+$/, "").replace(/\.$/, "") || "0"}`;
}

export function alertLineFor(event: SettleEvent, payerClass: PayerClass): string {
  return `${event.path} ${amountUsdcFromAtomic(event.amountAtomic)} ${payerClass}`;
}

export function loadHousePayers(
  filePath = housePayersPath(),
  fromEnv = env("HOUSE_PAYERS"),
): Set<string> {
  const out = new Set<string>();
  const add = (raw: string) => {
    const value = raw.trim().toLowerCase();
    if (/^0x[0-9a-f]{40}$/.test(value)) out.add(value);
  };
  for (const part of fromEnv.split(/[\s,]+/)) add(part);
  try {
    const text = readFileSync(filePath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      add(trimmed);
    }
  } catch {
    // Optional file. Do not invent house wallets.
  }
  return out;
}

export function payerClassOf(event: SettleEvent, house = loadHousePayers()): PayerClass {
  const payer = event.payer?.trim().toLowerCase();
  if (!payer) return "unknown";
  if (house.has(payer)) return "house";
  return "stranger";
}

export function loadSeenKeys(filePath = strangerSeenPath()): Set<string> {
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    if (Array.isArray(raw)) {
      return new Set(raw.filter((v): v is string => typeof v === "string" && v.includes("|")));
    }
    if (raw && typeof raw === "object" && Array.isArray((raw as { keys?: unknown }).keys)) {
      return new Set(
        ((raw as { keys: unknown[] }).keys).filter((v): v is string => typeof v === "string"),
      );
    }
  } catch {
    // First run: nothing seen.
  }
  return new Set();
}

export function writeSeenKeys(keys: Set<string>, filePath = strangerSeenPath()): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify({ keys: [...keys].sort() })}\n`, "utf8");
}

export function writeAlertLine(line: string, filePath = strangerAlertPath()): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${line.trim()}\n`, "utf8");
}

export function newStrangerSettles(
  events: SettleEvent[],
  seen = loadSeenKeys(),
  house = loadHousePayers(),
): SettleEvent[] {
  const fresh: SettleEvent[] = [];
  for (const event of [...events].sort((a, b) => a.ts.localeCompare(b.ts))) {
    const key = eventKey(event);
    if (seen.has(key)) continue;
    if (payerClassOf(event, house) !== "stranger") continue;
    fresh.push(event);
  }
  return fresh;
}

export function scanStrangerSettleAlert(opts?: {
  events?: SettleEvent[];
  alertPath?: string;
  seenPath?: string;
  house?: Set<string>;
}): StrangerAlertScan {
  const alertPath = opts?.alertPath ?? strangerAlertPath();
  const seenPath = opts?.seenPath ?? strangerSeenPath();
  const events = opts?.events ?? readSettleLog();
  const house = opts?.house ?? loadHousePayers();
  const seen = loadSeenKeys(seenPath);
  const fresh = newStrangerSettles(events, seen, house);
  const latest = fresh[fresh.length - 1];
  const line = latest ? alertLineFor(latest, "stranger") : "none";
  writeAlertLine(line, alertPath);
  for (const event of events) seen.add(eventKey(event));
  writeSeenKeys(seen, seenPath);
  return {
    alertPath,
    line,
    wrote: Boolean(latest),
    newStrangerCount: fresh.length,
    journalCount: events.length,
    latest: latest
      ? {
          path: latest.path,
          amountUsdc: amountUsdcFromAtomic(latest.amountAtomic),
          payerClass: "stranger",
          ts: latest.ts,
        }
      : undefined,
  };
}

/** Shop-path hook: journal already appended; refresh the Chief ping file. */
export function notePaidSettleForStrangerAlert(): void {
  try {
    scanStrangerSettleAlert();
  } catch {
    // Alert must never break the 200 / 402 path.
  }
}

function isMain(): boolean {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return Boolean(entry && import.meta.url === `file://${entry}`);
}

if (isMain()) {
  const result = scanStrangerSettleAlert();
  process.stdout.write(`${JSON.stringify({ ...result, note: "one-line artifact; no payer addresses" }, null, 2)}\n`);
}
