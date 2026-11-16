// WHERE CARS DRIVE, per tile, on the main thread (citydefects 2026-11-16, owner playtest: a garden fence across the road
// at the Saint-Job station bridge, traffic lights and tram poles standing in the road). One test shared by the things
// that must never stand in a driven lane: garden pieces (viewer/gardens/cityGardens.js), signal posts (viewer/furniture.js),
// tram poles (viewer/tram.js), and the audit (debug/furnitureAudit.js).
//
//   carriageway(roads, { classAt, onDeck })  ->  { inside(x, z, margin = 0), nearest(x, z) }
//     inside   true where (x, z) is on a carriageway: the MEASURED one (UrbIS street surfaces: roadway, tram road,
//              parking; fit.classAt of viewer/streetFit.js) where the tile has them, else (and also: UrbIS predates the
//              2025 Carsoel deck) within the OSM road's carriageway half width (its lanes; the engine type's defaults
//              without), `margin` m shrunk from the edge (> 0: only well inside)
//     nearest  the nearest OSM road centre point: { d, px, pz, ux, uz, half (carriageway half width), road }
// Footways, paths, cycleways, service roads and steps are not carriageways (a lane through a car park is not either).
import { ROAD_TYPES } from "../../vendor/roads/roadCrossSection.js";

const NOT_DRIVEN = new Set(["footway", "path", "cycleway", "steps", "pedestrian", "bridleway", "track", "service", "corridor", "platform"]);
const CARRIAGE = new Set([0, 1, 3]);      // viewer/surfaces.js SURF_CLASS: roadway, tramRoad, parking
const LANES = new Set([0, 1]);            // lanesOnly: the driven lanes (a bike box or a sign in a parking bay is fine)
const CELL = 16;

/** a road's carriageway half width per side: [left, right] (m from the centre line to the kerb) */
export function carriageHalf(r) {
  const sum = (a) => (a || []).filter((l) => l.type !== "sidewalk" && l.type !== "verge" && l.type !== "green").reduce((s, l) => s + (+l.width || 0), 0);
  if (r.lanes?.left || r.lanes?.right) {
    const c = (+r.lanes.center?.width || 0) / 2;
    return [c + sum(r.lanes.left), c + sum(r.lanes.right)];
  }
  const t = ROAD_TYPES[r.type] || ROAD_TYPES.local;
  const c = (t.center?.width || 0) / 2;
  return [c + sum(t.left), c + sum(t.right)];
}

export function carriageway(roads, { classAt = null, onDeck = null, lanesOnly = false } = {}) {
  const CLS = lanesOnly ? LANES : CARRIAGE;
  const N = new Map((roads?.nodes || []).map((n) => [n.id, n]));
  const segs = [], grid = new Map(), key = (i, j) => `${i},${j}`;
  for (const r of roads?.roads || []) {
    if (NOT_DRIVEN.has(r.meta?.highway)) continue;
    const pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean);
    const [hl, hr] = carriageHalf(r), h = Math.max(hl, hr);
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], s = { ax: a.x, az: a.z, bx: b.x, bz: b.z, hl, hr, road: r };
      const id = segs.push(s) - 1;
      for (let i = Math.floor((Math.min(a.x, b.x) - h) / CELL); i <= Math.floor((Math.max(a.x, b.x) + h) / CELL); i++)
        for (let j = Math.floor((Math.min(a.z, b.z) - h) / CELL); j <= Math.floor((Math.max(a.z, b.z) + h) / CELL); j++) {
          const kk = key(i, j); if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push(id);
        }
    }
  }
  const near = (x, z, all = false) => {
    let best = null;
    for (const id of grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || []) {
      const s = segs[id], dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz;
      if (L2 < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / L2));
      const px = s.ax + dx * t, pz = s.az + dz * t, d = Math.hypot(x - px, z - pz), L = Math.sqrt(L2), ux = dx / L, uz = dz / L;
      // side: +1 = right of the road's direction (x east, z south: the right normal is (-uz, ux))
      const side = (-uz * (x - px) + ux * (z - pz)) >= 0 ? 1 : -1, half = side > 0 ? s.hr : s.hl;
      const e = { d, px, pz, ux, uz, side, half, road: s.road, t, end: t <= 0 || t >= 1 };
      if (all) { if (d < half) return e; continue; }
      if (!best || d < best.d) best = e;
    }
    return best;
  };
  /** inside a carriageway: measured class where there is one (a measured sidewalk wins over an OSM band), else OSM */
  const inside = (x, z, margin = 0) => {
    if (classAt) {
      const c = classAt(x, z);
      if (c >= 0 && !onDeck?.(x, z)) {
        if (!CLS.has(c)) return false;
        if (margin <= 0) return true;
        // margin: every point of a small cross round it is carriageway too
        return [[margin, 0], [-margin, 0], [0, margin], [0, -margin]].every(([dx, dz]) => CLS.has(classAt(x + dx, z + dz)));
      }
    }
    // OSM band: ends of a road's line are round (a junction's corner: the cross street's own band decides)
    for (const id of grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || []) {
      const s = segs[id], dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz;
      if (L2 < 1e-6) continue;
      const t = ((x - s.ax) * dx + (z - s.az) * dz) / L2;
      if (t < 0 || t > 1) continue;
      const px = s.ax + dx * t, pz = s.az + dz * t, L = Math.sqrt(L2);
      const side = (-(dz / L) * (x - px) + (dx / L) * (z - pz)) >= 0 ? 1 : -1;
      if (Math.hypot(x - px, z - pz) < (side > 0 ? s.hr : s.hl) - margin) return true;
    }
    return false;
  };
  return { inside, nearest: (x, z) => near(x, z) };
}
