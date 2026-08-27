/**
 * Live / local smoke for GET /npdes-permits.
 * Default host is the live shop. Do not invent permit bodies.
 * MCP / OpenAPI door count is read from live well-known (not hardcoded).
 */
import assert from "node:assert/strict";

const HOST = (process.env.NPDES_SMOKE_HOST || "https://ticks.bnm.farm").replace(/\/$/, "");
const UA = "bnm-data-shop/1.0 (npdes-permits live smoke; +https://www.epa.gov/npdes-permits)";

async function get(path: string): Promise<{ status: number; json: Record<string, unknown>; headers: Headers }> {
  const res = await fetch(`${HOST}${path}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }
  return { status: res.status, json, headers: res.headers };
}

function acceptAmount(body: Record<string, unknown>): string {
  const accepts = body.accepts;
  if (!Array.isArray(accepts) || !accepts[0] || typeof accepts[0] !== "object") return "";
  const first = accepts[0] as Record<string, unknown>;
  return String(first.maxAmountRequired ?? first.amount ?? "");
}

function extra(body: Record<string, unknown>): Record<string, unknown> {
  const accepts = body.accepts;
  if (!Array.isArray(accepts) || !accepts[0] || typeof accepts[0] !== "object") return {};
  const first = accepts[0] as Record<string, unknown>;
  return first.extra && typeof first.extra === "object" ? (first.extra as Record<string, unknown>) : {};
}

async function main(): Promise<void> {
  const wellKnown = await get("/.well-known/x402");
  assert.equal(wellKnown.status, 200, "live well-known is free");
  const resources = wellKnown.json.resources;
  assert.ok(Array.isArray(resources) && resources.length > 0, "well-known lists paid resources");
  const paths = (resources as unknown[]).map((r) => String(r).replace(/^https:\/\/ticks\.bnm\.farm/, ""));
  assert.ok(paths.includes("/npdes-permits"), "live well-known includes /npdes-permits");
  assert.ok(!paths.includes("/echo"), "do not list ECHO");
  assert.ok(!paths.some((p) => /waterboards-acl|gis/.test(p)), "do not list ACL / GIS wraps");
  const liveCount = paths.length;
  console.log(`live well-known paid GETs: ${liveCount}`);

  const openapi = await get("/openapi.json");
  assert.equal(openapi.status, 200);
  const oaPaths = (openapi.json.paths && typeof openapi.json.paths === "object"
    ? Object.keys(openapi.json.paths as object)
    : []);
  assert.ok(oaPaths.includes("/npdes-permits"), "live OpenAPI includes /npdes-permits");
  assert.ok(oaPaths.includes("/npdes-permits/manifest.json"), "live OpenAPI includes free manifest");

  const page = await get("/npdes-permits");
  assert.equal(page.status, 402, "unpaid GET /npdes-permits is 402");
  assert.equal(acceptAmount(page.json), "50000", "page price is $0.05 / 50000 atomic");
  const pageExtra = extra(page.json);
  assert.equal(pageExtra.priceAtomic, 20000);
  assert.equal(pageExtra.pagePriceAtomic, 50000);
  assert.equal(pageExtra.oneDocPath, "/npdes-permits?id=");
  assert.match(String(pageExtra.searchUrl || ""), /\/npdes-permits\/manifest\.json/);
  const pageBlob = JSON.stringify(page.json);
  assert.ok(!/AUTHORIZATION TO DISCHARGE/.test(pageBlob), "unpaid 402 must not leak permit body");

  const one = await get("/npdes-permits?id=ma0003531");
  assert.equal(one.status, 402, "unpaid GET ?id= is 402");
  assert.equal(acceptAmount(one.json), "20000", "single document is $0.02 / 20000 atomic");
  assert.equal((one.json.accepts as { extra?: { priceAtomic?: number } }[])[0]?.extra?.priceAtomic, 20000);

  const manifest = await get("/npdes-permits/manifest.json");
  assert.equal(manifest.status, 200, "free manifest is HTTP 200");
  assert.equal(manifest.json.free, true);
  assert.equal(manifest.json.product, "epa-npdes-individual-permit-bodies");
  assert.equal(manifest.json.priceUsdc, "0.05");
  assert.equal(manifest.json.amountAtomic, "50000");
  assert.equal(manifest.json.payTo, "0xf59621FC406D266e18f314Ae18eF0a33b8401004");
  assert.equal(manifest.json.network, "base");
  assert.equal(manifest.json.asset, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
  const cardCount = Number(manifest.json.cardCount);
  assert.ok(cardCount >= 14, `manifest cardCount is real official permits, got ${cardCount}`);
  const cards = manifest.json.cards;
  assert.ok(Array.isArray(cards) && cards.length === cardCount);
  for (const raw of cards as Record<string, unknown>[]) {
    assert.ok(typeof raw.id === "string" && raw.id);
    assert.ok(typeof raw.permit === "string" && /^[A-Z]{2}\d{7}$/.test(String(raw.permit)));
    assert.match(String(raw.sourceUrl), /^https:\/\/www\.epa\.gov\/system\/files\/documents\/.+\.pdf$/);
    assert.ok(!("body" in raw), "free manifest must not include permit body");
    assert.ok(!/echo\.epa\.gov|semspub\.epa\.gov|waterboards\.ca\.gov/i.test(String(raw.sourceUrl)));
  }
  const ids = (cards as { id: string }[]).map((c) => c.id);
  assert.ok(ids.includes("ma0003531"), "required seed MA0003531 CertainTeed");
  assert.ok(ids.includes("nh0001023"), "NH0001023 PCC Structurals");
  const manBlob = JSON.stringify(manifest.json);
  assert.ok(!/AUTHORIZATION TO DISCHARGE/.test(manBlob), "manifest must not dump permit body");
  assert.ok(!/\bECHO\b/.test(manBlob) || /does not|index-only|not sold/i.test(String(manifest.json.note || "")));

  const search = await get("/npdes-permits/manifest.json?q=certainteed");
  assert.equal(search.status, 200);
  const searched = search.json.cards as { id: string }[] | undefined;
  assert.ok(Array.isArray(searched) && searched.some((c) => c.id === "ma0003531"));

  console.log(
    JSON.stringify(
      {
        host: HOST,
        livePaidGets: liveCount,
        unpaidPage: { status: page.status, amountAtomic: acceptAmount(page.json) },
        unpaidId: { status: one.status, amountAtomic: acceptAmount(one.json) },
        manifest: { status: manifest.status, cardCount, ids: ids.slice(0, 5) },
      },
      null,
      2,
    ),
  );
  console.log("npdes-permits live smoke ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
