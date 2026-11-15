// THE MOTORBIKE'S LODs on plain arrays (no three.js): the viewer (motoModel.js) and the mesh audit
// (tools/moto/audit.mjs) run the same steps, so what the audit checks is what is drawn.
//   part = { P: Float32Array xyz, N: normals, A: Float32Array per-vertex AO (COLOR_0.r) | null, I: Uint32Array }
// LOD0 welded by position + normal (the glTF's TEXCOORD_0 seams are dropped: the materials use no textures); LOD1+
// simplified by meshoptimizer on a position weld with an absolute error in metres (lodPart).

export const MOTO_LODS = [
  { error: 0, until: 22 },          // LOD0: the Blender model
  { error: 0.0025, until: 70 },     // LOD1: 2.5 mm
  { error: 0.011, until: Infinity },// LOD2: 1.1 cm (small parts pruned)
];

export function weld(part) {
  const { P, N, A, I } = part, n = P.length / 3;
  const map = new Map(), remap = new Uint32Array(n), keep = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(P[i * 3] * 1e5)},${Math.round(P[i * 3 + 1] * 1e5)},${Math.round(P[i * 3 + 2] * 1e5)}|` +
      `${Math.round(N[i * 3] * 200)},${Math.round(N[i * 3 + 1] * 200)},${Math.round(N[i * 3 + 2] * 200)}`;
    let w = map.get(k);
    if (w === undefined) { w = keep.length; map.set(k, w); keep.push(i); }
    remap[i] = w;
  }
  const m = keep.length, P2 = new Float32Array(m * 3), N2 = new Float32Array(m * 3), A2 = A ? new Float32Array(m) : null;
  keep.forEach((i, w) => { P2.set(P.subarray(i * 3, i * 3 + 3), w * 3); N2.set(N.subarray(i * 3, i * 3 + 3), w * 3); if (A) A2[w] = A[i]; });
  return { P: P2, N: N2, A: A2, I: Uint32Array.from(I, (i) => remap[i]) };
}

/** one LOD of a welded part (error 0 = as is); MS = MeshoptSimplifier (ready).
 *  LOD1+ are simplified on a POSITION-only weld (the normal / lightmap seams would pin every edge of the hard-edged
 *  parts and the simplifier could hardly move: 61k -> 51k), then drawn unindexed with crease-aware normals (40 deg,
 *  as the Blender model's smoothing) and the welded vertices' mean AO. */
export function lodPart(w, error, MS, crease = 40) {
  if (!error) return w;
  const n = w.P.length / 3, map = new Map(), pw = new Uint32Array(n), rep = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(w.P[i * 3] * 1e4)},${Math.round(w.P[i * 3 + 1] * 1e4)},${Math.round(w.P[i * 3 + 2] * 1e4)}`;
    let j = map.get(k);
    if (j === undefined) { j = rep.length; map.set(k, j); rep.push(i); }
    pw[i] = j;
  }
  const P = new Float32Array(rep.length * 3), AO = new Float32Array(rep.length), cnt = new Float32Array(rep.length);
  rep.forEach((i, j) => P.set(w.P.subarray(i * 3, i * 3 + 3), j * 3));
  if (w.A) { for (let i = 0; i < n; i++) { AO[pw[i]] += w.A[i]; cnt[pw[i]]++; } for (let j = 0; j < rep.length; j++) AO[j] /= cnt[j] || 1; }
  const flags = error < 0.005 ? ["ErrorAbsolute"] : ["ErrorAbsolute", "Prune"];
  const [idx] = MS.simplify(Uint32Array.from(w.I, (i) => pw[i]), P, 3, 0, error, flags);
  const T = idx.length / 3, fn = new Float32Array(T * 3), fa = new Float32Array(T);
  const around = new Map();
  for (let t = 0; t < T; t++) {
    const a = idx[3 * t] * 3, b = idx[3 * t + 1] * 3, c = idx[3 * t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1e-12;
    fn[3 * t] = nx / l; fn[3 * t + 1] = ny / l; fn[3 * t + 2] = nz / l; fa[t] = l / 2;
    for (let k = 0; k < 3; k++) { const v = idx[3 * t + k]; let L = around.get(v); if (!L) around.set(v, (L = [])); L.push(t); }
  }
  const cc = Math.cos(crease * Math.PI / 180);
  // stretched triangles (longest edge > 6 x the height) stay FLAT: smooth normals interpolated along a sliver streak
  const flat = new Uint8Array(T);
  for (let t = 0; t < T; t++) {
    let L = 0;
    for (let k = 0; k < 3; k++) { const a = idx[3 * t + k] * 3, b = idx[3 * t + (k + 1) % 3] * 3; L = Math.max(L, Math.hypot(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2])); }
    flat[t] = L > 0 && L * L > 6 * 2 * fa[t] ? 1 : 0;      // height = 2 area / longest
  }
  const OP = new Float32Array(T * 9), ON = new Float32Array(T * 9), OA = w.A ? new Float32Array(T * 3) : null;
  for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) {
    const v = idx[3 * t + k], o = 3 * t + k;
    OP[3 * o] = P[3 * v]; OP[3 * o + 1] = P[3 * v + 1]; OP[3 * o + 2] = P[3 * v + 2];
    let nx = 0, ny = 0, nz = 0;
    if (flat[t]) { nx = fn[3 * t]; ny = fn[3 * t + 1]; nz = fn[3 * t + 2]; }
    else for (const u of around.get(v)) if (fn[3 * u] * fn[3 * t] + fn[3 * u + 1] * fn[3 * t + 1] + fn[3 * u + 2] * fn[3 * t + 2] >= cc) { nx += fn[3 * u] * fa[u]; ny += fn[3 * u + 1] * fa[u]; nz += fn[3 * u + 2] * fa[u]; }
    const l = Math.hypot(nx, ny, nz) || 1;
    ON[3 * o] = nx / l; ON[3 * o + 1] = ny / l; ON[3 * o + 2] = nz / l;
    if (OA) OA[o] = AO[v];
  }
  return { P: OP, N: ON, A: OA, I: Uint32Array.from({ length: T * 3 }, (_, i) => i) };
}
