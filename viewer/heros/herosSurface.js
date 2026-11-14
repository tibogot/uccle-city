// SQUARE DES HEROS, the street surfaces (tile worker side; docs/landmarks/HEROS.md). UrbIS maps the whole square (lawns,
// dolomite paths, the war memorial's terrace) as ONE street surface of class "square" (be/id/streetsurface/40047), so the
// tiles drew it as a raised setts plaza. data/overrides.json "parkSquares" (tools/heros_measure.py) carries that surface
// MINUS the OSM park, cut into pieces without holes: here every tile's clipped part of the surface is replaced by those
// pieces clipped to the tile, with the entry's class (sidewalk paving). The park itself is left to the terrain and the hero
// place's own ground (viewer/heros/herosGround.js). Pure JS: runs in the tile worker and on the main thread.

/** Sutherland-Hodgman: the ring clipped to the tile rectangle (a non-convex ring may keep zero-width bridges: earcut copes). */
function clipRect(ring, b) {
  let out = ring;
  const tests = [(p) => p[0] >= b.x0, (p) => p[0] <= b.x1, (p) => p[1] >= b.z0, (p) => p[1] <= b.z1];
  const axis = [0, 0, 1, 1], val = [b.x0, b.x1, b.z0, b.z1];
  for (let e = 0; e < 4 && out.length; e++) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const p = inp[i], q = inp[(i + 1) % inp.length], pin = tests[e](p), qin = tests[e](q);
      if (pin) out.push(p);
      if (pin !== qin) {
        const k = axis[e], t = (val[e] - p[k]) / (q[k] - p[k]);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
  }
  return out;
}
const area = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return a / 2; };

/** Replace the park squares' surfaces in a tile's surfaces.json (in place). Returns how many tile pieces were replaced. */
export function applyParkSquares(surf, ov, bounds) {
  const list = ov?.parkSquares;
  if (!surf?.surfaces || !list?.length) return 0;
  let n = 0;
  for (const ps of list) {
    const idx = surf.surfaces.findIndex((s) => s.id === ps.id);
    if (idx < 0) continue;
    const proto = surf.surfaces[idx];
    surf.surfaces = surf.surfaces.filter((s) => s.id !== ps.id);
    n++;
    for (const piece of ps.pieces) {
      const ring = clipRect(piece.rings[0], bounds);
      if (ring.length < 3 || Math.abs(area(ring)) < 0.05) continue;
      surf.surfaces.push({ ...proto, c: ps.cls, rings: [ring], parkSquare: ps.id, photo: undefined, course: undefined });
    }
  }
  return n;
}
