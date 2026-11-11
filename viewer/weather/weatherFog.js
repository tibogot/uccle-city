// WEATHER FOG: a cheap analytic height fog that follows the weather, for scene.fogNode (no extra pass; a few ALU per
// pixel). Two layers along the view ray, each an exponential in height integrated exactly (the same mean-density
// formula viewer/lighting.js uses):
//   air    extinction from the VISIBILITY (Koschmieder: beta = 3.912 / V), scale height uAirH (~250 m: the haze of a
//          wet day sits low over the valley); floor = uFloor (the lab: 0; the city: ~40 m TAW, Uccle's valley floor)
//   mist   a thin ground layer (scale height ~2.5 m) for morning mist in parks: uMist x slow drifting noise, densest
//          over lawns / open ground in the city (the lab: everywhere), lifts off as the day warms (the lab's slider)
// Colour: the sky's own horizon radiance (Firmament: lighting.uFogColor, live), greyed toward its luminance under a
// full cloud deck (rain / snow fog is grey, not blue). Heavy cases can still add the volumetric fog (vendor/volumetric-fog).
import * as THREE from "three/webgpu";
import { fog, float, vec3, uniform, positionWorld, cameraPosition, length, max, exp, abs, select, mix, dot, clamp } from "three/tsl";
import { noise2D } from "../tslkit.js";
import { wx } from "./weatherState.js";

export function createWeatherFog({ colorNode }) {
  const u = {
    uBeta: uniform(1.3e-4),      // air extinction per metre at the floor
    uAirH: uniform(250),
    uFloor: uniform(0),
    uMist: uniform(0),           // mist extinction per metre at the ground (0.02 = ~200 m visibility inside it)
    uMistH: uniform(2.5),
    uGrey: uniform(0),           // 0..1 grey the fog colour (overcast)
  };
  const meanExp = (ya, yb, Hs) => {
    const dy = yb.sub(ya), ea = exp(ya.div(Hs).negate()), eb = exp(yb.div(Hs).negate());
    return select(abs(dy).greaterThan(0.05), ea.sub(eb).mul(Hs).div(dy), ea);
  };
  const toFrag = positionWorld.sub(cameraPosition), dist = length(toFrag);
  const ya = max(positionWorld.y.sub(u.uFloor), 0), yb = max(cameraPosition.y.sub(u.uFloor), 0);
  const air = u.uBeta.mul(dist).mul(meanExp(ya, yb, u.uAirH));
  // the mist's patchiness: noise at the fragment and halfway along the ray, drifting with the wind
  const drift = vec3(wx.uWind.x, 0, wx.uWind.y).mul(wx.uTime).mul(0.3);
  const mid = positionWorld.add(cameraPosition).mul(0.5).add(drift);
  const patch = noise2D(mid.xz.mul(0.035)).mul(0.7).add(noise2D(positionWorld.xz.add(drift.xz).mul(0.11)).mul(0.3)).mul(1.2).add(0.2);
  const mist = u.uMist.mul(dist).mul(meanExp(ya, yb, u.uMistH)).mul(patch);
  const tau = air.add(mist);
  const amount = clamp(float(1).sub(exp(tau.negate())), 0, 1);
  const c = vec3(colorNode);
  const L = dot(c, vec3(0.2126, 0.7152, 0.0722));
  const col = mix(c, vec3(L).mul(vec3(0.94, 0.98, 1.05)), u.uGrey);
  return { node: fog(col, amount), ...u };
}
