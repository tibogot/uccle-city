// THE WEATHER STATE: what is falling now (the inputs) and what it has left behind (the surface state, simulated over
// time), as the uniforms every weather shader reads (`wx`). CPU cost: a few lines per frame, no allocation.
//
// Two kinds of numbers, after game-engine-v1's modularRoadWeather.js ("a road does not dry when the rain stops"):
//   inputs   rain (mm/h), snowfall (cm/h), temperature (C), wind (m/s + from-direction deg), cloud (0..1), visibility (m)
//            -> set directly, from a preset (crossfaded) or from live weather (viewer/weather/liveWeather.js)
//   state    wet film (0..1), puddle level (0..1), snow depth (m), slush (0..1): they BUILD UP and DECAY in update(dt),
//            at real rates x `timeScale` (the lab runs at x60..x600 so an hour of drying takes seconds)
import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";

export const wx = {
  uRain: uniform(0),            // 0..1 rain intensity (drives drops, splashes, ripples, streaks)
  uSnowFall: uniform(0),        // 0..1 snowfall intensity
  uWet: uniform(0),             // 0..1 wet film on everything exposed
  uPuddle: uniform(0),          // 0..1 puddle water level (the puddle mask threshold)
  uSnowCover: uniform(0),       // 0..1 white cover on up-facing exposed surfaces (from the depth)
  uSnowDepth: uniform(0),       // m: the volumetric layer's depth on flat open ground
  uSlush: uniform(0),           // 0..1 melting: grey, wet, translucent snow on roads
  uWind: uniform(new THREE.Vector2(0, 0)),   // m/s, world xz, the direction the air MOVES to
  uTime: uniform(0),            // s: animation time (frozen by the flicker test)
  uFrost: uniform(0),           // 0..1 hoar frost on grass / cars below 0 C with clear sky
  uIcicle: uniform(0),          // 0..1 icicle growth under eaves (cold days with snow on the roofs)
  uDrip: uniform(0),            // 0..1 drips from eaves (melting snow, or rain through the gutters)
};

/** Preset = inputs (+ a starting surface state, so a preset is a believable moment, not a cold start). */
export const WEATHER_PRESETS = {
  "clear": { rain: 0, snow: 0, temp: 14, wind: 2, windDir: 240, cloud: 0.2, vis: 30000, state: { wet: 0, puddle: 0, depth: 0 } },
  "overcast, after rain": { rain: 0, snow: 0, temp: 9, wind: 3, windDir: 230, cloud: 0.95, vis: 12000, state: { wet: 0.7, puddle: 0.55, depth: 0 } },
  "drizzle": { rain: 0.6, snow: 0, temp: 9, wind: 3, windDir: 230, cloud: 1, vis: 6000, state: { wet: 0.6, puddle: 0.3, depth: 0 } },
  "heavy rain": { rain: 9, snow: 0, temp: 11, wind: 6, windDir: 220, cloud: 1, vis: 2500, state: { wet: 1, puddle: 0.85, depth: 0 } },
  "morning mist": { rain: 0, snow: 0, temp: 4, wind: 0.5, windDir: 90, cloud: 0.4, vis: 400, state: { wet: 0.45, puddle: 0.2, depth: 0 } },
  "light snow": { rain: 0, snow: 0.6, temp: -1, wind: 2, windDir: 60, cloud: 1, vis: 3000, state: { wet: 0.2, puddle: 0, depth: 0.04 } },
  "snowstorm": { rain: 0, snow: 4, temp: -3, wind: 9, windDir: 50, cloud: 1, vis: 600, state: { wet: 0.1, puddle: 0, depth: 0.18 } },
  "deep snow, sun": { rain: 0, snow: 0, temp: -4, wind: 1, windDir: 60, cloud: 0.15, vis: 25000, state: { wet: 0, puddle: 0, depth: 0.25, icicle: 0.8 } },
  "thaw": { rain: 1.2, snow: 0, temp: 4, wind: 4, windDir: 230, cloud: 1, vis: 5000, state: { wet: 0.9, puddle: 0.5, depth: 0.12, slush: 0.7, icicle: 0.5 } },
  "blizzard (dense)": { rain: 0, snow: 8, temp: -5, wind: 12, windDir: 40, cloud: 1, vis: 250, state: { wet: 0, puddle: 0, depth: 0.22 } },
};

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const KEYS = ["rain", "snow", "temp", "wind", "windDir", "cloud", "vis"];

export class Weather {
  constructor() {
    // inputs (live; the lab's panel binds this object)
    this.input = { rain: 0, snow: 0, temp: 12, wind: 2, windDir: 240, cloud: 0.3, vis: 25000 };
    // surface state
    this.state = { wet: 0, puddle: 0, depth: 0, slush: 0, frost: 0, icicle: 0 };
    this.timeScale = 60;           // simulated seconds per real second
    this.maxDepth = 0.35;          // m: the snow layer is built for this much
    this.time = 0;
    this.frozen = false;           // the flicker test freezes animation
    this.fade = null;
  }
  /** Crossfade the inputs to a preset over `seconds` (0 = at once); the surface state jumps to the preset's. */
  setPreset(name, seconds = 4, withState = true) {
    const p = WEATHER_PRESETS[name];
    if (!p) return;
    this.fade = { from: { ...this.input }, to: p, t: 0, dur: Math.max(1e-3, seconds) };
    if (seconds <= 0) { Object.assign(this.input, Object.fromEntries(KEYS.map((k) => [k, p[k]]))); this.fade = null; }
    if (withState) Object.assign(this.state, { slush: 0, frost: 0, icicle: 0 }, p.state);
  }
  /** Rain intensity 0..1 from mm/h (0.5 drizzle .. 4 moderate .. 10+ heavy): a soft log curve. */
  static rainLevel(mmh) { return mmh <= 0 ? 0 : Math.min(1, Math.log1p(mmh) / Math.log1p(12)); }
  static snowLevel(cmh) { return cmh <= 0 ? 0 : Math.min(1, Math.log1p(cmh * 2) / Math.log1p(18)); }   // 1 = a 9 cm/h blizzard

  update(dtReal) {
    if (this.fade) {
      const f = this.fade; f.t += dtReal;
      const e = ease(Math.min(1, f.t / f.dur));
      for (const k of KEYS) this.input[k] = k === "windDir" ? f.from[k] + ((((f.to[k] - f.from[k]) % 360) + 540) % 360 - 180) * e : lerp(f.from[k], f.to[k], e);
      if (f.t >= f.dur) this.fade = null;
    }
    const I = this.input, S = this.state;
    const dt = this.frozen ? 0 : dtReal * this.timeScale;          // simulated seconds
    if (!this.frozen) this.time += dtReal;
    // precipitation type: snow below ~1 C, rain above (the inputs carry both; a warm "snow" input melts as it falls)
    const warm = I.temp > 1.0;
    const rainMMH = I.rain + (warm ? I.snow * 10 : 0);                     // 1 cm/h snow ~ 1 mm/h water
    const snowCMH = warm ? 0 : I.snow;
    // --- wetness (per simulated second). Rain wets the film fast (a few minutes of drizzle soaks a road), fills
    // puddles slower; evaporation grows with temperature, wind and sun (clear sky), much slower for puddles.
    const sun = 1 - I.cloud;
    const evap = Math.max(0.15, 0.3 + 0.06 * Math.max(0, I.temp) + 0.12 * I.wind + 1.2 * sun) / 3600;   // film per s
    if (rainMMH > 0.05) {
      S.wet = Math.min(1, S.wet + dt * (0.0025 + 0.004 * rainMMH));
      S.puddle = Math.min(1, S.puddle + dt * (0.00004 + 0.00009 * rainMMH) * (S.wet > 0.5 ? 1 : 0.2));
    } else {
      S.wet = Math.max(0, S.wet - dt * evap * (S.depth > 0.01 ? 0.3 : 1));
      S.puddle = Math.max(0, S.puddle - dt * evap * 0.25);
      S.wet = Math.max(S.wet, S.puddle * 0.6);                             // a road with puddles is still damp round them
    }
    // --- snow: accumulates (1 cm/h snowfall ~ 1 cm/h of fresh snow), melts above 0 C (degree-hour ~0.4 cm/C/h, faster
    // in rain and sun), compacts slowly
    if (snowCMH > 0) S.depth = Math.min(this.maxDepth, S.depth + dt * snowCMH / 100 / 3600);
    const melt = I.temp > 0 ? (0.004 * I.temp * (1 + 0.5 * rainMMH + sun)) / 3600 : 0;
    S.depth = Math.max(0, S.depth - dt * melt);
    S.slush = I.temp > 0.3 && S.depth > 0.002 ? Math.min(1, S.slush + dt / 900) : Math.max(0, S.slush - dt / 1800);
    if (S.depth < 0.002) S.slush = Math.max(0, S.slush - dt / 300);
    if (melt > 0 && S.depth > 0) S.wet = Math.min(1, S.wet + dt * 0.001);
    // hoar frost: below 0 C under a clear-ish sky (radiative cooling), gone above +1 C
    S.frost = I.temp < 0 && I.cloud < 0.6 ? Math.min(1, S.frost + dt / 1800) : Math.max(0, S.frost - dt / 600);

    // icicles: snow on the roofs and a frosty spell (sun melts the roof snow by day, the eaves refreeze it): grow over
    // ~4 h, gone in ~1 h above +1 C
    if (I.temp <= 0 && S.depth > 0.02) S.icicle = Math.min(1, S.icicle + dt / (4 * 3600) * (0.4 + sun));
    else if (I.temp > 1) S.icicle = Math.max(0, S.icicle - dt / 3600 * (0.5 + 0.2 * I.temp));
    // --- uniforms
    wx.uRain.value = Weather.rainLevel(rainMMH);
    wx.uSnowFall.value = Weather.snowLevel(snowCMH);
    wx.uWet.value = S.wet;
    wx.uPuddle.value = S.puddle;
    wx.uSnowDepth.value = S.depth;
    // white cover: 1 cm already hides the ground on lawns; 0.3 cm is a dusting
    wx.uSnowCover.value = Math.min(1, S.depth / 0.012);
    wx.uSlush.value = S.slush;
    wx.uFrost.value = S.frost;
    wx.uIcicle.value = S.icicle;
    wx.uDrip.value = Math.min(1, (I.temp > 0 && S.depth > 0.004 ? 0.4 + 0.15 * I.temp : 0) + (rainMMH > 0.05 ? 0.3 + 0.1 * rainMMH : 0) + (I.temp > 0 ? S.icicle * 0.5 : 0));
    const a = I.windDir * Math.PI / 180;                                    // FROM direction, deg (0 = from north, -z)
    // our axes: +x east, +z south. Wind from north blows toward +z.
    wx.uWind.value.set(-Math.sin(a) * I.wind, Math.cos(a) * I.wind);
    wx.uTime.value = this.time;
  }
  /** Visibility (m) -> fog extinction per metre (Koschmieder: V = 3.912 / beta). */
  get fogBeta() { return 3.912 / Math.max(50, this.input.vis); }
}
