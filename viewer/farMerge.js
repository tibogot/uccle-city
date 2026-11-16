// FAR LOD IN ONE DRAW (perfgame round 6, docs/PERF_GAME.md; ?farlodmerge=old = off). Hero bridges only so far. A landmark's / hero bridge's far level is a handful of meshes, one per library
// slot (3-16 draws a model, every frame, beyond ~420 m). Here the far level's opaque meshes become ONE mesh: their
// geometries merged (position, normal, the AO uv), a per-vertex slot id, and ONE material whose colour / roughness /
// metalness per slot are each slot material's MEANS, baked once on the GPU (the slot's colour graph drawn over an
// 8 x 8 m patch in its own uv metres, averaged), the AO map as before. At 420 m+ a slot's texture is a few pixels: its
// mean is what the mips show. Transparent slots and meshes without the layout stay as they were.
//   await mergeFarLevel(level, { renderer, aoTex, aoMix })
import * as THREE from "three/webgpu";
import { attribute, uniformArray, texture, uv, mix, float, vec3, int } from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// (ON by default since 2026-11-16: the Saint-Job rail bridge's far level merged vs as before, 540 m, magnified x10:
// 0.8 % of the crop's pixels differ by > 20 / 255 (TAA and tree noise), the bridge's colours match; ?farlodmerge=old = off)
export const FAR_MERGE = typeof location !== "undefined" && new URLSearchParams(location.search).get("farlodmerge") !== "old";
// round 7: the landmarks too (?farlodlm=old: off; pixel-checked at 800 m, docs/PERF_GAME.md): their wrapAO folds the AO map into the colour, so the
// bake reads the AO-free colour the wrapper keeps (material.userData.farBase) and the merged material re-applies the
// model's AO the same way (userData.farAO: its AO map x the vertex AO, aoStrength into the AO, aoDirect into the colour)
export const FAR_MERGE_LM = typeof location !== "undefined" && new URLSearchParams(location.search).get("farlodlm") !== "old";
let defaultRenderer = null;
/** main.js: the renderer the bakes use when a caller (a landmark's city loader) has none */
export function setFarMergeRenderer(r) { defaultRenderer = r; }
const IDENTITY = new THREE.Matrix4();
const bakeCache = new Map();          // material -> Promise<{ col: [r, g, b], rough }>
let bake = null;

function bakeKit(renderer) {
  if (bake) return bake;
  const S = 8, N = 32;
  const geo = new THREE.PlaneGeometry(S, S, 1, 1);
  const p = geo.attributes.position, u = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { u[i * 2] = p.getX(i) + S / 2; u[i * 2 + 1] = p.getY(i) + S / 2; }   // uv in metres, as the slots expect
  geo.setAttribute("uv", new THREE.BufferAttribute(u, 2));
  geo.setAttribute("uv1", new THREE.BufferAttribute(new Float32Array(p.count * 2).fill(0.5), 2));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(p.count * 4).fill(1), 4));
  const mesh = new THREE.Mesh(geo);
  const scene = new THREE.Scene(); scene.add(mesh);
  const cam = new THREE.OrthographicCamera(-S / 2, S / 2, S / 2, -S / 2, 0.1, 10); cam.position.z = 5;
  const rt = new THREE.RenderTarget(N, N, { type: THREE.FloatType, depthBuffer: false });
  rt.syncPipes = true;                // (asyncPipes.js: a bake, every draw must land)
  return (bake = { mesh, scene, cam, rt, N, renderer });
}
export async function meanOf(renderer, node) {   // (exported for debug/A-B checks)
  const K = bakeKit(renderer);
  const m = new THREE.MeshBasicNodeMaterial({ fog: false, toneMapped: false });
  m.colorNode = node;
  K.mesh.material = m;
  const n = K.N * K.N;
  // after the boot a new pipeline may still be compiling at its first draw (the draw is skipped: the target keeps its
  // clear alpha 0): draw again until the bake really landed (alpha 1 everywhere), 2 s at most
  for (let k = 0; k < 40; k++) {
    const prev = renderer.getRenderTarget(), prevMRT = renderer.getMRT?.() ?? null;
    renderer.setMRT?.(null);
    renderer.setRenderTarget(K.rt); renderer.render(K.scene, K.cam);
    renderer.setRenderTarget(prev); renderer.setMRT?.(prevMRT);
    const px = await renderer.readRenderTargetPixelsAsync(K.rt, 0, 0, K.N, K.N);
    const s = [0, 0, 0, 0];
    for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) s[c] += px[i * 4 + c];
    if (s[3] / n > 0.99) { m.dispose(); return s.slice(0, 3).map((v) => v / n); }
    await new Promise((r) => setTimeout(r, 50));
  }
  m.dispose();
  throw new Error("far merge: a slot bake never landed");
}
/** a slot material's mean albedo (linear) and roughness */
function slotMeans(renderer, mat) {
  if (!bakeCache.has(mat)) bakeCache.set(mat, (async () => {
    const colNode = mat.userData?.farBase ?? mat.colorNode ?? (mat.map ? texture(mat.map, uv()).rgb.mul(vec3(mat.color.r, mat.color.g, mat.color.b)) : vec3(mat.color.r, mat.color.g, mat.color.b));
    const col = await meanOf(renderer, colNode);
    const rough = mat.roughnessNode ? (await meanOf(renderer, vec3(mat.roughnessNode)))[0] : mat.roughness ?? 0.9;
    return { col, rough: Math.min(1, Math.max(0.04, rough)), metal: mat.metalness ?? 0 };
  })());
  return bakeCache.get(mat);
}

/** merge `level`'s opaque meshes into one; returns { before, after } draw counts (null: nothing done) */
export async function mergeFarLevel(level, { renderer = defaultRenderer, aoTex = null, aoMix = 0.95, name = "", landmark = false } = {}) {
  if (!(landmark ? FAR_MERGE_LM : FAR_MERGE) || !renderer?.backend?.isWebGPUBackend) return null;
  const meshes = level.children.filter((o) => o.isMesh && !o.isInstancedMesh && !o.material.transparent && o.geometry.attributes.position && o.geometry.attributes.normal);
  if (meshes.length < 2) return null;
  const mats = [...new Set(meshes.map((o) => o.userData.base ?? o.material))];
  // the vertex AO (COLOR_0.g) is kept when every mesh has the same colour layout
  const cs = meshes.map((o) => o.geometry.attributes.color?.itemSize ?? 0);
  const keepColor = cs[0] > 0 && cs.every((c) => c === cs[0]);
  const farAO = mats.map((m) => m.userData?.farAO).find(Boolean) ?? null;
  const means = await Promise.all(mats.map((m) => slotMeans(renderer, m)));
  const geos = meshes.map((o) => {
    const src = o.geometry, g = new THREE.BufferGeometry();
    // (a mesh with its own transform: its own copy of the positions / normals, applyMatrix4 below must not move the
    // source's, which other levels may share)
    const own = !o.matrix.equals(IDENTITY);
    g.setAttribute("position", own ? src.attributes.position.clone() : src.attributes.position);
    g.setAttribute("normal", own ? src.attributes.normal.clone() : src.attributes.normal);
    g.setAttribute("uv1", src.attributes.uv1 ?? new THREE.BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    const id = mats.indexOf(o.userData.base ?? o.material);
    g.setAttribute("slotId", new THREE.BufferAttribute(new Float32Array(src.attributes.position.count).fill(id), 1));
    if (keepColor) g.setAttribute("color", src.attributes.color);
    if (src.index) g.setIndex(src.index);
    const out = src.index ? g : g.toNonIndexed();
    if (own) out.applyMatrix4(o.matrix);
    return out;
  });
  // (all indexed or all not: mergeGeometries needs one kind)
  const anyIdx = geos.some((g) => g.index), all = anyIdx ? geos.map((g) => (g.index ? g : indexed(g))) : geos;
  const merged = mergeGeometries(all, false);
  if (!merged) return null;
  merged.computeBoundingSphere();
  const C = uniformArray(means.map((m) => new THREE.Vector3(...m.col)), "vec3");
  const R = uniformArray(means.map((m) => m.rough)), Mt = uniformArray(means.map((m) => m.metal));
  const fm = new THREE.MeshStandardNodeMaterial();
  const id = int(attribute("slotId", "float").add(0.5));
  fm.roughnessNode = R.element(id);
  fm.metalnessNode = Mt.element(id);
  if (farAO) {
    // a landmark: its wrapAO's AO, the same way (AO map x vertex AO, aoStrength; aoDirect darkens the colour)
    const vAO = keepColor ? attribute("color", cs[0] === 4 ? "vec4" : "vec3").g : float(1);
    const aoK = mix(float(1), texture(farAO.aoTex, uv(1)).r.mul(vAO), farAO.look.aoStrength);
    fm.aoNode = aoK;
    fm.colorNode = C.element(id).mul(mix(float(1), aoK, farAO.look.aoDirect ?? float(0)));
  } else {
    fm.colorNode = C.element(id);
    if (aoTex) fm.aoNode = mix(float(1), texture(aoTex, uv(1)).r, aoMix);
  }
  fm.name = `${name || level.name} far (merged)`;
  const mesh = new THREE.Mesh(merged, fm);
  mesh.name = `${level.name}-merged`;
  mesh.castShadow = meshes.some((o) => o.castShadow); mesh.receiveShadow = true;
  mesh.userData.base = fm;
  mesh.userData.farMeans = means;      // (debug: the baked slot means)
  for (const o of meshes) o.removeFromParent();
  level.add(mesh);
  return { before: meshes.length, after: 1, slots: mats.length };
}
function indexed(g) {
  const n = g.attributes.position.count, I = new Uint32Array(n);
  for (let i = 0; i < n; i++) I[i] = i;
  g.setIndex(new THREE.BufferAttribute(I, 1));
  return g;
}
