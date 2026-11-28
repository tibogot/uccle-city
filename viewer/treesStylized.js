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
import { positionGeometry, vec3, float, mix, smoothstep, mx_noise_float, normalGeometry, max, uniform, attribute, select, uniformArray, dot, sin, Fn, If, positionLocal, texture } from "three/tsl";
import { SEASON } from "./seasons/seasonMode.js";
import { createStylizedTrees, lodMorph } from "../vendor/stylized-trees/stylizedTrees.js";
import { branchShape } from "../vendor/stylized-trees/branchTree.js";
import { bumpNormal } from "./tslkit.js";
import { bakeTreeImpostors, impostorMaterial, impostorField, IMPOSTOR_START, IMP } from "./impostors.js";
import { SMOOTH, lodEye, keepBand, rampTo, ditherNoise, cloneMaterial } from "./lodFade.js";
import { env } from "./lighting.js";
import { useTreeKit, startTreeKit } from "./treeKitCity.js";
import { frameBudget, FadeSlots, Streamer, buildSource } from "./instanceStream.js";
import { setMultiDrawRenderer, multiDrawOK, MultiDrawSet, MultiStreamPool } from "./multiDraw.js";
import { wxMat } from "./weather/cityWeatherize.js";
import { BUSH_OLD, BUSH_SHAPES, BUSH_SEED, BUSH_KINDS, BUSH_TYPES, BUSH_SHADOW, BUSH_END_MAX, BUSH_END_BAND, BUSH_GLOW, bushShape, bushExtent } from "./plants/bushes.js";
import { wind, windAt, windPrev } from "./foliage/wind.js";
import { setMotionDelta } from "./upscale.js";   // the weather (docs/WEATHER.md "City hookup"): gated, ?weather=old none

// ---- the tree fields' re-buckets, spread over frames (docs/perf/AUDIT.md "instance pools"): within the city's
// streaming budget a frame (viewer/instanceStream.js frameBudget, shared with the instance pools and the façade kit)
const RELOD_DUE = 3, RELOD_URGENT = 4.5;
const relodTurn = (f) => frameBudget.left(f) > 0.05;
const relodSpent = (ms) => frameBudget.spend(ms);

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
// ?impkit=1 (2026-11-12): the far LOD through the impostor kit (viewer/treeKitCity.js, docs/CITY_TREES.md §1): one
// draw for every far tree of every tile, no crawling dots. The street trees only (the labs keep their own).
let renderer = null;
/** The trees' shadow range (live: dev panel "Smoothness"): shadows fade out over [end - band, end] (m, view camera). */
export const TREE_SHADOW = { end: uniform(+(new URLSearchParams(location.search).get("treeshadowend") ?? 120)), band: uniform(40) };
// polish1 (docs/POLISH.md item 2, ?treedither=old = before): SETTLED HAND-OVER BANDS. The mesh -> impostor hand-over
// (IMP.band, 30-50 m at 400 m) and the trees' shadow fade (TREE_SHADOW.band, 40 m at 120 m) are pixel splits by a
// static screen dither: every tree standing in a band showed a checker for as long as the camera stood still. Now
// the bands follow the camera's SPEED: band = speed x 0.8 s (clamped to [1 m, the configured band]), widening in
// ~0.15 s when the camera moves and narrowing over ~0.6 s when it stops. A tree crossing the hand-over spends
// ~0.8 s in the dissolve whatever the speed (a timed fade, as the landmarks' ?lodsettle), and standing still the
// trees settle to one side: whole mesh or whole impostor, no dither. CPU only (two uniforms per frame).
export function treeBandSettle() {
  if (!SMOOTH || /[?&](treedither|polish1)=old(&|$)/.test(location.search)) return () => {};
  const base = { imp: null, sh: TREE_SHADOW.band.value };
  let last = null, t0 = performance.now(), speed = 0;
  return (camPos) => {
    const now = performance.now(), dt = Math.min(0.1, Math.max(1e-3, (now - t0) / 1000)); t0 = now;
    base.imp ??= IMP.band.value;                  // (after the tree kit set the lab's band)
    if (!last) { last = camPos.clone(); return; }
    const v = camPos.distanceTo(last) / dt; last.copy(camPos);
    // (a teleport is not a speed: Go to / a tile jump)
    speed = v > 400 ? speed : speed + (v - speed) * (1 - Math.exp(-dt / (v > speed ? 0.05 : 0.25)));
    for (const [u, b0] of [[IMP.band, base.imp], [TREE_SHADOW.band, base.sh]]) {
      const goal = Math.min(b0, Math.max(1, speed * 0.8));
      u.value += (goal - u.value) * (1 - Math.exp(-dt / (goal > u.value ? 0.15 : 0.6)));
    }
  };
}
/** main.js passes the renderer once (the impostor bake renders on it). */
export function setTreeRenderer(r) { renderer = r; setMultiDrawRenderer(r); }

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

// ---- BARE WINTER TREES (claude/xmasreview, owner 2026-11-26 "the winter look for Christmas"; rule bare-winter-trees).
// The city's trees are ONE broadleaf form (the LiDAR gives height and crown, no species): in the season
// (viewer/seasons/seasonMode.js SEASON.winter) every street / park tree is a deciduous tree without its leaves. The
// cheapest correct way, with no new geometry, draw or pass: the SAME leaf cards draw a mask of fine TWIGS (a branching
// spray with buds, about half the leaves' coverage) in grey-brown, so the crown keeps its silhouette as a twig haze (not
// dead sticks: the limbs and sub-branches are the bark mesh under it); the far impostors are baked from the same
// twigs, the shadows are the twigs' (thin, light). The shrubs share the cards: the evergreen kinds (box, laurel,
// rhododendron, lavender) keep their leaves (the mask's .r = leaves + twigs, .g = twigs only: the trees and the
// deciduous shrubs (hydrangea, rose) keep .g), and their colour (bush tint / the winter factor).
// ?season=summer: the leafy trees (the A/B); ?baretrees=0: winter without bare trees.
export const BARE = SEASON.winter && !/[?&]baretrees=0(&|$)/.test(location.search);
/** the winter twig colour = the summer leaf colour x this, per channel (sRGB #8aa64e top -> ~#6e655a grey-brown): the
 *  vendor's leaf colour and its light through / fill are linear in the colour uniforms, so x WINTER_F turns them all
 *  and the evergreen shrubs get their green back exactly with a tint / WINTER_F */
export const WINTER_F = [0.61, 0.34, 1.34];
const BARE_KINDS = new Set(["hydrangea", "rose"]);       // the deciduous shrubs: bare too
let twigTex = null;
let maskTex = null;
/** the winter twig spray (0-255 coverage, N x N): a few main twigs from the centre, forking, thinning, buds at the
 *  tips, rounded off like the leaf cluster */
export function twigCoverage(N, canvas = null) {
  const cv = canvas ?? document.createElement("canvas"); cv.width = cv.height = N;
  const g = cv.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, N, N);
  g.strokeStyle = g.fillStyle = "#fff"; g.lineCap = "round";
  let s = 777;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const twig = (x, y, a, L, w, depth) => {
    const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L, bend = (rnd() - 0.5) * 0.5;
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + bend) * L * 0.5, y + Math.sin(a + bend) * L * 0.5, ex, ey); g.stroke();
    if (depth >= 3) { g.beginPath(); g.arc(ex, ey, Math.max(1.1, w * 0.9), 0, Math.PI * 2); g.fill(); return; }   // a bud
    const n = depth === 0 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const t = 0.45 + 0.5 * (k / n) + rnd() * 0.08, side = k % 2 ? 1 : -1;
      twig(x + (ex - x) * t, y + (ey - y) * t, a + side * (0.35 + rnd() * 0.45), L * (0.42 + rnd() * 0.15), Math.max(1.0, w * 0.62), depth + 1);
    }
    twig(ex, ey, a + (rnd() - 0.5) * 0.3, L * 0.45, Math.max(1.0, w * 0.7), depth + 2);
  };
  for (let i = 0; i < 6; i++) twig(N / 2, N / 2, (i / 6) * Math.PI * 2 + rnd() * 0.5, N * (0.2 + rnd() * 0.06), 2.6, 0);
  const d = g.getImageData(0, 0, N, N), out = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const r = Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5) / (N / 2), k = Math.max(0, Math.min(1, (1 - r) / 0.12));
    out[y * N + x] = d.data[(y * N + x) * 4] * k;
  }
  return out;
}
const maskTexture = (data, N, format, mips) => {
  const t = new THREE.DataTexture(data, N, N, format, THREE.UnsignedByteType);
  t.mipmaps = mips; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; t.flipY = false; t.needsUpdate = true;
  return t;
};
/** the winter masks from the leaf mask's level 0: the pool's RG mask (.r leaves + twigs, .g twigs) and twigTex (.r
 *  twigs only: the far impostors, trees only); coverage-preserving mips per channel */
function winterMasks(leaf0, N) {
  const tw = twigCoverage(N), un = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) un[i] = Math.max(leaf0[i], tw[i]);
  const mu = coverageMips(un, N), mt = coverageMips(tw, N);
  const rgMips = mu.map((m, l) => { const a = new Uint8Array(m.width * m.height * 2); for (let i = 0; i < m.width * m.height; i++) { a[2 * i] = m.data[i]; a[2 * i + 1] = mt[l].data[i]; } return { data: a, width: m.width, height: m.height }; });
  twigTex = maskTexture(tw, N, THREE.RedFormat, mt);
  twigTex.name = "winter twigs";
  const rg = maskTexture(rgMips[0].data, N, THREE.RGFormat, rgMips);
  rg.name = "winter leaves + twigs";
  return rg;
}
/** the mask the far impostors bake (trees only): the twigs in winter, else the leaf mask */
export const farLeafMask = () => (BARE ? (leafMask(), twigTex) : leafMask());
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
  if (BARE) {                                                     // (the winter masks: the same card, its twigs)
    maskTex = winterMasks(level0, N);
    // (no city pool or no shrubs in it (?treepool=old / ?bushes=old): the vendor's own materials read .r: twigs only)
    if (!TREE_POOL || !BUSHES) maskTex = twigTex;
    window.__treeDebug = { corners: CARD_CORNERS, mask: maskTex, twigs: twigTex, level0, coverageMips };
    return maskTex;
  }
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
  let PARAMS = null, impMat = null, impMatFar = null, impBake = null, pool = null;
  const kitMode = useImpostors && useTreeKit && def.id === "street";
  let kit = null;
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
    // def.maxCardSpin (rad): the cards keep their spray near upright, the vendor's random spin scaled down to +- this
    // (a spray with an up: the horse chestnut's candles and upturned twig tips; viewer/treesHorseChestnut.js)
    if (def.maxCardSpin != null) for (const g of shared.geoms.values()) {
      const a = g.leaves.attributes.cardSpin;
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i), y = a.getY(i), s = Math.hypot(x, y), t = Math.atan2(y, x) * (def.maxCardSpin / Math.PI);
        a.setXY(i, Math.cos(t) * s, Math.sin(t) * s);
      }
      a.needsUpdate = true;
    }
    // def.leafLook(shared, params): a species' own leaf-look overrides on the shared leaf materials and built cards,
    // before anything reads them (viewer/treeLeafLook.js: the copper beech and horse chestnut; the others have none)
    def.leafLook?.(shared, PARAMS);
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
    // the weather (viewer/weather/cityWeatherize.js): wet bark, snow on the upper side of limbs and on the crowns' tops,
    // plastered on the windward side of trunks; the crowns shelter the ground under them in the overhead bake
    // snow round 2 (claude/snowtracks, ?snowlimbs=old = before): snow lay as a white stripe on EVERY branch and the crowns
    // read as blossom (white specks on every up-facing card). Now: a soft cap on the upper side of the thicker limbs
    // only (the ring radius from the bark attribute: none under ~3 cm, full from ~7 cm), and on the crowns only the top
    // ~40 % of the crown and its open (unoccluded) cards hold snow
    const OLD_LIMBS = /[?&]snowlimbs=old(&|$)/.test(location.search);
    const bark = attribute("bark", "vec4"), card = attribute("card", "vec4");
    const limb = smoothstep(0.03, 0.07, positionGeometry.sub(bark.xyz).length());
    for (const m of new Set([shared.trunkMat, shared.trunkFar])) wxMat(m, OLD_LIMBS ? { porosity: 0.7, snowUp: [0.12, 0.45], plaster: true } : { porosity: 0.7, snowUp: [0.3, 0.75], snowMask: limb, plaster: true });
    const crownTop = smoothstep(0.45, 0.85, card.w).mul(mix(float(0.45), float(1), card.z.clamp(0, 1)));
    for (const m of new Set([shared.leafMat, shared.leafFar])) { wxMat(m, OLD_LIMBS ? { porosity: 0.2, snowUp: [0.45, 0.9], snowMask: float(0.8) } : { porosity: 0.2, snowUp: [0.4, 0.88], snowMask: crownTop }); m.userData.wxCanopy = true; m.userData.nightFoliage = true; }   // (fix3: the night loop's cheap foliage path, nightLighting.js)
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
    if (kitMode && renderer) {
      kit = startTreeKit(renderer, shared, def.id === "street" ? farLeafMask() : PARAMS.leafMask, VARIANTS);
      window.__treeKit = kit;
    } else if (useImpostors && renderer && !def.noImpostorBake) {
      // (def.noImpostorBake: a species whose far trees go through the impostor kit (the Tree Lab's copper beech and
      // horse chestnut) never draws these: their 64 MB atlas is not baked)
      const t1 = performance.now();
      shared.U.lodScale.value = 0;                // the bake draws LOD 0 as built (no morph toward the bake camera)
      const bake = bakeTreeImpostors(renderer, shared, VARIANTS, def.id === "street" ? farLeafMask() : PARAMS.leafMask);
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
    // (drivecheck round 2: a tree's `vi`, viewer/streets/roadTrees.js, is the index its variant is picked by when trees
    // before it were dropped: placements.vi[i]; none: the index, as before)
    let vi = null;
    for (const t of trees) {
      if (!inTile(t.x, t.z)) continue;
      if (t.vi != null && !vi) vi = placements.map((_, k) => k);
      const k = t.vi ?? placements.length;
      if (vi) vi.push(k);
      const h = Math.max(3, t.height ?? 9), H = def.perVariantHeight ? VARIANT_HEIGHT[variantOf(k)] : NATURAL_HEIGHT;
      placements.push([t.x, t.z, ground(t.x, t.z), t.turn ?? hash(t.z, t.x, 2) * Math.PI * 2, Math.min(1.8, Math.max(0.3, h / H))]);
    }
    if (vi) placements.vi = vi;
    return placements;
  }
  /** variantOf(i) of placement i: through placements.vi when the list had drops */
  const byVi = (placements, vo) => (placements.vi ? (i) => vo(placements.vi[i]) : vo);

  /** Trees for a FAR-LOD tile (main.js loadLiteTile): the same trees as its full version, as impostors at any
   *  distance (null without impostors). Returns { mesh, update(cameraPos) }. */
  function buildFarField(trees, ground, inTile) {
    calibrate();
    if (kit) {
      const placements = treePlacements(trees, ground, inTile);
      if (!placements.length) return null;
      const release = kit.register(placements, byVi(placements, variantOfIndex), "lite");
      const mesh = new THREE.Group();
      mesh.name = "tree-kit-far-tile";
      return { mesh, update() {}, count: placements.length, dispose: release };
    }
    if (!impMatFar) return null;
    const placements = treePlacements(trees, ground, inTile);
    if (!placements.length) return null;
    const vf = byVi(placements, variantOfIndex);
    const imp = impostorField(placements, placements.map((_, i) => vf(i)), impMatFar, { near: 0 });
    imp.mesh.boundingSphere = fieldSphere(placements);
    imp.mesh.frustumCulled = true;
    // (the far tiles' re-buckets spread over frames like the near fields', see relodTurn)
    const last = new THREE.Vector3(Infinity, 0, 0);
    const update = (p) => {
      const moved = p.distanceToSquared(last), turn = relodTurn(imp);
      const force = moved > RELOD_DUE * RELOD_DUE && (turn || moved > RELOD_URGENT * RELOD_URGENT);
      const t0 = force ? performance.now() : 0;
      if (force) last.copy(p);
      imp.update(p, force);
      if (force) relodSpent(performance.now() - t0);
    };
    return { ...imp, update, count: placements.length };
  }

  /** A tile's trees. opts.variantOf(i): the variant of tree i (the lab; default the vendor's hash of the index). */
  function buildField(trees, ground, inTile, opts = {}) {
    calibrate();
    const variantOf0 = opts.variantOf ?? variantOfIndex;
    const placements = treePlacements(trees, ground, inTile, variantOf0);
    const variantOf = byVi(placements, variantOf0);
    // perf pass 2 (docs/perf/AUDIT.md step 12): the street trees as ONE city-wide pool (?treepool=old = per tile)
    if (def.id === "street" && TREE_POOL && usePrepass && !opts.variantOf && multiDrawOK()) {
      pool ??= makeTreePool(shared, params(), VARIANTS, { kitRegister: kit ? (pl, vo) => kit.register(pl, vo, "full") : null });
      return pool.addField(placements, variantOf);
    }
    const holder = new THREE.Group();
    holder.name = "StylizedTreesTile";
    const P = params();
    if (SMOOTH) P.maxDist = IMP.start.value;
    const f = createStylizedTrees({ scene: holder, trees: placements, shared, variants: VARIANTS, params: opts.variantOf || placements.vi ? { ...P, variantOf } : P });
    const imp = impMat ? impostorField(placements, placements.map((_, i) => variantOf(i)), impMat) : null;
    if (imp) holder.add(imp.mesh);
    // the kit: this tile's far trees join the one city field (released when main.js disposes the tile: it calls
    // dispose() on every object of the tile)
    if (kit) { const release = kit.register(placements, variantOf, "full"); holder.dispose = release; }
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
    // an instanced mesh with count 0 still costs a draw (and its CPU) in every pass: 54 meshes a tile (6 species x 3
    // bands x leaves / depth twin / bark), most of them empty at any moment -> hidden while empty (perf audit 2026-11-13:
    // 358 of 806 draws a frame drew nothing)
    const insts = [];
    holder.traverse((o) => { if (o.isInstancedMesh) insts.push(o); });
    // live params / stats for tuning (the dev panel's Smoothness folder, the console); fields of disposed tiles
    // (no longer under a Scene) are dropped here, they were kept forever before
    const inScene = (o) => { while (o.parent) o = o.parent; return o.isScene; };
    window.__stylizedTrees = (window.__stylizedTrees || []).filter((t) => inScene(t.group));
    window.__stylizedTrees.push(f);
    const cam = { position: new THREE.Vector3() };
    const light = { sunDir, sunColor: sunCol };
    const mine = { last: new THREE.Vector3(Infinity, 0, 0), nudge: 0, slack: f.params.lodSlack ?? 0 };
    const update = (p) => {
      if (lighting) {
        sunDir.copy(lighting.sunDir);
        // the key light's colour x intensity, either sky; at night the key is the MOON, whose colour the trees took at
        // full sun strength (vivid green crowns under the night exposure): dim it with the night (owner 2026-11-12)
        const c = lighting.keyColor, k = 0.18 * (1 - 0.8 * env.uNight.value);
        sunCol[0] = c.r * k; sunCol[1] = c.g * k; sunCol[2] = c.b * k;
      }
      // the leaves' FILL is an unlit (emissive) term: scale it with the daylight, else trees (and their impostors,
      // which share the uniform) glow green at night (owner, 2026-11-12: "far away the city is very bright at night")
      if (shared.U?.fill) shared.U.fill.value = params().fill * (1 - 0.92 * env.uNight.value);
      cam.position.copy(p);
      if (SMOOTH) f.params.maxDist = IMP.start.value;   // (live: the dev panel's impostor distance)
      // the re-buckets SPREAD over frames (every loaded tile used to re-bucket in the same frame each 5 m: 1-4 ms):
      // a tile is due after RELOD_DUE m, served while the frame's budget lasts, at once past RELOD_URGENT m (the
      // field's own 5 m trigger stays the backstop). The field's re-bucket is forced by a 1e-6 nudge of its lodSlack
      // (part of its re-bucket key; the vendor file stays as it is)
      const moved = p.distanceToSquared(mine.last);
      const turn = relodTurn(f);
      const force = moved > RELOD_DUE * RELOD_DUE && (turn || moved > RELOD_URGENT * RELOD_URGENT);
      const t0 = force ? performance.now() : 0;
      if (force) { mine.nudge ^= 1; f.params.lodSlack = mine.slack + mine.nudge * 1e-6; mine.last.copy(p); }
      f.update(cam, light);
      imp?.update(p, force);
      if (force) relodSpent(performance.now() - t0);
      for (const [o, d] of twins) d.count = o.count;
      for (const o of insts) o.visible = o.count > 0;
    };
    const dispose = () => { f.dispose(); holder.removeFromParent(); imp?.mesh.geometry.dispose(); holder.dispose?.(); holder.dispose = null; };
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

  /** the city-wide pool without a tree field (the bushes join it: viewer/plants/cityPlants.js); null when the pool
   *  path is off (?treepool=old, ?prepass=0, no multi-draw) */
  function ensurePool() {
    if (def.id !== "street" || !TREE_POOL || !usePrepass || !multiDrawOK()) return null;
    calibrate();
    pool ??= makeTreePool(shared, params(), VARIANTS, { kitRegister: kit ? (pl, vo) => kit.register(pl, vo, "full") : null });
    return pool;
  }

  const sp = {
    def, shared, variants: VARIANTS, calibrate, buildField, buildFarField, dispose, treePlacements, variantOfIndex, params, ensurePool,
    buildMs: 0, bakeMs: 0, get pool() { return pool; },
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
// polish1 (docs/POLISH.md item 3, ?bark=old = before): the old bark below read as ZEBRA stripes: one noise stretched
// 8:1 along the tree's own y (on a leaning trunk / limb: diagonal bands), ~0.3-0.5 m wide, and a 0.07 -> 0.26 ramp
// (near-black furrows over half the surface). Brussels street trees are London planes and limes (photos, look only):
// a plane's bark is soft, flaking PATCHES (grey, olive-grey, cream, 10-30 cm), a lime's fine shallow vertical
// fissures, both mid grey-brown with low contrast. Now: isotropic patches + thin, short fissures (only ~15 % of the
// surface, darkened by a third), base 0.09-0.175 linear (contrast ~1.9:1, the old mean), the same bump channel scaled down.
const BARK_OLD = /[?&](bark|polish1)=old(&|$)/.test(location.search);
function barkMaterial(m) {
  if (!BARK_OLD) return barkMaterialReal(m);
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

function barkMaterialReal(m) {
  const p = positionGeometry;
  // plane patches: two octaves of isotropic noise, soft-edged into three tones
  const pa = mx_noise_float(p.mul(2.2)).mul(0.65).add(mx_noise_float(p.mul(5.1).add(7.3)).mul(0.35)).mul(0.5).add(0.5);
  const grey = vec3(0.13, 0.122, 0.105), olive = vec3(0.092, 0.088, 0.068), cream = vec3(0.175, 0.163, 0.13);
  let col = mix(olive, grey, smoothstep(0.38, 0.52, pa));
  col = mix(col, cream, smoothstep(0.6, 0.72, pa).mul(0.8));
  // fine fissures: short (y x 2.6 vs x / z x 16: 3:1, not 8:1), thin, a third darker
  const fis = mx_noise_float(vec3(p.x.mul(16.0), p.y.mul(2.6), p.z.mul(16.0))).mul(0.5).add(0.5);
  const crack = smoothstep(0.34, 0.24, fis);
  col = col.mul(float(1).sub(crack.mul(0.33)));
  const fine = mx_noise_float(vec3(p.x.mul(41.0), p.y.mul(9.0), p.z.mul(41.0))).mul(0.5).add(0.5);
  col = col.mul(fine.mul(0.16).add(0.92));
  const moss = smoothstep(1.6, 0.2, p.y).mul(smoothstep(0.2, 0.9, normalGeometry.y.add(normalGeometry.x.mul(0.5)).add(0.3)));
  col = mix(col, vec3(0.15, 0.18, 0.09), moss.mul(0.45));
  m.colorNode = col;
  // relief: the patches' edges barely (flakes are flush), the fissures a little, the grain
  m.normalNode = bumpNormal(crack.mul(-0.006).add(smoothstep(0.55, 0.62, pa).mul(0.0025)).add(fine.mul(0.003)));
  m.roughnessNode = float(0.9);
  m.needsUpdate = true;
}

/** (BARE) the winter colours: the leaf colours x WINTER_F (linear); the light through twigs a third of the leaves' */
export function winterParams(p) {
  if (!BARE) return p;
  const f = (hex, k = 1) => { const c = new THREE.Color(hex); c.r *= WINTER_F[0] * k; c.g *= WINTER_F[1] * k; c.b *= WINTER_F[2] * k; return `#${c.getHexString()}`; };
  return { ...p, topColor: f(p.topColor), bottomColor: f(p.bottomColor), translucencyColor: f(p.translucencyColor, 0.35) };
}
/** The city's street trees (the only species in the city today). */
export const STREET = makeSpecies({
  id: "street", variants: 6, shape: streetShape, leafMask, bark: barkMaterial,
  // Brussels street trees (planes, limes, chestnuts): olive rather than the fog lab's lime, more
  // spread between trees so a street doesn't read as one green band
  // the branch trees' trunk already reaches the pads; the shade side a soft olive, not black
  params: winterParams({
    topColor: "#8aa64e", bottomColor: "#27441d", translucencyColor: "#c6d07c", tintVar: 0.3,
    crownLift: 0, fill: 0.35, fillColor: "#8fae7c", aoColor: 0.35, trunkColor: [0.2, 0.15, 0.11],
  }),
});
/** The parameters every NEW tile's tree field starts from (the dev panel writes its live LOD values here too). */
export const treeParams = () => STREET.params();
export const buildStylizedTreeField = (trees, ground, inTile) => STREET.buildField(trees, ground, inTile);
export const buildFarTreeField = (trees, ground, inTile) => STREET.buildFarField(trees, ground, inTile);
/** the bushes' pool (the street trees' city-wide pool, viewer/plants/bushes.js): null with ?bushes=old or without
 *  the pool path (the plants then draw the shrubs as before) */
export const bushPool = () => (BUSHES ? STREET.ensurePool() : null);

// ------------------------------------------------------------------------------------------------ the city tree pool
// Perf pass 2 (docs/perf/AUDIT.md step 12; ?treepool=old = the per-tile fields). Before: every loaded tile had its own
// vendor field, 6 variants x 3 LODs x (leaves, their depth pre-pass twin, bark) = 54 instanced meshes a tile: 108 scene
// + 54 shadow draws at the Place (9 tiles). Now ONE pool for the city: per LOD a multi-draw set (viewer/multiDraw.js)
// whose parts are the 6 variants, drawn by 3 meshes (leaves, depth twin, bark): 9 render objects, 4 of them in the
// shadow pass. The tiles' trees are streaming sources (viewer/instanceStream.js: 50 m cells, the gather time-sliced in
// the city's streaming budget); the LOD of a tree = the vendor's: distance from the gather centre to its foot, the
// bands lodDist / farDist / impostor start + lodSlack (the morph covers the lag, as with the vendor's re-bucket). The
// tile fade: a slot per tile (FadeSlots) read by the pool's own copies of the shared materials (dithered, as lodFade.js).
const TREE_POOL = !/[?&]treepool=old(&|$)/.test(location.search);
const treeFades = new FadeSlots();

// BUSHES in the pool (claude/bushes, viewer/plants/bushes.js; ?bushes=old: the Blender plants as before): the shrubs
// are extra PARTS of the same multi-draw sets (crowns of leaf cards without bark, built by the vendor from bush shapes),
// drawn by the same leaf views: 0 more draws. treeSlot carries slot + 128 x kind + 1024 x far end (m): kind 0 = a tree
// (its value unchanged), 1..6 = the shrub type (its leaf colour on the trees' palette, BUSH_TYPES tint), the end the
// bush's dithered fade-out (from > 40 m: tools/audit/bushGate.mjs). Bushes sway in the foliage wind (the plants' and
// hedges' wind, viewer/foliage/wind.js, with its motion vectors) and cast sun shadows to BUSH_SHADOW.end.
const BUSHES = !BUSH_OLD;
// (BARE) the evergreen shrubs' green back: their tint / WINTER_F (the deciduous ones keep the twig colour x their tint)
export const bushTintRows = () => [[1, 1, 1, 0], ...BUSH_KINDS.map((t) => { const [r, g, b, w] = BUSH_TYPES[t].tint; return BARE && !BARE_KINDS.has(t) ? [r / WINTER_F[0], g / WINTER_F[1], b / WINTER_F[2], w] : [r, g, b, w]; })];
const bushTint = uniformArray(bushTintRows().map((v) => new THREE.Vector4(...v)), "vec4");
/** (BARE) the shrub kinds (treeSlot kind = index + 1) that draw twigs only, as the trees (kind 0) */
export const BARE_KIND_IDS = BUSH_KINDS.map((t, i) => (BARE_KINDS.has(t) ? i + 1 : -1)).filter((i) => i > 0);
/** the decoded treeSlot: { s: the fade slot, k: the kind (0 tree), e: the far end (m) } */
function slotParts() {
  const v = attribute("treeSlot", "float");
  const e = v.add(0.5).div(1024).floor(), r = v.sub(e.mul(1024)), k = r.add(0.5).div(128).floor();
  return { s: r.sub(k.mul(128)), k, e };
}

function makeTreePool(shared, P, VARIANTS, { kitRegister = null } = {}) {
  const NB = BUSHES ? BUSH_SHAPES.length : 0;
  const { d: lodD } = lodMorph(shared.U);
  const slotKeep = () => {
    const { s, k, e } = slotParts();
    const f = treeFades.fade(s), n = ditherNoise();
    const tile = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
    if (!NB) return tile;
    // a bush's far end: dithered out over its last 20 % (per instance: the whole bush dissolves, never in the near range)
    return tile.and(k.lessThan(0.5).or(n.lessThan(float(1).sub(rampTo(lodD, e, e.mul(BUSH_END_BAND))))));
  };
  // the bushes' shadows end at BUSH_SHADOW.end (dithered over its band); the trees' as before
  const bushShadowKeep = () => { const { k } = slotParts(); return k.lessThan(0.5).or(ditherNoise().lessThan(float(1).sub(rampTo(lodD, float(BUSH_SHADOW.end), float(BUSH_SHADOW.band))))); };
  // the bush's leaf colour on the trees' palette (rgb x, then toward its grey); trees x 1
  const tintOf = (c) => {
    const t = bushTint.element(slotParts().k.toInt()), m = c.mul(t.xyz);
    return mix(m, vec3(dot(m, vec3(0.2126, 0.7152, 0.0722))), t.w);
  };
  // the bushes' sway (world metres): the crown leans with the wind (height in the bush squared) + each card flutters;
  // built eagerly (windPrev rebuilds it at last frame's time for the motion vectors), evaluated for bushes only
  const bushWindOf = () => {
    const foot = attribute("treePos", "vec3"), card = attribute("card", "vec4");
    const w = windAt(foot.xz), hW = positionLocal.y.sub(foot.y).max(0), hA = card.w.clamp(0, 1);
    const ph = positionLocal.x.mul(3.1).add(positionLocal.z.mul(2.3)).add(positionLocal.y.mul(1.7));
    const fl = sin(wind.uTime.mul(6.0).add(ph)).mul(w.z.mul(0.25).add(0.08)).mul(wind.uStrength).mul(hW).mul(0.05);
    const lean = w.xy.mul(hA.mul(hA)).mul(hW.add(0.2)).mul(0.16);
    return vec3(lean.x.add(fl), fl.mul(0.4), lean.y.sub(fl.mul(0.6)));
  };
  const onlyBush = (node) => Fn(() => { const o = vec3(0, 0, 0).toVar(); If(slotParts().k.greaterThan(0.5), () => { o.assign(node); }); return o; })();
  const bushWind = NB ? onlyBush(bushWindOf()) : null;
  const bushMotion = NB ? (() => { const [o0, o1] = windPrev(bushWindOf); return onlyBush(o1.sub(o0)); })() : null;
  const own = (base, name) => { const m = cloneMaterial(base); m.name = name; m.userData.shared = true; m.userData.noFade = true; return m; };
  const and = (a, b) => (a ? a.and(b) : b);
  const mats = [shared.leafMat, shared.leafFar].map((leaf, far) => {
    const pm = prepassMaterials(leaf), tr = far ? shared.trunkFar : shared.trunkMat;
    const depth = own(pm.depth, `${pm.depth.name}:pool`); depth.maskNode = and(pm.depth.maskNode, slotKeep());
    const colour = own(pm.colour, `${pm.colour.name}:pool`); colour.maskShadowNode = and(pm.colour.maskShadowNode, slotKeep());
    if (BARE && NB) {
      // (winter) the trees and the deciduous shrubs: their twigs only (the mask's .g); the evergreen shrubs: leaves + twigs
      const bareKeep = () => {
        const { k } = slotParts();
        let bare = k.lessThan(0.5);
        for (const id of BARE_KIND_IDS) bare = bare.or(k.equal(float(id)));
        const tw = texture(P.leafMask, attribute("card", "vec4").xy.mul(0.5).add(0.5)).g;
        return bare.not().or(tw.greaterThanEqual(0.5));
      };
      depth.maskNode = depth.maskNode.and(bareKeep());
      colour.maskShadowNode = colour.maskShadowNode.and(bareKeep());
      depth.userData.bare = colour.userData.bare = true;
    }
    if (NB && !far) {
      // (the depth pass and the EQUAL colour pass: the same position graph)
      depth.positionNode = pm.depth.positionNode.add(bushWind);
      colour.positionNode = pm.colour.positionNode.add(bushWind);
      setMotionDelta(colour, bushMotion);
      colour.maskShadowNode = colour.maskShadowNode.and(bushShadowKeep());
      colour.colorNode = tintOf(pm.colour.colorNode);
      // (the bushes' sunlit tips: their light through the leaves + fill at BUSH_GLOW: not yellow-white next to the trees)
      if (pm.colour.emissiveNode) colour.emissiveNode = tintOf(pm.colour.emissiveNode).mul(select(slotParts().k.greaterThan(0.5), float(BUSH_GLOW), float(1)));
    }
    const bark = own(tr, `${tr.name || "stylized-bark"}:pool`); bark.maskNode = and(tr.maskNode, slotKeep()); bark.maskShadowNode = and(tr.maskShadowNode, slotKeep());
    return { depth, colour, bark };
  });
  // the bush crowns: the vendor's builder with the bush shapes, the trees' uniforms and materials (no new material)
  let bushGeoms = null;
  const bushH = [];
  if (NB) {
    const bs = { U: shared.U, leafMat: shared.leafMat, trunkMat: shared.trunkMat, leafFar: shared.leafFar, trunkFar: shared.trunkFar, geoms: new Map() };
    createStylizedTrees({ scene: new THREE.Group(), trees: [], shared: bs, variants: NB, params: { ...P, shape: bushShape, seed: BUSH_SEED } });
    bushGeoms = bs.geoms;
    for (let v = 0; v < NB; v++) bushH[v] = bushExtent(bushGeoms.get(`${v}:0`).leaves).top;
  }
  const group = new THREE.Group(); group.name = "trees-pool";
  const attrs = [["instanceMatrix", 16], ["treeXf", 3], ["treePos", 3], ["treeSlot", 1]];
  const sets = [0, 1, 2].map((l) => {
    const set = new MultiDrawSet({ name: `trees-lod${l}`, parts: VARIANTS + NB, attrs, cap0: l === 2 ? 1024 : 256 });
    set.pad = 26;
    const M = mats[l === 2 ? 1 : 0], cast = l <= SHADOW_LODS;
    // (bushes: LOD 0 and 1 only; no bark)
    const bushLeaves = Array.from({ length: NB }, (_, v) => (l < 2 ? bushGeoms.get(`${v}:${l}`).leaves : null));
    const leaves = set.addView({ geoms: [...Array.from({ length: VARIANTS }, (_, v) => shared.geoms.get(`${v}:${l}`).leaves), ...bushLeaves], material: M.colour, castShadow: cast, name: `trees-leaves-lod${l}` });
    const twin = set.addView({ shareOf: leaves, material: M.depth, castShadow: false, receiveShadow: false, renderOrder: -1, name: `trees-leaves-depth-lod${l}` });
    twin.mesh.userData.depthPrepass = true;
    const bark = set.addView({ geoms: [...Array.from({ length: VARIANTS }, (_, v) => shared.geoms.get(`${v}:${l}`).trunk), ...new Array(NB).fill(null)], material: M.bark, castShadow: cast, name: `trees-bark-lod${l}` });
    for (const v of [leaves, twin, bark]) group.add(v.mesh);
    return set;
  });
  // the bands (m from the gather centre to a tree's foot), live from the params (the dev panel) and the impostor start
  const bands = () => { const sl = P.lodSlack ?? 0; return [[0, P.lodDist + sl], [P.lodDist + sl, P.farDist + sl], [P.farDist + sl, (SMOOTH ? IMP.start.value : P.maxDist) + sl]]; };
  const cols = [["instanceMatrix", "instanceMatrix", 16], ["treeXf", "treeXf", 3], ["treePos", "treePos", 3], ["treeSlot", "treeSlot", 1]];
  const B0 = bands();
  // (StreamPool margin 0: one LOD per tree; the streamer's margin is only its outrun check: past it a gather is finished at once)
  const pools = Array.from({ length: VARIANTS }, (_, v) => new MultiStreamPool(`tree${v}`, B0.map(([l0, l1], l) => ({ set: sets[l], part: v, l0, l1, attrs: cols })), 0, 0));
  // the bushes: LOD 0 to the trees' first switch (the same card morph before it), LOD 1 to the furthest bush end
  // (each bush dithers out at its own end in the shader)
  const bushBands = (B) => [B[0], [B[0][1], BUSH_END_MAX + (P.lodSlack ?? 0)]];
  const bushPools = Array.from({ length: NB }, (_, v) => new MultiStreamPool(`bush${v}`, bushBands(B0).map(([l0, l1], l) => ({ set: sets[l], part: VARIANTS + v, l0, l1, attrs: cols })), 0, 0));
  const streamer = new Streamer({ name: "trees", pools: [...pools, ...bushPools], fades: treeFades, margin: 6, trigger: RELOD_DUE, budget: 0.3 });
  let bandKey = B0.flat().join(",");
  // the vendor field of no trees: its update() writes the shared uniforms from the params every frame (as each tile's did)
  const uni = createStylizedTrees({ scene: new THREE.Group(), trees: [], shared, variants: VARIANTS, params: P });
  uni.stats = () => {
    let trees = 0, tris = 0;
    sets.forEach((s, l) => s.parts.forEach((p, v) => { if (v >= VARIANTS) return; const g = shared.geoms.get(`${v}:${l}`); trees += p.n; tris += p.n * (g.leaves.index.count + g.trunk.index.count) / 3; }));
    return { trees, tris: Math.round(tris) };
  };
  window.__stylizedTrees = [uni];
  const fields = new Map();
  let seq = 0, lastFrame = -1;
  const cam = { position: new THREE.Vector3() }, light = { sunDir, sunColor: sunCol };
  const m4 = new THREE.Matrix4(), sc = new THREE.Vector3();

  function sources(placements, variantOf, slot) {
    const by = Array.from({ length: VARIANTS }, () => []);
    placements.forEach((p, i) => by[variantOf(i)].push(p));
    const out = {};
    by.forEach((list, v) => {
      const n = list.length; if (!n) return;
      const M = new Float32Array(n * 16), X = new Float32Array(n * 3), Q = new Float32Array(n * 3), S = new Float32Array(n), C = new Float32Array(n * 4);
      list.forEach(([x, z, y, rot, s], i) => {
        m4.makeRotationY(rot); m4.scale(sc.set(s, s, s)); m4.setPosition(x, y - 0.25, z);   // (the vendor's matrix)
        M.set(m4.elements, i * 16);
        X[i * 3] = Math.cos(rot); X[i * 3 + 1] = Math.sin(rot); X[i * 3 + 2] = s;
        Q[i * 3] = x; Q[i * 3 + 1] = y - 0.25; Q[i * 3 + 2] = z;
        S[i] = slot;
        C[i * 4] = x; C[i * 4 + 1] = y; C[i * 4 + 2] = z; C[i * 4 + 3] = 0;           // (the vendor's distance: to the foot)
      });
      out[`tree${v}`] = buildSource(n, { instanceMatrix: [M, 16], treeXf: [X, 3], treePos: [Q, 3], treeSlot: [S, 1] }, C);
    });
    return out;
  }
  /** every tile's update calls this; the first call of a frame does the work */
  function tick(p) {
    const frame = renderer?.info.frame ?? -2;
    if (frame === lastFrame && frame !== -2) return;
    lastFrame = frame;
    if (!group.parent) for (const f of fields.values()) { let o = f.holder; while (o.parent) o = o.parent; if (o.isScene) { o.add(group); break; } }
    if (lighting) {
      sunDir.copy(lighting.sunDir);
      const c = lighting.keyColor, k = 0.18 * (1 - 0.8 * env.uNight.value);
      sunCol[0] = c.r * k; sunCol[1] = c.g * k; sunCol[2] = c.b * k;
    }
    if (SMOOTH) P.maxDist = IMP.start.value;
    cam.position.copy(p);
    uni.update(cam, light);
    if (shared.U?.fill) shared.U.fill.value = P.fill * (1 - 0.92 * env.uNight.value);
    const B = bands(), key = B.flat().join(",");
    if (key !== bandKey) {
      bandKey = key;
      for (const pl of pools) pl.meshes.forEach((m, l) => { m.d0 = B[l][0]; m.d1 = B[l][1]; });
      const BB = bushBands(B);
      for (const pl of bushPools) pl.meshes.forEach((m, l) => { m.d0 = BB[l][0]; m.d1 = BB[l][1]; });
      streamer.dirty = true;
    }
    // the tile fades: the holder's (lodFade.js Fader sets userData.fade on the tile's objects), 0 under a hidden ancestor
    for (const f of fields.values()) {
      let vis = true; for (let o = f.holder; o; o = o.parent) if (o.visible === false) { vis = false; break; }
      f.stub.parent.visible = vis; f.stub.userData.fade = f.holder.userData.fade ?? 1;
    }
    streamer.update(cam);
  }
  function addField(placements, variantOf) {
    const holder = new THREE.Group();
    holder.name = "StylizedTreesTile";
    const id = `t${++seq}`, stub = { parent: { visible: true }, userData: { fade: 0 } };
    fields.set(id, { holder, stub });
    if (placements.length) streamer.addTile(id, stub, (slot) => sources(placements, variantOf, slot));
    const release = kitRegister && placements.length ? kitRegister(placements, variantOf) : null;
    const dispose = () => { if (!fields.has(id)) return; fields.delete(id); streamer.removeTile(id); release?.(); holder.removeFromParent(); };
    holder.dispose = dispose;
    return { group: holder, update: tick, count: placements.length, field: uni, imp: null, placements, dispose };
  }
  /** a tile's bushes (viewer/plants/cityPlants.js): list = [x, y (the foot), z, yaw, height (m), variant, kind 1..6,
   *  end (m)] x n; group: the tile's plants group (its fade, as the plants' own streamer reads it) */
  function bushSources(list, slot) {
    const by = Array.from({ length: NB }, () => []);
    for (let o = 0; o < list.length; o += 8) by[list[o + 5]].push(o);
    const out = {};
    by.forEach((offs, v) => {
      const n = offs.length; if (!n) return;
      const M = new Float32Array(n * 16), X = new Float32Array(n * 3), Q = new Float32Array(n * 3), S = new Float32Array(n), C = new Float32Array(n * 4);
      offs.forEach((o, i) => {
        const x = list[o], y = list[o + 1], z = list[o + 2], rot = list[o + 3], s = list[o + 4] / bushH[v];
        m4.makeRotationY(rot); m4.scale(sc.set(s, s, s)); m4.setPosition(x, y, z);
        M.set(m4.elements, i * 16);
        X[i * 3] = Math.cos(rot); X[i * 3 + 1] = Math.sin(rot); X[i * 3 + 2] = s;
        Q[i * 3] = x; Q[i * 3 + 1] = y; Q[i * 3 + 2] = z;
        S[i] = slot + 128 * list[o + 6] + 1024 * Math.round(list[o + 7]);
        C[i * 4] = x; C[i * 4 + 1] = y; C[i * 4 + 2] = z; C[i * 4 + 3] = 0;
      });
      out[`bush${v}`] = buildSource(n, { instanceMatrix: [M, 16], treeXf: [X, 3], treePos: [Q, 3], treeSlot: [S, 1] }, C);
    });
    return out;
  }
  const addBushes = (id, grp, list) => { if (NB && list.length) streamer.addTile(`bush:${id}`, grp, (slot) => bushSources(list, slot)); };
  const removeBushes = (id) => streamer.removeTile(`bush:${id}`);
  /** the scene the pool draws in (the bushes can come before any tree tile) */
  const attach = (scene) => { if (!group.parent && scene) scene.add(group); };
  /** bushes held per LOD and their triangles */
  const bushStats = () => {
    const held = [0, 0], tris = [0, 0];
    for (let l = 0; l < 2; l++) for (let v = 0; v < NB; v++) { const n = sets[l].parts[VARIANTS + v].n; held[l] += n; tris[l] += n * bushGeoms.get(`${v}:${l}`).leaves.index.count / 3; }
    return { held, tris, heights: bushH.map((h) => +h.toFixed(2)) };
  };
  const api = { group, sets, pools, bushPools, streamer, fields, addField, tick, addBushes, removeBushes, attach, bushStats, bushes: NB > 0, stats: () => sets.map((s) => s.stats()) };
  window.__treePool = api;
  return api;
}
