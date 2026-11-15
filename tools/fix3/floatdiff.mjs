// FIX3: the floating (> 50 cm) samples of a tile now vs with the joins2 weld / clamp off, grouped in 4 m cells
import { buildTile } from "../roadfix/tile.mjs";
import { terrainAt } from "../joins2/buried.mjs";
import { surfIndex } from "./stacked.mjs";
const BARY = [[0.9, 0.05, 0.05], [0.05, 0.9, 0.05], [0.05, 0.05, 0.9], [0.48, 0.48, 0.04], [0.04, 0.48, 0.48], [0.48, 0.04, 0.48]];
const floats = (d) => { const at = terrainAt(d), B = d.bounds, { tris } = surfIndex(d), m = new Map();
  for (const t of tris) for (const [l1, l2, l3] of BARY) { const x = l1 * t[0] + l2 * t[3] + l3 * t[6], z = l1 * t[2] + l2 * t[5] + l3 * t[8], y = l1 * t[1] + l2 * t[4] + l3 * t[7];
    if (x < B.x0 || x >= B.x1 || z < B.z0 || z >= B.z1) continue; const g = at(x, z); if (Number.isNaN(g) || y - g <= 0.5) continue;
    const k = `${Math.floor(x / 4) * 4},${Math.floor(z / 4) * 4}`; const e = m.get(k) || { n: 0, max: 0, part: t[9] }; e.n++; e.max = Math.max(e.max, y - g); m.set(k, e); } return m; };
const T = process.argv[2];
const a = floats(await buildTile(T)), b = floats(await buildTile(T, { groundWeld: false }));
const rows = [...a].map(([k, e]) => [k, e.n - (b.get(k)?.n || 0), e.n, b.get(k)?.n || 0, e.max.toFixed(2), e.part]).filter((r) => r[1] > 0).sort((p, q) => q[1] - p[1]);
console.log(T, "cells with more floats now:", rows.length, "sum", rows.reduce((s, r) => s + r[1], 0)); for (const r of rows.slice(0, 20)) console.log(r.join(" "));
