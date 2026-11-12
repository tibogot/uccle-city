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
// RUNS (cornice, plinth, string course; round 3): spare = the LEFT end's mitre, F[0] = the RIGHT end's (tan of half the turn
//   to the next run there: + outside corner, - inside, 0 straight on); the runs of a tile are joined in finish(): two run
//   ends of the same piece closer than JOIN m at the same height meet on their common corner point and mitre on the
//   bisector (kitMaterials.js sliceDelta shears the end rings), so no run end cap ever lies in the next wall's plane or
//   overlaps the next run (docs/CITY_MESH_AUDIT.md: the city's own box cornices flicker exactly there). A free end stops
//   2 mm short. The old cornice corner piece (cornCorner, 4 mm overlaps on both runs) is no longer placed.
import { faceOpenings } from "../interior/facadeWindows.js";

export const STRIDE = 14;
export const FRENCH_SILL = 0.06;               // a French window's opening starts this far over its storey floor
export const VARIANT = { BLUE: 1, DARK: 2, YELLOW: 4 };
/** pieces' reference sizes (tools/blender/facadeKit.py REF): the instance's w, h are relative to these */
export const WINDOW_RISE = 0.13;              // window B's segmental head above the painted opening (m)
const MAX_H = 16;                             // no kit on taller buildings (Uccle's flats)
const JOIN = 0.15;                            // m: run ends this close join (corners, adjoining houses)
const RUNS = new Set(["cornice", "plinth", "band"]);
export const BAND_Y = 3.4;                    // the string course's top: the first floor line (facadeWindows.js G)

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
  const stats = { faces: 0, skipped: 0, openings: 0, why: {} };
  const widths = [];
  // + the face the instance sits on (u0, width, base, rnd + 2 x door street + 4 x French window code): the kit glass recomputes the painted
  // window grid from them, so its rooms are the painted windows' rooms (facades.js paintedGlass)
  let F = [0, 0, 0, 0];
  const put = (piece, x, y, z, nx, nz, w, h, variant, seed) => (out[piece] ??= []).push(x, y, z, nx, nz, w, h, variant, seed, 0, F[0], F[1], F[2], F[3]);
  // a run from world point A to B (in either order) at height y on the wall (n): kept for the joins in finish()
  const allRuns = [];
  const putRun = (piece, A, B, y, nx, nz, variant, seed) => {
    const lx = nz, lz = -nx;                                            // the piece's local +x in the world
    const [L, R] = A[0] * lx + A[1] * lz <= B[0] * lx + B[1] * lz ? [A, B] : [B, A];
    allRuns.push({ piece, L: [...L], R: [...R], y, nx, nz, variant, seed, mL: 0, mR: 0, jL: false, jR: false });
  };
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
    // (round 3) the door by period / front: brick fronts mostly 1890-1914 (A, B, Art Nouveau), yellow brick and render
    // more Art Deco and 1960s
    const yellow = Math.abs(wallStyle - 2) < 0.5, render = !brick;
    const doors = render ? [["doorB", 0.28], ["doorDeco", 0.26], ["doorModern", 0.24], ["doorA", 0.12], ["doorNouveau", 0.1]]
      : yellow ? [["doorDeco", 0.34], ["doorA", 0.24], ["doorB", 0.18], ["doorModern", 0.14], ["doorNouveau", 0.1]]
      : [["doorA", 0.4], ["doorB", 0.2], ["doorNouveau", 0.16], ["doorDeco", 0.14], ["doorModern", 0.1]];
    let acc = 0, door = doors[0][0];
    for (const [d, p] of doors) { acc += p; if (r3 < acc) { door = d; break; } }
    const balcony = h01(key + "|bal") < 0.35;
    s = { win, variant, door, soup: h01(key + "|soup") < 0.6, balcony,
      bay: balcony && h01(key + "|bay") < 0.4,                         // a bay window (oriel) instead of the French window
      stained: win === "winA" && h01(key + "|stain") < 0.4,            // window C (leaded transom) on the ground floor
      shutters: render && h01(key + "|shut") < 0.35,                   // villas / rendered houses
      band: h01(key + "|band") < 0.5, dormer: h01(key + "|dorm") < 0.5,
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
    const off = { on: 0, rise: 0, doorless: 0, french: 0 };
    if (!f.street || f.landmark || f.partyH >= 999 || f.wallStyle > 4.5 || f.building.height > MAX_H) return off;
    if (exclude.has(f.key) || (only && !only.has(f.key))) return off;
    if (f.width < 2.2 || f.eaves < 2.8) return off;
    const fr = Math.fround;
    const rnd = fr(f.rnd);
    // one front door per house: on its widest street face; the others get a window in that bay (the kit walls paint
    // a window there too: aKit.z)
    const doorStreet = f.street && f.doorFace !== false ? 1 : 0;
    const ops = faceOpenings({ width: fr(f.width), eaves: fr(f.eaves), partyH: fr(f.partyH), street: doorStreet, rnd, landmark: false, shop: fr(f.shopW), shopU: fr(f.shopU) });
    const S = buildingStyle(f.key, f.wallStyle, Math.floor(rnd * 4096 + 0.5) / 4096);
    const rise = S.win === "winB" ? WINDOW_RISE : 0;
    // the French window: the first floor's middle window of a building with a balcony; its opening runs down to the
    // storey's floor (+ FRENCH_SILL)
    let frCode = 0;
    const nb0 = Math.max(...ops.map((o) => o.bay), 0) + 1, bw0 = (f.width - 1.1) / nb0;
    if (S.balcony) {
      const f1 = ops.filter((o) => o.floor === 1 && o.kind === "window");
      if (f1.length) {
        const o = f1.reduce((b, q) => (Math.abs(q.bay - (nb0 - 1) / 2) < Math.abs(b.bay - (nb0 - 1) / 2) ? q : b));
        // a bay window needs its width + 0.9 m within the bay and room for its roof under the eaves; else the French window
        if (S.bay && bw0 >= o.u1 - o.u0 + 1.0 && f.eaves - o.h1 > 1.0) o.kind = "bay";
        else {
          o.kind = "french"; o.h0 = 3.4 + FRENCH_SILL;               // facadeWindows.js G: storey 1 starts at 3.4 m
          frCode = o.bay + 1 + 16 * o.floor;
        }
      }
    }
    // face triangles in (u, h, depth along n)
    const T = f.tris.map(({ p }) => p.map((q) => [q[0] * f.tx + q[2] * f.tz - f.u0, q[1] - f.base, q[0] * f.nx + q[2] * f.nz]));
    const depthAt = (u, h) => { for (const [a, b, c] of T) { const d = inTri(u, h, a, b, c); if (d !== null) return d; } return null; };
    // every opening on the wall (its corners, the head of an arch, the middle); the plane depth at its middle
    const placed = [];
    for (const o of ops) {
      const top = o.h1 + (o.kind === "window" ? rise : 0) + (o.kind === "bay" ? 0.62 : 0);
      const pts = [[o.u0 + 0.01, o.h0 + 0.01], [o.u1 - 0.01, o.h0 + 0.01], [o.u0 + 0.01, top - 0.01], [o.u1 - 0.01, top - 0.01], [(o.u0 + o.u1) / 2, (o.h0 + top) / 2]];
      if (o.kind === "door") { pts[0][1] = 0.05; pts[1][1] = 0.05; }
      if (o.kind === "bay") { pts[0][0] -= 0.6; pts[2][0] -= 0.6; pts[1][0] += 0.6; pts[3][0] += 0.6; pts[0][1] -= 0.65; pts[1][1] -= 0.65; }   // the bay's whole wall footprint
      // an opening wholly OFF the face's triangles (a stepped wall, an annex, a gable above) is painted nowhere: ignore
      // it; one PARTLY on the face (the shader paints a part of it) keeps the whole face painted
      const onFace = pts.map(([u, h]) => depthAt(u, h) !== null);
      if (!onFace.some(Boolean)) { stats.offFace = (stats.offFace || 0) + 1; continue; }
      for (let i = 0; i < pts.length; i++) if (!onFace[i]) {
        stats.skipped++;
        const w = `${o.kind}${o.floor} pt${i}`; stats.why[w] = (stats.why[w] || 0) + 1;
        if (opts.debug && !stats.sample) stats.sample = { key: f.key, pt: pts[i], o, width: f.width, T: T.map((t) => t.map((q) => q.map((v) => +v.toFixed(2)))) };
        return off;
      }
      placed.push({ o, d: depthAt((o.u0 + o.u1) / 2, (o.h0 + o.h1) / 2) });
    }
    stats.faces++;
    F = [f.u0, fr(f.width), f.base, rnd + 2 * doorStreet + 4 * frCode];
    const W = (u, d) => [f.tx * (f.u0 + u) + f.nx * d, f.tz * (f.u0 + u) + f.nz * d];
    const seed = S.seed;
    const gaps = [];                                                  // plinth gaps along u
    if (f.shopW > 0.5) { const sw = f.shopW - 10 * Math.floor(f.shopW / 10); gaps.push([f.shopU - sw / 2 - 0.2, f.shopU + sw / 2 + 0.2]); }
    const nb = Math.max(...placed.map((q) => q.o.bay), 0) + 1;
    let french = 0;
    for (const { o, d } of placed) {
      stats.openings++;
      const uc = (o.u0 + o.u1) / 2, w = o.u1 - o.u0, h = o.h1 - o.h0;
      const [x, z] = W(uc, d);
      const y = f.base + o.h0;
      if (o.kind === "door") {
        put(S.door, x, y, z, f.nx, f.nz, w, h, S.variant, seed);
        const sur = { doorA: 0.24, doorNouveau: 0.29, doorDeco: 0.18, doorModern: 0.1 }[S.door] ?? 0.17;
        gaps.push([uc - w / 2 - sur, uc + w / 2 + sur]);
        // the house-number plate right of the door at 1.75 m (when the wall is there); the figures come from streetlife later
        const up = uc - (w / 2 + sur + 0.16);                            // u runs to local -x: "right" seen from the street = smaller u
        if (depthAt(up - 0.09, 1.7) !== null && depthAt(up + 0.09, 1.86) !== null) {
          const [px, pz] = W(up, depthAt(up, 1.78));
          put("numPlate", px, f.base + 1.72, pz, f.nx, f.nz, 0.16, 0.12, 0, seed);
        }
        // steps down to the pavement, 17 cm rises, at most 3: the DTM under EACH tread (sloping streets); a step whose
        // tread would be under the ground there is not placed (nor the ones after it); the blocks run 0.6 m down, so a
        // step never floats over a falling pavement
        if (opts.ground) {
          const g = opts.ground(x + f.nx * 0.6, z + f.nz * 0.6);
          const n = Math.max(0, Math.min(3, Math.round((f.base - g) / 0.17)));
          for (let k = 1; k <= n; k++) {
            const top = f.base - 0.17 * (k - 1) - 0.06;
            const gk = Math.max(opts.ground(x + f.nx * (0.3 * k + 0.15) - f.nz * 0.5, z + f.nz * (0.3 * k + 0.15) + f.nx * 0.5), opts.ground(x + f.nx * (0.3 * k + 0.15) + f.nz * 0.5, z + f.nz * (0.3 * k + 0.15) - f.nx * 0.5));
            if (top < gk + 0.04) { stats.stepsDropped = (stats.stepsDropped || 0) + n - k + 1; break; }
            put("step", x + f.nx * 0.3 * k, top, z + f.nz * 0.3 * k, f.nx, f.nz, 1.5, 0.17, 0, seed);
          }
        }
        continue;
      }
      widths.push(Math.round(w * 100) / 100);
      if (o.kind === "bay") {
        put("bay", x, y, z, f.nx, f.nz, w, h, 0, seed);
        continue;
      }
      if (o.kind === "french") {
        // the French window (white stone like window A, the building's frame colour) and its balcony or balconnet
        put("frenchWin", x, y, z, f.nx, f.nz, w, h, S.variant & VARIANT.DARK, seed);
        // (round 3) narrower than 1.1 m: the plain railing (the ornament panel would be squeezed by the 9-slice)
        put((h01(f.key + "|balk") < 0.5 ? "balcony" : "balconnet") + (w < 1.1 ? "P" : ""), x, y, z, f.nx, f.nz, w, h, 0, seed);
        french = o.bay + 1 + 16 * o.floor;
        if (f.eaves - o.h1 > 1.12) put("hood", x, y, z, f.nx, f.nz, w, h, S.variant & VARIANT.BLUE, seed);
        continue;
      }
      const win = S.stained && o.floor === 0 ? "winC" : S.win;
      put(win, x, y, z, f.nx, f.nz, w, h, S.variant, seed);
      put("sill", x, y, z, f.nx, f.nz, w, h, 0, seed);
      // shutters: both leaves (0.58 m beside the architrave) must lie on this face, clear of the neighbouring window's
      if (S.shutters && win !== "winB" && bw0 - w >= 2 * 0.8 && depthAt(o.u0 - 0.8, o.h0 + 0.2) !== null && depthAt(o.u1 + 0.8, o.h1 - 0.2) !== null)
        put("shutter", x, y, z, f.nx, f.nz, w, h, S.variant & VARIANT.DARK, seed);
      // window A's hood: frieze + cornice reach 0.45 m over the head; not into the eaves cornice (0.6 m tall)
      if (win !== "winB" && f.eaves - o.h1 > 1.12) put("hood", x, y, z, f.nx, f.nz, w, h, S.variant, seed);
      if (o.floor === 0 && S.soup) {
        put("soup", x, f.base, z, f.nx, f.nz, 0.9, 0.55, 0, seed);
        gaps.push([uc - 0.46, uc + 0.46]);
      }
    }
    // horizontal edges of the face at its top (cornice: the box cornice's own test) and at its foot (plinth: UrbIS
    // walls run ~1 m under the base, the ground line the shader paints the plinth from; the band sits at the base)
    let foot = Infinity;
    for (const { p } of f.tris) for (const q of p) foot = Math.min(foot, q[1]);
    const seen = new Set();
    for (const { p } of f.tris) for (let e = 0; e < 3; e++) {
      const A = p[e], B = p[(e + 1) % 3];
      if (Math.abs(A[1] - B[1]) > 0.05) continue;
      const L = Math.hypot(B[0] - A[0], B[2] - A[2]);
      const k = [A[0], A[2], B[0], B[2]].map((v) => Math.round(v * 20)).sort().join() + "|" + Math.round(A[1] * 20);
      if (L < 0.6 || seen.has(k)) continue;
      seen.add(k);
      const atTop = Math.abs(A[1] - f.top) < 0.08, atFoot = Math.abs(A[1] - foot) < 0.08 && foot <= f.base + 0.05;
      if (!atTop && !atFoot) continue;
      // along u
      let ua = A[0] * f.tx + A[2] * f.tz - f.u0, ub = B[0] * f.tx + B[2] * f.tz - f.u0;
      if (ua > ub) [ua, ub] = [ub, ua];
      const d = (A[0] + B[0]) / 2 * f.nx + (A[2] + B[2]) / 2 * f.nz;
      if (atTop && f.top - f.base > 4.5) {
        putRun("cornice", W(ua, d), W(ub, d), A[1], f.nx, f.nz, 0, seed);
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
        for (const [s0, s1] of segs) putRun("plinth", W(s0, d), W(s1, d), f.base, f.nx, f.nz, 0, seed);
      }
    }
    // THE STRING COURSE at the first floor line (y = base + BAND_Y), where the face's triangles carry it, minus the French
    // windows (their balcony slabs sit there) and the bays
    if (S.band && f.eaves > BAND_Y + 2.4) {
      const hb = BAND_Y - 0.07;
      let segs = [];
      for (const [a, b, c] of T) {        // the face triangles cut by the line h = hb, in u
        const xs = [];
        for (const [p, q] of [[a, b], [b, c], [c, a]]) if ((p[1] - hb) * (q[1] - hb) < 0) xs.push(p[0] + ((hb - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
        if (xs.length === 2) segs.push([Math.min(...xs), Math.max(...xs)]);
      }
      segs.sort((p, q) => p[0] - q[0]);
      const merged = [];
      for (const sg of segs) { const l = merged[merged.length - 1]; if (l && sg[0] <= l[1] + 0.01) l[1] = Math.max(l[1], sg[1]); else merged.push([...sg]); }
      let parts = merged.filter(([p, q]) => q - p > 0.6);
      for (const { o } of placed) if (o.kind === "french" || o.kind === "bay") {
        const g0 = o.u0 - (o.kind === "bay" ? 0.6 : 0.5), g1 = o.u1 + (o.kind === "bay" ? 0.6 : 0.5);
        parts = parts.flatMap(([s0, s1]) => (g1 <= s0 || g0 >= s1 ? [[s0, s1]] : [[s0, g0], [g1, s1]].filter(([q0, q1]) => q1 - q0 > 0.3)));
      }
      for (const [s0, s1] of parts) {
        const dd = depthAt((s0 + s1) / 2, hb);
        if (dd !== null) putRun("band", W(s0, dd), W(s1, dd), f.base + BAND_Y, f.nx, f.nz, 0, seed);
      }
    }
    // A DORMER over the middle bay, on a roof that rises from the eaves (sampled behind the façade at 0.6 and 1.6 m: a
    // pitch of 30 deg or more), the eaves cornice in front
    if (S.dormer && f.roofAt && f.width >= 4.5 && f.top - f.base > 4.5) {
      const um = f.width / 2, dm = depthAt(um, f.top - f.base - 0.3);
      if (dm !== null) {
        const [x, z] = W(um, dm);
        const r1 = f.roofAt(x - f.nx * 0.6, z - f.nz * 0.6), r2 = f.roofAt(x - f.nx * 1.6, z - f.nz * 1.6);
        if (r1 > f.top + 0.25 && r2 - r1 > 0.58 && r2 > f.top + 1.0) put("dormer", x, f.top, z, f.nx, f.nz, 1.1, 1.45, 0, seed);
      }
    }
    return { on: 1, rise, doorless: f.street && !doorStreet ? 1 : 0, french };
  }

  /** THE RUN JOINS: every run end meets the nearest end of the same piece (any building: adjoining houses' cornices
   *  continue) within JOIN m at the same height; both snap to their common corner (the intersection of the two wall
   *  lines, or the midpoint when they are parallel) and take the mitre of the bisector plane. Then the runs are put. */
  function joinRuns() {
    const ends = [];
    allRuns.forEach((r, i) => { ends.push({ r, i, side: "L" }); ends.push({ r, i, side: "R" }); });
    const grid = new Map(), cell = (x, z) => `${Math.floor(x / JOIN)},${Math.floor(z / JOIN)}`;
    for (const e of ends) { const p = e.r[e.side]; const k = cell(p[0], p[1]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(e); }
    const dirOut = (r, side) => { const lx = r.nz, lz = -r.nx; return side === "R" ? [lx, lz] : [-lx, -lz]; };
    let joins = 0, free = 0;
    for (const e of ends) {
      if (e.r["j" + e.side]) continue;
      const p = e.r[e.side];
      let best = null, bd = JOIN;
      const cx = Math.floor(p[0] / JOIN), cz = Math.floor(p[1] / JOIN);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const o of grid.get(`${cx + a},${cz + b}`) || []) {
        if (o.i === e.i || o.r.piece !== e.r.piece || o.r["j" + o.side] || Math.abs(o.r.y - e.r.y) > 0.1) continue;
        if (o.r.nx * e.r.nx + o.r.nz * e.r.nz < -0.5) continue;                 // back to back walls: not one run
        const q = o.r[o.side], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (d < bd) { bd = d; best = o; }
      }
      if (!best) continue;
      const A = e.r, B = best.r, dA = dirOut(A, e.side), dB = dirOut(B, best.side);
      // the corner: the two wall lines' intersection (or the midpoint)
      const pa = A[e.side], pb = B[best.side];
      const den = dA[0] * dB[1] - dA[1] * dB[0];
      let C = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
      if (Math.abs(den) > 0.05) {
        const t = ((pb[0] - pa[0]) * dB[1] - (pb[1] - pa[1]) * dB[0]) / den;
        const Ci = [pa[0] + dA[0] * t, pa[1] + dA[1] * t];
        if (Math.hypot(Ci[0] - C[0], Ci[1] - C[1]) < JOIN) C = Ci;
      }
      // the mitre: the bisector plane's normal Nb = dA - dB; at depth z an end vertex moves s = z m along its own outward
      // direction, m = -(nA . Nb) / (dA . Nb) (+1 at a 90 deg outside corner, -1 inside, 0 straight on)
      const Nb = [dA[0] - dB[0], dA[1] - dB[1]], nl = Math.hypot(...Nb) || 1;
      Nb[0] /= nl; Nb[1] /= nl;
      const mOf = (r, d) => { const den2 = d[0] * Nb[0] + d[1] * Nb[1]; return Math.abs(den2) < 0.2 ? 0 : -(r.nx * Nb[0] + r.nz * Nb[1]) / den2; };
      const mA = mOf(A, dA), mB = mOf(B, dB);
      if (Math.abs(mA) > 2.5 || Math.abs(mB) > 2.5) continue;               // a hairpin: leave both free
      A[e.side] = [...C]; B[best.side] = [...C];
      A["m" + e.side] = mA; B["m" + best.side] = mB;
      A["j" + e.side] = true; B["j" + best.side] = true;
      joins++;
    }
    for (const r of allRuns) {
      const lx = r.nz, lz = -r.nx;
      for (const side of ["L", "R"]) if (!r["j" + side]) { const k = side === "L" ? 0.002 : -0.002; r[side][0] += lx * k; r[side][1] += lz * k; free++; }
      // the run's centre and length from its (snapped) ends, projected on its own axis
      const len = (r.R[0] - r.L[0]) * lx + (r.R[1] - r.L[1]) * lz;
      if (len < 0.3) continue;
      const cx = (r.L[0] + r.R[0]) / 2, cz = (r.L[1] + r.R[1]) / 2;
      (out[r.piece] ??= []).push(cx, r.y, cz, r.nx, r.nz, len, 0.6, r.variant, r.seed, r.mL, r.mR, 0, 0, 0);
      if (r.piece === "cornice") runs.push({ key: "", a: r.L, b: r.R, nx: r.nx, nz: r.nz, y: r.y, seed: r.seed });
    }
    stats.runJoins = joins; stats.runFree = free;
  }

  /** outside corners where two cornice runs of one building meet (convex, 70-110 degrees): round 2's corner piece, no
   *  longer used (the runs mitre themselves: joinRuns) */
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
    joinRuns();
    const pieces = {};
    for (const [k, v] of Object.entries(out)) pieces[k] = new Float32Array(v);
    return { pieces, stride: STRIDE, faces: stats.faces, skipped: stats.skipped, openings: stats.openings, widths, runJoins: stats.runJoins, runFree: stats.runFree };
  }
  return { face, finish, stats };
}
