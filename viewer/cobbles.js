// Old irregular cobblestone setts (pavés) for the measured squares (?roads=surface, viewer/surfaces.js part
// "square"): Place de Saint-Job, the owner's photos and site visit 2026-11-05: grey-brown worn granite, stones of
// uneven size in loose rows along the square, slightly domed, joints irregular, some darker or mossy.
//
// Procedural, TSL: a jittered grid in metres (uv = the square's own frame, x along its main axis, from
// surfaces.js), every other row shifted half a stone; the nearest and second-nearest jittered points (3 x 3 search,
// F1 / F2) give the stone (cell id) and the joint (F2 - F1 small). Per stone: tone, hue, a worn (smoother) top.
// Height = dome from the joint distance -> bump normal. EVERYTHING fades smoothly with the pixel footprint (world
// fwidth): joints become their area share, tones their mean, the bump flattens, over a long smoothstep, so there is
// no band and no popping when walking or flying across the square.
import * as THREE from "three/webgpu";
import { uv, positionWorld, attribute, float, vec2, vec3, floor, fract, mix, min, max, smoothstep, fwidth, hash, select, sqrt } from "three/tsl";
import { addLampLight } from "./lampLight.js";
import { bumpNormal, noise2D, hash2D } from "./tslkit.js";
import { n3 } from "./roadPaint.js";
import { pavingTextures, pavingSample, pavingNormal, regrade, LAYER } from "./streets/paving.js";

const SL = 0.16, SW = 0.13;           // mean stone length along the rows, width across (m)
// per-cell random in [0, 1): the sin hash on (cell, row) modulo 1024 (large cell numbers lose float precision)
const H2 = (a, b) => hash2D(vec2(fract(float(a).div(1024)).mul(1024), fract(float(b).div(1024)).mul(1024)));

export function cobbleMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  if (pavingTextures()) return texturedSquare(m);
  const P = positionWorld, f = uv();
  const fw = fwidth(P.x).add(fwidth(P.z)).mul(0.7).add(0.0003);        // pixel footprint (m), continuous
  // rows across v (each row its own stone length, 0.75 - 1.3 x), stones along u, every row shifted by a random part of a
  // stone; centres jittered a lot, so no two neighbours line up (old hand-laid setts, not a honeycomb)
  const gy = f.y.div(SW), row0 = floor(gy);
  let F1 = float(9), F2 = float(9), id = vec2(0, 0), rx = float(0), rz = float(0);
  for (let dj = -1; dj <= 1; dj++) {
    const r = row0.add(dj);
    const len = H2(r, 3.0).mul(0.55).add(0.75).mul(SL);
    const gx = f.x.div(len).add(H2(r, 9.0));
    const c0 = floor(gx);
    for (let di = -1; di <= 1; di++) {
      const c = c0.add(di);
      const h1 = H2(c, r), h2 = H2(c.add(57.0), r.add(113.0));
      const px = c.add(0.5).add(h1.sub(0.5).mul(0.8)).sub(gx).mul(len);
      const pz = r.add(0.5).add(h2.sub(0.5).mul(0.6)).sub(gy).mul(SW);
      const d = sqrt(px.mul(px).add(pz.mul(pz)));
      const closer = d.lessThan(F1);
      F2 = select(closer, F1, min(F2, d));
      id = select(closer, vec2(c, r), id);
      rx = select(closer, px, rx); rz = select(closer, pz, rz);
      F1 = min(F1, d);
    }
  }
  const edge = F2.sub(F1).mul(0.5);                                      // ~ distance to the joint (m)
  const sid = H2(id.x.add(31.0), id.y), sid2 = H2(id.x, id.y.add(71.0));
  // irregular joints, 8 - 22 mm, filled with sand and dirt; AA over the footprint, then the area share far away
  const jw = float(0.008).add(noise2D(vec2(P.x.mul(3.0), P.z.mul(3.0))).mul(0.014));
  // stones are rounded: beyond ~8 cm from their centre (a little more for long ones) the corners are joint too
  const R = float(SW * 0.6).add(H2(id.x.add(91.0), id.y).mul(0.02));
  const roundJ = smoothstep(R.sub(fw).sub(0.004), R.add(fw).add(0.004), F1);
  const sharpJoint = max(float(1).sub(smoothstep(jw.mul(0.5).sub(fw), jw.mul(0.5).add(fw), edge)), roundJ);
  const far = smoothstep(float(0.012), float(0.09), fw);                 // ~1 cm .. 9 cm per pixel: a long, soft fade
  const joint = mix(sharpJoint, float(0.24), far);
  // stones: blue-grey granite to warm brown-grey, light and dark ones, mottled; worn and dirtier at the joints
  const tone = mix(sid, float(0.5), far), hue = mix(sid2, float(0.5), far);
  const mottle = n3(P.x.mul(19.0), P.z.mul(19.0), 2.0);
  // round 2: the owner read the square as "flat brown dirt": the far mean was brown (hue mix 0.116 / 0.103 / 0.087) and
  // the joints near-black brown. Granite setts read GREY from afar, lighter than the asphalt (orthophoto: the square
  // 0.37 grey against the roads round it ~0.33), with light sandy joints (owner photos 2026-11-04, roadPaint settCol)
  let stone = mix(vec3(0.118, 0.12, 0.124), vec3(0.158, 0.146, 0.13), hue);       // blue-grey to warm grey granite
  stone = stone.mul(tone.mul(0.85).add(0.55)).add(mottle.mul(0.01));
  const dirt = n3(P.x.mul(0.45), P.z.mul(0.45), 6.0);                    // big patches: wear, shade of the trees
  stone = stone.mul(dirt.mul(0.08).add(1.0));
  const moss = smoothstep(float(0.25), float(0.65), noise2D(vec2(P.x.mul(1.3), P.z.mul(1.3))));
  const jointCol = mix(vec3(0.15, 0.138, 0.112), vec3(0.07, 0.085, 0.045), moss.mul(0.5));   // light sand, mossy in places
  m.colorNode = mix(stone, jointCol, joint);
  // worn tops smoother, joints matte
  m.roughnessNode = mix(mix(float(0.62), float(0.82), tone), float(0.97), joint);
  // domed and each a little tilted (laid by hand, settled since): 5 mm dome + up to 1.7 % slope; the bump fades out
  // with the footprint (no shimmer far away)
  const tiltX = H2(id.x.add(13.0), id.y.add(5.0)).sub(0.5).mul(0.035), tiltZ = H2(id.x.add(3.0), id.y.add(17.0)).sub(0.5).mul(0.035);
  const bumpFade = float(1).sub(smoothstep(float(0.003), float(0.025), fw));     // the bump goes first (its edges alias soonest)
  const cap = float(1).sub(F1.div(R).pow(2)).max(0);                    // rounded top
  const dome = cap.mul(0.006).add(smoothstep(float(0.0), float(0.03), edge).mul(0.002)).add(rx.mul(tiltX).add(rz.mul(tiltZ))).mul(bumpFade);
  m.normalNode = bumpNormal(dome);
  return addLampLight(m);
}

/** The measured squares from the street texture array (viewer/streets/paving.js, ?paving=old: the procedural above):
 *  the scanned old setts at 1.3 m per repeat (rows 13 cm: Place de Saint-Job's granite setts, ~11-13 x 13-15 cm in
 *  straight rows, Street View 2026), regraded to the square's light grey granite; rows along the square's own axis
 *  (uv from viewer/surfaces.js). Big patches of wear and tree shade as before (one cheap noise). */
export function texturedSquare(m) {
  const f = uv(), P = positionWorld;
  const S = pavingSample(f.x, f.y, float(LAYER.setts), float(1.3));
  const dirt = n3(P.x.mul(0.45), P.z.mul(0.45), 6.0);
  let col = regrade(S.col, "setts", [0.2, 0.196, 0.186], 0.7).mul(dirt.mul(0.08).add(1.0));
  col = col.mul(mix(float(1), S.ao, 0.5));
  m.colorNode = col;
  m.roughnessNode = S.rough.mul(1.05).min(0.97);
  m.aoNode = S.ao;
  m.normalNode = pavingNormal(S.n, f.x, f.y, float(1));
  return addLampLight(m);
}

/**
 * Tree pits (viewer/surfaces.js part "pits"): aKind 1 = the four edging slabs, Belgian blue stone like the kerbs,
 * honed, with the butt joints at both ends of each slab (uv: metres along it, metres to its far end), AA with the
 * world footprint; aKind 0 = the soil, dark earth with clods and a few leaves, darker and damper toward the stones
 * (uv: metres from the pit centre). Everything fades to its mean with the footprint.
 */
export function pitMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const P = positionWorld, f = uv(), kind = attribute("aKind", "float");
  const fw = fwidth(P.x).add(fwidth(P.z)).mul(0.7).add(0.0003);
  const far = smoothstep(float(0.01), float(0.08), fw);
  // stone: blue-grey with fossil speckle, slightly lighter on the worn top
  const grain = n3(P.x.mul(37.0), P.y.mul(37.0), P.z.mul(37.0));
  const stone = vec3(0.082, 0.088, 0.1).add(grain.mul(0.012).mul(float(1).sub(far))).add(n3(P.x.mul(3.0), P.z.mul(3.0), 4.0).mul(0.008));
  const jd = min(f.x, f.y);                                           // metres to the nearer slab end
  const joint = float(1).sub(smoothstep(float(0.005).sub(fw), float(0.005).add(fw), jd)).mul(float(1).sub(far.mul(0.8)));
  const stoneCol = mix(stone, vec3(0.02, 0.02, 0.022), joint);
  // soil: clods, specks of leaf litter, darker near the frame
  const e = max(f.x.abs(), f.y.abs());                                // 0 at the centre .. ~0.5-0.58 at the stones
  const clod = noise2D(vec2(P.x.mul(23.0), P.z.mul(23.0))), clod2 = noise2D(vec2(P.x.mul(6.0), P.z.mul(6.0)));
  const leaf = smoothstep(float(0.82), float(0.9), noise2D(vec2(P.x.mul(41.0), P.z.mul(41.0)))).mul(float(1).sub(far));
  let soil = mix(vec3(0.085, 0.064, 0.044), vec3(0.14, 0.105, 0.07), mix(clod.mul(0.6).add(clod2.mul(0.4)), float(0.5), far));
  soil = mix(soil, vec3(0.16, 0.1, 0.035), leaf.mul(0.6));
  soil = soil.mul(float(1).sub(smoothstep(float(0.3), float(0.56), e).mul(0.35)));     // damp, shaded edge
  const isStone = kind.greaterThan(0.5);
  m.colorNode = select(isStone, stoneCol, soil);
  m.roughnessNode = select(isStone, mix(float(0.8), float(0.95), joint), float(0.97));
  return addLampLight(m);
}
