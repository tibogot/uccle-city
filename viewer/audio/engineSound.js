// THE PLAYER CAR'S ENGINE (docs/ENGINE_SOUND.md, rule 47): the drive mode's engineVoice slot (viewer/drive/driveMode.js:
// { update(state, dt, driver), stop() }, called every frame while driving). The engine model (engineModel.js, Thunderline's)
// turns the car's speed and pedal into RPM / gear / load; the recorded loops (engineLoops.js, Thunderline's gen6) play it.
// The voice is one source of the CITY SOUND ENGINE (viewer/audio/engine.js): Doppler, HRTF, muffling, the traffic bus, the
// compressor and the one speaker button, like every other sound. Nothing happens while the sound is off: the loops are
// fetched on the first frame driven with the sound on (after the city sound has started), the graph is built when the
// source gets its voice. The RPM / load writes are per frame (a 0.13 s shift cut needs more than the 10 Hz control rate),
// each AudioParam written only when its value moved; no allocation per frame.
// The car only for now (the player's hatchback / the police estate: driver.vehicle === "car"); the two-wheelers keep their
// own sound (viewer/moto/motoAudio.js). ?engine=old: no engine tone (as before).
import { createEngineModel, ENGINE_CAR } from "./engineModel.js";
import { createLoopVoice, loadLoopBank } from "./engineLoops.js";

export const ENGINE_OLD = typeof location !== "undefined" && /[?&]engine=old(&|$)/.test(location.search);

/**
 * getEngine()   the city's SoundEngine once it runs (null before)
 * makeSource(o) a pool source of the city's one shape (citySound.js poolSource)
 * gate          the sound gate (viewer/audio/soundGate.js): nothing runs while muted
 * load(url)     optional: url -> Promise<AudioBuffer> (the headless test's WAV reader)
 */
export function createPlayerEngine({ getEngine, makeSource = (o) => o, gate = null, load = null, cfg = ENGINE_CAR } = {}) {
  const model = createEngineModel(cfg);
  const pe = { model, bank: null, loading: null, src: null, voice: null, error: null, frames: 0 };
  const wrap = {
    update() { /* per frame from pe.update, not at the control rate */ },
    dispose(when) { pe.voice?.dispose(when); pe.voice = null; },
  };
  const ensure = (E) => {
    if (!pe.src) {
      const src = pe.src = makeSource({ category: "traffic", priority: 3, ref: 2.5, range: 120, doppler: true, noOcclusion: true, gain: 1, seed: 0.17, wet: 0.7 });
      src.create = (ctx, input, now) => { pe.voice = createLoopVoice(ctx, pe.bank, input, { now }); return wrap; };
      E.add(src);
    }
    if (!pe.bank && !pe.loading) pe.loading = loadLoopBank(E.ctx, "gen6", load).then((b) => { pe.bank = b; }, (e) => { pe.error = e; console.warn("[engine] loops not loaded", e); });
    return !!pe.bank;
  };
  pe.update = (c, dt, driver) => {
    const src = pe.src;
    if (gate?.muted || !c) { if (src) src.active = false; return; }
    const E = getEngine();
    if (!E || !ensure(E)) return;
    const car = !driver || (driver.on && driver.vehicle === "car");
    src.active = car;
    if (!car) return;
    // the pedal: carCtl's shaped input (-1..1), the older models' raw throttle
    const sp = c.speed || 0, p = c.thrS ?? c.throttle ?? 0;
    const reverse = sp < -0.3 || (p < 0 && Math.abs(sp) < 0.3 && !c.braking);
    const thr = reverse ? Math.max(0, -p) : Math.max(0, p);
    const grounded = c.grounded === undefined ? true : c.grounded > 0.5;
    const I = model.in; I[0] = dt; I[1] = Math.abs(sp) * 3.6; I[2] = thr;
    const s = model.step(grounded, !grounded, reverse);
    const sn = Math.sin(c.heading || 0), cs = Math.cos(c.heading || 0);
    src.x = c.x; src.z = c.z; src.y = (Number.isFinite(c.y) ? c.y : 0) + 0.5;
    src.vx = sn * sp + (c.vx || 0); src.vz = cs * sp + (c.vz || 0); src.heading = c.heading || 0;
    pe.frames++;
    const V = pe.voice;
    if (V) { const J = V.in; J[0] = E.time; J[1] = s.rpm; J[2] = s.load; V.drive(s.limiter); }
  };
  pe.stop = () => { if (pe.src) pe.src.active = false; model.reset(); };
  return pe;
}
