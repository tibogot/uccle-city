// Small DSP kit for baking procedural sounds into AudioBuffers once (main thread or OfflineAudioContext) and
// for driving AudioParams at control rate. Everything here is deterministic from a seed, so a render is
// repeatable and a "variant" is just another seed.
import { randomSource } from "../../vendor/slop-sound/audio-events.js";
import { setControlRate } from "../../vendor/slop-sound/audio-synthesis.js";

export { randomSource as rng, setControlRate };
export const TAU = Math.PI * 2;
export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const dbToGain = (db) => Math.pow(10, db / 20);

// Bake `seconds` of audio: fill(channels[], sampleRate, rand) writes the samples. Then remove DC, fade the
// ends (no clicks), and scale to `peak` (or to `rms` when given; never above 0.98).
export function bake(ctx, seconds, fill, { channels = 1, peak = 0.7, rms = 0, seed = 1, fadeIn = 0.002, fadeOut = 0.012, loop = false } = {}) {
  const sr = ctx.sampleRate, n = Math.max(1, Math.ceil(seconds * sr));
  const buf = ctx.createBuffer(channels, n, sr);
  const data = []; for (let c = 0; c < channels; c++) data.push(buf.getChannelData(c));
  fill(data, sr, randomSource(seed));
  let max = 0, energy = 0;
  for (const d of data) {
    let mean = 0; for (let i = 0; i < n; i++) mean += d[i]; mean /= n;
    const fi = fadeIn * sr, fo = fadeOut * sr;
    for (let i = 0; i < n; i++) {
      let v = d[i] - mean;
      if (!loop) v *= Math.min(1, i / Math.max(1, fi), (n - 1 - i) / Math.max(1, fo));
      d[i] = v; const a = Math.abs(v); if (a > max) max = a; energy += v * v;
    }
  }
  let scale = max > 0 ? peak / max : 0;
  if (rms > 0 && energy > 0) scale = Math.min(0.98 / max, rms / Math.sqrt(energy / (n * channels)));
  for (const d of data) for (let i = 0; i < n; i++) d[i] *= scale;
  return buf;
}

// One-pole low-pass (state in the object). k = 1 - exp(-2 pi fc / sr).
export class OnePole {
  constructor(fc, sr) { this.set(fc, sr); this.y = 0; }
  set(fc, sr) { this.k = 1 - Math.exp(-TAU * fc / sr); return this; }
  lp(x) { return (this.y += (x - this.y) * this.k); }
  hp(x) { return x - this.lp(x); }
}

// RBJ biquad (transposed direct form II). type: lowpass | highpass | bandpass | peak.
export class Biquad {
  constructor(type, f, q, sr, gainDb = 0) { this.z1 = 0; this.z2 = 0; this.set(type, f, q, sr, gainDb); }
  set(type, f, q, sr, gainDb = 0) {
    f = Math.min(f, sr * 0.45);
    const w = TAU * f / sr, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q), A = Math.pow(10, gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === "lowpass") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (type === "highpass") { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (type === "bandpass") { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

// A decaying 2-pole resonator (one mode of a modal model): f Hz, t60 seconds. Excite with .run(x).
export class Mode {
  constructor(f, t60, sr, gain = 1) {
    const r = Math.exp(-6.9078 / (t60 * sr)), w = TAU * f / sr;
    this.a = 2 * r * Math.cos(w); this.b = r * r; this.g = gain * (1 - r) * 2; this.y1 = 0; this.y2 = 0;
  }
  run(x) { const y = x * this.g + this.a * this.y1 - this.b * this.y2; this.y2 = this.y1; this.y1 = y; return y; }
}

// Pink noise (Paul Kellet's economy filter), from a uniform rand().
export function pinkSource(rand) {
  let b0 = 0, b1 = 0, b2 = 0;
  return () => {
    const w = rand() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913;
    return (b0 + b1 + b2 + w * 0.1848) * 0.2;
  };
}

// Poisson arrival times (rate per second, may be a function of t) over [0, seconds).
export function poisson(rand, seconds, rate) {
  const out = []; let t = 0;
  const rmax = typeof rate === "function" ? rate.max : rate;
  while (true) {
    t += -Math.log(1 - rand()) / rmax;
    if (t >= seconds) break;
    if (typeof rate !== "function" || rand() < rate(t) / rmax) out.push(t);
  }
  return out;
}

// Control-rate parameter writer that skips tiny changes (after slop-newyork's smoothParameter).
export function smoothParam(param, tc = 0.07, eps = 1e-4) {
  let target = NaN;
  return (v, now, t = tc) => {
    if (Math.abs(v - target) < eps) return;
    param.cancelScheduledValues(now);
    if (Number.isNaN(target)) param.setValueAtTime(v, now); else param.setTargetAtTime(v, now, t);
    target = v;
  };
}

// Mono looping buffer source helper.
export function loopSource(ctx, buffer, rate = 1, offset = 0) {
  const s = ctx.createBufferSource(); s.buffer = buffer; s.loop = true; s.playbackRate.value = rate;
  s.start(ctx.currentTime, offset % buffer.duration);
  return s;
}

export function makeFilter(ctx, type, f, q = 0.7, gain = 0) {
  const b = ctx.createBiquadFilter();
  setControlRate(b.frequency, b.detune, b.Q, b.gain);
  b.type = type; b.frequency.value = Math.min(f, ctx.sampleRate * 0.45); b.Q.value = q; b.gain.value = gain;
  return b;
}
export function makeGain(ctx, g = 0) { const n = ctx.createGain(); n.gain.value = g; return n; }

// Play a one-shot buffer into `out` at `when`; returns the end time. Nodes free themselves on end.
export function playBuffer(ctx, buffer, out, when = 0, { rate = 1, gain = 1 } = {}) {
  const t = Math.max(ctx.currentTime, when);
  const s = ctx.createBufferSource(); s.buffer = buffer; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = gain;
  s.connect(g).connect(out);
  s.onended = () => { s.disconnect(); g.disconnect(); };
  s.start(t);
  return t + buffer.duration / rate;
}
