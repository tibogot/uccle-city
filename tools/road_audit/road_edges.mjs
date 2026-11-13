// ROAD EDGES vs TERRAIN (roads round 5, the JOINS rule): every open (boundary) edge of the tile's road meshes
// (asphalt, concrete, square, pits, grass; not the paint decal) is sampled every 0.25 m and compared with the terrain
// as the city draws it (the carved heightmap, bilinear on its 1 m grid), where the DTM has data. An edge standing over the terrain is an open
// floating edge (you see under the road); skirts that go down into the ground end below it and are fine.
//   node --import ./tools/road_audit/register.mjs tools/road_audit/road_edges.mjs [--detail] [--json OUT] T [T ...]
import { writeFileSync } from "node:fs";
import { loadTile } from "./tile.mjs";
const argv = process.argv.slice(2);
const DETAIL = argv.includes("--detail");
const ji = argv.indexOf("--json"), JSON_OUT = ji >= 0 ? argv.splice(ji, 2)[1] : null;
const tiles = argv.filter((a) => !a.startsWith("--"));
const PARTS = ["asphalt", "concrete", "square", "pits", "grass"];
const all = {};
for (const T of tiles) {
  const t = loadTile(T), b = t.bounds, hm = t.hm;
  const ter = (x, z) => hm.surface(x, z);
  // the DTM has no data outside the Brussels region (the grid holds its lowest value there): not measured here
  const lo = hm.h.min + 0.02, noData = (x, z) => [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]].some(([a, c]) => hm.ground(x + a, z + c) <= lo);
  let len = 0; const over = { "0.1": 0, "0.3": 0, "0.5": 0 }; const spots = [];
  for (const name of PARTS) {
    const p = t.rd.parts[name]; if (!p) continue;
    const P = p.position, I = p.index;
    // boundary edges: used by one triangle (vertices welded by position, 1 mm)
    const key = (v) => `${Math.round(P[v * 3] * 1000)},${Math.round(P[v * 3 + 1] * 1000)},${Math.round(P[v * 3 + 2] * 1000)}`;
    const vid = new Map(), id = new Int32Array(P.length / 3);
    for (let v = 0; v < id.length; v++) { const k = key(v); let n = vid.get(k); if (n == null) { n = vid.size; vid.set(k, n); } id[v] = n; }
    const cnt = new Map();
    for (let f = 0; f < I.length; f += 3) for (let e = 0; e < 3; e++) {
      const a = I[f + e], c = I[f + (e + 1) % 3], ia = id[a], ic = id[c];
      if (ia === ic) continue;
      const k = ia < ic ? `${ia}|${ic}` : `${ic}|${ia}`;
      const o = cnt.get(k); if (o) o.n++; else cnt.set(k, { n: 1, a, c });
    }
    for (const { n, a, c } of cnt.values()) {
      if (n !== 1) continue;
      const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], cx = P[c * 3], cy = P[c * 3 + 1], cz = P[c * 3 + 2];
      const L = Math.hypot(cx - ax, cz - az);
      if (L < 1e-4) continue;                      // vertical edge (a skirt's side)
      const mx = (ax + cx) / 2, mz = (az + cz) / 2;
      if (mx < b.x0 || mx >= b.x1 || mz < b.z0 || mz >= b.z1) continue;
      const k = Math.max(1, Math.ceil(L / 0.25));
      for (let i = 0; i < k; i++) {
        const f = (i + 0.5) / k, x = ax + (cx - ax) * f, z = az + (cz - az) * f, y = ay + (cy - ay) * f;
        if (noData(x, z)) continue;
        const d = y - ter(x, z), seg = L / k;
        len += seg;
        for (const th of Object.keys(over)) if (d > +th) over[th] += seg;
        if (d > 0.3) spots.push([x, z, d, name]);
      }
    }
  }
  // cluster the spots (10 m cells): the worst of each
  const cells = new Map();
  for (const s of spots) { const k = `${Math.floor(s[0] / 10)},${Math.floor(s[1] / 10)}`; const o = cells.get(k); if (!o || s[2] > o[2]) cells.set(k, s); }
  const worst = [...cells.values()].sort((p, q) => q[2] - p[2]);
  const r = { edgeKm: +(len / 1000).toFixed(2), over10cm_m: Math.round(over["0.1"]), over30cm_m: Math.round(over["0.3"]), over50cm_m: Math.round(over["0.5"]),
    places30cm: worst.length, levels: t.rd.netInfo.levels };
  all[T] = { ...r, worst: worst.slice(0, 30).map(([x, z, d, n]) => [+x.toFixed(1), +z.toFixed(1), +d.toFixed(2), n]) };
  console.log(T, JSON.stringify(r));
  if (DETAIL) console.log("  worst:", JSON.stringify(all[T].worst.slice(0, 12)));
}
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(all, null, 1));
