// Ground material for the terrain mesh.
//
// Land cover per tile is painted at load from the real OSM areas and paths of features.json into a
// 1 m/px RGBA mask (linear filtered, so edges blend over a metre or two):
//   R = woodland (wood, forest, scrub): leaf litter, moss, dark soil
//   G = paths (footway, path, cycleway, steps, pedestrian): gravel / stabilised sand, 1.6 m wide
//   B = sand (playground)                       A = water
// Everything else (gardens, verges, lawns, pitches and parks) is grass: three scales of value noise
// for patches of greener and drier grass, worn earth near the low end of slopes, clover-dark spots,
// and a fine bump. Steep ground turns to bare earth.
import * as THREE from "three/webgpu";
import { Fn, float, vec2, vec3, color, mix, smoothstep, positionWorld, normalWorld, texture, uv, clamp, max, uniform } from "three/tsl";
import { addLampLight } from "./lampLight.js";
import { noise2D, bumpNormal } from "./tslkit.js";

import { landCoverData } from "./landcover.js";
import { houseCut, cutOpacity } from "./interior/cut.js";

/** The mask as a texture; `pre` = landCoverData() already computed (e.g. by the tile worker). */
export function landCoverTexture(feats, bounds, pre) {
  const { data, W, H, areas, paths } = pre || landCoverData(feats, bounds);
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { tex, areas, paths };
}

/** The terrain material: grass by default, the mask's covers where OSM has them. */
export function groundMaterial(cover, bounds, contour) {
  const P = positionWorld;
  // tile bounds as uniforms, not constants: constants end up in the WGSL text, so each tile would compile
  // its own copy of this shader (a ~450 ms freeze per streamed tile on Windows/DXC)
  const uOrigin = uniform(new THREE.Vector2(bounds.x0, bounds.z0));
  const uInvSize = uniform(new THREE.Vector2(1 / (bounds.x1 - bounds.x0), 1 / (bounds.z1 - bounds.z0)));
  const muv = vec2(P.x, P.z).sub(uOrigin).mul(uInvSize);
  const mk = texture(cover.tex, muv);
  const xz = vec2(P.x, P.z);
  const n1 = noise2D(xz.mul(0.035)), n2 = noise2D(xz.mul(0.21).add(17.3)), n3 = noise2D(xz.mul(1.7).add(5.1));
  const fine = noise2D(xz.mul(9.0));
  // grass: lush to dry, darker clover patches, a little earth showing where worn
  let grass = mix(color(0x4a6a2a), color(0x6f8236), n1);
  grass = mix(grass, color(0x8c8a4a), smoothstep(0.62, 0.85, n2).mul(0.55));        // dry patches
  grass = mix(grass, color(0x3a5524), smoothstep(0.55, 0.8, n3).mul(0.35));         // clover / lush
  grass = grass.mul(fine.mul(0.22).add(0.89));
  const worn = smoothstep(0.78, 0.92, noise2D(xz.mul(0.09).add(3.3))).mul(0.6);
  grass = mix(grass, color(0x6b5a40), worn.mul(smoothstep(0.5, 0.75, n3)));
  // woodland floor: leaf litter, moss
  let wood = mix(color(0x3b3020), color(0x5a4a2c), n2);
  wood = mix(wood, color(0x3c5426), smoothstep(0.6, 0.85, n3).mul(0.6)).mul(fine.mul(0.3).add(0.85));
  // gravel paths, sand, water
  const gravel = mix(color(0x9a8c74), color(0xb8ab92), n3).mul(fine.mul(0.35).add(0.82));
  const sand = mix(color(0xc4ad84), color(0xd8c49c), n2).mul(fine.mul(0.2).add(0.9));
  const water = color(0x1c2a2c);
  let col = grass;
  col = mix(col, wood, mk.r);
  col = mix(col, sand, mk.b);
  col = mix(col, gravel, mk.g);
  // steep banks: bare earth
  const slope = smoothstep(float(0.9), float(0.72), normalWorld.y);
  col = mix(col, mix(color(0x6d5a40), color(0x7d6a4f), n2), slope.mul(float(1).sub(mk.g)));
  col = mix(col, water, mk.a);
  col = contour ? contour(col) : col;
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  m.colorNode = col;
  // grass blades / gravel grain as bump; water flat and glossy
  const relief = fine.mul(0.012).add(n3.mul(0.02)).mul(float(1).sub(mk.a));
  m.normalNode = bumpNormal(relief);
  m.roughnessNode = mix(mix(float(0.92), float(0.85), mk.g), float(0.08), mk.a);
  m.metalnessNode = mk.a.mul(0.5);
  // an interior cell is loaded (?interior=1): no terrain inside its house (viewer/interior/cut.js)
  if (houseCut.enabled) m.maskNode = cutOpacity(float(1), -0.08).greaterThan(0.5);
  return addLampLight(m);
}
