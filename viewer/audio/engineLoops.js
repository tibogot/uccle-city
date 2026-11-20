// THE ENGINE AS RECORDED LOOPS (docs/ENGINE_SOUND.md). Ported from Thunderline (game-engine-v1, games/thunderline/proto/
// kit/engineLoops.js, read-only source), the way racing games do it: steady 1 s loops at fixed RPMs, all playing, the two
// around the current RPM crossfaded (equal power) and pitched the few percent between them (playbackRate = rpm / loopRpm).
// TWO SETS: on the throttle, and COASTING (no fuel: weak combustion, the intake shut, the mechanics heard); LOAD
// crossfades them (equal power) and opens the tone (a load + RPM low-pass, a presence shelf). The GRIT exciter (HP 700 ->
// drive -> tanh -> HP 3 kHz) makes the top end the loops lack; the LIMITER chops the level ~18 times a second.
// Differences from Thunderline: no AudioContext of its own: the voice is built into an input node the city sound engine
// gives it (viewer/audio/engine.js: Doppler, HRTF, occlusion, the traffic bus, the one speaker button); no lift-off pops
// (the owner found them annoying); the last written values live in a Float64Array (no property on the AudioParam objects,
// no number boxed in a closure); every time is passed in (the same code renders offline).
// The loops: Thunderline's gen6 (enginesound's example6, a four-cylinder; MIT tool, the renders are ours), sounds/engines/
// gen6/rpm_<rpm>.wav and off/rpm_<rpm>.wav (16-bit 48 kHz mono, 1.0 s).

export const LOOP_ENGINES = {
  gen6: { label: "Gen 6 · 4-cyl (Thunderline)", folder: "gen6", cylinders: 4, rpms: [1000, 1750, 2500, 3250, 4000, 5000, 6000, 7000, 8200] },
};

// THE MIX (Thunderline's, by ear in its engine lab)
export const LOOP_MIX = {
  offGain: 2.2,       // the coasting loops are rendered ~12 dB under the throttle ones: lift them to ~-5 dB
  toneMin: 3500,      // low-pass (Hz) coasting ...
  toneLoad: 9000,     // ... + this much at full load
  toneRpm: 3500,      // ... + this much at 8000 RPM
  presence: 4, presenceHz: 2500,
  grit: 1, gritHz: 3000,
  level: 0.9,         // the voice's output into the emitter (the loops are ~0.12 RMS)
};

/** the loops' URLs (served from the repo root: viewer/ is one level down) */
export function loopUrls(name = "gen6", base = new URL("../../sounds/engines/", import.meta.url).href) {
  const E = LOOP_ENGINES[name], f = `${base}${E.folder}/`;
  return { on: E.rpms.map((r) => `${f}rpm_${r}.wav`), off: E.rpms.map((r) => `${f}off/rpm_${r}.wav`) };
}

/** load an engine's 2 x 9 loops: load(url) -> Promise<AudioBuffer> (default: fetch + ctx.decodeAudioData) */
export async function loadLoopBank(ctx, name = "gen6", load = null) {
  const get = load || (async (u) => ctx.decodeAudioData(await (await fetch(u)).arrayBuffer()));
  const U = loopUrls(name);
  const [on, off] = await Promise.all([Promise.all(U.on.map(get)), Promise.all(U.off.map(get))]);
  return { name, rpms: LOOP_ENGINES[name].rpms, cylinders: LOOP_ENGINES[name].cylinders, on, off };
}

// slots of the last-written table (setIf)
const N_FIX = 6, TONE = 0, GRIT = 1, CHOP = 2, OUT = 3, LAST_T = 4, PHASE = 5;

/**
 * The voice: every loop of the bank playing into `out` (an emitter's input). Once a frame: voice.in = [now, rpm, load],
 * drive(limiter) (or update(now, rpm, load, limiter)); dispose(when) fades and stops it.
 */
export function createLoopVoice(ctx, bank, out, { level = LOOP_MIX.level, now = ctx.currentTime } = {}) {
  const R = bank.rpms, n = R.length, nodes = [], srcs = [], gains = [];
  const own = (x) => (nodes.push(x), x);
  const tone = own(ctx.createBiquadFilter()); tone.type = "lowpass"; tone.Q.value = 0.6; tone.frequency.value = LOOP_MIX.toneMin;
  const shelf = own(ctx.createBiquadFilter()); shelf.type = "highshelf"; shelf.frequency.value = LOOP_MIX.presenceHz; shelf.gain.value = LOOP_MIX.presence;
  const chop = own(ctx.createGain()); chop.gain.value = 1;
  const outG = own(ctx.createGain()); outG.gain.value = 0;
  tone.connect(shelf).connect(chop).connect(outG).connect(out);
  // the exciter, in parallel after the tone filter (so coasting stays duller)
  const pre = own(ctx.createBiquadFilter()); pre.type = "highpass"; pre.frequency.value = 700;
  const drive = own(ctx.createGain()); drive.gain.value = 4;
  const sat = own(ctx.createWaveShaper());
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(x * 6); }
  sat.curve = curve; sat.oversample = "4x";
  const gritHp = own(ctx.createBiquadFilter()); gritHp.type = "highpass"; gritHp.frequency.value = LOOP_MIX.gritHz; gritHp.Q.value = 0.7;
  const gritG = own(ctx.createGain()); gritG.gain.value = 0;
  tone.connect(pre).connect(drive).connect(sat).connect(gritHp).connect(gritG).connect(chop);
  // 2 x n loops, not all in phase
  for (let set = 0; set < 2; set++) for (let i = 0; i < n; i++) {
    const buf = set ? bank.off[i] : bank.on[i];
    const src = own(ctx.createBufferSource()); src.buffer = buf; src.loop = true;
    const g = own(ctx.createGain()); g.gain.value = 0;
    src.connect(g).connect(tone);
    src.start(now, ((i * 0.618 + set * 0.37) % 1) * buf.duration);
    srcs.push(src); gains.push(g);
  }
  // last written: [fixed slots | gain per loop | rate per loop]. Every write inline (a double passed to a call V8 does not
  // inline is a heap number: ~20 a frame through a setIf helper)
  const K = new Float64Array(N_FIX + 4 * n).fill(NaN);
  K[PHASE] = 0;
  /** the inputs of drive(): IN[0] now (s), IN[1] rpm, IN[2] load 0..1 (doubles in an array: no heap number per call) */
  const IN = new Float64Array(3);
  let dead = false;
  const v = {
    bank, srcs, in: IN,
    get dead() { return dead; },
    /** convenience (tests, the lab): the same as IN = [now, rpm, load] + drive(limiter) */
    update(now, rpm, load, limiter = false) { IN[0] = now; IN[1] = rpm; IN[2] = load; v.drive(limiter); },
    drive(limiter) {
      if (dead) return;
      const now = IN[0], rpm = Math.max(R[0] * 0.8, IN[1]), L0 = IN[2], load = L0 < 0 ? 0 : L0 > 1 ? 1 : L0;
      let k = 0;
      while (k < n - 2 && rpm > R[k + 1]) k++;
      const t = Math.min(1, Math.max(0, (rpm - R[k]) / (R[k + 1] - R[k])));
      const onMix = Math.sin((load * Math.PI) / 2), offMix = Math.cos((load * Math.PI) / 2) * LOOP_MIX.offGain;
      const wa = Math.cos((t * Math.PI) / 2), wb = Math.sin((t * Math.PI) / 2);
      for (let i = 0; i < 2 * n; i++) {
        const j = i % n;
        const w = j === k ? wa : j === k + 1 ? wb : 0;
        const g = w * (i >= n ? offMix : onMix), sg = N_FIX + i;
        if (!(Math.abs(K[sg] - g) <= 1e-3)) { K[sg] = g; gains[i].gain.setTargetAtTime(g, now, 0.03); }
        if (g > 0) {                                                    // (the pitch matters only while it is heard)
          const r = rpm / R[j], sr = N_FIX + 2 * n + i;
          if (!(Math.abs(K[sr] - r) <= 1e-3))   // (0.1 %: under 2 cents, the 15 ms ramp hides the step)
            { K[sr] = r; srcs[i].playbackRate.setTargetAtTime(r, now, 0.015); }
        }
      }
      const f = Math.min(20000, LOOP_MIX.toneMin + LOOP_MIX.toneLoad * load + LOOP_MIX.toneRpm * Math.min(1, rpm / 8000));
      if (!(Math.abs(K[TONE] - f) <= f * 0.004)) { K[TONE] = f; tone.frequency.setTargetAtTime(f, now, 0.04); }
      const gg = LOOP_MIX.grit * 0.5 * (0.35 + 0.65 * load);
      if (!(Math.abs(K[GRIT] - gg) <= 1e-3)) { K[GRIT] = gg; gritG.gain.setTargetAtTime(gg, now, 0.05); }
      if (!(Math.abs(K[OUT] - level) <= 1e-3)) { K[OUT] = level; outG.gain.setTargetAtTime(level, now, 0.05); }
      // LIMITER: the ignition cuts in bursts (~18 a second)
      const dt = K[LAST_T] === K[LAST_T] ? Math.min(0.05, Math.max(0, now - K[LAST_T])) : 0;
      K[LAST_T] = now;
      K[PHASE] = (K[PHASE] + dt * 18) % 1;
      const ch = limiter && K[PHASE] < 0.45 ? 0.35 : 1;
      if (!(Math.abs(K[CHOP] - ch) <= 1e-3)) { K[CHOP] = ch; chop.gain.setTargetAtTime(ch, now, 0.004); }
    },
    dispose(when) {
      if (dead) return; dead = true;
      outG.gain.cancelScheduledValues(when); outG.gain.setTargetAtTime(0, when, 0.03);
      for (const s of srcs) { try { s.stop(when + 0.2); } catch { /* */ } }
      srcs[0].onended = () => { for (const x of nodes) x.disconnect(); };
    },
  };
  return v;
}
