// THE BMX SPOT'S MESHES (bike lab 2; viewer/bike/bikeSpot.js has the world). Geometry only (three, no materials, no
// TSL): the page (debug/bikeSpot.js) gives each part its material; tools/bike/spotTest.mjs checks them in node (closed,
// standing on the ground, the solids' tops = the ridden height, the ground pieces never coplanar).
//   ground: ONE fine grid (0.25 m) over the riding area + ONE far grid (4 m) with exactly the cells under the fine grid
//           cut out (the fine border is level: no crack, no overlap); per vertex the paint weights (asphalt, concrete,
//           dirt, gravel; grass = the rest) and the analytic normal
//   parts:  per material ONE merged geometry (one draw each): the wooden ramps, the concrete pieces (side profiles
//           extruded with a 12 mm bevel, creased normals: smooth transitions, sharp corners), the coping / rails /
//           handrail (closed steel tubes), the ledge + its steel angle, the graffiti wall, the bench, the bins, the cones,
//           the fence, the houses (walls + roofs) on the hills. Every piece carries its feet (its lowest corners) for
//           the float check; every piece is a closed solid.
// Every geometry carries position, normal and `aux` (vec4: a per-material frame, see each builder).
import * as THREE from "three/webgpu";
import { mergeGeometries, toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { SPOT, SOLIDS, SOLID_BASE, TOE, terrainH, spotHeight, spotPaint, profAt, FUNBOX_RAIL, CONES, BINS, FENCES, LEDGE_TOP, handrailLine, SPOT_FURNITURE, NEAR_TREES, farH } from "./bikeSpot.js";
import { BENCH } from "./bikeEdges.js";

const hyp = (a, b) => Math.sqrt(a * a + b * b);
const rnd = (k) => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** a geometry made uniform for merging: non-indexed, position + normal + aux (vec4, constant or a function of the
 *  vertex's position before the transform), no uv */
function prep(geo, aux = [0, 0, 0, 0], matrix = null) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
  const n = g.attributes.position.count, a = new Float32Array(n * 4), p = g.attributes.position;
  for (let i = 0; i < n; i++) {
    const v = typeof aux === "function" ? aux(p.getX(i), p.getY(i), p.getZ(i)) : aux;
    a[i * 4] = v[0]; a[i * 4 + 1] = v[1]; a[i * 4 + 2] = v[2]; a[i * 4 + 3] = v[3];
  }
  g.setAttribute("aux", new THREE.BufferAttribute(a, 4));
  if (matrix) g.applyMatrix4(matrix);
  return g;
}
/** the lowest corners of a geometry (its feet: every vertex within 3 cm of its lowest y) */
function feetOf(g) {
  const p = g.attributes.position; let y0 = Infinity;
  for (let i = 0; i < p.count; i++) y0 = Math.min(y0, p.getY(i));
  const out = [];
  for (let i = 0; i < p.count; i += 1) if (p.getY(i) < y0 + 0.03) out.push([p.getX(i), p.getY(i), p.getZ(i)]);
  // (thinned: a few hundred per piece is plenty)
  const step = Math.max(1, Math.floor(out.length / 300));
  return out.filter((_, i) => i % step === 0);
}
/** an edge-manifold check: every edge (by quantised end points) shared by exactly two triangles -> { open, bad, tris } */
export function closedReport(geo) {
  const p = geo.attributes.position, idx = geo.index, n = idx ? idx.count : p.count, q = (i) => `${Math.round(p.getX(i) * 2000)},${Math.round(p.getY(i) * 2000)},${Math.round(p.getZ(i) * 2000)}`;
  const E = new Map();
  let tris = 0;
  for (let t = 0; t < n; t += 3) {
    const a = q(idx ? idx.getX(t) : t), b = q(idx ? idx.getX(t + 1) : t + 1), c = q(idx ? idx.getX(t + 2) : t + 2);
    if (a === b || b === c || a === c) continue;           // (a degenerate sliver at a lathe's pole: no edge)
    tris++;
    for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = u < v ? `${u}|${v}` : `${v}|${u}`; E.set(k, (E.get(k) || 0) + 1); }
  }
  let open = 0, bad = 0;
  for (const c of E.values()) { if (c === 1) open++; else if (c > 2) bad++; }
  return { open, bad, tris };
}

// ------------------------------------------------------------------------------------------------ the ground
function groundGrids() {
  const F = SPOT.fine, R = SPOT.far;
  const nrmAt = (x, z, e = 0.05) => { const gx = (terrainH(x + e, z) - terrainH(x - e, z)) / (2 * e), gz = (terrainH(x, z + e) - terrainH(x, z - e)) / (2 * e), L = Math.sqrt(1 + gx * gx + gz * gz); return [-gx / L, 1 / L, -gz / L]; };
  const grid = (x0, x1, z0, z1, res, paint, keep) => {
    const nx = Math.round((x1 - x0) / res), nz = Math.round((z1 - z0) / res);
    const pos = new Float32Array((nx + 1) * (nz + 1) * 3), nrm = new Float32Array(pos.length), aux = new Float32Array((nx + 1) * (nz + 1) * 4), idx = [];
    const w = [0, 0, 0, 0];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + i * res, z = z0 + j * res, k = j * (nx + 1) + i;
      pos[k * 3] = x; pos[k * 3 + 1] = terrainH(x, z); pos[k * 3 + 2] = z;
      const n = nrmAt(x, z, res > 1 ? 0.5 : 0.05); nrm[k * 3] = n[0]; nrm[k * 3 + 1] = n[1]; nrm[k * 3 + 2] = n[2];
      if (paint) { spotPaint(x, z, w); aux[k * 4] = w[0]; aux[k * 4 + 1] = w[1]; aux[k * 4 + 2] = w[2]; aux[k * 4 + 3] = w[3]; }
    }
    const cells = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const cx0 = x0 + i * res, cz0 = z0 + j * res;
      if (keep && !keep(cx0, cz0, cx0 + res, cz0 + res)) continue;
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      // (the diagonal along the steeper pair: no ridge across a roller)
      idx.push(a, c, b, b, c, d);
      cells.push([cx0, cz0, cx0 + res, cz0 + res]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3)); g.setAttribute("aux", new THREE.BufferAttribute(aux, 4));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return { geo: g, count: (nx + 1) * (nz + 1), cells };
  };
  const fine = grid(F.x0, F.x1, F.z0, F.z1, F.res, true, null);
  // the far grid: exactly the cells outside the fine rectangle (its edges on the far grid's lines)
  const far = grid(R.x0, R.x1, R.z0, R.z1, R.res, false, (x0, z0, x1, z1) => !(x0 >= F.x0 && x1 <= F.x1 && z0 >= F.z0 && z1 <= F.z1));
  return { fine, far, heightAt: terrainH };
}

// ------------------------------------------------------------------------------------------------ the solids
const BEV = 0.012;
/** a solid: its side profile (s, y) as a Shape, extruded across its width with a bevel that keeps the outline (bevel
 *  offset = -size), turned so s runs along z. aux = (s, across, 0, kind) */
function solidGeo(S) {
  const sh = new THREE.Shape();
  sh.moveTo(0, SOLID_BASE);
  for (const [s, y] of S.prof) sh.lineTo(s, y);
  sh.lineTo(S.L, SOLID_BASE);
  sh.lineTo(0, SOLID_BASE);
  const depth = S.w - 2 * BEV;
  let g = new THREE.ExtrudeGeometry(sh, { depth, steps: 1, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelOffset: -BEV, bevelSegments: 2, curveSegments: 1 });
  // local (s, y, across - BEV) -> world: x = x1 - BEV - lz, z = z0 + s (dir +1) / z0 - s (dir -1)
  g = prep(g, (lx, ly, lz) => [lx, lz + BEV, 0, S.mat === "wood" ? 1 : 0]);
  const m = new THREE.Matrix4();
  if (S.dir > 0) m.set(0, 0, -1, S.x1 - BEV, 0, 1, 0, 0, 1, 0, 0, S.z0, 0, 0, 0, 1);
  else m.set(0, 0, 1, S.x0 + BEV, 0, 1, 0, 0, -1, 0, 0, S.z0, 0, 0, 0, 1);
  g.applyMatrix4(m);
  g = toCreasedNormals(g, 32 * Math.PI / 180);
  return g;
}
/** a closed steel tube from a to b (radius r) with flat caps */
function tube(a, b, r, sides = 12) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), L = A.distanceTo(Bv);
  const g = new THREE.CylinderGeometry(r, r, L, sides, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize());
  const m = new THREE.Matrix4().compose(A.clone().add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  return toCreasedNormals(prep(g, [0, 0, 0, 0], m), 50 * Math.PI / 180);
}
/** a rounded box centred at (x, y, z), yaw about y; aux constant */
function rbox(w, h, d, x, y, z, yaw = 0, r = 0.015, aux = [0, 0, 0, 0], seg = 2) {
  const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
  return prep(g, aux, m);
}
/** a closed lathe (the profile from the axis back to the axis) at (x, y, z) */
function lathe(pts, x, y, z, segs = 20, aux = [0, 0, 0, 0]) {
  const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), segs);
  return toCreasedNormals(prep(g, (lx, ly) => [ly, 0, 0, aux[3]], new THREE.Matrix4().makeTranslation(x, y, z)), 40 * Math.PI / 180);
}

// ------------------------------------------------------------------------------------------------ houses on the hills
/** Brussels terraces: rows of narrow houses on the far hills (ring 80-130 m). Per house a body (6 faces, aux = facade
 *  u, height over the front ground v, seed, 1 + the height = a facade / the back (houseMat's H: the windows, the cornice band; round 3 - it was 1, H = 0: no windows, the whole front the cornice's stone) / 0 = a party wall) and a gable roof (aux.w = 2) */
export function housePlan() {
  const rows = [
    { x: -40, z: 104, dx: 1, dz: 0.08, n: 12 }, { x: 24, z: 112, dx: 1, dz: -0.15, n: 9 },
    { x: 96, z: 40, dx: -0.2, dz: 1, n: 8 }, { x: 104, z: -30, dx: -0.05, dz: 1, n: 7 },
    { x: -100, z: 60, dx: 0.3, dz: -1, n: 9 }, { x: -96, z: -34, dx: 0.1, dz: -1, n: 6 },
    { x: -20, z: -84, dx: 1, dz: 0.12, n: 10 }, { x: 52, z: -78, dx: 1, dz: 0.35, n: 6 },
  ];
  const H = [];
  let k = 0;
  for (const r of rows) {
    const L = hyp(r.dx, r.dz), ux = r.dx / L, uz = r.dz / L;
    // the facade faces the spot (the row's normal toward the centre)
    let nx = -uz, nz = ux; if (nx * (FAR_C.x - r.x) + nz * (FAR_C.z - r.z) < 0) { nx = -nx; nz = -nz; }
    let s = 0;
    for (let i = 0; i < r.n; i++, k++) {
      const w = 5.2 + rnd(k) * 2.6, floors = 2 + Math.floor(rnd(k + 50) * 2.6), set = (rnd(k + 9) - 0.5) * 0.5;
      const cx = r.x + ux * (s + w / 2) + nx * set, cz = r.z + uz * (s + w / 2) + nz * set;
      H.push({ cx, cz, ux, uz, nx, nz, w, d: 9 + rnd(k + 3) * 2, floors, h: floors * 3.0 + 0.6, seed: rnd(k + 77), roof: rnd(k + 31) });
      s += w;
    }
  }
  return H;
}
const FAR_C = { x: -2, z: 14 };
function houseGeo(hs) {
  const { cx, cz, ux, uz, nx, nz, w, d, h } = hs;
  // the ground under the footprint: the front's lowest point is the ground floor's level; the body goes 0.5 m under
  // the lowest corner (welded into the slope: a plinth shows where the hill falls away)
  const corner = (a, b) => [cx + ux * a + nx * b, cz + uz * a + nz * b];
  let lo = Infinity, front = Infinity;
  for (const a of [-w / 2, 0, w / 2]) for (const b of [-d, -d / 2, 0]) { const [x, z] = corner(a, b); const y = terrainH(x, z); lo = Math.min(lo, y); if (b === 0) front = Math.min(front, y); }
  const y0 = lo - 0.5, y1 = front + h;
  // the body: 8 corners, 6 faces (each its own 4 vertices: flat normals), facade frame in aux
  const P = [], N = [], A = [];
  const v = (a, b, y) => { const [x, z] = corner(a, b); return [x, y, z]; };
  const quad = (p0, p1, p2, p3, n, aux) => {
    for (const p of [p0, p1, p2, p0, p2, p3]) { P.push(...p.xyz); N.push(...n); A.push(p.u, p.y - front, hs.seed, aux); }
  };
  const pt = (a, b, y, u) => ({ xyz: v(a, b, y), u, y });
  const out = [nx, 0, nz], back = [-nx, 0, -nz], right = [ux, 0, uz], left = [-ux, 0, -uz];
  const hw = w / 2;
  // (the windings: counter-clockwise seen from outside)
  quad(pt(-hw, 0, y0, 0), pt(hw, 0, y0, w), pt(hw, 0, y1, w), pt(-hw, 0, y1, 0), out, 1 + h);                // the facade (aux.w = 1 + its height: houseMat's H)
  quad(pt(hw, -d, y0, 0), pt(-hw, -d, y0, w), pt(-hw, -d, y1, w), pt(hw, -d, y1, 0), back, 1 + h);           // the back
  quad(pt(hw, 0, y0, 0), pt(hw, -d, y0, d), pt(hw, -d, y1, d), pt(hw, 0, y1, 0), right, 0);                  // party walls
  quad(pt(-hw, -d, y0, 0), pt(-hw, 0, y0, d), pt(-hw, 0, y1, d), pt(-hw, -d, y1, 0), left, 0);
  quad(pt(-hw, 0, y1, 0), pt(hw, 0, y1, 0), pt(hw, -d, y1, 0), pt(-hw, -d, y1, 0), [0, 1, 0], 0);           // the top (under the roof)
  quad(pt(-hw, -d, y0, 0), pt(hw, -d, y0, 0), pt(hw, 0, y0, 0), pt(-hw, 0, y0, 0), [0, -1, 0], 0);          // the bottom
  const body = new THREE.BufferGeometry();
  body.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); body.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); body.setAttribute("aux", new THREE.Float32BufferAttribute(A, 4));
  fixWinding(body);
  // the gable roof: a triangle across the depth (0.25 m eaves), along the width; sunk 5 cm into the body's top
  const rh = 2.2 + hs.roof * 1.6, ov = 0.25;
  const sh = new THREE.Shape(); sh.moveTo(-ov, 0); sh.lineTo(d + ov, 0); sh.lineTo(d / 2, rh); sh.lineTo(-ov, 0);
  const rg = prep(new THREE.ExtrudeGeometry(sh, { depth: w + 0.04, bevelEnabled: false, curveSegments: 1 }), [hs.seed, hs.roof, 0, 2]);
  // local x across the depth from the facade (0) to the back (d), y up, z along the width: -> world
  const m = new THREE.Matrix4();
  const o = corner(-hw - 0.02, 0);
  // columns: local x -> -n (into the house), local y -> up, local z -> u (along the row)
  m.set(-nx, 0, ux, o[0], 0, 1, 0, y1 - 0.05, -nz, 0, uz, o[1], 0, 0, 0, 1);
  rg.applyMatrix4(m);
  if (m.determinant() < 0) flipWinding(rg);
  rg.computeVertexNormals();
  return { body, roof: rg, y0, lo, y1, front, rh, ov };
}
/** (round 3, owner: "plain houses") the details that read from the spot, 80-130 m off: a stone CORNICE under the eaves
 *  (its own piece, 28 cm proud, 15 cm short of each party wall: never coplanar with the neighbour's), one or two brick
 *  CHIMNEYS on the party walls with a stone cap, and on some a zinc DORMER with its window. Every piece a closed rounded
 *  box, sunk into what carries it (the body, the roof): welded, no floating edge, no coplanar face.
 *  -> [{ mat, name, geo, on: "body" | "roof" | index of an earlier detail }] */
export function houseDetails(hs, g) {
  const { cx, cz, ux, uz, nx, nz, w, d, seed } = hs, { y1, rh, ov } = g, hw = w / 2;
  const yaw = Math.atan2(-uz, ux);                 // rbox local x -> along the row (u)
  const at = (a, b) => [cx + ux * a + nx * b, cz + uz * a + nz * b];
  const roofY = (b) => y1 - 0.05 + rh * Math.max(0, Math.min(1, (b < -d / 2 ? d + b + ov : -b + ov) / (d / 2 + ov)));   // the slope over depth b (0 the facade, -d the back)
  const out = [];
  const box = (mat, name, sw, sh, sd, a, b, yc, on, aux = [0, 0, 0, 0], r = 0.03) => { const [x, z] = at(a, b); out.push({ mat, name, geo: rbox(sw, sh, sd, x, yc, z, yaw, r, aux), on }); return out.length - 1; };
  // the cornice: under the eaves (the roof starts 5 cm under the body's top), 0.04 m into the facade
  box("stone", "cornice", w - 0.3, 0.22, 0.32, 0, 0.12, y1 - 0.2, "body");
  // chimneys: on the party walls, astride the ridge, 0.75 m over it
  const nCh = seed < 0.35 ? 2 : 1;
  for (let k = 0; k < nCh; k++) {
    const sgn = k === 0 ? (hs.roof < 0.5 ? 1 : -1) : -(hs.roof < 0.5 ? 1 : -1), a = sgn * (hw - 0.5), b = -d / 2 + (seed - 0.5) * 0.8;
    const top = roofY(b) + 0.75, base = y1 - 0.02;
    const ch = box("house", "chimney", 0.56, top - base, 0.9, a, b, (top + base) / 2, "roof", [0, 10, seed, 0], 0.02);
    box("stone", "chimney cap", 0.7, 0.09, 1.04, a, b, top + 0.015, ch, [0, 0, 0, 0], 0.015);
  }
  // a dormer on the front slope (a roof tall enough): zinc cheeks and top, its window 2 cm proud
  if (rh > 2.7 && seed > 0.4) {
    const bF = -d * 0.16, bB = -d / 2 + 0.3, yF = roofY(bF), top = yF + 1.25, base = y1 - 0.02, dw = Math.min(1.8, w * 0.32);
    const dm = box("zinc", "dormer", dw, top - base, bF - bB, 0, (bF + bB) / 2, (top + base) / 2, "roof", [0, 0, 0, 0], 0.02);
    box("glass", "dormer window", dw - 0.42, 0.85, 0.08, 0, bF + 0.02, yF + 0.6, dm, [0, 0, 0, 0], 0.01);
  }
  return out;
}
function flipWinding(g) {
  const p = g.attributes.position.array, s = g.attributes.position.itemSize;
  for (const att of Object.values(g.attributes)) {
    const a = att.array, k = att.itemSize;
    for (let t = 0; t < att.count; t += 3) for (let c = 0; c < k; c++) { const i1 = (t + 1) * k + c, i2 = (t + 2) * k + c, tmp = a[i1]; a[i1] = a[i2]; a[i2] = tmp; }
  }
  void p; void s;
}
/** make each triangle's winding agree with its stored normal (the hand-built boxes) */
function fixWinding(g) {
  const p = g.attributes.position, n = g.attributes.normal, A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), Nn = new THREE.Vector3();
  const bad = [];
  for (let t = 0; t < p.count; t += 3) {
    A.fromBufferAttribute(p, t); B.fromBufferAttribute(p, t + 1); C.fromBufferAttribute(p, t + 2); Nn.fromBufferAttribute(n, t);
    const f = B.clone().sub(A).cross(C.clone().sub(A));
    if (f.dot(Nn) < 0) bad.push(t);
  }
  for (const att of Object.values(g.attributes)) {
    const a = att.array, k = att.itemSize;
    for (const t of bad) for (let c = 0; c < k; c++) { const i1 = (t + 1) * k + c, i2 = (t + 2) * k + c, tmp = a[i1]; a[i1] = a[i2]; a[i2] = tmp; }
  }
}

// ------------------------------------------------------------------------------------------------ the trees
/** tree placements { x, z, height } round the spot (none on a line: the riding area keeps its few NEAR_TREES) */
export function treePlan(houses) {
  const T = NEAR_TREES.map(([x, z], i) => ({ x, z, height: 9 + rnd(i + 400) * 6 }));
  const F = SPOT.fine;
  const nearHouse = (x, z) => houses.some((h) => hyp(x - h.cx, z - h.cz) < 11);
  for (let k = 0; T.length < 230 && k < 6000; k++) {
    const a = rnd(k) * Math.PI * 2, r = 50 + Math.pow(rnd(k + 1), 0.8) * 170;
    const x = FAR_C.x + Math.cos(a) * r, z = FAR_C.z + Math.sin(a) * r;
    if (x > F.x0 - 2 && x < F.x1 + 2 && z > F.z0 - 2 && z < F.z1 + 2 && !(z > 54 || x < -46)) continue;      // (inside the fine area only behind the fence)
    if (nearHouse(x, z) || T.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 42)) continue;
    // (clumps: a tree prefers a neighbour)
    T.push({ x, z, height: 9 + rnd(k + 7) * 9 });
  }
  return T;
}

// ------------------------------------------------------------------------------------------------ build
/**
 * -> { ground: { fine, far, heightAt }, parts: [{ name, mat, geo, closed, pieces: [{ name, feet, geo? }] }],
 *      solidTop(S, x, z), houses, trees }
 * opts.keepPieces: keep each piece's own geometry (the node check)
 */
export function buildSpotMeshes({ keepPieces = true } = {}) {
  const ground = groundGrids();
  const acc = new Map();
  // (a piece stands on the ground / a solid's top (its feet checked), or `on` other pieces: it must touch one of them)
  const add = (mat, name, g, on = null) => {
    const e = acc.get(mat) || acc.set(mat, { mat, list: [], pieces: [] }).get(mat);
    g.computeBoundingBox();
    const pc = { name, feet: on ? [] : feetOf(g), on, box: g.boundingBox.clone(), geo: keepPieces ? g : null };
    e.list.push(g); e.pieces.push(pc);
    return pc;
  };
  // ---- the solids
  const solidGeos = new Map();
  const solidPc = new Map();
  for (const S of SOLIDS) { const g = solidGeo(S); solidGeos.set(S, g); solidPc.set(S.name, add(S.mat, S.name, g)); }
  // ---- steel: the quarter pipe's coping, the funbox rail + posts, the handrail + posts, the ledge's angle
  const Q = SPOT.qp;
  const lipY = Q.h + TOE;
  add("steel", "coping", tube([Q.xc - Q.w / 2 + 0.03, lipY - 0.012, Q.lipZ], [Q.xc + Q.w / 2 - 0.03, lipY - 0.012, Q.lipZ], 0.032, 14), [solidPc.get("quarter pipe")]);
  const R = FUNBOX_RAIL, Fb = SPOT.funbox;
  const fposts = [R.z0 + 0.05, R.z1 - 0.05].map((z) => add("steel", "funbox rail post", tube([R.x, Fb.h - 0.04, z], [R.x, R.y, z], 0.02, 10)));
  add("steel", "funbox rail", tube([R.x, R.y, R.z0 - 0.15], [R.x, R.y, R.z1 + 0.15], 0.024, 12), fposts);
  const hr = handrailLine();
  {
    const [a, b] = hr, ext = 0.25, dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const A = [a[0] - dx / L * ext, a[1] - dy / L * ext, a[2] - dz / L * ext], Bp = [b[0] + dx / L * ext, b[1] + dy / L * ext, b[2] + dz / L * ext];
    const posts = [0.06, 0.5, 0.94].map((t) => {
      const x = a[0] + dx * t, y = a[1] + dy * t, z = a[2] + dz * t, gy = spotHeight(x, z);
      return add("steel", "handrail post", tube([x, gy - 0.05, z], [x, y, z], 0.022, 10));
    });
    add("steel", "handrail", tube(A, Bp, 0.024, 12), posts);
  }
  const Ld = SPOT.ledge;
  {
    const len = Ld.z1 - Ld.z0, zc = (Ld.z0 + Ld.z1) / 2, base = -0.08, hgt = LEDGE_TOP - base;
    const ledge = add("concrete", "ledge", rbox(0.3, hgt, len, Ld.x, base + hgt / 2, zc, 0, 0.02, [0, 0, 0, 0]));
    // the steel angle on both top edges: 4 mm proud of the top and of the side (never coplanar with the concrete)
    for (const sx of [-1, 1]) add("steel", "ledge angle", rbox(0.034, 0.03, len + 0.004, Ld.x + sx * (0.15 - 0.013), LEDGE_TOP - 0.011, zc, 0, 0.004, [0, 0, 0, 0], 1), [ledge]);
  }
  // ---- the graffiti wall: one rounded slab (the tags are in its material: no decal planes)
  const Wl = SPOT.wall;
  add("graffiti", "graffiti wall", rbox(Wl.x1 - Wl.x0, Wl.h + 0.15, Wl.t, (Wl.x0 + Wl.x1) / 2, (Wl.h - 0.15) / 2, Wl.z, 0, 0.03, [Wl.x0, Wl.x1, Wl.h, 0]));
  // ---- the bench (bench_park: wooden slats on two steel frames)
  for (const b of SPOT_FURNITURE.benches) {
    const d = BENCH[b.piece], c = Math.cos(b.yaw), sn = Math.sin(b.yaw);
    const at = (u, v) => [b.x + u * c + v * sn, b.z - u * sn + v * c];
    const legs = [];
    for (const u of [-d.hx + 0.15, d.hx - 0.15]) {
      const [xf, zf] = at(u, d.hz - 0.08), [xb, zb] = at(u, -d.hz + 0.06);
      legs.push(add("darksteel", "bench leg", rbox(0.05, d.seat - 0.04 + 0.06, 0.05, xf, (d.seat - 0.04 - 0.06) / 2, zf, b.yaw, 0.008)));
      legs.push(add("darksteel", "bench leg", rbox(0.05, 0.8 + 0.06, 0.05, xb, (0.8 - 0.06) / 2, zb, b.yaw, 0.008)));
    }
    const rails = [-d.hx + 0.15, d.hx - 0.15].map((u) => { const [xs, zs] = at(u, 0); return add("darksteel", "bench rail", rbox(0.045, 0.04, 2 * d.hz - 0.06, xs, d.seat - 0.06, zs, b.yaw, 0.008), legs); });
    for (let i = 0; i < 4; i++) { const v = -d.hz + 0.06 + i * ((2 * d.hz - 0.12) / 3), [x, z] = at(0, v); add("benchwood", "bench slat", rbox(2 * d.hx, 0.04, 0.1, x, d.seat - 0.02, z, b.yaw, 0.01), rails); }
    for (let i = 0; i < 2; i++) { const [x, z] = at(0, -d.hz + 0.03); add("benchwood", "bench back", rbox(2 * d.hx, 0.11, 0.035, x, 0.6 + i * 0.15, z, b.yaw, 0.01), legs); }
  }
  // ---- bins (the city's dark green bins: a drum, a domed lid), cones (orange, a white band, a square foot)
  for (const [x, z] of BINS) {
    const gy = spotHeight(x, z);
    add("bin", "bin", lathe([[0, -0.06], [0.27, -0.06], [0.28, 0.02], [0.3, 0.86], [0.31, 0.9], [0.24, 0.98], [0.0, 1.0]], x, gy, z, 22));
  }
  for (const [x, z] of CONES) {
    const gy = spotHeight(x, z);
    add("cone", "cone", lathe([[0, -0.03], [0.17, -0.03], [0.19, 0.0], [0.19, 0.03], [0.12, 0.035], [0.035, 0.52], [0.02, 0.535], [0, 0.535]], x, gy, z, 18));
  }
  // ---- the fence: posts every 2.4 m into the ground, a board panel between (the boards in its material)
  for (const [ax, az, bx, bz] of FENCES) {
    const L = hyp(bx - ax, bz - az), n = Math.ceil(L / 2.4), yaw = Math.atan2(-(bz - az), bx - ax);
    for (let k = 0; k <= n; k++) {
      const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n, gy = Math.min(terrainH(x - 0.05, z - 0.05), terrainH(x + 0.05, z + 0.05));
      add("fencepost", "fence post", rbox(0.11, 2.0, 0.11, x, gy + 1.75 - 1.0 - 0.25 + 0.25, z, yaw, 0.012));
      if (k === n) continue;
      const x2 = ax + (bx - ax) * (k + 1) / n, z2 = az + (bz - az) * (k + 1) / n, mx = (x + x2) / 2, mz = (z + z2) / 2;
      const g0 = Math.min(terrainH(x, z), terrainH(x2, z2), terrainH(mx, mz)) - 0.06, top = Math.max(terrainH(x, z), terrainH(x2, z2)) + 1.6;
      add("fence", "fence panel", rbox(L / n - 0.12, top - g0, 0.035, mx, (top + g0) / 2, mz, yaw, 0.008, [0, 0, 0, 0], 1));
    }
  }
  // ---- the houses
  const houses = housePlan();
  for (const hs of houses) {
    const g = houseGeo(hs); const b = add("house", "house", g.body), r = add("roof", "roof", g.roof, [b]);
    const det = [];
    for (const dt of houseDetails(hs, g)) det.push(add(dt.mat, dt.name, dt.geo, [dt.on === "body" ? b : dt.on === "roof" ? r : det[dt.on]]));
  }
  // ---- merge per material
  const parts = [];
  for (const e of acc.values()) {
    const geo = mergeGeometries(e.list.map((g) => g.index ? g.toNonIndexed() : g));
    geo.computeBoundingSphere();
    parts.push({ name: e.mat, mat: e.mat, geo, closed: true, pieces: e.pieces });
    if (!keepPieces) for (const g of e.list) if (g !== geo) g.dispose();
  }
  // the solids' tops from their geometry: a vertical ray down at (x, z), the highest hit (null: no hit)
  const solidTop = (S, x, z) => {
    const g = solidGeos.get(S), p = g.attributes.position; let best = null;
    for (let t = 0; t < p.count; t += 3) {
      const ax = p.getX(t), az = p.getZ(t), bx = p.getX(t + 1), bz = p.getZ(t + 1), cx = p.getX(t + 2), cz = p.getZ(t + 2);
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-12) continue;
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const y = l1 * p.getY(t) + l2 * p.getY(t + 1) + l3 * p.getY(t + 2);
      if (best == null || y > best) best = y;
    }
    return best;
  };
  void profAt; void farH;
  return { ground, parts, solidTop, houses, trees: treePlan(houses) };
}
