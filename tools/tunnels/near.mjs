// list the triangles of a GLB with a corner near a point (debug): node tools/tunnels/near.mjs <glb> x y z [r]
import { readGlb } from "../mesh_audit/glb.mjs";
const [file, x, y, z, r = 0.3] = process.argv.slice(2);
const parts = await readGlb(file);
for (const p of parts) {
  const P = p.positions, I = p.index;
  const n = I ? I.length / 3 : P.length / 9;
  for (let t = 0; t < n; t++) {
    const v = [0, 1, 2].map((k) => (I ? I[t * 3 + k] : t * 3 + k));
    const pts = v.map((i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]);
    if (pts.some((q) => Math.hypot(q[0] - x, q[1] - y, q[2] - z) < r)) console.log(p.name, p.slot, pts.map((q) => q.map((c) => c.toFixed(3)).join(",")).join(" | "));
  }
}
