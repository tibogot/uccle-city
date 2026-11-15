// GAME SOUNDS (docs/GAMEKIT.md): tiny WebAudio cues, synthesised (no files): the radio squelch + beep before a message,
// a success chime, a fail tone, a tick for the last seconds of a timer. One AudioContext, created on the first cue
// (a key / click has happened by then), one master gain = the settings' volume. Voice lines later (a hook: play(url)).
export class GameAudio {
  constructor(volume = 0.7) { this.ctx = null; this.master = null; this.volume = volume; }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v * 0.5; }
  ready() {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain(); this.master.gain.value = this.volume * 0.5; this.master.connect(this.ctx.destination);
      } catch { return null; }
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }
  tone(f0, f1, t0, dur, type = "sine", gain = 0.25) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.linearRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.01); g.gain.setValueAtTime(gain, t0 + dur - 0.03); g.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(g).connect(this.master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  noise(t0, dur, gain = 0.08) {
    const c = this.ctx, n = Math.ceil(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 0.7; g.gain.value = gain;
    s.connect(f).connect(g).connect(this.master); s.start(t0);
  }
  /** a radio message: squelch + two short beeps (a priority call: three, higher) */
  radio(urgent = false) {
    if (!this.volume || !this.ready()) return;
    const t = this.ctx.currentTime + 0.01;
    this.noise(t, 0.09);
    const f = urgent ? 1320 : 1046;
    for (let k = 0; k < (urgent ? 3 : 2); k++) this.tone(f, f, t + 0.11 + k * 0.13, 0.08, "square", 0.07);
  }
  success() { if (!this.volume || !this.ready()) return; const t = this.ctx.currentTime + 0.01; [523, 659, 784, 1046].forEach((f, k) => this.tone(f, f, t + k * 0.09, 0.16, "triangle", 0.18)); }
  fail() { if (!this.volume || !this.ready()) return; const t = this.ctx.currentTime + 0.01; this.tone(392, 300, t, 0.28, "sawtooth", 0.07); this.tone(294, 220, t + 0.25, 0.4, "sawtooth", 0.07); }
  tick() { if (!this.volume || !this.ready()) return; this.tone(1600, 1600, this.ctx.currentTime + 0.01, 0.04, "square", 0.05); }
  click() { if (!this.volume || !this.ready()) return; this.tone(900, 700, this.ctx.currentTime + 0.01, 0.05, "triangle", 0.08); }
}
