// The sound engine: categories + master mix, one shared reverb, spatial emitters, a voice limit with priorities.
// Design after slop-newyork's audio-system.js / audio-acoustics.js (vendor/slop-sound, MIT): everything runs on
// the audio thread as native nodes; the main thread only writes AudioParams at a CONTROL RATE (default 10 Hz),
// muffling behind buildings comes from a cheap ray-vs-box trace, and every emitter feeds one convolution reverb.
// Ours adds: HRTF for the nearest few voices and equal-power beyond (swapped with a cross-fade), Doppler from the
// real propagation delay (a DelayNode per moving source), ranked voice allocation with priorities across
// continuous sources and one-shot events, category buses, generated impulse responses per environment, and an
// explicit clock so the same code renders in an OfflineAudioContext (scenes are simulated ahead, then rendered).
import { clamp, makeFilter, makeGain, rng, setControlRate, TAU } from "./util.js";

export const CATEGORIES = ["traffic", "transit", "nature", "people", "bells"];
const C = 343;                       // speed of sound, m/s

// ---- impulse responses (generated) ------------------------------------------------------------------------
// canyon: a 12-16 m street between facades: early flutter between the two walls (every 2w/c), then a dense
// tail RT60 ~1.3 s that loses its highs faster (one-pole whose cutoff falls with time). park: no walls, trees
// scatter: soft diffuse build-up, RT60 ~0.7 s, darker. open: a field / square: a few far reflections, short.
export const ENVIRONMENTS = {
  canyon: { rt60: 1.3, width: 14, early: 0.55, late: 0.30, hfStart: 6500, hfEnd: 1500, send: 0.16, build: 0.004 },
  park:   { rt60: 0.7, width: 0, early: 0.0, late: 0.22, hfStart: 5000, hfEnd: 1200, send: 0.12, build: 0.025 },
  open:   { rt60: 0.45, width: 60, early: 0.15, late: 0.10, hfStart: 6000, hfEnd: 1500, send: 0.06, build: 0.01 },
};
export function makeImpulse(ctx, name) {
  const e = ENVIRONMENTS[name], sr = ctx.sampleRate;
  const len = Math.ceil(sr * Math.min(2.2, e.rt60 * 1.25));
  const ir = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch), rand = rng(0x51ab + ch * 977 + name.length * 31);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-6.9078 * t / e.rt60) * (1 - Math.exp(-t / e.build));
      const fc = e.hfEnd + (e.hfStart - e.hfEnd) * Math.exp(-t / (e.rt60 * 0.35));
      lp += ((rand() * 2 - 1) - lp) * (1 - Math.exp(-TAU * fc / sr));
      d[i] = lp * env * e.late;
    }
    if (e.width > 0) {
      // Flutter echoes between two facades: listener off-centre (0.4 w), so the two walls' first returns differ.
      const a = (0.8 * e.width) / C, b = (1.2 * e.width) / C, period = (2 * e.width) / C;
      for (let k = 0; k < 14; k++) {
        for (const base of [a, b]) {
          const t = base + k * period + (ch ? 0.0007 : -0.0004) * (k % 3);
          const i0 = Math.round(t * sr); if (i0 >= len - 64) continue;
          const amp = e.early * Math.pow(0.72, k) / (1 + k * 0.6) * (base === a ? (ch ? 0.8 : 1) : (ch ? 1 : 0.8));
          const w = 16 + k * 6;  // each bounce spreads (rough facades) and darkens
          for (let j = 0; j < w; j++) d[i0 + j] += (rand() * 2 - 1) * Math.sin(Math.PI * j / w) * amp;
        }
      }
    }
  }
  // Unit energy per channel: the send level alone sets the reverberant level (energy re the direct sound
  // at the source's reference distance), independent of RT60.
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let e = 0; for (let i = 0; i < len; i++) e += d[i] * d[i]; const g = 1 / Math.sqrt(e || 1); for (let i = 0; i < len; i++) d[i] *= g; }
  return ir;
}

// The impulse responses as a bank (the bake worker makes them off the main thread: ~10-20 ms each at 48 kHz)
export class IRBank {
  constructor(ctx) { this.ctx = ctx; this.c = {}; }
  ir(name) { return (this.c[name] ??= makeImpulse(this.ctx, name)); }
}

// ---- occlusion --------------------------------------------------------------------------------------------
// Length of the segment a->b inside the box (2D slab test + height): after slop-newyork audio-acoustics.js.
function insideLength(c, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const r = SLAB; r.t0 = 0; r.t1 = 1;
  if (!slab(r, ax, dx, c.minX, c.maxX) || !slab(r, az, dz, c.minZ, c.maxZ) || !slab(r, ay, dy, 0, c.maxY)) return 0;
  return (r.t1 - r.t0) * Math.hypot(dx, dy, dz);
}
// one axis of the slab test (no array per call: the city runs it at control rate; one shared scratch)
const SLAB = { t0: 0, t1: 1 };
function slab(r, o, d, lo, hi) {
  if (Math.abs(d) < 1e-7) return !(o <= lo || o >= hi);
  const p = (lo - o) / d, q = (hi - o) / d;
  r.t0 = Math.max(r.t0, Math.min(p, q)); r.t1 = Math.min(r.t1, Math.max(p, q));
  return r.t1 > r.t0;
}

// ---- spatial emitter --------------------------------------------------------------------------------------
// input -> [delay: Doppler + arrival time] -> low-pass (air + muffling) -> path gain -> panner -> direct -> bus
//                                                                    \-> reverb send (pre-panner, mono)
class Emitter {
  constructor(engine, src, model) {
    const ctx = engine.ctx; this.engine = engine; this.ctx = ctx; this.src = src;
    this.input = makeGain(ctx, 0);
    let node = this.input;
    if (src.doppler) {
      this.delay = ctx.createDelay(1.5);
      const d0 = Math.min(1.45, engine.distanceTo(src) / C);
      this.delay.delayTime.value = d0;
      node.connect(this.delay); node = this.delay;
    }
    this.lp = makeFilter(ctx, "lowpass", 18000, 0.5);
    node.connect(this.lp);
    this.direct = makeGain(ctx, 1);
    this.direct.connect(engine.bus[src.category]);
    this.send = makeGain(ctx, 0);
    this.lp.connect(this.send).connect(engine.reverbIn[src.category] || engine.reverbIn.traffic);
    this.paths = [];
    this.model = null;
    this.k = { x: NaN, y: NaN, z: NaN, g: NaN, dir: NaN, lp: NaN, send: NaN, delay: NaN };   // the last written values (skip-if-unchanged)
    this.fresh = false; this.retiring = false; this.newPath = false;
    this.occl = 0; this.nextOccl = 0;
    this.setModel(model, true);
  }
  _panner(model) {
    const p = this.ctx.createPanner(), s = this.src;
    setControlRate(p.positionX, p.positionY, p.positionZ, p.orientationX, p.orientationY, p.orientationZ);
    p.panningModel = model; p.distanceModel = "inverse"; p.refDistance = s.ref ?? 3; p.rolloffFactor = 1;
    p.maxDistance = 10000;
    if (s.cone) { p.coneInnerAngle = s.cone[0]; p.coneOuterAngle = s.cone[1]; p.coneOuterGain = s.cone[2]; }
    p.positionX.value = s.x; p.positionY.value = s.y; p.positionZ.value = s.z;
    return p;
  }
  setModel(model, now0 = false) {
    if (model === this.model) return;
    const ctx = this.ctx, now = this.engine.now;
    const g = makeGain(ctx, now0 ? 1 : 0), p = this._panner(model);
    this.lp.connect(g).connect(p).connect(this.direct);
    if (!now0) {
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(1, now + 0.25);
      for (const old of this.paths) {
        old.g.gain.cancelAndHoldAtTime(now);
        old.g.gain.linearRampToValueAtTime(0, now + 0.25);
        old.dead = now + 0.3;
      }
    }
    this.paths.push({ g, p, dead: 0 });
    this.model = model; this.newPath = true;
  }
  // Called at control rate. `ahead` = control period: ramps reach the next target as the next update arrives.
  // Cost matters here (~40 voices x 10 Hz): AudioParam calls are the main-thread cost, so every write is skipped
  // when its value has not changed enough to hear (positions of parked sources, gains, filters).
  control(now, ahead, L) {
    const s = this.src, e = this.engine, k = this.k;
    // Extrapolate one period ahead with the source velocity so ramps lead instead of lag.
    const x = s.x + (s.vx || 0) * ahead, y = s.y + (s.vy || 0) * ahead, z = s.z + (s.vz || 0) * ahead;
    const ex = x - L.x, ey = y - L.y, ez = z - L.z, d = Math.sqrt(ex * ex + ey * ey + ez * ez);   // (not Math.hypot: it allocates its argument list)
    const moved = !(Math.abs(x - k.x) + Math.abs(y - k.y) + Math.abs(z - k.z) <= 0.01) || this.newPath;  // NaN-safe: first call writes
    if (moved) {
      for (const path of this.paths) {
        if (path.dead) continue;
        const p = path.p;
        p.positionX.cancelAndHoldAtTime(now); p.positionX.linearRampToValueAtTime(x, now + ahead);
        p.positionY.cancelAndHoldAtTime(now); p.positionY.linearRampToValueAtTime(y, now + ahead);
        p.positionZ.cancelAndHoldAtTime(now); p.positionZ.linearRampToValueAtTime(z, now + ahead);
        if (s.cone && Number.isFinite(s.heading)) { p.orientationX.value = Math.sin(s.heading); p.orientationZ.value = Math.cos(s.heading); }
      }
      k.x = x; k.y = y; k.z = z; this.newPath = false;
    }
    if (this.paths.length > 1 && !e.offline) this._dropDead(now);
    if (this.delay) {
      const dl = Math.min(1.45, d / C);
      if (!(Math.abs(dl - k.delay) <= 2e-6)) { const dt = this.delay.delayTime; dt.cancelAndHoldAtTime(now); dt.linearRampToValueAtTime(dl, now + ahead); k.delay = dl; }
    }
    if (now >= this.nextOccl) {
      e.obstructInto(s, L); this.occl = s._occl;
      this.nextOccl = now + 0.25 + ((s.seed || 0) % 1) * 0.1;
    }
    // Range fade (smooth, so a voice entering the budget fades in), source gain, air absorption + muffling.
    const range = s.range ?? 200;
    const fade = clamp((range - d) / (range * 0.25));
    const g = (s.gain ?? 1) * fade * fade * (3 - 2 * fade) * (this.retiring ? 0 : 1);
    if (!(Math.abs(g - k.g) <= 0.004 * Math.max(g, 0.05)) || this.fresh) { this.input.gain.setTargetAtTime(g, now, this.fresh ? 0.01 : 0.04); k.g = g; }
    const dir = 1 - this.occl * 0.8;
    if (!(Math.abs(dir - k.dir) <= 0.005)) { this.direct.gain.setTargetAtTime(dir, now, 0.12); k.dir = dir; }
    const lp = Math.max(1200, 19000 * Math.exp(-d / 260)) * Math.pow(0.07, this.occl);
    if (!(Math.abs(lp - k.lp) <= 0.01 * lp)) { this.lp.frequency.setTargetAtTime(lp, now, 0.1); k.lp = lp; }
    // Reverb send: diffuse level falls slower than the direct sound (distance cue = direct/reverb ratio).
    const ref = s.ref ?? 3;
    const send = e.envSend * (s.wet ?? 1) * Math.sqrt(ref / Math.max(ref, d)) * fade;
    if (!(Math.abs(send - k.send) <= 0.01 * Math.max(send, 0.01))) { this.send.gain.setTargetAtTime(send, now, 0.15); k.send = send; }
    this.fresh = false;
  }
  // the panner paths a model swap faded out: disconnected once silent (graph teardown)
  _dropDead(now) {
    for (let i = this.paths.length - 1; i >= 0; i--) {
      const path = this.paths[i];
      // (the low-pass's edge into it too: disconnect() only cuts a node's OUTPUTS, the old path kept being fed and processed)
      if (path.dead && now >= path.dead) { try { this.lp.disconnect(path.g); } catch { /* */ } path.g.disconnect(); path.p.disconnect(); this.paths.splice(i, 1); }
    }
  }
  dispose(when) {
    const t = when ?? this.engine.now;
    this.input.gain.cancelScheduledValues(t); this.input.gain.setTargetAtTime(0, t, 0.02);
    const kill = () => { for (const n of [this.input, this.delay, this.lp, this.direct, this.send]) n?.disconnect(); for (const p of this.paths) { p.g.disconnect(); p.p.disconnect(); } };
    if (this.engine.offline) return;     // offline: keep the graph; the render ends anyway
    setTimeout(kill, Math.max(0, (t - this.ctx.currentTime) * 1000) + 150);
  }
}

// a one-shot's source with ONE fixed shape (every field, numbers as numbers): the control steps write its position and
// muffling, and a spread copy's mixed shapes made those writes allocate
function eventSource(p) {
  return {
    category: p.category ?? "people", priority: p.priority ?? 1, ref: p.ref ?? 2, range: p.range ?? 60, seed: p.seed ?? Math.random(),
    x: +p.x || 0, y: +p.y || 0, z: +p.z || 0, vx: +p.vx || 0, vy: +p.vy || 0, vz: +p.vz || 0, dy: +p.dy || 0,
    gain: p.gain ?? 1, wet: p.wet ?? 1, doppler: !!p.doppler, noOcclusion: !!p.noOcclusion, follow: p.follow ?? null, cone: p.cone ?? null, heading: p.heading ?? 0,
    _d: 0, score: 0, _rank: 0, _want: false, _occl: 0, _voice: null, _emitter: null, _retiring: false, _tick: 0,
  };
}
// the fields the engine adds to a source, made at once (added one by one later, each grew the object's property store
// on a control step)
function initFields(s) { s._d ??= 0; s.score ??= 0; s._rank ??= 0; s._want ??= false; s._occl ??= 0; s._voice ??= null; s._emitter ??= null; s._retiring ??= false; s._tick ??= 0; }
// AudioParam ramp from the held value to v over `ahead` (the listener's six params)
function ramp(p, v, now, ahead) { p.cancelAndHoldAtTime(now); p.linearRampToValueAtTime(v, now + ahead); }
// in-place insertion sorts of the first n of a short array (no allocation): by _rank descending, by _d ascending
function sortRank(a, n) {
  for (let i = 1; i < n; i++) { const x = a[i], v = x._rank; let j = i - 1; while (j >= 0 && a[j]._rank < v) { a[j + 1] = a[j]; j--; } a[j + 1] = x; }
}
function sortDist(a, n) {
  for (let i = 1; i < n; i++) { const x = a[i], v = x._d; let j = i - 1; while (j >= 0 && a[j]._d > v) { a[j + 1] = a[j]; j--; } a[j + 1] = x; }
}

// ---- engine -----------------------------------------------------------------------------------------------
export class SoundEngine {
  constructor(ctx, { voiceLimit = 40, hrtfVoices = 8, hrtfRadius = 60, controlRate = 10, offline = false, environment = "canyon", irs = null } = {}) {
    this.ctx = ctx; this.offline = offline; this.hrtfRadius = hrtfRadius; this.maxNewPerStep = offline ? 99 : 4; this.fps = 60;
    this.voiceLimit = voiceLimit; this.hrtfVoices = hrtfVoices; this.controlRate = controlRate;
    this.now = 0; this.acc = 0;
    this.listener = { x: 0, y: 1.7, z: 0, fx: 0, fy: 0, fz: -1 };
    this.occluders = []; this.occlusionOn = true;
    this.sources = new Set(); this._list = []; this.events = []; this.beds = [];   // (_list: the sources as an array: no iterator per control step)
    this.obstructionFn = null; this.enclosureFn = null;   // optional: muffling / street-canyon probes from the host (the city's roof grid)
    this.beforeControl = null;
    this.timing = true;                                   // the stats' ms (performance.now: off in the city unless asked, it boxes a number per call)                            // optional: called with the time just before each live control step (the city's feeds)
    this.stats = { voices: 0, hrtf: 0, equalpower: 0, events: 0, sources: 0, beds: 0, dropped: 0, stolen: 0, controlMs: 0, controlMax: 0 };
    const L = ctx.listener;
    if (L.positionX) setControlRate(L.positionX, L.positionY, L.positionZ, L.forwardX, L.forwardY, L.forwardZ, L.upX, L.upY, L.upZ);
    // Mix: category buses -> mix -> compressor -> master -> out.
    this.mix = makeGain(ctx, 1);
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.knee.value = 10; this.comp.ratio.value = 5;
    this.comp.attack.value = 0.004; this.comp.release.value = 0.25;
    this.master = makeGain(ctx, 0.8);
    this.mix.connect(this.comp).connect(this.master).connect(ctx.destination);
    this.bus = {}; this.reverbIn = {}; this.catGain = {};
    // One shared reverb: every category's send goes into the same convolver; the category gain is applied
    // after a per-category send gain so muting a category also mutes its reverb.
    this.reverbBus = makeGain(ctx, 1);
    this.convolver = ctx.createConvolver(); this.convolver.normalize = false;
    this.reverbOut = makeGain(ctx, 1);
    this.reverbBus.connect(this.convolver).connect(this.reverbOut).connect(this.mix);
    for (const c of CATEGORIES) {
      const g = makeGain(ctx, 1); g.connect(this.mix); this.bus[c] = g; this.catGain[c] = g;
      const r = makeGain(ctx, 1); r.connect(this.reverbBus); this.reverbIn[c] = r;
    }
    this.envName = null; this.envSend = 0.2; this.envAuto = true; this.irs = irs || {};   // (irs: impulse responses baked elsewhere: IRBank in a worker)
    this.setEnvironment(environment, true);
    this.enclosure = 0; this.nextEnclosure = 0;
  }

  get time() { return this.offline ? this.now : this.ctx.currentTime; }

  // Category volume / mute (affects the dry bus and its reverb send).
  setCategory(cat, gain, muted = false) {
    const v = muted ? 0 : gain, t = this.time;
    this.catGain[cat].gain.setTargetAtTime(v, t, 0.03); this.reverbIn[cat].gain.setTargetAtTime(v, t, 0.03);
  }
  setMaster(v) { this.master.gain.setTargetAtTime(v, this.time, 0.03); }

  setEnvironment(name, immediate = false) {
    if (name === this.envName) return;
    this.irs[name] ??= makeImpulse(this.ctx, name);
    const t = this.time;
    if (immediate || this.offline) {
      this.convolver.buffer = this.irs[name];
    } else {
      // A ConvolverNode buffer swap restarts its tail: dip the reverb return for 90 ms around the swap.
      this.reverbOut.gain.setTargetAtTime(0, t, 0.02);
      setTimeout(() => { this.convolver.buffer = this.irs[name]; this.reverbOut.gain.setTargetAtTime(1, this.ctx.currentTime, 0.06); }, 90);
    }
    this.envName = name; this.envSend = ENVIRONMENTS[name].send;
  }

  distanceTo(s) { const L = this.listener, dx = s.x - L.x, dy = s.y - L.y, dz = s.z - L.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); }

  // Muffling 0..1 into s._occl (no number returned: a double returned from a call that is not inlined is a heap number
  // per call, ~160 a second at 40 voices). The city: obstructionFn marches the roof grid (citySound.js) and writes s._occl.
  obstructInto(s, L) {
    if (!this.occlusionOn || s.noOcclusion) { s._occl = 0; return; }
    if (this.obstructionFn) { this.obstructionFn(s, L); return; }
    s._occl = this.obstruction(s, L);
  }
  // the lab's box trace: three parallel rays listener->source (0.9 m apart, a small aperture so corners blend)
  obstruction(s, L) {
    if (!this.occlusionOn || s.noOcclusion || !this.occluders.length) return 0;
    const dx = s.x - L.x, dz = s.z - L.z, dist = Math.hypot(dx, dz);
    if (dist < 2) return 0;
    const sx = -dz / dist * 0.9, sz = dx / dist * 0.9;
    let blocked = 0;
    for (let r = -1; r <= 1; r++) {
      let depth = 0;
      for (const c of this.occluders) {
        depth = Math.max(depth, insideLength(c, L.x + sx * r, L.y, L.z + sz * r, s.x + sx * r, s.y, s.z + sz * r));
        if (depth > 8) break;
      }
      blocked += 1 - Math.exp(-depth * 0.45);
    }
    return blocked / 3;
  }

  // Street-canyon detector: 8 rising probes, the fraction blocked by nearby walls (slop-newyork's enclosure).
  measureEnclosure() {
    if (this.enclosureFn) return this.enclosureFn(this.listener);
    const L = this.listener; let covered = 0;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, bx = L.x + Math.cos(a) * 60, bz = L.z + Math.sin(a) * 60;
      let depth = 0;
      for (const c of this.occluders) depth = Math.max(depth, insideLength(c, L.x, L.y, L.z, bx, L.y + 30, bz));
      covered += 1 - Math.exp(-depth * 0.1);
    }
    return covered / 8;
  }

  // A continuous source: { category, priority, x,y,z, vx,vy,vz, ref, range, gain, doppler, create(ctx, input) }
  // create() builds the voice graph only while the source holds a voice; it returns { update(now, src, dist), dispose(when) }.
  add(src) { src.seed ??= Math.random(); src.priority ??= 1; initFields(src); if (!this.sources.has(src)) { this.sources.add(src); this._list.push(src); } return src; }
  remove(src) { if (this.sources.delete(src)) this._list.splice(this._list.indexOf(src), 1); if (src._voice) this._release(src, this.time); }

  // A non-positional bed (wind, rain, hum): always on, outside the voice budget (2-3 cheap loops each).
  addBed(category, create) { const out = makeGain(this.ctx, 1); out.connect(this.bus[category]); const send = makeGain(this.ctx, 0.25); out.connect(send).connect(this.reverbIn[category]); const bed = create(this.ctx, out); bed.out = out; this.beds.push(bed); return bed; }

  // A one-shot at a position. play(ctx, input, when) schedules buffers into input and returns the end time.
  // Gets an emitter for its duration; when the budget is full it steals the lowest-scored voice, if lower.
  event(spec, play, when = this.time) {
    const s = eventSource(spec);
    const d = this.distanceTo(s);
    if (d > s.range) { this.stats.dropped++; return null; }
    s.score = this.score(s, d);
    if (this.voiceCount() >= this.voiceLimit && !this._steal(s.score)) { this.stats.dropped++; return null; }
    const em = new Emitter(this, s, this._modelFor(d));
    em.fresh = true; em.control(when, 1 / this.controlRate, this.listener);
    const end = play(this.ctx, em.input, when);
    const ev = { src: s, em, end };
    this.events.push(ev);
    return ev;
  }

  voiceCount() { let n = this.events.length; const list = this._list; for (let i = 0; i < list.length; i++) if (list[i]._voice) n++; return n; }
  // Loudness estimate for ranking: priority x gain x inverse-distance (from the source's reference distance).
  score(s, d) { if (d > (s.range ?? 200)) return 0; const ref = s.ref ?? 3; return (s.priority ?? 1) * (s.gain ?? 1) * ref / Math.max(ref, d); }
  _modelFor(d) { return this.hrtfVoices > 0 && d < this.hrtfRadius ? "HRTF" : "equalpower"; }

  _steal(score) {
    let worst = null, ws = score;
    for (const s of this._list) if (s._voice && !s._retiring && s.score < ws) { worst = s; ws = s.score; }
    for (const ev of this.events) if (ev.src.score < ws && !ev.dead) { worst = ev; ws = ev.src.score; }
    if (!worst) return false;
    this.stats.stolen++;
    if (worst.em) { worst.dead = true; worst.em.dispose(this.time); this.events.splice(this.events.indexOf(worst), 1); }
    else this._release(worst, this.time, true);
    return true;
  }
  _retire(i, now) { this.events[i].em.dispose(now); this.events.splice(i, 1); }   // a finished one-shot (graph teardown)
  _release(s, now, hard = false) {
    s._voice.dispose(now + (hard ? 0.03 : 0.15)); s._emitter.dispose(now + (hard ? 0.0 : 0.12));
    s._voice = null; s._emitter = null; s._retiring = false;
  }

  // Per frame (live). Runs the control step at controlRate, and a slice of the voice updates on the frames
  // in between; returns ms spent.
  frame(dt) {
    if (dt > 0) this.fps = this.fps * 0.95 + Math.min(240, 1 / dt) * 0.05;
    this.acc += dt;
    if (this.acc < 1 / this.controlRate) {
      if (!this._work || this._next >= this._nWork) return 0;
      if (!this.timing) { this._slice(this.ctx.currentTime + 0.01); return 0; }
      const t0 = performance.now(); this._slice(this.ctx.currentTime + 0.01); return performance.now() - t0;
    }
    this.acc %= 1 / this.controlRate;
    const t = this.ctx.currentTime + 0.01;
    let ms = 0;
    if (this.beforeControl) { const t0 = this.timing ? performance.now() : 0; this.beforeControl(t); if (this.timing) ms = performance.now() - t0; }
    return ms + this.control(t);
  }
  _slice(now) {
    const work = this._work, L = this.listener, ahead = 1 / this.controlRate;
    const end = Math.min(this._nWork, this._next + Math.ceil(this._nWork / this._slices));
    for (let i = this._next; i < end; i++) {
      const s = work[i];
      if (!s._voice) continue;
      // Far voices (beyond 80 m) update at half the control rate (their ramps span two periods).
      if (s._d > 80 && !s._emitter.fresh && (s._tick = (s._tick || 0) ^ 1)) continue;
      s._emitter.control(now, s._d > 80 ? ahead * 2 : ahead, L);
      s._voice.update(now, s, s._d);
    }
    this._next = end;
  }

  // The control step (live: from frame(); offline: called by the scene simulation with an explicit time).
  control(now) {
    const t0 = this.timing ? performance.now() : 0;
    this.now = now;
    const ahead = 1 / this.controlRate, L = this.listener, ctx = this.ctx;
    // Listener.
    const l = ctx.listener;
    if (l.positionX) {
      ramp(l.positionX, L.x, now, ahead); ramp(l.positionY, L.y, now, ahead); ramp(l.positionZ, L.z, now, ahead);
      ramp(l.forwardX, L.fx, now, ahead); ramp(l.forwardY, L.fy, now, ahead); ramp(l.forwardZ, L.fz, now, ahead);
      if (!this._upSet) { l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0; this._upSet = true; }
    } else { l.setPosition(L.x, L.y, L.z); l.setOrientation(L.fx, L.fy, L.fz, 0, 1, 0); }
    // Environment from the street-canyon probes (2 Hz), unless the panel forces one.
    if (now >= this.nextEnclosure) {
      this.enclosure = this.occluders.length ? this.measureEnclosure() : 0;
      this.nextEnclosure = now + 0.5;
      if (this.envAuto) this.setEnvironment(this.enclosure > 0.35 ? "canyon" : (L.inPark ? "park" : "open"));
    }
    // Events: retire finished ones.
    for (let i = this.events.length - 1; i >= 0; i--) {
      const ev = this.events[i];
      if (now >= ev.end + 0.1) this._retire(i, now);
      else {
        const f = ev.src.follow;   // events on a moving vehicle (horn, bell) ride along with it (Doppler too)
        if (f) { ev.src.x = f.x; ev.src.y = f.y + (ev.src.dy || 0); ev.src.z = f.z; ev.src.vx = f.vx; ev.src.vz = f.vz; }
        ev.em.control(now, ahead, L);
      }
    }
    // Rank continuous sources; the top (limit - events) hold voices.
    // (fixed arrays with a count: `length = 0` would drop their backing store and every push re-grow it, each step)
    const ranked = this._ranked ??= [];
    let nr = 0;
    const list = this._list;
    for (let i = 0; i < list.length; i++) {
      // (inline distance + score: no double returned from a call per source per step)
      const s = list[i], dx = s.x - L.x, dy = s.y - L.y, dz = s.z - L.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz), ref = s.ref ?? 3;
      s._d = d;
      s.score = s.active === false || d > (s.range ?? 200) ? 0 : (s.priority ?? 1) * (s.gain ?? 1) * ref / Math.max(ref, d);
      s._rank = s.score * (s._voice ? 1.3 : 1);
      if (s.score > 0) ranked[nr++] = s;
    }
    // Hysteresis: a source that holds a voice ranks 30 % higher, so voices near the cut-off don't churn
    // (building / tearing down graphs is the expensive part of a control step). Insertion sort: no allocation, n small.
    sortRank(ranked, nr);
    const slots = Math.max(0, this.voiceLimit - this.events.length);
    for (let i = 0; i < nr; i++) ranked[i]._want = i < slots;
    let created = 0;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const want = s.score > 0 && s._want;
      if (want && !s._voice) {
        if (created++ >= this.maxNewPerStep) { s._want = false; continue; }   // spread graph building over steps
        s._emitter = new Emitter(this, s, "equalpower"); s._emitter.fresh = true; this.stats.created = (this.stats.created || 0) + 1;
        s._voice = s.create(ctx, s._emitter.input, now);
      } else if (!want && s._voice) {
        this._release(s, now);
      }
      s._want = false;
    }
    // HRTF for the nearest few voices (by distance), equal-power for the rest.
    const voiced = this._voiced ??= [];
    let nv = 0;
    for (let i = 0; i < list.length; i++) if (list[i]._voice) voiced[nv++] = list[i];
    sortDist(voiced, nv);
    let hrtf = 0;
    for (let i = 0; i < nv; i++) {
      const s = voiced[i];
      // Hysteresis (+20 % radius, +2 ranks) so a voice near the boundary doesn't flip models; the swap is a
      // 0.25 s cross-fade (HRTF and equal-power differ in timbre, mostly the far ear's highs).
      const was = s._emitter.model === "HRTF";
      const model = i < this.hrtfVoices + (was ? 2 : 0) && s._d < this.hrtfRadius * (was ? 1.2 : 1) ? "HRTF" : "equalpower";
      s._emitter.setModel(model);
      if (model === "HRTF") hrtf++;
    }
    // Per-voice parameter writes are the bulk of the cost: live, they are spread over the frames until the next
    // control step (slices), so no single frame pays for all 40 voices. Offline: all at once.
    this._work = voiced; this._nWork = nv; this._next = 0;
    this._slices = this.offline ? 1 : Math.max(1, Math.min(6, Math.round(this.fps / this.controlRate)));
    this._slice(now);
    for (const ev of this.events) if (ev.em.model === "HRTF") hrtf++;
    for (const b of this.beds) b.update?.(now);
    const st = this.stats;
    st.sources = this.sources.size; st.events = this.events.length; st.voices = nv + this.events.length;
    st.hrtf = hrtf; st.equalpower = st.voices - hrtf; st.beds = this.beds.length;
    if (!this.timing) return 0;
    const ms = performance.now() - t0;
    st.controlMs = st.controlMs * 0.9 + ms * 0.1; st.controlMax = Math.max(st.controlMax * 0.995, ms);
    return ms;
  }
}
