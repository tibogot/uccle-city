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
/** ?tlights=old: the posts as before claude/tlights too (no settle on one surface, no aim at the approach, one-way exits
 *  kept): opts.pre (viewer/furniture.js) */
export const TLIGHTS_OLD = typeof location !== "undefined" && /[?&]tlights=old/.test(location.search);

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
      // (claude/tlights: and on this traffic's right beyond half its carriageway: a median's kerb within 5 m put a post
      // 1 m from the centre line on the far side, its heads turned to the wrong traffic)
      if (opts.fit.lift(qx, qz) > 0 && (k.lx * rx + k.lz * rz) > 0 && (opts.pre || (qx - px) * rx + (qz - pz) * rz >= half * 0.5)) { x = qx; z = qz; break; }
    }
  }
  // (claude/tlights) the post on a spot that holds it: on this traffic's right (beyond half its carriageway), out of every
  // carriageway, on the raised paving where the street is measured, its foot WHOLE on one surface (the ring r 10 cm
  // level within 3 cm: a post on a kerb line stood half on the road, drawn 12 cm proud of it). Not so: the NEAREST spot
  // that is (rings of 10 cm round it, up to 8 m). Before, 16 steps of 0.5 m to the right walked posts 8-12 m off, across
  // a parallel road, and a median's kerb put a post 1 m from the centre line (tools/audit/tlightsCheck.mjs)
  if (!opts.pre && (opts.driven || opts.fit?.lift)) {
    const L = opts.fit?.lift, C = opts.fit?.classAt, D = opts.driven;
    const ok = (qx, qz) => {
      if ((qx - px) * rx + (qz - pz) * rz < half * 0.5 || D?.inside(qx, qz, 0)) return false;
      if (!L) return true;
      const c = L(qx, qz);
      if (!(c > 0) && !(C && C(qx, qz) < 0)) return false;           // measured: on raised paving
      for (let j = 0; j < 8; j++) {
        const ax = qx + Math.cos(j * Math.PI / 4) * 0.1, az = qz + Math.sin(j * Math.PI / 4) * 0.1;
        if (Math.abs(L(ax, az) - c) > 0.03 || D?.inside(ax, az, 0)) return false;
      }
      return true;
    };
    if (!ok(x, z)) {
      let best = null;
      for (let rad = 0.1; rad <= 8 && !best; rad += 0.1) {
        for (let j = 0; j < 36; j++) {
          const a = (j / 36) * 2 * Math.PI, qx = x + Math.cos(a) * rad, qz = z + Math.sin(a) * rad;
          if (ok(qx, qz)) { best = [qx, qz]; break; }
        }
      }
      if (best) [x, z] = best;
    }
  }
  for (let i = 0; i < 16 && opts.driven?.inside(x, z, 0.1); i++) { x += rx * 0.5; z += rz * 0.5; }
  // (claude/tlights) a cycle lane on this traffic's right up to the line: the post carries the bike head
  const bike = !!(r?.lanes?.[forward ? "right" : "left"] || []).some((l) => l.type === "bike");
  return { x, z, yaw: Math.atan2(tx, tz), bike };
}

/** (claude/tlights) the point `dist` m back up the approach of the traffic travelling (tx, tz) past (px, pz) on road r,
 *  walked along the road's polyline (bends included), null if the way ends within 8 m */
function upstream(r, N, px, pz, tx, tz, dist = 20) {
  const pts = [N.get(r.a), ...r.pts, N.get(r.b)].filter(Boolean);
  if (pts.length < 2) return null;
  let k = 1, bestD = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1e-9;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / L2));
    const d = Math.hypot(a.x + dx * t - px, a.z + dz * t - pz);
    if (d < bestD) { bestD = d; k = i; }
  }
  const fwd = tx * (pts[k].x - pts[k - 1].x) + tz * (pts[k].z - pts[k - 1].z) >= 0;
  let x = px, z = pz, left = dist, i = fwd ? k - 1 : k;
  while (left > 0 && i >= 0 && i < pts.length) {
    const d = Math.hypot(pts[i].x - x, pts[i].z - z);
    if (d > 1e-6 && ((pts[i].x - x) * -tx + (pts[i].z - z) * -tz) / d < 0.5) break;   // a hairpin (> 60 deg): its approach ends
    if (d >= left) { x += (pts[i].x - x) * left / d; z += (pts[i].z - z) * left / d; left = 0; break; }
    left -= d; x = pts[i].x; z = pts[i].z; i += fwd ? -1 : 1;
  }
  return dist - left >= 8 ? { x, z } : null;
}

/** (claude/tlights) the heads aimed at the approach: at the traffic's lane centre 20 m back up the road (a bend before
 *  the line turned a head set along the stop point's tangent up to 40 deg away from the cars that come); at most 30 deg
 *  off the road's direction; the road's own direction where the way ends sooner */
function aimYaw(post, r, N, px, pz, tx, tz) {
  const yaw0 = Math.atan2(tx, tz);
  const u = upstream(r, N, px, pz, tx, tz);
  if (!u) return yaw0;
  const ox = post.x - px, oz = post.z - pz, ol = Math.hypot(ox, oz) || 1, lane = Math.min(1.6, ol * 0.4);
  const lx = u.x + (ox / ol) * lane, lz = u.z + (oz / ol) * lane;
  let yaw = Math.atan2(post.x - lx, post.z - lz);       // local -z (the heads) toward (lx, lz)
  let d = Math.atan2(Math.sin(yaw - yaw0), Math.cos(yaw - yaw0));
  d = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, d));
  return yaw0 + d;
}

/** the engine type's default kerb offset (the old placement) */
function kerbType(type, side) {
  const t = ROAD_TYPES[type] || ROAD_TYPES.local;
  let w = (t.center?.width || 0) / 2;
  for (const l of side > 0 ? t.left : t.right) { if (l.type === "sidewalk") break; w += l.width; }
  return w;
}

/** every signal post of a tile's OSM points: [{ x, z, yaw, phase, tx, tz (travel direction of the traffic it faces), bike,
 *  stop, road }]. opts: { fit, driven, old, pre } (old: the placement before citydefects, for ?signals=old and the audit's
 *  "before"; pre: before claude/tlights, ?tlights=old) */
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
    // (stop: the OSM point's projection on its road, road: that road's id: what the post is for, tools/audit/tlightsCheck.mjs)
    const at = { stop: [nr.px, nr.pz], road: nr.road.id };
    const post = (tx, tz) => {
      const s = signalPost(nr.road, nr.px, nr.pz, tx, tz, o);
      if (!opts.pre) s.yaw = aimYaw(s, nr.road, N, nr.px, nr.pz, tx, tz);
      return { ...s, phase, tx, tz, ...at };
    };
    // (claude/tlights) a one-way street has one approach, its own flow (roads.json keeps the OSM way's a -> b): a point
    // near the junction at its EXIT got a post for traffic that never comes (K11: heads 60 deg off the cars that do)
    const ow = nr.road.meta?.oneway, flow = opts.pre ? 0 : ow === "yes" || ow === "1" || ow === "true" ? 1 : ow === "-1" ? -1 : 0;
    if (j && j.d > 1.5 && !(flow && (j.ux * nr.ux + j.uz * nr.uz) * flow < 0)) out.push(post(j.ux, j.uz));
    else if (flow) out.push(post(nr.ux * flow, nr.uz * flow));
    else for (const sd of [1, -1]) out.push(post(nr.ux * sd, nr.uz * sd));
  }
  return out;
}
