// ?night=1: THE CITY'S NIGHT LIGHTS (docs/NIGHT_HOOKUP.md). A BOOT flag: decided once when the page loads, never
// toggled at runtime (switching the lighting model or the light set rebuilds every lit material: a freeze).
//
// This file is what the always-loaded city code imports (viewer/lampLight.js): the flag, and when it is on the
// dynamic ground layer's texture + uniforms, which the ground materials read at build time. No three.js addon, no
// node graph is created when the flag is off: the default city is unchanged. The rest lives in cityNight.js, which
// main.js imports only under the flag.
import * as THREE from "three/webgpu";
import { Fn, If, texture, uniform, vec2, vec3, float, positionWorld, normalWorld, normalize, select, smoothstep, length, cameraPosition } from "three/tsl";
import { createNightMap } from "./nightMap.js";

export const NIGHT = /[?&]night=1(&|$)/.test(location.search);

/** the dynamic ground layer (the far cars' low-beam / rear-light pools, groundLight.js createDynamic): a square of
 *  SIZE m round the camera, TEXEL m per texel, half float RGBA */
export const DYN = { size: 320, texel: 0.5 };

export const nightGround = NIGHT ? (() => {
  const n = Math.round(DYN.size / DYN.texel);
  const rt = new THREE.RenderTarget(n, n, { type: THREE.HalfFloatType, depthBuffer: false });
  rt.texture.magFilter = rt.texture.minFilter = THREE.LinearFilter;
  rt.texture.generateMipmaps = false;
  rt.texture.name = "night-dyn-ground";
  return {
    rt, n,
    uOrigin: uniform(new THREE.Vector2(-1e6, -1e6)),          // the layer's (x0, z0); far away until the first frame
    uInv: uniform(new THREE.Vector2(1 / DYN.size, 1 / DYN.size)),
    uDyn: uniform(0),                                         // 0 by day: the layer is not drawn then
    uNear0: uniform(40), uNear1: uniform(60),                 // m: the static lights are real pool lights up to near0, gone at near1
  };
})() : null;

// round 3, step 7: the GROUND LIGHT MAP per tile (nightMap.js, baked in nightBakeWorker.js), one layer per loaded
// full-detail tile: (2 ring + 1)^2 + 3 layers (?ring=, as main.js streams them; 1.4 MB each)
const RING = Math.max(0, Math.min(2, +(new URLSearchParams(location.search).get("ring") ?? 1)));
export const nightMap = NIGHT ? createNightMap((2 * RING + 1) ** 2 + 3) : null;

/** the static lights' ground irradiance (the per-tile map, the pool's units) at world xz: 0 by day / flag off */
export function mapIrradiance(xz = positionWorld.xz) { return nightMap ? nightMap.irradiance(xz) : vec3(0); }
/** a wall / hedge: the map at its foot (0.3 m out along its normal), fading up to `height` m, only beyond the near band
 *  (the near static lights are real pool lights there), x 0.6 (groundLight.js addSpill) */
export function mapSpill(heightAbove, height = 6) {
  if (!nightMap) return vec3(0);
  const n = normalWorld, xz = positionWorld.xz.add(normalize(vec2(n.x, n.z).add(1e-4)).mul(0.3));
  return nightMap.irradiance(xz).mul(smoothstep(float(height), float(0.5), heightAbove)).mul(farBand()).mul(0.6 / Math.PI);
}

/** irradiance (RGB, W/m2-ish like the pool's) of the dynamic ground layer at world xz; 0 outside it / flag off */
export function dynIrradiance(xz = positionWorld.xz) {
  if (!nightGround) return vec3(0);
  const G = nightGround;
  // (round 3) by day (uDyn 0) nothing is read: a uniform branch (the select read the texture on every ground fragment)
  return Fn(() => {
    const out = vec3(0).toVar();
    If(G.uDyn.greaterThan(0.0), () => {
      const u = xz.sub(G.uOrigin).mul(G.uInv);
      const inside = u.x.greaterThan(0).and(u.x.lessThan(1)).and(u.y.greaterThan(0)).and(u.y.lessThan(1));
      // (a render target: v = 0 at the bottom of the ortho view = world z1; level 0: non-uniform control flow)
      out.assign(select(inside, texture(G.rt.texture, vec2(u.x, float(1).sub(u.y))).level(0).rgb.mul(G.uDyn), vec3(0)));
    });
    return out;
  })();
}

/** 0 within uNear0 of the camera, 1 beyond uNear1: what the lamp light MAP may still add to a wall (the pool's real
 *  lamps light the near walls, faded out over the same band: complementary, no double light) */
export function farBand() {
  if (!nightGround) return float(1);
  return smoothstep(nightGround.uNear0, nightGround.uNear1, length(positionWorld.sub(cameraPosition)));
}
