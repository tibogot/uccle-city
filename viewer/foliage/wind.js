// THE SHARED WIND FIELD for every foliage system (grass, wildflowers, shrubs, hedges, ivy, window boxes). One set of
// uniforms the weather lab can drive later:
//   wind.speed (m/s, 0-20)   wind.direction (degrees, the direction the wind blows TOWARD, 0 = +x east, 90 = +z south)
//   wind.gust (0-1: how much the strength varies between gust fronts)
// What every material reads: windAt(xz) -> vec3(bendX, bendZ, gust 0..1). The bend is a LEAN FRACTION (0 = upright,
// ~0.6 = laid well over), so a 6 cm lawn blade and a 1.5 m shrub lean by the same angle, not the same metres.
//
// The field is gust fronts travelling with the wind: a tileable noise (viewer/foliage/noise.js R and G) scrolled at
// ONE rate for everyone, so you can watch a gust cross a lawn (game-engine-v1 revoGrassSystem's lesson: per-blade
// scroll rates or time-varying blend weights read as shivering, not wind). Time is our own uniform (wind.update(dt)),
// so a lab can freeze it for measurements.
import * as THREE from "three/webgpu";
import { uniform, vec2, vec3, float, clamp, mix, Fn, sin } from "three/tsl";
import { noiseAt } from "./noise.js";

export const wind = {
  speed: 4,
  direction: 30,
  gust: 0.6,
  frozen: false,
  uTime: uniform(0),
  uDir: uniform(new THREE.Vector2(1, 0)),
  uSpeed: uniform(4),
  uGust: uniform(0.6),
  uStrength: uniform(0.3),       // mean lean fraction at this speed
  uScale: uniform(1),            // gust-front size: x 1 = fronts ~40 m apart (> 1: smaller fronts); the Grass Field Lab tunes it
  uRate: uniform(1),             // gust-front travel speed (x the wind speed x 0.6 / 0.8)
  /** per frame (CPU: a handful of uniform writes) */
  update(dt) {
    if (!this.frozen) this.uTime.value += dt;
    const a = (this.direction * Math.PI) / 180;
    this.uDir.value.set(Math.cos(a), Math.sin(a));
    this.uSpeed.value = this.speed;
    this.uGust.value = this.gust;
    // lean grows with the dynamic pressure (~v^2) and saturates: 2 m/s barely moves, 8 m/s leans, 16 m/s lays over
    const v = this.speed;
    this.uStrength.value = 0.55 * (1 - Math.exp(-(v * v) / 90));
  },
};

/** TSL: the wind at world xz -> vec3(bend x, bend z, gust 0..1). Vertex or compute stage (explicit level 0). */
export const windAt = Fn(([xz]) => {
  // gust fronts ~40 m apart travel at ~0.6 x the wind speed (what you see crossing a field), a finer ~12 m ripple at 0.8
  const scroll = wind.uDir.mul(wind.uSpeed).mul(wind.uTime).mul(wind.uRate);
  const a = noiseAt(xz.sub(scroll.mul(0.6)), wind.uScale.div(160), true).r;
  const b = noiseAt(xz.sub(scroll.mul(0.8)).add(vec2(37.0, 11.0)), wind.uScale.div(48), true).g;
  const g = clamp(a.mul(0.7).add(b.mul(0.3)), 0, 1);
  // strength between gusts: (1 - gust) of the mean, up to (1 + gust) inside a front
  const k = mix(float(1), g.mul(2), wind.uGust);
  const s = wind.uStrength.mul(k);
  return vec3(wind.uDir.x.mul(s), wind.uDir.y.mul(s), g);
});

/** TSL: a small fast flutter (leaves, flower heads) 0..1 amplitude * gust, phase per object */
export const flutter = Fn(([phase, gust]) => sin(wind.uTime.mul(6.3).add(phase)).mul(gust.mul(0.6).add(0.4)).mul(wind.uStrength));
