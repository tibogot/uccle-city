// Ambience: wind (open / in trees), distant city hum, rain (ground / roofs / trees, light..heavy), birds by
// species, time of day and season (dawn chorus), church bells on the hour, a dog, children in a playground.
import { gustBuffer, speechFragment } from "../../vendor/slop-sound/audio-events.js";
import { bake, Biquad, Mode, OnePole, TAU, clamp, loopSource, makeFilter, makeGain, pinkSource, playBuffer, smoothParam } from "./util.js";

// ---- shared loops -----------------------------------------------------------------------------------------
export class AmbienceBank {
  constructor(ctx) { this.ctx = ctx; this.c = {}; }
  pink() { return (this.c.pink ??= bake(this.ctx, 4, ([d], sr, r) => { const p = pinkSource(r); for (let i = 0; i < d.length; i++) d[i] = p(); }, { rms: 0.25, loop: true, seed: 515 })); }
  white() { return (this.c.white ??= bake(this.ctx, 3, ([d], sr, r) => { for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }, { rms: 0.25, loop: true, seed: 616 })); }
  gusts() { return (this.c.gust ??= gustBuffer(this.ctx)); }
  playground(seed) { return (this.c["pg" + seed] ??= playgroundBuffer(this.ctx, seed)); }
  bark(seed, size = 1) { return (this.c["bk" + seed + "_" + size] ??= barkBuffer(this.ctx, seed, size)); }
  cubeCurve() { return (this.c.cube ??= Float32Array.from({ length: 257 }, (_, i) => { const x = i / 128 - 1; return x * x * x * 1.6; })); }
  // Leaf flutter: a control-rate random envelope (8 kHz) with 15-60 ms "flicks" (many leaves moving).
  flutter() {
    return (this.c.flutter ??= (() => {
      const sr = 8000, n = sr * 6, b = this.ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
      let s = 7, v = 0, target = 0, left = 0;
      const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < n; i++) { if (--left <= 0) { target = r() ** 2; left = 120 + r() * 400; } v += (target - v) * 0.02; d[i] = v; }
      return b;
    })());
  }
  // Rain textures (4 s loops). Drops after van den Doel ("Physically based models for liquid sounds", 2005):
  // a bubble of radius r rings at ~3/r kHz (r in mm) with a rising chirp and damping 0.13 f + 0.0072 f^1.5;
  // most impacts make no bubble, just a short broadband tick. roof: ticks ring the tile / gutter (2-5 kHz);
  // trees: few large drips (1-2 kHz) + leaf patter (mid band); ground: dense ticks + puddle bubbles.
  rain(surface, heavy) {
    const key = "r" + surface + heavy;
    return (this.c[key] ??= bake(this.ctx, 4, ([d], sr, r) => {
      const n = d.length, rate = (surface === "trees" ? 90 : 160) * (heavy ? 4 : 1);
      const tick = new Biquad("highpass", surface === "trees" ? 600 : 1500, 0.7, sr);
      // Roofs: 4 tile banks of different sizes (each drop rings one) so no single ring dominates.
      const tiles = surface === "roof" ? [0, 1, 2, 3].map(() => { const f = 1800 + r() * 2600; return [new Mode(f, 0.025, sr, 1), new Mode(f * 1.59, 0.018, sr, 0.6), new Mode(f * 2.3, 0.012, sr, 0.4)]; }) : [];
      const imp = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)];
      for (let t = r() * 0.01; t < 4; t += -Math.log(1 - r()) / rate) imp[Math.floor(r() * 4)][Math.floor(t * sr)] += 0.2 + r() ** 3 * 1.5;
      const e = [0, 0, 0, 0];
      for (let i = 0; i < n; i++) {
        let y = 0;
        for (let k = 0; k < 4; k++) {
          e[k] = e[k] * 0.82 + imp[k][i];
          if (e[k] < 1e-4) continue;
          const x = (r() * 2 - 1) * e[k];
          y += x; if (tiles.length) for (const m of tiles[k]) y += m.run(x) * 2;
        }
        d[i] = tick.run(y);
      }
      // Bubbles: a fraction of drops (puddles on the ground, big drips under trees).
      const bubbles = surface === "roof" ? 0 : rate * (surface === "trees" ? 0.25 : 0.06);
      for (let t = r() * 0.05; t < 3.9; t += -Math.log(1 - r()) / bubbles) {
        const rad = surface === "trees" ? 1.6 + r() * 1.6 : 0.8 + r() * 2.2;   // mm
        const f0 = 3000 / rad, damp = 0.13 * f0 + 0.0072 * Math.pow(f0, 1.5), a = (0.15 + r() * 0.4) * (surface === "trees" ? 1.5 : 1);
        let ph = 0; const i0 = Math.floor(t * sr), len = Math.min(n - i0, Math.floor(sr * 6 / damp));
        for (let j = 0; j < len; j++) { const u = j / sr; ph += f0 * (1 + 0.1 * damp * u) / sr; d[i0 + j] += Math.sin(TAU * ph) * Math.exp(-damp * u) * a; }
      }
      if (surface === "trees") {
        const leaf = new Biquad("bandpass", 1400, 0.7, sr);
        for (let i = 0; i < n; i++) d[i] += leaf.run(r() * 2 - 1) * 0.12 * (heavy ? 1.8 : 1);
      }
    }, { rms: 0.2, loop: true, seed: surface.length * 97 + (heavy ? 1 : 0) }));
  }
}

// ---- wind bed (stereo, non-positional) ----------------------------------------------------------------------
// Open: a broad low "whoosh" band (180-700 Hz) swept and swelled by the gust envelope (vendor gustBuffer, two
// channels at different rates), plus sub rumble on the microphone-less ear (kept very low). In trees: the
// leaves = high-passed noise (2-9 kHz) amplitude-modulated by a fast random flutter, scaled by gusts.
// update({ speed 0..1, trees 0..1, shelter 0..1 })
export function createWindBed(bank) {
  return (ctx, out) => {
    const chans = [];
    for (let i = 0; i < 2; i++) {
      const pan = ctx.createStereoPanner(); pan.pan.value = i ? 0.6 : -0.6; pan.connect(out);
      const noise = loopSource(ctx, bank.pink(), 1, i * 1.7), white = loopSource(ctx, bank.white(), 1, i * 1.3);
      const bp = makeFilter(ctx, "bandpass", 380, 0.6), dark = makeFilter(ctx, "lowpass", 1100, 0.5), whoosh = makeGain(ctx, 0), gmod = makeGain(ctx, 0);
      const gustRaw = loopSource(ctx, bank.gusts(), i ? 0.79 : 1, i * 9);
      // The gust loop spans 0.38..0.92; cubed it spans 0.05..0.78 -> gusts swell ~ +-12 dB, like real wind.
      const gust = ctx.createWaveShaper(); gust.curve = bank.cubeCurve(); gustRaw.connect(gust);
      noise.connect(bp).connect(dark).connect(whoosh).connect(gmod).connect(pan); gust.connect(gmod.gain);
      const hp = makeFilter(ctx, "highpass", 2200, 0.6), lp = makeFilter(ctx, "lowpass", 9000, 0.6), leaves = makeGain(ctx, 0), fmod = makeGain(ctx, 0);
      const fl = loopSource(ctx, bank.flutter(), i ? 1.13 : 1, i * 2.2);
      white.connect(hp).connect(lp).connect(leaves).connect(fmod); fl.connect(fmod.gain);
      const lmod = makeGain(ctx, 0); fmod.connect(lmod).connect(pan); gust.connect(lmod.gain);
      chans.push({ whoosh: smoothParam(whoosh.gain, 0.8), bp: smoothParam(bp.frequency, 0.8, 1), leaves: smoothParam(leaves.gain, 0.8) });
    }
    return {
      params: { speed: 0.4, trees: 0, shelter: 0 },
      update(t) {
        const p = this.params, s = clamp(p.speed), open = 1 - clamp(p.shelter) * 0.7;
        for (const c of chans) {
          c.whoosh(s * s * 0.5 * open * (1 - p.trees * 0.4), t); c.bp(260 + s * 450, t);
          c.leaves(s * (0.3 + s) * 0.22 * clamp(p.trees * 1.2) * (1 - p.shelter * 0.3), t);
        }
      },
    };
  };
}

// ---- city hum bed ---------------------------------------------------------------------------------------------
// Distant traffic: an urban background spectrum falls ~5 dB/oct above ~250 Hz: pink noise low-passed at 300 Hz
// (and a weaker 700 Hz band for tyres) with slow swells (the gust loop at 0.15x = a minute-scale breathing).
export function createHumBed(bank) {
  return (ctx, out) => {
    const pink = loopSource(ctx, bank.pink(), 0.9), lp = makeFilter(ctx, "lowpass", 300, 0.6), g = makeGain(ctx, 0);
    const bp = makeFilter(ctx, "bandpass", 700, 0.7), g2 = makeGain(ctx, 0), sw = makeGain(ctx, 0);
    const swell = loopSource(ctx, bank.gusts(), 0.15, 5);
    pink.connect(lp).connect(g).connect(sw); pink.connect(bp).connect(g2).connect(sw); sw.connect(out); swell.connect(sw.gain);
    const L = smoothParam(g.gain, 1), L2 = smoothParam(g2.gain, 1);
    return { params: { level: 0.5, night: 0 }, update(t) { const v = this.params.level * (1 - this.params.night * 0.6); L(v * 0.2, t); L2(v * 0.035, t); } };
  };
}

// ---- rain bed ---------------------------------------------------------------------------------------------------
// params: intensity 0..1 (light..heavy), mix of ground / roof / trees (by where the listener stands).
export function createRainBed(bank) {
  return (ctx, out) => {
    // Layers (surface x light/heavy) are built only while their weight is > 0 and torn down 3 s after it
    // returns to 0: a dry day costs nothing (each layer = 2 looping buffers, L/R decorrelated by offset).
    const layers = {};
    const layer = (key, surf, heavy) => {
      const g = makeGain(ctx, 0), m = ctx.createChannelMerger(2);
      const a = loopSource(ctx, bank.rain(surf, heavy), 1, 0), b = loopSource(ctx, bank.rain(surf, heavy), 1, 2.1);
      a.connect(m, 0, 0); b.connect(m, 0, 1); m.connect(g).connect(out);
      return { set: smoothParam(g.gain, 0.5), last: 0, kill(t) { a.stop(t + 1.5); b.stop(t + 1.5); a.onended = () => { a.disconnect(); b.disconnect(); m.disconnect(); g.disconnect(); }; } };
    };
    let wash = null;
    return {
      params: { intensity: 0, ground: 1, roof: 0, trees: 0 },
      update(t) {
        const p = this.params, i = clamp(p.intensity), on = i > 0.01 ? 1 : 0, hv = clamp((i - 0.3) / 0.6);
        for (const sf of ["ground", "roof", "trees"]) for (const h of [0, 1]) {
          const w = (h ? hv * (0.4 + i) * 0.8 : (1 - hv) * on * (0.3 + i) * 0.7) * p[sf], key = sf + h;
          if (w > 0.001) { const L = (layers[key] ??= layer(key, sf, h)); L.set(w, t); L.last = t; }
          else if (layers[key]) { layers[key].set(0, t); if (t - layers[key].last > 3) { layers[key].kill(t); delete layers[key]; } }
        }
        if (on && !wash) { const src = loopSource(ctx, bank.pink(), 1.1), f = makeFilter(ctx, "bandpass", 2500, 0.4), g = makeGain(ctx, 0); src.connect(f).connect(g).connect(out); wash = { src, set: smoothParam(g.gain, 0.5), last: t, nodes: [src, f, g] }; }
        if (wash) {
          wash.set(on * i * i * 0.25 * (1 - p.trees * 0.5), t);
          if (on) wash.last = t; else if (t - wash.last > 3) { const w = wash; w.src.stop(t + 1.5); w.src.onended = () => w.nodes.forEach((n) => n.disconnect()); wash = null; }
        }
      },
    };
  };
}

// ---- birds ----------------------------------------------------------------------------------------------------
// Song shapes from field-guide descriptions and published sonograms (Xeno-canto, BTO "learning bird song"):
// blackbird: low fluted warble 1.5-3.5 kHz, 4-7 notes, then a squeaky high twitter; robin: thin high
// warble 2.5-8 kHz, quick varied notes and trills; great tit: "tea-cher" (~5 kHz then ~3.7 kHz, every ~0.45 s);
// wood pigeon: five soft hoots "coo-COOO-coo, coo-coo" near 300-400 Hz; magpie: harsh chatter, ~12 pulses/s;
// carrion crow: 3-4 harsh "kraa" (~0.35 s, f0 ~0.5-0.6 kHz, noisy, formant-coloured).
// Each species: a synth(t-domain) into 4 variants; sines with pitch contours (phase accumulation).
function tone(d, sr, t0, dur, f, amp, { harm = [], shape = (u) => Math.sin(Math.PI * u), am = 0, amF = 0 } = {}) {
  const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr); let ph = 0;
  for (let j = 0; j < n && i0 + j < d.length; j++) {
    const u = j / n, fr = f(u); ph += fr / sr;
    let y = Math.sin(TAU * ph); harm.forEach((a, k) => { y += a * Math.sin(TAU * ph * (k + 2)); });
    const e = shape(u) * (am ? 1 - am * (0.5 + 0.5 * Math.sin(TAU * amF * j / sr)) : 1);
    d[i0 + j] += y * e * amp;
  }
}
const SPECIES = {
  blackbird(d, sr, r) {
    let t = 0.05; const notes = 4 + Math.floor(r() * 4);
    for (let k = 0; k < notes; k++) {
      const f0 = 1500 + r() * 1300, f1 = f0 * (0.8 + r() * 0.5), dur = 0.09 + r() * 0.22, bend = (r() - 0.5) * 600;
      tone(d, sr, t, dur, (u) => f0 + (f1 - f0) * u + bend * Math.sin(Math.PI * u), 0.5 + r() * 0.5, { harm: [0.12, 0.03], shape: (u) => Math.pow(Math.sin(Math.PI * u), 0.6) });
      t += dur + 0.02 + r() * 0.06;
    }
    const tw = 3 + Math.floor(r() * 6);
    for (let k = 0; k < tw; k++) { const f0 = 5000 + r() * 3000, dur = 0.015 + r() * 0.02; tone(d, sr, t, dur, (u) => f0 - u * 2200, 0.18 + r() * 0.12); t += dur + 0.008 + r() * 0.02; }
    return t;
  },
  robin(d, sr, r) {
    let t = 0.03; const notes = 8 + Math.floor(r() * 10);
    for (let k = 0; k < notes; k++) {
      const f0 = 2500 + r() * 5000, dur = 0.03 + r() * 0.12, trill = r() < 0.3;
      const f1 = Math.max(2200, Math.min(8500, f0 + (r() - 0.5) * 3000));
      tone(d, sr, t, dur, trill ? (u) => f0 + 600 * Math.sin(TAU * 35 * u * dur) : (u) => f0 + (f1 - f0) * u, 0.3 + r() * 0.6, { am: trill ? 0.6 : 0, amF: 40 });
      t += dur + 0.01 + r() * 0.05;
    }
    return t;
  },
  greattit(d, sr, r) {
    let t = 0.03; const reps = 3 + Math.floor(r() * 4), hi = 4600 + r() * 600, lo = 3500 + r() * 400;
    for (let k = 0; k < reps; k++) {
      tone(d, sr, t, 0.09, (u) => hi - 300 * u, 0.8, { harm: [0.05] });
      tone(d, sr, t + 0.12, 0.11, (u) => lo + 150 * Math.sin(Math.PI * u), 0.7, { harm: [0.05] });
      t += 0.42 + r() * 0.06;
    }
    return t;
  },
  woodpigeon(d, sr, r) {
    const f = 320 + r() * 60, pat = [[0.32, 0.8], [0.55, 1], [0.3, 0.75], [0.25, 0], [0.3, 0.8], [0.3, 0.7]];
    let t = 0.05; const lp = new OnePole(900, sr);
    for (const [dur, a] of pat) {
      if (a > 0) tone(d, sr, t, dur, (u) => f * (1 + 0.06 * Math.sin(Math.PI * u) - 0.04 * u), a, { harm: [0.35, 0.12], shape: (u) => Math.pow(Math.sin(Math.PI * u), 1.5) });
      t += dur + 0.04;
    }
    for (let i = 0; i < d.length; i++) d[i] = lp.lp(d[i]) + (r() * 2 - 1) * 0.004 * Math.abs(d[i]);   // soft, breathy
    return t;
  },
  magpie(d, sr, r) {
    const pulses = 7 + Math.floor(r() * 8), f0 = 1100 + r() * 300, bp = new Biquad("bandpass", 2600, 0.9, sr);
    let t = 0.03;
    for (let k = 0; k < pulses; k++) {
      const i0 = Math.floor(t * sr), n = Math.floor(sr * 0.05);
      for (let j = 0; j < n && i0 + j < d.length; j++) {
        const u = j / n, e = Math.exp(-u * 4) * Math.min(1, j / (sr * 0.003));
        let y = 0; for (let h = 1; h < 6; h++) y += Math.sin(TAU * f0 * h * j / sr + h * k) / h;
        d[i0 + j] += (y * 0.4 + bp.run(r() * 2 - 1) * 2.2) * e * 0.6;
      }
      t += 0.075 + r() * 0.02;
    }
    return t;
  },
  crow(d, sr, r) {
    const calls = 3 + Math.floor(r() * 2), f1 = new Biquad("bandpass", 1200, 2, sr), f2 = new Biquad("bandpass", 2100, 2.5, sr);
    let t = 0.03;
    for (let k = 0; k < calls; k++) {
      const dur = 0.3 + r() * 0.12, f0 = 520 + r() * 100, i0 = Math.floor(t * sr), n = Math.floor(dur * sr);
      let ph = 0;
      for (let j = 0; j < n && i0 + j < d.length; j++) {
        const u = j / n, f = f0 * (1.05 - 0.15 * u) * (1 + (r() - 0.5) * 0.06); ph += f / sr;
        const x = (ph % 1) < 0.3 ? 1 : -0.4;                                     // harsh pulse train
        const e = Math.min(1, u * 12) * Math.min(1, (1 - u) * 6);
        d[i0 + j] += (f1.run(x) * 1.2 + f2.run(x) * 0.8 + (r() * 2 - 1) * 0.15) * e;
      }
      t += dur + 0.35 + r() * 0.15;
    }
    return t;
  },
};
const SONG_LEN = { blackbird: 2.6, robin: 2.4, greattit: 3.2, woodpigeon: 2.6, magpie: 1.4, crow: 2.6 };
export const BIRDS = Object.keys(SPECIES);

export class BirdBank {
  constructor(ctx) { this.ctx = ctx; this.c = {}; }
  song(species, v) { return (this.c[species + v] ??= bake(this.ctx, SONG_LEN[species], ([d], sr, r) => SPECIES[species](d, sr, r), { seed: 50 + v * 13 + species.length * 101, peak: 0.7 })); }
}

// Sunrise / sunset (hours, local Brussels time) for a day of year: NOAA simplified solar equations at Uccle
// (50.80 N, 4.34 E); CET/CEST with the EU rule (last Sunday of March / October, approximated by day 87-300).
export function sunTimes(doy, lat = 50.80, lon = 4.34) {
  const g = TAU / 365 * (doy - 1);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const la = lat * Math.PI / 180, z = 90.833 * Math.PI / 180;
  const ha = Math.acos(Math.cos(z) / (Math.cos(la) * Math.cos(decl)) - Math.tan(la) * Math.tan(decl)) * 180 / Math.PI;
  const tz = doy >= 87 && doy < 300 ? 2 : 1;
  const noon = (720 - 4 * lon - eqt) / 60 + tz;
  return { sunrise: noon - ha * 4 / 60, sunset: noon + ha * 4 / 60 };
}
// Singing activity 0..1 per species for hour and month (1-12). Seasons (approximate, Belgian/UK guides):
// blackbird song Feb-Jul, dawn + dusk; robin all year except Jul-Aug moult silence, also at night under lamps;
// great tit Jan-Jun; wood pigeon Mar-Oct, all day; magpie / crow calls all year, daytime.
export function birdActivity(species, hour, month) {
  const doy = Math.round((month - 0.5) * 30.4), { sunrise, sunset } = sunTimes(doy);
  const dawn = Math.exp(-(((hour - (sunrise + 0.2)) / 0.9) ** 2)), dusk = Math.exp(-(((hour - (sunset - 0.3)) / 0.8) ** 2));
  const day = hour > sunrise - 0.3 && hour < sunset + 0.2 ? 1 : 0;
  const inM = (a, b) => (month >= a && month <= b ? 1 : 0);
  switch (species) {
    case "blackbird": return inM(2, 7) * Math.min(1, dawn * 1.0 + dusk * 0.8 + day * 0.12) + inM(8, 8) * dawn * 0.15;
    case "robin": return (1 - inM(7, 8) * 0.9) * Math.min(1, dawn * 1.0 + dusk * 0.6 + day * 0.2 + (day ? 0 : 0.03));
    case "greattit": return inM(1, 6) * Math.min(1, dawn * 0.9 + day * 0.25) + inM(9, 12) * day * 0.05;
    case "woodpigeon": return inM(3, 10) * Math.min(1, dawn * 0.5 + day * 0.35);
    case "magpie": return day * 0.25;
    case "crow": return day * 0.2 + dawn * 0.2;
  }
  return 0;
}

// ---- church bells ---------------------------------------------------------------------------------------------
// Modal synthesis of a tuned Western church bell: partial ratios to the prime (Hibbert; "Strike tone",
// measured bell: hum 0.5, prime 1, tierce 1.183 (minor third), quint 1.506, nominal 2, then the upper
// partials 2.514, 2.662, 3.011, 4.166, 5.433, 6.796). Each partial is a slightly split doublet (an
// asymmetric bell's degenerate modes) -> the slow warble; hum and prime ring longest, the quint is short,
// the nominal (which sets the perceived strike note) is a bright burst. Plus the clapper's metallic clank.
const BELL = [[0.5, 0.5, 1.0], [1, 0.55, 0.75], [1.183, 0.8, 0.6], [1.506, 0.25, 0.22], [2, 1, 0.42], [2.514, 0.45, 0.25], [2.662, 0.3, 0.22],
  [3.011, 0.4, 0.17], [4.166, 0.28, 0.1], [5.433, 0.15, 0.07], [6.796, 0.09, 0.05]];
export class BellBank {
  constructor(ctx) { this.ctx = ctx; this.c = {}; }
  // prime Hz, t60 of the hum (s) (bigger bells ring longer).
  strike(prime, hum60 = 14, seed = 1) {
    return (this.c[prime + "_" + hum60 + seed] ??= bake(this.ctx, Math.min(9, hum60 * 0.55), ([d], sr, r) => {
      const P = BELL.map(([k, a, tk]) => ({ f: prime * k, a, t60: hum60 * tk, split: 0.15 + r() * 0.9, ph: r() * TAU, ph2: r() * TAU }));
      const clank = new Biquad("bandpass", prime * 9, 1.5, sr);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr; let y = 0;
        for (const p of P) {
          if (p.f > sr * 0.45) continue;
          const e = p.a * Math.exp(-6.9 * t / p.t60);
          y += e * (Math.sin(TAU * p.f * t + p.ph) + 0.7 * Math.sin(TAU * (p.f + p.split) * t + p.ph2));
        }
        d[i] = y * (1 - Math.exp(-t * 2500)) + clank.run(r() * 2 - 1) * Math.exp(-t * 120) * 1.5;
      }
    }, { seed, peak: 0.85 }));
  }
}
// The hour: n strikes (1..12), 2.6 s apart (a hammer on the bell's lip, slow mechanism).
export function playHourStrikes(ctx, bank, out, when, hour, { prime = 262, hum60 = 14, gap = 2.6 } = {}) {
  const n = ((hour + 11) % 12) + 1; let end = when;
  for (let i = 0; i < n; i++) end = playBuffer(ctx, bank.strike(prime, hum60, 1 + (i % 2)), out, when + i * gap, { gain: 0.8 });
  return end;
}

// ---- dog bark -------------------------------------------------------------------------------------------------
// A bark: a ~0.15 s voiced burst, f0 falling fast (~550 -> 330 Hz), rough (jittery pulses + noise), shaped by
// two formants (~0.9 and ~2.3 kHz), 1-3 barks ~0.35 s apart. A big dog = lower f0 and formants.
export function barkBuffer(ctx, seed = 1, size = 1) {
  return bake(ctx, 1.4, ([d], sr, r) => {
    const n = 1 + Math.floor(r() * 3), F = [new Biquad("bandpass", 900 / size, 3, sr), new Biquad("bandpass", 2300 / size, 4, sr), new Biquad("lowpass", 4000, 0.7, sr)];
    for (let k = 0; k < n; k++) {
      const t0 = 0.02 + k * (0.3 + r() * 0.12), dur = 0.12 + r() * 0.06, f0 = (520 + r() * 100) / size;
      let ph = 0;
      for (let j = 0, m = Math.floor(dur * sr); j < m; j++) {
        const u = j / m, f = f0 * (1 - 0.4 * u) * (1 + (r() - 0.5) * 0.08); ph += f / sr;
        const x = (ph % 1) < 0.2 ? 1 : -0.25, e = Math.min(1, u * 30) * Math.pow(1 - u, 1.5);
        const s = x + (r() * 2 - 1) * 0.5;
        d[Math.floor(t0 * sr) + j] += (F[0].run(s) * 1.4 + F[1].run(s) * 0.9 + F[2].run(s) * 0.15) * e;
      }
    }
  }, { seed: 700 + seed, peak: 0.8 });
}

// ---- playground --------------------------------------------------------------------------------------------------
// Children: slop-newyork's speech fragments (glottal pulses through three formant resonators) with child
// speakers (f0 260-340 Hz, formants x1.25-1.35), overlapping at random, plus shouts (a sustained vowel with a
// pitch rise), laughter ("ha" pulses ~5/s) and an occasional shriek glide. Baked as an 8 s loop per source.
export function playgroundBuffer(ctx, seed = 1) {
  const kids = [0, 1, 2, 3].map((k) => ({ pitch: 255 + k * 25 + seed * 7, formants: 1.24 + k * 0.035, breath: 0.12 + k * 0.02 }));
  const frags = [];
  for (let i = 0; i < 10; i++) frags.push(speechFragment(ctx, kids[i % 4], 900 + seed * 31 + i));
  return bake(ctx, 8, ([d], sr, r) => {
    const n = d.length;
    const add = (buf, t0, g, rate = 1) => { const s = buf.getChannelData(0), i0 = Math.floor(t0 * sr); for (let j = 0; (j * rate) < s.length - 1; j++) { const i = (i0 + j) % n, x = j * rate, k = Math.floor(x); d[i] += (s[k] + (s[k + 1] - s[k]) * (x - k)) * g; } };
    for (let t = 0; t < 8; t += 0.15 + r() * 0.5) add(frags[Math.floor(r() * frags.length)], t, 0.4 + r() * 0.6, 0.95 + r() * 0.2);
    // shouts / shrieks / laughter
    for (let k = 0; k < 5; k++) {
      const t0 = r() * 7.5, kind = r(), f0 = 330 + r() * 120, i0 = Math.floor(t0 * sr);
      const dur = kind < 0.3 ? 0.6 : kind < 0.6 ? 0.9 : 0.5, m = Math.floor(dur * sr), F1 = new Biquad("bandpass", 950, 3, sr), F2 = new Biquad("bandpass", 1900, 4, sr);
      let ph = 0;
      for (let j = 0; j < m; j++) {
        const u = j / m;
        const f = kind < 0.3 ? f0 * (1.2 + 1.6 * Math.sin(Math.PI * u)) : kind < 0.6 ? f0 * (1 + 0.3 * u) : f0 * 1.1;
        ph += f * (1 + 0.025 * Math.sin(TAU * 6 * j / sr) + (r() - 0.5) * 0.05) / sr;   // vibrato + jitter
        const x = ((ph % 1) < 0.4 ? 1 : -0.6) + (r() - 0.5) * 0.5;
        const e = kind >= 0.6 ? Math.max(0, Math.sin(TAU * 5.2 * u * dur)) ** 2 * (1 - u) : Math.sin(Math.PI * u) ** 0.5;
        d[(i0 + j) % n] += (F1.run(x) + F2.run(x) * 0.7 + (kind >= 0.6 ? (r() - 0.5) * 0.3 : 0)) * e * 0.45;
      }
    }
  }, { seed: 1300 + seed, rms: 0.18, loop: true });
}
export function createPlaygroundVoice(ctx, buf, out, src, now) {
  const s = loopSource(ctx, buf, 1, (src.seed || 0) * 8), g = makeGain(ctx, 0); s.connect(g).connect(out);
  const G = smoothParam(g.gain, 0.6);
  return { update(t, src) { G(src.level ?? 1, t); }, dispose(when) { s.stop(when + 0.05); s.onended = () => { s.disconnect(); g.disconnect(); }; } };
}
export { playBuffer };
