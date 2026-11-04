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
import { positionGeometry, vec3, float, mix, smoothstep, mx_noise_float, normalGeometry, max } from "three/tsl";
import { createStylizedTrees } from "../vendor/stylized-trees/stylizedTrees.js";
import { branchShape } from "../vendor/stylized-trees/branchTree.js";
import { bumpNormal } from "./tslkit.js";

// Street trees are pruned upright: the offroad game's "broad" (low fork, wide) and "tall" (long trunk,
// high fork) styles, picked per variant from the variant's own random stream (the same for its 3 LODs).
const SHAPES = [branchShape("broad"), branchShape("tall")];
const streetShape = (r, lod) => SHAPES[r() < 0.45 ? 0 : 1](r, lod);
const VARIANTS = 6;
let NATURAL_HEIGHT = 11;   // measured from the built trees on first use (calibrate())
const shared = {};
let lighting = null;
const sunDir = new THREE.Vector3(), sunCol = [1, 1, 1];

/** main.js passes its Lighting once (sun direction and colour for the leaves' translucency). */
export function setTreeLighting(l) { lighting = l; }

let maskTex = null;
/** A leafy branch mask in .r: ~70 small pointed leaves on a few twigs inside a soft round cluster. */
function leafMask() {
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
  maskTex = new THREE.CanvasTexture(cv);
  maskTex.colorSpace = THREE.NoColorSpace;
  maskTex.minFilter = THREE.LinearMipmapLinearFilter;
  maskTex.anisotropy = 4;
  return maskTex;
}

// Depth pre-pass for the leaf cards (game-engine-v1 v3/render/foliage/foliageSystem.js, PERF_RULES #11):
// a cut-out card `discard`s, which turns early-z off, so overlapping cards shade every layer. First an
// UNLIT depth-only copy (same position and cut-out nodes, so the depths match exactly, and with
// alpha-to-coverage it writes the covered samples only), then the lit material with depth EQUAL and no
// discard: each pixel shaded once. The shadow pass keeps the cut-out (maskShadowNode).
let prepass = null;
function prepassMaterials(base) {
  if (prepass) return prepass;
  const depth = new THREE.MeshBasicNodeMaterial({ side: base.side });
  depth.positionNode = base.positionNode;
  depth.opacityNode = base.opacityNode;
  depth.alphaTest = base.alphaTest;
  depth.alphaToCoverage = base.alphaToCoverage;
  depth.colorWrite = false;
  depth.name = "stylized-leaves:depth";
  const colour = base.clone();
  colour.opacityNode = null;
  colour.alphaTest = 0;
  colour.alphaToCoverage = false;
  colour.maskShadowNode = base.maskShadowNode;
  colour.depthFunc = THREE.EqualDepth;
  colour.depthWrite = false;
  colour.name = "stylized-leaves:colour";
  return (prepass = { depth, colour });
}
const usePrepass = !/[?&]prepass=0/.test(location.search);   // ?prepass=0: A/B

const hash = (x, z, k) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

/** trees: features.json trees; ground(x, z): surface y; inTile(x, z). Returns { group, update(cameraPos), count }. */
let PARAMS = null;
const params = () => PARAMS ??= {
  leafMask: leafMask(), shape: streetShape,
  // LOD distances for a street-level city (the fog lab's 150 / 450 / 1600 m are for a valley forest):
  // measured 2026-11-04, walk 14.8 -> 9.5 ms GPU, overview 8.8 -> 7.5 ms.
  lodDist: 40, farDist: 120, maxDist: 900,
  // Brussels street trees (planes, limes, chestnuts): olive rather than the fog lab's lime, more
  // spread between trees so a street doesn't read as one green band
  topColor: "#8aa64e", bottomColor: "#27441d", translucencyColor: "#c6d07c", tintVar: 0.3,
  // the branch trees' trunk already reaches the pads; the shade side a soft olive, not black
  crownLift: 0, fill: 0.35, fillColor: "#8fae7c", aoColor: 0.35, trunkColor: [0.2, 0.15, 0.11],
};

/** First use: build the shared materials and trees once (no instances), measure how tall a built tree
 *  is (for the LiDAR height -> scale), and give the shared trunk material its bark. */
function calibrate() {
  if (shared.U) return;
  createStylizedTrees({ scene: new THREE.Group(), trees: [], shared, variants: VARIANTS, params: params() });
  let sum = 0, n = 0;
  for (const [key, g] of shared.geoms) {
    if (!key.endsWith(":0")) continue;
    g.leaves.computeBoundingBox();
    sum += g.leaves.boundingBox.max.y + 1.0;          // card centres + about a card's half size
    n++;
  }
  if (n) NATURAL_HEIGHT = sum / n;
  barkMaterial(shared.trunkMat);
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

export function buildStylizedTreeField(trees, ground, inTile) {
  calibrate();
  const placements = [];
  for (const t of trees) {
    if (!inTile(t.x, t.z)) continue;
    const h = Math.max(3, t.height ?? 9);
    placements.push([t.x, t.z, ground(t.x, t.z), hash(t.z, t.x, 2) * Math.PI * 2, Math.min(1.8, Math.max(0.3, h / NATURAL_HEIGHT))]);
  }
  const holder = new THREE.Group();
  holder.name = "StylizedTreesTile";
  const f = createStylizedTrees({ scene: holder, trees: placements, shared, variants: VARIANTS, params: params() });
  // per-tile culling: the vendor turns frustum culling off (its instances span a whole forest); here
  // every mesh of the tile gets the tile's trees' bounding sphere
  if (placements.length) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z, y] of placements) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const sphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2 + 8, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0 + 16, z1 - z0) / 2 + 12);
    holder.traverse((o) => { if (o.isInstancedMesh) { o.frustumCulled = true; o.boundingSphere = sphere; } });
  }
  // leaf meshes -> lit EQUAL-depth material + an instanced depth twin drawn first (same geometry,
  // instance matrices and per-instance treeXf; its count follows the leaf mesh's every update)
  const twins = [];
  if (usePrepass) holder.traverse((o) => {
    if (!o.isInstancedMesh || o.material !== shared.leafMat) return;
    const pm = prepassMaterials(shared.leafMat);
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
  (window.__stylizedTrees ??= []).push(f);   // live params / stats for tuning from the console
  const cam = { position: new THREE.Vector3() };
  const light = { sunDir, sunColor: sunCol };
  const update = (p) => {
    if (lighting) {
      sunDir.copy(lighting.sunDir);
      const c = lighting.sun.color, k = lighting.sun.intensity * 0.18;
      sunCol[0] = c.r * k; sunCol[1] = c.g * k; sunCol[2] = c.b * k;
    }
    cam.position.copy(p);
    f.update(cam, light);
    for (const [o, d] of twins) d.count = o.count;
  };
  return { group: holder, update, count: placements.length };
}
