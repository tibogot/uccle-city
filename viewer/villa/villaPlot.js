// THE VILLA'S PLOT, synchronously (main.js reads it while it builds tiles, before the model loads): the frame and the
// rings in city metres. The numbers are tools/villa/site.mjs's (models/villa/site.json frame) and tools/blender/villa.py's
// layout; the gate row `villa` checks they still match those files (no drift).
//   - PLOT_RING   the whole plot: the generated garden pieces (front walls, gates, hedges of the old house) and the
//                 plants' shrubs / beds are cleared inside it (main.js clearRings); the villa draws its own boundary
//   - BUILT_RINGS the house, the terrace, the front strip (wall, forecourt, drive) and the hedges: no LiDAR tree there
//                 (the garden's trees elsewhere on the plot stay), no grass blade through the paving
// (claude/allocrate2: the far-tree pre-test of villaTreesClear; ?villadeck=old = every tree tested, as villaDeck.js)
export const VILLA_DECK = typeof location === "undefined" || new URLSearchParams(location.search).get("villadeck") !== "old";
export const VILLA_ON = typeof location === "undefined" || new URLSearchParams(location.search).get("villa") !== "0";
export const FRAME = { origin: [909.874, 2037.15], rotationY: -2.624849841366921 };
const ca = Math.cos(FRAME.rotationY), sa = Math.sin(FRAME.rotationY);
/** frame (u, w) -> city (x, z): u = (cos, -sin), w = (sin, cos) of rotationY (three's rotation.y) */
export const toCity = (u, w) => [FRAME.origin[0] + u * ca + w * sa, FRAME.origin[1] - u * sa + w * ca];
const rect = (u0, u1, w0, w1) => [toCity(u0, w0), toCity(u1, w0), toCity(u1, w1), toCity(u0, w1)];
export const PLOT_UW = { u0: 9.3, u1: 58.3, w0: -34.3, w1: 30.3 };
// the garden-pieces clear ring reaches 2.5 m over the property line: the old house's front wall / pillars / hedge stood
// on the sidewalk's back edge (u 8.6 .. 9.3), in front of the villa's own wall (seen 2026-11-22)
export const CLEAR_UW = { ...PLOT_UW, u0: 6.8 };
export const PLOT_RING = rect(PLOT_UW.u0, PLOT_UW.u1, PLOT_UW.w0, PLOT_UW.w1);
export const CLEAR_RING = rect(CLEAR_UW.u0, CLEAR_UW.u1, CLEAR_UW.w0, CLEAR_UW.w1);
export const BUILT_UW = [
  [11.6, 38.0, -23.5, 24.8],          // the house (+ the entrance landing / flight, the garage, the south path)
  [36.0, 46.2, -17.5, 16.5],          // the terrace, the pool, the pergola, the steps to the lawn
  [9.3, 14.2, -34.3, 30.3],           // the boundary wall, the forecourt, the drive
  [9.6, 58.3, -34.3, -32.7], [9.6, 58.3, 28.7, 30.3], [56.7, 58.3, -34.3, 30.3],    // the hedges
];
export const BUILT_RINGS = BUILT_UW.map(([a, b, c, d]) => rect(a, b, c, d));

export function inRing(r, x, z) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, zi] = r[i], [xj, zj] = r[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
/** main.js clearRings: the plot (gardens / plants) */
export const villaClearRings = () => (VILLA_ON ? [CLEAR_RING] : []);
/** city (x, z) -> frame (u, w) */
export const toFrame = (x, z) => { const dx = x - FRAME.origin[0], dz = z - FRAME.origin[1]; return [dx * ca - dz * sa, dx * sa + dz * ca]; };
/** round 2 (leaves inside the living room: a kept tree's CROWN reached through the north wall): the house and the
 *  terrace keep every canopy out: no kept tree's crown disc (radius t.crown, else CROWN_DEFAULT) comes within
 *  CROWN_MARGIN of these rectangles (rule tree-crowns-clear-villa) */
export const CROWN_UW = [[11.6, 38.0, -23.5, 24.0], [36.0, 46.2, -17.5, 16.5]];
export const CROWN_MARGIN = 0.5, CROWN_DEFAULT = 3.0;
export function crownHits(t) {
  const [u, w] = toFrame(t.x, t.z), r = (t.crown ?? CROWN_DEFAULT) + CROWN_MARGIN;
  return CROWN_UW.some(([u0, u1, w0, w1]) => Math.hypot(Math.max(u0 - u, 0, u - u1), Math.max(w0 - w, 0, w - w1)) < r);
}
/** the LiDAR / OSM trees standing where the villa is built or whose crown would reach the house / the terrace (the
 *  rest of the garden keeps its trees) */
export function villaTreesClear(trees) {
  if (!VILLA_ON || !trees?.length) return trees;
  if (!VILLA_DECK) return trees.filter((t) => !BUILT_RINGS.some((r) => inRing(r, t.x, t.z)) && !crownHits(t));
  // (claude/allocrate2, ?villadeck=old: every tree of every tile through the ring tests, a toFrame array + a closure a
  // tree, ~20 KB a frame flying) a tree further from the frame origin than the whole plot + its crown + 1 m hits
  // nothing: kept without a test; the rest as before
  let far = 0;
  for (let i = 0; i < trees.length; i++) { const t = trees[i], dx = t.x - FRAME.origin[0], dz = t.z - FRAME.origin[1], r = PLOT_R + (t.crown ?? CROWN_DEFAULT) + CROWN_MARGIN + 1; if (dx * dx + dz * dz > r * r) far++; }
  if (far === trees.length) return trees.slice();
  return trees.filter((t) => { const dx = t.x - FRAME.origin[0], dz = t.z - FRAME.origin[1], r = PLOT_R + (t.crown ?? CROWN_DEFAULT) + CROWN_MARGIN + 1; return dx * dx + dz * dz > r * r || (!BUILT_RINGS.some((q) => inRing(q, t.x, t.z)) && !crownHits(t)); });
}
/** the plot's (and so every built ring's / crown rect's) furthest corner from the frame origin, m */
const PLOT_R = Math.max(...[PLOT_UW.u0, PLOT_UW.u1].flatMap((u) => [PLOT_UW.w0, PLOT_UW.w1].map((w) => Math.hypot(u, w))), ...CROWN_UW.flatMap(([u0, u1, w0, w1]) => [Math.hypot(u0, w0), Math.hypot(u1, w0), Math.hypot(u1, w1), Math.hypot(u0, w1)]), ...BUILT_UW.flatMap(([u0, u1, w0, w1]) => [Math.hypot(u0, w0), Math.hypot(u1, w0), Math.hypot(u1, w1), Math.hypot(u0, w1)]));
/** a flat proxy of the built rings on the ground (the grass field's "solids": no blade through the paving / garage) */
export function villaGrassSolid(THREE, surface, bounds) {
  if (!VILLA_ON) return null;
  const P = [];
  for (const r of BUILT_RINGS) {
    if (!r.some(([x, z]) => x >= bounds.x0 - 60 && x <= bounds.x1 + 60 && z >= bounds.z0 - 60 && z <= bounds.z1 + 60)) continue;
    const y = (x, z) => surface(x, z) + 0.06;
    const [a, b, c, d] = r;
    for (const [p, q, s] of [[a, b, c], [a, c, d]]) P.push(p[0], y(...p), p[1], q[0], y(...q), q[1], s[0], y(...s), s[1]);
  }
  if (!P.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g); m.name = "villa-grass-solid";
  return m;
}

// ---- villa3 job 5 (rule villa-garden-city-kit): the villa's hedges and garden plants are the CITY's: hedge runs for the
// front-garden hedge modules (viewer/gardens/gardenHedge.js: baked clipped leaf surface, leaf-spray cards, soft lumps,
// the leggy shadowed foot, 3 dithered LODs: one pool for the whole city, no draw of its own) and shrubs for the plant
// kit (viewer/plants: box balls, laurels, rhododendrons, hydrangeas, lavender), added to tile H9 AFTER the plot's clear
// ring (the old house's pieces still go). villa.py no longer builds hedge boxes (the owner: "big blocks, not natural").
// Runs: (u, w) polylines in the villa frame, a point every metre, species / height / width as the city's data.
export const VILLA_GARDEN_V3 = VILLA_ON && (typeof location === "undefined" || new URLSearchParams(location.search).get("villa3") !== "0");
const runUW = (pts, species, height, width) => {
  const out = [];
  for (let k = 0; k + 1 < pts.length; k++) {
    const [u0, w0] = pts[k], [u1, w1] = pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(u1 - u0, w1 - w0) / 1.0));
    for (let i = k ? 1 : 0; i <= n; i++) out.push(toCity(u0 + (u1 - u0) * i / n, w0 + (w1 - w0) * i / n).map((v) => +v.toFixed(2)));
  }
  return { points: out, species, height, width, villa: true };
};
/** the villa's hedge runs (city metres) */
export const VILLA_HEDGE_RUNS = [
  runUW([[10.4, -33.2], [10.4, -0.9]], "beech", 1.75, 0.85),            // the front, behind the low wall (south of the gate)
  runUW([[10.4, 23.8], [10.4, 29.2]], "beech", 1.75, 0.85),             // ... north of the gate
  runUW([[13.55, -22.8], [13.55, -1.2]], "box", 0.8, 0.6),                // along the living wing's plinth
  runUW([[9.95, -33.45], [57.45, -33.45]], "hornbeam", 2.2, 0.95),       // the plot's south side
  runUW([[9.95, 29.45], [57.45, 29.45]], "hornbeam", 2.2, 0.95),         // ... the north side
  runUW([[57.5, -33.45], [57.5, 29.45]], "hornbeam", 2.2, 0.95),         // ... the back (its ends overlap the sides: no corner gap)
  // the terrace's skirt (the deck stood as a 0.7 m black block in the lawn): low box, its foot on the lawn
  runUW([[44.88, -17.7], [44.88, -1.25]], "box", 0.7, 0.55), runUW([[44.88, 5.25], [44.88, 16.7]], "box", 0.7, 0.55),
  runUW([[36.5, -17.38], [44.6, -17.38]], "box", 0.7, 0.55), runUW([[36.5, 16.38], [44.6, 16.38]], "box", 0.7, 0.55),
];
/** the villa's shrubs: [u, w, type, scale] (the plant kit's types) */
const VILLA_SHRUBS_UW = [
  [12.1, -20.0, "hydrangea", 1.0], [12.1, -15.6, "hydrangea", 0.9], [12.1, -11.2, "hydrangea", 1.05], [12.1, -6.8, "hydrangea", 0.95],
  [55.8, -30.6, "rhododendron", 1.55], [55.6, 26.4, "rhododendron", 1.45], [48.0, -31.0, "rhododendron", 1.3], [52.0, 27.2, "laurel", 1.5], [46.0, 27.6, "laurel", 1.35],
  [45.4, -2.2, "lavender", 1.0], [45.6, -3.4, "lavender", 0.9], [45.4, 6.4, "lavender", 1.0], [45.6, 7.6, "lavender", 0.9],
  [47.6, 9.25, "box_ball", 0.8], [47.6, 11.15, "box_ball", 0.8], [53.0, -7.6, "box_ball", 0.9], [53.0, -4.4, "box_ball", 0.9],
];
/** the shrubs as the plant doc's 6-number rows (x, z, type index, yaw / 255, scale %, 0) for `types` */
export function villaShrubRows(types) {
  const out = [];
  VILLA_SHRUBS_UW.forEach(([u, w, t, s], i) => { const k = types.indexOf(t); if (k < 0) return; const [x, z] = toCity(u, w); out.push(+x.toFixed(2), +z.toFixed(2), k, (i * 53) % 255, Math.round(s * 100), 0); });
  return out;
}
