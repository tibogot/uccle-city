// COLLIDER AUDIT: every drive collider of a tile against what the city DRAWS there, and the reverse.
// (docs/CITY_TREES.md §3; the owner: "invisible things block the car")
//
//   building  a footprint the car hits: visible unless the solid is hidden (no hero model there) or ELEVATED (its base
//             is more than CAR_CLEAR over the ground everywhere under it: an upper-floor overhang, a passage, a bridge;
//             nothing is drawn at car height)
//   island    a kerbed island / median: visible when the DRAWN surface inside it is raised (the drive ground grid,
//             made from the drawn road meshes, is >= RAISED above the carved terrain on most of its points)
//   tree      a trunk: visible when a drawn tree stands within 0.3 m
//   lamp      a lamp post: visible when a drawn lamp stands within 0.5 m
//   post      a bollard: visible when a drawn bollard stands within 0.3 m
// Reverse ("drawn, no collider"): drawn trees / lamps / bollards with no circle of their kind within the same
// distances, and the measured medians (raised, kerbed) no island collider covers.
//
// Pure JS (no three.js): the city (window.viewer.auditColliders()) and tools/collider-audit.html run it.
import { KIND, CAR_CLEAR, inRings, samplesIn, raisedShare, clearanceUnder } from "./colliders.js";
const KIND_NAME = Object.fromEntries(Object.entries(KIND).map(([k, v]) => [v, k]));

/** A point lookup grid for drawn points. */
function pointGrid(pts, cell = 4) {
  const m = new Map();
  for (const p of pts) { const k = `${Math.floor(p.x / cell)},${Math.floor(p.z / cell)}`; (m.get(k) || m.set(k, []).get(k)).push(p); }
  return (x, z, r) => {
    const i = Math.floor(x / cell), j = Math.floor(z / cell);
    for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) for (const p of m.get(`${a},${b}`) || []) if ((p.x - x) ** 2 + (p.z - z) ** 2 <= r * r) return p;
    return null;
  };
}

function ringsOf(col, p) {
  const out = [];
  for (let r = col.polyRing[p]; r < col.polyRing[p + 1]; r++) {
    const ring = [];
    for (let i = col.ringStart[r]; i < col.ringStart[r + 1]; i++) ring.push([col.pts[i * 2], col.pts[i * 2 + 1]]);
    out.push(ring);
  }
  return out;
}
/**
 * tile = { name, bounds, hm, drive: { col, ground: { delta }, medians? }, drawn: { trees: [{x, z}], lamps: [{x, z}],
 *          bollards: [{x, z}], hiddenBuildings: number (solids not drawn: a hero model stands there) } }
 * Returns { tile, colliders: {kind: n}, invisible: {reason: n}, missing: {kind: n}, items: [{kind, x, z, why}] }
 */
export function auditTile(tile) {
  const { col, ground } = tile.drive, hm = tile.hm, D = tile.drawn, b = tile.bounds;
  const inT = (x, z) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
  const trees = pointGrid(D.trees), lamps = pointGrid(D.lamps), bolls = pointGrid(D.bollards);
  const R = { tile: tile.name, colliders: {}, invisible: {}, missing: {}, items: [] };
  R.ids = new Set();     // collider ids (colliders.js: < P a polygon, else P + circle) with no visible object
  const bad = (kind, x, z, why, id) => { R.invisible[why] = (R.invisible[why] || 0) + 1; R.ids.add(id); R.items.push({ kind, x: +x.toFixed(1), z: +z.toFixed(1), why }); };
  for (let p = 0; p < col.P; p++) {
    const k = col.pkind[p], name = KIND_NAME[k];
    R.colliders[name] = (R.colliders[name] || 0) + 1;
    const rings = ringsOf(col, p), c = samplesIn(rings)[0];
    if (k === KIND.island) {
      const sh = raisedShare(hm, ground.delta, rings);
      if (sh < 0.5) bad(name, c[0], c[1], "island: no raised kerb drawn", p);
    } else if (k === KIND.building && col.pbase) {
      const base = col.pbase[p];
      if (base > -1e3 && clearanceUnder(hm, rings, base) > CAR_CLEAR) bad(name, c[0], c[1], "building: overhead solid (nothing at car height)", p);
    }
  }
  for (let i = 0; i < col.C; i++) {
    const x = col.circ[i * 3], z = col.circ[i * 3 + 1], k = col.ckind[i], name = KIND_NAME[k];
    R.colliders[name] = (R.colliders[name] || 0) + 1;
    if (k === KIND.tree && !trees(x, z, 0.3)) bad(name, x, z, "tree: no tree drawn", col.P + i);
    else if (k === KIND.lamp && !lamps(x, z, 0.5)) bad(name, x, z, "lamp: no lamp drawn", col.P + i);
    else if (k === KIND.post && !bolls(x, z, 0.3)) bad(name, x, z, "post: no bollard drawn", col.P + i);
  }
  if (D.hiddenBuildings) R.invisible["building: hidden solid (hero model drawn instead: kept)"] = D.hiddenBuildings;
  // the reverse: drawn, no collider
  const circ = [];
  for (let i = 0; i < col.C; i++) circ.push({ x: col.circ[i * 3], z: col.circ[i * 3 + 1], k: col.ckind[i] });
  const byKind = (k) => pointGrid(circ.filter((q) => q.k === k));
  const tc = byKind(KIND.tree), lc = byKind(KIND.lamp), pc = byKind(KIND.post);
  const miss = (kind, x, z) => { R.missing[kind] = (R.missing[kind] || 0) + 1; R.items.push({ kind, x: +x.toFixed(1), z: +z.toFixed(1), why: `${kind}: drawn, no collider` }); };
  for (const t of D.trees) if (inT(t.x, t.z) && !tc(t.x, t.z, 0.3)) miss("tree", t.x, t.z);
  for (const l of D.lamps) if (!lc(l.x, l.z, 0.5)) miss("lamp", l.x, l.z);
  for (const q of D.bollards) if (!pc(q.x, q.z, 0.3)) miss("bollard", q.x, q.z);
  const islands = [];
  for (let p = 0; p < col.P; p++) if (col.pkind[p] === KIND.island) islands.push(ringsOf(col, p));
  for (const m of tile.drive.medians || []) {
    const c = samplesIn(m);
    const covered = c.filter(([x, z]) => islands.some((r) => inRings(r, x, z))).length / c.length;
    if (covered < 0.5) miss("median (raised, kerbed)", c[0][0], c[0][1]);
  }
  return R;
}

/** Sum of tile audits. */
export function sumAudits(list) {
  const S = { tiles: list.length, colliders: {}, invisible: {}, missing: {} };
  for (const r of list) for (const k of ["colliders", "invisible", "missing"]) for (const [n, v] of Object.entries(r[k])) S[k][n] = (S[k][n] || 0) + v;
  return S;
}
