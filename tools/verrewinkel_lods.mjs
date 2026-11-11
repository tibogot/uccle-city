// THE ROAD BRIDGE'S LODS, CHECKED: the same meshoptimizer simplification the viewer runs at load
// (viewer/rail/bridgeModel.js simplifyWelded, BRIDGE_LODS ratios 1 / 0.3 / 0.06+prune) applied to the GLB here, then the
// mesh checker (tools/mesh_audit) on every level as drawn (all its nodes together), each with its band's END as the
// depth-precision distance. Prints triangles / draws per level; writes <out>/<name>_lod<k>.audit.md|json.
//   node tools/verrewinkel_lods.mjs [models/rail/verrewinkel.glb] [--out dir]
import fs from "fs";
import path from "path";
import { readGlb } from "./mesh_audit/glb.mjs";
import { auditParts, toMarkdown } from "./mesh_audit/audit.js";
import { MeshoptSimplifier } from "./worker/node_modules/meshoptimizer/index.js";

const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith(".glb")) ?? "models/rail/verrewinkel.glb";
const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : path.join(path.dirname(file), "audit");
const LODS = [{ until: 140 },                                                       // as bridgeModel.js ROAD_BRIDGE_LODS
  { drop: ["painted_metal_grey", "wood_frame_dark"], simplify: {}, until: 420 },
  { drop: ["painted_metal_grey", "wood_frame_dark", "glass_window"], simplify: { "*": 0.06 }, prune: true, until: 2000 }];
const IGNORE_BELOW = -1.5;                         // the foundations under the cutting floor (buried)

function simplifyWelded(P, Nn, I, want, prune, error) {
  const n = P.length / 3, canon = new Uint32Array(n), map = new Map(), cpos = [], members = [];
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(P[i * 3] * 1000)},${Math.round(P[i * 3 + 1] * 1000)},${Math.round(P[i * 3 + 2] * 1000)}`;
    let c = map.get(key);
    if (c === undefined) { c = cpos.length / 3; map.set(key, c); cpos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); members.push([]); }
    canon[i] = c; members[c].push(i);
  }
  const ci = new Uint32Array(I.length);
  for (let i = 0; i < I.length; i++) ci[i] = canon[I[i]];
  const flags = ["ErrorAbsolute"]; if (prune) flags.push("Prune");
  const [o] = MeshoptSimplifier.simplify(ci, new Float32Array(cpos), 3, want, error, flags);
  const res = new Uint32Array(o.length), C = cpos;
  for (let t = 0; t < o.length; t += 3) {
    const a = o[t], b = o[t + 1], c = o[t + 2];
    const ux = C[b * 3] - C[a * 3], uy = C[b * 3 + 1] - C[a * 3 + 1], uz = C[b * 3 + 2] - C[a * 3 + 2];
    const vx = C[c * 3] - C[a * 3], vy = C[c * 3 + 1] - C[a * 3 + 1], vz = C[c * 3 + 2] - C[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    for (let k = 0; k < 3; k++) {
      let best = members[o[t + k]][0], bd = -Infinity;
      for (const v of members[o[t + k]]) { const d = Nn[v * 3] * fx + Nn[v * 3 + 1] * fy + Nn[v * 3 + 2] * fz; if (d > bd) { bd = d; best = v; } }
      res[t + k] = best;
    }
  }
  return res;
}

await MeshoptSimplifier.ready;
const { parts, quantum } = await readGlb(file);
const name = path.basename(file, ".glb");
fs.mkdirSync(out, { recursive: true });
let blockingAll = 0;
for (let k = 0; k < LODS.length; k++) {
  const { until, prune, drop = [], simplify = {} } = LODS[k];
  const lp = parts.filter((p) => !k || (!/_fine$/.test(p.node ?? p.name) && !drop.includes(p.slot))).map((p) => {   // the fine node: LOD0 only
    const error = simplify[p.slot] ?? simplify["*"];
    if (!k || error == null) return { ...p, maxDistance: until };
    const idx = simplifyWelded(p.positions, p.normals, p.index, 3, prune, error);
    // flat normals, as the viewer (toNonIndexed + computeVertexNormals): every corner its triangle's normal
    const P = new Float32Array(idx.length * 3), N = new Float32Array(idx.length * 3), I = new Uint32Array(idx.length);
    for (let t = 0; t < idx.length; t += 3) {
      const v = [0, 1, 2].map((c) => [p.positions[idx[t + c] * 3], p.positions[idx[t + c] * 3 + 1], p.positions[idx[t + c] * 3 + 2]]);
      const ux = v[1][0] - v[0][0], uy = v[1][1] - v[0][1], uz = v[1][2] - v[0][2], wx = v[2][0] - v[0][0], wy = v[2][1] - v[0][1], wz = v[2][2] - v[0][2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
      for (let c = 0; c < 3; c++) { P.set(v[c], (t + c) * 3); N.set([nx, ny, nz], (t + c) * 3); I[t + c] = t + c; }
    }
    return { ...p, positions: P, normals: N, index: I, maxDistance: until };
  });
  const tris = lp.reduce((s, p) => s + p.index.length / 3, 0);
  const report = auditParts(lp, { quantum, ignoreBelow: IGNORE_BELOW });
  const SEVB = ["coplanar", "depth", "crossing", "leak", "flipped", "streak", "bentflat"];
  const blocking = SEVB.reduce((s, c) => s + (report.summary.counts[c] ?? 0), 0);
  blockingAll += blocking;
  report.file = `${name} LOD${k}`;
  fs.writeFileSync(path.join(out, `${name}_lod${k}.audit.json`), JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(out, `${name}_lod${k}.audit.md`), toMarkdown(report, { title: `Mesh audit: ${name} LOD${k} (${JSON.stringify(LODS[k])})` }));
  const counts = Object.entries(report.summary.counts).filter(([, v]) => v).map(([c, v]) => `${c} ${v}`).join(" · ");
  console.log(`LOD${k}: ${Math.round(tris)} triangles, ${lp.length} draws (primitives), ${blocking} BLOCKING; ${counts}`);
  console.log("   " + lp.map((p) => `${(p.node ?? p.name).replace(name, "")}/${p.slot} ${p.index.length / 3}`).join(", "));
}
process.exit(blockingAll ? 1 : 0);
