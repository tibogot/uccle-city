// WHERE CARS DRIVE, per tile, on the main thread (citydefects 2026-11-16, owner playtest: a garden fence across the road
// at the Saint-Job station bridge, traffic lights and tram poles standing in the road). One test shared by the things
// that must never stand in a driven lane: garden pieces (viewer/gardens/cityGardens.js), signal posts (viewer/furniture.js),
// tram poles (viewer/tram.js), and the audit (debug/furnitureAudit.js).
//
//   carriageway(roads, { classAt, onDeck, bandOnMeasured, drawn })  ->  { inside(x, z, margin = 0), nearest(x, z) }
//     inside   true where (x, z) is on a carriageway: the MEASURED one (UrbIS street surfaces: roadway, tram road,
//              parking; fit.classAt of viewer/streetFit.js) where the tile has them, else (and also: UrbIS predates the
//              2025 Carsoel deck) within the OSM road's carriageway half width (its lanes; the engine type's defaults
//              without), `margin` m shrunk from the edge (> 0: only well inside)
//     nearest  the nearest OSM road centre point: { d, px, pz, ux, uz, half (carriageway half width), road }
// Footways, paths, cycleways, service roads and steps are not carriageways (a lane through a car park is not either).
import { ROAD_TYPES } from "../../vendor/roads/roadCrossSection.js";

export const NOT_DRIVEN = new Set(["footway", "path", "cycleway", "steps", "pedestrian", "bridleway", "track", "service", "corridor", "platform"]);
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

export function carriageway(roads, { classAt = null, onDeck = null, lanesOnly = false, bandOnMeasured = false, drawn = null } = {}) {
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
    // (claude/roads, rule 38: where UrbIS measures the ROAD itself (its centre line's point here lies on a measured
    // surface), land the survey leaves out of its street surfaces is not carriageway: a front garden, a building. The
    // band used to reach 1-6 m past the measured street's edge onto private land, where main.js then dropped the
    // garden kit's walls / railings / hedges as "on the carriageway" (Rue Papenkasteel: the lawns opened to the car).
    // bandOnMeasured: as before, ?roads=old). Unless the city DRAWS a street there all the same (drawn(x, z): the
    // engine's own pieces kept past the survey where no measured edge cuts them: a forecourt mouth on the Chaussée de
    // Waterloo, J6 1726, 571: asphalt over class -1, a laurel stood on it)
    const bandOk = (px, pz) => bandOnMeasured || !classAt || classAt(px, pz) < 0 || !!onDeck?.(px, pz) || !!drawn?.(x, z);
    for (const id of grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || []) {
      const s = segs[id], dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz;
      if (L2 < 1e-6) continue;
      const t = ((x - s.ax) * dx + (z - s.az) * dz) / L2;
      if (t < 0 || t > 1) continue;
      const px = s.ax + dx * t, pz = s.az + dz * t, L = Math.sqrt(L2);
      const side = (-(dz / L) * (x - px) + (dx / L) * (z - pz)) >= 0 ? 1 : -1;
      if (Math.hypot(x - px, z - pz) < (side > 0 ? s.hr : s.hl) - margin && bandOk(px, pz)) return true;
    }
    return false;
  };
  return { inside, nearest: (x, z) => near(x, z) };
}

/** claude/roads (rule 38): "a street is drawn here" from the drive raster (viewer/drive/colliders.js driveGround: cm
 *  of road / sidewalk / island surface over the carved terrain on the 1 m grid of header h, 65535 = none): the
 *  carriageway test's `drawn` (the OSM band past a measured street only where the city draws a street) */
export function drawnTest(h, delta) {
  if (!h || !delta) return null;
  return (x, z) => { const c = Math.round((x - h.x0) / h.step), r = Math.round((z - h.z0) / h.step); if (c < 0 || r < 0 || c >= h.cols || r >= h.rows) return false; const v = delta[r * h.cols + c]; return v > 0 && v !== 65535; };
}

// POINT FURNITURE OUT OF THE LANES (citydefects 2026-11-16): the baked data layers (data/streetkit signs / plate posts,
// data/stops poles / shelters / panels, data/furniture benches / bins / hoops / bike boxes / glass banks) were placed by
// their builders against older street edges: 258 signs, 361 plate posts, 64 stop poles, 51 bike boxes stood in a driven
// lane city-wide (tools/audit/streetAudit.mjs). At load, a point in a lane moves onto the nearest raised surface, 0.5 m
// behind the measured kerb (as the lamps), keeping its yaw; no kerb within 6 m: it stays.
// STREET PROPS (class D, claude/streetprops 2026-11-18, rule 30 provisional): the move above gave up where there is no
// measured kerb within 6 m (Flanders: no UrbIS street at all) and never looked at the tram tracks: post boxes, Villo
// docks, signs and plate posts stood in the Chaussée d'Alsemberg / on its tracks. With `opt` (the default since then):
//   tram   a trackIndex(): a point within TRAM_CLEAR of a tram track centre is in the road too, and no spot there is taken
//   osm    no measured kerb spot: the OSM street width decides (the nearest driven road's carriageway half width on the
//          point's own side + 0.6 / 1.0 / 1.6 m, then the other side; on measured ground only onto a raised surface),
//          else the nearest free spot within 8 m
//   ground (x, z) -> the un-carved DTM: a moved baked y follows the ground (not only the kerb lift)
// The result carries the road side's normal (nx, nz: from the spot toward the road) for the things that face the street.
export const TRAM_CLEAR = 1.5;      // a prop's centre from a tram track's centre (the car body's half width 1.15 + 0.35)

/** tram track centre lines ([[x, z], ...][], as viewer/track.js smoothPolyline draws them) -> { dist(x, z) } (m, or
 *  Infinity beyond 4 m) */
export function trackIndex(lines, C = 8) {
  const segs = [], grid = new Map(), key = (i, j) => `${i},${j}`;
  for (const pts of lines || []) for (let k = 1; k < pts.length; k++) {
    const [ax, az] = pts[k - 1], [bx, bz] = pts[k], id = segs.push([ax, az, bx, bz]) - 1;
    for (let i = Math.floor((Math.min(ax, bx) - 4) / C); i <= Math.floor((Math.max(ax, bx) + 4) / C); i++)
      for (let j = Math.floor((Math.min(az, bz) - 4) / C); j <= Math.floor((Math.max(az, bz) + 4) / C); j++) { const q = key(i, j); if (!grid.has(q)) grid.set(q, []); grid.get(q).push(id); }
  }
  const dist = (x, z) => {
    let best = Infinity;
    for (const id of grid.get(key(Math.floor(x / C), Math.floor(z / C))) || []) {
      const [ax, az, bx, bz] = segs[id], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      if (L2 < 1e-9) continue;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), d = Math.hypot(x - ax - dx * t, z - az - dz * t);
      if (d < best) best = d;
    }
    return best <= 4 ? best : Infinity;
  };
  return { dist, size: segs.length };
}

/** (x, z) -> { x, z, moved, nx?, nz? } . lanes: carriageway(..., { lanesOnly: true }); fit: viewer/streets/fitCore.js
 *  streetFit (null: no measured street); opt { tram, osm } (above; {} = the 2026-11-16 move, ?streetprops=old) */
export function offLane(x, z, lanes, fit, opt = {}) {
  const { tram = null, osm = false, rail = null, y = null } = opt;
  // (CLASS T, rule 39) rail: viewer/rail/railData.js railBed: a track bed is road too (no prop on the rails); y = the
  // point's own height (a point on a road deck over the line is not on the bed)
  const onTram = (px, pz) => (!!tram && tram.dist(px, pz) < TRAM_CLEAR) || (!!rail && rail.on(px, pz, y));
  if (!lanes || (!fit && !osm) || !(lanes.inside(x, z, 0) || onTram(x, z))) return { x, z, moved: false };
  const free = (px, pz) => !lanes.inside(px, pz, 0) && !onTram(px, pz);
  const k = fit ? fit.nearKerb(x, z, 6) : null;
  if (k) for (const back of [0.5, 0.35, 0.8, 1.2]) {
    const qx = k.x + k.lx * back, qz = k.z + k.lz * back;
    if (fit.lift(qx, qz) > 0 && free(qx, qz)) return { x: qx, z: qz, moved: true, nx: -k.lx, nz: -k.lz };
  }
  if (osm) {
    const e = lanes.nearest(x, z);
    if (e) {
      const [hl, hr] = carriageHalf(e.road), rx = -e.uz, rz = e.ux;      // the road's right normal
      for (const side of [e.side, -e.side]) for (const extra of [0.6, 1.0, 1.6]) {
        const h = (side > 0 ? hr : hl) + extra, qx = e.px + rx * side * h, qz = e.pz + rz * side * h;
        if (!free(qx, qz)) continue;
        if (fit && fit.classAt(qx, qz) >= 0 && !(fit.lift(qx, qz) > 0)) continue;     // measured ground: a raised surface only
        return { x: qx, z: qz, moved: true, nx: -rx * side, nz: -rz * side };
      }
    }
    // neither (a junction's corner: every OSM side spot is in another street's band; no kerb near): the nearest free
    // spot round the point (rings 1-8 m, 16 directions; raised where measured), facing back to where it stood
    for (let r = 1; r <= 8; r += 0.5) for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8, qx = x + Math.cos(a) * r, qz = z + Math.sin(a) * r;
      if (!free(qx, qz) || (fit && fit.classAt(qx, qz) >= 0 && !(fit.lift(qx, qz) > 0))) continue;
      return { x: qx, z: qz, moved: true, nx: -Math.cos(a), nz: -Math.sin(a) };
    }
  }
  return { x, z, moved: false };
}

/** a data layer doc with every listed point moved out of the lanes (a copy; a baked y gets the kerb's rise: + the
 *  measured lift there - the lift where it stood; with opt.ground also the ground's). paths: [["stops", "pole"],
 *  ["signs"], ...]; opt: offLane's + ground + keep (p -> true: left where it is) */
export function docOffLanes(doc, paths, lanes, fit, opt = {}) {
  if (!doc) return { doc, moved: 0, dropped: 0 };
  let moved = 0, dropped = 0;
  const lift = (x, z) => (fit ? fit.lift(x, z) : 0) + (opt.ground ? opt.ground(x, z) : 0);
  // (rule 39) opt.drop(p) -> true: the point is left out (inside a hero road bridge: its model draws what stands on it)
  const fix = (p) => { if (!p || typeof p.x !== "number" || opt.keep?.(p)) return p; if (opt.drop?.(p)) { dropped++; return null; }
    const r = offLane(p.x, p.z, lanes, fit, opt.rail ? { ...opt, y: p.y } : opt); if (!r.moved) return p; moved++;
    return { ...p, x: r.x, z: r.z, ...(typeof p.y === "number" ? { y: p.y + lift(r.x, r.z) - lift(p.x, p.z) } : {}) }; };
  const out = { ...doc };
  for (const [key, sub] of paths) {
    if (!Array.isArray(doc[key])) continue;
    // (streetprops: from out[key], not doc[key]: a second path on the same key, ["stops", "shelter"] after
    // ["stops", "pole"], threw the first one's moves away: no STIB pole was ever moved; ?streetprops=old as before)
    out[key] = (opt.osm ? out[key] : doc[key]).map((it) => (sub ? (it?.[sub] ? { ...it, [sub]: fix(it[sub]) } : it) : fix(it)));
    if (opt.drop) out[key] = out[key].filter((it) => (sub ? !(it?.[sub] === null) : it !== null));
  }
  return { doc: out, moved, dropped };
}
