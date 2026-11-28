// THE BMX'S SOUND (feel round 3; docs/BIKE.md "Feel round 3"). All procedural Web Audio: no sample files, the textures
// are baked in memory once when the sound is switched ON (viewer/audio/util.js bake: DC removed, normalised, looped).
// OFF by default (project rule): no AudioContext, no buffers, update() returns at once (zero work, zero allocations).
//
// THREE LAYERS:
//   soundParams(s, B, mem, out)  PURE: the bike's physics state -> the sound's parameters (node-tested, no AudioContext):
//     the freewheel's tick rate (rear wheel vs the cog), rolling noise per surface, the chain, the skid, the grind scrape
//     by material, and the one-shot EVENTS found by comparing the state's counters with mem (landings by band, kerb
//     knocks, peg clanks, crashes). Writes into a preallocated `out`: no allocation.
//   RECIPES                      the bake functions (one loop per surface, two ratchet loops, the chain, three scrapes,
//                                the skid; the one-shots), deterministic from a seed (node-testable with a stand-in ctx)
//   BikeSound                    the graph, built ONCE on the first switch-on: 13 looping voices (fixed: 6 rolling, 2
//                                ratchet, chain, skid, 3 scrape), each a looped buffer -> (filter) -> gain -> master, all
//                                always running while on (their gains move); a pool of 4 one-shot voices (persistent
//                                gains; a new AudioBufferSourceNode per EVENT is the one thing Web Audio cannot reuse: a
//                                few per second at most, never per frame; the oldest is stolen past 4).
import { bake, Biquad, Mode, OnePole, pinkSource, poisson, TAU } from "../audio/util.js";
import { soundGate } from "../audio/soundGate.js";

/** the tunables (a lab panel folder "Sound") */
export const SOUND = {
  volume: 0.7,
  roll: 0.55,          // rolling noise at full speed (x per-surface gain)
  rollV: 7,            // m/s where the rolling noise is at full level (it starts at ~0.3 m/s)
  tick: 0.22,          // the freewheel ratchet
  teeth: 36,           // ratchet points of engagement (a BMX cassette hub)
  chain: 0.16,         // chain over the sprockets + the bottom bracket's knock while pedalling
  skid: 0.5,           // a rear-wheel skid / a tyre sliding sideways
  scrape: 0.6,         // pegs on an edge
  thud: 0.9,           // landings, crashes
  knock: 0.7,          // a tyre into a kerb face (a block, a rear bonk, a kerb catch)
  clank: 0.6,          // pegs onto an edge
};
export const SOUND_RANGES = Object.fromEntries(Object.keys(SOUND).map((k) => [k, k === "teeth" ? [12, 120, 1] : k === "rollV" ? [2, 15, 0.5] : [0, 1.5, 0.01]]));

/** per surface (bikePhysics SURF order: asphalt, setts, dirt, grass, sand, roots): the loop's gain and its reference
 *  speed (the loop was baked as heard at vRef; it plays at rate v / vRef) */
export const SURF_SOUND = [
  { name: "asphalt", gain: 0.55, vRef: 6 },
  { name: "setts", gain: 1.0, vRef: 4 },
  { name: "dirt", gain: 0.8, vRef: 4 },
  { name: "grass", gain: 0.45, vRef: 3 },
  { name: "sand", gain: 0.7, vRef: 2.5 },
  { name: "roots", gain: 0.9, vRef: 3 },
];
export const MAT = { metal: 0, stone: 1, wood: 2 };
export const LAND = { none: 0, clean: 1, sketchy: 2, bail: 3 };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** a params object (allocated once) */
export function createSoundParams() {
  return {
    roll: new Float32Array(6), rollRate: new Float32Array(6), tickRate: 0, tickGain: 0, chain: 0, chainRate: 1,
    skid: 0, skidF: 2000, scrape: new Float32Array(3), scrapeRate: 1,
    land: 0, landGain: 0, knock: 0, clank: -1, clankGain: 0, crash: 0,
  };
}
/** the counters the events are found from (allocated once; sync() it to the state when the sound is switched on) */
export function createSoundMem(s) { const m = { ref: null, landings: 0, blocked: 0, bonks: 0, catches: 0, grinds: 0, crashes: 0 }; if (s) syncSoundMem(m, s); return m; }
export function syncSoundMem(m, s) { m.ref = s; m.landings = s.landings; m.blocked = s.blocked; m.bonks = s.bonks; m.catches = s.catches || 0; m.grinds = s.grinds || 0; m.crashes = s.crashes; }

/**
 * PURE: the bike state s (bikePhysics) -> out (createSoundParams). mem holds the counters seen last time.
 * EDGE types (bikeEdges.js): 0 kerb, 1 ledge, 2 bench, 3 wall, 4 rail, 5 stair.
 */
export function soundParams(s, B, mem, out, S = SOUND) {
  const v = Math.sqrt(s.vx * s.vx + s.vz * s.vz), grinding = s.grindSeg >= 0, down = !s.crashed && !grinding;   // (not Math.hypot: V8 boxes its result: an allocation a call)
  // ---- rolling: each wheel on the ground adds half of its surface's voice; the loop's rate follows the speed
  const lvl = S.roll * sm(0.3, 1.2, v) * (0.35 + 0.65 * Math.min(1, v / S.rollV));
  for (let k = 0; k < 6; k++) { out.roll[k] = 0; out.rollRate[k] = clamp(v / SURF_SOUND[k].vRef, 0.25, 3); }
  if (down) for (let i = 0; i < 2; i++) if (s.contact[i]) { const k0 = s.surf[i] | 0, k = k0 === 6 ? 2 : k0 === 7 ? 4 : k0; if (k >= 0 && k < 6) out.roll[k] += 0.5 * lvl * SURF_SOUND[k].gain; }
  // ---- the freewheel: the ratchet ticks at the rear wheel's turns over the cog's (the cranks drive the cog through
  // 44/16); pedalling the cog turns with the wheel: silent; stopping the pedals: the ticks rise as the cadence decays
  const R = B.wheelR, wheelRev = v / (TAU * R), cogRev = (s.cadence || 0) / 60 * (B.rollout / (TAU * R));
  const rel = s.crashed ? 0 : wheelRev - cogRev;
  out.tickRate = rel > 0.05 ? rel * S.teeth : 0;
  out.tickGain = out.tickRate > 0 ? S.tick * sm(0.05, 0.6, rel) : 0;
  // ---- the chain: pedalling, with the cadence (its loop = one crank turn at 60 rpm); standing on the pedals: louder
  out.chain = s.crashed ? 0 : S.chain * (s.pedalling || 0) * sm(5, 40, s.cadence || 0) * (1 + 0.5 * (s.sprint || 0));
  out.chainRate = clamp((s.cadence || 0) / 60, 0.2, 3);
  // ---- the skid: a locked rear (s.skid) with the speed, or a tyre sliding sideways (s.slip m/s); the filter: a squeal
  // on hard ground, a lower rasp on loose
  const slide = Math.max(s.skid ? sm(1, 6, v) : 0, sm(0.4, 2.5, Math.abs(s.slip || 0)), s.frontLock ? sm(1, 6, v) * 0.7 : 0);
  out.skid = down && (s.contact[0] || s.contact[1]) ? S.skid * slide : 0;
  const sf = s.surf[1] | 0;
  out.skidF = sf === 0 || sf === 1 ? 2100 : 950;
  // ---- the grind: pegs on steel (a rail), stone (a ledge, a wall, a kerb), wood (a bench)
  out.scrape[0] = out.scrape[1] = out.scrape[2] = 0;
  const mat = s.grindType === 4 ? MAT.metal : s.grindType === 2 ? MAT.wood : MAT.stone;
  if (grinding) out.scrape[mat] = S.scrape * Math.pow(clamp((s.grindV || 0) / 4, 0, 1), 0.7);
  out.scrapeRate = clamp(0.6 + (s.grindV || 0) / 5, 0.5, 2);
  // ---- events (once each; a new state object (the lab's reset / a spot) is synced first: its counters are not events)
  out.land = LAND.none; out.landGain = 0; out.knock = 0; out.clank = -1; out.clankGain = 0; out.crash = 0;
  if (mem.ref !== s) syncSoundMem(mem, s);
  if (s.landings !== mem.landings) {
    const L = s.lastLanding, band = L ? L.band : "clean";
    out.land = band === "bail" ? LAND.bail : band === "sketchy" ? LAND.sketchy : LAND.clean;
    out.landGain = S.thud * clamp((L ? L.vn : 3) / 8, 0.25, 1);
  }
  const knocks = (s.blocked - mem.blocked) + (s.bonks - mem.bonks) + ((s.catches || 0) - mem.catches);
  if (knocks > 0) out.knock = S.knock * clamp(v / 5, 0.3, 1);
  if ((s.grinds || 0) !== mem.grinds) { out.clank = mat; out.clankGain = S.clank * clamp(0.5 + Math.abs(s.vy || 0) / 3 + v / 10, 0.4, 1); }
  if (s.crashes !== mem.crashes && out.land !== LAND.bail) out.crash = S.thud * clamp(v / 6, 0.4, 1);
  syncSoundMem(mem, s);
  return out;
}

// ------------------------------------------------------------------------------------------------ the bake recipes
// fill(data[], sr, rand) like viewer/audio/util.js bake; each returns { seconds, fill, opts }. Loops: `loop: true`
// (no end fades) and built from periodic / wrapped events so the seam is quiet.
const GB = new Biquad("bandpass", 1000, 3, 44100);
const grains = (d, sr, rand, rate, seconds, f0, f1, len, amp = 1) => {
  for (const t of poisson(rand, seconds, rate)) {
    const bq = GB.set("bandpass", f0 + (f1 - f0) * rand(), 3, sr), i0 = Math.floor(t * sr), n = Math.floor(len * sr * (0.5 + rand()));
    bq.z1 = bq.z2 = 0;
    const k = Math.exp(-5 / Math.max(1, n)), L = d.length;
    let a = amp * (0.3 + 0.7 * rand());
    for (let i = 0, j = i0 % L; i < n; i++, j = j + 1 === L ? 0 : j + 1) { d[j] += bq.run((rand() * 2 - 1) * a); a *= k; }
  }
};
const modal = (d, sr, t0, modes, amp, wrap = true) => {
  const M = modes.map(([f, t60, g]) => new Mode(f, t60, sr, g)), n = Math.floor(Math.max(...modes.map((m) => m[1])) * sr), i0 = Math.floor(t0 * sr);
  for (let i = 0; i < n; i++) { const x = i === 0 ? amp : 0; let y = 0; for (const m of M) y += m.run(x); const j = i0 + i; if (wrap) d[j % d.length] += y; else if (j < d.length) d[j] += y; }
};
export const RECIPES = {
  // rolling, as heard at each surface's vRef
  asphalt: { seconds: 1.0, opts: { loop: true, rms: 0.18 }, fill([d], sr, rand) {
    const p = pinkSource(rand), lp = new OnePole(900, sr), bp = new Biquad("bandpass", 130, 1.2, sr);
    for (let i = 0; i < d.length; i++) { const x = p(); d[i] = lp.lp(x) * 0.8 + bp.run(x) * 0.6; }
  } },
  setts: { seconds: 1.0, opts: { loop: true, rms: 0.2 }, fill([d], sr, rand) {
    // 4 m/s over 10 cm setts: a knock every 25 ms (jittered) through a stone + tyre body, over a grit bed
    const p = pinkSource(rand), lp = new OnePole(1400, sr);
    for (let i = 0; i < d.length; i++) d[i] = lp.lp(p()) * 0.35;
    for (let t = 0; t < 1.0; t += 0.025 * (0.85 + 0.3 * rand())) modal(d, sr, t, [[95, 0.05, 1], [210, 0.03, 0.6], [1250, 0.012, 0.25], [2600, 0.006, 0.12]], 0.9 * (0.6 + 0.4 * rand()));
  } },
  dirt: { seconds: 1.0, opts: { loop: true, rms: 0.17 }, fill([d], sr, rand) {
    const p = pinkSource(rand), lp = new OnePole(500, sr);
    for (let i = 0; i < d.length; i++) d[i] = lp.lp(p()) * 0.6;
    grains(d, sr, rand, 700, 1.0, 1500, 5000, 0.004, 0.5);
  } },
  grass: { seconds: 1.0, opts: { loop: true, rms: 0.12 }, fill([d], sr, rand) {
    const bp = new Biquad("bandpass", 3800, 0.8, sr), lp = new OnePole(220, sr);
    for (let i = 0; i < d.length; i++) { const am = 0.6 + 0.4 * Math.sin(TAU * 3 * i / sr) * Math.sin(TAU * 0.67 * i / sr); d[i] = bp.run(rand() * 2 - 1) * am * 0.5 + lp.lp(rand() * 2 - 1) * 0.5; }
  } },
  sand: { seconds: 1.0, opts: { loop: true, rms: 0.15 }, fill([d], sr, rand) {
    const bp = new Biquad("bandpass", 5200, 0.9, sr), lp = new OnePole(300, sr);
    for (let i = 0; i < d.length; i++) d[i] = bp.run(rand() * 2 - 1) * 0.35 + lp.lp(rand() * 2 - 1) * 0.8;
    grains(d, sr, rand, 1800, 1.0, 3000, 8000, 0.002, 0.25);
  } },
  roots: { seconds: 1.0, opts: { loop: true, rms: 0.18 }, fill([d], sr, rand) {
    const p = pinkSource(rand), lp = new OnePole(400, sr);
    for (let i = 0; i < d.length; i++) d[i] = lp.lp(p()) * 0.5;
    for (const t of poisson(rand, 1.0, 7)) modal(d, sr, t, [[75, 0.09, 1], [160, 0.05, 0.5], [900, 0.01, 0.15]], 1.2 * (0.5 + 0.5 * rand()));
    grains(d, sr, rand, 120, 1.0, 2000, 6000, 0.006, 0.3);
  } },
  // the ratchet: pawl clicks (three small steel modes), 16 a second and 128 a second (two loops crossfaded by rate)
  tickLo: { seconds: 1, opts: { loop: true, peak: 0.8 }, fill([d], sr, rand) { for (let k = 0; k < 16; k++) modal(d, sr, k / 16, [[3100, 0.006, 1], [4700, 0.004, 0.7], [7300, 0.003, 0.4]], 1 + 0.1 * rand()); } },
  tickHi: { seconds: 1, opts: { loop: true, peak: 0.8 }, fill([d], sr, rand) { for (let k = 0; k < 128; k++) modal(d, sr, k / 128, [[3100, 0.004, 1], [4700, 0.003, 0.7], [7300, 0.002, 0.4]], 1 + 0.1 * rand()); } },
  // the chain: one crank turn at 60 rpm: 44 rollers onto the chainring (small metal ticks) + a soft bottom-bracket knock
  // at each power stroke (twice a turn) + a chain-slap hiss
  chain: { seconds: 1, opts: { loop: true, rms: 0.15 }, fill([d], sr, rand) {
    for (let k = 0; k < 44; k++) modal(d, sr, k / 44, [[1800 + 300 * rand(), 0.006, 0.5], [3900, 0.003, 0.3]], 0.6 + 0.3 * rand());
    for (const t of [0.12, 0.62]) modal(d, sr, t, [[140, 0.06, 1], [380, 0.03, 0.4]], 0.8);
    const bp = new Biquad("bandpass", 2600, 2, sr);
    for (let i = 0; i < d.length; i++) d[i] += bp.run(rand() * 2 - 1) * 0.08;
  } },
  skid: { seconds: 1, opts: { loop: true, rms: 0.2 }, fill([d], sr, rand) {
    // rubber dragged: broadband rasp with stick-slip (~180 Hz AM, wandering)
    const lp = new OnePole(3000, sr); let ph = 0;
    for (let i = 0; i < d.length; i++) { ph += TAU * (180 + 25 * Math.sin(TAU * 2 * i / sr)) / sr; d[i] = lp.lp(rand() * 2 - 1) * (0.55 + 0.45 * Math.max(0, Math.sin(ph))); }
  } },
  // the grind: steel pegs on steel (ringing modes, a high squeal), on stone (grit, grains), on wood (lower, fibrous)
  scrapeMetal: { seconds: 1.5, opts: { loop: true, rms: 0.16 }, fill([d], sr, rand) {
    const M = [[1930, 0.4, 1], [3310, 0.3, 0.7], [5170, 0.2, 0.5], [7840, 0.12, 0.3]].map(([f, t, g]) => new Mode(f, t, sr, g)), hp = new OnePole(1200, sr);
    for (let i = 0; i < d.length; i++) { const x = hp.hp(rand() * 2 - 1) * (rand() < 0.02 ? 6 : 1); let y = 0; for (const m of M) y += m.run(x * 0.05); d[i] = y + x * 0.15; }
  } },
  scrapeStone: { seconds: 1.5, opts: { loop: true, rms: 0.16 }, fill([d], sr, rand) {
    const bp = new Biquad("bandpass", 1600, 0.7, sr);
    for (let i = 0; i < d.length; i++) d[i] = bp.run(rand() * 2 - 1) * 0.6;
    grains(d, sr, rand, 900, 1.5, 1200, 6000, 0.003, 0.6);
  } },
  scrapeWood: { seconds: 1.5, opts: { loop: true, rms: 0.15 }, fill([d], sr, rand) {
    const bp = new Biquad("bandpass", 700, 0.9, sr);
    for (let i = 0; i < d.length; i++) d[i] = bp.run(rand() * 2 - 1) * 0.6;
    for (const t of poisson(rand, 1.5, 60)) modal(d, sr, t, [[420 + 200 * rand(), 0.02, 1], [1300, 0.008, 0.4]], 0.4);
  } },
  // one-shots
  landClean: { seconds: 0.35, opts: { peak: 0.8 }, fill([d], sr) { modal(d, sr, 0, [[62, 0.18, 1], [130, 0.09, 0.5], [900, 0.02, 0.1]], 1, false); } },
  landSketchy: { seconds: 0.6, opts: { peak: 0.85 }, fill([d], sr, rand) {
    modal(d, sr, 0, [[58, 0.22, 1], [125, 0.1, 0.6], [1100, 0.03, 0.15]], 1, false);
    for (let k = 0; k < 9; k++) modal(d, sr, 0.03 + k * 0.025 + 0.01 * rand(), [[2400 + 900 * rand(), 0.02, 0.6], [5200, 0.01, 0.3]], 0.25 * (1 - k / 10), false);   // the chain / the bars rattling
  } },
  bail: { seconds: 1.0, opts: { peak: 0.9 }, fill([d], sr, rand) {
    modal(d, sr, 0, [[52, 0.3, 1], [110, 0.15, 0.7], [700, 0.04, 0.2]], 1.2, false);
    modal(d, sr, 0.09, [[75, 0.2, 1], [240, 0.06, 0.4]], 0.7, false);                       // the body, then the bike
    const bp = new Biquad("bandpass", 1500, 0.6, sr), n = Math.floor(0.8 * sr), i0 = Math.floor(0.15 * sr);
    for (let i = 0; i < n && i0 + i < d.length; i++) d[i0 + i] += bp.run(rand() * 2 - 1) * 0.35 * Math.exp(-3 * i / n);   // sliding
    for (let k = 0; k < 6; k++) modal(d, sr, 0.12 + 0.07 * k + 0.03 * rand(), [[3000 + 1500 * rand(), 0.03, 0.6]], 0.35, false);  // clatter
  } },
  knock: { seconds: 0.2, opts: { peak: 0.8 }, fill([d], sr) { modal(d, sr, 0, [[170, 0.06, 1], [420, 0.03, 0.5], [2500, 0.006, 0.25]], 1, false); } },
  clankMetal: { seconds: 0.6, opts: { peak: 0.8 }, fill([d], sr) { modal(d, sr, 0, [[1930, 0.35, 1], [3310, 0.25, 0.7], [5170, 0.15, 0.5], [210, 0.06, 0.6]], 1, false); } },
  clankStone: { seconds: 0.25, opts: { peak: 0.8 }, fill([d], sr, rand) { modal(d, sr, 0, [[900, 0.03, 1], [2300, 0.015, 0.6], [180, 0.05, 0.5]], 1, false); grains(d, sr, rand, 300, 0.08, 2000, 6000, 0.003, 0.3); } },
  clankWood: { seconds: 0.25, opts: { peak: 0.8 }, fill([d], sr) { modal(d, sr, 0, [[420, 0.06, 1], [1150, 0.025, 0.5], [160, 0.05, 0.6]], 1, false); } },
};
/** bake one recipe (its seed from its place in RECIPES: the same buffer however it is baked) */
export function bakeOne(ctx, name, seed = 7) {
  const k = Object.keys(RECIPES).indexOf(name), r = RECIPES[name];
  return bake(ctx, r.seconds, r.fill, { ...r.opts, seed: seed + 17 * k });
}
/** bake every recipe with ctx (a real AudioContext, or a stand-in { sampleRate, createBuffer }) -> { name: buffer } */
export function bakeAll(ctx, seed = 7) {
  const out = {};
  for (const name of Object.keys(RECIPES)) out[name] = bakeOne(ctx, name, seed);
  return out;
}
const ROLL_NAMES = ["asphalt", "setts", "dirt", "grass", "sand", "roots"], SCRAPE_NAMES = ["scrapeMetal", "scrapeStone", "scrapeWood"], CLANK_NAMES = ["clankMetal", "clankStone", "clankWood"];

// ------------------------------------------------------------------------------------------------ the graph
export class BikeSound {
  constructor(S = SOUND) {
    this.S = S; this.on = false; this.ctx = null; this.p = createSoundParams(); this.mem = createSoundMem(); this.ready = false;
    this.oneShot = 0; this.events = 0;
  }
  /** switch on / off (on: build once, resume; off: suspend: nothing runs on the audio thread). Call on a user gesture. */
  setOn(on, s) {
    this.on = !!on;
    if (this.on) {
      if (!this.ctx) this.init();
      this.ctx.resume?.();
      if (s) syncSoundMem(this.mem, s);
    } else if (this.ctx) { this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03); this.ctx.suspend?.(); }
    return this.on;
  }
  /** ONE BUTTON (rule 42, docs/SOUND_CITY.md): the speaker button (viewer/audio/soundGate.js) is the only switch. On:
   *  the sound starts at once (that click is the gesture) or on the first key / click if the page loaded unmuted. */
  followGate(getState) {
    const go = () => { if (!soundGate.muted && !this.on) this.setOn(true, getState()); };
    soundGate.onChange((m) => { if (m) this.setOn(false); else go(); });
    addEventListener("pointerdown", go); addEventListener("keydown", go);
    return this;
  }
  init() {
    const ctx = this.ctx = new AudioContext();
    this.buf = {}; this.bakeMs = 0; this.bakeMaxMs = 0; this.bytes = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(comp);
    // (the voices exist from the start, silent; each gets its texture when it is baked: ONE recipe per macrotask, so
    // switching the sound on never freezes a frame: ~10-40 ms each, all within about half a second)
    const voice = (name, filter = null) => {
      const src = ctx.createBufferSource(); src.loop = true; src.bake = name;
      const g = ctx.createGain(); g.gain.value = 0;
      if (filter) { const f = ctx.createBiquadFilter(); f.type = filter[0]; f.frequency.value = filter[1]; f.Q.value = filter[2]; src.connect(f).connect(g); g.f = f; }
      else src.connect(g);
      g.connect(this.master);
      return { src, g, f: g.f || null, last: -1, lastRate: -1, name };
    };
    this.roll = ROLL_NAMES.map((n) => voice(n));
    this.tickLo = voice("tickLo"); this.tickHi = voice("tickHi");
    this.chain = voice("chain");
    this.skid = voice("skid", ["bandpass", 2100, 1.2]);
    this.scrape = SCRAPE_NAMES.map((n) => voice(n));
    const loops = [...this.roll, this.tickLo, this.tickHi, this.chain, this.skid, ...this.scrape];
    this.voices = loops.length;
    // the one-shot pool: 4 persistent gains; a source per event, the oldest stolen
    this.pool = Array.from({ length: 4 }, () => { const g = ctx.createGain(); g.connect(this.master); return { g, src: null }; });
    this.ready = true;
    const queue = Object.keys(RECIPES);
    const next = () => {
      const name = queue.shift();
      if (!name) return;
      const t0 = performance.now(), b = this.buf[name] = bakeOne(ctx, name), ms = performance.now() - t0;
      this.bakeMs += ms; this.bakeMaxMs = Math.max(this.bakeMaxMs, ms); this.bytes += b.length * b.numberOfChannels * 4;
      for (const v of loops) if (v.name === name) { v.src.buffer = b; v.src.start(0, Math.random() * b.duration); }
      setTimeout(next, 0);
    };
    setTimeout(next, 0);
  }
  /** a continuous voice: gain / rate moved only when they change (no automation spam) */
  setV(vc, gain, rate, t) {
    if (Math.abs(gain - vc.last) > 0.002) { vc.g.gain.setTargetAtTime(gain, t, 0.05); vc.last = gain; }
    if (rate > 0 && Math.abs(rate - vc.lastRate) > 0.01) { vc.src.playbackRate.setTargetAtTime(rate, t, 0.05); vc.lastRate = rate; }
  }
  fire(buf, gain, rate = 1) {
    if (!buf) return;                                     // (not baked yet)
    const ctx = this.ctx, v = this.pool[this.oneShot++ % this.pool.length], t = ctx.currentTime;
    if (v.src) { try { v.src.stop(); } catch { /* ended */ } v.src.disconnect(); }
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    v.g.gain.setValueAtTime(gain, t); src.connect(v.g); src.start(t); v.src = src; this.events++;
  }
  /** once a frame (after the physics). OFF: returns at once. */
  update(s, B) {
    if (!this.on || !this.ready) return;
    const p = soundParams(s, B, this.mem, this.p, this.S), t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.S.volume, t, 0.05);
    for (let k = 0; k < 6; k++) this.setV(this.roll[k], p.roll[k], p.rollRate[k], t);
    // the ratchet: the low loop (16 /s) below 40 Hz, the high one (128 /s) above, crossfaded over 30-60 Hz
    const x = sm(30, 60, p.tickRate);
    this.setV(this.tickLo, p.tickGain * (1 - x), clamp(p.tickRate / 16, 0.1, 4), t);
    this.setV(this.tickHi, p.tickGain * x, clamp(p.tickRate / 128, 0.1, 4), t);
    this.setV(this.chain, p.chain, p.chainRate, t);
    this.setV(this.skid, p.skid, 1, t);
    if (this.skid.f && Math.abs(this.skid.f.frequency.value - p.skidF) > 1) this.skid.f.frequency.setTargetAtTime(p.skidF, t, 0.1);
    for (let k = 0; k < 3; k++) this.setV(this.scrape[k], p.scrape[k], p.scrapeRate, t);
    if (p.land === LAND.clean) this.fire(this.buf.landClean, p.landGain);
    else if (p.land === LAND.sketchy) this.fire(this.buf.landSketchy, p.landGain);
    else if (p.land === LAND.bail) this.fire(this.buf.bail, p.landGain);
    if (p.crash) this.fire(this.buf.bail, p.crash, 0.9);
    if (p.knock) this.fire(this.buf.knock, p.knock);
    if (p.clank >= 0) this.fire(this.buf[CLANK_NAMES[p.clank]], p.clankGain);
  }
}
