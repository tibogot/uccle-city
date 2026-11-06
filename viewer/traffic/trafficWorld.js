// THE LANE GRAPHS OF THE LOADED TILES, as one network for the traffic (viewer/traffic/trafficSim.js).
// Each tile's graph (trafficGraph.js, from the tile worker) keeps its own arrays; a path is addressed by a global id
// gid = slot << 16 | local index. Every tile's graph also holds a 150 m buffer of its neighbours' roads (so its
// junctions are whole): a buffer copy (core = 0) gets a TWIN, the neighbour's own copy of the same lane piece
// (start within 3 m, same heading), when that neighbour is loaded; the sim takes the twin whenever it picks a next
// path, so a car crossing a tile border moves onto the tile that owns the road there (a small lateral difference
// between the two copies is blended out over a second, trafficSim.js handover).
// A spatial hash of every segment (8 m cells) projects obstacles (the player's car, the walker, trams) onto lanes.

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
    for (const o of this.tiles) for (let i = 0; i < o.paths; i++) if (o.twin[i] >= 0 && o.twin[i] >>> 16 === g.slot) o.twin[i] = -1;
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
  point(gid, d, out) {
    const g = this.slots[gid >>> 16], i = gid & 0xffff, a = g.off[i], e = g.off[i + 1], cum = g.cum, xy = g.xy;
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
