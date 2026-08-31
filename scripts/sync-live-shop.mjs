#!/usr/bin/env node
/**
 * Generate in-repo shop discovery files from live ticks.bnm.farm.
 * Door count is whatever live /.well-known/x402 lists today — never hardcoded.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "https://ticks.bnm.farm";
const UA = "bnm-data-shop/1.0 (sync-live-shop; +https://ticks.bnm.farm/.well-known/x402)";

async function loadCatalog() {
  const built = join(ROOT, "build", "shop-catalog.js");
  try {
    return await import(pathToFileURL(built).href);
  } catch {
    throw new Error("run `npm run build` first so scripts can import build/shop-catalog.js");
  }
}

async function getJson(path) {
  const res = await fetch(`${HOST}${path}`, { headers: { Accept: "application/json", "User-Agent": UA } });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

const catalog = await loadCatalog();
const wellKnown = await getJson("/.well-known/x402");
const openapi = await getJson("/openapi.json");
const skus = catalog.skusFromWellKnown(wellKnown, openapi);
if (skus.length < 1) throw new Error("live well-known listed no paid GETs");

const shopIndex = catalog.shopIndexMarkdown(skus);
const readme = catalog.readmeMarkdown(skus);
catalog.assertNoHardcodedDoorCount(shopIndex);
catalog.assertNoHardcodedDoorCount(readme);

mkdirSync(join(ROOT, "docs"), { recursive: true });
writeFileSync(join(ROOT, "openapi.json"), `${JSON.stringify(openapi, null, 2)}\n`);
writeFileSync(join(ROOT, "SHOP-INDEX.md"), shopIndex.endsWith("\n") ? shopIndex : `${shopIndex}\n`);
writeFileSync(join(ROOT, "README.md"), readme.endsWith("\n") ? readme : `${readme}\n`);
writeFileSync(
  join(ROOT, "docs/live-well-known.json"),
  `${JSON.stringify(
    {
      generatedFrom: `${HOST}/.well-known/x402`,
      generatedAt: new Date().toISOString(),
      paidGetCount: skus.length,
      resources: skus.map((s) => s.path),
    },
    null,
    2,
  )}\n`,
);

const pkgPath = join(ROOT, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.description = "BNM Data Shop — official public-data x402 GETs at ticks.bnm.farm";
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const serverPath = join(ROOT, "server.json");
const server = JSON.parse(readFileSync(serverPath, "utf8"));
server.description = "BNM Data Shop. Official-data x402 GETs. Table $0.05; body $0.02/$0.05. Live count is /.well-known/x402.";
writeFileSync(serverPath, `${JSON.stringify(server, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      paidGetCount: skus.length,
      wrote: ["SHOP-INDEX.md", "README.md", "openapi.json", "docs/live-well-known.json", "package.json", "server.json"],
      first: skus[0]?.path,
      last: skus.at(-1)?.path,
    },
    null,
    2,
  ),
);
