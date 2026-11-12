// Façade statistics of one tile (what the kit must cover): node tools/facadekit/tileStats.mjs [tile]
import fs from "fs";
import { analyseBuildings, hash01, wallStyle } from "../../viewer/facadeGeom.js";
import { kitCollector } from "../../viewer/facadeKit/placement.js";
import { Heightmap } from "../../viewer/heightmap.js";

const tile = process.argv[2] || "I6";
const dir = new URL(`../../data/tiles/${tile}/`, import.meta.url);
const rd = (f) => fs.readFileSync(new URL(f, dir));
const doc = JSON.parse(rd("buildings.json"));
const bin = rd("buildings.bin"), buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
const roads = JSON.parse(rd("roads.json")), feats = JSON.parse(rd("features.json"));
const t0 = performance.now();
const hm = new Heightmap(JSON.parse(rd("terrain.json")), rd("terrain.u16").buffer.slice(0));
const a = analyseBuildings(doc, buf, roads, feats, { kit: kitCollector({ ground: (x, z) => hm.ground(x, z) }) });
console.log(`analysis ${(performance.now() - t0).toFixed(0)} ms`, a.stats);
const hs = doc.buildings.map((b) => b.height).sort((p, q) => p - q);
console.log("height p10/p50/p90", [0.1, 0.5, 0.9].map((p) => hs[Math.floor(p * hs.length)]));
const styles = {};
for (const b of doc.buildings) { const s = wallStyle(hash01(String(b.attrs?.BU_ID ?? b.id) + "s"), b.height); styles[s] = (styles[s] || 0) + 1; }
console.log("wall styles", styles);
if (a.kit) {
  console.log("kit faces", a.kit.faces, "skipped", a.kit.skipped, "run joins", a.kit.runJoins, "free run ends", a.kit.runFree);
  for (const [k, v] of Object.entries(a.kit.pieces)) console.log(`  ${k.padEnd(14)} ${v.length / a.kit.stride}`);
  const ww = {};
  for (const w of a.kit.widths) ww[w] = (ww[w] || 0) + 1;
  console.log("window widths", ww);
}
