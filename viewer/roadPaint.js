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
import { addLampLight } from "./lampLight.js";
import { filteredPulse, boxCoverage } from "./tslkit.js";

import { SURFACE, hashPhase, surfaceAttribute } from "./roadData.js";
export { SURFACE, hashPhase, surfaceAttribute };

// ---------------------------------------------------------------- shared TSL helpers

export const n3 = (x, y, z) => mx_noise_float(vec3(x, y, z));          // -1..1
export const band = (d, k) => step(float(k - 0.5), d).mul(float(1).sub(step(float(k + 0.5), d)));   // d == k

/** Stone courses: rows along `a` (length la), stones along `b` (length lb), staggered half a stone.
 *  Returns { joint 0..1, tone 0..1 per stone }. jw = joint width (m). */
export function courses(a, b, la, lb, jw, seed, fw = null) {
  const ra = a.div(la), row = floor(ra);
  const rb = b.div(lb).add(row.mul(0.5)), col = floor(rb);
  // pixel footprint in metres: `fw` (a world-space footprint, continuous across triangles whose uv frames differ),
  // else from the pattern coordinates themselves
  const w = (fw ?? fwidth(a).add(fwidth(b)).mul(0.7)).add(0.0003);
  // joints BOX-FILTERED over the footprint (tslkit filteredPulse: exact coverage, no moire, no hard band): near, a
  // crisp line; far, the joints' area share, reached smoothly as the footprint grows. The joint band is centred on
  // each stone edge. (The b footprint comes from fwidth(b), not rb, whose half-stone row offset jumps.)
  const ja = filteredPulse(ra.add(jw.div(la).mul(0.5)), float(0), jw.div(la), w.div(la));
  const jb = filteredPulse(rb.add(jw.div(lb).mul(0.5)), float(0), jw.div(lb), w.div(lb));
  const joint = float(1).sub(float(1).sub(ja).mul(float(1).sub(jb)));
  // per-stone tone, fading to the mean over a long smooth range of footprints (0.15 .. 0.9 of a stone)
  const tone0 = hash(row.mul(37.13).add(col.mul(11.71)).add(seed));
  const far = smoothstep(min(la, lb).mul(0.15), min(la, lb).mul(0.9), w);
  const tone = mix(tone0, float(0.5), far);
  return { joint, tone, far };
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
  // world space only (round 2): the tone and the repair patches used to depend on the piece (aPiece), so where two
  // pieces meet or overlap (a junction pad and its arm, an engine strip over the measured base, a narrowing) the
  // asphalt changed shade along a straight edge: the owner's darker wedge, the "faceted" junction
  const patch = n3(x.mul(0.11), float(0.37), z.mul(0.11));
  const grain = n3(x.mul(7.0), z.mul(7.0), 0.0);
  const speck = n3(x.mul(41.0), z.mul(41.0), 3.0);
  const wheel = smoothstep(float(0.22), float(0.0), abs(abs(lat).sub(0.5)));      // 1 on each wheel path
  let tone = float(0.068).add(patch.mul(0.016)).add(grain.mul(0.009)).add(speck.mul(0.006)).sub(wheel.mul(0.012));
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
  return addLampLight(m);
}

// ---------------------------------------------------------------- measured paint (decal mesh)

/** The measured paint of paint v2 (viewer/streets/measuredPaint.js paintMeshV2): crossings, stop and give-way lines,
 *  sharrows, as one decal mesh PAINT_LIFT above the street. No texture: each mark's (u, v) metres give box-filtered
 *  edges and stripes (tslkit filteredPulse / boxCoverage), so a zebra fades to its 50 % average far away instead of
 *  shimmering. Same paint colour and wear as the lines in the asphalt shader above. */
export function paintMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const P = positionWorld, x = P.x, z = P.z;
  const a = attribute("aPaint", "vec4"), e = attribute("aPaint2", "vec4");
  const u = a.x, v = a.y, kind = a.z, n = a.w;
  const fu = fwidth(u).mul(0.7).add(0.003), fv = fwidth(v).mul(0.7).add(0.003);
  const inU = boxCoverage(u, float(0), e.x, fu);
  const solid = inU.mul(boxCoverage(v, float(0), e.y, fv));
  // zebra: n bands 0.5 m wide every 1.0 m across the road (v), each running the band's width along the road (u)
  const zebra = inU.mul(filteredPulse(v, float(0), float(0.5), fv)).mul(boxCoverage(v, float(0), n.sub(0.5), fv));
  // give-way teeth: base 0.5 m on the line (u = 0), apex 0.7 m upstream, every 0.75 m
  const per = float(0.75), w = fract(v.div(per)).mul(per).sub(per.mul(0.5));
  const hw = float(0.25).mul(float(1).sub(u.div(0.7)));
  const teeth = smoothstep(fv.negate(), fv, hw.sub(abs(w))).mul(inU).mul(boxCoverage(v, float(0), e.y, fv));
  let cov = solid.mul(band(kind, 0)).add(zebra.mul(band(kind, 1))).add(teeth.mul(band(kind, 2)));
  const speck = n3(x.mul(41.0), z.mul(41.0), 3.0);
  const wear = smoothstep(float(-0.65), float(-0.25), n3(x.mul(1.7), z.mul(1.7), 11.0)).mul(smoothstep(float(-0.8), float(-0.45), speck));
  cov = cov.mul(wear).mul(0.92);
  m.colorNode = vec3(0.62, 0.62, 0.6);
  m.opacityNode = cov;
  m.roughnessNode = float(0.62);
  return addLampLight(m);
}

// ---------------------------------------------------------------- sidewalks, kerbs, aprons

/** `framed` (viewer/surfaces.js, ?roads=surface): aKind 3 = a sidewalk slab whose uv is (station along the nearest
 *  kerb, metres from it), so the tiles run along the street in one continuous pattern, and the first 15 cm from
 *  the kerb is painted as the blue-stone kerb band. */
export function concreteMaterial({ framed = false } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const P = positionWorld, x = P.x, z = P.z;
  let kind = attribute("aKind", "float");                 // 0 slab, 1 kerb stone, 2 apron setts, 3 framed slab
  const grain = n3(x.mul(9.0), z.mul(9.0), P.y.mul(9.0));
  // 30 x 30 cm grey concrete tiles (the usual Brussels sidewalk)
  let ta = x, tb = z;
  const fw = fwidth(x).add(fwidth(z)).mul(0.7);           // world footprint: the same on both sides of a frame seam
  let blend = float(0);
  if (framed) {
    const isF = band(kind, 3), f = uv(), g = attribute("aUv2", "vec2"), wB = attribute("aFrameW", "float");
    // kerb frame (station, distance) near the kerb; the polygon's own straight frame where the sidewalk is wide or the
    // kerb bends tightly (aFrameW 1): two patterns cross-faded over the vertices, no hard seam (viewer/surfaces.js)
    blend = wB.mul(isF);
    ta = mix(x, f.x, isF); tb = mix(z, f.y, isF);
    const band15 = float(1).sub(smoothstep(float(0.15).sub(fw), float(0.15).add(fw), f.y));   // kerb band, AA edge
    kind = mix(kind, band15, isF);                            // framed: kerb band (1) within 15 cm of the kerb, else slab (0)
    var tilesB = courses(g.x, g.y, 0.3, 0.3, float(0.006), float(2.0), fw);
  }
  const tilesA = courses(ta, tb, 0.3, 0.3, float(0.006), float(2.0), fw);
  const tiles = framed ? { joint: mix(tilesA.joint, tilesB.joint, blend), tone: mix(tilesA.tone, tilesB.tone, blend) } : tilesA;
  // framed slabs a touch darker and greyer (they read washed out in a low sun next to the asphalt and the houses)
  const sA = framed ? vec3(0.175, 0.172, 0.165) : vec3(0.24, 0.235, 0.225), sB = framed ? vec3(0.235, 0.228, 0.215) : vec3(0.32, 0.31, 0.295);
  const blot = n3(x.mul(0.6), z.mul(0.6), 8.0);               // low-frequency wear: keeps far sidewalks from going flat
  const slab = mix(mix(sA, sB, tiles.tone).mul(blot.mul(0.07).add(1.0)).add(grain.mul(0.012)), vec3(0.1, 0.097, 0.092), tiles.joint);
  // kerbs: Belgian blue stone (petit granit), dark blue-grey with fossil speckle
  const kerb = vec3(0.075, 0.082, 0.095).add(grain.mul(0.012)).add(n3(x.mul(37.0), P.y.mul(37.0), z.mul(37.0)).mul(0.01));
  // roundabout apron: red-brown setts
  const ap = courses(x, z, 0.12, 0.12, float(0.012), float(4.0), fw);
  const apron = mix(mix(vec3(0.16, 0.07, 0.045), vec3(0.24, 0.11, 0.07), ap.tone), vec3(0.05, 0.03, 0.02), ap.joint);
  const isKerb = band(kind, 1), isApron = band(kind, 2);
  m.colorNode = mix(mix(slab, kerb, isKerb), apron, isApron);
  // framed (?roads=surface): honed blue stone, rougher, so a kerb face toward a low sun does not flare white
  m.roughnessNode = mix(mix(mix(float(framed ? 0.92 : 0.88), float(0.95), tiles.joint), float(framed ? 0.82 : 0.6), isKerb), float(0.8), isApron);
  return addLampLight(m);
}

export function vergeMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const P = positionWorld;
  const a = n3(P.x.mul(0.35), P.z.mul(0.35), 1.0), b = n3(P.x.mul(4.0), P.z.mul(4.0), 2.0), c = n3(P.x.mul(23.0), P.z.mul(23.0), 5.0);
  m.colorNode = mix(vec3(0.05, 0.11, 0.025), vec3(0.1, 0.16, 0.04), a.mul(0.5).add(0.5)).add(b.mul(0.012)).add(c.mul(0.015));
  return addLampLight(m);
}
