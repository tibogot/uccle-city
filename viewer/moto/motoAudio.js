// THE MOTORBIKE'S SOUND: all procedural Web Audio, no files (as the falcon's, viewer/falconFlight/falconAudio.js, and
// the sound lab's engines, viewer/audio/vehicles.js; the city has no shared audio bus yet: this owns one small context).
//   engine   an inline four: it fires twice per crank turn, so the firing order is rpm / 30 Hz (45 Hz at idle,
//            390 Hz at the redline); one periodic wave on HALF that (the half orders give the four its rasp), two
//            detuned voices, a soft clipper driven by the throttle, a low-pass that opens with rpm and load, an
//            induction howl (a band-pass on the 4th-6th firing harmonics, up with the throttle at high rpm)
//   shifts   a short drive cut (the gain dips 60 ms) and a click; downshifts blip
//   overrun  throttle shut above 6,500 rpm: crackles and pops from the exhaust for ~0.7 s
//   wind     noise through a low-pass opening with speed; tyres: a screech in a slide; crash: a thump + scrape
// OFF by default (owner 2026-11-15: annoying while working): ?motosound=1 or the dev panel's "motorbike sound" toggle
// turns it on; then it starts on the first key / click while the bike is active (browsers need a gesture). N mutes.
// Round 2: VOICES per engine (the scooter: a 125 cc four-stroke SINGLE: it fires once every two crank turns, rpm / 120 Hz
// (55 Hz held on the CVT): a thumping fundamental with strong low harmonics, a muffled can, no shifts, no overrun pops).
// BikeAudio below: the Villo (no engine): tyre hum, the freewheel's pawls ticking when coasting, the chain while
// pedalling, wind, a roller-brake hiss, and the BELL (Q): two strikes of an inharmonic ding (partials 1 : 2.76 : 5.4).
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

/** engine voices: firing frequency = rpm / div; the oscillators run at fire x mul; amp: harmonic amplitudes */
export const VOICES = {
  four: { div: 30, mul: 0.5, amp: { 1: 0.55, 2: 1.0, 3: 0.32, 4: 0.62, 5: 0.18, 6: 0.36, 7: 0.1, 8: 0.24, 10: 0.12, 12: 0.08, 14: 0.05, 16: 0.04 },
    lp: [380, 0.32, 2600], howl: 0.22, pops: true, shifts: true, detune: 11, gain: 1 },
  single: { div: 120, mul: 1, amp: { 1: 1.0, 2: 0.7, 3: 0.45, 4: 0.3, 5: 0.22, 6: 0.15, 7: 0.1, 8: 0.08, 9: 0.05, 10: 0.04, 12: 0.03 },
    lp: [260, 0.18, 1200], howl: 0.05, pops: false, shifts: false, detune: 6, gain: 0.9 },
};

export class MotoAudio {
  constructor(voice = VOICES.four) {
    this.voice = voice;
    this.ctx = null; this.volume = 0.55; this.active = false;
    this.muted = !/[?&]motosound=1/.test(location.search);      // (off by default)
    this.lastShifts = 0; this.lastCrashes = 0; this.popUntil = 0; this.nextPop = 0; this.prevThrottle = 0;
    const start = () => { if (!this.ctx && this.active && !this.muted) this.init(); else if (this.ctx?.state === "suspended" && this.active) this.ctx.resume(); };
    addEventListener("pointerdown", start); addEventListener("keydown", start);
  }

  init() {
    const ctx = this.ctx = new AudioContext();
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
    // noise (2 s, stereo-decorrelated mono)
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    const loop = (rate = 1) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.start(); return s; };
    // ---- engine: periodic wave on half the firing frequency
    const H = 16, re = new Float32Array(H + 1), im = new Float32Array(H + 1);
    const amp = this.voice.amp;
    for (let k = 1; k <= H; k++) im[k] = amp[k] || 0.02;
    const wave = ctx.createPeriodicWave(re, im);
    this.oscA = ctx.createOscillator(); this.oscA.setPeriodicWave(wave);
    this.oscB = ctx.createOscillator(); this.oscB.setPeriodicWave(wave); this.oscB.detune.value = this.voice.detune;
    const gA = ctx.createGain(); gA.gain.value = 0.6; const gB = ctx.createGain(); gB.gain.value = 0.4;
    this.shaper = ctx.createWaveShaper(); this.setDrive(1.5);
    this.engLP = ctx.createBiquadFilter(); this.engLP.type = "lowpass"; this.engLP.Q.value = 0.9;
    this.engGain = ctx.createGain(); this.engGain.gain.value = 0.0;
    this.oscA.connect(gA).connect(this.shaper); this.oscB.connect(gB).connect(this.shaper);
    this.shaper.connect(this.engLP).connect(this.engGain).connect(this.master);
    // induction howl
    this.howl = ctx.createBiquadFilter(); this.howl.type = "bandpass"; this.howl.Q.value = 3;
    this.howlGain = ctx.createGain(); this.howlGain.gain.value = 0;
    this.shaper.connect(this.howl).connect(this.howlGain).connect(this.master);
    // mechanical rustle (valvetrain / chain)
    this.mech = ctx.createBiquadFilter(); this.mech.type = "bandpass"; this.mech.frequency.value = 3200; this.mech.Q.value = 0.8;
    this.mechGain = ctx.createGain(); this.mechGain.gain.value = 0;
    loop(1).connect(this.mech).connect(this.mechGain).connect(this.master);
    // wind
    this.wind = ctx.createBiquadFilter(); this.wind.type = "lowpass"; this.wind.Q.value = 0.5;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    loop(0.83).connect(this.wind).connect(this.windGain).connect(this.master);
    // tyre screech
    this.tyre = ctx.createBiquadFilter(); this.tyre.type = "bandpass"; this.tyre.frequency.value = 1350; this.tyre.Q.value = 6;
    this.tyreGain = ctx.createGain(); this.tyreGain.gain.value = 0;
    loop(1.21).connect(this.tyre).connect(this.tyreGain).connect(this.master);
    this.oscA.start(); this.oscB.start();
  }

  /** the clipper's drive (1..5): one of 12 curves made once (no allocation while riding) */
  setDrive(k) {
    if (!this.curves) {
      this.curves = [];
      for (let j = 0; j < 12; j++) {
        const kk = 1 + j * (4 / 11), n = 1024, c = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * kk) / Math.tanh(kk); }
        this.curves.push(c);
      }
    }
    const j = Math.max(0, Math.min(11, Math.round((k - 1) * 11 / 4)));
    if (j !== this._j) { this.shaper.curve = this.curves[j]; this._j = j; }
    this._drive = k;
  }

  burst(when, { f = 700, q = 1, dur = 0.05, gain = 0.3, type = "lowpass", rate = 1 } = {}) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = rate;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(gain, when + 0.004); g.gain.exponentialRampToValueAtTime(0.0005, when + dur);
    s.connect(fl).connect(g).connect(this.master);
    s.start(when, Math.random() * 1.5, dur + 0.05);
    s.onended = () => { s.disconnect(); fl.disconnect(); g.disconnect(); };
  }

  /** once a frame: c = motoPhysics state (rpm, gear, throttle, speed, slide, crashes, shifts) */
  update(c, dt) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime, tc = 0.03;
    const on = this.active && !this.muted ? 1 : 0;
    this.master.gain.setTargetAtTime(this.volume * on, t, 0.08);
    if (!on) return;
    const rpm = clamp(c.rpm, 600, 12500), thr = c.crashed ? 0 : c.throttle, v = Math.abs(c.speed);
    const V = this.voice, fire = rpm / V.div;                  // firing frequency (Hz)
    this.oscA.frequency.setTargetAtTime(fire * V.mul, t, tc);
    this.oscB.frequency.setTargetAtTime(fire * V.mul, t, tc);
    const load = clamp(thr * 0.85 + (c.boost ? 0.15 : 0), 0, 1);
    const drive = 1.2 + load * 2.6 + rpm / 12000;
    if (Math.abs(drive - this._drive) > 0.25) this.setDrive(drive);
    this.engLP.frequency.setTargetAtTime(V.lp[0] + rpm * V.lp[1] + load * V.lp[2], t, tc);
    // the shift cut: a dip, a click
    let cut = 1;
    if (V.shifts && c.shifts !== this.lastShifts) {
      const up = c.throttle > 0.2;
      this.lastShifts = c.shifts;
      this.engGain.gain.cancelScheduledValues(t);
      this.engGain.gain.setValueAtTime(this.engGain.gain.value, t);
      this.engGain.gain.linearRampToValueAtTime(up ? 0.05 : 0.5, t + 0.02);
      this.burst(t, { f: 2600, type: "bandpass", q: 2, dur: 0.035, gain: 0.12 });
      if (!up) this.burst(t + 0.02, { f: 600, dur: 0.12, gain: 0.25 });      // the blip on a downshift
      cut = 0;
    }
    if (cut) this.engGain.gain.setTargetAtTime((0.16 + load * 0.3 + rpm / 12000 * 0.12) * V.gain, t, 0.05);
    this.howl.frequency.setTargetAtTime(fire * 5, t, tc);
    this.howlGain.gain.setTargetAtTime(load * clamp((rpm - 5000) / 6000, 0, 1) * V.howl, t, 0.06);
    this.mechGain.gain.setTargetAtTime(0.012 + rpm / 12000 * 0.03, t, 0.1);
    // overrun crackle
    if (V.pops && this.prevThrottle > 0.5 && thr < 0.1 && rpm > 6500) this.popUntil = t + 0.75;
    this.prevThrottle = thr;
    if (t < this.popUntil && t >= this.nextPop) {
      this.burst(t, { f: 500 + Math.random() * 900, dur: 0.03 + Math.random() * 0.05, gain: 0.25 + Math.random() * 0.35 });
      this.nextPop = t + 0.03 + Math.random() * 0.11;
    }
    // wind, tyres
    const w = clamp(v / 60, 0, 1.3);
    this.wind.frequency.setTargetAtTime(250 + w * 2600, t, 0.2);
    this.windGain.gain.setTargetAtTime(w * w * 0.32, t, 0.2);
    const sl = (c.slide || 0) * clamp(v / 10, 0, 1) + (c.crashed && v > 1 ? 0.5 : 0);
    this.tyre.frequency.setTargetAtTime(c.crashed ? 2400 : 1300 + v * 8, t, 0.05);
    this.tyre.Q.value = c.crashed ? 1.2 : 6;
    this.tyreGain.gain.setTargetAtTime(clamp(sl, 0, 1) * 0.28, t, 0.05);
    // the crash thump
    if (c.crashes !== this.lastCrashes) {
      this.lastCrashes = c.crashes;
      this.burst(t, { f: 160, dur: 0.5, gain: 0.9 }); this.burst(t + 0.05, { f: 900, dur: 0.25, gain: 0.5 });
    }
  }
  stop() { this.active = false; if (this.ctx) { this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); setTimeout(() => { if (!this.active) this.ctx.suspend(); }, 200); } }
  toggleMute() { return this.setMuted(!this.muted); }
  /** on / off: off suspends the audio context (nothing runs on the audio thread) */
  setMuted(m) {
    this.muted = m;
    if (!m && !this.ctx && this.active) this.init();
    if (this.ctx) { if (m) this.ctx.suspend(); else if (this.active) this.ctx.resume(); }
    return m;
  }
}

/**
 * THE VILLO'S SOUND (no engine): all procedural, OFF by default like the motorbike's (?motosound=1, the dev panel's
 * "two-wheeler sound", N). update(c) once a frame (c = motoPhysics state: speed, pedal, braking, crashes); bell() rings it.
 */
export class BikeAudio {
  constructor() {
    this.ctx = null; this.volume = 0.6; this.active = false;
    this.muted = !/[?&]motosound=1/.test(location.search);
    this.lastCrashes = 0; this.tickAt = 0;
    const start = () => { if (!this.ctx && this.active && !this.muted) this.init(); else if (this.ctx?.state === "suspended" && this.active) this.ctx.resume(); };
    addEventListener("pointerdown", start); addEventListener("keydown", start);
  }
  init() {
    const ctx = this.ctx = new AudioContext();
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    const loop = (rate) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.start(); return s; };
    const band = (type, f, q, rate) => { const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; loop(rate).connect(fl).connect(g).connect(this.master); return { fl, g }; };
    this.tyre = band("bandpass", 380, 1.4, 0.9);       // tyre hum on the road
    this.wind = band("lowpass", 400, 0.5, 0.77);
    this.chain = band("bandpass", 2600, 2.5, 1.13);    // the chain over the sprockets while pedalling
    this.hiss = band("bandpass", 3400, 4, 1.31);       // roller brake
  }
  click(when, gain) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noise;
    const fl = ctx.createBiquadFilter(); fl.type = "bandpass"; fl.frequency.value = 4200; fl.Q.value = 6;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, when); g.gain.exponentialRampToValueAtTime(0.0005, when + 0.012);
    s.connect(fl).connect(g).connect(this.master); s.start(when, Math.random(), 0.02);
    s.onended = () => { s.disconnect(); fl.disconnect(); g.disconnect(); };
  }
  /** ding-ding: two strikes of a small dome bell (partials 1 : 2.76 : 5.4 of ~2.35 kHz, ~1 s ring) */
  bell() {
    if (!this.ctx || this.muted || !this.active) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    for (const [dt, a] of [[0, 1], [0.16, 0.8]]) for (const [m, g, dec] of [[1, 0.32, 1.1], [2.76, 0.14, 0.5], [5.4, 0.06, 0.25]]) {
      const o = ctx.createOscillator(); o.frequency.value = 2350 * m * (1 + (Math.random() - 0.5) * 0.002);
      const e = ctx.createGain(); e.gain.setValueAtTime(0, t0 + dt); e.gain.linearRampToValueAtTime(g * a, t0 + dt + 0.003); e.gain.exponentialRampToValueAtTime(0.0003, t0 + dt + dec);
      o.connect(e).connect(this.master); o.start(t0 + dt); o.stop(t0 + dt + dec + 0.05);
      o.onended = () => { o.disconnect(); e.disconnect(); };
    }
  }
  update(c, dt) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime, on = this.active && !this.muted ? 1 : 0;
    this.master.gain.setTargetAtTime(this.volume * on, t, 0.08);
    if (!on) return;
    const v = Math.abs(c.speed), w = clamp(v / 12, 0, 1.5), ground = c.crashed ? 0 : 1;
    this.tyre.fl.frequency.setTargetAtTime(180 + v * 45, t, 0.2);
    this.tyre.g.gain.setTargetAtTime(ground * clamp(v / 6, 0, 1) * 0.12, t, 0.15);
    this.wind.fl.frequency.setTargetAtTime(250 + w * 1500, t, 0.2);
    this.wind.g.gain.setTargetAtTime(w * w * 0.25, t, 0.2);
    this.chain.g.gain.setTargetAtTime((c.pedal || 0) * clamp(v / 4, 0, 1) * 0.018, t, 0.1);
    this.hiss.g.gain.setTargetAtTime(c.braking && v > 1 ? clamp(v / 6, 0, 1) * 0.05 : 0, t, 0.05);
    // the freewheel: coasting, the pawls tick ~ 24 times a wheel turn (faster than the ear above ~25 km/h: a buzz)
    if (!(c.pedal > 0.5) && v > 0.5 && !c.crashed) {
      const rate = v / (2 * Math.PI * 0.33) * 24;
      if (this.tickAt < t) this.tickAt = t;
      while (this.tickAt < t + 0.05) { this.click(this.tickAt, 0.05 + Math.min(0.05, 2 / rate)); this.tickAt += 1 / Math.min(rate, 300); }
    }
    if (c.crashes !== this.lastCrashes) {
      this.lastCrashes = c.crashes;
      for (let k = 0; k < 6; k++) this.click(t + k * 0.03 + Math.random() * 0.02, 0.6);
    }
  }
  stop() { this.active = false; if (this.ctx) { this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); setTimeout(() => { if (!this.active) this.ctx.suspend(); }, 200); } }
  toggleMute() { return this.setMuted(!this.muted); }
  setMuted(m) {
    this.muted = m;
    if (!m && !this.ctx && this.active) this.init();
    if (this.ctx) { if (m) this.ctx.suspend(); else if (this.active) this.ctx.resume(); }
    return m;
  }
}
