// CELL-CULLED DRAWS for a big static per-tile mesh (perf pass 3, docs/perf/AUDIT.md step 13): a tile's mesh is ONE
// render object; every pass that sees any corner of its bounding sphere draws ALL of it. The sun's shadow pass at 45 m
// drew the whole buildings-details mesh of every tile its box touched (~420 k shadow triangles). Here the triangles
// are re-ordered by CELL (an index buffer sorted by the cell of each triangle's centre), each cell is one indexed
// indirect draw record, and the mesh's onBeforeRender picks the records whose box meets THAT pass's camera frustum
// (view, sun shadow, lamp shadows: viewer/multiDraw.js's per-pass cull on a plain mesh). No upload per pass: the
// records are written once; only the offset list changes.
//   cellCull(mesh, { cell: 40 })   the sort runs in viewer/cellCullWorker.js (~20 ms for 90 k triangles: off the main
//                                  thread); the mesh draws whole until it lands. WebGPU (indirect-first-instance) only.
// ?cellcull=old: the meshes draw whole (as before).
import * as THREE from "three/webgpu";
import { multiDrawOK } from "./multiDraw.js";
export { cellSort } from "./cellSort.js";

const qs = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
export const CELL_CULL = qs.get("cellcull") !== "old";
const _frustum = new THREE.Frustum(), _m = new THREE.Matrix4(), _box = new THREE.Box3();
/** the buildings' details: their sun shadow dithers out between these distances from the eye (facades.js) */
export const DETAIL_SHADOW = [100, 140];
let SUN_CAM = null, EYE = null;
/** the sun's shadow camera and the eye (main.js): a mesh's `sunReach` limits its cells in the sun's pass */
export function setCellCullSun(cam, eye) { SUN_CAM = cam; EYE = eye; }

let worker = null, seq = 0;
const jobs = new Map();
function sortInWorker(P, src, cell) {
  if (!worker) {
    worker = new Worker(new URL("./cellCullWorker.js", import.meta.url), { type: "module" });
    worker.onmessage = (e) => { const j = jobs.get(e.data.id); if (j) { jobs.delete(e.data.id); j(e.data); } };
  }
  const id = ++seq;
  return new Promise((res) => { jobs.set(id, res); worker.postMessage({ id, P, src, cell }); });
}

/** set a big static mesh up for per-cell culling (lazily: at its first render, once the renderer is known) */
export function cellCull(mesh, { cell = 40, minTris = 2000, sunReach = Infinity } = {}) {
  if (!CELL_CULL) return false;
  const g = mesh.geometry, nt = (g.index ? g.index.count : g.attributes.position.count) / 3;
  if (nt < minTris) return false;
  mesh.userData.cellCull = { cells: 0, tris: nt, culls: [], state: "waiting" };
  mesh.onBeforeRender = (renderer) => {
    const cc = mesh.userData.cellCull;
    if (cc.state !== "waiting") return;
    if (!multiDrawOK(renderer)) { cc.state = "off"; return; }
    cc.state = "sorting";
    const P = g.attributes.position.array.slice(), src = g.index ? g.index.array.slice() : null;
    sortInWorker(P, src, cell).then((r) => { if (mesh.geometry === g) apply(mesh, r, sunReach); });
  };
  return true;
}

function apply(mesh, { I, rec, boxes, n }, sunReach) {
  const g = mesh.geometry, cc = mesh.userData.cellCull;
  g.setIndex(new THREE.BufferAttribute(I, 1));
  const all = Array.from({ length: n }, (_, r) => r * 20);
  g.setIndirect(new THREE.IndirectStorageBufferAttribute(rec, 5), all);
  const culls = cc.culls;
  // per pass camera: the records in its frustum (cached per camera and frame)
  mesh.onBeforeRender = (renderer, scene, camera, geometry) => {
    const frame = renderer.info.frame;
    let e = null;
    for (const c of culls) if (c.cam === camera) { e = c; break; }
    if (!e) { e = { cam: camera, frame: -1, list: [], tris: 0 }; culls.push(e); if (culls.length > 8) culls.shift(); }
    if (e.frame !== frame) {
      e.frame = frame; e.list.length = 0;
      _frustum.setFromProjectionMatrix(_m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse), camera.coordinateSystem, camera.reversedDepth);
      let tris = 0;
      const reach = camera === SUN_CAM && EYE && sunReach < Infinity ? sunReach : 0;
      for (let r = 0; r < n; r++) {
        const o = r * 6;
        _box.min.set(boxes[o], boxes[o + 1], boxes[o + 2]); _box.max.set(boxes[o + 3], boxes[o + 4], boxes[o + 5]);
        if (reach && _box.distanceToPoint(EYE.value) > reach) continue;      // (its shadow dithered out already)
        if (_frustum.intersectsBox(_box)) { e.list.push(r * 20); tris += rec[r * 5] / 3; }
      }
      e.tris = tris;
    }
    geometry.indirectOffset = e.list;
  };
  // any other user of the geometry (a fade proxy, a warm-up) draws all of it
  mesh.onAfterRender = (renderer, scene, camera, geometry) => { geometry.indirectOffset = all; };
  cc.cells = n; cc.state = "on";
}
