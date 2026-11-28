// THE VILLO STATION'S FOOTPRINT (no three.js; claude/fixes4 2026-11-27, rule villo-row-clear): the one shape the
// builder (tools/streetkit/snapProps.mjs), the lamp keep-out (cityStreetKit.keepLampsClear) and the check
// (tools/streetkit/villoCheck.mjs) share. A dock at (x, z) with yaw: n = (sin yaw, cos yaw) points to the road, the bike
// stands in it from the dock to 1.9 m along n; the docks are 0.85 m apart, so the row is one strip.
export const DOCK = { half: 0.425, back: -0.32, front: 1.95, base: 0.3 };      // m: along the row (half pitch), across (behind / bike's rear tyre), base half width
export const TOTEM = { half: 0.3, depth: 0.2 };

const frame = (d) => { const nx = Math.sin(d.yaw), nz = Math.cos(d.yaw); return { nx, nz, tx: nz, tz: -nx }; };

/** is a round thing (x, z, radius r) inside the station's row (docks + bikes) or its terminal? (+ margin m) */
export function villoObstacleHit(v, x, z, r = 0, m = 0) {
  const R = r + m;
  for (const d of v.docks || []) {
    const { nx, nz, tx, tz } = frame(d), dx = x - d.x, dz = z - d.z;
    const a = dx * tx + dz * tz, c = dx * nx + dz * nz;
    if (Math.abs(a) < DOCK.half + R && c > DOCK.back - R && c < DOCK.front + R) return true;
  }
  const t = v.totem;
  if (t) {
    const { nx, nz, tx, tz } = frame(typeof t.yaw === "number" ? t : v.docks?.[0] || { yaw: 0 }), dx = x - t.x, dz = z - t.z;   // (its yaw faces away from the road: the same axes)
    if (Math.abs(dx * tx + dz * tz) < TOTEM.half + R && Math.abs(dx * nx + dz * nz) < TOTEM.depth + R) return true;
  }
  return false;
}

/** the points of a row that must stand on paving: each dock base's four corners, each bike's two tyre contacts, the terminal's foot */
export function villoCorners(v) {
  const out = [];
  for (const d of v.docks || []) {
    const { nx, nz, tx, tz } = frame(d);
    for (const a of [-DOCK.base, DOCK.base]) for (const c of [-0.25, 0.25]) out.push([d.x + tx * a + nx * c, d.z + tz * a + nz * c]);
    for (const c of [0.42, 1.75]) out.push([d.x + nx * c, d.z + nz * c]);
  }
  if (v.totem) out.push([v.totem.x, v.totem.z]);
  return out;
}

/** (x, z) -> true where a lamp may not stand: inside a station's row / terminal + 0.45 m (the lamp's 0.2 m base + 0.25 m) */
export function villoKeepOut(doc, margin = 0.45) {
  const vs = (doc?.villo || []).filter((v) => v.docks?.length);
  if (!vs.length) return () => false;
  return (x, z) => vs.some((v) => villoObstacleHit(v, x, z, 0, margin));
}

/** THE street kit's lamp rule (cityStreetKit.keepLampsClear; tools/streetkit/villoCheck.mjs runs the same): a lamps.js
 *  `place` that keeps the lamps 0.6 m off the sign poles / plate posts and out of the Villo rows (the docks AND the bikes
 *  in them + 0.45 m), slid along the kerb (2 / 4 m; out of a Villo row up to 12 m: a row is 5-20 m long), else dropped.
 *  old = true: as before fixes4 (1.2 m from each dock's point, 0.9 m from the terminal: the bikes' 1.9 m were not seen).
 *  stats (optional): { lampsMoved, lampsDropped } counted. */
export function lampKeepClear(place, doc, { old = false, stats = null } = {}) {
  if (!doc) return place;
  const pts = [...(doc.signs || []).map((s) => [s.x, s.z, 0.6]), ...(doc.posts || []).map((s) => [s.x, s.z, 0.6]),
    ...(old ? (doc.villo || []).flatMap((v) => [...v.docks.map((d) => [d.x, d.z, 1.2]), ...(v.totem ? [[v.totem.x, v.totem.z, 0.9]] : [])]) : [])];
  const inRow = old ? () => false : villoKeepOut(doc);
  if (!pts.length && !(doc.villo || []).some((v) => v.docks?.length)) return place;
  const P = place || ((s) => s);
  const hitPt = (x, z) => pts.some(([a, b, r]) => (x - a) ** 2 + (z - b) ** 2 < r * r);
  const hit = (x, z) => hitPt(x, z) || inRow(x, z);
  const SLIDES = [2, -2, 4, -4], FAR = [6, -6, 8, -8, 10, -10, 12, -12];
  return (s) => {
    const p = P(s);
    if (!p || !hit(p.x, p.z)) return p;
    const ax = Math.cos(p.yaw), az = -Math.sin(p.yaw);
    for (const d of inRow(p.x, p.z) ? [...SLIDES, ...FAR] : SLIDES) {
      const q = P({ ...s, x: s.x + ax * d, z: s.z + az * d });
      if (q && !hit(q.x, q.z)) { if (stats) stats.lampsMoved++; return q; }
    }
    if (stats) stats.lampsDropped++;
    return null;
  };
}
