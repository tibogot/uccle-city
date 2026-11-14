// debug: which NEW mesh-audit items (roofs on vs off) lie on a roof-kit parapet. node tools/roofs/classify.mjs I6 old.json new.json group
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyseBuildings } from "../../viewer/facadeGeom.js";
import { roofCollector } from "../../viewer/roofs/roofPlace.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [t, fa, fb, g = "details+walls"] = process.argv.slice(2);
const dir = path.join(ROOT, "data/tiles", t);
const doc = JSON.parse(fs.readFileSync(path.join(dir, "buildings.json"), "utf8"));
doc.buildings = doc.buildings.filter((b) => b.attrs?.BU_ID !== "https://databrussels.be/id/building/1587133");
const b = fs.readFileSync(path.join(dir, "buildings.bin"));
const rc = roofCollector();
analyseBuildings(doc, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), JSON.parse(fs.readFileSync(path.join(dir, "roads.json"))), JSON.parse(fs.readFileSync(path.join(dir, "features.json"))), { roofs: rc });
const P = rc.parapets;
const onPar = (x, y, z) => P.some((q) => {
  const dx = q.B[0] - q.A[0], dz = q.B[2] - q.A[2], L2 = dx * dx + dz * dz || 1e-9, s = Math.max(0, Math.min(1, ((x - q.A[0]) * dx + (z - q.A[2]) * dz) / L2));
  const d = Math.hypot(q.A[0] + dx * s - x, q.A[2] + dz * s - z), yy = q.A[1] + (q.B[1] - q.A[1]) * s;
  return d < 0.45 && y > yy - 0.1 && y < yy + q.h + 0.15;
});
const load = (f) => JSON.parse(fs.readFileSync(f))[t].groups[g].items;
const A = load(fa), B = load(fb);
const key = (i) => i.at.map((v) => Math.round(v * 2) / 2).join(",");
for (const c of ["coplanar", "crossing", "depth", "leak"]) {
  const ca = new Map(); for (const i of A[c] || []) ca.set(key(i), (ca.get(key(i)) || 0) + 1);
  let par = 0, other = 0; const ex = [];
  for (const i of B[c] || []) { const k = key(i); if (ca.get(k)) { ca.set(k, ca.get(k) - 1); continue; } if (onPar(...i.at)) { par++; if (ex.length < 5) ex.push(i.at.map((v) => +v.toFixed(2))); } else other++; }
  console.log(c, "new on parapets", par, "elsewhere", other, JSON.stringify(ex));
}
