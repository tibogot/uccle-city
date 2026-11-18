// CENSUS class C (claude/census 2026-11-18, owner playtest images 77 89 91: blocky terrain bumps, saw-tooth slopes, a
// hole, sidewalk ground with saw edges / blocky lumps). Fixed on claude/sidewalk (docs/SIDEWALK.md, rule 28
// provisional): the merge-gate row `ground` runs this on every tile with --max ceilings.
//
// Every tile is built by the tile worker's own code in node (viewer/tileData.js buildTileData), then three scans:
//
// TERRAIN (the drawn 1 m grid d.y after carve / weld / clampUnder vs the bare UrbIS DTM d.orig), on cells that are not
// under a street surface (the drive grid's delta) nor inside a building footprint, nor INTENDED earthworks (claude/
// sidewalk re-tune: within 15 m of the railway's ballast / rails / platforms / fences = cuttings, embankments, the
// tunnel approaches; within 12 m of an OSM bridge deck's line = its abutments):
//   lump      raised > LUMP m over the DTM (viewer/heightmap.js weld: a bank up to a surface edge, maxRise 2 m)
//   hole      lowered > HOLE m under the DTM (carve / clampUnder past a surface), and under the street within 4 m
//             (a bank cut down to a street's edge, not under it, is intended: claude/sidewalk)
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
// OVER (claude/sidewalk): the drawn terrain (the 1 m grid as tileData.js terrainArrays splits it) more than OVER m above
// the highest drawn street surface, sampled every 0.25 m over the street's near-flat triangles: terrain drawn over a
// sidewalk / road (the saw-tooth zig-zag along a bank foot, a buried sidewalk). Groups as SURFACES.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/ground.mjs [--all | T ...] [--out FILE] [--jobs N]
//        [--old] (?sidewalk=old) [--quiet] [--max kind=n,...] (exit 1 when a city-wide group count is over its ceiling)
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runTiles, cli, at, ROOT, SC, imp } from "./lib_street.mjs";
import { buildTile, footprintIndex, streetAt, allBuiltTiles } from "./lib_mesh.mjs";

const c = cli();
const { CHILD, OUT, JOBS, WORST } = c;
const OLD = c.flag("--old"), QUIET = c.flag("--quiet"), MAX = c.opt("--max", null);
const TILES = c.ALL ? allBuiltTiles() : c.argv.filter((a) => /^[A-Z]\d+$/i.test(a)).map((t) => t.toUpperCase());
const LUMP = 0.5, HOLE = 0.5, SPIKE = 0.5, TILT = 0.15, ROAD_TILT = 0.12, OVER = 0.02;
const KINDS = ["lump", "hole", "spike", "tilt", "roadTilt", "over"];

if (!CHILD) {
  if (!TILES.length) { console.error("usage: ground.mjs [--all | T ...] [--out FILE] [--old] [--max kind=n,...]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS ?? 3, extra: OLD ? ["--old"] : [], log: !QUIET });
  const sum = Object.fromEntries(KINDS.flatMap((k) => [[k, 0], [k + "M2", 0]])), items = [];
  let tiles = 0, errors = 0;
  const perf = { roadMs: 0, weldMs: 0, surfMs: 0, roadTris: 0 };
  for (const r of res) {
    if (r.error) { errors++; continue; } tiles++;
    for (const k of Object.keys(sum)) sum[k] += r.sum[k] || 0;
    for (const k of Object.keys(perf)) perf[k] += r.perf?.[k] || 0;
    for (const it of r.items) items.push({ tile: r.tile, ...it });
  }
  for (const k of Object.keys(sum)) sum[k] = Math.round(sum[k]);
  console.log(`class C${OLD ? " (?sidewalk=old)" : ""}, ${tiles} tiles: ${JSON.stringify(sum)}`);
  console.log(`per tile: roads stage ${(perf.roadMs / tiles).toFixed(0)} ms (surfaces + width fit ${(perf.surfMs / tiles).toFixed(0)}, terrain weld ${(perf.weldMs / tiles).toFixed(0)}), road triangles ${(perf.roadTris / tiles).toFixed(0)}`);
  if (!QUIET) for (const k of KINDS) {
    const L = items.filter((i) => i.kind === k).sort((a, b) => b.score - a.score);
    console.log(`worst ${k} (${L.length}):`);
    for (const it of L.slice(0, WORST)) console.log(`  ${JSON.stringify(it)}`);
  }
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), old: OLD, sum, perf, tiles: res.map((r) => ({ tile: r.tile, sum: r.sum, perf: r.perf })), items: items.sort((a, b) => b.score - a.score).slice(0, 3000) }, null, 1));
  let fail = errors > 0;
  if (errors) console.log(`FAIL ${errors} tile(s) did not build`);
  if (MAX) for (const kv of MAX.split(",")) {
    const [k, v] = kv.split("="), n = sum[k];
    if (n > +v) { fail = true; console.log(`FAIL ${k}: ${n} groups > ceiling ${v}`); }
    else console.log(`ok ${k}: ${n} <= ${v}`);
  }
  process.exit(fail ? 1 : 0);
}

const T = TILES[0];
const { d, bDoc } = await buildTile(T, OLD ? { sidewalkLevel: false } : {});
const { streetFit } = await imp("viewer/streets/fitCore.js");
const fit = d.road.surfaceData ? streetFit(d.road.surfaceData) : null;
const H = d.hdr, Y = d.y, O = d.orig, NC = H.cols, NR = H.rows, st = H.step, b = d.bounds;
const delta = d.drive?.ground?.delta;
const fp = footprintIndex(bDoc.buildings);
const sum = Object.fromEntries(KINDS.flatMap((k) => [[k, 0], [k + "M2", 0]])), items = [];
const nodata = (k) => H.min != null && O[k] <= H.min + 0.02;      // (outside the Brussels DTM: its lowest value)

// ---------------------------------------------------------------- intended earthworks (not counted)
const intended = new Uint8Array(NC * NR);
const markNear = (x, z, R) => {
  const c0 = Math.max(0, Math.floor((x - R - H.x0) / st)), c1 = Math.min(NC - 1, Math.ceil((x + R - H.x0) / st));
  const r0 = Math.max(0, Math.floor((z - R - H.z0) / st)), r1 = Math.min(NR - 1, Math.ceil((z + R - H.z0) / st));
  for (let r = r0; r <= r1; r++) for (let cc = c0; cc <= c1; cc++) if ((H.x0 + cc * st - x) ** 2 + (H.z0 + r * st - z) ** 2 <= R * R) intended[r * NC + cc] = 1;
};
for (const name of ["ballast", "rails", "platforms", "fences"]) {
  const P = d.rail?.[name]?.position; if (!P) continue;
  const seen = new Set();
  for (let i = 0; i < P.length; i += 3) { const key = `${Math.round(P[i] / 4)},${Math.round(P[i + 2] / 4)}`; if (seen.has(key)) continue; seen.add(key); markNear(P[i], P[i + 2], 15); }
}
for (const dk of d.bridgeDecks || []) for (const [x, z] of dk.pts || []) markNear(x, z, 12);

// ---------------------------------------------------------------- terrain cells
// (claude/sidewalk re-tune) a cell lowered under the DTM that stays above the lowest street surface within 4 m (+ BANK_TOL
// under it) is the bank cut down to a street's edge (viewer/heightmap.js clampUnder bank), not a pit: not a hole
const BANK_TOL = 0.3;
const besideStreet = (k) => { if (!delta) return false; for (const q of [k - 1, k + 1, k - NC, k + NC, k - NC - 1, k - NC + 1, k + NC - 1, k + NC + 1]) { const v = delta[q]; if (v > 0 && v !== 65535) return true; } return false; };
const bankCut = (k) => {
  if (!delta) return false;
  const r = Math.floor(k / NC), cc = k % NC; let lo = Infinity;
  for (let dr = -4; dr <= 4; dr++) for (let dc = -4; dc <= 4; dc++) {
    const rr = r + dr, c2 = cc + dc; if (rr < 0 || c2 < 0 || rr >= NR || c2 >= NC || dr * dr + dc * dc > 16) continue;
    const q = rr * NC + c2, v = delta[q]; if (v > 0 && v !== 65535) lo = Math.min(lo, Y[q] + v / 100);
  }
  return lo < Infinity && Y[k] >= lo - BANK_TOL;
};
const flag = new Uint8Array(NC * NR), val = new Float32Array(NC * NR);
for (let r = 1; r < NR - 1; r++) for (let cc = 1; cc < NC - 1; cc++) {
  const k = r * NC + cc, x = H.x0 + cc * st, z = H.z0 + r * st;
  if (x < b.x0 || x >= b.x1 || z < b.z0 || z >= b.z1 || nodata(k) || intended[k]) continue;
  // under / at a street surface (any of the 4 cells round the vertex): not terrain that shows
  let cov = false;
  if (delta) for (const q of [k, k - 1, k - NC, k - NC - 1]) { const v = delta[q]; if (v > 0 && v !== 65535) { cov = true; break; } }
  if (cov || (fit && fit.classAt(x, z) >= 0)) continue;
  if (fp.at(x, z, 0.5) >= 0) continue;
  const dy = Y[k] - O[k];
  const lapY = Y[k] - (Y[k - 1] + Y[k + 1] + Y[k - NC] + Y[k + NC]) / 4, lapO = O[k] - (O[k - 1] + O[k + 1] + O[k - NC] + O[k + NC]) / 4;
  if (dy > LUMP) { flag[k] = 1; val[k] = dy; }
  else if (dy < -HOLE) { if (!bankCut(k)) { flag[k] = 2; val[k] = -dy; } }
  // (claude/sidewalk re-tune: not beside a street, where a neighbour is the hidden notch under its edge (heightmap.js
  // clampUnder bank): the Laplacian there measures geometry the surface covers; nor the crease of a bank cut down to a
  // street's edge (lowered, above the street: the 45 degree bank's toe / crest, intended))
  else if (Math.abs(lapY - lapO) > SPIKE && !besideStreet(k) && !(dy < -0.05 && bankCut(k))) { flag[k] = 3; val[k] = Math.abs(lapY - lapO); }
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

/** flagged points { x, z, area, v } -> groups (within 2 m), counted as `kind` (>= 0.5 m2) */
const group = (bad, kind) => {
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
    let w = mem[0]; for (const q of mem) if (q.v > w.v) w = q;
    sum[kind]++; sum[kind + "M2"] += m2;
    items.push({ kind, m2: +m2.toFixed(1), worst: +w.v.toFixed(2), score: m2 * w.v, at: at(w.x, w.z), street: streetAt(T, w.x, w.z) });
  }
};

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
    if (cross > lim) bad.push({ x: cx, z: cz, area, v: cross });
  }
  group(bad, kind);
}

// ---------------------------------------------------------------- terrain drawn over the street
{
  const terr = (x, z) => {                     // the drawn terrain grid (tileData.js terrainArrays, fitDiagonals on)
    const fc = (x - H.x0) / st, fr = (z - H.z0) / st, c0 = Math.floor(fc), r0 = Math.floor(fr);
    if (c0 < 0 || r0 < 0 || c0 >= NC - 1 || r0 >= NR - 1) return -Infinity;
    const u = fc - c0, v = fr - r0, a = r0 * NC + c0, bb = a + NC, cc = a + 1, dd = bb + 1;   // bb = +z, cc = +x
    if (Math.abs(Y[a] - Y[dd]) < Math.abs(Y[bb] - Y[cc]) - 0.01) {   // split a-d
      return u >= v ? Y[a] + u * (Y[cc] - Y[a]) + v * (Y[dd] - Y[cc]) : Y[a] + v * (Y[bb] - Y[a]) + u * (Y[dd] - Y[bb]);
    }
    return u + v <= 1 ? Y[a] + u * (Y[cc] - Y[a]) + v * (Y[bb] - Y[a]) : Y[dd] + (1 - u) * (Y[bb] - Y[dd]) + (1 - v) * (Y[cc] - Y[dd]);
  };
  const S = 0.25, top = new Map();
  for (const name of ["asphalt", "concrete", "square", "grass", "pits"]) {
    const P = d.road.parts?.[name]; if (!P) continue;
    const pos = P.position, I = P.index;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b2 = I[t + 1] * 3, c2 = I[t + 2] * 3;
      const ax = pos[a], ay = pos[a + 1], az = pos[a + 2], bx = pos[b2], by = pos[b2 + 1], bz = pos[b2 + 2], cx = pos[c2], cy = pos[c2 + 1], cz = pos[c2 + 2];
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (Math.abs(ny) < 0.6 * Math.hypot(nx, ny, nz)) continue;
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(det) < 1e-9) continue;
      const i0 = Math.ceil(Math.max(Math.min(ax, bx, cx), b.x0) / S), i1 = Math.floor(Math.min(Math.max(ax, bx, cx), b.x1 - 1e-6) / S);
      const j0 = Math.ceil(Math.max(Math.min(az, bz, cz), b.z0) / S), j1 = Math.floor(Math.min(Math.max(az, bz, cz), b.z1 - 1e-6) / S);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = i * S, pz = j * S;
        const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det, l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det, l3 = 1 - l1 - l2;
        if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
        const y = l1 * ay + l2 * by + l3 * cy, key = (i + 50000) * 100000 + (j + 50000), o = top.get(key);
        if (o === undefined || y > o) top.set(key, y);
      }
    }
  }
  const bad = [];
  for (const [key, y] of top) {
    const i = Math.floor(key / 100000) - 50000, j = (key % 100000) - 50000, x = i * S, z = j * S;
    const ck = Math.round((z - H.z0) / st) * NC + Math.round((x - H.x0) / st);
    if (intended[ck]) continue;
    const v = terr(x, z) - y;
    if (v > OVER) bad.push({ x, z, area: S * S, v });
  }
  group(bad, "over");
}
items.sort((a, c3) => c3.score - a.score);
const tm = d.times || {};
const perf = { roadMs: tm.roads || 0, weldMs: (tm["terrain weld"] || 0) + (tm["edge field"] || 0), surfMs: tm["surfaces + width fit"] || 0, roadTris: d.road.triangles || 0 };
console.log(JSON.stringify({ tile: T, sum, perf, items: items.slice(0, 200) }));
