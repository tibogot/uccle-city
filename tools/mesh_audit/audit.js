// MESH AUDIT: the shared checker against z-fighting, light leaks and bad topology / normals (the owner's rule: never
// z-fighting, never bad topology). Pure JavaScript, no imports: runs in Node (tools/mesh_audit/cli.mjs reads any GLB,
// meshopt + quantized included) and in the browser / the tile worker (auditGeometries on BufferGeometry-like data).
//
//   import { auditParts, partFromBufferGeometry, DEFAULTS } from "./audit.js";
//   const report = auditParts([{ name, slot, positions, normals, index, maxDistance }], { ...options });
//   report.summary.blocking  -> number of blocking items (0 = clean)
//
// A PART is one primitive in WORLD space (node transforms applied): positions Float32Array xyz, optional per-vertex
// normals (the shading normals), optional index, `maxDistance` (m) = the farthest the camera sees it at (its LOD band's
// end; the depth-precision check uses it), `name` (object / node) and `slot` (material). Welding is global (across parts
// and slots), so a wall in one slot and a surround in another count as one surface where they share an edge.
//
// CHECKS (README.md has the reasons and the calibration):
//  coplanar      (a) same-facing faces closer than `coincident` that overlap in projection: z-fight at any distance
//  depth         (b) same-facing overlapping faces whose separation is below what the depth buffer resolves at the
//                    part's maxDistance (reversed float depth: s_min = D * 2^-23 * depthSafety + quantum)
//  near          (a) same-facing overlaps closer than `nearDist` but resolvable: warn (fine on screen, fragile under
//                    quantization / shadows)
//  crossing      (f) faces of different components crossing each other at a shallow angle (< shallowCrossDeg): a
//                    flickering band; steep crossings are summarised as `seam` (info: total length per component pair)
//  leak          (c) open edges with a slit behind them: from in front of the face, a ray through the gap next to the
//                    edge escapes or hits a back face (= you see through the model), while a little further out it is
//                    closed (a narrow slit = a thin bright / dark line that shimmers); wide openings are info
//  sliver        (d) stretched triangles (longest edge / height > sliverAspect, longest edge > sliverMinEdge)
//  streak        (d) triangles whose corner normals disagree with each other or with the face (the shading streaks)
//  bentflat      (d) corner normals bent > 3 deg on a planar region (>= 2 coplanar neighbours): smooth normals bled into a flat wall
//  flipped       (e) the winding's face normal opposes the corner normals (culled from the side it shades for)
//  winding       (e) two triangles share an edge in the same direction on a smooth surface (inconsistent orientation)
//  nonmanifold   (e) edges used by more than two triangles
//  degenerate    (e) zero-area triangles
//  tjunction     (e) a vertex lying inside another triangle's open edge (cracks / sparkle along the seam)

export const DEFAULTS = {
  weld: 1e-4,                 // m: positions closer than this are one vertex
  coplanarAngleDeg: 5,        // faces within this angle count as parallel
  coincident: 0.0006,         // m: same-facing overlap closer than this = z-fight at ANY distance (blocking)
  nearDist: 0.003,            // m: same-facing overlap closer than this = warn
  minOverlapArea: 4e-5,       // m2: smaller overlaps are ignored (6 mm square)
  depthEps: 2 ** -23,         // reversed-Z float32: relative depth precision
  depthSafety: 64,            // x: interpolation + vertex transform error budget (calibrated, README)
  quantum: 0,                 // m: position quantization step of the file (cli.mjs reads it from the meshopt filter)
  defaultMaxDistance: 120,    // m: when a part has no maxDistance
  shallowCrossDeg: 12,        // crossing faces below this angle = flicker band (blocking)
  sliverAspect: 40, sliverMinEdge: 0.25,
  streakSpreadDeg: 30,        // corner normals of one triangle more than this apart ...
  streakAspect: 6,            // ... on a triangle stretched more than this = a shading streak
  bentFlatDeg: 3,             // a corner normal this far off its face on a flat wall: bentflat
  bentFlatArea: 0.3,          // m2: a planar region (coplanar edge-neighbours) at least this large is a flat wall
  normalBlockDeg: 85,         // a corner normal more than this from its face: blocking
  flipDot: -0.25,             // mean corner normal . face normal below this = flipped
  flipMinArea: 1e-6,          // m2: smaller triangles are not checked for flipped winding (quantization noise)
  degenerateArea: 1e-9,
  leakStep: 0.1,              // m between samples along open edges
  leakOffsets: [0.0015, 0.004, 0.012, 0.03],   // m beyond the edge
  leakNarrow: 0.03,           // a gap still open at this offset is an opening, not a slit
  leakDeep: 0.5,              // m: a front face closer than this behind the gap closes it: what shows through the slit is
                              // the same building's shadowed masonry / slate (a slate joint shows the next course's butt one
                              // gauge, 14.5 cm, up the slope), not the sky, the void or the interior (which escape)
  frontClear: 0.25,           // m of free space in front needed for a camera to look at the gap
  insideVotes: 3,             // a viewpoint whose rays (6 axes) hit >= this many back faces first is inside the model
  insideSkin: 0.03,           // m: a viewpoint whose nearest surface is seen from behind closer than this is inside it
  ignoreBelow: -Infinity,     // drop items below this height (Y): under the ground
  maxItemsPerCheck: 400,
  vertexSeparation: 0,        // 1: the pre-2026-11-10 separation (min vertex distance) instead of over the overlap
  debugTris: 0,
  traceAt: null,              // [x, y, z] (scene coords): log the leak rays of the open edges there               // 1: coplanar / depth items carry both triangles (debugging a model)
};
const SEV = { coplanar: "block", depth: "block", crossing: "block", leak: "block", flipped: "block", streak: "block", bentflat: "block",
  near: "warn", sliver: "warn", winding: "warn", nonmanifold: "warn", tjunction: "warn", degenerate: "warn", seam: "info", opening: "info", backtoback: "info" };

/** a part from a three.js BufferGeometry (+ optional world matrix as a 16-array, column-major like Matrix4.elements) */
export function partFromBufferGeometry(geometry, { name = "geometry", slot = "", matrixWorld = null, maxDistance } = {}) {
  const pa = geometry.attributes.position, na = geometry.attributes.normal;
  const n = pa.count, P = new Float32Array(n * 3), N = na ? new Float32Array(n * 3) : null;
  const m = matrixWorld;
  for (let i = 0; i < n; i++) {
    const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
    if (m) { P[i * 3] = m[0] * x + m[4] * y + m[8] * z + m[12]; P[i * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]; P[i * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]; }
    else { P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; }
    if (N) {
      let a = na.getX(i), b = na.getY(i), c = na.getZ(i);
      if (m) { const a2 = m[0] * a + m[4] * b + m[8] * c, b2 = m[1] * a + m[5] * b + m[9] * c, c2 = m[2] * a + m[6] * b + m[10] * c; a = a2; b = b2; c = c2; }
      const l = Math.hypot(a, b, c) || 1; N[i * 3] = a / l; N[i * 3 + 1] = b / l; N[i * 3 + 2] = c / l;
    }
  }
  const index = geometry.index ? Uint32Array.from(geometry.index.array) : null;
  return { name, slot, positions: P, normals: N, index, maxDistance };
}

// ------------------------------------------------------------------------------------------------ small vector helpers
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const DEG = Math.PI / 180;
const r3 = (p) => p.map((v) => Math.round(v * 1000) / 1000);

/** area of the intersection of two convex polygons in 2D (Sutherland-Hodgman) + the clipped polygon */
function clipConvex(subject, clip) {
  let out = subject;
  const n = clip.length;
  // orientation of clip
  let a2 = 0; for (let i = 0; i < n; i++) { const p = clip[i], q = clip[(i + 1) % n]; a2 += p[0] * q[1] - q[0] * p[1]; }
  const s = a2 >= 0 ? 1 : -1;
  for (let i = 0; i < n && out.length; i++) {
    const A = clip[i], B = clip[(i + 1) % n], inp = out; out = [];
    const side = (p) => s * ((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]));
    for (let k = 0; k < inp.length; k++) {
      const P = inp[k], Q = inp[(k + 1) % inp.length], sp = side(P), sq = side(Q);
      if (sp >= 0) out.push(P);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
  }
  return out;
}
const area2d = (poly) => { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };

// ------------------------------------------------------------------------------------------------ BVH for rays
function buildBVH(T) {
  const n = T.count, idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  const nodes = [];            // {min, max, left, right, start, end}
  const cen = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) cen[i * 3 + k] = (T.v[i * 9 + k] + T.v[i * 9 + 3 + k] + T.v[i * 9 + 6 + k]) / 3;
  const build = (s, e) => {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let i = s; i < e; i++) { const t = idx[i]; for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) { const v = T.v[t * 9 + c * 3 + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; } }
    const node = { mn, mx, s, e, l: -1, r: -1 }, id = nodes.length; nodes.push(node);
    if (e - s <= 4) return id;
    const ax = [0, 1, 2].reduce((b, k) => (mx[k] - mn[k] > mx[b] - mn[b] ? k : b), 0);
    const sub_ = Array.from(idx.subarray(s, e)).sort((a, b) => cen[a * 3 + ax] - cen[b * 3 + ax]);
    idx.set(sub_, s);
    const m = (s + e) >> 1;
    node.l = build(s, m); node.r = build(m, e);
    return id;
  };
  build(0, n);
  return { nodes, idx };
}
/** first hit along a ray: { t, tri } or null (both faces hit: the caller tests the facing) */
function rayCast(T, bvh, o, d, tmax = 1e9, skip = -1, cull = null) {
  let best = tmax, bt = -1;
  const inv = [1 / d[0], 1 / d[1], 1 / d[2]];
  const stack = [0];
  while (stack.length) {
    const nd = bvh.nodes[stack.pop()];
    let t0 = 0, t1 = best;
    for (let k = 0; k < 3; k++) {
      let ta = (nd.mn[k] - o[k]) * inv[k], tb = (nd.mx[k] - o[k]) * inv[k];
      if (ta > tb) { const x = ta; ta = tb; tb = x; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
      if (t0 > t1) break;
    }
    if (t0 > t1) continue;
    if (nd.l < 0) {
      for (let i = nd.s; i < nd.e; i++) {
        const t = bvh.idx[i]; if (t === skip) continue;
        const v = T.v, b = t * 9;
        const e1 = [v[b + 3] - v[b], v[b + 4] - v[b + 1], v[b + 5] - v[b + 2]], e2 = [v[b + 6] - v[b], v[b + 7] - v[b + 1], v[b + 8] - v[b + 2]];
        const p = cross(d, e2), det = dot(e1, p);
        if (Math.abs(det) < 1e-14) continue;
        const f = 1 / det, s = [o[0] - v[b], o[1] - v[b + 1], o[2] - v[b + 2]];
        const u = f * dot(s, p); if (u < 0 || u > 1) continue;
        const q = cross(s, e1), w = f * dot(d, q); if (w < 0 || u + w > 1) continue;
        const tt = f * dot(e2, q);
        if (tt > 1e-6 && tt < best) {
          // cull: skip faces seen from behind (what the renderer does with back-face culling): the ray goes on
          if (cull) { const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0]; if (nx * d[0] + ny * d[1] + nz * d[2] > 0) continue; }
          best = tt; bt = t;
        }
      }
    } else { stack.push(nd.l, nd.r); }
  }
  return bt < 0 ? null : { t: best, tri: bt };
}

// ------------------------------------------------------------------------------------------------ triangle / triangle
/** segment where two triangles cross (Möller interval test), or null */
function triTri(A, B, nA, nB) {
  const dA = -dot(nA, A[0]), dB = -dot(nB, B[0]);
  const db = B.map((p) => dot(nA, p) + dA), da = A.map((p) => dot(nB, p) + dB);
  const eps = 1e-7;
  if ((db[0] > eps && db[1] > eps && db[2] > eps) || (db[0] < -eps && db[1] < -eps && db[2] < -eps)) return null;
  if ((da[0] > eps && da[1] > eps && da[2] > eps) || (da[0] < -eps && da[1] < -eps && da[2] < -eps)) return null;
  const D = cross(nA, nB); const L = len(D); if (L < 1e-9) return null;
  // points where each triangle's edges cross the other's plane
  const cut = (P, d) => {
    const pts = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (Math.abs(d[i]) <= eps) pts.push(P[i]);
      if ((d[i] > eps && d[j] < -eps) || (d[i] < -eps && d[j] > eps)) { const t = d[i] / (d[i] - d[j]); pts.push([P[i][0] + (P[j][0] - P[i][0]) * t, P[i][1] + (P[j][1] - P[i][1]) * t, P[i][2] + (P[j][2] - P[i][2]) * t]); }
    }
    return pts;
  };
  const pa = cut(A, da), pb = cut(B, db);
  if (pa.length < 2 || pb.length < 2) return null;
  const u = [D[0] / L, D[1] / L, D[2] / L];
  const ia = pa.map((p) => dot(u, p)), ib = pb.map((p) => dot(u, p));
  const a0 = Math.min(...ia), a1 = Math.max(...ia), b0 = Math.min(...ib), b1 = Math.max(...ib);
  const s0 = Math.max(a0, b0), s1 = Math.min(a1, b1);
  if (s1 - s0 < 1e-5) return null;
  const pick = (pts, ps, t) => { // point on the segment of pts at parameter t
    const i0 = ps.indexOf(Math.min(...ps)), i1 = ps.indexOf(Math.max(...ps)); const P0 = pts[i0], P1 = pts[i1];
    const f = (t - ps[i0]) / ((ps[i1] - ps[i0]) || 1); return [P0[0] + (P1[0] - P0[0]) * f, P0[1] + (P1[1] - P0[1]) * f, P0[2] + (P1[2] - P0[2]) * f];
  };
  const src = a1 - a0 >= b1 - b0 ? [pb, ib] : [pa, ia];
  return [pick(src[0], src[1], s0), pick(src[0], src[1], s1), s1 - s0];
}

// ------------------------------------------------------------------------------------------------ the audit
export function auditParts(parts, options = {}) {
  const O = { ...DEFAULTS, ...options };
  const t0 = Date.now();
  // ---- triangles
  let count = 0;
  for (const p of parts) count += (p.index ? p.index.length : p.positions.length / 3) / 3;
  const T = { count, v: new Float64Array(count * 9), n: new Float64Array(count * 3), area: new Float64Array(count), part: new Int32Array(count),
    vid: new Int32Array(count * 3), cn: new Float32Array(count * 9), hasCn: new Uint8Array(count) };
  let t = 0;
  for (let pi = 0; pi < parts.length; pi++) {
    const p = parts[pi], P = p.positions, N = p.normals, I = p.index;
    const nt = (I ? I.length : P.length / 3) / 3;
    for (let k = 0; k < nt; k++, t++) {
      for (let c = 0; c < 3; c++) {
        const vi = I ? I[k * 3 + c] : k * 3 + c;
        for (let q = 0; q < 3; q++) T.v[t * 9 + c * 3 + q] = P[vi * 3 + q];
        if (N) for (let q = 0; q < 3; q++) T.cn[t * 9 + c * 3 + q] = N[vi * 3 + q];
      }
      T.hasCn[t] = N ? 1 : 0; T.part[t] = pi;
      const b = t * 9, e1 = [T.v[b + 3] - T.v[b], T.v[b + 4] - T.v[b + 1], T.v[b + 5] - T.v[b + 2]], e2 = [T.v[b + 6] - T.v[b], T.v[b + 7] - T.v[b + 1], T.v[b + 8] - T.v[b + 2]];
      const n = cross(e1, e2), l = len(n);
      T.area[t] = l / 2;
      if (l > 0) { T.n[t * 3] = n[0] / l; T.n[t * 3 + 1] = n[1] / l; T.n[t * 3 + 2] = n[2] / l; }
    }
  }
  const V = (i, c) => [T.v[i * 9 + c * 3], T.v[i * 9 + c * 3 + 1], T.v[i * 9 + c * 3 + 2]];
  const Nf = (i) => [T.n[i * 3], T.n[i * 3 + 1], T.n[i * 3 + 2]];
  const cen = (i) => [(T.v[i * 9] + T.v[i * 9 + 3] + T.v[i * 9 + 6]) / 3, (T.v[i * 9 + 1] + T.v[i * 9 + 4] + T.v[i * 9 + 7]) / 3, (T.v[i * 9 + 2] + T.v[i * 9 + 5] + T.v[i * 9 + 8]) / 3];
  const partName = (i) => { const p = parts[T.part[i]]; return p.slot ? `${p.name}/${p.slot}` : p.name; };
  const maxD = (i) => parts[T.part[i]].maxDistance ?? O.defaultMaxDistance;

  // ---- weld (global)
  const wmap = new Map(); let nv = 0; const wpos = [];
  const key = (x, y, z) => `${Math.round(x / O.weld)},${Math.round(y / O.weld)},${Math.round(z / O.weld)}`;
  for (let i = 0; i < count; i++) for (let c = 0; c < 3; c++) {
    const b = i * 9 + c * 3, k = key(T.v[b], T.v[b + 1], T.v[b + 2]);
    let id = wmap.get(k);
    if (id === undefined) { id = nv++; wmap.set(k, id); wpos.push(T.v[b], T.v[b + 1], T.v[b + 2]); }
    T.vid[i * 3 + c] = id;
  }
  // ---- edges (+ planar regions for bentflat: coplanar edge-neighbours, union-find, summed area)
  const edges = new Map();           // "a,b" (a<b) -> [tri, dir(+1 if a->b), ...]
  for (let i = 0; i < count; i++) {
    if (T.area[i] < O.degenerateArea) continue;
    for (let c = 0; c < 3; c++) {
      const a = T.vid[i * 3 + c], b = T.vid[i * 3 + (c + 1) % 3];
      if (a === b) continue;
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      let e = edges.get(k); if (!e) edges.set(k, (e = []));
      e.push(i, a < b ? 1 : -1);
    }
  }
  // ---- components (triangles joined by 2-manifold edges in the same part)
  const parent = new Int32Array(count); for (let i = 0; i < count; i++) parent[i] = i;
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (const e of edges.values()) if (e.length === 4 && T.part[e[0]] === T.part[e[2]]) { const a = find(e[0]), b = find(e[2]); if (a !== b) parent[a] = b; }
  const comp = new Int32Array(count); for (let i = 0; i < count; i++) comp[i] = find(i);

  const items = {}; const counts = {};
  const add = (check, at, data) => {
    if (at[1] < O.ignoreBelow) return;
    counts[check] = (counts[check] ?? 0) + 1;
    (items[check] ??= []);
    if (items[check].length < O.maxItemsPerCheck) items[check].push({ check, severity: SEV[check], at: r3(at), ...data });
  };

  // ---- per triangle: degenerate, sliver, normals
  const upar = new Int32Array(count).map((_, i) => i);
  const ufind = (i) => { while (upar[i] !== i) { upar[i] = upar[upar[i]]; i = upar[i]; } return i; };
  for (const e of edges.values()) if (e.length === 4 && dot(Nf(e[0]), Nf(e[2])) > Math.cos(1 * DEG)) { const a = ufind(e[0]), b = ufind(e[2]); if (a !== b) upar[a] = b; }
  const regionArea = new Map();
  for (let i = 0; i < count; i++) { const r = ufind(i); regionArea.set(r, (regionArea.get(r) ?? 0) + T.area[i]); }
  const planeArea = (i) => regionArea.get(ufind(i));
  for (let i = 0; i < count; i++) {
    const A = V(i, 0), B = V(i, 1), C = V(i, 2);
    const el = [len(sub(B, A)), len(sub(C, B)), len(sub(A, C))], L = Math.max(...el);
    if (T.area[i] < O.degenerateArea) { if (L > 1e-4) add("degenerate", cen(i), { part: partName(i), edge: +L.toFixed(4) }); continue; }
    const h = 2 * T.area[i] / L, aspect = L / h;
    if (aspect > O.sliverAspect && L > O.sliverMinEdge) add("sliver", cen(i), { part: partName(i), aspect: Math.round(aspect), longest: +L.toFixed(3) });
    if (!T.hasCn[i]) continue;
    const n = Nf(i), cn = [0, 1, 2].map((c) => [T.cn[i * 9 + c * 3], T.cn[i * 9 + c * 3 + 1], T.cn[i * 9 + c * 3 + 2]]);
    const mean = [cn[0][0] + cn[1][0] + cn[2][0], cn[0][1] + cn[1][1] + cn[2][1], cn[0][2] + cn[1][2] + cn[2][2]];
    const ml = len(mean) || 1;
    // (below 1 mm2 the winding of a quantized triangle is noise: the packed gutter ends' 0.1 mm2 slivers came out "flipped")
    if (T.area[i] > O.flipMinArea && dot(mean, n) / ml < O.flipDot) { add("flipped", cen(i), { part: partName(i), dot: +(dot(mean, n) / ml).toFixed(2), area: +T.area[i].toFixed(5) }); continue; }
    let worstFace = 0, spread = 0;
    for (let c = 0; c < 3; c++) {
      worstFace = Math.max(worstFace, Math.acos(Math.max(-1, Math.min(1, dot(cn[c], n)))) / DEG);
      for (let d = c + 1; d < 3; d++) spread = Math.max(spread, Math.acos(Math.max(-1, Math.min(1, dot(cn[c], cn[d])))) / DEG);
    }
    if (worstFace > O.normalBlockDeg && T.area[i] > 1e-4) add("streak", cen(i), { part: partName(i), why: "corner normal faces away", deg: Math.round(worstFace), area: +T.area[i].toFixed(4) });
    else if (spread > O.streakSpreadDeg && aspect > O.streakAspect && L > 0.15) add("streak", cen(i), { part: partName(i), why: "stretched triangle with diverging corner normals", spread: Math.round(spread), aspect: Math.round(aspect), longest: +L.toFixed(2) });
    else if (worstFace > O.bentFlatDeg && T.area[i] > O.flipMinArea && planeArea(i) > O.bentFlatArea) {
      // BENT NORMALS ON A FLAT WALL (owner's rule): the triangle belongs to a planar region (coplanar edge-neighbours,
      // flood-filled) larger than bentFlatArea; its corner normals must be its face normal. A smooth normal bled in from a
      // reveal / chamfer / sill / plinth shades the wall in fans and rays round the openings. (Swept curved profiles:
      // gutters, pipes, rolls: their straight strips are planar but narrow, well under the area.)
      add("bentflat", cen(i), { part: partName(i), deg: +worstFace.toFixed(1), area: +T.area[i].toFixed(4), region_m2: +planeArea(i).toFixed(2) });
    }
  }

  // ---- edges: non-manifold, winding, open edges
  const open = [];
  for (const [k, e] of edges) {
    const n = e.length / 2;
    if (n === 1) { open.push(k, e[0]); continue; }
    const [a, b] = k.split(",").map(Number);
    const mid = [(wpos[a * 3] + wpos[b * 3]) / 2, (wpos[a * 3 + 1] + wpos[b * 3 + 1]) / 2, (wpos[a * 3 + 2] + wpos[b * 3 + 2]) / 2];
    if (n > 2) {
      // boxes glued along an edge are common in kit-built models: only flag fans inside ONE part and component-like surface
      add("nonmanifold", mid, { part: partName(e[0]), uses: n });
      continue;
    }
    if (e[1] === e[3] && T.part[e[0]] === T.part[e[2]] && dot(Nf(e[0]), Nf(e[2])) < -0.5) {
      // same direction + opposite normals = one triangle wound the other way on a (nearly) flat surface
      add("winding", mid, { part: partName(e[0]) });
    }
  }

  // ---- grid of triangles
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count * 3; i++) for (let k = 0; k < 3; k++) { const v = T.v[i * 3 + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; }
  const ext = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2], 1);
  const cell = Math.max(0.25, ext / 160);
  const grid = new Map();
  const gk = (x, y, z) => (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  const triBox = (i, pad) => {
    const a = [Infinity, Infinity, Infinity], b = [-Infinity, -Infinity, -Infinity];
    for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) { const v = T.v[i * 9 + c * 3 + k]; if (v < a[k]) a[k] = v; if (v > b[k]) b[k] = v; }
    return [a.map((v) => v - pad), b.map((v) => v + pad)];
  };
  for (let i = 0; i < count; i++) {
    if (T.area[i] < O.degenerateArea) continue;
    const [a, b] = triBox(i, O.nearDist);
    const c0 = a.map((v, k) => Math.floor((v - mn[k]) / cell)), c1 = b.map((v, k) => Math.floor((v - mn[k]) / cell));
    for (let x = c0[0]; x <= c1[0]; x++) for (let y = c0[1]; y <= c1[1]; y++) for (let z = c0[2]; z <= c1[2]; z++) {
      const k = gk(x, y, z); let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(i);
    }
  }
  // ---- pairs: coplanar overlaps (a, b), crossings (f)
  const stamp = new Int32Array(count).fill(-1);
  const cosPar = Math.cos(O.coplanarAngleDeg * DEG), cosShallow = Math.cos(O.shallowCrossDeg * DEG);
  const seams = new Map();
  const sharesVertex = (i, j) => { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (T.vid[i * 3 + a] === T.vid[j * 3 + b]) return true; return false; };
  for (let i = 0; i < count; i++) {
    if (T.area[i] < O.degenerateArea) continue;
    const [a, b] = triBox(i, O.nearDist);
    const c0 = a.map((v, k) => Math.floor((v - mn[k]) / cell)), c1 = b.map((v, k) => Math.floor((v - mn[k]) / cell));
    const nA = Nf(i), A = [V(i, 0), V(i, 1), V(i, 2)];
    for (let x = c0[0]; x <= c1[0]; x++) for (let y = c0[1]; y <= c1[1]; y++) for (let z = c0[2]; z <= c1[2]; z++) {
      const l = grid.get(gk(x, y, z)); if (!l) continue;
      for (const j of l) {
        if (j <= i || stamp[j] === i) continue;
        stamp[j] = i;
        const [ja, jb] = triBox(j, 0);
        if (ja[0] > b[0] || ja[1] > b[1] || ja[2] > b[2] || jb[0] < a[0] || jb[1] < a[1] || jb[2] < a[2]) continue;
        const nB = Nf(j), d = dot(nA, nB);
        const Bt = [V(j, 0), V(j, 1), V(j, 2)];
        if (Math.abs(d) >= cosPar) {
          // parallel: separation + overlap in A's plane
          const off = Bt.map((p) => dot(nA, sub(p, A[0])));
          const offA = A.map((p) => dot(nB, sub(p, Bt[0])));
          const sMin = Math.min(...off.map(Math.abs)), sMax = Math.max(...off.map(Math.abs));
          const crosses = Math.min(...off) < 0 && Math.max(...off) > 0;
          let sep = crosses ? 0 : Math.min(sMin, Math.min(...offA.map(Math.abs)));
          if (sep > O.nearDist && !crosses) continue;            // a quick reject (vertex distances <= the overlap's)
          if (crosses && sMax > O.nearDist * 4 && d > 0) { /* tilted but crossing: handled below as a crossing */ }
          // project onto A's plane
          const ux = sub(A[1], A[0]); const ul = len(ux); const U = ux.map((v) => v / ul), W = cross(nA, U);
          const pr = (p) => { const q = sub(p, A[0]); return [dot(q, U), dot(q, W)]; };
          const poly = clipConvex(Bt.map(pr), A.map(pr));
          if (poly.length < 3) continue;
          const ar = area2d(poly);
          if (ar < O.minOverlapArea) continue;
          const pc = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
          const at = [A[0][0] + U[0] * pc[0] + W[0] * pc[1], A[0][1] + U[1] * pc[0] + W[1] * pc[1], A[0][2] + U[2] * pc[0] + W[2] * pc[1]];
          // the separation OVER THE OVERLAP (where they can fight), not at the triangles' vertices: a 14 m roof deck and a
          // slate tilted 2.5 deg on it have deck vertices close to the slate's (extended) plane far from the slate, although
          // the slate stands 5-17 mm above the deck everywhere it covers it (round 3: thousands of such false items)
          if (!O.vertexSeparation) {
            const nBd = dot(nB, nA);
            const hs = poly.map((p2) => { const p3 = [A[0][0] + U[0] * p2[0] + W[0] * p2[1], A[0][1] + U[1] * p2[0] + W[1] * p2[1], A[0][2] + U[2] * p2[0] + W[2] * p2[1]]; return dot(nB, sub(p3, Bt[0])) / nBd; });
            const cr = Math.min(...hs) < 0 && Math.max(...hs) > 0;
            const s2 = cr ? 0 : Math.min(...hs.map(Math.abs));
            if (s2 > O.nearDist) continue;
            sep = s2;
          }
          if (d < 0) { if (sep < O.coincident) add("backtoback", at, { parts: [partName(i), partName(j)], area: +ar.toFixed(5) }); continue; }
          const D = Math.max(maxD(i), maxD(j));
          const need = D * O.depthEps * O.depthSafety + O.quantum;
          const data = { parts: [partName(i), partName(j)], separation_mm: +(sep * 1000).toFixed(2), overlap_cm2: +(ar * 1e4).toFixed(1), angle_deg: +(Math.acos(Math.min(1, d)) / DEG).toFixed(1), maxDistance: D, need_mm: +(need * 1000).toFixed(2), sameComponent: comp[i] === comp[j], normal: nA.map((v) => +v.toFixed(2)),
            ...(O.debugTris ? { tris: [A, Bt].map((t) => t.map((p) => p.map((v) => +v.toFixed(4)))) } : {}) };
          if (sep < O.coincident) add("coplanar", at, data);
          else if (sep < need) add("depth", at, data);
          else add("near", at, data);
          continue;
        }
        // not parallel: crossings between different components (adjacent triangles share vertices)
        if (comp[i] === comp[j] || sharesVertex(i, j)) continue;
        const seg = triTri(A, Bt, nA, nB);
        if (!seg) continue;
        const ang = Math.acos(Math.min(1, Math.abs(d))) / DEG;
        const mid = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2, (seg[0][2] + seg[1][2]) / 2];
        if (Math.abs(d) > cosShallow && d > 0) add("crossing", mid, { parts: [partName(i), partName(j)], angle_deg: +ang.toFixed(1), length_cm: +(seg[2] * 100).toFixed(1) });
        else {
          const k = comp[i] < comp[j] ? `${comp[i]}:${comp[j]}` : `${comp[j]}:${comp[i]}`;
          let s = seams.get(k); if (!s) seams.set(k, (s = { parts: [partName(i), partName(j)], length: 0, pieces: 0, at: mid, minAngle: 90 }));
          s.length += seg[2]; s.pieces++; s.minAngle = Math.min(s.minAngle, ang);
        }
      }
    }
  }
  for (const s of [...seams.values()].sort((a, b) => b.pieces - a.pieces)) add("seam", s.at, { parts: s.parts, length_m: +s.length.toFixed(2), pieces: s.pieces, min_angle_deg: +s.minAngle.toFixed(1) });

  // ---- T-junctions: a welded vertex strictly inside an open edge
  const vgrid = new Map();
  for (let v = 0; v < nv; v++) { const k = gk(Math.floor((wpos[v * 3] - mn[0]) / cell), Math.floor((wpos[v * 3 + 1] - mn[1]) / cell), Math.floor((wpos[v * 3 + 2] - mn[2]) / cell)); let l = vgrid.get(k); if (!l) vgrid.set(k, (l = [])); l.push(v); }
  const openEdges = [];
  for (let q = 0; q < open.length; q += 2) {
    const [a, b] = open[q].split(",").map(Number); openEdges.push([a, b, open[q + 1]]);
  }
  const tjTol = O.weld * 3;
  const onOpen = new Set();
  for (const [a, b, tri] of openEdges) {
    const A = [wpos[a * 3], wpos[a * 3 + 1], wpos[a * 3 + 2]], B = [wpos[b * 3], wpos[b * 3 + 1], wpos[b * 3 + 2]];
    const D = sub(B, A), L = len(D); if (L < 1e-3) continue;
    const lo = A.map((v, k) => Math.floor((Math.min(v, B[k]) - tjTol - mn[k]) / cell)), hi = A.map((v, k) => Math.floor((Math.max(v, B[k]) + tjTol - mn[k]) / cell));
    if ((hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1) > 4000) continue;
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
      const l = vgrid.get(gk(x, y, z)); if (!l) continue;
      for (const v of l) {
        if (v === a || v === b) continue;
        const P = [wpos[v * 3], wpos[v * 3 + 1], wpos[v * 3 + 2]], q = sub(P, A), s = dot(q, D) / (L * L);
        if (s <= 0.002 || s >= 0.998) continue;
        const dist = len(sub(q, D.map((c) => c * s)));
        if (dist < tjTol) { const k = `${Math.min(a, b)},${Math.max(a, b)}`; if (!onOpen.has(k)) { onOpen.add(k); add("tjunction", P, { part: partName(tri), edge_m: +L.toFixed(3) }); } }
      }
    }
  }

  // ---- light leaks through slits next to open edges (rays)
  const bvh = buildBVH(T);
  const leakAt = new Map();
  let rays = 0;
  const AX = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  /** a point is inside the model when most axis rays first hit a back face (the model's shell seen from within) */
  // ... or it is ENCLOSED: every ray but the downward one hits something (the ground is not part of a hero) and at least
  // two of them hit back faces (the sacristy's roof void: the roof's underside and the walls from within, the choir
  // wall's outer face across it; round 3 found ~500 "leaks" seen from there)
  // ... or it sits just BEHIND a surface: the nearest hit is a back face closer than insideSkin (under a floor, under a
  // roof deck: no camera is ever 1-30 mm behind a surface it would see from behind)
  const inside = (p) => {
    let back = 0, hit = 0, nearT = Infinity, nearBack = false;
    for (const d of AX) {
      rays++; const h = rayCast(T, bvh, p, d, 1e9);
      if (h) {
        const isBack = dot(Nf(h.tri), d) > 0;
        if (d[1] >= 0) hit++; if (isBack) back++;
        if (h.t < nearT) { nearT = h.t; nearBack = isBack; }
      }
    }
    return back >= O.insideVotes || (hit === 5 && back >= 2) || (nearBack && nearT < O.insideSkin);
  };
  for (const [a, b, tri] of openEdges) {
    if (onOpen.has(`${Math.min(a, b)},${Math.max(a, b)}`)) continue;     // a T-junction: the neighbour continues the surface
    const A = [wpos[a * 3], wpos[a * 3 + 1], wpos[a * 3 + 2]], B = [wpos[b * 3], wpos[b * 3 + 1], wpos[b * 3 + 2]];
    const E = sub(B, A), L = len(E); if (L < 0.005) continue;
    const n = Nf(tri);
    // in-plane outward direction: away from the triangle's third vertex
    let C = null; for (let c = 0; c < 3; c++) { const id = T.vid[tri * 3 + c]; if (id !== a && id !== b) C = V(tri, c); }
    if (!C) continue;
    let out = cross(E, n); const ol = len(out); out = out.map((v) => v / ol);
    if (dot(out, sub(C, A)) > 0) out = out.map((v) => -v);
    const ns = Math.max(1, Math.round(L / O.leakStep));
    for (let s = 0; s < ns; s++) {
      const f = (s + 0.5) / ns, P = [A[0] + E[0] * f, A[1] + E[1] * f, A[2] + E[2] * f];
      const res = O.leakOffsets.map((o) => {
        const q = [P[0] + out[0] * o, P[1] + out[1] * o, P[2] + out[2] * o];
        rays += 2;
        const fr = rayCast(T, bvh, [q[0] + n[0] * 1e-4, q[1] + n[1] * 1e-4, q[2] + n[2] * 1e-4], n, O.frontClear);
        if (O.traceAt) (O._tr ??= []).push(`q=${q.map((v) => v.toFixed(4))} fr=${fr ? fr.t.toFixed(3) + "/" + partName(fr.tri) : "-"}`);
        if (fr) return "covered";                                   // something right in front: no camera sees this gap
        if (inside([q[0] + n[0] * 0.05, q[1] + n[1] * 0.05, q[2] + n[2] * 0.05])) return "inside";   // the viewpoint is inside a wall / the shell
        // what the renderer shows through the gap: the first FRONT face along the ray (back faces are culled, so the ray
        // goes on through them). Through = nothing, or a surface farther than leakDeep behind the edge (the sky, the
        // interior, the void inside a wall). A surface right behind (a slate's joint shows the slate / deck 1-2 cm below)
        // is closed. (Before 2026-11-10 the first hit being a BACK face counted as see-through: every slate joint whose ray
        // grazed under the next slate's single-sided plate was reported although the deck is right there.)
        const bk = rayCast(T, bvh, [q[0] - n[0] * 1e-4, q[1] - n[1] * 1e-4, q[2] - n[2] * 1e-4], n.map((v) => -v), 1e9, -1, true);
        if (O.traceAt) O._tr.push(`bk=${bk ? bk.t.toFixed(3) + "/" + partName(bk.tri) : "-"}`);
        if (!bk) return "through";
        return bk.t > O.leakDeep ? "through" : "closed@" + bk.t.toFixed(3);
      });
      if (O.traceAt && Math.hypot(P[0] - O.traceAt[0], P[1] - O.traceAt[1], P[2] - O.traceAt[2]) < 0.01) console.log("[trace leak]", P.map((v) => v.toFixed(4)).join(","), "n", n.map((v) => v.toFixed(2)).join(","), "out", out.map((v) => v.toFixed(2)).join(","), res.join(" "), (O._tr || []).join(" ; "));
      if (O.traceAt) O._tr = [];
      if (res[0] !== "through") continue;
      // a SLIT: further out the ray really hits the far side ("closed"); an offset whose viewpoint is covered or inside a
      // solid cannot be observed and proves nothing (a convex corner, a surface ending on a solid)
      const narrowAt = O.leakOffsets.findIndex((o, k) => k > 0 && res[k].startsWith("closed") && o <= O.leakNarrow);
      if (narrowAt < 0 && res.slice(1).some((r) => r !== "through")) continue;      // unobservable further out: not an opening either
      const key = `${tri}`;
      if (leakAt.has(key)) continue;
      leakAt.set(key, 1);
      if (narrowAt > 0) add("leak", P, { part: partName(tri), slit_mm: +(O.leakOffsets[narrowAt] * 1000).toFixed(1), facing: n.map((v) => +v.toFixed(2)), edge_m: +L.toFixed(3) });
      else add("opening", P, { part: partName(tri), facing: n.map((v) => +v.toFixed(2)), edge_m: +L.toFixed(3) });
    }
  }

  const blocking = Object.entries(counts).filter(([k]) => SEV[k] === "block").reduce((s, [, v]) => s + v, 0);
  const warnings = Object.entries(counts).filter(([k]) => SEV[k] === "warn").reduce((s, [, v]) => s + v, 0);
  return {
    summary: { triangles: count, vertices_welded: nv, open_edges: openEdges.length, rays, blocking, warnings, counts, ms: Date.now() - t0 },
    options: O,
    parts: parts.map((p) => ({ name: p.name, slot: p.slot, triangles: (p.index ? p.index.length : p.positions.length / 3) / 3, maxDistance: p.maxDistance ?? O.defaultMaxDistance })),
    items,
  };
}

/** a readable Markdown report */
export function toMarkdown(report, { title = "Mesh audit", transform = null, maxRows = 40 } = {}) {
  const S = report.summary;
  const fmt = (p) => (transform ? transform(p) : p).map((v) => v.toFixed(2)).join(", ");
  const L = [`# ${title}`, "", `${S.triangles.toLocaleString()} triangles, ${S.vertices_welded.toLocaleString()} welded vertices, ${S.open_edges.toLocaleString()} open edges, ${S.rays.toLocaleString()} rays, ${S.ms} ms.`, "",
    `**${S.blocking} blocking**, ${S.warnings} warnings. ${S.blocking ? "NOT CLEAN." : "Clean (no blocking item)."}`, "", "| check | severity | count |", "|---|---|---|"];
  const order = ["coplanar", "depth", "crossing", "leak", "flipped", "streak", "bentflat", "near", "sliver", "winding", "nonmanifold", "tjunction", "degenerate", "seam", "opening", "backtoback"];
  for (const k of order) if (S.counts[k]) L.push(`| ${k} | ${SEV[k]} | ${S.counts[k]} |`);
  L.push("", `Positions: ${transform ? "transformed (see the caller)" : "the file's scene coordinates (glTF, Y up, node transforms applied)"}.`, "");
  for (const k of order) {
    const it = report.items[k]; if (!it?.length) continue;
    L.push(`## ${k} (${SEV[k]}, ${S.counts[k]})`, "");
    const keys = [...new Set(it.flatMap((x) => Object.keys(x)))].filter((x) => !["check", "severity", "at"].includes(x));
    L.push(`| at | ${keys.join(" | ")} |`, `|---|${keys.map(() => "---").join("|")}|`);
    for (const x of it.slice(0, maxRows)) L.push(`| ${fmt(x.at)} | ${keys.map((q) => (Array.isArray(x[q]) ? x[q].join(" + ") : x[q] ?? "")).join(" | ")} |`);
    if (it.length > maxRows) L.push("", `(${S.counts[k] - maxRows} more in the JSON)`);
    L.push("");
  }
  return L.join("\n");
}
