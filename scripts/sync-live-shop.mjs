#!/usr/bin/env node
/**
 * Generate local shop discovery files from live ticks.bnm.farm.
 * Door count is whatever live /.well-known/x402 lists today — never hardcoded.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "https://ticks.bnm.farm";
const UA = "bnm-data-shop/1.0 (sync-live-shop; +https://ticks.bnm.farm/.well-known/x402)";

async function getJson(path) {
  const res = await fetch(`${HOST}${path}`, { headers: { Accept: "application/json", "User-Agent": UA } });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

const wellKnown = await getJson("/.well-known/x402");
const resources = Array.isArray(wellKnown.resources) ? wellKnown.resources : [];
const paths = resources.map((r) => String(r).replace(/^https:\/\/ticks\.bnm\.farm/, ""));
if (!paths.includes("/npdes-permits")) {
  throw new Error("live well-known is missing /npdes-permits — refuse to generate a stale catalog");
}

const openapi = await getJson("/openapi.json");
if (!openapi.paths || !openapi.paths["/npdes-permits"]) {
  throw new Error("live OpenAPI is missing /npdes-permits");
}

writeFileSync(join(ROOT, "openapi.json"), `${JSON.stringify(openapi, null, 2)}\n`);
writeFileSync(
  join(ROOT, "docs/live-well-known.json"),
  `${JSON.stringify(
    {
      generatedFrom: `${HOST}/.well-known/x402`,
      generatedAt: new Date().toISOString(),
      paidGetCount: paths.length,
      resources: paths,
      includesNpdesPermits: true,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    {
      paidGetCount: paths.length,
      includesNpdesPermits: true,
      wrote: ["openapi.json", "docs/live-well-known.json"],
    },
    null,
    2,
  ),
);
