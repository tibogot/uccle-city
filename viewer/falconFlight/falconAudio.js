// THE FALCON'S SOUND (Falcon Flight Lab): all procedural Web Audio, no files (as slop-newyork and our sound lab on
// branch claude/sound, viewer/audio/ambience.js createWindBed: that one is a stereo wind BED for the street; this is the
// wind a bird hears, driven by its own airspeed, so it is written here rather than copied).
//   wind      looped noise -> a band-pass rising with airspeed (300 Hz gliding .. 2.5 kHz in the stoop) + a hiss layer
//             above 40 m/s + a flutter (the feathers buffeting, 8-16 Hz amplitude wobble) in the tuck; panned with
//             the bank
//   wings     a soft "whump" on each downstroke (band-passed noise, 60 ms)
//   pigeons   the take-off clatter (feral pigeons clap their wings leaving a roof): bursts of short claps at the flock,
//             HRTF-panned, then the whirr of the flock
//   vario     (off by default) a glider's climb beep: faster and higher in rising air
//   strike    a thump and the falcon's "kek-kek-kek" (saw chirps ~2.2 kHz)
// Starts on the first click / key (browsers need a gesture).
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class FalconAudio {
  constructor() {
    this.ctx = null; this.on = true; this.vario = false; this.volume = 0.8;
    const start = () => { if (!this.ctx && this.on) this.init(); };
    addEventListener("pointerdown", start); addEventListener("keydown", start);
    this.varioT = 0;
  }

  init() {
    const ctx = this.ctx = new AudioContext();
    this.master = ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); let b = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.6 + b * 2.5; } }
    this.noise = buf;
    const src = (rate = 1) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.start(); return s; };
    // the wind: body + hiss, through a flutter gain and a panner
    this.pan = ctx.createStereoPanner(); this.pan.connect(this.master);
    this.flutter = ctx.createGain(); this.flutter.connect(this.pan);
    this.windBand = ctx.createBiquadFilter(); this.windBand.type = "bandpass"; this.windBand.Q.value = 0.8;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    src(1).connect(this.windBand).connect(this.windGain).connect(this.flutter);
    this.hiss = ctx.createBiquadFilter(); this.hiss.type = "highpass"; this.hiss.frequency.value = 2400;
    this.hissGain = ctx.createGain(); this.hissGain.gain.value = 0;
    src(1.13).connect(this.hiss).connect(this.hissGain).connect(this.flutter);
    this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 11;
    this.lfoGain = ctx.createGain(); this.lfoGain.gain.value = 0;
    this.lfo.connect(this.lfoGain).connect(this.flutter.gain); this.lfo.start();
    this.flutter.gain.value = 1;
    this.listener = ctx.listener;
  }

  /** a short filtered noise burst (the wingbeat, a clap); out = a node (default the master) */
  burst(when, { f = 500, q = 1.2, dur = 0.06, gain = 0.3, out = null, type = "bandpass" } = {}) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = type; bp.frequency.value = f; bp.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(gain, when + 0.008); g.gain.exponentialRampToValueAtTime(0.0005, when + dur);
    s.connect(bp).connect(g).connect(out || this.master);
    s.start(when, Math.random() * 1.5); s.stop(when + dur + 0.05);
  }

  /** b: { V, phi, fold, lift, downstroke, flapLevel }, cam: the camera (the listener) */
  update(dt, b, cam) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime, V = b.V;
    this.master.gain.setTargetAtTime(this.on ? this.volume : 0, t, 0.1);
    const lvl = clamp((V / 30) ** 1.6, 0.02, 2.2);
    this.windBand.frequency.setTargetAtTime(280 + V * 22, t, 0.08);
    this.windGain.gain.setTargetAtTime(0.16 * lvl, t, 0.08);
    this.hissGain.gain.setTargetAtTime(0.25 * smooth(V, 38, 95), t, 0.1);
    const tuck = smooth(b.fold, 0.6, 1) * smooth(V, 35, 80);
    this.lfo.frequency.setTargetAtTime(8 + V * 0.08, t, 0.2);
    this.lfoGain.gain.setTargetAtTime(0.35 * tuck, t, 0.1);
    this.pan.pan.setTargetAtTime(clamp(-b.phi * 0.35, -0.6, 0.6), t, 0.1);
    if (b.downstroke) { this.burst(t + 0.005, { f: 380 + 120 * Math.random(), q: 0.9, dur: 0.09, gain: 0.22 + 0.25 * b.flapLevel }); }
    // the listener at the camera
    const L = this.listener, p = cam.position, f = cam.getWorldDirection(this._f ??= cam.position.clone());
    if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, 0, 1, 0); }
    // vario: beeps in lift
    if (this.vario && b.lift > 0.4) {
      this.varioT -= dt;
      if (this.varioT <= 0) { this.varioT = clamp(0.6 - b.lift * 0.1, 0.12, 0.6); this.tone(t, 600 + b.lift * 140, 0.08, 0.06); }
    }
  }

  tone(when, f, dur, gain, type = "sine", out = null) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(gain, when + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, when + dur);
    o.connect(g).connect(out || this.master); o.start(when); o.stop(when + dur + 0.05);
    return o;
  }

  /** a flock leaving: n claps over ~0.7 s at (x, y, z), then the whirr */
  pigeonBurst(x, y, z, n) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const pn = ctx.createPanner(); pn.panningModel = "HRTF"; pn.distanceModel = "inverse"; pn.refDistance = 6; pn.rolloffFactor = 1.1;
    if (pn.positionX) { pn.positionX.value = x; pn.positionY.value = y; pn.positionZ.value = z; } else pn.setPosition(x, y, z);
    pn.connect(this.master);
    const claps = Math.min(40, n * 3);
    for (let i = 0; i < claps; i++) this.burst(t + Math.random() * (0.25 + n * 0.03), { f: 1500 + Math.random() * 1500, q: 1.5, dur: 0.025, gain: 0.35, out: pn });
    // the whirr: band-passed noise with a fast flutter, fading
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 1.4;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(Math.min(0.5, 0.06 * n), t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    const am = ctx.createOscillator(); am.frequency.value = 18; const amg = ctx.createGain(); amg.gain.value = 0.4; am.connect(amg).connect(g.gain); am.start(t); am.stop(t + 2.3);
    s.connect(bp).connect(g).connect(pn); s.start(t, Math.random()); s.stop(t + 2.3);
  }

  strike(good) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.burst(t, { f: 160, q: 0.7, dur: 0.18, gain: 0.7, type: "lowpass" });
    if (good) for (let i = 0; i < 4; i++) {
      const o = this.tone(t + 0.25 + i * 0.13, 2300, 0.09, 0.07, "sawtooth");
      o.frequency.setValueAtTime(2600, t + 0.25 + i * 0.13); o.frequency.exponentialRampToValueAtTime(1900, t + 0.33 + i * 0.13);
    }
  }
  thud(hard) { if (this.ctx) this.burst(this.ctx.currentTime, { f: hard ? 120 : 260, q: 0.6, dur: hard ? 0.25 : 0.1, gain: hard ? 0.8 : 0.25, type: "lowpass" }); }
  /** brushing through a crown's leaves: a short high rustle */
  leaves() { if (this.ctx) this.burst(this.ctx.currentTime, { f: 3200, q: 0.5, dur: 0.35, gain: 0.3, type: "bandpass" }); }
}
