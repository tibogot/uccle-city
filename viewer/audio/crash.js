// CRASH SOUNDS (the player's car contact, viewer/drive/carHit.js "carHit" + the wall hits of carEnv.js): all procedural,
// baked once like the rest of viewer/audio (no files). Modal synthesis after Farnell (Designing Sound, "crash" and
// "glass" chapters) and van den Doel et al. (FoleyAutomatic, 2001: impacts = an excitation through damped modes):
//   impact   body thump (the car's panels / chassis: 55-190 Hz modes, ~0.2 s) + the crunch: a dense train of
//            micro-impacts (Poisson, the sheet metal folding) whose rate decays over 60-260 ms (longer for a
//            harder hit), each through five sheet-metal modes 0.4-3.7 kHz, + a plastic crack (band noise 1.5-4 kHz)
//   wall     the same car crunch + a masonry thud (heavily damped 70 / 140 Hz, no ring) + grit trickling (2-6 kHz ticks)
//   glass    a crack, then 30-80 shards falling over ~0.7 s (falling rate), each one high-Q mode 2.5-9 kHz, 50-300 ms
//   scrape   a 2 s loop: metal grinding on metal / asphalt: noise through three bands (1.2 / 2.6 / 4.5 kHz) chopped by
//            a stick-slip chatter (15-40 Hz random), plus a wandering resonance ~1.9 kHz (the panel singing)
// Levels: tap (< 2 m/s closing speed), knock (2-6), crash (> 6); glass on a crash above ~25 km/h (most of them).
import { bake, Biquad, Mode, OnePole, TAU, clamp, makeFilter, makeGain, loopSource, playBuffer, smoothParam } from "./util.js";

const METAL = [[420, 0.07, 1], [780, 0.06, 0.8], [1350, 0.05, 0.6], [2300, 0.04, 0.45], [3700, 0.03, 0.3]];

export class CrashBank {
  constructor(ctx) { this.ctx = ctx; this.c = {}; }
  /** level 0 tap, 1 knock, 2 crash; v = variant 0..2 */
  impact(level, v = 0) {
    return (this.c["i" + level + v] ??= bake(this.ctx, [0.45, 0.8, 1.3][level], ([d], sr, r) => crunch(d, sr, r, level, false), { seed: 4100 + level * 7 + v, peak: 0.9 }));
  }
  wall(level, v = 0) {
    return (this.c["w" + level + v] ??= bake(this.ctx, [0.6, 1.0, 1.5][level], ([d], sr, r) => crunch(d, sr, r, level, true), { seed: 4300 + level * 7 + v, peak: 0.9 }));
  }
  glass(v = 0) {
    return (this.c["g" + v] ??= bake(this.ctx, 1.1, ([d], sr, r) => {
      const n = d.length;
      // the crack: a broadband click through a few bright modes
      const crack = [new Mode(3100 + r() * 800, 0.02, sr, 1), new Mode(5600 + r() * 900, 0.015, sr, 0.7), new Mode(8200, 0.01, sr, 0.4)];
      for (let i = 0; i < Math.min(n, sr * 0.03); i++) { const x = (r() * 2 - 1) * Math.exp(-i / (sr * 0.002)) * 3; let y = x * 0.3; for (const m of crack) y += m.run(x); d[i] += y; }
      // shards: Poisson times with a falling rate (most within 0.3 s), each its own mode
      const shards = 30 + Math.floor(r() * 50);
      for (let k = 0; k < shards; k++) {
        const t0 = 0.01 + Math.pow(r(), 2.2) * 0.75, f = 2500 + Math.pow(r(), 0.7) * 6500, t60 = 0.05 + r() * 0.25;
        const m = new Mode(f, t60, sr, 1), m2 = new Mode(f * (2.2 + r() * 0.6), t60 * 0.5, sr, 0.5), a = (0.25 + r() * 0.75) * (1 - t0 * 0.8);
        const i0 = Math.floor(t0 * sr), len = Math.min(n - i0, Math.floor(t60 * sr * 1.3));
        for (let j = 0; j < len; j++) { const x = j < 6 ? (r() * 2 - 1) * a * 2 : 0; d[i0 + j] += m.run(x) + m2.run(x); }
      }
    }, { seed: 4500 + v, peak: 0.7 }));
  }
  scrape() {
    return (this.c.scrape ??= bake(this.ctx, 2, ([d], sr, r) => {
      const b1 = new Biquad("bandpass", 1200, 1.2, sr), b2 = new Biquad("bandpass", 2600, 1.6, sr), b3 = new Biquad("bandpass", 4500, 1.4, sr);
      const sing = new Mode(1900, 0.12, sr, 1), sm = new OnePole(30, sr);
      let chat = 0, next = 0, f = 1900;
      for (let i = 0; i < d.length; i++) {
        if (i >= next) { chat = r() < 0.7 ? 0.5 + r() * 0.5 : 0.1; next = i + Math.floor(sr / (15 + r() * 25)); }
        const e = sm.lp(chat), w = r() * 2 - 1;
        if (i % 64 === 0) { f += (r() - 0.5) * 40; f = clamp(f, 1700, 2150); sing.a = 2 * Math.exp(-6.9078 / (0.12 * sr)) * Math.cos(TAU * f / sr); }
        d[i] = (b1.run(w) * 0.9 + b2.run(w) * 0.8 + b3.run(w) * 0.5) * e + sing.run(w * e * 0.05) * 0.6;
      }
    }, { seed: 4700, rms: 0.2, loop: true }));
  }
}

function crunch(d, sr, r, level, wall) {
  const n = d.length;
  const body = [new Mode(55 + r() * 10, 0.25, sr, 1), new Mode(110 + r() * 20, 0.18, sr, 0.7), new Mode(190 + r() * 30, 0.12, sr, 0.5)];
  const metal = METAL.map(([f, t, a]) => new Mode(f * (0.85 + r() * 0.3), t * (0.8 + level * 0.25), sr, a));
  const crack = new Biquad("bandpass", 1500 + r() * 2500, 1.1, sr);
  const thud = wall ? [new Mode(70, 0.08, sr, 1), new Mode(140, 0.05, sr, 0.6)] : null;
  const dur = [0.06, 0.14, 0.26][level], rate = [900, 1600, 2600][level];
  const imp = new Float32Array(n);
  for (let t = 0; t < dur * 2.5; t += -Math.log(1 - r()) / (rate * Math.max(0.05, Math.exp(-t / dur)))) {
    const i = Math.floor(t * sr); if (i < n) imp[i] += (0.3 + r() * 0.7) * Math.exp(-t / (dur * 1.5));
  }
  const hitLen = Math.floor(sr * 0.012);
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = r() * 2 - 1;
    const hit = i < hitLen ? w * (1 - i / hitLen) * 2 : 0;           // the first blow (body + thud)
    let y = 0;
    for (const m of body) y += m.run(hit);
    const x = imp[i] * w;
    for (const m of metal) y += m.run(x) * 0.9;
    y += crack.run(x) * 0.5 + x * 0.06;
    if (thud) { for (const m of thud) y += m.run(hit) * 1.6; }
    if (wall && t > 0.03 && t < 0.6 && r() < 0.004 * Math.exp(-t * 5)) imp[Math.min(n - 1, i + 1)] += 0.15;   // grit trickling off
    d[i] = y;
  }
}

/** an impact at speed (closing m/s) with an impulse scale k (0..1+): returns the end time; hard hits add glass */
export function playImpact(ctx, bank, out, when, { speed = 3, wall = false, k = 1, seed = 0 } = {}) {
  const level = speed < 2 ? 0 : speed < 6 ? 1 : 2, v = Math.floor(seed * 3) % 3;
  const gain = clamp(0.35 + speed / 10, 0.3, 1.1) * k;
  let end = playBuffer(ctx, wall ? bank.wall(level, v) : bank.impact(level, v), out, when, { gain, rate: 0.94 + (seed * 7 % 1) * 0.12 });
  if (level === 2 && speed > 7 && (seed * 13) % 1 < 0.8) end = Math.max(end, playBuffer(ctx, bank.glass(v % 2), out, when + 0.015, { gain: gain * 0.7 }));
  return end;
}

/** the scrape: a continuous voice on the player's car; src.scrape 0..1 (sliding contact x speed), src.slide m/s */
export function createScrapeVoice(ctx, bank, out, src, now) {
  const s = loopSource(ctx, bank.scrape(), 1, Math.random() * 2), f = makeFilter(ctx, "peaking", 2000, 0.8, 4), g = makeGain(ctx, 0);
  s.connect(f).connect(g).connect(out);
  const G = smoothParam(g.gain, 0.04), R = smoothParam(s.playbackRate, 0.1, 2e-3), F = smoothParam(f.frequency, 0.1, 5);
  return {
    update(t, src) { const k = clamp(src.scrape || 0); G(k * 0.8, t); R(0.8 + clamp((src.slide || 0) / 12) * 0.5, t); F(1600 + clamp((src.slide || 0) / 12) * 1400, t); },
    dispose(when) { try { s.stop(when + 0.05); } catch { /* */ } s.onended = () => { s.disconnect(); f.disconnect(); g.disconnect(); }; },
  };
}
