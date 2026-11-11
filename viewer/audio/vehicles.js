// Cars: engine by RPM and load, tyre / road noise by speed and surface, brake squeal, doors, horn.
// Engine: slop-newyork's combustion loops (vendor/slop-sound combustionBuffers: twenty four-stroke cycles of
// per-cylinder exhaust pulses with a pipe resonance, two RPM banks cross-faded so pulses keep their length in
// seconds) played at rpm/referenceRPM, low-passed by RPM + load, plus the valve/injector clatter loop. The
// gearbox follows his createMotorVoice (shift points by throttle, torque-converter slip at low speed, engine
// braking when coasting); ours exposes RPM/load so the panel can also drive the engine by hand.
// Tyres: asphalt = broadband rolling noise with the CPX peak near 0.8-1 kHz, level ~ 30 log10(v) (amplitude
// v^1.5). Setts (Saint-Job!): + a periodic impact train at v / sett pitch (12 cm setts: ~85 Hz at 10 m/s)
// exciting tyre-cavity / body modes (two banks, 4 and 12 m/s references, cross-faded) and +8 dB rolling noise.
import { combustionBuffers } from "../../vendor/slop-sound/audio-synthesis.js";
import { horn as hornBuffer } from "../../vendor/slop-sound/audio-events.js";
import { bake, Biquad, Mode, OnePole, clamp, loopSource, makeFilter, makeGain, pinkSource, playBuffer, smoothParam } from "./util.js";

export const ROAD_SURFACES = ["asphalt", "setts", "concrete"];

export class VehicleBank {
  constructor(ctx) { this.ctx = ctx; this.c = {}; }
  engine(kind) { return (this.c["e" + kind] ??= combustionBuffers(this.ctx, 4, kind === "diesel", kind === "diesel" ? 0x64696573 : 0x73656461)); }
  pink() {
    return (this.c.pink ??= bake(this.ctx, 3, ([d], sr, r) => { const p = pinkSource(r); for (let i = 0; i < d.length; i++) d[i] = p(); }, { rms: 0.25, loop: true, seed: 77 }));
  }
  // Sett impact train for 4 tyres at reference speed v (m/s); setts 9-16 cm long, joints filled with sand.
  setts(v) {
    return (this.c["s" + v] ??= bake(this.ctx, 2, ([d], sr, r) => {
      const n = d.length, body = [new Mode(95, 0.05, sr, 1), new Mode(230, 0.035, sr, 0.6), new Mode(820, 0.012, sr, 0.25)];
      const imp = new Float32Array(n);
      for (let tyre = 0; tyre < 4; tyre++) {
        let t = r() * 0.02;
        while (t < 2) { const i = Math.floor(t * sr); imp[i] += (0.6 + r() * 0.6) * (tyre < 2 ? 1 : 0.8); t += (0.09 + r() * 0.07) / v; }
      }
      const lp = new OnePole(2500, sr);
      let e = 0;
      for (let i = 0; i < n; i++) {
        e = e * 0.995 + imp[i];                    // each impact: a ~4 ms noisy contact
        const x = lp.lp((r() * 2 - 1) * e * 0.3 + imp[i]);
        let y = 0; for (const m of body) y += m.run(x);
        d[i] = y + x * 0.15;
      }
    }, { rms: 0.22, loop: true, seed: 900 + v }));
  }
  door(close, seed) {
    return (this.c["d" + close + seed] ??= bake(this.ctx, close ? 0.5 : 0.35, ([d], sr, r) => {
      // close: latch click (bright, two clicks), panel thump (body modes 60-180 Hz), a rattle of trim.
      // open: latch release + seal "pop" (low noise burst) + handle spring.
      const modes = close ? [new Mode(68, 0.18, sr, 1), new Mode(142, 0.12, sr, 0.7), new Mode(310, 0.06, sr, 0.4), new Mode(1250, 0.02, sr, 0.2)]
        : [new Mode(180, 0.05, sr, 0.5), new Mode(2400, 0.015, sr, 0.3)];
      const latch = [new Mode(2900 + r() * 400, 0.012, sr, 1), new Mode(4700, 0.008, sr, 0.6)];
      const pop = new Biquad("lowpass", 250, 0.7, sr);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr, w = r() * 2 - 1;
        const hit = close ? Math.exp(-t * 400) * w * 1.5 : Math.exp(-t * 900) * w * 0.4;
        const l1 = t > 0.004 ? Math.exp(-(t - 0.004) * 2500) * w : 0, l2 = close && t > 0.019 ? Math.exp(-(t - 0.019) * 3000) * w * 0.6 : 0;
        let y = 0; for (const m of modes) y += m.run(hit); for (const m of latch) y += m.run(l1 + l2);
        const seal = close ? 0 : pop.run(w) * Math.exp(-Math.max(0, t - 0.03) * 40) * (t > 0.03 ? 1 : 0) * 2;
        const rattle = close && t > 0.03 && t < 0.15 ? w * 0.04 * Math.exp(-(t - 0.03) * 30) * (Math.sin(t * 2 * Math.PI * 37) > 0.6 ? 1 : 0.2) : 0;
        d[i] = y * 2 + seal + rattle;
      }
    }, { seed: seed + (close ? 5 : 0), peak: 0.8 }));
  }
  horn(len) { return (this.c["h" + len] ??= hornBuffer(this.ctx, len, 17 + Math.round(len * 10))); }
}

const IDLE = { petrol: 780, diesel: 760 };
const RATIOS = [500, 325, 230, 170, 130];      // rpm per m/s per gear (slop-newyork sedan)

// A car voice. The source supplies speed (m/s), load (0..1 throttle, <0 = braking), surface, kind, and
// optional rpm (manual). Doppler comes from the emitter's delay line, so the voice itself is unshifted.
export function createCarVoice(ctx, bank, out, src, now) {
  const kind = src.kind || "petrol", eng = bank.engine(kind);
  const nodes = [], sources = [];
  const own = (n) => (nodes.push(n), n);
  const loop = (buf, rate = 1, off = Math.random()) => { const s = own(loopSource(ctx, buf, rate, off * buf.duration)); sources.push(s); return s; };
  const mix = own(makeGain(ctx, 1)); mix.connect(out);
  const ratio = eng.highExhaust.duration / eng.exhaust.duration;
  const ex = loop(eng.exhaust), exHi = loop(eng.highExhaust, ratio);
  const gLo = own(makeGain(ctx, 1)), gHi = own(makeGain(ctx, 0));
  const exF = own(makeFilter(ctx, "lowpass", 600, 0.65)), exG = own(makeGain(ctx, 0));
  ex.connect(gLo).connect(exF); exHi.connect(gHi).connect(exF); exF.connect(exG).connect(mix);
  const mech = loop(eng.mechanical), mechF = own(makeFilter(ctx, "bandpass", 1700, 0.45)), mechG = own(makeGain(ctx, 0));
  mech.connect(mechF).connect(mechG).connect(mix);
  const road = loop(bank.pink()), roadHP = own(makeFilter(ctx, "highpass", 200, 0.5)), roadBP = own(makeFilter(ctx, "peaking", 900, 0.9, 6)), roadLP = own(makeFilter(ctx, "lowpass", 3500, 0.5)), roadG = own(makeGain(ctx, 0));
  road.connect(roadHP).connect(roadBP).connect(roadLP).connect(roadG).connect(mix);
  const s4 = loop(bank.setts(4)), s12 = loop(bank.setts(12)), s4G = own(makeGain(ctx, 0)), s12G = own(makeGain(ctx, 0));
  s4.connect(s4G).connect(mix); s12.connect(s12G).connect(mix);
  const sq = own(ctx.createOscillator()); sq.frequency.value = 3100 + Math.random() * 900; sources.push(sq); sq.start(now);
  const vib = own(ctx.createOscillator()); vib.frequency.value = 7; const vibG = own(makeGain(ctx, 25)); vib.connect(vibG).connect(sq.frequency); sources.push(vib); vib.start(now);
  const sqG = own(makeGain(ctx, 0)); sq.connect(sqG).connect(mix);
  const P = {
    exRate: smoothParam(ex.playbackRate, 0.035, 5e-4), exHiRate: smoothParam(exHi.playbackRate, 0.035, 5e-4), mechRate: smoothParam(mech.playbackRate, 0.035, 5e-4),
    lo: smoothParam(gLo.gain, 0.07), hi: smoothParam(gHi.gain, 0.07), exCut: smoothParam(exF.frequency, 0.07, 1), exLev: smoothParam(exG.gain, 0.06),
    mechF: smoothParam(mechF.frequency, 0.12, 1), mechLev: smoothParam(mechG.gain, 0.09),
    road: smoothParam(roadG.gain, 0.15), roadF: smoothParam(roadBP.frequency, 0.2, 1), s4: smoothParam(s4G.gain, 0.12), s12: smoothParam(s12G.gain, 0.12),
    s4r: smoothParam(s4.playbackRate, 0.1, 1e-3), s12r: smoothParam(s12.playbackRate, 0.1, 1e-3), sq: smoothParam(sqG.gain, 0.05),
  };
  let gear = 0, rpm = IDLE[kind], thr = 0, last = -1, lock = 0, squealUntil = 0;
  return {
    update(t, s) {
      const dt = last < 0 ? 0.1 : clamp(t - last, 0, 0.5); last = t;
      const speed = Math.abs(s.speed || 0), load = s.load || 0, idle = IDLE[kind];
      const th = Math.max(0, load);
      thr += (th - thr) * (1 - Math.exp(-dt / (th > thr ? 0.14 : 0.32)));
      const shift = 2000 + thr * 1600;              // city driving: shift at ~2.0-3.6k rpm
      if (speed < 0.6) gear = 0;
      else if (t >= lock) {
        const g0 = gear;
        if (gear < 4 && speed * RATIOS[gear] > shift) gear++;
        else if (gear > 0 && speed * RATIOS[gear - 1] < shift * 0.82 && speed * RATIOS[gear] < 1600) gear--;
        if (gear !== g0) lock = t + 0.65;
      }
      const slip = thr * 1500 * Math.max(0.12, 1 - speed / 16);
      let target = clamp(Math.max(idle, speed * RATIOS[gear]) + slip, idle, 6200);
      if (s.rpm > 0) target = s.rpm;                    // manual (panel)
      rpm += (target - rpm) * (1 - Math.exp(-dt / (target > rpm ? 0.12 : 0.075)));
      s.rpmOut = rpm; s.gearOut = gear + 1;
      const r = rpm / eng.referenceRPM, eff = s.rpm > 0 ? th : Math.min(1, thr + speed * 0.005);
      P.exRate(r, t); P.exHiRate(r * ratio, t); P.mechRate(r, t);
      const bank = clamp((rpm - eng.referenceRPM) / (eng.highReferenceRPM - eng.referenceRPM)), b = bank * bank * (3 - 2 * bank);
      P.lo(Math.cos(b * Math.PI / 2), t); P.hi(Math.sin(b * Math.PI / 2), t);
      P.exCut(650 + rpm * 0.24 + eff * 1800, t); P.exLev((0.11 + eff * 0.26) * (s.engineGain ?? 1), t);
      P.mechF(1250 + rpm * 0.12, t); P.mechLev((kind === "diesel" ? 0.06 : 0.03) + eff * 0.085, t);
      // Tyres.
      const surf = s.surface || "asphalt", v = speed;
      const roll = Math.pow(clamp(v / 14, 0, 1.6), 1.5) * 0.12;
      P.road(roll * (surf === "setts" ? 2.5 : surf === "concrete" ? 1.4 : 1) * (s.tyreGain ?? 1), t);
      P.roadF(surf === "setts" ? 650 : 900 + v * 15, t);
      const sv = surf === "setts" ? clamp(v / 2) : 0, mixHi = clamp((v - 4) / 8);
      P.s4(sv * (1 - mixHi) * 0.35 * (s.tyreGain ?? 1), t); P.s12(sv * mixHi * 0.5 * (s.tyreGain ?? 1), t);
      P.s4r(Math.max(0.05, v / 4), t); P.s12r(Math.max(0.05, v / 12), t);
      // Brake squeal: braking hard-ish under 4 m/s, sometimes (worn pads).
      if (load < -0.3 && v > 0.4 && v < 4 && t > squealUntil && (s.seed * 1000) % 1 < (s.squeal ?? 0.5)) squealUntil = t + 0.4 + v * 0.3;
      P.sq(t < squealUntil && v > 0.3 ? 0.03 : 0, t);
    },
    dispose(when) { for (const s of sources) { try { s.stop(when + 0.05); } catch { /* already stopped */ } } sources[0].onended = () => { for (const n of nodes) n.disconnect(); }; },
  };
}

export function playDoor(ctx, bank, out, when, close = true, seed = 0) { return playBuffer(ctx, bank.door(close, seed % 3), out, when, { gain: 0.9 }); }
export function playHorn(ctx, bank, out, when, len = 0.37) { return playBuffer(ctx, bank.horn(len), out, when, { gain: 0.8 }); }
