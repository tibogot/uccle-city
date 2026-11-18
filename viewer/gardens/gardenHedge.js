// CLIPPED FRONT-GARDEN HEDGES AS INSTANCED MODULES (docs/assets/GARDENS.md "Hedges"; claude/hedges 2026-11-18, the
// owner's "garden hedges look very cheap": ?hedges=old = the hedges before, viewer/gardens/gardenHedgeOld.js).
// A hedge run is cut into ~1 m MODULES, each an instance of one unit piece (stretched along the run, sheared to its
// slope, scaled to the hedge's height and width), drawn through the kit's pools (viewer/gardens/gardenKit.js GardenPool:
// one pool for the whole city, the tile fade): 3 body draws (LOD0-2) + 1 card draw for the whole city, one fixed
// material set (as before: 0 more draws).
//   surface  a BAKED clipped-hedge face (tools/blender/hedgeSurface.py -> textures/hedges/hedge_leaf_{a,n}.webp: ~3,400
//            modelled leaves packed at the clipped face and thinning inward, holes, twigs, a dark interior; Cycles AO):
//            leaf value + occlusion + part (leaf / twig) and the leaves' normals, in RUN metres (u along the run,
//            continuous over module joints; v round the section in metres), scaled per species (box small leaves,
//            laurel big), two taps at two rotations blended by a noise (no visible tiling); the species colour by season
//            (beech / hornbeam hold their brown leaves), a tint per run, lighter new growth on top; the gaps dark (AO
//            into the colour and the ambient); the FOOT: leaves thin out over the lowest ~35 cm into the shadowed
//            stems and the soil (a clipped hedge's leggy base), the body reaching 12 % of its height under the ground.
//   body     LOD0 a 17-point section (soft rounded top corners in 3 pieces, a slightly drawn-in foot),
//            3 rings a module, lumps (bulges) in the vertex stage from a noise in RUN metres; the lumps flatten out
//            28-38 m, so at the LOD0 -> 1 hand-over (40-50 m) both LODs are the same smooth box with the same shading:
//            the dither there swaps identical pixels (no ghost; the bushes' ghost was a dither between two DIFFERENT
//            models at close range). LOD1 10 points, 1 ring; LOD2 6 points (hand-over 108-132 m). Same material code on
//            every LOD (the far look = the mips of the near one).
//   cards    leaf sprays (viewer/foliage/cards.js, coverage-preserving mips) on the top, the top corners and the upper
//            sides (the silhouette: a clipped hedge's fuzzy outline), HEDGE_CARDS a module; they shrink into the body
//            from CARD_NEAR to CARD_FAR (a morph, nothing pops, no alpha far away); one LOD.
//   wind     the foliage wind (viewer/foliage/wind.js, as the bushes) but clipped: the top leans <= ~1 cm, the cards
//            flutter a little; motion vectors (setMotionDelta) for both.
// Per instance iVar = (species + width / 10, start along the run (m), module length (m), height (m)); iAux = the run's
// world side direction (x, z).
// NOTE (three r187 NodeMaterial.setupPosition): the instancing runs BEFORE material.positionNode, so positionLocal /
// normalLocal are already the instance-transformed position / normal there (= world: the pools sit at the origin).
import * as THREE from "three/webgpu";
import { drain } from "../slices.js";
import {
  attribute, uniformArray, vec2, vec3, vec4, float, mix, smoothstep, length, normalize, cross, cos, sin, select, abs, max,
  fwidth, saturate, texture, uv, cameraViewMatrix, varying, positionLocal, normalLocal, normalWorld, positionWorld, fract,
  floor, sign, dot,
} from "three/tsl";
import { season } from "../foliage/seasons.js";
import { wind, windAt, windPrev } from "../foliage/wind.js";
import { setMotionDelta } from "../upscale.js";   // --- instmotion (the wind at last frame's time)
import { noiseAt } from "../foliage/noise.js";
import { leafCard } from "../foliage/cards.js";
import { nightLeaf } from "../foliage/nightLeaf.js";
import { lodEye, ditherNoise, keepBand } from "../lodFade.js";
import { FadeSlots } from "../instanceStream.js";

/** the gardens' tile fades (viewer/instanceStream.js): iBand.w = the instance's tile slot */
export const gardenFades = new FadeSlots();

// species: summer, winter (sRGB), card size (m), lumps (m), gloss, holds (marcescence: beech keeps its brown leaves all
// winter), patch = the world size (m) of the baked surface patch (0.6 m = privet's 4.5 cm leaves)
export const HEDGE_SPECIES = ["privet", "beech", "hornbeam", "laurel", "box"];
const SP = {
  privet:   { summer: "#4a6a28", winter: "#45552a", card: 0.24, lump: 0.03, gloss: 0.55, holds: 0, patch: 0.6 },
  beech:    { summer: "#557a2c", winter: "#94603a", card: 0.3, lump: 0.04, gloss: 0.7, holds: 1, patch: 0.95 },
  hornbeam: { summer: "#5a7e30", winter: "#86643a", card: 0.3, lump: 0.045, gloss: 0.75, holds: 0.6, patch: 0.9 },
  laurel:   { summer: "#335722", winter: "#335222", card: 0.38, lump: 0.05, gloss: 0.35, holds: 0, patch: 1.5 },
  box:      { summer: "#3d5e25", winter: "#425228", card: 0.17, lump: 0.02, gloss: 0.6, holds: 0, patch: 0.32 },
};
export const HEDGE_MODULE = 1.0;          // m: nominal module length (a run is cut into equal modules near this)
export const HEDGE_BOTTOM = -0.12;        // unit y of the body's bottom: 12 % of the height under the base line (JOINS)
export const HEDGE_CARDS = 48;
export const CARD_NEAR = 14, CARD_FAR = 24;
/** LOD bands (m) [0 -> 1, 1 -> 2, end] (gardenKit.js BANDS): no dither inside 40 m (the hand-overs dither over +-10 %) */
export const HEDGE_BANDS = { hedge: [45, 120, 300], hedgecard: [29, 29, 29] };   // (the cards: gone by CARD_FAR before their end dither 24.7-29 m)
/** the lumps flatten out over this range (m): LOD0 = LOD1's shape before the 0 -> 1 hand-over starts */
export const LUMP_FADE = [28, 38];
export const HEDGE_TEX = ["textures/hedges/hedge_leaf_a.webp", "textures/hedges/hedge_leaf_n.webp"];

// ------------------------------------------------------------------------------------------------ geometry
/** the clipped section in unit space (z across -0.5..0.5, y 0..1): [z, y, nz, ny, vy, vz, round] (vy / vz = the arc
 *  length's vertical / horizontal parts: v in metres = vy x H + vz x W; round = a point of the rounded top corners) */
function section(lod) {
  const B = HEDGE_BOTTOM, r = 0.16, wt = 0.47;
  const half = [];                                   // the -z side, bottom up, then the corner round to the top
  if (lod === 2) {
    half.push([-0.46, B, 0], [-0.49, 0.84, 0], [-0.33, 1.0, 0]);
  } else {
    half.push([-0.46, B, 0]);
    if (lod === 0) half.push([-0.48, 0.06, 0]);
    half.push([-0.5, 0.32, 0]);
    if (lod === 0) half.push([-0.49, 0.6, 0]);
    const nc = lod === 0 ? 3 : 2;
    for (let k = 0; k <= nc; k++) { const a = Math.PI - (k / nc) * (Math.PI / 2); half.push([-wt + r + Math.cos(a) * r, 1 - r + Math.sin(a) * r, 1]); }
  }
  let P = [...half];
  if (lod === 0) P.push([0, 1.0, 1]);
  for (let k = half.length - 1; k >= 0; k--) P.push([-half[k][0], half[k][1], half[k][2]]);
  // normals: the outward normal of a piece a -> b is (-dy, dz); a point averages its two pieces
  const segN = (a, b) => { const dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy) || 1; return [-dy / l, dz / l]; };
  let vy = 0, vz = 0;
  return P.map((p, k) => {
    if (k) { vy += Math.abs(p[1] - P[k - 1][1]); vz += Math.abs(p[0] - P[k - 1][0]); }
    const a = k > 0 ? segN(P[k - 1], p) : null, b = k + 1 < P.length ? segN(p, P[k + 1]) : null;
    let nz = (a ? a[0] : 0) + (b ? b[0] : 0), ny = (a ? a[1] : 0) + (b ? b[1] : 0);
    const l = Math.hypot(nz, ny) || 1;
    return [p[0], p[1], nz / l, ny / l, vy, vz, p[2]];
  });
}

/** one body LOD: rings along x 0..1, the section swept, both ends closed (a fan from a centre: no slivers).
 *  Shading normals: FLAT per section piece (each strip its own vertices: the mesh audit's bentflat rule; the soft top
 *  edge comes from the 4-piece round + the leaves' own normals over it); the lumps move every
 *  copy of a point along ONE smooth direction (attribute ld), so the copies stay together (no crack) */
function bodyGeometry(lod) {
  const S = section(lod), rings = lod === 0 ? 3 : 1, n = S.length;
  const P = [], N = [], V = [], D = [], I = [];
  const segN = (a, b) => { const dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy) || 1; return [-dy / l, dz / l]; };
  for (let k = 0; k < n - 1; k++) {
    const [nz, ny] = segN(S[k], S[k + 1]), base = P.length / 3;
    for (let r = 0; r <= rings; r++) {
      const x = r / rings;
      for (const q of [S[k], S[k + 1]]) {
        P.push(x, q[1], q[0]);
        N.push(0, ny, nz);
        V.push(x, q[4], q[5]); D.push(0, q[3], q[2]);
      }
    }
    for (let r = 0; r < rings; r++) {
      const a = base + r * 2, b = a + 1, c = a + 2, d = c + 1;
      I.push(a, b, c, b, d, c);
    }
  }
  for (const [x, s] of [[0, -1], [1, 1]]) {
    const c = P.length / 3;
    P.push(x, 0.45, 0); N.push(s, 0, 0); V.push(x, 0, 0); D.push(0, 0, 0);
    for (const [z, y, dz, dy] of S) { P.push(x, y, z); N.push(s, 0, 0); V.push(x, 0, 0); D.push(0, dy, dz); }
    for (let k = 0; k < n - 1; k++) { if (s < 0) I.push(c, c + 2 + k, c + 1 + k); else I.push(c, c + 1 + k, c + 2 + k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("hv", new THREE.Float32BufferAttribute(V, 3));
  g.setAttribute("ld", new THREE.Float32BufferAttribute(D, 3));
  g.setIndex(I);
  g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.shared = true;
  return g;
}

/** the card module: HEDGE_CARDS quads; per vertex: position / normal = the card's spot on the unit body's surface and
 *  its normal (the SAME for its 4 corners: the instancing takes them to the world), corner = the quad corner
 *  (-0.5..0.5), crnd = 4 randoms. Stratified along the module; on the silhouette: the top corners x 3, the top x 1.6,
 *  the sides above 25 % of the height x 1 (none on the foot: the stems show there) */
function cardGeometry() {
  const S = section(1).filter((p) => p[1] > 0.25);
  const segs = [];
  for (let k = 0; k + 1 < S.length; k++) {
    const a = S[k], b = S[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const w = a[6] && b[6] ? 3 : Math.abs(a[3]) > 0.9 && Math.abs(b[3]) > 0.9 ? 1.6 : 1;
    segs.push({ a, b, w: L * w });
  }
  const tot = segs.reduce((s, q) => s + q.w, 0);
  let h = 12345;
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9 | 0; return (h >>> 0) / 4294967296; };
  const P = [], A = [], AN = [], R = [], U = [], I = [];
  for (let c = 0; c < HEDGE_CARDS; c++) {
    let t = rnd() * tot, q = segs[0];
    for (const s of segs) { if (t < s.w) { q = s; break; } t -= s.w; }
    const f = rnd(), x = (c + rnd()) / HEDGE_CARDS;
    const z = q.a[0] + (q.b[0] - q.a[0]) * f, y = q.a[1] + (q.b[1] - q.a[1]) * f;
    let nz = q.a[2] + (q.b[2] - q.a[2]) * f, ny = q.a[3] + (q.b[3] - q.a[3]) * f; const l = Math.hypot(nz, ny) || 1; nz /= l; ny /= l;
    const r4 = [rnd(), rnd(), rnd(), rnd()], base = P.length / 3;
    for (const [px, py] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
      P.push(x, y, z); A.push(px, py); AN.push(0, ny, nz); R.push(...r4); U.push(px + 0.5, py + 0.5);
    }
    I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(AN, 3));
  g.setAttribute("corner", new THREE.Float32BufferAttribute(A, 2));
  g.setAttribute("crnd", new THREE.Float32BufferAttribute(R, 4));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(I);
  g.computeBoundingBox(); g.boundingBox.expandByScalar(0.4);
  g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
  g.userData.shared = true;
  return g;
}

/** { body: [lod0, lod1, lod2], cards: [the card module] } */
export function hedgeGeometries() {
  return { body: [0, 1, 2].map(bodyGeometry), cards: [cardGeometry()] };
}

// ------------------------------------------------------------------------------------------------ materials
const C = (hex) => new THREE.Color(hex);
const uSummer = uniformArray(HEDGE_SPECIES.map((s) => C(SP[s].summer)), "color");
const uWinter = uniformArray(HEDGE_SPECIES.map((s) => C(SP[s].winter)), "color");
const uSp = uniformArray(HEDGE_SPECIES.map((s) => new THREE.Vector4(SP[s].card, SP[s].lump, SP[s].gloss, SP[s].holds)), "vec4");
const uPatch = uniformArray(HEDGE_SPECIES.map((s) => 1 / SP[s].patch), "float");

/** per instance: species index, width, start along the run, module length, height */
function inst() {
  const V = attribute("iVar", "vec4");
  const sI = floor(V.x.add(0.001));
  return { V, sI, spi: sI.toInt(), W: fract(V.x.add(0.001)).mul(10), s0: V.y, L: V.z, H: V.w };
}
function leafColour(spi) {
  const S = season.u, holds = uSp.element(spi).w;
  const winterAmt = select(holds.greaterThan(0.01), S.beechHold.mul(holds).add(S.autumn.mul(0.6).mul(holds)).clamp(0, 1), float(1).sub(S.leaf).mul(0.5));
  return mix(vec3(uSummer.element(spi)), vec3(uWinter.element(spi)), winterAmt);
}
/** the kit's LOD keep (gardenKit.js lodKeep): the per-pixel band hand-over + the tile fade (slot iBand.w); only = a one-LOD
 *  piece (kept to its end band) */
function keep(lod, only = false) {
  const band = attribute("iBand", "vec4"), n = ditherNoise();
  const d = length(positionWorld.sub(lodEye));
  const t1 = smoothstep(band.x.mul(0.9), band.x.mul(1.1), d), t2 = smoothstep(band.y.mul(0.9), band.y.mul(1.1), d), e = smoothstep(band.z.mul(0.85), band.z, d);
  const f = gardenFades.fade(band.w);
  const tile = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  const k = only ? keepBand(e, float(1.01), n) : lod === 0 ? keepBand(t1, float(1.01), n) : lod === 1 ? keepBand(t2, t1, n) : keepBand(e, t2, n);
  return k.and(tile);
}

/** the clipped lean (world metres) at a world point `p`, `f` = its height fraction in the hedge (0 foot .. 1 top): the
 *  bushes' crown lean, ~12 x smaller (a clipped hedge is stiff), <= ~1 cm at the top in a strong gust */
const leanAt = (p, f) => { const w = windAt(p.xz), k = f.clamp(0, 1); return vec3(w.x, 0, w.y).mul(k.mul(k)).mul(0.018); };

let texs = null;
/** the baked surface (tools/blender/hedgeSurface.py): [a = value / occlusion / part, n = normal], repeat, mipmapped, 4x aniso */
function hedgeTextures(base = new URL("../../", import.meta.url)) {
  if (texs) return texs;
  const L = new THREE.TextureLoader();
  texs = HEDGE_TEX.map((p) => {
    const t = L.load(new URL(p, base).href);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
  });
  return texs;
}

let mats = null;
/** { body: [lod0, lod1, lod2], card }: the fixed material set of the city's hedges (made once) */
export function hedgeMaterials() {
  if (mats) return mats;
  const [texA, texN] = hedgeTextures();
  const body = [0, 1, 2].map((lod) => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
    const I = inst(), hv = attribute("hv", "vec3"), pRaw = attribute("position", "vec3"), nRaw = attribute("normal", "vec3");
    const aux = attribute("iAux", "vec4");
    const sideW = vec3(aux.x, 0, aux.y), alongW = vec3(aux.y, 0, aux.x.negate());
    // run metres: u along the run (continuous over the module joints), v round the section; the end caps planar
    const isCap = abs(nRaw.x).greaterThan(0.5), capS = sign(nRaw.x);
    const uRun = I.s0.add(hv.x.mul(I.L));
    const uM = select(isCap, vec2(uRun.add(pRaw.z.mul(I.W).mul(capS)).add(13.7), pRaw.y.mul(I.H)), vec2(uRun, hv.y.mul(I.H).add(hv.z.mul(I.W))));
    // the tangent along u (world): the run's direction, on a cap the side direction (bitangent = cross(T, N): v)
    const tW = select(isCap, sideW.mul(capS), alongW);
    if (lod < 2) {
      let pos = positionLocal;
      if (lod === 0) {
        // lumps: soft bulges (~0.6 m) and clumps (~0.2 m) along the outward normal, none at the ground line or on the
        // ends; flattened out over LUMP_FADE (the LOD0 -> 1 hand-over then swaps identical shapes)
        const nb = noiseAt(uM, 1 / 2.4, true).b.sub(0.5).mul(2.4).add(noiseAt(uM, 1 / 0.7, true).a.sub(0.5).mul(1.2));
        const ld = attribute("ld", "vec3");
        const far = smoothstep(LUMP_FADE[0], LUMP_FADE[1], length(positionLocal.sub(lodEye)));
        const amp = uSp.element(I.spi).y.mul(nb).mul(smoothstep(0.0, 0.25, pRaw.y.mul(I.H))).mul(float(1).sub(far));
        const dirW = normalize(vec3(aux.x.mul(ld.z).mul(I.W), ld.y.mul(I.H), aux.y.mul(ld.z).mul(I.W)).add(vec3(0, 1e-5, 0)));
        pos = pos.add(dirW.mul(amp));
      }
      const [ln, lnP] = windPrev(() => leanAt(positionLocal, pRaw.y));
      setMotionDelta(m, lnP.sub(ln));   // --- instmotion
      m.positionNode = pos.add(ln);
    }
    const vu = varying(uM, "v_hU"), vT = varying(tW, "v_hT"), vY = varying(pRaw.y.mul(I.H), "v_hY");
    const vRun = varying(fract(sin(I.s0.mul(12.9898)).mul(43758.5453)), "v_hR");
    // the baked surface: two taps, the second turned 63 degrees and scaled, blended by a 2 m noise + the occlusion
    // (the higher, less occluded leaves win: no cross-fade mush), so the 0.3-1.5 m patch never reads as a tile
    const sc = uPatch.element(I.spi);
    const t1 = vu.mul(sc), ca = 0.4536, sa = 0.8912;
    const t2 = vec2(t1.x.mul(ca).sub(t1.y.mul(sa)), t1.x.mul(sa).add(t1.y.mul(ca))).mul(0.83).add(vec2(0.31, 0.57));
    const a1 = texture(texA, t1), a2 = texture(texA, t2), n1 = texture(texN, t1).xyz.mul(2).sub(1), n2r = texture(texN, t2).xyz.mul(2).sub(1);
    const n2 = vec3(n2r.x.mul(ca).add(n2r.y.mul(sa)), n2r.y.mul(ca).sub(n2r.x.mul(sa)), n2r.z);
    const big = noiseAt(vu, 1 / 2.2);
    const wB = smoothstep(0.38, 0.62, big.b.add(a2.y.sub(a1.y).mul(0.6)));
    const A = mix(a1.xyz, a2.xyz, wB), nT = mix(n1, n2, wB);
    const occl = A.y, part = A.z;
    // colours: the species by season (night: toward its luminance), a tint per run (+-8 %, a touch of hue), the clipped
    // top's new growth lighter and yellower; twigs bark-brown
    const leafC = nightLeaf(leafColour(I.spi));
    const runK = vRun.sub(0.5).mul(0.16);
    const up = saturate(normalWorld.y);
    const leafAlb = leafC.mul(vec3(float(1).add(runK.mul(1.3)), float(1).add(runK), float(1).sub(runK.mul(0.5)))).mul(mix(float(0.92), float(1.12), up.mul(up))).mul(big.a.mul(0.25).add(0.88));
    const alb = mix(leafAlb, vec3(0.05, 0.038, 0.028), part).mul(A.x.mul(1.25));
    // the foot: the leaves thin out downward (only the least occluded stay), the stems and the dark inside show
    const footK = smoothstep(0.04, 0.42, vY);
    const thr = float(1).sub(footK).mul(0.62);
    const leafy = smoothstep(thr.sub(0.1), thr.add(0.1), occl).max(smoothstep(0.85, 1.0, footK));
    const stem = smoothstep(0.82, 0.95, fract(vu.x.mul(5.3).add(big.g.mul(3)))).mul(smoothstep(0.0, 0.08, vY));
    const inside = mix(vec3(0.016, 0.013, 0.01), vec3(0.075, 0.062, 0.048), stem.mul(0.8));
    const soil = smoothstep(0.035, 0.0, vY);
    const base = mix(mix(inside, alb, leafy), vec3(0.045, 0.034, 0.025), soil.mul(0.8));
    const snowTop = smoothstep(0.55, 0.9, normalWorld.y).mul(season.uSnow).mul(leafy);
    // the gaps: the occlusion darkens the colour (the sun reaches little of a gap) and the ambient (aoNode)
    m.colorNode = mix(base.mul(mix(0.42, 1, occl)), vec3(0.88, 0.9, 0.94), snowTop);
    m.aoNode = mix(occl, float(0.15), float(1).sub(leafy)).max(0.08);
    // the leaves' normals in the run frame (T along u, B = cross(T, N) along v); flat inside the foot
    const Nw = normalize(normalWorld), Tw = normalize(vT.sub(Nw.mul(dot(vT, Nw)))), Bw = cross(Tw, Nw);
    const nL = mix(vec3(0, 0, 1), nT, leafy.mul(float(1).sub(snowTop.mul(0.7))));
    const nW = normalize(Tw.mul(nL.x).add(Bw.mul(nL.y)).add(Nw.mul(nL.z.max(0.05))));
    m.normalNode = normalize(cameraViewMatrix.mul(vec4(nW, 0)).xyz);
    m.roughnessNode = mix(uSp.element(I.spi).z, float(0.95), max(part, float(1).sub(leafy)));
    m.maskNode = keep(lod);
    m.maskShadowNode = m.maskNode;
    m.name = `gardens-hedge-lod${lod}`;
    m.userData.shared = true; m.userData.noFade = true;
    return m;
  });
  // CARDS: positionLocal = the card's spot on the hedge (world), normalLocal its normal (world)
  const tex = [leafCard("privet"), leafCard("beech"), leafCard("laurel")];
  const card = new THREE.MeshStandardNodeMaterial({ metalness: 0, side: THREE.DoubleSide });
  card.alphaToCoverage = true;
  const I = inst(), sp = uSp.element(I.spi), cr = attribute("crnd", "vec4"), corner = attribute("corner", "vec2");
  const fH = attribute("position", "vec3").y;
  const anchor = positionLocal, cn = normalize(normalLocal);
  const grow = float(1).sub(smoothstep(float(CARD_NEAR), float(CARD_FAR), length(anchor.sub(lodEye))));
  // card basis: tilted out of the surface by 25-65 degrees around a random axis in the surface plane
  const upv = select(abs(cn.y).greaterThan(0.9), vec3(1, 0, 0), vec3(0, 1, 0));
  const t1 = normalize(cross(upv, cn)), t2 = cross(cn, t1);
  const ang = cr.x.mul(6.2832), ca = cos(ang), sa = sin(ang);
  const ax = t1.mul(ca).add(t2.mul(sa)), ay = t2.mul(ca).sub(t1.mul(sa));
  const tilt = cr.y.mul(0.7).add(0.45);
  const cardN = normalize(cn.mul(cos(tilt)).add(ay.mul(sin(tilt))));
  const cardY = normalize(cross(cardN, ax));
  const size = sp.x.mul(cr.z.mul(0.5).add(0.75)).mul(grow);
  // (the body's lean at the card's height + a small flutter of its own)
  const [flick, flickP] = windPrev(() => leanAt(anchor, fH).add(vec3(1, 0.3, 1).mul(sin(wind.uTime.mul(5.0).add(cr.w.mul(40))).mul(windAt(anchor.xz).z.mul(0.015).add(0.003)))));
  setMotionDelta(card, flickP.sub(flick));   // --- instmotion
  card.positionNode = anchor.add(cn.mul(size.mul(0.36))).add(ax.mul(corner.x.mul(size))).add(cardY.mul(corner.y.add(0.3).mul(size))).add(flick);
  const uvc = uv();
  const a0 = texture(tex[0], uvc), a1c = texture(tex[1], uvc), a2c = texture(tex[2], uvc);
  const a = select(I.sI.equal(3), a2c, select(I.sI.equal(1).or(I.sI.equal(2)), a1c, a0));
  card.opacityNode = saturate(a.a.sub(0.5).div(max(fwidth(a.a), 1e-4)).add(0.5));
  const vShade = varying(cr.w.mul(0.3).add(0.75), "v_hS");
  const upc = saturate(cn.y);
  card.colorNode = mix(nightLeaf(leafColour(I.spi)).mul(a.r).mul(vShade).mul(mix(float(0.92), float(1.12), upc.mul(upc))), vec3(0.88, 0.9, 0.94), season.uSnow.mul(smoothstep(0.3, 0.9, cn.y)));
  // lighting normal: mostly the hedge's surface (a coherent mass), a little of the card's own
  const nW = normalize(mix(cn, cardN, 0.35));
  card.normalNode = normalize(cameraViewMatrix.mul(vec4(varying(nW, "v_hN"), 0)).xyz);
  card.maskNode = keep(0, true);
  card.name = "gardens-hedge-cards";
  card.userData.shared = true; card.userData.noFade = true;
  mats = { body, card };
  return mats;
}

/** a tile's hedge runs ({ points, species, height, width }) -> module instances: { body: [mat16 + iVar4...] }.
 *  groundAt = the drawn ground; each module end stands on the lower of the hedge's two sides there (no floating foot) */
export const hedgeInstances = (...a) => drain(hedgeInstancesGen(...a));
/** the same as a generator (a yield every 4 modules: viewer/slices.js, falcon2) */
export function* hedgeInstancesGen(runs, groundAt, push, out) {
  let n = 0;
  for (const r of runs) {
    yield;
    const sp = Math.max(0, HEDGE_SPECIES.indexOf(r.species));
    const pts = r.points;
    if (pts.length < 2) continue;
    // arc length, cut into equal modules near HEDGE_MODULE
    const S = [0]; for (let k = 1; k < pts.length; k++) S.push(S[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    const L = S[S.length - 1]; if (L < 0.3) continue;
    const m = Math.max(1, Math.round(L / HEDGE_MODULE)), step = L / m;
    const at = (s) => { let k = 1; while (k < S.length - 1 && S[k] < s) k++; const f = (s - S[k - 1]) / ((S[k] - S[k - 1]) || 1); return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f]; };
    const W = Math.min(0.99, r.width || 0.7), H = r.height || 1.2;
    const s0 = ((Math.round(pts[0][0] * 7 + pts[0][1] * 13) % 997) + 997) % 997;         // a run's own noise offset
    const P = []; for (let i = 0; i <= m; i++) P.push(at(i * step));
    const ground = (p, q) => {
      const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * W / 2, nz = dx / l * W / 2;
      return (x, z) => Math.min(groundAt(x + nx, z + nz), groundAt(x - nx, z - nz), groundAt(x, z));
    };
    for (let i = 0; i < m; i++) {
      const a = P[i], b = P[i + 1], G = ground(a, b);
      // modules overlap 3 cm at each joint (no slit at a bend)
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, e = 0.03;
      const ax = a[0] - ux * e, az = a[1] - uz * e, bx = b[0] + ux * e, bz = b[1] + uz * e;
      let ya = G(a[0], a[1]), yb = G(b[0], b[1]);
      // JOINS: the foot (HEDGE_BOTTOM x the height under the line) must reach the ground all along the module (a dip
      // between its ends): the module goes down by the worst gap and grows by as much (its top stays)
      let gap = 0;
      for (let k = 1; k < 8; k++) { const f = k / 8; gap = Math.max(gap, ya + (yb - ya) * f + HEDGE_BOTTOM * H - G(a[0] + dx * f, a[1] + dz * f)); }
      const drop = gap > 0 ? gap + 0.01 : 0, Hm = H + drop;
      ya -= drop; yb -= drop;
      push(out, ax, ya, az, bx - ax, yb - ya, bz - az, Hm, W, [sp + W / 10, s0 + i * step - e, l + 2 * e, Hm]);
      if ((++n & 3) === 0) yield;
    }
  }
  return n;
}
