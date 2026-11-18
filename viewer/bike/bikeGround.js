// THE BIKE LAB'S TEST GROUND, procedural, pure JS (no three): the lab draws it, tools/bike/bikeTest.mjs rides it.
// Every feature is a rectangle of its own (they never overlap) with a height function that meets 0 at its border
// (except the deliberate faces: the kerb, the kicker's / table's sides and back, the slope's embankment sides).
// Layout (x east, z south; the spawn at (0, 0) facing +z):
//   lane A  (x 0)   kicker (0.9 m, 35 deg lip, flat landing) at z 20, table (1.2 m, 5 m down ramp) at z 45
//   pump    (x -15) six dirt rollers 0.4 m high, 5 m apart
//   roots   (x -25) a forest path of root ridges (3-5 cm)
//   bowl    (-36, 70) a dirt bowl 2.4 m deep, 20 m across
//   kerb    (x 15)  a 15 cm kerb (sharp face) up onto a setts pavement, z 20-40, and a drop back off it
//   sand    (26, 56) a 12 x 12 m sand patch at the end of an asphalt lane (x 26)
//   slope   (x 40-130, z 0) 12 % up 40 m, a 10 m plateau 4.8 m up, 12 % down
//   steep   (x 40-88, z 25) 20 % up 20 m (pushing), plateau, down
//   plaza   (z -40..10) asphalt; a wall (z -21.7), a slalom of posts, a log (25 cm) to hop, a parked car
//   street  (x 100-140, z 30-95, feel round 2) asphalt: a street bench, a ledge (a front-garden wall: a 30 deg bend then a
//           90 deg corner), a flight of 8 stairs (15 cm risers) up to a landing with a handrail, a ramp back down.
//           Built as the CITY's docs (furniture benches[], gardens segs[] + styles[], features lines kind "steps"), run
//           through the same extractors (viewer/bike/bikeEdges.js) -> the edge layer, the stair ramp, the colliders.
// Elsewhere: grass.
import { SURF, groundQuery } from "./bikePhysics.js";
import { benchEdges, gardenEdges, stairEdges, handrailEdges, buildEdgeLayer, withStairRamps, BENCH, benchPieces } from "./bikeEdges.js";
import { gardenPieces } from "../gardens/gardenClear.js";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** a C1 ramp: 0 below -1, u above 1, (u + 1)^2 / 4 between (rounds a slope's corners over 2 m) */
const sm = (u) => (u <= -1 ? 0 : u >= 1 ? u : (u + 1) * (u + 1) / 4);

export const KICKER = { x0: -1.2, x1: 1.2, z0: 20, R: 4.97, lip: 35 * Math.PI / 180 };
KICKER.len = KICKER.R * Math.sin(KICKER.lip);
KICKER.h = KICKER.R * (1 - Math.cos(KICKER.lip));
export const TABLE = { x0: -1.5, x1: 1.5, z0: 45, up: 3, top: 4, down: 5, h: 1.2 };
export const KERB = { x0: 10, x1: 20, z0: 20, z1: 40, h: 0.15 };
export const SAND = { x0: 20, x1: 32, z0: 50, z1: 62 };
export const SLOPE = { x0: 40, z0: -8, z1: 8, grade: 0.12 };
export const STEEP = { x0: 40, z0: 20, z1: 30, grade: 0.20 };
export const BOWL = { x: -36, z: 70, R: 10, flat: 3, depth: 2.4 };
export const PUMP = { x0: -17, x1: -13, z0: 10, n: 6, lambda: 5, amp: 0.2 };
export const ROOTS = { x0: -27, x1: -23, z0: 5, z1: 45 };
export const WALL = { x0: -10, x1: 10, z0: -22, z1: -21.4, top: 2.5 };
export const LOG = { x0: -4, x1: -1, z0: -14.15, z1: -13.85, top: 0.25 };
export const CAR = { x: 7, z: -12, w: 1.8, l: 4.3, top: 1.45 };
export const POSTS = Array.from({ length: 8 }, (_, k) => ({ x: -18 + (k % 2) * 2.4, z: -6 - k * 3.2, r: 0.1 }));
export const BOUNDS = { x0: -80, x1: 150, z0: -40, z1: 110 };
// the street (feel round 2)
export const STREET = { x0: 100, x1: 140, z0: 30, z1: 95 };
export const STAIRS = { x0: 128, x1: 132, z0: 70, n: 8, rise: 0.15, run: 0.3, land: 7.6, ramp: 9.6 };
STAIRS.z1 = STAIRS.z0 + STAIRS.n * STAIRS.run; STAIRS.h = STAIRS.n * STAIRS.rise;
STAIRS.zl = STAIRS.z1 + STAIRS.land; STAIRS.zr = STAIRS.zl + STAIRS.ramp;

const F = [];
const feature = (name, x0, x1, z0, z1, surf, h, res = 0.2) => { const f = { name, x0, x1, z0, z1, surf, h, res }; F.push(f); return f; };

feature("kicker", -2, 2, 18, 24, SURF.asphalt, (x, z) => {
  const s = z - KICKER.z0;
  if (x < KICKER.x0 || x > KICKER.x1 || s < 0 || s > KICKER.len) return 0;
  return KICKER.R - Math.sqrt(KICKER.R * KICKER.R - s * s);
}, 0.1);
feature("table", -2.5, 2.5, 44, 58, SURF.dirt, (x, z) => {
  if (x < TABLE.x0 || x > TABLE.x1) return 0;
  const s = z - TABLE.z0, T = TABLE;
  if (s < 0) return 0;
  if (s < T.up) return T.h * Math.pow(s / T.up, 1.6);
  if (s < T.up + T.top) return T.h;
  if (s < T.up + T.top + T.down) return T.h * (1 - smoothstep(0, 1, (s - T.up - T.top) / T.down));
  return 0;
}, 0.1);
feature("pump", PUMP.x0 - 1, PUMP.x1 + 1, PUMP.z0, PUMP.z0 + PUMP.n * PUMP.lambda, SURF.dirt, (x, z) => {
  const s = z - PUMP.z0;
  if (s < 0 || s > PUMP.n * PUMP.lambda) return 0;
  const edge = smoothstep(PUMP.x0 - 1, PUMP.x0, x) * (1 - smoothstep(PUMP.x1, PUMP.x1 + 1, x));
  return PUMP.amp * (1 - Math.cos(2 * Math.PI * s / PUMP.lambda)) * edge;
}, 0.2);
feature("roots", ROOTS.x0, ROOTS.x1, ROOTS.z0, ROOTS.z1, SURF.roots, (x, z) => {
  const edge = smoothstep(ROOTS.x0, ROOTS.x0 + 0.4, x) * (1 - smoothstep(ROOTS.x1 - 0.4, ROOTS.x1, x)) * smoothstep(ROOTS.z0, ROOTS.z0 + 1, z) * (1 - smoothstep(ROOTS.z1 - 1, ROOTS.z1, z));
  // root ridges at irregular spacing, slanted across the path
  const u = z * 1.7 + 0.35 * x + 0.8 * Math.sin(z * 0.37) + 0.5 * Math.sin(x * 1.3 + z * 0.2);
  const r = Math.pow(Math.max(0, Math.sin(u)), 6);
  return (0.03 + 0.02 * Math.sin(z * 0.9)) * r * edge;
}, 0.1);
feature("bowl", BOWL.x - BOWL.R - 1, BOWL.x + BOWL.R + 1, BOWL.z - BOWL.R - 1, BOWL.z + BOWL.R + 1, SURF.dirt, (x, z) => {
  const r = Math.hypot(x - BOWL.x, z - BOWL.z);
  return -BOWL.depth * (1 - smoothstep(BOWL.flat, BOWL.R, r));
}, 0.25);
feature("kerb", KERB.x0, KERB.x1, KERB.z0, KERB.z1, SURF.setts, () => KERB.h, 0.5);
feature("sand", SAND.x0, SAND.x1, SAND.z0, SAND.z1, SURF.sand, () => 0, 0.5);
// the stairs: real treads and risers (faces), a landing, a 12.5 % ramp back down; walls on both sides (colliders)
feature("stairs", STAIRS.x0, STAIRS.x1, STAIRS.z0, STAIRS.zr, SURF.asphalt, (x, z) => {
  const S = STAIRS;
  if (z < S.z1) return Math.min(S.n, Math.floor((z - S.z0) / S.run) + 1) * S.rise;
  if (z < S.zl) return S.h;
  return S.h * (1 - (z - S.zl) / S.ramp);
}, 0.05);
const slopeH = (s, G, run, flat) => G * (sm(s) - sm(s - run) - sm(s - run - flat) + sm(s - 2 * run - flat));
feature("slope", SLOPE.x0 - 2, SLOPE.x0 + 92, SLOPE.z0, SLOPE.z1, SURF.asphalt, (x) => slopeH(x - SLOPE.x0, SLOPE.grade, 40, 10), 0.5);
feature("steep", STEEP.x0 - 2, STEEP.x0 + 48, STEEP.z0, STEEP.z1, SURF.asphalt, (x) => slopeH(x - STEEP.x0, STEEP.grade, 20, 6), 0.5);

/** asphalt areas outside the features (the rest is grass) */
const ASPHALT = [[-60, 140, -40, 10], [-3, 3, 10, 100], [10, 20, 10, 60], [24, 28, 10, 50], [STREET.x0, STREET.x1, STREET.z0, STREET.z1]];
const inR = (x, z, a, b, c, d) => x >= a && x < b && z >= c && z < d;

export const FEATURES = F;
export function testHeight(x, z) {
  for (const f of F) if (x >= f.x0 && x < f.x1 && z >= f.z0 && z < f.z1) return f.h(x, z);
  return 0;
}
export function testSurface(x, z) {
  for (const f of F) if (x >= f.x0 && x < f.x1 && z >= f.z0 && z < f.z1) {
    if (f.name === "kicker" && !(x >= KICKER.x0 && x <= KICKER.x1)) break;
    if (f.name === "table" && !(x >= TABLE.x0 && x <= TABLE.x1)) break;
    if (f.name === "pump" && !(x >= PUMP.x0 - 0.5 && x <= PUMP.x1 + 0.5)) break;
    return f.surf;
  }
  for (const r of ASPHALT) if (inR(x, z, ...r)) return SURF.asphalt;
  return SURF.grass;
}
/** the ground query for bikePhysics */
export const testGround = groundQuery(testHeight, testSurface, 0.03);

// ---------------------------------------------------------------- the street's pieces as the city's docs (feel round 2)
/** data/furniture/<T>.json-like: one street bench, its long axis along z (world x axis = (cos yaw, -sin yaw)) */
export const LAB_FURNITURE = { benches: [{ id: "lab:bench", piece: "bench_street", x: 110, y: 0, z: 46, yaw: -Math.PI / 2 }] };
/** data/gardens/<T>.json-like: a 32 cm wall + 8 cm coping (a 40 cm ledge): 10 m along z, a 30 deg bend, 4 m, a 90 deg
 *  corner, 4 m */
export const LEDGE = { x: 118, z0: 40, h: 0.32 };
export const LAB_GARDENS = (() => {
  const P = [[LEDGE.x, LEDGE.z0]];
  const go = (dx, dz, L, n) => { for (let k = 0; k < n; k++) { const [x, z] = P.at(-1); P.push([x + dx * L / n, z + dz * L / n]); } };
  go(0, 1, 10, 5); go(Math.sin(Math.PI / 6), Math.cos(Math.PI / 6), 4, 2); go(Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6), 4, 2);
  const segs = [];
  for (let i = 1; i < P.length; i++) segs.push([P[i - 1][0], 0, P[i - 1][1], P[i][0], 0, P[i][1], 0, LEDGE.h]);
  return { styles: [{ kind: "wall", cap: 1, rail: -1, wallH: LEDGE.h, railH: 0 }], segs, pillars: [], gates: [], hedges: [] };
})();
/** data/tiles/<T>/features.json-like: the flight as an OSM highway=steps line, bottom to top */
export const LAB_FEATURES = { lines: [{ id: "lab:steps", kind: "steps", line: [[(STAIRS.x0 + STAIRS.x1) / 2, STAIRS.z0], [(STAIRS.x0 + STAIRS.x1) / 2, STAIRS.z1]], tags: { highway: "steps", width: String(STAIRS.x1 - STAIRS.x0) } }] };
/** the edge layer of the lab (the city's extractors), and the stair ramp over the real steps */
export function testEdgeLines() {
  const stairs = stairEdges(LAB_FEATURES, testHeight);
  return [...benchEdges(LAB_FURNITURE), ...gardenEdges(LAB_GARDENS), ...stairs, ...handrailEdges(stairs, { side: -1 })];
}
export const testEdges = buildEdgeLayer(testEdgeLines(), BOUNDS);
export const testHeightRamped = withStairRamps(testHeight, testEdges);
/** the lab's ground with the stairs as a ramp (what the bike rides; testGround = the raw steps) */
export const testGroundRamped = groundQuery(testHeightRamped, testSurface, 0.03);

/** the colliders (plain lists for viewer/drive/colliders.js buildColliders) */
export function testColliders(KIND) {
  const box = (x0, x1, z0, z1, kind, top) => ({ rings: [[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]], kind, top, base: top !== undefined ? -1 : undefined });
  const polys = [
    box(WALL.x0, WALL.x1, WALL.z0, WALL.z1, KIND.building),
    box(LOG.x0, LOG.x1, LOG.z0, LOG.z1, KIND.furniture, LOG.top),
    box(CAR.x - CAR.w / 2, CAR.x + CAR.w / 2, CAR.z - CAR.l / 2, CAR.z + CAR.l / 2, KIND.car),
  ];
  // the embankments' long sides (the slope / steep features stand 4.8 / 4 m over the grass) are retaining walls, as in the
  // city (a wall is a collider; the ground never has a face the bike could drive into sideways)
  // (in 2 m pieces, each as high as the embankment there + 0.3 m)
  for (const F0 of [SLOPE, STEEP]) {
    const f = F.find((q) => q.x0 === F0.x0 - 2 && q.z0 === F0.z0);
    for (let x = f.x0; x < f.x1 - 1e-6; x += 2) {
      let h = 0;
      for (let k = 0; k <= 4; k++) h = Math.max(h, f.h(x + k * 0.5, F0.z0 + 1));
      if (h < 0.4) continue;
      const top = Math.round((h + 0.3) * 100) / 100;
      polys.push(box(x, x + 2, F0.z0 - 0.3, F0.z0, KIND.wall, top), box(x, x + 2, F0.z1, F0.z1 + 0.3, KIND.wall, top));
    }
  }
  // the street: the bench (a box to its backrest's top, as bikeCitySpot), the ledge (gardenPieces, as the city's), the
  // stairs' side walls, the handrail (a thin band to its top)
  for (const b of LAB_FURNITURE.benches) {
    const d = BENCH[b.piece], c = Math.cos(b.yaw), sn = Math.sin(b.yaw);
    for (const piece of benchPieces(b)) polys.push({ ...piece, kind: KIND.furniture });
  }
  for (const p of gardenPieces(LAB_GARDENS)) polys.push({ rings: p.rings, kind: KIND.furniture, base: p.base, top: p.top });
  for (const x of [STAIRS.x0 - 0.3, STAIRS.x1]) polys.push(box(x, x + 0.3, STAIRS.z0, STAIRS.zr, KIND.wall, STAIRS.h + 1.0));
  const circles = POSTS.map((p) => ({ x: p.x, z: p.z, r: p.r, kind: KIND.post }));
  return { polys, circles, bounds: BOUNDS };
}

/** where to start each test run / the lab's teleport buttons: [x, z, heading] */
export const SPOTS = {
  start: [0, 0, 0], kicker: [0, 8, 0], table: [0, 32, 0], pump: [-15, 2, 0], roots: [-25, 0, 0], bowl: [-36, 55, 0],
  kerb: [15, 12, 0], sand: [26, 30, 0], bench: [109.45, 38, 0], ledge: [117.6, 32, 0], stairs: [130, 79, Math.PI], slope: [30, 0, Math.PI / 2], steep: [30, 25, Math.PI / 2], wall: [0, -10, Math.PI], log: [-2.5, -6, Math.PI],
};
