// INSTANCE STREAMING for the city-wide pools (docs/perf/AUDIT.md, step "instance pools"): ONE instanced mesh per piece
// and LOD for the whole city (few draws), re-filled from the loaded tiles' instances near the camera, WITHOUT a
// main-thread spike while driving:
//   - per tile and piece, a SOURCE built once when the tile lands: the instances' attribute columns already in the
//     pool's layout (matrix 16, the band / variant vec4s), sorted into 50 m cells, with a centre + half extent per
//     instance; a gather copies whole cells (one typed-array set per run of accepted instances), tests instances one
//     by one only in the cells that straddle a LOD band's edge; no allocation per gather (grown back arrays)
//   - the tile fade is NOT in the instances any more: each tile has a SLOT in a small uniform array (FadeSlots) and the
//     instances carry the slot; a tile fading in / out changes one float, never re-gathers
//   - hysteresis: the pools hold every instance within its LOD band + MARGIN (6 m); a new gather starts when the
//     camera has moved TRIGGER (2 m) from the last one's centre, or a tile came / went (a gather takes 1-4 frames: the
//     4 m between them is ~17 frames at 14 m/s; more margin costs GPU: every held instance's vertices are drawn)
//   - time-sliced: a gather runs as a generator over frames with a per-frame budget (ms) per streamer; each pool is
//     committed (copy into its static buffers, update range over the live count, needsUpdate) as soon as it is done.
//     The margin covers the camera's travel while a gather runs (trigger + a few frames at car speed); if the camera
//     ever outruns it (a teleport), the gather in flight is finished at once
//   - never DynamicDrawUsage (r187 re-uploads such buffers whole in every pass); a mesh with nothing to draw is hidden
import * as THREE from "three/webgpu";
import { uniformArray } from "three/tsl";

/** the distance (m) every pool holds beyond its LOD bands; the camera travel (m) that starts a new gather */
export const MARGIN = 6, TRIGGER = 2;

/** ONE budget a frame (ms) for all the streaming work of the city (these pools, the façade kit's re-bucket, the tree
 *  fields' re-buckets): every participant asks left(key) each frame (a frame starts when a key comes round again) and
 *  reports what it spent; past the budget the work waits for the next frame (unless the camera outran its margin) */
export const frameBudget = {
  ms: 0.45, seen: new Set(), spent: 0,
  left(key) {
    if (this.seen.has(key)) { this.seen.clear(); this.spent = 0; }
    this.seen.add(key);
    return this.ms - this.spent;
  },
  spend(ms) { this.spent += ms; },
};

// ------------------------------------------------------------------------------------------------ tile fades
/** a uniform float per tile (its fade, lodFade.js conventions: 0..1 in, 2..3 out); slot 0 = always 1 (fallback) */
export class FadeSlots {
  constructor(n = 128) {
    this.n = n;
    this.node = uniformArray(new Array(n).fill(0), "float");
    this.node.array[0] = 1;
    this.free = [];
    for (let i = n - 1; i >= 1; i--) this.free.push(i);
  }
  alloc() { const s = this.free.pop(); if (s === undefined) return 0; this.node.array[s] = 0; return s; }
  set(slot, f) { if (slot > 0) this.node.array[slot] = f; }
  release(slot) { if (slot > 0) { this.node.array[slot] = 0; this.free.push(slot); } }
  /** the TSL fade of an instance whose slot is `slotF` (a float node) */
  fade(slotF) { return this.node.element(slotF.add(0.5).toInt()); }
}

// ------------------------------------------------------------------------------------------------ sources
/**
 * A tile's instances of one piece as a streaming source. cols: { <name>: [Float32Array, width] } (unsorted, n
 * instances); cen: Float32Array(n * 4) (x, y, z, half extent). Returns { n, cols: { <name>: Float32Array }, w: { <name>:
 * width }, cen, cells: [{ x, z, r, h, y0, y1, a, b, box }] } with every column sorted by 50 m cell.
 */
export function buildSource(n, cols, cen, C = 50) {
  const key = new Float64Array(n), idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) { idx[i] = i; key[i] = Math.floor(cen[i * 4] / C) * 4096 + Math.floor(cen[i * 4 + 2] / C); }
  idx.sort((p, q) => key[p] - key[q] || p - q);
  const out = { n, cols: {}, w: {}, cen: new Float32Array(n * 4), cells: [] };
  for (const [k, [a, w]] of Object.entries(cols)) {
    const o = new Float32Array(n * w);
    for (let j = 0; j < n; j++) { const i = idx[j]; for (let c = 0; c < w; c++) o[j * w + c] = a[i * w + c]; }
    out.cols[k] = o; out.w[k] = w;
  }
  let cur = null;
  for (let j = 0; j < n; j++) {
    const i = idx[j];
    for (let c = 0; c < 4; c++) out.cen[j * 4 + c] = cen[i * 4 + c];
    if (!cur || key[i] !== cur.k) {
      cur = { k: key[i], x: (Math.floor(cen[i * 4] / C) + 0.5) * C, z: (Math.floor(cen[i * 4 + 2] / C) + 0.5) * C, r: 0, h: 0, y0: Infinity, y1: -Infinity, a: j, b: j, box: [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity] };
      out.cells.push(cur);
    }
    const x = cen[i * 4], y = cen[i * 4 + 1], z = cen[i * 4 + 2], h = cen[i * 4 + 3];
    cur.r = Math.max(cur.r, Math.hypot(x - cur.x, z - cur.z)); cur.h = Math.max(cur.h, h);
    cur.y0 = Math.min(cur.y0, y); cur.y1 = Math.max(cur.y1, y);
    const b = cur.box; b[0] = Math.min(b[0], x - h); b[1] = Math.min(b[1], y - h); b[2] = Math.min(b[2], z - h); b[3] = Math.max(b[3], x + h); b[4] = Math.max(b[4], y + h); b[5] = Math.max(b[5], z + h);
    cur.b = j + 1;
  }
  return out;
}

/** a source from x y z yaw records (stride `stride`): the matrix (rotation about +y, then the translation) + the
 *  vec4 columns `extra(o, out4)` fills from the record at offset o; half = the piece's radius */
export function sourceFromYaw(a, stride, half, extras = {}) {
  const n = a.length / stride, M = new Float32Array(n * 16), cen = new Float32Array(n * 4), cols = { instanceMatrix: [M, 16] };
  const E = Object.entries(extras).map(([k, f]) => { const arr = new Float32Array(n * 4); cols[k] = [arr, 4]; return [arr, f]; });
  const t4 = new Float32Array(4);
  for (let i = 0; i < n; i++) {
    const o = i * stride, x = a[o], y = a[o + 1], z = a[o + 2], yaw = a[o + 3], cs = Math.cos(yaw), sn = Math.sin(yaw), k = i * 16;
    M[k] = cs; M[k + 2] = -sn; M[k + 5] = 1; M[k + 8] = sn; M[k + 10] = cs; M[k + 12] = x; M[k + 13] = y; M[k + 14] = z; M[k + 15] = 1;
    cen[i * 4] = x; cen[i * 4 + 1] = y; cen[i * 4 + 2] = z; cen[i * 4 + 3] = half;
    for (const [arr, f] of E) { t4.fill(0); f(o, t4); arr.set(t4, i * 4); }
  }
  return buildSource(n, cols, cen);
}

// ------------------------------------------------------------------------------------------------ the pools
/**
 * One piece's meshes (its LODs, posters, glass...): meshes = [{ mesh, l0, l1, attrs: [[attribute, column, width]] }]
 * (attribute "instanceMatrix" = the mesh's own; l0 / l1 = the distances (m) its shader may draw an instance between);
 * the pool holds [l0 - margin, l1 + margin] round its gather centre `at`; r = the piece's own radius (the bounding
 * sphere's pad).
 */
export class StreamPool {
  constructor(key, meshes, r = 1, margin = MARGIN) {
    this.key = key; this.r = r; this.margin = margin; this.at = new THREE.Vector3(1e9, 0, 0);
    this.meshes = meshes.map((m) => ({ ...m, d0: Math.max(0, m.l0 - margin), d1: m.l1 + margin, back: {}, n: 0, cap: 0, box: new Float64Array(6) }));
    for (const m of this.meshes) {
      m.mesh.count = 0; m.mesh.visible = false;
      m.mesh.boundingSphere ||= new THREE.Sphere();
      this.growAttr(m, 64);
    }
  }
  attr(m, name) { return name === "instanceMatrix" ? m.mesh.instanceMatrix : m.mesh.geometry.attributes[name]; }
  /** the mesh's GPU-side attributes (only ever at a commit: a new attribute uploads whole at its first draw) */
  growAttr(m, n) {
    if (n <= m.cap) return;
    m.cap = Math.max(n, m.cap * 2, 64);
    for (const [name, , w] of m.attrs) {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(m.cap * w), w);
      if (name === "instanceMatrix") m.mesh.instanceMatrix = a; else m.mesh.geometry.setAttribute(name, a);
    }
  }
  /** the gather (a generator: yields when `over()` says the frame's budget is spent): every source's instances within
   *  each mesh's [d0, d1] of c into the back arrays, then the commit */
  *gather(srcs, c, over) {
    const cx = c.x, cy = c.y, cz = c.z;
    for (const m of this.meshes) { m.n = 0; m.box.fill(Infinity, 0, 3); m.box.fill(-Infinity, 3, 6); }
    for (const s of srcs) {
      const src = s.src;
      for (const cl of src.cells) {
        const dc = Math.sqrt((cl.x - cx) ** 2 + (cl.z - cz) ** 2);
        const dy = Math.max(Math.abs(cl.y0 - cy), Math.abs(cl.y1 - cy));
        const far = Math.sqrt((dc + cl.r) ** 2 + dy * dy), near = dc - cl.r;
        for (const m of this.meshes) {
          if (near - cl.h > m.d1 || far + cl.h < m.d0) continue;              // the whole cell out of the band
          if (far <= m.d1 && near >= m.d0) { this.copy(m, src, cl.a, cl.b); this.boxAdd(m, cl.box); continue; }
          // straddling: instance by instance, accepted runs copied at once
          const C = src.cen;
          let run = -1;
          for (let i = cl.a; i < cl.b; i++) {
            const o = i * 4, h = C[o + 3];
            const d = Math.sqrt((C[o] - cx) ** 2 + (C[o + 1] - cy) ** 2 + (C[o + 2] - cz) ** 2);
            const ok = d + h >= m.d0 && d - h <= m.d1;
            if (ok && run < 0) run = i;
            else if (!ok && run >= 0) { this.copy(m, src, run, i); run = -1; }
          }
          if (run >= 0) this.copy(m, src, run, cl.b);
          this.boxAdd(m, cl.box);
        }
        if (over()) yield;
      }
    }
    this.commit(c);
  }
  copy(m, src, a, b) {
    const k = b - a; if (k <= 0) return;
    const need = m.n + k;
    for (const [name, col, w] of m.attrs) {
      let B = m.back[name];
      if (!B || B.length < need * w) { const nb = new Float32Array(Math.max(need, (B ? B.length / w : 0) * 2, 64) * w); if (B) nb.set(B.subarray(0, m.n * w)); B = m.back[name] = nb; }
      B.set(src.cols[col].subarray(a * w, b * w), m.n * w);
    }
    m.n = need;
  }
  boxAdd(m, b) { const B = m.box; for (let i = 0; i < 3; i++) { B[i] = Math.min(B[i], b[i]); B[i + 3] = Math.max(B[i + 3], b[i + 3]); } }
  commit(c) {
    this.at.copy(c); this.commitT = performance.now();
    for (const m of this.meshes) {
      const n = m.n, mesh = m.mesh;
      mesh.count = n; mesh.visible = n > 0;
      if (!n) continue;
      this.growAttr(m, n);
      for (const [name, , w] of m.attrs) {
        const att = this.attr(m, name);
        att.array.set(m.back[name].subarray(0, n * w));
        att.clearUpdateRanges(); att.addUpdateRange(0, n * w); att.needsUpdate = true;
      }
      const B = m.box;
      mesh.boundingSphere.center.set((B[0] + B[3]) / 2, (B[1] + B[4]) / 2, (B[2] + B[5]) / 2);
      mesh.boundingSphere.radius = Math.hypot(B[3] - B[0], B[4] - B[1], B[5] - B[2]) / 2 + this.r + 1;
    }
  }
  get drawn() { return this.meshes.filter((m) => m.mesh.visible).length; }
}

// ------------------------------------------------------------------------------------------------ the streamer
/**
 * The pools of one layer + its tiles. addTile(name, group, make(slot) -> { <pool key>: source }), removeTile(name),
 * update(camera) once per frame. group: the tile's group whose userData.fade (or its parent's) is the tile fade; a
 * tile whose parent is hidden draws nothing (fade 0).
 */
export class Streamer {
  constructor({ name, pools, fades, margin = MARGIN, trigger = TRIGGER, budget = 0.3 }) {
    Object.assign(this, { name, pools, fades, margin, trigger, budget });
    this.tiles = new Map();
    this.center = new THREE.Vector3(1e9, 0, 0);       // the displayed gather's centre
    this.job = null; this.jobCenter = new THREE.Vector3(); this.dirty = true; this.seq = 0;
    this.quarantine = [];                              // [slot, seq]: freed once a gather started after the removal is in
    (globalThis.__streamers ||= []).push(this);
    this.stats = { gathers: 0, frames: 0, ms: 0, maxSliceMs: 0, lastJobMs: 0, lastJobFrames: 0, forced: 0 };
  }
  addTile(name, group, make) {
    const slot = this.fades.alloc();
    this.tiles.set(name, { name, group, slot, srcs: make(slot), fade: -1, addedT: performance.now() });
    this.dirty = true;
  }
  removeTile(name) {
    const t = this.tiles.get(name); if (!t) return;
    this.fades.set(t.slot, 0);
    this.quarantine.push([t.slot, this.seq]);
    this.tiles.delete(name);
    this.dirty = true;
  }
  update(camera) {
    const c = camera.position;
    for (const t of this.tiles.values()) {
      const g = t.group;
      const f = g.parent && g.parent.visible === false ? 0 : g.userData.fade ?? g.parent?.userData.fade ?? 1;
      if (f !== t.fade) { t.fade = f; this.fades.set(t.slot, f); }
    }
    if (!this.job && (this.dirty || c.distanceToSquared(this.center) > this.trigger * this.trigger)) this.start(c);
    if (!this.job) { frameBudget.left(this); return; }
    // outrun (a teleport): what is drawn no longer covers the view; finish at once
    const lim = this.margin * 0.8, force = c.distanceTo(this.jobCenter) > lim || c.distanceTo(this.center) > lim;
    if (force) this.stats.forced++;
    const left = frameBudget.left(this);
    if (!force && left < 0.05) return;                 // (the frame's streaming budget is spent: next frame)
    const t0 = performance.now();
    this.pump(force ? Infinity : Math.min(this.budget, left));
    frameBudget.spend(performance.now() - t0);
  }
  start(c) {
    this.dirty = false; this.seq++;
    this.jobCenter.copy(c);
    const seq = this.seq, list = [...this.tiles.values()];
    const self = this;
    this.jobT = 0; this.jobFrames = 0;
    this.job = (function* () {
      for (const p of self.pools) {
        const srcs = [];
        for (const t of list) { const s = t.srcs[p.key]; if (s && s.n) srcs.push({ src: s }); }
        yield* p.gather(srcs, self.jobCenter, () => performance.now() > self.deadline);
        if (performance.now() > self.deadline) yield;
      }
      return seq;
    })();
  }
  pump(budget) {
    const t0 = performance.now();
    this.deadline = t0 + budget;
    const r = this.job.next();
    const ms = performance.now() - t0;
    this.jobT += ms; this.jobFrames++;
    this.stats.ms += ms; this.stats.frames++; this.stats.maxSliceMs = Math.max(this.stats.maxSliceMs, ms);
    if (r.done) {
      this.job = null;
      this.center.copy(this.jobCenter);
      this.stats.gathers++; this.stats.lastJobMs = +this.jobT.toFixed(2); this.stats.lastJobFrames = this.jobFrames;
      const seq = r.value;
      this.quarantine = this.quarantine.filter(([slot, s]) => { if (s < seq) { this.fades.release(slot); return false; } return true; });
    }
  }
  /** finish any gather in flight now (tests, a view jump) */
  flush(camera) { if (!this.job) this.start(camera.position); while (this.job) this.pump(Infinity); }
}
