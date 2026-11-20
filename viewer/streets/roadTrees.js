// LIDAR TREES OFF THE DRAWN CARRIAGEWAY (claude/drivecheck round 2, rule 27; ?roadtrees=old: as before). Tile worker.
//
// build_trees.py places a tree at each LiDAR canopy-height PEAK; a street tree's crown leans over the road, so its peak
// often lies over the carriageway, metres from its trunk. pipeline/filter_road_trees.py moves / drops such trees, but only
// against the MEASURED UrbIS street surfaces: where a street has none (private "clos", drèves, the streets past the
// region's edge, ~half the census) the road is drawn from the OSM band, and the trunk stood in it, drawn and colliding
// (tools/audit/driveCheck.mjs: 63 trunks in the carriageway). Here, at the tile build, the same rule runs against what is
// DRAWN as carriageway (viewer/streets/carriageway.js: the measured class where there is one, else the OSM band), before
// the colliders and the drawn tree list are made from feats.trees: one decision for both.
//
//   treesOffCarriageway(trees, driven, { inTile, inBuilding, ground }) -> { trees, moved, dropped }
//     a LiDAR tree (source "urbis-chm") whose point is on the carriageway (a tree in a pit at the kerb or in a median
//     stays, also when its trunk reaches a little into the road), MOVES to the nearest point
//     CLEAR m off it (not in a building, in the tile, at most clamp(0.8 x crown, 1.5, 4) m away: about a crown radius),
//     else, or when the new spot is within DUP m of another tree (its trunk is probably there already), it is DROPPED.
//     OSM trees (mapped trunks) are left alone. When a tree is dropped, every kept one carries `vi` (its index before):
//     viewer/treesStylized.js picks its look by it, so the other trees of the tile keep theirs.
export const CLEAR = 0.6, MOVE_MIN = 1.5, MOVE_MAX = 4, DUP = 1.8;
const DIRS = 24;

export function treesOffCarriageway(trees, driven, { inTile = () => true, inBuilding = () => false, ground = null, keep = null, avoid = null } = {}) {
  if (!trees?.length) return { trees, moved: 0, dropped: 0 };
  const ring = Array.from({ length: 8 }, (_, k) => [Math.cos(k / 8 * 2 * Math.PI) * CLEAR, Math.sin(k / 8 * 2 * Math.PI) * CLEAR]);
  // (avoid: another driven test the new spot keeps off too: the path pass never moves a trunk onto the carriageway)
  const off = (x, z) => driven.inside(x, z, 0) || (avoid ? avoid.inside(x, z, 0) : false);
  const touches = (x, z) => off(x, z) || ring.some(([dx, dz]) => off(x + dx, z + dz));
  // (browser turn: also moving trunks that only REACH 0.3 m in moved the real tree rows in narrow medians and kerb pits,
  // Avenue Churchill's central reservation: the point alone decides, as the pipeline's rule)
  const intrudes = (t) => driven.inside(t.x, t.z, 0);
  // the other trees, on a 4 m grid (duplicates)
  const G = new Map(), key = (x, z) => `${Math.floor(x / 4)},${Math.floor(z / 4)}`;
  const add = (t) => { const k = key(t.x, t.z); if (!G.has(k)) G.set(k, []); G.get(k).push(t); };
  const near = (x, z, self) => { const i = Math.floor(x / 4), j = Math.floor(z / 4);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const o of G.get(`${i + di},${j + dj}`) || []) if (o !== self && Math.hypot(o.x - x, o.z - z) < DUP) return true;
    return false; };
  const hadVi = trees.some((t) => t.vi != null);
  const bad = new Set();
  for (const t of trees) { if (t.source === "urbis-chm" && intrudes(t) && !keep?.(t)) bad.add(t); else add(t); }
  if (!bad.size) return { trees, moved: 0, dropped: 0 };
  let moved = 0, dropped = 0;
  const out = [];
  for (const [i, t] of trees.entries()) {
    if (!bad.has(t)) { out.push(t); t.vi = t.vi ?? i; continue; }
    const maxR = Math.min(MOVE_MAX, Math.max(MOVE_MIN, 0.8 * (t.crown || 3)));
    let spot = null;
    for (let r = 0.25; r <= maxR + 1e-6 && !spot; r += 0.25) {
      for (let k = 0; k < DIRS; k++) {
        const a = k / DIRS * 2 * Math.PI, x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r;
        if (!inTile(x, z) || inBuilding(x, z) || touches(x, z)) continue;
        spot = [x, z]; break;
      }
    }
    if (!spot || near(spot[0], spot[1], t)) { dropped++; continue; }
    const m = { ...t, x: +spot[0].toFixed(2), z: +spot[1].toFixed(2), moved: [t.x, t.z], vi: t.vi ?? i };
    if (ground && m.y != null) m.y = +ground(m.x, m.z).toFixed(2);
    out.push(m); add(m); moved++;
  }
  // (the street trees' look is picked by the tree's INDEX in the list, viewer/treesStylized.js variantOfIndex: a dropped
  // tree shifted every later tree of the tile to another variant, the tour saw whole streets of trees change. `vi` =
  // the index each kept tree had, the drawers pick its variant by it; no drop: no vi, as before)
  // (a second pass over an already filtered list keeps the first pass's vi: the index in the ORIGINAL list)
  if (!dropped && !hadVi) for (const t of out) delete t.vi;
  return { trees: out, moved, dropped };
}

/**
 * markings round 2 (claude/markings, rule 33): the PAINTED driving lanes of the roads fitted to the measured carriageway
 * (viewer/streets/lineFit.js), as a test (x, z) -> true within `margin` m of one (a driving, bus or turn lane). A tree
 * on a measured TRAM road is kept by the pass above (Avenue Churchill's rows stand on the tram reservation), but one
 * standing in a painted driving lane is wrong in reality too: tileData moves / drops those with this test. A tree in a
 * ROW on the tram road (two more within 12 m: Churchill's reservation, which the engine's single-road stack paints over)
 * is kept (tileData `keep`).
 */
export function paintedDriveLanes(net, paintedLaneCentre, roadFrameOf, margin = 0.3) {
  const fit = net?.lineFit;
  if (!fit?.fitOf?.size) return null;
  const C = 16, cells = new Map(), K = (i, j) => i * 65536 + j;
  for (const [ri] of fit.fitOf) {
    const rr = net.roads[ri], S = rr.smp, r = 12;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < S.s.length; i++) { x0 = Math.min(x0, S.x[i]); x1 = Math.max(x1, S.x[i]); z0 = Math.min(z0, S.z[i]); z1 = Math.max(z1, S.z[i]); }
    for (let i = Math.floor((x0 - r) / C); i <= Math.floor((x1 + r) / C); i++)
      for (let j = Math.floor((z0 - r) / C); j <= Math.floor((z1 + r) / C); j++) { const k = K(i, j); (cells.get(k) || cells.set(k, []).get(k)).push(rr); }
  }
  const DRIVE = new Set(["driving", "bus", "turn"]);
  return (x, z) => {
    for (const rr of cells.get(K(Math.floor(x / C), Math.floor(z / C))) || []) {
      const q = roadFrameOf(rr, x, z);
      if (q.s < rr.smp.s[0] - 0.5 || q.s > rr.smp.s[rr.smp.s.length - 1] + 0.5) continue;
      for (const d of [0, margin, -margin]) {
        const p = paintedLaneCentre(net, fit, rr, x + q.nx * d, z + q.nz * d);
        if (p && DRIVE.has(p.type)) return true;
      }
    }
    return false;
  };
}

/**
 * claude/moto (2026-11-19, rule 27): the traffic's DRIVEN PATHS (viewer/traffic/trafficGraph.js: every lane piece and
 * junction turn) as a corridor test (x, z, m) -> true within `half` + m of one. The carriageway test above leaves a trunk
 * where no street surface is measured and a junction turn cuts the corner outside the OSM band (Kauwberg x Chaussée de
 * Saint-Job: a LiDAR trunk 0.11 m from the turn, the motorbike's feel test rode into it): tileData moves / drops the
 * LiDAR trees in this corridor too (half = a car's half width 0.9 + a trunk ~0.3 m).
 */
export const PATH_HALF = 1.25;
export function pathCorridor(traffic, half = PATH_HALF) {
  if (!traffic?.xy || !traffic.paths) return null;
  const C = 4, cells = new Map(), K = (i, j) => i * 65536 + j, xy = traffic.xy, off = traffic.off;
  for (let p = 0; p < traffic.paths; p++) for (let k = off[p]; k < off[p + 1] - 1; k++) {
    const ax = xy[2 * k], az = xy[2 * k + 1], bx = xy[2 * k + 2], bz = xy[2 * k + 3];
    for (let i = Math.floor((Math.min(ax, bx) - half - 1) / C); i <= Math.floor((Math.max(ax, bx) + half + 1) / C); i++)
      for (let j = Math.floor((Math.min(az, bz) - half - 1) / C); j <= Math.floor((Math.max(az, bz) + half + 1) / C); j++) {
        const q = K(i, j); (cells.get(q) || cells.set(q, []).get(q)).push(k);
      }
  }
  return { inside: (x, z, m = 0) => {
    const r = half + m;
    for (const k of cells.get(K(Math.floor(x / C), Math.floor(z / C))) || []) {
      const ax = xy[2 * k], az = xy[2 * k + 1], dx = xy[2 * k + 2] - ax, dz = xy[2 * k + 3] - az, L2 = dx * dx + dz * dz;
      const t = L2 > 1e-9 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0;
      const ex = ax + dx * t - x, ez = az + dz * t - z;
      if (ex * ex + ez * ez < r * r) return true;
    }
    return false;
  } };
}
