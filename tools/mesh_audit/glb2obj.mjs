// A packed hero GLB (EXT_meshopt_compression, which Blender's importer lacks) -> OBJ for Blender renders
// (tools/blender/hero_shellview.py): one object per node, usemtl = the slot name, positions + normals as drawn
// (node transforms applied, glTF Y up kept). claude/heroshell 2026-11-18.
//   node tools/mesh_audit/glb2obj.mjs <in.glb> <out.obj> [--nodes A,B]
import { writeFileSync } from "node:fs";
import { readGlb } from "./glb.mjs";
const [inp, out] = process.argv.slice(2);
const ni = process.argv.indexOf("--nodes"), only = ni > 0 ? process.argv[ni + 1].split(",") : null;
const g = await readGlb(inp);
const L = []; let vb = 1;
const byNode = new Map();
for (const p of g.parts) { if (only && !only.includes(p.node)) continue; if (!byNode.has(p.node)) byNode.set(p.node, []); byNode.get(p.node).push(p); }
for (const [node, parts] of byNode) {
  L.push(`o ${node}`);
  for (const p of parts) {
    const P = p.positions, N = p.normals, n = P.length / 3;
    for (let i = 0; i < n; i++) L.push(`v ${P[i * 3].toFixed(4)} ${P[i * 3 + 1].toFixed(4)} ${P[i * 3 + 2].toFixed(4)}`);
    if (N) for (let i = 0; i < n; i++) L.push(`vn ${N[i * 3].toFixed(4)} ${N[i * 3 + 1].toFixed(4)} ${N[i * 3 + 2].toFixed(4)}`);
    L.push(`usemtl ${p.slot || "default"}`);
    const I = p.index || Uint32Array.from({ length: n }, (_, i) => i);
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] + vb, b = I[t + 1] + vb, c = I[t + 2] + vb;
      L.push(N ? `f ${a}//${a} ${b}//${b} ${c}//${c}` : `f ${a} ${b} ${c}`);
    }
    vb += n;
  }
}
writeFileSync(out, L.join("\n") + "\n");
console.log(`${out}: ${byNode.size} nodes, ${vb - 1} vertices`);
