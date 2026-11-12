// impostorKit / types.js: per object type presets (grid, cell, distances, options) and the types' lighting.
// A new type = a preset here + a source (sources/*.js: object(v), sphere(v), bake materials from bake.js
// bakeMaterial) + a shade function (how its baked inputs are lit). docs/IMPOSTOR_KIT.md walks through it.
import * as THREE from "three/webgpu";
import { Fn, uniform, vec3, float, mix, step, saturate, pow, dot, normalize, positionWorld, cameraPosition, transformNormalToView } from "three/tsl";
import { treeTint } from "../../vendor/stylized-trees/stylizedTrees.js";

/** Presets. Cell px from the screen at the hand-over (Usnul's rule: ~1 texel per pixel there), research 3.2.2. */
export const TYPES = {
  // street / park trees: 16 x 16 hemi views of 64 px (56 inside a 4 px gutter): 1024^2 per variant
  // (trees: no depth out, no parallax: measured in the lab's far forest, 83k LiDAR trees, depth out on the 400-600 m ring
  //  cost +2.7 ms (frag_depth turns early-z off over a dense crown carpet) for no measurable jitter gain; the jitter
  //  meter saw no difference from parallax either, and it costs 3 taps. Both stay available per type: cars.)
  tree: { grid: 16, cell: 64, gutter: 4, ss: 4, full: false, minCell: 8,
    fade: { start: 400, band: 30, end: 1500, endBand: 300, anchorH: 6 },
    material: { blend: "bary3", parallax: 0, pdo: false, alpha: "a2c-ramp", card: "octagon", far: "ground" } },
  // parked cars (phase 4, measured in the lab's 300-car street, docs/IMPOSTOR_KIT.md §5): 12 x 12 HEMI views of 48 px
  // (a 40-px cell over a ~5 m sphere: a texel per pixel at 150 m at 1440p), baked from LOD 3 (the mesh it hands over
  // from), depth out + 1 parallax step (the side-by-side error vs the mesh 19 vs 24-26 without), hand-over 150 m over
  // 12 m (clear of the LOD 2 -> 3 switch at 130 m +-5 %), far end faded into the road from 600 to 900 m;
  // view gain 2: cars are solid, a softer coverage ramp let the background bleed in (night +28 % too bright at gain 1)
  car: { grid: 12, cell: 48, gutter: 4, ss: 4, full: false, minCell: 6,
    fade: { start: 150, band: 12, end: 900, endBand: 300, anchorH: 0.8 },
    material: { blend: "bary3", parallax: 1, pdo: true, alpha: "a2c-ramp", card: "octagon", far: "ground" },
    view: { lodBias: -1, gain: 2 } },
  prop: { grid: 8, cell: 40, gutter: 4, ss: 4, full: false, minCell: 5,
    fade: { start: 80, band: 10, end: 300, endBand: 60, anchorH: 0.6 },
    material: { blend: "bary3", parallax: 1, pdo: true, alpha: "a2c-ramp", card: "octagon", far: "ground" } },
};

/** The far fade's target: what the ground under the trees looks like (albedo, linear); `road`: under the cars. */
export const FAR = { ground: uniform(new THREE.Color(0.11, 0.13, 0.07)), road: uniform(new THREE.Color(0.045, 0.045, 0.048)) };

/**
 * The parked cars' lighting on the baked inputs (sources/fleetCars.js): viewer/drive/carPacks.js packMaterial's far
 * material (MeshStandard, opaque glass, no clear coat; the city's LOD 2-3). colour = albedo (everything but the paint)
 * + aux (the paint's shade) x inst.tint (the paint, linear). far in [0, 1]: fade into the road (FAR.road).
 */
export const carShade = ({ m, albedo, nW, aux, far, inst }) => {
  const paint = saturate(aux.mul(2.5));      // ~ the paint's share of the texel (its shade is 0.4-1 on the bodies)
  m.colorNode = mix(albedo.add(inst.tint.mul(aux)), vec3(FAR.road), far);
  // packMaterial (rich): paint 0.34 / 0.25, the rest ~0.62 / 0 (glass, chrome and rubber are sub-pixel here)
  m.roughnessNode = mix(mix(float(0.62), float(0.34), paint), float(0.9), far);
  m.metalnessNode = mix(float(0), float(0.25), paint).mul(float(1).sub(far));
  m.normalNode = transformNormalToView(normalize(mix(nW, vec3(0, 1, 0), far))).normalize();
};

/**
 * The stylized trees' leaf lighting on the baked inputs (viewer/impostors.js:244-258 / the vendor's makeLeafMaterial):
 * per-tree tint from the tree's turn and scale (the same value the mesh leaves get), light through the leaves toward
 * the sun, fill; aux = leaf flag + occlusion (>= 0.5 leaf: 0.5 + 0.5 x AO; 0.25 bark).
 * far in [0, 1]: fade the shading into the ground's (albedo, up normal, no glow), no pixel dropped.
 */
export const treeShade = (U) => ({ m, albedo, nW, aux, far, inst }) => {
  const leaf = step(0.4, aux), ao = mix(float(1), saturate(aux.sub(0.5).mul(2)), leaf);
  const tint = treeTint(vec3(inst.cy, inst.sy, inst.scl), U.tintVar);
  const alb = albedo.mul(mix(float(1), tint, leaf));
  m.colorNode = mix(alb, vec3(FAR.ground), far);
  m.aoNode = mix(ao, float(1), far);
  m.normalNode = transformNormalToView(normalize(mix(nW, vec3(0, 1, 0), far))).normalize();
  m.emissiveNode = Fn(() => {
    const V = normalize(positionWorld.sub(cameraPosition));
    const back = pow(saturate(dot(V, U.sunDir)), 4.0);
    const glow = U.transColor.mul(U.sunColor).mul(back).mul(ao.mul(ao)).mul(U.translucency);
    return glow.add(alb.mul(U.fillColor).mul(U.fill).mul(ao.mul(0.5).add(0.5))).mul(leaf).mul(float(1).sub(far));
  })();
};
