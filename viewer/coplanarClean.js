// COPLANAR OVERLAP CLEAN (census class G, rule 34 provisional; claude/zfight): UrbIS solids carry triangles that lie in
// the plane of another triangle facing the same way and overlap it: a flat roof polygon triangulated into overlapping
// fans (Rue de Stalle 73: 807 m2), a wall polygon given twice at two heights (Av. Adolphe Dupuich 24: 620 m2), one solid
// twice under two ids (Av. Hamoir 8: 760045 = 761186). Both copies draw: they z-fight at any distance (shimmering roofs
// and walls). pipeline/build_buildings.py passes the solids through as UrbIS gives them; the worker cleans them here,
// for the whole tile, in the buildings' order: every triangle minus the coplanar same-facing triangles already kept
// (convex clip in the triangle's own plane, the remainder fanned back on that plane, exact). Touching neighbours share
// an edge: no area in common, nothing cut. viewer/facadeGeom.js analyseBuildings (opts.zfight === false = ?zfight=old).
//
//   const clean = coplanarCleaner();  ...  tris = clean(tris)   tris: [{ p: [[x, y, z] x 3], n: [unit], area }]

const COS = Math.cos((2 * Math.PI) / 180);   // same facing: normals within 2 deg
const SEP = 0.006;                             // in one plane: the other triangle's corners within 6 mm of the plane
const MIN_OV = 0.002;                          // an overlap under 20 cm2 is a touching edge / a rounding sliver: kept
const MIN_PIECE = 2e-4;                        // remainder pieces under 2 cm2 are dropped
const CELL = 4;

/** a tile-wide cleaner: call it per building with that building's triangles (walls, roofs); returns the cleaned list
 *  (a triangle untouched keeps its object; a cut one becomes its pieces, same normal); each kept triangle is kept for
 *  the next ones (the same building's and the next buildings') */
export function coplanarCleaner() {
  const grid = new Map();
  const key = (i, j) => i * 100003 + j;
  const stats = { cut: 0, dropped: 0, pieces: 0, m2: 0 };
  function add(t) {
    const b = t.bb ?? (t.bb = bbox(t.p));
    for (let i = Math.floor(b[0] / CELL); i <= Math.floor(b[3] / CELL); i++) for (let j = Math.floor(b[2] / CELL); j <= Math.floor(b[5] / CELL); j++) {
      const k = key(i, j); let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(t);
    }
  }
  function near(b) {
    const out = new Set();
    for (let i = Math.floor(b[0] / CELL); i <= Math.floor(b[3] / CELL); i++) for (let j = Math.floor(b[2] / CELL); j <= Math.floor(b[5] / CELL); j++)
      for (const t of grid.get(key(i, j)) || []) out.add(t);
    return out;
  }
  function clean(tris) {
    const out = [];
    for (const t of tris) {
      const b = (t.bb = bbox(t.p));
      const n = t.n, d = n[0] * t.p[0][0] + n[1] * t.p[0][1] + n[2] * t.p[0][2];
      const hits = [];
      for (const o of near(b)) {
        if (o.n[0] * n[0] + o.n[1] * n[1] + o.n[2] * n[2] < COS) continue;
        const ob = o.bb;
        if (ob[0] > b[3] + 0.01 || ob[3] < b[0] - 0.01 || ob[1] > b[4] + 0.01 || ob[4] < b[1] - 0.01 || ob[2] > b[5] + 0.01 || ob[5] < b[2] - 0.01) continue;
        let far = 0;
        for (const q of o.p) far = Math.max(far, Math.abs(n[0] * q[0] + n[1] * q[1] + n[2] * q[2] - d));
        if (far > SEP) continue;
        hits.push(o);
      }
      if (!hits.length) { out.push(t); add(t); continue; }
      // the triangle's plane frame (u, v); everything projected on it
      const u = norm(Math.abs(n[1]) < 0.9 ? cross([0, 1, 0], n) : cross([1, 0, 0], n)), v = cross(n, u);
      const to2 = (q) => [q[0] * u[0] + q[1] * u[1] + q[2] * u[2], q[0] * v[0] + q[1] * v[1] + q[2] * v[2]];
      let pieces = [ccw(t.p.map(to2))];
      let cut = false;
      for (const o of hits) {
        const C = ccw(o.p.map(to2));
        const next = [];
        for (const P of pieces) {
          const inter = clipConvex(P, C);
          if (area(inter) < MIN_OV) { next.push(P); continue; }
          cut = true;
          // P minus C: for each edge of C, the part of what is left outside that edge is a piece; go on with the inside
          let cur = P;
          for (let e = 0; e < C.length && cur.length >= 3; e++) {
            const A = C[e], B = C[(e + 1) % C.length];
            const outside = half(cur, B, A), inside = half(cur, A, B);
            if (outside.length >= 3 && area(outside) > MIN_PIECE) next.push(outside);
            cur = inside;
          }
        }
        pieces = next;
        if (!pieces.length) break;
      }
      if (!cut) { out.push(t); add(t); continue; }
      stats.cut++;
      stats.m2 += t.area - pieces.reduce((s, P) => s + area(P), 0);
      if (!pieces.length) { stats.dropped++; continue; }
      // back to 3D on the triangle's own plane, wound as the original (its normal n)
      const lift = (q) => [u[0] * q[0] + v[0] * q[1] + n[0] * d, u[1] * q[0] + v[1] * q[1] + n[1] * d, u[2] * q[0] + v[2] * q[1] + n[2] * d];
      for (const P of pieces) for (let k = 1; k + 1 < P.length; k++) {
        const a2 = area([P[0], P[k], P[k + 1]]);
        if (a2 < 1e-6) continue;
        const piece = { p: [lift(P[0]), lift(P[k]), lift(P[k + 1])], n, area: a2 };
        out.push(piece); add(piece); stats.pieces++;
      }
    }
    return out;
  }
  clean.stats = stats;
  return clean;
}

function bbox(p) {
  return [Math.min(p[0][0], p[1][0], p[2][0]), Math.min(p[0][1], p[1][1], p[2][1]), Math.min(p[0][2], p[1][2], p[2][2]),
    Math.max(p[0][0], p[1][0], p[2][0]), Math.max(p[0][1], p[1][1], p[2][1]), Math.max(p[0][2], p[1][2], p[2][2])];
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function area(P) { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
function ccw(P) { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s < 0 ? P.slice().reverse() : P; }
/** the part of P left of the directed line A -> B */
function half(P, A, B) {
  const out = [], side = (q) => (B[0] - A[0]) * (q[1] - A[1]) - (B[1] - A[1]) * (q[0] - A[0]);
  for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length], sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}
function clipConvex(P, C) { let r = P; for (let e = 0; e < C.length && r.length >= 3; e++) r = half(r, C[e], C[(e + 1) % C.length]); return r.length >= 3 ? r : []; }
