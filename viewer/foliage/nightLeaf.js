// FIX4 item 3 (docs/FIX4.md): hedge leaves under a street lamp read a saturated, bright LIME at night. The leaf palette
// (#4a6a28 privet: linear 0.069 / 0.141 / 0.021) is set for daylight, where the blue sky fills the blue channel; under a
// warm lamp (1 / 0.78 / 0.52) the blue goes to ~0 and the batwing lantern throws its peak sideways onto the hedge face
// (2-3 m from the post): 66 / 85 / 30 next to a sidewalk at 80 / 67 / 48. At night (env.uNight) the leaf colour is
// taken toward its own luminance (eyes lose colour at night: mesopic vision) and a little darker: an olive green that
// still reads as a hedge. Day: unchanged. ?hedgenight=old: off.
import { uniform, vec3, dot, mix, float } from "three/tsl";
import { env } from "../lighting.js";

export const leafNight = { desat: uniform(/[?&]hedgenight=old(&|$)/.test(location.search) ? 0 : 0.45), dark: uniform(/[?&]hedgenight=old(&|$)/.test(location.search) ? 0 : 0.3) };

/** the leaf colour at night: c (linear) toward its luminance by desat x night, darker by dark x night */
export function nightLeaf(c) {
  const n = env.uNight;
  const y = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return mix(c, vec3(y, y, y), leafNight.desat.mul(n)).mul(float(1).sub(leafNight.dark.mul(n)));
}
