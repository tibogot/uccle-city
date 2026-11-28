// A PARKED VEHICLE ON THE VILLA'S GROUND (pure JS: viewer/villa/villaCars.js places with it, tools/audit/villaCheck.mjs
// checks with it). Its four wheel contact points are sampled on the drawn surface surf(x, z) (the paving's top), the
// body set at their mean and tilted to their slopes (pitch along the nose, roll across), so every wheel touches the
// paving within a few millimetres on a slope or a crown (rule vehicles-touch-ground: the round-2 saloon sat on one
// height taken at its centre).
//   const p = placeVehicle({ x, z, heading, size: [width, height, length] }, surf);  p.y, p.pitch, p.roll, p.gaps
export function wheelPoints({ x, z, heading, size }) {
  const fx = Math.sin(heading), fz = Math.cos(heading), rx = fz, rz = -fx;          // nose (local +z) and local +x
  const xw = Math.max(0.3, size[0] / 2 - 0.22), zw = Math.max(0.4, size[2] / 2 - 0.8);
  return [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => ({ sx, sz, xl: sx * xw, zl: sz * zw, x: x + rx * sx * xw + fx * sz * zw, z: z + rz * sx * xw + fz * sz * zw }));
}
export function placeVehicle(v, surf) {
  const W = wheelPoints(v);
  for (const w of W) w.h = surf(w.x, w.z);
  const xw = Math.abs(W[0].xl), zw = Math.abs(W[0].zl);
  const avg = (f) => { const a = W.filter(f); return a.reduce((s, w) => s + w.h, 0) / a.length; };
  const tanP = (avg((w) => w.sz > 0) - avg((w) => w.sz < 0)) / (2 * zw);              // rise per metre along the nose
  const tanR = (avg((w) => w.sx > 0) - avg((w) => w.sx < 0)) / (2 * xw);              // rise per metre toward local +x
  const y = W.reduce((s, w) => s + w.h, 0) / 4;
  const gaps = W.map((w) => y + w.zl * tanP + w.xl * tanR - w.h);                     // + = the wheel floats over the paving
  // three's local rotation (YXZ: heading, then pitch about local x, then roll about local z): +x rotation lowers the nose
  return { y, pitch: -Math.atan(tanP), roll: Math.atan(tanR), gaps, wheels: W };
}
