// HEDGES SOLID (owner 2026-11-20, rule hedge-wall, docs/CARHIT.md "Hedges"): headless.
//   node --preserve-symlinks --import ./tools/characters/threeHook.mjs tools/collide/hedgeWallTest.mjs [--quiet] [--old]
// A run of 1 m hedge modules along z (0.7 m thick, x -0.35..0.35), as driveMode.js featureColliders makes them from the
// gardens' stand-ins (kind = hedgeKind(drawn height)); the car (police feel, as driveMode) driven into it head-on:
//   1.8 m hedge, 30 km/h, coasting and on full throttle for 3 s: stops, never more than 0.2 m inside, no NaN, rebounds
//     less than off a brick wall of the same plan, the shake sink gets the hit (finite point, on the hedge's face);
//   0.8 m hedge, 30 km/h on the throttle: passes through, slowed (vs the same run with no hedge);
//   the two-wheelers (moto, scooter, Villo) into the 1.8 m hedge at 25 km/h: never through, at most 0.2 m inside;
//   the shake pool (viewer/gardens/hedgeShake.js): a hit lights a slot, it decays to zero by SHAKE_T.
// --old: the hedges as ?hedgewall=old makes them (all soft): the tall-hedge rows must FAIL.
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2), QUIET = argv.includes("--quiet"), OLD = argv.includes("--old");
globalThis.location ??= { search: "" };
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { buildColliders, KIND, hedgeKind, HEDGE_WALL_H } = await imp("viewer/drive/colliders.js");
const { createCarEnv, HEDGE_HITS } = await imp("viewer/drive/carEnv.js");
const { createCarState, stepCar, HANDLING, BODY } = await imp("viewer/drive/carPhysics.js");
const P = await imp("viewer/moto/motoPhysics.js");

const KMH = 1 / 3.6, DT = 1 / 60, FACE = 0.35;
const rows = [];
const row = (name, ok, info) => { rows.push({ name, ok: !!ok, info }); };

/** the hedge run: 20 modules of 1 m, kind from the drawn height h (or `kind`), base 0, top h */
function hedge(h, kind = hedgeKind(h, OLD)) {
  const polys = [];
  for (let z = -10; z < 10; z += 1) polys.push({ rings: [[[-FACE, z], [FACE, z], [FACE, z + 1.03], [-FACE, z + 1.03]]], kind, base: 0, top: h });
  return buildColliders(polys, [], { x0: -50, x1: 50, z0: -50, z1: 50 });
}
/** the car from x = 8 toward -x at v; returns the deepest front penetration past the face, the end state, NaN */
function drive(col, v, throttle, secs) {
  const env = createCarEnv({ sets: () => (col ? [col] : []), ground: () => 0, handling: HANDLING, feel: true, ledges: false });
  const c = createCarState(8, 0.3, -Math.PI / 2);
  c.speed = v;
  let inside = 0, nan = false, minV = Infinity;
  for (let t = 0; t < secs; t += DT) {
    stepCar(c, { throttle, brake: 0, steer: 0 }, DT, env);
    if (!Number.isFinite(c.x + c.z + c.speed + c.heading + (c.vx || 0) + (c.vz || 0))) { nan = true; break; }
    inside = Math.max(inside, FACE - (c.x - BODY.hz));
    minV = Math.min(minV, c.speed);
  }
  return { x: c.x, rear: c.x + BODY.hz, speed: c.speed, inside, nan, minV };
}

// ---- the car into a 1.8 m hedge
const hits = [];
HEDGE_HITS.sink = (x, z, nx, nz, vn) => hits.push({ x, z, nx, nz, vn });
const tall = hedge(1.8);
const coast = drive(tall, 30 * KMH, 0, 2.5);
row("car 30 km/h into a 1.8 m hedge (coasting): stops in front", !coast.nan && coast.inside <= 0.2 && coast.x - BODY.hz > FACE - 0.2 && Math.abs(coast.speed) < 1.5,
  `inside ${coast.inside.toFixed(3)} m, end x ${coast.x.toFixed(2)}, end ${coast.speed.toFixed(2)} m/s`);
const floor = drive(tall, 30 * KMH, 1, 3);
row("car 30 km/h into a 1.8 m hedge, full throttle 3 s: held", !floor.nan && floor.inside <= 0.2,
  `inside ${floor.inside.toFixed(3)} m, end x ${floor.x.toFixed(2)}`);
const hv = hits.find((h) => h.vn > 3);
row("the hit reaches the shake sink (finite, on the face)", !OLD ? hv && Number.isFinite(hv.x + hv.z) && Math.abs(hv.x - FACE) < 0.3 && hv.nx > 0.9 : hits.length > 0,
  hv ? `${hits.length} hits, first hard at (${hv.x.toFixed(2)}, ${hv.z.toFixed(2)}) n (${hv.nx.toFixed(2)}, ${hv.nz.toFixed(2)}) ${hv.vn.toFixed(1)} m/s` : `${hits.length} hits`);
HEDGE_HITS.sink = null;
// softer than a brick wall: the rebound (the most negative speed) off the hedge vs off a wall of the same plan
const wall = drive(hedge(1.8, KIND.wall), 30 * KMH, 0, 2.5);
row("softer bounce than a brick wall", -coast.minV < -wall.minV * 0.7 && -wall.minV > 0.3,
  `rebound hedge ${(-coast.minV).toFixed(2)} m/s, wall ${(-wall.minV).toFixed(2)} m/s`);

// ---- a 0.8 m hedge: through on the throttle, slowed (a coasting car stops inside a soft hedge, as before this job)
const low = drive(hedge(0.8), 30 * KMH, 1, 3), free = drive(null, 30 * KMH, 1, 3);
row("car 30 km/h into a 0.8 m hedge (throttle): passes through", !low.nan && low.rear < -FACE, `rear x ${low.rear.toFixed(2)} after 3 s`);
row("... slowed", low.speed < free.speed - 1 && low.x > free.x + 1, `end ${low.speed.toFixed(2)} m/s at x ${low.x.toFixed(1)} vs ${free.speed.toFixed(2)} m/s at x ${free.x.toFixed(1)} with no hedge`);
row("threshold: 1.1 m soft, 1.2 m a wall", hedgeKind(1.1) === KIND.hedge && hedgeKind(1.2) === KIND.hedgeWall && hedgeKind(1.2, true) === KIND.hedge, `HEDGE_WALL_H ${HEDGE_WALL_H}`);

// ---- the two-wheelers
for (const kind of ["moto", "scooter", "villo"]) {
  const H = P.TWO_WHEELERS[kind], dims = P.BODIES[kind];
  if (!H || !dims) { row(`${kind}: into a 1.8 m hedge`, false, "no such two-wheeler"); continue; }
  const env = createCarEnv({ sets: () => [tall], ground: () => 0, handling: H, dims, onHit: P.motoHit, two: true, ledges: false, ...(P.twoWheelEnv ? P.twoWheelEnv(H) : {}) });
  const c = P.createMotoState(8, 0.3, -Math.PI / 2);
  c.y = 0; c.speed = 25 * KMH;
  let inside = 0, nan = false;
  const I = { throttle: 0.6, brake: 0, rear: false, steer: 0, boost: false };
  for (let t = 0; t < 3; t += DT) {
    P.stepMoto(c, I, DT, env, H);
    if (!Number.isFinite(c.x + c.z + c.speed)) { nan = true; break; }
    inside = Math.max(inside, FACE - (c.x - dims.hz));
  }
  row(`${kind} 25 km/h into a 1.8 m hedge: a wall`, !nan && inside <= 0.2 && c.x > 0, `inside ${inside.toFixed(3)} m, end x ${c.x.toFixed(2)}${c.crashed ? ", crashed" : ""}`);
}

// ---- the shake pool (three's TSL nodes are built headless; nothing is rendered)
try {
  const S = await imp("viewer/gardens/hedgeShake.js");
  S.shakeHedge(1, 2, 1, 0, 8, 100);
  S.updateShake(100.1);
  const v = S.uShake.array.find((q) => q.x === 1 && q.y === 2);
  const lit = !!v && Math.abs(v.z) > 0.01 && Math.abs(v.z) <= S.SHAKE_MAX;
  S.updateShake(100 + S.SHAKE_T + 0.01);
  const zero = S.uShake.array.every((q) => q.x === 0 && q.z === 0 && q.w === 0) && !S.shakeLive();
  row("shake pool: a hit wobbles, gone by SHAKE_T", lit && zero, `${S.SHAKE_N} slots, ${S.SHAKE_T} s`);
} catch (e) { row("shake pool: a hit wobbles, gone by SHAKE_T", false, `import failed: ${e.message}`); }

const ok = rows.every((r) => r.ok);
for (const r of rows) if (!QUIET || !r.ok) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}: ${r.info}`);
console.log(`hedgewall: ${ok ? "PASS" : "FAIL"} (${rows.filter((r) => r.ok).length}/${rows.length})${OLD ? " [--old]" : ""}`);
process.exit(ok ? 0 : 1);
