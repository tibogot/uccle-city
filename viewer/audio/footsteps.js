// Footsteps by surface. Method: a ground-reaction-force (GRF) envelope (Farnell, "Designing Sound", footsteps;
// Turchet / Nordahl et al. DAFx 2010: the foot is the exciter, the ground the resonator) drives a surface model:
//  - solid surfaces (pavement, setts, wood): impact noise into a few resonant modes (modal synthesis), plus
//    the sole's grit scuff (slop-newyork's band-split noise footstep is the pavement base);
//  - aggregate surfaces (gravel, leaves): stochastic grains (Cook's PhISEM idea): Poisson micro-impacts whose
//    rate follows the force envelope, each a tiny resonant click;
//  - grass: a soft low thud and the blades' high swish, no click.
// Walk = heel strike, roll, toe push-off (~0.25 s of contact); run = a stronger forefoot strike, shorter.
// Each (surface, gait) gets 8 baked variants (lazily, on first use); a step picks one and varies rate / level.
import { bake, Biquad, Mode, OnePole, TAU, clamp, playBuffer } from "./util.js";

export const SURFACES = ["pavement", "setts", "gravel", "grass", "wood", "leaves"];
const LEVEL = { pavement: 0.9, setts: 1.0, gravel: 1.0, grass: 0.55, wood: 1.0, leaves: 0.9 };

// GRF phases (seconds) with per-step jitter.
function phases(gait, r) {
  if (gait === "run") return { heel: 0, heelK: 260 + r() * 80, roll: 0.012 + r() * 0.01, rollK: 70, toe: 0.07 + r() * 0.03, toeK: 45, force: 1.6 };
  return { heel: 0, heelK: 120 + r() * 40, roll: 0.03 + r() * 0.03, rollK: 55, toe: 0.10 + r() * 0.06, toeK: 38, force: 1 };
}
const env = (t, start, k, rise = 1500) => { const u = t - start; return u <= 0 ? 0 : (1 - Math.exp(-u * rise)) * Math.exp(-u * k); };

function synthStep(ctx, surface, gait, seed) {
  const dur = surface === "gravel" || surface === "leaves" ? 0.42 : surface === "wood" ? 0.45 : 0.3;
  return bake(ctx, dur, ([d], sr, r) => {
    const p = phases(gait, r), n = d.length;
    const lo = new OnePole(180, sr), mid = new OnePole(1050, sr), hi = new OnePole(4600, sr);
    if (surface === "pavement") {
      // Concrete slabs: heel (body band), sole roll, toe scuff with grit (after slop-newyork footstep()).
      for (let i = 0; i < n; i++) {
        const t = i / sr, w = r() * 2 - 1;
        const a = lo.lp(w), b = mid.lp(w), c = hi.lp(w), body = b - a, grit = c - b;
        const heel = env(t, p.heel, p.heelK) * p.force, roll = env(t, p.roll, p.rollK, 900) * 0.7, toe = env(t, p.toe, p.toeK, 140) * 0.5;
        d[i] = (a * 0.35 + body * 0.9 + grit * 0.5) * heel + (body * 0.6 + grit * 0.15) * roll + (grit * 0.3 + (w - c) * 0.05) * toe;
      }
    } else if (surface === "setts") {
      // Granite setts: hard heel click through stone modes, sometimes a second click when a sett rocks,
      // sand grit in the joints on the scuff.
      const stone = (f0) => [1, 1.63, 2.41, 3.37].map((k, j) => new Mode(f0 * k * (0.95 + r() * 0.1), 0.035 - j * 0.006, sr, 1 / (j + 1)));
      const m1 = stone(1500 + r() * 700), m2 = stone(1900 + r() * 900);
      const second = r() < 0.45 ? p.roll + 0.01 + r() * 0.02 : -1;
      for (let i = 0; i < n; i++) {
        const t = i / sr, w = r() * 2 - 1;
        const a = lo.lp(w), b = mid.lp(w), c = hi.lp(w), body = b - a, grit = c - b;
        const heel = env(t, p.heel, p.heelK * 1.3, 3000) * p.force;
        const click = env(t, p.heel, 900, 6000) * p.force * w;
        const click2 = second > 0 ? env(t, second, 1100, 6000) * w * 0.5 : 0;
        let ring = 0; for (const m of m1) ring += m.run(click); for (const m of m2) ring += m.run(click2);
        const toe = env(t, p.toe, p.toeK, 160) * 0.6;
        d[i] = body * heel * 0.7 + a * heel * 0.3 + ring * 1.6 + click * 0.25 + grit * (toe * 0.55 + heel * 0.2);
      }
    } else if (surface === "gravel") {
      // PhISEM-style: grains at a rate following the force (heel then toe), each a band-passed micro-impact.
      const grains = [];
      for (let t = 0; t < dur - 0.03; ) {
        const f = env(t, p.heel, 22, 60) * 1.0 + env(t, p.toe, 30, 80) * 0.8;
        t += -Math.log(1 - r()) / (60 + 1400 * f * p.force);
        if (r() < f + 0.05) grains.push({ i: Math.floor(t * sr), f: 1300 + r() * r() * 5500, a: (0.2 + r()) * (0.3 + f), len: Math.floor(sr * (0.0015 + r() * 0.004)) });
      }
      const filt = grains.map((g) => new Biquad("bandpass", g.f, 2 + r() * 3, sr));
      const crunchLP = new OnePole(700, sr);
      for (let i = 0; i < n; i++) {
        const t = i / sr, w = r() * 2 - 1;
        const f = env(t, p.heel, 18, 50) + env(t, p.toe, 26, 70) * 0.7;
        d[i] = crunchLP.lp(w) * f * 0.5 * p.force;
      }
      grains.forEach((g, k) => {
        const bq = filt[k];
        for (let j = 0; j < g.len * 3 && g.i + j < n; j++) {
          const e = j < g.len ? 1 - j / g.len : 0;
          d[g.i + j] += bq.run((r() * 2 - 1) * e) * g.a * 3;
        }
      });
    } else if (surface === "grass") {
      // Soft ground: a damped low thud; the blades swish (high noise with a fast irregular flutter).
      const thud = new Biquad("lowpass", 260 + r() * 100, 0.8, sr), swish = new Biquad("highpass", 2600, 0.7, sr), sw2 = new Biquad("lowpass", 9000, 0.7, sr);
      let flutter = 0, ft = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, w = r() * 2 - 1;
        if (--ft <= 0) { flutter = 0.3 + r() * 0.7; ft = Math.floor(sr * (0.006 + r() * 0.02)); }
        const heel = env(t, p.heel, p.heelK * 0.5, 400) * p.force;
        const blades = env(t, 0.005, 14, 50) * 0.5 + env(t, p.toe, 18, 60) * 0.6;
        d[i] = thud.run(w) * heel * 2.2 + sw2.run(swish.run(w)) * blades * flutter * 0.35;
      }
    } else if (surface === "wood") {
      // Deck boards: a hollow modal body (board on joists) excited by the heel and the toe; a click on contact;
      // one step in six creaks (stick-slip: an irregular pulse train exciting the same modes).
      const modes = [150, 315, 560, 890, 1380, 2150].map((f, j) => new Mode(f * (0.93 + r() * 0.14), 0.07 - j * 0.008, sr, [0.35, 0.6, 1, 0.9, 0.7, 0.5][j]));
      const creak = r() < 0.17, creakF = 190 + r() * 150;
      let next = Math.floor((p.roll + 0.02) * sr), stop = Math.floor((p.roll + 0.1 + r() * 0.12) * sr);
      for (let i = 0; i < n; i++) {
        const t = i / sr, w = r() * 2 - 1;
        let x = (env(t, p.heel, 700, 8000) * p.force + env(t, p.toe, 400, 3000) * 0.35) * w;
        if (creak && i >= next && i < stop) { x += (0.5 + r() * 0.5) * 0.6; next = i + Math.floor(sr / (creakF * (0.85 + r() * 0.3))); }
        let y = 0; for (const m of modes) y += m.run(x);
        d[i] = y * 1.2 + hi.hp(x) * 0.6;
      }
    } else {
      // Dry leaf litter: a dense heavy-tailed crackle (many sub-millisecond broadband grains), a rustle bed,
      // a soft thud under it; the toe drags leaves.
      const thud = new Biquad("lowpass", 220, 0.7, sr), rust = new Biquad("bandpass", 4500, 0.8, sr), crk = new Biquad("highpass", 1800, 0.7, sr);
      let g = 0, gl = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, w = r() * 2 - 1;
        const f = env(t, p.heel, 16, 120) * p.force + env(t, p.toe, 14, 90) * 0.9;
        if (gl <= 0 && r() < (900 * f * f + 60 * f) / sr) { g = Math.pow(r(), 3) * 2.5; gl = Math.floor(sr * (0.0003 + r() * 0.0012)); }
        const grain = gl-- > 0 ? w * g : 0;
        d[i] = crk.run(grain) * 1.4 + rust.run(w) * f * 0.25 + thud.run(w) * env(t, p.heel, 60, 600) * 0.6 * p.force;
      }
    }
  }, { seed, peak: 0.8 });
}

export class FootstepBank {
  constructor(ctx) { this.ctx = ctx; this.cache = new Map(); }
  variants(surface, gait) {
    const key = surface + gait;
    let v = this.cache.get(key);
    if (!v) { v = []; for (let i = 0; i < 8; i++) v.push(synthStep(this.ctx, surface, gait, 1000 + i * 17 + SURFACES.indexOf(surface) * 131 + (gait === "run" ? 7 : 0))); this.cache.set(key, v); }
    return v;
  }
  // Play one step: a random variant (never the same twice in a row), +-4 % rate, +-2 dB, left foot a bit softer.
  play(out, when, { surface = "pavement", gait = "walk", seed = Math.random(), foot = 0, level = 1 } = {}) {
    const v = this.variants(surface, gait);
    let k = Math.floor(seed * 8) % 8; if (k === this.last) k = (k + 3) % 8; this.last = k;
    const frac = (seed * 97.31) % 1;
    const rate = 0.96 + frac * 0.08;
    const gain = LEVEL[surface] * (gait === "run" ? 1.25 : 1) * (0.8 + frac * 0.4) * (foot ? 0.9 : 1) * level * 0.5;
    return playBuffer(this.ctx, v[k], out, when, { rate, gain });
  }
}

// Stride period (s) for a speed (m/s): walk 1.4 m/s -> 0.53 s per step, run 3.5 m/s -> 0.33 s.
export const stepLength = (gait) => (gait === "run" ? 1.15 : 0.74);
export { clamp, TAU };
