// THE SHARED MATERIAL LIBRARY: named, parameterised TSL node materials for the city, the hero buildings (Royal
// Observatory, Saint-Job) and the façade kit. One function: createMaterial(name, opts). Docs: docs/MATERIALS.md;
// lab: labs/material-lab.html. Every parameter is a live uniform (material.userData.look[key].value = ...; or
// setParam(m, key, value)): no recompile when a slider moves.
//
//   const m = createMaterial("brick_red_brussels", { mapping: "world", variant: "proc" });
//   setParam(m, "dirt", 0.5);  applyChoice(m, choices.brick_red_brussels);
//
// OPTIONS (compile-time; each combination is its own shader):
//   variant   "proc" (procedural TSL, default) | "scan" (CC0 scan maps + procedural macro variation and weathering)
//             | "hybrid" (scan near the camera, procedural beyond `hybridNear` m) | "split" (the lab's A/B/C: proc |
//             scan | hybrid in screen thirds). scan / hybrid / split need loadScans() first (./scans.js) and exist
//             only for the materials with a scan (SCAN_MATERIALS).
//   mapping   "world" (planar in a world frame per face: a = along the face horizontally, b = up the face / up the
//             slope; floors: a = x, b = -z; for meshes without UVs: UrbIS walls, ground) | "uv" (the mesh's own uv
//             IN METRES: Blender assets, façade kit, curved surfaces) | "triplanar" (any shape, 3 projections, x3 cost)
//   varAttr   name of a vec4 attribute (vertex or instanced) with per-building / per-instance variation:
//             x = seed 0..1, y = brightness 0..1 (0.5 neutral), z = warm/cool 0..1 (0.5 neutral), w = age 0..1 (scales
//             wear, dirt, moss, damp, streaks; 0.5 neutral). Without it the look uniform `seed` is used.
//   heightNode a node: metres above the ground (rising damp, splash). Default positionWorld.y - look.baseY.
//   drip      a node 0..1: where rain runs off a ledge above (streaks under sills). Default: dripAttr if given, else
//             a faint 0.25 everywhere on vertical faces.
//   dripAttr  name of a vec4 attribute (x0, x1, yTop, on) in uv metres: streaks below the span x0..x1 under yTop
//             (mapping "uv" geometry; the lab's wall).
//   edgeNode  lawn_edge only: metres from the lawn's edge (default uv().y).
//
// OUTPUT: MeshStandardNodeMaterial with colorNode, roughnessNode, metalnessNode, normalNode (view space: procedural
// height -> surface-gradient bump + the scan's tangent normal), aoNode, emissiveNode (glass at night). Everything
// fades with the pixel footprint (fwidth of the world position): joints to their area share, per-unit tones to
// their mean, reliefs to flat, scans to their mean colour + macro variation. No band, no pop.
import * as THREE from "three/webgpu";
import {
  uniform, attribute, uv, positionWorld, normalWorldGeometry, normalView, cameraPosition, cameraViewMatrix, screenUV,
  float, vec2, vec3, vec4, mix, smoothstep, step, floor, fract, abs, min, max, clamp, fwidth, length, normalize, cross,
  dot, select, texture, pow, sin, exp, sign,
} from "three/tsl";
import { bumpNormal, filteredPulse } from "../tslkit.js";
import { env } from "../lighting.js";
import { SCANS } from "./scans.js";
import { n3, n01, n2, g3, H2, farK, bumpK, bond, pillow, fadeF, cells, isoLine, seams, streakNoise, woodGrain } from "./patterns.js";
import { hexSample } from "./antitile.js";

// ------------------------------------------------------------------------------------------------ parameters
// [default, min, max, step] for numbers; "#hex" (sRGB) for colours. COMMON is added to every material.
const COMMON = {
  scale: [1, 0.25, 4, 0.01],          // pattern size multiplier
  wear: [0.3, 0, 1, 0.01],            // chipped arrises, worn paint, polished tops
  dirt: [0.3, 0, 1, 0.01],            // grime: low-frequency soiling + splash zone at the base + dirt in joints
  moss: [0.1, 0, 1, 0.01],            // moss / algae on up- and north-facing parts, joints, the damp base
  damp: [0.25, 0, 1, 0.01],           // rising damp: darker base band (height 0.15 + 1.1 x damp m), salt line on masonry
  streaks: [0.3, 0, 1, 0.01],         // rain streaks under ledges (vertical faces)
  roughness: [1, 0.5, 1.5, 0.01],     // roughness multiplier
  normal: [1, 0, 2, 0.01],            // relief / normal-map strength
  macro: [0.5, 0, 1, 0.01],           // metre-scale tone variation (anti-tiling, life)
  variation: [0.5, 0, 1, 0.01],       // how much the per-instance attribute (varAttr) changes the look
  seed: [0.37, 0, 1, 0.01],           // per-material seed when there is no varAttr
  baseY: [0, -10, 200, 0.01],         // ground height (m) for damp / splash when heightNode isn't given
};
const SCANP = {
  scanTint: [0.7, 0, 1, 0.01],        // 1: the scan's detail around OUR colour (its mean -> color); 0: the raw scan
  scanScale: [1, 0.5, 2, 0.01],       // scan repeat size multiplier (on top of `scale`)
  hybridNear: [12, 2, 60, 0.5],       // (unused since 2026-11-12: "hybrid" = the anti-tiled scan; kept so saved choices load)
};

const mason = { kind: "masonry", damp: true, salt: true, streaks: true };
export const DEFS = {
  brick_red_brussels: { ...mason, label: "Red brick (Brussels)", scan: true, unit: 0.065,
    params: { color: "#8c4b3a", color2: "#62301f", mortar: "#9e978b", course: [0.065, 0.04, 0.12, 0.001], length: [0.21, 0.12, 0.32, 0.001], joint: [0.01, 0.002, 0.025, 0.0005], recess: [0.004, 0, 0.015, 0.0005], burnt: [0.08, 0, 0.5, 0.01] },
    surface: brick },
  brick_yellow: { ...mason, label: "Yellow brick", scan: true, unit: 0.065,
    params: { color: "#b8955e", color2: "#957444", mortar: "#a8a194", course: [0.065, 0.04, 0.12, 0.001], length: [0.21, 0.12, 0.32, 0.001], joint: [0.01, 0.002, 0.025, 0.0005], recess: [0.004, 0, 0.015, 0.0005], burnt: [0.03, 0, 0.5, 0.01] },
    surface: brick },
  brick_dark: { ...mason, label: "Dark brick (clinker)", scan: true, unit: 0.065,
    params: { color: "#4a2c25", color2: "#2e211e", mortar: "#6e6a63", course: [0.065, 0.04, 0.12, 0.001], length: [0.21, 0.12, 0.32, 0.001], joint: [0.01, 0.002, 0.025, 0.0005], recess: [0.003, 0, 0.015, 0.0005], burnt: [0.25, 0, 0.6, 0.01] },
    surface: brick },
  mortar: { kind: "masonry", damp: true, salt: true, streaks: true, label: "Lime mortar", unit: 0.01,
    params: { color: "#a39c8f", color2: "#8a8478" }, surface: mortar },
  stone_white: { ...mason, label: "White stone (limestone)", scan: true, unit: 0.3,
    params: { color: "#d6c8a8", color2: "#c2b392", mortar: "#d9d2c2", course: [0.32, 0.15, 0.6, 0.005], length: [0.62, 0.3, 1.2, 0.01], joint: [0.005, 0.001, 0.015, 0.0005], crust: [0.15, 0, 1, 0.01] },
    surface: stoneWhite },
  stone_blue: { ...mason, salt: false, label: "Blue stone (petit granit)", scan: true, unit: 0.25,
    params: { color: "#41454b", color2: "#7d8287", course: [0.25, 0.1, 1.0, 0.005], length: [1.0, 0.3, 2.5, 0.01], joint: [0.004, 0.0, 0.012, 0.0005], fossils: [0.5, 0, 1, 0.01], weathered: [0.35, 0, 1, 0.01] },
    surface: stoneBlue },
  render_white: { kind: "render", damp: true, salt: false, streaks: true, label: "Render, white", scan: true, unit: 0.02,
    params: { color: "#e0dcd2", color2: "#b9b4aa", cracks: [0.2, 0, 1, 0.01] }, surface: render },
  concrete_white: { kind: "render", damp: true, salt: false, streaks: true, label: "Concrete, white (cast)", unit: 0.02,
    params: { color: "#d6d3cb", color2: "#b5b1a8", cracks: [0.1, 0, 1, 0.01] }, surface: render },
  rockwork_concrete: { kind: "masonry", damp: true, salt: false, streaks: true, label: "Rockwork (cement rocaille)", unit: 0.1,
    params: { color: "#cfc2a4", color2: "#8f8470", strata: [0.5, 0, 1, 0.01] }, surface: rockwork },
  render_painted: { kind: "render", damp: true, salt: false, streaks: true, label: "Render, painted", unit: 0.02, painted: true,
    params: { color: "#d8c49b", color2: "#bdb8ad", cracks: [0.15, 0, 1, 0.01], peel: [0.06, 0, 1, 0.01] }, surface: render },
  slate: { kind: "roof", label: "Slate", scan: true, unit: 0.2,
    params: { color: "#3e434a", color2: "#4a4d45", course: [0.16, 0.1, 0.3, 0.005], length: [0.25, 0.15, 0.45, 0.005], joint: [0.004, 0.001, 0.01, 0.0005], lap: [0.012, 0, 0.02, 0.0005] },
    surface: slate },
  roof_tiles_flat_dark: { kind: "roof", label: "Roof tiles, flat dark", unit: 0.25,
    params: { color: "#35373b", color2: "#3d3a35", course: [0.26, 0.15, 0.4, 0.005], length: [0.24, 0.15, 0.4, 0.005], joint: [0.004, 0.001, 0.01, 0.0005], lap: [0.014, 0, 0.025, 0.0005] },
    surface: slate },
  roof_tiles_red: { kind: "roof", label: "Roof tiles, red (Flemish pantiles)", scan: true, unit: 0.22,
    params: { color: "#99492f", color2: "#6e3424", course: [0.3, 0.2, 0.4, 0.005], length: [0.22, 0.16, 0.3, 0.005], roll: [0.03, 0, 0.05, 0.001] },
    surface: pantiles },
  zinc_roof: { kind: "metalroof", label: "Zinc roof (standing seam)", unit: 0.45, streaks: true, scanMetal: 0.35,
    params: { color: "#868c90", color2: "#a9adb0", length: [0.45, 0.25, 0.8, 0.005], seam: [0.025, 0.0, 0.05, 0.001] },
    surface: zinc, layers: seamLayer },
  lead_roof: { kind: "metalroof", label: "Lead roof (rolls)", unit: 0.6, streaks: true, scanMetal: 0.1,
    params: { color: "#5b5f63", color2: "#a9aca6", length: [0.6, 0.3, 0.9, 0.005], seam: [0.045, 0.0, 0.07, 0.001] },
    surface: zinc, layers: seamLayer },
  copper_patina: { kind: "metalroof", label: "Copper, green patina", scan: true, unit: 0.45, streaks: true,
    params: { color: "#5f9c86", color2: "#3e7468", color3: "#b5704a", patina: [0.88, 0, 1, 0.01], length: [0.45, 0.25, 0.8, 0.005], seam: [0.02, 0.0, 0.05, 0.001] },
    surface: copper, layers: seamLayer },
  painted_metal_white: { kind: "paint", label: "Painted metal, white", unit: 0.5, streaks: true,
    params: { color: "#e6e4dd", color2: "#6b3a1e", length: [1.2, 0, 3, 0.01], course: [0.9, 0, 3, 0.01], rivets: [0.08, 0, 0.2, 0.005], rust: [0.2, 0, 1, 0.01] },
    surface: paintedMetal },
  cast_iron_green: { kind: "paint", label: "Cast iron, green paint", unit: 0.05,
    params: { color: "#1e3a2b", color2: "#24211f", gloss: [0.6, 0, 1, 0.01] }, surface: castIron },
  wood_frame_white: { kind: "wood", label: "Wood frame, white paint", unit: 0.02, painted: true,
    params: { color: "#ebe8df", color2: "#8f8a80", grainDir: [0, 0, 1, 1] }, surface: wood },
  wood_frame_dark: { kind: "wood", label: "Wood frame, dark stain", unit: 0.02,
    params: { color: "#3b2a1d", color2: "#1f150e", grainDir: [0, 0, 1, 1] }, surface: wood },
  glass_window: { kind: "glass", label: "Window glass", unit: 1,
    params: { color: "#121719", color2: "#ffc884", glow: [0.0, 0, 3, 0.01] }, surface: glass },
  cobbles: { kind: "ground", label: "Cobbles (Saint-Job setts)", scan: true, unit: 0.13,
    params: { color: "#575856", color2: "#665f55", mortar: "#4a463f", length: [0.16, 0.08, 0.3, 0.005], course: [0.13, 0.08, 0.25, 0.005], dome: [0.006, 0, 0.015, 0.0005] },
    surface: cobbles },
  paving_concrete: { kind: "ground", label: "Concrete paving (30 x 30)", scan: true, unit: 0.3,
    params: { color: "#7c7a74", color2: "#8f8b83", mortar: "#4f4d49", length: [0.3, 0.1, 0.6, 0.005], joint: [0.006, 0.001, 0.02, 0.0005], gum: [0.3, 0, 1, 0.01] },
    surface: paving },
  asphalt: { kind: "ground", label: "Asphalt", scan: true, unit: 0.01,
    params: { color: "#3c3b39", color2: "#2a2a29", patches: [0.4, 0, 1, 0.01], cracks: [0.25, 0, 1, 0.01], aggregate: [0.5, 0, 1, 0.01], wet: [0, 0, 1, 0.01] },
    surface: asphalt, layers: asphaltLayers },
  gravel_path: { kind: "ground", label: "Gravel path (dolomite)", unit: 0.012,
    params: { color: "#b3a58a", color2: "#8f8670", stone: [0.012, 0.005, 0.04, 0.001] }, surface: gravel },
  lawn_edge: { kind: "ground", label: "Lawn edge", unit: 0.01,
    params: { color: "#4d6b2b", color2: "#7d7a43", soil: "#4a3a2a", edge: [0.12, 0, 0.5, 0.005] }, surface: lawn },
};
export const MATERIAL_NAMES = Object.keys(DEFS);
export const SCAN_MATERIALS = MATERIAL_NAMES.filter((k) => DEFS[k].scan);
// stochastic scans (no regular pattern): two rotated samples blended by noise hide the repeat
const STOCHASTIC = { asphalt: true, copper_patina: true, stone_blue: false };

/** All parameter specs of a material: { key: [default, min, max, step] | "#hex" }. */
export function paramSpec(name) {
  const d = DEFS[name];
  return { ...d.params, ...COMMON, ...SCANP };
}

// ------------------------------------------------------------------------------------------------ surfaces
// c = { a, b (m, already / scale), fw (m per pixel / scale), P, N, h, U, v (variation vec4), T, B, k (scale) }
// return { col, rough, height (m), ao, joint 0..1, metal, nOff (world tangent offset, scans) }
const L = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };

function brick(c) {
  const { U, fw, P } = c;
  const k = bond(c.a, c.b, fw, { H: U.course, L: U.length, J: U.joint, seed: c.v.x.mul(97.0) });
  const fine = float(1).sub(k.far);
  let col = mix(U.color, U.color2, k.tone).mul(k.tone2.mul(0.3).add(0.85));
  const burnt = step(float(1).sub(U.burnt), k.raw2).mul(fine);                        // dark over-fired headers
  col = mix(col, U.color2.mul(0.55), burnt.mul(0.75));
  // firing clouds in a brick (5 x 10 cycles / m: soft, isotropic; each brick its own slice of the noise)
  col = col.mul(n3(c.a.mul(5.0), c.b.mul(10.0), k.raw.mul(31.0)).mul(0.07).mul(fine).mul(fadeF(fw, 10)).add(1.0));
  col = col.add(n3(P.x.mul(61.0), P.y.mul(61.0), P.z.mul(61.0)).mul(0.012).mul(fadeF(fw, 61)));
  // worn arrises: chips at the brick edges, more with wear (the chip noise fades by its own frequency, to its mean)
  const chipN = mix(float(0.4), n01(P.x.mul(47.0), P.y.mul(47.0), P.z.mul(47.0)), fadeF(fw, 47));
  const chip = float(1).sub(smoothstep(float(0.0), max(float(0.002).add(U.wear.mul(0.008)), fw.mul(1.5)), k.edge)).mul(chipN.mul(2.0).sub(0.6).clamp(0, 1)).mul(fine);
  const mortarCol = U.mortar.mul(n3(P.x.mul(37.0), P.y.mul(37.0), P.z.mul(37.0)).mul(0.06).mul(fadeF(fw, 37)).add(1.0));
  const joint = max(k.joint, chip.mul(0.6));
  col = mix(col, mortarCol, k.joint);
  col = col.mul(float(1).sub(chip.mul(0.25)));
  // relief: the brick face stands `recess` proud of the joint, analytic (no screen-space derivative outlines)
  const keep = bumpK(fw, U.course);
  const pl = pillow(k.edge, k.eg, U.recess, 0.004, fw, keep);
  const height = float(0.0004).mul(n3(c.a.mul(30.0), c.b.mul(60.0), 3.0)).mul(fadeF(fw, 60)).mul(keep);
  return { col, rough: mix(float(0.82), float(0.95), joint), height, grad: pl.grad, ao: mix(float(1), float(0.62), k.joint), joint, metal: float(0) };
}

function mortar(c) {
  const { U, fw, P } = c;
  const fine = float(1).sub(farK(fw, 0.004));
  const g = n3(P.x.mul(140.0), P.y.mul(140.0), P.z.mul(140.0)).mul(fine), g2 = n3(P.x.mul(9.0), P.y.mul(9.0), P.z.mul(9.0));
  const col = mix(U.color, U.color2, g2.mul(0.5).add(0.5)).mul(g.mul(0.08).add(1.0));
  return { col, rough: float(0.95), height: g.mul(0.0004), ao: float(1), joint: float(0.5), metal: float(0) };
}

function stoneWhite(c) {
  const { U, fw, P } = c;
  const k = bond(c.a, c.b, fw, { H: U.course, L: U.length, J: U.joint, vary: 0.6, seed: c.v.x.mul(53.0).add(3.0) });
  const fine = float(1).sub(farK(fw, 0.01));
  let col = mix(U.color, U.color2, k.tone.mul(0.7)).mul(k.tone2.mul(0.1).add(0.95));
  // oolites / shell grit, bedding planes (faint lines along the course), tool marks
  col = col.mul(n3(P.x.mul(90.0), P.y.mul(90.0), P.z.mul(90.0)).mul(0.05).mul(fadeF(fw, 90)).add(1.0));
  col = col.mul(n3(c.a.mul(0.6), c.b.mul(14.0), k.raw.mul(9.0)).mul(0.035).mul(fadeF(fw, 14)).add(1.0));
  // black gypsum crust: sheltered (down-facing, under the course's top), soot in the pores; washed white where rain runs
  const shelter = smoothstep(0.75, 0.98, k.fv).mul(float(1).sub(k.far)).add(smoothstep(-0.2, -0.7, c.N.y));
  const crust = n01(P.x.mul(1.3), P.y.mul(2.2), P.z.mul(1.3)).mul(0.6).add(shelter.mul(0.5)).mul(U.crust).clamp(0, 1);
  col = mix(col, col.mul(vec3(0.42, 0.41, 0.4)), crust.mul(0.55));
  const chip = float(1).sub(smoothstep(float(0.0), max(float(0.003).add(U.wear.mul(0.012)), fw.mul(1.5)), k.edge)).mul(n01(P.x.mul(19.0), P.y.mul(19.0), P.z.mul(19.0)).mul(2.2).sub(0.8).clamp(0, 1)).mul(float(1).sub(k.far));
  col = mix(col, U.mortar, k.joint);
  col = col.mul(float(1).sub(chip.mul(0.15)));
  const keep = bumpK(fw, 0.05);
  const pl = pillow(k.edge, k.eg, float(0.003), 0.01, fw, keep);
  const height = n3(P.x.mul(40.0), P.y.mul(40.0), P.z.mul(40.0)).mul(0.0003).mul(fadeF(fw, 40)).sub(chip.mul(0.002)).mul(keep);
  return { col, rough: mix(float(0.78), float(0.9), k.joint), height, grad: pl.grad, ao: mix(float(1), float(0.7), k.joint), joint: k.joint, metal: float(0) };
}

function stoneBlue(c) {
  const { U, fw, P } = c;
  const k = bond(c.a, c.b, fw, { H: U.course, L: U.length, J: U.joint, vary: 0.3, seed: c.v.x.mul(41.0).add(7.0) });
  const fine = fadeF(fw, 160);
  const g = n3(P.x.mul(160.0), P.y.mul(160.0), P.z.mul(160.0));
  // bush-hammered face: lighter specks where the tool bruised the stone; the 2 cm chiselled margin is smoother, darker
  const margin = float(1).sub(smoothstep(float(0.018), float(0.024), k.edge)).mul(float(1).sub(k.far));
  let col = U.color.mul(k.tone.mul(0.12).add(0.94)).mul(g.mul(0.12).mul(fine).mul(float(1).sub(margin)).add(1.0));
  // crinoid fossils: small pale discs; calcite veins: thin white lines
  const fos = smoothstep(0.78, 0.84, n01(P.x.mul(110.0), P.y.mul(110.0), P.z.mul(110.0))).mul(U.fossils);
  col = mix(col, U.color2, mix(U.fossils.mul(0.02), fos, fadeF(fw, 110)).mul(0.35));
  const vf = g3(P.x.mul(2.3), P.y.mul(4.1), P.z.mul(2.3)).add(n3(P.x.mul(11.0), P.y.mul(11.0), P.z.mul(11.0)).mul(0.08));
  const vein = isoLine(vf, 0.003, fwidth(vf).add(0.001)).mul(float(1).sub(farK(fw, 0.01))).mul(n01(P.x.mul(0.8), P.y.mul(0.8), P.z.mul(0.8)));
  col = mix(col, U.color2, vein.mul(U.fossils).mul(0.3));
  col = col.mul(float(1).sub(margin.mul(0.12)));
  // weathering: blue stone goes pale grey where the rain washes it (up-facing faces most)
  const wash = smoothstep(0.2, 0.9, c.N.y).add(0.15).mul(U.weathered).mul(n01(P.x.mul(0.9), P.y.mul(0.9), P.z.mul(0.9)).mul(0.5).add(0.6));
  col = mix(col, U.color2, wash.mul(0.7));
  col = mix(col, col.mul(0.4), k.joint);
  const keep = bumpK(fw, 0.02);
  const pl = pillow(k.edge, k.eg, float(0.002), 0.004, fw, keep);
  const height = g.mul(0.0004).mul(float(1).sub(margin)).mul(fine).mul(keep);
  return { col, rough: mix(mix(float(0.78), float(0.6), margin), float(0.9), k.joint), height, grad: pl.grad, ao: mix(float(1), float(0.6), k.joint), joint: k.joint, metal: float(0) };
}

function render(c, d) {
  const { U, fw, P } = c;
  const fine = float(1).sub(farK(fw, 0.004));
  const grain = n3(P.x.mul(110.0), P.y.mul(110.0), P.z.mul(110.0)).mul(fine);
  const trowel = n3(c.a.mul(1.7), c.b.mul(1.2), 5.0);
  let col = U.color.mul(grain.mul(0.035).add(1.0)).mul(trowel.mul(0.03).add(1.0));
  // hairline cracks (iso-lines of a stretched noise), more with `cracks`
  const cf = g3(c.a.mul(0.9), c.b.mul(0.7), 11.0).add(n3(c.a.mul(4.0), c.b.mul(4.0), 2.0).mul(0.15));
  const crack = isoLine(cf, U.cracks.mul(0.012), fwidth(cf).add(0.0005)).mul(smoothstep(0.0, 0.2, U.cracks)).mul(float(1).sub(farK(fw, 0.01)));
  col = col.mul(float(1).sub(crack.mul(0.45)));
  let height = grain.mul(0.0004).add(trowel.mul(0.0012)).sub(crack.mul(0.0008));
  if (d.painted) {
    const pf = n01(c.a.mul(2.3), c.b.mul(2.3), 21.0).add(n3(P.x.mul(14.0), P.y.mul(14.0), P.z.mul(14.0)).mul(0.08));
    const t = float(1).sub(U.peel.mul(0.45));
    const fwp = fwidth(pf).add(0.002);
    const peel = smoothstep(t.sub(fwp), t.add(fwp), pf).mul(step(0.01, U.peel));
    col = mix(col, U.color2.mul(grain.mul(0.05).add(0.95)), peel);
    height = height.add(float(1).sub(peel).mul(0.0003));
  }
  return { col, rough: mix(float(0.9), float(0.95), crack), height: height.mul(bumpK(fw, 0.01)), ao: float(1).sub(crack.mul(0.3)), joint: crack, metal: float(0) };
}

/** lapped courses running DOWN the slope: b = up the slope; the lower edge of each course sits on the one below.
 *  Analytic: { h (m), gb (dh/db) }; the step ramps over max(12 mm, 1.5 px). */
function lap(c, H, thick, fv) {
  const edgeW = max(float(0.012), c.fw.mul(1.5)).div(H);
  const t = clamp(fv.div(edgeW), 0, 1);
  const s0 = t.mul(t).mul(float(3).sub(t.mul(2)));
  const h = s0.mul(float(1).sub(fv)).mul(thick);
  const dfv = t.mul(float(1).sub(t)).mul(6).div(edgeW).mul(float(1).sub(fv)).sub(s0);
  return { h, gb: dfv.mul(thick).div(H) };
}

function slate(c) {
  const { U, fw, P } = c;
  const k = bond(c.a, c.b, fw, { H: U.course, L: U.length, J: U.joint, vary: 0.35, seed: c.v.x.mul(71.0) });
  // only the vertical gaps are joints; the course edges are the lap step (relief + a thin shadow line)
  const ju = filteredPulse(k.fu.add(k.id.x).add(U.joint.div(k.Lr).mul(0.5)), float(0), U.joint.div(k.Lr), fw.div(k.Lr));
  const lowEdge = filteredPulse(c.b.div(U.course).add(0.002), float(0), float(0.01), fw.div(U.course));
  const fine = float(1).sub(k.far);
  let col = U.color.mul(k.tone.mul(0.3).add(0.85));
  col = mix(col, U.color2, smoothstep(0.75, 0.95, k.tone2).mul(0.6));                     // greenish / rusty slates
  col = col.mul(n3(P.x.mul(30.0), P.y.mul(30.0), P.z.mul(30.0)).mul(0.04).mul(fine).add(1.0));
  // worn lower edges show the paler slate inside
  const worn = float(1).sub(smoothstep(float(0.0), float(0.006), k.fv.mul(U.course))).mul(U.wear).mul(fine);
  col = mix(col, col.mul(1.6), worn.mul(0.5));
  // lichen: small pale rosettes
  const lich = smoothstep(0.8, 0.86, n01(P.x.mul(26.0), P.y.mul(26.0), P.z.mul(26.0))).mul(U.moss).mul(fine);
  col = mix(col, L("#a9a58a"), lich.mul(0.35));
  const joint = max(ju, lowEdge.mul(0.7));
  col = mix(col, col.mul(0.35), joint);
  col = col.mul(float(1).sub(smoothstep(0.78, 1.0, k.fv).mul(0.3).mul(fine)));               // shade under the next course's edge
  const keep = bumpK(fw, U.course), lp = lap(c, U.course, U.lap, k.fv);
  return { col, rough: mix(float(0.58), float(0.85), joint.max(lich)), height: float(0), grad: vec2(0, lp.gb.mul(keep)), ao: mix(float(1), float(0.55), joint), joint, metal: float(0) };
}

function pantiles(c) {
  const { U, fw, P } = c;
  const k = bond(c.a, c.b, fw, { H: U.course, L: U.length, J: float(0.003), stagger: 0, seed: c.v.x.mul(29.0) });
  const fine = float(1).sub(k.far);
  // S profile across: a big roll and a trough, the roll of one tile over the trough of the next
  const fu = k.fu;
  const roll = sin(fu.mul(Math.PI)).pow(2.0).mul(smoothstep(0.0, 0.15, fu)).mul(smoothstep(1.0, 0.7, fu));
  const lowEdge = filteredPulse(c.b.div(U.course).add(0.003), float(0), float(0.02), fw.div(U.course));
  let col = mix(U.color, U.color2, k.tone).mul(k.tone2.mul(0.2).add(0.9));
  col = col.mul(roll.mul(0.12).add(0.92).mul(fine).add(k.far));                             // troughs hold dirt
  const lich = smoothstep(0.78, 0.84, n01(P.x.mul(6.0), P.y.mul(6.0), P.z.mul(6.0))).mul(fine);
  col = mix(col, L("#2b2620"), lich.mul(0.5).mul(U.dirt.add(0.3)));
  col = mix(col, col.mul(0.35), lowEdge);
  const keep = bumpK(fw, U.length), lp = lap(c, U.course, float(0.015), k.fv);
  const height = roll.mul(U.roll).mul(keep);                       // the roll is smooth: derivative bump is fine
  return { col, rough: mix(float(0.72), float(0.9), lowEdge), height, grad: vec2(0, lp.gb.mul(keep)), ao: mix(float(0.75), float(1), roll).mul(float(1).sub(lowEdge.mul(0.4))), joint: lowEdge.max(float(1).sub(roll).mul(0.5)), metal: float(0) };
}

function zinc(c) {
  const { U, fw, P } = c;
  const s = seams(c.a, U.length, U.seam, U.seam, fw);
  const fine = float(1).sub(farK(fw, 0.01));
  let col = U.color.mul(n3(P.x.mul(0.7), P.y.mul(0.7), P.z.mul(0.7)).mul(0.08).add(1.0)).mul(n3(P.x.mul(6.0), P.y.mul(6.0), P.z.mul(6.0)).mul(0.04).mul(fine).add(1.0));
  // white zinc-carbonate run-off along the fall line
  const run = streakNoise(c.a, c.b, 3.0).mul(U.streaks);
  col = mix(col, U.color2, run.mul(0.5));
  col = mix(col, col.mul(1.08), s.seam);
  return { col, rough: mix(float(0.42), float(0.6), run), height: float(0), grad: s.grad.mul(bumpK(fw, 0.02)), ao: mix(float(0.8), float(1), smoothstep(0.0, 0.04, s.d)), joint: float(0), metal: float(0.35) };
}

function copper(c) {
  const { U, fw, P } = c;
  const s = seams(c.a, U.length, U.seam, U.seam, fw);
  const fine = float(1).sub(farK(fw, 0.01));
  const m1 = n01(P.x.mul(1.1), P.y.mul(1.1), P.z.mul(1.1)), m2 = n01(P.x.mul(7.0), P.y.mul(7.0), P.z.mul(7.0));
  // patina where rain reaches; sheltered (down-facing, beside the seams) stays brown-black
  const shelter = smoothstep(0.0, -0.6, c.N.y).add(smoothstep(0.03, 0.0, s.d).mul(0.4));
  const pv = m1.mul(0.55).add(m2.mul(0.25).mul(fine)).add(U.patina.mul(1.1)).sub(0.55).sub(shelter.mul(0.5));
  const fwp = fwidth(pv).add(0.02);
  const pat = smoothstep(float(0.35).sub(fwp), float(0.45).add(fwp), pv);
  // verdigris: pale blue-green crust, darker green where it is thin, mottled at three scales; run-off streaks down the fall line
  const m3 = n01(c.a.mul(22.0), c.b.mul(9.0), 3.0);
  const mot = smoothstep(0.25, 0.75, m2.mul(0.5).add(m1.mul(0.3)).add(m3.mul(0.2).mul(fine)));
  const green = mix(U.color, U.color2, mix(mot, float(0.5), float(1).sub(fine).mul(0.5)));
  const streak = streakNoise(c.a, c.b, 7.0).mul(U.streaks.mul(1.5).add(0.2)).clamp(0, 1);
  const greenS = mix(green, mix(U.color2.mul(0.55), U.color.mul(1.15), m1), streak.mul(0.55));
  const raw = mix(U.color3, U.color3.mul(0.35), U.patina.mul(0.8));                         // brown-black oxide under
  const col = mix(raw, greenS, pat);
  return { col, rough: mix(float(0.38), float(0.8), pat), height: m2.mul(0.0004).mul(pat).mul(fine).mul(bumpK(fw, 0.02)), grad: s.grad.mul(bumpK(fw, 0.02)),
    ao: mix(float(0.8), float(1), smoothstep(0.0, 0.04, s.d)), joint: float(0), metal: mix(float(0.9), float(0), pat) };
}

function paintedMetal(c) {
  const { U, fw, P } = c;
  const fine = float(1).sub(farK(fw, 0.002));
  const peelN = n3(P.x.mul(160.0), P.y.mul(160.0), P.z.mul(160.0)).mul(fine);           // orange peel
  // panel seams (0 = no panels) with rivets every `rivets` m along them
  const hasP = step(0.05, U.length).mul(step(0.05, U.course));
  const pk = bond(c.a, c.b, fw, { H: max(U.course, 0.05), L: max(U.length, 0.05), J: float(0.003), stagger: 0, seed: 5.0 });
  const seam = pk.joint.mul(hasP);
  const rp = max(U.rivets, 0.01);
  const ra = fract(c.a.div(rp)).sub(0.5).mul(rp), rb = fract(c.b.div(rp)).sub(0.5).mul(rp);
  const nearSeam = float(1).sub(smoothstep(0.02, 0.03, pk.edge.add(0.0015)));
  // rivets in a row 2.5 cm inside each panel edge
  const xa = pk.fu.mul(pk.Lr), yb = pk.fv.mul(max(U.course, 0.05));
  const da = min(xa, pk.Lr.sub(xa)).sub(0.025).abs(), db = min(yb, max(U.course, 0.05).sub(yb)).sub(0.025).abs();
  const rd = min(length(vec2(da, rb)), length(vec2(ra, db)));
  const rivet = float(1).sub(smoothstep(0.004, 0.007, rd)).mul(hasP).mul(step(0.011, U.rivets)).mul(float(1).sub(farK(fw, 0.01)));
  // rust bleeding from seams and rivets, streaking down
  const rustSrc = max(rivet, seam).mul(U.rust);
  const bleed = streakNoise(c.a, c.b, 13.0).mul(nearSeam.mul(0.6).add(0.1)).mul(U.rust).mul(U.wear.add(0.3));
  let col = U.color.mul(peelN.mul(0.01).add(1.0));
  col = mix(col, U.color2, bleed.mul(0.45).add(rustSrc.mul(0.6)).clamp(0, 1));
  col = mix(col, col.mul(0.55), seam.mul(0.6));
  const height = peelN.mul(0.00015).add(rivet.mul(0.003)).sub(seam.mul(0.001)).mul(bumpK(fw, 0.01));
  return { col, rough: mix(float(0.35), float(0.75), rustSrc.add(bleed).clamp(0, 1)), height, ao: float(1).sub(seam.mul(0.3)), joint: seam, metal: float(0) };
}

function castIron(c) {
  const { U, fw, P } = c;
  const fine = float(1).sub(farK(fw, 0.004));
  const cast = n3(P.x.mul(35.0), P.y.mul(35.0), P.z.mul(35.0)).mul(fine), low = n3(P.x.mul(8.0), P.y.mul(8.0), P.z.mul(8.0));
  // edge wear from the surface curvature (the change of the normal per metre), plus noise
  const curv = length(fwidth(c.N)).div(max(fw.mul(c.k), 0.0002));
  const w = smoothstep(0.55, 0.95, curv.mul(0.04).add(n01(P.x.mul(13.0), P.y.mul(13.0), P.z.mul(13.0)).mul(0.6)).add(U.wear.mul(0.35)).sub(0.35)).mul(U.wear);
  const col = mix(U.color.mul(low.mul(0.08).add(1.0)), U.color2, w);
  return { col, rough: mix(mix(float(0.6), float(0.28), U.gloss), float(0.5), w), height: cast.mul(0.0005).add(low.mul(0.0008)).mul(bumpK(fw, 0.01)),
    ao: float(1), joint: float(0), metal: w.mul(0.6) };
}

function wood(c, d) {
  const { U, fw, P } = c;
  const along = mix(c.b, c.a, U.grainDir), across = mix(c.a, c.b, U.grainDir);
  const g = woodGrain(along, across, fw, 3.0);
  const fine = float(1).sub(farK(fw, 0.003));
  let col, rough, height = g.mul(0.00025);
  if (d.painted) {
    // paint over grain; at wear: cracks along the grain, then flakes showing grey weathered wood
    const cr = isoLine(n3(along.mul(0.8), across.mul(60.0), 4.0), U.wear.mul(0.06), float(0.02)).mul(step(0.05, U.wear)).mul(fine);
    const flake = smoothstep(0.7, 0.74, n01(along.mul(4.0), across.mul(12.0), 9.0).add(U.wear.mul(0.25))).mul(fine);
    col = mix(U.color.mul(float(1).sub(g.mul(0.025))), U.color2, max(cr.mul(0.7), flake));
    rough = mix(float(0.42), float(0.85), flake);
    height = height.sub(flake.mul(0.0003));
  } else {
    col = mix(U.color, U.color2, g.mul(0.7).add(n01(along.mul(1.5), across.mul(20.0), 2.0).mul(0.3)));
    rough = mix(float(0.48), float(0.7), U.wear.mul(n01(P.x.mul(5.0), P.y.mul(5.0), P.z.mul(5.0))));
  }
  return { col, rough, height: height.mul(bumpK(fw, 0.005)), ao: float(1), joint: float(0), metal: float(0) };
}

function glass(c) {
  const { U, P } = c;
  const film = n01(P.x.mul(3.0), P.y.mul(3.0), P.z.mul(3.0)).mul(U.dirt);
  const smear = smoothstep(0.55, 0.85, n01(P.x.mul(1.2), P.y.mul(9.0), P.z.mul(1.2))).mul(U.dirt).mul(0.5);
  // the analytic sky reflection (as facades.js: SSR on coplanar glass reflects the wall it sits in) over a dark room
  const view = normalize(cameraPosition.sub(P));
  const fres = pow(float(1).sub(abs(dot(view, c.N))), 2.0).mul(0.55).add(0.1);
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), clamp(view.y.negate().mul(2.0).add(0.4), 0.0, 1.0));
  const room = U.color.mul(n01(P.x.mul(0.7), P.y.mul(0.9), P.z.mul(0.7)).mul(0.6).add(0.7));
  const col = mix(mix(room, sky.mul(0.6), fres), L("#4a4a44"), film.mul(0.18).add(smear.mul(0.1)));
  return { col, rough: float(0.03).add(film.mul(0.12)).add(smear.mul(0.15)), height: float(0), ao: float(1), joint: float(0), metal: float(0),
    emissive: U.color2.mul(U.glow).mul(env.uNight).mul(float(1).sub(film.mul(0.3))) };
}

function cobbles(c) {
  const { U, fw, P } = c;
  const k = cells(c.a, c.b, U.length, U.course, 0.8);
  const sid = H2(k.id.x.add(31.0), k.id.y), sid2 = H2(k.id.x, k.id.y.add(71.0));
  const jw = float(0.008).add(n01(c.a.mul(3.0), P.y.mul(3.0), c.b.mul(3.0)).mul(0.014));
  const R = U.course.mul(0.6).add(H2(k.id.x.add(91.0), k.id.y).mul(0.02));
  const roundJ = smoothstep(R.sub(fw).sub(0.004), R.add(fw).add(0.004), k.F1);
  const sharp = max(float(1).sub(smoothstep(jw.mul(0.5).sub(fw), jw.mul(0.5).add(fw), k.edge)), roundJ);
  const far = smoothstep(float(0.012), float(0.09), fw);
  const joint = mix(sharp, float(0.24), far);
  const tone = mix(sid, float(0.5), far), hue = mix(sid2, float(0.5), far);
  let stone = mix(U.color, U.color2, hue).mul(tone.mul(0.45).add(0.78));
  stone = stone.add(n3(c.a.mul(19.0), 0.0, c.b.mul(19.0)).mul(0.012).mul(float(1).sub(far)));
  // worn polished tops (wear): lighter, smoother
  const top = float(1).sub(k.F1.div(R).pow(2)).max(0);
  stone = stone.mul(top.mul(U.wear).mul(0.15).mul(float(1).sub(far)).add(1.0));
  const col = mix(stone, U.mortar, joint);
  const tiltX = H2(k.id.x.add(13.0), k.id.y.add(5.0)).sub(0.5).mul(0.035), tiltZ = H2(k.id.x.add(3.0), k.id.y.add(17.0)).sub(0.5).mul(0.035);
  const bumpFade = float(1).sub(smoothstep(float(0.003), float(0.025), fw));
  // analytic: the dome 1 - (F1/R)^2 has gradient 2 (rx, rz) / R^2 (rx, rz = offset to the stone's centre); the tilt
  // plane fades to 0 at the joint (a ramp of >= 1.5 px); both flatten where the stone is outside its dome
  const inDome = step(k.F1, R).mul(float(1).sub(roundJ));
  const tiltK = smoothstep(float(0), max(float(0.012), fw.mul(1.5)), k.edge);
  const grad = vec2(k.rx, k.rz).mul(2).div(R.mul(R)).mul(U.dome).mul(inDome).sub(vec2(tiltX, tiltZ).mul(tiltK)).mul(bumpFade);
  return { col, rough: mix(mix(float(0.62), float(0.82), tone).sub(top.mul(U.wear).mul(0.15)), float(0.97), joint), height: float(0), grad, ao: mix(float(1), float(0.55), joint), joint, metal: float(0) };
}

function paving(c) {
  const { U, fw, P } = c;
  const k = bond(c.a, c.b, fw, { H: U.length, L: U.length, J: U.joint, stagger: 0, seed: c.v.x.mul(13.0) });
  const fine = float(1).sub(k.far);
  const blot = n3(c.a.mul(0.6), 0.0, c.b.mul(0.6));
  let col = mix(U.color, U.color2, k.tone).mul(blot.mul(0.07).add(1.0)).add(n3(c.a.mul(70.0), P.y.mul(70.0), c.b.mul(70.0)).mul(0.012).mul(fine));
  // chewing gum: small dark spots (Brussels pavements...)
  const gum = smoothstep(0.86, 0.9, n01(c.a.mul(7.0), 1.0, c.b.mul(7.0))).mul(U.gum).mul(fine);
  col = mix(col, col.mul(0.55), gum.mul(0.8));
  const chip = float(1).sub(smoothstep(float(0.0), float(0.002).add(U.wear.mul(0.006)), k.edge)).mul(n01(c.a.mul(31.0), 2.0, c.b.mul(31.0)).mul(2.0).sub(0.7).clamp(0, 1)).mul(fine);
  const joint = max(k.joint, chip.mul(0.5));
  col = mix(col, U.mortar, k.joint).mul(float(1).sub(chip.mul(0.2)));
  const keep = bumpK(fw, 0.05), pl = pillow(k.edge, k.eg, float(0.002), 0.004, fw, keep);
  const height = gum.mul(0.0006).sub(chip.mul(0.001)).mul(keep);
  return { col, rough: mix(float(0.88), float(0.95), joint).sub(gum.mul(0.2)), height, grad: pl.grad, ao: mix(float(1), float(0.6), k.joint), joint, metal: float(0) };
}

function asphalt(c) {
  const { U, fw, P } = c;
  const fine = fadeF(fw, 90), mid = float(1).sub(farK(fw, 0.04));
  const sp = n3(c.a.mul(90.0), 0.0, c.b.mul(90.0)).mul(fine);
  const chips = smoothstep(0.6, 0.7, n01(c.a.mul(38.0), 5.0, c.b.mul(38.0))).mul(U.aggregate).mul(fadeF(fw, 38));
  let col = U.color.mul(sp.mul(0.3).add(1.0)).mul(n3(c.a.mul(0.15), 0.0, c.b.mul(0.15)).mul(0.1).add(1.0));
  col = mix(col, col.mul(2.4), chips.mul(0.6));
  col = col.add(U.color.mul(U.aggregate.mul(0.08)).mul(float(1).sub(fadeF(fw, 38))));          // chips' share, far
  const base = { col, rough: float(0.9), height: sp.mul(0.0006).add(chips.mul(0.0008)).mul(bumpK(fw, 0.006)), ao: float(1).sub(sp.mul(0.08)), joint: float(0), metal: float(0) };
  return asphaltLayers(c, base);
}

/**
 * The asphalt's PROCEDURAL LAYERS, on the procedural base or on a scan (layering: scan base + what procedural does
 * well): repair patches (rectangles of newer, darker asphalt with a sealed seam), sealed cracks (dark glossy tar
 * lines), wet low spots (`wet` 0..1: darker, smoother; the weather lab's weatherize() adds rain on top).
 */
function asphaltLayers(c, s) {
  const { U, fw } = c;
  const mid = float(1).sub(farK(fw, 0.04));
  let col = s.col;
  const pk = bond(c.a, c.b, fw, { H: float(3.1), L: float(4.3), J: float(0.04), stagger: 0.37, seed: 11.0 });
  const on = step(float(1).sub(U.patches.mul(0.5)), pk.raw);
  const e = fw.mul(1.5).div(3.1).max(0.05);                        // patch border ramp: >= 1.5 px
  const inset = smoothstep(0.25, float(0.25).add(e), pk.fu).mul(smoothstep(0.85, float(0.85).sub(e), pk.fu))
    .mul(smoothstep(0.2, float(0.2).add(e), pk.fv)).mul(smoothstep(0.9, float(0.9).sub(e), pk.fv)).mul(on);
  col = mix(col, U.color2.mul(s.col.div(U.color.max(0.01)).clamp(0.6, 1.6)), inset.mul(0.8));    // keeps the base's grain
  const cf = g3(c.a.mul(0.45), c.b.mul(0.45), 31.0).add(n3(c.a.mul(3.0), c.b.mul(3.0), 7.0).mul(0.1));
  const crack = isoLine(cf, U.cracks.mul(0.02), fwidth(cf).mul(1.5).add(0.001)).mul(step(0.01, U.cracks)).mul(mid);
  col = mix(col, L("#0d0d0e"), crack.mul(0.8));
  // wet low spots: a 1-4 m noise field under a level set by `wet`
  const low = n2(c.a.mul(0.35), c.b.mul(0.35)).mul(0.7).add(n2(c.a.mul(1.7).add(3.1), c.b.mul(1.7)).mul(0.3));
  const wetK = smoothstep(float(0.75).sub(U.wet.mul(0.6)), float(0.8).sub(U.wet.mul(0.6)), low).mul(step(0.01, U.wet));
  col = col.mul(float(1).sub(wetK.mul(0.45)));
  const rough = mix(mix(mix(s.rough, float(0.82), inset), float(0.55), crack), float(0.08), wetK);
  return { ...s, col, rough, height: (s.height ?? float(0)).sub(crack.mul(0.001).mul(bumpK(fw, 0.006))).mul(float(1).sub(wetK)),
    nScale: float(1).sub(wetK), joint: crack, ao: s.ao };
}

function gravel(c) {
  const { U, fw, P } = c;
  const k = cells(c.a, c.b, U.stone, U.stone, 0.95);
  const far = smoothstep(U.stone.mul(0.12), U.stone.mul(0.9), fw);
  const t = mix(H2(k.id.x.add(3.0), k.id.y), float(0.5), far), t2 = mix(H2(k.id.x, k.id.y.add(19.0)), float(0.5), far);
  const fines = smoothstep(U.stone.mul(0.25), U.stone.mul(0.1), k.edge);
  let col = mix(U.color, U.color2, t2).mul(t.mul(0.4).add(0.8));
  col = mix(col, U.color2.mul(0.8), mix(fines, float(0.3), far).mul(0.6));
  const rut = n01(c.a.mul(0.25), c.b.mul(0.7), 3.0);                                         // trodden lines
  col = col.mul(rut.mul(0.12).add(0.94));
  const height = float(1).sub(k.F1.div(U.stone.mul(0.6)).pow(2)).max(0).mul(U.stone.mul(0.25)).mul(float(1).sub(smoothstep(U.stone.mul(0.05), U.stone.mul(0.3), fw)));
  return { col, rough: float(0.93), height, ao: mix(float(1), float(0.7), fines.mul(float(1).sub(far))), joint: fines, metal: float(0) };
}

function lawn(c) {
  const { U, fw, P, opts } = c;
  const fine = float(1).sub(farK(fw, 0.003));
  const blades = n3(c.a.mul(160.0), c.b.mul(60.0), 1.0).mul(fine), clump = n01(c.a.mul(1.6), 0.0, c.b.mul(1.6)), dry = n01(c.a.mul(0.35), 4.0, c.b.mul(0.35));
  let col = U.color.mul(blades.mul(0.18).add(clump.mul(0.3)).add(0.8));
  col = mix(col, U.color2, smoothstep(0.55, 0.8, dry).mul(0.6));
  // the trodden edge: soil showing through, then bare soil in the last centimetres
  const e = opts.edgeNode ?? uv().y;
  const bare = float(1).sub(smoothstep(U.edge.mul(0.3), U.edge, e.add(n3(c.a.mul(6.0), 0.0, c.b.mul(6.0)).mul(0.04))));
  col = mix(col, U.soil.mul(n3(c.a.mul(40.0), 0.0, c.b.mul(40.0)).mul(0.2).mul(fine).add(1.0)), bare);
  return { col, rough: mix(float(0.85), float(0.95), bare), height: blades.mul(0.002).mul(float(1).sub(bare)).mul(bumpK(fw, 0.01)), ao: mix(float(0.85), float(1), clump), joint: bare, metal: float(0) };
}

/** Cement rockwork (the Sauvagère's rocaille): cream render modelled as rock: strata bands, cracks, dark crevices. */
function rockwork(c) {
  const { U, fw, P } = c;
  const big = n3(P.x.mul(0.8), P.y.mul(0.8), P.z.mul(0.8)), mid = n3(P.x.mul(3.0), P.y.mul(3.0), P.z.mul(3.0)).mul(fadeF(fw, 3));
  const strata = n2(c.a.mul(0.6), c.b.mul(5.0)).mul(U.strata).mul(fadeF(fw, 5));
  const crev = smoothstep(0.25, 0.55, big.mul(0.6).add(mid.mul(0.4)).abs().oneMinus());
  const grain = n3(P.x.mul(70.0), P.y.mul(70.0), P.z.mul(70.0)).mul(fadeF(fw, 70));
  let col = mix(U.color, U.color2, crev.mul(0.7).add(strata.mul(0.25))).mul(grain.mul(0.05).add(1));
  const height = big.mul(0.03).add(mid.mul(0.008)).add(strata.mul(0.004)).add(grain.mul(0.0004)).mul(bumpK(fw, 0.05));
  return { col, rough: float(0.9), height, ao: mix(float(1), float(0.55), crev), joint: crev, metal: float(0) };
}

// ------------------------------------------------------------------------------------------------ scans
// variant "scan": a scan base (a CC0 candidate; Megascans after the owner's licence check) HEX-TILED (./antitile.js:
// no visible repeat, structured scans keep their joints aligned), tinted around OUR colour (scanTint), fading to the
// scan's mean colour only where its whole repeat is a few pixels (the mips already average the detail), + the
// procedural layers: per-tile tone (antitile), macro tone, soiling, streaks, damp, moss (finish()), per-building
// variation (varAttr), and the material's own layers (asphalt: patches, cracks, wet spots). One material near and far.
function scanSurface(name, c) {
  const S = c.scan;
  if (!S) throw new Error(`[materials] scan for ${name} not loaded (await loadScans(renderer) / loadCandidate() first)`);
  const { U, fw } = c;
  const size = float(S.meta.size_m).mul(U.scanScale);
  const st = vec2(c.a, c.b).div(size);
  const structured = !!STRUCTURED_MAT[name];
  const lat = structured ? (S.meta.lattice ?? [1, 2]) : null;
  const { A, R, n } = hexSample(S.albedo, S.nra, st, { lattice: lat, rotate: structured || NO_ROTATE[name] ? 0 : 1, rate: 1, tone: structured ? 0.07 : 0.04 });
  const mean = vec3(...S.meta.mean_albedo_linear);
  const tint = mix(vec3(1), U.color.div(mean.max(0.004)), U.scanTint);
  // fades to the mean once the whole repeat spans < ~8 px (the mips are ~1 texel there anyway; no shimmer, no repeat)
  const far = smoothstep(size.mul(0.03), size.mul(0.12), fw);
  const col = mix(A.rgb, mean, far).mul(tint);
  const nOff = c.T.mul(n.x).add(c.B.mul(n.y)).mul(float(1).sub(far));
  const ao = mix(R.a, float(1), far.mul(0.5));
  const joint = smoothstep(0.85, 0.45, R.a).mul(float(1).sub(far)).add(far.mul(0.2));
  const metal = name === "copper_patina" ? smoothstep(0.35, 0.2, A.g.sub(A.r)).mul(0.9) : float(DEFS[name].scanMetal ?? 0);
  let out = { col, rough: mix(R.b, float(S.meta.mean_roughness), far), height: float(0), ao, joint, metal, nOff };
  if (DEFS[name].layers) out = DEFS[name].layers(c, out);
  return out;
}
// which scans are STRUCTURED (offsets snap to their lattice, no rotation) vs isotropic (free offsets + rotation)
// (a structured scan whose lattice wasn't measured gets [1, 2]: whole-repeat offsets, i.e. only the per-tile tone)
const STRUCTURED_MAT = { brick_red_brussels: 1, brick_yellow: 1, brick_dark: 1, stone_white: 1, stone_blue: 1, slate: 1,
  roof_tiles_red: 1, roof_tiles_flat_dark: 1, cobbles: 1, paving_concrete: 1 };
// isotropic but directional (grain): free offsets, no rotation
const NO_ROTATE = { wood_frame_white: 1, wood_frame_dark: 1 };

/** Metal roofs on a scan: the procedural standing seams / rolls as a layer (the scans are flat sheet). */
function seamLayer(c, s) {
  const { U, fw } = c;
  const sm = seams(c.a, U.length, U.seam, U.seam, fw);
  return { ...s, col: mix(s.col, s.col.mul(1.08), sm.seam), grad: sm.grad.mul(bumpK(fw, 0.02)), ao: s.ao.mul(mix(float(0.8), float(1), smoothstep(0.0, 0.04, sm.d))) };
}

// ------------------------------------------------------------------------------------------------ frames, mapping
export function cotangentFrame(N, P, st) {
  const dp1 = P.dFdx(), dp2 = P.dFdy(), duv1 = st.dFdx(), duv2 = st.dFdy();
  const dp2perp = cross(dp2, N), dp1perp = cross(N, dp1);
  const T = dp2perp.mul(duv1.x).add(dp1perp.mul(duv2.x));
  const B = dp2perp.mul(duv1.y).add(dp1perp.mul(duv2.y));
  const inv = max(dot(T, T), dot(B, B)).inverseSqrt();
  return { T: T.mul(inv), B: B.mul(inv) };
}

function projections(mapping, N, P) {
  if (mapping === "uv") {
    const st = uv();
    const { T, B } = cotangentFrame(N, P, st);
    return [{ a: st.x, b: st.y, T, B, w: float(1) }];
  }
  if (mapping === "triplanar") {
    const w = pow(abs(N), vec3(6)), ws = w.x.add(w.y).add(w.z);
    const sx = select(N.x.lessThan(0), float(-1), float(1)), sz = select(N.z.lessThan(0), float(-1), float(1));
    return [
      { a: P.z.mul(sx).negate(), b: P.y, T: vec3(0, 0, sx.negate()), B: vec3(0, 1, 0), w: w.x.div(ws) },
      { a: P.x.mul(sz), b: P.y, T: vec3(sz, 0, 0), B: vec3(0, 1, 0), w: w.z.div(ws) },
      { a: P.x, b: P.z.negate(), T: vec3(1, 0, 0), B: vec3(0, 0, -1), w: w.y.div(ws) },
    ];
  }
  // world: per-face planar frame; T horizontal along the face, B up the face / up the slope
  const Th = cross(vec3(0, 1, 0), N), lt = length(Th);
  const T = select(lt.greaterThan(0.15), Th.div(max(lt, 0.0001)), vec3(1, 0, 0));
  const B = cross(N, T);
  return [{ a: dot(P, T), b: dot(P, B), T, B, w: float(1) }];
}

const FIELDS = ["col", "rough", "height", "ao", "joint", "metal", "nOff", "emissive", "sgW", "nScale"];
const VEC3F = { nOff: 1, emissive: 1, sgW: 1 };
function blendSurf(list) {
  if (list.length === 1) return list[0].s;
  const out = {};
  for (const f of FIELDS) {
    if (!list.some((x) => x.s[f])) continue;
    out[f] = list.reduce((acc, x) => {
      const v = x.s[f] ?? (VEC3F[f] ? vec3(0) : f === "nScale" ? float(1) : float(0));
      return acc ? acc.add(v.mul(x.w)) : v.mul(x.w);
    }, null);
  }
  return out;
}
function mixSurf(A, B, k) {
  const out = {};
  for (const f of FIELDS) {
    if (!A[f] && !B[f]) continue;
    const z = VEC3F[f] ? vec3(0) : f === "nScale" ? float(1) : float(0);
    out[f] = mix(A[f] ?? z, B[f] ?? z, k);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ weathering
function finish(def, s, ctx) {
  const { U, P, N, h, v, aW, bW } = ctx;
  let col = s.col, rough = s.rough.mul(U.roughness);
  const age = v.w.mul(2).mul(U.variation).add(float(1).sub(U.variation));                 // 0.5 -> 1
  const vert = float(1).sub(smoothstep(0.55, 0.85, abs(N.y)));
  const up = smoothstep(0.25, 0.9, N.y);
  const north = clamp(N.z.negate().mul(0.7).add(0.3), 0, 1);
  // per-instance: brightness, warm/cool
  col = col.mul(v.y.sub(0.5).mul(0.3).mul(U.variation).add(1.0));
  col = col.mul(mix(vec3(1), vec3(1.06, 1.0, 0.92), v.z.sub(0.5).mul(2.0).mul(U.variation)));
  // metre-scale variation (two octaves) - also the anti-tiling of the scans
  const m1 = n2(aW.mul(0.21), bW.mul(0.21)), m2 = n2(aW.mul(0.9).add(7.3), bW.mul(0.9));
  col = col.mul(m1.mul(0.24).add(m2.mul(0.12)).sub(0.18).mul(U.macro).add(1.0));
  if (def.kind === "glass") return { col, rough, emissive: s.emissive };
  const dirt = U.dirt.mul(age), damp = U.damp.mul(age), moss = U.moss.mul(age), streaks = U.streaks.mul(age);
  // grime: low-frequency soiling, splash zone at the base of walls, dirt settling in joints (ground) and low points
  const soil = mix(m1, m2, 0.4);
  const splash = float(1).sub(smoothstep(0.0, 0.7, h)).mul(vert);
  const grimeCol = col.mul(vec3(0.55, 0.52, 0.48));
  col = mix(col, grimeCol, dirt.mul(soil.mul(0.35).add(splash.mul(0.6)).add(s.joint.mul(def.kind === "ground" ? 0.5 : 0.15))).clamp(0, 0.9));
  // rain streaks under ledges (vertical faces)
  if (def.streaks) {
    const sk = streakNoise(aW, P.y, 1.0).mul(ctx.drip).mul(streaks).mul(vert);
    const sCol = def.kind === "metalroof" || def.kind === "paint" ? col.mul(0.8) : col.mul(vec3(0.62, 0.6, 0.57));
    col = mix(col, sCol, sk.mul(0.7));
  }
  // rising damp: darker band at the base, wavy top; a white salt line at its top on masonry
  if (def.damp) {
    const top = float(0.15).add(damp.mul(1.1)).add(n2(aW.mul(1.3), 3.0).sub(0.5).mul(0.24).mul(damp));
    const dk = float(1).sub(smoothstep(top.sub(0.15), top.add(0.03), h)).mul(smoothstep(0.0, 0.08, damp)).mul(vert);
    col = col.mul(float(1).sub(dk.mul(0.3)));
    rough = rough.mul(float(1).sub(dk.mul(0.2)));
    if (def.salt) {
      const salt = exp(h.sub(top).div(0.05).pow(2).negate()).mul(n2(aW.mul(4.0), h.mul(4.0).add(9.0))).mul(damp).mul(vert);
      col = mix(col, vec3(0.75, 0.74, 0.7), salt.mul(0.45));
    }
  }
  // moss / algae: patches favouring up-facing, north-facing, joints and the damp base
  const mN = n2(aW.mul(1.4), bW.mul(1.4)).mul(0.6).add(n2(aW.mul(6.0), bW.mul(6.0).add(5.0)).mul(0.4));
  const favour = up.mul(0.35).add(north.mul(0.2)).add(s.joint.mul(0.35)).add(splash.mul(0.25));
  const mk = smoothstep(0.62, 0.8, mN.add(favour.mul(0.5)).add(moss.mul(0.45)).sub(0.3)).mul(smoothstep(0.0, 0.05, moss));
  const mossCol = mix(vec3(0.045, 0.07, 0.022), vec3(0.09, 0.11, 0.035), m2);
  col = mix(col, mossCol, mk.mul(0.85));
  rough = mix(rough, float(0.95), mk);
  return { col, rough: rough.clamp(0.02, 1), mk, emissive: s.emissive };
}

// ------------------------------------------------------------------------------------------------ the factory
/** variant "split": the screen x (0..1) of the A|B and B|C borders (the lab moves them to leave room for its panel) */
export const splitAt = uniform(new THREE.Vector2(1 / 3, 2 / 3));
/** Uniforms for a material: { key: uniform } from paramSpec (colours as THREE.Color in the working (linear) space). */
function makeLook(name) {
  const spec = paramSpec(name), U = {};
  for (const [k, v] of Object.entries(spec)) U[k] = typeof v === "string" ? uniform(new THREE.Color(v)) : uniform(v[0]);
  return U;
}
/** A look (the live uniforms) to share between several materials of one name: createMaterial(name, { look }). */
export const createLook = makeLook;

function surfaceFor(name, variant, ctx, projs) {
  const def = DEFS[name];
  // each projection's analytic slope (dh/da, dh/db) -> a world-space surface gradient in that projection's frame
  const withSG = (s, p) => (s.grad ? { ...s, sgW: p.T.mul(s.grad.x).add(p.B.mul(s.grad.y)) } : s);
  const run = (fn) => blendSurf(projs.map((p) => ({ w: p.w, s: withSG(fn({ ...ctx, a: p.a.div(ctx.k), b: p.b.div(ctx.k), T: p.T, B: p.B }), p) })));
  const proc = () => run((c) => def.surface(c, def));
  const scan = () => run((c) => scanSurface(name, c));
  if (variant === "proc") return proc();
  if (variant === "scan" || variant === "hybrid") return scan();      // "hybrid" (2026-11-05) is now the anti-tiled scan
  // split (the old lab's A | B | C): proc | scan | scan in screen thirds
  const A = proc(), B = scan();
  const x = screenUV.x, k1 = step(splitAt.x, x);
  return mixSurf(A, B, k1);
}

/**
 * Create a library material. See the header for the options. The returned material carries
 * userData.look (the live uniforms), userData.libName, userData.variant, userData.mapping.
 */
export function createMaterial(name, opts = {}) {
  const def = DEFS[name];
  if (!def) throw new Error(`[materials] unknown material ${name}`);
  // the DEFAULT variant is the SHIPPED pick (2026-11-13: textures/scans.json, the best of procedural / CC0 scan /
  // texture factory per material, tools/texturefactory/promote.py): "scan" whenever the shipped set is loaded
  // (loadScans(renderer) before creating materials), else the live procedural. The Material Lab asks explicitly.
  let variant = opts.variant ?? (SCANS[name] ? "scan" : "proc");
  const scanData = opts.scan ?? SCANS[name];
  if (variant !== "proc" && !scanData) variant = "proc";
  if (variant === "hybrid") variant = "scan";
  const mapping = opts.mapping ?? "world";
  const U = opts.look ?? makeLook(name);
  // the shipped set's own default tint toward the library colour (factory sets: 0, their colour is the target)
  if (!opts.look && variant !== "proc" && scanData?.meta?.tint != null) U.scanTint.value = scanData.meta.tint;
  const m = new THREE.MeshStandardNodeMaterial({ side: opts.side ?? THREE.FrontSide });
  const P = positionWorld, N = normalWorldGeometry;
  const k = U.scale;
  const fw = fwidth(P.x).add(fwidth(P.y)).add(fwidth(P.z)).mul(0.6).add(0.00005).div(k);
  const v = opts.varAttr ? attribute(opts.varAttr, "vec4") : vec4(U.seed, 0.5, 0.5, 0.5);
  const h = opts.heightNode ?? P.y.sub(U.baseY);
  // the horizontal coordinate along a wall for the weathering (independent of the mapping)
  const Th = cross(vec3(0, 1, 0), N), lt = length(Th);
  const Tw = select(lt.greaterThan(0.15), Th.div(max(lt, 0.0001)), vec3(1, 0, 0));
  const aW = dot(P, Tw), bW = dot(P, cross(N, Tw));                                        // the weathering's 2D frame
  let drip = opts.drip;
  if (!drip && opts.dripAttr) {
    const d = attribute(opts.dripAttr, "vec4"), st = uv();
    const inX = smoothstep(d.x.sub(0.03), d.x.add(0.05), st.x).mul(smoothstep(d.y.add(0.03), d.y.sub(0.05), st.x));
    drip = inX.mul(step(st.y, d.z)).mul(float(1).sub(smoothstep(0.0, 2.5, d.z.sub(st.y)))).mul(d.w).add(0.15);
  }
  drip = drip ?? float(0.25);
  const ctx = { U, P, N, h, v, fw, k, aW, bW, drip, opts, scan: scanData };
  const projs = projections(mapping, N, P);
  const s = surfaceFor(name, variant, ctx, projs);
  const f = finish(def, s, ctx);
  m.colorNode = f.col;
  m.roughnessNode = f.rough;
  m.metalnessNode = s.metal ?? float(0);
  if (s.ao) m.aoNode = mix(float(1), s.ao, U.normal.min(1));
  // relief (the moss flattens it, standing water too): the ANALYTIC slope of the units (surface gradient, world ->
  // view), the scan's tangent normal, and only the small smooth noise reliefs through the derivative bump
  const flat = float(1).sub((f.mk ?? float(0)).mul(0.7)).mul(s.nScale ?? float(1)).mul(U.normal);
  const toView = (w) => cameraViewMatrix.mul(vec4(w, 0)).xyz;
  let nv = s.height ? bumpNormal(s.height.mul(k).mul(flat)) : normalView;
  if (s.sgW) nv = nv.sub(toView(s.sgW.mul(flat)));
  if (s.nOff) nv = nv.add(toView(s.nOff.mul(flat)));
  m.normalNode = s.sgW || s.nOff ? normalize(nv) : nv;
  if (f.emissive) m.emissiveNode = f.emissive;
  m.name = `lib:${name}:${variant}:${mapping}${variant !== "proc" ? ":" + (scanData.meta.id ?? "shipped") : ""}`;
  Object.assign(m.userData, { look: U, libName: name, variant, mapping, shared: true, scanId: variant !== "proc" ? (scanData.meta.id ?? "shipped") : null });
  return m;
}

/**
 * A SHIPPED set as a plain look for packed consumers that evaluate several slots in one material (the façade kit):
 * look(st, d) with st = metres (u along the face, v up) and d = { dx, dy, fw } = dFdx(st), dFdy(st), fwidth in metres,
 * taken by the caller in UNIFORM control flow (the look may run inside a per-slot branch: WGSL forbids derivatives
 * there). Returns { col, rough, ao, n } (n = tangent-space normal x, y in the u / v frame); the same hex-tiled sample,
 * far fade and tint as the "scan" variant, without finish()'s weathering (the consumer has its own). null when the
 * material has no shipped set loaded (loadScans).
 */
export function scanLook(name) {
  const S = SCANS[name];
  if (!S) return null;
  const U = makeLook(name);
  if (S.meta.tint != null) U.scanTint.value = S.meta.tint;
  const size = float(S.meta.size_m);
  const structured = !!STRUCTURED_MAT[name];
  const lat = structured ? (S.meta.lattice ?? [1, 2]) : null;
  const mean = vec3(...S.meta.mean_albedo_linear);
  return (st, d) => {
    const inv = float(1).div(size);
    const { A, R, n } = hexSample(S.albedo, S.nra, st.mul(inv), { lattice: lat, rotate: structured || NO_ROTATE[name] ? 0 : 1, rate: 1,
      tone: structured ? 0.07 : 0.04, dx: d.dx.mul(inv), dy: d.dy.mul(inv) });
    const tint = mix(vec3(1), U.color.div(mean.max(0.004)), U.scanTint);
    const far = smoothstep(size.mul(0.03), size.mul(0.12), d.fw);
    const col = mix(A.rgb, mean, far).mul(tint);
    const rough = mix(R.b, float(S.meta.mean_roughness), far);
    const ao = mix(R.a, float(1), far.mul(0.5));
    return { col, rough, ao, n: n.mul(float(1).sub(far)), metal: float(DEFS[name].scanMetal ?? 0) };
  };
}

/** Set one parameter (number or colour hex / THREE.Color). */
export function setParam(m, key, value) {
  const u = m.userData.look?.[key];
  if (!u) return;
  if (u.value?.isColor) u.value.set(value); else u.value = value;
}

/** Apply a saved choice ({ variant, mapping, params }) to a material's live parameters (variant / mapping need a new material). */
export function applyChoice(m, choice) {
  for (const [k, v] of Object.entries(choice?.params ?? {})) setParam(m, k, v);
  return m;
}

/** Current parameters of a material, as plain JSON (colours as sRGB hex). */
export function readParams(m) {
  const out = {};
  for (const [k, u] of Object.entries(m.userData.look)) out[k] = u.value?.isColor ? "#" + u.value.getHexString() : +(+u.value).toFixed(5);
  return out;
}

/** The library's default (procedural) colour, linear, for far LODs / impostors that want one flat colour. */
export function meanColour(name) {
  const p = DEFS[name].params;
  const c = new THREE.Color(p.color), c2 = new THREE.Color(p.color2 ?? p.color);
  return c.lerp(c2, 0.4);
}

/**
 * Hints for the weather lab's weatherize(material, opts) (claude/weather viewer/weather/surfaceWeather.js): it
 * rewrites a finished MeshStandardNodeMaterial's colour / roughness / normal for rain, puddles, snow, frost, so every
 * library material (proc or scan) takes the weather as one more layer:  weatherize(createMaterial(n), weatherOpts(n)).
 */
export function weatherOpts(name) {
  const kind = DEFS[name]?.kind;
  const porosity = { masonry: 0.7, render: 0.5, roof: 0.35, ground: 0.6, metalroof: 0.05, paint: 0.05, wood: 0.3, glass: 0 }[kind] ?? 0.4;
  return { porosity, puddles: kind === "ground", streaks: kind === "masonry" || kind === "render" || kind === "glass", glass: kind === "glass", snow: kind !== "glass" };
}
