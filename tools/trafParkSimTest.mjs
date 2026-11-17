// TRAFFIC vs PARKED CARS IN THE RUNNING SIM (trafpark 2026-11-17), node, no browser: a tile's traffic graph and parked
// cars as the worker builds them (viewer/tileData.js), the real TrafficSim (viewer/traffic/trafficSim.js) on it, and a
// count of every step a traffic car's body stands into a parked car's box (deeper than 5 cm).
//   1. static: the parked cars where the worker put them
//   2. shoved: then SHOVE cars each pushed up to 1 m toward its nearest lane and turned up to 8 deg (the player's shove)
//   3. pulled over: every car on the screen told to pull over (ctl 2: the police game), shifting right toward the kerb
//
//   node --import ./tools/road_audit/register.mjs tools/trafParkSimTest.mjs [--old] [--tile I6] [--secs 240] [--shove 40]
// --old: the sim as before (?trafpark=old: blind to the parked cars at run time). Exit 1 when a run counts an overlap
// (not with --old).
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const OLD = argv.includes("--old");
if (OLD) globalThis.location = { search: "?trafpark=old" };
const { loadTile, ROOT } = await import("./road_audit/tile.mjs");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { widthParking } = await imp("viewer/streets/parkPlace.js");
const { buildTrafficGraph } = await imp("viewer/traffic/trafficGraph.js");
const { TrafficWorld } = await imp("viewer/traffic/trafficWorld.js");
const { TrafficSim, STEP } = await imp("viewer/traffic/trafficSim.js");

const T = opt("--tile", "I6").toUpperCase(), SECS = +opt("--secs", 240), SHOVE = +opt("--shove", 40);
const { roads, feats, bounds, rd } = loadTile(T);
const wp = widthParking(roads, feats, bounds, streetFit(rd.surfaceData));
const g = buildTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData.grid, { parked: wp.sites, old: OLD });
const sites = g.parkedKept ?? wp.sites;
const SIZE = [1.85, 1.47, 4.70];
const cars = sites.map((c) => ({ x: c.x, z: c.z, y: 0, heading: c.yaw + Math.PI / 2, type: "estate", hidden: false, col: { r: 0.5, g: 0.5, b: 0.5, setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; } }, room: 6 }));
const W = new TrafficWorld();
W.add(T, g);
const types = [{ name: "hatch_c", len: 4.31, w: 1.81, h: 1.45, wb: 2.6, wheelR: 0.31, weight: 1 }, { name: "saloon", len: 4.73, w: 1.85, h: 1.44, wb: 2.8, wheelR: 0.32, weight: 1 }];
const sim = new TrafficSim(W, { cap: 400, types, paints: [[0.5, 0.5, 0.5]], ground: () => 0, seed: 7 });
sim.typeWeights ??= types.map((t) => t.weight);
sim.setParking(() => cars, () => 0);
sim.params.parkRate = 0;           // (pull-outs / park-ins: their own manoeuvres, not this test's)
if (sim.pk) sim.pk.size = () => SIZE;
const fx = (bounds.x0 + bounds.x1) / 2, fz = (bounds.z0 + bounds.z1) / 2;
const ctx = { visible: () => false, fx, fz };

// a traffic car's body (axis discs of its half width) into a parked box: depth (m, > 0 = overlap)
const grid = new Map(), gk = (x, z) => (Math.floor(x / 8) + 4096) * 8192 + Math.floor(z / 8) + 4096;
const regrid = () => { grid.clear(); for (const c of cars) { const k = gk(c.x, c.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c); } };
function depth(i) {
  const yw = sim.yaw[i], fxx = Math.sin(yw), fzz = Math.cos(yw), hw = types[sim.type[i]].w / 2, hl = types[sim.type[i]].len / 2;
  let worst = -Infinity, who = null;
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const c of grid.get(gk(sim.x[i] + di * 8, sim.z[i] + dj * 8)) || []) {
    if (c.hidden || c === sim.slot[i]) continue;          // (its own slot: pulled out of / parking into it)
    const ax = Math.sin(c.heading), az = Math.cos(c.heading);
    const span = hl - hw, nT = Math.ceil((2 * span) / 0.25);
    for (let m = 0; m <= nT; m++) {
      const t = -span + (2 * span * m) / nT;
      const px = sim.x[i] + fxx * t - c.x, pz = sim.z[i] + fzz * t - c.z;
      const u = Math.abs(px * ax + pz * az) - SIZE[2] / 2, v = Math.abs(px * az - pz * ax) - SIZE[0] / 2;
      const d = -(Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0) - hw);
      if (d > worst) { worst = d; who = c; }
    }
  }
  return [worst, who];
}
function run(label, secs, each = null) {
  const steps = Math.round(secs / STEP);
  let samples = 0, over = 0, maxD = 0, stuck = 0;
  const hit = new Set();
  for (let s = 0; s < steps; s++) {
    sim.clearObstacles();
    each?.(s);
    sim.step(ctx);
    if (s % 4) continue;
    for (let i = 0; i < sim.cap; i++) {
      if (!sim.alive[i]) continue;
      samples++;
      const [d, c] = depth(i);
      if (d > 0.05) { over++; if (process.env.TPV && !hit.has(c)) console.log("  into", c.x.toFixed(1), c.z.toFixed(1), "depth", d.toFixed(2), "state", sim.state[i], "slot", !!sim.slot[i], "busy", !!c.busy, "age", sim.age[i].toFixed(1), "handoff", sim.handoff[i], "path", sim.path[i] & 0xffff, "kind", g.kind[sim.path[i] & 0xffff], "d", sim.d[i].toFixed(1), "room", sim.room[i].toFixed(2), "ctl", sim.ctl[i], "off", sim.offX[i].toFixed(2), sim.offZ[i].toFixed(2), "pw", sim.pw?.[i].toFixed(2), sim.pwT?.[i].toFixed(2), "moved", sim.pk?.moved.has(c), "v", sim.v[i].toFixed(1), "clear", sim.parkClear?.(i, sim.room[i]).toFixed(2)); hit.add(c); maxD = Math.max(maxD, d); }
    }
  }
  for (let i = 0; i < sim.cap; i++) if (sim.alive[i] && sim.holdT[i] > 60) stuck++;
  const st = sim.stats;
  const r = { label, cars: sim.count, samples, overlapSamples: over, parkedHit: hit.size, maxDepth: +maxD.toFixed(2), stuckOver60s: stuck, parkWaits: st.parkWaits || 0, parkPasses: st.parkPasses || 0, parkClamped: st.parkClamped || 0, narrowWaits: st.narrowWaits || 0 };
  console.log(JSON.stringify(r));
  return r;
}
regrid();
const out = [];
out.push(run("static", SECS));
// shove: the cars nearest a lane, each pushed toward it (the player's shove: up to 1 m, turned)
const near = [];
for (const c of cars) {
  let best = Infinity, bx = 0, bz = 0;
  for (let p = 0; p < g.paths; p++) for (let k = g.off[p]; k < g.off[p + 1]; k++) {
    const d = (g.xy[k * 2] - c.x) ** 2 + (g.xy[k * 2 + 1] - c.z) ** 2;
    if (d < best) { best = d; bx = g.xy[k * 2]; bz = g.xy[k * 2 + 1]; }
  }
  if (Math.hypot(c.x - fx, c.z - fz) < 400) near.push([Math.sqrt(best), c, bx, bz]);
}
near.sort((a, b) => a[0] - b[0]);
let shoved = 0;
for (const [L, c, bx, bz] of near.slice(0, SHOVE)) {
  const ux = (bx - c.x) / (L || 1), uz = (bz - c.z) / (L || 1), m = 0.6 + ((shoved * 0.37) % 0.4);
  c.x += ux * m; c.z += uz * m; c.heading += ((shoved % 3) - 1) * 0.14;
  shoved++;
  sim.noteParked?.(c);
}
regrid();
// (a traffic car the shove itself put a parked car onto is a collision, not driving through: it is taken away)
let atShove = 0;
for (let i = 0; i < sim.cap; i++) if (sim.alive[i] && depth(i)[0] > 0) { sim.kill(i); atShove++; }
// (and 3 s not counted: a car the shove put a parked car in front of, inside its braking distance, cannot stop; the
// cars it cannot avoid are hit, then they back off: the player's doing, not driving through)
for (let s = 0; s < Math.round(3 / STEP); s++) { sim.clearObstacles(); sim.step(ctx); }
for (let i = 0; i < sim.cap; i++) if (sim.alive[i] && depth(i)[0] > 0) { sim.kill(i); atShove++; }
console.log(`shoved ${shoved} parked cars toward their lanes; ${atShove} traffic cars under them at that moment removed, 3 s of grace`);
out.push(run(`shoved ${shoved}`, SECS));
// pulled over: every car (ctl 2) eases right and stops; counted for 20 s, then let go
out.push(run("pull over", 20, (s) => { if (s === 0) for (let i = 0; i < sim.cap; i++) if (sim.alive[i] && sim.state[i] === 0) sim.ctl[i] = 2; }));
for (let i = 0; i < sim.cap; i++) sim.ctl[i] = 0;
// 4. pull-outs and park-ins (the parked fleet's cars joining the traffic and parking back), visible to the focus
sim.params.parkRate = 4; ctx.visible = () => true;
out.push(run("pull-outs", SECS));
console.log(`  pull-outs ${sim.stats.pullOuts} (skipped, no clear S-curve: ${sim.stats.pullOutsSkipped || 0}), park-ins ${sim.stats.parkIns} (skipped: ${sim.stats.parkInsSkipped || 0})`);
const bad = out.some((r) => r.overlapSamples > 0);
if (!OLD && bad) { console.error("FAIL trafpark sim: a traffic car stood into a parked car"); process.exit(1); }
console.log(OLD ? "(old: no gate)" : "PASS trafpark sim: no traffic car into a parked car");
