// SQUARE DES HEROS: the bronze group's level of detail (a copy of tools/stalle_statue_pack.mjs that keeps every piece over 1 % of
// the triangles: the Victory, the soldier, the wings and the rock may be separate shells). THE STATUE'S LEVEL OF DETAIL (meshoptimizer, JavaScript: the project's rule, never Blender's decimate):
// models/heros/statue_raw.json (tools/blender/stalle_statue.py: one watertight voxel-remeshed surface, ~200k tris)
//   -> models/heros/statue_mesh.json (the target count, error-bounded), placed on the pedestal by tools/blender/stalle.py.
//   node tools/stalle_statue_pack.mjs [models/heros] [target tris = 14000] [max error m = 0.004]
import fs from "fs";
import path from "path";
import { MeshoptSimplifier } from "./worker/node_modules/meshoptimizer/meshopt_simplifier.js";

const dir = process.argv[2] || "models/heros", want = +(process.argv[3] || 14000), maxErr = +(process.argv[4] || 0.004);
const raw = JSON.parse(fs.readFileSync(path.join(dir, "statue_raw.json")));
await MeshoptSimplifier.ready;
// keep the largest connected piece only: the voxel remesh leaves small loose islands (inner pockets of the drapery, bits
// of thin cloth; 75 islands, 0.25 % of the triangles) that overlap the figure's surface (audit: coplanar + open edges)
const par = new Int32Array(raw.verts.length).map((_, i) => i);
const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
for (const f of raw.faces) { const a = find(f[0]), b = find(f[1]), c = find(f[2]); par[a] = c; par[b] = c; }
const size = new Map(); for (const f of raw.faces) { const r = find(f[0]); size.set(r, (size.get(r) || 0) + 1); }
const keep = new Set([...size.entries()].filter(([, n]) => n > raw.faces.length * 0.01).map(([r]) => r));
console.log("pieces:", [...size.values()].sort((a, b) => b - a).join(", "));
const faces0 = raw.faces.filter((f) => keep.has(find(f[0])));
const P = new Float32Array(raw.verts.flat()), I = new Uint32Array(faces0.flat());
// error bound (default 4 mm on the ~1 m figure, seen from >= 3 m below): the target count is reached before it on the
// voxel-remeshed surface (0.6 mm stopped at ~108k tris); the folds, the face, the fingers survive, flat robe areas thin out
const [out, err] = MeshoptSimplifier.simplify(I, P, 3, want * 3, maxErr / 1.1, ["LockBorder"]);
// compact the vertices
const map = new Map(), verts = [], faces = [];
for (let t = 0; t < out.length; t += 3) {
  const f = [];
  for (let k = 0; k < 3; k++) {
    const v = out[t + k];
    if (!map.has(v)) { map.set(v, verts.length); verts.push([+P[v * 3].toFixed(5), +P[v * 3 + 1].toFixed(5), +P[v * 3 + 2].toFixed(5)]); }
    f.push(map.get(v));
  }
  faces.push(f);
}
// the far variant's statue (LOD1/2, 80 m and beyond): ~900 triangles, 2 cm error
{
  const [o2, e2] = MeshoptSimplifier.simplify(I, P, 3, 900 * 3, 0.03 / 1.1, ["LockBorder"]);
  const m2 = new Map(), v2 = [], f2 = [];
  for (let t = 0; t < o2.length; t += 3) { const f = []; for (let k = 0; k < 3; k++) { const v = o2[t + k]; if (!m2.has(v)) { m2.set(v, v2.length); v2.push([+P[v * 3].toFixed(4), +P[v * 3 + 1].toFixed(4), +P[v * 3 + 2].toFixed(4)]); } f.push(m2.get(v)); } f2.push(f); }
  fs.writeFileSync(path.join(dir, "statue_far.json"), JSON.stringify({ verts: v2, faces: f2, height: raw.height, error_m: +(e2 * 1.1).toFixed(4), note: "far variant (tools/stalle_statue_pack.mjs)" }));
  console.log(`statue far: ${f2.length} triangles, error ${(e2 * 1100).toFixed(1)} mm`);
}
fs.writeFileSync(path.join(dir, "statue_mesh.json"), JSON.stringify({ verts, faces, height: raw.height, source_tris: I.length / 3, error_m: +(err * 1.1).toFixed(5),
  note: "tools/blender/stalle_statue.py -> tools/stalle_statue_pack.mjs (meshoptimizer simplify)" }));
console.log(`statue: ${raw.faces.length} (${size.size} pieces, kept ${keep.size}: ${I.length / 3}) -> ${faces.length} triangles, ${verts.length} vertices, error ${(err * 1100).toFixed(2)} mm`);
