// CREASES in the drawn terrain (docs/GROUND_FIT.md, "blocky"): the slope change across one 1 m cell (|second difference|,
// m per m per m) outside the streets, split by where it comes from: the road weld banks (y > DTM), the carve shoulders
// (y < DTM, off the street surfaces), the bare DTM.
//   node --import ./tools/road_audit/register.mjs tools/groundfit/creases.mjs [TILES...] [--old]
import { buildTile, tiles } from "../roadfix/tile.mjs";
import { surfaceTop } from "../../viewer/groundFit.js";
const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const old = process.argv.includes("--old");
const tot = { cells: 0, weld: 0, weldC: 0, cut: 0, cutC: 0, dtmC: 0 };
for (const T of names.length ? names : tiles.map((t) => t.name)) {
  const d = await buildTile(T, { keepNet: true, ...(old ? { groundFit: false } : {}) });
  const { hm } = d, { cols, rows, x0, z0, step } = hm.h, Y = hm.y, O = hm.orig;
  const top = surfaceTop(d.road.parts);
  const s = { cells: 0, weld: 0, weldC: 0, cut: 0, cutC: 0, dtmC: 0 }, worst = [];
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
    const k = r * cols + c, x = x0 + c * step, z = z0 + r * step;
    if (top(x, z) > -Infinity) continue;                               // under a street surface: not seen
    s.cells++;
    const cx = Math.abs(Y[k - 1] - 2 * Y[k] + Y[k + 1]), cz = Math.abs(Y[k - cols] - 2 * Y[k] + Y[k + cols]), cr = Math.max(cx, cz);
    const ox = Math.abs(O[k - 1] - 2 * O[k] + O[k + 1]), oz = Math.abs(O[k - cols] - 2 * O[k] + O[k + cols]), co = Math.max(ox, oz);
    const dy = Y[k] - O[k];
    if (dy > 0.05) { s.weld++; if (cr > 0.3) s.weldC++; }
    else if (dy < -0.05) { s.cut++; if (cr > 0.3) s.cutC++; }
    else if (cr > 0.3) s.dtmC++;
    if (cr > 0.6 && cr > co + 0.3) worst.push([+cr.toFixed(2), x, z, +dy.toFixed(2)]);
  }
  worst.sort((a, b) => b[0] - a[0]);
  for (const k in tot) tot[k] += s[k];
  console.log(`${T}: free cells ${s.cells}; welded ${s.weld} (creased ${s.weldC}), cut ${s.cut} (creased ${s.cutC}), DTM creased ${s.dtmC}; new creases > 0.6 ${worst.length} ${JSON.stringify(worst.slice(0, 4))}`);
}
console.log("TOTAL", JSON.stringify(tot));
