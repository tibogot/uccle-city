// CENSUS class R (claude/roads 2026-11-18, owner playtest 2026-11-18 round 2, docs/ROADS_R.md): the road graph the
// traffic drives and the street edges the player drives, city-wide, headless (each tile built with the worker's own
// road stage, width parking and traffic graph: tools/road_audit/tile.mjs, viewer/streets/parkPlace.js,
// viewer/traffic/trafficGraph.js, as viewer/tileData.js builds them).
//
//   slalom     a driven lane path (lane pieces with their straight continuations either side, as a car drives them)
//              that weaves: its lateral deviation from a local quadratic fit over +-SG m (Savitzky-Golay: a constant
//              curve fits exactly, only the wobble is left) over WOB m (wobble metres), and the sign flips: two opposite
//              deviations over FLIP m within FLIP_GAP m (slalom metres). Each flagged metre is traced back through the
//              graph's build stages (the refined lane graph -> the surface / parked-car fit -> the joins -> the kink
//              rounding) to the first stage where it appears: the cause. Heading change per metre (p99, max) on the
//              straight stretches (the local fit's radius > STRAIGHT_R).
//   inBuilding a traffic path point (lane or junction turn) whose car body (centre +- 0.9 m across) is inside a drawn
//              building footprint (buildings.json, this tile + its neighbours; the heroes' solids too: their models
//              stand there); grouped into places (6 m), with the depth (m inside the footprint).
//   offCarriage a traffic path point off the DRAWN carriageway (viewer/streets/carriageway.js: the measured classes where
//              UrbIS maps the street, else the OSM band) by more than OFF_TOL m (half a car past the kerb), how far.
//   plants     a generated shrub / bed plant (data/plants/<T>.json) whose foot stands on the drawn carriageway, or whose
//              crown (0.4 x its height round the foot) reaches PLANT_IN m into it; beds the same by their strip.
//   frontage   every 2 m of every driven street's side: what a car meets going out from the carriageway across the
//              kerb (UrbIS kerb line within 0.3 m of the carriage edge: kerb / none): building, a garden wall /
//              railing (hard), a hedge (soft), a gate or a driveway (UrbIS CR42L / a ramp / the kit's car opening:
//              open by design), or OPEN private land (a lawn with nothing drawn between it and the street); and
//              bandOnPrivate: private land (not a street surface, not a building) that the carriageway test calls
//              carriageway (the OSM band reaching past a MEASURED street's edge): a garden piece there is dropped by
//              main.js (gardens: drivenAt.inside(x, z, 0.3)), the lawn opens.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/roads.mjs [--all | T ...] [--out FILE] [--jobs N]
//        [--old] [--max k=v,...] [--quiet] [--worst N]
//   --old: the city as ?roads=old builds it (entry roadsR false); --lanesold: ?streetlanes=old (claude/street4: the
//   fitted engine lanes, not the street model's); --max: the gate (ceilings, exit 1 above)
//   the cars' own trajectories in the running sim: tools/audit/census/roadSim.mjs
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { streetTile, runTiles, cli, json, at, ROOT, imp, SC } from "./lib_street.mjs";
import { footprintIndex } from "./lib_mesh.mjs";
import { resample, wobble, judge, judge1, STRAIGHT_R } from "./lib_path.mjs";
import { laneCtx } from "./laneCause.mjs";

const { CHILD, TILES, OUT, JOBS, WORST, flag, opt } = cli();
const OLD = flag("--old"), LANES_OLD = flag("--lanesold"), MAX = opt("--max", null), QUIET = flag("--quiet");
export const OFF_TOL = 0.5, PLANT_IN = 0.3;
const H_MODEL = [0.72, 1.44, 1.29, 0.92, 0.93, 0.61, 0.48, 0.37];   // tools/plants/build_plants.py H_MODEL by type index
const PLANT_TYPES = ["box_ball", "laurel", "rhododendron", "hydrangea", "rose", "lavender", "bulbs", "geranium"];
const r1 = (v) => Math.round(v * 10) / 10;

// ------------------------------------------------------------------ parent
if (!CHILD) {
  if (!TILES.length) { console.error("usage: roads.mjs [--all | T ...] [--out FILE] [--old] [--max k=v,...]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS, extra: OLD ? ["--old"] : LANES_OLD ? ["--lanesold"] : [], log: !QUIET });
  const sum = {}, items = {}, hist = [];
  for (const r of res) {
    if (r.error) continue;
    for (const [k, v] of Object.entries(r.counts)) sum[k] = (sum[k] || 0) + v;
    for (const [k, list] of Object.entries(r.items)) for (const it of list) (items[k] ||= []).push({ tile: r.tile, ...it });
    for (const v of r.straightH || []) hist.push(v);
  }
  for (const k of Object.keys(sum)) sum[k] = Math.round(sum[k] * 10) / 10;
  hist.sort((a, b) => a - b);
  sum.headP99 = hist.length ? r1(hist[Math.floor(hist.length * 0.99)] * 10) / 10 : 0;
  sum.headP999 = hist.length ? r1(hist[Math.floor(hist.length * 0.999)] * 10) / 10 : 0;
  for (const k of Object.keys(items)) items[k].sort((a, b) => (b.m ?? b.deep ?? 0) - (a.m ?? a.deep ?? 0));
  const byCause = {}; for (const it of items.slalom || []) byCause[it.cause] = (byCause[it.cause] || 0) + it.m;
  console.log(`class R, ${res.length} tiles${res.some((r) => r.error) ? ` (${res.filter((r) => r.error).length} failed)` : ""}${OLD ? " (--old: ?roads=old)" : ""}`);
  console.log(JSON.stringify(sum));
  console.log("wobble / slalom metres by first stage:", JSON.stringify(byCause));
  for (const k of ["inBuilding", "offCarriage"]) {
    const by = {}; for (const it of items[k] || []) { const c = `${it.klass} ${it.why}`, e = (by[c] ??= { n: 0, m: 0 }); e.n++; e.m = r1(e.m + it.m); }
    console.log(`${k} places by class / reason: ${JSON.stringify(by)}`);
  }
  for (const k of Object.keys(items)) {
    console.log(`worst ${k} (${items[k].length}):`);
    for (const it of items[k].slice(0, WORST)) console.log(`  ${it.tile} ${JSON.stringify(it)}`);
  }
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), old: OLD, sum, byCause, items }));
  let bad = res.some((r) => r.error) ? 1 : 0;
  if (bad) console.log(`FAIL ${res.filter((r) => r.error).length} tile(s) did not build`);
  if (MAX) for (const kv of MAX.split(",")) {
    const [k, v] = kv.split("="), n = sum[k] ?? 0;
    if (n > +v) { console.log(`FAIL ${k} ${n} > ${v}`); bad++; } else console.log(`ok ${k} ${n} <= ${v}`);
  }
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ the tile's traffic graph as the worker builds it
async function graphOf(T) {
  const S = await streetTile(T, OLD ? { build: { roadsR: false }, bandOnMeasured: true } : {});
  const { rd, roads, feats, bounds, fit } = S;
  const { widthParking } = await imp("viewer/streets/parkPlace.js");
  const { buildTrafficGraph } = await imp("viewer/traffic/trafficGraph.js");
  const parked = rd.surfaceData ? widthParking(roads, feats, bounds, fit) : null;
  const trace = {};
  const refined = rd.net.graph.paths.map((p) => ({ id: p.id, kind: p.kind, pts: p.pts.map((q) => [q[0] ?? q.x, q[1] ?? q.z]) }));
  // (the worker's own builder, viewer/traffic/tileTraffic.js: the roof grid as its building test)
  const { tileTrafficGraph } = await imp("viewer/traffic/tileTraffic.js");
  const g = tileTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData?.grid, { parked: parked?.sites, trace, roofs: S.tile.roofs, entry: OLD ? { roadsR: false } : LANES_OLD ? { streetLanes: false } : {} });
  // (the same graph without the far-lane snap: the places the snap creates / removes; claude/street4: the model lanes
  // keep their own building test there, only the snap is off)
  const gNo = OLD ? null : tileTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData?.grid, { parked: parked?.sites, roofs: S.tile.roofs, noSnap: true, entry: LANES_OLD ? { streetLanes: false } : {} });
  return { S, g, gNo, trace, refined, parked };
}
const pathPts = (g, p) => { const out = []; for (let k = g.off[p]; k < g.off[p + 1]; k++) out.push([g.xy[k * 2], g.xy[k * 2 + 1]]); return out; };

// ------------------------------------------------------------------ child: one tile
const T = TILES[0];
const { S, g, gNo, trace, refined } = await graphOf(T);
const { roads, feats, bounds, fit, driven, inB, nameAt, rd } = S;
const counts = { lanePathM: 0, wobbleM: 0, slalomM: 0, inBuildingM: 0, inBuildingPlaces: 0, offCarriageM: 0, offCarriagePlaces: 0,
  plants: 0, plantsOn: 0, plantsReach: 0, beds: 0, bedsOn: 0, frontM: 0, frontKerbM: 0, frontOpenM: 0, frontOpenKerbM: 0, frontHardM: 0, frontHedgeM: 0, frontGateM: 0, frontBuildingM: 0, bandOnPrivateM: 0, gardenDroppedM: 0 };
const items = { slalom: [], inBuilding: [], offCarriage: [], plants: [], frontOpen: [], bandOnPrivate: [] };
const straightH = [];
const groupPlaces = (pts, R = 6) => {
  // pts: [{ x, z, ...}] -> places (single link within R)
  const done = new Uint8Array(pts.length), out = [];
  for (let i = 0; i < pts.length; i++) {
    if (done[i]) continue;
    const st = [i], mem = []; done[i] = 1;
    while (st.length) { const a = st.pop(); mem.push(pts[a]); for (let b = 0; b < pts.length; b++) if (!done[b] && Math.hypot(pts[b].x - pts[a].x, pts[b].z - pts[a].z) < R) { done[b] = 1; st.push(b); } }
    out.push(mem);
  }
  return out;
};

// ---- (a) slalom: every lane piece judged in its ROAD's frame (viewer/streets/lineFit.js roadFrameOf: station s and
// lateral t on the engine's alignment of the OSM centre line): a lane keeps its offset from the road's line, so its
// lateral t(s) is constant or changes smoothly (a lane-count change, a fit to the kerbs); a wobble is t(s) minus its
// local quadratic fit over +-SG m (the road's own bends are not in t). The road's alignment itself is judged in plan
// (2D, wobble()), so a road line that weaves is counted as the cause "alignment".
{
  const { roadFrameOf } = await imp("viewer/streets/lineFit.js");
  const byId = rd.net.roadsById || new Map(rd.net.roads.map((r) => [r.id, r]));
  // (claude/street4: a path the street model built (viewer/street/lanes.js) has the model as its first stage; the
  // engine's refined lane under it is not driven)
  const modelIds = new Set((trace.afterModel || []).map((p) => p.id));
  const stagePaths = [...(trace.afterModel ? [["model", new Map(trace.afterModel.map((p) => [p.id, p.pts]))]] : []), ["refine", new Map(refined.filter((p) => !modelIds.has(p.id)).map((p) => [p.id, p.pts]))]];
  if (trace.afterFit) stagePaths.push(["fit", new Map(trace.afterFit.map((p) => [p.id, p.pts]))]);
  if (trace.afterJoin) stagePaths.push(["join", new Map(trace.afterJoin.map((p) => [p.id, p.pts]))]);
  const alignFlag = new Map();      // road id -> judge() of its alignment samples (2D)
  const alignOf = (rr) => {
    if (alignFlag.has(rr.id)) return alignFlag.get(rr.id);
    const S0 = rr.smp, P = []; for (let i = 0; i < S0.s.length; i++) P.push([S0.x[i], S0.z[i]]);
    const { Q } = resample(P, 1), j = judge(Q), v = { Q, j };
    alignFlag.set(rr.id, v); return v;
  };
  const lat = (rr, pts) => {
    const { Q } = resample(pts, 1), t = [], ss = [];
    for (const [x, z] of Q) { const f = roadFrameOf(rr, x, z); t.push(f.t); ss.push(f.s); }
    return { Q, t, ss };
  };
  const flags = (rr, pts) => { const L = lat(rr, pts), j = judge1(L.t); return { ...L, ...j }; };
  const nearFlag = (rr, pts, X, Z) => { const F = flags(rr, pts); for (const i of [...F.wob, ...F.sl]) if (Math.hypot(F.Q[i][0] - X, F.Q[i][1] - Z) < 3) return true; return false; };
  const spots = [];
  for (let i = 0; i < g.paths; i++) {
    if (g.kind[i] !== 0) continue;
    const src = trace.src?.[i], rr = src ? byId.get(src.roadId) : null;
    if (!rr?.smp || rr.smp.s.length < 2) continue;
    const F = flags(rr, pathPts(g, i));
    const sMin = rr.smp.s[0], sMax = rr.smp.s[rr.smp.s.length - 1];
    for (let q = 0; q < F.Q.length; q++) {
      const [x, z] = F.Q[q]; if (!inB(x, z)) continue;
      counts.lanePathM++;
      // heading change per metre where the road is straight (its alignment's own curvature under 1 / STRAIGHT_R)
      if (q > 0 && q + 1 < F.Q.length) {
        const A = alignOf(rr), w = wobble(A.Q);
        const k = Math.min(A.Q.length - 1, Math.max(0, Math.round(F.ss[q] - sMin)));
        if (w.k[k] != null && Math.abs(w.k[k]) < 1 / STRAIGHT_R) {
          const a = F.Q[q - 1], b = F.Q[q], c = F.Q[q + 1], h0 = Math.atan2(b[1] - a[1], b[0] - a[0]), h1 = Math.atan2(c[1] - b[1], c[0] - b[0]);
          straightH.push((Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0))) * 180) / Math.PI);
        }
      }
      if (F.ss[q] < sMin + 1 || F.ss[q] > sMax - 1) continue;        // (past the road's ends: the junction blends)
      const w = F.wob.has(q), sl = F.sl.has(q);
      if (!w && !sl) continue;
      if (w) counts.wobbleM++;
      if (sl) counts.slalomM++;
      spots.push({ x, z, path: i, sl });
    }
  }
  for (const mem of groupPlaces(spots, 8)) {
    const mid = mem[Math.floor(mem.length / 2)], src = trace.src[mid.path], rr = byId.get(src.roadId);
    let cause = "kinks";
    const A = alignOf(rr);
    if ([...A.j.wob, ...A.j.sl].some((k) => Math.hypot(A.Q[k][0] - mid.x, A.Q[k][1] - mid.z) < 8)) cause = "alignment";
    else for (const [name, M] of stagePaths) { const pts = M.get(src.id); if (pts && pts.length > 2 && nearFlag(rr, pts, mid.x, mid.z)) { cause = name; break; } }
    items.slalom.push({ m: mem.length, sl: mem.filter((q) => q.sl).length, at: at(mid.x, mid.z), street: nameAt(mid.x, mid.z), cause, path: src.id, road: rr.id });
  }
}

// ---- (b) traffic paths inside buildings / off the drawn carriageway
const manifestEntry = (await import("../../road_audit/tile.mjs")).tileEntry;
const nbrs = (() => { const m = /^([A-Z])(\d+)$/.exec(T), out = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) out.push(String.fromCharCode(m[1].charCodeAt(0) + a) + (+m[2] + b)); return out; })();
const blds = [];
for (const t of nbrs) { const f = join(ROOT, "data/tiles", t, "buildings.json"); if (existsSync(f)) for (const b of json(f).buildings) if (b.footprint?.[0]?.length >= 3) blds.push({ ...b, tile: t }); }
const FI = footprintIndex(blds);
const ringDist = (x, z, r) => { let m = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ax, az] = r[j], [bx, bz] = r[i], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return m; };
// the points of graph G whose car body (centre +- 0.9 m across) stands in a footprint (> 0.05 m deep)
function inBuildingPts(G) {
  const out = [];
  for (let i = 0; i < G.paths; i++) {
    const { Q } = resample(pathPts(G, i), 0.5);
    for (let q = 0; q < Q.length; q++) {
      const [x, z] = Q[q]; if (!inB(x, z)) continue;
      const a = Q[Math.max(0, q - 1)], b = Q[Math.min(Q.length - 1, q + 1)], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / tl, nz = (b[0] - a[0]) / tl;
      let deep = 0;
      for (const w of [0, 0.9, -0.9]) { const px = x + nx * w, pz = z + nz * w, k = FI.at(px, pz); if (k >= 0) deep = Math.max(deep, ringDist(px, pz, blds[k].footprint[0])); }
      if (deep > 0.05) out.push({ x, z, deep });
    }
  }
  return out;
}
{
  const inPts = [], offPts = [];
  const LC = laneCtx(S, g, trace, rd.net.streetModel);
  const carrDist = (x, z) => { for (let d = 0.25; d <= 6; d += 0.25) for (let a = 0; a < 16; a++) { const th = (a / 16) * Math.PI * 2; if (driven.inside(x + Math.cos(th) * d, z + Math.sin(th) * d)) return d; } return 6; };
  for (let i = 0; i < g.paths; i++) {
    const P = pathPts(g, i), { Q } = resample(P, 0.5);
    for (let q = 0; q < Q.length; q++) {
      const [x, z] = Q[q]; if (!inB(x, z)) continue;
      const a = Q[Math.max(0, q - 1)], b = Q[Math.min(Q.length - 1, q + 1)], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / tl, nz = (b[0] - a[0]) / tl;
      let deep = 0, bi = -1;
      for (const w of [0, 0.9, -0.9]) { const px = x + nx * w, pz = z + nz * w, k = FI.at(px, pz); if (k >= 0) { const dd = ringDist(px, pz, blds[k].footprint[0]); if (dd > deep) { deep = dd; bi = k; } } }
      if (deep > 0.05) inPts.push({ x, z, deep, path: i, b: blds[bi].attrs?.BU_ID ?? blds[bi].id, sd: q * 0.5, nx, nz });
      if (!driven.inside(x, z)) { const d = carrDist(x, z); if (d > OFF_TOL) offPts.push({ x, z, deep: d, path: i, sd: q * 0.5, nx, nz }); }
    }
  }
  counts.inBuildingM = inPts.length * 0.5; counts.offCarriageM = offPts.length * 0.5;
  // the far-lane snap (trafficGraph.js fitToSurface): places in a building it creates / removes against the same graph
  // built without it (rule 38: no new place)
  counts.snapCreated = 0; counts.snapRemoved = 0; items.snapCreated = [];
  if (gNo) {
    const noPts = inBuildingPts(gNo), near = (L, x, z) => L.some((q) => Math.hypot(q.x - x, q.z - z) < 6);
    for (const mem of groupPlaces(inPts, 6)) if (!mem.some((q) => near(noPts, q.x, q.z))) { counts.snapCreated++; const w = mem[0]; items.snapCreated.push({ m: mem.length * 0.5, at: at(w.x, w.z), street: nameAt(w.x, w.z) }); }
    for (const mem of groupPlaces(noPts, 6)) if (!mem.some((q) => near(inPts, q.x, q.z))) counts.snapRemoved++;
  }
  for (const [list, key] of [[inPts, "inBuilding"], [offPts, "offCarriage"]]) {
    const places = groupPlaces(list, 6);
    counts[`${key}Places`] = places.length; counts[`${key}CPlaces`] = 0; counts[`${key}CM`] = 0;
    for (const mem of places) {
      const w = mem.reduce((a, b) => (b.deep > a.deep ? b : a));
      const kinds = [...new Set(mem.map((q) => (g.kind[q.path] ? `turn${g.turn[q.path]}` : "lane")))].join(",");
      // (claude/lanes5: the place's cause from its points' evidence, tools/audit/census/laneCause.mjs: a source data, b the
      // measure, c our builder)
      const c = LC.classify(key === "inBuilding" ? "building" : "carriage", mem.map((q) => LC.at(q.x, q.z, q.path, q.sd, q.nx, q.nz)));
      items[key].push({ m: mem.length * 0.5, deep: r1(w.deep), at: at(w.x, w.z), street: nameAt(w.x, w.z), kinds, klass: c.klass, why: c.why, ...(w.b ? { building: String(w.b) } : {}) });
      if (c.klass === "c") { counts[`${key}CPlaces`]++; counts[`${key}CM`] += mem.length * 0.5; }
    }
  }
}

// ---- (d) plants on the carriageway (data/plants/<T>.json as the city loads it; ?roads=old: as drawn before)
{
  const doc = json(join(ROOT, "data/plants", `${T}.json`));
  if (doc) {
    const { plantsOffCarriageway } = await imp("viewer/plants/plantsClear.js").catch(() => ({}));
    const kept = !OLD && plantsOffCarriageway ? plantsOffCarriageway(doc, driven).doc : doc;
    const P = kept.plants || [];
    for (let o = 0; o < P.length; o += 6) {
      const x = P[o], z = P[o + 1], ty = P[o + 2], sc = P[o + 4] / 100;
      if (!inB(x, z)) continue;
      counts.plants++;
      const r = 0.4 * sc * (H_MODEL[ty] || 1);
      const on = driven.inside(x, z);
      let reach = 0;
      if (!on) for (let a = 0; a < 12; a++) { const th = (a / 12) * Math.PI * 2; for (let d = r; d > 0; d -= 0.1) if (driven.inside(x + Math.cos(th) * d, z + Math.sin(th) * d)) { reach = Math.max(reach, r - d + 0.1); break; } }
      if (on) counts.plantsOn++; else if (reach >= PLANT_IN) counts.plantsReach++;
      if (on || reach >= PLANT_IN) items.plants.push({ deep: on ? r : r1(reach), on, type: PLANT_TYPES[ty], zone: P[o + 5], at: at(x, z), street: nameAt(x, z), class: fit ? fit.classAt(x, z) : null });
    }
    const Bd = kept.beds || [];
    for (let o = 0; o < Bd.length; o += 6) { const x = Bd[o], z = Bd[o + 1]; if (!inB(x, z)) continue; counts.beds++; if (driven.inside(x, z)) counts.bedsOn++; }
  }
}

// ---- (e) frontage: what a car meets leaving the carriageway sideways
{
  const { NOT_DRIVEN } = await imp("viewer/streets/carriageway.js");
  const G = json(join(ROOT, "data/gardens", `${T}.json`));
  const segs = [];       // [ax, az, bx, bz, kind]  kind: hard / hedge / gate
  if (G) {
    for (const s of G.segs) { const st = G.styles[s[6]]; segs.push([s[0], s[2], s[3], s[5], "hard", st.kind]); }
    for (const h of G.hedges) for (let i = 1; i < h.points.length; i++) segs.push([h.points[i - 1][0], h.points[i - 1][1], h.points[i][0], h.points[i][1], "hedge"]);
    // gates: [x, y, z, yaw, width, ...]: an opening of `width` across the run at its centre
    for (const q of G.gates) { const w = q[4] / 2, c = Math.cos(q[3]), s = Math.sin(q[3]); segs.push([q[0] - c * w, q[2] + s * w, q[0] + c * w, q[2] - s * w, "gate"]); }
  }
  const SEG = 4, sgrid = new Map(), skey = (i, j) => i * 100003 + j;
  segs.forEach((s, id) => { for (let i = Math.floor(Math.min(s[0], s[2]) / SEG); i <= Math.floor(Math.max(s[0], s[2]) / SEG); i++) for (let j = Math.floor(Math.min(s[1], s[3]) / SEG); j <= Math.floor(Math.max(s[1], s[3]) / SEG); j++) { const k = skey(i, j); if (!sgrid.has(k)) sgrid.set(k, []); sgrid.get(k).push(id); } });
  const cross = (ax, az, bx, bz) => {
    let hit = null;
    for (const id of sgrid.get(skey(Math.floor(bx / SEG), Math.floor(bz / SEG))) || []) {
      const [cx, cz, dx, dz, kind] = segs[id];
      const den = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx); if (Math.abs(den) < 1e-9) continue;
      const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / den, u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / den;
      if (t >= 0 && t <= 1 && u >= -0.05 && u <= 1.05 && (!hit || kind === "gate")) hit = kind;
    }
    return hit;
  };
  // private land (no street surface, no building, no street drawn) that the carriageway test calls carriageway: the
  // OSM band past a measured street's edge (?roads=old); 0 by the rule since claude/roads
  const drawnHere = S.drawn || (await (async () => { const { driveGround } = await imp("viewer/drive/colliders.js"); const { drawnTest } = await imp("viewer/streets/carriageway.js"); return drawnTest(S.tile.hm.h, driveGround(S.tile.hm, rd.parts).delta); })());
  // the drive ways (UrbIS Topo CR42L, on the property line)
  const cr = json(join(ROOT, "data/raw/urbis/topo_poles", `${T}.street_furniture_line.geojson`));
  const l72ToLocal = (e, n) => [e - 148643.0, -(n - 165394.0)];        // pipeline/common.py l72_to_local
  const drives = [];
  if (cr) for (const f of cr.features) { const cs = f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates]; for (const l of cs) drives.push(l.map(([e, n]) => l72ToLocal(e, n))); }
  const nearDrive = (x, z) => drives.some((l) => l.some(([px, pz], k) => k && segD(x, z, l[k - 1][0], l[k - 1][1], px, pz) < 1.0));
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const B = new Map();
  const spotsOpen = [], spotsBand = [];
  for (const r of roads.roads) {
    if (NOT_DRIVEN.has(r.meta?.highway)) continue;
    const pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean);
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], L = Math.hypot(b.x - a.x, b.z - a.z); if (L < 1e-3) continue;
      const ux = (b.x - a.x) / L, uz = (b.z - a.z) / L;
      for (let d = 1; d < L - 1; d += 2) {
        const x = a.x + ux * d, z = a.z + uz * d;
        if (!inB(x, z) || !driven.inside(x, z)) continue;
        for (const sg of [1, -1]) {
          const nx = -uz * sg, nz = ux * sg;
          // out to the carriage edge
          let t = 0; while (t < 30 && driven.inside(x + nx * t, z + nz * t)) t += 0.25;
          if (t >= 30) continue;
          const ex = x + nx * t, ez = z + nz * t;
          // a junction mouth (another driven street's carriageway within 3 m out): not a frontage
          if (driven.inside(ex + nx * 3, ez + nz * 3)) continue;
          counts.frontM += 2;
          const kerb = !!(fit && fit.nearKerb(ex, ez, 0.4));
          if (kerb) counts.frontKerbM += 2;
          // the band before the fix: private land between the measured edge and the OSM band's edge
          let band = 0;
          for (let q = t; q < t + 8; q += 0.25) { const px = x + nx * q, pz = z + nz * q; if (fit && fit.classAt(px, pz) < 0 && FI.at(px, pz) < 0 && !drawnHere(px, pz) && driven.inside(px, pz)) band = q - t + 0.25; }
          if (band >= 0.5) { counts.bandOnPrivateM += 2; spotsBand.push({ x: ex, z: ez, deep: band }); }
          // then outward: what does the car meet?
          let res = "open", px0 = ex, pz0 = ez, privateSeen = false;
          for (let q = t + 0.25; q <= t + 20; q += 0.25) {
            const px = x + nx * q, pz = z + nz * q;
            const c = cross(px0, pz0, px, pz);
            if (c === "gate") { res = "gate"; break; }
            if (c === "hard") { res = "hard"; break; }
            if (c === "hedge") { res = "hedge"; break; }
            if (FI.at(px, pz) >= 0) { res = "building"; break; }
            const cls = fit ? fit.classAt(px, pz) : -1;
            if (cls === SC.ramp) { res = "gate"; break; }              // a dropped kerb / ramp: a driveway
            if (cls < 0 && !driven.inside(px, pz)) { if (!privateSeen && nearDrive(px, pz)) { res = "gate"; break; } privateSeen = true; if (q - t > 3 && privateSeen) break; }
            px0 = px; pz0 = pz;
          }
          if (res === "open" && !privateSeen) res = "paved";
          if (res === "open") { counts.frontOpenM += 2; if (kerb) counts.frontOpenKerbM += 2; spotsOpen.push({ x: ex, z: ez, deep: 0, kerb }); }
          else if (res === "hard") counts.frontHardM += 2;
          else if (res === "hedge") counts.frontHedgeM += 2;
          else if (res === "gate") counts.frontGateM += 2;
          else if (res === "building") counts.frontBuildingM += 2;
        }
      }
    }
  }
  // garden pieces main.js drops (drivenAt.inside(x, z, 0.3)): metres of the kit's walls / railings / hedges
  if (G) {
    const len = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
    for (const s of G.segs) { const mx = (s[0] + s[3]) / 2, mz = (s[2] + s[5]) / 2; if (!inB(mx, mz)) continue; if ([[s[0], s[2]], [mx, mz], [s[3], s[5]]].some(([px, pz]) => driven.inside(px, pz, 0.3))) counts.gardenDroppedM += len(s[0], s[2], s[3], s[5]); }
    for (const h of G.hedges) for (let i = 1; i < h.points.length; i++) { const [ax, az] = h.points[i - 1], [bx, bz] = h.points[i]; if (!inB(ax, az)) continue; if (driven.inside((ax + bx) / 2, (az + bz) / 2, 0.3)) counts.gardenDroppedM += len(ax, az, bx, bz); }
  }
  for (const [list, key] of [[spotsOpen, "frontOpen"], [spotsBand, "bandOnPrivate"]]) for (const mem of groupPlaces(list, 5)) {
    const w = mem.reduce((a, b) => (b.deep > a.deep ? b : a));
    items[key].push({ m: mem.length * 2, deep: r1(w.deep), at: at(w.x, w.z), street: nameAt(w.x, w.z), ...(key === "frontOpen" ? { kerb: mem.filter((q) => q.kerb).length * 2 } : {}) });
  }
}
function segD(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; const t = L2 > 1e-12 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2)) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
// (keep the child's line short: the worst 60 of each kind)
for (const k of Object.keys(items)) { items[k].sort((a, b) => (b.m ?? b.deep ?? 0) - (a.m ?? a.deep ?? 0)); items[k] = items[k].slice(0, 60); }
// straight-stretch heading changes: a 1-in-20 sample (keeps the line small, the percentiles hold)
console.log(JSON.stringify({ tile: T, counts, items, straightH: straightH.filter((_, i) => i % 20 === 0).map((v) => Math.round(v * 100) / 100) }));
