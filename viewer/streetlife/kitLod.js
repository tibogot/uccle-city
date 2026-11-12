// LOD1 of a kit mesh with meshoptimizer (JS, never Blender decimate): weld by position + slot (the kit splits vertices
// at every hard edge, which meshopt would read as locked borders), simplify to an absolute error, then give every
// corner the area-weighted average of the face normals around it that are within CREASE of its own face (flat faces
// stay flat, round parts stay round, no normal bleeding across a hard edge).
import { MeshoptSimplifier } from "meshoptimizer/simplifier";

const CREASE = Math.cos(25 * Math.PI / 180);   // below the checker's 30 deg streak spread
/** per-kind target error (m) of LOD1: what still reads at its LOD1 range */
const ERROR = { pump: 0.006, column: 0.01, table: 0.006, chair: 0.006, parasol: 0.006, cross: 0.008, postbox: 0.004, bubble: 0.015, chute: 0.005, pole: 0.006, post: 0.006, dock: 0.004 };

export async function simplifyKit(a, kind = "") {
  await MeshoptSimplifier.ready;
  const P = a.position, S = a.slot, n = S.length;
  // weld: same position (0.05 mm) and slot
  // flat-shaded vertices (normal = their face's normal: chamfered boxes, panels) keep their face apart (the normal is
  // in the weld key), so meshopt leaves hard-edged parts as they are and simplifies the smooth ones (lathes, tubes)
  const flat = new Uint8Array(n), Nn = a.normal, I0 = a.index;
  for (let t = 0; t < I0.length; t += 3) {
    const A = I0[t] * 3, B = I0[t + 1] * 3, C = I0[t + 2] * 3;
    const ux = P[B] - P[A], uy = P[B + 1] - P[A + 1], uz = P[B + 2] - P[A + 2], vx = P[C] - P[A], vy = P[C + 1] - P[A + 1], vz = P[C + 2] - P[A + 2];
    let fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx; const l = Math.hypot(fx, fy, fz) || 1; fx /= l; fy /= l; fz /= l;
    for (const q of [I0[t], I0[t + 1], I0[t + 2]]) if (Nn[3 * q] * fx + Nn[3 * q + 1] * fy + Nn[3 * q + 2] * fz > 0.9995) flat[q] = 1;
  }
  const key = new Map(), remap = new Uint32Array(n), wp = [];
  let m = 0;
  for (let i = 0; i < n; i++) {
    const nk = flat[i] ? `|${Math.round(Nn[3 * i] * 100)},${Math.round(Nn[3 * i + 1] * 100)},${Math.round(Nn[3 * i + 2] * 100)}` : "";
    const k = `${Math.round(P[3 * i] * 2e4)},${Math.round(P[3 * i + 1] * 2e4)},${Math.round(P[3 * i + 2] * 2e4)},${S[i]}${nk}`;
    let j = key.get(k);
    if (j === undefined) { j = m++; key.set(k, j); wp.push(P[3 * i], P[3 * i + 1], P[3 * i + 2]); }
    remap[i] = j;
  }
  const idx = new Uint32Array(a.index.length);
  for (let t = 0; t < idx.length; t++) idx[t] = remap[a.index[t]];
  const pos = new Float32Array(wp);
  const err = ERROR[kind] ?? 0.01;
  const [out] = MeshoptSimplifier.simplify(idx, pos, 3, 0, err, ["ErrorAbsolute", "Prune"]);
  const slotOf = new Float32Array(m), normsOf = Array.from({ length: m }, () => []);
  for (let i = 0; i < n; i++) { slotOf[remap[i]] = S[i]; normsOf[remap[i]].push([a.normal[3 * i], a.normal[3 * i + 1], a.normal[3 * i + 2]]); }
  return unweld(out, pos, slotOf);
}

/** non-indexed-by-face output with crease-aware normals */
export function unweld(index, pos, slotOf, normsOf = null) {
  const T = index.length / 3, fn = new Float32Array(T * 3), fa = new Float32Array(T);
  const around = new Map();
  for (let t = 0; t < T; t++) {
    const a = index[3 * t] * 3, b = index[3 * t + 1] * 3, c = index[3 * t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1e-12;
    fn[3 * t] = nx / l; fn[3 * t + 1] = ny / l; fn[3 * t + 2] = nz / l; fa[t] = l / 2;
    for (let k = 0; k < 3; k++) { const v = index[3 * t + k]; if (!around.has(v)) around.set(v, []); around.get(v).push(t); }
  }
  const P = new Float32Array(T * 9), N = new Float32Array(T * 9), S = new Float32Array(T * 3), I = new Uint32Array(T * 3);
  for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) {
    const v = index[3 * t + k], o = 3 * t + k;
    P[3 * o] = pos[3 * v]; P[3 * o + 1] = pos[3 * v + 1]; P[3 * o + 2] = pos[3 * v + 2];
    let nx = 0, ny = 0, nz = 0;
    if (normsOf) {
      // the authored normal of this corner: among the original split copies of the vertex, the one closest to the face
      // (so LOD1 keeps LOD0's smoothing groups exactly; a face that turned too far gets its own flat normal)
      let best = null, bd = 0.6;
      for (const q of normsOf[v]) { const d = q[0] * fn[3 * t] + q[1] * fn[3 * t + 1] + q[2] * fn[3 * t + 2]; if (d > bd) { bd = d; best = q; } }
      if (best) { N[3 * o] = best[0]; N[3 * o + 1] = best[1]; N[3 * o + 2] = best[2]; }
      else { N[3 * o] = fn[3 * t]; N[3 * o + 1] = fn[3 * t + 1]; N[3 * o + 2] = fn[3 * t + 2]; }
      P[3 * o] = pos[3 * v]; P[3 * o + 1] = pos[3 * v + 1]; P[3 * o + 2] = pos[3 * v + 2];
      S[o] = slotOf[v]; I[o] = o;
      continue;
    }
    for (const u of around.get(v)) {
      const d = fn[3 * u] * fn[3 * t] + fn[3 * u + 1] * fn[3 * t + 1] + fn[3 * u + 2] * fn[3 * t + 2];
      if (d >= CREASE) { nx += fn[3 * u] * fa[u]; ny += fn[3 * u + 1] * fa[u]; nz += fn[3 * u + 2] * fa[u]; }
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    N[3 * o] = nx / l; N[3 * o + 1] = ny / l; N[3 * o + 2] = nz / l;
    S[o] = slotOf[v]; I[o] = o;
  }
  return { position: P, normal: N, slot: S, index: I };
}
