// THE KIT'S FADES, shared by the pieces (kitMaterials.js) and the wall that cuts its openings for them (facades.js
// wallMaterial({ kit: true })): the two must split every pixel exactly (lodFade.js ditherNoise(), same noise both sides),
// so a piece and its painted opening never show together nor leave a hole.
//   distance: the kit is whole up to KIT_FAR - KIT_BAND m from the eye (lodFade.js lodEye: the shadow pass uses the
//             VIEW camera too), dithered out over KIT_BAND m; beyond KIT_FAR only the painted façade (zero cost);
//   LOD:      LOD0 up to KIT_LOD1 - KIT_LOD_BAND, cross-fades to LOD1 over KIT_LOD_BAND m; only LOD0 casts shadows, so
//             the pieces' shadows fade out over that band too;
//   tile:     a streamed tile's kit fades in / out with the tile (the code of lodFade.js objectFade: f in [0, 1] keeps
//             n < f, f in [2, 3] keeps n >= f - 2): per instance (aKitJ.w = the tile's slot in kitFades) on the pieces, per
//             mesh (userData.kitFade)
//             on the walls.
import * as THREE from "three/webgpu";
import { uniform, float, select, saturate, length, positionWorld } from "three/tsl";
import { lodEye, ditherNoise, SMOOTH } from "../lodFade.js";
import { FadeSlots } from "../instanceStream.js";

/** the pieces' tile fades (viewer/instanceStream.js): aKitJ.w = the instance's tile slot (a fading tile changes one
 *  uniform, it never re-buckets) */
export const kitFades = new FadeSlots();

export const KIT = {
  far: uniform(115), band: uniform(30),          // kit -> painted façade (round 2: 20 -> 30 m, the glass now matches: a softer hand-over)
  lod1: uniform(28), lodBand: uniform(6),        // LOD0 -> LOD1 (40 m cost +0.5 ms GPU at street level for little: measured)
};
/** distances in JS (bucketing), with the margin the camera may move between two re-buckets */
export const kitRanges = () => ({ far: KIT.far.value, band: KIT.band.value, lod1: KIT.lod1.value, lodBand: KIT.lodBand.value });

/** 0 -> 1 across [a - w, a] */
const ramp = (d, a, w) => (SMOOTH ? saturate(d.sub(a.sub(w)).div(w.max(1e-3))) : select(d.greaterThan(a.sub(w.mul(0.5))), float(1), float(0)));

/** the per-object tile fade of the walls (userData.kitFade, default 1) */
export const wallKitFade = uniform(1).onObjectUpdate(({ object }) => object.userData.kitFade ?? 1);

/** keep n for a tile fade code f (see the header) */
export function tileKeep(f, n) {
  return select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
}

/** the kit is drawn at this pixel (distance + tile fade): the wall cuts there, the pieces draw there */
export function kitShows(fade, n = ditherNoise()) {
  const d = length(positionWorld.sub(lodEye));
  const t = ramp(d, KIT.far, KIT.band);
  return n.greaterThanEqual(t).and(tileKeep(fade, n));
}

/** the pieces' mask for LOD k (0 or 1) */
export function pieceKeep(lod, fade) {
  const n = ditherNoise();
  const d = length(positionWorld.sub(lodEye));
  const t01 = ramp(d, KIT.lod1, KIT.lodBand);
  const lodOk = lod === 0 ? n.greaterThanEqual(t01) : n.lessThan(t01);
  return kitShows(fade, n).and(lodOk);
}
export { THREE };
