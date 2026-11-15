// MULTI-DRAW POOLS (perf pass 2, docs/perf/AUDIT.md step 12): many instanced pieces in ONE render object.
// The CPU limit of the city is three's per-draw path (renderObject: ~13 us a draw, 430 scene + 205 shadow draws at
// street level). A set of pieces that share a material (the roof kit's 15 pieces of one LOD, the street trees' 6
// variants of one LOD) is drawn by one InstancedMesh whose geometry holds every piece's vertices back to back, and one
// drawIndexedIndirect per piece (r187 BufferGeometry.setIndirect with an offset array: one render object, N indirect
// draws). Each piece's instances live in their own region of the shared instance buffers; the indirect record's
// firstInstance points at it (WebGPU feature "indirect-first-instance"; without it the callers keep their old
// pools: MULTI_DRAW false).
//   const set = new MultiDrawSet({ name, parts: 6, attrs: [["instanceMatrix", 16], ["treeXf", 3]] })
//   set.addView({ geoms: [geo0, geo1, ...] (null = the part is not in this view), material, castShadow })
//   set.write(part, n, cols, box)      a part's n instances (cols: { name: Float32Array }), box: x0 y0 z0 x1 y1 z1
// Rules kept: static buffers (never DynamicDrawUsage), update ranges over what changed, a view with nothing to draw is
// hidden; the instance capacity stays >= 1100 so r187 binds the matrices as a vertex buffer (below 1024 the count is
// written into the WGSL: a different shader per size).
// Notes: renderer.info.render.drawCalls / triangles do not count indirect draws (r187 counts only direct ones): the
// perf helpers count render objects (debug/drawBreakdown.js) and MultiDrawSet.stats() gives the GPU draw commands.
import * as THREE from "three/webgpu";
import { StreamPool } from "./instanceStream.js";

const qs = new URLSearchParams(location.search);
/** ?multidraw=0: every caller keeps its old one-mesh-per-piece pools (A/B) */
export const MULTI_DRAW_WANTED = qs.get("multidraw") !== "0";
let featureOK = null, R = null;
/** the renderer (viewer/treesStylized.js setTreeRenderer passes it on, right after renderer.init()) */
export function setMultiDrawRenderer(r) { R = r; featureOK = null; }
/** can this device draw indirect with a first instance? (WebGPU only; false before the renderer is known) */
export function multiDrawOK(renderer = R) {
  if (!MULTI_DRAW_WANTED || !renderer) return false;
  if (featureOK === null) featureOK = !!(renderer.backend?.isWebGPUBackend && renderer.backend.device?.features?.has?.("indirect-first-instance"));
  return featureOK;
}

const MIN_CAP = 1100;

/** the merged geometry of a view: the parts' vertex attributes back to back, a Uint32 index (absolute) */
function mergeGeoms(geoms) {
  const live = geoms.map((g, k) => [g, k]).filter(([g]) => g);
  const names = [...new Set(live.flatMap(([g]) => Object.keys(g.attributes).filter((a) => !g.attributes[a].isInstancedBufferAttribute)))];
  let nv = 0, ni = 0;
  for (const [g] of live) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const out = new THREE.BufferGeometry(), ranges = new Array(geoms.length).fill(null);
  for (const a of names) {
    const s = live.find(([g]) => g.attributes[a])[0].attributes[a], w = s.itemSize, arr = new (s.array.constructor)(nv * w);
    let v = 0;
    for (const [g] of live) {
      const src = g.attributes[a];
      if (!src) { v += g.attributes.position.count; continue; }          // (a part without it: zeros, e.g. the stack's uv)
      if (src.itemSize !== w) throw new Error(`multiDraw: attribute ${a} missing / different in a part`);
      if (src.isInterleavedBufferAttribute) { for (let i = 0; i < src.count; i++) for (let c = 0; c < w; c++) arr[(v + i) * w + c] = src.getComponent(i, c); }
      else arr.set(src.array.subarray(0, src.count * w), v * w);
      v += src.count;
    }
    out.setAttribute(a, new THREE.BufferAttribute(arr, w, s.normalized));
  }
  const I = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const [g, k] of live) {
    const n = g.attributes.position.count;
    if (g.index) { const src = g.index.array; for (let j = 0; j < src.length; j++) I[i + j] = src[j] + v; ranges[k] = [i, src.length]; i += src.length; }
    else { for (let j = 0; j < n; j++) I[i + j] = v + j; ranges[k] = [i, n]; i += n; }
    v += n;
  }
  out.setIndex(new THREE.BufferAttribute(I, 1));
  out.userData.shared = true;
  return { geo: out, ranges };
}

// CULLING: one render object for a whole LOD band of the city would draw every instance round the camera, in front or
// behind (the per-tile meshes it replaces were culled tile by tile). A part's instances arrive from the gather cell by
// cell (50 m cells, tile by tile); consecutive cells are grouped into CHUNKS of at most CHUNK m across, each with its
// box (padded by the pieces' size), and each chunk is one indirect record. Per pass (the mesh's onBeforeRender, with
// that pass's camera: the view, the sun's shadow camera, the overhead weather bake...) only the records of the chunks
// in that camera's frustum are drawn: the geometry's indirect offset list is chosen per camera (no upload: the records
// are written at the commit). One cull per set, camera and frame, shared by the set's views.
const CHUNK = 160, CHMAX = 48;
const _frustum = new THREE.Frustum(), _m = new THREE.Matrix4(), _box = new THREE.Box3();

export class MultiDrawSet {
  /** parts: how many pieces; attrs: [[name, width]] the per-instance columns ("instanceMatrix" = the meshes' own) */
  constructor({ name, parts, attrs, cap0 = 64 }) {
    this.name = name; this.attrs = attrs; this.views = []; this.pad = 2;
    this.parts = Array.from({ length: parts }, () => ({ off: 0, cap: cap0, n: 0, box: new Float64Array(6), nch: 0, ch: new Int32Array(CHMAX * 2), chBox: new Float32Array(CHMAX * 6) }));
    this.sphere = new THREE.Sphere();
    this.culls = [];                                        // [{ cam, frame, list }]
    this.layout();
    this.alloc();
  }
  layout() { let off = 0; for (const p of this.parts) { p.off = off; off += p.cap; } this.total = Math.max(off, MIN_CAP); }
  alloc() { this.buf = {}; for (const [name, w] of this.attrs) this.buf[name] = new THREE.InstancedBufferAttribute(new Float32Array(this.total * w), w); }
  /** a view = one InstancedMesh: geoms[k] the part's geometry (null: not drawn by this view); shareOf: draw the
   *  geometry (and so the indirect draws) of an earlier view (a depth pre-pass twin) */
  addView({ geoms = null, material, castShadow = false, receiveShadow = true, name = this.name, renderOrder = 0, shareOf = null }) {
    let geo, ranges, indirect;
    if (shareOf) ({ geo, ranges, indirect } = shareOf);
    else {
      ({ geo, ranges } = mergeGeoms(geoms));
      indirect = new THREE.IndirectStorageBufferAttribute(new Uint32Array(this.parts.length * CHMAX * 5), 5);
      geo.setIndirect(indirect, []);
      for (const [a] of this.attrs) if (a !== "instanceMatrix") geo.setAttribute(a, this.buf[a]);
    }
    const mesh = new THREE.InstancedMesh(geo, material, 1);
    mesh.instanceMatrix = this.buf.instanceMatrix;
    mesh.count = this.total;
    mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
    mesh.frustumCulled = true; mesh.boundingSphere = this.sphere;
    mesh.renderOrder = renderOrder; mesh.name = name; mesh.visible = false;
    mesh.userData.multiDraw = this;
    const v = { mesh, geo, ranges, indirect, shared: !!shareOf };
    // the pass's camera picks the records (ranges: this view's parts; a part not in the view has no records)
    mesh.onBeforeRender = (renderer, scene, camera, geometry) => { geometry.indirectOffset = this.cull(camera, renderer.info.render.frame, v); };
    this.views.push(v);
    return v;
  }
  /** a part's instances: n, cols { name: Float32Array (>= n x width) }, box (Float64Array 6), runs: [end, box] per
   *  gathered cell in order (the chunks; none: one chunk) */
  write(k, n, cols, box, runs = null) {
    const P = this.parts[k];
    if (n > P.cap) this.grow(k, n);
    if (n) for (const [name, w] of this.attrs) {
      const a = this.buf[name];
      a.array.set(cols[name].subarray(0, n * w), P.off * w);
      a.addUpdateRange(P.off * w, n * w); a.needsUpdate = true;
    }
    P.n = n; P.box.set(box);
    this.chunk(P, n, box, runs);
    this.records(k);
    this.refresh();
  }
  /** group the runs into chunks of at most `lim` m across (x / z); too many: again with a larger limit */
  chunk(P, n, box, runs, lim = CHUNK) {
    P.nch = 0;
    if (!n) return;
    if (!runs || !runs.length) { P.ch[0] = 0; P.ch[1] = n; for (let i = 0; i < 6; i++) P.chBox[i] = box[i]; P.nch = 1; return; }
    let a = 0, cur = null;
    const flush = (end) => {
      if (P.nch >= CHMAX) return false;
      const c = P.nch++; P.ch[c * 2] = a; P.ch[c * 2 + 1] = end - a;
      for (let i = 0; i < 6; i++) P.chBox[c * 6 + i] = cur[i];
      a = end; cur = null; return true;
    };
    let prevEnd = 0;
    for (const [end, b] of runs) {
      if (end === prevEnd) continue;                        // (a cell that gave nothing)
      if (cur) {
        const x0 = Math.min(cur[0], b[0]), z0 = Math.min(cur[2], b[2]), x1 = Math.max(cur[3], b[3]), z1 = Math.max(cur[5], b[5]);
        if (x1 - x0 > lim || z1 - z0 > lim) { if (!flush(prevEnd)) return this.chunk(P, n, box, runs, lim * 1.5); }
      }
      if (!cur) cur = [b[0], b[1], b[2], b[3], b[4], b[5]];
      else for (let i = 0; i < 3; i++) { cur[i] = Math.min(cur[i], b[i]); cur[i + 3] = Math.max(cur[i + 3], b[i + 3]); }
      prevEnd = end;
    }
    if (cur && !flush(prevEnd)) return this.chunk(P, n, box, runs, lim * 1.5);
    if (prevEnd !== n) { P.nch = 1; P.ch[0] = 0; P.ch[1] = n; for (let i = 0; i < 6; i++) P.chBox[i] = box[i]; }   // (runs did not cover: one chunk)
  }
  /** the part's indirect records in every view (index count, instances, first index, base vertex 0, first instance) */
  records(k) {
    const P = this.parts[k];
    for (const v of this.views) {
      if (v.shared || !v.ranges[k]) continue;
      const A = v.indirect.array, [first, count] = v.ranges[k];
      for (let c = 0; c < P.nch; c++) { const o = (k * CHMAX + c) * 5; A[o] = count; A[o + 1] = P.ch[c * 2 + 1]; A[o + 2] = first; A[o + 3] = 0; A[o + 4] = P.off + P.ch[c * 2]; }
      v.indirect.needsUpdate = true;
    }
    this.culls.length = 0;
  }
  /** the byte offsets of the records drawn for this camera (cached per camera and frame) */
  cull(camera, frame, v) {
    let e = null;
    for (const c of this.culls) if (c.cam === camera) { e = c; break; }
    if (!e) { e = { cam: camera, frame: -1, all: [], lists: new Map() }; this.culls.push(e); if (this.culls.length > 8) this.culls.shift(); }
    if (e.frame !== frame) {
      e.frame = frame; e.all.length = 0; e.lists.clear();
      _frustum.setFromProjectionMatrix(_m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse), camera.coordinateSystem, camera.reversedDepth);
      const pad = this.pad;
      this.parts.forEach((P, k) => {
        for (let c = 0; c < P.nch; c++) {
          const b = P.chBox, o = c * 6;
          _box.min.set(b[o] - pad, b[o + 1] - pad, b[o + 2] - pad); _box.max.set(b[o + 3] + pad, b[o + 4] + pad, b[o + 5] + pad);
          if (_frustum.intersectsBox(_box)) e.all.push(k, c);
        }
      });
    }
    let list = e.lists.get(v.ranges);
    if (!list) {
      list = [];
      for (let i = 0; i < e.all.length; i += 2) if (v.ranges[e.all[i]]) list.push((e.all[i] * CHMAX + e.all[i + 1]) * 20);
      e.lists.set(v.ranges, list);
    }
    return list;
  }
  /** a part outgrew its region: every region re-laid (x2 for the one that grew), the buffers re-made (uploaded whole) */
  grow(k, n) {
    const old = this.buf, olds = this.parts.map((p) => ({ off: p.off, n: p.n }));
    this.parts[k].cap = Math.max(n, this.parts[k].cap * 2);
    this.layout(); this.alloc();
    for (const [name, w] of this.attrs) this.parts.forEach((p, j) => { if (olds[j].n) this.buf[name].array.set(old[name].array.subarray(olds[j].off * w, (olds[j].off + olds[j].n) * w), p.off * w); });
    for (const v of this.views) {
      v.mesh.instanceMatrix = this.buf.instanceMatrix; v.mesh.count = this.total;
      if (v.shared) continue;
      for (const [a] of this.attrs) if (a !== "instanceMatrix") v.geo.setAttribute(a, this.buf[a]);
    }
    this.parts.forEach((p, j) => { if (j !== k) this.records(j); });
    // (the old attributes: three frees their GPU buffers with the geometry; growth is rare: x2 a time)
    this.grows = (this.grows || 0) + 1;
  }
  refresh() {
    const B = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    let any = false;
    for (const p of this.parts) if (p.n) { any = true; for (let i = 0; i < 3; i++) { B[i] = Math.min(B[i], p.box[i]); B[i + 3] = Math.max(B[i + 3], p.box[i + 3]); } }
    if (any) { this.sphere.center.set((B[0] + B[3]) / 2, (B[1] + B[4]) / 2, (B[2] + B[5]) / 2); this.sphere.radius = Math.hypot(B[3] - B[0], B[4] - B[1], B[5] - B[2]) / 2 + this.pad * 1.8; }
    for (const v of this.views) v.mesh.visible = v.ranges.some((r, k) => r && this.parts[k].n > 0);
  }
  /** per view pass: render objects, the GPU draw commands of the last view-camera cull, instances held */
  stats() {
    let chunks = 0, inst = 0;
    for (const p of this.parts) { inst += p.n; chunks += p.nch; }
    const last = this.culls.map((c) => c.all.length / 2);
    return { views: this.views.filter((v) => v.mesh.visible).length, chunks, drawnChunks: last, inst, total: this.total, grows: this.grows || 0 };
  }
}

/** a StreamPool (viewer/instanceStream.js: the gather by LOD band round the camera, time-sliced) whose band meshes are
 *  parts of MultiDrawSets: bands = [{ set, part, l0, l1, attrs: [[attribute, column, width]] }]; the gather's cells
 *  are kept as runs (the set's chunks) */
export class MultiStreamPool extends StreamPool {
  constructor(key, bands, r = 1, margin) {
    super(key, bands.map((b) => ({ ...b, mesh: { count: 0, visible: false, boundingSphere: null }, runs: [] })), r, margin);
  }
  growAttr() {}
  *gather(srcs, c, over) {
    for (const m of this.meshes) m.runs.length = 0;
    yield* super.gather(srcs, c, over);
  }
  boxAdd(m, b) { super.boxAdd(m, b); m.runs.push([m.n, b]); }
  commit(c) {
    this.at.copy(c); this.commitT = performance.now();
    for (const m of this.meshes) { m.mesh.count = m.n; m.mesh.visible = m.n > 0; m.set.write(m.part, m.n, m.back, m.box, m.runs); }
  }
}
