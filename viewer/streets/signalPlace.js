// SIGNAL POST SITES (no three.js: viewer/furniture.js draws them, tools/audit/streetAudit.mjs checks them in node).
import { nearestRoad, phaseOfDir } from "../traffic/signals.js";
import { ROAD_TYPES } from "../../vendor/roads/roadCrossSection.js";
import { carriageHalf } from "./carriageway.js";

// SIGNAL POSTS (citydefects 2026-11-16, owner playtest: "traffic lights standing in the road and wrongly rotated"). Was:
// two posts per OSM point at the road TYPE's default kerb offset (not the measured street), 4 m either side along the road
// (at a junction: inside the cross street), heads turned ACROSS the road. Now an OSM signal point is what it is mapped as
// in Brussels, the signal of ONE approach at its stop line (133 of 206 lie 3-25 m before a junction): one post on that
// approach's right kerb, 0.5 m behind it on the measured sidewalk, its head facing the cars that come; a point away from
// junctions (a pedestrian crossing's signals) gets one post per kerb, each facing its own traffic. ?signals=old: as before.
export const SIGNALS_OLD = typeof location !== "undefined" && /[?&]signals=old/.test(location.search);

/** the nearest junction node (degree >= 3) along road r from (px, pz) within reach: { node, ux, uz } with (ux, uz) the
 *  direction from the point toward it, or null */
function junctionAhead(r, N, deg, nr, reach = 30) {
  let best = null;
  for (const end of [r.a, r.b]) {
    const n = N.get(end);
    if (!n || (deg.get(end) || 0) < 3) continue;
    const d = Math.hypot(n.x - nr.px, n.z - nr.pz);
    if (d > reach || (best && d >= best.d)) continue;
    const s = end === r.b ? 1 : -1;                      // the segment's a -> b direction leads to b
    best = { node: n, d, ux: nr.ux * s, uz: nr.uz * s };
  }
  return best;
}

/** a post for the traffic travelling (tx, tz) past the stop point (px, pz) on road r: on that traffic's right kerb,
 *  0.5 m behind the measured kerb when there is one, never in a carriageway; head (local -z) toward the coming cars */
function signalPost(r, px, pz, tx, tz, opts) {
  const rx = -tz, rz = tx;                              // the right of the travel direction (x east, z south)
  const [hl, hr] = carriageHalf(r);
  const forward = r && ((tx * opts.ux + tz * opts.uz) >= 0);  // travelling along the road's a -> b: its right is hr
  const half = forward ? hr : hl;
  let x = px + rx * (half + 0.6), z = pz + rz * (half + 0.6);
  const k = opts.fit?.nearKerb?.(x, z, 5);
  if (k) {
    // the kerb's raised side, 0.5 m in (as the lamps: streetFit.placeLamp)
    for (const back of [0.5, 0.35, 0.8]) {
      const qx = k.x + k.lx * back, qz = k.z + k.lz * back;
      if (opts.fit.lift(qx, qz) > 0 && (k.lx * rx + k.lz * rz) > 0) { x = qx; z = qz; break; }
    }
  }
  for (let i = 0; i < 16 && opts.driven?.inside(x, z, 0.1); i++) { x += rx * 0.5; z += rz * 0.5; }
  return { x, z, yaw: Math.atan2(tx, tz) };
}

/** the engine type's default kerb offset (the old placement) */
function kerbType(type, side) {
  const t = ROAD_TYPES[type] || ROAD_TYPES.local;
  let w = (t.center?.width || 0) / 2;
  for (const l of side > 0 ? t.left : t.right) { if (l.type === "sidewalk") break; w += l.width; }
  return w;
}

/** every signal post of a tile's OSM points: [{ x, z, yaw, phase, tx, tz (travel direction of the traffic it faces) }].
 *  opts: { fit, driven, old } (old: the placement before citydefects, for ?signals=old and the audit's "before") */
export function signalSites(points, roads, opts = {}) {
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const deg = new Map();
  for (const r of roads.roads) for (const e of [r.a, r.b]) deg.set(e, (deg.get(e) || 0) + 1);
  const out = [];
  for (const p of points || []) {
    if (p.kind !== "traffic_signals" || +(p.tags?.layer || 0) > 0) continue;
    const nr = nearestRoad(roads, N, p.x, p.z);
    if (!nr || nr.d > 30) continue;
    const phase = phaseOfDir(nr.ux, nr.uz);
    const j = junctionAhead(nr.road, N, deg, nr);
    if (opts.old) {
      // (old: two posts, the type's kerb, 4 m along either way, the head turned across the road toward its centre)
      for (const sd of [1, -1]) {
        const nx = -nr.uz * sd, nz = nr.ux * sd, off = kerbType(nr.road.type, sd) + 0.4;
        const tr = j && j.d > 1.5 ? [j.ux, j.uz] : [nr.ux * sd, nr.uz * sd];
        out.push({ x: nr.px + nx * off + nr.ux * sd * 4, z: nr.pz + nz * off + nr.uz * sd * 4, yaw: Math.atan2(nx, nz), phase, tx: tr[0], tz: tr[1] });
      }
      continue;
    }
    const o = { ...opts, ux: nr.ux, uz: nr.uz };
    if (j && j.d > 1.5) out.push({ ...signalPost(nr.road, nr.px, nr.pz, j.ux, j.uz, o), phase, tx: j.ux, tz: j.uz });
    else for (const sd of [1, -1]) out.push({ ...signalPost(nr.road, nr.px, nr.pz, nr.ux * sd, nr.uz * sd, o), phase, tx: nr.ux * sd, tz: nr.uz * sd });
  }
  return out;
}
