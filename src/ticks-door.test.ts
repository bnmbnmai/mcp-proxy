import { createServer } from "node:http";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AddressInfo } from "node:net";
import assert from "node:assert/strict";
import { handleRequest, PAY_TO, TICKS_PATH, USDC_BASE, DEFAULT_TICKS_DIR, loadTicks, MANIFEST_PATH, CATALOG_PATH, WELL_KNOWN_PATH, OPENAPI_PATH, LLMS_PATH, X402SCAN_SERVER_URL, NETWORK_V2, bazaarExtension, cdpEnvStatus, facilitatorPaymentRequirements, facilitatorBody, PUBLIC_BAZAAR_SKUS, isPublicBazaarSku, publicBazaarSkus } from "./ticks-door.js";
import {
  IMPORT_ALERTS_AMOUNT_ATOMIC,
  IMPORT_ALERTS_MANIFEST_PATH,
  IMPORT_ALERTS_PATH,
  TICKS_AMOUNT_ATOMIC,
} from "./import-alerts.js";
import {
  MARINERS_AMOUNT_ATOMIC,
  MARINERS_D7_MANIFEST_PATH,
  MARINERS_D7_PATH,
  MARINERS_D8_MANIFEST_PATH,
  MARINERS_D8_PATH,
  MARINERS_D11_MANIFEST_PATH,
  MARINERS_D11_PATH,
  MARINERS_MANIFEST_PATH,
  MARINERS_PATH,
} from "./mariners.js";
import {
  WARNING_LETTERS_AMOUNT_ATOMIC,
  WARNING_LETTERS_MANIFEST_PATH,
  WARNING_LETTERS_PATH,
} from "./warning-letters.js";
import {
  UNTITLED_LETTERS_AMOUNT_ATOMIC,
  UNTITLED_LETTERS_MANIFEST_PATH,
  UNTITLED_LETTERS_PATH,
} from "./untitled-letters.js";
import {
  AWA_AMOUNT_ATOMIC,
  AWA_MANIFEST_PATH,
  AWA_PATH,
} from "./awa.js";
import {
  SWISSPAR_AMOUNT_ATOMIC,
  SWISSPAR_MANIFEST_PATH,
  SWISSPAR_PATH,
} from "./swisspar.js";
import {
  PCAC_AMOUNT_ATOMIC,
  PCAC_MANIFEST_PATH,
  PCAC_PATH,
} from "./pcac.js";
import {
  FTC_WL_AMOUNT_ATOMIC,
  FTC_WL_MANIFEST_PATH,
  FTC_WL_PATH,
} from "./ftc-wl.js";
import {
  CFPB_ORDERS_AMOUNT_ATOMIC,
  CFPB_ORDERS_MANIFEST_PATH,
  CFPB_ORDERS_PATH,
} from "./cfpb-orders.js";
import {
  OCC_CD_AMOUNT_ATOMIC,
  OCC_CD_MANIFEST_PATH,
  OCC_CD_PATH,
} from "./occ-cd.js";
import {
  FDIC_ORDERS_AMOUNT_ATOMIC,
  FDIC_ORDERS_MANIFEST_PATH,
  FDIC_ORDERS_PATH,
} from "./fdic-orders.js";
import {
  FRB_ORDERS_AMOUNT_ATOMIC,
  FRB_ORDERS_MANIFEST_PATH,
  FRB_ORDERS_PATH,
} from "./frb-orders.js";
import {
  NCUA_ORDERS_AMOUNT_ATOMIC,
  NCUA_ORDERS_MANIFEST_PATH,
  NCUA_ORDERS_PATH,
} from "./ncua-orders.js";
import {
  FINCEN_ORDERS_AMOUNT_ATOMIC,
  FINCEN_ORDERS_MANIFEST_PATH,
  FINCEN_ORDERS_PATH,
} from "./fincen-orders.js";
import {
  FERC_ORDERS_AMOUNT_ATOMIC,
  FERC_ORDERS_MANIFEST_PATH,
  FERC_ORDERS_PATH,
} from "./ferc-orders.js";
import {
  OFAC_ORDERS_AMOUNT_ATOMIC,
  OFAC_ORDERS_MANIFEST_PATH,
  OFAC_ORDERS_PATH,
} from "./ofac-orders.js";
import {
  BIS_ORDERS_AMOUNT_ATOMIC,
  BIS_ORDERS_MANIFEST_PATH,
  BIS_ORDERS_PATH,
} from "./bis-orders.js";
import {
  CFTC_ORDERS_AMOUNT_ATOMIC,
  CFTC_ORDERS_MANIFEST_PATH,
  CFTC_ORDERS_PATH,
} from "./cftc-orders.js";
import {
  FIFRA_ORDERS_AMOUNT_ATOMIC,
  FIFRA_ORDERS_MANIFEST_PATH,
  FIFRA_ORDERS_PATH,
} from "./fifra-orders.js";
import {
  DENOVO_ORDERS_AMOUNT_ATOMIC,
  DENOVO_ORDERS_MANIFEST_PATH,
  DENOVO_ORDERS_PATH,
} from "./denovo-orders.js";
import {
  TTB_OIC_AMOUNT_ATOMIC,
  TTB_OIC_MANIFEST_PATH,
  TTB_OIC_PATH,
} from "./ttb-oic.js";
import {
  AIR_LETTERS_AMOUNT_ATOMIC,
  AIR_LETTERS_MANIFEST_PATH,
  AIR_LETTERS_PATH,
} from "./air-letters.js";
import {
  SUPERFUND_RODS_AMOUNT_ATOMIC,
  SUPERFUND_RODS_MANIFEST_PATH,
  SUPERFUND_RODS_PATH,
} from "./superfund-rods.js";
import {
  ICO_MPN_AMOUNT_ATOMIC,
  ICO_MPN_MANIFEST_PATH,
  ICO_MPN_PATH,
} from "./ico-mpn.js";
import {
  CMA_CA98_AMOUNT_ATOMIC,
  CMA_CA98_MANIFEST_PATH,
  CMA_CA98_PATH,
} from "./cma-ca98.js";
import {
  FORM_483_AMOUNT_ATOMIC,
  FORM_483_MANIFEST_PATH,
  FORM_483_PATH,
} from "./form-483.js";
import {
  GMP_AMOUNT_ATOMIC,
  GMP_MANIFEST_PATH,
  GMP_PATH,
} from "./gmp.js";
import {
  GMP_MD_AMOUNT_ATOMIC,
  GMP_MD_MANIFEST_PATH,
  GMP_MD_PATH,
} from "./gmp-md.js";

async function withServer(
  envPatch: Record<string, string | undefined>,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const prev: Record<string, string | undefined> = {};
  if (!Object.prototype.hasOwnProperty.call(envPatch, "GMP_DIR")) {
    envPatch = { ...envPatch, GMP_DIR: join(tmpdir(), "gmp-absent-withserver-") };
  }
  if (!Object.prototype.hasOwnProperty.call(envPatch, "GMP_MD_DIR")) {
    envPatch = { ...envPatch, GMP_MD_DIR: join(tmpdir(), "gmp-md-absent-withserver-") };
  }
  for (const [k, v] of Object.entries(envPatch)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const server = createServer((req, res) => {
    void handleRequest(req, res, 0);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const FRESH_FETCHED_AT = new Date(Date.now() - 60_000).toISOString();

async function main(): Promise<void> {
  await withServer({
    TICKS_PATH: "",
    TICKS_DIR: "",
    FARM_DATA_DIR: "",
    X402_USDC_ATOMIC: "",
    FORM_483_DIR: join(tmpdir(), "form-483-absent-"),
    CDP_API_KEY_ID: undefined,
    CDP_API_KEY_SECRET: undefined,
  }, async (base) => {
    const res = await fetch(`${base}${TICKS_PATH}`);
    assert.equal(res.status, 402, "unpaid GET /ticks must be 402");
    const body = (await res.json()) as {
      payTo: string;
      asset: string;
      accepts: { payTo: string; asset: string; network: string }[];
    };
    assert.equal(body.payTo, PAY_TO);
    assert.equal(body.asset, USDC_BASE);
    assert.equal(body.accepts[0]?.payTo, PAY_TO);
    assert.equal(body.accepts[0]?.network, "base");
    assert.ok(res.headers.get("payment-required"), "v2 PAYMENT-REQUIRED header");
    assert.equal(
      (body.accepts[0] as { maxAmountRequired?: string }).maxAmountRequired,
      TICKS_AMOUNT_ATOMIC,
      "Idaho /ticks list price is $0.02 (20000 atomic)",
    );
    assert.equal(
      (body.accepts[0] as { extra?: { name?: string } }).extra?.name,
      "USD Coin",
      "CDP v1 extra.name must be the on-chain USDC name",
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(body.accepts[0] as object, "outputSchema"),
      false,
      "outputSchema: null 400s CDP v1 verify",
    );
    assert.equal(
      (body as { extensions?: { bazaar?: { info?: { input?: { method?: string } } } } }).extensions
        ?.bazaar?.info?.input?.method,
      "GET",
      "402 JSON body also carries extensions.bazaar for body-only crawlers",
    );
    const pr = res.headers.get("payment-required");
    assert.ok(pr, "v2 PAYMENT-REQUIRED header");
    const v2 = JSON.parse(Buffer.from(pr, "base64").toString("utf8")) as {
      extensions?: { bazaar?: { info?: { input?: { type?: string; method?: string } } } };
      resource?: { description?: string };
    };
    assert.equal(v2.extensions?.bazaar?.info?.input?.type, "http");
    assert.equal(v2.extensions?.bazaar?.info?.input?.method, "GET");
    assert.ok((v2.resource?.description ?? "").includes("Call GET /ticks"));
    assert.ok((v2.resource?.description ?? "").length <= 500);
    const v2Accepts = (
      JSON.parse(Buffer.from(pr, "base64").toString("utf8")) as {
        accepts?: { description?: string }[];
      }
    ).accepts;
    assert.ok((v2Accepts?.[0]?.description ?? "").includes("Call GET /ticks"));
    assert.ok((v2Accepts?.[0]?.description ?? "").length <= 500);
    const declared = bazaarExtension("ticks");
    assert.deepEqual(
      v2.extensions?.bazaar?.info?.input,
      (declared.info as { input: unknown }).input,
    );

    const wellKnown = await fetch(`${base}${WELL_KNOWN_PATH}`);
    assert.equal(wellKnown.status, 200);
    const wk = (await wellKnown.json()) as {
      version: number;
      resources: string[];
      openapi?: string;
      llmsTxt?: string;
      instructions?: string;
      ownershipProofs?: string[];
    };
    assert.equal(wk.version, 1);
    assert.deepEqual(wk.ownershipProofs, [PAY_TO]);
    assert.ok((wk.instructions ?? "").includes(X402SCAN_SERVER_URL));
    assert.equal(wk.resources.length, 29, "well-known lists the twenty-nine always-public doors");
    assert.ok(wk.resources.some((r) => r.endsWith(TICKS_PATH) && r.startsWith("http")));
    assert.ok(wk.resources.some((r) => r.endsWith(IMPORT_ALERTS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(MARINERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(MARINERS_D11_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(MARINERS_D7_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(MARINERS_D8_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(WARNING_LETTERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(UNTITLED_LETTERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(AWA_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(SWISSPAR_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(PCAC_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(FTC_WL_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(CFPB_ORDERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(OCC_CD_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(FDIC_ORDERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(FRB_ORDERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(NCUA_ORDERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(FINCEN_ORDERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(FERC_ORDERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(OFAC_ORDERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(BIS_ORDERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(CFTC_ORDERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(FIFRA_ORDERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(DENOVO_ORDERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(TTB_OIC_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(AIR_LETTERS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(SUPERFUND_RODS_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(ICO_MPN_PATH)));
    assert.ok(wk.resources.some((r) => r.endsWith(CMA_CA98_PATH)));
    assert.ok(!wk.resources.some((r) => r.includes(FORM_483_PATH)), "do not list /form-483 without a cached body");
    assert.ok(!wk.resources.some((r) => r.includes(GMP_PATH)), "do not list /gmp without a cached observation body");
    assert.ok(!wk.resources.some((r) => r.includes(GMP_MD_PATH)), "do not list /gmp-md without a cached observation body");
    assert.ok(wk.resources.every((r) => r.startsWith("http")), "well-known resources must be absolute URLs");
    assert.ok(wk.openapi?.endsWith(OPENAPI_PATH));
    assert.ok(wk.llmsTxt?.endsWith(LLMS_PATH));
    assert.ok((wk.instructions ?? "").includes("twenty-nine paid"));
    assert.ok(!wk.resources.some((r) => r.includes("/gain")));
    assert.equal(cdpEnvStatus(), "CDP env not set");

    const specRes = await fetch(`${base}${OPENAPI_PATH}`);
    assert.equal(specRes.status, 200);
    const spec = (await specRes.json()) as {
      openapi: string;
      info: { title: string; version: string; contact?: { name?: string; url?: string } };
      "x-discovery"?: { ownershipProofs?: string[] };
      "x-agentcash-provenance"?: { ownershipProofs?: string[] };
      "x-agentcash-guidance"?: { llmsTxtUrl?: string };
      paths: Record<string, {
        get?: {
          "x-auth"?: { mode?: string };
          security?: unknown;
          "x-payment-info"?: {
            protocols?: { x402?: { payTo?: string; network?: string; asset?: string; amount?: string } }[];
            price?: { amount?: string };
            payTo?: string;
          };
          responses?: Record<string, unknown>;
        };
      }>;
    };
    assert.equal(spec.openapi, "3.1.0");
    assert.ok(spec.info.title);
    assert.ok(spec.info.version);
    assert.equal(spec.info.contact?.url, "https://bnm.farm/");
    assert.deepEqual(spec["x-discovery"]?.ownershipProofs, [PAY_TO]);
    assert.deepEqual(spec["x-agentcash-provenance"]?.ownershipProofs, [PAY_TO]);
    assert.ok(spec["x-agentcash-guidance"]?.llmsTxtUrl?.endsWith(LLMS_PATH));
    for (const paid of [TICKS_PATH, IMPORT_ALERTS_PATH, MARINERS_PATH, MARINERS_D11_PATH, MARINERS_D7_PATH, MARINERS_D8_PATH, WARNING_LETTERS_PATH, UNTITLED_LETTERS_PATH, AWA_PATH, SWISSPAR_PATH, PCAC_PATH, FTC_WL_PATH, CFPB_ORDERS_PATH, OCC_CD_PATH, FDIC_ORDERS_PATH, FRB_ORDERS_PATH, NCUA_ORDERS_PATH, FINCEN_ORDERS_PATH, FERC_ORDERS_PATH, OFAC_ORDERS_PATH, BIS_ORDERS_PATH, CFTC_ORDERS_PATH, FIFRA_ORDERS_PATH, DENOVO_ORDERS_PATH, TTB_OIC_PATH, AIR_LETTERS_PATH, SUPERFUND_RODS_PATH, ICO_MPN_PATH]) {
      const op = spec.paths[paid]?.get;
      assert.ok(op?.["x-payment-info"], `${paid} must declare x-payment-info`);
      assert.equal(op?.["x-auth"]?.mode, "x402");
      assert.ok(op?.responses?.["402"], `${paid} must declare 402`);
      assert.equal(op?.["x-payment-info"]?.payTo, PAY_TO);
      assert.equal(op?.["x-payment-info"]?.protocols?.[0]?.x402?.network, NETWORK_V2);
      assert.equal(op?.["x-payment-info"]?.protocols?.[0]?.x402?.asset, USDC_BASE);
    }
    assert.equal(spec.paths[TICKS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.02");
    assert.equal(spec.paths[IMPORT_ALERTS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[MARINERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[MARINERS_D11_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[MARINERS_D7_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[MARINERS_D8_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[WARNING_LETTERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[UNTITLED_LETTERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[AWA_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[SWISSPAR_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[PCAC_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[FTC_WL_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[CFPB_ORDERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[OCC_CD_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[FDIC_ORDERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[FRB_ORDERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[NCUA_ORDERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[FINCEN_ORDERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[FERC_ORDERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[OFAC_ORDERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[BIS_ORDERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[CFTC_ORDERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[FIFRA_ORDERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[DENOVO_ORDERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[TTB_OIC_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[AIR_LETTERS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[SUPERFUND_RODS_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[ICO_MPN_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
    assert.equal(spec.paths[CATALOG_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.deepEqual(spec.paths[CATALOG_PATH]?.get?.security, []);
    assert.ok(spec.paths["/"]?.get);
    assert.ok(spec.paths[LLMS_PATH]?.get);
    assert.ok(spec.paths[WARNING_LETTERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[WARNING_LETTERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[UNTITLED_LETTERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[UNTITLED_LETTERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[AWA_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[AWA_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[SWISSPAR_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[SWISSPAR_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[PCAC_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[PCAC_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[FTC_WL_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[FTC_WL_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[CFPB_ORDERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[CFPB_ORDERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[OCC_CD_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[OCC_CD_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[FDIC_ORDERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[FDIC_ORDERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[FRB_ORDERS_PATH]?.get);
    assert.ok(spec.paths[FRB_ORDERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[FRB_ORDERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[NCUA_ORDERS_PATH]?.get);
    assert.ok(spec.paths[NCUA_ORDERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[NCUA_ORDERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[FINCEN_ORDERS_PATH]?.get);
    assert.ok(spec.paths[FINCEN_ORDERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[FINCEN_ORDERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[FERC_ORDERS_PATH]?.get);
    assert.ok(spec.paths[FERC_ORDERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[FERC_ORDERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[OFAC_ORDERS_PATH]?.get);
    assert.ok(spec.paths[OFAC_ORDERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[OFAC_ORDERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[BIS_ORDERS_PATH]?.get);
    assert.ok(spec.paths[BIS_ORDERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[BIS_ORDERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[CFTC_ORDERS_PATH]?.get);
    assert.ok(spec.paths[CFTC_ORDERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[CFTC_ORDERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[FIFRA_ORDERS_PATH]?.get);
    assert.ok(spec.paths[FIFRA_ORDERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[FIFRA_ORDERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[DENOVO_ORDERS_PATH]?.get);
    assert.ok(spec.paths[DENOVO_ORDERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[DENOVO_ORDERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[TTB_OIC_PATH]?.get);
    assert.ok(spec.paths[TTB_OIC_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[TTB_OIC_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[AIR_LETTERS_PATH]?.get);
    assert.ok(spec.paths[AIR_LETTERS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[AIR_LETTERS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[SUPERFUND_RODS_PATH]?.get);
    assert.ok(spec.paths[SUPERFUND_RODS_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[SUPERFUND_RODS_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[ICO_MPN_PATH]?.get);
    assert.ok(spec.paths[ICO_MPN_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[ICO_MPN_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.ok(spec.paths[CMA_CA98_PATH]?.get);
    assert.ok(spec.paths[CMA_CA98_MANIFEST_PATH]?.get);
    assert.equal(spec.paths[CMA_CA98_MANIFEST_PATH]?.get?.["x-auth"]?.mode, "none");
    assert.equal(spec.paths[FORM_483_PATH], undefined, "no stub /form-483 in OpenAPI without a cached body");
    assert.equal(spec.paths[FORM_483_MANIFEST_PATH], undefined);
    assert.equal(spec.paths[GMP_PATH], undefined, "no stub /gmp in OpenAPI without a cached body");
    assert.equal(spec.paths[GMP_MANIFEST_PATH], undefined);
    assert.equal(spec.paths[GMP_MD_PATH], undefined, "no stub /gmp-md in OpenAPI without a cached body");
    assert.equal(spec.paths[GMP_MD_MANIFEST_PATH], undefined);
    assert.equal(spec.paths["/gain"], undefined);
    assert.equal(
      Object.keys(spec.paths).filter((p) => spec.paths[p].get?.["x-payment-info"]).length,
      29,
      "OpenAPI lists the twenty-nine always-public paid paths",
    );

    const llms = await fetch(`${base}${LLMS_PATH}`);
    assert.equal(llms.status, 200);
    const llmsBody = await llms.text();
    assert.ok(llmsBody.includes("GET /ticks"));
    assert.ok(llmsBody.includes("GET /import-alerts"));
    assert.ok(llmsBody.includes("GET /mariners"));
    assert.ok(llmsBody.includes("GET /mariners-d11"));
    assert.ok(llmsBody.includes("GET /mariners-d7"));
    assert.ok(llmsBody.includes("GET /mariners-d8"));
    assert.ok(llmsBody.includes("GET /warning-letters"));
    assert.ok(llmsBody.includes("GET /untitled-letters"));
    assert.ok(llmsBody.includes("GET /awa"));
    assert.ok(llmsBody.includes("GET /swisspar"));
    assert.ok(llmsBody.includes("GET /pcac"));
    assert.ok(llmsBody.includes("GET /ftc-wl"));
    assert.ok(llmsBody.includes("GET /cfpb-orders"));
    assert.ok(llmsBody.includes("GET /occ-cd"));
    assert.ok(llmsBody.includes("GET /fdic-orders"));
    assert.ok(llmsBody.includes("GET /frb-orders"));
    assert.ok(llmsBody.includes("GET /ncua-orders"));
    assert.ok(llmsBody.includes("GET /fincen-orders"));
    assert.ok(llmsBody.includes("GET /ferc-orders"));
    assert.ok(llmsBody.includes("GET /ofac-orders"));
    assert.ok(llmsBody.includes("GET /bis-orders"));
    assert.ok(llmsBody.includes("GET /cftc-orders"));
    assert.ok(llmsBody.includes("GET /fifra-orders"));
    assert.ok(llmsBody.includes("GET /denovo-orders"));
    assert.ok(llmsBody.includes("GET /ttb-oic"));
    assert.ok(llmsBody.includes("GET /air-letters"));
    assert.ok(llmsBody.includes("GET /superfund-rods"));
    assert.ok(llmsBody.includes("GET /ico-mpn"));
    assert.ok(llmsBody.includes("GET /cma-ca98"));
    assert.ok(!llmsBody.includes("GET /form-483"));
    assert.ok(!llmsBody.includes("GET /gmp"));
    assert.ok(!llmsBody.includes("GET /gmp-md"));
    assert.ok(!llmsBody.toLowerCase().includes("/gain"));
    assert.ok(!llmsBody.includes("WASDE"));
    assert.ok(llmsBody.includes(X402SCAN_SERVER_URL));
    assert.ok(!llmsBody.includes("TCPA"));

    const shop = (await (await fetch(`${base}/`)).json()) as {
      products: { path: string }[];
      openapi?: string;
      wellKnown?: string;
      llmsTxt?: string;
    };
    assert.deepEqual(shop.products.map((p) => p.path), [
      TICKS_PATH,
      IMPORT_ALERTS_PATH,
      MARINERS_PATH,
      MARINERS_D11_PATH,
      MARINERS_D7_PATH,
      MARINERS_D8_PATH,
      WARNING_LETTERS_PATH,
      UNTITLED_LETTERS_PATH,
      AWA_PATH,
      SWISSPAR_PATH,
      PCAC_PATH,
      FTC_WL_PATH,
      CFPB_ORDERS_PATH,
      OCC_CD_PATH,
      FDIC_ORDERS_PATH,
      FRB_ORDERS_PATH,
      NCUA_ORDERS_PATH,
      FINCEN_ORDERS_PATH,
      FERC_ORDERS_PATH,
      OFAC_ORDERS_PATH,
      BIS_ORDERS_PATH,
      CFTC_ORDERS_PATH,
      FIFRA_ORDERS_PATH,
      DENOVO_ORDERS_PATH,
      TTB_OIC_PATH,
      AIR_LETTERS_PATH,
      SUPERFUND_RODS_PATH,
      ICO_MPN_PATH,
      CMA_CA98_PATH,
    ]);
    assert.ok(!shop.products.some((p) => p.path === FORM_483_PATH));
    assert.ok(!shop.products.some((p) => p.path === GMP_PATH));
    assert.ok(!shop.products.some((p) => p.path === GMP_MD_PATH));
    assert.equal(shop.openapi, OPENAPI_PATH);
    assert.equal(shop.wellKnown, WELL_KNOWN_PATH);
    assert.equal(shop.llmsTxt, LLMS_PATH);
  });

  const dir = mkdtempSync(join(tmpdir(), "idaho-ticks-"));
  writeFileSync(
    join(dir, "board.json"),
    JSON.stringify({
      fetchedAt: "2026-08-12T00:00:00Z",
      rows: [],
      failed: [],
      history: { points: [], emptyReports: [], series: [] },
    }),
  );

  await withServer(
    { TICKS_DIR: dir, X402_SKIP_SETTLE: "1", X402_USDC_ATOMIC: "", FORM_483_DIR: join(tmpdir(), "form-483-absent-ticks-") },
    async (base) => {
      const unpaid = await fetch(`${base}${TICKS_PATH}`);
      assert.equal(unpaid.status, 402);
      const paid = await fetch(`${base}${TICKS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const body = (await paid.json()) as ReturnType<typeof loadTicks>;
      assert.equal(body.product, "idaho-hay-feeder-ticks");
      assert.equal(body.status, "stale");
      assert.ok(body.reason);
      assert.deepEqual(body.ticks, []);
    },
  );

  const histOnly = mkdtempSync(join(tmpdir(), "ticks-hist-"));
  writeFileSync(
    join(histOnly, "history.json"),
    JSON.stringify({
      points: [
        {
          series: "cattle-bf-feeder-steer",
          reportDate: "2026-08-07",
          price: 419.59,
          source: "Blackfoot Livestock Auction representative sales",
          sourceUrl: "https://blackfootlivestockauction.com/representative-sales/",
          unit: "$/cwt",
          group: "cattle",
          commodity: "Feeder steers",
        },
        {
          series: "cattle-bf-feeder-steer",
          reportDate: "2026-08-14",
          collectedAt: "2026-08-17T19:28:42Z",
          price: 376.57,
          source: "Blackfoot Livestock Auction representative sales",
          sourceUrl: "https://blackfootlivestockauction.com/representative-sales/",
          unit: "$/cwt",
          group: "cattle",
          commodity: "Feeder steers",
        },
        {
          series: "cattle-bf-feeder-heifer",
          reportDate: "2026-08-14",
          price: 347.4,
          source: "Blackfoot Livestock Auction representative sales",
          unit: "$/cwt",
          group: "cattle",
          commodity: "Feeder heifers",
        },
        {
          series: "cattle-bf-yearling-heifer",
          reportDate: "2026-08-14",
          price: 300.0,
          source: "Blackfoot Livestock Auction representative sales",
          unit: "$/cwt",
          group: "cattle",
          commodity: "Yearling heifers",
        },
        {
          series: "cattle-bf-cull-cow",
          reportDate: "2026-08-14",
          price: 167.36,
          source: "Blackfoot Livestock Auction representative sales",
          unit: "$/cwt",
          group: "cattle",
          commodity: "Cull cows",
        },
        {
          series: "cattle-bf-bull",
          reportDate: "2026-08-14",
          price: 203.5,
          source: "Blackfoot Livestock Auction representative sales",
          unit: "$/cwt",
          group: "cattle",
          commodity: "Bulls",
        },
        {
          series: "hay-id-organic-alfalfa",
          reportDate: "2026-08-06",
          price: 200,
          source: "USDA AMS Idaho Direct Hay Report (AMS_3056)",
          group: "hay",
          commodity: "Alfalfa",
          kind: "organic",
        },
      ],
      emptyReports: [],
      series: [],
    }),
  );

  await withServer(
    { TICKS_DIR: histOnly, X402_SKIP_SETTLE: "1", X402_USDC_ATOMIC: "", FORM_483_DIR: join(tmpdir(), "form-483-absent-hist-") },
    async (base) => {
      const unpaid = await fetch(`${base}${TICKS_PATH}`);
      assert.equal(unpaid.status, 402);
      const paid = await fetch(`${base}${TICKS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const body = (await paid.json()) as ReturnType<typeof loadTicks>;
      const byId = Object.fromEntries(
        (body.ticks as { id?: string; price?: number; asOf?: string }[]).map((row) => [row.id, row]),
      );
      assert.equal(byId["cattle-bf-feeder-steer"]?.price, 376.57);
      assert.equal(byId["cattle-bf-feeder-steer"]?.asOf, "2026-08-14");
      assert.equal(byId["cattle-bf-feeder-heifer"]?.price, 347.4);
      assert.equal(byId["cattle-bf-yearling-heifer"]?.price, 300);
      assert.equal(byId["cattle-bf-cull-cow"]?.price, 167.36);
      assert.equal(byId["cattle-bf-bull"]?.price, 203.5);
      assert.ok(!body.ticks.some((row) => /organic/i.test(JSON.stringify(row))));
    },
  );

  const memoDir = mkdtempSync(join(tmpdir(), "ticks-memo-"));
  writeFileSync(
    join(memoDir, "board.json"),
    JSON.stringify({
      fetchedAt: "2026-08-17T00:00:00Z",
      rows: [
        {
          id: "cattle-tf-feeder-steer",
          group: "cattle",
          commodity: "Feeder steers",
          market: "Twin Falls",
          unit: "$/cwt",
          price: 400.2,
          asOf: "2026-08-12",
          source: "Twin Falls Livestock Commission market report",
        },
      ],
      failed: [
        {
          id: "hay-idaho-organic",
          reason:
            "No report. This report has no organic row. USDA printed no organic hay trade. We are not inventing a number and not reusing an older organic price as current.",
        },
      ],
      history: {
        points: [],
        series: [
          { id: "cattle-tf-feeder-steer", label: "Twin Falls feeder steers", group: "cattle" },
          { id: "hay-id-organic-alfalfa", label: "USDA organic (Idaho)", group: "hay" },
        ],
        emptyReports: [
          {
            series: "hay-id-organic-alfalfa",
            reason:
              "No report. This report has no organic row. USDA printed no organic hay trade. We are not inventing a number and not reusing an older organic price as current.",
          },
          {
            id: "ams_3056-current",
            reason: "No report. HTTP Error 403: Forbidden",
          },
        ],
      },
    }),
  );

  await withServer(
    { TICKS_DIR: memoDir, X402_SKIP_SETTLE: "1", X402_USDC_ATOMIC: "20000", FORM_483_DIR: join(tmpdir(), "form-483-absent-memo-") },
    async (base) => {
      const paid = await fetch(`${base}${TICKS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as ReturnType<typeof loadTicks>;
      assert.ok(!paidBody.ticks.some((row) => /organic/i.test(JSON.stringify(row))));
      assert.ok(!paidBody.failed.some((row) => /organic/i.test(JSON.stringify(row))));
      assert.ok(!paidBody.history.series.some((row) => /organic/i.test(JSON.stringify(row))));
      assert.deepEqual(paidBody.history.emptyReports, [{ id: "ams_3056-current", status: "empty" }]);
      const manifest = await (await fetch(`${base}${MANIFEST_PATH}`)).json() as {
        empty?: { id?: string; status?: string; reason?: string; name?: string }[];
      };
      const catalog = await (await fetch(`${base}${CATALOG_PATH}`)).json();
      const blob = `${JSON.stringify(paidBody)}${JSON.stringify(manifest)}${JSON.stringify(catalog)}`;
      assert.equal(/we are not inventing|this report has no organic row|usda organic/i.test(blob), false);
      assert.ok((manifest.empty ?? []).every((e) => e.status === "empty" && e.id && !("reason" in e)));
      assert.ok(!(manifest.empty ?? []).some((e) => /organic/i.test(`${e.id ?? ""} ${e.name ?? ""}`)));
    },
  );

  const liveBoard = join(DEFAULT_TICKS_DIR, "board.json");
  if (existsSync(liveBoard)) {
    await withServer(
      { TICKS_DIR: DEFAULT_TICKS_DIR, X402_SKIP_SETTLE: "1", X402_USDC_ATOMIC: "", FORM_483_DIR: join(tmpdir(), "form-483-absent-default-") },
      async (base) => {
        const unpaid = await fetch(`${base}${TICKS_PATH}`);
        assert.equal(unpaid.status, 402);
        const paid = await fetch(`${base}${TICKS_PATH}`, { headers: { "X-PAYMENT": "test" } });
        assert.equal(paid.status, 200);
        const body = (await paid.json()) as ReturnType<typeof loadTicks>;
        const blob = JSON.stringify(body).toLowerCase();
        for (const marker of ["twin falls", "blackfoot", "ams_3056", "ams_3059", "ibc.id.grain", "wd1.", "hay.ams_3058", "ams.2914"]) {
          assert.ok(blob.includes(marker), `paid JSON must include ${marker} when cache exists`);
        }
        assert.ok(body.ticks.length + body.history.points.length > 0, "real ticks present");
        const ticksManifest = await fetch(`${base}${MANIFEST_PATH}`);
        assert.equal(ticksManifest.status, 200);
        const catalogRes = await fetch(`${base}${CATALOG_PATH}`);
        assert.equal(catalogRes.status, 200);
        const tm = (await ticksManifest.json()) as {
          tickCount: number;
          empty?: { id?: string; status?: string; reason?: string; name?: string }[];
        };
        const catalogBody = await catalogRes.json();
        assert.equal(tm.tickCount, body.ticks.length);
        const publicCopy = `${JSON.stringify(tm)}${JSON.stringify(catalogBody)}${JSON.stringify(body)}`.toLowerCase();
        assert.ok(!publicCopy.includes("inventing"), "unpaid catalog/manifest and paid body must not include collect-policy prose");
        assert.ok(!publicCopy.includes("usda organic"), "organic hay is not a product");
        assert.ok(!publicCopy.includes("we are not inventing"), "must not include first-person collect notes");
        assert.ok(!(tm.empty ?? []).some((e) => /organic/i.test(`${e.id ?? ""} ${e.name ?? ""} ${e.reason ?? ""}`)));
        assert.ok((tm.empty ?? []).every((e) => e.status === "empty" && e.id && !("reason" in e)));
        assert.ok(!body.ticks.some((row) => /organic/i.test(String((row as Record<string, unknown>).id ?? ""))));
        for (const row of body.history.emptyReports as Record<string, unknown>[]) {
          assert.deepEqual(Object.keys(row).sort(), ["id", "status"]);
          assert.equal(row.status, "empty");
          assert.ok(!/organic/i.test(String(row.id ?? "")));
        }
      },
    );
  }

  const iaDir = mkdtempSync(join(tmpdir(), "import-alerts-"));
  writeFileSync(
    join(iaDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "fda-import-alerts",
      status: "ok",
      reason: null,
      fetchedAt: "2026-08-17T00:00:00.000Z",
      asOf: "2026-08-17",
      sources: {
        catalog: "https://www.accessdata.fda.gov/cms_ia/ialist.html",
        byDate: "https://www.accessdata.fda.gov/cms_ia/iapublishdate.html",
        pattern: "https://www.accessdata.fda.gov/cms_ia/importalert_{id}.html",
      },
      catalog: [
        {
          alertNumber: "16-81",
          type: "DWPE",
          name: "Detention Without Physical Examination of Seafood Products Due to the Presence of Salmonella",
          datePublished: "08/17/2026",
          sourceUrl: "https://www.accessdata.fda.gov/cms_ia/importalert_49.html",
          pageId: "49",
          firstSlice: true,
        },
      ],
      alerts: [],
      ticks: [
        {
          alertNumber: "16-81",
          type: "DWPE",
          name: "Detention Without Physical Examination of Seafood Products Due to the Presence of Salmonella",
          list: "red",
          firm: "Clover Valley Meat Co.",
          country: "AUSTRALIA",
          product: "Alligator & Crocodile, Other Aquatic Species",
          datePublished: "06/08/2012",
          sourceUrl: "https://www.accessdata.fda.gov/cms_ia/importalert_49.html",
          asOf: "2026-08-17",
        },
      ],
    }),
  );

  await withServer(
    {
      IMPORT_ALERTS_DIR: iaDir,
      IMPORT_ALERTS_TTL_MS: String(24 * 3600 * 1000),
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-ia-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${IMPORT_ALERTS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /import-alerts must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; payTo: string }[];
      };
      assert.equal(body402.payTo, PAY_TO);
      assert.equal(body402.asset, USDC_BASE);
      assert.equal(body402.resource, IMPORT_ALERTS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, IMPORT_ALERTS_AMOUNT_ATOMIC);
      const iaPr = unpaid.headers.get("payment-required");
      assert.ok(iaPr, "v2 PAYMENT-REQUIRED header");
      const iaV2 = JSON.parse(Buffer.from(iaPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(iaV2.extensions?.bazaar?.info?.input?.method, "GET");

      const ticksUnpaid = await fetch(`${base}${TICKS_PATH}`);
      assert.equal(ticksUnpaid.status, 402);
      const ticks402 = (await ticksUnpaid.json()) as { accepts: { maxAmountRequired?: string }[] };
      assert.equal(ticks402.accepts[0]?.maxAmountRequired, TICKS_AMOUNT_ATOMIC);

      const manifest = await fetch(`${base}${IMPORT_ALERTS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "unpaid manifest is free");
      const man = (await manifest.json()) as {
        free: boolean;
        samples: { sample?: boolean; firm?: string }[];
        catalog: unknown[];
        schema: { fields: string[] };
      };
      assert.equal(man.free, true);
      assert.ok(man.catalog.length >= 1);
      assert.ok(man.samples.every((s) => s.sample === true));
      assert.ok(man.samples.length <= 2);
      assert.ok(!JSON.stringify(man).includes("phone"));
      assert.equal((man as { tickCount?: number }).tickCount, 1);

      const paid = await fetch(`${base}${IMPORT_ALERTS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        ticks: { firm: string; list: string }[];
      };
      assert.equal(paidBody.product, "fda-import-alerts");
      assert.equal(paidBody.ticks[0]?.firm, "Clover Valley Meat Co.");
      assert.equal(paidBody.ticks[0]?.list, "red");
    },
  );

  const marinersDir = mkdtempSync(join(tmpdir(), "mariners-"));
  writeFileSync(
    join(marinersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "uscg-d13-lnm",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-08-12",
      week: "32-2026",
      year: 2026,
      edition: "32-2026",
      district: "13",
      districtName: "Northwest",
      sources: {
        listing: "https://www.navcen.uscg.gov/local-notices-to-mariners?district=13+0&subdistrict=n",
        pdfPattern: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13{WW}{YYYY}.pdf",
        pdfUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
      },
      editions: [
        {
          week: 32,
          year: 2026,
          edition: "32-2026",
          href: "/sites/default/files/pdf/lnms/lnm13322026.pdf",
          sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
        },
      ],
      notices: [
        {
          week: "32-2026",
          section: "Federal Discrepancies",
          waterway: "Anacortes Harbor",
          text: "Anacortes Channel Light 4 LLNR 19055 TRLB/STRUCT MISSING/STRUCT DEST FD",
          sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm13322026.pdf",
        },
      ],
    }),
  );

  await withServer(
    {
      MARINERS_DIR: marinersDir,
      MARINERS_TTL_MS: String(24 * 3600 * 1000),
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-lnm-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${MARINERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /mariners must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; payTo: string }[];
      };
      assert.equal(body402.payTo, PAY_TO);
      assert.equal(body402.asset, USDC_BASE);
      assert.equal(body402.resource, MARINERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, MARINERS_AMOUNT_ATOMIC);
      const lnmPr = unpaid.headers.get("payment-required");
      assert.ok(lnmPr, "v2 PAYMENT-REQUIRED header");
      const lnmV2 = JSON.parse(Buffer.from(lnmPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string }; output?: { example?: unknown } } } };
      };
      assert.equal(lnmV2.extensions?.bazaar?.info?.input?.method, "GET");
      assert.ok(lnmV2.extensions?.bazaar?.info?.output?.example);

      const ticksUnpaid = await fetch(`${base}${TICKS_PATH}`);
      assert.equal(ticksUnpaid.status, 402);
      const ticks402 = (await ticksUnpaid.json()) as { accepts: { maxAmountRequired?: string }[] };
      assert.equal(ticks402.accepts[0]?.maxAmountRequired, TICKS_AMOUNT_ATOMIC);

      const iaUnpaid = await fetch(`${base}${IMPORT_ALERTS_PATH}`);
      assert.equal(iaUnpaid.status, 402);

      const manifest = await fetch(`${base}${MARINERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "unpaid mariners manifest is free");
      const man = (await manifest.json()) as {
        free: boolean;
        noticeCount?: number;
        week?: string;
        sources?: { pdfUrl?: string };
      };
      assert.equal(man.free, true);
      assert.equal(man.noticeCount, 1);
      assert.equal(man.week, "32-2026");
      assert.ok(man.sources?.pdfUrl?.includes("lnm13322026.pdf"));
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("Anacortes Channel Light 4"), "free manifest must not dump notice body");
      assert.ok(!manBlob.includes("organic"));
      assert.ok(!manBlob.includes("inventing"));

      const root = await fetch(`${base}/`);
      const shop = (await root.json()) as {
        products: { path: string; priceUsdc: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.ok(shop.products.some((p) => p.path === MARINERS_PATH && p.priceUsdc === "0.05"));
      assert.ok(shop.products.some((p) => p.path === MARINERS_D11_PATH && p.priceUsdc === "0.05"));
      assert.ok(shop.products.some((p) => p.path === MARINERS_D7_PATH && p.priceUsdc === "0.05"));
      assert.ok(shop.products.some((p) => p.path === MARINERS_D8_PATH && p.priceUsdc === "0.05"));
      assert.ok(shop.products.some((p) => p.path === WARNING_LETTERS_PATH && p.priceUsdc === "0.05"));
      assert.ok(shop.products.some((p) => p.path === UNTITLED_LETTERS_PATH && p.priceUsdc === "0.05"));
      assert.ok(shop.products.some((p) => p.path === AWA_PATH && p.priceUsdc === "0.05"));
      assert.ok(shop.products.some((p) => p.path === SWISSPAR_PATH && p.priceUsdc === "0.05"));
      assert.ok(shop.products.some((p) => p.path === PCAC_PATH && p.priceUsdc === "0.05"));
      assert.ok(shop.products.some((p) => p.path === FTC_WL_PATH && p.priceUsdc === "0.05"));
      assert.ok(shop.products.some((p) => p.path === CFPB_ORDERS_PATH && p.priceUsdc === "0.05"));
      assert.ok(shop.products.some((p) => p.path === OCC_CD_PATH && p.priceUsdc === "0.05"));
      assert.ok(shop.products.some((p) => p.path === FDIC_ORDERS_PATH && p.priceUsdc === "0.05"));
      assert.equal(shop.products.length, 29);
      assert.equal(shop.openapi, OPENAPI_PATH);
      assert.equal(shop.wellKnown, WELL_KNOWN_PATH);

      const iaMan = (await (await fetch(`${base}${IMPORT_ALERTS_MANIFEST_PATH}`)).json()) as {
        openapi?: string;
        wellKnown?: string;
      };
      assert.ok(iaMan.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(iaMan.wellKnown?.endsWith(WELL_KNOWN_PATH));

      const paid = await fetch(`${base}${MARINERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        notices: { text: string; section: string }[];
      };
      assert.equal(paidBody.product, "uscg-d13-lnm");
      assert.equal(paidBody.notices[0]?.section, "Federal Discrepancies");
      assert.ok(paidBody.notices[0]?.text.includes("Anacortes Channel Light 4"));
    },
  );

  const marinersD11Dir = mkdtempSync(join(tmpdir(), "mariners-d11-"));
  writeFileSync(
    join(marinersD11Dir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "uscg-d11-lnm",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-08-12",
      week: "32-2026",
      year: 2026,
      edition: "32-2026",
      district: "11",
      districtName: "Southwest",
      sources: {
        listing: "https://www.navcen.uscg.gov/local-notices-to-mariners?district=11+0&subdistrict=n",
        pdfPattern: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm11{WW}{YYYY}.pdf",
        pdfUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm11322026.pdf",
      },
      editions: [
        {
          week: 32,
          year: 2026,
          edition: "32-2026",
          href: "/sites/default/files/pdf/lnms/lnm11322026.pdf",
          sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm11322026.pdf",
        },
      ],
      notices: [
        {
          week: "32-2026",
          section: "Federal Discrepancies",
          waterway: "Berkeley",
          text: "Berkeley Marina Channel Light 2 LLNR 5430 LT EXT FD",
          sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm11322026.pdf",
        },
      ],
    }),
  );

  await withServer(
    {
      MARINERS_D11_DIR: marinersD11Dir,
      MARINERS_D11_TTL_MS: String(24 * 3600 * 1000),
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-lnm-d11-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${MARINERS_D11_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /mariners-d11 must be 402");
      const body402 = (await unpaid.json()) as {
        resource: string;
        accepts: { maxAmountRequired?: string }[];
      };
      assert.equal(body402.resource, MARINERS_D11_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, MARINERS_AMOUNT_ATOMIC);

      const d13Unpaid = await fetch(`${base}${MARINERS_PATH}`);
      assert.equal(d13Unpaid.status, 402, "D11 door must not replace GET /mariners");

      const manifest = await fetch(`${base}${MARINERS_D11_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "unpaid D11 mariners manifest is free");
      const man = (await manifest.json()) as {
        free: boolean;
        product?: string;
        noticeCount?: number;
        week?: string;
        asOf?: string;
        district?: string;
      };
      assert.equal(man.free, true);
      assert.equal(man.product, "uscg-d11-lnm");
      assert.equal(man.district, "11");
      assert.equal(man.noticeCount, 1);
      assert.equal(man.week, "32-2026");
      assert.equal(man.asOf, "2026-08-12");
      assert.ok(!JSON.stringify(man).includes("Berkeley Marina Channel Light 2"));

      const paid = await fetch(`${base}${MARINERS_D11_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        district?: string;
        notices: { text: string; section: string }[];
      };
      assert.equal(paidBody.product, "uscg-d11-lnm");
      assert.equal(paidBody.district, "11");
      assert.equal(paidBody.notices[0]?.section, "Federal Discrepancies");
      assert.ok(paidBody.notices[0]?.text.includes("Berkeley Marina Channel Light 2"));
    },
  );

  const marinersD7Dir = mkdtempSync(join(tmpdir(), "mariners-d7-"));
  writeFileSync(
    join(marinersD7Dir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "uscg-d7-lnm",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-08-12",
      week: "32-2026",
      year: 2026,
      edition: "32-2026",
      district: "7",
      districtName: "Southeast",
      sources: {
        listing: "https://www.navcen.uscg.gov/local-notices-to-mariners?district=7+0&subdistrict=n",
        pdfPattern: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm07{WW}{YYYY}.pdf",
        pdfUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm07322026.pdf",
      },
      editions: [
        {
          week: 32,
          year: 2026,
          edition: "32-2026",
          href: "/sites/default/files/pdf/lnms/lnm07322026.pdf",
          sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm07322026.pdf",
        },
      ],
      notices: [
        {
          week: "32-2026",
          section: "Federal Discrepancies",
          waterway: "Altamaha Sound",
          text: "Altamaha Sound Daybeacon 197 LLNR 36887 STRUCT DEST/TRUB FD",
          sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm07322026.pdf",
        },
      ],
    }),
  );

  await withServer(
    {
      MARINERS_D7_DIR: marinersD7Dir,
      MARINERS_D7_TTL_MS: String(24 * 3600 * 1000),
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-lnm-d7-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${MARINERS_D7_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /mariners-d7 must be 402");
      const body402 = (await unpaid.json()) as {
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, MARINERS_D7_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, MARINERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");

      const d13Unpaid = await fetch(`${base}${MARINERS_PATH}`);
      assert.equal(d13Unpaid.status, 402, "D7 door must not replace GET /mariners");
      const d11Unpaid = await fetch(`${base}${MARINERS_D11_PATH}`);
      assert.equal(d11Unpaid.status, 402, "D7 door must not replace GET /mariners-d11");

      const manifest = await fetch(`${base}${MARINERS_D7_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "unpaid D7 mariners manifest is free");
      const man = (await manifest.json()) as {
        free: boolean;
        product?: string;
        noticeCount?: number;
        week?: string;
        asOf?: string;
        district?: string;
      };
      assert.equal(man.free, true);
      assert.equal(man.product, "uscg-d7-lnm");
      assert.equal(man.district, "7");
      assert.equal(man.noticeCount, 1);
      assert.equal(man.week, "32-2026");
      assert.equal(man.asOf, "2026-08-12");
      assert.ok(!JSON.stringify(man).includes("Altamaha Sound Daybeacon 197"));

      const paid = await fetch(`${base}${MARINERS_D7_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        district?: string;
        notices: { text: string; section: string }[];
      };
      assert.equal(paidBody.product, "uscg-d7-lnm");
      assert.equal(paidBody.district, "7");
      assert.equal(paidBody.notices[0]?.section, "Federal Discrepancies");
      assert.ok(paidBody.notices[0]?.text.includes("Altamaha Sound Daybeacon 197"));
    },
  );

  const marinersD8Dir = mkdtempSync(join(tmpdir(), "mariners-d8-"));
  writeFileSync(
    join(marinersD8Dir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "uscg-d8-lnm",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-08-19",
      week: "33-2026",
      year: 2026,
      edition: "33-2026",
      district: "8",
      districtName: "Gulf",
      sources: {
        listing: "https://www.navcen.uscg.gov/local-notices-to-mariners?district=8+0&subdistrict=g",
        pdfPattern: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm08{WW}g{YYYY}.pdf",
        pdfUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm0833g2026.pdf",
      },
      editions: [
        {
          week: 33,
          year: 2026,
          edition: "33-2026",
          href: "/sites/default/files/pdf/lnms/lnm0833g2026.pdf",
          sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm0833g2026.pdf",
        },
      ],
      notices: [
        {
          week: "33-2026",
          section: "Federal Discrepancies",
          waterway: "Acadiana Navigation Channel",
          text: "Acadiana Navigation Channel Light 6 LLNR 20305 STRUCT DEST/TRLB FD",
          sourceUrl: "https://www.navcen.uscg.gov/sites/default/files/pdf/lnms/lnm0833g2026.pdf",
        },
      ],
    }),
  );

  await withServer(
    {
      MARINERS_D8_DIR: marinersD8Dir,
      MARINERS_D8_TTL_MS: String(24 * 3600 * 1000),
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-lnm-d8-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${MARINERS_D8_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /mariners-d8 must be 402");
      const body402 = (await unpaid.json()) as {
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, MARINERS_D8_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, MARINERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");

      const d13Unpaid = await fetch(`${base}${MARINERS_PATH}`);
      assert.equal(d13Unpaid.status, 402, "D8 door must not replace GET /mariners");
      const d11Unpaid = await fetch(`${base}${MARINERS_D11_PATH}`);
      assert.equal(d11Unpaid.status, 402, "D8 door must not replace GET /mariners-d11");
      const d7Unpaid = await fetch(`${base}${MARINERS_D7_PATH}`);
      assert.equal(d7Unpaid.status, 402, "D8 door must not replace GET /mariners-d7");

      const manifest = await fetch(`${base}${MARINERS_D8_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "unpaid D8 mariners manifest is free");
      const man = (await manifest.json()) as {
        free: boolean;
        product?: string;
        noticeCount?: number;
        week?: string;
        asOf?: string;
        district?: string;
      };
      assert.equal(man.free, true);
      assert.equal(man.product, "uscg-d8-lnm");
      assert.equal(man.district, "8");
      assert.equal(man.noticeCount, 1);
      assert.equal(man.week, "33-2026");
      assert.equal(man.asOf, "2026-08-19");
      assert.ok(!JSON.stringify(man).includes("Acadiana Navigation Channel Light 6"));

      const paid = await fetch(`${base}${MARINERS_D8_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        district?: string;
        notices: { text: string; section: string }[];
      };
      assert.equal(paidBody.product, "uscg-d8-lnm");
      assert.equal(paidBody.district, "8");
      assert.equal(paidBody.notices[0]?.section, "Federal Discrepancies");
      assert.ok(paidBody.notices[0]?.text.includes("Acadiana Navigation Channel Light 6"));
    },
  );

  const wlDir = mkdtempSync(join(tmpdir(), "warning-letters-"));
  writeFileSync(
    join(wlDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "fda-warning-letter-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-03-04",
      sources: {
        listing:
          "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters",
        letterBase:
          "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/",
      },
      letters: [
        {
          id: "citra100mg-722606-03042026",
          firm: "Citra100mg",
          cms: "722606",
          issuedOn: "2026-03-04",
          subject: "Unapproved New Drugs/Misbranded",
          issuingOffice: "Center for Drug Evaluation and Research",
          sourceUrl:
            "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/citra100mg-722606-03042026",
          body: "WARNING LETTER\nMarch 4, 2026\nRE: Notice of Unlawful Sale of Unapproved and Misbranded Drugs to United States Consumers Over the Internet\nThis is to advise you that the United States (U.S.) Food and Drug Administration (FDA) recently reviewed your website.",
        },
      ],
    }),
  );

  await withServer(
    {
      WARNING_LETTERS_DIR: wlDir,
      WARNING_LETTERS_TTL_MS: String(24 * 3600 * 1000),
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-wl-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${WARNING_LETTERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /warning-letters must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string }[];
      };
      assert.equal(body402.resource, WARNING_LETTERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, WARNING_LETTERS_AMOUNT_ATOMIC);
      const wlPr = unpaid.headers.get("payment-required");
      assert.ok(wlPr, "v2 PAYMENT-REQUIRED header");
      const wlV2 = JSON.parse(Buffer.from(wlPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(wlV2.extensions?.bazaar?.info?.input?.method, "GET");

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === WARNING_LETTERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === MARINERS_D8_PATH), true);
      assert.equal(shop.products.some((p) => p.path === UNTITLED_LETTERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === AWA_PATH), true);
      assert.equal(shop.products.some((p) => p.path === SWISSPAR_PATH), true);
      assert.equal(shop.products.some((p) => p.path === PCAC_PATH), true);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${WARNING_LETTERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "warning-letters free manifest is free");
      const man = (await manifest.json()) as {
        unlisted?: boolean;
        letterCount?: number;
        letters?: { firm?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.unlisted, undefined);
      assert.equal(man.letterCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.letters?.[0]?.firm, "Citra100mg");
      assert.ok(!JSON.stringify(man).includes("reviewed your website"));
      assert.ok(!("body" in (man.letters?.[0] ?? {})));

      const paid = await fetch(`${base}${WARNING_LETTERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        unlisted?: boolean;
        letters: { firm: string; issuedOn: string; subject: string; body: string }[];
      };
      assert.equal(paidBody.product, "fda-warning-letter-bodies");
      assert.equal(paidBody.unlisted, undefined);
      assert.equal(paidBody.letters[0]?.firm, "Citra100mg");
      assert.equal(paidBody.letters[0]?.issuedOn, "2026-03-04");
      assert.match(paidBody.letters[0]?.subject ?? "", /Unapproved New Drugs/);
      assert.ok(paidBody.letters[0]?.body.includes("WARNING LETTER"));
      assert.ok(paidBody.letters[0]?.body.includes("reviewed your website"));
    },
  );

  const ulDir = mkdtempSync(join(tmpdir(), "untitled-letters-"));
  writeFileSync(
    join(ulDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "fda-untitled-letter-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-04-28",
      license: "17 USC 105",
      sources: {
        cder: "https://www.fda.gov/drugs/warning-letters-and-notice-violation-letters-pharmaceutical-companies/untitled-letters",
        cber: "https://www.fda.gov/vaccines-blood-biologics/enforcement-actions-cber/untitled-letters-regarding-advertising-promotional-labeling-approved-biologics",
        hub: "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/issuance-untitled-letters",
        mediaBase: "https://www.fda.gov/media/",
      },
      cards: [
        {
          id: "bayer-healthcare-pharmaceuticals-inc-192241",
          mediaId: "192241",
          firm: "Bayer HealthCare Pharmaceuticals, Inc.",
          date: "2026-04-28",
          product: "NUBEQA® (darolutamide) tablets, for oral use",
          office: "OPDP",
          center: "CDER",
          sourceUrl: "https://www.fda.gov/media/192241/download",
          body: "The Office of Prescription Drug Promotion (OPDP) of the U.S. Food and Drug Administration (FDA) has reviewed the promotional communications, a direct-to-consumer (DTC) YouTube video (PP-NUB-US-4393-1) (video) and a Spanish language broadcast advertisement (PP-NUB-US-4601-1) (TV ad) for NUBEQA (darolutamide) tablets, for oral use (Nubeqa) submitted by Bayer HealthCare Pharmaceuticals, Inc. (Bayer) under cover of Form FDA 2253. FDA has determined that the video and TV ad are false or misleading. Thus, the video and TV ad misbrand Nubeqa and make the distribution of the drug in violation of the Federal Food, Drug, and Cosmetic Act (FD&C Act). The video and TV ad are misleading because they include claims and representations about the benefits of Nubeqa but omit important risk information associated with the drug.",
          cites: ["FD&C Act"],
          said: "FDA has determined that the video and TV ad are false or misleading. Thus, the video and TV ad misbrand Nubeqa and make the distribution of the drug in violation of the Federal Food, Drug, and Cosmetic Act (FD&C Act).",
        },
      ],
    }),
  );

  await withServer(
    {
      UNTITLED_LETTERS_DIR: ulDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-ul-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${UNTITLED_LETTERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /untitled-letters must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string }[];
      };
      assert.equal(body402.resource, UNTITLED_LETTERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, UNTITLED_LETTERS_AMOUNT_ATOMIC);
      const ulPr = unpaid.headers.get("payment-required");
      assert.ok(ulPr, "v2 PAYMENT-REQUIRED header");
      const ulV2 = JSON.parse(Buffer.from(ulPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(ulV2.extensions?.bazaar?.info?.input?.method, "GET");

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === UNTITLED_LETTERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === WARNING_LETTERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === AWA_PATH), true);
      assert.equal(shop.products.some((p) => p.path === SWISSPAR_PATH), true);
      assert.equal(shop.products.some((p) => p.path === PCAC_PATH), true);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${UNTITLED_LETTERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "untitled-letters free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { firm?: string; body?: string; cites?: unknown; said?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.firm, "Bayer HealthCare Pharmaceuticals, Inc.");
      assert.ok(!JSON.stringify(man).includes("Office of Prescription Drug Promotion"));
      assert.ok(!JSON.stringify(man).includes("false or misleading"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));
      assert.ok(!("cites" in (man.cards?.[0] ?? {})));
      assert.ok(!("said" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${UNTITLED_LETTERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { firm: string; date: string; product: string; body: string; cites: string[]; said: string }[];
      };
      assert.equal(paidBody.product, "fda-untitled-letter-bodies");
      assert.equal(paidBody.cards[0]?.firm, "Bayer HealthCare Pharmaceuticals, Inc.");
      assert.equal(paidBody.cards[0]?.date, "2026-04-28");
      assert.match(paidBody.cards[0]?.product ?? "", /NUBEQA/);
      assert.ok(paidBody.cards[0]?.body.includes("Office of Prescription Drug Promotion"));
      assert.ok(paidBody.cards[0]?.said.includes("false or misleading"));
      assert.ok(paidBody.cards[0]?.cites.includes("FD&C Act"));
    },
  );

  const awaDir = mkdtempSync(join(tmpdir(), "awa-"));
  writeFileSync(
    join(awaDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "aphis-awa-inspection-observation-text",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-07-07",
      license: "17 USC 105",
      sources: {
        index: "https://aphis.my.site.com/PublicSearchTool/s/inspection-reports",
        aura: "https://aphis.my.site.com/PublicSearchTool/s/sfsites/aura",
        pdfHost: "https://aphis.file.force.com/sfc/dist/version/download/",
        hub: "https://www.aphis.usda.gov/awa/public-search",
      },
      cards: [
        {
          id: "utah-state-university-068SJ00001KXrsj",
          contentId: "068SJ00001KXrsj",
          firm: "Utah State University",
          date: "2026-07-07",
          certificate: "87-R-0002",
          customerNumber: "2",
          inspectionId: "INS-0001617878",
          inspectionType: "ROUTINE INSPECTION",
          sourceUrl:
            "https://aphis.file.force.com/sfc/dist/version/download/?oid=00Dt0000000GyZH&ids=068SJ00001KXrsj&asPdf=false",
          body: "United States Department of Agriculture\nAnimal and Plant Health Inspection Service\nINS-0001617878\nInspection Report\nUtah State University\n2.31(c)(7) Critical\nInstitutional Animal Care and Use Committee (IACUC).\n82 naked mole rats were euthanized by a method not on the approved protocol.\nThis inspection and exit interview were conducted with facility representative.",
          observations: [
            {
              cite: "2.31(c)(7)",
              severity: "Critical",
              title: "Institutional Animal Care and Use Committee (IACUC).",
              text: "82 naked mole rats were euthanized by a method not on the approved protocol.",
            },
          ],
        },
      ],
    }),
  );

  await withServer(
    {
      AWA_DIR: awaDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-awa-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${AWA_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /awa must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string }[];
      };
      assert.equal(body402.resource, AWA_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, AWA_AMOUNT_ATOMIC);
      const awaPr = unpaid.headers.get("payment-required");
      assert.ok(awaPr, "v2 PAYMENT-REQUIRED header");
      const awaV2 = JSON.parse(Buffer.from(awaPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(awaV2.extensions?.bazaar?.info?.input?.method, "GET");

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === AWA_PATH), true);
      assert.equal(shop.products.some((p) => p.path === UNTITLED_LETTERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.some((p) => p.path === SWISSPAR_PATH), true);
      assert.equal(shop.products.some((p) => p.path === PCAC_PATH), true);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${AWA_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "awa free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { firm?: string; body?: string; observations?: unknown }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.firm, "Utah State University");
      assert.ok(!JSON.stringify(man).includes("naked mole rats"));
      assert.ok(!JSON.stringify(man).includes("Institutional Animal Care"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));
      assert.ok(!("observations" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${AWA_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { firm: string; date: string; body: string; observations: { cite: string }[] }[];
      };
      assert.equal(paidBody.product, "aphis-awa-inspection-observation-text");
      assert.equal(paidBody.cards[0]?.firm, "Utah State University");
      assert.equal(paidBody.cards[0]?.date, "2026-07-07");
      assert.ok(paidBody.cards[0]?.body.includes("naked mole rats"));
      assert.ok(paidBody.cards[0]?.observations.some((o) => o.cite === "2.31(c)(7)"));
    },
  );

  const swissparDir = mkdtempSync(join(tmpdir(), "swisspar-"));
  writeFileSync(
    join(swissparDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "swisspar-first-auth",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-08-18",
      license: "CopA Art. 5 para. 1 let. c",
      attribution: "Swissmedic",
      sources: {
        index: "https://www.swissmedic.ch/swissmedic/en/home/humanarzneimittel/authorisations/swisspar.html",
        pdfHost: "https://www.swissmedic.ch/dam/swissmedic/",
        faq: "https://www.swissmedic.ch/swissmedic/en/home/humanarzneimittel/authorisations/swisspar.html",
      },
      cards: [
        {
          id: "rhapsido-70227",
          name: "Rhapsido",
          inn: "remibrutinib",
          ma: "70227",
          date: "2026-08-18",
          holder: "Novartis Pharma Schweiz AG",
          sourceUrl:
            "https://www.swissmedic.ch/dam/swissmedic/en/dokumente/zulassung/swisspar/70227-rhapsido-01-swisspar-20280818.pdf.download.pdf/SwissPAR_inkl.%20FI_Rhapsido.pdf",
          body: "Date: 18 August 2026\nSwissmedic, Swiss Agency for Therapeutic Products\nSwiss Public Assessment Report\nRhapsido\nInternational non-proprietary name: remibrutinib\nMarketing authorisation no.: 70227\n6 Clinical aspects\nTwo identically designed pivotal Phase 3 studies, REMIX-1 (A2301) and REMIX-2 (A2302), were conducted in adult patients with CSU.\n6.5 Final clinical benefit-risk assessment\nOverall, the benefit/risk ratio for remibrutinib was assessed as positive for adult patients with CSU who are inadequately controlled by second-generation H1-antihistamines.\n7 Risk management plan summary\nThe RMP summaries contain information on the medicinal products' safety profiles.",
        },
      ],
    }),
  );

  await withServer(
    {
      SWISSPAR_DIR: swissparDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-swisspar-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${SWISSPAR_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /swisspar must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, SWISSPAR_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, SWISSPAR_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const swissPr = unpaid.headers.get("payment-required");
      assert.ok(swissPr, "v2 PAYMENT-REQUIRED header");
      const swissV2 = JSON.parse(Buffer.from(swissPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(swissV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("benefit/risk ratio for remibrutinib"));
      assert.ok(!leak402.includes("REMIX-1"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === SWISSPAR_PATH), true);
      assert.equal(shop.products.some((p) => p.path === AWA_PATH), true);
      assert.equal(shop.products.some((p) => p.path === UNTITLED_LETTERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.some((p) => p.path === PCAC_PATH), true);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${SWISSPAR_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "swisspar free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { name?: string; ma?: string; date?: string; body?: string; inn?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.name, "Rhapsido");
      assert.equal(man.cards?.[0]?.ma, "70227");
      assert.equal(man.cards?.[0]?.date, "2026-08-18");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("benefit/risk ratio for remibrutinib"));
      assert.ok(!manBlob.includes("REMIX-1"));
      assert.ok(!manBlob.includes("REMIX-2"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));
      assert.ok(!("inn" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${SWISSPAR_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { name: string; date: string; ma: string; body: string }[];
      };
      assert.equal(paidBody.product, "swisspar-first-auth");
      assert.equal(paidBody.cards[0]?.name, "Rhapsido");
      assert.equal(paidBody.cards[0]?.date, "2026-08-18");
      assert.equal(paidBody.cards[0]?.ma, "70227");
      assert.ok(paidBody.cards[0]?.body.includes("benefit/risk ratio for remibrutinib"));
      assert.ok(paidBody.cards[0]?.body.includes("REMIX-1"));
    },
  );

  const pcacDir = mkdtempSync(join(tmpdir(), "pcac-"));
  writeFileSync(
    join(pcacDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "fda-pcac-503a-memos",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-07-24",
      license: "17 USC 105",
      attribution: "FDA",
      sources: {
        meeting:
          "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026",
        frNotice: "https://www.govinfo.gov/content/pkg/FR-2026-04-16/html/2026-07361.htm",
        docket: "FDA-2025-N-6895",
        mediaBase: "https://www.fda.gov/media/",
      },
      cards: [
        {
          id: "emideltide-193344",
          substance: "Emideltide",
          date: "2026-05-11",
          meeting: "July 23-24, 2026",
          mediaId: "193344",
          sourceUrl: "https://www.fda.gov/media/193344/download",
          body: "FDA Briefing Document\nPharmacy Compounding Advisory Committee (PCAC) Meeting\nJuly 23 -24, 2026\nFDA Evaluation of Emideltide-Related Bulk Drug Substances\nIII. CONCLUSION AND RECOMMENDATION\nAfter considering the information currently available, a balancing of the criteria weighs against emideltide (free base and emideltide acetate being placed on that list.\nEmideltide (free base) is considered not well-characterized from the physical and chemical characterization perspectives.\nBased on available clinical data, there is insufficient information concerning effectiveness to support the use of emideltide.\nAccordingly, we propose not adding emideltide (free base) or emideltide acetate to the 503A Bulks List.",
        },
      ],
    }),
  );

  await withServer(
    {
      PCAC_DIR: pcacDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-pcac-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${PCAC_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /pcac must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, PCAC_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, PCAC_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const pcacPr = unpaid.headers.get("payment-required");
      assert.ok(pcacPr, "v2 PAYMENT-REQUIRED header");
      const pcacV2 = JSON.parse(Buffer.from(pcacPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(pcacV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("weighs against emideltide"));
      assert.ok(!leak402.includes("we propose not adding"));
      assert.ok(!leak402.includes("insufficient information concerning effectiveness"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === PCAC_PATH), true);
      assert.equal(shop.products.some((p) => p.path === SWISSPAR_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${PCAC_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "pcac free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { substance?: string; mediaId?: string; meeting?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.substance, "Emideltide");
      assert.equal(man.cards?.[0]?.mediaId, "193344");
      assert.equal(man.cards?.[0]?.meeting, "July 23-24, 2026");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("weighs against emideltide"));
      assert.ok(!manBlob.includes("we propose not adding"));
      assert.ok(!manBlob.includes("insufficient information concerning effectiveness"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${PCAC_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { substance: string; date: string; mediaId: string; body: string }[];
      };
      assert.equal(paidBody.product, "fda-pcac-503a-memos");
      assert.equal(paidBody.cards[0]?.substance, "Emideltide");
      assert.equal(paidBody.cards[0]?.date, "2026-05-11");
      assert.equal(paidBody.cards[0]?.mediaId, "193344");
      assert.ok(paidBody.cards[0]?.body.includes("weighs against emideltide"));
      assert.ok(paidBody.cards[0]?.body.includes("we propose not adding"));
    },
  );

  const ftcWlDir = mkdtempSync(join(tmpdir(), "ftc-wl-"));
  writeFileSync(
    join(ftcWlDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "ftc-bcp-warning-letter-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-07-06",
      license: "17 USC 105",
      attribution: "FTC",
      sources: {
        listing: "https://www.ftc.gov/legal-library/browse/warning-letters",
        nodeBase: "https://www.ftc.gov/legal-library/browse/warning-letters/",
        pdfBase: "https://www.ftc.gov/system/files/ftc_gov/pdf/",
      },
      cards: [
        {
          id: "vtron-inc-dba-vtron-lasers",
          nodeId: "334078",
          pdfId: "vtron-lasers-musa-warningletter",
          firm: "Vtron Inc. d/b/a Vtron Lasers",
          date: "2026-07-06",
          subject: "Warning Letter Regarding “Made in the USA” Representations",
          sourceUrl: "https://www.ftc.gov/system/files/ftc_gov/pdf/vtron-lasers-musa-warningletter.pdf",
          nodeUrl: "https://www.ftc.gov/legal-library/browse/warning-letters/vtron-inc-dba-vtron-lasers",
          body: "Bureau of Consumer Protection\nJuly 6, 2026\nVtron Inc. d/b/a Vtron Lasers\nRe: Warning Letter Regarding “Made in the USA” Representations\nThe Federal Trade Commission is the nation’s consumer protection agency.\nAvailable information obtained by Commission staff suggests that Vtron Inc. d/b/a Vtron Lasers promotes certain products, such as laser machines used for engraving, welding, and cutting jewelry and precious metals.\nThe Commission enforces the Made in USA Labeling Rule (“MUSA Labeling Rule”).",
        },
      ],
    }),
  );

  await withServer(
    {
      FTC_WL_DIR: ftcWlDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-ftc-wl-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${FTC_WL_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /ftc-wl must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, FTC_WL_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, FTC_WL_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const ftcPr = unpaid.headers.get("payment-required");
      assert.ok(ftcPr, "v2 PAYMENT-REQUIRED header");
      const ftcV2 = JSON.parse(Buffer.from(ftcPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(ftcV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("laser machines used for engraving"));
      assert.ok(!leak402.includes("MUSA Labeling Rule"));
      assert.ok(!leak402.includes("nation’s consumer protection"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === FTC_WL_PATH), true);
      assert.equal(shop.products.some((p) => p.path === CFPB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === PCAC_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${FTC_WL_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "ftc-wl free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { firm?: string; id?: string; subject?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.firm, "Vtron Inc. d/b/a Vtron Lasers");
      assert.equal(man.cards?.[0]?.id, "vtron-inc-dba-vtron-lasers");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("laser machines used for engraving"));
      assert.ok(!manBlob.includes("MUSA Labeling Rule"));
      assert.ok(!manBlob.includes("nation’s consumer protection"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${FTC_WL_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { firm: string; date: string; pdfId: string; body: string }[];
      };
      assert.equal(paidBody.product, "ftc-bcp-warning-letter-bodies");
      assert.equal(paidBody.cards[0]?.firm, "Vtron Inc. d/b/a Vtron Lasers");
      assert.equal(paidBody.cards[0]?.date, "2026-07-06");
      assert.equal(paidBody.cards[0]?.pdfId, "vtron-lasers-musa-warningletter");
      assert.ok(paidBody.cards[0]?.body.includes("laser machines used for engraving"));
      assert.ok(paidBody.cards[0]?.body.includes("MUSA Labeling Rule"));
    },
  );

  const cfpbOrdersDir = mkdtempSync(join(tmpdir(), "cfpb-orders-"));
  writeFileSync(
    join(cfpbOrdersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "cfpb-consent-order-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2025-01-17",
      license: "17 USC 105",
      attribution: "CFPB",
      sources: {
        listing: "https://www.consumerfinance.gov/enforcement/actions/",
        actionBase: "https://www.consumerfinance.gov/enforcement/actions/",
        pdfHost: "https://files.consumerfinance.gov/",
      },
      cards: [
        {
          id: "american-honda-finance-corporation-2025",
          fileNo: "2025-CFPB-0003",
          pdfId: "cfpb_american-honda-finance-corp-consent-order_2025-01",
          firm: "American Honda Finance Corporation",
          date: "2025-01-17",
          title: "Consent Order",
          sourceUrl:
            "https://files.consumerfinance.gov/f/documents/cfpb_american-honda-finance-corp-consent-order_2025-01.pdf",
          actionUrl: "https://www.consumerfinance.gov/enforcement/actions/american-honda-finance-corporation-2025/",
          body: [
            "UNITED STATES OF AMERICA",
            "CONSUMER FINANCIAL PROTECTION BUREAU",
            "ADMINISTRATIVE PROCEEDING File No. 2025-CFPB-0003",
            "CONSENT ORDER",
            "American Honda Finance Corp.",
            "Findings of Fact",
            "20. Respondent failed to promptly correct the account statuses for nearly 35,000 accounts.",
            "Appendix E of the Furnisher Rule",
            "according to the Bureau’s wiring instructions",
            "IT IS ORDERED",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered finding ${i + 21} from the official Honda Finance consent order body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      CFPB_ORDERS_DIR: cfpbOrdersDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-cfpb-orders-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${CFPB_ORDERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /cfpb-orders must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, CFPB_ORDERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, CFPB_ORDERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const cfpbPr = unpaid.headers.get("payment-required");
      assert.ok(cfpbPr, "v2 PAYMENT-REQUIRED header");
      const cfpbV2 = JSON.parse(Buffer.from(cfpbPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(cfpbV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("nearly 35,000"));
      assert.ok(!leak402.includes("Appendix E"));
      assert.ok(!leak402.includes("Furnisher Rule"));
      assert.ok(!leak402.includes("wiring instructions"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === CFPB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FTC_WL_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${CFPB_ORDERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "cfpb-orders free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { firm?: string; id?: string; fileNo?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.firm, "American Honda Finance Corporation");
      assert.equal(man.cards?.[0]?.id, "american-honda-finance-corporation-2025");
      assert.equal(man.cards?.[0]?.fileNo, "2025-CFPB-0003");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("nearly 35,000"));
      assert.ok(!manBlob.includes("Appendix E"));
      assert.ok(!manBlob.includes("Furnisher Rule"));
      assert.ok(!manBlob.includes("wiring instructions"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${CFPB_ORDERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { firm: string; date: string; pdfId: string; fileNo: string; body: string }[];
      };
      assert.equal(paidBody.product, "cfpb-consent-order-bodies");
      assert.equal(paidBody.cards[0]?.firm, "American Honda Finance Corporation");
      assert.equal(paidBody.cards[0]?.date, "2025-01-17");
      assert.equal(paidBody.cards[0]?.pdfId, "cfpb_american-honda-finance-corp-consent-order_2025-01");
      assert.equal(paidBody.cards[0]?.fileNo, "2025-CFPB-0003");
      assert.ok(paidBody.cards[0]?.body.includes("nearly 35,000"));
      assert.ok(paidBody.cards[0]?.body.includes("Appendix E"));
      assert.ok(paidBody.cards[0]?.body.includes("Furnisher Rule"));
    },
  );

  const occCdDir = mkdtempSync(join(tmpdir(), "occ-cd-"));
  writeFileSync(
    join(occCdDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "occ-institution-cd-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-06-16",
      license: "17 USC 105",
      attribution: "OCC",
      sources: {
        listing: "https://apps.occ.gov/EASearch",
        export: "https://apps.occ.gov/EASearch/Search/ExportToJSON",
        pdfHost: "https://www.occ.gov/",
      },
      cards: [
        {
          id: "AA-ENF-2026-29",
          docket: "AA-ENF-2026-29",
          pdfId: "AA-ENF-2026-29",
          bank: "United Texas Bank, National Association",
          location: "Dallas, TX",
          date: "2026-06-16",
          title: "Consent Order",
          sourceUrl: "https://www.occ.gov/static/enforcement-actions/eaAA-ENF-2026-29.pdf",
          body: [
            "UNITED STATES OF AMERICA",
            "DEPARTMENT OF THE TREASURY",
            "OFFICE OF THE COMPTROLLER OF THE CURRENCY",
            "AA-ENF-2026-29",
            "CONSENT ORDER",
            "United Texas Bank, N.A.",
            "Dallas, Texas",
            "WHEREAS, the OCC has supervisory authority over United Texas Bank",
            "foreign correspondent banking and virtual currency customers",
            "ARTICLE I",
            "IT IS ORDERED",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official United Texas Bank consent order body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      OCC_CD_DIR: occCdDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-occ-cd-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${OCC_CD_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /occ-cd must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, OCC_CD_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, OCC_CD_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const occPr = unpaid.headers.get("payment-required");
      assert.ok(occPr, "v2 PAYMENT-REQUIRED header");
      const occV2 = JSON.parse(Buffer.from(occPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(occV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("foreign correspondent banking and virtual currency customers"));
      assert.ok(!leak402.includes("IT IS ORDERED"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === OCC_CD_PATH), true);
      assert.equal(shop.products.some((p) => p.path === CFPB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FTC_WL_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${OCC_CD_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "occ-cd free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { bank?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.bank, "United Texas Bank, National Association");
      assert.equal(man.cards?.[0]?.docket, "AA-ENF-2026-29");
      assert.equal(man.cards?.[0]?.id, "AA-ENF-2026-29");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("foreign correspondent banking and virtual currency customers"));
      assert.ok(!manBlob.includes("IT IS ORDERED"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${OCC_CD_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { bank: string; date: string; docket: string; pdfId: string; body: string }[];
      };
      assert.equal(paidBody.product, "occ-institution-cd-bodies");
      assert.equal(paidBody.cards[0]?.bank, "United Texas Bank, National Association");
      assert.equal(paidBody.cards[0]?.date, "2026-06-16");
      assert.equal(paidBody.cards[0]?.docket, "AA-ENF-2026-29");
      assert.equal(paidBody.cards[0]?.pdfId, "AA-ENF-2026-29");
      assert.ok(paidBody.cards[0]?.body.includes("foreign correspondent banking and virtual currency customers"));
      assert.ok(paidBody.cards[0]?.body.includes("IT IS ORDERED"));
    },
  );

  const fdicOrdersDir = mkdtempSync(join(tmpdir(), "fdic-orders-"));
  writeFileSync(
    join(fdicOrdersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "fdic-institution-order-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-01-13",
      license: "17 USC 105",
      attribution: "FDIC",
      sources: {
        listing: "https://orders.fdic.gov/s/",
        pdfHost: "https://orders.fdic.gov/",
      },
      cards: [
        {
          id: "FDIC-26-0001b",
          docket: "FDIC-26-0001b",
          pdfId: "069SJ000013gUnXYAU",
          bank: "MutualOne Bank",
          location: "Framingham, Massachusetts",
          date: "2026-01-13",
          title: "Consent Order",
          sourceUrl: "https://orders.fdic.gov/sfc/servlet.shepherd/document/download/069SJ000013gUnXYAU?operationContext=S1",
          body: [
            "FEDERAL DEPOSIT INSURANCE CORPORATION",
            "WASHINGTON, D.C.",
            "In the Matter of",
            "MUTUALONE BANK",
            "Framingham, Massachusetts",
            "(Insured State Nonmember Bank)",
            "CONSENT ORDER FDIC-26-0001b",
            "June 9, 2025 Report of Examination",
            "adversely classified “Substandard”",
            "Having determined that the requirements for issuance of an order",
            "IT IS HEREBY ORDERED",
            "BOARD REQUIREMENTS",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official MutualOne Bank consent order body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      FDIC_ORDERS_DIR: fdicOrdersDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-fdic-orders-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${FDIC_ORDERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /fdic-orders must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, FDIC_ORDERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, FDIC_ORDERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const fdicPr = unpaid.headers.get("payment-required");
      assert.ok(fdicPr, "v2 PAYMENT-REQUIRED header");
      const fdicV2 = JSON.parse(Buffer.from(fdicPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(fdicV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("June 9, 2025 Report of Examination"));
      assert.ok(!leak402.includes("adversely classified"));
      assert.ok(!leak402.includes("Substandard"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === FDIC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FRB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === OCC_CD_PATH), true);
      assert.equal(shop.products.some((p) => p.path === CFPB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FTC_WL_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${FDIC_ORDERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "fdic-orders free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { bank?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.bank, "MutualOne Bank");
      assert.equal(man.cards?.[0]?.docket, "FDIC-26-0001b");
      assert.equal(man.cards?.[0]?.id, "FDIC-26-0001b");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("June 9, 2025 Report of Examination"));
      assert.ok(!manBlob.includes("adversely classified"));
      assert.ok(!manBlob.includes("Substandard"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${FDIC_ORDERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { bank: string; date: string; docket: string; pdfId: string; body: string }[];
      };
      assert.equal(paidBody.product, "fdic-institution-order-bodies");
      assert.equal(paidBody.cards[0]?.bank, "MutualOne Bank");
      assert.equal(paidBody.cards[0]?.date, "2026-01-13");
      assert.equal(paidBody.cards[0]?.docket, "FDIC-26-0001b");
      assert.equal(paidBody.cards[0]?.pdfId, "069SJ000013gUnXYAU");
      assert.ok(paidBody.cards[0]?.body.includes("June 9, 2025 Report of Examination"));
      assert.ok(paidBody.cards[0]?.body.includes("adversely classified “Substandard”"));
    },
  );

  const frbOrdersDir = mkdtempSync(join(tmpdir(), "frb-orders-"));
  writeFileSync(
    join(frbOrdersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "frb-institution-order-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-04-14",
      license: "17 USC 105",
      attribution: "Federal Reserve Board",
      sources: {
        listing: "https://www.federalreserve.gov/supervisionreg/enforcementactions.htm",
        csv: "https://www.federalreserve.gov/supervisionreg/files/enforcementactions.csv",
        pdfHost: "https://www.federalreserve.gov/",
      },
      cards: [
        {
          id: "26-019-B-HC",
          docket: "26-019-B-HC",
          pdfId: "enf20260416a1",
          institution: "Community Bankshares, Inc.",
          location: "LaGrange, Georgia",
          date: "2026-04-14",
          title: "Cease and Desist Order",
          sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/files/enf20260416a1.pdf",
          body: [
            "BOARD OF GOVERNORS OF THE FEDERAL RESERVE SYSTEM",
            "WASHINGTON, D.C.",
            "In the Matter of",
            "COMMUNITY BANKSHARES, INC.",
            "LaGrange, Georgia",
            "Docket No. 26-019-B-HC",
            "Order to Cease and Desist Issued Upon Consent",
            "WHEREAS, Community Bankshares, Inc. is a registered bank holding company",
            "WHEREAS, the most recent inspection identified deficiencies",
            "Capital Plan",
            "significantly undercapitalized",
            "NOW THEREFORE",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official Community Bankshares C&D body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      FRB_ORDERS_DIR: frbOrdersDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-frb-orders-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${FRB_ORDERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /frb-orders must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, FRB_ORDERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, FRB_ORDERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const frbPr = unpaid.headers.get("payment-required");
      assert.ok(frbPr, "v2 PAYMENT-REQUIRED header");
      const frbV2 = JSON.parse(Buffer.from(frbPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(frbV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("WHEREAS"));
      assert.ok(!leak402.includes("significantly undercapitalized"));
      assert.ok(!leak402.includes("Capital Plan"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === FRB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === NCUA_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FDIC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === OCC_CD_PATH), true);
      assert.equal(shop.products.some((p) => p.path === CFPB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FTC_WL_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${FRB_ORDERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "frb-orders free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.institution, "Community Bankshares, Inc.");
      assert.equal(man.cards?.[0]?.docket, "26-019-B-HC");
      assert.equal(man.cards?.[0]?.id, "26-019-B-HC");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("WHEREAS"));
      assert.ok(!manBlob.includes("significantly undercapitalized"));
      assert.ok(!manBlob.includes("Capital Plan"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${FRB_ORDERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; pdfId: string; body: string }[];
      };
      assert.equal(paidBody.product, "frb-institution-order-bodies");
      assert.equal(paidBody.cards[0]?.institution, "Community Bankshares, Inc.");
      assert.equal(paidBody.cards[0]?.date, "2026-04-14");
      assert.equal(paidBody.cards[0]?.docket, "26-019-B-HC");
      assert.equal(paidBody.cards[0]?.pdfId, "enf20260416a1");
      assert.ok(paidBody.cards[0]?.body.includes("WHEREAS"));
      assert.ok(paidBody.cards[0]?.body.includes("Capital Plan"));
    },
  );

  const ncuaOrdersDir = mkdtempSync(join(tmpdir(), "ncua-orders-"));
  writeFileSync(
    join(ncuaOrdersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "ncua-institution-order-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2021-02-22",
      license: "17 USC 105",
      attribution: "NCUA",
      sources: {
        listing: "https://ncua.gov/news/enforcement-actions/administrative-orders",
        csv: "https://ncua.gov/sites/default/files/list_csv/administrative-orders.csv",
        htmlHost: "https://ncua.gov/",
      },
      cards: [
        {
          id: "21-0105-ER",
          docket: "21-0105-ER",
          creditUnion: "Live Life Federal Credit Union",
          location: "Fraser, Michigan",
          date: "2021-02-22",
          title: "Stipulation and Consent to Cease and Desist Order",
          sourceUrl:
            "https://ncua.gov/news/enforcement-actions/administrative-orders/2021/administrative-order-matter-live-life-federal-credit-union",
          body: [
            "NATIONAL CREDIT UNION ADMINISTRATION",
            "Docket No. 21-0105-ER",
            "LIVE LIFE FEDERAL CREDIT UNION",
            "STIPULATION AND CONSENT TO CEASE AND DESIST ORDER",
            "The Credit Union consents to the issuance by the NCUA of this Order.",
            "Marijuana-Related Businesses",
            "Reconciliation of MRB Point of Sale, METRC, or accounting system data",
            "BSA Expectations Regarding Marijuana-Related Businesses",
            "WHEREFORE, in consideration of the foregoing",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official Live Life C&D body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      NCUA_ORDERS_DIR: ncuaOrdersDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-ncua-orders-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${NCUA_ORDERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /ncua-orders must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, NCUA_ORDERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, NCUA_ORDERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const ncuaPr = unpaid.headers.get("payment-required");
      assert.ok(ncuaPr, "v2 PAYMENT-REQUIRED header");
      const ncuaV2 = JSON.parse(Buffer.from(ncuaPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(ncuaV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("Marijuana-Related"));
      assert.ok(!leak402.includes("METRC"));
      assert.ok(!leak402.includes("BSA Expectations"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === NCUA_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FRB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FDIC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === OCC_CD_PATH), true);
      assert.equal(shop.products.some((p) => p.path === CFPB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FTC_WL_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${NCUA_ORDERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "ncua-orders free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { creditUnion?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.creditUnion, "Live Life Federal Credit Union");
      assert.equal(man.cards?.[0]?.docket, "21-0105-ER");
      assert.equal(man.cards?.[0]?.id, "21-0105-ER");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("Marijuana-Related"));
      assert.ok(!manBlob.includes("METRC"));
      assert.ok(!manBlob.includes("BSA Expectations"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${NCUA_ORDERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { creditUnion: string; date: string; docket: string; body: string }[];
      };
      assert.equal(paidBody.product, "ncua-institution-order-bodies");
      assert.equal(paidBody.cards[0]?.creditUnion, "Live Life Federal Credit Union");
      assert.equal(paidBody.cards[0]?.date, "2021-02-22");
      assert.equal(paidBody.cards[0]?.docket, "21-0105-ER");
      assert.ok(paidBody.cards[0]?.body.includes("Marijuana-Related"));
      assert.ok(paidBody.cards[0]?.body.includes("METRC"));
      assert.ok(paidBody.cards[0]?.body.includes("BSA Expectations"));
    },
  );

  const fincenOrdersDir = mkdtempSync(join(tmpdir(), "fincen-orders-"));
  writeFileSync(
    join(fincenOrdersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "fincen-institution-order-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-08-03",
      license: "17 USC 105",
      attribution: "FinCEN",
      sources: {
        listing: "https://www.fincen.gov/news/enforcement-actions",
        pdfHost: "https://www.fincen.gov/",
      },
      cards: [
        {
          id: "2026-02",
          docket: "2026-02",
          pdfId: "UBS-Consent-Order",
          institution: "UBS Financial Services Inc.",
          date: "2026-08-03",
          title: "Consent Order Imposing Civil Money Penalty",
          sourceUrl: "https://www.fincen.gov/system/files/2026-07/UBS-Consent-Order.pdf",
          body: [
            "UNITED STATES OF AMERICA",
            "FINANCIAL CRIMES ENFORCEMENT NETWORK",
            "DEPARTMENT OF THE TREASURY",
            "IN THE MATTER OF:",
            "UBS Financial Services Inc.",
            "Number 2026-02",
            "CONSENT ORDER IMPOSING CIVIL MONEY PENALTY",
            "STATEMENT OF FACTS",
            "Jaclyn A. Barnao",
            "monitor more than 61,500 foreign currency wires",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official UBS consent-order body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      FINCEN_ORDERS_DIR: fincenOrdersDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-fincen-orders-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${FINCEN_ORDERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /fincen-orders must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, FINCEN_ORDERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, FINCEN_ORDERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const fincenPr = unpaid.headers.get("payment-required");
      assert.ok(fincenPr, "v2 PAYMENT-REQUIRED header");
      const fincenV2 = JSON.parse(Buffer.from(fincenPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(fincenV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("Jaclyn A. Barnao"));
      assert.ok(!leak402.includes("61,500"));
      assert.ok(!leak402.includes("STATEMENT OF FACTS"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === FINCEN_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === NCUA_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FRB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FDIC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === OCC_CD_PATH), true);
      assert.equal(shop.products.some((p) => p.path === CFPB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FTC_WL_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${FINCEN_ORDERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "fincen-orders free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.institution, "UBS Financial Services Inc.");
      assert.equal(man.cards?.[0]?.docket, "2026-02");
      assert.equal(man.cards?.[0]?.id, "2026-02");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("Jaclyn A. Barnao"));
      assert.ok(!manBlob.includes("61,500"));
      assert.ok(!manBlob.includes("STATEMENT OF FACTS"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${FINCEN_ORDERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; pdfId: string; body: string }[];
      };
      assert.equal(paidBody.product, "fincen-institution-order-bodies");
      assert.equal(paidBody.cards[0]?.institution, "UBS Financial Services Inc.");
      assert.equal(paidBody.cards[0]?.date, "2026-08-03");
      assert.equal(paidBody.cards[0]?.docket, "2026-02");
      assert.equal(paidBody.cards[0]?.pdfId, "UBS-Consent-Order");
      assert.ok(paidBody.cards[0]?.body.includes("Jaclyn A. Barnao"));
      assert.ok(paidBody.cards[0]?.body.includes("61,500"));
      assert.ok(paidBody.cards[0]?.body.includes("STATEMENT OF FACTS"));
    },
  );

  const fercOrdersDir = mkdtempSync(join(tmpdir(), "ferc-orders-"));
  writeFileSync(
    join(fercOrdersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "ferc-institution-order-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-04-17",
      license: "17 USC 105",
      attribution: "FERC",
      sources: {
        listing: "https://www.ferc.gov/civil-penalties/all-civil-penalty-actions-2026",
        pdfHost: "https://cms.ferc.gov/",
      },
      cards: [
        {
          id: "IN25-6-000",
          docket: "IN25-6-000",
          pdfId: "20260417-195FERC61048-IN25-6-000-Interstate Power and Light Co-Settlement Agreement",
          institution: "Interstate Power and Light Company",
          date: "2026-04-17",
          title: "Order Approving Stipulation and Consent Agreement",
          sourceUrl:
            "https://cms.ferc.gov/sites/default/files/2026-04/20260417-195FERC61048-IN25-6-000-Interstate%20Power%20and%20Light%20Co-Settlement%20Agreement.pdf",
          body: [
            "UNITED STATES OF AMERICA",
            "FEDERAL ENERGY REGULATORY COMMISSION",
            "Before Commissioners: Laura V. Swett, Chairman;",
            "Interstate Power and Light Company",
            "Docket No. IN25-6-000",
            "ORDER APPROVING STIPULATION AND CONSENT AGREEMENT",
            "commenced operations in 1978",
            "Planning Resource Auction",
            "Sutherland Generating Station",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official Interstate Power stipulation-and-consent body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      FERC_ORDERS_DIR: fercOrdersDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-ferc-orders-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${FERC_ORDERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /ferc-orders must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, FERC_ORDERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, FERC_ORDERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const fercPr = unpaid.headers.get("payment-required");
      assert.ok(fercPr, "v2 PAYMENT-REQUIRED header");
      const fercV2 = JSON.parse(Buffer.from(fercPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(fercV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("commenced operations in 1978"));
      assert.ok(!leak402.includes("Planning Resource Auction"));
      assert.ok(!leak402.includes("Sutherland Generating Station"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === FERC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FINCEN_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === NCUA_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FRB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FDIC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === OCC_CD_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${FERC_ORDERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "ferc-orders free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.institution, "Interstate Power and Light Company");
      assert.equal(man.cards?.[0]?.docket, "IN25-6-000");
      assert.equal(man.cards?.[0]?.id, "IN25-6-000");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("commenced operations in 1978"));
      assert.ok(!manBlob.includes("Planning Resource Auction"));
      assert.ok(!manBlob.includes("Sutherland Generating Station"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${FERC_ORDERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; pdfId: string; body: string }[];
      };
      assert.equal(paidBody.product, "ferc-institution-order-bodies");
      assert.equal(paidBody.cards[0]?.institution, "Interstate Power and Light Company");
      assert.equal(paidBody.cards[0]?.date, "2026-04-17");
      assert.equal(paidBody.cards[0]?.docket, "IN25-6-000");
      assert.ok(paidBody.cards[0]?.body.includes("commenced operations in 1978"));
      assert.ok(paidBody.cards[0]?.body.includes("Planning Resource Auction"));
      assert.ok(paidBody.cards[0]?.body.includes("Sutherland Generating Station"));
    },
  );

  const ofacOrdersDir = mkdtempSync(join(tmpdir(), "ofac-orders-"));
  writeFileSync(
    join(ofacOrdersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "ofac-institution-order-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-08-12",
      license: "17 USC 105",
      attribution: "OFAC",
      sources: {
        listing: "https://ofac.treasury.gov/civil-penalties-and-enforcement-information",
        pdfHost: "https://ofac.treasury.gov/",
      },
      cards: [
        {
          id: "936706",
          docket: "936706",
          pdfId: "936706",
          institution: "Rice Lake Weighing Systems, Inc.",
          date: "2026-08-12",
          title: "Enforcement Release",
          sourceUrl: "https://ofac.treasury.gov/media/936706/download",
          body: [
            "DEPARTMENT OF THE TREASURY",
            "OFFICE OF FOREIGN ASSETS CONTROL",
            "Enforcement Release: August 12, 2026",
            "Rice Lake Weighing Systems Settles with OFAC for Iran-Related Apparent Violations",
            "Description of the Apparent Violations",
            "Dini Argeo S.r.l.",
            "Pand Weighing Control",
            "Import Export Coordinator",
            "Penalty Calculations and General Factors Analysis",
            "Enforcement Guidelines",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official Rice Lake enforcement-release body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      OFAC_ORDERS_DIR: ofacOrdersDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-ofac-orders-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${OFAC_ORDERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /ofac-orders must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, OFAC_ORDERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, OFAC_ORDERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const ofacPr = unpaid.headers.get("payment-required");
      assert.ok(ofacPr, "v2 PAYMENT-REQUIRED header");
      const ofacV2 = JSON.parse(Buffer.from(ofacPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(ofacV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("Dini Argeo S.r.l."));
      assert.ok(!leak402.includes("Pand Weighing Control"));
      assert.ok(!leak402.includes("Import Export Coordinator"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === OFAC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === BIS_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FERC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FINCEN_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === NCUA_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FRB_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${OFAC_ORDERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "ofac-orders free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.institution, "Rice Lake Weighing Systems, Inc.");
      assert.equal(man.cards?.[0]?.docket, "936706");
      assert.equal(man.cards?.[0]?.id, "936706");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("Dini Argeo S.r.l."));
      assert.ok(!manBlob.includes("Pand Weighing Control"));
      assert.ok(!manBlob.includes("Import Export Coordinator"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${OFAC_ORDERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; pdfId: string; body: string }[];
      };
      assert.equal(paidBody.product, "ofac-institution-order-bodies");
      assert.equal(paidBody.cards[0]?.institution, "Rice Lake Weighing Systems, Inc.");
      assert.equal(paidBody.cards[0]?.date, "2026-08-12");
      assert.equal(paidBody.cards[0]?.docket, "936706");
      assert.ok(paidBody.cards[0]?.body.includes("Dini Argeo S.r.l."));
      assert.ok(paidBody.cards[0]?.body.includes("Pand Weighing Control"));
      assert.ok(paidBody.cards[0]?.body.includes("Import Export Coordinator"));
    },
  );

  const bisOrdersDir = mkdtempSync(join(tmpdir(), "bis-orders-"));
  writeFileSync(
    join(bisOrdersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "bis-institution-order-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-04-13",
      license: "17 USC 105",
      attribution: "BIS",
      sources: {
        listing: "https://www.bis.gov/enforcement/charging-letters",
        pdfHost: "https://www.bis.gov/",
      },
      cards: [
        {
          id: "E3050",
          docket: "E3050",
          pdfId: "coastal-pva-technology-inc-4-13-2026-rev",
          institution: "Coastal PVA Technology, Inc.",
          date: "2026-04-13",
          title: "Proposed Charging Letter",
          sourceUrl: "https://www.bis.gov/media/documents/coastal-pva-technology-inc-4-13-2026-rev.pdf",
          body: [
            "UNITED STATES DEPARTMENT OF COMMERCE",
            "Bureau of Industry and Security",
            "PROPOSED CHARGING LETTER",
            "Coastal PVA Technology, Inc.",
            "4031 Alvis Court",
            "STATEMENT OF CHARGES",
            "15 C.F.R. § 764.2(a)",
            "post-etched semiconductor wafers",
            "Malorie Eisenbrei",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official Coastal PVA charging-letter body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      BIS_ORDERS_DIR: bisOrdersDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-bis-orders-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${BIS_ORDERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /bis-orders must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, BIS_ORDERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, BIS_ORDERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const bisPr = unpaid.headers.get("payment-required");
      assert.ok(bisPr, "v2 PAYMENT-REQUIRED header");
      const bisV2 = JSON.parse(Buffer.from(bisPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(bisV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("4031 Alvis Court"));
      assert.ok(!leak402.includes("post-etched semiconductor wafers"));
      assert.ok(!leak402.includes("Malorie Eisenbrei"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === BIS_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === CFTC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === OFAC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FERC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FINCEN_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${BIS_ORDERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "bis-orders free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.institution, "Coastal PVA Technology, Inc.");
      assert.equal(man.cards?.[0]?.docket, "E3050");
      assert.equal(man.cards?.[0]?.id, "E3050");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("4031 Alvis Court"));
      assert.ok(!manBlob.includes("post-etched semiconductor wafers"));
      assert.ok(!manBlob.includes("Malorie Eisenbrei"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${BIS_ORDERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; pdfId: string; body: string }[];
      };
      assert.equal(paidBody.product, "bis-institution-order-bodies");
      assert.equal(paidBody.cards[0]?.institution, "Coastal PVA Technology, Inc.");
      assert.equal(paidBody.cards[0]?.date, "2026-04-13");
      assert.equal(paidBody.cards[0]?.docket, "E3050");
      assert.ok(paidBody.cards[0]?.body.includes("4031 Alvis Court"));
      assert.ok(paidBody.cards[0]?.body.includes("post-etched semiconductor wafers"));
      assert.ok(paidBody.cards[0]?.body.includes("Malorie Eisenbrei"));
    },
  );

  const cftcOrdersDir = mkdtempSync(join(tmpdir(), "cftc-orders-"));
  writeFileSync(
    join(cftcOrdersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "cftc-institution-order-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-07-31",
      license: "17 USC 105",
      attribution: "CFTC",
      sources: {
        listing: "https://www.cftc.gov/LawRegulation/Enforcement/EnforcementActions/index.htm",
        pdfHost: "https://www.cftc.gov/",
      },
      cards: [
        {
          id: "26-04",
          docket: "26-04",
          pdfId: "14456",
          institution: "UBS Financial Services Inc.",
          date: "2026-07-31",
          title: "Order Instituting Proceedings",
          sourceUrl: "https://www.cftc.gov/media/14456/ENF_UBSFinancial%20ServicesOrder073126/download",
          body: [
            "UNITED STATES OF AMERICA",
            "COMMODITY FUTURES TRADING COMMISSION",
            "UBS Financial Services Inc.",
            "CFTC Docket No. 26-04",
            "ORDER INSTITUTING PROCEEDINGS",
            "$8.9 billion",
            "01:44 pm, Jul 31 2026",
            "third-party consultant",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official UBS FSI enforcement-order body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      CFTC_ORDERS_DIR: cftcOrdersDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-cftc-orders-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${CFTC_ORDERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /cftc-orders must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, CFTC_ORDERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, CFTC_ORDERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const cftcPr = unpaid.headers.get("payment-required");
      assert.ok(cftcPr, "v2 PAYMENT-REQUIRED header");
      const cftcV2 = JSON.parse(Buffer.from(cftcPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(cftcV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("$8.9 billion"));
      assert.ok(!leak402.includes("01:44 pm, Jul 31 2026"));
      assert.ok(!leak402.includes("third-party consultant"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === CFTC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FIFRA_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === BIS_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === OFAC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FERC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${CFTC_ORDERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "cftc-orders free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.institution, "UBS Financial Services Inc.");
      assert.equal(man.cards?.[0]?.docket, "26-04");
      assert.equal(man.cards?.[0]?.id, "26-04");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("$8.9 billion"));
      assert.ok(!manBlob.includes("01:44 pm, Jul 31 2026"));
      assert.ok(!manBlob.includes("third-party consultant"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${CFTC_ORDERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; pdfId: string; body: string }[];
      };
      assert.equal(paidBody.product, "cftc-institution-order-bodies");
      assert.equal(paidBody.cards[0]?.institution, "UBS Financial Services Inc.");
      assert.equal(paidBody.cards[0]?.date, "2026-07-31");
      assert.equal(paidBody.cards[0]?.docket, "26-04");
      assert.ok(paidBody.cards[0]?.body.includes("$8.9 billion"));
      assert.ok(paidBody.cards[0]?.body.includes("01:44 pm, Jul 31 2026"));
      assert.ok(paidBody.cards[0]?.body.includes("third-party consultant"));
    },
  );


  const fifraOrdersDir = mkdtempSync(join(tmpdir(), "fifra-orders-"));
  writeFileSync(
    join(fifraOrdersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "fifra-institution-order-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-07-29",
      license: "17 USC 105",
      attribution: "EPA",
      sources: {
        listing: "https://yosemite.epa.gov/oa/rhc/epaadmin.nsf",
        pdfHost: "https://yosemite.epa.gov/",
      },
      cards: [
        {
          id: "FIFRA-05-2026-0015",
          docket: "FIFRA-05-2026-0015",
          pdfId: "F4CB3764E5AB61EA85258E43006880DC",
          institution: "Travel Caddy, Inc. dba Travelon",
          date: "2026-07-29",
          title: "Consent Agreement and Final Order",
          sourceUrl: "https://yosemite.epa.gov/OA/RHC/EPAAdmin.nsf/Filings/F4CB3764E5AB61EA85258E43006880DC/$File/FIFRA-05-2026-0015_CAFO_TravelCaddyIncdbaTravelon_FranklinParkIllinois_14PGS.pdf",
          body: [
            "UNITED STATES ENVIRONMENTAL PROTECTION AGENCY",
            "Consent Agreement and Final Order",
            "Travel Caddy, Inc. doing business as Travelon",
            "FIFRA-05-2026-0015",
            "11333 Addison Avenue",
            "Style Numbers 23537, 43541",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official Travelon FIFRA CAFO body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      FIFRA_ORDERS_DIR: fifraOrdersDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-fifra-orders-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${FIFRA_ORDERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /fifra-orders must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, FIFRA_ORDERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, FIFRA_ORDERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const fifraPr = unpaid.headers.get("payment-required");
      assert.ok(fifraPr, "v2 PAYMENT-REQUIRED header");
      const fifraV2 = JSON.parse(Buffer.from(fifraPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(fifraV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("11333 Addison Avenue"));
      assert.ok(!leak402.includes("Style Numbers 23537, 43541"));
      assert.ok(!leak402.includes("Travel Caddy, Inc. doing business as Travelon"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === FIFRA_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === DENOVO_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === TTB_OIC_PATH), true);
      assert.equal(shop.products.some((p) => p.path === CFTC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === BIS_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${FIFRA_ORDERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "fifra-orders free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.institution, "Travel Caddy, Inc. dba Travelon");
      assert.equal(man.cards?.[0]?.docket, "FIFRA-05-2026-0015");
      assert.equal(man.cards?.[0]?.id, "FIFRA-05-2026-0015");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("11333 Addison Avenue"));
      assert.ok(!manBlob.includes("Style Numbers 23537, 43541"));
      assert.ok(!manBlob.includes("Travel Caddy, Inc. doing business as Travelon"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${FIFRA_ORDERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; pdfId: string; body: string }[];
      };
      assert.equal(paidBody.product, "fifra-institution-order-bodies");
      assert.equal(paidBody.cards[0]?.institution, "Travel Caddy, Inc. dba Travelon");
      assert.equal(paidBody.cards[0]?.date, "2026-07-29");
      assert.equal(paidBody.cards[0]?.docket, "FIFRA-05-2026-0015");
      assert.ok(paidBody.cards[0]?.body.includes("11333 Addison Avenue"));
      assert.ok(paidBody.cards[0]?.body.includes("Style Numbers 23537, 43541"));
      assert.ok(paidBody.cards[0]?.body.includes("Travel Caddy, Inc. doing business as Travelon"));
    },
  );


  const denovoOrdersDir = mkdtempSync(join(tmpdir(), "denovo-orders-"));
  writeFileSync(
    join(denovoOrdersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "fda-denovo-classification-order-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-07-28",
      license: "17 USC 105",
      attribution: "FDA",
      sources: {
        listing: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/denovo.cfm",
        pdfHost: "https://www.accessdata.fda.gov/",
      },
      cards: [
        {
          id: "DEN250042",
          docket: "DEN250042",
          pdfId: "DEN250042",
          institution: "Caristo Diagnostics Ltd.",
          date: "2026-07-28",
          title: "De Novo classification order",
          sourceUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/DEN250042.pdf",
          body: [
            "Food and Drug Administration",
            "Center for Devices and Radiological Health",
            "Re: DEN250042",
            "Trade/Device Name: CaRi-Heart",
            "This order, therefore, classifies the CaRi-Heart",
            "21 CFR 870.2215",
            "Doc ID# 04017.08.05",
            "adults from 30 to 80 years old",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official CaRi-Heart De Novo classification-order body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      DENOVO_ORDERS_DIR: denovoOrdersDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-denovo-orders-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${DENOVO_ORDERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /denovo-orders must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, DENOVO_ORDERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, DENOVO_ORDERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const denovoPr = unpaid.headers.get("payment-required");
      assert.ok(denovoPr, "v2 PAYMENT-REQUIRED header");
      const denovoV2 = JSON.parse(Buffer.from(denovoPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(denovoV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("21 CFR 870.2215"));
      assert.ok(!leak402.includes("Doc ID# 04017.08.05"));
      assert.ok(!leak402.includes("adults from 30 to 80 years old"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === DENOVO_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === TTB_OIC_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FIFRA_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === CFTC_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${DENOVO_ORDERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "denovo-orders free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.institution, "Caristo Diagnostics Ltd.");
      assert.equal(man.cards?.[0]?.docket, "DEN250042");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("21 CFR 870.2215"));
      assert.ok(!manBlob.includes("Doc ID# 04017.08.05"));
      assert.ok(!manBlob.includes("adults from 30 to 80 years old"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${DENOVO_ORDERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; body: string }[];
      };
      assert.equal(paidBody.product, "fda-denovo-classification-order-bodies");
      assert.equal(paidBody.cards[0]?.institution, "Caristo Diagnostics Ltd.");
      assert.equal(paidBody.cards[0]?.date, "2026-07-28");
      assert.equal(paidBody.cards[0]?.docket, "DEN250042");
      assert.ok(paidBody.cards[0]?.body.includes("21 CFR 870.2215"));
      assert.ok(paidBody.cards[0]?.body.includes("Doc ID# 04017.08.05"));
      assert.ok(paidBody.cards[0]?.body.includes("adults from 30 to 80 years old"));
    },
  );


  const ttbOicDir = mkdtempSync(join(tmpdir(), "ttb-oic-"));
  writeFileSync(
    join(ttbOicDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "ttb-institution-oic-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-06-30",
      license: "17 USC 105",
      attribution: "TTB",
      sources: {
        listing: "https://www.ttb.gov/business-central/fo/administrative-cases",
        pdfHost: "https://www.ttb.gov/",
      },
      cards: [
        {
          id: "21st-amendment",
          docket: "21st-amendment",
          pdfId: "ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
          institution: "The 21st Amendment Brewery Cafe, LLC",
          date: "2026-06-30",
          title: "Offer in Compromise",
          sourceUrl: "https://www.ttb.gov/system/files/2026-07/ABSTMT-21st_Amendment_Brewery_Cafe_Redacted.pdf",
          body: [
            "DEPARTMENT OF THE TREASURY",
            "ALCOHOL AND TOBACCO TAX AND TRADE BUREAU",
            "ABSTRACT AND STATEMENT",
            "The 21st Amendment Brewery Cafe, LLC",
            "Offer-in-Compromise",
            "$423,681.93",
            "$ 1,217,201.38",
            "2010 Williams St.",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official 21st Amendment TTB Offer in Compromise body used only to keep this door fixture above the real-order length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      TTB_OIC_DIR: ttbOicDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-ttb-oic-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${TTB_OIC_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /ttb-oic must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, TTB_OIC_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, TTB_OIC_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const ttbPr = unpaid.headers.get("payment-required");
      assert.ok(ttbPr, "v2 PAYMENT-REQUIRED header");
      const ttbV2 = JSON.parse(Buffer.from(ttbPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(ttbV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("$423,681.93"));
      assert.ok(!leak402.includes("1,217,201.38"));
      assert.ok(!leak402.includes("2010 Williams St."));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === TTB_OIC_PATH), true);
      assert.equal(shop.products.some((p) => p.path === DENOVO_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FIFRA_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${TTB_OIC_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "ttb-oic free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.institution, "The 21st Amendment Brewery Cafe, LLC");
      assert.equal(man.cards?.[0]?.docket, "21st-amendment");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("$423,681.93"));
      assert.ok(!manBlob.includes("1,217,201.38"));
      assert.ok(!manBlob.includes("2010 Williams St."));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${TTB_OIC_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; body: string }[];
      };
      assert.equal(paidBody.product, "ttb-institution-oic-bodies");
      assert.equal(paidBody.cards[0]?.institution, "The 21st Amendment Brewery Cafe, LLC");
      assert.equal(paidBody.cards[0]?.date, "2026-06-30");
      assert.equal(paidBody.cards[0]?.docket, "21st-amendment");
      assert.ok(paidBody.cards[0]?.body.includes("$423,681.93"));
      assert.ok(paidBody.cards[0]?.body.includes("1,217,201.38"));
      assert.ok(paidBody.cards[0]?.body.includes("2010 Williams St."));
    },
  );


  const airLettersDir = mkdtempSync(join(tmpdir(), "air-letters-"));
  writeFileSync(
    join(airLettersDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "aphis-air-confirmation-letter-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-06-22",
      license: "17 USC 105",
      attribution: "USDA APHIS",
      sources: {
        listing: "https://www.aphis.usda.gov/confirmation-letters",
        pdfHost: "https://direct.aphis.usda.gov/",
      },
      cards: [
        {
          id: "26-173-01air",
          docket: "26-173-01air",
          pdfId: "26-173-01air-response.pdf",
          institution: "KAGOME Co., LTD.",
          date: "2026-06-22",
          title: "AIR confirmation letter",
          sourceUrl: "https://direct.aphis.usda.gov/sites/default/files/26-173-01air-response.pdf",
          body: [
            "United States Department of Agriculture",
            "Animal and Plant Health Inspection Service",
            "Biotechnology Regulatory Services",
            "Re: Confirmation of the regulatory status",
            "26-173-01air",
            "7 CFR part 340",
            "enhanced abiotic stress tolerance",
            "2026.08.14 09:05:45",
            "reynolds.alan@epa.gov",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official KAGOME AIR confirmation-letter body used only to keep this door fixture above the real-letter length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      AIR_LETTERS_DIR: airLettersDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-air-letters-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${AIR_LETTERS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /air-letters must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, AIR_LETTERS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, AIR_LETTERS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const airPr = unpaid.headers.get("payment-required");
      assert.ok(airPr, "v2 PAYMENT-REQUIRED header");
      const airV2 = JSON.parse(Buffer.from(airPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(airV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("enhanced abiotic stress tolerance"));
      assert.ok(!leak402.includes("2026.08.14 09:05:45"));
      assert.ok(!leak402.includes("reynolds.alan@epa.gov"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === AIR_LETTERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === TTB_OIC_PATH), true);
      assert.equal(shop.products.some((p) => p.path === DENOVO_ORDERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${AIR_LETTERS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "air-letters free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.institution, "KAGOME Co., LTD.");
      assert.equal(man.cards?.[0]?.docket, "26-173-01air");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("enhanced abiotic stress tolerance"));
      assert.ok(!manBlob.includes("2026.08.14 09:05:45"));
      assert.ok(!manBlob.includes("reynolds.alan@epa.gov"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${AIR_LETTERS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; body: string }[];
      };
      assert.equal(paidBody.product, "aphis-air-confirmation-letter-bodies");
      assert.equal(paidBody.cards[0]?.institution, "KAGOME Co., LTD.");
      assert.equal(paidBody.cards[0]?.date, "2026-06-22");
      assert.equal(paidBody.cards[0]?.docket, "26-173-01air");
      assert.ok(paidBody.cards[0]?.body.includes("enhanced abiotic stress tolerance"));
      assert.ok(paidBody.cards[0]?.body.includes("2026.08.14 09:05:45"));
      assert.ok(paidBody.cards[0]?.body.includes("reynolds.alan@epa.gov"));
    },
  );

  const superfundRodsDir = mkdtempSync(join(tmpdir(), "superfund-rods-"));
  writeFileSync(
    join(superfundRodsDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "epa-superfund-rod-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-08-05",
      license: "17 USC 105",
      attribution: "U.S. EPA",
      sources: {
        listing: "https://cumulis.epa.gov/supercpad/SiteProfiles/index.cfm?fuseaction=second.Cleanup&id=0501275",
        pdfHost: "https://semspub.epa.gov/",
      },
      cards: [
        {
          id: "05-711427",
          docket: "05-711427",
          pdfId: "05-711427.pdf",
          institution: "Federated Metals Corp. Whiting Superfund Site",
          date: "2026-08-05",
          title: "Interim Record of Decision",
          sourceUrl: "https://semspub.epa.gov/work/05/711427.pdf",
          body: [
            "United States Environmental Protection Agency",
            "INTERIM RECORD OF DECISION",
            "Federated Metals Corp. Whiting Superfund Site",
            "Operable Unit 1",
            "DECLARATION",
            "CERCLA",
            "1,200 ppm",
            "lead dross",
            "x-ray florescence",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official Federated Metals Superfund ROD body used only to keep this door fixture above the real-ROD length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      SUPERFUND_RODS_DIR: superfundRodsDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-superfund-rods-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${SUPERFUND_RODS_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /superfund-rods must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, SUPERFUND_RODS_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, SUPERFUND_RODS_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const rodPr = unpaid.headers.get("payment-required");
      assert.ok(rodPr, "v2 PAYMENT-REQUIRED header");
      const rodV2 = JSON.parse(Buffer.from(rodPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(rodV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("1,200 ppm"));
      assert.ok(!leak402.includes("lead dross"));
      assert.ok(!leak402.includes("x-ray florescence"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === SUPERFUND_RODS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === AIR_LETTERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === TTB_OIC_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${SUPERFUND_RODS_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "superfund-rods free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.institution, "Federated Metals Corp. Whiting Superfund Site");
      assert.equal(man.cards?.[0]?.docket, "05-711427");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("1,200 ppm"));
      assert.ok(!manBlob.includes("lead dross"));
      assert.ok(!manBlob.includes("x-ray florescence"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${SUPERFUND_RODS_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; body: string }[];
      };
      assert.equal(paidBody.product, "epa-superfund-rod-bodies");
      assert.equal(paidBody.cards[0]?.institution, "Federated Metals Corp. Whiting Superfund Site");
      assert.equal(paidBody.cards[0]?.date, "2026-08-05");
      assert.equal(paidBody.cards[0]?.docket, "05-711427");
      assert.ok(paidBody.cards[0]?.body.includes("1,200 ppm"));
      assert.ok(paidBody.cards[0]?.body.includes("lead dross"));
      assert.ok(paidBody.cards[0]?.body.includes("x-ray florescence"));
    },
  );

  const icoMpnDir = mkdtempSync(join(tmpdir(), "ico-mpn-"));
  writeFileSync(
    join(icoMpnDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "ico-institution-mpn-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-02-23",
      license: "OGL v3.0",
      attribution: "Information Commissioner's Office, licensed under the Open Government Licence v3.0",
      sources: {
        listing: "https://ico.org.uk/action-weve-taken/enforcement/?type=monetary-penalties",
        pdfHost: "https://ico.org.uk/",
      },
      cards: [
        {
          id: "reddit-mpn-20260223",
          docket: "reddit-mpn-20260223",
          pdfId: "reddit-mpn-20260223.pdf",
          institution: "Reddit, Inc.",
          date: "2026-02-23",
          title: "Monetary Penalty Notice",
          sourceUrl: "https://ico.org.uk/media2/hrlmvj14/reddit-mpn-20260223.pdf",
          body: [
            "PENALTY NOTICE",
            "REDDIT, INC.",
            "DATA PROTECTION ACT 2018 (PART 6, SECTION 155)",
            "ENFORCEMENT POWERS OF THE INFORMATION COMMISSIONER",
            "Pursuant to section 155(1) Data Protection Act 2018",
            "548 Market Street",
            "17,573,750",
            "26 September 2025",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official Reddit ICO MPN body used only to keep this door fixture above the real-MPN length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      ICO_MPN_DIR: icoMpnDir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-ico-mpn-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${ICO_MPN_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /ico-mpn must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, ICO_MPN_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, ICO_MPN_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const mpnPr = unpaid.headers.get("payment-required");
      assert.ok(mpnPr, "v2 PAYMENT-REQUIRED header");
      const mpnV2 = JSON.parse(Buffer.from(mpnPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(mpnV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("548 Market Street"));
      assert.ok(!leak402.includes("17,573,750"));
      assert.ok(!leak402.includes("26 September 2025"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === ICO_MPN_PATH), true);
      assert.equal(shop.products.some((p) => p.path === CMA_CA98_PATH), true);
      assert.equal(shop.products.some((p) => p.path === SUPERFUND_RODS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === AIR_LETTERS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === TTB_OIC_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const manifest = await fetch(`${base}${ICO_MPN_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "ico-mpn free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.institution, "Reddit, Inc.");
      assert.equal(man.cards?.[0]?.docket, "reddit-mpn-20260223");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("548 Market Street"));
      assert.ok(!manBlob.includes("17,573,750"));
      assert.ok(!manBlob.includes("26 September 2025"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${ICO_MPN_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; body: string }[];
      };
      assert.equal(paidBody.product, "ico-institution-mpn-bodies");
      assert.equal(paidBody.cards[0]?.institution, "Reddit, Inc.");
      assert.equal(paidBody.cards[0]?.date, "2026-02-23");
      assert.equal(paidBody.cards[0]?.docket, "reddit-mpn-20260223");
      assert.ok(paidBody.cards[0]?.body.includes("548 Market Street"));
      assert.ok(paidBody.cards[0]?.body.includes("17,573,750"));
      assert.ok(paidBody.cards[0]?.body.includes("26 September 2025"));
    },
  );

  const cmaCa98Dir = mkdtempSync(join(tmpdir(), "cma-ca98-"));
  writeFileSync(
    join(cmaCa98Dir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "cma-ca98-infringement-decision-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2025-02-21",
      license: "Crown copyright / Open Government Licence v3.0",
      attribution:
        "UK Competition and Markets Authority. Contains public sector information licensed under the Open Government Licence v3.0.",
      sources: {
        listing: "https://www.gov.uk/cma-cases/financial-services-sector-suspected-anti-competitive-practices",
        pdfHost: "https://assets.publishing.service.gov.uk/",
      },
      cards: [
        {
          id: "50601-citi-db",
          docket: "50601-citi-db",
          pdfId: "Citi-Deutsche_Bank__Non-confidential_decision.pdf",
          institution: "Citigroup Global Markets Limited / Deutsche Bank Aktiengesellschaft",
          date: "2025-02-21",
          title: "CA98 infringement decision",
          sourceUrl:
            "https://assets.publishing.service.gov.uk/media/6876390d352c290d20dcae7c/Citi-Deutsche_Bank__Non-confidential_decision.pdf",
          body: [
            "Decision of the Competition and Markets Authority",
            "Competition Act 1998",
            "UK government bonds: Citi-Deutsche Bank Infringement",
            "Case Number: 50601",
            "Chapter I prohibition",
            "Crown copyright 2025",
            "Open Government Licence",
            "Citi-DB Relevant Period",
            "gilt auctions",
            "commercially sensitive information",
            ...Array.from({ length: 40 }, (_, i) => `${i + 21}. Numbered article ${i + 21} from the official Citi-DB CA98 decision body used only to keep this door fixture above the real-decision length floor.`),
          ].join("\n"),
        },
      ],
    }),
  );

  await withServer(
    {
      CMA_CA98_DIR: cmaCa98Dir,
      X402_SKIP_SETTLE: "1",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-cma-ca98-"),
    },
    async (base) => {
      const unpaid = await fetch(`${base}${CMA_CA98_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /cma-ca98 must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, CMA_CA98_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, CMA_CA98_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");
      const cmaPr = unpaid.headers.get("payment-required");
      assert.ok(cmaPr, "v2 PAYMENT-REQUIRED header");
      const cmaV2 = JSON.parse(Buffer.from(cmaPr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(cmaV2.extensions?.bazaar?.info?.input?.method, "GET");

      const leak402 = JSON.stringify(body402);
      assert.ok(!leak402.includes("Citi-DB Relevant Period"));
      assert.ok(!leak402.includes("gilt auctions"));
      assert.ok(!leak402.includes("commercially sensitive information"));
      assert.ok(!leak402.includes("Numbered article"));

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === CMA_CA98_PATH), true);
      assert.equal(shop.products.some((p) => p.path === ICO_MPN_PATH), true);
      assert.equal(shop.products.some((p) => p.path === SUPERFUND_RODS_PATH), true);
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), false);
      assert.equal(shop.products.length, 29);

      const wk = (await (await fetch(`${base}${WELL_KNOWN_PATH}`)).json()) as { resources: string[] };
      assert.ok(wk.resources.some((r) => r.includes(CMA_CA98_PATH)), "well-known lists /cma-ca98");

      const llms = await (await fetch(`${base}${LLMS_PATH}`)).text();
      assert.ok(llms.includes("GET /cma-ca98"));

      const spec = (await (await fetch(`${base}${OPENAPI_PATH}`)).json()) as { paths: Record<string, unknown> };
      assert.ok(spec.paths[CMA_CA98_PATH]);
      assert.ok(spec.paths[CMA_CA98_MANIFEST_PATH]);

      const manifest = await fetch(`${base}${CMA_CA98_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "cma-ca98 free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { institution?: string; docket?: string; id?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.equal(man.cards?.[0]?.institution, "Citigroup Global Markets Limited / Deutsche Bank Aktiengesellschaft");
      assert.equal(man.cards?.[0]?.docket, "50601-citi-db");
      const manBlob = JSON.stringify(man);
      assert.ok(!manBlob.includes("Citi-DB Relevant Period"));
      assert.ok(!manBlob.includes("gilt auctions"));
      assert.ok(!manBlob.includes("commercially sensitive information"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${CMA_CA98_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { institution: string; date: string; docket: string; body: string }[];
      };
      assert.equal(paidBody.product, "cma-ca98-infringement-decision-bodies");
      assert.equal(paidBody.cards[0]?.institution, "Citigroup Global Markets Limited / Deutsche Bank Aktiengesellschaft");
      assert.equal(paidBody.cards[0]?.date, "2025-02-21");
      assert.equal(paidBody.cards[0]?.docket, "50601-citi-db");
      assert.ok(paidBody.cards[0]?.body.includes("Citi-DB Relevant Period"));
      assert.ok(paidBody.cards[0]?.body.includes("gilt auctions"));
      assert.ok(paidBody.cards[0]?.body.includes("commercially sensitive information"));
    },
  );

  const f483Dir = mkdtempSync(join(tmpdir(), "form-483-"));
  writeFileSync(
    join(f483Dir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "fda-form-483-bodies",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-07-31",
      sources: {
        listing:
          "https://www.fda.gov/about-fda/office-inspections-and-investigations/oii-foia-electronic-reading-room",
        mediaBase: "https://www.fda.gov/media/",
      },
      letters: [
        {
          id: "cascade-specialty-pharmacy-llc-193964",
          mediaId: "193964",
          firm: "Cascade Specialty Pharmacy LLC",
          fei: "3015133983",
          recordDate: "2026-07-17",
          publishedOn: "2026-07-31",
          issuedOn: "2026-07-17",
          state: "Washington",
          country: null,
          establishmentType: "Producer of Non Sterile Drug Products",
          sourceUrl: "https://www.fda.gov/media/193964/download",
          filename: "cascade_specialty_pharmacy_llc_3015133983_483_7-17-26_redacted.508.pdf",
          body: "This document lists observations made by the FDA representative(s) during the inspection of your facility. They are inspectional observations.\nDURING AN INSPECTION OF YOUR FIRM WE OBSERVED:\nOBSERVATION 1\nThe responsibilities and procedures applicable to the quality control unit are not fully followed.\nSpecifically,\nYour firm's written procedure designates the pharmacist as responsible for ensuring the accuracy of compounding records. For example: your firm manufactured Gabapentin 100 mg/mL Suspension Stock Solution Lot 656519.",
          observations: [
            {
              n: 1,
              text: "OBSERVATION 1\nThe responsibilities and procedures applicable to the quality control unit are not fully followed.",
            },
          ],
        },
      ],
    }),
  );

  await withServer(
    {
      FORM_483_DIR: f483Dir,
      FORM_483_TTL_MS: String(24 * 3600 * 1000),
      X402_SKIP_SETTLE: "1",
    },
    async (base) => {
      const unpaid = await fetch(`${base}${FORM_483_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /form-483 must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string }[];
      };
      assert.equal(body402.resource, FORM_483_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, FORM_483_AMOUNT_ATOMIC);
      const f483Pr = unpaid.headers.get("payment-required");
      assert.ok(f483Pr, "v2 PAYMENT-REQUIRED header");
      const f483V2 = JSON.parse(Buffer.from(f483Pr, "base64").toString("utf8")) as {
        extensions?: { bazaar?: { info?: { input?: { method?: string } } } };
      };
      assert.equal(f483V2.extensions?.bazaar?.info?.input?.method, "GET");

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === FORM_483_PATH), true);
      assert.equal(shop.products.length, 30);

      const wk = (await (await fetch(`${base}${WELL_KNOWN_PATH}`)).json()) as {
        resources: string[];
        instructions?: string;
      };
      assert.equal(wk.resources.length, 30);
      assert.ok(wk.resources.some((r) => r.endsWith(FORM_483_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(MARINERS_D11_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(MARINERS_D7_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(MARINERS_D8_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(UNTITLED_LETTERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(PCAC_PATH)));
      assert.ok((wk.instructions ?? "").includes("thirty paid"));

      const spec = (await (await fetch(`${base}${OPENAPI_PATH}`)).json()) as {
        paths: Record<string, { get?: { "x-payment-info"?: { price?: { amount?: string } } } }>;
      };
      assert.equal(spec.paths[FORM_483_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
      assert.ok(spec.paths[FORM_483_MANIFEST_PATH]?.get);
      assert.equal(
        Object.keys(spec.paths).filter((p) => spec.paths[p].get?.["x-payment-info"]).length,
        29,
      );

      const llmsBody = await (await fetch(`${base}${LLMS_PATH}`)).text();
      assert.ok(llmsBody.includes("GET /form-483"));
      assert.ok(!llmsBody.includes("WASDE"));

      const manifest = await fetch(`${base}${FORM_483_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "form-483 free manifest is free");
      const man = (await manifest.json()) as {
        letterCount?: number;
        letters?: { firm?: string; body?: string }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.letterCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.letters?.[0]?.firm, "Cascade Specialty Pharmacy LLC");
      assert.ok(!JSON.stringify(man).includes("Gabapentin 100 mg/mL"));
      assert.ok(!("body" in (man.letters?.[0] ?? {})));

      const paid = await fetch(`${base}${FORM_483_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        letters: { firm: string; recordDate: string; body: string }[];
      };
      assert.equal(paidBody.product, "fda-form-483-bodies");
      assert.equal(paidBody.letters[0]?.firm, "Cascade Specialty Pharmacy LLC");
      assert.equal(paidBody.letters[0]?.recordDate, "2026-07-17");
      assert.ok(paidBody.letters[0]?.body.includes("This document lists observations"));
      assert.ok(paidBody.letters[0]?.body.includes("Gabapentin 100 mg/mL"));
      assert.equal(isPublicBazaarSku("form-483"), true);
      const persistReqs = facilitatorPaymentRequirements("https://ticks.bnm.farm/form-483", "form-483");
      assert.equal(persistReqs.resource, "https://ticks.bnm.farm/form-483");
      const persist = facilitatorBody("not-json", persistReqs);
      const persistPayload = persist.paymentPayload as { resource?: string; extensions?: { bazaar?: unknown } };
      assert.equal(persistPayload.resource, "https://ticks.bnm.farm/form-483");
      assert.deepEqual(persistPayload.extensions?.bazaar, bazaarExtension("form-483"));
    },
  );

  const gmpDir = mkdtempSync(join(tmpdir(), "gmp-"));
  writeFileSync(
    join(gmpDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "hc-gmp-report-cards",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-04-13",
      license: "Contains information licensed under the Open Government Licence – Canada.",
      sources: {
        listing: "https://www.drug-inspections.canada.ca/gmp/index-en.html",
        search: "https://www.drug-inspections.canada.ca/gmp/controller/searchResult.ashx",
        card: "https://www.drug-inspections.canada.ca/gmp/controller/fullReportCard.ashx",
      },
      cards: [
        {
          id: "apotex-inc-88796",
          inspectionNumber: "88796",
          firm: "Apotex Inc",
          referenceNumber: "501259",
          site: "A",
          inspectedOn: "2026-04-13",
          rating: "C",
          ratingDesc: "Compliant",
          insType: "GMP Domestic",
          insSubType: "Regular Inspection",
          sourceUrl: "https://www.drug-inspections.canada.ca/gmp/fullReportCard-en.html?insNumber=88796&lang=en",
          outcome: ["Inspection resulted in a Compliant rating."],
          measuresTaken: ["Drug Establishment Licence was maintained."],
          body: "Health Canada Drug GMP inspection report card\nEstablishment: Apotex Inc\nInspection: 88796\nReference: 501259\nInspected: 2026-04-13\nRating: Compliant\n\nSummary of observations\n\n1. C.02.011 - Manufacturing control\nInvestigations into deviations, reports, and/or follow-up actions were inadequate.",
          observations: [
            {
              n: 1,
              regulation: "C.02.011 - Manufacturing control",
              cite: "C.02.011",
              text: "Investigations into deviations, reports, and/or follow-up actions were inadequate.",
            },
          ],
        },
      ],
    }),
  );

  await withServer(
    {
      FORM_483_DIR: f483Dir,
      GMP_DIR: gmpDir,
      X402_SKIP_SETTLE: "1",
    },
    async (base) => {
      const unpaid = await fetch(`${base}${GMP_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /gmp must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, GMP_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, GMP_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === GMP_PATH), true);
      assert.equal(shop.products.length, 31, "thirty-first product is /gmp when a real observation body is cached");

      const wk = (await (await fetch(`${base}${WELL_KNOWN_PATH}`)).json()) as {
        resources: string[];
        instructions?: string;
      };
      assert.equal(wk.resources.length, 31);
      assert.ok(wk.resources.some((r) => r.endsWith(GMP_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(MARINERS_D8_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(UNTITLED_LETTERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(AWA_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(SWISSPAR_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(PCAC_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(FTC_WL_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(CFPB_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(OCC_CD_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(FDIC_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(FRB_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(NCUA_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(FINCEN_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(FERC_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(OFAC_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(BIS_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(CFTC_ORDERS_PATH)));
      assert.ok((wk.instructions ?? "").includes("thirty-one paid"));

      const spec = (await (await fetch(`${base}${OPENAPI_PATH}`)).json()) as {
        paths: Record<string, { get?: { "x-payment-info"?: { price?: { amount?: string } } } }>;
      };
      assert.equal(spec.paths[GMP_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
      assert.ok(spec.paths[GMP_MANIFEST_PATH]?.get);
      assert.equal(
        Object.keys(spec.paths).filter((p) => spec.paths[p].get?.["x-payment-info"]).length,
        30,
      );

      const llmsBody = await (await fetch(`${base}${LLMS_PATH}`)).text();
      assert.ok(llmsBody.includes("GET /gmp"));
      assert.ok(!llmsBody.includes("WASDE"));
      assert.ok(!llmsBody.includes("TCPA"));

      const manifest = await fetch(`${base}${GMP_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "gmp free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { firm?: string; body?: string; observations?: unknown }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.firm, "Apotex Inc");
      assert.ok(!JSON.stringify(man).includes("Investigations into deviations"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));
      assert.ok(!("observations" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${GMP_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { firm: string; inspectionNumber: string; body: string }[];
      };
      assert.equal(paidBody.product, "hc-gmp-report-cards");
      assert.equal(paidBody.cards[0]?.firm, "Apotex Inc");
      assert.equal(paidBody.cards[0]?.inspectionNumber, "88796");
      assert.ok(paidBody.cards[0]?.body.includes("C.02.011"));
      assert.ok(paidBody.cards[0]?.body.includes("Investigations into deviations"));
      assert.equal(isPublicBazaarSku("gmp"), true);
      const persistReqs = facilitatorPaymentRequirements("https://ticks.bnm.farm/gmp", "gmp");
      assert.equal(persistReqs.resource, "https://ticks.bnm.farm/gmp");
      assert.equal((persistReqs.extra as { name?: string }).name, "USD Coin");
      const persist = facilitatorBody("not-json", persistReqs);
      const persistPayload = persist.paymentPayload as { resource?: string; extensions?: { bazaar?: unknown } };
      assert.equal(persistPayload.resource, "https://ticks.bnm.farm/gmp");
      assert.deepEqual(persistPayload.extensions?.bazaar, bazaarExtension("gmp"));
    },
  );

  const gmpMdDir = mkdtempSync(join(tmpdir(), "gmp-md-"));
  writeFileSync(
    join(gmpMdDir, "snapshot.json"),
    JSON.stringify({
      ok: true,
      product: "hc-md-inspection-cards",
      status: "ok",
      reason: null,
      fetchedAt: FRESH_FETCHED_AT,
      asOf: "2026-05-25",
      license: "Contains information licensed under the Open Government Licence – Canada.",
      sources: {
        listing: "https://www.drug-inspections.canada.ca/md/index-en.html",
        search: "https://www.drug-inspections.canada.ca/md/handler/searchResult.ashx",
        card: "https://www.drug-inspections.canada.ca/md/handler/fullReportCard.ashx",
      },
      cards: [
        {
          id: "can-med-healthcare-501",
          inspectionNumber: "501",
          firm: "CAN-MED HEALTHCARE",
          referenceNumber: "111868",
          site: "Nova Scotia",
          inspectedOn: "2026-05-25",
          rating: "Non-compliant",
          ratingDesc: "Non-compliant",
          insType: "Domestic - Regular - Onsite",
          insSubType: null,
          sourceUrl: "https://www.drug-inspections.canada.ca/md/fullReportCard-en.html?insNumber=501&lang=en",
          outcome: ["The inspection resulted in a non-compliant rating."],
          measuresTaken: ["Detention of products"],
          body: "Health Canada medical-device inspection report card\nEstablishment: CAN-MED HEALTHCARE\nInspection: 501\nReference: 111868\nInspected: 2026-05-25\nRating: Non-compliant\n\nSummary of observations\n\n1. MDR s.58 (b) Recall procedure\nRisk 1: The company did not adequately implement the written procedure for recalls.",
          observations: [
            {
              n: 1,
              regulation: "MDR s.58 (b) Recall procedure",
              cite: "MDR s.58 (b)",
              text: "Risk 1: The company did not adequately implement the written procedure for recalls.",
            },
          ],
        },
      ],
    }),
  );

  await withServer(
    {
      FORM_483_DIR: f483Dir,
      GMP_DIR: gmpDir,
      GMP_MD_DIR: gmpMdDir,
      X402_SKIP_SETTLE: "1",
    },
    async (base) => {
      const unpaid = await fetch(`${base}${GMP_MD_PATH}`);
      assert.equal(unpaid.status, 402, "unpaid GET /gmp-md must be 402");
      const body402 = (await unpaid.json()) as {
        payTo: string;
        asset: string;
        resource: string;
        accepts: { maxAmountRequired?: string; extra?: { name?: string } }[];
      };
      assert.equal(body402.resource, GMP_MD_PATH);
      assert.equal(body402.accepts[0]?.maxAmountRequired, GMP_MD_AMOUNT_ATOMIC);
      assert.equal(body402.accepts[0]?.extra?.name, "USD Coin");

      const shop = (await (await fetch(`${base}/`)).json()) as { products: { path: string }[] };
      assert.equal(shop.products.some((p) => p.path === GMP_MD_PATH), true);
      assert.equal(shop.products.some((p) => p.path === GMP_PATH), true, "/gmp stays its own door");
      assert.equal(shop.products.length, 32, "thirty-second product is /gmp-md when a real MD body is cached");

      const wk = (await (await fetch(`${base}${WELL_KNOWN_PATH}`)).json()) as {
        resources: string[];
        instructions?: string;
      };
      assert.equal(wk.resources.length, 32);
      assert.ok(wk.resources.some((r) => r.endsWith(GMP_MD_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(GMP_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(SWISSPAR_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(PCAC_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(FTC_WL_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(NCUA_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(FINCEN_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(FERC_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(OFAC_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(BIS_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.endsWith(CFTC_ORDERS_PATH)));
      assert.ok((wk.instructions ?? "").includes("thirty-two paid"));

      const spec = (await (await fetch(`${base}${OPENAPI_PATH}`)).json()) as {
        paths: Record<string, { get?: { "x-payment-info"?: { price?: { amount?: string } } } }>;
      };
      assert.equal(spec.paths[GMP_MD_PATH]?.get?.["x-payment-info"]?.price?.amount, "0.05");
      assert.ok(spec.paths[GMP_MD_MANIFEST_PATH]?.get);
      assert.equal(
        Object.keys(spec.paths).filter((p) => spec.paths[p].get?.["x-payment-info"]).length,
        31,
      );

      const llmsBody = await (await fetch(`${base}${LLMS_PATH}`)).text();
      assert.ok(llmsBody.includes("GET /gmp-md"));
      assert.ok(llmsBody.includes("GET /gmp"));
      assert.ok(!llmsBody.includes("WASDE"));
      assert.ok(!llmsBody.includes("TCPA"));

      const manifest = await fetch(`${base}${GMP_MD_MANIFEST_PATH}`);
      assert.equal(manifest.status, 200, "gmp-md free manifest is free");
      const man = (await manifest.json()) as {
        cardCount?: number;
        cards?: { firm?: string; body?: string; observations?: unknown }[];
        openapi?: string;
        wellKnown?: string;
      };
      assert.equal(man.cardCount, 1);
      assert.ok(man.openapi?.endsWith(OPENAPI_PATH));
      assert.ok(man.wellKnown?.endsWith(WELL_KNOWN_PATH));
      assert.equal(man.cards?.[0]?.firm, "CAN-MED HEALTHCARE");
      assert.ok(!JSON.stringify(man).includes("written procedure for recalls"));
      assert.ok(!("body" in (man.cards?.[0] ?? {})));
      assert.ok(!("observations" in (man.cards?.[0] ?? {})));

      const paid = await fetch(`${base}${GMP_MD_PATH}`, { headers: { "X-PAYMENT": "test" } });
      assert.equal(paid.status, 200);
      const paidBody = (await paid.json()) as {
        product: string;
        cards: { firm: string; inspectionNumber: string; body: string }[];
      };
      assert.equal(paidBody.product, "hc-md-inspection-cards");
      assert.equal(paidBody.cards[0]?.firm, "CAN-MED HEALTHCARE");
      assert.equal(paidBody.cards[0]?.inspectionNumber, "501");
      assert.ok(paidBody.cards[0]?.body.includes("MDR s.58 (b)"));
      assert.ok(paidBody.cards[0]?.body.includes("written procedure for recalls"));
      assert.ok(!paidBody.cards[0]?.body.includes("C.02."));
      assert.equal(isPublicBazaarSku("gmp-md"), true);
      const persistReqs = facilitatorPaymentRequirements("https://ticks.bnm.farm/gmp-md", "gmp-md");
      assert.equal(persistReqs.resource, "https://ticks.bnm.farm/gmp-md");
      assert.equal((persistReqs.extra as { name?: string }).name, "USD Coin");
      const persist = facilitatorBody("not-json", persistReqs);
      const persistPayload = persist.paymentPayload as { resource?: string; extensions?: { bazaar?: unknown } };
      assert.equal(persistPayload.resource, "https://ticks.bnm.farm/gmp-md");
      assert.deepEqual(persistPayload.extensions?.bazaar, bazaarExtension("gmp-md"));
    },
  );

  await withServer(
    {
      X402_FACILITATOR_URL: "http://127.0.0.1:9",
      CDP_API_KEY_ID: undefined,
      CDP_API_KEY_SECRET: undefined,
      X402_SKIP_SETTLE: undefined,
      TICKS_DIR: "",
      TICKS_PATH: "",
      FORM_483_DIR: join(tmpdir(), "form-483-absent-402-"),
    },
    async (base) => {
      assert.equal(cdpEnvStatus(), "CDP env not set");
      for (const path of [TICKS_PATH, IMPORT_ALERTS_PATH, MARINERS_PATH, MARINERS_D11_PATH, MARINERS_D7_PATH, MARINERS_D8_PATH, WARNING_LETTERS_PATH, UNTITLED_LETTERS_PATH, AWA_PATH, SWISSPAR_PATH, PCAC_PATH, FTC_WL_PATH, CFPB_ORDERS_PATH, OCC_CD_PATH, FDIC_ORDERS_PATH, FRB_ORDERS_PATH, NCUA_ORDERS_PATH, FINCEN_ORDERS_PATH, FERC_ORDERS_PATH, OFAC_ORDERS_PATH, BIS_ORDERS_PATH, CFTC_ORDERS_PATH, FIFRA_ORDERS_PATH, DENOVO_ORDERS_PATH, TTB_OIC_PATH, AIR_LETTERS_PATH, SUPERFUND_RODS_PATH, ICO_MPN_PATH, CMA_CA98_PATH, FORM_483_PATH, GMP_PATH, GMP_MD_PATH]) {
        const unpaid = await fetch(`${base}${path}`);
        assert.equal(unpaid.status, 402, `unpaid ${path} must stay 402`);
        const present = await fetch(`${base}${path}`, { headers: { "X-PAYMENT": "test" } });
        assert.equal(present.status, 402, `${path} unpaid-or-unsettled stays 402 without inventing keys`);
        const body = (await present.json()) as { error?: string };
        assert.notEqual(body.error, "CDP env not set");
      }
      const wk = (await (await fetch(`${base}${WELL_KNOWN_PATH}`)).json()) as { resources: string[] };
      assert.equal(wk.resources.length, 29);
      assert.ok(wk.resources.some((r) => r.includes(WARNING_LETTERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(UNTITLED_LETTERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(AWA_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(SWISSPAR_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(PCAC_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(FTC_WL_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(CFPB_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(OCC_CD_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(FDIC_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(FRB_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(NCUA_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(FINCEN_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(FERC_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(OFAC_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(BIS_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(CFTC_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(FIFRA_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(DENOVO_ORDERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(TTB_OIC_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(AIR_LETTERS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(SUPERFUND_RODS_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(ICO_MPN_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(CMA_CA98_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(MARINERS_D11_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(MARINERS_D7_PATH)));
      assert.ok(wk.resources.some((r) => r.includes(MARINERS_D8_PATH)));
      assert.ok(!wk.resources.some((r) => r.includes(FORM_483_PATH)));
      assert.ok(!wk.resources.some((r) => r.includes(GMP_PATH)));
      assert.ok(!wk.resources.some((r) => r.includes(GMP_MD_PATH)));
    },
  );

  process.env.FORM_483_DIR = join(tmpdir(), "form-483-absent-final-");
  process.env.GMP_DIR = join(tmpdir(), "gmp-absent-final-");
  process.env.GMP_MD_DIR = join(tmpdir(), "gmp-md-absent-final-");
  assert.deepEqual(PUBLIC_BAZAAR_SKUS, ["ticks", "import-alerts", "mariners", "mariners-d11", "mariners-d7", "mariners-d8", "warning-letters", "untitled-letters", "awa", "swisspar", "pcac", "ftc-wl", "cfpb-orders", "occ-cd", "fdic-orders", "frb-orders", "ncua-orders", "fincen-orders", "ferc-orders", "ofac-orders", "bis-orders", "cftc-orders", "fifra-orders", "denovo-orders", "ttb-oic", "air-letters", "superfund-rods", "ico-mpn", "cma-ca98"]);
  assert.equal(isPublicBazaarSku("warning-letters"), true);
  assert.equal(isPublicBazaarSku("untitled-letters"), true);
  assert.equal(isPublicBazaarSku("awa"), true);
  assert.equal(isPublicBazaarSku("swisspar"), true);
  assert.equal(isPublicBazaarSku("pcac"), true);
  assert.equal(isPublicBazaarSku("ftc-wl"), true);
  assert.equal(isPublicBazaarSku("cfpb-orders"), true);
  assert.equal(isPublicBazaarSku("occ-cd"), true);
  assert.equal(isPublicBazaarSku("fdic-orders"), true);
  assert.equal(isPublicBazaarSku("frb-orders"), true);
  assert.equal(isPublicBazaarSku("ncua-orders"), true);
  assert.equal(isPublicBazaarSku("fincen-orders"), true);
  assert.equal(isPublicBazaarSku("ferc-orders"), true);
  assert.equal(isPublicBazaarSku("ofac-orders"), true);
  assert.equal(isPublicBazaarSku("bis-orders"), true);
  assert.equal(isPublicBazaarSku("cftc-orders"), true);
  assert.equal(isPublicBazaarSku("fifra-orders"), true);
  assert.equal(isPublicBazaarSku("denovo-orders"), true);
  assert.equal(isPublicBazaarSku("ttb-oic"), true);
  assert.equal(isPublicBazaarSku("air-letters"), true);
  assert.equal(isPublicBazaarSku("superfund-rods"), true);
  assert.equal(isPublicBazaarSku("ico-mpn"), true);
  assert.equal(isPublicBazaarSku("cma-ca98"), true);
  assert.equal(isPublicBazaarSku("form-483"), false, "do not persist /form-483 to Bazaar without a cached body");
  assert.equal(isPublicBazaarSku("gmp"), false, "do not persist /gmp to Bazaar without a cached observation body");
  assert.equal(isPublicBazaarSku("gmp-md"), false, "do not persist /gmp-md to Bazaar without a cached observation body");
  assert.deepEqual(publicBazaarSkus(), [...PUBLIC_BAZAAR_SKUS]);
  const hidden = facilitatorPaymentRequirements("https://ticks.bnm.farm/form-483", "form-483");
  assert.equal(hidden.extensions, undefined, "/form-483 must not persist to Bazaar until a real body is cached");
  const hiddenGmp = facilitatorPaymentRequirements("https://ticks.bnm.farm/gmp", "gmp");
  assert.equal(hiddenGmp.extensions, undefined, "/gmp must not persist to Bazaar until a real observation body is cached");
  const hiddenGmpMd = facilitatorPaymentRequirements("https://ticks.bnm.farm/gmp-md", "gmp-md");
  assert.equal(hiddenGmpMd.extensions, undefined, "/gmp-md must not persist to Bazaar until a real observation body is cached");
  for (const sku of publicBazaarSkus()) {
    const resource = `https://ticks.bnm.farm/${sku === "ticks" ? "ticks" : sku}`;
    const reqs = facilitatorPaymentRequirements(resource, sku);
    assert.equal(reqs.resource, resource);
    assert.equal(reqs.payTo, PAY_TO);
    assert.equal((reqs.extra as { name?: string }).name, "USD Coin");
    assert.ok(reqs.extensions && typeof reqs.extensions === "object");
    const bazaar = (reqs.extensions as { bazaar?: { info?: { input?: { method?: string } } } }).bazaar;
    assert.equal(bazaar?.info?.input?.method, "GET");
    assert.deepEqual(bazaar, bazaarExtension(sku));
    assert.equal(
      Object.prototype.hasOwnProperty.call(reqs, "outputSchema"),
      false,
      "do not reintroduce outputSchema: null on CDP v1 persist",
    );

    const persist = facilitatorBody("not-json", reqs);
    const payload = persist.paymentPayload as { resource?: string; extensions?: { bazaar?: unknown } };
    assert.equal(payload.resource, resource, "CDP persist needs paymentPayload.resource");
    assert.deepEqual(payload.extensions?.bazaar, bazaarExtension(sku));
    assert.deepEqual(
      (persist.paymentRequirements as { extensions?: { bazaar?: unknown } }).extensions?.bazaar,
      bazaarExtension(sku),
    );
  }

  console.log("ticks-door tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
