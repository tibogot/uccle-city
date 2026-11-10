// THE STATUE'S LEVEL OF DETAIL (meshoptimizer, JavaScript: the project's rule, never Blender's decimate):
// models/stalle/statue_raw.json (tools/blender/stalle_statue.py: one watertight voxel-remeshed surface, ~200k tris)
//   -> models/stalle/statue_mesh.json (the target count, error-bounded), placed on the pedestal by tools/blender/stalle.py.
//   node tools/stalle_statue_pack.mjs [models/stalle] [target tris = 14000]
import fs from "fs";
import path from "path";
import { MeshoptSimplifier } from "./worker/node_modules/meshoptimizer/meshopt_simplifier.js";

const dir = process.argv[2] || "models/stalle", want = +(process.argv[3] || 14000);
const raw = JSON.parse(fs.readFileSync(path.join(dir, "statue_raw.json")));
await MeshoptSimplifier.ready;
const P = new Float32Array(raw.verts.flat()), I = new Uint32Array(raw.faces.flat());
// error 0.6 mm relative to the statue's ~1.1 m: the folds, the face, the fingers survive; flat robe areas thin out
const [out, err] = MeshoptSimplifier.simplify(I, P, 3, want * 3, 0.0006 / 1.1, ["LockBorder"]);
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
fs.writeFileSync(path.join(dir, "statue_mesh.json"), JSON.stringify({ verts, faces, height: raw.height, source_tris: I.length / 3, error_m: +(err * 1.1).toFixed(5),
  note: "tools/blender/stalle_statue.py -> tools/stalle_statue_pack.mjs (meshoptimizer simplify)" }));
console.log(`statue: ${I.length / 3} -> ${faces.length} triangles, ${verts.length} vertices, error ${(err * 1100).toFixed(2)} mm`);
