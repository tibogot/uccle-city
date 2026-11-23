// ONE INDIRECT-ARGS BUFFER FOR THE CPU-WRITTEN INDIRECT DRAWS (perf job C, docs/PERF_RESEARCH_2026-11.md "Job C result",
// rule docs/rules/indirect-pool.md, gate row `indirectpool`).
// WHY: Chrome's Dawn on D3D12 validates the args of every indirect draw before the render pass with compute work that
// is batched PER INDIRECT BUFFER (Toji: 412 draws from many buffers ~3 ms of a 6 ms pass; one packed buffer ~10 us).
// debug/indirectCount.js counted ~2,300-2,500 indirect draws from 55-69 DISTINCT buffers in each main pass (the
// multi-draw kit sets: one buffer per view; the cell-culled tile meshes: one per mesh) at the Saint-Job street view and
// in the police drive.
// RULE: a CPU-written indirect record lives in THIS pool: `const s = pool.alloc(n)` (n records of 5 u32), write the
// records into `pool.array` at `s.base * 5`, `pool.touch(s, rec, n)` to upload them, `pool.bind(s, geometry, offsets)`
// with BYTE offsets `(s.base + rec) * 20`; `pool.free(s)` when the geometry is disposed. Growth (rare) makes a larger
// attribute, keeps every slot at its base (same offsets) and re-points the bound geometries once.
// Exceptions (their own IndirectStorageBufferAttribute): GPU-written args (compute shaders count into them with
// atomics: foliage/grass.js, grass/grass.js, foliage/plants.js, birds/skyFlocks.js), listed in the gate row.
// ?indpool=old: every user keeps its own attribute, as before.
import * as THREE from "three/webgpu";

const qs = new URLSearchParams(globalThis.location?.search || "");
export const POOL_ON = qs.get("indpool") !== "old";
export const WORDS = 5, BYTES = 20;

export class IndirectPool {
  /** cap: records (5 u32 each) of the first buffer */
  constructor(cap = 32768) {
    this.cap = cap;
    this.attr = new THREE.IndirectStorageBufferAttribute(new Uint32Array(cap * WORDS), WORDS);
    this.attr.name = "indirectPool";
    this.holes = [[0, cap]];                 // free ranges [start, n], sorted by start, never adjacent
    this.slots = new Set();
    this.used = 0; this.grows = 0; this.high = 0;
  }
  get array() { return this.attr.array; }
  /** n records (first fit; the pool grows when no hole holds them) */
  alloc(n) {
    n = Math.max(1, n | 0);
    let i = this.holes.findIndex((h) => h[1] >= n);
    if (i < 0) { this.grow(n); i = this.holes.findIndex((h) => h[1] >= n); }
    const h = this.holes[i], s = { base: h[0], n, geoms: [], live: true };
    if (h[1] === n) this.holes.splice(i, 1); else { h[0] += n; h[1] -= n; }
    this.slots.add(s); this.used += n; this.high = Math.max(this.high, s.base + n);
    return s;
  }
  /** give the slot's records back (its geometries no longer draw from the pool) */
  free(s) {
    if (!s || !s.live) return;
    s.live = false; this.slots.delete(s); this.used -= s.n;
    const H = this.holes, a = s.base, b = s.base + s.n;
    let i = 0; while (i < H.length && H[i][0] < a) i++;
    H.splice(i, 0, [a, s.n]);
    if (i + 1 < H.length && H[i + 1][0] === b) { H[i][1] += H[i + 1][1]; H.splice(i + 1, 1); }
    if (i > 0 && H[i - 1][0] + H[i - 1][1] === a) { H[i - 1][1] += H[i][1]; H.splice(i, 1); }
    s.geoms.length = 0;
  }
  /** a larger buffer: the records keep their place (same byte offsets), the bound geometries re-pointed once, the
   *  new attribute uploaded whole on its first draw */
  grow(n) {
    const old = this.attr, cap = Math.max(this.cap * 2, this.cap + n);
    const A = new Uint32Array(cap * WORDS); A.set(old.array);
    this.attr = new THREE.IndirectStorageBufferAttribute(A, WORDS);
    this.attr.name = "indirectPool";
    const H = this.holes, last = H[H.length - 1];
    if (last && last[0] + last[1] === this.cap) last[1] += cap - this.cap; else H.push([this.cap, cap - this.cap]);
    this.cap = cap; this.grows++;
    for (const s of this.slots) for (const g of s.geoms) g.indirect = this.attr;
    (globalThis.__indirectPoolGrows ||= []).push([Math.round(globalThis.performance?.now?.() ?? 0), cap]);
  }
  /** upload records [rec, rec + n) of the slot (update range, no whole-buffer upload) */
  touch(s, rec = 0, n = s.n) {
    if (n <= 0) return;
    this.attr.addUpdateRange((s.base + rec) * WORDS, n * WORDS); this.attr.needsUpdate = true;
  }
  /** draw this geometry from the slot: offsets in BYTES from the pool's start ((s.base + rec) * 20) */
  bind(s, geo, offsets) {
    geo.setIndirect(this.attr, offsets);
    if (!s.geoms.includes(geo)) s.geoms.push(geo);
  }
  /** the slot's byte offset of record rec */
  off(s, rec) { return (s.base + rec) * BYTES; }
  stats() { return { cap: this.cap, used: this.used, high: this.high, slots: this.slots.size, holes: this.holes.length, grows: this.grows, KB: +(this.cap * BYTES / 1024).toFixed(0) }; }
}

/** the page's pool (made on first use) */
let _pool = null;
export function indirectPool() { if (!_pool) { _pool = new IndirectPool(); globalThis.__indirectPool = _pool; } return _pool; }
