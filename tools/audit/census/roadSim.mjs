// CENSUS class R, the cars themselves (claude/roads, rule 38, docs/ROADS_R.md): the traffic sim
// (viewer/traffic/trafficSim.js, as tools/trafParkSimTest.mjs runs it in node) on a tile's graph as the worker builds it,
// every car's POSE (x, z each step, its eased-out passes, joins, hand-overs) recorded while it drives a lane piece and
// judged in that lane's road frame (viewer/streets/lineFit.js roadFrameOf: the lateral t along the road's alignment)
// by the same detector as the graph census (lib_path.mjs judge1: the deviation from a local quadratic over +-15 m;
// slalom = two opposite deviations >= 0.15 m within 25 m). The road's own bends are not in t; a junction turn is not
// judged (a lane piece only, 3 m from its ends).
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/roadSim.mjs [T ...] [--secs S] [--old] [--max k=v,...]
//   default tiles: I6 (Saint-Job), E7 (Ch. de Saint-Job / Engeland), J6 (Ch. de Waterloo), D6 (Ch. d'Alsemberg)
//   --old: ?roads=old (the graph as before); --max perKm=N,...: the gate (sum over the tiles)
import { streetTile, imp, at } from "./lib_street.mjs";
import { resample, judge1 } from "./lib_path.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const OLD = flag("--old"), SECS = +opt("--secs", 120), MAX = opt("--max", null), QUIET = flag("--quiet");
const TILES = argv.filter((a) => /^[A-Z]\d+$/i.test(a)).map((t) => t.toUpperCase());
if (!TILES.length) TILES.push("I6", "E7", "J6", "D6");

const { widthParking } = await imp("viewer/streets/parkPlace.js");
const { buildTrafficGraph } = await imp("viewer/traffic/trafficGraph.js");
const { TrafficWorld } = await imp("viewer/traffic/trafficWorld.js");
const { TrafficSim, STEP } = await imp("viewer/traffic/trafficSim.js");
const { roadFrameOf } = await imp("viewer/streets/lineFit.js");

const tot = { metres: 0, wobbleM: 0, slalomM: 0 }, rows = [];
for (const T of TILES) {
  const S = await streetTile(T, OLD ? { build: { roadsR: false }, bandOnMeasured: true } : {});
  const { rd, roads, feats, bounds, fit } = S;
  const parked = rd.surfaceData ? widthParking(roads, feats, bounds, fit) : null;
  const trace = {};
  const g = buildTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData?.grid, { parked: parked?.sites, trace, roadsR: !OLD });
  const sites = g.parkedKept ?? parked?.sites ?? [];
  const cars = sites.map((c) => ({ x: c.x, z: c.z, y: 0, heading: c.yaw + Math.PI / 2, type: "estate", hidden: false, col: { setRGB() {} }, room: 6 }));
  const W = new TrafficWorld(); W.add(T, g);
  const types = [{ name: "hatch_c", len: 4.31, w: 1.81, h: 1.45, wb: 2.6, wheelR: 0.31, weight: 1 }, { name: "saloon", len: 4.73, w: 1.85, h: 1.44, wb: 2.8, wheelR: 0.32, weight: 1 }];
  const sim = new TrafficSim(W, { cap: 300, types, paints: [[0.5, 0.5, 0.5]], ground: () => 0, seed: 11 });
  sim.typeWeights ??= types.map((t) => t.weight);
  sim.setParking(() => cars, () => 0);
  sim.params.parkRate = 0;
  if (sim.pk) sim.pk.size = () => [1.85, 1.47, 4.7];
  const ctx = { visible: () => false, fx: (bounds.x0 + bounds.x1) / 2, fz: (bounds.z0 + bounds.z1) / 2 };
  const byId = rd.net.roadsById;
  // per car: the current run on one lane piece (its index, the poses)
  const run = new Map(), done = [];
  const close = (i) => { const r = run.get(i); if (r && r.pts.length > 12) done.push(r); run.delete(i); };
  for (let s = 0, n = Math.round(SECS / STEP); s < n; s++) {
    sim.clearObstacles(); sim.step(ctx);
    for (let i = 0; i < sim.cap; i++) {
      if (!sim.alive[i] || sim.state[i] !== 0) { close(i); continue; }
      const gid = sim.path[i], li = gid & 0xffff, slot = W.slots[gid >>> 16];
      if (slot !== g || g.kind[li] !== 0 || sim.d[i] < 3 || sim.d[i] > g.len[li] - 3) { close(i); continue; }
      let r = run.get(i);
      if (r && r.li !== li) { close(i); r = null; }
      if (!r) { r = { li, pts: [] }; run.set(i, r); }
      const last = r.pts[r.pts.length - 1];
      if (!last || Math.hypot(sim.x[i] - last[0], sim.z[i] - last[1]) > 0.25) r.pts.push([sim.x[i], sim.z[i]]);
    }
  }
  for (const i of [...run.keys()]) close(i);
  let metres = 0, wob = 0, sl = 0; const spots = new Map();
  for (const r of done) {
    const rr = byId.get(trace.src?.[r.li]?.roadId); if (!rr?.smp) continue;
    const { Q } = resample(r.pts, 1);
    const j = judge1(Q.map(([x, z]) => roadFrameOf(rr, x, z).t));
    metres += Q.length; wob += j.wob.size; sl += j.sl.size;
    for (const q of j.sl) { const k = `${Math.floor(Q[q][0] / 20)},${Math.floor(Q[q][1] / 20)}`; spots.set(k, (spots.get(k) || 0) + 1); }
  }
  const worst = [...spots.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, m]) => { const [x, z] = k.split(",").map((v) => +v * 20 + 10); return { at: at(x, z), m, street: S.nameAt(x, z) }; });
  const row = { tile: T, runs: done.length, metres, wobbleM: wob, slalomM: sl, perKm: +((1000 * sl) / Math.max(1, metres)).toFixed(1), worst };
  rows.push(row); tot.metres += metres; tot.wobbleM += wob; tot.slalomM += sl;
  if (!QUIET) console.log(JSON.stringify(row));
}
tot.perKm = +((1000 * tot.slalomM) / Math.max(1, tot.metres)).toFixed(1);
tot.wobblePerKm = +((1000 * tot.wobbleM) / Math.max(1, tot.metres)).toFixed(1);
console.log(`class R sim${OLD ? " (--old)" : ""}, ${SECS} s on ${TILES.join(" ")}: ${JSON.stringify(tot)}`);
let bad = 0;
if (MAX) for (const kv of MAX.split(",")) { const [k, v] = kv.split("="); const n = tot[k] ?? 0; if (n > +v) { console.log(`FAIL ${k} ${n} > ${v}`); bad++; } else console.log(`ok ${k} ${n} <= ${v}`); }
process.exit(bad ? 1 : 0);
