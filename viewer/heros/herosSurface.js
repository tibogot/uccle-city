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

/** The terrain under the two flights of steps (tools/blender/heros.py "flights[].carve"): the DTM runs as a slope through
 *  the treads, so every terrain node inside a flight's footprint is lowered 35 cm under the line through its nosings
 *  (h_from = nosings - 8 cm at `from_`, down to h_to at `to`; never under `floor`) and the nodes one cell beside it no higher
 *  than the cheek kerbs' top: no ground pokes through a tread; the blocks and kerbs go 0.5-0.7 m down, no gap at the sides. Edits hm.y in place (before the terrain mesh is built). */
export function carveFlights(hm, carves) {
  const { x0, z0, cols, rows, step } = hm.h;
  let n = 0;
  for (const c of carves || []) {
    const r = c.ring, [ax, az] = c.from_, [bx, bz] = c.to;
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const xs = r.map((p) => p[0]), zs = r.map((p) => p[1]);
    const M = 1.0;                                     // the band outside the footprint (one terrain cell)
    const c0 = Math.max(0, Math.floor((Math.min(...xs) - M - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((Math.max(...xs) + M - x0) / step));
    const r0 = Math.max(0, Math.floor((Math.min(...zs) - M - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((Math.max(...zs) + M - z0) / step));
    for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) {
      const x = x0 + i * step, z = z0 + j * step;
      const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / L2));
      const line = c.h_from + (c.h_to - c.h_from) * t, k = j * cols + i;
      // inside: 35 cm under the nosing line (the terrain's 1 m triangles must not reach a tread anywhere between a node
      // here and one outside); beside the flight (one cell): no higher than the cheek kerbs' top
      let h;
      if (inRing(r, x, z)) h = Math.max(c.floor, line - 0.27);
      else if (distRing(r, x, z) < M) h = line + 0.18;
      else continue;
      if (h < hm.y[k] - 1e-4) { hm.y[k] = h; n++; }
    }
  }
  return n;
}
const distRing = (r, x, z) => {
  let best = Infinity;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [ax, az] = r[j], [bx, bz] = r[i], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
};
const inRing = (r, x, z) => { let k = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) k = !k; } return k; };

/** The land-cover raster without the park's own path lines (their dolomite is the hero ground's crisp mesh; the raster's
 *  1 m strokes would leave a blurred gravel band through the lawns): `ids` = the OSM way ids ("osm:w...") to leave out. */
export function withoutLines(feats, ids) {
  if (!ids?.length || !feats.lines) return feats;
  const s = new Set(ids);
  return { ...feats, lines: feats.lines.filter((l) => !s.has(l.id)) };
}
