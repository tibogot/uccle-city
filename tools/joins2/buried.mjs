// BURIED EDGES (joins2, docs/JOINS2.md): the drawn terrain poking up through a drawn street / path surface (the saw-tooth
// of terrain triangles along the uphill edge of a park path on a cross slope), per tile, in node.
//   node --import ./tools/road_audit/register.mjs tools/joins2/buried.mjs [TILES...] [--old] [--json out.json]
// For every near-flat triangle of the tile's road parts (asphalt, concrete = sidewalks / plazas, grass, pits, square...)
// samples near its corners and edge midpoints are compared with the terrain AS MESHED (the worker's terrain grid with
// its per-cell diagonals): terrain > surface + 2 cm = a buried sample (the terrain draws over the surface there).
// --old: the entry flag groundWeld:false (the carve before this round).
import { writeFileSync } from "node:fs";
import { buildTile, tiles } from "../roadfix/tile.mjs";

const args = process.argv.slice(2);
const old = args.includes("--old");
const ji = args.indexOf("--json");
const names = args.filter((a, i) => !a.startsWith("--") && (ji < 0 || i !== ji + 1));
const todo = names.length ? names : tiles.map((t) => t.name);
const BARY = [[0.9, 0.05, 0.05], [0.05, 0.9, 0.05], [0.05, 0.05, 0.9], [0.48, 0.48, 0.04], [0.04, 0.48, 0.48], [0.48, 0.04, 0.48]];

export function terrainAt(d) {
  const t = d.terrain, { cols, rows } = d.hdr;
  const x0 = t.pos[0], z0 = t.pos[2], step = t.pos[3] - t.pos[0];
  return (x, z) => {
    const fc = (x - x0) / step, fr = (z - z0) / step;
    const c = Math.floor(fc), r = Math.floor(fr);
    if (c < 0 || r < 0 || c >= cols - 1 || r >= rows - 1) return NaN;
    const u = fc - c, v = fr - r, o = (r * (cols - 1) + c) * 6;
    const a = r * cols + c, b = a + cols, cc = a + 1, dd = b + 1, Y = (k) => t.pos[k * 3 + 1];
    if (t.idx[o + 2] === dd) {          // split a-d: (a, b, d) below the diagonal u < v, (a, d, c) above
      return v >= u ? Y(a) + (Y(dd) - Y(b)) * u + (Y(b) - Y(a)) * v : Y(a) + (Y(cc) - Y(a)) * u + (Y(dd) - Y(cc)) * v;
    }
    // split b-c: (a, b, c) u + v <= 1, (c, b, d) beyond
    return u + v <= 1 ? Y(a) + (Y(cc) - Y(a)) * u + (Y(b) - Y(a)) * v : Y(dd) + (Y(b) - Y(dd)) * (1 - u) + (Y(cc) - Y(dd)) * (1 - v);
  };
}

export function buriedStats(d, { tol = 0.02 } = {}) {
  const at = terrainAt(d), B = d.bounds, out = { samples: 0, buried: 0, over10: 0, over25: 0, float50: 0, byPart: {}, worst: [], floats: [] };
  for (const [name, p] of Object.entries(d.road.parts)) {
    if (!p?.index || name === "paint") continue;
    const P = p.position, I = p.index;
    let n = 0, bad = 0;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (Math.abs(ny) < 0.8 * Math.hypot(nx, ny, nz)) continue;          // kerb faces / skirts go into the ground by design
      for (const [l1, l2, l3] of BARY) {
        const x = l1 * P[a] + l2 * P[b] + l3 * P[c], z = l1 * P[a + 2] + l2 * P[b + 2] + l3 * P[c + 2], y = l1 * P[a + 1] + l2 * P[b + 1] + l3 * P[c + 1];
        if (x < B.x0 || x >= B.x1 || z < B.z0 || z >= B.z1) continue;
        const g = at(x, z);
        if (Number.isNaN(g)) continue;
        n++;
        const e = g - y;
        if (-e > 0.5) { out.float50++; out.floats.push([+x.toFixed(1), +z.toFixed(1), +(-e).toFixed(2), name]); }
        if (e > tol) {
          bad++;
          if (e > 0.1) out.over10++;
          if (e > 0.25) out.over25++;
          out.worst.push([+x.toFixed(1), +z.toFixed(1), +e.toFixed(2), name]);
        }
      }
    }
    out.samples += n; out.buried += bad;
    out.byPart[name] = [bad, n];
  }
  out.worst.sort((p, q) => q[2] - p[2]);
  out.worst = out.worst.slice(0, 12);
  out.floats.sort((p, q) => q[2] - p[2]); out.floats = out.floats.slice(0, 12);
  return out;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("buried.mjs")) {
  const all = {};
  let S = 0, Bd = 0, O10 = 0, O25 = 0;
  for (const T of todo) {
    const d = await buildTile(T, { keepNet: true, ...(old ? { groundWeld: false, surfH: false } : {}) });
    const s = buriedStats(d);
    all[T] = s; S += s.samples; Bd += s.buried; O10 += s.over10; O25 += s.over25;
    console.log(`${T}: buried ${s.buried} / ${s.samples} (> 10 cm ${s.over10}, > 25 cm ${s.over25}), surface > 50 cm over the terrain ${s.float50} ${JSON.stringify(s.floats.slice(0, 3))} ${JSON.stringify(Object.fromEntries(Object.entries(s.byPart).filter(([, v]) => v[0])))} worst ${JSON.stringify(s.worst.slice(0, 4))}`);
  }
  console.log(`TOTAL ${todo.length} tiles: buried ${Bd} / ${S} (> 10 cm ${O10}, > 25 cm ${O25})${old ? " [old]" : ""}`);
  if (ji >= 0) writeFileSync(args[ji + 1], JSON.stringify(all, null, 1));
}
