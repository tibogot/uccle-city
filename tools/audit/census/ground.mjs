// CENSUS class C (claude/census 2026-11-18, owner playtest images 77 89 91: blocky terrain bumps, saw-tooth slopes, a
// hole, sidewalk ground with saw edges / blocky lumps). Report only (no fix, no gate row yet).
//
// Every tile is built by the tile worker's own code in node (viewer/tileData.js buildTileData), then two scans:
//
// TERRAIN (the drawn 1 m grid d.y after carve / weld / clampUnder vs the bare UrbIS DTM d.orig), on cells that are not
// under a street surface (the drive grid's delta) nor inside a building footprint:
//   lump      raised > LUMP m over the DTM (viewer/heightmap.js weld: a bank up to a surface edge, maxRise 2 m)
//   hole      lowered > HOLE m under the DTM (carve / clampUnder past a surface)
//   spike     the grid's own curvature (cell - mean of its 4 neighbours) differs from the DTM's by > SPIKE m: a single
//             cell pulled up / down against its neighbours = the saw-tooth / blocky look of 1 m grid triangles
// Findings: 8-connected groups of flagged cells (>= 2 cells), sized in m2 and the worst metre.
//
// SURFACES (the drawn street: d.road.parts concrete = sidewalks / squares / islands, asphalt = roads), per near-flat
// triangle, against the measured kerb next to it (viewer/streets/fitCore.js nearKerb, within 6 m):
//   tilt      a SIDEWALK (class raster) triangle whose cross-fall (its slope across the kerb line) is over 15 % (a real
//             sidewalk falls ~2 % to the kerb): it climbs the bank behind it (image 91) or a lump
//   roadTilt  a ROAD (roadway / tram road) triangle whose cross-fall is over 12 %: a sharp bump across the carriageway
// Findings: groups of flagged triangles (centroids within 2 m), sized in m2 and the steepest.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/ground.mjs [--all | T ...] [--out FILE] [--jobs N]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runTiles, cli, at, ROOT, SC, imp } from "./lib_street.mjs";
import { buildTile, footprintIndex, streetAt, allBuiltTiles } from "./lib_mesh.mjs";

const c = cli();
const { CHILD, OUT, JOBS, WORST } = c;
const TILES = c.ALL ? allBuiltTiles() : c.TILES;
const LUMP = 0.5, HOLE = 0.5, SPIKE = 0.5, TILT = 0.15, ROAD_TILT = 0.12;
const KINDS = ["lump", "hole", "spike", "tilt", "roadTilt"];

if (!CHILD) {
  if (!TILES.length) { console.error("usage: ground.mjs [--all | T ...] [--out FILE]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS ?? 3 });
  const sum = Object.fromEntries(KINDS.flatMap((k) => [[k, 0], [k + "M2", 0]])), items = [];
  let tiles = 0;
  for (const r of res) {
    if (r.error) continue; tiles++;
    for (const k of Object.keys(sum)) sum[k] += r.sum[k] || 0;
    for (const it of r.items) items.push({ tile: r.tile, ...it });
  }
  for (const k of Object.keys(sum)) sum[k] = Math.round(sum[k]);
  console.log(`class C, ${tiles} tiles: ${JSON.stringify(sum)}`);
  for (const k of KINDS) {
    const L = items.filter((i) => i.kind === k).sort((a, b) => b.score - a.score);
    console.log(`worst ${k} (${L.length}):`);
    for (const it of L.slice(0, WORST)) console.log(`  ${JSON.stringify(it)}`);
  }
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), sum, items: items.sort((a, b) => b.score - a.score).slice(0, 3000) }, null, 1));
  process.exit(0);
}

const T = TILES[0];
const { d, bDoc } = await buildTile(T);
const { streetFit } = await imp("viewer/streets/fitCore.js");
const fit = d.road.surfaceData ? streetFit(d.road.surfaceData) : null;
const H = d.hdr, Y = d.y, O = d.orig, NC = H.cols, NR = H.rows, st = H.step, b = d.bounds;
const delta = d.drive?.ground?.delta;
const fp = footprintIndex(bDoc.buildings);
const sum = Object.fromEntries(KINDS.flatMap((k) => [[k, 0], [k + "M2", 0]])), items = [];
const nodata = (k) => H.min != null && O[k] <= H.min + 0.02;      // (outside the Brussels DTM: its lowest value)

// ---------------------------------------------------------------- terrain cells
const flag = new Uint8Array(NC * NR), val = new Float32Array(NC * NR);
for (let r = 1; r < NR - 1; r++) for (let cc = 1; cc < NC - 1; cc++) {
  const k = r * NC + cc, x = H.x0 + cc * st, z = H.z0 + r * st;
  if (x < b.x0 || x >= b.x1 || z < b.z0 || z >= b.z1 || nodata(k)) continue;
  // under / at a street surface (any of the 4 cells round the vertex): not terrain that shows
  let cov = false;
  if (delta) for (const q of [k, k - 1, k - NC, k - NC - 1]) { const v = delta[q]; if (v > 0 && v !== 65535) { cov = true; break; } }
  if (cov || (fit && fit.classAt(x, z) >= 0)) continue;
  if (fp.at(x, z, 0.5) >= 0) continue;
  const dy = Y[k] - O[k];
  const lapY = Y[k] - (Y[k - 1] + Y[k + 1] + Y[k - NC] + Y[k + NC]) / 4, lapO = O[k] - (O[k - 1] + O[k + 1] + O[k - NC] + O[k + NC]) / 4;
  if (dy > LUMP) { flag[k] = 1; val[k] = dy; }
  else if (dy < -HOLE) { flag[k] = 2; val[k] = -dy; }
  else if (Math.abs(lapY - lapO) > SPIKE) { flag[k] = 3; val[k] = Math.abs(lapY - lapO); }
}
const seen = new Uint8Array(NC * NR);
for (let k = 0; k < flag.length; k++) {
  if (!flag[k] || seen[k]) continue;
  const f = flag[k], stack = [k], cells = []; seen[k] = 1;
  while (stack.length) {
    const q = stack.pop(); cells.push(q);
    const r = Math.floor(q / NC), cc = q % NC;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, c2 = cc + dc; if (rr < 0 || c2 < 0 || rr >= NR || c2 >= NC) continue; const n = rr * NC + c2; if (flag[n] === f && !seen[n]) { seen[n] = 1; stack.push(n); } }
  }
  if (cells.length < 2) continue;
  const kind = KINDS[f - 1];
  let w = cells[0]; for (const q of cells) if (val[q] > val[w]) w = q;
  const x = H.x0 + (w % NC) * st, z = H.z0 + Math.floor(w / NC) * st;
  sum[kind]++; sum[kind + "M2"] += cells.length * st * st;
  items.push({ kind, m2: cells.length * st * st, worst: +val[w].toFixed(2), score: cells.length * val[w], at: at(x, z), street: streetAt(T, x, z) });
}

// ---------------------------------------------------------------- street surfaces: cross-fall against the kerb
if (fit) for (const [part, want, lim, kind] of [["concrete", [SC.sidewalk], TILT, "tilt"], ["asphalt", [SC.roadway, SC.tramRoad], ROAD_TILT, "roadTilt"]]) {
  const P = d.road.parts?.[part]; if (!P) continue;
  const pos = P.position, I = P.index, bad = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b2 = I[t + 1] * 3, c2 = I[t + 2] * 3;
    const ax = pos[a], ay = pos[a + 1], az = pos[a + 2], ux = pos[b2] - ax, uy = pos[b2 + 1] - ay, uz = pos[b2 + 2] - az, vx = pos[c2] - ax, vy = pos[c2 + 1] - ay, vz = pos[c2 + 2] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, L = Math.hypot(nx, ny, nz);
    if (L < 1e-9 || Math.abs(ny) < 0.6 * L) continue;                       // kerb faces, skirts
    const area = Math.abs(ny) / 2; if (area < 0.02) continue;
    const cx = ax + (ux + vx) / 3, cz = az + (uz + vz) / 3;
    if (cx < b.x0 || cx >= b.x1 || cz < b.z0 || cz >= b.z1) continue;
    if (!want.includes(fit.classAt(cx, cz))) continue;
    const kb = fit.nearKerb(cx, cz, 6); if (!kb) continue;
    const gx = -nx / ny, gz = -nz / ny, cross = Math.abs(gx * kb.lx + gz * kb.lz);
    if (cross > lim) bad.push({ x: cx, z: cz, area, cross });
  }
  // groups within 2 m
  const g = new Map(), key = (x, z) => `${Math.floor(x / 2)},${Math.floor(z / 2)}`;
  bad.forEach((q, i) => { const k = key(q.x, q.z); if (!g.has(k)) g.set(k, []); g.get(k).push(i); });
  const done = new Uint8Array(bad.length);
  for (let i = 0; i < bad.length; i++) {
    if (done[i]) continue;
    const stack = [i], mem = []; done[i] = 1;
    while (stack.length) {
      const j = stack.pop(), q = bad[j]; mem.push(q);
      const gi = Math.floor(q.x / 2), gj = Math.floor(q.z / 2);
      for (let a2 = gi - 1; a2 <= gi + 1; a2++) for (let b3 = gj - 1; b3 <= gj + 1; b3++) for (const n of g.get(`${a2},${b3}`) || []) if (!done[n] && Math.hypot(bad[n].x - q.x, bad[n].z - q.z) < 2) { done[n] = 1; stack.push(n); }
    }
    const m2 = mem.reduce((s, q) => s + q.area, 0); if (m2 < 0.5) continue;
    let w = mem[0]; for (const q of mem) if (q.cross > w.cross) w = q;
    sum[kind]++; sum[kind + "M2"] += m2;
    items.push({ kind, m2: +m2.toFixed(1), worst: +w.cross.toFixed(2), score: m2 * w.cross, at: at(w.x, w.z), street: streetAt(T, w.x, w.z) });
  }
}
items.sort((a, c3) => c3.score - a.score);
console.log(JSON.stringify({ tile: T, sum, items: items.slice(0, 200) }));
