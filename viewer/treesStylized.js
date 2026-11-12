// Our LiDAR trees drawn with game-engine-v1's stylized trees (vendor/stylized-trees): BRANCH-FIRST
// trees (the offroad game's branchTree.js: a curved, tapering trunk with a root flare, limbs and
// sub-branches swept into one bark mesh, leaf pads at the branch tips) whose pads are clumps of
// camera-facing leaf cards, each lit as its own dome, baked occlusion, sun shadows on the cards,
// light through the leaves, per-tree tint, 3 LODs (the far one casts no shadow), smooth leaf edges
// with MSAA (alpha-to-coverage). Default trees; ?trees=slop for slop-newyork's.
//
// This file: the leaf mask (drawn here: the engine's PNG has no recorded licence), the bark shader,
// placements from features.json (height from the LiDAR, a stable turn per tree), one shared set of
// materials and built trees for every tile, and the sun from viewer/lighting.js.
import * as THREE from "three/webgpu";
import { positionGeometry, vec3, float, mix, smoothstep, mx_noise_float, normalGeometry, max, uniform } from "three/tsl";
import { createStylizedTrees, lodMorph } from "../vendor/stylized-trees/stylizedTrees.js";
import { branchShape } from "../vendor/stylized-trees/branchTree.js";
import { bumpNormal } from "./tslkit.js";
import { bakeTreeImpostors, impostorMaterial, impostorField, IMPOSTOR_START, IMP } from "./impostors.js";
import { SMOOTH, lodEye, keepBand, rampTo } from "./lodFade.js";

// Far LOD: octahedral impostors past IMPOSTOR_START (viewer/impostors.js) with ?impostors=1. OFF by
// default since 2026-11-04: side by side from Saint-Job (zoomed on 150-400 m) the real LOD 1 / LOD 2
// trees were sharper and lit with highlights, the impostors blurrier with some smeared crowns, for
// the same GPU time in that view (6.43 vs 6.44 ms). Revisit with 16x16 views, a depth atlas
// (parallax) and a 3-view blend when the whole of Uccle multiplies the far trees.
// 2026-11-05 (docs/SMOOTH_LOD.md): ON again as the FAR LOD only, past IMPOSTOR_START (400 m; the side-by-side
// above was at 150-400 m, where the real trees stay), dither cross-faded from LOD 2, and on the far-LOD tiles
// (which had no trees at all: a whole tile of trees popped in at ~500 m when it was streamed in full).
// ?impostors=0: off (the real LOD 2 out to 900 m, no trees on far tiles).
const useImpostors = SMOOTH ? !/[?&]impostors=0/.test(location.search) : /[?&]impostors=1/.test(location.search);
let renderer = null;
/** The trees' shadow range (live: dev panel "Smoothness"): shadows fade out over [end - band, end] (m, view camera). */
export const TREE_SHADOW = { end: uniform(+(new URLSearchParams(location.search).get("treeshadowend") ?? 120)), band: uniform(40) };
/** main.js passes the renderer once (the impostor bake renders on it). */
export function setTreeRenderer(r) { renderer = r; }

// Street trees are pruned upright: the offroad game's "broad" (low fork, wide) and "tall" (long trunk,
// high fork) styles, picked per variant from the variant's own random stream (the same for its 3 LODs).
const SHAPES = [branchShape("broad"), branchShape("tall")];
// ?cardoct=1: cards cut to an octagon fitted to the leaf mask (54 % of the quad's area). Measured
// 2026-11-04 it LOSES: overview 7.1 -> 8.2 ms, close-up 7.7 -> 9.2, walk equal. Our cards are small and
// many and the camera-facing vertex work dominates, so 3x the triangles costs more than the empty
// texels it saves (the trimming trick pays for big particles, not for these cards). Quads by default.
const octCards = /[?&]cardoct=1/.test(location.search);
const streetShape = (r, lod) => ({ ...SHAPES[r() < 0.45 ? 0 : 1](r, lod), cardCorners: octCards ? CARD_CORNERS : null });
let lighting = null;
const sunDir = new THREE.Vector3(), sunCol = [1, 1, 1];

/** main.js passes its Lighting once (sun direction and colour for the leaves' translucency). */
export function setTreeLighting(l) { lighting = l; }

let maskTex = null;
/** A leafy branch mask in .r: ~70 small pointed leaves on a few twigs inside a soft round cluster. */
export function leafMask() {
  if (maskTex) return maskTex;
  const N = 256, cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const g = cv.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, N, N);
  let s = 12345;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  g.strokeStyle = "#fff"; g.lineCap = "round";
  // twigs from the centre outwards
  const tips = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd() * 0.6, L = N * (0.3 + rnd() * 0.12);
    g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(N / 2, N / 2);
    const mx = N / 2 + Math.cos(a + 0.25) * L * 0.5, my = N / 2 + Math.sin(a + 0.25) * L * 0.5;
    const ex = N / 2 + Math.cos(a) * L, ey = N / 2 + Math.sin(a) * L;
    g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
    for (let k = 0; k < 10; k++) { const t = 0.25 + (k / 10) * 0.8; tips.push([N / 2 + (ex - N / 2) * t, N / 2 + (ey - N / 2) * t, a]); }
  }
  // leaves: pointed ellipses along the twigs, a few loose ones to fill the cluster
  g.fillStyle = "#fff";
  const leaf = (x, y, ang, len) => {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0);
    g.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
    g.fill(); g.restore();
  };
  for (const [x, y, a] of tips) {
    const len = N * (0.07 + rnd() * 0.04);
    leaf(x, y, a + 0.9 + rnd() * 0.5, len);
    leaf(x, y, a - 0.9 - rnd() * 0.5, len);
  }
  for (let i = 0; i < 30; i++) {
    const r = Math.sqrt(rnd()) * N * 0.36, a = rnd() * Math.PI * 2;
    leaf(N / 2 + Math.cos(a) * r, N / 2 + Math.sin(a) * r, rnd() * Math.PI * 2, N * (0.06 + rnd() * 0.04));
  }
  // round the cluster off so the card's square never shows
  const d = g.getImageData(0, 0, N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const r = Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5) / (N / 2);
    const k = Math.max(0, Math.min(1, (1 - r) / 0.12));
    const i = (y * N + x) * 4;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = d.data[i] * k;
  }
  g.putImageData(d, 0, 0);
  CARD_CORNERS = fitOctagon(d.data, N);
  // R only, and coverage-preserving mips: a plain box-filtered mip chain averages the leaves into grey
  // below the 0.5 cut-off, so distant crowns thinned and turned see-through. Each level is rescaled so
  // the same share of texels passes 0.5 as at full size (Castaño; game-engine-v1 alphaCoverageMips.js).
  const level0 = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) level0[i] = d.data[i * 4];
  maskTex = new THREE.DataTexture(level0, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  maskTex.mipmaps = coverageMips(level0, N);
  maskTex.generateMipmaps = false;
  maskTex.colorSpace = THREE.NoColorSpace;
  maskTex.magFilter = THREE.LinearFilter;
  maskTex.minFilter = THREE.LinearMipmapLinearFilter;
  maskTex.anisotropy = 4;
  maskTex.flipY = false;   // DataTexture: row 0 = v 0 (the canvas's top row); the mask is symmetric enough
  maskTex.needsUpdate = true;
  window.__treeDebug = { corners: CARD_CORNERS, mask: maskTex, level0, coverageMips };
  return maskTex;
}

const coverage = (a, cut) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] >= cut) n++; return n / a.length; };
export function coverageMips(level0, N) {
  const target = coverage(level0, 128);
  const out = [{ data: level0, width: N, height: N }];
  let src = level0, w = N;
  while (w > 1) {
    const h = w >> 1, box = new Float32Array(h * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) {
      const i = 2 * y * w + 2 * x;
      box[y * h + x] = (src[i] + src[i + 1] + src[i + w] + src[i + w + 1]) / 4;
    }
    // the scale that keeps `target` of the texels at or above 0.5 (bisection on the scale)
    let lo = 0.5, hi = 8;
    for (let it = 0; it < 18; it++) {
      const k = (lo + hi) / 2;
      let n = 0;
      for (let i = 0; i < box.length; i++) if (box[i] * k >= 128) n++;
      if (n / box.length < target) lo = k; else hi = k;
    }
    const k = (lo + hi) / 2, mip = new Uint8Array(h * h);
    for (let i = 0; i < box.length; i++) mip[i] = Math.min(255, Math.round(box[i] * k));
    out.push({ data: mip, width: h, height: h });
    src = mip; w = h;
  }
  return out;
}

/** The card outline: an octagon fitted to the opaque texels (8 supporting half-planes, 2 px margin),
 *  in the card's unit corners. A quad wasted ~35-40 % of its area on empty texels, and every one is
 *  paid twice (depth pre-pass + colour) in alpha-tested foliage (Humus, "particle trimming"). */
let CARD_CORNERS = null;
function fitOctagon(rgba, N) {
  const dirs = Array.from({ length: 8 }, (_, k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);
  const h = dirs.map(() => -Infinity);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (rgba[(y * N + x) * 4] < 20) continue;                  // anything visible at all, not only >= 0.5
    const ux = (x + 0.5 - N / 2) / (N / 2), uy = (y + 0.5 - N / 2) / (N / 2);
    for (let k = 0; k < 8; k++) h[k] = Math.max(h[k], ux * dirs[k][0] + uy * dirs[k][1]);
  }
  const m = 4 / N;
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const [a1, b1] = dirs[k], [a2, b2] = dirs[(k + 1) % 8], c1 = h[k] + m, c2 = h[(k + 1) % 8] + m;
    const det = a1 * b2 - a2 * b1;
    pts.push([(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det]);
  }
  return pts;   // counter-clockwise in (u, v) like the quad's
}

// Depth pre-pass for the leaf cards (game-engine-v1 v3/render/foliage/foliageSystem.js, PERF_RULES #11):
// a cut-out card `discard`s, which turns early-z off, so overlapping cards shade every layer. First an
// UNLIT depth-only copy (same position and cut-out nodes, so the depths match exactly, and with
// alpha-to-coverage it writes the covered samples only), then the lit material with depth EQUAL and no
// discard: each pixel shaded once. The shadow pass keeps the cut-out (maskShadowNode).
// (one pair per leaf material: the near LODs' and the far LOD's, whose dithered fade (maskNode) is in the
// depth pass only: the EQUAL colour pass draws what the depth pass kept, without a discard of its own)
const prepass = new Map();
function prepassMaterials(base) {
  if (prepass.has(base)) return prepass.get(base);
  const depth = new THREE.MeshBasicNodeMaterial({ side: base.side });
  depth.positionNode = base.positionNode;
  depth.opacityNode = base.opacityNode;
  depth.maskNode = base.maskNode;
  depth.alphaTest = base.alphaTest;
  depth.alphaToCoverage = base.alphaToCoverage;
  depth.colorWrite = false;
  depth.name = "stylized-leaves:depth";
  const colour = base.clone();
  colour.opacityNode = null;
  colour.maskNode = null;
  colour.alphaTest = 0;
  colour.alphaToCoverage = false;
  colour.maskShadowNode = base.maskShadowNode;
  colour.depthFunc = THREE.EqualDepth;
  colour.depthWrite = false;
  colour.name = `${base.name || "stylized-leaves"}:colour`;
  depth.name = `${base.name || "stylized-leaves"}:depth`;
  // (shared by every tile; the colour pass needs no time fade of its own: EQUAL depth draws what the depth pass kept)
  depth.userData.shared = colour.userData.shared = true;
  colour.userData.objectFade = true;
  const pair = { depth, colour };
  prepass.set(base, pair);
  return pair;
}
const usePrepass = !/[?&]prepass=0/.test(location.search);   // ?prepass=0: A/B

const hash = (x, z, k) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

// the tree LODs that cast sun shadows: all three with the smooth LOD (the shadow then follows the same morph
// as the tree: no shadow switching on at 40 m), LOD 0 only before (?treeshadow=0|1|2)
// Measured 2026-11-05: every LOD casting (LOD 2 out to 400 m inside the orbit view's 380 m shadow box) more than
// doubled the shadow pass. Default now: LOD 0 and 1 cast, and the trees' shadows FADE OUT (dithered, shadow pass
// only) over TREE_SHADOW.band metres before TREE_SHADOW.end = the LOD 1 -> 2 switch, so no shadow switches.
const SHADOW_LODS = +(new URLSearchParams(location.search).get("treeshadow") ?? (SMOOTH ? 1 : 0));

/**
 * A SPECIES of stylized trees: everything the city's trees go through (one shared set of materials and built trees
 * per variant x LOD, nested LODs + morph, depth pre-pass, shadow fade, impostors baked from its own LOD 0, the far
 * tiles' impostor fields). The city's street trees are STREET below; the tree lab (labs/tree-lab.js) makes others
 * from the same chain (viewer/treesPlane.js). def = {
 *   id, variants, shape(r, lod) (the vendor's shape contract), leafMask() -> texture (.r coverage, optional .g tone),
 *   params: the vendor params (colours, cards...), bark(material): sets the bark's colour / normal / roughness nodes }
 */
export function makeSpecies(def) {
  const VARIANTS = def.variants ?? 6;
  let NATURAL_HEIGHT = 11;   // measured from the built trees on first use (calibrate())
  // def.perVariantHeight: each variant scaled by ITS own height (a species whose forms differ a lot: the plane's
  // pollards are half as tall as its avenue trees); the street trees keep the mean (as in the city)
  const VARIANT_HEIGHT = [];
  const shared = {};
  let PARAMS = null, impMat = null, impMatFar = null, impBake = null;
  // the vendor's variant per tree (stylizedTrees.js: rng(i * 7919 + 13) -> floor(x * variants)), the
  // impostor must draw the same variant
  const variantOfIndex = (i) => { let s = (i * 7919 + 13) >>> 0; s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return Math.floor((s / 4294967296) * VARIANTS); };
  const params = () => PARAMS ??= {
    leafMask: def.leafMask(), shape: def.shape,
    // LOD distances for a street-level city (the fog lab's 150 / 450 / 1600 m are for a valley forest):
    // measured 2026-11-04, walk 14.8 -> 9.5 ms GPU, overview 8.8 -> 7.5 ms.
    lodDist: 40, farDist: 120, maxDist: useImpostors ? IMPOSTOR_START : 900,
    // smooth LOD (docs/SMOOTH_LOD.md; vendor CHANGES #8-#10): the LODs are nested card sets, the cards a LOD drops
    // shrink away over `morph1` / `morph2` metres before its switch (and the kept ones grow), so the switch draws
    // the same pixels; distances from the VIEW camera (lodEye) in every pass, shadows included. The far LOD is
    // dither cross-faded into the impostors (or faded out at 900 m without them). ?smooth=0: hard switches.
    morph1: SMOOTH ? 14 : 0, morph2: SMOOTH ? 40 : 0, lodSlack: SMOOTH ? 6 : 0,
    lodEye: SMOOTH ? lodEye : undefined, barkMorph: SMOOTH,
    farMask: SMOOTH ? (d) => keepBand(float(0), float(1).sub(rampTo(d, IMP.start, IMP.band))) : undefined,
    ...def.params,
  };

  /** First use: build the shared materials and trees once (no instances), measure how tall a built tree
   *  is (for the LiDAR height -> scale), and give the shared trunk material its bark. */
  function calibrate() {
    if (shared.U) return;
    const t0 = performance.now();
    createStylizedTrees({ scene: new THREE.Group(), trees: [], shared, variants: VARIANTS, params: params() });
    let sum = 0, n = 0;
    for (const [key, g] of shared.geoms) {
      if (!key.endsWith(":0")) continue;
      g.leaves.computeBoundingBox();
      sum += g.leaves.boundingBox.max.y + 1.0;          // card centres + about a card's half size
      VARIANT_HEIGHT[+key.split(":")[0]] = g.leaves.boundingBox.max.y + 1.0;
      n++;
    }
    if (n) NATURAL_HEIGHT = sum / n;
    sp.buildMs = performance.now() - t0;
    def.bark(shared.trunkMat);
    if (def.leafRoughness != null) for (const m of new Set([shared.leafMat, shared.leafFar])) m.roughness = def.leafRoughness;   // (the beech: glossy)
    if (shared.trunkFar !== shared.trunkMat) {           // the far copy was cloned before the bark was set
      for (const k of ["colorNode", "normalNode", "roughnessNode"]) shared.trunkFar[k] = shared.trunkMat[k];
      shared.trunkFar.needsUpdate = true;
    }
    // (a streamed tile's trees fade in with the tile: lodFade.js gives them fading copies of these while it fades)
    for (const m of new Set([shared.leafMat, shared.leafFar, shared.trunkMat, shared.trunkFar])) m.userData.shared = true;
    // the trees' shadow distance fade (shadow pass only: the masks the shadow pass reads)
    if (SMOOTH) {
      const { d } = lodMorph(shared.U);
      const keepSh = () => keepBand(float(0), float(1).sub(rampTo(d, TREE_SHADOW.end, TREE_SHADOW.band)));
      for (const m of new Set([shared.leafMat, shared.leafFar])) m.maskShadowNode = m.maskShadowNode.and(keepSh());
      for (const m of new Set([shared.trunkMat, shared.trunkFar])) m.maskShadowNode = m.maskNode ? m.maskNode.and(keepSh()) : keepSh();
    }
    if (!useImpostors) IMP.start.value = 900;   // no impostors: LOD 2 fades out at 900 m (was a hard cut)
    if (useImpostors && renderer) {
      const t1 = performance.now();
      shared.U.lodScale.value = 0;                // the bake draws LOD 0 as built (no morph toward the bake camera)
      const bake = bakeTreeImpostors(renderer, shared, VARIANTS, PARAMS.leafMask);
      shared.U.lodScale.value = 1;
      const ib = { alphaBoost: def.impostorAlphaBoost ?? 0.3 };
      impMat = impostorMaterial(bake, shared.U, ib);
      impMatFar = impostorMaterial(bake, shared.U, { ...ib, nearFade: false });   // far-LOD tiles: no real trees to hand over from
      impBake = bake;
      impMat.userData.shared = impMatFar.userData.shared = true;   // one for every tile: never disposed with a tile
      sp.bakeMs = performance.now() - t1;
      if (def.id === "street") window.__impostorBake = bake;
      console.log(`tree impostors (${def.id}): ${VARIANTS} variants baked (${bake.size.join("x")} atlas x2) in ${sp.bakeMs.toFixed(0)} ms`);
    }
  }

  /** A tile's trees as the stylized trees place them: [x, z, ground y, turn, scale] in the tile's own order
   *  (the vendor's variant is picked from the index, so the far tile's impostors must use the same list).
   *  (t.turn: the lab's turntable; the city leaves it out) */
  function treePlacements(trees, ground, inTile, variantOf = variantOfIndex) {
    const placements = [];
    for (const t of trees) {
      if (!inTile(t.x, t.z)) continue;
      const h = Math.max(3, t.height ?? 9), H = def.perVariantHeight ? VARIANT_HEIGHT[variantOf(placements.length)] : NATURAL_HEIGHT;
      placements.push([t.x, t.z, ground(t.x, t.z), t.turn ?? hash(t.z, t.x, 2) * Math.PI * 2, Math.min(1.8, Math.max(0.3, h / H))]);
    }
    return placements;
  }

  /** Trees for a FAR-LOD tile (main.js loadLiteTile): the same trees as its full version, as impostors at any
   *  distance (null without impostors). Returns { mesh, update(cameraPos) }. */
  function buildFarField(trees, ground, inTile) {
    calibrate();
    if (!impMatFar) return null;
    const placements = treePlacements(trees, ground, inTile);
    if (!placements.length) return null;
    const imp = impostorField(placements, placements.map((_, i) => variantOfIndex(i)), impMatFar, { near: 0 });
    imp.mesh.boundingSphere = fieldSphere(placements);
    imp.mesh.frustumCulled = true;
    return { ...imp, count: placements.length };
  }

  /** A tile's trees. opts.variantOf(i): the variant of tree i (the lab; default the vendor's hash of the index). */
  function buildField(trees, ground, inTile, opts = {}) {
    calibrate();
    const variantOf = opts.variantOf ?? variantOfIndex;
    const placements = treePlacements(trees, ground, inTile, variantOf);
    const holder = new THREE.Group();
    holder.name = "StylizedTreesTile";
    const P = params();
    if (SMOOTH) P.maxDist = IMP.start.value;
    const f = createStylizedTrees({ scene: holder, trees: placements, shared, variants: VARIANTS, params: opts.variantOf ? { ...P, variantOf } : P });
    const imp = impMat ? impostorField(placements, placements.map((_, i) => variantOf(i)), impMat) : null;
    if (imp) holder.add(imp.mesh);
    // per-tile culling: the vendor turns frustum culling off (its instances span a whole forest); here
    // every mesh of the tile gets the tile's trees' bounding sphere
    if (placements.length) {
      const sphere = fieldSphere(placements);
      holder.traverse((o) => { if (o.isInstancedMesh) { o.frustumCulled = true; o.boundingSphere = sphere; } });
    }
    // STATIC usage for the per-instance buffers (the vendor marks them dynamic): three r187 re-uploads a
    // DynamicDrawUsage attribute in EVERY render pass of every frame (scene, shadow, depth twin), changed
    // or not; they only change on a LOD re-bucket (the camera moved 5 m), which sets needsUpdate and
    // uploads anyway. Measured 2026-11-04: writeBuffer was 38 % of the main thread, ~14 ms CPU a frame.
    holder.traverse((o) => {
      if (!o.isInstancedMesh) return;
      o.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      o.geometry.attributes.treeXf?.setUsage(THREE.StaticDrawUsage);
      o.geometry.attributes.treePos?.setUsage(THREE.StaticDrawUsage);
    });
    // Shadows: before the smooth LOD from LOD 0 only (a tree's shadow switched on at 40 m: the owner's "shadows
    // appear abruptly"). Now from every LOD (SHADOW_LODS): the morphed cards are the same in the shadow pass
    // (distances from lodEye), so the shadow follows the tree, and the shadow box's edge fade (lighting.js)
    // ends them softly. A mesh's LOD: its wrapper shares the index buffer of the shared tree "<variant>:<lod>".
    const lodOfIndex = new Map();
    for (const [key, g] of shared.geoms) { const lod = +key.split(":")[1]; lodOfIndex.set(g.leaves.index, lod); lodOfIndex.set(g.trunk.index, lod); }
    holder.traverse((o) => {
      if (!o.isInstancedMesh || !lodOfIndex.has(o.geometry.index)) return;
      o.userData.treeLod = lodOfIndex.get(o.geometry.index);
      o.castShadow = o.userData.treeLod <= SHADOW_LODS;
    });
    // leaf meshes -> lit EQUAL-depth material + an instanced depth twin drawn first (same geometry,
    // instance matrices and per-instance treeXf; its count follows the leaf mesh's every update)
    const twins = [];
    if (usePrepass) holder.traverse((o) => {
      if (!o.isInstancedMesh || (o.material !== shared.leafMat && o.material !== shared.leafFar)) return;
      const pm = prepassMaterials(o.material);
      o.material = pm.colour;
      const d = new THREE.InstancedMesh(o.geometry, pm.depth, o.instanceMatrix.count);
      d.instanceMatrix = o.instanceMatrix;
      d.count = 0;
      d.castShadow = d.receiveShadow = false;
      d.frustumCulled = o.frustumCulled; d.boundingSphere = o.boundingSphere;
      d.renderOrder = -1;
      d.userData.depthPrepass = true;
      o.add(d);
      twins.push([o, d]);
    });
    // live params / stats for tuning (the dev panel's Smoothness folder, the console); fields of disposed tiles
    // (no longer under a Scene) are dropped here, they were kept forever before
    const inScene = (o) => { while (o.parent) o = o.parent; return o.isScene; };
    window.__stylizedTrees = (window.__stylizedTrees || []).filter((t) => inScene(t.group));
    window.__stylizedTrees.push(f);
    const cam = { position: new THREE.Vector3() };
    const light = { sunDir, sunColor: sunCol };
    const update = (p) => {
      if (lighting) {
        sunDir.copy(lighting.sunDir);
        const c = lighting.keyColor, k = 0.18;          // the key light's colour x intensity, either sky
        sunCol[0] = c.r * k; sunCol[1] = c.g * k; sunCol[2] = c.b * k;
      }
      cam.position.copy(p);
      if (SMOOTH) f.params.maxDist = IMP.start.value;   // (live: the dev panel's impostor distance)
      f.update(cam, light);
      imp?.update(p);
      for (const [o, d] of twins) d.count = o.count;
    };
    const dispose = () => { f.dispose(); holder.removeFromParent(); imp?.mesh.geometry.dispose(); };
    return { group: holder, update, count: placements.length, field: f, imp, placements, dispose };
  }

  /** Free the species (the lab rebuilds one with another seed): materials, built trees, the impostor atlas. */
  function dispose() {
    if (!shared.U) return;
    for (const m of new Set([shared.leafMat, shared.leafFar, shared.trunkMat, shared.trunkFar, impMat, impMatFar])) m?.dispose();
    for (const g of shared.geoms.values()) { g.leaves.dispose(); g.trunk.dispose(); }
    impBake?.rtA.dispose(); impBake?.rtN.dispose();
    for (const k of Object.keys(shared)) delete shared[k];
    impMat = impMatFar = impBake = null;
    PARAMS = null;
  }

  const sp = {
    def, shared, variants: VARIANTS, calibrate, buildField, buildFarField, dispose, treePlacements, variantOfIndex, params,
    buildMs: 0, bakeMs: 0,
    get naturalHeight() { return NATURAL_HEIGHT; }, variantHeight: (v) => (def.perVariantHeight ? VARIANT_HEIGHT[v] : NATURAL_HEIGHT), get bake() { return impBake; }, get impMat() { return impMat; }, get impMatFar() { return impMatFar; },
  };
  return sp;
}

function fieldSphere(placements) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z, y] of placements) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2 + 8, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0 + 16, z1 - z0) / 2 + 12);
}

/** Bark: vertical ridges and furrows (3D noise stretched along the trunk), lichen-grey on the ridges,
 *  a little moss low down, the ridges as bump. In the tree's own space (positionGeometry), so the
 *  pattern stays on the bark whatever the instance's turn and scale. */
function barkMaterial(m) {
  const p = positionGeometry;
  const ridge = mx_noise_float(vec3(p.x.mul(7.0), p.y.mul(0.9), p.z.mul(7.0))).mul(0.5).add(0.5);
  const fine = mx_noise_float(vec3(p.x.mul(23.0), p.y.mul(3.0), p.z.mul(23.0))).mul(0.5).add(0.5);
  const furrow = smoothstep(0.35, 0.7, ridge);
  let col = mix(vec3(0.07, 0.055, 0.045), vec3(0.26, 0.22, 0.18), furrow);       // dark furrows, grey-brown ridges
  col = col.mul(fine.mul(0.35).add(0.82));
  const moss = smoothstep(1.6, 0.2, p.y).mul(smoothstep(0.2, 0.9, normalGeometry.y.add(normalGeometry.x.mul(0.5)).add(0.3)));
  col = mix(col, vec3(0.16, 0.2, 0.09), moss.mul(0.55));
  m.colorNode = col;
  m.normalNode = bumpNormal(furrow.mul(0.02).add(fine.mul(0.006)));
  m.roughnessNode = float(0.92);
  m.needsUpdate = true;
}

/** The city's street trees (the only species in the city today). */
export const STREET = makeSpecies({
  id: "street", variants: 6, shape: streetShape, leafMask, bark: barkMaterial,
  // Brussels street trees (planes, limes, chestnuts): olive rather than the fog lab's lime, more
  // spread between trees so a street doesn't read as one green band
  // the branch trees' trunk already reaches the pads; the shade side a soft olive, not black
  params: {
    topColor: "#8aa64e", bottomColor: "#27441d", translucencyColor: "#c6d07c", tintVar: 0.3,
    crownLift: 0, fill: 0.35, fillColor: "#8fae7c", aoColor: 0.35, trunkColor: [0.2, 0.15, 0.11],
  },
});
/** The parameters every NEW tile's tree field starts from (the dev panel writes its live LOD values here too). */
export const treeParams = () => STREET.params();
export const buildStylizedTreeField = (trees, ground, inTile) => STREET.buildField(trees, ground, inTile);
export const buildFarTreeField = (trees, ground, inTile) => STREET.buildFarField(trees, ground, inTile);
