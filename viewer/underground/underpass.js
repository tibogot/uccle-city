// THE CALEVOET PEDESTRIAN UNDERPASS U1: what the TILE WORKER does (docs/CALEVOET_UNDERPASS_PLAN.md §4; rule
// underpass-wells). The model (tools/blender/underpass.py -> models/underpass/calevoet.json) gives the two stair WELLS:
// the kiosks' inner rectangles (one wall with the well's) out to the mouth's landing slab. The city's ground stays where
// it is everywhere else (the corridor runs under the drawn terrain, the ballast and the tracks): only the wells open.
//   underpassTerrain(up, terrain)   the DRAWN terrain (tileData.js terrainArrays, before the simplification): every
//                                   triangle inside a well dropped, every one crossing a well's rim CLIPPED at it (the
//                                   outside part kept, heights on the triangle's own plane: the cut edge lies on the
//                                   kiosk's inner wall face / the landing slab's skirt, no floating edge, no stair-step);
//                                   the simplification (LockBorder) keeps the hole's border where it is
//   underpassSurfaces(surf, up)     a measured street surface round a well gets the well as a HOLE (the west kiosk stands
//                                   in the Rue Egide Van Ophem sidewalk 138343: its paving covered the stair mouth)
//   underpassLines(feats, up)       U1's OSM tunnel ways out of the land cover's path strokes (a footway "on" the ballast)
// hm.surface / hm.ground are NOT changed: cars, the road engine, birds and the falcon see the old ground (the kiosk walls
// stand round the wells; the walker gets "voids" instead: viewer/character/world.js Heightfield.voids).
// Pure JS (no three.js): the tile worker, the main thread and the gate row (tools/audit/underpassCheck.mjs) run it.
// Switch: ?underpass=0 (entry.underpass false): none of this, today's city exactly.

export const UNDERPASS_WAYS = ["osm:w30235696", "osm:w640826544", "osm:w640826545"];
export const UNDERPASS_ROOT = "underpass-calevoet";
export const underpassOn = () => typeof location === "undefined" || new URLSearchParams(location.search).get("underpass") !== "0";

let docP = null;
/** models/underpass/calevoet.json, fetched once per worker (null when missing) */
export const loadUnderpass = (base) => (docP ??= fetch(new URL("../../models/underpass/calevoet.json", base)).then((r) => (r.ok ? r.json() : null)).catch(() => null));

const box = (ring) => { let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (const [x, z] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { x0, x1, z0, z1 }; };
export const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
/** the standard signed area (> 0: counter-clockwise in a right-handed (x, z) plane: the inside to the LEFT of each edge) */
const area = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return a / 2; };
/** the well rings, counter-clockwise in (x, z) (the half-plane tests below assume it), with their boxes */
export function wellRings(up) {
  return (up?.wells || []).map((w) => {
    const r = area(w.ring) > 0 ? w.ring.slice() : w.ring.slice().reverse();
    return { name: w.name, ring: r, box: box(r) };
  });
}

/**
 * Clip the drawn terrain at the wells (in place: terrain = { pos, nrm, idx }). Returns { dropped, clipped, added,
 * pieces } (pieces: the triangles made from clipped ones).
 */
export function underpassTerrain(up, terrain) {
  const wells = wellRings(up);
  if (!wells.length) return null;
  const P = terrain.pos, Nn = terrain.nrm, I = terrain.idx;
  const out = [], newPos = [], newNrm = [];
  const vmap = new Map();
  let nv = P.length / 3, dropped = 0, clipped = 0, pieces = 0;
  // a polygon vertex: [x, y, z, nx, ny, nz, index or -1]
  const vert = (k) => [P[k * 3], P[k * 3 + 1], P[k * 3 + 2], Nn[k * 3], Nn[k * 3 + 1], Nn[k * 3 + 2], k];
  const lerp = (a, b, t) => { const v = new Array(7); for (let i = 0; i < 6; i++) v[i] = a[i] + (b[i] - a[i]) * t; v[6] = -1; return v; };
  // half-plane of ring edge e (CCW ring: the inside is to the left): s(p) > 0 = outside
  const side = (r, e, p) => { const [ax, az] = r[e], [bx, bz] = r[(e + 1) % r.length]; return -((bx - ax) * (p[2] - az) - (bz - az) * (p[0] - ax)); };
  const clipPoly = (poly, r, e, keepOut) => {
    const res = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], sa = side(r, e, a), sb = side(r, e, b);
      const ina = keepOut ? sa > 0 : sa <= 0, inb = keepOut ? sb > 0 : sb <= 0;
      if (ina) res.push(a);
      if (ina !== inb) res.push(lerp(a, b, sa / (sa - sb)));
    }
    return res;
  };
  const index = (v) => {
    if (v[6] >= 0) return v[6];
    const key = `${Math.round(v[0] * 1e4)},${Math.round(v[2] * 1e4)}`;
    let k = vmap.get(key);
    if (k === undefined) { k = nv++; vmap.set(key, k); newPos.push(v[0], v[1], v[2]); const l = Math.hypot(v[3], v[4], v[5]) || 1; newNrm.push(v[3] / l, v[4] / l, v[5] / l); }
    return k;
  };
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    const tx0 = Math.min(P[a * 3], P[b * 3], P[c * 3]), tx1 = Math.max(P[a * 3], P[b * 3], P[c * 3]);
    const tz0 = Math.min(P[a * 3 + 2], P[b * 3 + 2], P[c * 3 + 2]), tz1 = Math.max(P[a * 3 + 2], P[b * 3 + 2], P[c * 3 + 2]);
    const w = wells.find((q) => tx1 > q.box.x0 && tx0 < q.box.x1 && tz1 > q.box.z0 && tz0 < q.box.z1);
    if (!w) { out.push(a, b, c); continue; }
    // the parts outside each edge in turn (disjoint), what stays after all edges is inside the well: dropped
    let rest = [vert(a), vert(b), vert(c)];
    const parts = [];
    for (let e = 0; e < w.ring.length && rest.length >= 3; e++) {
      const o = clipPoly(rest, w.ring, e, true);
      if (o.length >= 3) parts.push(o);
      rest = clipPoly(rest, w.ring, e, false);
    }
    if (rest.length < 3) { out.push(a, b, c); continue; }          // wholly outside (one edge's outside held all of it)
    if (!parts.length) { dropped++; continue; }                     // wholly inside the well
    clipped++;
    for (const poly of parts) {
      const ids = poly.map(index);
      for (let i = 1; i + 1 < ids.length; i++) {
        if (ids[0] === ids[i] || ids[i] === ids[i + 1] || ids[0] === ids[i + 1]) continue;
        out.push(ids[0], ids[i], ids[i + 1]); pieces++;
      }
    }
  }
  if (newPos.length) {
    const p2 = new Float32Array(P.length + newPos.length); p2.set(P); p2.set(newPos, P.length);
    const n2 = new Float32Array(Nn.length + newNrm.length); n2.set(Nn); n2.set(newNrm, Nn.length);
    terrain.pos = p2; terrain.nrm = n2;
  }
  terrain.idx = Uint32Array.from(out);
  return { dropped, clipped, added: newPos.length / 3, pieces };
}

/** A measured street surface that holds a whole well gets it as a hole; one that only partly overlaps one is listed in
 *  `partial` (the gate fails on it: that case needs a polygon clip, none today). In place; returns { holes, partial }. */
export function underpassSurfaces(surf, up) {
  const wells = wellRings(up), res = { holes: [], partial: [] };
  if (!surf?.surfaces || !wells.length) return res;
  for (const s of surf.surfaces) {
    const outer = s.rings[0];
    for (const w of wells) {
      const inside = w.ring.map(([x, z]) => inRing(outer, x, z) && !s.rings.slice(1).some((h) => inRing(h, x, z)));
      const anyIn = inside.some(Boolean) || outer.some(([x, z]) => inRing(w.ring, x, z));
      if (!anyIn) continue;
      if (inside.every(Boolean) && !outer.some(([x, z]) => inRing(w.ring, x, z))) {
        s.rings = [...s.rings, area(outer) > 0 === area(w.ring) > 0 ? w.ring.slice().reverse() : w.ring.slice()];
        res.holes.push({ surface: s.id, well: w.name });
      } else res.partial.push({ surface: s.id, well: w.name });
    }
  }
  return res;
}

/** U1's tunnel ways out of the land cover's path strokes (they ran over the tracks as a dirt path) */
export function underpassLines(feats) {
  if (!feats?.lines) return feats;
  const s = new Set(UNDERPASS_WAYS);
  return { ...feats, lines: feats.lines.filter((l) => !s.has(l.id)) };
}

/** The walker's voids (viewer/character/world.js Heightfield.voids): { ring Float64Array (x, z pairs), yTop, box } */
export function underpassVoids(up) {
  return (up?.voids || []).map((v) => {
    const ring = new Float64Array(v.ring.flat());
    const b = box(v.ring);
    return { name: v.name, ring, yTop: v.yTop == null ? Infinity : v.yTop, x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1 };
  });
}
