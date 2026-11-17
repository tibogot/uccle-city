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
import { StreamPool, Streamer } from "./instanceStream.js";

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
      if (!src) { v += g.attributes.position.count; (out.userData.zeroFilled ||= new Set()).add(a); continue; }   // (a part without it: zeros, e.g. the stack's uv)
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
// cell (50 m cells, tile by tile); consecutive cells are grouped into CHUNKS of at most chunkM (CHUNK_M) m across, each with its
// box (padded by the pieces' size), and each chunk is one indirect record. Per pass (the mesh's onBeforeRender, with
// that pass's camera: the view, the sun's shadow camera, the overhead weather bake...) only the records of the chunks
// in that camera's frustum are drawn: the geometry's indirect offset list is chosen per camera (no upload: the records
// are written at the commit). One cull per set, camera and frame, shared by the set's views.
// JOB 2 (docs/AGARGARO.md, docs/QUALITY_RULES.md rule 21), OFF by default (browser turn 2026-11-17: view instances
// -22..-34 %, but GPU -0.26 ms at 1 of 3 views and ~0 at the others, the sun shadow is cached, the lamp shadows' GPU
// unchanged, and the cull CPU 44-65 us vs 30-42 us): ?mdchunk=80 = 80 m chunks, <= 128 a part (a chunk that only
// grazes a frustum draws every instance in it; smaller ones draw the same instances minus those far outside). Too
// many cells for CHMAX: coarser (x1.5) until it fits. Default: 160 m / 48 as before.
const MD_CHUNK = Math.max(20, Number(qs.get("mdchunk")) || 160);
export const CHUNK_M = MD_CHUNK, CHUNK_MAX = MD_CHUNK >= 160 ? 48 : 128;
// JOB 1, OFF by default (browser turn: GPU -0.08..+0.02 ms at the 3 views, target -0.2): ?mdsort=1 = the VIEW
// camera's opaque draws run near to far (the chunks by their padded box's distance from the eye), so early-z can
// reject the hidden fragments of what is drawn after. Order only: the same records, the same image. Shadow cameras,
// reflections, bakes keep the part / chunk order (no shading there); blended views too (their order is the picture).
export const MD_SORT = qs.get("mdsort") === "1";
let VIEW_CAM = null;
/** the view camera (main.js, right after it is made): only its culls are sorted */
export function setMultiDrawViewCamera(cam) { VIEW_CAM = cam; }
let SORT_LIVE = true;
/** live A/B of the order (debug/gpuAB.js alternate): false = every set draws in the old order (no reload) */
export function setMultiDrawSort(on) { SORT_LIVE = !!on; }
const _frustum = new THREE.Frustum(), _m = new THREE.Matrix4(), _pl = new Float64Array(24);
// the near-to-far order: a counting sort on NB distance buckets, bucket = 2 x the 4th root of the squared distance to
// the padded box (= 2 sqrt(metres): 1.6 m wide at 10 m, 5 m at 100 m, 16 m at 1 km, the last one past 4 km); stable
// (the cull order inside a bucket). O(n), no comparator, no allocation.
const NB = 128;
let _bk = new Uint8Array(1024);
const _cnt = new Uint32Array(NB);
/** a chunk's distance bucket from the eye (the gate checks the order with it) */
export function nearBucket(d2) { return Math.min(NB - 1, (Math.sqrt(Math.sqrt(d2)) * 2) | 0); }
const GROUP = 32;
/** three's Frustum.intersectsBox negated, on the planes copied into _pl: the box's corner furthest along a plane's
 *  normal is behind it */
function outside(x0, y0, z0, x1, y1, z1) {
  for (let i = 0; i < 24; i += 4) {
    const nx = _pl[i], ny = _pl[i + 1], nz = _pl[i + 2];
    if (nx * (nx > 0 ? x1 : x0) + ny * (ny > 0 ? y1 : y0) + nz * (nz > 0 ? z1 : z0) + _pl[i + 3] < 0) return true;
  }
  return false;
}
/** a group's box: 0 out of the frustum, 2 wholly inside every plane (its nearest corner in front of each: every chunk
 *  in it passes without a test), 1 across */
function classify(x0, y0, z0, x1, y1, z1) {
  let r = 2;
  for (let i = 0; i < 24; i += 4) {
    const nx = _pl[i], ny = _pl[i + 1], nz = _pl[i + 2], d = _pl[i + 3];
    if (nx * (nx > 0 ? x1 : x0) + ny * (ny > 0 ? y1 : y0) + nz * (nz > 0 ? z1 : z0) + d < 0) return 0;
    if (r === 2 && nx * (nx > 0 ? x0 : x1) + ny * (ny > 0 ? y0 : y1) + nz * (nz > 0 ? z0 : z1) + d < 0) r = 1;
  }
  return r;
}

export class MultiDrawSet {
  /** parts: how many pieces; attrs: [[name, width]] the per-instance columns ("instanceMatrix" = the meshes' own) */
  constructor({ name, parts, attrs, cap0 = 64, chunk = CHUNK_M, chmax = CHUNK_MAX, sort = MD_SORT }) {
    this.name = name; this.attrs = attrs; this.views = []; this.pad = 2;
    this.chunkM = chunk; this.chMax = chmax; this.sort = sort;
    const CHMAX = chmax;
    this.parts = Array.from({ length: parts }, () => ({ off: 0, cap: cap0, n: 0, box: new Float64Array(6), nch: 0, ch: new Int32Array(CHMAX * 2), chBox: new Float32Array(CHMAX * 6), gBox: new Float32Array(CHMAX * 6), gEnd: new Int32Array(CHMAX), ng: 0 }));
    this.sphere = new THREE.Sphere();
    this.culls = [];                                        // [{ cam, frame, list }]
    this.layout();
    this.alloc();
  }
  layout() { let off = 0; for (const p of this.parts) { p.off = off; off += p.cap; } this.total = Math.max(off, MIN_CAP); }
  /** the instance buffers, with room to spare (a part that outgrows its region re-lays the regions in place while they
   *  fit: no new GPU buffer, one upload of the used range) */
  alloc(cap = this.total) { this.bufCap = Math.max(cap, this.total); this.buf = {}; for (const [name, w] of this.attrs) this.buf[name] = new THREE.InstancedBufferAttribute(new Float32Array(this.bufCap * w), w); }
  /** a view = one InstancedMesh: geoms[k] the part's geometry (null: not drawn by this view); shareOf: draw the
   *  geometry (and so the indirect draws) of an earlier view (a depth pre-pass twin) */
  addView({ geoms = null, material, castShadow = false, receiveShadow = true, name = this.name, renderOrder = 0, shareOf = null }) {
    let geo, ranges, indirect;
    if (shareOf) ({ geo, ranges, indirect } = shareOf);
    else {
      ({ geo, ranges } = mergeGeoms(geoms));
      indirect = new THREE.IndirectStorageBufferAttribute(new Uint32Array(this.parts.length * this.chMax * 5), 5);
      geo.setIndirect(indirect, []);
      for (const [a] of this.attrs) if (a !== "instanceMatrix") geo.setAttribute(a, this.buf[a]);
    }
    const mesh = new THREE.InstancedMesh(geo, material, 1);
    mesh.instanceMatrix = this.buf.instanceMatrix;
    mesh.count = this.bufCap;
    mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
    mesh.frustumCulled = true; mesh.boundingSphere = this.sphere;
    mesh.renderOrder = renderOrder; mesh.name = name; mesh.visible = false;
    mesh.userData.multiDraw = this;
    const v = { mesh, geo, ranges, indirect, shared: !!shareOf };
    // the pass's camera picks the records (ranges: this view's parts; a part not in the view has no records)
    mesh.onBeforeRender = (renderer, scene, camera, geometry) => { geometry.indirectOffset = this.cull(camera, renderer.info.frame, v); };
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
    this.group(P);
    this.records(k);
    this.refresh();
  }
  /** group the runs into chunks of at most `lim` m across (x / z); too many: again with a larger limit */
  chunk(P, n, box, runs, lim = this.chunkM) {
    const CHMAX = this.chMax;
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
  /** groups of consecutive chunks (gather order: neighbours) while their box stays within 3 chunk sizes and GROUP
   *  chunks: the cull skips a group out of the frustum, and passes every chunk of a group wholly inside, in one test */
  group(P) {
    const B = P.chBox, G = P.gBox;
    let span = 0;
    for (let c = 0, b = 0; c < P.nch; c++, b += 6) span = Math.max(span, B[b + 3] - B[b], B[b + 5] - B[b + 2]);
    const lim = Math.max(this.chunkM, span) * 3;            // (chunks made coarser by the CHMAX fallback: groups too)
    let ng = 0, o = -6;
    for (let c = 0; c < P.nch; c++) {
      const b = c * 6;
      if (ng && c - (ng > 1 ? P.gEnd[ng - 2] : 0) < GROUP && Math.max(G[o + 3], B[b + 3]) - Math.min(G[o], B[b]) <= lim && Math.max(G[o + 5], B[b + 5]) - Math.min(G[o + 2], B[b + 2]) <= lim) {
        for (let i = 0; i < 3; i++) { G[o + i] = Math.min(G[o + i], B[b + i]); G[o + i + 3] = Math.max(G[o + i + 3], B[b + i + 3]); }
      } else { o = ng++ * 6; for (let i = 0; i < 6; i++) G[o + i] = B[b + i]; }
      P.gEnd[ng - 1] = c + 1;
    }
    P.ng = ng;
  }
  /** the part's indirect records in every view (index count, instances, first index, base vertex 0, first instance) */
  records(k) {
    const P = this.parts[k], CHMAX = this.chMax;
    for (const v of this.views) {
      if (v.shared || !v.ranges[k]) continue;
      const A = v.indirect.array, [first, count] = v.ranges[k];
      for (let c = 0; c < P.nch; c++) { const o = (k * CHMAX + c) * 5; A[o] = count; A[o + 1] = P.ch[c * 2 + 1]; A[o + 2] = first; A[o + 3] = 0; A[o + 4] = P.off + P.ch[c * 2]; }
      // only this part's written records go up (the ones past nch are never drawn: a cull lists c < nch only)
      if (P.nch) { v.indirect.addUpdateRange(k * CHMAX * 5, P.nch * 5); v.indirect.needsUpdate = true; }
    }
    this.culls.length = 0;
  }
  /** the byte offsets of the records drawn for this camera (cached per camera and frame). The test is three's
   *  Frustum.intersectsBox (the box's corner furthest along each plane's normal; outside a plane = culled), inlined over
   *  the padded chunk boxes, groups first. The view camera's opaque views get the records near to far (MD_SORT: the
   *  counting sort above); shadow / other cameras and blended views keep the part / chunk order. */
  cull(camera, frame, v) {
    let e = null;
    const CHMAX = this.chMax;
    for (const c of this.culls) if (c.cam === camera) { e = c; break; }
    if (!e) { e = { cam: camera, frame: -1, gen: 0, vp: new Float64Array(16), all: [], near: new Int32Array(64), sorted: false, lists: new Map(), listsB: new Map() }; this.culls.push(e); if (this.culls.length > 8) this.culls.shift(); }
    // (one camera can render several times a frame with other matrices: a point light's 6 cube faces; a cached cull
    // is reused only for the same view-projection)
    _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    let same = e.frame === frame;
    if (same) { const M = _m.elements, V = e.vp; for (let i = 0; i < 16; i++) if (M[i] !== V[i]) { same = false; break; } }
    if (!same) {
      e.frame = frame; e.gen++; e.vp.set(_m.elements); e.all.length = 0; e.sorted = false;
      _frustum.setFromProjectionMatrix(_m, camera.coordinateSystem, camera.reversedDepth);
      for (let i = 0; i < 6; i++) { const p = _frustum.planes[i]; _pl[i * 4] = p.normal.x; _pl[i * 4 + 1] = p.normal.y; _pl[i * 4 + 2] = p.normal.z; _pl[i * 4 + 3] = p.constant; }
      const pad = this.pad, all = e.all, w = camera.matrixWorld.elements, ex = w[12], ey = w[13], ez = w[14];
      const sort = this.sort && SORT_LIVE && camera === VIEW_CAM;
      let n = 0;
      for (let k = 0; k < this.parts.length; k++) {
        const P = this.parts[k], b = P.chBox, G = P.gBox;
        for (let gi = 0, c = 0; gi < P.ng; gi++) {
          const q = gi * 6, end = P.gEnd[gi];
          const g = classify(G[q] - pad, G[q + 1] - pad, G[q + 2] - pad, G[q + 3] + pad, G[q + 4] + pad, G[q + 5] + pad);
          if (g === 0) { c = end; continue; }
          for (; c < end; c++) {
            const o = c * 6;
            const x0 = b[o] - pad, y0 = b[o + 1] - pad, z0 = b[o + 2] - pad, x1 = b[o + 3] + pad, y1 = b[o + 4] + pad, z1 = b[o + 5] + pad;
            if (g === 1 && outside(x0, y0, z0, x1, y1, z1)) continue;
            all.push(k, c);
            if (sort) {
              if (n >= _bk.length) { const K = new Uint8Array(_bk.length * 2); K.set(_bk); _bk = K; }
              const dx = Math.max(x0 - ex, ex - x1, 0), dy = Math.max(y0 - ey, ey - y1, 0), dz = Math.max(z0 - ez, ez - z1, 0);
              const q = Math.min(NB - 1, (Math.sqrt(Math.sqrt(dx * dx + dy * dy + dz * dz)) * 2) | 0);
              _bk[n++] = q; _cnt[q]++;
            }
          }
        }
      }
      if (sort) {
        if (n > 1) {
          let near = e.near;
          if (near.length < n * 2) near = e.near = new Int32Array(n * 4);
          for (let q = 0, at = 0; q < NB; q++) { const m = _cnt[q]; _cnt[q] = at; at += m; }
          for (let i = 0; i < n; i++) { const p = _cnt[_bk[i]]++ * 2; near[p] = all[i * 2]; near[p + 1] = all[i * 2 + 1]; }
          e.sorted = true;
        }
        _cnt.fill(0);
      }
    }
    // the view's offset list (one per camera and ranges, its array reused: three reads it in this pass's draw)
    const blend = !!v.mesh.material.transparent, lists = blend ? e.listsB : e.lists;
    let L = lists.get(v.ranges);
    if (!L) lists.set(v.ranges, (L = { gen: -1, list: [] }));
    if (L.gen !== e.gen) {
      L.gen = e.gen;
      const src = e.sorted && !blend ? e.near : e.all, list = L.list, R = v.ranges, nn = e.all.length;
      list.length = 0;
      for (let i = 0; i < nn; i += 2) if (R[src[i]]) list.push((src[i] * CHMAX + src[i + 1]) * 20);
    }
    return L.list;
  }
  /** a part outgrew its region: every region re-laid (x2 for the one that grew), the buffers re-made (uploaded whole) */
  grow(k, n) {
    const olds = this.parts.map((p) => ({ off: p.off, n: p.n }));
    this.parts[k].cap = Math.max(Math.ceil(n * 1.25), this.parts[k].cap * 2);
    this.layout();
    const relay = (src, dst) => { for (const [name, w] of this.attrs) this.parts.forEach((p, j) => { if (olds[j].n) dst[name].array.set(src[name].subarray(olds[j].off * w, (olds[j].off + olds[j].n) * w), p.off * w); }); };
    if (this.total <= this.bufCap) {
      // in place: the regions move inside the same buffers (one upload of the used range, no new GPU buffer)
      const tmp = {}; for (const [name] of this.attrs) tmp[name] = this.buf[name].array.slice();
      relay(tmp, this.buf);
      for (const [name, w] of this.attrs) { const a = this.buf[name]; a.addUpdateRange(0, this.total * w); a.needsUpdate = true; }
    } else {
      const old = {}; for (const [name] of this.attrs) old[name] = this.buf[name].array;
      this.alloc(Math.ceil(this.total * 1.5));
      relay(old, this.buf);
      for (const v of this.views) {
        v.mesh.instanceMatrix = this.buf.instanceMatrix; v.mesh.count = this.bufCap;
        if (v.shared) continue;
        for (const [a] of this.attrs) if (a !== "instanceMatrix") v.geo.setAttribute(a, this.buf[a]);
      }
      this.reallocs = (this.reallocs || 0) + 1;
    }
    this.parts.forEach((p, j) => { if (j !== k) this.records(j); });
    this.grows = (this.grows || 0) + 1;
    (globalThis.__multiDrawGrows ||= []).push([performance.now(), this.name, k, this.total, this.bufCap]);
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
    return { views: this.views.filter((v) => v.mesh.visible).length, chunks, drawnChunks: last, inst, total: this.total, bufCap: this.bufCap, grows: this.grows || 0, reallocs: this.reallocs || 0 };
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

// ------------------------------------------------------------------------------------------------ any kit's pools
/** ?kitmerge=old: the street kits (gardens, street kit, furniture, street life + shops, stops) keep one mesh per piece
 *  and LOD */
const KIT_MERGE = qs.get("kitmerge") !== "old";
const defaultOnBeforeRender = THREE.Object3D.prototype.onBeforeRender;
/**
 * Merge the meshes of existing StreamPools (a kit's pools: one InstancedMesh per piece and LOD, sharing a material per
 * LOD) into multi-draw sets: one per (material, shadow flags, render order, instance columns), when at least two meshes
 * share it. Left alone: transparent materials (sorted per object), meshes with instance colours, morphs, their own
 * onBeforeRender, or geometries that do not merge. The original meshes leave the scene but stay the pools' (and the
 * kits' stats') mesh objects: count / visible keep being written. Called by Streamer.start (viewer/instanceStream.js)
 * on pools it has not seen.
 */
export function mergeStreamPools(pools) {
  if (!KIT_MERGE || !multiDrawOK()) return 0;
  const groups = new Map();
  for (const p of pools) {
    if (p.__mergeSeen || p instanceof MultiStreamPool) continue;
    p.__mergeSeen = true;
    for (const m of p.meshes) {
      const o = m.mesh;
      if (!o?.isInstancedMesh || !o.parent || Array.isArray(o.material) || o.material.transparent || o.instanceColor || Object.keys(o.geometry.morphAttributes).length || o.onBeforeRender !== defaultOnBeforeRender) continue;
      const key = [o.material.uuid, o.castShadow, o.receiveShadow, o.renderOrder, o.layers.mask, m.attrs.map(([a, , w]) => `${a}:${w}`).join(",")].join("|");
      let g = groups.get(key); if (!g) groups.set(key, (g = []));
      g.push({ p, m });
    }
  }
  let merged = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const o0 = list[0].m.mesh;
    let set, view;
    try {
      set = new MultiDrawSet({ name: `${o0.name}:merged`, parts: list.length, attrs: list[0].m.attrs.map(([a, , w]) => [a, w]), cap0: 192 });
      view = set.addView({ geoms: list.map((e) => e.m.mesh.geometry), material: o0.material, castShadow: o0.castShadow, receiveShadow: o0.receiveShadow, renderOrder: o0.renderOrder, name: `${o0.name.replace(/-lod\d$/, "")}:merged(${list.length})` });
    } catch (e) { console.warn(`multiDraw: ${o0.name} not merged (${e.message})`); continue; }
    set.pad = Math.max(...list.map((e) => e.p.r)) + 1;
    view.mesh.layers.mask = o0.layers.mask;
    o0.parent.add(view.mesh);
    list.forEach((e, k) => {
      Object.assign(e.m, { set, part: k, runs: [], merged: true });
      e.m.mesh.removeFromParent();
      patchPool(e.p);
    });
    merged += list.length;
  }
  return merged;
}
function patchPool(p) {
  if (p.__mergedPatch) return;
  p.__mergedPatch = true;
  const growAttr = p.growAttr, boxAdd = p.boxAdd, gather = p.gather, commitOne = StreamPool.prototype.commit;
  p.growAttr = function (m, n) { if (!m.merged) growAttr.call(this, m, n); };
  p.boxAdd = function (m, b) { boxAdd.call(this, m, b); if (m.runs) m.runs.push([m.n, b]); };
  p.gather = function* (srcs, c, over) { for (const m of this.meshes) if (m.runs) m.runs.length = 0; yield* gather.call(this, srcs, c, over); };
  p.commit = function (c) {
    // the merged entries into their sets; the others as StreamPool.commit does (on a view of this pool with only them)
    const rest = this.meshes.filter((m) => !m.merged);
    for (const m of this.meshes) if (m.merged) { m.mesh.count = m.n; m.mesh.visible = m.n > 0; m.set.write(m.part, m.n, m.back, m.box, m.runs); }
    if (rest.length) { const all = this.meshes; this.meshes = rest; try { commitOne.call(this, c); } finally { this.meshes = all; } }
    else { this.at.copy(c); this.commitT = performance.now(); }
  };
}

Streamer.merge = mergeStreamPools;
