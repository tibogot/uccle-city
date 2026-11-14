// THE LEAF LOOK of the factory-sprayed species (copper beech, horse chestnut; Tree Lab only), from our side of the
// vendor's leaf material (vendor/stylized-trees is read-only: these are node-valued params and post-build overrides,
// as viewer/treesStylized.js does for the depth pre-pass and the shadow fade). docs/TREES.md §8.
//
// The owner (2026-11-14): "your foliage looks a bit weird" next to the old trees. Four causes, four fixes:
//  1. TWO STYLES MIXED: the old trees' soft clump-dome shading under a crisp photographic spray with its own per-leaf
//     normal map (0.75) read as stickers on soft balls. -> `leafDetail`: the spray's per-leaf detail (its own
//     normals, each leaf's colour, the thickness in the light through) fades with the card's PIXEL FOOTPRINT (atlas
//     texels per screen pixel, from the derivatives of the card's uv: the mip level the GPU picks): crisp up close,
//     the plain clump dome from mid range, continuous (no switch, no distance band to see).
//  2. LEAVES TOO READABLE FROM FAR: the same fade, plus a small alpha mip bias as it fades (coverage-preserving mips:
//     the crown keeps its weight, the leaves merge into texture).
//  3. A JAGGED STICKER FRINGE: `softenRim`: the cards at the crown's silhouette (their centre on the crown's outer shell,
//     the shell seen edge-on from the camera) are eroded (their alpha scaled down: smaller, sparser leaves), by a
//     per-card random amount, continuous in the view (no card pops); and the outermost cards are built smaller.
//  4. A HEAVY CLOSED DARK INSIDE: `crownGaps` (for the species' crownInto): some outer pads are left out in clusters
//     (their secondary branch stays: limbs show in the gaps, sky and light come through); the species also lift
//     their occlusion floor and thin their inner layer.
import * as THREE from "three/webgpu";
import {
  attribute, uniform, texture, vec3, float, max, abs, dot, normalize, length, smoothstep, fwidth, log2, fract, sin,
  cameraPosition, positionGeometry, positionLocal, vertexStage, Fn, Discard, clamp, mix,
} from "three/tsl";
import { lodMorph } from "../vendor/stylized-trees/stylizedTrees.js";
import { applyAlphaCutout } from "../vendor/stylized-trees/alphaCutout.js";

/** Live tunables (uniforms, shared by the species that use this look; the lab writes them: window.lab.LOOK).
 *  near / far: the detail fade's mip levels; farVariation: the share of each leaf's own colour kept far; alphaBias:
 *  the alpha's mip bias once faded; erode: the rim cards' alpha cut; rimFade [from, to] m. */
export const LOOK = {
  near: uniform(1.7), far: uniform(3.4), farVariation: uniform(0.35), alphaBias: uniform(0.6), erode: uniform(0), rimShrink: uniform(0.45),
  fadeFrom: uniform(140), fadeTo: uniform(260), on: uniform(1), soften: uniform(1.5),
};

/** The card's uv (unit corner -> 0..1), as the vendor samples the spray. */
const cardUv = () => attribute("card", "vec4").xy.mul(0.5).add(0.5);

/**
 * The spray's detail weight (fragment): 1 = crisp (the atlas magnified or ~1:1), 0 = the plain clump dome, from the mip
 * level the GPU samples: log2(atlas texels per pixel). near / far: mip levels where the fade starts / ends.
 * (A 1024 px spray on a ~3 m card at 1400 x 850, 50 deg: mip ~0.9 at 5 m, ~2.4 at 15 m, ~3.9 at 40 m, ~5.4 at 120 m.)
 */
export function leafDetail({ size = 1024 } = {}) {
  const uv = cardUv();
  const mip = log2(max(max(fwidth(uv.x), fwidth(uv.y)).mul(size), 1e-4));
  return float(1).sub(smoothstep(LOOK.near, LOOK.far, mip).mul(LOOK.on));
}

/**
 * The vendor's params.leafAtlas with its per-leaf terms fading with the footprint (node-valued: the vendor takes
 * float(variation), normalK and float(transK) as nodes). atlas: loadLeafAtlas(...).atlas.
 * o = { variation, normalK, transK (the crisp values), farVariation (the share of the colour spread kept far: a
 *       little, so the crown is not a flat tint), near / far (leafDetail) }
 */
export function fadingLeafAtlas(atlas, { variation = 1, normalK = 0.75, transK = 1 } = {}) {
  const k = leafDetail({ size: atlas.albedo.image?.width ?? 1024 });
  return {
    ...atlas,
    variation: float(variation).mul(k.mul(float(1).sub(LOOK.farVariation)).add(LOOK.farVariation)),
    normalK: k.mul(normalK),
    transK: k.mul(transK),
    detail: k,
  };
}

/** Pads left out in clusters (gaps through the crown). Deterministic per tree from `seed` (a value the shape has
 *  already drawn: the random stream is not touched). Returns (azimuth rad, elevation deg) -> true = leave it out.
 *  share ~ the fraction of outer pads left out; topEl: no gap above this elevation (the dome's outline stays whole). */
export function crownGaps(seed, { share = 0.16, topEl = 62 } = {}) {
  let s = Math.floor(Math.abs(seed) * 1e6) >>> 0;
  const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const p = Array.from({ length: 4 }, () => r() * Math.PI * 2);
  // three smooth lobes over the sphere: their sum, scaled to ~[-1, 1]; the top `share` of it is a gap
  const n = (a, e) => (Math.sin(2 * a + p[0]) * Math.cos(1.6 * e + p[1]) + 0.7 * Math.sin(3 * a - 2 * e + p[2]) + 0.5 * Math.sin(5 * a + 3 * e + p[3])) / 2.2;
  // the threshold for `share` (n's distribution sampled once over the sphere)
  const v = [];
  for (let i = 0; i < 2000; i++) { const a = r() * Math.PI * 2, e = Math.asin(r() * 2 - 1); v.push(n(a, e)); }
  v.sort((x, y) => x - y);
  const thr = v[Math.floor((1 - share) * v.length)];
  return (a, el) => el < topEl && n(a, THREE.MathUtils.degToRad(el)) > thr;
}

/**
 * The crown's rim, softened (after createStylizedTrees, before any field: makeSpecies calls def.leafLook(shared, P)).
 *  - CPU, once: the cards whose centre is on the crown's outer shell are built smaller (view-independent: the same
 *    in the shadow and the impostor bakes);
 *  - GPU: the silhouette cards' alpha is eroded (a per-card random share), fading out by `fadeTo` m (the far LOD and
 *    the impostor bake show the uneroded crown: no change at the hand-over); the shadow keeps the plain cut.
 * o = { shrink (0.25: the outermost cards' size cut), erode (0.6), facing [0.15, 0.55] (|n.v| of the shell: full ..
 *       none), shell [0.6, 0.9] (where on the shell, centre 0 .. surface 1), fadeFrom / fadeTo (m), alphaBias (mip
 *       bias of the alpha as the detail fades) }
 */
export function softenRim(shared, P, o = {}) {
  const { shrink = 0.25, facing = [0.15, 0.55], shell = [0.6, 0.9] } = o;
  const atlas = P.leafAtlas;
  // the crown per built tree (its leaves' index buffer: every tile's wrapper shares it), and the CPU shrink
  const crowns = new Map();
  for (const g of shared.geoms.values()) {
    const L = g.leaves, pos = L.attributes.position, spin = L.attributes.cardSpin;
    const box = new THREE.Box3().setFromBufferAttribute(pos), c = box.getCenter(new THREE.Vector3()), rad = box.getSize(new THREE.Vector3()).multiplyScalar(0.5).max(new THREE.Vector3(0.5, 0.5, 0.5));
    crowns.set(L.index, { c, rad });
    if (shrink > 0 && !L.userData.rimShrunk) {
      const q = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        q.fromBufferAttribute(pos, i).sub(c).divide(rad);
        const k = 1 - shrink * THREE.MathUtils.smoothstep(q.length(), 0.75, 1.0);
        spin.setXY(i, spin.getX(i) * k, spin.getY(i) * k);
      }
      spin.needsUpdate = true;
      L.userData.rimShrunk = true;
    }
  }
  const none = { c: new THREE.Vector3(), rad: new THREE.Vector3(1e6, 1e6, 1e6) };
  const crownC = uniform(new THREE.Vector3()).onObjectUpdate(({ object }) => (crowns.get(object.geometry?.index) ?? none).c);
  const crownR = uniform(new THREE.Vector3(1, 1, 1)).onObjectUpdate(({ object }) => (crowns.get(object.geometry?.index) ?? none).rad);
  // per card (vertex stage: every vertex of a card sits at its centre, positionGeometry)
  const p = positionGeometry, xf = attribute("treeXf", "vec3"), foot = attribute("treePos", "vec3");
  const q = p.sub(crownC).div(crownR);
  const nT = normalize(q.div(crownR));
  const toWorld = (l) => vec3(xf.x.mul(l.x).add(xf.y.mul(l.z)), l.y, xf.x.mul(l.z).sub(xf.y.mul(l.x)));
  const centreW = foot.add(toWorld(p).mul(xf.z));
  const face = abs(dot(toWorld(nT), normalize(cameraPosition.sub(centreW))));
  const rand = fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))).mul(43758.5453));
  const { d } = lodMorph(shared.U);
  const rim = vertexStage(smoothstep(facing[1], facing[0], face).mul(smoothstep(shell[0], shell[1], length(q)))
    .mul(rand.mul(0.65).add(0.35)).mul(float(1).sub(smoothstep(LOOK.fadeFrom, LOOK.fadeTo, d))));
  const uv = cardUv();
  const bias = atlas.detail ? float(1).sub(atlas.detail).mul(LOOK.alphaBias) : float(0);
  const alpha = texture(atlas.albedo, uv).bias(bias).a;
  const eroded = alpha.mul(float(1).sub(rim.mul(LOOK.erode).mul(LOOK.on)));
  const shadowCut = texture(atlas.albedo, uv).a.greaterThanEqual(0.5);
  // the leaf edge: alphaCutout.js's centred coverage ramp (Golus), WIDER as the detail fades (x 1 + soften): the
  // leaves' cut edges go soft from mid range (MSAA coverage), instead of a crisp sticker outline
  const soft = atlas.detail ? float(1).add(float(1).sub(atlas.detail).mul(LOOK.soften).mul(LOOK.on)) : float(1);
  const cov = clamp(eroded.sub(0.5).div(max(fwidth(eroded).mul(soft), 1e-4)).add(0.5), 0, 1);
  // the rim cards shrink toward their centre (view-dependent, continuous: no card pops; an alpha erosion instead left
  // dithered "dust" where the cut alpha lay flat near the threshold). The vendor's positionNode = the card's centre
  // (positionLocal, instanced) + its corner (+ lift and sway, 0 / small): scaled about the centre.
  const shrinkK = float(1).sub(rim.mul(LOOK.rimShrink).mul(LOOK.on));
  const pos0 = shared.leafMat.positionNode, pos1 = mix(positionLocal, pos0, shrinkK);
  for (const m of new Set([shared.leafMat, shared.leafFar])) {
    m.positionNode = pos1;
    const a2c = m.alphaToCoverage;
    if (a2c) {
      m.opacityNode = Fn(() => { Discard(cov.lessThanEqual(0)); return cov; })();
      m.alphaTest = 0;
    } else applyAlphaCutout(m, eroded, { threshold: 0.5, coverage: false, shadow: false });
    m.maskShadowNode = m.maskNode ? shadowCut.and(m.maskNode) : shadowCut;   // (the far copy: its far mask too)
    m.needsUpdate = true;
  }
  return { crowns, rim };
}
