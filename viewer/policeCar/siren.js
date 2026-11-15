// THE BELGIAN TWO-TONE SIREN ("pin-pon", "deux tons" / "tweetonig"), procedural, Web Audio. No audio files.
//
// What it must sound like (sources, docs/POLICE_CAR.md):
//  - Ministerial circular of 9 July 2013 (FOD Binnenlandse Zaken, B.S. 26.07.2013) on the special sound devices of the
//    priority vehicles: an electronic device has "2 alternating tones, linked to each other": HIGH 495 Hz (+-5),
//    LOW 440 Hz (+-5), a cycle of the two tones (equal durations) 25 to 30 times per minute; day >= 110 dB(A) at 3.5 m,
//    night device 95 dB(A) +-5 (used 22:00-06:00). (The circular is written for the fire services and civil
//    protection: police cars use the same "deux tons"; no separate police figure was found.)
//  - Brussels-Capital Region decree of 23 November 2023 on special warning devices (applies to police, ambulances,
//    ... registered in Brussels): tones within 350-560 Hz, the two tones alternating with equal duration, 25-30
//    cycles per minute, max 100 dB(A) day / 90 dB(A) night at 7 m; PNEUMATIC devices banned from 20 January 2028.
//  - The pneumatic two-tone (NBN 549, the old "compresseur" horns) is still offered as an option: two air trumpets
//    switched by a valve, a reedy, brassy timbre and a short pitch rise at each tone onset (the air pressure builds).
// So the default here: ELECTRONIC, 495 / 440 Hz, 27 cycles per minute (1.11 s per tone), linked (a 25 ms glide),
// day level; "night" = -15 dB (110 -> 95 dB(A)).
//
// The electronic voice: an amplifier's square-ish wave with rounded edges (a PeriodicWave, odd harmonics rolled off)
// through the horn speaker (high-pass ~380 Hz: the driver; a resonance near 1.6 kHz: the horn; low-pass 5 kHz) and
// a little saturation. The tone changes are SCHEDULED on the audio clock (update() keeps ~0.5 s scheduled ahead), so a
// slow frame never stretches a tone; an OfflineAudioContext renders the very same graph (renderSiren below).
// Doppler: one AudioParam (detune, cents) on every oscillator, set from dopplerFactor(): the player in the car hears
// 1.0; another listener (a pedestrian, a car it passes: later, with the traffic / sound branches) hears the shift.
import { setControlRate } from "../../vendor/slop-sound/audio-synthesis.js";

export const SIREN = {
  mode: "electronic",         // "electronic" | "pneumatic"
  high: 495, low: 440,        // Hz (circular 2013)
  perMinute: 27,              // cycles of the two tones per minute (25-30)
  glide: 0.025,               // s, "linked" tones: the electronic device glides between them
  night: false,               // the night device: -15 dB
  level: 0.32,                // gain at the mix (day)
};
const C = 343;                // m/s

/** Doppler factor for a source moving with velocity vs and a listener with vl (both {x, z} m/s), from source to listener */
export function dopplerFactor(src, lis, vs, vl) {
  const dx = lis.x - src.x, dz = lis.z - src.z, d = Math.hypot(dx, dz) || 1;
  const ux = dx / d, uz = dz / d;
  const vS = vs.x * ux + vs.z * uz, vL = vl.x * ux + vl.z * uz;       // components along source -> listener
  return (C - vL) / Math.max(1, C - vS);
}

function squareWave(ctx) {
  // a band-limited square with soft edges: odd harmonics 1/n x a gentle roll-off (the amplifier + driver)
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let h = 1; h < n; h += 2) im[h] = (1 / h) * Math.exp(-h / 14);
  // a touch of even harmonics (the push-pull stage is not perfect)
  for (let h = 2; h < n; h += 2) im[h] = (0.05 / h) * Math.exp(-h / 10);
  return ctx.createPeriodicWave(re, im);
}
function reedWave(ctx) {
  // air trumpet: a reed's pulse (all harmonics, strong 2nd-5th), the flare boosts the mid
  const n = 40, re = new Float32Array(n), im = new Float32Array(n);
  for (let h = 1; h < n; h++) { const f = h * 470; im[h] = (1 / Math.pow(h, 0.85)) * (1 + 1.4 * Math.exp(-Math.pow((f - 1900) / 900, 2))) * Math.exp(-h / 22); }
  return ctx.createPeriodicWave(re, im);
}
function saturator(ctx, k = 1.6) {
  const sh = ctx.createWaveShaper(), N = 1024, curve = new Float32Array(N);
  for (let i = 0; i < N; i++) { const x = (i / (N - 1)) * 2 - 1; curve[i] = Math.tanh(k * x) / Math.tanh(k); }
  sh.curve = curve; sh.oversample = "2x";
  return sh;
}

export class Siren {
  /** ctx: AudioContext or OfflineAudioContext; out: the node it plays into; opts: SIREN fields */
  constructor(ctx, out, opts = {}) {
    this.ctx = ctx; this.o = { ...SIREN, ...opts };
    const g = (v = 0) => { const n = ctx.createGain(); n.gain.value = v; return n; };
    const f = (type, freq, q = 0.7, gain = 0) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = freq; n.Q.value = q; n.gain.value = gain; setControlRate(n.frequency, n.Q, n.gain); return n; };
    this.env = g(0);                                   // on / off envelope x level
    this.env.connect(out);
    // electronic: one oscillator, the horn speaker chain
    this.osc = ctx.createOscillator(); this.osc.setPeriodicWave(squareWave(ctx)); this.osc.frequency.value = this.o.high;
    const hp = f("highpass", 380, 0.8), body = f("peaking", 1600, 1.3, 5), lp = f("lowpass", 5000, 0.6), sat = saturator(ctx, 1.4);
    this.eGain = g(1);
    this.osc.connect(hp).connect(body).connect(sat).connect(lp).connect(this.eGain).connect(this.env);
    // pneumatic: two trumpets (high, low) switched by a valve; a breath of air noise
    this.tA = ctx.createOscillator(); this.tA.setPeriodicWave(reedWave(ctx)); this.tA.frequency.value = this.o.high;
    this.tB = ctx.createOscillator(); this.tB.setPeriodicWave(reedWave(ctx)); this.tB.frequency.value = this.o.low;
    this.gA = g(0); this.gB = g(0);
    const flare = f("peaking", 1900, 1.0, 4), plp = f("lowpass", 6500, 0.7), phl = f("highpass", 300, 0.7);
    this.pGain = g(0);
    this.tA.connect(this.gA).connect(phl); this.tB.connect(this.gB).connect(phl);
    phl.connect(flare).connect(plp).connect(this.pGain).connect(this.env);
    this.oscs = [this.osc, this.tA, this.tB];
    this.on = false; this.next = 0; this.high = true; this.started = false;
  }
  _start(t) { if (!this.started) { for (const o of this.oscs) o.start(t); this.started = true; } }
  get half() { return 60 / this.o.perMinute / 2; }
  /** switch on at audio time t (the first tone is the HIGH one) */
  start(t = this.ctx.currentTime) {
    this._start(t);
    const e = this.env.gain, lev = this.o.level * (this.o.night ? 0.178 : 1);       // -15 dB at night
    e.cancelScheduledValues(t); e.setValueAtTime(e.value, t); e.setTargetAtTime(lev, t, 0.012);
    const pn = this.o.mode === "pneumatic";
    this.eGain.gain.setValueAtTime(pn ? 0 : 1, t); this.pGain.gain.setValueAtTime(pn ? 0.55 : 0, t);
    this.on = true; this.next = t; this.high = true;
    this.schedule(t + 0.5);
  }
  /** switch off: the amplifier stops at once (a short release); a pneumatic horn sighs out over ~0.3 s */
  stop(t = this.ctx.currentTime) {
    if (!this.on) return;
    const e = this.env.gain;
    e.cancelScheduledValues(t); e.setValueAtTime(e.value, t); e.setTargetAtTime(0, t, this.o.mode === "pneumatic" ? 0.09 : 0.02);
    for (const p of [this.osc.frequency, this.tA.frequency, this.tB.frequency, this.gA.gain, this.gB.gain]) p.cancelScheduledValues(t + 0.4);
    this.on = false;
  }
  /** schedule the tone changes up to audio time tEnd */
  schedule(tEnd) {
    if (!this.on) return;
    const { high, low, glide } = this.o, pn = this.o.mode === "pneumatic";
    while (this.next < tEnd) {
      const t = this.next, fq = this.high ? high : low;
      if (!pn) this.osc.frequency.setTargetAtTime(fq, t, glide / 3);          // ~95 % of the way in the glide time
      else {
        const [on, off, osc] = this.high ? [this.gA, this.gB, this.tA] : [this.gB, this.gA, this.tB];
        // the valve: the other trumpet dies in ~40 ms, this one speaks in ~25 ms, rising from -60 cents to pitch
        on.gain.setTargetAtTime(1, t, 0.012); off.gain.setTargetAtTime(0, t, 0.02);
        osc.frequency.setValueAtTime(fq * 0.966, t); osc.frequency.setTargetAtTime(fq, t, 0.045);
      }
      this.high = !this.high; this.next = t + this.half;
    }
  }
  /** every frame (or at 10 Hz): keep it scheduled, set the Doppler factor (1 = the player in the car) */
  update(t = this.ctx.currentTime, doppler = 1) {
    if (this.on) this.schedule(t + 0.5);
    const cents = 1200 * Math.log2(doppler);
    for (const o of this.oscs) o.detune.setTargetAtTime(cents, t, 0.05);
  }
  set(opts) { Object.assign(this.o, opts); if (this.on) { const t = this.ctx.currentTime; this.stop(t); this.start(t + 0.03); } }
}

// ------------------------------------------------------------------------------------------------ offline renders
/** 16-bit PCM WAV from Float32 channels */
export function encodeWav(channels, sampleRate) {
  const n = channels[0].length, nc = channels.length, buf = new ArrayBuffer(44 + n * nc * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * nc * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, nc, true); v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * nc * 2, true); v.setUint16(32, nc * 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, n * nc * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) { const s = Math.max(-1, Math.min(1, channels[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return new Blob([buf], { type: "audio/wav" });
}

/**
 * Render the siren offline. scene:
 *   "incar"   the siren on for `seconds` (what the driver hears, no Doppler), optional engine: fn(ctx, out) -> stop()
 *   "passby"  a listener on the pavement 6 m from the lane, the car passing at `speed` m/s: Doppler (the propagation
 *             delay of a moving source), 1/r spreading, air absorption, the ground reflection ignored
 *   gain: master gain (the listening renders are brought up to a usable level; night vs day keep their ratio)
 *   extra(ctx, out, seconds): more sources in the same render (the engine: labs/police-car-common.js)
 * -> { blob, buffer, peak }
 */
export async function renderSiren({ scene = "incar", seconds = 8, opts = {}, speed = 16.7, lateral = 6, sampleRate = 44100, extra = null, gain = 1, sirenAt = 0.25 } = {}) {
  const ctx = new OfflineAudioContext(1, Math.round(seconds * sampleRate), sampleRate);
  const master = ctx.createGain(); master.gain.value = gain;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
  master.connect(comp).connect(ctx.destination);
  let siren;
  if (scene === "passby") {
    // the source's path x(t) = speed (t - T/2); the sound emitted at te reaches the listener at te + r(te)/c: a delay
    // line whose delay follows r(t) / c gives the Doppler shift exactly as a real pass-by (to first order)
    const dist = ctx.createGain(), delay = ctx.createDelay(1.0), air = ctx.createBiquadFilter();
    air.type = "lowpass";
    siren = new Siren(ctx, dist, { ...opts, level: 1 });
    dist.connect(delay).connect(air).connect(master);
    const N = Math.ceil(seconds * 50), dl = new Float32Array(N), gn = new Float32Array(N), cut = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const t = (i / (N - 1)) * seconds, x = speed * (t - seconds / 2), r = Math.hypot(x, lateral, 1.2);
      dl[i] = r / C; gn[i] = Math.min(1, 7 / r) * 0.55; cut[i] = Math.max(1800, 16000 - r * 90);
    }
    delay.delayTime.setValueCurveAtTime(dl, 0, seconds);
    dist.gain.setValueCurveAtTime(gn, 0, seconds);
    air.frequency.setValueCurveAtTime(cut, 0, seconds);
  } else {
    siren = new Siren(ctx, master, opts);
  }
  const stopExtra = extra ? extra(ctx, master, seconds) : null;
  siren.start(sirenAt);
  siren.schedule(seconds + 1);
  if (scene === "incar") siren.stop(seconds - 0.6);
  const buffer = await ctx.startRendering();
  stopExtra?.();
  const d = buffer.getChannelData(0);
  let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  const k = peak > 0.98 ? 0.98 / peak : 1; if (k !== 1) for (let i = 0; i < d.length; i++) d[i] *= k;
  return { blob: encodeWav([d], sampleRate), buffer, peak };
}
