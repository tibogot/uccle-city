// Transit: the STIB tram 92 (T3000, Bombardier Flexity Outlook) and SNCB AM08 (Siemens Desiro ML) trains.
// Tram, after the curve-squeal literature (Silence project on a Brussels Flexity: track noise dominates on
// straight track; squeal is TONAL at a wheel mode, < 1 kHz to ~5 kHz, intermittent (stick-slip), flanging is
// broadband 5-10 kHz; Chalmers / Southampton tram studies):
//  - rolling: pink noise low-passed (grooved rail in the street = a rumble), level ~ v^1.5, + a rail "ring" band;
//  - squeal: two wheel-mode tones (panel: Hz) whose level follows curvature x speed through an on/off
//    stick-slip process (bursts 0.2-2 s) with a small pitch wander; plus a flanging hiss (HP noise);
//  - traction: an inverter carrier tone (asynchronous PWM ~1.4 kHz) frequency-modulated by the motor's
//    electrical frequency (sidebands that move with speed), and a gear-mesh whine at teeth x axle rate, both
//    scaled by |tractive effort| (accelerating or regenerative braking), silent when coasting;
//  - auxiliaries: HVAC fan + 100 Hz hum, always on (what you hear at a stop);
//  - bell: a two-tone struck gong (modal partials of a small cup bell), doors (warning beeps, motor, thump),
//    the stop-request chime (two notes).
// NOTE: the T3000's real bell pitches / beep / chime are not documented anywhere we found; the panel exposes
// them (defaults are plausible, not measured). Same for the AM08 horn: UIC 644 nominal 370 Hz + 660 Hz.
import { bake, Biquad, Mode, OnePole, TAU, clamp, loopSource, makeFilter, makeGain, pinkSource, playBuffer, smoothParam } from "./util.js";

export class TransitBank {
  constructor(ctx) { this.ctx = ctx; this.c = {}; }
  pink() { return (this.c.pink ??= bake(this.ctx, 3, ([d], sr, r) => { const p = pinkSource(r); for (let i = 0; i < d.length; i++) d[i] = p(); }, { rms: 0.25, loop: true, seed: 4242 })); }
  // A struck cup bell / gong at f (partials of a small hemispherical bell: 1, 2.32, 4.25, 6.63, 9.38).
  gong(f, t60 = 1.3) {
    return (this.c["g" + f + t60] ??= bake(this.ctx, t60 * 1.1, ([d], sr, r) => {
      const P = [[1, 1, 1], [2.32, 0.55, 0.6], [4.25, 0.35, 0.35], [6.63, 0.2, 0.2], [9.38, 0.1, 0.12]];
      const ph = P.map(() => r() * TAU);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr; let y = 0;
        P.forEach(([k, a, tk], j) => { y += a * Math.sin(TAU * f * k * t + ph[j]) * Math.exp(-6.9 * t / (t60 * tk)); });
        y += (r() * 2 - 1) * Math.exp(-t * 600) * 0.4;   // hammer
        d[i] = y * (1 - Math.exp(-t * 3000));
      }
    }, { seed: Math.round(f), peak: 0.8 }));
  }
  // Two-note chime (soft mallet on a bar: partials 1, 3.93, 9.0 with fast-decaying uppers).
  chime(f1, f2) {
    return (this.c["c" + f1 + f2] ??= bake(this.ctx, 1.6, ([d], sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr; let y = 0;
        for (const [f, t0] of [[f1, 0], [f2, 0.42]]) {
          const u = t - t0; if (u < 0) continue;
          y += (Math.sin(TAU * f * u) + 0.25 * Math.sin(TAU * f * 3.93 * u) * Math.exp(-u * 12) + 0.08 * Math.sin(TAU * f * 9 * u) * Math.exp(-u * 30)) * Math.exp(-u * 3.2) * (1 - Math.exp(-u * 900));
        }
        d[i] = y;
      }
    }, { peak: 0.6 }));
  }
  // Door cycle: warning beeps (n x 2.4 kHz), the leaf motor run, the close thump + seal.
  doors(beeps = 5) {
    return (this.c["dr" + beeps] ??= bake(this.ctx, 3.2, ([d], sr, r) => {
      const motor = new Biquad("bandpass", 420, 1.2, sr), thumpM = [new Mode(75, 0.15, sr, 1), new Mode(160, 0.08, sr, 0.5)];
      for (let i = 0; i < d.length; i++) {
        const t = i / sr, w = r() * 2 - 1;
        const k = Math.floor(t / 0.24), u = t - k * 0.24;
        const beep = k < beeps && u < 0.12 ? Math.sign(Math.sin(TAU * 2400 * t)) * 0.18 * Math.min(1, u * 400, (0.12 - u) * 400) : 0;
        const run = t > 0.9 && t < 2.6 ? Math.min(1, (t - 0.9) * 8, (2.6 - t) * 8) : 0;
        const mot = (motor.run(w) * 2 + Math.sin(TAU * 160 * t) * 0.06 + Math.sin(TAU * 320 * t) * 0.03) * run;
        const hit = t > 2.6 ? Math.exp(-(t - 2.6) * 300) * w : 0;
        let th = 0; for (const m of thumpM) th += m.run(hit);
        d[i] = beep * 0.35 + mot * 0.35 + th * 3;
      }
    }, { peak: 0.7 }));
  }
  // Wheel over a rail joint / switch: rail and wheel modes, ~20 ms.
  clack(seed = 0) {
    return (this.c["k" + seed] ??= bake(this.ctx, 0.25, ([d], sr, r) => {
      const modes = [new Mode(180 + r() * 40, 0.06, sr, 1), new Mode(520, 0.05, sr, 0.6), new Mode(1150 + r() * 200, 0.05, sr, 0.4), new Mode(2750, 0.08, sr, 0.25), new Mode(4900, 0.12, sr, 0.12)];
      for (let i = 0; i < d.length; i++) {
        const t = i / sr, x = (r() * 2 - 1) * Math.exp(-t * 900) + (i === 0 ? 4 : 0);
        let y = 0; for (const m of modes) y += m.run(x);
        d[i] = y;
      }
    }, { seed: 300 + seed, peak: 0.8 }));
  }
  // Pneumatic two-tone horn (UIC 644: low 370 Hz, high 660 Hz): reed buzz (pulse-like, many harmonics),
  // the flare's resonance (peak near 1.8 kHz), a pitch rise at onset as pressure builds, air noise.
  trainHorn(fa, fb, la = 0.9, lb = 0.9) {
    return (this.c["th" + fa + fb + la + lb] ??= bake(this.ctx, la + lb + 0.25, ([d], sr, r) => {
      const res = new Biquad("peak", 1800, 1.2, sr, 9), lp = new Biquad("lowpass", 5000, 0.7, sr);
      let ph = 0, air = new OnePole(3000, sr);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const second = t >= la + 0.04, u = second ? t - la - 0.04 : t, len = second ? lb : la, f = second ? fb : fa;
        if (u > len) { d[i] = 0; continue; }
        const env = Math.min(1, u / 0.06) * Math.min(1, (len - u) / 0.08);
        ph += f * (1 - 0.06 * Math.exp(-u * 18)) * (1 + 0.003 * Math.sin(TAU * 5.3 * t)) / sr;
        const x = ph % 1, pulse = x < 0.32 ? Math.sin(Math.PI * x / 0.32) : -0.25;   // asymmetric reed opening
        d[i] = lp.run(res.run(pulse * env)) + air.lp(r() * 2 - 1) * env * 0.15;
      }
    }, { peak: 0.8 }));
  }
}

// ---- tram voice -------------------------------------------------------------------------------------------
// src: speed m/s, accel m/s2 (effort), curvature 1/R, squealHz [a, b], gain. part: "front" (traction + aux) or "rear".
export function createTramVoice(ctx, bank, out, src, now) {
  const nodes = [], sources = [];
  const own = (n) => (nodes.push(n), n);
  const osc = (type, f) => { const o = own(ctx.createOscillator()); o.type = type; o.frequency.value = f; o.start(now); sources.push(o); return o; };
  const mix = own(makeGain(ctx, 1)); mix.connect(out);
  const pink = own(loopSource(ctx, bank.pink(), 1, Math.random() * 3)); sources.push(pink);
  const rumF = own(makeFilter(ctx, "lowpass", 380, 0.7)), rumG = own(makeGain(ctx, 0));
  const ringF = own(makeFilter(ctx, "bandpass", 1150, 1.4)), ringG = own(makeGain(ctx, 0));
  const hissF = own(makeFilter(ctx, "highpass", 5200, 0.7)), hissG = own(makeGain(ctx, 0));
  pink.connect(rumF).connect(rumG).connect(mix); pink.connect(ringF).connect(ringG).connect(mix); pink.connect(hissF).connect(hissG).connect(mix);
  const P = { rum: smoothParam(rumG.gain, 0.2), ring: smoothParam(ringG.gain, 0.2), hiss: smoothParam(hissG.gain, 0.15), rate: smoothParam(pink.playbackRate, 0.3, 1e-3) };
  // Squeal and traction are LAZY layers: built when needed (in a curve / under effort), torn down after 3 s
  // of silence: oscillators (and FM above all) cost audio-thread time even when their gain is 0.
  const squeal = lazyLayer(ctx, mix, now, (L) => {
    const [qa, qb] = src.squealHz || [1250, 3240];
    const sqA = L.osc("sine", qa), sqB = L.osc("sine", qb), sqH = L.osc("sine", qa * 2);
    const gA = L.gain(), gB = L.gain(), gH = L.gain();
    sqA.connect(gA).connect(L.out); sqB.connect(gB).connect(L.out); sqH.connect(gH).connect(L.out);
    return { a: smoothParam(gA.gain, 0.05), b: smoothParam(gB.gain, 0.05), h: smoothParam(gH.gain, 0.05),
      af: smoothParam(sqA.frequency, 0.3, 0.5), bf: smoothParam(sqB.frequency, 0.3, 0.5), hf: smoothParam(sqH.frequency, 0.3, 0.5) };
  });
  const front = src.part !== "rear";
  const traction = lazyLayer(ctx, mix, now, (L) => {
    const car = L.osc("triangle", 1400), fmO = L.osc("sine", 10), fmG = L.gain(); fmO.connect(fmG).connect(car.frequency);
    const carG = L.gain(), carF = L.filter("bandpass", 1400, 2); car.connect(carF).connect(carG).connect(L.out);
    const gearO = L.osc("triangle", 100), gF = L.filter("lowpass", 1800, 0.7), gearG = L.gain(); gearO.connect(gF).connect(gearG).connect(L.out);
    return { car: smoothParam(carG.gain, 0.1), fmF: smoothParam(fmO.frequency, 0.1, 0.1), fmD: smoothParam(fmG.gain, 0.1, 0.5), gear: smoothParam(gearG.gain, 0.1), gearF: smoothParam(gearO.frequency, 0.05, 0.5) };
  });
  if (front) {   // auxiliaries (HVAC fan + 100 Hz hum): always on, what you hear at a stop
    const fan = own(makeFilter(ctx, "bandpass", 300, 0.8)), hum = osc("sine", 100), auxG = own(makeGain(ctx, 0.035)), humG = own(makeGain(ctx, 0.006));
    pink.connect(fan).connect(auxG).connect(mix); hum.connect(humG).connect(mix);
  }
  let stick = 0, stickUntil = 0, stickB = 0, stickBUntil = 0;
  return {
    update(t, s) {
      const v = Math.abs(s.speed || 0), roll = Math.pow(clamp(v / 12, 0, 1.4), 1.5);
      P.rum(roll * 0.5 * (s.rollGain ?? 1), t); P.ring(roll * 0.08 * (s.rollGain ?? 1), t); P.rate(0.8 + clamp(v / 12) * 0.4, t);
      // Squeal: curvature above ~1/60 m and speed above ~1.5 m/s; bursts from a random stick-slip state.
      const k = clamp(((s.curvature || 0) - 1 / 60) / (1 / 18 - 1 / 60)) * clamp((v - 1.5) / 3) * (s.squeal ?? 1);
      P.hiss(k * 0.05 + roll * 0.006, t);
      if (k > 0) {
        const Q = squeal.on(t);
        if (t >= stickUntil) { stick = Math.random() < 0.5 ? 0.4 + Math.random() * 0.5 : 0; stickUntil = t + 0.2 + Math.random() * 1.6; }
        if (t >= stickBUntil) { stickB = Math.random() < 0.35 ? Math.random() : 0; stickBUntil = t + 0.15 + Math.random() * 1.0; }
        const [fa, fb] = s.squealHz || [1250, 3240], wander = 1 + (Math.random() - 0.5) * 0.008;
        Q.af(fa * wander, t); Q.hf(fa * 2 * wander, t); Q.bf(fb * (1 + (Math.random() - 0.5) * 0.006), t);
        Q.a(k * stick * 0.22, t); Q.h(k * stick * 0.05, t); Q.b(k * stickB * 0.1, t);
      } else if (squeal.P) { squeal.P.a(0, t); squeal.P.b(0, t); squeal.P.h(0, t); squeal.idle(t); }
      const effort = front ? clamp(Math.abs(s.accel || 0) / 1.3) * (v > 0.05 || (s.accel || 0) > 0 ? 1 : 0) : 0;
      if (effort > 0.02) {
        const T = traction.on(t), fel = v * 9.5;          // motor electrical frequency (Hz) ~ speed
        T.car(effort * 0.045 * (s.motorGain ?? 1), t); T.fmF(Math.max(1, fel * 2), t); T.fmD(Math.min(600, 60 + fel * 6), t);
        T.gear(effort * clamp(v / 2) * 0.03 * (s.motorGain ?? 1), t); T.gearF(Math.max(20, v * 78), t);
      } else if (traction.P) { traction.P.car(0, t); traction.P.gear(0, t); traction.idle(t); }
    },
    dispose(when) { squeal.stop(when); traction.stop(when); for (const s of sources) { try { s.stop(when + 0.05); } catch { /* */ } } sources[0].onended = () => { for (const n of nodes) n.disconnect(); }; },
  };
}

// A layer of nodes built on demand: on(t) builds it (once) and returns its params; idle(t) tears it down when
// it has not been needed for `linger` s; stop(when) ends it.
function lazyLayer(ctx, out, now, build, linger = 3) {
  const self = { P: null, last: 0, nodes: [], srcs: [] };
  const L = {
    out: null,
    osc: (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(self.t0); self.srcs.push(o); self.nodes.push(o); return o; },
    gain: (g = 0) => { const n = makeGain(ctx, g); self.nodes.push(n); return n; },
    filter: (type, f, q) => { const n = makeFilter(ctx, type, f, q); self.nodes.push(n); return n; },
  };
  self.on = (t) => { if (!self.P) { self.t0 = t; L.out = makeGain(ctx, 1); L.out.connect(out); self.nodes = [L.out]; self.srcs = []; self.P = build(L); } self.last = t; return self.P; };
  self.stop = (when) => {
    if (!self.P) return;
    const nodes = self.nodes, srcs = self.srcs;
    for (const s of srcs) s.stop(when + 0.3);
    if (srcs[0]) srcs[0].onended = () => { for (const n of nodes) n.disconnect(); };
    self.P = null;
  };
  self.idle = (t) => { if (self.P && t - self.last > linger) self.stop(t); };
  return self;
}

// ---- train voice (one per car) ----------------------------------------------------------------------------
// Rolling: pink noise with a broad 0.8-1.2 kHz wheel/rail roughness peak + low rumble, level ~ v^1.5
// (TWINS-type rolling noise rises ~30 log v); aerodynamic hiss ~ v^3 (small at 120 km/h); traction whine on
// motored cars. Joint clacks are separate events AT the joint (see TrainSim in the lab).
export function createTrainVoice(ctx, bank, out, src, now) {
  const nodes = [], sources = [];
  const own = (n) => (nodes.push(n), n);
  const mix = own(makeGain(ctx, 1)); mix.connect(out);
  const pink = own(loopSource(ctx, bank.pink(), 1, Math.random() * 3)); sources.push(pink);
  const lo = own(makeFilter(ctx, "lowpass", 250, 0.7)), loG = own(makeGain(ctx, 0));
  const mid = own(makeFilter(ctx, "bandpass", 1000, 0.8)), midG = own(makeGain(ctx, 0));
  const aero = own(makeFilter(ctx, "highpass", 3000, 0.6)), aeroG = own(makeGain(ctx, 0));
  pink.connect(lo).connect(loG).connect(mix); pink.connect(mid).connect(midG).connect(mix); pink.connect(aero).connect(aeroG).connect(mix);
  let whG, whO;
  if (src.motored) { whO = own(ctx.createOscillator()); whO.type = "triangle"; whO.start(now); sources.push(whO); whG = own(makeGain(ctx, 0)); whO.connect(whG).connect(mix); }
  const P = { lo: smoothParam(loG.gain, 0.2), mid: smoothParam(midG.gain, 0.2), aero: smoothParam(aeroG.gain, 0.2), midF: smoothParam(mid.frequency, 0.3, 1) };
  if (whO) { P.wh = smoothParam(whG.gain, 0.15); P.whF = smoothParam(whO.frequency, 0.1, 0.5); }
  return {
    update(t, s) {
      const v = Math.abs(s.speed || 0), roll = Math.pow(clamp(v / 33, 0, 1.3), 1.5);
      P.lo(roll * 0.55, t); P.mid(roll * 0.4, t); P.midF(800 + v * 8, t); P.aero(Math.pow(v / 45, 3) * 0.15, t);
      if (P.wh) { P.wh((0.006 + clamp(Math.abs(s.accel || 0)) * 0.02) * clamp(v / 3), t); P.whF(Math.max(30, v * 23), t); }
    },
    dispose(when) { for (const s of sources) { try { s.stop(when + 0.05); } catch { /* */ } } sources[0].onended = () => { for (const n of nodes) n.disconnect(); }; },
  };
}

// Bell, chime, doors, horn, clack as one-shots.
export function playTramBell(ctx, bank, out, when, { hi = 1046, lo = 784, gap = 0.28, strikes = 2 } = {}) {
  let end = when;
  for (let i = 0; i < strikes; i++) end = Math.max(end, playBuffer(ctx, bank.gong(i % 2 ? lo : hi), out, when + i * gap, { gain: 0.7 }));
  return end;
}
export const playTramChime = (ctx, bank, out, when, { f1 = 1318, f2 = 1046 } = {}) => playBuffer(ctx, bank.chime(f1, f2), out, when, { gain: 0.5 });
export const playTramDoors = (ctx, bank, out, when) => playBuffer(ctx, bank.doors(5), out, when, { gain: 0.6 });
export const playTrainHorn = (ctx, bank, out, when, { fa = 660, fb = 370, la = 0.8, lb = 1.0 } = {}) => playBuffer(ctx, bank.trainHorn(fa, fb, la, lb), out, when, { gain: 0.9 });
export function playBogieClack(ctx, bank, out, when, gapS, seed = 0) {
  playBuffer(ctx, bank.clack(seed % 4), out, when, { gain: 0.9, rate: 0.97 + (seed % 5) * 0.015 });
  return playBuffer(ctx, bank.clack((seed + 1) % 4), out, when + gapS, { gain: 0.8 });
}
