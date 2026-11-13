// LANE GRAPH LINKS (roads round 5): every "next" link of the traffic lane graph must join paths that touch.
// For each tile: the links whose path end and next path start are more than 5 cm apart, classified by where they
// come from, and the turn radii of the junction connectors (min / p10 of each connector's tightest 3-point radius).
//   node --import ./tools/road_audit/register.mjs tools/road_audit/lane_links.mjs [--detail] T [T ...]
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadTile, ROOT } from "./tile.mjs";
const { buildTrafficGraph } = await import(pathToFileURL(join(ROOT, "viewer/traffic/trafficGraph.js")).href);
const argv = process.argv.slice(2);
const DETAIL = argv.includes("--detail");
const tiles = argv.filter((a) => !a.startsWith("--"));
const TURNS = ["straight", "left", "right", "uturn", "ring"];
function radius3(xy, a, b, c) {
  const ax = xy[a * 2], az = xy[a * 2 + 1], bx = xy[b * 2], bz = xy[b * 2 + 1], cx = xy[c * 2], cz = xy[c * 2 + 1];
  const A = Math.hypot(bx - ax, bz - az), B = Math.hypot(cx - bx, cz - bz), C = Math.hypot(cx - ax, cz - az);
  const cr = Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax));
  return cr < 1e-9 ? Infinity : (A * B * C) / (2 * cr);
}
/** tightest radius of path i, over chords of ~`span` m (3 points span apart along the path) */
function minR(g, i, span = 1.5) {
  const o = g.off[i], e = g.off[i + 1], cum = g.cum;
  let R = Infinity;
  for (let k = o; k < e; k++) {
    let a = k; while (a > o && cum[k] - cum[a] < span) a--;
    let c = k; while (c < e - 1 && cum[c] - cum[k] < span) c++;
    if (a === k || c === k || cum[k] - cum[a] < span * 0.6 || cum[c] - cum[k] < span * 0.6) continue;
    R = Math.min(R, radius3(g.xy, a, k, c));
  }
  return R;
}
const out = {};
for (const T of tiles) {
  const t = loadTile(T);
  const g = buildTrafficGraph(t.rd.net, t.roads, t.feats, t.bounds, t.rd.surfaceData?.grid);
  const ids = t.rd.net.graph.paths.filter((p) => p.len > 0.2 && p.pts.length >= 2);
  const P = g.paths, xy = g.xy;
  let links = 0; const gaps = [], byKind = {};
  for (let i = 0; i < P; i++) {
    const e = g.off[i + 1] - 1;
    for (let k = g.nextOff[i]; k < g.nextOff[i + 1]; k++) {
      const j = g.nextIdx[k], s = g.off[j];
      links++;
      const d = Math.hypot(xy[e * 2] - xy[s * 2], xy[e * 2 + 1] - xy[s * 2 + 1]);
      if (d <= 0.05) continue;
      const a = ids[i], b = ids[j];
      const kind = `${g.kind[i] ? "con" : "lane"}->${g.kind[j] ? "con" : "lane"}${!g.kind[i] && !g.kind[j] ? (a.roadId === b.roadId ? " same road" : " road->road") : ""}`;
      byKind[kind] = (byKind[kind] || 0) + 1;
      gaps.push({ d: +d.toFixed(2), kind, a: a.id, b: b.id, ra: a.roadId, rb: b.roadId, at: [+xy[e * 2].toFixed(1), +xy[e * 2 + 1].toFixed(1)], core: g.core[i] });
    }
  }
  gaps.sort((p, q) => q.d - p.d);
  const R = [], tight = [];
  for (let i = 0; i < P; i++) {
    if (!g.kind[i] || g.turn[i] === 3 || !g.core[i]) continue;     // this tile's own connectors (the buffer copies are the neighbour's), u-turns apart
    const r = minR(g, i); if (!isFinite(r)) continue;
    R.push(r);
    if (r < 5) { const o = g.off[i]; tight.push({ r: +r.toFixed(2), turn: TURNS[g.turn[i]], id: ids[i].id, len: +g.len[i].toFixed(1), at: [+xy[o * 2].toFixed(1), +xy[o * 2 + 1].toFixed(1)] }); }
  }
  R.sort((a, b) => a - b);
  const U = [];
  for (let i = 0; i < P; i++) if (g.kind[i] && g.turn[i] === 3 && g.core[i]) { const r = minR(g, i); if (isFinite(r)) U.push(r); }
  U.sort((a, b) => a - b);
  tight.sort((a, b) => a.r - b.r);
  const res = { links, gaps: gaps.length, over1m: gaps.filter((x) => x.d > 1).length, maxGap: gaps[0]?.d ?? 0, byKind,
    connectors: R.length, rMin: +R[0]?.toFixed(2), rP10: +R[Math.floor(R.length * 0.1)]?.toFixed(2), under5: tight.length,
    uturns: U.length, uMin: +(U[0] ?? 0).toFixed(2) };
  out[T] = res;
  console.log(T, JSON.stringify(res));
  if (DETAIL) { console.log(" gaps:", JSON.stringify(gaps.slice(0, 25))); console.log(" tight:", JSON.stringify(tight.slice(0, 15))); }
}
