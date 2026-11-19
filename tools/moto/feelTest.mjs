// MOTO FEEL TEST (docs/MOTO_FEEL.md, QUALITY_RULES rule 40): the two-wheelers (viewer/moto/motoPhysics.js) ridden
// headless on scripted routes, every crash logged with its trigger. The owner (playtest 2026-11-18): "I tried the
// motorbike, it's barely usable, the guy always falls."
//
//   node tools/moto/feelTest.mjs [--old] [--quiet] [--nocity] [--only name,...] [--kinds moto,scooter,villo]
//
// Synthetic routes (flat, a plane at a grade, kerbs, tram rails, cobbles, ramps, banks, stairs, grass, walls, a parked
// car), ridden by a KEYBOARD rider (steer / gas / brake only 0 or 1, as the owner plays) and an analog one; then the real
// city (the tile worker's own build in node, as tools/audit/driveCheck.mjs: the drive surface, the worker colliders +
// lamps + bollards; the parked cars only with MOTO_PARKED=1: the autopilot follows a line, it does not thread cars
// parked at an angle): Avenue De Fré, Rue Rouge, Rue du Doyenné, Kauwberg / Chaussée de Saint-Job, Montagne de Saint-Job,
// the Kauwberg park paths, Avenue Winston Churchill, both ways. MOTO_DEBUG=1 (with --child <group>): routes, crashes,
// blocked spots, allocation sites on stderr.
// Crash triggers: lean (over the grip at lean), slip, step (a kerb / ledge / bank face hit), landing (a bail), wall /
// tree / lamp / post / car / furniture / island / hedge (an impact into that collider kind).
// THE GATE (default = the new tuning; exit 1 on a failure):
//   every non-crash route: 0 crashes; every real-crash case (head-on wall 60 km/h, parked car 50 km/h, a 12 m cliff): a
//   crash; the motorbike >= 120 km/h within 600 m of flat; climbs 30 % from a stop to >= 40 km/h, a 57 % stair bank to
//   its top; scooter / Villo their character (scooter top 85-95 km/h, Villo pushes on 12 %); no NaN; zero allocation per
//   step (V8 sampling heap profiler); and --old (?moto=old) must FAIL the same table (the regression is caught).
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const OLD = flag("--old"), QUIET = flag("--quiet"), NOCITY = flag("--nocity"), CITYONLY = flag("--cityonly"), DETAIL = flag("--detail"), CHILD = opt("--child", null), BOTH = !flag("--single");
const ONLY = (opt("--only", "") || "").split(",").filter(Boolean);
const KINDS = (opt("--kinds", "moto,scooter,villo")).split(",");
globalThis.location ??= { search: "" };

const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const P = await imp("viewer/moto/motoPhysics.js");
const { createCarEnv } = await imp("viewer/drive/carEnv.js");
const { buildColliders, KIND } = await imp("viewer/drive/colliders.js");
const SETS = (old) => (old ? P.TWO_WHEELERS_OLD : P.TWO_WHEELERS) || P.TWO_WHEELERS;
const DT = 1 / 60, KMH = 1 / 3.6;

/** the env as driveMode.js makes it for a two-wheeler (P.twoWheelEnv: the feel options per handling set) */
function makeEnv(kind, old, ground, sets = () => [], extra = {}) {
  const H = SETS(old)[kind];
  const o = P.twoWheelEnv ? P.twoWheelEnv(H) : {};
  const env = createCarEnv({ sets, ground, handling: H, dims: P.BODIES[kind], onHit: P.motoHit, two: true, ...o, ...extra });
  return { env, H };
}

/** a ride: the bike at (x, z, h) at speed v, `inp(t, c, r)` every 1/60 s for `secs`; returns the log */
function ride({ kind = "moto", old = false, ground = () => 0, sets = () => [], x = 0, z = 0, h = 0, v = 0, secs = 10, inp, surface = null, grip = null, until = null }) {
  const { env, H } = makeEnv(kind, old, ground, sets, surface ? { surface } : {});
  if (grip) env.grip = grip;
  const c = P.createMotoState(x, z, h);
  c.y = ground(x, z); c.speed = v;
  const log = { crashes: [], top: 0, nan: false, dist: 0, maxY: c.y, landings: { clean: 0, sketchy: 0, bail: 0 }, airMax: 0, slips: 0, hits: 0, c };
  let wasCrashed = false, px = c.x, pz = c.z, wasAir = false, slip0 = 0;
  const I = { throttle: 0, brake: 0, rear: false, steer: 0, boost: false };
  for (let t = 0; t < secs; t += DT) {
    I.throttle = 0; I.brake = 0; I.rear = false; I.steer = 0; I.boost = false;
    inp(t, c, I);
    const v0 = c.speed;
    P.stepMoto(c, I, DT, env, H);
    if (!Number.isFinite(c.x + c.z + c.y + c.speed + c.lean + c.heading)) { log.nan = true; break; }
    if (c.crashed && !wasCrashed) log.crashes.push({ why: c.crashWhy || "?", t: +t.toFixed(2), x: +c.x.toFixed(1), z: +c.z.toFixed(1), kmh: +(Math.abs(v0) * 3.6).toFixed(0) });
    wasCrashed = c.crashed;
    if (!c.crashed) { log.dist += Math.hypot(c.x - px, c.z - pz); log.top = Math.max(log.top, c.speed); log.maxY = Math.max(log.maxY, c.y); }
    px = c.x; pz = c.z;
    if (c.air) log.airMax = Math.max(log.airMax, c.airT || 0);
    wasAir = c.air;
    if (until && until(c, t)) break;
  }
  log.hits = c.hits;
  if (c.landings) log.landings = c.landings;
  log.slips = c.slips || 0;
  return log;
}
// riders: the keyboard holds a speed (gas 1 / brake 1), steers by pattern
const hold = (c, I, v) => { const s = c.speed; if (s < v - 0.3) I.throttle = 1; else if (s > v + 2.5) I.brake = 1; };
const slalom = (period, amp = 1) => (t, I) => { I.steer = Math.sin(t * Math.PI * 2 / period) > 0 ? amp : -amp; };
const wall = (x0, z0, x1, z1, kind = KIND.building) => ({ rings: [[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]], kind });
const setOf = (polys) => { const col = buildColliders(polys, [], { x0: -3000, x1: 3000, z0: -3000, z1: 3000 }), one = [col]; return () => one; };
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- the synthetic routes
// each: { name, group, kinds, crash: false | true (a real crash case), run(kind, old) -> log, check?(log, kind) -> msg | null }
const ROUTES = [];
const R = (r) => ROUTES.push(r);
const flat = () => 0;
const vmaxOf = (kind) => ({ moto: 90, scooter: 80, villo: 22 })[kind] * KMH;

// flat streets 50-90 km/h: slalom with gas, full lean + full brake (keyboard), lane changes, a long sweeper with gas
for (const kmh of [50, 70, 90]) {
  R({ name: `flat slalom ${kmh}`, group: "flat", run: (kind, old) => { const v = Math.min(kmh * KMH, vmaxOf(kind)); return ride({ kind, old, v, secs: 14, inp: (t, c, I) => { hold(c, I, v); slalom(2.4)(t, I); } }); } });
  R({ name: `flat brake in a lean ${kmh}`, group: "flat", run: (kind, old) => { const v = Math.min(kmh * KMH, vmaxOf(kind)); return ride({ kind, old, v, secs: 8, inp: (t, c, I) => { I.steer = t < 6 ? 1 : 0; if (t < 1.5) hold(c, I, v); else I.brake = 1; } }); } });
  R({ name: `flat gas out of a lean ${kmh}`, group: "flat", run: (kind, old) => { const v = Math.min(kmh * KMH, vmaxOf(kind)) * 0.5; return ride({ kind, old, v, secs: 8, inp: (t, c, I) => { I.steer = t < 5 ? -1 : 0; I.throttle = 1; I.boost = t > 1 && t < 3; } }); } });
}
R({ name: "flat U-turn at a crawl", group: "flat", run: (kind, old) => ride({ kind, old, v: 3, secs: 8, inp: (t, c, I) => { I.steer = 1; hold(c, I, 3); } }) });
R({ name: "flat rear-brake slide", group: "flat", run: (kind, old) => ride({ kind, old, v: Math.min(60 * KMH, vmaxOf(kind)), secs: 6, inp: (t, c, I) => { I.rear = t > 0.5 && t < 3; I.steer = t > 0.5 && t < 2.5 ? 1 : 0; } }) });

// top speed + high-speed steering (the motorbike): >= 120 km/h within 600 m; lane changes at 120 km/h stay stable
R({ name: "top speed + lane changes at 120", group: "speed", kinds: ["moto"], run: (kind, old) => {
  let at120 = null;
  const log = ride({ kind, old, v: 0, secs: 40, inp: (t, c, I) => {
    if (at120 === null && c.speed >= 120 * KMH) at120 = Math.hypot(c.x, c.z);
    if (at120 === null) { I.throttle = 1; return; }
    hold(c, I, 125 * KMH); const k = Math.floor(t / 0.9) % 4; I.steer = k === 0 ? 1 : k === 2 ? -1 : 0;
  } });
  log.at120 = at120; return log;
}, check: (log) => (log.at120 == null || log.at120 > 600 ? `120 km/h ${log.at120 == null ? "never" : `after ${log.at120.toFixed(0)} m`} (<= 600 m)` : null) });

// steep slopes: climbs from a stop with zigzag (keyboard), and down with the brakes and lean
for (const g of [0.15, 0.30, 0.45]) {
  R({ name: `climb ${g * 100} % from a stop`, group: "slope", run: (kind, old) => { const log = ride({ kind, old, ground: (x, z) => z * g, secs: 14, inp: (t, c, I) => { I.throttle = 1; I.steer = t > 2 ? (Math.floor(t / 1.5) % 2 ? 0.6 : -0.6) : 0; } }); log.climbKmh = log.top * 3.6; return log; },
    check: (log, kind) => (kind === "moto" && g === 0.30 && log.climbKmh < 40 ? `30 % climb: top ${log.climbKmh.toFixed(0)} km/h (>= 40)` : null) });
  R({ name: `descend ${g * 100} % braking in lean`, group: "slope", run: (kind, old) => ride({ kind, old, ground: (x, z) => -z * g, v: 8, secs: 12, inp: (t, c, I) => { hold(c, I, Math.min(50 * KMH, vmaxOf(kind))); I.steer = Math.floor(t / 1.8) % 2 ? 1 : -1; } }) });
}
// a steep street with a camber change and a crest (Avenue De Fré style): 12 % up, over a crest into 14 % down at speed
R({ name: "crest 12 % up -> 14 % down at 80", group: "slope", run: (kind, old) => { const v = Math.min(80 * KMH, vmaxOf(kind)); return ride({ kind, old, v, z: -80, ground: (x, z) => (z < -4 ? 0.12 * z + 0.26 : z > 4 ? -0.14 * z + 0.26 : 0.12 * z - 0.26 * (z + 4) ** 2 / 16 + 0.26 * 0 + 0.26), secs: 9, inp: (t, c, I) => { hold(c, I, v); slalom(3, 0.5)(t, I); } }); } });

// kerbs up and down: 15 cm, square and at 30 deg to the kerb, 20 / 50 / 80 km/h; a 30 cm garden edge at 25 km/h
const kerb = (h, ang, up = true) => { const s = Math.sin(ang), k = Math.cos(ang); return (x, z) => { const d = z * k - x * s; const f = smooth01(-0.05, 0.05, d); return h * (up ? f : 1 - f); }; };
for (const kmh of [20, 50, 80]) for (const [ang, an] of [[0, "square"], [Math.PI / 3, "at 30 deg"]]) for (const up of [true, false]) {
  R({ name: `kerb 15 cm ${up ? "up" : "down"} ${an} ${kmh}`, group: "kerb", run: (kind, old) => { const v = Math.min(kmh * KMH, vmaxOf(kind)); return ride({ kind, old, v, z: -30, ground: kerb(0.15, ang, up), secs: 5, inp: (t, c, I) => { hold(c, I, v); I.steer = t > 1.3 && t < 2.2 ? 0.4 : 0; } }); } });
}
R({ name: "garden edge 30 cm up at 25", group: "kerb", run: (kind, old) => { const v = Math.min(25 * KMH, vmaxOf(kind)); const log = ride({ kind, old, v, z: -20, ground: kerb(0.30, 0.3), secs: 6, inp: (t, c, I) => hold(c, I, v) }); log.climbed = log.c.z > 5; return log; },
  check: (log, kind) => (kind === "moto" && !log.climbed ? "the 30 cm edge was not ridden up" : null) });

// tram rails at an angle: a 2 cm groove + low grip (steel) on each rail, two tracks, crossed at 15 / 30 / 45 deg, leaning
const railsAt = (ang) => { const s = Math.sin(ang), k = Math.cos(ang); const lat = (x, z) => x * k - z * s;
  const near = (x, z) => { const d = lat(x, z); let m = 9; for (const r of [-2.2, -0.765, 0.765, 2.2]) m = Math.min(m, Math.abs(d - r)); return m; };
  return { ground: (x, z) => (near(x, z) < 0.035 ? -0.02 : 0), grip: (x, z) => (near(x, z) < 0.06 ? 0.35 : 1) }; };
for (const deg of [15, 30, 45]) for (const kmh of [30, 60]) {
  R({ name: `tram rails at ${deg} deg ${kmh} leaning`, group: "rails", run: (kind, old) => { const v = Math.min(kmh * KMH, vmaxOf(kind)); const RL = railsAt(deg * Math.PI / 180); return ride({ kind, old, v, x: -20 / Math.tan(deg * Math.PI / 180) * 0 + 0, z: -15, ground: RL.ground, grip: RL.grip, secs: 6, inp: (t, c, I) => { hold(c, I, v); I.steer = t > 0.6 && t < 3 ? 0.7 : 0; } }); } });
}
// cobbles (setts): 12 mm bumps on an 18 x 15 cm pitch, slalom + braking
for (const kmh of [30, 60]) {
  R({ name: `cobbles ${kmh} slalom + brake`, group: "cobbles", run: (kind, old) => { const v = Math.min(kmh * KMH, vmaxOf(kind)); return ride({ kind, old, v, ground: (x, z) => 0.006 * (Math.sin(x * 34.9) * Math.sin(z * 41.9) + 1), secs: 9, inp: (t, c, I) => { if (t < 6) hold(c, I, v); else I.brake = 1; slalom(2)(t, I); } }); } });
}
// jumps: a kicker (1.2 m over 4 m, then a 1.2 m drop to flat), a bank (a 2.5 m hump), a 2.5 m drop; leaning in the air
const kicker = (H, L) => (x, z) => (z > 0 && z < L ? H * z / L : 0);
for (const kmh of [40, 60, 80]) {
  R({ name: `kicker 1.2 m at ${kmh}`, group: "jump", run: (kind, old) => { const v = Math.min(kmh * KMH, vmaxOf(kind)); return ride({ kind, old, v, z: -30, ground: kicker(1.2, 4), secs: 7, inp: (t, c, I) => { hold(c, I, v); } }); } });
}
R({ name: "bank hump 2.5 m at 70, leaning off it", group: "jump", run: (kind, old) => { const v = Math.min(70 * KMH, vmaxOf(kind)); return ride({ kind, old, v, z: -40, ground: (x, z) => 2.5 * Math.exp(-(z * z) / 30), secs: 7, inp: (t, c, I) => { hold(c, I, v); I.steer = t > 1.8 && t < 2.6 ? 1 : 0; } }); } });
R({ name: "drop 2.5 m at 40", group: "jump", run: (kind, old) => { const v = Math.min(40 * KMH, vmaxOf(kind)); return ride({ kind, old, v, z: -20, ground: (x, z) => (z < 0 ? 2.5 : 0), secs: 5, inp: (t, c, I) => hold(c, I, v) }); } });
R({ name: "table-top 1 m (ramp up, flat top, ramp down) at 60", group: "jump", run: (kind, old) => { const v = Math.min(60 * KMH, vmaxOf(kind)); return ride({ kind, old, v, z: -30, ground: (x, z) => (z < 0 ? 0 : z < 4 ? z / 4 : z < 10 ? 1 : z < 14 ? (14 - z) / 4 : 0), secs: 6, inp: (t, c, I) => hold(c, I, v) }); } });
// stairs-like bank: 17 cm risers, 30 cm treads, 12 steps (2 m), up at 20 km/h and down at 15
const stairs = (n, rise, tread) => (x, z) => { if (z < 0) return 0; const k = Math.min(n, Math.floor(z / tread) + smooth01(0.85, 1, (z / tread) % 1)); return k * rise; };
R({ name: "stairs bank up (57 %, 2 m) at 20", group: "stairs", run: (kind, old) => { const v = Math.min(20 * KMH, vmaxOf(kind)); const log = ride({ kind, old, v, z: -15, ground: stairs(12, 0.17, 0.3), secs: 8, inp: (t, c, I) => { I.throttle = 1; } }); log.climbed = log.maxY > 1.9; return log; },
  check: (log, kind) => (kind === "moto" && !log.climbed ? `the stairs bank was not climbed (top ${log.maxY.toFixed(2)} m of 2.04)` : null) });
R({ name: "stairs bank down at 15", group: "stairs", run: (kind, old) => { const v = Math.min(15 * KMH, vmaxOf(kind)); const S = stairs(12, 0.17, 0.3); return ride({ kind, old, v, z: 4, h: Math.PI, ground: S, secs: 5, inp: (t, c, I) => hold(c, I, v) }); } });
// grass + park paths: terrain grip, a bumpy 10 % meadow, slalom with gas and a hard brake in a lean
R({ name: "grass meadow 10 % slalom + brake at 50", group: "grass", run: (kind, old) => { const v = Math.min(50 * KMH, vmaxOf(kind)); return ride({ kind, old, v, surface: () => 1, ground: (x, z) => 0.1 * z + 0.08 * Math.sin(z * 0.9) * Math.sin(x * 0.7), secs: 10, inp: (t, c, I) => { if (t < 7) hold(c, I, v); else I.brake = 1; slalom(2.2)(t, I); } }); } });
R({ name: "grass down 20 % braking", group: "grass", run: (kind, old) => ride({ kind, old, v: 6, surface: () => 1, ground: (x, z) => -0.2 * z, secs: 8, inp: (t, c, I) => { hold(c, I, Math.min(35 * KMH, vmaxOf(kind))); I.steer = Math.floor(t / 1.6) % 2 ? 0.8 : -0.8; } }) });

// walls and cars: a glancing scrape (no crash), a slow head-on (no crash), and the REAL crashes
R({ name: "wall scrape 15 deg at 80", group: "contact", run: (kind, old) => { const v = Math.min(80 * KMH, vmaxOf(kind)); return ride({ kind, old, v, x: -4, z: -40, h: 0.26, sets: setOf([wall(2, -500, 6, 500)]), secs: 5, inp: (t, c, I) => hold(c, I, v) }); } });
R({ name: "wall head-on at 15", group: "contact", run: (kind, old) => ride({ kind, old, v: 15 * KMH, z: -10, sets: setOf([wall(-50, 0, 50, 2)]), secs: 4, inp: (t, c, I) => hold(c, I, 15 * KMH) }) });
R({ name: "parked car side-swipe 20 deg at 50", group: "contact", run: (kind, old) => { const v = Math.min(50 * KMH, vmaxOf(kind)); return ride({ kind, old, v, x: -3.5, z: -20, h: 0.35, sets: setOf([wall(0, -2.35, 1.85, 2.35, KIND.car)]), secs: 4, inp: (t, c, I) => hold(c, I, v) }); } });
R({ name: "REAL: head-on wall at 60", group: "crash", crash: true, kinds: ["moto", "scooter"], run: (kind, old) => ride({ kind, old, v: 60 * KMH, z: -30, sets: setOf([wall(-50, 0, 50, 2)]), secs: 4, inp: (t, c, I) => hold(c, I, 60 * KMH) }) });
R({ name: "REAL: head-on parked car at 50", group: "crash", crash: true, kinds: ["moto", "scooter"], run: (kind, old) => ride({ kind, old, v: 50 * KMH, z: -30, sets: setOf([wall(-0.92, 0, 0.92, 4.7, KIND.car)]), secs: 4, inp: (t, c, I) => hold(c, I, 50 * KMH) }) });
R({ name: "REAL: Villo head-on wall at 30", group: "crash", crash: true, kinds: ["villo"], run: (kind, old) => ride({ kind, old, v: 30 * KMH, z: -20, ground: (x, z) => -0.08 * z, sets: setOf([wall(-50, 0, 50, 2)]), secs: 3, inp: (t, c, I) => { I.throttle = 1; } }) });
R({ name: "REAL: off a 12 m cliff", group: "crash", crash: true, run: (kind, old) => { const v = Math.min(50 * KMH, vmaxOf(kind)); return ride({ kind, old, v, z: -20, ground: (x, z) => (z < 0 ? 12 : 0), secs: 5, inp: (t, c, I) => hold(c, I, v) }); } });

// character: the scooter's top speed, the Villo pushes up a 12 % street
R({ name: "scooter top speed", group: "character", kinds: ["scooter"], run: (kind, old) => ride({ kind, old, secs: 40, inp: (t, c, I) => { I.throttle = 1; } }),
  check: (log) => (log.top * 3.6 < 85 || log.top * 3.6 > 95 ? `scooter top ${(log.top * 3.6).toFixed(0)} km/h (85-95)` : null) });
R({ name: "Villo pushes up 12 %", group: "character", kinds: ["villo"], run: (kind, old) => { let pushed = false; const log = ride({ kind, old, v: 3, ground: (x, z) => z * 0.12, secs: 25, inp: (t, c, I) => { I.throttle = 1; if (c.pushing) pushed = true; } }); log.pushed = pushed; return log; },
  check: (log) => (!log.pushed ? "the Villo rider never got off to push on 12 %" : null) });

// ---------------------------------------------------------------- the city (child per tile group)
const CITY = [
  // (kmh: the speed a rider holds there: the bends brake it further, lateral 0.8 g)
  { group: "defre-w", tiles: ["F3", "F4"], routes: [{ name: "Avenue De Fré (west)", re: /^Avenue De Fré/, kmh: 80 }, { name: "Square De Fré", re: /^Square De Fré/, kmh: 40 }] },
  { group: "defre-c", tiles: ["G3", "G4"], routes: [{ name: "Avenue De Fré (centre)", re: /^Avenue De Fré/, kmh: 80 }] },
  { group: "rouge", tiles: ["E4", "F4"], routes: [{ name: "Rue Rouge", re: /^Rue Rouge/, kmh: 50 }, { name: "Rue du Doyenné (east)", re: /^Rue du Doyenné/, kmh: 40 }] },
  { group: "kauwberg", tiles: ["G6", "G7", "H6"], routes: [{ name: "Chaussée de Saint-Job", re: /^Chaussée de Saint-Job/, kmh: 60 }, { name: "Kauwberg", re: /^Kauwberg/, kmh: 50 }, { name: "Kauwberg park paths", paths: { x0: 100, x1: 500, z0: 800, z1: 1250 }, kmh: 30 }] },
  { group: "montagne", tiles: ["H6", "I6"], routes: [{ name: "Montagne de Saint-Job", re: /^Montagne de Saint-Job/, kmh: 35 }, { name: "Place de Saint-Job", re: /^Place de Saint-Job/, kmh: 40 }] },
  { group: "churchill", tiles: ["G2", "H2"], routes: [{ name: "Avenue Winston Churchill", re: /^Avenue Winston Churchill/, kmh: 110 }] },
];

async function cityChild(spec) {
  const nodeFetch = globalThis.fetch;
  globalThis.fetch = async (u, o) => {
    const url = new URL(String(u));
    if (url.protocol !== "file:") return nodeFetch(u, o);
    try { return new Response(await readFile(fileURLToPath(new URL(url.pathname, "file:///"))), { status: 200 }); } catch { return new Response(null, { status: 404 }); }
  };
  if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; }
    getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true }); } };
  const { buildTileData } = await imp("viewer/tileData.js");
  const { Heightmap } = await imp("viewer/heightmap.js");
  const { driveHeight, addCircles, extendColliders } = await imp("viewer/drive/colliders.js");
  const { streetFit } = await imp("viewer/streets/fitCore.js");
  const { placedLampSites } = await imp("viewer/streets/lampPlace.js");
  const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
  const entries = JSON.parse(readFileSync(join(ROOT, "tools/boot3/entries.json"), "utf8"));
  const tiles = [];
  for (const T of spec.tiles) {
    const m = manifest.tiles.find((t) => t.name === T);
    const entry = { ...entries.find((e) => !e.lite).entry, ...m, cache: false };
    const realLog = console.log; console.log = () => {};
    const d = await buildTileData(entry, pathToFileURL(join(ROOT, "data/tiles") + "/").href);
    console.log = realLog;
    const b = d.bounds, hm = Heightmap.from(d.hdr, d.y, d.orig), col = d.drive.col;
    const fit = d.road.surfaceData ? streetFit(d.road.surfaceData) : null;
    const lamps = placedLampSites(d.roads, b, fit?.placeLamp).map((p) => ({ x: p.x, z: p.z, r: 0.2, kind: KIND.lamp }));
    const bx = d.road.surfaceData?.bollards || [];
    const posts = Array.from({ length: bx.length / 3 }, (_, i) => ({ x: bx[i * 3], z: bx[i * 3 + 2], r: 0.1, kind: KIND.post }));
    addCircles(col, [...lamps, ...posts]);
    // (the parked cars are left out: the autopilot follows a line, it does not thread a street of cars parked at an
    // angle as a rider does; contact with a parked car is tested on the synthetic routes, side-swipe and head-on)
    const extra = [];
    if (process.env.MOTO_PARKED) for (const c of d.parked?.sites || []) {
      const hw = 0.925, hl = 2.365, hd = c.heading ?? (c.yaw ?? 0) + Math.PI / 2, s = Math.sin(hd), k = Math.cos(hd);   // (a site's yaw: the car's +x along the street, viewer/cars.js heading = yaw + pi / 2)
      extra.push({ rings: [[[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]].map(([u, v]) => [c.x + u * k + v * s, c.z - u * s + v * k])], kind: KIND.car });
    }
    if (process.env.MOTO_DEBUG) { const S = d.parked?.sites || []; const out = S.filter((c) => c.x < b.x0 || c.x >= b.x1 || c.z < b.z0 || c.z >= b.z1).length; console.error(`${T}: parked ${S.length}, outside the tile ${out}`); }
    const cols = extendColliders(col, extra, []);
    const D = d.drive.ground?.delta, hh = hm.h;
    const feats = JSON.parse(readFileSync(join(ROOT, "data/tiles", T, "features.json"), "utf8"));
    tiles.push({ name: T, b, hm, ground: d.drive.ground, col: cols, roads: d.roads, traffic: d.traffic, lines: feats.lines || [], parkedSites: d.parked?.sites || [],
      terrain: (x, z) => { if (!D || !hh) return 0; const k = Math.round((z - hh.z0) / hh.step) * hh.cols + Math.round((x - hh.x0) / hh.step); return D[k] === 0 ? 1 : 0; } });
  }
  const at = (x, z) => tiles.find((t) => x >= t.b.x0 && x < t.b.x1 && z >= t.b.z0 && z < t.b.z1);
  const inside = (x, z, m = 25) => tiles.some((t) => x >= t.b.x0 + (x < t.b.x0 + m && !at(x - m, z) ? m : 0) && x < t.b.x1 - (x > t.b.x1 - m && !at(x + m, z) ? m : 0) && z >= t.b.z0 + (z < t.b.z0 + m && !at(x, z - m) ? m : 0) && z < t.b.z1 - (z > t.b.z1 - m && !at(x, z + m) ? m : 0));
  let near = null;
  const ground = (x, z) => { const t = at(x, z) || tiles[0]; return driveHeight(t.hm, t.ground, x, z, near); };
  const surface = (x, z) => { const t = at(x, z); return t ? t.terrain(x, z) : 0; };
  const setsOut = [];
  const sets = (x, z, r) => { setsOut.length = 0; for (const t of tiles) if (x + r >= t.b.x0 && x - r <= t.b.x1 && z + r >= t.b.z0 && z - r <= t.b.z1) setsOut.push(t.col); return setsOut; };
  // the routes: chains of OSM ways (by name, or every path / track / footway in a box), the longest connected one
  const ways = [], nodes = new Map();
  for (const t of tiles) { for (const n of t.roads.nodes) nodes.set(n.id, n); for (const r of t.roads.roads) ways.push(r); }
  const pt = (n) => [n.x ?? n[0], n.z ?? n[1]];
  // the traffic's lanes (as drawn, clear of the parked cars: rule trafpark): a named street's OSM chain is snapped onto
  // the lane that runs its way (keep right), else the centre line is kept
  const LG = new Map(), cellK = (x, z) => `${Math.floor(x / 4)},${Math.floor(z / 4)}`;
  for (const t of tiles) { const G = t.traffic; if (!G?.xy) continue;
    for (let p = 0; p < G.paths; p++) for (let k = G.off[p]; k < G.off[p + 1] - 1; k++) {
      const x = G.xy[2 * k], z = G.xy[2 * k + 1], dx = G.xy[2 * k + 2] - x, dz = G.xy[2 * k + 3] - z, l = Math.hypot(dx, dz); if (l < 1e-3) continue;
      if (x < t.b.x0 || x >= t.b.x1 || z < t.b.z0 || z >= t.b.z1) continue;      // (the 150 m buffer copies: the neighbour's own lanes are the ones clear of ITS parked cars)
      const key = cellK(x, z); (LG.get(key) || LG.set(key, []).get(key)).push(x, z, dx / l, dz / l);
    } }
  function snapLanes(L) {
    const out = [];
    for (let i = 0; i < L.length; i++) {
      const a = L[Math.max(0, i - 2)], b = L[Math.min(L.length - 1, i + 2)], dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / dl, uz = (b[1] - a[1]) / dl;
      const [x, z] = L[i]; let best = null, bd = 36;
      for (let gx = -2; gx <= 2; gx++) for (let gz = -2; gz <= 2; gz++) { const A = LG.get(`${Math.floor(x / 4) + gx},${Math.floor(z / 4) + gz}`); if (!A) continue;
        for (let q = 0; q < A.length; q += 4) { if (A[q + 2] * ux + A[q + 3] * uz < 0.85) continue; const d2 = (A[q] - x) ** 2 + (A[q + 1] - z) ** 2; if (d2 < bd) { bd = d2; best = [A[q], A[q + 1]]; } } }
      out.push(best || L[i]);
    }
    // smoothed (the snapped points step between lane pieces)
    return out.map((p, i) => { let sx = 0, sz = 0, n = 0; for (let k = Math.max(0, i - 3); k <= Math.min(out.length - 1, i + 3); k++) { sx += out[k][0]; sz += out[k][1]; n++; } return [sx / n, sz / n]; });
  }
  function chainOf(sel, lines = null) {
    const W = new Map();
    if (lines) { const key = (p) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`; lines.forEach((L, i) => { if (L.length >= 2) W.set(`l${i}`, { a: key(L[0]), b: key(L[L.length - 1]), L }); }); }
    else for (const r of ways) { if (!sel(r) || W.has(r.id)) continue; const L = [nodes.get(r.a), ...(r.pts || []), nodes.get(r.b)].filter(Boolean).map(pt); if (L.length >= 2) W.set(r.id, { a: r.a, b: r.b, L }); }
    const adj = new Map(); for (const [id, w] of W) for (const e of [w.a, w.b]) (adj.get(e) || adj.set(e, []).get(e)).push(id);
    // greedy: from each end node, walk the straightest continuation; keep the longest
    let best = [];
    const ends = [...adj.keys()].filter((e) => adj.get(e).length === 1);
    for (const e0 of (ends.length ? ends : [...adj.keys()]).slice(0, 40)) {
      const used = new Set(), out = []; let e = e0, dir = null;
      for (let g = 0; g < 400; g++) {
        const cand = (adj.get(e) || []).filter((id) => !used.has(id));
        if (!cand.length) break;
        let pick = cand[0], sc = -9;
        for (const id of cand) { const w = W.get(id), L = w.a === e ? w.L : w.L.slice().reverse(); const dx = L[1][0] - L[0][0], dz = L[1][1] - L[0][1], l = Math.hypot(dx, dz) || 1; const s = dir ? (dx * dir[0] + dz * dir[1]) / l : 0; if (s > sc) { sc = s; pick = id; } }
        if (dir && sc < 0.2) break;          // (a hairpin into a side branch: stop)
        used.add(pick);
        const w = W.get(pick), L = w.a === e ? w.L : w.L.slice().reverse();
        for (const p of L) if (!out.length || Math.hypot(p[0] - out[out.length - 1][0], p[1] - out[out.length - 1][1]) > 0.3) out.push(p);
        const n = L.length; dir = [(L[n - 1][0] - L[n - 2][0]), (L[n - 1][1] - L[n - 2][1])]; const l = Math.hypot(dir[0], dir[1]) || 1; dir[0] /= l; dir[1] /= l;
        e = w.a === e ? w.b : w.a;
      }
      const len = out.reduce((s, p, i) => s + (i ? Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]) : 0), 0);
      if (len > (best.len || 0)) { best = out; best.len = len; }
    }
    // densify to 2 m, keep the longest run inside the built tiles
    const dense = [];
    for (let i = 0; i + 1 < best.length; i++) { const [ax, az] = best[i], [bx2, bz] = best[i + 1], L = Math.hypot(bx2 - ax, bz - az), n = Math.max(1, Math.round(L / 2)); for (let k = 0; k < n; k++) dense.push([ax + (bx2 - ax) * k / n, az + (bz - az) * k / n]); }
    if (best.length) dense.push(best[best.length - 1]);
    let run = [], bestRun = [];
    for (const p of dense) { if (inside(p[0], p[1])) run.push(p); else { if (run.length > bestRun.length) bestRun = run; run = []; } }
    if (run.length > bestRun.length) bestRun = run;
    return bestRun;
  }
  const PATHS = new Set(["path", "footway", "track", "bridleway", "cycleway"]);
  const results = [];
  for (const rs of spec.routes) {
    const sel = rs.re ? (r) => rs.re.test(r.name || r.meta?.name || "") && !PATHS.has(r.meta?.highway) && r.meta?.highway !== "steps"
      : (r) => PATHS.has(r.meta?.highway) && (() => { const a = nodes.get(r.a); if (!a) return false; const [x, z] = pt(a); const B = rs.paths; return x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1; })();
    let path;
    // a careful rider's line: the route pushed off whatever stands on or beside it (a lamp on a park path, a tree):
    // the bike's box + 0.45 m clear of every hard collider, then smoothed; a contact on
    // this line is the physics' doing, not the line's
    const { gather, itemContact, heightClear } = await imp("viewer/drive/colliders.js");
    const clearPath = (L) => {
      const near = [], ct = { nx: 0, nz: 0, depth: 0, kind: 0 };
      for (let it = 0; it < 6; it++) {
        for (let i = 0; i < L.length; i++) {
          const a = L[Math.max(0, i - 1)], b2 = L[Math.min(L.length - 1, i + 1)], dl = Math.hypot(b2[0] - a[0], b2[1] - a[1]) || 1;
          const body = { hx: 0.4 + 0.45, hz: 1.2, sin: (b2[0] - a[0]) / dl, cos: (b2[1] - a[1]) / dl };
          const y = ground(L[i][0], L[i][1]);
          for (const col of sets(L[i][0], L[i][1], 4)) { near.length = 0; gather(col, L[i][0], L[i][1], 4, near);
            for (let k = 0; k < near.length; k += 2) { const C = near[k], id = near[k + 1];
              const kd = id < C.P ? C.pkind[id] : C.ckind[id - C.P]; if (kd === KIND.hedge || kd === KIND.island) continue;
              if (heightClear(C, id, y)) continue;
              if (itemContact(C, id, L[i][0], L[i][1], body, ct)) { const d = Math.min(0.6, ct.depth + 0.05); L[i] = [L[i][0] + ct.nx * d, L[i][1] + ct.nz * d]; } } }
        }
        if (it < 5) L = L.map((p, i) => { let sx = 0, sz = 0, n = 0; for (let k = Math.max(0, i - 2); k <= Math.min(L.length - 1, i + 2); k++) { sx += L[k][0]; sz += L[k][1]; n++; } return [sx / n, sz / n]; });
      }
      return L;
    };
    if (rs.paths) {
      const B = rs.paths, seen = new Set(), lines = [];
      for (const t of tiles) for (const l of t.lines) { if (!PATHS.has(l.kind) || seen.has(l.id)) continue; seen.add(l.id); if (l.line.some(([x, z]) => x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1)) lines.push(l.line); }
      path = chainOf(null, lines);
    } else { const raw = chainOf(sel); path = snapLanes(raw); if (process.env.MOTO_DEBUG) { let moved = 0, kept = 0; raw.forEach((p, i) => { const d = Math.hypot(p[0] - path[i][0], p[1] - path[i][1]); if (d > 0.3) moved++; else kept++; }); console.error(`${rs.name}: ${raw.length} pts, snapped ${moved}, kept ${kept}, lane cells ${LG.size}`); } }
    if (path.length >= 20) path = clearPath(path);
    if (process.env.MOTO_DEBUG) { let worst = 0, wi = 0; for (let i = 1; i + 1 < path.length; i++) { const a = path[i - 1], b2 = path[i + 1], m = path[i]; const dl = Math.hypot(b2[0] - a[0], b2[1] - a[1]) || 1; const off = Math.abs(((m[0] - a[0]) * (b2[1] - a[1]) - (m[1] - a[1]) * (b2[0] - a[0])) / dl); if (off > worst) { worst = off; wi = i; } } console.error(`${rs.name}: path kink max ${worst.toFixed(2)} m at ${wi}: ${JSON.stringify(path.slice(Math.max(0, wi - 3), wi + 4).map((p) => p.map((v) => +v.toFixed(1))))}`); }
    if (path.length < 20) { results.push({ name: rs.name, error: `no route (${path.length} points)` }); continue; }
    // the grade profile (for the report)
    let maxG = 0, dy = 0;
    for (let i = 4; i < path.length; i += 2) { const g = (ground(path[i][0], path[i][1]) - ground(path[i - 4][0], path[i - 4][1])) / 8; maxG = Math.max(maxG, Math.abs(g)); }
    dy = ground(path[path.length - 1][0], path[path.length - 1][1]) - ground(path[0][0], path[0][1]);
    for (const old of BOTH ? [false, true] : [OLD]) for (const kind of KINDS) for (const dirn of ["fwd", "back"]) for (const pilot of ["keys", "analog", "late"]) {
      const L = dirn === "fwd" ? path : path.slice().reverse();
      const kmh = rs.kmh ?? (rs.paths ? 40 : 90);
      let i = 0, done = false, tick = 0, acc = 0, key = 0, stillT = 0, stuck = null;
      const log0 = { cte: 0, at: 0, crashed: false };
      near = null;
      const log = ride({ kind, old, ground: (x, z) => { const y = ground(x, z); return y; }, sets, surface, x: L[0][0], z: L[0][1], h: Math.atan2(L[2][0] - L[0][0], L[2][1] - L[0][1]), v: 0, secs: L.length * 2 / (kind === "villo" ? 1.1 : 3) + 40,
        inp: (t, c, I) => {
          near = c.y;
          const v = Math.abs(c.speed);
          while (i < L.length - 2 && Math.hypot(L[i + 1][0] - c.x, L[i + 1][1] - c.z) < Math.hypot(L[i][0] - c.x, L[i][1] - c.z) + 0.01) i++;
          const look = 5 + v * 0.5, j = Math.min(L.length - 1, i + Math.round(look / 2));
          let e = Math.atan2(L[j][0] - c.x, L[j][1] - c.z) - c.heading; e = Math.atan2(Math.sin(e), Math.cos(e));
          // pure pursuit: the curvature to the look-ahead point -> the lean a coordinated turn needs (g tan(lean) = v^2 k),
          // or the handlebar at walking pace; the keyboard rider taps it (a sigma-delta at 10 Hz: the key held 0.1 s)
          const Hh = SETS(old)[kind], Ld = Math.hypot(L[j][0] - c.x, L[j][1] - c.z) || 1, kap = 2 * Math.sin(e) / Ld;
          const wl = smooth01(2.5, 6.5, v), leanMax = Hh.maxLean * smooth01(1.2, 9, v) + 1e-3;
          const lw = Math.atan(v * v * kap / 9.81), lead = lw + 0.8 * (lw - (c.crashed ? 0 : c.lean));     // (a lead on the lean's lag: no weave)
          const s = Math.max(-1, Math.min(1, wl * lead / leanMax + (1 - wl) * Math.atan(kap * Hh.wheelbase) / Hh.lowSteer));
          if (pilot === "analog") I.steer = s;
          else if (pilot === "late") I.steer = Math.abs(s) > 0.3 ? Math.sign(s) : 0;
          else { if ((tick = (tick + 1) % 6) === 0) { acc += s; key = acc > 0.5 ? 1 : acc < -0.5 ? -1 : 0; acc -= key; } I.steer = key; }
          let turn = 0;
          // ("late": the owner's way: keyboard, 30 % faster, braking only once IN the bend (the next 12 m), at 0.95 g)
          for (let k = i; k < Math.min(L.length - 2, i + (pilot === "late" ? 6 : 25)); k++) { const a = Math.atan2(L[k + 1][0] - L[k][0], L[k + 1][1] - L[k][1]), b2 = Math.atan2(L[k + 2][0] - L[k + 1][0], L[k + 2][1] - L[k + 1][1]); turn = Math.max(turn, Math.abs(Math.atan2(Math.sin(b2 - a), Math.cos(b2 - a))) / 2); }
          const late = pilot === "late" ? 1.3 : 1;
          const vt = Math.min(kmh * KMH * late, vmaxOf(kind) * (kind === "moto" ? 1.3 : 1) * late, Math.sqrt(9.81 * (late > 1 ? 0.95 : 0.8) / Math.max(turn, 1e-3)));
          if (pilot === "analog") { I.throttle = v < vt ? Math.min(1, (vt - v) / 3 + 0.3) : 0; I.brake = v > vt + 1 ? Math.min(1, (v - vt) / 5) : 0; }
          else { I.throttle = v < vt - 0.3 ? 1 : 0; I.brake = v > vt + 2.5 ? 1 : 0; }
          if (i >= L.length - 3) done = true;
          stillT = v < 0.5 && !c.crashed ? stillT + DT : 0;
          if (stillT > 8) { stuck = { x: +c.x.toFixed(1), z: +c.z.toFixed(1), i, hits: c.hits }; done = true;
            if (process.env.MOTO_DEBUG) { const nr = [], ct = {}; const what = []; for (const col of sets(c.x, c.z, 3)) { nr.length = 0; gather(col, c.x, c.z, 3, nr); for (let k = 0; k < nr.length; k += 2) { const C = nr[k], id = nr[k + 1]; const kd = id < C.P ? C.pkind[id] : C.ckind[id - C.P]; if (itemContact(C, id, c.x, c.z, { hx: 0.5, hz: 1.2, sin: Math.sin(c.heading), cos: Math.cos(c.heading) }, ct)) what.push(`kind ${kd} top ${id < C.P ? C.ptop[id].toFixed(1) : "-"} base ${id < C.P ? C.pbase[id].toFixed(1) : "-"} heightClear ${heightClear(C, id, c.y)}`); } }
              const hs = []; for (let d = -1.5; d <= 1.5; d += 0.5) hs.push((ground(c.x + Math.sin(c.heading) * d, c.z + Math.cos(c.heading) * d) - c.y).toFixed(2));
              console.error(`STUCK ${rs.name} ${dirn} ${pilot} ${kind} at (${c.x.toFixed(1)}, ${c.z.toFixed(1)}) y ${c.y.toFixed(2)} h ${c.heading.toFixed(2)}: contacts ${what.join(" | ") || "none"}; ground along -1.5..1.5: ${hs.join(" ")}`); } }
          if (!c.crashed && !log0.crashed) { const q = L[i], q2 = L[Math.min(L.length - 1, i + 1)], dl = Math.hypot(q2[0] - q[0], q2[1] - q[1]) || 1; const cte = Math.abs(((c.x - q[0]) * (q2[1] - q[1]) - (c.z - q[1]) * (q2[0] - q[0])) / dl); if (cte > log0.cte) { log0.cte = cte; log0.at = i; } } else log0.crashed = true;
        }, until: () => done });
      if (process.env.MOTO_DEBUG) for (const cr of log.crashes) {
        let bi = 0, bd = 1e9; L.forEach((p, k) => { const d = Math.hypot(p[0] - cr.x, p[1] - cr.z); if (d < bd) { bd = d; bi = k; } });
        let pc = null, pd = 1e9; for (const t of tiles) for (const q of (t.parkedSites || [])) { const d = Math.hypot(q.x - cr.x, q.z - cr.z); if (d < pd) { pd = d; pc = q; } }
        if (pc) { let ld = 1e9; for (const [, A] of LG) for (let q = 0; q < A.length; q += 4) ld = Math.min(ld, Math.hypot(A[q] - pc.x, A[q + 1] - pc.z)); let pd2 = 1e9; for (const p of L) pd2 = Math.min(pd2, Math.hypot(p[0] - pc.x, p[1] - pc.z)); console.error(`    parked car to the nearest lane point ${ld.toFixed(2)} m, to the route ${pd2.toFixed(2)} m`); }
        console.error(`  ${rs.name} ${dirn} ${pilot} ${kind}: ${cr.why} at (${cr.x}, ${cr.z}) ${cr.kmh} km/h; path ${bd.toFixed(1)} m away (pt ${bi}/${L.length}); nearest parked ${pc ? `${JSON.stringify(pc).slice(0, 200)} ${pd.toFixed(1)} m` : "-"}`);
      }
      results.push({ name: `${rs.name} ${dirn} ${pilot}`, route: rs.name, kind, old, km: +(path.length * 2 / 1000).toFixed(2), maxGrade: +maxG.toFixed(3), rise: +dy.toFixed(1),
        crashes: log.crashes, stuck, top: +(log.top * 3.6).toFixed(0), cte: +log0.cte.toFixed(2), cteAt: log0.at, finished: done && !stuck, nan: log.nan, landings: log.landings, slips: log.slips, hits: log.hits });
    }
  }
  return results;
}

if (CHILD) {
  const spec = CITY.find((s) => s.group === CHILD);
  const res = await cityChild(spec);
  console.log(JSON.stringify({ group: CHILD, res }));
  process.exit(0);
}

// ---------------------------------------------------------------- run the table(s)
const modes = BOTH ? [false, true] : [OLD];
const table = [];   // { mode, kind, group, name, crash, crashes: [why], ok, msg }
const byWhy = { false: {}, true: {} };
let nan = false;
for (const old of modes) for (const r of CITYONLY ? [] : ROUTES) {
  if (ONLY.length && !ONLY.some((o) => r.name.includes(o) || r.group === o)) continue;
  for (const kind of r.kinds || KINDS) {
    if (!KINDS.includes(kind)) continue;
    const log = r.run(kind, old);
    nan ||= log.nan;
    const n = log.crashes.length;
    for (const c of log.crashes) if (!r.crash) byWhy[old][c.why] = (byWhy[old][c.why] || 0) + 1;
    let msg = r.crash ? (n ? null : "no crash on a real crash") : n ? `${n} crash(es): ${log.crashes.map((c) => `${c.why} ${c.kmh} km/h @${c.t}s`).join(", ")}` : null;
    const extra = r.check?.(log, kind);
    if (extra) msg = msg ? `${msg}; ${extra}` : extra;
    if (log.nan) msg = "NaN";
    table.push({ old, kind, group: r.group, name: r.name, crash: !!r.crash, n, ok: !msg, msg, top: log.top * 3.6, land: log.landings, slips: log.slips, air: log.airMax });
  }
}
// the city
let city = [];
const blocked = [];
if (!NOCITY && !ONLY.length) {
  const run = (g) => new Promise((ok) => {
    const p = spawn(process.execPath, ["--import", "./tools/road_audit/register.mjs", fileURLToPath(import.meta.url), "--child", g, ...(BOTH ? [] : ["--single"]), ...(OLD ? ["--old"] : []), "--kinds", KINDS.join(",")], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (b) => { out += b; }); p.stderr.on("data", (b) => { err += b; });
    p.on("close", (code) => { const line = out.trim().split("\n").filter((l) => l.startsWith("{")).pop(); if (code || !line) { console.log(`FAIL city ${g}: exit ${code} ${err.trim().split("\n").slice(-3).join(" / ")}`); ok([{ name: g, error: "child failed" }]); } else ok(JSON.parse(line).res); });
  });
  const queue = CITY.map((s) => s.group), out = [];
  await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) out.push(...await run(queue.shift())); }));
  city = out;
  for (const r of city) {
    if (r.error) { table.push({ old: false, kind: "-", group: "city", name: r.name, n: 0, ok: false, msg: r.error }); continue; }
    nan ||= r.nan;
    for (const c of r.crashes) byWhy[r.old][c.why] = (byWhy[r.old][c.why] || 0) + 1;
    // a fall fails the ride; blocked by a collider standing on the line (a lamp / tree in a living street's band:
    // tools/audit/driveCheck.mjs's census, not the bike's feel) is listed as info
    const msg = r.nan ? "NaN" : r.crashes.length ? `${r.crashes.length} crash(es): ${r.crashes.map((c) => `${c.why} ${c.kmh} km/h @(${c.x}, ${c.z})`).join(", ")}` : null;
    if (r.stuck || !r.finished) blocked.push(`${r.old ? "old" : "new"} ${r.kind} ${r.name}: ${r.stuck ? `blocked at (${r.stuck.x}, ${r.stuck.z})` : "not finished in time"}`);
    table.push({ old: r.old, kind: r.kind, group: "city", name: `${r.name} (${r.km} km, max grade ${(r.maxGrade * 100).toFixed(0)} %, rise ${r.rise} m)`, n: r.crashes.length, ok: !msg, msg, top: r.top, land: r.landings, slips: r.slips });
  }
}

// zero allocation per step (new tuning): a real env with walls, kerbs and rails, sampled by V8's heap profiler
let alloc = null;
if (!ONLY.length && !CITYONLY) {
  const { Session } = await import("node:inspector/promises");
  const sets = setOf([wall(-200, 60, 200, 62), wall(3, -200, 5, 200)]);
  const RL = railsAt(0.5);
  const gnd = (x, z) => kerb(0.15, 0.4)(x, z % 40) + RL.ground(x, z) + 0.006 * Math.sin(x * 34.9) * Math.sin(z * 41.9);
  const loops = [];
  for (const kind of KINDS) { const { env, H } = makeEnv(kind, false, gnd, sets); env.grip = RL.grip; loops.push({ env, H, c: P.createMotoState(0, 0, 0) }); }
  const I = { throttle: 1, brake: 0, rear: false, steer: 1, boost: false };
  const loop = (n) => { for (const L of loops) { const c = L.c; for (let i = 0; i < n; i++) { if (i % 600 === 0) { c.x = 0; c.z = 0; c.heading = 0.3; c.speed = 15; c.crashed = false; c.y = 0; c.air = false; c.vy = 0; } I.steer = (i >> 6) & 1 ? 1 : -1; I.brake = (i >> 8) & 1; I.throttle = 1 - I.brake; P.stepMoto(c, I, DT, L.env, L.H); } } };
  for (let w = 0; w < 5; w++) loop(6000);                 // (JIT warm: every path, the crash + respawn included)
  const ses = new Session(); ses.connect();
  await ses.post("HeapProfiler.enable");
  const runs = [];
  for (let m = 0; m < 3; m++) {
    await ses.post("HeapProfiler.startSampling", { samplingInterval: 64 });
    loop(6000);
    const { profile } = await ses.post("HeapProfiler.stopSampling");
    let bytes = 0;
    const ours = /\/(motoPhysics|carEnv|colliders|obb|carPhysics)\.js$/;
    const where = {};
    const walk = (n, inOurs) => { const o = inOurs || ours.test(n.callFrame.url); if (o && n.selfSize) { bytes += n.selfSize; const k = `${n.callFrame.functionName} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber}`; where[k] = (where[k] || 0) + n.selfSize; } for (const c of n.children) walk(c, o); };
    walk(profile.head, false);
    runs.push(bytes);
    if (process.env.MOTO_DEBUG) console.error(JSON.stringify(where));
  }
  ses.disconnect();
  alloc = { runs, least: Math.min(...runs), steps: 6000 * KINDS.length };
}

// ---------------------------------------------------------------- report
const fmtWhy = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "none";
let fails = 0;
for (const old of modes) {
  const T = table.filter((r) => r.old === old);
  const bad = T.filter((r) => !r.ok);
  const nonCrash = T.filter((r) => !r.crash), crashCases = T.filter((r) => r.crash);
  const falls = nonCrash.reduce((s, r) => s + r.n, 0);
  const title = old ? "OLD (?moto=old)" : "NEW (default)";
  console.log(`\n## ${title}: ${T.length} rides, ${bad.length} failing; crashes on non-crash rides: ${falls} (by trigger: ${fmtWhy(byWhy[old])}); real-crash cases crashed: ${crashCases.filter((r) => r.n).length} / ${crashCases.length}`);
  const groups = [...new Set(T.map((r) => r.group))];
  if (!QUIET) console.log("| group | rides | crashes (non-crash rides) | failing |\n|---|---|---|---|");
  if (!QUIET) for (const g of groups) { const G = T.filter((r) => r.group === g); console.log(`| ${g} | ${G.length} | ${G.filter((r) => !r.crash).reduce((s, r) => s + r.n, 0)} | ${G.filter((r) => !r.ok).length} |`); }
  if (!QUIET) for (const r of bad.slice(0, 400)) console.log(`  ${old ? "old" : "FAIL"} ${r.kind} ${r.name}: ${r.msg}`);
  if (DETAIL) for (const r of T.filter((q) => q.group !== "city")) console.log(`  ${old ? "old" : "new"} ${r.kind} ${r.name}: top ${r.top.toFixed(0)} km/h, air ${(r.air || 0).toFixed(2)} s, landings ${r.land ? `${r.land.clean}/${r.land.sketchy}/${r.land.bail}` : "-"}, slips ${r.slips || 0}, crashes ${r.n}`);
  if (!QUIET && !old) {
    const L = T.reduce((a, r) => { if (r.land) for (const k of ["clean", "sketchy", "bail"]) a[k] += r.land[k] || 0; return a; }, { clean: 0, sketchy: 0, bail: 0 });
    console.log(`  landings: clean ${L.clean}, sketchy ${L.sketchy}, bail ${L.bail}; slips saved ${T.reduce((s, r) => s + (r.slips || 0), 0)}`);
    const top = T.find((r) => r.name.startsWith("top speed") && r.kind === "moto"); if (top) console.log(`  motorbike top speed in the run: ${top.top.toFixed(0)} km/h`);
  }
}
if (blocked.length && !QUIET) console.log(`\ncity rides blocked by a collider on the line (info, not a fall): ${blocked.length}\n  ${blocked.join("\n  ")}`);
const NEW = table.filter((r) => !r.old), OLDT = table.filter((r) => r.old);
if (modes.includes(false)) {
  const bad = NEW.filter((r) => !r.ok);
  if (bad.length) { fails += bad.length; if (QUIET) for (const r of bad) console.log(`FAIL ${r.kind} ${r.name}: ${r.msg}`); }
  if (nan) { fails++; console.log("FAIL NaN in a ride"); }
  if (alloc) { const ok = alloc.least < 2048; if (!ok) fails++; console.log(`${ok ? "  ok" : "FAIL"} allocation: ${alloc.runs.join(" / ")} bytes in motoPhysics / carEnv / colliders per ${alloc.steps} steps (per-step garbage would be >= ${alloc.steps * 16})`); }
}
// the switch: ?moto=old a features row, read by motoPhysics.js, the city's envs made by twoWheelEnv (the feel options)
{
  const rd = (f) => readFileSync(join(ROOT, f), "utf8");
  const ok = /old\("moto", "ab"/.test(rd("viewer/features.js")) && /moto=old/.test(rd("viewer/moto/motoPhysics.js")) && /twoWheelEnv\(H\)/.test(rd("viewer/drive/driveMode.js"));
  if (!ok) fails++;
  console.log(`${ok ? "  ok" : "FAIL"} switch: ?moto=old (features row, motoPhysics.js MOTO_OLD), driveMode.js envs by twoWheelEnv`);
}
if (BOTH) {
  const oldBad = OLDT.filter((r) => !r.ok).length;
  if (!oldBad) { fails++; console.log("FAIL ?moto=old passes the table: the gate does not catch the old tuning"); }
  else console.log(`  ?moto=old fails ${oldBad} of ${OLDT.length} rides (the gate catches it)`);
}
console.log(fails ? `\nmotofeel: ${fails} FAIL` : "\nmotofeel: ok");
process.exitCode = fails ? 1 : 0;
