// THE CITY'S WALK GRAPH ON THE MAIN THREAD (claude/peds2, rule peds-walk-graph): each full tile's packed graph (the tile
// worker's viewer/pedestrians/walkGraph.js) turned into the node / edge objects the pedestrian sim walks (the lab's
// Graph layout: viewer/pedestrians/sim.js), joined to the loaded neighbours at the tile edges, and cleared of what the
// tile DRAWS on the main thread only (the drive colliders after viewer/drive/driveMode.js tileDrive: benches, bins,
// bike racks, poles, signs, lamps, parked cars, garden walls / hedges): an edge whose walking band meets one is bent
// round it (a node moved across the line), or closed when the sidewalk has no room. The work is sliced (<= SLICE ms
// a slice, one slice a frame: no main-thread spike when a tile streams in). Benches become seats (two "pause" nodes
// in front of each, off the nearest line).
import { gather } from "../drive/colliders.js";
import { EK_NAME, NK, PLACE } from "./walkGraph.js";

const SLICE = 2.0;                 // ms of main-thread work per slice
const BODY = 0.3;                  // m: a walker's radius
const TWIN_R = 2.6;                // m: border nodes of two tiles this close are joined
const KIND = ["walk", "path", "cross", "zebra", "platform", "walk", "path", "walk"];   // EK -> the sim's edge kinds
// drive collider kinds the worker did not know (viewer/drive/colliders.js KIND): lamp 3, post 4, car 6, furniture 7,
// hedge 8, hedge wall 9; + the trees (2), the worker had them in its raster but the main set has the drawn ones
const MAIN_KINDS = new Uint8Array(16); for (const k of [2, 3, 4, 6, 7, 8, 9]) MAIN_KINDS[k] = 1;
const yieldFrame = () => new Promise((r) => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => r()) : setTimeout(r, 0)));

export class CityGraph {
  constructor() {
    this.nodes = []; this.edges = [];
    this.tiles = new Map();          // name -> { nodes, edges, borders, boards, walk: [edges people spawn on], len, ready }
    this.version = 0;                // bumped when the graph changes (the sim's caches)
    this.stats = { tiles: 0, nodes: 0, edges: 0, twins: 0, bent: 0, closed: 0, seats: 0, ms: 0, slices: 0, worstSlice: 0 };
    this._out = [];
  }
  node(x, z, kind = "walk", extra = null) {
    const n = { id: this.nodes.length, x, z, kind, edges: [], tile: null, dead: false, sit: null, face: null, pause: 0, minT: 3, maxT: 15, spread: 1, taken: null, board: null };
    if (extra) Object.assign(n, extra);
    this.nodes.push(n); return n;
  }
  edge(a, b, kind, width, extra = null) {
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1e-3;
    const e = { id: this.edges.length, a, b, kind, k: 0, len, ux: dx / len, uz: dz / len, width, signal: null, place: 0, weight: 1, tile: null, dead: false };
    if (extra) Object.assign(e, extra);
    this.edges.push(e); a.edges.push(e); b.edges.push(e); return e;
  }
  _kill(e) {
    if (e.dead) return; e.dead = true;
    for (const n of [e.a, e.b]) { const i = n.edges.indexOf(e); if (i >= 0) n.edges.splice(i, 1); }
  }
  _split(e, x, z, kind = "walk") {
    const m = this.node(x, z, kind); m.tile = e.tile;
    const T = this.tiles.get(e.tile);
    const e1 = this.edge(e.a, m, e.kind, e.width, { k: e.k, signal: e.signal, place: e.place, tile: e.tile });
    const e2 = this.edge(m, e.b, e.kind, e.width, { k: e.k, signal: e.signal, place: e.place, tile: e.tile });
    this._kill(e);
    if (T) { T.nodes.push(m); T.edges.push(e1, e2); }
    return m;
  }

  /**
   * Add a tile (async, sliced). packed: the worker's walk graph; col: the tile's drive colliders (main set);
   * benches: the drawn benches [{ x, z, yaw }] (data/furniture, snapped); ground(x, z).
   */
  async addTile(name, packed, { col = null, grid = null, benches = [], live = () => true } = {}) {
    if (!packed || this.tiles.has(name)) return null;
    const t0 = performance.now(), st = this.stats;
    const T = { name, nodes: [], edges: [], borders: [], boards: [], walk: [], len: 0, ready: false };
    this.tiles.set(name, T);
    let sliceT = performance.now();
    const slice = async (lbl = "") => {
      const dt = performance.now() - sliceT;
      if (dt < SLICE) return true;
      if (dt > st.worstSlice) { st.worstSlice = dt; st.worstAt = lbl; }
      st.slices++;
      await yieldFrame(); sliceT = performance.now();
      return live() && this.tiles.get(name) === T;
    };
    const P = packed, N = P.x.length, map = new Array(N);
    const NKN = ["walk", "kerb", "border", "board", "walk", "walk", "pause"];
    for (let i = 0; i < N; i++) {
      const k = P.nk[i], n = this.node(P.x[i], P.z[i], NKN[k] || "walk");
      n.tile = name;
      if (k === NK.pause) { n.pause = 0.25; n.minT = 2; n.maxT = 9; n.spread = 1.5; }          // a square's lattice pauses
      if (k === NK.border) T.borders.push(n);
      map[i] = n; T.nodes.push(n);
      if ((i & 255) === 255 && !(await slice("nodes"))) return null;
    }
    for (let m = 0; m < P.ea.length; m++) {
      const k = P.ek[m], a = map[P.ea[m]], b = map[P.eb[m]];
      const e = this.edge(a, b, KIND[k], P.ew[m], { k, place: P.place[m], tile: name });
      if (P.ep[m] >= 0) e.signal = P.ep[m];
      if (k === 7) e.weight = 0.6;                       // (links: less taken than the line they join)
      T.edges.push(e);
      if ((m & 255) === 255 && !(await slice("edges"))) return null;
    }
    for (let k = 0; k < P.boards.length; k += 4) {
      const n = map[P.boards[k]]; if (!n) continue;
      n.kind = "board"; n.board = { ux: P.boards[k + 1], uz: P.boards[k + 2], len: P.boards[k + 3] };
      n.spreadX = 1.2; n.spreadZ = Math.max(4, P.boards[k + 3] * 0.6); n.face = 0;
      T.boards.push(n);
    }
    // the drawn furniture / cars / lamps the worker did not know: bend or close the edges whose band meets one
    if (!(await slice("boards"))) return null;
    if (col) await this._clear(T, col, slice, grid);
    if (!(await slice("clear"))) return null;
    // benches: two seats each, in front, off the nearest line within 6 m
    for (const b of benches) {
      const cs = Math.cos(b.yaw), sn = Math.sin(b.yaw);
      // (viewer/furniture2: local x along the kerb, +z the road side; the sitter faces +z)
      const fx = sn, fz = cs;
      let best = null, bd = 36;
      for (const e of T.edges) {
        if (e.dead || e.kind === "cross" || e.kind === "zebra") continue;
        const t = Math.max(0, Math.min(e.len, (b.x - e.a.x) * e.ux + (b.z - e.a.z) * e.uz)), qx = e.a.x + e.ux * t, qz = e.a.z + e.uz * t, d = (qx - b.x) ** 2 + (qz - b.z) ** 2;
        if (d < bd) { bd = d; best = { e, t, x: qx, z: qz }; }
      }
      if (!best) continue;
      const L = best.t < 0.5 ? best.e.a : best.t > best.e.len - 0.5 ? best.e.b : this._split(best.e, best.x, best.z);
      for (const sx of [-0.45, 0.45]) {
        const x = b.x + cs * sx + fx * 0.42, z = b.z - sn * sx + fz * 0.42;
        const s = this.node(x, z, "pause", { pause: 0.5, minT: 20, maxT: 90, face: Math.atan2(fx, fz), sit: "sit", tile: name });
        T.nodes.push(s);
        T.edges.push(this.edge(L, s, "walk", 1.0, { k: 0, weight: 0.35, tile: name }));
        st.seats++;
      }
      if (!(await slice("bench"))) return null;
    }
    // twins: a border node and a loaded neighbour's border node within TWIN_R: one link edge
    for (const n of T.borders) {
      let best = null, bd = TWIN_R * TWIN_R;
      for (const [o, U] of this.tiles) {
        if (o === name || !U.ready) continue;
        for (const q of U.borders) { if (q.dead) continue; const d = (q.x - n.x) ** 2 + (q.z - n.z) ** 2; if (d < bd) { bd = d; best = q; } }
      }
      if (best) { const e = this.edge(n, best, "walk", 1.2, { k: 7, tile: name, twin: true }); T.edges.push(e); this.tiles.get(best.tile)?.edges.push(e); st.twins++; continue; }
      this._stubLink(n, name);
      if (!(await slice("twin"))) return null;
    }
    // the neighbours' border nodes with no twin yet (a crossing's end stub over the edge): onto this tile's lines
    for (const [o, U] of this.tiles) if (o !== name && U.ready) for (const q of U.borders) if (!q.dead && q.edges.length === 1) { this._stubLink(q, name); if (!(await slice("stub"))) return null; }
    // the edges people may be placed on (not crossings / seats)
    for (const e of T.edges) if (!e.dead && e.kind !== "cross" && e.kind !== "zebra" && !e.b.sit && !e.a.sit) { T.walk.push(e); T.len += e.len; }
    T.ready = true; T.readyAt = performance.now();
    st.tiles = this.tiles.size; st.nodes = this.nodes.length; st.edges = this.edges.length;
    st.ms += performance.now() - t0;
    this.version++;
    return T;
  }

  /** a border node with no twin: onto the nearest walking edge of tile `name` within TWIN_R (split there) */
  _stubLink(n, name) {
    const T = this.tiles.get(name); if (!T || n.edges.length !== 1) return;
    let best = null, bd = TWIN_R * TWIN_R;
    for (const e of T.edges) {
      if (e.dead || e.kind === "cross" || e.kind === "zebra" || e.a === n || e.b === n) continue;
      const t = Math.max(0, Math.min(e.len, (n.x - e.a.x) * e.ux + (n.z - e.a.z) * e.uz)), qx = e.a.x + e.ux * t, qz = e.a.z + e.uz * t, d = (qx - n.x) ** 2 + (qz - n.z) ** 2;
      if (d < bd) { bd = d; best = { e, t, x: qx, z: qz }; }
    }
    if (!best) return;
    const m = best.t < 0.4 ? best.e.a : best.t > best.e.len - 0.4 ? best.e.b : this._split(best.e, best.x, best.z);
    const e = this.edge(n, m, "walk", 1.2, { k: 7, tile: name, twin: true }); T.edges.push(e); this.stats.twins++;
  }
  /** the tile's edges against the drawn items of the main collider set: bend round, or close */
  async _clear(T, col, slice, grid = null) {
    // (x, z) on the drawn sidewalk / square / path / ramp of the tile's class raster (class + 1: 5, 6, 8, 9)
    const onWalk = grid ? (x, z) => { const i = Math.floor((x - grid.x0) / grid.step), j = Math.floor((z - grid.z0) / grid.step); if (i < 0 || j < 0 || i >= grid.nx || j >= grid.nz) return true; const c = grid.data[j * grid.nx + i]; return c === 5 || c === 6 || c === 8 || c === 9; } : null;
    const out = this._out, st = this.stats;
    let lastKind = -1;
    const hit = (x, z, r) => {
      out.length = 0; gather(col, x, z, r + 1.5, out);
      for (let k = 0; k < out.length; k++) {
        const id = out[k];
        if (id < col.P) {
          if (!MAIN_KINDS[col.pkind[id]]) continue;
          if (pointNearPoly(col, id, x, z, r)) { lastKind = col.pkind[id]; return true; }
        } else {
          const c = id - col.P; if (!MAIN_KINDS[col.ckind[c]]) continue;
          const q = c * 3, dx = x - col.circ[q], dz = z - col.circ[q + 1], rr = col.circ[q + 2] + r;
          if (dx * dx + dz * dz < rr * rr) { lastKind = col.ckind[c]; return true; }
        }
      }
      return false;
    };
    const list = T.edges.slice();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || e.kind === "cross" || e.kind === "zebra" || e.k === 7 && e.twin) continue;
      // the samples on the line that meet something
      const n = Math.max(1, Math.ceil(e.len / 0.5));
      let first = -1, last = -1;
      for (let s = 0; s <= n; s++) { const t = (s / n) * e.len; if (hit(e.a.x + e.ux * t, e.a.z + e.uz * t, BODY)) { if (first < 0) first = s; last = s; } }
      if (first >= 0) {
        // bend: a detour parallel to the line past the blocked stretch [t0, t1] (two nodes, 0.6 m before / after it),
        // 0.3-2.2 m to either side, on the drawn sidewalk (the tile's class raster) and clear at a walker's width
        const t0 = Math.max(0, (first / n) * e.len - 0.6), t1 = Math.min(e.len, (last / n) * e.len + 0.6), ox = -e.uz, oz = e.ux;
        const mx = e.a.x + e.ux * (t0 + t1) / 2, mz = e.a.z + e.uz * (t0 + t1) / 2;
        let done = false;
        for (let d = 0.3; d <= 2.21 && !done; d += 0.25) for (const sg of [1, -1]) {
          const x0 = e.a.x + e.ux * t0 + ox * d * sg, z0 = e.a.z + e.uz * t0 + oz * d * sg, x1 = e.a.x + e.ux * t1 + ox * d * sg, z1 = e.a.z + e.uz * t1 + oz * d * sg;
          if (onWalk && (!onWalk(x0, z0) || !onWalk(x1, z1) || !onWalk((x0 + x1) / 2, (z0 + z1) / 2))) continue;
          if (hit(x0, z0, BODY) || hit(x1, z1, BODY) || segHit(hit, e.a.x, e.a.z, x0, z0) || segHit(hit, x0, z0, x1, z1) || segHit(hit, x1, z1, e.b.x, e.b.z)) continue;
          const m0 = this._split(e, x0, z0), e2 = m0.edges.find((f) => f.a === m0 && !f.dead);
          if (e2) { const m1 = this._split(e2, x1, z1); for (const f of m1.edges) f.width = Math.min(f.width, 1.0); }
          for (const f of m0.edges) f.width = Math.min(f.width, 1.0);
          st.bent++; done = true; break;
        }
        // no room at a walker's width: a squeeze past (0.12 m body: the line only grazes it), else closed
        if (!done && !segHit(hit, e.a.x, e.a.z, e.b.x, e.b.z, 0.12) && !hit(e.a.x, e.a.z, 0.12) && !hit(e.b.x, e.b.z, 0.12)) { e.width = Math.min(e.width, 0.8); st.squeezed = (st.squeezed || 0) + 1; done = true; }
        if (!done) { hit(mx, mz, BODY); (st.closedBy ||= {})[lastKind] = (st.closedBy[lastKind] || 0) + 1; if ((st.closedAt ||= []).length < 200) st.closedAt.push([Math.round(mx), Math.round(mz), lastKind]); this._kill(e); st.closed++; }
      }
      if (!(await slice("clearEdge"))) return;
    }
  }

  removeTile(name) {
    const T = this.tiles.get(name);
    if (!T) return;
    this.tiles.delete(name);
    for (const e of T.edges) this._kill(e);
    for (const n of T.nodes) n.dead = true;
    for (const n of T.borders) n.dead = true;
    // (the arrays keep their holes: ids stay stable; compact when most of it is dead)
    let dead = 0; for (const n of this.nodes) if (n.dead) dead++;
    if (dead > 20000 && dead > this.nodes.length * 0.6) this._compact();
    this.stats.tiles = this.tiles.size;
    this.version++;
  }
  _compact() {
    this.nodes = this.nodes.filter((n) => !n.dead); this.nodes.forEach((n, i) => { n.id = i; });
    this.edges = this.edges.filter((e) => !e.dead); this.edges.forEach((e, i) => { e.id = i; });
  }
}

function segHit(hit, ax, az, bx, bz, r = BODY) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.4));
  for (let s = 1; s < n; s++) { const t = s / n; if (hit(ax + (bx - ax) * t, az + (bz - az) * t, r)) return true; }
  return false;
}
/** (x, z) inside polygon `id` of a collider set, or within r of its outline */
function pointNearPoly(col, id, x, z, r) {
  const q = id * 4;
  if (col.pbox[q] > x + r || col.pbox[q + 2] < x - r || col.pbox[q + 1] > z + r || col.pbox[q + 3] < z - r) return false;
  let ins = false, d2 = Infinity;
  for (let rg = col.polyRing[id]; rg < col.polyRing[id + 1]; rg++) {
    const s = col.ringStart[rg], e = col.ringStart[rg + 1];
    for (let i = s, j = e - 1; i < e; j = i++) {
      const xi = col.pts[i * 2], zi = col.pts[i * 2 + 1], xj = col.pts[j * 2], zj = col.pts[j * 2 + 1];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins;
      const dx = xj - xi, dz = zj - zi, L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - xi) * dx + (z - zi) * dz) / L2));
      const ex = xi + dx * t - x, ez = zi + dz * t - z; d2 = Math.min(d2, ex * ex + ez * ez);
    }
  }
  return ins || d2 < r * r;
}

export { EK_NAME, PLACE };
