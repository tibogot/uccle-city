// Offline renders: each scenario runs the same engine + sims in an OfflineAudioContext with an explicit clock
// (the control steps are simulated ahead, all automation is scheduled, then the graph renders). Used to check
// waveforms / spectrograms and to save short WAVs (docs/sound/renders/) for the owner to audition.
import { SoundEngine } from "./engine.js";
import { FootstepBank, SURFACES, stepLength } from "./footsteps.js";
import { VehicleBank } from "./vehicles.js";
import { TransitBank } from "./transit.js";
import { AmbienceBank, BirdBank, BellBank, createWindBed, createHumBed, createRainBed, playgroundBuffer, createPlaygroundVoice, BIRDS } from "./ambience.js";
import { CarSim, TramSim, TrainSim, BirdChorus, BellTowers, Dog, makePath } from "./sims.js";
import { playBuffer } from "./util.js";

export const RENDER_RATE = 24000;

function setup(ctx, opts = {}) {
  const engine = new SoundEngine(ctx, { offline: true, environment: opts.env || "canyon", voiceLimit: opts.voiceLimit ?? 40 });
  engine.envAuto = false;
  const banks = { feet: new FootstepBank(ctx), veh: new VehicleBank(ctx), tr: new TransitBank(ctx), amb: new AmbienceBank(ctx), birds: new BirdBank(ctx), bells: new BellBank(ctx) };
  return { engine, banks };
}
const steps = (engine, feet, list) => { for (const [t, surface, gait, foot] of list) engine.event({ category: "people", priority: 2, ref: 1.5, range: 40, x: 0.15 * (foot ? 1 : -1), y: 0.05, z: -0.3, wet: 0.6 }, (ctx, out, when) => feet.play(out, when, { surface, gait, foot, seed: t * 7.31 % 1 }), t); };

// Each scenario: { dur, stereo, env, build(engine, banks, ctx) -> step(t, dt) }.
export const SCENARIOS = {};
for (const surface of SURFACES) {
  SCENARIOS["footsteps_" + surface] = {
    dur: 4.2, env: surface === "grass" || surface === "leaves" || surface === "gravel" ? "park" : "canyon",
    note: `4 walking steps (0.53 s) then 5 running steps (0.33 s) on ${surface}`,
    build(engine, { feet }) {
      const list = []; let t = 0.1, foot = 0;
      for (let i = 0; i < 4; i++) { list.push([t, surface, "walk", foot]); t += 0.53; foot ^= 1; }
      t += 0.2; for (let i = 0; i < 5; i++) { list.push([t, surface, "run", foot]); t += 0.33; foot ^= 1; }
      let k = 0; return (tt) => { while (k < list.length && list[k][0] < tt + 0.1) { steps(engine, feet, [list[k]]); k++; } };
    },
  };
}
SCENARIOS.car_engine_cycle = {
  dur: 16, stereo: false, env: "open", note: "petrol 4-cyl on a dyno 5 m away: idle 3 s, pull away through the gears to 50 km/h, cruise 5 s, brake to a stop, idle",
  build(engine, { veh }) { const car = new CarSim(engine, veh, { path: makePath(0, -5, 0, [{ len: 10 }]), profile: "dyno", surface: "asphalt" }); return (t, dt) => car.step(t, dt); },
};
SCENARIOS.car_engine_diesel_idle_rev = {
  dur: 7, env: "canyon", note: "diesel idle, two blips of the throttle (manual RPM 2600 / 3400), idle",
  build(engine, { veh }) {
    const car = new CarSim(engine, veh, { path: makePath(0, -4, 0, [{ len: 10 }]), profile: "manual", kind: "diesel" });
    return (t, dt) => { const s = car.src; s.rpm = t > 2 && t < 2.7 ? 2600 : t > 4 && t < 4.9 ? 3400 : 760; s.load = s.rpm > 1000 ? 0.7 : 0; car.step(t, dt); };
  },
};
for (const surface of ["asphalt", "setts"]) {
  SCENARIOS["car_passby_" + surface] = {
    dur: 9, stereo: true, env: "canyon", note: `50 km/h pass-by 4 m in front of the listener on ${surface}, left to right (Doppler from the propagation delay)`,
    build(engine, { veh }) { const car = new CarSim(engine, veh, { path: makePath(-62, -4, Math.PI / 2, [{ len: 200 }]), profile: "cruise", v: 13.9, surface, loop: false }); return (t, dt) => car.step(t, dt); },
  };
}
SCENARIOS.car_doors_horn = {
  dur: 5, stereo: true, env: "canyon", note: "door opens, closes, a second door closes, then a short and a long horn (slop-newyork's two-reed horn)",
  build(engine, { veh }) {
    const car = new CarSim(engine, veh, { path: makePath(3, -4, 0, [{ len: 10 }]), profile: "manual" }); car.src.gain = 0.4; let k = 0;
    const evs = [[0.3, () => car.door(false)], [1.4, () => car.door(true)], [2.1, () => car.door(true)], [3.0, () => car.horn(0.22)], [3.5, () => car.horn(0.55)]];
    return (t, dt) => { car.step(t, dt); while (k < evs.length && evs[k][0] <= t) evs[k++][1](); };
  },
};
SCENARIOS.tram_curve_squeal = {
  dur: 14, stereo: true, env: "canyon", note: "tram 92 into the Saint-Job curve (R 18 m, 90 deg) at ~4.5 m/s, listener on the inside 8 m from the rail: bell, rumble, squeal bursts",
  build(engine, { tr }) {
    const path = makePath(-8 - 18, -70, 0, [{ len: 60 }, { arc: 18, angle: Math.PI / 2 }, { len: 80 }]);
    const tram = new TramSim(engine, tr, { path, s0: 5, vmax: 7, loop: false }); tram.v = 6;
    return (t, dt) => tram.step(t, dt);
  },
};
SCENARIOS.tram_stop = {
  dur: 30, stereo: true, env: "canyon", note: "tram 92 brakes into a stop 6 m away (regen whine), doors + warning beeps, stop chime, doors close, bell, pulls away (traction whine rising)",
  build(engine, { tr }) {
    const path = makePath(-70, -6, Math.PI / 2, [{ len: 200 }]);
    const tram = new TramSim(engine, tr, { path, s0: 0, stop: 84, dwell: 14, loop: false }); tram.v = 9;
    return (t, dt) => tram.step(t, dt);
  },
};
SCENARIOS.tram_bell = {
  dur: 3, env: "canyon", note: "the two-tone bell alone, 5 m (pitches are a guess: owner to compare with the real T3000)",
  build(engine, { tr }) { const tram = new TramSim(engine, tr, { path: makePath(0, -5, 0, [{ len: 50 }]), s0: 33, loop: false }); tram.parts.forEach((p) => (p.gain = 0.2)); let done = false; return (t, dt) => { tram.step(t, dt); if (!done && t > 0.2) { done = true; tram.bell(); } }; },
};
SCENARIOS.train_passby = {
  dur: 14, stereo: true, env: "open", note: "SNCB AM08 (3 cars, 81 m) at 120 km/h, 15 m away, a rail joint opposite the listener, two-tone horn (UIC 644 370/660 Hz) on approach",
  build(engine, { tr }) { const train = new TrainSim(engine, tr, { x0: -260, z: -15, v: 33.3, joints: [0], hornAt: -200, len: 2000 }); return (t, dt) => train.step(t, dt); },
};
const bed = (make, params) => ({ dur: 8, stereo: true, env: params.env || "open", note: params.note, build(engine, { amb }) { const b = engine.addBed(params.cat || "nature", make(amb)); Object.assign(b.params, params.p); return () => {}; } });
SCENARIOS.wind_open = bed(createWindBed, { p: { speed: 0.7, trees: 0 }, note: "wind 0.7 in the open (no trees): broad low whoosh with gusts" });
SCENARIOS.wind_trees = bed(createWindBed, { p: { speed: 0.7, trees: 1 }, env: "park", note: "same wind under trees: leaf rustle (2-9 kHz) fluttering with the gusts" });
SCENARIOS.city_hum = bed(createHumBed, { p: { level: 0.8 }, cat: "traffic", note: "distant city traffic hum (no near sources)" });
SCENARIOS.rain_light_ground = bed(createRainBed, { p: { intensity: 0.25, ground: 1 }, note: "light rain on the ground (pavement, puddle bubbles)" });
SCENARIOS.rain_heavy_roof = bed(createRainBed, { p: { intensity: 0.9, ground: 0.3, roof: 1 }, env: "canyon", note: "heavy rain on roofs (tile ticks) + some ground" });
SCENARIOS.rain_under_trees = bed(createRainBed, { p: { intensity: 0.6, ground: 0.2, trees: 1 }, env: "park", note: "moderate rain under trees: big drips + leaf patter, less hiss" });
SCENARIOS.birds_species = {
  dur: 18, stereo: true, env: "park", note: "one song each, in order: blackbird, robin, great tit, wood pigeon, magpie, carrion crow (10-25 m away)",
  build(engine, { birds }) {
    let k = 0; const at = [0.2, 3.1, 5.8, 9.2, 12.2, 14.4];
    return (t) => { while (k < BIRDS.length && at[k] <= t) { const sp = BIRDS[k], buf = birds.song(sp, 0); const a = k * 1.1; engine.event({ category: "nature", priority: 1, ref: 3, range: 300, x: Math.cos(a) * 14, y: 6, z: -Math.abs(Math.sin(a) * 14) - 4 }, (ctx, out, when) => playBuffer(ctx, buf, out, when, { gain: 0.6 }), at[k]); k++; } };
  },
};
SCENARIOS.birds_dawn_may = {
  dur: 20, stereo: true, env: "park", note: "dawn chorus, 15 May 05:50 (sunrise ~05:45): 10 birds in the trees around (blackbirds, robins, great tits, a wood pigeon, crows)",
  build(engine, { birds }) {
    const perch = []; const sp = ["blackbird", "blackbird", "robin", "robin", "greattit", "greattit", "woodpigeon", "crow", "blackbird", "robin"];
    sp.forEach((s, i) => { const a = i * 2.39; perch.push({ species: s, x: Math.cos(a) * (8 + i * 4), y: 5 + (i % 3) * 3, z: Math.sin(a) * (8 + i * 4) }); });
    const ch = new BirdChorus(engine, birds, perch, () => ({ hour: 5.83, month: 5 })); ch.birds.forEach((b, i) => (b.next = i * 0.4));
    return (t) => ch.step(t);
  },
};
SCENARIOS.bells_saintjob_3pm = {
  dur: 16, stereo: true, env: "canyon", note: "Saint-Job strikes 3 (prime 262 Hz is a guess) from 120 m; Saint-Pierre answers from 1.5 km, darker and muffled by distance",
  build(engine, { bells }) {
    const tw = new BellTowers(engine, bells, [{ x: 60, y: 35, z: -100, prime: 262, hum60: 14 }, { x: -900, y: 30, z: -1200, prime: 233, hum60: 16, delay: 4.5 }], () => ({ hour: 15, minute: 0 }));
    let done = false; return (t) => { if (!done && t >= 0.2) { done = true; tw.ring(15, 0.3); } };
  },
};
SCENARIOS.dog_bark = {
  dur: 8, stereo: true, env: "canyon", note: "a dog in a garden 25 m away, three bark bouts (small/medium dog)",
  build(engine, banks, ctx) { const dog = new Dog(engine, ctx, { x: -15, y: 0.5, z: -20 }, { every: [2.2, 2.8] }); dog.next = 0.2; return (t) => dog.step(t); },
};
SCENARIOS.playground = {
  dur: 8, stereo: true, env: "open", note: "a school playground 30 m away (two areas): babble, shouts, laughter",
  build(engine, banks, ctx) {
    [[-10, -30], [8, -34]].forEach(([x, z], i) => { const buf = playgroundBuffer(ctx, i + 1); const src = { category: "people", priority: 1, ref: 6, range: 200, x, y: 1.2, z, seed: i * 0.37, level: 1, create: (c, input, now) => createPlaygroundVoice(c, buf, input, src, now) }; engine.add(src); });
    return () => {};
  },
};
SCENARIOS.occlusion_walk = {
  dur: 12, stereo: true, env: "canyon", note: "a car idling in a side street round a corner: the listener walks along the main street from behind the corner block into view (muffled until ~8.5 s, then clear), footsteps on pavement",
  build(engine, { veh, feet }) {
    engine.occluders.push({ minX: 2, maxX: 40, minZ: -40, maxZ: -6, maxY: 14 });
    const car = new CarSim(engine, veh, { path: makePath(-1, -30, 0, [{ len: 5 }]), profile: "manual" }); car.src.gain = 1.4;
    let nextStep = 0.2, foot = 0;
    return (t, dt) => {
      car.step(t, dt);
      const L = engine.listener; L.x = 14 - t * 1.33; L.z = -2; L.fx = -1; L.fz = 0;
      if (t >= nextStep) { engine.event({ category: "people", priority: 2, ref: 1.5, range: 40, x: L.x, y: 0.05, z: L.z }, (ctx, out, when) => feet.play(out, when, { surface: "pavement", foot }), nextStep); foot ^= 1; nextStep += stepLength("walk") / 1.33; }
    };
  },
};
SCENARIOS.stress_40 = {
  dur: 10, stereo: true, env: "canyon", note: "COST TEST: 16 cars, 2 trams (4 voices), a train (3), 10 birds, footsteps, wind + rain + hum beds: ~40 voices (listen for glitches only)",
  build(engine, banks, ctx) {
    const sims = [];
    for (let i = 0; i < 16; i++) sims.push(new CarSim(engine, banks.veh, { path: makePath(-100 + (i % 4) * 8, -6 - Math.floor(i / 4) * 9, Math.PI / 2, [{ len: 400 }]), s0: (i * 23) % 120, profile: i % 3 ? "cruise" : "cycle", v: 8 + (i % 5), surface: i % 2 ? "setts" : "asphalt", loop: true }));
    for (let i = 0; i < 2; i++) sims.push(new TramSim(engine, banks.tr, { path: makePath(-30 + i * 6, -80, 0, [{ len: 40 }, { arc: 18, angle: Math.PI / 2 }, { len: 120 }]), s0: i * 30, loop: true }));
    sims.push(new TrainSim(engine, banks.tr, { x0: -300, z: -60, v: 30, joints: [0, 60], len: 600 }));
    const perch = []; for (let i = 0; i < 10; i++) perch.push({ species: BIRDS[i % 4], x: Math.cos(i) * 30, y: 6, z: Math.sin(i) * 30 });
    const ch = new BirdChorus(engine, banks.birds, perch, () => ({ hour: 6, month: 5 }));
    engine.addBed("nature", createWindBed(banks.amb)); const rain = engine.addBed("nature", createRainBed(banks.amb)); rain.params.intensity = 0.4; engine.addBed("traffic", createHumBed(banks.amb));
    let nextStep = 0, foot = 0;
    return (t, dt) => { for (const s of sims) s.step(t, dt); ch.step(t); if (t >= nextStep) { engine.event({ category: "people", priority: 2, ref: 1.5, range: 40, x: 0, y: 0.05, z: 0 }, (c, out, when) => banks.feet.play(out, when, { surface: "setts", foot }), nextStep); foot ^= 1; nextStep += 0.53; } };
  },
};

// Render a scenario; returns { buffer, renderMs, buildMs, stats }.
export async function renderScenario(name, { rate = RENDER_RATE, voiceLimit } = {}) {
  const sc = SCENARIOS[name];
  const ctx = new OfflineAudioContext(2, Math.ceil(sc.dur * rate), rate);
  const t0 = performance.now();
  const { engine, banks } = setup(ctx, { env: sc.env, voiceLimit });
  const step = sc.build(engine, banks, ctx);
  const dt = 1 / engine.controlRate;
  let maxVoices = 0, ctlMs = 0, n = 0;
  for (let t = 0; t < sc.dur; t += dt) { engine.now = t; step(t, dt); const ms = engine.control(t); ctlMs += ms; n++; maxVoices = Math.max(maxVoices, engine.stats.voices); }
  const t1 = performance.now();
  const buffer = await ctx.startRendering();
  const t2 = performance.now();
  return { buffer, buildMs: t1 - t0, renderMs: t2 - t1, controlMsAvg: ctlMs / n, maxVoices, stereo: !!sc.stereo, dur: sc.dur };
}

// 16-bit PCM WAV (mono = average of L+R when the scenario is not stereo). Peak-normalised to -1 dBFS only if
// it would clip; otherwise level kept (relative levels between renders stay meaningful).
export function encodeWav(buffer, stereo) {
  const ch = stereo ? 2 : 1, n = buffer.length, L = buffer.getChannelData(0), R = buffer.getChannelData(1);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = peak > 0.89 ? 0.89 / peak : 1;
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); out.setUint32(4, 36 + n * ch * 2, true); w(8, "WAVE"); w(12, "fmt "); out.setUint32(16, 16, true); out.setUint16(20, 1, true);
  out.setUint16(22, ch, true); out.setUint32(24, buffer.sampleRate, true); out.setUint32(28, buffer.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true);
  out.setUint16(34, 16, true); w(36, "data"); out.setUint32(40, n * ch * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    if (stereo) { out.setInt16(o, Math.max(-1, Math.min(1, L[i] * g)) * 32767, true); out.setInt16(o + 2, Math.max(-1, Math.min(1, R[i] * g)) * 32767, true); o += 4; }
    else { out.setInt16(o, Math.max(-1, Math.min(1, (L[i] + R[i]) * 0.5 * g)) * 32767, true); o += 2; }
  }
  return { blob: new Blob([out.buffer], { type: "audio/wav" }), peak, gain: g };
}
