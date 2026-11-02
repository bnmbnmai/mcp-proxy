/**
 * Parse the hay bag off the door's event loop.
 * loadTicks() is synchronous JSON.parse of board.json + history.json + the AMS
 * snapshot. Doing that on the HTTP thread wedges every route until it returns.
 */
import { parentPort, workerData } from "node:worker_threads";
import { etagFromPaidEnvelope, paidTicksBody } from "./paid-records.js";
import { buildTicksManifest, loadTicks } from "./ticks-door.js";

type WorkerIn = { resourceUrl?: string };

const port = parentPort;
if (!port) {
  throw new Error("ticks-bag-worker must be started with worker_threads");
}

const pauseMs = Number(process.env.TICKS_BAG_WORKER_PAUSE_MS || "0");
if (Number.isFinite(pauseMs) && pauseMs > 0) {
  await new Promise((resolve) => setTimeout(resolve, pauseMs));
}

const resourceUrl = String((workerData as WorkerIn | undefined)?.resourceUrl || "https://ticks.bnm.farm/ticks");
const payload = loadTicks();
const manifest = buildTicksManifest(resourceUrl);
const paid = paidTicksBody(payload);
const manifestJson = JSON.stringify(manifest);
const paidJson = JSON.stringify(paid);
const meta = {
  etag: etagFromPaidEnvelope("ticks", paid),
  fetchedAt: typeof paid.fetchedAt === "string" ? paid.fetchedAt : null,
  asOf: typeof paid.asOf === "string" ? paid.asOf : null,
  recordCount: typeof paid.recordCount === "number" ? paid.recordCount : 0,
  tickCount: Array.isArray(payload.ticks) ? payload.ticks.length : 0,
  manifestLen: Buffer.byteLength(manifestJson),
  paidLen: Buffer.byteLength(paidJson),
};
const header = Buffer.from(JSON.stringify(meta));
const lengths = Buffer.alloc(4);
lengths.writeUInt32LE(header.length, 0);
const frame = Buffer.concat([lengths, header, Buffer.from(manifestJson), Buffer.from(paidJson)]);
const exact = frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength);
port.postMessage(exact, [exact]);
