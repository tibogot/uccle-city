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

// PARKING BY THE MEASURED WIDTH (citydefects 2026-11-16, coordinator's rule after the first audit: dropping 2/3 of the
// parked cars made an empty, fake city; Uccle's streets are lined with cars). Per OSM way, every SLOT m along it, the
// measured kerb-to-kerb carriageway width w (UrbIS roadway / tram road / parking classes) decides:
//   w >= BOTH (8.0 m)          both kerbs
//   ONE (5.6) <= w < BOTH      one kerb: the OSM parking side when the tags give one (roads.json custom lane stack with
//                              a parking lane on one side only), else the side with fewer driveways (UrbIS ramps at the
//                              kerb), crossings and stops along the WHOLE way: one choice per way, never switching
//   w < ONE                    none
// No slot within CLEAR_END m of a road end (junction corners), 5 m of a crossing or a driveway (a ramp at the kerb
// under the car: its slot slides up to 1.4 m first), 10 m of a signal, 15 m of a bus stop, RAIL_CLEAR m of a tram track (a car body and a tram passing); a side the OSM stack leaves without
// parking (tagged, not guessed) gets none. Occupancy OCC (deterministic hash). Each car against the measured kerb
// (fit.placeCar). Returns { sites, stats }.
// SERVICE CLEARANCE (claude/parking1, rule service-vehicle-passage): after the width rule, every parked car must leave
// SERVICE_CLEAR m of open carriageway across from its inner flank: to the far edge of ITS carriageway (a kerb, a median,
// a tram reservation: a class the traffic does not drive on) or to the nearest parked car across, whichever comes first
// (Brussels practice: about 3 m clear for the fire brigade; the widest service vehicle, a bus 2.55 m, + 2 x 0.2 m). The
// kerb-to-kerb width alone missed a street split in two by a tram reservation (Rue Engeland D7: 21 m kerb to kerb, a
// 3.5 m carriageway each way, parked on: 1.5 m left, a bus trapped). Where both kerbs cannot keep it, the way's one-kerb
// side (the OSM parking tags, else the side with fewer driveways / stops) keeps its cars and the other side's go; where
// even one side cannot, none. ?parkservice=old: no clearance pass (the census of what it changed: stats.service).
export const SERVICE_CLEAR = 3.0, SERVICE_W = 2.55, SERVICE_MARGIN = 0.2;
const PARK_HALF_W = 0.925;              // the parked box's half width (trafficGraph.js TP_BOX_HW)
const SERVICE_OLD = typeof location !== "undefined" && /[?&]parkservice=old(&|$)/.test(location.search);
const SLOT = 5.6, BOTH = 8.0, ONE = 5.6, CLEAR_END = 12, OCC = 0.8, RAIL_CLEAR = 2.6;
const PARK_CLASSES = new Set([0, 1, 3]);
const TYPE_PARKS = { local: ["left", "right"], avenue: ["left", "right"], oneWay: ["left"] };   // the type defaults' parking sides
const NO_PARK_HW = new Set(["service", "footway", "path", "cycleway", "steps", "pedestrian", "track", "trunk", "primary", "motorway", "living_street"]);

export function widthParking(roads, feats, bounds, fit, opts = {}) {
  const stats = { slots: 0, both: 0, one: 0, none: 0, noWidth: 0, dropped: 0 };
  if (!fit) return { sites: [], stats };
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const pts0 = feats.points || [];
  const avoid = pts0.filter((p) => p.kind === "crossing" || p.kind === "bus_stop" || p.kind === "traffic_signals")
    .map((p) => [p.x, p.z, p.kind === "bus_stop" ? 15 : p.kind === "traffic_signals" ? 10 : 5]);
  const rails = [];
  for (const l of feats.lines || []) if (l.kind === "tram" || l.kind === "platform") for (let i = 1; i < l.line.length; i++) rails.push([...l.line[i - 1], ...l.line[i]]);
  const near = (segs, x, z, r) => segs.some(([ax, az, bx, bz]) => {
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2 < r * r;
  });
  const carr = (x, z) => PARK_CLASSES.has(fit.classAt(x, z));
  const ray = (x, z, sx, sz) => { for (let d = 0.25; d < 20; d += 0.25) if (!carr(x + sx * d, z + sz * d)) return d; return null; };
  // a driveway: a ramp (dropped kerb) just behind the kerb under the car (1.8 m either side of its centre; the slot slides up to 1.4 m to clear it)
  const driveway = (x, z, tx, tz, ox, oz) => {
    for (let a = -1.8; a <= 1.8; a += 0.9) for (const b of [0.6, 1.2]) if (fit.classAt(x + tx * a + ox * b, z + tz * a + oz * b) === 8) return true;
    return false;
  };
  // 1. sample every way: width, both sides' kerb distances, obstacles per side
  const ways = new Map();
  for (const r of roads.roads) {
    if (NO_PARK_HW.has(r.meta?.highway) || (r.meta?.bridge && r.meta.bridge !== "no")) continue;
    const pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean);
    if (pts.length < 2) continue;
    const segL = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); segL.push(L); total += L; }
    if (total < 2 * CLEAR_END + SLOT) continue;
    const way = /^r(\d+)_/.exec(r.id)?.[1] ?? r.id;
    const W = ways.get(way) ?? { obst: [0, 0], tagged: [null, null], samples: [] };
    ways.set(way, W);
    // OSM sides (a custom stack = the pipeline read tags): parking lane present / absent per side, unless guessed
    // (the stack as OSM / the pipeline gave it: the width fit replaces r.lanes and keeps the original in meta.unfitLanes)
    const lanes = r.meta?.widthFit ? r.meta.unfitLanes : r.lanes;
    if (lanes) for (const [k, side] of [[0, "left"], [1, "right"]]) {
      const pl = (lanes[side] || []).find((l) => l.type === "parking");
      if (pl && !pl.guess) W.tagged[k] = true;
      // (no parking lane where the TYPE has one by default: the tags said no; a type without default parking says nothing)
      else if (!pl && TYPE_PARKS[r.type]?.includes(side)) W.tagged[k] ??= false;
    }
    let seg = 0, acc = 0;
    for (let s = CLEAR_END; s <= total - CLEAR_END; s += SLOT) {
      while (seg < segL.length - 1 && acc + segL[seg] < s) acc += segL[seg++];
      const a = pts[seg], b = pts[seg + 1], L = segL[seg] || 1, t = (s - acc) / L;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, tx = (b.x - a.x) / L, tz = (b.z - a.z) / L;
      const lx = tz, lz = -tx;                                   // the engine's left normal
      stats.slots++;
      // the measured carriageway here: at the OSM line, or up to 4 m beside it (a chord on a bend)
      let cx = x, cz = z;
      if (!carr(cx, cz)) {
        let found = false;
        for (let o = 0.5; o <= 4 && !found; o += 0.5) for (const sg of [1, -1]) if (carr(x + lx * o * sg, z + lz * o * sg)) { cx = x + lx * o * sg; cz = z + lz * o * sg; found = true; break; }
        if (!found) { stats.noWidth++; continue; }
      }
      const dl = ray(cx, cz, lx, lz), dr = ray(cx, cz, -lx, -lz);
      if (dl == null || dr == null) { stats.noWidth++; continue; }
      const q = { x: cx, z: cz, tx, tz, lx, lz, dl, dr, w: dl + dr, r };
      for (const [k, sg, d] of [[0, 1, dl], [1, -1, dr]]) {
        const kx = x + lx * sg * d, kz = z + lz * sg * d;
        if (driveway(kx, kz, tx, tz, lx * sg, lz * sg)) { W.obst[k]++; q[`drive${k}`] = true; }
      }
      W.samples.push(q);
    }
  }
  // 2. per way: the one-kerb side, then the slots
  const sites = [], cand = [];
  let k = 0;
  for (const [wayId, W] of ways) {
    for (const p of avoid) for (const q of W.samples) { const dl = (p[0] - q.x) * q.lx + (p[1] - q.z) * q.lz; if (Math.hypot(p[0] - q.x, p[1] - q.z) < p[2] + 4) W.obst[dl > 0 ? 0 : 1] += 0.5; }
    let oneSide;
    if (W.tagged[0] === true && W.tagged[1] !== true) oneSide = 0;
    else if (W.tagged[1] === true && W.tagged[0] !== true) oneSide = 1;
    else oneSide = W.obst[1] < W.obst[0] ? 1 : W.obst[0] < W.obst[1] ? 0 : 1;       // a tie: the right kerb (as the traffic's)
    for (const q of W.samples) {
      const sides = q.w >= BOTH ? [0, 1] : q.w >= ONE ? [oneSide] : [];
      if (q.w >= BOTH) stats.both++; else if (q.w >= ONE) stats.one++; else stats.none++;
      for (const side of sides) {
        if (W.tagged[side] === false) { stats.taggedNo = (stats.taggedNo || 0) + 1; continue; }   // the tags leave this side without parking
        const sg = side === 0 ? 1 : -1, d = side === 0 ? q.dl : q.dr;
        // a driveway under the car: slide the slot up to 1.4 m along the kerb to clear it, else no car
        let sh = 0;
        if (q[`drive${side}`]) {
          sh = null;
          for (const t of [1.4, -1.4]) if (!driveway(q.x + q.lx * sg * d + q.tx * t, q.z + q.lz * sg * d + q.tz * t, q.tx, q.tz, q.lx * sg, q.lz * sg)) { sh = t; break; }
          if (sh == null) { stats.driveway = (stats.driveway || 0) + 1; continue; }
        }
        const x0 = q.x + q.lx * sg * (d - 1.05) + q.tx * sh, z0 = q.z + q.lz * sg * (d - 1.05) + q.tz * sh;
        // right-hand traffic: cars face their side's traffic (left of the engine line = the b -> a direction)
        const yaw0 = side === 1 ? Math.atan2(-q.tz, q.tx) : Math.atan2(q.tz, -q.tx);
        const hv = hash(x0 * 0.37, z0 * 0.53 + k++);
        if (hv >= OCC) { stats.empty = (stats.empty || 0) + 1; continue; }
        if (avoid.some(([ax, az, rr]) => (ax - x0) ** 2 + (az - z0) ** 2 < rr * rr) || near(rails, x0, z0, RAIL_CLEAR)) { stats.dropped++; continue; }
        const pl = fit.placeCar(x0, z0, yaw0);
        if (!pl || pl.x < bounds.x0 || pl.x > bounds.x1 || pl.z < bounds.z0 || pl.z > bounds.z1) continue;
        if (sites.some((o) => (o.x - pl.x) ** 2 + (o.z - pl.z) ** 2 < 20)) continue;
        const site = { x: pl.x, z: pl.z, yaw: pl.yaw + (hv - 0.3) * 0.02, c: Math.floor(hash(pl.z, pl.x) * (opts.nColours ?? 8)), w: q.w, side, road: q.r.id };
        sites.push(site);
        // (the clearance pass: first = the way's one-kerb side)
        cand.push({ site, first: side === oneSide, way: wayId });
      }
    }
  }
  if (SERVICE_OLD || opts.service === false) return { sites, stats };
  const kept = serviceClear(cand, fit, stats);
  return { sites: kept, stats };
}

/** the clearance pass (rule service-vehicle-passage): the candidates of the way's one-kerb side first, then the others;
 *  a car is kept when the ray from its inner flank across the street runs SERVICE_CLEAR m over the carriageway without
 *  meeting a non-carriageway class or a car already kept. Unknown cells (no survey) count as clear: no data, no drop. */
function serviceClear(cand, fit, stats) {
  const S = (stats.service = { cars: cand.length, dropped: 0, edge: 0, car: 0, ways: 0, waysBoth: 0 });
  const G = new Map(), key = (i, j) => (i + 4096) * 8192 + (j + 4096), CELL = 8;
  const inBox = (c, x, z) => {
    const fx = Math.cos(c.yaw), fz = -Math.sin(c.yaw), dx = x - c.x, dz = z - c.z;      // (local +x = the bonnet)
    return Math.abs(dx * fx + dz * fz) <= 2.365 && Math.abs(dx * fz - dz * fx) <= PARK_HALF_W;
  };
  const nearCar = (x, z, self = null) => {
    const i0 = Math.floor(x / CELL), j0 = Math.floor(z / CELL);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const c of G.get(key(i0 + di, j0 + dj)) || []) if (c !== self && inBox(c, x, z)) return true;
    return false;
  };
  const order = [...cand.filter((c) => c.first), ...cand.filter((c) => !c.first)];
  const keep = new Set(), changed = new Set(), both = new Set();
  // (across = the car's own left, as it stands against the measured kerb: parked cars face their side's traffic, so
  // the street is on their left; the road's normal at the slot differs on a bend)
  const short = (site) => {
    const ax = -Math.sin(site.yaw), az = -Math.cos(site.yaw), x0 = site.x + ax * PARK_HALF_W, z0 = site.z + az * PARK_HALF_W;
    for (let t = 0.25; t <= SERVICE_CLEAR + 1e-6; t += 0.25) {
      const x = x0 + ax * t, z = z0 + az * t, k = fit.classAt(x, z);
      if (k >= 0 && !PARK_CLASSES.has(k)) return "edge";
      if (nearCar(x, z, site)) return "car";
    }
    return null;
  };
  const add = (site) => { const kk = key(Math.floor(site.x / CELL), Math.floor(site.z / CELL)); if (!G.has(kk)) G.set(kk, []); G.get(kk).push(site); };
  for (const c of order) {
    const why = short(c.site);
    if (why) { S.dropped++; S[why]++; changed.add(c.way); if (why === "car") both.add(c.way); continue; }
    keep.add(c.site); add(c.site);
  }
  // (one sweep over the kept: a car kept early never saw a car kept after it across the street; the later one goes)
  for (const c of [...order].reverse()) {
    if (!keep.has(c.site) || !short(c.site)) continue;
    keep.delete(c.site); S.dropped++; S.car++; changed.add(c.way); both.add(c.way);
    const l = G.get(key(Math.floor(c.site.x / CELL), Math.floor(c.site.z / CELL))); l.splice(l.indexOf(c.site), 1);
  }
  S.ways = changed.size; S.waysBoth = both.size;
  return cand.length ? cand.map((c) => c.site).filter((s) => keep.has(s)) : [];
}
