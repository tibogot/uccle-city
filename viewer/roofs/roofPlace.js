// THE ROOF KIT'S PLACEMENT (docs/assets/ROOFS.md): what stands on the city's roofs, from the real UrbIS roof data, in the
// tile worker (viewer/facadeGeom.js analyseBuildings calls it per building; no three.js here). Deterministic: every
// choice comes from hash01(the building's BU_ID + a salt), so a building looks the same every visit.
//
// INPUT per building: its roof triangles (UrbIS LoD2, wound outward), its wall faces (party / street / gable analysis of
// facadeGeom), roofAt / otherAt (the neighbours). OUTPUT (finish()):
//   pieces: { <piece>: Float32Array, STRIDE floats per instance = matrix (16, column major) + iVar (4) + iAux (4) }
//   cols:   collision tops [x0, z0, x1, z1, top, ...] (axis-aligned xz boxes, m TAW): stamped into the falcon's drawn
//           roof grid (viewer/tileData.js roofSurface) so the bird hits what is drawn
//   parapets: the low walls round flat roofs (facadeGeom draws them: the outer face in the wall mesh, the inner face
//           and the coping as strip details)
//   stats
//
// PIECES (the kit: tools/blender/roofKit.py + the stack in JS, viewer/roofs/roofKit.js):
//   stack     brick chimney stack, a unit box (x, z +-0.5, y 0..1) scaled to the stack; its foot goes below the roof
//             (JOINS: the lowest roof point under it - 5 cm); iAux = the roof under it (y0, gx, gz, tent) for the
//             shader's lead flashing / soot; iVar = (brick tone, render?, rnd, 0)
//   chimcap   corbelled courses + a concrete cap slab on the stack top (unit footprint, scaled x / z)
//   pot       clay chimney pot (terracotta), 1-4 per stack; cowl = a steel flue terminal instead of some pots
//   velux     a roof window lying on a slope (centre on the slope, +y the slope's normal, +z up the slope); scaled to
//             its size (0.78 x 0.98 .. 1.14 x 1.18)
//   pv        a solar module (1.0 x 1.7 m portrait): flush on slopes (on its rails), or on the tilted frame on flat roofs
//   pvframe   the aluminium A-frame + ballast under a flat-roof module
//   cond      split air-conditioning condenser on its feet; ahu = a rooftop air-handling unit (big blocks / shops)
//   vent      soil / extract vent pipe with its hat; ventbox = a square louvred extract box
//   hatch     roof access hatch (upstand + lid); dome = an opal rooflight dome on its upstand; skylight = flat glazed
//   dish      satellite dish on a short mast with a base plate (flat roofs) or on a chimney bracket
export const STRIDE = 24;
export const PIECES = ["stack", "chimcap", "pot", "cowl", "velux", "pv", "pvframe", "cond", "ahu", "vent", "ventbox", "hatch", "dome", "skylight", "dish"];

function h01(str) {                           // = facadeGeom.js hash01
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000003) / 1000003;
}
/** a small seeded generator per building (mulberry32) */
function rng(seed) {
  let a = Math.floor(seed * 4294967296) >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// the city's axes: x east, z SOUTH. A dish model looks along its local +z; yaw a turns local +z to (sin a, 0, cos a):
// south-south-east (azimuth ~ 165 deg from north) = (0.26, 0, 0.97) -> a ~ 0.26 rad, +- a little
const dishYaw = (r) => 0.2 + r() * 0.14;
const key3 = (q) => `${Math.round(q[0] * 50)},${Math.round(q[1] * 50)},${Math.round(q[2] * 50)}`;

/** point (x, z) in triangle (2D); returns barycentric-interpolated y or null */
function triY(t, x, z) {
  const [a, b, c] = t.p;
  const det = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
  if (Math.abs(det) < 1e-9) return null;
  const l1 = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / det;
  const l2 = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / det;
  const l3 = 1 - l1 - l2;
  if (l1 < -1e-5 || l2 < -1e-5 || l3 < -1e-5) return null;
  return l1 * a[1] + l2 * b[1] + l3 * c[1];
}
/** distance from (x, z) to segment (ax, az)-(bx, bz) */
function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-12;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
  return Math.hypot(ax + dx * t - x, az + dz * t - z);
}

/** the collector of one tile */
export function roofCollector(opts = {}) {
  const out = Object.fromEntries(PIECES.map((p) => [p, []]));
  const cols = [];
  const parapets = [];
  const stats = { buildings: 0, flatRegions: 0, slopes: 0, parapetM: 0, stacks: 0, pots: 0, velux: 0, pv: 0, pvRoofs: 0, flatItems: 0 };
  const M = new Float32Array(16);
  const put = (piece, m, v = [0, 0, 0, 0], a = [0, 0, 0, 0]) => {
    const o = out[piece];
    for (let k = 0; k < 16; k++) o.push(m[k]);
    o.push(v[0], v[1], v[2], v[3], a[0], a[1], a[2], a[3]);
  };
  /** matrix from an origin and three (scaled) axis vectors */
  const basis = (o, X, Y, Z) => { M.set([X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, o[0], o[1], o[2], 1]); return M; };
  /** yaw (about +y: local +x = (cos a, 0, -sin a)... three.js convention: x' = (c, 0, -s), z' = (s, 0, c)) + scale */
  const yawM = (x, y, z, ca, sa, sx, sy, sz) => basis([x, y, z], [ca * sx, 0, -sa * sx], [0, sy, 0], [sa * sz, 0, ca * sz]);
  /** a collision box of an oriented footprint (centre, half sizes along (ca, -sa) and (sa, ca)) up to `top` */
  const colBox = (x, z, hx, hz, ca, sa, top) => {
    const ex = Math.abs(ca) * hx + Math.abs(sa) * hz, ez = Math.abs(sa) * hx + Math.abs(ca) * hz;
    cols.push(x - ex, z - ez, x + ex, z + ez, top);
  };

  // ------------------------------------------------------------------------------------------- chimney stacks
  /**
   * one stack: centre (x, z), width w along (tx, tz), depth d across, top y, the roof under it as a function roofY(x, z)
   * (its lowest point under the footprint sets the foot) + the shader's roof model (aux), brick tone, rnd
   */
  function stack(x, z, tx, tz, w, d, top, roofY, aux, tone, r) {
    const nx = -tz, nz = tx;
    let lo = Infinity, hi = -Infinity;
    for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0, 0]]) {
      const yy = roofY(x + tx * a * w + nx * b * d, z + tz * a * w + nz * b * d);
      lo = Math.min(lo, yy); hi = Math.max(hi, yy);
    }
    if (!(lo > -1e8)) return false;
    if (top < hi + 0.5) top = hi + 0.5;                                     // at least 50 cm clear of the roof
    const foot = lo - 0.08, H = top - foot;
    const render = r() < 0.12 ? 1 : 0;                                      // rendered / painted stacks (villas)
    // iVar = (brick tone + 8 x render, rnd, the stack's origin x / z: the shader's roof plane is relative to it)
    const v = [tone + 8 * render, r(), x, z];
    // the stack (local x along t)
    put("stack", basis([x, foot, z], [tx * w, 0, tz * w], [0, H, 0], [nx * d, 0, nz * d]), v, aux);
    // the corbel + cap (unit footprint; it oversails 6 cm a side in the model)
    put("chimcap", basis([x, top, z], [tx * w, 0, tz * w], [0, 1, 0], [nx * d, 0, nz * d]), v, aux);
    // pots on the cap slab (0.25 m tall in the model, the pots stand on y = top + 0.25)
    const capTop = top + 0.25;
    const n = w < 0.65 ? 1 : w < 1.05 ? (r() < 0.7 ? 2 : 1) : w < 1.45 ? (r() < 0.6 ? 3 : 2) : 4;
    const none = r() < 0.1, modern = r() < 0.22;
    let potTop = capTop;
    if (!none) for (let k = 0; k < n; k++) {
      const a = (k + 0.5) / n - 0.5, px = x + tx * a * w * 0.86, pz = z + tz * a * w * 0.86;
      const s = 0.85 + r() * 0.3, hs = 0.8 + r() * 0.55, rot = r() * Math.PI * 2;
      if (modern && k === n - 1) {
        put("cowl", yawM(px, capTop - 0.02, pz, Math.cos(rot), Math.sin(rot), 1, 0.8 + r() * 0.6, 1), [r(), 0, 0, 0]);
        potTop = Math.max(potTop, capTop + 0.8);
      } else {
        put("pot", yawM(px, capTop - 0.02, pz, Math.cos(rot), Math.sin(rot), s, hs, s), [r(), r() < 0.25 ? 1 : 0, 0, 0]);
        potTop = Math.max(potTop, capTop + 0.55 * hs);
        stats.pots++;
      }
    }
    colBox(x, z, w / 2 + 0.06, d / 2 + 0.06, tx, -tz, potTop);
    stats.stacks++;
    return { x, z, top: capTop, w, d, tx, tz };
  }

  // the stacks of the tile so far (a party-wall stack is built once for both houses), by position
  const stacks = [];

  /**
   * A gable / party-wall face of a building (facadeGeom's face loop): Brussels terraces carry their stacks ON the party
   * walls at the gable's top; a detached villa often on a gable wall. f = { key, x, z (the gable's top point on the
   * wall), tx, tz (along the wall), nx, nz (outward), u0 / u1 room, top (the apex y), party (bool), roofAt(x, z) of
   * the own building, otherRoof(x, z) (the neighbour's, or -Inf), tone, rnd }
   */
  function gableChimney(f) {
    const key = f.key;
    const r = rng(h01(key + "|chim" + Math.round(f.x) + "," + Math.round(f.z)));
    if (stacks.some((s) => Math.hypot(s.x - f.x, s.z - f.z) < 1.2)) return null;   // the neighbour built it
    // width along the wall: a party stack serves both houses (2-4 flues), 0.8-1.5 m; a gable stack 0.55-0.9
    const w = f.party ? 0.8 + r() * 0.7 : 0.55 + r() * 0.35, d = f.party ? 0.5 + r() * 0.15 : 0.45 + r() * 0.15;
    // straddling the party wall (half in each roof), or inside the gable wall (its outer face 5 cm in from the wall)
    const inset = f.party ? 0 : d / 2 + 0.05;
    const cx = f.x - f.nx * inset, cz = f.z - f.nz * inset;
    const roofY = (x, z) => {
      const a = f.roofAt(x, z), b = f.otherRoof ? f.otherRoof(x, z) : -Infinity;
      const m = Math.max(a, b);
      return m > -1e8 ? m : f.top;
    };
    const top = f.top + 0.7 + r() * 0.6;
    // the shader's roof model under the stack: a tent along the wall (the gable's two slopes): y0 - |d . g|
    const g = Math.max(0.2, Math.min(1.6, (f.top - roofY(f.x + f.tx * 1.5, f.z + f.tz * 1.5)) / 1.5));
    const s = stack(cx, cz, f.tx, f.tz, w, d, top, roofY, [f.top, f.tx * g, f.tz * g, 1], f.tone, r);
    if (s) { s.party = f.party; stacks.push(s); stats[f.party ? "stackParty" : "stackGable"] = (stats[f.party ? "stackParty" : "stackGable"] || 0) + 1; }
    return s;
  }

  // ------------------------------------------------------------------------------------------- the building
  /**
   * b: { key, rnd, height, base, eaves, landmark, style (wall style), roofTris: [{ p, n, area }], footprint ring,
   * hasPartyStack (a party-wall stack already placed), streetNormals: [[nx, nz]] (the street faces' outward normals),
   * roofAt(x, z) (own), otherTop(x, z) (the highest other building's roof there, or -Inf) }
   */
  function building(b) {
    if (b.landmark || !b.roofTris.length) return;
    stats.buildings++;
    const r = rng(h01(b.key + "|roofs"));
    const tris = b.roofTris.filter((t) => Math.abs(t.n[1]) > 0.15);
    // ---- group into planar pieces: flat regions (|ny| > 0.97, same level) and slopes (same plane), connected by edges
    const planes = [];
    const edgeOf = new Map();
    tris.forEach((t, i) => {
      t.i = i;
      for (let e = 0; e < 3; e++) {
        const A = t.p[e], B = t.p[(e + 1) % 3], ka = key3(A), kb = key3(B), k = ka < kb ? ka + "|" + kb : kb + "|" + ka;
        if (!edgeOf.has(k)) edgeOf.set(k, []);
        edgeOf.get(k).push({ t, A, B, C: t.p[(e + 2) % 3] });
      }
    });
    const parent = tris.map((_, i) => i);
    const find = (i) => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
    const same = (a, c) => {
      const na = a.n[1] < 0 ? a.n.map((v) => -v) : a.n, nc = c.n[1] < 0 ? c.n.map((v) => -v) : c.n;
      if (na[0] * nc[0] + na[1] * nc[1] + na[2] * nc[2] < 0.9985) return false;
      const d = (c.p[0][0] - a.p[0][0]) * na[0] + (c.p[0][1] - a.p[0][1]) * na[1] + (c.p[0][2] - a.p[0][2]) * na[2];
      return Math.abs(d) < 0.08;
    };
    for (const list of edgeOf.values()) if (list.length === 2 && same(list[0].t, list[1].t)) { const a = find(list[0].t.i), c = find(list[1].t.i); if (a !== c) parent[a] = c; }
    const groups = new Map();
    for (const t of tris) { const k = find(t.i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
    for (const g of groups.values()) {
      const n0 = g[0].n[1] < 0 ? g[0].n.map((v) => -v) : g[0].n;
      let area = 0, y = 0;
      for (const t of g) { area += t.area; y += (t.p[0][1] + t.p[1][1] + t.p[2][1]) / 3 * t.area; }
      // boundary edges: used once inside the group
      const inG = new Set(g);
      const bnd = [];
      for (const t of g) for (let e = 0; e < 3; e++) {
        const A = t.p[e], B = t.p[(e + 1) % 3], ka = key3(A), kb = key3(B), k = ka < kb ? ka + "|" + kb : kb + "|" + ka;
        const l = edgeOf.get(k);
        if (l.filter((q) => inG.has(q.t)).length === 1) bnd.push({ A, B, C: t.p[(e + 2) % 3], shared: l.length > 1 });
      }
      planes.push({ tris: g, n: n0, area, y: y / area, flat: n0[1] > 0.97, bnd });
    }
    const flats = planes.filter((p) => p.flat && p.area >= 6);
    const slopes = planes.filter((p) => !p.flat && p.area >= 4);
    stats.flatRegions += flats.length; stats.slopes += slopes.length;
    const taken = [];                                   // [x, z, radius] of what is placed on this building
    // (the tile's stacks near this building only: the whole list per test cost seconds a tile)
    let bx0 = Infinity, bz0 = Infinity, bx1 = -Infinity, bz1 = -Infinity;
    for (const t of tris) for (const q of t.p) { bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); bz0 = Math.min(bz0, q[2]); bz1 = Math.max(bz1, q[2]); }
    const nearStacks = stacks.filter((s) => s.x > bx0 - 3 && s.x < bx1 + 3 && s.z > bz0 - 3 && s.z < bz1 + 3);
    const free = (x, z, rad) => !taken.some(([a, c, q]) => Math.hypot(a - x, c - z) < q + rad) && !nearStacks.some((s) => Math.hypot(s.x - x, s.z - z) < rad + Math.max(s.w, s.d) * 0.6 + 0.2);
    const occupied = (x, z, y) => b.otherTop(x, z) > y + 0.25;           // a lift overrun / another solid standing there

    // ---- FLAT REGIONS
    const bigBlock = b.height >= 10;
    // ONE parapet per building (height, thickness, coping): its regions' parapets meet and mitre at their corners
    const big = flats.reduce((m, R) => Math.max(m, R.area), 0);
    const pr = rng(h01(b.key + "|parapet"));
    const par = { h: bigBlock ? 0.45 + pr() * 0.5 : big > 40 ? 0.2 + pr() * 0.3 : 0.12 + pr() * 0.2, t: bigBlock ? 0.25 : 0.18, cope: pr() };
    for (const R of flats) flatRegion(R, b, r, bigBlock, taken, free, occupied, par);

    // ---- SLOPES: chimney on detached roofs, solar arrays, roof windows
    if (slopes.length) pitched(slopes, b, r, taken, free);
  }

  // ------------------------------------------------------------------------------------------- flat regions
  function flatRegion(R, b, r, bigBlock, taken, free, occupied, par) {
    const y = R.y;
    // the main axis: the longest boundary edge
    let ax = 1, az = 0, best = 0;
    for (const e of R.bnd) { const L = Math.hypot(e.B[0] - e.A[0], e.B[2] - e.A[2]); if (L > best) { best = L; ax = (e.B[0] - e.A[0]) / L; az = (e.B[2] - e.A[2]) / L; } }
    // ---- parapets on the edges over a wall (nothing as high outside)
    const ph = par.h, cope = par.cope;                  // coping: < 0.5 aluminium, < 0.8 concrete / blue stone, else dark metal
    if (R.area >= 8) for (const e of R.bnd) {
      const L = Math.hypot(e.B[0] - e.A[0], e.B[2] - e.A[2]);
      if (L < 0.6) continue;
      // outward: away from the triangle's third corner
      let nx = -(e.B[2] - e.A[2]) / L, nz = (e.B[0] - e.A[0]) / L;
      const mx = (e.A[0] + e.B[0]) / 2, mz = (e.A[2] + e.B[2]) / 2;
      if ((e.C[0] - mx) * nx + (e.C[2] - mz) * nz > 0) { nx = -nx; nz = -nz; }
      // what is outside, 0.35 m out, at three points along the edge: a roof / solid as high (or higher) = no parapet
      let blocked = 0;
      for (const f of [0.15, 0.5, 0.85]) {
        const px = e.A[0] + (e.B[0] - e.A[0]) * f + nx * 0.35, pz = e.A[2] + (e.B[2] - e.A[2]) * f + nz * 0.35;
        const o = Math.max(b.roofAt(px, pz, true), b.otherTop(px, pz));
        if (o > Math.min(e.A[1], e.B[1]) - 0.4) blocked++;
      }
      if (blocked >= 2) continue;
      parapets.push({ A: e.A, B: e.B, nx, nz, h: ph, t: par.t, cope, key: b.key, roof: b.roofColor });
      stats.parapetM += L;
      cols.push(Math.min(e.A[0], e.B[0]) - 0.15, Math.min(e.A[2], e.B[2]) - 0.15, Math.max(e.A[0], e.B[0]) + 0.15, Math.max(e.A[2], e.B[2]) + 0.15, Math.max(e.A[1], e.B[1]) + ph + 0.05);
    }
    // ---- the free roof: candidate spots on a 0.5 m grid in the region's own frame, with their clearance to the edges
    const cs = 0.5;
    const tx = ax, tz = az, sx = -az, sz = ax;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const t of R.tris) for (const q of t.p) { const u = q[0] * tx + q[2] * tz, v = q[0] * sx + q[2] * sz; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const spots = [];
    const nu = Math.floor((u1 - u0) / cs), nv = Math.floor((v1 - v0) / cs);
    if (nu * nv > 40000) return;                       // (a 1 ha roof: skip the furniture)
    // the grid points inside the region: each triangle rasterised in the region's (u, v) frame (not every point
    // against every triangle)
    const inGrid = new Uint8Array((nu + 1) * (nv + 1));
    for (const t of R.tris) {
      const q = t.p.map((p) => [p[0] * tx + p[2] * tz, p[0] * sx + p[2] * sz]);
      const i0 = Math.max(1, Math.ceil((Math.min(q[0][0], q[1][0], q[2][0]) - u0) / cs)), i1 = Math.min(nu - 1, Math.floor((Math.max(q[0][0], q[1][0], q[2][0]) - u0) / cs));
      const j0 = Math.max(1, Math.ceil((Math.min(q[0][1], q[1][1], q[2][1]) - v0) / cs)), j1 = Math.min(nv - 1, Math.floor((Math.max(q[0][1], q[1][1], q[2][1]) - v0) / cs));
      const [a, b, c] = q, det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(det) < 1e-9) continue;
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const u = u0 + i * cs, v = v0 + j * cs;
        const l1 = ((b[1] - c[1]) * (u - c[0]) + (c[0] - b[0]) * (v - c[1])) / det, l2 = ((c[1] - a[1]) * (u - c[0]) + (a[0] - c[0]) * (v - c[1])) / det;
        if (l1 >= -1e-5 && l2 >= -1e-5 && 1 - l1 - l2 >= -1e-5) inGrid[i * (nv + 1) + j] = 1;
      }
    }
    // clearance to the edges: the boundary edges near each point (a coarse 4 m bucket of the edges)
    const bucket = new Map(), BK = 4, bk = (x, z) => `${Math.floor(x / BK)},${Math.floor(z / BK)}`;
    for (const e of R.bnd) {
      const xa = Math.min(e.A[0], e.B[0]), xb = Math.max(e.A[0], e.B[0]), za = Math.min(e.A[2], e.B[2]), zb = Math.max(e.A[2], e.B[2]);
      for (let gx = Math.floor((xa - 3) / BK); gx <= Math.floor((xb + 3) / BK); gx++) for (let gz = Math.floor((za - 3) / BK); gz <= Math.floor((zb + 3) / BK); gz++) {
        const k = gx + "," + gz; if (!bucket.has(k)) bucket.set(k, []); bucket.get(k).push(e);
      }
    }
    for (let i = 1; i < nu; i++) for (let j = 1; j < nv; j++) {
      if (!inGrid[i * (nv + 1) + j]) continue;
      const u = u0 + i * cs, v = v0 + j * cs, x = u * tx + v * sx, z = u * tz + v * sz;
      let clr = 3;                                     // (3 m and more: as good as far)
      for (const e of bucket.get(bk(x, z)) || []) clr = Math.min(clr, segDist(x, z, e.A[0], e.A[2], e.B[0], e.B[2]));
      if (clr < 0.6 || occupied(x, z, y)) continue;
      spots.push({ x, z, u, v, clr });
    }
    if (!spots.length) return;
    // a random free spot with that clearance (up to 60 draws: filtering every spot against everything placed cost
    // most of the façade analysis on big roofs)
    const pick = (need, rad) => {
      for (let k = 0; k < 60; k++) { const sp = spots[Math.floor(r() * spots.length)]; if (sp.clr >= need && free(sp.x, sp.z, rad)) return sp; }
      return null;
    };
    const ca = tx, sa = -tz;                            // yaw so that local +x = the region's axis (three.js: x' = (cos, 0, -sin))
    const aux = b.roofColor ? [b.roofColor[0], b.roofColor[1], b.roofColor[2], 0] : [0, 0, 0, 0];   // the upstands: the roof's colour
    const place = (piece, s, sxx, syy, szz, rad, v = [0, 0, 0, 0], quarter = false, top = 1, yaw = null) => {
      const q = quarter && r() < 0.5;
      const c = yaw !== null ? Math.cos(yaw) : q ? -sa : ca, sn = yaw !== null ? Math.sin(yaw) : q ? ca : sa;
      put(piece, yawM(s.x, y, s.z, c, sn, sxx, syy, szz), v, aux);
      taken.push([s.x, s.z, rad]);
      colBox(s.x, s.z, rad * 0.75, rad * 0.75, 1, 0, y + top);
      stats.flatItems++;
    };
    const A = R.area;
    const block = bigBlock && A >= 100, shed = !bigBlock && A >= 250;     // apartment / office block, a big low shed (shops, garages)
    if (block || shed) {
      // the roof access hatch (unless a stair / lift overrun solid stands on the roof: then the door is in it)
      if (r() < 0.75) { const s = pick(1.5, 0.8); if (s) place("hatch", s, 1, 1, 1, 0.75, [r(), 0, 0, 0], false, 0.7); }
      // vents: soil stacks and extract boxes, ~ one per 60 m2
      const nv2 = Math.min(16, Math.max(2, Math.round(A / 60 * (0.6 + r() * 0.8))));
      for (let k = 0; k < nv2; k++) {
        const box = r() < 0.3, s = pick(box ? 1.2 : 0.8, box ? 0.5 : 0.25);
        if (!s) break;
        if (box) place("ventbox", s, 1, 0.8 + r() * 0.5, 1, 0.5, [r(), 0, 0, 0], true, 1.0);
        else place("vent", s, 1, 0.8 + r() * 0.9, 1, 0.25, [r(), 0, 0, 0], false, 1.2);
      }
      // air conditioning: condensers along an edge (offices / shops more), an AHU on big roofs
      const nc = Math.floor(r() * (shed ? 5 : 3.5));
      for (let k = 0; k < nc; k++) { const s = pick(1.0, 0.65); if (s) place("cond", s, 1, 1, 1, 0.65, [r(), 0, 0, 0], true, 0.9); }
      if (A > 400 && r() < (shed ? 0.7 : 0.35)) { const s = pick(2.4, 1.7); if (s) place("ahu", s, 1, 1, 1, 1.7, [r(), 0, 0, 0], false, 1.6); }
      // rooflights: rows of domes on sheds, a few on blocks
      const nd = shed ? (r() < 0.6 ? 2 + Math.floor(r() * Math.min(10, A / 120)) : 0) : r() < 0.3 ? 1 + Math.floor(r() * 3) : 0;
      for (let k = 0; k < nd; k++) { const s = pick(1.2, 0.8); if (s) { const sc = 0.9 + r() * 0.5; place("dome", s, sc, 1, sc, 0.7 * sc, [r(), 0, 0, 0], false, 0.5); } }
      // satellite dishes
      const nds = r() < 0.5 ? 1 + Math.floor(r() * 3) : 0;
      // (the dishes look south-south-east: Astra 19.2 E / Eutelsat from Brussels, azimuth ~ 160-170 deg)
      for (let k = 0; k < nds; k++) { const s = pick(0.9, 0.5); if (s) place("dish", s, 1, 1, 1, 0.5, [r(), 0, 0, 0], false, 1.3, dishYaw(r)); }
      // solar rows on ~22 % of the big flat roofs
      if (r() < 0.22) flatSolar(spots, y, r, taken, free, 0.4 + r() * 0.5);
    } else if (A >= 8) {
      // a house's flat roof / rear annex: a rooflight, a vent, now and then an AC unit or a dish, solar on some
      const u = r();
      if (u < 0.28) { const s = pick(0.8, 0.6); if (s) { const sc = 0.7 + r() * 0.35; place("dome", s, sc, 1, sc, 0.6 * sc, [r(), 0, 0, 0], false, 0.45); } }
      else if (u < 0.45 && A > 12) { const s = pick(0.9, 0.8); if (s) place("skylight", s, 0.9 + r() * 0.4, 1, 0.8 + r() * 0.5, 0.8, [r(), 0, 0, 0], true, 0.3); }
      if (r() < 0.35) { const s = pick(0.7, 0.25); if (s) place("vent", s, 1, 0.6 + r() * 0.6, 1, 0.25, [r(), 0, 0, 0], false, 1.0); }
      if (r() < 0.06) { const s = pick(0.9, 0.65); if (s) place("cond", s, 1, 1, 1, 0.65, [r(), 0, 0, 0], true, 0.9); }
      if (r() < 0.05) { const s = pick(0.8, 0.5); if (s) place("dish", s, 1, 1, 1, 0.5, [r(), 0, 0, 0], false, 1.3, dishYaw(r)); }
      if (A >= 25 && r() < 0.08) flatSolar(spots, y, r, taken, free, 0.5 + r() * 0.5);
    }
  }

  /** rows of tilted modules on a flat roof, facing south (rows run east-west), on their A-frames */
  function flatSolar(spots, y, r, taken, free, fill) {
    // module 1.7 (along the row) x 1.0 (up its 12-15 deg tilt); rows 1.6 m apart (no self-shading in winter)
    const ok = spots.filter((s) => s.clr >= 1.1 && free(s.x, s.z, 0.3));
    if (ok.length < 6) return;
    const P = 1.72, Q = 1.6;
    const c0 = ok[Math.floor(r() * ok.length)];
    const cells = new Map();
    for (const s of ok) {
      const i = Math.round((s.x - c0.x) / P), j = Math.round((s.z - c0.z) / Q), k = i + "," + j;
      if (!cells.has(k)) cells.set(k, { i, j, n: 0 });
      cells.get(k).n++;
    }
    // a cell holds a module when its whole rectangle is roof (all the 0.5 m spots in it present: ~ 3 x 3)
    const full = [...cells.values()].filter((c) => c.n >= 6).sort((a, b) => Math.hypot(a.i, a.j) - Math.hypot(b.i, b.j));
    const n = Math.max(2, Math.round(full.length * fill));
    let placed = 0;
    for (const c of full.slice(0, n)) {
      const x = c0.x + c.i * P, z = c0.z + c.j * Q;
      if (!free(x, z, 0.4)) continue;
      // yaw 0: local +x = east, local +z = south: the frame lifts the module's north edge (it faces south)
      put("pvframe", yawM(x, y, z, 1, 0, 1, 1, 1), [r(), 0, 0, 0]);
      // the module on the frame: tilt 13 deg about x, its centre 0.3 m up
      const tl = 13 * Math.PI / 180, ct = Math.cos(tl), st = Math.sin(tl);
      // the module's short side (local x) up the tilt toward the raised north edge, its long side (local z) east
      put("pv", basis([x, y + 0.27, z], [0, st, -ct], [0, ct, st], [1, 0, 0]), [r(), 1, 0, 0]);   // (its rails on the frame's purlins)
      cols.push(x - 0.9, z - 0.55, x + 0.9, z + 0.55, y + 0.45);
      placed++;
    }
    for (const c of full.slice(0, n)) taken.push([c0.x + c.i * P, c0.z + c.j * Q, 0.9]);
    stats.pv += placed; if (placed) stats.pvRoofs++;
  }

  // ------------------------------------------------------------------------------------------- slopes
  function slopeFrame(S) {
    const n = S.n, hl = Math.hypot(n[0], n[2]) || 1e-9;
    const dx = n[0] / hl, dz = n[2] / hl;                        // downhill, horizontal
    const ca = n[1], sa = hl;                                    // cos / sin of the pitch
    const t = [-dz, 0, dx], s = [-dx * ca, sa, -dz * ca];         // along the eave; up the slope (t x n = s)
    const o = S.tris[0].p[0];
    const uv = (q) => { const ex = q[0] - o[0], ey = q[1] - o[1], ez = q[2] - o[2]; return [ex * t[0] + ez * t[2], ex * s[0] + ey * s[1] + ez * s[2]]; };
    const at = (u, v) => [o[0] + t[0] * u + s[0] * v, o[1] + s[1] * v, o[2] + t[2] * u + s[2] * v];
    const bnd = S.bnd.map((e) => [uv(e.A), uv(e.B)]);
    const tris2 = S.tris.map((tr) => tr.p.map(uv));
    const inside = (u, v) => tris2.some(([a, b, c]) => {
      const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(det) < 1e-9) return false;
      const l1 = ((b[1] - c[1]) * (u - c[0]) + (c[0] - b[0]) * (v - c[1])) / det, l2 = ((c[1] - a[1]) * (u - c[0]) + (a[0] - c[0]) * (v - c[1])) / det;
      return l1 >= -1e-4 && l2 >= -1e-4 && 1 - l1 - l2 >= -1e-4;
    });
    const clear = (u, v) => { let m = Infinity; for (const [a, b] of bnd) m = Math.min(m, segDist(u, v, a[0], a[1], b[0], b[1])); return m; };
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const tr of tris2) for (const [u, v] of tr) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    return { n, t, s, dx, dz, pitch: Math.atan2(sa, ca), uv, at, inside, clear, u0, u1, v0, v1 };
  }

  function pitched(slopes, b, r, taken, free) {
    const frames = slopes.map((S) => ({ S, F: slopeFrame(S) }));
    const facesStreet = (F) => b.streetNormals.some(([nx, nz]) => nx * F.dx + nz * F.dz > 0.7);
    // ---- a chimney on a house with no party-wall stack (villas, semi-detached): near the ridge of its biggest slope
    const big = frames.slice().sort((a, c) => c.S.area - a.S.area)[0];
    if (!b.hasStack && b.footArea >= 45 && b.footArea <= 600 && big.S.area >= 15 && r() < 0.78) {
      const F = big.F, nC = b.footArea > 180 && r() < 0.5 ? 2 : 1;
      for (let k = 0; k < nC; k++) {
        const fu = nC === 1 ? 0.2 + r() * 0.6 : k === 0 ? 0.18 + r() * 0.12 : 0.7 + r() * 0.12;
        const u = F.u0 + (F.u1 - F.u0) * fu, v = F.v1 - 0.45 - r() * 1.2;
        if (!F.inside(u, v) || F.clear(u, v) < 0.45 && v < F.v1 - 0.6) continue;
        const p = F.at(u, v);
        const w = 0.5 + r() * 0.45, d = 0.45 + r() * 0.2;
        const ridgeY = b.roofTop;
        const roofY = (x, z) => { const yy = b.roofAt(x, z, false); return yy > -1e8 ? yy : p[1]; };
        // the roof plane under it (the shader's flashing): y0 + d . g with g = the uphill gradient
        const tanP = Math.tan(F.pitch), g = [-F.dx * tanP, -F.dz * tanP];
        const s = stack(p[0], p[2], F.t[0], F.t[2], w, d, Math.max(ridgeY + 0.5 + r() * 0.5, p[1] + 1.0), roofY, [p[1], g[0], g[1], 0], b.tone, r);
        if (s) { stacks.push(s); stats.stackRidge = (stats.stackRidge || 0) + 1; }
      }
    }
    // ---- solar: ~14 % of the pitched houses, on their most southern slope (within 75 deg of south), portrait modules
    if (r() < 0.14) {
      const cand = frames.filter(({ S, F }) => S.area >= 14 && F.dz > 0.26 && F.pitch > 0.2 && F.pitch < 1.0).sort((a, c) => c.F.dz * Math.sqrt(c.S.area) - a.F.dz * Math.sqrt(a.S.area));
      if (cand.length) slopeSolar(cand[0], b, r, taken, free);
    }
    // ---- roof windows: back slopes 40 %, street slopes 15 %
    for (const { S, F } of frames) {
      if (S.area < 8 || F.pitch < 0.35 || F.pitch > 1.15 || F.v1 - F.v0 < 2.4) continue;
      if (r() > (facesStreet(F) ? 0.15 : 0.4)) continue;
      const size = r() < 0.5 ? [0.78, 1.18] : r() < 0.6 ? [0.78, 0.98] : [1.14, 1.18];
      const span = F.u1 - F.u0, n = Math.min(4, Math.max(1, Math.floor(span / 2.6 * (0.4 + r() * 0.6))));
      const v = F.v0 + (F.v1 - F.v0) * (0.42 + r() * 0.2);
      for (let k = 0; k < n; k++) {
        const u = F.u0 + span * ((k + 0.5) / n) + (r() - 0.5) * 0.3;
        if (!F.inside(u, v) || F.clear(u, v) < Math.max(size[0], size[1]) / 2 + 0.35) continue;
        const p = F.at(u, v);
        if (!free(p[0], p[2], 0.75)) continue;
        // +x along the eave, +y the slope normal, +z up the slope (t x n = s); the model sits 2 cm into the roof
        put("velux", basis([p[0], p[1], p[2]], F.t.map((c) => c * size[0]), F.n, F.s.map((c) => c * size[1])), [r(), 0, 0, 1]);   // (iVar.w 1: the grey sash cladding)
        taken.push([p[0], p[2], 0.75]);
        stats.velux++;
      }
    }
  }

  function slopeSolar({ S, F }, b, r, taken, free) {
    const W = 1.03, H = 1.72;                                  // portrait module + gaps
    const uA = F.u0 + 0.35, uB = F.u1 - 0.35, vA = F.v0 + 0.55, vB = F.v1 - 0.4;
    const cols0 = Math.floor((uB - uA) / W), rows0 = Math.floor((vB - vA) / H);
    if (cols0 < 2 || rows0 < 1) return;
    const cols = Math.max(2, Math.min(cols0, Math.round(cols0 * (0.5 + r() * 0.5)))), rows = Math.max(1, Math.min(rows0, r() < 0.6 ? rows0 : 1));
    const uc = (uA + uB) / 2 + (r() - 0.5) * Math.max(0, (uB - uA) - cols * W) * 0.8, vc = vA + rows * H / 2;
    let placed = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const u = uc + (i - (cols - 1) / 2) * W, v = vc + (j - (rows - 1) / 2) * H;
      let ok = true;
      for (const [a, c] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) if (!F.inside(u + a * W, v + c * H) || F.clear(u + a * W, v + c * H) < 0.25) ok = false;
      if (!ok) continue;
      const p = F.at(u, v);
      if (!free(p[0], p[2], 0.5)) continue;
      put("pv", basis([p[0], p[1], p[2]], F.t.map((c) => c * 1.0), F.n, F.s.map((c) => c * 1.0)), [r(), 0, 0, 0]);
      placed++;
    }
    if (placed) {
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const p = F.at(uc + (i - (cols - 1) / 2) * W, vc + (j - (rows - 1) / 2) * H); taken.push([p[0], p[2], 0.55]); }
      stats.pv += placed; stats.pvRoofs++;
    }
  }

  function finish() {
    const pieces = {};
    for (const p of PIECES) if (out[p].length) pieces[p] = new Float32Array(out[p]);
    return { pieces, stride: STRIDE, cols: new Float32Array(cols), stats };
  }
  return { gableChimney, building, finish, parapets, stats };
}

/** stamp the kit's collision boxes into the falcon's drawn roof grid (viewer/tileData.js roofSurface: Uint16 in 1 / q m) */
export function stampRoofCols(surf, cols) {
  if (!surf || !cols?.length) return 0;
  const { data, nx, nz, x0, z0, step, q } = surf;
  let n = 0;
  for (let k = 0; k < cols.length; k += 5) {
    const i0 = Math.max(0, Math.floor((cols[k] - x0) / step)), i1 = Math.min(nx - 1, Math.floor((cols[k + 2] - x0) / step));
    const j0 = Math.max(0, Math.floor((cols[k + 1] - z0) / step)), j1 = Math.min(nz - 1, Math.floor((cols[k + 3] - z0) / step));
    const v = Math.min(65535, Math.max(1, Math.round(cols[k + 4] * q)));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (data[j * nx + i] < v) { data[j * nx + i] = v; n++; }
  }
  return n;
}
