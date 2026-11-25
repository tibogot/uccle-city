// THE CITY WALK GRAPH (claude/peds2, phase P2 of docs/PEDESTRIANS_RESEARCH.md 3.4; rules peds-walk-graph,
// peds-crossings-only). Built in the tile worker per tile, like the traffic lanes (viewer/tileData.js step "walk graph"),
// from what the city DRAWS and its data, never from a guess:
//   sidewalks   the street model's measured kerbs (viewer/street/model.js segments: axis, normal, kerbL / kerbR per 1 m
//               station) marched outward through the UrbIS class raster (surfaces.js grid: sidewalk / ramp / square /
//               path): one walking line in the middle of the drawn sidewalk band, its width = the band's; stations
//               inside a junction polygon are left out (the corners join the lines instead)
//   corners     free line ends joined round the kerb corner (the two lines' meeting point) or straight, only over
//               walkable ground (never the carriageway, never a building)
//   crossings   the drawn ones (road inventory: Brussels Mobility / Topo / OSM, the zebras the city paints) kerb to kerb;
//               signalled when a node of the signal phase table (viewer/traffic/signals.js) is within SIG_R m: the edge
//               keeps the phase of the crossed road (pedestrians walk while it has red: walkState), else a zebra
//   paths       OSM footway / path / steps / pedestrian lines off the sidewalks (parks, the footbridges, passages),
//               cut where they meet a carriageway or a building
//   platforms   the tram platforms (feats.lines platform + tram=yes): a platform line with a boarding node
//   squares     the UrbIS square class (Place de Saint-Job ...): a 5 m lattice of nodes over its clear cells
// Obstacles: a 0.5 m raster of the worker's colliders (the drawn walls at body height, raised islands, walls, the
// trees' trunks) + the surveyed bollards; a walking line is moved off them across its band. The main thread adds the
// furniture it draws (benches, bins, poles, signs, lamps, parked cars: viewer/pedestrians/cityGraph.js).
// Plain JS, no three.js: runs in the tile worker and in node (tools/audit/pedsAudit.mjs builds the same bytes).
import { signalPhases } from "../traffic/signals.js";

export const WALK_VERSION = 1;
export const EK = { walk: 0, path: 1, cross: 2, zebra: 3, platform: 4, square: 5, steps: 6, link: 7 };
export const EK_NAME = ["walk", "path", "cross", "zebra", "platform", "square", "steps", "link"];
export const NK = { walk: 0, kerb: 1, border: 2, board: 3, square: 4, path: 5, pause: 6 };
export const PLACE = { home: 0, shop: 1, transit: 2, park: 3, square: 4 };
export const PLACE_NAME = ["home", "shop", "transit", "park", "square"];
// UrbIS classes (pipeline/build_surfaces.py, viewer/surfaces.js SURF_CLASS) as stored in the grid (class + 1)
const C = { none: 0, roadway: 1, tramRoad: 2, tramSite: 3, parking: 4, square: 5, sidewalk: 6, median: 7, path: 8, ramp: 9, pit: 10 };
const SIDE = new Uint8Array(11); SIDE[C.sidewalk] = SIDE[C.ramp] = SIDE[C.square] = SIDE[C.path] = 1;
const CARRIAGE = new Uint8Array(11); CARRIAGE[C.roadway] = CARRIAGE[C.tramRoad] = CARRIAGE[C.tramSite] = CARRIAGE[C.parking] = CARRIAGE[C.median] = 1;
const RAST = 0.5;                       // m: the obstacle raster
const BODY = 0.3;                       // m: a walker's radius (obstacles grown by it)
const SPUR = 3.5;                       // m: skeleton spurs shorter than this are pruned (raster notches, kerb bollards)
const DP_TOL = 0.3, MAX_EDGE = 10;      // m: line simplification, the longest edge
const JOIN_R = 15, LINK_R = 6;          // m: corner joins between free ends / a free end onto any line
const SNAP_R = 4.5;                     // m: a crossing end snaps onto a line this near
const SIG_R = 35;                       // m: a crossing this near a signal node is signalled
const LATTICE = 5;                      // m: square lattice spacing
const STEP_PATH = 2;                    // m: path resampling
const KEEP_COMP = 25;                   // m: a connected piece shorter than this in total is dropped

/**
 * @param o { bounds, model: net.streetModel, grid: surfaceData.grid, roofs (roof grid), col (drive colliders),
 *            crossings: inventory.crossings, roads (roads.json), feats, bollards (xyz triples), seed }
 * @returns packed plain data (typed arrays, transferable) + stats, or null without a street model / raster
 */
export function buildWalkGraph(o) {
  const t0 = (globalThis.performance ?? Date).now();
  const { bounds: B, model, grid: G } = o;
  if (!G) return null;
  const inTile = (x, z) => x >= B.x0 && x < B.x1 && z >= B.z0 && z < B.z1;
  const cls = (x, z) => { const i = Math.floor((x - G.x0) / G.step), j = Math.floor((z - G.z0) / G.step); return i >= 0 && j >= 0 && i < G.nx && j < G.nz ? G.data[j * G.nx + i] : 0; };
  const now = () => (globalThis.performance ?? Date).now(), T = {}; let tl = now(); const lap = (k) => { const t = now(); T[k] = Math.round(t - tl); tl = t; };
  const R = blockedRaster(o, B);
  lap("raster");
  const post = (x, z) => { const i = Math.floor((x - B.x0) / RAST), j = Math.floor((z - B.z0) / RAST); return i >= 0 && j >= 0 && i < R.nx && j < R.nz && R.data[j * R.nx + i] === 2; };
  const blocked = (x, z) => { const i = Math.floor((x - B.x0) / RAST), j = Math.floor((z - B.z0) / RAST); return i < 0 || j < 0 || i >= R.nx || j >= R.nz ? false : R.data[j * R.nx + i] !== 0; };
  const roofs = o.roofs, onRoof = (x, z) => { if (!roofs) return false; const i = Math.floor((x - roofs.x0) / roofs.step), j = Math.floor((z - roofs.z0) / roofs.step); return i >= 0 && j >= 0 && i < roofs.nx && j < roofs.nz && roofs.data[j * roofs.nx + i] > 0; };
  // walkable for a connector / a path sample: not the carriageway, not a solid; `open` also allows unmeasured ground
  const walkable = (x, z, open) => { const c = cls(x, z); if (CARRIAGE[c] || c === C.pit) return false; if (blocked(x, z)) return false; if (SIDE[c]) return true; return open && c === 0 && !onRoof(x, z); };
  const clearSeg = (ax, az, bx, bz, open) => { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.4)); for (let k = 0; k <= n; k++) { const t = k / n; if (!walkable(ax + (bx - ax) * t, az + (bz - az) * t, open)) return false; } return true; };

  // ---------------------------------------------------------------- graph under construction
  const nx = [], nz = [], nk = [], nw = [];       // nodes: x, z, kind, flags (1 border)
  const E = [];                                   // edges: { a, b, k, w, ph, dead }
  const adj = [];                                 // node -> edge ids
  const node = (x, z, k = NK.walk) => { nx.push(x); nz.push(z); nk.push(k); nw.push(0); adj.push([]); return nx.length - 1; };
  const edge = (a, b, k, w, ph = -1) => { if (a === b) return -1; const id = E.length; E.push({ a, b, k, w, ph, dead: false }); adj[a].push(id); adj[b].push(id); return id; };
  const skKeys = new Map();                       // skeleton junction / end nodes by position (lines meet there)
  const skNode = (x, z) => { const k = `${Math.round(x * 4)},${Math.round(z * 4)}`; let id = skKeys.get(k); if (id === undefined) { id = node(x, z); skKeys.set(k, id); } return id; };
  // re-simplify every run of plain nodes with exactly two live edges of kind k (skeleton pieces meet at many
  // pseudo-junctions): one polyline per run between real branch points, Douglas-Peucker again
  const collapse = (k) => {
    const deg2 = (n) => nk[n] === NK.walk && adj[n].length === 2 && E[adj[n][0]].k === k && E[adj[n][1]].k === k && !E[adj[n][0]].dead && !E[adj[n][1]].dead;
    const done = new Uint8Array(E.length);
    for (let id0 = 0; id0 < E.length; id0++) {
      const e0 = E[id0]; if (e0.dead || e0.k !== k || done[id0]) continue;
      // walk both ways to the run's ends
      const run = [id0]; done[id0] = 1;
      const ext = (from, via) => { const out = []; let n = from, e = via; while (deg2(n)) { const nx2 = adj[n][0] === e ? adj[n][1] : adj[n][0]; if (done[nx2]) break; done[nx2] = 1; out.push(nx2); e = nx2; const E2 = E[nx2]; n = E2.a === n ? E2.b : E2.a; } return [out, n]; };
      const [fw, endB] = ext(e0.b, id0), [bw, endA] = ext(e0.a, id0);
      const seq = [...bw.reverse(), id0, ...fw];
      if (seq.length < 2) continue;
      const pts = [endA]; let cur = endA;
      for (const id of seq) { const e = E[id]; cur = e.a === cur ? e.b : e.a; pts.push(cur); }
      if (pts[0] === pts[pts.length - 1] && pts.length < 4) continue;
      const P = pts.map((n) => [nx[n], nz[n]]), wmin = seq.map((id) => E[id].w);
      const keep = simplify(P, DP_TOL, MAX_EDGE);
      if (keep.length === pts.length) continue;
      for (const id of seq) { E[id].dead = true; }
      let wi = 0;
      for (let q = 1; q < keep.length; q++) { let w = 9; for (; wi < keep[q]; wi++) w = Math.min(w, wmin[wi]); edge(pts[keep[q - 1]], pts[keep[q]], k, w); }
    }
    for (let n = 0; n < adj.length; n++) adj[n] = adj[n].filter((id) => !E[id].dead);
  };
  const stats = { lines: 0, lineM: 0, droppedRuns: 0, corners: 0, links: 0, crossings: 0, crossingsSignal: 0, crossingsLinked: 0, crossingsUnlinked: 0, paths: 0, pathM: 0, platforms: 0, squareNodes: 0, shifted: 0, onPost: 0, dropComp: 0 };

  // ---------------------------------------------------------------- 1. sidewalk lines: the medial axis of the drawn sidewalks
  // the walkable mask (sidewalk / ramp / path classes of the raster, minus every solid and post), thinned to its medial
  // axis (Zhang-Suen): one line down the middle of each drawn sidewalk, round its corners, round a trunk on both sides;
  // spurs under SPUR m (raster notches) pruned; the width from the mask's distance field
  const ends = [];                                // free line ends { n, dx, dz }: outward direction
  {
    const W = R.nx, H = R.nz, mask = new Uint8Array(W * H);
    // (posts stay in: no loops / cuts round each bollard; the line is moved off them below)
    const same = G.step === RAST && G.x0 === B.x0 && G.z0 === B.z0 && G.nx === W && G.nz === H;     // (the class raster IS this grid)
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, c = same ? G.data[k] : cls(B.x0 + (i + 0.5) * RAST, B.z0 + (j + 0.5) * RAST);
      if ((c === C.sidewalk || c === C.ramp || c === C.path) && R.data[k] !== 1) mask[k] = 1;
    }
    lap("mask");
    const dist = chamfer(mask, W, H);                 // cells to the mask's edge (x RAST: metres)
    lap("chamfer");
    const sk = thin(mask, W, H);
    lap("thin");
    if (o.debug) { o.debug.mask = mask; o.debug.sk = sk.slice(); }
    const lines = traceSkeleton(sk, W, H, SPUR / RAST);
    lap("trace");
    for (const L of lines) {
      const P = L.map((k) => { const i = k % W, j = (k - i) / W; return [B.x0 + (i + 0.5) * RAST, B.z0 + (j + 0.5) * RAST, Math.max(0.8, 2 * dist[k] * RAST)]; });
      let len = 0; for (let k = 1; k < P.length; k++) len += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]);
      if (P.length < 2 || len < 1) continue;
      smoothRun(P);
      // off the posts (trunks, bollards: raster value 2, grown by the body radius): each point on one moves across the line
      // to the nearest free cell of the sidewalk (its lane narrowed there); kept by the simplification
      const force = new Uint8Array(P.length);
      for (let k = 0; k < P.length; k++) {
        if (!post(P[k][0], P[k][1])) continue;
        const a = P[Math.max(0, k - 2)], b = P[Math.min(P.length - 1, k + 2)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, ox = -dz / L, oz = dx / L;
        let got = false;
        for (let d = 0.25; d <= 1.25 && !got; d += 0.25) for (const sg of [1, -1]) {
          const x = P[k][0] + ox * d * sg, z = P[k][1] + oz * d * sg, ii = Math.floor((x - B.x0) / RAST), jj = Math.floor((z - B.z0) / RAST);
          if (ii < 0 || jj < 0 || ii >= W || jj >= H || !mask[jj * W + ii] || R.data[jj * W + ii]) continue;
          P[k][0] = x; P[k][1] = z; P[k][2] = Math.min(P[k][2], 1.0); force[k] = 1; got = true; stats.shifted++; break;
        }
        if (!got) stats.onPost++;
      }
      const keep = simplify(P, DP_TOL, MAX_EDGE, force);
      const ids = keep.map((k) => skNode(P[k][0], P[k][1]));
      for (let k = 1; k < keep.length; k++) {
        let w = 9; for (let m = keep[k - 1]; m <= keep[k]; m++) w = Math.min(w, P[m][2]);
        edge(ids[k - 1], ids[k], EK.walk, Math.min(4, w));
      }
      stats.lines++; stats.lineM += len;
    }
    collapse(EK.walk);
    // line ends: on the tile's edge a border node (its twin is the neighbour's), else a free end (corner joins below)
    const border = (x, z) => x - B.x0 < 1.6 || B.x1 - x < 1.6 || z - B.z0 < 1.6 || B.z1 - z < 1.6;
    for (const id of skKeys.values()) {
      if (adj[id].length !== 1) continue;
      if (border(nx[id], nz[id])) { nk[id] = NK.border; continue; }
      const e = E[adj[id][0]], o2 = e.a === id ? e.b : e.a, dx = nx[id] - nx[o2], dz = nz[id] - nz[o2], L = Math.hypot(dx, dz) || 1;
      ends.push({ n: id, dx: dx / L, dz: dz / L });
    }
  }

  lap("lines");
  // ---------------------------------------------------------------- 2. paths (OSM footway / path / steps / pedestrian)
  const keyOf = (x, z) => `${Math.round(x * 20)},${Math.round(z * 20)}`;
  const pathKeys = new Map();
  const pathNode = (x, z) => { const k = keyOf(x, z); let id = pathKeys.get(k); if (id === undefined) { id = node(x, z, NK.path); pathKeys.set(k, id); } return id; };
  const PATHS = new Set(["footway", "path", "steps", "pedestrian", "track", "bridleway"]);
  const platformLines = [];
  for (const l of o.feats?.lines || []) {
    if (l.kind === "platform" && (l.tags?.tram === "yes" || l.tags?.railway === "platform") && l.line?.length >= 2) { platformLines.push(l); continue; }
    if (!PATHS.has(l.kind) || !l.line || l.line.length < 2) continue;
    const ft = l.tags?.footway;
    if (ft === "sidewalk" || ft === "crossing" || l.tags?.access === "private" || l.tags?.access === "no") continue;
    const kind = l.kind === "steps" ? EK.steps : EK.path, w = Math.min(3, Math.max(1.2, +l.tags?.width || (l.kind === "track" ? 2.5 : 1.6)));
    // resample between the OSM vertices (kept: shared vertices join lines), keep the samples off carriageway / solids /
    // sidewalks (the sidewalk line covers those), inside the tile
    const S = [];
    for (let k = 1; k < l.line.length; k++) {
      const [ax, az] = l.line[k - 1], [bx, bz] = l.line[k], L = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.ceil(L / STEP_PATH));
      for (let s = k === 1 ? 0 : 1; s <= m; s++) S.push([ax + (bx - ax) * (s / m), az + (bz - az) * (s / m), s === m || (k === 1 && s === 0)]);
    }
    let prev = -1, run = 0;
    for (const [x, z, vert] of S) {
      const c = cls(x, z);
      const good = inTile(x, z) && !CARRIAGE[c] && c !== C.sidewalk && c !== C.pit && !blocked(x, z) && !onRoof(x, z);
      if (!good) { if (prev >= 0 && run === 1) { /* a lone node */ } prev = -1; run = 0; continue; }
      if (!vert && prev >= 0 && run > 0 && !(run % 3 === 0)) { run++; continue; }     // every ~6 m between vertices
      const id = vert ? pathNode(x, z) : node(x, z, NK.path);
      if (prev >= 0) { edge(prev, id, kind, w); stats.pathM += Math.hypot(x - nx[prev], z - nz[prev]); }
      prev = id; run++;
    }
    stats.paths++;
  }

  // ---------------------------------------------------------------- 3. squares: a lattice over the clear square cells
  const sqAt = new Map();
  {
    const i0 = Math.ceil(B.x0 / LATTICE), i1 = Math.floor((B.x1 - 1e-6) / LATTICE), j0 = Math.ceil(B.z0 / LATTICE), j1 = Math.floor((B.z1 - 1e-6) / LATTICE);
    const ok = (x, z) => cls(x, z) === C.square && !blocked(x, z) && !onRoof(x, z) && [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].every(([dx, dz]) => { const c = cls(x + dx, z + dz); return !CARRIAGE[c] && !blocked(x + dx, z + dz); });
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = i * LATTICE, z = j * LATTICE;
      if (!ok(x, z)) continue;
      const h = hash2(i, j), id = node(x + (h - 0.5) * 1.2, z + (hash2(j, i) - 0.5) * 1.2, h < 0.25 ? NK.pause : NK.square);
      sqAt.set(i * 100003 + j, id); stats.squareNodes++;
    }
    for (const [k, id] of sqAt) {
      const i = Math.floor(k / 100003), j = k - i * 100003;
      for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const q = sqAt.get((i + di) * 100003 + (j + dj));
        if (q === undefined) continue;
        if ((di && dj) && hash2(i * 7 + di, j * 13 + dj) < 0.5) continue;      // half the diagonals: less of a grid
        if (clearSeg(nx[id], nz[id], nx[q], nz[q], false)) edge(id, q, EK.square, 3.0);
      }
    }
  }

  // ---------------------------------------------------------------- spatial index over edges (rebuilt as it grows)
  const CELL = 8, eg = new Map();
  const ck = (i, j) => i * 65536 + j;
  const indexEdge = (id) => {
    const e = E[id], ax = nx[e.a], az = nz[e.a], bx = nx[e.b], bz = nz[e.b];
    const i0 = Math.floor(Math.min(ax, bx) / CELL), i1 = Math.floor(Math.max(ax, bx) / CELL), j0 = Math.floor(Math.min(az, bz) / CELL), j1 = Math.floor(Math.max(az, bz) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = ck(i, j); let l = eg.get(k); if (!l) eg.set(k, (l = [])); l.push(id); }
  };
  for (let id = 0; id < E.length; id++) indexEdge(id);
  const nearestOnEdges = (x, z, r, filter) => {
    let best = null, bd = r * r;
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const id of eg.get(ck(i, j)) || []) {
      const e = E[id]; if (e.dead || (filter && !filter(e))) continue;
      const ax = nx[e.a], az = nz[e.a], dx = nx[e.b] - ax, dz = nz[e.b] - az, L2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), qx = ax + dx * t, qz = az + dz * t, d = (qx - x) ** 2 + (qz - z) ** 2;
      if (d < bd) { bd = d; best = { id, t, x: qx, z: qz, d: Math.sqrt(d) }; }
    }
    return best;
  };
  // split edge `id` at parameter t: the new node (or an end within 0.6 m of the split point)
  const splitAt = (h, kind = NK.walk) => {
    const e = E[h.id], L = Math.hypot(nx[e.b] - nx[e.a], nz[e.b] - nz[e.a]);
    if (h.t * L < 0.6) return e.a;
    if ((1 - h.t) * L < 0.6) return e.b;
    const m = node(h.x, h.z, kind);
    e.dead = true;
    const e1 = edge(e.a, m, e.k, e.w, e.ph), e2 = edge(m, e.b, e.k, e.w, e.ph);
    indexEdge(e1); indexEdge(e2);
    return m;
  };
  const live = (n) => { let c = 0; for (const id of adj[n]) if (!E[id].dead) c++; return c; };

  // ---------------------------------------------------------------- 4. corners: free ends joined
  {
    const used = new Uint8Array(ends.length);
    const cands = [];
    for (let a = 0; a < ends.length; a++) for (let b = a + 1; b < ends.length; b++) {
      const A = ends[a], Bq = ends[b];
      const dx = nx[Bq.n] - nx[A.n], dz = nz[Bq.n] - nz[A.n], d = Math.hypot(dx, dz);
      if (d > JOIN_R || d < 0.3) continue;
      // facing each other or round a corner: B not behind A's end, A not behind B's
      if ((dx * A.dx + dz * A.dz) / d < -0.3 || (-dx * Bq.dx - dz * Bq.dz) / d < -0.3) continue;
      cands.push([d, a, b]);
    }
    cands.sort((p, q) => p[0] - q[0]);
    for (const [, a, b] of cands) {
      if (used[a] || used[b]) continue;
      const A = ends[a], Bq = ends[b], ax = nx[A.n], az = nz[A.n], bx = nx[Bq.n], bz = nz[Bq.n];
      // the meeting point of the two lines (round the kerb corner), else straight
      const den = A.dx * Bq.dz - A.dz * Bq.dx;
      let joined = false;
      if (Math.abs(den) > 0.2) {
        const s = ((bx - ax) * Bq.dz - (bz - az) * Bq.dx) / den, u = ((bx - ax) * A.dz - (bz - az) * A.dx) / den;
        if (s > 0.3 && u > 0.3 && s < JOIN_R && u < JOIN_R) {
          const cx = ax + A.dx * s, cz = az + A.dz * s;
          if (clearSeg(ax, az, cx, cz, false) && clearSeg(cx, cz, bx, bz, false)) {
            const m = node(cx, cz);
            indexEdge(edge(A.n, m, EK.walk, 1.2)); indexEdge(edge(m, Bq.n, EK.walk, 1.2)); joined = true;
          }
        }
      }
      if (!joined && clearSeg(ax, az, bx, bz, false)) { indexEdge(edge(A.n, Bq.n, EK.walk, 1.2)); joined = true; }
      if (joined) { used[a] = used[b] = 1; stats.corners++; }
    }
    // the rest: a free end (and every path end) onto the nearest line within LINK_R
    const free = [];
    for (let k = 0; k < ends.length; k++) if (!used[k]) free.push(ends[k].n);
    for (let n = 0; n < nx.length; n++) if (nk[n] === NK.path && live(n) === 1) free.push(n);
    for (const n of free) {
      const self = new Set(adj[n]);
      const h = nearestOnEdges(nx[n], nz[n], LINK_R, (e) => e.a !== n && e.b !== n && !adj[n].some((q) => E[q].a === e.a || E[q].b === e.b || E[q].a === e.b || E[q].b === e.a));
      if (!h || self.has(h.id)) continue;
      if (!clearSeg(nx[n], nz[n], h.x, h.z, true)) continue;
      const m = splitAt(h);
      if (m !== n) { indexEdge(edge(n, m, EK.link, 1.2)); stats.links++; }
    }
    // square lattice edge nodes onto the sidewalk lines next to them
    for (const id of sqAt.values()) {
      if (live(id) >= 5) continue;
      const h = nearestOnEdges(nx[id], nz[id], LATTICE * 0.9, (e) => e.k === EK.walk || e.k === EK.path);
      if (h && clearSeg(nx[id], nz[id], h.x, h.z, true)) { const m = splitAt(h); if (m !== id) { indexEdge(edge(id, m, EK.link, 2)); stats.links++; } }
    }
  }

  // ---------------------------------------------------------------- 5. tram platforms
  const boards = [];
  for (const l of platformLines) {
    const P = l.line.filter(([x, z]) => inTile(x, z));
    if (P.length < 2) continue;
    let L = 0; for (let k = 1; k < P.length; k++) L += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]);
    if (L < 8) continue;
    const ids = P.map(([x, z]) => node(x, z, NK.walk));
    for (let k = 1; k < ids.length; k++) indexEdge(edge(ids[k - 1], ids[k], EK.platform, 2.0));
    // the boarding node: the middle of the platform (people wait spread along it)
    let acc = 0, mid = null;
    for (let k = 1; k < P.length && !mid; k++) { const d = Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); if (acc + d >= L / 2) { const f = (L / 2 - acc) / d; mid = [P[k - 1][0] + (P[k][0] - P[k - 1][0]) * f, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * f, k]; } acc += d; }
    const h = nearestOnEdges(mid[0], mid[1], 1, (e) => e.k === EK.platform);
    if (!h) continue;
    const bn = splitAt(h, NK.board);
    nk[bn] = NK.board;
    const ux = P[P.length - 1][0] - P[0][0], uz = P[P.length - 1][1] - P[0][1], ul = Math.hypot(ux, uz) || 1;
    boards.push({ n: bn, ux: ux / ul, uz: uz / ul, len: L });
    // its ends onto the sidewalk / a crossing nearby over walkable ground
    for (const end of [ids[0], ids[ids.length - 1]]) {
      const hh = nearestOnEdges(nx[end], nz[end], 7, (e) => e.k !== EK.platform);
      if (hh && clearSeg(nx[end], nz[end], hh.x, hh.z, false)) { const m = splitAt(hh); indexEdge(edge(end, m, EK.link, 1.5)); stats.links++; }
    }
    stats.platforms++;
  }

  // ---------------------------------------------------------------- 6. crossings (kerb to kerb, the drawn ones)
  const phases = o.roads ? signalPhases(o.roads) : null;
  const sigNodes = phases ? [...phases.nodes.values()].filter((s) => !s.virtual || s.arms.length) : [];
  for (const c of o.crossings || []) {
    const [cx, cz] = c.c;
    if (!inTile(cx, cz)) continue;
    stats.crossings++;
    const ax = Math.cos(c.axis), az = Math.sin(c.axis), bx = -az, bz = ax;
    const [lo, hi] = c.vSpan || [-(c.across || 6) / 2, (c.across || 6) / 2];
    const ends2 = [];
    for (const [v, sg] of [[lo, -1], [hi, 1]]) {
      // the end: a little past the kerb, onto the nearest walking line / platform (a refuge island splits it later)
      let got = null;
      for (const extra of [0.8, 1.6, 0.3, 2.6]) {
        const ex = cx + bx * (v + sg * extra), ez = cz + bz * (v + sg * extra);
        const h = nearestOnEdges(ex, ez, SNAP_R, (e) => e.k !== EK.cross && e.k !== EK.zebra);
        if (h && clearSeg(ex, ez, h.x, h.z, true)) { got = { h, ex, ez }; break; }
      }
      ends2.push(got);
    }
    if (!ends2[0] || !ends2[1]) { stats.crossingsUnlinked++; (stats.unlinked ||= []).push([Math.round(cx * 10) / 10, Math.round(cz * 10) / 10]); continue; }
    // signalled: the nearest phase-table node within SIG_R; the crossed road = its arm most along the crossing's axis
    let ph = -1;
    if (sigNodes.length) {
      let S = null, bd = SIG_R * SIG_R;
      for (const s of sigNodes) { const d = (s.x - cx) ** 2 + (s.z - cz) ** 2; if (d < bd) { bd = d; S = s; } }
      if (S) {
        let arm = null, best = -1;
        for (const q of S.arms) { const d = Math.abs(q.ux * ax + q.uz * az); if (d > best) { best = d; arm = q; } }
        if (arm) ph = phases.phaseAt(S.id, arm.road, ax, az);
      }
    }
    const a = splitAt(ends2[0].h, NK.kerb), b = splitAt(ends2[1].h, NK.kerb);
    if (a === b) { stats.crossingsUnlinked++; continue; }
    nk[a] = nk[a] === NK.board ? NK.board : NK.kerb; nk[b] = nk[b] === NK.board ? NK.board : NK.kerb;
    const w = Math.max(2, Math.min(5, c.along || 3));
    // a tram platform the crossing passes over: two crossings, kerb -> platform -> kerb
    const mid = nearestOnEdges(cx, cz, 1.5, (e) => e.k === EK.platform);
    if (mid) { const m = splitAt(mid, NK.kerb); indexEdge(edge(a, m, ph >= 0 ? EK.cross : EK.zebra, w, ph)); indexEdge(edge(m, b, ph >= 0 ? EK.cross : EK.zebra, w, ph)); }
    else indexEdge(edge(a, b, ph >= 0 ? EK.cross : EK.zebra, w, ph));
    stats.crossingsLinked++; if (ph >= 0) stats.crossingsSignal++;
  }

  lap("rest");
  // ---------------------------------------------------------------- 7. clean: dead edges out, short pieces out, pack
  const alive = E.map((e) => !e.dead && e.a !== e.b);
  // connected pieces (union-find over live edges); drop pieces with < KEEP_COMP m of walk (fragments), unless a border
  // node or a board is in them (the rest of them is on the next tile)
  const par = Int32Array.from({ length: nx.length }, (_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let id = 0; id < E.length; id++) if (alive[id]) { const ra = find(E[id].a), rb = find(E[id].b); if (ra !== rb) par[ra] = rb; }
  const compLen = new Map(), compKeep = new Set();
  for (let id = 0; id < E.length; id++) if (alive[id]) { const e = E[id], r = find(e.a); compLen.set(r, (compLen.get(r) || 0) + Math.hypot(nx[e.b] - nx[e.a], nz[e.b] - nz[e.a])); }
  for (let n = 0; n < nx.length; n++) if (nk[n] === NK.border || nk[n] === NK.board) compKeep.add(find(n));
  for (let id = 0; id < E.length; id++) if (alive[id]) { const r = find(E[id].a); if ((compLen.get(r) || 0) < KEEP_COMP && !compKeep.has(r)) { alive[id] = false; stats.dropComp++; } }
  // renumber the nodes used by live edges
  const map = new Int32Array(nx.length).fill(-1);
  let N = 0;
  for (let id = 0; id < E.length; id++) if (alive[id]) for (const v of [E[id].a, E[id].b]) if (map[v] < 0) map[v] = N++;
  for (const bd of boards) if (map[bd.n] < 0) map[bd.n] = N++;
  const X = new Float32Array(N), Z = new Float32Array(N), NKa = new Uint8Array(N);
  for (let v = 0; v < nx.length; v++) if (map[v] >= 0) { X[map[v]] = nx[v]; Z[map[v]] = nz[v]; NKa[map[v]] = nk[v]; }
  const M = alive.reduce((s, v) => s + (v ? 1 : 0), 0);
  const EA = new Uint32Array(M), EB = new Uint32Array(M), EKa = new Uint8Array(M), EW = new Float32Array(M), EP = new Int8Array(M), PL = new Uint8Array(M);
  let m = 0;
  for (let id = 0; id < E.length; id++) if (alive[id]) { const e = E[id]; EA[m] = map[e.a]; EB[m] = map[e.b]; EKa[m] = e.k; EW[m] = e.w; EP[m] = e.ph; m++; }
  // the place of each edge (density by place: viewer/pedestrians/citySim.js): shops / stops / parks near it
  placeOf(o.feats, X, Z, EA, EB, EKa, PL);
  const BD = new Float32Array(boards.length * 4);
  boards.forEach((bd, k) => { BD[k * 4] = map[bd.n]; BD[k * 4 + 1] = bd.ux; BD[k * 4 + 2] = bd.uz; BD[k * 4 + 3] = bd.len; });
  stats.nodes = N; stats.edges = M; stats.lineM = Math.round(stats.lineM); stats.pathM = Math.round(stats.pathM);
  lap("pack"); stats.t = T;
  stats.ms = Math.round((globalThis.performance ?? Date).now() - t0);
  return { v: WALK_VERSION, x: X, z: Z, nk: NKa, ea: EA, eb: EB, ek: EKa, ew: EW, ep: EP, place: PL, boards: BD, stats, ...(o.debug ? { raster: R } : {}) };
}

// ---------------------------------------------------------------- helpers

const hash2 = (i, j) => { let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** the obstacle raster of a tile (0.5 m): 1 = a solid at body height (the drive colliders' building walls, walls, raised
 *  islands), 2 = a post (tree trunk, bollard) grown by the body radius */
export function blockedRaster(o, B) {
  const nx = Math.ceil((B.x1 - B.x0) / RAST), nz = Math.ceil((B.z1 - B.z0) / RAST), data = new Uint8Array(nx * nz);
  const col = o.col;
  if (col) {
    // polygons: scanline fill at cell centres, each ring toggling (holes come out right with even-odd)
    for (let p = 0; p < col.P; p++) {
      const kind = col.pkind[p];
      if (kind !== 0 && kind !== 1 && kind !== 5 && kind !== 9) continue;      // building, island, wall, hedge wall
      const x0 = col.pbox[p * 4], z0 = col.pbox[p * 4 + 1], x1 = col.pbox[p * 4 + 2], z1 = col.pbox[p * 4 + 3];
      if (x1 < B.x0 || x0 > B.x1 || z1 < B.z0 || z0 > B.z1) continue;
      const j0 = Math.max(0, Math.floor((z0 - B.z0) / RAST)), j1 = Math.min(nz - 1, Math.floor((z1 - B.z0) / RAST));
      const xs = [];
      for (let j = j0; j <= j1; j++) {
        const zc = B.z0 + (j + 0.5) * RAST; xs.length = 0;
        for (let r = col.polyRing[p]; r < col.polyRing[p + 1]; r++) {
          const s = col.ringStart[r], e = col.ringStart[r + 1];
          for (let i = s, k = e - 1; i < e; k = i++) {
            const xi = col.pts[i * 2], zi = col.pts[i * 2 + 1], xk = col.pts[k * 2], zk = col.pts[k * 2 + 1];
            if ((zi > zc) !== (zk > zc)) xs.push(xi + ((zc - zi) / (zk - zi)) * (xk - xi));
          }
        }
        xs.sort((a, b) => a - b);
        for (let q = 0; q + 1 < xs.length; q += 2) {
          const i0 = Math.max(0, Math.ceil((xs[q] - B.x0) / RAST - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[q + 1] - B.x0) / RAST - 0.5));
          for (let i = i0; i <= i1; i++) data[j * nx + i] = 1;
        }
      }
    }
    for (let c = 0; c < col.C; c++) disc(data, nx, nz, B, col.circ[c * 3], col.circ[c * 3 + 1], col.circ[c * 3 + 2] + BODY * 0.5);
  }
  const bl = o.bollards || [];
  for (let k = 0; k + 2 < bl.length; k += 3) disc(data, nx, nz, B, bl[k], bl[k + 2], 0.1 + BODY * 0.5);
  return { data, nx, nz };
}
function disc(data, nx, nz, B, x, z, r) {
  const i0 = Math.max(0, Math.floor((x - r - B.x0) / RAST)), i1 = Math.min(nx - 1, Math.floor((x + r - B.x0) / RAST));
  const j0 = Math.max(0, Math.floor((z - r - B.z0) / RAST)), j1 = Math.min(nz - 1, Math.floor((z + r - B.z0) / RAST));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const cx = B.x0 + (i + 0.5) * RAST, cz = B.z0 + (j + 0.5) * RAST;
    if ((cx - x) ** 2 + (cz - z) ** 2 <= (r + RAST * 0.5) ** 2 && data[j * nx + i] === 0) data[j * nx + i] = 2;
  }
}

/** a moving average over +-4 points (2 m of raster cells) of a line's points [x, z, w], in place (the ends stay: they
 *  are the branch points the other lines meet) */
function smoothRun(P) {
  const n = P.length; if (n < 4) return;
  const Q = P.map((p) => [p[0], p[1]]);
  for (let k = 1; k < n - 1; k++) {
    const r = Math.min(4, k, n - 1 - k);
    let x = 0, z = 0; for (let q = k - r; q <= k + r; q++) { x += Q[q][0]; z += Q[q][1]; }
    P[k][0] = x / (2 * r + 1); P[k][1] = z / (2 * r + 1);
  }
}
/** Douglas-Peucker indices, and no kept span longer than maxLen */
function simplify(P, tol, maxLen, force = null) {
  const keep = force ? Uint8Array.from(force) : new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
  const st = [[0, P.length - 1]];
  while (st.length) {
    const [a, b] = st.pop();
    if (b - a < 2) continue;
    const ax = P[a][0], az = P[a][1], dx = P[b][0] - ax, dz = P[b][1] - az, L = Math.hypot(dx, dz) || 1e-9;
    let worst = -1, wd = 0;
    for (let k = a + 1; k < b; k++) { const d = Math.abs((P[k][0] - ax) * dz - (P[k][1] - az) * dx) / L; if (d > wd) { wd = d; worst = k; } }
    if (wd > tol || L > maxLen) { const m = wd > tol ? worst : (a + b) >> 1; keep[m] = 1; st.push([a, m], [m, b]); }
  }
  const out = []; for (let k = 0; k < P.length; k++) if (keep[k]) out.push(k);
  return out;
}

/** the place code of each edge: square / park edges by their kind and the park areas; shops and transit stops by the
 *  OSM points within reach of the edge's middle */
function placeOf(feats, X, Z, EA, EB, EK2, out) {
  const shops = [], stops = [];
  for (const p of feats?.points || []) {
    if (p.kind === "shop" || p.tags?.amenity === "cafe" || p.tags?.amenity === "restaurant" || p.tags?.amenity === "bakery" || p.tags?.amenity === "pharmacy" || p.tags?.amenity === "bank") shops.push(p);
    else if (p.kind === "tram_stop" || p.kind === "bus_stop" || p.kind === "pt_stop_position") stops.push(p);
  }
  const parks = (feats?.areas || []).filter((a) => /^(park|wood|grass|playground|garden|pitch|forest|meadow)$/.test(a.kind)).map((a) => a.rings);
  const inRings = (x, z, rings) => { let ins = false; for (const R of rings) for (let i = 0, j = R.length - 1; i < R.length; j = i++) { const [xi, zi] = R[i], [xj, zj] = R[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
  for (let m = 0; m < EA.length; m++) {
    const x = (X[EA[m]] + X[EB[m]]) / 2, z = (Z[EA[m]] + Z[EB[m]]) / 2, k = EK2[m];
    let pl = PLACE.home;
    if (k === EK.square) pl = PLACE.square;
    else if (k === EK.platform || stops.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 40 * 40)) pl = PLACE.transit;
    else if (shops.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 35 * 35)) pl = PLACE.shop;
    else if (k === EK.path || k === EK.steps || parks.some((r) => inRings(x, z, r))) pl = PLACE.park;
    out[m] = pl;
  }
}

// ---------------------------------------------------------------- raster skeleton (the sidewalks' medial axis)

/** 3-4 chamfer distance (in cells) from each mask cell to the nearest non-mask cell */
function chamfer(mask, W, H) {
  const D = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) D[k] = mask[k] ? 1e6 : 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i; if (!D[k]) continue;
    let d = D[k];
    if (i > 0) d = Math.min(d, D[k - 1] + 1); else d = Math.min(d, 1);
    if (j > 0) { d = Math.min(d, D[k - W] + 1); if (i > 0) d = Math.min(d, D[k - W - 1] + 1.4142); if (i < W - 1) d = Math.min(d, D[k - W + 1] + 1.4142); } else d = Math.min(d, 1);
    D[k] = d;
  }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) {
    const k = j * W + i; if (!D[k]) continue;
    let d = D[k];
    if (i < W - 1) d = Math.min(d, D[k + 1] + 1); else d = Math.min(d, 1);
    if (j < H - 1) { d = Math.min(d, D[k + W] + 1); if (i < W - 1) d = Math.min(d, D[k + W + 1] + 1.4142); if (i > 0) d = Math.min(d, D[k + W - 1] + 1.4142); } else d = Math.min(d, 1);
    D[k] = d;
  }
  return D;
}

/** Zhang-Suen thinning over the mask's cells (a list of live cells, not the whole raster); the tile's edge cells stay
 *  (the line runs on to the edge, where the neighbour's goes on) */
function thin(mask, W, H) {
  const S = mask.slice();
  let live = [];
  for (let k = 0; k < W * H; k++) if (S[k]) live.push(k);
  const nb = (k) => { const i = k % W, j = (k - i) / W; return i > 0 && j > 0 && i < W - 1 && j < H - 1; };
  const del = [];
  for (let it = 0; it < 64; it++) {
    let changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (const k of live) {
        if (!S[k] || !nb(k)) continue;
        const p2 = S[k - W], p3 = S[k - W + 1], p4 = S[k + 1], p5 = S[k + W + 1], p6 = S[k + W], p7 = S[k + W - 1], p8 = S[k - 1], p9 = S[k - W - 1];
        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;
        const a = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
        if (a !== 1) continue;
        if (pass === 0 ? (p2 && p4 && p6) || (p4 && p6 && p8) : (p2 && p4 && p8) || (p2 && p6 && p8)) continue;
        del.push(k);
      }
      for (const k of del) S[k] = 0;
      if (del.length) changed = true;
    }
    if (!changed) break;
    live = live.filter((k) => S[k]);
  }
  return S;
}

/** The skeleton as polylines of cell indices between its branch points: branch cells (3+ transitions round the cell
 *  or 3+ neighbours not on a staircase) touching each other form one branch point (a cluster, named by its first cell);
 *  every connected run of the other cells is one chain, walked from an end, with the clusters it touches at its two
 *  ends; two touching clusters make a chain of their own. Spurs (a chain with one free end, shorter than `spur` cells)
 *  are pruned and everything re-classified, up to three rounds. Linear in the cells. */
function traceSkeleton(S, W, H, spur) {
  const OFF = [-W, -W + 1, 1, W + 1, W, W - 1, -1, -W - 1];        // the 8 neighbours in order round the cell
  let cells = [];
  for (let k = 0; k < W * H; k++) if (S[k]) { const i = k % W, j = (k - i) / W; if (i > 0 && j > 0 && i < W - 1 && j < H - 1) cells.push(k); else S[k] = 0; }
  const kind = new Uint8Array(W * H), vis = new Uint8Array(W * H), rootOf = new Int32Array(W * H).fill(-1);
  const once = () => {
    for (const k of cells) {
      if (!S[k]) { kind[k] = 0; continue; }
      let n = 0, a = 0;
      for (let d = 0; d < 8; d++) { const v = S[k + OFF[d]], w = S[k + OFF[(d + 1) & 7]]; n += v; if (!v && w) a++; }
      kind[k] = a >= 3 ? 2 : 1;                                       // (a staircase cell has 3 neighbours but 2 transitions)
    }
    // clusters of branch cells
    for (const k of cells) rootOf[k] = -1;
    for (const k of cells) {
      if (kind[k] !== 2 || rootOf[k] >= 0) continue;
      const st = [k]; rootOf[k] = k;
      while (st.length) { const c = st.pop(); for (let d = 0; d < 8; d++) { const q = c + OFF[d]; if (S[q] && kind[q] === 2 && rootOf[q] < 0) { rootOf[q] = k; st.push(q); } } }
    }
    const clusterNear = (c, not = -1) => { for (let d = 0; d < 8; d++) { const q = c + OFF[d]; if (S[q] && kind[q] === 2 && rootOf[q] !== not) return rootOf[q]; } return -1; };
    for (const k of cells) vis[k] = 0;
    const out = [];
    // runs of line cells
    const lineNb = (c) => { let n = 0; for (let d = 0; d < 8; d++) { const q = c + OFF[d]; if (S[q] && kind[q] === 1) n++; } return n; };
    const walkFrom = (s0) => {
      const L = [s0]; vis[s0] = 1; let cur = s0;
      for (;;) {
        let nxt = -1;
        for (let d = 0; d < 8; d++) { const q = cur + OFF[d]; if (S[q] && kind[q] === 1 && !vis[q] && (nxt < 0 || (d & 1) === 0)) nxt = q; }
        if (nxt < 0) break;
        vis[nxt] = 1; L.push(nxt); cur = nxt;
      }
      return L;
    };
    for (const k of cells) {
      if (kind[k] !== 1 || vis[k]) continue;
      // an end of this run: walk to one first (a cell with one line neighbour, or touching a cluster), then from it
      let s0 = k;
      if (lineNb(k) >= 2 && clusterNear(k) < 0) { const tmp = walkFrom(k); for (const c of tmp) vis[c] = 0; s0 = tmp[tmp.length - 1]; }
      const L = walkFrom(s0);
      const ca = clusterNear(L[0]), cb = clusterNear(L[L.length - 1], L.length > 1 ? -1 : ca);
      if (ca >= 0) L.unshift(ca);
      if (cb >= 0 && (cb !== ca || L.length > 3)) L.push(cb);
      out.push(L);
    }
    // touching clusters
    for (const k of cells) if (kind[k] === 2) for (let d = 0; d < 8; d++) { const q = k + OFF[d]; if (S[q] && kind[q] === 2 && rootOf[q] !== rootOf[k] && rootOf[k] < rootOf[q]) out.push([rootOf[k], rootOf[q]]); }
    return out;
  };
  const isCluster = (c) => kind[c] === 2;
  let chains = once();
  for (let round = 0; round < 3; round++) {
    let pruned = 0;
    for (const L of chains) {
      if (L.length >= spur) continue;
      const ea = !isCluster(L[0]), eb = !isCluster(L[L.length - 1]);
      if (ea && !eb) { for (let q = 0; q < L.length - 1; q++) S[L[q]] = 0; pruned++; }
      else if (eb && !ea) { for (let q = 1; q < L.length; q++) S[L[q]] = 0; pruned++; }
      else if (ea && eb) { for (const q of L) S[q] = 0; pruned++; }
    }
    if (!pruned) break;
    cells = cells.filter((k) => S[k]);
    chains = once();
  }
  // de-duplicate cluster pairs
  const seen = new Set();
  return chains.filter((L) => { if (L.length > 2) return true; const key = Math.min(L[0], L[1]) + "," + Math.max(L[0], L[1]); if (seen.has(key) || L[0] === L[1]) return false; seen.add(key); return true; });
}
export const _skel = { thin: (...a) => thin(...a), trace: (...a) => traceSkeleton(...a) };
