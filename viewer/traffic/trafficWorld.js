// THE LANE GRAPHS OF THE LOADED TILES, as one network for the traffic (viewer/traffic/trafficSim.js).
// Each tile's graph (trafficGraph.js, from the tile worker) keeps its own arrays; a path is addressed by a global id
// gid = slot << 16 | local index. Every tile's graph also holds a 150 m buffer of its neighbours' roads (so its
// junctions are whole): a buffer copy (core = 0) gets a TWIN, the neighbour's own copy of the same lane piece
// (by geometry: twinlink below), when that neighbour is loaded; the sim takes the twin whenever it picks a next
// path, so a car crossing a tile border moves onto the tile that owns the road there (a small lateral difference
// between the two copies is blended out over a second, trafficSim.js handover).
// A spatial hash of every segment (8 m cells) projects obstacles (the player's car, the walker, trams) onto lanes.
//
// twinlink (2026-11-17, docs/TWINLINK.md): the twin is found by GEOMETRY, not by "start within 3 m, similar length"
// (that missed 36 % of the copies lying in a loaded neighbour, all 120 tiles, ?trafpark=old too, and linked some to
// the wrong lane). The two copies of a lane are the same engine lane cut at different nodes (each tile builds its own
// net from its own 150 m buffer), and only the owner's copy is fitted to the measured carriageway (the raster stops at
// the tile border): a copy runs up to ~3 m beside its twin, may start mid-way along it, or run past its end. Now: the
// copy sampled every 2 m, each sample's nearest core lane of the neighbour (same kind, heading within 45 deg, within
// 4 m); the twin = the lane under the copy's START (else the one under most of it) when >= 60 % of the copy lies on
// the neighbour's lanes; twinAt[i] = where the copy's start falls along the twin (the sim enters the twin there:
// trafficSim.js handover / rerouteTwins). ?twinlink=old: the start + length match of before.
export const TWIN_OLD = typeof location !== "undefined" && /[?&]twinlink=old(&|$)/.test(location.search);
const T_STEP = 3, T_MAXS = 32, T_LAT = 4, T_DOT = 0.7, T_COVER = 0.6, T_MEAN = 3, T_MEAN_LANE = 3, T_ENTRY = 4;

const CELL = 8;
const key = (i, j) => (i + 32768) * 65536 + (j + 32768);

export class TrafficWorld {
  constructor() {
    this.slots = [];            // slot -> graph (or null)
    this.byName = new Map();
    this.version = 0;
  }
  get tiles() { return this.slots.filter(Boolean); }
  /** Add a tile's graph (trafficGraph.js result). Returns its slot. */
  add(name, g) {
    if (this.byName.has(name)) this.remove(name);
    let s = this.slots.indexOf(null);
    if (s < 0) { s = this.slots.length; this.slots.push(null); }
    g.slot = s; g.name = name;
    g.twin = new Int32Array(g.paths).fill(-1);
    g.twinAt = new Float32Array(g.paths);              // twinlink: distance along the twin of this copy's start
    g.head = new Int32Array(g.paths).fill(-1);       // first car on each path (the sim's per-step lists)
    g.ohead = new Int32Array(g.paths).fill(-1);      // first obstacle entry on each path
    g.stamp = 0;
    this.index(g);
    this.slots[s] = g;
    this.byName.set(name, g);
    for (const o of this.tiles) if (o !== g) { this.link(g, o); this.link(o, g); }
    this.version++;
    return s;
  }
  remove(name) {
    const g = this.byName.get(name);
    if (!g) return -1;
    this.byName.delete(name);
    this.slots[g.slot] = null;
    for (const o of this.tiles) for (let i = 0; i < o.paths; i++) if (o.twin[i] >= 0 && o.twin[i] >>> 16 === g.slot) { o.twin[i] = -1; o.twinAt[i] = 0; }
    this.version++;
    return g.slot;
  }
  /** Segment + path-start hash of a graph. */
  index(g) {
    const seg = new Map(), start = new Map();
    for (let i = 0; i < g.paths; i++) {
      const a = g.off[i], b = g.off[i + 1];
      const sk = key(Math.floor(g.xy[a * 2] / CELL), Math.floor(g.xy[a * 2 + 1] / CELL));
      (start.get(sk) || start.set(sk, []).get(sk)).push(i);
      for (let k = a; k < b - 1; k++) {
        const x0 = g.xy[k * 2], z0 = g.xy[k * 2 + 1], x1 = g.xy[k * 2 + 2], z1 = g.xy[k * 2 + 3];
        for (let ci = Math.floor(Math.min(x0, x1) / CELL); ci <= Math.floor(Math.max(x0, x1) / CELL); ci++)
          for (let cj = Math.floor(Math.min(z0, z1) / CELL); cj <= Math.floor(Math.max(z0, z1) / CELL); cj++) {
            const kk = key(ci, cj);
            (seg.get(kk) || seg.set(kk, []).get(kk)).push(i, k);
          }
      }
    }
    g.segHash = new Map([...seg].map(([k, v]) => [k, Int32Array.from(v)]));
    g.startHash = start;
  }
  /** Twins: g's buffer paths whose midpoint lies in o's core get o's copy. */
  link(g, o) {
    const t0 = performance.now();
    if (TWIN_OLD) this.linkOld(g, o); else this.linkGeo(g, o);
    const ms = performance.now() - t0;
    this.linkMs = (this.linkMs || 0) + ms;
    this.linkMsMax = Math.max(this.linkMsMax || 0, ms);
  }
  /** twinlink: by geometry (see the head of this file). Scratch arrays per world, nothing allocated per path. */
  linkGeo(g, o) {
    const b = o.bounds, gb = g.bounds;
    // (a buffer copy's midpoint lies within the 150 m buffer: tiles further apart share none)
    if (b.x0 > gb.x1 + 400 || b.x1 < gb.x0 - 400 || b.z0 > gb.z1 + 400 || b.z1 < gb.z0 - 400) return;
    if (!g.tlMid) { g.tlMid = new Float32Array(g.paths * 2); for (let i = 0; i < g.paths; i++) { const m = this.midOf(g, i); g.tlMid[i * 2] = m[0]; g.tlMid[i * 2 + 1] = m[1]; } }
    if (!this._tc || this._tc.length < o.paths) { this._tc = new Int32Array(o.paths + 256); this._ts = new Float32Array(o.paths + 256); }
    const cnt = this._tc, sum = this._ts, touched = this._tt || (this._tt = []), q = this._tq || (this._tq = new Float64Array(2));
    const xy = g.xy, cum = g.cum;
    for (let i = 0; i < g.paths; i++) {
      if (g.core[i] || g.twin[i] >= 0) continue;
      const mx = g.tlMid[i * 2], mz = g.tlMid[i * 2 + 1];
      if (mx < b.x0 || mx >= b.x1 || mz < b.z0 || mz >= b.z1) continue;
      if (g.kind[i]) {
        // a junction connector: the neighbour's connector that leaves AND arrives where this one does, the same shape
        // (the connectors leaving one lane all start at one point; a junction the two tiles cut differently has none:
        // the copy is kept, the car drives it and takes the twin of the lane after it)
        const J = this.connTwin(g, i, o);
        if (J >= 0) { g.twin[i] = (o.slot << 16) | J; g.twinAt[i] = 0; }
        continue;
      }
      const a = g.off[i], e = g.off[i + 1], L = g.len[i], kd = 0;
      const N = Math.min(T_MAXS, Math.max(2, Math.ceil(L / T_STEP) + 1));
      let covered = 0, miss = 0, first = -1, firstAt = 0, firstD = 0, k = a + 1;
      touched.length = 0;
      for (let s = 0; s < N; s++) {
        const d = (L * s) / (N - 1);
        while (k < e - 1 && cum[k] < d) k++;
        const sl = cum[k] - cum[k - 1], f = sl > 1e-9 ? Math.min(1, Math.max(0, (d - cum[k - 1]) / sl)) : 0;
        const dx = xy[k * 2] - xy[(k - 1) * 2], dz = xy[k * 2 + 1] - xy[(k - 1) * 2 + 1], dl = Math.sqrt(dx * dx + dz * dz) || 1;
        const j = this.nearCore(o, xy[(k - 1) * 2] + dx * f, xy[(k - 1) * 2 + 1] + dz * f, dx / dl, dz / dl, kd, q);
        if (j < 0) { if (++miss > (1 - T_COVER) * N) break; continue; }
        covered++;
        if (!cnt[j]) touched.push(j);
        cnt[j]++; sum[j] += q[1];
        if (first < 0) { first = j; firstAt = q[0] - d; firstD = d; }
      }
      let J = -1, JA = 0;
      if (covered >= T_COVER * N) {
        // the copy's start must lie on the twin (the car enters the twin there: <= T_ENTRY m off)
        const sx = xy[a * 2], sz = xy[a * 2 + 1], P = this._tp || (this._tp = new Float64Array(4));
        const ok = (j, at) => {
          if (sum[j] / cnt[j] > T_MEAN_LANE) return false;
          if (at < 0) at = 0; else if (at > o.len[j]) at = o.len[j];
          this.pointOf(o, j, at, P);
          if ((P[0] - sx) ** 2 + (P[1] - sz) ** 2 > T_ENTRY * T_ENTRY) return false;
          J = j; JA = at; return true;
        };
        // a lane piece: the one under most of the copy, else the one under its start (the copy may start part-way
        // along the twin, or run past its end: the car goes on along the neighbour's own graph)
        let M = -1;
        for (const j of touched) if (M < 0 || cnt[j] > cnt[M]) M = j;
        // (the lane under the start only when it also carries the copy as far as it reaches: >= T_COVER of those samples)
        if (!ok(M, this.alongOf(o, M, sx, sz)) && first >= 0 && first !== M && firstD <= 8) {
          const reach = Math.min(L, o.len[first] - Math.max(0, firstAt));
          if (cnt[first] >= T_COVER * (1 + (reach / L) * (N - 1))) ok(first, firstAt);
        }
      }
      for (const j of touched) { cnt[j] = 0; sum[j] = 0; }
      if (J >= 0) { g.twin[i] = (o.slot << 16) | J; g.twinAt[i] = JA; }
    }
  }
  /** twinlink: o's core connector starting and ending within T_ENTRY of connector i of g, the same shape (points at
   *  the same fractions of their lengths within T_MEAN on average, so a U-turn or a mirrored turn never matches): the
   *  closest, or -1 */
  connTwin(g, i, o) {
    const a = g.off[i], e = g.off[i + 1], sx = g.xy[a * 2], sz = g.xy[a * 2 + 1], ex = g.xy[(e - 1) * 2], ez = g.xy[(e - 1) * 2 + 1];
    const P = this._tp || (this._tp = new Float64Array(4)), Q = this._tq2 || (this._tq2 = new Float64Array(4)), E2 = T_ENTRY * T_ENTRY;
    const ci = Math.floor(sx / CELL), cj = Math.floor(sz / CELL);
    let best = -1, bm = T_MEAN;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const list = o.startHash.get(key(ci + di, cj + dj));
      if (!list) continue;
      for (const j of list) {
        if (!o.core[j] || !o.kind[j]) continue;
        const c = o.off[j], f = o.off[j + 1];
        if ((o.xy[c * 2] - sx) ** 2 + (o.xy[c * 2 + 1] - sz) ** 2 > E2) continue;
        if ((o.xy[(f - 1) * 2] - ex) ** 2 + (o.xy[(f - 1) * 2 + 1] - ez) ** 2 > E2) continue;
        let m = 0;
        for (let s = 0; s <= 8; s++) {
          this.pointOf(g, i, (g.len[i] * s) / 8, P); this.pointOf(o, j, (o.len[j] * s) / 8, Q);
          m += Math.sqrt((P[0] - Q[0]) ** 2 + (P[1] - Q[1]) ** 2) / 9;
        }
        if (m < bm) { bm = m; best = j; }
      }
    }
    return best;
  }
  /** the nearest core segment of o (kind kd, heading within acos(T_DOT) of (hx, hz)) within T_LAT of (x, z): its
   *  path (or -1); q[0] = distance along it, q[1] = lateral distance */
  nearCore(o, x, z, hx, hz, kd, q) {
    let best = -1, bd = T_LAT * T_LAT;
    // (T_LAT <= CELL / 2: the point's cell and its neighbours on the nearer side hold every segment within T_LAT)
    const fx = x / CELL, fz = z / CELL, ci = Math.floor(fx), cj = Math.floor(fz), oxy = o.xy;
    const si = fx - ci < 0.5 ? -1 : 1, sj = fz - cj < 0.5 ? -1 : 1;
    for (let u = 0; u < 4; u++) {
      const list = o.segHash.get(key(ci + (u & 1 ? si : 0), cj + (u & 2 ? sj : 0)));
      if (!list) continue;
      for (let n = 0; n < list.length; n += 2) {
        const j = list[n];
        if (!o.core[j] || o.kind[j] !== kd) continue;
        const kk = list[n + 1], ax = oxy[kk * 2], az = oxy[kk * 2 + 1], dx = oxy[kk * 2 + 2] - ax, dz = oxy[kk * 2 + 3] - az;
        const L2 = dx * dx + dz * dz;
        if (L2 < 1e-9) continue;
        const Ls = Math.sqrt(L2);
        if ((dx * hx + dz * hz) / Ls < T_DOT) continue;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
        const px = ax + dx * t - x, pz = az + dz * t - z, d2 = px * px + pz * pz;
        if (d2 >= bd) continue;
        bd = d2; best = j; q[0] = o.cum[kk] + t * Ls;
      }
    }
    if (best >= 0) q[1] = Math.sqrt(bd);
    return best;
  }
  /** distance along path i of graph g of the point nearest (x, z). No allocation. */
  alongOf(g, i, x, z) {
    const xy = g.xy;
    let bd = Infinity, at = 0;
    for (let k = g.off[i]; k < g.off[i + 1] - 1; k++) {
      const ax = xy[k * 2], az = xy[k * 2 + 1], dx = xy[k * 2 + 2] - ax, dz = xy[k * 2 + 3] - az, L2 = dx * dx + dz * dz;
      const t = L2 > 1e-12 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0;
      const px = ax + dx * t - x, pz = az + dz * t - z, d2 = px * px + pz * pz;
      if (d2 < bd) { bd = d2; at = g.cum[k] + t * Math.sqrt(L2); }
    }
    return at;
  }
  /** the sim's handover: where a car at (x, z) enters path gid (a twin: near its twinAt, the copy's start) */
  alongNear(gid, x, z) { return this.alongOf(this.slots[gid >>> 16], gid & 0xffff, x, z); }
  /** the link of before (?twinlink=old): start within 3 m, same heading, similar length */
  linkOld(g, o) {
    const b = o.bounds;
    for (let i = 0; i < g.paths; i++) {
      if (g.core[i] || g.twin[i] >= 0) continue;
      const a = g.off[i], e = g.off[i + 1], mid = this.midOf(g, i);
      if (mid[0] < b.x0 || mid[0] >= b.x1 || mid[1] < b.z0 || mid[1] >= b.z1) continue;
      const sx = g.xy[a * 2], sz = g.xy[a * 2 + 1];
      let hx = g.xy[a * 2 + 2] - sx, hz = g.xy[a * 2 + 3] - sz; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
      let best = -1, bd = 9;
      const ci = Math.floor(sx / CELL), cj = Math.floor(sz / CELL);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const list = o.startHash.get(key(ci + di, cj + dj));
        if (!list) continue;
        for (const j of list) {
          if (!o.core[j] || o.kind[j] !== g.kind[i]) continue;
          const c = o.off[j], ox = o.xy[c * 2], oz = o.xy[c * 2 + 1];
          const d2 = (ox - sx) ** 2 + (oz - sz) ** 2;
          if (d2 >= bd) continue;
          let qx = o.xy[c * 2 + 2] - ox, qz = o.xy[c * 2 + 3] - oz; const ql = Math.hypot(qx, qz) || 1;
          if ((qx * hx + qz * hz) / ql < 0.9) continue;
          if (Math.abs(o.len[j] - g.len[i]) > Math.max(6, g.len[i] * 0.35)) continue;
          bd = d2; best = j;
        }
      }
      if (best >= 0) g.twin[i] = (o.slot << 16) | best;
      void e;
    }
  }
  midOf(g, i) {
    const a = g.off[i], e = g.off[i + 1], half = g.len[i] / 2;
    let k = a + 1;
    while (k < e - 1 && g.cum[k] < half) k++;
    const s = g.cum[k] - g.cum[k - 1], f = s > 1e-9 ? (half - g.cum[k - 1]) / s : 0;
    return [g.xy[(k - 1) * 2] + (g.xy[k * 2] - g.xy[(k - 1) * 2]) * f, g.xy[(k - 1) * 2 + 1] + (g.xy[k * 2 + 1] - g.xy[(k - 1) * 2 + 1]) * f];
  }
  g(gid) { return this.slots[gid >>> 16]; }
  len(gid) { return this.slots[gid >>> 16].len[gid & 0xffff]; }
  /** Point + unit tangent at distance d along path gid into out[0..3] (d clamped). No allocation. */
  point(gid, d, out) { return this.pointOf(this.slots[gid >>> 16], gid & 0xffff, d, out); }
  pointOf(g, i, d, out) {
    const a = g.off[i], e = g.off[i + 1], cum = g.cum, xy = g.xy;
    if (d <= 0) d = 0; else if (d > g.len[i]) d = g.len[i];
    let lo = a, hi = e - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const s = cum[hi] - cum[lo], f = s > 1e-9 ? (d - cum[lo]) / s : 0;
    const tx = xy[hi * 2] - xy[lo * 2], tz = xy[hi * 2 + 1] - xy[lo * 2 + 1], tl = Math.sqrt(tx * tx + tz * tz) || 1;
    out[0] = xy[lo * 2] + tx * f; out[1] = xy[lo * 2 + 1] + tz * f; out[2] = tx / tl; out[3] = tz / tl;
    return out;
  }
  /**
   * Every path segment within `lat` of (x, z): cb(gid, along, lateral, tx, tz). Walks the 3x3 cells round the point
   * (lat <= 8 m). Duplicates (a segment in several cells) are reported once per path: the nearest.
   */
  project(x, z, lat, cb) {
    const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
    for (const g of this.slots) {
      if (!g) continue;
      const b = g.bounds;
      if (x < b.x0 - 170 || x > b.x1 + 170 || z < b.z0 - 170 || z > b.z1 + 170) continue;
      g.stamp++;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const list = g.segHash.get(key(ci + di, cj + dj));
        if (!list) continue;
        for (let n = 0; n < list.length; n += 2) {
          const i = list[n], k = list[n + 1];
          const ax = g.xy[k * 2], az = g.xy[k * 2 + 1], dx = g.xy[k * 2 + 2] - ax, dz = g.xy[k * 2 + 3] - az;
          const L2 = dx * dx + dz * dz;
          if (L2 < 1e-9) continue;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
          const px = ax + dx * t - x, pz = az + dz * t - z, lat2 = px * px + pz * pz;
          if (lat2 > lat * lat) continue;
          const L = Math.sqrt(L2);
          cb((g.slot << 16) | i, g.cum[k] + t * L, Math.sqrt(lat2), dx / L, dz / L);
        }
      }
    }
  }
}
