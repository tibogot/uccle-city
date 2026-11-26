// A map of a tile's walk graph over its class raster (claude/peds2): node tools/peds/graphMap.mjs <tile> <cx> <cz> [half=150] [out.jpg]
// colours: carriageway grey, sidewalk light, square beige, path green, solids red, posts orange; edges: walk blue, path
// green, zebra white, signalled crossing yellow, platform magenta, square brown, link cyan; unlinked crossings: red X
import "../road_audit/register.mjs";
import { writeFileSync } from "node:fs";
import jpeg from "../road_audit/node_modules/jpeg-js/index.js";
import { buildTile } from "../roadfix/tile.mjs";
import { blockedRaster, buildWalkGraph, EK } from "../../viewer/pedestrians/walkGraph.js";
const [T = "I6", cxs = "1153", czs = "540", hs = "150", out = "graph.jpg"] = process.argv.slice(2);
const cx = +cxs, cz = +czs, half = +hs, PX = Math.max(2, Math.round(480 / half)), W = Math.round(half * 2 * PX);
const d = await buildTile(T, {});
const dbg = {};
const g = buildWalkGraph({ bounds: d.bounds, grid: d.road.surfaceData.grid, roofs: d.roofs, col: d.drive.col, crossings: d.road.inventory?.crossings, roads: d.roads, feats: d.feats, bollards: d.road.surfaceData.bollards, debug: dbg });
g.raster = blockedRaster({ col: d.drive.col, bollards: d.road.surfaceData.bollards }, d.bounds);
console.log(JSON.stringify({ ...g.stats, unlinked: g.stats.unlinked?.length }));
const img = new Uint8Array(W * W * 4);
const G = d.road.surfaceData.grid, R = g.raster, B = d.bounds;
const COL = [[40, 40, 40], [90, 90, 95], [80, 80, 100], [70, 90, 70], [100, 90, 90], [190, 175, 140], [170, 170, 165], [110, 140, 90], [110, 170, 100], [200, 190, 170], [90, 70, 40]];
for (let py = 0; py < W; py++) for (let px = 0; px < W; px++) {
  const x = cx - half + px / PX, z = cz - half + py / PX;
  const i = Math.floor((x - G.x0) / G.step), j = Math.floor((z - G.z0) / G.step);
  const c = i >= 0 && j >= 0 && i < G.nx && j < G.nz ? G.data[j * G.nx + i] : 0;
  let col = COL[c] || COL[0];
  const ri = Math.floor((x - B.x0) / 0.5), rj = Math.floor((z - B.z0) / 0.5);
  const rv = ri >= 0 && rj >= 0 && ri < R.nx && rj < R.nz ? R.data[rj * R.nx + ri] : 0;
  if (rv === 1) col = [150, 40, 40]; else if (rv === 2) col = [220, 130, 40];
  if (process.env.SK && ri >= 0 && rj >= 0 && ri < R.nx && rj < R.nz && dbg.sk?.[rj * R.nx + ri]) col = [255, 60, 200];
  const o = (py * W + px) * 4; img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2]; img[o + 3] = 255;
}
const put = (x, z, c, r = 1) => { const px = Math.round((x - cx + half) * PX), py = Math.round((z - cz + half) * PX); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = px + dx, Y = py + dy; if (X < 0 || Y < 0 || X >= W || Y >= W) continue; const o = (Y * W + X) * 4; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; } };
const EC = { [EK.walk]: [40, 90, 255], [EK.path]: [20, 200, 40], [EK.zebra]: [255, 255, 255], [EK.cross]: [255, 230, 0], [EK.platform]: [255, 0, 255], [EK.square]: [140, 90, 40], [EK.steps]: [0, 120, 0], [EK.link]: [0, 230, 230] };
for (let m = 0; m < g.ea.length; m++) {
  const a = g.ea[m], b = g.eb[m], L = Math.hypot(g.x[b] - g.x[a], g.z[b] - g.z[a]), n = Math.ceil(L * PX);
  for (let k = 0; k <= n; k++) put(g.x[a] + (g.x[b] - g.x[a]) * k / n, g.z[a] + (g.z[b] - g.z[a]) * k / n, EC[g.ek[m]], g.ek[m] >= 2 && g.ek[m] <= 3 ? 1 : 0);
}
for (let n = 0; n < g.x.length; n++) put(g.x[n], g.z[n], g.nk[n] === 1 ? [255, 255, 255] : g.nk[n] === 3 ? [255, 0, 255] : g.nk[n] === 2 ? [255, 0, 0] : [0, 0, 120], g.nk[n] === 3 ? 3 : 1);
for (const [x, z] of g.stats.unlinked || []) for (let k = -6; k <= 6; k++) { put(x + k * 0.4, z + k * 0.4, [255, 0, 0], 1); put(x + k * 0.4, z - k * 0.4, [255, 0, 0], 1); }
writeFileSync(out, jpeg.encode({ data: img, width: W, height: W }, 88).data);
console.log("wrote", out);
