// debug: the façade analysis' triangles near a point (walls / details), roofs on. node tools/roofs/probe.mjs I6 x y z [r]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyseBuildings } from "../../viewer/facadeGeom.js";
import { roofCollector } from "../../viewer/roofs/roofPlace.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [t, X, Y, Z, R = 0.3] = process.argv.slice(2);
const dir = path.join(ROOT, "data/tiles", t);
const doc = JSON.parse(fs.readFileSync(path.join(dir, "buildings.json"), "utf8"));
const b = fs.readFileSync(path.join(dir, "buildings.bin"));
const a = analyseBuildings(doc, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), JSON.parse(fs.readFileSync(path.join(dir, "roads.json"))), JSON.parse(fs.readFileSync(path.join(dir, "features.json"))), { roofs: roofCollector() });
for (const [k, g] of [["walls", a.walls], ["details", a.details]]) {
  const P = g.position;
  for (let i = 0; i < P.length; i += 9) {
    const cx = (P[i] + P[i + 3] + P[i + 6]) / 3, cy = (P[i + 1] + P[i + 4] + P[i + 7]) / 3, cz = (P[i + 2] + P[i + 5] + P[i + 8]) / 3;
    let d = Infinity; for (let v = 0; v < 9; v += 3) d = Math.min(d, Math.hypot(P[i + v] - X, P[i + v + 1] - Y, P[i + v + 2] - Z));
    if (d < +R) console.log(k, i / 9, [...P.slice(i, i + 9)].map((v) => +v.toFixed(3)).join(" "), "n", [...g.normal.slice(i, i + 3)].map((v) => +v.toFixed(2)).join(","), k === "walls" ? "aWall " + [...g.aWall.slice(i / 9 * 12, i / 9 * 12 + 4)].map((v) => +v.toFixed(2)).join(",") : "col " + [...g.aCol.slice(i, i + 3)].map((v) => +v.toFixed(2)).join(","));
  }
}
