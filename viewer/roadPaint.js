// Road surface + paint materials (TSL) for vendor/roads/mesh/laneRoadMesh.js output.
//
// Upstream paints roads with v3/render/roads/laneRoadPaint.js, which is not vendored, so this is
// our own shader on the same mesh attributes (see the header of laneRoadMesh.js):
//
//   uv       x = station along the road (m), y = lateral offset t (m); pads: plan x/z
//   aLateral -1..1 across each driving lane            -> wheel-path polish
//   aPiece   (per-road hash phase, drain)              -> per-road tone, surface lookup
//   aEdges   (inner t, outer t, inner code, outer code) -> painted lines along the road
//   aMark    (atlas offset u, v, in-node flag, parking) -> junction markings, parking ticks
//
// Surfaces come from OSM `surface=` (CONTRACT 5.1 road meta.surface), resolved per vertex into
// an extra attribute aSurf: 0 asphalt, 1 sett (Brussels granite pavés), 2 paving stones,
// 3 unhewn cobblestone, 4 gravel / compacted. Node pads take the surface most of their roads have.
//
// Nothing here is a photo texture: all patterns are procedural, so they hold up at street level.
// Colours are LINEAR albedo (asphalt ~0.07, concrete ~0.28, granite ~0.15, road paint ~0.6).
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, positionWorld, float, vec2, vec3, mix, step, smoothstep, floor, fract, abs, min, max,
  fwidth, hash, mx_noise_float, uniform,
} from "three/tsl";

import { SURFACE, hashPhase, surfaceAttribute } from "./roadData.js";
export { SURFACE, hashPhase, surfaceAttribute };

// ---------------------------------------------------------------- shared TSL helpers

export const n3 = (x, y, z) => mx_noise_float(vec3(x, y, z));          // -1..1
export const band = (d, k) => step(float(k - 0.5), d).mul(float(1).sub(step(float(k + 0.5), d)));   // d == k

/** Stone courses: rows along `a` (length la), stones along `b` (length lb), staggered half a stone.
 *  Returns { joint 0..1, tone 0..1 per stone }. jw = joint width (m). */
export function courses(a, b, la, lb, jw, seed) {
  const ra = a.div(la), row = floor(ra), fa = fract(ra);
  const rb = b.div(lb).add(row.mul(0.5)), col = floor(rb), fb = fract(rb);
  const d = min(min(fa, fa.oneMinus()).mul(la), min(fb, fb.oneMinus()).mul(lb));
  const aa = fwidth(a).add(fwidth(b)).mul(0.7).add(0.0005);
  const sharp = float(1).sub(smoothstep(jw.mul(0.5).sub(aa), jw.mul(0.5).add(aa), d));
  const tone0 = hash(row.mul(37.13).add(col.mul(11.71)).add(seed));
  // far away a stone covers a few pixels: fade to the average (joint coverage, mid tone) instead of moiré
  const far = smoothstep(min(la, lb).mul(0.12), min(la, lb).mul(0.45), aa);
  const joint = mix(sharp, jw.div(min(la, lb)).mul(2.0), far);
  const tone = mix(tone0, float(0.5), far);
  return { joint, tone };
}

// ---------------------------------------------------------------- asphalt + paint

/**
 * @param atlas  buildLaneRoadMesh(...).atlas (or null)
 * @returns MeshStandardNodeMaterial for the asphalt part (needs attributes uv, aLateral, aPiece, aEdges, aMark, aSurf)
 */
export function asphaltMaterial(atlas) {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const P = positionWorld, x = P.x, z = P.z;
  const s = uv().x, t = uv().y;
  const lat = attribute("aLateral", "float");
  const piece = attribute("aPiece", "vec2");
  const edges = attribute("aEdges", "vec4");
  const mark = attribute("aMark", "vec4");
  const surf = attribute("aSurf", "float");
  const phase = piece.x;

  // --- asphalt: patches (old repairs), grain, wheel-path polish
  const patch = n3(x.mul(0.11), phase, z.mul(0.11));
  const grain = n3(x.mul(7.0), z.mul(7.0), 0.0);
  const speck = n3(x.mul(41.0), z.mul(41.0), 3.0);
  const wheel = smoothstep(float(0.22), float(0.0), abs(abs(lat).sub(0.5)));      // 1 on each wheel path
  let tone = float(0.068).add(patch.mul(0.016)).add(grain.mul(0.009)).add(speck.mul(0.006)).sub(wheel.mul(0.012));
  tone = tone.add(fract(phase.mul(7.31)).sub(0.5).mul(0.014));                     // each road a touch different
  const asphalt = vec3(tone.mul(0.97), tone, tone.mul(1.04));
  const asphaltRough = float(0.9).sub(wheel.mul(0.12));

  // --- setts (pavés): courses across the road, granite tones, dark joints
  const sett = courses(s, t, 0.125, 0.15, float(0.018), phase);
  // Brussels granite setts as on the owner's photos of Place de Saint-Job (2026-11-04): blue-grey to
  // brown-grey per stone, LIGHT sandy joints (were near-black), as viewer/plazas.js settsLook
  const settHue = sett.tone.mul(7.31).fract();
  const settStone = mix(vec3(0.115, 0.125, 0.14), vec3(0.2, 0.185, 0.165), settHue).mul(sett.tone.mul(0.55).add(0.72)).add(speck.mul(0.012));
  const settCol = mix(settStone, vec3(0.19, 0.18, 0.155), sett.joint);
  // --- paving stones: 20 x 10 cm concrete pavers
  const pav = courses(s, t, 0.1, 0.2, float(0.006), phase.add(5.0));
  const pavCol = mix(mix(vec3(0.2, 0.19, 0.18), vec3(0.28, 0.25, 0.22), pav.tone).add(grain.mul(0.01)), vec3(0.07, 0.065, 0.06), pav.joint);
  // --- unhewn cobbles: bigger, irregular
  const cob = courses(s.add(n3(s.mul(3.0), t.mul(3.0), 7.0).mul(0.03)), t, 0.22, 0.26, float(0.025), phase.add(9.0));
  const cobCol = mix(mix(vec3(0.12, 0.11, 0.1), vec3(0.24, 0.22, 0.19), cob.tone), vec3(0.04, 0.035, 0.03), cob.joint);
  // --- gravel / compacted
  const grav = vec3(0.24, 0.21, 0.16).add(speck.mul(0.03)).add(grain.mul(0.02));

  const k1 = band(surf, 1), k2 = band(surf, 2), k3 = band(surf, 3), k4 = band(surf, 4);
  let base = asphalt;
  base = mix(base, settCol, k1);
  base = mix(base, pavCol, k2);
  base = mix(base, cobCol, k3);
  base = mix(base, grav, k4);
  let rough = asphaltRough;
  rough = mix(rough, mix(float(0.72), float(0.95), sett.joint), k1);
  rough = mix(rough, float(0.85), k2.add(k3).add(k4));

  // --- lines along the road (aEdges)
  const aaT = fwidth(t).add(0.003);
  const line = (lineT, v) => {
    const code = floor(v.add(0.0001));
    const ph = max(v.sub(code), float(0));
    const dbl = step(float(999.5), code);
    const c1 = code.sub(dbl.mul(1000));
    const yel = step(float(499.5), c1);
    const c2 = c1.sub(yel.mul(500));
    const dash = floor(c2.add(0.5).div(50));
    const w = c2.sub(dash.mul(50)).div(100);
    const d0 = abs(t.sub(lineT));
    const d = mix(d0, abs(d0.sub(w)), dbl);                                  // double line: two strokes w apart
    const hw = w.mul(0.5);
    let on = float(1).sub(smoothstep(hw.sub(aaT), hw.add(aaT), d)).mul(step(float(0.005), w));
    // dash patterns (laneRoadMesh DASH_PATTERNS): 1 [3,5]  2 [3,9]  3 [6,12]  4 [1.5,1.5]
    const e1 = band(dash, 1), e2 = band(dash, 2), e3 = band(dash, 3), e4 = band(dash, 4);
    const onLen = e1.mul(3).add(e2.mul(3)).add(e3.mul(6)).add(e4.mul(1.5));
    const per = max(e1.mul(8).add(e2.mul(12)).add(e3.mul(18)).add(e4.mul(3)), float(1));
    const f = fract(s.div(per).sub(ph)).mul(per);
    const aaS = fwidth(s).add(0.01);
    const dashOn = smoothstep(aaS.negate(), aaS, f).mul(float(1).sub(smoothstep(onLen.sub(aaS), onLen.add(aaS), f)));
    on = on.mul(mix(float(1), dashOn, step(float(0.5), dash)));
    return { on, yel };
  };
  const li = line(edges.x, edges.z), lo = line(edges.y, edges.w);
  let paint = max(li.on, lo.on);
  const yellow = max(li.yel.mul(li.on), lo.yel.mul(lo.on));

  // --- junction markings from the signed-distance atlas
  if (atlas) {
    const r8 = atlas.format === "R8";                // compacted by the tile worker (R only, half resolution)
    const tex = new THREE.DataTexture(atlas.data, atlas.width, atlas.height, r8 ? THREE.RedFormat : THREE.RGFormat, THREE.UnsignedByteType);
    tex.unpackAlignment = 1;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    atlas.texture = tex;                     // so the viewer can dispose it when the tile unloads
    // per-tile numbers as uniforms, never JS constants: a constant is written into the WGSL, so every
    // tile would get different shader text and Windows (DXC) recompiles this ~40 KB shader (~450 ms freeze)
    const uScale = uniform(new THREE.Vector2(atlas.scale[0], atlas.scale[1]));
    const uRange = uniform(2 * atlas.range);
    const auv = vec2(x, z).mul(uScale).add(mark.xy);
    const sd = texture(tex, auv).r.sub(0.5).mul(uRange);
    const aaA = fwidth(sd).add(0.002);
    paint = max(paint, smoothstep(aaA.negate(), aaA, sd).mul(step(float(0.5), mark.z)));
  }
  // --- parking bay ticks every 5.5 m
  const fp = fract(s.div(5.5)).mul(5.5);
  const aaP = fwidth(s).add(0.005);
  paint = max(paint, float(1).sub(smoothstep(float(0.1).sub(aaP), float(0.1).add(aaP), fp)).mul(mark.w));

  // --- wear: paint is thin where traffic runs and frays in patches
  const wear = smoothstep(float(-0.65), float(-0.25), n3(x.mul(1.7), z.mul(1.7), 11.0))
    .mul(smoothstep(float(-0.8), float(-0.45), speck))
    .mul(float(1).sub(wheel.mul(0.35)));
  paint = paint.mul(wear).mul(0.92);
  const paintCol = mix(vec3(0.62, 0.62, 0.6), vec3(0.7, 0.42, 0.04), yellow);

  m.colorNode = mix(base, paintCol, paint);
  m.roughnessNode = mix(rough, float(0.62), paint);
  return m;
}

// ---------------------------------------------------------------- sidewalks, kerbs, aprons

export function concreteMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const P = positionWorld, x = P.x, z = P.z;
  const kind = attribute("aKind", "float");                 // 0 slab, 1 kerb stone, 2 apron setts
  const grain = n3(x.mul(9.0), z.mul(9.0), P.y.mul(9.0));
  // 30 x 30 cm grey concrete tiles (the usual Brussels sidewalk)
  const tiles = courses(x, z, 0.3, 0.3, float(0.006), float(2.0));
  const slab = mix(mix(vec3(0.24, 0.235, 0.225), vec3(0.32, 0.31, 0.295), tiles.tone).add(grain.mul(0.012)), vec3(0.12, 0.115, 0.11), tiles.joint);
  // kerbs: Belgian blue stone (petit granit), dark blue-grey with fossil speckle
  const kerb = vec3(0.075, 0.082, 0.095).add(grain.mul(0.012)).add(n3(x.mul(37.0), P.y.mul(37.0), z.mul(37.0)).mul(0.01));
  // roundabout apron: red-brown setts
  const ap = courses(x, z, 0.12, 0.12, float(0.012), float(4.0));
  const apron = mix(mix(vec3(0.16, 0.07, 0.045), vec3(0.24, 0.11, 0.07), ap.tone), vec3(0.05, 0.03, 0.02), ap.joint);
  const isKerb = band(kind, 1), isApron = band(kind, 2);
  m.colorNode = mix(mix(slab, kerb, isKerb), apron, isApron);
  m.roughnessNode = mix(mix(mix(float(0.88), float(0.95), tiles.joint), float(0.6), isKerb), float(0.8), isApron);
  return m;
}

export function vergeMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const P = positionWorld;
  const a = n3(P.x.mul(0.35), P.z.mul(0.35), 1.0), b = n3(P.x.mul(4.0), P.z.mul(4.0), 2.0), c = n3(P.x.mul(23.0), P.z.mul(23.0), 5.0);
  m.colorNode = mix(vec3(0.05, 0.11, 0.025), vec3(0.1, 0.16, 0.04), a.mul(0.5).add(0.5)).add(b.mul(0.012)).add(c.mul(0.015));
  return m;
}
