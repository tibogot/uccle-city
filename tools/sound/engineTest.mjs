// node --expose-gc tools/sound/engineTest.mjs: the player car's engine sound gate (rule 47, docs/ENGINE_SOUND.md),
// headless: the real modules (viewer/audio/engineModel.js, engineLoops.js, engineSound.js, the city's SoundEngine) rendered
// by tools/sound/miniWebAudio.mjs. Checks (exit 1 on a failure):
//   loops     the 2 x 9 gen6 loops are there: 16-bit mono 48 kHz, 1.0 s, under 2 MB together
//   seams     no click at any loop's seam: the step across the wrap (last sample -> first) is no bigger than the steps
//             inside the loop (its 99.9th percentile), and the click metric across the seam is under the loop's own peak
//   rpm       a scripted drive (0 -> 120 km/h flat out, lift off, brake to a stop, idle): the RPM follows the wheels in
//             gear (+-8 %), >= 4 upshifts, each a drop and a drive cut (load < 0.3 within the 0.13 s cut), never over the
//             redline, coasting load < 0.1 within 0.3 s of the lift, idle +-60 rpm within 2 s of the stop
//   render    the drive rendered through the city engine's emitter chain (Doppler, panner, reverb, compressor): not silent,
//             no NaN
//   crossfades no click at the RPM brackets' crossfades: sweeps through every bracket both ways at load 1 / 0.5 / 0, the
//             most isolated sample-level spike of the output (second difference against the sharpest within 40 ms) under
//             1.5 x the loops' own
//   cost      the per-frame main-thread cost of the engine voice (model + loop writes) < 0.05 ms mean
//   garbage   no object / array / closure / string per frame in engineModel / engineLoops / engineSound: what is left is
//             the doubles boxed into the Web Audio calls (<= 40 B per AudioParam write), as rule 42 allows
//   default   muted by default: nothing is fetched or built while the speaker button is off
//   old       ?engine=old: the hook makes no engine; (the features.js row: the meta row)
// --demo <file.wav>: also renders a 30 s city drive (stereo, 48 kHz) for listening.
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { OfflineAudioContext, ClockAudioContext } from "./miniWebAudio.mjs";
import { measure, bestOf } from "../gate/timing.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet"), WHY = process.argv.includes("--why");
const demoAt = process.argv.indexOf("--demo"), DEMO = demoAt > 0 ? process.argv[demoAt + 1] : null;
const out = [];
let fails = 0;
const check = (name, ok, msg) => { out.push(`| ${name} | ${ok ? "pass" : "**FAIL**"} | ${msg} |`); if (!ok) { fails++; console.log(`  FAIL ${name}: ${msg}`); } };
const f2 = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : String(x));

const store = new Map();
globalThis.window = globalThis;
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.location = { search: "" };
globalThis.AudioContext = ClockAudioContext;

const { soundGate } = await import("../../viewer/audio/soundGate.js");
const { SoundEngine } = await import("../../viewer/audio/engine.js");
const { createEngineModel, ENGINE_CAR } = await import("../../viewer/audio/engineModel.js");
const { LOOP_ENGINES, loopUrls } = await import("../../viewer/audio/engineLoops.js");
const { createPlayerEngine } = await import("../../viewer/audio/engineSound.js");

// ---- a WAV reader (16-bit PCM) into the context's AudioBuffer: the test's decodeAudioData
const readWav = (file) => {
  const b = readFileSync(file);
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WAVE") throw new Error(`${file}: not a WAV`);
  let i = 12, fmt = null, data = null;
  while (i + 8 <= b.length) { const id = b.toString("ascii", i, i + 4), sz = b.readUInt32LE(i + 4); if (id === "fmt ") fmt = { ch: b.readUInt16LE(i + 10), sr: b.readUInt32LE(i + 12), bits: b.readUInt16LE(i + 22) }; else if (id === "data") data = b.subarray(i + 8, i + 8 + sz); i += 8 + sz + (sz & 1); }
  const n = data.length / 2 / fmt.ch, x = new Float32Array(n);
  for (let k = 0; k < n; k++) x[k] = data.readInt16LE(k * 2 * fmt.ch) / 32768;
  return { ...fmt, x, bytes: b.length };
};
const fileOf = (u) => fileURLToPath(u);
const loaderFor = (ctx) => async (u) => { const w = readWav(fileOf(u)); const B = ctx.createBuffer(1, w.x.length, w.sr); B.getChannelData(0).set(w.x); return B; };

// ---- the click metric: an ISOLATED sample-level spike. The second difference e at a sample against the sharpest e of its
// 40 ms neighbourhood leaving out +-1 ms round it: an engine's firings repeat every few ms (another as sharp nearby, a
// ratio near 1 even while the level moves), a click stands alone (a ratio of several). Only samples over 4 x the local
// RMS of e are tried.
function spikes(x, sr, from = 0, to = x.length) {
  const n = to - from, e = new Float32Array(n);
  for (let i = 2; i < n; i++) e[i] = Math.abs(x[from + i] - 2 * x[from + i - 1] + x[from + i - 2]);
  const W = Math.round(sr * 0.02), G = Math.max(2, Math.round(sr * 0.001)), c = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) c[i + 1] = c[i] + e[i] * e[i];
  let best = 0, at = 0;
  for (let i = 2; i < n; i++) {
    const a = Math.max(0, i - W), b = Math.min(n, i + W), rms = Math.sqrt((c[b] - c[a]) / (b - a));
    if (rms < 1e-6 || e[i] < 4 * rms || e[i] <= best * rms * 1e-9) continue;
    let m = 0;
    for (let j = a; j < b; j++) if ((j < i - G || j > i + G) && e[j] > m) m = e[j];
    const r = e[i] / Math.max(m, rms);
    if (r > best) { best = r; at = from + i; }
  }
  return { best, at };
}

// ---------------------------------------------------------------------------------------------- 1 the loops + seams
const U = loopUrls("gen6"), files = [...U.on, ...U.off].map(fileOf);
let srcPeak = 0;
{
  const miss = files.filter((f) => !existsSync(f));
  let bad = [], bytes = 0;
  const seamBad = [];
  if (!miss.length) for (const f of files) {
    const w = readWav(f); bytes += w.bytes;
    if (w.ch !== 1 || w.sr !== 48000 || w.bits !== 16 || Math.abs(w.x.length - 48000) > 480) bad.push(path.basename(f));
    // the seam: the loop twice in a row, the metric across the wrap vs inside
    const x = w.x, N = x.length, d = new Float32Array(N - 1);
    for (let i = 1; i < N; i++) d[i - 1] = Math.abs(x[i] - x[i - 1]);
    const sorted = Float32Array.from(d).sort(), p999 = sorted[Math.floor(sorted.length * 0.999)], wrap = Math.abs(x[0] - x[N - 1]);
    const two = new Float32Array(2 * N); two.set(x); two.set(x, N);
    const inside = spikes(two, 48000, 0, N).best, seam = spikes(two, 48000, N - 960, N + 960).best;
    srcPeak = Math.max(srcPeak, inside);
    if (wrap > p999 || seam > inside * 1.25) seamBad.push(`${path.relative(ROOT, f)} wrap ${f2(wrap, 4)} vs p99.9 ${f2(p999, 4)}, seam spike ${f2(seam, 1)} vs inside ${f2(inside, 1)}`);
  }
  check("loops", !miss.length && !bad.length && bytes < 2 * 1048576, `${files.length} loops (gen6: ${LOOP_ENGINES.gen6.rpms.join(", ")} rpm, on + off), ${(bytes / 1048576).toFixed(2)} MB${miss.length ? `; MISSING ${miss.length}` : ""}${bad.length ? `; not 1 s mono 48 kHz 16-bit: ${bad.join(", ")}` : ""}`);
  check("seams", !miss.length && !seamBad.length, seamBad.length ? seamBad.slice(0, 4).join("; ") : `every loop's wrap step under its inner 99.9th percentile step, the seam's spike within 1.25 x the loop's own (loops' sharpest spike ${f2(srcPeak, 1)})`);
}

// ---------------------------------------------------------------------------------------------- 2 the scripted drive
// a carCtl-like car: power 6.4 m/s2 (a = 6.4 * 12.5 / v above 12.5 m/s), brakes 8 m/s2, coasting ~0.5 m/s2 + drag;
// the pedal ramps as carCtl's shaped input does (in ~0.25 s, out faster)
function makeDrive(script) {
  const c = { x: 0, z: 0, y: 0, heading: 0, speed: 0, vx: 0, vz: 0, thrS: 0, grounded: 1, braking: false };
  let t = 0;
  return {
    c, get t() { return t; },
    step(dt) {
      t += dt;
      const want = script(t, c);
      const rate = want === 0 || want * c.thrS < 0 ? 6 : 4;
      c.thrS += Math.max(-rate * dt, Math.min(rate * dt, want - c.thrS));
      const v = c.speed;
      let a = -0.35 - 0.0006 * v * v;
      if (c.thrS > 0) a = c.thrS * 6.4 * 12.5 / Math.max(12.5, v) - 0.0006 * v * v;
      if (c.thrS < 0 && v > 0) a = c.thrS * 8;
      c.speed = Math.max(0, v + a * dt);
      c.braking = c.thrS < -0.01 && c.speed > 0;
      c.x += Math.sin(c.heading) * c.speed * dt; c.z += Math.cos(c.heading) * c.speed * dt;
    },
  };
}
// 0 -> 120 km/h flat out, lift 3 s, brake to a stop, idle
const SCRIPT = (t, c) => (c._ph ??= 0, c._ph === 0 ? (c.speed * 3.6 >= 120 ? (c._ph = 1, c._lift = t, 0) : 1) : c._ph === 1 ? (t - c._lift > 3 ? (c._ph = 2, -1) : 0) : c._ph === 2 ? (c.speed <= 0 ? (c._ph = 3, c._stop = t, 0) : -1) : 0);
{
  const D = makeDrive(SCRIPT), M = createEngineModel(ENGINE_CAR), dt = 1 / 60, cfg = ENGINE_CAR;
  let ups = 0, topGear = 1, cutMin = 1, anyShift = -1, lastGear = 1, dropBad = 0, cutBad = 0, follow = 0, followN = 0, over = 0, liftLoad = null, idleErr = null, maxKmh = 0, prevRpm = cfg.idle, shiftAt = -1;
  const k = 60 / (3.6 * 2 * Math.PI * cfg.wheelRadius);
  for (let i = 0; i < 60 * 40; i++) {
    D.step(dt);
    const c = D.c, kmh = c.speed * 3.6; maxKmh = Math.max(maxKmh, kmh);
    const s = M.update(dt, kmh, Math.max(0, c.thrS), true, false, false);
    if (s.gear > lastGear) { ups++; shiftAt = D.t; cutMin = 1; }
    if (s.gear !== lastGear) anyShift = D.t;
    if (shiftAt > 0 && D.t - shiftAt < 0.125) cutMin = Math.min(cutMin, s.load);
    if (shiftAt > 0 && Math.abs(D.t - shiftAt - 0.125) < dt / 2 && cutMin > 0.3) cutBad++;
    if (shiftAt > 0 && Math.abs(D.t - shiftAt - 0.12) < dt / 2 && s.rpm > prevRpm * 0.9 && lastGear === s.gear) dropBad++;
    lastGear = s.gear; topGear = Math.max(topGear, s.gear);
    if (s.rpm > cfg.redline + 61) over++;
    if (s.shifting <= 0 && kmh > 25 && D.t - anyShift > 0.6) { const want = kmh * k * M.ratio[s.gear - 1]; follow = Math.max(follow, Math.abs(s.rpm - want) / want); followN++; }
    if (c._ph >= 1 && liftLoad === null && D.t - c._lift >= 0.3) liftLoad = s.load;
    if (c._ph === 3 && idleErr === null && D.t - c._stop >= 2) idleErr = Math.abs(s.rpm - cfg.idle);
    if (s.shifting > 0 && D.t === shiftAt) prevRpm = s.rpm;
    prevRpm = s.shifting > 0 ? prevRpm : s.rpm;
  }
  check("rpm", maxKmh >= 120 && ups >= 4 && cutBad === 0 && dropBad === 0 && over === 0 && follow < 0.08 && liftLoad !== null && liftLoad < 0.1 && idleErr !== null && idleErr < 60,
    `0 -> ${maxKmh.toFixed(0)} km/h flat out: ${ups} upshifts (top gear ${topGear}), shifts whose 0.13 s cut never took the load under 0.3: ${cutBad}, no drop after a shift: ${dropBad}, over the redline: ${over}; in gear the RPM within ${(follow * 100).toFixed(1)} % of the wheels (${followN} frames); coasting load 0.3 s after the lift ${f2(liftLoad)}; idle error 2 s after the stop ${f2(idleErr, 0)} rpm`);
}

// ---------------------------------------------------------------------------------------------- 3 render through the chain
async function renderDrive(seconds, script, { sr = 48000, file = null } = {}) {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sr), sr);
  const E = new SoundEngine(ctx, { voiceLimit: 8, hrtfVoices: 2, controlRate: 10, offline: false, environment: "canyon" });
  E.timing = false; E.envAuto = false;
  const pe = createPlayerEngine({ getEngine: () => E, gate: { muted: false }, load: loaderFor(ctx) });
  const D = makeDrive(script);
  pe.update(D.c, 0, null); await pe.loading;
  if (!pe.bank) throw new Error("loops not loaded: " + pe.error);
  const dt = 6 * 128 / sr;                                      // a "frame" every 6 blocks (16 ms)
  const L = E.listener;
  const rpmLog = [];
  const buf = await ctx.startRendering((q) => {
    if (q % 6) return;
    D.step(dt); pe.update(D.c, dt, null);
    const c = D.c; L.x = c.x - Math.sin(c.heading) * 6; L.z = c.z - Math.cos(c.heading) * 6; L.y = 1.6; L.fx = Math.sin(c.heading); L.fy = 0; L.fz = Math.cos(c.heading);
    E.frame(dt);
    rpmLog.push(pe.model.s.rpm);
  });
  if (file) {
    const a = buf.getChannelData(0), b = buf.getChannelData(1), n = a.length, w = Buffer.alloc(44 + n * 4);
    w.write("RIFF", 0); w.writeUInt32LE(36 + n * 4, 4); w.write("WAVEfmt ", 8); w.writeUInt32LE(16, 16); w.writeUInt16LE(1, 20); w.writeUInt16LE(2, 22);
    w.writeUInt32LE(sr, 24); w.writeUInt32LE(sr * 4, 28); w.writeUInt16LE(4, 32); w.writeUInt16LE(16, 34); w.write("data", 36); w.writeUInt32LE(n * 4, 40);
    let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(a[i]), Math.abs(b[i]));
    const g = pk > 0.89 ? 0.89 / pk : 1;
    for (let i = 0; i < n; i++) { w.writeInt16LE(Math.round(Math.max(-1, Math.min(1, a[i] * g)) * 32767), 44 + i * 4); w.writeInt16LE(Math.round(Math.max(-1, Math.min(1, b[i] * g)) * 32767), 46 + i * 4); }
    writeFileSync(file, w);
  }
  return { buf, pe, E, rpmLog };
}
{
  const t0 = Date.now();
  const { buf, rpmLog } = await renderDrive(24, SCRIPT, { sr: 24000 });
  const x = buf.getChannelData(0), sr = buf.sampleRate;
  let nan = 0, sum = 0; for (const v of x) { if (!Number.isFinite(v)) nan++; else sum += v * v; }
  const rms = Math.sqrt(sum / x.length);
  const brackets = new Set(); for (const r of rpmLog) { let k = 0; const R = LOOP_ENGINES.gen6.rpms; while (k < R.length - 2 && r > R[k + 1]) k++; brackets.add(k); }
  const sp = spikes(x, sr, sr, x.length);
  check("render", nan === 0 && rms > 3e-3, `24 s drive at ${sr} Hz through the emitter (Doppler, panner, canyon reverb, compressor): RMS ${(20 * Math.log10(rms)).toFixed(1)} dBFS, NaN ${nan}; ${brackets.size} RPM brackets crossed; most isolated spike ${f2(sp.best, 1)} at ${f2(sp.at / sr, 2)} s (the shift cuts' load swings: information); rendered in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
// the BRACKET CROSSFADES: sweeps 1000 -> 8200 -> 1000 rpm (every bracket both ways, twice) at full load, half and coasting,
// the voice driven directly into an emitter of the city engine: no spike sharper than 1.5 x the loops' own
{
  const sr = 24000, secs = 13, ctx = new OfflineAudioContext(2, sr * secs * 3, sr);
  const E = new SoundEngine(ctx, { voiceLimit: 4, hrtfVoices: 1, controlRate: 10, offline: false, environment: "open" });
  E.timing = false; E.envAuto = false;
  const { loadLoopBank, createLoopVoice } = await import("../../viewer/audio/engineLoops.js");
  const bank = await loadLoopBank(ctx, "gen6", loaderFor(ctx));
  let voice = null;
  E.add({ category: "traffic", priority: 3, ref: 2.5, range: 120, doppler: true, noOcclusion: true, gain: 1, seed: 0.3, x: 0, y: 0.5, z: 4, vx: 0, vy: 0, vz: 0, active: true,
    create: (c, input, now) => { voice = createLoopVoice(c, bank, input, { now }); return { update() {}, dispose: (w) => voice.dispose(w) }; } });
  const dt = 6 * 128 / sr;
  const buf = await ctx.startRendering((q) => {
    if (q % 6) return;
    const t = ctx.currentTime, seg = Math.floor(t / secs), u = ((t % secs) - 0.5) / 12, w = u < 0 ? 0 : u < 0.5 ? 2 * u : u < 1 ? 2 - 2 * u : 0;
    E.frame(dt);
    if (voice) voice.update(t, 1000 + 7200 * (w < 0.5 ? 2 * w : 2 - 2 * w), [1, 0.5, 0][Math.min(2, seg)], false);
  });
  const x = buf.getChannelData(0);
  const res = [0, 1, 2].map((s) => spikes(x, sr, (s * secs + 1) * sr, (s + 1) * secs * sr));
  const worst = Math.max(...res.map((r) => r.best));
  check("crossfades", !!voice && worst < srcPeak * 1.5, `sweeps 1000 -> 8200 -> 1000 rpm twice at load 1 / 0.5 / 0 through an emitter: most isolated spike ${res.map((r) => f2(r.best, 2)).join(" / ")} vs the loops' own ${f2(srcPeak, 2)} (budget x 1.5)`);
}

// ---------------------------------------------------------------------------------------------- 4 live cost + garbage
{
  const ctx = new ClockAudioContext({ sampleRate: 16000 });
  const E = new SoundEngine(ctx, { voiceLimit: 8, hrtfVoices: 2, controlRate: 10, environment: "open" });
  E.timing = false;
  const pe = createPlayerEngine({ getEngine: () => E, gate: { muted: false }, load: loaderFor(ctx) });
  // a city drive round and round: 0-70 km/h and back every 12 s (shifts, lifts, brakes)
  const D = makeDrive((t) => { const p = t % 12; return p < 6 ? 1 : p < 8 ? 0 : p < 10 ? -0.6 : 0; });
  pe.update(D.c, 0, null); await pe.loading;
  const dt = 1 / 60;
  let t = 0;
  const frame = () => { t += dt; ctx.currentTime = t; D.step(dt); E.listener.x = D.c.x; E.listener.z = D.c.z - 6; const a = performance.now(); pe.update(D.c, dt, null); const ms = performance.now() - a; E.frame(dt); return ms; };
  for (let i = 0; i < 7200; i++) frame();
  // (between two calibrations, budget * k: tools/gate/timing.mjs)
  const MT = await measure(() => bestOf(3, () => { const ms = new Float64Array(1200); for (let i = 0; i < 1200; i++) ms[i] = frame(); ms.sort(); const mean = ms.reduce((a, b) => a + b, 0) / ms.length; return { mean, p99: ms[1188], max: ms[1199] }; }, "mean"));
  const best = MT.value;
  check("cost", !!pe.voice && best.mean < 0.05 * MT.k, `the engine voice per frame (model + 18 loops' setIf writes + tone, voice ${pe.voice ? "held" : "MISSING"}; best of 3 x 1200): ${f2(best.mean, 4)} ms mean, p99 ${f2(best.p99, 4)}, max ${f2(best.max, 3)} ms (budget 0.05 ms mean, ${MT.note})`);
  const { Session } = await import("node:inspector/promises");
  const ses = new Session(); ses.connect();
  await ses.post("HeapProfiler.enable");
  const AP = Object.getPrototypeOf(ctx.createGain().gain), SINK = new Float64Array(4), saved = {};
  for (const k of ["setValueAtTime", "linearRampToValueAtTime", "setTargetAtTime", "cancelScheduledValues", "cancelAndHoldAtTime"]) { saved[k] = AP[k]; AP[k] = function (v, tt) { SINK[0] = v; SINK[1] = tt; SINK[2]++; return this; }; }
  const ours = /viewer\/audio\/engine(Model|Loops|Sound)\.js$/;
  const sample = async (frames) => {
    await ses.post("HeapProfiler.startSampling", { samplingInterval: 32, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    for (let i = 0; i < frames; i++) { t += dt; ctx.currentTime = t; D.step(dt); E.listener.x = D.c.x; E.listener.z = D.c.z - 6; pe.update(D.c, dt, null); }
    const { profile } = await ses.post("HeapProfiler.stopSampling");
    let bytes = 0; const top = new Map();
    const walk = (n) => { const u = n.callFrame.url.split("\\").join("/"); if (n.selfSize && ours.test(u)) { bytes += n.selfSize; const key = `${n.callFrame.functionName || "(anon)"} @ ${u.split("/").pop()}:${n.callFrame.lineNumber + 1}`; top.set(key, (top.get(key) || 0) + n.selfSize); } for (const c of n.children) walk(c); };
    walk(profile.head);
    if (WHY) console.log([...top].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `    ${v} B ${k}`).join("\n"));
    return bytes;
  };
  for (let i = 0; i < 1200; i++) frame();
  SINK[2] = 0;
  const g1 = await sample(1200), w1 = SINK[2]; SINK[2] = 0;
  const g2 = await sample(1200), w2 = SINK[2];
  const [g, writes] = g1 < g2 ? [g1, w1] : [g2, w2];
  // parked at idle: nothing moves, nothing is written: the frame itself must make nothing
  D.c.speed = 0; D.c.thrS = 0; const hold = D.step; D.step = () => {};
  for (let i = 0; i < 6000; i++) frame();                         // (re-warm: the parked car's paths reach the optimizing tier)
  SINK[2] = 0; let gi = Math.min(await sample(1200), await sample(1200), await sample(1200)); const wi = SINK[2] * 2 / 3;
  // (on a busy machine the optimizing compiler runs late (its background threads starved): code still in a baseline
  // tier boxes its doubles. Up to 3 more re-warms + samples; a frame that really allocates does in every sample)
  for (let r = 0; r < 3 && gi / 1200 >= 4; r++) { for (let i = 0; i < 6000; i++) frame(); gi = Math.min(gi, await sample(1200)); }
  D.step = hold;
  Object.assign(AP, saved);
  const perWrite = g / Math.max(1, writes);
  check("garbage", perWrite <= 64 && gi / 1200 < 4, `parked at idle (${f2(wi / 2400, 2)} writes a frame): ${gi} B over 1200 frames (budget < 4 B a frame: no object / array / closure / string / number made by a frame); driving: ${f2(g / 1200, 1)} B a frame for ${f2(writes / 1200, 1)} AudioParam writes = ${f2(perWrite, 1)} B a write (budget 64 B: the value and the time boxed into the Web Audio call, which rule 42 allows)`);
}

// ---------------------------------------------------------------------------------------------- 5 default muted, ?engine=old
{
  const fresh = !store.has("uccle-sound");
  let made = 0;
  const E = { ctx: new ClockAudioContext(), add() { made++; }, time: 0 };
  const pe = createPlayerEngine({ getEngine: () => E, gate: soundGate, load: async () => { made++; return null; } });
  const D = makeDrive(() => 1);
  for (let i = 0; i < 60; i++) { D.step(1 / 60); pe.update(D.c, 1 / 60, null); }
  check("default", fresh && soundGate.muted === true && made === 0 && !pe.loading && !pe.src, `the speaker button muted at start with nothing stored (${soundGate.muted}); 60 frames driven while muted: ${made} sources / loads made, nothing fetched (${pe.loading ? "LOADING" : "none"})`);
  globalThis.location = { search: "?engine=old" };
  const m = await import(pathToFileURL(path.join(ROOT, "viewer/audio/engineSound.js")).href + "?old");
  globalThis.location = { search: "" };
  const city = readFileSync(path.join(ROOT, "viewer/audio/citySound.js"), "utf8");
  check("old", m.ENGINE_OLD === true && /if \(!ENGINE_OLD && driver && !driver\.engineVoice\)/.test(city), `?engine=old read by engineSound.js (${m.ENGINE_OLD}); the city hook makes the engine only without it (the features.js row "engine": the meta row)`);
}

if (DEMO) {
  // a city drive: idle, pull away to 50, cruise, brake for a light, idle, pull away to 90, lift, brake, park
  const demo = (t, c) => {
    if (t < 2) return 0;
    if (t < 9) return c.speed * 3.6 < 50 ? 1 : 0.35;
    if (t < 12) return 0.35 * (c.speed * 3.6 < 50 ? 1 : 0.2);
    if (t < 15) return c.speed > 0 ? -0.55 : 0;
    if (t < 17) return 0;
    if (t < 24) return c.speed * 3.6 < 90 ? 1 : 0.3;
    if (t < 27) return 0;
    return c.speed > 0 ? -0.5 : 0;
  };
  const t0 = Date.now();
  await renderDrive(32, demo, { sr: 48000, file: DEMO });
  console.log(`demo: ${DEMO} (32 s, ${((Date.now() - t0) / 1000).toFixed(0)} s to render)`);
}

if (!QUIET || fails) console.log(["| check | result | detail |", "|---|---|---|", ...out].join("\n"));
console.log(fails ? `engine: ${fails} FAIL` : "engine: all pass");
process.exit(fails ? 1 : 0);
