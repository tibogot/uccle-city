// Why do street faces miss the kit? Wall-foot heights vs the building base, and the failing opening points.
//   node tools/facadekit/diagFaces.mjs [tile]
import fs from "fs";
import { analyseBuildings } from "../../viewer/facadeGeom.js";
import { kitCollector } from "../../viewer/facadeKit/placement.js";

const tile = process.argv[2] || "I6";
const dir = new URL(`../../data/tiles/${tile}/`, import.meta.url);
const rd = (f) => fs.readFileSync(new URL(f, dir));
const doc = JSON.parse(rd("buildings.json"));
const bin = rd("buildings.bin"), buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
const roads = JSON.parse(rd("roads.json")), feats = JSON.parse(rd("features.json"));
const col = kitCollector({ debug: true });
const foot = [], why = {};
const face0 = col.face;
col.face = (f) => {
  if (f.street && f.partyH < 999 && !f.landmark) {
    let lo = Infinity;
    for (const { p } of f.tris) for (const q of p) lo = Math.min(lo, q[1]);
    foot.push(Math.round((lo - f.base) * 10) / 10);
  }
  const before = col.stats.skipped;
  const r = face0(f);
  if (col.stats.skipped > before) why[f.wallStyle] = (why[f.wallStyle] || 0) + 1;
  return r;
};
analyseBuildings(doc, buf, roads, feats, { kit: col });
const hist = {};
for (const v of foot) hist[v] = (hist[v] || 0) + 1;
console.log("street-face foot above base (m):", Object.entries(hist).sort((a, b) => a[0] - b[0]).slice(0, 30).map(([k, v]) => `${k}:${v}`).join(" "));
console.log("skipped by style", why);
console.log("why", col.stats.why);
console.log(JSON.stringify(col.stats.sample));
