// THE ROOF RIDGES as points (pure JS: falconWorker.js's "ridges" job and the node checks): every roof-part edge of a
// building whose both ends are at its top (buildings.bin: the drawn roof triangles' own vertices), a point every 1.1 m
// from 1.5 m off its ends (the façade kit's chimney stacks stand at the gable's ends), facing across the ridge, y = the
// ridge line + lift. The pigeons' roosts (lift 2 cm) and the falcon's ridge perches (cityGymWorld.js: on the line itself).
const near = (x, z, p, R) => Math.hypot(x - p.x, z - p.z) < R;
/** doc = buildings.json, P / I = buildings.bin's positions / triangles; out: a flat array x, y, z, yaw ...; hide = BU_IDs */
export function ridgePoints(doc, P, I, place, R, hide = new Set(), lift = 0.02, out = []) {
  for (const bd of doc.buildings) {
    if (hide.has(bd.attrs?.BU_ID) || hide.has(bd.id) || !bd.roof) continue;     // a hero model's solid: its own roosts / perches
    const f = bd.footprint?.[0]?.[0]; if (!f || !near(f[0], f[1], place, R + 40)) continue;
    const top = +bd.top, seen = new Set();
    for (let tri = bd.roof.first; tri < bd.roof.first + bd.roof.count; tri++) for (let e = 0; e < 3; e++) {
      const a = I[tri * 3 + e], c = I[tri * 3 + (e + 1) % 3];
      const ya = P[a * 3 + 1], yc = P[c * 3 + 1];
      if (ya < top - 0.35 || yc < top - 0.35) continue;
      const key = a < c ? a * 4294967296 + c : c * 4294967296 + a; if (seen.has(key)) continue; seen.add(key);
      const ax = P[a * 3], az = P[a * 3 + 2], cx = P[c * 3], cz = P[c * 3 + 2], L = Math.hypot(cx - ax, cz - az);
      if (L < 3.2) continue;
      const yaw = Math.atan2(-(cz - az), (cx - ax));                 // facing across the ridge
      for (let s = 1.5; s < L - 1.5; s += 1.1) {
        const k = s / L, x = ax + (cx - ax) * k, z = az + (cz - az) * k;
        if (!near(x, z, place, R)) continue;
        out.push(x, ya + (yc - ya) * k + lift, z, yaw + ((out.length / 4) % 2 ? Math.PI : 0));
      }
    }
  }
  return out;
}
