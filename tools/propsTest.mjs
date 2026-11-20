// node tools/propsTest.mjs [--quiet] [--old]: physics props without a browser (docs/PROPS.md, rule physics-props, gate row `props`).
// The player's car is the real one (carCtl.js stepCtl through carEnv.js with the PropWorld, 60 fps frames, 120 Hz
// substeps); the props are viewer/props/propWorld.js bodies on a flat ground with their drive colliders as the city
// builds them (colliders.js: a box / post with a `ref` carrying the prop), shapes from the real pieces' sizes.
// --old = ?props=old (no prop world: every prop a wall): the behaviour checks FAIL (the gate's A/B).
// Checks (exit 1 on a failure):
//   bin 20 / 50 km/h        it flies (> 0.3 m up at 50) and lands 3+ / 8+ m on, tumbled; the car keeps > 95 % of its speed
//   cone 20 / 50 km/h       it flies, the car keeps > 99 %
//   sign 20 km/h            it bends over (flattened, never a body), the car rolls on slowed a little (2-25 %)
//   sign 50 km/h            it snaps (a body, thrown > 5 m), the car keeps > 85 %
//   bollard 20 / 50 km/h    20: it bends (the car slowed hard, > 40 %), 50: it snaps
//   parked moto 20 / 50     it tips over (roll > 55 deg) and slides (> 1 m); the car slowed by the mass ratio (5-35 %)
//   Villo bike / terrace    the bike topples out of its dock; a terrace table wakes its chairs
//   lamp 20 / 50 km/h       a lamp (no prop) still stops the car (< 30 % of its speed left, it never moves)
//   walker                  a walker at 1.5 m/s kicks a cone / bin over
//   walls / ground          200 random throws: nothing ends > 5 cm inside a wall or > 3 cm under the ground
//   NaN                     every value finite after 400 random hits (any class, angle, 5-90 km/h)
//   sleep                   every body asleep within 8 s of its last hit
//   allocation              20 000 substeps with 24 awake bodies: no heap growth in propWorld / colliders / obb
//   cost                    24 awake bodies: the solver's ms per 60 fps frame (2 substeps) < 0.1 ms
//   ranges                  a woken prop's instance writes are update ranges (instanceStream.js StreamPool.patch,
//                           cityProps.js proxies): no whole-buffer upload, no DynamicDrawUsage
import { register } from "node:module";

const STUB = `export class Vector3 { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;} distanceToSquared(v){return (this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2;} distanceTo(v){return Math.sqrt(this.distanceToSquared(v));} set(x,y,z){this.x=x;this.y=y;this.z=z;return this;} }
export class Sphere { constructor(){this.center=new Vector3();this.radius=0;} }
export class InstancedBufferAttribute { constructor(a,w){this.array=a;this.itemSize=w;this.updateRanges=[];this.version=0;this.isInstancedBufferAttribute=true;} clearUpdateRanges(){this.updateRanges.length=0;} addUpdateRange(s,c){this.updateRanges.push({start:s,count:c});} set needsUpdate(v){if(v)this.version++;} }
export const DynamicDrawUsage = 35048;`;
const TSL = `export const uniformArray = (a) => ({ array: a, element: () => null });`;
register("data:text/javascript," + encodeURIComponent(`
export async function resolve(s, c, n) {
  if (s === "three/webgpu") return { url: "data:text/javascript," + encodeURIComponent(${JSON.stringify(STUB)}), shortCircuit: true };
  if (s === "three/tsl") return { url: "data:text/javascript," + encodeURIComponent(${JSON.stringify(TSL)}), shortCircuit: true };
  return n(s, c);
}`));
globalThis.addEventListener = () => {};

const OLD = process.argv.includes("--old");
const QUIET = process.argv.includes("--quiet");
const { createCtlState, stepCtl } = await import("../viewer/drive/carCtl.js");
const { createCarEnv } = await import("../viewer/drive/carEnv.js");
const { buildColliders, addCircles, KIND, gather: gatherC } = await import("../viewer/drive/colliders.js");
const { HANDLING } = await import("../viewer/drive/carPhysics.js");
const { PropWorld, CLASSES, PROP } = await import("../viewer/props/propWorld.js");

const DT = 1 / 60, KMH = 1 / 3.6, DEG = 180 / Math.PI, CAR_M = 1380;
let fails = 0;
const out = [];
function check(name, ok, msg) { out.push(`| ${name} | ${ok ? "pass" : "**FAIL**"} | ${msg} |`); if (!ok) { fails++; console.log(`  FAIL ${name}: ${msg}`); } }
const f2 = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : String(x));

// the pieces as the city draws them (half extents, the box centre over the foot; the kits' feet run 0.3 m into the ground)
const SHAPES = {
  bin: { cx: 0, cy: 0.33, cz: 0, hx: 0.3, hy: 0.63, hz: 0.3 },            // bin_round: 0.6 m drum, 0.95 m tall, foot 0.3 m in
  cone: { cx: 0, cy: 0.26, cz: 0, hx: 0.15, hy: 0.26, hz: 0.15 },
  sign: { cx: 0, cy: 1.15, cz: 0, hx: 0.35, hy: 1.45, hz: 0.05 },         // a pole 2.6 m + plates, 0.3 m in
  bollard: { cx: 0, cy: 0.35, cz: 0, hx: 0.1, hy: 0.65, hz: 0.1 },
  moto: { cx: 0.07, cy: 0.6, cz: 0, hx: 0.42, hy: 0.6, hz: 1.06, wf: 0.72, wr: -0.72, stand: 1 },   // (its parked model leans 7 cm toward its stand)
  villo: { cx: 0, cy: 0.55, cz: 0.56, hx: 0.3, hy: 0.55, hz: 0.88, wf: 0.05, wr: 1.07 },
  chair: { cx: 0, cy: 0.42, cz: 0, hx: 0.22, hy: 0.42, hz: 0.24 },
  table: { cx: 0, cy: 0.37, cz: 0, hx: 0.35, hy: 0.37, hz: 0.35 },
};
const COLL = { bin: [0.3, 0.3], cone: [0.16, 0.16], sign: [0.08, 0.08], moto: [0.4, 1.06], villo: [0.3, 0.88], chair: [0.22, 0.24], table: [0.87, 0.37] };

/** a scene: walls (axis boxes [x0, z0, x1, z1]), props [{ cls, x, z, yaw }], lamps [[x, z]] */
function scene({ walls = [], props = [], lamps = [] } = {}) {
  const polys = walls.map(([x0, z0, x1, z1]) => ({ rings: [[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]], kind: 0 }));
  const world = OLD ? null : new PropWorld({ ground: () => 0 });
  const P = [], circles = [];
  for (const d of props) {
    const cls = CLASSES[d.cls], p = PropWorld.make(cls, d.x, 0, d.z, d.yaw || 0, "T");
    const S = SHAPES[d.cls]; p.shape = { ...S }; if (S.stand) p.shape.stand = S.stand;
    if (d.cls === "sign") p.extraMass = 6;
    const ref = { hidden: false, prop: world ? p : null };
    p.ref = ref;
    if (d.cls === "bollard") circles.push({ x: d.x, z: d.z, r: 0.1, kind: KIND.post, ref });
    else {
      const [hx, hz] = COLL[d.cls], c = Math.cos(d.yaw || 0), s = Math.sin(d.yaw || 0);
      const ring = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([u, v]) => [d.x + u * c + v * s, d.z - u * s + v * c]);
      polys.push({ rings: [ring], kind: KIND.furniture, base: -0.3, top: d.cls === "sign" ? 2.6 : 1.2, ref });
    }
    P.push(p);
  }
  for (const [x, z] of lamps) circles.push({ x, z, r: 0.2, kind: KIND.lamp });
  let col = buildColliders(polys, [], { x0: -300, x1: 300, z0: -300, z1: 300 });
  col = addCircles(col, circles);
  const sets = () => [col];
  if (world) world.sets = sets;
  // (rule 25) each prop's drive polygons (driveMode.js tileDrive) + a walker post of its drawn height (cityHook.js)
  if (world) {
    if (col.pref) for (let id = 0; id < col.P; id++) { const r = col.pref[id]; if (r?.prop) (r.drive ||= []).push([col, id, col.ptop[id], col.pbase[id]]); }
    for (const p of P) { const S = { off: new Uint8Array(1), iy: Float64Array.of(-0.5, (p.shape.cy + p.shape.hy)) }; p.ref.walk = [[S, 0, S.iy[1]]]; }
  }
  const env = createCarEnv({ sets, ground: () => 0, handling: HANDLING, feel: true, props: world, mass: () => CAR_M });
  return { world, env, P, col };
}
function player(W, x, z, h, v) {
  const c = createCtlState(x, z, h);
  c.y = 0;
  stepCtl(c, { throttle: 0, steer: 0 }, DT, W.env);
  c.x = x; c.z = z; c.heading = h; c.speed = v; c.vx = c.vz = 0; c.angularVel = 0;
  return c;
}
/** (rule 25) prop p's colliders stand for what is drawn: knocked / snapped / flattened = no drive collider found at its
 *  rest spot and its walker post off; bent = both still at its foot, their tops at the leaning post's drawn top; at rest
 *  = as built. -> null or what is wrong */
const colTally = { props: 0, bad: [], states: {} };
function colCheck(W, p) {
  if (!W.world) return null;
  colTally.props++; colTally.states[p.state] = (colTally.states[p.state] || 0) + 1;
  const L = [];
  gatherC(W.col, p.x, p.z, 0.5, L);
  let live = 0;
  for (let q = 0; q < L.length; q += 2) { const c = L[q], id = L[q + 1], r = id < c.P ? c.pref?.[id] : c.cref?.[id - c.P]; if (r === p.ref) live++; }
  const S = p.ref.walk[0][0], top0 = p.ref.walk[0][2], H = top0 - S.iy[0];
  const standing = p.state === 0 || (p.state === 3 && !p.ref.hidden);
  let err = null;
  if (!standing && (live || !S.off[0])) err = `state ${p.state}: ${live} drive collider(s) left, walker post ${S.off[0] ? "off" : "ON"}`;
  if (standing && (!live && p.cls.name !== "bollard" ? true : false)) err = `state ${p.state}: standing but no drive collider`;
  if (standing && S.off[0]) err = `state ${p.state}: standing but its walker post off`;
  if (p.state === 3 && !p.ref.hidden) {
    const want = S.iy[0] + H * Math.cos(p.theta);
    if (Math.abs(S.iy[1] - want) > 0.05) err = `bent ${(p.theta * DEG).toFixed(0)} deg: walker top ${S.iy[1].toFixed(2)} vs drawn ${want.toFixed(2)}`;
    for (const D of p.ref.drive || []) { const t = D[3] + (D[2] - D[3]) * Math.cos(p.theta); if (Math.abs(D[0].ptop[D[1]] - t) > 0.05) err = `bent: drive top ${D[0].ptop[D[1]].toFixed(2)} vs ${t.toFixed(2)}`; }
  }
  if (p.state === 0 && Math.abs(S.iy[1] - top0) > 1e-6) err = "at rest: walker top not restored";
  if (err) colTally.bad.push(`${p.cls.name}: ${err}`);
  return err;
}
/** run frames (no throttle: the car coasts); each(t) after each frame */
function run(W, c, secs, each = null, input = null) {
  for (let f = 0, t = 0; f < secs / DT; f++, t += DT) {
    if (c) stepCtl(c, input ? input(t, c) : { throttle: 0, steer: 0 }, DT, W.env);
    W.world?.frame(DT, c ? c.x : 0, c ? c.z : 0);
    each?.(t);
  }
}
/** a prop's foot pose now: displaced slot or rest; roll = the angle of its up axis from vertical (deg) */
function pose(W, p) {
  if (!W.world || p.d < 0) return { x: p.x, y: p.y, z: p.z, tilt: 0 };
  const w = W.world, q = p.d, x = w.dq[q * 4], y = w.dq[q * 4 + 1], z = w.dq[q * 4 + 2], ww = w.dq[q * 4 + 3];
  const upY = 1 - 2 * (x * x + z * z);
  return { x: w.dpos[q * 3], y: w.dpos[q * 3 + 1], z: w.dpos[q * 3 + 2], tilt: Math.acos(Math.max(-1, Math.min(1, upY))) * DEG };
}
/** hit prop `cls` head-on at v km/h (the car's front 1 m short of it, coasting): -> { p, d (m moved), tilt, maxY (COM
 *  height over its rest), keep (the car's speed `past` m beyond the prop / a ghost car's with no prop at that time),
 *  vMin / v0 } */
function hit(cls, kmh, o = {}) {
  const W = scene({ props: [{ cls, x: 0, z: 12, yaw: o.yaw || 0 }], ...(o.scene || {}) }), p = W.P[0];
  const ext = cls === "bollard" ? 0.1 : Math.abs(Math.cos(o.yaw || 0)) * COLL[cls][1] + Math.abs(Math.sin(o.yaw || 0)) * COLL[cls][0];
  const z0 = 12 - ext - 2.16 - 1.0, c = player(W, o.dx || 0, z0, 0, kmh * KMH);
  const G = scene(), g = player(G, o.dx || 0, z0, 0, kmh * KMH);
  let maxY = 0, vMin = c.speed, body = false, keep = null, maxTilt = 0;
  let tHit = -1;
  // (the driver brakes 0.4 s after a light / heavy prop flies off, as anyone would: the throw is the hit's, not a
  // car pushing it on; the ghost car brakes at the same time)
  const brake = o.brake ?? (CLASSES[cls].type !== "post");
  const inp = (t) => ({ throttle: brake && tHit >= 0 && t > tHit + 0.4 ? -1 : 0, steer: 0 });
  run(W, c, o.secs || 6, (t) => {
    if (tHit < 0 && p.state) tHit = t;
    stepCtl(g, inp(t), DT, G.env);
    if (p.d >= 0) maxTilt = Math.max(maxTilt, pose(W, p).tilt);
    if (p.slot >= 0) { body = true; maxY = Math.max(maxY, W.world.py[p.slot] - p.shape.cy); }
    if (keep === null && c.z + 2.16 > 12 + (o.past || 0) + 1.5) keep = c.speed / Math.max(1e-3, g.speed);
    vMin = Math.min(vMin, c.speed);
  }, inp);
  const P = pose(W, p);
  colCheck(W, p);
  return { W, p, c, d: Math.hypot(P.x - p.x, P.z - p.z), tilt: P.tilt, maxTilt, maxY, keep: keep ?? c.speed / Math.max(1e-3, g.speed), vMin, body, end: P };
}

// ---------------------------------------------------------------- 1 bins / cones
for (const [cls, v, dmin, ymin, keep] of [["bin", 20, 3, 0, 0.95], ["bin", 50, 8, 0.3, 0.95], ["cone", 20, 3, 0, 0.99], ["cone", 50, 8, 0.3, 0.99]]) {
  const r = hit(cls, v);
  check(`${cls} ${v} km/h`, r.d > dmin && r.d < dmin * 6 && r.maxY > ymin && r.maxTilt > 45 && r.keep > keep,
    `thrown ${f2(r.d)} m, up ${f2(r.maxY)} m, tumbled ${f2(r.maxTilt, 0)} deg (${f2(r.tilt, 0)} at rest); the car keeps ${f2(r.keep * 100, 1)} %`);
}
// ---------------------------------------------------------------- 2 sign posts
{
  const r = hit("sign", 20, { past: 2 });
  check("sign 20 km/h", r.p.state === 3 && r.p.ref.hidden && !r.body && r.keep > 0.75 && r.keep < 0.98 && r.tilt > 60,
    `bent over ${f2(r.tilt, 0)} deg (state ${r.p.state}, collider ${r.p.ref.hidden ? "off: flattened" : "on"}), never a body: ${!r.body}; the car keeps ${f2(r.keep * 100, 1)} %`);
  const s = hit("sign", 50);
  check("sign 50 km/h", s.body && s.d > 5 && s.keep > 0.85, `snapped: a body ${s.body}, thrown ${f2(s.d)} m; the car keeps ${f2(s.keep * 100, 1)} %`);
  const t = hit("sign", 5, { secs: 3 }, null);
  check("sign 5 km/h (coast)", t.p.state !== 2 && !t.body, `a slow push: bent ${f2(t.tilt, 0)} deg, state ${t.p.state} (0 rest / 3 bent), no body`);
}
// ---------------------------------------------------------------- 3 bollards
{
  const r = hit("bollard", 20, { past: 1 });
  check("bollard 20 km/h", !r.body && r.p.state === 3 && r.keep < 0.75, `bent ${f2(r.tilt, 0)} deg (state ${r.p.state}), no body; the car keeps ${f2(r.keep * 100, 0)} % (a stiff post: 24 kN)`);
  const s = hit("bollard", 50);
  check("bollard 50 km/h", s.body && s.d > 3, `snapped: a body ${s.body}, thrown ${f2(s.d)} m; the car keeps ${f2(s.keep * 100, 1)} %`);
}
// ---------------------------------------------------------------- 4 parked motorbikes (side on: the car hits its flank)
for (const v of [20, 50]) {
  const r = hit("moto", v, { yaw: Math.PI / 2, past: 0.5 });
  check(`parked moto ${v} km/h`, r.tilt > 55 && r.d > 1 && r.keep > 0.5 && r.keep < 0.95,
    `tipped ${f2(r.tilt, 0)} deg, slid ${f2(r.d)} m; the car keeps ${f2(r.keep * 100, 1)} % (190 kg vs ${CAR_M} kg)`);
}
{
  const W = scene({ props: [{ cls: "moto", x: 0, z: 0, yaw: 0.3 }] }), p = W.P[0];
  if (W.world) { W.world.wake(p); run(W, null, 3); }
  const P = pose(W, p);
  check("parked moto stands", OLD || (Math.abs(P.tilt) < 25 && Math.hypot(P.x, P.z) < 0.1 && p.slot < 0), `woken with no push: stays on its stand (tilt ${f2(P.tilt, 1)} deg, moved ${f2(Math.hypot(P.x, P.z) * 100, 1)} cm, asleep ${p.slot < 0})`);
}
// ---------------------------------------------------------------- 5 Villo bike, terrace
{
  const r = hit("villo", 15, { yaw: Math.PI / 2 });
  check("Villo bike 15 km/h", r.tilt > 55 && r.d > 0.8, `toppled ${f2(r.tilt, 0)} deg, ${f2(r.d)} m from its dock`);
  const W = scene({ props: [{ cls: "table", x: 0, z: 12 }, { cls: "chair", x: -0.56, z: 12, yaw: Math.PI / 2 }, { cls: "chair", x: 0.56, z: 12, yaw: -Math.PI / 2 }] });
  if (W.world) W.P[0].group = [W.P[1], W.P[2]];
  const c = player(W, 0, 0, 0, 30 * KMH);
  run(W, c, 5);
  const moved = W.P.map((p) => Math.hypot(pose(W, p).x - p.x, pose(W, p).z - p.z));
  check("terrace 30 km/h", moved.every((d) => d > 0.5), `table ${f2(moved[0])} m, chairs ${f2(moved[1])} / ${f2(moved[2])} m`);
  // a table woken by anything else (a neighbour flying into it: browser turn 1) wakes its chairs too
  const W2 = scene({ props: [{ cls: "table", x: 0, z: 12 }, { cls: "chair", x: -0.56, z: 12, yaw: Math.PI / 2 }, { cls: "chair", x: 0.56, z: 12, yaw: -Math.PI / 2 }] });
  let woke = [0, 0, 0];
  if (W2.world) { W2.P[0].group = [W2.P[1], W2.P[2]]; W2.world.wake(W2.P[0]); woke = W2.P.map((p) => p.state); }
  check("terrace chairs follow", woke.every((st) => st === 1), `a table woken by a chain (not the car): states ${woke.join(" / ")} (1 = awake)`);
}
// ---------------------------------------------------------------- 6 a lamp still stops the car
for (const v of [20, 50]) {
  const W = scene({ lamps: [[0, 12]] }), c = player(W, 0, 0, 0, v * KMH);
  let vMin = Infinity;
  run(W, c, 3, () => { if (c.z > 8) vMin = Math.min(vMin, Math.abs(c.speed)); });
  check(`lamp ${v} km/h`, vMin < 0.3 * v * KMH && c.z < 12, `the car stopped at the lamp: ${f2(vMin)} m/s at least, front at z ${f2(c.z + 2.15)} (lamp 12)`);
}
// ---------------------------------------------------------------- 7 the walker
{
  const W = scene({ props: [{ cls: "cone", x: 0, z: 2 }, { cls: "bin", x: 3, z: 2 }] });
  let moved = [0, 0];
  if (W.world) {
    for (const [i, x0] of [[0, 0], [1, 3]]) {
      for (let f = 0, z = 0; f < 120; f++, z += 1.5 * DT) { W.world.walk(x0, 0, z, 0, 1.5, W.P); W.world.frame(DT, x0, z); }
    }
    run(W, null, 3);
    moved = W.P.map((p) => { const P = pose(W, p); return Math.max(Math.hypot(P.x - p.x, P.z - p.z), P.tilt / 90); });
  }
  check("walker kicks", moved[0] > 0.3 && moved[1] > 0.3, `a walker at 1.5 m/s into a cone / a bin: moved / tipped ${f2(moved[0])} / ${f2(moved[1])}`);
}
// ---------------------------------------------------------------- 7b a two-wheeler (its env: two, 300 kg) knocks a bin / cone; a parked moto is a wall for it
{
  const W = scene({ props: [{ cls: "cone", x: 0, z: 12 }, { cls: "bin", x: 0, z: 24 }, { cls: "moto", x: 0, z: 75, yaw: Math.PI / 2 }] });
  const env2 = createCarEnv({ sets: () => [W.col], ground: () => 0, handling: HANDLING, feel: true, props: W.world, mass: () => 300, two: true, dims: { hx: 0.4, hz: 1.06 } });
  const c = createCtlState(0, 8, 0); c.y = 0; stepCtl(c, { throttle: 0, steer: 0 }, DT, env2); c.x = 0; c.z = 8; c.heading = 0; c.speed = 30 * KMH; c.vx = c.vz = 0;
  let v0 = c.speed, vAfterBin = null;
  for (let f = 0; f < 600; f++) { stepCtl(c, { throttle: 0.35, steer: 0 }, DT, env2); W.world?.frame(DT, c.x, c.z); if (vAfterBin === null && c.z > 26) vAfterBin = c.speed; }
  const moved = W.P.slice(0, 2).map((p) => Math.hypot(pose(W, p).x - p.x, pose(W, p).z - p.z));
  check("bike knocks light props", moved[0] > 1 && moved[1] > 1 && W.P[2].state === 0, `a 300 kg bike at 30 km/h: cone ${f2(moved[0])} m, bin ${f2(moved[1])} m; speed ${f2(v0)} -> ${f2(vAfterBin ?? NaN)} m/s past the bin; the parked moto ${W.P[2].state === 0 ? "a wall (its crash rules)" : "woken"}`);
}
// ---------------------------------------------------------------- 8 walls / ground / NaN / sleep: random hits
{
  let R = 12345;
  const rnd = () => ((R = (R * 1103515245 + 12345) % 2147483648) / 2147483648);
  const names = ["bin", "cone", "sign", "bollard", "moto", "villo", "chair", "scooter"];
  let bad = 0, inWall = 0, under = 0, awakeLate = 0, runs = 0, deepest = 0, lowest = 0, hits = 0;
  const walls = [[-30, 20, 30, 24], [8, -30, 11, 40], [-14, -30, -11, 40]];
  for (let n = 0; n < (OLD ? 20 : 400); n++) {
    const cls = names[Math.floor(rnd() * names.length)];
    const W = scene({ walls, props: [{ cls: cls === "scooter" ? "moto" : cls, x: (rnd() - 0.5) * 8, z: 10 + rnd() * 6, yaw: rnd() * 6.28 }] });
    const p = W.P[0];
    if (cls === "scooter" && W.world) { p.cls = CLASSES.scooter; p.shape.stand = 0; }
    const ang = (rnd() - 0.5) * 1.2, v = (5 + rnd() * 85) * KMH, c = player(W, p.x - Math.sin(ang) * 10, p.z - 10 * Math.cos(ang), ang, v);
    let lastHit = 0, t = 0;
    run(W, c, 9, (tt) => {
      t = tt;
      if (!W.world) return;
      if (p.slot >= 0 && Math.hypot(W.world.vx[p.slot], W.world.vz[p.slot]) > 0.5) lastHit = tt;
    }, (tt) => ({ throttle: tt < 2 ? 0.6 : 0, steer: 0 }));
    runs++;
    if (!W.world) continue;
    colCheck(W, p);
    if (p.state) hits++;
    const w = W.world;
    for (const a of [c.x, c.z, c.speed, w.dpos[0], w.dpos[1], w.dpos[2], w.dq[0], w.dq[3]]) if (!Number.isFinite(a)) bad++;
    if (p.slot >= 0) { if (t - lastHit > 8) awakeLate++; w.sleepAll = true; w.frame(DT); }
    // the end pose: every contact point over the ground, the footprint out of the walls
    if (p.d >= 0 && p.state === 2) {                    // (a bent post stays in the ground at its foot: not a body)
      const k = w.wake(p);
      if (k >= 0) {
        w.rot(k);
        const n0 = w.npt[k], Pt = w.pts, o = k * 16 * 3, Rm = w.R;
        for (let i = 0; i < n0; i++) { const y = w.py[k] + Rm[1] * Pt[o + i * 3] + Rm[4] * Pt[o + i * 3 + 1] + Rm[7] * Pt[o + i * 3 + 2]; lowest = Math.min(lowest, y); }
        const B = w.footprint(k);
        for (const [x0, z0, x1, z1] of walls) {
          const ex = B.hx * Math.abs(B.cos) + B.hz * Math.abs(B.sin), ez = B.hx * Math.abs(B.sin) + B.hz * Math.abs(B.cos);
          const ix = Math.min(w.px[k] + ex, x1) - Math.max(w.px[k] - ex, x0), iz = Math.min(w.pz[k] + ez, z1) - Math.max(w.pz[k] - ez, z0);
          if (ix > 0 && iz > 0) deepest = Math.max(deepest, Math.min(ix, iz));
        }
        w.sleep(k);
      }
    }
  }
  inWall = deepest > 0.05 ? 1 : 0; under = lowest < -0.03 ? 1 : 0;
  check("walls / ground", !OLD && !inWall && !under, `${runs} random hits (${hits} props hit): deepest in a wall at the end ${f2(deepest * 100, 1)} cm, lowest contact point ${f2(lowest * 100, 1)} cm under the ground`);
  check("no NaN", !OLD && bad === 0, `${bad} non-finite values after ${runs} hits`);
  check("sleep", !OLD && awakeLate === 0, `${awakeLate} bodies still awake 8 s after their last hit (sleep below ${PROP.sleepV} m/s, ${PROP.sleepW} rad/s for ${PROP.sleepT} s)`);
}
check("colliders follow (rule 25)", !OLD && colTally.props > 300 && !colTally.bad.length, `${colTally.props} props after their hits (states ${JSON.stringify(colTally.states)}: 0 rest, 2 knocked / snapped, 3 bent): ${colTally.bad.length} with a collider where nothing is drawn${colTally.bad.length ? ": " + colTally.bad.slice(0, 3).join(" / ") : " (knocked / snapped / flattened: drive collider + walker post off; bent: at its foot, tops at the drawn lean)"}`);
// ---------------------------------------------------------------- 9 cost + allocation: 24 awake bodies
{
  const props = [];
  for (let i = 0; i < 24; i++) props.push({ cls: ["bin", "cone", "moto", "chair", "sign", "villo"][i % 6], x: (i % 6) * 3 - 8, z: Math.floor(i / 6) * 4 + 6, yaw: i });
  const W = scene({ walls: [[-30, 30, 30, 34], [12, -10, 15, 40]], props });
  let ms = NaN, bytes = [NaN];
  if (W.world) {
    const w = W.world;
    const kick = () => {
      for (const p of W.P) { if (p.state) w.reset(p); }
      for (let i = 0; i < W.P.length; i++) { const k = w.wake(W.P[i]); w.vx[k] = Math.sin(i) * 6; w.vz[k] = 4 + (i % 3); w.vy[k] = 2; w.wx[k] = i % 4; w.still[k] = 0; }
    };
    kick();
    for (let i = 0; i < 240; i++) w.substep(1 / 120);          // (JIT warm)
    kick();
    const t0 = performance.now(), M = 2400;
    for (let i = 0; i < M; i++) { if (i % 600 === 0) kick(); w.substep(1 / 120); }
    ms = (performance.now() - t0) / M * 2;                    // a 60 fps frame = 2 substeps
    const { Session } = await import("node:inspector/promises");
    const ses = new Session(); ses.connect();
    await ses.post("HeapProfiler.enable");
    bytes = [];
    for (let m = 0; m < 3; m++) {
      kick();
      await ses.post("HeapProfiler.startSampling", { samplingInterval: 64 });
      for (let i = 0; i < 20000; i++) { if (i % 2000 === 0) { for (let k = 0; k < 24; k++) if (w.act[k]) { w.vx[k] = 5; w.vy[k] = 3; w.still[k] = 0; } } w.substep(1 / 120); }
      const { profile } = await ses.post("HeapProfiler.stopSampling");
      let b = 0;
      const ours = /\/(propWorld|colliders|obb)\.js$/;
      const walk = (n, inOurs) => { const o = inOurs || ours.test(n.callFrame.url); if (o) b += n.selfSize; for (const c of n.children) walk(c, o); };
      walk(profile.head, false);
      bytes.push(b);
    }
    ses.disconnect();
  }
  check("allocation", Math.min(...bytes) < 2048, `20 000 substeps x 24 awake bodies: ${bytes.join(" / ")} bytes in propWorld / colliders / obb (V8 sampling heap profiler, 64 B)`);
  check("cost", ms < 0.1, `24 awake bodies (ground points, walls, pairs): ${f2(ms, 3)} ms per 60 fps frame (2 substeps)`);
}
// ---------------------------------------------------------------- 10 instance writes: update ranges only
{
  const { buildSource, StreamPool } = await import("../viewer/instanceStream.js");
  const { InstancedBufferAttribute } = await import("three/webgpu");
  let ok = false, msg = "no patch API (?props=old)";
  const n = 300, M = new Float32Array(n * 16), cen = new Float32Array(n * 4), V = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { M[i * 16] = M[i * 16 + 5] = M[i * 16 + 10] = M[i * 16 + 15] = 1; M[i * 16 + 12] = (i % 20) * 7; M[i * 16 + 14] = Math.floor(i / 20) * 7; cen.set([M[i * 16 + 12], 0, M[i * 16 + 14], 1], i * 4); V[i * 4] = i; }
  const src = buildSource(n, { instanceMatrix: [M, 16], iVar: [V, 4] }, cen);
  const mesh = { count: 0, visible: false, instanceMatrix: null, geometry: { attributes: {}, setAttribute(k, a) { this.attributes[k] = a; } }, boundingSphere: null };
  const pool = new StreamPool("t", [{ mesh, l0: 0, l1: 500, attrs: [["instanceMatrix", "instanceMatrix", 16], ["iVar", "iVar", 4]] }], 1, 6);
  const it = pool.gather([{ src }], { x: 60, y: 0, z: 50 }, () => false); while (!it.next().done);
  if (!OLD && typeof pool.patch === "function") {
    const A = mesh.instanceMatrix;
    A.clearUpdateRanges();
    const i = 137, j = src.inv[i], m16 = new Float32Array(16); m16[15] = 1; m16[12] = M[i * 16 + 12]; m16[14] = M[i * 16 + 14];
    const done = pool.patch(src, j, "instanceMatrix", m16);
    const rg = A.updateRanges;
    // where it is in the pool now: its columns there (the iVar copy carries the instance's index)
    let at = -1; const Vb = mesh.geometry.attributes.iVar.array; for (let q = 0; q < mesh.count; q++) if (Vb[q * 4] === i) at = q;
    ok = done === 1 && rg.length === 1 && rg[0].count === 16 && at >= 0 && rg[0].start === at * 16 && A.array[at * 16] === 0 && src.cols.instanceMatrix[j * 16] === 0;
    const { readFileSync } = await import("node:fs");
    const code = ["../viewer/props/cityProps.js", "../viewer/props/propWorld.js", "../viewer/instanceStream.js"].map((f) => readFileSync(new URL(f, import.meta.url), "utf8")).join("\n");
    const dyn = /DynamicDrawUsage/.test(code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""));
    const proxyRanges = /addUpdateRange/.test(readFileSync(new URL("../viewer/props/cityProps.js", import.meta.url), "utf8"));
    ok = ok && !dyn && proxyRanges;
    msg = `a woken prop's instance hidden in its pool: ${done} live copy patched, ${rg.length} update range of ${rg[0]?.count} floats at ${rg[0]?.start} (instance at ${at}), the source column too; DynamicDrawUsage in the props code: ${dyn}; the proxies write update ranges: ${proxyRanges}`;
  }
  check("ranges", ok, msg);
}

// ---------------------------------------------------------------- 11 the city glue on real three.js objects (tools/props/glueSmoke.mjs)
{
  let ok = false, msg = "no props glue (?props=old)";
  if (!OLD) {
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync(process.execPath, ["--import", "./tools/christmas/hook.mjs", "tools/props/glueSmoke.mjs"], { cwd: new URL("..", import.meta.url), encoding: "utf8", timeout: 120000 });
    const lines = ((r.stdout || "") + (r.stderr || "")).trim().split(/\r?\n/);
    ok = r.status === 0;
    msg = ok ? `cityProps.js on real three.js pools / meshes: hide by one range, proxies draw + move (ranges), shape from the drawn geometry, sleep, reset on tile unload (${lines.filter((l) => l.startsWith("pass")).length} pass)` : lines.filter((l) => /FAIL|Error/.test(l)).slice(0, 3).join(" / ");
  }
  check("glue", ok, msg);
}

console.log(`\n## propsTest${OLD ? " --old (?props=old)" : ""} (docs/PROPS.md, rule physics-props)\n| check | result | measured |\n|---|---|---|\n${out.join("\n")}`);
if (!QUIET || fails) console.log(fails ? `\n${fails} check(s) FAILED` : "\nall checks pass");
process.exitCode = fails ? 1 : 0;
