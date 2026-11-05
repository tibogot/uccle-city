// THE FAÇADE KIT'S PLACEMENT RULES: which Blender pieces (tools/blender/facadeKit.py) go where on a tile's UrbIS
// street façades. Pure JS, no three.js: runs in the tile worker (viewer/tileData.js -> tileWorker.bundle.js) inside the
// façade analysis (viewer/facadeGeom.js analyseBuildings calls kit.face() for every wall face), and in the Kit Lab.
//
// EXACTNESS: the openings come from viewer/interior/facadeWindows.js faceOpenings(), the same window grid, storeys,
// door bay, frames and sills that viewer/facades.js wallMaterial() paints, fed with the shader's own float32 values
// (Math.fround of the face width / eaves / party height and of the building hash: the interior pilot's trap). A piece
// sits on the wall plane AT the opening (the plane is read from the face triangle under the opening's middle, so merged
// faces 30 cm apart still get it right). Every opening of a kit face must lie on the face's triangles, or the face
// stays painted: the wall shader cuts the openings of kit faces (aKit.x = 1), so an uncovered cut would be a hole.
//
// STYLE per building (stable, from the BU_ID hash and the façade style the shader already picked):
//   plain brick (wall styles 0-2): 55 % window B (segmental brick arch, in the wall's brick), else window A (stone
//   architrave + keystone, white or blue stone); render (3-4): window A in white stone; frames white or dark exactly as
//   the shader (dark when fract(rnd x 7) >= 0.8); door A (blue-stone pilasters, panelled oak, fanlight) or door B;
//   a hood over window A where the cornice leaves room; soupiraux under the ground-floor windows (60 %), a balcony on
//   the first floor's middle window (35 % of the fronts with a first floor), modillions (60 %), steps down to the
//   pavement (the DTM in front of the door). No kit on: concrete / grey render (style 5), buildings over 16 m (flats),
//   landmarks, party walls, non-street faces, excluded buildings (hero models, the interior pilot).
//
// OUTPUT (kit.finish()): { pieces: { name: Float32Array of STRIDE floats per instance }, stride, faces, skipped }
//   instance = x, y, z (world: the piece's origin), nx, nz (the wall's outward normal: the piece's +z), w, h (the
//   opening it fits, m; runs: the length), variant bits (1 stone -> blue, 2 frame -> dark, 4 brick -> yellow),
//   seed (per building, 0..1), spare
import { faceOpenings } from "../interior/facadeWindows.js";

export const STRIDE = 10;
export const VARIANT = { BLUE: 1, DARK: 2, YELLOW: 4 };
/** pieces' reference sizes (tools/blender/facadeKit.py REF): the instance's w, h are relative to these */
export const WINDOW_RISE = 0.13;              // window B's segmental head above the painted opening (m)
const MAX_H = 16;                             // no kit on taller buildings (Uccle's flats)

function h01(str) {                           // = facadeGeom.js hash01 (kept here: no import cycle with the analysis)
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000003) / 1000003;
}

/** (u, h) inside triangle (a, b, c) of [u, h, d] corners? -> the interpolated d, else null */
function inTri(u, h, a, b, c) {
  const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(det) < 1e-9) return null;
  const l1 = ((b[1] - c[1]) * (u - c[0]) + (c[0] - b[0]) * (h - c[1])) / det;
  const l2 = ((c[1] - a[1]) * (u - c[0]) + (a[0] - c[0]) * (h - c[1])) / det;
  const l3 = 1 - l1 - l2;
  if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) return null;
  return l1 * a[2] + l2 * b[2] + l3 * c[2];
}

/**
 * A collector for one tile. opts: { exclude: Set of BU_IDs, ground(x, z) -> m (the DTM, for the door steps),
 * only: Set of BU_IDs (the lab's test row) }
 */
export function kitCollector(opts = {}) {
  const exclude = opts.exclude || new Set(), only = opts.only || null;
  const out = {};                               // piece -> number[]
  const runs = [];                              // cornice runs for the corner pass: { key, A, B, nx, nz, y }
  const stats = { faces: 0, skipped: 0, openings: 0 };
  const widths = [];
  const put = (piece, x, y, z, nx, nz, w, h, variant, seed) => (out[piece] ??= []).push(x, y, z, nx, nz, w, h, variant, seed, 0);
  const styleOf = new Map();

  function buildingStyle(key, wallStyle, rq) {
    let s = styleOf.get(key);
    if (s) return s;
    const brick = wallStyle <= 2.5;
    const r = h01(key + "|kit"), r2 = h01(key + "|kit2"), r3 = h01(key + "|kit3");
    const win = brick && r < 0.55 ? "winB" : "winA";
    let variant = 0;
    if (win === "winA" && brick && r2 < 0.4) variant |= VARIANT.BLUE;
    if ((((rq * 7) % 1) + 1) % 1 >= 0.8) variant |= VARIANT.DARK;      // = the shader's dark frames
    if (Math.abs(wallStyle - 2) < 0.5) variant |= VARIANT.YELLOW;
    s = { win, variant, door: r3 < 0.62 ? "doorA" : "doorB", soup: h01(key + "|soup") < 0.6, balcony: h01(key + "|bal") < 0.35,
      modillions: h01(key + "|mod") < 0.6, seed: h01(key + "|seed") };
    styleOf.set(key, s);
    return s;
  }

  /**
   * One wall face (called by analyseBuildings). f = { key (BU_ID), building, wallStyle, landmark, rnd (float, the
   * building hash), width, eaves (above base), partyH, street, shopU, shopW, base, top (abs), nx, nz, tx, tz, u0 (the
   * face's u = 0 along t), tris: [{ p: [[x, y, z] x 3] }] } -> { on: 0/1, rise }
   */
  function face(f) {
    const off = { on: 0, rise: 0 };
    if (!f.street || f.landmark || f.partyH >= 999 || f.wallStyle > 4.5 || f.building.height > MAX_H) return off;
    if (exclude.has(f.key) || (only && !only.has(f.key))) return off;
    if (f.width < 2.2 || f.eaves < 2.8) return off;
    const fr = Math.fround;
    const rnd = fr(f.rnd);
    const ops = faceOpenings({ width: fr(f.width), eaves: fr(f.eaves), partyH: fr(f.partyH), street: f.street, rnd, landmark: false, shop: fr(f.shopW), shopU: fr(f.shopU) });
    const S = buildingStyle(f.key, f.wallStyle, Math.floor(rnd * 4096 + 0.5) / 4096);
    const rise = S.win === "winB" ? WINDOW_RISE : 0;
    // face triangles in (u, h, depth along n)
    const T = f.tris.map(({ p }) => p.map((q) => [q[0] * f.tx + q[2] * f.tz - f.u0, q[1] - f.base, q[0] * f.nx + q[2] * f.nz]));
    const depthAt = (u, h) => { for (const [a, b, c] of T) { const d = inTri(u, h, a, b, c); if (d !== null) return d; } return null; };
    // every opening on the wall (its corners, the head of an arch, the middle); the plane depth at its middle
    const placed = [];
    for (const o of ops) {
      const top = o.h1 + (o.kind === "window" ? rise : 0);
      const pts = [[o.u0 + 0.01, o.h0 + 0.01], [o.u1 - 0.01, o.h0 + 0.01], [o.u0 + 0.01, top - 0.01], [o.u1 - 0.01, top - 0.01], [(o.u0 + o.u1) / 2, (o.h0 + top) / 2]];
      if (o.kind === "door") { pts[0][1] = 0.05; pts[1][1] = 0.05; }
      for (const [u, h] of pts) if (depthAt(u, h) === null) { stats.skipped++; return off; }
      placed.push({ o, d: depthAt((o.u0 + o.u1) / 2, (o.h0 + o.h1) / 2) });
    }
    stats.faces++;
    const W = (u, d) => [f.tx * (f.u0 + u) + f.nx * d, f.tz * (f.u0 + u) + f.nz * d];
    const seed = S.seed;
    const gaps = [];                                                  // plinth gaps along u
    if (f.shopW > 0.5) { const sw = f.shopW - 10 * Math.floor(f.shopW / 10); gaps.push([f.shopU - sw / 2 - 0.2, f.shopU + sw / 2 + 0.2]); }
    const nb = Math.max(...placed.map((q) => q.o.bay), 0) + 1;
    let balconyDone = !S.balcony;
    const floor1 = placed.filter((q) => q.o.floor === 1 && q.o.kind === "window");
    const balBay = floor1.length ? floor1.reduce((b, q) => (Math.abs(q.o.bay - (nb - 1) / 2) < Math.abs(b.o.bay - (nb - 1) / 2) ? q : b)).o.bay : -1;
    for (const { o, d } of placed) {
      stats.openings++;
      const uc = (o.u0 + o.u1) / 2, w = o.u1 - o.u0, h = o.h1 - o.h0;
      const [x, z] = W(uc, d);
      const y = f.base + o.h0;
      if (o.kind === "door") {
        put(S.door, x, y, z, f.nx, f.nz, w, h, S.variant, seed);
        gaps.push([uc - w / 2 - (S.door === "doorA" ? 0.24 : 0.17), uc + w / 2 + (S.door === "doorA" ? 0.24 : 0.17)]);
        // steps down to the pavement: the DTM 0.6 m in front of the door, 17 cm rises, at most 3
        if (opts.ground) {
          const g = opts.ground(x + f.nx * 0.6, z + f.nz * 0.6);
          const n = Math.max(0, Math.min(3, Math.round((f.base - g) / 0.17)));
          for (let k = 1; k <= n; k++) put("step", x + f.nx * 0.3 * k, f.base - 0.17 * (k - 1) - 0.06, z + f.nz * 0.3 * k, f.nx, f.nz, 1.5, 0.17, 0, seed);
        }
        continue;
      }
      widths.push(Math.round(w * 100) / 100);
      put(S.win, x, y, z, f.nx, f.nz, w, h, S.variant, seed);
      const bal = !balconyDone && o.floor === 1 && o.bay === balBay;
      if (bal) { put("balcony", x, y, z, f.nx, f.nz, w, h, 0, seed); balconyDone = true; }
      else put("sill", x, y, z, f.nx, f.nz, w, h, 0, seed);
      // window A's hood: frieze + cornice reach 0.45 m over the head; not into the eaves cornice (0.6 m tall)
      if (S.win === "winA" && f.eaves - o.h1 > 1.12) put("hood", x, y, z, f.nx, f.nz, w, h, S.variant, seed);
      if (o.floor === 0 && S.soup) {
        put("soup", x, f.base, z, f.nx, f.nz, 0.9, 0.55, 0, seed);
        gaps.push([uc - 0.46, uc + 0.46]);
      }
    }
    // horizontal edges of the face at its top (cornice) and at its foot (plinth): the box cornice's own test
    const seen = new Set();
    for (const { p } of f.tris) for (let e = 0; e < 3; e++) {
      const A = p[e], B = p[(e + 1) % 3];
      if (Math.abs(A[1] - B[1]) > 0.05) continue;
      const L = Math.hypot(B[0] - A[0], B[2] - A[2]);
      const k = [A[0], A[2], B[0], B[2]].map((v) => Math.round(v * 20)).sort().join() + "|" + Math.round(A[1] * 20);
      if (L < 0.6 || seen.has(k)) continue;
      seen.add(k);
      const atTop = Math.abs(A[1] - f.top) < 0.08, atFoot = Math.abs(A[1] - f.base) < 0.08;
      if (!atTop && !atFoot) continue;
      // along u
      let ua = A[0] * f.tx + A[2] * f.tz - f.u0, ub = B[0] * f.tx + B[2] * f.tz - f.u0;
      if (ua > ub) [ua, ub] = [ub, ua];
      const d = (A[0] + B[0]) / 2 * f.nx + (A[2] + B[2]) / 2 * f.nz;
      if (atTop && f.top - f.base > 4.5) {
        const [x, z] = W((ua + ub) / 2, d);
        put("cornice", x, A[1], z, f.nx, f.nz, ub - ua, 0.6, 0, seed);
        runs.push({ key: f.key, a: W(ua, d), b: W(ub, d), nx: f.nx, nz: f.nz, y: A[1], seed });
        if (S.modillions && ub - ua > 1.2) {
          const n = Math.max(2, Math.round((ub - ua - 0.5) / 0.55) + 1);
          for (let i = 0; i < n; i++) {
            const [mx, mz] = W(ua + 0.25 + (ub - ua - 0.5) * i / (n - 1), d);
            put("modillion", mx, A[1], mz, f.nx, f.nz, 0.1, 0.2, 0, seed);
          }
        }
      }
      if (atFoot) {
        // the plinth run minus the doors' surrounds, the soupiraux and a shopfront
        let segs = [[ua, ub]];
        for (const [g0, g1] of gaps) segs = segs.flatMap(([s0, s1]) => (g1 <= s0 || g0 >= s1 ? [[s0, s1]] : [[s0, g0], [g1, s1]].filter(([q0, q1]) => q1 - q0 > 0.15)));
        for (const [s0, s1] of segs) {
          const [x, z] = W((s0 + s1) / 2, d);
          put("plinth", x, A[1], z, f.nx, f.nz, s1 - s0, 0.6, 0, seed);
        }
      }
    }
    return { on: 1, rise };
  }

  /** outside corners where two cornice runs of one building meet (convex, 70-110 degrees) */
  function corners() {
    const byKey = new Map();
    for (const r of runs) { if (!byKey.has(r.key)) byKey.set(r.key, []); byKey.get(r.key).push(r); }
    for (const list of byKey.values()) for (let i = 0; i < list.length; i++) for (let j = 0; j < list.length; j++) {
      if (i === j) continue;
      const A = list[i], B = list[j];
      if (Math.abs(A.y - B.y) > 0.1) continue;
      const cosang = A.nx * B.nx + A.nz * B.nz;
      if (Math.abs(cosang) > 0.35) continue;
      for (const pa of [A.a, A.b]) for (const pb of [B.a, B.b]) {
        if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) > 0.12) continue;
        // convex: B's other end lies behind A's wall plane
        const ob = pb === B.a ? B.b : B.a, oa = pa === A.a ? A.b : A.a;
        if ((ob[0] - pa[0]) * A.nx + (ob[1] - pa[1]) * A.nz > -0.2) continue;
        // the corner piece's frame: z = A's normal, x = along A toward the corner (= up x n, a rotation about y)
        const ex = A.nz, ez = -A.nx, dir = (pa[0] - oa[0]) * ex + (pa[1] - oa[1]) * ez;
        if (dir <= 0) continue;                          // the other run of the pair takes it
        put("cornCorner", pa[0], A.y, pa[1], A.nx, A.nz, 1, 0.6, 0, A.seed);
      }
    }
  }

  function finish() {
    corners();
    const pieces = {};
    for (const [k, v] of Object.entries(out)) pieces[k] = new Float32Array(v);
    return { pieces, stride: STRIDE, faces: stats.faces, skipped: stats.skipped, openings: stats.openings, widths };
  }
  return { face, finish, stats };
}
