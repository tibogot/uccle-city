// SERVICE VEHICLE PASSAGE (claude/parking1, rule service-vehicle-passage): the parked cars leave a service vehicle its
// way, every tile, node, no browser. Per tile, as the tile worker builds it (viewer/tileData.js: widthParking, then the
// traffic graph round the slots):
//   - CLEARANCE: every parked car the width rule keeps (viewer/streets/parkPlace.js widthParking) leaves SERVICE_CLEAR
//     (3.0) m of carriageway across from its inner flank, to the far edge of its carriageway or the next parked car,
//     measured here on its own (the car's left: parked cars face their side's traffic): must be 0 short
//   - MOUTHS: the kept parked cars (the graph's parkedKept) within MOUTH_CLEAR (5) m of a turn's end: info (the rule
//     drops them at junctions; a continuation / split / end node's turns are left)
//   - the census: the cars the clearance pass dropped (ways changed), the cars the junction rule dropped, the lanes
//     narrower than the widest service vehicle + 2 x 0.2 m (trafficGraph.js clearW: the router keeps them off it)
//   node --import ./tools/road_audit/register.mjs tools/audit/servicePassAudit.mjs [--jobs N] [--out FILE] T... | --all
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadTile, ROOT } from "../road_audit/tile.mjs";
import { runTiles, cli } from "./census/lib_street.mjs";

const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { streetFit, CARRIAGE } = await imp("viewer/streets/fitCore.js");
const { widthParking, SERVICE_CLEAR, SERVICE_W, SERVICE_MARGIN } = await imp("viewer/streets/parkPlace.js");
const { tileTrafficGraph } = await imp("viewer/traffic/tileTraffic.js");
const { parkedBoxDist, MOUTH_CLEAR } = await imp("viewer/traffic/trafficGraph.js");
const { CHILD, TILES, OUT, JOBS, flag } = cli();
const QUIET = flag("--quiet");
if (!TILES.length) { console.error("usage: servicePassAudit.mjs [--jobs N] [--out FILE] T... | --all"); process.exit(2); }

function auditTile(T) {
  let tile;
  try { tile = loadTile(T); } catch (e) { return { tile: T, skip: true }; }
  const { roads, feats, bounds, rd, roofs } = tile;
  if (!rd.surfaceData) return { tile: T, skip: true };
  const fit = streetFit(rd.surfaceData);
  const before = widthParking(roads, feats, bounds, fit, { service: false }), wp = widthParking(roads, feats, bounds, fit);
  const S = wp.stats.service || { dropped: 0, ways: 0, waysBoth: 0, edge: 0, car: 0 };
  // the clearance, measured again: from the inner flank along the car's left
  const short = [];
  for (const c of wp.sites) {
    const ax = -Math.sin(c.yaw), az = -Math.cos(c.yaw), x0 = c.x + ax * 0.925, z0 = c.z + az * 0.925;
    for (let t = 0.25; t <= SERVICE_CLEAR - 0.25 + 1e-6; t += 0.25) {
      const x = x0 + ax * t, z = z0 + az * t, k = fit.classAt(x, z);
      const hit = (k >= 0 && !CARRIAGE.has(k)) || wp.sites.some((o) => o !== c && Math.abs(o.x - x) < 3 && Math.abs(o.z - z) < 3 && parkedBoxDist(o, x, z) < -0.05);
      if (hit) { short.push(`${c.x.toFixed(1)}, ${c.z.toFixed(1)} (${t.toFixed(2)} m)`); break; }
    }
  }
  // the graph round the slots: the junction rule's drops, the kept cars against the mouths, the lanes' clear widths
  const g = tileTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData.grid, { parked: wp.sites, roofs, entry: {} });
  const kept = g.parkedKept ?? wp.sites, mouths = [];
  for (let p = 0; p < g.paths; p++) {
    if (!g.kind[p]) continue;
    for (const k of [g.off[p], g.off[p + 1] - 1]) {
      const x = g.xy[k * 2], z = g.xy[k * 2 + 1];
      for (const c of kept) if (Math.abs(c.x - x) < 9 && Math.abs(c.z - z) < 9 && parkedBoxDist(c, x, z) < MOUTH_CLEAR - 0.3) mouths.push(`${c.x.toFixed(1)}, ${c.z.toFixed(1)}`);
    }
  }
  // (a mouth hit can be a turn of a non-junction node (continuation / split / end): the rule leaves those; counted apart)
  let lanes = 0, measured = 0, narrow = 0;
  for (let p = 0; p < g.paths; p++) { if (g.kind[p]) continue; lanes++; if (Number.isFinite(g.clearW[p])) { measured++; if (g.clearW[p] < SERVICE_W + 2 * SERVICE_MARGIN) narrow++; } }
  return { tile: T, cars0: before.sites.length, cars: wp.sites.length, svcDropped: S.dropped, svcEdge: S.edge, svcCar: S.car, ways: S.ways, waysBoth: S.waysBoth,
    mouthDropped: g.stats.fit.parkMouth || 0, kept: kept.length, short: short.length, shortAt: short.slice(0, 3), mouthNear: mouths.length, mouthAt: mouths.slice(0, 3), lanes, measured, narrow };
}

if (CHILD) { console.log(JSON.stringify(auditTile(TILES[0]))); process.exit(0); }
const out = TILES.length > 1 ? await runTiles(import.meta.url, TILES, { jobs: JOBS ?? 2, log: !QUIET }) : TILES.map(auditTile);
const sum = { tiles: 0, cars0: 0, cars: 0, svcDropped: 0, svcEdge: 0, svcCar: 0, ways: 0, waysBoth: 0, mouthDropped: 0, kept: 0, short: 0, mouthNear: 0, lanes: 0, measured: 0, narrow: 0 };
const errors = out.filter((r) => r.error).length, bad = [];
for (const r of out) {
  if (r.error || r.skip) continue;
  sum.tiles++;
  for (const k of Object.keys(sum)) if (k !== "tiles") sum[k] += r[k] || 0;
  if (r.short) bad.push(`${r.tile}: ${r.short} car(s) short of ${SERVICE_CLEAR} m (${r.shortAt.join("; ")})`);
}
if (OUT) writeFileSync(OUT, JSON.stringify({ sum, tiles: out }, null, 1));
console.log(`service passage, ${sum.tiles} tiles: the width rule's ${sum.cars0} parked cars -> ${sum.cars} after the ${SERVICE_CLEAR} m clearance (${sum.svcDropped} dropped: ${sum.svcEdge} against the carriageway's edge, ${sum.svcCar} against a car across; ${sum.ways} ways changed, ${sum.waysBoth} of them parked on both sides before); ${sum.mouthDropped} dropped within ${MOUTH_CLEAR} m of a junction mouth, ${sum.kept} kept by the graph; lanes: ${sum.measured} of ${sum.lanes} measured, ${sum.narrow} narrower than ${(SERVICE_W + 2 * SERVICE_MARGIN).toFixed(2)} m (the router keeps the service vehicles off them)`);
console.log(`(info) kept cars within ${MOUTH_CLEAR} m of a turn's end: ${sum.mouthNear} (turns of continuation / split / end nodes, which the rule leaves)`);
if (errors) { console.log(`FAIL servicepass: ${errors} tile(s) failed`); process.exit(1); }
if (bad.length) { console.log(`FAIL servicepass: ${sum.short} parked car(s) leave less than ${SERVICE_CLEAR} m:\n  ${bad.slice(0, 10).join("\n  ")}`); process.exit(1); }
if (!(sum.cars > 0.85 * sum.cars0)) { console.log(`FAIL servicepass: the clearance took ${sum.cars0 - sum.cars} of ${sum.cars0} cars (> 15 %: the measure is wrong, not the streets)`); process.exit(1); }
console.log("PASS servicepass: every parked car leaves a service vehicle its way");
