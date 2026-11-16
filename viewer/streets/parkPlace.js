// PARKED-CAR SLOTS (no three.js: viewer/cars.js draws them, tools/audit/streetAudit.mjs checks them in node).
import { ROAD_TYPES, resolveStack, layoutAt } from "../../vendor/roads/roadCrossSection.js";

const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

/** The parking slots: [{ x, z, yaw, c }] (yaw: local +x = the bonnet along the traffic). `place(x, z, yaw)`
 *  (?roads=surface, viewer/streetFit.js): moves a parked car against the measured kerb, or drops it (null) when it would
 *  not stand wholly on the carriageway. */
export function carSites(roads, feats, bounds, place, nColours = 8) {
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const avoid = (feats.points || []).filter((p) => p.kind === "crossing" || p.kind === "bus_stop" || p.kind === "traffic_signals")
    .map((p) => [p.x, p.z, p.kind === "bus_stop" ? 15 : 10]);
  // never on a tram reservation: drop slots within 3 m of an OSM tram track or platform
  const rails = [];
  for (const l of feats.lines || []) if (l.kind === "tram" || l.kind === "platform") for (let i = 1; i < l.line.length; i++) rails.push([...l.line[i - 1], ...l.line[i]]);
  const onRails = (x, z) => rails.some(([ax, az, bx, bz]) => {
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2 < 9;
  });
  const sites = [];
  for (const r of roads.roads) {
    if (!ROAD_TYPES[r.type] || r.meta?.highway === "service") continue;
    let stack;
    try { stack = resolveStack(r); } catch { continue; }
    if (![...stack.sides.left, ...stack.sides.right].some((l) => l.type === "parking")) continue;
    const pts = [N.get(r.a), ...r.pts, N.get(r.b)].filter(Boolean);
    let total = 0;
    const segL = [];
    for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); segL.push(L); total += L; }
    let s = 12, seg = 0, acc = 0, k = 0;
    while (s < total - 12) {
      while (seg < segL.length - 1 && acc + segL[seg] < s) acc += segL[seg++];
      const a = pts[seg], b = pts[seg + 1], L = segL[seg] || 1, tt = (s - acc) / L;
      const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L, lx = dz, lz = -dx;      // the road engine's left normal
      const lay = layoutAt(stack, s, total);
      for (const side of ["left", "right"]) {
        const lane = lay[side].find((l) => l.type === "parking" && l.w > 1.6);
        if (!lane) continue;
        const off = (lane.tIn + lane.tOut) / 2;                                     // signed, left positive
        let x = a.x + (b.x - a.x) * tt + lx * off, z = a.z + (b.z - a.z) * tt + lz * off;
        const hv = hash(x * 0.37, z * 0.53 + k);
        // right-hand traffic: cars face the direction of their side's traffic
        let fwd = side === "right" ? Math.atan2(-dz, dx) : Math.atan2(dz, -dx);
        if (place) {
          const p = place(x, z, fwd);
          if (!p || sites.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 25)) { k++; continue; }
          x = p.x; z = p.z; fwd = p.yaw;
        }
        const ok = hv < 0.65 && x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1
          && !avoid.some(([ax, az, rr]) => (ax - x) ** 2 + (az - z) ** 2 < rr * rr) && !onRails(x, z);
        if (ok) sites.push(place ? { x, z, yaw: fwd + (hv - 0.3) * 0.02, c: Math.floor(hash(z, x) * nColours) }
          : { x: x + dx * (hv - 0.3) * 0.6, z: z + dz * (hv - 0.3) * 0.6, yaw: fwd + (hv - 0.3) * 0.04, c: Math.floor(hash(z, x) * nColours) });
        k++;
      }
      s += 5.6;
    }
  }
  return sites;
}


// PARKED CARS THAT LEAVE THE STREET OPEN (citydefects 2026-11-16, owner playtest: "traffic driving through parked cars",
// "parked cars on streets that become blocked"). The slots come from the lanes BEFORE the width fit (the OSM / type
// parking), the traffic drives the lanes AFTER it (viewer/traffic/trafficGraph.js on the engine's fitted lanes): where the
// fit dropped the parking lane, the traffic lanes ran through the parked cars, and on narrow streets cars on both kerbs
// left less than a car's width. Kept now only: a car whose body (CAR_HALF + a margin) stays off every traffic lane's
// centre line by LANE_CLEAR, and that leaves PASS m of carriageway to the far kerb (minus a car kept opposite within 6 m).
// ?parkclear=old: every slot as before.
const LANE_CLEAR = 1.95, PASS = 3.0, CAR_HALF = 0.9, CELL = 8;

/** sites -> the kept sites. graph: the tile's traffic graph (xy, off, paths, kind), or null; inside(x, z): carriageway
 *  test (viewer/streets/carriageway.js), nearest(x, z): its nearest road centre point ({ px, pz }). Returns
 *  { kept, onLane, narrow } */
export function parkingClear(sites, { graph = null, inside = null, nearest = null } = {}) {
  const segs = new Map(), key = (i, j) => (i + 4096) * 8192 + (j + 4096);
  if (graph) for (let p = 0; p < graph.paths; p++) {
    for (let k = graph.off[p] + 1; k < graph.off[p + 1]; k++) {
      const ax = graph.xy[(k - 1) * 2], az = graph.xy[(k - 1) * 2 + 1], bx = graph.xy[k * 2], bz = graph.xy[k * 2 + 1];
      for (let i = Math.floor((Math.min(ax, bx) - 2) / CELL); i <= Math.floor((Math.max(ax, bx) + 2) / CELL); i++)
        for (let j = Math.floor((Math.min(az, bz) - 2) / CELL); j <= Math.floor((Math.max(az, bz) + 2) / CELL); j++) {
          const kk = key(i, j); if (!segs.has(kk)) segs.set(kk, []); segs.get(kk).push([ax, az, bx, bz]);
        }
    }
  }
  const laneDist = (x, z) => {
    let best = Infinity;
    for (const [ax, az, bx, bz] of segs.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || []) {
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
    }
    return best;
  };
  const kept = [];
  let onLane = 0, narrow = 0;
  for (const c of sites) {
    if (graph && laneDist(c.x, c.z) < LANE_CLEAR) { onLane++; continue; }
    if (inside && nearest) {
      const nr = nearest(c.x, c.z);
      if (nr) {
        const dx = nr.px - c.x, dz = nr.pz - c.z, L = Math.hypot(dx, dz);
        if (L > 0.3) {
          const ux = dx / L, uz = dz / L;
          let d = 0.2;
          while (d < 30 && inside(c.x + ux * d, c.z + uz * d)) d += 0.2;
          let free = d - CAR_HALF;
          for (const o of kept) {
            const ox = o.x - c.x, oz = o.z - c.z, across = ox * ux + oz * uz, along = Math.abs(-ox * uz + oz * ux);
            if (across > 1.5 && across < d + 1 && along < 6) free = Math.min(free, across - 2 * CAR_HALF);
          }
          if (free < PASS) { narrow++; continue; }
        }
      }
    }
    kept.push(c);
  }
  return { kept, onLane, narrow };
}
