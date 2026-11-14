// ?night=1: THE CITY'S NIGHT LIGHTS (docs/NIGHT_HOOKUP.md). A BOOT flag: decided once when the page loads, never
// toggled at runtime (switching the lighting model or the light set rebuilds every lit material: a freeze).
//
// This file is what the always-loaded city code imports (viewer/lampLight.js): the flag, and when it is on the
// dynamic ground layer's texture + uniforms, which the ground materials read at build time. No three.js addon, no
// node graph is created when the flag is off: the default city is unchanged. The rest lives in cityNight.js, which
// main.js imports only under the flag.
import * as THREE from "three/webgpu";
import { texture, uniform, vec2, vec3, float, positionWorld, select, smoothstep, length, cameraPosition } from "three/tsl";

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

/** irradiance (RGB, W/m2-ish like the pool's) of the dynamic ground layer at world xz; 0 outside it / flag off */
export function dynIrradiance(xz = positionWorld.xz) {
  if (!nightGround) return vec3(0);
  const G = nightGround, u = xz.sub(G.uOrigin).mul(G.uInv);
  const inside = u.x.greaterThan(0).and(u.x.lessThan(1)).and(u.y.greaterThan(0)).and(u.y.lessThan(1));
  // (a render target: v = 0 at the bottom of the ortho view = world z1)
  return select(inside, texture(G.rt.texture, vec2(u.x, float(1).sub(u.y))).rgb.mul(G.uDyn), vec3(0));
}

/** 0 within uNear0 of the camera, 1 beyond uNear1: what the lamp light MAP may still add to a wall (the pool's real
 *  lamps light the near walls, faded out over the same band: complementary, no double light) */
export function farBand() {
  if (!nightGround) return float(1);
  return smoothstep(nightGround.uNear0, nightGround.uNear1, length(positionWorld.sub(cameraPosition)));
}
