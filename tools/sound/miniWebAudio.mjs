// A SMALL WEB AUDIO RENDERER for node (the headless sound gate, tools/sound/citySoundTest.mjs): the node types the city
// sound uses (viewer/audio), rendered block by block (128 frames) like a browser's OfflineAudioContext. Pure JS, no
// dependency, deterministic. What it is NOT: a reference implementation. Known simplifications (fine for "does the city
// make sound, how loud, how many voices, what does the main thread pay"):
//   - AudioParam automation (set / linear / exponential / setTarget / cancelScheduledValues / cancelAndHoldAtTime) is
//     exact at block starts; gain and delayTime are interpolated linearly across a block, the rest is k-rate (+ the
//     first sample of a connected input; an oscillator's frequency and a gain take connected inputs per sample)
//   - PannerNode: distance models + cones as specified, both panning models rendered as equal-power (no HRTF database)
//   - ConvolverNode: exact (uniformly partitioned FFT convolution), normalize ignored (the engine uses false)
//   - DynamicsCompressorNode: a peak compressor with the threshold / knee / ratio / attack / release curve
// Use: const ctx = new OfflineAudioContext(2, seconds * sr, sr); ...; const buf = await ctx.startRendering().
const Q = 128;

class AudioBuffer {
  constructor({ numberOfChannels = 1, length, sampleRate }) {
    this.numberOfChannels = numberOfChannels; this.length = length; this.sampleRate = sampleRate; this.duration = length / sampleRate;
    this._d = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  getChannelData(i) { return this._d[i]; }
  copyToChannel(src, i, off = 0) { this._d[i].set(src.subarray(0, this.length - off), off); }
  copyFromChannel(dst, i, off = 0) { dst.set(this._d[i].subarray(off, off + dst.length)); }
}

// ---------------------------------------------------------------------------------------------------- AudioParam
// automation events are pooled (the main-thread allocation test must see only the caller's garbage: a browser keeps
// its automation events in C++, off the JS heap)
const POOL = [];
const ev0 = (type, time, value, tc = 0) => { const e = POOL.pop() || { type: 0, time: 0, value: 0, tc: 0 }; e.type = type; e.time = time; e.value = value; e.tc = tc; return e; };
class AudioParam {
  constructor(ctx, v, rate = "a-rate") { this.context = ctx; this._v = v; this.defaultValue = v; this.automationRate = rate; this.ev = []; this.inputs = []; this._cur = v; this.minValue = -3.4e38; this.maxValue = 3.4e38; }
  get value() { return this._cur; }
  set value(v) { if (!Number.isFinite(v)) return; if (this.ev.length) this.setValueAtTime(v, this.context.currentTime); else { this._v = v; this._cur = v; } }
  _ins(e) { const ev = this.ev; if (ev.length > 3) this._prune(this.context.currentTime); ev.push(e); let i = ev.length - 1; while (i > 0 && ev[i - 1].time > e.time) { ev[i] = ev[i - 1]; i--; } ev[i] = e; return this; }
  setValueAtTime(v, t) { return this._ins(ev0(0, t, v)); }
  linearRampToValueAtTime(v, t) { return this._ins(ev0(1, t, v)); }
  exponentialRampToValueAtTime(v, t) { return this._ins(ev0(2, t, v)); }
  setTargetAtTime(v, t, tc) { return this._ins(ev0(3, t, v, Math.max(1e-6, tc))); }
  setValueCurveAtTime(curve, t, dur) { const n = curve.length; for (let i = 0; i < n; i++) this._ins(ev0(i ? 1 : 0, t + dur * i / Math.max(1, n - 1), curve[i])); return this; }
  _cut(i) { const ev = this.ev; for (let k = i; k < ev.length; k++) POOL.push(ev[k]); ev.length = i; }
  cancelScheduledValues(t) { const ev = this.ev; let i = 0; while (i < ev.length && ev[i].time < t) i++; this._cut(i); return this; }
  cancelAndHoldAtTime(t) {
    const v = this.valueAt(t), ev = this.ev;
    let i = 0; while (i < ev.length && ev[i].time <= t) i++;
    const cut = ev[i], type = cut && (cut.type === 1 || cut.type === 2) ? cut.type : 0;
    this._cut(i);
    ev.push(ev0(type, t, v));
    return this;
  }
  valueAt(t) {
    const ev = this.ev;
    let pt = 0, pv = this._v;
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      if (e.type === 3) {
        if (t < e.time) return pv;
        const ne = i + 1 < ev.length ? ev[i + 1].time : Infinity;
        if (t < ne) return e.value + (pv - e.value) * Math.exp(-(t - e.time) / e.tc);
        pv = e.value + (pv - e.value) * Math.exp(-(ne - e.time) / e.tc); pt = ne; continue;
      }
      if (t < e.time) {
        if (e.type === 0) return pv;
        const f = e.time > pt ? (t - pt) / (e.time - pt) : 1;
        if (e.type === 1) return pv + (e.value - pv) * f;
        return pv > 0 === e.value > 0 && pv !== 0 ? pv * Math.pow(e.value / pv, f) : pv;
      }
      pt = e.time; pv = e.value;
    }
    return pv;
  }
  // collapse events wholly in the past into one set (exact: an event's value at its own time is its target)
  _prune(t) {
    const ev = this.ev;
    let i = 0; while (i < ev.length && ev[i].time <= t) i++;
    let k = i - 1;
    if (k >= 0 && ev[k].type === 3) k--;
    if (k >= 1) {
      const keep = ev[k]; keep.type = 0;
      for (let q = 0; q < k; q++) POOL.push(ev[q]);
      let w = 0; for (let r = k; r < ev.length; r++) ev[w++] = ev[r];
      ev.length = w;
    }
  }
  // the block's values: start (and end for interpolated params), plus connected inputs
  _block(q, sr, out) {
    const t0 = q * Q / sr;
    if (this.ev.length > 2) this._prune(t0);
    const a = this.ev.length ? this.valueAt(t0) : this._v;
    let b = a;
    if (out) b = this.ev.length ? this.valueAt(t0 + Q / sr) : this._v;
    this._cur = a;
    let inp = null;
    if (this.inputs.length) { inp = mixInputs(this.inputs, q, this._mix ??= [new Float32Array(Q), new Float32Array(Q)], 1); if (inp.silent) inp = null; }
    if (out) { const d = (b - a) / Q, I = inp ? inp.ch[0] : null; for (let i = 0; i < Q; i++) out[i] = a + d * i + (I ? I[i] : 0); return out; }
    return inp ? a + inp.ch[0][0] : a;
  }
}

function mixInputs(list, q, scratch, maxCh = 2) {
  let n = 0, silent = true;
  const outs = [];
  for (const node of list) { const o = node._pull(q); if (!o.silent) { outs.push(o); silent = false; n = Math.max(n, o.n); } }
  const r = { silent, n: Math.min(maxCh, n || 1), ch: scratch };
  if (silent) return r;
  for (let c = 0; c < r.n; c++) scratch[c].fill(0);
  for (const o of outs) for (let c = 0; c < r.n; c++) { const s = o.ch[Math.min(c, o.n - 1)], d = scratch[c]; if (o.n === 2 && r.n === 1) { const s2 = o.ch[1]; for (let i = 0; i < Q; i++) d[i] += (o.ch[0][i] + s2[i]) * 0.5; } else for (let i = 0; i < Q; i++) d[i] += s[i]; }
  return r;
}

// ---------------------------------------------------------------------------------------------------- nodes
class AudioNode {
  constructor(ctx, nIn = 1) { ctx._refs?.push(new WeakRef(this)); this.context = ctx; this.ins = Array.from({ length: nIn }, () => []); this.dests = []; this._q = -1; this._out = { silent: true, n: 1, ch: [new Float32Array(Q), new Float32Array(Q)] }; this._inS = [new Float32Array(Q), new Float32Array(Q)]; this.channelCount = 2; this.numberOfInputs = nIn; this.numberOfOutputs = 1; ctx._nodes++; }
  connect(dest, out = 0, inp = 0) {
    if (dest instanceof AudioParam) dest.inputs.push(this); else dest.ins[inp].push(this);
    this.dests.push([dest, inp]);
    return dest;
  }
  disconnect(only) {
    for (let j = this.dests.length - 1; j >= 0; j--) {
      const [d, i] = this.dests[j];
      if (only && only !== d) continue;
      const list = d instanceof AudioParam ? d.inputs : d.ins[i], k = list.indexOf(this);
      if (k >= 0) list.splice(k, 1);
      this.dests.splice(j, 1);
    }
  }
  _input(q) { return mixInputs(this.ins[0], q, this._inS, 2); }
  _pull(q) { if (this._q !== q) { this._q = q; this._process(q, this.context.sampleRate); } return this._out; }
  _process() { this._out.silent = true; }
}

class GainNode extends AudioNode {
  constructor(ctx) { super(ctx); this.gain = new AudioParam(ctx, 1); this._g = new Float32Array(Q); }
  _process(q, sr) {
    const inp = this._input(q), o = this._out, g = this.gain._block(q, sr, this._g);
    if (inp.silent) { o.silent = true; return; }
    o.silent = false; o.n = inp.n;
    for (let c = 0; c < inp.n; c++) { const s = inp.ch[c], d = o.ch[c]; for (let i = 0; i < Q; i++) d[i] = s[i] * g[i]; }
  }
}

class BiquadFilterNode extends AudioNode {
  constructor(ctx) { super(ctx); this.type = "lowpass"; this.frequency = new AudioParam(ctx, 350); this.detune = new AudioParam(ctx, 0); this.Q = new AudioParam(ctx, 1); this.gain = new AudioParam(ctx, 0); this._z = [[0, 0], [0, 0]]; }
  _coef(sr) {
    const f = Math.max(1, Math.min(sr / 2 - 1, this.frequency._block(this._qq, sr) * Math.pow(2, this.detune._block(this._qq, sr) / 1200)));
    const Qv = this.Q._block(this._qq, sr), G = this.gain._block(this._qq, sr);
    const w = 2 * Math.PI * f / sr, cs = Math.cos(w), sn = Math.sin(w), A = Math.pow(10, G / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (this.type) {
      case "lowpass": { const al = sn / (2 * Math.pow(10, Qv / 20)); b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; break; }
      case "highpass": { const al = sn / (2 * Math.pow(10, Qv / 20)); b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; break; }
      case "bandpass": { const al = sn / (2 * Math.max(1e-4, Qv)); b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; break; }
      case "notch": { const al = sn / (2 * Math.max(1e-4, Qv)); b0 = 1; b1 = -2 * cs; b2 = 1; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; break; }
      case "allpass": { const al = sn / (2 * Math.max(1e-4, Qv)); b0 = 1 - al; b1 = -2 * cs; b2 = 1 + al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; break; }
      case "peaking": { const al = sn / (2 * Math.max(1e-4, Qv)); b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; break; }
      case "lowshelf": case "highshelf": {
        const al = sn / 2 * Math.SQRT2, k = 2 * Math.sqrt(A) * al, s = this.type === "lowshelf" ? 1 : -1;
        b0 = A * ((A + 1) - s * (A - 1) * cs + k); b1 = s * 2 * A * ((A - 1) - s * (A + 1) * cs); b2 = A * ((A + 1) - s * (A - 1) * cs - k);
        a0 = (A + 1) + s * (A - 1) * cs + k; a1 = -s * 2 * ((A - 1) + s * (A + 1) * cs); a2 = (A + 1) + s * (A - 1) * cs - k; break;
      }
      default: b0 = 1; b1 = b2 = 0; a0 = 1; a1 = a2 = 0;
    }
    this._c = [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  }
  _process(q, sr) {
    const inp = this._input(q), o = this._out;
    this._qq = q; this._coef(sr);
    const [b0, b1, b2, a1, a2] = this._c;
    if (inp.silent) {
      // ring out the state (a resonant filter keeps sounding a little), then go silent
      if (Math.abs(this._z[0][0]) + Math.abs(this._z[0][1]) + Math.abs(this._z[1][0]) + Math.abs(this._z[1][1]) < 1e-7) { o.silent = true; return; }
      inp.n = o.n; for (let c = 0; c < o.n; c++) this._inS[c].fill(0); inp.ch = this._inS;
    }
    o.silent = false; o.n = inp.n;
    for (let c = 0; c < inp.n; c++) {
      const s = inp.ch[c], d = o.ch[c], z = this._z[c];
      let z1 = z[0], z2 = z[1];
      for (let i = 0; i < Q; i++) { const x = s[i], y = b0 * x + z1; z1 = b1 * x - a1 * y + z2; z2 = b2 * x - a2 * y; d[i] = y; }
      z[0] = Math.abs(z1) < 1e-20 ? 0 : z1; z[1] = Math.abs(z2) < 1e-20 ? 0 : z2;
    }
  }
}

class DelayNode extends AudioNode {
  constructor(ctx, max = 1) { super(ctx); this.delayTime = new AudioParam(ctx, 0); this._len = Math.ceil(max * ctx.sampleRate) + Q + 4; this._b = [new Float32Array(this._len), new Float32Array(this._len)]; this._w = 0; this._dt = new Float32Array(Q); this._quiet = 0; this._n = 1; }
  _process(q, sr) {
    const inp = this._input(q), o = this._out, dt = this.delayTime._block(q, sr, this._dt), L = this._len;
    if (inp.silent) { this._quiet += Q; if (this._quiet > L) { o.silent = true; return; } } else { this._quiet = 0; this._n = inp.n; }
    o.silent = false; o.n = this._n;
    for (let c = 0; c < o.n; c++) {
      const buf = this._b[c], s = inp.silent ? null : inp.ch[Math.min(c, inp.n - 1)], d = o.ch[c];
      let w = this._w;
      for (let i = 0; i < Q; i++) {
        buf[w] = s ? s[i] : 0;
        const r = w - dt[i] * sr, ri = Math.floor(r), f = r - ri, i0 = ((ri % L) + L) % L, i1 = (i0 + 1) % L;
        d[i] = buf[i0] * (1 - f) + buf[i1] * f;
        w = (w + 1) % L;
      }
    }
    this._w = (this._w + Q) % L;
  }
}

class AudioListener {
  constructor(ctx) { for (const [k, v] of [["positionX", 0], ["positionY", 0], ["positionZ", 0], ["forwardX", 0], ["forwardY", 0], ["forwardZ", -1], ["upX", 0], ["upY", 1], ["upZ", 0]]) this[k] = new AudioParam(ctx, v); }
  setPosition(x, y, z) { this.positionX.value = x; this.positionY.value = y; this.positionZ.value = z; }
  setOrientation(fx, fy, fz, ux, uy, uz) { this.forwardX.value = fx; this.forwardY.value = fy; this.forwardZ.value = fz; this.upX.value = ux; this.upY.value = uy; this.upZ.value = uz; }
}

class PannerNode extends AudioNode {
  constructor(ctx) {
    super(ctx);
    for (const [k, v] of [["positionX", 0], ["positionY", 0], ["positionZ", 0], ["orientationX", 1], ["orientationY", 0], ["orientationZ", 0]]) this[k] = new AudioParam(ctx, v);
    Object.assign(this, { panningModel: "equalpower", distanceModel: "inverse", refDistance: 1, maxDistance: 10000, rolloffFactor: 1, coneInnerAngle: 360, coneOuterAngle: 360, coneOuterGain: 0 });
    this._gl = 0; this._gr = 0;
  }
  _process(q, sr) {
    const inp = this._input(q), o = this._out, L = this.context.listener;
    const px = this.positionX._block(q, sr), py = this.positionY._block(q, sr), pz = this.positionZ._block(q, sr);
    const lx = L.positionX._block(q, sr), ly = L.positionY._block(q, sr), lz = L.positionZ._block(q, sr);
    const fx = L.forwardX._block(q, sr), fy = L.forwardY._block(q, sr), fz = L.forwardZ._block(q, sr), ux = L.upX._block(q, sr), uy = L.upY._block(q, sr), uz = L.upZ._block(q, sr);
    const ox = this.orientationX._block(q, sr), oy = this.orientationY._block(q, sr), oz = this.orientationZ._block(q, sr);
    if (inp.silent) { o.silent = true; return; }
    const dx = px - lx, dy = py - ly, dz = pz - lz, d = Math.hypot(dx, dy, dz), ref = this.refDistance, rf = this.rolloffFactor;
    let g;
    const dd = Math.max(ref, Math.min(d, this.maxDistance));
    if (this.distanceModel === "linear") g = 1 - rf * (dd - ref) / Math.max(1e-6, this.maxDistance - ref);
    else if (this.distanceModel === "exponential") g = Math.pow(dd / ref, -rf);
    else g = ref / (ref + rf * (dd - ref));
    if (this.coneInnerAngle < 360 && d > 1e-6) {
      const on = Math.hypot(ox, oy, oz) || 1, ang = Math.acos(Math.max(-1, Math.min(1, -(dx * ox + dy * oy + dz * oz) / (d * on)))) * 180 / Math.PI;
      const ai = this.coneInnerAngle / 2, ao = this.coneOuterAngle / 2;
      g *= ang <= ai ? 1 : ang >= ao ? this.coneOuterGain : 1 + (this.coneOuterGain - 1) * (ang - ai) / Math.max(1e-6, ao - ai);
    }
    // the listener's right = forward x up; azimuth -> equal-power pan
    let rx = fy * uz - fz * uy, ry = fz * ux - fx * uz, rz = fx * uy - fy * ux; const rn = Math.hypot(rx, ry, rz) || 1; rx /= rn; ry /= rn; rz /= rn;
    const x = d > 1e-6 ? (dx * rx + dy * ry + dz * rz) / d : 0, pan = (Math.max(-1, Math.min(1, x)) + 1) / 2;
    const gl = Math.cos(pan * Math.PI / 2) * g, gr = Math.sin(pan * Math.PI / 2) * g;
    const s = inp.ch[0], s1 = inp.n > 1 ? inp.ch[1] : null, L0 = o.ch[0], R0 = o.ch[1];
    const a0 = this._gl, a1 = this._gr, k = 1 / Q;
    for (let i = 0; i < Q; i++) { const m = s1 ? (s[i] + s1[i]) * 0.5 : s[i], f = i * k; L0[i] = m * (a0 + (gl - a0) * f); R0[i] = m * (a1 + (gr - a1) * f); }
    this._gl = gl; this._gr = gr;
    o.silent = false; o.n = 2;
  }
}

class StereoPannerNode extends AudioNode {
  constructor(ctx) { super(ctx); this.pan = new AudioParam(ctx, 0); }
  _process(q, sr) {
    const inp = this._input(q), o = this._out, p = Math.max(-1, Math.min(1, this.pan._block(q, sr)));
    if (inp.silent) { o.silent = true; return; }
    o.silent = false; o.n = 2;
    const L = o.ch[0], R = o.ch[1];
    if (inp.n === 1) { const x = (p + 1) / 2, gl = Math.cos(x * Math.PI / 2), gr = Math.sin(x * Math.PI / 2), s = inp.ch[0]; for (let i = 0; i < Q; i++) { L[i] = s[i] * gl; R[i] = s[i] * gr; } return; }
    const x = p <= 0 ? p + 1 : p, gl = Math.cos(x * Math.PI / 2), gr = Math.sin(x * Math.PI / 2), a = inp.ch[0], b = inp.ch[1];
    for (let i = 0; i < Q; i++) { if (p <= 0) { L[i] = a[i] + b[i] * gl; R[i] = b[i] * gr; } else { L[i] = a[i] * gl; R[i] = b[i] + a[i] * gr; } }
  }
}

class ChannelMergerNode extends AudioNode {
  constructor(ctx, n = 6) { super(ctx, n); this._n = n; this._m = Array.from({ length: n }, () => [new Float32Array(Q), new Float32Array(Q)]); }
  _process(q) {
    const o = this._out; let any = false; o.n = Math.min(2, this._n);
    for (let c = 0; c < o.n; c++) { const r = mixInputs(this.ins[c], q, this._m[c], 1); if (r.silent) o.ch[c].fill(0); else { o.ch[c].set(r.ch[0]); any = true; } }
    o.silent = !any;
  }
}

class WaveShaperNode extends AudioNode {
  constructor(ctx) { super(ctx); this.curve = null; this.oversample = "none"; }
  _process(q) {
    const inp = this._input(q), o = this._out, C = this.curve;
    if (inp.silent || !C) { if (!C && !inp.silent) { o.silent = false; o.n = inp.n; for (let c = 0; c < inp.n; c++) o.ch[c].set(inp.ch[c]); } else o.silent = true; return; }
    o.silent = false; o.n = inp.n;
    const n = C.length - 1;
    for (let c = 0; c < inp.n; c++) { const s = inp.ch[c], d = o.ch[c]; for (let i = 0; i < Q; i++) { const v = (Math.max(-1, Math.min(1, s[i])) + 1) / 2 * n, k = Math.min(n - 1, Math.floor(v)), f = v - k; d[i] = C[k] * (1 - f) + C[k + 1] * f; } }
  }
}

class DynamicsCompressorNode extends AudioNode {
  constructor(ctx) { super(ctx); this.threshold = new AudioParam(ctx, -24); this.knee = new AudioParam(ctx, 30); this.ratio = new AudioParam(ctx, 12); this.attack = new AudioParam(ctx, 0.003); this.release = new AudioParam(ctx, 0.25); this.reduction = 0; this._env = 0; this._gr = 0; }
  _process(q, sr) {
    const inp = this._input(q), o = this._out;
    const T = this.threshold._block(q, sr), K = this.knee._block(q, sr), R = Math.max(1, this.ratio._block(q, sr)), at = Math.exp(-1 / (Math.max(1e-4, this.attack._block(q, sr)) * sr)), rl = Math.exp(-1 / (Math.max(1e-3, this.release._block(q, sr)) * sr));
    if (inp.silent) { o.silent = true; this._env *= Math.pow(rl, Q); return; }
    o.silent = false; o.n = inp.n;
    let env = this._env;
    for (let i = 0; i < Q; i++) {
      let m = 0; for (let c = 0; c < inp.n; c++) m = Math.max(m, Math.abs(inp.ch[c][i]));
      env = m > env ? m + (env - m) * at : m + (env - m) * rl;
      const x = 20 * Math.log10(Math.max(1e-9, env));
      let y;
      if (2 * (x - T) < -K) y = x; else if (2 * Math.abs(x - T) <= K) y = x + (1 / R - 1) * (x - T + K / 2) ** 2 / (2 * Math.max(1e-6, K)); else y = T + (x - T) / R;
      const g = Math.pow(10, (y - x) / 20);
      for (let c = 0; c < inp.n; c++) o.ch[c][i] = inp.ch[c][i] * g;
      this.reduction = y - x;
    }
    this._env = env;
  }
}

// ---- convolution: uniformly partitioned (block Q, FFT 2Q) ----
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
class ConvolverNode extends AudioNode {
  constructor(ctx) { super(ctx); this.normalize = true; this._buf = null; this._P = null; }
  get buffer() { return this._buf; }
  set buffer(b) {
    this._buf = b;
    if (!b) { this._P = null; return; }
    const N = 2 * Q, parts = Math.ceil(b.length / Q), P = [];
    for (let c = 0; c < Math.min(2, b.numberOfChannels); c++) {
      const d = b.getChannelData(c), H = [];
      for (let p = 0; p < parts; p++) { const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < Q && p * Q + i < d.length; i++) re[i] = d[p * Q + i]; fft(re, im, false); H.push([re, im]); }
      P.push(H);
    }
    this._P = P; this._parts = parts;
    // input spectra ring (per input channel), the previous input block for the overlap
    this._X = [Array.from({ length: parts }, () => [new Float64Array(N), new Float64Array(N)]), Array.from({ length: parts }, () => [new Float64Array(N), new Float64Array(N)])];
    this._prev = [new Float64Array(Q), new Float64Array(Q)]; this._k = 0; this._tail = 0;
  }
  _process(q) {
    const inp = this._input(q), o = this._out;
    if (!this._P) { o.silent = true; return; }
    if (inp.silent) { this._tail += Q; if (this._tail > this._parts * Q + Q) { o.silent = true; return; } } else this._tail = 0;
    const N = 2 * Q, parts = this._parts, k = this._k, irCh = this._P.length, inCh = inp.silent ? 1 : inp.n;
    for (let c = 0; c < Math.max(inCh, 1); c++) {
      const re = this._X[c][k][0], im = this._X[c][k][1], prev = this._prev[c], s = inp.silent ? null : inp.ch[c];
      for (let i = 0; i < Q; i++) { re[i] = prev[i]; re[Q + i] = s ? s[i] : 0; im[i] = 0; im[Q + i] = 0; }
      for (let i = 0; i < Q; i++) prev[i] = re[Q + i];
      fft(re, im, false);
    }
    o.silent = false; o.n = 2;
    const yr = this._yr ??= new Float64Array(N), yi = this._yi ??= new Float64Array(N);
    for (let oc = 0; oc < 2; oc++) {
      const H = this._P[Math.min(oc, irCh - 1)], xc = Math.min(oc, inCh - 1);
      yr.fill(0); yi.fill(0);
      for (let p = 0; p < parts; p++) {
        const X = this._X[xc][(k - p + parts) % parts], hr = H[p][0], hi = H[p][1], xr = X[0], xi = X[1];
        for (let i = 0; i < N; i++) { yr[i] += xr[i] * hr[i] - xi[i] * hi[i]; yi[i] += xr[i] * hi[i] + xi[i] * hr[i]; }
      }
      fft(yr, yi, true);
      const d = o.ch[oc]; for (let i = 0; i < Q; i++) d[i] = yr[Q + i];
    }
    this._k = (k + 1) % parts;
  }
}

// ---- sources ----
class AudioScheduledSourceNode extends AudioNode {
  constructor(ctx) { super(ctx, 0); this._start = Infinity; this._stop = Infinity; this.onended = null; this._ended = false; }
  start(when = 0) { this._start = Math.max(0, when); this._sched(); }
  stop(when = 0) { this._stop = Math.max(0, when); this._sched(); }
  // (the clock context, which renders nothing, still ends sources on time: onended is how graphs tear down)
  _sched() { const c = this.context; if (c._ending) { this._endAt = Math.min(this._stop, this._natural ?? Infinity); if (this._endAt < Infinity) c._ending.add(this); } }
  _end() { if (this._ended) return; this._ended = true; const f = this.onended; if (f) this.context._later.push(() => f.call(this, { target: this })); }
  _span(q, sr) {   // [i0, i1) of this block that plays, or null
    const t0 = q * Q / sr, t1 = (q + 1) * Q / sr;
    if (this._ended) return null;
    if (t1 <= this._start) return null;
    if (t0 >= this._stop) { this._end(); return null; }
    return [Math.max(0, Math.ceil((this._start - t0) * sr)), Math.min(Q, Math.ceil((this._stop - t0) * sr))];
  }
}
class AudioBufferSourceNode extends AudioScheduledSourceNode {
  constructor(ctx) { super(ctx); this.buffer = null; this.loop = false; this.loopStart = 0; this.loopEnd = 0; this.playbackRate = new AudioParam(ctx, 1); this.detune = new AudioParam(ctx, 0); this._pos = null; }
  start(when = 0, offset = 0, dur) {
    this._off = offset || 0;
    if (!this.loop && this.buffer) this._natural = Math.max(0, when) + Math.max(0, this.buffer.duration - this._off) / Math.max(1e-3, Math.abs(this.playbackRate.value));
    super.start(when); if (dur !== undefined) { this._stop = Math.min(this._stop, this._start + dur); this._sched(); }
  }
  _process(q, sr) {
    const o = this._out, rate = this.playbackRate._block(q, sr) * Math.pow(2, this.detune._block(q, sr) / 1200), sp = this._span(q, sr), B = this.buffer;
    if (!sp || !B) { o.silent = true; return; }
    if (this._pos === null) this._pos = this._off * B.sampleRate;
    const n = B.length, step = rate * B.sampleRate / sr, nc = Math.min(2, B.numberOfChannels);
    const ls = this.loopStart > 0 || this.loopEnd > 0 ? this.loopStart * B.sampleRate : 0, le = this.loopEnd > 0 ? Math.min(n, this.loopEnd * B.sampleRate) : n;
    o.silent = false; o.n = nc;
    for (let c = 0; c < nc; c++) { const d = o.ch[c]; d.fill(0, 0, sp[0]); d.fill(0, sp[1]); }
    let pos = this._pos, done = false;
    for (let i = sp[0]; i < sp[1]; i++) {
      if (this.loop) { if (pos >= le) pos = ls + ((pos - ls) % Math.max(1, le - ls)); }
      else if (pos >= n - 1) { done = true; for (let c = 0; c < nc; c++) o.ch[c].fill(0, i); break; }
      const k = Math.floor(pos), f = pos - k, k1 = this.loop && k + 1 >= le ? ls : Math.min(n - 1, k + 1);
      for (let c = 0; c < nc; c++) { const s = B._d[c]; o.ch[c][i] = s[k] * (1 - f) + s[k1] * f; }
      pos += step;
    }
    this._pos = pos;
    if (done || sp[1] < Q) this._end();
  }
}
class PeriodicWave { constructor(real, imag) { const N = 2048, t = new Float32Array(N + 1); let m = 0; for (let i = 0; i < N; i++) { let v = 0; for (let k = 1; k < imag.length; k++) v += (imag[k] || 0) * Math.sin(2 * Math.PI * k * i / N) + (real?.[k] || 0) * Math.cos(2 * Math.PI * k * i / N); t[i] = v; m = Math.max(m, Math.abs(v)); } for (let i = 0; i < N; i++) t[i] /= m || 1; t[N] = t[0]; this.t = t; } }
class OscillatorNode extends AudioScheduledSourceNode {
  constructor(ctx) { super(ctx); this.type = "sine"; this.frequency = new AudioParam(ctx, 440); this.detune = new AudioParam(ctx, 0); this._ph = 0; this._f = new Float32Array(Q); this._wave = null; }
  setPeriodicWave(w) { this._wave = w; this.type = "custom"; }
  _process(q, sr) {
    const o = this._out, sp = this._span(q, sr), f = this.frequency._block(q, sr, this._f), det = Math.pow(2, this.detune._block(q, sr) / 1200);
    if (!sp) { o.silent = true; return; }
    o.silent = false; o.n = 1;
    const d = o.ch[0]; d.fill(0, 0, sp[0]); d.fill(0, sp[1]);
    let ph = this._ph; const W = this._wave?.t, ty = this.type;
    for (let i = sp[0]; i < sp[1]; i++) {
      let v;
      if (ty === "sine") v = Math.sin(2 * Math.PI * ph);
      else if (ty === "square") v = ph < 0.5 ? 1 : -1;
      else if (ty === "sawtooth") v = 2 * ph - 1;
      else if (ty === "triangle") v = ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph;
      else { const x = ph * 2048, k = Math.floor(x); v = W[k] + (W[k + 1] - W[k]) * (x - k); }
      d[i] = v;
      ph += f[i] * det / sr; ph -= Math.floor(ph);
    }
    this._ph = ph;
    if (sp[1] < Q) this._end();
  }
}
class ConstantSourceNode extends AudioScheduledSourceNode {
  constructor(ctx) { super(ctx); this.offset = new AudioParam(ctx, 1); }
  _process(q, sr) { const o = this._out, sp = this._span(q, sr), v = this.offset._block(q, sr); if (!sp) { o.silent = true; return; } o.silent = false; o.n = 1; o.ch[0].fill(0); o.ch[0].fill(v, sp[0], sp[1]); }
}

class AudioDestinationNode extends AudioNode { constructor(ctx, n) { super(ctx); this.maxChannelCount = n; this.channelCount = n; } }

// ---------------------------------------------------------------------------------------------------- contexts
class BaseAudioContext {
  constructor(sampleRate) {
    this.sampleRate = sampleRate; this.currentTime = 0; this.state = "suspended"; this._nodes = 0; this._later = [];
    this.listener = new AudioListener(this); this.baseLatency = 0; this.outputLatency = 0;
  }
  createBuffer(numberOfChannels, length, sampleRate) { return new AudioBuffer({ numberOfChannels, length, sampleRate }); }
  createGain() { return new GainNode(this); }
  createBiquadFilter() { return new BiquadFilterNode(this); }
  createDelay(max = 1) { return new DelayNode(this, max); }
  createPanner() { return new PannerNode(this); }
  createStereoPanner() { return new StereoPannerNode(this); }
  createChannelMerger(n = 6) { return new ChannelMergerNode(this, n); }
  createWaveShaper() { return new WaveShaperNode(this); }
  createDynamicsCompressor() { return new DynamicsCompressorNode(this); }
  createConvolver() { return new ConvolverNode(this); }
  createBufferSource() { return new AudioBufferSourceNode(this); }
  createOscillator() { return new OscillatorNode(this); }
  createConstantSource() { return new ConstantSourceNode(this); }
  createPeriodicWave(real, imag) { return new PeriodicWave(real, imag); }
  suspend() { this.state = "suspended"; return Promise.resolve(); }
  resume() { this.state = "running"; return Promise.resolve(); }
  close() { this.state = "closed"; return Promise.resolve(); }
}

export class OfflineAudioContext extends BaseAudioContext {
  constructor(a, length, sampleRate) {
    const o = typeof a === "object" ? a : { numberOfChannels: a, length, sampleRate };
    super(o.sampleRate);
    this.length = o.length; this.numberOfChannels = o.numberOfChannels;
    this.destination = new AudioDestinationNode(this, o.numberOfChannels);
  }
  /** renders the whole graph; onBlock(q) is called before each block (a test may sample state) */
  async startRendering(onBlock = null) {
    const out = new AudioBuffer({ numberOfChannels: this.numberOfChannels, length: this.length, sampleRate: this.sampleRate });
    this.state = "running";
    const blocks = Math.ceil(this.length / Q), S = [new Float32Array(Q), new Float32Array(Q)];
    for (let q = 0; q < blocks; q++) {
      this.currentTime = q * Q / this.sampleRate;
      onBlock?.(q);
      const r = mixInputs(this.destination.ins[0], q, S, this.numberOfChannels);
      const n = Math.min(Q, this.length - q * Q);
      for (let c = 0; c < this.numberOfChannels; c++) { const d = out._d[c]; if (r.silent) continue; const s = r.ch[Math.min(c, r.n - 1)]; for (let i = 0; i < n; i++) d[q * Q + i] = s[i]; }
      if (this._later.length) { const L = this._later; this._later = []; for (const f of L) f(); }
    }
    this.currentTime = this.length / this.sampleRate;
    this.state = "closed";
    return out;
  }
}

/** a "realtime" context for the main-thread cost test: nothing renders, the test advances currentTime itself */
export class ClockAudioContext extends BaseAudioContext {
  constructor(opts = {}) { super(opts.sampleRate || 48000); this.destination = new AudioDestinationNode(this, 2); this.state = "running"; this._ending = new Set(); this._t = 0; this._refs = []; }
  /** nodes of this context still alive (after a GC): a graph that is never let go shows here */
  alive() { let n = 0; for (const w of this._refs) if (w.deref()) n++; return n; }
  get currentTime() { return this._t; }
  set currentTime(t) {
    this._t = t;
    if (!this._ending?.size) return;
    for (const n of this._ending) if (n._endAt <= t) { this._ending.delete(n); n._ended = true; if (n.onended) n.onended({ target: n }); }
  }
}
