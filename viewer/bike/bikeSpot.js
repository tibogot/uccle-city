// THE BMX SPOT (bike lab 2, 2026-11-28, owner: "more than a lab, like a real bike test that looks good already ... many
// obstacles close to each other"). A 90s Brussels waste-ground BMX spot, pure JS (no three): the height the bike rides,
// its surfaces, the ground's paint weights (asphalt / concrete / dirt / gravel; grass = the rest), the SOLIDS (wooden
// ramps, concrete pieces: side profiles extruded across their width, the same profile the lab draws, so the physics
// and the picture are one surface), the colliders, the edge layer (grinds) and the spots. debug/bikeSpot.js draws it
// (viewer/bike/bikeSpotMeshes.js builds the meshes); tools/bike/spotTest.mjs rides it (gate row `bikespot`).
//
// Layout (x east, z forward from the spawn; every line a few seconds from the next):
//   plaza   (asphalt, x -13..22, z -22..17; a concrete slab in front of the quarter pipe)
//           x 0     the funbox (25 deg, 0.6 m, a rail on top) -> the quarter pipe (1.5 m, 75 deg) at z 6
//           x -7    the ledge (0.45 m, 10 m long) -> the manual pad (15 cm)
//           x 8.5   the stair block: a 12.5 % ramp up, a platform, 5 stairs down, a handrail
//           x 13.5  a wooden kicker (0.8 m) over a 1.8 m gap to its landing
//           x 18.5  a small wooden kicker (0.45 m) to its landing
//   west    the dirt pump-track loop (rollers + two berms), a dirt table jump, a whoops line
//   east    a packed gravel drift pad with cones
//   north   a grassy hill (1.5 m, ~20 %): the slope; a dirt path up it
//   round   a graffiti wall, a fence, a bench, bins, trees, Brussels terraces on the hills (the horizon never ends)
import { SURF, groundQuery } from "./bikePhysics.js";
import { EDGE, gardenEdges, stairEdges, handrailEdges, buildEdgeLayer, withStairRamps, benchEdges, benchPieces, BENCH } from "./bikeEdges.js";
import { gardenPieces } from "../gardens/gardenClear.js";

const D = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hyp = (a, b) => Math.sqrt(a * a + b * b);
/** a quarter pipe's height s m from its foot (radius R, up to the top angle) */
const qpH = (s, R, top) => { const smax = R * Math.sin(top); if (s <= 0) return 0; if (s >= smax) return R * (1 - Math.cos(top)); return R - Math.sqrt(R * R - s * s); };

/** a solid's TOE plate (m): the riding surface starts 2 cm over the ground (a steel toe plate) - never coplanar with it */
export const TOE = 0.02;
/** a solid's bottom: 8 cm into the ground (welded: no gap, no floating edge) */
export const SOLID_BASE = -0.08;

// ---------------------------------------------------------------- the solids (side profiles along z)
// { name, mat: "wood" | "concrete", xc, w, z0, dir (+1: s grows with z), prof: [[s, y], ...] (the top, s from 0 to L) }
const SOLIDS = [];
const arc = (fn, s0, s1, step = 0.05) => { const n = Math.max(1, Math.ceil((s1 - s0) / step)), out = []; for (let k = 0; k <= n; k++) { const s = s0 + (s1 - s0) * k / n; out.push([s, fn(s)]); } return out; };
const solid = (name, mat, xc, w, z0, dir, prof, opt = {}) => {
  const L = prof.at(-1)[0];
  const z1 = z0 + dir * L;
  const S = { name, mat, xc, w, z0, dir, prof, L, x0: xc - w / 2, x1: xc + w / 2, zmin: Math.min(z0, z1), zmax: Math.max(z0, z1), ...opt };
  SOLIDS.push(S);
  return S;
};
/** a solid's top at s (the profile, linear between its points: what the mesh draws) */
export function profAt(S, s) {
  const P = S.prof;
  if (s <= P[0][0]) return P[0][1];
  let lo = 0, hi = P.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m][0] <= s) lo = m; else hi = m; }
  const a = P[lo], b = P[hi], t = b[0] > a[0] ? (s - a[0]) / (b[0] - a[0]) : 1;
  return a[1] + (b[1] - a[1]) * t;
}

export const SPOT = {
  // (round 2, owner: "obstacles closer": the plaza fits its obstacles, every line a few seconds from the next)
  plaza: { x0: -10, x1: 14, z0: -18, z1: 12, r: 2.5 },
  slab: { x0: -5, x1: 5, z0: -1.5, z1: 5.5 },
  funbox: { xc: 0, w: 3.2, z0: -8, h: 0.6, ramp: 25 * D, top: 3.0, rail: 0.3 },
  qp: { xc: 0, w: 8, foot: 1, R: 2.1, top: 80 * D, deck: 1.5 },
  ledge: { x: -6.5, z0: -10, z1: 0, h: 0.37 },
  pad: { xc: -6.5, w: 3, z0: 2.5, len: 6, h: 0.15 },
  stairs: { xc: 7, w: 4, z0: -13, h: 0.75, grade: 0.125, plat: 2.5, n: 5, rise: 0.15, run: 0.32 },
  kickers: [
    { name: "kicker", xc: 7, z0: 0, h: 0.80, lip: 34, gap: 1.8, land: 0.65, kw: 1.6, lw: 2.4, v: 7.0 },
    { name: "small kicker", xc: 12, z0: -8, h: 0.45, lip: 30, gap: 1.0, land: 0.38, kw: 1.6, lw: 2.4, v: 6.0 },
  ],
  // the dirt line: the pump track -> north up the whoops -> round the berm -> south over the table -> back
  pump: { ax: -29, bx: -21, z: -2, R: 6, w: 3.2, amp: 0.30, lambda: 4.8, berm: 1.6 },
  whoops: { xc: -24, z0: 9, z1: 26, lambda: 2.4, amp: 0.11 },
  berm: { x: -20, z: 27.5, R: 4, w: 3.2, h: 1.3 },
  table: { xc: -16, w: 3.4, z0: 25, dir: -1, lip: 30 * D, top: 1.0, down: 3.5, h: 0.5 },
  hill: { x: 2, z: 25, rx: 14, rz: 9, flat: 0.25, h: 1.5 },
  drift: { x: 24, z: -4, r: 7 },
  wall: { x0: -9, x1: 7, z: -20.5, t: 0.3, h: 2.3 },
  bench: { x: -8.5, z: 10.6, yaw: Math.PI },
  // the drawn ground: a fine grid over the riding area (whole multiples of the far grid's 4 m), the far terrain round it
  fine: { x0: -48, x1: 44, z0: -28, z1: 56, res: 0.25 },
  far: { x0: -320, x1: 320, z0: -320, z1: 320, res: 4 },
};
const P = SPOT;

// the funbox (25 deg up, a 3 m table, down)
{
  const F = P.funbox, rl = F.h / Math.tan(F.ramp);
  F.rl = rl; F.L = 2 * rl + F.top; F.zt0 = F.z0 + rl; F.zt1 = F.zt0 + F.top; F.z1 = F.z0 + F.L;
  solid("funbox", "wood", F.xc, F.w, F.z0, 1, [[0, TOE], [rl, F.h], [rl + F.top, F.h], [F.L, TOE]]);
}
// the quarter pipe (concrete: toe plate, the transition, the deck; a coping pipe at the lip)
{
  const Q = P.qp; Q.h = qpH(99, Q.R, Q.top); Q.smax = Q.R * Math.sin(Q.top); Q.L = Q.smax + Q.deck; Q.lipZ = Q.foot + Q.smax; Q.z1 = Q.foot + Q.L;
  solid("quarter pipe", "concrete", Q.xc, Q.w, Q.foot, 1, [...arc((s) => qpH(s, Q.R, Q.top) + TOE, 0, Q.smax, 0.04), [Q.L, Q.h + TOE]], { smooth: true });
}
// the manual pad (15 cm, concrete)
{ const M = P.pad; solid("manual pad", "concrete", M.xc, M.w, M.z0, 1, [[0, M.h], [M.len, M.h]]); M.z1 = M.z0 + M.len; }
// the stair block: a ramp up, the platform, 5 stairs down (the risers real faces; the wheels ride a ramp over them:
// the edge layer's stair line, withStairRamps)
{
  const S = P.stairs, up = S.h / S.grade;
  S.zp = S.z0 + up; S.zs = S.zp + S.plat; S.z1 = S.zs + S.n * S.run;
  // (each riser a true vertical: two points at the same s; profAt takes the lower tread past it. The last riser comes
  // down to the toe plate's height, then the block's end)
  const tp = [[0, TOE], [up, S.h]];
  for (let k = 0; k < S.n; k++) { const s0 = up + S.plat + k * S.run, y0 = S.h - S.rise * k; tp.push([s0, y0], [s0, Math.max(TOE, y0 - S.rise)]); }
  tp.push([S.z1 - S.z0 + 0.25, TOE]);
  solid("stair block", "concrete", S.xc, S.w, S.z0, 1, tp, { stairs: true });
}
// the wooden kickers and their landings (a gap between: the kicker's back and the landing's front are faces)
for (const k of P.kickers) {
  const lip = k.lip * D; k.R = k.h / (1 - Math.cos(lip)); k.len = k.R * Math.sin(lip);
  k.zl = k.z0 + k.len + k.gap; k.deck = 0.8; k.downLen = Math.max(3.0, k.land / Math.tan(22 * D)); k.z1 = k.zl + k.deck + k.downLen;
  solid(k.name, "wood", k.xc, k.kw, k.z0, 1, arc((s) => (s <= 0 ? 0 : k.R - Math.sqrt(k.R * k.R - s * s)) + TOE, 0, k.len, 0.04), { smooth: true, kicker: k });
  solid(`${k.name} landing`, "wood", k.xc, k.lw, k.zl, 1, [[0, k.land], [k.deck, k.land], [k.deck + k.downLen, TOE]]);
}
export { SOLIDS };

// ---------------------------------------------------------------- the terrain (the ground the solids stand on)
/** the pump track: a stadium (bikePark.js's, the one parkTest laps): rollers on the straights, berms round the ends */
function stadium(T, x, z) {
  const t = clamp((x - T.ax) / (T.bx - T.ax), 0, 1), px = T.ax + (T.bx - T.ax) * t;
  const dx = x - px, dz = z - T.z, d = hyp(dx, dz), u = d - T.R;
  const ang = t <= 0 || t >= 1 ? Math.atan2(Math.abs(dx), Math.abs(dz)) : 0, bw = sstep(0, 35 * D, ang);
  const hw = T.w / 2;
  const surf = (uu) => {
    const a = clamp((uu + hw) / T.w, 0, 1);
    const roll = T.amp * (1 - Math.cos(2 * Math.PI * (x - T.ax) / T.lambda)) * (1 - bw) * sstep(T.ax - 1, T.ax + 1.2, x) * (1 - sstep(T.bx - 1.2, T.bx + 1, x));
    return 0.12 + T.berm * a * a * bw + roll;
  };
  if (u >= -hw && u <= hw) return surf(u);
  if (u > hw) return surf(hw) * (1 - sstep(hw, hw + 2.0, u));
  return surf(-hw) * (1 - sstep(-hw, -hw - 1.5, u));
}
const PT = P.pump, PT_M = PT.R + PT.w / 2 + 2.2;
const TB = P.table;
// (round 2: the take-off a concave arc to a 30 deg lip, as a real dirt table's: it throws the bike, a convex hump only rolled)
TB.R = TB.h / (1 - Math.cos(TB.lip)); TB.up = TB.R * Math.sin(TB.lip);
TB.L = TB.up + TB.top + TB.down; TB.z1 = TB.z0 + TB.dir * TB.L; TB.zmin = Math.min(TB.z0, TB.z1); TB.zmax = Math.max(TB.z0, TB.z1);
function tableH(x, z) {
  const ax = Math.abs(x - TB.xc), s = (z - TB.z0) * TB.dir;
  if (s < -1.5 || s > TB.L + 1.5 || ax > TB.w / 2 + 2) return 0;
  // the shoulders fall off the table's sides over 2 m (a dirt jump is a heap, never a wall)
  const side = 1 - sstep(TB.w / 2, TB.w / 2 + 2, ax);
  let h;
  if (s < 0) h = 0;
  else if (s < TB.up) h = TB.R - Math.sqrt(TB.R * TB.R - s * s);
  else if (s < TB.up + TB.top) h = TB.h;
  else if (s < TB.L) h = TB.h * (1 - sstep(0, 1, (s - TB.up - TB.top) / TB.down));
  else h = 0;
  return h * side;
}
/** the dirt berm: a half ring (the north half) banked to its outer edge, joining the whoops (west leg) to the table (east) */
const BM = P.berm;
function bermH(x, z) {
  const dx = x - BM.x, dz = z - BM.z;
  if (dz < -1 || Math.abs(dx) > BM.R + BM.w / 2 + 2.2 || dz > BM.R + BM.w / 2 + 2.2) return 0;
  const d = hyp(dx, dz), u = d - BM.R, hw = BM.w / 2;
  const a = (uu) => { const t = clamp((uu + hw) / BM.w, 0, 1); return BM.h * t * t; };
  let h;
  if (u >= -hw && u <= hw) h = a(u);
  else if (u > hw) h = a(hw) * (1 - sstep(hw, hw + 2.0, u));
  else h = 0;
  return h * sstep(-0.5, 1.5, dz);            // (the banking comes in round the turn: the legs run flat into it)
}
const WH = P.whoops;
function whoopsH(x, z) {
  if (Math.abs(x - WH.xc) > 2.6 || z < WH.z0 || z > WH.z1) return 0;
  const e = sstep(WH.xc - 2.5, WH.xc - 1.3, x) * (1 - sstep(WH.xc + 1.3, WH.xc + 2.5, x)) * sstep(WH.z0, WH.z0 + 1, z) * (1 - sstep(WH.z1 - 1, WH.z1, z));
  return WH.amp * (1 - Math.cos(2 * Math.PI * (z - WH.z0) / WH.lambda)) * e;
}
const HL = P.hill;
function hillH(x, z) {
  const r = hyp((x - HL.x) / HL.rx, (z - HL.z) / HL.rz);
  if (r >= 1) return 0;
  const u = clamp((r - HL.flat) / (1 - HL.flat), 0, 1);
  return HL.h * 0.5 * (1 + Math.cos(Math.PI * u));
}
/** the far terrain: flat round the riding area, rolling hills from ~60 m (a Kauwberg-like bowl: it never ends at an edge) */
const FAR_C = { x: -2, z: 14 };
export function farH(x, z) {
  const r = hyp(x - FAR_C.x, z - FAR_C.z);
  if (r < 66) return 0;
  const a = sstep(66, 140, r), b = sstep(150, 300, r);
  const roll = 7 + 4 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.4) + 2.5 * Math.sin(x * 0.047 + z * 0.031) + 1.2 * Math.sin(z * 0.09 + x * 0.013);
  return a * roll + b * 16;
}
/** the terrain alone (no solids): the far hills, the dirt features, the hill */
export function terrainH(x, z) {
  let h = farH(x, z);
  if (x > PT.ax - PT_M && x < PT.bx + PT_M && z > PT.z - PT_M && z < PT.z + PT_M) h += stadium(PT, x, z);
  h += tableH(x, z) + whoopsH(x, z) + bermH(x, z) + hillH(x, z);
  return h;
}
/** the solid under (x, z) or null */
export function solidAt(x, z) {
  for (let i = 0; i < SOLIDS.length; i++) {
    const S = SOLIDS[i];
    if (x >= S.x0 && x <= S.x1 && z >= S.zmin && z <= S.zmax) return S;
  }
  return null;
}
/** THE height the bike rides (and the drawn surfaces: the ground mesh and the solids' tops) */
export function spotHeight(x, z) {
  for (let i = 0; i < SOLIDS.length; i++) {
    const S = SOLIDS[i];
    if (x >= S.x0 && x <= S.x1 && z >= S.zmin && z <= S.zmax) return profAt(S, (z - S.z0) * S.dir);
  }
  return terrainH(x, z);
}

// ---------------------------------------------------------------- the ground's paint (soft weights: no saw-tooth edges)
/** a rounded rectangle's signed distance (negative inside) */
const sdRect = (x, z, x0, x1, z0, z1, r = 0) => {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hx = (x1 - x0) / 2 - r, hz = (z1 - z0) / 2 - r;
  const qx = Math.abs(x - cx) - hx, qz = Math.abs(z - cz) - hz;
  return hyp(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
};
const sdSeg = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); return hyp(x - ax - dx * t, z - az - dz * t); };
/** low-frequency value noise for the edges (deterministic) */
const vh = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, z) {
  const i = Math.floor(x), j = Math.floor(z), u = x - i, v = z - j, uu = u * u * (3 - 2 * u), vv = v * v * (3 - 2 * v);
  const a = vh(i, j), b = vh(i + 1, j), c = vh(i, j + 1), d = vh(i + 1, j + 1);
  return a + (b - a) * uu + (c - a) * vv + (a - b - c + d) * uu * vv;
}
const ragged = (x, z, amp = 0.9) => (vnoise(x * 0.35, z * 0.35) - 0.5) * amp * 2 + (vnoise(x * 1.3 + 7, z * 1.3) - 0.5) * amp * 0.6;
/** -> [asphalt, concrete, dirt, gravel] weights 0..1 (grass = 1 - their sum); smooth over ~0.5 m */
export function spotPaint(x, z, out = [0, 0, 0, 0]) {
  const Pz = P.plaza, Sl = P.slab;
  const dPlaza = sdRect(x, z, Pz.x0, Pz.x1, Pz.z0, Pz.z1, Pz.r) + ragged(x, z, 0.7);
  let asph = 1 - sstep(-0.3, 0.3, dPlaza);
  const dSlab = sdRect(x, z, Sl.x0, Sl.x1, Sl.z0, Sl.z1, 0.05);
  let conc = 1 - sstep(-0.03, 0.03, dSlab);
  // the dirt: the pump track's band + its shoulders, the table, the whoops, worn paths
  let dirt = 0;
  if (x > PT.ax - PT_M - 2 && x < PT.bx + PT_M + 2 && z > PT.z - PT_M - 2 && z < PT.z + PT_M + 2) {
    const t = clamp((x - PT.ax) / (PT.bx - PT.ax), 0, 1), d = hyp(x - (PT.ax + (PT.bx - PT.ax) * t), z - PT.z), u = Math.abs(d - PT.R);
    dirt = Math.max(dirt, 1 - sstep(PT.w / 2 + 1.4, PT.w / 2 + 2.6, u + ragged(x, z, 0.5)));
  }
  dirt = Math.max(dirt, 1 - sstep(-0.4, 0.6, sdRect(x, z, TB.xc - TB.w / 2 - 1.6, TB.xc + TB.w / 2 + 1.6, TB.zmin - 1.5, TB.zmax + 1.5, 1.5) + ragged(x, z, 0.6)));
  dirt = Math.max(dirt, 1 - sstep(-0.4, 0.6, sdRect(x, z, WH.xc - 2.2, WH.xc + 2.2, WH.z0 - 1.5, WH.z1 + 1.5, 1.2) + ragged(x, z, 0.6)));
  { const d = hyp(x - BM.x, z - BM.z) - BM.R; if (z > BM.z - 2) dirt = Math.max(dirt, (1 - sstep(BM.w / 2 + 1.2, BM.w / 2 + 2.4, Math.abs(d) + ragged(x, z, 0.5))) * sstep(BM.z - 2, BM.z, z)); }
  // worn desire paths (1.2 m wide): plaza -> the whoops, the table <-> the whoops' end, plaza -> up the hill
  const path = Math.min(sdSeg(x, z, -10, 8, -14, 12), sdSeg(x, z, -16, 16, -17, 10), sdSeg(x, z, 2, 11, 2, 21), sdSeg(x, z, 14, -2, 17, -3));
  dirt = Math.max(dirt, 1 - sstep(0.45, 1.0, path + ragged(x, z, 0.25)));
  // the gravel drift pad
  const dDrift = hyp(x - P.drift.x, z - P.drift.z) - P.drift.r + ragged(x, z, 0.8);
  let grav = 1 - sstep(-0.4, 0.4, dDrift);
  // the gravel apron between the plaza and the pad
  grav = Math.max(grav, (1 - sstep(-0.3, 0.5, sdRect(x, z, 13, 18, -9, 1, 1.5) + ragged(x, z, 0.6))) * (1 - asph));
  conc *= 1;
  // (the slab is painted over the asphalt in the shader: the asphalt stays whole under its edge, no grass seam)
  dirt *= (1 - asph) * (1 - conc);
  grav *= (1 - asph) * (1 - conc) * (1 - dirt);
  out[0] = asph; out[1] = conc; out[2] = dirt; out[3] = grav;
  return out;
}
const PAINT = [0, 0, 0, 0];
/** the surface the bike feels (bikePhysics SURF) */
export function spotSurface(x, z) {
  const S = solidAt(x, z);
  if (S) return SURF.asphalt;              // (wood / concrete ride as asphalt: grip 0.95)
  const w = spotPaint(x, z, PAINT);
  if (w[0] + w[1] >= 0.5) return SURF.asphalt;
  if (w[2] + w[3] >= 0.5) return SURF.dirt;
  return SURF.grass;
}

// ---------------------------------------------------------------- furniture, the ledge, the walls (colliders + edges)
export const SPOT_FURNITURE = { benches: [{ id: "spot:bench", piece: "bench_park", x: P.bench.x, y: 0, z: P.bench.z, yaw: P.bench.yaw }] };
export const SPOT_GARDENS = (() => {
  const L = P.ledge;
  return { styles: [{ kind: "wall", cap: 1, rail: -1, wallH: L.h, railH: 0 }], segs: [[L.x, 0, L.z0, L.x, 0, L.z1, 0, L.h]], pillars: [], gates: [], hedges: [] };
})();
export const LEDGE_TOP = P.ledge.h + 0.08;     // (gardenPieces / gardenEdges: the wall + its 8 cm coping)
/** the stair flight as an OSM steps line, bottom to top (the flight goes DOWN along +z) */
export const SPOT_FEATURES = { lines: [{ id: "spot:steps", kind: "steps", line: [[P.stairs.xc, P.stairs.z1], [P.stairs.xc, P.stairs.zs]], tags: { highway: "steps", width: String(P.stairs.w - 0.4) } }] };
/** the funbox rail (a steel tube 0.3 m over the table) */
export const FUNBOX_RAIL = { x: P.funbox.xc, z0: P.funbox.zt0 + 0.3, z1: P.funbox.zt1 - 0.3, y: P.funbox.h + P.funbox.rail };
/** the cones (a slalom on the drift pad, two at the plaza) and the bins: [x, z] */
export const CONES = [[29, -9.5], [29.6, -6.5], [29, -3.5], [29.6, -0.5], [-2.5, -15.5], [2.5, -15.5]];        // (a slalom on the pad's east side: the west is the drift's)
export const BINS = [[-6.6, 11.2], [9.5, -17], [13, 10]];
/** the trees that stand in the riding area (trunk colliders); the rest are round it, far from the lines */
export const NEAR_TREES = [[-8, 16], [12, 15], [-34, 14], [-40, -16], [-14, -16], [20, -16], [33, 8], [16, 24], [-30, 32], [-12, 32], [8, -24], [-24, -18]];

export const BOUNDS = { x0: -120, x1: 120, z0: -100, z1: 140 };
export function spotEdgeLines() {
  const stairs = stairEdges(SPOT_FEATURES, spotHeight);
  return [...benchEdges(SPOT_FURNITURE), ...gardenEdges(SPOT_GARDENS), ...stairs, ...handrailEdges(stairs, { side: 1 }),
    { type: EDGE.rail, pts: [[FUNBOX_RAIL.x, FUNBOX_RAIL.y, FUNBOX_RAIL.z0], [FUNBOX_RAIL.x, FUNBOX_RAIL.y, FUNBOX_RAIL.z1]], height: P.funbox.rail, width: 0.04, grind: true, mat: "steel" }];
}
export const spotEdges = buildEdgeLayer(spotEdgeLines(), BOUNDS);
export const spotHeightRamped = withStairRamps(spotHeight, spotEdges);
/** the ground query the bike rides (the stairs as a ramp for the wheels) */
export const spotGround = groundQuery(spotHeightRamped, spotSurface, 0.03);
/** the handrail as drawn: the edge layer's rail line beside the flight */
export function handrailLine() {
  const stairs = stairEdges(SPOT_FEATURES, spotHeight);
  return handrailEdges(stairs, { side: 1 })[0].pts;
}

/** the colliders (plain lists for viewer/drive/colliders.js buildColliders) */
export function spotColliders(KIND) {
  const box = (x0, x1, z0, z1, kind, top, base = -1) => ({ rings: [[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]], kind, top, base });
  const polys = [];
  const Wl = P.wall;
  polys.push({ ...box(Wl.x0, Wl.x1, Wl.z - Wl.t / 2, Wl.z + Wl.t / 2, KIND.wall, Wl.h), what: "graffiti wall" });
  for (const b of SPOT_FURNITURE.benches) for (const piece of benchPieces(b)) polys.push({ ...piece, kind: KIND.furniture });
  for (const p of gardenPieces(SPOT_GARDENS)) polys.push({ rings: p.rings, kind: KIND.furniture, base: p.base, top: p.top, what: "ledge" });
  const R = FUNBOX_RAIL;
  polys.push({ ...box(R.x - 0.03, R.x + 0.03, R.z0, R.z1, KIND.furniture, R.y, P.funbox.h), what: "rail" });
  // the quarter pipe's deck back and the stair block's platform sides: walls as high as the solid there (a rider never
  // drives into a 1.5 m face of the ground sideways; a rider on top is over them)
  for (const S of SOLIDS) {
    // (round 2, owner: "ramp side panels, no open ground steps at the ramp sides": EVERY solid's sides are walls as
    // high as the solid there - a rider beside a ramp meets its side panel, never a step in the ground; a rider on it
    // is over them)
    const step = S.mat === "wood" ? 0.25 : 0.5;
    for (let s = 0; s < S.L - 1e-6; s += step) {
      let h = 0;
      for (let k = 0; k <= 4; k++) h = Math.max(h, profAt(S, Math.min(S.L, s + k * step / 4)));
      if (h < 0.12) continue;
      const za = S.z0 + S.dir * s, zb = S.z0 + S.dir * Math.min(S.L, s + step);
      // (round 3: ONE-WAY, out = the outward normal - a wheel rolling off the solid's side falls past its panel)
      polys.push({ ...box(S.x0 - 0.12, S.x0, Math.min(za, zb), Math.max(za, zb), KIND.wall, h - 0.02), what: `${S.name} side`, out: [-1, 0] }, { ...box(S.x1, S.x1 + 0.12, Math.min(za, zb), Math.max(za, zb), KIND.wall, h - 0.02), what: `${S.name} side`, out: [1, 0] });
    }
    if (S.name === "quarter pipe") polys.push({ ...box(S.x0, S.x1, S.zmax, S.zmax + 0.12, KIND.wall, profAt(S, S.L) - 0.02), what: "quarter pipe back", out: [0, 1] });
  }
  // the fence round the north and the west (beyond the lines)
  for (const f of FENCES) {
    const [ax, az, bx, bz] = f, L = hyp(bx - ax, bz - az), n = Math.ceil(L / 2);
    for (let k = 0; k < n; k++) {
      const x0 = ax + (bx - ax) * k / n, z0 = az + (bz - az) * k / n, x1 = ax + (bx - ax) * (k + 1) / n, z1 = az + (bz - az) * (k + 1) / n;
      const nx = -(z1 - z0) / (L / n) * 0.05, nz = (x1 - x0) / (L / n) * 0.05;
      polys.push({ rings: [[[x0 + nx, z0 + nz], [x1 + nx, z1 + nz], [x1 - nx, z1 - nz], [x0 - nx, z0 - nz]]], kind: KIND.wall, top: spotHeight((x0 + x1) / 2, (z0 + z1) / 2) + 1.6, base: -10, what: "fence" });
    }
  }
  const circles = [
    ...CONES.map(([x, z]) => ({ x, z, r: 0.16, kind: KIND.post })),
    ...BINS.map(([x, z]) => ({ x, z, r: 0.3, kind: KIND.post })),
    ...NEAR_TREES.map(([x, z]) => ({ x, z, r: 0.3, kind: KIND.tree })),
  ];
  // (round 3) the one-way pieces' outward normals, per polygon (0, 0: an ordinary piece): set as col.oneWay on the
  // built set (bikeEnv.js) - withOneWay below
  const oneWay = new Float32Array(polys.length * 2);
  polys.forEach((p, i) => { if (p.out) { oneWay[i * 2] = p.out[0]; oneWay[i * 2 + 1] = p.out[1]; } });
  return { polys, circles, bounds: BOUNDS, oneWay };
}
/** a built collider set with the spot's one-way pieces marked (bikeEnv.js reads col.oneWay) */
export function withOneWay(col, CL) { col.oneWay = CL.oneWay; return col; }
/** the fence lines [ax, az, bx, bz] (a wooden board fence: the north behind the hill, the west behind the pump track) */
export const FENCES = [[-46, 53, 42, 53], [-46, -26, -46, 53]];

/** the spots: [x, z, heading, speed m/s] (the panel's menu, keys 1-9 / N / B) */
export const SPOT_SPOTS = {
  "start": [0, -16, 0, 0],
  "funbox + rail": [P.funbox.xc - 0.3, -14, 0, 5],
  "quarter pipe": [P.qp.xc - 2.8, P.qp.foot - 10, 0, 7],
  "ledge": [P.ledge.x - 0.45, P.ledge.z0 - 6, 0, 4],
  "manual pad": [P.pad.xc - 0.8, P.pad.z0 - 2, 0, 4.5],
  "stairs + handrail": [P.stairs.xc, P.stairs.z0 - 3.5, 0, 3.5],
  "kicker": [P.kickers[0].xc, P.kickers[0].z0 - 2.4, 0, P.kickers[0].v],
  "small kicker": [P.kickers[1].xc, P.kickers[1].z0 - 6, 0, P.kickers[1].v],
  "pump track": [PT.ax + 2, PT.z - PT.R, Math.PI / 2, 4],
  "table jump": [TB.xc, TB.z0 + 1.2, Math.PI, 5.5],
  "whoops": [WH.xc, WH.z0 - 0.7, 0, 5],
  "berm": [WH.xc, WH.z1 + 0.3, 0, 5],
  "hill": [HL.x, HL.z - HL.rz - 3, 0, 4],
  "drift pad": [P.drift.x - 6, P.drift.z - 9, 0.6, 6],
};
