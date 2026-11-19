// node --expose-gc tools/sound/citySoundTest.mjs: the city sound gate (rule 42, docs/SOUND_CITY.md), headless, no browser.
// The real modules (viewer/audio/citySound.js + the engine + banks, the two-wheelers' / the falcon's / the games' audio,
// the sound gate) against a small scripted city (a street canyon with setts and shops, a park with trees, 18 traffic
// cars, a tram 92 stopping and leaving, an SNCB train passing, a flock, the noon bells, rain from 11 s, the player's car
// crashing and scraping at 12 s), rendered by tools/sound/miniWebAudio.mjs (an OfflineAudioContext in pure JS).
// Checks (exit 1 on a failure):
//   render        the 20 s scene renders non-silent (overall and in every 2 s window), no NaN
//   heard         traffic, transit, nature, people and bells each held a voice; the bells struck; the crash played
//   voices        never more voices than the engine's limit, at any control step
//   cost          the main-thread cost of the live frames (feeds + control steps + slices) < 0.1 ms per 60 fps frame
//   garbage       the live control-rate updates make no object / array / closure: all allocation (V8 sampling heap
//                 profiler incl. collected objects, graph building = new voices / one-shots excluded) < 24 KB a step
//                 (what is left: doubles boxed for calls V8 does not inline, the AudioParam setters)
//   growth        no audio node / heap growth after a full GC over 2 x 600 control steps (a graph never let go)
//   gate default  muted with nothing stored and no ?sound=
//   one button    while muted no mode makes a context (city, motorbike, Villo, falcon, game cues); one unmute makes them
//                 and runs every one, one mute suspends every one; the choice is stored per browser
//   no 2nd switch no ?motosound / N key / falcon sound tick / police siren option / dev panel toggle left; every module
//                 that makes an AudioContext imports the gate; main.js imports it first; features.js has citysound
//   old           ?citysound=old: the hook makes nothing
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OfflineAudioContext, ClockAudioContext } from "./miniWebAudio.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet"), WHY = process.argv.includes("--why");
const out = [];
let fails = 0;
const check = (name, ok, msg) => { out.push(`| ${name} | ${ok ? "pass" : "**FAIL**"} | ${msg} |`); if (!ok) { fails++; console.log(`  FAIL ${name}: ${msg}`); } };
const f2 = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : String(x));

// ---- a browser-ish global: window = globalThis, events, storage, location, a counting AudioContext (before the gate)
const listeners = new Map();
globalThis.window = globalThis;
globalThis.addEventListener = (type, f) => { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(f); };
globalThis.removeEventListener = () => {};
const fire = (type) => { for (const f of listeners.get(type) || []) f({ type, target: {} }); };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.location = { search: "" };
const made = [];
class CountingContext extends ClockAudioContext { constructor(o) { super(o); made.push(this); } }
globalThis.AudioContext = CountingContext;

const { soundGate } = await import("../../viewer/audio/soundGate.js");
const { createCitySound, hookCitySound } = await import("../../viewer/audio/citySound.js");

// ---------------------------------------------------------------------------------------------- the scripted city
function makeCity() {
  const T0 = 11 * 3600 + 59 * 60 + 50;              // 11:59:50: the noon bells at t = 10 s
  const S = { t: 0 };
  // one 800 m tile: a street (z = 0) between two rows of buildings (14 m roofs), shops at its west end, setts there;
  // a park east of x = 80 with 80 trees; street trees every 20 m
  const rf = { x0: -400, z0: -400, step: 2, nx: 400, nz: 400, data: new Float32Array(400 * 400) };
  const block = (x0, x1, z0, z1, h) => { for (let z = z0; z < z1; z += 2) for (let x = x0; x < x1; x += 2) { const i = Math.floor((x + 400) / 2), j = Math.floor((z + 400) / 2); rf.data[j * 400 + i] = h; } };
  for (let x = -160; x < 60; x += 40) { block(x, x + 34, 8, 26, 14); block(x, x + 34, -26, -8, 14); }
  const trees = [];
  for (let k = 0; k < 80; k++) { const a = k * 2.39996, r = 10 + (k * 37 % 90); trees.push({ x: 170 + Math.cos(a) * r, z: Math.sin(a) * r, y: 0, height: 12 + (k % 5) * 2 }); }
  for (let x = -150; x < 300; x += 20) trees.push({ x, z: 6.5, y: 0, height: 9 }, { x: x + 10, z: -6.5, y: 0, height: 9 });
  const shops = []; for (let k = 0; k < 10; k++) shops.push({ kind: "shop", x: -70 + k * 7, z: k % 2 ? 9 : -9 });
  const tile = {
    name: "T0", bounds: { x0: -400, x1: 400, z0: -400, z1: 400 }, roofs: rf,
    feats: { trees, areas: [{ kind: "park", rings: [[[80, -120], [260, -120], [260, 120], [80, 120]]] }], points: shops },
    roads: { nodes: [{ id: "a", x: -300, z: 0 }, { id: "b", x: 0, z: 0 }, { id: "c", x: 300, z: 0 }], roads: [{ id: "r1", a: "a", b: "b", pts: [], meta: { surface: "sett" } }, { id: "r2", a: "b", b: "c", pts: [], meta: { surface: "asphalt" } }] },
  };
  // traffic: 18 cars on two lanes (z = +-3), wrapping in x -300..300
  const cap = 64, sim = { cap, alive: new Uint8Array(cap), x: new Float32Array(cap), z: new Float32Array(cap), y: new Float32Array(cap), v: new Float32Array(cap), yaw: new Float32Array(cap), acc: new Float32Array(cap), type: new Uint8Array(cap) };
  for (let i = 0; i < 18; i++) { sim.alive[i] = 1; const east = i % 2 === 0; sim.z[i] = east ? 3 : -3; sim.x[i] = -300 + (i * 37) % 600; sim.v[i] = 8 + (i * 1.7) % 5; sim.yaw[i] = east ? Math.PI / 2 : -Math.PI / 2; sim.type[i] = i % 4; }
  const types = [{ name: "hatch_c", len: 4.3 }, { name: "suv", len: 4.4 }, { name: "van_p", len: 5.0 }, { name: "moto", len: 2.1 }];
  // the tram: along z = 1 heading +x, nose at x = -250 + d; 10 m/s, brakes to a stop at 8 s, doors 9-14.5 s, leaves at 15 s
  const tram = { d: 160, v: 10, doors: 0 };
  const tramObj = {
    soundFeed(o, oD) {
      const x = -250 + tram.d;
      o[0] = x - 3; o[1] = 1; o[2] = 0; o[3] = x - 29; o[4] = 1; o[5] = tram.d > 300 && tram.d < 340 ? 1 / 25 : 0; o[6] = tram.doors; o[7] = 5; oD[0] = tram.d;
      return 1;
    },
    clockSecs: T0,
  };
  // the train: z = 140 heading +x, 30 m/s, nose passes x = 0 at t = 10 s
  const route = { atInto(s, o) { o[0] = -1000 + s; o[1] = 0; o[2] = 140; o[3] = 0; return o; } };
  const train = { d: 700 };
  const trainsObj = { soundFeed(o, oR) { o[0] = 2; o[1] = 30; o[2] = 81; o[3] = train.d; oR[0] = route; return 1; } };
  const flocks = [{ key: "jackdaws", on: true, x: 120, y: 40, z: -30 }];
  const P = { x: -40, z: -3 };
  const host = {
    listener(L) { L.x = -60 + 8 * S.t; L.y = 1.7; L.z = 5; L.fx = 1; L.fy = 0; L.fz = 0; },
    tiles: () => [tile], groundAt: () => 0,
    traffic: () => ({ sim, types }), tram: () => tramObj, trains: () => trainsObj, flocks: () => flocks,
    clock: () => tramObj.clockSecs, month: () => 5,
    weather(W) { W.rain = S.t > 11 ? 0.5 : 0; W.wind = 4; W.wet = S.t > 11 ? 0.6 : 0; },
    player(p) { p.on = true; p.car = true; p.x = P.x; p.y = 0; p.z = P.z; p.speed = 12; p.load = 0.3; },
  };
  // (the scene loops every 20 s: the live test runs longer than the script)
  const advance = (t0, dt) => {
    const t = t0 % 20;
    if (t < S.t) { tram.d = 160; train.d = 700; }
    S.t = t;
    if (!S.freeze) for (let i = 0; i < 18; i++) { const e = i % 2 === 0 ? 1 : -1; sim.x[i] += e * sim.v[i] * dt; if (sim.x[i] > 300) sim.x[i] -= 600; if (sim.x[i] < -300) sim.x[i] += 600; }
    if (t < 4) tram.v = 10; else if (t < 8) tram.v = Math.max(0, 10 - 2.5 * (t - 4)); else if (t < 15) tram.v = 0; else tram.v = Math.min(10, 1.2 * (t - 15));
    tram.d += tram.v * dt;
    tram.doors = t < 9 ? 0 : t < 10 ? t - 9 : t < 13.5 ? 1 : t < 14.5 ? 14.5 - t : 0;
    train.d += 30 * dt; tramObj.clockSecs = T0 + t0;
    P.x = -40 + 12 * t;
  };
  return { host, advance, S };
}

// ---------------------------------------------------------------------------------------------- 1 the offline render
{
  const SR = 16000, DUR = 20;
  const ctx = new OfflineAudioContext(2, SR * DUR, SR);
  const city = makeCity();
  const cs = createCitySound(city.host, { ctx, offline: true, bakeHere: true });
  const tb = Date.now();
  await cs.start();
  const bakeS = (Date.now() - tb) / 1000;
  const E = cs.engine, held = { traffic: 0, transit: 0, nature: 0, people: 0, bells: 0 };
  let maxVoices = 0, over = 0, crash = null;
  const dt = 0.1;
  for (let k = 0; k < DUR * 10; k++) {
    const t = k * dt;
    city.advance(t, dt);
    if (Math.abs(t - 12) < 1e-6) crash = cs.impact({ x: -40 + 12 * t, z: -3, speed: 9, k: 1 });
    if (t >= 12.2 && t < 13.8) cs.contact(6);
    cs.step(t);
    const v = E.stats.voices; maxVoices = Math.max(maxVoices, v); if (v > E.voiceLimit) over++;
    for (const s of E._list) if (s._voice) held[s.category]++;
    for (const ev of E.events) held[ev.src.category]++;
  }
  const tr = Date.now();
  const buf = await ctx.startRendering();
  const renderS = (Date.now() - tr) / 1000;
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let nan = 0, sum = 0, peak = 0;
  const win = []; let ws = 0;
  for (let i = 0; i < L.length; i++) {
    const a = L[i], b = R[i];
    if (!Number.isFinite(a) || !Number.isFinite(b)) { nan++; continue; }
    const e = (a * a + b * b) / 2; sum += e; ws += e; peak = Math.max(peak, Math.abs(a), Math.abs(b));
    if ((i + 1) % (SR * 2) === 0) { win.push(Math.sqrt(ws / (SR * 2))); ws = 0; }
  }
  const rms = Math.sqrt(sum / L.length), db = (x) => (20 * Math.log10(Math.max(1e-9, x))).toFixed(1);
  const quiet = win.filter((w) => w < 1e-3).length;
  check("render", nan === 0 && rms > 3e-3 && quiet === 0,
    `20 s at ${SR} Hz: RMS ${db(rms)} dBFS, peak ${db(peak)} dBFS, every 2 s window ${win.map(db).join(" / ")} dBFS (none under -60), NaN ${nan}; banks baked ${f2(bakeS, 1)} s, rendered ${f2(renderS, 1)} s (${ctx._nodes} nodes)`);
  const cats = Object.entries(held);
  check("heard", cats.every(([, n]) => n > 0) && cs.stats.bells > 0 && !!crash,
    `voice-steps per category: ${cats.map(([c, n]) => `${c} ${n}`).join(", ")}; bells struck ${cs.stats.bells} (tram bells + the hour), crash event ${crash ? "played" : "MISSING"}, perches ${cs.stats.perches}, murmurs ${cs.stats.murmurs}, env ${cs.stats.env}`);
  check("voices", over === 0 && maxVoices > 8, `max ${maxVoices} voices held at once (limit ${E.voiceLimit}), steps over the limit ${over}`);
}

// ---------------------------------------------------------------------------------------------- 2 live cost + allocation
{
  const ctx = new ClockAudioContext({ sampleRate: 16000 });
  const city = makeCity();
  const cs = createCitySound(city.host, { ctx, bakeHere: true });
  await cs.start();
  const dt = 1 / 60;
  let t = 0;
  // (timed out here: the city runs without its own performance.now stats; the fake city's advance is outside the timing)
  const frame = () => { t += dt; ctx.currentTime = t; city.advance(t, dt); const a = performance.now(); cs.frame(dt); return performance.now() - a; };
  for (let i = 0; i < 7200; i++) frame();                        // warm: 2 min of frames (the 10 Hz code reaches the optimizing tier; unoptimized code boxes every double)
  // three runs of 1200 frames (20 s): the best run's mean (a GC pause or the OS taking the core on a loaded machine lands
  // in one run, not in all three: timing rows flake under load, re-run alone)
  let best = null;
  for (let r = 0; r < 3; r++) {
    const ms = new Float64Array(1200);
    const t0 = performance.now();
    for (let i = 0; i < 1200; i++) ms[i] = frame();
    const wall = (performance.now() - t0) / 1200;                 // (includes the fake city's own advance)
    ms.sort();
    const mean = ms.reduce((a, b) => a + b, 0) / ms.length, run = { mean, p99: ms[Math.floor(ms.length * 0.99)], max: ms[ms.length - 1], wall, voices: cs.engine.stats.voices };
    if (!best || run.mean < best.mean) best = run;
  }
  const { mean, p99, max, wall } = best;
  check("cost", mean < 0.1, `live frames (feeds + 10 Hz control + slices, ${best.voices} voices, best of 3 x 1200): ${f2(mean, 4)} ms per frame mean, p99 ${f2(p99)} ms, max ${f2(max)} ms (budget 0.1 ms mean; whole frame with the fake city ${f2(wall, 4)} ms)`);

  const { Session } = await import("node:inspector/promises");
  const ses = new Session(); ses.connect();
  await ses.post("HeapProfiler.enable");
  // graph building (a new voice / one-shot / lazy layer, a model swap, a release) allocates by nature: excluded by function
  const BUILD = /^(event|Emitter|setModel|_panner|_release|dispose|create\w*|on|setts|wet|playBuffer|loopSource|makeGain|makeFilter|smoothParam|setEnvironment|makeImpulse|tramEvent|bell|own|loop|osc|gain|filter|kill|lazyLayer|layer|self\.on|self\.stop|self\.idle|stop|idle|play\w*|_retire|_dropDead)$/;
  const ours = /viewer\/audio\/(citySound|engine|util|vehicles|transit|ambience|crash)\.js$/;
  const url = (n) => n.callFrame.url.split("\\").join("/");
  const sample = async (frames, garbage) => {
    await ses.post("HeapProfiler.startSampling", { samplingInterval: 64, includeObjectsCollectedByMajorGC: garbage, includeObjectsCollectedByMinorGC: garbage });
    for (let i = 0; i < frames; i++) frame();
    const { profile } = await ses.post("HeapProfiler.stopSampling");
    let bytes = 0;
    const top = new Map();
    const walk = (n) => {
      if (BUILD.test(n.callFrame.functionName)) return;
      if (n.selfSize && ours.test(url(n))) { bytes += n.selfSize; const k = `${n.callFrame.functionName || "(anon)"} @ ${url(n).split("/").pop()}:${n.callFrame.lineNumber + 1}`; top.set(k, (top.get(k) || 0) + n.selfSize); }
      for (const c of n.children) walk(c);
    };
    walk(profile.head);
    if (WHY) console.log(`  ${garbage ? "garbage" : "retained"}:\n` + [...top].sort((x, y) => y[1] - x[1]).slice(0, 10).map(([k, v]) => `    ${v} B  ${k}`).join("\n"));
    return bytes;
  };
  for (let i = 0; i < 12000; i++) frame();                       // (more warm-up: the optimizing tier's own metadata settles)
  // GROWTH (a leak: what the control steps keep): the audio nodes still alive and the heap, after a full GC, before and
  // after 2 x 6 000 frames (100 s each; the disposed voices' graphs are let go 150 ms after their fade: timers first)
  if (globalThis.gc) {
    city.S.freeze = true;                                        // (the cars hold their places: the voices held stay the same)
    const settle = async () => { await new Promise((r) => setTimeout(r, 400)); gc(); gc(); return [ctx.alive(), process.memoryUsage().heapUsed]; };
    const [n0, h0] = await settle();
    for (let i = 0; i < 6000; i++) frame();
    const [n1, h1] = await settle();
    for (let i = 0; i < 6000; i++) frame();
    const [n2, h2] = await settle();
    city.S.freeze = false;
    const nodeGrow = Math.max(n1 - n0, n2 - n1), heapGrow = h2 - h0;
    check("growth", nodeGrow < 40 && heapGrow < 2 * 1024 * 1024, `audio nodes alive after a full GC: ${n0} -> ${n1} -> ${n2} every 600 control steps, the cars held still (budget +40 a window: one voice's graph is ~12 nodes); heap ${((h1 - h0) / 1024).toFixed(0)} / ${((h2 - h1) / 1024).toFixed(0)} KB (budget 2 MB over both: V8's own code / feedback settles in it)`);
  } else check("growth", false, "run with node --expose-gc (the gate row does)");
  // GARBAGE (everything allocated, collected or not), with a lean stand-in for the Web Audio API (its automation storage is
  // the browser's, in C++): what is left is ours: numbers boxed to cross into the API and our own temporaries
  const AP = Object.getPrototypeOf(ctx.createGain().gain), SINK = new Float64Array(4), saved = {};
  for (const k of ["setValueAtTime", "linearRampToValueAtTime", "exponentialRampToValueAtTime", "setTargetAtTime", "cancelScheduledValues", "cancelAndHoldAtTime"]) { saved[k] = AP[k]; AP[k] = function (v, t) { SINK[0] = v; SINK[1] = t; return this; }; }
  for (let i = 0; i < 1200; i++) frame();
  const g = Math.min(await sample(600, true), await sample(600, true));
  Object.assign(AP, saved);
  const perStep = g / 60;
  check("garbage", perStep < 24576, `all allocation (collected too) over 600 live frames: ${(g / 1024).toFixed(0)} KB = ${(perStep / 1024).toFixed(1)} KB per control step, ${(g / 10 / 1024).toFixed(0)} KB/s (budget 24 KB a step. No object / array / closure / string is made per update; what is left is V8 boxing doubles passed to calls it does not inline: the AudioParam calls and the voices' smoothing setters, young-generation garbage)`);
}

// ---------------------------------------------------------------------------------------------- 3 the gate: default, one button
{
  check("gate default", soundGate.muted === true && store.get("uccle-sound") === undefined, `muted at start with nothing stored and no ?sound= (soundGate.muted = ${soundGate.muted})`);
  const { MotoAudio, BikeAudio, VOICES } = await import("../../viewer/moto/motoAudio.js");
  const { FalconAudio } = await import("../../viewer/falconFlight/falconAudio.js");
  const { GameAudio } = await import("../../viewer/game/audio.js");
  const moto = new MotoAudio(VOICES.four), villo = new BikeAudio(), falcon = new FalconAudio(), game = new GameAudio();
  moto.active = true; villo.active = true;
  const city = makeCity(), updaters = [];
  const cam = { position: { x: 0, y: 1.7, z: 5 }, matrixWorld: { elements: new Float32Array(16).fill(0) } };
  const world = { tiles: city.host.tiles(), surface: () => 0 };
  const driver = { on: false, state: null, vehicle: "car", carHit: { on() {} }, env: { contacts: 0 } };
  const cs = hookCitySound({ soundGate, camera: cam, world, driver, getTram: () => null, getTrains: () => null, getTraffic: () => null, getFlocks: () => null, wx: null, updaters, log: () => {} });
  const n0 = made.length;
  fire("pointerdown"); fire("keydown"); game.radio(); game.tick();
  for (let i = 0; i < 30; i++) for (const u of updaters) u();
  const mutedMade = made.length - n0;
  soundGate.set(false);                                          // the speaker button: on
  await cs.starting;
  game.radio();
  const after = made.slice(n0), running = after.filter((c) => c.state === "running").length;
  const who = { city: !!cs.ctx, motorbike: !!moto.ctx, villo: !!villo.ctx, falcon: !!falcon.ctx, game: !!game.ctx };
  const stored = store.get("uccle-sound");
  soundGate.set(true);                                           // and off
  const suspended = after.filter((c) => c.state === "suspended").length;
  check("one button", mutedMade === 0 && Object.values(who).every(Boolean) && running === after.length && suspended === after.length && stored === "on" && store.get("uccle-sound") === "off",
    `muted: ${mutedMade} contexts made (clicks, keys, game cues, 30 city frames); one unmute: ${after.length} made (${Object.entries(who).map(([k, v]) => `${k} ${v ? "yes" : "NO"}`).join(", ")}), ${running} running; one mute: ${suspended} suspended; stored "${stored}" then "${store.get("uccle-sound")}"`);
}

// ---------------------------------------------------------------------------------------------- 4 no second switch (static)
{
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = path.join(d, f); const st = statSync(p); if (st.isDirectory()) walk(p); else if (/\.js$/.test(f) && !/bundle/.test(f)) files.push(p); } };
  walk(path.join(ROOT, "viewer"));
  const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");
  const bad = [];
  for (const p of files) {
    const s = readFileSync(p, "utf8"), r = rel(p);
    if (/motosound/.test(s)) bad.push(`${r}: ?motosound`);
    if (/new (window\.)?(webkit)?AudioContext\(/.test(s) && !/soundGate\.js/.test(s) && !/audio\/soundGate\.js$/.test(r)) bad.push(`${r}: makes an AudioContext without importing the gate`);
  }
  const src = (r) => readFileSync(path.join(ROOT, r), "utf8");
  if (/"KeyN"/.test(src("viewer/drive/input.js")) || /KeyN/.test(src("viewer/drive/driveMode.js"))) bad.push("drive: the N sound key");
  if (/id: "sound"/.test(src("viewer/falconGame/falconGameDef.js"))) bad.push("falcon game: the sound tick");
  if (/id: "siren"/.test(src("viewer/police/policeGame.js"))) bad.push("police game: the siren sound option");
  if (/two-wheeler sound/.test(src("viewer/devPanel.js"))) bad.push("dev panel: the two-wheeler sound toggle");
  // main.js: the gate right after quick.js (which must stay first: it rewrites the URL) and quick.js makes no context
  const imports = src("viewer/main.js").match(/^import .*$/gm) || [], gi = imports.findIndex((l) => /audio\/soundGate\.js/.test(l));
  if (gi < 0 || imports.slice(0, gi).some((l) => !/\.\/quick\.js/.test(l)) || /AudioContext/.test(src("viewer/quick.js"))) bad.push(`main.js: the gate is not imported first (after quick.js): import #${gi}`);
  if (!/old\("citysound"/.test(src("viewer/features.js"))) bad.push("features.js: no citysound row");
  check("no 2nd switch", bad.length === 0, bad.length ? bad.join("; ") : `${files.length} viewer modules: no ?motosound / N key / falcon sound tick / siren option / panel toggle; every AudioContext maker imports the gate; main.js imports it first; features.js row citysound`);
}

// ---------------------------------------------------------------------------------------------- 5 ?citysound=old
{
  const s = readFileSync(path.join(ROOT, "viewer/audio/citySound.js"), "utf8"), m = readFileSync(path.join(ROOT, "viewer/main.js"), "utf8");
  const ok = /CITY_SOUND_OLD\) \{ log\(/.test(s) && /params\.get\("citysound"\) !== "old"/.test(m);
  check("old", ok, "?citysound=old: main.js skips the hook (and hookCitySound returns null): the silent city as before");
}

console.log(`\n## citySoundTest (rule 42, docs/SOUND_CITY.md)\n| check | result | measured |\n|---|---|---|\n${out.join("\n")}`);
if (!QUIET || fails) console.log(fails ? `\n${fails} check(s) FAILED` : "\nall checks pass");
process.exitCode = fails ? 1 : 0;
