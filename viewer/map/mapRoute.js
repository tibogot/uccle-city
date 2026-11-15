// THE GPS ROUTE (game kit, docs/GAMEKIT.md "Waypoints"): A* over the baked road graph of the map (viewer/map/mapData.js:
// 4,531 roads, all of Uccle, one-way flags, classes), run in the map worker (viewer/map/mapWorker.js 'route').
// Why not the traffic lane graph: it exists only for the loaded full tiles (3 x 3 around the player), a mission target
// is often 1-3 km away; the map's graph is the same OSM network, city-wide and already in memory.
//
// routeOn(M, x0, z0, x1, z1, car) -> { pts: [x, z, x, z, ...] from the start snap to the end snap, len (m) } or null
//   car = true: one-way streets only a -> b (OSM direction), service roads cost x2, living streets x1.4;
//   car = false (on foot, by bike, flying): every road both ways, plain length.

/** points of road r between distances s0 and s1 along it (s1 < s0: reversed) */
function piece(r, s0, s1) {
  const pts = r.pts, P = r._cum || (r._cum = cum(pts));
  const lo = Math.min(s0, s1), hi = Math.max(s0, s1), out = [];
  const at = (s) => {
    for (let k = 1; k < pts.length; k++) if (P[k] >= s || k === pts.length - 1) {
      const t = Math.max(0, Math.min(1, (s - P[k - 1]) / Math.max(1e-6, P[k] - P[k - 1])));
      return [pts[k - 1].x + (pts[k].x - pts[k - 1].x) * t, pts[k - 1].z + (pts[k].z - pts[k - 1].z) * t];
    }
    return [pts[0].x, pts[0].z];
  };
  out.push(...at(lo));
  for (let k = 0; k < pts.length; k++) if (P[k] > lo && P[k] < hi) out.push(pts[k].x, pts[k].z);
  out.push(...at(hi));
  if (s1 >= s0) return out;
  const rev = [];
  for (let i = out.length - 2; i >= 0; i -= 2) rev.push(out[i], out[i + 1]);
  return rev;
}
function cum(pts) {
  const P = [0];
  for (let k = 1; k < pts.length; k++) P.push(P[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z));
  return P;
}
/** metres from the road's start (node a) to a near() hit */
const along = (h) => { const P = h.r._cum || (h.r._cum = cum(h.r.pts)); const a = P[h.k - 1], b = P[h.k]; return a + (b - a) * h.t; };

export function routeOn(M, x0, z0, x1, z1, car = true) {
  // the start / end snaps: car routes avoid starting on a service road when a real street is as close
  const pick = (x, z) => { const c = M.near(x, z, 200); return c.find((h) => h.r.cls < 5 && h.d < c[0].d + 15) || c[0]; };
  const A = pick(x0, z0), B = pick(x1, z1);
  if (!A || !B) return null;
  const R = M.roads;
  const f = (r) => (car && r.cls === 5 ? 2 : car && r.cls === 4 ? 1.4 : 1);
  const sA = along(A), sB = along(B);
  if (A.r === B.r && (!car || !A.r.oneway || sB >= sA)) return { pts: piece(A.r, sA, sB), len: Math.abs(sB - sA) };
  if (!M._nodeXZ) {
    M._nodeXZ = new Map();
    for (const r of R) { M._nodeXZ.set(r.a, r.pts[0]); M._nodeXZ.set(r.b, r.pts[r.pts.length - 1]); }
  }
  const NX = M._nodeXZ;
  const h = (n) => { const p = NX.get(n); return Math.hypot(p.x - B.px, p.z - B.pz); };
  const g = new Map(), from = new Map(), open = [];
  const push = (n, gv, via) => {
    if (gv >= (g.get(n) ?? Infinity)) return;
    g.set(n, gv); from.set(n, via);
    open.push([gv + h(n), n]);
    for (let i = open.length - 1; i > 0;) { const p = (i - 1) >> 1; if (open[p][0] <= open[i][0]) break; [open[p], open[i]] = [open[i], open[p]]; i = p; }
  };
  const pop = () => {
    const top = open[0], last = open.pop();
    if (open.length) {
      open[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < open.length && open[l][0] < open[m][0]) m = l;
        if (r < open.length && open[r][0] < open[m][0]) m = r;
        if (m === i) break;
        [open[m], open[i]] = [open[i], open[m]]; i = m;
      }
    }
    return top;
  };
  push(A.r.b, (A.r.len - sA) * f(A.r), { road: A.r.i, start: true, fwd: true });
  if (!car || !A.r.oneway) push(A.r.a, sA * f(A.r), { road: A.r.i, start: true, fwd: false });
  const endCost = (n) => (n === B.r.a ? sB * f(B.r) : n === B.r.b && (!car || !B.r.oneway) ? (B.r.len - sB) * f(B.r) : Infinity);
  let best = Infinity, bestNode = -1, it = 0;
  const closed = new Set();
  while (open.length && it++ < 80000) {
    const [fv, n] = pop();
    if (closed.has(n)) continue;
    if (fv >= best) break;
    closed.add(n);
    const gn = g.get(n), ec = endCost(n);
    if (gn + ec < best) { best = gn + ec; bestNode = n; }
    for (const ri of M.nodeRoads.get(n) || []) {
      const r = R[ri];
      if (r.a === n) push(r.b, gn + r.len * f(r), { road: ri, fwd: true, prev: n });
      if (r.b === n && (!car || !r.oneway)) push(r.a, gn + r.len * f(r), { road: ri, fwd: false, prev: n });
    }
  }
  if (bestNode < 0) return null;
  const chain = [];
  for (let n = bestNode, k = 0; k < 10000; k++) { const v = from.get(n); chain.push(v); if (v.start) break; n = v.prev; }
  chain.reverse();
  const pts = [];
  let len = 0;
  for (const v of chain) {
    const r = R[v.road];
    if (v.start) { pts.push(...(v.fwd ? piece(r, sA, r.len) : piece(r, sA, 0))); len += v.fwd ? r.len - sA : sA; }
    else { pts.push(...(v.fwd ? piece(r, 0, r.len) : piece(r, r.len, 0))); len += r.len; }
  }
  if (bestNode === B.r.a) { pts.push(...piece(B.r, 0, sB)); len += sB; }
  else { pts.push(...piece(B.r, B.r.len, sB)); len += B.r.len - sB; }
  return { pts, len };
}
