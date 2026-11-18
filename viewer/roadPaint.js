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
  fwidth, hash, mx_noise_float, uniform, select, length, dot, clamp, normalWorld, If, Fn,
} from "three/tsl";
import { addLampLight } from "./lampLight.js";
import { filteredPulse, boxCoverage } from "./tslkit.js";
import { pavingTextures, pavingSample, pavingNormal, regrade, LAYER } from "./streets/paving.js";
import { hash22 } from "./materials/antitile.js";
import { brickPattern, BRICK } from "./gardens/gardenKit.js";   // (the garden walls' stretcher bond: the retaining walls, viewer/streets/retainWalls.js)
import { wxMat } from "./weather/cityWeatherize.js";   // the weather (viewer/weather/, docs/WEATHER.md "City hookup"): gated, ?weather=old none

import { SURFACE, hashPhase, surfaceAttribute } from "./roadData.js";
import { BIKE, CHEVRON, STRETCH, X_MID, Y_MID } from "./streets/bikeGlyph.js";
// (cortenbosch2) the herringbone pavers' angle to the street's axis (degrees; the lane, Street View); ?hbangle=90 to compare
const HB_DEG = (() => { const v = typeof location !== "undefined" ? Number(new URLSearchParams(location.search).get("hbangle")) : NaN; return Number.isFinite(v) && v !== 0 ? v : 45; })();
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

    const k1 = band(surf, 1), k2 = band(surf, 2).add(band(surf, 5)), k3 = band(surf, 3), k4 = band(surf, 4);   // (5: herringbone, the procedural pavers here)
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
  // (cortenbosch2) aSurf 5: the pavers in herringbone (layer 4, when it is loaded), laid at HB_DEG to the street's axis;
  // its sample frame turned by that angle and the normal turned back into the street's (t, s) frame
  const hbOn = (pavingTextures()?.layers.length ?? 0) > LAYER.herringbone;
  const isHB = hbOn ? sr.equal(5) : null;
  const isPav = hbOn ? sr.equal(2).or(sr.equal(5)) : sr.equal(2).or(sr.equal(5));
  const layer = select(isSett, float(LAYER.setts), select(isPav, hbOn ? select(isHB, float(LAYER.herringbone), float(LAYER.pavers)) : float(LAYER.pavers), float(LAYER.asphalt)));
  // metres per texture repeat: the setts scan is 10 rows per repeat (rows 14-18 cm per road, unhewn ~22 cm)
  const size = select(layer.equal(LAYER.setts), select(unhewn, float(2.2), r1.mul(0.4).add(1.4)), select(isPav, float(1.8), float(2.0)));
  const hc0 = Math.cos((HB_DEG * Math.PI) / 180), hs0 = Math.sin((HB_DEG * Math.PI) / 180);
  const hcs = hbOn ? select(isHB, float(hc0), float(1)) : float(1), hsn = hbOn ? select(isHB, float(hs0), float(0)) : float(0);
  const S0 = pavingSample(t.mul(hcs).add(s.mul(hsn)), s.mul(hcs).sub(t.mul(hsn)), layer, size);
  const S = { ...S0, n: vec2(S0.n.x.mul(hcs).sub(S0.n.y.mul(hsn)), S0.n.x.mul(hsn).add(S0.n.y.mul(hcs))) };
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
  // (cortenbosch2: the lane's herringbone pavers are pale, warm grey on Street View: x 1.3)
  let col = select(layer.equal(LAYER.setts), sett, select(isPav, S.col.mul(hbOn ? select(isHB, float(1.3), float(0.95)) : float(0.95)), asph));
  col = select(sr.equal(4), grav, col);
  let rough = S.rough.mul(1.05).min(0.97);
  rough = select(layer.equal(LAYER.setts), rough.sub(wheel.mul(0.15)).add(float(1).sub(S.ao).mul(-0.1)), select(layer.equal(LAYER.asphalt), rough.sub(wheel.mul(0.1)), rough));
  rough = mix(select(sr.equal(4), float(0.85), rough), float(0.86), cover);
  const nK = select(layer.equal(LAYER.setts), float(1.0), select(isPav, float(0.8), float(0.55))).mul(select(sr.equal(4), float(0), float(1))).mul(float(1).sub(cover.mul(0.85)));
  return { col, rough, n: S.n, ao: S.ao, nK };
}

// ---------------------------------------------------------------- measured paint (decal mesh)

/** The measured paint of paint v2 (viewer/streets/measuredPaint.js paintMeshV2): crossings, stop and give-way lines,
 *  sharrows, as one decal mesh PAINT_LIFT above the street. No texture: each mark's (u, v) metres give box-filtered
 *  edges and stripes (tslkit filteredPulse / boxCoverage), so a zebra fades to its 50 % average far away instead of
 *  shimmering. Same paint colour and wear as the lines in the asphalt shader above. */
/** markings (census F, rule 33): the painted glyphs (viewer/streets/bikeGlyph.js) as analytic signed distances in the
 *  glyph frame (u along, v across, metres), each a coverage box-filtered over its own pixel footprint (fwidth of the
 *  distance: exact edges near, the area share far, no facets, no texture). n: 0 the bicycle, 1 the chevron. */
function glyphCoverage(u, v, n) {
  const segSD = (p, a, b, w) => {
    const bx = b[0] - a[0], by = b[1] - a[1], inv = 1 / Math.max(1e-9, bx * bx + by * by);
    const pa = p.sub(vec2(a[0], a[1])), ba = vec2(bx, by);
    const h = clamp(dot(pa, ba).mul(inv), 0, 1);
    return length(pa.sub(ba.mul(h))).sub(w / 2);
  };
  // the bicycle, in its sign frame (x forward = across the lane, y up = along it, de-stretched)
  const q = vec2(v.add(X_MID), u.div(STRETCH).add(Y_MID));
  let bike = null;
  for (const g of BIKE.rings) { const d = abs(length(q.sub(vec2(g.c[0], g.c[1]))).sub(g.r)).sub(g.w / 2); bike = bike ? min(bike, d) : d; }
  for (const sg of BIKE.segs) bike = min(bike, segSD(q, sg.a, sg.b, sg.w));
  // the chevron: a polygon's signed distance (Inigo Quilez's sdPolygon, unrolled)
  const p = vec2(u, v);
  let dmin = null, sgn = float(1);
  for (let i = 0, j = CHEVRON.length - 1; i < CHEVRON.length; j = i++) {
    const A = CHEVRON[j], B = CHEVRON[i];
    const d = segSD(p, A, B, 0);
    dmin = dmin ? min(dmin, d) : d;
    const c1 = step(float(A[1]), v), c2 = float(1).sub(step(float(B[1]), v));
    const c3 = step(float((B[1] - A[1])).mul(u.sub(A[0])), float(B[0] - A[0]).mul(v.sub(A[1])).sub(1e-9));
    const all = c1.mul(c2).mul(c3), none = float(1).sub(c1).mul(float(1).sub(c2)).mul(float(1).sub(c3));
    sgn = sgn.mul(float(1).sub(all.add(none).mul(2)));
  }
  const chev = dmin.mul(sgn);
  const sd = select(n.lessThan(0.5), bike, chev);
  return clamp(float(0.5).sub(sd.div(fwidth(sd).add(1e-5))), 0, 1);
}

const PAINT_WEAR2 = !(typeof location !== "undefined" && /[?&]zebrawear=old/.test(location.search));
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
  let cov = solid.mul(band(kind, 0)).add(zebra.mul(band(kind, 1))).add(teeth.mul(band(kind, 2))).add(glyphCoverage(u, v, n).mul(band(kind, 3)));
  const speck = n3(x.mul(41.0), z.mul(41.0), 3.0);
  let wear = smoothstep(float(-0.65), float(-0.25), n3(x.mul(1.7), z.mul(1.7), 11.0)).mul(smoothstep(float(-0.8), float(-0.45), speck));
  if (PAINT_WEAR2) {
    // joins2 (docs/JOINS2.md; ?zebrawear=old = before): the round 0.6 m patches of bare asphalt read as dark SMUDGES on the
    // zebras (Fort-Jaco). Paint wears in tyre streaks ALONG the traffic (u) and goes thin and grey, not black: streaks
    // stretched along u, coverage kept over 45 %, the fine speckle kept
    const streak = smoothstep(float(-0.55), float(0.1), n3(u.mul(0.45).add(x.mul(0.05)), v.mul(5.0).add(z.mul(0.05)), 11.0));
    wear = mix(float(0.45), float(1), streak).mul(mix(float(0.7), float(1), smoothstep(float(-0.8), float(-0.45), speck)));
  }
  cov = cov.mul(wear).mul(0.92);
  m.colorNode = vec3(0.62, 0.62, 0.6);
  m.opacityNode = cov;
  m.roughnessNode = float(0.62);
  wxMat(m, { porosity: 0.1, slush: true, road: true, edge: float(0), map: true });   // the weather: paint goes under the snow / slush with the asphalt
  return addLampLight(m);
}

/** (cortenbosch2) THE WORDS PAINTED ON THE STREET (viewer/streets/measuredPaint.js roadTextMesh; data/overrides.json
 *  roadTexts): the rows drawn once in a canvas atlas (bold sans capitals filling the row: the decal stretches them along
 *  the street, as road lettering is), the measured paint's colour and wear, mipmapped (no shimmer far away). */
export function roadTextMaterial(rows) {
  const W = 1024, H = 160;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H * rows.length;
  const g = cv.getContext("2d");
  g.clearRect(0, 0, cv.width, cv.height);
  g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
  rows.forEach((t, i) => {
    let px = 150; g.font = `700 ${px}px Arial, Helvetica, sans-serif`;
    const tw = g.measureText(t).width, sx = Math.min(1, (W * 0.94) / tw);
    g.save(); g.translate(W / 2, H * i + H * 0.54); g.scale(sx, 1); g.fillText(t, 0, 0); g.restore();
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  m.name = "road text";
  const P = positionWorld, x = P.x, z = P.z;
  const a = texture(tex, uv()).a;
  const speck = n3(x.mul(41.0), z.mul(41.0), 3.0);
  const streak = smoothstep(float(-0.55), float(0.1), n3(x.mul(0.6), z.mul(0.6), 11.0));
  const wear = mix(float(0.5), float(1), streak).mul(mix(float(0.7), float(1), smoothstep(float(-0.8), float(-0.45), speck)));
  m.colorNode = vec3(0.62, 0.62, 0.6);
  m.opacityNode = a.mul(wear).mul(0.9);
  m.roughnessNode = float(0.62);
  wxMat(m, { porosity: 0.1, slush: true, road: true, edge: float(0), map: true });
  return addLampLight(m);
}

// ---------------------------------------------------------------- sidewalks, kerbs, aprons

/** `framed` (viewer/surfaces.js, ?roads=surface): aKind 3 = a sidewalk slab whose uv is (station along the nearest
 *  kerb, metres from it), so the tiles run along the street in one continuous pattern, and the first 15 cm from
 *  the kerb is painted as the blue-stone kerb band. */
const KERB_STONE = 1.0;            // m: kerbstone length
const PLINTH = 0.3;                // m: a retaining wall's blue-stone plinth course over its foot (round 3)
const KERB_TONE2 = !(typeof location !== "undefined" && /[?&]kerbtone=old/.test(location.search));
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
  // joins2 (docs/JOINS2.md; ?kerbtone=old = 0.075-0.095): weathered petit granit kerbs bleach to a mid blue-grey (Street
  // View, Brussels kerbs in sun and shade); at 8 % albedo the 13 cm face read as a near-black band along every kerb in shade
  const kerb = (KERB_TONE2 ? vec3(0.135, 0.142, 0.152) : vec3(0.075, 0.082, 0.095)).add(grain.mul(0.012)).add(n3(x.mul(37.0), P.y.mul(37.0), z.mul(37.0)).mul(0.01));
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
  // RETAINING WALLS (claude/sidewalk round 3, viewer/streets/retainWalls.js): aKind 4 = brick in the garden walls' four
  // tones (aUv2.x; their stretcher bond in WORLD space: no seam, real 22 x 6.5 cm bricks), 5 = coursed stone (stones
  // ~0.5 x 0.24 m, staggered courses, per-stone tone); the first PLINTH m over the foot (uv.y) a blue-stone course
  const isBrick = band(kind, 4), isCoursed = band(kind, 5), isWall = isBrick.add(isCoursed);
  // (only on wall pixels: the bond and the stones are not evaluated on the sidewalks)
  const wallCol = Fn(() => {
  const wc = vec3(0).toVar();
  If(isWall.greaterThan(0.5), () => {
    const wTone = attribute("aUv2", "vec2").x;
    const bp = brickPattern(wTone);
    const bt = wTone.add(0.5).floor();
    const brickBase = select(bt.lessThan(0.5), vec3(...BRICK[0].slice(0, 3)), select(bt.lessThan(1.5), vec3(...BRICK[1].slice(0, 3)), select(bt.lessThan(2.5), vec3(...BRICK[2].slice(0, 3)), vec3(...BRICK[3].slice(0, 3)))));
    const brickCol = mix(brickBase.mul(bp.tone), vec3(0.24, 0.23, 0.21).mul(select(bt.equal(1), float(0.62), float(1))), bp.mortar.mul(0.9));
    // coursed stone: u along the face (its world normal), v = height; joints anti-aliased, faded under a pixel
    const nW = normalWorld.normalize(), tU = vec2(nW.z.negate(), nW.x).add(vec2(1e-5, 0)).normalize();
    const su = P.x.mul(tU.x).add(P.z.mul(tU.y)), sv = P.y;
    const crs = floor(sv.div(0.24)), sbu = su.div(0.5).add(hash(crs.add(3.1)).mul(0.9)), sbi = floor(sbu);
    const sfu = fract(sbu), sfv = fract(sv.div(0.24)), swu = fwidth(sbu).add(1e-4), swv = fwidth(sv.div(0.24)).add(1e-4);
    const sj = smoothstep(float(0.015).sub(swu), float(0.015).add(swu), sfu).mul(smoothstep(float(0.015).sub(swu), float(0.015).add(swu), float(1).sub(sfu)))
      .mul(smoothstep(float(0.03).sub(swv), float(0.03).add(swv), sfv)).mul(smoothstep(float(0.03).sub(swv), float(0.03).add(swv), float(1).sub(sfv)));
    const sFar = smoothstep(float(0.1), float(0.3), swv);
    const sTone = mix(float(0.82), float(1.15), hash(sbi.mul(7.13).add(crs.mul(3.7))));
    const stoneBase = mix(vec3(0.3, 0.285, 0.25), vec3(0.24, 0.235, 0.22), hash(crs.mul(1.7).add(sbi)).mul(0.6));
    const coursedCol = mix(mix(stoneBase.mul(sTone), vec3(0.17, 0.165, 0.155), float(1).sub(sj).mul(0.85)), stoneBase, sFar);
    const plinth = float(1).sub(smoothstep(float(PLINTH - 0.005), float(PLINTH + 0.005), uv().y));
    wc.assign(mix(mix(brickCol, coursedCol, isCoursed), kerb, plinth));
  });
  return wc;
  })();
  m.colorNode = mix(mix(mix(slab, framed ? kerbStone : kerb, isKerb), apron, isApron), wallCol, isWall);
  // framed (?roads=surface): honed blue stone, rougher, so a kerb face toward a low sun does not flare white
  const slabRough = TX ? TX.rough.mul(1.04).min(0.97) : mix(float(framed ? 0.92 : 0.88), float(0.95), tiles.joint);
  m.roughnessNode = mix(mix(mix(slabRough, float(framed ? 0.82 : 0.6), isKerb), float(0.8), isApron), float(0.9), isWall);
  if (TX) m.normalNode = pavingNormal(TX.n, ta, tb, float(0.9).mul(float(1).sub(isKerb)).mul(float(1).sub(isApron)).mul(float(1).sub(isWall)));
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
