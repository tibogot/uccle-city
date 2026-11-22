// THE VILLA'S PLOT, synchronously (main.js reads it while it builds tiles, before the model loads): the frame and the
// rings in city metres. The numbers are tools/villa/site.mjs's (models/villa/site.json frame) and tools/blender/villa.py's
// layout; the gate row `villa` checks they still match those files (no drift).
//   - PLOT_RING   the whole plot: the generated garden pieces (front walls, gates, hedges of the old house) and the
//                 plants' shrubs / beds are cleared inside it (main.js clearRings); the villa draws its own boundary
//   - BUILT_RINGS the house, the terrace, the front strip (wall, forecourt, drive) and the hedges: no LiDAR tree there
//                 (the garden's trees elsewhere on the plot stay), no grass blade through the paving
export const VILLA_ON = typeof location === "undefined" || new URLSearchParams(location.search).get("villa") !== "0";
export const FRAME = { origin: [909.874, 2037.15], rotationY: -2.624849841366921 };
const ca = Math.cos(FRAME.rotationY), sa = Math.sin(FRAME.rotationY);
/** frame (u, w) -> city (x, z): u = (cos, -sin), w = (sin, cos) of rotationY (three's rotation.y) */
export const toCity = (u, w) => [FRAME.origin[0] + u * ca + w * sa, FRAME.origin[1] - u * sa + w * ca];
const rect = (u0, u1, w0, w1) => [toCity(u0, w0), toCity(u1, w0), toCity(u1, w1), toCity(u0, w1)];
export const PLOT_UW = { u0: 9.3, u1: 58.3, w0: -34.3, w1: 30.3 };
export const PLOT_RING = rect(PLOT_UW.u0, PLOT_UW.u1, PLOT_UW.w0, PLOT_UW.w1);
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
export const villaClearRings = () => (VILLA_ON ? [PLOT_RING] : []);
/** the LiDAR / OSM trees standing where the villa is built (the rest of the garden keeps its trees) */
export function villaTreesClear(trees) {
  if (!VILLA_ON || !trees?.length) return trees;
  return trees.filter((t) => !BUILT_RINGS.some((r) => inRing(r, t.x, t.z)));
}
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
