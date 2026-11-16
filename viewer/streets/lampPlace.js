// LAMP SITES (no three.js: viewer/lamps.js draws them, tools/audit/streetAudit.mjs checks them in node).
import { ROAD_TYPES } from "../../vendor/roads/roadCrossSection.js";

function kerbOffset(type) {
  const t = ROAD_TYPES[type] || ROAD_TYPES.local;
  const side = (lanes) => {
    let w = 0;
    for (const l of lanes) { if (l.type === "sidewalk") return w + 0.5; w += l.width; }
    return w + 0.5;
  };
  return { left: (t.center?.width || 0) / 2 + side(t.left), right: (t.center?.width || 0) / 2 + side(t.right), spacing: t.lampSpacing || 0 };
}

/** Lamp sites {x, z, yaw (arm points to the road)} from roads.json. */
export function lampSites(roads, bounds) {
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const out = [];
  for (const r of roads.roads) {
    if (r.meta?.highway === "service" || r.meta?.highway === "footway") continue;
    const k = kerbOffset(r.type);
    if (!k.spacing) continue;
    const pts = [N.get(r.a), ...r.pts, N.get(r.b)].filter(Boolean);
    let total = 0;
    const segL = [];
    for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); segL.push(L); total += L; }
    if (total < 24) continue;
    let s = 10 + (k.spacing * 0.5) % 7, side = 1, seg = 0, acc = 0;
    while (s < total - 10) {
      while (seg < segL.length - 1 && acc + segL[seg] < s) acc += segL[seg++];
      const a = pts[seg], b = pts[seg + 1], t = (s - acc) / (segL[seg] || 1);
      const dx = (b.x - a.x) / (segL[seg] || 1), dz = (b.z - a.z) / (segL[seg] || 1);
      const nx = -dz * side, nz = dx * side, off = side > 0 ? k.left : k.right;
      const x = a.x + (b.x - a.x) * t + nx * off, z = a.z + (b.z - a.z) * t + nz * off;
      if (x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1) out.push({ x, z, yaw: Math.atan2(nx, nz) });   // local -z (the arm) -> toward the road
      s += k.spacing; side = -side;
    }
  }
  // two roads sharing a kerb: drop lamps closer than 6 m to one already kept
  const kept = [];
  for (const p of out) if (!kept.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 36)) kept.push(p);
  return kept;
}

/** `place(site)` (?roads=surface, viewer/streetFit.js): moves a site onto the measured sidewalk or drops it (null);
 *  `lift(x, z)`: the measured surface height above the road there. */
/** The lamps the city draws: lampSites, each moved by `place` (or dropped), closer than 6 m to a kept one dropped.
 *  The drive colliders (viewer/drive/driveMode.js tileDrive) use the same list. */
export function placedLampSites(roads, bounds, place = null) {
  let sites = lampSites(roads, bounds);
  if (place) {
    const kept = [];
    for (const s of sites.map(place)) if (s && !kept.some((q) => (q.x - s.x) ** 2 + (q.z - s.z) ** 2 < 36)) kept.push(s);
    sites = kept;
  }
  return sites;
}
