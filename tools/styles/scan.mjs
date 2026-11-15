// Coverage of the building types (viewer/buildingTypes.js) over every tile: node tools/styles/scan.mjs [--json out]
// Counts per BU_ID (a building of several solids counts once; a building over two tiles counts in each).
import fs from "node:fs";
import { classify, TYPE_NAMES, STATBEL_UCCLE } from "../../viewer/buildingTypes.js";
const root = new URL("../../data/tiles/", import.meta.url);
const tiles = fs.readdirSync(root).filter((t) => fs.existsSync(new URL(`${t}/buildings.json`, root)));
const byType = {}, byForm = {}, cross = {}, seen = new Map();
let solids = 0;
for (const t of tiles) {
  const doc = JSON.parse(fs.readFileSync(new URL(`${t}/buildings.json`, root)));
  const bin = fs.readFileSync(new URL(`${t}/buildings.bin`, root));
  const buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
  const dv = new DataView(buf), V = dv.getUint32(0, true), T = dv.getUint32(4, true);
  const P = new Float32Array(buf, 8, V * 3), I = new Uint32Array(buf, 8 + V * 12, T * 3);
  const r = classify(doc, P, I, () => 0);
  doc.buildings.forEach((b, i) => {
    solids++;
    const key = String(b.attrs?.BU_ID ?? b.id);
    if (seen.has(key)) return;
    seen.set(key, r.type[i]);
    const n = TYPE_NAMES[r.type[i]], f = r.form[i];
    byType[n] = (byType[n] || 0) + 1; byForm[f] = (byForm[f] || 0) + 1;
    const k = `${f} -> ${n}`; cross[k] = (cross[k] || 0) + 1;
    if (r.garage[i]) byType["(garage doors)"] = (byType["(garage doors)"] || 0) + 1;
  });
}
console.log(`${tiles.length} tiles, ${solids} solids, ${seen.size} buildings (BU_ID)`);
console.log("types", byType);
console.log("forms", byForm);
console.log("form -> type", Object.fromEntries(Object.entries(cross).sort()));
console.log("Statbel Uccle 2023 (buildings)", STATBEL_UCCLE);
const out = process.argv.indexOf("--json");
if (out > 0) fs.writeFileSync(process.argv[out + 1], JSON.stringify({ byType, byForm, cross }, null, 1));
