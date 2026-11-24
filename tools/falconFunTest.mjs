// node --preserve-symlinks --import ./tools/characters/threeHook.mjs tools/falconFunTest.mjs [--quiet] [--old] [--seeds N]
// THE FALCON FUN CHECK (claude/falconfun, docs/rules/falcon-catch-fun.md), headless: the game's own flight model, flight
// assist, game logic (viewer/falconFlight/falconGame.js) and pigeons (pigeons.js) over a small test Place: the tower
// with the eyrie's ledge 30 m up, a row of pitched roofs right ahead under it (ridges 12 m), the open square beyond with
// a third of the pigeons feeding on the setts, more rows round it. A SIMPLE PLAYER: it looks at the marker (the lock), or
// the arrow when there is none, and holds the strike button; with ?falconfun=old (--old) the same player aims at the
// nearest pigeon, holds F and stoops when it is below (the old game has no lock-on and no arrow).
// Checks (fun): the first catch within 30 s of the launch on every seed; >= 4 catches in 2 min (the run goal is 5) and
// >= 4 of the first 5 easy pigeons dived at caught; no crash into a roof or the ground; a 150 m stoop >= 230 km/h and a
// 50 m one >= 130 km/h with no ground contact; stoops from 150 m over the town at 8 headings with no hard contact; the
// wind's loudness and the camera's FOV rise earlier (values only: nothing audible); the old game FAILS the catch check
// (the self-test: it is run as a child with --old).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const TRACE = args.includes("--trace");
const OLD = args.includes("--old"), QUIET = args.includes("--quiet"), CHILD = args.includes("--child");
const SEEDS = +(args[args.indexOf("--seeds") + 1] || 0) || 5;
globalThis.location = { search: OLD ? "?falconfun=old" : "" };

// a seeded Math.random (the pigeons' and the bot's randomness), reset per run
let seed = 1;
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const { FalconGame } = await import("../viewer/falconFlight/falconGame.js");
const { Pigeons } = await import("../viewer/falconFlight/pigeons.js");
const { FalconFlight, FlightControls } = await import("../viewer/falconFlight/flightModel.js");
const { FlightAssist } = await import("../viewer/falconFlight/flightAssist.js");
const FUNM = await import("../viewer/falconFlight/falconFun.js");
const { FUN, placeStarter, windLevels, CAM_FUN } = FUNM;

const still = { sample: (x, y, z, t, o) => { o.x = 0; o.y = 0; o.z = 0; return o; } };
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// ------------------------------------------------------------------------------------------------ the test Place
// heading 0 = toward -z. Tower: |x|, |z| < 4 up to 34 m (the ledge at 30 m on its -z face). Rows of houses (pitched,
// eaves 8 m, ridge 12 m along x): A z -60..-45 (ridge z -52.5) right ahead and under the launch; B z -175..-160; sides
// x -85..-70 and 70..85 over z -160..-60. The square: x -60..60, z -150..-70, open.
const ROWS = [
  { x0: -80, x1: 80, z0: -60, z1: -45, axis: "x" },
  { x0: -80, x1: 80, z0: -175, z1: -160, axis: "x" },
  { x0: -85, x1: -70, z0: -160, z1: -60, axis: "z" },
  { x0: 70, x1: 85, z0: -160, z1: -60, axis: "z" },
];
function roofAt(x, z) {
  let h = 0;
  if (Math.abs(x) < 4 && Math.abs(z) < 4) h = 34;
  for (const R of ROWS) {
    if (x <= R.x0 || x >= R.x1 || z <= R.z0 || z >= R.z1) continue;
    const half = R.axis === "x" ? (R.z1 - R.z0) / 2 : (R.x1 - R.x0) / 2, off = R.axis === "x" ? Math.abs(z - (R.z0 + R.z1) / 2) : Math.abs(x - (R.x0 + R.x1) / 2);
    h = Math.max(h, 12 - 4 * off / half);
  }
  return h;
}
function buildRoosts() {
  const out = [];
  for (const R of ROWS) {
    if (R.axis === "x") for (let x = R.x0 + 2; x < R.x1 - 2; x += 1.6) out.push({ x, y: 12.02, z: (R.z0 + R.z1) / 2, yaw: Math.PI / 2, kind: "ridge" });
    else for (let z = R.z0 + 2; z < R.z1 - 2; z += 1.6) out.push({ x: (R.x0 + R.x1) / 2, y: 12.02, z, yaw: 0, kind: "ridge" });
  }
  for (let k = 0; k < 160; k++) out.push({ x: -50 + Math.random() * 100, y: 0.01, z: -140 + Math.random() * 60, yaw: k * 3.1, kind: "ground" });
  return out;
}
const world = { floor: roofAt, ground: () => 0, roosts: [] };

function fakeBird() { return { prey: null, downstroke: false, setSpan() {}, pose() {}, carry() { this.prey ??= {}; }, drop() { const p = this.prey; this.prey = null; return p; } }; }
function fakeInput() {
  const C = new FlightControls();
  return {
    C, intent: { turn: 0, vert: 0, climb: 0, stoop: 0, half: 0, brake: 0, aim: null }, talons: false, actions: new Set(), script: null,
    update() { return C; }, take(a) { const h = this.actions.has(a); this.actions.delete(a); return h; }, syncAim() {},
  };
}

/** one game from the launch: T s of the simple player. Returns the catches, times, the easy attempts, the crashes */
function play(sd, T = 120, high = false) {
  seed = sd;
  world.roosts = buildRoosts();
  const P = new Pigeons({ world, roosts: world.roosts, home: { x: 0, z: -110 }, count: 150, scale: 1.4, ground: 0.4 });
  P.flockHomes = [{ x: 0, z: -110, r: 45, h: 28, w: 0.12 }, { x: 25, z: -140, r: 38, h: 40, w: -0.14 }];
  const inp = fakeInput(), bird = fakeBird();
  const g = new FalconGame({ world, air: still, bird, pigeons: P, fam: null, audio: null, input: inp });
  // crashes in an auto-dive (or within 1.5 s after it): the dive's pull-out / the swoop; others (a low climb-out into a
  // wall: the flight assist's own business, unchanged by this branch) counted apart
  let crashes = 0, other = 0, contacts = 0, diveEnd = -9;
  const say = g.say.bind(g); g.say = (m) => { if (/^hit /.test(m)) { if (g.fun?.diving || real - diveEnd < 1.5) crashes++; else other++; } if (/touched down/.test(m)) contacts++; if (TRACE) console.log(`  [${real.toFixed(1)}] ${m}`); say(m); };
  const start = { x: 0, y: 30, z: -4.5 };
  const starter = g.fun && !high ? placeStarter(P, start, { x: 0, z: -1 }) : null;
  if (starter && g.fun) g.fun.starter = { i: starter.i, flock: P };
  if (TRACE) console.log("starter", JSON.stringify(starter));
  // (the game's tiercel: falconGameDef.js, an adult's stamina)
  g.f.P = { ...g.f.P, stamina: { ...g.f.P.stamina, drain: 0.045, regen: 0.05 } };
  if (high) g.start(0, 150, 60, 0, 14, 0);                        // (high: 150 m up, 170 m short of the square)
  else g.start(start.x, start.y - 2, start.z - 6, 0, 13, -0.19);  // (the nest intro's hand-over: 13 m/s, -11 deg, 9 m out)
  g.takeoffT = 0.6;
  const falcon = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, speed: 0, stoop: false };
  const dt = 1 / 60, f = g.f, I = inp.intent;
  let first = -1, real = 0, maxV = 0, k = 0;
  const attempts = [];                // { i, kind, t, caught }
  let cur = null, lastCatches = 0;
  const tmp = { x: 0, y: 0, z: 0 };
  for (; real < T; real += dt, k++) {
    // ---- the simple player
    I.turn = 0; I.vert = 0; I.climb = 0; I.stoop = 0; I.half = 0; I.brake = 0; I.aim = null; inp.talons = false;
    if (g.mode === "perch") inp.actions.add("land");
    let tx = null;
    if (g.fun) {
      if (g.target >= 0) { P.pos(g.target, tmp); tx = tmp; }
      else if (g.fun.arrow.on) tx = g.fun.arrow;
      inp.talons = g.target >= 0;
    } else {
      let bd = Infinity, bi = -1;
      for (let i = 0; i < P.max; i++) { if (P.state[i] === 3) continue; const d = Math.hypot(P.p[i * 3] - f.pos.x, P.p[i * 3 + 1] - f.pos.y, P.p[i * 3 + 2] - f.pos.z); const sc = d + (P.state[i] === 0 ? 30 : 0); if (sc < bd) { bd = sc; bi = i; } }
      if (bi >= 0) { P.pos(bi, tmp); tx = tmp; }
    }
    if (tx) {
      const dx = tx.x - f.pos.x, dy = tx.y - f.pos.y, dz = tx.z - f.pos.z, hd = Math.hypot(dx, dz);
      const aim = (play._aim ??= { yaw: 0, pitch: 0, set: true });
      aim.yaw = Math.atan2(-dx, -dz); aim.pitch = clamp(Math.atan2(dy, hd), -1.4, 0.5);
      // (no lock: the arrow gives the way, the height is kept: a level look toward it, a climb when low)
      // (high up: look down at it and stoop, Shift, as a player would; the lock comes in the stoop)
      const agl = f.pos.y - roofAt(f.pos.x, f.pos.z);
      if (g.fun && g.target < 0) { aim.pitch = agl < 22 ? 0.2 : agl > 45 ? clamp(Math.atan2(dy, hd), -1.2, 0) : 0; if (aim.pitch < -0.45) I.stoop = 1; }
      I.aim = aim;
      if (!g.fun) { inp.talons = Math.hypot(hd, dy) < 60; if (dy < -10 && hd < 2.5 * -dy) I.stoop = 1; }
      // nothing locked and low: climb a little first (the arrow says where)
      if (g.fun && g.target < 0 && f.pos.y - roofAt(f.pos.x, f.pos.z) < 12) I.climb = 1;
    }
    // ---- attempts (fun: the locked bird while the button is held)
    if (g.fun) {
      const i = g.fun.diving ? g.target : -1;
      if (i >= 0 && (!cur || cur.i !== i)) { if (cur && !cur.done) cur.done = true; cur = { i, kind: P.kindName(i), t: real, caught: false, done: false }; attempts.push(cur); }
    }
    g.update(dt, null);
    if (g.fun?.diving) diveEnd = real;
    if (g.score.catches > lastCatches) {
      lastCatches = g.score.catches;
      if (first < 0) first = real;
      if (cur && !cur.done) { cur.caught = true; cur.done = true; }
    }
    // ---- the pigeons (as cityFlyer.ambient: the falcon as the threat, the game's time scale)
    falcon.x = f.pos.x; falcon.y = f.pos.y; falcon.z = f.pos.z; falcon.vx = f.vel.x; falcon.vy = f.vel.y; falcon.vz = f.vel.z; falcon.speed = f.V; falcon.stoop = f.fold > 0.7;
    P.update(dt * g.timeScale * (g.fun ? g.fun.slowK : 1), real, falcon, null, false);
    maxV = Math.max(maxV, f.V);
    if (TRACE && k % 30 === 0) console.log(`t${real.toFixed(1)} ${g.mode} p(${f.pos.x.toFixed(0)},${f.pos.y.toFixed(1)},${f.pos.z.toFixed(0)}) agl ${(f.pos.y - roofAt(f.pos.x, f.pos.z)).toFixed(1)} V${f.V.toFixed(1)} g${(f.gamma * 57.3).toFixed(0)} ${g.assist?.mode} tgt ${g.target}${g.target >= 0 ? `(${P.kindName(g.target)} s${P.state[g.target]} d${g.window?.d.toFixed(0)} y${P.p[g.target * 3 + 1].toFixed(1)})` : ""} dive ${g.fun?.diving} w${g.fun?.w.toFixed(2)} sta ${f.stamina.toFixed(2)} chA ${f.chaseA?.toFixed(1)} boost ${f.boostA?.toFixed(1)} fold ${f.fold.toFixed(2)} flap ${f.flapLevel.toFixed(2)}`);
  }
  const easy = attempts.filter((a) => a.kind === "easy").slice(0, 5);
  if (TRACE) console.log(attempts.slice(0, 12).map((a) => `${a.i}:${a.kind}@${a.t.toFixed(1)}${a.caught ? "+" : "-"}`).join(" "));
  return { first, catches: g.score.catches, points: g.score.points, crashes, other, contacts, maxKmh: Math.round(maxV * 3.6), easyCaught: easy.filter((a) => a.caught).length, easyTried: easy.length, attempts: attempts.length, escapes: P.escapes, runs: g.fun?.run.done ?? 0, starter: !!starter };
}

/** a straight stoop from h m over flat ground (or the town), Shift held 25 s, the fun arcade (or not) */
function stoop(h, heading = 0, town = false, arcade = !OLD) {
  const b = new FalconFlight(), C = new FlightControls(), A = new FlightAssist(); b.assisted = true;
  if (arcade) { b.arcade = FUN.arcade; b.P = { ...b.P, nMax: FUN.nMax }; }
  const w = town ? world : { floor: () => 0, ground: () => 0 };
  b.launch(0, h + w.floor(0, -110), -110, heading, 14, 0);
  const I = { turn: 0, vert: 0, climb: 0, stoop: 1, half: 0, brake: 0, aim: null };
  let vmax = 0, minAgl = 1e9, hard = 0, contacts = 0;
  for (let t = 0; t < 25; t += 1 / 60) {
    A.apply(1 / 60, b, I, C, w); b.step(1 / 60, C, still, w);
    vmax = Math.max(vmax, b.V); minAgl = Math.min(minAgl, b.pos.y - w.floor(b.pos.x, b.pos.z));
    if (b.contact) { contacts++; if (b.contact.hard) hard++; b.contact = null; }
  }
  return { kmh: Math.round(vmax * 3.6), minAgl: +minAgl.toFixed(1), hard, contacts };
}

// ------------------------------------------------------------------------------------------------ run
const out = { mode: OLD ? "old" : "fun", seeds: [] };
const ONE = args.includes("--seed") ? +args[args.indexOf("--seed") + 1] : -1;
for (let s = 0; s < SEEDS; s++) if (ONE < 0 || s === ONE) out.seeds.push(play(1000 + s * 7919));
if (CHILD) { process.stdout.write(JSON.stringify(out)); process.exit(0); }

const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); if (!QUIET || !ok) console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${info}`); };
const HIGH = [];
if (!OLD) for (let s = 0; s < Math.min(SEEDS, 6); s++) HIGH.push(play(5000 + s * 104729, 30, true));
const S = out.seeds, firsts = S.map((r) => r.first), med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const f1 = (x) => (x < 0 ? "none" : x.toFixed(1) + " s");
if (!OLD) {
  check("first catch <= 30 s (every seed)", S.every((r) => r.first >= 0 && r.first <= 30), `${firsts.map(f1).join(", ")} (the tame pigeon placed: ${S.every((r) => r.starter)})`);
  check(">= 4 catches in 2 min (every seed)", S.every((r) => r.catches >= 4), `${S.map((r) => r.catches).join(", ")} catches; ${S.map((r) => r.points).join(", ")} points; runs of 5 done ${S.map((r) => r.runs).join(", ")}`);
  check(">= 4 of the first 5 easy pigeons dived at caught (>= 80 %, every seed)", S.every((r) => r.easyTried >= 3 && r.easyCaught >= Math.ceil(r.easyTried * 0.8)), S.map((r) => `${r.easyCaught}/${r.easyTried}`).join(", "));
  const nc = S.reduce((a, r) => a + r.crashes, 0), ncat = S.reduce((a, r) => a + r.catches, 0);
  check("auto-dives near the roofs: <= 1 bump per 25 catches, <= 3 a run", nc * 25 <= ncat && S.every((r) => r.crashes <= 3), `${nc} bumps in ${ncat} catches: ${S.map((r) => r.crashes).join(", ")} (other low-flight bumps: ${S.map((r) => r.other).join(", ")}); top speed ${S.map((r) => r.maxKmh).join(", ")} km/h; escapes ${S.map((r) => r.escapes).join(", ")}`);
  check("stoop from 150 m into an auto-dive (6 runs of 30 s): no crash, a catch", HIGH.every((r) => r.crashes === 0 && r.other === 0 && r.catches >= 1), HIGH.map((r) => `${r.catches} caught, top ${r.maxKmh} km/h, ${r.crashes + r.other} crashes`).join("; "));
  const d150 = stoop(150), d50 = stoop(50), d300 = stoop(300);
  check("a 150 m stoop >= 230 km/h, no ground contact", d150.kmh >= 230 && d150.contacts === 0, `${d150.kmh} km/h, lowest ${d150.minAgl} m (50 m: ${d50.kmh} km/h lowest ${d50.minAgl} m; 300 m: ${d300.kmh} km/h)`);
  check("a 50 m stoop >= 130 km/h, no ground contact", d50.kmh >= 130 && d50.contacts === 0, `${d50.kmh} km/h, lowest ${d50.minAgl} m`);
  const town = [];
  for (let k = 0; k < 8; k++) town.push(stoop(150, k * Math.PI / 4, true));
  check("stoops from 150 m over the town (8 headings): no hard contact", town.every((r) => r.hard === 0), town.map((r) => `${r.kmh}/${r.minAgl}`).join(" "));
  const real = { d150: stoop(150, 0, false, false), d50: stoop(50, 0, false, false) };
  check("(info) the old stoop for comparison", true, `150 m ${real.d150.kmh} km/h, 50 m ${real.d50.kmh} km/h`);
  const wf = windLevels(42, 1, true), wo = windLevels(42, 1, false);
  check("the wind's loudness rises earlier (values, nothing audible)", wf.wind > wo.wind * 1.25 && wf.hiss > wo.hiss + 0.05 && windLevels(14, 0, true).wind < 0.12, `at 150 km/h wind ${wf.wind.toFixed(3)} vs ${wo.wind.toFixed(3)}, hiss ${wf.hiss.toFixed(3)} vs ${wo.hiss.toFixed(3)}`);
  const sm = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fovF = 58 + (CAM_FUN.fov1 - 58) * sm(42, ...CAM_FUN.fovV), fovO = 58 + 24 * sm(42, 18, 90);
  check("the camera's FOV / streaks widen earlier", fovF > fovO + 6 && sm(42, ...CAM_FUN.streakV) > 0.5, `FOV at 150 km/h ${fovF.toFixed(1)} vs ${fovO.toFixed(1)} deg`);
  // the self-test: the old game fails the catch check
  const me = fileURLToPath(import.meta.url);
  const r = spawnSync(process.execPath, [...process.execArgv, me, "--old", "--child", "--seeds", String(SEEDS)], { encoding: "utf8", maxBuffer: 1 << 24 });
  let O = null; try { O = JSON.parse(r.stdout); } catch { /* */ }
  const oldFails = O && O.seeds.some((q) => q.first < 0 || q.first > 30 || q.catches < 4);
  check("self-test: ?falconfun=old FAILS the catch check", !!oldFails, O ? `old: first ${O.seeds.map((q) => f1(q.first)).join(", ")}; catches in 2 min ${O.seeds.map((q) => q.catches).join(", ")}` : `child failed: ${r.stderr?.slice(0, 300)}`);
} else {
  console.log(`old: first ${firsts.map(f1).join(", ")}; catches ${S.map((r) => r.catches).join(", ")}; crashes ${S.map((r) => r.crashes).join(", ")}`);
}
const bad = results.filter((r) => !r.ok);
console.log(`falconfun: ${results.length - bad.length}/${results.length} PASS${bad.length ? ` (FAIL: ${bad.map((b) => b.name).join("; ")})` : ""}; first catch median ${f1(med(firsts))}, catches in 2 min median ${med(S.map((r) => r.catches))}`);
process.exit(bad.length ? 1 : 0);
