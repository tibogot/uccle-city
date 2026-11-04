// Our LiDAR trees drawn with game-engine-v1's fog-lab stylized trees (vendor/stylized-trees): crowns of
// 9-12 clumps of camera-facing leaf cards, each clump lit as its own dome, baked occlusion, sun
// shadows on the cards, light through the leaves, per-tree tint, 3 LODs (the far one casts no
// shadow), smooth leaf edges with MSAA (alpha-to-coverage). ?trees=stylized (A/B with the default
// slop-newyork trees).
//
// This file: the leaf mask (drawn here: the engine's PNG has no recorded licence), placements from
// features.json (height from the LiDAR, a stable turn per tree), one shared set of materials and
// built trees for every tile, and the sun from viewer/lighting.js.
import * as THREE from "three/webgpu";
import { createStylizedTrees } from "../vendor/stylized-trees/stylizedTrees.js";

// A built tree (roundCrown, crownLift 1.5) is about this tall at scale 1, cards included.
const NATURAL_HEIGHT = 11.5;
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

const hash = (x, z, k) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

/** trees: features.json trees; ground(x, z): surface y; inTile(x, z). Returns { group, update(cameraPos), count }. */
export function buildStylizedTreeField(trees, ground, inTile) {
  const placements = [];
  for (const t of trees) {
    if (!inTile(t.x, t.z)) continue;
    const h = Math.max(3, t.height ?? 9);
    placements.push([t.x, t.z, ground(t.x, t.z), hash(t.z, t.x, 2) * Math.PI * 2, Math.min(1.7, Math.max(0.3, h / NATURAL_HEIGHT))]);
  }
  const holder = new THREE.Group();
  holder.name = "StylizedTreesTile";
  // LOD distances for a street-level city (the fog lab's 150 / 450 / 1600 m are for a valley forest):
  // measured 2026-11-04, walk 14.8 -> 9.5 ms GPU, overview 8.8 -> 7.5 ms.
  const f = createStylizedTrees({ scene: holder, trees: placements, shared,
    params: { leafMask: leafMask(), lodDist: 40, farDist: 120, maxDist: 900 } });
  // per-tile culling: the vendor turns frustum culling off (its instances span a whole forest); here
  // every mesh of the tile gets the tile's trees' bounding sphere
  if (placements.length) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z, y] of placements) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const sphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2 + 8, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0 + 16, z1 - z0) / 2 + 12);
    holder.traverse((o) => { if (o.isInstancedMesh) { o.frustumCulled = true; o.boundingSphere = sphere; } });
  }
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
  };
  return { group: holder, update, count: placements.length };
}
