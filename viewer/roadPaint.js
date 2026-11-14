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
  fwidth, hash, mx_noise_float, uniform, select,
} from "three/tsl";
import { addLampLight } from "./lampLight.js";
import { filteredPulse, boxCoverage } from "./tslkit.js";
import { pavingTextures, pavingSample, pavingNormal, regrade, LAYER } from "./streets/paving.js";
import { hash22 } from "./materials/antitile.js";
import { wxMat } from "./weather/cityWeatherize.js";   // the weather (viewer/weather/, docs/WEATHER.md "City hookup"): gated, ?weather=old none

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
  m.userData.atlas = atlas;                       // (the A/B in debug/pavingShots.js rebuilds it)
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
  const speck = n3(x.mul(41.0), z.mul(41.0), 3.0);
  const wheel = smoothstep(float(0.22), float(0.0), abs(abs(lat).sub(0.5)));      // 1 on each wheel path
  // the baked street textures (viewer/streets/paving.js, docs/STREET_SURFACES.md); ?paving=old: the procedural below
  const T = pavingTextures() ? texturedRoad({ s, t, x, z, surf, phase, wheel, patch, speck }) : null;
  const grain = T ? null : n3(x.mul(7.0), z.mul(7.0), 0.0);
  let base, rough;
  if (T) { base = T.col; rough = T.rough; } else {
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
    base = asphalt;
    base = mix(base, settCol, k1);
    base = mix(base, pavCol, k2);
    base = mix(base, cobCol, k3);
    base = mix(base, grav, k4);
    rough = asphaltRough;
    rough = mix(rough, mix(float(0.72), float(0.95), sett.joint), k1);
    rough = mix(rough, float(0.85), k2.add(k3).add(k4));
  }

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
  if (T) { m.normalNode = pavingNormal(T.n, t, s, T.nK.mul(float(1).sub(paint.mul(0.7)))); m.aoNode = mix(T.ao, float(1), paint); }
  // weather: wet asphalt + puddles in the gutters (lane edges), salted in winter: black wet road, slush at the edges
  { const edge = smoothstep(float(0.7), float(1.0), abs(lat)); const sr = floor(surf.add(0.5)), saltMask = select(sr.equal(1).or(sr.equal(3)).or(sr.equal(4)), float(0.15), float(1));   // sett lanes, gravel: hardly salted
    wxMat(m, { porosity: 0.75, puddles: true, puddleBias: edge.mul(0.22), slush: true, road: true, edge, saltMask, map: true }); }
  return addLampLight(m);
}

/**
 * The carriageway from the street texture array (viewer/streets/paving.js). Layer per pixel from aSurf: asphalt;
 * setts (sett, cobblestone) and unhewn cobbles = the scanned old worn setts, rows ACROSS the road (texture v along
 * the station s), each road its own stone size (rows 14-18 cm) and stone (blue-grey porphyry to brown-grey sandstone);
 * paving_stones = the concrete pavers; gravel / compacted stays procedural. On setts: polished, darker wheel paths,
 * darker damp joints (the scan's AO), and the asphalt repairs of utility trenches (rectangles in 6 m cells).
 */
function texturedRoad({ s, t, x, z, surf, phase, wheel, patch, speck }) {
  const sr = floor(surf.add(0.5));
  // per-road randoms from the road's id phase ROUNDED to its 0.01 grid (roadData hashPhase): the interpolated attribute
  // carries float noise of ~1e-4 per pixel, and a stone size taken from it straight multiplies a station of hundreds of
  // metres, so the texture coordinate jittered by whole texels between frames (salt-and-pepper flicker, 2026-11-14)
  const pid = floor(phase.mul(100).add(0.5));
  const r1 = hash(pid), r2 = hash(pid.add(0.5));
  const isSett = sr.equal(1).or(sr.equal(3)), unhewn = sr.equal(3);
  // asphalt repairs in sett streets: in ~22 % of 6 m cells along the road, a patch 1.2-3.7 m long, 1.4-3 m wide,
  // anywhere across the carriageway (gas / water trenches), slightly ragged edges. Drawn OVER the setts as a coverage
  // (box-filtered over the pixel footprint: no hard layer switch, no aliasing edge far away)
  const cell = floor(s.div(6)), hc = hash22(vec2(cell, pid)), hd = hash22(vec2(cell.add(17), pid));
  const ps = cell.mul(6).add(hc.x.mul(3)), pl = hd.x.mul(2.5).add(1.2), pt = hd.y.sub(0.5).mul(4), pw = hc.y.mul(1.6).add(1.4);
  const rag = s.mul(7.3).add(t.mul(5.1)).sin().mul(0.04).add(t.mul(11.7).sub(s.mul(3.3)).sin().mul(0.03));   // ragged edge, cheap
  const fS = fwidth(s).mul(0.7).add(0.004), fT = fwidth(t).mul(0.7).add(0.004);
  const patchOn = select(isSett.and(hash22(vec2(cell.add(5), pid.add(311))).x.lessThan(0.22)), float(1), float(0));
  const cover = boxCoverage(s.add(rag), ps, ps.add(pl), fS).mul(boxCoverage(t.add(rag), pt.sub(pw.mul(0.5)), pt.add(pw.mul(0.5)), fT)).mul(patchOn);
  const layer = select(isSett, float(LAYER.setts), select(sr.equal(2), float(LAYER.pavers), float(LAYER.asphalt)));
  // metres per texture repeat: the setts scan is 10 rows per repeat (rows 14-18 cm per road, unhewn ~22 cm)
  const size = select(layer.equal(LAYER.setts), select(unhewn, float(2.2), r1.mul(0.4).add(1.4)), select(layer.equal(LAYER.pavers), float(1.8), float(2.0)));
  const S = pavingSample(t, s, layer, size);
  // asphalt: metre-scale patchiness (old repairs), polished wheel paths, fresh trench patches darker
  const asph = S.col.mul(patch.mul(0.18).add(1)).mul(float(1).sub(wheel.mul(0.1)));
  // setts: regraded per road between blue-grey porphyry and brown-grey sandstone (Street View: Geleytsbeekstraat,
  // Eikenboslaan, Vossendreef), joints darker and damp, wheel paths polished
  const porph = regrade(S.col, "setts", [0.105, 0.115, 0.13], 0.6), sand = regrade(S.col, "setts", [0.15, 0.138, 0.118], 0.45);
  let sett = mix(porph, sand, select(unhewn, float(0.8), smoothstep(0.35, 0.85, r2)));
  sett = sett.mul(mix(float(1), S.ao, 0.55)).mul(float(1).sub(wheel.mul(0.08)));
  // the trench patch: dark, slightly worn bitumen with the old binder's chips (a cheap speck), flat
  const tar = vec3(0.058, 0.057, 0.056).mul(speck.mul(0.12).add(patch.mul(0.1)).add(1));
  sett = mix(sett, tar, cover);
  const grav = vec3(0.24, 0.21, 0.16).add(speck.mul(0.03));
  let col = select(layer.equal(LAYER.setts), sett, select(layer.equal(LAYER.pavers), S.col.mul(0.95), asph));
  col = select(sr.equal(4), grav, col);
  let rough = S.rough.mul(1.05).min(0.97);
  rough = select(layer.equal(LAYER.setts), rough.sub(wheel.mul(0.15)).add(float(1).sub(S.ao).mul(-0.1)), select(layer.equal(LAYER.asphalt), rough.sub(wheel.mul(0.1)), rough));
  rough = mix(select(sr.equal(4), float(0.85), rough), float(0.86), cover);
  const nK = select(layer.equal(LAYER.setts), float(1.0), select(layer.equal(LAYER.pavers), float(0.8), float(0.55))).mul(select(sr.equal(4), float(0), float(1))).mul(float(1).sub(cover.mul(0.85)));
  return { col, rough, n: S.n, ao: S.ao, nK };
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
  wxMat(m, { porosity: 0.1, slush: true, road: true, edge: float(0), map: true });   // the weather: paint goes under the snow / slush with the asphalt
  return addLampLight(m);
}

// ---------------------------------------------------------------- sidewalks, kerbs, aprons

/** `framed` (viewer/surfaces.js, ?roads=surface): aKind 3 = a sidewalk slab whose uv is (station along the nearest
 *  kerb, metres from it), so the tiles run along the street in one continuous pattern, and the first 15 cm from
 *  the kerb is painted as the blue-stone kerb band. */
const KERB_STONE = 1.0;            // m: kerbstone length
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
    // round 4 (cost): the surfaces pick ONE frame per triangle (aFrameW 0 or 1, viewer/surfaces.js round 3), so the
    // two tile patterns are not both evaluated and cross-faded: one courses() with the chosen coordinates
    blend = wB.mul(isF);
    const kx = mix(x, f.x, isF), kz = mix(z, f.y, isF);
    ta = mix(kx, g.x, blend); tb = mix(kz, g.y, blend);
    const band15 = float(1).sub(smoothstep(float(0.15).sub(fw), float(0.15).add(fw), f.y));   // kerb band, AA edge
    kind = mix(kind, band15, isF);                            // framed: kerb band (1) within 15 cm of the kerb, else slab (0)
  }
  const blot = n3(x.mul(0.6), z.mul(0.6), 8.0);               // low-frequency wear: keeps far sidewalks from going flat
  // the baked 30 cm slabs (viewer/streets/paving.js layer "slabs", texture factory tf_paving_concrete_a: 6 x 6 tiles per
  // 1.8 m, so the texture's joints land on the same 30 cm grid as before); ?paving=old: the procedural courses()
  const TX = pavingTextures() ? pavingSample(ta, tb, float(LAYER.slabs), float(1.8)) : null;
  let slab, tiles;
  if (TX) {
    // regraded a touch darker and greyer (as the old framed slabs: washed out in a low sun next to the asphalt), dirtier
    // where the AO says joint / chip
    slab = regrade(TX.col, "slabs", framed ? [0.2, 0.196, 0.186] : [0.26, 0.255, 0.245], 0.35).mul(blot.mul(0.07).add(1.0)).mul(mix(float(1), TX.ao, 0.4));
    tiles = { joint: float(1).sub(TX.ao).mul(1.5).min(1) };
  } else {
    tiles = courses(ta, tb, 0.3, 0.3, float(0.006), float(2.0), fw);
    // framed slabs a touch darker and greyer (they read washed out in a low sun next to the asphalt and the houses)
    const sA = framed ? vec3(0.175, 0.172, 0.165) : vec3(0.24, 0.235, 0.225), sB = framed ? vec3(0.235, 0.228, 0.215) : vec3(0.32, 0.31, 0.295);
    slab = mix(mix(sA, sB, tiles.tone).mul(blot.mul(0.07).add(1.0)).add(grain.mul(0.012)), vec3(0.1, 0.097, 0.092), tiles.joint);
  }
  // kerbs: Belgian blue stone (petit granit), dark blue-grey with fossil speckle
  const kerb = vec3(0.075, 0.082, 0.095).add(grain.mul(0.012)).add(n3(x.mul(37.0), P.y.mul(37.0), z.mul(37.0)).mul(0.01));
  // roundabout apron: red-brown setts
  // (round 4, cost: the measured surfaces have no apron; the engine's roundabout aprons outside UrbIS keep their setts
  // only with the unframed material)
  let apron = vec3(0.2, 0.09, 0.058);
  if (!framed) { const ap = courses(x, z, 0.12, 0.12, float(0.012), float(4.0), fw); apron = mix(mix(vec3(0.16, 0.07, 0.045), vec3(0.24, 0.11, 0.07), ap.tone), vec3(0.05, 0.03, 0.02), ap.joint); }
  const isKerb = band(kind, 1), isApron = band(kind, 2);
  // round 2: Belgian blue-stone kerbstones ~1 m long, butt joints (uv.x = the station along the kerb on the face and on
  // the sidewalk's painted 15 cm band, viewer/surfaces.js), AA'd with the world footprint, faded far away; each stone a
  // touch different
  // round 4 (kerb shimmer): joints and arris are BOX-FILTERED over their own uv footprint (tslkit filteredPulse /
  // boxCoverage, Mr.doob's slop-newyork): at any distance they cover exactly their area share (a 6 mm joint per 1 m
  // stone = 0.6 %), so nothing blinks; no hand-tuned fade. Far away, where the whole 13 cm face is a pixel or two, the
  // face's colour goes to the mean of the asphalt and paving round it, so its sub-pixel edges carry little contrast
  const ks = uv().x, fwU = fwidth(ks).add(0.0005), fwV = fwidth(uv().y).add(0.0005);
  const kJoint = filteredPulse(ks.div(KERB_STONE).add(0.003 / KERB_STONE), float(0), float(0.006 / KERB_STONE), fwU.div(KERB_STONE));
  const stoneTone = hash(floor(ks.div(KERB_STONE)).add(17.0)).sub(0.5).mul(0.012).mul(float(1).sub(smoothstep(float(0.05), float(0.3), fwU)));
  const arris = boxCoverage(uv().y, float(0), float(0.012), fwV.mul(0.5));
  const fwFace = fwidth(P.y).add(fw);
  const kerbFar = smoothstep(float(0.02), float(0.08), fwFace);
  const kerbStone = mix(mix(mix(kerb.add(stoneTone), kerb.mul(1.9), arris.mul(0.6)), vec3(0.03, 0.032, 0.036), kJoint), vec3(0.11, 0.11, 0.108), kerbFar.mul(0.7));
  m.colorNode = mix(mix(slab, framed ? kerbStone : kerb, isKerb), apron, isApron);
  // framed (?roads=surface): honed blue stone, rougher, so a kerb face toward a low sun does not flare white
  const slabRough = TX ? TX.rough.mul(1.04).min(0.97) : mix(float(framed ? 0.92 : 0.88), float(0.95), tiles.joint);
  m.roughnessNode = mix(mix(slabRough, float(framed ? 0.82 : 0.6), isKerb), float(0.8), isApron);
  if (TX) m.normalNode = pavingNormal(TX.n, ta, tb, float(0.9).mul(float(1).sub(isKerb)).mul(float(1).sub(isApron)));
  wxMat(m, { porosity: 0.55, puddles: true, puddleBias: float(-0.2), slush: true, frost: true, map: true });   // the weather (sidewalks, kerbs)
  return addLampLight(m);
}

export function vergeMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const P = positionWorld;
  const a = n3(P.x.mul(0.35), P.z.mul(0.35), 1.0), b = n3(P.x.mul(4.0), P.z.mul(4.0), 2.0), c = n3(P.x.mul(23.0), P.z.mul(23.0), 5.0);
  m.colorNode = mix(vec3(0.05, 0.11, 0.025), vec3(0.1, 0.16, 0.04), a.mul(0.5).add(0.5)).add(b.mul(0.012)).add(c.mul(0.015));
  wxMat(m, { porosity: 0.9, frost: true, map: true });   // the weather (verges)
  return addLampLight(m);
}
