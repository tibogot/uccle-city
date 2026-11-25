// THE BMX PARK in the bike lab (claude/kid, 2026-11-25; docs/BIKE.md "The BMX park"): procedural, pure JS (no three):
// height features for the lab's ground (bikeGround.js feature(): one rectangle each, never overlapping), the colliders,
// the edge-layer lines (rails, the ledge, the stairs + handrail), the wall-ride walls and the spots. The lab draws them
// (debug/bikeLab.js: one merged ground mesh, one merged skirt, the rails / coping as one merged tube set); the tests ride
// them (tools/bike/parkTest.mjs, gate row `bikepark`).
// Layout (x east, z south; the park is z 116-232, south of the old lab):
//   kickers  x -64..-46  three wooden kickers (small 0.45 / medium 0.8 / big 1.2 m) each to a landing ramp over a gap
//   doubles  x -40..-35  four dirt doubles in a row (rhythm at pump speed)
//   whoops   x -29..-24  dirt rollers 2.2 m apart
//   pump     (-14..10, 208) a dirt pump-track loop: rollers on the straights, two berms
//   berms    (34..60, 208) a concrete berm loop: two big banked turns
//   skatepark x 30..112, z 116..192 (concrete): a quarter pipe, a mini half-pipe, a spine, a funbox with a rail, a stair
//            set down with a handrail, a long flat-bar rail, a ledge, a wall ride (a wall + a kicker toward it) and a
//            drop-in tower (3 m) with a roll-in.
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const D = Math.PI / 180;

/** a quarter pipe's height s m from its foot: radius R, up to its top angle (then the deck) */
export function qp(s, R, top) {
  const smax = R * Math.sin(top);
  if (s <= 0) return 0;
  if (s >= smax) return R * (1 - Math.cos(top));
  return R - Math.sqrt(R * R - s * s);
}
/** a kicker: an arc of radius R up to the lip angle (len = R sin lip, h = R (1 - cos lip)) */
const kick = (s, R, lip) => (s <= 0 ? 0 : s >= R * Math.sin(lip) ? 0 : R - Math.sqrt(R * R - s * s));

export const PARK = {
  z0: 116, z1: 232,
  colors: { wood: 0xb08a5c, concrete: 0xa9a59d, dirt: 0x8c6c4a, steel: 0x9aa3ab, coping: 0x8f969c },
  kickers: [
    { name: "small", xc: -62, z0: 130, h: 0.45, lip: 30, gap: 1.6, land: 0.38 },
    { name: "medium", xc: -56, z0: 130, h: 0.80, lip: 34, gap: 2.4, land: 0.65 },
    { name: "big", xc: -50, z0: 130, h: 1.20, lip: 38, gap: 3.4, land: 1.00 },
  ],
  doubles: { xc: -37.5, z0: 128, n: 4, h: 0.9, lip: 38, back: 50, gap: 1.4, top: 0.3, down: 30, flat: 2.6 },
  whoops: { xc: -26.5, z0: 124, z1: 160, lambda: 2.2, amp: 0.16 },
  pump: { ax: -14, bx: 10, z: 208, R: 6, w: 3.2, amp: 0.30, lambda: 4.8, berm: 1.6 },
  berms: { ax: 34, bx: 60, z: 208, R: 9, w: 4.0, berm: 2.0 },
  qp: { x0: 32, x1: 40, foot: 136, R: 2.4, top: 80 * D, deck: 2.0 },
  mini: { x0: 44, x1: 50, z0: 130, deck: 1.5, R: 2.0, top: 70 * D, flat: 4.0 },
  spine: { x0: 54, x1: 60, foot: 128, R: 2.2, top: 55 * D },
  funbox: { x0: 64, x1: 72, z0: 128, h: 0.6, ramp: 25 * D, top: 4.0, rail: 0.3 },
  stairs: { x0: 76, x1: 82, z0: 122, h: 0.75, grade: 0.10, plat: 3.0, n: 5, rise: 0.15, run: 0.32 },
  rail: { x: 87, z0: 124, z1: 136, top: 0.35 },
  ledge: { x: 94, z0: 124, z1: 134, h: 0.37 },
  wall: { x: 104.6, t: 0.4, z0: 133.5, z1: 152, top: 3.0, kick: { x: 102.2, z: 131.0, yaw: 22 * D, h: 0.45, lip: 30 } },
  tower: { x0: 89.5, x1: 94.5, z0: 160, z1: 163.5, h: 3.0, rx0: 90.5, rx1: 93.5, rc: 1.5, ang: 45 * D, rq: 4.0 },
};
const P = PARK;
// derived
for (const k of P.kickers) {
  const lip = k.lip * D; k.R = k.h / (1 - Math.cos(lip)); k.len = k.R * Math.sin(lip); k.lipR = lip;
  k.zl = k.z0 + k.len + k.gap;                                  // the landing's front face
  k.deck = 0.6; k.downLen = k.land / Math.tan(32 * D); k.z1 = k.zl + k.deck + k.downLen;
}
{ const d = P.doubles, lip = d.lip * D; d.R = d.h / (1 - Math.cos(lip)); d.len = d.R * Math.sin(lip); d.backLen = d.h / Math.tan(d.back * D); d.downLen = d.h / Math.tan(d.down * D);
  d.period = d.len + d.backLen + d.gap + d.backLen + d.top + d.downLen + d.flat; d.z1 = d.z0 + d.n * d.period; }
P.qp.h = qp(99, P.qp.R, P.qp.top); P.qp.smax = P.qp.R * Math.sin(P.qp.top); P.qp.z1 = P.qp.foot + P.qp.smax + P.qp.deck;
{ const m = P.mini; m.h = qp(99, m.R, m.top); m.smax = m.R * Math.sin(m.top); m.foot1 = m.z0 + m.deck + m.smax; m.foot2 = m.foot1 + m.flat; m.z1 = m.foot2 + m.smax + m.deck; }
{ const s = P.spine; s.h = qp(99, s.R, s.top); s.smax = s.R * Math.sin(s.top); s.peak = s.foot + s.smax; s.z1 = s.peak + s.smax; }
{ const f = P.funbox; f.rl = f.h / Math.tan(f.ramp); f.zt0 = f.z0 + f.rl; f.zt1 = f.zt0 + f.top; f.z1 = f.zt1 + f.rl; }
{ const s = P.stairs; s.zp = s.z0 + s.h / s.grade; s.zs = s.zp + s.plat; s.z1 = s.zs + s.n * s.run; }
{ const t = P.tower, a = t.ang; t.cx = t.rc * Math.sin(a); t.cy = t.rc * (1 - Math.cos(a)); t.qx = t.rq * Math.sin(a); t.qy = t.rq * (1 - Math.cos(a));
  t.sy = t.h - t.cy - t.qy; t.sx = t.sy / Math.tan(a); t.zr = t.z1 + t.cx + t.sx + t.qx; }
{ const k = P.wall.kick, lip = k.lip * D; k.R = k.h / (1 - Math.cos(lip)); k.len = k.R * Math.sin(lip); k.lipR = lip; }

/** the stadium track (pump / berm loops): the points at distance R from the segment (ax, z)-(bx, z). Returns the
 *  height at (x, z) for a track of width w: rollers on the straights (amp, lambda), a berm (height `berm` at the outer
 *  edge, concave) round the ends; outside the track the ground falls back to 0 over 2 m (outer) / 1.5 m (inner) */
function stadium(T, x, z, rollers) {
  const t = clamp((x - T.ax) / (T.bx - T.ax), 0, 1), px = T.ax + (T.bx - T.ax) * t;
  const dx = x - px, dz = z - T.z, d = Math.hypot(dx, dz), u = d - T.R;          // u > 0: outside the centre line
  // how far round an end (0 on a straight, 1 = 35 deg round the end's centre)
  const ang = t <= 0 || t >= 1 ? Math.atan2(Math.abs(dx), Math.abs(dz)) : 0, bw = sstep(0, 35 * D, ang);
  const hw = T.w / 2;
  const surf = (uu) => {
    const a = clamp((uu + hw) / T.w, 0, 1);
    const berm = T.berm * a * a;
    const roll = rollers ? T.amp * (1 - Math.cos(2 * Math.PI * (x - T.ax) / T.lambda)) * (1 - bw) * sstep(T.ax - 1, T.ax + 1.2, x) * (1 - sstep(T.bx - 1.2, T.bx + 1, x)) : 0;
    return 0.12 + berm * bw + roll;
  };
  if (u >= -hw && u <= hw) return surf(u);
  if (u > hw) return surf(hw) * (1 - sstep(hw, hw + 2.0, u));
  return surf(-hw) * (1 - sstep(-hw, -hw - 1.5, u));
}

/** add the park's features to the lab's ground: feature(name, x0, x1, z0, z1, surf, h, res, opt) */
export function addParkFeatures(feature, SURF) {
  const C = P.colors;
  // ---- wooden kickers to landing ramps (gap jumps)
  for (const k of P.kickers) {
    feature(`park kicker ${k.name}`, k.xc - 1.5, k.xc + 1.5, k.z0 - 0.5, k.z1 + 0.5, SURF.asphalt, (x, z) => {
      const s = z - k.z0, ax = Math.abs(x - k.xc);
      if (s < k.len && ax <= 0.8) return kick(s, k.R, k.lipR);
      const q = z - k.zl;
      if (ax <= 1.2 && q >= 0) { if (q < k.deck) return k.land; if (q < k.deck + k.downLen) return k.land * (1 - (q - k.deck) / k.downLen); }
      return 0;
    }, 0.05, { park: true, color: C.wood });
  }
  // ---- dirt doubles: takeoff (an arc to the lip), its back, a gap, the landing's face, its top, the down slope
  {
    const d = P.doubles;
    feature("park doubles", d.xc - 2.5, d.xc + 2.5, d.z0 - 0.5, d.z1 + 0.5, SURF.dirt, (x, z) => {
      const e = sstep(d.xc - 2.5, d.xc - 1.4, x) * (1 - sstep(d.xc + 1.4, d.xc + 2.5, x));
      const s0 = z - d.z0; if (s0 < 0 || s0 >= d.n * d.period) return 0;
      let s = s0 % d.period, h = 0;
      const lip = d.lip * D;
      if (s < d.len) h = d.R - Math.sqrt(d.R * d.R - s * s);
      else if ((s -= d.len) < d.backLen) h = d.h * (1 - s / d.backLen);
      else if ((s -= d.backLen) < d.gap) h = 0;
      else if ((s -= d.gap) < d.backLen) h = d.h * (s / d.backLen);
      else if ((s -= d.backLen) < d.top) h = d.h;
      else if ((s -= d.top) < d.downLen) h = d.h * (1 - sstep(0, 1, s / d.downLen) * 0.5 - 0.5 * s / d.downLen);
      void lip;
      return h * e;
    }, 0.05, { park: true, color: C.dirt });
  }
  // ---- whoops
  {
    const W = P.whoops;
    feature("park whoops", W.xc - 2.5, W.xc + 2.5, W.z0, W.z1, SURF.dirt, (x, z) => {
      const e = sstep(W.xc - 2.5, W.xc - 1.3, x) * (1 - sstep(W.xc + 1.3, W.xc + 2.5, x)) * sstep(W.z0, W.z0 + 1, z) * (1 - sstep(W.z1 - 1, W.z1, z));
      return W.amp * (1 - Math.cos(2 * Math.PI * (z - W.z0) / W.lambda)) * e;
    }, 0.1, { park: true, color: C.dirt });
  }
  // ---- the pump-track loop (dirt) and the berm loop (concrete)
  {
    const T = P.pump, m = T.R + T.w / 2 + 2.2;
    feature("park pump track", T.ax - m, T.bx + m, T.z - m, T.z + m, SURF.dirt, (x, z) => stadium(T, x, z, true), 0.15, { park: true, color: C.dirt });
    const B = P.berms, mb = B.R + B.w / 2 + 2.2;
    feature("park berm loop", B.ax - mb, B.bx + mb, B.z - mb, B.z + mb, SURF.asphalt, (x, z) => stadium(B, x, z, false), 0.15, { park: true, color: C.concrete });
  }
  // ---- the skatepark (concrete)
  const Q = P.qp;
  feature("park quarter pipe", Q.x0, Q.x1, Q.foot - 0.1, Q.z1, SURF.asphalt, (x, z) => qp(z - Q.foot, Q.R, Q.top), 0.05, { park: true, color: C.concrete, smooth: true });
  const M = P.mini;
  feature("park mini half-pipe", M.x0, M.x1, M.z0, M.z1, SURF.asphalt, (x, z) => (z < M.foot2 ? qp(M.foot1 - z, M.R, M.top) : qp(z - M.foot2, M.R, M.top)), 0.05, { park: true, color: C.concrete, smooth: true });
  const S = P.spine;
  feature("park spine", S.x0, S.x1, S.foot - 0.1, S.z1 + 0.1, SURF.asphalt, (x, z) => (z < S.peak ? qp(z - S.foot, S.R, S.top) : qp(S.z1 - z, S.R, S.top)), 0.05, { park: true, color: C.concrete, smooth: true });
  const F = P.funbox;
  feature("park funbox", F.x0, F.x1, F.z0 - 0.1, F.z1 + 0.1, SURF.asphalt, (x, z) => {
    const e = 1;
    if (z < F.z0 || z > F.z1) return 0;
    if (z < F.zt0) return F.h * (z - F.z0) / F.rl * e;
    if (z <= F.zt1) return F.h * e;
    return F.h * (F.z1 - z) / F.rl * e;
  }, 0.05, { park: true, color: C.wood });
  const ST = P.stairs;
  feature("park stairs", ST.x0, ST.x1, ST.z0 - 0.1, ST.z1 + 0.1, SURF.asphalt, (x, z) => {
    if (z < ST.z0) return 0;
    if (z < ST.zp) return (z - ST.z0) * ST.grade;
    if (z < ST.zs) return ST.h;
    if (z < ST.z1) return ST.h - ST.rise * Math.min(ST.n, Math.floor((z - ST.zs) / ST.run) + 1);
    return 0;
  }, 0.04, { park: true, color: C.concrete });
  // the wall ride's kicker (rotated toward the wall)
  {
    const k = P.wall.kick, c = Math.cos(k.yaw), sn = Math.sin(k.yaw), hw = 0.8;
    // (forward (sin yaw, cos yaw); s along it from the foot at (k.x, k.z), t across)
    feature("park wallride kicker", k.x - 1.6, k.x + 1.6 + k.len * sn, k.z - 0.4, k.z + k.len * c + 0.6, SURF.asphalt, (x, z) => {
      const dx = x - k.x, dz = z - k.z, s = dx * sn + dz * c, t = dx * c - dz * sn;
      return Math.abs(t) <= hw ? kick(s, k.R, k.lipR) : 0;
    }, 0.05, { park: true, color: C.wood });
  }
  // the drop-in tower: the platform, a convex rounding, a 45 deg straight, the concave transition to the flat
  const TW = P.tower;
  feature("park drop-in tower", TW.x0, TW.x1, TW.z0, TW.zr + 0.1, SURF.asphalt, (x, z) => {
    if (z < TW.z1) return TW.h;
    if (x < TW.rx0 || x > TW.rx1) return 0;
    let u = z - TW.z1;
    if (u < TW.cx) return TW.h - (TW.rc - Math.sqrt(Math.max(0, TW.rc * TW.rc - u * u)));
    u -= TW.cx;
    if (u < TW.sx) return TW.h - TW.cy - u * Math.tan(TW.ang);
    u -= TW.sx;
    if (u < TW.qx) { const v = TW.qx - u; return TW.rq - Math.sqrt(Math.max(0, TW.rq * TW.rq - v * v)); }
    return 0;
  }, 0.05, { park: true, color: C.wood, smooth: true });
}

/** the park's asphalt / concrete areas outside its features (the lab's ASPHALT list) */
export const PARK_ASPHALT = [[28, 113, 116, 192], [-66, -44, 118, 182], [-30, -23, 118, 164], [-41, -34, 118, 186]];

/** the park's colliders (plain lists for viewer/drive/colliders.js): the wall ride's wall, the tower's railings, the
 *  rail / ledge low pieces, the roll-in's side rails. KIND from colliders.js. */
export function parkColliders(KIND, H) {
  const box = (x0, x1, z0, z1, kind, top, base) => ({ rings: [[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]], kind, top, base: base ?? (top !== undefined ? -1 : undefined), park: true });
  const out = [];
  const W = P.wall;
  out.push({ ...box(W.x, W.x + W.t, W.z0, W.z1, KIND.wall, W.top), what: "wall ride", drawColor: P.colors.concrete });
  const T = P.tower;
  // the railings round the platform (not the roll-in's edge), 1 m over it; the roll-in's sides
  out.push({ ...box(T.x0 - 0.06, T.x0, T.z0, T.z1, KIND.wall, T.h + 1.0, T.h - 0.1), what: "railing", rail: true });
  out.push({ ...box(T.x1, T.x1 + 0.06, T.z0, T.z1, KIND.wall, T.h + 1.0, T.h - 0.1), what: "railing", rail: true });
  out.push({ ...box(T.x0, T.x1, T.z0 - 0.06, T.z0, KIND.wall, T.h + 1.0, T.h - 0.1), what: "railing", rail: true });
  out.push({ ...box(T.x0, T.rx0, T.z1 - 0.06, T.z1, KIND.wall, T.h + 1.0, T.h - 0.1), what: "railing", rail: true });
  out.push({ ...box(T.rx1, T.x1, T.z1 - 0.06, T.z1, KIND.wall, T.h + 1.0, T.h - 0.1), what: "railing", rail: true });
  // the tower's body (under the platform, its sides: the bike never rides into the heightfield's 3 m face)
  out.push({ ...box(T.x0, T.x1, T.z0, T.z1 - 0.02, KIND.wall, T.h - 0.02, -1), what: "tower", drawColor: P.colors.wood, noDraw: true });
  // the long rail and the funbox rail: thin low pieces (a hop clears them; per wheel at its own height)
  const R = P.rail;
  out.push({ ...box(R.x - 0.03, R.x + 0.03, R.z0, R.z1, KIND.furniture, R.top), what: "rail", rail: true, noDraw: true });
  const F = P.funbox, fx = (F.x0 + F.x1) / 2;
  out.push({ ...box(fx - 0.03, fx + 0.03, F.zt0 + 0.3, F.zt1 - 0.3, KIND.furniture, F.h + F.rail, F.h), what: "rail", rail: true, noDraw: true });
  void H;
  return out;
}
/** the ledge as a garden doc (gardenEdges / gardenPieces: a wall + coping, as the city's) */
export const PARK_GARDENS = (() => {
  const L = P.ledge;
  return { styles: [{ kind: "wall", cap: 1, rail: -1, wallH: L.h, railH: 0 }], segs: [[L.x, 0, L.z0, L.x, 0, L.z1, 0, L.h]], pillars: [], gates: [], hedges: [] };
})();
/** the stair set as an OSM highway=steps line, bottom to top (the flight goes DOWN along +z) */
export const PARK_FEATURES = { lines: [{ id: "park:steps", kind: "steps", line: [[(P.stairs.x0 + P.stairs.x1) / 2, P.stairs.z1], [(P.stairs.x0 + P.stairs.x1) / 2, P.stairs.zs]], tags: { highway: "steps", width: String(P.stairs.x1 - P.stairs.x0 - 0.4) } }] };
/** the edge lines the park adds (bikeEdges.js line objects; EDGE from there): the long rail, the funbox rail */
export function parkRailEdges(EDGE) {
  const R = P.rail, F = P.funbox, fx = (F.x0 + F.x1) / 2;
  return [
    { type: EDGE.rail, pts: [[R.x, R.top, R.z0], [R.x, R.top, R.z1]], height: R.top, width: 0.04, grind: true, mat: "steel", park: true },
    { type: EDGE.rail, pts: [[fx, F.h + F.rail, F.zt0 + 0.3], [fx, F.h + F.rail, F.zt1 - 0.3]], height: F.rail, width: 0.04, grind: true, mat: "steel", park: true },
  ];
}
/** the wall-ride walls for the physics (bikePhysics wallride): a vertical plane x = const (the face toward -x) */
export const PARK_WALLRIDES = [{ x0: P.wall.x, z0: P.wall.z0, x1: P.wall.x, z1: P.wall.z1, nx: -1, nz: 0, top: P.wall.top }];

/** the park's spots [x, z, heading, speed m/s] (the lab's park menu, keys 0 / N / B) */
export const PARK_SPOTS = {
  "park overview": [-20, 118, 0, 0],
  "kicker small": [P.kickers[0].xc, P.kickers[0].z0 - 9, 0, 0],
  "kicker medium": [P.kickers[1].xc, P.kickers[1].z0 - 12, 0, 0],
  "kicker big": [P.kickers[2].xc, P.kickers[2].z0 - 14, 0, 0],
  "dirt doubles": [P.doubles.xc, P.doubles.z0 - 10, 0, 0],
  "whoops": [P.whoops.xc, P.whoops.z0 - 5, 0, 0],
  "pump track": [P.pump.ax + 2, P.pump.z - P.pump.R, Math.PI / 2, 4],
  "berm loop": [P.berms.ax + 2, P.berms.z - P.berms.R, Math.PI / 2, 5],
  "quarter pipe": [(P.qp.x0 + P.qp.x1) / 2, P.qp.foot - 12, 0, 0],
  "mini half-pipe": [(P.mini.x0 + P.mini.x1) / 2, (P.mini.foot1 + P.mini.foot2) / 2, 0, 4.5],
  "spine": [(P.spine.x0 + P.spine.x1) / 2, P.spine.foot - 10, 0, 0],
  "funbox": [(P.funbox.x0 + P.funbox.x1) / 2 - 0.5, P.funbox.z0 - 9, 0, 0],
  "stairs + handrail": [(P.stairs.x0 + P.stairs.x1) / 2, P.stairs.z0 - 3, 0, 0],
  "long rail": [P.rail.x - 0.55, P.rail.z0 - 7, 0, 0],
  "ledge": [P.ledge.x - 0.7, P.ledge.z0 - 7, 0, 0],
  "wall ride": [P.wall.kick.x - 2.2, P.wall.kick.z - 8, P.wall.kick.yaw, 0],
  "drop-in tower": [(P.tower.rx0 + P.tower.rx1) / 2, P.tower.z0 + 0.9, 0, 0],
};
