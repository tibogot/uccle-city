import { buildTile } from "../roadfix/tile.mjs";
import { createHash } from "node:crypto";
const h = (o) => createHash("md5").update(JSON.stringify(o, (k, v) => (ArrayBuffer.isView(v) ? Array.from(v.subarray(0, 200000)) : v))).digest("hex").slice(0, 10);
for (const T of process.argv.slice(2)) {
  const r = {};
  for (const gf of [false, true]) {
    const ms = [];
    let d;
    for (let i = 0; i < 3; i++) { const t0 = performance.now(); d = await buildTile(T, { groundFit: gf, kit: true, roofs: true }); ms.push(performance.now() - t0); }
    ms.sort((a, b) => a - b);
    r[gf ? "new" : "old"] = { ms: Math.round(ms[1]), terrainTris: d.terrain.idx.length / 3, wallVerts: d.buildings.walls.position.length / 3 + (d.buildings.walls.kit?.position.length || 0) / 3,
      kitDoors: Object.entries(d.buildings.kit?.pieces || {}).filter(([k]) => k.startsWith("door")).reduce((s, [, v]) => s + v.length / 14, 0), steps: (d.buildings.kit?.pieces.step?.length || 0) / 14,
      fit: d.times["ground fit"], feet: d.times["wall feet"], facades: d.times["façade analysis"], terrainGrid: d.times["terrain grid"], drive: h(d.drive), hm: h(d.hm?.y ?? d.y), roofSurf: h(d.roofs.surf), doorsOff: d.buildings.stats.doorsOff, fitHow: d.buildings.stats.fit, feetStats: d.buildings.stats.feet };
  }
  console.log(T, JSON.stringify(r));
}
