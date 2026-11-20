// THE STREET MODEL v0 (claude/street2, docs/STREET_MODEL_PLAN.md 3 / migration job 2, rule street-model). Plain JS, no
// three.js: runs in the tile worker and in node. The ONE description of a street that consumers read instead of each
// re-deriving the carriageway from the OSM line, the lane stack and the class raster (plan 1a).
//
// SEGMENTS. A segment is a chain of OSM ways (data/roads/network.json roads, already split at junctions by
// pipeline/refine) continued through every degree-2 node, so a way split for a tag change is not a seam in the paint.
//   id      `s:<first OSM way>:<nodeA>-<nodeB>` (the chain's end nodes, without the "n")
//   owner   the tile holding the chain's arc-length midpoint (rule street-model: a tile never recomputes another tile's
//           element from its own clipped data; v0 builds the owner's element from the owner's UNCLIPPED inputs, see
//           `measure` below, and the gate row `model` checks the copies byte for byte across tile pairs)
//   stations every STEP m along the OSM line (s, x, z, the left normal nx, nz: the tangent averaged over +-NWIN m)
//   axis    the mid-line of the MEASURED carriageway where both kerbs are measured (or derived), else the OSM line
//   kerbL / kerbR  offset from the axis along the station normal, conf (M D O G X), h (kerb height), kind
//   drive   the driving-carriageway ends (roadway / tram roadway: a measured parking bay lies between them and the kerb)
//   ring    the carriageway ring (kerbR forward, kerbL back)
//   lanes   the OSM lane stack (tags, else the type default) placed inside the measured driving carriageway, piecewise
//           linear: per boundary its offset from the axis at every station, its paint code (vendor lineCode) and role;
//           conf per station
// JUNCTIONS. Every network node of degree >= 3: a polygon through its arms' mouth lines (the kerb points where each arm
// becomes a stretch with a stable measured width), its arms (segment id, end, mouth station). Owner = the node's tile.
//
// CONFIDENCE (plan 3): M measured (a UrbIS carriageway polygon end on a measured kerb / street-edge line, or a parking
// bay edge; a Brussels Mobility / UrbIS Topo line for a lane boundary), D derived from M (a short gap between M
// stations; lanes placed between two M kerbs on a stable width), O OSM only (tags), G engine default (no lane tags),
// X contradiction (the OSM line more than X_OFF outside the measured carriageway; a lane stack that does not fit it).
//
// Everything here is a pure function of (network, measured inputs of the tiles a corridor touches, overrides): any tile
// (and the later offline bake) builds the same bytes for an element.
import { LANE_TYPES, ROAD_TYPES } from "../../vendor/roads/roadCrossSection.js";
import { boundaryKind, centerKind, markingStyle } from "../../vendor/roads/roadMarkings.js";
import { lineCode } from "../../vendor/roads/mesh/laneRoadMesh.js";

export const MODEL_VERSION = 1;
export const TILE = 500;                 // m: tile size (data/tiles/manifest.json tileSize)
export const STEP = 1;                   // m: station spacing
const NWIN = 4;                          // m: the station normal = the tangent averaged over +-NWIN m (no kinks at OSM vertices)
export const REACH = 25;                 // m: farthest carriageway end looked for across a station
const NEAR_R = 12;                       // m: the first ray (most streets end inside it)
const FIND = 6;                          // m: an OSM line off the carriageway looks this far for it
export const X_OFF = 1.5;                // m: the OSM line this far outside the measured carriageway = X (plan 3)
const SNAP = 0.25;                       // m: a polygon end this near a measured kerb / street-edge line is ON it (M)
const JUMP = 0.75, JUMP_WIN = 10;        // m: an end this far off the +-JUMP_WIN running median of its side is a mouth / bay (not M)
const INTERP = 15;                       // m: a gap between M stations up to this is bridged (D)
export const STABLE_W = 0.4, STABLE_LEN = 30;   // derived lanes: width within +-STABLE_W over >= STABLE_LEN m (plan 3)
const PARK_W = 2.0;                      // m: a guessed parking lane keeps at most this (a parked car + margin)
const MIN_LANE = 2.5;                    // m: a placed driving lane narrower than this = the stack does not fit (X)
const TOPO_SNAP = 1.0, TOPO_COS = Math.cos((10 * Math.PI) / 180);   // a UrbIS Topo line within 1 m, within 10 deg: the measured lane line (M)
const TOPO_WIN = 10, TOPO_DEV = 0.15;    // m: ... where its offset holds within 0.15 m of its +-10 m median
const MOUTH_MAX = 40;                    // m: the farthest a mouth line is looked for along an arm
const CROSS_PAD = 0.5;                   // m: lines stop this far before a measured crossing
export const CONF = { M: 0, D: 1, O: 2, G: 3, X: 4 };
export const CONF_NAME = "MDOGX";
export const KERB_KIND = { none: 0, kerb: 1, edgeRaised: 2, edgeFlush: 3, parking: 4 };
export const ROLE = { lane: 0, centre: 1, edgeR: 2, edgeL: 3 };
const KERB_H = 0.13;                     // m: = viewer/surfaces.js KERB (not imported: this module stays small for the bake)
const DRIVE = new Set([0, 1]), PARK = new Set([3]);    // UrbIS classes: roadway, tram roadway | parking
const RESIDENTIAL = new Set(["local", "oneWay", "alley"]);

// ---------------------------------------------------------------- tiles

/** tile name of a plan point: letter = column (x / 500 + 'A' offset), number = row (z / 500 + 5): E7 = x [-1000, -500), z [1000, 1500) */
export const tileOf = (x, z) => String.fromCharCode("E".charCodeAt(0) + Math.floor(x / TILE) + 2) + (Math.floor(z / TILE) + 5);
export const tileBounds = (name) => { const i = name.charCodeAt(0) - "E".charCodeAt(0) - 2, j = parseInt(name.slice(1), 10) - 5; return { x0: i * TILE, x1: (i + 1) * TILE, z0: j * TILE, z1: (j + 1) * TILE }; };
/** tile names a box [x0, x1] x [z0, z1] touches */
export function tilesOfBox(x0, x1, z0, z1) {
  const out = [];
  for (let i = Math.floor(x0 / TILE); i <= Math.floor(x1 / TILE); i++) for (let j = Math.floor(z0 / TILE); j <= Math.floor(z1 / TILE); j++)
    out.push(String.fromCharCode("E".charCodeAt(0) + i + 2) + (j + 5));
  return out;
}

// ---------------------------------------------------------------- geometry helpers

const pipRing = (x, z, R) => { let ins = false; for (let i = 0, n = R.length / 2, j = n - 1; i < n; j = i++) { const xi = R[2 * i], zi = R[2 * i + 1], xj = R[2 * j], zj = R[2 * j + 1]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
const pipPoly = (x, z, rings) => { let ins = false; for (const R of rings) if (pipRing(x, z, R)) ins = !ins; return ins; };
export const pip2 = (x, z, P) => { let ins = false; for (let i = 0, n = P.length / 2, j = n - 1; i < n; j = i++) { const xi = P[2 * i], zi = P[2 * i + 1], xj = P[2 * j], zj = P[2 * j + 1]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
const CELL = 8, K = (i, j) => i * 131071 + j;

/** the cells a segment p + n t, t in [t0, t1] passes (Amanatides-Woo), as keys */
function rayCells(x, z, nx, nz, t0, t1, out) {
  let px = x + nx * t0, pz = z + nz * t0;
  let i = Math.floor(px / CELL), j = Math.floor(pz / CELL);
  const L = t1 - t0, si = nx > 0 ? 1 : -1, sj = nz > 0 ? 1 : -1;
  const dI = Math.abs(nx) > 1e-12 ? CELL / Math.abs(nx) : Infinity, dJ = Math.abs(nz) > 1e-12 ? CELL / Math.abs(nz) : Infinity;
  let tI = Math.abs(nx) > 1e-12 ? ((nx > 0 ? (i + 1) * CELL - px : px - i * CELL) / Math.abs(nx)) : Infinity;
  let tJ = Math.abs(nz) > 1e-12 ? ((nz > 0 ? (j + 1) * CELL - pz : pz - j * CELL) / Math.abs(nz)) : Infinity;
  out.push(K(i, j));
  while (Math.min(tI, tJ) <= L) { if (tI < tJ) { i += si; tI += dI; } else { j += sj; tJ += dJ; } out.push(K(i, j)); }
  return out;
}

// ---------------------------------------------------------------- measured inputs (one tile)

/**
 * The measured inputs of ONE tile, indexed (cached per worker / process by the caller): its UrbIS carriageway polygons
 * (roadway, tram roadway, parking), kerb and street-edge lines, UrbIS Topo / Brussels Mobility lane lines and measured
 * crossings. surf = surfaces.json AS FETCHED (before any in-place edit), markings = markings.json or null.
 */
export function tileInputs(name, surf, markings) {
  const polys = [], edgeGrid = new Map(), polyGrid = new Map(), lineGrid = new Map(), topoGrid = new Map();
  // (the SURVEYED geometry: the drawn kerbs are this one tapered at steps and splined on curves by viewer/surfaces.js,
  // per tile; the consumers that draw along a kerb refine onto their own tile's drawn kerb, viewer/street/markings.js)
  const cls = (s) => (s.c === 2 && s.photo?.look === "asphalt" ? 1 : s.c);   // (prepareSurfaces: a tram site the photo shows as asphalt is tram roadway)
  const add = (g, k, v) => { let l = g.get(k); if (!l) g.set(k, (l = [])); l.push(v); };
  (surf?.surfaces || []).forEach((s, si) => {
    const c = cls(s);
    if (!DRIVE.has(c) && !PARK.has(c)) return;
    const rings = (s.rings || []).filter((r) => r.length >= 3).map((r) => Float64Array.from(r.flat()));
    if (!rings.length) return;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const R of rings) for (let k = 0; k < R.length; k += 2) { x0 = Math.min(x0, R[k]); x1 = Math.max(x1, R[k]); z0 = Math.min(z0, R[k + 1]); z1 = Math.max(z1, R[k + 1]); }
    const pi = polys.push({ pid: `${name}:${si}`, src: s.id ?? `${name}:${si}`, park: PARK.has(c), rings, x0, x1, z0, z1 }) - 1;
    for (const R of rings) for (let k = 0, n = R.length / 2; k < n; k++) {
      const ax = R[2 * k], az = R[2 * k + 1], bx = R[2 * ((k + 1) % n)], bz = R[2 * ((k + 1) % n) + 1], e = [pi, ax, az, bx, bz, 0];   // (one array per edge, [5] = the ray's stamp: each edge once per ray)
      for (let i = Math.floor(Math.min(ax, bx) / CELL); i <= Math.floor(Math.max(ax, bx) / CELL); i++)
        for (let j = Math.floor(Math.min(az, bz) / CELL); j <= Math.floor(Math.max(az, bz) / CELL); j++) add(edgeGrid, K(i, j), e);
    }
    for (let i = Math.floor(x0 / 32); i <= Math.floor(x1 / 32); i++) for (let j = Math.floor(z0 / 32); j <= Math.floor(z1 / 32); j++) add(polyGrid, K(i, j), pi);
  });
  const segsOf = (g, line, kind) => { for (let k = 1; k < line.length; k++) { const [ax, az] = line[k - 1], [bx, bz] = line[k], e = [kind, ax, az, bx, bz]; for (let i = Math.floor(Math.min(ax, bx) / CELL); i <= Math.floor(Math.max(ax, bx) / CELL); i++) for (let j = Math.floor(Math.min(az, bz) / CELL); j <= Math.floor(Math.max(az, bz) / CELL); j++) add(g, K(i, j), e); } };
  for (const l of surf?.kerbs || []) segsOf(lineGrid, l, KERB_KIND.kerb);
  for (const e of surf?.edges || []) if (e?.line) segsOf(lineGrid, e.line, e.raised ? KERB_KIND.edgeRaised : KERB_KIND.edgeFlush);
  for (const l of markings?.lines || []) if ((l.kind === "solid" || l.kind === "dashed") && l.line?.length >= 2) segsOf(topoGrid, l.line, 0);
  const crossings = (markings?.crossings || []).filter((c) => c.poly?.length >= 3).map((c) => { const P = Float64Array.from(c.poly.flat()); let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (let k = 0; k < P.length; k += 2) { x0 = Math.min(x0, P[k]); x1 = Math.max(x1, P[k]); z0 = Math.min(z0, P[k + 1]); z1 = Math.max(z1, P[k + 1]); } return { id: c.id, P, x0, x1, z0, z1 }; });
  return { name, bounds: tileBounds(name), polys, edgeGrid, polyGrid, lineGrid, topoGrid, crossings, has: !!surf };
}

let STAMP = 0;
/** a set of tileInputs as one query object (the tiles a corridor touches) */
function inputSet(list) {
  const T = list.filter(Boolean);
  /** crossings of the ray p + n t (t in [-R, R]) with the carriageway polygons -> elementary intervals [{ a, b, drive, park, src }] */
  const intervals = (x, z, nx, nz, R) => {
    const ev = [], cand = new Map();
    const cells = rayCells(x, z, nx, nz, -R, R, []);
    for (let ti = 0; ti < T.length; ti++) {
      const I = T[ti], b = I.bounds;
      if (x < b.x0 - R - 1 || x > b.x1 + R + 1 || z < b.z0 - R - 1 || z > b.z1 + R + 1) continue;
      const st = ++STAMP;
      for (const c of cells) for (const e of I.edgeGrid.get(c) || []) {
        if (e[5] === st) continue; e[5] = st;       // (an edge in several cells: once)
        const pi = e[0], ax = e[1], az = e[2], bx = e[3], bz = e[4], sx = bx - ax, sz = bz - az, d = nx * sz - nz * sx;
        if (Math.abs(d) < 1e-12) continue;
        const qx = ax - x, qz = az - z, t = (qx * sz - qz * sx) / d, w = (qx * nz - qz * nx) / d;
        if (w < 0 || w >= 1 || t < -R || t > R) continue;
        const key = ti * 1e6 + pi;
        ev.push([t, key]); cand.set(key, I.polys[pi]);
      }
      for (const pi of I.polyGrid.get(K(Math.floor(x / 32), Math.floor(z / 32))) || []) { const key = ti * 1e6 + pi; if (!cand.has(key)) { const P = I.polys[pi]; if (x >= P.x0 && x <= P.x1 && z >= P.z0 && z <= P.z1) cand.set(key, P); } }
    }
    if (!cand.size) return [];
    const sx = x - nx * R, sz = z - nz * R, state = new Map();
    let drive = 0, park = 0;
    for (const [key, P] of cand) { const ins = pipPoly(sx, sz, P.rings); state.set(key, ins); if (ins) { if (P.park) park++; else drive++; } }
    ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const out = [];
    let t0 = -R, src = null;
    const cur = () => { for (const [key, ins] of state) if (ins) return cand.get(key).src; return null; };
    src = cur();
    for (const [t, key] of ev) {
      if (t > t0) out.push({ a: t0, b: t, drive: drive > 0, park: park > 0, src });
      const P = cand.get(key), ins = !state.get(key); state.set(key, ins);
      if (P.park) park += ins ? 1 : -1; else drive += ins ? 1 : -1;
      t0 = t; src = cur();
    }
    out.push({ a: t0, b: R, drive: drive > 0, park: park > 0, src });
    return out;
  };
  /** the measured line (kerb / street edge) crossing p + n t nearest tc within +-SNAP: { t, kind } | null */
  const lineHit = (x, z, nx, nz, tc) => {
    let best = null, bd = SNAP;
    const cells = rayCells(x, z, nx, nz, tc - SNAP, tc + SNAP, []);
    for (const I of T) for (const c of cells) for (const [kind, ax, az, bx, bz] of I.lineGrid.get(c) || []) {
      const sx = bx - ax, sz = bz - az, d = nx * sz - nz * sx;
      if (Math.abs(d) < 1e-12) continue;
      const qx = ax - x, qz = az - z, t = (qx * sz - qz * sx) / d, w = (qx * nz - qz * nx) / d;
      if (w < 0 || w > 1 || Math.abs(t - tc) > bd) continue;
      if (!best || Math.abs(t - tc) < bd - 1e-9 || (Math.abs(Math.abs(t - tc) - bd) <= 1e-9 && kind < best.kind)) { bd = Math.abs(t - tc); best = { t, kind }; }
    }
    return best;
  };
  /** a UrbIS Topo / BM lane line crossing p + n t within +-TOPO_SNAP of tc, near-parallel to the tangent (tx, tz): t | null */
  const topoHit = (x, z, nx, nz, tc, tx, tz) => {
    let best = null, bd = TOPO_SNAP;
    const cells = rayCells(x, z, nx, nz, tc - TOPO_SNAP, tc + TOPO_SNAP, []);
    for (const I of T) for (const c of cells) for (const [, ax, az, bx, bz] of I.topoGrid.get(c) || []) {
      const sx = bx - ax, sz = bz - az, L = Math.hypot(sx, sz), d = nx * sz - nz * sx;
      if (L < 1e-6 || Math.abs(d) < 1e-12 || Math.abs((sx * tx + sz * tz) / L) < TOPO_COS) continue;
      const qx = ax - x, qz = az - z, t = (qx * sz - qz * sx) / d, w = (qx * nz - qz * nx) / d;
      if (w < 0 || w > 1 || Math.abs(t - tc) >= bd) continue;
      bd = Math.abs(t - tc); best = t;
    }
    return best;
  };
  const crossingAt = (x, z) => { for (const I of T) for (const c of I.crossings) if (x >= c.x0 - CROSS_PAD && x <= c.x1 + CROSS_PAD && z >= c.z0 - CROSS_PAD && z <= c.z1 + CROSS_PAD && (pip2(x, z, c.P) || nearPoly(x, z, c.P, CROSS_PAD))) return true; return false; };
  /** UrbIS covers (x, z): a tile with surfaces holds it */
  const covered = (x, z) => T.some((I) => I.has && x >= I.bounds.x0 && x < I.bounds.x1 && z >= I.bounds.z0 && z < I.bounds.z1);
  return { intervals, lineHit, topoHit, crossingAt, covered };
}
const nearPoly = (x, z, P, r) => { for (let i = 0, n = P.length / 2, j = n - 1; i < n; j = i++) { const ax = P[2 * j], az = P[2 * j + 1], bx = P[2 * i], bz = P[2 * i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-12, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); if (Math.hypot(x - ax - dx * u, z - az - dz * u) < r) return true; } return false; };

// ---------------------------------------------------------------- the network: chains, degrees, junctions

/** network.json -> { chains, byRoad (road id -> chain), nodes, deg, junctions (node id -> arms) }; cached on the doc */
const NETS = new WeakMap();
export function networkIndex(network, overrides = null) {
  let N = NETS.get(network);
  if (N) return N;
  const nodes = new Map(network.nodes.map((n) => [n.id, n]));
  const deg = new Map(), at = new Map();
  for (const r of network.roads) for (const [nd, end] of [[r.a, 0], [r.b, 1]]) { deg.set(nd, (deg.get(nd) || 0) + 1); (at.get(nd) || at.set(nd, []).get(nd)).push({ r, end }); }
  const pass = (nd) => deg.get(nd) === 2 && !nodes.get(nd)?.meta?.cut && at.get(nd)[0].r !== at.get(nd)[1].r;
  const used = new Set(), chains = [], byRoad = new Map();
  // a chain: roads joined through degree-2 nodes, walked from a non-pass node (or anywhere on a pure loop)
  const walk = (r0, fromEnd) => {
    const parts = [];
    let r = r0, rev = fromEnd === 1, nd = rev ? r.a : r.b;
    for (;;) {
      used.add(r.id); parts.push({ r, rev });
      if (!pass(nd)) break;
      const nx = at.get(nd).find((q) => q.r !== r);
      if (!nx || used.has(nx.r.id)) break;
      r = nx.r; rev = nx.end === 1; nd = rev ? r.a : r.b;
    }
    return parts;
  };
  const sorted = [...network.roads].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const r of sorted) {
    if (used.has(r.id)) continue;
    // start at a chain end: walk back through pass nodes first
    let s = r, rev = false, guard = 0;
    for (;;) {
      const nd = rev ? s.b : s.a;
      if (!pass(nd) || guard++ > 10000) break;
      const pv = at.get(nd).find((q) => q.r !== s);
      if (!pv || pv.r === r) break;
      rev = pv.end === 0; s = pv.r;
      if (s === r) break;
    }
    chains.push(walk(s, rev ? 1 : 0));
  }
  const out = [];
  for (const parts of chains) {
    const pts = [], sub = [];
    for (const { r, rev } of parts) {
      const P = [nodes.get(r.a), ...(r.pts || []), nodes.get(r.b)].filter(Boolean).map((p) => [p.x, p.z]);
      if (rev) P.reverse();
      const k0 = pts.length ? 1 : 0;
      sub.push({ r, rev, from: Math.max(0, pts.length - 1) });
      for (let k = k0; k < P.length; k++) pts.push(P[k]);
    }
    const A = parts[0].rev ? parts[0].r.b : parts[0].r.a, last = parts[parts.length - 1], B = last.rev ? last.r.a : last.r.b;
    const way = parts[0].r.meta?.osm ?? /^r([^_]+)_/.exec(parts[0].r.id)?.[1] ?? parts[0].r.id;
    const id = `s:${way}:${String(A).replace(/^n/, "")}-${String(B).replace(/^n/, "")}`;
    const ways = [...new Set(parts.flatMap(({ r }) => (r.meta?.osmWays?.length ? r.meta.osmWays : [r.meta?.osm ?? way]).map(String)))];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const c = { id, A, B, parts: sub, pts, ways, roads: parts.map((p) => p.r.id), x0, x1, z0, z1 };
    out.push(c);
    for (const p of parts) byRoad.set(p.r.id, c);
  }
  const ids = new Map(); for (const c of out) { const n = (ids.get(c.id) || 0) + 1; ids.set(c.id, n); if (n > 1) c.id += `~${n}`; }   // (two chains between the same nodes on the same way: a split loop)
  const junctions = new Map();
  for (const c of out) for (const [nd, end] of [[c.A, 0], [c.B, 1]]) if ((deg.get(nd) || 0) >= 3 && nodes.has(nd)) (junctions.get(nd) || junctions.set(nd, []).get(nd)).push({ c, end });
  N = { chains: out, byRoad, nodes, deg, junctions, overrides, grid: null };
  // a 64 m grid of chains for the tile query
  const g = new Map();
  out.forEach((c, k) => { for (let i = Math.floor(c.x0 / 64); i <= Math.floor(c.x1 / 64); i++) for (let j = Math.floor(c.z0 / 64); j <= Math.floor(c.z1 / 64); j++) (g.get(K(i, j)) || g.set(K(i, j), []).get(K(i, j))).push(k); });
  N.grid = g;
  NETS.set(network, N);
  return N;
}

/** the chains whose line comes within `pad` m of box b */
export function chainsNear(N, b, pad) {
  const out = new Set();
  for (let i = Math.floor((b.x0 - pad) / 64); i <= Math.floor((b.x1 + pad) / 64); i++) for (let j = Math.floor((b.z0 - pad) / 64); j <= Math.floor((b.z1 + pad) / 64); j++)
    for (const k of N.grid.get(K(i, j)) || []) { const c = N.chains[k]; if (c.x1 >= b.x0 - pad && c.x0 <= b.x1 + pad && c.z1 >= b.z0 - pad && c.z0 <= b.z1 + pad) out.add(c); }
  return [...out].sort((a, b2) => (a.id < b2.id ? -1 : 1));
}

/** the tiles whose measured inputs a chain's element reads: its corridor (+ REACH + FIND), and its end junctions' arms' */
export function chainTiles(N, c) {
  const pad = REACH + FIND + 2, set = new Set(tilesOfBox(c.x0 - pad, c.x1 + pad, c.z0 - pad, c.z1 + pad));
  return [...set].sort();
}

/** every tile whose measured inputs the model of tile box `bounds` reads (its chains' corridors and their end junctions' arms') */
export function neededTiles(N, bounds) {
  const set = new Set();
  for (const c of chainsNear(N, bounds, REACH + 2)) {
    for (const t of chainTiles(N, c)) set.add(t);
    for (const nd of [c.A, c.B]) if ((N.deg.get(nd) || 0) >= 3) for (const a of N.junctions.get(nd) || []) for (const t of chainTiles(N, a.c)) set.add(t);
  }
  return [...set].sort();
}

// ---------------------------------------------------------------- the lane stack of a chain part

const clone = (o) => JSON.parse(JSON.stringify(o));
/** the stack the engine would use for road r (its own lanes, else the type default), with the paint v2 decisions
 *  (viewer/streets/measuredPaint.js preparePaintV2: guessed bike lanes dropped, guessed parking unpainted) and the
 *  data/overrides.json centreLine "none" (applyRoadOverrides) */
function stackOf(r, overrides) {
  const t = ROAD_TYPES[r.type] || ROAD_TYPES.local;
  const st = r.lanes ? clone(r.lanes) : { center: { ...t.center, ...(t.center.kind === "line" ? { guess: true } : {}) }, left: t.left.map((l) => ({ ...l, ...(l.type === "bike" || l.type === "parking" ? { guess: true } : {}) })), right: t.right.map((l) => ({ ...l, ...(l.type === "bike" || l.type === "parking" ? { guess: true } : {}) })), _default: true };
  const way = /^r(\d+)_/.exec(r.id)?.[1];
  if (way && overrides?.centreLine?.[way] === "none") st.center = { ...(st.center || {}), kind: "none" };
  for (const side of ["left", "right"]) st[side] = (st[side] || []).filter((l) => !(l.type === "bike" && (l.guess || l.sharrow)));
  st.rank = t.rank ?? 1; st.residential = RESIDENTIAL.has(r.type); st.type = r.type;
  return st;
}
const carr = (l) => !!LANE_TYPES[l.type]?.carriage;
const MIN_W = { driving: 2.6, turn: 2.6, bus: 2.9, bike: 1.0, parking: 1.8, shoulder: 0.3 };
/** drop lanes from stack st (in place) until its carriage lanes' minimum widths fit the measured width W (each side its
 *  share of W by the stack's own widths): parking, then bike, then driving (one driving lane a side kept); -> lanes dropped */
function fitStack(st, W) {
  const cw = st.center?.width || 0, sw = (side) => (st[side] || []).filter(carr).reduce((a, l) => a + l.width, 0);
  const tot = sw("left") + sw("right");
  if (!(tot > 0)) return 0;
  let dropped = 0;
  for (const side of ["left", "right"]) {
    const lanes = st[side] || [], target = (Math.max(0.5, W - cw) * sw(side)) / tot;
    if (!sw(side)) continue;
    const minSum = () => lanes.filter(carr).reduce((a, l) => a + (MIN_W[l.type] ?? 1), 0);
    for (const ty of ["parking", "bike", "driving"]) {
      while (minSum() > target) {
        const drives = lanes.filter((l) => LANE_TYPES[l.type]?.drive).length;
        let idx = -1;
        for (let q = lanes.length - 1; q >= 0; q--) if (lanes[q].type === ty && (ty !== "driving" || drives > 1)) { idx = q; break; }
        if (idx < 0) break;
        lanes.splice(idx, 1); dropped++;
      }
    }
  }
  return dropped;
}

/** the boundaries of a stack across its carriageway, right outer -> left outer: [{ t (offset in the stack frame), w (stack
 *  lane width to its left, for the placement), code, role, park (the lane to its left is a guessed parking lane) }] */
function stackBoundaries(st) {
  const R = (st.right || []).filter((l) => l.present !== false), L = (st.left || []).filter((l) => l.present !== false);
  const Rc = R.filter(carr), Lc = L.filter(carr), cw = st.center?.width || 0;
  const code = (kind) => (kind && kind !== "curb" && kind !== "paveEdge" ? lineCode(markingStyle(kind, "eu", st.rank)) : 0);
  const out = [];
  // right side, outer -> inner: the boundary outside lane k is boundaryKind(Rc[k], next outer (carriage, else the first roadside))
  let t = -cw / 2 - Rc.reduce((a, l) => a + l.width, 0);
  for (let k = Rc.length - 1; k >= 0; k--) {
    const outer = k === Rc.length - 1 ? R[R.indexOf(Rc[k]) + 1] ?? null : Rc[k + 1];
    const kind = boundaryKind(Rc[k], outer);
    const guessPark = (Rc[k].type === "parking" && Rc[k].guess) || (outer?.type === "parking" && outer.guess);
    out.push({ t, code: guessPark && kind !== "edge" ? 0 : code(kind), role: k === Rc.length - 1 ? ROLE.edgeR : ROLE.lane, kind, lane: Rc[k] });
    t += Rc[k].width;
  }
  // centre
  {
    const kind = cw > 0 ? null : centerKind(Lc[0], Rc[0], st.center?.kind ?? "line");
    // (a one-way's "leftEdge": at the kerb when that side has no carriage lane, else a line between its lanes and a
    // parking / bike lane: a lane line)
    const role = kind === "leftEdge" ? (!Lc.length ? ROLE.edgeL : !Rc.length ? ROLE.edgeR : ROLE.lane) : ROLE.centre;
    const residentialGuess = st.residential && st.center?.kind === "line" && (st.center.guess || st._default);
    out.push({ t, code: code(kind), role, kind, topoOnly: residentialGuess && role === ROLE.centre, centreW: cw });
    t += cw;
  }
  for (let k = 0; k < Lc.length; k++) {
    t += Lc[k].width;
    const outer = k === Lc.length - 1 ? L[L.indexOf(Lc[k]) + 1] ?? null : Lc[k + 1];
    const kind = boundaryKind(Lc[k], outer);
    const guessPark = (Lc[k].type === "parking" && Lc[k].guess) || (outer?.type === "parking" && outer.guess);
    out.push({ t, code: guessPark && kind !== "edge" ? 0 : code(kind), role: k === Lc.length - 1 ? ROLE.edgeL : ROLE.lane, kind, lane: Lc[k] });
  }
  // lanes between boundaries (for the placement): lane i lies between out[i] and out[i + 1]
  const lanes = [...[...Rc].reverse(), ...(cw > 0 ? [{ type: "centre", width: cw }] : []), ...Lc];
  // (a centre of width 0 is a boundary, not a lane: drop the zero-width gap)
  return { bounds: out, lanes, cw, W: out[out.length - 1].t - out[0].t, nR: Rc.length, nL: Lc.length };
}

// ---------------------------------------------------------------- one segment

/** stations of a chain: s, x, z, the left normal (tz, -tx) of the tangent averaged over +-NWIN m */
function stations(pts) {
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const L = cum[cum.length - 1], n = Math.max(2, Math.round(L / STEP) + 1);
  const s = new Float64Array(n), x = new Float64Array(n), z = new Float64Array(n), nx = new Float64Array(n), nz = new Float64Array(n), part = new Int32Array(n);
  const at = (d) => { let k = 1; while (k < pts.length - 1 && cum[k] < d) k++; const a = pts[k - 1], b = pts[k], f = cum[k] > cum[k - 1] ? (d - cum[k - 1]) / (cum[k] - cum[k - 1]) : 0; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, k - 1]; };
  for (let i = 0; i < n; i++) { const d = (L * i) / (n - 1); const [px, pz, k] = at(d); s[i] = d; x[i] = px; z[i] = pz; part[i] = k; }
  for (let i = 0; i < n; i++) {
    const [ax, az] = at(Math.max(0, s[i] - NWIN)), [bx, bz] = at(Math.min(L, s[i] + NWIN));
    let tx = bx - ax, tz = bz - az, l = Math.hypot(tx, tz);
    if (l < 1e-6) { const k = Math.min(pts.length - 2, part[i]); tx = pts[k + 1][0] - pts[k][0]; tz = pts[k + 1][1] - pts[k][1]; l = Math.hypot(tx, tz) || 1; }
    tx /= l; tz /= l; nx[i] = tz; nz[i] = -tx;
  }
  return { s, x, z, nx, nz, part, L, n };
}

/** running median of v (NaN = none) over +-win m; NaN where none */
function runMedian(s, v, win) {
  const n = s.length, out = new Float64Array(n).fill(NaN), w = [];
  let lo = 0, hi = 0;
  for (let i = 0; i < n; i++) {
    while (s[lo] < s[i] - win) lo++;
    while (hi < n && s[hi] <= s[i] + win) hi++;
    w.length = 0; for (let j = lo; j < hi; j++) if (!Number.isNaN(v[j])) w.push(v[j]);
    if (w.length) { w.sort((a, b) => a - b); out[i] = w[w.length >> 1]; }
  }
  return out;
}

/**
 * The measurement of a chain: per station the driving / kerb ends and their confidence, from the measured inputs of
 * the tiles its corridor touches (Q = inputSet). Pure: the same chain and inputs give the same numbers in any tile.
 */
function measure(c, Q, N) {
  const S = stations(c.pts), n = S.n;
  // each station's stack carriage span round the OSM line (the chain's frame)
  const spans = c.parts.map(({ r, rev }) => { const b = stackBoundaries(stackOf(r, N.overrides)).bounds; const lo = b[0].t, hi = b[b.length - 1].t; return rev ? [-hi, -lo] : [lo, hi]; });
  const span = Array.from({ length: n }, (_, i) => { let p = 0; while (p + 1 < c.parts.length && c.parts[p + 1].from <= S.part[i]) p++; return spans[p]; });
  const kL = new Float64Array(n).fill(NaN), kR = new Float64Array(n).fill(NaN), dL = new Float64Array(n).fill(NaN), dR = new Float64Array(n).fill(NaN);
  const kindL = new Uint8Array(n), kindR = new Uint8Array(n), X = new Uint8Array(n), cov = new Uint8Array(n);
  const srcs = new Set();
  for (let i = 0; i < n; i++) {
    const x = S.x[i], z = S.z[i], nx = S.nx[i], nz = S.nz[i];
    cov[i] = Q.covered(x, z) ? 1 : 0;
    if (!cov[i]) continue;
    // (cost: a 12 m ray first; the full REACH only where a carriageway end runs out of it: the same ends either way)
    let iv = Q.intervals(x, z, nx, nz, NEAR_R);
    if (iv.length && ((iv[0].drive || iv[0].park) || (iv[iv.length - 1].drive || iv[iv.length - 1].park))) iv = Q.intervals(x, z, nx, nz, REACH);
    if (!iv.length) continue;
    // the driving carriageway of THIS road: the one overlapping its stack's carriage span most (a one-way half of a dual
    // carriageway, its OSM line at its left edge, takes its own half, not the other one as near), else the one holding
    // t = 0, else the nearest within FIND
    const [spLo, spHi] = span[i];
    let best = -1, bd = Infinity, ovBest = -1, dOv = Infinity, near = -1, dNear = Infinity;
    for (let k = 0; k < iv.length; k++) {
      if (!iv[k].drive || (k > 0 && iv[k - 1].drive)) continue;
      let e = k; while (e < iv.length - 1 && iv[e + 1].drive) e++;
      const ga = iv[k].a, gb = iv[e].b, ov = Math.min(gb, spHi) - Math.max(ga, spLo), d = ga > 0 ? ga : gb < 0 ? -gb : 0;
      if (ov > 1 && ov > ovBest) { ovBest = ov; best = k; dOv = d; }
      if (d < dNear) { dNear = d; near = k; }
    }
    if (best >= 0) bd = dOv; else { best = near; bd = dNear; }
    const onSurf = iv.some((q) => q.a <= 0 && q.b >= 0 && (q.drive || q.park));
    if (best < 0 || bd > FIND) { if (onSurf) X[i] = 1; continue; }
    let lo = best, hi = best;
    while (lo > 0 && iv[lo - 1].drive) lo--;
    while (hi < iv.length - 1 && iv[hi + 1].drive) hi++;
    let klo = lo, khi = hi;
    while (klo > 0 && (iv[klo - 1].drive || iv[klo - 1].park)) klo--;
    while (khi < iv.length - 1 && (iv[khi + 1].drive || iv[khi + 1].park)) khi++;
    const a = iv[lo].a, b = iv[hi].b, ka = iv[klo].a, kb = iv[khi].b;
    X[i] = bd > X_OFF ? 1 : 0;
    if (iv[best].src) srcs.add(iv[best].src);
    // ends: out of reach = none; on a measured kerb / street-edge line = M (the line's exact crossing)
    const R = Math.abs(iv[0].a);
    const end = (t) => {
      if (Math.abs(t) >= R - 1e-6) return [NaN, 0];
      const h = Q.lineHit(x, z, nx, nz, t);
      return h ? [h.t, h.kind] : [NaN, 0];
    };
    [kR[i], kindR[i]] = end(ka); [kL[i], kindL[i]] = end(kb);
    // the driving ends: the kerb where no bay lies between, else the bay's measured edge
    dR[i] = klo < lo ? (Math.abs(a) < R ? a : NaN) : kR[i];
    dL[i] = khi > hi ? (Math.abs(b) < R ? b : NaN) : kL[i];
  }
  // mouths / bays / build-outs: an end JUMP off its side's running median is not M (no edge line along a side street's mouth)
  const prune = (v) => { const med = runMedian(S.s, v, JUMP_WIN); for (let i = 0; i < n; i++) if (!Number.isNaN(v[i]) && !(Math.abs(v[i] - med[i]) <= JUMP)) v[i] = NaN; };
  prune(kL); prune(kR); prune(dL); prune(dR);
  return { S, kL, kR, dL, dR, kindL, kindR, X, cov, srcs: [...srcs].sort() };
}

/** fill: conf M where measured, D across gaps <= INTERP between M stations, else the fallback (O / G) */
function fill(S, v, fb, fbConf) {
  const n = S.n, out = new Float64Array(n), conf = new Uint8Array(n);
  let prev = -1;
  const nextM = new Int32Array(n).fill(-1);
  for (let i = n - 1, nx = -1; i >= 0; i--) { if (!Number.isNaN(v[i])) nx = i; nextM[i] = nx; }
  for (let i = 0; i < n; i++) {
    if (!Number.isNaN(v[i])) { out[i] = v[i]; conf[i] = CONF.M; prev = i; continue; }
    const nx = nextM[i];
    if (prev >= 0 && nx >= 0 && S.s[nx] - S.s[prev] <= INTERP) { const f = (S.s[i] - S.s[prev]) / (S.s[nx] - S.s[prev]); out[i] = v[prev] + (v[nx] - v[prev]) * f; conf[i] = CONF.D; }
    else { out[i] = fb[i]; conf[i] = fbConf[i]; }
  }
  return { v: out, conf };
}

/** the segment element of chain c (typed arrays + meta); M = measure(c, Q) */
function buildSegment(c, Mz, N, Q) {
  const { S } = Mz, n = S.n;
  // the stack of each station's chain part (OSM tags / the type default), with its boundaries
  const partOf = new Int32Array(n);
  for (let i = 0; i < n; i++) { let p = 0; while (p + 1 < c.parts.length && c.parts[p + 1].from <= S.part[i]) p++; partOf[i] = p; }
  // each part's stack fitted into its MEASURED driving width (the median over its stations with both driving ends M; as
  // viewer/surfaces.js fitRoadWidths: parking, then bike, then extra driving lanes dropped until the lanes' minimum widths
  // fit), so a 6.6 m Ch. de Saint-Job is not four lanes
  const stacks = c.parts.map(({ r, rev }, p) => {
    const st = stackOf(r, N.overrides), W = [];
    for (let i = 0; i < n; i++) if (partOf[i] === p && !Number.isNaN(Mz.dL[i]) && !Number.isNaN(Mz.dR[i])) W.push(Mz.dL[i] - Mz.dR[i]);
    let dropped = 0;
    if (W.length >= 3) { W.sort((a, b) => a - b); dropped = fitStack(st, W[W.length >> 1]); }
    return { st, sb: stackBoundaries(st), rev, tagged: !!r.lanes, dropped };
  });
  // a part walked against its road's direction: its right is the chain's left (mirror the boundaries)
  for (const P of stacks) if (P.rev) { const b = P.sb.bounds.map((q) => ({ ...q, t: -q.t, role: q.role === ROLE.edgeR ? ROLE.edgeL : q.role === ROLE.edgeL ? ROLE.edgeR : q.role })).reverse(); P.sb = { ...P.sb, bounds: b, lanes: [...P.sb.lanes].reverse(), nR: P.sb.nL, nL: P.sb.nR }; }
  // fallbacks: the stack's carriage ends (relative to the OSM line), conf O (tagged) / G (type default)
  const fbL = new Float64Array(n), fbR = new Float64Array(n), fbC = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const P = stacks[partOf[i]], b = P.sb.bounds; fbR[i] = b[0].t; fbL[i] = b[b.length - 1].t; fbC[i] = P.tagged ? CONF.O : CONF.G; }
  const KL = fill(S, Mz.kL, fbL, fbC), KR = fill(S, Mz.kR, fbR, fbC), DL = fill(S, Mz.dL, fbL, fbC), DR = fill(S, Mz.dR, fbR, fbC);
  // (one side measured, the other a fallback round the OSM line, can cross: the fallback side is then placed the stack's
  // width from the measured one; neither measured: both from the stack)
  const order = (A, B2) => {
    for (let i = 0; i < n; i++) {
      if (A.v[i] > B2.v[i] + 0.1) continue;
      const W = Math.max(0.5, fbL[i] - fbR[i]), mA = A.conf[i] <= CONF.D, mB = B2.conf[i] <= CONF.D;
      if (mA && !mB) B2.v[i] = A.v[i] - W;
      else if (mB && !mA) A.v[i] = B2.v[i] + W;
      else { A.v[i] = fbL[i]; B2.v[i] = fbR[i]; A.conf[i] = B2.conf[i] = Mz.X[i] ? CONF.X : fbC[i]; }
    }
  };
  order(KL, KR); order(DL, DR);
  for (let i = 0; i < n; i++) { if (DL.v[i] > KL.v[i]) DL.v[i] = KL.v[i]; if (DR.v[i] < KR.v[i]) DR.v[i] = KR.v[i]; }
  // axis: the measured mid-line (both kerbs M / D), else the OSM line
  const axOff = new Float64Array(n), axConf = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const mL = KL.conf[i] <= CONF.D, mR = KR.conf[i] <= CONF.D;
    if (mL && mR) { axOff[i] = (KL.v[i] + KR.v[i]) / 2; axConf[i] = Mz.X[i] ? CONF.X : KL.conf[i] === CONF.M && KR.conf[i] === CONF.M ? CONF.M : CONF.D; }
    else { axOff[i] = 0; axConf[i] = Mz.X[i] ? CONF.X : fbC[i]; }
  }
  // kerbs relative to the axis; height / kind
  const f32 = (a) => Float32Array.from(a);
  const kerb = (Kf, kind) => {
    const off = new Float32Array(n), h = new Float32Array(n), kd = new Uint8Array(n), conf = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      off[i] = Kf.v[i] - axOff[i]; conf[i] = Kf.conf[i];
      kd[i] = Kf.conf[i] === CONF.M ? kind[i] : KERB_KIND.none;
      h[i] = kd[i] === KERB_KIND.kerb || kd[i] === KERB_KIND.edgeRaised ? KERB_H : 0;
    }
    return { off, conf, h, kind: kd };
  };
  const kerbL = kerb(KL, Mz.kindL), kerbR = kerb(KR, Mz.kindR);
  const drive = { offL: f32(Array.from(DL.v, (v, i) => v - axOff[i])), offR: f32(Array.from(DR.v, (v, i) => v - axOff[i])), confL: DL.conf, confR: DR.conf };
  return { c, S, partOf, stacks, axOff, axConf, kerbL, kerbR, drive, X: Mz.X, srcs: Mz.srcs };
}

/** the lanes of a built segment, given its mouth stations at both ends (junction clip) */
function placeLanes(seg, mouthA, mouthB, Q) {
  const { S, stacks, partOf, kerbL, kerbR, drive, axOff } = seg, n = S.n;
  const B = Math.max(...stacks.map((P) => P.sb.bounds.length));
  const off = new Float32Array(n * B).fill(NaN), code = new Float32Array(n * B), role = new Uint8Array(n * B), bconf = new Uint8Array(n * B).fill(CONF.O);
  const conf = new Uint8Array(n), topo = new Float64Array(n * B).fill(NaN);
  // stable runs of the driving width (both drive ends M): width within +-STABLE_W over >= STABLE_LEN m
  const ok = new Uint8Array(n);
  for (let i = 0; i < n; i++) ok[i] = drive.confL[i] === CONF.M && drive.confR[i] === CONF.M ? 1 : 0;
  const stable = new Uint8Array(n);
  for (let i = 0; i < n;) {
    if (!ok[i]) { i++; continue; }
    let j = i, lo = Infinity, hi = -Infinity;
    while (j < n && ok[j]) { const w = drive.offL[j] - drive.offR[j]; const nlo = Math.min(lo, w), nhi = Math.max(hi, w); if (nhi - nlo > 2 * STABLE_W) break; lo = nlo; hi = nhi; j++; }
    if (S.s[j - 1] - S.s[i] >= STABLE_LEN) { for (let k = i; k < j; k++) stable[k] = 1; i = j; } else i++;
  }
  for (let i = 0; i < n; i++) {
    const P = stacks[partOf[i]], bnd = P.sb.bounds, lanes = P.sb.lanes;
    const inJ = S.s[i] < mouthA || S.s[i] > S.L - mouthB;
    const lo = drive.offR[i], hi = drive.offL[i], W1 = hi - lo;
    // measured parking bays on a side: the stack's own parking lanes there are those bays (dropped from the placement)
    const bayR = kerbR.off[i] < lo - 0.3, bayL = kerbL.off[i] > hi + 0.3;
    // widths: guessed / kept parking lanes at most PARK_W, the others share the rest by their stack widths
    const wid = lanes.map((l, k) => (l.type === "parking" && ((k < P.sb.nR && bayR) || (k >= P.sb.nR && bayL)) ? 0 : l.width));
    const fixed = lanes.map((l, k) => (l.type === "parking" && wid[k] ? Math.min(wid[k], PARK_W) : null));
    const fx = fixed.reduce((a, w) => a + (w ?? 0), 0), rest0 = wid.reduce((a, w, k) => a + (fixed[k] == null ? w : 0), 0);
    const scale = rest0 > 0 ? (W1 - fx) / rest0 : 1;
    const linear = scale < 0.5 || !(W1 > 0);
    const tot = wid.reduce((a, w) => a + w, 0) || 1;
    const pos = [lo];
    for (let k = 0; k < lanes.length; k++) pos.push(pos[k] + (linear ? (wid[k] * W1) / tot : fixed[k] ?? wid[k] * scale));
    // a centre of width 0: one boundary; with a width: its two boundaries share the centre lane's span (only the first carries the centre code)
    let narrow = false;
    for (let k = 0; k < lanes.length; k++) if (LANE_TYPES[lanes[k].type]?.drive && pos[k + 1] - pos[k] < MIN_LANE && wid[k] > 0) narrow = true;
    const cb = P.sb.cw > 0 ? 1 : 0;
    for (let k = 0; k < bnd.length; k++) {
      const q = bnd[k], idx = i * B + k;
      // boundary k sits at pos[k] (with a centre lane, the centre boundary is the lane's middle)
      const t = cb && q.role === ROLE.centre ? (pos[k] + pos[k + 1]) / 2 : pos[Math.min(k + (cb && k > P.sb.nR ? 1 : 0), pos.length - 1)];
      off[idx] = t; code[idx] = q.code; role[idx] = q.role;
      // per-boundary confidence: edges from their kerb (M only), lane / centre lines M from a Topo line, D on a stable width
      let bc;
      if (q.role === ROLE.edgeR || q.role === ROLE.edgeL) bc = (q.role === ROLE.edgeR ? kerbR.conf[i] : kerbL.conf[i]) === CONF.M && (q.role === ROLE.edgeR ? !bayR : !bayL) ? CONF.M : CONF.O;
      else {
        const tx = -S.nz[i], tz = S.nx[i];
        const th = Q.topoHit(S.x[i], S.z[i], S.nx[i], S.nz[i], t + axOff[i], tx, tz);
        if (th != null) topo[idx] = th - axOff[i] - t;      // (judged below, along the boundary)
        bc = q.topoOnly ? CONF.O : narrow && q.role === ROLE.lane ? CONF.X : stable[i] ? CONF.D : seg.X[i] ? CONF.X : CONF.O;
      }
      if (inJ) bc = Math.max(bc, CONF.O);
      bconf[idx] = bc;
    }
    conf[i] = inJ ? CONF.O : narrow ? CONF.X : stable[i] ? CONF.D : seg.X[i] ? CONF.X : drive.confL[i] <= CONF.D && drive.confR[i] <= CONF.D ? CONF.D : Math.max(drive.confL[i], drive.confR[i]);
  }
  // a measured lane line (UrbIS Topo / BM) snaps a boundary only where its offset from the derived place is steady: the
  // +-TOPO_WIN m median of the hits, each hit within TOPO_DEV of it (a hit on a neighbouring line or an island outline
  // drew zig-zags); the boundary then takes the median (M), not each raw hit
  for (let b = 0; b < B; b++) {
    const v = new Float64Array(n); for (let i = 0; i < n; i++) v[i] = topo[i * B + b];
    if (!v.some((q) => !Number.isNaN(q))) continue;
    const med = runMedian(S.s, v, TOPO_WIN);
    for (let i = 0; i < n; i++) {
      const idx = i * B + b;
      if (Number.isNaN(v[i]) || !(Math.abs(v[i] - med[i]) <= TOPO_DEV) || bconf[idx] === CONF.O && (S.s[i] < mouthA || S.s[i] > S.L - mouthB)) continue;
      let k = 0; for (let j = Math.max(0, i - TOPO_WIN); j <= Math.min(n - 1, i + TOPO_WIN); j++) if (!Number.isNaN(v[j]) && Math.abs(v[j] - med[i]) <= TOPO_DEV) k++;
      if (k < TOPO_WIN) continue;                  // (a hit on at least half of the window's stations)
      off[idx] += med[i]; bconf[idx] = CONF.M;
    }
  }
  return { B, off, code, role, bconf, conf };
}

// ---------------------------------------------------------------- junctions

/** stack kerb-to-kerb width of a chain at an end (for the junction floor, as tools/audit/census/lib_find.mjs) */
function stackWidthAt(c, end, N) { const p = c.parts[end ? c.parts.length - 1 : 0]; const sb = stackBoundaries(stackOf(p.r, N.overrides)); return Math.max(2, sb.W); }

/** the mouth station of an arm (distance from its junction node): the first station past the floor where both kerbs are M
 *  on the arm's median measured width (+-0.5 m) for 3 m running; the floor where nothing is measured */
function mouthOf(seg, end, floor) {
  const { S, kerbL, kerbR } = seg, n = S.n, L = S.L;
  const W = [];
  for (let i = 0; i < n; i++) if (kerbL.conf[i] === CONF.M && kerbR.conf[i] === CONF.M) W.push(kerbL.off[i] - kerbR.off[i]);
  const cap = Math.min(MOUTH_MAX, L / 2);
  if (W.length < 5) return { s: Math.min(floor, cap), m: false };
  W.sort((a, b) => a - b); const med = W[W.length >> 1];
  let run = 0;
  for (let q = 0; q < n; q++) {
    const i = end ? n - 1 - q : q, d = end ? L - S.s[i] : S.s[i];
    if (d > cap) break;
    if (d < floor) continue;
    const good = kerbL.conf[i] === CONF.M && kerbR.conf[i] === CONF.M && Math.abs(kerbL.off[i] - kerbR.off[i] - med) <= 0.5;
    run = good ? run + STEP : 0;
    if (run >= 3) return { s: Math.max(floor, d - 3 + STEP), m: true };
  }
  return { s: Math.min(Math.max(floor, cap), cap), m: false };
}

// ---------------------------------------------------------------- the model of a tile

/**
 * The street model of a tile: every segment whose corridor reaches the tile and every junction whose polygon does, each
 * built once per process (`store`, keyed by id) from the unclipped measured inputs (`inputsOf(tileName) -> tileInputs |
 * null`, cached by the caller).
 *   network   data/roads/network.json (parsed); overrides data/overrides.json
 *   tile      the tile name; bounds its box
 * Returns { tile, segments: [element], junctions: [element], stats }.
 */
export function buildStreetModel({ network, overrides, tile, bounds, inputsOf, store = new Map() }) {
  const N = networkIndex(network, overrides);
  const t0 = (globalThis.performance ?? Date).now();
  const near = chainsNear(N, bounds, REACH + 2);
  const meas = (c) => {
    const k = `m|${c.id}`;
    let m = store.get(k);
    if (!m) { const Q = inputSet(chainTiles(N, c).map(inputsOf)); m = { M: measure(c, Q, N), Q }; m.seg = buildSegment(c, m.M, N, Q); store.set(k, m); }
    return m;
  };
  // junction floors / mouths (per node, cached): arms' mouths from their own measurement
  const junction = (nd) => {
    const k = `j|${nd}`;
    let J = store.get(k);
    if (J) return J;
    const arms = N.junctions.get(nd) || [];
    const ws = arms.map((a) => stackWidthAt(a.c, a.end, N)).sort((a, b) => b - a);
    const floor = ws.length >= 2 ? Math.hypot(ws[0] / 2, ws[1] / 2) : 0;
    const node = N.nodes.get(nd);
    const A = arms.map((a) => { const m = meas(a.c); const mo = mouthOf(m.seg, a.end, floor); return { a, m, mo }; });
    // the polygon: each arm's two mouth kerb points, ordered round the node
    const pts = [];
    for (const { a, m, mo } of A) {
      const sg = m.seg, S = sg.S, i = a.end ? Math.max(0, Math.min(S.n - 1, Math.round((S.L - mo.s) / STEP))) : Math.max(0, Math.min(S.n - 1, Math.round(mo.s / STEP)));
      for (const off of [sg.kerbL.off[i] + sg.axOff[i], sg.kerbR.off[i] + sg.axOff[i]]) pts.push([S.x[i] + S.nx[i] * off, S.z[i] + S.nz[i] * off]);
    }
    pts.sort((p, q) => Math.atan2(p[1] - node.z, p[0] - node.x) - Math.atan2(q[1] - node.z, q[0] - node.x));
    const poly = Float32Array.from(pts.flat());
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const conf = A.every((q) => q.mo.m) ? CONF.M : A.some((q) => q.mo.m) ? CONF.D : CONF.O;
    J = { kind: "junction", id: `j:${String(nd).replace(/^n/, "")}`, node: nd, owner: tileOf(node.x, node.z), x: node.x, z: node.z, floor, poly, conf,
      arms: A.map(({ a, mo }) => ({ seg: a.c.id, end: a.end, mouth: Math.round(mo.s * 1000) / 1000, conf: mo.m ? CONF.M : CONF.O })), x0, x1, z0, z1 };
    store.set(k, J);
    return J;
  };
  const element = (c) => {
    const k = `e|${c.id}`;
    let E = store.get(k);
    if (E) return E;
    const m = meas(c), sg = m.seg;
    const jA = (N.deg.get(c.A) || 0) >= 3 && N.nodes.has(c.A) ? junction(c.A) : null, jB = (N.deg.get(c.B) || 0) >= 3 && N.nodes.has(c.B) ? junction(c.B) : null;
    const mouthA = jA ? jA.arms.find((q) => q.seg === c.id && q.end === 0)?.mouth ?? 0 : 0, mouthB = jB ? jB.arms.find((q) => q.seg === c.id && q.end === 1)?.mouth ?? 0 : 0;
    const lanes = placeLanes(sg, mouthA, mouthB, m.Q);
    const S = sg.S, n = S.n;
    // the axis points, the carriageway ring, the crossings along it (lines stop there)
    const ax = new Float64Array(n), az = new Float64Array(n);
    for (let i = 0; i < n; i++) { ax[i] = S.x[i] + S.nx[i] * sg.axOff[i]; az[i] = S.z[i] + S.nz[i] * sg.axOff[i]; }
    const ring = new Float32Array(4 * n);
    for (let i = 0; i < n; i++) { ring[2 * i] = ax[i] + S.nx[i] * sg.kerbR.off[i]; ring[2 * i + 1] = az[i] + S.nz[i] * sg.kerbR.off[i]; const j = 2 * n - 1 - i; ring[2 * j] = ax[i] + S.nx[i] * sg.kerbL.off[i]; ring[2 * j + 1] = az[i] + S.nz[i] * sg.kerbL.off[i]; }
    const cross = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (m.Q.crossingAt(ax[i], az[i])) cross[i] = 1;
    const L = S.L, mi = Math.min(n - 1, Math.round(L / 2 / STEP));
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (let k = 0; k < ring.length; k += 2) { x0 = Math.min(x0, ring[k]); x1 = Math.max(x1, ring[k]); z0 = Math.min(z0, ring[k + 1]); z1 = Math.max(z1, ring[k + 1]); }
    E = {
      kind: "segment", v: MODEL_VERSION, id: c.id, owner: tileOf(S.x[mi], S.z[mi]), A: c.A, B: c.B, length: Math.round(L * 1000) / 1000,
      sources: { osm: c.ways, roads: c.roads, urbis: sg.srcs },
      stacks: sg.stacks.map((P) => ({ type: P.st.type, rank: P.st.rank, tagged: P.tagged, rev: P.rev, dropped: P.dropped })),
      junctionA: jA?.id ?? null, junctionB: jB?.id ?? null, mouthA, mouthB,
      n, s: Float32Array.from(S.s), nx: Float32Array.from(S.nx), nz: Float32Array.from(S.nz), ax: Float32Array.from(ax), az: Float32Array.from(az), axConf: sg.axConf, part: Uint8Array.from(sg.partOf),
      kerbL: sg.kerbL, kerbR: sg.kerbR, drive: sg.drive, ring, cross, lanes, x0, x1, z0, z1,
    };
    store.set(k, E);
    return E;
  };
  const touches = (o) => o.x1 >= bounds.x0 && o.x0 <= bounds.x1 && o.z1 >= bounds.z0 && o.z0 <= bounds.z1;
  const segments = [], junctions = new Map();
  for (const c of near) {
    const E = element(c);
    if (!touches(E)) continue;
    segments.push(E);
    for (const jid of [E.junctionA, E.junctionB]) if (jid) { const J = store.get(`j|${jid === E.junctionA ? E.A : E.B}`); if (J && touches(J)) junctions.set(J.id, J); }
  }
  const own = segments.filter((e) => e.owner === tile).length;
  return { tile, version: MODEL_VERSION, segments, junctions: [...junctions.values()].sort((a, b) => (a.id < b.id ? -1 : 1)), junctionAt: junctionTest([...junctions.values()]),
    stats: { segments: segments.length, own, copies: segments.length - own, junctions: junctions.size, ms: Math.round((globalThis.performance ?? Date).now() - t0) } };
}

/** (x, z) inside one of the junctions: the junction | null */
function junctionTest(J) {
  // (its polygon, and the disc of its floor radius round the node: the two widest arms' crossing, where a mouth polygon
  // of a skewed or unmeasured junction is thin)
  return (x, z) => { for (const j of J) { if ((x - j.x) ** 2 + (z - j.z) ** 2 < j.floor * j.floor) return j; if (x >= j.x0 && x <= j.x1 && z >= j.z0 && z <= j.z1 && pip2(x, z, j.poly)) return j; } return null; };
}

// ---------------------------------------------------------------- canonical bytes (seam identity, rule street-model)

const ARRAYS_SEG = ["s", "nx", "nz", "ax", "az", "axConf", "part", "ring", "cross"];
/** the canonical byte form of an element: its meta JSON + every typed array in a fixed order */
export function elementBytes(E) {
  const parts = [];
  const meta = E.kind === "segment"
    ? { kind: E.kind, v: E.v, id: E.id, owner: E.owner, A: E.A, B: E.B, length: E.length, sources: E.sources, stacks: E.stacks, junctionA: E.junctionA, junctionB: E.junctionB, mouthA: E.mouthA, mouthB: E.mouthB, n: E.n, B: E.lanes.B }
    : { kind: E.kind, id: E.id, node: E.node, owner: E.owner, x: E.x, z: E.z, floor: E.floor, conf: E.conf, arms: E.arms };
  parts.push(new TextEncoder().encode(JSON.stringify(meta)));
  const push = (a) => parts.push(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
  if (E.kind === "segment") {
    for (const k of ARRAYS_SEG) push(E[k]);
    for (const K2 of [E.kerbL, E.kerbR]) for (const k of ["off", "conf", "h", "kind"]) push(K2[k]);
    for (const k of ["offL", "offR", "confL", "confR"]) push(E.drive[k]);
    for (const k of ["off", "code", "role", "bconf", "conf"]) push(E.lanes[k]);
  } else push(E.poly);
  return parts;
}
/** FNV-1a 32 x 2 over the canonical bytes: a 16-hex-digit hash */
export function elementHash(E) {
  let h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0x5bd1e995;
  for (const p of elementBytes(E)) for (let i = 0; i < p.length; i++) { h1 = Math.imul(h1 ^ p[i], 0x01000193) >>> 0; h2 = Math.imul(h2 ^ p[i], 0x5bd1e995) >>> 0; h2 = (h2 ^ (h2 >>> 15)) >>> 0; }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------- schema (the gate row `model`)

const SEG_RE = /^s:[^:\s]+:[^:\s]+-[^:\s]+(~\d+)?$/, JUN_RE = /^j:[^:\s]+$/;
/** the problems of one element (schema + a confidence on every station): [string] */
export function validateElement(E) {
  const bad = [], w = (m) => bad.push(`${E.id}: ${m}`);
  const conf = (a, what) => { if (!(a instanceof Uint8Array)) return w(`${what} is not a Uint8Array`); for (let i = 0; i < a.length; i++) if (a[i] > CONF.X) return w(`${what}[${i}] = ${a[i]} is no confidence`); };
  if (!/^[A-Z]\d+$/.test(E.owner || "")) w("no owner tile");
  if (E.kind === "segment") {
    if (!SEG_RE.test(E.id)) w("id is not s:<way>:<nodeA>-<nodeB>");
    const n = E.n;
    if (!(n >= 2)) w("fewer than 2 stations");
    for (const k of ["s", "nx", "nz", "ax", "az"]) if (!(E[k] instanceof Float32Array) || E[k].length !== n) w(`${k} is not Float32[${n}]`);
    for (let i = 1; i < n; i++) if (!(E.s[i] > E.s[i - 1])) { w("stations not increasing"); break; }
    conf(E.axConf, "axConf");
    for (const [nm, K2] of [["kerbL", E.kerbL], ["kerbR", E.kerbR]]) {
      if (!K2 || K2.off?.length !== n || K2.h?.length !== n || K2.kind?.length !== n) { w(`${nm} arrays are not [${n}]`); continue; }
      conf(K2.conf, `${nm}.conf`);
      for (let i = 0; i < n; i++) { if (!Number.isFinite(K2.off[i])) { w(`${nm}.off[${i}] not finite`); break; } if (K2.conf[i] === CONF.M && K2.kind[i] === KERB_KIND.none) { w(`${nm}[${i}] is M with no measured line`); break; } }
    }
    for (let i = 0; i < n; i++) if (!(E.kerbL.off[i] > E.kerbR.off[i] - 1e-6)) { w(`kerbL right of kerbR at station ${i}`); break; }
    conf(E.drive.confL, "drive.confL"); conf(E.drive.confR, "drive.confR");
    if (E.ring?.length !== 4 * n) w("ring is not 2n points");
    const L = E.lanes;
    if (!L || L.off.length !== n * L.B || L.code.length !== n * L.B || L.role.length !== n * L.B) w("lanes arrays are not n x B");
    else { conf(L.bconf, "lanes.bconf"); conf(L.conf, "lanes.conf"); }
    const anyM = [E.kerbL.conf, E.kerbR.conf].some((a) => a.includes(CONF.M));
    if (anyM && !E.sources?.urbis?.length) w("M kerbs name no UrbIS source");
    if (!E.sources?.osm?.length || !E.sources?.roads?.length) w("no OSM sources");
  } else if (E.kind === "junction") {
    if (!JUN_RE.test(E.id)) w("id is not j:<node>");
    if (!(E.poly instanceof Float32Array) || E.poly.length < 6) w("polygon has < 3 points");
    if (!(E.conf <= CONF.X)) w("no confidence");
    if (!(E.arms?.length >= 3)) w("fewer than 3 arms");
    for (const a of E.arms || []) if (!(a.conf <= CONF.X)) w(`arm ${a.seg} has no confidence`);
  } else w(`unknown kind ${E.kind}`);
  return bad;
}
