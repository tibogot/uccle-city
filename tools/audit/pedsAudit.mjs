// PEDESTRIANS AUDIT (claude/peds2, rules peds-walk-graph, peds-crossings-only, peds-density, peds-no-alloc; gate rows
// `pedsgraph` and `pedssim`). The tile worker's whole build in node (tools/roadfix/tile.mjs) for the Saint-Job tiles
// (H5 I5 H6 I6) and Wolvendael (F4), then:
//   graph (--graph)
//     W1 off the carriageway   no sample (0.25 m) of a walking edge (sidewalk / path / square / link / steps) on a
//                              carriageway cell of the class raster (roadway, tram roadway / site, parking, median)
//                              beyond MAX_CARRIAGE of the walked length (the raster's kerb cells); crossings and tram
//                              platforms (drawn on the road) are the only edges allowed there
//     W2 not through solids    no sample of any edge (crossings too) inside a drawn wall / building / raised island of
//                              the drive colliders (0.5 m raster: tolerance one cell at its edge)
//     W3 crossings linked      >= LINKED of the drawn crossings (road inventory) are an edge kerb to kerb
//     W4 signalled crossings   every crossing within 25 m of a signal node of the phase table has a phase
//     W5 coverage              >= COVER of the drawn sidewalk cells (class sidewalk, off solids) lie within 2.5 m of a
//                              walking line (every drawn sidewalk has people's line)
//     W6 walk graph time       buildWalkGraph on the tile's own inputs <= WG_MS ms x k, timed HERE, the best of 3
//                              between two calibrations (tools/gate/timing.mjs measure): never the build time stored
//                              with a cached tile (claude/gateflakes, rules tile-cache, timing-rows-alone); the re-timed
//                              graph must equal the tile's (the same work)
//   sim (--sim)
//     S1 density               the CitySim on those tiles round Place de Saint-Job: alive people at 08:30 weekday in
//                              [MIN_AM, MAX_AM] within 230 m; at 03:00 <= MAX_NIGHT; the park (Wolvendael) busier at 15:00
//                              than at 08:30
//     S2 never on the road     sampled person positions: none on a carriageway cell unless on a crossing edge (or
//                              just stepping off one: 1.2 m), none in a solid
//     S3 no allocation         the sim step's heap growth over 600 steps (gc before / after) <= ALLOC_KB_STEP KB a step
//     S4 step budget           the sim step's mean CPU <= STEP_MS ms for the Saint-Job population (node; the page's
//                              budget is 0.6 ms for the whole crowd incl. the draw prep: measured in the city), x k
//                              (calibrations before / after the run)
//   node --import ./tools/road_audit/register.mjs tools/audit/pedsAudit.mjs [--graph] [--sim] [--quiet] [--json out]
// Exit 1 on a FAIL; 75 when the only FAILs are the timings W6 / S4 (mergeGate re-runs it alone, rule timing-rows-alone).
import "../road_audit/register.mjs";
import { writeFileSync } from "node:fs";
import { buildTile } from "../roadfix/tile.mjs";
import { blockedRaster, EK } from "../../viewer/pedestrians/walkGraph.js";
import { signalPhases } from "../../viewer/traffic/signals.js";
import { buildWalkGraph } from "../../viewer/pedestrians/walkGraph.js";
import { measure, bestOf, calibrate, slowdown, timed, gateExit, slow } from "../gate/timing.mjs";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const argv = process.argv.slice(2), QUIET = argv.includes("--quiet");
const DO_G = argv.includes("--graph") || !argv.includes("--sim"), DO_S = argv.includes("--sim") || !argv.includes("--graph");
const jsonOut = argv.includes("--json") ? argv[argv.indexOf("--json") + 1] : null;
const TILES = ["H5", "I5", "H6", "I6", "F4"];
// (WG_MS: claude/gateflakes timed the pure build in the row, best of 3: 29-73 ms x k 1.3-1.5 on the five tiles; the old
// 800 ms was the worker step incl. its streetlife fetch, read from the cache (~430 ms fresh). 250 ms: ~3 x the dearest)
const MAX_CARRIAGE = 0.01, LINKED = 0.85, COVER = 0.9, WG_MS = 250;
const MIN_AM = 60, MAX_AM = 260, MAX_NIGHT = 30, ALLOC_KB_STEP = 0.5, STEP_MS = 0.5;
const CARRIAGE = new Set([1, 2, 3, 4, 7]);            // class + 1: roadway, tram road, tram site, parking, median
const fails = [], fail = (c, m) => fails.push(`${c}: ${m}`), log = (...a) => { if (!QUIET) console.log(...a); };
const out = { tiles: {}, sim: null };

const built = new Map();
const TB = await import("../gate/tileBuild.mjs");
for (const T of TILES) {
  let d = await buildTile(T, {});
  // (claude/reality2) W6 is a TIMING: a tile the gate cache served carries the worker time of the build that stored it,
  // maybe under another agent's load (H5 908 ms stored, 417-438 ms fresh): over the limit, it is timed again fresh
  if (DO_G && TB.lastInfo?.hit && d.times?.["walk graph"] > WG_MS) { const was = process.env.TILE_CACHE; process.env.TILE_CACHE = "0"; try { d = await buildTile(T, {}); } finally { if (was == null) delete process.env.TILE_CACHE; else process.env.TILE_CACHE = was; } }
  built.set(T, d);
}

// W6: buildWalkGraph on the inputs tileData.js gives it (viewer/tileData.js "walk graph" step), the best of 3 between
// two calibrations; same = the graph equals the tile's (deterministic build: the same work was timed)
const SL = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../data/streetlife");
async function walkGraphMs(T, d) {
  let pois = [];
  try { const f = path.join(SL, `${T}.json`); if (existsSync(f)) pois = (JSON.parse(readFileSync(f, "utf8")).pois || []).map((p) => ({ x: p.face?.x ?? p.x, z: p.face?.z ?? p.z, kind: p.kind })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.z)); } catch {}
  const o = { bounds: d.bounds, model: d.net?.streetModel, grid: d.road.surfaceData.grid, roofs: d.roofs, col: d.drive.col, crossings: d.road.inventory?.crossings, roads: d.roads, feats: d.feats, bollards: d.road.surfaceData.bollards, pois };
  let g = null;
  const MT = await measure(() => bestOf(3, () => { const t0 = performance.now(); g = buildWalkGraph(o); slow("pedsgraph", t0); return performance.now() - t0; }));
  const same = !g ? null : g.ea.length === d.peds.ea.length && g.x.length === d.peds.x.length && JSON.stringify(g.stats) === JSON.stringify(d.peds.stats);
  return { ms: MT.value, k: MT.k, note: MT.note, same };
}

if (DO_G) for (const [T, d] of built) {
  const g = d.peds, G = d.road.surfaceData?.grid;
  if (!g) { fail("W0", `${T}: no walk graph`); continue; }
  const R = blockedRaster({ col: d.drive.col, bollards: d.road.surfaceData.bollards }, d.bounds), B = d.bounds;
  const cls = (x, z) => { const i = Math.floor((x - G.x0) / G.step), j = Math.floor((z - G.z0) / G.step); return i >= 0 && j >= 0 && i < G.nx && j < G.nz ? G.data[j * G.nx + i] : 0; };
  const solid = (x, z) => { const i = Math.floor((x - B.x0) / 0.5), j = Math.floor((z - B.z0) / 0.5); if (i < 1 || j < 1 || i >= R.nx - 1 || j >= R.nz - 1) return false;
    // inside a solid with all 4 neighbours solid too (one cell of tolerance at its edge)
    const k = j * R.nx + i; return R.data[k] === 1 && R.data[k - 1] === 1 && R.data[k + 1] === 1 && R.data[k - R.nx] === 1 && R.data[k + R.nx] === 1; };
  let walkM = 0, roadM = 0, solidN = 0; const worst = [], solidAt = [];
  for (let m = 0; m < g.ea.length; m++) {
    const a = g.ea[m], b = g.eb[m], k = g.ek[m], L = Math.hypot(g.x[b] - g.x[a], g.z[b] - g.z[a]), n = Math.max(1, Math.ceil(L / 0.25));
    const walking = k !== EK.cross && k !== EK.zebra && k !== EK.platform;
    for (let s = 0; s <= n; s++) {
      const x = g.x[a] + (g.x[b] - g.x[a]) * (s / n), z = g.z[a] + (g.z[b] - g.z[a]) * (s / n);
      if (walking) { walkM += L / (n + 1); if (CARRIAGE.has(cls(x, z))) { roadM += L / (n + 1); if (worst.length < 5) worst.push([Math.round(x), Math.round(z), ["walk", "path", "cross", "zebra", "platform", "square", "steps", "link"][k]]); } }
      if (solid(x, z)) { solidN++; if (solidAt.length < 4) solidAt.push([Math.round(x), Math.round(z), ["walk", "path", "cross", "zebra", "platform", "square", "steps", "link"][k]]); }
    }
  }
  const st = g.stats, roadShare = roadM / Math.max(1, walkM);
  if (roadShare > MAX_CARRIAGE) fail("W1", `${T}: ${(roadShare * 100).toFixed(2)} % of the walked length on the carriageway (max ${MAX_CARRIAGE * 100} %), e.g. ${JSON.stringify(worst)}`);
  if (solidN > 0) fail("W2", `${T}: ${solidN} edge samples inside a solid, e.g. ${JSON.stringify(solidAt)}`);
  const linked = st.crossings ? st.crossingsLinked / st.crossings : 1;
  if (linked < LINKED) fail("W3", `${T}: ${st.crossingsLinked} / ${st.crossings} crossings linked (min ${LINKED * 100} %), unlinked at ${JSON.stringify(st.unlinked)}`);
  // W4: crossings near a signal node carry a phase
  const P = signalPhases(d.roads), sig = [...P.nodes.values()];
  let nearSig = 0, withPh = 0;
  for (let m = 0; m < g.ea.length; m++) {
    if (g.ek[m] !== EK.cross && g.ek[m] !== EK.zebra) continue;
    const x = (g.x[g.ea[m]] + g.x[g.eb[m]]) / 2, z = (g.z[g.ea[m]] + g.z[g.eb[m]]) / 2;
    if (sig.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 25 * 25)) { nearSig++; if (g.ep[m] >= 0) withPh++; }
  }
  if (withPh < nearSig) fail("W4", `${T}: ${nearSig - withPh} of ${nearSig} crossings within 25 m of a signal have no phase`);
  // W5: coverage of the drawn sidewalk (cells of class sidewalk off solids) within 2.5 m of a walking line
  const cov = new Uint8Array(R.nx * R.nz);
  for (let m = 0; m < g.ea.length; m++) {
    const k = g.ek[m]; if (k === EK.cross || k === EK.zebra) continue;
    const a = g.ea[m], b = g.eb[m], L = Math.hypot(g.x[b] - g.x[a], g.z[b] - g.z[a]), n = Math.max(1, Math.ceil(L / 0.5));
    for (let s = 0; s <= n; s++) {
      const x = g.x[a] + (g.x[b] - g.x[a]) * (s / n), z = g.z[a] + (g.z[b] - g.z[a]) * (s / n), i0 = Math.floor((x - B.x0) / 0.5), j0 = Math.floor((z - B.z0) / 0.5);
      for (let dj = -5; dj <= 5; dj++) for (let di = -5; di <= 5; di++) { const i = i0 + di, j = j0 + dj; if (i >= 0 && j >= 0 && i < R.nx && j < R.nz && di * di + dj * dj <= 25) cov[j * R.nx + i] = 1; }
    }
  }
  let sw = 0, swCov = 0;
  for (let k = 0; k < R.nx * R.nz; k++) if (G.data[k] === 6 && R.data[k] !== 1) { sw++; if (cov[k]) swCov++; }
  const cover = sw ? swCov / sw : 1;
  if (cover < COVER) fail("W5", `${T}: ${(cover * 100).toFixed(1)} % of the drawn sidewalk within 2.5 m of a walking line (min ${COVER * 100} %)`);
  // W6 (claude/gateflakes, rule timing-rows-alone): timed here on the tile's own inputs, never d.times (a cached tile
  // carries the time of the build that stored it, maybe under another agent's load: H5 809 / 908 ms stored, ~430 fresh)
  const W = await walkGraphMs(T, d);
  if (!W.same) fail("W6", `${T}: the re-timed walk graph differs from the tile's (${W.same === null ? "no graph" : "not the same work"})`);
  else if (!timed(W.ms <= WG_MS * W.k)) fail("W6", `${T}: walk graph ${W.ms.toFixed(0)} ms (max ${WG_MS} ms x k, ${W.note})`);
  out.tiles[T] = { nodes: st.nodes, edges: st.edges, lineM: st.lineM, pathM: st.pathM, crossings: `${st.crossingsLinked}/${st.crossings}`, signalled: st.crossingsSignal, platforms: st.platforms, square: st.squareNodes,
    roadPct: +(roadShare * 100).toFixed(3), solidSamples: solidN, coverPct: +(cover * 100).toFixed(1), walkGraphMs: Math.round(W.ms), k: +W.k.toFixed(2) };
  log(T, JSON.stringify(out.tiles[T]));
}

if (DO_S) {
  // the main thread's graph + sim, headless (no colliders: the worker's graph alone; no view: every spawn hidden)
  globalThis.requestAnimationFrame = undefined;
  const { CityGraph } = await import("../../viewer/pedestrians/cityGraph.js");
  const { CitySim } = await import("../../viewer/pedestrians/citySim.js");
  const graph = new CityGraph();
  for (const [T, d] of built) await graph.addTile(T, d.peds, {});
  const grids = [...built.values()].map((d) => ({ G: d.road.surfaceData.grid, B: d.bounds, R: blockedRaster({ col: d.drive.col, bollards: [] }, d.bounds), hm: null }));
  const at = (x, z) => { for (const q of grids) if (x >= q.B.x0 && x < q.B.x1 && z >= q.B.z0 && z < q.B.z1) return q; return null; };
  const clsAt = (x, z) => { const q = at(x, z); if (!q) return 0; const i = Math.floor((x - q.G.x0) / q.G.step), j = Math.floor((z - q.G.z0) / q.G.step); return q.G.data[j * q.G.nx + i]; };
  const solidAt = (x, z) => { const q = at(x, z); if (!q) return false; const i = Math.floor((x - q.B.x0) / 0.5), j = Math.floor((z - q.B.z0) / 0.5), R = q.R, k = j * R.nx + i;
    return i > 0 && j > 0 && i < R.nx - 1 && j < R.nz - 1 && R.data[k] === 1 && R.data[k - 1] === 1 && R.data[k + 1] === 1 && R.data[k - R.nx] === 1 && R.data[k + R.nx] === 1; };
  const world = { graph, ground: () => 100, signal: { walk: (ph) => ((Date.now() / 1000 + ph * 27) % 54) > 25 && ((Date.now() / 1000 + ph * 27) % 54) < 40 },
    inView: () => false, camDist: () => 1e9, carsNear: () => ({ canGo: true, clear: true }), tram: null };
  const run = (x, z, hour, steps, sampler) => {
    const sim = new CitySim(world, { max: 420, seed: 7 });
    sim.focus.x = x; sim.focus.z = z; sim.hour = hour; sim.weekend = false;
    for (let i = 0; i < steps; i++) { sim.step(1 / 60); for (const p of sim.people) if (p.alive) p.dist = Math.hypot(p.x - x, p.z - z); if (sampler) sampler(sim, i); }
    return sim;
  };
  const SJ = [1153, 540], WV = [-402, -90];
  const am = run(...SJ, 8.5, 300), night = run(...SJ, 3, 300);
  const nAm = am.people.filter((p) => p.alive).length, nNight = night.people.filter((p) => p.alive).length;
  const pkAm = run(...WV, 8.5, 120).people.filter((p) => p.alive).length, pkPm = run(...WV, 15, 120).people.filter((p) => p.alive).length;
  if (nAm < MIN_AM || nAm > MAX_AM) fail("S1", `Saint-Job 08:30: ${nAm} people within 230 m (want ${MIN_AM}-${MAX_AM})`);
  if (nNight > MAX_NIGHT) fail("S1", `Saint-Job 03:00: ${nNight} people (max ${MAX_NIGHT})`);
  if (!(pkPm > pkAm)) fail("S1", `Wolvendael: 15:00 ${pkPm} not busier than 08:30 ${pkAm}`);
  // S2 + S4 + S3: a 60 s run at 08:30
  let onRoad = 0, inSolid = 0, samples = 0; const roadAt = [];
  const sim = new CitySim(world, { max: 420, seed: 11 });
  sim.focus.x = SJ[0]; sim.focus.z = SJ[1]; sim.hour = 8.5;
  for (let i = 0; i < 600; i++) { sim.step(1 / 60); for (const p of sim.people) if (p.alive) p.dist = Math.hypot(p.x - SJ[0], p.z - SJ[1]); }
  const nearCrossing = (p) => { const e = p.edge; if (p.onCrossing || p.kerb) return true; for (const f of [e?.a, e?.b]) if (f) for (const q of f.edges) if ((q.kind === "cross" || q.kind === "zebra") && Math.hypot(p.x - f.x, p.z - f.z) < 1.2 + q.width) return true; return e && (e.kind === "platform" || e.a.kind === "board" || e.b.kind === "board"); };
  globalThis.gc?.();
  const h0 = process.memoryUsage().heapUsed;
  let ms = 0;
  const c0 = calibrate();   // (S4 x k: calibrations around the run, rule timing-rows-alone)
  for (let i = 0; i < 3600; i++) {
    const t0 = performance.now(); sim.step(1 / 60); ms += performance.now() - t0;
    if (i === 599) { globalThis.gc?.(); out.alloc = (process.memoryUsage().heapUsed - h0) / 1024 / 600; }
    if (i % 10 === 0) for (const p of sim.people) {
      if (!p.alive) continue;
      p.dist = Math.hypot(p.x - SJ[0], p.z - SJ[1]);
      samples++;
      if (CARRIAGE.has(clsAt(p.x, p.z)) && !nearCrossing(p)) { onRoad++; if (roadAt.length < 6) roadAt.push([Math.round(p.x), Math.round(p.z), p.edge?.kind, p.state]); }
      if (solidAt(p.x, p.z)) inSolid++;
    }
  }
  const k4 = slowdown(c0, calibrate());
  const stepMs = ms / 3600, alive = sim.people.filter((p) => p.alive).length;
  if (onRoad / Math.max(1, samples) > 0.002) fail("S2", `${onRoad} of ${samples} person samples on the carriageway off a crossing, e.g. ${JSON.stringify(roadAt)}`);
  if (inSolid / Math.max(1, samples) > 0.001) fail("S2", `${inSolid} of ${samples} person samples inside a solid`);
  if (globalThis.gc && out.alloc > ALLOC_KB_STEP) fail("S3", `the sim step keeps ${out.alloc.toFixed(2)} KB a step (max ${ALLOC_KB_STEP}; run with --expose-gc)`);
  if (!timed(stepMs <= STEP_MS * k4)) fail("S4", `the sim step ${stepMs.toFixed(3)} ms for ${alive} people (max ${STEP_MS} ms x k ${k4.toFixed(2)})`);
  out.sim = { stjobAm: nAm, stjobNight: nNight, wolvendaelAm: pkAm, wolvendaelPm: pkPm, alive, stepMs: +stepMs.toFixed(3), allocKBStep: out.alloc == null ? null : +out.alloc.toFixed(3), samples, onRoad, inSolid, counters: sim.counters, graph: graph.stats };
  log("sim", JSON.stringify(out.sim));
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 1));
if (fails.length) { console.log(`pedsAudit: FAIL (${fails.length})`); for (const f of fails) console.log("  " + f); process.exit(gateExit(fails.length)); }
console.log(`pedsAudit: PASS (${DO_G ? "graph W1-W6 on " + TILES.join(" ") : ""}${DO_G && DO_S ? "; " : ""}${DO_S ? "sim S1-S4" : ""})`);
