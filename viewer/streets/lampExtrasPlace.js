// LAMP EXTRAS SITES (claude/reality2, rule lamp-extras, class C7 of docs/REALITY_ROUND_2026-11-26.md; no three.js:
// viewer/lampExtras.js draws them, tools/audit/lampExtrasCheck.mjs checks them in node).
// Street View (look only) on Uccle's shop streets (Parvis Saint-Pierre, Chaussee d'Alsemberg, Saint-Job, Rue Xavier de
// Bue): green swan-neck lanterns on the shop facades, red-flower baskets hung on the lamp posts, the tram's catenary
// poles painted the lamp green and carrying a lantern. Our shop streets had bare posts and steel-grey poles.
// Only where the street life draws shopfronts (data/streetlife/<T>.json pois[].face): a residential street keeps its
// plain lamps. Deterministic (a hash of the rounded position): the same city every boot.
export const WALL_H = 4.5;            // m over the sidewalk: the lantern's foot, over the shop's fascia and blade (<= ~4 m)
export const WALL_EAVES = 1.2;        // m under the eaves at least (a low shop: none)
export const WALL_GAP = 6;            // m between two wall lanterns at least
export const WALL_LAMP_GAP = 5;       // m from a lamp post: the post lights that spot already
export const BASKET_NEAR = 14;        // m: a lamp post this close to a shopfront may carry a basket
export const POLE_NEAR = 22;          // m: a tram pole with >= 2 shopfronts this close is a decorated (green, lantern) pole

const hash = (x, z, k = 0) => {
  let h = (Math.round(x * 2) * 73856093) ^ (Math.round(z * 2) * 19349663) ^ (k * 83492791);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
};

/** fronts [{ x, z, y, nx, nz, w, eaves }] (the face: centre on the wall, outward normal, width, eaves height, m TAW),
 *  lamps [{ x, z, yaw }] (the placed posts: local -z to the road), poles [{ x, z, yaw }] (tram poles: local -z to the
 *  track), inB(x, z) the tile's own bounds. Returns { wall: [{ x, z, yaw, h (over the ground), front }], baskets:
 *  [{ lamp (index), side (+1 / -1: the basket's arm along local +x / -x) }], poles: Set of pole indices } */
export function lampExtraSites(fronts, lamps, poles, inB = () => true) {
  const wall = [], baskets = [], deco = new Set();
  const F = (fronts || []).filter((f) => Number.isFinite(f.x) && Number.isFinite(f.nx));
  for (const [i, f] of F.entries()) {
    if (!inB(f.x, f.z) || !(f.w >= 3.5)) continue;
    const room = (f.eaves ?? Infinity) - (f.y ?? -Infinity) - WALL_EAVES;
    if (!(room >= WALL_H + 0.75)) continue;                              // the lantern is ~0.7 m tall
    if (hash(f.x, f.z, 1) >= 0.5) continue;                              // one front in two
    const tx = -f.nz, tz = f.nx, side = hash(f.x, f.z, 2) < 0.5 ? 1 : -1, u = side * (f.w / 2 - 0.3);
    const x = f.x + tx * u, z = f.z + tz * u;
    if (wall.some((w) => Math.hypot(w.x - x, w.z - z) < WALL_GAP)) continue;
    if ((lamps || []).some((l) => Math.hypot(l.x - x, l.z - z) < WALL_LAMP_GAP)) continue;
    wall.push({ x, z, yaw: Math.atan2(-f.nx, -f.nz), h: WALL_H, front: i });   // local -z = the outward normal
  }
  (lamps || []).forEach((l, i) => {
    if (!F.some((f) => Math.hypot(f.x - l.x, f.z - l.z) < BASKET_NEAR)) return;
    if (hash(l.x, l.z, 3) >= 0.5) return;
    baskets.push({ lamp: i, side: hash(l.x, l.z, 4) < 0.5 ? 1 : -1 });
  });
  (poles || []).forEach((p, i) => {
    let n = 0;
    for (const f of F) if (Math.hypot(f.x - p.x, f.z - p.z) < POLE_NEAR && ++n >= 2) break;
    if (n >= 2) deco.add(i);
  });
  return { wall, baskets, poles: deco };
}
