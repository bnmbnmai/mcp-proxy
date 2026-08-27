import assert from "node:assert/strict";
import { attachOfficialComposites, computeOfficialComposites, median } from "./ticks-composites.js";

assert.equal(median([]), null);
assert.equal(median([10]), 10);
assert.equal(median([10, 20]), 15);
assert.equal(median([9, 11, 30]), 11);

assert.deepEqual(computeOfficialComposites([]), []);
assert.deepEqual(computeOfficialComposites([{ id: "hay.ams_2707.texas.alfalfa.premium", group: "hay" }]), []);

const book = [
  {
    id: "hay.ams_3056.idaho.alfalfa.premium.large_square",
    group: "hay",
    commodity: "Alfalfa",
    unit: "$/ton",
    price: 200,
    asOf: "2026-08-21",
    source: "AMS_3056 hay",
  },
  {
    id: "hay.ams_3058.columbia_basin.alfalfa.supreme",
    group: "hay",
    commodity: "Alfalfa",
    unit: "$/ton",
    price: 240,
    asOf: "2026-08-20",
    source: "AMS_3058 Columbia Basin hay",
  },
  {
    id: "hay.ams_2707.texas.alfalfa.premium.small_square",
    group: "hay",
    commodity: "Alfalfa",
    unit: "$/ton",
    price: 15,
    asOf: "2026-08-21",
    source: "AMS_2707 Texas hay",
  },
  {
    id: "hay.ams_2904.north_inter_mountains.organic.alfalfa.supreme.large_square",
    group: "hay",
    commodity: "Alfalfa",
    classGrade: "Organic supreme, Large Square",
    unit: "$/ton",
    price: 300,
    asOf: "2026-08-14",
    source: "AMS_2904 California hay",
  },
  {
    id: "cattle.ams_2710.texas.feeder-steer.ml1.750lb",
    group: "cattle",
    commodity: "Feeder steers",
    unit: "$/cwt",
    price: 378.74,
    asOf: "2026-08-21",
  },
  {
    id: "cattle.ams_2710.texas.feeder-steers-ml1",
    group: "cattle",
    commodity: "Feeder steers",
    unit: "$/cwt",
    price: 400,
    asOf: "2026-08-21",
  },
  {
    id: "cattle-tf-feeder-steer",
    group: "cattle",
    commodity: "Feeder steers",
    unit: "$/cwt",
    price: 400.2,
    asOf: "2026-08-12",
  },
  {
    id: "dairy.ams_2998.national.class_i.base",
    group: "dairy",
    unit: "$/cwt",
    price: 17.04,
    asOf: "2026-08-21",
  },
  {
    id: "dairy.ams_2998.national.butter.grade_aa.weekly",
    group: "dairy",
    unit: "$/lb",
    price: 1.451,
    asOf: "2026-08-21",
  },
  {
    id: "dairy.ams_2998.national.ndm.grade_a.weekly",
    group: "dairy",
    unit: "$/lb",
    price: 1.7925,
    asOf: "2026-08-21",
  },
  {
    id: "dairy.ams_1102.west.cream.all_classes.butterfat",
    group: "dairy",
    unit: "$/lb butterfat",
    price: 1.7775,
    asOf: "2026-08-28",
  },
  {
    id: "dairy.ams_1101.east.cream.all_classes.butterfat",
    group: "dairy",
    unit: "$/lb butterfat",
    price: 2.0314,
    asOf: "2026-08-28",
  },
  {
    id: "hogs.ams_2872.national.negotiated.carcass",
    group: "hogs",
    unit: "$/cwt",
    price: 90.75,
    asOf: "2026-08-26",
  },
  {
    id: "hogs.ams_2872.iowa_minnesota.negotiated.carcass",
    group: "hogs",
    unit: "$/cwt",
    price: 90.72,
    asOf: "2026-08-26",
  },
  {
    id: "hogs.ams_2872.national.pork.cutout",
    group: "hogs",
    unit: "$/cwt",
    price: 95.55,
    asOf: "2026-08-26",
  },
];

const composites = computeOfficialComposites(book);
const byId = Object.fromEntries(composites.map((row) => [row.id, row]));

assert.equal(byId["composite.pnw.alfalfa.ton"]?.price, 220);
assert.equal(byId["composite.pnw.alfalfa.ton"]?.sourceCount, 2);
assert.equal(byId["composite.pnw.alfalfa.ton"]?.asOf, "2026-08-21");
assert.ok(!composites.some((row) => row.price === 15), "Texas alfalfa is not Idaho/PNW");
assert.ok(!composites.some((row) => row.price === 300), "CA organic alfalfa is not the PNW conventional rollup");

assert.equal(byId["composite.us.feeder_steer.cwt"]?.price, 389.47);
assert.equal(byId["composite.us.feeder_steer.cwt"]?.sourceCount, 2, "headline ML1 rollup is not a source row");
assert.equal(byId["composite.us.feeder_steer.cwt"]?.asOf, "2026-08-21");

assert.equal(byId["composite.us.dairy.class_i.cwt"]?.price, 17.04);
assert.equal(byId["composite.us.dairy.class_i.cwt"]?.sourceCount, 1);
assert.equal(byId["composite.us.dairy.butter.lb"]?.price, 1.451);
assert.equal(byId["composite.us.dairy.ndm.lb"]?.price, 1.7925);
assert.equal(byId["composite.us.dairy.cream_butterfat.lb"]?.price, 1.9045);
assert.equal(byId["composite.us.dairy.cream_butterfat.lb"]?.sourceCount, 2);

assert.equal(byId["composite.us.hogs.negotiated_carcass.cwt"]?.price, 90.735);
assert.equal(byId["composite.us.hogs.negotiated_carcass.cwt"]?.sourceCount, 2);
assert.equal(byId["composite.us.hogs.pork_cutout.cwt"]?.price, 95.55);

assert.equal(computeOfficialComposites(book.filter((row) => row.group === "produce")).length, 0);

const attached = attachOfficialComposites({ ticks: book, product: "idaho-hay-feeder-ticks" });
assert.ok(attached.composites?.some((row) => row.id === "composite.pnw.alfalfa.ton"));
assert.deepEqual(attachOfficialComposites({ ticks: [] }).composites, undefined);

console.log("ticks-composites tests ok");
console.log(JSON.stringify(composites.map((row) => ({ id: row.id, price: row.price, sourceCount: row.sourceCount, asOf: row.asOf }))));
