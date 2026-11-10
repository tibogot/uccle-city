// Does the moving traffic of claude/traffic (viewer/traffic/trafficGraph.js, read from that branch into a scratch
// copy, never edited) still build on this road stage? Its graph stats and hold points vs the painted stop lines,
// for paint v1 (the old network) and v2.   node --import ./tools/road_audit/register.mjs tools/road_audit/traffic_check.mjs <trafficGraph.js> <v1 roads dir> T...
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadTile } from "./tile.mjs";
const [tg, v1dir, ...tiles] = process.argv.slice(2);
const { buildTrafficGraph } = await import(pathToFileURL(tg).href);
for (const T of tiles) for (const paint of ["v1", "v2"]) {
  const t = loadTile(T, { paint, roadsFile: paint === "v1" ? join(v1dir, `${T}.json`) : undefined });
  const g = buildTrafficGraph(t.rd.net, t.roads, t.feats, t.bounds, t.rd.surfaceData?.grid);
  // hold points of the signal / stop / give-way approaches vs the painted stop lines (v2 inventory or the engine's)
  const stops = t.rd.inventory ? t.rd.inventory.stops : [];
  let n = 0, far = 0, d2 = [];
  const P = g.xy, off = g.off;
  for (let i = 0; i < g.len.length; i++) {
    if (g.holdAt[i] < 0 || !(g.ctrl[i] === 1 || g.ctrl[i] === 2 || g.ctrl[i] === 3)) continue;
    // the hold point
    let k = off[i], acc = 0; const end = off[i + 1];
    let x = P[k * 2], z = P[k * 2 + 1];
    for (let q = k + 1; q < end; q++) { const dx = P[q * 2] - P[q * 2 - 2], dz = P[q * 2 + 1] - P[q * 2 - 1], L = Math.hypot(dx, dz); if (acc + L >= g.holdAt[i]) { const f = (g.holdAt[i] - acc) / (L || 1); x = P[q * 2 - 2] + dx * f; z = P[q * 2 - 1] + dz * f; break; } acc += L; x = P[q * 2]; z = P[q * 2 + 1]; }
    if (!(x >= t.bounds.x0 && x < t.bounds.x1 && z >= t.bounds.z0 && z < t.bounds.z1)) continue;
    n++;
    let d = Infinity;
    for (const s of stops) { const [a, b] = s.line, dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1; const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); d = Math.min(d, Math.hypot(a[0] + dx * u - x, a[1] + dz * u - z)); }
    if (isFinite(d)) d2.push(d); if (d > 2) far++;
  }
  d2.sort((a, b) => a - b);
  console.log(T, paint, JSON.stringify({ paths: g.len.length, stats: g.stats, holdsControlled: n, holdToPaintMedian: d2.length ? +d2[d2.length >> 1].toFixed(2) : null, holdsOver2m: far }));
}
