// PARKED-CAR COLLIDERS vs DRAWN PARKED CARS (road fix round 3, docs/collisions/ROAD_FIX3.md item 1; the owner, G view:
// "way too many places with invisible cars"). A collider must exist if and only if its car is drawn, where it is drawn,
// at the drawn car's size. Geometry-based, so it measures the old code too (no reliance on the collider -> car links).
//   const P = await import("/debug/parkedCheck.js"); P.check()            // every loaded tile
//   P.check({ tiles: ["E4"] })
// -> { drawn, drive: { colliders, invisible, missing, sizeOff }, walk: { ... } | null, items: [...] }
//   drawn      the fleet's parked cars that are drawn (registered by a tile still in the scene, not pulled out into the
//              traffic: viewer/carFleet.js; camera culling / the 420 m distance fade are view effects, not removals)
//   invisible  an ACTIVE parked-car collider (drive set polygon of kind car / on-foot prop "parked-cars#i") with no drawn
//              car within 0.3 m of its centre
//   missing    a drawn car with no active collider of that kind within 0.3 m
//   sizeOff    matched, but the collider's length / width differs from the drawn type's by more than 5 cm
import { KIND } from "../viewer/drive/colliders.js";
import { SIZES } from "../viewer/carFleet.js";

const near = (list, x, z, r) => { let best = null, bd = r * r; for (const c of list) { const d = (c.x - x) ** 2 + (c.z - z) ** 2; if (d < bd) { bd = d; best = c; } } return best; };

function boxOf(pts) {             // 4 corners -> centre, two side lengths (sorted: [width, length])
  let x = 0, z = 0;
  for (const [a, b] of pts) { x += a / pts.length; z += b / pts.length; }
  const s1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), s2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
  return { x, z, w: Math.min(s1, s2), l: Math.max(s1, s2) };
}

export async function check({ tiles = null, maxItems = 50 } = {}) {
  const W = window.viewer?.world, fleet = window.__carFleet;
  if (!W || !fleet) throw new Error("no city page / no car fleet");
  const names = new Set((tiles || W.tiles.map((t) => t.name)));
  const inT = (b, x, z) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
  const loaded = W.tiles.filter((t) => names.has(t.name));
  const attached = (g) => { let o = g; while (o.parent) o = o.parent; return o.isScene; };
  // the drawn cars of the tiles under test
  const drawn = [];
  for (const r of fleet.regs) if (attached(r.group)) for (const c of r.cars) {
    if (c.hidden || !loaded.some((t) => inT(t.bounds, c.x, c.z))) continue;
    const [w, , l] = SIZES[c.type] || SIZES.hatch_c;
    drawn.push({ x: c.x, z: c.z, w, l, car: c });
  }
  const items = [];
  const compare = (mode, cols) => {
    const R = { colliders: cols.length, invisible: 0, missing: 0, sizeOff: 0 };
    const used = new Set();
    for (const q of cols) {
      const c = near(drawn, q.x, q.z, 0.3);
      if (!c) { R.invisible++; if (items.length < maxItems) items.push({ mode, k: "invisible", x: +q.x.toFixed(1), z: +q.z.toFixed(1) }); continue; }
      used.add(c);
      if (Math.abs(c.w - q.w) > 0.05 || Math.abs(c.l - q.l) > 0.05) { R.sizeOff++; if (items.length < maxItems) items.push({ mode, k: "size", x: +q.x.toFixed(1), z: +q.z.toFixed(1), drawn: [c.w, c.l], col: [+q.w.toFixed(2), +q.l.toFixed(2)] }); }
    }
    for (const c of drawn) if (!used.has(c) && !near(cols, c.x, c.z, 0.3)) { R.missing++; if (items.length < maxItems) items.push({ mode, k: "missing", x: +c.x.toFixed(1), z: +c.z.toFixed(1) }); }
    return R;
  };
  // drive: the tiles' collider sets, active car polygons (a polygon whose car is not drawn is skipped by gather)
  const dcols = [];
  for (const t of loaded) {
    const col = t.drive?.col; if (!col) continue;
    for (let p = 0; p < col.P; p++) {
      if (col.pkind[p] !== KIND.car || col.pref?.[p]?.hidden) continue;
      const r = col.polyRing[p], s = col.ringStart[r], e = col.ringStart[r + 1], pts = [];
      for (let i = s; i < e; i++) pts.push([col.pts[i * 2], col.pts[i * 2 + 1]]);
      const b = boxOf(pts);
      if (inT(t.bounds, b.x, b.z)) dcols.push(b);
    }
  }
  const out = { drawn: drawn.length, drive: compare("drive", dcols), walk: null, items };
  // on foot: the shared city collision world's prop prisms (viewer/character/cityHook.js), when it is running
  try {
    const H = await import("../viewer/character/cityHook.js");
    const cw = (await H.cityCollision({ scene: window.viewer.scene, world: W }))?.cw;
    const wcols = [];
    for (const s of cw?.sources || []) {
      if (!s.ids || s.tag !== 4) continue;
      for (let k = 0; k < s.P; k++) {
        if (s.off[k] || !String(s.ids[k]).startsWith("parked-cars#")) continue;
        const r = s.polyRing[k], a = s.ringStart[r], e = s.ringStart[r + 1], pts = [];
        for (let i = a; i < e; i++) pts.push([s.pts[i * 2], s.pts[i * 2 + 1]]);
        const b = boxOf(pts);
        if (loaded.some((t) => inT(t.bounds, b.x, b.z))) wcols.push(b);
      }
    }
    if (wcols.length || drawn.length) out.walk = compare("walk", wcols);
  } catch (e) { out.walkError = String(e?.message || e); }
  return out;
}
