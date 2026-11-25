// node --preserve-symlinks --import ./tools/characters/threeHook.mjs tools/falconCityTest.mjs [--quiet] [--trace]
// THE FALCON SWITCHES IN THE CITY GAME (gate row `falconcity`; rule docs/rules/falcon-gym.md "the gym in the city" and
// "the v2 in the city"): ?falconctl=gym|current and ?falconmodel=v2|current, headless.
// A small test street as the city's falcon world answers it (cityStream.js CityFalconWorld's face: floor / ground /
// column with the crowns, treeList / treePerches, roosts, the tiles' façade kit placements and drawn lamps): a 12 m
// street between two rows of houses (flat roofs 11 m west, pitched 9-13 m east), a 4 m alley through the west row, the
// west façade's window sills (the façade kit's `sill` pieces) on two floors, balconies on the east, a street tree, a lamp,
// the square beyond with its pigeons. Both controllers fly it through the game's own FalconGame (falconGame.js):
//   gym      take-off from the street and from the alley (nearly vertical there), perch on a sill (E) and launch off it,
//            a 300 m stoop over the town, the fun catch (the simple player of tools/falconFunTest.mjs), the ledge pool's
//            slices (no spike) and its fixed pools
//   current  take-off from the street, the stoop, the catch (as before)
//   v2       the real v2 rig (models/bird/v2/falcon_v2.glb, gymBird.js): the caught bird held IN its talons on its own
//            foot bones through a 7 s carry, its Talons clip as the strike pose, its far LOD on the same skeleton
// Self-tests: the gym on the raw city world (no pads) cannot stand on a sill (it falls: why the pads exist); the defaults
// are current / current.
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const args = process.argv.slice(2), QUIET = args.includes("--quiet"), TRACE = args.includes("--trace");
globalThis.location = { search: "" };
let seed = 1;
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const el = () => ({ style: { setProperty() {} }, append() {}, classList: { add() {}, remove() {}, toggle() {} } });
if (!globalThis.document?.body) globalThis.document = { ...(globalThis.document || {}), createElement: el, body: el(), head: el() };
const THREE = await import("three/webgpu");
const { FalconGame } = await import("../viewer/falconFlight/falconGame.js");
const { Pigeons } = await import("../viewer/falconFlight/pigeons.js");
const { FlightControls } = await import("../viewer/falconFlight/flightModel.js");
const { CityGymWorld } = await import("../viewer/falconFlight/cityGymWorld.js");
const { FUN } = await import("../viewer/falconFlight/falconFun.js");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const still = { sample: (x, y, z, t, o) => { o.x = 0; o.y = 0; o.z = 0; return o; } };

// ------------------------------------------------------------------------------------------------ the test street
// x east, z south, heading 0 = -z. West row x -26..-6 (flat roof 11 m), z -150..50, the alley z -20..-16 through it;
// east row x 6..26 (eaves 9, ridge 13 along z at x 16). The square: x -60..60, z -260..-160.
const ground = (x, z) => 0.01 * Math.max(0, z + 150) * 0.2;            // a gentle slope up the street (2 cm / 10 m)
function roof(x, z) {
  if (x > -26 && x < -6 && z > -150 && z < 50 && !(z > -20 && z < -16)) return ground(-6, z) + 11;
  if (x > 6 && x < 26 && z > -150 && z < 50) return ground(6, z) + 13 - 4 * Math.abs(x - 16) / 10;
  return 0;
}
const TREE = { x: 3, z: 20, cy: 8, Rh: 3.5, Rv: 3 };
const SILLS = [], BALC = [];
for (let z = -140; z <= 40; z += 4.5) for (const y of [4.2, 7.4]) if (!(z > -22 && z < -14)) SILLS.push(-6, ground(-6, z) + y, z, 1, 0, 1.2, 1.6, 0, 0.5, 0, 0, 0, 0, 0);
for (let z = -120; z <= 30; z += 15) BALC.push(6, ground(6, z) + 3.6, z, -1, 0, 1.2, 2.3, 0, 0.5, 0, 0, 0, 0, 0);
const W = {
  floor: (x, z) => Math.max(ground(x, z), roof(x, z)), ground, roosts: [],
  treeList: [{ x0: -200, z0: -300, cell: 600, nx: 1, nz: 1, start: [0, 1], idx: [0], T: [TREE.x, TREE.z, TREE.cy, TREE.Rh, TREE.Rv, TREE.x, TREE.z, 0.3], n: 1 }],
  tiles: [{ name: "T", bounds: { x0: -300, x1: 300, z0: -400, z1: 200 }, kit: { stride: 14, pieces: { sill: new Float32Array(SILLS), balcony: new Float32Array(BALC) } }, drawn: { lamps: [{ x: 4.5, y: ground(4.5, -90), z: -90, yaw: 0 }] } }],
  lampTop: { x: 0, y: 4.6, z: 0.4, n: 1 },
  _o: { floor: 0, ceil: Infinity, brush: 0, tree: null, ceilTree: null, open: false },
  column(x, z, y) {
    const o = this._o; o.ceil = Infinity; o.brush = 0; o.tree = null; o.ceilTree = null;
    let h = this.floor(x, z);
    const t = TREE, dx = x - t.x, dz = z - t.z, d2 = dx * dx + dz * dz;
    if (d2 < 0.09 && t.cy > h) { h = t.cy; o.tree = 0; }
    if (d2 < t.Rh * t.Rh) {
      const dy = (y - t.cy) / t.Rv, q2 = d2 / (t.Rh * t.Rh) + dy * dy;
      if (q2 < 1) o.brush = 1 - Math.sqrt(q2);
      const a = t.Rh * 0.6, s2 = d2 / (a * a);
      if (s2 < 1) { const hv = t.Rv * 0.85 * Math.sqrt(1 - s2), lo = t.cy - hv, hi = t.cy + hv; if (y >= lo) { if (hi > h) { h = hi; o.tree = 0; } } else if (lo < o.ceil) { o.ceil = lo; o.ceilTree = 0; } }
    }
    o.floor = h; return o;
  },
  floorAt(x, z, y) { return this.column(x, z, y).floor; },
  _tp: [],
  treePerches(x, z, R) { const o = this._tp; o.length = 0; if (Math.hypot(TREE.x - x, TREE.z - z) < R) o.push(this._tq ??= { name: "tree", pos: new THREE.Vector3(TREE.x, TREE.cy + TREE.Rv * 0.85, TREE.z), yaw: 0, tree: true }); return o; },
};
function roosts() {
  const out = [];
  for (let z = -146; z < 46; z += 1.6) out.push({ x: 16, y: ground(6, z) + 13.02, z, yaw: 0, kind: "ridge" });
  for (let k = 0; k < 160; k++) out.push({ x: -50 + Math.random() * 100, y: 0.01, z: -250 + Math.random() * 80, yaw: k * 3.1, kind: "ground" });
  return out;
}
W.roosts = roosts();

function fakeBird() { return { prey: null, downstroke: false, setSpan() {}, pose() {}, carry() { this.prey ??= {}; }, drop() { const p = this.prey; this.prey = null; return p; } }; }
function fakeInput() {
  const C = new FlightControls();
  return { C, intent: { turn: 0, vert: 0, climb: 0, stoop: 0, half: 0, brake: 0, aim: null }, aim: { yaw: 0, pitch: 0 }, talons: false, actions: new Set(), script: null,
    update() { return C; }, take(a) { const h = this.actions.has(a); this.actions.delete(a); return h; }, syncAim(y, p) { this.aim.yaw = y; this.aim.pitch = p; } };
}
function game(ctl, pigeons = null, gymWorld = null) {
  const inp = fakeInput(), bird = fakeBird();
  const g = new FalconGame({ world: W, air: still, bird, pigeons, fam: null, audio: null, input: inp, ctl, gymWorld });
  g.f.P = { ...g.f.P, stamina: { ...g.f.P.stamina, drain: 0.045, regen: 0.05 } };
  return { g, inp, f: () => g.f };
}
const DT = 1 / 60;
const clearI = (inp) => { const I = inp.intent; I.turn = 0; I.vert = 0; I.climb = 0; I.stoop = 0; I.half = 0; I.brake = 0; I.aim = null; inp.talons = false; inp.C.flap = 0; inp.C.fold = 0; inp.C.brake = 0; inp.C.pitch = 0; inp.C.roll = 0; };
const agl = (f) => f.pos.y - W.floor(f.pos.x, f.pos.z);

// ------------------------------------------------------------------------------------------------ the take-off
/** standing at (x, z) facing yaw, take off (gym: a Space press; current: E), fly hands-off; the run's numbers */
function takeoff(ctl, x, z, yaw, T = 8, roofY = 11) {
  const { g, inp } = game(ctl);
  g.gw?.rebuild(x, z);
  g.perchOn({ name: "ground", pos: new THREE.Vector3(x, W.floor(x, z), z), yaw, roof: false });
  let vhBelow = 0, firstFly = -1, over = -1, touch = 0, tumbles = 0, wasFly = false, maxAgl = 0;
  const say = g.say.bind(g); g.say = (s) => { if (/tumbl|hit /.test(s)) tumbles++; say(s); };
  for (let k = 0; k < T * 60; k++) {
    clearI(inp);
    // (gym: Space pressed, then held 4 s: the power climb, as a player gets over the roofs; current: E, then Space held)
    if (k === 30 && ctl !== "gym") inp.actions.add("land");
    if (k >= 30 && k < 30 + 4 * 60 && (ctl === "gym" || k > 40)) { inp.C.flap = 1; inp.intent.climb = 1; if (ctl === "gym" && k > 90) inp.intent.vert = 1; }
    g.update(DT, null);
    const f = g.f, fly = g.mode === "fly";
    if (fly && firstFly < 0) firstFly = k * DT;
    if (wasFly && !fly && g.mode === "perch") touch++;
    wasFly = fly;
    if (fly && f.pos.y < roofY + W.ground(x, z) - 1) vhBelow = Math.max(vhBelow, Math.hypot(f.vel.x, f.vel.z));
    if (fly && over < 0 && f.pos.y > roofY + W.ground(x, z) + 2) over = k * DT;
    if (fly) maxAgl = Math.max(maxAgl, agl(f));
    if (TRACE && k % 20 === 0) console.log(`  [${ctl} ${(k * DT).toFixed(2)}] ${g.mode}/${f.mode ?? ""} p(${f.pos.x.toFixed(1)},${f.pos.y.toFixed(1)},${f.pos.z.toFixed(1)}) V${f.V.toFixed(1)}`);
  }
  const f = g.f;
  return { firstFly, over, vhBelow, touch, tumbles, end: g.mode, agl: agl(f), maxAgl };
}

// ------------------------------------------------------------------------------------------------ the sill
/** gym: flying slowly along the west façade, E: the landing onto a ledge ahead; where it stands, 4 s later, the launch */
function sill(gymWorld = null) {
  const { g, inp } = game("gym", null, gymWorld);
  g.start(-1, 9, -40, 0, 10, 0);
  g.gw.rebuild(-1, -60);
  let landed = -1, on = null, after = null, launched = false, flyAgl = 0;
  for (let k = 0; k < 14 * 60; k++) {
    clearI(inp);
    const f = g.f;
    if (k === 10) inp.actions.add("land");
    if (landed < 0 && g.mode === "perch") { landed = k * DT; on = { x: f.pos.x, y: f.feetY, z: f.pos.z }; }
    if (landed >= 0 && k * DT > landed + 4 && !after) after = { mode: f.mode, y: f.feetY, x: f.pos.x, z: f.pos.z };
    // (Space: the launch off the sill, then held: power; the player's mouse aims up the street, off the facing wall)
    if (after && k * DT < landed + 6) { inp.C.flap = 1; if (k * DT > landed + 4.3) { inp.intent.aim = inp.aim; inp.aim.yaw = 0; inp.aim.pitch = 0.35; } }           // (Space: the launch off the sill, then held: power)
    g.update(DT, null);
    if (after && !launched && g.mode === "fly") launched = true;
    if (after && k * DT > landed + 7) flyAgl = Math.max(flyAgl, agl(f));
    if (TRACE && k % 20 === 0) console.log(`  [sill ${(k * DT).toFixed(2)}] ${g.mode}/${f.mode} p(${f.pos.x.toFixed(2)},${f.pos.y.toFixed(2)},${f.pos.z.toFixed(2)}) V${f.V.toFixed(1)}`);
  }
  // the nearest sill ledge to where it stands
  let dS = Infinity, kind = "";
  if (on) for (let i = 0; i < SILLS.length; i += 14) { const d = Math.hypot(SILLS[i] + 0.06 - on.x, SILLS[i + 1] - on.y, SILLS[i + 2] - on.z); if (d < dS) dS = d; }
  if (on) for (const l of g.gw.ledges) if (Math.hypot(l.x - on.x, l.y - on.y, l.z - on.z) < 0.2) kind = l.kind;
  return { landed, on, dS, kind, after, launched, flyAgl, end: g.mode, stays: !!(after && on && after.mode === "ground" && Math.abs(after.y - on.y) < 0.05) };
}

// ------------------------------------------------------------------------------------------------ the stoop
/** from h m over the town, Shift held, the aim down at -1.35 rad toward the square; let go when the guard pulls out */
function stoop(ctl, h = 300) {
  const { g, inp } = game(ctl);
  g.start(0, h, 100, 0, 18, 0);
  let vmax = 0, minAgl = 1e9, tumbles = 0, released = false;
  const say = g.say.bind(g); g.say = (s) => { if (/tumbl|hit |touched/.test(s)) tumbles++; say(s); };
  for (let k = 0; k < 30 * 60; k++) {
    clearI(inp);
    const f = g.f;
    if (!released) { inp.intent.aim = inp.aim; inp.aim.yaw = 0; inp.aim.pitch = -1.35; inp.intent.stoop = 1; inp.C.fold = 1; if (ctl === "gym" ? f.guarding : f.V > 60 && agl(f) < 60) released = true; }
    g.update(DT, null);
    vmax = Math.max(vmax, g.f.V); minAgl = Math.min(minAgl, agl(g.f));
  }
  return { kmh: Math.round(vmax * 3.6), minAgl: +minAgl.toFixed(1), tumbles, end: g.mode };
}

// ------------------------------------------------------------------------------------------------ the catch
/** the simple player of falconFunTest.mjs over the square: look at the lock (or the arrow), hold the strike button */
function hunt(ctl, sd, T = 90) {
  seed = sd;
  W.roosts = roosts();
  const P = new Pigeons({ world: W, roosts: W.roosts, home: { x: 0, z: -210 }, count: 120, scale: 1.4, ground: 0.4 });
  P.flockHomes = [{ x: 0, z: -210, r: 45, h: 28, w: 0.12 }, { x: 25, z: -230, r: 38, h: 40, w: -0.14 }];
  const { g, inp } = game(ctl, P);
  g.start(0, 30, -120, 0, 14, 0);
  let first = -1, crashes = 0;
  const say = g.say.bind(g); g.say = (s) => { if (/^hit |tumbl/.test(s)) crashes++; say(s); };
  const tmp = { x: 0, y: 0, z: 0 }, falcon = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, speed: 0, stoop: false };
  let age = -1;
  for (let real = 0; real < T; real += DT) {
    clearI(inp);
    const f = g.f;
    if (g.mode === "perch") { if (ctl === "gym") inp.C.flap = (Math.floor(real * 4) % 2) ? 1 : 0; else inp.actions.add("land"); }
    let tx = null;
    if (g.target >= 0) { P.pos(g.target, tmp); tx = tmp; } else if (g.fun.arrow.on) tx = g.fun.arrow;
    inp.talons = g.target >= 0;
    if (tx) {
      const dx = tx.x - f.pos.x, dy = tx.y - f.pos.y, dz = tx.z - f.pos.z, hd = Math.hypot(dx, dz), a = agl(f);
      inp.aim.yaw = Math.atan2(-dx, -dz); inp.aim.pitch = clamp(Math.atan2(dy, hd), -1.4, 0.5);
      if (g.target < 0) inp.aim.pitch = a < 22 ? 0.2 : a > 45 ? clamp(Math.atan2(dy, hd), -1.2, 0) : 0;
      inp.intent.aim = inp.aim;
      if (g.target < 0 && a < 12) { inp.intent.climb = 1; inp.C.flap = 1; }
    }
    if (age >= 0) { age += DT; const S = FUN.strike; g.timeScale = age < S.hold ? S.slow : Math.min(1, S.slow + (age - S.hold) / S.ease); if (g.timeScale >= 1) { g.timeScale = 1; age = -1; } }
    const n0 = g.score.catches;
    g.update(DT, null);
    if (g.score.catches > n0) { if (first < 0) first = real; age = 0; }
    falcon.x = f.pos.x; falcon.y = f.pos.y; falcon.z = f.pos.z; falcon.vx = f.vel.x; falcon.vy = f.vel.y; falcon.vz = f.vel.z; falcon.speed = f.V; falcon.stoop = f.fold > 0.7;
    P.update(DT * g.timeScale * g.fun.slowK, real, falcon, null, false);
  }
  return { first, catches: g.score.catches, crashes, maxKmh: Math.round(g.score.maxSpeed * 3.6) };
}

// ------------------------------------------------------------------------------------------------ the ledge pool
function pool() {
  const gw = new CityGymWorld(W);
  const A = gw.ledges, B = gw._back;
  let steps = 0;
  for (let k = 0; k < 60; k++) { const x = -1, z = -140 + k * 3; for (let s = 0; s < 400 && !gw.update(x, z, 12, k * 0.5, 400); s++) steps++; gw.at.t = -1e9; }
  const kinds = {};
  for (const l of gw.ledges) if (l.k >= 0) kinds[l.kind] = (kinds[l.kind] || 0) + 1;
  return { builds: gw.stats.builds, maxWork: gw.stats.maxWork, same: (gw.ledges === A || gw.ledges === B) && (gw._back === A || gw._back === B), kinds, steps };
}

// ------------------------------------------------------------------------------------------------ v2
let V2 = null;
async function v2bird() {
  if (V2) return V2;
  const { register } = await import("node:module");
  register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, n) { if (s === "meshoptimizer/simplifier") return { url: "data:text/javascript," + encodeURIComponent("export const MeshoptSimplifier = { ready: Promise.resolve(), simplify: (i) => [i, 0] };"), shortCircuit: true }; return n(s, c); }`));
  THREE.TextureLoader.prototype.loadAsync = async function () { return new THREE.Texture(); };
  const warn = console.error; console.error = () => {};
  const { GymBird } = await import("../viewer/falconGym/gymBird.js");
  // (the KTX2 textures stubbed: the skin, the rig and the clips are what the grip needs)
  const ktx2 = { load(u, ok) { ok(new THREE.Texture()); }, loadAsync: async () => new THREE.Texture(), setPath() { return this; }, setCrossOrigin() { return this; }, setWithCredentials() { return this; }, setRequestHeader() { return this; } };
  const b = await GymBird.create("v2", 1.0, null, "juvenile", { ktx2 });
  console.error = warn;
  return (V2 = b);
}
/** the falconfun row's grip() on the v2 rig: struck 3.7 m off, then 7 s of banks, dives, flaps, a landing flare, a perch,
 *  the take-off; the held pigeon's belly to the grip, falcon body vertices inside it, the strike's blend step */
async function v2grip() {
  const b = await v2bird();
  b.setSpan(2.0);
  const pos = new THREE.Vector3(0, 40, 0), fl = { gamma: -0.1, alpha: 0.1, phi: 0, heading: 0, fold: 0.2, flapLevel: 1, brake: 0, V: 25, walkV: 0 };
  b.pose(1 / 60, pos, fl, { mode: "fly", talons: 1, strike: 1 });
  b.carry(null, null, { x: 2, y: 38.5, z: -3 }, { shape: "square", scale: 1.4, tint: [1, 1, 1] });
  const legsRe = /Leg|Foot|Toe|Thigh|Tars|Digit/i, body = [];
  for (const m of b.meshes) {
    const P = m.geometry.attributes.position, SI = m.geometry.attributes.skinIndex, SW = m.geometry.attributes.skinWeight;
    const legs = new Set(m.skeleton.bones.map((o, i) => (legsRe.test(o.name) ? i : -1)).filter((i) => i >= 0));
    for (let i = 0; i < P.count; i += 2) { let mb = -1, mw = 0; for (let c = 0; c < 4; c++) { const w = SW.getComponent(i, c); if (w > mw) { mw = w; mb = SI.getComponent(i, c); } } if (!legs.has(mb)) body.push([m, i]); }
  }
  const v = new THREE.Vector3(), inv = new THREE.Matrix4(), last = new THREE.Vector3(), cur = new THREE.Vector3();
  let errMax = 0, inside = 0, samples = 0, step = 0, held = 0, strikeW = 0, k = 0;
  const where = {};
  const pen = (t) => {
    b.root.updateMatrixWorld(true); for (const m of b.meshes) m.skeleton.update();
    inv.copy(b.prey.matrixWorld).invert(); const bb = b.prey.geometry.boundingBox;
    for (const [m, i] of body) {
      m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld).applyMatrix4(inv);
      const ex = (2 * v.x - bb.min.x - bb.max.x) / (bb.max.x - bb.min.x), ey = (2 * v.y - bb.min.y - bb.max.y) / (bb.max.y - bb.min.y), ez = (2 * v.z - bb.min.z - bb.max.z) / (bb.max.z - bb.min.z);
      if (ex * ex + ey * ey + ez * ez < 1) { inside++; const SI = m.geometry.attributes.skinIndex; const bn = m.skeleton.bones[SI.getComponent(i, 0)].name + "@" + t.toFixed(1); where[bn] = (where[bn] || 0) + 1; }
    }
    samples++;
  };
  b.prey.getWorldPosition(last);
  for (let t = 0; t < 7; t += 1 / 60, k++) {
    const dt = t < 0.5 ? (1 / 60) * FUN.strike.slow : 1 / 60;
    const mode = t > 4 && t < 4.8 ? "land" : t >= 4.8 && t < 5.8 ? "perch" : "fly";
    fl.heading += Math.sin(t * 1.3) * 0.02; fl.phi = Math.sin(t * 1.7) * 0.9; fl.gamma = Math.sin(t * 0.9) * 0.6 - 0.1;
    fl.fold = t > 2 && t < 3 ? 1 : 0.2; fl.flapLevel = (t % 1.6) < 0.8 ? 1 : 0; fl.brake = mode === "land" ? 0.8 : 0;
    pos.x += -Math.sin(fl.heading) * 20 * dt; pos.z += -Math.cos(fl.heading) * 20 * dt;
    b.pose(dt, pos, fl, { mode, talons: t < 0.3 || mode === "land" ? 1 : b.carryTalons ?? 0.45, strike: t < 0.6 ? 1 : 0, perchYaw: fl.heading });
    if (t > 0.45 && t < 0.6) strikeW = Math.max(strikeW, b.actions.talons.getEffectiveWeight());
    b.prey.getWorldPosition(cur);
    if (b.hold.k < 1) step = Math.max(step, cur.distanceTo(last) - 20 * dt);
    last.copy(cur);
    const Gc = b.gripCheck();
    if (Gc.k >= 1 && b.hold.perch < 0.02) { errMax = Math.max(errMax, Gc.err); held++; }
    if (k % 24 === 0 && b.hold.perch < 0.02 && mode !== "perch") pen(t);   // (the carry: in the air and the landing; perched it is laid)
  }
  // the strike pose alone (game time): strike 1 for 0.6 s in flight
  for (let q = 0; q < 36; q++) b.pose(1 / 60, pos, fl, { mode: "fly", talons: 1, strike: 1 });
  strikeW = b.actions.talons.getEffectiveWeight();
  // the far LOD: bound to the near skeleton, switched by the drawn span
  const cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.05, 8000);
  b.setSpan(1.0); cam.position.set(pos.x, pos.y, pos.z + 200); cam.updateMatrixWorld();
  const farLod = b.updateLod(cam, 900); cam.position.set(pos.x, pos.y, pos.z + 4); const nearLod = b.updateLod(cam, 900);
  const farBound = !!b.far?.length && b.far.every((m) => m.skeleton === b.mesh.skeleton);
  b.drop();
  if (TRACE) console.log(where);
  return { errMax, inside, samples, step, held, strikeW, farLod, nearLod, farBound, toes: !!b.toes, gripLayers: !!b.rig.layers?.gripL || JSON.stringify(Object.keys(b.extra)).includes("gripL") };
}

// ------------------------------------------------------------------------------------------------ run
const results = [];
const ONLYV2 = args.includes("--v2");
const check = (name, ok, info) => { results.push({ name, ok }); if (!QUIET || !ok) console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${info}`); };
{
  const me = pathToFileURL(path.join(ROOT, "viewer/falconFlight/gymCity.js")).href;
  const q = (s) => spawnSync(process.execPath, ["--input-type=module", "-e", `globalThis.location = { search: ${JSON.stringify(s)} }; const m = await import(${JSON.stringify(me)}); console.log(m.FALCON_CTL + " " + m.FALCON_MODEL);`], { encoding: "utf8" }).stdout.trim();
  const d = q(""), on = q("?game=falcon&falconctl=gym&falconmodel=v2"), other = q("?falconctl=current&falconmodel=current"), old = q("?falconctl=old");
  check("the switches: ?falconctl=gym|current, ?falconmodel=v2|current, both default current (?falconctl=old stays the current controller)", d === "current current" && on === "gym v2" && other === "current current" && old === "current current", `default "${d}", gym+v2 "${on}", current "${other}", old "${old}"`);
}
if (!ONLYV2) {
const TS = takeoff("gym", 0, -60, 0), TC = takeoff("current", 0, -60, 0);
check("gym: take-off from the street (Space, then held: power): airborne, over the roofs, no touch-down again, no tumble", TS.firstFly >= 0 && TS.firstFly < 1.5 && TS.over >= 0 && TS.touch === 0 && TS.tumbles === 0, `airborne at ${TS.firstFly.toFixed(2)} s, over the roofs at ${TS.over.toFixed(1)} s, touch-downs ${TS.touch}, tumbles ${TS.tumbles}, ${TS.agl.toFixed(0)} m up at 8 s`);
const TA = takeoff("gym", -16, -18, Math.PI / 2);
check("gym: take-off in the 4 m alley: nearly vertical (<= 2.5 m/s horizontal below the roofs), out over them", TA.firstFly >= 0 && TA.vhBelow <= 2.5 && TA.over >= 0 && TA.tumbles === 0, `horizontal ${TA.vhBelow.toFixed(2)} m/s below the roofs, over them at ${TA.over.toFixed(1)} s, tumbles ${TA.tumbles}`);
check("self-test: the current controller's take-off from the street (E, Space held) touches down again (falcon-gym's why: 'stuck between buildings')", TC.touch > 0 || TC.maxAgl < 3, `airborne at ${TC.firstFly.toFixed(2)} s, up to ${TC.maxAgl.toFixed(1)} m, touch-downs ${TC.touch}, ends ${TC.end} ${TC.agl.toFixed(1)} m up`);
const SL = sill();
check("gym: E by the façade lands on a window sill (the façade kit's) and stands there 4 s, Space launches off it", SL.landed >= 0 && SL.dS < 0.15 && SL.kind === "sill" && SL.stays && SL.launched && SL.flyAgl > 2, `landed at ${SL.landed.toFixed(2)} s on a ${SL.kind || "?"} ${SL.dS.toFixed(2)} m from the sill's perch point (${SL.on ? `${SL.on.y.toFixed(2)} m up` : "-"}), stays ${SL.stays}, launched ${SL.launched}, ${SL.flyAgl.toFixed(1)} m up after`);
// self-test: the raw city world (no pads): the falcon cannot stand on a sill
const raw = new CityGymWorld(W);
raw.column = function (x, z, y) { const b = this.w.column(x, z, y), o = this._c; o.floor = b.floor; o.ceil = b.ceil; o.brush = b.brush; o.tree = b.tree; o.pad = -1; return o; };
const SR = sill(raw);
check("self-test: without the pads (the raw height grid) the falcon cannot stand on the sill (it drops off)", !SR.stays, `landed ${SR.landed >= 0 ? SR.landed.toFixed(2) + " s" : "never"}, stays ${SR.stays}${SR.after ? `, ${SR.after.mode} at ${SR.after.y.toFixed(2)} m after 4 s (the sill at ${SR.on?.y.toFixed(2)} m)` : ""}`);
const DG = stoop("gym"), DC = stoop("current");
check("gym: a 300 m stoop over the town >= 300 km/h, pulled out with no contact", DG.kmh >= 300 && DG.minAgl > 1 && DG.tumbles === 0, `${DG.kmh} km/h, lowest ${DG.minAgl} m, contacts ${DG.tumbles}`);
check("current: the 300 m stoop over the town (as before), no contact", DC.kmh >= 230 && DC.minAgl > 0.5 && DC.tumbles === 0, `${DC.kmh} km/h, lowest ${DC.minAgl} m, contacts ${DC.tumbles}`);
const HG = [hunt("gym", 11), hunt("gym", 23)], HC = [hunt("current", 11), hunt("current", 23)];
check("gym: the fun catch over the square (the simple player): the first <= 30 s, >= 3 in 90 s, no crash", HG.every((r) => r.first >= 0 && r.first <= 30 && r.catches >= 3 && r.crashes <= 1), HG.map((r) => `first ${r.first.toFixed(1)} s, ${r.catches} caught, ${r.crashes} crashes, top ${r.maxKmh} km/h`).join("; "));
check("current: the same catch (as before)", HC.every((r) => r.first >= 0 && r.first <= 30 && r.catches >= 3), HC.map((r) => `first ${r.first.toFixed(1)} s, ${r.catches} caught, ${r.crashes} crashes`).join("; "));
const PL = pool();
check("gym: the ledge pool round the falcon: sills, railings, the lamp, roof edges, ridges, the tree; rebuilt in slices of <= 520 samples (no spike), two fixed pools swapped", PL.builds >= 50 && PL.maxWork <= 520 && PL.same && PL.kinds.sill > 10 && PL.kinds.railing > 2 && PL.kinds["roof edge"] > 10 && PL.kinds.ridge > 5, `${PL.builds} rebuilds, largest slice ${PL.maxWork} samples, pools kept ${PL.same}; last: ${Object.entries(PL.kinds).map(([k, n]) => `${n} ${k}`).join(", ")}`);
}
const V = await v2grip();
check("v2: the caught bird held IN its talons on its own foot bones (the real v2 rig, a 7 s carry): belly to the grip <= 4 cm, no v2 body vertex inside it, the blend with no step > 0.35 m a frame", V.toes && V.held > 200 && V.errMax <= 0.04 && V.inside === 0 && V.samples > 10 && V.step <= 0.35, `grip error max ${(V.errMax * 100).toFixed(1)} cm over ${V.held} frames, body vertices inside ${V.inside} (${V.samples} poses), blend step ${V.step.toFixed(2)} m`);
check("v2: the strike pose is its Talons clip (strike 1: the clip's weight), its far LOD on the same skeleton switched by the drawn span", V.strikeW > 0.8 && V.farBound && V.farLod === "far" && V.nearLod === "near", `Talons weight ${V.strikeW.toFixed(2)}, far LOD bound ${V.farBound}, at 200 m ${V.farLod}, at 4 m ${V.nearLod}`);
const bad = results.filter((r) => !r.ok);
console.log(`falconcity: ${results.length - bad.length}/${results.length} PASS${bad.length ? ` (FAIL: ${bad.map((b) => b.name).join("; ")})` : ""}`);
process.exit(bad.length ? 1 : 0);
