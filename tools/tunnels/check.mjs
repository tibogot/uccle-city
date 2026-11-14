// The tunnels' terrain stage in node (no browser): builds the tiles with and without ?tunnels and reports the cut, the
// lid, the clipped triangles and the road levels through the bores (viewer/rail/tunnels.js, docs/trains/TUNNELS.md).
//   node --import ./tools/road_audit/register.mjs tools/tunnels/check.mjs [E10 D9]
import { buildTile } from "../roadfix/tile.mjs";
import { readFileSync } from "node:fs";
import { frame } from "../../viewer/rail/tunnels.js";
const tiles = process.argv.slice(2).length ? process.argv.slice(2) : ["E10", "D9"];
const docs = ["kleindal", "brasserie"].map((n) => frame(JSON.parse(readFileSync(new URL(`../../models/rail/tunnel_${n}.json`, import.meta.url)))));
for (const T of tiles) {
  const d = await buildTile(T);
  console.log(T, "tunnels:", JSON.stringify(d.netInfo.tunnels), "times:", d.times["tunnel cut"], d.times["tunnel terrain"]);
  const hdr = d.hdr, Y = d.y;
  const at = (x, z) => { const c = Math.round((x - hdr.x0) / hdr.step), r = Math.round((z - hdr.z0) / hdr.step); return c >= 0 && r >= 0 && c < hdr.cols && r < hdr.rows ? Y[r * hdr.cols + c] : NaN; };
  for (const t of docs) {
    const [cx, cz] = t.toWorld(0, 0);
    if (Number.isNaN(at(cx, cz))) continue;
    const row = [];
    for (let X = -Math.round(t.L / 2) - 14; X <= Math.round(t.L / 2) + 14; X += 4) { const [x, z] = t.toWorld(X, 0); row.push(`${X}:${(at(x, z) - t.road(X)).toFixed(2)}`); }
    console.log(" ", t.name, "walk ground - road level along the axis:", row.join(" "));
    // the road meshes' heights at the axis (the drawn road through the bore)
    let n = 0, worst = 0;
    for (const p of Object.values(d.road.parts || {}).flat()) {
      const P = p?.position || p?.pos; if (!P || !P.length) continue;
      for (let i = 0; i < P.length; i += 3) {
        const [X, Yl] = t.toLocal(P[i], P[i + 2]);
        if (Math.abs(X) > t.L / 2 || Math.abs(Yl) > t.r) continue;
        n++; worst = Math.max(worst, Math.abs(P[i + 1] - t.road(X)));
      }
    }
    console.log(" ", t.name, `road vertices in the bore: ${n}, worst |y - road level| ${worst.toFixed(2)} m`);
  }
}
