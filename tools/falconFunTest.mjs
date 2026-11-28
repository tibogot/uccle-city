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

// (the chase camera, simulated: a DOM stub for its vignette)
const el = () => ({ style: { setProperty() {} }, append() {}, classList: { add() {}, remove() {}, toggle() {} } });
if (!globalThis.document?.body) globalThis.document = { ...(globalThis.document || {}), createElement: el, body: el(), head: el() };
const THREE = await import("three/webgpu");
const { FalconCamera } = await import("../viewer/falconFlight/falconCamera.js");
const { FalconGame } = await import("../viewer/falconFlight/falconGame.js");
const { Pigeons } = await import("../viewer/falconFlight/pigeons.js");
const { FalconFlight, FlightControls } = await import("../viewer/falconFlight/flightModel.js");
const { FlightAssist } = await import("../viewer/falconFlight/flightAssist.js");
const FUNM = await import("../viewer/falconFlight/falconFun.js");
const { FUN, placeStarter, windLevels, CAM_FUN, strikeScale } = FUNM;
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));

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
const world = { floor: roofAt, ground: () => 0, roosts: [] }, WORLD0 = world;

function fakeBird() { return { prey: null, downstroke: false, setSpan() {}, pose() {}, carry() { this.prey ??= {}; }, drop() { const p = this.prey; this.prey = null; return p; } }; }
function fakeInput() {
  const C = new FlightControls();
  return {
    C, intent: { turn: 0, vert: 0, climb: 0, stoop: 0, half: 0, brake: 0, aim: null }, talons: false, actions: new Set(), script: null,
    update() { return C; }, take(a) { const h = this.actions.has(a); this.actions.delete(a); return h; }, syncAim() {},
  };
}

/** one game from the launch: T s of the simple player. Returns the catches, times, the easy attempts, the crashes */
function play(sd, T = 120, high = false, opt = {}) {
  seed = sd;
  const world = opt.world || WORLD0;
  world.roosts = buildRoosts();
  const P = new Pigeons({ world, roosts: world.roosts, home: { x: 0, z: -110 }, count: 150, scale: 1.4, ground: 0.4 });
  P.flockHomes = [{ x: 0, z: -110, r: 45, h: 28, w: 0.12 }, { x: 25, z: -140, r: 38, h: 40, w: -0.14 }];
  const inp = fakeInput(), bird = fakeBird();
  // (ctl "current": this row measures the city's own controller with the fun layer; since 2026-11-27 the gym is the
  // default (gymCity.js FALCON_CTL, rule falcon-gym), whose fun catch the falconcity row measures)
  const g = new FalconGame({ world, air: still, bird, pigeons: P, fam: null, audio: null, input: inp, ctl: "current" });
  // crashes in an auto-dive (or within 1.5 s after it): the dive's pull-out / the swoop; others (a low climb-out into a
  // wall: the flight assist's own business, unchanged by this branch) counted apart
  let crashes = 0, other = 0, contacts = 0, diveEnd = -9;
  const say = g.say.bind(g); g.say = (m) => { if (/^hit /.test(m)) { if (g.fun?.diving || real - diveEnd < 1.5) crashes++; else other++; } if (/touched down/.test(m)) contacts++; if (/^(CAUGHT|MISSED|DODGED)/.test(m)) HU.dupLines++; if (TRACE) console.log(`  [${real.toFixed(1)}] ${m}`); say(m); };
  const start = { x: 0, y: 30, z: -4.5 };
  const starter = g.fun && !high ? placeStarter(P, start, { x: 0, z: -1 }, { clear: opt.clear }) : null;
  if (starter && g.fun) g.fun.starter = { i: starter.i, flock: P };
  if (TRACE) console.log("starter", JSON.stringify(starter));
  // (the game's tiercel: falconGameDef.js, an adult's stamina)
  g.f.P = { ...g.f.P, stamina: { ...g.f.P.stamina, drain: 0.045, regen: 0.05 } };
  if (high) g.start(0, 150, 60, 0, 14, 0);                        // (high: 150 m up, 170 m short of the square)
  else g.start(start.x, start.y - 2, start.z - 6, 0, 13, -0.19);  // (the nest intro's hand-over: 13 m/s, -11 deg, 9 m out)
  g.takeoffT = 0.6;
  const falcon = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, speed: 0, stoop: false };
  const dt = 1 / 60, f = g.f, I = inp.intent;
  let first = -1, real = 0, maxV = 0, k = 0, firstTame = false;
  const attempts = [];                // { i, kind, t, caught }
  let cur = null, lastCatches = 0;
  const tmp = { x: 0, y: 0, z: 0 };
  // the chase camera as the city runs it (cityFlyer.update), the falcon fun's params unless old
  const cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.05, 8000), fc = new FalconCamera(cam, new THREE.Scene());
  if (g.fun) Object.assign(fc.params, CAM_FUN);
  const cb = { pos: g.pos, va: f.va, V: 0, phi: 0, heading: 0, gamma: 0, span: 1, stun: 0, liftRate: 0, fold: 0, n: 1 };
  const co = { aim: null, steady: true, look: { yaw: 0, pitch: 0 }, zoom: 1, perched: false, perchYaw: 0, floor: roofAt, col: (x, z) => ({ floor: roofAt(x, z), ceil: Infinity }), sight: roofAt };
  const pv = new THREE.Vector3();
  let camFrames = 0, outFrames = 0, hidFrames = 0, outRun = 0, outRunMax = 0;
  // (round 3) the clear catch, as hunt.js caught() runs it: the slow motion (real s under x0.5), the strike camera (the
  // falcon's distance in spans and where it is on screen while the camera is in, the camera's step beyond the bird's)
  const SK = { age: -1, acc: 0, slow: [], dMax: 0, scr: 0, step: 0, held: 0, n: 0, inside: 0 };
  const lastCam = new THREE.Vector3(), lastBird = new THREE.Vector3();
  // (round 3) the smooth chase: in a steady auto-dive (the weight in, no avoid / guard, not within 1 s of a catch), the
  // heading's rate change (rad/s per s) and the chase camera's turn-rate change; the 99th percentile and the max
  const J = { w: [], c: [] }; let om0 = NaN, h0 = NaN, cd0 = null, comg0 = NaN, lastCatchReal = -9;
  // (round 3 part B) ONE MESSAGE AT A TIME: what the HUD shows each frame (falconGame.js funHud: the banner, a line, the
  // hint); every miss said and the catch after it on the same bird (game s between); the first "Got it!" (real s after
  // the first catch); lines that repeat a banner (CAUGHT at .. / MISSED: ..). Round 3's HUD replayed alongside: its miss
  // rule (a pass within 12 m, then 6 m away) and its lines (every line of the last 4 s of game time, stacked)
  const HU = { frames: 0, multi: 0, missCatch: [], gotit: -1, firstReal: -1, dupLines: 0, missesSeen: 0, behind: 0, oldBoth: 0, oldPass: Infinity, oldMiss: [], lastMissT: new Map() };
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
    if (g.fun && SK.age >= 0) {
      SK.age += dt; g.timeScale = strikeScale(SK.age);
      if (g.timeScale < 0.5) SK.acc += dt;
      if (g.timeScale >= 1) { g.timeScale = 1; SK.age = -1; SK.slow.push(SK.acc); SK.acc = 0; }
    }
    const missesB = g.fun?.misses ?? 0;
    g.update(dt, null);
    if (g.fun?.diving) diveEnd = real;
    if (g.fun) {
      const H = g.funHud(); HU.frames++;
      if ((H.banner ? 1 : 0) + (H.line ? 1 : 0) + (H.hint ? 1 : 0) > 1 || /<br>/.test(H.line)) HU.multi++;
      if (H.hint === "gotit" && HU.gotit < 0) HU.gotit = real - HU.firstReal;
      if (g.fun.misses > missesB) { const M = g.fun.lastMiss; HU.missesSeen++; HU.lastMissT.set(M.i, g.t); if (M.angle > Math.PI / 2 && M.closing < 0) HU.behind++; }
      // (round 3's miss rule on the same window: its line stays 4 s of game time)
      const W = g.window;
      if (W && g.fun.diving) { HU.oldPass = Math.min(HU.oldPass, W.d); if (HU.oldPass < 12 && W.d > HU.oldPass + 6) { HU.oldMiss.push({ t: g.t, i: W.i }); HU.oldPass = Infinity; } }
      if (!W || g.target !== HU.oldTgt) { HU.oldPass = Infinity; HU.oldTgt = g.target; }
    }
    if (g.mode === "fly") {
      Object.assign(cb, { V: f.V, phi: f.phi, heading: f.heading, gamma: f.gamma, span: g.span, stun: f.stun, liftRate: f.lift, fold: f.fold, n: f.n });
      co.aim = null; co.steady = !!g.assist;
      fc.update(dt, cb, co);
      cam.updateMatrixWorld(); camFrames++;
      if (g.fun) {
        if (fc.strikeT >= 0 && fc.strikeT > dt) {
          const st = cam.position.distanceTo(lastCam) - g.pos.distanceTo(lastBird);
          SK.step = Math.max(SK.step, st);
          if (fc.strikeW > 0.95) {
            pv.copy(g.pos).project(cam);
            SK.dMax = Math.max(SK.dMax, cam.position.distanceTo(g.pos) / g.span); SK.scr = Math.max(SK.scr, Math.abs(pv.x), Math.abs(pv.y)); SK.held++;
            if (cam.position.y < roofAt(cam.position.x, cam.position.z) + 0.3) SK.inside++;
          }
        }
        lastCam.copy(cam.position); lastBird.copy(g.pos);
        // the chase's smoothness
        const steady = g.target >= 0 && g.fun.diving && g.fun.w > 0.9 && !(g.assist.avoiding > 0.1) && !g.assist.guard && real - lastCatchReal > 1 && f.stun <= 0;
        const om = Number.isNaN(h0) ? NaN : wrapA(f.heading - h0) / dt;
        if (steady && om === om && om0 === om0) { const jj = Math.abs(om - om0) / dt; J.w.push(jj); }
        om0 = steady ? om : NaN; h0 = f.heading;
        const cdv = fc.dir;
        if (cd0) {
          const comg = Math.acos(Math.min(1, cdv.dot(cd0))) / dt;
          if (steady && comg0 === comg0) J.c.push(Math.abs(comg - comg0) / dt);
          comg0 = steady ? comg : NaN; cd0.copy(cdv);
        } else cd0 = cdv.clone();
      }
      pv.copy(g.pos).project(cam);
      const out = pv.z > 1 || Math.abs(pv.x) > 0.97 || Math.abs(pv.y) > 0.97;
      if (out) { outFrames++; outRun++; outRunMax = Math.max(outRunMax, outRun); } else outRun = 0;
      if (fc.sight(cb, co, g.span, cam.position) < 1) hidFrames++;
    }
    if (g.score.catches > lastCatches) {
      lastCatches = g.score.catches;
      if (first < 0) { first = real; firstTame = !!g.fun?.firstWasTame; HU.firstReal = real; }
      if (g.fun) {
        const ci = g.fun.lastCaughtI;
        if (HU.lastMissT.has(ci)) HU.missCatch.push(g.t - HU.lastMissT.get(ci));
        HU.lastMissT.clear();
        // (round 3's HUD: a MISSED line said within 4 s of game time before the catch shows with the CAUGHT banner)
        if (HU.oldMiss.some((m) => g.t - m.t < 4)) HU.oldBoth++;
        HU.oldMiss.length = 0;
      }
      if (g.fun) { SK.age = 0; SK.acc = 0; g.timeScale = strikeScale(0); fc.strike(); SK.n++; lastCatchReal = real; }
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
  const camOut = { out: outFrames / Math.max(camFrames, 1), outRunMax: outRunMax / 60, hid: hidFrames / Math.max(camFrames, 1) };
  const pct = (a, q) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * b.length))]; };
  const strike = { n: SK.n, slow: SK.slow, dMax: SK.dMax, scr: SK.scr, step: SK.step, held: SK.held, inside: SK.inside };
  const jerk = { w99: pct(J.w, 0.99), wMax: pct(J.w, 1), c99: pct(J.c, 0.99), cMax: pct(J.c, 1), n: J.w.length };
  return { hud: HU, starterInfo: starter, strike, jerk, misses: g.fun?.misses ?? 0, camOut, firstTame, first, catches: g.score.catches, points: g.score.points, crashes, other, contacts, maxKmh: Math.round(maxV * 3.6), easyCaught: easy.filter((a) => a.caught).length, easyTried: easy.length, attempts: attempts.length, escapes: P.escapes, runs: g.fun?.run.done ?? 0, starter: !!starter };
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

// ------------------------------------------------------------------------------------------------ round 3
/** EVERY SKY BIRD IS PREY: two drawn square flocks (cityFlyer draws the 2 nearest the camera) and every GPU sky slot
 *  (gpuPrey.js over a stub sky with birds in each slot); for each flying bird, the falcon 40 m off looking straight at
 *  it: the lock-on (hunt.js PreyMux.target, the game's cone) picks it (or one as near the view centre). old = the mux
 *  as ?falconfun=old runs it (one flock: the second drawn flock's birds are not prey; no gulls, no sky pigeons) */
async function targetable(old) {
  const { PreyMux } = await import("../viewer/falconGame/hunt.js");
  const { GpuPrey, PREY_KEYS } = await import("../viewer/falconGame/gpuPrey.js");
  const { SLOTS, TOTAL } = await import("../viewer/birds/skyFlocks.js");
  seed = 77;
  const mk = (hx) => {
    const R = buildRoosts().map((r) => ({ ...r, x: r.x + hx }));
    const P = new Pigeons({ world: { ...world, roosts: R }, roosts: R, home: { x: hx, z: -110 }, count: 150, scale: 1.4, ground: 0.4 });
    P.flockHomes = [{ x: hx, z: -110, r: 45, h: 28, w: 0.12 }, { x: hx + 25, z: -140, r: 38, h: 40, w: -0.14 }];
    return P;
  };
  const A = mk(0), B = mk(260);
  // flush both (a falcon sweeping low over each square), then let them fly
  const th = { x: 0, y: 8, z: 0, vx: 0, vy: 0, vz: -20, speed: 20, stoop: false };
  for (const [P, hx] of [[A, 0], [B, 260]]) for (let t = 0; t < 6; t += 1 / 30) { th.x = hx + 60 * Math.sin(t * 1.1); th.z = -110 + 40 * Math.sin(t * 0.7); P.update(1 / 30, t, th, null, false); }
  // the sky: 8 birds in every slot, spread in a ring 120 m up
  const F = new Float32Array(TOTAL * 12), rows = SLOTS.map(() => [{ x: 0, y: 0, z: 0, w: 0 }, { w: 1 }, { w: 1 }, { y: 8 }]);
  SLOTS.forEach((s, k) => { for (let j = 0; j < 8; j++) { const o = (s.start + j) * 12, a = k * 0.9 + j * 0.11; F[o] = Math.cos(a) * (300 + 20 * k); F[o + 1] = 120 + j * 3; F[o + 2] = Math.sin(a) * (300 + 20 * k); F[o + 4] = 10; F[o + 11] = 1; } });
  const keys = old ? PREY_KEYS.filter((k) => k !== "gulls" && k !== "pigeons") : PREY_KEYS;
  const gpu = new GpuPrey({ sky: { slotOn: () => true, row: (k, r) => rows[k][r], kill() {} } }, keys);
  gpu.copy(F); gpu.cleared = false; gpu.readT = performance.now();
  const mux = new PreyMux(gpu), game = { fun: old ? null : {}, target: -1, window: null };
  mux.sync([A, B], game);
  const src = {};
  const p = { x: 0, y: 0, z: 0 }, q = { x: 0, y: 0, z: 0 };
  // (each bird ALONE: every other bird of the flocks and the sky hidden for its test: what is checked is that no filter
  // (the flock it belongs to, its slot, its state, the range, the cone) leaves it out; with the others there, a nearer
  // one in front of it may take the lock, as the lock's distance tie-break wants)
  const sA = A.state.slice(), sB = B.state.slice(), sG = gpu.state.slice();
  const alone = (P, i, gi) => { A.state.fill(3); B.state.fill(3); gpu.state.fill(3); if (P) P.state[i] = (P === A ? sA : sB)[i]; if (gi >= 0) gpu.state[gi] = 1; mux.sync([A, B], game); };
  const test = (pos, label) => {
    // the falcon 40 m off, level with it, looking at it
    const fx = pos.x + 40, fy = pos.y, fz = pos.z;
    const r = old ? mux.target(fx, fy, fz, pos.x - fx, 0, pos.z - fz, 180, 0.45) : mux.target(fx, fy, fz, pos.x - fx, 0, pos.z - fz, FUN.lockRange, FUN.lockCone, true);
    let ok = false;
    if (r >= 0) { mux.pos(r, q); const dx = q.x - fx, dy = q.y - fy, dz = q.z - fz, dq = Math.hypot(dx, dy, dz), a = Math.acos(Math.max(-1, Math.min(1, -dx / dq))); ok = a < 0.02; }
    const S = (src[label] ??= [0, 0]); S[1]++; if (ok) S[0]++;
  };
  for (const [P, lab] of [[A, "flock A (nearest)"], [B, "flock B (the other drawn)"]]) for (let i = 0; i < P.max; i++) if ((P === A ? sA : sB)[i] === 1 || (P === A ? sA : sB)[i] === 2) { alone(P, i, -1); P.pos(i, p); test(p, lab); }
  for (const s of SLOTS) for (let j = 0; j < 8; j++) { const o = (s.start + j) * 12; alone(null, -1, sG[s.start + j] === 1 ? s.start + j : -1); p.x = F[o]; p.y = F[o + 1]; p.z = F[o + 2]; test(p, `sky ${s.key}`); }
  return { src, missing: SLOTS.map((s) => s.key).filter((k) => !keys.includes(k)) };
}

/** a pigeon CROSSING close by (30 m, 60 deg off the view): the game's lock takes it (round 2: the 0.5 rad cone only) */
function crossingLock() {
  seed = 99;
  const P = new Pigeons({ world, roosts: buildRoosts(), home: { x: 0, z: -110 }, count: 150, scale: 1.4 });
  for (let i = 0; i < P.max; i++) P.state[i] = 3;
  const j = 5; P.state[j] = 1; P.kind[j] = 1;
  const inp = fakeInput(), g = new FalconGame({ world, air: still, bird: fakeBird(), pigeons: P, fam: null, audio: null, input: inp, ctl: "current" });
  g.start(0, 60, 0, 0, 15, 0);
  // 60 deg to the right of the heading (-z), 30 m, level, flying across
  P.p[j * 3] = 30 * Math.sin(1.05); P.p[j * 3 + 1] = 60; P.p[j * 3 + 2] = -30 * Math.cos(1.05); P.v[j * 3] = -8;
  g.update(1 / 60, null);
  return g.target === j;
}

/** THE FEATHER PUFF: a fixed pool (the instance buffer never re-made, static usage), alive after 0.5 s, gone and hidden by 2.2 s */
async function feathers() {
  const { FeatherPuff, PUFF } = await import("../viewer/falconFlight/featherPuff.js");
  const F = new FeatherPuff(new THREE.Scene()), arr = F.mesh.instanceMatrix.array, usage = F.mesh.instanceMatrix.usage;
  F.burst(0, 10, 0, 10, 0, 0, FUN.strike.feathers, 1.4);
  const cam = new THREE.Vector3(0, 12, 8);
  let a05 = 0;
  for (let t = 0; t < 2.2; t += 1 / 60) { F.update(1 / 60, cam); if (Math.abs(t - 0.5) < 0.009) a05 = F.alive; }
  const end = F.alive, hidden = !F.mesh.visible;
  // a second catch reuses the pool
  F.burst(0, 10, 0, 0, 0, 0, FUN.strike.feathers, 1.4); F.update(1 / 60, cam);
  return { a05, end, hidden, again: F.alive, pool: F.mesh.instanceMatrix.array === arr && F.mesh.count === PUFF.N, staticUse: usage === THREE.StaticDrawUsage && F.mesh.instanceMatrix.usage === usage, n: FUN.strike.feathers };
}

/** THE GRIP: the real falcon rig (peregrine.glb) and the nest's carried pigeon (nest.glb prey_carry); a scripted carry:
 *  struck 3.7 m off (the blend in the slow motion), then 7 s of banks, dives, flaps, a landing flare, a perch and the
 *  take-off: the pigeon's belly to the talons' grip point (m), how far it rises over the grip (into the falcon), body
 *  vertices of the falcon (not its legs) inside the pigeon's box, the pigeon's largest step in the blend */
let RIG = null;
async function rig() {
  if (RIG) return RIG;
  const { register } = await import("node:module");
  // (the viewer's import map takes meshoptimizer from the CDN; its simplifier only builds the far LOD: stubbed here)
  register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, n) { if (s === "meshoptimizer/simplifier") return { url: "data:text/javascript," + encodeURIComponent("export const MeshoptSimplifier = { ready: Promise.resolve(), simplify: (i) => [i, 0] };"), shortCircuit: true }; return n(s, c); }`));
  THREE.TextureLoader.prototype.loadAsync = async function () { return new THREE.Texture(); };
  const warn = console.error; console.error = () => {};
  const { loadFalconAssets } = await import("../viewer/falcons.js");
  const { FalconBird } = await import("../viewer/falconFlight/falconBird.js");
  const A = await loadFalconAssets();
  // (round 4: the caught-pigeon model, models/bird/prey/pigeon_held.glb, in the held shapes)
  const { loadHeldPigeon } = await import("../viewer/falconFlight/heldPrey.js");
  const PG = await loadHeldPigeon();
  console.error = warn;
  if (!PG) throw new Error("models/bird/prey/pigeon_held.glb did not load");
  return (RIG = { A, FalconBird, prey: A.nest.scene.getObjectByName("prey_carry") });
}
/** (round 3 part B) look: the held bird as its flock draws it (heldPrey.js { shape, scale, tint }); null: prey_carry */
async function grip(look = null) {
  const { A, FalconBird, prey } = await rig();
  const b = new FalconBird(A, 2.0);
  const pos = new THREE.Vector3(0, 40, 0), fl = { gamma: -0.1, alpha: 0.1, phi: 0, heading: 0, fold: 0.2, flapLevel: 1, brake: 0, V: 25 };   // (the carry's first state: no jump in the root at the strike)
  b.pose(1 / 60, pos, fl, { mode: "fly", talons: 1 });
  b.carry(prey, null, { x: 2, y: 38.5, z: -3 }, look);
  const mesh = b.mesh, P = mesh.geometry.attributes.position, SI = mesh.geometry.attributes.skinIndex, SW = mesh.geometry.attributes.skinWeight;
  const legs = new Set(mesh.skeleton.bones.map((o, i) => (/Leg|Foot|Toe/.test(o.name) ? i : -1)).filter((i) => i >= 0));
  const body = [];
  for (let i = 0; i < P.count; i++) { let mb = -1, mw = 0; for (let c = 0; c < 4; c++) { const w = SW.getComponent(i, c); if (w > mw) { mw = w; mb = SI.getComponent(i, c); } } if (!legs.has(mb)) body.push(i); }
  const v = new THREE.Vector3(), inv = new THREE.Matrix4(), last = new THREE.Vector3(), cur = new THREE.Vector3();
  let errMax = 0, topMax = -1, inside = 0, samples = 0, step = 0, k = 0, held = 0;
  const pen = () => {
    b.root.updateMatrixWorld(true); mesh.skeleton.update();
    inv.copy(b.prey.matrixWorld).invert(); const bb = b.prey.geometry.boundingBox;
    for (const i of body) {
      mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);
      // (inside the pigeon's body: the ellipsoid in its box, the shape of a pigeon's body; the box's corners are air)
      // (round 4: the pigeon model's own body ellipsoid, heldPrey.js userData.body: its box takes the drooping wing)
      const E = b.prey.geometry.userData?.body;
      const ex = E ? (v.x - E.c[0]) / E.r[0] : (2 * v.x - bb.min.x - bb.max.x) / (bb.max.x - bb.min.x), ey = E ? (v.y - E.c[1]) / E.r[1] : (2 * v.y - bb.min.y - bb.max.y) / (bb.max.y - bb.min.y), ez = E ? (v.z - E.c[2]) / E.r[2] : (2 * v.z - bb.min.z - bb.max.z) / (bb.max.z - bb.min.z);
      if (ex * ex + ey * ey + ez * ez < 1) inside++;
    }
    samples++;
  };
  b.prey.getWorldPosition(last);
  for (let t = 0; t < 7; t += 1 / 60, k++) {
    // the strike's slow motion for the first 0.5 s (the blend runs in game time), then the carry
    const dt = t < 0.5 ? (1 / 60) * FUN.strike.slow : 1 / 60;
    const mode = t > 4 && t < 4.8 ? "land" : t >= 4.8 && t < 5.8 ? "perch" : "fly";
    fl.heading += Math.sin(t * 1.3) * 0.02; fl.phi = Math.sin(t * 1.7) * 0.9; fl.gamma = Math.sin(t * 0.9) * 0.6 - 0.1;
    fl.fold = t > 2 && t < 3 ? 1 : 0.2; fl.flapLevel = (t % 1.6) < 0.8 ? 1 : 0; fl.brake = mode === "land" ? 0.8 : 0;
    pos.x += -Math.sin(fl.heading) * 20 * dt; pos.z += -Math.cos(fl.heading) * 20 * dt;
    b.pose(dt, pos, fl, { mode, talons: t < 0.3 || mode === "land" ? 1 : 0.45, perchYaw: fl.heading });
    b.prey.getWorldPosition(cur);
    if (b.hold.k < 1) step = Math.max(step, cur.distanceTo(last) - 20 * dt);
    last.copy(cur);
    const Gc = b.gripCheck();
    if (Gc.k >= 1 && b.hold.perch < 0.02) { errMax = Math.max(errMax, Gc.err); topMax = Math.max(topMax, Gc.top); held++; }
    if (k % 12 === 0 && b.hold.perch < 0.02) pen();
  }
  return { errMax, topMax, inside, samples, step, held, span: b.span };
}

// ------------------------------------------------------------------------------------------------ round 3 part B
/** THE HELD BIRD IS THE CAUGHT BIRD: a square flock (a pigeon, a jackdaw, a racer: their own tints) and sky slots (a
 *  gull, a jackdaw, a starling, a sky pigeon) through the PreyMux; for each, the carry at a catch (falconGame.js
 *  funCatch: P.heldLook -> carry) holds that species' shape, its flock's tint and draw size (the held bird's length
 *  0.85-1.35 x the flock bird's). old: round 3's carry (no look: the nest's prey_carry for every catch) */
async function heldSpecies(old) {
  const { A, FalconBird, prey } = await rig();
  const { PreyMux } = await import("../viewer/falconGame/hunt.js");
  const { GpuPrey } = await import("../viewer/falconGame/gpuPrey.js");
  const { SLOTS, TOTAL } = await import("../viewer/birds/skyFlocks.js");
  const { heldShapes, heldLifeRatio } = await import("../viewer/falconFlight/heldPrey.js");
  const { pigeonGeometry } = await import("../viewer/falconFlight/pigeons.js");
  const { SPECIES } = await import("../viewer/birds/birdMesh.js");
  seed = 31;
  const R = buildRoosts();
  const P = new Pigeons({ world: { ...world, roosts: R }, roosts: R, home: { x: 0, z: -110 }, count: 150, scale: 1.4, jackdaws: 0.12, ground: 0.4 });
  const F = new Float32Array(TOTAL * 12), rows = SLOTS.map(() => [{ x: 0, y: 0, z: 0, w: 0 }, { w: 1 }, { w: 1 }, { y: 8 }]);
  SLOTS.forEach((s, k) => { for (let j = 0; j < 8; j++) { const o = (s.start + j) * 12; F[o] = 50 * k; F[o + 1] = 120; F[o + 2] = j * 5; F[o + 4] = 10; F[o + 11] = 1; } });
  const gpu = new GpuPrey({ sky: { slotOn: () => true, row: (k, r) => rows[k][r], kill() {} } });
  gpu.copy(F); gpu.cleared = false;
  const mux = new PreyMux(gpu); mux.sync([P], { fun: {}, target: -1 });
  const G = heldShapes(), pg = pigeonGeometry(); pg.computeBoundingBox();
  const lenOf = (bb) => bb.max.z - bb.min.z, flockLen = { square: lenOf(pg.boundingBox) };
  for (const s of SPECIES) flockLen[s.name] = s.len * (0.9 + s.tail);   // (the near bird, skyFlocks.js: beak tip +0.52 x len .. the tail's tip -(0.38 + tail) x len)
  const cases = [];
  const jd = P.jackdaw.indexOf(1), rc = P.kind.indexOf(2), nm = P.kind.findIndex((k, i) => k === 1 && !P.jackdaw[i]);
  for (const i of [nm, jd, rc]) cases.push({ i: mux.index(P, i), want: "square", tint: [...P.mesh.geometry.attributes.iTint.array.slice(i * 3, i * 3 + 3)], scale: P.scale, label: P.jackdaw[i] ? "square jackdaw" : P.kind[i] === 2 ? "square racer" : "square pigeon" });
  for (const key of ["gulls", "jackdaws", "starlings", "pigeons"]) {
    const s = SLOTS.find((q) => q.key === key);
    cases.push({ i: 512 + s.start + 2, want: SPECIES[s.species].name, tint: [1, 1, 1], scale: null, label: `sky ${key}` });
  }
  const out = [];
  for (const c of cases) {
    const b = new FalconBird(A, 2.0);
    b.pose(1 / 60, new THREE.Vector3(0, 40, 0), { gamma: 0, alpha: 0, phi: 0, heading: 0, fold: 0.2, flapLevel: 0, brake: 0, V: 20 }, { mode: "fly", talons: 1 });
    const look = old ? null : mux.heldLook(c.i, {});
    b.carry(prey, null, { x: 1, y: 39, z: -2 }, look);
    const p = b.prey, got = Object.entries(G).find(([, g]) => g === p.geometry)?.[0] ?? (p.geometry === prey.geometry ? "prey_carry" : "?");
    const tint = b.held && p === b.held.mesh ? [b.held.tint.value.r, b.held.tint.value.g, b.held.tint.value.b] : null;
    const tintOK = !!tint && tint.every((v, k) => Math.abs(v - c.tint[k]) < 1e-4);
    if (!p.geometry.boundingBox) p.geometry.computeBoundingBox();
    // (round 4: LIFE size against the falcon as drawn: held length / the falcon's beak-to-tail length = the life ratio
    // (a feral pigeon 32 cm / a tiercel 40 cm = 0.8), a pigeon within 0.7-0.9; round 3B: the flock's draw scale)
    const scale = b.hold?.s ?? 0, len = lenOf(p.geometry.boundingBox) * scale, fal = b.bodyLength();
    const want = heldLifeRatio(look), ratio = len / fal, pigeon = /pigeon|racer/.test(c.label);
    const sizeOK = Math.abs(ratio / want - 1) < 0.06 && (!pigeon || (ratio >= 0.7 && ratio <= 0.9));
    out.push({ label: c.label, want: c.want, got, ok: got === c.want && tintOK && sizeOK, tintOK, sizeOK, ratio });
  }
  return out;
}

/** THE TUTORIAL PIGEON IN OPEN AIR: the test Place with street trees along row A (in front of it and behind it, crowns
 *  12 m across, tops ~15 m over the 12 m ridges) round the spot round 3 picked; the world's column has the crowns as
 *  cityStream.js does (the solid core, the brush, the treeList grid), so the avoid sees them */
const TREES = [];
for (const z of [-40, -66]) for (let x = -20; x <= 20; x += 10) TREES.push({ x, z, cy: 10, Rh: 6, Rv: 5.5 });
const treeWorld = {
  floor: roofAt, ground: () => 0, roosts: [],
  // (cityStream.js treeList's layout: one grid cell over the test Place; T: cx, cz, cy, Rh, Rv, trunk x, z, r)
  treeList: [{ x0: -200, z0: -300, cell: 500, nx: 1, nz: 1, start: [0, TREES.length], idx: TREES.map((_, k) => k), T: TREES.flatMap((t) => [t.x, t.z, t.cy, t.Rh, t.Rv, t.x, t.z, 0.3]) }],
  _o: { floor: 0, ceil: Infinity, brush: 0, tree: null, ceilTree: null, open: false },
  column(x, z, y) {
    const o = this._o; o.ceil = Infinity; o.brush = 0; o.tree = null; o.ceilTree = null;
    let h = roofAt(x, z);
    for (let k = 0; k < TREES.length; k++) {
      const t = TREES[k], dx = x - t.x, dz = z - t.z, d2 = dx * dx + dz * dz;
      if (d2 < 0.09 && t.cy > h) { h = t.cy; o.tree = k; }
      if (d2 >= t.Rh * t.Rh) continue;
      const dy = (y - t.cy) / t.Rv, q2 = d2 / (t.Rh * t.Rh) + dy * dy;
      if (q2 < 1 && 1 - Math.sqrt(q2) > o.brush) o.brush = 1 - Math.sqrt(q2);
      const a = t.Rh * 0.6, s2 = d2 / (a * a);
      if (s2 >= 1) continue;
      const hv = t.Rv * 0.85 * Math.sqrt(1 - s2), lo = t.cy - hv, hi = t.cy + hv;
      if (y >= lo) { if (hi > h) { h = hi; o.tree = k; } } else if (lo < o.ceil) { o.ceil = lo; o.ceilTree = k; }
    }
    o.floor = h;
    return o;
  },
};

/** THE STRIKE CAMERA AGAINST THE SUN: a falcon flying -z at 50 m over open ground, a low sun (25 deg) to its right or its
 *  left; the strike camera's side and how much it looks into the sun (falconCamera.js sunInto: +1 straight into it).
 *  useSun = false: round 3's pick (the side nearer the chase camera, the sun not counted) */
function strikeSun(sunX, useSun) {
  const cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.05, 8000), fc = new FalconCamera(cam, new THREE.Scene());
  Object.assign(fc.params, CAM_FUN);
  const b = { pos: new THREE.Vector3(0, 50, 0), va: { x: 0, y: 0, z: -20 }, V: 20, phi: 0, heading: 0, gamma: 0, span: 2, stun: 0, liftRate: 0, fold: 0, n: 1 };
  const sun = new THREE.Vector3(sunX, Math.tan(25 / 57.3), 0).normalize();
  const o = { aim: null, steady: true, look: { yaw: 0, pitch: 0 }, zoom: 1, perched: false, perchYaw: 0, floor: () => 0, col: () => ({ floor: 0, ceil: Infinity }), sight: () => 0, sun: useSun ? sun : null };
  for (let k = 0; k < 30; k++) { b.pos.z -= 20 / 60; fc.update(1 / 60, b, o); }
  fc.strike();
  for (let k = 0; k < 30; k++) { b.pos.z -= 20 / 60; fc.update(1 / 60, b, o); }
  const side = fc.strikeSide, P = new THREE.Vector3(), L = new THREE.Vector3();
  fc.strikeSpot(b, side === 2 ? 0 : side, P, L);
  return { side, into: fc.sunInto(sun, P, L) };
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
  check("the first catch is the tame pigeon under the launch (the hint's bird)", S.every((r) => r.firstTame), S.map((r) => (r.firstTame ? "tame" : "another")).join(", "));
  check(">= 4 catches in 2 min (every seed)", S.every((r) => r.catches >= 4), `${S.map((r) => r.catches).join(", ")} catches; ${S.map((r) => r.points).join(", ")} points; runs of 5 done ${S.map((r) => r.runs).join(", ")}`);
  check(">= 4 of the first 5 easy pigeons dived at caught (>= 80 %, every seed)", S.every((r) => r.easyTried >= 3 && r.easyCaught >= Math.ceil(r.easyTried * 0.8)), S.map((r) => `${r.easyCaught}/${r.easyTried}`).join(", "));
  const nc = S.reduce((a, r) => a + r.crashes, 0), ncat = S.reduce((a, r) => a + r.catches, 0);
  check("auto-dives near the roofs: <= 1 bump per 25 catches, <= 3 a run", nc * 25 <= ncat && S.every((r) => r.crashes <= 3), `${nc} bumps in ${ncat} catches: ${S.map((r) => r.crashes).join(", ")} (other low-flight bumps: ${S.map((r) => r.other).join(", ")}); top speed ${S.map((r) => r.maxKmh).join(", ")} km/h; escapes ${S.map((r) => r.escapes).join(", ")}`);
  check("the falcon on screen (the chase camera simulated): <= 0.5 % of frames out of frame, never > 0.25 s, in the hunts and the 150 m stoops", [...S, ...HIGH].every((r) => r.camOut.out <= 0.005 && r.camOut.outRunMax <= 0.25), `out of frame ${S.map((r) => (r.camOut.out * 100).toFixed(1)).join(", ")} % (longest ${S.map((r) => r.camOut.outRunMax.toFixed(2)).join(", ")} s); stoops ${HIGH.map((r) => (r.camOut.out * 100).toFixed(1)).join(", ")} % (longest ${HIGH.map((r) => r.camOut.outRunMax.toFixed(2)).join(", ")} s); hidden ${S.map((r) => (r.camOut.hid * 100).toFixed(1)).join(", ")} %`);
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
  // ---- round 3 (the owner, 2026-11-25: "really confusing, we don't see well the pigeon getting caught ... the chasing
  // of pigeons should be smooth ... I cross some birds in the sky and those were not targetable")
  const TG = await targetable(false), TO = await targetable(true);
  const fmtSrc = (R) => Object.entries(R.src).map(([k, [a, n]]) => `${k} ${a}/${n}`).join(", ");
  check("round 3: every flying bird of every drawn flock and every sky slot is lockable (each alone, looked at from 40 m)", Object.values(TG.src).every(([a, n]) => n > 0 && a === n) && !TG.missing.length, `${fmtSrc(TG)}; not prey: ${TG.missing.join(", ") || "none"}`);
  const Bo = TO.src["flock B (the other drawn)"];
  check("round 3 self-test: the old mux leaves the other drawn flock and the gulls / sky pigeons untargetable (the cause)", Bo && Bo[0] === 0 && TO.missing.length === 2, `old: ${fmtSrc(TO)}; not prey: ${TO.missing.join(", ")}`);
  check("round 3: a pigeon crossing 30 m off, 60 deg from the view, takes the lock", crossingLock(), "the near zone (FUN.near)");
  const SKs = S.map((r) => r.strike), slows = SKs.flatMap((k) => k.slow);
  check("round 3: the catch's slow motion lasts 0.4-0.6 s (real, under x0.5), every catch", slows.length >= 8 && slows.every((x) => x >= 0.4 && x <= 0.6), `${slows.length} catches, ${Math.min(...slows).toFixed(2)}-${Math.max(...slows).toFixed(2)} s`);
  check("round 3: the strike camera comes in beside the falcon (<= 1.8 spans, the bird in the central 45 % of the frame, the camera looking at its talons, never in a roof) with no jump (<= 1.2 m a frame over the bird's own move)", SKs.every((k) => k.held > 0 && k.dMax <= 1.8 && k.scr <= 0.45 && k.inside === 0 && k.step <= 1.2), SKs.map((k) => `${k.n} catches: ${k.dMax.toFixed(2)} spans, screen ${k.scr.toFixed(2)}, step ${k.step.toFixed(2)} m`).join("; "));
  const JK = S.map((r) => r.jerk);
  check("round 3: the auto-dive is smooth: the heading's rate change <= 15 rad/s^2 (99 %), <= 90 max; the camera's <= 8 (99 %)", JK.every((j) => j.n > 300 && j.w99 <= 15 && j.wMax <= 90 && j.c99 <= 8), JK.map((j) => `${j.w99.toFixed(1)} / ${j.wMax.toFixed(0)} (cam ${j.c99.toFixed(1)})`).join(", ") + " rad/s^2 (round 2: 36-61 / 160-220)");
  check("round 3: a miss is said (DODGED! / MISSED)", S.some((r) => r.misses > 0), `misses ${S.map((r) => r.misses).join(", ")}`);
  const FP = await feathers();
  check("round 3: the feather puff: a fixed pool, static buffer, feathers at 0.5 s, all gone and hidden by 2.2 s, reused", FP.pool && FP.staticUse && FP.a05 >= FP.n * 0.8 && FP.end === 0 && FP.hidden && FP.again === FP.n, `${FP.a05} / ${FP.n} at 0.5 s, ${FP.end} at 2.2 s, hidden ${FP.hidden}, again ${FP.again}, pool ${FP.pool}, static ${FP.staticUse}`);
  // (round 3 part B: every held shape at its largest drawn size: the square pigeon x1.4, each sky species x1.08; round
  // 3's prey_carry kept as the reference row)
  const { SHAPES } = await import("../viewer/falconFlight/heldPrey.js");
  const GRs = [["prey_carry (round 3)", null], ...SHAPES.map((s) => [s, { shape: s, scale: s === "square" ? 1.4 : 1.08, tint: [1, 1, 1] }])];
  const GRr = [];
  for (const [n, L] of GRs) GRr.push([n, await grip(L)]);
  check("round 3B: every held bird IN the talons (each species at its drawn size, the real rig, a 7 s carry): belly to the grip <= 4 cm, no falcon body vertex inside it, the blend with no step > 0.35 m a frame", GRr.every(([, GR]) => GR.held > 200 && GR.errMax <= 0.04 && GR.inside === 0 && GR.samples > 20 && GR.step <= 0.35), GRr.slice(1).map(([n, GR]) => `${n}: ${(GR.errMax * 100).toFixed(1)} cm, inside ${GR.inside}, step ${GR.step.toFixed(2)} m, top ${(GR.topMax * 100).toFixed(1)} cm`).join("; "));
  // ---- round 3 part B (the coordinator's review of the round 3 screenshots, 2026-11-25)
  const HUs = S.map((r) => r.hud), mc = HUs.flatMap((h) => h.missCatch);
  check("round 3B: one message at a time (the banner, a line or the hint: never two; no line repeating a banner)", HUs.every((h) => h.frames > 1000 && h.multi === 0 && h.dupLines === 0), HUs.map((h) => `${h.multi} / ${h.dupLines}`).join(", ") + " (frames with two / CAUGHT-MISSED lines)");
  check("round 3B: never MISSED and CAUGHT for one pass: a miss only after the falcon went by the bird (behind it, the gap opening), the same bird caught >= 1 s of game time after its miss (it came round)", HUs.every((h) => h.behind === h.missesSeen) && mc.every((x) => x >= FUN.miss.hold + 0.5), `misses ${HUs.map((h) => h.missesSeen).join(", ")} (behind ${HUs.map((h) => h.behind).join(", ")}); the same bird caught after its miss ${mc.length ? `${Math.min(...mc).toFixed(1)}-${Math.max(...mc).toFixed(1)} s later` : "never"}`);
  const oldBoth = HUs.reduce((a, h) => a + h.oldBoth, 0);
  check("round 3B self-test: round 3's HUD showed a MISSED line under the CAUGHT banner (its miss rule, its 4 s of lines)", oldBoth > 0, `${oldBoth} catches with a MISSED line still up (${HUs.map((h) => h.oldBoth).join(", ")})`);
  check("round 3B: the first catch's \"Got it!\" hint only after its banner faded", HUs.every((h) => h.gotit >= FUN.banner && h.gotit < FUN.banner + 0.5), HUs.map((h) => `${h.gotit.toFixed(2)} s`).join(", ") + ` (the banner ${FUN.banner} s)`);
  const HS = await heldSpecies(false), HO = await heldSpecies(true);
  check("round 3B / 4: the held bird is the caught bird (its species' shape, its flock's tint) at LIFE size against the falcon (held / falcon length = the life ratio; a pigeon 0.7-0.9)", HS.every((c) => c.ok), HS.map((c) => `${c.label}: ${c.got}${c.ok ? "" : ` (want ${c.want}, tint ${c.tintOK}, size ${c.sizeOK})`} ${c.ratio.toFixed(2)} of the falcon`).join("; "));
  check("round 3B self-test: round 3's carry held the nest's grey prey_carry for every catch", HO.every((c) => c.got === "prey_carry" && !c.ok), HO.map((c) => `${c.label}: ${c.got}`).join("; "));
  const TS = [], TN = [];
  for (let s = 0; s < 3; s++) { TS.push(play(2000 + s * 7919, 30, false, { world: treeWorld })); TN.push(play(2000 + s * 7919, 30, false, { world: treeWorld, clear: false })); }
  check(`round 3B: the tutorial pigeon in open air (no tree crown within ${FUN.starterClear} m, nothing on the line from the launch: the world's tree data) and caught first within 8 s`, TS.every((r) => r.starterInfo?.clear && r.starterInfo.gap >= FUN.starterClear && r.first >= 0 && r.first <= 8 && r.firstTame), TS.map((r) => `crowns ${r.starterInfo?.gap >= FUN.starterClear ? ">= " : ""}${r.starterInfo?.gap?.toFixed(1)} m off at (${r.starterInfo?.x.toFixed(0)}, ${r.starterInfo?.z.toFixed(0)}), first ${f1(r.first)}`).join("; "));
  check("round 3B self-test: round 3's pick (by distance alone) sits among the crowns", TN.every((r) => r.starterInfo && r.starterInfo.gap < FUN.starterClear), TN.map((r) => `crowns ${r.starterInfo?.gap?.toFixed(1)} m off, first ${f1(r.first)}`).join("; "));
  const SR = strikeSun(1, true), SL = strikeSun(-1, true), SO = [strikeSun(1, false), strikeSun(-1, false)];
  check("round 3B: the strike camera has the sun behind it (a low sun to the right / left: the camera on that side, looking away from it)", SR.side === 1 && SL.side === -1 && SR.into < -0.5 && SL.into < -0.5, `sun right: side ${SR.side}, into ${SR.into.toFixed(2)}; sun left: side ${SL.side}, into ${SL.into.toFixed(2)}`);
  check("round 3B self-test: round 3's pick (the nearer side) looks into a low sun on one side", SO.some((r) => r.into > 0.5), SO.map((r) => `side ${r.side}, into ${r.into.toFixed(2)}`).join("; "));
  const GR = GRr[0][1];
  check("round 3: the pigeon held IN the talons (the real rig, a 7 s carry): belly to the grip <= 4 cm, no falcon body vertex inside it, the strike's blend with no step > 0.35 m a frame", GR.held > 200 && GR.errMax <= 0.04 && GR.inside === 0 && GR.samples > 20 && GR.step <= 0.35, `grip error max ${(GR.errMax * 100).toFixed(1)} cm over ${GR.held} frames, body vertices inside ${GR.inside} (${GR.samples} poses), blend step ${GR.step.toFixed(2)} m, its top ${(GR.topMax * 100).toFixed(1)} cm over the grip`);
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
