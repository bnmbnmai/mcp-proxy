/**
 * Hay-bag cache for the public door.
 *
 * The nightly collect rewrites board.json / history.json / the AMS snapshot,
 * then curls /ticks/manifest.json. That request used to call loadTicks() on
 * the HTTP thread. Parsing the rewritten bag blocked the event loop, so
 * /.well-known/x402 and every manifest timed out together (2026-11-01, about
 * 19:54–20:05 America/Boise) even though the node process never restarted.
 *
 * Small bags still parse on the request thread (tests, a cold tiny cache).
 * A large bag is parsed in ticks-bag-worker. While that runs, a warm cache
 * answers with the previous manifest and paid body. Well-known does not read
 * this bag at all; it stays fast as long as the event loop is free.
 */
import { statSync } from "node:fs";
import { Worker } from "node:worker_threads";
import { amsSnapshotPath } from "./ticks-ams.js";
import { boardPath, historyPath } from "./ticks-bag-paths.js";

export type CachedTicksPaid = {
  ticksRaw: Uint8Array;
  etag: string;
  fetchedAt: string | null;
  asOf: string | null;
  recordCount: number;
};

export function isCachedTicksPaid(body: unknown): body is CachedTicksPaid {
  if (!body || typeof body !== "object") return false;
  const row = body as CachedTicksPaid;
  return row.ticksRaw instanceof Uint8Array && typeof row.etag === "string";
}

type SyncLoader = {
  manifest: (resourceUrl: string) => Uint8Array;
  paid: () => CachedTicksPaid;
};

let syncLoader: SyncLoader | null = null;

export function registerTicksBagSyncLoader(loader: SyncLoader): void {
  syncLoader = loader;
}

type StampFile = { path: string; mtimeMs: number; size: number };
type Stamp = { pathsKey: string; files: StampFile[]; bytes: number };

type BagMeta = {
  etag: string;
  fetchedAt: string | null;
  asOf: string | null;
  recordCount: number;
  tickCount: number;
  manifestLen: number;
  paidLen: number;
};

type Entry = {
  pathsKey: string;
  files: StampFile[];
  frame: ArrayBuffer;
  paid: Uint8Array;
  etag: string;
  fetchedAt: string | null;
  asOf: string | null;
  recordCount: number;
  manifests: Map<string, Uint8Array>;
};

const DEFAULT_SYNC_MAX_BYTES = 4 * 1024 * 1024;
const DEFAULT_WORKER_TIMEOUT_MS = 20 * 60 * 1000;

let generation = 0;
let cache: Entry | null = null;
let inflight: Promise<Entry | null> | null = null;
let inflightKey = "";
let activeWorker: Worker | null = null;

export function resetTicksBagCacheForTests(): void {
  generation += 1;
  cache = null;
  inflight = null;
  inflightKey = "";
  if (activeWorker) {
    void activeWorker.terminate();
    activeWorker = null;
  }
}

function envFlag(name: string): boolean {
  return /^(1|true|yes)$/i.test((process.env[name] ?? "").trim());
}

function syncMaxBytes(): number {
  const raw = (process.env.TICKS_BAG_SYNC_MAX_BYTES ?? "").trim();
  if (!raw) return DEFAULT_SYNC_MAX_BYTES;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_SYNC_MAX_BYTES;
}

function workerTimeoutMs(): number {
  const raw = (process.env.TICKS_BAG_WORKER_TIMEOUT_MS ?? "").trim();
  if (!raw) return DEFAULT_WORKER_TIMEOUT_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WORKER_TIMEOUT_MS;
}

function isHeavy(stamp: Stamp): boolean {
  return envFlag("TICKS_BAG_FORCE_WORKER") || stamp.bytes > syncMaxBytes();
}

function statFile(path: string): StampFile {
  if (!path) return { path, mtimeMs: 0, size: 0 };
  try {
    const st = statSync(path);
    if (!st.isFile()) return { path, mtimeMs: 0, size: 0 };
    return { path, mtimeMs: st.mtimeMs, size: st.size };
  } catch {
    return { path, mtimeMs: 0, size: 0 };
  }
}

function readStamp(): Stamp {
  const files = [boardPath(), historyPath(), amsSnapshotPath()].map(statFile);
  return {
    pathsKey: files.map((file) => file.path).join("\0"),
    files,
    bytes: files.reduce((sum, file) => sum + file.size, 0),
  };
}

function sameFiles(a: StampFile[], b: StampFile[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].path !== b[i].path || a[i].mtimeMs !== b[i].mtimeMs || a[i].size !== b[i].size) return false;
  }
  return true;
}

function originOf(resourceUrl: string): string {
  return resourceUrl.replace(/\/ticks\/?$/, "") || "https://ticks.bnm.farm";
}

function retargetManifest(raw: Uint8Array, resourceUrl: string): Uint8Array {
  const manifest = JSON.parse(Buffer.from(raw).toString("utf8")) as Record<string, unknown>;
  const origin = originOf(resourceUrl);
  manifest.paidEndpoint = `${origin}/ticks`;
  manifest.discoveryUrl = `${origin}/`;
  manifest.manifestUrl = `${origin}/manifest.json`;
  manifest.openapi = `${origin}/openapi.json`;
  manifest.wellKnown = `${origin}/.well-known/x402`;
  manifest.llmsTxt = `${origin}/llms.txt`;
  return Buffer.from(JSON.stringify(manifest));
}

function manifestFor(entry: Entry, resourceUrl: string): Uint8Array {
  const hit = entry.manifests.get(resourceUrl);
  if (hit) return hit;
  const any = entry.manifests.values().next().value as Uint8Array | undefined;
  if (!any) return Buffer.from("{}");
  const retargeted = retargetManifest(any, resourceUrl);
  entry.manifests.set(resourceUrl, retargeted);
  return retargeted;
}

function decodeFrame(frame: ArrayBuffer, stamp: Stamp, resourceUrl: string): Entry {
  const buf = new Uint8Array(frame);
  if (buf.byteLength < 4) throw new Error("ticks bag worker returned a short frame");
  const headerLen = new DataView(frame).getUint32(0, true);
  const headerEnd = 4 + headerLen;
  if (headerEnd > buf.byteLength) throw new Error("ticks bag worker header overruns the frame");
  const meta = JSON.parse(Buffer.from(buf.subarray(4, headerEnd)).toString("utf8")) as BagMeta;
  const manifestEnd = headerEnd + meta.manifestLen;
  const paidEnd = manifestEnd + meta.paidLen;
  if (paidEnd > buf.byteLength) throw new Error("ticks bag worker body overruns the frame");
  const manifests = new Map<string, Uint8Array>();
  manifests.set(resourceUrl, buf.subarray(headerEnd, manifestEnd));
  return {
    pathsKey: stamp.pathsKey,
    files: stamp.files,
    frame,
    paid: buf.subarray(manifestEnd, paidEnd),
    etag: meta.etag,
    fetchedAt: meta.fetchedAt,
    asOf: meta.asOf,
    recordCount: meta.recordCount,
    manifests,
  };
}

function runWorker(resourceUrl: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./ticks-bag-worker.js", import.meta.url), {
      workerData: { resourceUrl },
    });
    activeWorker = worker;
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (activeWorker === worker) activeWorker = null;
      fn();
    };
    const timer = setTimeout(() => {
      finish(() => {
        void worker.terminate();
        reject(new Error("ticks bag worker timed out"));
      });
    }, workerTimeoutMs());
    worker.once("message", (msg: ArrayBuffer) => {
      finish(() => {
        resolve(msg);
        void worker.terminate();
      });
    });
    worker.once("error", (err) => {
      finish(() => {
        void worker.terminate();
        reject(err);
      });
    });
    worker.once("exit", (code) => {
      if (settled) return;
      finish(() => reject(new Error(`ticks bag worker exit ${code}`)));
    });
  });
}

function startReload(resourceUrl: string, pathsKey: string): Promise<Entry | null> {
  if (inflight && inflightKey === pathsKey) return inflight;
  const gen = generation;
  inflightKey = pathsKey;
  const slot: { current: Promise<Entry | null> | null } = { current: null };
  slot.current = (async () => {
    try {
      const frame = await runWorker(resourceUrl);
      if (gen !== generation) return cache;
      const stamp = readStamp();
      if (stamp.pathsKey !== pathsKey) return cache;
      const entry = decodeFrame(frame, stamp, resourceUrl);
      cache = entry;
      return entry;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`ticks bag reload failed: ${message}`);
      return null;
    } finally {
      if (inflight === slot.current) {
        inflight = null;
        inflightKey = "";
      }
    }
  })();
  inflight = slot.current;
  return slot.current;
}

function syncFill(stamp: Stamp, resourceUrl: string): Entry {
  if (!syncLoader) throw new Error("ticks bag sync loader is not registered");
  const manifest = syncLoader.manifest(resourceUrl);
  const paid = syncLoader.paid();
  const manifests = new Map<string, Uint8Array>();
  manifests.set(resourceUrl, manifest);
  const entry: Entry = {
    pathsKey: stamp.pathsKey,
    files: stamp.files,
    frame: manifest.buffer.slice(manifest.byteOffset, manifest.byteOffset + manifest.byteLength) as ArrayBuffer,
    paid: paid.ticksRaw,
    etag: paid.etag,
    fetchedAt: paid.fetchedAt,
    asOf: paid.asOf,
    recordCount: paid.recordCount,
    manifests,
  };
  cache = entry;
  return entry;
}

async function resolveEntry(resourceUrl: string): Promise<Entry | null> {
  const stamp = readStamp();
  const heavy = isHeavy(stamp);
  if (cache && cache.pathsKey === stamp.pathsKey && sameFiles(cache.files, stamp.files)) {
    return cache;
  }
  if (heavy && cache && cache.pathsKey === stamp.pathsKey) {
    void startReload(resourceUrl, stamp.pathsKey).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`ticks bag background reload failed: ${message}`);
    });
    return cache;
  }
  if (!heavy) return syncFill(stamp, resourceUrl);
  return (await startReload(resourceUrl, stamp.pathsKey)) ?? cache;
}

function paidFrom(entry: Entry): CachedTicksPaid {
  return {
    ticksRaw: entry.paid,
    etag: entry.etag,
    fetchedAt: entry.fetchedAt,
    asOf: entry.asOf,
    recordCount: entry.recordCount,
  };
}

export async function getTicksManifest(resourceUrl: string): Promise<Uint8Array> {
  const entry = await resolveEntry(resourceUrl);
  if (!entry) {
    return Buffer.from(
      JSON.stringify({
        ok: false,
        tickCount: 0,
        status: "stale",
        fetchedAt: null,
        reason: "Hay bag reload failed and there is no previous cache.",
      }),
    );
  }
  return manifestFor(entry, resourceUrl);
}

export async function getTicksPaid(): Promise<CachedTicksPaid> {
  const entry = await resolveEntry("https://ticks.bnm.farm/ticks");
  if (!entry) {
    throw new Error("Hay bag reload failed and there is no previous cache.");
  }
  return paidFrom(entry);
}
