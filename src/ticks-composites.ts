/**
 * Daily rollups of official ticks already on GET /ticks.
 * Median of printed USDA/farm-plan rows only. No Craigslist, Facebook, yard
 * calls, or invented quotes. Empty books omit the composite.
 */

export type OfficialComposite = {
  id: string;
  label: string;
  group: string;
  unit: string;
  price: number;
  method: "median";
  sourceCount: number;
  asOf: string;
  note: string;
};

type Tickish = Record<string, unknown>;

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function blob(row: Tickish): string {
  return [row.id, row.commodity, row.label, row.market, row.source, row.classGrade]
    .map((v) => str(v).toLowerCase())
    .join(" ");
}

function asOfDay(row: Tickish): string | null {
  const day = str(row.asOf || row.reportDate).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function officialPrice(row: Tickish): number | null {
  const price = row.price;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
  return price;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const raw = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(raw * 10000) / 10000;
}

function unitIs(row: Tickish, want: string): boolean {
  return str(row.unit).replace(/\s+/g, "").toLowerCase() === want.replace(/\s+/g, "").toLowerCase();
}

function isOrganicPrint(row: Tickish): boolean {
  return /\borganic\b/.test(blob(row));
}

function isPnwHayGeography(row: Tickish): boolean {
  const id = str(row.id).toLowerCase();
  if (id.startsWith("hay.ams_3056") || id.startsWith("hay.ams_3057") || id.startsWith("hay.ams_3058")) return true;
  if (id.startsWith("hay-id-")) return true;
  return /\b(idaho|oregon|columbia_basin|columbia basin|pacific northwest|\bpnw\b)\b/.test(blob(row));
}

function isAlfalfaTon(row: Tickish): boolean {
  if (str(row.group) !== "hay") return false;
  if (!unitIs(row, "$/ton")) return false;
  return /\balfalfa\b/.test(blob(row));
}

function isFeederSteerCwt(row: Tickish): boolean {
  if (str(row.group) !== "cattle") return false;
  const unit = str(row.unit);
  if (unit && !unitIs(row, "$/cwt")) return false;
  const id = str(row.id).toLowerCase();
  if (/feeder-steers-ml1$/.test(id)) return false;
  if (/dairy.?steer/.test(blob(row))) return false;
  if (id.includes("feeder-steer")) return true;
  return /\bfeeder steers?\b/.test(blob(row)) && !/heifer/.test(id);
}

function rollup(
  spec: Omit<OfficialComposite, "price" | "sourceCount" | "asOf" | "method">,
  rows: Tickish[],
): OfficialComposite | null {
  const used: { price: number; asOf: string }[] = [];
  for (const row of rows) {
    const price = officialPrice(row);
    const asOf = asOfDay(row);
    if (price == null || !asOf) continue;
    used.push({ price, asOf });
  }
  const price = median(used.map((r) => r.price));
  const asOf = used.map((r) => r.asOf).sort().at(-1);
  if (price == null || !asOf) return null;
  return {
    ...spec,
    price,
    method: "median",
    sourceCount: used.length,
    asOf,
  };
}

export function computeOfficialComposites(ticks: unknown[]): OfficialComposite[] {
  const rows = ticks.filter((row): row is Tickish => !!row && typeof row === "object" && !Array.isArray(row));
  const specs: { spec: Omit<OfficialComposite, "price" | "sourceCount" | "asOf" | "method">; pick: (row: Tickish) => boolean }[] = [
    {
      spec: {
        id: "composite.pnw.alfalfa.ton",
        label: "Idaho/PNW alfalfa",
        group: "hay",
        unit: "$/ton",
        note: "Median of official Idaho/Oregon/Columbia Basin alfalfa $/ton ticks already on this door. Not a barn quote.",
      },
      pick: (row) => isAlfalfaTon(row) && isPnwHayGeography(row) && !isOrganicPrint(row),
    },
    {
      spec: {
        id: "composite.us.feeder_steer.cwt",
        label: "National feeder steer",
        group: "cattle",
        unit: "$/cwt",
        note: "Median of official feeder-steer $/cwt ticks already on this door (per-report ML1 headlines excluded). Not a yard call.",
      },
      pick: isFeederSteerCwt,
    },
    {
      spec: {
        id: "composite.us.dairy.class_i.cwt",
        label: "FMMO base Class I",
        group: "dairy",
        unit: "$/cwt",
        note: "Median of official AMS FMMO base Class I $/cwt ticks already on this door.",
      },
      pick: (row) => str(row.group) === "dairy" && unitIs(row, "$/cwt") && /class_i/.test(str(row.id)),
    },
    {
      spec: {
        id: "composite.us.dairy.butter.lb",
        label: "CME Grade AA butter weekly",
        group: "dairy",
        unit: "$/lb",
        note: "Median of official AMS Dairy Market News weekly Grade AA butter $/lb ticks already on this door.",
      },
      pick: (row) => str(row.group) === "dairy" && unitIs(row, "$/lb") && /butter\.grade_aa\.weekly/.test(str(row.id)),
    },
    {
      spec: {
        id: "composite.us.dairy.ndm.lb",
        label: "CME Grade A NDM weekly",
        group: "dairy",
        unit: "$/lb",
        note: "Median of official AMS Dairy Market News weekly Grade A NDM $/lb ticks already on this door.",
      },
      pick: (row) => str(row.group) === "dairy" && unitIs(row, "$/lb") && /ndm\.grade_a\.weekly/.test(str(row.id)),
    },
    {
      spec: {
        id: "composite.us.dairy.cream_butterfat.lb",
        label: "Fluid cream butterfat",
        group: "dairy",
        unit: "$/lb butterfat",
        note: "Median of official AMS fluid-cream FOB $/lb butterfat ticks already on this door.",
      },
      pick: (row) =>
        str(row.group) === "dairy" &&
        unitIs(row, "$/lb butterfat") &&
        /cream/.test(str(row.id)) &&
        /butterfat/.test(str(row.id)),
    },
    {
      spec: {
        id: "composite.us.hogs.negotiated_carcass.cwt",
        label: "National negotiated hog carcass",
        group: "hogs",
        unit: "$/cwt",
        note: "Median of official AMS negotiated hog carcass $/cwt ticks already on this door (AMS_2872).",
      },
      pick: (row) => str(row.group) === "hogs" && unitIs(row, "$/cwt") && /negotiated\.carcass/.test(str(row.id)),
    },
    {
      spec: {
        id: "composite.us.hogs.pork_cutout.cwt",
        label: "National pork cutout",
        group: "hogs",
        unit: "$/cwt",
        note: "Median of official AMS pork cutout $/cwt ticks already on this door (AMS_2872).",
      },
      pick: (row) => str(row.group) === "hogs" && unitIs(row, "$/cwt") && /pork\.cutout/.test(str(row.id)),
    },
  ];

  const out: OfficialComposite[] = [];
  for (const item of specs) {
    const hit = rollup(item.spec, rows.filter(item.pick));
    if (hit) out.push(hit);
  }
  return out;
}

export function attachOfficialComposites<T extends { ticks?: unknown[] }>(payload: T): T & { composites?: OfficialComposite[] } {
  const composites = computeOfficialComposites(Array.isArray(payload.ticks) ? payload.ticks : []);
  if (composites.length === 0) return payload;
  return { ...payload, composites };
}
