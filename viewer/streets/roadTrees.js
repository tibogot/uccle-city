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

export function treesOffCarriageway(trees, driven, { inTile = () => true, inBuilding = () => false, ground = null } = {}) {
  if (!trees?.length) return { trees, moved: 0, dropped: 0 };
  const ring = Array.from({ length: 8 }, (_, k) => [Math.cos(k / 8 * 2 * Math.PI) * CLEAR, Math.sin(k / 8 * 2 * Math.PI) * CLEAR]);
  const touches = (x, z) => driven.inside(x, z, 0) || ring.some(([dx, dz]) => driven.inside(x + dx, z + dz, 0));
  // (browser turn: also moving trunks that only REACH 0.3 m in moved the real tree rows in narrow medians and kerb pits,
  // Avenue Churchill's central reservation: the point alone decides, as the pipeline's rule)
  const intrudes = (t) => driven.inside(t.x, t.z, 0);
  // the other trees, on a 4 m grid (duplicates)
  const G = new Map(), key = (x, z) => `${Math.floor(x / 4)},${Math.floor(z / 4)}`;
  const add = (t) => { const k = key(t.x, t.z); if (!G.has(k)) G.set(k, []); G.get(k).push(t); };
  const near = (x, z, self) => { const i = Math.floor(x / 4), j = Math.floor(z / 4);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const o of G.get(`${i + di},${j + dj}`) || []) if (o !== self && Math.hypot(o.x - x, o.z - z) < DUP) return true;
    return false; };
  const bad = new Set();
  for (const t of trees) { if (t.source === "urbis-chm" && intrudes(t)) bad.add(t); else add(t); }
  if (!bad.size) return { trees, moved: 0, dropped: 0 };
  let moved = 0, dropped = 0;
  const out = [];
  for (const [i, t] of trees.entries()) {
    if (!bad.has(t)) { out.push(t); t.vi = i; continue; }
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
    const m = { ...t, x: +spot[0].toFixed(2), z: +spot[1].toFixed(2), moved: [t.x, t.z], vi: i };
    if (ground && m.y != null) m.y = +ground(m.x, m.z).toFixed(2);
    out.push(m); add(m); moved++;
  }
  // (the street trees' look is picked by the tree's INDEX in the list, viewer/treesStylized.js variantOfIndex: a dropped
  // tree shifted every later tree of the tile to another variant, the tour saw whole streets of trees change. `vi` =
  // the index each kept tree had, the drawers pick its variant by it; no drop: no vi, as before)
  if (!dropped) for (const t of out) delete t.vi;
  return { trees: out, moved, dropped };
}
