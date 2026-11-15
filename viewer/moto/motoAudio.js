// THE MOTORBIKE'S SOUND: all procedural Web Audio, no files (as the falcon's, viewer/falconFlight/falconAudio.js, and
// the sound lab's engines, viewer/audio/vehicles.js; the city has no shared audio bus yet: this owns one small context).
//   engine   an inline four: it fires twice per crank turn, so the firing order is rpm / 30 Hz (45 Hz at idle,
//            390 Hz at the redline); one periodic wave on HALF that (the half orders give the four its rasp), two
//            detuned voices, a soft clipper driven by the throttle, a low-pass that opens with rpm and load, an
//            induction howl (a band-pass on the 4th-6th firing harmonics, up with the throttle at high rpm)
//   shifts   a short drive cut (the gain dips 60 ms) and a click; downshifts blip
//   overrun  throttle shut above 6,500 rpm: crackles and pops from the exhaust for ~0.7 s
//   wind     noise through a low-pass opening with speed; tyres: a screech in a slide; crash: a thump + scrape
// Starts on the first key / click while the bike is active (browsers need a gesture). N mutes.
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export class MotoAudio {
  constructor() {
    this.ctx = null; this.muted = false; this.volume = 0.55; this.active = false;
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
    const amp = { 1: 0.55, 2: 1.0, 3: 0.32, 4: 0.62, 5: 0.18, 6: 0.36, 7: 0.1, 8: 0.24, 10: 0.12, 12: 0.08, 14: 0.05, 16: 0.04 };
    for (let k = 1; k <= H; k++) im[k] = amp[k] || 0.02;
    const wave = ctx.createPeriodicWave(re, im);
    this.oscA = ctx.createOscillator(); this.oscA.setPeriodicWave(wave);
    this.oscB = ctx.createOscillator(); this.oscB.setPeriodicWave(wave); this.oscB.detune.value = 11;
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
    const fire = rpm / 30;                                     // firing frequency (Hz)
    this.oscA.frequency.setTargetAtTime(fire / 2, t, tc);
    this.oscB.frequency.setTargetAtTime(fire / 2, t, tc);
    const load = clamp(thr * 0.85 + (c.boost ? 0.15 : 0), 0, 1);
    const drive = 1.2 + load * 2.6 + rpm / 12000;
    if (Math.abs(drive - this._drive) > 0.25) this.setDrive(drive);
    this.engLP.frequency.setTargetAtTime(380 + rpm * 0.32 + load * 2600, t, tc);
    // the shift cut: a dip, a click
    let cut = 1;
    if (c.shifts !== this.lastShifts) {
      const up = c.throttle > 0.2;
      this.lastShifts = c.shifts;
      this.engGain.gain.cancelScheduledValues(t);
      this.engGain.gain.setValueAtTime(this.engGain.gain.value, t);
      this.engGain.gain.linearRampToValueAtTime(up ? 0.05 : 0.5, t + 0.02);
      this.burst(t, { f: 2600, type: "bandpass", q: 2, dur: 0.035, gain: 0.12 });
      if (!up) this.burst(t + 0.02, { f: 600, dur: 0.12, gain: 0.25 });      // the blip on a downshift
      cut = 0;
    }
    if (cut) this.engGain.gain.setTargetAtTime(0.16 + load * 0.3 + rpm / 12000 * 0.12, t, 0.05);
    this.howl.frequency.setTargetAtTime(fire * 5, t, tc);
    this.howlGain.gain.setTargetAtTime(load * clamp((rpm - 5000) / 6000, 0, 1) * 0.22, t, 0.06);
    this.mechGain.gain.setTargetAtTime(0.012 + rpm / 12000 * 0.03, t, 0.1);
    // overrun crackle
    if (this.prevThrottle > 0.5 && thr < 0.1 && rpm > 6500) this.popUntil = t + 0.75;
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
  stop() { this.active = false; if (this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); }
  toggleMute() { this.muted = !this.muted; if (!this.muted && !this.ctx && this.active) this.init(); return this.muted; }
}
