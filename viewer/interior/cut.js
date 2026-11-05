// THE HOUSE CUT: where an interior cell is loaded, the city must not draw its fake windows or its terrain inside the house.
//   wall material (facades.js): the openings (window + frame, the front door) of walls inside the house's box are
//                               discarded, so the real frames, glass and door of the interior show; dithered fade in/out
//   terrain (ground.js):        discarded inside the house's footprint (the DTM under a house can be above its floor)
// The test is a box in the house frame (origin on the street face, ex along it, ez into the house), padded, so a
// neighbour's windows (>= 0.55 m from a party wall) are never cut. Only compiled in when `houseCut.enabled` is set
// before the city builds its materials (?interior=1, or the Interior Lab): zero cost otherwise.
import * as THREE from "three/webgpu";
import { Fn, uniform, float, vec2, vec3, step, positionWorld, screenCoordinate, fract, sin, dot } from "three/tsl";

export const houseCut = {
  enabled: typeof location !== "undefined" && new URLSearchParams(location.search).get("interior") === "1",
  uFrame: uniform(new THREE.Vector4(0, 0, 1, 0)),       // origin x, z; ex x, z
  uMin: uniform(new THREE.Vector3(1e9, 1e9, 1e9)),      // house-local box (x, y above sea level, z)
  uMax: uniform(new THREE.Vector3(-1e9, -1e9, -1e9)),
  uFade: uniform(0),                                     // 0 = the city's painted windows, 1 = cut
};

/** Set the house (house.json spec) the cut applies to. */
export function setHouseCut(spec) {
  const [ox, oz] = spec.frame.origin, [ex, ez] = spec.frame.ex;
  houseCut.uFrame.value.set(ox, oz, ex, ez);
  const xs = spec.footprintLocal.map((p) => p[0]), zs = spec.footprintLocal.map((p) => p[1]);
  houseCut.uMin.value.set(Math.min(...xs) - 0.25, spec.base - 1.0, Math.min(...zs) - 0.25);
  houseCut.uMax.value.set(Math.max(...xs) + 0.25, spec.top + 1.0, Math.max(...zs) + 0.25);
}

/** 1 inside the house box (padded by `pad` m), else 0. */
export const insideHouse = Fn(([P, pad]) => {
  const F = houseCut.uFrame;
  const d = vec2(P.x.sub(F.x), P.z.sub(F.y));
  const lx = dot(d, vec2(F.z, F.w)), lz = dot(d, vec2(F.w.negate(), F.z));
  const lo = houseCut.uMin, hi = houseCut.uMax;
  return step(lo.x.sub(pad), lx).mul(step(lx, hi.x.add(pad))).mul(step(lo.z.sub(pad), lz)).mul(step(lz, hi.z.add(pad)))
    .mul(step(lo.y, P.y)).mul(step(P.y, hi.y));
});

/** Opacity for a cut material: 0 where `mask` (0..1) is set inside the house, dithered by the fade. */
export function cutOpacity(mask, pad = 0.0) {
  const dither = fract(sin(dot(screenCoordinate.xy, vec2(12.9898, 78.233))).mul(43758.5453));
  const cut = step(0.5, mask).mul(insideHouse(positionWorld, float(pad))).mul(step(dither, houseCut.uFade.mul(1.0001)));
  return float(1).sub(cut);
}
